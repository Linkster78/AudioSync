function formatTime(time) {
    if(isNaN(time)) return '0:00';
    var minutes = Math.floor(time / 60);
    var seconds = Math.floor(time % 60).toString();
    if(seconds.length <= 1) seconds = '0' + seconds;
    return minutes + ':' + seconds;
}

window.onload = function() {
    var clientWorker;

    Vue.component('song-option', {
        props: ['title'],
        template: `<li v-on:click="$emit('queue', $vnode.key)"><span>[+]</span> {{title}}</li>`
    });

    Vue.component('song-metadata', {
        props: ['thumbnail', 'title', 'artist', 'album', 'year', 'length'],
        template: `<div>
                        <img v-bind:src="thumbnail || 'noimage.png'">
                        <div>
                            <h2><span>Title:</span> {{title || 'NA'}}</h2>
                            <h2><span>Artist:</span> {{artist || 'NA'}}</h2>
                            <h2><span>Album:</span> {{album || 'NA'}}</h2>
                            <h2><span>Release Year:</span> {{year || 'NA'}}</h2>
                            <h2><span>Song Length:</span> {{formatTime(length) || 'NA'}}</h2>
                        </div>
                    </div>`,
        methods: { formatTime }
    });

    Vue.component('song-progress', {
        props: ['progress', 'length'],
        template: `<div>
                        <p>{{songProgress}}<span>{{songLength}}</span></p>
                        <input type="range" min="0" step="0.1" v-bind:value="progress" v-bind:max="length || 0">
                    </div>`,
        computed: {
            songProgress: function() {
                return formatTime(this.progress);
            },
            songLength: function() {
                return formatTime(this.length);
            }
        }
    });

    Vue.component('queue-item', {
        props: ['title', 'artist', 'length'],
        template: `<tr>
                        <td>{{this.$vnode.key + 1}}.</td>
                        <td v-on:click="$emit('unqueue', $vnode.key)"><span>{{title}}</span></td>
                        <td>{{artist}}</td>
                        <td>{{formatTime(length)}}</td>
                    </tr>`,
        methods: { formatTime }
    });

    Vue.component('session-indicator', {
        props: ['code'],
        template: `<div>
                        <h2>Session Code: {{code}}</h2>
                        <input placeholder="Session Code" v-model="inputCode"><button v-on:click="$emit('refresh', inputCode)">Join Session</button>
                    </div>`,
        data: function() {
            return {
                inputCode: null
            }
        },
        watch: {
            code: function(newCode) {
                this.inputCode = ""; 
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
        },
        computed: {
            currentSong: function() {
                return this.songListing[this.nowPlaying] || {};
            },
            currentQueue: function() {
                return this.queue.map((id) => this.songListing[id]);
            }
        },
        methods: {
            queueSong: function(id) {
                this.queue.push(id);
            },
            unqueueSong: function(index) {
                this.queue.splice(index, 1);
            },
            joinSession: function(code) {
                if(code.length == 5) {
                    this.code = code;
                }
            }
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