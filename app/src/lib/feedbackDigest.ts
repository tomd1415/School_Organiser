// A one-line, cohort-level digest of a class's lesson feedback — "This class tends to enjoy
// practical, cards; less keen on typing." Pure arithmetic (the two most-frequent liked/disliked
// activity chips); no AI, no pupil identity. Used per-lesson (8.7) and over-time (10.16 standing).
export function feedbackDigest(fb: { ratings: number[]; liked: string[]; disliked: string[] }): string | null {
  const top = (xs: string[]): string[] => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  };
  const liked = top(fb.liked);
  const disliked = top(fb.disliked);
  if (liked.length === 0 && disliked.length === 0) return null;
  const parts: string[] = [];
  if (liked.length) parts.push(`tends to enjoy ${liked.join(', ')}`);
  if (disliked.length) parts.push(`less keen on ${disliked.join(', ')}`);
  return `This class ${parts.join('; ')}.`;
}
