import { describe, expect, it } from 'vitest';
import { renderWorksheet, findImagePlaceholders, sliceWorksheetMarkdown } from '../src/lib/worksheetForm';

describe('worksheetForm — sliceWorksheetMarkdown (per-level export/print)', () => {
  const SHEET = `# W\n\nshared intro\n\n## 🟢 Support\n| Q | Type your answer here |\n|---|---|\n| Easy? | |\n\n## 🟡 Core\n| Q | Type your answer here |\n|---|---|\n| Medium? | |\n`;
  it('keeps shared + the chosen level, drops the level heading and other levels', () => {
    const core = sliceWorksheetMarkdown(SHEET, 'core');
    expect(core).toContain('shared intro');
    expect(core).toContain('Medium?');
    expect(core).not.toContain('Easy?');
    expect(core).not.toContain('🟡'); // the level label is dropped (unlabelled, like the pupil view)
  });
  it('the sliced markdown renders to just that level\'s fields', () => {
    const supportFields = renderWorksheet(sliceWorksheetMarkdown(SHEET, 'support'), { mode: 'review' }).fields;
    expect(supportFields.some((f) => f.label.includes('Easy?'))).toBe(true);
    expect(supportFields.some((f) => f.label.includes('Medium?'))).toBe(false);
  });
});

describe('worksheetForm — image-gap placeholders (pre-lesson to-do)', () => {
  it('extracts every `[show: …]` description', () => {
    const md = `# Lesson\n\n> 🖼️ [show: a binary to denary diagram]\n\nText.\n\n> 🖼️ [show: screenshot of the for loop]\n`;
    expect(findImagePlaceholders(md)).toEqual(['a binary to denary diagram', 'screenshot of the for loop']);
  });
  it('returns nothing when there are no placeholders', () => {
    expect(findImagePlaceholders('# Lesson\n\nAll good, no images needed.')).toEqual([]);
  });
});

// A representative generated worksheet: a name/date header table, shared instructions, three
// differentiation sections each with an answer table, and a shared success checklist.
const SHEET = `# Photosynthesis worksheet

| Name | Type your name here |
|------|---------------------|
| Date | Type the date here |

## Instructions
Type your answers in the boxes.

## 🟢 Support

| Question | Type your answer here |
|----------|----------------------|
| What gas do plants take in? | |
| What do plants need from the sun? | |

## 🟡 Core

| Question | Type your answer here |
|----------|----------------------|
| Name the green chemical in leaves. | |

## 🔴 Challenge

| Question | Type your answer here |
|----------|----------------------|
| Explain why leaves are green. | |

## ✅ Success checklist
- [ ] I typed my name
- [ ] I answered every question
`;

describe('worksheetForm — field keys', () => {
  it('derives stable keys from the FULL document regardless of slice', () => {
    const full = renderWorksheet(SHEET, { mode: 'review' });
    const core = renderWorksheet(SHEET, { mode: 'review', level: 'core' });
    // The Core question is the 4th answer table in document order (name, support×2-table, core).
    const coreField = core.fields.find((f) => f.label.includes('green chemical'));
    const sameInFull = full.fields.find((f) => f.label.includes('green chemical'));
    expect(coreField).toBeDefined();
    expect(coreField!.key).toBe(sameInFull!.key); // key identical sliced vs whole
  });

  it('checklist items get task.N keys in document order', () => {
    const full = renderWorksheet(SHEET, { mode: 'review' });
    const checks = full.fields.filter((f) => f.kind === 'check');
    expect(checks.map((c) => c.key)).toEqual(['task.1', 'task.2']);
  });

  it('detects that the document has differentiation levels', () => {
    expect(renderWorksheet(SHEET, { mode: 'review' }).hasLevels).toBe(true);
  });
});

describe('worksheetForm — level slicing', () => {
  it('a pupil sees shared parts + only their level (unlabelled inputs)', () => {
    const core = renderWorksheet(SHEET, { mode: 'form', level: 'core' });
    // Core question present; Support and Challenge questions absent.
    expect(core.html).toContain('green chemical');
    expect(core.html).not.toContain('What gas do plants take in');
    expect(core.html).not.toContain('Explain why leaves are green');
    // Shared parts present.
    expect(core.html).toContain('Type your answers in the boxes');
    expect(core.html).toContain('I typed my name');
    // The level NAME is never shown to the pupil (slice is unlabelled).
    expect(core.html).not.toContain('🟡');
    expect(core.html).not.toContain('Core');
  });

  it('the full document includes every level (teacher read-back)', () => {
    const full = renderWorksheet(SHEET, { mode: 'review' });
    const textFields = full.fields.filter((f) => f.kind === 'text');
    // name + date + 2 support + 1 core + 1 challenge = 6 text answer fields
    expect(textFields.length).toBe(6);
  });
});

describe('worksheetForm — form vs review mode', () => {
  it('form mode emits autosave inputs targeting the action URL', () => {
    const core = renderWorksheet(SHEET, { mode: 'form', level: 'support', action: '/me/answer?oc=5' });
    expect(core.html).toContain('<textarea');
    expect(core.html).toContain('/me/answer?oc=5&amp;key=');
    expect(core.html).toContain('type="checkbox"');
    expect(core.html).not.toContain('disabled'); // checkboxes are live in form mode
  });

  it('review mode shows saved values read-only', () => {
    const values = new Map<string, string>();
    const probe = renderWorksheet(SHEET, { mode: 'review', level: 'core' });
    const key = probe.fields.find((f) => f.label.includes('green chemical'))!.key;
    values.set(key, 'chlorophyll');
    const review = renderWorksheet(SHEET, { mode: 'review', level: 'core', values });
    expect(review.html).toContain('chlorophyll');
    expect(review.html).not.toContain('<textarea');
    expect(review.html).toContain('ws-empty'); // unanswered fields show a dash
  });
});

describe('worksheetForm — choice fields (multiple-choice / true-false)', () => {
  const MD = `# Quiz

| Question | Type your answer here |
|---|---|
| Which part does calculations? | ( ) RAM ( ) CPU ( ) SSD |
| The CPU has cores. | ( ) True ( ) False |
`;

  it('a "( ) a ( ) b" cell becomes a choice field carrying its options on a stable t.r.c key', () => {
    const choices = renderWorksheet(MD, { mode: 'review' }).fields.filter((f) => f.kind === 'choice');
    expect(choices).toHaveLength(2);
    expect(choices[0]!.key).toBe('t1.r1.c2');
    expect(choices[0]!.options).toEqual(['RAM', 'CPU', 'SSD']);
    expect(choices[1]!.options).toEqual(['True', 'False']);
    // the canonical "Type your answer here" header must NOT be promoted to a data row (no phantom r0)
    expect(renderWorksheet(MD, { mode: 'review' }).fields.some((f) => f.key === 't1.r0.c2')).toBe(false);
  });

  it('form mode renders an autosaving radio group per question', () => {
    const r = renderWorksheet(MD, { mode: 'form', action: '/me/answer?oc=5' });
    expect(r.html).toContain('type="radio"');
    expect(r.html).toContain('name="value"');
    expect(r.html).toContain('<fieldset class="ws-choice"');
    expect(r.html).toContain('hx-post="/me/answer?oc=5&amp;key=t1.r1.c2"');
    expect(r.html).toContain('value="CPU"');
  });

  it('review marks the chosen option, form pre-checks it, preview is inert', () => {
    const values = new Map([['t1.r1.c2', 'CPU']]);
    const review = renderWorksheet(MD, { mode: 'review', values });
    expect(review.html).toContain('chosen');
    expect(review.html).not.toContain('type="radio"');
    const form = renderWorksheet(MD, { mode: 'form', values, action: '/me/answer' });
    expect(form.html).toMatch(/value="CPU"\s+checked/);
    expect(renderWorksheet(MD, { mode: 'preview' }).html).toContain('disabled');
  });

  it('choice field keys are identical full vs level-sliced', () => {
    const levelled = `## 🟢 Support\n\n| Question | Type your answer here |\n|---|---|\n| Easy pick | ( ) a ( ) b |\n\n## 🟡 Core\n\n| Question | Type your answer here |\n|---|---|\n| Core pick | ( ) x ( ) y |\n`;
    const full = renderWorksheet(levelled, { mode: 'review' });
    const core = renderWorksheet(levelled, { mode: 'review', level: 'core' });
    const inFull = full.fields.find((f) => f.label.includes('Core pick'))!;
    const inCore = core.fields.find((f) => f.label.includes('Core pick'))!;
    expect(inCore.key).toBe(inFull.key);
    expect(inCore.kind).toBe('choice');
  });
});

// Locks the structure real generated worksheets use: level "## " sections, "###" subtasks,
// fenced code containing `#` Python comments and the word "Challenge", and answer tables inside
// each level — the exact shapes that previously broke level detection.
const REAL_SHAPED = `# What's in a List? — Lesson 1

## Before you start
Check your level at the top of the file.

| Name | Type your name here |
|------|---------------------|

## 🟢 Support Task

### Task 1 — Add your name
Type this in your file:
\`\`\`python
# My name is: [type your name here]
\`\`\`

### Task 2 — Run the code
| Question | Type your answer here |
|----------|----------------------|
| What appeared? | |

### 🟢 Success checklist
- [ ] I ran the code

## 🟡 Core Task

### Task 1 — Choose a theme
| Question | Type your answer here |
|----------|----------------------|
| Your theme? | |
| How many items? | |

### 🟡 Success checklist
- [ ] I chose a theme

## 🔴 Challenge Task

\`\`\`python
# Challenge: build your own list
# Step 1: create a list
\`\`\`

### Task 1 — Explain index 0
| Question | Type your answer here |
|----------|----------------------|
| Why is index 0 first? | |
`;

describe('worksheetForm — real-world structure (regression)', () => {
  it('partitions answer tables into their level despite code fences and #-comments', () => {
    const counts = (lvl: 'support' | 'core' | 'challenge'): number =>
      renderWorksheet(REAL_SHAPED, { mode: 'form', level: lvl }).fields.filter((f) => f.kind === 'text').length;
    // shared name field is in every slice; support has 1 Q, core has 2 Q, challenge has 1 Q.
    expect(counts('support')).toBe(1 /*name*/ + 1);
    expect(counts('core')).toBe(1 /*name*/ + 2);
    expect(counts('challenge')).toBe(1 /*name*/ + 1);
  });

  it('a #-comment inside a code fence never resets the level', () => {
    // "# Challenge: build your own list" is inside a fence — it must NOT pull the challenge
    // content into a depth-1 level or strand the support/core tables in "shared".
    const support = renderWorksheet(REAL_SHAPED, { mode: 'form', level: 'support' });
    expect(support.html).toContain('What appeared?'); // support's own table
    expect(support.html).not.toContain('Why is index 0 first?'); // challenge stays out
  });

  it('code fences render but their contents never become input fields', () => {
    const full = renderWorksheet(REAL_SHAPED, { mode: 'review' });
    expect(full.fields.every((f) => !f.label.includes('My name is'))).toBe(true);
  });
});

describe('worksheetForm — parsing edge cases (2nd-review regressions)', () => {
  it('an UNCLOSED code fence does not swallow the following level section', () => {
    const src = `# Sheet

## 🟢 Support
| Q | Type your answer here |
|---|---|
| Easy one? | |

\`\`\`python
# an example with no closing fence
## 🔴 Challenge
| Q | Type your answer here |
|---|---|
| Hard one? | |
`;
    // Despite the stray ``` , the challenge slice must still expose its answer field.
    const challenge = renderWorksheet(src, { mode: 'form', level: 'challenge' });
    expect(challenge.fields.filter((f) => f.kind === 'text').length).toBeGreaterThanOrEqual(1);
    expect(challenge.html).toContain('Hard one?');
  });

  it('a BALANCED fence whose comment contains a level word stays opaque (no false split)', () => {
    const src = `# Sheet

## 🔴 Challenge
\`\`\`python
# Challenge: build your own list
# Step 1
\`\`\`
| Q | Type your answer here |
|---|---|
| Explain? | |
`;
    const challenge = renderWorksheet(src, { mode: 'form', level: 'challenge' });
    expect(challenge.fields.filter((f) => f.kind === 'text').length).toBe(1);
    expect(challenge.html).toContain('Explain?');
  });

  it('a table cell containing a pipe inside backticks is not split into phantom columns', () => {
    const src = `# Sheet

| Question | Type your answer here |
|----------|----------------------|
| What does \`a|b\` mean? | |
`;
    const r = renderWorksheet(src, { mode: 'form' });
    const text = r.fields.filter((f) => f.kind === 'text');
    expect(text).toHaveLength(1); // one answer cell, not two phantom ones
    expect(text[0]!.key).toBe('t1.r1.c2'); // stable key, not shifted to c3
    expect(text[0]!.label).toContain('a|b'); // the pipe survives in the question label
  });

  it('an escaped pipe in a cell is treated as a literal pipe', () => {
    const src = `# Sheet

| Question | Type your answer here |
|----------|----------------------|
| Is a \\| a wall? | |
`;
    const r = renderWorksheet(src, { mode: 'form' });
    expect(r.fields.filter((f) => f.kind === 'text')).toHaveLength(1);
  });

  it('a single-dash separator row is stripped, not turned into a fillable row', () => {
    const src = `# Sheet

| Q | Type your answer here |
| - | - |
| Q1? | |
`;
    const r = renderWorksheet(src, { mode: 'form' });
    const text = r.fields.filter((f) => f.kind === 'text');
    expect(text).toHaveLength(1); // only Q1, not the separator
    expect(text[0]!.key).toBe('t1.r1.c2'); // Q1 at row 1, not row 2
    expect(text[0]!.label).toContain('Q1');
  });

  it('an answer table with a MISSING separator still produces input cells (not prose)', () => {
    const src = `# Sheet

| Question | Type your answer here |
| What is 2+2? | |
`;
    const r = renderWorksheet(src, { mode: 'form' });
    expect(r.fields.filter((f) => f.kind === 'text')).toHaveLength(1);
    expect(r.html).toContain('<textarea');
  });
});

describe('worksheetForm — key stability across header flip + ragged rows (deep-review regression)', () => {
  it('a header-as-data row is the fixed r0; the body answer row starts at r1 (never pushed to r2)', () => {
    // name/date layout: the header row itself is fillable. The header field must be r0 and the
    // first body answer row r1 — so if a re-version later flips this to a column-label header, the
    // body answer (and any saved value/mark) stays on r1 instead of silently shifting.
    const src = `# Sheet\n\n| Name | Type your name here |\n|------|---------------------|\n| What is your favourite topic? | Type your answer here |\n`;
    const r = renderWorksheet(src, { mode: 'review' });
    const keys = r.fields.filter((f) => f.kind === 'text').map((f) => f.key);
    expect(keys).toEqual(['t1.r0.c2', 't1.r1.c2']);
  });

  it('a Q&A table (header names the answer column) numbers body answers r1, r2, … with no r0', () => {
    const src = `# Sheet\n\n| Question | Type your answer here |\n|----------|----------------------|\n| First? | |\n| Second? | |\n`;
    const r = renderWorksheet(src, { mode: 'review' });
    const keys = r.fields.filter((f) => f.kind === 'text').map((f) => f.key);
    expect(keys).toEqual(['t1.r1.c2', 't1.r2.c2']); // header is a label, not a field — no r0
  });

  it('a ragged body row (missing its trailing answer cell) still yields a fillable input at the answer column', () => {
    const src = `# Sheet\n\n| Question | Type your answer here |\n|----------|----------------------|\n| Short |\n| Proper question? | |\n`;
    const r = renderWorksheet(src, { mode: 'form' });
    const text = r.fields.filter((f) => f.kind === 'text');
    // The short row's missing answer cell is still rendered as an input in column 2 (colCount =
    // widest row), and column indices don't drift for the following row.
    expect(text.map((f) => f.key)).toEqual(['t1.r1.c2', 't1.r2.c2']);
    expect(r.html).toContain('<textarea');
  });
});

describe('worksheetForm — robustness', () => {
  it('a sheet with no level headings is all shared (every pupil sees it whole)', () => {
    const flat = `# Quiz\n\n| Q | Type your answer here |\n|---|---|\n| 2+2? | |\n`;
    const r = renderWorksheet(flat, { mode: 'form', level: 'support' });
    expect(r.hasLevels).toBe(false);
    expect(r.html).toContain('2+2?');
    expect(r.fields.filter((f) => f.kind === 'text')).toHaveLength(1);
  });

  it('a reference table without answer columns stays read-only (no inputs)', () => {
    const ref = `# Reference\n\n| Term | Meaning |\n|------|---------|\n| CPU | the processor |\n`;
    const r = renderWorksheet(ref, { mode: 'form' });
    expect(r.fields).toHaveLength(0);
    expect(r.html).not.toContain('<textarea');
    expect(r.html).toContain('the processor');
  });

  it('the name/date header table becomes inputs (placeholder in the header)', () => {
    const r = renderWorksheet(SHEET, { mode: 'form', level: 'support' });
    // Both "Type your name here" and "Type the date here" become text inputs.
    const t1 = r.fields.filter((f) => f.key.startsWith('t1.'));
    expect(t1.length).toBe(2);
  });
});

// Real worksheets prompt answers with far more than the literal "type … here". These shapes used to
// render read-only (no answer boxes) — the reported "missing answer spaces" bug.
describe('worksheetForm — broadened answer detection (missing-answer-space bug)', () => {
  it('an answer column whose header has no "here" still produces inputs (the "index" table)', () => {
    const src = `# S\n\n| Index number | Type the item at that position |\n|---|---|\n| index 0 | |\n| index 1 | |\n`;
    const r = renderWorksheet(src, { mode: 'form' });
    const text = r.fields.filter((f) => f.kind === 'text');
    expect(text.map((f) => f.key)).toEqual(['t1.r1.c2', 't1.r2.c2']);
    expect(r.html).toContain('<textarea');
  });

  it('a header-only "Paste here" table renders the header as the fillable row (r0)', () => {
    const src = `# S\n\n| Screenshot — pin program | Paste here |\n|---|---|\n`;
    const r = renderWorksheet(src, { mode: 'form' });
    const text = r.fields.filter((f) => f.kind === 'text');
    expect(text).toHaveLength(1);
    expect(text[0]!.key).toBe('t1.r0.c2');
    expect(r.html).toContain('<textarea');
  });

  it('a question that merely starts with a verb is NOT mistaken for an empty answer box', () => {
    const src = `# S\n\n| Question | Type your answer here |\n|---|---|\n| Write a sentence about loops. | |\n`;
    const r = renderWorksheet(src, { mode: 'review' });
    const text = r.fields.filter((f) => f.kind === 'text');
    expect(text).toHaveLength(1); // only the answer cell, not the question
    expect(text[0]!.key).toBe('t1.r1.c2');
    expect(r.html).toContain('Write a sentence about loops.'); // question kept as text
  });

  it('a reference table whose header starts with a verb but whose body is filled stays read-only', () => {
    const src = `# Ref\n\n| Type of loop | Example |\n|---|---|\n| for | counts a fixed number of times |\n| while | repeats until a condition |\n`;
    const r = renderWorksheet(src, { mode: 'form' });
    expect(r.fields).toHaveLength(0); // no phantom answer fields
    expect(r.html).not.toContain('<textarea');
    expect(r.html).toContain('counts a fixed number of times'); // content preserved
  });
});

describe('worksheetForm — name/date auto-fill (online the pupil never types them)', () => {
  const SRC = `# S\n\n| Name | Type your name here |\n|------|---------------------|\n| Date | Type the date here |\n\n## 🟢 Support\n| Q | Type your answer here |\n|---|---|\n| Easy? | |\n`;

  it('auto-fills name/date read-only and emits no fields for them', () => {
    const r = renderWorksheet(SRC, { mode: 'form', level: 'support', autofill: { name: 'Sam Lee', date: 'Mon 15 Jun' } });
    expect(r.html).toContain('Sam Lee');
    expect(r.html).toContain('Mon 15 Jun');
    expect(r.html).toContain('ws-auto');
    const text = r.fields.filter((f) => f.kind === 'text');
    expect(text).toHaveLength(1); // only the support answer — name/date aren't "to do"
    expect(text[0]!.label).toContain('Easy?');
  });

  it('without autofill, name/date stay fillable (the print / offline path is unchanged)', () => {
    const r = renderWorksheet(SRC, { mode: 'form', level: 'support' });
    expect(r.fields.filter((f) => f.kind === 'text')).toHaveLength(3); // name + date + answer
  });

  it('a question that merely mentions "name" is NOT auto-filled', () => {
    const q = `# S\n\n| Question | Type your answer here |\n|---|---|\n| What is the name of the CPU part? | |\n`;
    const r = renderWorksheet(q, { mode: 'form', autofill: { name: 'Sam', date: 'today' } });
    expect(r.fields.filter((f) => f.kind === 'text')).toHaveLength(1); // the answer box stays
    expect(r.html).toContain('<textarea'); // a real input, not an auto-fill
  });
});

describe('worksheetForm — screenshot paste (image fields)', () => {
  it('a 📷 "paste a screenshot" answer cell becomes an image paste zone, keyed like any answer', () => {
    const src = `# S\n\n| Show your program working | 📷 Paste a screenshot here |\n|---|---|\n`;
    const r = renderWorksheet(src, { mode: 'form', action: '/me/answer?oc=5' });
    const img = r.fields.filter((f) => f.kind === 'image');
    expect(img).toHaveLength(1);
    expect(img[0]!.key).toBe('t1.r0.c2'); // header-as-data row, normal key scheme — marking unaffected
    expect(r.html).toContain('class="ws-paste');
    expect(r.html).toContain('/me/answer-image?oc=5&amp;key=');
  });

  it('a screenshot cell in a Q&A body row is an image field at the normal key', () => {
    const src = `# S\n\n| Task | Your work |\n|---|---|\n| Save your file and screenshot it | 📷 Paste a screenshot here |\n`;
    const r = renderWorksheet(src, { mode: 'form', action: '/me/answer?oc=5' });
    const img = r.fields.filter((f) => f.kind === 'image');
    expect(img.map((f) => f.key)).toEqual(['t1.r1.c2']);
  });

  it('a question that merely mentions a screenshot stays a typed answer (not an image field)', () => {
    const src = `# S\n\n| Question | Type your answer here |\n|---|---|\n| Describe the screenshot you saw | |\n`;
    const r = renderWorksheet(src, { mode: 'form' });
    expect(r.fields.filter((f) => f.kind === 'image')).toHaveLength(0);
    expect(r.fields.filter((f) => f.kind === 'text')).toHaveLength(1);
  });

  it('a saved screenshot renders as an image (served via /pupil-image) in review', () => {
    const src = `# S\n\n| Show it | 📷 Paste a screenshot here |\n|---|---|\n`;
    const key = renderWorksheet(src, { mode: 'review' }).fields.find((f) => f.kind === 'image')!.key;
    const r = renderWorksheet(src, { mode: 'review', values: new Map([[key, `img:pupil-work/5/9/${key}.png`]]) });
    expect(r.html).toContain('<img class="ws-shot"');
    expect(r.html).toContain('/pupil-image?p=');
  });

  it('image (screenshot) fields are still sliced by level like any field', () => {
    const src = `# S\n\n## 🟢 Support\n| Show it | 📷 Paste a screenshot here |\n|---|---|\n\n## 🟡 Core\n| Q | Type your answer here |\n|---|---|\n| Why? | |\n`;
    expect(renderWorksheet(src, { mode: 'form', level: 'support' }).fields.filter((f) => f.kind === 'image')).toHaveLength(1);
    expect(renderWorksheet(src, { mode: 'form', level: 'core' }).fields.filter((f) => f.kind === 'image')).toHaveLength(0);
  });
});

describe('worksheetForm — block styling', () => {
  it('instruction prose gets a styled "do this" panel', () => {
    const r = renderWorksheet(`## Instructions\nOpen Thonny and run your starter file.\n`, { mode: 'form' });
    expect(r.html).toContain('ws-instruction');
  });
  it('a standalone callout (blockquote) styles itself, not wrapped as an instruction panel', () => {
    const r = renderWorksheet(`> Remember to save your work as you go.\n`, { mode: 'form' });
    expect(r.html).toContain('<blockquote>');
    expect(r.html).not.toContain('ws-instruction');
  });
});

describe('worksheetForm — preview mode (teacher "see what pupils get")', () => {
  const LEVELLED = `# S\n\n## 🟢 Support\n| Q | Type your answer here |\n|---|---|\n| Easy? | |\n\n## 🟡 Core\n| Q | Type your answer here |\n|---|---|\n| Medium? | |\n`;

  it('shows the answer boxes but inert — disabled, with no autosave wiring', () => {
    const r = renderWorksheet(LEVELLED, { mode: 'preview', level: 'core' });
    expect(r.html).toContain('<textarea');
    expect(r.html).toContain('disabled');
    expect(r.html).not.toContain('hx-post'); // never saves
  });

  it('slices to the chosen level, exactly like the pupil form', () => {
    const core = renderWorksheet(LEVELLED, { mode: 'preview', level: 'core' });
    expect(core.html).toContain('Medium?');
    expect(core.html).not.toContain('Easy?');
    const support = renderWorksheet(LEVELLED, { mode: 'preview', level: 'support' });
    expect(support.html).toContain('Easy?');
    expect(support.html).not.toContain('Medium?');
  });
});
