// Hold the Note (AUDIT-GAMES §4.2 #5; docs/HARMONY-REHARM.md §2, REHARM C.1): one note, many chords. A held note sounds;
// which chord keeps it, and what is it over that chord? Answer fast — quick answers score more. At ff, "8 ways, no
// repeats": find eight different chords that hold the note — tap them, or play them on a MIDI keyboard.
//
// Tiers: pp which triad has the note · p which 7th chord · mp its degree over a 7th chord · mf its degree over a
// tension chord (9, 11, 13, ♭9, ♯9, ♯11, ♭13 — spelled: a held F is the ♯11 of B7♯11 written E♯) · f a 4-bar chain
// holding the note: which bar drops it · ff 8 ways. Built on commonTone.ts (degreeIn, spellHeld, LADDER, holdsNote,
// identifyChord); every held note of the 12 in turn (cycle of 4ths from a random start). Pure.

import { CT_Q, LADDER, chordsHolding, degreeIn, holdsNote, rootName, spellHeld, type CtQ, type HeldChord } from './commonTone';
import { cycleKey, itemSeed, pc, pickOf, rng, shuffled } from './newGamesKit';
import type { DynName } from './courseSocial';

export const HOLD_QUESTIONS = 10;
export const HOLD_BOARDS = 2;
export const HOLD_LIVES = 3;
export const HOLD_WAYS = 8;
export const holdLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
/** How many items a run has (questions; boards at ff). */
export const holdItems = (level: number): number => (level >= 6 ? HOLD_BOARDS : HOLD_QUESTIONS);

/** The held note's name: flats, F♯ for the black key between F and G. */
export const heldName = (p: number): string => (pc(p) === 6 ? 'F♯' : rootName(p, true));
const symOf = (root: number, q: CtQ): string => (pc(root) === 6 ? 'F♯' : rootName(root, true)) + CT_Q[q].sym;
const has = (root: number, q: CtQ, note: number) => CT_Q[q].ints.some((x) => pc(x) === pc(note - root));

export interface HoldChoice {
  id: string;
  /** Text on the button (a chord symbol, a degree, a bar number). */
  label: string;
}
export type HoldQ =
  | { kind: 'which'; held: number; choices: HoldChoice[]; answer: string; right: HeldChord }
  | { kind: 'degree'; held: number; chord: HeldChord; choices: HoldChoice[]; answer: string }
  | { kind: 'chain'; held: number; bars: string[]; choices: HoldChoice[]; answer: string; drop: { sym: string } }
  | { kind: 'ways'; held: number; chips: { id: string; label: string; holds: boolean; deg: string | null }[] };

const TRIAD_Q: CtQ[] = ['M', 'm'];
const SEVENTH_Q: CtQ[] = ['maj7', 'm7', '7', 'm7b5'];
const DEG_POOL = ['1', '♭3', '3', '♭5', '5', '6', '♭7', 'maj7'];
const TENSION_POOL = ['9', '11', '13', '♭9', '♯9', '♯11', '♭13'];

/** Chords of the given qualities that do NOT hold the note (`strict`: not even as an available tension). */
function notHolding(rnd: () => number, held: number, quals: CtQ[], n: number, strict: boolean, avoid: Set<string>): { root: number; q: CtQ; sym: string }[] {
  const out: { root: number; q: CtQ; sym: string }[] = [];
  for (let guard = 0; out.length < n && guard < 400; guard++) {
    const root = Math.floor(rnd() * 12);
    const q = pickOf(rnd, quals);
    if (strict ? holdsNote(root, q, held) : has(root, q, held)) continue;
    const sym = symOf(root, q);
    if (avoid.has(sym)) continue;
    avoid.add(sym);
    out.push({ root, q, sym });
  }
  return out;
}

/** Item i of a run (a question; a board at ff). */
export function holdItem(seed: number, level: number, i: number): HoldQ {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const rnd = rng(itemSeed(seed, i) ^ 0x401d);
  const held = cycleKey(seed, i);
  if (lv <= 2) {
    const stage = lv === 1 ? 'triads' : 'sevenths';
    const [iv, q] = pickOf(rnd, LADDER[stage]);
    const right = spellHeld(held - iv, q, held)!;
    const wrong = notHolding(rnd, held, lv === 1 ? TRIAD_Q : SEVENTH_Q, 3, false, new Set([right.sym]));
    const choices = shuffled(rnd, [{ id: right.sym, label: right.sym }, ...wrong.map((w) => ({ id: w.sym, label: w.sym }))]);
    return { kind: 'which', held, choices, answer: right.sym, right };
  }
  if (lv <= 4) {
    const chord = lv === 3 ? pickOf(rnd, chordsHolding(held, SEVENTH_Q)) : (() => {
      const [iv, q] = pickOf(rnd, LADDER.tensions);
      return spellHeld(held - iv, q, held)!;
    })();
    const pool = (lv === 3 ? DEG_POOL : TENSION_POOL).filter((d) => d !== chord.degree);
    const choices = shuffled(rnd, [chord.degree, ...shuffled(rnd, pool).slice(0, 3)]).map((d) => ({ id: d, label: d }));
    return { kind: 'degree', held, chord, choices, answer: chord.degree };
  }
  if (lv === 5) {
    const holders = shuffled(rnd, chordsHolding(held, ['maj7', 'm7', '7', 'm7b5', '9', '13', '7#11']));
    const seen = new Set<string>();
    const keep: HeldChord[] = [];
    for (const h of holders) {
      if (keep.length >= 3) break;
      if (seen.has(h.sym)) continue;
      seen.add(h.sym);
      keep.push(h);
    }
    const drop = notHolding(rnd, held, SEVENTH_Q, 1, true, seen)[0];
    const at = Math.floor(rnd() * 4);
    const bars = keep.map((h) => h.sym);
    bars.splice(at, 0, drop.sym);
    return { kind: 'chain', held, bars, choices: bars.map((_, k) => ({ id: String(k), label: String(k + 1) })), answer: String(at), drop: { sym: drop.sym } };
  }
  // ff: 16 chips, at least 9 hold the note (chord tones or available tensions), the rest don't.
  const yes = shuffled(rnd, [...chordsHolding(held, ['maj7', 'm7', '7', 'm7b5', 'm6']), ...LADDER.tensions.map(([iv, q]) => spellHeld(held - iv, q, held)!)]);
  const seen = new Set<string>();
  const chips: { id: string; label: string; holds: boolean; deg: string | null }[] = [];
  for (const h of yes) {
    if (chips.length >= 9) break;
    const id = `${h.root}.${h.q}`;
    if (seen.has(id)) continue;
    seen.add(id);
    chips.push({ id, label: h.sym, holds: true, deg: h.degree });
  }
  const syms = new Set(chips.map((c) => c.label));
  for (const n of notHolding(rnd, held, ['maj7', 'm7', '7', 'm7b5'], 7, true, syms)) chips.push({ id: `${n.root}.${n.q}`, label: n.sym, holds: false, deg: null });
  return { kind: 'ways', held, chips: shuffled(rnd, chips) };
}

/** A chord played on the keys at ff: does it hold the note, and its id (root.quality) for "no repeats". */
export function playedWay(held: number, chord: { root: number; q: CtQ } | null): { id: string; holds: boolean; label: string; deg: string | null } | null {
  if (!chord) return null;
  const holds = holdsNote(chord.root, chord.q, held);
  const d = degreeIn(held - chord.root, chord.q);
  return { id: `${pc(chord.root)}.${chord.q}`, holds, label: symOf(chord.root, chord.q), deg: d?.label ?? null };
}

/** Speed bonus: × 1.5 within 2.5 s, falling to × 1 at 15 s. */
export const holdSpeed = (ms: number): number => 1 + 0.5 * Math.max(0, Math.min(1, 1 - (ms - 2500) / 12500));
export const holdPoints = (ms: number, level: number): number => Math.round(10 * holdSpeed(ms) * (1 + 0.1 * (level - 1)));

/** One line on a wrong answer ("Why?"). */
export function holdWhy(q: HoldQ, lang: 'en' | 'he'): string {
  const he = lang === 'he';
  const n = heldName(q.held);
  if (q.kind === 'which') return he ? `${n} הוא ה־${q.right.degree} של ${q.right.sym}.` : `${n} is the ${q.right.degree} of ${q.right.sym}.`;
  if (q.kind === 'degree') {
    const w = q.chord.held !== n ? (he ? ` (נכתב ${q.chord.held})` : ` (written ${q.chord.held})`) : '';
    return he ? `מעל ${q.chord.sym} ה־${n} הוא ${q.chord.degree}${w}.` : `Over ${q.chord.sym}, ${n} is the ${q.chord.degree}${w}.`;
  }
  if (q.kind === 'chain') return he ? `ב־${q.drop.sym} אין ${n} (צליל להימנע).` : `${q.drop.sym} has no ${n} (an avoid note).`;
  return '';
}

// ---------------------------------------------------------------- the run

export interface HoldSave {
  v: 1;
  game: 'holdnote';
  seed: number;
  tier?: DynName;
  level: number;
  /** Items finished (the current item's index). */
  i: number;
  lives: number;
  right: number;
  wrong: number;
  score: number;
  /** ff: the chips / played chords found on the current board. */
  found: string[];
  input: 'touch' | 'midi';
}
export const newHoldSave = (seed: number, level: number, input: 'touch' | 'midi', tier?: DynName): HoldSave => ({ v: 1, game: 'holdnote', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), i: 0, lives: HOLD_LIVES, right: 0, wrong: 0, score: 0, found: [], input, ...(tier ? { tier } : {}) });
export function isHoldSave(x: unknown): x is HoldSave {
  const s = x as HoldSave | null;
  return !!s && s.v === 1 && s.game === 'holdnote' && typeof s.seed === 'number' && typeof s.i === 'number' && s.lives > 0 && s.i < holdItems(s.level) && Array.isArray(s.found);
}
export const holdOver = (s: HoldSave): boolean => s.lives <= 0 || s.i >= holdItems(s.level);

/** Answer a question (pp–f): right → points by speed; wrong → a life. The run moves to the next item. */
export function holdAnswer(s: HoldSave, ok: boolean, ms: number): { save: HoldSave; gained: number } {
  const gained = ok ? holdPoints(ms, s.level) : 0;
  const lives = ok ? s.lives : s.lives - 1;
  return { save: { ...s, i: s.i + 1, lives, right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), score: s.score + gained }, gained };
}
/** One pick on an ff board (a chip id or a played chord id): new and holding → points; a repeat is ignored; else a life. */
export function holdPick(s: HoldSave, id: string, holds: boolean, ms: number): { save: HoldSave; result: 'new' | 'repeat' | 'wrong'; gained: number } {
  if (s.found.includes(id)) return { save: s, result: 'repeat', gained: 0 };
  if (!holds) return { save: { ...s, lives: s.lives - 1, wrong: s.wrong + 1 }, result: 'wrong', gained: 0 };
  const gained = holdPoints(ms, s.level);
  const found = [...s.found, id];
  const done = found.length >= HOLD_WAYS;
  return { save: { ...s, found: done ? [] : found, i: done ? s.i + 1 : s.i, right: s.right + 1, score: s.score + gained }, result: 'new', gained };
}
export function holdResult(s: HoldSave) {
  return { game: 'holdnote' as const, score: s.score, detail: { right: s.right, wrong: s.wrong, level: s.level, input: s.input, items: s.i, ...(s.tier ? { tier: s.tier } : {}) } };
}
