import { describe, expect, it } from 'vitest';
import { renderWorksheet } from '../src/lib/worksheetForm';

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
