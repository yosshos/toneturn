// Which Pair? (triad pairs, deep — owner 2026-11-16): a chord sounds; pick the triad pair that fits it. Quick answers
// score more; right answers in a row build the streak. The music is src/engine/triadPairs.ts: every distractor's six
// notes leave the chord's scale (so exactly one choice fits), names spelled in the chord's key.
//
// Tiers: pp three pairs (dorian, mixolydian, lydian) · p six (+ ionian, aeolian, the dominant pair without the 11th) ·
// mp the melodic-minor and half-diminished pairs too · mf by ear: the pair sounds over its chord, name its colour ·
// f the colours it adds over a plain chord · ff play the pair on a MIDI keyboard (its six notes, any octave, any order).
// Each item's key comes from the cycle of 4ths from a random start (all 12 keys). Pure.

import { CORE, chordNameIn, coreHex, earColour, earGroupOf, pairNameIn, scalesHoldingPair, tpScale, type CoreId, type CorePair } from './triadPairs';
import { cycleKey, itemSeed, pickOf, rng, shuffled } from './newGamesKit';
import type { DynName } from './courseSocial';

export const WP_ITEMS = 10;
export const WP_LIVES = 3;
export const wpLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

const ids = (xs: CoreId[]): CorePair[] => xs.map((id) => CORE.find((c) => c.id === id)!);
/** The pairs each level asks about. */
export const WP_POOL: Record<number, CorePair[]> = {
  1: ids(['dorian', 'mixolydian', 'lydian']),
  2: ids(['dorian', 'mixolydian', 'lydian', 'ionian', 'aeolian', 'mixo-no11']),
  3: ids(['dorian', 'mixolydian', 'lydian', 'ionian', 'aeolian', 'mixo-no11', 'lydian-dom', 'altered', 'mel-minor', 'half-dim', 'lydian-aug', 'phryg-dom']),
};
WP_POOL[6] = WP_POOL[3];

export interface WPChoice {
  id: string;
  label: string;
  /** The Hebrew label where it differs (the colour names at mf). */
  he?: string;
}
export type WPQ =
  | { kind: 'pick'; root: number; pair: CorePair; chord: string; choices: WPChoice[]; answer: string }
  | { kind: 'colour'; root: number; pair: CorePair; group: 'maj' | 'dom' | 'min'; choices: WPChoice[]; answer: string }
  | { kind: 'adds'; root: number; pair: CorePair; group: 'maj' | 'dom' | 'min'; choices: WPChoice[]; answer: string };

/** Choices that cannot also fit: pairs whose six notes leave the answer's scale. */
export function wrongPairs(ans: CorePair, pool: readonly CorePair[]): CorePair[] {
  return pool.filter((c) => c.id !== ans.id && !scalesHoldingPair(c).includes(ans.scale));
}

function makeItem(rnd: () => number, root: number, lv: number): WPQ {
  if (lv === 4 || lv === 5) {
    const g = pickOf(rnd, ['maj', 'dom', 'min'] as const);
    // mf names the scale: B♭ + C (♭VII + I) and Gm + Am over C7 are both mixolydian, so only the second is asked there
    const pool = CORE.filter((c) => earGroupOf(c) === g && !(lv === 4 && c.id === 'mixolydian'));
    const pair = pickOf(rnd, pool);
    const four = shuffled(rnd, [pair, ...shuffled(rnd, pool.filter((c) => c !== pair)).slice(0, 3)]);
    const label = (c: CorePair, he: boolean) => (lv === 4 ? tpScale(c.scale).n[he ? 'he' : 'en'] : earColour(c).join(' '));
    return { kind: lv === 4 ? 'colour' : 'adds', root, pair, group: g, answer: pair.id, choices: four.map((c) => ({ id: c.id, label: label(c, false), he: label(c, true) })) };
  }
  const pool = WP_POOL[lv] ?? WP_POOL[3];
  const pair = pickOf(rnd, pool);
  const n = lv === 1 ? 2 : 3;
  const wrong = shuffled(rnd, wrongPairs(pair, CORE.filter((c) => c.id !== 'augmented' && c.id !== 'whole-tone'))).slice(0, n);
  return { kind: 'pick', root, pair, chord: chordNameIn(pair, root), answer: pair.id, choices: shuffled(rnd, [pair, ...wrong]).map((c) => ({ id: c.id, label: pairNameIn(c, root) })) };
}

const runs = new Map<string, WPQ[]>();
export function wpRun(seed: number, level: number): WPQ[] {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const k = `${seed >>> 0}:${lv}`;
  const hit = runs.get(k);
  if (hit) return hit;
  const out: WPQ[] = [];
  for (let i = 0; i < WP_ITEMS; i++) out.push(makeItem(rng(itemSeed(seed, i) ^ 0x7a11), cycleKey(seed, i), lv));
  if (runs.size > 40) runs.clear();
  runs.set(k, out);
  return out;
}
export const wpItem = (seed: number, level: number, i: number): WPQ => wpRun(seed, level)[Math.max(0, Math.min(WP_ITEMS - 1, i))];

/** ff: the notes played (MIDI) are the pair when their pitch classes are exactly its six notes. */
export function playedPair(q: WPQ, played: number[]): boolean {
  const want = coreHex(q.pair, q.root);
  const got = [...new Set(played.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
  return got.length === want.length && got.every((x, i) => x === want[i]);
}

/** Speed bonus: × 1.5 within 3 s, falling to × 1 at 12 s. */
export const wpSpeed = (ms: number): number => 1 + 0.5 * Math.max(0, Math.min(1, 1 - (ms - 3000) / 9000));
export const wpStreak = (streak: number): number => (streak >= 6 ? 1.5 : streak >= 3 ? 1.2 : 1);
export const wpPoints = (ms: number, level: number, streak: number): number => Math.round(10 * wpSpeed(ms) * (1 + 0.1 * (level - 1)) * wpStreak(streak));

/** One line on a wrong answer ("Why?"): the pair, the chord and the tone it leaves out. */
export function wpWhy(q: WPQ, lang: 'en' | 'he'): string {
  const name = pairNameIn(q.pair, q.root);
  const ch = chordNameIn(q.pair, q.root);
  const sc = tpScale(q.pair.scale).n[lang];
  if (q.kind === 'adds') return lang === 'he' ? `${name} מוסיף ${earColour(q.pair).join(' ')}.` : `${name} adds ${earColour(q.pair).join(' ')}.`;
  return lang === 'he' ? `${ch}: ${name} (${sc}).` : `${ch}: ${name} (${sc}).`;
}

// ---------------------------------------------------------------- the run

export interface WPSave {
  v: 1;
  game: 'whichpair';
  seed: number;
  tier?: DynName;
  level: number;
  i: number;
  lives: number;
  right: number;
  wrong: number;
  score: number;
  streak: number;
  bestStreak: number;
  input: 'touch' | 'midi';
  /** ff on MIDI: one take per item (its chord root and 100 / 0) for key mastery. */
  takes: { key: number; acc: number }[];
}
export const newWPSave = (seed: number, level: number, input: 'touch' | 'midi', tier?: DynName): WPSave => ({
  v: 1,
  game: 'whichpair',
  seed: seed >>> 0,
  level: Math.max(1, Math.min(6, level)),
  i: 0,
  lives: WP_LIVES,
  right: 0,
  wrong: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  input,
  takes: [],
  ...(tier ? { tier } : {}),
});
export function isWPSave(x: unknown): x is WPSave {
  const s = x as WPSave | null;
  return !!s && s.v === 1 && s.game === 'whichpair' && typeof s.seed === 'number' && typeof s.i === 'number' && s.lives > 0 && s.i < WP_ITEMS && Array.isArray(s.takes);
}
export const wpOver = (s: WPSave): boolean => s.lives <= 0 || s.i >= WP_ITEMS;

export function wpAnswer(s: WPSave, ok: boolean, ms: number, played = false): { save: WPSave; gained: number } {
  const streak = ok ? s.streak + 1 : 0;
  const gained = ok ? wpPoints(ms, s.level, streak) : 0;
  const q = wpItem(s.seed, s.level, s.i);
  const takes = played ? [...s.takes, { key: q.root, acc: ok ? 100 : 0 }] : s.takes;
  return {
    save: { ...s, i: s.i + 1, lives: ok ? s.lives : s.lives - 1, right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), score: s.score + gained, streak, bestStreak: Math.max(s.bestStreak, streak), takes },
    gained,
  };
}
export function wpResult(s: WPSave) {
  return {
    game: 'whichpair' as const,
    score: s.score,
    detail: { right: s.right, wrong: s.wrong, level: s.level, input: s.input, items: s.i, best: s.bestStreak, ...(s.tier ? { tier: s.tier } : {}), ...(s.takes.length ? { keyInst: 'piano', keyTakes: s.takes.map((t) => ({ ...t, bpm: 0 })) } : {}) },
  };
}
