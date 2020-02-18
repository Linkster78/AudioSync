var webSocket, sampleRate, audioContext;
var audioOffset = 0;
var audioBuffers = new Array(2);

/* TODO FIX CODE, it's weird... honestly, not sure what you did here. look into auto-playing audio right after the previous buffer, find where the slight delay is from.
maybe prepare the audio source beforehand, connect it etc, so you just have to .start() when needed?*/
function playNextClip(event) {
    var audioSource = audioContext.createBufferSource();
    audioBuffers[0] = audioBuffers[1];
    audioSource.buffer = audioBuffers[0];
    audioSource.connect(audioContext.destination);
    audioSource.start();
    audioSource.onended = playNextClip;
    webSocket.send(JSON.stringify({
        packet: 0,
        offset: audioOffset
    }));
}

function useBuffer(audioBuffer) {
    if(audioBuffers[0] === undefined) {
        var audioSource = audioContext.createBufferSource();
        audioBuffers[0] = audioBuffer;
        audioSource.buffer = audioBuffers[0];
        audioSource.connect(audioContext.destination);
        audioSource.start();
        audioSource.onended = playNextClip;
        webSocket.send(JSON.stringify({
            packet: 0,
            offset: audioOffset
        }));
    } else {
        audioBuffers[1] = audioBuffer;
    }
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
                var bufferB64 = json['audio'];
                var bufferString = window.atob(bufferB64);
                var bufferLength = bufferString.length;
                var buffer = new ArrayBuffer(bufferLength);
                var view = new DataView(buffer);
                for(var i = 0; i < bufferLength; i++) {
                    view.setUint8(i, bufferString.charCodeAt(i));
                }
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