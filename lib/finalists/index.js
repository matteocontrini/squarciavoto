const fs = require('fs');

let content = fs.readFileSync(__dirname + '/finalists.json').toString();
const finalists = JSON.parse(content);

function getByCode(code) {
	let found;
	for (let i = 0; i < finalists.length && !found; i++) {
		if (finalists[i]['code'] == code) {
			found = finalists[i];
		}
	}
	
	return found || null;
}

module.exports = { getByCode };
