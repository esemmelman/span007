const translationSwitch = document.getElementById('translations');
const switchState = document.getElementById('switch-state');
const textSize = document.getElementById('text-size');

function setTranslations(visible) {
  translationSwitch.setAttribute('aria-checked', String(visible));
  switchState.textContent = visible ? 'On' : 'Off';
  document.querySelectorAll('.english').forEach(cell => { cell.hidden = !visible; });
}

// Preferences are optional: the app also works when browser storage is unavailable.
function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* Keep working without storage. */ }
}
try {
  setTranslations(localStorage.getItem('spanish-translations') !== 'false');
  const savedSize = localStorage.getItem('spanish-text-size');
  if (['standard', 'larger', 'largest'].includes(savedSize)) {
    textSize.value = savedSize;
    document.documentElement.dataset.textSize = savedSize;
  }
} catch (_) { /* Defaults are already visible. */ }

translationSwitch.addEventListener('click', () => {
  const visible = translationSwitch.getAttribute('aria-checked') !== 'true';
  setTranslations(visible);
  savePreference('spanish-translations', String(visible));
});
textSize.addEventListener('change', () => {
  document.documentElement.dataset.textSize = textSize.value;
  savePreference('spanish-text-size', textSize.value);
});
const vocabulary = Array.from(document.querySelectorAll('tbody tr'), row => ({
  prompt: row.querySelector('th').textContent,
  answer: row.querySelector('td').textContent,
}));
const conjugationQuestions = conjugationVerbs.flatMap(verb => conjugationPeople.map(person => {
  const sentence = conjugationSentence(verb, person);
  const withoutSubject = sentence.spanish.slice(person.spanish.length + 1);
  const answer = withoutSubject.charAt(0).toLocaleUpperCase('es') + withoutSubject.slice(1);
  return { prompt: sentence.english, answer };
}));
let quizType = 'quiz';
let questionBank = vocabulary;
const quizWord = document.getElementById('quiz-word');
const answers = document.getElementById('quiz-answers');
const feedback = document.getElementById('quiz-feedback');
const answerAnnouncement = document.getElementById('quiz-answer-announcement');
const restart = document.getElementById('quiz-restart');
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;
let advanceTimer = null;

function cancelAdvance() {
  clearTimeout(advanceTimer);
  advanceTimer = null;
}
let quizPassed = false;
try { quizPassed = localStorage.getItem('spanish-quiz-passed') === 'true'; } catch (_) { /* Use session progress. */ }

function updateLessonLocks() {
  document.querySelectorAll('#quiz-link ~ .lesson').forEach(link => {
    link.disabled = !quizPassed;
    link.setAttribute('aria-disabled', String(!quizPassed));
    if (!quizPassed) link.setAttribute('title', 'Get 100% on 2. Quiz to unlock this lesson.');
    else link.removeAttribute('title');
  });
}
updateLessonLocks();

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function showQuestion() {
  cancelAdvance();
  answered = false;
  feedback.textContent = '';
  answerAnnouncement.textContent = '';
  restart.hidden = true;
  document.getElementById('quiz-question').hidden = false;
  document.getElementById('quiz-progress').textContent = `Question ${questionIndex + 1} of ${questions.length} · Score: ${score}`;
  const question = questions[questionIndex];
  quizWord.lang = quizType === 'quiz' ? 'es' : 'en';
  quizWord.textContent = question.prompt.charAt(0).toLocaleUpperCase(quizWord.lang) + question.prompt.slice(1);
  // Exclude alternate valid translations of the same English sentence.
  const distractors = Array.from(new Map(
    shuffled(questionBank.filter(word => word.prompt !== question.prompt && word.answer !== question.answer))
      .map(word => [word.answer, word])
  ).values()).slice(0, 3);
  answers.replaceChildren();
  shuffled([question, ...distractors]).forEach(choice => {
    const button = document.createElement('button');
    button.className = 'quiz-answer';
    button.textContent = choice.answer;
    button.lang = quizType === 'quiz' ? 'en' : 'es';
    button.addEventListener('click', () => {
      if (answered) {
        if (advanceTimer === null && choice.answer === question.answer) advanceQuestion();
        return;
      }
      answered = true;
      const correct = choice.answer === question.answer;
      if (correct) score++;
      // Keep the selected answer focused and readable, but prevent repeat grading.
      for (const option of answers.children) {
        option.setAttribute('aria-disabled', String(correct || option.textContent !== question.answer));
        if (option.textContent === question.answer) {
          option.classList.add('correct');
          if (!correct) option.classList.add('correction');
        }
      }
      if (!correct) button.classList.add('incorrect');
      answerAnnouncement.textContent = `Answer: ${question.answer}${question.answer.endsWith('.') ? '' : '.'}${correct ? '' : ' Select this answer to continue.'}`;
      document.getElementById('quiz-progress').textContent = `Question ${questionIndex + 1} of ${questions.length} · Score: ${score}`;
      if (correct) advanceTimer = setTimeout(advanceQuestion, 2000);
    });
    answers.append(button);
  });
  // Start every question at the top, including after a long reference lesson.
  quizWord.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function startQuiz() {
  cancelAdvance();
  const previousOrder = questions.map(word => word.prompt).join(',');
  // Choose one Spanish variant per English prompt to avoid repeated questions.
  questionBank = quizType === 'quiz' ? vocabulary : Array.from(
    new Map(shuffled(conjugationQuestions).map(question => [question.prompt, question])).values()
  );
  questions = shuffled(questionBank).slice(0, quizType === 'quiz' ? 10 : 20);
  if (questions.length > 1 && questions.map(word => word.prompt).join(',') === previousOrder) {
    questions.push(questions.shift());
  }
  questionIndex = 0;
  score = 0;
  showQuestion();
}

function showLesson(lesson) {
  if (['rules', 'conjugations', 'conjugation-quiz'].includes(lesson) && !quizPassed) return;
  cancelAdvance();
  const isQuiz = lesson === 'quiz' || lesson === 'conjugation-quiz';
  for (const name of ['definitions', 'quiz', 'rules', 'conjugations']) {
    const active = name === 'quiz' ? isQuiz : name === lesson;
    document.getElementById(name).hidden = !active;
  }
  for (const name of ['definitions', 'quiz', 'rules', 'conjugations', 'conjugation-quiz']) {
    const active = name === lesson;
    const link = document.getElementById(`${name}-link`);
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('.controls').hidden = isQuiz;
  document.querySelector('.translation-control').hidden = lesson !== 'definitions';
  document.querySelector('main > header').hidden = isQuiz;
  document.getElementById('main-content').classList.toggle('quiz-view', isQuiz);
  document.title = `Spanish Practice · ${{ definitions: 'Definitions', quiz: '2. Quiz', rules: 'The Rules', conjugations: 'Conjugations', 'conjugation-quiz': '5. Quiz' }[lesson]}`;
  if (isQuiz) {
    quizType = lesson;
    document.getElementById('quiz').setAttribute('aria-label', lesson === 'quiz' ? '2. Quiz: Definitions' : '5. Quiz: Conjugations');
    startQuiz();
  }
  else if (lesson === 'rules') document.getElementById('rules-title').focus();
  else if (lesson === 'conjugations') document.getElementById('conjugations').focus();
  else document.getElementById('main-content').focus();
}

function advanceQuestion() {
  advanceTimer = null;
  if (!answered) return;
  questionIndex++;
  if (questionIndex < questions.length) showQuestion();
  else {
    document.getElementById('quiz-question').hidden = true;
    document.getElementById('quiz-progress').textContent = 'Quiz complete';
    feedback.textContent = `Final grade: ${score} out of ${questions.length} (${Math.round(score / questions.length * 100)}%).`;
    if (score === questions.length) {
      if (quizType === 'quiz') {
        quizPassed = true;
        savePreference('spanish-quiz-passed', 'true');
        updateLessonLocks();
      }
      feedback.textContent += ' Perfect score!';
      restart.textContent = 'Practice again';
    } else {
      feedback.textContent += ' Get 100% to complete this quiz. Try again with a reshuffled quiz.';
      restart.textContent = 'Try again';
    }
    answerAnnouncement.textContent = '';
    restart.hidden = false;
    restart.focus();
  }
}
restart.addEventListener('click', startQuiz);
document.getElementById('definitions-link').addEventListener('click', () => showLesson('definitions'));
document.getElementById('quiz-link').addEventListener('click', () => showLesson('quiz'));
document.getElementById('rules-link').addEventListener('click', () => showLesson('rules'));
document.getElementById('conjugations-link').addEventListener('click', () => showLesson('conjugations'));
document.getElementById('conjugation-quiz-link').addEventListener('click', () => showLesson('conjugation-quiz'));

// Measure sticky elements so enlarged text and mobile navigation do not overlap.
if (typeof ResizeObserver !== 'undefined') {
  const stickyObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const property = entry.target.id === 'quiz-progress' ? '--quiz-progress-height' : '--sidebar-height';
      document.documentElement.style.setProperty(property, `${entry.target.getBoundingClientRect().height}px`);
    }
  });
  stickyObserver.observe(document.querySelector('.sidebar'));
  stickyObserver.observe(document.getElementById('quiz-progress'));
}
