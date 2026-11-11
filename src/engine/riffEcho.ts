// Odd-Meter Riff Echo (GAMES_TIERS_PLAN §4, 0.70): hear an original 1–2 bar riff in an odd meter, play it back on
// your instrument (guitar, bass or keys — mic or MIDI). Riffs are generated from rules (group starts accented, a
// pentatonic / dorian cell, no repeated pitch so the mic can hear each note), never copied. Meters and groupings come
// from the shared prog engine (drills/timeline.ts parseMeter / defaultGroups). Pure: riffs, timing, grading, the run.

import type { DynName } from './courseSocial';
import type { NoteEvent } from './lesson';
import { defaultGroups, parseMeter } from './drills/timeline';
import { rng } from './topicKit';

export interface RiffBar {
  /** Written meter, e.g. "7/8". */
  meter: string;
  /** Eighth-note groups of the bar (3/4 = 2+2+2). */
  groups: number[];
}
export interface RiffNote {
  /** Eighths from the riff's start. */
  at: number;
  /** Length in eighths. */
  len: number;
  midi: number;
  accent: boolean;
}
export interface Riff {
  bars: RiffBar[];
  notes: RiffNote[];
  /** Total length in eighths. */
  eighths: number;
  /** Displaced accents (ff): the accents sit one eighth after the group starts. */
  displaced: boolean;
}
export type RiffInstrument = 'bass' | 'guitar' | 'keys';

/** Meter choices per level (1 = mp … 4 = ff); a "+" joins two bars of different meters. */
export const RIFF_METERS: string[][] = [
  ['6/8', '3/4'],
  ['5/8', '7/8'],
  ['9/8', '11/8'],
  ['7/8+4/4', '13/8', '7/8'],
];
/** Groupings a meter may take (the first is the default). */
const ROTATIONS: Record<string, number[][]> = {
  '5/8': [[3, 2], [2, 3]],
  '7/8': [[2, 2, 3], [3, 2, 2], [2, 3, 2]],
  '9/8': [[2, 2, 2, 3], [3, 3, 3], [3, 2, 2, 2]],
  '11/8': [[3, 3, 3, 2], [2, 2, 3, 2, 2], [3, 3, 2, 3]],
  '13/8': [[3, 3, 3, 2, 2], [2, 2, 3, 2, 2, 2], [3, 2, 3, 2, 3]],
};

/** A bar's eighth groups (x/4 meters count their quarters as 2 eighths each). */
export function barGroups(meter: string, rnd?: () => number): number[] {
  const rot = ROTATIONS[meter];
  if (rot) return rnd ? rot[Math.floor(rnd() * rot.length)] : rot[0];
  const m = parseMeter(meter);
  if (m.den === 4) return Array.from({ length: m.num }, () => 2);
  return defaultGroups(m.num, m.den) ?? [m.num];
}
export const barEighths = (b: RiffBar) => b.groups.reduce((a, x) => a + x, 0);

/** Root and scale of each instrument's register (bass E2–A2, guitar / keys around A3–C4). */
const REGISTER: Record<RiffInstrument, number[]> = { bass: [40, 41, 43, 45], guitar: [52, 55, 57], keys: [57, 60, 62] };
const SCALES = [
  [0, 3, 5, 7, 10, 12], // minor pentatonic
  [0, 2, 3, 5, 7, 9, 10, 12], // dorian
  [0, 1, 3, 5, 7, 8, 10, 12], // phrygian
];

/** A riff for a level: meter(s), grouping, notes (seeded). */
export function makeRiff(seed: number, level: number, inst: RiffInstrument): Riff {
  const rnd = rng(seed);
  const lv = Math.max(1, Math.min(4, level));
  const choice = RIFF_METERS[lv - 1][Math.floor(rnd() * RIFF_METERS[lv - 1].length)];
  const parts = choice.split('+');
  let bars: RiffBar[] = parts.map((m) => ({ meter: m, groups: barGroups(m, lv >= 2 ? rnd : undefined) }));
  // short meters repeat to two bars (a riff is 1–2 bars, at most 16 eighths)
  if (bars.length === 1 && barEighths(bars[0]) <= 8) bars = [bars[0], bars[0]];
  const displaced = lv === 4 && choice === '7/8';
  const scale = SCALES[Math.floor(rnd() * SCALES.length)];
  const root = REGISTER[inst][Math.floor(rnd() * REGISTER[inst].length)];
  const notes: RiffNote[] = [];
  let at = 0;
  let deg = 0;
  let prev = -1;
  bars.forEach((b, bi) => {
    // the second bar of a repeated meter varies its ending, so the riff is not one bar twice
    b.groups.forEach((g, gi) => {
      for (let k = 0; k < g; k++) {
        const start = displaced ? k === 1 : k === 0;
        const play = start || rnd() < (lv >= 3 ? 0.5 : 0.4);
        if (play) {
          if (start) deg = gi === 0 && bi === 0 ? 0 : [0, 3, 4][Math.floor(rnd() * 3)] % scale.length;
          else deg = Math.max(0, Math.min(scale.length - 1, deg + [-1, 1, 1, -2, 2][Math.floor(rnd() * 5)]));
          let midi = root + scale[deg];
          if (midi === prev) midi = root + scale[(deg + 1) % scale.length];
          notes.push({ at, len: 1, midi, accent: start });
          prev = midi;
        }
        at++;
      }
    });
  });
  // each note lasts to the next one (at most a group)
  notes.forEach((n, i) => {
    n.len = Math.max(1, Math.min(3, (notes[i + 1]?.at ?? at) - n.at));
  });
  return { bars, notes, eighths: at, displaced };
}

/** The tempo of a riff counts eighths: `bpm` is quarter notes, so an eighth is 30000 / bpm ms. */
export const eighthMs = (bpm: number) => 30000 / bpm;

/** The riff as sound events (seconds from `t0`), with the bass samples for the bass course. */
export function riffEvents(r: Riff, bpm: number, inst: RiffInstrument, t0 = 0): NoteEvent[] {
  const e = eighthMs(bpm) / 1000;
  return r.notes.map((n) => ({ midi: n.midi, start: t0 + n.at * e, duration: n.len * e * 0.9, velocity: n.accent ? 0.82 : 0.62, ...(inst === 'bass' ? { inst: 'bass' as const } : {}) }));
}

/** Clicks on the group starts (accent on each bar's 1), a count-in bar first; times in seconds from the timeline start. */
export function riffClicks(r: Riff, bpm: number, countIn = true): { clicks: { t: number; accent: boolean; count?: boolean }[]; startAt: number; endAt: number } {
  const e = eighthMs(bpm) / 1000;
  const clicks: { t: number; accent: boolean; count?: boolean }[] = [];
  let t = 0;
  if (countIn) {
    const first = r.bars[0];
    let k = 0;
    for (const g of first.groups) {
      clicks.push({ t: k * e, accent: k === 0, count: true });
      k += g;
    }
    t = barEighths(first) * e;
  }
  const startAt = t;
  for (const b of r.bars) {
    let k = 0;
    for (const g of b.groups) {
      clicks.push({ t: t + k * e, accent: k === 0 });
      k += g;
    }
    t += barEighths(b) * e;
  }
  return { clicks, startAt, endAt: t };
}

/** The hit window (± ms): 40 % of an eighth, 60–140 ms (the mic needs a little room). */
export const riffWindow = (bpm: number) => Math.round(Math.max(60, Math.min(140, eighthMs(bpm) * 0.4)));

export interface PlayedNote {
  /** ms from the riff's first eighth (latency removed). */
  ms: number;
  midi: number;
}
export interface TakeGrade {
  /** Per written note: 'hit' (time + pitch), 'pitch' (in time, wrong note), 'miss'. */
  marks: ('hit' | 'pitch' | 'miss')[];
  extra: number;
  /** 0..100 */
  score: number;
  meanOffsetMs: number | null;
}

/** Grade a take: each written note takes the nearest free played note in its window; pitch class must match. */
export function gradeTake(r: Riff, played: PlayedNote[], bpm: number, windowMs = riffWindow(bpm)): TakeGrade {
  const e = eighthMs(bpm);
  const used = new Set<number>();
  const offs: number[] = [];
  const marks = r.notes.map((n) => {
    const want = n.at * e;
    let best = -1;
    let bestD = Infinity;
    played.forEach((p, i) => {
      const d = Math.abs(p.ms - want);
      if (used.has(i) || d > windowMs) return;
      // a right pitch beats a nearer wrong one
      const pc = (((Math.round(p.midi) - n.midi) % 12) + 12) % 12 === 0;
      const dd = d - (pc ? windowMs : 0);
      if (dd < bestD) {
        best = i;
        bestD = dd;
      }
    });
    if (best < 0) return 'miss' as const;
    used.add(best);
    offs.push(played[best].ms - want);
    return ((((Math.round(played[best].midi) - n.midi) % 12) + 12) % 12 === 0 ? 'hit' : 'pitch') as 'hit' | 'pitch';
  });
  const extra = played.length - used.size;
  const pts = marks.reduce((a, m) => a + (m === 'hit' ? 1 : m === 'pitch' ? 0.4 : 0), 0) - 0.25 * extra;
  const score = Math.round(100 * Math.max(0, Math.min(1, pts / Math.max(1, r.notes.length))));
  return { marks, extra, score, meanOffsetMs: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null };
}

// ---------------------------------------------------------------- the run

export const RIFFS_PER_RUN = 6;
export const RIFF_LIVES = 3;
/** A take below this costs a life. */
export const RIFF_PASS = 70;

export interface RiffSave {
  v: 1;
  game: 'riffecho';
  seed: number;
  level: number;
  bpm: number;
  inst: RiffInstrument;
  tier?: DynName;
  takes: number[];
  lives: number;
}
export const newRiffSave = (seed: number, level: number, bpm: number, inst: RiffInstrument, tier?: DynName): RiffSave => ({ v: 1, game: 'riffecho', seed: seed >>> 0, level: Math.max(1, Math.min(4, level)), bpm, inst, ...(tier ? { tier } : {}), takes: [], lives: RIFF_LIVES });
export function isRiffSave(x: unknown): x is RiffSave {
  const s = x as RiffSave | null;
  return !!s && s.v === 1 && s.game === 'riffecho' && typeof s.seed === 'number' && Array.isArray(s.takes) && s.lives > 0 && s.takes.length < RIFFS_PER_RUN;
}
/** The riff of take i. */
export const riffAt = (s: RiffSave, i = s.takes.length) => makeRiff((s.seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0, s.level, s.inst);
/** Record a take's score. */
export function addTake(s: RiffSave, score: number): RiffSave {
  return { ...s, takes: [...s.takes, Math.round(score)], lives: score < RIFF_PASS ? s.lives - 1 : s.lives };
}
export const riffOver = (s: RiffSave) => s.lives <= 0 || s.takes.length >= RIFFS_PER_RUN;
export function riffResult(s: RiffSave, input: string) {
  const accuracy = s.takes.length ? Math.round(s.takes.reduce((a, b) => a + b, 0) / s.takes.length) : 0;
  return { game: 'riffecho' as const, score: s.takes.reduce((a, b) => a + b, 0) * s.level, detail: { accuracy, takes: s.takes.length, input, level: s.level, rounds: s.takes.length, ...(s.tier ? { tier: s.tier } : {}) } };
}
/** The course's instrument for riffs (voice / ear / jazz courses play on the keys). */
export const riffInstrument = (course: string | undefined): RiffInstrument => (course === 'bass' ? 'bass' : course === 'guitar' ? 'guitar' : 'keys');
