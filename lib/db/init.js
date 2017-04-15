const async = require('async');

function init(db, callback) {
	let indexes = {
		messages: [
			{ date: -1 }
		]
	};
	
	async.eachSeries(Object.keys(indexes), (collection, cb) => {
		async.eachSeries(indexes[collection], (index, cb1) => {
			db[collection].createIndex(index, cb1);
		}, cb);
	}, callback);
}

module.exports = init;
