// Name That Tune (spec AE §8): hear the opening of a known song (from SONGS), pick the title among 4.
// Faster = more points; 10 rounds; the best total is kept by the caller. Pure.

import type { NoteEvent } from './lesson';
import type { SongOpening } from './songs';

export const ROUNDS = 10;
export const OPTIONS = 4;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export interface TuneRound {
  songId: string;
  /** Four song ids, the answer among them, in shuffled order. */
  options: string[];
  /** MIDI of the tonic this round is played in. */
  tonic: number;
}

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

function shuffle<T>(r: () => number, xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rounds for a game: every song once before any repeats, a random key per round (tonic C4…A4). */
export function makeRounds(seed: number, songs: readonly SongOpening[], n = ROUNDS): TuneRound[] {
  if (songs.length < OPTIONS) throw new Error('need at least 4 songs');
  const r = rng(seed);
  const order: SongOpening[] = [];
  while (order.length < n) order.push(...shuffle(r, songs));
  return order.slice(0, n).map((s) => {
    const others = shuffle(
      r,
      songs.filter((o) => o.id !== s.id),
    ).slice(0, OPTIONS - 1);
    return { songId: s.id, options: shuffle(r, [s.id, ...others.map((o) => o.id)]), tonic: 60 + Math.floor(r() * 10) };
  });
}

/** The opening as note events at `bpm` (beats from the song). */
export function songEvents(s: SongOpening, tonic: number, bpm = 108): { events: NoteEvent[]; length: number } {
  const beat = 60 / bpm;
  let t = 0;
  const events: NoteEvent[] = s.degrees.map((d, i) => {
    const deg = d - 1;
    const midi = tonic + MAJOR[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
    const dur = (s.beats[i] ?? 1) * beat;
    const e: NoteEvent = { midi, start: t, duration: dur * 0.92, velocity: i === 0 ? 0.8 : 0.7 };
    t += dur;
    return e;
  });
  return { events, length: t + 0.4 };
}

/** Full points (100) within 1.5 s of the start; falls to 50 at 10 s; 0 when wrong. */
export function roundPoints(correct: boolean, ms: number): number {
  if (!correct) return 0;
  const k = Math.max(0, Math.min(1, (ms - 1500) / 8500));
  return Math.round(100 - 50 * k);
}

export const MAX_SCORE = ROUNDS * 100;

export interface TuneSave {
  v: 1;
  seed: number;
  /** Round index to play next. */
  round: number;
  score: number;
  /** Per answered round: chosen id and points. */
  answers: { pick: string; points: number; ms: number }[];
  /** Level tier of the run (GAMES_TIERS_PLAN). */
  tier?: import('./courseSocial').DynName;
}

export function isTuneSave(v: unknown): v is TuneSave {
  const o = v as TuneSave | null;
  return !!o && o.v === 1 && typeof o.seed === 'number' && typeof o.round === 'number' && typeof o.score === 'number' && Array.isArray(o.answers);
}
