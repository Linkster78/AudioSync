var webSocket;

webSocket = new WebSocket(`ws://${self.location.host}/ws`);

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

        //Song Listing Response
        case 'listing':
            var songListing = json['listing'];
            var thumbnails = json['thumbnails'];
            this.postMessage(['listing', songListing, thumbnails]);
            break;

        case 'sessionCreation':
            var code = json['code'];
            this.postMessage(['newSession', code]);
            break;

        default:
            break;
    }
};

webSocket.onclose = (event) => {
    this.postMessage(['abort']);
};