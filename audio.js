const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let audioRows = [];
let audioSession = null;

function normalizeSpokenAnswer(text) {
  return text.toLocaleLowerCase('es').normalize('NFC')
    .replace(/[áéíóúü]/g, letter => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' }[letter]))
    .replace(/[^a-zñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function audioAnswerMatches(prompt, transcript) {
  const heard = normalizeSpokenAnswer(transcript);
  return conjugationVerbs.some(verb => conjugationPeople.some(person =>
    conjugationSentence(verb, person).english === prompt &&
    [verb.forms[person.form], `${person.pronoun} ${verb.forms[person.form]}`]
      .some(answer => normalizeSpokenAnswer(answer) === heard)
  ));
}

function updateAudioControls() {
  audioRows.forEach(row => {
    const active = audioSession?.row === row;
    row.play.disabled = !window.speechSynthesis || !!audioSession;
    row.record.disabled = !SpeechRecognitionAPI || (!!audioSession && (!active || audioSession.stopping));
    row.record.textContent = active ? (audioSession.stopping ? 'Checking…' : 'Stop recording') : 'Record';
    row.record.setAttribute('aria-pressed', String(active));
  });
}

function stopAudioActivity() {
  window.speechSynthesis?.cancel();
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
  if (audioSession) {
    if (audioSession.row !== row || audioSession.stopping) return;
    audioSession.stopping = true;
    audioSession.recognition.stop();
    updateAudioControls();
    return;
  }
  window.speechSynthesis?.cancel();
  const recognition = new SpeechRecognitionAPI();
  const session = { recognition, row, transcript: '', error: '', stopping: false };
  audioSession = session;
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  row.feedback.textContent = 'Starting microphone…';
  recognition.onstart = () => {
    if (audioSession === session) row.feedback.textContent = 'Listening… Say the verb, then press Stop recording.';
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
      row.feedback.textContent = `Heard: “${session.transcript}”. ${row.correct ? 'Correct! 1 / 1.' : `Not quite. 0 / 1. Answer: ${row.answer}.`} Press Record to try again.`;
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
    const row = { ...question, answer: question.answer.replace(/ los dientes\.$/, '').replace(/\.$/, ''), card, play, record, feedback, correct: null };
    play.addEventListener('click', () => {
      if (audioSession) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question.prompt);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.onerror = event => {
        if (!['interrupted', 'canceled'].includes(event.error)) feedback.textContent = 'Playback failed. Press Play to try again.';
      };
      window.speechSynthesis.speak(utterance);
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
