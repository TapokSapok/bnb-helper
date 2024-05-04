const { default: axios } = require('axios');
const fs = require('fs');
const config = require('../config.json');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

//data['root > core-guest-spa'][1][1].niobeMinimalClientData[2][1].data.presentation.staysSearch.results.categoryBar.categories

// const result = JSON.parse(fs.readFileSync('data.json', 'utf-8'));
// console.log(Object.entries(result).filter(s => s[1].reviews >= 100).length);
// process.exit();

const url = 'https://www.airbnb.com/api/v3/StaysSearch/12170f0d90cb0ee448c9139a1b36e9116daa313467fec95a0fda7459e7e1cfa9?operationName=StaysSearch&locale=en&currency=USD';
const options = {
	headers: { 'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20' },
};
const tags = [
	'Tag:8102',
	'Tag:677',
	'Tag:789',
	'Tag:4104',
	'Tag:8536',
	'Tag:8678',
	'Tag:7765',
	'Tag:8144',
	'Tag:8101',
	'Tag:8661',
	'Tag:8538',
	'Tag:8524',
	'Tag:8175',
	'Tag:8658',
	'Tag:8186',
	'Tag:8528',
	'Tag:8662',
	'Tag:5348',
	'Tag:1073',
	'Tag:5731',
	'Tag:8525',
	'Tag:8526',
	'Tag:8115',
	'Tag:5366',
	'Tag:8521',
	'Tag:8253',
	'Tag:634',
	'Tag:8173',
	'Tag:8188',
	'Tag:8522',
	'Tag:8192',
	'Tag:8159',
	'Tag:7769',
];
console.time('parse');
let db = null;

(async () => {
	db = await open({
		filename: './database.db',
		driver: sqlite3.Database,
	});
	db.run('CREATE TABLE IF NOT EXISTS listing (id TEXT PRIMARY KEY, reviews INT, query TEXT, status INT, hostId TEXT, hostName TEXT)');
	main();
})();

const getData = async (section, items, tag) => {
	const cursor = Buffer.from(`{"section_offset":${section},"items_offset":${items},"version":1}`, 'utf-8').toString('base64');

	const reqData = {
		operationName: 'StaysSearch',
		variables: {
			staysSearchRequest: {
				requestedPageType: 'STAYS_SEARCH',
				cursor: cursor ?? 'eyJzZWN0aW9uX29mZnNldCI6MCwiaXRlbXNfb2Zmc2V0IjoyMCwidmVyc2lvbiI6MX0=',
				metadataOnly: false,
				searchType: 'filter_change',
				source: 'structured_search_input_header',
				treatmentFlags: ['feed_map_decouple_m11_treatment', 'stays_search_rehydration_treatment_desktop', 'stays_search_rehydration_treatment_moweb'],
				rawParams: [
					{
						filterName: 'categoryTag',
						filterValues: [tag],
					},
					{
						filterName: 'cdnCacheSafe',
						filterValues: ['false'],
					},
					{
						filterName: 'channel',
						filterValues: ['EXPLORE'],
					},
					{
						filterName: 'datePickerType',
						filterValues: ['calendar'],
					},

					{
						filterName: 'itemsPerGrid',
						filterValues: ['40'],
					},
					{
						filterName: 'query',
						filterValues: [config.query],
					},
					{
						filterName: 'refinementPaths',
						filterValues: ['/homes'],
					},
					{
						filterName: 'screenSize',
						filterValues: ['large'],
					},
					{
						filterName: 'version',
						filterValues: ['1.8.3'],
					},
				],
				maxMapItems: 9999,
			},
			includeMapResults: false,
			isLeanTreatment: false,
		},
		extensions: {
			persistedQuery: {
				version: 1,
				sha256Hash: '12170f0d90cb0ee448c9139a1b36e9116daa313467fec95a0fda7459e7e1cfa9',
			},
		},
	};

	const res = await axios.post(url, reqData, options);
	if (res.data.errors) return console.log(res.data.errors[0]);

	const nextCursor = res.data.data.presentation.staysSearch.results.paginationInfo.nextPageCursor;
	let listings = [];

	for (const apart of res.data.data.presentation.staysSearch.results.searchResults) {
		const listing = apart.listing;
		if (!listing) {
			console.log('err');
			return false;
		}
		listings.push({
			id: listing.id,
			reviews: listing.avgRatingLocalized && listing.avgRatingLocalized !== 'New' ? Number(listing.avgRatingLocalized.match(/\((.*?)\)/)[1]) : 0,
		});
	}

	const requiredListings = await db.all(`SELECT id FROM listing WHERE id IN (${listings.map(l => `"${l.id}"`).join(', ')})`).catch(e => console.log('ERROR 1:', e));

	listings = listings.filter(l => !requiredListings.some(ls => ls.id === l.id));

	if (listings.length) {
		await db
			.run(`INSERT INTO listing (id, reviews, query, status) VALUES ${listings.map(l => `("${l.id}", ${l.reviews}, "${config.query}", 0)`).join(', ')};`)
			.catch(e => console.log('ERROR 2:', e));
	}

	return nextCursor;
};

const startParsing = async () => {
	for (const tagId in tags) {
		for (let sectionOffset = 0; sectionOffset < 1; sectionOffset++) {
			let itemsOffset = 0;
			let nextCursor = '1';
			while (nextCursor) {
				nextCursor = await getData(sectionOffset, itemsOffset, tags[tagId]);
				itemsOffset += 40;
				console.log(tagId, tags[tagId], await db.get(`SELECT Count(*) FROM listing WHERE status = 0 AND query = "${config.query}"`).then(l => l['Count(*)']));
			}
		}
	}
	console.timeEnd('parse');
};

const main = async () => {
	startParsing();
};

module.exports = startParsing;
