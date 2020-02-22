const PORT = 8721;
const WS_PORT = 8722;
const musicFolder = "D:/Google Drive/Music/HQ/";

const express = require('express');
const WebSocket = require('ws');

const controller = require('./controller');
const audio = require('./audio');

const app = express();
var wss = new WebSocket.Server({port: WS_PORT});

audio.loadSongs(musicFolder);

controller.configureWebSocket(wss);

app.use(express.static('public'));
app.use(express.static(musicFolder));
app.listen(PORT, () => console.log(`Express server listening on port ${PORT}.`));