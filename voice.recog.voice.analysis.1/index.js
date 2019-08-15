'use strict';

let defaultInputStream;
let audioContext;
let micStreamSource;
let analyzer;
let started = false;
let bufferSize = bufferSizeInput.value;
let loopMs = loopMsInput.value;
let silenceMsParam = parseInt(silenceMsInput.value);
let numPhrases = 0;
let numPhrasesIncremented = false;
let soundStartedAtTime = new Date().getTime();
let prevSoundTime = new Date().getTime();
let minSoundDelta = minSoundVolumeDeltaInput.value;

const audioInputConstraints = {
    audio: true,
    video : false,
    deviceId : 'default',
    kind : 'audioinput'
};

const adjustBufferSize = (input) => {
    bufferSize = parseInt(input.value);
    analyzer.fftSize = bufferSize;
}

const adjustAnalyzeLoopMs = (input) => {
    loopMs = parseInt(input.value);
}

const adjustSilenceMs = (input) => {
    silenceMsParam = parseInt(input.value);
}

const adjustMinSoundVolumeDelta = (input) => {
    minSoundDelta = parseInt(input.value);
    minSoundDelta = minSoundDelta > 50 ? 50 : minSoundDelta;
}

const start = () => {
    if (!started && audioContext) {
        audioContext.resume();
        started = true;
        analyze();
    }
}
const stop = () => {
    if (audioContext) {
        audioContext.suspend();
        started = false;
    }
}

const minArrayFunc = (prevVal, currVal) => {
    return prevVal > currVal? currVal : prevVal;
}
const maxArrayFunc = (prevVal, currVal) => {
    return prevVal < currVal? currVal : prevVal;
}

const analyzeBytes = (bytes) => {
    //console.log(bytes);
    const min = bytes.reduce(minArrayFunc);
    const max = bytes.reduce(maxArrayFunc)
    //console.log(min, ' ', max);
    if (min < (127-minSoundDelta) || max > (128+minSoundDelta)) {
        //console.log('speaking',min,max);
        posVolumeProgressBar.value = max - 128;
        negVolumeProgressBar.value = 127 - min;
        let soundDelta = (new Date().getTime() - soundStartedAtTime);
        soundSecondsElem.innerHTML = soundDelta;
        prevSoundTime = new Date().getTime();
        numPhrasesIncremented = false;
    } else {
        let silenceMs = (soundStartedAtTime - prevSoundTime);
        //console.log(silenceMs, silenceMsParam);
        silenceSecondsElem.innerHTML = silenceMs < 0 ? 0 : silenceMs;
        soundStartedAtTime = new Date().getTime();
        if (!numPhrasesIncremented && silenceMs > silenceMsParam) {
            numPhrases++;
            numPhrasesElem.innerHTML = numPhrases;
            numPhrasesIncremented = true;
        }
    }
}
const analyze = () => {
    if (analyzer && started) {
        setTimeout(() => {
            const bytes = new Uint8Array(analyzer.fftSize);
            analyzer.getByteTimeDomainData(bytes);
            analyzeBytes(bytes);
            analyze();
        }, loopMs);
    }
}

navigator.mediaDevices.getUserMedia(audioInputConstraints)
.then(stream=>{
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStreamSource = audioContext.createMediaStreamSource(stream);
    audioContext.suspend();
    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = bufferSize;
    micStreamSource.connect(analyzer);
    //analyzer.connect(audioContext.destination);
})
.catch(error=>{
    console.log(error);
});



//delay(3000);