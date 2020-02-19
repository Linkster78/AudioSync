const PORT = 80;
const CHUNK_SIZE = 1024 * 128;

const fs = require('fs');
const zlib = require('zlib');
const wav = require('node-wav');

let buffer = fs.readFileSync('music/freak.wav');
let result = wav.decode(buffer);

const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);

app.use(express.static('public'));

app.ws('/audio', (ws, req) => {
    ws.send(JSON.stringify({
        packet: 0,
        sampleRate: result.sampleRate
    }));

    ws.on('message', (msg) => {
        var json = JSON.parse(msg);
        switch(json['packet']) {
            case 0:
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

app.listen(PORT, () => console.log(`Express server listening on port ${PORT}.`));