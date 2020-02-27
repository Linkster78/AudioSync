const audio = require('./audio');
const sessions = require('./session');
const { uuid } = require('uuidv4');

Array.prototype.max = function() {
    return Math.max.apply(null, this);
};

var webSockets = {};

setInterval(() => {
    Object.keys(webSockets).forEach((uuid) => webSockets[uuid].ping(Date.now()));
}, 2500);

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
                                    session.preloaded[ws.uuid] = [];
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
                        if(session.queue.length > 0 && session.members.every((member) => session.preloaded[member].includes(session.queue[0])) && session.nowPlaying == null) {
                            session.nowPlaying = session.queue[0];
                            session.queue.shift();
                            var delay = Object.keys(session.ping).map((uuid) => session.ping[uuid]).max();
                            session.timeReference = [Date.now() + delay, 0];
                            session.members.forEach((member) => {
                                webSockets[member].send(JSON.stringify({
                                    packet: 'play',
                                    song: session.nowPlaying,
                                    time: delay - session.ping[member]
                                }));
                            });
                        }
                        var queueMessage = JSON.stringify({
                            packet: 'updateQueue',
                            queue: session.queue
                        });
                        session.members.forEach((member) => webSockets[member].send(queueMessage));
                    }
                    break;

                case 'unqueue':
                    var queueIndex = json['index'];
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        if(session.nowPlaying != null || queueIndex != 0) {
                            session.queue.splice(queueIndex, 1);
                            var queueMessage = JSON.stringify({
                                packet: 'updateQueue',
                                queue: session.queue
                            });
                            session.members.forEach((member) => webSockets[member].send(queueMessage));
                        }
                    }
                    break;

                case 'pause':
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        if(session.nowPlaying != null) {
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
                    var time = json['time'];
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        if(session.nowPlaying != null) {
                            var delay = Object.keys(session.ping).map((uuid) => session.ping[uuid]).max();
                            session.members.forEach((member) => {
                                webSockets[member].send(JSON.stringify({
                                    packet: 'resume',
                                    time: delay - session.ping[member],
                                    timestamp: time
                                }));
                            });
                            session.paused = false;
                            session.timeReference = [Date.now() + delay, time];
                        }
                    }
                    break;

                case 'skip':
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        session.nowPlaying = null;
                        if(session.queue.length > 0 && session.members.every((member) => session.preloaded[member].includes(session.queue[0]))) {
                            session.nowPlaying = session.queue[0];
                            session.queue.shift();
                            var queueMessage = JSON.stringify({
                                packet: 'updateQueue',
                                queue: session.queue
                            });
                            session.members.forEach((member) => webSockets[member].send(queueMessage));
                            var delay = Object.keys(session.ping).map((uuid) => session.ping[uuid]).max();
                            session.timeReference = [Date.now() + delay, 0];
                        }
                        session.members.forEach((member) => {
                            webSockets[member].send(JSON.stringify({
                                packet: 'play',
                                song: session.nowPlaying,
                                time: delay - session.ping[member]
                            }));
                        });
                        session.lastEnd = Date.now();
                    }
                    break;

                case 'end':
                    var time = Date.now();
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        var dist = Math.abs(time - session.lastEnd);
                        if(dist > 2500) {
                            session.nowPlaying = null;
                            if(session.queue.length > 0 && session.members.every((member) => session.preloaded[member].includes(session.queue[0]))) {
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
                            } else {
                                var playNullMessage = JSON.stringify({
                                    packet: 'play',
                                    song: session.nowPlaying,
                                    time: delay - session.ping[ws.uuid]
                                });
                                session.members.forEach((member) => webSockets[member].send(playNullMessage));
                            }
                        }
                    }
                    break;

                case 'loaded':
                    if(sessions.hasSession(ws.uuid)) {
                        var session = sessions.getSessionByUUID(ws.uuid);
                        var id = json['id'];
                        session.preloaded[ws.uuid].push(id);
                        if(session.members.every((member) => session.preloaded[member].includes(session.queue[0]) && session.nowPlaying == null)) {
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