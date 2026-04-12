// js/store.js
var STORE_KEY = "grammemo_v1";
var XP_PER_CORRECT = 10;
var XP_PER_SESSION = 25;
var Store = class {
  constructor() {
    this._load();
  }
  _load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : this._defaultData();
      this.data = this._normalizeData(parsed);
      this._save();
    } catch {
      this.data = this._defaultData();
    }
  }
  _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
  }
  _defaultData() {
    return {
      questionScores: {},
      // { [questionId]: ScoreRecord }
      sessions: [],
      // SessionRecord[]
      streak: { current: 0, longest: 0, lastDate: null },
      totalXP: 0,
      settings: {
        questionsPerSession: 10,
        showHints: true,
        soundEnabled: false,
        darkMode: null
        // null = auto (system), true = force dark, false = force light
      },
      version: 1
    };
  }
  _normalizeData(data) {
    const defaults = this._defaultData();
    const input = data && typeof data === "object" ? data : {};
    const questionScores = {};
    if (input.questionScores && typeof input.questionScores === "object") {
      for (const [id, score] of Object.entries(input.questionScores)) {
        if (!id || !score || typeof score !== "object") continue;
        questionScores[id] = {
          correct: Number.isFinite(score.correct) ? Math.max(0, score.correct) : 0,
          incorrect: Number.isFinite(score.incorrect) ? Math.max(0, score.incorrect) : 0,
          streak: Number.isFinite(score.streak) ? Math.max(0, score.streak) : 0,
          lastSeen: Number.isFinite(score.lastSeen) ? score.lastSeen : null,
          interval: Number.isFinite(score.interval) && score.interval > 0 ? score.interval : 1,
          nextReview: Number.isFinite(score.nextReview) ? score.nextReview : 0
        };
      }
    }
    const sessions = Array.isArray(input.sessions) ? input.sessions.filter((session) => Number.isFinite(session?.total) && session.total > 0).map((session) => ({
      topicId: session.topicId,
      date: Number.isFinite(session.date) ? session.date : Date.now(),
      correct: Number.isFinite(session.correct) ? Math.max(0, Math.min(session.correct, session.total)) : 0,
      total: session.total,
      duration: Number.isFinite(session.duration) ? Math.max(0, session.duration) : 0,
      xp: Number.isFinite(session.xp) ? Math.max(0, session.xp) : (Number.isFinite(session.correct) ? Math.max(0, session.correct) : 0) * XP_PER_CORRECT + XP_PER_SESSION
    })) : [];
    return {
      ...defaults,
      ...input,
      questionScores,
      sessions,
      streak: {
        ...defaults.streak,
        ...input.streak || {},
        current: Number.isFinite(input.streak?.current) ? Math.max(0, input.streak.current) : defaults.streak.current,
        longest: Number.isFinite(input.streak?.longest) ? Math.max(0, input.streak.longest) : defaults.streak.longest,
        lastDate: typeof input.streak?.lastDate === "string" ? input.streak.lastDate : defaults.streak.lastDate
      },
      totalXP: Number.isFinite(input.totalXP) ? Math.max(0, input.totalXP) : defaults.totalXP,
      settings: {
        ...defaults.settings,
        ...input.settings || {},
        questionsPerSession: Number.isFinite(input.settings?.questionsPerSession) ? input.settings.questionsPerSession : defaults.settings.questionsPerSession,
        showHints: typeof input.settings?.showHints === "boolean" ? input.settings.showHints : defaults.settings.showHints,
        soundEnabled: typeof input.settings?.soundEnabled === "boolean" ? input.settings.soundEnabled : defaults.settings.soundEnabled,
        darkMode: input.settings?.darkMode === true ? true : input.settings?.darkMode === false ? false : null
      },
      version: defaults.version
    };
  }
  // ── Question Scores ────────────────────────────────────────
  getQuestionScore(id) {
    return this.data.questionScores[id] || {
      correct: 0,
      incorrect: 0,
      streak: 0,
      lastSeen: null,
      interval: 1,
      // days until next review
      nextReview: 0
      // timestamp
    };
  }
  /** Record a user answer and update spaced-repetition data.
   *  Returns { xpGained, newScore } */
  recordAnswer(id, isCorrect) {
    const score = { ...this.getQuestionScore(id) };
    const now = Date.now();
    if (isCorrect) {
      score.correct++;
      score.streak++;
      score.interval = Math.min(Math.round(score.interval * 2.5), 30);
    } else {
      score.incorrect++;
      score.streak = 0;
      score.interval = 1;
    }
    score.lastSeen = now;
    score.nextReview = now + score.interval * 864e5;
    this.data.questionScores[id] = score;
    const xpGained = isCorrect ? XP_PER_CORRECT : 0;
    this.data.totalXP += xpGained;
    this._save();
    return { xpGained, newScore: score };
  }
  /** Returns sorted copy of exercises — unseen first, then due, then future */
  sortByPriority(exercises) {
    const now = Date.now();
    return [...exercises].sort((a, b) => {
      const sa = this.data.questionScores[a.id];
      const sb = this.data.questionScores[b.id];
      const aNew = !sa || !sa.lastSeen;
      const bNew = !sb || !sb.lastSeen;
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      if (aNew && bNew) return 0;
      const aDue = sa.nextReview <= now;
      const bDue = sb.nextReview <= now;
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return sa.nextReview - sb.nextReview;
    });
  }
  // ── Topic Progress ─────────────────────────────────────────
  getTopicProgress(exercises) {
    const total = exercises.length;
    if (total === 0) {
      return {
        seen: 0,
        total: 0,
        mastered: 0,
        percentage: 0,
        seenPercentage: 0,
        masteredPercentage: 0
      };
    }
    let seen = 0, mastered = 0;
    for (const ex of exercises) {
      const s = this.data.questionScores[ex.id];
      if (s && s.lastSeen) {
        seen++;
        if (s.correct >= 2 && s.streak >= 1) mastered++;
      }
    }
    const seenPercentage = Math.round(seen / total * 100);
    const masteredPercentage = Math.round(mastered / total * 100);
    return {
      seen,
      total,
      mastered,
      percentage: seenPercentage,
      seenPercentage,
      masteredPercentage
    };
  }
  // ── Sessions ───────────────────────────────────────────────
  saveSession({ topicId, correct, total, duration }) {
    if (!Number.isFinite(total) || total <= 0) return false;
    this.data.sessions.push({
      topicId,
      date: Date.now(),
      correct,
      total,
      duration,
      xp: correct * XP_PER_CORRECT + XP_PER_SESSION
    });
    this.data.totalXP += XP_PER_SESSION;
    if (this.data.sessions.length > 200) {
      this.data.sessions = this.data.sessions.slice(-200);
    }
    this._save();
    return true;
  }
  getRecentSessions(n = 10) {
    return this.data.sessions.filter((session) => session.total > 0).slice(-n).reverse();
  }
  getTopicSessions(topicId) {
    return this.data.sessions.filter((s) => s.topicId === topicId);
  }
  // ── Streak ─────────────────────────────────────────────────
  /** Call once per day when the user does any activity */
  touchStreak() {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const { streak } = this.data;
    if (streak.lastDate === today) return streak;
    if (streak.lastDate === yesterday) {
      streak.current++;
    } else {
      streak.current = 1;
    }
    streak.longest = Math.max(streak.longest, streak.current);
    streak.lastDate = today;
    this._save();
    return streak;
  }
  // ── Settings ───────────────────────────────────────────────
  getSetting(key) {
    return this.data.settings[key];
  }
  updateSettings(patch) {
    Object.assign(this.data.settings, patch);
    this._save();
  }
  // ── Data Management ────────────────────────────────────────
  resetAll() {
    this.data = this._defaultData();
    this._save();
  }
  resetTopic(exercises) {
    for (const ex of exercises) {
      delete this.data.questionScores[ex.id];
    }
    this._save();
  }
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }
  importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.version) return false;
      this.data = this._normalizeData(parsed);
      this._save();
      return true;
    } catch {
      return false;
    }
  }
  // ── Stats ──────────────────────────────────────────────────
  getStats() {
    const scores = Object.values(this.data.questionScores);
    const totalAttempts = scores.reduce((a, s) => a + s.correct + s.incorrect, 0);
    const totalCorrect = scores.reduce((a, s) => a + s.correct, 0);
    const accuracy = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : 0;
    return {
      totalXP: this.data.totalXP,
      streak: this.data.streak,
      totalAttempts,
      totalCorrect,
      accuracy,
      totalSessions: this.data.sessions.length,
      questionsAttempted: scores.filter((s) => s.lastSeen).length
    };
  }
};
var store = new Store();

// js/exercises.js
function renderExercise(exercise, container, onAnswer) {
  container.innerHTML = "";
  container.dataset.exerciseId = exercise.id;
  switch (exercise.type) {
    case "flashcard":
      return renderFlashcard(exercise, container, onAnswer);
    case "fill-blank":
      return renderFillBlank(exercise, container, onAnswer);
    case "multiple-choice":
      return renderMultipleChoice(exercise, container, onAnswer);
    case "error-correction":
      return renderErrorCorrection(exercise, container, onAnswer);
    case "sentence-transform":
      return renderSentenceTransform(exercise, container, onAnswer);
    default:
      container.innerHTML = `<p class="text-red-500">Unknown exercise type: ${exercise.type}</p>`;
      return Promise.resolve({ correct: false, userAnswer: "" });
  }
}
function typeBadge(type) {
  const map = {
    "flashcard": ["\u{1F0CF}", "Flashcard", "bg-violet-100 text-violet-700"],
    "fill-blank": ["\u270F\uFE0F", "Fill in the blank", "bg-blue-100 text-blue-700"],
    "multiple-choice": ["\u{1F524}", "Multiple choice", "bg-amber-100 text-amber-700"],
    "error-correction": ["\u{1F50D}", "Error correction", "bg-rose-100 text-rose-700"],
    "sentence-transform": ["\u{1F504}", "Sentence transform", "bg-emerald-100 text-emerald-700"]
  };
  const [icon, label, cls] = map[type] || ["\u2753", type, "bg-gray-100 text-gray-700"];
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cls}">${icon} ${label}</span>`;
}
function difficultyStars(d = 1) {
  return "\u2B50".repeat(d) + "\u2606".repeat(Math.max(0, 3 - d));
}
function normalize(str) {
  return str.trim().toLowerCase().replace(/[’‘‛`´]/g, "'").replace(/([a-z])'([a-z])/g, "$1$2").replace(/\.+$/g, "").replace(/\s+/g, " ");
}
function checkAnswer(userAnswer, acceptedAnswers) {
  const ua = normalize(userAnswer);
  return acceptedAnswers.some((a) => normalize(a) === ua);
}
function feedbackHtml(isCorrect, correctAnswer, explanation) {
  if (isCorrect) {
    return `
      <div class="feedback-box feedback-correct">
        <div class="flex items-center gap-2 font-bold text-emerald-700 text-lg mb-1">
          <span>\u2713</span><span>Correct!</span>
        </div>
        ${explanation ? `<p class="text-emerald-800 text-sm">${explanation}</p>` : ""}
      </div>`;
  }
  return `
    <div class="feedback-box feedback-incorrect">
      <div class="flex items-center gap-2 font-bold text-rose-700 text-lg mb-1">
        <span>\u2717</span><span>Not quite</span>
      </div>
      <p class="text-rose-800 text-sm">Correct answer: <strong>${correctAnswer}</strong></p>
      ${explanation ? `<p class="text-rose-700 text-sm mt-1">${explanation}</p>` : ""}
    </div>`;
}
function nextButton(label = "Next \u2192") {
  return `<button class="btn-primary w-full mt-4" id="next-btn">${label}</button>`;
}
function bindEnterToSubmit(input, submitButton, { allowShiftEnter = false } = {}) {
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (allowShiftEnter && e.shiftKey) return;
    e.preventDefault();
    submitButton.click();
  });
}
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
            <p class="tap-hint mt-8">\u{1F446} Tap to reveal answer</p>
          </div>
          <div class="flashcard-back">
            <p class="text-xl text-center text-gray-800 leading-relaxed whitespace-pre-line">${ex.answer}</p>
          </div>
        </div>
      </div>
    </div>
    <div id="fc-actions" class="hidden flex gap-3 mt-6">
      <button id="fc-wrong" class="btn-secondary flex-1">\u{1F615} Didn't know</button>
      <button id="fc-right" class="btn-success flex-1">\u{1F389} Got it!</button>
    </div>
  `;
  const card = container.querySelector("#fc-card");
  const actions = container.querySelector("#fc-actions");
  const wrongButton = container.querySelector("#fc-wrong");
  let flipped = false;
  const flip = () => {
    if (!flipped) {
      card.classList.add("flipped");
      actions.classList.remove("hidden");
      wrongButton.focus();
      flipped = true;
    }
  };
  card.addEventListener("click", flip);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") flip();
  });
  return new Promise((resolve) => {
    container.querySelector("#fc-wrong").addEventListener("click", () => {
      const res = { correct: false, userAnswer: "didn't know" };
      if (onAnswer) onAnswer(res);
      resolve(res);
    });
    container.querySelector("#fc-right").addEventListener("click", () => {
      const res = { correct: true, userAnswer: "knew it" };
      if (onAnswer) onAnswer(res);
      resolve(res);
    });
  });
}
function renderFillBlank(ex, container, onAnswer) {
  const sentenceHtml = ex.sentence.replace(
    "{_}",
    `<input type="text" id="fb-input" class="fill-input" placeholder="\u2026"
      autocomplete="off" spellcheck="false">`
  );
  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="instruction-text">${ex.instruction || "Complete the sentence."}</p>
    ${store.getSetting("showHints") && ex.hint ? `<div class="hint-box">\u{1F4A1} Verb: <strong>${ex.hint}</strong></div>` : ""}
    <p class="sentence-text mt-6">${sentenceHtml}</p>
    <button id="submit-btn" class="btn-primary w-full mt-6">Check Answer</button>
    <div id="feedback-area"></div>
  `;
  const input = container.querySelector("#fb-input");
  const submitBtn = container.querySelector("#submit-btn");
  const feedbackArea = container.querySelector("#feedback-area");
  input.focus();
  bindEnterToSubmit(input, submitBtn);
  return new Promise((resolve) => {
    let answered = false;
    let result = null;
    submitBtn.addEventListener("click", () => {
      if (answered) {
        resolve(result);
        return;
      }
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      answered = true;
      const isCorrect = checkAnswer(input.value, ex.answers);
      result = { correct: isCorrect, userAnswer: input.value.trim() };
      if (onAnswer) onAnswer(result);
      input.disabled = true;
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");
      feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.answers[0], ex.explanation);
      submitBtn.textContent = "Next \u2192";
      submitBtn.focus();
      feedbackArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}
function renderMultipleChoice(ex, container, onAnswer) {
  const letters = ["A", "B", "C", "D"];
  const optionsHtml = ex.options.map((opt, i) => `
    <button class="mc-option" data-index="${i}" data-letter="${letters[i]}">
      <span class="mc-letter">${letters[i]}</span>
      <span>${opt}</span>
    </button>`).join("");
  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="sentence-text mt-4">${ex.sentence.replace("{_}", '<span class="blank-slot">___</span>')}</p>
    <div class="mc-grid mt-6">${optionsHtml}</div>
    <div id="feedback-area"></div>
    <div id="next-area" class="hidden">${nextButton()}</div>
  `;
  const buttons = container.querySelectorAll(".mc-option");
  const feedbackArea = container.querySelector("#feedback-area");
  const nextArea = container.querySelector("#next-area");
  return new Promise((resolve) => {
    let answered = false;
    let result = null;
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const chosen = parseInt(btn.dataset.index);
        const isCorrect = chosen === ex.correct;
        result = { correct: isCorrect, userAnswer: ex.options[chosen] };
        if (onAnswer) onAnswer(result);
        buttons.forEach((b, i) => {
          b.disabled = true;
          if (i === ex.correct) b.classList.add("mc-correct");
          else if (i === chosen && !isCorrect) b.classList.add("mc-incorrect");
          else b.classList.add("mc-dimmed");
        });
        feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.options[ex.correct], ex.explanation);
        nextArea.classList.remove("hidden");
        const nextBtn = nextArea.querySelector("#next-btn");
        nextBtn.focus();
        feedbackArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
        nextBtn.addEventListener("click", () => resolve(result));
      });
    });
  });
}
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
      placeholder="Type the corrected sentence\u2026" spellcheck="false"></textarea>
    <button id="submit-btn" class="btn-primary w-full mt-3">Check Answer</button>
    <div id="feedback-area"></div>
  `;
  const input = container.querySelector("#ec-input");
  const submitBtn = container.querySelector("#submit-btn");
  const feedbackArea = container.querySelector("#feedback-area");
  input.focus();
  bindEnterToSubmit(input, submitBtn, { allowShiftEnter: true });
  return new Promise((resolve) => {
    let answered = false;
    let result = null;
    submitBtn.addEventListener("click", () => {
      if (answered) {
        resolve(result);
        return;
      }
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      answered = true;
      const isCorrect = checkAnswer(input.value, ex.answers);
      result = { correct: isCorrect, userAnswer: input.value.trim() };
      if (onAnswer) onAnswer(result);
      input.disabled = true;
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");
      feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.answers[0], ex.explanation);
      submitBtn.textContent = "Next \u2192";
      submitBtn.focus();
      feedbackArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}
function renderSentenceTransform(ex, container, onAnswer) {
  container.innerHTML = `
    <div class="exercise-header">
      ${typeBadge(ex.type)}
      <span class="text-xs text-gray-400 ml-2">${difficultyStars(ex.difficulty)}</span>
    </div>
    <p class="instruction-text">${ex.instruction || "Rewrite the sentence."}</p>
    <div class="source-sentence-box">
      <p class="text-lg font-medium text-gray-700">${ex.sentence}</p>
    </div>
    <textarea id="st-input" class="correction-input mt-4" rows="2"
      placeholder="Write the transformed sentence\u2026" spellcheck="false"></textarea>
    <button id="submit-btn" class="btn-primary w-full mt-3">Check Answer</button>
    <div id="feedback-area"></div>
  `;
  const input = container.querySelector("#st-input");
  const submitBtn = container.querySelector("#submit-btn");
  const feedbackArea = container.querySelector("#feedback-area");
  input.focus();
  bindEnterToSubmit(input, submitBtn, { allowShiftEnter: true });
  return new Promise((resolve) => {
    let answered = false;
    let result = null;
    submitBtn.addEventListener("click", () => {
      if (answered) {
        resolve(result);
        return;
      }
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      answered = true;
      const isCorrect = checkAnswer(input.value, ex.answers);
      result = { correct: isCorrect, userAnswer: input.value.trim() };
      if (onAnswer) onAnswer(result);
      input.disabled = true;
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");
      feedbackArea.innerHTML = feedbackHtml(isCorrect, ex.answers[0], ex.explanation);
      submitBtn.textContent = "Next \u2192";
      submitBtn.focus();
      feedbackArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

// js/app.js
var state = {
  manifest: null,
  topicCache: {},
  // { [topicId]: topicData }
  session: null,
  // active exercise session
  sessionStart: 0
};
var ROOT = document.getElementById("app");
var APP_NAME = "GrammarDeck";
async function init() {
  applyDarkMode();
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const onColorSchemeChange = () => {
    if (store.getSetting("darkMode") === null || store.getSetting("darkMode") === void 0) {
      applyDarkMode();
    }
  };
  if (typeof colorSchemeQuery.addEventListener === "function") {
    colorSchemeQuery.addEventListener("change", onColorSchemeChange);
  } else if (typeof colorSchemeQuery.addListener === "function") {
    colorSchemeQuery.addListener(onColorSchemeChange);
  }
  state.manifest = await fetchJSON("content/manifest.json");
  window.addEventListener("hashchange", route);
  route();
}
function route() {
  const hash = window.location.hash.replace("#", "") || "/";
  const [, view, ...params] = hash.split("/");
  if (!view || view === "") return renderHome();
  if (view === "topic") return renderTopic(params[0]);
  if (view === "study") return renderStudy(params[0], params[1]);
  if (view === "practice") return renderPractice(params[0]);
  if (view === "stats") return renderStats();
  if (view === "settings") return renderSettings();
  renderHome();
}
function navigate(path) {
  const nextHash = path.startsWith("#") ? path : `#${path}`;
  if (window.location.hash === nextHash) {
    route();
    return;
  }
  window.location.hash = nextHash;
}
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}
async function loadTopic(id) {
  if (state.topicCache[id]) return state.topicCache[id];
  const meta = state.manifest.topics.find((t) => t.id === id);
  if (!meta) throw new Error(`Topic ${id} not found`);
  const data = await fetchJSON(meta.file);
  state.topicCache[id] = data;
  return data;
}
function topicMeta(id) {
  return state.manifest?.topics.find((t) => t.id === id);
}
function colorFor(color) {
  return {
    violet: { bg: "bg-violet-500", light: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
    emerald: { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
    rose: { bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
    blue: { bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" }
  }[color] || colorFor("violet");
}
function progressBar(pct, colorClass = "bg-violet-500") {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : 0;
  return `
    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div class="progress-bar-fill progress-width-${safePct} ${colorClass} h-2 rounded-full transition-all duration-500"></div>
    </div>`;
}
function topicProgressDisplay(progress) {
  const practiced = `${progress.seen}/${progress.total} practiced`;
  const mastered = `${progress.mastered} mastered`;
  return {
    percentage: progress.seenPercentage,
    practiced,
    mastered
  };
}
function xpLevel(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  return { level, xpInLevel, xpToNext: 100 };
}
function navBar(active = "") {
  const links = [
    { path: "/", icon: "\u{1F3E0}", label: "Home" },
    { path: "/stats", icon: "\u{1F4CA}", label: "Stats" },
    { path: "/settings", icon: "\u2699\uFE0F", label: "Settings" }
  ];
  return `
    <nav class="app-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      ${links.map((l) => {
    const isActive = active === l.path;
    return `<a href="#${l.path}" class="nav-link ${isActive ? "nav-link-active" : ""}">
          <span class="text-xl">${l.icon}</span>
          <span class="text-xs mt-0.5">${l.label}</span>
        </a>`;
  }).join("")}
    </nav>`;
}
async function renderHome() {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const stats = store.getStats();
  const { level, xpInLevel } = xpLevel(stats.totalXP);
  const streakEmoji = stats.streak.current >= 7 ? "\u{1F525}" : stats.streak.current >= 3 ? "\u26A1" : "\u{1F4C5}";
  const topicCards = await Promise.all(state.manifest.topics.map(async (meta) => {
    let progress = { seen: 0, total: 0, mastered: 0, percentage: 0, seenPercentage: 0, masteredPercentage: 0 };
    try {
      const data = await loadTopic(meta.id);
      progress = store.getTopicProgress(data.exercises || []);
    } catch {
    }
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
          ${isComplete ? '<span class="text-2xl">\u2705</span>' : isStarted ? '<span class="text-2xl">\u25B6\uFE0F</span>' : '<span class="text-2xl">\u{1F512}</span>'}
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
          <p class="text-violet-200 text-sm mt-1">English Grammar \xB7 Present Simple</p>
          <!-- Stats strip -->
          <div class="flex gap-4 mt-5">
            <div class="stat-chip">
              ${streakEmoji} <span>${stats.streak.current} day streak</span>
            </div>
            <div class="stat-chip">
              \u26A1 <span>${stats.totalXP} XP</span>
            </div>
            <div class="stat-chip">
              \u{1F393} <span>Level ${level}</span>
            </div>
          </div>
          <!-- XP bar -->
          <div class="mt-3">
            ${progressBar(xpInLevel, "bg-amber-400")}
            <p class="text-violet-200 text-xs mt-1">${xpInLevel}/100 XP to Level ${level + 1}</p>
          </div>
        </div>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-6">
        <h2 class="text-lg font-bold text-gray-700 mb-4">\u{1F4DA} Topics</h2>
        <div class="grid gap-4">
          ${topicCards.join("")}
        </div>

        <div class="mt-8 text-center">
          <p class="text-xs text-gray-400">
            ${stats.questionsAttempted} questions attempted \xB7 ${stats.accuracy}% accuracy
          </p>
        </div>
      </div>
    </div>
    ${navBar("/")}
  `;
}
async function renderTopic(id) {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const meta = topicMeta(id);
  if (!meta) {
    navigate("/");
    return;
  }
  const data = await loadTopic(id);
  const progress = store.getTopicProgress(data.exercises || []);
  const c = colorFor(meta.color);
  const sessions = store.getTopicSessions(id);
  const lastSession = sessions[sessions.length - 1];
  const display = topicProgressDisplay(progress);
  const types = {};
  for (const ex of data.exercises || []) {
    types[ex.type] = (types[ex.type] || 0) + 1;
  }
  const typeList = Object.entries(types).map(
    ([t, n]) => `<span class="${c.badge} text-xs px-2 py-1 rounded-full">${n} ${t.replace("-", " ")}</span>`
  ).join(" ");
  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="back-bar">
        <a href="#/" class="back-btn">\u2190 Back</a>
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
          ${lastSession ? `<p class="text-xs text-gray-400 mt-2">Last session: ${new Date(lastSession.date).toLocaleDateString()} \u2014 ${lastSession.correct}/${lastSession.total} correct</p>` : ""}
        </div>

        <!-- Exercise types -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-2">Exercise Types</h2>
          <div class="flex flex-wrap gap-2">${typeList}</div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col gap-3">
          <button onclick="navigate('/study/${id}')" class="btn-primary py-4 text-base">
            \u{1F4D6} Study Theory
          </button>
          <button onclick="navigate('/practice/${id}')" class="btn-success py-4 text-base">
            \u{1F3AF} Practice Exercises
          </button>
          ${progress.seen > 0 ? `
          <button onclick="confirmResetTopic('${id}')" class="btn-secondary text-sm py-2">
            \u{1F504} Reset Topic Progress
          </button>` : ""}
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
            </button>`).join("")}
        </div>` : ""}
      </div>
    </div>
    ${navBar()}
  `;
}
async function renderStudy(id, startLesson = 0) {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const meta = topicMeta(id);
  const data = await loadTopic(id);
  if (!data.lessons?.length) {
    ROOT.innerHTML = `<div class="page-container pb-24">
      <div class="back-bar"><a href="#/topic/${id}" class="back-btn">\u2190 Back</a></div>
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
          <a href="#/topic/${id}" class="back-btn">\u2190 Back</a>
          <span class="text-sm text-gray-400">${idx + 1} / ${total}</span>
        </div>
        ${progressBar((idx + 1) / total * 100, colorFor(meta?.color || "violet").bg)}
        <div class="max-w-xl mx-auto px-4 mt-6">
          <div class="card lesson-card">
            <div class="${colorFor(meta?.color || "violet").badge} text-xs px-2 py-1 rounded-full inline-block mb-3">
              Lesson ${idx + 1} of ${total}
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-4">${lesson.title}</h2>
            <div class="lesson-content">${contentHtml}</div>
          </div>
          <div class="flex gap-3 mt-6">
            ${idx > 0 ? `<button id="prev-btn" class="btn-secondary flex-1">\u2190 Previous</button>` : '<div class="flex-1"></div>'}
            ${idx < total - 1 ? `<button id="next-btn" class="btn-primary flex-1">Next \u2192</button>` : `<button id="done-btn" class="btn-success flex-1">Start Practicing \u{1F3AF}</button>`}
          </div>
        </div>
      </div>
      ${navBar()}
    `;
    ROOT.querySelector("#prev-btn")?.addEventListener("click", () => renderLesson(idx - 1));
    ROOT.querySelector("#next-btn")?.addEventListener("click", () => renderLesson(idx + 1));
    ROOT.querySelector("#done-btn")?.addEventListener("click", () => navigate(`/practice/${id}`));
  }
  renderLesson(initialLesson);
}
async function renderPractice(id) {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const data = await loadTopic(id);
  const questionsPerSession = store.getSetting("questionsPerSession") || 10;
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
  const c = colorFor(meta?.color || "violet");
  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="exercise-top-bar">
        <button onclick="confirmExitSession()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">\u2715</button>
        <div class="flex-1 mx-4">
          ${progressBar(session.index / total * 100, c.bg)}
        </div>
        <span class="text-sm font-medium text-gray-500">${current}/${total}</span>
      </div>

      <div class="max-w-xl mx-auto px-4 mt-4 pb-8">
        <div id="exercise-container"></div>
      </div>
    </div>
  `;
  const container = ROOT.querySelector("#exercise-container");
  renderExercise(exercise, container, (result) => {
    store.touchStreak();
    const { xpGained } = store.recordAnswer(exercise.id, result.correct);
    result.xpGained = xpGained;
    if (result.correct && xpGained > 0) {
      const flash = document.createElement("div");
      flash.className = "xp-flash";
      flash.textContent = `+${xpGained} XP`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 1200);
    }
  }).then(({ correct, userAnswer, xpGained }) => {
    session.results.push({ exerciseId: exercise.id, correct, userAnswer, xpGained });
    session.index++;
    setTimeout(runExercise, 300);
  });
}
function endSession() {
  const { session } = state;
  if (!session) {
    navigate("/");
    return;
  }
  const correct = session.results.filter((r) => r.correct).length;
  const total = session.results.length;
  if (total === 0) {
    const topicId2 = session.topicId;
    state.session = null;
    showToast("Session discarded.");
    navigate(`/topic/${topicId2}`);
    return;
  }
  const duration = Math.round((Date.now() - state.sessionStart) / 1e3);
  const xpTotal = session.results.reduce((a, r) => a + r.xpGained, 0) + 25;
  const pct = Math.round(correct / total * 100);
  const emoji = pct === 100 ? "\u{1F3C6}" : pct >= 80 ? "\u{1F389}" : pct >= 60 ? "\u{1F44D}" : "\u{1F4AA}";
  const topicId = session.topicId;
  store.saveSession({ topicId, correct, total, duration });
  state.session = null;
  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="max-w-xl mx-auto px-4 py-10 text-center">
        <div class="text-6xl mb-4">${emoji}</div>
        <h1 class="text-3xl font-extrabold text-gray-800">Session Complete!</h1>
        <p class="text-gray-500 mt-2">${pct === 100 ? "Perfect score!" : pct >= 80 ? "Great job!" : pct >= 60 ? "Good effort!" : "Keep practicing!"}</p>

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
            <span class="text-2xl font-bold text-violet-500">${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}</span>
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
    const correctAnswer = (ex.answers ? ex.answers[0] : ex.options ? ex.options[ex.correct] : ex.answer) || "";
    return `
                <div class="review-item ${r.correct ? "review-correct" : "review-incorrect"}">
                  <span class="text-lg">${r.correct ? "\u2713" : "\u2717"}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-700 truncate">${ex.sentence || ex.question || "Exercise"}</p>
                    ${!r.correct ? `<p class="text-xs text-rose-600">\u2192 ${correctAnswer}</p>` : ""}
                  </div>
                </div>`;
  }).join("")}
          </div>
        </div>

        <div class="flex flex-col gap-3 mt-8">
          <button onclick="navigate('/practice/${topicId}')" class="btn-primary py-3">
            \u{1F501} Practice Again
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
async function renderStats() {
  ROOT.innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`;
  const stats = store.getStats();
  const { level, xpInLevel } = xpLevel(stats.totalXP);
  const recent = store.getRecentSessions(5);
  const topicRows = await Promise.all(state.manifest.topics.map(async (meta) => {
    let progress = { seen: 0, total: 0, mastered: 0, percentage: 0, seenPercentage: 0, masteredPercentage: 0 };
    try {
      const data = await loadTopic(meta.id);
      progress = store.getTopicProgress(data.exercises || []);
    } catch {
    }
    const c = colorFor(meta.color);
    const display = topicProgressDisplay(progress);
    return `
      <div class="flex items-center gap-3">
        <span class="text-2xl">${meta.icon}</span>
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-700">${meta.subtopic}</p>
          <p class="text-xs text-gray-400 mb-1">${display.practiced} \xB7 ${display.mastered}</p>
          ${progressBar(display.percentage, c.bg)}
        </div>
        <span class="text-sm font-bold text-gray-600">${display.percentage}%</span>
      </div>`;
  }));
  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="back-bar">
        <span class="text-lg font-bold text-gray-800">\u{1F4CA} Statistics</span>
      </div>
      <div class="max-w-xl mx-auto px-4 mt-4">

        <!-- XP & Level -->
        <div class="card mb-4 text-center">
          <div class="text-5xl font-extrabold text-violet-600">Lv. ${level}</div>
          <p class="text-gray-500 text-sm mt-1">${stats.totalXP} XP total</p>
          ${progressBar(xpInLevel, "bg-amber-400")}
          <p class="text-xs text-gray-400 mt-1">${xpInLevel}/100 XP to Level ${level + 1}</p>
        </div>

        <!-- Streak -->
        <div class="card mb-4">
          <div class="flex justify-around text-center">
            <div>
              <div class="text-3xl font-bold text-orange-500">${stats.streak.current} \u{1F525}</div>
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
          ${progressBar(stats.accuracy, "bg-emerald-500")}
          <div class="flex justify-between text-sm text-gray-500 mt-1">
            <span>${stats.totalCorrect} correct</span>
            <span>${stats.accuracy}%</span>
            <span>${stats.totalAttempts} total</span>
          </div>
        </div>

        <!-- Per-topic progress -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Topic Progress</h2>
          <div class="space-y-3">${topicRows.join("")}</div>
        </div>

        <!-- Recent sessions -->
        ${recent.length > 0 ? `
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-3">Recent Sessions</h2>
          <div class="space-y-2">
            ${recent.map((s) => {
    const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : null;
    const meta = topicMeta(s.topicId);
    const pctClass = pct === null ? "text-gray-400" : pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-500" : "text-rose-500";
    return `
                <div class="flex items-center justify-between text-sm">
                  <span>${meta?.icon || "\u{1F4DA}"} ${meta?.subtopic || s.topicId}</span>
                  <span class="text-gray-400">${new Date(s.date).toLocaleDateString()}</span>
                  <span class="${pctClass} font-medium">${pct === null ? "\u2014" : `${pct}%`}</span>
                </div>`;
  }).join("")}
          </div>
        </div>` : ""}

      </div>
    </div>
    ${navBar("/stats")}
  `;
}
function renderSettings() {
  const qps = store.getSetting("questionsPerSession");
  const hints = store.getSetting("showHints");
  const darkSetting = store.getSetting("darkMode");
  const darkValue = darkSetting === true ? "dark" : darkSetting === false ? "light" : "auto";
  ROOT.innerHTML = `
    <div class="page-container pb-24">
      <div class="back-bar">
        <span class="text-lg font-bold text-gray-800">\u2699\uFE0F Settings</span>
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
              <option value="auto"  ${darkValue === "auto" ? "selected" : ""}>\u{1F313} Auto</option>
              <option value="dark"  ${darkValue === "dark" ? "selected" : ""}>\u{1F319} Dark</option>
              <option value="light" ${darkValue === "light" ? "selected" : ""}>\u2600\uFE0F Light</option>
            </select>
          </div>

          <div class="setting-row mt-3">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Questions per session</p>
              <p class="text-xs text-gray-400">How many exercises per practice session</p>
            </div>
            <select id="qps-select" class="select-input">
              ${[5, 10, 15, 20].map((n) => `<option value="${n}" ${n === qps ? "selected" : ""}>${n}</option>`).join("")}
            </select>
          </div>

          <div class="setting-row mt-3">
            <div>
              <p class="font-medium text-gray-700 dark:text-gray-200">Show hints</p>
              <p class="text-xs text-gray-400">Show verb hints in fill-blank exercises</p>
            </div>
            <label class="toggle">
              <input type="checkbox" id="hints-toggle" ${hints ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Data management -->
        <div class="card mb-4">
          <h2 class="font-bold text-gray-700 mb-4">Data</h2>
          <div class="space-y-3">
            <button id="export-btn" class="btn-secondary w-full">\u{1F4E4} Export Progress</button>
            <label class="btn-secondary w-full text-center cursor-pointer block">
              \u{1F4E5} Import Progress
              <input type="file" id="import-file" accept=".json" class="hidden">
            </label>
            <button id="reset-btn" class="btn-danger w-full">\u{1F5D1}\uFE0F Reset All Progress</button>
          </div>
        </div>

        <div class="card text-center">
          <p class="text-sm text-gray-400">${APP_NAME} \xB7 English Grammar Learning</p>
          <p class="text-xs text-gray-300 mt-1">Add content via <code>content/topics/</code> JSON files</p>
        </div>
      </div>
    </div>
    ${navBar("/settings")}
  `;
  ROOT.querySelector("#dark-select").addEventListener("change", (e) => {
    const val = e.target.value;
    const setting = val === "dark" ? true : val === "light" ? false : null;
    store.updateSettings({ darkMode: setting });
    applyDarkMode();
  });
  ROOT.querySelector("#qps-select").addEventListener("change", (e) => store.updateSettings({ questionsPerSession: parseInt(e.target.value) }));
  ROOT.querySelector("#hints-toggle").addEventListener("change", (e) => store.updateSettings({ showHints: e.target.checked }));
  ROOT.querySelector("#export-btn").addEventListener("click", () => {
    const blob = new Blob([store.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "grammardeck-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  });
  ROOT.querySelector("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = store.importJSON(ev.target.result);
      showToast(ok ? "\u2705 Progress imported!" : "\u274C Invalid file");
      if (ok) {
        applyDarkMode();
        renderSettings();
      }
    };
    reader.readAsText(file);
  });
  ROOT.querySelector("#reset-btn").addEventListener("click", () => {
    if (confirm("Reset ALL progress? This cannot be undone.")) {
      store.resetAll();
      showToast("Progress reset.");
      renderHome();
    }
  });
}
function applyDarkMode() {
  const setting = store.getSetting("darkMode");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldDark = setting === null || setting === void 0 ? systemDark : setting === true;
  document.documentElement.classList.toggle("dark", shouldDark);
}
window.navigate = navigate;
window.confirmExitSession = () => {
  if (confirm("Exit this session? Your progress so far will be saved.")) {
    if (state.session) endSession();
    else navigate("/");
  }
};
window.confirmResetTopic = async (id) => {
  if (confirm("Reset progress for this topic?")) {
    const data = await loadTopic(id);
    store.resetTopic(data.exercises || []);
    showToast("Topic progress reset.");
    renderTopic(id);
  }
};
function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-show"));
  setTimeout(() => {
    el.classList.remove("toast-show");
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
function markdownToHtml(md) {
  if (!md) return "";
  const html = md.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`(.+?)`/g, '<code class="inline-code">$1</code>').replace(/^(#{1,3}) (.+)$/gm, (_, h, t) => `<h${h.length} class="lesson-h${h.length}">${t}</h${h.length}>`).replace(/^📌 (.+)$/gm, '<p class="use-case">\u{1F4CC} $1</p>').replace(/^⏰ (.+)$/gm, '<p class="use-case">\u23F0 $1</p>').replace(/^🔁 (.+)$/gm, '<p class="use-case">\u{1F501} $1</p>').replace(/^⚠️ (.+)$/gm, '<p class="warning-case">\u26A0\uFE0F $1</p>').replace(/^🔤 (.+)$/gm, '<p class="rule-case">\u{1F524} $1</p>').replace(/^• (.+)$/gm, '<li class="lesson-li">$1</li>').replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul class="lesson-ul">${m}</ul>`).replace(/\|(.+)\|/g, (match) => {
    const cells = match.split("|").filter((c) => c.trim() !== "");
    if (cells.length === 0) return match;
    return "<tr>" + cells.map((c) => `<td class="table-cell">${c.trim()}</td>`).join("") + "</tr>";
  }).replace(/(<tr>.*<\/tr>\n?)+/g, (m) => `<table class="lesson-table">${m}</table>`);
  return html.split(/\n\n+/).map((p) => {
    const trimmed = p.trim();
    if (trimmed.startsWith("<") && /^(<h|<p|<ul|<table|<div)/.test(trimmed)) return trimmed;
    return `<p class="lesson-p">${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).join("");
}
init().catch((err) => {
  ROOT.innerHTML = `
    <div class="max-w-xl mx-auto px-4 py-12 text-center">
      <p class="text-5xl">\u{1F615}</p>
      <h1 class="text-xl font-bold text-gray-700 mt-4">Could not load ${APP_NAME}</h1>
      <p class="text-gray-500 text-sm mt-2">${err.message}</p>
      <p class="text-xs text-gray-400 mt-2">Make sure you're running this from a web server, not file://</p>
    </div>`;
});
