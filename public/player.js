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
            } else {
                this.postMessage(['pushQueue', songId]);
            }
            break;

        case 'unqueue':
            var queuePosition = e.data[1];
            queue.splice(queuePosition, 1);
            this.postMessage(['popQueue', queuePosition]);
            break;

        case 'skip':
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
    this.postMessage(['popQueue']);
}