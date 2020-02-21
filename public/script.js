var playerWorker, clientWorker;
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
    clientWorker = new Worker("client.js");

    updateNowPlaying(undefined);
    $("#songPopup").css("display", "none");
    $("#selectFilter").val("none");

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
                playerWorker.postMessage(['queue', songId]);
            });
        }
    });

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
                var player = $("#songPlayer").get(0);
                var source = $("#songPlayer source").get(0);
                source.removeAttribute('src');
                player.load();
                break;
    
            case 'updateTime':
                var player = $("#songPlayer");
                var songProgress = player.get(0).currentTime;
                var songMinutes = Math.floor(songProgress / 60);
                var songSeconds = Math.floor(songProgress % 60).toString();
                if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
                var songLength = songMinutes + ":" + songSeconds;
                $("#npCurrentTime").text(songLength);
                $("#npProgressBar").css("width", `${songProgress / player.get(0).duration*100}%`);
                break;
    
            case 'pushQueue':
                var songId = e.data[1];
                var song = songListing[songId];
                var queue = $("#queue");
                var songMinutes = Math.floor(song.duration / 60);
                var songSeconds = Math.floor(song.duration % 60).toString();
                if(songSeconds.length <= 1) songSeconds = "0" + songSeconds;
                var songLength = songMinutes + ":" + songSeconds;
                queue.append(`<tr data-song="${songId}"><td>${queue.find("tr").length}.</td><td><a href="#" class="queued-song">${song.title}</a></td><td>${song.artist}</td><td>${songLength}</td></tr>`);
                queue.find(`tr:eq(${queue.find("tr").length - 1})`).find(".queued-song").click((event) => {
                    playerWorker.postMessage(['unqueue', $(event.target).closest("tr").index() - 1]);
                });
                break;
    
            case 'popQueue':
                var song = songListing[songId];
                if(e.data.length > 1) {
                    var queuePosition = e.data[1];
                    $(`#queue tr:eq(${queuePosition + 1})`).remove();
                } else {
                    $(`#queue tr:eq(1)`).remove();
                };
                $("#queue tr").each((index) => {
                    if(index != 0) {
                        $(`#queue tr:eq(${index})`).find("td").first().text(`${index}.`);
                    }
                });
                break;
        }
    };

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
                        playerWorker.postMessage(['queue', songId]);
                    });
                }
                break;
        }
    };
});