# GrammarDeck – Content Schema

This document explains how to add new topics and exercises to GrammarDeck.
An AI agent (or human) can follow these instructions to extend the content library.

---

## File locations

| File | Purpose |
|------|---------|
| `content/manifest.json` | Master index of all topics |
| `content/topics/<id>.json` | Individual topic with lessons & exercises |

---

## Step 1 — Register the topic in `manifest.json`

Add an entry to the `topics` array:

```json
{
  "id": "002.0",
  "title": "Present Continuous – Positive",
  "topic": "Present Continuous",
  "subtopic": "Positive",
  "order": 4,
  "description": "How to form positive sentences in the Present Continuous",
  "icon": "🔄",
  "color": "blue",
  "file": "content/topics/002.0.json"
}
```

**Field reference:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Unique ID, e.g. `"002.0"`. Follow the `NNN.N` convention. |
| `title` | string | ✅ | Full display title |
| `topic` | string | ✅ | Grammar topic group (e.g. `"Present Continuous"`) |
| `subtopic` | string | ✅ | Specific sub-area (e.g. `"Positive"`) |
| `order` | number | ✅ | Display order on Home screen |
| `description` | string | ✅ | One-line description |
| `icon` | string | ✅ | A single emoji |
| `color` | string | ✅ | One of: `violet`, `emerald`, `rose`, `blue` |
| `file` | string | ✅ | Relative path to the topic JSON file |

---

## Step 2 — Create the topic JSON file

Create `content/topics/002.0.json`:

```json
{
  "id": "002.0",
  "title": "Present Continuous – Positive",
  "topic": "Present Continuous",
  "subtopic": "Positive",
  "description": "...",
  "lessons": [ ... ],
  "exercises": [ ... ]
}
```

### Lessons (theory)

```json
{
  "id": "002.0-lesson-1",
  "title": "Structure",
  "content": "Markdown-like content (see notes below)"
}
```

Content supports:
- `**bold**`, `*italic*`, `` `code` ``
- `📌 ...` lines → highlighted use-case block
- `⚠️ ...` lines → warning block
- `🔤 ...` lines → rule block
- `| col | col |` → table row
- `• item` → bullet list

---

## Exercise Types

Every exercise object requires:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Must be **globally unique**. Convention: `topicId-type-N` e.g. `002.0-fb-1` |
| `type` | string | ✅ | See types below |
| `difficulty` | number | ✅ | `1` = easy, `2` = medium, `3` = hard |
| `tags` | string[] | ✅ | e.g. `["positive", "third-person"]` |
| `explanation` | string | — | Shown after wrong answer |

---

### Type: `flashcard`

```json
{
  "id": "002.0-fc-1",
  "type": "flashcard",
  "question": "How do we form the Present Continuous?",
  "answer": "Subject + am/is/are + verb-ing\n\ne.g. 'I am eating.'",
  "explanation": "Optional extra note",
  "tags": ["theory"],
  "difficulty": 1
}
```

---

### Type: `fill-blank`

Use `{_}` as the blank placeholder in the sentence.

```json
{
  "id": "002.0-fb-1",
  "type": "fill-blank",
  "instruction": "Complete the sentence with the correct form.",
  "sentence": "She {_} to music right now.",
  "hint": "listen",
  "answers": ["is listening"],
  "explanation": "Third person singular (She) + is + verb-ing.",
  "tags": ["positive", "third-person"],
  "difficulty": 1
}
```

**Multiple accepted answers:** put all valid forms in the `answers` array:
```json
"answers": ["don't watch", "do not watch"]
```

---

### Type: `multiple-choice`

Use `{_}` as the blank in the sentence (optional).

```json
{
  "id": "002.0-mc-1",
  "type": "multiple-choice",
  "sentence": "They {_} football at the moment.",
  "options": ["play", "are playing", "plays", "is playing"],
  "correct": 1,
  "explanation": "Third person plural (They) + are + verb-ing.",
  "tags": ["positive"],
  "difficulty": 1
}
```

- `options`: array of exactly **4** strings
- `correct`: **0-based** index of the correct option

---

### Type: `error-correction`

Show an incorrect sentence; the user types the corrected version.

```json
{
  "id": "002.0-ec-1",
  "type": "error-correction",
  "sentence": "She is play the guitar.",
  "answers": ["She is playing the guitar."],
  "explanation": "Use verb-ing: is playing.",
  "tags": ["error-correction"],
  "difficulty": 2
}
```

---

### Type: `sentence-transform`

Show a sentence; the user rewrites it in a different form.

```json
{
  "id": "002.0-st-1",
  "type": "sentence-transform",
  "instruction": "Change to the negative form.",
  "sentence": "He is sleeping.",
  "answers": ["He is not sleeping.", "He isn't sleeping."],
  "explanation": "Negative: subject + is not/isn't + verb-ing.",
  "tags": ["negative", "sentence-transform"],
  "difficulty": 2
}
```

---

## Tips for AI Agents

1. **IDs must be unique** — check existing files before reusing an ID.
2. **Keep sentences natural** — use real-world examples.
3. **Always include `explanation`** — it helps learners understand mistakes.
4. **Add multiple `answers`** for exercises where contractions are optional  
   e.g. `["doesn't eat", "does not eat"]`
5. **Balance difficulty** — aim for ~60% difficulty 1, ~30% difficulty 2, ~10% difficulty 3 per topic.
6. **Use consistent tags** — reuse existing tags when possible  
   Common tags: `positive`, `negative`, `third-person`, `third-person-plural`, `first-person`,  
   `second-person`, `error-correction`, `sentence-transform`, `stative-verbs`, `spelling`, `word-order`, `facts`, `routines`
7. **Register in manifest** — don't forget to add the topic to `content/manifest.json`.

---

## Current topic IDs

| ID | Title |
|----|-------|
| `001.0` | Present Simple – Rationale |
| `001.1` | Present Simple – Positive |
| `001.2` | Present Simple – Negative |

Next available ID: `001.3` (e.g., Present Simple – Questions) or `002.0` (next grammar topic)
