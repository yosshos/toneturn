// New Orleans on piano and bass (docs/SPEC-JAZZ-NEIGHBOURS.md §5). Written only from the verified research —
// docs/research/STYLE-NEW-ORLEANS.md ([V] or well-sourced [C]); the [?] material is left out (named below). Rhythms,
// grooves and progressions are not protectable; no tune is used.
//
//   k-nola  piano: stride (the existing stride left hands, chartDrills.ts) over the two stride progressions — P1, the
//           chain of secondary dominants I–VI7–II7–V7, and P2, I–I7–IV–♯iv°7–I/5–V7–I (both [C] Levine and [V] in the
//           gospel research, STYLE-SOUL §1.2): single bass, octaves, tenths, walking tenths ([V] the stride definition:
//           bass on 1 and 3, chord on 2 and 4, AllMusic; octaves / tenths [C]); boogie-woogie — the three left-hand
//           figures (5-6 shuffle, the walking line R-3-5-6-♭7-6-5-3, broken octaves) over the 12-bar blues ([V]
//           Wikipedia: a regular, repeating LH figure transposed with the chords, "eight to the bar"; the figures [C]
//           Pianist magazine) in all 12 keys; stride and boogie with the drums.
//   b-nola  bass: the 2-feel / tuba role — the root on 1 and the 5th on 3 ([V] the march pulse on 1 and 3, Doleac; [C]
//           the tuba in 2, Schuller) over P1, P2 and the 12-bar blues; with the trad band and under the second line's bass drum.
//
// Left out as [?]: the second-line snare figures (SL1 / SL3), the Mardi Gras / Longhair habanera bass drum, the stride
// "back-beat" displacement (S6), the boogie right-hand figures (named examples [?]; only [C] via search summaries), the
// "Marshall" / "Jefferson" figures' notes, the tuba rungs' note lengths and approaches (T1–T4), the ragtime right-hand
// taxonomy. Every item: all 12 keys, free time first (rubato.ts), then the tempo ladder with count-in and click; the
// "with the band" levels are groove drills (the drums under the take). Pure and deterministic.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { generate, itemIdOf } from './generate';
import { all12 } from './keys12';
import { chartKind, type ChartVoicing } from './chartDrills';
import type { StyleId } from '../styles';
import { noteNameIn } from '../stdKey';
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle } from './guitar';
import { alt, drillOf, rootOf, type BN } from './bass';
import type { BassFamilyId } from './types';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m = 12): number => ((n % m) + m) % m;
/** A pitch class named for the drill's key (♯ in the sharp keys, ♭ in the flat ones). */
const nameIn = (p: number, key: number): string => noteNameIn(p, { key: ((key % 12) + 12) % 12 });
const KEYS = all12([0, 5, 7]);

/** A stride chart kind over P1 / P2 (chartDrills.ts CHART_SETS 'nola-p1' / 'nola-p2'). */
const ST = (set: 'nola-p1' | 'nola-p2', v: ChartVoicing) => chartKind(`set:${set}`, v, 'whole');

/** The band levels of k-nola: op 0 stride octaves over P1 with the swing drums, op 1 the boogie walking line with the shuffle. */
function genNolaBand(s: DrillSpec): Drill {
  const boogie = (s.option ?? 0) === 1;
  const d = generate({ ...s, kind: boogie ? 'boogie' : ST('nola-p1', 'stride-octave'), option: boogie ? 1 : 0, swing: true });
  return {
    ...d,
    spec: { ...d.spec, kind: s.kind, option: s.option },
    itemId: itemIdOf(s),
    title: t(`${d.title.en} · with the drums`, `${d.title.he} · עם התופים`),
    drums: { groove: boogie ? 'shuffle' : 'swing' },
  };
}

/** The piano entry (generate.ts): only the band level (the stride levels go to genChart, the boogie to genBoogie). */
export function genNolaPiano(s: DrillSpec): Drill {
  return genNolaBand(s);
}

/** The bass lines of b-nola: the 2-feel over P1 (op 0) or P2 (op 1); bn-band op 0 the trad band, op 1 the second line. */
export function generateBassNola(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key);
  const op = s.option ?? 0;
  const p2 = s.kind === 'bn-two' && op === 1;
  const blues = s.kind === 'bn-two' && op === 2;
  // [root, quality, bass] per bar (semitones above the key)
  const P1: [number, string, number][] = [[0, '', 0], [9, '7', 9], [2, '7', 2], [7, '7', 7], [0, '', 0], [9, '7', 9], [2, '7', 2], [7, '7', 7]];
  const P2: [number, string, number][] = [[0, '', 0], [0, '7', 0], [5, '', 5], [6, '°7', 6], [0, '', 7], [7, '7', 7], [0, '', 0], [0, '', 0]];
  // the 12-bar blues in 2 ([C] STYLE-NEW-ORLEANS §1.2 P5, "everywhere")
  const BL: [number, string, number][] = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((d) => [d, '7', d]);
  const prog = blues ? BL : p2 ? P2 : P1;
  const line: BN[] = [];
  prog.forEach(([r, q, b], bar) => {
    const R = rootOf(tu, key + b);
    // the 5th on 3: the chord's own (a diminished 5th on the °7); on I/5 the bass stays on the 5th
    const fifth = b !== r ? R : rootOf(tu, key + r + (q === '°7' ? 6 : 7));
    line.push({ b: bar * 4, d: 2, p: R, ct: true }, { b: bar * 4 + 2, d: 2, p: fifth, ct: true });
  });
  line.push({ b: prog.length * 4, d: 2, p: rootOf(tu, key), ct: true });
  const chart = [...prog.map(([r, q, b]) => `${nameIn(mod(key + r), key)}${q}${b !== r ? `/${nameIn(mod(key + b), key)}` : ''}`), nameIn(key, key)];
  const band = s.kind === 'bn-band';
  const T = band
    ? op
      ? t('The tuba role under the second line', 'תפקיד הטובה מתחת לסקנד ליין')
      : t('The 2-feel with the trad band', 'בשתיים עם להקת הטראד')
    : blues
      ? t('The 2-feel through the 12-bar blues', 'בשתיים לאורך בלוז של 12 תיבות')
      : p2
        ? t('The 2-feel: I–I7–IV–♯iv°7–I/5–V7', 'בשתיים: I–I7–IV–♯iv°7–I/5–V7')
      : t('The 2-feel: I–VI7–II7–V7', 'בשתיים: I–VI7–II7–V7');
  return drillOf(s, tu, alt(line), { en: T.en, he: T.he, chart, evenness: true, ...(band ? { drums: { groove: op ? 'second-line-3' : 'swing' }, band: op ? ('secondline' as const) : ('trad' as const) } : {}) });
}

// ───────────────────────────── the families ─────────────────────────────

export const NOLA_FAMILY_STYLE: Record<string, StyleId> = { 'k-nola': 'neworleans', 'b-nola': 'neworleans' };

export function keysNolaFamily(): FamilyDef {
  const fam: FamilyId = 'k-nola';
  const sp = (kind: string, option = 0): SpecTemplate => ({ family: fam, kind, hands: 'L', option, swing: true });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo, style: 'neworleans' });
  return {
    id: fam,
    title: t('Stride and boogie-woogie', 'סטרייד ובוגי-ווגי'),
    style: 'both',
    styleId: 'neworleans',
    levels: [
      L(1, 'Stride, single bass: I–VI7–II7–V7', 'סטרייד, בס בודד: I–VI7–II7–V7', [sp(ST('nola-p1', 'stride-single'))], [70, 110]),
      L(2, 'Stride, octave bass: I–VI7–II7–V7', 'סטרייד, בס באוקטבות: I–VI7–II7–V7', [sp(ST('nola-p1', 'stride-octave'))], [70, 110]),
      L(3, 'Stride through IV–♯iv°7–I/5', 'סטרייד דרך IV–♯iv°7–I/5', [sp(ST('nola-p2', 'stride-single')), sp(ST('nola-p2', 'stride-octave'))], [70, 120]),
      L(4, 'Stride tenths', 'סטרייד בדצימות', [sp(ST('nola-p1', 'stride-tenth')), sp(ST('nola-p2', 'stride-tenth'))], [70, 120]),
      L(5, 'Stride: the bass walks on 3', 'סטרייד: הבס הולך על 3', [sp(ST('nola-p2', 'stride-walk'))], [80, 130]),
      L(6, 'Boogie-woogie: the 5-6 shuffle', 'בוגי-ווגי: השאפל של 5-6', [sp('boogie', 0)], [70, 120]),
      L(7, 'Boogie-woogie: the walking line', 'בוגי-ווגי: הקו ההולך', [sp('boogie', 1)], [70, 120]),
      L(8, 'Boogie-woogie: broken octaves', 'בוגי-ווגי: אוקטבות שבורות', [sp('boogie', 2)], [70, 130]),
      L(9, 'Stride and boogie with the drums', 'סטרייד ובוגי עם התופים', [sp('nola-band', 0), sp('nola-band', 1)], [90, 150]),
    ],
  };
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;

export function bassNolaFamily(L0: BLFn, fam: BFamFn): GuitarFamilyDef {
  const sp = (kind: string, option = 0): SpecTemplate => ({ family: 'b-nola', kind, hands: 'R', instrument: 'bass', option, perBeat: 0.5, swing: true });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): GuitarLevelDef => ({ ...L0('b-nola', level, en, he, specs, KEYS, tempo, 'halves', ['jazz']), style: 'neworleans' });
  return {
    ...fam('b-nola', 'New Orleans bass: the 2-feel and the tuba role', 'בס ניו אורלינס: בשתיים ותפקיד הטובה', [
      L(1, 'The 2-feel: I–VI7–II7–V7', 'בשתיים: I–VI7–II7–V7', [sp('bn-two', 0)], [80, 160]),
      L(2, 'The 2-feel through IV–♯iv°7–I/5', 'בשתיים דרך IV–♯iv°7–I/5', [sp('bn-two', 1)], [80, 160]),
      L(3, 'The 2-feel through the 12-bar blues', 'בשתיים לאורך בלוז של 12 תיבות', [sp('bn-two', 2)], [80, 170]),
      L(4, 'With the trad band', 'עם להקת הטראד', [sp('bn-band', 0)], [100, 180]),
      L(5, 'The tuba role under the second line', 'תפקיד הטובה מתחת לסקנד ליין', [sp('bn-band', 1)], [90, 120]),
    ]),
    style: 'both',
    styleId: 'neworleans',
  };
}

/** Path places (KEYS_LEVEL_DIFF): no gates, difficulty by level. */
export const NOLA_LEVEL_DIFF: Record<string, number> = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k-nola-${i + 1}`, 900 + 55 * i]));
