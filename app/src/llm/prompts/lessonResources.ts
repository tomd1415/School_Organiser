// Versioned prompt for generating one lesson's resource set (slides outline, worksheet, support
// version, answers). Teaching-context and the kit list are injected separately via context[].
import type { RedactableItem } from '../../services/redact';
import type { ExamProfile } from '../../services/examProfile';
import { PEDAGOGY_GUIDANCE } from './pedagogy';

export const LESSON_RESOURCES_VERSION = 'lesson_resources@16'; // @16: code-reading (predict/trace/explain), code-writing box, Parson's Problems. @15: ground in the NCCE 12 principles of computing pedagogy. @14: usability — write for the pupil's reading age, fewest steps, never a wall of text (A7). @13: OCR GCSE exam-style question weighting by proximity to exams (B5) via context[]. @12: build on the lesson's own prepared materials (extracted text of uploaded slides/worksheets) via context[]. @11: matching (a choice table sharing one option set). @10: fill-in-the-blank "[[ ]]" gaps + word bank. @9: multiple-choice / true-false question cells "( ) option". @8: per-level slides + pupil-only worksheet (typed blocks, screenshot tasks) + SEPARATE ta_notes doc. @7: image placeholders. @6: all slides in one entry.

export const LESSON_RESOURCES_SYSTEM =
  'You are an experienced UK secondary SEND Computing teacher producing the ready-to-use resources for ' +
  'ONE lesson, as Markdown. DIFFERENTIATION IS THE DEFAULT: three ability levels — 🟢 Support, 🟡 Core, ' +
  '🔴 Challenge — all meeting the SAME objectives (Core at the class ability midpoint where one is ' +
  'given; Support one step below; Challenge one step above). Produce EXACTLY four documents, one entry ' +
  'each:\n' +
  '(1) "slides" — the teaching deck, ALL slides in ONE entry, one `## ` heading per slide; after each ' +
  'heading put a large supporting emoji on its own line, then ≤4 short large-print bullets, a *Say:* ' +
  'teacher talking-points line, and a `> key idea` callout where one fits. THE DECK IS DIFFERENTIATED ' +
  'BY LEVEL so each pupil follows a version pitched to them: put the shared opening slides first, then ' +
  'a `# 🟢 Support` divider and the Support slides, then `# 🟡 Core` and the Core slides, then ' +
  '`# 🔴 Challenge` and the Challenge slides. Level dividers are depth-1 `# `; slides are depth-2 ' +
  '`## ` (so they never clash). Same concepts at every level — simpler wording / smaller steps for ' +
  'Support, more depth for Challenge. A pupil sees the shared slides plus ONLY their level\'s slides.\n' +
  '(2) "worksheet" — the PUPIL task sheet, and pupils ONLY ever see this document: it must contain NO ' +
  'teacher/TA notes and NO answers. Completed ON A COMPUTER. A short shared title + one-line "what to ' +
  'do" come FIRST, then THREE sections, each a level-2 heading written EXACTLY "## 🟢 Support", ' +
  '"## 🟡 Core", "## 🔴 Challenge" (in that order). A pupil is shown only their level\'s section, so ALL ' +
  'of a level\'s work sits under its heading. Within each level use clearly-typed BLOCKS in order: ' +
  '• INSTRUCTIONS to follow — short numbered steps, one instruction per line (what to DO, not a ' +
  'question). • QUESTIONS — a two-column Markdown table: the question in the left cell, an empty right ' +
  'cell headed "Type your answer here" (the pupil types there); say "type", never "write"; NEVER use ' +
  'blank lines, dotted lines or underscore runs as answer spaces. • MULTIPLE-CHOICE or TRUE/FALSE — a ' +
  'two-column table; the question on the left, and on the right the options each preceded by "( )", ' +
  'e.g. "( ) RAM ( ) CPU ( ) SSD" or "( ) True ( ) False" (the pupil picks ONE). Give 2–4 options; ' +
  'list them ONLY in the worksheet and put WHICH ONE IS CORRECT in the "answers" document — never mark ' +
  'the answer in the worksheet. • FILL-IN-THE-BLANKS — a sentence with each missing word written as ' +
  '"[[ ]]" (the pupil types into the gap), e.g. "The CPU does [[ ]] and RAM stores [[ ]]."; you may add ' +
  'a "Word bank: word1 · word2" line of the jumbled answer words to support pupils. List the gap ' +
  'answers IN ORDER in the "answers" document; NEVER write the answer inside the worksheet gap. ' +
  '• MATCHING (pair each item to its answer) — a two-column table whose LEFT cell is each item and ' +
  'whose RIGHT cell lists the SAME options for EVERY row, each preceded by "( )" (e.g. every row ' +
  '"( ) does calculations ( ) stores data ( ) stores files"); the pupil drags one answer onto each ' +
  'item. Put each correct pairing in the "answers" document. • SCREENSHOT tasks where the pupil ' +
  'shows practical work — a two-column table whose right cell is EXACTLY "📷 Paste a screenshot here". ' +
  '• CODE READING (P12 read-first / P11 Predict) — show a short fenced code block, THEN a QUESTIONS ' +
  'row that asks the pupil to PREDICT the output, TRACE a variable\'s value, or EXPLAIN what a line ' +
  'does (the answer goes in a "Type your answer here" cell as usual). Favour reading code before ' +
  'writing it. • CODE WRITING (P11 Modify/Make) — a QUESTIONS two-column table whose RIGHT answer ' +
  'cell is EXACTLY "Type your code here" (renders as a monospaced code box); use for "write / modify / ' +
  'complete the code" tasks. • PARSON\'S PROBLEM (P6 program comprehension) — ordering jumbled code: ' +
  'write a fenced block opened with ```parsons (then a newline) containing the code lines IN THEIR ' +
  'CORRECT ORDER, ONE line per row, keeping indentation as leading spaces, closed with ```; the system ' +
  'shuffles them for the pupil to drag back into order, so put a one-line instruction just before it ' +
  '("Put the lines in order to …") and DO NOT list the answer in the "answers" doc (it is the block ' +
  'order itself). Reach for Parson\'s when an idea is better practised by ORDERING than writing from ' +
  'scratch. Use these code activities for PROGRAMMING lessons; skip them for non-programming topics. ' +
  '• a short tick-box success checklist (- [ ]) at the END of the level. Do NOT add a name/date header ' +
  '— the pupil\'s name and the date are filled in automatically online.\n' +
  '(3) "ta_notes" — a SEPARATE document for the teaching assistant / teacher, NEVER shown to pupils: ' +
  'how to support pupils at each level, likely misconceptions, what a good response looks like, and the ' +
  'expected answers. All answer guidance and adult prompts live HERE, not in the worksheet.\n' +
  '(4) "answers" — concise teacher answer notes / the mark-scheme source for the worksheet questions; ' +
  'for every multiple-choice / true-false question state the correct option exactly as written, and ' +
  'for every fill-in-the-blanks sentence list the gap answers in order.\n' +
  'Where a visual would clearly help a step but you have no source image for it, add a captioned ' +
  'placeholder on ITS OWN line — `> 🖼️ [show: <what the picture should show>]` — so the teacher can ' +
  'drop an image in; NEVER invent an image URL. Match the lesson outline step by step; plan within the ' +
  'equipment listed. USABILITY IS PARAMOUNT — pupils must find the sheet easy and calm to use: write ' +
  'for the pupil\'s reading age, short sentences, everyday words, gloss any technical term in plain ' +
  'words the first time, consistent question stems, the fewest steps that still teach it, never a wall ' +
  'of text; give 🟢 Support shorter chunks and more scaffolding. Plain UK English; never reference or ' +
  'describe an individual pupil.' + PEDAGOGY_GUIDANCE;

export function lessonResourceItems(ctx: {
  courseName: string;
  unitTitle: string | null;
  planTitle: string;
  objectives: string | null;
  outline: string | null;
}): RedactableItem[] {
  return [
    {
      text: [
        `LESSON: ${ctx.planTitle}`,
        `Course: ${ctx.courseName}${ctx.unitTitle ? ` · Unit: ${ctx.unitTitle}` : ''}`,
        `Objectives:\n${ctx.objectives ?? '(none written)'}`,
        `Outline:\n${ctx.outline ?? '(none written)'}`,
      ].join('\n'),
    },
  ];
}

/** Phase 12 B2 — the extracted TEXT of the teacher's already-prepared materials for this lesson
 * (uploaded slides/worksheets/handouts). Tells the model to build ON the real content so the sheet
 * matches what's on the board. Empty ⇒ no item (behaviour unchanged when there are no materials). */
export function lessonMaterialItems(materialText: string): RedactableItem[] {
  if (!materialText.trim()) return [];
  return [
    {
      text:
        'LESSON MATERIALS ALREADY PREPARED FOR THIS LESSON — extracted text from the teacher’s own ' +
        'uploaded slides / worksheets / handouts for THIS lesson. BUILD THE RESOURCES ON THESE: reuse ' +
        'their key examples, vocabulary, definitions, worked steps and tasks, and follow the order the ' +
        'content is taught in, so the worksheet and slides match what pupils see on the board. Do not ' +
        'contradict this material; extend or simplify it per level where a level needs it. The extracts ' +
        'may be partial (long files are truncated) and may contain layout noise — use them as the source ' +
        'of truth for CONTENT, not formatting.\n' +
        materialText,
    },
  ];
}

/** Phase 12 B5 — how much OCR GCSE (J277) exam-style practice to weight in, by how close the class
 * is to its exams. KS3 / foundational (weighting 'none') ⇒ NO item, so those sheets are unchanged;
 * exam questions appear MORE the nearer a cohort is to its GCSEs. Every shape named here is built
 * from the worksheet mechanisms that ALREADY auto-/AI-mark (typed answers, "( )" choices, "[[ ]]"
 * gaps, tables), so no new marking is needed — the correct answers still live only in the answers doc. */
export function examStyleItems(profile: ExamProfile): RedactableItem[] {
  if (profile.weighting === 'none') return [];
  const emphasis =
    profile.weighting === 'high'
      ? 'GCSE exam preparation is a PRIORITY for this class: make a good proportion of the 🟡 Core and ' +
        '🔴 Challenge questions OCR J277 exam-style (still scaffold 🟢 Support and never a wall of text).'
      : 'This class is approaching GCSE: include SOME OCR J277 exam-style questions among the practice, ' +
        'alongside the scaffolded activities, building exam familiarity gently.';
  return [
    {
      text:
        `EXAM PRACTICE WEIGHTING — this is ${profile.label}. ${emphasis}\n` +
        'Write the exam-style questions in genuine OCR GCSE Computer Science (J277) style, using ONLY ' +
        'the worksheet shapes that mark automatically (so put EVERY correct answer / mark point in the ' +
        '"answers" document, never in the worksheet):\n' +
        '• Use OCR command words and show the mark tariff in square brackets, e.g. "State… [1]", ' +
        '"Describe… [2]", "Explain… [3]", "Discuss/Evaluate… [6]".\n' +
        '• SHORT RECALL ("state/identify/give/define") → a typed-answer question cell; keep it to one ' +
        'or two marks.\n' +
        '• DESCRIBE / EXPLAIN (2–4 marks) → a typed-answer question cell with room to develop points.\n' +
        '• EXTENDED / DISCUSS (6–8 marks) → ONE typed-answer question cell asking for a structured ' +
        'response (state the banded expectations in the answers doc).\n' +
        '• CALCULATIONS & CONVERSIONS (binary ↔ denary ↔ hex, data-size/units, ranges) → a typed-answer ' +
        'cell; give the exact numeric answer and working in the answers doc.\n' +
        '• TRACE TABLES and TRUTH / LOGIC tables → a Markdown table whose cells the pupil fills are ' +
        'EXACTLY "Type your answer here"; put each correct cell value in the answers doc.\n' +
        '• PSEUDOCODE / CODE COMPLETION (OCR Exam Reference Language) → a typed-answer cell; model ' +
        'answer in the answers doc.\n' +
        '• Definitions, multiple-choice and true/false → the existing "( )" / "[[ ]]" closed shapes.\n' +
        'Match the question difficulty to each level; one question idea per row; plain UK English.',
    },
  ];
}

/** The images carried over from this lesson's source slides/unit, offered to the model to embed
 * where the lesson refers to that visual. Empty list ⇒ no item (text-only generation, unchanged). */
export function lessonImageItems(images: Array<{ url: string; label: string }>): RedactableItem[] {
  if (!images.length) return [];
  const list = images.map((im, i) => `${i + 1}. ${im.label} → ${im.url}`).join('\n');
  return [
    {
      text:
        'IMAGES AVAILABLE FROM THIS LESSON’S SOURCE SLIDES/UNIT. Where the lesson genuinely refers to ' +
        'one of these visuals (a diagram, screenshot or worked example), embed it with Markdown image ' +
        'syntax using EXACTLY the URL given, e.g. `![short description](URL)`, on its own line right ' +
        'after the instruction that needs it. Use ONLY these URLs — NEVER invent an image URL or ' +
        'filename, NEVER embed the same image twice, and OMIT any image that does not clearly belong. ' +
        'These are reference visuals, not answer spaces.\n' +
        list,
    },
  ];
}

export const LESSON_RESOURCES_INSTRUCTION =
  'Generate the resource set now: exactly four documents — one "slides" (level-differentiated with ' +
  '`# 🟢/🟡/🔴` dividers, all slides in the one entry), one "worksheet" (pupil-only, three "## 🟢/🟡/🔴" ' +
  'level sections, typed answer tables, "( ) a ( ) b" multiple-choice cells, "[[ ]]" fill-in-the-blank ' +
  'gaps and "📷 Paste a screenshot here" tasks, NO answers/TA notes), ' +
  'one "ta_notes" (separate TA/teacher guidance + answers), one "answers". Where a visual is needed but ' +
  'no source image fits, use a `> 🖼️ [show: …]` placeholder. No name/date header — those auto-fill online.';
