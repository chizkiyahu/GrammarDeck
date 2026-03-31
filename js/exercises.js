// ============================================================
// exercises.js — Exercise renderers & answer validators
// ============================================================

import { store } from './store.js';

/** Main entry point: render an exercise into `container`.
 *  Returns a Promise<{ correct: boolean, userAnswer: string }>
 *  that resolves when the user submits and clicks "Next". */
export function renderExercise(exercise, container, onAnswer) {
  container.innerHTML = '';
  container.dataset.exerciseId = exercise.id;

  switch (exercise.type) {
    case 'flashcard':          return renderFlashcard(exercise, container, onAnswer);
    case 'fill-blank':         return renderFillBlank(exercise, container, onAnswer);
    case 'multiple-choice':    return renderMultipleChoice(exercise, container, onAnswer);
    case 'error-correction':   return renderErrorCorrection(exercise, container, onAnswer);
    case 'sentence-transform': return renderSentenceTransform(exercise, container, onAnswer);
    default:
      container.innerHTML = `<p class="text-red-500">Unknown exercise type: ${exercise.type}</p>`;
      return Promise.resolve({ correct: false, userAnswer: '' });
  }
}

// ── Helpers ──────────────────────────────────────────────────

function typeBadge(type) {
  const map = {
    'flashcard':          ['🃏', 'Flashcard',          'bg-violet-100 text-violet-700'],
    'fill-blank':         ['✏️', 'Fill in the blank',   'bg-blue-100 text-blue-700'],
    'multiple-choice':    ['🔤', 'Multiple choice',     'bg-amber-100 text-amber-700'],
    'error-correction':   ['🔍', 'Error correction',    'bg-rose-100 text-rose-700'],
    'sentence-transform': ['🔄', 'Sentence transform',  'bg-emerald-100 text-emerald-700'],
  };
  const [icon, label, cls] = map[type] || ['❓', type, 'bg-gray-100 text-gray-700'];
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cls}">${icon} ${label}</span>`;
}

function difficultyStars(d = 1) {
  return '⭐'.repeat(d) + '☆'.repeat(Math.max(0, 3 - d));
}

function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[’‘‛`´]/g, "'")
    .replace(/([a-z])'([a-z])/g, '$1$2')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, ' ');
}

function checkAnswer(userAnswer, acceptedAnswers) {
  const ua = normalize(userAnswer);
  return acceptedAnswers.some(a => normalize(a) === ua);
}

function feedbackHtml(isCorrect, correctAnswer, explanation) {
  if (isCorrect) {
    return `
      <div class="feedback-box feedback-correct">
        <div class="flex items-center gap-2 font-bold text-emerald-700 text-lg mb-1">
          <span>✓</span><span>Correct!</span>
        </div>
        ${explanation ? `<p class="text-emerald-800 text-sm">${explanation}</p>` : ''}
      </div>`;
  }
  return `
    <div class="feedback-box feedback-incorrect">
      <div class="flex items-center gap-2 font-bold text-rose-700 text-lg mb-1">
        <span>✗</span><span>Not quite</span>
      </div>
      <p class="text-rose-800 text-sm">Correct answer: <strong>${correctAnswer}</strong></p>
      ${explanation ? `<p class="text-rose-700 text-sm mt-1">${explanation}</p>` : ''}
    </div>`;
}

function nextButton(label = 'Next →') {
  return `<button class="btn-primary w-full mt-4" id="next-btn">${label}</button>`;
}

function bindEnterToSubmit(input, submitButton, { allowShiftEnter = false } = {}) {
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if (allowShiftEnter && e.shiftKey) return;
    e.preventDefault();
    submitButton.click();
  });
}

// ── Flashcard ────────────────────────────────────────────────

function renderFlashcard(ex, container, onAnswer) {
  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <div class="flashcard-wrap">
      <div class="flashcard" id="fc-card" role="button" aria-label="Flip card" tabindex="0">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <p class="text-2xl font-semibold text-center text-gray-800 leading-relaxed">${ex.question}</p>
            <p class="tap-hint mt-8">👆 Tap to reveal answer</p>
          </div>
          <div class="flashcard-back">
            <p class="text-xl text-center text-gray-800 leading-relaxed whitespace-pre-line">${ex.answer}</p>
          </div>
        </div>
      </div>
    </div>
    <div id="fc-actions" class="hidden flex gap-3 mt-6">
      <button id="fc-wrong" class="btn-secondary flex-1">😕 Didn't know</button>
      <button id="fc-right" class="btn-success flex-1">🎉 Got it!</button>
    </div>
  `;

  const card = container.querySelector('#fc-card');
  const actions = container.querySelector('#fc-actions');
  const wrongButton = container.querySelector('#fc-wrong');
  let flipped = false;

  const flip = () => {
    if (!flipped) {
      card.classList.add('flipped');
      actions.classList.remove('hidden');
      wrongButton.focus();
      flipped = true;
    }
  };
  card.addEventListener('click', flip);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') flip(); });

  return new Promise(resolve => {
    container.querySelector('#fc-wrong').addEventListener('click', () => {
      const res = { correct: false, userAnswer: "didn't know" };
      if (onAnswer) onAnswer(res);
      resolve(res);
    });
    container.querySelector('#fc-right').addEventListener('click', () => {
      const res = { correct: true, userAnswer: 'knew it' };
      if (onAnswer) onAnswer(res);
      resolve(res);
    });
  });
}

// ── Fill-blank ───────────────────────────────────────────────

function renderFillBlank(ex, container, onAnswer) {
  const sentenceHtml = ex.sentence.replace(
    '{_}',
    `<input type="text" id="fb-input" class="fill-input" placeholder="…"
      autocomplete="off" spellcheck="false">`
  );

  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="instruction-text">${ex.instruction || 'Complete the sentence.'}</p>
    ${store.getSetting('showHints') && ex.hint ? `<div class="hint-box">💡 Verb: <strong>${ex.hint}</strong></div>` : ''}
    <p class="sentence-text mt-6">${sentenceHtml}</p>
    <button id="submit-btn" class="btn-primary w-full mt-6">Check Answer</button>
    <div id="feedback-area"></div>
  `;

  const input = container.querySelector('#fb-input');
  const submitBtn = container.querySelector('#submit-btn');
  const feedbackArea = container.querySelector('#feedback-area');

  input.focus();
  bindEnterToSubmit(input, submitBtn);

  return new Promise(resolve => {
    let answered = false;
    let result = null;

    submitBtn.addEventListener('click', () => {
      if (answered) {
        resolve(result);
        return;
      }
      if (!input.value.trim()) { input.focus(); return; }

      answered = true;
      const isCorrect = checkAnswer(input.value, ex.answers);
      result = { correct: isCorrect, userAnswer: input.value.trim() };
      if (onAnswer) onAnswer(result);

      input.disabled = true;
      input.classList.add(isCorrect ? 'input-correct' : 'input-incorrect');
      feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.answers[0], ex.explanation);
      submitBtn.textContent = 'Next →';
      submitBtn.focus();
      feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// ── Multiple Choice ──────────────────────────────────────────

function renderMultipleChoice(ex, container, onAnswer) {
  const letters = ['A', 'B', 'C', 'D'];
  const optionsHtml = ex.options.map((opt, i) => `
    <button class="mc-option" data-index="${i}" data-letter="${letters[i]}">
      <span class="mc-letter">${letters[i]}</span>
      <span>${opt}</span>
    </button>`).join('');

  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="sentence-text mt-4">${ex.sentence.replace('{_}', '<span class="blank-slot">___</span>')}</p>
    <div class="mc-grid mt-6">${optionsHtml}</div>
    <div id="feedback-area"></div>
    <div id="next-area" class="hidden">${nextButton()}</div>
  `;

  const buttons = container.querySelectorAll('.mc-option');
  const feedbackArea = container.querySelector('#feedback-area');
  const nextArea = container.querySelector('#next-area');

  return new Promise(resolve => {
    let answered = false;
    let result = null;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;

        const chosen = parseInt(btn.dataset.index);
        const isCorrect = chosen === ex.correct;
        result = { correct: isCorrect, userAnswer: ex.options[chosen] };
        if (onAnswer) onAnswer(result);

        // Style all buttons
        buttons.forEach((b, i) => {
          b.disabled = true;
          if (i === ex.correct) b.classList.add('mc-correct');
          else if (i === chosen && !isCorrect) b.classList.add('mc-incorrect');
          else b.classList.add('mc-dimmed');
        });

        feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.options[ex.correct], ex.explanation);
        nextArea.classList.remove('hidden');
        const nextBtn = nextArea.querySelector('#next-btn');
        nextBtn.focus();
        feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        nextBtn.addEventListener('click', () => resolve(result));
      });
    });
  });
}

// ── Error Correction ─────────────────────────────────────────

function renderErrorCorrection(ex, container, onAnswer) {
  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="instruction-text">Find and correct the mistake(s) in this sentence:</p>
    <div class="error-sentence-box">
      <span class="error-badge">Error</span>
      <p class="text-xl font-medium text-gray-800 mt-2">${ex.sentence}</p>
    </div>
    <textarea id="ec-input" class="correction-input mt-4" rows="2"
      placeholder="Type the corrected sentence…" spellcheck="false"></textarea>
    <button id="submit-btn" class="btn-primary w-full mt-3">Check Answer</button>
    <div id="feedback-area"></div>
  `;

  const input = container.querySelector('#ec-input');
  const submitBtn = container.querySelector('#submit-btn');
  const feedbackArea = container.querySelector('#feedback-area');

  input.focus();
  bindEnterToSubmit(input, submitBtn, { allowShiftEnter: true });

  return new Promise(resolve => {
    let answered = false;
    let result = null;

    submitBtn.addEventListener('click', () => {
      if (answered) {
        resolve(result);
        return;
      }
      if (!input.value.trim()) { input.focus(); return; }

      answered = true;
      const isCorrect = checkAnswer(input.value, ex.answers);
      result = { correct: isCorrect, userAnswer: input.value.trim() };
      if (onAnswer) onAnswer(result);

      input.disabled = true;
      input.classList.add(isCorrect ? 'input-correct' : 'input-incorrect');
      feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.answers[0], ex.explanation);
      submitBtn.textContent = 'Next →';
      submitBtn.focus();
      feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// ── Sentence Transform ───────────────────────────────────────

function renderSentenceTransform(ex, container, onAnswer) {
  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="instruction-text">${ex.instruction || 'Rewrite the sentence.'}</p>
    <div class="source-sentence-box">
      <p class="text-lg font-medium text-gray-700">${ex.sentence}</p>
    </div>
    <textarea id="st-input" class="correction-input mt-4" rows="2"
      placeholder="Write the transformed sentence…" spellcheck="false"></textarea>
    <button id="submit-btn" class="btn-primary w-full mt-3">Check Answer</button>
    <div id="feedback-area"></div>
  `;

  const input = container.querySelector('#st-input');
  const submitBtn = container.querySelector('#submit-btn');
  const feedbackArea = container.querySelector('#feedback-area');

  input.focus();
  bindEnterToSubmit(input, submitBtn, { allowShiftEnter: true });

  return new Promise(resolve => {
    let answered = false;
    let result = null;

    submitBtn.addEventListener('click', () => {
      if (answered) {
        resolve(result);
        return;
      }
      if (!input.value.trim()) { input.focus(); return; }

      answered = true;
      const isCorrect = checkAnswer(input.value, ex.answers);
      result = { correct: isCorrect, userAnswer: input.value.trim() };
      if (onAnswer) onAnswer(result);

      input.disabled = true;
      input.classList.add(isCorrect ? 'input-correct' : 'input-incorrect');
      feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.answers[0], ex.explanation);
      submitBtn.textContent = 'Next →';
      submitBtn.focus();
      feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}
