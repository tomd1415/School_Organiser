import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { getClockContext, getSelfLessonAt } from '../../src/repos/clock';

// Verifies the Now screen's SQL against the dev DB (read-only — no cleanup needed).
describe('clock repo (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('loads the clock context: 65 periods, 15 term dates, tz, minutes', async () => {
    const ctx = await getClockContext();
    expect(ctx.periods.length).toBe(65);
    // 15 = the 14 base-seed term dates + the summer half-term the test-data fixture (testData.ts) adds
    // for a realistic mid-term gap. The integration suite runs against that fixture (see globalSetup).
    expect(ctx.terms.length).toBe(15);
    expect(ctx.tz).toBe('Europe/London');
    const l1 = ctx.periods.find((p) => p.lessonIndex === 1);
    expect(l1?.startMin).toBe(9 * 60 + 10); // 09:10
  });

  it('finds the self lesson at a known slot (Mon, slot 5 = Lesson 1 = 8PFA)', async () => {
    const lesson = await getSelfLessonAt(1, 5);
    expect(lesson).not.toBeNull();
    expect(lesson?.purpose).toBe('teaching');
    expect(lesson?.groupName).toBe('8PFA');
  });
});
