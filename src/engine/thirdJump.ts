// Third Jump (docs/research/REHARM-AND-COLOR.md C.2 game; HARMONY-REHARM §3): chromatic mediants. A chord sounds with
// one of its notes glowing; jump to the mediant (same quality, a 3rd away) that keeps the glowing note. The chord you
// land on is the next chord, so a run is a chain of third jumps; a streak of right jumps builds the "film cue" (more
// points a jump). Answer fast: quick answers score more.
//
// Tiers: pp major triads · p major and minor triads · mp + "which jump keeps nothing?" (the doubly chromatic mediant) ·
// mf by ear: the jump sounds, name where it went · f the glowing note's degree in the chord it lands on · ff play the
// jump on a MIDI keyboard (the glowing note stays). Theory: commonTone.ts (mediantsOf, commonTones, doublyChromatic).
// Every 5th jump starts a fresh chain on the next key of the cycle of 4ths from a random start (all 12 keys). Pure.

import { MEDIANT_MOVES, commonTones, doublyChromatic, letterOf, mediantsOf, mod12, onLetter, rootName, sharpKey, triadPcs, type Triad } from './commonTone';
import { cycleKey, itemSeed, pickOf, rng, shuffled } from './newGamesKit';
import type { DynName } from './courseSocial';

export const JUMP_ITEMS = 10;
export const JUMP_LIVES = 3;
/** Right jumps in a row for a full film cue. */
export const JUMP_CUE = 8;
export const jumpLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

/** A triad with its spelled name. */
export interface JChord extends Triad {
  name: string;
  /** The spelled root (for spelling the next jump and the glowing note). */
  rootName: string;
}
export interface JChoice {
  id: string;
  label: string;
}
export type JumpQ =
  | { kind: 'keep'; from: JChord; glow: number; glowName: string; choices: JChoice[]; answer: string; to: JChord }
  | { kind: 'none'; from: JChord; choices: JChoice[]; answer: string; to: JChord }
  | { kind: 'ear'; from: JChord; to: JChord; common: number; choices: JChoice[]; answer: string }
  | { kind: 'degree'; from: JChord; to: JChord; glow: number; glowName: string; choices: JChoice[]; answer: string };

export const chordId = (t: Triad): string => `${mod12(t.root)}${t.minor ? 'm' : ''}`;
const UGLY = new Set(['B♯', 'E♯', 'C♭', 'F♭']);
const accs = (n: string): number => [...n.slice(1)].filter((c) => c === '♭' || c === '♯').length + (n.includes('𝄪') ? 2 : 0);

/** A chord to start a chain from: its key's spelling (minor chords by their relative major). */
export function startChord(root: number, minor: boolean): JChord {
  const r = mod12(root);
  const rn = r === 6 ? 'F♯' : rootName(r, !sharpKey(minor ? r + 3 : r));
  return { root: r, minor, rootName: rn, name: rn + (minor ? 'm' : '') };
}
/** A chord a 3rd from `from`: its root written on the letter a 3rd away (C → E, A♭; A → C♯, F), never a double accidental. */
export function spellJump(from: JChord, to: Triad): JChord {
  const d = mod12(to.root - from.root);
  const steps = d === 3 || d === 4 ? 2 : d === 8 || d === 9 ? -2 : d === 0 ? 0 : null;
  let rn = steps === null ? null : onLetter(to.root, letterOf(from.rootName) + steps);
  if (!rn || accs(rn) >= 2 || UGLY.has(rn)) rn = startChord(to.root, to.minor).rootName;
  return { root: mod12(to.root), minor: to.minor, rootName: rn, name: rn + (to.minor ? 'm' : '') };
}
/** A note of a triad, spelled from the chord's root letter (root, 3rd, 5th). */
export function toneName(c: JChord, p: number): string {
  const i = triadPcs(c).indexOf(mod12(p));
  const n = i < 0 ? null : onLetter(p, letterOf(c.rootName) + [0, 2, 4][i]);
  return n && accs(n) < 2 ? n : rootName(p, !sharpKey(c.root));
}
/** The degree of a pitch class in a triad ('1', '3' / '♭3', '5'), or null. */
export function degreeOf(c: Triad, p: number): string | null {
  const i = mod12(p - c.root);
  return i === 0 ? '1' : i === 4 && !c.minor ? '3' : i === 3 && c.minor ? '♭3' : i === 7 ? '5' : null;
}
/** Which way the jump went (up / down a major or minor 3rd), or null when `to` is not a chromatic mediant of `from`. */
export function moveOf(from: Triad, to: Triad): (typeof MEDIANT_MOVES)[number] | null {
  if (from.minor !== to.minor) return null;
  return MEDIANT_MOVES.find((m) => mod12(from.root + m.d) === mod12(to.root)) ?? null;
}

const asChoice = (c: JChord): JChoice => ({ id: chordId(c), label: c.name });

/** One jump from `from` (the chain's current chord). */
function makeItem(rnd: () => number, from: JChord, lv: number, i: number): JumpQ {
  const meds = mediantsOf(from).map((t) => spellJump(from, t));
  const dbl = doublyChromatic(from).map((t) => spellJump(from, t));
  if (lv === 3 && i % 3 === 2) {
    // which jump keeps nothing: one doubly chromatic mediant among the three mediants that keep a note
    const to = pickOf(rnd, dbl);
    const others = shuffled(rnd, meds).slice(0, 3);
    return { kind: 'none', from, to, answer: chordId(to), choices: shuffled(rnd, [to, ...others]).map(asChoice) };
  }
  if (lv === 4) {
    const to = pickOf(rnd, meds);
    return { kind: 'ear', from, to, common: commonTones(from, to)[0], answer: chordId(to), choices: shuffled(rnd, meds).map(asChoice) };
  }
  if (lv === 5 && i % 2 === 0) {
    const to = pickOf(rnd, meds);
    const glow = commonTones(from, to)[0];
    const deg = degreeOf(to, glow)!;
    const pool = ['1', to.minor ? '♭3' : '3', '5', to.minor ? '3' : '♭3'];
    return { kind: 'degree', from, to, glow, glowName: toneName(from, glow), answer: deg, choices: shuffled(rnd, pool).map((d) => ({ id: d, label: d })) };
  }
  // keep: the glowing note is one of the chord's tones; one mediant keeps it among three that don't
  const glow = pickOf(rnd, triadPcs(from));
  const keepers = meds.filter((m) => triadPcs(m).includes(glow));
  const to = pickOf(rnd, keepers);
  const losers = meds.filter((m) => !triadPcs(m).includes(glow));
  const extra = shuffled(rnd, dbl).slice(0, Math.max(0, 3 - losers.length));
  return { kind: 'keep', from, glow, glowName: toneName(from, glow), to, answer: chordId(to), choices: shuffled(rnd, [to, ...losers, ...extra]).map(asChoice) };
}

const chains = new Map<string, JumpQ[]>();
/** The run's chain: each jump starts where the last one landed; every 5th jump starts fresh on the next key. */
export function jumpChain(seed: number, level: number): JumpQ[] {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const k = `${seed >>> 0}:${lv}`;
  const hit = chains.get(k);
  if (hit) return hit;
  const out: JumpQ[] = [];
  let from: JChord | null = null;
  for (let i = 0; i < JUMP_ITEMS; i++) {
    const rnd = rng(itemSeed(seed, i) ^ 0x3d1a);
    if (!from || i % 5 === 0) from = startChord(cycleKey(seed, i), lv >= 2 && rnd() < 0.5);
    const q = makeItem(rnd, from, lv, i);
    out.push(q);
    from = q.to;
  }
  if (chains.size > 40) chains.clear();
  chains.set(k, out);
  return out;
}
export const jumpItem = (seed: number, level: number, i: number): JumpQ => jumpChain(seed, level)[Math.max(0, Math.min(JUMP_ITEMS - 1, i))];

/** A chord played on the keys at ff: right when it is the target triad (root and quality) and it keeps the glowing note. */
export function playedJump(q: JumpQ, chord: { root: number; q: string } | null): boolean {
  if (!chord || q.kind !== 'keep') return false;
  const minor = chord.q === 'm' || chord.q === 'm7' || chord.q === 'm6';
  const major = chord.q === 'M' || chord.q === 'maj7' || chord.q === '6' || chord.q === '7';
  if (!minor && !major) return false;
  return mod12(chord.root) === q.to.root && minor === q.to.minor;
}

/** Speed bonus: × 1.5 within 2.5 s, falling to × 1 at 12 s. */
export const jumpSpeed = (ms: number): number => 1 + 0.5 * Math.max(0, Math.min(1, 1 - (ms - 2500) / 9500));
/** The film cue: × 1.2 from 3 right jumps in a row, × 1.5 from 6. */
export const filmCue = (streak: number): number => (streak >= 6 ? 1.5 : streak >= 3 ? 1.2 : 1);
export const jumpPoints = (ms: number, level: number, streak: number): number => Math.round(10 * jumpSpeed(ms) * (1 + 0.1 * (level - 1)) * filmCue(streak));

/** One line on a wrong answer ("Why?"). */
export function jumpWhy(q: JumpQ, lang: 'en' | 'he'): string {
  const he = lang === 'he';
  const mv = moveOf(q.from, q.to);
  const way = mv ? mv.name[lang] : '';
  if (q.kind === 'keep') return he ? `${q.to.name} (${way}) שומר על ${q.glowName}.` : `${q.to.name} (${way}) keeps ${q.glowName}.`;
  if (q.kind === 'none') return he ? `${q.from.name} ו־${q.to.name} בלי צליל משותף: מדיאנטה כרומטית כפולה.` : `${q.from.name} and ${q.to.name} share no note: a doubly chromatic mediant.`;
  if (q.kind === 'ear') return he ? `${q.to.name}: ${way}, ${toneName(q.from, q.common)} נשאר.` : `${q.to.name}: ${way}, ${toneName(q.from, q.common)} stays.`;
  return he ? `ב־${q.to.name} ה־${q.glowName} הוא ${q.answer}.` : `In ${q.to.name}, ${q.glowName} is the ${q.answer}.`;
}

// ---------------------------------------------------------------- the run

export interface JumpSave {
  v: 1;
  game: 'thirdjump';
  seed: number;
  tier?: DynName;
  level: number;
  i: number;
  lives: number;
  right: number;
  wrong: number;
  score: number;
  streak: number;
  bestStreak: number;
  input: 'touch' | 'midi';
  /** ff on MIDI: one take per jump (its starting chord's root and 100 / 0) for key mastery. */
  takes: { key: number; acc: number }[];
}
export const newJumpSave = (seed: number, level: number, input: 'touch' | 'midi', tier?: DynName): JumpSave => ({
  v: 1,
  game: 'thirdjump',
  seed: seed >>> 0,
  level: Math.max(1, Math.min(6, level)),
  i: 0,
  lives: JUMP_LIVES,
  right: 0,
  wrong: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  input,
  takes: [],
  ...(tier ? { tier } : {}),
});
export function isJumpSave(x: unknown): x is JumpSave {
  const s = x as JumpSave | null;
  return !!s && s.v === 1 && s.game === 'thirdjump' && typeof s.seed === 'number' && typeof s.i === 'number' && s.lives > 0 && s.i < JUMP_ITEMS && Array.isArray(s.takes);
}
export const jumpOver = (s: JumpSave): boolean => s.lives <= 0 || s.i >= JUMP_ITEMS;

/** Answer a jump: right → points (speed × film cue), the streak grows; wrong → a life, the streak resets. `played`: by MIDI. */
export function jumpAnswer(s: JumpSave, ok: boolean, ms: number, played = false): { save: JumpSave; gained: number } {
  const streak = ok ? s.streak + 1 : 0;
  const gained = ok ? jumpPoints(ms, s.level, streak) : 0;
  const q = jumpItem(s.seed, s.level, s.i);
  const takes = played ? [...s.takes, { key: q.from.root, acc: ok ? 100 : 0 }] : s.takes;
  return {
    save: { ...s, i: s.i + 1, lives: ok ? s.lives : s.lives - 1, right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), score: s.score + gained, streak, bestStreak: Math.max(s.bestStreak, streak), takes },
    gained,
  };
}
export function jumpResult(s: JumpSave) {
  return {
    game: 'thirdjump' as const,
    score: s.score,
    detail: { right: s.right, wrong: s.wrong, level: s.level, input: s.input, items: s.i, best: s.bestStreak, ...(s.tier ? { tier: s.tier } : {}), ...(s.takes.length ? { keyInst: 'piano', keyTakes: s.takes.map((t) => ({ ...t, bpm: 0 })) } : {}) },
  };
}
