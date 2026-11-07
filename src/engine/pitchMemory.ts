// Pitch Memory (spec AE §8): once a day, sing or play a chosen note (A by default) with no reference.
// The error is in cents from the nearest instance of that note (any octave). A 30-day trend. Pure.

import type { SungFrame } from './sing';

export interface MemoryEntry {
  /** Local day, YYYY-MM-DD. */
  day: string;
  /** Signed error in cents (−600…+600): + = sharp. */
  cents: number;
  /** The target pitch class, 0–11 (9 = A). */
  note: number;
}

export const DEFAULT_NOTE = 9;
export const TREND_DAYS = 30;

export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Signed cents from the nearest octave of pitch class `pc` to a (fractional) MIDI pitch. */
export function centsToNote(midi: number, pc: number): number {
  const d = (midi - pc) * 100;
  const r = (((d % 1200) + 1200) % 1200);
  return Math.round((r >= 600 ? r - 1200 : r) * 10) / 10;
}

/** The held pitch of a take: the median of confident frames, after skipping the first 150 ms (the attack). */
export function takePitch(frames: SungFrame[], minVoiced = 8): number | null {
  const v = frames.filter((f) => f.hz && f.confidence >= 0.8 && f.hz > 55 && f.hz < 1400);
  if (v.length < minVoiced) return null;
  const t0 = v[0].t;
  const held = v.filter((f) => f.t - t0 >= 0.15);
  const use = held.length >= minVoiced / 2 ? held : v;
  const ms = use.map((f) => 69 + 12 * Math.log2(f.hz! / 440)).sort((a, b) => a - b);
  const mid = ms.length >> 1;
  return ms.length % 2 ? ms[mid] : (ms[mid - 1] + ms[mid]) / 2;
}

export const doneOn = (log: MemoryEntry[], day: string) => log.find((e) => e.day === day) ?? null;

/** The last `days` days ending today, oldest first; null where nothing was logged. */
export function trend(log: MemoryEntry[], today: Date, days = TREND_DAYS): { day: string; cents: number | null }[] {
  const by = new Map(log.map((e) => [e.day, e.cents]));
  const out: { day: string; cents: number | null }[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - k);
    const key = dayKey(d);
    out.push({ day: key, cents: by.get(key) ?? null });
  }
  return out;
}

/** Mean absolute error over the trend window (null without data). */
export function meanAbs(points: { cents: number | null }[]): number | null {
  const xs = points.map((p) => p.cents).filter((c): c is number => c !== null);
  return xs.length ? Math.round(xs.reduce((a, c) => a + Math.abs(c), 0) / xs.length) : null;
}

/** Distinct days played (for the "30 days of Pitch Memory" achievement). */
export const daysPlayed = (log: MemoryEntry[]) => new Set(log.map((e) => e.day)).size;

/** A score for onResult: 100 at 0 ¢, 0 at 100 ¢ or more. */
export const memoryScore = (cents: number) => Math.max(0, Math.round(100 - Math.abs(cents)));
