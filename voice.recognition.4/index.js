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

const MAX_PHRASE_PARTS_ARRAY = 15;
let isNewPhrasePart = false;
let numPhraseParts = 0;
let phrasePartStartedAtMs = 0;
let phrasePartEndedAtMs = 0;

const MAX_VOLUME_ARRAY = 350;
let currVolumeArrayIndex = 0;

const MAX_FREQ_ARRAY = MAX_PHRASE_PARTS_ARRAY * 8;

// features arrays to submit to neural network
let phraseTotalMs = 0;
let phrasePartsArray = new Array(MAX_PHRASE_PARTS_ARRAY).fill(0);
let posVolumeArray = new Array(MAX_VOLUME_ARRAY).fill(0);
let negVolumeArray = new Array(MAX_VOLUME_ARRAY).fill(0);
let frequencyInfoArray = new Array(MAX_FREQ_ARRAY).fill(0);

let currNeuralNetworkInputs = [];
let trainingData = [];
const MAX_PHRASE_TOTAL_MS_FEATURE = 1;
const MAX_NEURAL_NETWORK_INPUT_FEATURES = MAX_PHRASE_TOTAL_MS_FEATURE
                                        + MAX_PHRASE_PARTS_ARRAY
                                        + MAX_VOLUME_ARRAY
                                        + MAX_VOLUME_ARRAY
                                        + MAX_FREQ_ARRAY;

const commands = [
    'yes', 'no', 'left', 'right', 'forward', 'back', 'stop', 'wallace', '600 lbs', 'commercial'
    //'this is a test', 'testing 1 2 3', 'for the next 60 seconds', 'hello wallace',
]

const disableAllButtons = () => {
    startBtn.disabled = true;
    recordBtn.disabled = true;
    startStopPredictionBtn.disabled = true;
    commands.forEach((c,i) => {
        document.getElementById(i).disabled = true;
    });
}
const enableAllButtons = () => {
    startBtn.disabled = false;
    recordBtn.disabled = false;
    startStopPredictionBtn.disabled = false;
    commandsListElem.style.display = 'block';
    commands.forEach((c,i) => {
        document.getElementById(i).disabled = false;
        document.getElementById(i).className = 'btn btn-default';
    });
}


const createCommandsHTML = () => {
    let html = '';
    commands.forEach((command, i) => {
        html += '<button id="' + i + '"class="btn btn-default" onclick="trainNeuralNetwork(this)">' + command + '</button>';
    });
    commandsListElem.innerHTML = html;
}

const shuffle = (array) => {
	var currentIndex = array.length;
	var temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

const createFeaturesInputArray = () => {
    const featuresInputArray = new Array(MAX_NEURAL_NETWORK_INPUT_FEATURES).fill(0);
    featuresInputArray[0] = phraseTotalMs; // /2000 is to normalize
    phrasePartsArray.forEach((part,i) => { if (part > 0) featuresInputArray[i+1] = part; })
    posVolumeArray.forEach((volume,i) => { if (volume > 128) featuresInputArray[i+1+MAX_PHRASE_PARTS_ARRAY] = volume; })
    negVolumeArray.forEach((volume,i) => { if (volume < 127) featuresInputArray[i+1+MAX_PHRASE_PARTS_ARRAY] = volume; })
    //console.log(featuresInputArray);
    return featuresInputArray;
}

const indexOfMaxPredictionValue = (prediction) => {
    let max = 0;
    let index = 0;
    for (let i=0; i<prediction.length; i++) {
        if (max < prediction[i]) { index = i; max = prediction[i]; }
    }
    return index;
}
const createPredictionHTML = (prediction) => {
    let html = '';
    const indexOfMaxPrediction = indexOfMaxPredictionValue(prediction);
    commands.forEach((command, i) => {
        if (indexOfMaxPrediction === i) {
            html += '*<strong>' + command + ' : ' + prediction[i] + '</strong><br/>';
        } else {
            html += '&nbsp;' + command + ' : ' + prediction[i] + '<br/>';
        }
    });
    predictionElem.innerHTML = html;
}

const trainNeuralNetwork = (button) => {
    if (currNeuralNetworkInputs.length === 0) return;
    button.className = 'btn btn-primary';
    const targets = [];
    commands.forEach((command, i) => {
        if (parseInt(button.id) === i) {
            targets[i] = 1;
        } else {
            targets[i] = 0;
        }
    });
    const inputs = currNeuralNetworkInputs.slice();
    trainingData.push({inputs, targets});
    //console.log(trainingData);

   trainUntilPredict();
}
let numTrainingTries = 0;
const _trainUntilPredict = () => {
    //either we reached the goal, or we are NOT able to..
    //if (percentCorrect > .90 || prevPercentCorrect === percentCorrect) return;
    setTimeout(()=> {
        const numData = trainingData.length;
        let numCorrectPredictions = 0;
        trainingData.forEach(data => {
            const prediction = neuralNetwork.predict(data.inputs);
            const indexOfMaxPrediction = indexOfMaxPredictionValue(prediction);
            if (data.targets[indexOfMaxPrediction] === 1) {
                numCorrectPredictions++;
            }
        });
        let percentCorrect = numCorrectPredictions/numData;
        percentCorrectElem.innerHTML = 'training...' + percentCorrect;
        if (percentCorrect > .90 || numTrainingTries > 50) {
            percentCorrectElem.innerHTML = 'DONE ' + percentCorrect;
            enableAllButtons();
            return;
        } else {
            numTrainingTries++;
            trainingData = shuffle(trainingData);
            trainingData.forEach(data => {
                neuralNetwork.train(data.inputs,data.targets);
            });
        }
        _trainUntilPredict();
    },1);
}
const trainUntilPredict = () => {
    if (trainingData.length < 1) return;
    numTrainingTries = 0;
    disableAllButtons();
    _trainUntilPredict();
}

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

const initialize = () => {
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
    if (!appStarted) return;
    disableAllButtons();
    const recordDelayStart = new Date().getTime();
    _record(recordDelayStart);
}

let isContinuousPrediction = false;
const continuousPrediction = () => {
    if (!isContinuousPrediction) return;
    setTimeout(()=> {
        if (!record) record = true;
        continuousPrediction();
    }, 2);
}

const startStopPrediction = (button) => {
    const label = button.innerHTML;
    if (label == 'Predict') {
        button.innerHTML = 'Stop';
        button.className = 'btn btn-primary';
        isContinuousPrediction = true;
        continuousPrediction();
    } else {
        button.innerHTML = 'Predict';
        button.className = 'btn btn-default';
        isContinuousPrediction = false;
    }
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
    for (let i = 0; i < MAX_PHRASE_PARTS_ARRAY; i++) {
        html += 'Phrase Part ' 
                + i 
                + ' Ms: <span id="phrasePart' + i + 'MsElem">0</span>'
                + ' <span id="normPhrasePart' + i + 'MsElem">0</span>'
                + '<br/>';
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
    const freqInfo = [];
    //console.log(bytes.length);
    const block = bytes.length / 8;
    //console.log(bytes.subarray(0, block).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(0, block).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block, block * 2).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block, block * 2).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block * 2, block * 3).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block * 2, block * 3).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block * 3, block * 4).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block * 3, block * 4).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block * 4, block * 5).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block * 4, block * 5).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block * 5, block * 6).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block * 5, block * 6).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block * 6, block * 7).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block * 6, block * 7).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block * 7, block * 8).reduce(sumArrayFunc));
    freqInfo.push(bytes.subarray(block * 7, block * 8).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*8,block*9).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*9,block*10).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*10,block*11).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*11,block*12).reduce(sumArrayFunc));
    //console.log(bytes.subarray(block*12,block*13).reduce(sumArrayFunc));
    //const sum = bytes.reduce(sumArrayFunc)
    //console.log(sum);
    return freqInfo;
}

const analyzeTimeDomainBytes = (bytes, frequencies) => {
    //console.log(bytes);
    const min = bytes.reduce(minArrayFunc);
    const max = bytes.reduce(maxArrayFunc)
    //console.log(min, ' ', max);
    if (min < (127 - minSoundDelta) || max > (128 + minSoundDelta)) {
        //console.log('speaking',min,max);
        posVolumeProgressBar.value = max - 128;
        negVolumeProgressBar.value = 127 - min;
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
            if (numPhraseParts < MAX_PHRASE_PARTS_ARRAY + 1) {
                isNewPhrasePart = true;
                numPhraseParts++;
            }
        }
        if (currVolumeArrayIndex < MAX_VOLUME_ARRAY) {
            posVolumeArray[currVolumeArrayIndex] = posVolumeProgressBar.value;
            negVolumeArray[currVolumeArrayIndex] = negVolumeProgressBar.value;
            currVolumeArrayIndex++;
        }
    } else {
        if (numPhraseParts > 0 && numPhraseParts <= MAX_PHRASE_PARTS_ARRAY) {
            document.getElementById('phrasePart' + (numPhraseParts - 1) + 'MsElem').innerHTML = soundDelta;
            document.getElementById('normPhrasePart' + (numPhraseParts - 1) + 'MsElem').innerHTML = (soundDelta/2000);
            phrasePartsArray[numPhraseParts-1] = soundDelta;
        }
        isNewPhrasePart = false;
        let silenceMs = (soundStartedAtTime - prevSoundTime);
        //console.log(silenceMs, silenceMsParam);
        silenceMsElem.innerHTML = silenceMs < 0 ? 0 : silenceMs;
        soundStartedAtTime = new Date().getTime();
        //end of a phrase
        if (!numPhrasesIncremented && silenceMs > silenceMsParam) {
            //console.log('###########################################');
            numPhrases++;
            numPhrasesElem.innerHTML = numPhrases;
            phraseEndedAtMs = new Date().getTime();
            numPhrasesIncremented = true;
            phraseTotalMs = phraseEndedAtMs - phraseStartedAtMs;
            phraseTotalMsElem.innerHTML = phraseTotalMs;
            isNewPhrase = false;
            numPhrasePartsElem.innerHTML = numPhraseParts;
            numPhraseParts = 0;
            isNewPhrasePart = false;
            posVolumeProgressBar.value = 0;
            negVolumeProgressBar.value = 0;
            //console.log('VolArr:', currVolumeArrayIndex, ' ', volumeArray.length);
            //showVolumeArrayVisually(volumeArray);
            //console.log(phrasePartsArray);
            const freqInfo = analyzeFrequencyBytes(frequencies);
            //console.log(freqInfo);
            currNeuralNetworkInputs = createFeaturesInputArray();
            const prediction = neuralNetwork.predict(currNeuralNetworkInputs);
            createPredictionHTML(prediction);
            //console.log(predictions);
            volumeArrayLenElem.innerHTML = currVolumeArrayIndex;
            record = false;
            phrasePartsArray = new Array(MAX_PHRASE_PARTS_ARRAY).fill(0);
            posVolumeArray = new Array(MAX_VOLUME_ARRAY).fill(0);
            negVolumeArray = new Array(MAX_VOLUME_ARRAY).fill(0);
            currVolumeArrayIndex = 0;
            enableAllButtons();
        }
    }
}

const analyze = () => {
    setInterval(() => {
        if (analyzer && appStarted && record) {
            const timeDomainBytes = new Uint8Array(analyzer.fftSize);
            analyzer.getByteTimeDomainData(timeDomainBytes);
            const frequencyBytes = new Uint8Array(analyzer.frequencyBinCount);
            analyzer.getByteFrequencyData(frequencyBytes);
            analyzeTimeDomainBytes(timeDomainBytes, frequencyBytes);
        }
        //analyze();
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
createCommandsHTML();

const neuralNetwork = new NeuralNetwork(MAX_NEURAL_NETWORK_INPUT_FEATURES, 200, commands.length);
