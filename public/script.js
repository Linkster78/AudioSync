function formatTime(time) {
    if(isNaN(time)) return '0:00';
    var minutes = Math.floor(time / 60);
    var seconds = Math.floor(time % 60).toString();
    if(seconds.length <= 1) seconds = '0' + seconds;
    return minutes + ':' + seconds;
}

window.onload = function() {
    var clientWorker, preloadQueue, audio, playState;

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
                        <div class="img-wrapper"><img v-bind:src="thumbnail || 'noimage.png'"></div>
                        <div class="metadata">
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
                                v-on:click="paused ? $emit('resume') : $emit('pause')">
                                <span>[{{paused ? '&#9658;' : '&#10073;&#10073;'}}]</span> {{paused ? 'Play' : 'Pause'}}
                            </p>
                            <p class="right">{{songLength}}</p>
                        </div>
                        <input style="pointer-events:none" type="range" min="0" v-bind:value="progress" v-bind:max="length || 0">
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
        props: ['title', 'artist', 'length', 'loaded'],
        template: `<tr>
                        <td v-bind:style="loaded ? 'color:white' : 'color:grey'">{{this.$vnode.key + 1}}.</td>
                        <td><span v-on:click="$emit('unqueue', $vnode.key)">{{title}}</span></td>
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
                        <select v-model="filter" v-on:change="$emit('change', filter)">
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

    Vue.component('volume-slider', {
        template: `<p v-on:mousedown="dragStart" v-on:mouseup="dragEnd" v-on:mouseleave="dragEnd" v-on:mousemove="drag">\< Volume {{Math.floor(volume * 100)}}% \></p>`,
        methods: {
            dragStart: function(e) {
                this.dragging = true;
                this.initialVolume = this.volume;
                var rect = e.target.getBoundingClientRect();
                var mouseX = e.clientX;
                var elementX = rect.x;
                var elementWidth = rect.width;
                this.initialX = (mouseX - elementX) / elementWidth;
            },
            dragEnd: function(e) {
                this.dragging = false;
            },
            drag: function(e) {
                if(this.dragging) {
                    var rect = e.target.getBoundingClientRect();
                    var mouseX = e.clientX;
                    var elementX = rect.x;
                    var elementWidth = rect.width;
                    this.volume = this.initialVolume + (mouseX - elementX) / elementWidth - this.initialX;
                }
            }
        },
        data: function() {
            return {
                volume: 1,
                dragging: false,
                initialVolume: 0,
                initialX: 0
            }
        },
        watch: {
            volume: function(vol) {
                if(vol < 0) this.volume = 0;
                if(vol > 1) this.volume = 1;
                this.$emit('change', this.volume);
            }
        }
    });

    var vm = new Vue({
        el: '#app',
        data: {
            songListing: [],
            thumbnails: [],
            queue: [],
            categories: [],
            nowPlaying: null,
            paused: false,
            progress: 0,
            volume: 1,
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
                clientWorker.postMessage(['queue', id]);
            },
            unqueueSong: function(index) {
                clientWorker.postMessage(['unqueue', index]);
            },
            joinSession: function(code) {
                if(code.length == 5) {
                    clientWorker.postMessage(['connect', code]);
                }
            },
            skipSong: function() {
                clientWorker.postMessage(['skip']);
            },
            resumeSong: function() {
                clientWorker.postMessage(['resume', audio.position]);
            },
            pauseSong: function() {
                clientWorker.postMessage(['pause']);
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
                }).sort();
            },
            changeVolume: function(volume) {
                this.volume = volume;
                if(audio !== undefined) audio.volume = this.volume;
            }
        }
    });

    setInterval(() => {
        if(audio !== undefined) {
            vm.progress = audio.position / 1000;
        }
    }, 500);

    preloadQueue = new createjs.LoadQueue(true);
    preloadQueue.setMaxConnections(3);
    preloadQueue.installPlugin(createjs.Sound);

    preloadQueue.on('fileload', (e) => {
        var id = e.item.id;
        vm.songListing[id].preloaded = true;
        if(playState !== undefined) {
            var delta = Date.now() - playState.timeNow;
            var skipTo = (playState.progress + (playState.paused ? 0 : delta));
            audio = createjs.Sound.play(playState.id, {
                offset: skipTo,
                volume: vm.volume
            });
            audio.on('complete', (e) => {
                clientWorker.postMessage(['end']);
            });
            audio.paused = playState.paused;
            vm.nowPlaying = playState.id;
            vm.paused = playState.paused;
            playState = undefined;
        } else {
            Vue.set(vm.songListing, id, vm.songListing[id]);
            clientWorker.postMessage(['loaded', id]);
        }
    }, this);

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
                vm.queue.forEach((id) => {
                    if(vm.songListing[id].preloaded === undefined) {
                        var source = encodeURIComponent(vm.songListing[id].file);
                        preloadQueue.loadFile({id:id, src:source});
                        vm.songListing[id].preloaded = false;
                    }
                });
                break;

            case 'pause':
                var time = e.data[1];
                setTimeout(() => {
                    vm.paused = true;
                    audio.paused = true;
                }, time);
                break;

            case 'resume':
                var time = e.data[1];
                var timestamp = e.data[2];
                setTimeout(() => {
                    vm.paused = false;
                    audio.paused = false;
                    audio.position = timestamp;
                }, time);
                break;

            case 'play':
                var songId = e.data[1];
                var time = e.data[2];
                createjs.Sound.stop();
                if(songId == null) {
                    vm.nowPlaying = null;
                } else {
                    setTimeout(() => {
                        audio = createjs.Sound.play(songId, {
                            volume: vm.volume
                        });
                        audio.on('complete', (e) => {
                            clientWorker.postMessage(['end']);
                        });
                        vm.nowPlaying = songId;
                    }, time);
                }
                break;

            case 'playAt':
                var songId = e.data[1];
                var songProgress = e.data[2];
                var paused = e.data[3];
                var source = encodeURIComponent(vm.songListing[songId].file);
                preloadQueue.loadFile({id:songId, src:source});
                vm.songListing[songId].preloaded = false;
                createjs.Sound.stop();
                playState = {
                    id: songId,
                    timeNow: Date.now(),
                    paused: paused,
                    progress: songProgress
                };
                break;

            case 'abort':
                document.body.textContent = "Connection to the server has ended.";
                createjs.Sound.stop();
                break;
        }
    };
};