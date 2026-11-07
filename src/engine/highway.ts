// Rhythm Highway (spec AE §8, §10.2, R8): a rhythm level's notes scroll to a hit line over a drums + bass loop.
// Tap mode: tap on time. Pitch-lanes mode: 3–5 lanes are notes of a scale, played on the instrument (mic / MIDI).
// Pure: song generation, hit windows (tap latency subtracted), judging, combo, points, accuracy, checkpoints,
// backing-track events and an onset tracker for pitch frames.

import { mulberry32, type NoteEvent } from './lesson';
import { barBeats, compound, events, meterOf, readTolerance, rhythmAt, TPQ, type Rhythm, type RhythmLevel } from './rhythm';

export type HighwayMode = 'tap' | 'pitch';
export type HitGrade = 'perfect' | 'good' | 'miss';

export interface HighwayOptions {
  mode: HighwayMode;
  level: RhythmLevel;
  /** Song number within the level (1..SONGS_PER_LEVEL): a fixed seed, so "per-song best" means the same song. */
  song: number;
  bpm: number;
  /** Pitch lanes: 3–5 (ignored in tap mode). */
  lanes?: 3 | 4 | 5;
  /** Pitch class of the key's tonic (0 = C). Default 0. */
  keyPc?: number;
  /** Default 8. */
  bars?: number;
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
}

export const SONGS_PER_LEVEL = 3;
export const SECTION_BARS = 2;
/** Pitch-lanes mode reads pitch from a microphone: the slowest levels only. */
export const PITCH_MAX_LEVEL: RhythmLevel = 4;

const DEGREE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
/** Lanes → scale degrees (1-based). */
export const LANE_DEGREES: Record<3 | 4 | 5, number[]> = { 3: [1, 2, 3], 4: [1, 2, 3, 5], 5: [1, 2, 3, 4, 5] };

export const songId = (o: Pick<HighwayOptions, 'mode' | 'level' | 'song' | 'lanes'>) =>
  `${o.mode === 'pitch' ? `p${o.lanes ?? 3}` : 't'}-R${o.level}-${o.song}`;

const songSeed = (o: HighwayOptions) => (0x51a7 + o.level * 7919 + o.song * 104729 + (o.mode === 'pitch' ? 15485863 : 0)) >>> 0;

export function highwaySong(o: HighwayOptions): HighwaySong {
  const bars = o.bars ?? 8;
  const seed = songSeed(o);
  const rhythm = rhythmAt(o.level, bars, seed);
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
export function hitWindows(level: RhythmLevel, bpm: number, mode: HighwayMode = 'tap'): HitWindows {
  const tol = readTolerance(level, bpm);
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
  s.notes.forEach((n, i) => {
    if (run.grades[i] !== null) return;
    const d = Math.abs(t - n.ms);
    if (d <= w.good && d < bestAbs) {
      best = i;
      bestAbs = d;
    }
  });
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
  /** Count-in clicks then nothing (seconds from the timeline start). */
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
export function backingTrack(s: HighwaySong, fromSection = 0, opts: { bass?: boolean } = {}): BackingTrack {
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
  for (let b = firstBar; b < s.bars; b++) {
    const t0 = responseAt + (b - firstBar) * per * beat;
    for (let p = 0; p < pulsesPerBar; p++) {
      const t = t0 + p * pulse * beat;
      if (comp) kit.push({ t, d: p % 2 === 0 ? 'k' : 's' });
      else if (per === 3) kit.push({ t, d: p === 0 ? 'k' : 's' });
      else kit.push({ t, d: p % 2 === 0 ? 'k' : 's' });
    }
    // Eighth hats; swing (R8) delays the off-beat to the last triplet.
    for (let e = 0; e < per * 2; e++) {
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
