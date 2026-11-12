// Rhythm Highway (spec AE §8, §10.2, R8): a rhythm level's notes scroll to a hit line over a drums + bass loop.
// Tap mode: tap on time. Pitch-lanes mode: 3–5 lanes are notes of a scale, played on the instrument (mic / MIDI).
// Pure: song generation, hit windows (tap latency subtracted), judging, combo, points, accuracy, checkpoints,
// backing-track events and an onset tracker for pitch frames.

import { mulberry32, type NoteEvent } from './lesson';
import { barBeats, compound, events, meterOf, readTolerance, rhythmAt, TPQ, type Rhythm, type RhythmLevel } from './rhythm';
import { defaultGroups, parseMeter } from './drills/timeline';

/** Highway levels: the rhythm levels R1–R8, plus (0.70, ff) R9 odd meters and R10 polyrhythm (tap mode); kit levels 1–7. */
export type HighwayLevel = RhythmLevel | 9 | 10;
export const ODD_LEVEL = 9;
export const POLY_LEVEL = 10;

export type HighwayMode = 'tap' | 'pitch' | 'kit';
export type HitGrade = 'perfect' | 'good' | 'miss';

export interface HighwayOptions {
  mode: HighwayMode;
  level: HighwayLevel;
  /** Song number within the level (1..SONGS_PER_LEVEL): a fixed seed, so "per-song best" means the same song. */
  song: number;
  bpm: number;
  /** Pitch lanes: 3–5 (ignored in tap mode). */
  lanes?: 3 | 4 | 5;
  /** Pitch class of the key's tonic (0 = C). Default 0. */
  keyPc?: number;
  /** Default 8. */
  bars?: number;
  /** Level tier of the run (GAMES_TIERS_PLAN): sets the level per song chip and the tempo. */
  tier?: import('./courseSocial').DynName;
  /** A tier's practice tempo: 60 / 80 % of its tempo (`bpm` already holds the result). Cleared only at 100. */
  tempoPct?: number;
  /** Kit lanes, the first song of the first tier: kick and snare only (two drums before the hi-hat joins). */
  kitEasy?: boolean;
}

export interface HighwayNote {
  i: number;
  /** Quarter beats from beat 1 of the song. */
  beat: number;
  /** ms from beat 1 of the song. */
  ms: number;
  durMs: number;
  bar: number;
  section: number;
  lane: number;
  /** Pitch-lanes mode: the note to play; null in tap mode. */
  midi: number | null;
}

export interface HighwaySong {
  id: string;
  opts: HighwayOptions;
  rhythm: Rhythm;
  beatsPerBar: number;
  beatMs: number;
  bars: number;
  sectionBars: number;
  sections: number;
  lengthMs: number;
  notes: HighwayNote[];
  /** One midi per lane (pitch mode), low to high; [] in tap mode. */
  laneMidis: number[];
  laneDegrees: number[];
  /** Odd-meter songs (R9, kit 7): the bar's grouping in eighths (2+2+3 …); the backing accents each group start. */
  groups?: number[];
  /** Shown with the song: "7/8 · 2+2+3", "3:2" … */
  meterLabel?: string;
}

export const SONGS_PER_LEVEL = 3;
export const SECTION_BARS = 2;
/** Pitch-lanes mode reads pitch from a microphone: the slowest levels only. */
export const PITCH_MAX_LEVEL: RhythmLevel = 4;

const DEGREE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
/** Lanes → scale degrees (1-based). */
export const LANE_DEGREES: Record<3 | 4 | 5, number[]> = { 3: [1, 2, 3], 4: [1, 2, 3, 5], 5: [1, 2, 3, 4, 5] };

export const songId = (o: Pick<HighwayOptions, 'mode' | 'level' | 'song' | 'lanes' | 'kitEasy'>) =>
  `${o.mode === 'pitch' ? `p${o.lanes ?? 3}` : o.mode === 'kit' ? 'k' : 't'}-R${o.level}-${o.song}${o.mode === 'kit' && o.kitEasy ? 'e' : ''}`;

const songSeed = (o: HighwayOptions) => (0x51a7 + o.level * 7919 + o.song * 104729 + (o.mode === 'pitch' ? 15485863 : o.mode === 'kit' ? 32452843 : 0)) >>> 0;

// ---------------------------------------------------------------- kit lanes (drums course, DRUMS_CURRICULUM §6 #9)

/** Kit lanes, left to right: hi-hat, snare, kick, tom, cymbal (crash / ride). Each lane's note is its GM drum note. */
export const KIT_LANES = ['hihat', 'snare', 'kick', 'tom', 'cymbal'] as const;
export type KitLane = (typeof KIT_LANES)[number];
export const KIT_LANE_NOTE: Record<KitLane, number> = { hihat: 42, snare: 38, kick: 36, tom: 48, cymbal: 49 };
/** A drum voice → its lane (the pedal "chick" has none). */
export function kitLaneOf(voice: string | null | undefined): number | null {
  if (!voice) return null;
  if (voice === 'hihat' || voice === 'hhOpen') return 0;
  if (voice === 'snare' || voice === 'rim') return 1;
  if (voice === 'kick') return 2;
  if (voice.startsWith('tom')) return 3;
  if (voice === 'crash' || voice === 'ride') return 4;
  return null;
}
/** Kit mode has its own grooves: levels 1–6 (quarter hats → 16th hats, kick variations, fills at section ends). */
export const KIT_MAX_LEVEL = 7;
/** One bar of a kit-mode groove, as [lane, beat] pairs. Level and a seeded choice pick the variation. */
function kitBar(level: number, rnd: () => number, fill: boolean, crash: boolean): [number, number][] {
  const out: [number, number][] = [];
  const hatStep = level <= 1 ? 1 : level <= 4 ? 0.5 : 0.25;
  const kicks = [[0, 2], [0, 2, 2.5], [0, 1.5, 2], [0, 0.75, 2, 2.5], [0, 1.75, 2.5]][Math.min(4, Math.floor(rnd() * Math.min(5, level + 1)))];
  const end = fill ? (level >= 3 ? 2 : 3) : 4;
  for (let b = 0; b < end - 1e-9; b += hatStep) if (!(crash && b === 0)) out.push([0, b]);
  for (const k of kicks) if (k < end) out.push([2, k]);
  for (const s of [1, 3]) if (s < end) out.push([1, s]);
  if (level >= 4 && !fill && rnd() < 0.4) out.push([1, 3.75]);
  if (crash) out.push([4, 0]);
  if (fill) {
    // The fill: 8ths (L1–2) or 16ths, snare then toms, to the bar line.
    const st = level <= 2 ? 0.5 : 0.25;
    for (let b = end, i = 0; b < 4 - 1e-9; b += st, i++) out.push([i < (4 - end) / st / 2 ? 1 : 3, b]);
  }
  return out;
}

export function highwaySong(o: HighwayOptions): HighwaySong {
  if (o.mode === 'kit') return o.level >= 7 ? kit7Song(o) : kitSong(o);
  if (o.level >= ODD_LEVEL) return o.level === POLY_LEVEL ? polySong(o) : oddSong(o);
  const bars = o.bars ?? 8;
  const seed = songSeed(o);
  const rhythm = rhythmAt(o.level as RhythmLevel, bars, seed);
  const beatsPerBar = barBeats(meterOf(rhythm));
  const beatMs = 60000 / o.bpm;
  const rnd = mulberry32(seed ^ 0x1a2e);
  const lanes = o.mode === 'pitch' ? (o.lanes ?? 3) : 1;
  const laneDegrees = o.mode === 'pitch' ? LANE_DEGREES[lanes as 3 | 4 | 5] : [];
  const keyPc = (((o.keyPc ?? 0) % 12) + 12) % 12;
  // Lanes sit in a comfortable middle octave (C4–B4 tonic); grading ignores the octave.
  const laneMidis = laneDegrees.map((d) => 60 + keyPc + DEGREE_SEMIS[d - 1]);
  let lane = 0;
  const notes: HighwayNote[] = events(rhythm)
    .filter((e) => !e.rest)
    .map((e, i) => {
      const beat = e.start / TPQ;
      const bar = Math.floor(beat / beatsPerBar + 1e-9);
      if (lanes > 1 && i > 0) {
        // Mostly steps, some repeats and skips; stay inside the lanes.
        const steps = [-1, 1, 1, -1, 0, 2, -2];
        for (let k = 0; k < 8; k++) {
          const next = lane + steps[Math.floor(rnd() * steps.length)];
          if (next >= 0 && next < lanes) {
            lane = next;
            break;
          }
        }
      }
      return {
        i,
        beat,
        ms: Math.round(beat * beatMs),
        durMs: Math.round((e.dur / TPQ) * beatMs),
        bar,
        section: Math.floor(bar / SECTION_BARS),
        lane: lanes > 1 ? lane : 0,
        midi: lanes > 1 ? laneMidis[lane] : null,
      };
    });
  return {
    id: songId(o),
    opts: o,
    rhythm,
    beatsPerBar,
    beatMs,
    bars,
    sectionBars: SECTION_BARS,
    sections: Math.ceil(bars / SECTION_BARS),
    lengthMs: Math.round(bars * beatsPerBar * beatMs),
    notes,
    laneMidis,
    laneDegrees,
  };
}

function kitSong(o: HighwayOptions): HighwaySong {
  const bars = o.bars ?? 8;
  const seed = songSeed(o);
  const rhythm = rhythmAt(1, bars, seed);
  const beatsPerBar = 4;
  const beatMs = 60000 / o.bpm;
  const rnd = mulberry32(seed ^ 0x2b7e);
  const laneMidis = KIT_LANES.map((l) => KIT_LANE_NOTE[l]);
  const hits: [number, number][] = [];
  for (let bar = 0; bar < bars; bar++) {
    const fill = bar % SECTION_BARS === SECTION_BARS - 1 && bar < bars - 1 && o.level >= 2;
    const crash = bar % SECTION_BARS === 0 && bar > 0 && o.level >= 2;
    // the easiest song: kick on 1 and 3, snare on 2 and 4, nothing else
    const bar1: [number, number][] = o.kitEasy ? [[2, 0], [1, 1], [2, 2], [1, 3]] : kitBar(o.level, rnd, fill, crash);
    for (const [lane, b] of bar1) hits.push([lane, bar * 4 + b]);
  }
  hits.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const notes: HighwayNote[] = hits.map(([lane, beat], i) => {
    const bar = Math.floor(beat / beatsPerBar + 1e-9);
    return { i, beat, ms: Math.round(beat * beatMs), durMs: Math.round(0.25 * beatMs), bar, section: Math.floor(bar / SECTION_BARS), lane, midi: laneMidis[lane] };
  });
  return { id: songId(o), opts: o, rhythm, beatsPerBar, beatMs, bars, sectionBars: SECTION_BARS, sections: Math.ceil(bars / SECTION_BARS), lengthMs: Math.round(bars * beatsPerBar * beatMs), notes, laneMidis, laneDegrees: [] };
}

// ---------------------------------------------------------------- R9 odd meters, R10 polyrhythm, kit 7 (0.70, ff)
// Bars and groupings come from the shared prog engine (drills/timeline.ts parseMeter / defaultGroups, PROG_ENGINE.md).

/** The odd meters of R9 (eighth-note bars, grouped). */
export const ODD_METERS = ['5/8', '5/8 2+3', '7/8', '7/8 3+2+2', '9/8 2+2+2+3', '11/8'];
/** The ratios of R10: [notes against, the beat count of one cycle in quarter notes]. */
export const POLY_RATIOS: [number, number][] = [[3, 2], [4, 3], [3, 4], [5, 4]];

function finishSong(o: HighwayOptions, rhythm: Rhythm, beatsPerBar: number, bars: number, onsets: number[], extra: { groups?: number[]; meterLabel: string; lanes?: number[]; laneMidis?: number[] }): HighwaySong {
  const beatMs = 60000 / o.bpm;
  const sorted = onsets.map((b, k) => [b, extra.lanes?.[k] ?? 0] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const notes: HighwayNote[] = sorted.map(([beat, lane], i) => {
    const bar = Math.floor(beat / beatsPerBar + 1e-9);
    return { i, beat, ms: Math.round(beat * beatMs), durMs: Math.round(0.4 * beatMs), bar, section: Math.floor(bar / SECTION_BARS), lane, midi: extra.laneMidis ? extra.laneMidis[lane] : null };
  });
  return { id: songId(o), opts: o, rhythm, beatsPerBar, beatMs, bars, sectionBars: SECTION_BARS, sections: Math.ceil(bars / SECTION_BARS), lengthMs: Math.round(bars * beatsPerBar * beatMs), notes, laneMidis: extra.laneMidis ?? [], laneDegrees: [], groups: extra.groups, meterLabel: extra.meterLabel };
}

/** R9: one odd meter per song; every group start is a note, the eighths between are filled by chance (fewer at speed). */
function oddSong(o: HighwayOptions): HighwaySong {
  const bars = o.bars ?? 8;
  const seed = songSeed(o);
  const rnd = mulberry32(seed ^ 0x0dd5);
  const m = parseMeter(ODD_METERS[(o.song - 1 + Math.floor(rnd() * ODD_METERS.length)) % ODD_METERS.length]);
  const groups = m.groups ?? defaultGroups(m.num, m.den) ?? [m.num];
  const beatsPerBar = m.num / 2;
  const fill = o.bpm >= 150 ? 0.25 : 0.45;
  const onsets: number[] = [];
  for (let bar = 0; bar < bars; bar++) {
    let e = 0;
    for (const g of groups) {
      for (let k = 0; k < g; k++, e++) if (k === 0 || rnd() < fill) onsets.push(bar * beatsPerBar + e / 2);
    }
  }
  const rhythm: Rhythm = { beatsPerBar, bars, cells: [] };
  return finishSong(o, rhythm, beatsPerBar, bars, onsets, { groups, meterLabel: `${m.num}/${m.den} · ${groups.join('+')}` });
}

/** R10: a polyrhythm read as its composite (both hands' notes on one road): 3:2, 4:3, 3:4, 5:4 per song. */
function polySong(o: HighwayOptions): HighwaySong {
  const bars = o.bars ?? 8;
  const [a, b] = POLY_RATIOS[(o.song - 1) % POLY_RATIOS.length];
  const beatsPerBar = b;
  const onsets = new Set<number>();
  for (let bar = 0; bar < bars; bar++) {
    for (let i = 0; i < a; i++) onsets.add(Math.round((bar * b + (i * b) / a) * 1000) / 1000);
    for (let j = 0; j < b; j++) onsets.add(bar * b + j);
  }
  const rhythm: Rhythm = { beatsPerBar, bars, cells: [] };
  return finishSong(o, rhythm, beatsPerBar, bars, [...onsets], { meterLabel: `${a}:${b}` });
}

/** Kit level 7: odd-meter grooves (7/8, 5/8), double-kick 16ths, half-time shuffle; linear fills at section ends. */
function kit7Song(o: HighwayOptions): HighwaySong {
  const bars = o.bars ?? 8;
  const seed = songSeed(o);
  const rnd = mulberry32(seed ^ 0x7c17);
  const style = (['odd7', 'dbl', 'half', 'odd5'] as const)[(o.song - 1 + Math.floor(rnd() * 4)) % 4];
  const m = style === 'odd7' ? parseMeter('7/8 2+2+3') : style === 'odd5' ? parseMeter('5/8 3+2') : null;
  const groups = m?.groups;
  const beatsPerBar = m ? m.num / 2 : 4;
  const laneMidis = KIT_LANES.map((l) => KIT_LANE_NOTE[l]);
  const hits: [number, number][] = [];
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * beatsPerBar;
    const fill = bar % SECTION_BARS === SECTION_BARS - 1 && bar < bars - 1;
    const crash = bar % SECTION_BARS === 0 && bar > 0;
    if (crash) hits.push([4, t0]);
    if (m && groups) {
      // hats on every eighth, kick on the bar's 1, snare on the later group starts; the fill is linear (one limb at a time)
      let e = 0;
      const end = fill ? groups[0] : m.num;
      groups.forEach((g, gi) => {
        for (let k = 0; k < g; k++, e++) {
          if (e >= end) continue;
          if (!(crash && e === 0)) hits.push([0, t0 + e / 2]);
          if (k === 0) hits.push([gi === 0 ? 2 : 1, t0 + e / 2]);
        }
      });
      if (fill) for (let x = end * 2, i = 0; x < m.num * 2; x++, i++) hits.push([[1, 3, 2][i % 3], t0 + x / 4]);
    } else if (style === 'dbl') {
      // 16th double kick under 8th hats, backbeat; the fill: 16th snare / tom / kick, linear
      const end = fill ? 3 : 4;
      for (let x = 0; x < end * 2; x++) if (!(crash && x === 0)) hits.push([0, t0 + x / 2]);
      for (let x = 0; x < end * 4; x++) if (x >= 8 || x % 4 === 0) hits.push([2, t0 + x / 4]);
      for (const sn of [1, 3]) if (sn < end) hits.push([1, t0 + sn]);
      if (fill) for (let x = 12, i = 0; x < 16; x++, i++) hits.push([[1, 3, 2, 3][i], t0 + x / 4]);
    } else {
      // half-time shuffle: triplet hats (middle partial left out), kick on 1, snare on 3, a ghost before it
      const end = fill ? 3 : 4;
      for (let q = 0; q < end; q++) {
        if (!(crash && q === 0)) hits.push([0, t0 + q]);
        hits.push([0, t0 + q + 2 / 3]);
      }
      hits.push([2, t0]);
      if (2 < end) hits.push([1, t0 + 2]);
      if (rnd() < 0.6 && end > 3) hits.push([2, t0 + 3 + 2 / 3]);
      if (fill) for (let x = 0; x < 3; x++) hits.push([[1, 3, 3][x], t0 + 3 + x / 3]);
    }
  }
  const rhythm: Rhythm = { beatsPerBar, bars, cells: [] };
  return finishSong(o, rhythm, beatsPerBar, bars, hits.map((h) => h[1]), { groups, meterLabel: m ? `${m.num}/${m.den} · ${groups!.join('+')}` : style === 'dbl' ? '4/4 · double kick' : '4/4 · half-time shuffle', lanes: hits.map((h) => h[0]), laneMidis });
}

export const sectionStartMs = (s: HighwaySong, section: number) => Math.round(section * s.sectionBars * s.beatsPerBar * s.beatMs);

// ---------------------------------------------------------------- hit windows

export interface HitWindows {
  perfect: number;
  good: number;
}

/**
 * Windows from the rhythm level's reading tolerance (spec G.5): good = the tolerance, perfect = under half of
 * it. Pitch lanes are wider: pitch detection needs a few frames before it names a note.
 */
export function hitWindows(level: HighwayLevel, bpm: number, mode: HighwayMode = 'tap'): HitWindows {
  // Kit mode: MIDI time stamps, the rhythm-level tolerance of a level-1 reading (generous for four limbs).
  // R9 reads eighths (as R4), R10 triplet-like gaps (as R6).
  const read = (level === ODD_LEVEL ? 4 : level === POLY_LEVEL ? 6 : level) as RhythmLevel;
  const tol = readTolerance(mode === 'kit' ? (Math.min(level, 3) as RhythmLevel) : read, bpm);
  const k = mode === 'pitch' ? 1.6 : 1;
  return { perfect: Math.round(Math.max(28, tol * 0.45) * k), good: Math.round(tol * k) };
}

/** Pitch detection (YIN, a few frames) reports a note this much after it starts; MIDI is immediate. */
export const MIC_PITCH_LAG_MS = 70;

// ---------------------------------------------------------------- a run

export interface HighwayRun {
  grades: (HitGrade | null)[];
  /** Signed ms (+ = late), after latency correction; null for misses / unjudged. */
  offsets: (number | null)[];
  combo: number;
  maxCombo: number;
  points: number;
  /** Taps / notes that matched no note (stray taps, wrong pitches). */
  extra: number;
  wrongPitch: number;
}

export const newRun = (s: HighwaySong): HighwayRun => ({
  grades: s.notes.map(() => null),
  offsets: s.notes.map(() => null),
  combo: 0,
  maxCombo: 0,
  points: 0,
  extra: 0,
  wrongPitch: 0,
});

/** Combo multiplier: ×1, then +1 every 8 in a row, up to ×4. */
export const multiplier = (combo: number) => 1 + Math.min(3, Math.floor(combo / 8));
export const GRADE_POINTS: Record<HitGrade, number> = { perfect: 100, good: 50, miss: 0 };

function apply(run: HighwayRun, i: number, grade: HitGrade, offset: number | null): HighwayRun {
  const grades = run.grades.slice();
  const offsets = run.offsets.slice();
  grades[i] = grade;
  offsets[i] = offset;
  const combo = grade === 'miss' ? 0 : run.combo + 1;
  return { ...run, grades, offsets, combo, maxCombo: Math.max(run.maxCombo, combo), points: run.points + GRADE_POINTS[grade] * multiplier(combo) };
}

export interface Judged {
  run: HighwayRun;
  /** The note judged, or null for a stray tap / wrong pitch. */
  note: number | null;
  grade: HitGrade | null;
  offset: number | null;
  wrongPitch?: boolean;
}

/**
 * Judge one input. `songMs` is when the input happened (ms from beat 1 of the song, raw); the device's tap
 * latency (`settings.tapLatencyMs`, spec R8) is subtracted. In pitch mode `midi` must match the note's lane
 * (octave ignored, nearest semitone); a wrong pitch breaks the combo but leaves the note open.
 */
export function judgeInput(s: HighwaySong, run: HighwayRun, songMs: number, latencyMs: number, midi?: number | null): Judged {
  const w = hitWindows(s.opts.level, s.opts.bpm, s.opts.mode);
  const t = songMs - latencyMs;
  let best = -1;
  let bestAbs = Infinity;
  const kit = s.opts.mode === 'kit';
  let otherLane = false;
  s.notes.forEach((n, i) => {
    if (run.grades[i] !== null) return;
    const d = Math.abs(t - n.ms);
    // Kit lanes: only a note of the lane that was hit; another lane's note there = the wrong drum.
    if (kit && n.midi !== midi) {
      if (d <= w.good) otherLane = true;
      return;
    }
    if (d <= w.good && d < bestAbs) {
      best = i;
      bestAbs = d;
    }
  });
  if (best < 0 && kit && otherLane) return { run: { ...run, extra: run.extra + 1, wrongPitch: run.wrongPitch + 1, combo: 0 }, note: null, grade: null, offset: null, wrongPitch: true };
  if (best < 0) return { run: { ...run, extra: run.extra + 1, combo: 0 }, note: null, grade: null, offset: null };
  const n = s.notes[best];
  if (s.opts.mode === 'pitch' && n.midi !== null) {
    const ok = typeof midi === 'number' && (((Math.round(midi) - n.midi) % 12) + 12) % 12 === 0;
    if (!ok) return { run: { ...run, extra: run.extra + 1, wrongPitch: run.wrongPitch + 1, combo: 0 }, note: null, grade: null, offset: null, wrongPitch: true };
  }
  const offset = Math.round(t - n.ms);
  const grade: HitGrade = Math.abs(offset) <= w.perfect ? 'perfect' : 'good';
  return { run: apply(run, best, grade, offset), note: best, grade, offset };
}

/** Notes whose window has passed (input time `songMs`, latency-corrected) become misses. Returns the indices missed now. */
export function sweepMisses(s: HighwaySong, run: HighwayRun, songMs: number, latencyMs: number): { run: HighwayRun; missed: number[] } {
  const w = hitWindows(s.opts.level, s.opts.bpm, s.opts.mode);
  const t = songMs - latencyMs;
  let r = run;
  const missed: number[] = [];
  s.notes.forEach((n, i) => {
    if (r.grades[i] === null && t > n.ms + w.good) {
      r = apply(r, i, 'miss', null);
      missed.push(i);
    }
  });
  return { run: r, missed };
}

/**
 * Checkpoint (resume at the last section): clear every note from `section` on and recount combo and points
 * from the grades that remain. Stray-tap counts are kept.
 */
export function rewind(s: HighwaySong, run: HighwayRun, section: number): HighwayRun {
  let r: HighwayRun = { ...newRun(s), extra: run.extra, wrongPitch: run.wrongPitch };
  s.notes.forEach((n, i) => {
    const g = run.grades[i];
    if (n.section < section && g !== null) r = apply(r, i, g, run.offsets[i]);
  });
  return r;
}

/** Every note of the sections before `section` has been judged. */
export const sectionsDone = (s: HighwaySong, run: HighwayRun, section: number) => s.notes.every((n, i) => n.section >= section || run.grades[i] !== null);

export interface HighwaySummary {
  /** 0..100 */
  accuracy: number;
  perfect: number;
  good: number;
  miss: number;
  extra: number;
  maxCombo: number;
  fullCombo: boolean;
  points: number;
  /** Mean signed offset of the hits, ms (+ = late), or null. */
  meanOffsetMs: number | null;
}

/** % accuracy: perfect = 1, good = 0.6, minus a little per stray input (less for mic noise in pitch mode). */
export function summary(s: HighwaySong, run: HighwayRun): HighwaySummary {
  const count = (g: HitGrade) => run.grades.filter((x) => x === g).length;
  const perfect = count('perfect');
  const good = count('good');
  const miss = s.notes.length - perfect - good;
  const n = Math.max(1, s.notes.length);
  const strayCost = s.opts.mode === 'pitch' ? 0.1 : 0.25;
  const raw = (perfect + 0.6 * good - strayCost * run.extra) / n;
  const offs = run.offsets.filter((x): x is number => x !== null);
  return {
    accuracy: Math.round(100 * Math.min(1, Math.max(0, raw))),
    perfect,
    good,
    miss,
    extra: run.extra,
    maxCombo: run.maxCombo,
    fullCombo: s.notes.length > 0 && perfect + good === s.notes.length,
    points: run.points,
    meanOffsetMs: offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null,
  };
}

// ---------------------------------------------------------------- the backing loop

export interface BackingTrack {
  /** Count-in clicks, then the metronome through the song when asked (seconds from the timeline start). */
  clicks: { t: number; accent: boolean; soft?: boolean }[];
  /** Kick / snare hits (seconds from the timeline start). */
  kit: { t: number; d: 'k' | 's' }[];
  /** Hats and bass, as note events (seconds from the timeline start). */
  extras: NoteEvent[];
  /** Seconds from the timeline start to the first beat played (the section's start). */
  responseAt: number;
  responseEnd: number;
}

/**
 * Drums + bass from `fromSection` to the end, after a one-bar count-in. Simple meters: kick on 1 (and 3),
 * snare on the backbeat, eighth hats (swung at R8). Compound meters: kick / snare on the dotted-quarter pulses.
 * Bass: a I–IV–V–I loop, one chord per bar. `bass: false` (pitch lanes by microphone) leaves the bass out so
 * the pitch tracker does not hear it.
 */
export function backingTrack(s: HighwaySong, fromSection = 0, opts: { bass?: boolean; drums?: boolean; click?: boolean } = {}): BackingTrack {
  const beat = s.beatMs / 1000;
  const m = meterOf(s.rhythm);
  const per = s.beatsPerBar;
  const comp = compound(m);
  const pulse = comp ? 1.5 : 1;
  const pulsesPerBar = per / pulse;
  const clicks = Array.from({ length: pulsesPerBar }, (_, i) => ({ t: i * pulse * beat, accent: i === 0 }));
  const responseAt = per * beat;
  const firstBar = fromSection * s.sectionBars;
  const kit: BackingTrack['kit'] = [];
  const extras: NoteEvent[] = [];
  const keyPc = (((s.opts.keyPc ?? 0) % 12) + 12) % 12;
  const loop = [0, 5, 7, 0];
  if (s.groups) {
    // Odd meters (R9, kit 7): count-in on the group starts; kick on the bar's 1, snare on the other group starts.
    const g = s.groups;
    const ei = beat / 2;
    const starts = g.map((_, i) => g.slice(0, i).reduce((x, y) => x + y, 0));
    const oddClicks = starts.map((e, i) => ({ t: e * ei, accent: i === 0 }));
    for (let b = firstBar; b < s.bars; b++) {
      const t0 = responseAt + (b - firstBar) * per * beat;
      if (opts.drums !== false) {
        starts.forEach((e, i) => kit.push({ t: t0 + e * ei, d: i === 0 ? 'k' : 's' }));
        for (let e = 0; e < per * 2; e++) extras.push({ midi: 0, start: t0 + e * ei, duration: 0.04, velocity: starts.includes(e) ? 0.5 : 0.32, perc: 'hat' });
      }
      if (opts.bass !== false) extras.push({ midi: 36 + ((keyPc + loop[b % 4]) % 12), start: t0, duration: per * beat * 0.9, velocity: 0.55 });
    }
    // Metronome through the song (kit lanes: the player is the drummer and needs the pulse): a click on each group start.
    if (opts.click) for (let b = firstBar; b < s.bars; b++) starts.forEach((e, i) => oddClicks.push({ t: responseAt + (b - firstBar) * per * beat + e * ei, accent: i === 0 }));
    return { clicks: oddClicks, kit, extras, responseAt, responseEnd: responseAt + (s.bars - firstBar) * per * beat + 0.4 };
  }
  for (let b = firstBar; b < s.bars; b++) {
    const t0 = responseAt + (b - firstBar) * per * beat;
    // Kit mode: the player is the drummer — the band brings only the bass.
    for (let p = 0; p < pulsesPerBar && opts.drums !== false; p++) {
      const t = t0 + p * pulse * beat;
      if (comp) kit.push({ t, d: p % 2 === 0 ? 'k' : 's' });
      else if (per === 3) kit.push({ t, d: p === 0 ? 'k' : 's' });
      else kit.push({ t, d: p % 2 === 0 ? 'k' : 's' });
    }
    // Eighth hats; swing (R8) delays the off-beat to the last triplet.
    for (let e = 0; e < per * 2 && opts.drums !== false; e++) {
      const off = e % 2 === 1;
      const t = t0 + (Math.floor(e / 2) + (off ? (s.rhythm.swing ? 2 / 3 : 0.5) : 0)) * beat;
      extras.push({ midi: 0, start: t, duration: 0.04, velocity: off ? 0.35 : 0.5, perc: 'hat' });
    }
    if (opts.bass !== false) {
      const root = 36 + ((keyPc + loop[b % 4]) % 12);
      const half = per >= 4 ? 2 : per;
      extras.push({ midi: root, start: t0, duration: half * beat * 0.9, velocity: 0.55 });
      if (per >= 4) extras.push({ midi: root + 7, start: t0 + half * beat, duration: (per - half) * beat * 0.9, velocity: 0.45 });
    }
  }
  // Metronome through the song (kit lanes: the player is the drummer and needs the pulse), accent on each bar's 1.
  if (opts.click) for (let b = firstBar; b < s.bars; b++) for (let p = 0; p < pulsesPerBar; p++) clicks.push({ t: responseAt + (b - firstBar) * per * beat + p * pulse * beat, accent: p === 0 });
  const responseEnd = responseAt + (s.bars - firstBar) * per * beat + 0.4;
  return { clicks, kit, extras, responseAt, responseEnd };
}

// ---------------------------------------------------------------- pitch onsets (mic)

export interface PitchFrameLike {
  /** ms on the same clock as the song (or any clock; onsets keep it). */
  ms: number;
  hz: number | null;
  confidence: number;
  rms: number;
}

/**
 * Online onset tracker for pitch frames (spec R4): a new note when a voiced, stable pitch starts after
 * silence, when the pitch moves by a semitone or more, or on an RMS re-attack of the same pitch.
 * Frames below `minMidi` (the kick drum through the speaker) are treated as unvoiced.
 */
export class OnsetTracker {
  private cur: number | null = null;
  private candidate: { midi: number; ms: number; n: number } | null = null;
  private unvoiced = 99;
  private rmsHist: number[] = [];
  private curSince = 0;

  constructor(
    private opts: { minMidi?: number; minConfidence?: number; stableFrames?: number } = {},
  ) {}

  feed(f: PitchFrameLike): { ms: number; midi: number } | null {
    const minMidi = this.opts.minMidi ?? 38;
    const midi = f.hz ? 69 + 12 * Math.log2(f.hz / 440) : null;
    const voiced = midi !== null && f.confidence >= (this.opts.minConfidence ?? 0.6) && midi >= minMidi;
    const minRms = this.rmsHist.length ? Math.min(...this.rmsHist) : f.rms;
    this.rmsHist = [...this.rmsHist, f.rms].slice(-4);
    if (!voiced) {
      this.unvoiced++;
      if (this.unvoiced >= 2) {
        this.cur = null;
        this.candidate = null;
      }
      return null;
    }
    this.unvoiced = 0;
    const r = Math.round(midi!);
    if (this.cur !== null && r === this.cur) {
      this.candidate = null;
      // Re-attack on the same pitch: the level jumps after the note has rung a while.
      if (f.ms - this.curSince > 120 && f.rms >= 1.8 * minRms && minRms > 0) {
        this.curSince = f.ms;
        return { ms: f.ms, midi: r };
      }
      return null;
    }
    if (this.candidate && this.candidate.midi === r) this.candidate.n++;
    else this.candidate = { midi: r, ms: f.ms, n: 1 };
    if (this.candidate.n >= (this.opts.stableFrames ?? 2)) {
      const on = { ms: this.candidate.ms, midi: r };
      this.cur = r;
      this.curSince = this.candidate.ms;
      this.candidate = null;
      return on;
    }
    return null;
  }
}

/** Personal best per song, kept on this device (the host app may also sync it via onResult). */
export type HighwayBests = Record<string, number>;
