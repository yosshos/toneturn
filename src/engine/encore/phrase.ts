// An Encore phrase (SPEC-PHRASE-STUDIO §7, §8, §13.1): a `Lick` v3 — notes and chords above the tonic, an optional left
// hand, meter / swing / pickup, a practice plan. This module makes one from a trimmed selection, transposes it so it
// stays playable, turns (phrase, key, hand) into an ordinary Drill on the drills engine, orders the 12 keys easiest
// first, and reads the 12-key × tempo map and the rank (pp … ff) from the items. Pure.

import type { Drill, DrillGoal, ExpNote, ItemState } from '../drills/types';
import { itemPass, ladderStep } from '../drills/ladder';
import { keyName } from '../drills/generate';
import { LICK_KEYS, LICK_Q, chordAt, windowOf, type Lick, type LickBook, type LickChord, type LickContext, type LickInstrument, type LickNote, type PhrasePlan, type PhraseSource } from '../licks';
import type { BeatNote } from './detect';

type T2 = { en: string; he: string };
const mod = (n: number, m = 12) => ((n % m) + m) % m;

export const PHRASE_PREFIX = 'enc-';
/** An Encore phrase (v3), as opposed to a built-in or an old own lick. */
export const isPhrase = (l: Pick<Lick, 'id' | 'v'>): boolean => l.v === 3 || l.id.startsWith(PHRASE_PREFIX);
export const twoHands = (l: Lick): boolean => !!l.lh?.length && !!l.notes.length;
export type Hand = 'R' | 'L' | 'RL';

/** The tonic in the octave around middle C (F♯3 … F4): the reference of a phrase's semitones. */
export const tonic4 = (k: number): number => 60 + mod(k) - (mod(k) > 5 ? 12 : 0);

/** Item id per (phrase, instrument, key[, hand]) — `lick:<id>:<inst>:<key>` (§7.7), a hand suffix for two-hand phrases. */
export function phraseItemId(l: Lick, inst: LickInstrument, key: number, hand?: Hand): string {
  const base = `lick:${l.id}:${inst}:${mod(key)}`;
  return twoHands(l) ? `${base}:${hand ?? 'RL'}` : base;
}
/** The hands a phrase is practised in, in order (a two-hand phrase: right, left, then together by default). */
export function handsOf(l: Lick): Hand[] {
  if (!twoHands(l)) return [l.notes.length ? 'R' : 'L'];
  const h = l.plan?.hands ?? 'R-then-RL';
  return h === 'R-then-RL' ? ['R', 'L', 'RL'] : [h];
}
/** The hand whose passes make the phrase "yours" (the last of the plan: together for two-hand phrases). */
export const finalHand = (l: Lick): Hand => handsOf(l)[handsOf(l).length - 1];

// ───────────────────────────── making a phrase from a selection ─────────────────────────────

export interface PhraseDraft {
  id: string;
  name: T2;
  /** The selection on the beat grid: beat 0 = the first bar line of the selection. */
  rh: BeatNote[];
  lh: BeatNote[];
  key: number;
  minor: boolean;
  /** Relative to the key's tonic; [] = no harmony. */
  chords: LickChord[];
  ctx: LickContext | 'free';
  meter: 3 | 4;
  swing: number;
  pickup?: number;
  instrument: LickInstrument;
  playedBpm: number;
  asPlayed?: boolean;
  source?: PhraseSource;
  createdAt?: string;
  parent?: string;
}

/** A draft → a phrase (Lick v3) with its default plan (§7). */
export function makePhrase(d: PhraseDraft): Lick {
  const t = tonic4(d.key);
  const rhN: LickNote[] = d.rh.map((n) => [n.midi - t, round3(n.beat), round3(n.dur)]);
  const lhN: LickNote[] = d.lh.map((n) => [n.midi - (t - 12), round3(n.beat), round3(n.dur)]);
  const l: Lick = {
    id: d.id,
    v: 3,
    ctx: d.ctx,
    level: 3,
    name: d.name,
    own: true,
    chords: d.chords,
    notes: rhN.length ? rhN : lhN.map(([s, b, du]) => [s - 12, b, du] as LickNote),
    ...(rhN.length && lhN.length ? { lh: lhN } : {}),
    meter: d.meter,
    swing: d.swing,
    straight: d.swing <= 0.54,
    homeKey: mod(d.key),
    minor: d.minor,
    instrument: d.instrument,
    playedBpm: Math.round(d.playedBpm),
    ...(d.pickup ? { pickup: d.pickup } : {}),
    ...(d.asPlayed ? { asPlayed: true } : {}),
    ...(d.source ? { source: d.source } : {}),
    ...(d.parent ? { parent: d.parent } : {}),
    createdAt: d.createdAt ?? new Date().toISOString(),
  };
  return { ...l, plan: defaultPlan(l, d.playedBpm) };
}
const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Total beats of a phrase: whole bars. */
export function phraseBeats(l: Lick): number {
  const m = l.meter ?? 4;
  const last = Math.max(0, ...l.notes.map((n) => n[1] + n[2]), ...(l.lh ?? []).map((n) => n[1] + n[2]), l.chords.reduce((a, c) => a + c[2], 0));
  return Math.max(m, Math.ceil(last / m - 1e-6) * m);
}
export const phraseBars = (l: Lick) => phraseBeats(l) / (l.meter ?? 4);

// ───────────────────────────── the plan (§7.1–7.3) ─────────────────────────────

/** Note-rate ceiling per instrument (notes / s, §7.1). */
export const NPS_CEIL: Record<LickInstrument, number> = { piano: 16, guitar: 14, bass: 12, voice: 8 };
/** Onsets per beat (both hands, chords counted once): the phrase's density. */
export function onsetsPerBeat(l: Lick): number {
  const on = new Set([...l.notes, ...(l.lh ?? [])].map((n) => Math.round(n[1] * 1000)));
  const span = Math.max(1, Math.max(...[...l.notes, ...(l.lh ?? [])].map((n) => n[1] + n[2])) - Math.min(...[...l.notes, ...(l.lh ?? [])].map((n) => n[1])));
  return on.size / span;
}
/** Round to the ladder's grid (steps of ladderStep near the value). */
export const roundToLadder = (bpm: number): number => {
  const s = ladderStep(bpm);
  return Math.max(30, Math.round(bpm / s) * s);
};

/**
 * The default plan: target = 125 % of the tempo played (rounded to a ladder step; capped by the note-rate ceiling),
 * start = the lower of 60 % of the target and the played tempo − 15 %, never under ♩40; all 12 keys easiest first; a
 * two-hand phrase one hand first.
 */
export function defaultPlan(l: Lick, playedBpm: number, inst: LickInstrument = l.instrument ?? 'piano'): PhrasePlan {
  const played = Math.max(40, playedBpm || 80);
  const ceil = (NPS_CEIL[inst] * 60) / Math.max(0.5, onsetsPerBeat(l));
  const goal = Math.min(roundToLadder(played * 1.25), Math.floor(ceil));
  const start = Math.max(40, Math.round(Math.min(goal * 0.6, played * 0.85)));
  return { startBpm: Math.min(start, goal), goalBpm: goal, keys: 'all', order: 'easiest', hands: twoHands(l) ? 'R-then-RL' : 'R', band: false, inToday: true, inWorkout: true };
}
export const planOf = (l: Lick): PhrasePlan => l.plan ?? defaultPlan(l, l.playedBpm ?? 80);
/** Above the instrument's note-rate ceiling (the gentle note on the plan screen). */
export const overCeiling = (l: Lick, bpm: number, inst: LickInstrument = l.instrument ?? 'piano'): boolean => (onsetsPerBeat(l) * bpm) / 60 > NPS_CEIL[inst];

/** The tempo rungs from start to target: four evenly spaced, rounded to the ladder (start and target exact). */
export function phraseRungs(p: Pick<PhrasePlan, 'startBpm' | 'goalBpm'>): number[] {
  const a = p.startBpm;
  const b = Math.max(a, p.goalBpm);
  if (b - a < 8) return [...new Set([a, b])];
  return [a, roundToLadder(a + (b - a) / 3), roundToLadder(a + (2 * (b - a)) / 3), b];
}

// ───────────────────────────── transposition that stays playable (§7.4) ─────────────────────────────

/** The shortest move from the home key (−6 … +5 semitones). */
export const shiftTo = (home: number, key: number): number => {
  const d = mod(key - home);
  return d > 5 ? d - 12 : d;
};

/**
 * Sounding pitches of a phrase in a key: moved by the shortest interval, then (one common octave for both hands, so the
 * hands keep their distance) the octave that keeps the right hand around C4–C6 and the left around C2–C4 on the piano,
 * or inside the instrument's window. The home key stays where it was played unless that is out of range.
 */
export function phrasePitches(l: Lick, key: number, inst: LickInstrument = 'piano', range?: { low: number; high: number } | null): { rh: number[]; lh: number[] } {
  const home = l.homeKey ?? 0;
  const t = tonic4(home) + shiftTo(home, key);
  const rh0 = l.notes.map((n) => t + n[0]);
  const lh0 = (l.lh ?? []).map((n) => t - 12 + n[0]);
  const [lo, hi] = inst === 'piano' ? [21, 108] : windowOf(inst, range);
  const cen = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  let best = 0;
  let bestCost = Infinity;
  for (let o = -3; o <= 3; o++) {
    const r = rh0.map((p) => p + 12 * o);
    const L = lh0.map((p) => p + 12 * o);
    const out = [...r, ...L].reduce((a, p) => a + Math.max(0, lo - p) + Math.max(0, p - hi), 0);
    const rc = cen(r);
    const lc = cen(L);
    let place = 0;
    if (inst === 'piano') {
      if (rc !== null) place += Math.max(0, 57 - rc) + Math.max(0, rc - 86);
      if (lc !== null) place += Math.max(0, 33 - lc) + Math.max(0, lc - 62);
    } else if (rc !== null) place += Math.abs(rc - (lo + hi) / 2) * 0.2;
    const cost = out * 20 + place * 2 + Math.abs(o) * 1.5;
    if (cost < bestCost) {
      bestCost = cost;
      best = o;
    }
  }
  return { rh: rh0.map((p) => p + 12 * best), lh: lh0.map((p) => p + 12 * best) };
}

const ROOT_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ROOT_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const flatKey = (k: number) => [1, 3, 5, 8, 10].includes(mod(k));
export const chordName = (c: LickChord, key: number): string => (flatKey(key) ? ROOT_FLAT : ROOT_SHARP)[mod(c[0] + key)] + (LICK_Q[c[1]]?.sym ?? '');
/** Chord names per bar for the chart above the staff (any meter). */
export function phraseChart(l: Lick, key: number): string[] {
  if (!l.chords.length) return [];
  const m = l.meter ?? 4;
  const bars: string[][] = [];
  let beat = 0;
  for (const c of l.chords) {
    let left = c[2];
    let first = true;
    while (left > 1e-6) {
      const bar = Math.floor(beat / m + 1e-6);
      const inBar = Math.min(left, (bar + 1) * m - beat);
      (bars[bar] ??= []);
      if (first) bars[bar].push(chordName(c, key));
      else if (!bars[bar].length) bars[bar].push('%');
      first = false;
      beat += inBar;
      left -= inBar;
    }
  }
  const total = phraseBars(l);
  for (let b = 0; b < total; b++) bars[b] ??= ['%'];
  return bars.slice(0, total).map((b) => b.join(' '));
}

/**
 * (phrase, key, hand) as a Drill: the take, the ladder, the live marks and the chart all come from the drills engine
 * (§14.8). `startBpm` is the key's own start (carry-over, `keyStartBpm`).
 */
export function phraseDrill(l: Lick, key: number, hand: Hand = finalHand(l), o: { inst?: LickInstrument; startBpm?: number; band?: boolean } = {}): Drill {
  const inst = o.inst ?? 'piano';
  const k = mod(key);
  const ps = phrasePitches(l, k, inst);
  const chordToneOf = (semi: number, beat: number) => {
    if (!l.chords.length) return undefined;
    const c = l.chords[chordAt(l.chords, beat)];
    return LICK_Q[c[1]]?.ct.includes(mod(semi - c[0]));
  };
  const notes: ExpNote[] = [];
  if (hand !== 'L') l.notes.forEach((n, i) => notes.push({ pitch: ps.rh[i], beat: n[1], dur: n[2], hand: 'R', chordTone: chordToneOf(n[0], n[1]) }));
  if (hand !== 'R' && l.lh) l.lh.forEach((n, i) => notes.push({ pitch: ps.lh[i], beat: n[1], dur: n[2], hand: 'L', chordTone: chordToneOf(n[0], n[1]) }));
  // a one-hand phrase practised "left": its notes an octave down in the left hand
  if (hand === 'L' && !l.lh?.length) l.notes.forEach((n, i) => notes.push({ pitch: ps.rh[i] - 12, beat: n[1], dur: n[2], hand: 'L' }));
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  // notes sounding together share a chordId (chords, hands together)
  let cid = 0;
  for (let i = 0; i < notes.length; i++) {
    const same = notes.filter((x) => Math.abs(x.beat - notes[i].beat) < 1e-6);
    if (same.length > 1 && notes[i].chordId === undefined) {
      for (const x of same) x.chordId = cid;
      cid++;
    }
  }
  const minor = !!l.minor;
  const kn = keyName(k, minor) + (minor ? 'm' : '');
  const goal: DrillGoal = { evenness: false, hands: hand === 'RL' };
  const sig = ROOT_FLAT[minor ? mod(k + 3) : k];
  const plan = planOf(l);
  return {
    spec: { family: 'licks', kind: `lick:${l.id}`, key: k, hands: hand, swing: (l.swing ?? (l.straight ? 0.5 : 0.62)) > 0.54, ...(minor ? { minor: true } : {}), ...(inst === 'guitar' || inst === 'bass' ? { instrument: inst } : {}) },
    itemId: phraseItemId(l, inst, k, hand),
    title: { en: `${l.name.en} · ${kn}`, he: `${l.name.he} · ${kn}` },
    notes,
    beats: phraseBeats(l),
    meter: l.meter ?? 4,
    keySig: sig,
    goal,
    startBpm: Math.max(30, Math.round(o.startBpm ?? plan.startBpm)),
    ...(l.chords.length ? { chart: phraseChart(l, k) } : {}),
    // one phone screen: a phrase longer than two bars shows two lines at a time, following the take
    ...(phraseBars(l) > 2 ? { paged: true } : {}),
    ...(inst === 'voice' ? { sung: true } : {}),
    ...(o.band && l.chords.length ? { band: { style: 'swing' as const, bass: true } } : {}),
  };
}

// ───────────────────────────── the 12 keys, easiest first (§7.3) ─────────────────────────────

const BLACK = new Set([1, 3, 6, 8, 10]);
/**
 * Piano awkwardness of the phrase in a key: black-key share, black keys at the phrase's turning points and run ends
 * (where the thumb or 5th finger tends to fall), and black→white→black zig-zags. 0 … ~1.
 */
export function pianoKeyCost(pitches: number[]): number {
  if (!pitches.length) return 0;
  const black = pitches.map((p) => BLACK.has(mod(p)));
  const share = black.filter(Boolean).length / pitches.length;
  let edges = 0;
  let zig = 0;
  for (let i = 0; i < pitches.length; i++) {
    const turn = i === 0 || i === pitches.length - 1 || (i > 0 && i < pitches.length - 1 && Math.sign(pitches[i] - pitches[i - 1]) !== Math.sign(pitches[i + 1] - pitches[i]));
    if (turn && black[i]) edges++;
    if (i >= 2 && black[i] && !black[i - 1] && black[i - 2]) zig++;
  }
  return Math.round((0.55 * share + 0.3 * Math.min(1, edges / Math.max(2, pitches.length * 0.35)) + 0.15 * Math.min(1, zig / Math.max(2, pitches.length * 0.25))) * 1000) / 1000;
}
export function keyCost(l: Lick, key: number, inst: LickInstrument = 'piano'): number {
  const p = phrasePitches(l, key, inst);
  if (inst !== 'piano') return 0;
  return (pianoKeyCost(p.rh) * l.notes.length + pianoKeyCost(p.lh) * (l.lh?.length ?? 0)) / Math.max(1, l.notes.length + (l.lh?.length ?? 0));
}

/** The plan's keys in practice order. Easiest first starts with the key it was played in. */
export function keyOrder(l: Lick, plan: PhrasePlan = planOf(l), inst: LickInstrument = 'piano', weak: number[] = []): number[] {
  const home = l.homeKey ?? 0;
  const chosen = plan.keys === 'all' ? Array.from({ length: 12 }, (_, i) => i) : plan.keys.map((k) => mod(k));
  const set = new Set(chosen);
  const fourths = [...LICK_KEYS.slice(LICK_KEYS.indexOf(home)), ...LICK_KEYS.slice(0, LICK_KEYS.indexOf(home))];
  let out: number[];
  if (plan.order === 'fourths') out = fourths;
  else if (plan.order === 'chromatic') out = Array.from({ length: 12 }, (_, i) => mod(home + i));
  else if (plan.order === 'weak' && weak.length) out = [home, ...weak.filter((k) => k !== home), ...fourths.filter((k) => k !== home && !weak.includes(k))];
  else if (plan.order === 'custom' && plan.keys !== 'all') out = plan.keys.map((k) => mod(k));
  else {
    const rest = fourths.filter((k) => k !== home).map((k, i) => ({ k, c: keyCost(l, k, inst) + i * 0.001 }));
    rest.sort((a, b) => a.c - b.c);
    out = [home, ...rest.map((x) => x.k)];
  }
  return [...new Set(out)].filter((k) => set.has(k));
}

// ───────────────────────────── the map and the run (§7.2, §8.4) ─────────────────────────────

export type CellState = 'empty' | 'clean' | 'passed' | 'current';
export interface MapRow {
  id: 'free' | 'quarters' | number;
  label: string;
}
/** Rows of the map: free · quarters · tempo rungs (the last = the target). */
export function mapRows(l: Lick): MapRow[] {
  const r = phraseRungs(planOf(l));
  return [{ id: 'free', label: 'free' }, { id: 'quarters', label: '60' }, ...r.map((b) => ({ id: b, label: String(b) }))];
}

const bestOf = (st: ItemState | undefined) => (st ? Math.max(st.cleanBpm ?? 0, ...(st.passLog ?? []).map((x) => x.bpm)) : 0);
/** The item of a key (and hand). */
export const itemOf = (l: Lick, items: Record<string, ItemState>, key: number, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)) => items[phraseItemId(l, inst, key, hand)];
/** A key passed at the target by the level rule (3 clean takes on 2 days at ≥ 95 %). */
export function keyPassed(l: Lick, items: Record<string, ItemState>, key: number, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)): boolean {
  const p = planOf(l);
  return itemPass(itemOf(l, items, key, inst, hand), p.startBpm, p.goalBpm).target;
}
export function passedKeys(l: Lick, items: Record<string, ItemState>, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)): number[] {
  return Array.from({ length: 12 }, (_, k) => k).filter((k) => keyPassed(l, items, k, inst, hand));
}

/** One column per key (plan order), one cell per row. The current cell: the first not clean in the key being learned. */
export function phraseMap(l: Lick, items: Record<string, ItemState>, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)): { keys: number[]; rows: MapRow[]; cells: CellState[][]; current: { key: number; row: number } | null } {
  const keys = keyOrder(l, planOf(l), inst);
  const rows = mapRows(l);
  const cells = keys.map((k) => {
    const st = itemOf(l, items, k, inst, hand);
    const best = bestOf(st);
    const free = (st?.rubato?.free ?? 0) >= 1 || !!st?.rubato?.skipped || best > 0;
    const quarters = (st?.rubato?.quarters ?? 0) >= 1 || !!st?.rubato?.skipped || best > 0;
    const passed = keyPassed(l, items, k, inst, hand);
    return rows.map((r, j): CellState => {
      if (r.id === 'free') return free ? 'clean' : 'empty';
      if (r.id === 'quarters') return quarters ? 'clean' : 'empty';
      if (j === rows.length - 1) return passed ? 'passed' : best >= r.id * 0.95 - 1e-9 ? 'clean' : 'empty';
      return best >= (r.id as number) * 0.95 - 1e-9 ? 'clean' : 'empty';
    });
  });
  const ki = keys.findIndex((_, i) => cells[i][rows.length - 1] !== 'passed');
  let current: { key: number; row: number } | null = null;
  if (ki >= 0) {
    const row = cells[ki].findIndex((c) => c === 'empty');
    const r = row < 0 ? rows.length - 1 : row;
    cells[ki][r] = 'current';
    current = { key: keys[ki], row: r };
  }
  return { keys, rows, cells, current };
}

/**
 * Carry-over (§7.2): the first key climbs the whole ladder from the plan's start; each later key starts at 80 % of the
 * best clean tempo of any key (never under the plan's start, never over the target).
 */
export function keyStartBpm(l: Lick, items: Record<string, ItemState>, key: number, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)): number {
  const p = planOf(l);
  const home = keyOrder(l, p, inst)[0];
  if (mod(key) === home) return p.startBpm;
  let best = 0;
  for (let k = 0; k < 12; k++) if (k !== mod(key)) best = Math.max(best, bestOf(itemOf(l, items, k, inst, hand)));
  return Math.max(p.startBpm, Math.min(p.goalBpm, Math.round(best * 0.8)));
}

/**
 * The stage of a key: the first key — free time twice, then quarters (when the phrase has them), then tempo; a later
 * key — one free take; a clean one skips the quarters (§7.2).
 */
export function keyStage(l: Lick, items: Record<string, ItemState>, key: number, inst: LickInstrument = 'piano', hand: Hand = finalHand(l), hasQuarters = true): 'free' | 'quarters' | null {
  const st = itemOf(l, items, key, inst, hand);
  const r = st?.rubato;
  if (r?.skipped) return null;
  if (bestOf(st) > 0) return null;
  const first = keyOrder(l, planOf(l), inst)[0] === mod(key);
  if (first) {
    if ((r?.free ?? 0) < 2) return 'free';
    if (hasQuarters && (r?.quarters ?? 0) < 1) return 'quarters';
    return null;
  }
  return (r?.free ?? 0) < 1 ? 'free' : null;
}

/** The key to practise next: the first key in order not passed at the target (a started one first). */
export function nextKey(l: Lick, items: Record<string, ItemState>, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)): number {
  const keys = keyOrder(l, planOf(l), inst);
  const open = keys.filter((k) => !keyPassed(l, items, k, inst, hand));
  return open.find((k) => (itemOf(l, items, k, inst, hand)?.takes ?? 0) > 0) ?? open[0] ?? keys[0];
}

// ───────────────────────────── ranks (§8.4) ─────────────────────────────

export const RANKS = ['—', 'pp', 'p', 'mp', 'mf', 'f', 'ff'] as const;
export const RANK_NAME: T2[] = [
  { en: 'Sketch', he: 'טיוטה' },
  { en: 'pp', he: 'pp' },
  { en: 'p', he: 'p' },
  { en: 'mp', he: 'mp' },
  { en: 'mf', he: 'mf' },
  { en: 'Yours', he: 'שלך' },
  { en: 'In your vocabulary', he: 'באוצר המילים' },
];
/** Keys at the target for each rank from mp (3, 6, 12). */
const RANK_KEYS = [0, 0, 1, 3, 6, 12];

/**
 * The phrase's rank (measured only): 0 sketch · 1 pp clean in free time in the home key · 2 p target in the home key ·
 * 3 mp 3 keys · 4 mf 6 keys · 5 f "yours" all 12 keys (a chosen subset never reaches f) · 6 ff yours + used twice over
 * the band + a review passed ≥ 7 days later.
 */
export function phraseRank(l: Lick, items: Record<string, ItemState>, book?: LickBook, inst: LickInstrument = 'piano'): number {
  const hand = finalHand(l);
  const home = keyOrder(l, planOf(l), inst)[0] ?? l.homeKey ?? 0;
  const passed = passedKeys(l, items, inst, hand);
  const n = passed.length;
  if (n >= 12) {
    const used = (book?.used?.[l.id] ?? 0) >= 2;
    const r = book?.review?.[l.id];
    const reviewed = !!r && (r.reps ?? 0) >= 2 && Date.parse(r.last) - Date.parse(l.createdAt ?? r.last) >= 7 * 86400000;
    return used && reviewed ? 6 : 5;
  }
  if (n >= 6) return 4;
  if (n >= 3) return 3;
  if (passed.includes(home)) return 2;
  const anyHand = handsOf(l).some((h) => {
    const st = itemOf(l, items, home, inst, h);
    return (st?.rubato?.free ?? 0) >= 1 || bestOf(st) > 0;
  });
  return anyHand ? 1 : 0;
}

/** The bar to the next promotion only (0 … < 1); null at the top. Never "full" below the top (owner rule). */
export function promotion(l: Lick, items: Record<string, ItemState>, book?: LickBook, inst: LickInstrument = 'piano'): { rank: number; to: number | null; value: number; need: number } {
  const rank = phraseRank(l, items, book, inst);
  if (rank >= 6) return { rank, to: null, value: 0, need: 0 };
  const n = passedKeys(l, items, inst).length;
  if (rank === 5) return { rank, to: 6, value: Math.min(0.95, ((book?.used?.[l.id] ?? 0) >= 2 ? 0.5 : 0) + ((book?.review?.[l.id]?.reps ?? 0) >= 2 ? 0.45 : 0)), need: 0 };
  if (rank <= 1) return { rank, to: rank + 1, value: rank === 1 ? 0.5 : 0, need: 1 };
  const lo = RANK_KEYS[rank];
  const hi = RANK_KEYS[rank + 1];
  return { rank, to: rank + 1, value: Math.min(0.95, Math.max(0, (n - lo) / (hi - lo))), need: hi - n };
}

/** Days practised (any key / hand), for the ticks under the map. */
export function daysPractised(l: Lick, items: Record<string, ItemState>, inst: LickInstrument = 'piano'): number {
  const days = new Set<string>();
  for (const [id, st] of Object.entries(items)) {
    if (!id.startsWith(`lick:${l.id}:${inst}:`)) continue;
    for (const h of st.history ?? []) days.add(h.at.slice(0, 10));
    for (const h of st.passLog ?? []) days.add(h.at.slice(0, 10));
    if (st.last) days.add(st.last.slice(0, 10));
  }
  return days.size;
}
/** Best clean tempo at the target hand across keys. */
export const bestTempo = (l: Lick, items: Record<string, ItemState>, inst: LickInstrument = 'piano') => Math.max(0, ...Array.from({ length: 12 }, (_, k) => bestOf(itemOf(l, items, k, inst))));

/** The automatic name (§5.7): the context and the source date ("ii–V in F · from the improv of 14.11"). */
export function autoName(ctx: LickContext | 'free', key: number, minor: boolean, from: 'improv' | 'record' | 'chart' | 'drill' | 'lick' | 'pattern', at: Date = new Date()): T2 {
  const k = keyName(key, minor) + (minor ? 'm' : '');
  const d = `${at.getDate()}.${at.getMonth() + 1}`;
  const what: Record<string, T2> = {
    'major-251': { en: 'ii–V', he: 'ii–V' },
    'minor-251': { en: 'Minor ii–V', he: 'ii–V מינורי' },
    dominant: { en: 'Dominant line', he: 'קו על דומיננט' },
    blues: { en: 'Blues line', he: 'קו בלוז' },
    free: { en: 'Phrase', he: 'משפט' },
  };
  const w = what[ctx] ?? what.free;
  const src: Record<string, T2> = {
    improv: { en: 'from the improv of', he: 'מהאלתור של' },
    record: { en: 'recorded', he: 'מההקלטה של' },
    chart: { en: 'from the solo of', he: 'מהסולו של' },
    drill: { en: 'from the drill of', he: 'מהתרגיל של' },
    lick: { en: 'from the lick library', he: 'מספריית הליקים' },
    pattern: { en: 'from a pattern', he: 'מתבנית' },
  };
  const s = src[from];
  const dated = from === 'lick' || from === 'pattern' ? '' : ` ${d}`;
  return { en: `${w.en} in ${k} · ${s.en}${dated}`, he: `${w.he} ב־${k} · ${s.he}${dated}` };
}
