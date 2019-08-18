'use strict';

let defaultInputStream;
let audioContext;
let micStreamSource;
let analyzer;
let appStarted = false;
let record = false;
let bufferSize = bufferSizeInput.value;
let loopMs = loopMsInput.value;
let silenceMsParam = parseInt(silenceMsInput.value);
let numPhrases = 0;
let numPhrasesIncremented = false;
let soundStartedAtTime = new Date().getTime();
let prevSoundTime = new Date().getTime();
let minSoundDelta = minSoundVolumeDeltaInput.value;
let soundDelta = 0;

let isNewPhrase = false;
let phraseStartedAtMs = 0;
let phraseEndedAtMs = 0;

const MAX_PHRASE_PARTS = 20;
let isNewPhrasePart = false;
let numPhraseParts = 0;
let phrasePartStartedAtMs = 0;
let phrasePartEndedAtMs = 0;

let prevVolumeArray = [];
let volumeArray = [];

const audioInputConstraints = {
    audio: true,
    video: false,
    deviceId: 'default',
    kind: 'audioinput'
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
    if (!appStarted && audioContext) {
        audioContext.resume();
        appStarted = true;
        phraseStartedAtMs = new Date().getTime();
        analyze();
    }
}
const stop = () => {
    if (audioContext) {
        appStarted = false;
    }
}

const _record = (delayStart) => {
    if (new Date().getTime() - delayStart > 250) {
        record = true;
        return;
    } else {
        setTimeout(() => {
            _record(delayStart);
        }, 10);
    }
}

const startRecording = () => {
    const recordDelayStart = new Date().getTime();
    _record(recordDelayStart);
}
const minArrayFunc = (prevVal, currVal) => {
    return prevVal > currVal ? currVal : prevVal;
}
const maxArrayFunc = (prevVal, currVal) => {
    return prevVal < currVal ? currVal : prevVal;
}

const sumArrayFunc = (prevVal, currVal) => {
    return prevVal + currVal;
}

const createPhrasepartsMsHTML = () => {
    let html = '';
    for (let i = 0; i < MAX_PHRASE_PARTS; i++) {
        html += 'Phrase Part ' + i + ' Ms: <span id="phrasePart' + i + 'MsElem">0</span><br/>';
    }
    phrasePartsMsListElem.innerHTML = html;
}

const buildSingleVolumeLevelIndicator = (volume) => {
    let html = '';
    for (let i = 0; i < volume - 128; i++) {
        html += '#';
    }
    return html;
}
const showVolumeArrayVisually = (volArr) => {
    volArr.forEach(v => {
        console.log(buildSingleVolumeLevelIndicator(v));
    });
}

const analyzeFrequencyBytes = (bytes) => {
    console.log(bytes.length);
    const block = bytes.length / 8;
    console.log(bytes.subarray(0, block).reduce(sumArrayFunc));
    console.log(bytes.subarray(block, block * 2).reduce(sumArrayFunc));
    console.log(bytes.subarray(block * 2, block * 3).reduce(sumArrayFunc));
    console.log(bytes.subarray(block * 3, block * 4).reduce(sumArrayFunc));
    console.log(bytes.subarray(block * 4, block * 5).reduce(sumArrayFunc));
    console.log(bytes.subarray(block * 5, block * 6).reduce(sumArrayFunc));
    console.log(bytes.subarray(block * 6, block * 7).reduce(sumArrayFunc));
    console.log(bytes.subarray(block * 7, block * 8).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*8,block*9).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*9,block*10).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*10,block*11).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*11,block*12).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*12,block*13).reduce(sumArrayFunc));
    //const sum = bytes.reduce(sumArrayFunc)
    //console.log(sum);
}

const analyzeTimeDomainBytes = (bytes, frequencies) => {
    //console.log(bytes);
    const min = bytes.reduce(minArrayFunc);
    const max = bytes.reduce(maxArrayFunc)
    //console.log(min, ' ', max);
    if (min < (127 - minSoundDelta) || max > (128 + minSoundDelta)) {
        //console.log('speaking',min,max);
        posVolumeProgressBar.value = max - 128;
        //negVolumeProgressBar.value = 127 - min;
        //const prevSoundDelta = soundDelta;
        soundDelta = (new Date().getTime() - soundStartedAtTime);
        soundMsElem.innerHTML = soundDelta;
        prevSoundTime = new Date().getTime();
        numPhrasesIncremented = false;
        if (!isNewPhrase) {
            createPhrasepartsMsHTML();
            isNewPhrase = true;
            phraseStartedAtMs = new Date().getTime();
        }
        if (!isNewPhrasePart) {
            if (numPhraseParts < MAX_PHRASE_PARTS + 1) {
                isNewPhrasePart = true;
                console.log('========================');
                //analyzeFrequencyBytes(frequencies);
                numPhraseParts++;
            }
        }
        volumeArray.push(max);
    } else {
        if (numPhraseParts > 0 && numPhraseParts <= MAX_PHRASE_PARTS) {
            document.getElementById('phrasePart' + (numPhraseParts - 1) + 'MsElem').innerHTML = soundDelta;
        }
        isNewPhrasePart = false;
        let silenceMs = (soundStartedAtTime - prevSoundTime);
        //console.log(silenceMs, silenceMsParam);
        silenceMsElem.innerHTML = silenceMs < 0 ? 0 : silenceMs;
        soundStartedAtTime = new Date().getTime();
        //end of a phrase
        if (!numPhrasesIncremented && silenceMs > silenceMsParam) {
            console.log('###########################################');
            numPhrases++;
            numPhrasesElem.innerHTML = numPhrases;
            phraseEndedAtMs = new Date().getTime();
            numPhrasesIncremented = true;
            phraseTotalMsElem.innerHTML = phraseEndedAtMs - phraseStartedAtMs;
            isNewPhrase = false;
            numPhrasePartsElem.innerHTML = numPhraseParts;
            numPhraseParts = 0;
            isNewPhrasePart = false;
            posVolumeProgressBar.value = 0;
            //negVolumeProgressBar.value = 0;
            console.log('VolArr:', volumeArray.length);
            showVolumeArrayVisually(volumeArray);
            prevVolumeArray = volumeArray.slice();
            volumeArray = [];
            record = false;
        }
    }
}

const analyze = () => {
    setTimeout(() => {
        if (analyzer && appStarted && record) {
            console.log('recording...');
            const timeDomainBytes = new Uint8Array(analyzer.fftSize);
            analyzer.getByteTimeDomainData(timeDomainBytes);
            const frequencyBytes = new Uint8Array(analyzer.frequencyBinCount);
            analyzer.getByteFrequencyData(frequencyBytes);
            analyzeTimeDomainBytes(timeDomainBytes, frequencyBytes);
        }
        analyze();
    }, loopMs);
}


navigator.mediaDevices.getUserMedia(audioInputConstraints)
    .then(stream => {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        micStreamSource = audioContext.createMediaStreamSource(stream);
        audioContext.suspend();
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = bufferSize;
        micStreamSource.connect(analyzer);
        //analyzer.connect(audioContext.destination);
    })
    .catch(error => {
        console.log(error);
    });

createPhrasepartsMsHTML();