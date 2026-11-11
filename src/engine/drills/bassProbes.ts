// The bass placement probe (BASS_CURRICULUM §6, BASS_AUDIT B6): ≈ 2½ minutes of short tasks in the technique level
// test. Each task is MEASURED (a take on the bass); the decision rules below turn the take's metrics into start levels,
// per the doc — never a tempo band copied across families. Only the families the doc lists are seeded; the rest start
// at level 1. Task 0 also picks the bass tuning (4- or 5-string) from the lowest open string actually played.
// Pure data + pure functions (no runtime imports: guitar.ts spreads BASS_PROBES at module load).

import type { TechProbe } from './guitar';
import type { FamilyId } from './types';

/** How the level test runs a probe: a tempo staircase (default) or a single measured take. */
export type BassProbe = TechProbe & { mode?: 'once'; optional?: boolean };

export const BASS_PROBES: BassProbe[] = [
  {
    // Task 0: the lowest open string, four whole notes (4 vs 5 strings; the mic level check comes with it).
    family: 'b-pluck',
    spec: { family: 'b-pluck', kind: 'lowest', key: 4, hands: 'R', instrument: 'bass', tempo: 70, perBeat: 0.25 },
    title: { en: 'Play your lowest open string', he: 'נגנו את המיתר הפתוח הנמוך ביותר שלכם' },
    instruments: ['bass'],
    mode: 'once',
  },
  {
    // Task 1: a rock groove, the root on every kick, on a G–C–D chart (time, pocket, roots).
    family: 'b-pocket',
    spec: { family: 'b-pocket', kind: 'kick-chart', key: 7, hands: 'R', option: 1, instrument: 'bass', tempo: 90 },
    title: { en: 'Rock groove: roots on the kick (G–C–D)', he: 'גרוב רוק: יסודות על הבס-דראם (G–C–D)' },
    instruments: ['bass'],
    seeds: ['b-time', 'b-chord'],
    mode: 'once',
  },
  {
    // Task 2: G major, one octave in 8ths, as fast as it stays clean (scales, fretting hand).
    family: 'b-scale',
    spec: { family: 'b-scale', kind: 'scale', key: 7, hands: 'R', option: 0, instrument: 'bass', tempo: 80 },
    title: { en: 'G major scale, one octave', he: 'סולם סול מז׳ור, אוקטבה אחת' },
    instruments: ['bass'],
    seeds: ['b-fret'],
  },
  {
    // Task 3: 16ths on one note (plucking evenness and stamina).
    family: 'b-pluck',
    spec: { family: 'b-pluck', kind: 'accent16', key: 4, hands: 'R', option: 0, perBeat: 4, instrument: 'bass', tempo: 80 },
    title: { en: '16ths on one note', he: 'שש-עשריות על צליל אחד' },
    instruments: ['bass'],
  },
  {
    // Task 4: walk four bars of Dm7–G7–Cmaj7 at 100 from the chart only; the rule report places walking.
    family: 'b-walk',
    spec: { family: 'b-walk', kind: 'probe-walk', key: 0, hands: 'R', perBeat: 1, instrument: 'bass', tempo: 100 },
    title: { en: 'Walk the chart: Dm7 – G7 – Cmaj7', he: 'ווקינג לפי הצ׳ארט: Dm7 – G7 – Cmaj7' },
    instruments: ['bass'],
    seeds: ['b-chord'],
    mode: 'once',
  },
  {
    // Task 5: ear — the band plays I–vi–IV–V style changes, you play the roots on the repeat.
    family: 'b-ear',
    spec: { family: 'b-ear', kind: 'roots', key: 7, hands: 'R', instrument: 'bass', tempo: 80 },
    title: { en: 'Ear: play the roots you hear', he: 'שמיעה: נגנו את היסודות שאתם שומעים' },
    instruments: ['bass'],
    mode: 'once',
  },
  {
    // Task 6 (optional): "Do you slap?" — one take of octave slap at 80.
    family: 'b-slap',
    spec: { family: 'b-slap', kind: 'octpop', key: 4, hands: 'R', instrument: 'bass', tempo: 80 },
    title: { en: 'Do you slap? Octave slap and pop (optional)', he: 'מנגנים סלאפ? סלאפ ופופ באוקטבות (לא חובה)' },
    instruments: ['bass'],
    mode: 'once',
    optional: true,
  },
];

/** What a probe's takes measured (from TakeMetrics / the played notes; absent = not measured or skipped). */
export interface BassProbeResult {
  /** Best clean tempo (♩), 0 if no clean take. */
  best?: number;
  /** Verdict of the (last) take. */
  verdict?: 'clean' | 'almost' | 'not';
  /** Task 0: median pitch (MIDI) of the lowest string the player played. */
  lowest?: number;
  /** Task 1: share of kick hits matched (0..1). */
  lock?: number;
  /** Task 3: odd / even asymmetry (ms) of the best take. */
  asymMs?: number;
  /** Task 4: the walking-rule report — beat-1 chord-tone share, approach share, share of beats that were the root. */
  beat1Ct?: number;
  approach?: number;
  rootShare?: number;
  /** Task 5: share of roots right (0..1). */
  acc?: number;
}

/** Task 0: the bass tuning from the lowest open string (B0 → 5-string, D1 → drop D, else 4-string). */
export function tuningFromLowest(midi: number | undefined): string | null {
  if (midi === undefined || !Number.isFinite(midi)) return null;
  if (Math.abs(midi - 23) <= 1) return 'bass5';
  if (Math.abs(midi - 26) <= 0.5) return 'bass-dropd';
  if (Math.abs(midi - 28) <= 1) return 'bass';
  return null;
}

/** Task 1 (pocket): lock ≥ 90 % → pocket L3; < 60 % → time L1 and pocket L1; between → L2. Seeds time and chord roots. */
export function placePocket(r: BassProbeResult): Partial<Record<FamilyId, number>> {
  const lock = r.lock ?? (r.verdict === 'clean' ? 0.9 : r.verdict === 'almost' ? 0.7 : 0);
  if (lock >= 0.9) return { 'b-pocket': 3, 'b-time': 3, 'b-chord': 2 };
  if (lock < 0.6) return { 'b-pocket': 1, 'b-time': 1, 'b-chord': 1 };
  return { 'b-pocket': 2, 'b-time': 2, 'b-chord': 1 };
}

/** Task 2 (scale): the highest clean tempo → the scale level (fails at 80 → fretting L1). */
export function placeScale(r: BassProbeResult): Partial<Record<FamilyId, number>> {
  const b = r.best ?? 0;
  if (b < 80) return { 'b-scale': 1, 'b-fret': 1 };
  if (b < 100) return { 'b-scale': 2, 'b-fret': 2 };
  if (b < 120) return { 'b-scale': 3, 'b-fret': 3 };
  return { 'b-scale': 4, 'b-fret': 4 };
}

/** Task 3 (16ths): clean at ≥ 100 with even fingers → pluck L6; clean at ≥ 80 → L5; clean at all → L3; else L1. Never seeds b-length. */
export function placePluck(r: BassProbeResult): Partial<Record<FamilyId, number>> {
  const b = r.best ?? 0;
  const even = r.asymMs === undefined || r.asymMs <= 8;
  if (b >= 100 && even) return { 'b-pluck': 6 };
  if (b >= 80) return { 'b-pluck': 5 };
  if (b > 0) return { 'b-pluck': 3 };
  return { 'b-pluck': 1 };
}

/**
 * Task 4 (walk): beat-1 chord tones ≥ 90 % plus approaches (non-chord tones into the next root) and under half the
 * beats on the root → walk L7; chord tones, no approaches → L4; only roots → L2.
 */
export function placeWalk(r: BassProbeResult): Partial<Record<FamilyId, number>> {
  const ct = r.beat1Ct ?? 0;
  const ap = r.approach ?? 0;
  // BASS_NICHE_PLAN: a walker past the approach levels starts swing time at L2 (long quarters are taken as known).
  if (ct >= 0.9 && ap >= 0.25 && (r.rootShare ?? 1) < 0.5) return { 'b-walk': 7, 'b-chord': 8, 'b-swing': 2 };
  if (ct >= 0.9 && (r.rootShare ?? 1) < 0.75) return { 'b-walk': 4, 'b-chord': 5 };
  if (ct >= 0.75) return { 'b-walk': 2, 'b-chord': 2 };
  return { 'b-walk': 1 };
}

/** Task 5 (ear): roots ≥ 90 % right → ear L5 (past the root finders); ≥ 60 % → L3; else L1. */
export function placeEar(r: BassProbeResult): Partial<Record<FamilyId, number>> {
  const a = r.acc ?? 0;
  return { 'b-ear': a >= 0.9 ? 5 : a >= 0.6 ? 3 : 1 };
}

/** Task 6 (slap, optional): clean → slap L3, almost → L2, else (or skipped) nothing. */
export function placeSlap(r: BassProbeResult): Partial<Record<FamilyId, number>> {
  if (r.verdict === 'clean') return { 'b-slap': 3 };
  if (r.verdict === 'almost') return { 'b-slap': 2 };
  return {};
}

/**
 * All the decisions together: per-family start levels (max over the tasks that seed a family), every other bass
 * family at level 1, capped by each family's length; plus the tuning from task 0.
 */
export function placeBass(results: Partial<Record<'lowest' | 'pocket' | 'scale' | 'pluck' | 'walk' | 'ear' | 'slap', BassProbeResult>>, families: { id: FamilyId; levels: number }[]): { start: Partial<Record<FamilyId, number>>; tuning: string | null } {
  const parts = [
    results.pocket ? placePocket(results.pocket) : {},
    results.scale ? placeScale(results.scale) : {},
    results.pluck ? placePluck(results.pluck) : {},
    results.walk ? placeWalk(results.walk) : {},
    results.ear ? placeEar(results.ear) : {},
    results.slap ? placeSlap(results.slap) : {},
  ];
  const start: Partial<Record<FamilyId, number>> = {};
  for (const f of families) {
    const vals = parts.map((p) => p[f.id]).filter((x): x is number => x !== undefined);
    start[f.id] = Math.max(1, Math.min(f.levels, vals.length ? Math.max(...vals) : 1));
  }
  return { start, tuning: tuningFromLowest(results.lowest?.lowest) };
}

/** Which result slot a probe fills (by family and kind). */
export function probeSlot(p: Pick<TechProbe, 'family' | 'spec'>): 'lowest' | 'pocket' | 'scale' | 'pluck' | 'walk' | 'ear' | 'slap' | null {
  if (p.spec.kind === 'lowest') return 'lowest';
  const by: Record<string, 'pocket' | 'scale' | 'pluck' | 'walk' | 'ear' | 'slap'> = { 'b-pocket': 'pocket', 'b-scale': 'scale', 'b-pluck': 'pluck', 'b-walk': 'walk', 'b-ear': 'ear', 'b-slap': 'slap' };
  return by[p.family] ?? null;
}
