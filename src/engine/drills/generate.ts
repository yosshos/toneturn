// Technique drills (spec AI §4–§5): DrillSpec → Drill (the notes to play and how they are judged).
// Pure and deterministic. Fingerings: research §1.1 (help only, never graded; omitted where unsure).

import { generateGuitar } from './guitar';
import { generateDrums } from './drums';
import { chartKind, type ChartMode, type ChartVoicing, type CompRhythm } from './chartDrills';
import { chartDrillData, roles } from './chartDrills';
import { applyForm, type FormPlan, type FormSection } from './roadmap';
import { parseChart } from '../charts';
import type { Drill, DrillGoal, DrillSpec, DynamicsGoal, ExpNote, FamilyId, Hand, KeyOrder, Motion, ScaleType, Variant } from './types';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });

export const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// ───────────────────────────── scales, keys, names ─────────────────────────────

/** Ascending scale intervals from the tonic (one octave, without the octave). */
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  'bebop-dom': [0, 2, 4, 5, 7, 9, 10, 11],
  'six-dim': [0, 2, 4, 5, 7, 8, 9, 11],
  blues: [0, 3, 5, 6, 7, 10],
  pentatonic: [0, 2, 4, 7, 9],
};

/** Intervals for a direction: melodic minor comes down natural. */
export function scaleIntervals(type: ScaleType, down = false): number[] {
  return type === 'melodic' && down ? SCALE_INTERVALS.natural : SCALE_INTERVALS[type];
}

/** Pitch of scale index k (0 = tonic, 7 = tonic an octave up for 7-note scales, negative = below). */
export function degPitch(tonic: number, ints: number[], k: number): number {
  const n = ints.length;
  return tonic + 12 * Math.floor(k / n) + ints[mod(k, n)];
}

/** The scale a spec means (minor without a scale → harmonic minor). */
export function scaleTypeOf(spec: DrillSpec): ScaleType {
  if (spec.scale) return spec.scale;
  return spec.minor ? 'harmonic' : 'major';
}

const MAJOR_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Display name of a tonic (♭ for majors, ♯ where usual for minors). */
export function keyName(key: number, minor = false): string {
  return (minor ? MINOR_NAMES : MAJOR_NAMES)[mod(key, 12)];
}

/** RH register: the tonic between G3 and F♯4 (so 2 octaves stay inside C4–C6-ish). */
export function rhBase(pc: number): number {
  const p = mod(pc, 12);
  return p <= 6 ? 60 + p : 48 + p;
}
/** The pitch with pitch class pc inside [lo, lo+11]. */
const pitchIn = (pc: number, lo: number): number => lo + mod(pc - lo, 12);

// ───────────────────────────── key orders ─────────────────────────────

const DIFF_MAJOR = [0, 7, 2, 9, 4, 5, 11, 10, 3, 8, 1, 6];
const DIFF_MINOR = [9, 4, 2, 11, 7, 0, 6, 5, 1, 8, 10, 3];

/** The 12 tonics in the chosen order (spec §4.1 key orders; minor lists start on A). */
export function keysInOrder(order: KeyOrder, minor = false): number[] {
  const start = minor ? 9 : 0;
  const seq = (step: number) => Array.from({ length: 12 }, (_, i) => mod(start + i * step, 12));
  switch (order) {
    case 'chromatic-up':
      return seq(1);
    case 'chromatic-down':
      return seq(-1);
    case 'fifths-up':
      return seq(7);
    case 'fifths-down':
      return seq(5);
    case 'difficulty':
      return (minor ? DIFF_MINOR : DIFF_MAJOR).slice();
  }
}

// ───────────────────────────── fingerings (research §1.1) ─────────────────────────────

interface FingRow {
  r: number[];
  l: number[];
}
const WHITE: FingRow = {
  r: [1, 2, 3, 1, 2, 3, 4, 5],
  l: [5, 4, 3, 2, 1, 3, 2, 1],
};
const B_ROW: FingRow = {
  r: [1, 2, 3, 1, 2, 3, 4, 5],
  l: [4, 3, 2, 1, 4, 3, 2, 1],
};
const F_ROW: FingRow = {
  r: [1, 2, 3, 4, 1, 2, 3, 4],
  l: [5, 4, 3, 2, 1, 3, 2, 1],
};
const FLAT_L = [3, 2, 1, 4, 3, 2, 1, 3];

/** Major scales, one octave from the tonic, ascending (research table). */
export const MAJOR_FINGERING: Record<number, FingRow> = {
  0: WHITE,
  7: WHITE,
  2: WHITE,
  9: WHITE,
  4: WHITE,
  11: B_ROW,
  5: F_ROW,
  10: { r: [2, 1, 2, 3, 1, 2, 3, 4], l: FLAT_L },
  3: { r: [3, 1, 2, 3, 4, 1, 2, 3], l: FLAT_L },
  8: { r: [3, 4, 1, 2, 3, 1, 2, 3], l: FLAT_L },
  1: { r: [2, 3, 1, 2, 3, 4, 1, 2], l: FLAT_L },
  6: { r: [2, 3, 4, 1, 2, 3, 1, 2], l: [4, 3, 2, 1, 3, 2, 1, 4] },
};

/** Harmonic minor (research table + the white-key rows; B minor = B major fingering). */
export const MINOR_FINGERING: Record<number, FingRow> = {
  9: WHITE,
  4: WHITE,
  2: WHITE,
  7: WHITE,
  0: WHITE,
  11: B_ROW,
  6: { r: [3, 4, 1, 2, 3, 1, 2, 3], l: [4, 3, 2, 1, 3, 2, 1, 4] },
  1: { r: [3, 4, 1, 2, 3, 1, 2, 3], l: [3, 2, 1, 4, 3, 2, 1, 3] },
  8: { r: [3, 4, 1, 2, 3, 1, 2, 3], l: [3, 2, 1, 3, 2, 1, 4, 3] },
  3: { r: [3, 1, 2, 3, 4, 1, 2, 3], l: [2, 1, 4, 3, 2, 1, 3, 2] },
  10: { r: [2, 1, 2, 3, 1, 2, 3, 4], l: [2, 1, 3, 2, 1, 4, 3, 2] },
  5: F_ROW,
};

/**
 * Melodic minor going up where it differs from the harmonic row (PIANO_AUDIT C1): F♯ and C♯ have a black 6th and 7th
 * going up, so the RH thumb moves to the 3rd and the raised 7th (2 3 1 2 3 4 1 2, as F♯ / D♭ major). Every other key
 * keeps its harmonic-minor row; the LH rows hold in every key.
 */
const MELODIC_UP_RH: Record<number, number[]> = {
  6: [2, 3, 1, 2, 3, 4, 1, 2],
  1: [2, 3, 1, 2, 3, 4, 1, 2],
};

/**
 * The fingering row of a scale in one direction. Natural minor (and melodic minor coming down, which is natural) uses
 * the harmonic-minor rows: the changed 7th is a white key in every key where the thumb falls on it, and checked key by
 * key in PIANO_AUDIT §2 (C1).
 */
function fingRowFor(type: ScaleType, key: number, down = false): FingRow | null {
  const k = mod(key, 12);
  if (type === 'major') return MAJOR_FINGERING[k];
  if (type === 'harmonic' || type === 'natural') return MINOR_FINGERING[k];
  if (type === 'melodic') return !down && MELODIC_UP_RH[k] ? { r: MELODIC_UP_RH[k], l: MINOR_FINGERING[k].l } : MINOR_FINGERING[k];
  return null;
}

/** Finger for scale index k of one hand's run (kLo / kHi = lowest / highest index the hand plays). `turn` = the row going down (the top note starts the way down). */
function scaleFinger(row: FingRow, hand: Hand, k: number, kLo: number, kHi: number, turn: FingRow = row): number {
  const f = hand === 'R' ? row.r : row.l;
  const d = mod(k, 7);
  if (d !== 0) return f[d];
  if (k === kLo) return f[0];
  if (k === kHi) return (hand === 'R' ? turn.r : turn.l)[7];
  // A tonic in the middle of a run: RH keeps the thumb only when the scale starts with it (e.g. B♭: 4).
  return hand === 'R' ? (f[0] === 1 ? 1 : f[7]) : f[7];
}

const isBlack = (p: number): boolean => [1, 3, 6, 8, 10].includes(mod(p, 12));

/** Chromatic: 3 on black keys, 1 on white, 2 on F and C (RH) / E and B (LH) between two whites. */
function chromaticFinger(hand: Hand, pitch: number, first: boolean): number {
  if (isBlack(pitch)) return 3;
  const pc = mod(pitch, 12);
  if (first) return 1;
  if (hand === 'R') return pc === 5 || pc === 0 ? 2 : 1;
  return pc === 4 || pc === 11 ? 2 : 1;
}

// ───────────────────────────── note buffer ─────────────────────────────

interface SN {
  pitch: number;
  hand: Hand;
  finger?: number;
  accent?: boolean;
  chordTone?: boolean;
}
type Step = SN[];

class Buf {
  notes: ExpNote[] = [];
  private cid = 0;
  /** Add simultaneous notes; ≥ 2 notes (or force) share a new chordId. */
  add(beat: number, dur: number, sns: SN[], force = false): number | undefined {
    const id = sns.length > 1 || force ? ++this.cid : undefined;
    for (const s of sns) {
      const n: ExpNote = {
        pitch: s.pitch,
        beat: r6(beat),
        dur: r6(dur),
        hand: s.hand,
      };
      if (s.finger) n.finger = s.finger;
      if (id !== undefined) n.chordId = id;
      if (s.accent) n.accent = true;
      if (s.chordTone !== undefined) n.chordTone = s.chordTone;
      this.notes.push(n);
    }
    return id;
  }
  /** Lay out steps in a steady stream of `unit` beats with a rhythm variant and accent goal. Returns the end beat. */
  steps(steps: Step[], unit: number, variant?: Variant, dyn?: DynamicsGoal, start = 0, lastDur?: number): number {
    let end = start;
    steps.forEach((st, i) => {
      let b = start + i * unit;
      let d = unit;
      if (variant === 'dotted' || variant === 'rev-dotted') {
        const p = Math.floor(i / 2) * 2 * unit;
        const second = i % 2 === 1;
        const long = variant === 'dotted' ? !second : second;
        b = start + p + (second ? (variant === 'dotted' ? 1.5 : 0.5) * unit : 0);
        d = long ? 1.5 * unit : 0.5 * unit;
      }
      if (i === steps.length - 1) d = lastDur ?? Math.max(unit, 1);
      const acc =
        (variant === 'groups3' && i % 3 === 0) ||
        (variant === 'groups4' && i % 4 === 0) ||
        (variant === 'accent-shift' && i % 4 === Math.floor(i / 4) % 4) ||
        (dyn === 'accent3' && i % 3 === 0) ||
        (dyn === 'accent4' && i % 4 === 0);
      this.add(
        b,
        d,
        st.map((s) => (acc ? { ...s, accent: true } : s)),
      );
      end = Math.max(end, b + d);
    });
    return end;
  }
}

// ───────────────────────────── ids, titles, goals, tempo ─────────────────────────────

/** Stable id of an item: family + kind + key + hands + every option that changes the notes or the goal. */
export function itemIdOf(s: DrillSpec): string {
  const p: string[] = [s.family, s.kind, String(mod(s.key, 12)), s.hands];
  if (s.scale) p.push(s.scale);
  if (s.minor) p.push('m');
  if (s.motion && s.motion !== 'parallel') p.push(s.motion);
  if (s.octaves) p.push('o' + s.octaves);
  if (s.articulation) p.push(s.articulation);
  if (s.dynamics) p.push(s.dynamics);
  if (s.variant && s.variant !== 'even') p.push(s.variant);
  if (s.perBeat) p.push('pb' + s.perBeat);
  if (s.swing) p.push('sw');
  if (s.option !== undefined) p.push('op' + s.option);
  return p.join(':');
}

const HANDS_T: Record<'R' | 'L' | 'RL', T2> = {
  R: t('RH', 'יד ימין'),
  L: t('LH', 'יד שמאל'),
  RL: t('HT', 'ידיים יחד'),
};
const SCALE_T: Record<ScaleType, T2> = {
  major: t('major', "מז'ור"),
  harmonic: t('harmonic minor', 'מינור הרמוני'),
  melodic: t('melodic minor', 'מינור מלודי'),
  natural: t('natural minor', 'מינור טבעי'),
  chromatic: t('chromatic', 'כרומטי'),
  mixolydian: t('dominant (mixolydian)', 'דומיננטי (מיקסולידי)'),
  'bebop-dom': t('bebop dominant', 'ביבופ דומיננטי'),
  'six-dim': t('6th-diminished', 'שישית-מוקטן'),
  blues: t('blues', 'בלוז'),
  pentatonic: t('pentatonic', 'פנטטוני'),
};
const MOTION_T: Record<Motion, T2> = {
  parallel: t('parallel', 'מקביל'),
  contrary: t('contrary motion', 'תנועה נגדית'),
  third: t('a 3rd apart', 'בהפרש טרצה'),
  sixth: t('a 6th apart', 'בהפרש סקסטה'),
  tenth: t('a 10th apart', 'בהפרש דצימה'),
  formula: t('formula pattern', 'תבנית פורמולה'),
};
const ART_T = {
  legato: t('legato', 'לגאטו'),
  staccato: t('staccato', 'סטקטו'),
  portato: t('portato', 'פורטטו'),
};
const DYN_T: Record<DynamicsGoal, T2> = {
  'even-mf': t('even mf', 'אחיד mf'),
  'even-p': t('even p', 'אחיד p'),
  'even-f': t('even f', 'אחיד f'),
  'even-pp': t('even pp', 'אחיד pp'),
  'even-ff': t('even ff', 'אחיד ff'),
  cresc: t('cresc. up, dim. down', 'קרשנדו למעלה, דימינואנדו למטה'),
  accent3: t('accent every 3rd', 'הטעמה כל 3'),
  accent4: t('accent every 4th', 'הטעמה כל 4'),
  voicing: t('top voice sings', 'הקול העליון בולט'),
};
const VAR_T: Record<Variant, T2> = {
  even: t('even', 'שווה'),
  dotted: t('dotted long-short', 'מנוקד ארוך-קצר'),
  'rev-dotted': t('short-long', 'קצר-ארוך'),
  groups3: t('groups of 3', 'קבוצות של 3'),
  groups4: t('groups of 4', 'קבוצות של 4'),
  'accent-shift': t('moving accent', 'הטעמה נודדת'),
};

function extras(s: DrillSpec): T2[] {
  const out: T2[] = [];
  if (s.articulation) out.push(ART_T[s.articulation]);
  if (s.dynamics) out.push(DYN_T[s.dynamics]);
  if (s.variant && s.variant !== 'even') out.push(VAR_T[s.variant]);
  if (s.perBeat === 3) out.push(t('triplets', 'טריולות'));
  if (s.perBeat === 4) out.push(t('16ths', 'שש-עשריות'));
  if (s.swing) out.push(t('swing', 'סווינג'));
  return out;
}
function title(parts: (T2 | string | null | undefined)[], s: DrillSpec): T2 {
  const all = [...parts.filter((x): x is T2 | string => !!x), HANDS_T[s.hands], ...extras(s)];
  return {
    en: all.map((x) => (typeof x === 'string' ? x : x.en)).join(' · '),
    he: all.map((x) => (typeof x === 'string' ? x : x.he)).join(' · '),
  };
}

function goalOf(s: DrillSpec, evenness: boolean, more: Partial<DrillGoal> = {}): DrillGoal {
  const g: DrillGoal = { evenness, hands: s.hands === 'RL' };
  if (s.dynamics) g.dynamics = s.dynamics;
  if (s.articulation) g.articulation = s.articulation;
  return { ...g, ...more };
}

/** Starting tempo (♩) for a target notes/s at perBeat notes per beat, clamped to 40–200. */
const bpmFor = (nps: number, perBeat: number): number => Math.max(40, Math.min(200, Math.round((nps * 60) / perBeat)));

function keySigOf(s: DrillSpec): string {
  const type = scaleTypeOf(s);
  if (type === 'chromatic') return 'C';
  if (type === 'mixolydian' || type === 'bebop-dom') return SIG[mod(s.key + 5, 12)];
  if (s.minor) return SIG[mod(s.key + 3, 12)];
  return SIG[mod(s.key, 12)];
}

function finish(spec: DrillSpec, buf: Buf, ttl: T2, goal: DrillGoal, startBpm: number, meter = 4, keySig?: string): Drill {
  const notes = buf.notes.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const beats = r6(Math.max(...notes.map((n) => n.beat + n.dur)));
  return {
    spec: { ...spec },
    itemId: itemIdOf(spec),
    title: ttl,
    notes,
    beats,
    meter,
    keySig: keySig ?? keySigOf(spec),
    goal,
    // A level's exam-based start speed (PIANO_AUDIT T1) comes in as the spec's tempo.
    startBpm: spec.tempo ?? startBpm,
  };
}

const keyLabel = (s: DrillSpec): string => keyName(s.key, !!s.minor);

// ───────────────────────────── S: scales (and K articulation / dynamics, X octaves) ─────────────────────────────

function genScale(s: DrillSpec): Drill {
  const type = scaleTypeOf(s);
  const up = scaleIntervals(type);
  const n = up.length;
  const oct = s.octaves ?? 2;
  const N = n * oct;
  const seven = n === 7;
  let motion: Motion = s.hands === 'RL' ? (s.motion ?? 'parallel') : 'parallel';
  // Chromatic scales may also run a minor 3rd / major 6th apart (ABRSM grades 6–8); other non-7-note scales stay parallel.
  const chromApart = type === 'chromatic' && (motion === 'third' || motion === 'sixth');
  if (!seven && !chromApart && motion !== 'parallel' && motion !== 'contrary') motion = 'parallel';
  const apart = chromApart ? 3 : 2;
  const octavesKind = s.kind === 'octaves';
  let base = rhBase(s.key);
  if (octavesKind && oct < 3) base = pitchIn(s.key, 48);
  // 3–4 octaves: start low enough that the run stays on an 88-key keyboard (RH from C3 / G2 region).
  if (oct >= 3 && motion !== 'contrary' && motion !== 'formula') base = pitchIn(s.key, oct >= 4 ? 43 : 48);

  // Path: (kR, kL) pairs; tonics and index offsets per hand.
  let tR = base;
  let tL = base - 12;
  let oR = 0;
  let oL = 0;
  const path: [number, number][] = [];
  const upDown = () => {
    for (let k = 0; k <= N; k++) path.push([k, k]);
    for (let k = N - 1; k >= 0; k--) path.push([k, k]);
  };
  switch (motion) {
    case 'parallel':
      upDown();
      break;
    case 'third':
      tR = tL = pitchIn(s.key, 44);
      oR = apart;
      upDown();
      break;
    case 'tenth':
      oR = 2;
      upDown();
      break;
    case 'sixth':
      oL = apart;
      upDown();
      break;
    case 'contrary':
      tR = tL = base;
      for (let k = 0; k <= N; k++) path.push([k, -k]);
      for (let k = N - 1; k >= 0; k--) path.push([k, -k]);
      break;
    case 'formula': {
      tR = tL = base;
      const M = n * Math.max(1, Math.floor(oct / 2));
      for (let i = 0; i <= M; i++) path.push([i, -i]);
      for (let i = 1; i <= M; i++) path.push([M + i, -M + i]);
      for (let i = 1; i <= M; i++) path.push([2 * M - i, -i]);
      for (let i = 1; i <= M; i++) path.push([M - i, -M + i]);
      break;
    }
  }

  // Keep the LH below about G5: move the whole drill down an octave when it climbs higher.
  if (degPitch(tL, up, Math.max(...path.map((p) => p[1])) + oL) > 79 && (motion === 'sixth' || motion === 'tenth')) {
    tL -= 12;
    tR -= 12;
  }
  // LH alone over 2+ octaves sits an octave lower (C2–C4 region).
  if (s.hands === 'L' && oct >= 2 && oct < 3 && !octavesKind) tL = base - 24;
  if (octavesKind && oct < 3) tL = pitchIn(s.key, 31);
  // PIANO_AUDIT C3: hands-together octaves had the LH's top note on the RH's bottom key (C1–C2 under C2–C3 shared C2).
  // Two octaves apart, so the hands never share a key.
  if (octavesKind && s.hands === 'RL') {
    tR = pitchIn(s.key, 52);
    tL = tR - 24;
  }
  const row = type === 'chromatic' ? null : fingRowFor(type, s.key);
  const rowDown = type === 'chromatic' ? null : fingRowFor(type, s.key, true);
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const kOf = (h: Hand, i: number) => (h === 'R' ? path[i][0] + oR : path[i][1] + oL);
  const range = (h: Hand) => {
    const ks = path.map((_, i) => kOf(h, i));
    return [Math.min(...ks), Math.max(...ks)];
  };
  const ranges = { R: range('R'), L: range('L') };
  const prevK: Record<Hand, number | null> = { R: null, L: null };

  const steps: Step[] = path.map((_, i) => {
    const st: Step = [];
    for (const h of handsUsed) {
      const k = kOf(h, i);
      const pk = prevK[h];
      const down = pk !== null && k < pk;
      prevK[h] = k;
      const p = degPitch(h === 'R' ? tR : tL, scaleIntervals(type, down), k);
      let finger: number | undefined;
      if (octavesKind) finger = undefined;
      else if (type === 'chromatic') finger = chromaticFinger(h, p, i === 0);
      else if (row && rowDown && seven) {
        const [lo, hi] = ranges[h];
        // Endpoints that are not tonics take the cycle finger (scales a 3rd / 6th apart). Melodic minor: the row of the
        // direction the hand is moving (the LH in contrary motion moves down while the RH goes up).
        const goingDown = down || (pk === null && path.length > 1 && kOf(h, 1) < k);
        finger = scaleFinger(goingDown ? rowDown : row, h, k, mod(lo, 7) === 0 ? lo : Number.NaN, mod(hi, 7) === 0 ? hi : Number.NaN, rowDown);
      }
      if (octavesKind) {
        const top = p + 12;
        if (h === 'R') st.push({ pitch: p, hand: 'R', finger: 1 }, { pitch: top, hand: 'R', finger: isBlack(top) ? 4 : 5 });
        else st.push({ pitch: p, hand: 'L', finger: isBlack(p) ? 4 : 5 }, { pitch: p + 12, hand: 'L', finger: 1 });
      } else st.push({ pitch: p, hand: h, finger });
    }
    return st;
  });

  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const ttl = title(
    [
      octavesKind ? t('Octaves', 'אוקטבות') : null,
      t(`${keyLabel(s)} ${SCALE_T[type].en}`, `${keyLabel(s)} ${SCALE_T[type].he}`),
      motion !== 'parallel' ? MOTION_T[motion] : null,
      t(`${oct} oct`, `${oct} אוק׳`),
    ],
    s,
  );
  const fam = s.family;
  const nps = fam === 'control' ? 2.0 : fam === 'advanced' ? 1.8 : oct >= 3 ? 2.4 : 2.2;
  return finish(s, buf, ttl, goalOf(s, true), bpmFor(nps, perBeat));
}

// ───────────────────────────── A: arpeggios and broken chords ─────────────────────────────

const CHORD: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  hd7: [0, 3, 6, 10],
};
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

function arpChord(s: DrillSpec): { root: number; tones: number[]; name: T2 } {
  const k = mod(s.key, 12);
  const kn = keyLabel(s);
  switch (s.kind) {
    case 'arp-dom7': {
      const r = mod(k + 7, 12);
      return {
        root: r,
        tones: CHORD.dom7,
        name: t(`${keyName(r)}7 (V7 of ${kn})`, `${keyName(r)}7 (V7 של ${kn})`),
      };
    }
    case 'arp-dim7': {
      const r = mod(k + 11, 12);
      return {
        root: r,
        tones: CHORD.dim7,
        name: t(`${keyName(r, true)}°7 (vii°7 of ${kn} minor)`, `${keyName(r, true)}°7 (vii°7 של ${kn} מינור)`),
      };
    }
    case 'arp-maj7':
      return {
        root: k,
        tones: CHORD.maj7,
        name: t(`${kn}maj7 arpeggio`, `ארפז׳ ${kn}maj7`),
      };
    case 'arp-m7':
      return {
        root: k,
        tones: CHORD.m7,
        name: t(`${kn}m7 arpeggio`, `ארפז׳ ${kn}m7`),
      };
    case 'arp-hd7':
      return {
        root: k,
        tones: CHORD.hd7,
        name: t(`${kn}ø7 arpeggio`, `ארפז׳ ${kn}ø7`),
      };
    default:
      return {
        root: k,
        tones: s.minor ? CHORD.min : CHORD.maj,
        name: t(`${kn} ${s.minor ? 'minor' : 'major'} arpeggio`, `ארפז׳ ${kn} ${s.minor ? 'מינור' : "מז'ור"}`),
      };
  }
}
const INV_T = [null, t('1st inversion', 'היפוך 1'), t('2nd inversion', 'היפוך 2'), t('3rd inversion', 'היפוך 3')];

function genArp(s: DrillSpec): Drill {
  const { root, tones, name } = arpChord(s);
  const len = tones.length;
  const oct = s.octaves ?? 2;
  const inv = Math.min(len - 1, Math.max(0, s.option ?? 0));
  const N = len * oct;
  const motion = s.hands === 'RL' && s.motion === 'contrary' ? 'contrary' : 'parallel';
  let rootR = rhBase(root);
  while (degPitch(rootR, tones, inv) > 67) rootR -= 12;
  if (oct >= 3 && motion === 'parallel') rootR = pitchIn(root, oct >= 4 ? 43 : 48);
  const rootL = motion === 'contrary' ? rootR : s.hands === 'L' && oct === 2 ? rootR - 24 : rootR - 12;
  const path: [number, number][] = [];
  for (let k = inv; k <= inv + N; k++) path.push([k, motion === 'contrary' ? 2 * inv - k : k]);
  for (let k = inv + N - 1; k >= inv; k--) path.push([k, motion === 'contrary' ? 2 * inv - k : k]);
  const white = tones.every((x) => WHITE_PCS.includes(mod(root + x, 12)));
  const fingered = white && inv === 0;
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const lo = {
    R: Math.min(...path.map((p) => p[0])),
    L: Math.min(...path.map((p) => p[1])),
  };
  const hi = {
    R: Math.max(...path.map((p) => p[0])),
    L: Math.max(...path.map((p) => p[1])),
  };
  const finger = (h: Hand, k: number): number | undefined => {
    if (!fingered) return undefined;
    const d = mod(k, len);
    if (h === 'R') return k === hi.R ? 5 : d + 1;
    if (k === lo.L) return 5;
    return len === 3 ? [1, 4, 2][d] : [1, 4, 3, 2][d];
  };
  const steps: Step[] = path.map(([kr, kl]) =>
    handsUsed.map((h) => {
      const k = h === 'R' ? kr : kl;
      return {
        pitch: degPitch(h === 'R' ? rootR : rootL, tones, k),
        hand: h,
        finger: finger(h, k),
      };
    }),
  );
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const ttl = title([name, INV_T[inv], motion === 'contrary' ? MOTION_T.contrary : null, t(`${oct} oct`, `${oct} אוק׳`)], s);
  return finish(s, buf, ttl, goalOf(s, true), bpmFor(2.0, perBeat));
}

function genBroken(s: DrillSpec): Drill {
  const tones = s.minor ? CHORD.min : CHORD.maj;
  const rootR = rhBase(s.key);
  const pat = s.option === 1 ? [0, 2, 1, 2] : [0, 1, 2, 1];
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const FR = [
    [1, 3, 5],
    [1, 2, 5],
    [1, 3, 5],
  ];
  const FL = [
    [5, 3, 1],
    [5, 3, 1],
    [5, 2, 1],
  ];
  const order = [0, 1, 2, 3, 2, 1, 0];
  const steps: Step[] = [];
  for (const j of order) {
    for (const q of pat)
      steps.push(
        handsUsed.map((h) => ({
          pitch: degPitch(h === 'R' ? rootR : rootR - 12, tones, j + q),
          hand: h,
          finger: (h === 'R' ? FR : FL)[mod(j, 3)][q],
        })),
      );
  }
  steps.push(
    handsUsed.map((h) => ({
      pitch: h === 'R' ? rootR : rootR - 12,
      hand: h,
      finger: h === 'R' ? 1 : 5,
    })),
  );
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const ttl = title(
    [
      t(
        `${keyLabel(s)} ${s.minor ? 'minor' : 'major'} broken chords ${s.option === 1 ? '1-5-3-5' : '1-3-5-3'}`,
        `אקורדים שבורים ${keyLabel(s)} ${s.minor ? 'מינור' : "מז'ור"} ${s.option === 1 ? '1-5-3-5' : '1-3-5-3'}`,
      ),
    ],
    s,
  );
  return finish(s, buf, ttl, goalOf(s, true), bpmFor(2.0, perBeat));
}

// ───────────────────────────── chord voicing helpers ─────────────────────────────

/** Voice-leading cost between two voicings (sorted pairing when equal sizes, else nearest-note sum / larger size). */
export function vlDistance(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const x = a.slice().sort((p, q) => p - q);
  const y = b.slice().sort((p, q) => p - q);
  if (x.length === y.length) return x.reduce((acc, p, i) => acc + Math.abs(p - y[i]), 0) / x.length;
  const [big, small] = x.length > y.length ? [x, y] : [y, x];
  return big.reduce((acc, p) => acc + Math.min(...small.map((q) => Math.abs(p - q))), 0) / big.length;
}

/** Close-position voicing of the pitch classes inside [lo, hi], nearest to prev (or with topPc on top near `aim`). */
export function voiceNear(pcs: number[], prev: number[] | null, lo: number, hi: number, topPc?: number, aim = (lo + hi) / 2): number[] {
  const uniq = [...new Set(pcs.map((p) => mod(p, 12)))].sort((a, b) => a - b);
  let best: number[] = [];
  let bestCost = Infinity;
  for (let r = 0; r < uniq.length; r++) {
    const ord = [...uniq.slice(r), ...uniq.slice(0, r)];
    for (let b = lo; b <= hi; b++) {
      if (mod(b, 12) !== ord[0]) continue;
      const v = [b];
      for (let i = 1; i < ord.length; i++) v.push(v[i - 1] + (mod(ord[i] - v[i - 1], 12) || 12));
      if (v[v.length - 1] > hi) continue;
      let cost: number;
      if (prev) cost = vlDistance(v, prev) * 10 + Math.abs((v[0] + v[v.length - 1]) / 2 - aim) * 0.01;
      else {
        if (topPc !== undefined && mod(v[v.length - 1], 12) !== mod(topPc, 12)) continue;
        cost = Math.abs(v[v.length - 1] - aim);
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = v;
      }
    }
  }
  return best;
}

interface ChordEv {
  beat: number;
  dur: number;
  notes: SN[];
  required: number[];
  allowed: number[];
}
function chordDrill(s: DrillSpec, evs: ChordEv[], ttl: T2, startBpm: number, more: Partial<DrillGoal> = {}, keySig?: string, meter = 4): Drill {
  const buf = new Buf();
  const sets: NonNullable<DrillGoal['chordSets']> = [];
  for (const e of evs) {
    const id = buf.add(e.beat, e.dur, e.notes, true)!;
    sets.push({
      chordId: id,
      required: [...new Set(e.required.map((p) => mod(p, 12)))].sort((a, b) => a - b),
      allowed: [...new Set(e.allowed.map((p) => mod(p, 12)))].sort((a, b) => a - b),
    });
  }
  const handsSet = new Set(evs.flatMap((e) => e.notes.map((n) => n.hand)));
  return finish(s, buf, ttl, { evenness: false, hands: handsSet.size > 1, chordSets: sets, ...more }, startBpm, meter, keySig);
}

// ───────────────────────────── any progression as voicings / comping / stride (chartDrills.ts) ─────────────────────────────

function genChart(s: DrillSpec): Drill {
  const d = chartDrillData(s.kind, s.key);
  if (!d) throw new Error(`Unknown chart drill: ${s.kind}`);
  const evs: ChordEv[] = d.evs.map((e) => ({ beat: e.beat, dur: e.dur, notes: e.notes, required: e.required, allowed: e.allowed }));
  const sp: DrillSpec = { ...s, hands: evs.some((e) => e.notes.some((n) => n.hand === 'R')) ? 'RL' : 'L', swing: s.swing ?? true };
  const drill = chordDrill(sp, evs, d.title, d.startBpm, {}, 'C', d.meter);
  return { ...drill, chart: d.text.split(' | '), ...(d.freeAbove !== undefined ? { freeAbove: d.freeAbove } : {}) };
}

// ───────────────────────────── C: cadences ─────────────────────────────

function cadenceProg(kind: string, minor: boolean): { rh: number[]; bass: number }[] {
  const I = minor ? [0, 3, 7] : [0, 4, 7];
  const IV = minor ? [5, 8, 0] : [5, 9, 0];
  const V = [7, 11, 2];
  const V7 = [11, 5, 7];
  const ii = minor ? [2, 5, 8] : [2, 5, 9];
  const vi = minor ? [8, 0, 3] : [9, 0, 4];
  switch (kind) {
    case 'cadence-64':
      return [
        { rh: I, bass: 0 },
        { rh: IV, bass: 5 },
        { rh: I, bass: 7 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-ii6':
      return [
        { rh: I, bass: 0 },
        { rh: ii, bass: 5 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-circle':
      return [
        { rh: I, bass: 0 },
        { rh: vi, bass: minor ? 8 : 9 },
        { rh: ii, bass: 2 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-vofv':
      return [
        { rh: I, bass: 0 },
        { rh: [2, 6, 9], bass: 2 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-n6':
      return [
        { rh: I, bass: 0 },
        { rh: [1, 5, 8], bass: 5 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-aug6':
      return [
        { rh: I, bass: 0 },
        { rh: [0, 3, 6], bass: 8 },
        { rh: I, bass: 7 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-plagal':
      return [
        { rh: I, bass: 0 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
        { rh: IV, bass: 5 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-deceptive':
      return [
        { rh: I, bass: 0 },
        { rh: IV, bass: 5 },
        { rh: V7, bass: 7 },
        { rh: vi, bass: minor ? 8 : 9 },
        { rh: ii, bass: 5 },
        { rh: V7, bass: 7 },
        { rh: I, bass: 0 },
      ];
    case 'cadence-picardy':
      // Minor key, ending on the major tonic (tierce de Picardie).
      return [
        { rh: I, bass: 0 },
        { rh: IV, bass: 5 },
        { rh: V7, bass: 7 },
        { rh: [0, 4, 7], bass: 0 },
      ];
    default:
      return [
        { rh: I, bass: 0 },
        { rh: IV, bass: 5 },
        { rh: V, bass: 7 },
        { rh: I, bass: 0 },
      ];
  }
}
const CAD_T: Record<string, T2> = {
  'cadence-1': t('I–IV–V–I', 'I–IV–V–I'),
  'cadence-64': t('I–IV–I6/4–V7–I', 'I–IV–I6/4–V7–I'),
  'cadence-ii6': t('I–ii6–V7–I', 'I–ii6–V7–I'),
  'cadence-circle': t('I–vi–ii–V7–I', 'I–vi–ii–V7–I'),
  'cadence-vofv': t('I–V/V–V7–I', 'I–V/V–V7–I'),
  'cadence-n6': t('I–N6–V7–I (Neapolitan)', 'I–N6–V7–I (נפוליטני)'),
  'cadence-aug6': t('I–Ger+6–I6/4–V7–I', 'I–Ger+6–I6/4–V7–I'),
  'cadence-plagal': t('I–V7–I–IV–I (plagal "Amen")', 'I–V7–I–IV–I (פלגאלית "אמן")'),
  'cadence-deceptive': t('I–IV–V7–vi (deceptive)–ii–V7–I', 'I–IV–V7–vi (מטעה)–ii–V7–I'),
  'cadence-picardy': t('i–iv–V7–I (Picardy 3rd)', 'i–iv–V7–I (טרצה פיקרדית)'),
};
const TOP_T = [t('root on top', 'יסוד למעלה'), t('3rd on top', 'טרצה למעלה'), t('5th on top', 'קווינטה למעלה')];

/** Parallel 5ths / octaves (or unisons) between any two voices of two successive sonorities (same voice count, by position). */
export function parallelsBetween(a: number[], b: number[]): number {
  let n = 0;
  for (let x = 0; x < a.length; x++)
    for (let y = x + 1; y < a.length; y++) {
      if (a[x] === b[x] || a[y] === b[y]) continue;
      const i1 = mod(a[y] - a[x], 12);
      const i2 = mod(b[y] - b[x], 12);
      if (i1 === i2 && (i1 === 0 || i1 === 7)) n++;
    }
  return n;
}

/**
 * The RH chord of a cadence step (PIANO_AUDIT C2): three notes inside [lo, hi] within an octave, from the chord's pitch
 * classes (one may be doubled when the bass has the missing one: V7–vi doubles the 3rd), as close to the last chord
 * as possible and never in parallel 5ths / octaves with the bass or between the voices. Before this, the nearest
 * close position moved I–IV–V in parallel with the bass (F A C → G B D over F → G).
 */
function cadenceVoicing(pcs: number[], bass: number, prev: number[], prevBass: number, lo: number, hi: number, lead: number): number[] {
  const want = new Set(pcs.map((p) => mod(p, 12)));
  const keys: number[] = [];
  for (let p = lo; p <= hi; p++) if (want.has(mod(p, 12))) keys.push(p);
  let best: number[] = prev;
  let bestCost = Infinity;
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++)
      for (let k = j + 1; k < keys.length; k++) {
        const v = [keys[i], keys[j], keys[k]];
        if (v[2] - v[0] > 12) continue;
        const have = new Set([...v, bass].map((p) => mod(p, 12)));
        if ([...want].some((p) => !have.has(p))) continue;
        const distinct = new Set(v.map((p) => mod(p, 12))).size;
        const move = v.reduce((a, p, q) => a + Math.abs(p - prev[q]), 0);
        const par = parallelsBetween([prevBass, ...prev], [bass, ...v]);
        // A doubled leading tone (the key's 7th degree) is avoided; a doubled note is a little worse than three.
        const lt = v.filter((p) => mod(p, 12) === mod(lead, 12)).length > 1 ? 1 : 0;
        const cost = move + par * 100 + lt * 50 + (distinct < 3 ? 3 : 0);
        if (cost < bestCost) {
          bestCost = cost;
          best = v;
        }
      }
  return best;
}

function genCadence(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const prog = cadenceProg(s.kind, !!s.minor);
  const pos = Math.min(2, Math.max(0, s.option ?? 0));
  let prev: number[] | null = null;
  let prevBass = 0;
  const evs: ChordEv[] = prog.map((c, i) => {
    const pcs = c.rh.map((p) => p + key);
    const bassP = pitchIn(c.bass + key, 41);
    // Later chords may go down to F3 so a step up in the bass can always be met by contrary motion.
    const v = prev ? cadenceVoicing(pcs, bassP, prev, prevBass, Math.max(53, bassP + 3), 81, key + 11) : voiceNear(pcs, null, 57, 81, prog[0].rh[pos] + key, 72);
    prev = v;
    prevBass = bassP;
    const notes: SN[] = [];
    if (s.hands !== 'R') notes.push({ pitch: bassP, hand: 'L' });
    if (s.hands !== 'L') for (const p of v) notes.push({ pitch: p, hand: 'R' });
    const all = [...pcs, c.bass + key];
    return {
      beat: i * 2,
      dur: 2,
      notes,
      required: s.hands === 'L' ? [c.bass + key] : all,
      allowed: all,
    };
  });
  const ttl = title(
    [
      t(`${keyLabel(s)} ${s.minor ? 'minor' : 'major'} cadence`, `קדנצה ${keyLabel(s)} ${s.minor ? 'מינור' : "מז'ור"}`),
      CAD_T[s.kind] ?? CAD_T['cadence-1'],
      TOP_T[pos],
    ],
    s,
  );
  return chordDrill(s, evs, ttl, 60);
}

// ───────────────────────────── F: fingers ─────────────────────────────

const FIVE_PATTERNS = [
  [0, 1, 2, 3, 4, 3, 2, 1],
  [0, 2, 1, 3, 2, 4, 3, 1],
  [0, 1, 0, 2, 0, 3, 0, 4],
];

function genFive(s: DrillSpec): Drill {
  const ints = s.minor ? SCALE_INTERVALS.natural : SCALE_INTERVALS.major;
  const base = rhBase(s.key);
  const pat = FIVE_PATTERNS[Math.min(FIVE_PATTERNS.length - 1, s.option ?? 0)];
  const seq = [...pat, ...pat, 0];
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const steps: Step[] = seq.map((d) =>
    handsUsed.map((h) => ({
      pitch: degPitch(h === 'R' ? base : base - 12, ints, d),
      hand: h,
      finger: h === 'R' ? d + 1 : 5 - d,
    })),
  );
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const ttl = title(
    [t(`${keyLabel(s)} five-finger pattern ${pat.map((d) => d + 1).join('-')}`, `חמש אצבעות ${keyLabel(s)} ${pat.map((d) => d + 1).join('-')}`)],
    s,
  );
  return finish(s, buf, ttl, goalOf(s, true), bpmFor(2.2, perBeat));
}

/** Hanon No. 1 (Part I), the one pattern encoded exactly: C-E-F-G-A-G-F-E up by step, mirrored down. */
export const HANON_1 = [0, 2, 3, 4, 5, 4, 3, 2];
/** Hanon-style sequential 5-finger patterns (not Hanon's own numbers). */
export const HANON_STYLE: number[][] = [
  [0, 1, 2, 3, 4, 3, 2, 1],
  [0, 2, 1, 3, 2, 4, 3, 1],
  [0, 4, 3, 2, 1, 2, 3, 4],
  [0, 2, 4, 3, 2, 1, 2, 3],
  [0, 1, 0, 2, 0, 3, 0, 4],
  [0, 2, 1, 2, 3, 2, 3, 4],
];

/** Sequence a motif up by step `steps` times, then the mirrored motif down from the top, ending on the tonic. */
function sequenceMotif(motif: number[], steps: number): { deg: number; up: boolean; group: number[] }[] {
  const out: { deg: number; up: boolean; group: number[] }[] = [];
  for (let s = 0; s < steps; s++) for (const m of motif) out.push({ deg: s + m, up: true, group: motif.map((x) => x + s) });
  const mirror = motif.map((m) => -m);
  const top = steps + Math.max(...motif) - 1;
  for (let s = 0; s < steps; s++)
    for (const m of mirror)
      out.push({
        deg: top - s + m,
        up: false,
        group: mirror.map((x) => x + top - s),
      });
  out.push({ deg: 0, up: false, group: [0] });
  return out;
}

/** Finger by rank inside the 5-note group (RH thumb on the lowest; LH thumb on the highest). */
function rankFinger(group: number[], deg: number, hand: Hand): number | undefined {
  const distinct = [...new Set(group)].sort((a, b) => a - b);
  if (distinct.length > 5) return undefined;
  const rank = distinct.indexOf(deg);
  return hand === 'R' ? rank + 1 : 5 - rank;
}

function genHanon(s: DrillSpec): Drill {
  const exact = s.kind === 'hanon-1';
  const idx = Math.min(HANON_STYLE.length - 1, Math.max(0, (s.option ?? 1) - 1));
  const motif = exact ? HANON_1 : HANON_STYLE[idx];
  const ints = s.minor ? SCALE_INTERVALS.natural : SCALE_INTERVALS.major;
  const oct = Math.min(2, s.octaves ?? 2);
  const base = oct === 2 ? pitchIn(s.key, 48) : rhBase(s.key); // as printed: RH from C3, LH from C2
  const seq = sequenceMotif(motif, 7 * oct);
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const steps: Step[] = seq.map((e, i) =>
    handsUsed.map((h) => ({
      pitch: degPitch(h === 'R' ? base : base - 12, ints, e.deg),
      hand: h,
      finger: i === seq.length - 1 ? (h === 'R' ? 1 : 5) : rankFinger(e.group, e.deg, h),
    })),
  );
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const name = exact
    ? t(`Hanon No. 1 in ${keyLabel(s)}`, `האנון מס׳ 1 ב-${keyLabel(s)}`)
    : t(`Hanon-style pattern ${idx + 1} in ${keyLabel(s)}`, `תבנית בסגנון האנון ${idx + 1} ב-${keyLabel(s)}`);
  return finish(s, buf, title([name], s), goalOf(s, true), bpmFor(2.2, perBeat));
}

export const TRILL_PAIRS: [number, number][] = [
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 4],
  [4, 5],
];

function genTrill(s: DrillSpec): Drill {
  const pair = TRILL_PAIRS[Math.min(4, Math.max(0, s.option ?? 0))];
  const ints = SCALE_INTERVALS.major;
  const base = rhBase(s.key);
  const perBeat = s.perBeat ?? 4;
  const count = 4 * perBeat;
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const steps: Step[] = [];
  for (let i = 0; i <= count; i++) {
    const f = i % 2 === 0 ? pair[0] : pair[1];
    steps.push(
      handsUsed.map((h) => ({
        pitch: degPitch(h === 'R' ? base : base - 12, ints, h === 'R' ? f - 1 : 5 - f),
        hand: h,
        finger: f,
      })),
    );
  }
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  return finish(
    s,
    buf,
    title([t(`Trill ${pair[0]}-${pair[1]} in ${keyLabel(s)}`, `טריל ${pair[0]}-${pair[1]} ב-${keyLabel(s)}`), t(`${perBeat} per beat`, `${perBeat} לפעמה`)], s),
    goalOf(s, true),
    bpmFor(2.4, perBeat),
  );
}

function genRepeated(s: DrillSpec): Drill {
  const ints = SCALE_INTERVALS.major;
  const base = rhBase(s.key);
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const steps: Step[] = [];
  for (const d of [0, 1, 2, 3, 4, 3, 2, 1, 0])
    for (const f of [4, 3, 2, 1])
      steps.push(
        handsUsed.map((h) => ({
          pitch: degPitch(h === 'R' ? base : base - 12, ints, d),
          hand: h,
          finger: f,
        })),
      );
  const perBeat = s.perBeat ?? 4;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics, 0, 1 / perBeat);
  return finish(
    s,
    buf,
    title([t(`Repeated notes 4-3-2-1 in ${keyLabel(s)}`, `צלילים חוזרים 4-3-2-1 ב-${keyLabel(s)}`)], s),
    goalOf(s, true),
    bpmFor(2.4, perBeat),
  );
}

/** Held notes, Pischna / Dohnányi style: option 1 = hold 1 + 5 while 2-3-4 move; option 2 = hold the middle finger. */
function genHeldMore(s: DrillSpec): Drill {
  const ints = SCALE_INTERVALS.major;
  const base = rhBase(s.key);
  const buf = new Buf();
  const two = s.option === 2;
  const heldDeg = two ? [2] : [0, 4];
  const moving = two ? [0, 1, 3, 4, 3, 1, 0, 1] : [1, 2, 3, 2, 1, 2, 3, 2];
  const hs: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  const tonicOf = (h: Hand) => (h === 'R' ? base : base - 12);
  const fing = (h: Hand, d: number) => (h === 'R' ? d + 1 : 5 - d);
  for (let half = 0; half < 4; half++) {
    const b0 = half * 2;
    for (const h of hs) for (const d of heldDeg) buf.add(b0, 2, [{ pitch: degPitch(tonicOf(h), ints, d), hand: h, finger: fing(h, d) }]);
    for (let i = 0; i < 4; i++) {
      const d = moving[(half % 2) * 4 + i];
      for (const h of hs) buf.add(b0 + i * 0.5, 0.5, [{ pitch: degPitch(tonicOf(h), ints, d), hand: h, finger: fing(h, d) }]);
    }
  }
  buf.add(
    8,
    1,
    hs.map((h) => ({ pitch: tonicOf(h), hand: h })),
  );
  const nm = two ? t(`hold the middle finger, the others move, in ${keyLabel(s)}`, `האצבע האמצעית מוחזקת, האחרות נעות, ב-${keyLabel(s)}`) : t(`hold 1 + 5, fingers 2-3-4 move, in ${keyLabel(s)}`, `1 ו-5 מוחזקות, 2-3-4 נעות, ב-${keyLabel(s)}`);
  return finish(s, buf, title([t('Held-note independence', 'עצמאות עם צלילים מוחזקים'), nm], s), goalOf(s, false), 60);
}

function genHeld(s: DrillSpec): Drill {
  if (s.option === 1 || s.option === 2) return genHeldMore(s);
  const ints = SCALE_INTERVALS.major;
  const base = rhBase(s.key);
  const buf = new Buf();
  const moving = [1, 2, 3, 4, 3, 2, 1, 2];
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  for (let bar = 0; bar < 2; bar++)
    for (let half = 0; half < 2; half++) {
      const b0 = bar * 4 + half * 2;
      for (let i = 0; i < 4; i++) {
        const d = moving[half * 4 + i];
        const sns: SN[] = [];
        for (const h of handsUsed) {
          const tonic = h === 'R' ? base : base - 12;
          if (i === 0)
            sns.push({
              pitch: degPitch(tonic, ints, 0),
              hand: h,
              finger: h === 'R' ? 1 : 5,
            });
          sns.push({
            pitch: degPitch(tonic, ints, d),
            hand: h,
            finger: h === 'R' ? d + 1 : 5 - d,
          });
        }
        // The held thumb (RH) / fifth finger (LH) sounds for 2 beats; the others move in 8ths.
        for (const n of sns) {
          const held = i === 0 && n.pitch === degPitch(n.hand === 'R' ? base : base - 12, ints, 0);
          buf.add(b0 + i * 0.5, held ? 2 : 0.5, [n]);
        }
      }
    }
  buf.add(
    8,
    1,
    handsUsed.map((h) => ({
      pitch: degPitch(h === 'R' ? base : base - 12, ints, 0),
      hand: h,
    })),
  );
  return finish(s, buf, title([t(`Held-note independence in ${keyLabel(s)}`, `עצמאות אצבעות עם צליל מוחזק ב-${keyLabel(s)}`)], s), goalOf(s, true), 60);
}

// ───────────────────────────── K: control (voicing, melody over Alberti) ─────────────────────────────

const PROG_VOICING = [
  [0, 4, 7],
  [5, 9, 0],
  [7, 11, 2],
  [0, 4, 7],
  [9, 0, 4],
  [2, 5, 9],
  [7, 11, 2],
  [0, 4, 7],
];

function triadFinger(v: number[], rootPc: number, hand: Hand): (number | undefined)[] {
  if (v.length !== 3) return v.map(() => undefined);
  const bottom = mod(v[0] - rootPc, 12);
  const which = bottom === 0 ? 0 : bottom === 7 ? 2 : 1;
  if (hand === 'R')
    return [
      [1, 3, 5],
      [1, 2, 5],
      [1, 3, 5],
    ][which];
  return [
    [5, 3, 1],
    [5, 3, 1],
    [5, 2, 1],
  ][which];
}

function genVoicingChords(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const hand: Hand = s.hands === 'L' ? 'L' : 'R';
  const [lo, hi] = hand === 'R' ? [60, 81] : [45, 64];
  let prev: number[] | null = null;
  const buf = new Buf();
  PROG_VOICING.forEach((c, i) => {
    const pcs = c.map((p) => p + key);
    const v: number[] = prev ? voiceNear(pcs, prev, lo, hi) : voiceNear(pcs, null, lo, hi, c[1] + key, hand === 'R' ? 72 : 57);
    prev = v;
    const fs = triadFinger(v, mod(c[0] + key, 12), hand);
    buf.add(
      i * 2,
      2,
      v.map((p, j) => ({
        pitch: p,
        hand,
        finger: fs[j],
        accent: j === v.length - 1,
      })),
    );
  });
  const g = goalOf({ ...s, dynamics: 'voicing' }, false);
  return finish(s, buf, title([t(`${keyLabel(s)} chords, top note louder`, `אקורדים ב-${keyLabel(s)}, הצליל העליון חזק יותר`)], s), g, 60);
}

const ALBERTI_PROG = [
  [0, 4, 7],
  [5, 9, 0],
  [11, 5, 7],
  [0, 4, 7],
];
const ALBERTI_ROOTS = [0, 5, 7, 0];

function genAlberti(s: DrillSpec, melody: boolean): Drill {
  const key = mod(s.key, 12);
  const buf = new Buf();
  let prevL: number[] | null = null;
  let prevR: number[] | null = null;
  // Root-position I with the 5th on top inside E♭2…D4 (46–62) for C, G, F; other keys (A: the root would fall below 46)
  // use the same voicing a little lower (from E2, 40) — before this fix those keys produced empty notes.
  const I = ALBERTI_PROG[0].map((p) => p + key);
  const fits = voiceNear(I, null, 46, 62, ALBERTI_PROG[0][2] + key, 55).length === 3;
  const loL = fits ? 46 : 40;
  ALBERTI_PROG.forEach((c, bar) => {
    const pcs = c.map((p) => p + key);
    const v: number[] = prevL ? voiceNear(pcs, prevL, loL, 62) : voiceNear(pcs, null, loL, 62, c[2] + key, fits ? 55 : 52);
    prevL = v;
    const [lo, mid, hi] = v;
    const pat = [lo, hi, mid, hi, lo, hi, mid, hi];
    const fing = [5, 1, 3, 1, 5, 1, 3, 1];
    pat.forEach((p, i) => buf.add(bar * 4 + i * 0.5, 0.5, [{ pitch: p, hand: 'L', finger: fing[i] }]));
    if (melody) {
      const rpcs = [ALBERTI_ROOTS[bar], ...c].map((p) => p + key);
      const rv: number[] = prevR ? voiceNear(rpcs.slice(1), prevR, 64, 84) : voiceNear(rpcs.slice(1), null, 64, 84, c[1] + key, 76);
      prevR = rv;
      buf.add(bar * 4, 2, [{ pitch: rv[rv.length - 1], hand: 'R', accent: true }]);
      buf.add(bar * 4 + 2, 2, [{ pitch: rv[rv.length - 2], hand: 'R', accent: true }]);
    }
  });
  buf.add(16, 2, [{ pitch: pitchIn(key, 46), hand: 'L', finger: 5 }, ...(melody ? [{ pitch: pitchIn(key, 72), hand: 'R' as Hand, accent: true }] : [])]);
  const g = goalOf(melody ? { ...s, dynamics: 'voicing' } : s, true, {
    hands: melody,
  });
  const name = melody
    ? t(`Melody over Alberti bass in ${keyLabel(s)}`, `מנגינה מעל בס אלברטי ב-${keyLabel(s)}`)
    : t(`Alberti bass I–IV–V7–I in ${keyLabel(s)}`, `בס אלברטי I–IV–V7–I ב-${keyLabel(s)}`);
  return finish(s, buf, title([name], s), g, bpmFor(2.0, 2));
}

// ───────────────────────────── X: advanced (polyrhythm; octaves use genScale) ─────────────────────────────

function genPoly(s: DrillSpec): Drill {
  // RH : LH. 0 = 3:2, 1 = 4:3, 2 = 2:3 (hands swapped), 3 = 3:4 (hands swapped).
  const [r, l] = (
    [
      [3, 2],
      [4, 3],
      [2, 3],
      [3, 4],
    ] as const
  )[Math.min(3, Math.max(0, s.option ?? 0))];
  const key = mod(s.key, 12);
  const base = rhBase(key);
  const buf = new Buf();
  const triad = [0, 4, 7];
  for (let b = 0; b < 4; b++) {
    for (let i = 0; i < r; i++) buf.add(b + i / r, 1 / r, [{ pitch: degPitch(base, triad, (b * r + i) % 3), hand: 'R' }]);
    for (let i = 0; i < l; i++) buf.add(b + i / l, 1 / l, [{ pitch: base - 12 + (i % 2 === 0 ? 0 : 7), hand: 'L' }]);
  }
  buf.add(4, 1, [
    { pitch: base, hand: 'R' },
    { pitch: base - 12, hand: 'L' },
  ]);
  return finish(
    s,
    buf,
    title([t(`Polyrhythm ${r}:${l} in ${keyLabel(s)}`, `פוליריתמיקה ${r}:${l} ב-${keyLabel(s)}`)], { ...s, hands: 'RL' }),
    { evenness: true, hands: true },
    50,
  );
}

// ───────────────────────────── H: Barry Harris ─────────────────────────────

const MAJ_CT = [0, 4, 7, 9, 11];
const DOM_CT = [0, 4, 7, 10];
/** The descending dominant scale with the half step between root and ♭7 (the root → ♮7 → ♭7 rule). */
const DOM_DESC = [0, 2, 4, 5, 7, 9, 10, 11];

function lineDrill(
  s: DrillSpec,
  line: { p: number; beat: number; dur: number; ct?: boolean }[],
  ttl: T2,
  more: Partial<DrillGoal>,
  keySig?: string,
  startBpm = 60,
): Drill {
  const buf = new Buf();
  const handsUsed: Hand[] = s.hands === 'RL' ? ['R', 'L'] : [s.hands];
  for (const n of line)
    buf.add(
      n.beat,
      n.dur,
      handsUsed.map((h) => ({
        pitch: h === 'R' ? n.p : n.p - 12,
        hand: h,
        chordTone: n.ct,
      })),
    );
  return finish(s, buf, ttl, { ...goalOf(s, true), ...more }, startBpm, 4, keySig);
}

const eighths = (ps: number[], cts?: (p: number) => boolean, start = 0) =>
  ps.map((p, i) => ({
    p,
    beat: start + i / 2,
    dur: i === ps.length - 1 ? 1 : 0.5,
    ct: cts ? cts(p) : undefined,
  }));

function genHarris(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const kn = keyName(key);
  const isCt = (set: number[]) => (p: number) => set.includes(mod(p - key, 12));
  const maj = SCALE_INTERVALS.major;
  const base = rhBase(key);
  const H = (n: number, en: string, he: string) => t(`Barry Harris H${n}: ${en}`, `בארי האריס H${n}: ${he}`);
  switch (s.kind) {
    case 'h1-linear': {
      const ps: number[] = [];
      for (let k = 0; k <= 14; k++) ps.push(degPitch(base, maj, k));
      for (const o of [1, 0]) for (const x of [11, 9, 8, 7, 5, 4, 2, 0]) ps.push(base + 12 * o + x);
      return lineDrill(
        s,
        eighths(ps, isCt(MAJ_CT)),
        title([H(1, `the ${kn} linear scale (♭6 passing tone down)`, `הסולם הלינארי של ${kn} (♭6 מעבר בירידה)`)], s),
        { chordTonesOnBeats: true },
      );
    }
    case 'h2-dominant': {
      const op = Math.min(3, Math.max(0, s.option ?? 0));
      const start = pitchIn(key + DOM_CT[op], 74);
      const ps = [start];
      let p = start;
      for (let i = 0; i < 16; i++) {
        do p--;
        while (!DOM_DESC.includes(mod(p - key, 12)));
        ps.push(p);
      }
      const from = [t('root', 'היסוד'), t('3rd', 'הטרצה'), t('5th', 'הקווינטה'), t('7th', 'הספטימה')][op];
      return lineDrill(
        s,
        eighths(ps, isCt(DOM_CT)),
        title([H(2, `${kn}7 scale down from the ${from.en} (root → ♮7 → ♭7)`, `סולם ${kn}7 בירידה מ${from.he} (יסוד → ♮7 → ♭7)`)], s),
        { chordTonesOnBeats: true },
        SIG[mod(key + 5, 12)],
      );
    }
    case 'h3-triads': {
      const ps: number[] = [];
      for (let d = 0; d <= 6; d++) for (const x of [0, 2, 4, 3]) ps.push(degPitch(base, maj, d + x));
      for (let d = 7; d >= 1; d--) for (const x of [0, -2, -4, -3]) ps.push(degPitch(base, maj, d + x));
      ps.push(base);
      return lineDrill(s, eighths(ps), title([H(3, `triads on every degree of ${kn}, up and down`, `משולשים על כל דרגה של ${kn}, למעלה ולמטה`)], s), {});
    }
    case 'h4-chords': {
      const nine = s.option === 1;
      const ps: number[] = [];
      const cts: boolean[] = [];
      const up = nine ? [2, 4, 6, 8] : [0, 2, 4, 6];
      for (let d = 0; d <= 7; d++)
        for (const x of up) {
          ps.push(degPitch(base, maj, d + x));
          cts.push(x !== 8);
        }
      for (let d = 6; d >= 0; d--)
        for (const x of up.slice().reverse()) {
          ps.push(degPitch(base, maj, d + x));
          cts.push(x !== 8);
        }
      const line = ps.map((p, i) => ({
        p,
        beat: i / 2,
        dur: i === ps.length - 1 ? 1 : 0.5,
        ct: cts[i],
      }));
      return lineDrill(
        s,
        line,
        title(
          [
            H(
              4,
              nine ? `"3 to 9" arpeggios on every degree of ${kn}` : `1-3-5-7 chords on every degree of ${kn}`,
              nine ? `ארפז׳ "3 עד 9" על כל דרגה של ${kn}` : `אקורדי 1-3-5-7 על כל דרגה של ${kn}`,
            ),
          ],
          s,
        ),
        { chordTonesOnBeats: true },
      );
    }
    case 'h5-pivots': {
      const ps: number[] = [];
      for (let d = 0; d <= 6; d++) for (const x of [0, 2, 4, 6, 7, 6, 4, 2]) ps.push(degPitch(base, maj, d + x));
      ps.push(degPitch(base, maj, 7));
      return lineDrill(
        s,
        eighths(ps, () => true),
        title(
          [H(5, `pivots: 1-3-5-7 up, turn on the octave, down — every degree of ${kn}`, `פיבוטים: 1-3-5-7 למעלה, סיבוב באוקטבה, למטה — כל דרגה של ${kn}`)],
          s,
        ),
        { chordTonesOnBeats: true },
      );
    }
    case 'h6-approach': {
      const enclose = s.option === 1;
      const ks = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0];
      const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
      ks.forEach((k, j) => {
        const target = degPitch(base, maj, k);
        if (j > 0) {
          if (enclose) {
            line.push({
              p: degPitch(base, maj, k + 1),
              beat: j - 2 / 3,
              dur: 1 / 3,
              ct: false,
            });
            line.push({
              p: target - 1,
              beat: j - 1 / 3,
              dur: 1 / 3,
              ct: false,
            });
          } else line.push({ p: target - 1, beat: j - 0.5, dur: 0.5, ct: false });
        }
        line.push({
          p: target,
          beat: j,
          dur: j === ks.length - 1 ? 1 : enclose ? 1 / 3 : 0.5,
          ct: true,
        });
      });
      return lineDrill(
        s,
        line,
        title(
          [
            H(
              6,
              enclose ? `enclosures (step above, half step below, target) in ${kn}` : `a half step below before each note of ${kn}`,
              enclose ? `כיתור (צעד מעל, חצי טון מתחת, מטרה) ב-${kn}` : `חצי טון מתחת לפני כל צליל של ${kn}`,
            ),
          ],
          s,
        ),
        { chordTonesOnBeats: true },
        undefined,
        50,
      );
    }
    case 'h7-line': {
      const R0 = pitchIn(key, 60);
      const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
      let off = 0;
      if (s.option === 1) {
        let p = pitchIn(key + 7, 67);
        const ps = [p];
        for (let i = 0; i < 7; i++) {
          do p--;
          while (!DOM_DESC.includes(mod(p - key, 12)));
          ps.push(p);
        }
        ps.forEach((q, i) =>
          line.push({
            p: q,
            beat: i / 2,
            dur: 0.5,
            ct: DOM_CT.includes(mod(q - key, 12)),
          }),
        );
        off = 4;
      }
      const lick: [number, number][] = [
        [4, 0],
        [5, 1 / 3],
        [3, 2 / 3],
      ];
      lick.forEach(([x, b]) =>
        line.push({
          p: R0 + x,
          beat: off + b,
          dur: 1 / 3,
          ct: DOM_CT.includes(mod(x, 12)),
        }),
      );
      [4, 7, 10, 14, 12, 11, 10, 9, 7, 5, 4, 2, 0].forEach((x, i, a) =>
        line.push({
          p: R0 + x,
          beat: off + 1 + i / 2,
          dur: i === a.length - 1 ? 1 : 0.5,
          ct: DOM_CT.includes(mod(x, 12)),
        }),
      );
      const ttl =
        s.option === 1
          ? H(7, `ii–V in ${keyName(key + 5)}: think ${kn}7 — scale, then lick + line`, `ii–V ב-${keyName(key + 5)}: לחשוב ${kn}7 — סולם ואז ליק + שורה`)
          : H(7, `lick + line over ${kn}7 (triplet, 3-to-9, scale down)`, `ליק + שורה על ${kn}7 (טריולה, 3 עד 9, סולם למטה)`);
      return lineDrill(s, line, title([ttl], s), { chordTonesOnBeats: true }, SIG[mod(key + 5, 12)]);
    }
    case 'h8-brothers': {
      const R0 = pitchIn(key, 55);
      const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
      [0, 3, 6, 9].forEach((b, g) =>
        [4, 7, 10, 14].forEach((x, i) =>
          line.push({
            p: R0 + b + x,
            beat: g * 2 + i / 2,
            dur: 0.5,
            ct: x !== 14,
          }),
        ),
      );
      line.push({ p: R0 + 24, beat: 8, dur: 1, ct: true });
      const names = [0, 3, 6, 9].map((b) => keyName(key + b) + '7').join(' · ');
      return lineDrill(
        s,
        line,
        title([H(8, `brothers: 3-to-9 over ${names}`, `"אחים": 3 עד 9 על ${names}`)], s),
        { chordTonesOnBeats: true },
        SIG[mod(key + 5, 12)],
      );
    }
    case 'h11-arp-scale': {
      // Arpeggio up from a chord tone (8ths), then the dominant scale down from the next chord tone above, by the rules.
      const op = Math.min(3, Math.max(0, s.option ?? 0));
      const arp = [
        [0, 4, 7, 10],
        [4, 7, 10, 14],
        [7, 10, 12, 16],
        [10, 12, 16, 19],
      ][op];
      const R0 = pitchIn(key, 60);
      const line: { p: number; beat: number; dur: number; ct?: boolean }[] = arp.map((x, i) => ({ p: R0 + x, beat: i / 2, dur: 0.5, ct: DOM_CT.includes(mod(x, 12)) }));
      let p = R0 + arp[3] + 1;
      while (!DOM_CT.includes(mod(p - key, 12))) p++;
      for (let i = 0; i <= 12; i++) {
        if (i > 0)
          do p--;
          while (!DOM_DESC.includes(mod(p - key, 12)));
        line.push({ p, beat: 2 + i / 2, dur: i === 12 ? 1 : 0.5, ct: DOM_CT.includes(mod(p - key, 12)) });
      }
      const from = [t('root', 'היסוד'), t('3rd', 'הטרצה'), t('5th', 'הקווינטה'), t('7th', 'הספטימה')][op];
      return lineDrill(
        s,
        line,
        title([H(11, `${kn}7: arpeggio up from the ${from.en}, the scale down by the rules`, `${kn}7: ארפג׳יו למעלה מ${from.he}, הסולם למטה לפי הכללים`)], s),
        { chordTonesOnBeats: true },
        SIG[mod(key + 5, 12)],
      );
    }
    case 'h14-rules': {
      // Barry's half-step rules (PIANO_JAZZ): from a tension (9th, 13th) the half step comes at once; between chord
      // tones one scale tone, a chromatic one where none fits — chord tones always land on the beats.
      const o = Math.min(3, Math.max(0, s.option ?? 0));
      const km = keyName(key, true);
      const sp = [
        { ct: DOM_CT, sc: SCALE_INTERVALS.mixolydian, from: 2, en: `${kn}7 from the 9th`, he: `${kn}7 מה-9`, sig: SIG[mod(key + 5, 12)] },
        { ct: DOM_CT, sc: SCALE_INTERVALS.mixolydian, from: 9, en: `${kn}7 from the 13th`, he: `${kn}7 מה-13`, sig: SIG[mod(key + 5, 12)] },
        { ct: [0, 4, 7, 9], sc: maj, from: 2, en: `${kn}6 from the 9th`, he: `${kn}6 מה-9`, sig: SIG[key] },
        { ct: [0, 3, 7, 9], sc: SCALE_INTERVALS.melodic, from: 2, en: `${km}m6 from the 9th`, he: `${km}m6 מה-9`, sig: SIG[mod(key + 3, 12)] },
      ][o];
      const { line, next } = ruleDown(pitchIn(key + sp.from, 79), sp.ct.map((x) => mod(x + key, 12)), sp.sc.map((x) => mod(x + key, 12)), 6);
      line.push({ p: next, beat: 6, dur: 1, ct: true });
      return lineDrill(s, line, title([H(14, `the half-step rule — ${sp.en}, chord tones on the beats`, `חוק חצי הטון — ${sp.he}, צלילי אקורד על הפעמות`)], s), { chordTonesOnBeats: true }, sp.sig);
    }
    case 'h15-iivi': {
      // ii–V–I lines by the rules (PIANO_JAZZ): each chord an arpeggio up from a chord tone, then the scale down by the
      // half-step rules from the next chord tone above. Minor: Dø is Fm6, G7♭9 comes down its diminished, Cm6.
      const mi = s.option === 1;
      const segs: { up: number[]; down: number[]; sc: number[]; beats: number }[] = (
        mi
          ? [
              { up: [2, 5, 8, 0], down: [5, 8, 0, 2], sc: [5, 7, 8, 10, 0, 2, 4], beats: 4 },
              { up: [7, 11, 2, 5], down: [11, 2, 5, 8], sc: [7, 8, 10, 11, 1, 2, 4, 5], beats: 4 },
              { up: [0, 3, 7, 11], down: [0, 3, 7, 9], sc: [0, 2, 3, 5, 7, 9, 11], beats: 8 },
            ]
          : [
              { up: [2, 5, 9, 0], down: [5, 9, 0, 2], sc: maj, beats: 4 },
              { up: [7, 11, 2, 5], down: [7, 11, 2, 5], sc: SCALE_INTERVALS.mixolydian.map((x) => x + 7), beats: 4 },
              { up: [0, 4, 7, 11], down: [0, 4, 7, 9], sc: maj, beats: 8 },
            ]
      ).map((g) => ({ up: g.up.map((x) => mod(x + key, 12)), down: g.down.map((x) => mod(x + key, 12)), sc: g.sc.map((x) => mod(x + key, 12)), beats: g.beats }));
      const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
      let at = 0;
      let next = pitchIn(key + 5, 60);
      for (const g of segs)
        for (let b = 0; b < g.beats; b += 4) {
          let p = nearestIn(g.up, next, 57, 68);
          for (let i = 0; i < 4; i++) {
            if (i > 0) {
              p++;
              while (!g.up.includes(mod(p, 12))) p++;
            }
            line.push({ p, beat: at + i / 2, dur: 0.5, ct: true });
          }
          let top = p + 1;
          while (!g.down.includes(mod(top, 12))) top++;
          const r = ruleDown(top, g.down, g.sc, 2, at + 2);
          line.push(...r.line);
          next = r.next;
          at += 4;
        }
      line.push({ p: nearestIn([key], next, 55, 72), beat: at, dur: 1, ct: true });
      const ttl = mi
        ? H(15, `minor ii–V–i in ${keyName(key, true)}: arpeggio up, the scale down by the rules (ø as m6, V7♭9 down its diminished)`, `ii–V–i מינורי ב-${keyName(key, true)}: ארפג׳יו למעלה, הסולם למטה לפי החוקים (ø כ-m6, V7♭9 דרך המוקטן)`)
        : H(15, `ii–V–I in ${kn}: arpeggio up, the scale down by the rules`, `ii–V–I ב-${kn}: ארפג׳יו למעלה, הסולם למטה לפי החוקים`);
      return lineDrill(s, line, title([ttl], s), { chordTonesOnBeats: true }, SIG[mi ? mod(key + 3, 12) : key]);
    }
    case 'h16-chains':
    case 'h17-chromatic':
    case 'h18-sixfive':
      return harrisChromatic(s);
    case 'h9-sixdim':
    case 'h10-minor6dim': {
      const minor6 = s.kind === 'h10-minor6dim';
      const drop = Math.min(2, Math.max(0, s.option ?? 0));
      const six = minor6 ? [0, 2, 3, 5, 7, 8, 9, 11] : SCALE_INTERVALS['six-dim'];
      const mel0 = pitchIn(key, 67);
      const ks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0];
      const evs: ChordEv[] = ks.map((k, i) => {
        const m = degPitch(mel0, six, k);
        const chord = (k % 2 === 0 ? (minor6 ? [0, 3, 7, 9] : [0, 4, 7, 9]) : [11, 2, 5, 8]).map((x) => mod(x + key, 12));
        const v = [m];
        for (let p = m - 1; v.length < 4; p--) if (chord.includes(mod(p, 12))) v.push(p);
        if (drop === 1) v[1] -= 12;
        if (drop === 2) v[2] -= 12;
        v.sort((a, b) => a - b);
        const notes: SN[] = v.map((p, j) => ({
          pitch: p,
          hand: drop > 0 && j === 0 ? 'L' : 'R',
          accent: j === 3,
        }));
        return {
          beat: i,
          dur: i === ks.length - 1 ? 2 : 1,
          notes,
          required: chord,
          allowed: chord,
        };
      });
      const dn = [t('close position', 'מצב צמוד'), t('drop 2', 'דרופ 2'), t('drop 3', 'דרופ 3')][drop];
      const sp: DrillSpec = { ...s, hands: drop > 0 ? 'RL' : 'R' };
      const ttl = minor6
        ? title([H(10, `${keyName(key, true)}m6 / diminished block chords (minor 6th-diminished scale)`, `אקורדי בלוק ${keyName(key, true)}m6 / מוקטן (סולם שישית-מוקטן מינורי)`), dn], sp)
        : title([H(9, `${kn}6 / diminished block chords`, `אקורדי בלוק ${kn}6 / מוקטן`), dn], sp);
      return chordDrill(s, evs, ttl, 60, {}, SIG[minor6 ? mod(key + 3, 12) : key]);
    }
    case 'h13-dimmoves': {
      // Barry's diminished moves on the keys (owner 2026-11-08): the diminished chord a half step under the key, then one
      // note moves a half step — down: a dominant 7 that resolves to its key (all four keys of the diminished chord);
      // up (option 1): a minor 6 chord, itself a home chord.
      const up = (s.option ?? 0) === 1;
      const dimRoot = mod(key + 11, 12);
      const close = (pcs: number[], from = 55) => {
        const out: number[] = [];
        for (let p = from; out.length < pcs.length; p++) if (pcs.includes(mod(p, 12))) out.push(p);
        return out;
      };
      const dim = [0, 3, 6, 9].map((x) => mod(dimRoot + x, 12));
      const evs: ChordEv[] = [];
      let beat = 0;
      const push = (pcs: number[], dur: number, voiced?: number[]) => {
        const v = voiced ?? close(pcs);
        evs.push({ beat, dur, notes: v.map((p, j) => ({ pitch: p, hand: 'R' as const, accent: j === v.length - 1 })), required: pcs, allowed: pcs });
        beat += dur;
      };
      const dimV = close(dim);
      // the order Barry teaches: the move that lands in the key first, then round the other three
      const first = dimV.findIndex((p) => mod(p + (up ? 1 : -1), 12) === mod(up ? key + 7 : key + 7, 12));
      const order = [0, 1, 2, 3].map((x) => (x + Math.max(0, first)) % 4);
      for (const j of order) {
        push(dim, 1, dimV);
        const moved = dimV.map((p, i) => (i === j ? p + (up ? 1 : -1) : p));
        const pcs = moved.map((p) => mod(p, 12));
        push(pcs, 1, moved);
        if (!up) {
          // V7 → I6: the lowered note is the dominant's root; home is a fourth above it
          const home = mod(moved[j] + 5, 12);
          push([0, 4, 7, 9].map((x) => mod(home + x, 12)), 2);
        } else beat += 0;
      }
      const ttl = up
        ? title([H(13, `${keyName(dimRoot)}°7: raise one note — four minor 6 chords`, `${keyName(dimRoot)}°7: מעלים צליל אחד — ארבעה אקורדי מינור 6`)], s)
        : title([H(13, `${keyName(dimRoot)}°7: lower one note — a dominant, then home, in four keys`, `${keyName(dimRoot)}°7: מורידים צליל אחד — דומיננט ואז הביתה, בארבעה סולמות`)], s);
      return chordDrill(s, evs, ttl, 60, {}, SIG[key]);
    }
  }
  throw new Error(`Unknown Barry Harris drill: ${s.kind}`);
}

// ───────────────────────────── J / V: jazz voicings and lines ─────────────────────────────

/** Voicings written for C (ii–V–I of C); transposed by the key, the whole progression shifted to stay in the LH register. */
function transposeProg(prog: number[][], key: number, maxLow = 58): number[][] {
  let o = mod(key, 12);
  if (Math.min(...prog[0]) + o > maxLow) o -= 12;
  return prog.map((c) => c.map((p) => p + o));
}

interface JChord {
  v: number[];
  req: number[];
  allow: number[];
  /** How many of the lowest notes the LH plays (the rest RH); default: all in the drill's hand. */
  lh?: number;
}

const DM = { root: 2, tones: [2, 5, 9, 0], allow: [2, 4, 5, 7, 9, 0] };
const G7 = { root: 7, tones: [7, 11, 2, 5], allow: [7, 9, 11, 2, 4, 5] };
const CM = { root: 0, tones: [0, 4, 7, 11], allow: [0, 2, 4, 7, 9, 11] };

function genVoicings(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const kn = keyName(key);
  const op = s.option ?? 0;
  let chords: JChord[] = [];
  let name: T2 = t('', '');
  let beatsPer = 2;
  /** Explicit [beat, length] per chord (comping rhythms). */
  let times: [number, number][] | null = null;
  const hand: Hand = s.kind === 'guide-tones' ? 'R' : 'L';
  const tp = (vs: number[][], reqs: number[][], allows: number[][], maxLow?: number) => {
    const t2 = transposeProg(vs, key, maxLow);
    return t2.map((v, i) => ({
      v,
      req: reqs[i].map((p) => p + key),
      allow: allows[i].map((p) => p + key),
    }));
  };
  switch (s.kind) {
    case 'v-triads': {
      let prev: number[] | null = null;
      chords = [
        [0, 4, 7],
        [5, 9, 0],
        [7, 11, 2],
        [0, 4, 7],
      ].map((c) => {
        const pcs = c.map((p) => p + key);
        const v: number[] = prev ? voiceNear(pcs, prev, 47, 64) : voiceNear(pcs, null, 47, 64, c[2] + key, 55);
        prev = v;
        return { v, req: pcs, allow: pcs };
      });
      name = t(`Triads I–IV–V–I in ${kn}, smooth voice leading`, `משולשים I–IV–V–I ב-${kn}, הובלת קולות חלקה`);
      break;
    }
    case 'v-sevenths': {
      chords = [DM, G7, CM].map((c) => {
        const root = pitchIn(c.root + key, 43);
        const v = c.tones.map((x) => root + mod(x - c.root, 12));
        return {
          v,
          req: c.tones.map((p) => p + key),
          allow: c.tones.map((p) => p + key),
        };
      });
      name = t(`7th chords ii7–V7–Imaj7 in ${kn}, root position`, `אקורדי ספטימה ii7–V7–Imaj7 ב-${kn}, מצב יסודי`);
      break;
    }
    case 'shells': {
      const vs =
        op === 1
          ? [
              [50, 53],
              [43, 53],
              [48, 52],
            ]
          : [
              [50, 60],
              [43, 59],
              [48, 59],
            ];
      const reqs =
        op === 1
          ? [
              [2, 5],
              [7, 5],
              [0, 4],
            ]
          : [
              [2, 0],
              [7, 11],
              [0, 11],
            ];
      chords = tp(
        vs,
        reqs,
        [
          [2, 5, 9, 0],
          [7, 11, 2, 5],
          [0, 4, 7, 11],
        ],
        52,
      );
      name = t(
        `Shell voicings ii–V–I in ${kn} (${op === 1 ? '1-3 / 1-7 / 1-3' : '1-7 / 1-10 / 1-7'})`,
        `קונכיות ii–V–I ב-${kn} (${op === 1 ? '1-3 / 1-7 / 1-3' : '1-7 / 1-10 / 1-7'})`,
      );
      break;
    }
    case 'rootless': {
      if (op === 2) {
        chords = tp(
          [
            [53, 56, 60, 64],
            [53, 56, 59, 63],
            [51, 55, 57, 62],
          ],
          [
            [5, 0],
            [11, 5],
            [3, 9],
          ],
          [
            [2, 4, 5, 7, 8, 0],
            [7, 8, 11, 2, 3, 5],
            [0, 2, 3, 5, 7, 9, 10, 11],
          ],
        );
        name = t(
          `Rootless minor ii–V–i in ${keyName(key, true)} minor (ø7 – 7♭9 – m6/9)`,
          `ללא יסוד ii–V–i מינורי ב-${keyName(key, true)} מינור (ø7 – 7♭9 – m6/9)`,
        );
      } else {
        const vs =
          op === 1
            ? [
                [48, 52, 53, 57],
                [47, 52, 53, 57],
                [47, 50, 52, 55],
              ]
            : [
                [53, 57, 60, 64],
                [53, 57, 59, 64],
                [52, 55, 59, 62],
              ];
        chords = tp(
          vs,
          [
            [5, 0],
            [11, 5],
            [4, 11],
          ],
          [DM.allow, G7.allow, CM.allow],
        );
        name = t(`Rootless ${op === 1 ? 'B' : 'A'}-start ii–V–I in ${kn}`, `ללא יסוד מתחילים ב-${op === 1 ? 'B' : 'A'}, ii–V–I ב-${kn}`);
      }
      break;
    }
    case 'one-minute': {
      beatsPer = 2;
      let pair: {
        vs: number[][];
        reqs: number[][];
        allows: number[][];
        maxLow?: number;
      };
      if (op === 1)
        pair = {
          vs: [
            [50, 60],
            [43, 59],
          ],
          reqs: [
            [2, 0],
            [7, 11],
          ],
          allows: [DM.tones, G7.tones],
          maxLow: 52,
        };
      else if (op === 2)
        pair = {
          vs: [
            [52, 55, 59, 62],
            [49, 54, 55, 59],
            [53, 57, 60, 64],
            [53, 57, 59, 64],
          ],
          reqs: [
            [4, 11],
            [1, 7],
            [5, 0],
            [11, 5],
          ],
          allows: [CM.allow, [9, 11, 1, 4, 6, 7], DM.allow, G7.allow],
        };
      else
        pair = {
          vs: [
            [53, 57, 60, 64],
            [53, 57, 59, 64],
          ],
          reqs: [
            [5, 0],
            [11, 5],
          ],
          allows: [DM.allow, G7.allow],
        };
      const base = tp(pair.vs, pair.reqs, pair.allows, pair.maxLow);
      chords = Array.from({ length: 16 }, (_, i) => base[i % base.length]);
      const nm = [
        t('rootless Dm9 (A) ↔ G13 (B)', 'ללא יסוד Dm9 (A) ↔ G13 (B)'),
        t('shells ii 1-7 ↔ V 1-10', 'קונכיות ii 1-7 ↔ V 1-10'),
        t('cycle I–VI–ii–V (A/B)', 'מחזור I–VI–ii–V (A/B)'),
      ][Math.min(2, op)];
      name = t(`One-minute changes in ${kn}: ${nm.en}`, `החלפות בדקה ב-${kn}: ${nm.he}`);
      break;
    }
    case 'so-what': {
      const r = pitchIn(key, 38);
      const v = [2, 7, 12, 17, 21].map((x) => r + x);
      const dor = [0, 2, 3, 5, 7, 9, 10];
      const mk = (o: number) => ({
        v: v.map((p) => p + o),
        req: [2, 7, 0, 5, 9].map((x) => x + key + o),
        allow: dor.map((x) => x + key + o),
      });
      chords = [mk(0), mk(1), mk(0), mk(1), mk(0)];
      name = t(
        `"So What" quartal voicing on ${keyName(key, true)} dorian, up a half step and back`,
        `קוורטל "So What" על ${keyName(key, true)} דורי, חצי טון למעלה ובחזרה`,
      );
      break;
    }
    case 'blues-shells': {
      const roots = [0, 5, 0, 0, 5, 5, 0, 9, 2, 7, 0, 7];
      let prevTop: number | null = null;
      chords = roots.map((r) => {
        const rp = pitchIn(r + key, 41);
        const third = r === 2 ? 3 : 4;
        const cands = [rp + third, rp + 10, rp + 12 + third];
        const top: number = prevTop === null ? cands[1] : cands.reduce((a, b) => (Math.abs(b - prevTop!) < Math.abs(a - prevTop!) ? b : a));
        prevTop = top;
        const tones = [r, r + third, r + 7, r + 10].map((x) => x + key);
        return {
          v: [rp, top],
          req: [r + key, mod(top - rp, 12) === 10 ? r + 10 + key : r + third + key],
          allow: tones,
        };
      });
      beatsPer = 4;
      name = t(`12-bar blues in ${kn} with shells`, `בלוז 12 תיבות ב-${kn} בקונכיות`);
      break;
    }
    case 'guide-tones': {
      const vs =
        op === 1
          ? [
              [60, 65],
              [59, 65],
              [59, 64],
            ]
          : [
              [65, 72],
              [65, 71],
              [64, 71],
            ];
      chords = tp(
        vs,
        [
          [5, 0],
          [11, 5],
          [4, 11],
        ],
        [DM.tones, G7.tones, CM.tones],
        70,
      );
      name = t(`Guide tones (3rds & 7ths) ii–V–I in ${kn}`, `צלילים מנחים (טרצות וספטימות) ii–V–I ב-${kn}`);
      break;
    }
    case 'ust': {
      const which = Math.min(4, Math.max(0, op));
      const dom = mod(key + 7, 12);
      const triRoot = [2, 3, 6, 8, 9][which];
      const lhV = [pitchIn(dom + 4, 46), pitchIn(dom + 4, 46) + 6];
      const tri = [0, 4, 7].map((x) => mod(dom + triRoot + x, 12));
      const rhV = voiceNear(tri, null, Math.max(62, lhV[1] + 1), 79, undefined, 70);
      const ton = mod(key, 12);
      const lhI = [lhV[0], lhV[1] - 1];
      const rhI = voiceNear([ton + 7, ton + 11, ton + 2], rhV, Math.max(62, lhV[1] + 1), 79);
      const vDom = {
        v: [...lhV, ...rhV],
        req: [dom + 4, dom + 10, ...tri],
        allow: [dom + 4, dom + 10, ...tri, dom],
        lh: 2,
      };
      const vTon = {
        v: [...lhI, ...rhI],
        req: [ton + 4, ton + 11],
        allow: [ton, ton + 2, ton + 4, ton + 7, ton + 9, ton + 11],
        lh: 2,
      };
      chords = [vDom, vTon, vDom, vTon];
      const nm = ['II', '♭III', '♭V', '♭VI', 'VI'][which];
      name = t(`Upper structure ${nm} over ${keyName(dom)}7 → ${kn}`, `מבנה עליון ${nm} מעל ${keyName(dom)}7 → ${kn}`);
      break;
    }
    case 'digital': {
      const desc = op === 1;
      const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
      const cs = [DM, G7, CM, CM];
      cs.forEach((c, ci) => {
        const rp = pitchIn(c.root + key, 55);
        const pat = desc ? [7, 4, 2, 0] : [0, 2, 4, 7];
        const third = c === DM ? 3 : 4;
        pat.forEach((x, i) => {
          const semis = x === 4 ? third : x;
          line.push({
            p: rp + semis,
            beat: ci * 2 + i / 2,
            dur: 0.5,
            ct: x !== 2,
          });
        });
      });
      line.push({ p: pitchIn(key, 60), beat: 8, dur: 1, ct: true });
      const sp = { ...s, hands: s.hands === 'L' ? 'L' : 'R' } as DrillSpec;
      return lineDrill(
        sp,
        line,
        title(
          [t(`Digital pattern ${desc ? '5-3-2-1' : '1-2-3-5'} over ii–V–I in ${kn}`, `תבנית דיגיטלית ${desc ? '5-3-2-1' : '1-2-3-5'} על ii–V–I ב-${kn}`)],
          sp,
        ),
        { chordTonesOnBeats: true },
        SIG[key],
      );
    }
    case 'quartal': {
      // Stacked diatonic 4ths on every degree of the dorian scale (McCoy Tyner / Levine): 3 notes LH, or 4 notes split.
      const four = op === 1;
      const dor = [0, 2, 3, 5, 7, 9, 10];
      const base = pitchIn(key, 43);
      chords = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0].map((k) => {
        const v = [0, 3, 6, ...(four ? [9] : [])].map((x) => degPitch(base, dor, k + x));
        return { v, req: v, allow: dor.map((x) => x + key), ...(four ? { lh: 2 } : {}) };
      });
      beatsPer = 1;
      name = t(
        `Quartal voicings (${four ? '4' : '3'} notes in 4ths) through ${keyName(key, true)} dorian`,
        `קולות קוורטליים (${four ? '4' : '3'} צלילים בקוורטות) דרך ${keyName(key, true)} דורי`,
      );
      break;
    }
    case 'drop2': {
      // Close 4-note voicings with the top voice led smoothly; the 2nd voice from the top dropped an octave into the LH.
      let prevClose: number[] | null = null;
      chords = [DM, G7, CM].map((c) => {
        const pcs = c.tones.map((p) => p + key);
        const close: number[] = prevClose ? voiceNear(pcs, prevClose, 55, 81) : voiceNear(pcs, null, 55, 81, c.tones[0] + 10 + key, 74);
        prevClose = close;
        const [a, b, cc, d] = close;
        return { v: [cc - 12, a, b, d], req: c.tones.map((p) => p + key), allow: c.allow.map((p) => p + key), lh: 1 };
      });
      name = t(`Drop-2 voicings, two hands, ii–V–I in ${kn}`, `קולות דרופ 2 בשתי ידיים, ii–V–I ב-${kn}`);
      break;
    }
    case 'two-hand': {
      // LH guide tones (3 & 7), RH the colour tones (9, 13 / 5): Dm9 – G13 – Cmaj9.
      chords = tp(
        [
          [53, 60, 64, 69, 74],
          [53, 59, 64, 69, 74],
          [52, 59, 62, 67, 69],
        ],
        [
          [5, 0, 4],
          [11, 5, 4],
          [4, 11, 2],
        ],
        [DM.allow, G7.allow, CM.allow],
        55,
      ).map((c) => ({ ...c, lh: 2 }));
      name = t(`Two-handed voicings ii–V–I in ${kn} (LH 3 & 7, RH 9-13)`, `קולות בשתי ידיים ii–V–I ב-${kn} (שמאל 3 ו-7, ימין 9-13)`);
      break;
    }
    case 'tritone-sub': {
      chords = tp(
        [
          [53, 57, 60, 64],
          [53, 58, 59, 63],
          [52, 55, 59, 62],
        ],
        [
          [5, 0],
          [5, 11],
          [4, 11],
        ],
        [DM.allow, [1, 3, 5, 8, 10, 11], CM.allow],
      );
      name = t(`Tritone substitution ii–♭II7–I in ${kn} (rootless)`, `תחליף טריטון ii–♭II7–I ב-${kn} (ללא יסוד)`);
      break;
    }
    case 'comp': {
      // Comping rhythms with rootless A / B voicings: Charleston, reverse Charleston, anticipations, Red Garland (&2, &4).
      const which = Math.min(3, Math.max(0, op));
      const base = tp(
        [
          [53, 57, 60, 64],
          [53, 57, 59, 64],
          [52, 55, 59, 62],
          [52, 55, 59, 62],
        ],
        [
          [5, 0],
          [11, 5],
          [4, 11],
          [4, 11],
        ],
        [DM.allow, G7.allow, CM.allow, CM.allow],
      );
      const hits: [number, number][] = [
        [
          [0, 1.5],
          [1.5, 2.5],
        ],
        [
          [0.5, 1.5],
          [2, 2],
        ],
        [[0, 3.5]],
        [
          [1.5, 2],
          [3.5, 0.5],
        ],
      ][which] as [number, number][];
      chords = [];
      const tt: [number, number][] = [];
      times = tt;
      base.forEach((c, bar) => {
        for (const [b, d] of hits) {
          // Anticipations: every chord after the first arrives on the "and" of 4 of the bar before.
          const at = which === 2 && bar > 0 ? bar * 4 - 0.5 : bar * 4 + b;
          const dur = which === 2 ? (bar === 0 ? 3.5 : bar === base.length - 1 ? 4.5 : 4) : d;
          chords.push(c);
          tt.push([at, dur]);
        }
      });
      const nm = [t('Charleston', "צ'רלסטון"), t('reverse Charleston', "צ'רלסטון הפוך"), t('anticipations (the "and" of 4)', 'הקדמות (ה"וְ" של 4)'), t('Red Garland (&2, &4)', 'רד גרלנד (וְ-2, וְ-4)')][which];
      name = t(`Comping rhythm: ${nm.en} · ii–V–I in ${kn}`, `מקצב ליווי: ${nm.he} · ii–V–I ב-${kn}`);
      break;
    }
    case 'coltrane-v': {
      // Coltrane changes (Giant Steps cycle) with root + guide tones in the LH.
      let prev: number[] | null = null;
      chords = COLTRANE.map(([d, q]) => {
        const r = mod(key + d, 12);
        const ints = Q7[q];
        const g = [r + ints[1], r + ints[3]];
        const gv: number[] = prev ? voiceNear(g, prev, 50, 62) : voiceNear(g, null, 50, 62, undefined, 56);
        prev = gv;
        return { v: [pitchIn(r, 36), ...gv], req: [r, ...g], allow: [...ints.map((x) => r + x), r + 2] };
      });
      name = t(`Coltrane changes in ${kn}: root + guide tones (${coltraneNames(key)})`, `מהלכי קולטריין ב-${kn}: יסוד + צלילים מנחים (${coltraneNames(key)})`);
      break;
    }
    default:
      throw new Error(`Unknown voicing drill: ${s.kind}`);
  }
  const evs: ChordEv[] = chords.map((c, i) => {
    const notes: SN[] = c.v.map((p, j) => ({
      pitch: p,
      hand: c.lh !== undefined ? (j < c.lh ? 'L' : 'R') : hand,
    }));
    if (s.kind === 'guide-tones' && s.hands === 'RL') {
      const root = [DM, G7, CM][i].root;
      notes.push({ pitch: pitchIn(root + key, 41), hand: 'L' });
    }
    const beat = times ? times[i][0] : s.kind === 'guide-tones' ? [0, 2, 4][i] : i * beatsPer;
    const dur = times ? times[i][1] : s.kind === 'guide-tones' ? [2, 2, 4][i] : beatsPer;
    return { beat, dur, notes, required: c.req, allowed: c.allow };
  });
  const sp: DrillSpec = s.kind === 'ust' ? { ...s, hands: 'RL' } : s;
  const bpm = s.kind === 'one-minute' ? 40 : 60;
  return chordDrill(s, evs, title([name], sp), bpm, {}, SIG[key]);
}

// ───────────────────────────── M: accompaniment ─────────────────────────────

function genStride(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = Math.min(2, Math.max(0, s.option ?? 0));
  const prog = [
    { root: 0, ch: [0, 4, 7] },
    { root: 5, ch: [5, 9, 0] },
    { root: 7, ch: [11, 2, 5] },
    { root: 0, ch: [0, 4, 7] },
  ];
  const buf = new Buf();
  let prev: number[] | null = null;
  const bassNotes = (pc: number): SN[] => {
    const b = pitchIn(pc, 36);
    if (op === 0) return [{ pitch: b, hand: 'L', finger: 5 }];
    return [
      { pitch: b, hand: 'L', finger: 5 },
      { pitch: b + (op === 1 ? 12 : 16), hand: 'L', finger: 1 },
    ];
  };
  prog.forEach((c, bar) => {
    const pcs = c.ch.map((p) => p + key);
    const v: number[] = prev ? voiceNear(pcs, prev, 52, 67) : voiceNear(pcs, null, 52, 67, undefined, 60);
    prev = v;
    buf.add(bar * 4, 1, bassNotes(c.root + key));
    buf.add(
      bar * 4 + 1,
      1,
      v.map((p) => ({ pitch: p, hand: 'L' as Hand })),
    );
    buf.add(bar * 4 + 2, 1, bassNotes(op === 2 ? c.root + key : c.root + key + 7));
    buf.add(
      bar * 4 + 3,
      1,
      v.map((p) => ({ pitch: p, hand: 'L' as Hand })),
    );
  });
  buf.add(16, 2, bassNotes(key));
  const nm = [t('single bass', 'בס בודד'), t('octave bass', 'בס באוקטבות'), t('10ths', 'דצימות')][op];
  const sp: DrillSpec = { ...s, hands: 'L' };
  return finish(s, buf, title([t(`Stride I–IV–V7–I in ${keyName(key)}`, `סטרייד I–IV–V7–I ב-${keyName(key)}`), nm], sp), { evenness: false, hands: false }, 80);
}

function genWalking(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = Math.min(2, Math.max(0, s.option ?? 0));
  const bars = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
  const buf = new Buf();
  const rootP = (pc: number) => pitchIn(pc + key, 40);
  bars.forEach((r, bar) => {
    const rp = rootP(r);
    const next = rootP(bars[(bar + 1) % bars.length]);
    const appr = next === rp ? next + 1 : next - 1;
    const pat: [number, boolean][] =
      op === 0
        ? [
            [rp, true],
            [rp, true],
            [rp + 7, true],
            [appr, false],
          ]
        : op === 1
          ? [
              [rp, true],
              [rp + 4, true],
              [rp + 7, true],
              [appr, false],
            ]
          : [
              [rp, true],
              [rp + 2, false],
              [rp + 4, true],
              [appr, false],
            ];
    pat.forEach(([p, ct], i) => buf.add(bar * 4 + i, 1, [{ pitch: p, hand: 'L', chordTone: ct }]));
  });
  buf.add(48, 2, [{ pitch: rootP(0), hand: 'L', chordTone: true }]);
  const nm = [t('roots + approach', 'יסודות + צליל גישה'), t('chord tones + approach', 'צלילי אקורד + גישה'), t('scale walk + approach', 'הליכה בסולם + גישה')][
    op
  ];
  const sp: DrillSpec = { ...s, hands: 'L' };
  return finish(
    s,
    buf,
    title([t(`Walking bass, blues in ${keyName(key)}`, `בס מהלך, בלוז ב-${keyName(key)}`), nm], sp),
    { evenness: true, hands: false, chordTonesOnBeats: true },
    80,
    4,
    SIG[key],
  );
}

// ───────────────────────────── coverage additions (docs/research/DRILLS_COVERAGE_AUDIT.md) ─────────────────────────────

const handsOf = (s: DrillSpec): Hand[] => (s.hands === 'RL' ? ['R', 'L'] : [s.hands]);
const opOf = (s: DrillSpec, max: number): number => Math.min(max, Math.max(0, s.option ?? 0));

/** Small deterministic PRNG (mulberry32) seeded from a string: sight-reading melodies are stable per item. */
function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chord qualities as intervals from the root (forms, Coltrane cycle). */
const Q7: Record<string, number[]> = {
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  hd7: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
};
/** The Giant Steps cycle resolving to the tonic: I – V7/♭VI – ♭VI – V7/III – III – V7 – I (2 beats each). */
const COLTRANE: [number, string][] = [
  [0, 'maj7'],
  [3, '7'],
  [8, 'maj7'],
  [11, '7'],
  [4, 'maj7'],
  [7, '7'],
  [0, 'maj7'],
];
const coltraneNames = (key: number): string => COLTRANE.map(([d, q]) => keyName(key + d) + (q === '7' ? '7' : 'maj7')).join(' ');

/** Jazz scales beyond the ScaleType list (chord-scale practice: Levine, Aebersold). */
export const JAZZ_SCALES: { ints: number[]; name: T2 }[] = [
  { ints: [0, 2, 3, 5, 7, 9, 10], name: t('dorian', 'דורי') },
  { ints: [0, 2, 4, 6, 7, 9, 10], name: t('lydian dominant', 'לידי דומיננטי') },
  { ints: [0, 1, 3, 4, 6, 8, 10], name: t('altered (super-locrian)', 'אלטרד (סופר-לוקרי)') },
  { ints: [0, 2, 4, 6, 8, 10], name: t('whole-tone', 'טון שלם') },
  { ints: [0, 1, 3, 4, 6, 7, 9, 10], name: t('diminished half-whole', 'מוקטן חצי-שלם') },
  { ints: [0, 2, 3, 5, 6, 8, 9, 11], name: t('diminished whole-half', 'מוקטן שלם-חצי') },
  { ints: [0, 2, 3, 4, 5, 7, 9, 10], name: t('bebop dorian', 'ביבופ דורי') },
  { ints: [0, 2, 3, 5, 7, 9, 11], name: t('jazz melodic minor', 'מינור מלודי ג׳אזי') },
  { ints: [0, 3, 5, 7, 10], name: t('minor pentatonic', 'פנטטוני מינורי') },
  { ints: [0, 2, 4, 6, 7, 9, 11], name: t('lydian', 'לידי') },
];

function genJScale(s: DrillSpec): Drill {
  const sc = JAZZ_SCALES[opOf(s, JAZZ_SCALES.length - 1)];
  const oct = s.octaves ?? 2;
  const N = sc.ints.length * oct;
  const base = rhBase(s.key);
  const ks = [...Array.from({ length: N + 1 }, (_, k) => k), ...Array.from({ length: N }, (_, k) => N - 1 - k)];
  const steps: Step[] = ks.map((k) => handsOf(s).map((h) => ({ pitch: degPitch(h === 'R' ? base : s.hands === 'L' && oct >= 2 ? base - 24 : base - 12, sc.ints, k), hand: h })));
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  return finish(s, buf, title([t(`${keyName(s.key)} ${sc.name.en} scale`, `סולם ${sc.name.he} ${keyName(s.key)}`), t(`${oct} oct`, `${oct} אוק׳`)], s), goalOf(s, true), bpmFor(2.2, perBeat), 4, 'C');
}

/** Balance (K8): a hands-together scale with one hand louder (the melody hand) — the accented hand must sing. */
function genBalance(s: DrillSpec): Drill {
  const loud: Hand = s.option === 1 ? 'L' : 'R';
  const d = genScale({ ...s, hands: 'RL' });
  const nm = loud === 'R' ? t('RH loud, LH soft (balance)', 'יד ימין חזקה, שמאל רכה (איזון)') : t('LH loud, RH soft (balance)', 'יד שמאל חזקה, ימין רכה (איזון)');
  return {
    ...d,
    notes: d.notes.map((n) => (n.hand === loud ? { ...n, accent: true } : n)),
    title: title([t(`${keyLabel(s)} ${SCALE_T[scaleTypeOf(s)].en}`, `${keyLabel(s)} ${SCALE_T[scaleTypeOf(s)].he}`), nm], s),
    goal: { ...d.goal, dynamics: 'voicing' },
  };
}

/** Blocked (solid) triads through the inversions and back (ABRSM / RCM "solid chords"). */
function genBlocked(s: DrillSpec): Drill {
  const tones = s.minor ? CHORD.min : CHORD.maj;
  const rootR = rhBase(s.key);
  const buf = new Buf();
  const order = [0, 1, 2, 3, 2, 1, 0];
  order.forEach((inv, i) => {
    const sns: SN[] = [];
    for (const h of handsOf(s)) {
      const v = [0, 1, 2].map((q) => degPitch(h === 'R' ? rootR : rootR - 12, tones, inv + q));
      const fs = triadFinger(v, mod(s.key, 12), h);
      v.forEach((p, j) => sns.push({ pitch: p, hand: h, finger: fs[j] }));
    }
    buf.add(i, i === order.length - 1 ? 2 : 1, sns);
  });
  const mm = s.minor ? t('minor', 'מינור') : t('major', "מז'ור");
  return finish(s, buf, title([t(`${keyLabel(s)} ${mm.en} blocked chords through the inversions`, `אקורדים סגורים ${keyLabel(s)} ${mm.he} דרך ההיפוכים`)], s), goalOf(s, false), 60);
}

const ORN_T = [
  t('upper mordent', 'מורדנט עליון'),
  t('lower mordent', 'מורדנט תחתון'),
  t('turn (upper note first)', 'גרופטו (מהצליל העליון)'),
  t('acciaccatura (grace note before the beat)', 'אקצ׳קטורה (צליל חן לפני הפעמה)'),
  t('appoggiatura (on the beat, half the value)', 'אפוג׳טורה (על הפעמה, חצי מהערך)'),
  t('trill from the upper note with a turned ending', 'טריל מהצליל העליון עם סיום מסובב'),
];

/** Ornaments on a five-finger melody: mordents, turn, grace notes, appoggiatura, trill with a Nachschlag. */
function genOrnament(s: DrillSpec): Drill {
  const op = opOf(s, 5);
  const hand: Hand = s.hands === 'L' ? 'L' : 'R';
  const base = hand === 'L' ? rhBase(s.key) - 12 : rhBase(s.key);
  const P = (k: number) => degPitch(base, SCALE_INTERVALS.major, k);
  const buf = new Buf();
  const add = (b: number, d: number, k: number) => buf.add(b, d, [{ pitch: P(k), hand }]);
  if (op === 5) {
    [0, 1, 2, 3].forEach((d, bar) => {
      const b0 = bar * 4;
      for (let i = 0; i < 10; i++) add(b0 + i / 4, 0.25, i % 2 === 0 ? d + 1 : d);
      add(b0 + 2.5, 0.25, d - 1);
      add(b0 + 2.75, 0.25, d);
      add(b0 + 3, 1, d + 1);
    });
    add(16, 1, 0);
  } else {
    const start = op === 3 ? 1 : 0;
    [0, 1, 2, 3, 4, 3, 2, 1].forEach((k, i) => {
      const b = start + i;
      if (op === 0 || op === 1) {
        add(b, 0.125, k);
        add(b + 0.125, 0.125, op === 0 ? k + 1 : k - 1);
        add(b + 0.25, 0.75, k);
      } else if (op === 2) {
        add(b, 0.25, k + 1);
        add(b + 0.25, 0.25, k);
        add(b + 0.5, 0.25, k - 1);
        add(b + 0.75, 0.25, k);
      } else if (op === 3) {
        add(b - 0.125, 0.125, k + 1);
        add(b, 1, k);
      } else {
        add(b, 0.5, k + 1);
        add(b + 0.5, 0.5, k);
      }
    });
    add(start + 8, 1, 0);
  }
  return finish(s, buf, title([t(`Ornaments: ${ORN_T[op].en} in ${keyLabel(s)}`, `קישוטים: ${ORN_T[op].he} ב-${keyLabel(s)}`)], s), goalOf(s, false), 60);
}

/** Thumb-under preparation (Hanon Part II / Cortot ch. 2): the thumb passes under 3 (option 0) or 4 (option 1) and back. */
function genThumbUnder(s: DrillSpec): Drill {
  const four = s.option === 1;
  const motif = four ? [0, 1, 2, 3, 4, 3, 2, 1] : [0, 1, 2, 3, 2, 1];
  const fUp = four ? [1, 2, 3, 4, 1, 4, 3, 2] : [1, 2, 3, 1, 3, 2];
  const fDown = four ? [4, 3, 2, 1, 4, 1, 2, 3] : [3, 2, 1, 3, 1, 2];
  const ints = s.minor ? SCALE_INTERVALS.natural : SCALE_INTERVALS.major;
  const base = rhBase(s.key);
  const seq = sequenceMotif(motif, 7);
  const m = motif.length;
  const steps: Step[] = seq.map((e, i) =>
    handsOf(s).map((h) => {
      // RH up = thumb under; RH down = 3 / 4 over; the LH mirrors (its way up is the RH's way down).
      const fr = e.up === (h === 'R') ? fUp : fDown;
      return { pitch: degPitch(h === 'R' ? base : base - 12, ints, e.deg), hand: h, finger: i === seq.length - 1 ? undefined : fr[i % m] };
    }),
  );
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  return finish(s, buf, title([t(`Thumb under after finger ${four ? 4 : 3} in ${keyLabel(s)}`, `העברת אגודל אחרי אצבע ${four ? 4 : 3} ב-${keyLabel(s)}`)], s), goalOf(s, true), bpmFor(2.2, perBeat));
}

/** Double 3rds (option 0) / 6ths (option 1) in one hand, diatonic, up and down. */
function genDoubleNotes(s: DrillSpec): Drill {
  const gap = s.option === 1 ? 5 : 2;
  const ints = s.minor ? SCALE_INTERVALS.harmonic : SCALE_INTERVALS.major;
  const oct = s.octaves ?? 1;
  const N = 7 * oct;
  const hand: Hand = s.hands === 'L' ? 'L' : 'R';
  let base = hand === 'R' ? rhBase(s.key) : rhBase(s.key) - (oct >= 2 ? 24 : 12);
  if (hand === 'R' && degPitch(base, ints, N + gap) > 92) base -= 12;
  const ks = [...Array.from({ length: N + 1 }, (_, k) => k), ...Array.from({ length: N }, (_, k) => N - 1 - k)];
  const steps: Step[] = ks.map((k) => [
    { pitch: degPitch(base, ints, k), hand },
    { pitch: degPitch(base, ints, k + gap), hand },
  ]);
  const perBeat = s.perBeat ?? 2;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const nm = gap === 2 ? t('Double 3rds', 'טרצות כפולות') : t('Double 6ths', 'סקסטות כפולות');
  return finish(s, buf, title([nm, t(`${keyLabel(s)} ${s.minor ? 'harmonic minor' : 'major'}`, `${keyLabel(s)} ${s.minor ? 'מינור הרמוני' : "מז'ור"}`), t(`${oct} oct`, `${oct} אוק׳`)], s), goalOf(s, true), bpmFor(1.6, perBeat));
}

/** Leaps: waltz bass (LH, 3/4), RH two-octave jumps, both hands leaping outwards, LH crossing over the RH (option 3). */
function genLeaps(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = opOf(s, 3);
  const buf = new Buf();
  if (op === 3) {
    // Hand crossing (Czerny Op. 740, Scarlatti): the RH keeps a broken chord going in the middle; the LH plays the bass
    // on beat 1 and crosses over the RH to play the chord's 3rd above it on beat 3. I–IV–V7–I twice.
    const prog = [
      { r: 0, ch: [0, 4, 7], third: 4 },
      { r: 5, ch: [5, 9, 0], third: 9 },
      { r: 7, ch: [11, 5, 7], third: 11 },
      { r: 0, ch: [0, 4, 7], third: 4 },
    ];
    let prev: number[] | null = null;
    for (let bar = 0; bar < 8; bar++) {
      const c = prog[bar % 4];
      const v: number[] = voiceNear(
        c.ch.map((p) => p + key),
        prev,
        55,
        67,
        undefined,
        60,
      );
      prev = v;
      [v[0], v[2], v[1], v[2], v[0], v[2], v[1], v[2]].forEach((p, i) => buf.add(bar * 4 + i / 2, 0.5, [{ pitch: p, hand: 'R', finger: p === v[0] ? 1 : p === v[1] ? 3 : 5 }]));
      buf.add(bar * 4, 2, [{ pitch: pitchIn(c.r + key, 36), hand: 'L', finger: 5 }]);
      buf.add(bar * 4 + 2, 2, [{ pitch: pitchIn(c.third + key, 68), hand: 'L', finger: 2 }]);
    }
    buf.add(32, 2, [
      { pitch: pitchIn(key, 36), hand: 'L', finger: 5 },
      { pitch: prev![0], hand: 'R', finger: 1 },
    ]);
    return finish(s, buf, title([t(`Hand crossing: LH bass, then over the RH, I–IV–V7–I in ${keyName(key)}`, `הצלבת ידיים: בס ביד שמאל, ואז מעל יד ימין, I–IV–V7–I ב-${keyName(key)}`)], s), { evenness: true, hands: false }, 72, 4, SIG[key]);
  }
  if (op === 0) {
    const prog = [
      { r: 0, ch: [0, 4, 7] },
      { r: 5, ch: [5, 9, 0] },
      { r: 7, ch: [11, 5, 7] },
      { r: 0, ch: [0, 4, 7] },
    ];
    let prev: number[] | null = null;
    for (let bar = 0; bar < 8; bar++) {
      const c = prog[bar % 4];
      const pcs = c.ch.map((p) => p + key);
      const v: number[] = prev ? voiceNear(pcs, prev, 52, 67) : voiceNear(pcs, null, 52, 67, undefined, 60);
      prev = v;
      buf.add(bar * 3, 1, [{ pitch: pitchIn(c.r + key, 36), hand: 'L', finger: 5 }]);
      for (const k of [1, 2]) buf.add(bar * 3 + k, 1, v.map((p) => ({ pitch: p, hand: 'L' as Hand })));
    }
    buf.add(24, 3, [{ pitch: pitchIn(key, 36), hand: 'L', finger: 5 }]);
    return finish(s, buf, title([t(`Waltz bass leaps I–IV–V7–I in ${keyName(key)}`, `קפיצות בס ואלס I–IV–V7–I ב-${keyName(key)}`)], { ...s, hands: 'L' }), { evenness: false, hands: false }, 90, 3, SIG[key]);
  }
  const base = rhBase(key);
  [0, 1, 2, 3, 4, 3, 2, 1, 0].forEach((d, i) => {
    const p = degPitch(base, SCALE_INTERVALS.major, d);
    if (op === 1) {
      buf.add(i * 2, 1, [{ pitch: p, hand: 'R' }]);
      buf.add(i * 2 + 1, 1, [{ pitch: p + 24, hand: 'R' }]);
    } else {
      buf.add(i * 2, 1, [
        { pitch: p, hand: 'R' },
        { pitch: p - 12, hand: 'L' },
      ]);
      buf.add(i * 2 + 1, 1, [
        { pitch: p + 24, hand: 'R' },
        { pitch: p - 24, hand: 'L' },
      ]);
    }
  });
  const nm = op === 1 ? t(`RH two-octave leaps in ${keyName(key)}`, `קפיצות של שתי אוקטבות ביד ימין ב-${keyName(key)}`) : t(`Both hands leap outwards in ${keyName(key)}`, `שתי הידיים קופצות החוצה ב-${keyName(key)}`);
  return finish(s, buf, title([nm], s), { evenness: false, hands: op === 2 }, 60, 4, SIG[key]);
}

/** Rotation (forearm): broken 6ths (option 0) or broken octaves (option 1) through the scale, 16ths. */
function genRotation(s: DrillSpec): Drill {
  const gap = s.option === 1 ? 7 : 5;
  const base = rhBase(s.key);
  const ints = SCALE_INTERVALS.major;
  const steps: Step[] = [];
  for (const d of [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0])
    for (let r = 0; r < 4; r++) {
      const upper = r % 2 === 1;
      steps.push(handsOf(s).map((h) => ({ pitch: degPitch(h === 'R' ? base : base - 12, ints, upper ? d + gap : d), hand: h, finger: h === 'R' ? (upper ? 5 : 1) : upper ? 1 : 5 })));
    }
  const perBeat = s.perBeat ?? 4;
  const buf = new Buf();
  buf.steps(steps, 1 / perBeat, s.variant, s.dynamics);
  const nm = gap === 7 ? t('broken octaves', 'אוקטבות שבורות') : t('broken 6ths', 'סקסטות שבורות');
  return finish(s, buf, title([t(`Rotation: ${nm.en} in ${keyLabel(s)}`, `רוטציה: ${nm.he} ב-${keyLabel(s)}`)], s), goalOf(s, true), bpmFor(2.4, perBeat));
}

/** Repeated chords (Hanon Part III): I–IV–V–I triads, each struck 4 times. */
function genRepChords(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const hand: Hand = s.hands === 'L' ? 'L' : 'R';
  const [lo, hi] = hand === 'R' ? [60, 79] : [47, 64];
  const buf = new Buf();
  let prev: number[] | null = null;
  [
    [0, 4, 7],
    [5, 9, 0],
    [7, 11, 2],
    [0, 4, 7],
  ].forEach((c, bar) => {
    const pcs = c.map((p) => p + key);
    const v: number[] = prev ? voiceNear(pcs, prev, lo, hi) : voiceNear(pcs, null, lo, hi, c[0] + key, hand === 'R' ? 72 : 57);
    prev = v;
    const fs = triadFinger(v, mod(c[0] + key, 12), hand);
    for (let k = 0; k < 4; k++) buf.add(bar * 2 + k * 0.5, 0.5, v.map((p, j) => ({ pitch: p, hand, finger: fs[j] })));
  });
  buf.add(8, 1, (prev as number[] | null)!.map((p) => ({ pitch: p, hand })));
  return finish(s, buf, title([t(`Repeated chords I–IV–V–I in ${keyLabel(s)}`, `אקורדים חוזרים I–IV–V–I ב-${keyLabel(s)}`)], s), goalOf(s, true), bpmFor(2.0, 2));
}

/** Czerny-style velocity (School of Velocity type figures, not Czerny's notes): scale runs over chords; broken-chord figuration. */
function genVelocity(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const base = rhBase(key);
  const maj = SCALE_INTERVALS.major;
  const buf = new Buf();
  const I = [0, 4, 7];
  const IV = [5, 9, 0];
  const V7 = [7, 11, 2, 5];
  let prevL: number[] | null = null;
  // PIANO_AUDIT C3: the LH chord stays under the RH's lowest note of the bar (the run below the tonic shared keys with it).
  const lhChord = (pcs: number[], b: number, d: number, under = 61) => {
    const hi = Math.min(60, under - 1);
    const v: number[] = prevL ? voiceNear(pcs.map((p) => p + key), prevL, hi - 17, hi) : voiceNear(pcs.map((p) => p + key), null, hi - 17, hi, undefined, hi - 8);
    prevL = v;
    buf.add(b, d, v.map((p) => ({ pitch: p, hand: 'L' as Hand })));
  };
  if (s.option === 1) {
    let prevR: number[] | null = null;
    [I, IV, V7.slice(0, 3), I].forEach((c, bar) => {
      const v: number[] = prevR ? voiceNear(c.map((p) => p + key), prevR, 60, 79) : voiceNear(c.map((p) => p + key), null, 60, 79, undefined, 67);
      prevR = v;
      for (let b = 0; b < 4; b++) [v[0], v[1], v[2], v[1]].forEach((p, i) => buf.add(bar * 4 + b + i / 4, 0.25, [{ pitch: p, hand: 'R' }]));
      const root = pitchIn(c === IV ? key + 5 : bar === 2 ? key + 7 : key, 36);
      buf.add(bar * 4, 2, [{ pitch: root, hand: 'L' }]);
      buf.add(bar * 4 + 2, 2, [{ pitch: root + 7, hand: 'L' }]);
    });
    buf.add(16, 1, [
      { pitch: pitchIn(key, 60), hand: 'R' },
      { pitch: pitchIn(key, 36), hand: 'L' },
    ]);
  } else {
    const runs = [
      [...[0, 1, 2, 3, 4, 5, 6, 7, 8], ...[7, 6, 5, 4, 3, 2, 1]],
      [...[-3, -2, -1, 0, 1, 2, 3, 4, 5], ...[4, 3, 2, 1, 0, -1, -2]],
    ];
    for (let bar = 0; bar < 4; bar++) {
      runs[bar % 2].forEach((k, i) => buf.add(bar * 4 + i / 4, 0.25, [{ pitch: degPitch(base, maj, k), hand: 'R' }]));
      const ch = bar % 2 === 0 ? I : V7;
      const low = Math.min(...runs[bar % 2].map((k) => degPitch(base, maj, k)));
      lhChord(ch, bar * 4, 2, low);
      lhChord(ch, bar * 4 + 2, 2, low);
    }
    buf.add(16, 1, [{ pitch: base, hand: 'R' }]);
    lhChord(I, 16, 1);
  }
  const nm = s.option === 1 ? t('broken-chord figuration over a bass', 'פיגורציה של אקורדים שבורים מעל בס') : t('scale runs over chords', 'ריצות סולם מעל אקורדים');
  return finish(s, buf, title([t(`Czerny-style velocity: ${nm.en} in ${keyName(key)}`, `מהירות בסגנון צ׳רני: ${nm.he} ב-${keyName(key)}`)], { ...s, hands: 'RL' }), { evenness: true, hands: true }, bpmFor(2.4, 4), 4, SIG[key]);
}

/** Sight-reading: a seeded random melody (stable per item, new per key), so it cannot be memorised. */
function genReading(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = opOf(s, 2);
  const rnd = rng(itemIdOf(s));
  const ints = s.minor ? SCALE_INTERVALS.natural : SCALE_INTERVALS.major;
  const hand: Hand = s.hands === 'L' ? 'L' : 'R';
  const base = hand === 'L' ? rhBase(key) - 12 : rhBase(key);
  const maxK = op === 1 ? 7 : 4;
  const durs = op === 1 ? [0.5, 0.5, 1, 1, 2] : [1, 1, 1, 2];
  const moves = op === 1 ? [-3, -2, -1, -1, 1, 1, 2, 3] : [-2, -1, -1, 1, 1, 2];
  const buf = new Buf();
  let k = 0;
  let beat = 0;
  while (beat < 15) {
    const d = Math.min(durs[Math.floor(rnd() * durs.length)], 15 - beat);
    buf.add(beat, d, [{ pitch: degPitch(base, ints, k), hand }]);
    beat += d;
    const step = moves[Math.floor(rnd() * moves.length)];
    k = Math.max(0, Math.min(maxK, k + step === k ? k + 1 : k + step));
  }
  buf.add(15, 1, [{ pitch: base, hand }]);
  if (op === 2) {
    [0, 5, 7, 0].forEach((r, bar) => {
      const root = pitchIn(key + r, 43);
      buf.add(bar * 4, 2, [{ pitch: root, hand: 'L' }]);
      buf.add(bar * 4 + 2, 2, [{ pitch: root + 7 > 55 ? root - 5 : root + 7, hand: 'L' }]);
    });
  }
  const nm = [t('five-finger melody', 'מנגינת חמש אצבעות'), t('one octave, mixed rhythms', 'אוקטבה אחת, מקצבים מעורבים'), t('melody over a bass, hands together', 'מנגינה מעל בס, ידיים יחד')][op];
  const sp: DrillSpec = op === 2 ? { ...s, hands: 'RL' } : s;
  return finish(s, buf, title([t(`Sight-reading: ${nm.en} in ${keyLabel(s)}`, `קריאה מהדף: ${nm.he} ב-${keyLabel(s)}`)], sp), { evenness: false, hands: op === 2 }, 60);
}

/** Pedalling (spec AI §5.6): bass + chord, the pedal plan in the goal (direct, legato, two changes a bar). */
function genPedal(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = opOf(s, 2);
  const I: [number, number[]] = [0, [0, 4, 7]];
  const vi: [number, number[]] = [9, [9, 0, 4]];
  const IV: [number, number[]] = [5, [5, 9, 0]];
  const ii: [number, number[]] = [2, [2, 5, 9]];
  const V7: [number, number[]] = [7, [7, 11, 5]];
  const prog = op === 2 ? [I, IV, ii, V7, vi, IV, V7, I] : [I, vi, IV, V7, I];
  const L = op === 2 ? 2 : 4;
  const buf = new Buf();
  let prev: number[] | null = null;
  const changes: number[] = [];
  prog.forEach(([r, ch], i) => {
    const b = i * L;
    changes.push(b);
    const pcs = ch.map((p) => p + key);
    const v: number[] = prev ? voiceNear(pcs, prev, 60, 76) : voiceNear(pcs, null, 60, 76, undefined, 67);
    prev = v;
    const last = i === prog.length - 1;
    buf.add(b, last ? 4 : L, [{ pitch: pitchIn(r + key, 36), hand: 'L' }]);
    if (last) buf.add(b + 1, 3, v.map((p) => ({ pitch: p, hand: 'R' as Hand })));
    else if (L === 4) v.forEach((p, j) => buf.add(b + 1 + j, 1, [{ pitch: p, hand: 'R' }]));
    else buf.add(b + 1, 1, v.map((p) => ({ pitch: p, hand: 'R' as Hand })));
  });
  const nm = [t('direct pedal (down with the bass, up before the next)', 'פדל ישיר (למטה עם הבס, למעלה לפני הבא)'), t('legato pedal (up at the change, down just after)', 'פדל לגאטו (למעלה בהחלפה, למטה מיד אחריה)'), t('legato pedal, two changes a bar', 'פדל לגאטו, שתי החלפות בתיבה')][op];
  return finish(
    s,
    buf,
    title([t(`Pedaling: ${nm.en} in ${keyName(key)}`, `פדל: ${nm.he} ב-${keyName(key)}`)], { ...s, hands: 'RL' }),
    { evenness: false, hands: false, pedal: { style: op === 0 ? 'direct' : 'legato', changes } },
    60,
    4,
    SIG[key],
  );
}

/** Jazz forms in C (transposed by the key): bars of [root offset, quality]. */
export const JAZZ_FORMS: { name: T2; bars: [number, string][][] }[] = [
  { name: t('12-bar blues', 'בלוז 12 תיבות'), bars: [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((d): [number, string][] => [[d, '7']]) },
  {
    name: t('minor blues', 'בלוז מינורי'),
    bars: (
      [
        [0, 'm7'],
        [0, 'm7'],
        [0, 'm7'],
        [0, 'm7'],
        [5, 'm7'],
        [5, 'm7'],
        [0, 'm7'],
        [0, 'm7'],
        [8, '7'],
        [7, '7'],
        [0, 'm7'],
        [7, '7'],
      ] as [number, string][]
    ).map((c) => [c]),
  },
  {
    name: t('rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A'),
    bars: [
      [
        [0, 'maj7'],
        [9, '7'],
      ],
      [
        [2, 'm7'],
        [7, '7'],
      ],
      [
        [0, 'maj7'],
        [9, '7'],
      ],
      [
        [2, 'm7'],
        [7, '7'],
      ],
      [
        [0, 'maj7'],
        [0, '7'],
      ],
      [
        [5, 'maj7'],
        [6, 'dim7'],
      ],
      [
        [0, 'maj7'],
        [7, '7'],
      ],
      [[0, 'maj7']],
    ],
  },
  {
    name: t('a standard: the ii–V–I cycle (Autumn Leaves type)', 'סטנדרט: מעגל ii–V–I (בסגנון Autumn Leaves)'),
    bars: (
      [
        [2, 'm7'],
        [7, '7'],
        [0, 'maj7'],
        [5, 'maj7'],
        [11, 'hd7'],
        [4, '7'],
        [9, 'm7'],
        [9, 'm7'],
      ] as [number, string][]
    ).map((c) => [c]),
  },
];

/** Improvising over a form (spec AI §5.4): target 3rds, guide-tone lines, chord-tone arpeggios, chord tones on the beats. */
function genFormLine(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const form = JAZZ_FORMS[opOf(s, JAZZ_FORMS.length - 1)];
  const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
  let prev = 67;
  const near = (pc: number, lo = 57, hi = 79): number => {
    let best = 0;
    for (let p = lo; p <= hi; p++) if (mod(p - pc, 12) === 0 && (!best || Math.abs(p - prev) < Math.abs(best - prev))) best = p;
    return best;
  };
  form.bars.forEach((bar, bi) => {
    const L = 4 / bar.length;
    bar.forEach(([d, q], ci) => {
      const r = key + d;
      const ints = Q7[q];
      const b0 = bi * 4 + ci * L;
      const push = (p: number, b: number, dur: number) => {
        line.push({ p, beat: b, dur, ct: true });
        prev = p;
      };
      if (s.kind === 'form-thirds') push(near(r + ints[1]), b0, L);
      else if (s.kind === 'form-guide') {
        const a = near(r + ints[1]);
        const b = near(r + ints[3]);
        const first = Math.abs(a - prev) <= Math.abs(b - prev) ? a : b;
        push(first, b0, L === 4 ? 2 : L);
        if (L === 4) push(near(first === a ? r + ints[3] : r + ints[1]), b0 + 2, 2);
      } else {
        let p = near(r, 55, 67);
        const n = L === 4 ? 4 : 2;
        for (let k = 0; k < n; k++) {
          if (k > 0) {
            p++;
            while (mod(p - r - ints[k], 12) !== 0) p++;
          }
          push(p, b0 + k, 1);
        }
      }
    });
  });
  const what: Record<string, T2> = {
    'form-thirds': t('the 3rd of each chord on its first beat', 'הטרצה של כל אקורד בפעמה הראשונה שלו'),
    'form-guide': t('guide-tone line (3rds and 7ths)', 'קו צלילים מנחים (טרצות וספטימות)'),
    'form-arp': t('chord-tone arpeggios through the changes', 'ארפג׳יו צלילי אקורד דרך המהלך'),
  };
  const w = what[s.kind] ?? what['form-arp'];
  const kn = keyName(key, opOf(s, 9) === 1);
  return lineDrill(s, line, title([t(`${form.name.en} in ${kn}: ${w.en}`, `${form.name.he} ב-${kn}: ${w.he}`)], s), { chordTonesOnBeats: true, evenness: false }, opOf(s, 9) === 1 ? SIG[mod(key + 3, 12)] : SIG[key], 80);
}

/** Locked hands (Milt Buckner / George Shearing): 4-way close under the melody, the melody doubled an octave down in the LH. */
function genLocked(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const six = s.minor ? [0, 2, 3, 5, 7, 8, 9, 11] : SCALE_INTERVALS['six-dim'];
  const mel0 = pitchIn(key, 67);
  const ks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const evs: ChordEv[] = ks.map((k, i) => {
    const m = degPitch(mel0, six, k);
    const chord = (k % 2 === 0 ? (s.minor ? [0, 3, 7, 9] : [0, 4, 7, 9]) : [11, 2, 5, 8]).map((x) => mod(x + key, 12));
    const v = [m];
    for (let p = m - 1; v.length < 4; p--) if (chord.includes(mod(p, 12))) v.push(p);
    const notes: SN[] = [...v.map((p, j) => ({ pitch: p, hand: 'R' as Hand, accent: j === 0 })), { pitch: m - 12, hand: 'L' }];
    return { beat: i, dur: i === ks.length - 1 ? 2 : 1, notes, required: chord, allowed: chord };
  });
  const nm = s.minor ? `${keyName(key, true)}m6` : `${keyName(key)}6`;
  return chordDrill(s, evs, title([t(`Locked hands (Shearing): ${nm} / diminished, melody doubled in the LH`, `ידיים נעולות (שירינג): ${nm} / מוקטן, המנגינה מוכפלת ביד שמאל`)], { ...s, hands: 'RL' }), 60, {}, SIG[s.minor ? mod(key + 3, 12) : key]);
}

/** Coltrane changes: digital pattern 1-2-3-5 (option 0) or 1-3-5-7 arpeggios (option 1) through the Giant Steps cycle. */
function genColtrane(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const arp = s.option === 1;
  const line: { p: number; beat: number; dur: number; ct?: boolean }[] = [];
  COLTRANE.forEach(([d, q], ci) => {
    const r = mod(key + d, 12);
    const ints = Q7[q];
    const rp = pitchIn(r, 55);
    const pat = arp ? [0, ints[1], 7, ints[3]] : [0, 2, ints[1], 7];
    pat.forEach((x, i) => line.push({ p: rp + x, beat: ci * 2 + i / 2, dur: 0.5, ct: x !== 2 }));
  });
  line.push({ p: pitchIn(key, 60), beat: 14, dur: 1, ct: true });
  return lineDrill(
    s,
    line,
    title([t(`Coltrane changes in ${keyName(key)}: ${arp ? '1-3-5-7' : '1-2-3-5'} on every chord (${coltraneNames(key)})`, `מהלכי קולטריין ב-${keyName(key)}: ${arp ? '1-3-5-7' : '1-2-3-5'} על כל אקורד (${coltraneNames(key)})`)], s),
    { chordTonesOnBeats: true },
    SIG[key],
  );
}

/** Blues vocabulary: turnaround with a falling inner line (0), rising-bass turnaround (1), the ♭3→3 crush lick (2). */
function genBluesLick(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = opOf(s, 2);
  const buf = new Buf();
  const T = pitchIn(key, 67);
  const root = pitchIn(key, 43);
  const five = pitchIn(key + 7, 38);
  const I7 = [T - 8, T - 2]; // 3rd and ♭7 below the tonic
  const V7 = [pitchIn(key + 5, 60), pitchIn(key + 11, 64)]; // ♭7 and 3rd of V7
  if (op === 0) {
    [-2, -3, -4, -5].forEach((x, i) => buf.add(i, 1, [{ pitch: T + x, hand: 'R' }, { pitch: T, hand: 'R' }]));
    buf.add(0, 4, [{ pitch: root, hand: 'L' }]);
    buf.add(4, 4, [{ pitch: five, hand: 'L' }, ...V7.map((p) => ({ pitch: p, hand: 'R' as Hand }))]);
    buf.add(8, 2, [{ pitch: root, hand: 'L' }, ...I7.map((p) => ({ pitch: p, hand: 'R' as Hand }))]);
  } else if (op === 1) {
    [0, 4, 5, 6].forEach((x, i) => buf.add(i, 1, [{ pitch: root + x, hand: 'L' }]));
    buf.add(0, 2, I7.map((p) => ({ pitch: p, hand: 'R' as Hand })));
    buf.add(2, 2, I7.map((p) => ({ pitch: p, hand: 'R' as Hand })));
    buf.add(4, 4, [{ pitch: root + 7, hand: 'L' }, ...V7.map((p) => ({ pitch: p, hand: 'R' as Hand }))]);
    buf.add(8, 2, [{ pitch: root, hand: 'L' }, ...I7.map((p) => ({ pitch: p, hand: 'R' as Hand }))]);
  } else {
    const R = pitchIn(key, 60);
    const lick: [number, number][] = [
      [3, 0.25],
      [4, 0.75],
      [7, 1],
      [10, 0.5],
      [9, 0.5],
      [7, 1],
      [3, 0.25],
      [4, 0.75],
      [0, 3],
    ];
    let b = 0;
    for (const [x, d] of lick) {
      buf.add(b, d, [{ pitch: R + x, hand: 'R' }]);
      b += d;
    }
    buf.add(0, 4, [{ pitch: root, hand: 'L' }]);
    buf.add(4, 4, [{ pitch: root, hand: 'L' }]);
  }
  const nm = [t('turnaround, falling inner line', 'טרנאראונד, קו פנימי יורד'), t('turnaround, rising bass 1-3-4-♯4-5', 'טרנאראונד, בס עולה 1-3-4-♯4-5'), t('the ♭3 → 3 "crush" lick', 'ליק "הריסוק" ♭3 → 3')][op];
  return finish(s, buf, title([t(`Blues in ${keyName(key)}: ${nm.en}`, `בלוז ב-${keyName(key)}: ${nm.he}`)], { ...s, hands: 'RL' }), { evenness: false, hands: true }, 70, 4, SIG[key]);
}

const BLUES_ROOTS = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];

/** Boogie-woogie LH over a 12-bar blues: 5-6 shuffle (0), walking 1-3-5-6-♭7-6-5-3 (1), broken octaves (2). */
function genBoogie(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = opOf(s, 2);
  const buf = new Buf();
  BLUES_ROOTS.forEach((d, bar) => {
    const r = pitchIn(key + d, 36);
    for (let k = 0; k < 8; k++) {
      const b = bar * 4 + k / 2;
      if (op === 0) {
        buf.add(b, 0.5, [
          { pitch: r, hand: 'L', finger: 5 },
          { pitch: r + (Math.floor(k / 2) % 2 === 1 ? 9 : 7), hand: 'L', finger: Math.floor(k / 2) % 2 === 1 ? 1 : 2 },
        ]);
      } else if (op === 1) buf.add(b, 0.5, [{ pitch: r + [0, 4, 7, 9, 10, 9, 7, 4][k], hand: 'L' }]);
      else buf.add(b, 0.5, [{ pitch: r + [0, 4, 7, 9][Math.floor(k / 2)] + (k % 2 === 1 ? 12 : 0), hand: 'L' }]);
    }
  });
  buf.add(48, 2, [{ pitch: pitchIn(key, 36), hand: 'L' }]);
  const nm = [t('5-6 shuffle', 'שאפל 5-6'), t('walking 1-3-5-6-♭7', 'הליכה 1-3-5-6-♭7'), t('broken octaves', 'אוקטבות שבורות')][op];
  return finish(s, buf, title([t(`Boogie-woogie LH, blues in ${keyName(key)}`, `בוגי-ווגי ביד שמאל, בלוז ב-${keyName(key)}`), nm], { ...s, hands: 'L' }), { evenness: true, hands: false }, 80, 4, SIG[key]);
}

/** Latin piano: bossa nova (0) — LH root / 5th, RH rootless chords on the bossa rhythm; montuno (1) — RH octaves over a tumbao bass. */
function genLatin(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const buf = new Buf();
  if (s.kind === 'bossa') {
    const vs = transposeProg(
      [
        [65, 69, 72, 76],
        [65, 69, 71, 76],
        [64, 67, 71, 74],
        [64, 67, 71, 74],
      ],
      key,
      70,
    );
    [2, 7, 0, 0].forEach((d, bar) => {
      const r = pitchIn(key + d, 36);
      buf.add(bar * 4, 2, [{ pitch: r, hand: 'L' }]);
      buf.add(bar * 4 + 2, 2, [{ pitch: r + 7, hand: 'L' }]);
      for (const [b, dur] of [
        [0, 1.5],
        [1.5, 1.5],
        [3, 1],
      ])
        buf.add(bar * 4 + b, dur, vs[bar].map((p) => ({ pitch: p, hand: 'R' as Hand })));
    });
    buf.add(16, 2, [{ pitch: pitchIn(key, 36), hand: 'L' }, ...vs[3].map((p) => ({ pitch: p, hand: 'R' as Hand }))]);
    return finish(s, buf, title([t(`Bossa nova piano ii–V–I in ${keyName(key)}`, `בוסה נובה בפסנתר ii–V–I ב-${keyName(key)}`)], { ...s, hands: 'RL' }), { evenness: false, hands: true }, 90, 4, SIG[key]);
  }
  // Montuno: I–IV–V–IV (two beats each), RH octaves on a syncopated 2-bar figure, LH tumbao (anticipated on the "and" of 2 and on 4).
  const harm = [0, 5, 7, 5];
  const hits = [0, 1.5, 2, 3, 3.5, 4.5, 5, 6.5, 7];
  const tones = [0, 4, 7, 4, 0, 4, 7, 4, 0];
  for (let rep = 0; rep < 2; rep++) {
    hits.forEach((h, i) => {
      const b = rep * 8 + h;
      const r = key + harm[Math.floor(h / 2)];
      const third = 4;
      const x = tones[i] === 4 ? third : tones[i];
      const p = pitchIn(r + x, 64);
      buf.add(b, 0.5, [
        { pitch: p, hand: 'R' },
        { pitch: p + 12, hand: 'R' },
      ]);
    });
    for (let bar = 0; bar < 2; bar++) {
      const b0 = rep * 8 + bar * 4;
      const next = harm[(bar * 2 + 1) % 4];
      const after = harm[(bar * 2 + 2) % 4];
      if (rep === 0 && bar === 0) buf.add(0, 1.5, [{ pitch: pitchIn(key, 36), hand: 'L' }]);
      buf.add(b0 + 1.5, 1.5, [{ pitch: pitchIn(key + next, 36), hand: 'L' }]);
      buf.add(b0 + 3, 1, [{ pitch: pitchIn(key + after, 36), hand: 'L' }]);
    }
  }
  buf.add(16, 2, [
    { pitch: pitchIn(key, 64), hand: 'R' },
    { pitch: pitchIn(key, 64) + 12, hand: 'R' },
    { pitch: pitchIn(key, 36), hand: 'L' },
  ]);
  return finish(s, buf, title([t(`Montuno (I–IV–V–IV) with a tumbao bass in ${keyName(key)}`, `מונטונו (I–IV–V–IV) עם בס טומבאו ב-${keyName(key)}`)], { ...s, hands: 'RL' }), { evenness: false, hands: true }, 90, 4, SIG[key]);
}

/** Pop LH patterns over I–V–vi–IV: 1-5-8-9-10-9-8-5 (0) and 1-5-8-5 (1), 8ths. */
function genPopLH(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const wide = s.option !== 1;
  const buf = new Buf();
  [
    [0, false],
    [7, false],
    [9, true],
    [5, false],
  ].forEach(([d, minor], bar) => {
    const r = pitchIn(key + (d as number), 36);
    const third = minor ? 15 : 16;
    const pat = wide ? [0, 7, 12, 14, third, 14, 12, 7] : [0, 7, 12, 7, 0, 7, 12, 7];
    pat.forEach((x, i) => buf.add(bar * 4 + i / 2, 0.5, [{ pitch: r + x, hand: 'L', finger: wide ? [5, 2, 1, undefined, undefined, undefined, 1, 2][i] : [5, 2, 1, 2, 5, 2, 1, 2][i] }]));
  });
  buf.add(16, 2, [{ pitch: pitchIn(key, 36), hand: 'L', finger: 5 }]);
  const nm = wide ? '1-5-8-9-10' : '1-5-8-5';
  return finish(s, buf, title([t(`Pop LH ${nm} over I–V–vi–IV in ${keyName(key)}`, `יד שמאל פופ ${nm} על I–V–vi–IV ב-${keyName(key)}`)], { ...s, hands: 'L' }), { evenness: true, hands: false }, bpmFor(2.0, 2), 4, SIG[key]);
}

/** Walking bass through changes: ii–V–I–VI7 cycle (0, one chord a bar), rhythm changes A (1, two chords a bar). */
function genWalkChanges(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const rhythm = s.option === 1;
  const chords: [number, string, number][] = []; // root offset, quality, beats
  if (rhythm)
    for (const bar of JAZZ_FORMS[2].bars) for (const [d, q] of bar) chords.push([d, q, 4 / bar.length]);
  else {
    for (let rep = 0; rep < 2; rep++)
      for (const [d, q] of [
        [2, 'm7'],
        [7, '7'],
        [0, 'maj7'],
        [9, '7'],
      ] as [number, string][])
        chords.push([d, q, 4]);
    chords.push([2, 'm7', 4], [7, '7', 4]);
  }
  const buf = new Buf();
  const rootP = (pc: number) => pitchIn(pc + key, 40);
  let b = 0;
  chords.forEach(([d, q, len], i) => {
    const rp = rootP(d);
    const next = rootP(i + 1 < chords.length ? chords[i + 1][0] : 0);
    const appr = next === rp ? next + 1 : next - 1;
    const ints = Q7[q];
    const pat: [number, boolean][] = len === 4 ? [[rp, true], [rp + ints[1], true], [rp + ints[2], true], [appr, false]] : [[rp, true], [appr, false]];
    pat.forEach(([p, ct]) => {
      buf.add(b, 1, [{ pitch: p, hand: 'L', chordTone: ct }]);
      b++;
    });
  });
  buf.add(b, 2, [{ pitch: rootP(0), hand: 'L', chordTone: true }]);
  const nm = rhythm ? t('rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A') : t('ii–V–I–VI7 cycle', 'מעגל ii–V–I–VI7');
  return finish(s, buf, title([t(`Walking bass through changes in ${keyName(key)}`, `בס מהלך דרך מהלך אקורדים ב-${keyName(key)}`), nm], { ...s, hands: 'L' }), { evenness: true, hands: false, chordTonesOnBeats: true }, 80, 4, SIG[key]);
}

// ───────────────────────────── dispatch ─────────────────────────────

/** Build the drill a spec describes (any family except 'custom', which goes through customToDrill). */
// ───────────────────────────── k-ear: the pianist's ear (PIANO_AUDIT §3) ─────────────────────────────
//
// Call and response inside one take, as the bass ear (b-ear) and the drummer's ear (d-ear): the app's piano plays the
// call (`listen`), the player answers ON THE KEYS in the bars after it. Every answer is measured by what is played
// (MIDI notes, or the microphone's chroma, score-informed) — never by a tap. The answer is matched by pitch class (any
// octave), each note or chord as its own set, so a melody played an octave up still counts. The written answer stays
// hidden until the result. All material is generated (seeded per key and option), nothing copied.

type EarListen = NonNullable<Drill['listen']>;
const EAR_PROGS = [
  [0, 3, 4, 0],
  [0, 5, 3, 4],
  [0, 4, 5, 3],
  [5, 3, 0, 4],
  [0, 1, 4, 0],
  [0, 3, 0, 4],
];
const EAR_RHYTHMS = [
  [0, 1, 2, 2.5, 3, 4, 5, 6],
  [0, 0.5, 1, 2, 3, 4, 4.5, 5, 6],
  [0, 1, 1.5, 2, 3, 4, 6],
  [0, 1, 2, 3, 4, 5, 5.5, 6],
];

/** The level's tempo for every k-ear item (♩): a calm call, the same pace to answer in. */
export const KEYS_EAR_TEMPO: [number, number] = [72, 88];
/** The placement probe for the pianist's ear: three notes by step, played back (ear L2), in C. */
export const KEYS_EAR_PROBE: DrillSpec = { family: 'k-ear', kind: 'echo-motif', key: 0, hands: 'R', tempo: 72 };

function genKeysEar(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`k-ear:${s.kind}:${key}:${op}`);
  const pick = <X,>(xs: X[]): X => xs[Math.floor(rnd() * xs.length)];
  const tonic = pitchIn(key, 60);
  const maj = SCALE_INTERVALS.major;
  const deg = (d: number) => degPitch(tonic, maj, d);
  /** A diatonic triad (degree 0–6) in close position around middle C, and its bass an octave and more below. */
  const triad = (d: number) => [0, 2, 4].map((x) => deg(d + x)).map((p) => pitchIn(p, 55)).sort((a, b) => a - b);
  const bassOf = (d: number) => pitchIn(deg(d), 40);
  const notes: EarListen['notes'] = [];
  const windows: [number, number][] = [];
  const evs: ChordEv[] = [];
  const call = (beat: number, dur: number, midi: number[]) => notes.push({ beat, dur, midi, inst: 'piano' });
  const ans = (beat: number, dur: number, pitches: number[], hand: Hand = 'R', required = pitches) =>
    evs.push({ beat, dur, notes: pitches.map((p) => ({ pitch: p, hand })), required, allowed: [...required, ...pitches] });
  /** The key: I–IV–V–I in quarters (one bar). */
  const cadenceBar = (b0: number) => {
    [0, 3, 4, 0].forEach((d, i) => call(b0 + i, 0.9, [bassOf(d), ...triad(d)]));
    windows.push([b0, b0 + 4]);
  };
  let ask: T2;
  let name: T2;
  switch (s.kind) {
    case 'echo-note': {
      // Four rounds: I and V under beats 1–2, the note on beat 3 (half note); play it in the next bar.
      for (let r = 0; r < 4; r++) {
        const b0 = r * 8;
        call(b0, 0.9, [bassOf(0), ...triad(0)]);
        call(b0 + 1, 0.9, [bassOf(4), ...triad(4)]);
        const p = deg(Math.floor(rnd() * 8));
        call(b0 + 2, 1.8, [p]);
        windows.push([b0, b0 + 4]);
        ans(b0 + 4, 4, [p]);
      }
      ask = t('Hear the key, then a note — play the note', 'שמעו את הסולם ואז צליל — נגנו את הצליל');
      name = t('One note in the key', 'צליל אחד בסולם');
      break;
    }
    case 'echo-motif': {
      // The key, then four rounds: three notes by step in quarters; play them back in the next bar.
      cadenceBar(0);
      for (let r = 0; r < 4; r++) {
        const b0 = 4 + r * 8;
        let d = Math.floor(rnd() * 6);
        const ds = [d];
        for (let i = 1; i < 3; i++) {
          d = Math.max(0, Math.min(7, d + (op === 1 ? pick([-2, -1, 1, 2]) : pick([-1, 1]))));
          ds.push(d);
        }
        ds.forEach((x, i) => call(b0 + i, 0.9, [deg(x)]));
        windows.push([b0, b0 + 4]);
        ds.forEach((x, i) => ans(b0 + 4 + i, i === 2 ? 2 : 1, [deg(x)]));
      }
      ask = t('Hear three notes — play them back', 'שמעו שלושה צלילים — נגנו אותם בחזרה');
      name = op === 1 ? t('Three notes with skips', 'שלושה צלילים עם דילוגים') : t('Three notes by step', 'שלושה צלילים בצעדים');
      break;
    }
    case 'echo-melody': {
      // The key, then two rounds: a two-bar diatonic melody (8ths and quarters, leaps up to a 5th), echoed.
      cadenceBar(0);
      for (let r = 0; r < 2; r++) {
        const b0 = 4 + r * 16;
        const rh = pick(EAR_RHYTHMS);
        let d = pick([0, 2, 4, 7]);
        rh.forEach((at, i) => {
          const dur = (rh[i + 1] ?? 8) - at;
          const p = deg(d);
          call(b0 + at, Math.min(dur, 2) * 0.9, [p]);
          ans(b0 + 8 + at, dur, [p]);
          const step = op === 1 ? pick([-4, -2, -1, 1, 2, 3, 4]) : pick([-2, -1, -1, 1, 1, 2]);
          d = Math.max(-1, Math.min(9, d + step));
          if (i === rh.length - 2) d = pick([0, 2, 4, 7]);
        });
        windows.push([b0, b0 + 8]);
      }
      ask = t('Hear two bars — play them back', 'שמעו שתי תיבות — נגנו אותן בחזרה');
      name = op === 1 ? t('A two-bar melody with leaps', 'מנגינה של שתי תיבות עם קפיצות') : t('A two-bar melody', 'מנגינה של שתי תיבות');
      break;
    }
    case 'intervals': {
      // Four rounds: two notes (melodic, op 0 up; op 1 up or down; op 2 together) — play both.
      for (let r = 0; r < 4; r++) {
        const b0 = r * 8;
        const lo = 55 + Math.floor(rnd() * 12);
        const semis = 1 + Math.floor(rnd() * 12);
        const down = op === 1 && rnd() < 0.5;
        const a = down ? lo + semis : lo;
        const b = down ? lo : lo + semis;
        if (op === 2) call(b0, 3.6, [a, b]);
        else {
          call(b0, 1.8, [a]);
          call(b0 + 2, 1.8, [b]);
        }
        windows.push([b0, b0 + 4]);
        if (op === 2) ans(b0 + 4, 4, [Math.min(a, b), Math.max(a, b)]);
        else {
          ans(b0 + 4, 2, [a]);
          ans(b0 + 6, 2, [b]);
        }
      }
      ask = op === 2 ? t('Hear two notes together — play both', 'שמעו שני צלילים יחד — נגנו את שניהם') : t('Hear two notes — play both, in order', 'שמעו שני צלילים — נגנו את שניהם, לפי הסדר');
      name = op === 2 ? t('Intervals together', 'מרווחים הרמוניים') : op === 1 ? t('Intervals up and down', 'מרווחים למעלה ולמטה') : t('Intervals up', 'מרווחים למעלה');
      break;
    }
    case 'bass-line': {
      // Four chords (op 1: with inversions, the bass moving by step) — then play their bass notes with the LH.
      const prog = pick(EAR_PROGS);
      const inv = op === 1 ? [0, 2, 0, 1] : [0, 0, 0, 0];
      prog.forEach((d, i) => {
        const b = bassOf(d + inv[i]);
        call(i * 4, 3.8, [b, ...triad(d)]);
        ans(16 + i * 4, 4, [b], 'L');
      });
      windows.push([0, 16]);
      ask = t('Hear four chords — play their bass notes with the left hand', 'שמעו ארבעה אקורדים — נגנו את צלילי הבס ביד שמאל');
      name = op === 1 ? t('The bass line, with inversions', 'קו הבס, עם היפוכים') : t('The bass line of four chords', 'קו הבס של ארבעה אקורדים');
      break;
    }
    case 'chords': {
      // Two rounds: four chords in half notes (op 1: with V7 and ii7) — play them back, any voicing.
      for (let r = 0; r < 2; r++) {
        const b0 = r * 16;
        const prog = pick(EAR_PROGS);
        prog.forEach((d, i) => {
          const seventh = op === 1 && (d === 4 || d === 1);
          const pcs = seventh ? [...triad(d), pitchIn(deg(d + 6), 55)] : triad(d);
          call(b0 + i * 2, 1.8, [bassOf(d), ...pcs]);
          ans(b0 + 8 + i * 2, 2, voiceNear(pcs, null, 55, 72), 'R', [...pcs, bassOf(d)]);
        });
        windows.push([b0, b0 + 8]);
      }
      ask = t('Hear four chords — play them back (any voicing)', 'שמעו ארבעה אקורדים — נגנו אותם בחזרה (בכל קול)');
      name = op === 1 ? t('A progression with 7th chords', 'מהלך עם ספטאקורדים') : t('A progression of triads', 'מהלך של משולשים');
      break;
    }
    case 'harmonise': {
      // A melody of four notes, one a bar, each fitting only one of I, IV, V (3, 6, 7, 2, 4 → I, IV, V, V, IV), ending
      // on the 3rd over I. Answer: the chord under each note (both hands as you like).
      const pool: [number, number][] = [
        [2, 0],
        [5, 3],
        [6, 4],
        [1, 4],
        [3, 3],
      ];
      const mel: [number, number][] = [];
      while (mel.length < 3) {
        const x = pick(pool);
        if (!mel.length || mel[mel.length - 1][1] !== x[1]) mel.push(x);
      }
      mel.push([2, 0]);
      let prevV: number[] | null = null;
      mel.forEach(([md, cd], i) => {
        call(i * 4, 3.6, [pitchIn(deg(md), 67)]);
        const pcs = triad(cd);
        const v: number[] = prevV ? voiceNear(pcs, prevV, 55, 76) : voiceNear(pcs, null, 55, 76, deg(md));
        prevV = v;
        // The bass in the LH, the chord in the RH, moving smoothly (any voicing passes: pitch classes).
        evs.push({ beat: 16 + i * 4, dur: 4, notes: [{ pitch: bassOf(cd), hand: 'L' }, ...v.map((p) => ({ pitch: p, hand: 'R' as Hand }))], required: pcs, allowed: pcs });
      });
      windows.push([0, 16]);
      ask = t('Hear a melody — play a chord under each note: I, IV or V', 'שמעו מנגינה — נגנו אקורד מתחת לכל צליל: I, IV או V');
      name = t('Harmonise a melody with I, IV, V', 'הרמון מנגינה ב-I, IV, V');
      break;
    }
    case 'transpose': {
      // Hear a two-bar melody in the key (the key first), then play it in another key, from the note named.
      const to = mod(key + (op === 1 ? 5 : 7), 12);
      cadenceBar(0);
      const rh = pick(EAR_RHYTHMS);
      let d = 0;
      const t2 = pitchIn(to, 60);
      rh.forEach((at, i) => {
        const dur = (rh[i + 1] ?? 8) - at;
        call(4 + at, Math.min(dur, 2) * 0.9, [deg(d)]);
        ans(12 + at, dur, [degPitch(t2, maj, d)]);
        d = Math.max(0, Math.min(7, d + pick([-2, -1, 1, 1, 2])));
        if (i === rh.length - 2) d = pick([0, 2, 4]);
      });
      windows.push([4, 12]);
      const first = keyName(to);
      ask = t(`Hear two bars in ${keyName(key)} — play them in ${first}, from ${first}`, `שמעו שתי תיבות ב-${keyName(key)} — נגנו אותן ב-${first}, מ-${first}`);
      name = op === 1 ? t('Transpose a melody up a 4th', 'טרנספוזיציה של מנגינה קוורטה למעלה') : t('Transpose a melody up a 5th', 'טרנספוזיציה של מנגינה קווינטה למעלה');
      break;
    }
    case 'two-part': {
      // PIANO_AUDIT P3, two-part playback: the key, then two rounds of two bars in two voices — a melody (RH) over a
      // bass (LH) — played back with both hands. Op 0: the bass in half notes on the roots, the melody in quarters (a
      // chord tone on the beat, a step after it). Op 1: the bass walks in quarters (root, then a step into the next
      // root), the melody holds a chord tone for each chord.
      cadenceBar(0);
      const mel = (md: number) => deg(md);
      /** The chord tone of degree `d`'s triad nearest to melody degree `md` (inside 0–9). */
      const nearTone = (d: number, md: number) => {
        let best = md;
        let dist = Infinity;
        for (let x = Math.max(0, md - 3); x <= Math.min(9, md + 3); x++)
          if ([0, 2, 4].includes(mod(x - d, 7)) && Math.abs(x - md) < dist) {
            best = x;
            dist = Math.abs(x - md);
          }
        return best;
      };
      for (let r = 0; r < 2; r++) {
        const b0 = 4 + r * 16;
        const prog = pick(EAR_PROGS);
        const parts: { beat: number; dur: number; p: number; hand: Hand }[] = [];
        let md = pick([2, 4, 7]);
        prog.forEach((d, i) => {
          md = nearTone(d, md);
          if (op === 0) {
            parts.push({ beat: i * 2, dur: 2, p: bassOf(d), hand: 'L' });
            parts.push({ beat: i * 2, dur: 1, p: mel(md), hand: 'R' });
            const next = i < 3 ? nearTone(prog[i + 1], md) : md;
            const step = next > md ? 1 : next < md ? -1 : md >= 8 ? -1 : 1;
            md = Math.max(0, Math.min(9, md + step));
            parts.push({ beat: i * 2 + 1, dur: 1, p: mel(md), hand: 'R' });
          } else {
            parts.push({ beat: i * 2, dur: 1, p: bassOf(d), hand: 'L' });
            const nd = i < 3 ? prog[i + 1] : 0;
            const nb = bassOf(nd);
            // a scale step next to the next root, on the side the bass comes from
            const appr = pitchIn(deg(nd + (nb > bassOf(d) ? -1 : 1)), 40);
            parts.push({ beat: i * 2 + 1, dur: 1, p: appr === nb ? pitchIn(deg(nd + 1), 40) : appr, hand: 'L' });
            parts.push({ beat: i * 2, dur: 2, p: mel(md), hand: 'R' });
          }
        });
        for (const x of parts) call(b0 + x.beat, x.dur * 0.9, [x.p]);
        windows.push([b0, b0 + 8]);
        for (let beat = 0; beat < 8; beat++) {
          const on = parts.filter((x) => x.beat === beat);
          if (on.length) evs.push({ beat: b0 + 8 + beat, dur: 1, notes: on.map((x) => ({ pitch: x.p, hand: x.hand })), required: on.map((x) => x.p), allowed: on.map((x) => x.p) });
        }
      }
      ask = t('Hear a melody over a bass — play both back, the melody in the right hand, the bass in the left', 'שמעו מנגינה מעל בס — נגנו את שניהם בחזרה, המנגינה ביד ימין והבס ביד שמאל');
      name = op === 1 ? t('Two parts: a walking bass', 'שני קולות: בס הולך') : t('Two parts: melody and bass', 'שני קולות: מנגינה ובס');
      break;
    }
    default:
      throw new Error(`Unknown k-ear kind ${s.kind}`);
  }
  const ttl = { en: `${name.en} · ${keyName(key)}`, he: `${name.he} · ${keyName(key)}` };
  const d = chordDrill({ ...s, key }, evs, ttl, KEYS_EAR_TEMPO[0], {}, SIG[key]);
  return { ...d, show: 'none', listen: { notes, windows, ask } };
}

// ═════════════════════════════ PIANO_JAZZ (2026-11-10) ═════════════════════════════
// Barry Harris harmony (k-sixdim), bebop lines over forms and trading fours (k-bebop), jazz-piano harmony (k-reharm),
// and two more Harris line levels (h14 / h15). Own material in the tradition: every line and voicing is generated from
// rules — chord tones, scales, voice leading — and none is copied from a book or a course.

const SIX_MIN = [0, 2, 3, 5, 7, 8, 9, 11];
/** Pitch classes of intervals above a root. */
const pcsOf = (ints: number[], root: number): number[] => [...new Set(ints.map((x) => mod(x + root, 12)))];
/** A close block chord with `top` as the melody: the next n − 1 notes of `pcs` under it, low to high. */
function blockUnder(top: number, pcs: number[], n = 4): number[] {
  const v = [top];
  for (let p = top - 1; v.length < n; p--) if (pcs.includes(mod(p, 12))) v.push(p);
  return v.sort((a, b) => a - b);
}
/** A chord event: LH and RH pitches; required = every pitch class played, allowed = those plus `more`. */
function evOf(beat: number, dur: number, rh: number[], lh: number[] = [], more: number[] = []): ChordEv {
  const notes: SN[] = [...lh.map((p) => ({ pitch: p, hand: 'L' as Hand })), ...rh.map((p) => ({ pitch: p, hand: 'R' as Hand }))];
  const all = [...lh, ...rh];
  return { beat, dur, notes, required: all, allowed: [...all, ...more] };
}
/** The pitch with a pitch class in `pcs` nearest to `p` inside [lo, hi] (ties: the lower; `avoid` only as a last resort). */
function nearestIn(pcs: number[], p: number, lo: number, hi: number, avoid?: number): number {
  let best = NaN;
  for (let q = lo; q <= hi; q++) {
    if (!pcs.includes(mod(q, 12))) continue;
    if (Number.isNaN(best)) best = q;
    const better = (q !== avoid && best === avoid) || ((q !== avoid || best === avoid) && Math.abs(q - p) < Math.abs(best - p));
    if (better) best = q;
  }
  return best;
}
type LineN = { p: number; beat: number; dur: number; ct?: boolean };

/**
 * Barry's half-step rule for a line going down (PIANO_JAZZ): chord tones fall on the beats. Between two chord tones goes
 * the one scale tone between them; where none fits (root → 7th of a dominant, 6th → 5th of a 6th chord, a 9th → the
 * root) a chromatic passing tone. From a tension (the 9th, the 13th) the half step comes at once. Returns 2 × beats
 * notes in 8ths (the first on the beat) and the chord tone the line would land on next.
 */
function ruleDown(start: number, ct: number[], scale: number[], beats: number, b0 = 0): { line: LineN[]; next: number } {
  const line: LineN[] = [];
  let p = start;
  for (let b = 0; b < beats; b++) {
    let tgt = p - 1;
    while (!ct.includes(mod(tgt, 12))) tgt--;
    if (p - tgt === 1) {
      tgt--;
      while (!ct.includes(mod(tgt, 12))) tgt--;
    }
    const between: number[] = [];
    for (let q = p - 1; q > tgt; q--) if (scale.includes(mod(q, 12))) between.push(q);
    const off = between.length ? between[between.length - 1] : p - 1;
    line.push({ p, beat: b0 + b, dur: 0.5, ct: ct.includes(mod(p, 12)) });
    line.push({ p: off, beat: b0 + b + 0.5, dur: 0.5, ct: false });
    p = tgt;
  }
  return { line, next: p };
}

// ───────────────────────────── harris 16–18: chromatic lines (PIANO_JAZZ P2) ─────────────────────────────

/** Dominants for h16: the family of dominants (half steps down) or round the cycle (4ths up), each a bar, then I6. */
export const H16_ROOTS = [
  [4, 3, 2, 1],
  [4, 9, 2, 7],
];
/**
 * Barry's conversions as lines (h18): the 6th chord a chord is played as, and the diminished between its tones — the
 * 8-note scale alternates them, so stepping in 8ths puts the 6th chord's tones on the beats. Dm7 = F6, G7 = Dm6 (the
 * minor 6th on its 5th), Dø = Fm6, G7♭9 = A♭°7 (its 3, 5, 7, ♭9) with the other diminished between, Cm6, C6.
 */
export function sixLinePair(r: number, q: string): { home: number[]; dim: number[] } {
  const six = (x: number) => pcsOf([0, 4, 7, 9], x);
  const min6 = (x: number) => pcsOf([0, 3, 7, 9], x);
  const dimOn = (x: number) => pcsOf([11, 2, 5, 8], x);
  if (q === 'm7') return { home: six(r + 3), dim: dimOn(r + 3) };
  if (q === '7') return { home: min6(r + 7), dim: dimOn(r + 7) };
  if (q === 'hd7') return { home: min6(r + 3), dim: dimOn(r + 3) };
  if (q === '7b9') return { home: pcsOf([1, 4, 7, 10], r), dim: pcsOf([0, 3, 6, 9], r) };
  if (q === 'm6') return { home: min6(r), dim: dimOn(r) };
  return { home: six(r), dim: dimOn(r) };
}
export const H18_FORMS: [number, string][][] = [
  [
    [7, '7'],
    [7, '7'],
    [0, 'maj7'],
    [0, 'maj7'],
  ],
  [
    [2, 'm7'],
    [7, '7'],
    [0, 'maj7'],
    [0, 'maj7'],
  ],
  [
    [2, 'hd7'],
    [7, '7b9'],
    [0, 'm6'],
    [0, 'm6'],
  ],
];

/**
 * Barry Harris chromatic lines (PIANO_JAZZ §5 P1). Own material, generated from the rules:
 * - h16: the family of dominants as lines — each dominant a bar, the scale down by the half-step rules (chord tones on
 *   the beats), and the last 8th of every bar a half step into a chord tone of the next chord (the approach);
 * - h17: the chromatic scale with the rules — a chord tone on every beat and every half step between: the beat splits
 *   into as many notes as the gap needs (2 = 8ths, 3 = triplets, 4 = 16ths); the LH plays it in the bass;
 * - h18: "the sixth on the fifth" — each chord as its 6th chord, the line stepping through its 6th-diminished scale.
 */
function harrisChromatic(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const kn = keyName(key);
  const km = keyName(key, true);
  const H = (n: number, en: string, he: string) => t(`Barry Harris H${n}: ${en}`, `בארי האריס H${n}: ${he}`);
  const line: LineN[] = [];
  if (s.kind === 'h16-chains') {
    const o = opOf(s, 1);
    const roots = H16_ROOTS[o].map((d) => mod(key + d, 12));
    const doms = roots.map((r) => ({ ct: pcsOf(DOM_CT, r), sc: pcsOf(SCALE_INTERVALS.mixolydian, r) }));
    const home = pcsOf([0, 4, 7, 9], key);
    let p = nearestIn(doms[0].ct, 79, 74, 84);
    doms.forEach((c, i) => {
      const b0 = i * 4;
      const r = ruleDown(p, c.ct, c.sc, 3, b0);
      line.push(...r.line);
      const q = r.next;
      const nct = i + 1 < doms.length ? doms[i + 1].ct : home;
      // Keep falling; from low in the range the next bar starts up again (a leap, then the approach).
      const tgt = nearestIn(nct, q < 70 ? q + 10 : q - 2, 58, 84, q);
      const appr = tgt + 1 === q ? tgt - 1 : tgt + 1;
      line.push({ p: q, beat: b0 + 3, dur: 0.5, ct: true }, { p: appr, beat: b0 + 3.5, dur: 0.5, ct: false });
      p = tgt;
    });
    line.push({ p, beat: doms.length * 4, dur: 2, ct: true });
    const names = roots.map((r) => `${keyName(r)}7`).join(' ');
    const ttl =
      o === 0
        ? H(16, `the family of dominants as lines: ${names} → ${kn}6, a half step into each chord`, `משפחת הדומיננטות כקווים: ${names} → ${kn}6, חצי טון לכל אקורד`)
        : H(16, `dominants round the cycle as lines: ${names} → ${kn}6, a half step into each chord`, `דומיננטות במעגל הקוורטות כקווים: ${names} → ${kn}6, חצי טון לכל אקורד`);
    return lineDrill(s, line, title([ttl], s), { chordTonesOnBeats: true }, SIG[key]);
  }
  if (s.kind === 'h17-chromatic') {
    const o = opOf(s, 2);
    const sp = [
      { ct: DOM_CT, en: `${kn}7`, sig: SIG[mod(key + 5, 12)] },
      { ct: [0, 4, 7, 9], en: `${kn}6`, sig: SIG[key] },
      { ct: [0, 3, 7, 9], en: `${km}m6`, sig: SIG[mod(key + 3, 12)] },
    ][o];
    const ct = sp.ct.map((x) => mod(x + key, 12));
    let p = pitchIn(key, 72);
    const end = p - 24;
    let beat = 0;
    while (p > end) {
      let q = p - 1;
      while (!ct.includes(mod(q, 12))) q--;
      const n = p - q;
      for (let i = 0; i < n; i++) line.push({ p: p - i, beat: r6(beat + i / n), dur: r6(1 / n), ct: i === 0 });
      p = q;
      beat++;
    }
    line.push({ p, beat, dur: 1, ct: true });
    const bass = s.hands === 'L';
    return lineDrill(
      s,
      line,
      title([H(17, `the chromatic scale with the rules — ${sp.en}${bass ? ' in the bass' : ''}: a chord tone on every beat (8ths, triplets, 16ths between)`, `הסולם הכרומטי לפי החוקים — ${sp.en}${bass ? ' בבס' : ''}: צליל אקורד על כל פעמה (שמיניות, טריולות, שש-עשריות ביניהן)`)], s),
      { chordTonesOnBeats: true },
      sp.sig,
    );
  }
  // h18-sixfive
  const o = opOf(s, 2);
  const bars = H18_FORMS[o].map(([d, q]) => ({ r: mod(key + d, 12), q, ...sixLinePair(mod(key + d, 12), q) }));
  let prev = 74;
  let dir = -1;
  bars.forEach((b, bi) => {
    const scale = [...b.home, ...b.dim];
    const last = bi === bars.length - 1;
    let p = bi === 0 ? nearestIn(b.home, prev, 70, 79) : nearestIn(b.home, prev + dir, 58, 86, prev);
    const n = last ? 5 : 8;
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        if (p + dir * 2 < 58 || p + dir * 2 > 86) dir = -dir;
        do p += dir;
        while (!scale.includes(mod(p, 12)));
      }
      const end = last && i === n - 1;
      line.push({ p, beat: bi * 4 + i / 2, dur: end ? 2 : 0.5, ct: i % 2 === 0 });
    }
    prev = p;
    dir = -dir;
  });
  const chord = (d: number, q: string) => `${keyName(key + d, q === 'm6' && d === 0)}${{ '7': '7', m7: 'm7', maj7: 'maj7', hd7: 'ø7', '7b9': '7♭9', m6: 'm6' }[q]}`;
  const as = (d: number, q: string) => {
    const r = mod(key + d, 12);
    if (q === 'm7') return `${keyName(r + 3)}6`;
    if (q === '7') return `${keyName(r + 7)}m6`;
    if (q === 'hd7') return `${keyName(r + 3)}m6`;
    if (q === '7b9') return `${keyName(r + 1)}°7`;
    if (q === 'm6') return `${keyName(r, true)}m6`;
    return `${keyName(r)}6`;
  };
  const seen = new Set<string>();
  const pairs = H18_FORMS[o].filter(([d, q]) => !seen.has(`${d}${q}`) && seen.add(`${d}${q}`)).map(([d, q]) => `${chord(d, q)} = ${as(d, q)}`).join(', ');
  const ttl = [
    H(18, `the sixth on the fifth: ${pairs} — the 6th chord's tones on the beats, its diminished between`, `השישית על הקווינטה: ${pairs} — צלילי אקורד השישית על הפעמות, המוקטן ביניהם`),
    H(18, `ii–V–I in ${kn} as 6th chords: ${pairs} — each chord's 6th-diminished scale`, `ii–V–I ב-${kn} כאקורדי שישית: ${pairs} — סולם השישית-מוקטן של כל אקורד`),
    H(18, `minor ii–V–i in ${km} as 6th chords: ${pairs} — each chord's 6th-diminished scale`, `ii–V–i מינורי ב-${km} כאקורדי שישית: ${pairs} — סולם השישית-מוקטן של כל אקורד`),
  ][o];
  return lineDrill(s, line, title([ttl], s), { chordTonesOnBeats: true }, SIG[o === 2 ? mod(key + 3, 12) : key]);
}

// ───────────────────────────── k-sixdim: Barry Harris harmony ─────────────────────────────

const DEG4 = [t('root', 'היסוד'), t('3rd', 'הטרצה'), t('5th', 'הקווינטה'), t('6th', 'הסקסטה')];

/** Barry's chord conversions (PIANO_JAZZ): the 6th chord and the diminished that move a chord of a form. */
function sixPair(root: number, q: string): { home: number[]; dim: number[] } {
  const dimOn = (r: number) => pcsOf([11, 2, 5, 8], r);
  if (q === 'maj7') return { home: pcsOf([0, 4, 7, 9], root), dim: dimOn(root) };
  // m7 = the 6th chord a minor 3rd up (Dm7 = F6); ø7 = the minor 6th a minor 3rd up (Dø = Fm6); 7 = the minor 6th on
  // its 5th (G7 = Dm6, the 9th chord without its root); a diminished chord moves through its own inversions.
  if (q === 'm7') return { home: pcsOf([0, 4, 7, 9], root + 3), dim: dimOn(root + 3) };
  if (q === 'hd7') return { home: pcsOf([0, 3, 7, 9], root + 3), dim: dimOn(root + 3) };
  if (q === '7') return { home: pcsOf([0, 3, 7, 9], root + 7), dim: dimOn(root + 7) };
  const d = pcsOf([0, 3, 6, 9], root);
  return { home: d, dim: d };
}

function genSixDim(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const minor = !!s.minor;
  const six = minor ? SIX_MIN : SCALE_INTERVALS['six-dim'];
  const home = pcsOf(minor ? [0, 3, 7, 9] : [0, 4, 7, 9], key);
  const dim = pcsOf([11, 2, 5, 8], key);
  const chordAt = (k: number) => (mod(k, 2) === 0 ? home : dim);
  const h6 = minor ? `${keyName(key, true)}m6` : `${keyName(key)}6`;
  const d7 = `${keyName(key + 11)}°7`;
  const sig = SIG[minor ? mod(key + 3, 12) : key];
  const op = s.option ?? 0;
  const N = (en: string, he: string) => t(`${h6} / ${d7}: ${en}`, `${h6} / ${d7}: ${he}`);
  /** The tonic pitch under which scale index k0 sounds between `lo` and lo + 11. */
  const baseFor = (k0: number, lo: number) => pitchIn(key + six[mod(k0, 8)], lo) - six[mod(k0, 8)];
  const upDown = (k0: number) => {
    const up = Array.from({ length: 9 }, (_, i) => k0 + i);
    return [...up, ...up.slice(0, -1).reverse()];
  };
  switch (s.kind) {
    case 'sd-inversions': {
      // The scale of chords from each tone of the 6th chord: the melody on top, four voices close.
      const o = Math.min(3, Math.max(0, op));
      const base = baseFor(2 * o, 64);
      const ks = upDown(2 * o);
      const evs = ks.map((k, i) => evOf(i, i === ks.length - 1 ? 2 : 1, blockUnder(degPitch(base, six, k), chordAt(k))));
      return chordDrill(s, evs, title([N(`the scale of chords, melody from the ${DEG4[o].en}`, `סולם האקורדים, המנגינה מ${DEG4[o].he}`)], s), 60, {}, sig);
    }
    case 'sd-borrow': {
      // Each voice in turn borrows the nearest note of the diminished (a half step where there is one) and comes back:
      // the other three hold (oblique motion inside the chord).
      const o = Math.min(3, Math.max(0, op));
      const v = blockUnder(degPitch(baseFor(2 * o, 64), six, 2 * o), home);
      const evs: ChordEv[] = [];
      let beat = 0;
      for (let j = 3; j >= 0; j--) {
        evs.push(evOf(beat++, 1, v));
        const moved = v.slice();
        moved[j] = [-1, 1, -2, 2].map((d) => v[j] + d).find((p) => dim.includes(mod(p, 12)))!;
        evs.push(evOf(beat++, 1, moved.sort((a, b) => a - b)));
      }
      evs.push(evOf(beat, 2, v));
      return chordDrill(s, evs, title([N(`borrowing from the diminished, one voice at a time (melody on the ${DEG4[o].en})`, `השאלה מהמוקטן, קול אחד בכל פעם (המנגינה על ${DEG4[o].he})`)], s), 60, {}, sig);
    }
    case 'sd-oblique': {
      // Oblique motion: the left hand holds the root (op 1: root and 5th) a bar at a time while three voices move.
      const fifth = op === 1;
      const ped = pitchIn(key, 36);
      const lh = fifth ? [ped, ped + 7] : [ped];
      const base = baseFor(0, 60);
      const ks = upDown(0);
      const evs = ks.map((k, i) => {
        const rh = blockUnder(degPitch(base, six, k), chordAt(k), 3);
        const last = i === ks.length - 1;
        return i % 4 === 0 ? evOf(i, last ? 2 : 1, rh, lh) : evOf(i, last ? 2 : 1, rh, [], lh);
      });
      // The pedal sounds through the bar (held to the next one).
      return holdLH(chordDrill({ ...s, hands: 'RL' }, evs, title([N(`oblique motion over a held ${fifth ? 'root and 5th' : 'root'}`, `תנועה אלכסונית מעל ${fifth ? 'יסוד וקווינטה מוחזקים' : 'יסוד מוחזק'}`)], { ...s, hands: 'RL' }), 60, {}, sig));
    }
    case 'sd-spread': {
      // Spreads (two hands): the 2nd and 4th voices from the top go down an octave into the LH; op 1 doubles the melody
      // an octave down in the RH (an octave with the inner voice between).
      const oct = op === 1;
      const base = baseFor(0, 67);
      const ks = upDown(0);
      const evs = ks.map((k, i) => {
        const [a, b, c, top] = blockUnder(degPitch(base, six, k), chordAt(k));
        const lh = [a - 12, c - 12];
        const rh = oct ? [top - 12, b, top] : [b, top];
        return evOf(i, i === ks.length - 1 ? 2 : 1, rh, lh);
      });
      const sp = { ...s, hands: 'RL' as const };
      return chordDrill(sp, evs, title([N(oct ? 'spread in two hands, the melody in octaves' : 'spread in two hands (2nd and 4th voices down)', oct ? 'פרוש בשתי ידיים, המנגינה באוקטבות' : 'פרוש בשתי ידיים (הקול השני והרביעי למטה)')], sp), 60, {}, sig);
    }
    case 'sd-passing': {
      // Diminished chords passing between the scale's chords (the bass moves by half steps), voice-led close in the RH.
      const C6 = [0, 4, 7, 9];
      const up: [number, number[]][] = [
        [0, C6],
        [1, [1, 4, 7, 10]],
        [2, [2, 5, 9, 0]],
        [3, [3, 6, 9, 0]],
        [4, C6],
        [5, [5, 9, 0, 2]],
        [6, [6, 9, 0, 3]],
        [7, C6],
        [9, [9, 1, 4, 7]],
        [2, [2, 5, 9, 0]],
        [7, [7, 11, 2, 5]],
        [0, C6],
      ];
      const down: [number, number[]][] = [
        [7, C6],
        [6, [6, 9, 0, 3]],
        [5, [5, 9, 0, 2]],
        [4, C6],
        [3, [3, 6, 9, 0]],
        [2, [2, 5, 9, 0]],
        [7, [7, 11, 2, 5]],
        [0, C6],
      ];
      const prog = op === 1 ? down : up;
      let prev: number[] | null = null;
      const evs = prog.map(([b, c], i) => {
        const pcs = pcsOf(c, key);
        const rh: number[] = prev ? voiceNear(pcs, prev, 60, 79) : voiceNear(pcs, null, 60, 79, undefined, 72);
        prev = rh;
        return evOf(i * 2, i === prog.length - 1 ? 4 : 2, rh, [pitchIn(key + b, 40)]);
      });
      const sp = { ...s, hands: 'RL' as const };
      const ttl =
        op === 1
          ? t(`Passing diminished chords, the bass down: ${keyName(key)}6/5 – ${keyName(key + 6)}°7 – ${keyName(key + 5)}6 – ${keyName(key)}6/3 – ${keyName(key + 3)}°7 – ii7 – V7 – I6`, `אקורדים מוקטנים עוברים, הבס יורד: ${keyName(key)}6/5 – ${keyName(key + 6)}°7 – ${keyName(key + 5)}6 – ${keyName(key)}6/3 – ${keyName(key + 3)}°7 – ii7 – V7 – I6`)
          : t(`Passing diminished chords, the bass up: I6 – ♯I°7 – ii7 – ♯ii°7 – I6/3 – IV6 – ♯IV°7 – I6/5 – VI7 – ii7 – V7 – I6 in ${keyName(key)}`, `אקורדים מוקטנים עוברים, הבס עולה: I6 – ♯I°7 – ii7 – ♯ii°7 – I6/3 – IV6 – ♯IV°7 – I6/5 – VI7 – ii7 – V7 – I6 ב-${keyName(key)}`);
      return chordDrill(sp, evs, title([ttl], sp), 60, {}, SIG[key]);
    }
    case 'sd-dom': {
      // Borrowing from the next diminished: raise one note of the diminished a whole step and it is a dominant 7♭9 with
      // that note as its root; it resolves to its 6th chord a 4th up. All four notes in turn — four keys from one chord.
      const dRoot = mod(key + 11, 12);
      const dimPcs = pcsOf([0, 3, 6, 9], dRoot);
      const dimV: number[] = [];
      for (let p = 60; dimV.length < 4; p++) if (dimPcs.includes(mod(p, 12))) dimV.push(p);
      const first = Math.max(0, dimV.findIndex((p) => mod(p + 2, 12) === mod(key + 7, 12)));
      const evs: ChordEv[] = [];
      let beat = 0;
      for (let x = 0; x < 4; x++) {
        const j = (first + x) % 4;
        evs.push(evOf(beat, 1, dimV));
        const dom = dimV.map((p, i) => (i === j ? p + 2 : p)).sort((a, b) => a - b);
        evs.push(evOf(beat + 1, 1, dom));
        const res = voiceNear(pcsOf([0, 4, 7, 9], dimV[j] + 2 + 5), dom, 57, 79);
        evs.push(evOf(beat + 2, 2, res));
        beat += 4;
      }
      return chordDrill(s, evs, title([t(`${keyName(dRoot)}°7: raise one note a whole step — a dominant 7♭9, then its 6th chord, in four keys`, `${keyName(dRoot)}°7: מעלים צליל אחד בטון — דומיננט 7♭9 ואז אקורד השישית שלו, בארבעה סולמות`)], s), 60, {}, SIG[key]);
    }
    case 'sd-iivi': {
      // ii–V–I the 6th-diminished way. Major: Dm7 = F6 / E°7, G7 = Dm6 / C♯°7, C6 / B°7. Minor (op 1): Dø = Fm6 / E°7,
      // G7♭9 = G7 / A♭°7, Cm6 / B°7. The melody steps through each pair's scale; the LH holds the root a bar.
      const mi = op === 1;
      const bars: { root: number; a: number[]; b: number[]; beats: number }[] = mi
        ? [
            { root: 2, a: pcsOf([0, 3, 7, 9], key + 5), b: pcsOf([11, 2, 5, 8], key + 5), beats: 4 },
            { root: 7, a: pcsOf([0, 4, 7, 10], key + 7), b: pcsOf([0, 3, 6, 9], key + 8), beats: 4 },
            { root: 0, a: pcsOf([0, 3, 7, 9], key), b: pcsOf([11, 2, 5, 8], key), beats: 8 },
          ]
        : [
            { root: 2, a: pcsOf([0, 4, 7, 9], key + 5), b: pcsOf([11, 2, 5, 8], key + 5), beats: 4 },
            { root: 7, a: pcsOf([0, 3, 7, 9], key + 2), b: pcsOf([11, 2, 5, 8], key + 2), beats: 4 },
            { root: 0, a: pcsOf([0, 4, 7, 9], key), b: pcsOf([11, 2, 5, 8], key), beats: 8 },
          ];
      const evs: ChordEv[] = [];
      let beat = 0;
      let mel = 69;
      let prevRh: number[] | null = null;
      bars.forEach((bar, bi) => {
        const lh = [pitchIn(key + bar.root, 36)];
        const scale = [...new Set([...bar.a, ...bar.b])];
        const stepping = scale.length === 8;
        const n = bar.beats === 8 ? 5 : 4;
        const dirs = bar.beats === 8 ? [1, 1, -1, -1] : bi % 2 === 0 ? [1, 1, 1] : [-1, -1, -1];
        mel = nearestIn(bar.a, mel, 64, 77);
        for (let i = 0; i < n; i++) {
          const pcs = i % 2 === 0 ? bar.a : bar.b;
          let rh: number[];
          if (stepping) rh = blockUnder(mel, pcs);
          else rh = prevRh ? voiceNear(pcs, prevRh, 60, 79) : voiceNear(pcs, null, 60, 79, undefined, 70);
          prevRh = rh;
          const dur = i === n - 1 ? (bar.beats === 8 ? 4 : 1) : 1;
          evs.push(i === 0 ? evOf(beat, dur, rh, lh) : evOf(beat, dur, rh, [], [mod(lh[0], 12)]));
          beat += dur;
          if (i < n - 1 && stepping) {
            const d = dirs[i];
            do mel += d;
            while (!scale.includes(mod(mel, 12)));
          }
        }
      });
      const sp = { ...s, hands: 'RL' as const };
      const ttl = mi
        ? t(`ii–V–i in ${keyName(key, true)} minor the 6th-diminished way: ${keyName(key + 5)}m6 over ${keyName(key + 2)}, ${keyName(key + 7)}7 / ${keyName(key + 8)}°7, ${keyName(key, true)}m6`, `ii–V–i ב-${keyName(key, true)} מינור בדרך השישית-מוקטן: ${keyName(key + 5)}m6 מעל ${keyName(key + 2)}, ${keyName(key + 7)}7 / ${keyName(key + 8)}°7, ${keyName(key, true)}m6`)
        : t(`ii–V–I in ${keyName(key)} the 6th-diminished way: ${keyName(key + 5)}6 over ${keyName(key + 2)}, ${keyName(key + 2)}m6 over ${keyName(key + 7)}, ${keyName(key)}6`, `ii–V–I ב-${keyName(key)} בדרך השישית-מוקטן: ${keyName(key + 5)}6 מעל ${keyName(key + 2)}, ${keyName(key + 2)}m6 מעל ${keyName(key + 7)}, ${keyName(key)}6`);
      const d = chordDrill(sp, evs, title([ttl], sp), 60, {}, SIG[mi ? mod(key + 3, 12) : key]);
      return holdLH(d);
    }
    case 'sd-form': {
      // A form the 6th-diminished way: each chord becomes its 6th chord (Barry's conversions), moving to the diminished
      // and back, the melody stepping up; the LH plays the root.
      const form = JAZZ_FORMS[op === 1 ? 2 : 3];
      const evs = sixFormEvs(form.bars, key, sixPair);
      const sp = { ...s, hands: 'RL' as const };
      const d = chordDrill(sp, evs, title([t(`${form.name.en} in ${keyName(key)}: every chord as its 6th chord and diminished`, `${form.name.he} ב-${keyName(key)}: כל אקורד כאקורד השישית שלו והמוקטן`)], sp), 60, {}, SIG[key]);
      return { ...holdLH(d), chart: formChart(form, key) };
    }
    case 'sd-forms': {
      // PIANO_JAZZ P1: more forms the 6th-diminished way — the minor blues, the bridge of rhythm changes, a ballad AABA
      // — every chord converted, with the form's road map (a bar lost in the form is "not").
      const f = PIANO_FORMS[(['minor-blues', 'rhythm-bridge', 'ballad'] as const)[Math.min(2, op)]];
      const evs = sixFormEvs(formBars(f), key, sixPairForm);
      const sp = { ...s, hands: 'RL' as const };
      const kn = keyName(key, !!f.minor);
      const d = chordDrill(sp, evs, title([t(`${f.name.en} in ${kn}: every chord as its 6th chord and diminished`, `${f.name.he} ב-${kn}: כל אקורד כאקורד השישית שלו והמוקטן`)], sp), 60, {}, SIG[f.minor ? mod(key + 3, 12) : key]);
      return withPianoForm(holdLH(d), f, key);
    }
  }
  throw new Error(`Unknown k-sixdim kind: ${s.kind}`);
}

/**
 * A form the 6th-diminished way (k-sixdim 9, 10): each chord becomes its 6th chord (Barry's conversions) moving to the
 * diminished and back, the melody stepping up; the LH plays the root (held by holdLH).
 */
function sixFormEvs(bars: [number, string][][], key: number, pair: (r: number, q: string) => { home: number[]; dim: number[] }): ChordEv[] {
  const evs: ChordEv[] = [];
  let mel = 72;
  bars.forEach((bar, bi) => {
    const L = 4 / bar.length;
    bar.forEach(([d, q], ci) => {
      const r = mod(key + d, 12);
      const pr = pair(r, q);
      const b0 = bi * 4 + ci * L;
      const slots: [number, number, number[]][] = L === 4 ? [[0, 2, pr.home], [2, 1, pr.dim], [3, 1, pr.home]] : [[0, 1, pr.home], [1, 1, pr.dim]];
      const scale = [...new Set([...pr.home, ...pr.dim])];
      mel = nearestIn(pr.home, mel - 1, 66, 77);
      const lh = [pitchIn(r, 36)];
      slots.forEach(([o, dur, pcs], i) => {
        if (i > 0) {
          do mel++;
          while (!scale.includes(mod(mel, 12)) || !pcs.includes(mod(mel, 12)));
        }
        const rh = blockUnder(mel, pcs);
        evs.push(i === 0 ? evOf(b0 + o, dur, rh, lh) : evOf(b0 + o, dur, rh, [], [r]));
      });
    });
  });
  return evs;
}
/** sixPair for the new forms: a minor tonic as its m6 (Cm6 / B°7), V7♭9 and V7alt as G7 ↔ A♭°7 (as k-sixdim 8 minor), I6 as I. */
function sixPairForm(r: number, q: string): { home: number[]; dim: number[] } {
  if (q === 'm6') return { home: pcsOf([0, 3, 7, 9], r), dim: pcsOf([11, 2, 5, 8], r) };
  if (q === '7b9' || q === 'alt') return { home: pcsOf([0, 4, 7, 10], r), dim: pcsOf([1, 4, 7, 10], r) };
  return sixPair(r, q === '6' ? 'maj7' : q);
}

/** The LH of a chord drill holds its notes until its next note (a root a bar, a pedal). */
function holdLH(d: Drill): Drill {
  const lh = d.notes.filter((n) => n.hand === 'L').map((n) => n.beat);
  const next = (b: number) => Math.min(d.beats, ...lh.filter((x) => x > b + 1e-6));
  return { ...d, notes: d.notes.map((n) => (n.hand === 'L' ? { ...n, dur: r6(next(n.beat) - n.beat) } : n)) };
}

/** A JAZZ_FORMS form as chart bars ("Dm7 G7"). */
function formChart(form: (typeof JAZZ_FORMS)[number], key: number): string[] {
  const sym: Record<string, string> = { '7': '7', m7: 'm7', maj7: 'maj7', hd7: 'ø7', dim7: '°7', '7b9': '7♭9', alt: '7alt', m6: 'm6', '6': '6', mmaj7: 'm(maj7)' };
  return form.bars.map((bar) => bar.map(([d, q]) => keyName(key + d) + (sym[q] ?? q)).join(' '));
}

// ───────────────────────────── k-bebop: bebop lines over forms, trading fours ─────────────────────────────

/** Chord tones (targets on the beats), the scale between them and the guide tones (3rd, 7th), above the root. */
const LINE_Q: Record<string, { ct: number[]; sc: number[]; guide: number[] }> = {
  maj7: { ct: [0, 4, 7, 11], sc: [0, 2, 4, 5, 7, 9, 11], guide: [4, 11] },
  '6': { ct: [0, 4, 7, 9], sc: [0, 2, 4, 5, 7, 9, 11], guide: [4, 9] },
  m7: { ct: [0, 3, 7, 10], sc: [0, 2, 3, 5, 7, 9, 10], guide: [3, 10] },
  m6: { ct: [0, 3, 7, 9], sc: [0, 2, 3, 5, 7, 9, 11], guide: [3, 9] },
  '7': { ct: [0, 4, 7, 10], sc: [0, 2, 4, 5, 7, 9, 10], guide: [4, 10] },
  // V7♭9 in minor: the 5th mode of harmonic minor.
  '7b9': { ct: [0, 4, 7, 10, 1], sc: [0, 1, 4, 5, 7, 8, 10], guide: [4, 10] },
  // Altered dominant: 3, ♭7 and the altered tensions are the targets (the altered scale).
  alt: { ct: [0, 4, 10, 1, 3, 8], sc: [0, 1, 3, 4, 6, 8, 10], guide: [4, 10] },
  hd7: { ct: [0, 3, 6, 10], sc: [0, 2, 3, 5, 6, 8, 10], guide: [3, 10] },
  dim7: { ct: [0, 3, 6, 9], sc: [0, 2, 3, 5, 6, 8, 9, 11], guide: [3, 9] },
};
type LChord = { r: number; q: string; beats: number };
const lineChord = (c: LChord) => ({ ct: pcsOf(LINE_Q[c.q].ct, c.r), sc: pcsOf(LINE_Q[c.q].sc, c.r), guide: pcsOf(LINE_Q[c.q].guide, c.r) });

/**
 * A bebop line over chords (8ths, generated, seeded): a chord tone on every beat — the next chord tone up or down, the
 * scale tone between (a chromatic one where none fits) — a chromatic approach into each new chord's guide tone (3rd
 * or 7th), an occasional triplet turn on a chord's first beat, and the last chord's guide tone held for two beats.
 */
function bebopLine(chords: LChord[], seed: string, o: { lo: number; hi: number; start: number; triplets?: boolean }): LineN[] {
  const rnd = rng(seed);
  const out: LineN[] = [];
  let beat = 0;
  let dir = -1;
  let p = nearestIn(lineChord(chords[0]).guide, o.start, o.lo, o.hi);
  chords.forEach((c, ci) => {
    const lc = lineChord(c);
    const last = ci === chords.length - 1;
    const play = last ? Math.max(0, c.beats - 2) : c.beats;
    for (let b = 0; b < play; b++) {
      const toNew = b === play - 1;
      let q: number;
      if (toNew) {
        const nx = last ? lc : lineChord(chords[ci + 1]);
        q = nearestIn(nx.guide, p + (rnd() < 0.5 ? -1 : 1), o.lo, o.hi, p);
      } else {
        if (p <= o.lo + 3) dir = 1;
        else if (p >= o.hi - 3) dir = -1;
        else if (rnd() < 0.3) dir = -dir;
        q = p + dir;
        while (!lc.ct.includes(mod(q, 12))) q += dir;
      }
      if (o.triplets && b === 0 && !toNew && rnd() < 0.5) {
        let up = p + 1;
        while (!lc.sc.includes(mod(up, 12))) up++;
        out.push({ p, beat, dur: 1 / 3, ct: true }, { p: up, beat: beat + 1 / 3, dur: 1 / 3, ct: false }, { p, beat: beat + 2 / 3, dur: 1 / 3, ct: false });
      } else {
        let off: number;
        if (toNew) off = q < p ? q + 1 : q > p ? q - 1 : q + 1;
        else {
          const between: number[] = [];
          for (let x = Math.min(p, q) + 1; x < Math.max(p, q); x++) if (lc.sc.includes(mod(x, 12))) between.push(x);
          if (between.length) off = q < p ? between[0] : between[between.length - 1];
          else if (Math.abs(q - p) >= 2) off = p + Math.sign(q - p);
          else {
            // A half step between chord tones: step past the target and come back to it.
            off = q + Math.sign(q - p);
            while (!lc.sc.includes(mod(off, 12))) off += Math.sign(q - p);
          }
        }
        if (off === p) off = q < p ? q - 1 : q + 1;
        out.push({ p, beat, dur: 0.5, ct: true }, { p: off, beat: beat + 0.5, dur: 0.5, ct: false });
      }
      p = q;
      beat++;
    }
    if (last) out.push({ p, beat, dur: c.beats - play, ct: true });
  });
  return out;
}

/** Forms for lines (roots relative to the key, qualities of LINE_Q), one or two chords a bar. */
const BEBOP_FORMS: Record<string, { name: T2; bars: [number, string][][]; minor?: boolean }> = {
  'ii-v-i': { name: t('ii–V–I', 'ii–V–I'), bars: [[[2, 'm7']], [[7, '7']], [[0, 'maj7']], [[0, '6']]] },
  'minor-ii-v-i': { name: t('minor ii–V–i', 'ii–V–i מינורי'), bars: [[[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']]], minor: true },
  altered: { name: t('ii–V7alt–I', 'ii–V7alt–I'), bars: [[[2, 'm7']], [[7, 'alt']], [[0, 'maj7']], [[0, '6']]] },
  blues: {
    name: t('jazz blues', 'בלוז ג׳אז'),
    bars: [[[0, '7']], [[5, '7']], [[0, '7']], [[7, 'm7'], [0, '7']], [[5, '7']], [[6, 'dim7']], [[0, '7']], [[9, '7']], [[2, 'm7']], [[7, '7']], [[0, '7'], [9, '7']], [[2, 'm7'], [7, '7']]],
  },
  rhythm: {
    name: t('rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A'),
    bars: [[[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, 'maj7'], [9, '7']], [[2, 'm7'], [7, '7']], [[0, '7'], [0, '7']], [[5, 'maj7'], [6, 'dim7']], [[0, 'maj7'], [7, '7']], [[0, '6']]],
  },
  cycle: {
    name: t('a standard: the ii–V–I cycle', 'סטנדרט: מעגל ii–V–I'),
    bars: [[[2, 'm7']], [[7, '7']], [[0, 'maj7']], [[5, 'maj7']], [[11, 'hd7']], [[4, '7b9']], [[9, 'm6']], [[9, 'm6']]],
  },
  'minor-standard': {
    name: t('a minor standard', 'סטנדרט במינור'),
    bars: [[[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']], [[5, 'm7']], [[10, '7']], [[3, 'maj7']], [[8, 'maj7']], [[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']]],
    minor: true,
  },
};
const SYM: Record<string, string> = { '7': '7', m7: 'm7', maj7: 'maj7', hd7: 'ø7', dim7: '°7', '7b9': '7♭9', alt: '7alt', m6: 'm6', '6': '6' };
const formChords = (bars: [number, string][][], key: number): LChord[] => bars.flatMap((bar) => bar.map(([d, q]) => ({ r: mod(key + d, 12), q, beats: 4 / bar.length })));
const chartOf = (bars: [number, string][][], key: number, minor = false): string[] => bars.map((bar) => bar.map(([d, q]) => keyName(key + d, minor && d === 0) + SYM[q]).join(' '));

/** LH shells (root + 3rd or 7th, the one nearer the last) on each chord's first beat, under a line (C2–B3). */
function shellsFor(chords: LChord[]): { beat: number; dur: number; v: number[] }[] {
  const out: { beat: number; dur: number; v: number[] }[] = [];
  let beat = 0;
  let prevTop = 52;
  for (const c of chords) {
    const root = pitchIn(c.r, 36);
    const g = LINE_Q[c.q].guide.map((x) => root + x);
    const top = g.reduce((a, b) => (Math.abs(b - prevTop) < Math.abs(a - prevTop) ? b : a));
    out.push({ beat, dur: c.beats, v: [root, top] });
    prevTop = top;
    beat += c.beats;
  }
  return out;
}

function genBebop(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const formId = { 'bb-251': 'ii-v-i', 'bb-minor': 'minor-ii-v-i', 'bb-alt': 'altered', 'bb-blues': 'blues', 'bb-rhythm': 'rhythm', 'bb-standard': op === 1 ? 'minor-standard' : 'cycle' }[s.kind];
  const sp: DrillSpec = { ...s, swing: true };
  if (formId) {
    const form = BEBOP_FORMS[formId];
    const chords = formChords(form.bars, key);
    // A line starting high (op 0) or low (op 1), with triplet turns on op 2.
    const line = bebopLine(chords, `${s.kind}:${key}:${op}`, { lo: 58, hi: 82, start: op === 1 ? 62 : 74, triplets: op === 2 });
    const kn = keyName(key, !!form.minor);
    const how = [t('from the top', 'מלמעלה'), t('from below', 'מלמטה'), t('with triplet turns', 'עם סיבובי טריולה')][Math.min(2, op)];
    const d = lineDrill(sp, line, title([t(`Bebop line, ${form.name.en} in ${kn}: chord tones on the beats, approach notes into each change (${how.en})`, `קו ביבופ, ${form.name.he} ב-${kn}: צלילי אקורד על הפעמות, צלילי גישה לכל החלפה (${how.he})`)], sp), { chordTonesOnBeats: true }, SIG[form.minor ? mod(key + 3, 12) : key], 80);
    return { ...d, chart: chartOf(form.bars, key, form.minor) };
  }
  if (s.kind === 'bb-hands') {
    // Both hands: LH shells on each chord, the RH line above them (from C4).
    const form = BEBOP_FORMS[op === 1 ? 'blues' : 'ii-v-i'];
    const chords = formChords(form.bars, key);
    const line = bebopLine(chords, `bb-hands:${key}:${op}`, { lo: 62, hi: 84, start: 74 });
    const buf = new Buf();
    for (const n of line) buf.add(n.beat, n.dur, [{ pitch: n.p, hand: 'R', chordTone: n.ct }]);
    for (const sh of shellsFor(chords)) buf.add(sh.beat, sh.dur, sh.v.map((p) => ({ pitch: p, hand: 'L' as Hand, chordTone: true })));
    const hs: DrillSpec = { ...sp, hands: 'RL' };
    const d = finish(hs, buf, title([t(`Left-hand shells, right-hand bebop line: ${form.name.en} in ${keyName(key)}`, `קונכיות ביד שמאל, קו ביבופ ביד ימין: ${form.name.he} ב-${keyName(key)}`)], hs), { evenness: false, hands: true, chordTonesOnBeats: true }, 70, 4, SIG[key]);
    return { ...d, chart: chartOf(form.bars, key) };
  }
  if (s.kind === 'bb-trade') return genTrade(sp);
  if (s.kind === 'bb-form' || s.kind === 'bb-matrix') return genBebopForm(sp);
  throw new Error(`Unknown k-bebop kind: ${s.kind}`);
}

// ───────────────────────────── whole forms (PIANO_JAZZ P2): AABA, the bridge, minor blues, ballad, Coltrane ─────────────────────────────

type FBars = [number, string][][];
const B1 = (d: number, q: string): [number, string][] => [[d, q]];
const B2 = (d: number, q: string, e: number, r: string): [number, string][] => [
  [d, q],
  [e, r],
];
/** Rhythm changes: A1 ends on a turnaround into A2, A2 ends home; the bridge is III7–VI7–II7–V7, two bars each. */
const RC_A1: FBars = [B2(0, 'maj7', 9, '7'), B2(2, 'm7', 7, '7'), B2(0, 'maj7', 9, '7'), B2(2, 'm7', 7, '7'), B2(0, '7', 0, '7'), B2(5, 'maj7', 6, 'dim7'), B2(0, 'maj7', 7, '7'), B2(2, 'm7', 7, '7')];
const RC_A2: FBars = [...RC_A1.slice(0, 7), B1(0, '6')];
const RC_B: FBars = [B1(4, '7'), B1(4, '7'), B1(9, '7'), B1(9, '7'), B1(2, '7'), B1(2, '7'), B1(7, '7'), B1(7, '7')];
/** Minor blues: i (m6) four bars, iv two, i two, ♭VI7, V7alt, i, iiø–V7alt; a tag bar home. */
const MINOR_BLUES: FBars = [B1(0, 'm6'), B1(0, 'm6'), B1(0, 'm6'), B1(0, 'm6'), B1(5, 'm7'), B1(5, 'm7'), B1(0, 'm6'), B1(0, 'm6'), B1(8, '7'), B1(7, 'alt'), B1(0, 'm6'), B2(2, 'hd7', 7, 'alt')];
/** A ballad AABA of our own (16 bars): I–vi–ii–V, iii–VI–ii–V; the bridge on IV and the minor iv. */
const BALLAD_A: FBars = [B2(0, 'maj7', 9, 'm7'), B2(2, 'm7', 7, '7'), B2(4, 'm7', 9, '7'), B2(2, 'm7', 7, '7')];
const BALLAD_B: FBars = [B1(5, 'maj7'), B2(5, 'm7', 10, '7'), B2(4, 'm7', 9, '7'), B2(2, 'm7', 7, '7')];
/** A Coltrane matrix cell into tonic T: ii of T, then V–I in T + 8, T + 4 and T (keys a major 3rd apart). */
const matrixCell = (T: number): FBars => [B2(T + 2, 'm7', T + 3, '7'), B2(T + 8, 'maj7', T + 11, '7'), B2(T + 4, 'maj7', T + 7, '7'), B1(T, 'maj7')];
/** The cells falling by whole steps into the key (a Countdown-type form, our own). */
export const MATRIX: FBars = [...matrixCell(4), ...matrixCell(2), ...matrixCell(0)];

export interface PianoForm {
  name: T2;
  sections: { name: string; kind: FormSection['kind']; bars: FBars }[];
  order: number[];
  minor?: boolean;
}
/** Whole forms for k-bebop 9, k-bebop 10 and k-sixdim 10, with their road map (PROG_ENGINE §4: applyForm / analyzeForm). */
export const PIANO_FORMS: Record<string, PianoForm> = {
  'rhythm-aaba': { name: t('rhythm changes, the whole AABA form', 'ריתם צ׳יינג׳ס, כל צורת AABA'), sections: [{ name: 'A1', kind: 'head', bars: RC_A1 }, { name: 'A2', kind: 'head', bars: RC_A2 }, { name: 'B', kind: 'bridge', bars: RC_B }], order: [0, 1, 2, 1] },
  'rhythm-bridge': { name: t('the bridge of rhythm changes (III7–VI7–II7–V7)', 'הגשר של ריתם צ׳יינג׳ס (III7–VI7–II7–V7)'), sections: [{ name: 'B', kind: 'bridge', bars: RC_B }, { name: 'Tag', kind: 'tag', bars: [B1(0, '6')] }], order: [0, 1] },
  'minor-blues': { name: t('the minor blues', 'הבלוז המינורי'), sections: [{ name: 'Blues', kind: 'head', bars: MINOR_BLUES }, { name: 'Tag', kind: 'tag', bars: [B1(0, 'm6')] }], order: [0, 1], minor: true },
  ballad: { name: t('a ballad form (AABA, 16 bars)', 'צורת בלדה (AABA, ‏16 תיבות)'), sections: [{ name: 'A', kind: 'head', bars: BALLAD_A }, { name: 'B', kind: 'bridge', bars: BALLAD_B }, { name: 'Tag', kind: 'tag', bars: [B1(0, '6')] }], order: [0, 0, 1, 0, 2] },
  matrix: { name: t('the Coltrane matrix (a Countdown-type form)', 'מטריצת קולטריין (צורה בסגנון Countdown)'), sections: [{ name: 'A', kind: 'head', bars: MATRIX.slice(0, 4) }, { name: 'B', kind: 'head', bars: MATRIX.slice(4, 8) }, { name: 'C', kind: 'head', bars: MATRIX.slice(8) }], order: [0, 1, 2] },
};
/** The form's bars in play order. */
export const formBars = (f: PianoForm): FBars => f.order.flatMap((i) => f.sections[i].bars);
/** The form's road map in a key (chart per section bar). */
function formPlanOf(f: PianoForm, key: number): FormPlan {
  return { sections: f.sections.map((x) => ({ name: x.name, kind: x.kind, bars: x.bars.length, chart: chartOf(x.bars, key, f.minor) })), order: f.order };
}
/**
 * Form goals on the piano: no bar lost, section starts within 40 ms, tempo drift ≤ 2 % (as the bass's J4). Swung 8th
 * lines leave the drift out: the road map's section tempo compares played IOIs with straight 8ths, so swing itself
 * would read as rushing and dragging (the timing SD and the outliers still judge the time).
 */
const PIANO_FORM_GOAL = { lost: 0, landMs: 40, drift: 0.02 };
function withPianoForm(d: Drill, f: PianoForm, key: number): Drill {
  const formed = applyForm(d, formPlanOf(f, key));
  const goal = d.spec.swing ? { lost: 0, landMs: 40 } : PIANO_FORM_GOAL;
  return { ...formed, beats: Math.max(d.beats, formed.beats), goal: { ...formed.goal, prog: { ...(formed.goal.prog ?? {}), form: goal } } };
}

/** k-bebop 9 (whole forms) and 10 (the Coltrane matrix): a bebop line over every bar of the form, measured against its road map. */
function genBebopForm(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const id = s.kind === 'bb-matrix' ? 'matrix' : (['rhythm-aaba', 'rhythm-bridge', 'minor-blues'] as const)[Math.min(2, op)];
  const f = PIANO_FORMS[id];
  const chords = formChords(formBars(f), key);
  const low = s.kind === 'bb-matrix' && op === 1;
  const line = bebopLine(chords, `${s.kind}:${key}:${op}`, { lo: 58, hi: 82, start: low ? 62 : 74 });
  const kn = keyName(key, !!f.minor);
  const how = s.kind === 'bb-matrix' ? (low ? t(' (from below)', ' (מלמטה)') : t(' (from the top)', ' (מלמעלה)')) : t('', '');
  const d = lineDrill(s, line, title([t(`Bebop line over ${f.name.en} in ${kn}${how.en}: chord tones on the beats, every bar of the form`, `קו ביבופ על ${f.name.he} ב-${kn}${how.he}: צלילי אקורד על הפעמות, כל תיבה בצורה`)], s), { chordTonesOnBeats: true }, SIG[f.minor ? mod(key + 3, 12) : key], 80);
  return withPianoForm(d, f, key);
}

/**
 * Trading fours with the band (PIANO_JAZZ): the app's piano plays four bars (a bebop line over LH shells), the player
 * answers with four bars of their own, twice. The player's bars are free: a chord tone on beats 1 and 3 of every bar
 * (any octave, within a quarter beat), the rest inside the chord's scale or a half step into it, at least two notes a
 * bar. The band's phrase stops a beat before the player's bars, so the microphone never takes it for the answer.
 */
function genTrade(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = opOf(s, 2);
  const form = BEBOP_FORMS[op === 1 ? 'blues' : op === 2 ? 'rhythm' : 'ii-v-i'];
  // 16 bars: the form repeated as needed (blues: bars 1–12 then 1–4; rhythm: the A section twice; ii–V–I four times).
  const bars: [number, string][][] = [];
  while (bars.length < 16) bars.push(...form.bars);
  bars.length = 16;
  const chords = formChords(bars, key);
  const model = bebopLine(chords, `bb-trade:${key}:${op}`, { lo: 60, hi: 82, start: 72 });
  const yours: [number, number][] = [
    [16, 32],
    [48, 64],
  ];
  const mine = (b: number) => yours.some(([a, z]) => b >= a - 1e-6 && b < z - 1e-6);
  // The band: its line (to beat 3 of its 4th bar) and LH shells, on the piano.
  const bandLine = model.filter((n) => !mine(n.beat) && mod(n.beat, 16) < 15 - 1e-6);
  const listen: NonNullable<Drill['listen']>['notes'] = [
    ...bandLine.map((n) => ({ beat: n.beat, dur: Math.min(n.dur, 0.5), midi: [n.p], inst: 'piano' as const })),
    ...shellsFor(chords)
      .filter((sh) => !mine(sh.beat))
      .map((sh) => ({ beat: sh.beat, dur: Math.min(sh.dur, 15 - mod(sh.beat, 16)), midi: sh.v, inst: 'piano' as const })),
  ];
  // Your landings: beats 1 and 3 of each of your bars, any chord tone; the model's note is the written one.
  const buf = new Buf();
  let at = 0;
  const scale: { from: number; to: number; pcs: number[] }[] = [];
  for (const c of chords) {
    const lc = lineChord(c);
    scale.push({ from: at, to: at + c.beats, pcs: [...new Set([...lc.sc, ...lc.ct])] });
    for (let b = at; b < at + c.beats; b += 2) {
      if (!mine(b)) continue;
      const m = model.find((n) => Math.abs(n.beat - b) < 1e-6)!;
      buf.add(b, 1, [{ pitch: m.p, hand: 'R', chordTone: true }]);
      buf.notes[buf.notes.length - 1].land = lc.ct;
    }
    at += c.beats;
  }
  const kn = keyName(key);
  const d = finish(s, buf, title([t(`Trading fours with the band: ${form.name.en} in ${kn} — land a chord tone on 1 and 3`, `חילופי ארבע עם הלהקה: ${form.name.he} ב-${kn} — לנחות על צליל אקורד ב-1 וב-3`)], s), { evenness: false, hands: false, free: { windows: yours, scale, minPerBar: 2, model: model.filter((n) => mine(n.beat)).map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.p })) } }, 100, 4, SIG[key]);
  return {
    ...d,
    beats: 64,
    show: 'none',
    chart: chartOf(bars, key),
    // PIANO_JAZZ P2: under your bars the band comps (bass and comping) and the drums keep swinging — heard only with
    // MIDI or headphones (DrillTake); by microphone on a speaker it stays out there, so the mic hears only you. In its
    // own bars the band's phrase and shells (listen) already sound, so the comping rests there.
    band: {
      style: 'swing',
      bass: true,
      rests: [
        [0, 16],
        [32, 48],
      ],
    },
    drums: { groove: 'swing' },
    listen: {
      notes: listen,
      windows: [
        [0, 15],
        [32, 47],
      ],
      ask: { en: 'The band plays four bars, you answer four: a chord tone on beats 1 and 3, your own line between.', he: 'הלהקה מנגנת ארבע תיבות ואתם עונים בארבע: צליל אקורד בפעמות 1 ו-3, וקו משלכם ביניהן.' },
    },
  };
}

// ───────────────────────────── k-reharm: jazz-piano harmony ─────────────────────────────

/** A two-handed chord: root (pc), LH intervals above the root (pitched from C2 when `exact`), RH pitch classes, beats. */
interface HCh {
  r: number;
  lh: number[];
  rh: number[];
  beats: number;
  /** LH as written intervals over a root in C2–B2 (10ths, root–7th); else voice-led (guide tones). */
  exact?: boolean;
  /** More allowed tones (tensions of the chord). */
  more?: number[];
}
function twoHand(s: DrillSpec, chords: HCh[], ttl: T2, keySig: string, o: { lh: [number, number]; rh: [number, number]; rhAim?: number; times?: [number, number][] } = { lh: [48, 62], rh: [60, 81] }): Drill {
  let pl: number[] | null = null;
  let pr: number[] | null = null;
  let beat = 0;
  const evs = chords.map((c, i) => {
    const lhPcs = pcsOf(c.lh, c.r);
    const lh: number[] = c.exact ? c.lh.map((x) => pitchIn(c.r, 36) + x) : pl ? voiceNear(lhPcs, pl, o.lh[0], o.lh[1]) : voiceNear(lhPcs, null, o.lh[0], o.lh[1], undefined, (o.lh[0] + o.lh[1]) / 2);
    const lo = Math.max(o.rh[0], Math.max(...lh) + 1);
    const rhPcs = pcsOf(c.rh, c.r);
    const rh: number[] = pr ? voiceNear(rhPcs, pr, lo, o.rh[1]) : voiceNear(rhPcs, null, lo, o.rh[1], undefined, o.rhAim ?? 72);
    pl = lh;
    pr = rh;
    const [b, d] = o.times ? o.times[i] : [beat, c.beats];
    beat += c.beats;
    return evOf(b, d, rh, lh, pcsOf(c.more ?? [], c.r));
  });
  const sp: DrillSpec = { ...s, hands: 'RL' };
  return chordDrill(sp, evs, title([ttl], sp), 60, {}, keySig);
}

/** Rootless RH colours (3, 5 / 13, 7, 9) and LH root–7th shells by quality (k-reharm). */
const RH_Q: Record<string, number[]> = { maj7: [4, 7, 11, 2], '6': [4, 7, 9, 2], m7: [3, 7, 10, 2], '7': [4, 9, 10, 2], alt: [4, 10, 1, 3], '7b9': [4, 7, 10, 1], hd7: [3, 6, 10, 0], dim7: [0, 3, 6, 9], m6: [3, 7, 9, 2] };
const LH_Q: Record<string, number[]> = { maj7: [0, 11], '6': [0, 9], m7: [0, 10], '7': [0, 10], alt: [0, 10], '7b9': [0, 10], hd7: [0, 10], dim7: [0, 9], m6: [0, 9] };
const MORE_Q: Record<string, number[]> = { maj7: [0, 2, 4, 7, 9, 11], '6': [0, 2, 4, 7, 9, 11], m7: [0, 2, 3, 5, 7, 10], '7': [0, 2, 4, 7, 9, 10], alt: [0, 1, 3, 4, 6, 8, 10], '7b9': [0, 1, 4, 7, 8, 10], hd7: [0, 2, 3, 5, 6, 10], dim7: [0, 3, 6, 9, 2, 5, 8, 11], m6: [0, 2, 3, 7, 9, 11] };

function genReharm(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const kn = keyName(key);
  const op = s.option ?? 0;
  const R = (d: number) => mod(key + d, 12);
  switch (s.kind) {
    case 'rh-altered': {
      // ii–V7alt–I twice: LH guide tones (3 & 7, voice-led), RH three tones — the altered shape on V.
      const o = Math.min(3, Math.max(0, op));
      const alt = [
        { rh: [8, 0, 3], en: '7♯9♭13 (the ♭VI triad: ♭13, root, ♯9)', he: '7♯9♭13 (משולש ♭VI: ♭13, יסוד, ♯9)' },
        { rh: [6, 10, 1], en: '7♭9♯11 (the ♭V triad: ♯11, 7, ♭9)', he: '7♭9♯11 (משולש ♭V: ♯11, 7, ♭9)' },
        { rh: [3, 6, 10], en: '7♯9♯11 (the ♭III minor triad: ♯9, ♯11, 7)', he: '7♯9♯11 (משולש ♭III מינורי: ♯9, ♯11, 7)' },
        { rh: [1, 4, 9], en: '13♭9 (♭9, 3, 13)', he: '13♭9 (♭9, 3, 13)' },
      ][o];
      const ii: HCh = { r: R(2), lh: [3, 10], rh: [7, 2, 5], beats: 2, more: MORE_Q.m7 };
      const v: HCh = { r: R(7), lh: [4, 10], rh: alt.rh, beats: 2, more: [...MORE_Q.alt, 9, 2] };
      const I: HCh = { r: R(0), lh: [4, 11], rh: [7, 2, 9], beats: 4, more: MORE_Q.maj7 };
      return twoHand(s, [ii, v, I, ii, v, I], t(`ii–V–I in ${kn}, the V altered: ${keyName(key + 7)}${alt.en}`, `ii–V–I ב-${kn}, ה-V אלטרד: ${keyName(key + 7)}${alt.he}`), SIG[key], { lh: [50, 62], rh: [63, 82], rhAim: 72 });
    }
    case 'rh-minor': {
      // Minor ii–V–i in two hands: Dø11 (♭5 9 11), G7♭9♭13 (op 1: 7♯9♭13), then Cm6/9 (op 1: Cm(maj9)).
      const b = op === 1;
      const ii: HCh = { r: R(2), lh: [3, 10], rh: [6, 2, 5], beats: 2, more: MORE_Q.hd7 };
      const v: HCh = { r: R(7), lh: [4, 10], rh: b ? [3, 8, 0] : [1, 4, 8], beats: 2, more: [...MORE_Q.alt, 7] };
      const i: HCh = b ? { r: R(0), lh: [3, 11], rh: [7, 2, 3], beats: 4, more: [0, 2, 3, 7, 11] } : { r: R(0), lh: [3, 9], rh: [7, 2, 0], beats: 4, more: MORE_Q.m6 };
      const km = keyName(key, true);
      return twoHand(s, [ii, v, i, ii, v, i], b ? t(`Minor ii–V–i in ${km}: ø11, 7♯9♭13, m(maj9)`, `ii–V–i מינורי ב-${km}: ø11, 7♯9♭13, m(maj9)`) : t(`Minor ii–V–i in ${km}: ø11, 7♭9♭13, m6/9`, `ii–V–i מינורי ב-${km}: ø11, 7♭9♭13, m6/9`), SIG[mod(key + 3, 12)], { lh: [50, 62], rh: [63, 82], rhAim: 72 });
    }
    case 'rh-ballad': {
      // Ballad voicings: LH root + 10th (op 0) or root + 7th (op 1), RH four notes, the top voice leading.
      const tenth = op !== 1;
      const prog: [number, string, number[]][] = [
        [0, 'maj7', [4, 7, 11, 2]],
        [9, 'm7', [3, 7, 10, 2]],
        [2, 'm7', [3, 7, 10, 2]],
        [7, '7', [4, 9, 10, 2]],
        [4, 'm7', [3, 7, 10, 2]],
        [9, '7', [4, 8, 10, 1]],
        [2, 'm7', [3, 7, 10, 2]],
        [7, '7b9', [4, 7, 10, 1]],
        [0, 'maj7', [4, 7, 11, 2]],
      ];
      const chords: HCh[] = prog.map(([d, q, rh]) => ({ r: R(d), lh: tenth ? [0, q.startsWith('m') ? 15 : 16] : [0, q === 'maj7' ? 11 : 10], rh, beats: 4, exact: true, more: MORE_Q[q] ?? [] }));
      return twoHand(s, chords, tenth ? t(`Ballad voicings in ${kn}: LH 10ths, RH four notes — I–vi–ii–V, iii–VI–ii–V–I`, `קולות בלדה ב-${kn}: דצימות ביד שמאל, ארבעה צלילים בימין — I–vi–ii–V, iii–VI–ii–V–I`) : t(`Ballad voicings in ${kn}: LH root and 7th, RH four notes — I–vi–ii–V, iii–VI–ii–V–I`, `קולות בלדה ב-${kn}: יסוד וספטימה ביד שמאל, ארבעה צלילים בימין — I–vi–ii–V, iii–VI–ii–V–I`), SIG[key], { lh: [36, 64], rh: [64, 84], rhAim: 76 });
    }
    case 'rh-reharm': {
      // Reharmonisation, two hands (LH root–7th, RH rootless): tritone subs, backdoor, passing diminished, ii–V inserted.
      const o = Math.min(3, Math.max(0, op));
      const progs: [number, string, number][][] = [
        [[0, 'maj7', 4], [4, 'm7', 2], [3, '7', 2], [2, 'm7', 2], [1, '7', 2], [0, 'maj7', 4]],
        [[0, 'maj7', 4], [5, 'm7', 2], [10, '7', 2], [0, 'maj7', 4], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]],
        [[0, 'maj7', 2], [1, 'dim7', 2], [2, 'm7', 2], [3, 'dim7', 2], [4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, '6', 4]],
        [[0, 'maj7', 4], [4, 'hd7', 2], [9, '7', 2], [2, 'm7', 4], [9, 'm7', 2], [2, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]],
      ];
      const nm = [
        t(`tritone substitutes: ${keyName(key + 3)}7 for ${keyName(key + 9)}7, ${keyName(key + 1)}7 for ${keyName(key + 7)}7`, `תחליפי טריטון: ${keyName(key + 3)}7 במקום ${keyName(key + 9)}7, ${keyName(key + 1)}7 במקום ${keyName(key + 7)}7`),
        t(`the backdoor: iv7–♭VII7–I (${keyName(key + 5)}m7 ${keyName(key + 10)}7) against ii–V–I`, `הדלת האחורית: iv7–♭VII7–I (${keyName(key + 5)}m7 ${keyName(key + 10)}7) מול ii–V–I`),
        t('passing diminished chords: I – ♯I°7 – ii7 – ♯ii°7 – iii7', 'אקורדים מוקטנים עוברים: I – ♯I°7 – ii7 – ♯ii°7 – iii7'),
        t('a ii added before every dominant: I – iiø–V/ii – ii – ii–V/V – ii–V – I', 'ii לפני כל דומיננט: I – iiø–V/ii – ii – ii–V/V – ii–V – I'),
      ][o];
      const chords: HCh[] = progs[o].map(([d, q, b]) => ({ r: R(d), lh: LH_Q[q], rh: RH_Q[q], beats: b, exact: true, more: MORE_Q[q] }));
      return twoHand(s, chords, t(`Reharmonising in ${kn}: ${nm.en}`, `הרמוניה מחודשת ב-${kn}: ${nm.he}`), SIG[key], { lh: [36, 59], rh: [60, 81], rhAim: 70 });
    }
    case 'rh-chains': {
      // Chains (two hands, LH root–7th, RH rootless): ii–Vs falling by whole steps into a new key (op 0), and the family
      // of dominants falling by half steps, each one the tritone substitute of the next one's V (op 1).
      const chains: [number, string, number][][] = [
        [[4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'm7', 2], [5, '7', 2], [10, 'maj7', 4]],
        [[4, '7', 2], [3, '7', 2], [2, '7', 2], [1, '7', 2], [0, 'maj7', 4], [9, '7', 2], [8, '7', 2], [7, '7', 2], [6, '7', 2], [5, 'maj7', 4]],
      ];
      const c = chains[op === 1 ? 1 : 0];
      const chords: HCh[] = c.map(([d, q, b]) => ({ r: R(d), lh: LH_Q[q], rh: RH_Q[q], beats: b, exact: true, more: MORE_Q[q] }));
      const ttl =
        op === 1
          ? t(`The family of dominants: ${keyName(key + 4)}7 ${keyName(key + 3)}7 ${keyName(key + 2)}7 ${keyName(key + 1)}7 → ${kn}, then on to ${keyName(key + 5)}`, `משפחת הדומיננטות: ${keyName(key + 4)}7 ${keyName(key + 3)}7 ${keyName(key + 2)}7 ${keyName(key + 1)}7 → ${kn}, ואז הלאה ל-${keyName(key + 5)}`)
          : t(`ii–V chains falling by whole steps: ${keyName(key + 4)}m7 ${keyName(key + 9)}7 · ${keyName(key + 2)}m7 ${keyName(key + 7)}7 · ${kn}m7 ${keyName(key + 5)}7 → ${keyName(key + 10)}maj7`, `שרשראות ii–V יורדות בטונים: ${keyName(key + 4)}m7 ${keyName(key + 9)}7 · ${keyName(key + 2)}m7 ${keyName(key + 7)}7 · ${kn}m7 ${keyName(key + 5)}7 → ${keyName(key + 10)}maj7`);
      return twoHand(s, chords, ttl, SIG[key], { lh: [36, 59], rh: [60, 81], rhAim: 70 });
    }
    case 'rh-modal': {
      // Modal comping over a pedal (LH root and 5th). Op 0: three-note 4ths through the dorian scale on a comping
      // rhythm (1, the "and" of 2, 4). Op 1: triads of the mode over the pedal (♭III, IV, v, ii, ♭VII).
      const dor = [0, 2, 3, 5, 7, 9, 10];
      const ped = pitchIn(key, 36);
      const lh = [ped, ped + 7];
      const evs: ChordEv[] = [];
      if (op !== 1) {
        const base = pitchIn(key, 55);
        const ks = [
          [0, 1, 2],
          [3, 2, 1],
          [2, 3, 4],
          [3, 1, 0],
        ];
        ks.forEach((bar, bi) =>
          bar.forEach((k, i) => {
            const rh = [0, 3, 6].map((x) => degPitch(base, dor, k + x));
            const [b, d] = [
              [0, 1.5],
              [1.5, 1.5],
              [3, 1],
            ][i];
            evs.push(i === 0 ? evOf(bi * 4 + b, d, rh, lh) : evOf(bi * 4 + b, d, rh, [], [key, key + 7]));
          }),
        );
        const d = holdLH(chordDrill({ ...s, hands: 'RL' }, evs, title([t(`Modal comping in ${keyName(key, true)} dorian: 4ths over a pedal, on 1, the "and" of 2, and 4`, `ליווי מודאלי ב-${keyName(key, true)} דורי: קוורטות מעל פדל, ב-1, ב"וְ" של 2 וב-4`)], { ...s, hands: 'RL' }), 60, {}, SIG[mod(key + 10, 12)]));
        return d;
      }
      const tri: [number, boolean][] = [
        [3, true],
        [5, true],
        [7, false],
        [5, true],
        [3, true],
        [2, false],
        [10, true],
        [5, true],
      ];
      let prev: number[] | null = null;
      tri.forEach(([d, maj], i) => {
        const pcs = pcsOf(maj ? [0, 4, 7] : [0, 3, 7], key + d);
        const rh: number[] = prev ? voiceNear(pcs, prev, 57, 79) : voiceNear(pcs, null, 57, 79, undefined, 67);
        prev = rh;
        evs.push(i % 2 === 0 ? evOf(i * 2, 2, rh, lh) : evOf(i * 2, 2, rh, [], [key, key + 7]));
      });
      return holdLH(chordDrill({ ...s, hands: 'RL' }, evs, title([t(`Modal comping in ${keyName(key, true)} dorian: triads of the mode over a pedal`, `ליווי מודאלי ב-${keyName(key, true)} דורי: משולשים של המודוס מעל פדל`)], { ...s, hands: 'RL' }), 60, {}, SIG[mod(key + 10, 12)]));
    }
    case 'rh-solo': {
      // Solo piano: the LH keeps the bass, the RH the harmony — I–VI7–ii–V, iii–VI7–ii–V–I.
      const prog: [number, string, number][] = [
        [0, 'maj7', 4],
        [9, '7', 4],
        [2, 'm7', 4],
        [7, '7', 4],
        [4, 'm7', 4],
        [9, '7', 4],
        [2, 'm7', 2],
        [7, '7', 2],
        [0, '6', 4],
      ];
      const buf = new Buf();
      let beat = 0;
      let bass = pitchIn(key, 40);
      let prevG: number[] | null = null;
      let mel = 72;
      prog.forEach(([d, q, len], ci) => {
        const r = R(d);
        const ct = LINE_Q[q].ct;
        const nextR = ci + 1 < prog.length ? R(prog[ci + 1][0]) : r;
        if (op === 0) {
          // Walking LH in quarters (root, chord tones, a half step into the next root); RH guide tones on 1 and the "and" of 2.
          const root = nearestIn([r], bass, 36, 48);
          const walk: number[] = [root];
          for (let k = 1; k < len; k++) {
            if (k === len - 1) {
              const nr = nearestIn([nextR], walk[k - 1], 36, 48);
              walk.push(nr > walk[k - 1] ? nr - 1 : nr + 1);
            } else walk.push(root + ct[Math.min(k, 2)]);
          }
          walk.forEach((p, k) => buf.add(beat + k, 1, [{ pitch: p, hand: 'L' }]));
          bass = walk[walk.length - 1];
          const g = pcsOf(LINE_Q[q].guide, r);
          const gv: number[] = prevG ? voiceNear(g, prevG, 57, 69) : voiceNear(g, null, 57, 69, undefined, 62);
          prevG = gv;
          const hits: [number, number][] = len === 4 ? [[0, 1.5], [1.5, 2.5]] : [[0, 2]];
          for (const [b, l] of hits) buf.add(beat + b, l, gv.map((p) => ({ pitch: p, hand: 'R' as Hand })));
        } else if (op === 1) {
          // LH 10ths on 1 and 3; RH a quarter-note line of chord tones (3-5-7-9 up, or 3 and 7).
          const root = pitchIn(r, 36);
          const ten = root + 12 + LINE_Q[q].guide[0];
          for (let b = 0; b < len; b += 2) buf.add(beat + b, 2, [{ pitch: root, hand: 'L' }, { pitch: ten, hand: 'L' }]);
          const g = LINE_Q[q].guide;
          const up = len === 4 ? [g[0], 7, g[1], 14] : [g[0], g[1]];
          let p = nearestIn([mod(r + up[0], 12)], mel, 66, 77);
          up.forEach((x, k) => {
            if (k > 0) {
              p++;
              while (mod(p - r - x, 12) !== 0) p++;
            }
            buf.add(beat + k, 1, [{ pitch: p, hand: 'R' }]);
          });
          mel = p - 7;
        } else {
          // A two-feel: LH root on 1, the 5th on 3; RH rootless chords on 2 and 4.
          const root = nearestIn([r], bass, 36, 47);
          bass = root;
          const g = pcsOf(RH_Q[q].slice(0, 3), r);
          const gv: number[] = prevG ? voiceNear(g, prevG, 55, 70) : voiceNear(g, null, 55, 70, undefined, 62);
          prevG = gv;
          for (let b = 0; b < len; b += 2) {
            buf.add(beat + b, 1, [{ pitch: b === 0 ? root : root + 7, hand: 'L' }]);
            buf.add(beat + b + 1, 1, gv.map((p) => ({ pitch: p, hand: 'R' as Hand })));
          }
        }
        beat += len;
      });
      const nm = [t('walking left hand, guide tones on 1 and the "and" of 2', 'יד שמאל מהלכת, צלילים מנחים ב-1 וב"וְ" של 2'), t('left-hand 10ths, a right-hand line of chord tones', 'דצימות ביד שמאל, קו צלילי אקורד ביד ימין'), t('two-feel: bass on 1 and 3, chords on 2 and 4', 'בשניים: בס ב-1 וב-3, אקורדים ב-2 וב-4')][Math.min(2, op)];
      const sp: DrillSpec = { ...s, hands: 'RL', swing: true };
      return finish(sp, buf, title([t(`Solo piano in ${kn}, I–VI7–ii–V–iii–VI7–ii–V–I: ${nm.en}`, `פסנתר סולו ב-${kn}, I–VI7–ii–V–iii–VI7–ii–V–I: ${nm.he}`)], sp), { evenness: false, hands: true }, 80, 4, SIG[key]);
    }
    case 'rh-pedal': {
      // PIANO_JAZZ P2: upper structures over a pedal (LH root and 5th, held a bar). Op 0 lydian: the triads of the
      // lydian mode over the root — II (9, ♯11, 13), V (5, 7, 9), vii (7, 9, ♯11), iii (3, 5, 7). Op 1 sus
      // ("Maiden Voyage"-type colours): ♭VII (♭7, 9, 11), v (5, ♭7, 9), IV (11, 13, 1), ii (9, 11, 13) over the root,
      // then the same a minor 3rd up.
      const lyd = op !== 1;
      const tri: [number, number, boolean][] = lyd
        ? [[0, 7, true], [0, 2, true], [0, 11, false], [0, 2, true], [0, 4, false], [0, 2, true], [0, 7, true], [0, 2, true]]
        : [[0, 10, true], [0, 7, false], [0, 5, true], [0, 2, false], [3, 10, true], [3, 7, false], [3, 5, true], [3, 2, false]];
      const mode = lyd ? [0, 2, 4, 6, 7, 9, 11] : [0, 2, 5, 7, 9, 10];
      const evs: ChordEv[] = [];
      let prev: number[] | null = null;
      tri.forEach(([ped, d, maj], i) => {
        const root = mod(key + ped, 12);
        const lp = pitchIn(root, 36);
        const lh = [lp, lp + 7];
        const pcs = pcsOf(maj ? [0, 4, 7] : [0, 3, 7], root + d);
        const rh: number[] = prev ? voiceNear(pcs, prev, 60, 81) : voiceNear(pcs, null, 60, 81, undefined, 70);
        prev = rh;
        const more = pcsOf(mode, root);
        evs.push(i % 2 === 0 ? evOf(i * 2, 2, rh, lh, more) : evOf(i * 2, 2, rh, [], [...more, root, root + 7]));
      });
      const sp: DrillSpec = { ...s, hands: 'RL' };
      const ttl = lyd
        ? t(`Upper structures over a ${kn} pedal, lydian: ${keyName(key + 7)}, ${keyName(key + 2)}, ${keyName(key + 11)}m, ${keyName(key + 4)}m over ${kn}`, `מבנים עליונים מעל פדל ${kn}, לידי: ${keyName(key + 7)}, ${keyName(key + 2)}, ${keyName(key + 11)}m, ${keyName(key + 4)}m מעל ${kn}`)
        : t(`Upper structures over a pedal, sus: ${keyName(key + 10)}, ${keyName(key + 7)}m, ${keyName(key + 5)}, ${keyName(key + 2)}m over ${kn}, then a minor 3rd up over ${keyName(key + 3)}`, `מבנים עליונים מעל פדל, סאס:${keyName(key + 10)}, ${keyName(key + 7)}m, ${keyName(key + 5)}, ${keyName(key + 2)}m מעל ${kn}, ואז טרצה קטנה למעלה מעל ${keyName(key + 3)}`);
      return holdLH(chordDrill(sp, evs, title([ttl], sp), 60, {}, SIG[lyd ? mod(key + 7, 12) : mod(key + 5, 12)]));
    }
  }
  throw new Error(`Unknown k-reharm kind: ${s.kind}`);
}

/** accomp 18 (PIANO_JAZZ P2): the stride charts with a written RH melody — chart, LH stride. */
export const STRIDE_MELODY: [string, ChartVoicing][] = [
  ['lv:turnaround', 'stride-tenth'],
  ['std:a-train', 'stride-octave'],
  ['lv:blues', 'stride-single'],
];
/**
 * Stride with a right-hand melody (accomp 18): the stride LH of the chart and a measured RH line above it — a guide
 * tone (3rd or 7th) of the chord on beats 1 and 3, a half note each, each the nearer one to the last (voice leading),
 * between F4 and G5. Before, accomp 16 left the RH free (not measured).
 */
function genStrideMelody(s: DrillSpec): Drill {
  const [ref, voicing] = STRIDE_MELODY[opOf(s, STRIDE_MELODY.length - 1)];
  const kind = chartKind(ref, voicing, 'whole', 'comp');
  const d = chartDrillData(kind, s.key);
  if (!d) throw new Error(`Unknown stride chart: ${ref}`);
  const parsed = parseChart(d.text, d.meter);
  const chordAt = (beat: number) => {
    let cur = parsed.chords[0];
    for (const c of parsed.chords) if (c.bar * d.meter + c.at <= beat + 1e-6) cur = c;
    return cur;
  };
  let mel = 72;
  const evs: ChordEv[] = d.evs.map((e) => ({ beat: e.beat, dur: e.dur, notes: [...e.notes], required: [...e.required], allowed: [...e.allowed] }));
  for (const e of evs) {
    if (mod(e.beat, 2) > 1e-6 || !e.notes.some((n) => n.hand === 'L')) continue;
    const c = chordAt(e.beat);
    const R = roles(c);
    const guide = [mod(c.root + R.third, 12), mod(c.root + R.seventh, 12)];
    mel = nearestIn(guide, mel, 65, 79, mel);
    e.notes.push({ pitch: mel, hand: 'R', accent: true });
    e.required = [...new Set([...e.required, mod(mel, 12)])];
    e.allowed = [...new Set([...e.allowed, mod(mel, 12)])];
  }
  const sp: DrillSpec = { ...s, hands: 'RL', swing: s.swing ?? true };
  const ttl = t(`${d.title.en} · RH melody: guide tones on 1 and 3`, `${d.title.he} · מנגינה ביד ימין: צלילים מנחים ב-1 וב-3`);
  const drill = chordDrill(sp, evs, ttl, d.startBpm, {}, 'C', d.meter);
  // The RH half notes sound through beats 1–2 and 3–4 (the LH stride keeps its quarters).
  const notes = drill.notes.map((n) => (n.hand === 'R' ? { ...n, dur: 2 } : n));
  return { ...drill, notes, chart: d.text.split(' | ') };
}

export function generate(spec: DrillSpec): Drill {
  if (spec.family.startsWith('d-')) return generateDrums(spec);
  if (spec.family.startsWith('g-') || spec.family.startsWith('b-')) return generateGuitar(spec);
  const s: DrillSpec = { ...spec, key: mod(spec.key, 12) };
  if (s.family === 'k-ear') return genKeysEar(s);
  if (s.family === 'k-sixdim') return genSixDim(s);
  if (s.family === 'k-bebop') return genBebop(s);
  if (s.family === 'k-reharm') return genReharm(s);
  if (s.kind.startsWith('chart~')) return genChart(s);
  switch (s.kind) {
    case 'scale':
    case 'octaves':
      return genScale(s);
    case 'arpeggio':
    case 'arp-triad':
    case 'arp-dom7':
    case 'arp-dim7':
    case 'arp-maj7':
    case 'arp-m7':
    case 'arp-hd7':
      return genArp(s);
    case 'broken':
      return genBroken(s);
    case 'cadence-1':
    case 'cadence-64':
    case 'cadence-ii6':
    case 'cadence-circle':
    case 'cadence-vofv':
    case 'cadence-n6':
    case 'cadence-aug6':
      return genCadence(s);
    case 'five':
      return genFive(s);
    case 'hanon-1':
    case 'hanon-style':
      return genHanon(s);
    case 'trill':
      return genTrill(s);
    case 'repeated':
      return genRepeated(s);
    case 'held':
      return genHeld(s);
    case 'voicing':
      return genVoicingChords(s);
    case 'alberti':
      return genAlberti(s, s.option === 1);
    case 'melody-alberti':
      return genAlberti(s, true);
    case 'polyrhythm':
      return genPoly(s);
    case 'stride':
      return genStride(s);
    case 'walking':
      return genWalking(s);
    case 'v-triads':
    case 'v-sevenths':
    case 'shells':
    case 'rootless':
    case 'one-minute':
    case 'so-what':
    case 'blues-shells':
    case 'guide-tones':
    case 'ust':
    case 'digital':
    case 'quartal':
    case 'drop2':
    case 'two-hand':
    case 'tritone-sub':
    case 'comp':
    case 'coltrane-v':
      return genVoicings(s);
    case 'cadence-plagal':
    case 'cadence-deceptive':
    case 'cadence-picardy':
      return genCadence(s);
    case 'jscale':
      return genJScale(s);
    case 'balance':
      return genBalance(s);
    case 'blocked':
      return genBlocked(s);
    case 'ornament':
      return genOrnament(s);
    case 'thumb-under':
      return genThumbUnder(s);
    case 'double-notes':
      return genDoubleNotes(s);
    case 'leaps':
      return genLeaps(s);
    case 'rotation':
      return genRotation(s);
    case 'rep-chords':
      return genRepChords(s);
    case 'velocity':
      return genVelocity(s);
    case 'reading':
      return genReading(s);
    case 'pedal':
      return genPedal(s);
    case 'form-thirds':
    case 'form-guide':
    case 'form-arp':
      return genFormLine(s);
    case 'locked':
      return genLocked(s);
    case 'coltrane':
      return genColtrane(s);
    case 'blues-lick':
      return genBluesLick(s);
    case 'boogie':
      return genBoogie(s);
    case 'bossa':
    case 'montuno':
      return genLatin(s);
    case 'pop-lh':
      return genPopLH(s);
    case 'walk-changes':
      return genWalkChanges(s);
    case 'stride-melody':
      return genStrideMelody(s);
  }
  if (s.kind.startsWith('h')) return genHarris(s);
  throw new Error(`Unknown drill kind: ${s.kind}`);
}

// ───────────────────────────── catalogue ─────────────────────────────

export type SpecTemplate = Omit<DrillSpec, 'key'>;
export interface LevelDef {
  /** Stable id, e.g. "scales-3". */
  id: string;
  level: number;
  title: T2;
  /** Items of the level (each runs through the keys). */
  specs: SpecTemplate[];
  /** Key list: minor keys order, major keys order, or fixed keys (e.g. C, G, F at C1). */
  keys: 'major' | 'minor' | number[];
  /**
   * Piano (PIANO_AUDIT T1): start → target speed in notes per second, from the exam grade the level matches
   * (ABRSM minimum speeds). Items start at the first (their `tempo`) and the level's target is the second, whatever the
   * item's note value. Levels without it: the generator's start tempo × 1.25.
   */
  nps?: [number, number];
  /** A fixed start → target tempo (♩) for every item (the pianist's ear: a calm call, no speed ladder to climb). */
  tempo?: [number, number];
}

/** The ABRSM recommended minimum speeds, in notes per second (scales / arpeggios, Grades 1–8; ♩ in 8ths to G3, 16ths from G4). */
export const EXAM_NPS = {
  scales: [2.0, 2.2, 2.67, 3.47, 4.2, 5.07, 5.33, 5.87],
  arpeggios: [2.3, 2.1, 2.3, 2.53, 2.93, 3.33, 3.73, 4.4],
} as const;
export interface FamilyDef {
  id: FamilyId;
  title: T2;
  /** 'both': shown with either emphasis (the pianist's ear). */
  style: 'classical' | 'jazz' | 'both';
  levels: LevelDef[];
}

/** Families → ordered levels → spec templates (spec §4–§5). */
export function catalog(): FamilyDef[] {
  const L = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'] = 'major', nps?: [number, number]): LevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: t(en, he),
    // The start speed as each item's tempo (♩ = nps × 60 ÷ notes a beat; 8ths unless the item says otherwise).
    specs: nps ? specs.map((x) => ({ ...x, tempo: Math.max(40, Math.round((nps[0] * 60) / (x.perBeat ?? 2))) })) : specs,
    keys,
    ...(nps ? { nps } : {}),
  });
  // The pianist's ear: one tempo range for every level.
  const E = (level: number, en: string, he: string, specs: SpecTemplate[], keys: number[]): LevelDef => ({ id: `k-ear-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: KEYS_EAR_TEMPO[0] })), keys, tempo: KEYS_EAR_TEMPO });
  const ke = (kind: string, option?: number): SpecTemplate => ({ family: 'k-ear', kind, hands: 'R', ...(option !== undefined ? { option } : {}) });
  // PIANO_JAZZ: jazz-piano levels with a start → target tempo (♩) for every item (chords and swung 8ths alike).
  const JT = (fam: FamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys, tempo });
  const sd = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-sixdim', kind, hands: 'R', ...o });
  const bb = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-bebop', kind, hands: 'R', swing: true, ...o });
  const rh = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-reharm', kind, hands: 'RL', ...o });
  const SN = EXAM_NPS.scales;
  const AN = EXAM_NPS.arpeggios;
  const sc = (o: Partial<SpecTemplate>): SpecTemplate => ({
    family: 'scales',
    kind: 'scale',
    hands: 'R',
    ...o,
  });
  const HS = (o: Partial<SpecTemplate>): SpecTemplate[] => [sc({ ...o, hands: 'R' }), sc({ ...o, hands: 'L' })];
  const ar = (o: Partial<SpecTemplate>): SpecTemplate => ({
    family: 'arpeggios',
    kind: 'arp-triad',
    hands: 'R',
    ...o,
  });
  const f = (o: Partial<SpecTemplate>): SpecTemplate => ({
    family: 'fingers',
    kind: 'five',
    hands: 'R',
    ...o,
  });
  const k = (o: Partial<SpecTemplate>): SpecTemplate => ({
    family: 'control',
    kind: 'scale',
    hands: 'R',
    octaves: 2,
    ...o,
  });
  const h = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({
    family: 'harris',
    kind,
    hands: 'R',
    ...o,
  });
  const v = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({
    family: 'voicings',
    kind,
    hands: 'L',
    ...o,
  });
  const j = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({
    family: 'jazz',
    kind,
    hands: 'R',
    ...o,
  });
  const m = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({
    family: 'accomp',
    kind,
    hands: 'L',
    ...o,
  });
  // Any progression as a drill (chartDrills.ts): voicings / comping / stride over levels, standards and templates.
  const cv = (ref: string, voicing: ChartVoicing, rhythm: CompRhythm = 'whole', mode: ChartMode = 'comp', fam: 'voicings' | 'accomp' = 'voicings'): SpecTemplate => ({
    family: fam,
    kind: chartKind(ref, voicing, rhythm, mode),
    hands: 'L',
    swing: true,
  });
  const st = (ref: string, voicing: ChartVoicing, mode: ChartMode = 'comp') => cv(ref, voicing, 'whole', mode, 'accomp');
  const c = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({
    family: 'cadences',
    kind,
    hands: 'RL',
    ...o,
  });
  const x = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({
    family: 'advanced',
    kind,
    hands: 'RL',
    ...o,
  });
  const FOURS = [10, 3, 8, 1, 6, 11, 4, 9, 2, 7, 0, 5].reverse(); // C F B♭ … up the cycle of 4ths
  const cyc4 = FOURS.slice(FOURS.indexOf(0)).concat(FOURS.slice(0, FOURS.indexOf(0)));
  return [
    {
      id: 'scales',
      title: t('Scales', 'סולמות'),
      style: 'classical',
      levels: [
        L('scales', 1, 'Major, each hand, 1 octave', "מז'ור, כל יד לחוד, אוקטבה אחת", HS({ octaves: 1 })),
        L('scales', 2, 'Major, each hand, 2 octaves', "מז'ור, כל יד לחוד, 2 אוקטבות", HS({ octaves: 2 })),
        L('scales', 3, 'Hands together, 2 octaves', 'ידיים יחד, 2 אוקטבות', [sc({ hands: 'RL', octaves: 2 })]),
        L('scales', 4, 'Contrary motion', 'תנועה נגדית', [sc({ hands: 'RL', octaves: 2, motion: 'contrary' })]),
        L(
          'scales',
          5,
          'Harmonic minor',
          'מינור הרמוני',
          [...HS({ minor: true, scale: 'harmonic', octaves: 2 }), sc({ hands: 'RL', minor: true, scale: 'harmonic', octaves: 2 })],
          'minor',
        ),
        L(
          'scales',
          6,
          'Melodic and natural minor',
          'מינור מלודי וטבעי',
          [sc({ hands: 'RL', minor: true, scale: 'melodic', octaves: 2 }), sc({ hands: 'RL', minor: true, scale: 'natural', octaves: 2 })],
          'minor',
          [SN[2], SN[3]],
        ),
        L('scales', 7, 'Chromatic', 'כרומטי', [
          ...HS({ scale: 'chromatic', octaves: 2 }),
          sc({
            hands: 'RL',
            scale: 'chromatic',
            octaves: 2,
            motion: 'contrary',
          }),
        ], 'major', [SN[1], SN[3]]),
        L('scales', 8, 'A 3rd, 6th and 10th apart', 'בהפרש טרצה, סקסטה ודצימה', [
          sc({ hands: 'RL', motion: 'third' }),
          sc({ hands: 'RL', motion: 'sixth' }),
          sc({ hands: 'RL', motion: 'tenth' }),
        ], 'major', [SN[2], SN[4]]),
        L('scales', 9, 'Formula pattern', 'תבנית פורמולה', [sc({ hands: 'RL', motion: 'formula', octaves: 2 })], 'major', [SN[2], SN[4]]),
        L('scales', 10, '4 octaves in 16ths', '4 אוקטבות בשש-עשריות', [
          sc({ hands: 'RL', octaves: 4, perBeat: 4 }),
          sc({
            hands: 'RL',
            octaves: 4,
            perBeat: 4,
            minor: true,
            scale: 'harmonic',
          }),
        ], 'major', [SN[3], SN[7]]),
        L('scales', 11, 'Rhythm variants', 'וריאציות קצב', [
          sc({ hands: 'RL', variant: 'dotted' }),
          sc({ hands: 'RL', variant: 'rev-dotted' }),
          sc({ hands: 'RL', variant: 'groups3', perBeat: 3 }),
          sc({ hands: 'RL', variant: 'accent-shift', perBeat: 4 }),
        ], 'major', [SN[1], SN[3]]),
        L('scales', 12, 'Jazz scales', "סולמות ג'אז", [
          sc({ scale: 'mixolydian' }),
          sc({ scale: 'bebop-dom' }),
          sc({ scale: 'blues' }),
          sc({ scale: 'pentatonic' }),
          sc({ scale: 'six-dim' }),
        ]),
        L(
          'scales',
          13,
          'Minor scales: contrary motion, a 3rd / 6th / 10th apart',
          'סולמות מינור: תנועה נגדית, בהפרש טרצה / סקסטה / דצימה',
          [
            sc({ hands: 'RL', minor: true, scale: 'harmonic', octaves: 2, motion: 'contrary' }),
            sc({ hands: 'RL', minor: true, scale: 'harmonic', motion: 'third' }),
            sc({ hands: 'RL', minor: true, scale: 'harmonic', motion: 'sixth' }),
            sc({ hands: 'RL', minor: true, scale: 'harmonic', motion: 'tenth' }),
            sc({ hands: 'RL', minor: true, scale: 'melodic', octaves: 2, motion: 'contrary' }),
          ],
          'minor',
          [SN[2], SN[4]],
        ),
        L('scales', 14, 'Chromatic a minor 3rd and a major 6th apart; 3 octaves', 'כרומטי בהפרש טרצה קטנה וסקסטה גדולה; 3 אוקטבות', [
          sc({ hands: 'RL', scale: 'chromatic', motion: 'third' }),
          sc({ hands: 'RL', scale: 'chromatic', motion: 'sixth' }),
          sc({ hands: 'RL', octaves: 3 }),
          sc({ hands: 'RL', octaves: 3, minor: true, scale: 'harmonic' }),
          sc({ hands: 'RL', octaves: 3, scale: 'chromatic' }),
        ], 'major', [SN[3], SN[5]]),
        L('scales', 15, 'Melodic and natural minor, each hand', 'מינור מלודי וטבעי, כל יד', [...HS({ minor: true, scale: 'melodic', octaves: 2 }), ...HS({ minor: true, scale: 'natural', octaves: 2 })], 'minor', [SN[2], SN[3]]),
      ],
    },
    {
      id: 'arpeggios',
      title: t('Arpeggios', "ארפג'יו"),
      style: 'classical',
      levels: [
        L('arpeggios', 1, 'Major triads, root position, each hand', "משולשים מז'וריים, מצב יסודי, כל יד", [
          ar({ hands: 'R', octaves: 1 }),
          ar({ hands: 'L', octaves: 1 }),
          ar({ hands: 'R', octaves: 2 }),
          ar({ hands: 'L', octaves: 2 }),
        ]),
        L('arpeggios', 2, 'Inversions, each hand', 'היפוכים, כל יד', [
          ar({ option: 1 }),
          ar({ option: 2 }),
          ar({ hands: 'L', option: 1 }),
          ar({ hands: 'L', option: 2 }),
        ]),
        L('arpeggios', 3, 'Hands together, 2 octaves (major and minor)', "ידיים יחד, 2 אוקטבות (מז'ור ומינור)", [
          ar({ hands: 'RL', octaves: 2 }),
          ar({ hands: 'RL', octaves: 2, minor: true }),
        ]),
        L('arpeggios', 4, 'Dominant 7th', 'ספטאקורד דומיננטי', [
          ar({ kind: 'arp-dom7' }),
          ar({ kind: 'arp-dom7', hands: 'L' }),
          ar({ kind: 'arp-dom7', hands: 'RL' }),
        ]),
        L('arpeggios', 5, 'Diminished 7th', 'ספטאקורד מוקטן', [ar({ kind: 'arp-dim7' }), ar({ kind: 'arp-dim7', hands: 'RL' })], 'minor'),
        L('arpeggios', 6, '4 octaves, contrary motion', '4 אוקטבות, תנועה נגדית', [
          ar({ hands: 'RL', octaves: 4, perBeat: 4 }),
          ar({ hands: 'RL', octaves: 2, motion: 'contrary' }),
        ], 'major', [AN[4], AN[7]]),
        L('arpeggios', 7, 'maj7 / m7 / ø7 (jazz)', "maj7 / m7 / ø7 (ג'אז)", [ar({ kind: 'arp-maj7' }), ar({ kind: 'arp-m7' }), ar({ kind: 'arp-hd7' })], cyc4),
        L('arpeggios', 8, 'Broken chords through the inversions', 'אקורדים שבורים דרך ההיפוכים', [
          ar({ kind: 'broken' }),
          ar({ kind: 'broken', option: 1 }),
          ar({ kind: 'broken', hands: 'RL' }),
        ]),
        L(
          'arpeggios',
          9,
          'Minor triads: inversions, each hand',
          'משולשים מינוריים: היפוכים, כל יד',
          [ar({ minor: true }), ar({ minor: true, option: 1 }), ar({ minor: true, option: 2 }), ar({ hands: 'L', minor: true, option: 1 }), ar({ hands: 'L', minor: true, option: 2 })],
          'minor',
        ),
        L('arpeggios', 10, 'Dominant 7th from every chord tone', 'ספטאקורד דומיננטי מכל צליל אקורד', [
          ar({ kind: 'arp-dom7', option: 1 }),
          ar({ kind: 'arp-dom7', option: 2 }),
          ar({ kind: 'arp-dom7', option: 3 }),
          ar({ kind: 'arp-dom7', hands: 'RL', option: 1 }),
        ], 'major', [AN[3], AN[5]]),
        L(
          'arpeggios',
          11,
          'Diminished 7th from every note',
          'ספטאקורד מוקטן מכל צליל',
          [ar({ kind: 'arp-dim7', option: 1 }), ar({ kind: 'arp-dim7', option: 2 }), ar({ kind: 'arp-dim7', option: 3 }), ar({ kind: 'arp-dim7', hands: 'L' })],
          'minor',
          [AN[3], AN[5]],
        ),
        L('arpeggios', 12, '3 octaves hands together; jazz 7ths hands together', '3 אוקטבות בידיים יחד; ספטאקורדי ג׳אז בידיים יחד', [
          ar({ hands: 'RL', octaves: 3 }),
          ar({ hands: 'RL', octaves: 3, minor: true }),
          ar({ kind: 'arp-maj7', hands: 'RL' }),
          ar({ kind: 'arp-m7', hands: 'RL' }),
          ar({ kind: 'arp-hd7', hands: 'RL' }),
        ], 'major', [AN[4], AN[6]]),
        L('arpeggios', 13, 'Blocked chords through the inversions', 'אקורדים סגורים דרך ההיפוכים', [ar({ kind: 'blocked' }), ar({ kind: 'blocked', hands: 'L' }), ar({ kind: 'blocked', hands: 'RL' })]),
        L(
          'arpeggios',
          14,
          'Minor broken and blocked chords',
          'אקורדים שבורים וסגורים במינור',
          [ar({ kind: 'broken', minor: true }), ar({ kind: 'broken', minor: true, option: 1 }), ar({ kind: 'broken', minor: true, hands: 'RL' }), ar({ kind: 'blocked', minor: true, hands: 'RL' })],
          'minor',
        ),
      ],
    },
    {
      id: 'cadences',
      title: t('Cadences', 'קדנצות'),
      style: 'classical',
      levels: [
        L(
          'cadences',
          1,
          'I–IV–V–I in C, G, F',
          'I–IV–V–I ב-C, G, F',
          [c('cadence-1', { option: 0 }), c('cadence-1', { option: 1 }), c('cadence-1', { option: 2 })],
          [0, 7, 5],
        ),
        L(
          'cadences',
          2,
          'I–IV–I6/4–V7–I, three top positions',
          'I–IV–I6/4–V7–I, שלושה מצבים עליונים',
          [0, 1, 2].map((o) => c('cadence-64', { option: o })),
          [0, 7, 5, 2, 10, 9],
        ),
        L('cadences', 3, 'All keys, major and minor', "כל הסולמות, מז'ור ומינור", [c('cadence-64'), c('cadence-64', { minor: true })]),
        L('cadences', 4, 'ii6–V7–I, the circle, V/V', 'ii6–V7–I, המעגל, V/V', [c('cadence-ii6'), c('cadence-circle'), c('cadence-vofv')]),
        L(
          'cadences',
          5,
          'Neapolitan 6th and augmented 6th',
          'שישית נפוליטנית ושישית מוגדלת',
          [c('cadence-n6', { minor: true }), c('cadence-aug6', { minor: true })],
          'minor',
        ),
        L('cadences', 6, 'Plagal and deceptive cadences', 'קדנצה פלגאלית ומטעה', [c('cadence-plagal'), c('cadence-deceptive'), c('cadence-plagal', { option: 1 }), c('cadence-deceptive', { option: 2 })]),
        L(
          'cadences',
          7,
          'Minor: deceptive, plagal, Picardy 3rd; ii6 and the circle',
          'מינור: מטעה, פלגאלית, טרצה פיקרדית; ii6 והמעגל',
          [c('cadence-deceptive', { minor: true }), c('cadence-plagal', { minor: true }), c('cadence-picardy', { minor: true }), c('cadence-ii6', { minor: true }), c('cadence-circle', { minor: true })],
          'minor',
        ),
      ],
    },
    {
      id: 'fingers',
      title: t('Finger independence', 'עצמאות אצבעות'),
      style: 'classical',
      levels: [
        L('fingers', 1, 'Five-finger patterns', 'תבניות חמש אצבעות', [f({}), f({ hands: 'L' }), f({ hands: 'RL' }), f({ hands: 'RL', option: 1 })]),
        L(
          'fingers',
          2,
          'Hanon No. 1 and Hanon-style patterns',
          'האנון מס׳ 1 ותבניות בסגנון האנון',
          [f({ kind: 'hanon-1', hands: 'RL' }), ...[1, 2, 3, 4, 5, 6].map((o) => f({ kind: 'hanon-style', hands: 'RL', option: o }))],
          [0],
        ),
        L('fingers', 3, 'Held-note independence', 'צליל מוחזק', [f({ kind: 'held' }), f({ kind: 'held', hands: 'L' })], [0, 7, 5]),
        L(
          'fingers',
          4,
          'Trills on finger pairs',
          'טרילים בזוגות אצבעות',
          [0, 1, 2, 3, 4].map((o) => f({ kind: 'trill', option: o })),
          [0],
        ),
        L('fingers', 5, 'Repeated notes 4-3-2-1', 'צלילים חוזרים 4-3-2-1', [f({ kind: 'repeated' }), f({ kind: 'repeated', hands: 'L' })], [0, 7, 5]),
        L('fingers', 6, 'Hanon in all keys, 16ths', 'האנון בכל הסולמות, שש-עשריות', [
          f({ kind: 'hanon-1', hands: 'RL', perBeat: 4 }),
          f({ kind: 'hanon-style', hands: 'RL', option: 2, perBeat: 4 }),
        ], 'major', [SN[3], AN[7]]),
        L('fingers', 7, 'Hanon Part II 39–43 (scales and arpeggios)', 'האנון חלק ב׳ 39–43 (סולמות וארפג׳יו)', [
          sc({ hands: 'RL', perBeat: 4 }),
          sc({ hands: 'RL', perBeat: 4, scale: 'chromatic' }),
          ar({ hands: 'RL', perBeat: 4 }),
          ar({ kind: 'arp-dim7', hands: 'RL', perBeat: 4 }),
          ar({ kind: 'arp-dom7', hands: 'RL', perBeat: 4 }),
        ], 'major', [SN[3], AN[7]]),
        L(
          'fingers',
          8,
          'Thumb under: passing after 3 and after 4',
          'העברת אגודל: אחרי 3 ואחרי 4',
          [f({ kind: 'thumb-under' }), f({ kind: 'thumb-under', hands: 'L' }), f({ kind: 'thumb-under', option: 1 }), f({ kind: 'thumb-under', hands: 'L', option: 1 }), f({ kind: 'thumb-under', hands: 'RL', option: 1, perBeat: 4 })],
          [0, 7, 2, 5, 9],
        ),
        L(
          'fingers',
          9,
          'Ornaments: mordents, turn, grace notes, trill with a turn',
          'קישוטים: מורדנטים, גרופטו, צלילי חן, טריל עם סיום',
          [...[0, 1, 2, 3, 4, 5].map((o) => f({ kind: 'ornament', option: o })), f({ kind: 'ornament', hands: 'L', option: 0 }), f({ kind: 'ornament', hands: 'L', option: 2 })],
          [0, 7, 5, 2, 9],
        ),
        L(
          'fingers',
          10,
          'Held notes: hold 1 + 5, hold the middle finger (Pischna / Dohnányi style)',
          'צלילים מוחזקים: 1 ו-5, האצבע האמצעית (בסגנון פישנה / דוהנאני)',
          [f({ kind: 'held', option: 1 }), f({ kind: 'held', hands: 'L', option: 1 }), f({ kind: 'held', option: 2 }), f({ kind: 'held', hands: 'L', option: 2 })],
          [0, 7, 5, 2],
        ),
        L(
          'fingers',
          11,
          'Measured trills 6 and 8 per beat',
          'טרילים מדודים, 6 ו-8 לפעמה',
          [f({ kind: 'trill', option: 1, perBeat: 6 }), f({ kind: 'trill', option: 3, perBeat: 6 }), f({ kind: 'trill', option: 4, perBeat: 6 }), f({ kind: 'trill', option: 1, perBeat: 8 }), f({ kind: 'trill', hands: 'L', option: 1, perBeat: 6 })],
          [0, 7],
        ),
        L(
          'fingers',
          12,
          'Repeated chords and rotation (broken 6ths and octaves)',
          'אקורדים חוזרים ורוטציה (סקסטות ואוקטבות שבורות)',
          [f({ kind: 'rep-chords' }), f({ kind: 'rep-chords', hands: 'L' }), f({ kind: 'rotation' }), f({ kind: 'rotation', option: 1 }), f({ kind: 'rotation', hands: 'L' })],
          [0, 7, 5, 2],
        ),
        L('fingers', 13, 'Czerny-style velocity: runs and figuration over the LH', 'מהירות בסגנון צ׳רני: ריצות ופיגורציה מעל יד שמאל', [
          f({ kind: 'velocity', hands: 'RL' }),
          f({ kind: 'velocity', hands: 'RL', option: 1 }),
        ]),
        L('fingers', 14, 'Repeated notes and Hanon-style patterns in all keys', 'צלילים חוזרים ותבניות בסגנון האנון בכל הסולמות', [
          f({ kind: 'repeated', perBeat: 3 }),
          f({ kind: 'hanon-style', hands: 'RL', option: 3, perBeat: 4 }),
          f({ kind: 'hanon-style', hands: 'RL', option: 5, perBeat: 4 }),
          f({ kind: 'hanon-style', hands: 'RL', option: 6, perBeat: 4 }),
        ], 'major', [SN[3], SN[5]]),
      ],
    },
    {
      id: 'control',
      title: t('Control', 'שליטה'),
      style: 'classical',
      levels: [
        L(
          'control',
          1,
          'Legato vs staccato',
          'לגאטו מול סטקטו',
          [
            k({ articulation: 'legato' }),
            k({ articulation: 'staccato' }),
            k({ hands: 'L', articulation: 'legato' }),
            k({ hands: 'L', articulation: 'staccato' }),
          ],
          [0, 7, 5],
        ),
        L('control', 2, 'Portato', 'פורטטו', [k({ articulation: 'portato' }), k({ hands: 'L', articulation: 'portato' })], [0, 7, 5]),
        L(
          'control',
          3,
          'One dynamic level',
          'רמת עוצמה אחת',
          (['even-mf', 'even-p', 'even-f', 'even-pp', 'even-ff'] as DynamicsGoal[]).map((d) => k({ dynamics: d })),
          [0, 7, 5],
        ),
        L(
          'control',
          4,
          'Crescendo up, diminuendo down',
          'קרשנדו למעלה, דימינואנדו למטה',
          [k({ dynamics: 'cresc' }), k({ hands: 'L', dynamics: 'cresc' })],
          [0, 7, 5],
        ),
        L(
          'control',
          5,
          'Accents every 3rd / 4th note',
          'הטעמה כל צליל שלישי / רביעי',
          [k({ dynamics: 'accent3', perBeat: 3 }), k({ dynamics: 'accent4', perBeat: 4 })],
          [0, 7, 5],
        ),
        L(
          'control',
          6,
          'Voicing: top note louder',
          'הבלטת הצליל העליון',
          [k({ kind: 'voicing', octaves: undefined }), k({ kind: 'voicing', hands: 'L', octaves: undefined })],
          [0, 7, 5],
        ),
        L('control', 7, 'Melody over Alberti bass', 'מנגינה מעל בס אלברטי', [k({ kind: 'melody-alberti', hands: 'RL', octaves: undefined })], [0, 7, 5]),
        L('control', 8, 'Balance: one hand louder than the other', 'איזון: יד אחת חזקה מהשנייה', [k({ kind: 'balance', hands: 'RL', option: 0 }), k({ kind: 'balance', hands: 'RL', option: 1 })], [0, 7, 5, 2]),
        L(
          'control',
          9,
          'Legato, staccato and portato hands together',
          'לגאטו, סטקטו ופורטטו בידיים יחד',
          [k({ hands: 'RL', articulation: 'legato' }), k({ hands: 'RL', articulation: 'staccato' }), k({ hands: 'RL', articulation: 'portato' }), k({ hands: 'RL', articulation: 'staccato', motion: 'contrary' })],
          [0, 7, 5, 2, 9],
        ),
        L('control', 10, 'Pedaling: direct and legato pedal', 'פדל: ישיר ולגאטו', [0, 1, 2].map((o) => ({ family: 'control' as FamilyId, kind: 'pedal', hands: 'RL' as const, option: o })), [0, 7, 5, 2, 10]),
        L(
          'control',
          11,
          'Sight-reading: five-finger melodies',
          'קריאה מהדף: מנגינות חמש אצבעות',
          [
            { family: 'control', kind: 'reading', hands: 'R', option: 0 },
            { family: 'control', kind: 'reading', hands: 'L', option: 0 },
            { family: 'control', kind: 'reading', hands: 'R', option: 0, minor: true },
          ],
          [0, 7, 5, 2, 9],
        ),
        L(
          'control',
          12,
          'Sight-reading: wider range, mixed rhythms, hands together',
          'קריאה מהדף: טווח רחב, מקצבים מעורבים, ידיים יחד',
          [
            { family: 'control', kind: 'reading', hands: 'R', option: 1 },
            { family: 'control', kind: 'reading', hands: 'RL', option: 2 },
          ],
          [0, 7, 5, 2, 10, 9, 4, 3],
        ),
      ],
    },
    {
      id: 'advanced',
      title: t('Advanced', 'מתקדם'),
      style: 'classical',
      levels: [
        L('advanced', 1, 'Scales in octaves', 'סולמות באוקטבות', [x('octaves', { hands: 'R', octaves: 2 }), x('octaves', { hands: 'L', octaves: 2 })]),
        L('advanced', 2, 'Polyrhythm 3:2 and 4:3', 'פוליריתמיקה 3:2 ו-4:3', [x('polyrhythm', { option: 0 }), x('polyrhythm', { option: 1 })], [0]),
        L('advanced', 3, 'Staccato, chromatic and hands-together octaves', 'אוקטבות בסטקטו, כרומטיות ובידיים יחד', [
          x('octaves', { hands: 'R', octaves: 2, articulation: 'staccato' }),
          x('octaves', { hands: 'L', octaves: 2, articulation: 'staccato' }),
          x('octaves', { hands: 'R', octaves: 2, scale: 'chromatic' }),
          x('octaves', { hands: 'L', octaves: 2, scale: 'chromatic' }),
          x('octaves', { hands: 'RL', octaves: 2 }),
        ]),
        L('advanced', 4, 'Double 3rds and 6ths in one hand', 'טרצות וסקסטות כפולות ביד אחת', [
          x('double-notes', { hands: 'R', option: 0 }),
          x('double-notes', { hands: 'L', option: 0 }),
          x('double-notes', { hands: 'R', option: 1 }),
          x('double-notes', { hands: 'L', option: 1 }),
          x('double-notes', { hands: 'R', option: 0, octaves: 2 }),
          x('double-notes', { hands: 'R', option: 0, minor: true }),
        ]),
        L('advanced', 5, 'Leaps: waltz bass, two-octave jumps, outward leaps', 'קפיצות: בס ואלס, קפיצות של שתי אוקטבות, קפיצות החוצה', [x('leaps', { hands: 'L', option: 0 }), x('leaps', { hands: 'R', option: 1 }), x('leaps', { option: 2 })], [0, 7, 5, 2, 10]),
        L('advanced', 6, 'Polyrhythm with the hands swapped: 2:3 and 3:4', 'פוליריתמיקה בהחלפת ידיים: 2:3 ו-3:4', [x('polyrhythm', { option: 2 }), x('polyrhythm', { option: 3 })], [0, 7, 5]),
        L('advanced', 7, 'Polyrhythm in more keys', 'פוליריתמיקה בעוד סולמות', [x('polyrhythm', { option: 0 }), x('polyrhythm', { option: 1 })], [7, 5, 2, 10, 9]),
        L('advanced', 8, 'Hand crossing; leaps and double 6ths in more keys', 'הצלבת ידיים; קפיצות וסקסטות כפולות בעוד סולמות', [
          x('leaps', { hands: 'RL', option: 3 }),
          x('leaps', { hands: 'L', option: 0 }),
          x('leaps', { hands: 'RL', option: 2 }),
          x('double-notes', { hands: 'R', option: 1, minor: true }),
        ], [0, 7, 5, 2, 10, 9, 4, 3]),
      ],
    },
    {
      id: 'harris',
      title: t('Barry Harris', 'בארי האריס'),
      style: 'jazz',
      levels: [
        L('harris', 1, 'The linear scale', 'הסולם הלינארי', [h('h1-linear'), h('h1-linear', { hands: 'L' }), h('h1-linear', { hands: 'RL' })], cyc4),
        L(
          'harris',
          2,
          'Dominant scale down from each chord tone',
          'הסולם הדומיננטי בירידה מכל צליל אקורד',
          [0, 1, 2, 3].map((o) => h('h2-dominant', { option: o })),
          cyc4,
        ),
        L('harris', 3, 'Triads on every degree', 'משולשים על כל דרגה', [h('h3-triads')], cyc4),
        L('harris', 4, '4-note chords and "3 to 9"', 'אקורדים בני 4 ו-"3 עד 9"', [h('h4-chords'), h('h4-chords', { option: 1 })], cyc4),
        L('harris', 5, 'Pivots', 'פיבוטים', [h('h5-pivots')], cyc4),
        L('harris', 6, 'Half step below, enclosures', 'חצי טון מתחת, כיתורים', [h('h6-approach'), h('h6-approach', { option: 1 })], cyc4),
        L(
          'harris',
          7,
          'Lick + line over V7, then ii–V',
          'ליק + שורה על V7, ואז ii–V',
          [h('h7-line', { swing: true }), h('h7-line', { option: 1, swing: true })],
          cyc4,
        ),
        L('harris', 8, 'Brothers (dominants a minor 3rd apart)', '"אחים" (דומיננטות בהפרש טרצה קטנה)', [h('h8-brothers', { swing: true })], cyc4),
        L(
          'harris',
          9,
          '6th-diminished block chords, drop 2 / drop 3',
          'אקורדי בלוק שישית-מוקטן, דרופ 2 / 3',
          [h('h9-sixdim'), h('h9-sixdim', { option: 1, hands: 'RL' }), h('h9-sixdim', { option: 2, hands: 'RL' })],
          cyc4,
        ),
        L(
          'harris',
          10,
          'Minor 6th-diminished block chords',
          'אקורדי בלוק מינור שישית-מוקטן',
          [h('h10-minor6dim'), h('h10-minor6dim', { option: 1, hands: 'RL' }), h('h10-minor6dim', { option: 2, hands: 'RL' })],
          cyc4,
        ),
        L(
          'harris',
          11,
          'Arpeggio up, dominant scale down (from each chord tone)',
          'ארפג׳יו למעלה, הסולם הדומיננטי למטה (מכל צליל אקורד)',
          [...[0, 1, 2, 3].map((o) => h('h11-arp-scale', { option: o, swing: true })), h('h11-arp-scale', { option: 1, hands: 'L', swing: true })],
          cyc4,
        ),
        L('harris', 12, 'Harris lines with the left hand and hands together', 'שורות האריס ביד שמאל ובידיים יחד', [
          h('h2-dominant', { option: 1, hands: 'L' }),
          h('h3-triads', { hands: 'L' }),
          h('h5-pivots', { hands: 'L' }),
          h('h6-approach', { hands: 'L' }),
        ], cyc4),
        L('harris', 13, 'Diminished moves: four keys from one chord', 'תנועות הדימיניש: ארבעה סולמות מאקורד אחד', [h('h13-dimmoves'), h('h13-dimmoves', { option: 1 })], cyc4),
        // PIANO_JAZZ: the half-step rules from any start, and ii–V–I lines by the rules.
        L('harris', 14, 'The half-step rules: chord tones on the beats from any start', 'חוקי חצי הטון: צלילי אקורד על הפעמות מכל התחלה', [...[0, 1, 2, 3].map((o) => h('h14-rules', { option: o, swing: true })), h('h14-rules', { hands: 'L', swing: true })], cyc4, [2.33, 4]),
        L('harris', 15, 'ii–V–I lines by the rules, major and minor', 'שורות ii–V–I לפי החוקים, מז׳ור ומינור', [h('h15-iivi', { swing: true }), h('h15-iivi', { option: 1, swing: true })], cyc4, [2.33, 4]),
        // PIANO_JAZZ P2: Barry's chromatic lines — the family of dominants as lines, the chromatic scale with the rules, the sixth on the fifth.
        L('harris', 16, 'The family of dominants as lines: a half step into each chord', 'משפחת הדומיננטות כקווים: חצי טון לכל אקורד', [h('h16-chains', { swing: true }), h('h16-chains', { option: 1, swing: true }), h('h16-chains', { hands: 'L', swing: true })], cyc4, [2.33, 4]),
        L('harris', 17, 'The chromatic scale with the rules: a chord tone on every beat', 'הסולם הכרומטי לפי החוקים: צליל אקורד על כל פעמה', [...[0, 1, 2].map((o) => h('h17-chromatic', { option: o, perBeat: 3 })), h('h17-chromatic', { hands: 'L', perBeat: 3 })], cyc4, [2.33, 4]),
        L('harris', 18, "The sixth on the fifth: lines through each chord's 6th-diminished scale", 'השישית על הקווינטה: קווים בסולם השישית-מוקטן של כל אקורד', [0, 1, 2].map((o) => h('h18-sixfive', { option: o, swing: true })), cyc4, [2.33, 4]),
      ],
    },
    {
      // PIANO_JAZZ: Barry Harris's harmony — the 6th-diminished scale of chords and what grows out of it.
      id: 'k-sixdim',
      title: t('Barry Harris harmony', 'ההרמוניה של בארי האריס'),
      style: 'jazz',
      levels: [
        JT('k-sixdim', 1, 'The scale of chords from every chord tone', 'סולם האקורדים מכל צליל של האקורד', [0, 1, 2, 3].map((o) => sd('sd-inversions', { option: o })), cyc4, [60, 100]),
        JT('k-sixdim', 2, 'Borrowing: one voice moves to the diminished', 'השאלה: קול אחד עובר למוקטן', [0, 1, 2, 3].map((o) => sd('sd-borrow', { option: o })), cyc4, [60, 100]),
        JT('k-sixdim', 3, 'Oblique motion over a held bass', 'תנועה אלכסונית מעל בס מוחזק', [sd('sd-oblique', { hands: 'RL' }), sd('sd-oblique', { option: 1, hands: 'RL' })], cyc4, [60, 100]),
        JT('k-sixdim', 4, 'Spreads in two hands', 'פריסות בשתי ידיים', [sd('sd-spread', { hands: 'RL' }), sd('sd-spread', { option: 1, hands: 'RL' })], cyc4, [60, 96]),
        JT('k-sixdim', 5, 'Diminished passing chords', 'אקורדים מוקטנים עוברים', [sd('sd-passing', { hands: 'RL' }), sd('sd-passing', { option: 1, hands: 'RL' })], cyc4, [50, 84]),
        JT('k-sixdim', 6, 'Minor 6th-diminished: inversions and borrowing', 'שישית-מוקטן במינור: היפוכים והשאלה', [sd('sd-inversions', { minor: true }), sd('sd-inversions', { minor: true, option: 2 }), sd('sd-borrow', { minor: true }), sd('sd-borrow', { minor: true, option: 3 })], cyc4, [60, 100]),
        JT('k-sixdim', 7, 'The dominant ♭9 from the diminished', 'הדומיננט ♭9 מתוך המוקטן', [sd('sd-dom')], cyc4, [60, 96]),
        JT('k-sixdim', 8, 'ii–V–I the 6th-diminished way, major and minor', 'ii–V–I בדרך השישית-מוקטן, מז׳ור ומינור', [sd('sd-iivi', { hands: 'RL' }), sd('sd-iivi', { option: 1, hands: 'RL' })], cyc4, [60, 100]),
        JT('k-sixdim', 9, "A standard's form in 6th chords and diminished", 'צורת סטנדרט באקורדי שישית ומוקטן', [sd('sd-form', { hands: 'RL' }), sd('sd-form', { option: 1, hands: 'RL' })], [0, 5, 10, 7, 3], [60, 92]),
        JT('k-sixdim', 10, 'More forms: the minor blues, the bridge of rhythm changes, a ballad', 'עוד צורות: הבלוז המינורי, הגשר של ריתם צ׳יינג׳ס, בלדה', [0, 1, 2].map((o) => sd('sd-forms', { option: o, hands: 'RL' })), [0, 5, 10, 7, 3], [60, 92]),
      ],
    },
    {
      id: 'voicings',
      title: t('LH voicings and changes', 'קולות ליד שמאל והחלפות'),
      style: 'jazz',
      levels: [
        L('voicings', 1, 'Triads I–IV–V, smooth', 'משולשים I–IV–V, חלק', [v('v-triads')], [0, 7, 5]),
        L('voicings', 2, '7th chords, root position', 'אקורדי ספטימה, מצב יסודי', [v('v-sevenths')], [0, 7, 5, 2, 10, 9]),
        L('voicings', 3, 'Shells ii–V–I', 'קונכיות ii–V–I', [v('shells'), v('shells', { option: 1 })], cyc4),
        L(
          'voicings',
          4,
          'Rootless A / B ii–V–I, minor ii–V–i',
          'ללא יסוד A / B, ii–V–I מינורי',
          [v('rootless'), v('rootless', { option: 1 }), v('rootless', { option: 2 })],
          cyc4,
        ),
        L('voicings', 5, 'One-minute changes', 'החלפות בדקה', [v('one-minute'), v('one-minute', { option: 1 }), v('one-minute', { option: 2 })], cyc4),
        L('voicings', 6, 'Blues with shells', 'בלוז בקונכיות', [v('blues-shells')], [5, 10, 0, 3, 7]),
        L('voicings', 7, 'Quartal "So What"', 'קוורטל "So What"', [{ ...v('so-what'), hands: 'RL' }], [2, 7, 0, 9, 4]),
        L('voicings', 8, 'Quartal voicings through the dorian scale', 'קולות קוורטליים דרך הסולם הדורי', [v('quartal'), v('quartal', { option: 1, hands: 'RL' })], [2, 9, 4, 7, 0, 5]),
        L('voicings', 9, 'Two-handed voicings and drop 2', 'קולות בשתי ידיים ודרופ 2', [v('two-hand', { hands: 'RL' }), v('drop2', { hands: 'RL' })], cyc4),
        L('voicings', 10, 'Tritone substitution ii–♭II7–I', 'תחליף טריטון ii–♭II7–I', [v('tritone-sub')], cyc4),
        L('voicings', 11, 'Comping rhythms: Charleston, reverse, anticipations, Red Garland', "מקצבי ליווי: צ'רלסטון, הפוך, הקדמות, רד גרלנד", [0, 1, 2, 3].map((o) => v('comp', { option: o, swing: true })), cyc4),
        L('voicings', 12, 'Coltrane changes with root and guide tones', 'מהלכי קולטריין עם יסוד וצלילים מנחים', [v('coltrane-v')], [0, 5, 10, 3, 7, 2]),
        L('voicings', 13, 'Rootless A / B through the progressions', 'בלי יסוד A / B לאורך המהלכים', [cv('lv:two-five-one', 'rootless-a'), cv('lv:two-five-one', 'rootless-b'), cv('lv:minor-two-five', 'rootless'), cv('lv:turnaround', 'rootless'), cv('lv:tritone-subs', 'rootless'), cv('lv:extensions', 'rootless')], [0, 5, 10, 3]),
        L('voicings', 14, 'Comping rhythms on standards', 'מקצבי ליווי על סטנדרטים', [cv('std:autumn', 'rootless', 'charleston'), cv('std:fly', 'rootless', 'reverse'), cv('std:satin', 'shell', 'garland'), cv('std:blue-bossa', 'rootless', 'anticip'), cv('std:a-train', 'shell', 'four')], [0]),
        L('voicings', 15, 'Drop 2, drop 3 and block chords on standards', 'דרופ 2, דרופ 3 ואקורדי בלוק על סטנדרטים', [cv('std:autumn', 'drop2'), cv('std:attya', 'drop2', 'charleston'), cv('std:fly', 'drop3'), cv('std:satin', 'block'), cv('std:solar', 'drop2', 'reverse')], [0]),
        L('voicings', 16, 'Open, two-handed, quartal and upper structures', 'פתוח, שתי ידיים, קוורטלי ומשולשי מבנה עליון', [cv('lv:two-five-one', 'open'), cv('std:autumn', 'two-hand'), cv('std:so-what', 'quartal'), cv('lv:altered-chain', 'upper'), cv('std:ladybird', 'two-hand', 'charleston'), cv('lv:coltrane', 'open')], [0]),
        L('voicings', 17, 'Left hand comps, right hand improvises', 'יד שמאל מלווה, יד ימין מאלתרת', [cv('lv:two-five-one', 'rootless', 'charleston', 'improv'), cv('lv:blues', 'shell', 'charleston', 'improv'), cv('std:autumn', 'rootless', 'reverse', 'improv'), cv('std:bird-blues', 'rootless', 'charleston', 'improv'), cv('lv:rhythm-changes', 'shell', 'garland', 'improv'), cv('std:giant', 'guide', 'whole', 'improv')], [0]),
      ],
    },
    {
      // PIANO_JAZZ: jazz-piano harmony in two hands — altered dominants, minor ii–V–i, ballads, reharmonising, modal
      // comping and solo-piano left hands.
      id: 'k-reharm',
      title: t('Jazz piano harmony', 'הרמוניה של פסנתר ג׳אז'),
      style: 'jazz',
      levels: [
        JT('k-reharm', 1, 'Altered dominants in ii–V–I', 'דומיננטות אלטרד ב-ii–V–I', [0, 1, 2, 3].map((o) => rh('rh-altered', { option: o })), cyc4, [60, 100]),
        JT('k-reharm', 2, 'Minor ii–V–i in two hands', 'ii–V–i מינורי בשתי ידיים', [rh('rh-minor'), rh('rh-minor', { option: 1 })], [9, 2, 7, 0, 5, 10, 4, 11], [60, 100]),
        JT('k-reharm', 3, 'Ballad voicings', 'קולות בלדה', [rh('rh-ballad'), rh('rh-ballad', { option: 1 })], [0, 5, 10, 3, 7, 2], [50, 72]),
        JT('k-reharm', 4, 'Reharmonising: tritone subs, backdoor, passing diminished, an added ii–V', 'הרמוניה מחודשת: תחליפי טריטון, דלת אחורית, מוקטנים עוברים, ii–V נוסף', [0, 1, 2, 3].map((o) => rh('rh-reharm', { option: o })), [0, 5, 10, 7, 3], [60, 100]),
        JT('k-reharm', 5, 'Modal comping over a pedal', 'ליווי מודאלי מעל פדל', [rh('rh-modal'), rh('rh-modal', { option: 1 })], [2, 7, 0, 9, 4, 5], [70, 120]),
        JT('k-reharm', 6, 'Chains: ii–Vs by whole steps, the family of dominants', 'שרשראות: ii–V בטונים, משפחת הדומיננטות', [rh('rh-chains'), rh('rh-chains', { option: 1 })], [0, 5, 10, 3, 7, 2], [60, 104]),
        JT('k-reharm', 7, 'Solo piano: walking bass, 10ths, two-feel', 'פסנתר סולו: בס מהלך, דצימות, בשניים', [0, 1, 2].map((o) => rh('rh-solo', { option: o, swing: true })), [0, 5, 7, 10, 3], [80, 140]),
        JT('k-reharm', 8, 'Upper structures over a pedal: lydian and sus', 'מבנים עליונים מעל פדל: לידי וסאס', [rh('rh-pedal'), rh('rh-pedal', { option: 1 })], [2, 7, 0, 5, 10, 3], [60, 100]),
      ],
    },
    {
      id: 'jazz',
      title: t('Jazz lines', "קווי ג'אז"),
      style: 'jazz',
      levels: [
        L(
          'jazz',
          1,
          'Guide tones ii–V–I',
          'צלילים מנחים ii–V–I',
          [j('guide-tones'), j('guide-tones', { option: 1 }), j('guide-tones', { hands: 'RL' })],
          cyc4,
        ),
        L('jazz', 2, 'Digital patterns 1-2-3-5', 'תבניות דיגיטליות 1-2-3-5', [j('digital', { swing: true }), j('digital', { option: 1, swing: true })], cyc4),
        L(
          'jazz',
          3,
          'Blues and pentatonic scales',
          'סולמות בלוז ופנטטוני',
          [
            { ...sc({ scale: 'blues' }), family: 'jazz' },
            { ...sc({ scale: 'pentatonic' }), family: 'jazz' },
          ],
          cyc4,
        ),
        L(
          'jazz',
          4,
          'Upper-structure triads',
          'משולשי מבנה עליון',
          [0, 1, 2, 3, 4].map((o) => j('ust', { option: o, hands: 'RL' })),
          cyc4,
        ),
        L(
          'jazz',
          5,
          'Chord scales: dorian, lydian dominant, altered, whole-tone, diminished, bebop, melodic minor',
          'סולמות אקורד: דורי, לידי דומיננטי, אלטרד, טון שלם, מוקטן, ביבופ, מינור מלודי',
          JAZZ_SCALES.map((_, o) => j('jscale', { option: o })),
          cyc4,
        ),
        L('jazz', 6, 'Target notes over forms: blues, minor blues, rhythm changes, a standard', 'צלילי מטרה על צורות: בלוז, בלוז מינורי, ריתם צ׳יינג׳ס, סטנדרט', [0, 1, 2, 3].map((o) => j('form-thirds', { option: o })), [5, 10, 0, 7, 3]),
        L(
          'jazz',
          7,
          'Guide-tone lines and chord-tone arpeggios over forms',
          'קווי צלילים מנחים וארפג׳יו צלילי אקורד על צורות',
          [...[0, 1, 2, 3].map((o) => j('form-guide', { option: o })), ...[0, 2, 3].map((o) => j('form-arp', { option: o, swing: true }))],
          [5, 10, 0, 7, 3],
        ),
        L('jazz', 8, 'Locked hands (Shearing block chords)', 'ידיים נעולות (אקורדי בלוק של שירינג)', [j('locked', { hands: 'RL' }), j('locked', { hands: 'RL', minor: true })], cyc4),
        L('jazz', 9, 'Coltrane changes: digital patterns and arpeggios', 'מהלכי קולטריין: תבניות דיגיטליות וארפג׳יו', [j('coltrane', { swing: true }), j('coltrane', { option: 1, swing: true }), j('digital', { option: 1, swing: true, hands: 'L' })], [0, 5, 10, 3, 7, 2]),
        L('jazz', 10, 'Blues licks and turnarounds', 'ליקים וטרנאראונדים של בלוז', [0, 1, 2].map((o) => j('blues-lick', { option: o, hands: 'RL' })), [5, 10, 0, 7, 3, 2]),
      ],
    },
    {
      // PIANO_JAZZ: bebop lines over forms (chord tones on the beats, approach notes into the changes) and trading fours.
      id: 'k-bebop',
      title: t('Bebop lines', 'קווי ביבופ'),
      style: 'jazz',
      levels: [
        JT('k-bebop', 1, 'Bebop lines over ii–V–I', 'קווי ביבופ על ii–V–I', [0, 1, 2].map((o) => bb('bb-251', { option: o })), cyc4, [80, 140]),
        JT('k-bebop', 2, 'Minor ii–V–i lines', 'קווים על ii–V–i מינורי', [bb('bb-minor'), bb('bb-minor', { option: 1 })], [9, 2, 7, 0, 5, 10, 4, 11], [80, 140]),
        JT('k-bebop', 3, 'Altered dominant lines', 'קווים על דומיננט אלטרד', [bb('bb-alt'), bb('bb-alt', { option: 1 })], cyc4, [80, 140]),
        JT('k-bebop', 4, 'Lines over the jazz blues', 'קווים על בלוז ג׳אז', [0, 1, 2].map((o) => bb('bb-blues', { option: o })), [5, 10, 0, 7, 3, 8], [90, 160]),
        JT('k-bebop', 5, 'Lines over rhythm changes', 'קווים על ריתם צ׳יינג׳ס', [bb('bb-rhythm'), bb('bb-rhythm', { option: 1 })], [10, 3, 8, 1, 0, 5], [100, 180]),
        JT('k-bebop', 6, 'Lines over standards, major and minor', 'קווים על סטנדרטים, מז׳ור ומינור', [bb('bb-standard'), bb('bb-standard', { option: 1 })], [0, 5, 10, 7], [90, 160]),
        JT('k-bebop', 7, 'Both hands: shells and a line', 'שתי ידיים: קונכיות וקו', [bb('bb-hands', { hands: 'RL' }), bb('bb-hands', { option: 1, hands: 'RL' })], cyc4, [70, 120]),
        JT('k-bebop', 8, 'Trading fours with the band', 'חילופי ארבע עם הלהקה', [0, 1, 2].map((o) => bb('bb-trade', { option: o })), [0, 5, 10, 7], [90, 140]),
        JT('k-bebop', 9, 'Lines over whole forms: rhythm changes AABA, the bridge, the minor blues', 'קווים על צורות שלמות: כל ריתם צ׳יינג׳ס, הגשר, הבלוז המינורי', [0, 1, 2].map((o) => bb('bb-form', { option: o })), [10, 3, 8, 0, 5], [90, 170]),
        JT('k-bebop', 10, 'The Coltrane matrix: lines through keys a major 3rd apart', 'מטריצת קולטריין: קווים בסולמות במרחק טרצה גדולה', [bb('bb-matrix'), bb('bb-matrix', { option: 1 })], [0, 5, 10, 3, 7, 2], [70, 140]),
      ],
    },
    {
      id: 'accomp',
      title: t('Accompaniment', 'ליווי'),
      style: 'jazz',
      levels: [
        L('accomp', 1, 'Alberti bass', 'בס אלברטי', [m('alberti')], [0, 7, 5]),
        L('accomp', 2, 'Walking bass: roots + approach', 'בס מהלך: יסודות + גישה', [m('walking'), m('walking', { option: 1 })], [5, 10, 0, 7, 3]),
        L('accomp', 3, 'Stride: single bass and octaves', 'סטרייד: בס בודד ואוקטבות', [m('stride'), m('stride', { option: 1 })], [0, 5, 7, 10, 3]),
        L(
          'accomp',
          4,
          'Stride with 10ths, walking scale lines',
          'סטרייד בדצימות, הליכה בסולם',
          [m('stride', { option: 2 }), m('walking', { option: 2 })],
          [0, 5, 7, 10, 3],
        ),
        L('accomp', 5, 'Boogie-woogie left hand', 'בוגי-ווגי ביד שמאל', [0, 1, 2].map((o) => m('boogie', { option: o, swing: true })), [0, 5, 7, 10, 3, 9]),
        L('accomp', 6, 'Latin: bossa nova and montuno', 'לטיני: בוסה נובה ומונטונו', [m('bossa', { hands: 'RL' }), m('montuno', { hands: 'RL' })], [0, 5, 7, 2, 10, 9]),
        L('accomp', 7, 'Pop left-hand patterns', 'תבניות פופ ליד שמאל', [m('pop-lh'), m('pop-lh', { option: 1 })], [0, 7, 5, 2, 9, 4]),
        L('accomp', 8, 'Walking bass through changes: ii–V–I and rhythm changes', 'בס מהלך דרך מהלכים: ii–V–I וריתם צ׳יינג׳ס', [m('walk-changes'), m('walk-changes', { option: 1 })], [0, 5, 10, 3, 7]),
        L('accomp', 9, 'Stride and walking bass in more keys', 'סטרייד ובס מהלך בעוד סולמות', [m('stride', { option: 1 }), m('stride', { option: 2 }), m('walking', { option: 1 })], [2, 9, 4, 8, 1, 6, 11]),
        L('accomp', 10, 'Alberti, pop, boogie and Latin left hands in more keys', 'אלברטי, פופ, בוגי ולטיני ביד שמאל בעוד סולמות', [
          m('alberti'),
          m('pop-lh'),
          m('pop-lh', { option: 1 }),
          m('boogie', { option: 1, swing: true }),
          m('bossa', { hands: 'RL' }),
        ], [2, 9, 4, 10, 3, 8, 1, 11]),
        L('accomp', 11, 'Stride: tenths', 'סטרייד: דצימות', [st('tpl:fifties', 'stride-tenth'), st('lv:turnaround', 'stride-tenth')], [0, 7, 5, 2]),
        L('accomp', 12, 'Stride: broken tenths', 'סטרייד: דצימות שבורות', [st('tpl:fifties', 'stride-broken'), st('lv:turnaround', 'stride-broken')], [0, 7, 5, 10]),
        L('accomp', 13, 'Stride: the bass walks to the next chord', 'סטרייד: הבס הולך לאקורד הבא', [st('lv:blues', 'stride-walk'), st('lv:turnaround', 'stride-walk')], [0, 5, 10]),
        L('accomp', 14, 'Stride through the blues and rhythm changes', 'סטרייד בבלוז ובריתם צ׳יינג׳ס', [st('lv:blues', 'stride-octave'), st('lv:rhythm-changes', 'stride-single'), st('std:rhythm-bridge', 'stride-tenth')], [0, 5]),
        L('accomp', 15, 'Stride on standards', 'סטרייד על סטנדרטים', [st('std:a-train', 'stride-tenth'), st('std:satin', 'stride-octave'), st('std:fly', 'stride-broken'), st('std:attya', 'stride-tenth')], [0]),
        L('accomp', 16, 'Stride with the right hand free', 'סטרייד עם יד ימין חופשית', [st('lv:blues', 'stride-tenth', 'improv'), st('std:a-train', 'stride-octave', 'improv'), st('lv:turnaround', 'stride-walk', 'improv')], [0]),
        // PIANO_AUDIT P2: stride standards want ♩ 140 and up — the level's own target tempo (was start × 1.25).
        { ...L('accomp', 17, 'Stride in all keys, up to tempo', 'סטרייד בכל הסולמות, עד הטמפו', [st('lv:two-five-one', 'stride-tenth'), st('lv:turnaround', 'stride-broken')], [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]), tempo: [80, 140] as [number, number] },
        // PIANO_JAZZ P2: stride with a written RH melody (guide tones on 1 and 3) — measured, where accomp 16 leaves the RH free.
        L('accomp', 18, 'Stride with a right-hand melody', 'סטרייד עם מנגינה ביד ימין', [0, 1, 2].map((o) => m('stride-melody', { option: o, hands: 'RL', swing: true })), [0, 5, 7]),
      ],
    },
    {
      id: 'k-ear',
      title: t("Pianist's ear", 'אוזן של פסנתרן'),
      style: 'both',
      levels: [
        E(1, 'One note in the key', 'צליל אחד בסולם', [ke('echo-note')], [0, 7, 5, 2, 9]),
        E(2, 'Three notes, by step and with skips', 'שלושה צלילים, בצעדים ובדילוגים', [ke('echo-motif'), ke('echo-motif', 1)], [0, 7, 5, 2, 9]),
        E(3, 'Intervals up, down and together', 'מרווחים למעלה, למטה ויחד', [ke('intervals'), ke('intervals', 1), ke('intervals', 2)], [0, 5, 7]),
        E(4, 'A two-bar melody', 'מנגינה של שתי תיבות', [ke('echo-melody'), ke('echo-melody', 1)], [0, 7, 5, 2, 10]),
        E(5, 'The bass line of four chords', 'קו הבס של ארבעה אקורדים', [{ ...ke('bass-line'), hands: 'L' }, { ...ke('bass-line', 1), hands: 'L' }], [0, 7, 5, 2, 9]),
        E(6, 'A progression by ear', 'מהלך אקורדים בשמיעה', [ke('chords'), ke('chords', 1)], [0, 7, 5, 2, 10]),
        E(7, 'Harmonise a melody with I, IV, V', 'הרמון מנגינה ב-I, IV, V', [{ ...ke('harmonise'), hands: 'RL' }], [0, 7, 5, 2, 10, 9]),
        E(8, 'Transpose a melody', 'טרנספוזיציה של מנגינה', [ke('transpose'), ke('transpose', 1)], [0, 7, 5, 2, 10, 3]),
        // PIANO_AUDIT P3: two-part playback — a melody over a bass, both hands.
        E(9, 'Two parts: melody and bass', 'שני קולות: מנגינה ובס', [{ ...ke('two-part'), hands: 'RL' }, { ...ke('two-part', 1), hands: 'RL' }], [0, 7, 5, 2, 10]),
      ],
    },
  ];
}
