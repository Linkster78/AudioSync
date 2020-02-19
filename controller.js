var configureWebSocket = function(ws, app, audio) {
    app.ws('/ws', (ws, req) => {
        ws.on('message', (msg) => {
            var json = JSON.parse(msg);
            switch(json['packet']) {

                //Song Listing Request
                case 0:
                    var songListing = [...audio.songStore];
                    for(var i = 0; i < songListing.length; i++) {
                        songListing[i].thumbnail = undefined;
                    }
                    ws.send(JSON.stringify({
                        packet: 0,
                        listing: songListing
                    }));
                    break;

                //Song Chunk Request
                case 1:
                    var offset = json['offset'];
                    var buffer = Buffer.alloc(CHUNK_SIZE);
                    for(var i = 0; i < CHUNK_SIZE / 8; i++) {
                        buffer.writeFloatBE(result.channelData[0][i + offset / 8], i * 8);
                        buffer.writeFloatBE(result.channelData[1][i + offset / 8], i * 8 + 4);
                    }
                    zlib.deflate(buffer, (err, buff) => {
                        if(!err) {
                            ws.send(JSON.stringify({
                                packet: 1,
                                audio: buff.toString('base64')
                            }));
                        }
                    });
                    break;

                default:
                    break;
            }
        });
    });
}

module.exports = {
    configureWebSocket: configureWebSocket
};