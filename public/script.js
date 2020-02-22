var clientWorker;
var songListing, thumbnails;

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

var howl;

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
        var toggleButton = $("#toggleButton");
        toggleButton.html("<strong>[&#10073;&#10073;]</strong> Pause");
        toggleButton.addClass("pause-button");
        toggleButton.removeClass("play-button");
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
}

$(document).ready(() => {
    clientWorker = new Worker("client.js");

    updateNowPlaying(undefined);
    $("#songPopup").css("display", "none");
    $("#selectFilter").val("none");
    $("#inputCode").val("");

    $("#npProgressBarBackdrop").click((event) => {
        if(howl !== undefined) {
            var progressBarBackdrop = $(event.target).closest("#npProgressBarBackdrop");
            var parentOffset = progressBarBackdrop.parent().offset();
            var relX = event.pageX - parentOffset.left;
            var newProgress = relX / progressBarBackdrop.width();
            var timestamp = newProgress * howl.duration();
            clientWorker.postMessage(['setTime', timestamp]);
        }
    });

    $("#skipButton").click((event) => {
        clientWorker.postMessage(['skip']);
    });

    /* MUSIC COMPLETION = NEXT SONG*/

    $("#toggleButton").click((event) => {
        if(howl !== undefined && howl._sounds[0] !== undefined && howl._sounds[0]._paused && !isNaN(howl.seek())) {
            clientWorker.postMessage(['resume', howl.seek()]);
        } else {
            clientWorker.postMessage(['pause']);
        }
    });

    $("#buttonConnect").click((event) => {
        var code = $("#inputCode").val();
        if(code.length == 5) {
            clientWorker.postMessage(['connect', code]);
        }
        $("#inputCode").val("");
    });

    $("#selectFilter").change((event) => {
        var filter = $(event.target).val();
        $("#songListing").empty();
        if(filter == "none") {
            for(var i = 0; i < songListing.length; i++) {
                $("#songListing").append(`<a class="song-option" href="#" data-song="${i}"><strong>[+]</strong> ${songListing[i].title}</a><br>`);
            }
        } else {
            var categories = Array.from(new Set(songListing.map((song) => song[filter]))).sort();
            for(var i = 0; i < categories.length; i++) {
                var category = categories[i];
                $("#songListing").append(`<a class="song-category" href="#" data-category="${i}"><strong>&#9654;</strong> ${category}</a><br><div style="display:none;" class="category" data-category="${i}"></div`);
            }
            $(".song-category").click((event) => {
                var categoryId = $(event.target).closest("a").attr("data-category");
                var categoryDiv = $(`.category[data-category="${categoryId}"]`);
                if(categoryDiv.css("display") == "none") {
                    categoryDiv.css("display", "");
                    $(`.song-category[data-category="${categoryId}"] strong`).html("&#9660;");
                } else {
                    categoryDiv.css("display", "none");
                    $(`.song-category[data-category="${categoryId}"] strong`).html("&#9654;");
                }
            });
            for(var i = 0; i < songListing.length; i++) {
                var categoryId = categories.indexOf(songListing[i][filter]);
                var category = $(`.category[data-category="${categoryId}"]`);
                category.append(`<a class="song-option" href="#" data-song="${i}"><strong>[+]</strong> ${songListing[i].title}</a><br>`);
            }
        }
        for(var i = 0; i < songListing.length; i++) {
            var songOption = $(`.song-option[data-song="${i}"]`);
            songOption.mouseenter((event) => {
                var songId = $(event.target).closest("a").attr("data-song");
                updatePopup(songId, $(event.target).closest("a"));
            });
            songOption.mouseleave((event) => {
                $("#songPopup").css("display", "none");
            });
            songOption.click((event) => {
                var songId = $(event.target).closest("a").attr("data-song");
                clientWorker.postMessage(['queue', songId]);
            });
        }
    });

    setInterval(() => {
        if(howl !== undefined && howl._sounds[0] !== undefined) {
            var songProgress = howl.seek();
            if(!isNaN(songProgress)) {
                var songMinutes = Math.floor(songProgress / 60);
                var songSeconds = Math.floor(songProgress % 60).toString();
                if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
                var songLength = songMinutes + ":" + songSeconds;
                $("#npCurrentTime").text(songLength);
                $("#npProgressBar").css("width", `${songProgress / howl.duration()*100}%`);
            }
        }
    }, 500);

    clientWorker.onmessage = (e) => {
        var command = e.data[0];
        switch(command) {
            case 'listing':
                songListing = e.data[1];
                thumbnails = e.data[2];
                for(var i = 0; i < songListing.length; i++) {
                    $("#songListing").append(`<a class="song-option" href="#" data-song="${i}"><strong>[+]</strong> ${songListing[i].title}</a><br>`);
                    var songOption = $(`.song-option[data-song="${i}"]`);
                    songOption.mouseenter((event) => {
                        var songId = $(event.target).closest("a").attr("data-song");
                        updatePopup(songId, $(event.target).closest("a"));
                    });
                    songOption.mouseleave((event) => {
                        $("#songPopup").css("display", "none");
                    });
                    songOption.click((event) => {
                        var songId = $(event.target).closest("a").attr("data-song");
                        clientWorker.postMessage(['queue', songId]);
                    });
                }
                break;

            case 'newSession':
                var code = e.data[1];
                $("#currentSession").text(`Session Code: ${code}`);
                break;

            case 'updateQueue':
                var newQueue = e.data[1];
                var queue = $("#queue");
                queue.find("tr").not(":first").remove();
                newQueue.forEach((songId) => {
                    var song = songListing[songId];
                    var songMinutes = Math.floor(song.duration / 60);
                    var songSeconds = Math.floor(song.duration % 60).toString();
                    if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
                    var songLength = songMinutes + ":" + songSeconds;
                    queue.append(`<tr data-song="${songId}"><td>${queue.find("tr").length}.</td><td><a href="#" class="queued-song">${song.title}</a></td><td>${song.artist}</td><td>${songLength}</td></tr>`);
                    queue.find(`tr:eq(${queue.find("tr").length - 1})`).find(".queued-song").click((event) => {
                        clientWorker.postMessage(['unqueue', $(event.target).closest("tr").index() - 1]);
                    });
                });
                break;

            case 'load':
                var songId = e.data[1];
                var source = encodeURIComponent(songListing[songId].file);
                howl = new Howl({
                    src: [source],
                    onload: () => {
                        clientWorker.postMessage(['ready']);
                    },
                    onend: () => {
                        clientWorker.postMessage(['end']);
                    }
                });
                break;

            case 'pause':
                var time = e.data[1];
                setTimeout(() => {
                    var toggleButton = $("#toggleButton");
                    toggleButton.html("<strong>[&#9658;]</strong> Play");
                    toggleButton.addClass("play-button");
                    toggleButton.removeClass("pause-button");
                    howl.pause();
                }, time);
                break;

            case 'resume':
                var time = e.data[1];
                var timestamp = e.data[2];
                setTimeout(() => {
                    var toggleButton = $("#toggleButton");
                    toggleButton.html("<strong>[&#10073;&#10073;]</strong> Pause");
                    toggleButton.addClass("pause-button");
                    toggleButton.removeClass("play-button");
                    howl.play();
                    howl.seek(timestamp);
                }, time);
                break;

            case 'setTime':
                var time = e.data[1];
                var timestamp = e.data[2];
                setTimeout(() => {
                    howl.seek(timestamp);
                    var songProgress = howl.seek();
                    var songMinutes = Math.floor(songProgress / 60);
                    var songSeconds = Math.floor(songProgress % 60).toString();
                    if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
                    var songLength = songMinutes + ":" + songSeconds;
                    $("#npCurrentTime").text(songLength);
                    $("#npProgressBar").css("width", `${songProgress / howl.duration()*100}%`);
                }, time);
                break;

            case 'play':
                var songId = e.data[1];
                var time = e.data[2];
                if(songId === undefined) {
                    howl.unload();
                    updateNowPlaying(undefined);
                } else {
                    setTimeout(() => {
                        howl.play();
                        updateNowPlaying(songId);
                    }, time);
                }
                break;

            case 'playAt':
                var songId = e.data[1];
                var songProgress = e.data[2];
                var paused = e.data[3];
                var timeNow = Date.now();
                var source = encodeURIComponent(songListing[songId].file);
                if(howl !== undefined) howl.stop();
                howl = new Howl({
                    src: [source],
                    onload: () => {
                        var delta = Date.now() - timeNow;
                        var skipTo = (songProgress + (paused ? 0 : delta)) / 1000;
                        howl.seek(skipTo);
                        if(paused) {
                            var toggleButton = $("#toggleButton");
                            toggleButton.html("<strong>[&#9658;]</strong> Play");
                            toggleButton.addClass("play-button");
                            toggleButton.removeClass("pause-button");
                        } else {
                            howl.play();
                        }
                        updateNowPlaying(songId);
                    },
                    onend: () => {
                        clientWorker.postMessage(['end']);
                    }
                });
                break;

            case 'abort':
                document.body.textContent = "Connection to the server has ended.";
                if(howl !== undefined) howl.stop();
                break;
        }
    };
});