var playerWorker, webSocket;
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
    $(".song-information").css("display", "");
}

$(document).ready(() => {
    playerWorker = new Worker("player.js");
    webSocket = new WebSocket(`ws://${window.location.host}/ws`);

    $(".song-information").css("display", "none");
    $("#songPlayer").get(0).onended = (e) => {
        playerWorker.postMessage(['ended']);
    };

    playerWorker.onmessage = (e) => {
        var command = e.data[0];
        switch(command) {
            case 'play':
                var source = e.data[1];
                var player = $("#songPlayer");
                player.find("source").attr("src", source);
                player.get(0).load();
                player.get(0).play();
                break;
        }
    };

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
                songListing = json['listing'];
                thumbnails = json['thumbnails'];
                for(var i = 0; i < songListing.length; i++) {
                    $("#songListing").append(`<a href="#" data-song="${i}"><strong>[+]</strong> ${songListing[i].title}</a><br>`);
                }
                $("#songListing > a").mouseenter((event) => {
                    var songId = $(event.target).closest("a").attr("data-song");
                    updateSongInformation(songId);
                });
                $("#songListing > a").mouseleave((event) => {
                    $(".song-information").css("display", "none");
                });
                $("#songListing > a").click((event) => {
                    var songId = $(event.target).closest("a").attr("data-song");
                    playerWorker.postMessage(['queue', encodeURIComponent(songListing[songId].file)]);
                });
                break;

            default:
                break;
        }
    };
});