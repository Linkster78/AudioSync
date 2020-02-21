const audio = require('./audio');
const party = require('./session');
const { uuid } = require('uuidv4');

var configureWebSocket = function(ws, app) {
    app.ws('/ws', (ws, req) => {
        ws.uuid = uuid();

        ws.on('message', (msg) => {
            var json = JSON.parse(msg);
            switch(json['packet']) {

                case 'listing':
                    ws.send(JSON.stringify({
                        packet: 'listing',
                        listing: audio.songStore,
                        thumbnails: audio.thumbnailStore
                    }));
                    break;

                default:
                    break;
            }
        });

        ws.on('close', () => {
            
        });
    });
}

module.exports = {
    configureWebSocket: configureWebSocket
};