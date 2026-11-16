// The library "My phrases" (SPEC-PHRASE-STUDIO §8.6, §13.4): phrases (Lick v3) and patterns (the old CustomDrills) side
// by side, the migration of old own licks and custom drills (no data change), "Make it a phrase", "Add to my phrases"
// from a built-in lick, and the glue from a take + a span to a phrase draft. Pure.

import type { CustomDrill, ItemState } from '../drills/types';
import { customToDrill } from '../drills/custom';
import { lickPitches, type Lick, type LickBook, type LickInstrument } from '../licks';
import type { RawNote, EncoreTake } from './takeSource';
import { catchTake, type BeatNote, type Caught } from './detect';
import { quantise, splitHands, type QuantMode } from './quantise';
import { autoName, defaultPlan, isPhrase, makePhrase, phraseRank, PHRASE_PREFIX, tonic4, type PhraseDraft } from './phrase';
import { phrasesOf } from './connect';
import { parseChart } from '../charts';

const mod = (n: number) => ((n % 12) + 12) % 12;

export interface LibraryItem {
  kind: 'phrase' | 'pattern';
  id: string;
  name: string | { en: string; he: string };
  rank: number;
  lick?: Lick;
  drill?: CustomDrill;
  createdAt: string;
}

/**
 * Old own licks (from the transcription coach, not v3) read as phrases with defaults (§13.4): home key from the first
 * note's tonic guess (C, as they were stored), the plan from the lick's own tempo ladder, all keys, cycle of 4ths —
 * their item ids stay `lick:<id>:<inst>:<key>`, so no progress is lost.
 */
export function asPhrase(l: Lick): Lick {
  if (isPhrase(l)) return l;
  const v: Lick = { ...l, homeKey: l.homeKey ?? 0, meter: l.meter ?? 4 };
  return { ...v, plan: l.plan ?? { ...defaultPlan(v, 96), order: 'fourths' } };
}

/** Phrases and patterns in one list; sort: due first (rank < f with progress), then newest. */
export function library(book: LickBook | undefined, custom: CustomDrill[] | undefined, items: Record<string, ItemState>, inst: LickInstrument = 'piano'): LibraryItem[] {
  const ph = [...phrasesOf(book), ...(book?.own ?? []).filter((l) => !isPhrase(l)).map(asPhrase)];
  const out: LibraryItem[] = ph.map((l) => ({ kind: 'phrase', id: l.id, name: l.name, rank: phraseRank(l, items, book, inst), lick: l, createdAt: l.createdAt ?? '' }));
  const order = book?.patterns ?? [];
  const pats = [...(custom ?? [])].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib) || b.createdAt.localeCompare(a.createdAt);
  });
  for (const c of pats) out.push({ kind: 'pattern', id: c.id, name: c.name, rank: 0, drill: c, createdAt: c.createdAt });
  return out;
}

/** "Make it a phrase" (§4.4): a pattern rendered in its first key becomes a phrase (notes + no chords); the pattern stays. */
export function patternToPhrase(c: CustomDrill, id: string, now = new Date().toISOString()): Lick | null {
  const key = c.keys?.[0] ?? 0;
  let d;
  try {
    d = customToDrill(c, key);
  } catch {
    return null;
  }
  if (!d.notes.length) return null;
  const rh: BeatNote[] = d.notes.filter((n) => n.hand !== 'L').map((n) => ({ midi: n.pitch, beat: n.beat, dur: n.dur }));
  const lh: BeatNote[] = d.notes.filter((n) => n.hand === 'L').map((n) => ({ midi: n.pitch, beat: n.beat, dur: n.dur }));
  return makePhrase({
    id,
    name: { en: c.name, he: c.name },
    rh: rh.length ? rh : lh,
    lh: rh.length ? lh : [],
    key: mod(key),
    minor: !!c.minor,
    chords: [],
    ctx: 'free',
    meter: d.meter === 3 ? 3 : 4,
    swing: 0.5,
    instrument: c.instrument === 'guitar' || c.instrument === 'bass' ? c.instrument : 'piano',
    playedBpm: c.goalBpm ?? Math.round((c.startBpm ?? d.startBpm) * 1.25),
    source: { kind: 'pattern', drillId: c.id },
    createdAt: now,
  });
}

/** "Add to my phrases" from a built-in lick (§4.6): exact notes, no clean-up; its own chords and context. */
export function lickToPhrase(l: Lick, id: string, inst: LickInstrument = 'piano', now = new Date().toISOString()): Lick {
  const ps = lickPitches(l, 0, inst);
  const rh: BeatNote[] = l.notes.map((n, i) => ({ midi: ps[i], beat: n[1], dur: n[2] }));
  return makePhrase({
    id,
    name: l.name,
    rh,
    lh: [],
    key: 0,
    minor: l.chords.length ? ['m6', 'm7'].includes(l.chords[l.chords.length - 1][1]) : false,
    chords: l.chords,
    ctx: l.ctx,
    meter: 4,
    swing: l.straight ? 0.5 : 0.62,
    instrument: inst,
    playedBpm: 96 + l.level * 8,
    source: { kind: 'lick', lickId: l.id },
    createdAt: now,
  });
}

export const newPhraseId = (now = Date.now()): string => `${PHRASE_PREFIX}${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;

// ───────────────────────────── a take + a span → a draft ─────────────────────────────

/** A take's notes on its beat grid (beats from beat 0), with the detected / known grid. */
export function takeOnGrid(t: EncoreTake): { caught: Caught; notes: (BeatNote & { vel: number; durMs: number })[] } {
  const caught = catchTake(t.notes, { bpm: t.bpm, t0: t.t0, meter: t.meter });
  const P = 60000 / caught.grid.bpm;
  const notes = t.notes.map((n: RawNote) => ({ midi: n.pitch, beat: (n.on - caught.grid.t0) / P, dur: Math.max(0.1, ((n.off ?? n.on + P / 2) - n.on) / P), vel: n.vel, durMs: (n.off ?? n.on + 200) - n.on }));
  return { caught, notes };
}

export interface TrimState {
  takeId: string;
  from: number;
  to: number;
  view: 'roll' | 'score';
  key: number;
  minor: boolean;
  chordsOn: boolean;
  quant: QuantMode;
  split: number | null;
  name: string;
  bpm: number;
  meter: 3 | 4;
  swing: number;
  /** Edits on the selection (index → semitone shift, or deleted). */
  edits: Record<number, number | 'x'>;
  /** Beat 0 of the take (ms). */
  t0: number;
  /** The route's span this state was opened with ("from:to" in seconds; '' = none). */
  spanKey?: string;
}

/** The take's notes on the trim state's grid (the player may have fixed the tempo or meter). */
export function gridNotes(t: EncoreTake, s: Pick<TrimState, 'bpm' | 'meter' | 't0'>): (BeatNote & { vel: number; durMs: number })[] {
  const P = 60000 / s.bpm;
  return t.notes.map((n: RawNote) => ({ midi: n.pitch, beat: (n.on - s.t0) / P, dur: Math.max(0.1, ((n.off ?? n.on + P / 2) - n.on) / P), vel: n.vel, durMs: (n.off ?? n.on + 200) - n.on }));
}

/** The selection as a phrase draft: notes in [from, to), re-based to the selection's first bar line, cleaned up. */
export function draftFrom(t: EncoreTake, s: TrimState, chords: PhraseDraft['chords'], ctx: PhraseDraft['ctx'], id: string, now = new Date().toISOString()): PhraseDraft {
  const notes = gridNotes(t, s);
  const base = Math.floor(s.from / s.meter + 1e-6) * s.meter;
  const sel = notes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.beat >= s.from - 0.12 && n.beat < s.to - 0.12)
    .filter(({ i }) => s.edits[i] !== 'x')
    .map(({ n, i }) => ({ midi: n.midi + (typeof s.edits[i] === 'number' ? (s.edits[i] as number) : 0), beat: n.beat - base, dur: Math.min(n.dur, s.to - n.beat) }));
  const q = quantise(sel, s.quant, s.swing);
  const hands = splitHands(q, s.split);
  const from: 'improv' | 'record' | 'chart' | 'drill' = t.kind === 'record' ? 'record' : t.kind === 'chart' || t.kind === 'guided' ? 'chart' : t.kind === 'drill' ? 'drill' : 'improv';
  const name = s.name.trim() ? { en: s.name.trim(), he: s.name.trim() } : autoName(ctx, s.key, s.minor, from, new Date(t.at));
  return {
    id,
    name,
    rh: hands.rh,
    lh: hands.lh,
    key: s.key,
    minor: s.minor,
    chords: s.chordsOn ? chords : [],
    ctx: s.chordsOn ? ctx : 'free',
    meter: s.meter,
    swing: s.quant === 'swing' ? s.swing : 0.5,
    pickup: 0,
    instrument: t.instrument === 'drums' ? 'piano' : t.instrument,
    playedBpm: s.bpm,
    asPlayed: s.quant === 'played',
    source: t.kind === 'record' ? { kind: 'record', takeId: t.id } : { kind: 'take', takeId: t.id, fromBeat: s.from, toBeat: s.to },
    createdAt: now,
  };
}

/** Chords for the selection (relative to the key), re-based to the selection: the take's chart if it had one, else detected. */
export function chordsFor(caughtChords: PhraseDraft['chords'], from: number, to: number, meter: number): PhraseDraft['chords'] {
  if (!caughtChords.length) return [];
  // the detected chords cover the whole take from beat 0; cut the span
  const out: PhraseDraft['chords'] = [];
  let b = 0;
  const base = Math.floor(from / meter + 1e-6) * meter;
  for (const c of caughtChords) {
    const s = Math.max(b, base);
    const e = Math.min(b + c[2], Math.ceil(to / meter - 1e-6) * meter);
    if (e > s) out.push([c[0], c[1], e - s]);
    b += c[2];
  }
  return out;
}

/** Semitones above the key's tonic of a pitch (for the context chips). */
export const semiOf = (midi: number, key: number) => midi - tonic4(key);

/** A chord's intervals → the nearest lick quality (LICK_Q key). */
export function qualityOf(iv: number[]): string {
  const s = new Set(iv.map((x) => mod(x)));
  const has = (x: number) => s.has(x);
  if (has(3) && has(6) && has(9) && !has(10)) return 'dim7';
  if (has(3) && has(6)) return 'hd7';
  if (has(3) && has(9) && !has(10)) return 'm6';
  if (has(3)) return 'm7';
  if (has(4) && has(10) && (has(1) || has(8)) && !has(7)) return 'alt';
  if (has(4) && has(10) && has(1)) return '7b9';
  if (has(4) && has(10)) return '7';
  if (has(4) && has(9) && !has(11)) return '6';
  return 'maj7';
}

/** The chart a take was played over → chords relative to `key`, from beat 0 (one entry per chord, its beats). */
export function chartChords(chart: string, key: number, meter: number, upTo = 0): PhraseDraft['chords'] {
  const p = parseChart(chart, meter);
  const one = p.chords.map((c) => [mod(c.root - key), qualityOf(c.iv), c.beats] as PhraseDraft['chords'][number]);
  if (!one.length) return [];
  // a chart played in a loop (choruses): repeat it to cover the take
  const len = one.reduce((a, c) => a + c[2], 0);
  const out = [...one];
  for (let b = len; b < upTo && out.length < 2000; b += len) out.push(...one);
  return out;
}
