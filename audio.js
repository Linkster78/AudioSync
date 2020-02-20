const CHUNK_SIZE = 1024 * 128;
const musicFolder = "D:/Google Drive/Music/HQ/";

const fs = require('fs');
const mm = require('music-metadata');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const zlib = require('zlib');
const { WaveFile } = require('wavefile');
const { Writable } = require('stream');

class BufferStream extends Writable {
    constructor() {
        super();
        this.chunks = [];
    }

    write(chunk, encoding, done) {
        this.chunks.push(chunk);
    }

    getBuffer() {
        return Buffer.concat(this.chunks);
    }
}

ffmpeg.setFfmpegPath('./ffmpeg/ffmpeg.exe');

var songStore = [];
var thumbnailStore = {};
var songCache = {};

var loadSongs = function() {
    fs.readdir(musicFolder, (err, files) => {
        console.log("Loading Songs...");
        Promise.all(files.filter((file) => file.endsWith('.mp3') || file.endsWith('.wav')).map((file) => {
            return mm.parseFile(musicFolder + file)
            .then(metadata => {
                var thumbnailBuffer = metadata.native['ID3v2.3'].find((pair) => pair['id'] == 'APIC').value.data;
                var base64Thumbnail = `data:image/jpeg;base64, ${thumbnailBuffer.toString('base64')}`;
                var thumbnailMd5 = crypto.createHash('md5').update(base64Thumbnail).digest("hex");
                if(!(thumbnailMd5 in thumbnailStore)) {
                    thumbnailStore[thumbnailMd5] = base64Thumbnail;
                }
                songStore.push({
                    file: musicFolder + file,
                    sampleRate: metadata.format.sampleRate,
                    bitrate: metadata.format.bitrate,
                    channelCount: metadata.format.numberOfChannels,
                    duration: metadata.format.duration,
                    album: metadata.common.album,
                    artist: metadata.common.artist,
                    title: metadata.common.title,
                    year: metadata.common.year,
                    thumbnail: thumbnailMd5
                });
            })
            .catch(err => {
                console.error(`Error while loading "${file}": ${err.stack}`);
            });
        })).then(() => {
            console.log(`Loaded ${songStore.length} Songs.`);
        });
    });
}

var getSong = function(songId, callback) {
    if(songId in songCache) {
        callback(songCache[songId]);
    } else {
        var song = songStore[songId];
        var bufferStream = new BufferStream();
        ffmpeg(song.file)
            .toFormat('wav')
            .on('end', () => {
                var buffer = bufferStream.getBuffer();
                var wav = new WaveFile(buffer);
                songCache[songId] = wav.getSamples(false, Float32Array);
                callback(songCache[songId]);
            })
            .pipe(bufferStream);
    }
}

var getSongChunk = function(songId, offset, callback) {
    getSong(songId, (samples) => {
        var end = (samples[0].length - offset - CHUNK_SIZE / 8) <= 0;
        var size = end ? (samples[0].length - offset) * 8 : CHUNK_SIZE;
        var buffer = Buffer.alloc(size);
        for(var i = 0; i < size / 8; i++) {
            buffer.writeFloatBE(samples[0][i + offset], i * 8);
            buffer.writeFloatBE(samples[0][i + offset], i * 8 + 4);
        }
        zlib.deflate(buffer, (err, buff) => {
            if(!err) {
                callback(buff.toString('base64'), end);
            }
        });
    });
}

module.exports = {
    loadSongs: loadSongs,
    getSong: getSong,
    getSongChunk: getSongChunk,
    songStore: songStore,
    thumbnailStore: thumbnailStore
};