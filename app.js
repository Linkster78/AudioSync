const PORT = 80;

const express = require('express');
const app = express();
const ws = require('express-ws')(app);

const controller = require('./controller');
const audio = require('./audio');

audio.loadSongs();

app.use(express.static('public'));
controller.configureWebSocket(ws, app, audio);
app.listen(PORT, () => console.log(`Express server listening on port ${PORT}.`));