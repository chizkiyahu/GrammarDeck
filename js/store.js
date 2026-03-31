// ============================================================
// store.js — localStorage data layer with spaced repetition
// ============================================================

// Keep the legacy key so existing user progress survives branding changes.
const STORE_KEY = 'grammemo_v1';
const XP_PER_CORRECT = 10;
const XP_PER_SESSION = 25;

class Store {
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
      questionScores: {},   // { [questionId]: ScoreRecord }
      sessions: [],         // SessionRecord[]
      streak: { current: 0, longest: 0, lastDate: null },
      totalXP: 0,
      settings: {
        questionsPerSession: 10,
        showHints: true,
        soundEnabled: false,
        darkMode: null,   // null = auto (system), true = force dark, false = force light
      },
      version: 1,
    };
  }

  _normalizeData(data) {
    const defaults = this._defaultData();
    const input = data && typeof data === 'object' ? data : {};

    const questionScores = {};
    if (input.questionScores && typeof input.questionScores === 'object') {
      for (const [id, score] of Object.entries(input.questionScores)) {
        if (!id || !score || typeof score !== 'object') continue;
        questionScores[id] = {
          correct: Number.isFinite(score.correct) ? Math.max(0, score.correct) : 0,
          incorrect: Number.isFinite(score.incorrect) ? Math.max(0, score.incorrect) : 0,
          streak: Number.isFinite(score.streak) ? Math.max(0, score.streak) : 0,
          lastSeen: Number.isFinite(score.lastSeen) ? score.lastSeen : null,
          interval: Number.isFinite(score.interval) && score.interval > 0 ? score.interval : 1,
          nextReview: Number.isFinite(score.nextReview) ? score.nextReview : 0,
        };
      }
    }

    const sessions = Array.isArray(input.sessions)
      ? input.sessions
          .filter(session => Number.isFinite(session?.total) && session.total > 0)
          .map(session => ({
            topicId: session.topicId,
            date: Number.isFinite(session.date) ? session.date : Date.now(),
            correct: Number.isFinite(session.correct)
              ? Math.max(0, Math.min(session.correct, session.total))
              : 0,
            total: session.total,
            duration: Number.isFinite(session.duration) ? Math.max(0, session.duration) : 0,
            xp: Number.isFinite(session.xp)
              ? Math.max(0, session.xp)
              : ((Number.isFinite(session.correct) ? Math.max(0, session.correct) : 0) * XP_PER_CORRECT) + XP_PER_SESSION,
          }))
      : [];

    return {
      ...defaults,
      ...input,
      questionScores,
      sessions,
      streak: {
        ...defaults.streak,
        ...(input.streak || {}),
        current: Number.isFinite(input.streak?.current) ? Math.max(0, input.streak.current) : defaults.streak.current,
        longest: Number.isFinite(input.streak?.longest) ? Math.max(0, input.streak.longest) : defaults.streak.longest,
        lastDate: typeof input.streak?.lastDate === 'string' ? input.streak.lastDate : defaults.streak.lastDate,
      },
      totalXP: Number.isFinite(input.totalXP) ? Math.max(0, input.totalXP) : defaults.totalXP,
      settings: {
        ...defaults.settings,
        ...(input.settings || {}),
        questionsPerSession: Number.isFinite(input.settings?.questionsPerSession)
          ? input.settings.questionsPerSession
          : defaults.settings.questionsPerSession,
        showHints: typeof input.settings?.showHints === 'boolean'
          ? input.settings.showHints
          : defaults.settings.showHints,
        soundEnabled: typeof input.settings?.soundEnabled === 'boolean'
          ? input.settings.soundEnabled
          : defaults.settings.soundEnabled,
        darkMode: input.settings?.darkMode === true
          ? true
          : input.settings?.darkMode === false
            ? false
            : null,
      },
      version: defaults.version,
    };
  }

  // ── Question Scores ────────────────────────────────────────

  getQuestionScore(id) {
    return this.data.questionScores[id] || {
      correct: 0,
      incorrect: 0,
      streak: 0,
      lastSeen: null,
      interval: 1,       // days until next review
      nextReview: 0,     // timestamp
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
      // Simple SM-2 inspired interval growth (capped at 30 days)
      score.interval = Math.min(Math.round(score.interval * 2.5), 30);
    } else {
      score.incorrect++;
      score.streak = 0;
      score.interval = 1;
    }

    score.lastSeen = now;
    score.nextReview = now + score.interval * 86_400_000;

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

      // Never seen → highest priority
      const aNew = !sa || !sa.lastSeen;
      const bNew = !sb || !sb.lastSeen;
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      if (aNew && bNew) return 0;

      // Due for review → second priority
      const aDue = sa.nextReview <= now;
      const bDue = sb.nextReview <= now;
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;

      // Among items due: show least-recently-seen first
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
        masteredPercentage: 0,
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
    const seenPercentage = Math.round((seen / total) * 100);
    const masteredPercentage = Math.round((mastered / total) * 100);
    return {
      seen,
      total,
      mastered,
      percentage: seenPercentage,
      seenPercentage,
      masteredPercentage,
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
      xp: correct * XP_PER_CORRECT + XP_PER_SESSION,
    });
    this.data.totalXP += XP_PER_SESSION;
    // Keep last 200 sessions
    if (this.data.sessions.length > 200) {
      this.data.sessions = this.data.sessions.slice(-200);
    }
    this._save();
    return true;
  }

  getRecentSessions(n = 10) {
    return this.data.sessions.filter(session => session.total > 0).slice(-n).reverse();
  }

  getTopicSessions(topicId) {
    return this.data.sessions.filter(s => s.topicId === topicId);
  }

  // ── Streak ─────────────────────────────────────────────────

  /** Call once per day when the user does any activity */
  touchStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const { streak } = this.data;

    if (streak.lastDate === today) return streak; // already updated

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
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    return {
      totalXP: this.data.totalXP,
      streak: this.data.streak,
      totalAttempts,
      totalCorrect,
      accuracy,
      totalSessions: this.data.sessions.length,
      questionsAttempted: scores.filter(s => s.lastSeen).length,
    };
  }
}

export const store = new Store();
