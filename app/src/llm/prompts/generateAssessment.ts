// Phase 1 — versioned prompt for generating a summative end-of-unit assessment from a blueprint. ALL
// factual inputs (the covered/uncovered spec points, the unit's lessons, the exam-profile label) go through
// the wrapper's context[] via generateAssessmentItems — never the constant `system` string — so they inherit
// redaction/withholding/audit. No pupil data is ever in scope here, but routing through context[] keeps the
// egress assert + audit honest (belt-and-braces). Mirrors prompts/markScheme.ts / prompts/authorScheme.ts.
import type { RedactableItem } from '../../services/redact';
import type { AssessmentBlueprint } from '../../services/assessmentBlueprint';

// Already referenced (as a string literal) by tests/assessmentService.test.ts — keep this exact label.
export const GENERATE_ASSESSMENT_VERSION = 'generate_assessment@1';

export const GENERATE_ASSESSMENT_SYSTEM =
  'You are an experienced UK secondary Computing teacher writing a SUMMATIVE end-of-unit assessment. You ' +
  'are given the exact list of spec points a class HAS been taught (covered) and a few it has NOT yet been ' +
  'taught (uncovered), plus the unit\'s lessons and an exam-profile note. Write a coherent paper that:\n' +
  '• WEIGHTS most questions to the COVERED spec points, and includes only a FEW questions on the UNCOVERED ' +
  'points, each clearly a stretch/challenge.\n' +
  '• Tags EVERY question with the EXACT spec-point code it targets, copied verbatim from the supplied list ' +
  '(or null when, and only when, no spec point fits — e.g. a general KS3 question). Never invent a code.\n' +
  '• For a GCSE paper, writes OCR J277 EXAM-STYLE questions: a command word, a realistic mark tariff, a ' +
  'stem with parts (a, b, …), and a mark scheme of discrete mark points — numeric/exact/keyword/choice for ' +
  'objective parts, "open" with levels-of-response guidance for extended answers. For a KS3 paper, writes ' +
  'simpler recall/apply questions; command words may be null.\n' +
  '• Gives EACH part at least one mark point whose marks SUM to the part\'s marks, using the right kind: ' +
  '"exact" (one short answer), "numeric" (a number; word-forms in alternatives), "choice" (multiple-choice ' +
  '/ true-false — set responseType multiple_choice and list the options), "keyword" (a mark per key idea), ' +
  '"tick" (a checklist item), or "open" (judgement needed — give marking guidance in the text). Prefer ' +
  'objective kinds where you safely can (they mark instantly and free); use "open" only when the answer ' +
  'genuinely needs judgement.\n' +
  '• Uses ONLY these answer widgets (responseType): short_text, medium_text, extended_response, ' +
  'multiple_choice, tick_box, code. Put choices in options ONLY for multiple_choice/tick_box; [] otherwise.\n' +
  '• Provides a model answer per part and lists common misconceptions a marker should watch for.\n' +
  'Pitch the difficulty for the class described in the exam-profile note. Use plain UK English. NEVER ' +
  'reference an individual pupil by name (the inputs carry none — keep it that way).';

const codeLine = (sp: { code: string; title: string }): string => (sp.code === sp.title ? `• ${sp.title}` : `• ${sp.code}: ${sp.title}`);

/** The factual inputs — covered/uncovered spec points, the unit's lessons, the exam-profile label. Every
 *  one goes here (context[]), never in `system`, so it inherits redaction/withholding/audit. */
export function generateAssessmentItems(b: AssessmentBlueprint): RedactableItem[] {
  const covered = b.specPoints.filter((s) => s.covered);
  const uncovered = b.specPoints.filter((s) => !s.covered);
  const items: RedactableItem[] = [
    { text: `COURSE: ${b.courseName}\nUNIT: ${b.unitTitle}\nSTYLE: ${b.style === 'gcse' ? `GCSE exam-style (${b.examBoard ?? 'OCR J277'})` : 'KS3'}\nCLASS PROFILE: ${b.examProfileLabel}` },
  ];
  if (covered.length) {
    items.push({ text: `COVERED spec points — weight most questions to these (use the EXACT code):\n${covered.map(codeLine).join('\n')}` });
  }
  if (uncovered.length) {
    items.push({ text: `UNCOVERED spec points — include only a FEW stretch questions on these (mark isUncovered true; use the EXACT code):\n${uncovered.map(codeLine).join('\n')}` });
  }
  if (!covered.length && !uncovered.length) {
    items.push({ text: 'This course has no spec-point list — write a general KS3-style paper from the unit\'s lessons below and set specPointCode to null on every question.' });
  }
  if (b.lessonTitles.length) {
    items.push({ text: `UNIT LESSONS (for context — what the unit teaches):\n${b.lessonTitles.map((t) => `• ${t}`).join('\n')}` });
  }
  if (b.lessonObjectives.length) {
    items.push({ text: `LESSON OBJECTIVES (for context):\n${b.lessonObjectives.map((o) => `• ${o}`).join('\n')}` });
  }
  return items;
}

export interface GenerateAssessmentOpts {
  questionCount?: number;
  totalMarks?: number;
}

/** Sensible defaults — a fuller paper for GCSE than for KS3. The route may override via opts. */
export function defaultTargets(b: AssessmentBlueprint): { questionCount: number; totalMarks: number } {
  return b.style === 'gcse' ? { questionCount: 10, totalMarks: 50 } : { questionCount: 8, totalMarks: 30 };
}

export function generateAssessmentInstruction(b: AssessmentBlueprint, opts?: GenerateAssessmentOpts): string {
  const def = defaultTargets(b);
  const questionCount = opts?.questionCount ?? def.questionCount;
  const totalMarks = opts?.totalMarks ?? def.totalMarks;
  return [
    `Write the paper now: about ${questionCount} questions totalling roughly ${totalMarks} marks.`,
    `Weight them to the ${b.coveredCount} covered spec point(s); include a few stretch questions on the ${b.uncoveredCount} uncovered one(s).`,
    'Every question must tag the exact spec-point code (or null), every part must have ≥1 mark point whose marks sum to the part marks, and every part needs a model answer.',
  ].join('\n');
}
