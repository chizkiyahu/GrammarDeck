// ============================================================
// app.js — Router, views, session controller
// ============================================================

import { store } from './store.js';
import { renderExercise } from './exercises.js';

// ── State ────────────────────────────────────────────────────

const state = {
  manifest: null,
  topicCache: {},        // { [topicId]: topicData }
  session: null,         // active exercise session
  sessionStart: 0,
};

const ROOT = document.getElementById('app');
const APP_NAME = 'GrammarDeck';

// ── Bootstrap ────────────────────────────────────────────────

async function init() {
  applyDarkMode();
  // Re-apply if the OS theme changes while app is open
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onColorSchemeChange = () => {
    if (store.getSetting('darkMode') === null || store.getSetting('darkMode') === undefined) {
      applyDarkMode();
    }
  };
  if (typeof colorSchemeQuery.addEventListener === 'function') {
    colorSchemeQuery.addEventListener('change', onColorSchemeChange);
  } else if (typeof colorSchemeQuery.addListener === 'function') {
    colorSchemeQuery.addListener(onColorSchemeChange);
  }
  state.manifest = await fetchJSON('content/manifest.json');
  window.addEventListener('hashchange', route);
  route();
}

// ── Router ───────────────────────────────────────────────────

function route() {
  const hash = window.location.hash.replace('#', '') || '/';
  const [, view, ...params] = hash.split('/');

  if (!view || view === '') return renderHome();
  if (view === 'topic') return renderTopic(params[0]);
  if (view === 'study') return renderStudy(params[0], params[1]);
  if (view === 'practice') return renderPractice(params[0]);
  if (view === 'stats') return renderStats();
  if (view === 'settings') return renderSettings();
  renderHome();
}

function navigate(path) {
  window.location.hash = path;
}

// ── Data helpers ─────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

async function loadTopic(id) {
  if (state.topicCache[id]) return state.topicCache[id];
  const meta = state.manifest.topics.find(t => t.id === id);
  if (!meta) throw new Error(`Topic ${id} not found`);
  const data = await fetchJSON(meta.file);
  state.topicCache[id] = data;
  return data;
}

function topicMeta(id) {
  return state.manifest?.topics.find(t => t.id === id);
}

// ── Shared UI pieces ─────────────────────────────────────────

function colorFor(color) {
  return {
    violet: { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
    rose: { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' },
    blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  }[color] || colorFor('violet');
}

function progressBar(pct, colorClass = 'bg-violet-500') {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : 0;
  return `
    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div class="${colorClass} h-2 rounded-full transition-all duration-500" style="width:${safePct}%"></div>
    </div>`;
}

function topicProgressDisplay(progress) {
  const practiced = `${progress.seen}/${progress.total} practiced`;
  const mastered = `${progress.mastered} mastered`;
  return {
    percentage: progress.seenPercentage,
    practiced,
    mastered,
  };
}

function xpLevel(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  return { level, xpInLevel, xpToNext: 100 };
}

function navBar(active = '') {
  const links = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/stats', icon: '📊', label: 'Stats' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ];
  return `
    <nav class="app-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      ${links.map(l => {
        const isActive = active === l.path;
        return `<a href="#${l.path}" class="nav-link ${isActive ? 'nav-link-active' : ''}">
          <span class="text-xl">${l.icon}</span>
          <span class="text-xs mt-0.5">${l.label}</span>
        </a>`;
      }).join('')}
    </nav>`;
}

// ── Views ─────────────────────────────────────────────────────

// Home ──────────────────────────────────────────────────────

async function renderHome() {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const stats = store.getStats();
  const { level, xpInLevel } = xpLevel(stats.totalXP);
  const streakEmoji = stats.streak.current >= 7 ? '🔥' : stats.streak.current >= 3 ? '⚡' : '📅';

  // Build topic cards (need topic data for progress)
  const topicCards = await Promise.all(state.manifest.topics.map(async meta => {
    let progress = { seen: 0, total: 0, mastered: 0, percentage: 0, seenPercentage: 0, masteredPercentage: 0 };
    try {
      const data = await loadTopic(meta.id);
      progress = store.getTopicProgress(data.exercises || []);
    } catch {}
    const c = colorFor(meta.color);
    const isStarted = progress.seen > 0;
    const isComplete = progress.mastered === progress.total && progress.total > 0;
    const display = topicProgressDisplay(progress);

    return `
      <article class="topic-card ${c.border} border-2 cursor-pointer hover:shadow-lg transition-all duration-200"
        onclick="navigate('/topic/${meta.id}')">
        <div class="flex items-start justify-between mb-3">
          <div>
            <span class="text-3xl">${meta.icon}</span>
            <div class="mt-2">
              <span class="text-xs font-medium ${c.badge} px-2 py-0.5 rounded-full">${meta.topic}</span>
            </div>
          </div>
          ${isComplete ? '<span class="text-2xl">✅</span>' : isStarted ? '<span class="text-2xl">▶️</span>' : '<span class="text-2xl">🔒</span>'}
        </div>
        <h3 class="font-bold text-gray-800 text-base leading-tight">${meta.title}</h3>
        <p class="text-gray-500 text-sm mt-1 leading-relaxed">${meta.description}</p>
        <div class="mt-4">
          ${progressBar(display.percentage, c.bg)}
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>${display.practiced}</span>
            <span>${display.percentage}%</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">${display.mastered}</p>
        </div>
      </article>`;
  }));

  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <!-- Hero header -->
      <div class="hero-header">
        <div class="max-w-xl mx-auto px-4 pt-8 pb-6">
          <h1 class="text-3xl font-extrabold text-white">${APP_NAME}</h1>
          <p class="text-violet-200 text-sm mt-1">English Grammar · Present Simple</p>
          <!-- Stats strip -->
          <div class="flex gap-4 mt-5">
            <div class="stat-chip">
              ${streakEmoji} <span>${stats.streak.current} day streak</span>
            </div>
            <div class="stat-chip">
              ⚡ <span>${stats.totalXP} XP</span>
            </div>
            <div class="stat-chip">
              🎓 <span>Level ${level}</span>
            </div>
          </div>
          <!-- XP bar -->
          <div class="mt-3">
            ${progressBar(xpInLevel, 'bg-amber-400')}
            <p class="text-violet-200 text-xs mt-1">${xpInLevel}/100 XP to Level ${level + 1}</p>
          </div>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-6">
        <h2 class="text-lg font-bold text-gray-700 mb-4">📚 Topics</h2>
        <div class="grid gap-4">
          ${topicCards.join('')}
        </div>

        <div class="mt-8 text-center">
          <p class="text-xs text-gray-400">
            ${stats.questionsAttempted} questions attempted · ${stats.accuracy}% accuracy
          </p>
        </div>
      </div>
    </div>
    ${navBar('/')}
  `;
}

// Topic detail ──────────────────────────────────────────────

async function renderTopic(id) {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const meta = topicMeta(id);
  if (!meta) { navigate('/'); return; }

  const data = await loadTopic(id);
  const progress = store.getTopicProgress(data.exercises || []);
  const c = colorFor(meta.color);
  const sessions = store.getTopicSessions(id);
  const lastSession = sessions[sessions.length - 1];
  const display = topicProgressDisplay(progress);

  // Exercise type breakdown
  const types = {};
  for (const ex of data.exercises || []) {
    types[ex.type] = (types[ex.type] || 0) + 1;
  }
  const typeList = Object.entries(types).map(([t, n]) =>
    `<span class="${c.badge} text-xs px-2 py-1 rounded-full">${n} ${t.replace('-', ' ')}</span>`
  ).join(' ');

  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="back-bar">
        <a href="#/" class="back-btn">← Back</a>
      </div>

      <div class="topic-hero ${c.bg} text-white px-4 py-8">
        <div class="max-w-xl mx-auto">
          <span class="text-5xl">${meta.icon}</span>
          <h1 class="text-2xl font-bold mt-2">${meta.title}</h1>
          <p class="text-sm opacity-80 mt-1">${meta.description}</p>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-6">
        <!-- Progress card -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Your Progress</h2>
          ${progressBar(display.percentage, c.bg)}
          <div class="flex justify-between text-sm text-gray-500 mt-2">
            <span>${display.practiced}</span>
            <span>${display.percentage}%</span>
          </div>
          <p class="text-xs text-gray-400 mt-2">${display.mastered}</p>
          ${lastSession ? `<p class="text-xs text-gray-400 mt-2">Last session: ${new Date(lastSession.date).toLocaleDateString()} — ${lastSession.correct}/${lastSession.total} correct</p>` : ''}
        </div>

        <!-- Exercise types -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-2">Exercise Types</h2>
          <div class="flex flex-wrap gap-2">${typeList}</div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col gap-3">
          <button onclick="navigate('/study/${id}')" class="btn-primary py-4 text-base">
            📖 Study Theory
          </button>
          <button onclick="navigate('/practice/${id}')" class="btn-success py-4 text-base">
            🎯 Practice Exercises
          </button>
          ${progress.seen > 0 ? `
          <button onclick="confirmResetTopic('${id}')" class="btn-secondary text-sm py-2">
            🔄 Reset Topic Progress
          </button>` : ''}
        </div>

        <!-- Lessons preview -->
        ${data.lessons?.length ? `
        <div class="mt-6">
          <h2 class="font-bold text-gray-700 mb-3">Lessons</h2>
          ${data.lessons.map((l, idx) => `
            <button
              type="button"
              onclick="navigate('/study/${id}/${idx}')"
              class="card lesson-preview-btn mb-2 w-full text-left"
              aria-label="Open lesson ${idx + 1}: ${l.title}">
              <span class="lesson-preview-meta">Lesson ${idx + 1}</span>
              <h3 class="font-semibold text-gray-800">${l.title}</h3>
            </button>`).join('')}
        </div>` : ''}
      </div>
    </div>
    ${navBar()}
  `;
}

// Study (theory) ────────────────────────────────────────────

async function renderStudy(id, startLesson = 0) {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const meta = topicMeta(id);
  const data = await loadTopic(id);

  if (!data.lessons?.length) {
    ROOT.innerHTML = `<div class="page-container pb-24">
      <div class="back-bar"><a href="#/topic/${id}" class="back-btn">← Back</a></div>
      <div class="max-w-xl mx-auto px-4 mt-12 text-center">
        <p class="text-gray-500">No lessons available for this topic yet.</p>
        <a href="#/topic/${id}" class="btn-primary mt-4 inline-block">Back</a>
      </div>
    </div>`;
    return;
  }

  const total = data.lessons.length;
  const initialLesson = Math.min(Math.max(Number.parseInt(startLesson, 10) || 0, 0), total - 1);

  function renderLesson(idx) {
    const lesson = data.lessons[idx];
    const contentHtml = markdownToHtml(lesson.content);
    ROOT.innerHTML = `
      <div class="page-container pb-24">
        <div class="back-bar">
          <a href="#/topic/${id}" class="back-btn">← Back</a>
          <span class="text-sm text-gray-400">${idx + 1} / ${total}</span>
        </div>
        ${progressBar(((idx + 1) / total) * 100, colorFor(meta?.color || 'violet').bg)}
        <div class="max-w-xl mx-auto px-4 mt-6">
          <div class="card lesson-card">
            <div class="${colorFor(meta?.color || 'violet').badge} text-xs px-2 py-1 rounded-full inline-block mb-3">
              Lesson ${idx + 1} of ${total}
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-4">${lesson.title}</h2>
            <div class="lesson-content">${contentHtml}</div>
          </div>
          <div class="flex gap-3 mt-6">
            ${idx > 0 ? `<button id="prev-btn" class="btn-secondary flex-1">← Previous</button>` : '<div class="flex-1"></div>'}
            ${idx < total - 1
              ? `<button id="next-btn" class="btn-primary flex-1">Next →</button>`
              : `<button id="done-btn" class="btn-success flex-1">Start Practicing 🎯</button>`
            }
          </div>
        </div>
      </div>
      ${navBar()}
    `;

    ROOT.querySelector('#prev-btn')?.addEventListener('click', () => renderLesson(idx - 1));
    ROOT.querySelector('#next-btn')?.addEventListener('click', () => renderLesson(idx + 1));
    ROOT.querySelector('#done-btn')?.addEventListener('click', () => navigate(`/practice/${id}`));
  }

  renderLesson(initialLesson);
}

// Practice (exercises) ─────────────────────────────────────

async function renderPractice(id) {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const data = await loadTopic(id);

  const questionsPerSession = store.getSetting('questionsPerSession') || 10;
  const allExercises = store.sortByPriority(data.exercises || []);
  const exercises = allExercises.slice(0, questionsPerSession);

  if (!exercises.length) {
    ROOT.innerHTML = `<div class="max-w-xl mx-auto px-4 mt-12 text-center">
      <p>No exercises available.</p>
      <a href="#/topic/${id}" class="btn-primary mt-4 inline-block">Back</a>
    </div>`;
    return;
  }

  state.session = { topicId: id, results: [], index: 0, exercises };
  state.sessionStart = Date.now();
  runExercise();
}

function runExercise() {
  const { session } = state;
  if (session.index >= session.exercises.length) {
    endSession();
    return;
  }

  const exercise = session.exercises[session.index];
  const total = session.exercises.length;
  const current = session.index + 1;
  const meta = topicMeta(session.topicId);
  const c = colorFor(meta?.color || 'violet');

  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="exercise-top-bar">
        <button onclick="confirmExitSession()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        <div class="flex-1 mx-4">
          ${progressBar((session.index / total) * 100, c.bg)}
        </div>
        <span class="text-sm font-medium text-gray-500">${current}/${total}</span>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-4 pb-8">
        <div id="exercise-container"></div>
      </div>
    </div>
  `;

  const container = ROOT.querySelector('#exercise-container');

  renderExercise(exercise, container, (result) => {
    store.touchStreak();
    const { xpGained } = store.recordAnswer(exercise.id, result.correct);
    result.xpGained = xpGained;

    // Brief XP flash if correct
    if (result.correct && xpGained > 0) {
      const flash = document.createElement('div');
      flash.className = 'xp-flash';
      flash.textContent = `+${xpGained} XP`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 1200);
    }
  }).then(({ correct, userAnswer, xpGained }) => {
    session.results.push({ exerciseId: exercise.id, correct, userAnswer, xpGained });
    session.index++;

    // Auto-advance after small delay so user sees feedback
    setTimeout(runExercise, 300);
  });
}

function endSession() {
  const { session } = state;
  if (!session) {
    navigate('/');
    return;
  }

  const correct = session.results.filter(r => r.correct).length;
  const total = session.results.length;
  if (total === 0) {
    const topicId = session.topicId;
    state.session = null;
    showToast('Session discarded.');
    navigate(`/topic/${topicId}`);
    return;
  }

  const duration = Math.round((Date.now() - state.sessionStart) / 1000);
  const xpTotal = session.results.reduce((a, r) => a + r.xpGained, 0) + 25;
  const pct = Math.round((correct / total) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪';
  const topicId = session.topicId;

  store.saveSession({ topicId, correct, total, duration });
  state.session = null;

  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="max-w-xl mx-auto px-4 py-10 text-center">
        <div class="text-6xl mb-4">${emoji}</div>
        <h1 class="text-3xl font-extrabold text-gray-800">Session Complete!</h1>
        <p class="text-gray-500 mt-2">${pct === 100 ? 'Perfect score!' : pct >= 80 ? 'Great job!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!'}</p>

        <!-- Score circle -->
        <div class="score-circle mx-auto mt-8">
          <span class="text-4xl font-extrabold text-violet-600">${correct}</span>
          <span class="text-gray-400 text-lg">/${total}</span>
        </div>
        <p class="text-sm text-gray-400 mt-2">${pct}% correct</p>

        <!-- Stats row -->
        <div class="flex justify-center gap-6 mt-6">
          <div class="result-stat">
            <span class="text-2xl font-bold text-amber-500">+${xpTotal}</span>
            <span class="text-xs text-gray-400 block">XP Earned</span>
          </div>
          <div class="result-stat">
            <span class="text-2xl font-bold text-violet-500">${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}</span>
            <span class="text-xs text-gray-400 block">Time</span>
          </div>
          <div class="result-stat">
            <span class="text-2xl font-bold text-emerald-500">${store.getStats().streak.current}</span>
            <span class="text-xs text-gray-400 block">Day Streak</span>
          </div>
        </div>

        <!-- Per-question breakdown -->
        <div class="mt-8 text-left">
          <h2 class="font-bold text-gray-700 mb-3">Review</h2>
          <div class="space-y-2">
            ${session.results.map((r, i) => {
              const ex = session.exercises[i];
              const correctAnswer = (ex.answers ? ex.answers[0] : (ex.options ? ex.options[ex.correct] : ex.answer)) || '';
              return `
                <div class="review-item ${r.correct ? 'review-correct' : 'review-incorrect'}">
                  <span class="text-lg">${r.correct ? '✓' : '✗'}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-700 truncate">${ex.sentence || ex.question || 'Exercise'}</p>
                    ${!r.correct ? `<p class="text-xs text-rose-600">→ ${correctAnswer}</p>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <div class="flex flex-col gap-3 mt-8">
          <button onclick="navigate('/practice/${topicId}')" class="btn-primary py-3">
            🔁 Practice Again
          </button>
          <a href="#/topic/${topicId}" class="btn-secondary py-3 text-center">
            Back to Topic
          </a>
        </div>
      </div>
    </div>
    ${navBar()}
  `;
}

// Stats ──────────────────────────────────────────────────────

async function renderStats() {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const stats = store.getStats();
  const { level, xpInLevel } = xpLevel(stats.totalXP);
  const recent = store.getRecentSessions(5);

  // Per-topic stats
  const topicRows = await Promise.all(state.manifest.topics.map(async meta => {
    let progress = { seen: 0, total: 0, mastered: 0, percentage: 0, seenPercentage: 0, masteredPercentage: 0 };
    try {
      const data = await loadTopic(meta.id);
      progress = store.getTopicProgress(data.exercises || []);
    } catch {}
    const c = colorFor(meta.color);
    const display = topicProgressDisplay(progress);
    return `
      <div class="flex items-center gap-3">
        <span class="text-2xl">${meta.icon}</span>
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-700">${meta.subtopic}</p>
          <p class="text-xs text-gray-400 mb-1">${display.practiced} · ${display.mastered}</p>
          ${progressBar(display.percentage, c.bg)}
        </div>
        <span class="text-sm font-bold text-gray-600">${display.percentage}%</span>
      </div>`;
  }));

  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="back-bar">
        <span class="text-lg font-bold text-gray-800">📊 Statistics</span>
      </div>
      <div class="max-w-xl mx-auto px-4 mt-4">

        <!-- XP & Level -->
        <div class="card mb-4 text-center">
          <div class="text-5xl font-extrabold text-violet-600">Lv. ${level}</div>
          <p class="text-gray-500 text-sm mt-1">${stats.totalXP} XP total</p>
          ${progressBar(xpInLevel, 'bg-amber-400')}
          <p class="text-xs text-gray-400 mt-1">${xpInLevel}/100 XP to Level ${level + 1}</p>
        </div>

        <!-- Streak -->
        <div class="card mb-4">
          <div class="flex justify-around text-center">
            <div>
              <div class="text-3xl font-bold text-orange-500">${stats.streak.current} 🔥</div>
              <div class="text-xs text-gray-400 mt-1">Current streak</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-amber-500">${stats.streak.longest}</div>
              <div class="text-xs text-gray-400 mt-1">Best streak</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-blue-500">${stats.totalSessions}</div>
              <div class="text-xs text-gray-400 mt-1">Sessions</div>
            </div>
          </div>
        </div>

        <!-- Accuracy -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-2">Overall Accuracy</h2>
          ${progressBar(stats.accuracy, 'bg-emerald-500')}
          <div class="flex justify-between text-sm text-gray-500 mt-1">
            <span>${stats.totalCorrect} correct</span>
            <span>${stats.accuracy}%</span>
            <span>${stats.totalAttempts} total</span>
          </div>
        </div>

        <!-- Per-topic progress -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Topic Progress</h2>
          <div class="space-y-3">${topicRows.join('')}</div>
        </div>

        <!-- Recent sessions -->
        ${recent.length > 0 ? `
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Recent Sessions</h2>
          <div class="space-y-2">
            ${recent.map(s => {
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
              const meta = topicMeta(s.topicId);
              const pctClass = pct === null
                ? 'text-gray-400'
                : pct >= 80
                  ? 'text-emerald-600'
                  : pct >= 60
                    ? 'text-amber-500'
                    : 'text-rose-500';
              return `
                <div class="flex items-center justify-between text-sm">
                  <span>${meta?.icon || '📚'} ${meta?.subtopic || s.topicId}</span>
                  <span class="text-gray-400">${new Date(s.date).toLocaleDateString()}</span>
                  <span class="${pctClass} font-medium">${pct === null ? '—' : `${pct}%`}</span>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}

      </div>
    </div>
    ${navBar('/stats')}
  `;
}

// Settings ───────────────────────────────────────────────────

function renderSettings() {
  const qps = store.getSetting('questionsPerSession');
  const hints = store.getSetting('showHints');
  const darkSetting = store.getSetting('darkMode'); // null=auto, true=dark, false=light
  const darkValue = darkSetting === true ? 'dark' : darkSetting === false ? 'light' : 'auto';

  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="back-bar">
        <span class="text-lg font-bold text-gray-800">⚙️ Settings</span>
      </div>
      <div class="max-w-xl mx-auto px-4 mt-4">

        <!-- Preferences -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-4">Preferences</h2>

          <div class="setting-row">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Appearance</p>
              <p class="text-xs text-gray-400">Auto follows your system setting</p>
            </div>
            <select id="dark-select" class="select-input">
              <option value="auto"  ${darkValue === 'auto'  ? 'selected' : ''}>🌓 Auto</option>
              <option value="dark"  ${darkValue === 'dark'  ? 'selected' : ''}>🌙 Dark</option>
              <option value="light" ${darkValue === 'light' ? 'selected' : ''}>☀️ Light</option>
            </select>
          </div>

          <div class="setting-row mt-3">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Questions per session</p>
              <p class="text-xs text-gray-400">How many exercises per practice session</p>
            </div>
            <select id="qps-select" class="select-input">
              ${[5, 10, 15, 20].map(n => `<option value="${n}" ${n === qps ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>

          <div class="setting-row mt-3">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Show hints</p>
              <p class="text-xs text-gray-400">Show verb hints in fill-blank exercises</p>
            </div>
            <label class="toggle">
              <input type="checkbox" id="hints-toggle" ${hints ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Data management -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-4">Data</h2>
          <div class="space-y-3">
            <button id="export-btn" class="btn-secondary w-full">📤 Export Progress</button>
            <label class="btn-secondary w-full text-center cursor-pointer block">
              📥 Import Progress
              <input type="file" id="import-file" accept=".json" class="hidden">
            </label>
            <button id="reset-btn" class="btn-danger w-full">🗑️ Reset All Progress</button>
          </div>
        </div>

        <div class="card text-center">
          <p class="text-sm text-gray-400">${APP_NAME} · English Grammar Learning</p>
          <p class="text-xs text-gray-300 mt-1">Add content via <code>content/topics/</code> JSON files</p>
        </div>
      </div>
    </div>
    ${navBar('/settings')}
  `;

  // Wire up settings
  ROOT.querySelector('#dark-select').addEventListener('change', e => {
    const val = e.target.value;
    const setting = val === 'dark' ? true : val === 'light' ? false : null;
    store.updateSettings({ darkMode: setting });
    applyDarkMode();
  });

  ROOT.querySelector('#qps-select').addEventListener('change', e =>
    store.updateSettings({ questionsPerSession: parseInt(e.target.value) }));

  ROOT.querySelector('#hints-toggle').addEventListener('change', e =>
    store.updateSettings({ showHints: e.target.checked }));

  ROOT.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grammardeck-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  });

  ROOT.querySelector('#import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const ok = store.importJSON(ev.target.result);
      showToast(ok ? '✅ Progress imported!' : '❌ Invalid file');
      if (ok) {
        applyDarkMode();
        renderSettings();
      }
    };
    reader.readAsText(file);
  });

  ROOT.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('Reset ALL progress? This cannot be undone.')) {
      store.resetAll();
      showToast('Progress reset.');
      renderHome();
    }
  });
}

// ── Dark mode ─────────────────────────────────────────────────

function applyDarkMode() {
  const setting = store.getSetting('darkMode'); // null = auto, true = dark, false = light
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldDark = (setting === null || setting === undefined) ? systemDark : setting === true;
  document.documentElement.classList.toggle('dark', shouldDark);
}

// ── Utility functions (exposed to inline onclick) ─────────────

window.navigate = navigate;

window.confirmExitSession = () => {
  if (confirm('Exit this session? Your progress so far will be saved.')) {
    if (state.session) endSession();
    else navigate('/');
  }
};

window.confirmResetTopic = async (id) => {
  if (confirm('Reset progress for this topic?')) {
    const data = await loadTopic(id);
    store.resetTopic(data.exercises || []);
    showToast('Topic progress reset.');
    renderTopic(id);
  }
};

// ── Toast notification ────────────────────────────────────────

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-show'));
  setTimeout(() => {
    el.classList.remove('toast-show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ── Markdown-lite renderer ────────────────────────────────────

function markdownToHtml(md) {
  if (!md) return '';
  const html = md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/^(#{1,3}) (.+)$/gm, (_, h, t) => `<h${h.length} class="lesson-h${h.length}">${t}</h${h.length}>`)
    .replace(/^📌 (.+)$/gm, '<p class="use-case">📌 $1</p>')
    .replace(/^⏰ (.+)$/gm, '<p class="use-case">⏰ $1</p>')
    .replace(/^🔁 (.+)$/gm, '<p class="use-case">🔁 $1</p>')
    .replace(/^⚠️ (.+)$/gm, '<p class="warning-case">⚠️ $1</p>')
    .replace(/^🔤 (.+)$/gm, '<p class="rule-case">🔤 $1</p>')
    .replace(/^• (.+)$/gm, '<li class="lesson-li">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, m => `<ul class="lesson-ul">${m}</ul>`)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim() !== '');
      if (cells.length === 0) return match;
      return '<tr>' + cells.map(c => `<td class="table-cell">${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, m => `<table class="lesson-table">${m}</table>`);

  return html.split(/\n\n+/).map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('<') && /^(<h|<p|<ul|<table|<div)/.test(trimmed)) return trimmed;
    return `<p class="lesson-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

// ── Start ────────────────────────────────────────────────────

init().catch(err => {
  ROOT.innerHTML = `
    <div class="max-w-xl mx-auto px-4 py-12 text-center">
      <p class="text-5xl">😕</p>
      <h1 class="text-xl font-bold text-gray-700 mt-4">Could not load ${APP_NAME}</h1>
      <p class="text-gray-500 text-sm mt-2">${err.message}</p>
      <p class="text-xs text-gray-400 mt-2">Make sure you're running this from a web server, not file://</p>
    </div>`;
});
