// Speed games (0.38): name what you see or hear as fast as you can. Pure: the item sequence comes from a seed, the
// state moves only by `rushAnswer` / `rushTick`, so a replay with the same answers is identical.
//   Timed modes: 60 s; 10 points per right answer × combo (×1.5 from 5 in a row, ×2 from 10); a wrong answer resets
//   the combo and costs 2 s; the level rises every 5 right answers.
//   Progression Detective (streak): no clock, 3 lives; the level rises every 3 right answers.

import type { ChoiceQuestion } from './lesson';
import { TOPIC_GEN, genTopic, rng } from './topicKit';
import './topics';
import './topicsAdvGames'; // 0.70: game-only topics (voicing types, melodic-minor modes, standards, altered reading, ii–V chains)
import { chordReadItem, type ChordPictureFilter } from './topicsChordRead';
import { noteAt, tuningById, type Tuning } from './fretboard';
import type { DynName } from './courseSocial';

export type RushMode = 'chord' | 'note' | 'fretboard' | 'interval' | 'keysig' | 'progression' | 'voicing' | 'scale' | 'standard';
export const RUSH_MODES: RushMode[] = ['chord', 'note', 'fretboard', 'interval', 'keysig', 'progression', 'voicing', 'scale', 'standard'];
export type RushPicture = 'neck' | 'keys' | 'staff' | 'mixed';

export const RUSH_MS = 60_000;
export const WRONG_COST_MS = 2_000;
export const START_LIVES = 3;
export const POINTS = 10;
/** Streak modes (3 lives, no clock): Progression Detective, Voicing Spy (0.70). */
export const isStreak = (m: RushMode) => m === 'progression' || m === 'voicing';
/** Rounds mode (0.70, Name That Standard): ROUNDS items, no clock, faster answers score more. */
export const isRounds = (m: RushMode) => m === 'standard';
export const ROUNDS = 10;
/** Points of a right answer in rounds mode: 10 within 2 s, falling to 5 at 12 s. */
export const roundPoints = (ms: number) => Math.round(POINTS * (1 - 0.5 * Math.max(0, Math.min(1, (ms - 2000) / 10000))));
/** Right answers needed for the next level. */
export const levelEvery = (m: RushMode) => (isStreak(m) ? 3 : 5);
/** Score multiplier for a combo (right answers in a row, counting this one). */
export const comboMult = (combo: number) => (combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1);

// ---------------------------------------------------------------- ladders: which topic level each game level uses

export interface Rung {
  topic: string;
  level: number;
  name: { en: string; he: string };
}
const rungsOf = (topic: string): Rung[] => (TOPIC_GEN[topic]?.levels ?? []).map((name, i) => ({ topic, level: i + 1, name }));
const byDifficulty = (rs: Rung[]) =>
  rs
    .map((r) => ({ r, d: TOPIC_GEN[r.topic].gen(1, r.level, 'd').difficulty }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.r);

export const FRET_LEVELS: { en: string; he: string }[] = [
  { en: 'Natural notes, the two lowest strings', he: 'תווים טבעיים, שני המיתרים הנמוכים' },
  { en: 'Natural notes, every string', he: 'תווים טבעיים, כל המיתרים' },
  { en: 'Sharps and flats, the two lowest strings', he: 'דיאזים ובמולים, שני המיתרים הנמוכים' },
  { en: 'Every note, every string', he: 'כל התווים, כל המיתרים' },
  { en: 'The exact pitch (with its octave)', he: 'הגובה המדויק (עם האוקטבה)' },
];

const ladderCache = new Map<RushMode, Rung[]>();
/** The levels of a game, easiest first. */
export function rushLadder(mode: RushMode): Rung[] {
  const hit = ladderCache.get(mode);
  if (hit) return hit;
  let l: Rung[];
  switch (mode) {
    case 'chord':
      l = rungsOf('chord-read');
      break;
    case 'note':
      l = byDifficulty(rungsOf('note-reading'));
      break;
    case 'interval':
      l = byDifficulty(rungsOf('intervals-all'));
      break;
    case 'keysig':
      l = byDifficulty(rungsOf('key-signatures'));
      break;
    case 'progression':
      l = byDifficulty([...rungsOf('progressions'), ...rungsOf('harmonic-dictation')]);
      break;
    case 'voicing':
      l = [...rungsOf('voicing-type'), ...rungsOf('voicings')];
      break;
    case 'scale':
      l = byDifficulty([...rungsOf('scale-types'), ...rungsOf('modes-ear'), ...rungsOf('mm-modes')]);
      break;
    case 'standard':
      l = rungsOf('name-standard');
      break;
    case 'fretboard':
      l = FRET_LEVELS.map((name, i) => ({ topic: 'fretboard', level: i + 1, name }));
      break;
  }
  ladderCache.set(mode, l);
  return l;
}
export const rushMaxLevel = (mode: RushMode) => rushLadder(mode).length;

/** A run's own ladder: the tier's rungs (engine/gameTiers.ts) when it has a tier, else the game's whole ladder. */
export function ladderOf(o: Pick<RushOptions, 'mode' | 'rungs'>): Rung[] {
  if (!o.rungs?.length) return rushLadder(o.mode);
  return o.rungs.map((x) => ({ topic: x.topic, level: x.level, name: x.topic === 'fretboard' ? (FRET_LEVELS[x.level - 1] ?? FRET_LEVELS[0]) : (TOPIC_GEN[x.topic]?.levels[x.level - 1] ?? { en: x.topic, he: x.topic }) }));
}
const maxOf = (o: Pick<RushOptions, 'mode' | 'rungs'>) => ladderOf(o).length;

// ---------------------------------------------------------------- items

/** Find the named note on the neck: any matching place on the allowed strings and frets is right. */
export interface FretTarget {
  pc: number;
  /** Exact written pitch (top level); otherwise any octave. */
  midi?: number;
  /** Allowed strings (1 = highest). */
  strings: number[];
  frets: [number, number];
  name: { en: string; he: string };
}
export type RushItem =
  | { kind: 'choice'; key: string; q: ChoiceQuestion }
  | { kind: 'fret'; key: string; target: FretTarget };

/** Does this item sound (auto-played when shown, a Play button to replay)? The ear games always; in Chord Rush a
 *  drawn picture — keys, neck or chord box — sounds as an arpeggio (the staff is reading only, its stimulus is
 *  empty); in Key Signature Rush a tier's heard rung (modes, chord-scales). */
export function rushHears(m: RushMode, it: RushItem | null): boolean {
  if (m === 'interval' || m === 'progression' || m === 'voicing' || m === 'scale' || m === 'standard') return true;
  if (it?.kind !== 'choice' || !it.q.stimulus.length) return false;
  if (m === 'chord') return !!it.q.diagram;
  return m === 'keysig' && it.q.topic !== 'key-signatures';
}

export interface RushOptions {
  mode: RushMode;
  seed: number;
  startLevel: number;
  /** Chord mode: what the chord is drawn on. */
  picture?: RushPicture;
  /** Fretboard mode: the player's tuning id (src/engine/fretboard.ts). */
  tuning?: string;
  /** Level tier (pp … ff): the run climbs only inside the tier's rungs. */
  tier?: DynName;
  rungs?: { topic: string; level: number }[];
}

/** A well-mixed seed for item i (attempt a avoids an immediate repeat). */
export function itemSeed(seed: number, i: number, a = 0): number {
  const r = rng((Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(a + 1, 0xc2b2ae35)) >>> 0);
  r();
  return Math.floor(r() * 2 ** 31);
}

const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT = [0, 2, 4, 5, 7, 9, 11];
const HE_LET = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
/** A name for a pitch class (black keys: sharp or flat, by `sharp`). */
function noteName(pc: number, sharp: boolean, octave?: number): { en: string; he: string } {
  let l = NAT.indexOf(pc);
  let a = 0;
  if (l < 0) {
    l = sharp ? NAT.indexOf(pc - 1) : NAT.indexOf(pc + 1);
    a = sharp ? 1 : -1;
  }
  const o = octave === undefined ? '' : String(octave);
  return { en: `${LET[l]}${a > 0 ? '♯' : a < 0 ? '♭' : ''}${o}`, he: `${HE_LET[l]}${a > 0 ? ' דיאז' : a < 0 ? ' במול' : ''}${o ? ` ${o}` : ''}` };
}

export function fretTarget(seed: number, level: number, tuning: Tuning): FretTarget {
  const rnd = rng(seed);
  const n = tuning.open.length;
  const all = Array.from({ length: n }, (_, i) => i + 1);
  const low = [n, n - 1];
  const lv = Math.max(1, Math.min(5, level));
  const strings = lv === 1 || lv === 3 ? low : all;
  const frets: [number, number] = lv === 5 ? [0, 15] : [0, 12];
  const naturalsOnly = lv <= 2;
  // a real place first, so the target is always reachable
  for (let t = 0; t < 60; t++) {
    const str = strings[Math.floor(rnd() * strings.length)];
    const fret = frets[0] + Math.floor(rnd() * (frets[1] - frets[0] + 1));
    const m = noteAt(tuning, str, fret);
    const pc = ((m % 12) + 12) % 12;
    const natural = NAT.includes(pc);
    if (naturalsOnly && !natural) continue;
    if (lv === 3 && natural && rnd() < 0.7) continue; // mostly the black keys
    const sharp = rnd() < 0.5;
    if (lv === 5) {
      const octave = Math.floor(m / 12) - 1;
      return { pc, midi: m, strings, frets, name: noteName(pc, sharp, octave) };
    }
    return { pc, strings, frets, name: noteName(pc, sharp) };
  }
  const m = noteAt(tuning, strings[0], 5);
  return { pc: m % 12, strings, frets, name: noteName(m % 12, true) };
}

/** Is a tap at (string, fret) right for the target? Graded by pitch on the allowed strings / frets. */
export function gradeFret(t: FretTarget, str: number, fret: number, tuning: Tuning): boolean {
  if (!t.strings.includes(str) || fret < t.frets[0] || fret > t.frets[1]) return false;
  const m = noteAt(tuning, str, fret);
  return t.midi !== undefined ? m === t.midi : ((m % 12) + 12) % 12 === t.pc;
}

/** Every right place for a target (to show after a miss). */
export function fretAnswers(t: FretTarget, tuning: Tuning): { str: number; fret: number }[] {
  const out: { str: number; fret: number }[] = [];
  for (const s of t.strings) for (let f = t.frets[0]; f <= t.frets[1]; f++) if (gradeFret(t, s, f, tuning)) out.push({ str: s, fret: f });
  return out;
}

function makeItem(o: RushOptions, seed: number, level: number, id: string): RushItem {
  const lad = ladderOf(o);
  const rung = lad[Math.max(0, Math.min(lad.length, level) - 1)];
  if (o.mode === 'fretboard') {
    const target = fretTarget(seed, rung.level, tuningById(o.tuning));
    return { kind: 'fret', key: `fret:${target.midi ?? target.pc}:${target.strings.join('')}`, target };
  }
  let q: ChoiceQuestion;
  if (o.mode === 'chord' && rung.topic === 'chord-read') {
    const pic: ChordPictureFilter | undefined = !o.picture || o.picture === 'mixed' ? undefined : o.picture;
    q = chordReadItem(seed, rung.level, id, pic);
  } else {
    const g = genTopic(rung.topic, seed, rung.level, id);
    if (g.kind !== 'choice') throw new Error(`rush: ${rung.topic} is not a choice topic`);
    q = g;
  }
  return { kind: 'choice', key: `${q.topic}:${q.answer}`, q };
}

/** Item i at a level; never the same answer twice in a row (`prevKey` = the last item's key). */
export function rushItem(o: RushOptions, i: number, level: number, prevKey?: string): RushItem {
  let it = makeItem(o, itemSeed(o.seed, i), level, `rush-${i}`);
  for (let a = 1; a < 6 && prevKey && it.key === prevKey; a++) it = makeItem(o, itemSeed(o.seed, i, a), level, `rush-${i}`);
  return it;
}

// ---------------------------------------------------------------- state

export interface RushState {
  v: 1;
  opts: RushOptions;
  /** Items answered so far (= index of the current item). */
  i: number;
  level: number;
  /** Right answers since the last level change. */
  atLevel: number;
  right: number;
  wrong: number;
  combo: number;
  maxCombo: number;
  score: number;
  /** Timed modes. */
  timeLeftMs: number;
  /** Streak mode. */
  lives: number;
  over: boolean;
  /** Key of the last answered item (no immediate repeats). */
  prevKey?: string;
}

export function newRush(opts: RushOptions): RushState {
  const level = Math.max(1, Math.min(maxOf(opts), Math.round(opts.startLevel) || 1));
  const clockless = isStreak(opts.mode) || isRounds(opts.mode);
  return { v: 1, opts: { ...opts, startLevel: level }, i: 0, level, atLevel: 0, right: 0, wrong: 0, combo: 0, maxCombo: 0, score: 0, timeLeftMs: clockless ? 0 : RUSH_MS, lives: isStreak(opts.mode) ? START_LIVES : 0, over: false };
}

export const currentItem = (s: RushState): RushItem => rushItem(s.opts, s.i, s.level, s.prevKey);

export interface RushStep {
  state: RushState;
  gained: number;
  levelUp: boolean;
  /** The multiplier went up with this answer (×1.5 or ×2). */
  burst: number | null;
}

/** Apply an answer. `key` = the answered item's key (computed when omitted); `ms` = answer time (rounds mode scores speed). */
export function rushAnswer(s: RushState, correct: boolean, key?: string, ms?: number): RushStep {
  if (s.over) return { state: s, gained: 0, levelUp: false, burst: null };
  const k = key ?? currentItem(s).key;
  const n: RushState = { ...s, i: s.i + 1, prevKey: k };
  let gained = 0;
  let levelUp = false;
  let burst: number | null = null;
  if (correct) {
    n.right++;
    n.combo++;
    n.maxCombo = Math.max(n.maxCombo, n.combo);
    const m = comboMult(n.combo);
    if (m > comboMult(n.combo - 1)) burst = m;
    gained = Math.round((isRounds(s.opts.mode) ? roundPoints(ms ?? 0) : POINTS) * m);
    n.score += gained;
    n.atLevel++;
    if (n.atLevel >= levelEvery(s.opts.mode) && n.level < maxOf(s.opts)) {
      n.level++;
      n.atLevel = 0;
      levelUp = true;
    }
  } else {
    n.wrong++;
    n.combo = 0;
    if (isRounds(s.opts.mode)) {
      /* a wrong round scores nothing */
    } else if (isStreak(s.opts.mode)) {
      n.lives = Math.max(0, n.lives - 1);
      if (n.lives === 0) n.over = true;
    } else {
      n.timeLeftMs = Math.max(0, n.timeLeftMs - WRONG_COST_MS);
      if (n.timeLeftMs === 0) n.over = true;
    }
  }
  if (isRounds(s.opts.mode) && n.i >= ROUNDS) n.over = true;
  return { state: n, gained, levelUp, burst };
}

/** Let time pass (timed modes only). */
export function rushTick(s: RushState, ms: number): RushState {
  if (s.over || isStreak(s.opts.mode) || isRounds(s.opts.mode) || ms <= 0) return s;
  const t = Math.max(0, s.timeLeftMs - ms);
  return { ...s, timeLeftMs: t, over: t === 0 };
}

export interface RushResult {
  game: `rush-${RushMode}`;
  score: number;
  detail: { right: number; wrong: number; maxCombo: number; level: number; tier?: DynName; rungs?: number; rung?: string };
}
export const rushResult = (s: RushState): RushResult => {
  const lad = ladderOf(s.opts);
  const rung = lad[s.level - 1];
  return { game: `rush-${s.opts.mode}`, score: s.score, detail: { right: s.right, wrong: s.wrong, maxCombo: s.maxCombo, level: s.level, ...(s.opts.tier ? { tier: s.opts.tier, rungs: lad.length, rung: rung ? `${rung.topic}#${rung.level}` : undefined } : {}) } };
};

/** A saved Progression Detective run (resume after Back / reload). */
export interface RushSaved {
  v: 1;
  game: 'rush';
  state: RushState;
}
export function isRushSaved(x: unknown, mode: RushMode): x is RushSaved {
  const s = x as RushSaved | null;
  return !!s && s.v === 1 && s.game === 'rush' && !!s.state && s.state.v === 1 && s.state.opts?.mode === mode && !s.state.over && typeof s.state.i === 'number';
}
