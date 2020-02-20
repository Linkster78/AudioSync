var webSocket;
var songListing, thumbnails;

function updateSongInformation(songId) {
    var song = songListing[songId];
    var songMinutes = Math.floor(song.duration / 60);
    var songSeconds = Math.floor(song.duration % 60).toString();
    if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
    var songLength = songMinutes + ":" + songSeconds;
    $("#songTitle").text(`Title: ${song.title}`);
    $("#songArtist").text(`Artist: ${song.artist}`);
    $("#songLength").text(`Length: ${songLength}`);
    $("#songAlbum").text(`Album: ${song.album}`);
    $("#songYear").text(`Release Year: ${song.year}`);
    $("#songThumbnail").attr("src", thumbnails[song.thumbnail]);
}

$(document).ready(() => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    webSocket = new WebSocket(`ws://${window.location.host}/ws`);

    webSocket.onopen = (event) => {
        webSocket.send(JSON.stringify({
            packet: 0
        }));

        /* DEBUG LINE */
        webSocket.send(JSON.stringify({
            packet: 1,
            songId: 0,
            offset: 0
        }));
    };

    webSocket.onmessage = (event) => {
        var json = JSON.parse(event.data);

        switch(json['packet']) {

            //Song Listing Response
            case 0:
                songListing = json['listing'];
                thumbnails = json['thumbnails'];
                for(var i = 0; i < songListing.length; i++) {
                    $("#songListing").append(`<a href="#" data-song="${i}"><strong>[+]</strong> ${songListing[i].title}</a><br>`);
                }
                updateSongInformation(0);
                $("#songListing > a").mouseenter((event) => {
                    var songId = $(event.target).closest("a").attr("data-song");
                    updateSongInformation(songId);
                });
                break;

            //Song Chunk Response
            case 1:
                /* DO SOMETHING WITH AUDIO also implement the request part lmao you havent done that */
                break;

            default:
                break;
        }
    };
});