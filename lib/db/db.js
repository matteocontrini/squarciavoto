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
	}
};

module.exports = { messages };
