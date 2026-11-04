// Drone practice: sing scale degrees over a sustained tonic (or tonic + fifth). Pure helpers.
// The singer hears every interval against the drone, which trains intonation relative to the key.

import { pcValue, type PitchClass } from './pitch';
import type { SungFrame } from './sing';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export interface DegreeReading {
  /** 1–7 when the nearest semitone is in the major scale, else null (chromatic). */
  degree: number | null;
  /** Semitones above the tonic (0–11) of the nearest note. */
  semis: number;
  /** Cents from that equal-tempered note (−50..+50). */
  cents: number;
}

/** Where a sung frequency sits in the key (octave-free). */
export function readDegree(hz: number, key: PitchClass): DegreeReading {
  const midi = 69 + 12 * Math.log2(hz / 440);
  const rel = midi - pcValue(key);
  const nearest = Math.round(rel);
  const semis = ((nearest % 12) + 12) % 12;
  const cents = Math.round((rel - nearest) * 100);
  const i = MAJOR.indexOf(semis);
  return { degree: i >= 0 ? i + 1 : null, semis, cents };
}

/** Just-intonation offsets (cents from equal temperament) a singer tends towards over a drone. */
export const JUST_OFFSET: Record<number, number> = { 1: 0, 2: 4, 3: -14, 4: -2, 5: 2, 6: -16, 7: -12 };

/**
 * Tracks held degrees: a degree counts as "found" when sung within ±tol cents (of equal temperament,
 * or of its just-intonation pitch — both sound in tune over a drone) for `holdSec` without a break.
 */
export class HoldTracker {
  found = new Set<number>();
  private cur: { degree: number; since: number } | null = null;
  constructor(
    private key: PitchClass,
    private tol = 20,
    private holdSec = 0.8,
  ) {}

  /** Feed one frame; returns the degree just found (first time), or null. */
  push(f: SungFrame): number | null {
    if (!f.hz || f.confidence < 0.8) {
      this.cur = null;
      return null;
    }
    const r = readDegree(f.hz, this.key);
    const inTune = r.degree !== null && Math.min(Math.abs(r.cents), Math.abs(r.cents - JUST_OFFSET[r.degree])) <= this.tol;
    if (!inTune || r.degree === null) {
      this.cur = null;
      return null;
    }
    if (!this.cur || this.cur.degree !== r.degree) {
      this.cur = { degree: r.degree, since: f.t };
      return null;
    }
    if (f.t - this.cur.since >= this.holdSec && !this.found.has(r.degree)) {
      this.found.add(r.degree);
      return r.degree;
    }
    return null;
  }

  get complete() {
    return this.found.size === 7;
  }
}

/** Drone notes for a key: tonic two octaves low (+ fifth). */
export function droneMidis(key: PitchClass, withFifth: boolean): number[] {
  const t = 36 + ((pcValue(key) % 12) + 12) % 12;
  return withFifth ? [t, t + 7, t + 12] : [t, t + 12];
}
