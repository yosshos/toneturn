// Technique drills: the player's own drills (spec AI §12, owner request). A CustomDrill is a pattern in scale degrees;
// it becomes a Drill exactly like the built-in ones and runs through every key. Pure.
//
// Drill creator 2 (v: 2, all fields optional — a v1 drill generates exactly as before):
//  - rows of "rich" notes: degree + alteration + length, rests, chords (length 0 = sounds with the next note),
//    accents, staccato, guitar technique (h p b ~ PM slide);
//  - hands: one hand, both in octaves, contrary motion, or an independent LH row;
//  - movement: sequence N steps (by step / 3rd / 4th), up / down / up-and-down, repeated over 1–4 octaves;
//  - keys: all 12 in the player's order or a subset; major / minor; extra scales (modes, altered, whole-tone, diminished);
//  - tempo (start / goal), what is graded, dynamics goal, include in Today / workout / path;
//  - guitar / bass: degrees placed in a hand position on the neck (string / fret / pos), string set, stretch;
//  - the degree text format, MIDI quantisation, presets, copy-a-built-in, share codes.

import type { CustomDrill, Drill, DrillGoal, DrillSpec, ExpNote, Hand, KeyOrder, ScaleType } from './types';
import { SCALE_INTERVALS, keyName, keysInOrder, mod, rhBase, scaleTypeOf } from './generate';
import { noteAt, tuningById, type Tuning } from '../fretboard';
import type { NoteEvent } from '../lesson';

type PatNote = CustomDrill['pattern'][number];
export type NoteMarks = NonNullable<NonNullable<CustomDrill['marks']>[number]>;
/** A pattern note with its marks (the creator's working form). */
export type RichNote = PatNote & NoteMarks;
export type HandsMode = NonNullable<CustomDrill['handsMode']>;
export type ExtraMode = NonNullable<CustomDrill['mode']>;
export type CreatorScale = ScaleType | ExtraMode;
export type T2 = { en: string; he: string };
const t2 = (en: string, he: string): T2 => ({ en, he });
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

// ───────────────────────────── scales ─────────────────────────────

export const EXTRA_SCALES: Record<ExtraMode, number[]> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10],
  'whole-tone': [0, 2, 4, 6, 8, 10],
  'dim-hw': [0, 1, 3, 4, 6, 7, 9, 10],
  'dim-wh': [0, 2, 3, 5, 6, 8, 9, 11],
  'harmonic-major': [0, 2, 4, 5, 7, 8, 11],
};
/** The ScaleType stored in `scale` for a mode (old readers only). */
const MODE_FALLBACK: Record<ExtraMode, ScaleType> = { dorian: 'natural', phrygian: 'natural', lydian: 'major', locrian: 'natural', altered: 'melodic', 'whole-tone': 'chromatic', 'dim-hw': 'chromatic', 'dim-wh': 'chromatic', 'harmonic-major': 'major' };

/** Scales offered by the creator, in menu order. */
export const CREATOR_SCALES: CreatorScale[] = ['major', 'natural', 'harmonic', 'melodic', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'harmonic-major', 'altered', 'whole-tone', 'dim-hw', 'dim-wh', 'bebop-dom', 'six-dim', 'blues', 'pentatonic', 'chromatic'];
export const SCALE_NAMES: Record<CreatorScale, T2> = {
  major: t2('Major', 'מז׳ור'),
  natural: t2('Natural minor', 'מינור טבעי'),
  harmonic: t2('Harmonic minor', 'מינור הרמוני'),
  melodic: t2('Melodic minor', 'מינור מלודי'),
  dorian: t2('Dorian', 'דורי'),
  phrygian: t2('Phrygian', 'פריגי'),
  lydian: t2('Lydian', 'לידי'),
  mixolydian: t2('Mixolydian', 'מיקסולידי'),
  locrian: t2('Locrian', 'לוקרי'),
  'harmonic-major': t2('Harmonic major', 'מז׳ור הרמוני'),
  altered: t2('Altered', 'אלטרד'),
  'whole-tone': t2('Whole-tone', 'טונים שלמים'),
  'dim-hw': t2('Diminished (half–whole)', 'מוקטן (חצי–שלם)'),
  'dim-wh': t2('Diminished (whole–half)', 'מוקטן (שלם–חצי)'),
  'bebop-dom': t2('Bebop dominant', 'ביבופ דומיננטי'),
  'six-dim': t2('Sixth-diminished (Barry Harris)', 'שישית-מוקטן (בארי האריס)'),
  blues: t2('Blues', 'בלוז'),
  pentatonic: t2('Pentatonic', 'פנטטוני'),
  chromatic: t2('Chromatic', 'כרומטי'),
};
const isExtra = (s: string): s is ExtraMode => s in EXTRA_SCALES;
export const scaleInts = (s: CreatorScale): number[] => (isExtra(s) ? EXTRA_SCALES[s] : SCALE_INTERVALS[s]);
/** The scale a custom drill's degrees refer to. */
export const creatorScaleOf = (c: Pick<CustomDrill, 'scale' | 'mode'>): CreatorScale => c.mode ?? c.scale;
/** Set the scale (a mode is stored in `mode` with a ScaleType fallback in `scale`). */
export function withScale<C extends Pick<CustomDrill, 'scale' | 'mode'>>(c: C, s: CreatorScale): C {
  if (isExtra(s)) return { ...c, scale: MODE_FALLBACK[s], mode: s };
  const { mode: _m, ...rest } = c;
  return { ...(rest as C), scale: s };
}

/** Pitch of 1-based degree `deg` (8 = the octave for 7-note scales; 0 / negatives below) + alteration. */
export function degreePitch(tonic: number, ints: number[], deg: number, alt = 0): number {
  const n = ints.length;
  const k = deg - 1;
  return tonic + 12 * Math.floor(k / n) + ints[mod(k, n)] + alt;
}
/** Pitch of a 1-based scale degree (8 = tonic an octave up; 0 / negatives go below the tonic) plus an alteration. */
export function degreeToPitch(tonic: number, scale: ScaleType, deg: number, alt = 0): number {
  return degreePitch(tonic, SCALE_INTERVALS[scale], deg, alt);
}

/** Degree (+ alteration ±1) of a pitch above / below a tonic, or null when ±1 cannot reach the scale. */
export function pitchToDegree(p: number, tonic: number, ints: number[], prefer: 'sharp' | 'flat' | 'smart' = 'sharp'): { deg: number; alt: -1 | 0 | 1 } | null {
  const len = ints.length;
  const semis = p - tonic;
  const oct = Math.floor(semis / 12);
  const r = mod(semis, 12);
  const i0 = ints.indexOf(r);
  if (i0 >= 0) return { deg: oct * len + i0 + 1, alt: 0 };
  const sharp = (): { deg: number; alt: 1 } | null => {
    const i = ints.indexOf(r - 1);
    return i >= 0 ? { deg: oct * len + i + 1, alt: 1 } : null;
  };
  const flat = (): { deg: number; alt: -1 } | null => {
    if (r + 1 === 12) return { deg: (oct + 1) * len + 1, alt: -1 };
    const i = ints.indexOf(r + 1);
    return i >= 0 ? { deg: oct * len + i + 1, alt: -1 } : null;
  };
  const flatFirst = prefer === 'flat' || (prefer === 'smart' && [1, 3, 8, 10].includes(r));
  return flatFirst ? (flat() ?? sharp()) : (sharp() ?? flat());
}

// ───────────────────────────── rows of rich notes ─────────────────────────────

export function richOf(pattern: CustomDrill['pattern'] | undefined, marks?: CustomDrill['marks']): RichNote[] {
  return (pattern ?? []).map((n, i) => ({ ...n, ...(marks?.[i] ?? {}) }));
}
/** Rich notes → the stored pattern + marks (marks omitted when there are none). */
export function splitRich(r: RichNote[]): { pattern: CustomDrill['pattern']; marks?: CustomDrill['marks'] } {
  const pattern = r.map(({ deg, alt, dur, hand }) => ({ deg, ...(alt ? { alt } : {}), dur, hand }));
  const marks = r.map(({ rest, acc, stac, tech, bend }) => {
    const m: NoteMarks = {};
    if (rest) m.rest = true;
    if (acc) m.acc = true;
    if (stac) m.stac = true;
    if (tech) m.tech = tech;
    if (bend) m.bend = bend;
    return Object.keys(m).length ? m : null;
  });
  return marks.some(Boolean) ? { pattern, marks } : { pattern };
}

interface Ev {
  beat: number;
  dur: number;
  notes: RichNote[];
}
/** A row → sounding events (rests only advance time; length-0 notes join the next note as a chord). */
export function rowEvents(row: RichNote[]): { evs: Ev[]; len: number } {
  const evs: Ev[] = [];
  let beat = 0;
  let group: RichNote[] = [];
  for (const p of row) {
    if (p.rest) {
      if (group.length) evs.push({ beat, dur: p.dur, notes: group });
      group = [];
      beat += p.dur;
      continue;
    }
    group.push(p);
    if (p.dur > 0) {
      evs.push({ beat, dur: p.dur, notes: group });
      beat += p.dur;
      group = [];
    }
  }
  return { evs, len: beat };
}

// ───────────────────────────── modes, movement, keys ─────────────────────────────

/** How the hands play: the explicit mode, or (v1) mixed-hand pattern / one hand / octaves. */
export function handsModeOf(c: CustomDrill): HandsMode | 'mixed' {
  if (isGuitarCustom(c)) return 'R';
  if (c.handsMode) return c.handsMode;
  if (new Set(c.pattern.map((p) => p.hand)).size > 1) return 'mixed';
  return c.hands === 'RL' ? 'octaves' : c.hands;
}
export const handsOfMode = (m: HandsMode | 'mixed', fallback: 'R' | 'L' | 'RL' = 'RL'): 'R' | 'L' | 'RL' => (m === 'R' || m === 'L' ? m : m === 'mixed' ? fallback : 'RL');

/** Scale-step offsets of each repetition of the pattern (v1: 0..N then back down). */
export function shiftsOf(c: Pick<CustomDrill, 'sequenceSteps' | 'step' | 'octaves' | 'direction'>, scaleLen: number): number[] {
  const N = Math.max(0, c.sequenceSteps | 0);
  const st = c.step ?? 1;
  const oct = c.octaves ?? 1;
  const block = scaleLen * Math.max(1, Math.ceil((N * st) / scaleLen));
  const asc: number[] = [];
  for (let o = 0; o < oct; o++)
    for (let i = 0; i <= N; i++) {
      const s = o * block + i * st;
      if (asc[asc.length - 1] !== s) asc.push(s);
    }
  const dir = c.direction ?? 'updown';
  if (dir === 'up') return asc;
  if (dir === 'down') return asc.map((s) => (s ? -s : 0));
  return [...asc, ...asc.slice(0, -1).reverse()];
}

/** The tonics this drill runs through, in the player's key order (minor lists start on A). */
export function customKeys(c: Pick<CustomDrill, 'keys' | 'minor'>, order: KeyOrder): number[] {
  const all = keysInOrder(order, !!c.minor);
  if (!c.keys || !c.keys.length) return all;
  const set = new Set(c.keys.map((k) => mod(k, 12)));
  return all.filter((k) => set.has(k));
}
/** Whether the drill goes into Today / the daily workout / the path (default yes) for this instrument. */
export function customIncluded(c: CustomDrill, where: 'today' | 'workout' | 'path', instrument: 'piano' | 'guitar' | 'bass' = 'piano'): boolean {
  if ((c.instrument ?? 'piano') !== instrument) return false;
  return where === 'today' ? c.inToday !== false : where === 'workout' ? c.inWorkout !== false : c.inPath !== false;
}
/** The goal tempo the ladder should climb toward (null = no cap). */
export const customGoalBpm = (c: CustomDrill): number | null => (c.goalBpm && c.goalBpm > 0 ? c.goalBpm : null);

// ───────────────────────────── guitar / bass ─────────────────────────────

export const isGuitarCustom = (c: Pick<CustomDrill, 'instrument'>): boolean => c.instrument === 'guitar' || c.instrument === 'bass';
export const tuningOfCustom = (c: Pick<CustomDrill, 'instrument' | 'tuning'>): Tuning => tuningById(c.tuning ?? (c.instrument === 'bass' ? 'bass' : 'standard'));
export const rootStringOf = (c: Pick<CustomDrill, 'instrument' | 'tuning' | 'rootString'>): number => {
  const n = tuningOfCustom(c).open.length;
  return c.rootString && c.rootString >= 1 && c.rootString <= n ? c.rootString : n;
};
/** The tonic pitch on the root string (fret 0–11) for a key. */
export function guitarTonic(c: Pick<CustomDrill, 'instrument' | 'tuning' | 'rootString'>, key: number): number {
  const tu = tuningOfCustom(c);
  const rs = rootStringOf(c);
  return noteAt(tu, rs, mod(key - tu.open[rs - 1], 12));
}
/** Fret window width (span) of one hand position. */
export const spanOf = (stretch?: boolean): number => (stretch ? 6 : 4);

export interface NeckSpot {
  s: number;
  f: number;
  pos: number;
}
/** Place one event (pitches sound together) in the window [lo, lo+W] on distinct strings; open strings when lo ≤ 1. */
function fitEvent(tu: Tuning, pitches: number[], lo: number, W: number, strings: number[], prevStr: number | null): { s: number; f: number }[] | null {
  const fLo = lo <= 1 ? 0 : lo;
  const hi = lo + W;
  const cands = pitches.map((p) =>
    strings
      .map((s) => ({ s, f: p - tu.open[s - 1] }))
      .filter((x) => x.f >= fLo && x.f <= hi && x.f <= 24)
      .sort((a, b) => (prevStr === null ? b.s - a.s : Math.abs(a.s - prevStr) - Math.abs(b.s - prevStr) || b.s - a.s)),
  );
  const used = new Set<number>();
  const out: { s: number; f: number }[] = [];
  const go = (i: number): boolean => {
    if (i === pitches.length) return true;
    for (const c of cands[i]) {
      if (used.has(c.s)) continue;
      used.add(c.s);
      out[i] = c;
      if (go(i + 1)) return true;
      used.delete(c.s);
    }
    return false;
  };
  return go(0) ? out.slice() : null;
}
/**
 * Place a sequence of events on the neck: at each repetition (unit) pick the hand position that fits the most of it
 * (staying near the previous one), and shift only when a note is out of reach. null = unplayable event.
 */
export function placeOnNeck(tu: Tuning, evs: { pitches: number[]; unit: number }[], lo0: number, W: number, strings: number[]): ({ s: number; f: number; pos: number }[] | null)[] {
  const out: ({ s: number; f: number; pos: number }[] | null)[] = [];
  let lo: number | null = null;
  let prevStr: number | null = null;
  const maxLo = 24 - W;
  const choose = (i: number): number | null => {
    let best: number | null = null;
    let bestScore = -Infinity;
    const ref = lo ?? lo0;
    for (let L = 0; L <= maxLo; L++) {
      let n = 0;
      let ps = prevStr;
      for (let j = i; j < evs.length && evs[j].unit === evs[i].unit; j++) {
        const f = fitEvent(tu, evs[j].pitches, L, W, strings, ps);
        if (!f) break;
        ps = f[f.length - 1].s;
        n++;
      }
      if (!n) continue;
      const score = n * 100 - Math.abs(L - ref);
      if (score > bestScore) {
        bestScore = score;
        best = L;
      }
    }
    return best;
  };
  evs.forEach((e, i) => {
    const newUnit = i === 0 || evs[i - 1].unit !== e.unit;
    let fit = lo !== null && !newUnit ? fitEvent(tu, e.pitches, lo, W, strings, prevStr) : null;
    if (!fit) {
      const L = choose(i);
      if (L === null) {
        out.push(null);
        return;
      }
      lo = L;
      fit = fitEvent(tu, e.pitches, L, W, strings, prevStr);
    }
    if (!fit) {
      out.push(null);
      return;
    }
    prevStr = fit[fit.length - 1].s;
    out.push(fit.map((x) => ({ ...x, pos: Math.max(1, lo!) })));
  });
  return out;
}

// ───────────────────────────── custom drill → Drill ─────────────────────────────

const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
function keySigOf(s: CreatorScale, k: number): string {
  switch (s) {
    case 'natural':
    case 'harmonic':
    case 'melodic':
    case 'phrygian':
      return SIG[mod(k + (s === 'phrygian' ? 8 : 3), 12)];
    case 'dorian':
      return SIG[mod(k - 2, 12)];
    case 'lydian':
      return SIG[mod(k + 5, 12)];
    case 'mixolydian':
      return SIG[mod(k + 5, 12)];
    case 'locrian':
      return SIG[mod(k + 1, 12)];
    case 'chromatic':
    case 'altered':
    case 'whole-tone':
    case 'dim-hw':
    case 'dim-wh':
      return 'C';
    default:
      return SIG[k];
  }
}

/** v1 key signatures (kept so old drills render exactly as before). */
const keySigV1 = (s: ScaleType, k: number): string => (['natural', 'harmonic', 'melodic'].includes(s) ? SIG[mod(k + 3, 12)] : s === 'chromatic' ? 'C' : SIG[k]);

const HANDS_T: Record<string, T2> = {
  R: t2('RH', 'יד ימין'),
  L: t2('LH', 'יד שמאל'),
  RL: t2('HT', 'ידיים יחד'),
  octaves: t2('HT', 'ידיים יחד'),
  contrary: t2('HT contrary', 'ידיים בתנועה נגדית'),
  independent: t2('HT', 'ידיים יחד'),
};

interface Built {
  drill: Drill;
  /** Notes that could not be placed on the neck (guitar / bass). */
  unplayable: number;
}

function build(c: CustomDrill, key: number): Built {
  const k = mod(key, 12);
  const sc = creatorScaleOf(c);
  const ints = scaleInts(sc);
  const mode = handsModeOf(c);
  const guitar = isGuitarCustom(c);
  const tonicR = guitar ? guitarTonic(c, k) : rhBase(k);
  const shifts = shiftsOf(c, ints.length);
  type Voice = { hand: Hand; tonic: number; mirror: boolean };
  const R: Voice = { hand: 'R', tonic: tonicR, mirror: false };
  const L: Voice = { hand: 'L', tonic: tonicR - 12, mirror: false };
  const voicesOf = (p: RichNote): Voice[] => {
    switch (mode) {
      case 'mixed':
        return [p.hand === 'R' ? R : L];
      case 'L':
        return [L];
      case 'octaves':
        return [R, L];
      case 'contrary':
        return [R, { ...L, mirror: true }];
      default:
        return [R];
    }
  };
  const rows: { evs: Ev[]; len: number; voices: (p: RichNote) => Voice[] }[] = [{ ...rowEvents(richOf(c.pattern, c.marks)), voices: voicesOf }];
  if (mode === 'independent' && c.lh?.length) rows.push({ ...rowEvents(richOf(c.lh, c.lhMarks)), voices: () => [L] });
  const unitLen = Math.max(...rows.map((r) => r.len));

  type Raw = { pitch: number; beat: number; dur: number; hand: Hand; chord?: number; p: RichNote; ev: number; unit: number };
  const raw: Raw[] = [];
  let beat = 0;
  let cid = 0;
  let evIx = 0;
  shifts.forEach((sh, unit) => {
    for (const row of rows) {
      for (const ev of row.evs) {
        const sns: { pitch: number; hand: Hand; p: RichNote }[] = [];
        for (const p of ev.notes)
          for (const v of row.voices(p)) {
            const deg = v.mirror ? 2 - (p.deg + sh) : p.deg + sh;
            const alt = v.mirror ? -(p.alt ?? 0) : (p.alt ?? 0);
            sns.push({ pitch: degreePitch(v.tonic, ints, deg, alt), hand: v.hand, p });
          }
        const id = sns.length > 1 ? ++cid : undefined;
        const ix = evIx++;
        for (const x of sns) raw.push({ pitch: x.pitch, beat: r6(beat + ev.beat), dur: ev.dur, hand: x.hand, ...(id !== undefined ? { chord: id } : {}), p: x.p, ev: ix, unit });
      }
    }
    beat += unitLen;
  });

  // v2 piano: keep very long / high sequences on the keyboard.
  if (c.v === 2 && !guitar && raw.length) {
    let hi = Math.max(...raw.map((x) => x.pitch));
    let lo = Math.min(...raw.map((x) => x.pitch));
    while (hi > 100 && lo - 12 >= 24) {
      for (const x of raw) x.pitch -= 12;
      hi -= 12;
      lo -= 12;
    }
  }

  let unplayable = 0;
  const neck = new Map<Raw, { s: number; f: number; pos: number }>();
  if (guitar && raw.length) {
    const tu = tuningOfCustom(c);
    const strings = (c.strings?.length ? c.strings : tu.open.map((_, i) => i + 1)).filter((s) => s >= 1 && s <= tu.open.length);
    const evMap = new Map<number, Raw[]>();
    for (const x of raw) evMap.set(x.ev, [...(evMap.get(x.ev) ?? []), x]);
    const evs = [...evMap.values()];
    const rs = rootStringOf(c);
    const tonicFret = tonicR - tu.open[rs - 1];
    const placed = placeOnNeck(
      tu,
      evs.map((e) => ({ pitches: e.map((x) => x.pitch), unit: e[0].unit })),
      Math.max(0, tonicFret - 1),
      spanOf(c.stretch),
      strings,
    );
    placed.forEach((pl, i) => {
      if (!pl) unplayable += evs[i].length;
      else evs[i].forEach((x, j) => neck.set(x, pl[j]));
    });
  }

  const notes: ExpNote[] = raw.map((x) => {
    const n: ExpNote = { pitch: x.pitch, beat: x.beat, dur: x.dur, hand: x.hand };
    if (x.chord !== undefined) n.chordId = x.chord;
    if (x.p.acc) n.accent = true;
    const spot = neck.get(x);
    if (spot) {
      n.string = spot.s;
      n.fret = spot.f;
      if (spot.f > 0) {
        n.pos = spot.pos;
        n.finger = clamp(spot.f - spot.pos + 1, 1, 4);
      }
    }
    if (guitar && x.p.tech) n.technique = x.p.tech;
    if (guitar && x.p.tech === 'bend') n.bendCents = x.p.bend ?? 200;
    return n;
  });
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);

  const sounding = rows.flatMap((r) => r.evs.flatMap((e) => e.notes));
  const durs = rows.flatMap((r) => r.evs.map((e) => e.dur)).filter((d) => d > 0);
  const minDur = durs.length ? Math.min(...durs) : 0.5;
  const beats = notes.length ? Math.max(...notes.map((n) => n.beat + n.dur)) : unitLen * shifts.length;
  const hands = guitar ? 'R' : handsOfMode(mode, c.hands);
  const twoHands = mode === 'mixed' ? true : hands === 'RL';
  const goal: DrillGoal = { evenness: c.grade?.evenness ?? true, hands: c.grade?.hands ?? twoHands };
  if (c.dynamics && c.grade?.dynamics !== false) goal.dynamics = c.dynamics;
  if (sounding.length && sounding.every((p) => p.stac)) goal.articulation = 'staccato';
  const spec: DrillSpec = { family: 'custom', kind: `custom:${c.id}`, key: k, scale: c.scale, hands };
  if (c.minor) spec.minor = true;
  if (c.octaves && c.octaves > 1) spec.octaves = c.octaves;
  if (goal.dynamics) spec.dynamics = goal.dynamics;
  if (goal.articulation) spec.articulation = goal.articulation;
  if (guitar) {
    spec.instrument = c.instrument;
    if (c.tuning) spec.tuning = c.tuning;
    if (c.stretch) spec.stretch = true;
  }
  const kn = keyName(k, !!c.minor) + (c.minor ? 'm' : '');
  const ht = guitar ? null : mode === 'mixed' ? HANDS_T[c.hands] : HANDS_T[mode];
  const title = ht ? t2(`${c.name} · ${kn} · ${ht.en}`, `${c.name} · ${kn} · ${ht.he}`) : t2(`${c.name} · ${kn}`, `${c.name} · ${kn}`);
  return {
    drill: {
      spec,
      itemId: `custom:${c.id}:${k}:${hands}`,
      title,
      notes,
      beats,
      meter: 4,
      keySig: c.v === 2 ? keySigOf(sc, k) : keySigV1(c.scale, k),
      goal,
      startBpm: c.startBpm ? clamp(Math.round(c.startBpm), 20, 300) : Math.max(40, Math.min(200, Math.round(120 * minDur))),
    },
    unplayable,
  };
}

/**
 * Custom drill → Drill in a key: the pattern, then the same pattern moved along the scale (sequence), in the chosen
 * direction / step / octaves. Hands: one hand, octaves, contrary motion, an independent LH row, or (v1) the pattern's
 * own hands. A note with length 0 sounds together with the next note (a chord); rests only advance time.
 */
export function customToDrill(c: CustomDrill, key: number): Drill {
  return build(c, key).drill;
}

// ───────────────────────────── validation (plain language, EN + HE) ─────────────────────────────

const ROW_T = { R: t2('', ''), L: t2('Left hand, ', 'יד שמאל, ') };
function rowProblems(row: CustomDrill['pattern'], marks: CustomDrill['marks'], which: 'R' | 'L'): T2[] {
  const err: T2[] = [];
  const pre = ROW_T[which];
  if (!Array.isArray(row) || row.length === 0) {
    err.push(which === 'R' ? t2('The pattern is empty — tap notes or type degrees like 1 2 3 5.', 'התבנית ריקה — הקישו תווים או כתבו דרגות כמו 1 2 3 5.') : t2('The left-hand row is empty.', 'השורה של יד שמאל ריקה.'));
    return err;
  }
  if (row.length > 128) err.push(t2(`${pre}the pattern is too long (128 notes at most).`, `${pre}התבנית ארוכה מדי (עד 128 תווים).`));
  const rich = richOf(row, marks);
  rich.forEach((p, i) => {
    const n = i + 1;
    if (!Number.isInteger(p.deg) || p.deg < -14 || p.deg > 22) err.push(t2(`${pre}note ${n}: degree ${p.deg} is too far (use −14 to 22).`, `${pre}תו ${n}: הדרגה ${p.deg} רחוקה מדי (בין ‎−14 ל-22).`));
    if (p.alt !== undefined && ![-1, 0, 1].includes(p.alt)) err.push(t2(`${pre}note ${n}: only one ♭ or ♯.`, `${pre}תו ${n}: רק ♭ או ♯ אחד.`));
    if (!(p.dur >= 0) || p.dur > 8) err.push(t2(`${pre}note ${n}: the length must be 0–8 beats.`, `${pre}תו ${n}: האורך חייב להיות 0–8 פעמות.`));
    if (p.hand !== 'R' && p.hand !== 'L') err.push(t2(`${pre}note ${n}: the hand must be R or L.`, `${pre}תו ${n}: היד חייבת להיות ימין או שמאל.`));
    if (p.rest && p.dur <= 0) err.push(t2(`${pre}rest ${n} needs a length.`, `${pre}הפסק ${n} צריך אורך.`));
  });
  if (rich[rich.length - 1].dur <= 0) err.push(t2(`${pre}the last note needs a length (a chord can’t be left open).`, `${pre}התו האחרון צריך אורך (אקורד לא יכול להישאר פתוח).`));
  if (!rich.some((p) => !p.rest)) err.push(t2(`${pre}the pattern has only rests.`, `${pre}בתבנית יש רק הפסקים.`));
  if (rich.reduce((a, p) => a + p.dur, 0) <= 0) err.push(t2(`${pre}the pattern has no length.`, `${pre}לתבנית אין אורך.`));
  return err;
}

/** Problems with a custom drill in plain language (empty list = valid), EN + HE. */
export function customProblems(c: CustomDrill): T2[] {
  const err: T2[] = [];
  if (!c.id || !/^[A-Za-z0-9_-]{1,40}$/.test(c.id)) err.push(t2('Internal id is broken (1–40 letters, digits, - or _).', 'המזהה הפנימי שגוי.'));
  if (!c.name || !c.name.trim()) err.push(t2('Give the drill a name.', 'תנו לתרגיל שם.'));
  if (c.name && c.name.length > 60) err.push(t2('The name is too long (60 letters at most).', 'השם ארוך מדי (עד 60 תווים).'));
  const sc = creatorScaleOf(c);
  if (!SCALE_INTERVALS[c.scale] || (c.mode !== undefined && !isExtra(c.mode))) err.push(t2(`Unknown scale “${sc}”.`, `סולם לא מוכר „${sc}”.`));
  err.push(...rowProblems(c.pattern, c.marks, 'R'));
  if (c.handsMode === 'independent') err.push(...rowProblems(c.lh ?? [], c.lhMarks, 'L'));
  if (!Number.isInteger(c.sequenceSteps) || c.sequenceSteps < 0 || c.sequenceSteps > 14) err.push(t2('Sequence steps: 0 to 14.', 'צעדי סקוונצה: 0 עד 14.'));
  if (!['R', 'L', 'RL'].includes(c.hands)) err.push(t2('Hands must be right, left or both.', 'הידיים: ימין, שמאל או שתיהן.'));
  if (c.handsMode !== undefined && !['R', 'L', 'octaves', 'contrary', 'independent'].includes(c.handsMode)) err.push(t2('Unknown hands setting.', 'הגדרת ידיים לא מוכרת.'));
  if (c.step !== undefined && ![1, 2, 3].includes(c.step)) err.push(t2('Step: by step, by 3rd or by 4th.', 'צעד: שכן, טרצה או קוורטה.'));
  if (c.octaves !== undefined && ![1, 2, 3, 4].includes(c.octaves)) err.push(t2('Octaves: 1 to 4.', 'אוקטבות: 1 עד 4.'));
  if (c.direction !== undefined && !['up', 'down', 'updown'].includes(c.direction)) err.push(t2('Direction: up, down or up and down.', 'כיוון: למעלה, למטה או למעלה ולמטה.'));
  if (c.keys !== undefined && (!c.keys.length || c.keys.some((k) => !Number.isInteger(k) || k < 0 || k > 11) || new Set(c.keys).size !== c.keys.length)) err.push(t2('Choose at least one key.', 'בחרו לפחות סולם אחד.'));
  if (c.startBpm !== undefined && !(c.startBpm >= 20 && c.startBpm <= 300)) err.push(t2('The start tempo must be 20–300.', 'טמפו ההתחלה חייב להיות 20–300.'));
  if (c.goalBpm !== undefined && !(c.goalBpm >= 20 && c.goalBpm <= 300)) err.push(t2('The goal tempo must be 20–300.', 'טמפו היעד חייב להיות 20–300.'));
  if (c.goalBpm !== undefined && c.startBpm !== undefined && c.goalBpm < c.startBpm) err.push(t2('The goal tempo is below the start tempo.', 'טמפו היעד נמוך מטמפו ההתחלה.'));
  if (c.grade && c.grade.evenness === false && c.grade.hands === false && !(c.grade.dynamics && c.dynamics)) err.push(t2('Grade at least one thing (evenness, hands or dynamics).', 'בחרו לפחות דבר אחד לבדיקה (אחידות, ידיים או דינמיקה).'));
  if (isGuitarCustom(c)) {
    const n = tuningOfCustom(c).open.length;
    if (c.rootString !== undefined && !(Number.isInteger(c.rootString) && c.rootString >= 1 && c.rootString <= n)) err.push(t2('Choose the string the tonic is on.', 'בחרו את המיתר של הטוניקה.'));
    if (c.strings !== undefined && (!c.strings.length || c.strings.some((s) => !Number.isInteger(s) || s < 1 || s > n))) err.push(t2('Choose at least one string.', 'בחרו לפחות מיתר אחד.'));
  }
  if (err.length) return err;
  // Every key: on the keyboard / on the neck.
  for (const k of customKeys(c, 'chromatic-up')) {
    const b = build(c, k);
    const kn = keyName(k, !!c.minor);
    if (b.unplayable) {
      err.push(t2(`Doesn’t fit on the neck in ${kn}: some notes are out of reach — try another root string, more strings or fewer octaves.`, `לא נכנס על הצוואר ב-${kn}: חלק מהתווים מחוץ להישג יד — נסו מיתר טוניקה אחר, יותר מיתרים או פחות אוקטבות.`));
      break;
    }
    if (!isGuitarCustom(c) && b.drill.notes.some((n) => n.pitch < 21 || n.pitch > 108)) {
      err.push(t2(`Goes off the keyboard in ${kn}: shorten the sequence or use fewer octaves.`, `יוצא מהמקלדת ב-${kn}: קצרו את הסקוונצה או הפחיתו אוקטבות.`));
      break;
    }
  }
  return err;
}

/** Problems with a custom drill (empty list = valid), English (see customProblems for EN + HE). */
export function validateCustom(c: CustomDrill): string[] {
  return customProblems(c).map((e) => e.en);
}
export const isValidCustom = (c: CustomDrill): boolean => validateCustom(c).length === 0;

// ───────────────────────────── the degree text format ─────────────────────────────
// Tokens: "1 2 b3 #4 8 -2" (degrees, ♭/♯), length suffix "/16 /8 /4 /2 /1" + "t" (triplet) or "." (dotted), or ":1.5" beats
// (a length sticks until changed; start = 8ths); "r" rest; "[1 3 5]/4" chord; ">" accent; "'" staccato;
// guitar: h hammer, p pull, b bend, ~ vibrato, pm palm mute, s slide. Bar lines "|" are ignored.

const DUR_TABLE: [string, number][] = [];
for (const n of [1, 2, 4, 8, 16, 32]) {
  DUR_TABLE.push([`/${n}`, 4 / n], [`/${n}.`, (4 / n) * 1.5], [`/${n}t`, (4 / n) * (2 / 3)]);
}
/** Length in beats → its suffix ("/8", "/8t", "/4.", or ":<beats>"). */
export function durSuffix(d: number): string {
  const hit = DUR_TABLE.find(([, v]) => Math.abs(v - d) < 1e-6);
  return hit ? hit[0] : `:${+d.toFixed(4)}`;
}
function parseDurSuffix(s: string): number | null {
  if (!s) return null;
  if (s[0] === ':') {
    const v = Number(s.slice(1));
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  const hit = DUR_TABLE.find(([k]) => k === s);
  return hit ? hit[1] : null;
}
const TECH_CODE: Partial<Record<NonNullable<ExpNote['technique']>, string>> = { hammer: 'h', pull: 'p', bend: 'b', vibrato: '~', mute: 'pm', slide: 's' };
const CODE_TECH: Record<string, NonNullable<ExpNote['technique']>> = { h: 'hammer', p: 'pull', b: 'bend', '~': 'vibrato', pm: 'mute', s: 'slide' };

function parseMods(s: string, into: NoteMarks): boolean {
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('pm', i)) {
      into.tech = 'mute';
      i += 2;
      continue;
    }
    const ch = s[i];
    if (ch === '>') into.acc = true;
    else if (ch === "'" || ch === '’') into.stac = true;
    else if (CODE_TECH[ch]) into.tech = CODE_TECH[ch];
    else return false;
    i++;
  }
  return true;
}

const NOTE_RE = /^(>?)([b#♭♯]?)(-?\d+)([^/:]*)(\/\d+[t.]?|:\d*\.?\d+)?(.*)$/;
const REST_RE = /^[rR](\/\d+[t.]?|:\d*\.?\d+)?$/;

/** Degree text → rich notes (+ the tokens that could not be read). */
export function parseRow(text: string, hand: Hand = 'R'): { notes: RichNote[]; bad: string[] } {
  const toks = text
    .replace(/\[/g, ' [ ')
    .replace(/\]/g, ' ]')
    .split(/[\s,|]+/)
    .filter(Boolean);
  const notes: RichNote[] = [];
  const bad: string[] = [];
  let cur = 0.5;
  let chord: RichNote[] | null = null;
  for (const tok of toks) {
    if (tok === '[') {
      chord = [];
      continue;
    }
    if (tok.startsWith(']')) {
      const d = tok.length > 1 ? parseDurSuffix(tok.slice(1)) : null;
      if (tok.length > 1 && d === null) bad.push(tok);
      if (d !== null) cur = d;
      if (chord && chord.length) {
        chord.forEach((n, i) => notes.push({ ...n, dur: i === chord!.length - 1 ? cur : 0 }));
      }
      chord = null;
      continue;
    }
    const rm = REST_RE.exec(tok);
    if (rm) {
      const d = rm[1] ? parseDurSuffix(rm[1]) : null;
      if (rm[1] && d === null) {
        bad.push(tok);
        continue;
      }
      if (d !== null) cur = d;
      if (!chord) notes.push({ deg: 1, dur: cur, hand, rest: true });
      continue;
    }
    const m = NOTE_RE.exec(tok);
    if (!m) {
      bad.push(tok);
      continue;
    }
    const marks: NoteMarks = {};
    if (m[1]) marks.acc = true;
    if (!parseMods(m[4] + m[6], marks)) {
      bad.push(tok);
      continue;
    }
    const d = m[5] ? parseDurSuffix(m[5]) : null;
    if (m[5] && d === null) {
      bad.push(tok);
      continue;
    }
    if (d !== null && !chord) cur = d;
    const alt = (m[2] === 'b' || m[2] === '♭' ? -1 : m[2] ? 1 : 0) as -1 | 0 | 1;
    const n: RichNote = { deg: Number(m[3]), ...(alt ? { alt } : {}), dur: cur, hand, ...marks };
    if (n.tech === 'bend') n.bend = 200;
    if (chord) chord.push(n);
    else notes.push(n);
  }
  if (chord && chord.length) chord.forEach((n, i) => notes.push({ ...n, dur: i === chord!.length - 1 ? cur : 0 }));
  return { notes, bad };
}

const noteTok = (n: RichNote): string => `${n.acc ? '>' : ''}${n.alt === -1 ? 'b' : n.alt === 1 ? '#' : ''}${n.deg}${n.tech && TECH_CODE[n.tech] ? TECH_CODE[n.tech] : ''}${n.stac ? "'" : ''}`;

/** Rich notes → degree text (lengths written only when they change). */
export function rowToText(notes: RichNote[]): string {
  const out: string[] = [];
  let cur = 0.5;
  let group: RichNote[] = [];
  const suf = (d: number): string => {
    if (Math.abs(d - cur) < 1e-6) return '';
    cur = d;
    return durSuffix(d);
  };
  for (const n of notes) {
    if (n.rest) {
      if (group.length) {
        // A chord left open before a rest: close it with the rest's length.
        out.push(`[${group.map(noteTok).join(' ')}]${suf(n.dur)}`);
        group = [];
        out.push('r');
        continue;
      }
      out.push(`r${suf(n.dur)}`);
      continue;
    }
    if (n.dur <= 0) {
      group.push(n);
      continue;
    }
    if (group.length) {
      out.push(`[${[...group, n].map(noteTok).join(' ')}]${suf(n.dur)}`);
      group = [];
    } else out.push(`${noteTok(n)}${suf(n.dur)}`);
  }
  if (group.length) out.push(`[${group.map(noteTok).join(' ')}]`);
  return out.join(' ');
}

/** Drop the last event (a note, a chord or a rest) of a row. */
export function undoLast(notes: RichNote[]): RichNote[] {
  if (!notes.length) return notes;
  let i = notes.length - 1;
  while (i > 0 && notes[i - 1].dur <= 0 && !notes[i - 1].rest) i--;
  return notes.slice(0, i);
}

// ───────────────────────────── recording (MIDI) → pattern ─────────────────────────────

export interface PlayedIn {
  pitch: number;
  on: number;
  off?: number | null;
  vel?: number;
}
export interface QuantOpts {
  key: number;
  scale: CreatorScale;
  /** Tempo of the recording (♩); absent = the median gap is an 8th. */
  bpm?: number;
  grid?: 'auto' | '8' | '16' | 'triplet';
  /** Split point (MIDI): below = LH. Absent = one hand by the register (from G3 up = RH), in `rh`. */
  split?: number;
}

const median = (xs: number[]): number => {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Played notes → rows of rich notes: onsets quantised to the nearest 16th / 8th / triplet ('auto' picks per note),
 * notes within 40 ms (or on the same grid point) → a chord, releases → shorter notes + rests, loud notes → accents,
 * hands from the split point. Degrees are relative to the tonic (of `key`) at or below each hand's first note.
 */
export function quantizePlayed(notes: PlayedIn[], o: QuantOpts): { rh: RichNote[]; lh: RichNote[]; bpm: number } {
  if (!notes.length) return { rh: [], lh: [], bpm: o.bpm ?? 80 };
  const ns = notes.slice().sort((a, b) => a.on - b.on || a.pitch - b.pitch);
  type G = { on: number; ns: PlayedIn[] };
  const groups: G[] = [];
  for (const n of ns) {
    const g = groups[groups.length - 1];
    if (g && n.on - g.on <= 40) g.ns.push(n);
    else groups.push({ on: n.on, ns: [n] });
  }
  const iois = groups
    .slice(1)
    .map((g, i) => g.on - groups[i].on)
    .filter((x) => x > 0);
  const beatMs = o.bpm ? 60000 / o.bpm : iois.length ? 2 * median(iois) : 1000;
  const grid = o.grid ?? 'auto';
  const q = (b: number): number => {
    const q4 = Math.round(b * 4) / 4;
    const q2 = Math.round(b * 2) / 2;
    const q3 = Math.round(b * 3) / 3;
    if (grid === '8') return q2;
    if (grid === '16') return q4;
    if (grid === 'triplet') return q3;
    return Math.abs(b - q4) <= Math.abs(b - q3) + 0.02 ? q4 : q3;
  };
  const minLen = grid === 'triplet' ? 1 / 3 : 0.25;
  // Quantise onsets; two groups on the same grid point merge into one chord.
  const qg: { b: number; ns: PlayedIn[] }[] = [];
  for (const g of groups) {
    const b = r6(q((g.on - groups[0].on) / beatMs));
    const last = qg[qg.length - 1];
    if (last && b <= last.b + 1e-6) last.ns.push(...g.ns);
    else qg.push({ b, ns: g.ns.slice() });
  }
  const vels = ns.map((n) => n.vel).filter((v): v is number => typeof v === 'number');
  const velMed = vels.length >= 4 ? median(vels) : null;
  const ints = scaleInts(o.scale);
  const oneHand: Hand = median(ns.map((n) => n.pitch)) >= 55 ? 'R' : 'L';
  const handOf = (p: number): Hand => (o.split === undefined ? oneHand : p < o.split ? 'L' : 'R');

  const rowFor = (h: Hand): RichNote[] => {
    const evs = qg.map((g) => ({ b: g.b, ns: g.ns.filter((n) => handOf(n.pitch) === h) })).filter((e) => e.ns.length);
    if (!evs.length) return [];
    const first = evs[0].ns.slice().sort((a, b) => a.pitch - b.pitch)[0].pitch;
    const tonic = first - mod(first - o.key, 12);
    const gaps = evs.slice(1).map((e, i) => e.b - evs[i].b);
    const typical = gaps.length ? median(gaps) : 0.5;
    const out: RichNote[] = [];
    let cursor = o.split === undefined ? evs[0].b : 0;
    evs.forEach((e, i) => {
      if (e.b > cursor + 1e-6) out.push({ deg: 1, dur: r6(e.b - cursor), hand: h, rest: true });
      const offs = e.ns.map((n) => n.off).filter((x): x is number => typeof x === 'number');
      const sound = offs.length ? Math.max(minLen, r6(q((Math.max(...offs) - Math.min(...e.ns.map((n) => n.on))) / beatMs))) : null;
      const gap = i < evs.length - 1 ? r6(evs[i + 1].b - e.b) : (sound ?? typical);
      let dur = gap;
      let rest = 0;
      if (sound !== null && sound < gap - 0.49) {
        dur = sound;
        rest = r6(gap - sound);
      }
      const ps = e.ns.slice().sort((a, b) => a.pitch - b.pitch);
      ps.forEach((n, j) => {
        const d = pitchToDegree(n.pitch, tonic, ints) ?? nearestDegree(n.pitch, tonic, ints);
        const acc = velMed !== null && typeof n.vel === 'number' && n.vel >= velMed + 18;
        out.push({ deg: d.deg, ...(d.alt ? { alt: d.alt } : {}), dur: j === ps.length - 1 ? dur : 0, hand: h, ...(acc ? { acc: true } : {}) });
      });
      if (rest > 0) out.push({ deg: 1, dur: rest, hand: h, rest: true });
      cursor = e.b + gap;
    });
    return out;
  };
  if (o.split === undefined) return { rh: rowFor(oneHand), lh: [], bpm: Math.round(60000 / beatMs) };
  return { rh: rowFor('R'), lh: rowFor('L'), bpm: Math.round(60000 / beatMs) };
}
/** The nearest scale degree (for pitches ±1 cannot reach, e.g. inside a pentatonic gap). */
function nearestDegree(p: number, tonic: number, ints: number[]): { deg: number; alt: -1 | 0 | 1 } {
  for (let d = 1; d < 12; d++) {
    const below = pitchToDegree(p - d, tonic, ints);
    if (below && below.alt === 0) return below;
  }
  return { deg: 1, alt: 0 };
}

/**
 * Make a pattern by playing it once (MIDI) in any key: pitches → scale degrees of `scale` on `key` (with ±1
 * alterations for notes outside the scale), onsets → lengths quantised (the median gap = one 8th; 16ths and triplets
 * recognised), notes within 40 ms → a chord (length 0 before the last). The hand follows the register (from G3 up = RH).
 */
export function patternFromPlayed(notes: { pitch: number; on: number; off?: number | null; vel?: number }[], key: number, scale: ScaleType): CustomDrill['pattern'] {
  const { rh } = quantizePlayed(notes, { key, scale });
  return rh.filter((n) => !n.rest).map(({ deg, alt, dur, hand }) => ({ deg, ...(alt ? { alt } : {}), dur, hand }));
}

// ───────────────────────────── copy a built-in drill ─────────────────────────────

/** A built-in Drill → an editable custom drill (its notes as degrees), or null when it can't be expressed. */
export function customFromDrill(d: Drill, id: string, createdAt: string, name?: string): CustomDrill | null {
  if (!d.notes.length) return null;
  const k = mod(d.spec.key, 12);
  const guitar = d.spec.family.startsWith('g-') || d.spec.family.startsWith('b-') || d.spec.instrument === 'guitar' || d.spec.instrument === 'bass';
  const tries: ScaleType[] = [scaleTypeOf(d.spec), 'major', 'chromatic'];
  for (const scale of tries) {
    const ints = SCALE_INTERVALS[scale];
    const rowOf = (h: Hand, tonic: number): RichNote[] | null => {
      const ns = d.notes.filter((n) => n.hand === h || guitar);
      if (!ns.length) return [];
      const beats = [...new Set(ns.map((n) => r6(n.beat)))].sort((a, b) => a - b);
      const out: RichNote[] = [];
      let cursor = 0;
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        const at = ns.filter((n) => r6(n.beat) === b).sort((x, y) => x.pitch - y.pitch);
        if (b > cursor + 1e-6) out.push({ deg: 1, dur: r6(b - cursor), hand: guitar ? 'R' : h, rest: true });
        const gap = i < beats.length - 1 ? r6(beats[i + 1] - b) : Math.max(...at.map((n) => n.dur));
        const held = Math.max(...at.map((n) => n.dur));
        const dur = held < gap - 0.49 ? r6(held) : gap;
        for (let j = 0; j < at.length; j++) {
          const n = at[j];
          const dg = pitchToDegree(n.pitch, tonic, ints);
          if (!dg || dg.deg < -14 || dg.deg > 22) return null;
          const r: RichNote = { deg: dg.deg, ...(dg.alt ? { alt: dg.alt } : {}), dur: j === at.length - 1 ? dur : 0, hand: guitar ? 'R' : h };
          if (n.accent) r.acc = true;
          if (guitar && n.technique && TECH_CODE[n.technique]) r.tech = n.technique;
          if (guitar && n.technique === 'bend') r.bend = n.bendCents ?? 200;
          out.push(r);
        }
        if (dur < gap) out.push({ deg: 1, dur: r6(gap - dur), hand: guitar ? 'R' : h, rest: true });
        cursor = b + gap;
      }
      return out.length > 128 ? null : out;
    };
    let rh: RichNote[] | null;
    let lh: RichNote[] | null = [];
    let instrument: CustomDrill['instrument'];
    if (guitar) {
      instrument = d.spec.instrument === 'bass' || d.spec.family === 'g-bass' || d.spec.family.startsWith('b-') ? 'bass' : 'guitar';
      const low = Math.min(...d.notes.map((n) => n.pitch));
      const tonic = low - mod(low - k, 12);
      rh = rowOf('R', tonic);
    } else {
      rh = rowOf('R', rhBase(k));
      lh = rowOf('L', rhBase(k) - 12);
    }
    if (!rh || !lh || (!rh.length && !lh.length)) continue;
    let handsMode: HandsMode;
    let pattern = rh;
    let lhRow: RichNote[] | undefined;
    if (guitar || !lh.length) handsMode = 'R';
    else if (!rh.length) {
      handsMode = 'L';
      pattern = lh;
    } else {
      const R = d.notes.filter((n) => n.hand === 'R');
      const L = d.notes.filter((n) => n.hand === 'L');
      const oct = R.length === L.length && R.every((n, i) => L[i].pitch === n.pitch - 12 && L[i].beat === n.beat);
      handsMode = oct ? 'octaves' : 'independent';
      if (!oct) lhRow = lh;
    }
    const p = splitRich(pattern);
    const c: CustomDrill = {
      id,
      name: (name ?? d.title.en).slice(0, 60),
      scale,
      pattern: p.pattern,
      ...(p.marks ? { marks: p.marks } : {}),
      sequenceSteps: 0,
      hands: handsOfMode(handsMode),
      createdAt,
      v: 2,
      handsMode,
      direction: 'up',
      startBpm: d.startBpm,
      from: d.spec.kind,
    };
    if (lhRow) {
      const l = splitRich(lhRow);
      c.lh = l.pattern;
      if (l.marks) c.lhMarks = l.marks;
    }
    if (d.spec.minor) c.minor = true;
    if (d.goal.dynamics) c.dynamics = d.goal.dynamics;
    if (instrument) {
      c.instrument = instrument;
      if (d.spec.tuning) c.tuning = d.spec.tuning;
      if (d.spec.stretch) c.stretch = true;
    }
    if (isValidCustom(c)) return c;
  }
  return null;
}

// ───────────────────────────── presets ─────────────────────────────

export interface Preset {
  id: string;
  title: T2;
  /** Only offered on guitar / bass. */
  guitarOnly?: boolean;
  text: string;
  drill: Partial<CustomDrill>;
}
export const PRESETS: Preset[] = [
  { id: 'hanon', title: t2('Hanon-style group', 'קבוצה בסגנון האנון'), text: '1/16 3 4 5 6 5 4 3', drill: { sequenceSteps: 6, handsMode: 'octaves', startBpm: 60, goalBpm: 108 } },
  { id: '1235', title: t2('1-2-3-5 pattern', 'תבנית 1-2-3-5'), text: '1/8 2 3 5', drill: { sequenceSteps: 6, handsMode: 'R', startBpm: 72, goalBpm: 132 } },
  { id: 'enclosure', title: t2('Enclosure (approach the 3rd)', 'כיתור (גישה לטרצה)'), text: '4/8 #2 3/4', drill: { sequenceSteps: 6, handsMode: 'R', startBpm: 72, goalBpm: 140 } },
  { id: 'harris', title: t2('Barry Harris: arpeggio up, scale down', 'בארי האריס: ארפג׳ למעלה, סולם למטה'), text: '1/8 3 5 7 9 8 7 6', drill: { scale: 'bebop-dom', sequenceSteps: 3, step: 2, direction: 'up', handsMode: 'R', startBpm: 72, goalBpm: 160 } },
  { id: 'thirds', title: t2('Broken thirds', 'טרצות שבורות'), text: '1/8 3', drill: { sequenceSteps: 7, handsMode: 'R', startBpm: 72, goalBpm: 144 } },
  { id: 'triplet-arp', title: t2('Triplet arpeggio', 'ארפג׳ בטריולות'), text: '1/8t 3 5 8 5 3', drill: { sequenceSteps: 6, handsMode: 'R', startBpm: 60, goalBpm: 120 } },
  { id: '3nps-4s', title: t2('3 notes per string, in 4s', '3 תווים למיתר, בקבוצות של 4'), guitarOnly: true, text: '1/16 2 3 4', drill: { sequenceSteps: 10, direction: 'updown', stretch: true, startBpm: 60, goalBpm: 120 } },
  { id: 'legato-trill', title: t2('Legato trill (hammer / pull)', 'טריל לגאטו (האמר / פול)'), text: '1/16 2h 1p 2h 1p 2h 1p 2h', drill: { sequenceSteps: 6, handsMode: 'R', startBpm: 60, goalBpm: 120 } },
];
/** A preset as a custom drill for an instrument. */
export function presetDrill(p: Preset, id: string, createdAt: string, instrument: 'piano' | 'guitar' | 'bass' = 'piano', lang: 'en' | 'he' = 'en'): CustomDrill {
  const { notes } = parseRow(p.text, 'R');
  const s = splitRich(notes);
  const c: CustomDrill = {
    id,
    name: p.title[lang],
    scale: 'major',
    sequenceSteps: 0,
    hands: 'R',
    createdAt,
    v: 2,
    ...p.drill,
    pattern: s.pattern,
    ...(s.marks ? { marks: s.marks } : {}),
  };
  if (instrument !== 'piano') {
    c.instrument = instrument;
    c.handsMode = 'R';
  }
  c.hands = handsOfMode(c.handsMode ?? 'R');
  return c;
}

// ───────────────────────────── listening ─────────────────────────────

/** A drill as note events for the piano engine (accents louder, staccato short, the dynamics goal shaped). */
export function drillToEvents(d: Drill, bpm: number): { events: NoteEvent[]; length: number } {
  const sec = 60 / bpm;
  const base = d.goal.dynamics === 'even-p' || d.goal.dynamics === 'even-pp' ? 0.38 : d.goal.dynamics === 'even-f' || d.goal.dynamics === 'even-ff' ? 0.82 : 0.6;
  const n = d.notes.length;
  const events: NoteEvent[] = d.notes.map((x, i) => {
    let v = base;
    if (d.goal.dynamics === 'cresc') v = 0.32 + (0.55 * i) / Math.max(1, n - 1);
    if (x.accent) v = Math.min(1, v + 0.25);
    return { midi: x.pitch, start: x.beat * sec, duration: Math.max(0.05, x.dur * sec * (d.goal.articulation === 'staccato' ? 0.45 : 0.95)), velocity: v };
  });
  return { events, length: d.beats * sec + 0.4 };
}

// ───────────────────────────── share codes ─────────────────────────────

const SHARE_PREFIX = 'TTD2-';
const b64e = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64d = (s: string): string => {
  let x = s.replace(/-/g, '+').replace(/_/g, '/');
  while (x.length % 4) x += '=';
  const bin = atob(x);
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
};
const SHARE_SKIP = new Set(['id', 'createdAt', 'pattern', 'marks', 'lh', 'lhMarks', 'name', 'scale', 'sequenceSteps', 'hands']);

/** A drill as a short versioned code (base64url JSON; the pattern as degree text). */
export function shareCode(c: CustomDrill): string {
  const o: Record<string, unknown> = { _: 2, n: c.name, s: c.scale, q: c.sequenceSteps, h: c.hands };
  if (handsModeOf(c) === 'mixed') o.P = c.pattern.map((p) => [p.deg, p.alt ?? 0, p.dur, p.hand]);
  else o.p = rowToText(richOf(c.pattern, c.marks));
  if (handsModeOf(c) === 'mixed' && c.marks) o.M = c.marks;
  if (c.lh?.length) o.l = rowToText(richOf(c.lh, c.lhMarks));
  for (const [k, v] of Object.entries(c)) if (!SHARE_SKIP.has(k) && v !== undefined) o[k] = v;
  return SHARE_PREFIX + b64e(JSON.stringify(o));
}

/** Read a share code. `id` / `createdAt` are the new drill's (default: a fresh id, now). */
export function readShareCode(code: string, id?: string, createdAt?: string): { drill: CustomDrill } | { error: T2 } {
  const bad = { error: t2('That code isn’t a drill code.', 'זה לא קוד של תרגיל.') };
  const s = code.trim().replace(/\s+/g, '');
  if (!s.toUpperCase().startsWith(SHARE_PREFIX)) return bad;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(b64d(s.slice(SHARE_PREFIX.length))) as Record<string, unknown>;
  } catch {
    return bad;
  }
  if (!o || typeof o !== 'object') return bad;
  if (typeof o._ !== 'number') return bad;
  if (o._ > 2) return { error: t2('This drill was made in a newer version — update the app.', 'התרגיל נוצר בגרסה חדשה יותר — עדכנו את האפליקציה.') };
  const hands = (['R', 'L', 'RL'].includes(o.h as string) ? o.h : 'R') as CustomDrill['hands'];
  const rowHand: Hand = o.handsMode === 'L' || (!o.handsMode && hands === 'L') ? 'L' : 'R';
  let pattern: CustomDrill['pattern'];
  let marks: CustomDrill['marks'];
  if (Array.isArray(o.P)) {
    pattern = (o.P as [number, number, number, Hand][]).map(([deg, alt, dur, hand]) => ({ deg, ...(alt ? { alt: alt as -1 | 1 } : {}), dur, hand }));
    if (Array.isArray(o.M)) marks = o.M as CustomDrill['marks'];
  } else {
    const r = parseRow(String(o.p ?? ''), rowHand);
    if (r.bad.length) return bad;
    const sp = splitRich(r.notes);
    pattern = sp.pattern;
    marks = sp.marks;
  }
  const c: CustomDrill = {
    id: id ?? `c${Date.now().toString(36)}`,
    name: String(o.n ?? 'Drill').slice(0, 60),
    scale: (o.s as ScaleType) ?? 'major',
    pattern,
    sequenceSteps: Number(o.q ?? 0),
    hands,
    createdAt: createdAt ?? new Date().toISOString(),
  };
  if (marks) c.marks = marks;
  const KNOWN = new Set(['v', 'marks', 'handsMode', 'direction', 'step', 'octaves', 'keys', 'minor', 'mode', 'startBpm', 'goalBpm', 'dynamics', 'grade', 'inToday', 'inWorkout', 'inPath', 'instrument', 'tuning', 'rootString', 'strings', 'stretch', 'from']);
  for (const [k, v] of Object.entries(o)) if (KNOWN.has(k) && k !== 'marks') (c as unknown as Record<string, unknown>)[k] = v;
  if (typeof o.l === 'string' && o.l) {
    const r = parseRow(o.l, 'L');
    if (r.bad.length) return bad;
    const sp = splitRich(r.notes);
    c.lh = sp.pattern;
    if (sp.marks) c.lhMarks = sp.marks;
  }
  const probs = customProblems(c);
  if (probs.length) return { error: probs[0] };
  return { drill: c };
}
