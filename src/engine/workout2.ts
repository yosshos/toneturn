// Today's workout (spec AH, docs/SPEC-WORKOUT.md): suggested from the player's preferences and the path, then
// theirs to edit — total time, minutes per block, order, remove / add / swap, presets, today-only or default.
// The path is WHAT to learn, the workout is HOW MUCH TODAY (§9): blocks serve path steps first. Pure.

import type { StyleId } from './styles';
import { gameVerified } from './verifiedContent';
import type { DomainId } from './rating';
import type { SkillId } from './lesson';
import { pendingChecks, type Goal, type PathStep, type PathView, type UnitStep } from './path';
import { JAZZ_GAMES, type CourseId } from './courses';

export type BlockTarget =
  | { kind: 'path' }
  | { kind: 'warmup' }
  | { kind: 'area'; area: DomainId }
  | { kind: 'skill'; skill: SkillId }
  | { kind: 'topic'; topic: string }
  | { kind: 'game'; game: string }
  | { kind: 'vocal' }
  /** Off-app practice on the player's own instrument: a timer, the metronome, a note (W12). */
  | { kind: 'practice' }
  /** Reviews + the weakest sub-skills only ("Fix my mistakes", W14). */
  | { kind: 'mistakes' }
  /** SPEC-PATH-ROLE §3: depth on what is already opened — technique weak keys first and the tempo ladder
   *  (planWithFocus), the weakest opened ear / theory steps. */
  | { kind: 'strengthen' }
  /** BUILD-PLAN phase 2 (D2, D3): the technique share of an instrument course — on the piano today's cells of the key ×
   *  exercise matrix (half from the key of the week, the rest weakest first, maintenance inside); elsewhere the opened
   *  levels' drills, weak keys first (as 'strengthen'). */
  | { kind: 'keys' }
  /** D2: the 30 % beside technique — improvisation in the key of the week; a classical emphasis plays repertoire (the
   *  pieces coach); drums play grooves, fills and trading. */
  | { kind: 'improv'; mode?: ImprovMode; /** SPEC-STYLE-FOCUS §4: today's style for the band and the tune (main ~60 %). */ style?: StyleId }
  /** SPEC-PATH-TODAY-PRACTICE §5.1: the class assignments, first and added to the workout (never replacing it). */
  | { kind: 'teacher'; ids?: string[] };

export type ImprovMode = 'improv' | 'repertoire' | 'grooves';

export interface Block {
  id: string;
  target: BlockTarget;
  minutes: number;
  locked?: boolean;
}

// BUILD-PLAN phase 2: a window up to 180 minutes for serious musicians (SPEC-DAILY-WORKOUT §4); a block up to 90.
export const LIMITS = { minTotal: 5, maxTotal: 180, minBlock: 2, maxBlock: 90, maxBlocks: 12 };
/** Minutes a path step takes, a checkpoint (§9.2). */
export const STEP_MIN = 1.5;
export const CHECK_MIN = 2;

export const total = (bs: Block[]) => bs.reduce((a, b) => a + b.minutes, 0);
const clampM = (m: number) => Math.max(LIMITS.minBlock, Math.min(LIMITS.maxBlock, Math.round(m)));
const uid = (bs: Block[], base: string) => {
  let i = 1;
  while (bs.some((b) => b.id === `${base}-${i}`)) i++;
  return `${base}-${i}`;
};
export const targetKey = (t: BlockTarget) => (t.kind === 'area' ? `area:${t.area}` : t.kind === 'skill' ? `skill:${t.skill}` : t.kind === 'topic' ? `topic:${t.topic}` : t.kind === 'game' ? `game:${t.game}` : t.kind);

// ---------------------------------------------------------------- the suggestion (§3, §9.2)

export interface SuggestInput {
  total: number;
  goal: Goal;
  priorities: DomainId[] | null;
  leaveOut: DomainId[];
  reviewsDue: number;
  singer: boolean;
  view: PathView;
  /** A saved default structure (targets + minutes): used instead of the generated one, rescaled to `total`. */
  template?: Block[] | null;
  /** Keys player with technique drills in the workout (spec AI): the game slot becomes a Technique block. */
  technique?: boolean;
  /** Licks due for spaced review (SPEC-LICKS-TRANSCRIPTION): a 2-minute lick-review block, taken from the path block. */
  licksDue?: number;
  /** Encore (SPEC-PHRASE-STUDIO §9): own phrases due for review (or in progress, `inWorkout`): with no licks due the
   *  review block is the phrases' ("licks & phrases"). */
  phrasesDue?: number;
  /** Learned pieces due for a review run (SPEC-PIECE §2.10): a 3-minute piece-review block, taken from the path block. */
  piecesDue?: number;
  /** SPEC-PATH-ROLE §6 Q3: "guide me" (default) or "I choose" — no New block; strengthen + review only. */
  pathMode?: PathMode;
  /** Opened items the strengthen block can draw from; default: the opened steps in the view (0 = a new player). */
  opened?: number;
  /** AUDIT-GAMES §1: the active course and the local day ('YYYY-MM-DD') pick the day's game (WORKOUT_GAMES). */
  course?: CourseId;
  /** SPEC-JAZZ-FOLD: the course's jazz pack — closed, open, or in jazz focus (the game rotation follows). */
  jazz?: 'off' | 'on' | 'focus';
  day?: string;
  /** BUILD-PLAN phase 2 (D2): the player's technique tier (a beginner, tier ≤ 1, splits 85/15 instead of 70/30). */
  techTier?: number;
  /** The instrument's emphasis (old, read-only for one version): classical turns the improvisation share into repertoire. */
  emphasis?: 'both' | 'classical' | 'jazz';
  /** SPEC-STYLE-FOCUS: the course's main style (classical: the improvisation share is repertoire, SPEC-DAILY-WORKOUT §4). */
  mainStyle?: StyleId;
  /** SPEC-STYLE-FOCUS §4: today's style for the improvisation share (styleFocus.improvStyleFor: the main ~60 %). */
  improvStyle?: StyleId;
  /** SPEC-PATH-TODAY-PRACTICE §5.1: today's share of the open class assignments (teacherToday), added first. */
  teacher?: TeacherToday | null;
  /** Phase 8, the coach's tilt (aiTilt.activeTilt): the improvisation share's change this week (±0.1 at most), only
   *  once the player accepted it. 0 / absent = the plan as it always was. */
  tilt?: number;
}

/**
 * AUDIT-GAMES §1 ("everything connects"): the workout's game block rotates by day through the course's measured,
 * tiered games — it was always Rhythm Highway.
 */
export const WORKOUT_GAMES: Record<CourseId, string[]> = {
  ear: ['highway', 'rush-interval', 'rush-chord', 'melodypuzzle', 'rush-progression', 'rush-note', 'bordercontrol', 'crossword', 'darkside', 'tonnetz', 'euclid'],
  voice: ['flight', 'singinterval', 'rush-interval', 'runcatcher', 'singback'],
  keys: ['highway', 'rush-note', 'playback', 'rush-chord', 'elevator', 'compcaller', 'guidetone', 'staffrunner'],
  guitar: ['highway', 'rush-fretboard', 'changerace', 'rootsear', 'compcaller', 'guidetone', 'strumchange'],
  bass: ['highway', 'rush-fretboard', 'walkchanges', 'rootsear', 'guidetone', 'rootcatch'],
  drums: ['highway', 'groove-echo', 'kitread', 'time-lock', 'rebound'],
};
/**
 * SPEC-JAZZ-FOLD: the old Jazz course's workout games, now in the course they train — rotated in while the jazz pack is
 * open there, and the whole rotation in jazz focus.
 */
export const JAZZ_WORKOUT_GAMES: Partial<Record<CourseId, string[]>> = {
  ear: ['rush-voicing', 'reharm', 'holdnote', 'thirdjump', 'whichpair', 'mirror', 'crossword', 'bordercontrol'],
  keys: ['whichbrother', 'compcaller', 'guidetone', 'enclosure', 'call5432', 'bhtime'],
  guitar: ['compcaller', 'guidetone', 'enclosure', 'call5432'],
  bass: ['guidetone', 'enclosure', 'call5432', 'walkchanges'],
};
/** The day's game for a course (deterministic per local day; Highway without a course). `jazz`: the jazz pack is
 *  closed ('off': no jazz games), open ('on': its jazz games join the rotation) or in focus ('focus': jazz games only). */
export function workoutGame(course?: CourseId, day?: string, jazz: 'off' | 'on' | 'focus' = 'off'): string {
  const base = course ? WORKOUT_GAMES[course].filter((g) => jazz !== 'off' || !JAZZ_GAMES.includes(g)) : null;
  const jz = course && jazz !== 'off' ? JAZZ_WORKOUT_GAMES[course] ?? [] : [];
  const pool = jazz === 'focus' && jz.length ? jz : [...(base ?? []), ...jz.filter((g) => !base?.includes(g))];
  const xs = course ? pool.filter(gameVerified) : null;
  if (!xs?.length) return 'highway';
  const d = day ? Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000) : 0;
  return xs[((Number.isFinite(d) ? d : 0) % xs.length + xs.length) % xs.length];
}

export type PathMode = 'guide' | 'choose';

/** SPEC-PATH-ROLE §3: default shares of the total (rounded to whole blocks; the player can still edit everything). */
export const SHARES = { new: 0.22, strengthen: 0.48, review: 0.3 };

/** Open steps of the current unit (and the checkpoint), per area. */
export function unitRemaining(view: PathView): { byArea: Map<DomainId, number>; check: boolean; unitN: number | null; steps: number; done: number } {
  const unit = view.units.find((u) => u.status === 'current');
  const byArea = new Map<DomainId, number>();
  if (!unit) return { byArea, check: false, unitN: null, steps: 0, done: 0 };
  let check = false;
  let done = 0;
  for (const x of unit.steps) {
    const open = x.state === 'current' || x.state === 'open' || x.state === 'quick' || x.state === 'refresh';
    if (!open) {
      done++;
      continue;
    }
    if (x.step.kind === 'check') check = true;
    else if (x.step.kind !== 'review') byArea.set(x.step.domain, (byArea.get(x.step.domain) ?? 0) + 1);
  }
  return { byArea, check, unitN: unit.no ?? unit.n, steps: unit.steps.length, done };
}

/** Opened steps in a view (✓ done or tested, on the road or in the history; not checkpoints or reviews). */
export function openedCount(view: PathView): number {
  const done = (x: UnitStep) => (x.state === 'done' || x.state === 'mastered' || x.state === 'tested') && x.step.kind !== 'check' && x.step.kind !== 'review';
  return [...view.history, ...view.units.filter((u) => u.status !== 'projected')].reduce((a, u) => a + u.steps.filter(done).length, 0);
}

/**
 * Whole-minute shares (≥ LIMITS.minBlock each) of T for the three blocks, largest remainder. A block whose share is 0
 * is left out; when T can't hold them all, review goes first, then new.
 */
export function splitShares(T: number, sh: { new: number; strengthen: number; review: number }): { new: number; strengthen: number; review: number } {
  let keys = (['new', 'strengthen', 'review'] as const).filter((k) => sh[k] > 0);
  for (const drop of ['review', 'new'] as const) if (keys.length * LIMITS.minBlock > T && keys.length > 1 && keys.includes(drop)) keys = keys.filter((k) => k !== drop);
  const sum = keys.reduce((a, k) => a + sh[k], 0) || 1;
  const out = { new: 0, strengthen: 0, review: 0 };
  const raw = keys.map((k) => ({ k, q: (sh[k] / sum) * T }));
  for (const r of raw) out[r.k] = Math.max(LIMITS.minBlock, Math.floor(r.q));
  let diff = T - keys.reduce((a, k) => a + out[k], 0);
  const byRem = [...raw].sort((a, b) => b.q - Math.floor(b.q) - (a.q - Math.floor(a.q)));
  for (let i = 0; diff > 0; i = (i + 1) % byRem.length, diff--) out[byRem[i].k]++;
  for (let guard = 0; diff < 0 && guard < 100; guard++) {
    const k = [...keys].sort((a, b) => out[b] - out[a])[0];
    if (out[k] <= LIMITS.minBlock) break;
    out[k]--;
    diff++;
  }
  return out;
}

/** W6: drop or replace blocks whose target no longer exists for this player. */
export function validateTemplate(bs: Block[], ok: { leaveOut: DomainId[]; topics: Set<string>; hidden: string[]; games: Set<string> }): Block[] {
  const out: Block[] = [];
  for (const b of bs) {
    const t = b.target;
    if (t.kind === 'area' && ok.leaveOut.includes(t.area)) continue;
    if (t.kind === 'topic' && (!ok.topics.has(t.topic) || ok.hidden.includes(t.topic))) continue;
    if (t.kind === 'game' && !ok.games.has(t.game)) continue;
    out.push({ ...b, minutes: Math.max(LIMITS.minBlock, b.minutes) });
  }
  return out.length ? out : bs.filter((b) => b.target.kind === 'path').slice(0, 1);
}

export function suggestWorkout(inp: SuggestInput): Block[] {
  // §5.1: the teacher's section is added before the rest; the rest keeps the window less what the teacher takes inside
  // it (an "all today" assignment that doesn't fit extends today's window instead).
  const tp = inp.teacher && inp.teacher.minutes > 0 ? inp.teacher : null;
  if (tp) return withTeacher(suggestRest({ ...inp, total: Math.max(LIMITS.minTotal, inp.total - (tp.minutes - tp.extend)) }), tp);
  return suggestRest(inp);
}

function suggestRest(inp: SuggestInput): Block[] {
  const out = withLicks(inp, suggestBase(inp));
  if (!inp.piecesDue || inp.template?.length || total(out) < 10) return out;
  // The piece review (part of the review share, SPEC-PATH-ROLE §3): a short block (weak bars, then one full run at
  // tempo) from the review block, else the largest block; placed after the review.
  const from = reviewSource(out, 3);
  if (!from) return out;
  from.minutes -= 3;
  const at = out.findIndex((b) => b.target.kind === 'warmup');
  out.splice(at < 0 ? out.length : at + 1, 0, { id: uid(out, 'game'), target: { kind: 'game', game: 'pieces' }, minutes: 3 });
  return out;
}

/** The block a review add-on (licks, pieces) takes its minutes from: the review block, else the largest one. */
const reviewSource = (out: Block[], m: number): Block | undefined =>
  out.find((b) => b.target.kind === 'warmup' && b.minutes >= m + LIMITS.minBlock) ?? [...out].sort((a, b) => b.minutes - a.minutes).find((b) => b.minutes >= m + LIMITS.minBlock);

function withLicks(inp: SuggestInput, out: Block[]): Block[] {
  if (!(inp.licksDue || inp.phrasesDue) || inp.template?.length || total(out) < 10) return out;
  // The lick review (review share): 2 minutes from the review block (or the largest block), after the review. Licks
  // and phrases (Encore) share it: licks due first, else the player's own phrases.
  const from = reviewSource(out, 2);
  if (!from) return out;
  from.minutes -= 2;
  const at = out.findIndex((b) => b.target.kind === 'warmup');
  const block: Block = { id: uid(out, 'game'), target: { kind: 'game', game: inp.licksDue ? 'licks' : 'encore' }, minutes: 2 };
  out.splice(at < 0 ? out.length : at + 1, 0, block);
  return out;
}

function suggestBase(inp: SuggestInput): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(inp.total)));
  // Migration (SPEC-PATH-ROLE §7.1): a saved template the player made stays exactly theirs (rescaled to the total);
  // only generated suggestions use the new shares.
  if (inp.template?.length) return rescale(inp.template.map((b) => ({ ...b })), T);
  const out: Block[] = [];
  const push = (target: BlockTarget, minutes: number) => {
    // A long block is split at LIMITS.maxBlock (a 60-minute "I choose" workout has two strengthen blocks).
    for (let left = minutes; left > 0; ) {
      const m = left > LIMITS.maxBlock ? Math.min(LIMITS.maxBlock, left - LIMITS.minBlock) : left;
      out.push({ id: uid(out, target.kind), target, minutes: m });
      left -= m;
    }
  };
  // BUILD-PLAN D2: an instrument course with technique in the workout — the path, then technique / improvisation.
  if (inp.technique) return suggestInstrument(inp, T, push, out);
  // SPEC-PATH-ROLE §3: new (the path) ~22 %, strengthen (opened items: weak keys, the tempo ladder, weak ear
  // sub-skills) ~48 %, review (spaced reviews, licks / pieces, a game) ~30 %. A new player with nothing opened: the
  // path takes the strengthen share too. "I choose" (§6 Q3): no New block — strengthen + review.
  const choose = inp.pathMode === 'choose';
  const opened = inp.opened ?? openedCount(inp.view);
  const sh = choose ? { new: 0, strengthen: SHARES.new + SHARES.strengthen, review: SHARES.review } : opened === 0 ? { new: SHARES.new + SHARES.strengthen, strengthen: 0, review: SHARES.review } : { ...SHARES };
  const m = splitShares(T, sh);
  let game = 0;
  if (m.review) {
    let r = m.review;
    if (inp.singer && T >= 15 && r >= 2 * LIMITS.minBlock) {
      push({ kind: 'vocal' }, 2);
      r -= 2;
    }
    game = !inp.technique && T >= 15 && r >= 3 + LIMITS.minBlock ? 3 : 0;
    // Review opens the workout: the spaced reviews due (or the weakest skill) as the warm-up.
    push({ kind: 'warmup' }, r - game);
  }
  // New: the path's next steps (lesson + first pass); a waiting checkpoint first (nextForBlock).
  if (m.new) push({ kind: 'path' }, m.new);
  if (m.strengthen) push({ kind: 'strengthen' }, m.strengthen);
  if (game) push({ kind: 'game', game: workoutGame(inp.course, inp.day, inp.jazz) }, game);
  return out;
}
/** BUILD-PLAN D2: about 20 % to new material from the path, the rest technique / improvisation 70/30 (a beginner 85/15). */
export const DAY_SHARES = { path: 0.2, tech: 0.7, techBeginner: 0.85, maintenance: 0.15 };

/** The improvisation share's content by course and emphasis (D2; BUILD-PLAN §2 for drums). */
export const improvMode = (course?: CourseId, emphasis?: SuggestInput['emphasis'], mainStyle?: StyleId): ImprovMode => (course === 'drums' ? 'grooves' : emphasis === 'classical' || mainStyle === 'classical' ? 'repertoire' : 'improv');

/**
 * D2 for an instrument course: review (spaced reviews due, maintenance out of the technique share) → the path (~20 %)
 * → technique (the matrix on the piano) → improvisation (or repertoire / grooves). Lick, phrase and piece reviews are
 * added later from the largest block (the technique one), so they also live inside the technique share. A new player
 * with nothing opened: the path takes the technique share (SPEC-PATH-ROLE §3); "I choose": no path block.
 */
function suggestInstrument(inp: SuggestInput, T: number, push: (t: BlockTarget, m: number) => void, out: Block[]): Block[] {
  const min = LIMITS.minBlock;
  const choose = inp.pathMode === 'choose';
  const opened = inp.opened ?? openedCount(inp.view);
  let path = choose ? 0 : Math.max(min, Math.round(T * DAY_SHARES.path));
  if (T - path < min) path = T;
  const rest = T - path;
  const tilt = Math.max(-0.1, Math.min(0.1, inp.tilt ?? 0));
  const share = Math.max(0.5, Math.min(0.95, ((inp.techTier ?? 2) <= 1 ? DAY_SHARES.techBeginner : DAY_SHARES.tech) - tilt));
  let tech = Math.round(rest * share);
  let imp = rest - tech;
  if (imp < min) {
    tech += imp;
    imp = 0;
  }
  if (tech > 0 && tech < min) {
    imp += tech;
    tech = 0;
  }
  // A new player with nothing opened on the path: a real beginner (tier 0) starts with the path; an experienced
  // player new to the app (tier 1+ from the level test / self-rating) keeps a technique block from day one.
  if (opened === 0 && !choose && (inp.techTier ?? 0) < 1) {
    path += tech;
    tech = 0;
  }
  // Maintenance (D2: inside the technique share): the spaced reviews due open the workout.
  let review = 0;
  if (inp.reviewsDue > 0) {
    const from = tech > 0 ? 'tech' : 'path';
    const pool = from === 'tech' ? tech : path;
    if (pool >= 2 * min + 1) {
      review = Math.max(min, Math.round(pool * DAY_SHARES.maintenance));
      if (from === 'tech') tech -= review;
      else path -= review;
    }
  }
  if (review) push({ kind: 'warmup' }, review);
  if (path) push({ kind: 'path' }, path);
  if (tech) push({ kind: 'keys' }, tech);
  if (imp) push({ kind: 'improv', mode: improvMode(inp.course, inp.emphasis, inp.mainStyle), ...(inp.improvStyle ? { style: inp.improvStyle } : {}) }, imp);
  return out;
}

// ---------------------------------------------------------------- why today (SPEC-PATH-TODAY-PRACTICE §2, §3.4)

export type Why = 'path' | 'teacher' | 'strengthen' | 'review' | 'week';
export const WHY_WORD: Record<Why, { en: string; he: string }> = {
  path: { en: 'New from the path', he: 'חדש מהמסלול' },
  teacher: { en: 'From your teacher', he: 'מהמורה' },
  strengthen: { en: 'Needs strengthening', he: 'צריך חיזוק' },
  review: { en: 'Review', he: 'חזרה' },
  week: { en: 'Key of the week', he: 'סולם השבוע' },
};
/** Why a block is in today's workout (null: no reason chip — a game, the vocal warm-up, off-app practice). */
export function whyOf(t: BlockTarget): Why | null {
  switch (t.kind) {
    case 'path':
      return 'path';
    case 'teacher':
      return 'teacher';
    case 'warmup':
    case 'mistakes':
      return 'review';
    case 'game':
      return t.game === 'licks' || t.game === 'encore' || t.game === 'pieces' ? 'review' : null;
    case 'keys':
    case 'strengthen':
    case 'area':
    case 'skill':
    case 'topic':
      return 'strengthen';
    case 'improv':
      return (t.mode ?? 'improv') === 'improv' ? 'week' : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- the teacher's section (SPEC-PATH-TODAY-PRACTICE §5.1)

/** An open class assignment as the workout sees it. */
export interface TeacherItem {
  id: string;
  dueOn: string | null;
  /** The work it asks for in minutes (default ASSIGN_MIN: one lesson). */
  minutes?: number;
  /** §5.1 (owner): when it doesn't fit today's window — spread until the due date (default) or all today. */
  ifShort?: 'spread' | 'today';
  /** §5.2: the teacher's minutes a day (optional): today's share is this, not the work over the days left. */
  perDay?: number | null;
}
export interface TeacherToday {
  /** The teacher block's minutes today. */
  minutes: number;
  /** Minutes today's window grows by ("all today" assignments that don't fit). */
  extend: number;
  /** The assignments served today, the earliest due first. */
  ids: string[];
}
/** Minutes one assignment takes when the teacher didn't say (a lesson or a short exercise set). */
export const ASSIGN_MIN = 5;

const dayNo = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86400000);

/**
 * Today's share of the open assignments. They fit inside the window when they take at most half of it (the rest of the
 * workout always stays). Otherwise each assignment's option decides: spread until the due date (its work over the days
 * left, the default) or all today (its whole work, and the window grows by what doesn't fit).
 */
export function teacherToday(items: TeacherItem[], day: string, window: number): TeacherToday | null {
  const open = [...items].sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'));
  if (!open.length) return null;
  const room = Math.floor(Math.max(LIMITS.minTotal, window) / 2);
  const work = (a: TeacherItem) => Math.max(1, Math.round(a.minutes ?? ASSIGN_MIN));
  // §5.2: minutes a day set by the teacher are today's work for that assignment ("all today" then means those minutes
  // today even when the window is short; "spread": they fit in what the window leaves)
  const daily = (a: TeacherItem) => (a.perDay && a.perDay > 0 ? Math.max(1, Math.round(a.perDay)) : null);
  const todayWork = (a: TeacherItem) => daily(a) ?? work(a);
  const need = open.reduce((n, a) => n + todayWork(a), 0);
  if (need <= room) return { minutes: Math.min(LIMITS.maxBlock, Math.max(LIMITS.minBlock, need)), extend: 0, ids: open.map((a) => a.id) };
  const today = open.filter((a) => a.ifShort === 'today');
  const spread = open.filter((a) => a.ifShort !== 'today');
  const todayMin = today.reduce((n, a) => n + todayWork(a), 0);
  const daysLeft = (a: TeacherItem) => (a.dueOn ? Math.max(1, dayNo(a.dueOn) - dayNo(day) + 1) : 1);
  let spreadMin = spread.reduce((n, a) => n + (daily(a) ?? Math.ceil(work(a) / daysLeft(a))), 0);
  // spread work never grows the window: it fits in what the "all today" ones leave of the room
  if (spread.length) spreadMin = Math.max(LIMITS.minBlock, Math.min(spreadMin, room - todayMin));
  const minutes = Math.min(LIMITS.maxBlock, Math.max(LIMITS.minBlock, todayMin + spreadMin));
  return { minutes, extend: Math.max(0, minutes - room), ids: open.map((a) => a.id) };
}

/** The teacher's block first, added (an existing one — today's edits — keeps its place and minutes). */
export function withTeacher(bs: Block[], tp: TeacherToday | null): Block[] {
  if (!tp || tp.minutes <= 0) return bs.filter((b) => b.target.kind !== 'teacher');
  if (bs.some((b) => b.target.kind === 'teacher')) return bs.map((b) => (b.target.kind === 'teacher' ? { ...b, target: { kind: 'teacher' as const, ids: tp.ids } } : b));
  return [{ id: uid(bs, 'teacher'), target: { kind: 'teacher', ids: tp.ids }, minutes: Math.max(LIMITS.minBlock, Math.min(LIMITS.maxBlock, tp.minutes)) }, ...bs];
}

// ---------------------------------------------------------------- editing (§4)

/** W5: can the blocks take this total? (locked minutes must fit, every unlocked block keeps 2 to LIMITS.maxBlock). */
export function canRescale(bs: Block[], newTotal: number): boolean {
  const locked = total(bs.filter((b) => b.locked));
  const free = bs.filter((b) => !b.locked).length;
  return newTotal >= LIMITS.minTotal && newTotal <= LIMITS.maxTotal && newTotal - locked >= free * LIMITS.minBlock && newTotal - locked <= free * LIMITS.maxBlock;
}

/** Scale the unlocked blocks to a new total (locked keep their minutes; each ≥ 2; sums exactly; largest remainder). */
export function rescale(bs: Block[], newTotal: number): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(newTotal)));
  if (!canRescale(bs, T)) return bs.map((b) => ({ ...b }));
  const locked = bs.filter((b) => b.locked);
  const free = bs.filter((b) => !b.locked);
  const room = Math.max(free.length * LIMITS.minBlock, T - total(locked));
  if (!free.length) return bs.map((b) => ({ ...b }));
  const cur = total(free) || 1;
  const raw = free.map((b) => ({ id: b.id, q: (b.minutes * room) / cur }));
  const m = new Map(raw.map((r) => [r.id, Math.max(LIMITS.minBlock, Math.floor(r.q))]));
  let diff = room - [...m.values()].reduce((a, x) => a + x, 0);
  const order = [...raw].sort((a, b) => b.q - Math.floor(b.q) - (a.q - Math.floor(a.q)));
  for (let i = 0; diff > 0; i = (i + 1) % order.length, diff--) m.set(order[i].id, m.get(order[i].id)! + 1);
  for (let i = order.length - 1; diff < 0 && i >= 0; i--) {
    const id = order[i].id;
    if (m.get(id)! > LIMITS.minBlock) {
      m.set(id, m.get(id)! - 1);
      diff++;
      i++;
      if (i > order.length - 1) i = order.length - 1;
    }
  }
  // A block over LIMITS.maxBlock passes its excess to the others with room (a long window: 30 → 180 keeps its total).
  for (let guard = 0; guard < 20; guard++) {
    let excess = 0;
    for (const [id, x] of m) if (x > LIMITS.maxBlock) (excess += x - LIMITS.maxBlock), m.set(id, LIMITS.maxBlock);
    const room = [...m.entries()].filter(([, x]) => x < LIMITS.maxBlock);
    if (!excess || !room.length) break;
    for (let i = 0; excess > 0; i = (i + 1) % room.length) {
      const [id] = room[i];
      if (m.get(id)! >= LIMITS.maxBlock) {
        if (room.every(([rid]) => m.get(rid)! >= LIMITS.maxBlock)) break;
        continue;
      }
      m.set(id, m.get(id)! + 1);
      excess--;
    }
  }
  return bs.map((b) => (b.locked ? { ...b } : { ...b, minutes: Math.min(LIMITS.maxBlock, m.get(b.id)!) }));
}

/** One block's minutes; with keepTotal the other unlocked blocks absorb the change. */
export function setMinutes(bs: Block[], id: string, minutes: number, keepTotal = false): Block[] {
  const m = clampM(minutes);
  const next = bs.map((b) => (b.id === id ? { ...b, minutes: m } : { ...b }));
  if (!keepTotal) return next;
  const T = total(bs);
  const others = next.filter((b) => b.id !== id && !b.locked);
  if (!others.length) return next;
  const fixedOthers = next.filter((b) => b.id !== id && b.locked);
  const room = Math.max(others.length, T - m - total(fixedOthers));
  const scaled = rescale(others.map((b) => ({ ...b })), Math.max(LIMITS.minTotal, room)).map((b, i) => ({ ...b, minutes: i === 0 ? b.minutes + (room - Math.max(LIMITS.minTotal, room)) : b.minutes }));
  const byId = new Map(scaled.map((b) => [b.id, b]));
  return next.map((b) => byId.get(b.id) ?? b);
}

export const move = (bs: Block[], id: string, dir: -1 | 1): Block[] => {
  const i = bs.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= bs.length) return bs;
  const a = bs.slice();
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};
export const moveTo = (bs: Block[], id: string, to: number): Block[] => {
  const i = bs.findIndex((b) => b.id === id);
  if (i < 0) return bs;
  const a = bs.slice();
  const [x] = a.splice(i, 1);
  a.splice(Math.max(0, Math.min(a.length, to)), 0, x);
  return a;
};
export const remove = (bs: Block[], id: string): Block[] => (bs.length <= 1 ? bs : bs.filter((b) => b.id !== id));
export function add(bs: Block[], target: BlockTarget, minutes = 3, at?: number): Block[] {
  if (bs.length >= LIMITS.maxBlocks) return bs;
  const b: Block = { id: uid(bs, target.kind), target, minutes: clampM(minutes) };
  const a = bs.slice();
  a.splice(at ?? a.length, 0, b);
  return a;
}
export const toggleLock = (bs: Block[], id: string): Block[] => bs.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b));
/** "Less today": −50 % (≥ 1). */


export type Preset = 'suggested' | 'ear' | 'rhythm' | 'reading' | 'voice' | 'instrument' | 'quick5' | 'mistakes' | 'four-slot';
/** A preset replaces the blocks and keeps the total (§4). */
export function preset(p: Preset, totalMin: number, suggested: Block[]): Block[] {
  const T = Math.max(LIMITS.minTotal, totalMin);
  const focus = (area: DomainId, also: DomainId[]): Block[] => {
    const bs: Block[] = [{ id: 'warmup-1', target: { kind: 'warmup' }, minutes: 2 }, { id: 'area-1', target: { kind: 'area', area }, minutes: 6 }, ...also.map((a, i) => ({ id: `area-${i + 2}`, target: { kind: 'area' as const, area: a }, minutes: 2 }))];
    return rescale(bs, T);
  };
  switch (p) {
    case 'ear':
      return focus('pitch', ['memory']);
    case 'rhythm':
      return focus('time', ['memory']);
    case 'reading':
      return focus('reading', ['pitch']);
    case 'voice':
      return focus('voice', ['pitch']);
    case 'instrument':
      return focus('instrument', ['pitch']);
    case 'quick5':
      return [
        { id: 'path-1', target: { kind: 'path' }, minutes: 3 },
        { id: 'warmup-1', target: { kind: 'warmup' }, minutes: 2 },
      ];
    case 'mistakes':
      return rescale([{ id: 'warmup-1', target: { kind: 'warmup' }, minutes: 2 }, { id: 'mistakes-1', target: { kind: 'mistakes' }, minutes: 6 }], T);
    case 'four-slot':
      // Siskind's self-generating session (SISKIND-SOLO-PIANO A11, C6; "How do I Practice Jazz and Improvisation?",
      // Gv7tgujQxUI): technique → repetition and transposition → tunes → the recorded history. Tunes run the head
      // levels practiceMethod.ts `tuneSlotLevels` picks from what slot 2 worked on (block id 'tunes-'); Recordings is an
      // off-app listening card (block id 'listen-'). The split of minutes is ours.
      return rescale(
        [
          { id: 'area-1', target: { kind: 'area', area: 'instrument' }, minutes: 3 },
          { id: 'strengthen-1', target: { kind: 'strengthen' }, minutes: 3 },
          { id: 'tunes-1', target: { kind: 'game', game: 'drills' }, minutes: 3 },
          { id: 'listen-1', target: { kind: 'practice' }, minutes: 2 },
        ],
        Math.max(T, 4 * LIMITS.minBlock),
      );
    default:
      return rescale(suggested.map((b) => ({ ...b })), T);
  }
}

// ---------------------------------------------------------------- the path link (§9)

/** What a block serves next: a path step (current unit first, then the next unit), or free practice. */
export function nextForBlock(b: Block, view: PathView, done: Set<string>): { step: UnitStep; unitId: string } | { free: BlockTarget } | null {
  const cur = view.units.find((u) => u.status === 'current');
  const next = view.units.find((u) => u.status === 'projected');
  const open = (x: UnitStep) => !done.has(x.step.id) && (x.state === 'current' || x.state === 'open' || x.state === 'quick' || x.state === 'refresh' || x.state === 'locked');
  const fits = (s: PathStep): boolean => {
    const t = b.target;
    if (t.kind === 'path') return true;
    if (t.kind === 'area') return s.domain === t.area && s.kind !== 'check';
    if (t.kind === 'skill') return s.skill === t.skill && s.kind !== 'check';
    if (t.kind === 'topic') return s.topic === t.topic;
    return false;
  };
  if (b.target.kind === 'warmup' || b.target.kind === 'game' || b.target.kind === 'vocal' || b.target.kind === 'practice' || b.target.kind === 'mistakes' || b.target.kind === 'strengthen' || b.target.kind === 'keys' || b.target.kind === 'improv' || b.target.kind === 'teacher') return { free: b.target };
  // SPEC-PATH-ROLE §3: a unit waiting for its checkpoint — the checkpoint takes the New block (the most recent first).
  if (b.target.kind === 'path') {
    const pend = pendingChecks(view).filter((p) => !done.has(p.step.step.id));
    const last = pend[pend.length - 1];
    if (last) return { step: last.step, unitId: last.unit.id };
  }
  for (const u of [cur, next]) {
    if (!u) continue;
    // Inside the current unit any order; the checkpoint only when the rest is done (Path block).
    const rest = u.steps.filter((x) => x.step.kind !== 'check' && open(x));
    const pick = u.steps.find((x) => open(x) && fits(x.step) && (x.step.kind !== 'check' || rest.length === 0));
    if (pick) return { step: pick, unitId: u.id };
    if (b.target.kind === 'path') break; // the Path block never works ahead
  }
  return { free: b.target };
}

/** §9.3: how many steps of the current unit this workout should finish, by area. */
export function coverage(bs: Block[], view: PathView): { unitN: number | null; covered: number; open: number; total: number; done: number; waiting: Map<DomainId, number> } {
  const rem = unitRemaining(view);
  const open = [...rem.byArea.values()].reduce((a, x) => a + x, 0) + (rem.check ? 1 : 0);
  // Minutes that can go to path steps: the Path block (any area, in order) + each area block up to its own steps.
  let pathMin = bs.filter((b) => b.target.kind === 'path').reduce((s, b) => s + b.minutes, 0);
  let covered = 0;
  const waiting = new Map<DomainId, number>();
  const left = new Map(rem.byArea);
  for (const [a, n] of rem.byArea) {
    const mins = bs.filter((b) => b.target.kind === 'area' && b.target.area === a).reduce((s, b) => s + b.minutes, 0);
    const can = Math.min(n, Math.floor(mins / STEP_MIN));
    covered += can;
    left.set(a, n - can);
  }
  for (const [a, n] of left) {
    const can = Math.min(n, Math.floor(pathMin / STEP_MIN));
    covered += can;
    pathMin -= can * STEP_MIN;
    if (n - can > 0) waiting.set(a, n - can);
  }
  if (rem.check && waiting.size === 0 && pathMin >= CHECK_MIN) covered++;
  return { unitN: rem.unitN, covered, open, total: rem.steps, done: rem.done, waiting };
}

// ---------------------------------------------------------------- the run (§5)

export interface WorkoutRun {
  day: string;
  /** §5: the block whose time just ran out (its summary and the 3-second countdown show before the next one). */
  between?: string;
  /** W16: the sub-skills (and topics) already served by a block today — later Area / Topic blocks skip them. */
  served?: string[];
  blocks: Block[];
  /** Index of the block in progress. */
  at: number;
  /** Active ms used per block id. */
  used: Record<string, number>;
  /** Path steps finished inside the workout. */
  steps: string[];
  /** Items answered and right, per block id. */
  items: Record<string, [number, number]>;
  finished?: boolean;
}

export const startRun = (day: string, blocks: Block[]): WorkoutRun => ({ day, blocks, at: 0, used: {}, steps: [], items: {} });
export const blockLeftMs = (r: WorkoutRun, i = r.at) => (r.blocks[i] ? Math.max(0, r.blocks[i].minutes * 60000 - (r.used[r.blocks[i].id] ?? 0)) : 0);
export const runLeftMs = (r: WorkoutRun) => r.blocks.slice(r.at).reduce((a, _b, k) => a + blockLeftMs(r, r.at + k), 0);
/** Count a session's active time (capped at 60 s per item: pauses and wandering off don't count). */
export function addSession(r: WorkoutRun, ms: number, items: number, right: number, stepId?: string): WorkoutRun {
  const b = r.blocks[r.at];
  if (!b) return r;
  const active = Math.min(ms, Math.max(1, items) * 60000);
  const cur = r.items[b.id] ?? [0, 0];
  const next: WorkoutRun = { ...r, used: { ...r.used, [b.id]: (r.used[b.id] ?? 0) + active }, items: { ...r.items, [b.id]: [cur[0] + items, cur[1] + right] }, steps: stepId ? [...r.steps, stepId] : r.steps };
  return blockLeftMs(next) <= 0 ? { ...nextBlock(next), between: b.id } : next;
}
/**
 * SPEC-PATH-TODAY-PRACTICE §3.4 (counting from anywhere): active time on today's plan done outside the run (from
 * Practice) goes to its block — the block in progress moves on when its time is used.
 */
export function creditBlock(r: WorkoutRun, blockId: string, ms: number): WorkoutRun {
  const i = r.blocks.findIndex((b) => b.id === blockId);
  if (i < 0 || r.finished || ms <= 0) return r;
  const next: WorkoutRun = { ...r, used: { ...r.used, [blockId]: (r.used[blockId] ?? 0) + ms } };
  return i === r.at && blockLeftMs(next) <= 0 ? { ...nextBlock(next), between: blockId } : next;
}
/** The technique block today's matrix cells count toward: the first one not run out (from the block in progress on). */
export function techBlockOf(r: { blocks: Block[]; at: number; used: Record<string, number> }): Block | null {
  const ks = r.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.target.kind === 'keys');
  const left = (x: { b: Block }) => x.b.minutes * 60000 - (r.used[x.b.id] ?? 0) > 0;
  return (ks.find((x) => x.i >= r.at && left(x)) ?? ks.find(left) ?? null)?.b ?? null;
}
export const nextBlock = (r: WorkoutRun): WorkoutRun => (r.at + 1 >= r.blocks.length ? { ...r, at: r.blocks.length, finished: true } : { ...r, at: r.at + 1 });
export const extendBlock = (r: WorkoutRun, min = 2): WorkoutRun => ({ ...r, blocks: r.blocks.map((b, i) => (i === r.at ? { ...b, minutes: b.minutes + min } : b)) });

// ---------------------------------------------------------------- between blocks (§5, W20)

/** The countdown before the next block starts on its own (§5). */
export const BETWEEN_S = 3;
/** A finished block's one-line summary: minutes of active time, items and right answers. */
export function blockSummary(r: WorkoutRun, id: string): { minutes: number; items: number; right: number } {
  const [items, right] = r.items[id] ?? [0, 0];
  return { minutes: Math.round((r.used[id] ?? 0) / 60000), items, right };
}
/** The summary was seen (Next now, or the countdown ran out): the next block is on. */
export const clearBetween = (r: WorkoutRun): WorkoutRun => {
  if (!r.between) return r;
  const out = { ...r };
  delete out.between;
  return out;
};
/** "+2 min" (§5): back to the block that just ended, 2 more minutes in it. */
export function extendLast(r: WorkoutRun, min = 2): WorkoutRun {
  const i = r.between ? r.blocks.findIndex((b) => b.id === r.between) : -1;
  if (i < 0) return extendBlock(clearBetween(r), min);
  return extendBlock({ ...clearBetween(r), at: i, finished: false }, min);
}
/** W16: remember a served sub-skill / topic for later blocks. */
export const markServed = (r: WorkoutRun, key: string): WorkoutRun => (r.served?.includes(key) ? r : { ...r, served: [...(r.served ?? []), key] });
/** W16: the candidates not served yet today (all of them when every one was). */
export function unserved<T extends string>(cands: readonly T[], served: readonly string[] | undefined): T[] {
  const left = cands.filter((c) => !(served ?? []).includes(c));
  return left.length ? left : [...cands];
}

// ---------------------------------------------------------------- context, nudges, defaults (W6, W10, W11, §9.4)

/**
 * W10: today's context swaps the blocks it rules out for buttons-only content in the same area. The mic or a quiet
 * place: the vocal warm-up becomes a review (a quiet place: the game too). No instrument: the technique block becomes
 * reading and theory, the improvisation block creative ear work, and off-app practice drops.
 */
export function contextSwap(bs: Block[], ctx: { nomic: boolean; quiet: boolean; noinst: boolean }): Block[] {
  return bs
    .map((b): Block => {
      const t = b.target;
      if ((ctx.nomic || ctx.quiet) && t.kind === 'vocal') return { ...b, target: { kind: 'warmup' } };
      if (ctx.quiet && t.kind === 'game') return { ...b, target: { kind: 'warmup' } };
      if (ctx.noinst && t.kind === 'keys') return { ...b, target: { kind: 'area', area: 'reading' } };
      if (ctx.noinst && t.kind === 'improv') return { ...b, target: { kind: 'area', area: 'creative' } };
      return b;
    })
    .filter((b) => !(ctx.noinst && b.target.kind === 'practice'));
}

/** W11: the feedback's nudge — tomorrow's total ±5 and the step window ±50 rating, for 3 days. */
export function feedbackNudge(f: 'easy' | 'right' | 'hard' | 'long'): { delta: number; rating: number } {
  return { delta: f === 'easy' ? 5 : f === 'long' ? -5 : 0, rating: f === 'easy' ? 50 : f === 'hard' ? -50 : 0 };
}
/** W11: ratings moved by the step-window nudge (free practice in the workout picks its level from them). */
export function nudgedRatings<R extends { r: number }>(ratings: Partial<Record<string, R>>, delta: number): Partial<Record<string, R>> {
  if (!delta) return ratings;
  const out: Partial<Record<string, R>> = {};
  for (const [k, v] of Object.entries(ratings)) if (v) out[k] = { ...v, r: v.r + delta };
  return out;
}

/** W6: a default saved more than 30 days ago asks "refresh my default?". */
export const TEMPLATE_STALE_DAYS = 30;
export function templateStale(savedAt: string | undefined, today: string): boolean {
  if (!savedAt) return false;
  return dayNo(today) - dayNo(savedAt.slice(0, 10)) > TEMPLATE_STALE_DAYS;
}

/** §9.4: minutes each area got in a day's workout. */
export type AreaDayLog = Record<string, Partial<Record<DomainId, number>>>;
/** The minutes each of `areas` gets in a run: blocks already run count their used time, the rest their planned minutes. */
export function areaMinutes(r: WorkoutRun, areas: DomainId[]): Partial<Record<DomainId, number>> {
  const out: Partial<Record<DomainId, number>> = {};
  for (const a of areas) out[a] = 0;
  r.blocks.forEach((b, i) => {
    if (b.target.kind !== 'area' || !areas.includes(b.target.area)) return;
    const past = r.finished || i < r.at;
    out[b.target.area] = (out[b.target.area] ?? 0) + (past ? (r.used[b.id] ?? 0) / 60000 : b.minutes);
  });
  return out;
}
/**
 * §9.4: the area that "keeps waiting" — skipped or cut under a minute on 3 of the last 5 days while it still has steps
 * in the current unit (the first such area; null: none). `asked`: areas whose question is dismissed until that day.
 */
export function waitingArea(log: AreaDayLog, waiting: DomainId[], today: string, asked: Partial<Record<DomainId, string>> = {}): DomainId | null {
  const days = Object.keys(log).filter((d) => dayNo(today) - dayNo(d) >= 0 && dayNo(today) - dayNo(d) < 5);
  for (const a of waiting) {
    if ((asked[a] ?? '') >= today) continue;
    // a day counts when the area was waiting that day (it is in the day's log) and got under a minute
    if (days.filter((d) => log[d][a] !== undefined && (log[d][a] ?? 0) < 1).length >= 3) return a;
  }
  return null;
}
