// In-process pub/sub for live slide sync. Single-process LAN app, so a plain Map is enough — no Redis.
// Each connected pupil device opens an SSE stream that registers a Subscriber here; when the teacher
// navigates or (un)locks from the cockpit, we fan the change out to every device on that lesson.
// Pure + dependency-free so the fan-out is unit-testable with a fake Subscriber (no real sockets).

export interface Subscriber {
  /** Write one already-formatted SSE frame to the client. */
  write: (frame: string) => void;
}

const channels = new Map<number, Set<Subscriber>>();

/** Format a single SSE event frame. */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Register a subscriber for one occurrence_course; returns an unsubscribe fn (call on connection close). */
export function subscribe(occurrenceCourseId: number, sub: Subscriber): () => void {
  let set = channels.get(occurrenceCourseId);
  if (!set) {
    set = new Set();
    channels.set(occurrenceCourseId, set);
  }
  set.add(sub);
  return () => {
    const s = channels.get(occurrenceCourseId);
    if (!s) return;
    s.delete(sub);
    if (s.size === 0) channels.delete(occurrenceCourseId);
  };
}

/** Fan an event out to every device currently on this lesson. A dead socket throwing is swallowed —
 * it is cleaned up by its own connection-close handler. */
export function broadcast(occurrenceCourseId: number, event: string, data: unknown): void {
  const set = channels.get(occurrenceCourseId);
  if (!set || set.size === 0) return;
  const frame = sseFrame(event, data);
  for (const sub of set) {
    try {
      sub.write(frame);
    } catch {
      /* ignore — the close handler removes it */
    }
  }
}

/** How many devices are listening on a lesson (used by tests / diagnostics). */
export function subscriberCount(occurrenceCourseId: number): number {
  return channels.get(occurrenceCourseId)?.size ?? 0;
}
