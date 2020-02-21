var queue = [];
var nowPlaying;

onmessage = function(e) {
    var command = e.data[0];
    switch(command) {
        case 'queue':
            var songId = e.data[1];
            queue.push(songId);
            if(nowPlaying === undefined) {
                nextSong();
            }
            break;
        case 'ended':
            nowPlaying = undefined;
            if(queue.length > 0) {
                nextSong();
            } else {
                this.postMessage(['done']);
            }
            break;
    }
}

function nextSong() {
    nowPlaying = queue[0];
    queue.shift();
    postMessage(['play', nowPlaying]);
}