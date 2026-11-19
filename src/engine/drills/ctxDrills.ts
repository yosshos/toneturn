// Jazz in context (docs/AUDIT-DEPTH-3.md §1 #5, #6): the keys family k-ctx, the guitar family g-ctx (the jazz add-on)
// and the bass family b-ctx (the jazz track).
//   · Barry Harris's brothers (docs/BARRY-HARRIS-THEORY.md §2): the four dominants a minor third apart — in C: G7, B♭7,
//     D♭7, E7 (key + 7, + 10, + 1, + 4). Their 7♭9 rootless chords are one diminished (D° = B D F A♭), so each can stand
//     in for the V and resolve to the same I. As arpeggios resolving by a half step, in a ii–V–I as lines and rootless
//     comping, all four in turn, in a turnaround and a blues, and as walking bass lines.
//   · The backdoor and borrowed colours as comping, guide-tone and bebop lines, and inside an own 16-bar tune.
//   · Triad pairs and superimposed pentatonics over ii–V–I and over forms (not only a vamp).
//   · The Coltrane substitution over a ii–V–I, as lines and comping.
//   · Intros (I–vi–ii–V vamp, the last four bars) and endings (the Basie ending, ♭VI7–♭II7–I, the tag) on piano and guitar.
//   · Ballad comping: LH 10ths or shells under RH four-note voicings, slow.
// Every item runs in all 12 keys (the key is the item's spec key). Lines are graded note for note (new items start in
// free time, rubato.ts); comping is graded on the voicing's pitch classes.
//
// NOTE: guitar.ts, bass.ts and generate.ts import this module and it imports theirs: nothing here may call their
// exports at module top level (only inside functions).

import type { Drill, DrillSpec, ExpNote, FamilyId, BassFamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { bebopLine, itemIdOf } from './generate';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle, Ev, GN } from './guitar';
import { drop2Voicings, finish as gFinish, nearestVoicing, place } from './guitar';
import { drillOf, alt, type BN } from './bass';
import { voice } from './chartDrills';
import type { ChartChordEv } from '../charts';
import { VQ_DEF, chartOf, nearestPc, mod12, type VChord, type VQ, type VN } from '../bebopVocab';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
export const CTX_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

// ───────────────────────────── chords ─────────────────────────────

/** Chord intervals above the root (as parseChart gives them) for each quality. */
export const CTX_IV: Record<VQ, number[]> = {
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
/** Degrees (semitones above the key) → chords. */
const prog = (key: number, ds: D[]): VChord[] => ds.map(([d, q, beats]) => ({ r: mod12(key + d), q, beats }));

/**
 * The brothers of the V (BARRY-HARRIS-THEORY §2), as semitones above the key: V7, ♭VII7 (the backdoor), ♭II7 (the
 * tritone sub), III7 (the ♭9 relative). In C: G7, B♭7, D♭7, E7.
 */
export const BROTHERS = [7, 10, 1, 4];
export const BROTHER_NAME: T2[] = [
  t('V7', 'V7'),
  t('♭VII7, the backdoor', '♭VII7, הדלת האחורית'),
  t('♭II7, the tritone sub', '♭II7, תחליף הטריטון'),
  t('III7, the ♭9 relative', 'III7, קרוב ה־♭9'),
];
/** The brothers' shared 7♭9 rootless chord: the V's 3rd, 5th, ♭7 and ♭9 — one diminished 7th (in C: B D F A♭). */
export const sharedDim = (key: number): number[] => [11, 2, 5, 8].map((x) => mod12(key + x));
/** A dominant's 7♭9 without its root (3, 5, ♭7, ♭9), pitch classes. */
export const rootless7b9 = (root: number): number[] => [4, 7, 10, 1].map((x) => mod12(root + x));

const TURN_BRO: D[] = [[0, 'maj7', 2], [3, '7', 2], [2, 'm7', 2], [1, '7', 2], [0, 'maj7', 2], [3, '7', 2], [2, 'm7', 2], [1, '7', 2], [0, '6', 4]];
/** A jazz blues with brothers in bars 4 (G♭7 for C7), 8 (E♭7 for A7), 10 (B♭7 for G7) and 12 (D♭7 for G7). */
const BLUES_BRO: D[] = [[0, '7', 4], [5, '7', 4], [0, '7', 4], [7, 'm7', 2], [6, '7', 2], [5, '7', 4], [6, 'dim7', 4], [0, '7', 4], [3, '7', 4], [2, 'm7', 4], [10, '7', 4], [0, '7', 2], [9, '7', 2], [2, 'm7', 2], [1, '7', 2], [0, '7', 4]];
/** An own 16-bar tune with borrowed colours: iv–♭VII7 in bar 6, ♭VImaj7 in bar 12, the backdoor iv7–♭VII7 in bars 13–14. */
const TUNE: D[] = [[0, 'maj7', 4], [9, '7', 4], [2, 'm7', 4], [7, '7', 4], [5, 'maj7', 4], [5, 'm7', 2], [10, '7', 2], [4, 'm7', 4], [9, '7', 4], [2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4], [8, 'maj7', 4], [5, 'm7', 4], [10, '7', 4], [0, 'maj7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, '6', 4]];
const BLUES: D[] = [[0, '7', 4], [5, '7', 4], [0, '7', 4], [0, '7', 4], [5, '7', 4], [5, '7', 4], [0, '7', 4], [9, '7', 4], [2, 'm7', 4], [7, '7', 4], [0, '7', 4], [7, '7', 4], [0, '7', 4]];
const MODAL: D[] = [[2, 'm7', 4], [2, 'm7', 4], [2, 'm7', 4], [2, 'm7', 4], [3, 'm7', 4], [3, 'm7', 4], [2, 'm7', 4], [2, 'm7', 4]];
const II_V_I: D[] = [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4], [0, '6', 4], [2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4], [0, '6', 4]];
const II_V_I_ALT_MINOR: D[] = [[2, 'hd7', 4], [7, 'alt', 4], [0, 'm6', 4], [0, 'm6', 4], [2, 'hd7', 4], [7, 'alt', 4], [0, 'm6', 4], [0, 'm6', 4]];
const TRANE: D[] = [[2, 'm7', 2], [3, '7', 2], [8, 'maj7', 2], [11, '7', 2], [4, 'maj7', 2], [7, '7', 2], [0, 'maj7', 4]];
const VAMP: D[] = [[0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]];
const LAST4: D[] = [[5, 'm7', 4], [10, '7', 4], [0, 'maj7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]];
const BASIE: D[] = [[2, 'm7', 4], [7, '7', 4], [0, '6', 4], [0, '6', 4]];
const B6B2: D[] = [[2, 'm7', 4], [7, '7', 4], [8, '7', 2], [1, '7', 2], [0, 'maj7', 4]];
const TAG: D[] = [...Array.from({ length: 3 }, (): D[] => [[4, 'm7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2]]).flat(), [0, 'maj7', 4]];
const BALLAD: D[] = [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [7, '7', 4], [4, 'm7', 4], [9, '7b9', 4], [2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4]];
const BALLAD2: D[] = [[0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, '7', 2], [4, 'm7', 2], [9, '7b9', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]];
const BACKDOOR: D[] = [[5, 'm7', 4], [10, '7', 4], [0, 'maj7', 4], [0, '6', 4], [5, 'm7', 4], [10, '7', 4], [0, 'maj7', 4], [0, '6', 4]];
const BACKDOOR_LINE: D[] = [[10, '7', 4], [0, 'maj7', 4], [10, '7', 4], [0, 'maj7', 4]];

/** ii–V–I with the V replaced by brother `b` (twice). */
const broIIVI = (b: number): D[] => [[2, 'm7', 4], [BROTHERS[b], '7', 4], [0, 'maj7', 4], [0, '6', 4], [2, 'm7', 4], [BROTHERS[b], '7', 4], [0, 'maj7', 4], [0, '6', 4]];
/** ii | V7 ♭VII7 | ♭II7 III7 | I — all four brothers in turn (twice). */
const ALL_BRO: D[] = [...Array.from({ length: 2 }, (): D[] => [[2, 'm7', 4], [7, '7', 2], [10, '7', 2], [1, '7', 2], [4, '7', 2], [0, 'maj7', 4]]).flat()];
/** ii | each brother as 7♭9 | I: the shared diminished. */
const DIM_BRO: D[] = [[2, 'm7', 4], [7, '7b9', 2], [10, '7b9', 2], [1, '7b9', 2], [4, '7b9', 2], [0, 'maj7', 4], [0, '6', 4]];

// ───────────────────────────── the items ─────────────────────────────

type What = 'arp' | 'line' | 'guide' | 'tpair' | 'pent' | 'digital' | 'comp' | 'dim' | 'walk' | 'basie' | 'ballad' | 'ballad2';
interface Item {
  chords: VChord[];
  what: What;
  name: T2;
  minor?: boolean;
  /** Brothers' arpeggio items: which brother. */
  bro?: number;
}

/** The kinds of the context families (keys, guitar, bass). */
export const CTX_KINDS = ['cx-bro', 'cx-bro-line', 'cx-bro-comp', 'cx-bro-all', 'cx-bro-forms', 'cx-backdoor', 'cx-tune', 'cx-tpair', 'cx-pent', 'cx-trane', 'cx-intro', 'cx-ending', 'cx-ballad', 'cx-walk'];

export function ctxItem(kind: string, key: number, op: number): Item {
  const P = (ds: D[]) => prog(key, ds);
  switch (kind) {
    case 'cx-bro': {
      const b = op % 4;
      return { chords: P([[BROTHERS[b], '7b9', 4], [0, '6', 4]]), what: 'arp', bro: b, name: t(`Brother ${BROTHER_NAME[b].en}: arpeggio, then a half step into I`, `האח ${BROTHER_NAME[b].he}: ארפג׳יו, ואז חצי טון אל I`) };
    }
    case 'cx-bro-line': {
      const b = op % 4;
      return { chords: P(broIIVI(b)), what: 'line', name: t(`ii–V–I, the V as ${BROTHER_NAME[b].en}: line`, `ii–V–I, ה־V כ־${BROTHER_NAME[b].he}: קו`) };
    }
    case 'cx-bro-comp': {
      if (op % 5 === 4) return { chords: P(DIM_BRO), what: 'dim', name: t('All four brothers as one diminished (7♭9 rootless)', 'ארבעת האחים כמוקטן אחד (7♭9 בלי שורש)') };
      const b = op % 5;
      return { chords: P(broIIVI(b)), what: 'comp', name: t(`ii–V–I, the V as ${BROTHER_NAME[b].en}: rootless comping`, `ii–V–I, ה־V כ־${BROTHER_NAME[b].he}: ליווי בלי שורש`) };
    }
    case 'cx-bro-all':
      return op % 2 ? { chords: P(ALL_BRO), what: 'comp', name: t('All four brothers in turn: comping', 'ארבעת האחים בתורם: ליווי') } : { chords: P(ALL_BRO), what: 'line', name: t('All four brothers in turn: line', 'ארבעת האחים בתורם: קו') };
    case 'cx-bro-forms':
      return op % 2 ? { chords: P(BLUES_BRO), what: 'line', name: t('A blues with brothers: line', 'בלוז עם אחים: קו') } : { chords: P(TURN_BRO), what: 'line', name: t('Turnaround with brothers (I–♭III7–ii–♭II7): line', 'טרנאראונד עם אחים (I–♭III7–ii–♭II7): קו') };
    case 'cx-backdoor':
      if (op % 3 === 0) return { chords: P(BACKDOOR), what: 'comp', name: t('Backdoor iv7–♭VII7–I: rootless comping', 'דלת אחורית iv7–♭VII7–I: ליווי בלי שורש') };
      if (op % 3 === 1) return { chords: P(BACKDOOR), what: 'guide', name: t('Backdoor iv7–♭VII7–I: guide-tone line', 'דלת אחורית iv7–♭VII7–I: קו צלילים מנחים') };
      return { chords: P(BACKDOOR_LINE), what: 'line', name: t('Bebop line over ♭VII7 → I', 'קו ביבופ על ♭VII7 ← I') };
    case 'cx-tune':
      return op % 2 ? { chords: P(TUNE), what: 'comp', name: t('16-bar tune with borrowed colours: comping', 'שיר של 16 תיבות עם צבעים שאולים: ליווי') } : { chords: P(TUNE), what: 'line', name: t('16-bar tune with borrowed colours: line', 'שיר של 16 תיבות עם צבעים שאולים: קו') };
    case 'cx-tpair':
      if (op % 3 === 1) return { chords: P(II_V_I_ALT_MINOR), what: 'tpair', minor: true, name: t('Triad pairs over minor ii–V–i', 'זוגות משולשים על ii–V–i מינורי') };
      if (op % 3 === 2) return { chords: P(BLUES), what: 'tpair', name: t('Triad pairs over a blues', 'זוגות משולשים על בלוז') };
      return { chords: P(II_V_I), what: 'tpair', name: t('Triad pairs over ii–V–I', 'זוגות משולשים על ii–V–I') };
    case 'cx-pent':
      if (op % 3 === 1) return { chords: P(BLUES), what: 'pent', name: t('Superimposed pentatonics over a blues', 'פנטטוניות מונחות על בלוז') };
      if (op % 3 === 2) return { chords: P(MODAL), what: 'pent', name: t('Superimposed pentatonics over a modal form', 'פנטטוניות מונחות על צורה מודאלית') };
      return { chords: P(II_V_I), what: 'pent', name: t('Superimposed pentatonics over ii–V–I', 'פנטטוניות מונחות על ii–V–I') };
    case 'cx-trane':
      return op % 2 ? { chords: P(TRANE), what: 'comp', name: t('Coltrane sub over ii–V–I: comping', 'תחליף קולטריין על ii–V–I: ליווי') } : { chords: P(TRANE), what: 'digital', name: t('Coltrane sub over ii–V–I: 1-2-3-5 line', 'תחליף קולטריין על ii–V–I: קו 1-2-3-5') };
    case 'cx-intro':
      switch (op % 4) {
        case 1:
          return { chords: P(VAMP), what: 'line', name: t('Intro: the I–vi–ii–V vamp, line', 'פתיחה: ואמפ I–vi–ii–V, קו') };
        case 2:
          return { chords: P(LAST4), what: 'comp', name: t('Intro: the last four bars, comping', 'פתיחה: ארבע התיבות האחרונות, ליווי') };
        case 3:
          return { chords: P(LAST4), what: 'line', name: t('Intro: the last four bars, line', 'פתיחה: ארבע התיבות האחרונות, קו') };
        default:
          return { chords: P(VAMP), what: 'comp', name: t('Intro: the I–vi–ii–V vamp, comping', 'פתיחה: ואמפ I–vi–ii–V, ליווי') };
      }
    case 'cx-ending':
      if (op % 3 === 1) return { chords: P(B6B2), what: 'comp', name: t('Ending: ♭VI7–♭II7–I', 'סיום: ♭VI7–♭II7–I') };
      if (op % 3 === 2) return { chords: P(TAG), what: 'comp', name: t('Tag ending: iii–VI–ii–V three times', 'סיום תג: iii–VI–ii–V שלוש פעמים') };
      return { chords: P(BASIE), what: 'basie', name: t('The Basie ending: a three-note tag, then the last hit', 'סיום בייסי: תג של שלושה צלילים, ואז המכה האחרונה') };
    case 'cx-ballad':
      return op % 2 ? { chords: P(BALLAD2), what: 'ballad2', name: t('Ballad comping: LH shells, RH four notes', 'ליווי בלדה: שלדים ביד שמאל, ארבעה צלילים בימין') } : { chords: P(BALLAD), what: 'ballad', name: t('Ballad comping: LH 10ths, RH four notes', 'ליווי בלדה: דצימות ביד שמאל, ארבעה צלילים בימין') };
    case 'cx-walk':
      switch (op % 8) {
        case 4:
          return { chords: P(ALL_BRO), what: 'walk', name: t('Walking through all four brothers', 'הליכה דרך ארבעת האחים') };
        case 5:
          return { chords: P(BLUES_BRO), what: 'walk', name: t('Walking a blues with brothers', 'הליכה בבלוז עם אחים') };
        case 6:
          return { chords: P(BACKDOOR), what: 'walk', name: t('Walking the backdoor iv7–♭VII7–I', 'הליכה בדלת האחורית iv7–♭VII7–I') };
        case 7:
          return { chords: P(TRANE), what: 'walk', name: t('Walking the Coltrane sub over ii–V–I', 'הליכה בתחליף קולטריין על ii–V–I') };
        default: {
          const b = op % 4;
          return { chords: P(broIIVI(b)), what: 'walk', name: t(`Walking ii–V–I, the V as ${BROTHER_NAME[b].en}`, `הליכה ב־ii–V–I, ה־V כ־${BROTHER_NAME[b].he}`) };
        }
      }
  }
  throw new Error(`Unknown context kind ${kind}`);
}

// ───────────────────────────── lines ─────────────────────────────

const ct = (c: VChord, p: number): boolean => VQ_DEF[c.q].ct.map((x) => mod12(c.r + x)).includes(mod12(p));
/** Pitches of a pitch-class set from `from` upwards (inclusive), `n` of them. */
function upFrom(pcs: number[], from: number, n: number): number[] {
  const out: number[] = [];
  for (let q = from; out.length < n; q++) if (pcs.includes(mod12(q))) out.push(q);
  return out;
}

/**
 * A brother's arpeggio resolving to I (BARRY-HARRIS-THEORY §2): 1 3 5 ♭7 up, the ♭9 on top, down ♭7 5, then the
 * nearest note of the shared diminished that lies a half step from a tone of I (B → C, F → E, A♭ → G), which resolves
 * on beat 1 of the I bar and is held.
 */
export function brotherArp(key: number, b: number, lo: number, hi: number): VN[] {
  const r = mod12(key + BROTHERS[b]);
  let root = nearestPc(r, lo + 4, lo, hi);
  if (root + 13 > hi) root -= 12;
  const up = [0, 4, 7, 10, 13, 10, 7].map((x) => root + x);
  // The landing is I's root or 3rd (the tonic's own notes: a brother that is the same chord in two keys still lands
  // differently, B → C in C but D → E♭ in E♭).
  const I6 = [0, 4].map((x) => mod12(key + x));
  // The last 8th: a diminished tone a half step from the root or 3rd of I, nearest below the 5th of the brother.
  const dim = sharedDim(key).filter((pc) => I6.includes(mod12(pc + 1)) || I6.includes(mod12(pc - 1)));
  let last = NaN;
  for (let q = up[6] - 1; q > up[6] - 12; q--) if (dim.includes(mod12(q))) {
    last = q;
    break;
  }
  const target = I6.includes(mod12(last + 1)) ? last + 1 : last - 1;
  const seq = [...up, last];
  const c7b9: VChord = { r, q: '7b9', beats: 4 };
  const notes: VN[] = seq.map((p, i) => ({ p, beat: i / 2, dur: 0.5, ct: ct(c7b9, p) }));
  notes.push({ p: target, beat: 4, dur: 4, ct: true });
  return notes;
}

/** Guide tones in half notes: the 3rd or 7th of each chord nearest the last (never the same note twice in a row). */
function guideLine(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let prev = Math.round((lo + hi) / 2);
  let beat = 0;
  chords.forEach((c, ci) => {
    const g = [VQ_DEF[c.q].ct[1], VQ_DEF[c.q].ct[3]].map((x) => mod12(c.r + x));
    for (let b = 0; b < c.beats; b += 2) {
      const cands = g.map((pc) => nearestPc(pc, prev, lo, hi));
      const p = cands.filter((x) => x !== prev).reduce((a, x) => (Math.abs(x - prev) < Math.abs(a - prev) ? x : a), cands.find((x) => x !== prev) ?? cands[0]);
      const lastHold = ci === chords.length - 1;
      out.push({ p, beat: beat + b, dur: lastHold ? c.beats - b : 2, ct: true });
      prev = p;
      if (lastHold) break;
    }
    beat += c.beats;
  });
  return out;
}

/** The triad pair for a chord quality (theoryPlay TRIAD_PAIRS, and ♭II + ♭III minor over m7♭5): [root offset, minor]. */
function pairFor(q: VQ): [[number, boolean], [number, boolean]] {
  switch (q) {
    case 'maj7':
    case '6':
      return [[2, false], [4, true]]; // lydian: II + iii
    case 'm7':
    case 'm6':
      return [[3, false], [5, false]]; // dorian: ♭III + IV
    case 'alt':
    case '7b9':
      return [[6, false], [8, false]]; // altered: ♭V + ♭VI
    case 'hd7':
      return [[1, false], [3, true]]; // locrian: ♭II + ♭iii
    default:
      return [[0, false], [2, false]]; // lydian dominant: I + II
  }
}
const triad = (root: number, minor: boolean): number[] => [0, minor ? 3 : 4, 7].map((x) => mod12(root + x));

/** Triad pairs in 8ths: the two triads in turn, each rising from just above the last, starting low again at the top. */
function pairLine(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let floor = Math.round(lo + (hi - lo) * 0.3);
  let beat = 0;
  chords.forEach((c, ci) => {
    const [a, b] = pairFor(c.q).map(([o, m]) => triad(c.r + o, m));
    const last = ci === chords.length - 1;
    const n = last ? 6 : c.beats * 2;
    const ps: number[] = [];
    let k = 0;
    while (ps.length < n) {
      let tri = upFrom(k % 2 ? b : a, floor, 3);
      if (tri[2] > hi) {
        floor = lo + 2;
        tri = upFrom(k % 2 ? b : a, floor, 3);
      }
      ps.push(...tri);
      floor = tri[0] + 1;
      k++;
    }
    ps.slice(0, n).forEach((p, i) => out.push({ p, beat: beat + i / 2, dur: last && i === n - 1 ? c.beats - (n - 1) / 2 : 0.5, ct: ct(c, p) }));
    beat += c.beats;
  });
  return out;
}

/** The superimposed pentatonic over a chord (as the pent-super rule card): maj7 on the 5th, m7 on the 5th, 7 on the 2nd, alt / m7♭5 minor on ♭3. */
export function pentFor(c: VChord): number[] {
  const MAJ = [0, 2, 4, 7, 9];
  const MIN = [0, 3, 5, 7, 10];
  const q = c.q;
  const [on, maj] = q === 'maj7' || q === '6' ? [7, true] : q === 'm7' || q === 'm6' ? [7, false] : q === 'alt' || q === 'hd7' || q === '7b9' ? [3, false] : q === 'dim7' ? [0, false] : [2, true];
  return (maj ? MAJ : MIN).map((x) => mod12(c.r + on + x));
}
/** Pentatonic 4-note groups in 8ths (1-2-3-4, 2-3-4-5 …) from the last note, turning down at the top. */
function pentLine(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let prev = Math.round(lo + (hi - lo) * 0.35);
  let beat = 0;
  chords.forEach((c, ci) => {
    const pcs = pentFor(c);
    const last = ci === chords.length - 1;
    const n = last ? 5 : c.beats * 2;
    let start = prev;
    while (!pcs.includes(mod12(start))) start--;
    let asc = upFrom(pcs, start, 12);
    if (asc[n] > hi) asc = upFrom(pcs, lo + 1, 12);
    const ps: number[] = [];
    for (let g = 0; ps.length < n; g++) ps.push(...asc.slice(g, g + 4));
    ps.slice(0, n).forEach((p, i) => out.push({ p, beat: beat + i / 2, dur: last && i === n - 1 ? c.beats - (n - 1) / 2 : 0.5, ct: ct(c, p) }));
    prev = ps[n - 1];
    beat += c.beats;
  });
  return out;
}

/** Digital pattern 1-2-3-5 on each chord, each cell from the root nearest the last note; the last chord's root held. */
function digitalLine(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let prev = Math.round(lo + (hi - lo) * 0.4);
  let beat = 0;
  chords.forEach((c, ci) => {
    const cell = [0, 2, VQ_DEF[c.q].ct[1], 7];
    if (ci === chords.length - 1) {
      out.push({ p: nearestPc(c.r, prev, lo, hi), beat, dur: c.beats, ct: true });
      return;
    }
    let root = nearestPc(c.r, prev, lo, hi);
    while (root + 7 > hi) root -= 12;
    while (root < lo) root += 12;
    for (let rep = 0; rep < c.beats / 2; rep++) cell.forEach((x, k) => out.push({ p: root + x, beat: beat + rep * 2 + k / 2, dur: 0.5, ct: ct(c, root + x) }));
    prev = root + 7;
    beat += c.beats;
  });
  return out;
}

/** A walking bass line: the root on each chord's first beat, chord tones between, a half step into the next root. */
export function walkLine(chords: VChord[], lo: number, hi: number): VN[] {
  const out: VN[] = [];
  let prev = nearestPc(chords[0].r, lo + 8, lo, hi);
  let beat = 0;
  chords.forEach((c, ci) => {
    const root = nearestPc(c.r, prev, lo + 1, hi - 1);
    const last = ci === chords.length - 1;
    if (last) {
      out.push({ p: root, beat, dur: c.beats, ct: true });
      return;
    }
    const ctPcs = VQ_DEF[c.q].ct;
    out.push({ p: root, beat, dur: 1, ct: true });
    let cur = root;
    for (let b = 1; b < c.beats - 1; b++) {
      const x = ctPcs[Math.min(b, 2)];
      const up = root + x <= hi - 2 ? root + x : root + x - 12;
      cur = up;
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

/** The Basie ending's tag: the 5th, ♯5 and 6th of the key in quarters after the I hit (beats 9–11), then the root on the last hit. */
function basieTag(key: number, lo: number, hi: number): VN[] {
  const five = nearestPc(key + 7, Math.round((lo + hi) / 2), lo, hi - 3);
  return [
    { p: five, beat: 9, dur: 1, ct: true },
    { p: five + 1, beat: 10, dur: 1, ct: false },
    { p: five + 2, beat: 11, dur: 1, ct: true },
    { p: nearestPc(key, five + 2, lo, hi), beat: 12, dur: 4, ct: true },
  ];
}

/** The line of a line item in a register (lo–hi). */
export function ctxLine(it: Item, key: number, lo: number, hi: number, seed: string): VN[] {
  switch (it.what) {
    case 'arp':
      return brotherArp(key, it.bro ?? 0, lo, hi);
    case 'guide':
      return guideLine(it.chords, lo, hi);
    case 'tpair':
      return pairLine(it.chords, lo, hi);
    case 'pent':
      return pentLine(it.chords, lo, hi);
    case 'digital':
      return digitalLine(it.chords, lo, hi);
    case 'walk':
      return walkLine(it.chords, lo, hi);
    default: {
      const raw = bebopLine(it.chords.map((c) => ({ r: c.r, q: c.q, beats: c.beats })), seed, { lo: lo + 1, hi: hi - 1, start: Math.round(lo + (hi - lo) * 0.7) });
      return raw.map((n) => ({ p: n.p, beat: n.beat, dur: n.dur, ct: !!n.ct }));
    }
  }
}
const isComp = (w: What): boolean => w === 'comp' || w === 'dim' || w === 'ballad' || w === 'ballad2' || w === 'basie';

// ───────────────────────────── piano voicings ─────────────────────────────

const evOf = (c: VChord): ChartChordEv => ({ root: c.r, iv: CTX_IV[c.q] }) as unknown as ChartChordEv;
interface PEv {
  beat: number;
  dur: number;
  lh: number[];
  rh: number[];
  c: VChord;
}
/** A dim (rootless 7♭9) voicing in the left hand, the inversion nearest the last. */
function dimVoicing(root: number, prev: number[] | null): number[] {
  const pcs = rootless7b9(root);
  const cands = [0, 1, 2, 3].map((k) => {
    const lowPc = pcs[k];
    const base = 50 + mod12(lowPc - 50);
    return upFrom(pcs, base, 4);
  });
  if (!prev) return cands[0];
  const cost = (v: number[]) => v.reduce((a, m, i) => a + Math.abs(m - prev[Math.min(i, prev.length - 1)]), 0);
  return cands.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}
function pianoComp(it: Item): PEv[] {
  const out: PEv[] = [];
  let beat = 0;
  let prev: { lh: number[]; rh: number[] } | null = null;
  for (const c of it.chords) {
    let lh: number[];
    let rh: number[] = [];
    if (it.what === 'dim' && c.q === '7b9') lh = dimVoicing(c.r, prev?.lh ?? null);
    else if (it.what === 'ballad' || it.what === 'ballad2') {
      const root = 36 + mod12(c.r - 36);
      const third = VQ_DEF[c.q].ct[1];
      lh = it.what === 'ballad' ? [root, root + 12 + third] : [root, root + VQ_DEF[c.q].ct[3]];
      const v = voice(evOf(c), it.what === 'ballad' ? 'rootless-a' : 'rootless-b', prev ? { lh: prev.rh.map((m) => m - 12), rh: [] } : null).lh;
      rh = v.map((m) => m + 12 * Math.max(0, Math.ceil((60 - v[0]) / 12)));
      if (rh[0] <= lh[lh.length - 1]) rh = rh.map((m) => m + 12);
    } else lh = voice(evOf(c), 'rootless', prev ? { lh: prev.lh, rh: [] } : null).lh;
    out.push({ beat, dur: c.beats, lh, rh, c });
    prev = { lh, rh };
    beat += c.beats;
  }
  if (it.what === 'basie') {
    // ii (4) · V (4) · the I hit on beat 1 of bar 3 (short), the tag, the last hit on bar 4.
    const I = out[2];
    out.length = 2;
    out.push({ ...I, dur: 1 }, { ...I, beat: 12, dur: 4 });
  }
  return out;
}
const scalePcs = (c: VChord): number[] => [...new Set([...VQ_DEF[c.q].sc, ...VQ_DEF[c.q].ct, ...CTX_IV[c.q]].map((x) => mod12(c.r + x)))];

const keyLabel = (key: number, minor?: boolean): string => (minor ? `${['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'][mod12(key)]}m` : NAMES[mod12(key)]);
const withKey = (n: T2, key: number, minor?: boolean): T2 => t(`${n.en} · ${keyLabel(key, minor)}`, `${n.he} · ${keyLabel(key, minor)}`);
const chartFor = (it: Item, key: number): string[] => chartOf(it.chords, it.minor ? key + 3 : key);
const sigFor = (it: Item, key: number): string => SIG[it.minor ? mod12(key + 3) : mod12(key)];

// ───────────────────────────── keys: k-ctx ─────────────────────────────

export function genKeysCtx(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const it = ctxItem(s.kind, key, s.option ?? 0);
  const notes: ExpNote[] = [];
  const sets: NonNullable<Drill['goal']['chordSets']> = [];
  let lines = !isComp(it.what);
  if (isComp(it.what)) {
    let cid = 0;
    for (const e of pianoComp(it)) {
      cid++;
      const ps = [...e.lh.map((p) => ({ p, h: 'L' as const })), ...e.rh.map((p) => ({ p, h: 'R' as const }))];
      for (const { p, h } of ps) notes.push({ pitch: p, beat: r6(e.beat), dur: r6(e.dur), hand: h, chordId: cid, chordTone: true });
      const req = [...new Set(ps.map((x) => mod12(x.p)))].sort((a, b) => a - b);
      sets.push({ chordId: cid, required: req, allowed: [...new Set([...req, ...scalePcs(e.c)])].sort((a, b) => a - b) });
    }
    if (it.what === 'basie') {
      for (const n of basieTag(key, 60, 84)) notes.push({ pitch: n.p, beat: r6(n.beat), dur: r6(n.dur), hand: 'R', chordTone: n.ct });
      lines = false;
    }
  } else {
    for (const n of ctxLine(it, key, 60, 84, `${s.family}:${s.kind}:${key}:${s.option ?? 0}`)) notes.push({ pitch: n.p, beat: r6(n.beat), dur: r6(n.dur), hand: 'R', chordTone: n.ct });
  }
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  // One key is one note: a tag note on a comping note's key and beat (the Basie ending) is played once.
  for (let k = notes.length - 1; k > 0; k--) if (notes.slice(0, k).some((o) => o.pitch === notes[k].pitch && Math.abs(o.beat - notes[k].beat) < 1e-6)) notes.splice(k, 1);
  // A tag note struck with a comping chord (the Basie ending's last hit, root on top) belongs to that chord.
  for (const n of notes) {
    if (n.chordId !== undefined) continue;
    const with_ = notes.find((o) => o.chordId !== undefined && Math.abs(o.beat - n.beat) < 1e-6);
    const set = with_ && sets.find((x) => x.chordId === with_.chordId);
    if (!with_ || !set) continue;
    n.chordId = with_.chordId;
    n.dur = with_.dur;
    if (!set.required.includes(mod12(n.pitch))) set.required = [...set.required, mod12(n.pitch)].sort((x, y) => x - y);
    if (!set.allowed.includes(mod12(n.pitch))) set.allowed = [...set.allowed, mod12(n.pitch)].sort((x, y) => x - y);
  }
  const hands = new Set(notes.map((n) => n.hand));
  const spec: DrillSpec = { ...s, key, hands: hands.size > 1 ? 'RL' : hands.has('L') ? 'L' : 'R' };
  return {
    spec,
    itemId: itemIdOf({ ...s, key }),
    title: withKey(it.name, key, it.minor),
    notes,
    beats: r6(Math.max(...notes.map((n) => n.beat + n.dur))),
    meter: 4,
    keySig: sigFor(it, key),
    goal: { evenness: lines, hands: hands.size > 1, ...(lines ? { chordTonesOnBeats: true } : {}), ...(sets.length ? { chordSets: sets } : {}) },
    startBpm: s.tempo ?? 70,
    chart: chartFor(it, key),
  };
}

/** The keys family (jazz emphasis): brothers ~1350 to ballad comping ~1880 (path difficulty set in path.ts). */
export function keysCtxFamily(): FamilyDef {
  const v = (kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-ctx', kind, hands: 'R', swing: true, option, ...o });
  const vs = (kind: string, ops: number[], o: Partial<SpecTemplate> = {}) => ops.map((op) => v(kind, op, o));
  const JT = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `k-ctx-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: CTX_KEYS, tempo });
  return {
    id: 'k-ctx',
    title: t('Jazz in context', 'ג׳אז בהקשר'),
    style: 'jazz',
    levels: [
      JT(1, 'The brothers: arpeggio, then a half step into I', 'האחים: ארפג׳יו, ואז חצי טון אל I', vs('cx-bro', [0, 1, 2, 3]), [60, 120]),
      JT(2, 'A brother replaces the V: lines', 'אח מחליף את ה־V: קווים', vs('cx-bro-line', [0, 1, 2, 3]), [70, 140]),
      JT(3, 'A brother replaces the V: rootless comping', 'אח מחליף את ה־V: ליווי בלי שורש', vs('cx-bro-comp', [0, 1, 2, 3, 4], { hands: 'L' }), [60, 120]),
      JT(4, 'All four brothers in turn', 'ארבעת האחים בתורם', [v('cx-bro-all', 0), v('cx-bro-all', 1, { hands: 'L' })], [70, 140]),
      JT(5, 'Brothers in a turnaround and a blues', 'אחים בטרנאראונד ובבלוז', vs('cx-bro-forms', [0, 1]), [80, 150]),
      JT(6, 'The backdoor: comping, guide tones, a bebop line', 'הדלת האחורית: ליווי, צלילים מנחים, קו ביבופ', [v('cx-backdoor', 0, { hands: 'L' }), v('cx-backdoor', 1), v('cx-backdoor', 2)], [60, 130]),
      JT(7, 'Borrowed colours inside a tune', 'צבעים שאולים בתוך שיר', [v('cx-tune', 0), v('cx-tune', 1, { hands: 'L' })], [80, 150]),
      JT(8, 'Triad pairs over ii–V–I and a form', 'זוגות משולשים על ii–V–I ועל צורה', vs('cx-tpair', [0, 1, 2]), [70, 140]),
      JT(9, 'Superimposed pentatonics over ii–V–I and a form', 'פנטטוניות מונחות על ii–V–I ועל צורה', vs('cx-pent', [0, 1, 2]), [70, 140]),
      JT(10, 'The Coltrane sub over ii–V–I', 'תחליף קולטריין על ii–V–I', [v('cx-trane', 0), v('cx-trane', 1, { hands: 'L' })], [60, 130]),
      JT(11, 'Intros: the vamp and the last four bars', 'פתיחות: הוואמפ וארבע התיבות האחרונות', [v('cx-intro', 0, { hands: 'L' }), v('cx-intro', 1), v('cx-intro', 2, { hands: 'L' }), v('cx-intro', 3)], [80, 150]),
      JT(12, 'Endings: Basie, ♭VI7–♭II7–I, the tag', 'סיומים: בייסי, ♭VI7–♭II7–I, התג', [v('cx-ending', 0, { hands: 'RL' }), v('cx-ending', 1, { hands: 'L' }), v('cx-ending', 2, { hands: 'L' })], [80, 150]),
      JT(13, 'Ballad comping in two hands', 'ליווי בלדה בשתי ידיים', vs('cx-ballad', [0, 1], { hands: 'RL', swing: false }), [44, 72]),
    ],
  };
}

// ───────────────────────────── guitar: g-ctx ─────────────────────────────

/** A line on the neck, in one position around the lowest note where it fits (strings 6 → 1). */
function onNeck(tu: Tuning, ps: number[]): { s: number; f: number }[] {
  const lo = Math.min(...ps);
  const c = Math.max(1, Math.min(12, lo - tu.open[tu.open.length - 1]));
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return ps.map((m) => place(tu, m, strs, Math.max(0, c - 1), c + 4) ?? place(tu, m, strs, Math.max(0, c - 3), c + 6) ?? place(tu, m, strs, 0, 17)!);
}
/** The four comping notes of a chord on the guitar (drop 2): 1-3-5-7, the 6th chord 1-3-5-6, 7♭9 as 3-5-♭7-♭9, alt as 3-♭7-♯9-♭13. */
function fourOf(c: VChord): number[] {
  const rel = c.q === '7b9' ? [4, 7, 10, 1] : c.q === 'alt' ? [4, 10, 3, 8] : VQ_DEF[c.q].ct.slice(0, 4);
  return rel.map((x) => c.r + x);
}
const strum = (v: { s: number; f: number }[]): GN[] => v.map((p) => ({ ...p, stroke: 'D' as const, tech: 'strum-down' as const, ct: true }));

export function genGuitarCtx(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const it = ctxItem(s.kind, key, s.option ?? 0);
  const evs: Ev[] = [];
  const lines = !isComp(it.what);
  if (isComp(it.what)) {
    let near = 5;
    let beat = 0;
    const strs = it.what === 'ballad' || it.what === 'ballad2' ? [5, 4, 3, 2] : [4, 3, 2, 1];
    const hits: { beat: number; dur: number; c: VChord }[] = [];
    for (const c of it.chords) {
      hits.push({ beat, dur: c.beats, c });
      beat += c.beats;
    }
    if (it.what === 'basie') {
      const I = hits[2];
      hits.length = 2;
      hits.push({ ...I, dur: 1 }, { ...I, beat: 12, dur: 4 });
    }
    for (const h of hits) {
      const cands = drop2Voicings(tu, fourOf(h.c), strs, 13);
      const v = cands.length ? nearestVoicing(cands, near) : drop2Voicings(tu, fourOf(h.c), [5, 4, 3, 2], 15)[0];
      near = Math.min(...v.map((p) => p.f).filter((f) => f > 0).concat([near]));
      evs.push({ beat: h.beat, dur: h.dur, notes: strum(v) });
    }
    if (it.what === 'basie') {
      const tag = basieTag(key, 60, 79);
      const pos = onNeck(tu, tag.map((n) => n.p));
      tag.forEach((n, i) => evs.push({ beat: n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: 'D', ct: n.ct }] }));
    }
    evs.sort((a, b) => a.beat - b.beat);
  } else {
    const ln = ctxLine(it, key, 52, 79, `${s.family}:${s.kind}:${key}:${s.option ?? 0}`);
    const pos = onNeck(tu, ln.map((n) => n.p));
    ln.forEach((n, i) => evs.push({ beat: n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: i % 2 === 0 ? 'D' : 'U', ct: n.ct }] }));
  }
  const d = gFinish({ ...s, key }, tu, evs, { title: withKey(it.name, key, it.minor), bpm: s.tempo ?? 70, evenness: lines, ...(lines ? { goal: { chordTonesOnBeats: true } } : {}), keySig: sigFor(it, key) });
  d.chart = chartFor(it, key);
  return d;
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The guitar family (the jazz add-on): grades 6–8. */
export function guitarCtxFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number): SpecTemplate => ({ family: 'g-ctx', kind, hands: 'R', instrument: 'guitar', swing: true, option });
  const vs = (kind: string, ops: number[]) => ops.map((o) => v(kind, o));
  const SW = 'swing 8ths';
  const CP = 'comping';
  return fam('g-ctx', 'Jazz in context', 'ג׳אז בהקשר', 'jazz', ['jazz'], [
    LT('g-ctx', 1, 'A brother replaces the V: lines', 'אח מחליף את ה־V: קווים', [...vs('cx-bro', [0, 1, 2, 3]), ...vs('cx-bro-line', [0, 1, 2, 3])], CTX_KEYS, [60, 130], SW, 6),
    LT('g-ctx', 2, 'A brother replaces the V: drop-2 comping', 'אח מחליף את ה־V: ליווי דרופ 2', vs('cx-bro-comp', [0, 1, 2, 3, 4]), CTX_KEYS, [60, 120], CP, 6),
    LT('g-ctx', 3, 'All four brothers in turn', 'ארבעת האחים בתורם', vs('cx-bro-all', [0, 1]), CTX_KEYS, [70, 140], SW, 7),
    LT('g-ctx', 4, 'Brothers in a turnaround and a blues', 'אחים בטרנאראונד ובבלוז', vs('cx-bro-forms', [0, 1]), CTX_KEYS, [80, 150], SW, 7),
    LT('g-ctx', 5, 'The backdoor: comping, guide tones, a line', 'הדלת האחורית: ליווי, צלילים מנחים, קו', vs('cx-backdoor', [0, 1, 2]), CTX_KEYS, [60, 130], SW, 7),
    LT('g-ctx', 6, 'Triad pairs over ii–V–I', 'זוגות משולשים על ii–V–I', vs('cx-tpair', [0, 1]), CTX_KEYS, [70, 140], SW, 7),
    LT('g-ctx', 7, 'Superimposed pentatonics over a form', 'פנטטוניות מונחות על צורה', vs('cx-pent', [0, 1, 2]), CTX_KEYS, [70, 140], SW, 7),
    LT('g-ctx', 8, 'The Coltrane sub: comping and a line', 'תחליף קולטריין: ליווי וקו', vs('cx-trane', [0, 1]), CTX_KEYS, [60, 130], SW, 8),
    LT('g-ctx', 9, 'Intros: the vamp and the last four bars', 'פתיחות: הוואמפ וארבע התיבות האחרונות', vs('cx-intro', [0, 1, 2, 3]), CTX_KEYS, [80, 150], CP, 8),
    LT('g-ctx', 10, 'Endings: Basie, ♭VI7–♭II7–I, the tag', 'סיומים: בייסי, ♭VI7–♭II7–I, התג', vs('cx-ending', [0, 1, 2]), CTX_KEYS, [80, 150], CP, 8),
    LT('g-ctx', 11, 'Ballad comping in drop 2', 'ליווי בלדה בדרופ 2', vs('cx-ballad', [0, 1]).map((x) => ({ ...x, swing: false })), CTX_KEYS, [44, 72], 'ballad', 8),
  ]);
}

// ───────────────────────────── bass: b-ctx ─────────────────────────────

export function genBassCtx(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const it = ctxItem(s.kind, key, s.option ?? 0);
  const walk = it.what === 'walk';
  const ln = ctxLine(it, key, walk ? 28 : 33, walk ? 52 : 60, `${s.family}:${s.kind}:${key}:${s.option ?? 0}`);
  const line: BN[] = ln.map((n) => ({ b: n.beat, d: n.dur, p: n.p, ct: n.ct }));
  return drillOf({ ...s, key }, tu, alt(line), {
    en: it.name.en,
    he: it.name.he,
    chart: chartFor(it, key),
    evenness: true,
    goal: { chordTonesOnBeats: true },
    keySig: sigFor(it, key),
    ...(it.minor ? { keyName: keyLabel(key, true) } : {}),
  });
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The bass family (jazz track): walking through the brothers, the backdoor and the Coltrane sub; triad-pair and pentatonic lines. */
export function bassCtxFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number): SpecTemplate => ({ family: 'b-ctx', kind, hands: 'R', instrument: 'bass', swing: true, option });
  const vs = (kind: string, ops: number[]) => ops.map((o) => v(kind, o));
  return fam('b-ctx', 'Jazz in context', 'ג׳אז בהקשר', [
    L('b-ctx', 1, 'Walking ii–V–I through the brothers', 'הליכה ב־ii–V–I דרך האחים', vs('cx-walk', [0, 1, 2, 3]), CTX_KEYS, [70, 160], 'walking 4'),
    L('b-ctx', 2, 'Walking all four brothers in turn', 'הליכה דרך ארבעת האחים בתורם', vs('cx-walk', [4]), CTX_KEYS, [70, 160], 'walking 4'),
    L('b-ctx', 3, 'Walking a blues with brothers', 'הליכה בבלוז עם אחים', vs('cx-walk', [5]), CTX_KEYS, [80, 170], 'walking 4'),
    L('b-ctx', 4, 'Walking the backdoor', 'הליכה בדלת האחורית', vs('cx-walk', [6]), CTX_KEYS, [70, 160], 'walking 4'),
    L('b-ctx', 5, 'Triad-pair arpeggio lines', 'קווי ארפג׳יו של זוגות משולשים', vs('cx-tpair', [0, 1]), CTX_KEYS, [60, 120], 'swung 8ths'),
    L('b-ctx', 6, 'Superimposed pentatonic lines', 'קווים בפנטטוניות מונחות', vs('cx-pent', [0, 1]), CTX_KEYS, [60, 120], 'swung 8ths'),
    L('b-ctx', 7, 'The Coltrane sub: walk and a line', 'תחליף קולטריין: הליכה וקו', [v('cx-walk', 7), v('cx-trane', 0)], CTX_KEYS, [60, 140], 'walking 4 / 8ths'),
  ]);
}
