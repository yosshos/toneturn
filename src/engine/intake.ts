// "Getting to know you" — the intake questionnaire (product owner, 2026-11-06). Before finding the level, a few
// light questions tell the app who is playing: a curious listener, a hobby musician, a student or a pro. The
// answers pick the track (what to recommend first), the note names, the daily length, a "clean view" for
// learners who only want to practise, the voice range (sung, gently), and — above all — the player's own order
// of practice areas, which reorders the path: rhythm first and singing last gives a rhythm-first path.
// Pure functions; the UI is src/ui/Intake.tsx.

import { LESSON_ORDER, type LessonId } from './lesson';
import { DOMAINS, type DomainId } from './rating';

export type Level4 = 0 | 1 | 2 | 3;
export type Motivation = 'learn' | 'streaks' | 'collect' | 'friends';
export type Track = 'explorer' | 'hobby' | 'student' | 'pro';

export interface Intake {
  v: 1;
  at: string;
  /** Relationship with music: 0 listener · 1 plays/sings for fun · 2 studied · 3 professional / music student. */
  music: Level4;
  /** Singing: 0 shower only · 1 along with songs · 2 choir / band · 3 trained. */
  singing: Level4;
  /** Theory: 0 a foreign language · 1 heard the words · 2 the basics · 3 ii–V–I is home. */
  theory: Level4;
  /** Reading notes: 0 birds on wires · 1 slowly · 2 comfortably. */
  reading: 0 | 1 | 2;
  plays: string[];
  /** Practice areas in the player's order of importance; null = everything mixed. */
  priorities: DomainId[] | null;
  motivation: Motivation;
  minutes: 5 | 10 | 20;
}

export const AREAS: DomainId[] = DOMAINS.map((d) => d.id);

/** The track: what to suggest first and how much to explain. */
export function trackOf(i: Pick<Intake, 'music' | 'theory' | 'reading'>): Track {
  const score = i.music * 2 + i.theory * 2 + i.reading;
  if (i.music >= 3 || score >= 11) return 'pro';
  if (i.music >= 2 || score >= 7) return 'student';
  if (i.music >= 1 || score >= 3) return 'hobby';
  return 'explorer';
}

/** Where a path lesson belongs (for ordering by the player's priorities). */
export const LESSON_AREA: Record<LessonId, DomainId> = {
  'bflat-two-homes': 'pitch',
  'degrees-135': 'pitch',
  'major-minor': 'pitch',
  cadences: 'pitch',
  'sing-home-five': 'voice',
  intervals: 'pitch',
  inversions: 'pitch',
  'notes-degrees': 'reading',
  'sing-names': 'voice',
  'sing-degrees': 'voice',
  'rhythm-r1': 'time',
  'rhythm-r2': 'time',
  'rhythm-r3': 'time',
  runs: 'voice',
  'rhythm-r4': 'time',
  'rhythm-r5': 'time',
  'rhythm-r6': 'time',
  'rhythm-r7': 'time',
  'rhythm-r8': 'time',
  'note-sequences': 'memory',
  'jazz-1': 'pitch',
  songs: 'memory',
  'slash-chords': 'pitch',
  dictation: 'memory',
  'jazz-2': 'pitch',
} as Record<LessonId, DomainId>;

/** Lessons that need another one first, whatever the order of areas (the hearing basics come before singing them…). */
export const PREREQ: Partial<Record<LessonId, LessonId[]>> = {
  'sing-home-five': ['degrees-135'],
  'sing-degrees': ['degrees-135'],
  'notes-degrees': ['degrees-135'],
  'sing-names': ['notes-degrees'],
  'note-sequences': ['notes-degrees'],
  songs: ['degrees-135'],
  dictation: ['degrees-135', 'rhythm-r2'],
  runs: ['major-minor'],
  inversions: ['major-minor'],
  'jazz-1': ['cadences', 'intervals'],
  'jazz-2': ['jazz-1'],
  'slash-chords': ['inversions'],
};

/**
 * The path in the player's order. Weighted round-robin over areas (weights 5, 4, 3, 2, 1 by rank): the top area
 * comes first and most often, the last area latest; within an area the original order is kept, and no lesson comes
 * before its prerequisites. Null priorities = the original path.
 */
export function personalOrder(priorities: DomainId[] | null | undefined): LessonId[] {
  if (!priorities || !priorities.length) return [...LESSON_ORDER];
  const rank = (a: DomainId) => {
    const i = priorities.indexOf(a);
    return i < 0 ? priorities.length : i;
  };
  const weight = (a: DomainId) => Math.max(1, 5 - rank(a));
  const queues = new Map<DomainId, LessonId[]>();
  for (const id of LESSON_ORDER) {
    const a = LESSON_AREA[id] ?? 'pitch';
    queues.set(a, [...(queues.get(a) ?? []), id]);
  }
  const credit = new Map<DomainId, number>([...queues.keys()].map((a) => [a, 0]));
  const out: LessonId[] = [];
  const placed = new Set<LessonId>();
  const ready = (id: LessonId) => (PREREQ[id] ?? []).every((p) => placed.has(p));
  while (out.length < LESSON_ORDER.length) {
    const live = [...queues.entries()].filter(([, q]) => q.length);
    for (const [a] of live) credit.set(a, credit.get(a)! + weight(a));
    // Best area whose next lesson is ready; ties go to the higher-ranked area.
    const order = live.map(([a]) => a).sort((x, y) => credit.get(y)! - credit.get(x)! || rank(x) - rank(y));
    let took: LessonId | null = null;
    for (const a of order) {
      const q = queues.get(a)!;
      if (ready(q[0])) {
        took = q.shift()!;
        credit.set(a, credit.get(a)! - live.reduce((s, [b]) => s + weight(b), 0));
        break;
      }
    }
    if (!took) {
      // Every head waits for something: take the first missing prerequisite from the original order.
      const need = LESSON_ORDER.find((id) => !placed.has(id) && ready(id))!;
      const a = LESSON_AREA[need] ?? 'pitch';
      queues.set(a, queues.get(a)!.filter((x) => x !== need));
      took = need;
    }
    out.push(took);
    placed.add(took);
  }
  return out;
}

/** How much an area's skills are pulled forward in Today's plan (rating points), by the player's rank. */
export function priorityBoost(priorities: DomainId[] | null | undefined, area: DomainId): number {
  if (!priorities || !priorities.length) return 0;
  const i = priorities.indexOf(area);
  return i < 0 ? 0 : [220, 140, 70, 25, 0][i] ?? 0;
}

/** Settings the intake sets (the screen applies them; the player can change each one later). */
export function intakeSettings(i: Intake): {
  track: Track;
  naming?: 'solfege' | 'letter';
  miniLessons: boolean;
  cleanView: boolean;
} {
  const track = trackOf(i);
  return {
    track,
    // Pros who know the material skip the short lessons by default (they can switch them back on).
    miniLessons: track !== 'pro',
    cleanView: i.motivation === 'learn',
  };
}

/** A playful (rough!) voice type from a sung range — only a hint, never a label to live by. */
export function voiceTypeOf(r: { low: number; high: number }): 'bass' | 'baritone' | 'tenor' | 'alto' | 'mezzo' | 'soprano' {
  // Midpoints of the classic ranges: bass E2–E4 (52), baritone A2–A4 (57), tenor C3–C5 (60), alto F3–F5 (65),
  // mezzo A3–A5 (69), soprano C4–C6 (72); the boundaries sit halfway between.
  const mid = (r.low + r.high) / 2;
  if (mid < 54.5) return 'bass';
  if (mid < 58.5) return 'baritone';
  if (mid < 62.5) return 'tenor';
  if (mid < 67) return 'alto';
  if (mid < 70.5) return 'mezzo';
  return 'soprano';
}
