const logger  = require('bole')('db');
const mongojs = require('mongojs');
const init    = require('./init.js');

const collections = ['messages'];
const dbOptions = { connectTimeoutMS: 5000 };

const db = mongojs('mongodb://localhost/squarciavoto', collections, dbOptions);

db.on('error', (err) => {
	throw err;
});

db.on('connect', () => {
	logger.info('DB connected');
});

db.on('timeout', () => {
	throw new Error('DB timeout');
});

init(db, (err) => {
	if (err) {
		throw err;
	}
	
	logger.info('DB initialized');
});

let messages = {
	insert(msg, callback) {
		db.messages.insert(msg, callback);
	},
	
	find(callback) {
		db.messages.find({}).sort({ date: -1 }, callback);
	},
	
	getCounts(callback) {
		db.messages.count({ vote: null }, (err, c1) => {
			if (err) {
				callback(err);
				return;
			}
			
			db.messages.count({ vote: { $ne: null } }, (err, c2) => {
				if (err) {
					callback(err);
					return;
				}
				
				let tot = c1 + c2;
				
				let counts = {
					validCount: c2,
					invalidCount: c1,
					validPercentage: c2 / tot,
					invalidPercentage: c1 / tot
				};
				
				callback(null, counts);
			});
		});
	},
	
	countSenders(callback) {
		db.messages.aggregate([
			{
				$group: {
					_id: '$sender'
				}
			},
			{
				$count: 'sendersCount'
			}
		], callback);
	},
	
	getRank(callback) {
		db.messages.aggregate([
			{
				$match: {
					'vote.name': { $ne: null }
				}
			},
			{
				$group: {
					_id: '$vote.name',
					count: { $sum: 1 }
				}
			},
			{
				$project: {
					_id: false,
					name: '$_id',
					count: '$count'
				}
			},
			{
				$sort: {
					count: -1
				}
			}
		], callback);
	}
};

module.exports = { messages };
