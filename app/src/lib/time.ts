// Small, dependency-free time helpers. The clock works in civil dates
// ("YYYY-MM-DD") and minutes-since-midnight, resolving the wall clock in a
// given IANA time zone via Intl — so there is no Date-arithmetic ambiguity.

/** Minutes since midnight for a "HH:MM" string. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** "HH:MM" (24h) for minutes since midnight. */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** ISO weekday (1=Mon … 7=Sun) for a civil date "YYYY-MM-DD". */
export function weekdayOf(isoDate: string): number {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  return dow === 0 ? 7 : dow;
}

/** Add (or subtract, for negative n) whole days to a civil date. */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The local wall-clock view of an instant in a given time zone. */
export function localParts(now: Date, tz: string): { isoDate: string; minutes: number; weekday: number } {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(now)) p[part.type] = part.value;
  const isoDate = `${p.year}-${p.month}-${p.day}`;
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  return { isoDate, minutes, weekday: weekdayOf(isoDate) };
}

/** Convert a target date string and start minutes in a specific IANA timezone to UTC epoch milliseconds. */
export function tzDateToEpoch(dateStr: string, startMin: number, tz: string): number {
  const hh = Math.floor(startMin / 60);
  const mm = startMin % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const localIso = `${dateStr}T${pad(hh)}:${pad(mm)}:00`;

  const utcDate = new Date(`${localIso}Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(utcDate);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;

  const wallClockDate = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );

  const offsetMs = wallClockDate - utcDate.getTime();
  const localUtcMs = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    hh,
    mm,
    0
  );

  return localUtcMs - offsetMs;
}

/** Calculate the countdown string between target and current absolute system time. */
export function calculateCountdown(targetEpochMs: number, currentEpochMs: number): string {
  const diff = targetEpochMs - currentEpochMs;
  if (diff <= 0) return 'started';
  const totalSec = Math.floor(diff / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) {
    return `starts in ${secs}s`;
  }
  if (secs === 0) {
    return `starts in ${mins} mins`;
  }
  return `starts in ${mins}m ${secs}s`;
}


