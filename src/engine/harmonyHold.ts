// Harmony Hold (GAMES_TIERS_PLAN §3, voice, 0.76): the app plays four chords, one bar each; the screen names the tone to
// sing on each chord (the 3rd of Dm7, the 7th of G7 …). The piano never plays the sung tone (the singer supplies it,
// so the microphone cannot hear the answer from the piano). Graded by pitch class: the median cents error of the
// steady voiced frames of each chord, any octave. Pure: progressions, targets, voicings, scoring, the run.

import type { DynName } from './courseSocial';
import type { NoteEvent } from './lesson';
import { rng } from './topicKit';

type Bi = { en: string; he: string };
export type ToneId = 'root' | '3' | '5' | '7' | '9' | '#11' | '13' | 'b9';
export const TONE_NAMES: Record<ToneId, Bi> = {
  root: { en: 'root', he: 'שורש' },
  '3': { en: '3rd', he: 'טרצה' },
  '5': { en: '5th', he: 'קווינטה' },
  '7': { en: '7th', he: 'ספטימה' },
  '9': { en: '9th', he: 'נונה' },
  '#11': { en: '♯11', he: '♯11' },
  '13': { en: '13th', he: '13' },
  b9: { en: '♭9', he: '♭9' },
};

export interface HoldChord {
  /** Root pitch class. */
  root: number;
  /** Intervals above the root that make the chord (root first). */
  ints: number[];
  symbol: string;
  tone: ToneId;
  /** Pitch class to sing. */
  pc: number;
}
export interface HoldTake {
  level: number;
  chords: HoldChord[];
}

const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const pc12 = (x: number) => ((x % 12) + 12) % 12;

type Q = 'M' | 'm' | 'maj7' | 'm7' | '7' | 'm7b5' | 'dim';
const QI: Record<Q, number[]> = { M: [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], m7b5: [0, 3, 6, 10] };
const QS: Record<Q, string> = { M: '', m: 'm', dim: '°', maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7♭5' };
/** Interval of a tone above the root in a quality (3rd / 7th follow the quality). */
function toneInt(q: Q, tone: ToneId): number {
  const ints = QI[q];
  switch (tone) {
    case 'root':
      return 0;
    case '3':
      return ints[1];
    case '5':
      return ints[2];
    case '7':
      return ints[3] ?? 10;
    case '9':
      return 2;
    case 'b9':
      return 1;
    case '#11':
      return 6;
    case '13':
      return 9;
  }
}
const mk = (key: number, deg: number, q: Q, tone: ToneId, sym?: string): HoldChord => {
  const root = pc12(key + deg);
  return { root, ints: QI[q], symbol: `${FLAT[root]}${sym ?? QS[q]}`, tone, pc: pc12(root + toneInt(q, tone)) };
};
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

/** Which tone of a chord a pitch class is (for the common-tone level). */
function toneOfPc(c: { root: number; ints: number[] }, p: number): ToneId {
  const i = c.ints.findIndex((x) => pc12(c.root + x) === pc12(p));
  return (['root', '3', '5', '7'] as ToneId[])[Math.max(0, i)];
}

/** The four chords of a take at a level (1–6), seeded. */
export function makeHoldTake(seed: number, level: number): HoldTake {
  const r = rng(seed ^ 0x2c1b3c6d);
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const key = pick(r, [0, 2, 3, 5, 7, 8, 9, 10]);
  let chords: HoldChord[];
  if (lv === 1) {
    // one note held: the tonic (I, IV, vi, iv, ♭VI all hold it) or the 5th (I, iii, i, ♭III)
    const tonic = r() < 0.6;
    const pool: [number, Q][] = tonic ? [[5, 'M'], [9, 'm'], [5, 'm'], [8, 'M']] : [[4, 'm'], [0, 'm'], [3, 'M'], [7, 'M']];
    const rest = [...pool].sort(() => r() - 0.5).slice(0, 3);
    const held = pc12(key + (tonic ? 0 : 7));
    chords = [[0, 'M'] as [number, Q], ...rest].map(([d, q]) => {
      const root = pc12(key + d);
      const c = { root, ints: QI[q] };
      return { root, ints: QI[q], symbol: `${FLAT[root]}${QS[q]}`, tone: toneOfPc(c, held), pc: held };
    });
  } else if (lv === 2) {
    const prog = pick(r, [[0, 5, 7, 0], [0, 9, 5, 7], [0, 2, 7, 0], [9, 5, 0, 7], [0, 4, 5, 7]]);
    const qOf = (d: number): Q => ([2, 4, 9].includes(d) ? 'm' : 'M');
    chords = prog.map((d) => mk(key, d, qOf(d), pick(r, ['root', '3', '5'] as ToneId[])));
  } else if (lv === 3) {
    const prog = pick(r, [[0, 9, 2, 7], [0, 5, 2, 7], [4, 9, 2, 7], [5, 7, 4, 9]]);
    const qOf = (d: number): Q => (d === 0 || d === 5 ? 'maj7' : d === 7 ? '7' : 'm7');
    chords = prog.map((d) => mk(key, d, qOf(d), pick(r, ['3', '7'] as ToneId[])));
  } else if (lv === 4) {
    // guide tones through ii–V–I(–VI7): 3rd and 7th alternate
    const start: ToneId = r() < 0.5 ? '7' : '3';
    const other: ToneId = start === '7' ? '3' : '7';
    const spec: [number, Q][] = [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, '7']];
    chords = spec.map(([d, q], i) => mk(key, d, q, i % 2 ? other : start));
  } else if (lv === 5) {
    const start: ToneId = r() < 0.5 ? '7' : '3';
    const other: ToneId = start === '7' ? '3' : '7';
    const spec: [number, Q][] = pick(r, [
      // a ii–V into ii, then the ii–V home (a chain down a whole step)
      [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']],
      // minor ii–V–i–iv
      [[2, 'm7b5'], [7, '7'], [0, 'm7'], [5, 'm7']],
      // ii–V a half step apart (chromatic chain)
      [[3, 'm7'], [8, '7'], [2, 'm7'], [7, '7']],
    ] as [number, Q][][]);
    chords = spec.map(([d, q], i) => mk(key, d, q, i % 2 ? other : start));
  } else {
    // upper extensions over dominants, roots round the cycle of 4ths
    const sym: Record<string, string> = { '9': '9', '#11': '7♯11', '13': '13', b9: '7♭9' };
    chords = [9, 2, 7, 0].map((d) => {
      const t = pick(r, ['9', '#11', '13', 'b9'] as ToneId[]);
      return mk(key, d, '7', t, sym[t]);
    });
  }
  return { level: lv, chords };
}

/** The bar length used by the game: one chord a bar at `bpm` (quarter notes), 4 beats. */
export const HOLD_BPM = [0, 72, 76, 76, 80, 84, 84];
export const holdBpm = (level: number) => HOLD_BPM[Math.max(1, Math.min(6, level))];

/** Piano events for the take (seconds from t0): bass root + upper chord tones, never the sung pitch class. */
export function holdEvents(t: HoldTake, bpm: number, t0 = 0): NoteEvent[] {
  const bar = (4 * 60) / bpm;
  const out: NoteEvent[] = [];
  t.chords.forEach((c, i) => {
    const start = t0 + i * bar;
    const bass = 36 + pc12(c.root - 0);
    const b = bass > 45 ? bass - 12 : bass;
    if (pc12(c.root) !== c.pc) out.push({ midi: b, start, duration: bar * 0.95, velocity: 0.5 });
    // upper tones: the chord's 3rd / 5th / 7th between 52 and 66 (the 5th is left out of 4-note chords with a tension)
    const ups = c.ints.slice(1).filter((x) => !(c.tone !== 'root' && ['9', '#11', '13', 'b9'].includes(c.tone) && x === 7));
    for (const x of ups) {
      const p = pc12(c.root + x);
      if (p === c.pc) continue;
      let m = 48 + p;
      while (m < 52) m += 12;
      out.push({ midi: m, start, duration: bar * 0.95, velocity: 0.38 });
    }
  });
  return out;
}

/** A reference pitch for a pitch class inside the singer's range (nearest the middle). */
export function inRange(p: number, low: number, high: number): number {
  const mid = (low + high) / 2;
  let best = 60 + pc12(p - 60);
  for (let m = 24 + pc12(p); m < 100; m += 12) if (Math.abs(m - mid) < Math.abs(best - mid)) best = m;
  return best;
}

/** Signed cents from the nearest octave of a pitch class (−600 … +600). */
export function centsToPc(midi: number, p: number): number {
  const d = (((midi - p) % 12) + 12) % 12;
  return Math.round((d > 6 ? d - 12 : d) * 100);
}
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/** Score 0..1 of one chord: the median error of its sung frames; full within `win`, nothing at 3 × win. */
export function segmentScore(cents: number[], win: number, minFrames = 4): { score: number; err: number | null } {
  if (cents.length < minFrames) return { score: 0, err: null };
  const err = Math.abs(median(cents));
  const score = err <= win ? 1 : Math.max(0, 1 - (err - win) / (2 * win));
  return { score: Math.round(score * 1000) / 1000, err: Math.round(err) };
}

/** Grade a take from each chord's frames (cents to its target): per-chord scores and the take's 0..100. */
export function gradeHold(perChord: number[][], win: number): { scores: number[]; errs: (number | null)[]; score: number } {
  const g = perChord.map((c) => segmentScore(c, win));
  const score = Math.round((100 * g.reduce((a, x) => a + x.score, 0)) / Math.max(1, g.length));
  return { scores: g.map((x) => x.score), errs: g.map((x) => x.err), score };
}

// ---------------------------------------------------------------- the run

export const HOLD_TAKES = 5;
export interface HoldSave {
  v: 1;
  game: 'harmonyhold';
  seed: number;
  level: number;
  cents: number;
  tier?: DynName;
  takes: number[];
}
export const newHoldSave = (seed: number, level: number, cents: number, tier?: DynName): HoldSave => ({ v: 1, game: 'harmonyhold', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), cents, ...(tier ? { tier } : {}), takes: [] });
export function isHoldSave(x: unknown): x is HoldSave {
  const s = x as HoldSave | null;
  return !!s && s.v === 1 && s.game === 'harmonyhold' && typeof s.seed === 'number' && Array.isArray(s.takes) && s.takes.length < HOLD_TAKES;
}
export const holdTakeAt = (s: HoldSave, i = s.takes.length) => makeHoldTake((s.seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0, s.level);
export const addHoldTake = (s: HoldSave, score: number): HoldSave => ({ ...s, takes: [...s.takes, Math.round(score)] });
export const holdOver = (s: HoldSave) => s.takes.length >= HOLD_TAKES;
export function holdResult(s: HoldSave) {
  const accuracy = s.takes.length ? Math.round(s.takes.reduce((a, b) => a + b, 0) / s.takes.length) : 0;
  return { game: 'harmonyhold' as const, score: s.takes.reduce((a, b) => a + b, 0) * s.level, detail: { accuracy, rounds: s.takes.length, level: s.level, input: 'mic', ...(s.tier ? { tier: s.tier } : {}) } };
}
