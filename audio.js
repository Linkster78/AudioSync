const fs = require('fs');
const mm = require('music-metadata');
const crypto = require('crypto');

var songStore = [];
var thumbnailStore = {};

var loadSongs = function(musicFolder) {
    fs.readdir(musicFolder, (err, files) => {
        console.log("Loading Songs...");
        Promise.all(files.filter((file) => file.endsWith('.mp3')).map((file) => {
            return mm.parseFile(musicFolder + file)
            .then(metadata => {
                var thumbnailBuffer = metadata.native['ID3v2.3'].find((pair) => pair['id'] == 'APIC').value.data;
                var base64Thumbnail = `data:image/jpeg;base64, ${thumbnailBuffer.toString('base64')}`;
                var thumbnailMd5 = crypto.createHash('md5').update(base64Thumbnail).digest("hex");
                if(!(thumbnailMd5 in thumbnailStore)) {
                    thumbnailStore[thumbnailMd5] = base64Thumbnail;
                }
                songStore.push({
                    file: file,
                    sampleRate: metadata.format.sampleRate,
                    bitrate: metadata.format.bitrate,
                    channelCount: metadata.format.numberOfChannels,
                    duration: metadata.format.duration,
                    album: metadata.common.album,
                    artist: metadata.common.albumartist,
                    title: metadata.common.title,
                    year: metadata.common.year,
                    thumbnail: thumbnailMd5
                });
            })
            .catch(err => {
                console.error(`Error while loading "${file}": ${err.stack}`);
            });
        })).then(() => {
            var index = 0;
            songStore.sort((a, b) => a.title > b.title ? 1 : -1).forEach((song) => {
                song.id = index;
                index++;
            });
            console.log(`Loaded ${songStore.length} Songs.`);
        });
    });
}

module.exports = {
    loadSongs,
    songStore,
    thumbnailStore
};