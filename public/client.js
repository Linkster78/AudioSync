var webSocket;

webSocket = new WebSocket(`ws://${self.location.hostname}:8722`);

webSocket.onopen = (event) => {
    webSocket.send(JSON.stringify({
        packet: 'sessionRequest'
    }));
    webSocket.send(JSON.stringify({
        packet: 'listing'
    }));
};

webSocket.onmessage = (event) => {
    var json = JSON.parse(event.data);

    switch(json['packet']) {
        case 'listing':
            var songListing = json['listing'];
            this.postMessage(['listing', songListing]);
            break;

        case 'thumbnailData':
            var data = json['data'];
            var hash = json['hash'];
            this.postMessage(['thumbnailData', hash, data]);
            break;

        case 'sessionConnection':
            var code = json['code'];
            var sessionQueue = json['queue'];
            var nowPlaying = json['nowPlaying'];
            var songProgress = json['songProgress'];
            var paused = json['paused'];
            this.postMessage(['newSession', code]);
            if(sessionQueue != null) this.postMessage(['updateQueue', sessionQueue]);
            if(nowPlaying != null) this.postMessage(['playAt', nowPlaying, songProgress, paused]);
            break;

        case 'updateQueue':
            var newQueue = json['queue'];
            this.postMessage(['updateQueue', newQueue]);
            break;

        case 'pause':
            var time = json['time'];
            this.postMessage(['pause', time]);
            break;

        case 'resume':
            var time = json['time'];
            var timestamp = json['timestamp'];
            this.postMessage(['resume', time, timestamp]);
            break;

        case 'play':
            var songId = json['song'];
            var time = json['time'];
            this.postMessage(['play', songId, time]);
            break;

        default:
            break;
    }
};

webSocket.onclose = (event) => {
    this.postMessage(['abort']);
};

onmessage = (e) => {
    var command = e.data[0];
    switch(command) {
        case 'connect':
            var code = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'sessionRequest',
                code: code
            }));
            break;

        case 'thumbnailRequest':
            var hash = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'thumbnailRequest',
                hash: hash
            }));
            break;

        case 'queue':
            var songId = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'queue',
                song: songId
            }));
            break;

        case 'unqueue':
            var queueIndex = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'unqueue',
                index: queueIndex
            }));
            break;

        case 'pause':
            webSocket.send(JSON.stringify({
                packet: 'pause'
            }));
            break;

        case 'resume':
            var time = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'resume',
                time: time
            }));
            break;

        case 'skip':
            webSocket.send(JSON.stringify({
                packet: 'skip'
            }));
            break;

        case 'end':
            webSocket.send(JSON.stringify({
                packet: 'end'
            }))
            break;

        case 'loaded':
            var id = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'loaded',
                id: id
            }));
            break;
    }
};