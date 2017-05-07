const WebSocket = require('ws');
const logger    = require('bole')('websocket');
const db        = require('./db');
const events    = require('events');

const ee = new events.EventEmitter();

const wss = new WebSocket.Server({
	perMessageDeflate: false,
	port: 8081
});

wss.broadcast = (data) => {
	if (typeof data == 'object') {
		data = JSON.stringify(data);
	}
	
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

wss.on('connection', (ws) => {
	logger.info('New client: ' + ws._socket.remoteAddress);
	
	ee.emit('connection', ws);
	
	ws.on('message', (message) => {
		ee.emit('message', message, ws);
	});
});

function send(msg) {
	wss.broadcast(msg);
}

module.exports = { send, ee };
