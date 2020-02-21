var webSocket;

webSocket = new WebSocket(`ws://${self.location.host}/ws`);

webSocket.onopen = (event) => {
    webSocket.send(JSON.stringify({
        packet: 0
    }));
};

webSocket.onmessage = (event) => {
    var json = JSON.parse(event.data);

    switch(json['packet']) {

        //Song Listing Response
        case 0:
            var songListing = json['listing'];
            var thumbnails = json['thumbnails'];
            this.postMessage(['listing', songListing, thumbnails]);
            break;

        default:
            break;
    }
};