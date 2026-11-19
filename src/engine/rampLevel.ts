// The ramp inside a level (curriculum flow, rule 3; re-exported by ramp.ts). No imports, so the level catalogues
// (vocal levels, lessons) can use it without pulling in the topic generators.
//
// Owner 2026-11-19: every stage gives several items at close difficulty — a level's items rise, there are at least
// RAMP_MIN_ITEMS of them, and the first and last stay within RAMP_SPREAD (Voice-Drums audit R9, Ear-Jazz audit R9).

export const RAMP_MIN_ITEMS = 3;
export const RAMP_SPREAD = 150;

/**
 * Items in rising difficulty, ties (and items without a rating) kept in their written order: an item without a
 * difficulty stays right after the item before it. Pure; the input is not changed.
 */
export function rampOrder<T>(items: readonly T[], difficultyOf: (t: T) => number | undefined): T[] {
  let last = -Infinity;
  const keyed = items.map((it, i) => {
    const d = difficultyOf(it);
    if (typeof d === 'number') last = d;
    return { it, i, d: typeof d === 'number' ? d : last };
  });
  return keyed.sort((a, b) => a.d - b.d || a.i - b.i).map((x) => x.it);
}

/** What breaks the ramp in a level's item difficulties: out of order, too wide a spread, too few items. */
export function rampIssues(difficulties: readonly number[]): ('order' | 'spread' | 'few')[] {
  const out: ('order' | 'spread' | 'few')[] = [];
  if (difficulties.some((d, i) => i > 0 && d < difficulties[i - 1])) out.push('order');
  if (difficulties.length && Math.max(...difficulties) - Math.min(...difficulties) > RAMP_SPREAD) out.push('spread');
  if (difficulties.length < RAMP_MIN_ITEMS) out.push('few');
  return out;
}

/**
 * A level's items for one session with at least RAMP_MIN_ITEMS takes: a level with fewer repeats its items in order
 * (the caller plays a repeat in a fresh key / seed, so it is a new item — ramp.ts's "fresh seed is a new item" rule).
 * `repeat` counts how many times the item came before in this list.
 */
export function rampPad<T>(items: readonly T[], min = RAMP_MIN_ITEMS): { item: T; repeat: number }[] {
  if (!items.length) return [];
  const out: { item: T; repeat: number }[] = items.map((item) => ({ item, repeat: 0 }));
  for (let i = 0; out.length < min; i++) out.push({ item: items[i % items.length], repeat: Math.floor(out.length / items.length) });
  return out;
}

/** Drum levels (Voice-Drums audit R9): a level's start tempo stays within 10 % above the previous level's target. */
export const tempoRampOk = (prevTarget: number, start: number): boolean => start <= prevTarget * 1.1;
