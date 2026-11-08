// Technique drills (spec AI §4–§5): DrillSpec → Drill (the notes to play and how they are judged).
// Pure and deterministic. Fingerings: research §1.1 (help only, never graded; omitted where unsure).

import { generateGuitar } from './guitar';
import { chartKind, type ChartMode, type ChartVoicing, type CompRhythm } from './chartDrills';
import { chartDrillData } from './chartDrills';
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

function fingRowFor(type: ScaleType, key: number): FingRow | null {
  const k = mod(key, 12);
  if (type === 'major') return MAJOR_FINGERING[k];
  if (type === 'harmonic') return MINOR_FINGERING[k];
  // Melodic / natural minor: only the white-key minors are certain (same as harmonic); others omitted.
  if ((type === 'melodic' || type === 'natural') && [9, 4, 2, 7, 0].includes(k)) return WHITE;
  return null;
}

/** Finger for scale index k of one hand's run (kLo / kHi = lowest / highest index the hand plays). */
function scaleFinger(row: FingRow, hand: Hand, k: number, kLo: number, kHi: number): number {
  const f = hand === 'R' ? row.r : row.l;
  const d = mod(k, 7);
  if (d !== 0) return f[d];
  if (k === kLo) return f[0];
  if (k === kHi) return f[7];
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
    startBpm,
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
  const row = type === 'chromatic' ? null : fingRowFor(type, s.key);
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
      else if (row && seven) {
        const [lo, hi] = ranges[h];
        // Endpoints that are not tonics take the cycle finger (scales a 3rd / 6th apart).
        finger = scaleFinger(row, h, k, mod(lo, 7) === 0 ? lo : Number.NaN, mod(hi, 7) === 0 ? hi : Number.NaN);
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

function genCadence(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const prog = cadenceProg(s.kind, !!s.minor);
  const pos = Math.min(2, Math.max(0, s.option ?? 0));
  let prev: number[] | null = null;
  const evs: ChordEv[] = prog.map((c, i) => {
    const pcs = c.rh.map((p) => p + key);
    const v = prev ? voiceNear(pcs, prev, 57, 81) : voiceNear(pcs, null, 57, 81, prog[0].rh[pos] + key, 72);
    prev = v;
    const bassP = pitchIn(c.bass + key, 41);
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
  const lhChord = (pcs: number[], b: number, d: number) => {
    const v: number[] = prevL ? voiceNear(pcs.map((p) => p + key), prevL, 43, 60) : voiceNear(pcs.map((p) => p + key), null, 43, 60, undefined, 52);
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
      lhChord(ch, bar * 4, 2);
      lhChord(ch, bar * 4 + 2, 2);
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
export function generate(spec: DrillSpec): Drill {
  if (spec.family.startsWith('g-')) return generateGuitar(spec);
  const s: DrillSpec = { ...spec, key: mod(spec.key, 12) };
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
}
export interface FamilyDef {
  id: FamilyId;
  title: T2;
  style: 'classical' | 'jazz';
  levels: LevelDef[];
}

/** Families → ordered levels → spec templates (spec §4–§5). */
export function catalog(): FamilyDef[] {
  const L = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'] = 'major'): LevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: t(en, he),
    specs,
    keys,
  });
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
        ),
        L('scales', 7, 'Chromatic', 'כרומטי', [
          ...HS({ scale: 'chromatic', octaves: 2 }),
          sc({
            hands: 'RL',
            scale: 'chromatic',
            octaves: 2,
            motion: 'contrary',
          }),
        ]),
        L('scales', 8, 'A 3rd, 6th and 10th apart', 'בהפרש טרצה, סקסטה ודצימה', [
          sc({ hands: 'RL', motion: 'third' }),
          sc({ hands: 'RL', motion: 'sixth' }),
          sc({ hands: 'RL', motion: 'tenth' }),
        ]),
        L('scales', 9, 'Formula pattern', 'תבנית פורמולה', [sc({ hands: 'RL', motion: 'formula', octaves: 2 })]),
        L('scales', 10, '4 octaves in 16ths', '4 אוקטבות בשש-עשריות', [
          sc({ hands: 'RL', octaves: 4, perBeat: 4 }),
          sc({
            hands: 'RL',
            octaves: 4,
            perBeat: 4,
            minor: true,
            scale: 'harmonic',
          }),
        ]),
        L('scales', 11, 'Rhythm variants', 'וריאציות קצב', [
          sc({ hands: 'RL', variant: 'dotted' }),
          sc({ hands: 'RL', variant: 'rev-dotted' }),
          sc({ hands: 'RL', variant: 'groups3', perBeat: 3 }),
          sc({ hands: 'RL', variant: 'accent-shift', perBeat: 4 }),
        ]),
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
        ),
        L('scales', 14, 'Chromatic a minor 3rd and a major 6th apart; 3 octaves', 'כרומטי בהפרש טרצה קטנה וסקסטה גדולה; 3 אוקטבות', [
          sc({ hands: 'RL', scale: 'chromatic', motion: 'third' }),
          sc({ hands: 'RL', scale: 'chromatic', motion: 'sixth' }),
          sc({ hands: 'RL', octaves: 3 }),
          sc({ hands: 'RL', octaves: 3, minor: true, scale: 'harmonic' }),
          sc({ hands: 'RL', octaves: 3, scale: 'chromatic' }),
        ]),
        L('scales', 15, 'Melodic and natural minor, each hand', 'מינור מלודי וטבעי, כל יד', [...HS({ minor: true, scale: 'melodic', octaves: 2 }), ...HS({ minor: true, scale: 'natural', octaves: 2 })], 'minor'),
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
        ]),
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
        ]),
        L(
          'arpeggios',
          11,
          'Diminished 7th from every note',
          'ספטאקורד מוקטן מכל צליל',
          [ar({ kind: 'arp-dim7', option: 1 }), ar({ kind: 'arp-dim7', option: 2 }), ar({ kind: 'arp-dim7', option: 3 }), ar({ kind: 'arp-dim7', hands: 'L' })],
          'minor',
        ),
        L('arpeggios', 12, '3 octaves hands together; jazz 7ths hands together', '3 אוקטבות בידיים יחד; ספטאקורדי ג׳אז בידיים יחד', [
          ar({ hands: 'RL', octaves: 3 }),
          ar({ hands: 'RL', octaves: 3, minor: true }),
          ar({ kind: 'arp-maj7', hands: 'RL' }),
          ar({ kind: 'arp-m7', hands: 'RL' }),
          ar({ kind: 'arp-hd7', hands: 'RL' }),
        ]),
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
        ]),
        L('fingers', 7, 'Hanon Part II 39–43 (scales and arpeggios)', 'האנון חלק ב׳ 39–43 (סולמות וארפג׳יו)', [
          sc({ hands: 'RL', perBeat: 4 }),
          sc({ hands: 'RL', perBeat: 4, scale: 'chromatic' }),
          ar({ hands: 'RL', perBeat: 4 }),
          ar({ kind: 'arp-dim7', hands: 'RL', perBeat: 4 }),
          ar({ kind: 'arp-dom7', hands: 'RL', perBeat: 4 }),
        ]),
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
        ]),
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
        L('voicings', 16, 'Open, two-handed, quartal and upper structures', 'פתוח, שתי ידיים, קוורטלי ו־Upper structure', [cv('lv:two-five-one', 'open'), cv('std:autumn', 'two-hand'), cv('std:so-what', 'quartal'), cv('lv:altered-chain', 'upper'), cv('std:ladybird', 'two-hand', 'charleston'), cv('lv:coltrane', 'open')], [0]),
        L('voicings', 17, 'Left hand comps, right hand improvises', 'יד שמאל מלווה, יד ימין מאלתרת', [cv('lv:two-five-one', 'rootless', 'charleston', 'improv'), cv('lv:blues', 'shell', 'charleston', 'improv'), cv('std:autumn', 'rootless', 'reverse', 'improv'), cv('std:bird-blues', 'rootless', 'charleston', 'improv'), cv('lv:rhythm-changes', 'shell', 'garland', 'improv'), cv('std:giant', 'guide', 'whole', 'improv')], [0]),
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
        L('accomp', 11, 'Stride: tenths', 'סטרייד: דסימות', [st('tpl:fifties', 'stride-tenth'), st('lv:turnaround', 'stride-tenth')], [0, 7, 5, 2]),
        L('accomp', 12, 'Stride: broken tenths', 'סטרייד: דסימות שבורות', [st('tpl:fifties', 'stride-broken'), st('lv:turnaround', 'stride-broken')], [0, 7, 5, 10]),
        L('accomp', 13, 'Stride: the bass walks to the next chord', 'סטרייד: הבס הולך לאקורד הבא', [st('lv:blues', 'stride-walk'), st('lv:turnaround', 'stride-walk')], [0, 5, 10]),
        L('accomp', 14, 'Stride through the blues and rhythm changes', 'סטרייד בבלוז ובריתם צ׳יינג׳ס', [st('lv:blues', 'stride-octave'), st('lv:rhythm-changes', 'stride-single'), st('std:rhythm-bridge', 'stride-tenth')], [0, 5]),
        L('accomp', 15, 'Stride on standards', 'סטרייד על סטנדרטים', [st('std:a-train', 'stride-tenth'), st('std:satin', 'stride-octave'), st('std:fly', 'stride-broken'), st('std:attya', 'stride-tenth')], [0]),
        L('accomp', 16, 'Stride with the right hand free', 'סטרייד עם יד ימין חופשית', [st('lv:blues', 'stride-tenth', 'improv'), st('std:a-train', 'stride-octave', 'improv'), st('lv:turnaround', 'stride-walk', 'improv')], [0]),
        L('accomp', 17, 'Stride in all keys, up to tempo', 'סטרייד בכל הסולמות, עד הטמפו', [st('lv:two-five-one', 'stride-tenth'), st('lv:turnaround', 'stride-broken')], [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]),
      ],
    },
  ];
}
