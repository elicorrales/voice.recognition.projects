'use strict';

let conversationStarted = false;
let waitingForResponse = false;
let analyzingAudio = false;
let indexOfLastResponse = -1;

let userAnswered = false;
let userAnsweredYes = false;

const welcomeSpeakingFinished = () => {
    recordYesno = true;
    console.log('welcome speaking finished');
    waitingForResponse = true;
    analyzeConversationAudio();
}

const speakingFinished = () => {
    recordYesno = true;
    console.log('speaking finished');
    waitingForResponse = true;
    analyzeConversationAudio();
}

const speakPhrase = (phrase, callback) => {
    let whatToDoAfter = speakingFinished;
    if (callback !== undefined) { whatToDoAfter = callback};
    meSpeak.speak( phrase, { amplitude: 100, wordgap: 0, pitch: 40, speed: 158, variant: '' }, whatToDoAfter );
}

const wallaceAskForYesOrNoResponse = () => {
    console.log('Wallace asking for a Yes or No');
    if (!userAnswered) {
        setTimeout(() => {
            const timeDomainBytes = new Uint8Array(analyzer.fftSize);
            analyzer.getByteTimeDomainData(timeDomainBytes);
            analyzeYesnoAudio(timeDomainBytes);
            if (thereIsNewPredictionResults) {
                thereIsNewPredictionResults = false;
                waitingForResponse = false;
                const indexOfYesOrNo = indexOfMaxPredictionValue(yesnoPredictionResults);
                if (yesno[indexOfYesOrNo] === 'yes') {
                    console.log('User Answered Yes');
                    userAnsweredYes = true;
                    handleTheUserResponse();
                } else if (yesno[indexOfYesOrNo] === 'no') {
                    userAnsweredYes = false;
                } else {
                    console.log('User Did NOT Answer Yes');
                    userAnsweredYes = false;
                }
            }
            wallaceAskForYesOrNoResponse();
        }, loopMs);
    }
}

const startConversation = (button) => {
    if (button.innerHTML === 'Start Conversation') {
        button.innerHTML = 'Stop';
        button.className = 'btn btn-primary';
        conversationStarted = true;
        waitForStopInAnalyzingAudio();
        speakPhrase('hello I am Wallace', welcomeSpeakingFinished);
    } else {
        conversationStarted = false;
        button.innerHTML = 'Start Conversation';
        button.className = 'btn btn-default';
        recordYesno = false;
    }
}

const waitForStopInAnalyzingAudio = () => {
    if (analyzingAudio || !conversationStarted) {
        thereIsNewPredictionResults = false;
        return;
    }
    setTimeout(() => {
        console.log('Wallace is waiting for analyzing audio to stop');
        waitForStopInAnalyzingAudio();
    },200);
}

const analyzeConversationAudio = () => {
    if (waitingForResponse && conversationStarted) {
        setTimeout(() => {
            const timeDomainBytes = new Uint8Array(analyzer.fftSize);
            analyzer.getByteTimeDomainData(timeDomainBytes);
            analyzeYesnoAudio(timeDomainBytes);
            if (thereIsNewPredictionResults) {
                thereIsNewPredictionResults = false;
                waitingForResponse = false;
                indexOfLastResponse =indexOfMaxPredictionValue(yesnoPredictionResults);
                userAnswered = false;
                userAnsweredYes = false;
                speakPhrase('Did you say, ' + yesno[indexOfLastResponse], wallaceAskForYesOrNoResponse);
            }
            analyzeConversationAudio();
        }, loopMs);
    }
}