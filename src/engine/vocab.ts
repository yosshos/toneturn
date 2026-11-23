// The player's vocabulary in improvisation (docs/SPEC-LICKS-IN-IMPROV.md, BUILD-PLAN-2026-11 §0.2; owner 2026-11-22):
// - the pool: every lick played at all (any take) — library licks and the player's own; it enters Improvise's lick
//   cards and "today's lick" at once (and Technique's language block);
// - the usage log: each clean use found in an improvisation (the lick, its key, exact / varied / shape, via a tritone
//   sub), kept in the lick book (bounded);
// - "in my language": used in improvisation in at least 3 different sessions and at least 2 keys;
// - a clean use counts as a successful spaced review once the lick is closed in one key (before that it is practice);
// - XP per use: full, then half, then nothing for the same lick again in one chorus; more for a new key or a variation.
// Pure.

import type { ItemState } from './drills/types';
import { dueLicks, LICKS, lickById, lineLicks, type Lick, type LickBook } from './licks';
import { findLick, LICK_TIMING_TOL, qualityOfIntervals, type ImpNote, type LickHit } from './lickDetect';
import { itemStatus } from './drills/itemStatus';

export interface LickUse {
  id: string;
  key: number;
  kind: LickHit['kind'];
  viaSub?: boolean;
  at: string;
  session: string;
  /** The chart chord it was found over (its symbol, e.g. "D7"; SPEC-LICKS-IN-IMPROV §6). */
  chord?: string;
  /** Where it was found in the take (beats from the chart's first beat) — for the bar mark; not kept in the log. */
  beat?: number;
  /** The beat of its last note (the debrief replays beat … end from the take); not kept in the log. */
  end?: number;
  /** An approach cell: the chord tone it targeted (semitones above the chord's root); not kept in the log. */
  deg?: number;
}

// ───────────────────────────── the approach licks as cells ─────────────────────────────

const cellLick = (n: 1 | 2 | 3, en: string, he: string, line: [number, number, number][]): Lick => ({ id: `ap-${n}`, ctx: 'free', level: n, name: { en, he }, chords: [[0, 'maj7', 4]], notes: line, cell: n });
/** The owner's approach licks (k-keylick, keyLicks.ts) as cells, shown in C before the root (SPEC-LICKS-IN-IMPROV §1). */
export const APPROACH_CELLS: Lick[] = [
  cellLick(1, 'Approach lick 1', 'ליק גישה 1', [[-1, 0, 0.5], [0, 0.5, 0.5]]),
  cellLick(2, 'Approach lick 2 (the enclosure)', 'ליק גישה 2 (כיתור)', [[-1, 0, 0.5], [2, 0.5, 0.5], [0, 1, 0.5]]),
  cellLick(3, 'Approach lick 3 (the long enclosure)', 'ליק גישה 3 (הכיתור הארוך)', [[-1, 0, 0.5], [2, 0.5, 0.5], [1, 1, 0.5], [-1, 1.5, 0.5], [0, 2, 0.5]]),
];
/** The k-keylick items of a cell (lick 2 = both enclosures). */
const cellItem = (n: 1 | 2 | 3, itemId: string | undefined): boolean => !!itemId && (n === 2 ? itemId.startsWith('k-keylick:kl-2') : itemId.startsWith(`k-keylick:kl-${n}-`));

/** The lick items of one lick: "lick:<id>:<key>…" (licks.ts lickDrill item ids start so); a line of a technique family
 *  also owns its family items on the piano (its item id with any key: one progress, phase 4). */
function itemsOfLick(items: Record<string, ItemState>, id: string): ItemState[] {
  const cell = APPROACH_CELLS.find((c) => c.id === id)?.cell;
  if (cell) return Object.values(items).filter((s) => cellItem(cell, s.itemId));
  const line = id.startsWith('ln-') ? lickById(id)?.src : undefined;
  const ids = line ? new Set(Array.from({ length: 12 }, (_, k) => line.item.replace('{k}', String(k)))) : null;
  return Object.values(items).filter((s) => s.itemId?.startsWith(`lick:${id}:`) || (!!ids && ids.has(s.itemId ?? '')));
}

/** Every lick played at all (any take): library licks and the player's own (owner 2026-11-22: "even a little"). */
export function lickPool(items: Record<string, ItemState>, book: LickBook | undefined): Lick[] {
  const own = book?.own ?? [];
  return [...LICKS, ...lineLicks(), ...own].filter((l) => itemsOfLick(items, l.id).some((s) => s.takes > 0) || (book?.mine ?? []).includes(l.id));
}

/**
 * Improvise's vocabulary (SPEC-LICKS-IN-IMPROV §1): the lick pool plus the approach licks the player has practised
 * (any take of k-keylick lick 1, 2 or 3), detected as cells. The technique ladder keeps lickPool (cells are not rungs).
 */
export function vocabPool(items: Record<string, ItemState>, book: LickBook | undefined): Lick[] {
  return [...lickPool(items, book), ...APPROACH_CELLS.filter((c) => itemsOfLick(items, c.id).some((s) => s.takes > 0))];
}

/** Keys in which a lick is closed (the one status rule). */
export function closedKeys(items: Record<string, ItemState>, id: string): number[] {
  return [...new Set(itemsOfLick(items, id).filter((s) => s.targetBpm && itemStatus(s, 0, s.targetBpm) === 'closed').map((s) => ((s.key % 12) + 12) % 12))];
}

/** "In my language": used in improvisation in ≥ 3 different sessions and ≥ 2 keys. */
export function inMyLanguage(uses: LickUse[] | undefined, id: string): boolean {
  const u = (uses ?? []).filter((x) => x.id === id);
  return new Set(u.map((x) => x.session)).size >= 3 && new Set(u.map((x) => x.key)).size >= 2;
}

export const USES_CAP = 400;

const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SYM: Record<string, string> = { maj7: 'maj7', '6': '6', m7: 'm7', m6: 'm6', '7': '7', '7b9': '7b9', alt: '7alt', hd7: 'm7b5', dim7: 'dim7', blues7: '7' };
/** A chart chord as a short symbol (the usage log's `chord`). */
const symOf = (root: number, q: string): string => FLAT_NAMES[((root % 12) + 12) % 12] + (SYM[q] ?? '');

/**
 * The uses found in one improvisation: each lick of the pool over its chord, clean in time (within `tol` beats — the
 * tier's tolerance, lickDetect.lickTimingTol); one per occurrence. Approach cells are found by their pattern.
 */
export function findUses(pool: Lick[], notes: ImpNote[], chart: { root: number; iv: number[]; at: number; beats: number }[], session: string, at: string, o: { tol?: number; meter?: number } = {}): LickUse[] {
  const spans = chart.map((s) => ({ root: s.root, q: qualityOfIntervals(s.iv), at: s.at, beats: s.beats }));
  const out: LickUse[] = [];
  const tol = o.tol ?? LICK_TIMING_TOL;
  for (const l of pool)
    for (const h of findLick(l, notes, spans, { shape: true, varied: true, tol, meter: o.meter ?? 4 }))
      if (h.overChord && h.tight !== false) {
        const sp = h.target ? { root: h.target.root, q: h.target.q } : spans.find((x) => h.beat >= x.at - 1e-6 && h.beat < x.at + x.beats - 1e-6);
        out.push({ id: l.id, key: h.transpose, kind: h.kind, ...(h.viaSub ? { viaSub: true } : {}), at, session, ...(sp ? { chord: symOf(sp.root, sp.q) } : {}), beat: h.beat, ...(h.end !== undefined ? { end: h.end } : {}), ...(h.target ? { deg: h.target.deg } : {}) });
      }
  return out.sort((a, b) => (a.beat ?? 0) - (b.beat ?? 0));
}

/** The variety bonus: +2 for each distinct lick after the first in one take, at most +8 (SPEC-LICKS-IN-IMPROV §4). */
export const VARIETY_XP = 2;
/** "New key" (SPEC-LICKS-IN-IMPROV §2): a key where the lick is not closed yet. */
export const isNewKey = (u: Pick<LickUse, 'id' | 'key'>, closed: Record<string, number[]> | undefined): boolean => !(closed?.[u.id] ?? []).includes(((u.key % 12) + 12) % 12);
/**
 * XP for one take's uses (SPEC-LICKS-IN-IMPROV §4): full (6), then half, then 0 for the same lick in the take; +3 in
 * a key where the lick is not closed yet (`closed`: per lick, its closed keys — vocab.closedKeys), +2 a variation; and
 * the variety bonus for distinct licks.
 */
export function usesXp(uses: LickUse[], closed: Record<string, number[]> | undefined): number {
  const seen: Record<string, number> = {};
  let xp = 0;
  for (const u of uses) {
    const n = (seen[u.id] = (seen[u.id] ?? 0) + 1);
    const base = n === 1 ? 6 : n === 2 ? 3 : 0;
    if (!base) continue;
    xp += base + (isNewKey(u, closed) ? 3 : 0) + (u.kind === 'varied' ? 2 : 0);
  }
  return xp + Math.min(8, VARIETY_XP * Math.max(0, Object.keys(seen).length - 1));
}

/**
 * One take's uses, the shared boundary every improvisation calls (Charts, the scale rotation, Phrase, Trade —
 * SPEC-LICKS-IN-IMPROV §3–4): the notes (beats from the chart's first beat) against the chart spans; the uses (each
 * marked new-key or not) and their XP. Nothing with fewer than 3 notes or an empty pool.
 */
export function takeUses(o: { pool: Lick[]; closed?: Record<string, number[]>; notes: ImpNote[]; spans: { root: number; iv: number[]; at: number; beats: number }[]; session: string; at?: string; tol?: number; meter?: number }): { uses: (LickUse & { beat: number; fresh: boolean })[]; xp: number } {
  if (!o.pool.length || o.notes.length < 3) return { uses: [], xp: 0 };
  const hits = findUses(o.pool, o.notes, o.spans, o.session, o.at ?? new Date().toISOString(), { tol: o.tol, meter: o.meter });
  return { uses: hits.map((u) => ({ ...u, beat: u.beat ?? 0, fresh: isNewKey(u, o.closed) })), xp: usesXp(hits, o.closed) };
}

/** The usage log's entry of a use (the take's beats and the target are not kept). */
export const logEntry = ({ beat: _b, end: _e, deg: _d, ...u }: LickUse): LickUse => u;

/** Book the uses: append to the log (bounded); licks closed in a key get a passed review. */
export function bookUses(book: LickBook | undefined, uses: LickUse[], items: Record<string, ItemState>, review: (b: LickBook, id: string) => LickBook): LickBook {
  let b: LickBook = { ...(book ?? {}) };
  const log = [...(b.uses ?? []), ...uses.map(logEntry)];
  b.uses = log.slice(Math.max(0, log.length - USES_CAP));
  for (const id of new Set(uses.map((u) => u.id))) if (closedKeys(items, id).length) b = review(b, id);
  return b;
}

/** "Used N times in K keys" (the library and the lick page). */
export function usesOf(uses: LickUse[] | undefined, id: string): { n: number; keys: number; sessions: number } {
  const u = (uses ?? []).filter((x) => x.id === id);
  return { n: u.length, keys: new Set(u.map((x) => x.key)).size, sessions: new Set(u.map((x) => x.session)).size };
}

/**
 * Today's lick (SPEC-LICKS-IN-IMPROV §2): a lick of the pool picked by need — due for review first (most overdue),
 * else the most recently practised one not yet in my language, else the first of the pool. Null with an empty pool.
 */
export function todaysLick(pool0: Lick[], book: LickBook | undefined, items: Record<string, ItemState>, now: Date | string = new Date(), weight?: (l: Lick) => number): Lick | null {
  // the approach cells are found in every take, never picked as today's lick
  const pool = pool0.filter((l) => !l.cell);
  if (!pool.length) return null;
  // SPEC-STYLE-FOCUS §4: "today's lick prefers the focus styles" — with a weight (styleFocus.styleWeight of the lick's
  // style), the heavier style first at each step; the order inside a weight stays the need order below
  const byW = <T extends Lick>(xs: T[]): T[] => (weight ? xs.map((l, i) => ({ l, i, w: weight(l) })).sort((a, b) => b.w - a.w || a.i - b.i).map((x) => x.l) : xs);
  const due = dueLicks(book?.review, now);
  const d = byW(due.map((id) => pool.find((l) => l.id === id)).filter((l): l is Lick => !!l))[0];
  if (d) return d;
  const last = (l: Lick) => itemsOfLick(items, l.id).map((s) => s.last ?? '').sort().pop() ?? '';
  const fresh = byW(pool.filter((l) => !inMyLanguage(book?.uses, l.id)).sort((a, b) => last(b).localeCompare(last(a))));
  return fresh[0] ?? byW(pool)[0];
}

const fam = (q: string): string => (q === 'm7' || q === 'm6' ? 'm' : q === 'maj7' || q === '6' ? 'M' : q === 'hd7' ? 'hd' : q === 'dim7' ? 'd' : '7');
/**
 * Where a lick fits a chart (the chart marks it, SPEC-LICKS-IN-IMPROV §2 "today's lick"): the start beats of every run of
 * chart chords that carries the lick's chords in order — the same families, the roots moved together (a dominant may
 * be its tritone sub), with the transposition (the key the lick would be played in).
 */
export function lickFits(l: Lick, chart: { root: number; iv: number[]; at: number; beats: number }[]): { at: number; key: number }[] {
  // a chord held over two bars is one chord (on both sides)
  const dedupe = <T extends { root: number; f: string }>(xs: T[]): T[] => xs.filter((x, i) => i === 0 || x.root !== xs[i - 1].root || x.f !== xs[i - 1].f);
  const spans = dedupe(chart.map((s) => ({ root: ((s.root % 12) + 12) % 12, f: fam(qualityOfIntervals(s.iv)), at: s.at })));
  const cs = dedupe(l.chords.map((c) => ({ root: ((c[0] % 12) + 12) % 12, f: fam(c[1]) })));
  const out: { at: number; key: number }[] = [];
  if (!cs.length) return out;
  for (let i = 0; i + cs.length <= spans.length; i++) {
    const t = (((spans[i].root - cs[0].root) % 12) + 12) % 12;
    const ok = cs.every((c, j) => {
      const s = spans[i + j];
      if (s.f !== c.f) return false;
      const r = (c.root + t) % 12;
      return s.root === r || (c.f === '7' && s.root === (r + 6) % 12);
    });
    if (ok) out.push({ at: spans[i].at, key: t });
  }
  return out;
}

/** The lick cards of Improvise (SPEC-LICKS-IN-IMPROV §2), the ones a take can carry beside the scale rotation. */
export const LICK_CARDS = ['todays-lick', 'use-lick', 'lick-every-4', 'lick-new-key', 'lick-varied', 'lick-three'] as const;
export type LickCardId = (typeof LICK_CARDS)[number];

/**
 * "Vocabulary in use" (SPEC-LICKS-IN-IMPROV §4, the skill map's improvisation area): of the licks learned (closed in at
 * least one key), the share already in my language. Null with nothing learned yet. Approach cells count like licks.
 */
export function vocabInUse(items: Record<string, ItemState>, book: LickBook | undefined): { learned: number; inLanguage: number; share: number } | null {
  const learned = vocabPool(items, book).filter((l) => closedKeys(items, l.id).length > 0);
  if (!learned.length) return null;
  const inLanguage = learned.filter((l) => inMyLanguage(book?.uses, l.id)).length;
  return { learned: learned.length, inLanguage, share: inLanguage / learned.length };
}
