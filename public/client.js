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
            var thumbnails = json['thumbnails'];
            this.postMessage(['listing', songListing, thumbnails]);
            break;

        case 'sessionConnection':
            var code = json['code'];
            var sessionQueue = json['queue'];
            this.postMessage(['newSession', code]);
            this.postMessage(['updateQueue', sessionQueue]);
            break;

        case 'updateQueue':
            var newQueue = json['queue'];
            this.postMessage(['updateQueue', newQueue]);
            break;

        case 'load':
            var songId = json['song'];
            this.postMessage(['load', songId]);
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

        case 'queue':
            var songId = e.data[1];
            webSocket.send(JSON.stringify({
                packet: 'queue',
                song: songId
            }));
            break;

        case 'ready':
            webSocket.send(JSON.stringify({
                packet: 'ready'
            }));
            break;
    }
};