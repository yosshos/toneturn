// Solo jazz piano after Jeremy Siskind (docs/research/SISKIND-SOLO-PIANO.md, Part C; the music is ../soloPiano.ts,
// sources cited there). Four keys families, every item in all 12 keys (the key is in the item id, so every take feeds
// key mastery), note items first in free time and then on the tempo ladder (rubato.ts), rhythm items on a click:
//
//  k-lh    Left hand for solo piano (C1, top-10 #1, #2, #8): bass register → the same chord in six places → two-note
//          "Bud Powell" shells (3rd, 10th, 7th; the 9th under the thumb) → Type A / Type B bass shells (the 5th or the
//          tritone for the root) → rolled bass → shell stride → shells on the strong beats → walking 10ths → a head in
//          10ths → stride variations (Peace Piece pattern, reversed, skip beat, 3+3+2, anticipations, 3 against 4) → LH
//          breaks → stride-style comping (Charleston, reverse, Red Garland, push-off, lead-in) → the LH shuttle.
//  k-tex   Solo piano: textures (C2, the 20-step ladder through tunes; top-10 #3–#6): melody + bass, + two-note shells,
//          + bass shells, call and response, shell stride under a melody, RH notes under the melody, filled octaves,
//          RH shuttle / drape / melodic over a bass in 2, closed position, drop 2 with sidesteps, So What, stride under
//          the head, shared hands (k-harm's hm-shared, graded by the four rules), the three ballad styles (stop-start
//          rubato, repeated quarter, stride ballad), inner-voice movement, four-voice training, and an arrangement.
//  k-comp  Comping vocabulary (C3, top-10 #7): Beat-3 Charleston, lead-ins, Count Basie, push-offs, accent comping,
//          two-bar patterns, free comping by rule.
//  k-impro Improvisation habits (C5 #1, #2; top-10 #9): drone improvisation, play one / rest one, play two / rest two,
//          call and response between the hands — graded on phrase organisation (phraseOrg.ts, the MTNA rubric).
//
// Melodies: only the original heads of src/content/heads.ts (servedHeads). Chord charts of standards are not used here.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId, Hand } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { genHeadPiano, SERVED, decodeHead } from './headDrills';
import { candidates, type VLChord } from './voiceLead';
import { HEADS } from '../../content/heads';
import { chordKind, chordUnder, headIn, harmEvents, HARM_STYLES, phraseCount, type HeadIn, type HNote } from '../heads';
import {
  bassNote,
  bpAlternate,
  bpShell,
  chordAt,
  compHits,
  guideShell,
  nearestTo,
  pitchIn,
  rolledBass,
  rootless,
  sharedHands,
  sharedVoicing,
  shellA,
  shellB,
  shuttle,
  sixPlaces,
  SQI,
  stridePattern,
  strideComp,
  thumbOf,
  walkingTenths,
  withFifthBass,
  withTritoneBass,
  type CompRhythmId,
  type LEv,
  type SQ,
  type SscPat,
  type StridePat,
  type TChord,
} from '../soloPiano';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const KEY_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** All 12 keys, round the cycle of 4ths from C (the owner's 12-key rule). */
export const SP_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const QIV: Record<SQ, number[]> = { maj7: [0, 4, 7, 11], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9] };

// ───────────────────────────── progressions (degrees above the key) ─────────────────────────────

type Prog = { d: number; q: SQ; beats: number }[];
/** ii–V–I–VI, a chord a bar (one screen). */
const LOOP: Prog = [{ d: 2, q: 'm7', beats: 4 }, { d: 7, q: '7', beats: 4 }, { d: 0, q: 'maj7', beats: 4 }, { d: 9, q: '7', beats: 4 }];
/** ii–V–I with the I held (two-note shells, Ex. B.3). */
const IIVI: Prog = [{ d: 2, q: 'm7', beats: 4 }, { d: 7, q: '7', beats: 4 }, { d: 0, q: 'maj7', beats: 8 }];
/** The jazz blues (12 bars). */
const BLUES: Prog = [
  { d: 0, q: '7', beats: 4 }, { d: 5, q: '7', beats: 4 }, { d: 0, q: '7', beats: 4 }, { d: 7, q: 'm7', beats: 2 }, { d: 0, q: '7', beats: 2 },
  { d: 5, q: '7', beats: 4 }, { d: 6, q: 'dim7', beats: 4 }, { d: 0, q: '7', beats: 4 }, { d: 9, q: '7', beats: 4 },
  { d: 2, q: 'm7', beats: 4 }, { d: 7, q: '7', beats: 4 }, { d: 0, q: '7', beats: 2 }, { d: 9, q: '7', beats: 2 }, { d: 2, q: 'm7', beats: 2 }, { d: 7, q: '7', beats: 2 },
];
const tchords = (p: Prog, key: number): TChord[] => {
  let at = 0;
  return p.map((c) => {
    const x = { root: mod12(key + c.d), q: c.q, beat: at, beats: c.beats };
    at += c.beats;
    return x;
  });
};
const sharpKey = (key: number): boolean => [7, 2, 9, 4, 11].includes(mod12(key));
const symOf = (c: { root: number; q: SQ }, key: number): string => (sharpKey(key) ? SHARP : FLAT)[c.root] + SQI[c.q].label;
/** The chart line: one entry a bar. */
function chartLine(cs: TChord[], bars: number, key: number): string[] {
  const out: string[] = [];
  for (let b = 0; b < bars; b++) out.push(cs.filter((c) => c.beat >= b * 4 - 1e-6 && c.beat < b * 4 + 4 - 1e-6).map((c) => symOf(c, key)).join('  ') || '%');
  return out;
}
const barsOf = (cs: TChord[]): number => Math.ceil((cs[cs.length - 1].beat + cs[cs.length - 1].beats) / 4);
/** A head chart chord as a quality. */
export function sqOf(iv: number[]): SQ {
  const has = (x: number) => iv.some((i) => mod12(i) === x);
  switch (chordKind(iv)) {
    case 'maj':
      return has(9) && !has(11) ? '6' : 'maj7';
    case 'min':
    case 'mmaj':
      return has(9) && !has(10) ? 'm6' : 'm7';
    case 'dom':
      return '7';
    case 'half':
      return 'm7b5';
    default:
      return 'dim7';
  }
}
/** Bars [from, to) of a head as timed chords (beats from the phrase start). */
function headChords(hi: HeadIn, from: number, to: number): TChord[] {
  return hi.chords
    .filter((c) => c.bar >= from && c.bar < to)
    .map((c) => ({ root: mod12(c.root), q: sqOf(c.iv), beat: (c.bar - from) * 4 + c.at, beats: c.beats }));
}
const pretty = (s: string): string => s.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯');

// ───────────────────────────── building a drill ─────────────────────────────

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, hand: Hand, ps: number[], extra: Partial<ExpNote> = {}): void {
    const id = ps.length > 1 ? ++this.cid : undefined;
    for (const p of ps) this.list.push({ pitch: p, beat: r6(beat), dur: r6(Math.max(0.25, dur)), hand, ...(id !== undefined ? { chordId: id } : {}), ...extra });
  }
  lh(evs: LEv[], shift = 0): this {
    for (const e of evs) this.add(e.beat + shift, e.dur, 'L', e.notes);
    return this;
  }
}
interface MkOpts {
  title: T2;
  bpm: number;
  beats?: number;
  chart?: string[];
  goal?: Partial<DrillGoal>;
  tonic?: { key: number; minor?: boolean };
  keySig?: string;
  extra?: Partial<Drill>;
  /** Spec fields the drill sets (hands follow the notes; swing). The item id is built from the final spec. */
  spec?: Partial<DrillSpec>;
}
function mk(s: DrillSpec, n: Notes, o: MkOpts): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const hands = new Set(notes.map((x) => x.hand));
  const end = Math.max(...notes.map((x) => x.beat + x.dur));
  const spec: DrillSpec = { ...s, hands: hands.size > 1 ? 'RL' : hands.has('R') ? 'R' : 'L', ...(o.spec ?? {}) };
  return {
    spec,
    itemId: itemIdOf(spec),
    title: o.title,
    notes,
    beats: o.beats ?? Math.ceil(end / 4) * 4,
    meter: 4,
    keySig: o.keySig ?? SIG[mod12(s.key)],
    // the left hand and the textures: the register feedback (C1 grading: "muddy" or "thin")
    goal: { evenness: false, hands: hands.size > 1, ...(s.family === 'k-lh' || s.family === 'k-tex' ? { register: true } : {}), ...(o.goal ?? {}) },
    startBpm: Math.round(s.tempo ?? o.bpm),
    ...(o.chart ? { chart: o.chart } : {}),
    tonic: o.tonic ?? { key: mod12(s.key) },
    ...(o.extra ?? {}),
  };
}
const keyT = (key: number): string => KEY_NAME[mod12(key)];
const ttl = (what: T2, key: number, more?: T2): T2 => t(`${what.en}${more ? ` · ${more.en}` : ''} · ${keyT(key)}`, `${what.he}${more ? ` · ${more.he}` : ''} · ${keyT(key)}`);
const PROG_T: Record<string, T2> = {
  loop: t('ii–V–I–VI', 'ii–V–I–VI'),
  iivi: t('ii–V–I', 'ii–V–I'),
  blues: t('blues', 'בלוז'),
};

// ───────────────────────────── k-lh: the left hand for solo piano ─────────────────────────────

/** Chord events of a whole-bar-per-chord shell ladder: each chord a voicing, held for its length. */
function heldVoicings(cs: TChord[], v: (c: TChord, i: number, prev: number[] | null) => number[]): LEv[] {
  let prev: number[] | null = null;
  // each voicing struck on 1 and 3 while its chord lasts (a half note at a time: a steady pulse to time against)
  return cs.flatMap((c, i) => {
    const x = v(c, i, prev);
    prev = x;
    const out: LEv[] = [];
    for (let b = c.beat; b < c.beat + c.beats - 1e-6; b += 2) out.push({ beat: b, dur: Math.min(2, c.beat + c.beats - b), notes: x, role: 'chord' as const });
    return out;
  });
}
/** The first 8 bars of the original head "Corner Bench" (in the drill's key) as a chart. */
function cornerBench(key: number): { cs: TChord[]; chart: string[]; tonic: { key: number } } {
  const hi = headIn(HEADS[0], key, 'piano');
  return { cs: headChords(hi, 0, 8), chart: hi.bars.slice(0, 8).map(pretty), tonic: hi.tonic };
}
/** A k-lh chart by option: 0 the loop (or ii–V–I), 1 the blues, 2 Corner Bench (A). */
function lhChart(op: number, key: number, iivi = false): { cs: TChord[]; chart: string[]; name: T2; tonic: { key: number } } {
  if (op === 2) {
    const cb = cornerBench(key);
    return { ...cb, name: t(HEADS[0].title.en, HEADS[0].title.he) };
  }
  const p = op === 1 ? BLUES : iivi ? IIVI : LOOP;
  const cs = tchords(p, key);
  return { cs, chart: chartLine(cs, barsOf(cs), key), name: PROG_T[op === 1 ? 'blues' : iivi ? 'iivi' : 'loop'], tonic: { key: mod12(key) } };
}

export const LH_TITLE: Record<string, T2> = {
  'lh-bass': t('Bass register', 'רגיסטר הבס'),
  'lh-six': t('One chord, six places', 'אקורד אחד, שישה מקומות'),
  'lh-bp3': t('Two-note shells: the 3rd', 'שלד בשני צלילים: הטרצה'),
  'lh-bpalt': t('Two-note shells: 3rd and 7th', 'שלד בשני צלילים: טרצה וספטימה'),
  'lh-shA': t('Type A bass shells (1-3-7)', 'שלדי בס A ‏(1-3-7)'),
  'lh-shB': t('Type B bass shells (1-7-10)', 'שלדי בס B ‏(1-7-10)'),
  'lh-roll': t('Bass first, shell on the beat', 'בס קודם, שלד על הפעמה'),
  'lh-sstride': t('Shell stride', 'סטרייד שלדים'),
  'lh-strong': t('Shells on the strong beats', 'שלדים על הפעמות החזקות'),
  'lh-walk10': t('Walking 10ths', 'דצימות הולכות'),
  'lh-head10': t('A whole head in 10ths', 'שיר שלם בדצימות'),
  'lh-var1': t('Stride variations: patterns', 'וריאציות סטרייד: תבניות'),
  'lh-332': t('Stride in 3 + 3 + 2', 'סטרייד ב־3 + 3 + 2'),
  'lh-var2': t('Stride variations: anticipations', 'וריאציות סטרייד: הקדמות'),
  'lh-34': t('Stride in 3 against 4', 'סטרייד ב־3 נגד 4'),
  'lh-break': t('LH breaks: the RH fills', 'הפסקות ביד שמאל: ימין ממלאת'),
  'lh-scomp': t('Stride-style comping', 'ליווי בסגנון סטרייד'),
  'lh-shuttle': t('The left-hand shuttle', 'השאטל של יד שמאל'),
};
const SIX_Q: SQ[] = ['maj7', '7', 'm7'];
const SIX_T = [t('bass', 'בס'), t('2-note shell', 'שלד 2'), t('A shell', 'שלד A'), t('B shell', 'שלד B'), t('rootless A', 'בלי יסוד A'), t('rootless B', 'בלי יסוד B')];
const VAR1: StridePat[] = ['peace', 'reverse', 'skip'];
const VAR1_T: T2[] = [t('Peace Piece pattern', 'תבנית פיס פיס'), t('reversed stride', 'סטרייד הפוך'), t('skip beat', 'פעמה מדולגת'), t('a new pattern every 4 bars', 'תבנית חדשה כל 4 תיבות')];
const VAR2: StridePat[] = ['antic-bass', 'antic-both', 'early'];
const VAR2_T: T2[] = [t('anticipated bass', 'בס מוקדם'), t('anticipated bass and chord', 'בס ואקורד מוקדמים'), t('the chord placed earlier', 'האקורד מוקדם')];
const SSC: SscPat[] = ['charleston', 'reverse', 'garland', 'pushoff', 'leadin'];
const SSC_T: T2[] = [t('Charleston', 'צ׳רלסטון'), t('reverse Charleston', 'צ׳רלסטון הפוך'), t('Red Garland', 'רד גרלנד'), t('push-off', 'פוש־אוף'), t('lead-in', 'כניסה מקדימה')];
/** Diatonic walking-10th lines (major-scale degrees a beat): C6 → F6 → C6. */
const WALK10_LINE = [0, 1, 2, 3, 3, 4, 5, 4, 3, 2, 1, 0];
/** The diminished walkup I–♯I°–ii–♯ii° → iii–VI–ii–V–I ("The Diminished Walkup Progression", FdlfuPBGKu8), one 10th a beat. */
const DIM_WALKUP: Prog = [
  { d: 0, q: '6', beats: 1 }, { d: 1, q: 'dim7', beats: 1 }, { d: 2, q: 'm7', beats: 1 }, { d: 3, q: 'dim7', beats: 1 },
  { d: 4, q: 'm7', beats: 2 }, { d: 9, q: '7', beats: 2 }, { d: 2, q: 'm7', beats: 2 }, { d: 7, q: '7', beats: 2 }, { d: 0, q: '6', beats: 4 },
];

function genLh(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const n = new Notes();
  const what = LH_TITLE[s.kind];
  switch (s.kind) {
    case 'lh-bass': {
      // [PSJP-B] bass notes as low as possible: the chart's roots on 1 and 3, single, then root + 5th.
      const ch = lhChart(0, key);
      for (const c of ch.cs) for (let b = c.beat; b < c.beat + c.beats; b += 2) n.add(b, 2, 'L', bassNote(c, op === 1));
      return mk(s, n, { title: ttl(what, key, op === 1 ? t('root + 5th', 'יסוד + קווינטה') : t('roots', 'יסודות')), bpm: 72, chart: ch.chart, tonic: ch.tonic });
    }
    case 'lh-six': {
      // [PSJP-B Ex. B.16] one chord through the six positions, free time first (the intervals change with the register).
      const c = { root: key, q: SIX_Q[op % 3] };
      sixPlaces(c).forEach((v, i) => n.add(i * 2, 2, 'L', v));
      void SIX_T;
      return mk(s, n, { title: ttl(what, key, t(symOf(c, key), symOf(c, key))), bpm: 60, chart: [symOf(c, key), symOf(c, key), symOf(c, key)] });
    }
    case 'lh-bp3': {
      // two-note shells with the 3rd (D3+F3, G2+B2, C3+E3), then the 10th (C2+E3), then the 9th under the thumb.
      const ch = lhChart(0, key, true);
      const form = op === 0 ? '3' : '10';
      n.lh(heldVoicings(ch.cs, (c) => bpShell(c, form, op === 2)));
      const more = op === 0 ? t('root + 3rd', 'יסוד + טרצה') : op === 1 ? t('root + 10th', 'יסוד + דצימה') : t('the 9th under the thumb', 'הנונה מתחת לאגודל');
      return mk(s, n, { title: ttl(what, key, more), bpm: 72, chart: ch.chart, tonic: ch.tonic });
    }
    case 'lh-bpalt': {
      // alternating 3rd and 7th for the voice leading (Ex. B.3; the 7th-first form is the doc's voicing — verify).
      const ch = op === 2 ? lhChart(1, key) : lhChart(0, key, true);
      const vs = bpAlternate(ch.cs, op === 1 ? '7' : '3');
      n.lh(heldVoicings(ch.cs, (_c, i) => vs[i]));
      const more = op === 0 ? t('3rd first', 'מתחילים בטרצה') : op === 1 ? t('7th first', 'מתחילים בספטימה') : PROG_T.blues;
      return mk(s, n, { title: ttl(what, key, more), bpm: 72, chart: ch.chart, tonic: ch.tonic });
    }
    case 'lh-shA': {
      const ch = lhChart(op, key);
      n.lh(heldVoicings(ch.cs, (c) => shellA(c)));
      return mk(s, n, { title: ttl(what, key, ch.name), bpm: 72, chart: ch.chart, tonic: ch.tonic });
    }
    case 'lh-shB': {
      // Type B; the 9th under the thumb; the 5th for the root; the tritone for the root on the V (ii and I in Type A).
      const ch = lhChart(0, key, true);
      const v = (c: TChord): number[] => (op === 1 ? shellB(c, true) : op === 2 ? withFifthBass(shellB(c), c) : op === 3 ? (c.q === '7' ? withTritoneBass(c) : shellA(c)) : shellB(c));
      n.lh(heldVoicings(ch.cs, v));
      const more = [t('1-7-10', '1-7-10'), t('the 9th under the thumb', 'הנונה מתחת לאגודל'), t('the 5th for the root', 'הקווינטה במקום היסוד'), t('the tritone for the root', 'הטריטון במקום היסוד')][op];
      return mk(s, n, { title: ttl(what, key, more), bpm: 72, chart: ch.chart, tonic: ch.tonic });
    }
    case 'lh-roll': {
      // [PSJP-B "not simultaneous"] the bass an 8th before, the shell on the beat; op 1: the bass left out (medium / fast).
      const ch = lhChart(0, key, true);
      if (op === 0) n.lh(rolledBass(ch.cs, (c) => shellA(c)));
      else for (const c of ch.cs) for (let b = c.beat; b < c.beat + c.beats; b += 2) n.add(b + 4, 2, 'L', shellA(c).slice(1));
      return mk(s, n, { title: ttl(what, key, op === 0 ? t('rolled bass', 'בס מתגלגל') : t('shells alone, faster', 'שלדים בלבד, מהר יותר')), bpm: op === 0 ? 66 : 100, chart: ['', ...ch.chart], tonic: ch.tonic });
    }
    case 'lh-sstride':
    case 'lh-strong':
    case 'lh-var1':
    case 'lh-332':
    case 'lh-var2':
    case 'lh-34': {
      const ch = s.kind === 'lh-sstride' ? lhChart(op, key) : s.kind === 'lh-strong' ? lhChart(0, key) : lhChart(op === 3 && s.kind === 'lh-var1' ? 1 : 0, key);
      const bars = barsOf(ch.cs);
      let evs: LEv[];
      let more: T2 | undefined;
      if (s.kind === 'lh-sstride') {
        evs = stridePattern(ch.cs, bars, 'shell-stride');
        more = ch.name;
      } else if (s.kind === 'lh-strong') {
        evs = stridePattern(ch.cs, bars, op === 0 ? 'shells-strong' : 'evans');
        more = op === 0 ? t('shell on 1 and 3', 'שלד על 1 ו־3') : t('Bill Evans: shell first, bass after', 'ביל אוונס: שלד קודם, בס אחר כך');
      } else if (s.kind === 'lh-var1') {
        if (op < 3) evs = stridePattern(ch.cs, bars, VAR1[op]);
        else {
          // called out: a new pattern every 4 bars (stride → Peace Piece → reversed), over the blues
          const pats: StridePat[] = ['stride', 'peace', 'reverse'];
          evs = pats.flatMap((p, k) => stridePattern(ch.cs, bars, p).filter((e) => e.beat >= k * 16 - 1e-6 && e.beat < k * 16 + 16 - 1e-6));
        }
        more = VAR1_T[op];
      } else if (s.kind === 'lh-332') {
        evs = stridePattern(ch.cs, bars, 'three32');
      } else if (s.kind === 'lh-var2') {
        evs = stridePattern(ch.cs, bars, VAR2[op]);
        more = VAR2_T[op];
      } else {
        // 3 against 4: three bars of the cell realign on bar 4 — the loop, then its first three bars again
        evs = stridePattern([...ch.cs, ...ch.cs.map((c) => ({ ...c, beat: c.beat + 16 }))], 6, 'three4').filter((e) => e.beat < 24 - 1e-6);
        ch.chart.push(...ch.chart.slice(0, 2));
      }
      n.lh(evs);
      return mk(s, n, { title: ttl(what, key, more), bpm: s.kind === 'lh-sstride' || s.kind === 'lh-strong' ? 76 : 84, chart: ch.chart, tonic: ch.tonic, spec: { swing: true } });
    }
    case 'lh-walk10': {
      // [7SS #2] walking 10ths: diatonic C6 → F6 → C6; the diminished walkup; the 9th under the thumb.
      if (op === 1) {
        const cs = tchords(DIM_WALKUP, key);
        let b = 0;
        for (const c of cs) {
          for (let k = 0; k < c.beats; k++) {
            const lo = pitchIn(c.root, 33);
            n.add(b + k, 1, 'L', [lo, lo + 12 + SQI[c.q].third]);
          }
          b += c.beats;
        }
        return mk(s, n, { title: ttl(what, key, t('the diminished walkup', 'העלייה המוקטנת')), bpm: 72, chart: chartLine(cs, 4, key) });
      }
      const line = walkingTenths(key, WALK10_LINE, {}, op === 2);
      line.forEach((v, i) => n.add(i, 1, 'L', v));
      n.add(12, 4, 'L', walkingTenths(key, [0], {}, op === 2)[0]);
      const I = symOf({ root: key, q: '6' }, key);
      const IV = symOf({ root: mod12(key + 5), q: '6' }, key);
      return mk(s, n, { title: ttl(what, key, op === 2 ? t('the 9th under the thumb', 'הנונה מתחת לאגודל') : t('I → IV → I', 'I → IV → I')), bpm: 72, chart: [I, IV, `${IV}  ${I}`, I] });
    }
    case 'lh-head10': {
      // "a whole tune in 10ths" (his practice recommendation [7SS #2]): root + 10th on 1, the 5th + its 10th on 3.
      const { head } = decodeHead(op);
      const hi = headIn(head, key, 'piano');
      const cs = headChords(hi, 0, hi.bars.length);
      for (let bar = 0; bar < hi.bars.length; bar++)
        for (const b of [0, 2]) {
          const c = chordAt(cs, bar * 4 + b);
          const fresh = Math.abs(c.beat - (bar * 4 + b)) < 1e-6 || b === 0;
          const lo = fresh ? pitchIn(c.root, 31) : pitchIn(c.root + SQI[c.q].fifth, 31);
          const ten = fresh ? lo + 12 + SQI[c.q].third : lo + 12 + mod12(SQI[c.q].seventh - SQI[c.q].fifth);
          n.add(bar * 4 + b, 2, 'L', [lo, ten]);
        }
      return mk(s, n, { title: ttl(what, key, t(head.title.en, head.title.he)), bpm: 76, chart: hi.bars.map(pretty), tonic: hi.tonic, extra: { paged: true }, spec: { swing: true } });
    }
    case 'lh-break': {
      // [7SS #1] take breaks: 2 bars of stride, 2 bars the LH rests while the RH cascades (free bars, graded by scale and
      // activity); a click on 2 and 4 (a time drill).
      const ch = lhChart(op === 1 ? 1 : 0, key);
      const cs = op === 1 ? ch.cs : [...ch.cs, ...ch.cs.map((c) => ({ ...c, beat: c.beat + 16 }))];
      const bars = op === 1 ? 12 : 8;
      const evs = stridePattern(cs, bars, 'stride').filter((e) => Math.floor(e.beat / 8) % 2 === 0);
      n.lh(evs);
      const windows: [number, number][] = [];
      for (let b = 8; b < bars * 4; b += 16) windows.push([b, Math.min(b + 8, bars * 4)]);
      const scale = cs.map((c) => ({ from: c.beat, to: c.beat + c.beats, pcs: scalePcs(c) }));
      const model: { beat: number; dur: number; pitch: number }[] = [];
      for (const [a, z] of windows)
        for (let b = a; b < z; b += 0.5) {
          const c = chordAt(cs, b);
          const tones = [0, SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh].map((x) => pitchIn(c.root + x, 64));
          tones.sort((x, y) => x - y);
          const k = Math.round((b - a) * 2);
          model.push({ beat: b, dur: 0.5, pitch: tones[k % 4] + (Math.floor(k / 4) % 2 === 0 ? 0 : 12) });
        }
      // the landings: a chord tone on every beat of the fill (any octave), the model's note written
      for (const m of model.filter((x) => Math.abs(x.beat - Math.round(x.beat)) < 1e-6)) {
        const c = chordAt(cs, m.beat);
        n.add(m.beat, 1, 'R', [m.pitch], { land: [0, SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh].map((x) => mod12(c.root + x)) });
      }
      const chart = op === 1 ? ch.chart : [...ch.chart, ...ch.chart];
      return mk(s, n, { title: ttl(what, key, ch.name), bpm: 90, beats: bars * 4, chart, tonic: ch.tonic, goal: { free: { windows, scale, minPerBar: 3, model } }, extra: { click: '24' }, spec: { hands: 'RL', swing: true } });
    }
    case 'lh-scomp': {
      // [SSC] the LH alone covers bass and chord, syncopated: Charleston, reverse, Red Garland, push-off, lead-in.
      const ch = lhChart(op === 4 ? 0 : 0, key);
      n.lh(strideComp(ch.cs, barsOf(ch.cs), SSC[op]));
      return mk(s, n, { title: ttl(what, key, SSC_T[op]), bpm: 84, chart: ch.chart, tonic: ch.tonic, spec: { swing: true } });
    }
    case 'lh-shuttle': {
      // [SHUT] bass ↔ a mid-register voicing under a sustained RH note (the 3rd above middle C, a bar long).
      const ch = lhChart(0, key);
      n.lh(shuttle(ch.cs, barsOf(ch.cs), op === 1 ? 1 : 0));
      for (const c of ch.cs) {
        const lhTop = Math.max(...n.list.filter((x) => x.hand === 'L' && x.beat >= c.beat - 1e-6 && x.beat < c.beat + c.beats - 1e-6).map((x) => x.pitch));
        let p = pitchIn(c.root + (c.q === 'maj7' ? 14 : SQI[c.q].third), 64);
        while (p <= lhTop) p += 12;
        n.add(c.beat, c.beats, 'R', [p], { accent: true });
      }
      return mk(s, n, { title: ttl(what, key, op === 0 ? t('bass, then the voicing', 'בס, ואז הקול') : t('voicing first, bass after', 'הקול קודם, הבס אחר כך')), bpm: 66, chart: ch.chart, tonic: ch.tonic });
    }
  }
  throw new Error(`Unknown k-lh kind: ${s.kind}`);
}
/** The chord-scale pitch classes (ionian / mixolydian / dorian / locrian / whole-half) for free bars. */
function scalePcs(c: { root: number; q: SQ }): number[] {
  const S: Record<SQ, number[]> = { maj7: [0, 2, 4, 5, 7, 9, 11], '6': [0, 2, 4, 5, 7, 9, 11], '7': [0, 2, 4, 5, 7, 9, 10], m7: [0, 2, 3, 5, 7, 9, 10], m6: [0, 2, 3, 5, 7, 9, 10], m7b5: [0, 1, 3, 5, 6, 8, 10], dim7: [0, 2, 3, 5, 6, 8, 9, 11] };
  return S[c.q].map((x) => mod12(c.root + x));
}

// ───────────────────────────── k-tex: solo-piano textures through the heads ─────────────────────────────

/** The melody notes of a phrase, beats from the phrase start. */
const melIn = (hi: HeadIn, from: number, to: number): HNote[] => hi.notes.filter((x) => x.beat >= from * 4 - 1e-6 && x.beat < to * 4 - 1e-6).map((x) => ({ ...x, beat: r6(x.beat - from * 4) }));
/** Is a melody note harmonised (beats 1 and 3, and where a chord starts — the heads' default pick)? */
const picked = (nt: HNote, cs: TChord[]): boolean => {
  const inBar = nt.beat - Math.floor(nt.beat / 4 + 1e-9) * 4;
  return Math.abs(inBar) < 1e-6 || Math.abs(inBar - 2) < 1e-6 || cs.some((c) => Math.abs(c.beat - nt.beat) < 1e-6);
};
/** Keep a LH voicing below the melody sounding over it (an octave down where they would meet; never under A1). */
function under(v: number[], ceiling: number): number[] {
  let x = v;
  while (Math.max(...x) >= ceiling && Math.min(...x) - 12 >= 33) x = x.map((p) => p - 12);
  return x;
}
const melTop = (mel: HNote[], from: number, to: number): number => {
  const over = mel.filter((m) => m.beat < to - 1e-6 && m.beat + m.dur > from + 1e-6).map((m) => m.pitch);
  return over.length ? Math.min(...over) : 128;
};
const TONES = (c: { root: number; q: SQ }): number[] => [0, SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh, SQI[c.q].ninth].map((x) => mod12(c.root + x));

export const TEX_TITLE: Record<string, T2> = {
  'tx-bass': t('Melody + bass notes', 'מנגינה + צלילי בס'),
  'tx-bp': t('Melody + two-note shells', 'מנגינה + שלד בשני צלילים'),
  'tx-shell': t('Melody + bass shells', 'מנגינה + שלדי בס'),
  'tx-call': t('Call and response', 'שאלה ותשובה'),
  'tx-sstride': t('Melody over shell stride', 'מנגינה מעל סטרייד שלדים'),
  'tx-under': t('RH notes under the melody', 'צלילים מתחת למנגינה'),
  'tx-shuttle': t('Bass in 2, RH shuttle', 'בס בשתיים, שאטל ביד ימין'),
  'tx-oct': t('Octave melody, filled', 'מנגינה באוקטבות, ממולאות'),
  'tx-drape': t('Bass in 2, RH drape or melodic', 'בס בשתיים, ימין עוטפת או מלודית'),
  'tx-closed': t('Closed position, no bass', 'מצב צמוד, בלי בס'),
  'tx-drop2': t('Drop 2 with sidesteps', 'דרופ 2 עם צעדי צד'),
  'tx-sowhat': t('So What voicings under a melody', 'וויסינג סו וואט מתחת למנגינה'),
  'tx-stride': t('Stride under the head', 'סטרייד מתחת לשיר'),
  'tx-shared': t('Shared-hands voicings', 'וויסינג בשתי ידיים'),
  'tx-stop': t('Stop-start rubato ballad', 'בלדה ברובאטו עצור־וזז'),
  'tx-repq': t('Repeated-quarter ballad', 'בלדה ברבעים חוזרים'),
  'tx-sballad': t('Stride ballad, straight-8th ballad', 'בלדת סטרייד, בלדה בשמיניות ישרות'),
  'tx-inner': t('Inner-voice movement', 'תנועת קול פנימי'),
  'tx-4v': t('Four-voice training', 'אימון ארבעה קולות'),
  'tx-juggle': t('Juggling: an arrangement', 'ג׳אגלינג: עיבוד'),
};
const TEX_SUB: Record<string, T2> = {
  'tx-under1': t('one note under', 'צליל אחד מתחת'),
  'tx-under2': t('two notes under', 'שני צלילים מתחת'),
  'tx-oct0': t('open octave', 'אוקטבה פתוחה'),
  'tx-oct1': t('filled with one', 'ממולאת בצליל אחד'),
  'tx-oct2': t('filled with two', 'ממולאת בשניים'),
  'tx-drape': t('drape', 'עוטפת'),
  'tx-melodic': t('melodic', 'מלודית'),
  'tx-sballad': t('stride ballad', 'בלדת סטרייד'),
  'tx-s8': t('straight 8ths', 'שמיניות ישרות'),
  'tx-4vS': t('melody in the soprano', 'המנגינה בסופרן'),
  'tx-4vA': t('melody in the alto', 'המנגינה באלט'),
  'tx-4vT': t('melody in the tenor', 'המנגינה בטנור'),
  'tx-4vB': t('melody in the bass', 'המנגינה בבס'),
};
/** The level kind of a k-tex item kind (sub-kinds share a level title). */
const texBase = (kind: string): string => (kind.startsWith('tx-under') ? 'tx-under' : kind.startsWith('tx-oct') ? 'tx-oct' : kind === 'tx-melodic' ? 'tx-drape' : kind === 'tx-s8' ? 'tx-sballad' : kind.startsWith('tx-4v') ? 'tx-4v' : kind);

function genTex(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const { head, idx, phrase } = decodeHead(s.option ?? 0);
  const base = texBase(s.kind);
  // Shared hands: k-harm's hm-shared item (voiceLead.ts 'shared', graded by the four rules), as a k-tex item.
  if (s.kind === 'tx-shared') {
    const d = genHeadPiano({ ...s, family: 'k-harm', kind: 'hm-shared' });
    return { ...d, spec: { ...d.spec, family: s.family, kind: s.kind }, itemId: itemIdOf({ ...s }), title: ttl(TEX_TITLE[base], key, t(`${head.title.en}, bars ${phrase * 4 + 1}–${phrase * 4 + 4}`, `${head.title.he}, תיבות ${phrase * 4 + 1}–${phrase * 4 + 4}`)) };
  }
  const juggle = s.kind === 'tx-juggle';
  const hi = headIn(head, key, 'piano');
  const from = juggle ? 0 : phrase * 4;
  const to = juggle ? hi.bars.length : Math.min(hi.bars.length, phrase * 4 + 4);
  const cs = headChords(hi, from, to);
  const mel = melIn(hi, from, to);
  const bars = to - from;
  const n = new Notes();
  const ballad = head.feel === 'ballad';
  let bpm = ballad ? 56 : 72;
  const extra: Partial<Drill> = {};
  const melody = (o: { shorten?: (m: HNote) => number; skip?: (m: HNote) => boolean } = {}) => {
    for (const m of mel) if (!o.skip?.(m)) n.add(m.beat, o.shorten ? o.shorten(m) : m.dur, 'R', [m.pitch], { accent: true });
  };
  const sub = TEX_SUB[s.kind];
  const part = juggle ? undefined : t(`${head.title.en} ${phrase * 4 + 1}–${phrase * 4 + 4}`, `${head.title.he} ${phrase * 4 + 1}–${phrase * 4 + 4}`);
  const title = ttl(TEX_TITLE[base], key, sub && part ? t(`${part.en}, ${sub.en}`, `${part.he}, ${sub.he}`) : part ?? t(head.title.en, head.title.he));
  const twoFeel = () => {
    // bass in 2 [PSJP Ch. 7]: the root on 1, the 5th (or the new root) on 3
    for (let bar = 0; bar < bars; bar++)
      for (const b of [0, 2]) {
        const c = chordAt(cs, bar * 4 + b);
        const fresh = b === 0 || Math.abs(c.beat - (bar * 4 + b)) < 1e-6;
        n.add(bar * 4 + b, 2, 'L', [fresh ? pitchIn(c.root, 33) : pitchIn(c.root + SQI[c.q].fifth, 28)]);
      }
  };
  switch (s.kind) {
    case 'tx-bass':
      // mango 1, the simplest form: the head melody, LH roots on 1 and 3 [PSJP-A, C2 #1]
      melody();
      for (let bar = 0; bar < bars; bar++) for (const b of [0, 2]) n.add(bar * 4 + b, 2, 'L', [pitchIn(chordAt(cs, bar * 4 + b).root, 33)]);
      break;
    case 'tx-bp':
    case 'tx-shell': {
      melody();
      let prev: number[] | null = null;
      for (const c of cs) {
        const opts = s.kind === 'tx-bp' ? [bpShell(c, '3'), bpShell(c, '7'), bpShell(c, '10')] : [shellA(c), shellB(c)];
        const ceil = melTop(mel, c.beat, c.beat + c.beats);
        const v: number[] = nearestTo(opts.map((o) => under(o, ceil)), prev, 48);
        prev = v;
        n.add(c.beat, c.beats, 'L', v);
      }
      break;
    }
    case 'tx-call': {
      // [B3C; JPF B1 U8] the melody's phrase, then the LH answers in its gaps with the Beat-3 Charleston (3 and the "and"
      // of 4): the bass on 1 under every bar, the shell answering where the melody holds or rests after beat 2.
      melody();
      let prev: number[] | null = null;
      let answered = 0;
      for (let bar = 0; bar < bars; bar++) {
        const c = chordAt(cs, bar * 4);
        n.add(bar * 4, 2, 'L', [pitchIn(c.root, 33)]);
        const busy = mel.some((m) => m.beat >= bar * 4 + 2 - 1e-6 && m.beat < bar * 4 + 4 - 1e-6);
        if (busy && !(bar === bars - 1 && answered === 0)) continue;
        answered++;
        for (const h of [2, 3.5]) {
          const ch = chordAt(cs, bar * 4 + h);
          const v = guideShell(ch, prev);
          prev = v;
          n.add(bar * 4 + h, h === 2 ? 1 : 0.5, 'L', under(v, melTop(mel, bar * 4 + h, bar * 4 + h + 0.5)));
        }
      }
      break;
    }
    case 'tx-sstride':
    case 'tx-stride':
    case 'tx-sballad': {
      melody();
      const evs = stridePattern(cs, bars, s.kind === 'tx-sstride' ? 'shell-stride' : 'stride');
      for (const e of evs) n.add(e.beat, e.dur, 'L', e.role === 'chord' ? under(e.notes, melTop(mel, e.beat, e.beat + e.dur)) : e.notes);
      if (s.kind === 'tx-sballad') bpm = 58;
      break;
    }
    case 'tx-under1':
    case 'tx-under2': {
      // [PSJP-B "combining the hands"] an LH bass shell; on the harmonised melody notes the RH adds one or two chord
      // tones under the melody, avoiding doubling (the LH's notes and the melody's pitch class).
      const k = s.kind === 'tx-under1' ? 1 : 2;
      let prev: number[] | null = null;
      for (const c of cs) {
        const v: number[] = nearestTo([shellA(c), shellB(c)].map((o) => under(o, melTop(mel, c.beat, c.beat + c.beats))), prev, 48);
        prev = v;
        n.add(c.beat, c.beats, 'L', v);
      }
      for (const m of mel) {
        const c = chordAt(cs, m.beat);
        if (!picked(m, cs)) {
          n.add(m.beat, m.dur, 'R', [m.pitch], { accent: true });
          continue;
        }
        const lhPcs = new Set(n.list.filter((x) => x.hand === 'L' && x.beat <= m.beat + 1e-6 && x.beat + x.dur > m.beat + 1e-6).map((x) => mod12(x.pitch)));
        const pool = TONES(c).filter((p) => p !== mod12(m.pitch) && !lhPcs.has(p));
        const below = pool.map((p) => m.pitch - (mod12(m.pitch - p) || 12)).filter((p) => p >= m.pitch - 11).sort((a, b) => b - a).slice(0, k);
        n.add(m.beat, m.dur, 'R', [...below, m.pitch]);
      }
      break;
    }
    case 'tx-oct0':
    case 'tx-oct1':
    case 'tx-oct2': {
      // [PSJP-B] an open octave over the melody, or the octave filled with 1, 2 (or 3) notes — "shout chorus style" —
      // over an LH rootless voicing.
      const fill = s.kind === 'tx-oct0' ? 0 : s.kind === 'tx-oct1' ? 1 : 2;
      let ty: 'A' | 'B' = 'A';
      let prev: number[] | null = null;
      for (const c of cs) {
        const v: number[] = nearestTo([rootless(c, 'A'), rootless(c, 'B')].map((o) => under(o, melTop(mel, c.beat, c.beat + c.beats) - 12)), prev, 52);
        prev = v;
        ty = ty === 'A' ? 'B' : 'A';
        n.add(c.beat, c.beats, 'L', v);
      }
      for (const m of mel) {
        const c = chordAt(cs, m.beat);
        if (!picked(m, cs) || fill === 0) {
          n.add(m.beat, m.dur, 'R', picked(m, cs) ? [m.pitch - 12, m.pitch] : [m.pitch], { accent: true });
          continue;
        }
        const pool = TONES(c).filter((p) => p !== mod12(m.pitch));
        const mids = pool.map((p) => m.pitch - (mod12(m.pitch - p) || 12)).filter((p) => p > m.pitch - 12).sort((a, b) => b - a);
        const pick = fill === 1 ? mids.slice(0, 1) : [mids[0], mids[mids.length - 1]].filter((x, i, a) => x !== undefined && a.indexOf(x) === i);
        n.add(m.beat, m.dur, 'R', [m.pitch - 12, ...pick, m.pitch]);
      }
      break;
    }
    case 'tx-shuttle': {
      // mango 2 [PSJP Ch. 7; "Solo Piano: 3 Ways to Add Harmony in the Right Hand", ejAwb7ydYyQ]: the LH a bass in 2, the
      // RH alternates melody and comping hits — on a long melody note the RH drops to a guide-tone dyad on the "and".
      twoFeel();
      for (const m of mel) {
        const long = m.dur >= 2 - 1e-6;
        n.add(m.beat, long ? 1 : m.dur, 'R', [m.pitch], { accent: true });
        if (long) {
          const c = chordAt(cs, m.beat + 1.5);
          n.add(m.beat + 1.5, 0.5, 'R', under(guideShell(c, null).map((p) => p + 12), m.pitch));
        }
      }
      break;
    }
    case 'tx-drape':
    case 'tx-melodic': {
      twoFeel();
      if (s.kind === 'tx-drape') {
        // drape: the melody on top while the RH reaches down to hold a mid-register chord tone under it
        for (const m of mel) {
          if (!picked(m, cs)) {
            n.add(m.beat, m.dur, 'R', [m.pitch], { accent: true });
            continue;
          }
          const c = chordAt(cs, m.beat);
          const g = [SQI[c.q].third, SQI[c.q].seventh].map((x) => mod12(c.root + x)).filter((p) => p !== mod12(m.pitch));
          const low = g.map((p) => m.pitch - (mod12(m.pitch - p) || 12)).filter((p) => p >= m.pitch - 12).sort((a, b) => b - a)[0];
          n.add(m.beat, m.dur, 'R', low !== undefined ? [low, m.pitch] : [m.pitch]);
        }
      } else {
        // melodic: the melody, and in its long notes and rests a chord-tone answer that implies the harmony in the line
        for (const m of mel) {
          const long = m.dur >= 2 - 1e-6;
          n.add(m.beat, long ? 1 : m.dur, 'R', [m.pitch], { accent: true });
          if (long) {
            const c = chordAt(cs, m.beat + 1);
            const tones = [SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh].map((x) => pitchIn(c.root + x, m.pitch - 12)).sort((a, b) => a - b);
            tones.forEach((p, k) => n.add(m.beat + 1 + k * 0.5, 0.5, 'R', [p]));
          }
        }
      }
      break;
    }
    case 'tx-closed':
    case 'tx-drop2': {
      // mango 4, no bass [PSJP Ch. 8]: closed position — the RH four notes with the melody on top, the LH doubling the
      // melody an octave lower; drop 2 — the second voice from the top dropped to the LH. Sidesteps (the block a half step
      // above an 8th before a long target) after "Deep Dive on Locked Hands Comping" (JfRTBqrK48U) — verify.
      const style = s.kind === 'tx-closed' ? 'close' : 'drop2';
      const evs = harmEvents(hi, from, to, HARM_STYLES[style]);
      const g0 = { type: HARM_STYLES[style].type, lo: HARM_STYLES[style].lo, hi: HARM_STYLES[style].hi, over: false };
      let prev: number[] | null = null;
      const done = new Set<number>();
      for (const e of evs) {
        const cands = candidates(e.chord, g0);
        if (!cands.length) continue;
        const v: number[] = nearestTo(cands, prev, e.note.pitch - 6);
        prev = v;
        const beat = r6(e.note.beat - from * 4);
        done.add(beat);
        if (style === 'close') {
          n.add(beat, e.note.dur, 'R', v);
          n.add(beat, e.note.dur, 'L', [e.note.pitch - 12]);
        } else {
          const srt = [...v].sort((a, b) => a - b);
          if (e.note.dur >= 2 - 1e-6 && beat >= 0.5) {
            n.add(beat - 0.5, 0.5, 'L', [srt[0] + 1]);
            n.add(beat - 0.5, 0.5, 'R', srt.slice(1).map((p) => p + 1));
          }
          n.add(beat, e.note.dur, 'L', [srt[0]]);
          n.add(beat, e.note.dur, 'R', srt.slice(1));
        }
      }
      for (const m of mel) {
        if (done.has(m.beat)) continue;
        const sidestepped = n.list.some((x) => Math.abs(x.beat + 0.5 - m.beat) < 1e-6 && done.has(r6(x.beat + 0.5)));
        if (sidestepped && m.dur < 0.6) continue;
        n.add(m.beat, m.dur, 'R', [m.pitch], { accent: true });
        if (style === 'close') n.add(m.beat, m.dur, 'L', [m.pitch - 12]);
      }
      break;
    }
    case 'tx-sowhat': {
      // [PSJP Ch. 8 modal harmonisation] So What: three 4ths and a major 3rd under the melody note (E3-A3-D4-G4-B4 on Dm7),
      // where all five notes sit in the chord's mode; the LH takes the lower two.
      for (const m of mel) {
        const c = chordAt(cs, m.beat);
        const v = [m.pitch - 19, m.pitch - 14, m.pitch - 9, m.pitch - 4, m.pitch];
        const sc = scalePcs(c);
        if (picked(m, cs) && v.every((p) => sc.includes(mod12(p))) && (c.q === 'm7' || c.q === 'm6' || c.q === '7' || c.q === 'maj7' || c.q === '6')) {
          n.add(m.beat, m.dur, 'L', v.slice(0, 2));
          n.add(m.beat, m.dur, 'R', v.slice(2));
        } else n.add(m.beat, m.dur, 'R', [m.pitch], { accent: true });
      }
      for (const c of cs) if (!n.list.some((x) => x.hand === 'L' && x.beat >= c.beat - 1e-6 && x.beat < c.beat + c.beats - 1e-6)) n.add(c.beat, c.beats, 'L', [pitchIn(c.root, 36), pitchIn(c.root, 36) + 7]);
      break;
    }
    case 'tx-stop':
    case 'tx-repq':
    case 'tx-s8':
    case 'tx-inner': {
      // The ballad styles ("Three Essential Ballad Styles", QBRae05tDnA) on the shared-hands voicings [SHV]:
      //  stop-start rubato (J5aBU8RdNsE): at each chord the voicing with its melody note, stop, then the melody gesture —
      //    always in free time (Drill.rubatoOnly, rubato.ts);
      //  repeated quarter (Vnfm8aB9uvo): the voicing held, the LH thumb repeated in quarters as the timekeeper;
      //  straight 8ths (GbHGjkljKhk): the same timekeeper in straight 8ths;
      //  inner-voice movement ("5 Inner Voice Movements", Sulao_ZPU0A): on a long melody note an inner voice decorates —
      //    a half step down and back (our choice among his five; verify).
      let prev: number[] | null = null;
      for (const c of cs) {
        const first = mel.find((m) => m.beat >= c.beat - 1e-6 && m.beat < c.beat + c.beats - 1e-6);
        const mp = first && Math.abs(first.beat - c.beat) < 1e-6 ? first.pitch : null;
        const v: number[] | null = mp !== null ? sharedVoicing(c, mp, prev) : null;
        const end = c.beat + c.beats;
        if (v && mp !== null) {
          prev = v;
          const hands = sharedHands(v, mp) ?? { lh: v.slice(0, 3), rh: [...v.slice(3), mp] };
          const thumb = thumbOf(v);
          const timekeep = s.kind === 'tx-repq' || s.kind === 'tx-s8';
          n.add(c.beat, timekeep ? (s.kind === 'tx-s8' ? 0.5 : 1) : c.beats, 'L', timekeep ? hands.lh : hands.lh);
          n.add(c.beat, first!.dur, 'R', hands.rh, { accent: true });
          if (timekeep) {
            const step = s.kind === 'tx-s8' ? 0.5 : 1;
            for (let b = c.beat + step; b < end - 1e-6; b += step) n.add(b, step, 'L', [hands.lh.includes(thumb) ? thumb : hands.lh[hands.lh.length - 1]]);
          }
          if (s.kind === 'tx-inner' && first!.dur >= 2 - 1e-6 && hands.rh.length >= 2) {
            const inner = hands.rh[0];
            n.list = n.list.map((x) => (x.hand === 'R' && x.pitch === inner && Math.abs(x.beat - c.beat) < 1e-6 ? { ...x, dur: 1, chordId: x.chordId } : x));
            n.add(c.beat + 1, 0.5, 'R', [inner - 1]);
            n.add(c.beat + 1.5, r6(Math.min(first!.dur, c.beats) - 1.5), 'R', [inner]);
          }
          for (const m of mel.filter((x) => x.beat > c.beat + 1e-6 && x.beat < end - 1e-6)) n.add(m.beat, m.dur, 'R', [m.pitch], { accent: true });
        } else {
          // no shared voicing fits (the melody on the root, or no note on the chord): a Type A shell under the melody
          const sh = under(shellA(c), melTop(mel, c.beat, end));
          n.add(c.beat, c.beats, 'L', sh);
          for (const m of mel.filter((x) => x.beat >= c.beat - 1e-6 && x.beat < end - 1e-6)) n.add(m.beat, m.dur, 'R', [m.pitch], { accent: true });
        }
      }
      if (s.kind === 'tx-stop') extra.rubatoOnly = true;
      bpm = s.kind === 'tx-repq' ? 52 : s.kind === 'tx-s8' ? 56 : 56;
      break;
    }
    case 'tx-4vS':
    case 'tx-4vA':
    case 'tx-4vT':
    case 'tx-4vB': {
      // "Four-Voice Training for Jazz Ballads" (WB6BGkTGITQ): the melody as the soprano, then the alto, tenor and bass of
      // a four-voice chord (drop 2 / close) on the harmonised notes; between them the melody alone.
      const vi = ['tx-4vS', 'tx-4vA', 'tx-4vT', 'tx-4vB'].indexOf(s.kind);
      let prev: number[] | null = null;
      // the melody in the tenor or the bass is sung and played an octave lower (its own register)
      for (const m0 of mel) {
        const m = vi >= 2 && m0.pitch > 64 ? { ...m0, pitch: m0.pitch - 12 } : m0;
        const c = chordAt(cs, m.beat);
        const q = picked(m, cs) ? chordUnder(m.pitch, { root: c.root, iv: QIV[c.q] }) : null;
        let v: number[] | null = null;
        if (q) {
          const ch: VLChord = { root: c.root, q };
          // close position, one hand: the RH with the melody in the soprano or alto, the LH in the tenor or bass
          const all = candidates(ch, { type: 'close', lo: m.pitch - 24, hi: m.pitch + 24 });
          const fit = all.filter((x) => [...x].sort((a, b) => b - a)[vi] === m.pitch && Math.min(...x) >= 43 && Math.max(...x) <= (vi >= 2 ? 76 : 84));
          if (fit.length) v = nearestTo(fit, prev, m.pitch);
        }
        if (v) {
          prev = v;
          n.add(m.beat, m.dur, vi >= 2 ? 'L' : 'R', [...v].sort((a, b) => a - b));
        } else n.add(m.beat, m.dur, vi >= 2 ? 'L' : 'R', [m.pitch], { accent: true });
      }
      break;
    }
    case 'tx-juggle': {
      // mango 5 [PSJP-A; Dave McKenna's "third hand approach"]: an arrangement of the whole head — an intro (the last 4
      // bars), then each 4-bar phrase in another texture from the menu (option % 16 picks the menu), every section
      // graded note for note by its own written texture.
      const plan = (s.option ?? 0) % 16;
      const MENUS: string[][] = [
        ['tx-bass', 'tx-shell', 'tx-sstride', 'tx-under1'],
        ['tx-bp', 'tx-repq', 'tx-shell', 'tx-stop'],
        ['tx-shell', 'tx-drape', 'tx-stride', 'tx-oct1'],
      ];
      const menu = MENUS[plan % MENUS.length];
      const phrases = phraseCount(head);
      // intro: the last 4 bars, melody + bass notes
      const intro = genTex({ ...s, kind: 'tx-bass', option: idx * 16 + (phrases - 1) });
      for (const x of intro.notes) n.list.push({ ...x, ...(x.chordId !== undefined ? { chordId: 1000 + x.chordId } : {}) });
      for (let p = 0; p < phrases; p++) {
        const k = menu[p % menu.length];
        const d = genTex({ ...s, kind: k, option: idx * 16 + p });
        for (const x of d.notes) n.list.push({ ...x, beat: r6(x.beat + 16 + p * 16), ...(x.chordId !== undefined ? { chordId: 2000 + p * 200 + x.chordId } : {}) });
      }
      extra.paged = true;
      const chart = [...hi.bars.slice(-4), ...hi.bars].map(pretty);
      return mk(s, n, { title: t(`${TEX_TITLE[base].en} · ${head.title.en} · ${menu.map((k) => TEX_TITLE[texBase(k)].en.split(' ')[0]).join(' / ')} · ${keyT(key)}`, `${TEX_TITLE[base].he} · ${head.title.he} · ${keyT(key)}`), bpm, chart, tonic: hi.tonic, extra });
    }
    default:
      throw new Error(`Unknown k-tex kind: ${s.kind}`);
  }
  return mk(s, n, { title, bpm, beats: bars * 4, chart: hi.bars.slice(from, to).map(pretty), tonic: hi.tonic, extra, spec: ballad || s.kind === 'tx-s8' ? {} : { swing: true } });
}

// ───────────────────────────── k-comp: the comping vocabulary ─────────────────────────────

export const COMP_TITLE: Record<string, T2> = {
  'cp-beat3': t('Beat-3 Charleston', 'צ׳רלסטון מפעמה 3'),
  'cp-leadin': t('Lead-ins', 'כניסות מקדימות'),
  'cp-basie': t('Count Basie rhythm', 'הקצב של קאונט בייסי'),
  'cp-pushoff': t('Push-offs', 'פוש־אוף'),
  'cp-accent': t('Accent comping', 'ליווי על ההדגשות'),
  'cp-twobar': t('Two-bar patterns', 'תבניות של שתי תיבות'),
  'cp-free': t('Free comping by rule', 'ליווי חופשי לפי כללים'),
};
const COMP_ID: Record<string, CompRhythmId> = { 'cp-beat3': 'beat3', 'cp-basie': 'basie', 'cp-pushoff': 'pushoff', 'cp-twobar': 'twobar' };

/** The comping voicing: rootless A / B led smoothly, in the middle register (C3–G4) [PSJP-B]. */
function compVoicings(cs: TChord[]): Map<TChord, number[]> {
  const m = new Map<TChord, number[]>();
  let prev: number[] | null = null;
  for (const c of cs) {
    const v = nearestTo([rootless(c, 'A'), rootless(c, 'B')], prev, 57);
    prev = v;
    m.set(c, v);
  }
  return m;
}
function genComp(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const blues = s.kind === 'cp-leadin' ? op === 2 : op === 1;
  const cs0 = tchords(blues ? BLUES : LOOP, key);
  const free = s.kind === 'cp-free';
  // the loop twice (8 bars) for the patterns that need room; the blues once
  const cs = blues ? cs0 : [...cs0, ...cs0.map((c) => ({ ...c, beat: c.beat + 16 }))];
  const bars = blues ? 12 : 8;
  const V = compVoicings(cs);
  const n = new Notes();
  const chart = chartLine(cs, bars, key);
  const what = COMP_TITLE[s.kind];
  const goal: Partial<DrillGoal> = {};
  let more: T2 = blues ? PROG_T.blues : PROG_T.loop;
  if (s.kind === 'cp-accent') {
    // [AC] accent comping, a coordination device: an RH 8th-note line (chord tones up, scale down) with accents, the LH
    // chord exactly with each accent (on the "and" of 2 and on 4 here — the placement is ours, verify).
    for (let bar = 0; bar < bars; bar++) {
      const b = bar * 4;
      const c = chordAt(cs, b);
      const tones = [0, SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh].map((x) => pitchIn(c.root + x, 70)).sort((a, b2) => a - b2);
      const line = [...tones, tones[3] - 1, tones[2], tones[1] + 1, tones[1]];
      line.forEach((p, k) => {
        const at = b + k * 0.5;
        const acc = Math.abs(at - b - 1.5) < 1e-6 || Math.abs(at - b - 3) < 1e-6;
        const ch = chordAt(cs, at);
        // under the line the chord of the moment; a line note outside it on the second chord of a bar follows that chord's 3rd
        const pitch = ch === c ? p : pitchIn(ch.root + SQI[ch.q].third, 70);
        n.add(at, 0.5, 'R', [pitch], acc ? { accent: true } : {});
        if (acc) n.add(at, 0.5, 'L', V.get(ch)!.filter((x) => x !== pitch));
      });
    }
  } else if (s.kind === 'cp-leadin') {
    const id: CompRhythmId = op === 0 ? 'leadin3' : 'leadin4';
    for (const h of compHits(cs, bars, id)) n.add(h.beat, h.dur, 'L', V.get(h.chord)!);
    more = op === 0 ? t('on the "and" of 3', 'על ה"וְ" של 3') : op === 1 ? t('on 4', 'על 4') : t('on 4, blues', 'על 4, בלוז');
  } else if (free) {
    // the model (one way that keeps the rules): a different pattern each bar, an anticipation into each new chord
    const pats = [[0, 1.5], [0.5, 2], [1, 3], [2, 3.5], [0, 2.5], [1.5, 3]];
    for (let bar = 0; bar < bars; bar++) {
      const P = pats[bar % pats.length];
      P.forEach((h, k) => {
        const beat = bar * 4 + h;
        // an offbeat hit just before a change sounds the next chord (the anticipation rule)
        const c = chordAt(cs, h % 1 !== 0 && (bar < bars - 1 || h < 3.5) ? beat + 0.5 : beat);
        n.add(beat, Math.min(1, (P[k + 1] ?? 4) - h), 'L', V.get(c)!);
      });
    }
    goal.freeComp = { chords: cs.map((c) => ({ beat: c.beat, beats: c.beats, root: c.root, q: c.q })), bars };
    more = blues ? PROG_T.blues : PROG_T.loop;
  } else {
    for (const h of compHits(cs, bars, COMP_ID[s.kind])) n.add(h.beat, h.dur, 'L', V.get(h.chord)!);
  }
  return mk(s, n, { title: ttl(what, key, more), bpm: 96, beats: bars * 4, chart, goal, extra: { click: '24' }, spec: { swing: true } });
}

// ───────────────────────────── k-impro: improvisation habits ─────────────────────────────

export const IMPRO_TITLE: Record<string, T2> = {
  'im-drone': t('Drone improvisation', 'אלתור מעל דרון'),
  'im-drone2': t('Drone: play two, rest two', 'דרון: שתיים מנגנים, שתיים נחים'),
  'im-p1r1': t('Play one, rest one', 'תיבה מנגנים, תיבה נחים'),
  'im-p2r2': t('Play two, rest two', 'שתיים מנגנים, שתיים נחים'),
  'im-hands': t('Call and response between the hands', 'שאלה ותשובה בין הידיים'),
  'im-drone-dor': t('Drone improvisation: dorian', 'אלתור מעל דרון: דורי'),
  'im-p2r1': t('Mix them: play two, rest one', 'לערבב: שתיים מנגנים, אחת נחים'),
};
function genImpro(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const n = new Notes();
  const what = IMPRO_TITLE[s.kind];
  const drone = s.kind === 'im-drone' || s.kind === 'im-drone2' || s.kind === 'im-drone-dor';
  // dorian over the drone: the minor 3rd and 7th, the major 6th (JPF B1: the drone exercises in more keys and modes)
  const dor = s.kind === 'im-drone-dor';
  const freeAbove = 60;
  if (drone) {
    // [JPF B1 U1–3] the LH an open 5th as a drone, the RH melodies on the major scale; the take is timed (8 bars), graded
    // on phrase organisation (phraseOrg.ts, the MTNA rubric) and staying in the scale.
    const lo = pitchIn(key, 36);
    n.add(0, 16, 'L', [lo, lo + 7]);
    n.add(16, 16, 'L', [lo, lo + 7]);
    const tonic = pitchIn(key, 60);
    const MAJ = dor ? [0, 2, 3, 5, 7, 9, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12];
    // a model that keeps the habits: 2-bar phrases with rests, different starts and lengths
    const model: { beat: number; dur: number; pitch: number }[] = [];
    const phr: [number, number[]][] = [[0, [0, 2, 4, 5, 4, 2]], [9, [4, 5, 7, 5, 4]], [16.5, [2, 4, 5, 7, 9, 7, 5, 4]], [26, [7, 5, 4, 2, 0]]];
    for (const [at, ds] of phr) ds.forEach((d, k) => model.push({ beat: at + k * 0.5, dur: k === ds.length - 1 ? 1 : 0.5, pitch: tonic + MAJ[d % 8] }));
    const play = s.kind === 'im-drone2' ? { playRest: { play: 2, rest: 2 } } : {};
    const modelPR = s.kind === 'im-drone2' ? model.filter((m) => Math.floor(m.beat / 8) % 2 === 0 || m.beat % 8 >= 7.5) : model;
    return mk(s, n, {
      title: ttl(what, key),
      bpm: 80,
      beats: 32,
      chart: [`${KEY_NAME[key]} drone`],
      goal: { phrase: { pass: ['organized', 'varied'] }, improv: { cards: ['inside'], spans: [{ at: 0, beats: 32, root: key, iv: dor ? [0, 3, 7, 10] : [0, 4, 7, 11] }], model: modelPR }, ...play },
      extra: { freeAbove },
      spec: { hands: 'RL' },
    });
  }
  // over a form: the LH comps written (the shell on 1 of each chord), the RH improvises above middle C
  const blues = op === 1;
  const cs0 = tchords(blues ? BLUES : LOOP, key);
  const cs = blues ? cs0 : [...cs0, ...cs0.map((c) => ({ ...c, beat: c.beat + 16 }))];
  const bars = blues ? 12 : 8;
  const hands = s.kind === 'im-hands';
  const pr = s.kind === 'im-p2r2' ? { play: 2, rest: 2 } : s.kind === 'im-p2r1' ? { play: 2, rest: 1 } : { play: 1, rest: 1 };
  let prev: number[] | null = null;
  for (const c of cs) {
    const v = guideShell(c, prev);
    prev = v;
    if (!hands) n.add(c.beat, c.beats, 'L', [pitchIn(c.root, 36), ...v.filter((p) => p < freeAbove)]);
  }
  if (hands) {
    // [M5vF89o6Ul0, JPF B1 U8] the RH plays in the odd bars, the LH answers in the even bars (Charleston on the shell)
    let pv: number[] | null = null;
    for (let bar = 1; bar < bars; bar += 2)
      for (const h of [0, 1.5]) {
        const c = chordAt(cs, bar * 4 + h);
        const v = guideShell(c, pv);
        pv = v;
        n.add(bar * 4 + h, h === 0 ? 1.5 : 1, 'L', [pitchIn(c.root, 36), ...v.filter((p) => p < freeAbove)]);
      }
  }
  const spans = cs.map((c) => ({ at: c.beat, beats: c.beats, root: c.root, iv: QIV[c.q] }));
  const model: { beat: number; dur: number; pitch: number }[] = [];
  for (let bar = 0; bar < bars; bar++) {
    if (bar % (pr.play + pr.rest) >= pr.play) continue;
    const c = chordAt(cs, bar * 4);
    const tones = [SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh, SQI[c.q].ninth].map((x) => pitchIn(c.root + x, 62)).sort((a, b) => a - b);
    tones.forEach((p, k) => model.push({ beat: bar * 4 + (bar % 2 === 0 ? 0 : 0.5) + k * 0.5, dur: 0.5, pitch: p }));
  }
  return mk(s, n, {
    title: ttl(what, key, blues ? PROG_T.blues : PROG_T.loop),
    bpm: 100,
    beats: bars * 4,
    chart: chartLine(cs, bars, key),
    goal: { playRest: pr, improv: { cards: ['inside'], spans, model } },
    extra: { freeAbove },
    spec: { hands: 'RL', swing: true },
  });
}

// ───────────────────────────── dispatch ─────────────────────────────

export const SP_FAMILIES: FamilyId[] = ['k-lh', 'k-tex', 'k-comp', 'k-impro'];
export const isSoloPianoFamily = (f: string): boolean => (SP_FAMILIES as string[]).includes(f);
export function genSoloPiano(s0: DrillSpec): Drill {
  const s = { ...s0, key: mod12(s0.key) };
  if (s.family === 'k-lh') return genLh(s);
  if (s.family === 'k-tex') return genTex(s);
  if (s.family === 'k-comp') return genComp(s);
  return genImpro(s);
}

// ───────────────────────────── catalogue ─────────────────────────────

/** A level row: kind, options, rating (path difficulty), tempo; items with other kinds via `items`. */
type Row = { kind: string; ops: number[]; rating: number; tempo: [number, number]; items?: [string, number][] };

export const LH_ROWS: Row[] = [
  { kind: 'lh-bass', ops: [0, 1], rating: 760, tempo: [60, 112] },
  { kind: 'lh-six', ops: [0, 1, 2], rating: 820, tempo: [50, 90] },
  { kind: 'lh-bp3', ops: [0, 1, 2], rating: 860, tempo: [60, 112] },
  { kind: 'lh-bpalt', ops: [0, 1, 2], rating: 920, tempo: [60, 120] },
  { kind: 'lh-shA', ops: [0, 1, 2], rating: 960, tempo: [60, 120] },
  { kind: 'lh-shB', ops: [0, 1, 2, 3], rating: 1040, tempo: [60, 120] },
  { kind: 'lh-roll', ops: [0, 1], rating: 1080, tempo: [60, 140] },
  { kind: 'lh-sstride', ops: [0, 1, 2], rating: 1120, tempo: [66, 132] },
  { kind: 'lh-strong', ops: [0, 1], rating: 1200, tempo: [66, 132] },
  { kind: 'lh-walk10', ops: [0, 1, 2], rating: 1360, tempo: [60, 120] },
  { kind: 'lh-head10', ops: SERVED.map((i) => i * 16), rating: 1400, tempo: [66, 132] },
  { kind: 'lh-var1', ops: [0, 1, 2, 3], rating: 1440, tempo: [76, 140] },
  { kind: 'lh-332', ops: [0], rating: 1460, tempo: [76, 140] },
  { kind: 'lh-var2', ops: [0, 1, 2], rating: 1480, tempo: [76, 140] },
  { kind: 'lh-34', ops: [0], rating: 1500, tempo: [76, 132] },
  { kind: 'lh-break', ops: [0, 1], rating: 1520, tempo: [90, 160] },
  { kind: 'lh-scomp', ops: [0, 1, 2, 3, 4], rating: 1580, tempo: [80, 150] },
  { kind: 'lh-shuttle', ops: [0, 1], rating: 1620, tempo: [60, 120] },
];
/** Heads by feel: the swing originals and the ballad (Quiet Hours). */
const SWING = SERVED.filter((i) => HEADS[i].feel === 'swing');
const BALLAD = SERVED.filter((i) => HEADS[i].feel === 'ballad');
/** One original head carries each step, then a second (C2): head A phrase 1, head B phrase 1. */
const two = (heads: number[], k = 0): number[] => [heads[k % heads.length] * 16, heads[(k + 1) % heads.length] * 16];
const ballads = (): number[] => [BALLAD[0] * 16, BALLAD[0] * 16 + 1];
export const TEX_ROWS: Row[] = [
  { kind: 'tx-bass', ops: two(SWING, 0), rating: 1000, tempo: [60, 120] },
  { kind: 'tx-bp', ops: two(SWING, 0), rating: 1080, tempo: [60, 120] },
  { kind: 'tx-shell', ops: two(SWING, 1), rating: 1160, tempo: [60, 120] },
  { kind: 'tx-call', ops: two(SWING, 0), rating: 1220, tempo: [60, 120] },
  { kind: 'tx-sstride', ops: two(SWING, 1), rating: 1300, tempo: [60, 120] },
  { kind: 'tx-under1', ops: [SWING[0] * 16], rating: 1380, tempo: [60, 112], items: [['tx-under2', SWING[1] * 16]] },
  { kind: 'tx-shuttle', ops: two(SWING, 0), rating: 1420, tempo: [60, 120] },
  { kind: 'tx-oct1', ops: [SWING[0] * 16], rating: 1450, tempo: [60, 112], items: [['tx-oct0', SWING[1] * 16], ['tx-oct2', SWING[1] * 16]] },
  { kind: 'tx-drape', ops: [SWING[0] * 16], rating: 1500, tempo: [60, 120], items: [['tx-melodic', SWING[1] * 16]] },
  { kind: 'tx-closed', ops: two(SWING, 1), rating: 1510, tempo: [60, 112] },
  { kind: 'tx-drop2', ops: two(SWING, 0), rating: 1560, tempo: [60, 112] },
  { kind: 'tx-sowhat', ops: [SERVED.find((i) => HEADS[i].home.minor)! * 16, SERVED.find((i) => HEADS[i].home.minor)! * 16 + 1], rating: 1600, tempo: [60, 112] },
  { kind: 'tx-stride', ops: two(SWING, 1), rating: 1620, tempo: [66, 132] },
  { kind: 'tx-shared', ops: [BALLAD[0] * 16, SWING[0] * 16], rating: 1650, tempo: [48, 72] },
  { kind: 'tx-stop', ops: ballads(), rating: 1680, tempo: [56, 56] },
  { kind: 'tx-repq', ops: ballads(), rating: 1720, tempo: [48, 66] },
  { kind: 'tx-sballad', ops: [BALLAD[0] * 16], rating: 1760, tempo: [48, 72], items: [['tx-s8', BALLAD[0] * 16 + 1]] },
  { kind: 'tx-inner', ops: ballads(), rating: 1800, tempo: [48, 66] },
  { kind: 'tx-4vS', ops: [BALLAD[0] * 16], rating: 1840, tempo: [48, 66], items: [['tx-4vA', BALLAD[0] * 16], ['tx-4vT', BALLAD[0] * 16 + 1], ['tx-4vB', BALLAD[0] * 16 + 1]] },
  { kind: 'tx-juggle', ops: [BALLAD[0] * 16, BALLAD[0] * 16 + 1, BALLAD[0] * 16 + 2], rating: 1900, tempo: [48, 72] },
];
export const COMP_ROWS: Row[] = [
  { kind: 'cp-beat3', ops: [0, 1], rating: 1250, tempo: [90, 160] },
  { kind: 'cp-leadin', ops: [0, 1, 2], rating: 1300, tempo: [90, 160] },
  { kind: 'cp-basie', ops: [0, 1], rating: 1350, tempo: [90, 160] },
  { kind: 'cp-pushoff', ops: [0, 1], rating: 1400, tempo: [90, 160] },
  { kind: 'cp-accent', ops: [0, 1], rating: 1450, tempo: [80, 150] },
  { kind: 'cp-twobar', ops: [0, 1], rating: 1500, tempo: [90, 160] },
  { kind: 'cp-free', ops: [0, 1], rating: 1650, tempo: [90, 160] },
];
export const IMPRO_ROWS: Row[] = [
  { kind: 'im-drone', ops: [0], rating: 780, tempo: [72, 120] },
  { kind: 'im-drone2', ops: [0], rating: 840, tempo: [72, 120] },
  { kind: 'im-drone-dor', ops: [0], rating: 900, tempo: [72, 120] },
  { kind: 'im-p1r1', ops: [0, 1], rating: 1150, tempo: [90, 160] },
  { kind: 'im-p2r2', ops: [0, 1], rating: 1180, tempo: [90, 160] },
  { kind: 'im-hands', ops: [0, 1], rating: 1200, tempo: [90, 160] },
  { kind: 'im-p2r1', ops: [0, 1], rating: 1230, tempo: [90, 160] },
];
const TITLES: Record<string, Record<string, T2>> = { 'k-lh': LH_TITLE, 'k-tex': TEX_TITLE, 'k-comp': COMP_TITLE, 'k-impro': IMPRO_TITLE };
/** The hands an item is played with (its template; the drill's spec follows its notes). */
export const handsOfKind = (kind: string): 'L' | 'RL' => (/^(lh-|cp-)/.test(kind) && !['lh-break', 'lh-shuttle', 'cp-accent'].includes(kind) ? 'L' : 'RL');
const ROWS: Record<string, Row[]> = { 'k-lh': LH_ROWS, 'k-tex': TEX_ROWS, 'k-comp': COMP_ROWS, 'k-impro': IMPRO_ROWS };
export const SP_FAMILY_TITLE: Record<string, T2> = {
  'k-lh': t('Solo left hand', 'יד שמאל לסולו'),
  'k-tex': t('Solo textures', 'מרקמי סולו'),
  'k-comp': t('Comping vocabulary', 'אוצר מילים לליווי'),
  'k-impro': t('Improv habits', 'הרגלי אלתור'),
};
function famDef(fam: FamilyId): FamilyDef {
  const rows = ROWS[fam];
  const T = TITLES[fam];
  return {
    id: fam,
    title: SP_FAMILY_TITLE[fam],
    style: 'jazz',
    levels: rows.map((r, i): LevelDef => {
      const items: [string, number][] = [...r.ops.map((o): [string, number] => [r.kind, o]), ...(r.items ?? [])];
      const specs: SpecTemplate[] = items.map(([kind, o]) => ({ family: fam, kind, hands: handsOfKind(kind), option: o, tempo: r.tempo[0], ...(kind === 'tx-stop' ? { target: r.tempo[0] } : {}) }));
      return { id: `${fam}-${i + 1}`, level: i + 1, title: T[texBase(r.kind)] ?? T[r.kind], specs, keys: SP_KEYS, tempo: r.tempo };
    }),
  };
}
export const soloLhFamily = (): FamilyDef => famDef('k-lh');
export const soloTexFamily = (): FamilyDef => famDef('k-tex');
export const compVocabFamily = (): FamilyDef => famDef('k-comp');
export const improHabitsFamily = (): FamilyDef => famDef('k-impro');
/** Path difficulty of every level (path.ts KEYS_LEVEL_DIFF): each at its own rating, all under PATH_CAP. */
export const SP_LEVEL_DIFF: Record<string, number> = Object.fromEntries(SP_FAMILIES.flatMap((f) => ROWS[f].map((r, i) => [`${f}-${i + 1}`, r.rating])));
/** Every item kind of each family (tests, lessons). */
export const SP_KINDS: Record<string, string[]> = Object.fromEntries(SP_FAMILIES.map((f) => [f, [...new Set(ROWS[f].flatMap((r) => [r.kind, ...(r.items ?? []).map((x) => x[0])]))]]));
