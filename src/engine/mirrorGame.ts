// Mirror (מראה): a speed game for negative harmony. A major key is shown with its axis (between the minor and the
// major 3rd of the tonic, and across the octave between ♮6 and ♭7); a note, chord or cadence sounds and is shown; tap
// its mirror image as fast as you can. Rounds speed up; three lives.
//
// Theory (the same rule as topicsHarmony3.ts `mirror`, docs: Ernst Levy's negative harmony): relative to the tonic a
// note n semitones up mirrors to 7 − n (mod 12) — in C, C ↔ G, D ↔ F, E ↔ E♭, A ↔ B♭, B ↔ A♭. Letters mirror the same
// way (scale step s ↔ 4 − s: 1 ↔ 5, 2 ↔ 4, 3 ↔ ♭3, 6 ↔ ♭7, 7 ↔ ♭6), so every mirrored note keeps a correct spelling.
// A chord mirrors note by note; its mirror is named by its notes (G7 → C A♭ F D = Fm6, Dm7 → Gm7, Cmaj7 → A♭maj7,
// Bø7 → B♭7). In a cadence the pre-tonic chords mirror and the tonic stays major (how players use it: Dm7 G7 → C
// becomes Gm7 Fm6 → C).
//
// Tiers: pp notes in C, G, F (the scale's seven) · p any note, eight keys · mp diatonic triads · mf diatonic 7th
// chords · f whole cadences (V7–I, ii–V–I, IV–V–I, vi–ii–V–I) · ff everything, mixed, faster. Pure.

import { itemSeed, pc, pickOf, rng, shuffled } from './newGamesKit';
import type { DynName } from './courseSocial';

export const MIRROR_ITEMS = 12;
export const MIRROR_LIVES = 3;
export const mirrorLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

// ---------------------------------------------------------------- spelling

const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LET_PC = [0, 2, 4, 5, 7, 9, 11];
/** A spelled note: letter index and accidental (−1 flat … +1 sharp). */
export interface Sp {
  l: number;
  a: number;
}
const accOf = (p: number, l: number) => {
  let a = pc(p - LET_PC[l]);
  if (a > 6) a -= 12;
  return a;
};
export const spPc = (s: Sp) => pc(LET_PC[s.l] + s.a);
export const spName = (s: Sp) => LET[s.l] + (['𝄫', '♭', '', '♯', '𝄪'][s.a + 2] ?? '?');
const UGLY = new Set(['B♯', 'E♯', 'C♭', 'F♭']);
/** A name players read without stopping: one accidental at most, no B♯ / E♯ / C♭ / F♭. */
export const niceName = (n: string) => !UGLY.has(n) && !/𝄫|𝄪|\?/.test(n) && [...n].filter((c) => c === '♭' || c === '♯').length <= 1;

/** The keys (major): each one's mirror chords spell without double flats or C♭ / F♭ (tests check every item). */
export const MIRROR_KEYS: { pc: number; sp: Sp }[] = [
  { pc: 0, sp: { l: 0, a: 0 } }, // C
  { pc: 7, sp: { l: 4, a: 0 } }, // G
  { pc: 5, sp: { l: 3, a: 0 } }, // F
  { pc: 2, sp: { l: 1, a: 0 } }, // D
  { pc: 10, sp: { l: 6, a: -1 } }, // B♭
  { pc: 9, sp: { l: 5, a: 0 } }, // A
  { pc: 4, sp: { l: 2, a: 0 } }, // E
  { pc: 11, sp: { l: 6, a: 0 } }, // B
];
/** A note `semis` above the tonic, written `step` letters above it. */
const rel = (k: Sp, semis: number, step: number): Sp => {
  const l = (((k.l + step) % 7) + 7) % 7;
  return { l, a: accOf(spPc(k) + semis, l) };
};
/** Relative position of a spelled note in a key: semitones and letter steps above the tonic. */
const posOf = (k: Sp, s: Sp) => ({ semis: pc(spPc(s) - spPc(k)), step: (((s.l - k.l) % 7) + 7) % 7 });
/** The mirror of a spelled note in a key: 7 − semis, 4 − steps. */
export function mirrorSp(k: Sp, s: Sp): Sp {
  const p = posOf(k, s);
  return rel(k, 7 - p.semis, 4 - p.step);
}
/** The plain mirror of a pitch class around a key's axis (the same as topicsHarmony3 `mirror`). */
export const mirrorPc = (key: number, p: number) => pc(2 * key + 7 - p);

// ---------------------------------------------------------------- chords

export type MQ = 'maj' | 'm' | 'dim' | 'maj7' | 'm7' | '7' | 'm7b5' | 'm6';
const Q: Record<MQ, { iv: number[]; st: number[]; sym: string }> = {
  maj7: { iv: [0, 4, 7, 11], st: [0, 2, 4, 6], sym: 'maj7' },
  m7: { iv: [0, 3, 7, 10], st: [0, 2, 4, 6], sym: 'm7' },
  '7': { iv: [0, 4, 7, 10], st: [0, 2, 4, 6], sym: '7' },
  m6: { iv: [0, 3, 7, 9], st: [0, 2, 4, 5], sym: 'm6' },
  m7b5: { iv: [0, 3, 6, 10], st: [0, 2, 4, 6], sym: 'm7♭5' },
  maj: { iv: [0, 4, 7], st: [0, 2, 4], sym: '' },
  m: { iv: [0, 3, 7], st: [0, 2, 4], sym: 'm' },
  dim: { iv: [0, 3, 6], st: [0, 2, 4], sym: '°' },
};
/** The order a mirrored set is named in (a 4-note set that is both m6 and m7♭5 reads as m6: G7's mirror is iv6). */
const NAME_ORDER: MQ[] = ['maj7', 'm7', '7', 'm6', 'm7b5', 'maj', 'm', 'dim'];
export interface MChord {
  root: Sp;
  q: MQ;
  /** Spelled notes, root first. */
  tones: Sp[];
  name: string;
}
export function chordOf(root: Sp, q: MQ): MChord {
  const tones = Q[q].iv.map((iv, i) => {
    const l = (root.l + Q[q].st[i]) % 7;
    return { l, a: accOf(spPc(root) + iv, l) };
  });
  return { root, q, tones, name: spName(root) + Q[q].sym };
}
export const chordPcs = (c: MChord) => c.tones.map(spPc);
/** Name a set of spelled notes as a chord (root among the notes), in NAME_ORDER. */
export function nameSet(tones: Sp[]): MChord | null {
  const pcs = new Set(tones.map(spPc));
  for (const q of NAME_ORDER) {
    if (Q[q].iv.length !== pcs.size) continue;
    for (const t of tones) {
      if (Q[q].iv.every((iv) => pcs.has(pc(spPc(t) + iv)))) return chordOf(t, q);
    }
  }
  return null;
}
/** The mirror of a chord in a key: every note mirrored, then named by its notes. */
export function mirrorChord(k: Sp, c: MChord): MChord {
  const m = nameSet(c.tones.map((t) => mirrorSp(k, t)));
  if (!m) throw new Error(`no name for the mirror of ${c.name}`);
  return m;
}

/** A diatonic chord of the major key: degree (semitones, letter steps) and quality. */
interface Deg {
  rn: string;
  semis: number;
  step: number;
  q: MQ;
}
const TRIADS: Deg[] = [
  { rn: 'I', semis: 0, step: 0, q: 'maj' },
  { rn: 'ii', semis: 2, step: 1, q: 'm' },
  { rn: 'iii', semis: 4, step: 2, q: 'm' },
  { rn: 'IV', semis: 5, step: 3, q: 'maj' },
  { rn: 'V', semis: 7, step: 4, q: 'maj' },
  { rn: 'vi', semis: 9, step: 5, q: 'm' },
  { rn: 'vii°', semis: 11, step: 6, q: 'dim' },
];
const SEVENTHS: Deg[] = [
  { rn: 'Imaj7', semis: 0, step: 0, q: 'maj7' },
  { rn: 'ii7', semis: 2, step: 1, q: 'm7' },
  { rn: 'iii7', semis: 4, step: 2, q: 'm7' },
  { rn: 'IVmaj7', semis: 5, step: 3, q: 'maj7' },
  { rn: 'V7', semis: 7, step: 4, q: '7' },
  { rn: 'vi7', semis: 9, step: 5, q: 'm7' },
  { rn: 'viiø7', semis: 11, step: 6, q: 'm7b5' },
];
const deg = (rn: string) => [...TRIADS, ...SEVENTHS].find((d) => d.rn === rn)!;
/** The cadences of tier f: the chords before the tonic (the tonic stays I in the mirror). */
export const CADENCES: { id: string; chords: string[] }[] = [
  { id: 'V7-I', chords: ['V7'] },
  { id: 'ii-V-I', chords: ['ii7', 'V7'] },
  { id: 'IV-V-I', chords: ['IV', 'V7'] },
  { id: 'vi-ii-V-I', chords: ['vi7', 'ii7', 'V7'] },
];
const chordAt = (k: Sp, d: Deg) => chordOf(rel(k, d.semis, d.step), d.q);
/** The quality a near-miss answer swaps in (the mirror's root with the wrong colour). */
const ALT_Q: Record<MQ, MQ> = { maj: 'm', m: 'maj', dim: 'm', maj7: '7', m7: '7', '7': 'maj7', m7b5: 'm7', m6: 'm7' };
/** A second near miss (a one-chord cadence needs it to fill four options). */
const ALT_Q2: Record<MQ, MQ> = { maj: 'maj7', m: 'm7', dim: 'm7b5', maj7: 'maj', m7: 'm6', '7': 'm7', m7b5: '7', m6: '7' };

// ---------------------------------------------------------------- items

export type MirrorKind = 'note' | 'triad' | 'seventh' | 'cadence';
export interface MirrorChoice {
  id: string;
  label: string;
}
export interface MirrorItem {
  kind: MirrorKind;
  /** The key: tonic pitch class and its spelling. */
  key: number;
  keyName: string;
  /** The two sides of the axis, spelled (♭3 | 3) and across the octave (6 | ♭7). */
  axis: [string, string];
  axis2: [string, string];
  /** What sounds (note: one pitch class; chords: their notes in order) and its label. */
  src: { label: string; pcs: number[]; chords?: { root: number; pcs: number[] }[] };
  /** The mirror (for the reveal and the sound). */
  mir: { label: string; pcs: number[]; chords?: { root: number; pcs: number[] }[] };
  /** Tonic chord name (a cadence lands on it). */
  tonic: string;
  answer: string;
  /** Chord / cadence options; a note is answered on the keyboard (ids `n0` … `n11`, pitch classes). */
  choices: MirrorChoice[];
  /** Note names of the keyboard cells, from the tonic up (12). */
  cells: string[];
}

/** The kind each tier asks; ff rotates through all four. */
export const kindOf = (level: number, i: number): MirrorKind => {
  if (level >= 6) return (['note', 'triad', 'seventh', 'cadence'] as MirrorKind[])[i % 4];
  return (['note', 'note', 'note', 'triad', 'seventh', 'cadence'] as MirrorKind[])[Math.max(1, Math.min(5, level))];
};
/** The chromatic degrees (semitones, letter steps) a note can sit on; ♯4 falls back to ♭5 where ♯4 reads badly. */
const CHROM: [number, number][] = [[0, 0], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4], [8, 5], [9, 5], [10, 6], [11, 6]];
const DIATONIC = [0, 2, 4, 5, 7, 9, 11];
function cellName(k: Sp, semis: number): string {
  const [s, st] = CHROM[semis];
  const a = spName(rel(k, s, st));
  if (niceName(a)) return a;
  // ♭2 / ♭3 / ♭6 / ♭7 that read badly are written as the sharp of the letter below; ♯4 as ♭5
  const alt = spName(rel(k, s, semis === 6 ? 4 : st - 1));
  return niceName(alt) ? alt : a;
}

const keysFor = (level: number) => (level <= 1 ? MIRROR_KEYS.slice(0, 3) : MIRROR_KEYS);
/** The key of round i: a new key every 4 rounds, rotating from a seeded start. */
export function keyOf(seed: number, level: number, i: number) {
  const ks = keysFor(level);
  const start = Math.floor(rng(seed ^ 0x2f6b1)() * ks.length);
  return ks[(start + Math.floor(i / 4)) % ks.length];
}

const asPlay = (c: MChord) => ({ root: spPc(c.root), pcs: chordPcs(c) });

export function mirrorItem(seed: number, level: number, i: number): MirrorItem {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const rnd = rng(itemSeed(seed, i) ^ 0x6a09e667);
  const K = keyOf(seed, lv, i);
  const k = K.sp;
  const kind = kindOf(lv, i);
  const cells = Array.from({ length: 12 }, (_, s) => cellName(k, s));
  const base = {
    kind,
    key: K.pc,
    keyName: spName(k),
    axis: [spName(rel(k, 3, 2)), spName(rel(k, 4, 2))] as [string, string],
    axis2: [spName(rel(k, 9, 5)), spName(rel(k, 10, 6))] as [string, string],
    tonic: spName(k),
    cells,
  };
  if (kind === 'note') {
    const pool = lv <= 1 ? DIATONIC : CHROM.map((_, s) => s);
    const semis = pickOf(rnd, pool);
    const m = pc(7 - semis);
    return {
      ...base,
      src: { label: cells[semis], pcs: [pc(K.pc + semis)] },
      mir: { label: cells[m], pcs: [pc(K.pc + m)] },
      answer: `n${pc(K.pc + m)}`,
      choices: [],
    };
  }
  if (kind === 'triad' || kind === 'seventh') {
    const set = kind === 'triad' ? TRIADS : SEVENTHS;
    const d = pickOf(rnd, set);
    const src = chordAt(k, d);
    const mir = mirrorChord(k, src);
    const near = chordOf(mir.root, ALT_Q[mir.q]);
    const others = shuffled(rnd, set.filter((x) => x !== d).map((x) => mirrorChord(k, chordAt(k, x))));
    const opts: MChord[] = [mir];
    for (const c of [near, ...others, src]) if (opts.length < 4 && !opts.some((o) => o.name === c.name)) opts.push(c);
    return {
      ...base,
      src: { label: src.name, pcs: chordPcs(src), chords: [asPlay(src)] },
      mir: { label: mir.name, pcs: chordPcs(mir), chords: [asPlay(mir)] },
      answer: mir.name,
      choices: shuffled(rnd, opts).map((c) => ({ id: c.name, label: c.name })),
    };
  }
  // cadence: the chords before the tonic mirror; the tonic stays major
  const cad = pickOf(rnd, CADENCES);
  const src = cad.chords.map((rn) => chordAt(k, deg(rn)));
  const mir = src.map((c) => mirrorChord(k, c));
  const lab = (cs: MChord[]) => cs.map((c) => c.name).join(' · ');
  const cands: string[] = [lab(mir)];
  const add = (cs: MChord[]) => {
    const l = lab(cs);
    if (cands.length < 4 && !cands.includes(l)) cands.push(l);
  };
  if (mir.length > 1) add([...mir].reverse());
  mir.forEach((_, j) => add(mir.map((c, x) => (x === j ? chordOf(c.root, ALT_Q[c.q]) : c))));
  add(src);
  mir.forEach((_, j) => add(mir.map((c, x) => (x === j ? chordOf(c.root, ALT_Q2[c.q]) : c))));
  const tonic = chordOf(k, 'maj');
  return {
    ...base,
    src: { label: lab(src), pcs: src.flatMap(chordPcs), chords: [...src, tonic].map(asPlay) },
    mir: { label: lab(mir), pcs: mir.flatMap(chordPcs), chords: [...mir, tonic].map(asPlay) },
    answer: lab(mir),
    choices: shuffled(rnd, cands).map((l) => ({ id: l, label: l })),
  };
}

// ---------------------------------------------------------------- speed and points

const BASE_MS: Record<MirrorKind, number> = { note: 6500, triad: 8000, seventh: 9000, cadence: 12000 };
/** The time a round allows: shorter every round (× 0.95), down to 55 % of the kind's base; ff runs 15 % tighter. */
export function roundMs(level: number, i: number): number {
  const kind = kindOf(level, i);
  const b = BASE_MS[kind] * (level >= 6 ? 0.85 : level <= 1 ? 1.1 : 1);
  return Math.round(b * Math.max(0.55, 0.95 ** i));
}
/** Points for a right answer: 10, up to × 2 for an instant answer, × the tier (pp 1.0 … ff 1.5). */
export const mirrorPoints = (ms: number, limit: number, level: number): number =>
  Math.round(10 * (1 + Math.max(0, Math.min(1, 1 - ms / Math.max(1, limit)))) * (1 + 0.1 * (level - 1)));

/** One line under a wrong answer ("Why?"). */
export function mirrorWhy(q: MirrorItem, lang: 'en' | 'he'): string {
  const ax = `${q.axis[0]}|${q.axis[1]}`;
  if (lang === 'he') return q.kind === 'note' ? `${q.src.label} ↔ ${q.mir.label}: באותו מרחק מהציר ${ax}.` : `${q.src.label} ↔ ${q.mir.label}: כל צליל משתקף סביב ${ax}.`;
  return q.kind === 'note' ? `${q.src.label} ↔ ${q.mir.label}: the same distance from the axis ${ax}.` : `${q.src.label} ↔ ${q.mir.label}: every note mirrors around ${ax}.`;
}

// ---------------------------------------------------------------- the run

export interface MirrorSave {
  v: 1;
  game: 'mirror';
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
}
export const newMirrorSave = (seed: number, level: number, tier?: DynName): MirrorSave => ({
  v: 1,
  game: 'mirror',
  seed: seed >>> 0,
  level: Math.max(1, Math.min(6, level)),
  i: 0,
  lives: MIRROR_LIVES,
  right: 0,
  wrong: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  ...(tier ? { tier } : {}),
});
export function isMirrorSave(x: unknown): x is MirrorSave {
  const s = x as MirrorSave | null;
  return !!s && s.v === 1 && s.game === 'mirror' && typeof s.seed === 'number' && typeof s.i === 'number' && s.lives > 0 && s.i < MIRROR_ITEMS;
}
export const mirrorOver = (s: MirrorSave): boolean => s.lives <= 0 || s.i >= MIRROR_ITEMS;

/** Answer a round (`id` null = the time ran out): right → points by speed; wrong or late → a life. */
export function mirrorAnswer(s: MirrorSave, id: string | null, ms: number): { save: MirrorSave; ok: boolean; gained: number } {
  const q = mirrorItem(s.seed, s.level, s.i);
  const limit = roundMs(s.level, s.i);
  const ok = id !== null && id === q.answer && ms <= limit;
  const gained = ok ? mirrorPoints(ms, limit, s.level) : 0;
  const streak = ok ? s.streak + 1 : 0;
  return {
    save: { ...s, i: s.i + 1, lives: ok ? s.lives : s.lives - 1, right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), score: s.score + gained, streak, bestStreak: Math.max(s.bestStreak, streak) },
    ok,
    gained,
  };
}
export function mirrorResult(s: MirrorSave) {
  return { game: 'mirror' as const, score: s.score, detail: { right: s.right, wrong: s.wrong, level: s.level, items: s.i, best: s.bestStreak, ...(s.tier ? { tier: s.tier } : {}) } };
}
