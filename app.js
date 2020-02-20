const PORT = 80;
const musicFolder = "D:/Google Drive/Music/HQ/";

const express = require('express');
const app = express();
const ws = require('express-ws')(app);

const controller = require('./controller');
const audio = require('./audio');

audio.loadSongs(musicFolder);

app.use(express.static('public'));
app.use(express.static(musicFolder));
controller.configureWebSocket(ws, app, audio);
app.listen(PORT, () => console.log(`Express server listening on port ${PORT}.`));