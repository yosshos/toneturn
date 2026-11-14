// Memory games: growing melodic (Echo Chain) and rhythmic (Beat Echo) sequences + grading. Pure.

import type { NoteEvent } from './lesson';
import { majorScale, pc, pcValue, type PitchClass } from './pitch';
import { mulberry32, placeInRange } from './lesson';
import type { SungFrame } from './sing';
import { hzToMidi } from './pitch';
import { itemOctave, octaveOffset } from './feedback';

// ======================================================================= melody

export interface Pad {
  degree: number;
  midi: number;
  note: PitchClass;
}

export interface MelodyGame {
  key: PitchClass;
  pads: Pad[];
  /** Seconds per note during playback. */
  noteSec: number;
}

const MELODY_KEYS = ['C', 'D', 'Eb', 'F', 'G'].map(pc);

/** Pads for a key: degrees 1, 2, 3, 5 placed in a singable register (tonic 55–66). */
export function melodyGame(seed: number, degrees = [1, 2, 3, 5], range?: { low: number; high: number } | null): MelodyGame {
  const rnd = mulberry32(seed);
  let key = MELODY_KEYS[Math.floor(rnd() * MELODY_KEYS.length)];
  let tonic = placeInRange(pcValue(key), 55, 66);
  if (range) {
    // Sung pads sit inside the player's range (spec P.0): the octave of the tonic whose pads fit, nearest the
    // centre; when this key has no such octave, the first other key that does.
    const top = Math.max(...degrees.map((d) => padSemis(d)));
    const centre = (range.low + range.high - top) / 2;
    const fitFor = (k: PitchClass) => {
      const t0 = placeInRange(pcValue(k), 55, 66);
      const fits = [-36, -24, -12, 0, 12, 24].map((s) => t0 + s).filter((tn) => tn >= range.low && tn + top <= range.high);
      return fits.length ? fits.reduce((a, b) => (Math.abs(b - centre) < Math.abs(a - centre) ? b : a)) : null;
    };
    for (const k of [key, ...MELODY_KEYS.filter((x) => x !== key)]) {
      const f = fitFor(k);
      if (f !== null) {
        key = k;
        tonic = f;
        break;
      }
    }
  }
  const scale = majorScale(key);
  // chromatic pads (x.5): the next degree flattened (♯4 for 4.5)
  const noteOf = (d: number): PitchClass => {
    if (d % 1 === 0) return scale[d - 1];
    const base = d === 4.5 ? scale[3] : scale[Math.ceil(d) - 1];
    return { letter: base.letter, acc: Math.max(-2, Math.min(2, base.acc + (d === 4.5 ? 1 : -1))) as PitchClass['acc'] };
  };
  return {
    key,
    pads: degrees.map((d) => ({ degree: d, midi: tonic + padSemis(d), note: noteOf(d) })),
    noteSec: 0.6,
  };
}

/**
 * A sequence of `length` pad indices from `seed`. Different seeds → different sequences of
 * the same length (comparable difficulty for every player). No three identical notes in a row.
 */
export function melodySequence(seed: number, length: number, padCount: number): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  while (out.length < length) {
    const p = Math.floor(rnd() * padCount);
    if (out.length >= 2 && out[out.length - 1] === p && out[out.length - 2] === p) continue;
    out.push(p);
  }
  return out;
}

export function melodyEvents(game: MelodyGame, seq: number[], swing = false): { events: NoteEvent[]; length: number } {
  // Swing: notes in long–short pairs (2:1), like jazz eighths.
  const at = (i: number) => (swing ? Math.floor(i / 2) * 2 * game.noteSec + (i % 2 ? game.noteSec * (4 / 3) : 0) : i * game.noteSec);
  const events = seq.map((p, i) => ({ midi: game.pads[p].midi, start: at(i), duration: game.noteSec * (swing && i % 2 === 0 ? 1.2 : 0.88), velocity: i % 2 && swing ? 0.6 : 0.7 }));
  return { events, length: (seq.length ? at(seq.length - 1) + game.noteSec : 0) + 0.3 };
}

// ---------- note segmentation of a sung capture ----------

export interface SungNote {
  start: number;
  end: number;
  midi: number; // median fractional MIDI
}

/**
 * Split voiced frames into notes. A new note starts after an unvoiced gap, or when the pitch
 * moves more than `jump` semitones from the current note for `hold` consecutive frames (legato).
 * Very short fragments (scoops, consonants) are dropped; each note ignores its first frames (attack).
 */
export function segmentNotes(
  frames: SungFrame[],
  { minConfidence = 0.8, jump = 0.7, hold = 3, minSec = 0.14, gapFrames = 2 } = {},
): SungNote[] {
  const med = (xs: number[]) => {
    const s = xs.slice().sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const notes: SungNote[] = [];
  let cur: { start: number; end: number; midis: number[] } | null = null;
  let pending: { t: number; m: number }[] = [];
  let gap = 0;
  const close = () => {
    if (cur && cur.end - cur.start >= minSec) {
      const body = cur.midis.length > 4 ? cur.midis.slice(2) : cur.midis;
      notes.push({ start: cur.start, end: cur.end, midi: med(body) });
    }
    cur = null;
    pending = [];
  };
  for (const f of frames) {
    const voiced = !!f.hz && f.confidence >= minConfidence && f.hz > 60 && f.hz < 1200;
    if (!voiced) {
      gap++;
      if (gap >= gapFrames) close();
      continue;
    }
    gap = 0;
    const m = hzToMidi(f.hz!);
    if (!cur) {
      cur = { start: f.t, end: f.t, midis: [m] };
      continue;
    }
    const center = med(cur.midis.length > 4 ? cur.midis.slice(2) : cur.midis);
    if (Math.abs(m - center) > jump) {
      pending.push({ t: f.t, m });
      if (pending.length >= hold) {
        const p = pending;
        close();
        cur = { start: p[0].t, end: f.t, midis: p.map((x) => x.m) };
      }
      continue;
    }
    if (pending.length) {
      cur.midis.push(...pending.map((x) => x.m));
      pending = [];
    }
    cur.midis.push(m);
    cur.end = f.t;
  }
  close();
  return notes;
}

/** A played MIDI key → the pad of its pitch class in any octave (0.76 Echo MIDI input), else null (a wrong note). */
export const padForMidi = (game: MelodyGame, midi: number): number | null => nearestPad(game, Math.round(midi), 1);

/** Nearest pad (octave-insensitive) within `tolCents`, else null. */
export function nearestPad(game: MelodyGame, midi: number, tolCents = 50): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  game.pads.forEach((p, i) => {
    const c = (((midi - p.midi) * 100 + 600) % 1200 + 1200) % 1200 - 600;
    if (Math.abs(c) < bestD) {
      bestD = Math.abs(c);
      best = i;
    }
  });
  return bestD <= tolCents ? best : null;
}

export type NoteStatus = 'ok' | 'wrong' | 'missed';

export interface MelodyGrade {
  pass: boolean;
  /** One entry per target note. */
  notes: { target: number; given: number | null; status: NoteStatus }[];
  extra: number;
  /** Nothing usable was captured → reopen the turn, no penalty. */
  unclear: boolean;
}

/**
 * Align the player's notes with the target (edit-distance alignment) so one missed or extra
 * note doesn't shift every later result. `given` uses pad indices, null = unmatched pitch.
 */
export function gradeMelody(target: number[], given: (number | null)[]): MelodyGrade {
  if (given.length === 0) return { pass: false, notes: target.map((t) => ({ target: t, given: null, status: 'missed' })), extra: 0, unclear: true };
  const n = target.length;
  const m = given.length;
  const D: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const sub = D[i - 1][j - 1] + (target[i - 1] === given[j - 1] ? 0 : 1);
      D[i][j] = Math.min(sub, D[i - 1][j] + 1, D[i][j - 1] + 1);
    }
  const notes: MelodyGrade['notes'] = [];
  let extra = 0;
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (target[i - 1] === given[j - 1] ? 0 : 1)) {
      notes.unshift({ target: target[i - 1], given: given[j - 1], status: target[i - 1] === given[j - 1] ? 'ok' : 'wrong' });
      i--;
      j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      notes.unshift({ target: target[i - 1], given: null, status: 'missed' });
      i--;
    } else {
      extra++;
      j--;
    }
  }
  return { pass: extra === 0 && notes.every((x) => x.status === 'ok'), notes, extra, unclear: false };
}

/** Sung capture → pad indices, merging re-attacks of the same pad separated by tiny gaps. */
export function sungToPads(game: MelodyGame, frames: SungFrame[], tolCents = 50): (number | null)[] {
  const notes = segmentNotes(frames);
  const out: { pad: number | null; end: number }[] = [];
  for (const nt of notes) {
    const pad = nearestPad(game, nt.midi, tolCents);
    const prev = out[out.length - 1];
    if (prev && prev.pad === pad && nt.start - prev.end < 0.1) {
      prev.end = nt.end;
      continue;
    }
    out.push({ pad, end: nt.end });
  }
  return out.map((x) => x.pad);
}

// ======================================================================= rhythm

/** One beat's content: onsets as fractions of a beat. */
export type Cell = number[];
const CELLS_EASY: Cell[] = [[0], [0], [0, 0.5]];
const CELLS_MORE: Cell[] = [[0], [0, 0.5], [], [0, 0.5], [0.5]];

export interface RhythmPattern {
  bpm: number;
  beats: number;
  /** Onset times in beats from the start of the pattern. */
  onsets: number[];
  /** Drum Echo: which drum plays each onset (kick or snare); absent = one sound. */
  drums?: Drum[];
  /** 0.75 (Beat Echo f / ff): beats grouped (3/4 = [3], 7/8 = [2, 2, 3] …), accents and the count-in follow them. */
  groups?: number[];
  /** The meter's name for the screen ("7/8 · 2+2+3") and one bar's groups. */
  meter?: string;
  bar?: number[];
}

export type Drum = 'k' | 's';

/**
 * Kick-and-snare phrase on a pattern: a groove, not coin flips — kick on 1 and 3, snare on the backbeat
 * (2 and 4), off-beat eighths mostly kick (the "and" pickup), with a little variation so phrases differ.
 */
export function drumPattern(p: RhythmPattern, seed: number): RhythmPattern {
  const rnd = mulberry32(seed ^ 0x5eed);
  const drums = p.onsets.map((o, i): Drum => {
    if (i === 0) return 'k';
    const beat = Math.floor(o);
    const off = o - beat > 1e-6;
    const groove: Drum = off ? (rnd() < 0.7 ? 'k' : 's') : beat % 2 === 1 ? 's' : 'k';
    return rnd() < 0.15 ? (groove === 'k' ? 's' : 'k') : groove;
  });
  // A phrase needs both drums.
  if (drums.length > 1 && !drums.includes('s')) drums[drums.length - 1] = 's';
  return { ...p, drums };
}

/**
 * Pattern of `beats` beats. The first beat always has a downbeat onset; rests and
 * syncopation appear from 4 beats on. Different seeds → different patterns of equal length.
 */
/** Tempo ladder (spec C.4): every 3 rounds past the start, 8 % faster (at most 1.6×). */
export const ladderFactor = (length: number, start: number) => Math.min(1.6, 1 + 0.08 * Math.floor(Math.max(0, length - start) / 3));

/** Pad sets for Echo Chain (spec C.1): degrees 1 2 3 5 → pentatonic → the full major scale. */
// 0.70 (top tiers): 'blue' adds ♭3 and ♭7 to the major scale; 'chroma' is all twelve (x.5 = the chromatic note between).
export const PAD_SETS = { basic: [1, 2, 3, 5], penta: [1, 2, 3, 5, 6], full: [1, 2, 3, 4, 5, 6, 7], blue: [1, 2, 2.5, 3, 4, 5, 6, 6.5, 7], chroma: [1, 1.5, 2, 2.5, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7] } as const;
/** A pad's label: 1 … 7, chromatic pads as ♭2 ♭3 ♯4 ♭6 ♭7. */
export const padLabel = (d: number): string => (d % 1 === 0 ? String(d) : d === 4.5 ? '♯4' : `♭${Math.ceil(d)}`);
/** Semitones above the tonic of a (possibly chromatic) pad degree. */
export const padSemis = (d: number): number => {
  const steps = [0, 2, 4, 5, 7, 9, 11];
  return d % 1 === 0 ? steps[d - 1] : d === 4.5 ? 6 : steps[Math.ceil(d) - 1] - 1;
};
export type PadSet = keyof typeof PAD_SETS;

/** Swing (call and response with swing feel): off-beat eighths land a third of a beat late. */
export function swingPattern(p: RhythmPattern): RhythmPattern {
  return { ...p, onsets: p.onsets.map((o) => (Math.abs((o % 1) - 0.5) < 1e-6 ? Math.floor(o) + 2 / 3 : o)) };
}

export function rhythmPattern(seed: number, beats: number, bpm = 90): RhythmPattern {
  const rnd = mulberry32(seed);
  const pool = beats >= 4 ? CELLS_MORE : CELLS_EASY;
  const onsets: number[] = [];
  for (let b = 0; b < beats; b++) {
    const cell = b === 0 ? (rnd() < 0.5 ? [0] : [0, 0.5]) : pool[Math.floor(rnd() * pool.length)];
    cell.forEach((f) => onsets.push(b + f));
  }
  return { bpm, beats, onsets };
}

export const beatSec = (bpm: number) => 60 / bpm;

// ---------------------------------------------------------------- 0.75: Beat Echo f / ff meters
// f ('triplet'): 3/4 bars with triplet cells (1-trip-let, 1 – let). ff ('odd'): the pulse is the 8th note at twice the
// tempo, in 5/8 (3+2, 2+3) or 7/8 (2+2+3, 3+2+2) bars; every group start sounds (the meter is heard), some other 8ths,
// and from 6 pulses one onset displaced by a 16th (half a pulse). The chain length counts beats (f) or 8ths (ff).
export type EchoMeter = 'triplet' | 'odd';
const CELLS_TRIP: Cell[] = [[0], [0, 1 / 3, 2 / 3], [0, 2 / 3], [0, 0.5], [], [1 / 3, 2 / 3]];
const ODD_BARS: { groups: number[]; name: string }[] = [
  { groups: [3, 2], name: '5/8 · 3+2' },
  { groups: [2, 3], name: '5/8 · 2+3' },
  { groups: [2, 2, 3], name: '7/8 · 2+2+3' },
  { groups: [3, 2, 2], name: '7/8 · 3+2+2' },
];
/** Group sizes covering `n` beats: whole bars of `bar`, the last one cut short. */
export function groupsFor(bar: number[], n: number): number[] {
  const out: number[] = [];
  let left = n;
  for (let k = 0; left > 0; k++) {
    const g = Math.min(left, bar[k % bar.length]);
    out.push(g);
    left -= g;
  }
  return out;
}
export function meterPattern(seed: number, beats: number, bpm: number, meter: EchoMeter): RhythmPattern {
  const rnd = mulberry32(seed ^ 0x0dd);
  if (meter === 'triplet') {
    const onsets: number[] = [];
    for (let b = 0; b < beats; b++) {
      const cell = b === 0 ? (rnd() < 0.5 ? [0] : [0, 1 / 3, 2 / 3]) : CELLS_TRIP[Math.floor(rnd() * CELLS_TRIP.length)];
      cell.forEach((f) => onsets.push(b + f));
    }
    return { bpm, beats, onsets, groups: groupsFor([3], beats), meter: '3/4', bar: [3] };
  }
  const bar = ODD_BARS[Math.floor(rnd() * ODD_BARS.length)];
  const groups = groupsFor(bar.groups, beats);
  const starts = new Set<number>();
  groups.reduce((at, g) => (starts.add(at), at + g), 0);
  const onsets: number[] = [];
  for (let k = 0; k < beats; k++) if (starts.has(k) || rnd() < 0.4) onsets.push(k);
  if (beats >= 6) {
    const inner = onsets.filter((o) => !starts.has(o) && o + 0.5 < beats);
    if (inner.length) {
      const o = inner[Math.floor(rnd() * inner.length)];
      onsets[onsets.indexOf(o)] = o + 0.5;
    }
  }
  return { bpm: Math.min(320, bpm * 2), beats, onsets: onsets.sort((a, b) => a - b), groups, meter: bar.name, bar: bar.groups };
}
/** Beat indices that start a group (accented), or [0] without groups. */
export function groupStarts(p: Pick<RhythmPattern, 'groups'>): number[] {
  if (!p.groups?.length) return [0];
  const out: number[] = [];
  p.groups.reduce((at, g) => (out.push(at), at + g), 0);
  return out;
}

export interface RhythmGrade {
  pass: boolean;
  /** Per target onset: signed ms offset (+late / -early), or null if missed. */
  hits: { targetMs: number; offsetMs: number | null }[];
  extra: number;
  /** No taps at all: treat as a miss in games (it's the player's action), but report it. */
  silent: boolean;
  meanOffsetMs: number | null;
}

/**
 * Grade taps (ms from the response start = first beat of the pattern) against target onsets.
 * Greedy nearest matching within tolerance; each target and tap used once.
 */
export function gradeRhythm(p: RhythmPattern, tapsMs: number[], toleranceMs?: number, tapDrums?: Drum[]): RhythmGrade {
  const beatMs = beatSec(p.bpm) * 1000;
  const tol = toleranceMs ?? Math.max(80, Math.min(140, beatMs * 0.15));
  const targets = p.onsets.map((o) => o * beatMs);
  // Drum Echo: a tap only answers an onset on the same drum.
  const order = tapsMs.map((_, k) => k).sort((a, b) => tapsMs[a] - tapsMs[b]);
  const taps = order.map((k) => tapsMs[k]);
  const drumOf = (k: number) => (tapDrums ? tapDrums[order[k]] : undefined);
  const used = new Set<number>();
  const hits = targets.map((tm, ti) => {
    let best = -1;
    let bestD = Infinity;
    taps.forEach((x, k) => {
      if (used.has(k)) return;
      if (p.drums && tapDrums && drumOf(k) !== p.drums[ti]) return;
      const d = Math.abs(x - tm);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    if (best >= 0 && bestD <= tol) {
      used.add(best);
      return { targetMs: tm, offsetMs: Math.round(taps[best] - tm) };
    }
    return { targetMs: tm, offsetMs: null };
  });
  const extra = taps.length - used.size;
  const offs = hits.filter((h) => h.offsetMs !== null).map((h) => h.offsetMs!);
  return {
    pass: extra === 0 && hits.every((h) => h.offsetMs !== null),
    hits,
    extra,
    silent: taps.length === 0,
    meanOffsetMs: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null,
  };
}

/** Audio events: count-in clicks (accent on 1), the pattern on woodblock, and a second count-in. */
export interface RhythmTimeline {
  clicks: { t: number; accent: boolean; soft?: boolean }[];
  wood: number[];
  /** Drum Echo: kick or snare for each `wood` hit. */
  drums?: Drum[];
  /** Seconds from timeline start where the response (pattern beat 1) begins. */
  responseAt: number;
  /** Seconds at which the response window ends. */
  responseEnd: number;
}

export function rhythmTimeline(p: RhythmPattern, countIn0 = 4): RhythmTimeline {
  if (p.groups?.length) return groupedTimeline(p);
  const countIn = countIn0;
  const b = beatSec(p.bpm);
  const clicks: RhythmTimeline['clicks'] = [];
  for (let i = 0; i < countIn; i++) clicks.push({ t: i * b, accent: i === 0 });
  const patStart = countIn * b;
  // keep a soft pulse under the demonstration
  for (let i = 0; i < p.beats; i++) clicks.push({ t: patStart + i * b, accent: false });
  const wood = p.onsets.map((o) => patStart + o * b);
  const secondIn = patStart + p.beats * b;
  for (let i = 0; i < countIn; i++) clicks.push({ t: secondIn + i * b, accent: i === 0 });
  const responseAt = secondIn + countIn * b;
  // …and under the player's echo too (playtesting 0.37: the beat must not vanish when it is your turn), softer.
  for (let i = 0; i < p.beats; i++) clicks.push({ t: responseAt + i * b, accent: i === 0, soft: true });
  return { clicks, wood, ...(p.drums ? { drums: p.drums } : {}), responseAt, responseEnd: responseAt + p.beats * b + b * 0.6 };
}

/** 0.75: a grouped pattern's timeline — one bar of count-in (its group starts accented), the pulse under the demo and
 *  the echo accented on group starts too, so 7/8 sounds like 2+2+3. */
function groupedTimeline(p: RhythmPattern): RhythmTimeline {
  const b = beatSec(p.bpm);
  const bar = p.bar ?? p.groups!;
  // the count-in: whole bars of the meter, at least 4 pulses (two bars of 3/4)
  const len = Math.max(1, bar.reduce((a, c) => a + c, 0));
  const first = groupsFor(bar, len * Math.ceil(4 / len));
  const countIn = first.reduce((a, c) => a + c, 0);
  const inStarts = new Set(groupStarts({ groups: first }));
  const starts = new Set(groupStarts(p));
  const clicks: RhythmTimeline['clicks'] = [];
  for (let i = 0; i < countIn; i++) clicks.push({ t: i * b, accent: inStarts.has(i) });
  const patStart = countIn * b;
  for (let i = 0; i < p.beats; i++) clicks.push({ t: patStart + i * b, accent: false, ...(starts.has(i) ? {} : { soft: true }) });
  const wood = p.onsets.map((o) => patStart + o * b);
  const secondIn = patStart + p.beats * b;
  for (let i = 0; i < countIn; i++) clicks.push({ t: secondIn + i * b, accent: inStarts.has(i) });
  const responseAt = secondIn + countIn * b;
  for (let i = 0; i < p.beats; i++) clicks.push({ t: responseAt + i * b, accent: starts.has(i), soft: true });
  return { clicks, wood, ...(p.drums ? { drums: p.drums } : {}), responseAt, responseEnd: responseAt + p.beats * b + b * 0.6 };
}

/**
 * Tap-latency calibration: taps against a click track starting at `firstMs` (perf clock, as heard).
 * Ignores the first `skip` clicks (settling in), matches each tap to its nearest click and returns
 * the median offset in ms, or null when fewer than 4 usable taps.
 */
export function calibrationOffset(firstMs: number, tapsMs: number[], bpm: number, skip = 4): number | null {
  const beat = (60 / bpm) * 1000;
  const offs: number[] = [];
  for (const t of tapsMs) {
    const rel = t - firstMs;
    const k = Math.round(rel / beat);
    if (k < skip) continue;
    const off = rel - k * beat;
    if (Math.abs(off) < beat * 0.4) offs.push(off);
  }
  if (offs.length < 4) return null;
  offs.sort((a, b) => a - b);
  return Math.round(offs[Math.floor(offs.length / 2)]);
}

export interface RhythmSplit {
  /** Pattern remembered: right number and order of onsets within a lenient window (a quarter beat). */
  memoryPass: boolean;
  /** Precision 0..1 from the mean absolute offset — only when the pattern was remembered. */
  precision: number | null;
  meanAbsMs: number | null;
}

/**
 * Separate *what* was tapped from *how precisely*. Memory uses a lenient window so sloppy timing
 * is not counted as forgetting; precision is graded only on remembered patterns so forgetting is not
 * counted as imprecision. precision = 1 at 0 ms average error, 0 at a quarter beat (or worse).
 */
export function splitRhythm(p: RhythmPattern, tapsMs: number[], tapDrums?: Drum[]): RhythmSplit {
  const beatMs = beatSec(p.bpm) * 1000;
  const lenient = gradeRhythm(p, tapsMs, beatMs * 0.25, tapDrums);
  if (!lenient.pass) return { memoryPass: false, precision: null, meanAbsMs: null };
  const abs = lenient.hits.map((h) => Math.abs(h.offsetMs ?? 0));
  const meanAbsMs = Math.round(abs.reduce((a, b) => a + b, 0) / abs.length);
  return { memoryPass: true, precision: Math.max(0, Math.min(1, 1 - meanAbsMs / (beatMs * 0.25))), meanAbsMs };
}

/** Difficulty of a Beat Echo round for precision: faster tempo and more off-beat eighths are harder. */
export function timingDifficulty(p: RhythmPattern): number {
  const eighths = p.onsets.filter((o) => o % 1 !== 0).length;
  return Math.round(880 + (p.bpm - 75) * 5 + eighths * 35 + p.beats * 10);
}

export interface SungSequenceGrade {
  pass: boolean;
  /** Fraction of target notes sung right (extras count against): the item accuracy. */
  accuracy: number;
  notes: { status: NoteStatus }[];
  extra: number;
  unclear: boolean;
  /** Notes sung with the right name in the wrong octave (against the item's octave). */
  octaveOff?: number;
}

/**
 * Grade a sung sequence against target MIDI notes (octave-insensitive): segment the capture into
 * notes, map each to the target pitch class within ±tolCents (else "wrong"), then align in order.
 */
export function gradeSungSequence(frames: SungFrame[], targetMidis: number[], tolCents = 50): SungSequenceGrade {
  const segs = segmentNotes(frames);
  if (!segs.length) return { pass: false, accuracy: 0, notes: targetMidis.map(() => ({ status: 'missed' })), extra: 0, unclear: true };
  const ids = [...new Set(targetMidis.map((m) => ((m % 12) + 12) % 12))];
  // Each segment: the nearest note name of the item (within the tolerance) and its octave against the nearest target
  // of that name. The whole item may sit in another octave (the most common offset); a note off that octave is wrong.
  const named = segs.map((sg) => {
    let best: number | null = null;
    let bestD = Infinity;
    for (const id of ids) {
      const c = ((((sg.midi - id) * 100 + 600) % 1200) + 1200) % 1200 - 600;
      if (Math.abs(c) < bestD) {
        bestD = Math.abs(c);
        best = id;
      }
    }
    if (bestD > tolCents || best === null) return { sg, near: null as number | null, off: 0 };
    const same = targetMidis.filter((m) => ((m % 12) + 12) % 12 === best);
    const near = same.reduce((a, b) => (Math.abs(b - sg.midi) < Math.abs(a - sg.midi) ? b : a));
    return { sg, near, off: octaveOffset(sg.midi, near) };
  });
  const shift = itemOctave(named.filter((n) => n.near !== null).map((n) => n.off));
  // The written note each segment stands for, taken back from the item's octave (a note off that octave lands on a
  // note that is not the one asked for).
  const given: (number | null)[] = [];
  let lastEnd = -1;
  for (const n of named) {
    const v = n.near === null ? null : n.near + 12 * (n.off - shift);
    // Merge a re-attack of the same note separated by a tiny gap.
    if (given.length && given[given.length - 1] === v && v !== null && n.sg.start - lastEnd < 0.1) {
      lastEnd = n.sg.end;
      continue;
    }
    given.push(v);
    lastEnd = n.sg.end;
  }
  const g = gradeMelody(targetMidis, given);
  const ok = g.notes.filter((n) => n.status === 'ok').length;
  const octaveOff = g.notes.filter((n) => n.status === 'wrong' && n.given !== null && (((n.given - n.target) % 12) + 12) % 12 === 0).length;
  return { pass: g.pass, accuracy: ok / (targetMidis.length + g.extra), notes: g.notes.map((n) => ({ status: n.status })), extra: g.extra, unclear: false, octaveOff };
}
