var webSocket;

$(document).ready(() => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    webSocket = new WebSocket(`ws://${window.location.host}/ws`);

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
                var listing = json['listing'];
                for(var i = 0; i < listing.length; i++) {
                    $("#songListing").append(`<a href="#"><strong>[+]</strong> ${listing[i].artist} - ${listing[i].title}</a><br>`);
                }
                break;

            default:
                break;
        }
    };
});