// Sing the Interval Sprint (GAMES_TIERS_PLAN §2.4 voice variant, 0.76): a note sounds and an interval is named — sing
// the other note. A held, steady pitch inside the tier's cents window is right; a steady wrong pitch, or nothing for
// 6 s, is wrong (−3 s). 90 s run. The target always sits in the singer's range (the sounding note may fall outside it,
// the piano plays it). Pure: items, the pitch judge, the run.

import type { DynName } from './courseSocial';
import { rng } from './topicKit';

type Bi = { en: string; he: string };
export const SI_RUN_MS = 90_000;
export const SI_WRONG_MS = 3_000;
/** Steady time for a verdict: in the window (right) / on one wrong pitch (wrong); no answer by this time = wrong. */
export const SI_HOLD_MS = 300;
export const SI_WRONG_HOLD_MS = 600;
export const SI_TIMEOUT_MS = 6_000;

const IV_NAMES: Bi[] = [
  { en: 'unison', he: 'יוניסון' },
  { en: 'minor 2nd', he: 'סקונדה קטנה' },
  { en: 'major 2nd', he: 'סקונדה גדולה' },
  { en: 'minor 3rd', he: 'טרצה קטנה' },
  { en: 'major 3rd', he: 'טרצה גדולה' },
  { en: 'perfect 4th', he: 'קוורטה זכה' },
  { en: 'tritone', he: 'טריטון' },
  { en: 'perfect 5th', he: 'קווינטה זכה' },
  { en: 'minor 6th', he: 'סקסטה קטנה' },
  { en: 'major 6th', he: 'סקסטה גדולה' },
  { en: 'minor 7th', he: 'ספטימה קטנה' },
  { en: 'major 7th', he: 'ספטימה גדולה' },
  { en: 'octave', he: 'אוקטבה' },
  { en: 'minor 9th', he: 'נונה קטנה' },
  { en: 'major 9th', he: 'נונה גדולה' },
  { en: 'minor 10th', he: 'דצימה קטנה' },
  { en: 'major 10th', he: 'דצימה גדולה' },
];
export const intervalName = (semis: number): Bi => IV_NAMES[Math.abs(semis)] ?? IV_NAMES[0];

const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const CHORDS: { sym: string; tones: [string, number][] }[] = [
  { sym: 'maj7', tones: [['3', 4], ['5', 7], ['7', 11]] },
  { sym: '7', tones: [['3', 4], ['5', 7], ['♭7', 10]] },
  { sym: 'm7', tones: [['♭3', 3], ['5', 7], ['♭7', 10]] },
  { sym: 'm7♭5', tones: [['♭3', 3], ['♭5', 6], ['♭7', 10]] },
  { sym: '9', tones: [['9', 14], ['3', 4], ['♭7', 10]] },
];

export interface SiItem {
  /** The note that sounds. */
  ref: number;
  /** The note to sing. */
  target: number;
  /** Signed semitones (negative = down). */
  semis: number;
  /** What the screen asks. */
  ask: Bi;
  key: string;
}

const LEVEL_POOL: Record<number, { ints: number[]; down: boolean | 'mix' }> = {
  1: { ints: [3, 4, 5, 7, 12], down: false },
  2: { ints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], down: false },
  3: { ints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], down: 'mix' },
  4: { ints: [8, 9, 10, 11], down: 'mix' },
  5: { ints: [13, 14, 15, 16], down: false },
};

/** Place a target interval so the target sits in the range (the sounding note may fall outside it). */
function place(r: () => number, semis: number, low: number, high: number): { ref: number; target: number } {
  const lo = Math.min(low, high - 12);
  const options: number[] = [];
  for (let t = lo; t <= high; t++) options.push(t);
  const target = options[Math.floor(r() * options.length)];
  return { ref: target - semis, target };
}

/** Item `i` of a run (seeded); never the same interval twice in a row (`prevKey`). */
export function siItem(seed: number, i: number, level: number, low: number, high: number, prevKey?: string): SiItem {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  for (let a = 0; a < 8; a++) {
    const r = rng((Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(a + 1, 0xc2b2ae35)) >>> 0);
    r();
    let it: SiItem;
    if (lv === 6) {
      const c = CHORDS[Math.floor(r() * CHORDS.length)];
      const [name, iv] = c.tones[Math.floor(r() * c.tones.length)];
      const { ref, target } = place(r, iv, low, high);
      const root = FLAT[((ref % 12) + 12) % 12];
      it = { ref, target, semis: iv, ask: { en: `the ${name} of ${root}${c.sym}`, he: `ה־${name} של ${root}${c.sym}` }, key: `${c.sym}:${name}` };
    } else {
      const pool = LEVEL_POOL[lv];
      const iv = pool.ints[Math.floor(r() * pool.ints.length)];
      const down = pool.down === 'mix' ? r() < 0.5 : pool.down;
      const semis = down ? -iv : iv;
      const { ref, target } = place(r, semis, low, high);
      const n = intervalName(iv);
      it = { ref, target, semis, ask: { en: `${n.en} ${down ? 'down' : 'up'}`, he: `${n.he} ${down ? 'למטה' : 'למעלה'}` }, key: `${semis}` };
    }
    if (it.key !== prevKey || a === 7) return it;
  }
  throw new Error('unreachable');
}

/** Signed cents from the target; an octave off the target counts as the target (voices sit in different octaves) except for octave intervals, where the sounding note's octave would pass. */
export function siCents(midi: number, it: Pick<SiItem, 'target' | 'semis'>): number {
  const d = midi - it.target;
  if (Math.abs(it.semis) % 12 === 0) return Math.round(d * 100);
  const near = d - 12 * Math.round(d / 12);
  return Math.round(near * 100);
}

/** Judges one item from pitch frames: feed(ms, midi | null) → 'right' | 'wrong' | null. */
export class SiJudge {
  private inSince: number | null = null;
  private wrongNote: number | null = null;
  private wrongSince = 0;
  private start: number | null = null;
  constructor(private item: Pick<SiItem, 'target' | 'semis'>, private windowCents: number) {}
  feed(ms: number, midi: number | null): 'right' | 'wrong' | null {
    this.start ??= ms;
    if (ms - this.start >= SI_TIMEOUT_MS) return 'wrong';
    if (midi === null) {
      this.inSince = null;
      this.wrongNote = null;
      return null;
    }
    const c = siCents(midi, this.item);
    if (Math.abs(c) <= this.windowCents) {
      this.wrongNote = null;
      this.inSince ??= ms;
      return ms - this.inSince >= SI_HOLD_MS ? 'right' : null;
    }
    this.inSince = null;
    const n = Math.round(midi);
    // a steady wrong pitch (not a slide towards the target)
    if (this.wrongNote !== n || Math.abs(midi - n) > 0.4) {
      this.wrongNote = n;
      this.wrongSince = ms;
      return null;
    }
    return Math.abs(c) > 100 && ms - this.wrongSince >= SI_WRONG_HOLD_MS ? 'wrong' : null;
  }
}

// ---------------------------------------------------------------- the run

export interface SiState {
  v: 1;
  game: 'singinterval';
  seed: number;
  level: number;
  cents: number;
  tier?: DynName;
  low: number;
  high: number;
  i: number;
  right: number;
  wrong: number;
  timeLeftMs: number;
  over: boolean;
  prevKey?: string;
}
export const newSi = (seed: number, level: number, cents: number, low: number, high: number, tier?: DynName): SiState => ({ v: 1, game: 'singinterval', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), cents, ...(tier ? { tier } : {}), low, high, i: 0, right: 0, wrong: 0, timeLeftMs: SI_RUN_MS, over: false });
export const siCurrent = (s: SiState) => siItem(s.seed, s.i, s.level, s.low, s.high, s.prevKey);
export function siAnswer(s: SiState, correct: boolean): SiState {
  if (s.over) return s;
  const it = siCurrent(s);
  const t = correct ? s.timeLeftMs : Math.max(0, s.timeLeftMs - SI_WRONG_MS);
  return { ...s, i: s.i + 1, prevKey: it.key, right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1), timeLeftMs: t, over: t <= 0 };
}
export function siTick(s: SiState, ms: number): SiState {
  if (s.over || ms <= 0) return s;
  const t = Math.max(0, s.timeLeftMs - ms);
  return { ...s, timeLeftMs: t, over: t === 0 };
}
export function isSiSave(x: unknown): x is SiState {
  const s = x as SiState | null;
  return !!s && s.v === 1 && s.game === 'singinterval' && typeof s.seed === 'number' && !s.over && s.timeLeftMs > 0;
}
export function siResult(s: SiState) {
  return { game: 'singinterval' as const, score: s.right * 10 * s.level, detail: { right: s.right, wrong: s.wrong, level: s.level, input: 'mic', ...(s.tier ? { tier: s.tier } : {}) } };
}
