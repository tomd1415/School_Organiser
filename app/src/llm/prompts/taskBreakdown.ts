export const TASK_BREAKDOWN_VERSION = 'task_breakdown@1';

export const TASK_BREAKDOWN_SYSTEM =
  'You help a busy teacher break a task into a short, concrete checklist of next actions. Each step ' +
  'is one small, doable thing, in sensible order. Keep them short and practical — 3 to 7 steps. ' +
  'Do not pad; if the task is already small, give two or three steps.';

export function taskBreakdownInstruction(title: string, detail?: string | null): string {
  return `Task: ${title}${detail ? `\nDetail: ${detail}` : ''}\n\nBreak this into a short ordered checklist of concrete sub-steps.`;
}
