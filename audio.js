const fs = require('fs');
const mm = require('music-metadata');
const util = require('util');

var songStore = [];

var loadSongs = function(musicFolder) {
    fs.readdir(musicFolder, (err, files) => {
        files.forEach(file => {
            if(file.endsWith('.mp3')) {
                mm.parseFile(musicFolder + file)
                .then(metadata => {
                    songStore.push({
                        sampleRate: metadata.format.sampleRate,
                        bitrate: metadata.format.bitrate,
                        channelCount: metadata.format.numberOfChannels,
                        duration: metadata.format.duration,
                        album: metadata.common.album,
                        artist: metadata.common.artist,
                        title: metadata.common.title,
                        year: metadata.common.year,
                        thumbnail: metadata.native['ID3v2.3'].find((pair) => pair['id'] == 'APIC').value.data
                    });
                })
                .catch(err => {
                    console.error(`Error while loading "${file}"`);
                });
            }
        });
    });
}

module.exports = {
    loadSongs: loadSongs,
    songStore: songStore
};