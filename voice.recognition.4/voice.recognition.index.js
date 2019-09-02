'use strict';

const MAX_VOLUME_ARRAY = 5002; 
const NUM_HIDDEN_NODES = 1000;
const ARRAY_AVERAGING_SIZE = MAX_VOLUME_ARRAY / 61;

let userRequestedTrainingStop = false;

let yesnoPredictionResults;
let thereIsNewPredictionResults = false;

let highestNumValuesPushedIntoArray = 0;
let highestTimeMs = 0;
let lastWordSelected = '';

let trainedThroughOneEpoch = false;
let yesnoTrainingDataLoadError = false;
let yesnoTrainingDataLoaded = false;
let yesnoNeuralNetworkDataLoadError = false;
let yesnoNeuralNetworkDataLoaded = false;
let yesnoNeuralNetwork;

/*
let commandsTrainingDataLoadError = false;
let commandsTrainingDataLoaded = false;
let commandsNeuralNetworkDataLoadError = false;
let commandsNeuralNetworkDataLoaded = false;
let commandsNeuralNetwork;
*/

let defaultInputStream;
let audioContext;
let micStreamSource;
let analyzer;
let appStarted = false;
let recordYesno = false;
//let recordCommands = false;

let bufferSize = bufferSizeInput.value;
let loopMs = loopMsInput.value;
let silenceMsParam = parseInt(silenceMsInput.value);
let numPhrases = 0;
let numPhrasesIncremented = false;

let soundStartedAtTime = new Date().getTime();
let latestSoundAtTime = new Date().getTime();
let soundStarted = false;
let soundEnded = true;
let soundBytes = 0;

//let prevSoundTime = new Date().getTime();
let minSoundDelta = parseInt(minSoundVolumeDeltaInput.value);
//let soundDelta = 0;


let rawAudioArray = [];
let rawSilencePartsDuringSoundArray = [];
let rawSoundPartsDuringSoundArray = [];
let volumeArray = new Array(MAX_VOLUME_ARRAY).fill(0);
let currVolumeArrayIndex = 0;//needed because we're going to shove in both sound parts and silence parts

let currNeuralNetworkInputs = [];
let yesnoTrainingData = [];
//let commandsTrainingData = [];
const MAX_NEURAL_NETWORK_INPUT_FEATURES = MAX_VOLUME_ARRAY;

let numTrainingTries = 0;
let percentCorrectMax = 0;
let lastTimePercentCorrectMaxIncreased = 0;
const currYesnoTrainingDataIndex = {index:0};
//const currCommandsTrainingDataIndex = {index:0};
let startOfTrainingTime = new Date().getTime();
let timedAt30Percent = false;
let timedAt40Percent = false;
let timedAt50Percent = false;
let timedAt60Percent = false;

const yesno = [
    'yes', 'no',
    'hello wallace', 
    'that is all',
    'turn left', 'turn right', 'forward', 'back', 'stop',
]

/*
const commands = [
    'turn left', 'turn right', 'forward', 'back', 'stop',
]
*/

const waitForYesnoTrainingDataToLoad = () => {
    console.log('loading yesno training data....');
    if (yesnoTrainingDataLoaded) { console.log('yesno training data loaded'); return; }
    if (yesnoTrainingDataLoadError) { console.log('yesno training data load ERROR'); return; }
    setTimeout(()=>{waitForYesnoTrainingDataToLoad();},500);
}

const waitForYesnoNeuralNetworkToLoad = () => {
    console.log('loading yesno neural network....');
    if (yesnoNeuralNetworkDataLoaded ) { console.log('yesno neural network loaded'); return; }
    if (yesnoNeuralNetworkDataLoadError) { console.log('yesno neural network data load ERROR'); return; }
    setTimeout(()=>{waitForYesnoNeuralNetworkToLoad();},500);
}

/*
const waitForCommandsTrainingDataToLoad = () => {
    console.log('loading commands training data....');
    if (commandsTrainingDataLoaded) { console.log('commands training data loaded'); return; }
    if (commandsTrainingDataLoadError) { console.log('commands training data load ERROR'); return; }
    setTimeout(()=>{waitForCommandsTrainingDataToLoad();},500);
}

const waitForCommandsNeuralNetworkToLoad = () => {
    console.log('loading commands neural network....');
    if (commandsNeuralNetworkDataLoaded ) { console.log('commands neural network loaded'); return; }
    if (commandsNeuralNetworkDataLoadError) { console.log('commands neural network data load ERROR'); return; }
    setTimeout(()=>{waitForCommandsNeuralNetworkToLoad();},500);
}
*/

const loadYesnoTrainingData = () => {
    yesnoTrainingDataLoaded = false;
    fetch('yesno.training.data.json')
        .then(result => {
           return result.json();
        })
        .then(data => {
            yesnoTrainingData = JSON.parse(data);
            yesnoTrainingDataLoaded = true;
        })
        .catch(error =>{
            console.log(error);
            yesnoTrainingDataLoadError = true;
        })
        waitForYesnoTrainingDataToLoad();
}
const loadYesnoNeuralNetworkInternalData = () => {
    yesnoNeuralNetworkDataLoaded = false;
    fetch('yesno.neural.network.internal.data.json')
        .then(result => {
           return result.json();
        })
        .then(data => {
            yesnoNeuralNetwork = NeuralNetwork.deserialize(data);
            yesnoNeuralNetworkDataLoaded = true;
        })
        .catch(error =>{
            console.log(error);
            yesnoNeuralNetworkDataLoadError = true;
        })
        waitForYesnoNeuralNetworkToLoad();
}
/*
const loadCommandsTrainingData = () => {
    commandsTrainingDataLoaded = false;
    fetch('commands.training.data.json')
        .then(result => {
           return result.json();
        })
        .then(data => {
            commandsTrainingData = JSON.parse(data);
            commandsTrainingDataLoaded = true;
        })
        .catch(error =>{
            console.log(error);
            commandsTrainingDataLoadError = true;
        })
        waitForCommandsTrainingDataToLoad();
}

const loadCommandsNeuralNetworkInternalData = () => {
    commandsNeuralNetworkDataLoaded = false;
    fetch('commands.neural.network.internal.data.json')
        .then(result => {
           return result.json();
        })
        .then(data => {
            commandsNeuralNetwork = NeuralNetwork.deserialize(data);
            commandsNeuralNetworkDataLoaded = true;
        })
        .catch(error =>{
            console.log(error);
            commandsNeuralNetworkDataLoadError = true;
        })
        waitForCommandsNeuralNetworkToLoad();
}
*/

function setup() {}

const saveYesnoTrainingData = () => {
    saveJSON(JSON.stringify(yesnoTrainingData), 'yesno.training.data.json');
}
const saveYesnoNeuralNetworkInternalData = () => {
    saveJSON(yesnoNeuralNetwork.serialize(),'yesno.neural.network.internal.data.json');
}
const createNewYesnoNeuralNetwork = () => {
    yesnoNeuralNetwork = new NeuralNetwork(MAX_NEURAL_NETWORK_INPUT_FEATURES, NUM_HIDDEN_NODES, yesno.length);
}

const train = (button) => {
    if (button.innerHTML === 'Train') {
        userRequestedTrainingStop = false;
        startOfTrainingTime = new Date().getTime();
        trainUntilPredict(button.innerHTML);
        button.innerHTML = 'Stop';
        button.className = 'btn btn-primary';
    } else {
        userRequestedTrainingStop = true;
        button.innerHTML = 'Train';
        button.className = 'btn btn-default';
    }
}

const disableAllButtons = () => {
    startBtn.disabled = true;
    recordYesnoBtn.disabled = true;
    //recordCommandsBtn.disabled = true;
    startStopYesnoPredictionBtn.disabled = true;
    //startStopCommandsPredictionBtn.disabled = true;
    yesno.forEach((c,i) => {
        document.getElementById(i+'-yesno').disabled = true;
    });
    /*
    commands.forEach((c,i) => {
        document.getElementById(i+'-commands').disabled = true;
    });
    */
}
const enableAllButtons = () => {
    startBtn.disabled = false;
    recordYesnoBtn.disabled = false;
    //recordCommandsBtn.disabled = false;
    startStopYesnoPredictionBtn.disabled = false;
    //startStopCommandsPredictionBtn.disabled = false;
    yesnoListElem.style.display = 'block';
    yesno.forEach((c,i) => {
        document.getElementById(i+'-yesno').disabled = false;
        document.getElementById(i+'-yesno').className = 'btn btn-default';
    });
    //commandsListElem.style.display = 'block';
    /*
    commands.forEach((c,i) => {
        document.getElementById(i+'-commands').disabled = false;
        document.getElementById(i+'-commands').className = 'btn btn-default';
    });
    */
}


const createYesnoHTML = () => {
    let html = '';
    yesno.forEach((yn, i) => {
        html += '<button id="' + i + '-yesno" class="btn btn-default" onclick="addToYesnoTrainingData(this,'+i+')">' + yn + '</button>';
    });
    yesnoListElem.innerHTML = html;
}
/*
const createCommandsHTML = () => {
    let html = '';
    commands.forEach((command, i) => {
        html += '<button id="' + i + '-commands" class="btn btn-default" onclick="addToCommandsTrainingData(this,'+i+')">' + command + '</button>';
    });
    commandsListElem.innerHTML = html;
}
*/
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

const countNumNonZeroValuesInCurrFeaturesInputArray = (array) => {
    let numNonZeroValues = 0;
    array.forEach(a => {
        if (a > 0) numNonZeroValues++;
    });
}

const createYesnoFeaturesInputArray = () => {
    let currYesnoFeaturesInputArrayIndex = 0;
    const yesnoFeaturesInputArray = new Array(MAX_NEURAL_NETWORK_INPUT_FEATURES).fill(0);
    volumeArray.forEach(volume => {
        yesnoFeaturesInputArray[currYesnoFeaturesInputArrayIndex] = volume;
        currYesnoFeaturesInputArrayIndex++;
    })
    currNeuralNetworkInputs = yesnoFeaturesInputArray;
}


const indexOfMaxPredictionValue = (prediction) => {
    let max = 0;
    let index = 0;
    for (let i=0; i<prediction.length; i++) {
        if (max < prediction[i]) { index = i; max = prediction[i]; }
    }
    return index;
}
const createPredictionHTML = (predictionElem, prediction, labelArray) => {
    let html = '';
    const indexOfMaxPrediction = indexOfMaxPredictionValue(prediction);
    labelArray.forEach((label, i) => {
        if (indexOfMaxPrediction === i) {
            html += '*<strong>' + label + ' : ' + prediction[i] + '</strong><br/>';
        } else {
            html += '&nbsp;' + label + ' : ' + prediction[i] + '<br/>';
        }
    });
    predictionElem.innerHTML = html;
}

const countNumNonZeroValuesInTrainingDataRow = () => {
    trainingData.forEach(row => {
        let numNonZeroValues = 0;
        row.inputs.forEach(value => {
            if (value > 0) numNonZeroValues++;
        })
    })
}

const addToYesnoTrainingData = (button,whichIndex) => {
    if (currNeuralNetworkInputs.length === 0) return;
    button.className = 'btn btn-primary';
    //disableAllButtons();
    const targets = [];
    yesno.forEach((yn, i) => {
        if (whichIndex === i) {
            lastWordSelected = yn;
            targets[i] = 1;
        } else {
            targets[i] = 0;
        }
    });
    const inputs = currNeuralNetworkInputs.slice();
    yesnoTrainingData.push({inputs, targets});
    const prediction = yesnoNeuralNetwork.predict(currNeuralNetworkInputs);
    createPredictionHTML(predictionYesnoElem,prediction,yesno);
    numYesnoTrainingData.innerHTML = yesnoTrainingData.length;
}

/*
const addToCommandsTrainingData = (button,whichIndex) => {
    if (currNeuralNetworkInputs.length === 0) return;
    button.className = 'btn btn-primary';
    //disableAllButtons();
    const targets = [];
    commands.forEach((yn, i) => {
        if (whichIndex === i) {
            lastWordSelected = yn;
            targets[i] = 1;
        } else {
            targets[i] = 0;
        }
    });
    const inputs = currNeuralNetworkInputs.slice();
    commandsTrainingData.push({inputs, targets});
    const prediction = commandsNeuralNetwork.predict(currNeuralNetworkInputs);
    createPredictionHTML(predictionYesnoElem,prediction,commands);
    numCommandsTrainingData.innerHTML = commandsTrainingData.length;
}
*/

const _trainUntilPredict = (trainingData,neuralNetwork, currTrainingDataIndex) => {
    //either we reached the goal, or we are NOT able to..
    //if (percentCorrect > .90 || prevPercentCorrect === percentCorrect) return;
    setTimeout(()=> {
        const numData = trainingData.length;
        let numCorrectPredictions = 0;
        trainingData.forEach(data => {
            const prediction = neuralNetwork.predict(data.inputs);
            const indexOfMaxPrediction = indexOfMaxPredictionValue(prediction);
            //createPredictionHTML(prediction);
            if (data.targets[indexOfMaxPrediction] === 1) {
                numCorrectPredictions++;
            }
        });
        let percentCorrect = numCorrectPredictions/numData;
        if (percentCorrectMax < percentCorrect) {
            percentCorrectMax = percentCorrect;
            numTrainingTries = 0;
            lastTimePercentCorrectMaxIncreased = new Date().getTime();
            console.log('percentCorrectMax: ', percentCorrectMax);
        }
        const now = new Date().getTime();
        if (percentCorrect >= 0.3 && !timedAt30Percent) {
            timedAt30Percent = true;
            console.log('=======================');
            console.log('Time To 30%: ', (now - startOfTrainingTime));
            console.log('=======================');
        }
        if (percentCorrect >= 0.4 && !timedAt40Percent) {
            timedAt40Percent = true;
            console.log('=======================');
            console.log('Time To 40%: ', (now - startOfTrainingTime));
            console.log('=======================');
        }
        if (percentCorrect >= 0.5 && !timedAt50Percent) {
            timedAt50Percent = true;
            console.log('=======================');
            console.log('Time To 50%: ', (now - startOfTrainingTime));
            console.log('=======================');
        }
        if (percentCorrect >= 0.6 && !timedAt60Percent) {
            timedAt60Percent = true;
            console.log('=======================');
            console.log('Time To 60%: ', (now - startOfTrainingTime));
            console.log('=======================');
        }
        const deltaTime = now - lastTimePercentCorrectMaxIncreased;
        if (userRequestedTrainingStop || (trainedThroughOneEpoch && (percentCorrect > .90 || numTrainingTries > 60 || deltaTime > 60000))) {
            userRequestedTrainingStop = false;
            meSpeak.speak( 'Finished', { amplitude: 100, wordgap: 0, pitch: 40, speed: 158, variant: '' });
            trainYesnoBtn.innerHTML = 'Train';
            trainYesnoBtn.className = 'btn btn-default';
            console.log('stopped training: percent:', percentCorrect, ' loops:', numTrainingTries, '  time since las improv:',deltaTime);
            numTrainingTries = 0;
            percentYesnoCorrectElem.innerHTML = 'DONE ' + percentCorrect;
            enableAllButtons();
            timedAt30Percent = false;
            timedAt40Percent = false;
            timedAt50Percent = false;
            timedAt60Percent = false;
            return;
        } else {
            numTrainingTries++;
            trainingData = shuffle(trainingData);
            percentYesnoCorrectElem.innerHTML = 'training...try ' +numTrainingTries+', percent:'+percentCorrect+', time:'+deltaTime;
            if (percentCorrect >= .9) {
                neuralNetwork.setLearningRate(0.0015);
            }
            else if (percentCorrect >= .87) {
                neuralNetwork.setLearningRate(0.002);
            }
            else if (percentCorrect >= .85) {
                neuralNetwork.setLearningRate(0.003);
            }
            else if (percentCorrect >= .83) {
                neuralNetwork.setLearningRate(0.004);
            }
            else if (percentCorrect >= .8) {
                neuralNetwork.setLearningRate(0.008);
            }
            else if (percentCorrect >= .7) {
                neuralNetwork.setLearningRate(0.0085);
            }
            else if (percentCorrect >= .6) {
                neuralNetwork.setLearningRate(0.01);
            }
            else if (percentCorrect >= .5) {
                neuralNetwork.setLearningRate(0.02);
            }
            else if (percentCorrect >= .4) {
                neuralNetwork.setLearningRate(0.04);
            }
            else if (percentCorrect >= .3) {
                neuralNetwork.setLearningRate(0.06);
            }
            else if (percentCorrect >= .2) {
                neuralNetwork.setLearningRate(0.08);
            }
            else {
                neuralNetwork.setLearningRate(0.2);
            }
            console.log('training...',numTrainingTries, 'percent:',percentCorrect, ' time:', deltaTime,' rate:',neuralNetwork.learning_rate);
            neuralNetwork.train(trainingData[currTrainingDataIndex.index].inputs, trainingData[currTrainingDataIndex.index].targets);
            if (currTrainingDataIndex.index < trainingData.length - 1) {
                currTrainingDataIndex.index++;
            } else {
                currTrainingDataIndex.index = 0;
                trainedThroughOneEpoch = true;
                trainingData = shuffle(trainingData);
                console.log('--------------------------------------');
                console.log('Trained through One Epoch (all samples)');
                console.log('--------------------------------------');
            }

        }
        _trainUntilPredict(trainingData,neuralNetwork, currTrainingDataIndex);
    },2);
}
const trainUntilPredict = (what) => {
    trainedThroughOneEpoch = false;
    if (yesnoTrainingData.length > 0 && what === 'Train') {
        currYesnoTrainingDataIndex.index = 0;
        numTrainingTries = 0;
        percentCorrectMax = 0;
        lastTimePercentCorrectMaxIncreased = new Date().getTime();
        disableAllButtons();
        trainYesnoBtn.disabled = false;
        _trainUntilPredict(yesnoTrainingData,yesnoNeuralNetwork,currYesnoTrainingDataIndex);
    }
    /*
    if (commandsTrainingData.length > 0 && what === 'Train Commands') {
        currCommandsTrainingDataIndex.index = 0;
        numTrainingTries = 0;
        percentCorrectMax = 0;
        lastTimePercentCorrectMaxIncreased = new Date().getTime();
        disableAllButtons();
        _trainUntilPredict(commandsTrainingData,commandsNeuralNetwork,currCommandsTrainingDataIndex);
    }
    */
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

const initialize = (button) => {
    if (!appStarted && audioContext) {
        audioContext.resume();
        appStarted = true;
        analyzingAudio = true;
        analyzeYesno();
    } else {
        button.disabled = true;
    }
}
const stop = () => {
    if (audioContext) {
        appStarted = false;
    }
}

const _recordYesno = (delayStart) => {
    if (new Date().getTime() - delayStart > 250) {
        recordYesno = true;
        return;
    } else {
        setTimeout(() => {
            _recordYesno(delayStart);
        }, 10);
    }
}
const startRecordingYesno = () => {
    if (!appStarted) return;
    predictionYesnoElem.innerHTML = '';
    const recordDelayStart = new Date().getTime();
    _recordYesno(recordDelayStart);
}

/*
const _recordCommands = (delayStart) => {
    if (new Date().getTime() - delayStart > 250) {
        recordCommands = true;
        return;
    } else {
        setTimeout(() => {
            _recordCommands(delayStart);
        }, 10);
    }
}
const startRecordingCommands = () => {
    if (!appStarted) return;
    predictionCommandsElem.innerHTML = '';
    const recordDelayStart = new Date().getTime();
    _recordCommands(recordDelayStart);
}
*/

let isContinuousPrediction = false;
const continuousYesnoPrediction = () => {
    if (!isContinuousPrediction) return;
    setTimeout(()=> {
        if (!recordYesno) recordYesno = true;
        continuousYesnoPrediction();
    }, 2);
}
const continuousCommandsPrediction = () => {
    if (!isContinuousPrediction) return;
    setTimeout(()=> {
        if (!recordCommands) recordCommands = true;
        continuousCommandsPrediction();
    }, 2);
}


const startStopPrediction = (button,what) => {
    const label = button.innerHTML;
    if (label == what) {
        button.innerHTML = 'Stop';
        button.className = 'btn btn-primary';
        isContinuousPrediction = true;
        if (what === 'Predict Yesno') continuousYesnoPrediction();
        if (what === 'Predict Commands') continuousCommandsPrediction();
    } else {
        button.innerHTML = what;
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

const showSingleConsoleValueVisually = (value) => {
    let horzBar = '';
    if (value >= 0) for (let i=0;i<value;i++) { horzBar += '#';}
    else horzBar = 'SILENCE';
    //console.log(horzBar);
}

const average = (array) => {
    let sum = 0;
    array.forEach((a,i) => { sum += a;})
    return sum/array.length;
}
const convertVolumeIntoAveragedVolume = (volArray) => {
    const avgArray = [];
    const horzSegLen = ARRAY_AVERAGING_SIZE;
    let numValuesPushedIntoArray = 0;
    for (let i=0; i<volArray.length; i+=horzSegLen) {
        const avg = average(volArray.slice(i,i+horzSegLen));
        avgArray[numValuesPushedIntoArray] = avg;
        numValuesPushedIntoArray++;
    }
    //console.log('numAverages: ',numValuesPushedIntoArray);
    if (highestNumValuesPushedIntoArray < numValuesPushedIntoArray) { 
        highestNumValuesPushedIntoArray = numValuesPushedIntoArray;
        predictionMaximumsElem.innerHTML = ARRAY_AVERAGING_SIZE + ', last word: ' + lastWordSelected + ', timeMs: ' + highestTimeMs + ',  numAvg: ' + highestNumValuesPushedIntoArray
     }
    return avgArray;
}
const processRawAudioArray = () => {
    //rawAudioArray.forEach(v => showSingleConsoleValueVisually(v) );
    const averagesArray = convertVolumeIntoAveragedVolume(rawAudioArray);
    //averagesArray.forEach(v => showSingleConsoleValueVisually(v) );
    const min2 = averagesArray.reduce(minArrayFunc);
    const max2 = averagesArray.reduce(maxArrayFunc);
    const gain = 255/max2;
    for (let i=0; i<averagesArray.length; i++) {
        if (i<MAX_VOLUME_ARRAY) {
            averagesArray[i] = averagesArray[i]*gain;
            //console.log(averagesArray[i],' ',gain);
            volumeArray[i] = (averagesArray[i]-min2)/(max2-min2);//normalize 0 to 1
        } else {
            console.log('exceed volume array');
            meSpeak.speak( 'Exceeded Array', { amplitude: 100, wordgap: 0, pitch: 40, speed: 158, variant: '' });
            break;
        }
    };
}

const analyzeYesnoAudio = (audioBytes) => {
    let idx = 0;
    let silenceBytesThisSample = 0;
    let soundBytesThisSample = 0;
    let prevAudioByteWasSilence = true;
    for (let abidx=0; abidx<audioBytes.length; abidx++) {
        /////////////////////////////////////////////////////////
        //SOUND
        /////////////////////////////////////////////////////////
        if (audioBytes[abidx] > 128 + minSoundDelta || audioBytes[abidx] < 127 - minSoundDelta) {
            if (soundStarted && !soundEnded && abidx>0) {
                if (!prevAudioByteWasSilence) {
                    soundBytesThisSample++;
                } else {
                    if (soundBytesThisSample > 400)
                    rawSoundPartsDuringSoundArray.push(soundBytesThisSample);
                }
            } 
            if (audioBytes[abidx] > 128) {
                rawAudioArray.push(audioBytes[abidx] - 128);
            } else {
                rawAudioArray.push(127 - audioBytes[abidx]);
            }
            if (audioBytes[abidx] > 128) {
                posVolumeProgressBar.value = audioBytes[abidx] - 128;
            } else {
                posVolumeProgressBar.value = 127 - audioBytes[abidx];
            }
            soundBytes++;
            if (!soundStarted) {
                soundStarted = true;
                soundEnded = false;
                soundStartedAtTime = new Date().getTime();
            }
            latestSoundAtTime = new Date().getTime();
            prevAudioByteWasSilence = false;
        /////////////////////////////////////////////////////////
        //SILENCE
        /////////////////////////////////////////////////////////
        } else {
            if (soundStarted && !soundEnded && abidx>0) {
                if (prevAudioByteWasSilence) {
                    silenceBytesThisSample++;
                } else {
                    if (silenceBytesThisSample > 400)
                    rawSilencePartsDuringSoundArray.push(silenceBytesThisSample);
                }
            } 
            const now = new Date().getTime();
            //SILENCE LONG ENOUGH FOR SOUND TO HAVE ENDED
            if (!soundEnded && now - latestSoundAtTime > 200) {
                soundStarted = false;
                soundEnded = true;
                let timeMs = now - soundStartedAtTime;
                //console.log('tot audio bytes: ', soundBytes, ' timeMs:', timeMs);
                if (highestTimeMs < timeMs) { highestTimeMs = timeMs; }
                soundBytes = 0;
                recordYesno = false;
                processRawAudioArray();
                createYesnoFeaturesInputArray();
                yesnoPredictionResults = yesnoNeuralNetwork.predict(currNeuralNetworkInputs);
                createPredictionHTML(predictionYesnoElem,yesnoPredictionResults, yesno);
                thereIsNewPredictionResults = true;
                volumeArray = new Array(MAX_VOLUME_ARRAY).fill(0);
                rawAudioArray = [];
                //console.log('=====================================================');
            } 
            prevAudioByteWasSilence = true;
        }
    }
}


const analyzeYesno = () => {
    setInterval(() => {
        if (conversationStarted && thereIsNewPredictionResults) {
            console.log('during conversation, got results. done lisening.');
            return;
        }
        if (analyzer && appStarted && recordYesno) {
            const timeDomainBytes = new Uint8Array(analyzer.fftSize);
            analyzer.getByteTimeDomainData(timeDomainBytes);
            analyzeYesnoAudio(timeDomainBytes);
        }
    }, loopMs);
    analyzingAudio = false;
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

createYesnoHTML();
//createCommandsHTML();

yesnoNeuralNetwork = new NeuralNetwork(MAX_NEURAL_NETWORK_INPUT_FEATURES, NUM_HIDDEN_NODES, yesno.length);
//commandsNeuralNetwork = new NeuralNetwork(MAX_NEURAL_NETWORK_INPUT_FEATURES, NUM_HIDDEN_NODES, commands.length);
