const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let audioRows = [];
let audioSession = null;
let audioPlayback = null;

// Voice metadata has no gender field; prefer familiar female English voice names.
let playbackVoices = [];
function refreshPlaybackVoices() {
  playbackVoices = window.speechSynthesis?.getVoices?.() || [];
}
refreshPlaybackVoices();
window.speechSynthesis?.addEventListener?.('voiceschanged', refreshPlaybackVoices);

function preferredEnglishVoice() {
  refreshPlaybackVoices();
  const english = playbackVoices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang));
  const female = english.filter(voice => /\b(female|zira|aria|jenny|samantha|susan|victoria|karen|moira|tessa|serena|sonia|hazel)\b/i.test(voice.name));
  return female.find(voice => /^en[-_]US$/i.test(voice.lang)) || female[0]
    || english.find(voice => voice.default) || english[0] || null;
}

function normalizeSpokenAnswer(text) {
  return text.toLocaleLowerCase('es').normalize('NFC')
    .replace(/[áéíóúü]/g, letter => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' }[letter]))
    .replace(/[^a-zñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function audioAnswerMatches(prompt, transcript) {
  const heard = normalizeSpokenAnswer(transcript);
  return conjugationVerbs.some(verb => conjugationPeople.some(person =>
    conjugationSentence(verb, person).english === prompt &&
    normalizeSpokenAnswer(`${person.pronoun} ${verb.forms[person.form]}`) === heard
  ));
}

function updateAudioControls() {
  audioRows.forEach(row => {
    const active = audioSession?.row === row;
    row.play.disabled = !window.speechSynthesis || !!audioSession;
    const playing = audioPlayback?.row === row;
    row.play.textContent = playing ? 'Stop audio' : 'Play';
    row.play.setAttribute('aria-pressed', String(playing));
    row.play.setAttribute('aria-label', `${playing ? 'Stop audio for' : 'Play'} sentence ${row.number}`);
    row.record.disabled = row.correct === true || !SpeechRecognitionAPI || (!!audioSession && (!active || audioSession.stopping));
    row.record.textContent = active ? (audioSession.stopping ? 'Checking…' : 'Stop recording') : row.correct === true ? 'Complete' : 'Record';
    row.record.setAttribute('aria-pressed', String(active));
  });
}

function stopAudioPlayback() {
  audioPlayback = null;
  window.speechSynthesis?.cancel();
  updateAudioControls();
}

function playAudio(row, text, lang) {
  stopAudioPlayback();
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const playback = { row, utterance };
  audioPlayback = playback;
  utterance.lang = lang;
  utterance.rate = lang.startsWith('en') ? 0.65 : 0.85;
  if (lang.startsWith('en')) {
    const voice = preferredEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
  }
  const finish = () => {
    if (audioPlayback !== playback) return;
    audioPlayback = null;
    updateAudioControls();
  };
  utterance.onend = finish;
  utterance.onerror = event => {
    if (audioPlayback !== playback) return;
    if (!['interrupted', 'canceled'].includes(event.error)) {
      row.feedback.append(' Playback failed. Press Play to try again.');
    }
    finish();
  };
  updateAudioControls();
  window.speechSynthesis.speak(utterance);
}

function stopAudioActivity() {
  stopAudioPlayback();
  if (audioSession) {
    const session = audioSession;
    audioSession = null;
    clearTimeout(session.timer);
    session.recognition.abort();
  }
  updateAudioControls();
}

function updateAudioScore() {
  const graded = audioRows.filter(row => row.correct !== null);
  const correct = graded.filter(row => row.correct).length;
  document.getElementById('audio-score').textContent =
    `${graded.length === 10 ? 'Final grade' : 'Score'}: ${correct} / 10 (${correct * 10}%) · ${graded.length} of 10 answered`;
}

function recordAudioAnswer(row) {
  if (row.correct === true) return;
  if (audioSession) {
    if (audioSession.row !== row || audioSession.stopping) return;
    audioSession.stopping = true;
    audioSession.recognition.stop();
    updateAudioControls();
    return;
  }
  stopAudioPlayback();
  const recognition = new SpeechRecognitionAPI();
  const session = { recognition, row, transcript: '', error: '', stopping: false };
  audioSession = session;
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  row.feedback.textContent = 'Starting microphone…';
  recognition.onstart = () => {
    if (audioSession === session) row.feedback.textContent = 'Listening… Say the reflexive pronoun and verb, then press Stop recording.';
  };
  recognition.onresult = event => {
    if (audioSession !== session) return;
    session.transcript = Array.from(event.results).filter(result => result.isFinal)
      .map(result => result[0].transcript).join(' ');
  };
  recognition.onerror = event => {
    if (audioSession !== session) return;
    const messages = {
      'not-allowed': 'Microphone access was denied. Allow it in your browser settings and try again.',
      'service-not-allowed': 'Speech recognition is unavailable in this browser. Try a browser with speech recognition enabled.',
      'audio-capture': 'No microphone is available. Connect a microphone and try again.',
      network: 'Speech recognition could not connect. Check your internet connection and try again.',
      'no-speech': 'No speech was detected. Press Record to try again.'
    };
    session.error = messages[event.error] || 'Recording could not be completed. Press Record to try again.';
    finish();
  };
  const finish = () => {
    if (audioSession !== session) return;
    clearTimeout(session.timer);
    audioSession = null;
    if (session.error || !session.transcript.trim()) {
      row.feedback.textContent = session.error || 'No speech was detected. Press Record to try again.';
    } else {
      row.correct = audioAnswerMatches(row.prompt, session.transcript);
      const heard = document.createElement('strong');
      heard.className = 'audio-heard';
      heard.textContent = `Heard: “${session.transcript}”.`;
      row.feedback.replaceChildren(heard);
      row.feedback.append(row.correct ? 'Correct! 1 / 1.' : `Not quite. 0 / 1. Answer: ${row.answer}. Press Record to try again.`);
      if (!row.correct) playAudio(row, row.answer, 'es-ES');
      row.card.dataset.result = row.correct ? 'correct' : 'incorrect';
      updateAudioScore();
    }
    updateAudioControls();
  };
  recognition.onend = finish;
  updateAudioControls();
  try {
    recognition.start();
    session.timer = setTimeout(() => {
      if (audioSession !== session) return;
      session.error = 'Recording timed out. Press Record to try again.';
      finish();
      recognition.abort();
    }, 60000);
  } catch (_) {
    session.error = 'The microphone could not start. Press Record to try again.';
    finish();
  }
}

function startAudioQuiz() {
  stopAudioActivity();
  const bank = Array.from(new Map(shuffled(conjugationQuestions).map(question => [question.prompt, question])).values());
  const container = document.getElementById('audio-questions');
  container.replaceChildren();
  audioRows = shuffled(bank).slice(0, 10).map((question, index) => {
    const card = document.createElement('article');
    card.className = 'audio-question';
    const controls = document.createElement('div');
    controls.className = 'audio-buttons';
    const number = document.createElement('strong');
    number.textContent = `${index + 1}.`;
    const play = document.createElement('button');
    play.textContent = 'Play';
    play.setAttribute('aria-label', `Play sentence ${index + 1}`);
    const record = document.createElement('button');
    record.setAttribute('aria-label', `Record or stop answer ${index + 1}`);
    const feedback = document.createElement('p');
    feedback.className = 'audio-feedback';
    feedback.setAttribute('role', 'status');
    const row = { ...question, number: index + 1, answer: question.answer.replace(/ los dientes\.$/, '').replace(/\.$/, ''), card, play, record, feedback, correct: null };
    play.addEventListener('click', () => {
      if (audioSession) return;
      if (audioPlayback?.row === row) stopAudioPlayback();
      else playAudio(row, question.prompt, 'en-US');
    });
    record.addEventListener('click', () => recordAudioAnswer(row));
    controls.append(number, play, record);
    card.append(controls, feedback);
    container.append(card);
    return row;
  });
  document.getElementById('audio-support').textContent = !SpeechRecognitionAPI
    ? 'This browser does not support speech recognition. Open this lesson in a supported browser, such as Chrome, to record answers.'
    : !window.speechSynthesis ? 'Audio playback is unavailable in this browser. Please use a browser with speech playback.' : '';
  updateAudioScore();
  updateAudioControls();
  document.getElementById('audio-title').focus();
}

document.getElementById('audio-restart').addEventListener('click', startAudioQuiz);
window.addEventListener('pagehide', stopAudioActivity);
