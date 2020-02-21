const audio = require('./audio');
const party = require('./party');

var configureWebSocket = function(ws, app) {
    app.ws('/ws', (ws, req) => {
        ws.on('message', (msg) => {
            var json = JSON.parse(msg);
            switch(json['packet']) {

                //Song Listing Request
                case 0:
                    ws.send(JSON.stringify({
                        packet: 0,
                        listing: audio.songStore,
                        thumbnails: audio.thumbnailStore
                    }));
                    break;

                default:
                    break;
            }
        });
    });
}

module.exports = {
    configureWebSocket: configureWebSocket
};