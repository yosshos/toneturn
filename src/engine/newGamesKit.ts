// Shared bits of the five AUDIT-GAMES §4 games (Guide-Tone Runner, 5-4-3-2 Call, Enclosure Target, Changes Crossword,
// Hold the Note): a seeded random source, pitch classes, the 12-key cycle and the instrument a run's key cells go to.
// Pure.

import type { KeyInstrument } from './analysis/keyMastery';
import type { CourseId } from './courses';

export const pc = (n: number): number => ((Math.round(n) % 12) + 12) % 12;

/** A small deterministic PRNG (mulberry32). */
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
export const pickOf = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
export function shuffled<T>(rnd: () => number, xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** The seed of item i of a run (each item its own, so a resumed run rebuilds the same items). */
export const itemSeed = (seed: number, i: number): number => (seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;

/**
 * Every key-relative item in all 12 keys: the cycle of 4ths from a random start (AUDIT-GAMES §4.2 shared rules).
 * Item i of a run with seed s is in key `cycleKey(s, i)`; any 12 consecutive items cover the 12 keys.
 */
export const cycleKey = (seed: number, i: number): number => pc(Math.floor(rng(seed ^ 0x5bd1e995)() * 12) + 5 * i);

/** The instrument whose key cells a measured take feeds (keys → piano, guitar, bass; jazz / ear → the player's own). */
export function keyInstOf(course: CourseId | undefined, plays: string[] = []): KeyInstrument {
  if (course === 'guitar') return 'guitar';
  if (course === 'bass') return 'bass';
  if (course === 'keys') return 'piano';
  if (plays.includes('guitar') && !plays.includes('keys') && !plays.includes('piano')) return 'guitar';
  if (plays.includes('bass') && !plays.includes('keys') && !plays.includes('piano')) return 'bass';
  return 'piano';
}

/** The register a line is played in per instrument (MIDI): the mic hears any octave, MIDI too (pitch classes are graded). */
export const LINE_RANGE: Record<KeyInstrument, [number, number]> = { piano: [60, 79], guitar: [52, 72], bass: [36, 55] };
