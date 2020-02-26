function formatTime(time) {
    var minutes = Math.floor(time / 60);
    var seconds = Math.floor(time % 60).toString();
    if(seconds.length <= 1) seconds = "0" + seconds;
    return minutes + ":" + seconds;
}

window.onload = function() {
    var clientWorker;

    Vue.component('song-option', {
        props: ['title', 'queue'],
        template: `<li v-on:click="queueSong"><span>[+]</span> {{title}}</li>`,
        methods: {
            queueSong: function() {
                this.queue.push(this.$vnode.key);
            }
        }
    });

    Vue.component('song-metadata', {
        props: ['id', 'song_listing', 'thumbnails'],
        template: `<div>
                        <img v-bind:src="thumbnail">
                        <div>
                            <h2><span>Title:</span> {{title}}</h2>
                            <h2><span>Artist:</span> {{artist}}</h2>
                            <h2><span>Album:</span> {{album}}</h2>
                            <h2><span>Release Year:</span> {{year}}</h2>
                            <h2><span>Song Length:</span> {{songLength}}</h2>
                        </div>
                    </div>`,
        computed: {
            thumbnail: function() {
                return this.id == null || this.thumbnails.length == 0 || this.song_listing.length == 0 ? 'noimage.png' : this.thumbnails[this.song_listing[this.id].thumbnail];
            },
            title: function() {
                return this.id == null || this.song_listing.length == 0 ? 'NA' : this.song_listing[this.id].title;
            },
            artist: function() {
                return this.id == null || this.song_listing.length == 0 ? 'NA' : this.song_listing[this.id].artist;
            },
            album: function() {
                return this.id == null || this.song_listing.length == 0 ? 'NA' : this.song_listing[this.id].album;
            },
            year: function() {
                return this.id == null || this.song_listing.length == 0 ? 'NA' : this.song_listing[this.id].year;
            },
            songLength: function() {
                if(this.id == null || this.song_listing.length == 0) return 'NA';
                return formatTime(this.song_listing[this.id].duration);
            }
        }
    });

    Vue.component('song-progress', {
        props: ['id', 'progress', 'song_listing'],
        template: `<div>
                        <p>{{songProgress}}<span>{{songLength}}</span></p>
                        <input type="range" min="0" step="0.1" v-bind:value="progress" v-bind:max="length">
                    </div>`,
        computed: {
            length: function() {
                return this.id == null || this.song_listing.length == 0 ? 0 : this.song_listing[this.id].duration;
            },
            songLength: function() {
                return formatTime(this.length);
            },
            songProgress: function() {
                return formatTime(this.progress);
            }
        }
    });

    Vue.component('queue-item', {
        props: ['id', 'queue', 'song_listing'],
        template: `<tr>
                        <td>{{this.$vnode.key + 1}}.</td>
                        <td v-on:click="unqueue"><span>{{title}}</span></td>
                        <td>{{artist}}</td>
                        <td>{{length}}</td>
                    </tr>`,
        methods: {
            unqueue: function() {
                this.queue.splice(this.$vnode.key, 1);
            }
        },
        computed: {
            title: function() {
                return this.song_listing.length == 0 ? 'NA' : this.song_listing[this.id].title;
            },
            artist: function() {
                return this.song_listing.length == 0 ? 'NA' : this.song_listing[this.id].artist;
            },
            length: function() {
                if(this.song_listing.length == 0) return 'NA';
                return formatTime(this.song_listing[this.id].duration);
            }
        }
    });

    vm = new Vue({
        el: '#app',
        data: {
            songListing: [],
            thumbnails: [],
            queue: [],
            nowPlaying: null,
            progress: 0,
            code: null
        }
    });

    clientWorker = new Worker('client.js');

    clientWorker.onmessage = (e) => {
        var command = e.data[0];
        switch(command) {
            case 'listing':
                vm.songListing = e.data[1];
                vm.thumbnails = e.data[2];
                break;

            case 'newSession':
                vm.code = e.data[1];
                break;

            case 'updateQueue':
                vm.queue = e.data[1];
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
                    // make button play
                }, time);
                break;

            case 'resume':
                var time = e.data[1];
                var timestamp = e.data[2];
                setTimeout(() => {
                    // make button pause
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
                    var songTime = formatTime(songProgress);
                    // set displayed time
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
                        setTimeout(() => {
                            // get volume and set to howl
                            howl.volume(volume);
                        }, 25);
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
                            // set button to play
                        } else {
                            howl.play();
                        }
                        setTimeout(() => {
                            // get volume and set to howl
                            howl.volume(volume);
                        }, 25);
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
};