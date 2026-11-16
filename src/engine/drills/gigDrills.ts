// On the bandstand (docs/AUDIT-DEPTH-3.md §1 #11, #12 and C8): the keys family k-gig, the guitar family g-gig (the jazz
// add-on) and the bass family b-gig (the jazz track). Standard jazz practice only; nothing here is credited to a teacher.
//
//   · #12 Intros and endings, beyond k-ctx 11–12 (the I–vi–ii–V vamp, the last four bars, the Basie ending,
//     ♭VI7–♭II7–I and the comped tag there): the iii–VI7–ii–V7 vamp, a blues's last four bars, a rubato ballad intro;
//     the tag ×3 as a line, ♭VImaj7–♭IImaj7–Imaj7, ♭VI7–♭II7–I as a line, the Dameron turnaround (Imaj7–♭IIImaj7–
//     ♭VImaj7–♭IImaj7) comped and as a line, the diminished walk-down ending (iii7–♭iii°7–ii7–V7–I). Guitar: drop 2 and
//     lines; bass: walked. The ear topic intro-ending (topicsGig.ts) names them.
//   · #11 A ballad ladder (~1350–1500) on "Evening Lamp", our own 16-bar ballad changes in the idiom (two chords a bar;
//     a chart only, no melody): LH 10ths → RH four-note rootless voicings over the root → both hands → the whole chart,
//     straight 8ths, slow. Guitar: drop 2 on strings 5-4-3-2; bass: the two-feel.
//   · C8 The whole tune: intro (the tune's last four bars) → the head (melody + shells, k-tune's material) → one solo
//     chorus (free bars graded by rule cards, analyze.ts goal.free / goal.improv) → the head out → an ending (the Basie
//     ending in major, the iiø–V tag ×3 in minor). Each section is graded by its own checker; goal.sections names the
//     section that slipped. Built on the app's original heads (src/content/heads.ts): Back Porch Blues and Night Ferry.
//     Guitar: drop-2 intro / ending, chord-melody head (bass on the downbeats), free chorus. Bass: walked intro, head in
//     two, a walking chorus behind the soloist, head out in two, the ending.
// Every item runs in all 12 keys (the key is the item's spec key). New written items start in free time (rubato.ts),
// then the tempo ladder; items with the band and drums (the solo chorus, the whole tune) stay timed.
//
// NOTE: guitar.ts, bass.ts and generate.ts import this module and it imports theirs: nothing here may call their
// exports at module top level (only inside functions).

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId, BassFamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { bebopLine, itemIdOf } from './generate';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle, Ev, GN } from './guitar';
import { drop2Voicings, finish as gFinish, nearestVoicing, place } from './guitar';
import { drillOf, alt, type BN } from './bass';
import { voice } from './chartDrills';
import type { ChartChordEv } from '../charts';
import { VQ_DEF, chartOf, nearestPc, mod12, type VChord, type VQ, type VN } from '../bebopVocab';
import { HEADS, type Head } from '../../content/heads';
import { headIn, type HeadIn } from '../heads';
import { chartFor, chordMelodyEvs, genHeadPiano } from './headDrills';
import { parseChart } from '../charts';
import { modelLine } from './soloDrills';
import { generateGuitarEar } from './guitarEar';
import { generateBassEar } from './bassEar';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
/** Round the cycle of 4ths (absolute tonics). */
export const GIG_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

// ───────────────────────────── chords ─────────────────────────────

/** Chord intervals above the root for each quality (7♭9 carries its ♭9). */
export const GIG_IV: Record<VQ, number[]> = {
  maj7: [0, 4, 7, 11],
  '6': [0, 4, 7, 9],
  m7: [0, 3, 7, 10],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  '7b9': [0, 4, 7, 10, 13],
  alt: [0, 4, 10, 13, 15, 20],
  hd7: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
};
type D = [number, VQ, number];
const prog = (key: number, ds: D[]): VChord[] => ds.map(([d, q, beats]) => ({ r: mod12(key + d), q, beats }));
const twice = (ds: D[]): D[] => [...ds, ...ds];

// Intros (degrees above the key, beats).
/** iii–VI7–ii–V7 twice, then I: the turnaround as a vamp intro. */
export const TURN_INTRO: D[] = [...twice([[4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]]), [0, 'maj7', 4]];
/** A jazz blues's last four bars (ii | V | I VI7 | ii V), then the I7 of bar 1. */
export const BLUES_LAST4: D[] = [[2, 'm7', 4], [7, '7', 4], [0, '7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, '7', 4]];
/** The rubato ballad intro: ii7 – V7♭9 held – Imaj7 (two hands, free time). */
export const BALLAD_INTRO: D[] = [[2, 'm7', 4], [7, '7b9', 4], [0, 'maj7', 8]];
// Endings.
/** iii–VI7–ii–V7 three times before the last I (the tag). */
export const TAG3: D[] = [...twice([[4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]]), [4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]];
/** ii–V, then ♭VImaj7–♭IImaj7 sliding down into Imaj7. */
export const B6B2_MAJ: D[] = [[2, 'm7', 4], [7, '7', 4], [8, 'maj7', 2], [1, 'maj7', 2], [0, 'maj7', 4]];
/** ii–V, then ♭VI7–♭II7–Imaj7. */
export const B6B2_DOM: D[] = [[2, 'm7', 4], [7, '7', 4], [8, '7', 2], [1, '7', 2], [0, 'maj7', 4]];
/** The Dameron turnaround (Imaj7–♭IIImaj7–♭VImaj7–♭IImaj7) twice, then I. */
export const DAMERON: D[] = [...twice([[0, 'maj7', 2], [3, 'maj7', 2], [8, 'maj7', 2], [1, 'maj7', 2]]), [0, 'maj7', 4]];
/** The diminished walk-down ending: iii7–♭iii°7–ii7–V7–Imaj7, a bar each. */
export const WALKDOWN: D[] = [[4, 'm7', 4], [3, 'dim7', 4], [2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4]];

/**
 * "Evening Lamp": our own 16-bar ballad changes in the idiom (two chords a bar; a chart only, no melody). A: I vi |
 * ii V | iii VI7♭9 | ii V | IV iv7 | iii ♭iii° | ii V | I6. B: v I7 | IV | iv7 ♭VII7 | iii VI7♭9 | viiø III7♭9 |
 * vi II7 | ii V | I6.
 */
export const BALLAD_CHART: D[] = [
  [0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, '7', 2], [4, 'm7', 2], [9, '7b9', 2], [2, 'm7', 2], [7, '7', 2],
  [5, 'maj7', 2], [5, 'm7', 2], [4, 'm7', 2], [3, 'dim7', 2], [2, 'm7', 2], [7, '7', 2], [0, '6', 4],
  [7, 'm7', 2], [0, '7', 2], [5, 'maj7', 4], [5, 'm7', 2], [10, '7', 2], [4, 'm7', 2], [9, '7b9', 2],
  [11, 'hd7', 2], [4, '7b9', 2], [9, 'm7', 2], [2, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, '6', 4],
];
/** Bars a–b (0-based, b exclusive) of a progression. */
function barsOfProg(ds: D[], a: number, b: number): D[] {
  const out: D[] = [];
  let at = 0;
  for (const x of ds) {
    if (at >= a * 4 - 1e-6 && at < b * 4 - 1e-6) out.push(x);
    at += x[2];
  }
  return out;
}
export const BALLAD_PART = (part: number): D[] => (part === 0 ? barsOfProg(BALLAD_CHART, 0, 8) : part === 1 ? barsOfProg(BALLAD_CHART, 8, 16) : BALLAD_CHART);

// ───────────────────────────── the items ─────────────────────────────

type What = 'comp' | 'line' | 'guide' | 'walk' | 'two' | 'tenths' | 'rh' | 'both';
export interface GigItem {
  chords: VChord[];
  what: What;
  name: T2;
  /** Always in free time (the rubato ballad intro). */
  rubato?: boolean;
}
export const GIG_KINDS = ['gg-intro', 'gg-end', 'gg-b10', 'gg-brh', 'gg-b2h', 'gg-walk', 'gg-two', 'gg-tune'];
const PART_NAME: T2[] = [t('A, bars 1–8', 'A, תיבות 1–8'), t('B, bars 9–16', 'B, תיבות 9–16'), t('the whole chart', 'כל הלידשיט')];

/** A progression item of the intros / endings / ballad kinds. */
export function gigItem(kind: string, key: number, op: number): GigItem {
  const P = (ds: D[]) => prog(key, ds);
  switch (kind) {
    case 'gg-intro':
      if (op % 4 === 1) return { chords: P(TURN_INTRO), what: 'line', name: t('Intro: the iii–VI7–ii–V7 vamp, line', 'פתיחה: ואמפ iii–VI7–ii–V7, קו') };
      if (op % 4 === 2) return { chords: P(BLUES_LAST4), what: 'comp', name: t('Intro: a blues’s last four bars, comping', 'פתיחה: ארבע התיבות האחרונות של בלוז, ליווי') };
      if (op % 4 === 3) return { chords: P(BALLAD_INTRO), what: 'both', rubato: true, name: t('Rubato ballad intro: ii–V–I in free time', 'פתיחת בלדה ברובאטו: ii–V–I בזמן חופשי') };
      return { chords: P(TURN_INTRO), what: 'comp', name: t('Intro: the iii–VI7–ii–V7 vamp, comping', 'פתיחה: ואמפ iii–VI7–ii–V7, ליווי') };
    case 'gg-end':
      switch (op % 6) {
        case 1:
          return { chords: P(B6B2_MAJ), what: 'comp', name: t('Ending: ♭VImaj7–♭IImaj7–Imaj7, comping', 'סיום: ♭VImaj7–♭IImaj7–Imaj7, ליווי') };
        case 2:
          return { chords: P(B6B2_DOM), what: 'line', name: t('Ending: ♭VI7–♭II7–Imaj7, line', 'סיום: ♭VI7–♭II7–Imaj7, קו') };
        case 3:
          return { chords: P(DAMERON), what: 'comp', name: t('The Dameron turnaround: comping', 'הטרנאראונד של דיימרון: ליווי') };
        case 4:
          return { chords: P(DAMERON), what: 'line', name: t('The Dameron turnaround: line', 'הטרנאראונד של דיימרון: קו') };
        case 5:
          return { chords: P(WALKDOWN), what: 'comp', name: t('Ending: the diminished walk-down iii7–♭iii°7–ii7–V7–I', 'סיום: הירידה הדימינישית iii7–♭iii°7–ii7–V7–I') };
        default:
          return { chords: P(TAG3), what: 'line', name: t('Tag ending ×3: a line over iii–VI7–ii–V7', 'סיום תג ×3: קו על iii–VI7–ii–V7') };
      }
    case 'gg-b10':
      return { chords: P(BALLAD_PART(op % 3)), what: 'tenths', name: t(`Ballad “Evening Lamp”, ${PART_NAME[op % 3].en}: LH 10ths`, `בלדה ״מנורת ערב״, ${PART_NAME[op % 3].he}: דצימות ביד שמאל`) };
    case 'gg-brh':
      return { chords: P(BALLAD_PART(op % 3)), what: 'rh', name: t(`Ballad “Evening Lamp”, ${PART_NAME[op % 3].en}: RH four-note voicings over the root`, `בלדה ״מנורת ערב״, ${PART_NAME[op % 3].he}: ארבעה צלילים בימין מעל היסוד`) };
    case 'gg-b2h':
      return { chords: P(BALLAD_PART(op % 3)), what: 'both', name: t(`Ballad “Evening Lamp”, ${PART_NAME[op % 3].en}: LH 10ths, RH four notes`, `בלדה ״מנורת ערב״, ${PART_NAME[op % 3].he}: דצימות בשמאל, ארבעה צלילים בימין`) };
    case 'gg-two':
      return { chords: P(BALLAD_PART(op % 3)), what: 'two', name: t(`Ballad “Evening Lamp”, ${PART_NAME[op % 3].en}: in two`, `בלדה ״מנורת ערב״, ${PART_NAME[op % 3].he}: בשתיים`) };
    case 'gg-walk':
    default: {
      const W: [D[], T2][] = [
        [TURN_INTRO, t('Walking intro: the iii–VI7–ii–V7 vamp', 'פתיחה בהליכה: ואמפ iii–VI7–ii–V7')],
        [BLUES_LAST4, t('Walking intro: a blues’s last four bars', 'פתיחה בהליכה: ארבע התיבות האחרונות של בלוז')],
        [TAG3, t('Walking the tag ending ×3', 'הליכה בסיום התג ×3')],
        [B6B2_DOM, t('Walking the ending ♭VI7–♭II7–I', 'הליכה בסיום ♭VI7–♭II7–I')],
        [DAMERON, t('Walking the Dameron turnaround', 'הליכה בטרנאראונד של דיימרון')],
        [WALKDOWN, t('Walking the diminished walk-down ending', 'הליכה בסיום הירידה הדימינישית')],
        [B6B2_MAJ, t('Walking the ending ♭VImaj7–♭IImaj7–I', 'הליכה בסיום ♭VImaj7–♭IImaj7–I')],
      ];
      const [ds, name] = W[op % W.length];
      return { chords: P(ds), what: 'walk', name };
    }
  }
}

const isComp = (w: What): boolean => w === 'comp' || w === 'tenths' || w === 'rh' || w === 'both';
const scalePcs = (c: VChord): number[] => [...new Set([...VQ_DEF[c.q].sc, ...VQ_DEF[c.q].ct, ...GIG_IV[c.q]].map((x) => mod12(c.r + x)))];
const evOf = (c: VChord): ChartChordEv => ({ root: c.r, iv: GIG_IV[c.q], bass: c.r, sym: '', beats: c.beats, bar: 0, at: 0 });
const keyLabel = (key: number, minor?: boolean): string => (minor ? `${MINOR_NAMES[mod12(key)]}m` : NAMES[mod12(key)]);
const withKey = (n: T2, key: number, minor?: boolean): T2 => t(`${n.en} · ${keyLabel(key, minor)}`, `${n.he} · ${keyLabel(key, minor)}`);

/** A walking line (root on each chord, chord tones between, a half step into the next root), as ctxDrills.walkLine. */
export function walkOf(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let prev = nearestPc(chords[0].r, lo + 8, lo, hi);
  let beat = 0;
  chords.forEach((c, ci) => {
    const root = nearestPc(c.r, prev, lo + 1, hi - 1);
    if (ci === chords.length - 1) {
      out.push({ p: root, beat, dur: c.beats, ct: true });
      return;
    }
    const ct = VQ_DEF[c.q].ct;
    out.push({ p: root, beat, dur: 1, ct: true });
    let cur = root;
    for (let b = 1; b < c.beats - 1; b++) {
      const x = ct[Math.min(b, 2)];
      cur = root + x <= hi - 2 ? root + x : root + x - 12;
      out.push({ p: cur, beat: beat + b, dur: 1, ct: true });
    }
    const next = nearestPc(chords[ci + 1].r, cur, lo + 1, hi - 1);
    const app = next > cur ? next - 1 : next + 1;
    out.push({ p: app === cur ? (next > cur ? next + 1 : next - 1) : app, beat: beat + c.beats - 1, dur: 1, ct: false });
    prev = next;
    beat += c.beats;
  });
  return out;
}

/** The two-feel: the root on each chord, its 5th on beat 3 of a whole-bar chord (half notes). */
export function twoFeelOf(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let prev = nearestPc(chords[0].r, lo + 8, lo, hi);
  let beat = 0;
  chords.forEach((c, ci) => {
    const root = nearestPc(c.r, prev, lo + 1, hi - 1);
    const last = ci === chords.length - 1;
    if (c.beats >= 4 && !last) {
      out.push({ p: root, beat, dur: 2, ct: true });
      const fifth = VQ_DEF[c.q].ct[2];
      const f = root + fifth <= hi ? root + fifth : root + fifth - 12;
      out.push({ p: f, beat: beat + 2, dur: c.beats - 2, ct: true });
    } else out.push({ p: root, beat, dur: c.beats, ct: true });
    prev = root;
    beat += c.beats;
  });
  return out;
}

/** The line of a line item in a register. */
export function gigLine(it: GigItem, lo: number, hi: number, seed: string): VN[] {
  if (it.what === 'walk') return walkOf(it.chords, lo, hi);
  if (it.what === 'two') return twoFeelOf(it.chords, lo, hi);
  const raw = bebopLine(it.chords.map((c) => ({ r: c.r, q: c.q, beats: c.beats })), seed, { lo: lo + 1, hi: hi - 1, start: Math.round(lo + (hi - lo) * 0.7) });
  return raw.map((n) => ({ p: n.p, beat: n.beat, dur: n.dur, ct: !!n.ct }));
}

// ───────────────────────────── piano voicings ─────────────────────────────

export interface PHit {
  beat: number;
  dur: number;
  lh: number[];
  rh: number[];
  c: VChord;
}
/** The LH 10th: the root in C2–B2 and its 3rd an octave up. */
export const tenthOf = (c: VChord): number[] => {
  const root = 36 + mod12(c.r - 36);
  return [root, root + 12 + VQ_DEF[c.q].ct[1]];
};
/** The RH four-note rootless voicing (A or B form, any octave): above `floor` and E♭4, at most C6, the nearest to the last. */
function rhFour(c: VChord, prev: number[] | null, floor: number): number[] {
  const ev = evOf(c);
  const shapes = (['rootless-a', 'rootless-b'] as const).map((v) => voice(ev, v, null).lh.slice(0, 4));
  // Above every 10th's top (E♭4 at most), so the right hand keeps one register while the left hand moves.
  const lo = Math.max(floor, 63);
  const cands: number[][] = [];
  for (const sh of shapes) for (let k = -3; k <= 4; k++) {
    const x = sh.map((m) => m + 12 * k);
    if (Math.min(...x) > lo && Math.max(...x) <= 84) cands.push(x);
  }
  if (!cands.length) return shapes[0].map((m) => m + 12 * Math.ceil((lo + 1 - Math.min(...shapes[0])) / 12));
  const ref = prev ?? [62, 65, 69, 72];
  const cost = (x: number[]) => x.reduce((a, m, i) => a + Math.abs(m - ref[Math.min(i, ref.length - 1)]), 0);
  return cands.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}
/** Piano hits for a comping item: LH rootless; ballad LH 10ths / root, RH four notes. */
export function pianoHits(it: GigItem): PHit[] {
  const out: PHit[] = [];
  let beat = 0;
  let prevL: number[] | null = null;
  let prevR: number[] | null = null;
  for (const c of it.chords) {
    let lh: number[];
    let rh: number[] = [];
    if (it.what === 'comp') lh = voice(evOf(c), 'rootless', prevL ? { lh: prevL, rh: [] } : null).lh;
    else {
      const ten = tenthOf(c);
      lh = it.what === 'rh' ? [ten[0]] : ten;
      if (it.what !== 'tenths') rh = rhFour(c, prevR, Math.max(...lh));
    }
    out.push({ beat, dur: c.beats, lh, rh, c });
    prevL = lh;
    if (rh.length) prevR = rh;
    beat += c.beats;
  }
  return out;
}

interface Built {
  notes: ExpNote[];
  sets: NonNullable<DrillGoal['chordSets']>;
}
/** Comping hits → notes + chord sets (each hit one chord id from `id0`). */
function hitsToNotes(hits: PHit[], b0: number, id0: number): Built {
  const notes: ExpNote[] = [];
  const sets: NonNullable<DrillGoal['chordSets']> = [];
  let cid = id0;
  for (const e of hits) {
    cid++;
    const ps = [...e.lh.map((p) => ({ p, h: 'L' as const })), ...e.rh.map((p) => ({ p, h: 'R' as const }))];
    for (const { p, h } of ps) notes.push({ pitch: p, beat: r6(b0 + e.beat), dur: r6(e.dur), hand: h, chordId: cid, chordTone: true });
    const req = [...new Set(ps.map((x) => mod12(x.p)))].sort((a, b) => a - b);
    sets.push({ chordId: cid, required: req, allowed: [...new Set([...req, ...scalePcs(e.c)])].sort((a, b) => a - b) });
  }
  return { notes, sets };
}

export function genKeysGig(s: DrillSpec): Drill {
  if (s.kind === 'gg-tune') return genKeysTune(s);
  const key = mod12(s.key);
  const it = gigItem(s.kind, key, s.option ?? 0);
  const comp = isComp(it.what);
  let notes: ExpNote[];
  let sets: Built['sets'] = [];
  if (comp) ({ notes, sets } = hitsToNotes(pianoHits(it), 0, 0));
  else notes = gigLine(it, 60, 84, `${s.family}:${s.kind}:${key}:${s.option ?? 0}`).map((n) => ({ pitch: n.p, beat: r6(n.beat), dur: r6(n.dur), hand: 'R' as const, chordTone: n.ct }));
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const hands = new Set(notes.map((n) => n.hand));
  const ballad = it.what === 'tenths' || it.what === 'rh' || it.what === 'both';
  return {
    spec: { ...s, key, hands: hands.size > 1 ? 'RL' : hands.has('L') ? 'L' : 'R', ...(ballad ? { swing: false } : {}) },
    itemId: itemIdOf({ ...s, key }),
    title: withKey(it.name, key),
    notes,
    beats: r6(Math.max(...notes.map((n) => n.beat + n.dur))),
    meter: 4,
    keySig: SIG[key],
    goal: { evenness: !comp, hands: hands.size > 1, ...(!comp ? { chordTonesOnBeats: true } : {}), ...(sets.length ? { chordSets: sets } : {}) },
    startBpm: s.tempo ?? 60,
    chart: chartOf(it.chords, key),
    ...(it.rubato ? { rubatoOnly: true } : {}),
    ...(it.chords.length > 16 ? { paged: true } : {}),
  };
}

// ───────────────────────────── the whole tune (C8) ─────────────────────────────

/** The tunes of the whole-tune levels: original heads (heads.ts), by id. */
export const GIG_TUNES = ['back-porch', 'night-ferry'];
export const GIG_SECTIONS = 6; // 0 whole, 1 intro, 2 head, 3 solo chorus, 4 ending, 5 head out
/**
 * The head out is a different harmonisation from the head in (owner 2026-11-16: variety on the second time through):
 * the head's chart reharmonised (reharm.ts autoPlan with tritone subs, extra ii–Vs, backdoor, passing dim, line cliché —
 * every new chord checked against the melody), played as
 *   keys:   the melody over the reharm (k-tune's tn-rhmel: melody on top, the comp under it);
 *   guitar: chord-melody in drop 2 under the melody notes, on the reharmonised chords (the head in has bass + melody);
 *   bass:   walking the reharm in four (the head in is in two).
 */
export const OUT_KIND = 'tn-rhmel';
/** The head-out chart of a tune plan (the reharm; the written chart when no device fits). */
export function outChart(plan: TunePlan): { text: string; bars: string[]; chords: ChartChordEv[] } {
  const r = chartFor(plan.hi, OUT_KIND);
  return { text: r.text, bars: r.bars, chords: parseChart(r.text).chords };
}
export const tuneOpt = (tune: number, section: number): number => tune * 8 + section;
const headOf = (tune: number): Head => HEADS.find((h) => h.id === GIG_TUNES[tune % GIG_TUNES.length])!;
const SEC_NAME: Record<string, T2> = {
  intro: t('Intro', 'פתיחה'),
  head: t('Head', 'הנושא'),
  solo: t('Solo chorus', 'סבב סולו'),
  out: t('Head out', 'הנושא בחזרה'),
  ending: t('Ending', 'סיום'),
};

/** A chart chord's quality as a VQ (for scales, voicings and lines). */
export function vqOf(iv: number[]): VQ {
  const has = (x: number) => iv.includes(x);
  if (has(3) && has(6)) return has(10) ? 'hd7' : 'dim7';
  if (has(3)) return has(10) ? 'm7' : 'm6';
  if (has(10)) return has(13) ? '7b9' : '7';
  if (has(11)) return 'maj7';
  return '6';
}
const vchordsOf = (cs: ChartChordEv[]): VChord[] => cs.map((c) => ({ r: mod12(c.root), q: vqOf(c.iv), beats: c.beats }));

/** The plan of a whole-tune performance: the tune in the key, its sections' chords and beat spans. */
export interface TunePlan {
  hi: HeadIn;
  minor: boolean;
  tonic: number;
  headBeats: number;
  intro: VChord[];
  ending: VChord[];
  /** Section spans on the whole take's beat line (intro, head, solo, out, ending). */
  spans: { id: keyof typeof SEC_NAME; from: number; to: number }[];
  cards: string[];
}
/** Basie ending: ii (bar) · V (bar) · the I hit and the tag · the last hit. */
const BASIE_END: D[] = [[2, 'm7', 4], [7, '7', 4], [0, '6', 4], [0, '6', 4]];
/** Minor tag ending: iiø–V7♭9 three times, then i. */
const MINOR_TAG: D[] = [...twice([[2, 'hd7', 2], [7, '7b9', 2]]), [2, 'hd7', 2], [7, '7b9', 2], [0, 'm6', 4]];

export function tunePlan(tune: number, key: number, inst: 'piano' | 'guitar' = 'piano'): TunePlan {
  const head = headOf(tune);
  const hi = headIn(head, key, inst);
  const minor = !!hi.tonic.minor;
  const tonic = mod12(hi.tonic.key);
  const nBars = hi.bars.length;
  const headBeats = nBars * 4;
  const intro = vchordsOf(hi.chords.filter((c) => c.bar >= nBars - 4));
  const ending = prog(tonic, minor ? MINOR_TAG : BASIE_END);
  const iB = 16;
  const eB = ending.reduce((a, c) => a + c.beats, 0);
  const spans: TunePlan['spans'] = [
    { id: 'intro', from: 0, to: iB },
    { id: 'head', from: iB, to: iB + headBeats },
    { id: 'solo', from: iB + headBeats, to: iB + 2 * headBeats },
    { id: 'out', from: iB + 2 * headBeats, to: iB + 3 * headBeats },
    { id: 'ending', from: iB + 3 * headBeats, to: iB + 3 * headBeats + eB },
  ];
  // Major blues: a chord tone on each change, inside. Minor tune: inside, and quote four notes of the head.
  const cards = minor ? ['inside', 'quote-head'] : ['target-ct', 'inside'];
  return { hi, minor, tonic, headBeats, intro, ending, spans, cards };
}

/** The free chorus's goal parts (absolute beats from `b0`): the scale per chord, the cards, the chord spans, a model. */
function soloGoal(plan: TunePlan, b0: number, lo: number, hi: number, seed: string): Pick<DrillGoal, 'free' | 'improv'> {
  const vcs = vchordsOf(plan.hi.chords);
  const scale = plan.hi.chords.map((c, i) => ({ from: r6(b0 + c.bar * 4 + c.at), to: r6(b0 + c.bar * 4 + c.at + c.beats), pcs: scalePcs(vcs[i]) }));
  const spans = plan.hi.chords.map((c) => ({ at: r6(b0 + c.bar * 4 + c.at), beats: c.beats, root: mod12(c.root), iv: c.iv }));
  // The model keeps the cards: the head's first phrase (a quote) then a bebop line in minor; a bebop line in major.
  const bebop = modelLine('bebop', vcs, lo, hi, seed);
  const quote = plan.hi.notes.filter((n) => n.beat < 16 - 1e-6).map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.pitch }));
  const model = plan.minor ? [...quote, ...bebop.filter((n) => n.beat >= 16 - 1e-6).map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.p }))] : bebop.map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.p }));
  const fold = (p: number) => (p < lo ? p + 12 * Math.ceil((lo - p) / 12) : p > hi ? p - 12 * Math.ceil((p - hi) / 12) : p);
  return {
    free: { windows: [[b0, b0 + plan.headBeats]], scale, minPerBar: 2, model: model.map((n) => ({ beat: r6(b0 + n.beat), dur: n.dur, pitch: fold(n.pitch) })) },
    improv: { cards: plan.cards, spans, ...(plan.cards.includes('quote-head') ? { melody: plan.hi.notes.map((n) => ({ beat: n.beat, midi: n.pitch })) } : {}) },
  };
}
/** A written landing of a free chorus: the first or the last chord's tones, any octave (a model note shown after the take). */
function landingOf(plan: TunePlan, b0: number, goal: Pick<DrillGoal, 'free'>, lo: number, hi: number, first = false): { beat: number; dur: number; pitch: number; land: number[] } {
  const last = plan.hi.chords[first ? 0 : plan.hi.chords.length - 1];
  const beat = r6(b0 + last.bar * 4 + last.at);
  const land = [...new Set(VQ_DEF[vqOf(last.iv)].ct.map((x) => mod12(last.root + x)))].sort((a, b) => a - b);
  const m = goal.free!.model.find((n) => Math.abs(n.beat - beat) < 1e-6);
  // The first landing shows the chord's root (any chord tone counts); the last, the model's note when it is a chord tone.
  const pitch = first ? nearestPc(last.root, Math.round((lo + hi) / 2), lo, hi) : m && land.includes(mod12(m.pitch)) ? m.pitch : nearestPc(last.root + VQ_DEF[vqOf(last.iv)].ct[1], Math.round((lo + hi) / 2), lo, hi);
  return { beat, dur: first ? 1 : last.beats, pitch, land };
}
const sectionsGoal = (plan: TunePlan, only?: string): NonNullable<DrillGoal['sections']> =>
  plan.spans.filter((x) => !only || x.id === only).map((x) => ({ from: only ? 0 : x.from, to: only ? x.to - x.from : x.to, name: SEC_NAME[x.id] }));
const tuneTitle = (plan: TunePlan, section: number): T2 => {
  const nm = plan.hi.head.title;
  const what = section === 0 ? t('the whole tune: intro, head, solo chorus, head out, ending', 'השיר כולו: פתיחה, נושא, סבב סולו, נושא, סיום') : SEC_NAME[['', 'intro', 'head', 'solo', 'ending', 'out'][section]];
  const k = keyLabel(plan.tonic, plan.minor);
  return t(`${nm.en} · ${what.en} · ${k}`, `${nm.he} · ${what.he} · ${k}`);
};
const SWING_BAND = (bass: boolean): Pick<Drill, 'band' | 'drums'> => ({ band: { style: 'swing', ...(bass ? { bass: true } : {}) }, drums: { groove: 'swing' } });

/** Keys: a section of the tune, or the whole performance in one take. */
function genKeysTune(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const tune = Math.floor(op / 8) % GIG_TUNES.length;
  const section = op % 8;
  const plan = tunePlan(tune, key);
  const head = plan.hi.head;
  const headIdx = HEADS.indexOf(head);
  const notes: ExpNote[] = [];
  const sets: Built['sets'] = [];
  let cid = 0;
  const add = (b: Built) => {
    notes.push(...b.notes);
    sets.push(...b.sets);
    cid = Math.max(cid, ...b.notes.map((n) => n.chordId ?? 0));
  };
  // The head: k-tune's melody + shells (graded note for note), moved to the section's start.
  const headNotes = (b0: number, kind = 'tn-melcomp'): ExpNote[] => {
    const d = genHeadPiano({ family: 'k-tune', kind, key: plan.hi.tonic.key, hands: 'RL', option: headIdx * 16 });
    const base = cid;
    const out = d.notes.map((n) => ({ ...n, beat: r6(n.beat + b0), ...(n.chordId !== undefined ? { chordId: n.chordId + base } : {}) }));
    cid = Math.max(cid, ...out.map((n) => n.chordId ?? 0));
    return out;
  };
  const span = (id: string) => plan.spans.find((x) => x.id === id)!;
  const whole = section === 0;
  const at = (id: string) => (whole ? span(id).from : 0);
  let goal: DrillGoal = { evenness: false, hands: true };
  let chart: string[] = [];
  const introChart = chartOf(plan.intro, plan.minor ? plan.tonic + 3 : plan.tonic);
  const endChart = chartOf(plan.ending, plan.minor ? plan.tonic + 3 : plan.tonic);
  const headChart = plan.hi.bars.map((b) => b.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯'));
  const outBars = outChart(plan).bars.map((b) => b.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯'));
  if (whole || section === 1) {
    add(hitsToNotes(pianoHits({ chords: plan.intro, what: 'comp', name: SEC_NAME.intro }), at('intro'), cid));
    chart.push(...introChart);
  }
  if (whole || section === 2) {
    notes.push(...headNotes(at('head')));
    chart.push(...headChart);
  }
  let solo: Pick<DrillGoal, 'free' | 'improv'> | null = null;
  if (whole || section === 3) {
    solo = soloGoal(plan, at('solo'), 60, 86, `gig:${tune}:${key}`);
    // Two written landings, as k-solo: a chord tone on the chorus's first beat and on its last chord.
    for (const l of [landingOf(plan, at('solo'), solo, 62, 84, true), landingOf(plan, at('solo'), solo, 62, 84)]) notes.push({ pitch: l.pitch, beat: l.beat, dur: l.dur, hand: 'R', chordTone: true, land: l.land });
    chart.push(...headChart);
  }
  if (whole || section === 5) {
    // The head out: the melody over the reharmonised changes.
    notes.push(...headNotes(at('out'), OUT_KIND));
    chart.push(...outBars);
  }
  if (whole || section === 4) {
    const b0 = at('ending');
    if (plan.minor) add(hitsToNotes(pianoHits({ chords: plan.ending, what: 'comp', name: SEC_NAME.ending }), b0, cid));
    else {
      // The Basie ending: ii, V, the I hit on beat 1 of bar 3 (short), the RH tag 5–♯5–6, the last hit with the root on top.
      const hits = pianoHits({ chords: plan.ending, what: 'comp', name: SEC_NAME.ending });
      const I = hits[2];
      const ending = [hits[0], hits[1], { ...I, dur: 1 }, { ...I, beat: 12, dur: 4 }];
      const b = hitsToNotes(ending, b0, cid);
      const five = nearestPc(plan.tonic + 7, 72, 64, 79);
      const tag = [
        { pitch: five, beat: 9, ct: true },
        { pitch: five + 1, beat: 10, ct: false },
        { pitch: five + 2, beat: 11, ct: true },
      ];
      for (const n of tag) b.notes.push({ pitch: n.pitch, beat: r6(b0 + n.beat), dur: 1, hand: 'R', chordTone: n.ct });
      // The last hit: the root on top, part of the final chord.
      const last = b.sets[b.sets.length - 1];
      const top = nearestPc(plan.tonic, five + 3, five + 1, five + 12);
      b.notes.push({ pitch: top, beat: r6(b0 + 12), dur: 4, hand: 'R', chordId: last.chordId, chordTone: true });
      if (!last.required.includes(mod12(top))) last.required = [...last.required, mod12(top)].sort((x, y) => x - y);
      if (!last.allowed.includes(mod12(top))) last.allowed = [...last.allowed, mod12(top)].sort((x, y) => x - y);
      add(b);
    }
    chart.push(...endChart);
  }
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const beats = whole ? plan.spans[4].to : section === 1 ? 16 : section === 4 ? plan.spans[4].to - plan.spans[4].from : plan.headBeats;
  goal = {
    evenness: false,
    hands: notes.some((n) => n.hand === 'L') && notes.some((n) => n.hand === 'R'),
    ...(sets.length ? { chordSets: sets } : {}),
    ...(solo ?? {}),
    ...(whole ? { sections: sectionsGoal(plan) } : {}),
  };
  const timed = whole || section === 3;
  const hands = new Set(notes.map((n) => n.hand));
  return {
    spec: { ...s, key, hands: section === 3 ? 'R' : hands.size > 1 ? 'RL' : hands.has('L') ? 'L' : 'R', swing: true, ...(plan.minor ? { minor: true } : {}) },
    itemId: itemIdOf({ ...s, key }),
    title: tuneTitle(plan, section),
    notes,
    beats,
    meter: 4,
    keySig: SIG[plan.minor ? mod12(plan.tonic + 3) : plan.tonic],
    goal,
    startBpm: s.tempo ?? 72,
    chart,
    tonic: plan.hi.tonic,
    paged: true,
    ...(section === 3 ? { show: 'none' as const } : {}),
    ...(timed ? SWING_BAND(true) : {}),
  };
}

// ───────────────────────────── keys family ─────────────────────────────

/** Guitar grades of g-gig 1–8 (the path places guitar levels by grade; keys and bass: ../gigPlacement.ts). */
export const G_GIG_GRADE: number[] = [8, 8, 8, 8, 9, 10, 10, 11, 11];

export function keysGigFamily(): FamilyDef {
  const v = (kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-gig', kind, hands: 'R', swing: true, option, ...o });
  const B = (kind: string, parts: number[]) => parts.map((p) => v(kind, p, { hands: kind === 'gg-b10' ? 'L' : 'RL', swing: false }));
  const T = (tune: number, sections: number[]) => sections.map((sec) => v('gg-tune', tuneOpt(tune, sec), { hands: sec === 3 ? 'R' : 'RL' }));
  const JT = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `k-gig-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: x.tempo ?? tempo[0] })), keys: GIG_KEYS, tempo });
  return {
    id: 'k-gig',
    title: t('On the bandstand', 'על הבמה'),
    style: 'jazz',
    levels: [
      JT(1, 'Intros: the iii–VI7–ii–V7 vamp and a blues’s last four bars', 'פתיחות: ואמפ iii–VI7–ii–V7 וסוף של בלוז', [v('gg-intro', 0, { hands: 'L' }), v('gg-intro', 1), v('gg-intro', 2, { hands: 'L' })], [70, 150]),
      JT(2, 'Ballad: LH 10ths through “Evening Lamp”', 'בלדה: דצימות ביד שמאל לאורך ״מנורת ערב״', B('gg-b10', [0, 1]), [44, 66]),
      JT(3, 'Endings: ♭VImaj7–♭IImaj7–I and ♭VI7–♭II7–I', 'סיומים: ♭VI–♭II–I במז׳ור 7 ובדומיננט 7', [v('gg-end', 1, { hands: 'L' }), v('gg-end', 2)], [70, 150]),
      JT(4, 'Ballad: RH four-note voicings over the root', 'בלדה: ארבעה צלילים בימין מעל היסוד', B('gg-brh', [0, 1]), [44, 66]),
      JT(5, 'The tag ×3 and the Dameron turnaround', 'התג ×3 והטרנאראונד של דיימרון', [v('gg-end', 0), v('gg-end', 3, { hands: 'L' }), v('gg-end', 4)], [70, 150]),
      JT(6, 'Ballad: LH 10ths and RH four notes together', 'בלדה: דצימות בשמאל וארבעה צלילים בימין יחד', B('gg-b2h', [0, 1]), [44, 66]),
      JT(7, 'The walk-down ending and a rubato ballad intro', 'סיום הירידה הדימינישית ופתיחת בלדה ברובאטו', [v('gg-end', 5, { hands: 'L' }), v('gg-intro', 3, { hands: 'RL', swing: false, target: 50, tempo: 50 })], [50, 130]),
      JT(8, 'The whole ballad chart in two hands', 'כל הבלדה בשתי ידיים', B('gg-b2h', [2]), [44, 66]),
      JT(9, 'Back Porch Blues, section by section', 'בלוז המרפסת, קטע אחר קטע', T(0, [1, 2, 3, 5, 4]), [72, 126]),
      JT(10, 'Back Porch Blues: the whole tune in one take', 'בלוז המרפסת: השיר כולו בטייק אחד', T(0, [0]), [72, 126]),
      JT(11, 'Night Ferry, section by section', 'מעבורת לילה, קטע אחר קטע', T(1, [1, 2, 3, 5, 4]), [72, 120]),
      JT(12, 'Night Ferry: the whole tune in one take', 'מעבורת לילה: השיר כולו בטייק אחד', T(1, [0]), [72, 120]),
    ],
  };
}

// ───────────────────────────── guitar: g-gig ─────────────────────────────

/** A line on the neck, in one position around the lowest note where it fits (strings 6 → 1). */
function onNeck(tu: Tuning, ps: number[]): { s: number; f: number }[] {
  const lo = Math.min(...ps);
  const c = Math.max(1, Math.min(12, lo - tu.open[tu.open.length - 1]));
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return ps.map((m) => place(tu, m, strs, Math.max(0, c - 1), c + 4) ?? place(tu, m, strs, Math.max(0, c - 3), c + 6) ?? place(tu, m, strs, 0, 17)!);
}
/** Four comping notes (drop 2): 1-3-5-7, the 6th chord 1-3-5-6, 7♭9 as 3-5-♭7-♭9, dim7 and ø7 as written. */
const fourOf = (c: VChord): number[] => (c.q === '7b9' ? [4, 7, 10, 1] : VQ_DEF[c.q].ct.slice(0, 4)).map((x) => c.r + x);
const strum = (v: { s: number; f: number }[]): GN[] => v.map((p) => ({ ...p, stroke: 'D' as const, tech: 'strum-down' as const, ct: true }));
/** Drop-2 strums for chords on a string set, each nearest the last. */
function guitarComp(tu: Tuning, hits: { beat: number; dur: number; c: VChord }[], strs: number[]): Ev[] {
  let near = 5;
  return hits.map((h) => {
    const cands = drop2Voicings(tu, fourOf(h.c), strs, 13);
    const v = cands.length ? nearestVoicing(cands, near) : drop2Voicings(tu, fourOf(h.c), [5, 4, 3, 2], 15)[0];
    near = Math.min(...v.map((p) => p.f).filter((f) => f > 0).concat([near]));
    return { beat: h.beat, dur: h.dur, notes: strum(v) };
  });
}
const hitsOf = (chords: VChord[], b0 = 0): { beat: number; dur: number; c: VChord }[] => {
  let beat = b0;
  return chords.map((c) => {
    const h = { beat, dur: c.beats, c };
    beat += c.beats;
    return h;
  });
};

export function genGuitarGig(s: DrillSpec, tu: Tuning): Drill {
  if (s.kind === 'gg-tune') return genGuitarTune(s, tu);
  // Intros and endings by ear (progEar.ts): hear one, comp it back in drop 2 (graded per chord, harmonyGrade.ts).
  if (s.kind === 'prog-intro' || s.kind === 'prog-ending') return generateGuitarEar(s, tu);
  const key = mod12(s.key);
  const it = gigItem(s.kind, key, s.option ?? 0);
  const comp = isComp(it.what);
  let evs: Ev[];
  if (comp) evs = guitarComp(tu, hitsOf(it.chords), it.what === 'comp' ? [4, 3, 2, 1] : [5, 4, 3, 2]);
  else {
    const ln = gigLine(it, 52, 79, `${s.family}:${s.kind}:${key}:${s.option ?? 0}`);
    const pos = onNeck(tu, ln.map((n) => n.p));
    evs = ln.map((n, i) => ({ beat: n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: i % 2 === 0 ? ('D' as const) : ('U' as const), ct: n.ct }] }));
  }
  const ballad = it.what === 'both';
  const d = gFinish({ ...s, key, ...(ballad ? { swing: false } : {}) }, tu, evs, { title: withKey(it.name, key), bpm: s.tempo ?? 60, evenness: !comp, ...(!comp ? { goal: { chordTonesOnBeats: true } } : {}), keySig: SIG[key] });
  d.chart = chartOf(it.chords, key);
  if (it.rubato) d.rubatoOnly = true;
  if (it.chords.length > 16) d.paged = true;
  return d;
}

function genGuitarTune(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const tune = Math.floor(op / 8) % GIG_TUNES.length;
  const section = op % 8;
  const plan = tunePlan(tune, key, 'guitar');
  const whole = section === 0;
  const at = (id: string) => (whole ? plan.spans.find((x) => x.id === id)!.from : 0);
  const evs: Ev[] = [];
  const home = plan.minor ? plan.tonic + 3 : plan.tonic;
  const headChart = plan.hi.bars.map((b) => b.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯'));
  const chart: string[] = [];
  if (whole || section === 1) {
    evs.push(...guitarComp(tu, hitsOf(plan.intro, at('intro')), [4, 3, 2, 1]));
    chart.push(...chartOf(plan.intro, home));
  }
  // The head as chord-melody: the melody on the top strings, the bass note under it on each downbeat (g-cmel's material).
  if (whole || section === 2) {
    evs.push(...chordMelodyEvs(tu, plan.hi.notes, plan.hi.chords, 'bass', -at('head')));
    chart.push(...headChart);
  }
  let solo: Pick<DrillGoal, 'free' | 'improv'> | null = null;
  const landAt: { beat: number; land: number[] }[] = [];
  if (whole || section === 3) {
    solo = soloGoal(plan, at('solo'), 55, 79, `gig-g:${tune}:${key}`);
    for (const l of [landingOf(plan, at('solo'), solo, 60, 76, true), landingOf(plan, at('solo'), solo, 60, 76)]) {
      const lp = onNeck(tu, [l.pitch])[0];
      evs.push({ beat: l.beat, dur: l.dur, notes: [{ ...lp, stroke: 'D', ct: true }] });
      landAt.push({ beat: l.beat, land: l.land });
    }
    chart.push(...headChart);
  }
  if (whole || section === 5) {
    // The head out: drop 2 under the melody notes on the reharmonised chords (the head in: bass + melody).
    const out = outChart(plan);
    evs.push(...chordMelodyEvs(tu, plan.hi.notes, out.chords, 'drop2', -at('out')));
    chart.push(...out.bars.map((b) => b.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯')));
  }
  if (whole || section === 4) {
    const b0 = at('ending');
    if (plan.minor) evs.push(...guitarComp(tu, hitsOf(plan.ending, b0), [4, 3, 2, 1]));
    else {
      const hs = hitsOf(plan.ending, b0);
      const I = hs[2];
      evs.push(...guitarComp(tu, [hs[0], hs[1], { ...I, dur: 1 }, { ...I, beat: b0 + 12, dur: 4 }], [4, 3, 2, 1]));
      const five = nearestPc(plan.tonic + 7, 67, 60, 76);
      const tag = [five, five + 1, five + 2];
      const pos = onNeck(tu, tag);
      tag.forEach((_, i) => evs.push({ beat: b0 + 9 + i, dur: 1, notes: [{ ...pos[i], stroke: 'D', ct: i !== 1 }] }));
    }
    chart.push(...chartOf(plan.ending, home));
  }
  evs.sort((a, b) => a.beat - b.beat);
  const d = gFinish({ ...s, key, swing: true, ...(plan.minor ? { minor: true } : {}) }, tu, evs, { title: tuneTitle(plan, section), bpm: s.tempo ?? 72, evenness: false, keySig: SIG[plan.minor ? mod12(plan.tonic + 3) : plan.tonic] });
  const beats = whole ? plan.spans[4].to : section === 1 ? 16 : section === 4 ? plan.spans[4].to - plan.spans[4].from : plan.headBeats;
  const timed = whole || section === 3;
  return {
    ...d,
    notes: d.notes.map((n) => {
      const l = n.chordId === undefined ? landAt.find((x) => Math.abs(x.beat - n.beat) < 1e-6) : undefined;
      return l ? { ...n, land: l.land } : n;
    }),
    beats: Math.max(beats, d.beats),
    goal: { ...d.goal, evenness: false, hands: false, ...(solo ?? {}), ...(whole ? { sections: sectionsGoal(plan) } : {}) },
    chart,
    tonic: plan.hi.tonic,
    paged: true,
    ...(section === 3 ? { show: 'none' as const } : {}),
    ...(timed ? SWING_BAND(true) : {}),
  };
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The guitar family (the jazz add-on): intros, endings and the ballad at grade 8, the whole tune at grades 9–11. */
export function guitarGigFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'g-gig', kind, hands: 'R', instrument: 'guitar', swing: true, option, ...o });
  const T = (tune: number, sections: number[]) => sections.map((sec) => v('gg-tune', tuneOpt(tune, sec)));
  const G = G_GIG_GRADE;
  return fam('g-gig', 'On the bandstand', 'על הבמה', 'jazz', ['jazz'], [
    LT('g-gig', 1, 'Intros: the iii–VI7–ii–V7 vamp and a blues’s last four bars', 'פתיחות: ואמפ iii–VI7–ii–V7 וסוף של בלוז', [v('gg-intro', 0), v('gg-intro', 1), v('gg-intro', 2)], GIG_KEYS, [70, 150], 'comping', G[0]),
    LT('g-gig', 2, 'Endings: ♭VI–♭II–I, the tag ×3, the walk-down', 'סיומים: ♭VI–♭II–I, התג ×3, הירידה הדימינישית', [v('gg-end', 1), v('gg-end', 2), v('gg-end', 0), v('gg-end', 5)], GIG_KEYS, [70, 150], 'comping', G[1]),
    LT('g-gig', 3, 'The Dameron turnaround: drop 2 and a line', 'הטרנאראונד של דיימרון: דרופ 2 וקו', [v('gg-end', 3), v('gg-end', 4)], GIG_KEYS, [70, 150], 'comping', G[2]),
    LT('g-gig', 4, 'Ballad “Evening Lamp” in drop 2, and a rubato intro', 'הבלדה ״מנורת ערב״ בדרופ 2, ופתיחה ברובאטו', [v('gg-b2h', 0, { swing: false }), v('gg-b2h', 1, { swing: false }), v('gg-intro', 3, { swing: false, target: 50, tempo: 50 })], GIG_KEYS, [44, 66], 'ballad', G[3]),
    LT('g-gig', 5, 'Back Porch Blues, section by section', 'בלוז המרפסת, קטע אחר קטע', T(0, [1, 2, 3, 5, 4]), GIG_KEYS, [72, 126], 'chord-melody', G[4]),
    LT('g-gig', 6, 'Back Porch Blues: the whole tune in one take', 'בלוז המרפסת: השיר כולו בטייק אחד', T(0, [0]), GIG_KEYS, [72, 126], 'chord-melody', G[5]),
    LT('g-gig', 7, 'Night Ferry, section by section', 'מעבורת לילה, קטע אחר קטע', T(1, [1, 2, 3, 5, 4]), GIG_KEYS, [72, 120], 'chord-melody', G[6]),
    LT('g-gig', 8, 'Night Ferry: the whole tune in one take', 'מעבורת לילה: השיר כולו בטייק אחד', T(1, [0]), GIG_KEYS, [72, 120], 'chord-melody', G[7]),
    // By ear (the guitar's own counterpart of the ear topic intro-ending): hear an intro or an ending, comp it back.
    LT('g-gig', 9, 'Intros and endings by ear: comp them back in drop 2', 'פתיחות וסיומים בשמיעה: ללוות אותם בחזרה בדרופ 2', [v('prog-intro', 0, { position: 1, swing: false }), v('prog-ending', 1, { position: 1, swing: false })], GIG_KEYS, [60, 90], 'chords', G[8]),
  ]);
}

// ───────────────────────────── bass: b-gig ─────────────────────────────

const toBN = (ln: VN[], b0 = 0): BN[] => ln.map((n) => ({ b: r6(b0 + n.beat), d: n.dur, p: n.p, ct: n.ct }));

export function genBassGig(s: DrillSpec, tu: Tuning): Drill {
  if (s.kind === 'gg-tune') return genBassTune(s, tu);
  // Intros and endings by ear (bassEar.ts 'ie-ear'): hear one, walk its roots back.
  if (s.kind === 'ie-ear') return generateBassEar(s, tu);
  const key = mod12(s.key);
  const it = gigItem(s.kind, key, s.option ?? 0);
  const ln = gigLine(it, 28, 52, `${s.family}:${s.kind}:${key}:${s.option ?? 0}`);
  return drillOf({ ...s, key, ...(it.what === 'two' ? { swing: false } : {}) }, tu, alt(toBN(ln)), {
    en: it.name.en,
    he: it.name.he,
    chart: chartOf(it.chords, key),
    evenness: true,
    goal: { chordTonesOnBeats: true },
    keySig: SIG[key],
  });
}

function genBassTune(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const tune = Math.floor(op / 8) % GIG_TUNES.length;
  const section = op % 8;
  const plan = tunePlan(tune, key);
  const whole = section === 0;
  const at = (id: string) => (whole ? plan.spans.find((x) => x.id === id)!.from : 0);
  const vcs = vchordsOf(plan.hi.chords);
  const home = plan.minor ? plan.tonic + 3 : plan.tonic;
  const headChart = plan.hi.bars.map((b) => b.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯'));
  const line: BN[] = [];
  const chart: string[] = [];
  if (whole || section === 1) {
    line.push(...toBN(walkOf(plan.intro, 28, 52), at('intro')));
    chart.push(...chartOf(plan.intro, home));
  }
  if (whole || section === 2) {
    line.push(...toBN(twoFeelOf(vcs, 28, 52), at('head')));
    chart.push(...headChart);
  }
  // Behind the soloist the bass walks the chorus.
  if (whole || section === 3) {
    line.push(...toBN(walkOf(vcs, 28, 52), at('solo')));
    chart.push(...headChart);
  }
  if (whole || section === 5) {
    // The head out: walking the reharmonised changes in four (the head in was in two).
    const out = outChart(plan);
    line.push(...toBN(walkOf(vchordsOf(out.chords), 28, 52), at('out')));
    chart.push(...out.bars.map((b) => b.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯')));
  }
  if (whole || section === 4) {
    const b0 = at('ending');
    if (plan.minor) line.push(...toBN(walkOf(plan.ending, 28, 52), b0));
    else {
      // The Basie ending on the bass: walk ii–V, the root on the I hit, rest through the tag, the root on the last hit.
      const w = walkOf(plan.ending.slice(0, 3), 28, 52).filter((n) => n.beat < 8 - 1e-6);
      const root = nearestPc(plan.tonic, w[w.length - 1].p, 29, 50);
      line.push(...toBN([...w, { p: root, beat: 8, dur: 1, ct: true }, { p: root, beat: 12, dur: 4, ct: true }], b0));
    }
    chart.push(...chartOf(plan.ending, home));
  }
  const d = drillOf({ ...s, key, swing: true, ...(plan.minor ? { minor: true } : {}) }, tu, alt(line), {
    en: tuneTitle(plan, section).en,
    he: tuneTitle(plan, section).he,
    keyName: keyLabel(plan.tonic, plan.minor),
    chart,
    evenness: false,
    goal: { chordTonesOnBeats: true, ...(whole ? { sections: sectionsGoal(plan) } : {}) },
    keySig: SIG[plan.minor ? mod12(plan.tonic + 3) : plan.tonic],
    ...(whole || section === 3 || section === 5 ? { drums: { groove: 'swing' } } : {}),
  });
  return { ...d, title: tuneTitle(plan, section), tonic: plan.hi.tonic, paged: true };
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The bass family (jazz track): the ballad in two, walked intros and endings, the whole tune. */
export function bassGigFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'b-gig', kind, hands: 'R', instrument: 'bass', swing: true, option, ...o });
  const vs = (kind: string, ops: number[]) => ops.map((o) => v(kind, o));
  const T = (tune: number, sections: number[]) => sections.map((sec) => v('gg-tune', tuneOpt(tune, sec)));
  return fam('b-gig', 'On the bandstand', 'על הבמה', [
    L('b-gig', 1, 'Ballad “Evening Lamp” in two', 'הבלדה ״מנורת ערב״ בשתיים', [0, 1, 2].map((p) => v('gg-two', p, { swing: false })), GIG_KEYS, [44, 72], 'halves'),
    L('b-gig', 2, 'Walking intros: the iii–VI7–ii–V7 vamp, a blues’s last four bars', 'פתיחות בהליכה: ואמפ iii–VI7–ii–V7, סוף של בלוז', vs('gg-walk', [0, 1]), GIG_KEYS, [70, 160], 'walking 4'),
    L('b-gig', 3, 'Walking endings: the tag ×3, ♭VI7–♭II7–I, the Dameron turnaround', 'סיומים בהליכה: התג ×3, ♭VI7–♭II7–I, הטרנאראונד של דיימרון', vs('gg-walk', [2, 3, 4]), GIG_KEYS, [70, 160], 'walking 4'),
    L('b-gig', 4, 'Walking the walk-down ending and ♭VImaj7–♭IImaj7–I', 'הליכה בסיום הירידה הדימינישית וב־♭VI–♭II–I במז׳ור 7', vs('gg-walk', [5, 6]), GIG_KEYS, [70, 160], 'walking 4'),
    L('b-gig', 5, 'Back Porch Blues, section by section', 'בלוז המרפסת, קטע אחר קטע', T(0, [1, 2, 3, 5, 4]), GIG_KEYS, [72, 126], 'two-feel / walking'),
    L('b-gig', 6, 'Back Porch Blues: the whole tune in one take', 'בלוז המרפסת: השיר כולו בטייק אחד', T(0, [0]), GIG_KEYS, [72, 126], 'two-feel / walking'),
    L('b-gig', 7, 'Night Ferry, section by section', 'מעבורת לילה, קטע אחר קטע', T(1, [1, 2, 3, 5, 4]), GIG_KEYS, [72, 120], 'two-feel / walking'),
    L('b-gig', 8, 'Night Ferry: the whole tune in one take', 'מעבורת לילה: השיר כולו בטייק אחד', T(1, [0]), GIG_KEYS, [72, 120], 'two-feel / walking'),
    // By ear (the bass's own counterpart of the ear topic intro-ending): hear an intro or an ending, play its roots back.
    L('b-gig', 9, 'Intros and endings by ear: play the roots back', 'פתיחות וסיומים בשמיעה: לנגן את היסודות בחזרה', [v('ie-ear', 0, { perBeat: 0.5, swing: false }), v('ie-ear', 1, { perBeat: 0.5, swing: false })], GIG_KEYS, [70, 110], 'halves'),
  ]);
}
