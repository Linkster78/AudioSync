const fs = require('fs');
const mm = require('music-metadata');
const crypto = require('crypto');

var songStore = [];
var thumbnailStore = {};

var loadSongs = function(musicFolder) {
    fs.readdir(musicFolder, (err, files) => {
        files.forEach(file => {
            if(file.endsWith('.mp3')) {
                mm.parseFile(musicFolder + file)
                .then(metadata => {
                    var thumbnailBuffer = metadata.native['ID3v2.3'].find((pair) => pair['id'] == 'APIC').value.data;
                    var base64Thumbnail = `data:image/jpeg;base64, ${thumbnailBuffer.toString('base64')}`;
                    var thumbnailMd5 = crypto.createHash('md5').update(base64Thumbnail).digest("hex");
                    if(!(thumbnailMd5 in thumbnailStore)) {
                        thumbnailStore[thumbnailMd5] = base64Thumbnail;
                    }
                    songStore.push({
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
            }
        });
    });
}

module.exports = {
    loadSongs: loadSongs,
    songStore: songStore,
    thumbnailStore: thumbnailStore
};