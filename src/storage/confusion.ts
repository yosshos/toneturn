// The confusion map (0.50): which answers a player mixes up — per topic, the pair "right → given" with a count and the
// latest level, kept on this device. Feeds the Insights screen and the "boss fights" (practise exactly that pair).

import type { Question } from '../engine/lesson';
import { indexedKV, memoryKV, type KV } from './kv';

export interface Confusion {
  topic: string;
  /** Topic generator id and level when the question came from one (to practise it). */
  gen?: { id: string; level: number };
  right: { en: string; he: string };
  given: { en: string; he: string };
  n: number;
  last: string;
}
export type ConfusionMap = Record<string, Confusion>;

const kv: KV = (() => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedKV('toneturn-confusion', 'confusion') : memoryKV();
  } catch {
    return memoryKV();
  }
})();
let cache: ConfusionMap | null = null;
let chain: Promise<unknown> = Promise.resolve();

export async function loadConfusions(): Promise<ConfusionMap> {
  if (cache) return cache;
  cache = (await kv.get<ConfusionMap>('map')) ?? {};
  return cache;
}

const QUAL: Record<string, { en: string; he: string }> = { maj: { en: 'major', he: 'מז׳ור' }, min: { en: 'minor', he: 'מינור' }, dim: { en: 'diminished', he: 'מוקטן' }, aug: { en: 'augmented', he: 'מוגדל' } };
/** A readable label of an answer to a question. */
export function answerLabel(q: Question, a: unknown): { en: string; he: string } | null {
  const v = String(a);
  if (q.kind === 'choice') {
    const n = q.names[v];
    return n ? { en: n.en, he: n.he } : null;
  }
  if (q.kind === 'quality') return QUAL[v] ?? { en: v, he: v };
  if (q.kind === 'interval' || q.kind === 'degree' || q.kind === 'cadence' || q.kind === 'inversion') return { en: v, he: v };
  return null;
}

export function confusionEntry(q: Question, given: unknown): Omit<Confusion, 'n' | 'last'> | null {
  const right = answerLabel(q, (q as { answer?: unknown }).answer);
  const g = answerLabel(q, given);
  if (!right || !g || right.en === g.en) return null;
  const topic = q.kind === 'choice' ? q.topic : q.kind;
  return { topic, ...(q.kind === 'choice' ? { gen: { id: q.topic, level: q.level } } : {}), right, given: g };
}

export function recordConfusion(q: Question, given: unknown) {
  const e = confusionEntry(q, given);
  if (!e) return;
  chain = chain
    .then(async () => {
      const m = { ...(await loadConfusions()) };
      const key = `${e.topic}|${e.right.en}|${e.given.en}`;
      const prev = m[key];
      m[key] = { ...e, n: (prev?.n ?? 0) + 1, last: new Date().toISOString() };
      // keep the 200 most recent pairs
      const keys = Object.keys(m).sort((a, b) => m[b].last.localeCompare(m[a].last));
      for (const k of keys.slice(200)) delete m[k];
      cache = m;
      await kv.set('map', m);
    })
    .catch(() => {});
}

/** The pairs to show: both directions of a pair merged, most frequent (and recent) first. */
export function topConfusions(m: ConfusionMap, k = 6): (Confusion & { both: number })[] {
  const merged = new Map<string, Confusion & { both: number }>();
  for (const c of Object.values(m)) {
    const [x, y] = [c.right.en, c.given.en].sort();
    const key = `${c.topic}|${x}|${y}`;
    const cur = merged.get(key);
    if (!cur) merged.set(key, { ...c, both: c.n });
    else {
      cur.both += c.n;
      if (c.n > cur.n) Object.assign(cur, { right: c.right, given: c.given, n: c.n, gen: c.gen ?? cur.gen });
      if (c.last > cur.last) cur.last = c.last;
    }
  }
  return [...merged.values()].filter((c) => c.both >= 2).sort((a, b) => b.both - a.both || b.last.localeCompare(a.last)).slice(0, k);
}
