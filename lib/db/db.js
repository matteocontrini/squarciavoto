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
					parsedCount: c2,
					unparsableCount: c1,
					parsedPercentage: c2 / tot,
					unparsablePercentage: c1 / tot,
					totalCount: tot
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
			// Consider only valid votes
			{
				$match: {
					vote: { $ne: null }
				}
			},

			// Sort by date ascending
			{
				$sort: {
					sender: 1,
					date: 1
				}
			},

			// Group by sender number
			{
				$group: {
					_id: '$sender',
					votes: { $push: '$$ROOT' }
				}
			},

			// Keep the first 2 votes for each sender
			{
				$project: {
					votes: {
						$slice: ['$votes', 2]
					}
				}
			},

			// Keep only one document with a votes array
			{
				$unwind: {
					path: '$votes'
				}
			},

			// Keep only the votes array
			{
				$replaceRoot: {
					newRoot: '$votes'
				}
			},

			// Group by voted name, count the votes for each person,
			// create an array of unique senders
			{
				$group: {
					_id:  { name: '$vote.name', code: '$vote.code' },
					count: { $sum: 1 },
					senders: { $addToSet: '$sender' }
				}
			},

			// Stage 8
			{
				$project: {
					_id: false,
					name: '$_id.name',
					code: '$_id.code',
					count: '$count',
					sendersCount: { $size: '$senders' }
				}
			},
			
			{
				$sort: { count: -1 }
			}
		], callback);
	},
	
	getValidVotes(callback) {
		db.messages.aggregate([
			// Consider only valid votes
			{
				$match: {
					vote: { $ne: null }
				}
			},
			
			// Sort by date ascending
			{
				$sort: {
					sender: 1,
					date: 1
				}
			},

			// Group by sender number
			{
				$group: {
					_id: '$sender',
					votes: { $push: '$$ROOT' }
				}
			},

			// Keep the first 2 votes for each sender
			{
				$project: {
					votes: {
						$slice: ['$votes', 2]
					}
				}
			},

			// Group by sender number
			{
				$project: {
					votes: { $size: '$votes' }
				}
			},

			// Stage 8
			{
				$group: {
					_id: null,
					averageVotes: { $avg: '$votes' },
					validCount: { $sum: '$votes' }
				}
			}
		], callback);
	}
};

module.exports = { messages };
