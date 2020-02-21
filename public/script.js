var playerWorker, webSocket;
var songListing, thumbnails;

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

function updatePopup(songId, link) {
    var song = songListing[songId];
    var songMinutes = Math.floor(song.duration / 60);
    var songSeconds = Math.floor(song.duration % 60).toString();
    if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
    var songLength = songMinutes + ":" + songSeconds;
    $("#songTitle").text(`Title: ${song.title}`);
    $("#songArtist").text(`Artist(s): ${song.artist}`);
    $("#songLength").text(`Length: ${songLength}`);
    $("#songAlbum").text(`Album: ${song.album}`);
    $("#songYear").text(`Release Year: ${song.year}`);
    $("#songThumbnail").attr("src", thumbnails[song.thumbnail]);
    var popup = $("#songPopup");
    popup.css("display", "");
    popup.css("left", (link.outerWidth() * 1.6 + link.position().left).clamp(0, $(".browser").outerWidth()));
    popup.css("top", (link.outerHeight() + link.position().top - popup .outerHeight() / 2).clamp(5, $(window).height() - popup .outerHeight() - 20));
}

function updateNowPlaying(songId) {
    if(songId === undefined) {
        $("#npTitle").text(`Title: NA`);
        $("#npArtist").text(`Artist(s): NA`);
        $("#npLength").text(`Length: NA`);
        $("#npAlbum").text(`Album: NA`);
        $("#npYear").text(`Release Year: NA`);
        $("#npThumbnail").attr("src", "noimage.png");
        $("#npCurrentTime").text("0:00");
        $("#npEndTime").text("0:00");
    } else {
        var song = songListing[songId];
        var songMinutes = Math.floor(song.duration / 60);
        var songSeconds = Math.floor(song.duration % 60).toString();
        if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
        var songLength = songMinutes + ":" + songSeconds;
        $("#npTitle").text(`Title: ${song.title}`);
        $("#npArtist").text(`Artist(s): ${song.artist}`);
        $("#npLength").text(`Length: ${songLength}`);
        $("#npAlbum").text(`Album: ${song.album}`);
        $("#npYear").text(`Release Year: ${song.year}`);
        $("#npThumbnail").attr("src", thumbnails[song.thumbnail]);
        $("#npCurrentTime").text("0:00");
        $("#npEndTime").text(songLength);
    }
    $("#npProgressBar").css("width", 0);
    var toggleButton = $("#toggleButton");
    toggleButton.html("<strong>[&#10073;&#10073;]</strong> Pause");
    toggleButton.addClass("pause-button");
    toggleButton.removeClass("play-button");
}

$(document).ready(() => {
    playerWorker = new Worker("player.js");
    webSocket = new WebSocket(`ws://${window.location.host}/ws`);

    updateNowPlaying(undefined);
    $("#songPopup").css("display", "none");
    $("#songPlayer").get(0).onended = (e) => {
        playerWorker.postMessage(['skip']);
    };
    $("#npProgressBarBackdrop").click((event) => {
        var player = $("#songPlayer");
        if(!player.get(0).paused) {
            var progressBarBackdrop = $(event.target).closest("#npProgressBarBackdrop");
            var parentOffset = progressBarBackdrop.parent().offset();
            var relX = event.pageX - parentOffset.left;
            var newProgress = relX / progressBarBackdrop.width();
            var player = $("#songPlayer");
            player.get(0).currentTime = newProgress * player.get(0).duration;
            var songProgress = player.get(0).currentTime;
            var songMinutes = Math.floor(songProgress / 60);
            var songSeconds = Math.floor(songProgress % 60).toString();
            if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
            var songLength = songMinutes + ":" + songSeconds;
            $("#npCurrentTime").text(songLength);
            $("#npProgressBar").css("width", `${songProgress / player.get(0).duration*100}%`);
        }
    });
    $("#skipButton").click((event) => {
        playerWorker.postMessage(['skip']);
    });
    $("#toggleButton").click((event) => {
        var player = $("#songPlayer");
        var domPlayer = player.get(0);
        var toggleButton = $("#toggleButton");
        if(domPlayer.paused) {
            domPlayer.play();
            toggleButton.html("<strong>[&#10073;&#10073;]</strong> Pause");
            toggleButton.addClass("pause-button");
            toggleButton.removeClass("play-button");
        } else {
            domPlayer.pause();
            toggleButton.html("<strong>[&#9658;]</strong> Play");
            toggleButton.addClass("play-button");
            toggleButton.removeClass("pause-button");
        }
    });

    setInterval(() => {
        var player = $("#songPlayer");
        if(!player.get(0).paused) {
            var songProgress = player.get(0).currentTime;
            var songMinutes = Math.floor(songProgress / 60);
            var songSeconds = Math.floor(songProgress % 60).toString();
            if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
            var songLength = songMinutes + ":" + songSeconds;
            $("#npCurrentTime").text(songLength);
            $("#npProgressBar").css("width", `${songProgress / player.get(0).duration*100}%`);
        }
    }, 500);

    playerWorker.onmessage = (e) => {
        var command = e.data[0];
        switch(command) {
            case 'play':
                var songId = e.data[1];
                var source = encodeURIComponent(songListing[songId].file);
                var player = $("#songPlayer").get(0);
                $("#songPlayer source").attr("src", source);
                player.load();
                player.play();
                updateNowPlaying(songId);
                break;

            case 'done':
                updateNowPlaying(undefined);
                var source = $("#songPlayer").find("source").get(0);
                source.removeAttribute('src');
                source.load();
                break;

            case 'pushQueue':
                var songId = e.data[1];
                var song = songListing[songId];
                var queue = $("#queue");
                var songMinutes = Math.floor(song.duration / 60);
                var songSeconds = Math.floor(song.duration % 60).toString();
                if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
                var songLength = songMinutes + ":" + songSeconds;
                queue.append(`<tr data-song="${songId}"><td>${queue.find("tr").length}.</td><td>${song.title}</td><td>${song.artist}</td><td>${songLength}</td></tr>`);
                break;

            case 'popQueue':
                var songId = e.data[1];
                var song = songListing[songId];
                $(`#queue tr[data-song="${songId}"]`).first().remove();
                $("#queue tr").each((index) => {
                    if(index != 0) {
                        $(`#queue tr:eq(${index})`).find("td").first().text(`${index}.`);
                    }
                });
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
                    $("#songListing").append(`<a class="song-option" href="#" data-song="${i}"><strong>[+]</strong> ${songListing[i].title}</a><br>`);
                }
                $("#songListing > a").mouseenter((event) => {
                    var songId = $(event.target).closest("a").attr("data-song");
                    updatePopup(songId, $(event.target).closest("a"));
                });
                $("#songListing > a").mouseleave((event) => {
                    $("#songPopup").css("display", "none");
                });
                $("#songListing > a").click((event) => {
                    var songId = $(event.target).closest("a").attr("data-song");
                    playerWorker.postMessage(['queue', songId]);
                });
                break;

            default:
                break;
        }
    };
});