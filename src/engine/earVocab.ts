// By ear and from the page with the player's licks (docs/SPEC-EAR-AND-READING.md §3.1–§3.2; BUILD-PLAN-2026-11 phase 8):
//
// 1. "The combined sentence" (the owner's idea): two licks the player learned, A and B, joined into a NEW sentence —
//    A + a link note + B, over their chords — played back in the OTHER channel: learned from the page → the sentence
//    comes by ear; learned by ear → from the page. The debrief says which part was recognised (A, B) and which was new.
//    The "short new element" is ONE link note, by the owner's approach rule (SPEC-KEY-SESSION §1C: from below is always
//    a chromatic half step below the target) — a half step below B's first note. Nothing is composed.
// 2. Reverse recognition: hear a longer passage (lick A among two other licks of the library, joined the same way) and
//    tap when A appears. No playing at all.
// 3. Transpose by ear: the coach plays a lick in a key where it is closed; the player plays it in another key, notation
//    hidden (SPEC-EAR-AND-READING §3.1: "the coach plays a lick in E♭, and the player plays it in A♭ without notation").
//
// Conservative readings (the spec leaves them open): "learned" = closed in at least one key (SPEC-LICKS-IN-IMPROV §1's
// definition); the channel a lick was learned in = the channel of most of its takes (ear-* vs page-*); a mixed pair gets
// the player's weaker channel (§2.2: practise the weak one), unknown → by ear. Only 4/4 one-hand licks join. Pure.

import type { ItemState } from './drills/types';
import type { RatingEvent } from './rating';
import { lickBeats, LICK_KEYS, type Lick, type LickNote } from './licks';
import { closedKeys } from './vocab';

type L = { en: string; he: string };
const mod = (n: number) => ((n % 12) + 12) % 12;

/** A lick that can be joined: 4/4, one hand, with notes. */
export const joinable = (l: Lick): boolean => (l.meter ?? 4) === 4 && !l.lh?.length && l.notes.length >= 2 && !l.pickup;

/** Licks closed in at least one key (the pool's "learned"), joinable ones only. */
export function learnedLicks(pool: Lick[], items: Record<string, ItemState>): Lick[] {
  return pool.filter((l) => joinable(l) && closedKeys(items, l.id).length > 0);
}

/** The lick's items (as vocab.ts counts them: "lick:<id>:…", or a line's family items). */
function lickItems(items: Record<string, ItemState>, l: Lick): ItemState[] {
  const ids = l.src ? new Set(Array.from({ length: 12 }, (_, k) => l.src!.item.replace('{k}', String(k)))) : null;
  return Object.values(items).filter((s) => s.itemId?.startsWith(`lick:${l.id}:`) || (!!ids && ids.has(s.itemId)));
}

/** How a lick was learned: most of its takes by ear or from the page (null without channel data). */
export function learnedChannel(items: Record<string, ItemState>, l: Lick): 'ear' | 'page' | null {
  let ear = 0, page = 0;
  for (const s of lickItems(items, l)) {
    const c = s.channels ?? {};
    ear += (c['ear-fresh']?.n ?? 0) + (c['ear-known']?.n ?? 0);
    page += (c['page-sight']?.n ?? 0) + (c['page-known']?.n ?? 0);
  }
  if (!ear && !page) return null;
  return ear > page ? 'ear' : 'page';
}

/**
 * The channel the sentence comes in (the OTHER one): both from the page → by ear; both by ear → from the page; a mixed
 * pair → the player's weaker channel (`weak`: 'reading' → the page, 'ear' → by ear); unknown → by ear.
 */
export function sentenceChannel(a: 'ear' | 'page' | null, b: 'ear' | 'page' | null, weak: 'ear' | 'reading' | null = null): 'ear' | 'page' {
  if (a === 'page' && b === 'page') return 'ear';
  if (a === 'ear' && b === 'ear') return 'page';
  if (weak === 'reading') return 'page';
  return 'ear';
}

export interface Joined {
  lick: Lick;
  /** The parts in beats (for goal.sections and the debrief): each lick, and the link note between them. */
  parts: { from: number; to: number; name: L; kind: 'lick' | 'link'; id?: string }[];
}

const LINK_NAME: L = { en: 'the link note', he: 'צליל החיבור' };

/**
 * Licks joined one after another, each starting on a bar line, with ONE link note before each next lick: a half step
 * below its first note, on the last eighth before it (the approach rule). The earlier lick's last note is shortened to
 * make room; when it starts on that eighth itself, there is no link note.
 */
export function joinLicks(ls: Lick[], id: string, name: L): Joined {
  const notes: LickNote[] = [];
  const chords: Lick['chords'] = [];
  const parts: Joined['parts'] = [];
  let at = 0;
  ls.forEach((l, i) => {
    const len = Math.ceil(lickBeats(l) / 4 - 1e-6) * 4;
    if (i > 0) {
      const first = l.notes[0];
      const prev = notes[notes.length - 1];
      const linkAt = at - 0.5;
      if (prev && prev[1] < linkAt - 1e-6) {
        if (prev[1] + prev[2] > linkAt) notes[notes.length - 1] = [prev[0], prev[1], Math.max(0.25, linkAt - prev[1])];
        notes.push([first[0] - 1, linkAt, 0.5]);
        parts.push({ from: linkAt, to: at, name: LINK_NAME, kind: 'link' });
      }
    }
    for (const n of l.notes) notes.push([n[0], n[1] + at, n[2]]);
    const chordBeats = l.chords.reduce((a, c) => a + c[2], 0);
    l.chords.forEach((c, k) => chords.push([c[0], c[1], k === l.chords.length - 1 ? c[2] + Math.max(0, len - chordBeats) : c[2]]));
    // the lick's part ends where the next link note (if any) starts — filled in below
    parts.push({ from: at, to: at + len, name: l.name, kind: 'lick', id: l.id });
    at += len;
  });
  // a lick's part stops at the next link note
  for (let k = 0; k < parts.length - 1; k++) if (parts[k].kind === 'lick' && parts[k + 1].kind === 'link') parts[k] = { ...parts[k], to: parts[k + 1].from };
  const level = Math.max(...ls.map((l) => l.level));
  return {
    lick: { id, ctx: ls[0].ctx, level: Math.min(5, level), name, chords, notes, ...(ls.every((l) => l.straight) ? { straight: true } : {}) },
    parts,
  };
}

/** The combined sentence of A and B (its own id, so it never counts as either lick). */
export function combinedSentence(a: Lick, b: Lick): Joined {
  return joinLicks([a, b], `sent-${a.id}-${b.id}`, { en: `${a.name.en} + ${b.name.en}`, he: `${a.name.he} + ${b.name.he}` });
}

/** A small deterministic pick (a seed per day / per press). */
const pick = <T,>(xs: T[], seed: number): T => xs[Math.abs(seed) % xs.length];

/** Two different learned licks for today's sentence (null with fewer than two). */
export function pickPair(learned: Lick[], seed: number): [Lick, Lick] | null {
  if (learned.length < 2) return null;
  const a = pick(learned, seed);
  const rest = learned.filter((l) => l.id !== a.id);
  return [a, pick(rest, seed * 7 + 3)];
}

/** The debrief of a take: per part, the notes right of the notes in it (from the take's goal.sections result). */
export function sentenceDebrief(sections: { name: L; ok: number; total: number }[] | undefined, lang: 'he' | 'en'): { name: string; ok: number; total: number; known: boolean }[] {
  return (sections ?? []).map((s) => ({ name: s.name[lang], ok: s.ok, total: s.total, known: s.total > 0 && s.ok / s.total >= 0.8 }));
}

// ───────────────────────────── reverse recognition ─────────────────────────────

export interface Passage {
  joined: Joined;
  /** The beats where lick A sounds. */
  target: { from: number; to: number };
  targetId: string;
}

/** A passage of three licks with A in one of the three places (A from the learned licks, the others from `others`). */
export function passage(a: Lick, others: Lick[], seed: number): Passage | null {
  const pool = others.filter((l) => l.id !== a.id && joinable(l));
  if (pool.length < 2) return null;
  const x = pick(pool, seed + 1);
  const y = pick(pool.filter((l) => l.id !== x.id), seed * 5 + 2);
  const slot = Math.abs(seed) % 3;
  const ls = slot === 0 ? [a, x, y] : slot === 1 ? [x, a, y] : [x, y, a];
  const joined = joinLicks(ls, `find-${a.id}`, { en: 'Find the lick', he: 'מצאו את הליק' });
  const p = joined.parts.find((q) => q.kind === 'lick' && q.id === a.id)!;
  return { joined, target: { from: p.from, to: p.to }, targetId: a.id };
}

export interface FindResult {
  hit: boolean;
  /** Taps outside lick A. */
  wrong: number;
  score: number;
}
/** Taps (beats) graded: a tap while A sounds (or within a beat after it ends) finds it; each other tap costs a quarter. */
export function gradeFind(taps: number[], target: { from: number; to: number }): FindResult {
  const inA = (t: number) => t >= target.from - 0.25 && t <= target.to + 1;
  const hit = taps.some(inA);
  const wrong = taps.filter((t) => !inA(t)).length;
  return { hit, wrong, score: hit ? Math.max(0, 1 - 0.25 * wrong) : 0 };
}

/** The rated result of a recognition take: ear recognition of vocabulary (dictation), with the lick's vocabulary share. */
export function findEvents(a: Lick, r: FindResult, at: string, session: string): { evs: RatingEvent[]; xp: number } {
  const difficulty = Math.round(900 + a.level * 100);
  const evs: RatingEvent[] = [{ id: `g:find:${session}:${a.id}`, skill: 'dictation', difficulty, correct: r.hit && r.wrong === 0, score: Math.round(r.score * 1000) / 1000, tags: [{ skill: 'dictation', sub: 'dictation/recognise', w: 0.6 }, { skill: 'improv', sub: 'improv/vocab', w: 0.4 }], at }];
  return { evs, xp: r.hit ? (r.wrong ? 3 : 4) : 1 };
}

// ───────────────────────────── transpose by ear ─────────────────────────────

/**
 * Where to transpose: hear it in a key where it is closed (the first in the lick's key order), play it in the next key
 * of that order where it is not closed yet (a fourth up, the way ii–Vs move). Null when it is closed nowhere (nothing
 * to hear it "known" in) or everywhere.
 */
export function transposePlan(l: Lick, items: Record<string, ItemState>): { from: number; to: number } | null {
  const closed = closedKeys(items, l.id).map(mod);
  if (!closed.length || closed.length >= 12) return null;
  const from = LICK_KEYS.find((k) => closed.includes(k))!;
  const i = LICK_KEYS.indexOf(from);
  const to = [...LICK_KEYS.slice(i + 1), ...LICK_KEYS.slice(0, i)].find((k) => !closed.includes(k))!;
  return { from, to };
}
