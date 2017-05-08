const logger = require('bole')('server');

const Hapi = require('hapi');
const Joi  = require('joi');
const Boom = require('boom');

const db = require('./db');
const socket = require('./socket.js');
const finalists = require('./finalists');

socket.ee.on('message', (message, ws) => {
	if (message == 'getallpls') {
		db.messages.find((err, messages) => {
			if (err) {
				logger.error(err);
				return;
			}
			
			ws.send(JSON.stringify({ type: 'messages', data: messages }));
		});
	}
});

socket.ee.on('connection', () => {
	sendStats();
});

// Create the HTTP server
const server = new Hapi.Server({
	useDomains: false,
	debug: false,
	connections: {
		router: {
			stripTrailingSlash: true,
			isCaseSensitive: false
		}
	}
});

server.connection({
	host: '0.0.0.0',
	port: process.env.PORT || 8080,
	routes: {
		cors: true
	}
});

server.register(require('inert'));

server.route({
	method: 'GET',
	path: '/{param*}',
	handler: {
		directory: {
			path: __dirname + '/public',
			index: true
		}
	}
});

server.route({
	method: 'POST',
	path: '/messages',
	handler: (request, reply) => {
		let msg = request.payload;
		
		msg['date'] = new Date(msg['date']);
		
		let text = msg['text'];
		
		text = text.trim();
		let match = text.match(/([0-9]{1,2})/);
		
		if (match) {
			text = match[1];
			while (text[0] == '0') {
				text = text.slice(1);
			}
			
			let f = finalists.getByCode(text);
			
			msg['vote'] = f;
		}
		else {
			msg['vote'] = null;
		}
		
		db.messages.insert(msg, (err) => {
			if (err) {
				request.logger('error', err);
				reply(Boom.internal());
				return;
			}
			
			socket.send({ type: 'message', data: msg });
			reply(null, { ok: true });
			
			sendStats();
		});
	},
	config: {
		validate: {
			payload: {
				sender: Joi.string().required(),
				date: Joi.string().regex(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/).required(),
				text: Joi.string().required()
			}
		}
	}
});

function sendStats() {
	db.messages.getCounts((err, counts) => {
		if (err) {
			logger.error(err);
			return;
		}
				
		db.messages.countSenders((err, senders) => {
			if (err) {
				logger.error(err);
				return;
			}
			
			db.messages.getValidVotes((err, counts1) => {
				if (err) {
					logger.error(err);
					return;
				}
				
				counts1[0]['validPercentage'] = counts1[0]['validCount'] / counts['parsedCount'];
			
				let res = {};
				Object.assign(res, counts, senders[0], counts1[0] );
				
				res['exceedingCount'] = res['parsedCount'] - res['validCount'];
				res['exceedingPercentage'] = res['exceedingCount'] / counts['parsedCount'];
				
				socket.send({ type: 'stats', data: res });
				
				sendRank();
			});
		});
	});
}

function sendRank() {
	db.messages.getRank((err, rank) => {
		if (err) {
			logger.error(err);
			return;
		}
		
		let tot = 0;
		rank.forEach((p) => {
			tot += p['count'];
		});
		
		rank.forEach((p) => {
			p['percentage'] = p['count'] / tot;
		});
		
		socket.send({ type: 'rank', data: rank });
	});
}

server.on('request', (request, event, tags) => {
	if (tags.error) {
		let r = {
			method: request.method,
			path: request.url.path,
			headers: request.headers,
			remoteAddress: request.connection.remoteAddress,
			payload: request.payload
		};
		
		let error = null;
		if (event['data'] instanceof Error) {
			error = {
				message: event['data']['message'],
				name: event['data']['name'],
				stack: event['data']['stack']
			};
		}
		else {
			error = event['data'];
		}
		
		let log = { request: r, error: error };
		
		logger.error(log);
	}
	else {
		logger[event['tags'][0]](event['data']);
	}
});

server.on('log', (event, tags) => {
	if (tags.error) {
		// Ignore connection errors
		if (!tags.connection) {
			logger.error(event['data']);
		}
	}
	else if (tags.load) {
		logger.warn(event['data']);
	}
	else {
		logger[event['tags'][0]](event['data']);
	}
});

server.on('response', (request) => {
	let text = request.method.toUpperCase() + ' ' + request.url.path + ' ' + (request.response.statusCode || '-');
	
	server.log('info', text);
});

// Start the server
server.start((err) => {
	if (err) {
		throw err;
	}
	
	server.log('info', 'Server running at ' + server.info.uri);
});

module.exports = server;
