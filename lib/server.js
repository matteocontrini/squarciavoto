const logger = require('bole')('server');

const Hapi = require('hapi');
const Joi  = require('joi');
const Boom = require('boom');

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
		console.log(request.payload);
	},
	config: {
		validate: {
			payload: {
				sender: Joi.string().required(),
				date: Joi.string().required(),
				body: Joi.string().required()
			}
		}
	}
});

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

const WebSocket = require('ws');

const wss = new WebSocket.Server({
	perMessageDeflate: false,
	port: 8081
});

wss.broadcast = (data) => {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

wss.on('connection', (ws) => {
	console.log(ws._socket.remoteAddress);
	ws.on('message', (message) => {
		console.log(message);
	});
	
	ws.send('something', (err) => {
		
	});
});
