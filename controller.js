const audio = require('./audio');
const sessions = require('./session');
const { uuid } = require('uuidv4');

Array.prototype.max = function() {
    return Math.max.apply(null, this);
};

var webSockets = {};

setInterval(() => {
    Object.keys(webSockets).forEach((uuid) => webSockets[uuid].ping(Date.now()));
}, 1000);

var configureWebSocket = function(wss) {
    wss.on('connection', (ws) => {
        ws.uuid = uuid();
        webSockets[ws.uuid] = ws;

        ws.on("pong", (msg) => {
            var ping = (Date.now() - Number(msg.toString('utf8'))) / 2;
            if(sessions.hasSession(ws.uuid)) {
                var session = sessions.getSessionByUUID(ws.uuid);
                session.ping[ws.uuid] = ping;
            }
        });

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
                    if(!sessions.hasSession(ws.uuid)) {
                        var session = sessions.createSession(ws.uuid);
                        ws.send(JSON.stringify({
                            packet: 'sessionConnection',
                            code: session.code
                        }));
                    } else {
                        var code = json['code'];
                        if(code !== undefined) {
                            var currentSession = sessions.getSessionByUUID(ws.uuid);
                            var ping = currentSession.ping[ws.uuid];
                            if(code != currentSession.code) {
                                var session = sessions.getSessionByCode(code);
                                if(session !== undefined) {
                                    sessions.disconnectMember(ws.uuid);
                                    session.members.push(ws.uuid);
                                    ws.send(JSON.stringify({
                                        packet: 'sessionConnection',
                                        code: session.code,
                                        queue: session.queue,
                                        nowPlaying: session.nowPlaying,
                                        songProgress: (session.paused ? session.timeReference[1] : session.timeReference[1] + Date.now() - session.timeReference[0]),
                                        paused: session.paused
                                    }));
                                }
                            }
                        }
                    }
                    break;

                case 'queue':
                    var songId = json['song'];
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        session.queue.push(songId);
                        var queueMessage = JSON.stringify({
                            packet: 'updateQueue',
                            queue: session.queue
                        });
                        session.members.forEach((member) => webSockets[member].send(queueMessage));
                        if(session.queue.length == 1 && session.nowPlaying === undefined) {
                            var loadMessage = JSON.stringify({
                                packet: 'load',
                                song: session.queue[0]
                            });
                            session.members.forEach((member) => webSockets[member].send(loadMessage));
                        }
                    }
                    break;

                case 'unqueue':
                    var queueIndex = json['index'];
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        session.queue.splice(queueIndex, 1);
                        var queueMessage = JSON.stringify({
                            packet: 'updateQueue',
                            queue: session.queue
                        });
                        session.members.forEach((member) => webSockets[member].send(queueMessage));
                    }
                    break;

                case 'pause':
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        if(session.nowPlaying !== undefined) {
                            var delay = Object.keys(session.ping).map((uuid) => session.ping[uuid]).max();
                            session.members.forEach((member) => {
                                webSockets[member].send(JSON.stringify({
                                    packet: 'pause',
                                    time: delay - session.ping[member]
                                }));
                            });
                            session.paused = true;
                            session.timeReference = [Date.now() + delay, Date.now() + delay - session.timeReference[0] + session.timeReference[1]];
                        }
                    }
                    break;

                case 'resume':
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        if(session.nowPlaying !== undefined) {
                            var delay = Object.keys(session.ping).map((uuid) => session.ping[uuid]).max();
                            session.members.forEach((member) => {
                                webSockets[member].send(JSON.stringify({
                                    packet: 'resume',
                                    time: delay - session.ping[member]
                                }));
                            });
                            session.paused = false;
                            session.timeReference = [Date.now() + delay, session.timeReference[1]];
                        }
                    }
                    break;

                case 'ready':
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        session.ready[ws.uuid] = true;
                        if(session.members.every((member) => session.ready[member])) {
                            session.nowPlaying = session.queue[0];
                            session.queue.shift();
                            var queueMessage = JSON.stringify({
                                packet: 'updateQueue',
                                queue: session.queue
                            });
                            session.members.forEach((member) => webSockets[member].send(queueMessage));
                            var delay = Object.keys(session.ping).map((uuid) => session.ping[uuid]).max();
                            session.members.forEach((member) => {
                                webSockets[member].send(JSON.stringify({
                                    packet: 'play',
                                    song: session.nowPlaying,
                                    time: delay - session.ping[member]
                                }));
                            });
                            session.timeReference = [Date.now() + delay, 0];
                        }
                    }
                    break;
            }
        });

        ws.on('close', () => {
            sessions.disconnectMember(ws.uuid);
            delete webSockets[ws.uuid];
        });
    });
}

module.exports = {
    configureWebSocket: configureWebSocket
};