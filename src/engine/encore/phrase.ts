// An Encore phrase (SPEC-PHRASE-STUDIO §7, §8, §13.1): a `Lick` v3 — notes and chords above the tonic, an optional left
// hand, meter / swing / pickup, a practice plan. This module makes one from a trimmed selection, transposes it so it
// stays playable, turns (phrase, key, hand) into an ordinary Drill on the drills engine, orders the 12 keys easiest
// first, and reads the 12-key × tempo map and the rank (pp … ff) from the items. Pure.

import type { Drill, DrillGoal, ExpNote, ItemState } from '../drills/types';
import { itemPass, ladderStep } from '../drills/ladder';
import { withBarPlan } from '../drills/timeline';
import { hasQuarters, quartersDrill } from '../drills/rubato';
import { notesPerBeat } from '../drills/analyze';
import { keyName } from '../drills/generate';
import { LICK_KEYS, LICK_Q, chordAt, windowOf, type Lick, type LickBook, type LickChord, type LickContext, type LickInstrument, type LickNote, type PhraseMark, type PhrasePlan, type PhraseSource } from '../licks';
import type { BeatNote } from './detect';
import { tuningById } from '../fretboard';
import { instrumentCtx, neckPlace, neckStats, singerRange, voiceOctave, type NeckResult, type Range } from './placement';
import { suggestFingers } from './fingering';

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
  // LH shells (§7.5) leave the right hand's line as it was: its items (and progress) keep the one-hand id
  if (l.lhShells && hand === 'R') return base;
  return twoHands(l) ? `${base}:${hand ?? 'RL'}` : base;
}
/** 6/8 counts eighths (one beat = ♪): the bar's two groups of three. Other meters have no groups. */
export const groupsOf = (m: number): number[] => (m === 6 ? [3, 3] : [m]);
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
  /** Beats per bar (6 = 6/8: one beat is an eighth and the tempo counts eighths). */
  meter: 3 | 4 | 5 | 6;
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
  // MEASUREMENT-AUDIT G14: the source's velocity and short (detached) notes as per-note marks — the model's touch
  const markOf = (n: BeatNote): PhraseMark | null => (n.vel !== undefined || (n.held !== undefined && n.held <= 0.55) ? { ...(n.vel !== undefined ? { vel: n.vel } : {}), ...(n.held !== undefined && n.held <= 0.55 ? { stac: true } : {}) } : null);
  const main = rhN.length ? d.rh : d.lh;
  if (main.some((n) => markOf(n))) l.marks = main.map(markOf);
  if (rhN.length && lhN.length && d.lh.some((n) => markOf(n))) l.lhMarks = d.lh.map(markOf);
  return { ...l, plan: defaultPlan(l, d.playedBpm) };
}
const round3 = (x: number) => Math.round(x * 1000) / 1000;

// ───────────────────────────── a pickup (anacrusis) ─────────────────────────────

/**
 * An anacrusis in a selection re-based to its first bar line (beat 0): the first note falls in the second half of bar
 * 0 and the line goes on past the next bar line. Returns the pickup bar's length in whole beats (1 … meter − 1: an
 * "and of 4" lead-in is a one-beat pickup bar that starts with an eighth rest), or 0 when the phrase starts on (or
 * near) the downbeat.
 */
export function detectPickup(notes: Pick<BeatNote, 'beat'>[], meter: number): number {
  if (!notes.length) return 0;
  const f = Math.min(...notes.map((n) => n.beat));
  if (f < meter / 2 - 1e-6 || f >= meter - 0.12) return 0;
  if (!notes.some((n) => n.beat >= meter - 0.12)) return 0;
  return Math.max(1, Math.min(meter - 1, meter - Math.floor(f + 0.12)));
}
/**
 * A draft with its anacrusis notated (§5.2): when detectPickup finds one, the notes and chords move back so beat 0 is
 * the start of a short first bar (`pickup` beats) and the first downbeat falls on beat `pickup` — rather than the
 * phrase starting inside a full bar of rests.
 */
export function withPickup(d: PhraseDraft): PhraseDraft {
  const p = detectPickup([...d.rh, ...d.lh], d.meter);
  if (!p) return { ...d, pickup: 0 };
  const shift = d.meter - p;
  const mv = (ns: BeatNote[]) => ns.map((n) => ({ ...n, beat: Math.max(0, round3(n.beat - shift)) }));
  // the chords lose the empty beats at the start
  const chords: LickChord[] = [];
  let cut = shift;
  for (const c of d.chords) {
    if (cut >= c[2] - 1e-6) {
      cut -= c[2];
      continue;
    }
    chords.push([c[0], c[1], c[2] - cut]);
    cut = 0;
  }
  return { ...d, rh: mv(d.rh), lh: mv(d.lh), chords, pickup: p };
}
/** The pickup bar's length (0 = none). */
export const pickupOf = (l: Pick<Lick, 'pickup' | 'meter'>): number => {
  const p = Math.round(l.pickup ?? 0);
  return p > 0 && p < (l.meter ?? 4) ? p : 0;
};
/** The bar a beat falls in (bar 0 = the pickup bar when there is one). */
export function barOfBeat(l: Pick<Lick, 'pickup' | 'meter'>, beat: number): number {
  const m = l.meter ?? 4;
  const p = pickupOf(l);
  if (!p) return Math.floor(beat / m + 1e-6);
  return beat < p - 1e-6 ? 0 : 1 + Math.floor((beat - p) / m + 1e-6);
}
/** The end beat of a bar. */
export function barEndBeat(l: Pick<Lick, 'pickup' | 'meter'>, bar: number): number {
  const m = l.meter ?? 4;
  const p = pickupOf(l);
  return p ? p + bar * m : (bar + 1) * m;
}

/** A bar's span in beats from the phrase's start (bar 0 = the pickup bar when there is one): the run review's Keep. */
export function barSpanBeats(l: Pick<Lick, 'pickup' | 'meter'>, bar: number): { from: number; to: number } {
  const m = l.meter ?? 4;
  const p = pickupOf(l);
  const b = Math.max(0, Math.floor(bar));
  return { from: !p ? b * m : b === 0 ? 0 : p + (b - 1) * m, to: barEndBeat(l, b) };
}

/** A phrase drill whose only meter change is its pickup bar (withBarPlan: a short bar 0, one meter after it). */
const pickupOnly = (d: Drill): boolean => !!d.meters?.length && d.meters.length <= 2 && d.meters[0].bar === 0 && !!d.meters[0].meter.pickup;

/** The quarters stage (rubato → quarters → tempo) also for a phrase with a pickup bar. */
export function phraseHasQuarters(drill: Drill): boolean {
  return hasQuarters(pickupOnly(drill) ? { ...drill, meters: undefined } : drill);
}

/**
 * The quarters-stage drill of a phrase (rubato.quartersDrill), keeping a pickup: the stretched pickup (p × notes per
 * beat) ends on a bar line of the full meter, so the pickup bar becomes its remainder (none when it fills whole bars);
 * when the stretch is not whole beats, rests before it make it so.
 */
export function phraseQuartersDrill(drill: Drill): Drill {
  if (!pickupOnly(drill)) return quartersDrill(drill);
  const k = notesPerBeat(drill);
  if (k <= 1) return drill;
  const m = drill.meter;
  const den = drill.pulse === 8 ? 8 : 4;
  const p = drill.meters![0].meter.num * (den / drill.meters![0].meter.den);
  const plain = quartersDrill({ ...drill, meters: undefined });
  const L = p * k;
  const rest = L - Math.floor(L / m + 1e-9) * m;
  if (Math.abs(rest - Math.round(rest)) < 1e-6) {
    const r = Math.round(rest) % m;
    if (!r) return { ...plain, meter: m, beats: Math.ceil(plain.beats / m - 1e-9) * m };
    const bars = Math.max(1, Math.ceil((plain.beats - r) / m - 1e-9));
    return withBarPlan({ ...plain, meter: m, beats: r + bars * m }, [{ num: r, den, pickup: true }, [{ num: m, den, ...(den === 8 ? { groups: groupsOf(m) } : {}) }, bars]]);
  }
  const pad = m - rest;
  return { ...plain, meter: m, notes: plain.notes.map((n) => ({ ...n, beat: Math.round((n.beat + pad) * 1e4) / 1e4 })), beats: Math.ceil((plain.beats + pad) / m - 1e-9) * m };
}

/** Total beats of a phrase: whole bars (after a pickup bar, when there is one). */
export function phraseBeats(l: Lick): number {
  const m = l.meter ?? 4;
  const p = pickupOf(l);
  const last = Math.max(0, ...l.notes.map((n) => n[1] + n[2]), ...(l.lh ?? []).map((n) => n[1] + n[2]), l.chords.reduce((a, c) => a + c[2], 0));
  return p + Math.max(m, Math.ceil((last - p) / m - 1e-6) * m);
}
/** Bars of a phrase (the pickup bar counts as one). */
export const phraseBars = (l: Lick) => {
  const p = pickupOf(l);
  return (p ? 1 : 0) + (phraseBeats(l) - p) / (l.meter ?? 4);
};

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
  const [lo, hi] = inst === 'piano' ? [21, 108] : windowOf(inst, inst === 'voice' ? (range ?? singerRange()) : range);
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
  const bars: string[][] = [];
  let beat = 0;
  for (const c of l.chords) {
    let left = c[2];
    let first = true;
    while (left > 1e-6) {
      const bar = barOfBeat(l, beat);
      const inBar = Math.min(left, barEndBeat(l, bar) - beat);
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

/** The timing-window factor of an "as played" phrase (DrillGoal.timingTolerance): its limits × 1.6. */
export const AS_PLAYED_TOLERANCE = 1.6;

/**
 * (phrase, key, hand) as a Drill: the take, the ladder, the live marks and the chart all come from the drills engine
 * (§14.8). `startBpm` is the key's own start (carry-over, `keyStartBpm`).
 */
export function phraseDrill(l: Lick, key: number, hand: Hand = finalHand(l), o: { inst?: LickInstrument; startBpm?: number; band?: boolean } = {}): Drill {
  const inst = o.inst ?? 'piano';
  if (inst !== 'piano' && hand !== 'R') hand = 'R';
  const k = mod(key);
  const ps = phrasePitches(l, k, inst);
  const neck = inst === 'guitar' || inst === 'bass' ? phraseNeck(l, k, inst) : null;
  const chordToneOf = (semi: number, beat: number) => {
    if (!l.chords.length) return undefined;
    const c = l.chords[chordAt(l.chords, beat)];
    return LICK_Q[c[1]]?.ct.includes(mod(semi - c[0]));
  };
  const notes: ExpNote[] = [];
  // §5.6: suggested piano fingering when the plan asks for it (the player's own numbers in the home key win)
  const fg = inst === 'piano' && planOf(l).fingering ? phraseFingers(l, k) : null;
  const fin = (f: number | undefined) => (f ? { finger: f } : {});
  // MEASUREMENT-AUDIT G14: a piano phrase from a recorded take keeps the model's velocity and its detached notes
  const mdl = (mk: PhraseMark | null | undefined) => (inst === 'piano' && mk ? { ...(mk.vel !== undefined ? { modelVel: mk.vel } : {}), ...(mk.stac ? { stac: true } : {}) } : {});
  if (hand !== 'L') l.notes.forEach((n, i) => notes.push({ pitch: ps.rh[i] + (neck?.shift ?? 0), beat: n[1], dur: n[2], hand: 'R', chordTone: chordToneOf(n[0], n[1]), ...(neck ? tabOf(neck, i) : fin(fg?.rh[i])), ...mdl(l.marks?.[i]) }));
  if (hand !== 'R' && l.lh) l.lh.forEach((n, i) => notes.push({ pitch: ps.lh[i], beat: n[1], dur: n[2], hand: 'L', chordTone: chordToneOf(n[0], n[1]), ...fin(fg?.lh[i]), ...mdl(l.lhMarks?.[i]) }));
  // a one-hand phrase practised "left": its notes an octave down in the left hand
  if (hand === 'L' && !l.lh?.length) {
    const lf = fg ? suggestFingers(l.notes.map((n, i) => ({ pitch: ps.rh[i] - 12, beat: n[1] })), 'L') : null;
    l.notes.forEach((n, i) => notes.push({ pitch: ps.rh[i] - 12, beat: n[1], dur: n[2], hand: 'L', ...fin(lf?.[i]), ...mdl(l.marks?.[i]) }));
  }
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
  // "As played" (kept off the grid, §5.5): its own timing is the model, so the grading window is wider.
  const goal: DrillGoal = { evenness: false, hands: hand === 'RL', ...(l.asPlayed ? { timingTolerance: AS_PLAYED_TOLERANCE } : {}), ...(notes.some((n) => n.modelVel !== undefined || n.stac) ? { model: true } : {}) };
  const sig = ROOT_FLAT[minor ? mod(k + 3) : k];
  const plan = planOf(l);
  const p = pickupOf(l);
  const drill: Drill = {
    spec: { family: 'licks', kind: `lick:${l.id}`, key: k, hands: hand, swing: (l.swing ?? (l.straight ? 0.5 : 0.62)) > 0.54, ...(minor ? { minor: true } : {}), ...(inst === 'guitar' || inst === 'bass' ? { instrument: inst, tuning: tuningOf(inst).id } : {}) },
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
    // MEASUREMENT-AUDIT B2: graded against the phrase's own measured swing (0.58, 0.72 …), not always the triplet's 2/3
    ...(l.swing !== undefined && l.swing > 0.54 ? { swingRatio: l.swing } : {}),
    ...(o.band && l.chords.length ? { band: { style: 'swing' as const, bass: true } } : {}),
  };
  // 6/8: one drill beat is an eighth (pulse 8, the tempo counts eighths), two groups of three a bar
  const m = l.meter ?? 4;
  const den = m === 6 ? 8 : 4;
  const d6: Drill = m === 6 ? { ...drill, pulse: 8, groups: groupsOf(6) } : drill;
  // A pickup: a short first bar (written in the phrase's meter; the count-in is a full bar and the beats before it).
  if (!p) return d6;
  return withBarPlan(d6, [{ num: p, den, pickup: true }, [{ num: m, den, ...(den === 8 ? { groups: groupsOf(m) } : {}) }, Math.max(1, Math.round((phraseBeats(l) - p) / m))]]);
}

/**
 * The fingering of a phrase in a key (§5.6): suggested per hand from the key's own pitches (black and white keys change
 * with the key); in the home key the player's own numbers (marks / lhMarks) are kept and the suggestion runs around them.
 */
export function phraseFingers(l: Lick, key: number): { rh: number[]; lh: number[] } {
  const ps = phrasePitches(l, key, 'piano');
  const home = mod(key) === mod(l.homeKey ?? 0);
  const own = (ms: Lick['marks'], n: number) => Array.from({ length: n }, (_, i) => (home ? ms?.[i]?.finger : undefined));
  const rh = suggestFingers(l.notes.map((n, i) => ({ pitch: ps.rh[i], beat: n[1] })), 'R', own(l.marks, l.notes.length));
  const lh = l.lh?.length ? suggestFingers(l.lh.map((n, i) => ({ pitch: ps.lh[i], beat: n[1] })), 'L', own(l.lhMarks, l.lh.length)) : [];
  return { rh, lh };
}
/** The player's own finger on a note in the home key (null clears it back to the suggestion). */
export function setOwnFinger(l: Lick, hand: 'R' | 'L', i: number, finger: number | null): Lick {
  const field = hand === 'R' ? 'marks' : 'lhMarks';
  const n = hand === 'R' ? l.notes.length : (l.lh?.length ?? 0);
  if (i < 0 || i >= n) return l;
  const ms = Array.from({ length: n }, (_, j) => l[field]?.[j] ?? null);
  const cur = ms[i] ?? {};
  const { finger: _f, ...rest } = cur;
  void _f;
  const next = finger ? { ...rest, finger: Math.max(1, Math.min(5, Math.round(finger))) } : rest;
  ms[i] = Object.keys(next).length ? next : null;
  return { ...l, [field]: ms.some(Boolean) ? ms : undefined };
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
  if (inst !== 'piano') return instKeyCost(l, key, inst, p.rh);
  return (pianoKeyCost(p.rh) * l.notes.length + pianoKeyCost(p.lh) * (l.lh?.length ?? 0)) / Math.max(1, l.notes.length + (l.lh?.length ?? 0));
}

/** The plan's keys in practice order. Easiest first starts with the key it was played in. */
export function keyOrder(l: Lick, plan: PhrasePlan = planOf(l), inst: LickInstrument = 'piano', weak: number[] = []): number[] {
  const home = l.homeKey ?? 0;
  const chosen = plan.keys === 'all' ? Array.from({ length: 12 }, (_, i) => i) : plan.keys.map((k) => mod(k));
  const set = new Set(chosen);
  if (inst === 'voice') {
    const ok = keysInRange(l);
    if (ok.length) for (const k of [...set]) if (!ok.includes(k)) set.delete(k);
  }
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
  if (n >= keysNeeded(l, inst)) {
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
  const need = keysNeeded(l, inst);
  const lo = Math.min(RANK_KEYS[rank], need - 1);
  const hi = rank + 1 >= 5 ? need : Math.min(RANK_KEYS[rank + 1], need);
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

// ───────────────────────────── guitar, bass and voice (v2, §7.4, §13.7) ─────────────────────────────

/** The tuning a phrase is placed on: the course's guitar / bass tuning (Encore sets it from the settings). */
export const tuningOf = (inst: 'guitar' | 'bass') => tuningById(inst === 'bass' ? instrumentCtx().bassTuning : instrumentCtx().guitarTuning);
const MAX_FRET: Record<'guitar' | 'bass', number> = { guitar: 19, bass: 17 };
const tabOf = (neck: NeckResult, i: number): Partial<ExpNote> => {
  const p = neck.placed[i];
  if (!p) return {};
  return p.fret > 0 ? { string: p.string, fret: p.fret, pos: neck.pos || Math.max(1, p.fret - 1), finger: Math.max(1, Math.min(4, p.fret - (neck.pos || p.fret) + 1)) } : { string: p.string, fret: 0 };
};

/**
 * The phrase's line on the neck in a key (§7.4): the home key gets the shortest-path fingering; every other key keeps
 * that shape moved by the transposition when it fits ("same position in every key", the default), else the closest
 * playable fingering; `plan.position === 'per-key'` chooses each key's fingering on its own. Open strings in other keys
 * only when the home key used them.
 */
export function phraseNeck(l: Lick, key: number, inst: 'guitar' | 'bass'): NeckResult & { shift: number } {
  const tu = tuningOf(inst);
  const home = l.homeKey ?? 0;
  const base = { open: tu.open, maxFret: MAX_FRET[inst] };
  const hp = phrasePitches(l, home, inst).rh;
  const homeRes = neckPlace(hp, { ...base, allowOpen: true, perKey: true });
  if (mod(key) === mod(home)) return { ...homeRes, shape: 'same', shift: 0 };
  const ps = phrasePitches(l, key, inst).rh;
  const usedOpen = homeRes.placed.some((p) => p.fret === 0);
  const perKey = planOf(l).position === 'per-key';
  const opts = { ...base, allowOpen: usedOpen, home: { pitches: hp, placed: homeRes.placed }, perKey };
  const first = { ...neckPlace(ps, opts), shift: 0 };
  if (perKey || first.shape === 'same') return first;
  // the shape that does not fit in this octave (below the nut, say) may fit an octave up or down: same fingers
  const lo = Math.min(...tu.open);
  const hi = Math.max(...tu.open) + MAX_FRET[inst];
  for (const sh of [12, -12]) {
    const q = ps.map((p) => p + sh);
    if (!q.length || Math.min(...q) < lo || Math.max(...q) > hi) continue;
    const r = neckPlace(q, { ...opts, home: { pitches: hp, placed: homeRes.placed } });
    if (r.shape === 'same') return { ...r, shift: sh };
  }
  return first;
}

/** The keys a voice phrase fits in the singer's range (every note inside at the best octave). */
export function keysInRange(l: Lick, range?: Range | null): number[] {
  const r = singerRange(range ?? instrumentCtx().range);
  const home = l.homeKey ?? 0;
  const t = tonic4(home);
  return Array.from({ length: 12 }, (_, k) => k).filter((k) => voiceOctave(l.notes.map((n) => t + shiftTo(home, k) + n[0]), r).fits);
}
/** Keys at the target that make a phrase "yours": 12; for the voice every key in the singer's range (at least 1). */
export const keysNeeded = (l: Lick, inst: LickInstrument = 'piano'): number => (inst === 'voice' ? Math.max(1, keysInRange(l).length) : 12);

/**
 * The easiest-first order's awkwardness off the piano (§7.3): guitar / bass — the placed line's shifts, string skips,
 * stretches and high frets per note; voice — the distance from the comfortable middle of the range (and notes outside).
 */
export function instKeyCost(l: Lick, key: number, inst: LickInstrument, pitches: number[]): number {
  if (!pitches.length) return 0;
  if (inst === 'guitar' || inst === 'bass') {
    const st = neckStats(phraseNeck(l, key, inst).placed);
    return Math.round(((st.shifts * 1 + st.skips * 0.3 + st.stretch * 0.5) / Math.max(1, st.n) + st.high * 0.4 + (inst === 'bass' ? st.low * 0.1 : 0)) * 1000) / 1000;
  }
  if (inst === 'voice') {
    const r = singerRange();
    const mid = (r.low + r.high) / 2;
    const half = Math.max(1, (r.high - r.low) / 2);
    const out = pitches.filter((p) => p < r.low || p > r.high).length;
    return Math.round((pitches.reduce((a, p) => a + Math.abs(p - mid) / half, 0) / pitches.length + out) * 1000) / 1000;
  }
  return 0;
}

/** A phrase as one instrument practises it: off the piano a two-hand phrase is its main line (the right hand). */
export const forInstrument = (l: Lick, inst: LickInstrument): Lick => (inst !== 'piano' && l.lh?.length ? { ...l, lh: undefined } : l);
