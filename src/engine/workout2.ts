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
  /** `piece`: the piece key a Repertoire review block opens (game 'rep-review'). */
  | { kind: 'game'; game: string; piece?: string }
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
  | { kind: 'improv'; mode?: ImprovMode; /** SPEC-STYLE-FOCUS §4: today's style for the band and the tune (main ~60 %). */ style?: StyleId; /** SPEC-PRACTICE-SESSION §12: improvise in this key (a key focus; a minor key plays on its relative major's sheet). */ root?: number; group?: KeyGroup }
  /** SPEC-PATH-TODAY-PRACTICE §5.1: the class assignments, first and added to the workout (never replacing it). */
  | { kind: 'teacher'; ids?: string[] }
  /** SPEC-PRACTICE-SESSION §3.3: the warm-up — the slow, rubato start of today's main item (or the closed items that
   *  slipped this week, `items`, §3.2). */
  | { kind: 'rubato'; items?: string[] }
  /** §12: the whole technique share in one key — every open exercise of the key (keyLadder). */
  | { kind: 'key'; root: number; group: KeyGroup }
  /** §12: one exercise (a matrix rung) through the 12 keys, weakest keys first. */
  | { kind: 'rung'; rung: string; group: KeyGroup }
  /** §12: one item up its tempo ladder, then its other keys. */
  | { kind: 'item'; id: string }
  /** §12: one family (drums: grooves, rudiments, fills …; elsewhere the family's coach). */
  | { kind: 'family'; family: string };

/** The key rows a key focus can name (the matrix's groups: the modes live inside them as rungs). */
export type KeyGroup = 'major' | 'minor';

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
export const targetKey = (t: BlockTarget) =>
  t.kind === 'area' ? `area:${t.area}` : t.kind === 'skill' ? `skill:${t.skill}` : t.kind === 'topic' ? `topic:${t.topic}` : t.kind === 'game' ? `game:${t.game}` : t.kind === 'key' ? `key:${t.root}:${t.group}` : t.kind === 'rung' ? `rung:${t.group}:${t.rung}` : t.kind === 'item' ? `item:${t.id}` : t.kind === 'family' ? `family:${t.family}` : t.kind;

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
  /** A closed Repertoire piece due for review (repLibrary.repDueKey): the piece-review block opens it (SPEC-PRACTICE-IA-3 §5). */
  repDue?: string | null;
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
  /** SPEC-PRACTICE-SESSION §3.2: the measured signals that move the shares (neglect, gap, slipping items). */
  need?: NeedSignals;
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
  if (!(inp.piecesDue || inp.repDue) || inp.template?.length || total(out) < 10 || !roomFor(inp, out)) return out;
  // The piece review (part of the review share, SPEC-PATH-ROLE §3): a short block (weak bars, then one full run at
  // tempo) from the review block, else the largest block; placed after the review.
  const from = reviewSource(out, 3, minBlockOf(inp));
  if (!from) return out;
  from.minutes -= 3;
  const at = out.findIndex((b) => b.target.kind === 'warmup');
  // a score in the piece coach first; else a Repertoire piece due for review (its page, the Review block's run)
  const target: BlockTarget = inp.piecesDue ? { kind: 'game', game: 'pieces' } : { kind: 'game', game: 'rep-review', piece: inp.repDue! };
  out.splice(at < 0 ? out.length : at + 1, 0, { id: uid(out, 'game'), target, minutes: 3 });
  return out;
}

/** Review-like blocks (the review, the warm-up, the lick / piece reviews) may be shorter than the minimum block (§3.3). */
const shortOk = (t: BlockTarget) => t.kind === 'warmup' || t.kind === 'rubato' || t.kind === 'vocal' || (t.kind === 'game' && (t.game === 'licks' || t.game === 'encore' || t.game === 'pieces' || t.game === 'rep-review'));
/**
 * §3.3: a review add-on (licks, phrases, a piece) joins while the session has fewer blocks than its length allows —
 * from 30 minutes always: it is part of the review (2–3 minutes beside it), not another area, and it would otherwise
 * never fit an instrument session.
 */
const roomFor = (inp: SuggestInput, out: Block[]) => out.length < blockRange(total(out))[1] || total(out) >= SHAPE.endFrom || !!inp.template?.length;
const minBlockOf = (inp: SuggestInput) => (inp.technique ? SHAPE.minInstrument : SHAPE.minEar);

/** The block a review add-on (licks, pieces) takes its minutes from: the review block, else the largest one (a content
 *  block keeps the minimum block, §3.3). */
const reviewSource = (out: Block[], m: number, minB: number = LIMITS.minBlock): Block | undefined =>
  out.find((b) => b.target.kind === 'warmup' && b.minutes >= m + LIMITS.minBlock) ?? [...out].sort((a, b) => b.minutes - a.minutes).find((b) => b.minutes >= m + (shortOk(b.target) ? LIMITS.minBlock : minB));

function withLicks(inp: SuggestInput, out: Block[]): Block[] {
  if (!(inp.licksDue || inp.phrasesDue) || inp.template?.length || total(out) < 10 || !roomFor(inp, out)) return out;
  // The lick review (review share): 2 minutes from the review block (or the largest block), after the review. Licks
  // and phrases (Encore) share it: licks due first, else the player's own phrases.
  const from = reviewSource(out, 2, minBlockOf(inp));
  if (!from) return out;
  from.minutes -= 2;
  const at = out.findIndex((b) => b.target.kind === 'warmup');
  const block: Block = { id: uid(out, 'game'), target: { kind: 'game', game: inp.licksDue ? 'licks' : 'encore' }, minutes: 2 };
  out.splice(at < 0 ? out.length : at + 1, 0, block);
  return out;
}

// ---------------------------------------------------------------- §3.3 the length shapes the session

/**
 * SPEC-PRACTICE-SESSION §3.3: the smallest block on an instrument / in the ear course (a shorter one goes into its
 * neighbour), the warm-up (~10 % from 20 minutes), the pleasant ending (from 30), the second technique block (from 45),
 * the tune and the game (from 60), and the 20-minute ceiling of a block (from 90).
 */
export const SHAPE = { minInstrument: 4, minEar: 3, warmFrom: 20, warmShare: 0.1, warmMax: 8, endFrom: 30, tech2From: 45, extrasFrom: 60, longFrom: 90, maxLong: 20, reviewMax: 6 } as const;

/** §3.3: how many blocks a session of `T` minutes has (at least, at most). Above 160 minutes a 20-minute ceiling needs more. */
export function blockRange(T: number): [number, number] {
  if (T <= 10) return [1, 2];
  if (T <= 20) return [2, 3];
  if (T <= 30) return [3, 4];
  if (T <= 45) return [4, 5];
  if (T <= 60) return [5, 6];
  // 90+: 6–8; past 120 minutes eight 20-minute blocks beside the warm-up and the review no longer hold the session,
  // so one more per 20 minutes
  return [6, Math.max(8, Math.ceil(T / SHAPE.maxLong) + 2)];
}
/** §3.3: the warm-up's minutes (0 under 20 minutes). */
export const warmMinutes = (T: number): number => (T >= SHAPE.warmFrom ? Math.max(2, Math.min(SHAPE.warmMax, Math.round(T * SHAPE.warmShare))) : 0);
/** §3.2 Due: the review block grows with the reviews waiting, 2 → 6 minutes (2 in a session of 10 or less). */
export const reviewMinutes = (due: number, T: number): number => (due <= 0 ? 0 : T <= 10 ? 2 : Math.max(2, Math.min(SHAPE.reviewMax, Math.round(T * 0.2), 2 + Math.floor((due - 1) / 3))));

interface ShapePart {
  target: BlockTarget;
  /** Weight of the content minutes (fixed parts: their minutes). */
  w: number;
  /** Place in the session (low first). */
  pos: number;
}

/**
 * §3.3, the one shaper every session goes through. `fixed`: the warm-up and the review, in priority order (dropped from
 * the end when the main block would fall under the minimum). `cands`: content blocks in priority order (the most needed
 * first); as many are taken as the length allows, `ending` is kept from 30 minutes on, each gets its weight's share, and
 * a block under `minB` goes into its neighbour. From 90 minutes no block runs over 20; a session under its least count
 * splits its largest block. Deterministic.
 */
function shapeCore(T: number, fixed: (ShapePart & { minutes: number })[], cands: ShapePart[], minB: number, ending: ShapePart | null, fillLeast = true): Block[] {
  const [lo, hi] = blockRange(T);
  let fx = fixed.filter((f) => f.minutes > 0);
  while (fx.length && T - fx.reduce((a, f) => a + f.minutes, 0) < minB) fx = fx.slice(0, -1);
  const content = T - fx.reduce((a, f) => a + f.minutes, 0);
  const slots = Math.max(1, T <= 10 ? 1 : hi - fx.length);
  let chosen = cands.filter((c) => c.w > 0).slice(0, slots);
  if (ending && T >= SHAPE.endFrom && !chosen.includes(ending) && slots >= 2) chosen = [...chosen.slice(0, slots - 1), ending];
  while (chosen.length > 1 && chosen.length * minB > content) {
    // the lowest priority goes (never the ending from 30 minutes on)
    const k = [...chosen.keys()].reverse().find((i) => !(chosen[i] === ending && T >= SHAPE.endFrom)) ?? chosen.length - 1;
    chosen = chosen.filter((_, i) => i !== k);
  }
  // weights → whole minutes, largest remainder
  const W = chosen.reduce((a, c) => a + c.w, 0) || 1;
  const raw = chosen.map((c) => (c.w / W) * content);
  const mins = raw.map(Math.floor);
  let left = content - mins.reduce((a, x) => a + x, 0);
  const byRem = raw.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % byRem.length, left--) mins[byRem[k].i]++;
  let parts = chosen.map((c, i) => ({ ...c, minutes: mins[i] })).sort((a, b) => a.pos - b.pos);
  // a block under the minimum goes into its neighbour (the one before it, else the one after)
  for (let guard = 0; guard < 20 && parts.length > 1; guard++) {
    const small = parts.map((p, i) => ({ p, i })).filter((x) => x.p.minutes < minB).sort((a, b) => a.p.minutes - b.p.minutes || b.i - a.i)[0];
    if (!small) break;
    const j = small.i > 0 ? small.i - 1 : 1;
    parts[j] = { ...parts[j], minutes: parts[j].minutes + small.p.minutes };
    parts = parts.filter((_, i) => i !== small.i);
  }
  // from 90 minutes no block over 20 (split in two halves of the same kind), and never fewer blocks than the table's
  const count = () => parts.length + fx.length;
  const split = (i: number) => {
    const p = parts[i];
    const a = Math.ceil(p.minutes / 2);
    parts.splice(i, 1, { ...p, minutes: a }, { ...p, minutes: p.minutes - a });
  };
  const largest = () => parts.reduce((bi, p, i) => (p.minutes > parts[bi].minutes ? i : bi), 0);
  if (T >= SHAPE.longFrom) {
    for (let guard = 0; guard < 30 && count() < hi && parts[largest()].minutes > SHAPE.maxLong; guard++) split(largest());
    // what halving left over 20 goes, a minute at a time, to the shortest block
    for (let guard = 0; guard < 400 && parts[largest()].minutes > SHAPE.maxLong; guard++) {
      const i = largest();
      const j = parts.reduce((bj, p, k) => (p.minutes < parts[bj].minutes ? k : bj), 0);
      if (parts[j].minutes >= SHAPE.maxLong) break;
      parts[i] = { ...parts[i], minutes: parts[i].minutes - 1 };
      parts[j] = { ...parts[j], minutes: parts[j].minutes + 1 };
    }
  }
  // (a focus on one target keeps its one long block: two halves of the same key would only repeat its name)
  if (fillLeast) for (let guard = 0; guard < 30 && count() < lo && parts[largest()].minutes >= 2 * minB; guard++) split(largest());
  const all = [...fx, ...parts].sort((a, b) => a.pos - b.pos);
  const out: Block[] = [];
  for (const p of all) out.push({ id: uid(out, p.target.kind), target: p.target, minutes: p.minutes });
  return out;
}

function suggestBase(inp: SuggestInput): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(inp.total)));
  // Migration (SPEC-PATH-ROLE §7.1): a saved template the player made stays exactly theirs (rescaled to the total);
  // only generated suggestions use the new shares.
  if (inp.template?.length) return rescale(inp.template.map((b) => ({ ...b })), T);
  // BUILD-PLAN D2: an instrument course with technique in the workout — the path, then technique / improvisation.
  if (inp.technique) return suggestInstrument(inp, T);
  return suggestEar(inp, T);
}

/**
 * SPEC-PATH-ROLE §3 shaped by §3.3: new (the path) ~22 %, strengthen (opened items: weak keys, the tempo ladder, weak
 * ear sub-skills) ~48 %, review (spaced reviews, licks / pieces) ~30 %, moved by need (§3.2). A new player with nothing
 * opened: the path takes the strengthen share too; "I choose" (§6 Q3): no New block. Singers warm up first (from 20
 * minutes); review opens the session; a game ends it from 30 minutes; a second strengthen block from 45.
 */
function suggestEar(inp: SuggestInput, T: number): Block[] {
  const choose = inp.pathMode === 'choose';
  const opened = inp.opened ?? openedCount(inp.view);
  const base = choose ? { new: 0, strengthen: SHARES.new + SHARES.strengthen, review: SHARES.review } : opened === 0 ? { new: SHARES.new + SHARES.strengthen, strengthen: 0, review: SHARES.review } : { ...SHARES };
  const sh = earSharesByNeed(base, inp.need).shares;
  const due = inp.reviewsDue > 0;
  const fixed: (ShapePart & { minutes: number })[] = [];
  const vocal = inp.singer ? warmMinutes(T) : 0;
  if (vocal) fixed.push({ target: { kind: 'vocal' }, w: 0, pos: 0, minutes: vocal });
  // a short session: the reviews due are a short fixed block (2 → 6 minutes); from 30 minutes review is a share
  const shortReview = due && T < SHAPE.endFrom;
  if (shortReview) fixed.unshift({ target: { kind: 'warmup' }, w: 0, pos: 1, minutes: reviewMinutes(inp.reviewsDue, T) });
  const review: ShapePart = { target: { kind: 'warmup' }, w: sh.review, pos: 1 };
  const path: ShapePart = { target: { kind: 'path' }, w: sh.new, pos: 2 };
  const str: ShapePart = { target: { kind: 'strengthen' }, w: sh.strengthen, pos: 3 };
  const ending: ShapePart = { target: { kind: 'game', game: workoutGame(inp.course, inp.day, inp.jazz) }, w: 0.1, pos: 6 };
  const main = str.w >= path.w ? str : path;
  const other = main === str ? path : str;
  const cands: ShapePart[] = [main];
  if (T >= SHAPE.endFrom) cands.push(ending);
  // the reviews due before new material; otherwise the path's next steps before a plain review
  if (!shortReview && due) cands.push(review);
  cands.push(other);
  if (!shortReview && !due) cands.push(review);
  if (T >= SHAPE.tech2From && str.w > 0) {
    // a second strengthen block: the strengthen share split in two
    const half = str.w / 2;
    str.w = half;
    cands.push({ target: { kind: 'strengthen' }, w: half, pos: 4 });
  }
  return shapeCore(T, fixed, cands, SHAPE.minEar, T >= SHAPE.endFrom ? ending : null);
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
function suggestInstrument(inp: SuggestInput, T: number): Block[] {
  const choose = inp.pathMode === 'choose';
  const opened = inp.opened ?? openedCount(inp.view);
  const base = (inp.techTier ?? 2) <= 1 ? DAY_SHARES.techBeginner : DAY_SHARES.tech;
  const share = techShareByNeed(base, inp.need, inp.tilt ?? 0).share;
  let wPath = choose ? 0 : DAY_SHARES.path;
  let wTech = (1 - DAY_SHARES.path) * share;
  const wImp = (1 - DAY_SHARES.path) * (1 - share);
  // A new player with nothing opened on the path: a real beginner (tier 0) starts with the path; an experienced
  // player new to the app (tier 1+ from the level test / self-rating) keeps a technique block from day one.
  if (opened === 0 && !choose && (inp.techTier ?? 0) < 1) {
    wPath += wTech;
    wTech = 0;
  }
  const mode = improvMode(inp.course, inp.emphasis, inp.mainStyle);
  const slipping = inp.need?.slipping ?? [];
  // the warm-up (~10 % from 20 minutes): the slow start of today's main item — or the closed items that slipped this
  // week (from 15 minutes, then 2 minutes); the reviews due (2 → 6 minutes) after it
  const warm = warmMinutes(T) || (slipping.length && T >= 15 ? 2 : 0);
  const fixed: (ShapePart & { minutes: number })[] = [];
  if (warm) fixed.push({ target: slipping.length ? { kind: 'rubato', items: slipping.slice(0, 4) } : { kind: 'rubato' }, w: 0, pos: 0, minutes: warm });
  const rev = reviewMinutes(inp.reviewsDue, T);
  // a session of 10 minutes or less: the review before the warm-up (there is none under 20 anyway)
  if (rev) fixed.splice(T <= 10 ? 0 : fixed.length, 0, { target: { kind: 'warmup' }, w: 0, pos: 1, minutes: rev });
  const path: ShapePart = { target: { kind: 'path' }, w: wPath, pos: 2 };
  const tech: ShapePart = { target: { kind: 'keys' }, w: wTech, pos: 3 };
  const imp: ShapePart = { target: { kind: 'improv', mode, ...(inp.improvStyle ? { style: inp.improvStyle } : {}) }, w: wImp, pos: 8 };
  const game: ShapePart = { target: { kind: 'game', game: workoutGame(inp.course, inp.day, inp.jazz) }, w: 0.08, pos: 6 };
  // §3.3 at 60: "play a tune" — repertoire beside the improvisation (a classical emphasis already ends on repertoire;
  // the drums have no tunes)
  const tune: ShapePart | null = mode === 'improv' ? { target: { kind: 'improv', mode: 'repertoire' }, w: 0.12, pos: 7 } : null;
  const byNeed = [tech, path, imp].filter((p) => p.w > 0).sort((a, b) => b.w - a.w || a.pos - b.pos);
  const main = byNeed[0] ?? tech;
  const ending = T >= SHAPE.endFrom ? (imp.w > 0 ? imp : game) : null;
  const cands: ShapePart[] = [main];
  if (ending && ending !== main) cands.push(ending);
  for (const p of byNeed) if (!cands.includes(p)) cands.push(p);
  if (T >= SHAPE.extrasFrom) {
    if (tune) cands.push(tune);
    if (!cands.includes(game)) cands.push(game);
  }
  if (T >= SHAPE.tech2From && tech.w > 0) {
    // §3.3 at 45: a second technique block (today's plan goes on: another exercise or key)
    const half = tech.w / 2;
    tech.w = half;
    cands.push({ target: { kind: 'keys' }, w: half, pos: 4 });
  }
  return shapeCore(T, fixed, cands, SHAPE.minInstrument, ending);
}

// ---------------------------------------------------------------- §3.2 the coach moves the shares by need

/**
 * SPEC-PRACTICE-SESSION §3.2: what the coach measured. Instrument courses: active minutes in the last 7 days on
 * technique and on the improvisation share (the practice-time ledger, this course), and how close each is to its target
 * (0..1: technique tempo against target, the improvisation level's score). Ear: minutes of spaced review and of the rest.
 */
export interface NeedSignals {
  week?: { tech?: number; improv?: number; review?: number; work?: number };
  close?: { tech?: number; improv?: number };
  /** Closed drill items that failed twice this week: the warm-up takes them (§3.2 Slipping). */
  slipping?: string[];
}
/** §3.2: the most a share moves from its baseline (points), what neglect and the gap add at most, and the least week
 *  measured before neglect is read (minutes). */
export const NEED = { maxMove: 15, neglect: 10, gap: 5, minWeek: 20, gapMin: 0.05 } as const;
export type NeedArea = 'tech' | 'improv' | 'review' | 'work';
export type NeedReason =
  | { kind: 'neglect'; area: NeedArea; week: number; planned: number; points: number }
  | { kind: 'gap'; area: NeedArea; points: number }
  | { kind: 'tilt'; area: NeedArea; points: number }
  | { kind: 'due'; n: number }
  | { kind: 'slipping'; n: number };

/** Points for an area that got less than its planned share: more than a third short → up to 10 (all of it short). */
const neglectPoints = (actual: number, planned: number): number => {
  if (planned <= 0) return 0;
  const short = 1 - actual / planned;
  return short > 1 / 3 ? Math.round(NEED.neglect * Math.min(1, short)) : 0;
};

/**
 * §3.2 for an instrument course: the technique share (of technique + improvisation) moved by neglect (+ up to 10 to the
 * area short of its planned minutes this week), the gap (+5 to the area furthest from its target) and the accepted AI
 * tilt (±10 to improvisation, as before), together at most ±15 points from the baseline. Returns the reasons too, the
 * biggest first.
 */
export function techShareByNeed(base: number, n: NeedSignals | undefined, tilt = 0): { share: number; moves: NeedReason[] } {
  const moves: NeedReason[] = [];
  const t = n?.week?.tech ?? 0;
  const i = n?.week?.improv ?? 0;
  if (n?.week && t + i >= NEED.minWeek) {
    const pt = neglectPoints(t, base * (t + i));
    const pi = neglectPoints(i, (1 - base) * (t + i));
    if (pt) moves.push({ kind: 'neglect', area: 'tech', week: Math.round(t), planned: Math.round(base * (t + i)), points: pt });
    if (pi) moves.push({ kind: 'neglect', area: 'improv', week: Math.round(i), planned: Math.round((1 - base) * (t + i)), points: pi });
  }
  const ct = n?.close?.tech;
  const ci = n?.close?.improv;
  if (ct !== undefined && ci !== undefined && Math.abs(ct - ci) >= NEED.gapMin) moves.push({ kind: 'gap', area: ct < ci ? 'tech' : 'improv', points: NEED.gap });
  const tl = Math.round(Math.max(-0.1, Math.min(0.1, tilt)) * 100);
  if (tl) moves.push({ kind: 'tilt', area: tl > 0 ? 'improv' : 'tech', points: Math.abs(tl) });
  const toTech = moves.reduce((a, m) => a + ('points' in m ? (m.area === 'tech' ? m.points : -m.points) : 0), 0);
  const move = Math.max(-NEED.maxMove, Math.min(NEED.maxMove, toTech));
  const share = Math.max(0.5, Math.min(0.95, base + move / 100));
  return { share, moves: moves.sort((a, b) => ('points' in b ? b.points : 0) - ('points' in a ? a.points : 0)) };
}

/**
 * §3.2 for the ear course: review against the rest. Spaced review short of its planned share this week gets up to 10
 * points (from new and strengthen, in their proportion); review over its share gives up to 10 to strengthening. At most
 * ±15 from the baseline.
 */
export function earSharesByNeed(base: { new: number; strengthen: number; review: number }, n: NeedSignals | undefined): { shares: { new: number; strengthen: number; review: number }; moves: NeedReason[] } {
  const moves: NeedReason[] = [];
  const r = n?.week?.review ?? 0;
  const w = n?.week?.work ?? 0;
  if (n?.week && r + w >= NEED.minWeek && base.review > 0) {
    const pr = neglectPoints(r, base.review * (r + w));
    const pw = neglectPoints(w, (1 - base.review) * (r + w));
    if (pr) moves.push({ kind: 'neglect', area: 'review', week: Math.round(r), planned: Math.round(base.review * (r + w)), points: pr });
    if (pw) moves.push({ kind: 'neglect', area: 'work', week: Math.round(w), planned: Math.round((1 - base.review) * (r + w)), points: pw });
  }
  const toReview = Math.max(-NEED.maxMove, Math.min(NEED.maxMove, moves.reduce((a, m) => a + ('points' in m ? (m.area === 'review' ? m.points : -m.points) : 0), 0))) / 100;
  if (!toReview) return { shares: { ...base }, moves };
  const review = Math.max(0.05, Math.min(0.9, base.review + toReview));
  const restBase = base.new + base.strengthen || 1;
  const rest = 1 - review;
  // review's points come from (or go to) new and strengthen in their proportion; strengthening takes review's surplus
  const shares = toReview > 0 ? { new: (base.new / restBase) * rest, strengthen: (base.strengthen / restBase) * rest, review } : base.strengthen > 0 ? { new: base.new, strengthen: base.strengthen + (base.review - review), review } : { new: base.new + (base.review - review), strengthen: 0, review };
  return { shares, moves: moves.sort((a, b) => ('points' in b ? b.points : 0) - ('points' in a ? a.points : 0)) };
}

/**
 * §3.2 "one reason per change": the biggest move today — a share moved by need or the accepted tilt (3 points or more),
 * else a review grown by the reviews due, else the closed items that slipped into the warm-up. Null: the plan as usual.
 */
export function sessionReason(inp: SuggestInput): NeedReason | null {
  if (inp.template?.length) return null;
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(inp.total)));
  const moves = inp.technique ? techShareByNeed((inp.techTier ?? 2) <= 1 ? DAY_SHARES.techBeginner : DAY_SHARES.tech, inp.need, inp.tilt ?? 0).moves : earSharesByNeed(SHARES, inp.need).moves;
  const top = moves.find((m) => 'points' in m && m.points >= 3);
  if (top) return top;
  if (reviewMinutes(inp.reviewsDue, T) > 2) return { kind: 'due', n: inp.reviewsDue };
  const sl = inp.need?.slipping?.length ?? 0;
  if (inp.technique && sl && T >= 15) return { kind: 'slipping', n: sl };
  return null;
}

const AREA_WORD: Record<NeedArea | ImprovMode, { en: string; he: string }> = {
  tech: { en: 'technique', he: 'טכניקה' },
  improv: { en: 'improvisation', he: 'אימפרוביזציה' },
  repertoire: { en: 'repertoire', he: 'רפרטואר' },
  grooves: { en: 'grooves', he: 'גרובים' },
  review: { en: 'review', he: 'חזרה' },
  work: { en: 'strengthening', he: 'חיזוק' },
};
/** The reason as one line on the card (Hebrew and English). `mode`: what the improvisation share is in this course. */
export function reasonLine(r: NeedReason, mode: ImprovMode = 'improv'): { en: string; he: string } {
  if (r.kind === 'due') return { en: `A longer review: ${r.n} reviews due`, he: `חזרה ארוכה יותר: ${r.n} חזרות ממתינות` };
  if (r.kind === 'slipping') return r.n === 1 ? { en: 'The warm-up returns to a closed item that slipped this week', he: 'החימום חוזר לפריט סגור שהחליק השבוע' } : { en: `The warm-up returns to ${r.n} closed items that slipped this week`, he: `החימום חוזר ל־${r.n} פריטים סגורים שהחליקו השבוע` };
  const a = AREA_WORD[r.area === 'improv' ? mode : r.area];
  if (r.kind === 'neglect') return { en: `More ${a.en} today: ${r.week} min this week out of ${r.planned} planned`, he: `יותר ${a.he} היום: ${r.week} דק׳ השבוע מתוך ${r.planned} שתוכננו` };
  if (r.kind === 'gap') return { en: `More ${a.en} today: it is furthest from its target`, he: `יותר ${a.he} היום: הכי רחוק מהיעד` };
  return { en: `More ${a.en} this week: the coach's suggestion you accepted`, he: `יותר ${a.he} השבוע: ההצעה של המאמן שקיבלתם` };
}

// ---------------------------------------------------------------- §12 a key, an exercise, an item, a family

/** §12: what a session can be for beyond an area — written into today's focus as `key:0:major`, `rung:major:scales-3`,
 *  `item:<id>`, `family:<id>`. */
export type FocusTarget = { kind: 'key'; root: number; group: KeyGroup } | { kind: 'rung'; rung: string; group: KeyGroup } | { kind: 'item'; id: string } | { kind: 'family'; family: string } | { kind: 'mode'; mode: FocusMode };
/** §12's "Licks · Improvise · Repertoire" (grooves on the drums): the course's other shares, each a whole session. */
export type FocusMode = ImprovMode | 'licks';
export const FOCUS_MODES: FocusMode[] = ['improv', 'repertoire', 'grooves', 'licks'];
export const focusIdOf = (t: FocusTarget): string => (t.kind === 'key' ? `key:${t.root}:${t.group}` : t.kind === 'rung' ? `rung:${t.group}:${t.rung}` : t.kind === 'item' ? `item:${t.id}` : t.kind === 'mode' ? `mode:${t.mode}` : `family:${t.family}`);
/** A focus string back to its target (null: 'plan' or an area). */
export function parseFocus(f: string | null | undefined): FocusTarget | null {
  if (!f) return null;
  const k = f.indexOf(':');
  if (k < 0) return null;
  const kind = f.slice(0, k);
  const rest = f.slice(k + 1);
  if (kind === 'key') {
    const [r, g] = rest.split(':');
    const root = Number(r);
    return Number.isInteger(root) && root >= 0 && root < 12 && (g === 'major' || g === 'minor') ? { kind: 'key', root, group: g } : null;
  }
  if (kind === 'rung') {
    const j = rest.indexOf(':');
    const g = rest.slice(0, j);
    return j > 0 && (g === 'major' || g === 'minor') && rest.length > j + 1 ? { kind: 'rung', group: g, rung: rest.slice(j + 1) } : null;
  }
  if (kind === 'item') return rest ? { kind: 'item', id: rest } : null;
  if (kind === 'family') return rest ? { kind: 'family', family: rest } : null;
  if (kind === 'mode') return (FOCUS_MODES as string[]).includes(rest) ? { kind: 'mode', mode: rest as FocusMode } : null;
  return null;
}

/**
 * §12 + §3.3: today's blocks for a key, an exercise, an item or a family — the target takes the technique share and the
 * length still shapes the session: 10 minutes is the target alone (the key's scale and one more exercise), from 15 the
 * improvisation share joins (in the key, for a key focus; grooves on the drums) and from 30 it ends the session; from
 * 90 no block runs over 20 minutes. The coach's run opens slowly by itself (the key ladder's scale first, a new item in
 * free time), so there is no separate warm-up inside a target.
 */
export function targetFocusBlocks(t: FocusTarget, totalMin: number, o: { course?: CourseId; emphasis?: SuggestInput['emphasis']; mainStyle?: StyleId; improvStyle?: StyleId } = {}): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(totalMin)));
  // the improvisation share (or the licks) as the whole session: one block, split past 20 minutes from 90
  if (t.kind === 'mode') {
    const only: BlockTarget = t.mode === 'licks' ? { kind: 'game', game: 'licks' } : { kind: 'improv', mode: t.mode, ...(o.improvStyle && t.mode !== 'repertoire' ? { style: o.improvStyle } : {}) };
    return shapeCore(T, [], [{ target: only, w: 1, pos: 1 }], SHAPE.minInstrument, null, false);
  }
  const target: BlockTarget = t.kind === 'key' ? { kind: 'key', root: t.root, group: t.group } : t.kind === 'rung' ? { kind: 'rung', rung: t.rung, group: t.group } : t.kind === 'item' ? { kind: 'item', id: t.id } : { kind: 'family', family: t.family };
  const mode = improvMode(o.course, o.emphasis, o.mainStyle);
  const main: ShapePart = { target, w: 0.75, pos: 1 };
  const imp: ShapePart = { target: { kind: 'improv', mode, ...(o.improvStyle ? { style: o.improvStyle } : {}), ...(t.kind === 'key' && mode === 'improv' ? { root: t.root, group: t.group } : {}) }, w: 0.25, pos: 2 };
  return shapeCore(T, [], [main, imp], SHAPE.minInstrument, T >= SHAPE.endFrom ? imp : null, false);
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
      return t.game === 'licks' || t.game === 'encore' || t.game === 'pieces' || t.game === 'rep-review' ? 'review' : null;
    case 'keys':
    case 'strengthen':
    case 'area':
    case 'skill':
    case 'topic':
    case 'key':
    case 'rung':
    case 'item':
    case 'family':
      return 'strengthen';
    case 'rubato':
      return t.items?.length ? 'review' : null;
    case 'improv':
      return (t.mode ?? 'improv') === 'improv' && t.root === undefined ? 'week' : null;
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
/** The open assignments as the workout sees them — the teacher's minutes a day (§5.2) included. */
export function teacherItems(as: readonly { lessonId: string; dueOn: string | null; minutes?: number | null; ifShort?: 'spread' | 'today'; perDay?: number | null }[]): TeacherItem[] {
  return as.map((a) => ({ id: a.lessonId, dueOn: a.dueOn, ...(a.minutes != null ? { minutes: a.minutes } : {}), ...(a.ifShort ? { ifShort: a.ifShort } : {}), ...(a.perDay != null ? { perDay: a.perDay } : {}) }));
}
/**
 * SPEC-PATH-TODAY-PRACTICE §3.4 for Improvise: the level that is part of today — with an improvisation block in today's
 * workout, the first level not closed yet (its best under 90 %, improvLadder's "closed"); null without one.
 */
export function improvLevelToday(levels: readonly { id: string; n: number }[], best: Record<string, number> | undefined, blocks: readonly Block[]): number | null {
  if (!blocks.some((b) => b.target.kind === 'improv' && (b.target.mode ?? 'improv') === 'improv')) return null;
  return levels.find((l) => (best?.[l.id] ?? -1) < 0.9)?.n ?? null;
}
/**
 * §3.4 for pieces: why a piece is part of today — the path's current step, or today's Repertoire review block (a piece
 * due for review). Null: not part of today.
 */
export function pieceWhyToday(key: string, pathStepId: string | null | undefined, blocks: readonly Block[]): { en: string; he: string } | null {
  if (pathStepId && pathStepId === key) return { en: 'New from the path', he: 'חדש מהמסלול' };
  if (blocks.some((b) => b.target.kind === 'game' && b.target.game === 'rep-review' && b.target.piece === key)) return { en: 'Review today', he: 'חזרה היום' };
  return null;
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

/** SPEC-PRACTICE-SESSION §2: the areas the card's focus picker offers, each one an existing preset. */
export const FOCUS_PRESET: Partial<Record<DomainId, Preset>> = { instrument: 'instrument', pitch: 'ear', time: 'rhythm', reading: 'reading', voice: 'voice' };
/** The active course's areas that have a focus preset, in the course's order. */
export const focusAreas = (courseAreas: readonly DomainId[]): DomainId[] => courseAreas.filter((a) => !!FOCUS_PRESET[a]);
/**
 * The card's focus (§2): today's blocks for one area of the active course, at `totalMin`. The session stays inside the
 * course: an instrument course's "instrument" focus keeps the suggestion's technique / improvisation / warm-up blocks;
 * otherwise the area's preset, its side block moved into the course when the preset reaches outside it.
 */
export function focusBlocks(area: DomainId, totalMin: number, suggested: Block[], courseAreas: readonly DomainId[]): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(totalMin)));
  if (area === 'instrument') {
    // §12 "Technique": all technique, weakest first — the warm-up, the review and the technique blocks (the
    // improvisation share has its own focus now)
    const own = suggested.filter((b) => b.target.kind === 'keys' || b.target.kind === 'strengthen' || b.target.kind === 'rubato' || b.target.kind === 'warmup' || b.target.kind === 'teacher');
    if (own.some((b) => b.target.kind === 'keys' || b.target.kind === 'strengthen')) return rescale(own.map((b) => ({ ...b, locked: false })), T);
  }
  const p = FOCUS_PRESET[area];
  if (!p) return rescale(suggested.map((b) => ({ ...b })), T);
  const out: Block[] = [];
  for (const b of preset(p, T, suggested)) {
    const tg = b.target.kind === 'area' && !courseAreas.includes(b.target.area) ? { kind: 'area' as const, area } : b.target;
    const same = out.find((x) => targetKey(x.target) === targetKey(tg));
    if (same && same.minutes + b.minutes <= LIMITS.maxBlock) same.minutes += b.minutes;
    else out.push({ ...b, target: tg });
  }
  return out;
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
  if (b.target.kind === 'warmup' || b.target.kind === 'game' || b.target.kind === 'vocal' || b.target.kind === 'practice' || b.target.kind === 'mistakes' || b.target.kind === 'strengthen' || b.target.kind === 'keys' || b.target.kind === 'improv' || b.target.kind === 'teacher' || b.target.kind === 'rubato' || b.target.kind === 'key' || b.target.kind === 'rung' || b.target.kind === 'item' || b.target.kind === 'family') return { free: b.target };
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
  /** SPEC-PRACTICE-SESSION §8: the session's id, its course and focus, and the minutes chosen at Start. */
  id?: string;
  course?: CourseId;
  /** 'plan', an area, or a target (§12: `key:…`, `rung:…`, `item:…`, `family:…`). */
  focus?: string;
  planned?: number;
  /** SPEC-PRACTICE-SESSION §11.6: active ms of the session's takes per stretch band (stretch / work / comfort). */
  bandMs?: { stretch: number; work: number; comfort: number };
  /** §4: "+5 min" was taken at the end (offered once). */
  plus5?: boolean;
}

export const startRun = (day: string, blocks: Block[], meta?: { id?: string; course?: CourseId; focus?: string }): WorkoutRun => ({ day, blocks, at: 0, used: {}, steps: [], items: {}, ...(meta ? { ...meta, planned: total(blocks) } : {}) });
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
/** How long the player must be still (no tap, key, MIDI or heard note) before a run-out block hands over (§5). */
export const BETWEEN_QUIET_MS = 4000;
/**
 * §5 for blocks on their own screens (Improvise, a game, the vocal warm-up): when the block's time runs out, the
 * between-blocks screen shows at the end of the take — never while a take is in progress (`busy`) or the player is
 * still playing / answering (an input within BETWEEN_QUIET_MS).
 */
export function betweenNow(timeUp: boolean, busy: boolean, lastInputAt: number | null, now: number): boolean {
  if (!timeUp || busy) return false;
  return lastInputAt === null || now - lastInputAt >= BETWEEN_QUIET_MS;
}
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
/**
 * SPEC-PRACTICE-SESSION §4: "Keep going? +5 min" on the last block, before the end screen — one more block of the most
 * needed area (the session's largest working block: technique, improvisation, the strengthen share …; never the
 * warm-up or off-app practice), 5 minutes, run at once. Offered once per session.
 */
export function plusFive(r: WorkoutRun, min = 5): WorkoutRun {
  const skip = new Set<BlockTarget['kind']>(['warmup', 'rubato', 'practice', 'vocal', 'teacher']);
  const pool = r.blocks.filter((b) => !skip.has(b.target.kind) && !b.id.startsWith('listen-'));
  const top = [...(pool.length ? pool : r.blocks)].sort((a, b) => b.minutes - a.minutes)[0];
  if (!top) return r;
  const block: Block = { id: `${top.id}+5`, target: top.target, minutes: min };
  const out: WorkoutRun = { ...clearBetween(r), blocks: [...r.blocks, block], at: r.blocks.length, finished: false, plus5: true };
  return out;
}
/** §4: the session reached its last block's end on its own (not "End"): the "+5 min" offer shows before the end screen. */
export const plusFiveOffer = (r: WorkoutRun): boolean => !!r.finished && !!r.between && !r.plus5;

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
      if (ctx.noinst && (t.kind === 'keys' || t.kind === 'key' || t.kind === 'rung' || t.kind === 'item' || t.kind === 'family')) return { ...b, target: { kind: 'area', area: 'reading' } };
      if (ctx.noinst && t.kind === 'rubato') return { ...b, target: { kind: 'warmup' } };
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
