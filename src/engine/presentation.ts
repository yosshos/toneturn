// What a player is shown, by mastery and by channel (docs/SPEC-EAR-AND-READING.md §2, §8, §8a; owner 2026-11-22).
// - presentation by mastery: new → the player's strong channel; learning → full notation (or ear, notation after);
//   closed in this key → rhythm + name, notation one tap away; the pattern closed in ≥ 3 keys → a new key starts at the
//   name only; passed from memory → the name only (a miss brings one step of notation back);
// - the weekly mix of channels: 70/20/10 (strong / weak / memory) to start, then recomputed every week from the
//   measured profile — the weak channel grows with the gap (20 % → about 35 %), memory with the items in the fingers
//   (10 % → about 25 %), the strong channel takes the rest; at most ~5 points of change a week; balanced at ~45/45/10.
// Pure.

import type { ItemStatus } from './drills/itemStatus';

export type Fade = 'full' | 'rhythm' | 'name' | 'none';
export const FADES: Fade[] = ['full', 'rhythm', 'name', 'none'];
export type Strong = 'ear' | 'page';

/** The player's strong channel from the profile (ties and unknowns: the page, the app's default). */
export const strongOf = (p: { ear: number | null; reading: number | null }): Strong => ((p.ear ?? 0) > (p.reading ?? 0) + 0.05 ? 'ear' : 'page');

/**
 * The default presentation of an item: how much notation, and whether it starts by ear.
 * `patternKeys` = keys in which the same pattern (the same rung / lick in other keys) is closed.
 */
export function presentation(o: { status: ItemStatus; patternKeys: number; memoryPassed?: boolean; missedLast?: boolean; strong: Strong }): { fade: Fade; byEar: boolean } {
  const back = (f: Fade): Fade => (o.missedLast ? FADES[Math.max(0, FADES.indexOf(f) - 1)] : f);
  if (o.memoryPassed) return { fade: back('none'), byEar: false };
  if (o.status === 'new') return o.patternKeys >= 3 ? { fade: back('name'), byEar: false } : { fade: 'full', byEar: o.strong === 'ear' };
  if (o.status === 'learning' || o.status === 'almost') return o.patternKeys >= 3 ? { fade: back('name'), byEar: false } : { fade: 'full', byEar: false };
  return { fade: back(o.patternKeys >= 3 ? 'name' : 'rhythm'), byEar: false };
}

export interface Mix {
  strong: number;
  weak: number;
  memory: number;
}
export const START_MIX: Mix = { strong: 0.7, weak: 0.2, memory: 0.1 };
const WEEK_STEP = 0.05;

/** The target mix from the profile gap and the share of items already in the fingers. */
export function targetMix(p: { ear: number | null; reading: number | null }, inFingers: number): Mix {
  const e = p.ear ?? 0.5, r = p.reading ?? 0.5;
  const gap = Math.min(1, Math.abs(e - r));
  const memory = 0.1 + 0.15 * Math.max(0, Math.min(1, inFingers));
  // balanced channels: ~45/45; a gap of 0.5 or more: the weak channel at ~35 %
  const weak = gap < 0.05 ? (1 - memory) / 2 : 0.2 + 0.15 * Math.min(1, gap / 0.5);
  return { strong: Math.max(0, 1 - memory - weak), weak, memory };
}

/** This week's mix: last week's moved toward the target by at most ~5 points per share (no sudden jumps). */
export function weeklyMix(prev: Mix | null, target: Mix): Mix {
  const p = prev ?? START_MIX;
  const step = (a: number, b: number) => a + Math.max(-WEEK_STEP, Math.min(WEEK_STEP, b - a));
  const weak = step(p.weak, target.weak);
  const memory = step(p.memory, target.memory);
  return { strong: Math.max(0, 1 - weak - memory), weak, memory };
}

/** The channel of the next take from the mix (deterministic for a draw r in [0, 1)). */
export function nextChannel(mix: Mix, strong: Strong, r: number): 'ear' | 'page' | 'memory' {
  if (r < mix.memory) return 'memory';
  if (r < mix.memory + mix.weak) return strong === 'ear' ? 'page' : 'ear';
  return strong;
}

/** The reason shown with the mix ("reading 28 %: the gap between ear and reading is still large"). */
export function mixReason(mix: Mix, strong: Strong, lang: 'he' | 'en'): string {
  const weakName = strong === 'ear' ? (lang === 'he' ? 'קריאה' : 'reading') : lang === 'he' ? 'שמיעה' : 'by ear';
  const pct = Math.round(mix.weak * 100);
  if (mix.weak > 0.4) return lang === 'he' ? 'שמיעה וקריאה מאוזנות' : 'Ear and reading are balanced';
  return lang === 'he' ? `${weakName} ${pct}%: הפער בין שמיעה לקריאה ${mix.weak > 0.26 ? 'עדיין גדול' : 'נסגר'}` : `${weakName} ${pct}%: the gap between ear and reading is ${mix.weak > 0.26 ? 'still large' : 'closing'}`;
}
