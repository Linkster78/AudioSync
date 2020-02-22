const audio = require('./audio');
const sessions = require('./session');
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

                case 'sessionRequest':
                    if(sessions.getSessionByUUID(ws.uuid) === undefined) {
                        var session = sessions.createSession(ws.uuid);
                        ws.send(JSON.stringify({
                            packet: 'sessionCreation',
                            code: session.code
                        }));
                    }
                    break;

                default:
                    break;
            }
        });

        ws.on('close', () => {
            sessions.disconnectMember(ws.uuid);
        });
    });
}

module.exports = {
    configureWebSocket: configureWebSocket
};