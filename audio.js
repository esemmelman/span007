const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let audioSession = null;
let audioPlayback = null;
let audioDelay = null;
let audioRun = 0;
let audioRows = [];

function stopAudioActivity() {
  audioRun++;
  clearTimeout(audioDelay);
  audioDelay = null;
  audioPlayback = null;
  window.speechSynthesis?.cancel();
  if (audioSession) {
    const session = audioSession;
    audioSession = null;
    clearTimeout(session.timer);
    clearTimeout(session.silenceTimer);
    session.recognition.abort();
  }
}

function announceAudioStatus(message) {
  document.getElementById('audio-support').textContent = message;
}

function recordAudioAnswer(row, run, next) {
  if (run !== audioRun) return;
  const recognition = new SpeechRecognitionAPI();
  const session = { recognition, transcript: '', stopping: false, startedSpeaking: false };
  audioSession = session;
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  const stop = () => {
    if (audioSession !== session || session.stopping) return;
    session.stopping = true;
    clearTimeout(session.timer);
    clearTimeout(session.silenceTimer);
    recognition.stop();
  };
  const silence = () => {
    clearTimeout(session.silenceTimer);
    if (session.startedSpeaking && !session.stopping) {
      session.silenceTimer = setTimeout(stop, 3000);
    }
  };
  recognition.onstart = () => {
    if (audioSession !== session) return;
    session.timer = setTimeout(stop, 10000);
  };
  recognition.onspeechstart = () => {
    if (audioSession !== session) return;
    session.startedSpeaking = true;
    clearTimeout(session.silenceTimer);
  };
  recognition.onspeechend = () => {
    if (audioSession === session) silence();
  };
  recognition.onresult = event => {
    if (audioSession !== session) return;
    session.transcript = Array.from(event.results).map(result => result[0].transcript).join(' ');
    session.startedSpeaking = true;
    // Interim results keep the silence deadline moving while the user speaks.
    silence();
  };
  recognition.onerror = event => {
    if (audioSession !== session) return;
    if (event.error !== 'no-speech') {
      session.failed = true;
      announceAudioStatus('Recording unavailable. Check microphone permission and speech recognition support. Press Escape to return to lessons.');
    }
  };
  recognition.onend = () => {
    if (audioSession !== session) return;
    clearTimeout(session.timer);
    clearTimeout(session.silenceTimer);
    audioSession = null;
    row.transcript = session.transcript;
    if (!session.failed && run === audioRun) next();
  };
  try {
    recognition.start();
  } catch (_) {
    audioSession = null;
    announceAudioStatus('The microphone could not start. Press Escape to return to lessons.');
  }
}

function startAudioQuiz() {
  stopAudioActivity();
  const run = audioRun;
  document.getElementById('audio-questions').replaceChildren();
  document.getElementById('audio-sentence').textContent = '';
  announceAudioStatus('Audio practice. Press Escape to return to lessons.');
  document.getElementById('audio').focus();
  if (!window.speechSynthesis || !SpeechRecognitionAPI) {
    announceAudioStatus('Audio practice requires speech playback and speech recognition support. Press Escape to return to lessons.');
    return;
  }
  const bank = Array.from(new Map(shuffled(conjugationQuestions).map(question => [question.prompt, question])).values());
  audioRows = shuffled(bank).slice(0, 10);
  let index = 0;
  const next = () => {
    if (run !== audioRun) return;
    if (index === audioRows.length) {
      announceAudioStatus('Audio practice complete. Press Escape to return to lessons.');
      return;
    }
    const row = audioRows[index++];
    document.getElementById('audio-sentence').textContent = '';
    audioDelay = setTimeout(() => {
      if (run !== audioRun) return;
      const utterance = new SpeechSynthesisUtterance(row.answer);
      utterance.lang = 'es-ES';
      utterance.rate = 0.85;
      audioPlayback = utterance;
      utterance.onend = () => {
        if (run !== audioRun || audioPlayback !== utterance) return;
        audioPlayback = null;
        document.getElementById('audio-sentence').textContent = row.answer;
        recordAudioAnswer(row, run, next);
      };
      utterance.onerror = () => {
        if (run !== audioRun) return;
        audioPlayback = null;
        announceAudioStatus('Playback failed. Press Escape to return to lessons.');
      };
      window.speechSynthesis.speak(utterance);
    }, 3000);
  };
  next();
}

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('audio-mode')) {
    showLesson('definitions');
  }
});
window.addEventListener('pagehide', stopAudioActivity);
