// Meter & cross-rhythm on the guitar's core path: the `g-meter` family (docs/AUDIT-CONTENT-THEORY.md §ז.2 R-4, R-5,
// R-1; §ד.3 — odd meters, polyrhythm and metric modulation lived only in the prog add-on). A continuous ladder:
//
//   1 strum in time: 8ths, triplets, 16ths (accent on the beat)   4 displacement: the riff moved by an 8th / a quarter
//   2 hemiola: 3+3+2 over 4/4, big twos over 3/4                  5 cross-rhythms: accents every 3 / 5 sixteenths, then
//   3 odd meters: 7/8 and 5/4 riffs with the drums                   5 and 7 even stabs over a 4/4 bar
//                                                                 6 metric modulation (the tempo map; the click follows)
//
// Levels 3, 5 and 6 reuse the prog engine's generators (guitarProg.ts) under this family's id, so the core path has
// them without the add-on (the add-on keeps its own, deeper ladder). Pure and deterministic.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { SpecTemplate } from './generate';
import type { Tuning } from '../fretboard';
import { finish, mod, NAMES, t, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type T2 } from './guitar';
import { generateGuitarProg } from './guitarProg';
import { withBarPlan } from './timeline';

/** The root's fret on the lowest string (0–11). */
const pos = (tu: Tuning, key: number): number => mod(key - tu.open[tu.open.length - 1], 12);
/** A power chord with its root on string 6 at fret f (root, 5th, octave). */
const power = (f: number, acc = false): GN[] => [
  { s: 6, f, ...(acc ? { acc: true } : {}) },
  { s: 5, f: f + 2, ...(acc ? { acc: true } : {}) },
  { s: 4, f: f + 2, ...(acc ? { acc: true } : {}) },
];
const tt = (en: string, he: string, key: number): T2 => t(`${en} · ${NAMES[key]}`, `${he} · ${NAMES[key]}`);

/** Kinds of this family that the prog engine builds. */
const FROM_PROG = new Set(['odd-riff', 'poly', 'modulate']);

export function generateGuitarMeter(s: DrillSpec, tu: Tuning): Drill {
  if (FROM_PROG.has(s.kind)) return generateGuitarProg(s, tu);
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const f = pos(tu, key);
  // The bass course's b-time 11–12 share these kinds: the root alone on the lowest string instead of a power chord.
  const lo = tu.open.length;
  const bass = s.family.startsWith('b-');
  const chord = (fret: number, acc = false): GN[] => (bass ? [{ s: lo, f: fret, ...(acc ? { acc: true } : {}) }] : power(fret, acc));
  switch (s.kind) {
    case 'gm-sub': {
      // A power chord strummed 2 / 3 / 4 times a beat for four bars, down on the beat, the beat accented.
      const per = [2, 3, 4][op % 3];
      const evs: Ev[] = [];
      for (let b = 0; b < 16; b++) for (let i = 0; i < per; i++) evs.push({ beat: b + i / per, dur: 1 / per, notes: power(f, i === 0).map((g) => ({ ...g, stroke: i % 2 ? 'U' : 'D' })) });
      evs.push({ beat: 16, dur: 2, notes: chord(f) });
      const nm = [t('8ths', 'שמיניות'), t('triplets', 'טריולות'), t('16ths', 'שש-עשריות')][op % 3];
      return finish(s, tu, evs, { title: tt(`Strum in time: ${nm.en}, the beat accented`, `פריטה בזמן: ${nm.he}, הדגשה על הפעמה`, key), bpm: [72, 60, 52][op % 3], evenness: true });
    }
    case 'gm-hemi': {
      if (op % 2 === 0) {
        // 3+3+2 over 4/4 (the tresillo, twice a bar pair across the bar line): stabs on 1, the "and" of 2, 4 | the "and"
        // of 1, 3, 4; drums in 4/4.
        const HITS = [0, 1.5, 3, 4.5, 6, 7];
        const evs: Ev[] = [];
        for (let r = 0; r < 2; r++) HITS.forEach((h, k) => evs.push({ beat: r * 8 + h, dur: k >= 4 ? 1 : 1.5, notes: chord(r ? f + 5 > 12 ? f - 7 : f + 5 : f, true) }));
        evs.push({ beat: 16, dur: 2, notes: chord(f) });
        const d = finish(s, tu, evs, { title: tt('3+3+2 over 4/4: stabs across the bar line', '3+3+2 מעל 4/4: דקירות מעבר לקו התיבה', key), bpm: 80, evenness: false });
        return { ...d, drums: { groove: 'rock-8' } };
      }
      // Big twos over 3/4: the chord on 1, 3 and 2 across each pair of bars (the hemiola), the waltz in the drums.
      const evs: Ev[] = [];
      for (let pair = 0; pair < 4; pair++) for (let k = 0; k < 3; k++) evs.push({ beat: pair * 6 + k * 2, dur: 2, notes: chord(pair % 2 ? (f + 7) % 12 : f, k === 0) });
      evs.push({ beat: 24, dur: 3, notes: chord(f) });
      const d0 = finish(s, tu, evs, { title: tt('Hemiola: the chord in big twos over 3/4', 'המיולה: האקורד בשתיים גדולות מעל 3/4', key), bpm: 96, evenness: false, meter: 3 });
      return { ...withBarPlan(d0, [['3/4', 9]]), drums: { groove: 'waltz' } };
    }
    case 'gm-displace': {
      // A one-bar riff (stabs on 1, the "and" of 2, 4), twice in place, then moved later by an 8th (op 0) or a quarter.
      const shift = op % 2 ? 1 : 0.5;
      const FIG = [0, 1.5, 3];
      const evs: Ev[] = [];
      for (let bar = 0; bar < 4; bar++) for (const x of FIG) evs.push({ beat: bar * 4 + x + (bar >= 2 ? shift : 0), dur: 0.5, notes: chord(f, x === 0) });
      evs.push({ beat: 16, dur: 2, notes: chord(f) });
      const nm = op % 2 ? t('a quarter', 'ברבע') : t('an 8th', 'בשמינית');
      const d = finish(s, tu, evs, { title: tt(`Displacement: the riff moved by ${nm.en}`, `הזזה: הריף זז ${nm.he}`, key), bpm: 76, evenness: false });
      return { ...d, drums: { groove: 'rock-8' } };
    }
    case 'gm-cross': {
      // 5 or 7 even notes over each 4/4 bar (5:4, 7:4): the low root on the first, the box above it, the drums in 4.
      // Option 2 (AUDIT-CONTENT-THEORY §ד.3, the bass's b-time 13): 5 even notes over each 3/4 bar (5:3), the waltz in
      // the drums. On the two lowest strings of any tuning (the bass too).
      const three = op === 2;
      const n = three ? 5 : op % 2 ? 7 : 5;
      const per = three ? 3 : 4;
      const bars = three ? 4 : 3;
      const line = [0, 2, 4, 5, 7, 9, 10].map((iv) => ({ s: iv < 5 ? lo : lo - 1, f: iv < 5 ? f + iv : f + iv - 5 }));
      const evs: Ev[] = [];
      for (let bar = 0; bar < bars; bar++) for (let i = 0; i < n; i++) evs.push({ beat: bar * per + (i * per) / n, dur: per / n, notes: [{ ...line[(bar + i) % n % line.length], ...(i === 0 ? { acc: true } : {}) }] });
      evs.push({ beat: bars * per, dur: three ? 3 : 2, notes: chord(f) });
      if (three) {
        const d3 = finish(s, tu, evs, { title: tt('5 against 3: even notes over a 3/4 bar', '5 נגד 3: צלילים שווים על פני תיבת 3/4', key), bpm: 54, evenness: true, meter: 3 });
        return { ...withBarPlan(d3, [['3/4', bars + 1]]), drums: { groove: 'waltz' } };
      }
      const d = finish(s, tu, evs, { title: tt(`${n} against 4: even notes over the bar`, `${n} נגד 4: צלילים שווים על פני התיבה`, key), bpm: 50, evenness: true });
      return { ...d, drums: { groove: 'rock-8' } };
    }
  }
  throw new Error(`Unknown g-meter kind ${s.kind}`);
}

/** The g-meter family: 6 levels on the core path, by grade. */
export function guitarMeterFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-meter';
  const P = (kind: string, tempo: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'guitar', tempo, ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: number[], tempo: [number, number], sub: string, grade: number): GuitarLevelDef => ({ id: `g-meter-${level}`, level, title: t(en, he), specs, keys, tempo, sub, grade });
  const EADG = [4, 9, 2, 7];
  return {
    id: fam,
    title: t('Meter & cross-rhythm', 'משקל ופולי-ריתמוס'),
    style: 'classical',
    genres: ['all'],
    instruments: ['guitar'],
    levels: [
      L(1, 'Strum in time: 8ths, triplets, 16ths', 'פריטה בזמן: שמיניות, טריולות, שש-עשריות', [0, 1, 2].map((o) => P('gm-sub', [66, 56, 50][o], { option: o })), EADG, [50, 100], '8ths → 16ths', 1),
      L(2, 'Hemiola: 3+3+2 over 4/4, big twos over 3/4', 'המיולה: 3+3+2 מעל 4/4, שתיים גדולות מעל 3/4', [P('gm-hemi', 72, { option: 0 }), P('gm-hemi', 84, { option: 1 })], EADG, [72, 120], '8ths', 2),
      L(3, 'Odd meters: 7/8 and 5/4 riffs', 'משקלים אי-זוגיים: ריפים ב-7/8 וב-5/4', [0, 1, 2].map((o) => P('odd-riff', 150, { option: o })), EADG, [150, 240], '♪ 8ths', 3),
      L(4, 'Displacement: the riff moves by an 8th, by a quarter', 'הזזה: הריף זז בשמינית, ברבע', [0, 1].map((o) => P('gm-displace', 70, { option: o })), EADG, [70, 116], '8ths', 4),
      L(5, 'Cross-rhythms: 3 and 5 over 4, then 5:4 and 7:4', 'פולי-ריתמוס: 3 ו-5 על 4, ואז 5:4 ו-7:4', [P('poly', 60, { option: 0 }), P('poly', 60, { option: 1 }), P('gm-cross', 44, { option: 0 }), P('gm-cross', 40, { option: 1 })], [9, 4, 2, 7], [40, 90], '16ths / over the bar', 5),
      L(6, 'Metric modulation', 'מודולציה מטרית', [0, 1, 2].map((o) => P('modulate', 70, { option: o })), [9, 4, 2, 7], [70, 100], '♩ → the new ♩', 6),
    ],
  };
}
