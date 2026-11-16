// The beginner games per instrument (AUDIT-7 hole #14): Staff Runner (keys), Root Catcher (bass), Strum Changes
// (guitar), Rebound Ball (drums) and Sing It Back (voice). They share one run: laps of a few bars played against a
// count-in, a click and a now-cue, measured by MIDI or the microphone (no on-screen input: a tier is cleared only by
// the real instrument). This module is the shared part: matching what was heard to the lap's targets, the lap
// verdict, the run (lives, tempo, save / resume) and the result. Each game's own module builds its laps and judges a
// heard note (src/engine/staffRunner.ts, rootCatcher.ts, strumChanges.ts, reboundBall.ts, singBack.ts). Pure.
//
// The rule, the same in all five: a run is at most B_LAPS laps; a lap passes with ≥ 75 % of its targets caught (and
// the game's own check, e.g. even strokes); a failed lap costs one of B_LIVES lives; a clean lap (every target)
// speeds the next one up by B_BOOST_BPM. A tier is cleared by a run at ≥ 80 % (gameTiers.ts, clear 'accuracy').

import type { DynName } from './courseSocial';
import { rng } from './newGamesKit';

export type BGame = 'staffrunner' | 'rootcatch' | 'strumchange' | 'rebound' | 'singback';
export const B_GAMES: BGame[] = ['staffrunner', 'rootcatch', 'strumchange', 'rebound', 'singback'];
export const isBGame = (g: string): g is BGame => (B_GAMES as string[]).includes(g);

export const B_LAPS = 6;
export const B_LIVES = 3;
/** Share of a lap's targets that passes it. */
export const B_LAP_PASS = 0.75;
/** Count-in beats before every lap. */
export const B_COUNT_IN = 4;
/** Every clean lap adds this much tempo (at most B_BOOST_MAX times). */
export const B_BOOST_BPM = 4;
export const B_BOOST_MAX = 5;
/** The run accuracy (%) a tier asks for. */
export const B_CLEAR = 80;

export const bLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
export const clampLevel = (lv: number): number => Math.max(1, Math.min(6, Math.round(lv) || 1));

/** One thing to play in a lap. */
export interface BTarget {
  /** Beat it is due on, from the lap's beat 0 (the first beat after the count-in). */
  beat: number;
  /** The exact note (Staff Runner with MIDI, Sing It Back). */
  midi?: number;
  /** The pitch classes that count (Root Catcher: the root). */
  pcs?: number[];
  /** A strum target (Strum Changes). */
  chord?: { root: number; quality: string };
  /** Drums: an accented stroke. */
  accent?: boolean;
  /** Drums (the swell): the loudness asked for, 0..1. */
  level?: number;
  /** What the screen writes for it (a note or chord name; spelled by the game). */
  label: string;
  /** Root Catcher: the chord's Roman numeral in the key. */
  num?: string;
  /** Root Catcher: the chord's pitch classes (the band's notes; the mic may hear them). */
  tones?: number[];
}

/** A note the app plays inside a lap (Sing It Back's call; nothing for the others: no band under a mic take). */
export interface BCall {
  midi: number;
  beat: number;
  beats: number;
}

export interface BLap {
  game: BGame;
  level: number;
  /** Lap index in the run (0-based). */
  lap: number;
  bpm: number;
  /** Tonic pitch class of the lap (key mastery), or null (drums, open-chord pairs). */
  key: number | null;
  /** Beats in the lap after the count-in. */
  beats: number;
  targets: BTarget[];
  calls?: BCall[];
  /** Staff Runner: the clef. */
  clef?: 'treble' | 'bass';
  /** Beats per bar (4). */
  meter: number;
}

/** A heard event, `ms` after the lap's beat 0 with the input latency already removed. */
export interface BEvent {
  ms: number;
  midi?: number;
  /** Drums: velocity 1..127. */
  vel?: number;
  /** Strums: the recogniser's verdict against the target it fell on. */
  verdict?: 'right' | 'wrong' | 'again';
}

export type BMark = 'hit' | 'wrong' | 'miss';
/** A judge: is this event the target (right), something else (wrong), or not a decision (skip: an unclear strum, the band)? */
export type BJudge = (t: BTarget, e: BEvent) => 'right' | 'wrong' | 'skip';

/** The window (ms) round a target: early / late, never more than 45 % of the gap to the next target. */
export function bWindow(lap: Pick<BLap, 'targets' | 'bpm' | 'level'>, slack = 1): { early: number; late: number } {
  const beat = 60000 / lap.bpm;
  let gap = Infinity;
  const bs = lap.targets.map((t) => t.beat).sort((a, b) => a - b);
  for (let i = 1; i < bs.length; i++) gap = Math.min(gap, bs[i] - bs[i - 1]);
  const cap = Number.isFinite(gap) ? 0.45 * gap * beat : Infinity;
  const lv = clampLevel(lap.level);
  // beginner windows: generous at pp, tighter up the tiers (ms, before the cap)
  const late = Math.min(cap, slack * (lv <= 2 ? 0.45 : lv <= 4 ? 0.38 : 0.3) * beat, slack * 320);
  const early = Math.min(cap, slack * (lv <= 2 ? 0.35 : 0.3) * beat, slack * 260);
  return { early: Math.round(early), late: Math.round(late) };
}

export interface BMatch {
  marks: (BMark | undefined)[];
  /** ms off the beat of the deciding event (− early), per target. */
  offs: (number | null)[];
  /** The deciding event per target. */
  got: (BEvent | null)[];
  /** Events that fell in no target's window, or a second one in a decided window. */
  extra: BEvent[];
}

/**
 * Match heard events to targets: each event goes to the nearest undecided target whose window holds it; the first
 * event that is not a skip decides the target. Targets whose window closed before `upTo` (ms) without one are missed.
 */
export function matchLap(lap: Pick<BLap, 'targets' | 'bpm' | 'level'>, events: BEvent[], judge: BJudge, upTo = Infinity, win = bWindow(lap)): BMatch {
  const beat = 60000 / lap.bpm;
  const n = lap.targets.length;
  const marks: (BMark | undefined)[] = Array(n).fill(undefined);
  const offs: (number | null)[] = Array(n).fill(null);
  const got: (BEvent | null)[] = Array(n).fill(null);
  const extra: BEvent[] = [];
  const at = lap.targets.map((t) => t.beat * beat);
  for (const e of [...events].sort((a, b) => a.ms - b.ms)) {
    if (e.ms > upTo) break;
    let best = -1;
    for (let i = 0; i < n; i++) {
      if (e.ms < at[i] - win.early || e.ms > at[i] + win.late) continue;
      if (marks[i]) continue;
      if (best < 0 || Math.abs(e.ms - at[i]) < Math.abs(e.ms - at[best])) best = i;
    }
    if (best < 0) {
      extra.push(e);
      continue;
    }
    const v = judge(lap.targets[best], e);
    if (v === 'skip') continue;
    marks[best] = v === 'right' ? 'hit' : 'wrong';
    offs[best] = Math.round(e.ms - at[best]);
    got[best] = e;
  }
  for (let i = 0; i < n; i++) if (!marks[i] && at[i] + win.late < upTo) marks[i] = 'miss';
  return { marks, offs, got, extra };
}

/** A game's own lap check on top of the 75 % (Rebound Ball: even strokes). */
export interface BCheck {
  ok: boolean;
  /** 0..100 for the meter (evenness), when the game has one. */
  meter?: number;
  /** Why it failed (a key the screen turns into words). */
  why?: string;
}

export interface BLapOutcome {
  hits: number;
  total: number;
  pass: boolean;
  clean: boolean;
  /** The first target that went wrong or was missed (−1 none). */
  firstMiss: number;
  check?: BCheck;
}
export function lapOutcome(m: Pick<BMatch, 'marks'>, check?: BCheck): BLapOutcome {
  const total = m.marks.length;
  const hits = m.marks.filter((x) => x === 'hit').length;
  const ok = check ? check.ok : true;
  return { hits, total, pass: hits >= Math.ceil(B_LAP_PASS * total) && ok, clean: hits === total && ok, firstMiss: m.marks.findIndex((x) => x !== 'hit'), ...(check ? { check } : {}) };
}

// ---------------------------------------------------------------- keys of a run

/** Major keys from easy to hard (fewest accidentals first, sharps before flats). */
export const KEYS_BY_EASE = [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6];
/**
 * The key of lap `lap`: a key pool walked from a random start, one step a lap (all 12 at the top tiers; any 12
 * consecutive laps of a 12-key pool cover every key).
 */
export function lapKey(seed: number, lap: number, pool: readonly number[]): number {
  const start = Math.floor(rng((seed ^ 0x6c8e9cf5) >>> 0)() * pool.length);
  return pool[(start + lap) % pool.length];
}
/** Spelled names of the major keys (for key signatures and chord symbols). */
export const KEY_NAME = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Display names (♭ / ♯). */
export const KEY_SHOW = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

// ---------------------------------------------------------------- the run

export interface BKeyTake {
  key: number;
  acc: number;
  bpm: number;
}
export interface BSave {
  v: 1;
  game: BGame;
  seed: number;
  tier?: DynName;
  level: number;
  /** The next lap to play (= laps played). */
  lap: number;
  lives: number;
  /** Targets caught / played in the run. */
  hits: number;
  total: number;
  /** Clean laps so far (each speeds the next lap up). */
  boost: number;
  input: 'mic' | 'midi';
  /** Laps with a key: their accuracy and tempo (key mastery). */
  keys: BKeyTake[];
  /** Laps passed. */
  passed: number;
}
export const newBSave = (game: BGame, seed: number, level: number, input: 'mic' | 'midi', tier?: DynName): BSave => ({ v: 1, game, seed: seed >>> 0, level: clampLevel(level), lap: 0, lives: B_LIVES, hits: 0, total: 0, boost: 0, input, keys: [], passed: 0, ...(tier ? { tier } : {}) });
export function isBSave(x: unknown, game: BGame): x is BSave {
  const s = x as BSave | null;
  return !!s && s.v === 1 && s.game === game && typeof s.seed === 'number' && typeof s.lap === 'number' && typeof s.lives === 'number' && Array.isArray(s.keys);
}
/** The tempo of the run's next lap. */
export const runBpm = (base: number, s: Pick<BSave, 'boost'>): number => base + B_BOOST_BPM * Math.min(B_BOOST_MAX, s.boost);
/** The run after a lap. */
export function afterLap(s: BSave, lap: Pick<BLap, 'key' | 'bpm'>, o: BLapOutcome): BSave {
  return {
    ...s,
    lap: s.lap + 1,
    lives: o.pass ? s.lives : s.lives - 1,
    hits: s.hits + o.hits,
    total: s.total + o.total,
    boost: o.clean ? s.boost + 1 : s.boost,
    passed: s.passed + (o.pass ? 1 : 0),
    keys: lap.key === null ? s.keys : [...s.keys, { key: lap.key, acc: Math.round((100 * o.hits) / Math.max(1, o.total)), bpm: lap.bpm }],
  };
}
export const runOver = (s: Pick<BSave, 'lap' | 'lives'>): boolean => s.lives <= 0 || s.lap >= B_LAPS;
/** Points per target caught (harder tiers more). */
export const bPoints = (level: number): number => 4 + clampLevel(level);

/** The finished run for XP, tiers, ratings, boards and key mastery. */
export function bResult(s: BSave, lastBpm: number) {
  const accuracy = Math.round((100 * s.hits) / Math.max(1, s.total));
  return {
    game: s.game,
    score: s.hits * bPoints(s.level),
    detail: {
      right: s.hits,
      wrong: Math.max(0, s.total - s.hits),
      accuracy,
      laps: s.lap,
      passed: s.passed,
      rounds: s.lap,
      bpm: lastBpm,
      level: s.level,
      input: s.input,
      ...(s.tier ? { tier: s.tier } : {}),
      ...(s.keys.length ? { keyTakes: s.keys } : {}),
    },
  };
}

/** The click of a lap: the count-in (woodblock), then every beat (the downbeat accented). */
export function lapClicks(bpm: number, beats: number, meter = 4, countIn = B_COUNT_IN) {
  const beat = 60 / bpm;
  const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
  for (let k = 0; k < countIn; k++) clicks.push({ t: k * beat, accent: k === 0, count: true });
  for (let b = 0; b < beats; b++) clicks.push({ t: (countIn + b) * beat, accent: b % meter === 0, soft: b % meter !== 0 });
  return { clicks, wood: [] as number[], responseAt: countIn * beat, responseEnd: (countIn + beats) * beat + 0.25 };
}
