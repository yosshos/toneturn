// Barry Harris in Time (GAMES_TIERS_PLAN §4, 0.70): play 8th-note lines on the keys over a vamp or changes, measured.
// Every bar sits on a 6th-diminished scale (Barry's chord-to-scale rule, engine/barry.ts SIX_OVER): the 6 chord's
// tones (1 3 5 6, or 1 ♭3 5 6) on the beats, the diminished notes between. A suggested line is shown; any line that
// keeps the rule is accepted (the game measures the rule and the time, not one answer).
//   level 1 (mp): one major 6 chord, the scale from the root
//   level 2 (mf): a major chord and its dominant (the minor 6 on the 5th), runs starting from 3, 5 or 6
//   level 3 (f):  ii–V–I, pivots (the line jumps an octave) and chromatic approach notes on the off-beats
//   level 4 (ff): ii–V–I chains, major and minor (minor 6 and dominant conversions), fast
// Grading per 8th slot: the nearest onset in the window (latency-corrected), its pitch by the rule; per bar a verdict.
// Pure, seeded.

import type { NoteEvent } from './lesson';
import { SIX_OVER } from './barry';

export type BhLevel = 1 | 2 | 3 | 4;
export type ChordKind = 'maj7' | 'm7' | 'm7b5' | '7' | '7alt';
export interface BhBar {
  /** Chord root (pitch class) and kind as written in the chart. */
  root: number;
  kind: ChordKind;
  /** The 6 chord whose 6th-diminished scale the bar uses. */
  six: { kind: 'maj6' | 'm6'; root: number };
  /** The suggested line: 8 eighths (MIDI). */
  line: number[];
}
export interface BhTake {
  level: BhLevel;
  bpm: number;
  seed: number;
  bars: BhBar[];
}

export const SLOTS_PER_BAR = 8;
export const LOW = 60;
export const HIGH = 84;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 6th-diminished scale (semitones): major 6 = 1 2 3 4 5 ♭6 6 7; minor 6 = 1 2 ♭3 4 5 ♭6 6 7. */
export const SIX_DIM: Record<'maj6' | 'm6', number[]> = { maj6: [0, 2, 4, 5, 7, 8, 9, 11], m6: [0, 2, 3, 5, 7, 8, 9, 11] };
export const SIX_TONES: Record<'maj6' | 'm6', number[]> = { maj6: [0, 4, 7, 9], m6: [0, 3, 7, 9] };
export const chordPcs = (b: Pick<BhBar, 'six'>) => SIX_TONES[b.six.kind].map((x) => mod12(b.six.root + x));
export const scalePcs = (b: Pick<BhBar, 'six'>) => SIX_DIM[b.six.kind].map((x) => mod12(b.six.root + x));

const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const KIND_SYM: Record<ChordKind, string> = { maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', '7': '7', '7alt': '7alt' };
export const chordSymbol = (b: Pick<BhBar, 'root' | 'kind'>) => `${NAMES[mod12(b.root)]}${KIND_SYM[b.kind]}`;
export const sixSymbol = (b: Pick<BhBar, 'six'>) => `${NAMES[mod12(b.six.root)]}${b.six.kind === 'm6' ? 'm6' : '6'}`;
export const noteName = (m: number) => NAMES[mod12(m)];

/** The chart of a take (chord roots relative to the key, kinds). */
function chartFor(level: BhLevel, rnd: () => number): [number, ChordKind][] {
  if (level === 1) return [[0, 'maj7'], [0, 'maj7'], [0, 'maj7'], [0, 'maj7']];
  if (level === 2) return [[0, 'maj7'], [7, '7'], [0, 'maj7'], [7, '7']];
  if (level === 3) return [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']];
  // ff: a major ii–V–I, then a minor one a whole step down (or the other way round)
  const minorFirst = rnd() < 0.5;
  const maj: [number, ChordKind][] = [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']];
  const min: [number, ChordKind][] = [[0, 'm7b5'], [5, '7alt'], [10, 'm7'], [10, 'm7']];
  return minorFirst ? [...min, ...maj] : [...maj, ...min];
}

/** The 6 chord of a written chord (minor i in a minor ii–V–i is played as its minor 6). */
function sixOf(root: number, kind: ChordKind, minorTonic: boolean): BhBar['six'] {
  if (kind === 'm7' && minorTonic) return { kind: 'm6', root: mod12(root) };
  const s = SIX_OVER[kind];
  return { kind: s.kind, root: mod12(root + s.up) };
}

/** All scale notes of a bar inside the keyboard range, ascending. */
const scaleNotes = (six: BhBar['six']) => {
  const pcs = SIX_DIM[six.kind].map((x) => mod12(six.root + x));
  const out: number[] = [];
  for (let m = LOW; m <= HIGH; m++) if (pcs.includes(mod12(m))) out.push(m);
  return out;
};

/**
 * The suggested line of a bar: 8 eighths along the scale from a chord tone on beat 1, so the chord tones fall on
 * the beats. Level 3–4 add a pivot (the line jumps an octave mid-bar) and a chromatic approach note on the last
 * off-beat, a half step from the next bar's first note.
 */
export function suggestLine(six: BhBar['six'], start: number, dir: 1 | -1, level: BhLevel, rnd: () => number): number[] {
  const notes = scaleNotes(six);
  let i = notes.indexOf(start);
  if (i < 0) i = 0;
  const out: number[] = [];
  let d = dir;
  for (let k = 0; k < SLOTS_PER_BAR; k++) {
    if (i < 0 || i >= notes.length) {
      // turn around at the edge of the range, keeping chord tones on the beats (two steps back)
      d = d === 1 ? -1 : 1;
      i += 2 * d;
    }
    out.push(notes[i]);
    i += d;
  }
  if (level >= 3 && rnd() < 0.6) {
    // pivot at beat 3: move the second half an octave (inside the range)
    const shift = out[4] + 12 <= HIGH && out.slice(4).every((m) => m + 12 <= HIGH) ? 12 : out.slice(4).every((m) => m - 12 >= LOW) ? -12 : 0;
    for (let k = 4; k < 8; k++) out[k] += shift;
  }
  return out;
}

/** A take's chart and suggested lines. */
export function makeTake(level: BhLevel, bpm: number, seed: number): BhTake {
  const rnd = rng(seed);
  const key = Math.floor(rnd() * 12);
  const chart = chartFor(level, rnd);
  const bars: BhBar[] = [];
  let prevEnd: number | null = null;
  chart.forEach(([deg, kind], bi) => {
    const root = mod12(key + deg);
    const minorTonic = level === 4 && kind === 'm7' && bi > 0 && chart[bi - 1][1] === '7alt';
    // the minor i after an altered V (and its repeat) is a minor 6 chord
    const six = sixOf(root, kind, minorTonic || (level === 4 && kind === 'm7' && bi > 1 && chart[bi - 2][1] === '7alt'));
    const tones = SIX_TONES[six.kind].map((x) => mod12(six.root + x));
    // the start: level 1 the root, level 2+ the 3rd, 5th or 6th; near the previous bar's end
    const pick = level === 1 ? [tones[0]] : [tones[1], tones[2], tones[3]];
    const pc = pick[Math.floor(rnd() * pick.length)];
    const cands: number[] = [];
    for (let m = LOW + 2; m <= HIGH - 2; m++) if (mod12(m) === pc) cands.push(m);
    const near = prevEnd ?? 67;
    cands.sort((a, b) => Math.abs(a - near) - Math.abs(b - near));
    const start = cands[0];
    const dir: 1 | -1 = level === 1 ? (bi % 2 === 0 ? 1 : -1) : start > 72 ? -1 : start < 66 ? 1 : rnd() < 0.5 ? 1 : -1;
    const line = suggestLine(six, start, dir, level, rnd);
    bars.push({ root, kind, six, line });
    prevEnd = line[line.length - 1];
  });
  if (level >= 3) {
    // chromatic approach: the last off-beat of a bar becomes a half step from the next bar's first note
    for (let b = 0; b < bars.length - 1; b++) {
      if (rnd() < 0.5) continue;
      const next = bars[b + 1].line[0];
      const ap = next + (rnd() < 0.5 ? -1 : 1);
      if (ap >= LOW && ap <= HIGH) bars[b].line[7] = ap;
    }
  }
  return { level, bpm, seed, bars };
}

// ---------------------------------------------------------------- timing

/** ms of one 8th note. */
export const eighthMs = (bpm: number) => 30000 / bpm;
/** Time of slot i (ms from beat 1 of bar 1). */
export const slotMs = (bpm: number, i: number) => i * eighthMs(bpm);
/** Hit windows: good = 40 % of an 8th (at least 45 ms, at most 110), perfect = under half of it. */
export function windows(bpm: number): { perfect: number; good: number } {
  const good = Math.round(Math.max(45, Math.min(110, 0.4 * eighthMs(bpm))));
  return { perfect: Math.round(good * 0.5), good };
}

// ---------------------------------------------------------------- the backing (a vamp: bass on 1 and 3, comping, ride)

export function backing(t: BhTake, countIn = true): { events: NoteEvent[]; length: number; startSec: number } {
  const beat = 60 / t.bpm;
  const ev: NoteEvent[] = [];
  const start = countIn ? 4 * beat : 0;
  if (countIn) for (let k = 0; k < 4; k++) ev.push({ midi: k === 0 ? 96 : 91, start: k * beat, duration: 0.05, velocity: 0.5, perc: k === 0 ? 'accent' : 'click' });
  t.bars.forEach((b, bi) => {
    const t0 = start + bi * 4 * beat;
    const third = b.kind === 'maj7' || b.kind === '7' || b.kind === '7alt' ? 4 : 3;
    const sev = b.kind === 'maj7' ? 11 : 10;
    const bass = 36 + mod12(b.root);
    ev.push({ midi: bass, start: t0, duration: 1.8 * beat, velocity: 0.6, inst: 'bass' });
    ev.push({ midi: bass + 7 - (b.kind === 'm7b5' ? 1 : 0), start: t0 + 2 * beat, duration: 1.8 * beat, velocity: 0.5, inst: 'bass' });
    // a shell (3 and 7) low in the left hand, on 1 and the "and" of 2
    const shell = [48 + mod12(b.root + third), 48 + mod12(b.root + sev)].map((m) => (m < 50 ? m + 12 : m));
    for (const at of [0, 1.5]) for (const m of shell) ev.push({ midi: m, start: t0 + at * beat, duration: 0.45 * beat, velocity: 0.3 });
    for (let k = 0; k < 4; k++) {
      ev.push({ midi: 51, start: t0 + k * beat, duration: 0.05, velocity: k % 2 ? 0.45 : 0.35, perc: 'ride' });
      if (k % 2) ev.push({ midi: 44, start: t0 + k * beat, duration: 0.05, velocity: 0.35, perc: 'hat-foot' });
    }
  });
  const length = start + t.bars.length * 4 * beat + 0.6;
  return { events: ev, length, startSec: start };
}

// ---------------------------------------------------------------- grading

export interface Onset {
  /** ms from beat 1 of bar 1 (raw, before latency). */
  ms: number;
  midi: number;
}
export type SlotGrade = 'perfect' | 'good' | 'wrong' | 'miss';
export interface BarVerdict {
  bar: number;
  hits: number;
  /** Beats whose note was a chord tone of the bar's 6 chord. */
  beatsOk: number;
  verdict: 'good' | 'ok' | 'off';
}
export interface BhGrade {
  slots: SlotGrade[];
  /** Played midi per slot (null = missed). */
  played: (number | null)[];
  offsets: (number | null)[];
  bars: BarVerdict[];
  extra: number;
  /** 0..100 */
  accuracy: number;
  /** Share 0..1 of beats on a chord tone. */
  beatShare: number;
  meanOffsetMs: number | null;
}

/** Is `m` (in slot i of bar b) right by the rule, given the notes played around it? */
export function pitchOk(t: BhTake, i: number, m: number, prev: number | null, next: number | null): boolean {
  const b = t.bars[Math.floor(i / SLOTS_PER_BAR)];
  const pc = mod12(m);
  if (i % 2 === 0) return chordPcs(b).includes(pc);
  if (scalePcs(b).includes(pc)) return true;
  // level 3+: a chromatic passing / approach note a half step from a neighbour
  if (t.level >= 3) return (prev !== null && Math.abs(m - prev) === 1) || (next !== null && Math.abs(m - next) === 1);
  return false;
}

/** Grade a take: onsets are matched to the nearest 8th slot in the window (each onset used once), latency subtracted. */
export function gradeTake(t: BhTake, onsets: Onset[], latencyMs = 0): BhGrade {
  const n = t.bars.length * SLOTS_PER_BAR;
  const w = windows(t.bpm);
  const os = onsets.map((o) => ({ ms: o.ms - latencyMs, midi: o.midi, used: false })).sort((a, b) => a.ms - b.ms);
  const played: (number | null)[] = Array(n).fill(null);
  const offsets: (number | null)[] = Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const at = slotMs(t.bpm, i);
    let best = -1;
    let bestD = Infinity;
    os.forEach((o, k) => {
      if (o.used) return;
      const d = Math.abs(o.ms - at);
      if (d <= w.good && d < bestD) {
        best = k;
        bestD = d;
      }
    });
    if (best >= 0) {
      os[best].used = true;
      played[i] = os[best].midi;
      offsets[i] = Math.round(os[best].ms - at);
    }
  }
  const slots: SlotGrade[] = played.map((m, i) => {
    if (m === null) return 'miss';
    if (!pitchOk(t, i, m, i > 0 ? played[i - 1] : null, i < n - 1 ? played[i + 1] : null)) return 'wrong';
    return Math.abs(offsets[i]!) <= w.perfect ? 'perfect' : 'good';
  });
  const extra = os.filter((o) => !o.used && o.ms > -w.good && o.ms < n * eighthMs(t.bpm) + w.good).length;
  const bars: BarVerdict[] = t.bars.map((_, b) => {
    const s = slots.slice(b * SLOTS_PER_BAR, (b + 1) * SLOTS_PER_BAR);
    const hits = s.filter((x) => x === 'perfect' || x === 'good').length;
    const beatsOk = s.filter((x, k) => k % 2 === 0 && (x === 'perfect' || x === 'good')).length;
    return { bar: b, hits, beatsOk, verdict: hits >= 7 && beatsOk === 4 ? 'good' : hits >= 5 ? 'ok' : 'off' };
  });
  const value = slots.reduce((a, x) => a + (x === 'perfect' ? 1 : x === 'good' ? 0.8 : x === 'wrong' ? 0.2 : 0), 0);
  const accuracy = Math.round(100 * Math.max(0, Math.min(1, (value - 0.25 * extra) / Math.max(1, n))));
  const beats = slots.filter((_, i) => i % 2 === 0);
  const beatShare = beats.filter((x) => x === 'perfect' || x === 'good').length / Math.max(1, beats.length);
  const offs = offsets.filter((x): x is number => x !== null);
  return { slots, played, offsets, bars, extra, accuracy, beatShare, meanOffsetMs: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null };
}

// ---------------------------------------------------------------- a run (three takes, resumable)

export const TAKES = 3;
export interface BhSave {
  v: 1;
  game: 'bhtime';
  seed: number;
  level: BhLevel;
  bpm: number;
  tier?: import('./courseSocial').DynName;
  input: 'midi' | 'touch';
  /** Accuracy of each finished take. */
  takes: number[];
}
export const isBhSave = (x: unknown): x is BhSave => {
  const s = x as BhSave | null;
  return !!s && s.v === 1 && s.game === 'bhtime' && typeof s.seed === 'number' && Array.isArray(s.takes) && s.takes.length < TAKES;
};
/** The seed of take k of a run. */
export const takeSeed = (seed: number, k: number) => (Math.imul(seed ^ 0x5bd1e995, k + 1) + k * 7919) >>> 0;
/** The run's result: mean take accuracy; score = accuracy × 10. */
export function runResult(s: BhSave): { score: number; accuracy: number } {
  const acc = s.takes.length ? Math.round(s.takes.reduce((a, b) => a + b, 0) / s.takes.length) : 0;
  return { score: acc * 10, accuracy: acc };
}
