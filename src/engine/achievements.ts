// Achievements (spec S.9): badges beyond streak milestones, derived from progress (pure, so cloud
// rebuilds agree). Each has a test and a short progress hint.

import type { Progress } from '../storage/progress';
import { ratingsOf } from '../storage/progress';
import { LESSON_ORDER } from './lesson';

export interface Achievement {
  id: string;
  icon: string;
  /** Done? */
  got: boolean;
  /** 0..1 towards it (for the bar). */
  progress: number;
}

type Rule = { id: string; icon: string; check: (p: Progress) => number };

const takes = (p: Progress) => p.vocal?.takes ?? [];
const frac = (have: number, need: number) => Math.max(0, Math.min(1, have / need));

const RULES: Rule[] = [
  { id: 'first-lesson', icon: '🎵', check: (p) => frac(p.history.length, 1) },
  { id: 'ten-lessons', icon: '📚', check: (p) => frac(p.history.length, 10) },
  { id: 'all-lessons', icon: '🗺️', check: (p) => frac(LESSON_ORDER.filter((id) => (p.lessons[id]?.completions ?? 0) > 0).length, LESSON_ORDER.length) },
  { id: 'perfect-lesson', icon: '⭐', check: (p) => (p.history.some((h) => h.total >= 3 && h.firstTry === h.total) ? 1 : 0) },
  { id: 'steady-8', icon: '🧘', check: (p) => frac(Math.max(0, ...takes(p).filter((t) => (t.m.stability ?? 99) <= 12).map((t) => t.m.duration ?? 0)), 8) },
  { id: 'even-vibrato', icon: '〰️', check: (p) => (takes(p).some((t) => t.m.vibratoRegularity !== undefined && t.m.vibratoRegularity <= 10 && (t.m.vibratoRate ?? 0) > 0) ? 1 : 0) },
  { id: 'octave-leap', icon: '🦘', check: (p) => frac(p.vocal?.best['v8-3'] ?? 0, 0.8) },
  { id: 'vocal-ladder', icon: '🎤', check: (p) => frac((p.vocal?.passed ?? []).filter((x) => x < 100).length, 11) },
  { id: 'mode-singer', icon: '🎼', check: (p) => frac((p.vocal?.passed ?? []).filter((x) => x > 100).length, 8) },
  { id: 'mode-ear', icon: '👂', check: (p) => frac(ratingsOf(p).modes?.r ?? 0, 1400) },
  { id: 'tf-40', icon: '✓✗', check: (p) => frac(Math.max(0, ...Object.values(p.tfBest ?? {})), 40) },
  { id: 'echo-10', icon: '🔗', check: (p) => frac(p.games?.melody ?? 0, 10) },
  { id: 'beat-10', icon: '🥁', check: (p) => frac(p.games?.rhythm ?? 0, 10) },
  { id: 'days-30', icon: '🔥', check: (p) => frac((p.stats?.days ?? []).length, 30) },
  { id: 'puzzle-gold', icon: '🥇', check: (p) => (Object.values(p.puzzles ?? {}).some((x) => x.medal === 'gold') ? 1 : 0) },
  { id: 'range-map', icon: '📏', check: (p) => frac(Object.keys(p.vocal?.rangeMap ?? {}).length, 5) },
];

export function achievements(p: Progress): Achievement[] {
  return RULES.map((r) => {
    const v = r.check(p);
    return { id: r.id, icon: r.icon, got: v >= 1, progress: v };
  });
}

export const ACHIEVEMENT_IDS = RULES.map((r) => r.id);
