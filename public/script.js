var webSocket, sampleRate, audioContext;
var audioOffset = 0;
var nextStartTime;

function useBuffer(audioBuffer) {
    var audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioContext.destination);
    var audioDelay;
    if(nextStartTime === undefined) {
        webSocket.send(JSON.stringify({
            packet: 0,
            offset: audioOffset
        }));
        audioDelay = 0;
        nextStartTime = audioContext.currentTime;
    } else {
        audioDelay = nextStartTime - audioContext.currentTime;
    }
    audioSource.start(audioContext.currentTime + audioDelay);
    audioSource.onended = (event) => {
        webSocket.send(JSON.stringify({
            packet: 0,
            offset: audioOffset
        }));
    };
    nextStartTime += audioBuffer.duration;
}

$(document).ready(() => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    webSocket = new WebSocket(`ws://${window.location.host}/audio`);

    webSocket.onmessage = (event) => {
        var json = JSON.parse(event.data);

        switch(json['packet']) {
            case 0:
                sampleRate = json['sampleRate'];
                webSocket.send(JSON.stringify({
                    packet: 0,
                    offset: 0
                }));
                break;
            case 1:
                var gzipB64 = json['audio'];
                var gzipString = window.atob(gzipB64);
                var gzipCharData = gzipString.split('').map((x) => x.charCodeAt(0));
                var gzipBinData = new Uint8Array(gzipCharData);
                var binData = pako.inflate(gzipBinData);
                var bufferLength = binData.length;
                var view = new DataView(binData.buffer);
                var audioBuffer = audioContext.createBuffer(2, bufferLength / 8, sampleRate);
                for(var channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                    var channelBuffer = audioBuffer.getChannelData(channel);
                    for(var i = 0; i < bufferLength / 8; i++) {
                        channelBuffer[i] = view.getFloat32(((i * audioBuffer.numberOfChannels) + channel) * 4);
                    }
                }
                audioOffset += bufferLength;
                useBuffer(audioBuffer);
                break;
            default:
                break;
        }
    };
});