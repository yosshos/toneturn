// Barry Harris lines (docs/research/BARRY-HARRIS-METHOD.md Part D: D1, D2, D5, D8, D9, D10, D14, D15, D16, D17, D19):
// the keys family k-harrisline, and the same items on the guitar (g-harrisline) and the bass (b-harrisline). The music
// is in ../harrisLines.ts (sources cited there). Every item runs in all 12 keys (the key is part of the item id, so
// every take feeds key mastery); the line items are graded note by note by the line grader, with chord tones (or, in
// the chromatic scale, the scale degrees) on the beats as a goal; new line items start in free time, then quarters,
// then the tempo ladder (rubato.ts). Comping, walking and "feel 6" items run with drums (time drills, no free time).
// Compose items (D17) are free bars: a chord tone on every beat (the rules), the player's own line between; the app's
// rules line is the model shown after the take.
//
// NOTE: generate.ts, guitar.ts, bass.ts and bassNiche.ts import this module and it imports theirs: nothing here calls
// their exports at module top level (only inside functions).

import type { Drill, DrillSpec, FamilyId, BassFamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { Buf, chordDrill, keyName, lineDrill, pianoFinish, pianoTitle } from './generate';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle, Ev } from './guitar';
import { drop2Voicings, finish as gFinish, nearestVoicing, place } from './guitar';
import { alt, drillOf, type BN } from './bass';
import { chartLc, rulesFor, type LC } from './bassNiche';
import {
  abcThirds,
  arpIntoScale,
  chromaticArpsDown,
  chromaticUpDown,
  feelSixLine,
  importantArps,
  lick5432,
  miscRuleLine,
  mod12,
  moveModel,
  MOVE_CT,
  MOVE_SCALE,
  MOVES,
  OUTLINES,
  TUNE_CHARTS,
  outlineFromChart,
  chromaticTwoVoices,
  DOM_RULE_WAYS,
  type TwoVoiceIv,
  phrase5432,
  ruleDrillLine,
  scaleOutline,
  sevenDownLine,
  threeToFlatNine,
  tripletLine,
  type ChromKind,
  type LineNote,
  type OutlineChord,
  type PhraseN,
  type PhraseQ,
  type RuleKind,
} from '../harrisLines';
import { pivotArp } from '../pivotArp';
import { isVerified } from '../verifiedContent';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
/** A level title naming only what is on show (items hidden until verified: verifiedContent.ts). */
const pick = (shown: boolean, full: [string, string], short: [string, string]): T2 => (shown ? t(...full) : t(...short));
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Chord roots as charts spell them (♯IV as F♯ in C, the rest with flats). */
const ROOT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
/** The key chord roots are spelled for (set by each builder): sharps in G, D, A, E, B, flats elsewhere. */
let spellKey = 0;
const nm = (pc: number): string => ([7, 2, 9, 4, 11].includes(spellKey) ? SHARP : ROOT)[mod12(pc)];
/** All 12 keys, round the cycle of 4ths from C. */
export const HL_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

export const HL_FAMILY: FamilyId = 'k-harrisline';
export const isHarrisLineKind = (kind: string): boolean => kind.startsWith('hl-');

// ───────────────────────────── the items (shared by every instrument) ─────────────────────────────

/** D14: the rule lines from every degree — [kind, degree (semitones), count]. */
export const RULE_OPTS: [RuleKind, number, 0 | 1 | 2 | 3][] = [
  // major, one half step (6–5) from 1, 3, 5, 6
  ['maj', 0, 1], ['maj', 4, 1], ['maj', 7, 1], ['maj', 9, 1],
  // major, three from 3, 5, 6; two from 2, 4
  ['maj', 4, 3], ['maj', 7, 3], ['maj', 9, 3], ['maj', 2, 2], ['maj', 5, 2],
  // minor: one from 1, ♭3, 5, 6; two from 2, 4
  ['min', 0, 1], ['min', 3, 1], ['min', 7, 1], ['min', 9, 1], ['min', 2, 2], ['min', 5, 2],
];
const DEG_NAME: Record<number, string> = { 0: '1', 2: '2', 3: '♭3', 4: '3', 5: '4', 7: '5', 9: '6', 10: '♭7' };
const COUNT_T: Record<number, T2> = { 0: t('no extra note', 'בלי צליל נוסף'), 1: t('one extra half step', 'חצי טון נוסף אחד'), 2: t('two extra half steps', 'שני חצאי טון נוספים'), 3: t('three extra half steps', 'שלושה חצאי טון נוספים') };
/** D10: triplet items — [degree, type, count?]. */
export const TRIPLET_OPTS: [number, 'eighth-rise' | 'eighth-fall' | 'sixteenth', (0 | 1 | 2 | 3)?][] = [
  [4, 'eighth-rise'],
  [2, 'eighth-fall'],
  [10, 'eighth-fall'],
  [0, 'sixteenth'],
  [4, 'sixteenth', 3],
];
/** D10: the miscellaneous rule — [kind, start degree, steps up]. */
export const MISC_OPTS: [RuleKind, number, number][] = [
  ['dom', 7, 3],
  ['dom', 10, 1],
  ['dom', 4, 5],
  ['maj', 4, 3],
];
/** The chromatic scale in two voices: [scale, interval]. 3rds, 6ths, 10ths first (major, then dominant); then the rest. */
export const CHROM2_OPTS: ['maj' | 'dom', TwoVoiceIv][] = [
  ['maj', '3rds'], ['maj', '6ths'], ['maj', '10ths'], ['dom', '3rds'], ['dom', '6ths'], ['dom', '10ths'],
  ['maj', '4ths'], ['maj', '5ths'], ['maj', '2nds'], ['maj', '7ths'], ['maj', 'octaves'],
];
const IV_T: Record<TwoVoiceIv, T2> = {
  '2nds': t('2nds', 'סקונדות'), '3rds': t('3rds', 'טרצות'), '4ths': t('4ths', 'קוורטות'), '5ths': t('5ths', 'קווינטות'),
  '6ths': t('6ths', 'סקסטות'), '7ths': t('7ths', 'ספטימות'), octaves: t('octaves', 'אוקטבות'), '10ths': t('10ths', 'דצימות'),
};
const PH_Q: PhraseQ[] = ['dom', 'maj', 'min'];
const PH_N: PhraseN[] = [5, 4, 3, 2];
/** The scale outlines in Parks's order (F2.2): blues, rhythm changes, Cherokee, Donna Lee (Indiana), How High the Moon, Night in Tunisia, All the Things You Are, Giant Steps. */
export const OUTLINE_TUNES = ['blues', 'rhythm', 'cherokee', 'indiana', 'hhtm', 'tunisia', 'attya', 'giant'] as const;
const MOVE_IDS = ['i-vi', 'ii-v', 'rhythm'] as const;

/** A line item: its notes (absolute, from a root pitch the instrument chooses), its chart and title. */
interface LineItem {
  line: LineNote[];
  title: T2;
  chart?: string[];
  /** Key signature: semitones above the key (a dominant's key is a 4th up; minor is the relative major). */
  sigOf: number;
  /** Chord tones / scale degrees on the beats is a goal of the item. */
  ctGoal: boolean;
  /** Two voices: [upper, lower] per note of `line` (the upper is the line). */
  pairs?: [number, number][];
  /** The hand of the lower voice on the piano (10ths take the left hand). */
  lowerHand?: 'R' | 'L';
}

const chordSym = (key: number, d: number, q: string): string => `${nm(key + d)}${q === 'maj' ? '6' : q}`;
/** One chart string per bar from [degree, quality, beats] chords. */
function chartOf(key: number, chords: { d: number; q: string; beats: number }[]): string[] {
  spellKey = mod12(key);
  const bars: string[] = [];
  let at = 0;
  for (const c of chords) {
    const bar = Math.floor(at / 4 + 1e-9);
    const sym = chordSym(key, c.d, c.q);
    bars[bar] = bars[bar] ? `${bars[bar]} ${sym}` : sym;
    for (let b = bar + 1; b < Math.floor((at + c.beats) / 4 - 1e-9) + 1; b++) bars[b] = bars[b] ?? '%';
    at += c.beats;
  }
  return bars.map((x) => x ?? '%');
}
const outlineChart = (key: number, cs: OutlineChord[]): string[] =>
  chartOf(
    key,
    cs.flatMap((c) => (c.sym.length === 1 ? [{ d: c.sym[0][0], q: c.sym[0][1], beats: c.beats }] : c.sym.map(([d, q]) => ({ d, q, beats: c.beats / c.sym.length })))),
  );

/** Register: a root pitch class placed so that [root, root + span] sits inside [lo, hi]. */
const rootIn = (pc: number, lo: number, hi: number, span: number): number => {
  let r = lo + mod12(pc - lo);
  while (r + span > hi && r - 12 >= lo - 2) r -= 12;
  return r;
};
const spanOf = (l: LineNote[]): [number, number] => [Math.min(...l.map((n) => n.p)), Math.max(...l.map((n) => n.p))];
/** Move a whole line by octaves so it sits inside [lo, hi] (as near the middle as it goes). */
export function fit(l: LineNote[], lo: number, hi: number): LineNote[] {
  const [a, b] = spanOf(l);
  const mid = (lo + hi) / 2;
  // the octave shift with the least overflow outside [lo, hi], then the one nearest the middle
  const cost = (k: number) => [Math.max(0, lo - (a + 12 * k)) + Math.max(0, b + 12 * k - hi), Math.abs((a + b) / 2 + 12 * k - mid)];
  let best = 0;
  for (let k = -4; k <= 4; k++) {
    const [o, m] = cost(k);
    const [ob, mb] = cost(best);
    if (o < ob || (o === ob && m < mb)) best = k;
  }
  return best ? l.map((n) => ({ ...n, p: n.p + 12 * best })) : l;
}

/** The line items of a kind and option in `key`, in the register [lo, hi]. Null for the comping / compose kinds. */
export function lineItem(kind: string, op: number, key: number, lo: number, hi: number): LineItem | null {
  const k = mod12(key);
  spellKey = k;
  const kn = keyName(k);
  const root = (span: number) => rootIn(k, lo, hi, span);
  switch (kind) {
    case 'hl-chrom': {
      // D1: Barry's chromatic scale, up and down one octave — major, dominant, minor 6th-diminished.
      const kinds = ['maj', 'dom', 'm6dim'] as const;
      const ck: ChromKind = kinds[Math.min(2, op)];
      const name = ({ maj: t(`${kn} major`, `${kn} מז׳ור`), dom: t(`${kn}7`, `${kn}7`), m6dim: t(`${keyName(k, true)} minor 6th-diminished`, `${keyName(k, true)} מינור שישית־מוקטן`) } as Record<string, T2>)[ck];
      return {
        line: fit(chromaticUpDown(root(12), ck), lo, hi),
        title: t(`Barry's chromatic scale · ${name.en}: scale degrees on the beats, skip back at each half step`, `הסולם הכרומטי של בארי · ${name.he}: דרגות הסולם על הפעמות, דילוג וחזרה בכל חצי טון`),
        chart: [ck === 'dom' ? `${kn}7` : ck === 'maj' ? `${kn}6` : `${keyName(k, true)}m6`, '%', '%', '%'],
        sigOf: ck === 'dom' ? 5 : ck === 'm6dim' ? 3 : 0,
        ctGoal: true,
      };
    }
    case 'hl-outline': {
      // D2: the scale outline of a tune — one scale per bar, up from the root; a long chord comes back down; the related
      // diminished bar marked.
      const id = OUTLINE_TUNES[Math.min(OUTLINE_TUNES.length - 1, op)];
      const o = id === 'blues' || id === 'rhythm' || id === 'indiana' ? OUTLINES[id] : { name: TUNE_CHARTS[id].name, chords: outlineFromChart(TUNE_CHARTS[id].text, TUNE_CHARTS[id].key) };
      const { line } = scaleOutline(k, o.chords, lo + 2);
      const dimBar = o.chords.reduce((acc, c, i) => (acc >= 0 ? acc : c.dimBar ? o.chords.slice(0, i).reduce((a, x) => a + x.beats, 0) / 4 + 1 : -1), -1);
      const dimT = dimBar > 0 ? t(` · bar ${Math.floor(dimBar)}: the related diminished`, ` · תיבה ${Math.floor(dimBar)}: המוקטן הקשור`) : t('', '');
      return {
        line: fit(line, lo, hi),
        title: t(`Scale outline of ${o.name.en} in ${kn}: one scale a bar, up from the root${dimT.en}`, `מתאר הסולמות של ${o.name.he} ב־${kn}: סולם אחד בכל תיבה, מהשורש למעלה${dimT.he}`),
        chart: outlineChart(k, o.chords),
        sigOf: id === 'blues' ? 5 : id === 'tunisia' ? 3 : 0,
        ctGoal: true,
      };
    }
    case 'hl-chrom2': {
      // Barry's chromatic scale in two voices (owner 2026-11-15): the chromatic scale up and down with a second voice a
      // 3rd, 6th or 10th below (ops 0–5: major, then dominant), then the other intervals (ops 6–10, major). 7ths, octaves
      // and 10ths: the lower voice in the left hand.
      const [ck, iv] = CHROM2_OPTS[Math.min(CHROM2_OPTS.length - 1, op)];
      const { pairs, line } = chromaticTwoVoices(root(12) + (iv === '10ths' ? 12 : 0), ck, iv);
      const sym = ck === 'dom' ? `${kn}7` : `${kn}6`;
      const ivT = IV_T[iv];
      return {
        line: fit(line, lo, hi),
        pairs,
        lowerHand: iv === '10ths' || iv === 'octaves' || iv === '7ths' ? 'L' : 'R',
        title: t(`Barry's chromatic scale in two voices · ${sym}: a second voice in ${ivT.en} below`, `הסולם הכרומטי של בארי בשני קולות · ${sym}: קול שני ב${ivT.he} מתחת`),
        chart: [sym, '%', '%', '%'],
        sigOf: ck === 'dom' ? 5 : 0,
        ctGoal: true,
      };
    }
    case 'hl-eight': {
      // The dominant rules from every degree (Barry's half-step rules, §8): down the dominant scale from each degree on
      // the beat, with the half steps that degree allows (DOM_RULE_WAYS), each line twice. The kind id is the old
      // "eight ways" item's (kept for saved progress).
      const [deg, count] = DOM_RULE_WAYS[Math.min(DOM_RULE_WAYS.length - 1, op)];
      const r = root(deg + 12);
      return {
        line: fit(ruleDrillLine(r, 'dom', deg + 12, count), lo, hi),
        title: t(`The dominant rule from ${DEG_NAME[deg]} · ${kn}7: ${COUNT_T[count].en}`, `חוק הדומיננט מ־${DEG_NAME[deg]} · ${kn}7: ${COUNT_T[count].he}`),
        chart: [`${kn}7`, '%', `${kn}7`, '%'],
        sigOf: 5,
        ctGoal: false,
      };
    }
    case 'hl-5432': {
      // D5: the 5-4-3-2 phrases (Workbook 1; notes per a workshop attendee, verify), each over one bar of its chord.
      const q = PH_Q[Math.min(2, Math.floor(op / 4))];
      const n = PH_N[op % 4];
      const r = root(26);
      const line = phrase5432(r, q, n, 0, 4);
      const sym = q === 'dom' ? `${kn}7` : q === 'maj' ? `${kn}maj7` : `${keyName(k, true)}m6`;
      const qT = { dom: t('dominant', 'דומיננט'), maj: t('major', 'מז׳ור'), min: t('minor', 'מינור') }[q];
      return {
        line: fit([...line, ...line.map((x) => ({ ...x, beat: r6(x.beat + 4) }))], lo, hi),
        title: t(`The "${n}" phrase, ${qT.en} · ${sym}`, `משפט ה־"${n}", ${qT.he} · ${sym}`),
        chart: [sym, sym],
        sigOf: q === 'dom' ? 5 : q === 'min' ? 3 : 0,
        ctGoal: true,
      };
    }
    case 'hl-lick': {
      // D5: the combined 5-4-3-2 lick on the dominant (verify), twice.
      const r = root(26);
      const one = lick5432(r);
      return {
        line: fit([...one.map((x, i) => (i === one.length - 1 ? { ...x, dur: 2 } : x)), ...one.map((x) => ({ ...x, beat: r6(x.beat + 8) }))], lo, hi),
        title: t(`The 5-4-3-2 lick · ${kn}7`, `הליק 5-4-3-2 · ${kn}7`),
        chart: [`${kn}7`, '%', '%', '%'],
        sigOf: 5,
        ctGoal: true,
      };
    }
    case 'hl-lick-outline': {
      // D5 in a scale outline: the phrases inside the line — the blues' first four bars (the lick in bars 3–4), or the
      // Indiana changes' first four (the major "5" in bar 2, the "2" into the VI7's second bar).
      const blues = op === 0;
      const cs = blues ? OUTLINES.blues.chords.slice(0, 2) : OUTLINES.indiana.chords.slice(0, 1).concat(OUTLINES.indiana.chords.slice(2, 3));
      const { line, roots } = scaleOutline(k, cs, lo + 2);
      let more: LineNote[];
      if (blues) more = lick5432(roots[0] + (roots[0] + 24 > hi ? -12 : 0), 8);
      else {
        const r = roots[0];
        const five = phrase5432(r, 'maj', 5, 0, 4).map((x) => ({ ...x, beat: r6(x.beat + 4) }));
        // bar 2 = the major "5" on I; bar 4 = the dominant "2" on VI7
        const vi = roots[1];
        const two = phrase5432(vi, 'dom', 2, 0, 4).map((x) => ({ ...x, beat: r6(x.beat + 12) }));
        const l2 = [...line.filter((x) => x.beat < 4), ...five, ...line.filter((x) => x.beat >= 4).map((x) => ({ ...x, beat: r6(x.beat + 4) })), ...two];
        return {
          line: fit(l2, lo, hi),
          title: t(`The phrases in a scale outline: the Indiana changes in ${kn}`, `המשפטים בתוך מתאר סולמות: המהלך של Indiana ב־${kn}`),
          chart: [`${kn}6`, '%', `${nm(k + 9)}7`, '%'],
          sigOf: 0,
          ctGoal: true,
        };
      }
      return {
        line: fit([...line, ...more], lo, hi),
        title: t(`The phrases in a scale outline: the blues in ${kn}, the 5-4-3-2 lick in bars 3–4`, `המשפטים בתוך מתאר סולמות: הבלוז ב־${kn}, הליק 5-4-3-2 בתיבות 3–4`),
        chart: [`${kn}7`, `${nm(k + 5)}7`, `${kn}7`, '%'],
        sigOf: 5,
        ctGoal: true,
      };
    }
    case 'hl-imp-arps': {
      // D8: the three important arpeggios on a dominant (on 1, 5, ♭7), 1-3-5-8 up, 8-5-3-1 down, from the 3rd.
      const shape = (['up', 'down', 'inv'] as const)[Math.min(2, op)];
      const r = root(25);
      const sh = { up: t('1-3-5-8', '1-3-5-8'), down: t('8-5-3-1', '8-5-3-1'), inv: t('from the 3rd', 'מהטרצה') }[shape];
      return {
        line: fit(importantArps(r, shape), lo, hi),
        title: t(`The three important arpeggios on ${kn}7: on 1, the minor on 5, the major on ♭7 · ${sh.en}`, `שלושת הארפג׳ים החשובים על ${kn}7: על 1, המינור על 5, המז׳ור על ♭7 · ${sh.he}`),
        chart: [`${kn}7`, '%'],
        sigOf: 5,
        ctGoal: true,
      };
    }
    case 'hl-imp-scale': {
      // D8: an important arpeggio into the scale (op 0–2), or the ♭7-major pivot on the dominant (op 3: B♭maj7 over
      // C7 → F; op 4: through ii–V–I) [JL; P5].
      if (op <= 2) {
        const r = root(24);
        const which = op as 0 | 1 | 2;
        const nmT = [t('on 1', 'על 1'), t('the minor on 5', 'המינור על 5'), t('the major on ♭7', 'המז׳ור על ♭7')][which];
        return {
          line: fit(arpIntoScale(r, which), lo, hi),
          title: t(`${kn}7: the arpeggio ${nmT.en}, then the scale down by the rule`, `${kn}7: הארפג׳ ${nmT.he}, ואז הסולם למטה לפי החוק`),
          chart: [`${kn}7`, '%'],
          sigOf: 5,
          ctGoal: true,
        };
      }
      // the dominant is the V of key + 5 (C7 → F): the major 7 on its ♭7 (B♭maj7 = C9sus13) is the IV of the resolution
      const V = root(24);
      if (op === 3) {
        // B♭maj7 as a pivot (B♭, then D F A below), the C7 arpeggio on down (G E C B♭), into F's 3rd (A, a half step down)
        const piv = pivotArp(V + 10, 'maj7');
        const c7 = [0, 4, 7, 10].map((x) => mod12(V + x));
        const down: number[] = [];
        for (let p = piv[3] - 1; down.length < 4; p--) if (c7.includes(mod12(p))) down.push(p);
        const ps = [...piv, ...down];
        const line: LineNote[] = [...ps.map((p, i) => ({ p, beat: r6(i / 2), dur: 0.5, ct: true })), { p: down[3] - 1, beat: 4, dur: 2, ct: true }];
        return {
          line: fit(line, lo, hi),
          title: t(`The ♭7-major pivot: ${nm(k + 10)}maj7 over ${kn}7, then into ${nm(k + 5)}`, `הפיבוט של המז׳ור על ♭7: ${nm(k + 10)}maj7 מעל ${kn}7, ואז אל ${nm(k + 5)}`),
          chart: [`${kn}7`, `${nm(k + 5)}maj7`],
          sigOf: 5,
          ctGoal: true,
        };
      }
      // op 4: ii–V–I in key+5: Gm7 pivot | C7 as B♭maj7 pivot | Fmaj7 pivot, the root
      const I = mod12(k + 5);
      // ii (Gm7), the V as the major 7 on its ♭7 (C7 → B♭maj7), I (Fmaj7)
      const roots = [mod12(k + 7), mod12(k + 10), I];
      const qs = ['m7', 'maj7', 'maj7'] as const;
      const ps: number[] = [];
      roots.forEach((pc, i) => ps.push(...pivotArp(lo + 2 + mod12(pc - lo - 2), qs[i])));
      const line: LineNote[] = ps.map((p, i) => ({ p, beat: r6(i / 2), dur: 0.5, ct: true }));
      line.push({ p: ps[8], beat: 6, dur: 2, ct: true });
      return {
        line: fit(line, lo, hi),
        title: t(`Pivots through ii–V–I in ${nm(I)}: over the V, the major 7 on its ♭7 (${nm(k + 10)}maj7)`, `פיבוטים דרך ii–V–I ב־${nm(I)}: מעל ה־V, המז׳ור 7 על ה־♭7 שלו (${nm(k + 10)}maj7)`),
        chart: [`${nm(I + 2)}m7 ${kn}7`, `${nm(I)}maj7`],
        sigOf: 5,
        ctGoal: true,
      };
    }
    case 'hl-sevendown': {
      // D9: seven down to the 3rd — the tonic is the key: minor ii–V (Dø–G7 → Cm, B♭7 up and down to B), the major
      // version as the family move (B♭7 is G7's related dominant), and the descending figure alone.
      const tonic = rootIn(k, lo + 3, hi, 12);
      const form = op === 2 ? 'down' : 'full';
      const raw = sevenDownLine(tonic, form);
      // the major version resolves on into the 3rd of I (B → C → E), the minor one stays on the tonic
      const line = op === 1 ? [...raw.slice(0, -1), { ...raw[raw.length - 1], dur: 1 }, { p: tonic + 4, beat: raw[raw.length - 1].beat + 1, dur: 2, ct: true }] : raw;
      const minor = op !== 1;
      const ii = minor ? `${nm(k + 2)}ø7` : `${nm(k + 2)}m7`;
      const I = minor ? `${keyName(k, true)}m6` : `${kn}6`;
      return {
        line: fit(line, lo, hi),
        title: minor
          ? t(`Seven down to the 3rd: ${ii} – ${nm(k + 7)}7 → ${I}, ${nm(k + 10)}7 up and down, landing on ${nm(k + 11)}`, `שבע למטה לטרצה: ${ii} – ${nm(k + 7)}7 → ${I}, ‏${nm(k + 10)}7 למעלה ולמטה, נחיתה על ${nm(k + 11)}`)
          : t(`Seven down to the 3rd, the family move: ${ii} – ${nm(k + 7)}7 → ${I}, ${nm(k + 10)}7 (a related dominant) down to ${nm(k + 11)}`, `שבע למטה לטרצה, מהלך המשפחה: ${ii} – ${nm(k + 7)}7 → ${I}, ‏${nm(k + 10)}7 (דומיננט קשור) עד ${nm(k + 11)}`),
        chart: form === 'full' ? [ii, `${nm(k + 7)}7`, I] : [`${nm(k + 7)}7♭9`, I],
        sigOf: minor ? 3 : 0,
        ctGoal: true,
      };
    }
    case 'hl-3b9': {
      // D15: 3-to-♭9 over the whole family (the same four notes: the dim on the 3rd), resolving into the tonic.
      const tonic = rootIn(k, lo + 1, hi, 18);
      const { line, roots } = threeToFlatNine(tonic, op === 1 ? 'down' : 'up');
      return {
        line: fit(line, lo, hi),
        title: t(`3 to ♭9 over the family: ${roots.map((r) => `${nm(r)}7`).join(' ')} → ${kn} — the same diminished each time`, `3 עד ♭9 על המשפחה: ${roots.map((r) => `${nm(r)}7`).join(' ')} → ${kn} — אותו מוקטן בכל פעם`),
        chart: [`${nm(roots[0])}7 ${nm(roots[1])}7`, `${nm(roots[2])}7 ${nm(roots[3])}7`, `${kn}6`],
        sigOf: 0,
        ctGoal: true,
      };
    }
    case 'hl-rules': {
      // D14: the major and minor rules from every degree (the dominant's are in harris 2 / 14), each line twice.
      const [rk, deg, count] = RULE_OPTS[Math.min(RULE_OPTS.length - 1, op)];
      const r = root(deg + 12);
      const line = ruleDrillLine(r, rk, deg + 12, count);
      const sym = rk === 'maj' ? `${kn}6` : `${keyName(k, true)}m6`;
      const kT = rk === 'maj' ? t('major', 'מז׳ור') : t('minor', 'מינור');
      return {
        line: fit(line, lo, hi),
        title: t(`The ${kT.en} rule from ${DEG_NAME[deg]} · ${sym}: ${COUNT_T[count].en}`, `חוק ה${kT.he} מ־${DEG_NAME[deg]} · ${sym}: ${COUNT_T[count].he}`),
        chart: [sym, '%', sym, '%'],
        sigOf: rk === 'min' ? 3 : 0,
        ctGoal: true,
      };
    }
    case 'hl-triplet': {
      // D10: the triplet rules on the dominant scale.
      const [deg, type, count] = TRIPLET_OPTS[Math.min(TRIPLET_OPTS.length - 1, op)];
      const r = root(deg + 4);
      const line = tripletLine(r, 'dom', deg + 12, type, count);
      const what = type === 'sixteenth' ? t('a 16th triplet follows its first note', 'טריולת שש־עשריות הולכת לפי הצליל הראשון שלה') : t('an 8th triplet follows its middle note', 'טריולת שמיניות הולכת לפי הצליל האמצעי שלה');
      return {
        line: fit(line, lo, hi),
        title: t(`Triplet rule · ${kn}7: ${what.en}`, `חוק הטריולה · ${kn}7: ${what.he}`),
        chart: [`${kn}7`, '%'],
        sigOf: 5,
        ctGoal: true,
      };
    }
    case 'hl-misc': {
      // D10: the miscellaneous rule.
      const [rk, deg, up] = MISC_OPTS[Math.min(MISC_OPTS.length - 1, op)];
      const r = root(deg + 12);
      const line = miscRuleLine(r, rk, deg, up);
      const sym = rk === 'dom' ? `${kn}7` : `${kn}6`;
      return {
        line: fit(line, lo, hi),
        title: t(`The miscellaneous rule · ${sym}: up from ${DEG_NAME[deg]}, down by ${DEG_NAME[deg]}'s rule`, `החוק השונה · ${sym}: למעלה מ־${DEG_NAME[deg]}, למטה לפי החוק של ${DEG_NAME[deg]}`),
        chart: [sym, '%', '%', '%'],
        sigOf: rk === 'dom' ? 5 : 0,
        ctGoal: true,
      };
    }
    case 'hl-feel6': {
      // D16: feel 6 in 4 — dotted quarters, or three-note cells, over three bars of the dominant.
      const r = root(12);
      return {
        line: fit(feelSixLine(r, op === 1 ? 'cells' : 'dotted'), lo, hi),
        title: op === 1 ? t(`Feel 6 in 4 · ${kn}7: cells of three 8ths over the bar line`, `להרגיש 6 בתוך 4 · ${kn}7: תאים של שלוש שמיניות מעל קו התיבה`) : t(`Feel 6 in 4 · ${kn}7: a line in dotted quarters`, `להרגיש 6 בתוך 4 · ${kn}7: קו ברבעים מנוקדים`),
        chart: [`${kn}7`, '%', '%'],
        sigOf: 5,
        ctGoal: false,
      };
    }
    case 'hl-arps-down': {
      // D19: major arpeggios chromatically down, root position and the inversions (4 triads from the key down).
      const inv = Math.min(2, op) as 0 | 1 | 2;
      const r = root(19);
      const invT = [t('root position', 'מצב יסודי'), t('first inversion', 'היפוך ראשון'), t('second inversion', 'היפוך שני')][inv];
      return {
        line: fit(chromaticArpsDown(r, 4, inv), lo, hi),
        title: t(`Major arpeggios chromatically down from ${kn} · ${invT.en}`, `ארפג׳ים מז׳וריים בירידה כרומטית מ־${kn} · ${invT.he}`),
        chart: [`${kn} ${nm(k - 1)}`, `${nm(k - 2)} ${nm(k - 3)}`, `${nm(k - 4)}`],
        sigOf: 0,
        ctGoal: true,
      };
    }
    case 'hl-abc': {
      // The ABCs, Barry's order for knowing a scale (owner 2026-11-15): note by note, in 3rds, then 3rds with a half
      // step below the first note of each, up and down.
      const shape = (['notes', 'plain', 'half-up', 'half-down'] as const)[Math.min(3, op)];
      const r = root(16);
      const ttl = {
        notes: t(`The ABCs · ${kn}: the scale note by note, up and down`, `האלף־בית · ${kn}: הסולם צליל אחר צליל, למעלה ולמטה`),
        plain: t(`The ABCs · ${kn}: the scale in 3rds, up and down`, `האלף־בית · ${kn}: הסולם בטרצות, למעלה ולמטה`),
        'half-up': t(`The ABCs · ${kn}: 3rds up, a half step below the first note of each`, `האלף־בית · ${kn}: טרצות עולות, חצי טון מתחת לצליל הראשון של כל אחת`),
        'half-down': t(`The ABCs · ${kn}: 3rds down, a half step below the first note of each`, `האלף־בית · ${kn}: טרצות יורדות, חצי טון מתחת לצליל הראשון של כל אחת`),
      }[shape];
      return {
        line: fit(abcThirds(r, shape), lo, hi),
        title: ttl,
        chart: [`${kn}maj7`, '%', '%', '%'],
        sigOf: 0,
        ctGoal: false,
      };
    }
  }
  return null;
}

/** Start → target tempo (♩) of the line levels; comping and compose have their own. */
const LINE_TEMPO: [number, number] = [60, 120];

// ───────────────────────────── keys: k-harrisline ─────────────────────────────

const PIANO_LO = 53;
const PIANO_HI = 86;

/** The piano drill of a k-harrisline item. */
export function genHarrisLine(s0: DrillSpec): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const op = s.option ?? 0;
  if (s.kind === 'hl-upbeat' || s.kind === 'hl-ands') return pianoComp(s, op);
  if (s.kind === 'hl-compose') return pianoCompose(s, op);
  const it = lineItem(s.kind, op, key, PIANO_LO, PIANO_HI);
  if (!it) throw new Error(`Unknown k-harrisline kind: ${s.kind}`);
  if (it.pairs) {
    // two voices in the right hand: the chromatic line on top, the second voice under it (fit moved the line by octaves)
    const dv = it.line[0].p - it.pairs[0][0];
    const buf = new Buf();
    it.line.forEach((n, i) => buf.add(n.beat, n.dur, it.pairs![i].map((p, v) => ({ pitch: p + dv, hand: v === 1 ? (it.lowerHand ?? 'R') : ('R' as const), chordTone: n.ct }))));
    const s2: DrillSpec = it.lowerHand === 'L' ? { ...s, hands: 'RL' } : s;
    const d2 = pianoFinish(s2, buf, pianoTitle([it.title], s2), { evenness: true, hands: false, chordTonesOnBeats: true }, LINE_TEMPO[0], 4, SIG[mod12(key + it.sigOf)]);
    return { ...d2, ...(it.chart ? { chart: it.chart } : {}) };
  }
  const d = lineDrill(s, it.line, pianoTitle([it.title], s), it.ctGoal ? { chordTonesOnBeats: true } : {}, SIG[mod12(key + it.sigOf)], LINE_TEMPO[0]);
  return { ...d, ...(it.chart ? { chart: it.chart } : {}), ...(s.kind === 'hl-feel6' ? { drums: { groove: 'swing' } } : {}) };
}

/** The progression the comping items run over: the jazz blues (12 bars). */
/** The comping loop (one screen): ii–V–I–VI7. */
const COMP_LOOP: [number, '6' | '7' | 'm7' | '°7'][] = [[2, 'm7'], [7, '7'], [0, '6'], [9, '7']];
const COMP_BLUES: [number, '6' | '7' | 'm7' | '°7'][] = [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [6, '°7'], [0, '7'], [9, '7'], [2, 'm7'], [7, '7'], [0, '7'], [7, '7']];
const COMP_CT: Record<string, number[]> = { '6': [0, 4, 7, 9], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], '°7': [0, 3, 6, 9] };

/**
 * D16 upbeat comping [R1 ch.4; R2 "Importance of Playing Upbeats"]: a chord on the "and" of 2 and of 4 (op 0) or of 1
 * and 4 (op 1) of every bar of a ii–V–I–VI loop — the left hand a Harris shell (root + 7th, root + 6th on a 6 chord), the right
 * hand the 3rd and 5th above. 'hl-ands' (the game "hit only the ands"): the 3rd of each chord on every "and", 4 bars.
 */
function pianoComp(s: DrillSpec, op: number): Drill {
  const key = s.key;
  spellKey = mod12(key);
  const evs: { beat: number; dur: number; notes: { pitch: number; hand: 'L' | 'R' }[]; required: number[]; allowed: number[] }[] = [];
  const bars = s.kind === 'hl-ands' ? COMP_BLUES.slice(0, 4) : COMP_LOOP;
  bars.forEach(([d, q], bar) => {
    const r = 43 + mod12(key + d - 43);
    const ct = COMP_CT[q];
    const lh = [r, r + ct[3]];
    const third = 60 + mod12(r + ct[1] - 60);
    const rh = [third, third + (ct[2] - ct[1])];
    if (s.kind === 'hl-ands') {
      for (let k = 0; k < 4; k++) evs.push({ beat: bar * 4 + k + 0.5, dur: 0.4, notes: [{ pitch: third, hand: 'R' }], required: [third], allowed: [third] });
      return;
    }
    const hits = op === 1 ? [0.5, 3.5] : [1.5, 3.5];
    for (const h of hits) {
      const all = [...lh, ...rh];
      evs.push({ beat: bar * 4 + h, dur: 0.45, notes: [...lh.map((p) => ({ pitch: p, hand: 'L' as const })), ...rh.map((p) => ({ pitch: p, hand: 'R' as const }))], required: all, allowed: all });
    }
  });
  const kn = keyName(key);
  const sp: DrillSpec = { ...s, hands: s.kind === 'hl-ands' ? 'R' : 'RL', swing: true };
  const ttl =
    s.kind === 'hl-ands'
      ? t(`Hit only the "ands": the 3rd of each chord, blues in ${kn}`, `רק על ה"וְ": הטרצה של כל אקורד, בלוז ב־${kn}`)
      : op === 1
        ? t(`Upbeat comping, ii–V–I–VI in ${kn}: a shell on the "and" of 1 and of 4`, `ליווי על הקצב החלש, ii–V–I–VI ב־${kn}: מעטפת על ה"וְ" של 1 ושל 4`)
        : t(`Upbeat comping, ii–V–I–VI in ${kn}: a shell on the "and" of 2 and of 4`, `ליווי על הקצב החלש, ii–V–I–VI ב־${kn}: מעטפת על ה"וְ" של 2 ושל 4`);
  const d = chordDrill(sp, evs, ttl, 100, {}, SIG[mod12(key + 5)]);
  // the click on 2 and 4 (a time drill: no free-time stage; on a phone no drums notice pushes the run off the screen)
  return { ...d, beats: bars.length * 4, chart: bars.map(([dd, q]) => `${nm(key + dd)}${q}`), click: '24' };
}

/** The compose moves' chords as [degree, quality, beats], with their landing sets (chord tones) and scales. */
function moveChords(id: (typeof MOVE_IDS)[number], key: number) {
  return MOVES[id].chords.map(([d, q, beats]) => ({ d, q, beats, root: mod12(key + d), ct: MOVE_CT[q].map((x) => mod12(key + d + x)), sc: MOVE_SCALE[q].map((x) => mod12(key + d + x)) }));
}
const COMPOSE_T = (id: (typeof MOVE_IDS)[number], kn: string): T2 =>
  id === 'rhythm'
    ? t(`Your line in a tune: rhythm changes (A) in ${kn} — a chord tone on every beat`, `הקו שלכם בתוך שיר: ריתם צ׳יינג׳ס (A) ב־${kn} — צליל אקורד על כל פעמה`)
    : t(`Compose a line over ${MOVES[id].name.en} in ${kn}: a chord tone on every beat, then play it again`, `חברו קו מעל ${MOVES[id].name.he} ב־${kn}: צליל אקורד על כל פעמה, ואז נגנו אותו שוב`);

/**
 * D17 [SG, from Harris and Rees workshops]: compose a line over a move (I → VI7, ii–V–I) by the rules — chord tones on
 * the beats, scale or chromatic notes between — then play it in a tune (rhythm changes A). Free bars: every beat is a
 * landing (any chord tone of the chord there), the notes between must sit in the chord's scale or move by a half step
 * into it. The click is on 2 and 4 (the band comps on the guitar); the rules line is the model.
 */
function pianoCompose(s: DrillSpec, op: number): Drill {
  const key = s.key;
  const id = MOVE_IDS[Math.min(2, op)];
  const cs = moveChords(id, key);
  const model = moveModel(key, MOVES[id].chords, 60, 84, 72 + mod12(key + 4 - 72 + 12) % 12);
  const total = cs.reduce((a, c) => a + c.beats, 0);
  const buf = new Buf();
  let at = 0;
  const scale: { from: number; to: number; pcs: number[] }[] = [];
  for (const c of cs) {
    scale.push({ from: at, to: at + c.beats, pcs: [...new Set([...c.sc, ...c.ct])] });
    for (let b = at; b < at + c.beats; b++) {
      const m = model.find((n) => Math.abs(n.beat - b) < 1e-6)!;
      buf.add(b, 1, [{ pitch: m.p, hand: 'R', chordTone: true }]);
      buf.notes[buf.notes.length - 1].land = c.ct;
    }
    at += c.beats;
  }
  const kn = keyName(key);
  const d = pianoFinish(s, buf, pianoTitle([COMPOSE_T(id, kn)], s), { evenness: false, hands: false, free: { windows: [[0, total]], scale, minPerBar: 4, model: model.map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.p })) } }, 90, 4, SIG[key]);
  // the click on 2 and 4: a time drill (free bars, no free-time stage), one screen on a phone
  return { ...d, beats: total, show: 'chart', chart: chartOf(key, cs.map((c) => ({ d: c.d, q: c.q, beats: c.beats }))), click: '24' };
}

/** Level rows: [kind, options, rating, en, he, tempo?, hands?]. One row = one level; level numbers follow the rating. */
type Row = { kind: string; ops: number[]; rating: number; en: string; he: string; tempo?: [number, number]; extra?: Partial<SpecTemplate>[] };
export const HL_ROWS: Row[] = [
  { kind: 'hl-arps-down', ops: [0, 1, 2], rating: 1100, en: 'Major arpeggios chromatically down', he: 'ארפג׳ים מז׳וריים בירידה כרומטית' },
  { kind: 'hl-abc', ops: [0, 1, 2, 3], rating: 1180, en: 'The ABCs: note by note, in 3rds, a half step below each 3rd', he: 'האלף־בית: צליל אחר צליל, בטרצות, חצי טון מתחת לכל טרצה' },
  { kind: 'hl-eight', ops: [0, 1, 3, 5, 7, 9, 11], rating: 1230, en: 'The dominant rule from every degree: one, or none', he: 'חוק הדומיננט מכל דרגה: אחד, או אף אחד' },
  { kind: 'hl-imp-arps', ops: [0, 1, 2], rating: 1250, en: 'The three important arpeggios', he: 'שלושת הארפג׳ים החשובים' },
  { kind: 'hl-outline', ops: [0], rating: 1260, en: 'Scale outline: the blues', he: 'מתאר סולמות: הבלוז' },
  { kind: 'hl-chrom', ops: [0], rating: 1300, en: "Barry's chromatic scale: major", he: 'הסולם הכרומטי של בארי: מז׳ור', extra: [{ hands: 'L' }] },
  { kind: 'hl-rules', ops: [0, 1, 2, 3], rating: 1310, en: 'The major rule from 1, 3, 5, 6', he: 'חוק המז׳ור מ־1, 3, 5, 6' },
  { kind: 'hl-upbeat', ops: [0, 1], rating: 1320, en: 'Upbeat comping: 2+ and 4+', he: 'ליווי על הקצב החלש: 2+ ו־4+', tempo: [90, 160] },
  { kind: 'hl-ands', ops: [0], rating: 1330, en: 'Hit only the "ands"', he: 'רק על ה"וְ"', tempo: [90, 160] },
  { kind: 'hl-outline', ops: [1], rating: 1340, en: 'Scale outline: rhythm changes', he: 'מתאר סולמות: ריתם צ׳יינג׳ס' },
  { kind: 'hl-chrom', ops: [1], rating: 1350, en: "Barry's chromatic scale: dominant", he: 'הסולם הכרומטי של בארי: דומיננט' },
  { kind: 'hl-rules', ops: [4, 5, 6, 7, 8], rating: 1360, en: 'The major rule: three, and two from 2 and 4', he: 'חוק המז׳ור: שלושה, ושניים מ־2 ומ־4' },
  { kind: 'hl-imp-scale', ops: [0, 1, 2, 3, 4], rating: 1370, ...pick(isVerified('item:hl-imp-scale:3'), ['Arpeggio into the scale; the ♭7-major pivot', 'ארפג׳ אל הסולם; הפיבוט של המז׳ור על ♭7'], ['Arpeggio into the scale', 'ארפג׳ אל הסולם']) },
  { kind: 'hl-outline', ops: [2, 3], rating: 1390, ...pick(isVerified('item:hl-outline:2'), ['Scale outline: Cherokee, Donna Lee', 'מתאר סולמות: צ׳רוקי, דונה לי'], ['Scale outline: Donna Lee', 'מתאר סולמות: דונה לי']) },
  { kind: 'hl-chrom', ops: [2], rating: 1400, en: "Barry's chromatic scale: minor 6th-diminished", he: 'הסולם הכרומטי של בארי: מינור שישית־מוקטן' },
  { kind: 'hl-rules', ops: [9, 10, 11, 12, 13, 14], rating: 1410, en: 'The minor rule from every degree', he: 'חוק המינור מכל דרגה' },
  { kind: 'hl-5432', ops: [0, 1, 2, 3], rating: 1420, en: 'The 5-4-3-2 phrases: dominant', he: 'משפטי 5-4-3-2: דומיננט' },
  { kind: 'hl-outline', ops: [4, 5], rating: 1440, en: 'Scale outline: How High the Moon, Night in Tunisia', he: 'מתאר סולמות: האו היי דה מון, לילה בתוניסיה' },
  { kind: 'hl-chrom2', ops: [0, 1, 2, 3, 4, 5], rating: 1445, en: "Barry's chromatic scale in two voices: 3rds, 6ths, 10ths", he: 'הסולם הכרומטי של בארי בשני קולות: טרצות, סקסטות, דצימות' },
  { kind: 'hl-3b9', ops: [0, 1], rating: 1450, en: '3 to ♭9 over the family', he: '3 עד ♭9 על המשפחה' },
  { kind: 'hl-sevendown', ops: [0, 1, 2], rating: 1460, en: 'Seven down to the 3rd', he: 'שבע למטה לטרצה' },
  { kind: 'hl-5432', ops: [4, 5, 6, 7], rating: 1470, en: 'The 5-4-3-2 phrases: major', he: 'משפטי 5-4-3-2: מז׳ור' },
  { kind: 'hl-5432', ops: [8, 9, 10, 11], rating: 1490, en: 'The 5-4-3-2 phrases: minor', he: 'משפטי 5-4-3-2: מינור' },
  { kind: 'hl-feel6', ops: [0, 1], rating: 1500, en: 'Feel 6 in 4', he: 'להרגיש 6 בתוך 4', tempo: [80, 140] },
  { kind: 'hl-triplet', ops: [0, 1, 2, 3, 4], rating: 1505, en: 'The triplet rules', he: 'חוקי הטריולה' },
  { kind: 'hl-compose', ops: [0], rating: 1510, en: 'Compose a line: I → VI7', he: 'לחבר קו: I → VI7', tempo: [80, 140] },
  { kind: 'hl-lick', ops: [0], rating: 1520, en: 'The 5-4-3-2 lick', he: 'הליק 5-4-3-2' },
  { kind: 'hl-misc', ops: [0, 1, 2, 3], rating: 1550, en: 'The miscellaneous rule', he: 'החוק השונה' },
  { kind: 'hl-lick-outline', ops: [0, 1], rating: 1555, en: 'The phrases inside a scale outline', he: 'המשפטים בתוך מתאר סולמות' },
  { kind: 'hl-outline', ops: [6, 7], rating: 1580, en: 'Scale outline: All the Things You Are, Giant Steps', he: 'מתאר סולמות: אול דה ת׳ינגס יו אר, ג׳איינט סטפס' },
  { kind: 'hl-compose', ops: [1], rating: 1600, en: 'Compose a line: ii–V–I', he: 'לחבר קו: ii–V–I', tempo: [80, 140] },
  { kind: 'hl-compose', ops: [2], rating: 1750, en: 'Your line in a tune: rhythm changes', he: 'הקו שלכם בתוך שיר: ריתם צ׳יינג׳ס', tempo: [90, 160] },
  // added 2026-11-15 (at the end, so every level above keeps its id)
  { kind: 'hl-eight', ops: [2, 4, 6, 8, 10, 12], rating: 1330, en: 'The dominant rule from every degree: three, or two', he: 'חוק הדומיננט מכל דרגה: שלושה, או שניים' },
  { kind: 'hl-chrom2', ops: [6, 7, 8, 9, 10], rating: 1560, en: "Barry's chromatic scale in two voices: every interval", he: 'הסולם הכרומטי של בארי בשני קולות: כל המרווחים' },
];
/** Path difficulty of each k-harrisline level (path.ts KEYS_LEVEL_DIFF). */
export const HL_LEVEL_DIFF: Record<string, number> = Object.fromEntries(HL_ROWS.map((r, i) => [`k-harrisline-${i + 1}`, r.rating]));

/** The keys family: 34 levels, ~1100 (arpeggios chromatically down) to ~1750 (your line in a tune). */
export function harrisLineFamily(): FamilyDef {
  return {
    id: HL_FAMILY,
    title: t('Barry Harris lines', 'הקווים של בארי האריס'),
    style: 'jazz',
    levels: HL_ROWS.map((r, i): LevelDef => {
      const tempo = r.tempo ?? LINE_TEMPO;
      const specs: SpecTemplate[] = [
        ...r.ops.map((o) => ({ family: HL_FAMILY, kind: r.kind, hands: 'R' as const, option: o, tempo: tempo[0] })),
        ...(r.extra ?? []).map((x) => ({ family: HL_FAMILY, kind: r.kind, hands: 'R' as const, option: r.ops[0], tempo: tempo[0], ...x })),
      ];
      return { id: `k-harrisline-${i + 1}`, level: i + 1, title: t(r.en, r.he), specs, keys: HL_KEYS, tempo };
    }),
  };
}

// ───────────────────────────── guitar: g-harrisline ─────────────────────────────

const G_LO = 47;
const G_HI = 79;
/** A line on the neck, in one position around its lowest note (strings 6 → 1), frets 0–15. */
function onNeck(tu: Tuning, ps: number[]): { s: number; f: number }[] {
  const lo = Math.min(...ps);
  const c = Math.max(1, Math.min(12, lo - tu.open[tu.open.length - 1]));
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return ps.map((m) => place(tu, m, strs, Math.max(0, c - 1), c + 4) ?? place(tu, m, strs, Math.max(0, c - 3), c + 6) ?? place(tu, m, strs, 0, 17)!);
}

/** The guitar drill of a g-harrisline item. */
export function genGuitarHarrisLine(s0: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const op = s.option ?? 0;
  if (s.kind === 'hl-upbeat') return guitarComp(s, tu, op);
  if (s.kind === 'hl-compose') return guitarCompose(s, tu, op);
  const it = lineItem(s.kind, op, key, G_LO, G_HI);
  if (!it) throw new Error(`Unknown g-harrisline kind ${s.kind}`);
  const pos = onNeck(tu, it.line.map((n) => n.p));
  const evs: Ev[] = it.line.map((n, i) => ({ beat: n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: i % 2 === 0 ? ('D' as const) : ('U' as const), ct: n.ct }] }));
  const d = gFinish(s, tu, evs, { title: it.title, bpm: s.tempo ?? LINE_TEMPO[0], evenness: s.kind !== 'hl-feel6', keySig: SIG[mod12(key + it.sigOf)], ...(it.ctGoal ? { goal: { chordTonesOnBeats: true } } : {}) });
  return { ...d, ...(it.chart ? { chart: it.chart } : {}), ...(s.kind === 'hl-feel6' ? { drums: { groove: 'swing' } } : {}) };
}

/** D16 on the guitar: drop-2 chords on strings 4-3-2-1, a hit on the "and" of 2 and 4 (op 0) or of 1 and 4 (op 1). */
function guitarComp(s: DrillSpec, tu: Tuning, op: number): Drill {
  const key = s.key;
  spellKey = mod12(key);
  const evs: Ev[] = [];
  let near = Math.max(2, mod12(key - tu.open[3]) + 1);
  COMP_LOOP.forEach(([d, q], bar) => {
    const pcs = COMP_CT[q].map((x) => key + d + x);
    const cands = drop2Voicings(tu, pcs, [4, 3, 2, 1], 15);
    if (!cands.length) return;
    const v = nearestVoicing(cands, near);
    near = Math.min(...v.map((p) => p.f).filter((f) => f > 0).concat([near]));
    for (const h of op === 1 ? [0.5, 3.5] : [1.5, 3.5]) evs.push({ beat: bar * 4 + h, dur: 0.45, notes: v.map((p) => ({ ...p, tech: 'strum-down' as const, stroke: 'D' as const })) });
  });
  const kn = keyName(key);
  const d = gFinish(s, tu, evs, {
    title: op === 1 ? t(`Upbeat comping, ii–V–I–VI in ${kn}: drop 2 on the "and" of 1 and of 4`, `ליווי על הקצב החלש, ii–V–I–VI ב־${kn}: דרופ 2 על ה"וְ" של 1 ושל 4`) : t(`Upbeat comping, ii–V–I–VI in ${kn}: drop 2 on the "and" of 2 and of 4`, `ליווי על הקצב החלש, ii–V–I–VI ב־${kn}: דרופ 2 על ה"וְ" של 2 ושל 4`),
    bpm: s.tempo ?? 100,
    evenness: false,
    keySig: SIG[mod12(key + 5)],
  });
  return { ...d, beats: COMP_LOOP.length * 4, chart: COMP_LOOP.map(([dd, q]) => `${nm(key + dd)}${q}`), drums: { groove: 'swing' } };
}

/** D17 on the guitar: the same free bars as the keys (a chord tone on every beat), the model placed on the neck. */
function guitarCompose(s: DrillSpec, tu: Tuning, op: number): Drill {
  const key = s.key;
  const id = MOVE_IDS[Math.min(2, op)];
  const cs = moveChords(id, key);
  const model = moveModel(key, MOVES[id].chords, 52, 76, 64 + mod12(key + 4 - 64));
  const total = cs.reduce((a, c) => a + c.beats, 0);
  const pos = onNeck(tu, model.map((n) => n.p));
  const evs: Ev[] = [];
  const landAt = new Map<number, number[]>();
  let at = 0;
  const scale: { from: number; to: number; pcs: number[] }[] = [];
  for (const c of cs) {
    scale.push({ from: at, to: at + c.beats, pcs: [...new Set([...c.sc, ...c.ct])] });
    for (let b = at; b < at + c.beats; b++) {
      const i = model.findIndex((n) => Math.abs(n.beat - b) < 1e-6);
      evs.push({ beat: b, dur: 1, notes: [{ ...pos[i], ct: true, stroke: 'D' }] });
      landAt.set(b, c.ct);
    }
    at += c.beats;
  }
  const kn = keyName(key);
  const d = gFinish(s, tu, evs, {
    title: COMPOSE_T(id, kn),
    bpm: s.tempo ?? 90,
    evenness: false,
    keySig: SIG[key],
    goal: { hands: false, free: { windows: [[0, total]], scale, minPerBar: 4, model: model.map((n, i) => ({ beat: n.beat, dur: n.dur, pitch: n.p, string: pos[i].s, fret: pos[i].f })) } },
  });
  return { ...d, notes: d.notes.map((n) => ({ ...n, land: landAt.get(n.beat) })), beats: total, show: 'chart', chart: chartOf(key, cs.map((c) => ({ d: c.d, q: c.q, beats: c.beats }))), band: { style: 'swing', bass: true }, drums: { groove: 'swing' } };
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The guitar rows (g-harrisline 1–10): [en, he, items, tempo, sub, grade]. */
const G_ROWS: { en: string; he: string; items: [string, number][]; tempo: [number, number]; sub: string; grade: number }[] = [
  { en: "Barry's chromatic scale: major, dominant, minor 6th-diminished", he: 'הסולם הכרומטי של בארי: מז׳ור, דומיננט, מינור שישית־מוקטן', items: [['hl-chrom', 0], ['hl-chrom', 1], ['hl-chrom', 2]], tempo: LINE_TEMPO, sub: '8ths', grade: 7 },
  { ...pick(isVerified('item:hl-outline:0'), ['Scale outlines: Indiana, the blues, rhythm changes', 'מתארי סולמות: Indiana, הבלוז, ריתם צ׳יינג׳ס'], ['Scale outlines: Indiana, rhythm changes', 'מתארי סולמות: Indiana, ריתם צ׳יינג׳ס']), items: [0, 1, 2, 3, 4, 5].map((o): [string, number] => ['hl-outline', o]), tempo: LINE_TEMPO, sub: '8ths', grade: 7 },
  { ...pick(isVerified('item:hl-eight') && isVerified('item:hl-imp-scale:3'), ['The dominant rule from every degree, the three important arpeggios, the ♭7-major pivot', 'חוק הדומיננט מכל דרגה, שלושת הארפג׳ים החשובים, הפיבוט של המז׳ור על ♭7'], ['The three important arpeggios', 'שלושת הארפג׳ים החשובים']), items: [['hl-eight', 0], ['hl-eight', 2], ['hl-imp-arps', 0], ['hl-imp-arps', 1], ['hl-imp-scale', 0], ['hl-imp-scale', 3]], tempo: LINE_TEMPO, sub: '8ths', grade: 7 },
  { en: 'The major and minor rules from every degree', he: 'חוקי המז׳ור והמינור מכל דרגה', items: [['hl-rules', 1], ['hl-rules', 4], ['hl-rules', 7], ['hl-rules', 9], ['hl-rules', 13]], tempo: LINE_TEMPO, sub: '8ths', grade: 7 },
  { en: 'The 5-4-3-2 phrases and the lick', he: 'משפטי 5-4-3-2 והליק', items: [['hl-5432', 0], ['hl-5432', 1], ['hl-5432', 2], ['hl-5432', 3], ['hl-lick', 0], ['hl-lick-outline', 0]], tempo: LINE_TEMPO, sub: '8ths', grade: 8 },
  { en: 'Seven down to the 3rd; 3 to ♭9 over the family', he: 'שבע למטה לטרצה; 3 עד ♭9 על המשפחה', items: [['hl-sevendown', 0], ['hl-sevendown', 1], ['hl-3b9', 0], ['hl-3b9', 1]], tempo: LINE_TEMPO, sub: '8ths', grade: 8 },
  { en: 'The triplet rules and the miscellaneous rule', he: 'חוקי הטריולה והחוק השונה', items: [['hl-triplet', 0], ['hl-triplet', 1], ['hl-triplet', 3], ['hl-misc', 0], ['hl-misc', 3]], tempo: LINE_TEMPO, sub: '8ths and triplets', grade: 8 },
  { ...pick(isVerified('item:hl-feel6'), ['Upbeat comping and feel 6 in 4', 'ליווי על הקצב החלש ולהרגיש 6 בתוך 4'], ['Upbeat comping', 'ליווי על הקצב החלש']), items: [['hl-upbeat', 0], ['hl-upbeat', 1], ['hl-feel6', 0], ['hl-feel6', 1]], tempo: [90, 160], sub: 'upbeats', grade: 7 },
  { en: 'Compose a line over a move, then in a tune', he: 'לחבר קו מעל מהלך, ואז בתוך שיר', items: [['hl-compose', 0], ['hl-compose', 1], ['hl-compose', 2]], tempo: [80, 140], sub: 'free 8ths', grade: 9 },
  { ...pick(isVerified('item:hl-arps-down'), ['Major arpeggios chromatically down; the ABCs in 3rds', 'ארפג׳ים מז׳וריים בירידה כרומטית; האלף־בית בטרצות'], ['The ABCs: note by note, then in 3rds', 'האלף־בית: צליל אחר צליל, ואז בטרצות']), items: [['hl-arps-down', 0], ['hl-arps-down', 1], ['hl-abc', 0], ['hl-abc', 1], ['hl-abc', 2], ['hl-abc', 3]], tempo: LINE_TEMPO, sub: '8ths', grade: 6 },
];
/** The guitar family (the jazz add-on): grades 6 to 9. */
export function guitarHarrisLineFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  return fam('g-harrisline', 'Barry Harris lines on guitar', 'הקווים של בארי האריס בגיטרה', 'jazz', ['jazz'], G_ROWS.map((r, i) => LT('g-harrisline', i + 1, r.en, r.he, r.items.map(([kind, option]) => ({ family: 'g-harrisline' as FamilyId, kind, hands: 'R' as const, instrument: 'guitar' as const, option })), HL_KEYS, r.tempo, r.sub, r.grade)));
}

// ───────────────────────────── bass: b-harrisline ─────────────────────────────

const B_LO = 28;
const B_HI = 60;

/** The bass drill of a b-harrisline item. */
export function genBassHarrisLine(s0: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s0.key);
  const s = { ...s0, key };
  const op = s.option ?? 0;
  if (s.kind === 'hl-walkties') return bassTies(s, tu, op);
  if (s.kind === 'hl-compose') return bassCompose(s, tu, op);
  const it = lineItem(s.kind, op, key, B_LO + 3, B_HI);
  if (!it) throw new Error(`Unknown b-harrisline kind ${s.kind}`);
  const line: BN[] = it.line.map((n) => ({ b: n.beat, d: n.dur, p: n.p, ct: n.ct }));
  const [en, he] = [it.title.en.replace(/ · [^·]*$/, ''), it.title.he.replace(/ · [^·]*$/, '')];
  return drillOf(s, tu, alt(line), { en: it.title.en.includes(' · ') ? en : it.title.en, he: it.title.he.includes(' · ') ? he : it.title.he, chart: it.chart, evenness: s.kind !== 'hl-feel6', keySig: SIG[mod12(key + it.sigOf)], ...(it.ctGoal ? { goal: { chordTonesOnBeats: true } } : {}), ...(s.kind === 'hl-feel6' ? { drums: { groove: 'swing' } } : {}) });
}

/**
 * D16 on the bass [R1 ch.4: walking "emphasising the upbeat", tied notes in the walk]: a walk through the blues where
 * the next bar's root is pushed onto the "and" of 4 and tied over the bar line (op 0), or the "and" of 2 tied into
 * beat 3 as well (op 1) — the chord tones still fall where the bass and the band meet.
 */
function bassTies(s: DrillSpec, tu: Tuning, op: number): Drill {
  const key = s.key;
  spellKey = mod12(key);
  const line: BN[] = [];
  const lo = Math.max(28, tu.open[tu.open.length - 1]);
  const R = (pc: number) => lo + mod12(pc - lo);
  const cs: LC[] = COMP_BLUES.map(([d, q]) => ({ root: mod12(key + d), ct: COMP_CT[q], sc: q === 'm7' ? [0, 2, 3, 5, 7, 9, 10] : q === '°7' ? [0, 2, 3, 5, 6, 8, 9, 11] : [0, 2, 4, 5, 7, 9, 10], beats: 4, name: `${nm(key + d)}${q}` }));
  cs.forEach((c, bar) => {
    const b0 = bar * 4;
    const r = R(c.root);
    const nextRoot = R(cs[(bar + 1) % cs.length].root);
    const pushed = bar > 0; // bar 1 starts on its own downbeat; every later root is anticipated
    const tones = [r + c.ct[1], r + c.ct[2], r + c.ct[1]];
    if (!pushed) line.push({ b: b0, d: 1, p: r, ct: true });
    if (op === 1) {
      // beat 2, then the "and" of 2 tied into 3, then beat 4 (an approach), then the push
      line.push({ b: b0 + 1, d: 0.5, p: tones[0], ct: true }, { b: b0 + 1.5, d: 1.5, p: tones[1], ct: true });
    } else line.push({ b: b0 + 1, d: 1, p: tones[0], ct: true }, { b: b0 + 2, d: 1, p: tones[1], ct: true });
    line.push({ b: b0 + 3, d: 0.5, p: nextRoot + (nextRoot > tones[1] ? -1 : 1), ct: false });
    if (bar < cs.length - 1) line.push({ b: b0 + 3.5, d: 1.5, p: nextRoot, ct: true });
    else line.push({ b: b0 + 3.5, d: 0.5, p: R(key), ct: true });
  });
  const name = op === 1 ? t('Walking on the upbeats: the "and" of 2 tied, the root pushed onto the "and" of 4', 'בס מהלך על הקצב החלש: ה"וְ" של 2 קשור, השורש נדחף ל"וְ" של 4') : t('Walking with ties: each root pushed onto the "and" of 4 and tied over the bar', 'בס מהלך עם קשתות: כל שורש נדחף ל"וְ" של 4 וקשור מעבר לתיבה');
  return drillOf(s, tu, alt(line), { ...name, chart: chartLc(cs), show: 'chart', evenness: false, drums: { groove: 'swing' } });
}

/** D17 on the bass: free choice by the rules (a chord tone on every beat), the rules line as the model. */
function bassCompose(s: DrillSpec, tu: Tuning, op: number): Drill {
  const key = s.key;
  spellKey = mod12(key);
  const id = MOVE_IDS[Math.min(2, op)];
  const lo = Math.max(31, tu.open[tu.open.length - 1] + 3);
  const model = moveModel(key, MOVES[id].chords, lo, 57, lo + 12 + mod12(key + 4 - lo));
  const cs: LC[] = moveChords(id, key).map((c) => ({ root: c.root, ct: MOVE_CT[c.q], sc: MOVE_SCALE[c.q], beats: c.beats, name: `${nm(c.root)}${c.q}` }));
  const line: BN[] = model.map((n) => ({ b: n.beat, d: n.dur, p: n.p, ct: n.ct }));
  const kn = keyName(key);
  const tt = COMPOSE_T(id, kn);
  return drillOf(s, tu, alt(line), { en: tt.en.replace(` in ${kn}`, ''), he: tt.he.replace(` ב־${kn}`, ''), chart: chartLc(cs), show: 'chart', evenness: false, bass: { rules: rulesFor(cs, 'downbeatCt', { every: 1 }) }, drums: { groove: 'swing' } });
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
const B_ROWS: { en: string; he: string; items: [string, number][]; tempo: [number, number]; sub: string }[] = [
  { en: "Barry's chromatic scale: major, dominant, minor 6th-diminished", he: 'הסולם הכרומטי של בארי: מז׳ור, דומיננט, מינור שישית־מוקטן', items: [['hl-chrom', 0], ['hl-chrom', 1], ['hl-chrom', 2]], tempo: LINE_TEMPO, sub: '8ths' },
  { ...pick(isVerified('item:hl-outline:0') && isVerified('item:hl-outline:2'), ['Scale outlines: the blues, rhythm changes, Cherokee, Donna Lee', 'מתארי סולמות: הבלוז, ריתם צ׳יינג׳ס, צ׳רוקי, דונה לי'], ['Scale outlines: rhythm changes, Donna Lee', 'מתארי סולמות: ריתם צ׳יינג׳ס, דונה לי']), items: [0, 1, 2, 3].map((o): [string, number] => ['hl-outline', o]), tempo: LINE_TEMPO, sub: '8ths' },
  { ...pick(isVerified('item:hl-eight'), ['The dominant rule from every degree, the three important arpeggios, into the scale', 'חוק הדומיננט מכל דרגה, שלושת הארפג׳ים החשובים, אל הסולם'], ['The three important arpeggios, into the scale', 'שלושת הארפג׳ים החשובים, אל הסולם']), items: [['hl-eight', 0], ['hl-eight', 4], ['hl-imp-arps', 0], ['hl-imp-arps', 1], ['hl-imp-scale', 0], ['hl-imp-scale', 1], ['hl-imp-scale', 2]], tempo: LINE_TEMPO, sub: '8ths' },
  { en: 'The major and minor rules from every degree', he: 'חוקי המז׳ור והמינור מכל דרגה', items: [['hl-rules', 0], ['hl-rules', 4], ['hl-rules', 8], ['hl-rules', 9], ['hl-rules', 14]], tempo: LINE_TEMPO, sub: '8ths' },
  { en: 'The 5-4-3-2 phrases and the lick', he: 'משפטי 5-4-3-2 והליק', items: [['hl-5432', 0], ['hl-5432', 1], ['hl-5432', 2], ['hl-5432', 3], ['hl-lick', 0]], tempo: LINE_TEMPO, sub: '8ths' },
  { en: 'Seven down to the 3rd; 3 to ♭9 over the family', he: 'שבע למטה לטרצה; 3 עד ♭9 על המשפחה', items: [['hl-sevendown', 0], ['hl-sevendown', 1], ['hl-3b9', 0]], tempo: LINE_TEMPO, sub: '8ths' },
  { en: 'The triplet rules and the miscellaneous rule', he: 'חוקי הטריולה והחוק השונה', items: [['hl-triplet', 0], ['hl-triplet', 3], ['hl-misc', 0]], tempo: LINE_TEMPO, sub: '8ths and triplets' },
  { ...pick(isVerified('item:hl-feel6'), ['Walking with ties on the upbeats; feel 6 in 4', 'בס מהלך עם קשתות על הקצב החלש; להרגיש 6 בתוך 4'], ['Walking with ties on the upbeats', 'בס מהלך עם קשתות על הקצב החלש']), items: [['hl-walkties', 0], ['hl-walkties', 1], ['hl-feel6', 0]], tempo: [100, 180], sub: 'quarters and ties' },
  { en: 'Compose a line over a move, then in a tune', he: 'לחבר קו מעל מהלך, ואז בתוך שיר', items: [['hl-compose', 0], ['hl-compose', 1], ['hl-compose', 2]], tempo: [80, 140], sub: 'free 8ths' },
  { ...pick(isVerified('item:hl-arps-down'), ['Major arpeggios chromatically down; the ABCs in 3rds', 'ארפג׳ים מז׳וריים בירידה כרומטית; האלף־בית בטרצות'], ['The ABCs: note by note, then in 3rds', 'האלף־בית: צליל אחר צליל, ואז בטרצות']), items: [['hl-arps-down', 0], ['hl-arps-down', 2], ['hl-abc', 0], ['hl-abc', 1], ['hl-abc', 2]], tempo: LINE_TEMPO, sub: '8ths' },
];
/** Path difficulty of the bass rows (b-harrisline 1–10), in row order. */
export const B_HL_RATING = [1330, 1300, 1280, 1380, 1450, 1460, 1520, 1380, 1650, 1150];
/** Path difficulty of the guitar rows (by grade on the guitar path; listed for the docs). */
export const G_HL_RATING = [1350, 1350, 1300, 1380, 1460, 1460, 1520, 1400, 1650, 1150];
/** The bass family (jazz track). */
export function bassHarrisLineFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  return fam('b-harrisline', 'Barry Harris lines on the bass', 'הקווים של בארי האריס בבס', B_ROWS.map((r, i) => L('b-harrisline', i + 1, r.en, r.he, r.items.map(([kind, option]) => ({ family: 'b-harrisline' as BassFamilyId, kind, hands: 'R' as const, instrument: 'bass' as const, option })), HL_KEYS, r.tempo, r.sub)));
}
/** Path difficulty of each b-harrisline level (path.ts KEYS_LEVEL_DIFF serves the bass ids too). */
export const B_LEVEL_DIFF: Record<string, number> = Object.fromEntries(B_HL_RATING.map((x, i) => [`b-harrisline-${i + 1}`, x]));

/** Every new level id (keys, guitar, bass) — the lessons and the tests read it. */
export const HL_LEVEL_IDS = {
  keys: HL_ROWS.map((_, i) => `k-harrisline-${i + 1}`),
  guitar: G_ROWS.map((_, i) => `g-harrisline-${i + 1}`),
  bass: B_ROWS.map((_, i) => `b-harrisline-${i + 1}`),
};
/** For the e2e and docs: which keys row each guitar / bass row mirrors (by kind). */
export const HL_KINDS = [...new Set(HL_ROWS.map((r) => r.kind))];
