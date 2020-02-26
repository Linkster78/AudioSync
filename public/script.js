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
        props: ['title', 'id'],
        template: `<li v-on:click="$emit('queue', id)"><span>[+]</span> {{title}}</li>`
    });

    Vue.component('song-category', {
        props: ['value', 'songs'],
        template: `<div>
                        <li v-on:click="expanded = !expanded"><span>{{expanded ? '&#9660;' : '&#9654;'}}</span> {{value}}</li>
                        <div v-if="expanded">
                            <song-option class="song-option"
                                v-for="(song, index) in songs"
                                v-bind:title="song.title"
                                v-bind:id="song.id"
                                v-bind:key="index"
                                v-on:queue="$emit('queue', $event)">
                            </song-option>
                        </div>
                    </div>`,
        data: function() {
            return {
                expanded: false
            };
        }
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
        props: ['progress', 'length', 'paused'],
        template: `<div>
                        <div class="controls">
                            <p>{{songProgress}}</p>
                            <p class="skip-button"
                                v-on:click="$emit('skip')">
                                <span>[>>]</span> Skip
                            </p>
                            <p v-bind:class="paused ? 'play-button' : 'pause-button'"
                                v-on:click="paused ? $emit('play') : $emit('pause')">
                                <span>[{{paused ? '&#9658;' : '&#10073;&#10073;'}}]</span> {{paused ? 'Play' : 'Pause'}}
                            </p>
                            <p class="right">{{songLength}}</p>
                        </div>
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

    Vue.component('song-filter', {
        template: `<div>
                        <h2>Filter By: </h2>
                        <select v-model="filter" v-on:change="$emit('refresh', filter)">
                            <option value="none">None</option>
                            <option value="artist">Artist</option>
                            <option value="album">Album</option>
                            <option value="year">Year</option>
                        </select>
                    </div>`,
        data: function() {
            return {
                filter: 'none'
            };
        }
    });

    vm = new Vue({
        el: '#app',
        data: {
            songListing: [],
            thumbnails: [],
            queue: [],
            categories: [],
            nowPlaying: null,
            paused: false,
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
                /* QUEUE SONG */
            },
            unqueueSong: function(index) {
                this.queue.splice(index, 1);
                /* UNQUEUE SONG */
            },
            joinSession: function(code) {
                if(code.length == 5) {
                    this.code = code;
                    /* JOIN SESSION */
                }
            },
            skipSong: function() {
                /* SKIP SONG */
            },
            playSong: function() {
                this.paused = false;
                /* PLAY SONG */
            },
            pauseSong: function() {
                this.paused = true;
                /* PAUSE SONG */
            },
            changeFilter: function(newFilter) {
                if(newFilter == 'none') { 
                    this.categories = [];
                    return;
                }
                this.categories = Array.from(new Set(this.songListing.map((song) => song[newFilter]))).map((value) => {
                    return {
                        value: value,
                        songs: this.songListing.filter((song) => song[newFilter] == value)
                    };
                });
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
                console.log(vm.songListing);
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