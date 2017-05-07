const WebSocket = require('ws');
const logger    = require('bole')('websocket');
const db        = require('./db');

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
	
	ws.on('message', (message) => {
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
});

function send(msg) {
	wss.broadcast(msg);
}

module.exports = { send };
