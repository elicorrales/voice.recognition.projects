'use strict';

let defaultInputStream;
let mediaRecorder;
let chunks = [];

const audioInputConstraints = {
    audio: true,
    video : false,
    deviceId : 'default',
    kind : 'audioinput'
};

const start = () => {
    if (mediaRecorder) {
        mediaRecorder.start();
    }
}
const stop = () => {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
}
const recordData = (event) => {
    chunks.push(event.data);
}
const playRecordedData = (event) => {
    const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus'});
    chunks = [];
    const url = window.URL.createObjectURL(blob);
    player1.src= url;
}


navigator.mediaDevices.getUserMedia(audioInputConstraints)
.then(stream=>{
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = recordData;
    mediaRecorder.onstop = playRecordedData;
})
.catch(error=>{
    console.log(error);
});


