// Improvising with the drilled vocabulary (docs/AUDIT-DEPTH-3.md C5, C6, C7): the keys family k-solo, the guitar
// family g-solo (the jazz add-on) and the bass family b-solo (the jazz track).
//   · C5 improv items: the player improvises over a form under rule cards (ruleCards.ts) — guide-tone targeting,
//     approach notes, Barry Harris's half-step rules, each enclosure type, the pivot, triad pairs, superimposed
//     pentatonics, a lick you learned, and rule mixes. The take is graded by the cards (goal.improv, analyze.ts) and by
//     the free bars' basics (goal.free: inside the changes, enough notes); one landing on the last chord is written.
//     The bars are free, so there is no rubato stage: the cards judge beats. The tempo ladder starts slow instead.
//   · C7 duo items: piano — the LH comps written shells / rootless voicings (graded note for note) while the RH
//     improvises above it under the cards; guitar — a bar of comping, then a bar of line; bass — a bar of walking, then
//     a bar of fill.
//   · C6 chorus items: the player's written chorus (soloChorus.ts), graded note for note, rubato first.
// Every item runs in all 12 keys; the key is the item's (spec.key). Each item carries a model line that keeps its
// cards (the result screen's "model" and the tests).
//
// NOTE: guitar.ts, bass.ts and generate.ts import this module and it imports theirs: nothing here may call their
// exports at module top level (only inside functions).

import type { Drill, DrillSpec, ExpNote, FamilyId, BassFamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { bebopLine, itemIdOf } from './generate';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle, Ev } from './guitar';
import { drop2Voicings, finish as gFinish, nearestVoicing, place } from './guitar';
import { drillOf, alt, type BN } from './bass';
import { voice } from './chartDrills';
import type { ChartChordEv } from '../charts';
import { VQ_DEF, arpPath, chartOf, leadIn, mod12, nearestPc, type LeadId, type VChord, type VN, type VQ } from '../bebopVocab';
import { LICKS } from '../licks';
import { TRIAD_PAIRS, pairTriads } from '../theoryPlay';
import { spansOfVChords } from '../ruleCards';
import { AABA_FORM, BLUES_FORM, RHYTHM_A_FORM, CHORUS_FORMS, assembleChorus, barsOf, planOf } from '../soloChorus';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
export const SOLO_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
export const SOLO_KINDS = ['sl-imp', 'sl-duo', 'sl-chorus'];

// ───────────────────────────── forms ─────────────────────────────

type FBar = [number, VQ][];
export type FormId = '251' | 'm251' | 'blues' | 'rhythm' | 'aaba';
const II_V_I: FBar[] = [[[2, 'm7']], [[7, '7']], [[0, 'maj7']], [[0, 'maj7']]];
const II_V_I_MINOR: FBar[] = [[[2, 'hd7']], [[7, '7b9']], [[0, 'm6']], [[0, 'm6']]];
export const SOLO_FORMS: Record<FormId, { name: T2; bars: FBar[]; minor?: boolean }> = {
  '251': { name: t('ii–V–I', 'ii–V–I'), bars: [...II_V_I, ...II_V_I] },
  m251: { name: t('minor ii–V–i', 'ii–V–i מינורי'), bars: [...II_V_I_MINOR, ...II_V_I_MINOR], minor: true },
  blues: BLUES_FORM,
  rhythm: RHYTHM_A_FORM,
  aaba: AABA_FORM,
};
export const formChords = (f: FormId, key: number): VChord[] => SOLO_FORMS[f].bars.flatMap((bar) => bar.map(([d, q]) => ({ r: mod12(key + d), q, beats: 4 / bar.length })));
const formBeats = (f: FormId): number => SOLO_FORMS[f].bars.length * 4;

// ───────────────────────────── model lines (each keeps its item's cards) ─────────────────────────────

export type ModelId = 'bebop' | 'pivot' | 'tpair' | 'pent' | 'lick' | 'three' | 'sparse' | 'callresp' | 'roots' | `enc:${string}`;
const ctOf = (c: VChord): number[] => VQ_DEF[c.q].ct.slice(0, 4).map((x) => mod12(c.r + x));
const scOf = (c: VChord): number[] => VQ_DEF[c.q].sc.map((x) => mod12(c.r + x));
const guideOf = (c: VChord): number[] => [VQ_DEF[c.q].ct[1], VQ_DEF[c.q].ct[3]].map((x) => mod12(c.r + x));
const pitchesIn = (pcs: number[], lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let q = lo; q <= hi; q++) if (pcs.includes(mod12(q))) out.push(q);
  return out;
};
const nearestOf = (ps: number[], near: number): number => ps.reduce((a, b) => (Math.abs(b - near) < Math.abs(a - near) ? b : a), ps[0]);
/** Up then down through a set of pitches in 8ths, `n` notes from the one nearest `near`. */
function wave(ps: number[], near: number, n: number): number[] {
  let i = ps.indexOf(nearestOf(ps, near));
  let dir = i + 3 < ps.length ? 1 : -1;
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    out.push(ps[i]);
    if (i + dir < 0 || i + dir >= ps.length) dir = -dir;
    i += dir;
  }
  return out;
}
const fam3 = (q: VQ): 'maj7' | 'm7' | '7' | null => (q === 'maj7' || q === '6' ? 'maj7' : q === 'm7' || q === 'm6' ? 'm7' : q === '7' || q === 'alt' ? '7' : null);
const PENT_MAJ = [0, 2, 4, 7, 9];
const PENT_MIN = [0, 3, 5, 7, 10];
/** The superimposed pentatonic of a chord (the pent-super card's first choice), or null. */
function superPent(c: VChord): number[] | null {
  const p = (on: number, maj: boolean) => (maj ? PENT_MAJ : PENT_MIN).map((x) => mod12(c.r + on + x));
  if (c.q === 'maj7' || c.q === '6') return p(7, true);
  if (c.q === 'm7' || c.q === 'm6') return p(7, false);
  if (c.q === '7') return p(2, true);
  if (c.q === 'alt' || c.q === 'hd7') return p(3, false);
  return null;
}

/** Notes over the chords, one generator per model (8ths unless said); the last chord's note is held. */
export function modelLine(model: ModelId, chords: VChord[], lo: number, hi: number, seed: string): VN[] {
  if (model === 'bebop') return bebopLine(chords, seed, { lo: lo + 1, hi: hi - 1, start: Math.round(lo + (hi - lo) * 0.6) }).map((n) => ({ p: n.p, beat: n.beat, dur: n.dur, ct: !!n.ct }));
  if (model.startsWith('enc:')) return encModel(model.slice(4) as LeadId, chords, lo, hi);
  const out: VN[] = [];
  let beat = 0;
  let prev = Math.round(lo + (hi - lo) * 0.5);
  let callFirst = prev;
  chords.forEach((c, ci) => {
    const n8 = Math.round(c.beats * 2);
    const ct = ctOf(c);
    const push = (p: number, k: number, dur = 0.5) => out.push({ p, beat: beat + k / 2, dur, ct: ct.includes(mod12(p)) });
    const next = chords[ci + 1];
    let ps: number[] = [];
    switch (model) {
      case 'pivot': {
        const top = nearestPc(c.r, prev + 3, lo + 11, hi);
        const rel = VQ_DEF[c.q].ct.slice(1, 4).map((x) => top - 12 + x);
        ps = n8 >= 8 ? [top, ...rel, top, ...rel.slice().reverse()] : [top, ...rel];
        break;
      }
      case 'tpair': {
        const f = fam3(c.q);
        const pair = f ? TRIAD_PAIRS.find((p) => p.q === f && (c.q !== 'alt' || p.id === 'altered')) : undefined;
        if (pair) {
          const [a, b] = pairTriads(pair, c.r);
          // a's triad up from the note nearest the last one, then b's.
          const A = pitchesIn(a, lo, hi);
          const B = pitchesIn(b, lo, hi);
          const a0 = A.indexOf(nearestOf(A, prev));
          const up = a0 + 2 < A.length;
          const ta = up ? A.slice(a0, a0 + 3) : A.slice(a0 - 2, a0 + 1).reverse();
          const b0 = B.indexOf(nearestOf(B, ta[2]));
          const tb = up ? B.slice(b0, b0 + 3) : B.slice(Math.max(0, b0 - 2), b0 + 1).reverse();
          const cell = [...ta, ...tb];
          ps = Array.from({ length: n8 }, (_, k) => cell[k % cell.length]);
        } else ps = wave(pitchesIn(ct, lo, hi), prev, n8);
        break;
      }
      case 'pent': {
        const pent = superPent(c);
        ps = wave(pitchesIn(pent ?? ct, lo, hi), prev, n8);
        break;
      }
      case 'three': {
        // The 3rd on beat 1, then up the chord (3 5 7 9) and back.
        const third = nearestPc(mod12(c.r + VQ_DEF[c.q].ct[1]), prev, lo + 2, hi - 10);
        const up = [third, ...[VQ_DEF[c.q].ct[2], VQ_DEF[c.q].ct[3]].map((x) => third - VQ_DEF[c.q].ct[1] + x), third - VQ_DEF[c.q].ct[1] + 14];
        const seq = [...up, ...up.slice(1, 3).reverse(), third];
        ps = seq.slice(0, n8);
        break;
      }
      case 'roots': {
        // The root on each change, the arpeggio up and down, a half step into the next root.
        const root = nearestPc(c.r, prev, lo, hi - 12);
        const arp = pitchesIn(ct, root, root + 12);
        const body = [...arp, ...arp.slice(1, -1).reverse()].slice(0, n8 - 1);
        while (body.length < n8 - 1) body.push(arp[body.length % arp.length]);
        const nx = next ? nearestPc(next.r, body[body.length - 1], lo, hi - 12) : root;
        ps = [...body, next ? (nx > body[body.length - 1] ? nx - 1 : nx + 1) : root];
        break;
      }
      case 'sparse': {
        // Guide tones in half notes (two notes a bar at most).
        const g = guideOf(c);
        const a = nearestPc(g[0], prev, lo, hi);
        out.push({ p: a, beat, dur: c.beats > 2 ? 2 : c.beats, ct: true });
        if (c.beats > 2) out.push({ p: nearestPc(g[1], a, lo, hi), beat: beat + 2, dur: c.beats - 2, ct: true });
        prev = out[out.length - 1].p;
        beat += c.beats;
        return;
      }
      case 'callresp': {
        // Two-bar phrases: the call (four 8ths) in bar 1, a bar of air, the answer (same rhythm, new notes) two bars on.
        const barOf = Math.floor(beat / 4 + 1e-9);
        const inBar = beat - barOf * 4;
        if (barOf % 2 === 1 || inBar !== 0) {
          beat += c.beats;
          return;
        }
        const arp = pitchesIn(ct, lo, hi);
        const answer = (barOf / 2) % 2 === 1;
        let i0 = Math.max(0, Math.min(arp.indexOf(nearestOf(arp, answer ? callFirst + 4 : prev)), arp.length - 4));
        if (answer && arp[i0] === callFirst) i0 = i0 + 1 <= arp.length - 4 ? i0 + 1 : i0 - 1;
        if (!answer) callFirst = arp[i0];
        [0, 1, 2, 3].forEach((k) => out.push({ p: arp[i0 + k], beat: beat + k * 0.5, dur: 0.5, ct: true }));
        out[out.length - 1].dur = 1;
        prev = out[out.length - 1].p;
        beat += c.beats;
        return;
      }
      case 'lick': {
        // A lick of the library over its own chords at the start of the form, the bebop line after it (lickForm).
        ps = wave(pitchesIn(ct, lo, hi), prev, n8);
        break;
      }
    }
    ps.slice(0, n8).forEach((p, k) => push(p, k));
    prev = ps[Math.min(ps.length, n8) - 1] ?? prev;
    beat += c.beats;
  });
  return holdLast(out, chords);
}
/** The last chord: its first note held to the end of the form. */
function holdLast(out: VN[], chords: VChord[]): VN[] {
  const total = chords.reduce((a, c) => a + c.beats, 0);
  const lastAt = total - chords[chords.length - 1].beats;
  const keep = out.filter((n) => n.beat < lastAt + 1e-6);
  // The landing: the last chord's guide tone (3rd or 7th) nearest the note before, held to the end.
  const last = chords[chords.length - 1];
  const before = keep.filter((n) => n.beat < lastAt - 1e-6).pop();
  const near = before?.p ?? keep[keep.length - 1]?.p ?? 60;
  const land = nearestOf([-12, 0, 12].flatMap((o) => guideOf(last).map((pc) => near - mod12(near) + pc + o)), near);
  const out2 = keep.filter((n) => n.beat < lastAt - 1e-6);
  out2.push({ p: land, beat: lastAt, dur: r6(total - lastAt), ct: true });
  return out2;
}
/** Enclosure model: a guide tone on beat 1 of every chord, the enclosure into the next one at the end of the chord, the arpeggio between. */
function encModel(id: LeadId, chords: VChord[], lo: number, hi: number): VN[] {
  const targets: number[] = [];
  // Each enclosure type starts in its own part of the register (two items of a level never write the same landings).
  // Each enclosure type aims at its own chord tone (two items of a level never write the same landings): above-below
  // the 3rds, below-above the 7ths, the scale step the 5ths; in minor, the bebop enclosure the 3rds, the delayed one the 7ths.
  const ENC_TONE: Record<string, number> = { 'enc-ab': 1, 'enc-ba': 3, 'enc-step': 2, 'enc-bebop': 1, 'enc-delayed': 3 };
  const tone = ENC_TONE[id] ?? 1;
  let prev = Math.round((lo + hi) / 2);
  for (const c of chords) {
    const pc = mod12(c.r + VQ_DEF[c.q].ct[tone]);
    const cands = [nearestPc(pc, prev, lo + 3, hi - 3)];
    const T = cands[0];
    targets.push(T);
    prev = T;
  }
  const out: VN[] = [];
  let beat = 0;
  chords.forEach((c, i) => {
    const T = targets[i];
    if (i === chords.length - 1) {
      out.push({ p: T, beat, dur: c.beats, ct: true });
      return;
    }
    const n8 = Math.round(c.beats * 2);
    const lead = leadIn(id, targets[i + 1], scOf(chords[i + 1]), hi);
    const fill = n8 - lead.length - 1;
    const line = arpPath(pitchesIn(ctOf(c), lo, hi), T, Math.max(0, fill), lead[0]);
    line.forEach((p, k) => out.push({ p, beat: beat + k / 2, dur: 0.5, ct: true }));
    lead.forEach((p, k) => out.push({ p, beat: beat + (n8 - lead.length + k) / 2, dur: 0.5, ct: false }));
    beat += c.beats;
  });
  return out;
}
/** The lick model: the lick (in the key) over its chords, then a bebop line over the rest of the form. */
function lickModel(key: number, form: FormId, lo: number, hi: number, seed: string): VN[] {
  const l = LICKS.find((x) => x.id === (form === 'm251' ? 'min-line' : 'maj-bebop'))!;
  const chords = formChords(form, key);
  const len = l.chords.reduce((a, c) => a + c[2], 0);
  const raw = l.notes.map((n) => n[0] + key);
  let o = Math.round(((lo + hi) / 2 - (Math.max(...raw) + Math.min(...raw)) / 2) / 12) * 12;
  // A lick may reach a little under the line's register (a 20-semitone lick fits 52–79 only at some octaves).
  while (Math.max(...raw) + o > hi) o -= 12;
  while (Math.min(...raw) + o < lo - 8) o += 12;
  const head: VN[] = l.notes.map((n) => ({ p: n[0] + key + o, beat: n[1], dur: n[2], ct: false }));
  let at = 0;
  const rest: VChord[] = [];
  for (const c of chords) {
    if (at >= len - 1e-6) rest.push(c);
    at += c.beats;
  }
  const tail = bebopLine(rest, seed, { lo: lo + 1, hi: hi - 1, start: head[head.length - 1].p }).map((n) => ({ p: n.p, beat: n.beat + len, dur: n.dur, ct: !!n.ct }));
  return [...head.filter((n) => n.beat < len - 1e-6), ...tail];
}

// ───────────────────────────── items ─────────────────────────────

export interface SoloItem {
  cards: string[];
  form: FormId;
  model: ModelId;
  name: T2;
  /** Fewest notes a bar in the free bars (0 = rests allowed, e.g. call and response). */
  minPerBar?: number;
}
const I = (cards: string[], form: FormId, model: ModelId, en: string, he: string, minPerBar?: number): SoloItem => ({ cards, form, model, name: t(en, he), ...(minPerBar !== undefined ? { minPerBar } : {}) });
/** The improv items (options of 'sl-imp'; append only — item ids). */
export const SOLO_ITEMS: SoloItem[] = [
  /* 0 */ I(['guide-target', 'inside'], '251', 'bebop', 'Improvise: a guide tone on every change', 'אלתור: צליל מנחה בכל החלפה'),
  /* 1 */ I(['guide-target', 'inside'], 'blues', 'bebop', 'Improvise on the blues: a guide tone on every change', 'אלתור בבלוז: צליל מנחה בכל החלפה'),
  /* 2 */ I(['approach', 'inside'], '251', 'bebop', 'Improvise: approach every chord by a half step', 'אלתור: גישה בחצי טון לכל אקורד'),
  /* 3 */ I(['approach', 'inside'], 'rhythm', 'bebop', 'Rhythm changes: approach every chord', 'ריתם צ׳יינג׳ס: גישה לכל אקורד'),
  /* 4 */ I(['harris'], '251', 'bebop', 'Barry Harris rules: chord tones on the beats', 'החוקים של בארי האריס: צלילי אקורד על הפעמות'),
  /* 5 */ I(['harris'], 'blues', 'bebop', 'Barry Harris rules on the blues', 'החוקים של בארי האריס בבלוז'),
  /* 6 */ I(['enc-ab', 'active'], '251', 'enc:enc-ab', 'Enclose: above, then below', 'כיתור: מעל, ואז מתחת'),
  /* 7 */ I(['enc-ba', 'active'], '251', 'enc:enc-ba', 'Enclose: below, then above', 'כיתור: מתחת, ואז מעל'),
  /* 8 */ I(['enc-step', 'active'], '251', 'enc:enc-step', 'Enclose: the scale step above', 'כיתור: צעד הסולם מעל'),
  /* 9 */ I(['enc-bebop', 'active'], 'm251', 'enc:enc-bebop', 'The bebop enclosure, minor ii–V–i', 'כיתור הביבופ, ii–V–i מינורי'),
  /* 10 */ I(['enc-delayed', 'active'], 'm251', 'enc:enc-delayed', 'The delayed resolution, minor ii–V–i', 'הפתרון המושהה, ii–V–i מינורי'),
  /* 11 */ I(['pivot', 'harris'], '251', 'pivot', 'A pivot every four bars, by the rules', 'פיבוט בכל ארבע תיבות, לפי החוקים'),
  /* 12 */ I(['pivot', 'harris'], 'rhythm', 'pivot', 'Rhythm changes with pivots', 'ריתם צ׳יינג׳ס עם פיבוטים'),
  /* 13 */ I(['triad-pair'], '251', 'tpair', 'Triad pairs, one per chord', 'זוגות משולשים, זוג לכל אקורד'),
  /* 14 */ I(['triad-pair'], 'aaba', 'tpair', 'Triad pairs through a form', 'זוגות משולשים לאורך צורה'),
  /* 15 */ I(['pent-super'], '251', 'pent', 'Superimposed pentatonics, one per chord', 'פנטטוניות מונחות, אחת לכל אקורד'),
  /* 16 */ I(['pent-super'], 'aaba', 'pent', 'Superimposed pentatonics through a form', 'פנטטוניות מונחות לאורך צורה'),
  /* 17 */ I(['use-lick', 'inside'], '251', 'lick', 'Use a lick you learned', 'להשתמש בליק שלמדתם'),
  /* 18 */ I(['use-lick', 'inside'], 'm251', 'lick', 'Use a minor lick you learned', 'להשתמש בליק מינורי שלמדתם'),
  /* 19 */ I(['harris', 'end-guide'], 'rhythm', 'bebop', 'Rules, and every phrase ends on a guide tone', 'חוקים, וכל משפט נגמר על צליל מנחה'),
  /* 20 */ I(['three-on-one', 'inside'], 'aaba', 'three', 'The 3rd on beat 1 of every chord', 'הטרצה בפעמה 1 של כל אקורד'),
  /* 21 */ I(['sparse', 'end-guide'], 'aaba', 'sparse', 'Space: four notes a bar at most', 'מרווח: עד ארבעה צלילים בתיבה', 1),
  /* 22 */ I(['call-response', 'inside'], 'blues', 'callresp', 'Call and response with yourself', 'שאלה ותשובה עם עצמכם', 0),
  /* 23 */ I(['imply-roots', 'inside'], 'blues', 'roots', 'A solo that still implies the roots', 'סולו שעדיין רומז על השורשים'),
  /* 24 */ I(['imply-roots', 'approach'], 'rhythm', 'roots', 'Rhythm changes: the roots implied, each change approached', 'ריתם צ׳יינג׳ס: שורשים רמוזים, גישה לכל החלפה'),
];

/** The duo items (options of 'sl-duo'): the comping and the RH / line cards. Append only. */
export const DUO_ITEMS: { form: FormId; cards: string[]; comp: 'shell' | 'rootless'; name: T2 }[] = [
  { form: 'blues', cards: ['guide-target', 'inside'], comp: 'shell', name: t('Duo on the blues: shells, a guide tone on every change', 'דואו בבלוז: שלדים, צליל מנחה בכל החלפה') },
  { form: '251', cards: ['harris'], comp: 'shell', name: t('Duo on ii–V–I: shells, Barry Harris rules', 'דואו על ii–V–I: שלדים, החוקים של בארי האריס') },
  { form: '251', cards: ['approach', 'inside'], comp: 'rootless', name: t('Duo on ii–V–I: rootless, approach every chord', 'דואו על ii–V–I: בלי שורש, גישה לכל אקורד') },
  { form: 'rhythm', cards: ['guide-target', 'inside'], comp: 'rootless', name: t('Duo on rhythm changes: rootless, guide tones', 'דואו על ריתם צ׳יינג׳ס: בלי שורש, צלילים מנחים') },
];

const REG = { piano: [60, 84], guitar: [52, 79], bass: [36, 60] } as const;
type Inst = keyof typeof REG;
const keyLabel = (key: number, minor?: boolean): string => (minor ? `${MINOR_NAMES[mod12(key)]}m` : NAMES[mod12(key)]);
const withKey = (n: T2, key: number, minor?: boolean): T2 => t(`${n.en} · ${keyLabel(key, minor)}`, `${n.he} · ${keyLabel(key, minor)}`);
const scalePcs = (c: VChord): number[] => [...new Set([...scOf(c), ...ctOf(c)])];

/**
 * The written landings of an improv item: beat 1 of every bar where the model line has a chord tone there (any chord
 * tone counts, any octave: ExpNote.land), and the last chord. The rest of each bar is the player's.
 */
export function landingsOf(chords: VChord[], model: VN[]): { beat: number; dur: number; p: number; land: number[] }[] {
  const out: { beat: number; dur: number; p: number; land: number[] }[] = [];
  let at = 0;
  chords.forEach((c) => {
    if (Math.abs(at / 4 - Math.round(at / 4)) < 1e-6) {
      const n = model.find((x) => Math.abs(x.beat - at) < 1e-6);
      if (n && ctOf(c).includes(mod12(n.p))) out.push({ beat: at, dur: Math.min(1, c.beats), p: n.p, land: ctOf(c) });
    }
    at += c.beats;
  });
  const last = chords[chords.length - 1];
  const lastAt = at - last.beats;
  const fin = out.find((x) => Math.abs(x.beat - lastAt) < 1e-6);
  if (fin) fin.dur = last.beats;
  else {
    const n = model.find((x) => Math.abs(x.beat - lastAt) < 1e-6);
    out.push({ beat: lastAt, dur: last.beats, p: n?.p ?? model[model.length - 1].p, land: ctOf(last) });
  }
  return out;
}

/** The model line of an improv item on an instrument (keeps the item's cards). */
export function soloModel(op: number, key: number, inst: Inst): VN[] {
  const it = SOLO_ITEMS[op % SOLO_ITEMS.length];
  const [lo, hi] = REG[inst];
  const seed = `solo:${op}:${key}:${inst}`;
  if (it.model === 'lick') return lickModel(key, it.form, lo, hi, seed);
  return modelLine(it.model, formChords(it.form, key), lo, hi, seed);
}

/** The free bars' parts of an improv drill: windows, the scale per chord, the cards and the chord spans. */
function freeGoal(chords: VChord[], windows: [number, number][], cards: string[], model: VN[], minPerBar: number): Pick<Drill['goal'], 'free' | 'improv'> {
  let at = 0;
  // The chord's scale, plus what the model plays over it (a superimposed pentatonic or triad pair is inside here).
  const scale = chords.map((c) => {
    const from = at;
    const extra = model.filter((n) => n.beat >= from - 1e-6 && n.beat < from + c.beats - 1e-6).map((n) => mod12(n.p));
    const s = { from, to: at + c.beats, pcs: [...new Set([...scalePcs(c), ...extra])] };
    at += c.beats;
    return s;
  });
  const inWin = (b: number) => windows.some(([a, z]) => b >= a - 1e-6 && b < z - 1e-6);
  return {
    free: { windows, scale, minPerBar, model: model.filter((n) => inWin(n.beat)).map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.p })) },
    improv: { cards, spans: spansOfVChords(chords) },
  };
}

/** The band under an improv take: swing comping (with a bass line unless the player is the bass) and swing drums. */
const bandFor = (inst: Inst): Pick<Drill, 'band' | 'drums'> => ({ band: { style: 'swing', ...(inst === 'bass' ? {} : { bass: true }) }, drums: { groove: 'swing' } });

// ───────────────────────────── keys: k-solo ─────────────────────────────

export function genKeysSolo(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  if (s.kind === 'sl-chorus') return keysChorus(s, key, op);
  if (s.kind === 'sl-duo') return keysDuo(s, key, op);
  const it = SOLO_ITEMS[op % SOLO_ITEMS.length];
  const chords = formChords(it.form, key);
  const beats = formBeats(it.form);
  const model = soloModel(op, key, 'piano');
  const notes: ExpNote[] = landingsOf(chords, model).map((l) => ({ pitch: l.p, beat: l.beat, dur: l.dur, hand: 'R', chordTone: true, land: l.land }));
  const minor = !!SOLO_FORMS[it.form].minor;
  return {
    spec: { ...s, key },
    itemId: itemIdOf({ ...s, key }),
    title: withKey(it.name, key, minor),
    notes,
    beats,
    meter: 4,
    keySig: SIG[minor ? mod12(key + 3) : key],
    goal: { evenness: false, hands: false, ...freeGoal(chords, [[0, beats]], it.cards, model, it.minPerBar ?? 2) },
    startBpm: s.tempo ?? 80,
    chart: chartOf(chords, minor ? key + 3 : key),
    // The bars are the player's: the chord chart only, the landings are not written out before the result.
    show: 'none',
    ...bandFor('piano'),
  };
}

/** Piano duo: the LH comps (shells or rootless, one hit a chord, graded), the RH improvises above it under the cards. */
function keysDuo(s: DrillSpec, key: number, op: number): Drill {
  const it = DUO_ITEMS[op % DUO_ITEMS.length];
  const chords = formChords(it.form, key);
  const beats = formBeats(it.form);
  const notes: ExpNote[] = [];
  const sets: NonNullable<Drill['goal']['chordSets']> = [];
  let at = 0;
  let prev: ReturnType<typeof voice> | null = null;
  chords.forEach((c, i) => {
    const ev = { sym: '', root: c.r, bass: c.r, iv: VQ_DEF[c.q].ct.slice(0, 4).concat(c.q === '7b9' ? [13] : []), bar: 0, at: 0 } as unknown as ChartChordEv;
    const v = voice(ev, it.comp === 'shell' ? 'shell' : 'rootless', prev);
    prev = v;
    // Keep the comping under middle C (the RH's split).
    const lh = v.lh.map((p) => (Math.max(...v.lh) >= 60 ? p - 12 : p));
    const id = i + 1;
    for (const p of lh) notes.push({ pitch: p, beat: r6(at), dur: r6(c.beats), hand: 'L', chordId: id, chordTone: true });
    const req = [...new Set(lh.map((p) => mod12(p)))].sort((a, b) => a - b);
    sets.push({ chordId: id, required: req, allowed: [...new Set([...req, ...scalePcs(c)])].sort((a, b) => a - b) });
    at += c.beats;
  });
  return {
    spec: { ...s, key, hands: 'RL' },
    itemId: itemIdOf({ ...s, key }),
    title: withKey(it.name, key),
    notes,
    beats,
    meter: 4,
    keySig: SIG[key],
    goal: { evenness: false, hands: false, chordSets: sets, improv: { cards: it.cards, spans: spansOfVChords(chords), model: duoModel(op, key).map((n) => ({ beat: n.beat, dur: n.dur, pitch: n.p })) } },
    startBpm: s.tempo ?? 70,
    chart: chartOf(chords, key),
    freeAbove: 60,
    ...bandFor('bass'),
  };
}
/** The RH model of a piano duo item (tests and the result screen). */
export const duoModel = (op: number, key: number): VN[] => modelLine('bebop', formChords(DUO_ITEMS[op % DUO_ITEMS.length].form, key), 62, 86, `duo:${op}:${key}`);

/** The written chorus on an instrument (the player's plan, else the suggested one). */
export function chorusLine(form: number, key: number, inst: Inst): VN[] {
  const [lo, hi] = REG[inst];
  return assembleChorus(barsOf(form, key), planOf(inst, form), lo, hi);
}
const chorusTitle = (form: number): T2 => {
  const f = CHORUS_FORMS[form % CHORUS_FORMS.length];
  return t(`Your solo chorus: ${f.name.en}`, `הכורוס שלכם: ${f.name.he}`);
};
function keysChorus(s: DrillSpec, key: number, form: number): Drill {
  const line = chorusLine(form, key, 'piano');
  const chords = barsOf(form, key).flat();
  const notes: ExpNote[] = line.map((n) => ({ pitch: n.p, beat: r6(n.beat), dur: r6(n.dur), hand: 'R', chordTone: n.ct }));
  return {
    spec: { ...s, key },
    itemId: itemIdOf({ ...s, key }),
    title: withKey(chorusTitle(form), key),
    notes,
    beats: CHORUS_FORMS[form % CHORUS_FORMS.length].bars.length * 4,
    meter: 4,
    keySig: SIG[key],
    goal: { evenness: true, hands: false, chordTonesOnBeats: true },
    startBpm: s.tempo ?? 70,
    chart: chartOf(chords, key),
  };
}

/** The keys family (jazz emphasis): guide tones ~1190 to the duo and the written chorus ~1880. */
export function keysSoloFamily(): FamilyDef {
  const v = (kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-solo', kind, hands: 'R', swing: true, option, ...o });
  const imp = (ops: number[]) => ops.map((o) => v('sl-imp', o));
  const JT = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `k-solo-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: SOLO_KEYS, tempo });
  return {
    id: 'k-solo',
    title: t('Solo by the rules', 'סולו לפי כללים'),
    style: 'jazz',
    levels: [
      JT(1, 'Improvise: guide tones on the changes', 'אלתור: צלילים מנחים בהחלפות', imp([0, 1]), [80, 150]),
      JT(2, 'Improvise: approach every chord', 'אלתור: גישה לכל אקורד', imp([2, 3]), [80, 160]),
      JT(3, 'Improvise by Barry Harris’s rules', 'אלתור לפי החוקים של בארי האריס', imp([4, 5]), [80, 160]),
      JT(4, 'Improvise with enclosures', 'אלתור עם כיתורים', imp([6, 7, 8]), [80, 160]),
      JT(5, 'The bebop enclosure and the delayed resolution', 'כיתור הביבופ והפתרון המושהה', imp([9, 10]), [80, 160]),
      JT(6, 'Improvise with pivots', 'אלתור עם פיבוטים', imp([11, 12]), [80, 160]),
      JT(7, 'Improvise in triad pairs', 'אלתור בזוגות משולשים', imp([13, 14]), [80, 150]),
      JT(8, 'Improvise in superimposed pentatonics', 'אלתור בפנטטוניות מונחות', imp([15, 16]), [80, 150]),
      JT(9, 'Use the licks you learned', 'להשתמש בליקים שלמדתם', imp([17, 18]), [80, 160]),
      JT(10, 'Rule mixes over forms', 'שילובי כללים על צורות', imp([19, 20, 21, 22]), [80, 170]),
      JT(11, 'Comp and solo: shells and a right-hand line', 'ללוות ולאלתר: שלדים וקו ביד ימין', [v('sl-duo', 0, { hands: 'RL' }), v('sl-duo', 1, { hands: 'RL' })], [70, 140]),
      JT(12, 'Comp and solo: rootless voicings and a line', 'ללוות ולאלתר: קולות בלי שורש וקו', [v('sl-duo', 2, { hands: 'RL' }), v('sl-duo', 3, { hands: 'RL' })], [70, 150]),
      JT(13, 'Write and play your own solo chorus', 'לכתוב ולנגן כורוס סולו משלכם', [0, 1, 2].map((o) => v('sl-chorus', o)), [70, 160]),
    ],
  };
}

// ───────────────────────────── guitar: g-solo ─────────────────────────────

function onNeck(tu: Tuning, ps: number[]): { s: number; f: number }[] {
  const lo = Math.min(...ps);
  const c = Math.max(1, Math.min(12, lo - tu.open[tu.open.length - 1]));
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return ps.map((m) => place(tu, m, strs, Math.max(0, c - 1), c + 4) ?? place(tu, m, strs, Math.max(0, c - 3), c + 6) ?? place(tu, m, strs, 0, 17)!);
}
const nearNeck = (tu: Tuning, p: number): { s: number; f: number } => {
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return place(tu, p, strs, 3, 10) ?? place(tu, p, strs, 0, 17)!;
};

export function genGuitarSolo(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  if (s.kind === 'sl-chorus') {
    const line = chorusLine(op, key, 'guitar');
    const pos = onNeck(tu, line.map((n) => n.p));
    const evs: Ev[] = line.map((n, i) => ({ beat: n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: i % 2 === 0 ? 'D' : 'U', ct: n.ct }] }));
    const d = gFinish({ ...s, key }, tu, evs, { title: withKey(chorusTitle(op), key), bpm: s.tempo ?? 70, evenness: true, goal: { chordTonesOnBeats: true }, keySig: SIG[key] });
    d.chart = chartOf(barsOf(op, key).flat(), key);
    return d;
  }
  if (s.kind === 'sl-duo') return guitarDuo(s, tu, key, op);
  const it = SOLO_ITEMS[op % SOLO_ITEMS.length];
  const chords = formChords(it.form, key);
  const beats = formBeats(it.form);
  const model = soloModel(op, key, 'guitar');
  const lands = landingsOf(chords, model);
  const minor = !!SOLO_FORMS[it.form].minor;
  const d = gFinish({ ...s, key }, tu, lands.map((l) => ({ beat: l.beat, dur: l.dur, notes: [{ ...nearNeck(tu, l.p), stroke: 'D' as const, ct: true }] })), { title: withKey(it.name, key, minor), bpm: s.tempo ?? 80, evenness: false, keySig: SIG[minor ? mod12(key + 3) : key] });
  return {
    ...d,
    notes: d.notes.map((n) => ({ ...n, land: lands.find((l) => Math.abs(l.beat - n.beat) < 1e-6)?.land })),
    beats,
    goal: { ...d.goal, evenness: false, hands: false, ...freeGoal(chords, [[0, beats]], it.cards, model, it.minPerBar ?? 2) },
    chart: chartOf(chords, minor ? key + 3 : key),
    // The bars are the player's: the chord chart only, the landings are not written out before the result.
    show: 'none',
    ...bandFor('guitar'),
  };
}

/** Alternating bars: the bar before a change is a comping bar, so "approach every chord" becomes a chord tone on each change. */
const duoCards = (cards: string[]): string[] => [...new Set(cards.map((c) => (c === 'approach' ? 'target-ct' : c)))];

/** Guitar duo: a bar of drop-2 comping (graded), then a bar of your line under the cards, through the form. */
function guitarDuo(s: DrillSpec, tu: Tuning, key: number, op: number): Drill {
  const it = DUO_ITEMS[op % DUO_ITEMS.length];
  const chords = formChords(it.form, key);
  const beats = formBeats(it.form);
  const evs: Ev[] = [];
  let at = 0;
  let near = 5;
  for (const c of chords) {
    if (Math.floor(at / 4 + 1e-9) % 2 === 0) {
      const four = (c.q === '7b9' ? [4, 7, 10, 1] : VQ_DEF[c.q].ct.slice(0, 4)).map((x) => c.r + x);
      const cands = drop2Voicings(tu, four, [4, 3, 2, 1], 13);
      const v = cands.length ? nearestVoicing(cands, near) : drop2Voicings(tu, four, [5, 4, 3, 2], 15)[0];
      near = Math.min(...v.map((p) => p.f).filter((f) => f > 0).concat([near]));
      evs.push({ beat: at, dur: c.beats, notes: v.map((p) => ({ ...p, stroke: 'D' as const, tech: 'strum-down' as const, ct: true })) });
    }
    at += c.beats;
  }
  const windows: [number, number][] = [];
  for (let b = 4; b < beats; b += 8) windows.push([b, Math.min(beats, b + 4)]);
  const model = modelLine('bebop', chords, 52, 79, `gduo:${op}:${key}`);
  const d = gFinish({ ...s, key }, tu, evs, { title: withKey(t(it.name.en.replace('shells', 'a bar of chords').replace('rootless', 'a bar of chords'), it.name.he.replace('שלדים', 'תיבת אקורדים').replace('בלי שורש', 'תיבת אקורדים')), key), bpm: s.tempo ?? 70, evenness: false, keySig: SIG[key] });
  return { ...d, beats, goal: { ...d.goal, evenness: false, hands: false, ...freeGoal(chords, windows, duoCards(it.cards), model, 2) }, chart: chartOf(chords, key), ...bandFor('guitar') };
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The guitar family (the jazz add-on): grades 6–8. */
export function guitarSoloFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number): SpecTemplate => ({ family: 'g-solo', kind, hands: 'R', instrument: 'guitar', swing: true, option });
  const imp = (ops: number[]) => ops.map((o) => v('sl-imp', o));
  const IM = 'improvised 8ths';
  return fam('g-solo', 'Solo by the rules', 'סולו לפי כללים', 'jazz', ['jazz'], [
    LT('g-solo', 1, 'Improvise: guide tones on the changes', 'אלתור: צלילים מנחים בהחלפות', imp([0, 1]), SOLO_KEYS, [80, 150], IM, 6),
    LT('g-solo', 2, 'Improvise: approach every chord', 'אלתור: גישה לכל אקורד', imp([2, 3]), SOLO_KEYS, [80, 160], IM, 6),
    LT('g-solo', 3, 'Improvise by Barry Harris’s rules', 'אלתור לפי החוקים של בארי האריס', imp([4, 5]), SOLO_KEYS, [80, 160], IM, 7),
    LT('g-solo', 4, 'Improvise with enclosures', 'אלתור עם כיתורים', imp([6, 8, 9]), SOLO_KEYS, [80, 160], IM, 7),
    LT('g-solo', 5, 'Improvise with pivots', 'אלתור עם פיבוטים', imp([11]), SOLO_KEYS, [80, 160], IM, 7),
    LT('g-solo', 6, 'Triad pairs and superimposed pentatonics', 'זוגות משולשים ופנטטוניות מונחות', imp([13, 15]), SOLO_KEYS, [80, 150], IM, 8),
    LT('g-solo', 7, 'Use the licks you learned', 'להשתמש בליקים שלמדתם', imp([17, 18]), SOLO_KEYS, [80, 160], IM, 8),
    LT('g-solo', 8, 'Rule mixes over forms', 'שילובי כללים על צורות', imp([19, 20, 22]), SOLO_KEYS, [80, 170], IM, 8),
    LT('g-solo', 9, 'Comp and solo: a bar of chords, a bar of line', 'ללוות ולאלתר: תיבת אקורדים, תיבת קו', [0, 1, 3].map((o) => v('sl-duo', o)), SOLO_KEYS, [70, 140], 'comping / 8ths', 8),
    LT('g-solo', 10, 'Write and play your own solo chorus', 'לכתוב ולנגן כורוס סולו משלכם', [0, 1, 2].map((o) => v('sl-chorus', o)), SOLO_KEYS, [70, 160], 'swing 8ths', 8),
  ]);
}

// ───────────────────────────── bass: b-solo ─────────────────────────────

export function genBassSolo(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  if (s.kind === 'sl-chorus') {
    const line = chorusLine(op, key, 'bass');
    return drillOf({ ...s, key }, tu, alt(line.map((n) => ({ b: n.beat, d: n.dur, p: n.p, ct: n.ct }))), { en: chorusTitle(op).en, he: chorusTitle(op).he, chart: chartOf(barsOf(op, key).flat(), key), evenness: true, goal: { chordTonesOnBeats: true }, keySig: SIG[key] });
  }
  if (s.kind === 'sl-duo') return bassDuo(s, tu, key, op);
  const it = SOLO_ITEMS[op % SOLO_ITEMS.length];
  const chords = formChords(it.form, key);
  const beats = formBeats(it.form);
  const model = soloModel(op, key, 'bass');
  const lands = landingsOf(chords, model);
  const minor = !!SOLO_FORMS[it.form].minor;
  const d = drillOf({ ...s, key }, tu, lands.map((l) => ({ b: l.beat, d: l.dur, p: l.p, ct: true })), { en: it.name.en, he: it.name.he, chart: chartOf(chords, minor ? key + 3 : key), evenness: false, keySig: SIG[minor ? mod12(key + 3) : key] });
  return {
    ...d,
    notes: d.notes.map((n) => ({ ...n, land: lands.find((l) => Math.abs(l.beat - n.beat) < 1e-6)?.land })),
    beats,
    goal: { ...d.goal, evenness: false, hands: false, ...freeGoal(chords, [[0, beats]], it.cards, model, it.minPerBar ?? 2) },
    // The bars are the player's: the chord chart only, the landings are not written out before the result.
    show: 'none',
    ...bandFor('bass'),
  };
}

/** Bass duo: a bar of walking (graded), then a bar of fill under the cards, through the form. */
function bassDuo(s: DrillSpec, tu: Tuning, key: number, op: number): Drill {
  const it = DUO_ITEMS[op % DUO_ITEMS.length];
  const chords = formChords(it.form, key);
  const beats = formBeats(it.form);
  // The walk: the root on each chord's first beat, chord tones between, a half step into the next root.
  const line: BN[] = [];
  let at = 0;
  let prev = 40;
  chords.forEach((c, i) => {
    const bar = Math.floor(at / 4 + 1e-9);
    const next = chords[i + 1];
    if (bar % 2 === 0) {
      const root = nearestPc(c.r, prev, 31, 47);
      const tones = [root, root + VQ_DEF[c.q].ct[1], root + VQ_DEF[c.q].ct[2]];
      for (let b = 0; b < c.beats; b++) {
        const last = b === c.beats - 1 && next;
        const p = last ? nearestPc(next.r, tones[1], 31, 47) + (nearestPc(next.r, tones[1], 31, 47) > tones[1] ? -1 : 1) : tones[b % tones.length];
        line.push({ b: at + b, d: 1, p, ct: !last });
      }
      prev = root;
    }
    at += c.beats;
  });
  // Fill bars: every second bar, not the last (the held resolution).
  const windows: [number, number][] = [];
  for (let b = 4; b < beats - 4; b += 8) windows.push([b, Math.min(beats, b + 4)]);
  const model = modelLine('roots', chords, 36, 60, `bduo:${op}:${key}`);
  const nm = t(`Walk a bar, fill a bar: ${SOLO_FORMS[it.form].name.en}`, `תיבת ווקינג, תיבת מעבר: ${SOLO_FORMS[it.form].name.he}`);
  const d = drillOf({ ...s, key }, tu, alt(line), { en: nm.en, he: nm.he, chart: chartOf(chords, key), evenness: true, keySig: SIG[key] });
  return { ...d, beats, goal: { ...d.goal, evenness: false, hands: false, ...freeGoal(chords, windows, ['target-ct', 'inside'], model, 2) }, ...bandFor('bass') };
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The bass family (jazz track): a solo that implies the roots, approach notes, the rules, enclosures, licks, the duo, the chorus. */
export function bassSoloFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number): SpecTemplate => ({ family: 'b-solo', kind, hands: 'R', instrument: 'bass', swing: true, option });
  const imp = (ops: number[]) => ops.map((o) => v('sl-imp', o));
  const IM = 'improvised 8ths';
  return fam('b-solo', 'Solo by the rules', 'סולו לפי כללים', [
    L('b-solo', 1, 'A solo that implies the roots', 'סולו שרומז על השורשים', imp([23, 24]), SOLO_KEYS, [80, 150], IM),
    L('b-solo', 2, 'Improvise: guide tones and approach notes', 'אלתור: צלילים מנחים וצלילי גישה', imp([0, 2]), SOLO_KEYS, [80, 150], IM),
    L('b-solo', 3, 'Improvise by Barry Harris’s rules', 'אלתור לפי החוקים של בארי האריס', imp([4, 5]), SOLO_KEYS, [80, 150], IM),
    L('b-solo', 4, 'Improvise with enclosures', 'אלתור עם כיתורים', imp([6, 8]), SOLO_KEYS, [80, 150], IM),
    L('b-solo', 5, 'Triad pairs and superimposed pentatonics', 'זוגות משולשים ופנטטוניות מונחות', imp([13, 15]), SOLO_KEYS, [70, 140], IM),
    L('b-solo', 6, 'Use the licks you learned', 'להשתמש בליקים שלמדתם', imp([17]), SOLO_KEYS, [80, 150], IM),
    L('b-solo', 7, 'Walk a bar, fill a bar', 'תיבת ווקינג, תיבת מעבר', [0, 1, 3].map((o) => v('sl-duo', o)), SOLO_KEYS, [80, 160], 'walking 4 / fills'),
    L('b-solo', 8, 'Write and play your own solo chorus', 'לכתוב ולנגן כורוס סולו משלכם', [0, 1, 2].map((o) => v('sl-chorus', o)), SOLO_KEYS, [70, 150], 'swung 8ths'),
  ]);
}
