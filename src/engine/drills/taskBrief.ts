// The task brief (owner 2026-11-24): "make sure there is ALWAYS a short explanation first — everywhere, certainly in the
// level test — unless an exercise is meant to test reading." Hebrew narration is never spoken (the narrator types the line
// and pauses ≤ 3.2 s), so an instruction that only travels in the narrator's line is gone before a slow reader has it.
//
// The rule, shared by every timed flow (level test, coach, drill runs, workout blocks):
//   - whenever the TASK KIND changes — another section, family, level, kind of exercise, hand, or mode (play / read /
//     ear) — the take waits on a short brief (what to do, hands, tempo / meter) and its count-in starts only on Ready
//     (a tap, a key, or a note on MIDI);
//   - a kind already briefed in this run, and every repeat of the same kind (another key, again, slower, the next tempo
//     step), keeps flowing hands-free as before;
//   - a reading item still gets its brief (what is being tested); its material may stay hidden until Ready only where
//     the test design asks for a cold read (`cold`) — WHAT the task is is never hidden.
// Pure (no React).

import { defaultChannel } from './channel';
import type { Drill } from './types';

type T2 = { en: string; he: string };

/** How the task is answered: from the score, at sight, by ear, or in free time (no click). */
export type TaskMode = 'play' | 'read' | 'ear';

export interface TaskCtx {
  /** The section / block the task belongs to (the level test's section, a workout block). */
  section?: string;
  /** The level the item comes from (a new level of the same family is a new task). */
  level?: string;
  /** The mode when the caller knows it (the level test's reading / ear sections, its channel checks). */
  mode?: TaskMode;
  /** The take's tempo (♩, or ♪ on eighth-pulse items); absent = the item's start tempo. */
  bpm?: number;
  /** A free-time take (rubato first): no count-in, no click. */
  free?: boolean;
  /** A cold read: the material stays hidden until Ready (only where the reading test asks for it). */
  cold?: boolean;
  /** SPEC-KEY-SESSION-2 §6: a key-session stage — its code (a new stage is a new task) and its one-line brief. */
  stage?: { code: string; what: T2 };
  /** The note value the take is played in (1 quarters, 2 eighths, 3 triplet eighths, 4 sixteenths). */
  per?: number;
}

export interface TaskBrief {
  /** The task kind (see taskKindOf): a change of it opens the brief. */
  kind: string;
  mode: TaskMode;
  /** Line 1: what to do. */
  what: T2;
  /** Line 2: hands, tempo, meter (or free time / at sight). The card adds "the count-in starts on Ready". */
  how: T2;
  /** The material is hidden until Ready (a cold read); never the brief itself. */
  hideMaterial: boolean;
}

/** The mode of a drill: the caller's word, else its channel (ear families and by-ear drills; reading families). */
export function taskModeOf(drill: Pick<Drill, 'spec'> & Partial<Pick<Drill, 'show' | 'listen' | 'phrase'>>, ctx: TaskCtx = {}): TaskMode {
  if (ctx.mode) return ctx.mode;
  const ch = defaultChannel(drill, undefined);
  return ch === 'ear-fresh' || ch === 'ear-known' ? 'ear' : ch === 'page-sight' ? 'read' : 'play';
}

/** The task kind: section · family · level · kind of exercise · hands · mode (the key and the tempo are not part of it). */
export function taskKindOf(drill: Pick<Drill, 'spec'> & Partial<Pick<Drill, 'show' | 'listen' | 'phrase'>>, ctx: TaskCtx = {}): string {
  const s = drill.spec;
  return [ctx.section ?? '', s.instrument ?? 'piano', s.family, ctx.level ?? '', s.kind, s.hands, taskModeOf(drill, ctx), ctx.stage?.code ?? ''].join('|');
}

/**
 * Does the next task open with a brief? Yes when its kind differs from the last task the player played (or saw briefed),
 * and it was not briefed already in this run (`seen`). The first task of a run counts as a change (prev = null), unless
 * the run's own intro was its brief (the caller passes that kind as `prev`).
 */
export function needsBrief(prev: string | null, next: string, seen?: ReadonlySet<string>): boolean {
  if (prev === next) return false;
  return !seen?.has(next);
}

/** A level-test section's mode: its reading section is sight-reading, its ear section by ear, the rest from the drill. */
export function sectionMode(section: string): TaskMode | undefined {
  return section === 'reading' ? 'read' : section === 'ear' ? 'ear' : undefined;
}

const HANDS: Record<string, T2> = {
  R: { en: 'right hand', he: 'יד ימין' },
  L: { en: 'left hand', he: 'יד שמאל' },
  RL: { en: 'hands together', he: 'שתי ידיים' },
};

/** The brief of a task: two short lines (Hebrew and English), the kind, and whether the material waits for Ready. */
export function taskBriefOf(drill: Drill, ctx: TaskCtx = {}): TaskBrief {
  const mode = taskModeOf(drill, ctx);
  const title = drill.title;
  const what: T2 =
    mode === 'read'
      ? { en: `Sight-read: ${title.en}`, he: `קריאה מהדף: ${title.he}` }
      : mode === 'ear'
        ? { en: `By ear: listen, then play it back · ${title.en}`, he: `משמיעה: מקשיבים ומנגנים בחזרה · ${title.he}` }
        : ctx.stage
          ? ctx.stage.what
          : { en: `Play: ${title.en}`, he: `לנגן: ${title.he}` };
  const parts: T2[] = [];
  // hands only on the piano (a guitar, a bass or a kit has no "hand" choice in the item)
  const inst = drill.spec.instrument ?? 'piano';
  if (inst === 'piano' && !drill.sung && HANDS[drill.spec.hands]) parts.push(HANDS[drill.spec.hands]);
  if (ctx.free) parts.push({ en: 'free time, no click', he: 'בקצב חופשי, בלי קליק' });
  else {
    const bpm = Math.round(ctx.bpm ?? drill.startBpm);
    const note = drill.pulse === 8 ? '♪' : '♩';
    parts.push({ en: `${note} ${bpm}`, he: `${note} ${bpm}` });
    const PER: Record<number, T2> = { 0.5: { en: 'in half notes', he: 'בחצאים' }, 1: { en: 'in quarters', he: 'ברבעים' }, 2: { en: 'in eighths', he: 'בשמיניות' }, 3: { en: 'triplet feel: three notes per beat', he: 'תחושת טריולה: שלושה בפעמה' }, 4: { en: 'in sixteenths', he: 'בשש־עשריות' } };
    if (ctx.per && PER[ctx.per]) parts.push(PER[ctx.per]);
    const meter = drill.meter || 4;
    if (meter !== 4 || drill.pulse === 8) {
      const m = `${meter}/${drill.pulse === 8 ? 8 : 4}`;
      parts.push({ en: m, he: m });
    }
  }
  if (mode === 'read') parts.push({ en: 'you see it once', he: 'רואים פעם אחת' });
  const how: T2 = { en: parts.map((p) => p.en).join(' · '), he: parts.map((p) => p.he).join(' · ') };
  return { kind: taskKindOf(drill, ctx), mode, what, how, hideMaterial: mode === 'read' && !!ctx.cold };
}
