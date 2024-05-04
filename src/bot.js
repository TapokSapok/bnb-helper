const { Telegraf, Context } = require('telegraf');
const config = require('../config.json');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const bot = new Telegraf(config.token);
const MONTH = new Date().getMonth() + 1;
let db = null;

const agent = config.proxy ? new SocksProxyAgent(`socks5://${config.proxy}`) : null;
if (agent) console.log('Используется прокси', config.proxy);

const main = async () => {
	db = await open({
		filename: './database.db',
		driver: sqlite3.Database,
	});
};

const getHost = async listingId => {
	const response = await axios
		.get(`https://www.airbnb.com/rooms/${listingId}`, {
			agent,
			headers: {
				accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'accept-language': 'ru-RU,ru;q=0.9',
				'cache-control': 'max-age=0',
				priority: 'u=0, i',
				'sec-ch-ua': '"Chromium";v="124", "Brave";v="124", "Not-A.Brand";v="99"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Windows"',
				'sec-ch-ua-platform-version': '"10.0.0"',
				'sec-fetch-dest': 'document',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'same-origin',
				'sec-fetch-user': '?1',
				'sec-gpc': '1',
				'upgrade-insecure-requests': '1',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
			},
		})
		.catch(e => console.log(e.response.data));
	if (!response) return null;

	try {
		return {
			hostId: Buffer.from(response.data.split('"userId":"')[1].split('",')[0], 'base64').toString('utf-8').split(':')[1],
			name: response.data.split('"PassportCardData","name":"')[1].split('","userId"')[0],
		};
	} catch (error) {}
};

const getCalendar = async listingId => {
	const res = await axios.get(`https://www.airbnb.com/api/v3/PdpAvailabilityCalendar/8f08e03c7bd16fcad3c92a3592c19a8b559a0d0855a84028d1163d4733ed9ade`, {
		agent,
		params: {
			operationName: 'PdpAvailabilityCalendar',
			locale: 'en',
			currency: 'USD',
			variables: `{"request":{"count":6,"listingId":"${listingId}","month":${MONTH},"year":2024}}`,
			extensions: '{"persistedQuery":{"version":1,"sha256Hash":"8f08e03c7bd16fcad3c92a3592c19a8b559a0d0855a84028d1163d4733ed9ade"}}',
		},
		headers: {
			accept: '*/*',
			'accept-language': 'ru-RU,ru;q=0.7',
			'content-type': 'application/json',
			referer: `https://www.airbnb.com/contact_host/52344133/send_message`,
			'sec-ch-ua': '"Brave";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-ch-ua-platform-version': '"14.3.1"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			'sec-gpc': '1',
			'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
			'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
			'x-airbnb-graphql-platform': 'web',
			'x-airbnb-graphql-platform-client': 'minimalist-niobe',
			'x-airbnb-supports-airlock-v2': 'true',
			'x-client-request-id': '0b266d41ymg47e1b0fyob0x2f6bt',
			'x-client-version': 'b8575cb2d0b159d1187f3502720ac63dae0cf92e',
			'x-csrf-token': 'null',
			'x-csrf-without-token': '1',
			'x-niobe-short-circuited': 'true',
		},
	});
	const months = res?.data?.data?.merlin?.pdpAvailabilityCalendar?.calendarMonths;
	const result = [];
	if (!months) return null;
	for (const month of months) {
		const days = month.days;
		for (const i in days) {
			if (!days[i].availableForCheckin) continue;
			if (!days[Number(i) + days[i].minNights]?.availableForCheckout) continue;
			result.push([days[i].calendarDate, days[Number(i) + days[i].minNights].calendarDate]);
		}
	}
	return result;
};

const getListings = async () => {
	let listings = [];
	while (listings.length < 9) {
		const listing = await db.get(`SELECT * FROM listing WHERE reviews >= ${config.minReviews}${config.searchByQuery ? ` AND query = "${config.query}"` : ''} AND status = 0 `);
		if (!listing) {
			console.log('Хосты закончились.');
			return;
		}
		const host = await getHost(listing.id);
		if (!host) {
			console.log('Хост не найден', listing.id);
			await db.run(`UPDATE listing set status = 2 WHERE id = "${listing.id}"`);
			continue;
		}
		await db.run(`UPDATE listing SET hostId = "${host.hostId}", hostName = "${host.name}" WHERE id = "${listing.id}"`);

		const hostExists = await db.get(`SELECT * FROM listing WHERE hostId = "${host.hostId}" AND status = 1`);
		if (hostExists) {
			console.log('Хост уже отослан');
			await db.run(`UPDATE listing set status = 3 WHERE id = "${listing.id}"`);
			continue;
		}

		const dates = await getCalendar(listing.id);
		if (!dates.length) {
			console.log('Даты не найдены', listing.id);
			await db.run(`UPDATE listing set status = 4 WHERE id = "${listing.id}"`);
			continue;
		}
		await db.run(`UPDATE listing set status = 5 WHERE id = "${listing.id}"`);
		console.log(listing.id, dates[0], listing.reviews);
		listings.push([listing.id, dates[0], listing.reviews]);
	}
	return listings;
};

/**
 *
 * @param {Context} ctx
 */
const msg = async ctx => {
	try {
		try {
			ctx.answerCbQuery().catch(() => {});
		} catch (error) {}

		const message = await ctx.reply('Генерация ссылок...');
		getListings().then(async listings => {
			try {
				if (!listings) return;
				const count = await db
					.get(`SELECT Count(*) FROM listing WHERE reviews >= ${config.minReviews}${config.searchByQuery ? ` AND query = "${config.query}"` : ''} AND status = 0`)
					.then(l => l['Count(*)']);

				await bot.telegram.sendMessage(
					message.chat.id,
					`${config.searchByQuery ? `* Запрос: ${config.query}\n` : ''}* Найдено: ${listings.length}\n* Всего: ${count}\n${listings
						.map((l, i) => `https://www.airbnb.${config.locale}/contact_host/${l[0]}/send_message/?adults=1&check_in=${l[1][0]}&check_out=${l[1][1]} - ${l[2]}`)
						.join('\n')}`,
					{
						reply_markup: { inline_keyboard: [[{ text: 'Еще', callback_data: 'more' }]] },
						link_preview_options: { is_disabled: true },
					}
				);
			} catch (error) {
				console.log(error);
			}
		});
	} catch (error) {
		console.log(error);
	}
};

bot.command('start', msg);
bot.action('more', msg);

bot.launch();
main();
