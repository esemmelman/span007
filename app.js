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
  spanish: row.querySelector('th').textContent,
  english: row.querySelector('td').textContent,
}));
const quizWord = document.getElementById('quiz-word');
const answers = document.getElementById('quiz-answers');
const feedback = document.getElementById('quiz-feedback');
const next = document.getElementById('quiz-next');
const restart = document.getElementById('quiz-restart');
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function showQuestion() {
  answered = false;
  feedback.textContent = '';
  next.hidden = true;
  restart.hidden = true;
  document.getElementById('quiz-question').hidden = false;
  document.getElementById('quiz-progress').textContent = `Question ${questionIndex + 1} of ${questions.length} · Score: ${score}`;
  const question = questions[questionIndex];
  quizWord.textContent = question.spanish;
  const distractors = shuffled(vocabulary.filter(word => word.spanish !== question.spanish)).slice(0, 3);
  answers.replaceChildren();
  shuffled([question, ...distractors]).forEach(choice => {
    const button = document.createElement('button');
    button.className = 'quiz-answer';
    button.textContent = choice.english;
    button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const correct = choice.spanish === question.spanish;
      if (correct) score++;
      // Keep the selected answer focused and readable, but prevent repeat grading.
      for (const option of answers.children) {
        option.setAttribute('aria-disabled', 'true');
        if (option.textContent === question.english) option.classList.add('correct');
      }
      if (!correct) button.classList.add('incorrect');
      feedback.textContent = correct ? 'Correct!' : `Incorrect. The correct answer is: ${question.english}.`;
      document.getElementById('quiz-progress').textContent = `Question ${questionIndex + 1} of ${questions.length} · Score: ${score}`;
      next.textContent = questionIndex === questions.length - 1 ? 'See final grade' : 'Next question';
      next.hidden = false;
    });
    answers.append(button);
  });
  quizWord.focus();
}

function startQuiz() {
  questions = shuffled(vocabulary);
  questionIndex = 0;
  score = 0;
  showQuestion();
}

function showLesson(lesson) {
  for (const name of ['definitions', 'quiz']) {
    const active = name === lesson;
    document.getElementById(name).hidden = !active;
    const link = document.getElementById(`${name}-link`);
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('.translation-control').hidden = lesson === 'quiz';
  document.title = `Spanish Practice · ${lesson === 'quiz' ? 'Quiz' : 'Definitions'}`;
  if (lesson === 'quiz') startQuiz();
  else document.getElementById('main-content').focus();
}

next.addEventListener('click', () => {
  if (!answered) return;
  questionIndex++;
  if (questionIndex < questions.length) showQuestion();
  else {
    document.getElementById('quiz-question').hidden = true;
    document.getElementById('quiz-progress').textContent = 'Quiz complete';
    feedback.textContent = `Final grade: ${score} out of ${questions.length} (${Math.round(score / questions.length * 100)}%).`;
    next.hidden = true;
    restart.hidden = false;
    restart.focus();
  }
});
restart.addEventListener('click', startQuiz);
document.getElementById('definitions-link').addEventListener('click', () => showLesson('definitions'));
document.getElementById('quiz-link').addEventListener('click', () => showLesson('quiz'));
