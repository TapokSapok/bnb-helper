const fs = require('fs');
const axios = require('axios');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { WebSocket } = require('ws');
const config = require('../config.json');
const { randomUUID } = require('crypto');

const text = fs.readFileSync('text.txt', 'utf-8');
if (!text) {
	console.log('Нет текста');
	process.exit();
}

let active = [];
let db = null;
let sendCount = 0;

const responseMessage = async (cookie, id) => {
	const res = await axios
		.post(
			`https://www.airbnb.com/api/v3/CreateMessageViaductMutation/d05a0fe2f4d8c47ce79ee2c272989c78432d652480aebec2cf6fa22e93eb9f94`,
			{
				operationName: 'CreateMessageViaductMutation',
				variables: {
					actAs: 'PARTICIPANT',
					businessJustification: {
						feature: 'USER_INBOX',
					},
					originType: 'USER_INBOX',
					senderPlatform: 'WEB',
					content: {
						textContent: {
							body: text,
						},
					},
					contentType: 'TEXT_CONTENT',
					messageThreadId: id,
					uniqueIdentifier: randomUUID(),
				},
				extensions: {
					persistedQuery: {
						version: 1,
						sha256Hash: 'd05a0fe2f4d8c47ce79ee2c272989c78432d652480aebec2cf6fa22e93eb9f94',
					},
				},
			},
			{
				params: {
					operationName: 'CreateMessageViaductMutation',
					locale: 'en',
					currency: 'EUR',
				},
				headers: {
					accept: '*/*',
					'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
					'content-type': 'application/json',
					cookie: cookie,
					'device-memory': '8',
					dpr: '2',
					ect: '4g',
					origin: 'https://www.airbnb.fr',
					referer: 'https://www.airbnb.fr/hosting/inbox/folder/all/thread/1747406014/details',
					'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
					'sec-ch-ua-mobile': '?0',
					'sec-ch-ua-platform': '"Windows"',
					'sec-ch-ua-platform-version': '"10.0.0"',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
					'viewport-width': '973',
					'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
					'x-airbnb-graphql-platform': 'web',
					'x-airbnb-graphql-platform-client': 'minimalist-niobe',
					'x-airbnb-supports-airlock-v2': 'true',
					'x-client-request-id': '19hdeac1n0y2731x2evrn0rttk5e',
					'x-client-version': 'f6c275b6c87aa00d57ab5be5ee6f9e065fbeda64',
					'x-csrf-token': 'null',
					'x-csrf-without-token': '1',
					'x-niobe-short-circuited': 'true',
				},
			}
		)
		.catch(e => {
			if (e?.response?.data) {
				console.log(e?.response?.data);
			} else console.log(e.response);
		});
	if (!res) {
		return false;
	}
	return true;
};

const getToken = async cookie => {
	const res = await axios
		.post(
			`https://www.airbnb.com/api/v3/CreateWebsocketToken/1b8db8c20db16942073bcde0879bf733d725c308f331f241c1c5d0d94bfdda3b`,
			{
				operationName: 'CreateWebsocketToken',
				extensions: {
					persistedQuery: {
						version: 1,
						sha256Hash: '1b8db8c20db16942073bcde0879bf733d725c308f331f241c1c5d0d94bfdda3b',
					},
				},
			},
			{
				params: {
					operationName: 'CreateWebsocketToken',
					locale: 'en',
					currency: 'EUR',
				},
				headers: {
					accept: '*/*',
					'accept-language': 'ru-RU,ru;q=0.5',
					'content-type': 'application/json',
					cookie: cookie,
					origin: `https://www.airbnb.com`,
					priority: 'u=1, i',
					referer: `https://www.airbnb.com/guest/inbox/1791951351/details?ttype=home_booking`,
					'sec-ch-ua': '"Chromium";v="124", "Brave";v="124", "Not-A.Brand";v="99"',
					'sec-ch-ua-mobile': '?0',
					'sec-ch-ua-platform': '"Windows"',
					'sec-ch-ua-platform-version': '"10.0.0"',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					'sec-gpc': '1',
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
					'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
					'x-airbnb-graphql-platform': 'web',
					'x-airbnb-graphql-platform-client': 'minimalist-niobe',
					'x-airbnb-supports-airlock-v2': 'true',
					'x-client-request-id': '1r641gn0xfuz2w1azb0te0can20i',
					'x-client-version': '7352a6d8c44f2d3d1ee047aa9659a65902250ab4',
					'x-csrf-token': 'null',
					'x-csrf-without-token': '1',
					'x-niobe-short-circuited': 'true',
				},
			}
		)
		.catch(e => {
			if (console.log(e?.response?.data)) {
				console.log(e.response.data);
			} else {
				console.log(e);
			}
		});
	if (!res?.data) return null;
	return res?.data?.data?.shiota?.token?.token?.token;
};

const changeAvatar = async (cookie, userId) => {
	const res = await axios
		.post(
			'https://www.airbnb.ru/api/v3/CreateMediaItemsMutation/72e7e4e6d94f09930a67a55311e66ba0ed1dd9613adda5947c7f54a8947dd781',
			{
				operationName: 'CreateMediaItemsMutation',
				variables: {
					domain: 'USER',
					identifier: `${userId}`,
					newMediaItems: [
						{
							mediaContentType: 'IMAGE',
							metadata: '{"image_file_size":142871,"image_updated_at":1713959092310}',
							signedUrlPath: '/pictures/user/User-573882012/original/fe4853d7-219a-432e-bf0d-2b249188d40c.jpeg',
						},
					],
				},
				extensions: {
					persistedQuery: {
						version: 1,
						sha256Hash: '72e7e4e6d94f09930a67a55311e66ba0ed1dd9613adda5947c7f54a8947dd781',
					},
				},
			},
			{
				params: {
					operationName: 'CreateMediaItemsMutation',
					locale: 'en',
					currency: 'EUR',
				},
				headers: {
					accept: '*/*',
					'accept-language': 'ru-RU,ru;q=0.9',
					'content-type': 'application/json',
					cookie,
					origin: 'https://www.airbnb.ru',
					priority: 'u=1, i',
					referer: 'https://www.airbnb.ru/users/show/573882012?editMode=true',
					'sec-ch-ua': '"Chromium";v="124", "Brave";v="124", "Not-A.Brand";v="99"',
					'sec-ch-ua-mobile': '?0',
					'sec-ch-ua-platform': '"Windows"',
					'sec-ch-ua-platform-version': '"10.0.0"',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					'sec-gpc': '1',
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
					'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
					'x-airbnb-graphql-platform': 'web',
					'x-airbnb-graphql-platform-client': 'minimalist-niobe',
					'x-airbnb-supports-airlock-v2': 'true',
					'x-client-request-id': '02zk7v11flepi419py9c307frykm',
					'x-client-version': '7352a6d8c44f2d3d1ee047aa9659a65902250ab4',
					'x-csrf-token': 'V4$.airbnb.ru$ijJ6iwBHe6Y$dWSql6_Dr-CnoILOLv5I1s3je_GBjmCmgI0bAbbklOA=',
					'x-csrf-without-token': '1',
					'x-niobe-short-circuited': 'true',
				},
			}
		)
		.catch(e => console.log('Ошибка смены авы', e.response));

	return !!res?.data;
};

const createConnection = async (cookies, name, rc) => {
	const userId = JSON.parse(decodeURIComponent(cookies.split('_user_attributes=')[1].split(';')[0])).id_str;
	console.log('Смена авы', name);
	changeAvatar(cookies, userId).then(status => console.log(status ? `Успешная смена аватарки ${name}` : `Смена авы не удалась ${name}`));
	const token = await getToken(cookies);

	if (!token) return console.log('не нашел токен');

	let received = rc ?? 0;
	const ws = new WebSocket(`wss://ws.airbnb.com/messaging/ws2/${token}`, 'eevee_v2', {
		headers: { Origin: `https://www.airbnb.com` },
	});
	let interval = null;
	ws.on('open', async () => {
		console.log('Открыл соединение:', name);
		interval = setInterval(() => ws.send('{"type": "PING"}'), 15000);
		ws.send(
			JSON.stringify({
				id: 0,
				name: 'NewMessage',
				origin: 'bessie',
				type: 'SUBSCRIBE',
			})
		);
		ws.send(JSON.stringify({ id: 1, name: 'TypingStart', origin: 'bessie', type: 'SUBSCRIBE' }));
		ws.send(JSON.stringify({ id: 2, name: 'NewStatus', origin: 'monorail', type: 'SUBSCRIBE' }));
		ws.send(JSON.stringify({ id: 3, name: 'NewMessage', origin: 'bessie', type: 'SUBSCRIBE' }));
		ws.send(JSON.stringify({ id: 4, name: 'TypingStart', origin: 'bessie', type: 'SUBSCRIBE' }));
		ws.send(JSON.stringify({ id: 5, name: 'NewStatus', origin: 'monorail', type: 'SUBSCRIBE' }));
	});
	ws.on('close', () => {
		console.log('Закрыто соединение:', name);
		clearInterval(interval);
		if (received < 6) {
			setTimeout(() => {
				console.log('Повторная попытка открыть соединение', name);
				createConnection(cookies, name, received);
			}, 3000);
		}
	});
	ws.on('error', e => console.log('Ошибка ws', e?.message));
	ws.on('message', async data => {
		data = JSON.parse(data);
		if (data.type === 'SUBSCRIPTION_EVENT' && data.id === 3 && data.payload.account_id !== Number(userId)) {
			setTimeout(async () => {
				const msgExists = await db.get(`SELECT * FROM message WHERE id = ${data.payload.account_id}`);
				if (!!msgExists) return;
				await db.run(`INSERT INTO message (id, mail) VALUES (${data.payload.account_id}, "auto")`).catch(e => console.log('небольшая ошибка', e));
				const status = await responseMessage(cookies, data.payload.message_thread_id);
				if (status) sendCount++;
				received++;
				console.log(sendCount, received, 'Ответил:', name, data.payload.message_thread_id, data.payload.account_id, 'Статус:', status);
			}, config.responseTimeout);
		}
	});
};

const main = async () => {
	db = await open({
		filename: './database.db',
		driver: sqlite3.Database,
	});
	await db.run('CREATE TABLE IF NOT EXISTS listing (id TEXT PRIMARY KEY, reviews INT, query TEXT, status INT, hostId TEXT, hostName TEXT)');
	await db.run('CREATE TABLE IF NOT EXISTS message (id INTEGER PRIMARY KEY, mail TEXT )');

	while (true) {
		const files = fs.readdirSync('cookies');
		for (const file of files) {
			try {
				const cookies = JSON.parse(fs.readFileSync(`cookies/${file}`))
					.map(c => `${c.name}=${c.value}`)
					.join('; ');
				createConnection(cookies, file.split('.')[0], 0);
				fs.copyFileSync(`cookies/${file}`, `active_cookies/${file}`);
				fs.rmSync(`cookies/${file}`);
			} catch (error) {
				console.log('Ошибка получения куки файла');
			}
		}

		await new Promise(r => setTimeout(() => r(), 1000));
	}
};

main();
