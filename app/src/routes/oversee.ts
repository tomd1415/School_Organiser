import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { addDays, localParts } from '../lib/time';
import { getPeriodDefinitions, getTimetabledLessons } from '../repos/timetable';
import { buildOverseenWeek } from '../services/timetable';
import { weekReadiness, type LessonReadiness } from '../services/lessonReadiness';
import { fmtShort, mondayOf } from '../lib/timetableView';
import { renderOverseePage, type OverseeDay, type OverseeRow } from '../lib/overseeView';

const TZ = 'Europe/London';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export function registerOverseeRoutes(app: FastifyInstance): void {
  app.get('/oversee', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    const today = localParts(new Date(), TZ).isoDate;
    const ref = parsed.success && parsed.data.date ? parsed.data.date : today;
    const monday = mondayOf(ref);
    const weekDates = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    const prevDate = addDays(monday, -7);
    const nextDate = addDays(monday, 7);

    let days: OverseeDay[] = [];
    try {
      const [periods, lessons, readiness] = await Promise.all([
        getPeriodDefinitions(),
        getTimetabledLessons(),
        weekReadiness(weekDates).catch(() => new Map<string, LessonReadiness>()),
      ]);
      const byDay = new Map<number, ReturnType<typeof buildOverseenWeek>>();
      for (const o of buildOverseenWeek(periods, lessons)) {
        const arr = byDay.get(o.weekday) ?? [];
        arr.push(o);
        byDay.set(o.weekday, arr);
      }
      days = [1, 2, 3, 4, 5]
        .map((wd, i): OverseeDay | null => {
          const list = byDay.get(wd) ?? [];
          if (list.length === 0) return null;
          const date = weekDates[i] ?? today;
          const rows: OverseeRow[] = list.map((l) => {
            const r = readiness.get(`${date}:${l.lessonId}`);
            return {
              lessonId: l.lessonId,
              date,
              start: l.start,
              end: l.end,
              groupName: l.groupName,
              purpose: l.purpose,
              courseNames: l.courses.map((c) => c.name),
              staffName: l.staffName,
              noPlan: r?.noPlan ?? false,
              needsEdit: r?.needsEdit ?? false,
            };
          });
          return { name: DAY_NAMES[i] ?? '', dateLabel: fmtShort(date), isToday: date === today, rows };
        })
        .filter((d): d is OverseeDay => d !== null);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      days = [];
    }

    const body = renderOverseePage({ days, prevDate, nextDate });
    return reply.type('text/html').send(layout({ title: 'Lessons I oversee', body, authed: true, csrfToken: reply.generateCsrf(), width: 'working' }));
  });
}
