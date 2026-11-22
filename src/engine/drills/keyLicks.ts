// SPEC-KEY-SESSION §1C (owner 2026-11-22): the approach licks over the harmonised scale, piano family `k-keylick`, and
// §1b: more exercises in the key, piano family `k-keyx`. Both in all 12 keys, filed on the key's page.
//
// The licks: owner-dictated rules (verified for this app). A lick comes before each shape on its way through the scale —
// each diatonic 3rd, triad or 7th chord:
//   - from below is always a chromatic half step below the target;
//   - from above is always the next scale degree (diatonic);
//   - lick 1: below → target;  lick 2: below, above → target (or above, below → target);
//     lick 3: below, scale-step above, chromatic above (a half step over the target), below → target.
//   - going up, the lick targets the shape's lowest note and the shape is arpeggiated up;
//     going down, the lick targets the shape's top note and the shape is played down.
// In C major, triads: up L1 B–C E G, C♯–D F A …; down (from the C triad down the scale) L1 F♯–G E C, E–F D B …
// Each item runs the whole scale, degrees 1→8 up or 8→1 down, in 8ths, one shape after another. Major and harmonic
// minor (the k-sharm scale table: option 0 = major, 7 = harmonic minor); hands together in octaves at the top levels.
//
// Lick 3 on a target whose upper scale step is only a half step away (E and B in C major; owner 2026-11-22): there is no
// chromatic note between them, so the lick turns over — the scale step above, the scale step below, the chromatic below
// spelled on the target's letter → target: before E minor, F D E♭ – E G B; before B°, C A B♭ – B D F.
//
// Spelling: one letter per degree (keyTheory.spellScale); the chromatic below takes the letter under the target's
// (B under C, C♯ under D, F♯ under G), the chromatic above the letter over it (D♭ over C, A♭ over G); a double
// accidental falls back to the target's own letter (G under G♯).
//
// Pure and deterministic. Own exercises generated from the rules; nothing copied.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { generate, itemIdOf, rhBase } from './generate';
import { H_SCALES, hSig, hTonic, type HScale } from './harmLadder';
import { spellScale } from '../keyTheory';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m = 12): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<number, string> = { [-1]: '♭', 0: '', 1: '♯' };
const pitchIn = (pc: number, lo: number): number => lo + mod(pc - lo, 12);

/** The two scales of these families (the k-sharm table): option 0 = major, 7 = harmonic minor. */
export const LICK_SCALES = [0, 7];
/**
 * BUILD-PLAN phase 7: the same licks in the Aeolian (option 5, the major key from its 6th degree), the modes from the
 * root (1–4, 6) and melodic minor (8) — the k-sharm table's seven-note scales; the rules are the same on any of them.
 */
export const LICK_MORE_SCALES = [1, 2, 3, 4, 5, 6, 8];
const scaleOf = (s: DrillSpec): HScale => {
  const o = (s.option ?? 0) % 100;
  return H_SCALES[o <= 8 ? o : 0];
};
const kName = hTonic;

// ───────────────────────────── spelling ─────────────────────────────

/** The note a half step (`semis` ±1) from a spelled note, on the letter `steps` (±1) away; a double accidental keeps the letter. */
export function spellNeighbour(name: string, steps: number, semis: number): string {
  const li = LETTERS.indexOf(name[0]);
  const acc = ({ '♯': 1, '♭': -1, '𝄪': 2, '𝄫': -2 } as Record<string, number>)[name.slice(1)] ?? 0;
  const pc = mod(NATURAL[li] + acc + semis);
  for (const l of [mod(li + steps, 7), li]) {
    let d = mod(pc - NATURAL[l]);
    if (d > 6) d -= 12;
    if (ACC[d] !== undefined) return LETTERS[l] + ACC[d];
  }
  return name;
}

// ───────────────────────────── the licks ─────────────────────────────

export type Lick = '1' | '2ba' | '2ab' | '3';
export type Shape = '1' | '3' | 't' | '7';
export type Dir = 'up' | 'down';
export const LICKS: Lick[] = ['1', '2ba', '2ab', '3'];
export const SHAPES: Shape[] = ['1', '3', 't', '7'];
const SIZE: Record<Shape, number> = { '1': 1, '3': 2, t: 3, '7': 4 };

/** One written note of a lick run: pitch, its name, its length in beats. */
export interface LN {
  p: number;
  name: string;
  dur: number;
}
/** One step of the run: the lick, then the shape it leads into (the first shape note is the target). */
export interface LickSeg {
  lick: LN[];
  shape: LN[];
}

/**
 * The whole run: one segment per scale degree, 1→8 up or 8→1 down. `tonic` is the pitch of degree 1 (the bottom of
 * the run). Pure; the tests read it note for note.
 */
export function lickRun(key: number, sc: HScale, lick: Lick, shape: Shape, dir: Dir, tonic: number): LickSeg[] {
  const ints = sc.ints;
  const n = ints.length;
  const names = spellScale(kName(key, sc), ints);
  const d = (k: number): LN => ({ p: tonic + 12 * Math.floor(k / n) + ints[mod(k, n)], name: names[mod(k, n)], dur: 0.5 });
  const sz = SIZE[shape];
  const out: LickSeg[] = [];
  const ks = dir === 'up' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  for (const k of ks) {
    const tones = Array.from({ length: sz }, (_, j) => d(k + 2 * j));
    const shapeNs = dir === 'up' ? tones : tones.slice().reverse();
    const tk = dir === 'up' ? k : k + 2 * (sz - 1);
    const target = d(tk);
    const below: LN = { p: target.p - 1, name: spellNeighbour(target.name, -1, -1), dur: 0.5 };
    const above: LN = d(tk + 1);
    const chromAbove: LN = { p: target.p + 1, name: spellNeighbour(target.name, 1, 1), dur: 0.5 };
    let ns: LN[];
    if (lick === '1') ns = [below];
    else if (lick === '2ba') ns = [below, above];
    else if (lick === '2ab') ns = [above, below];
    else if (above.p === chromAbove.p) {
      const stepBelow = d(tk - 1);
      // the chromatic below on the target's letter (E♭ before E); a double flat falls back to the letter below
      const same = spellNeighbour(target.name, 0, -1);
      ns = [above, stepBelow, { p: target.p - 1, name: same === target.name ? spellNeighbour(target.name, -1, -1) : same, dur: 0.5 }];
    } else ns = [below, above, chromAbove, { ...below }];
    out.push({ lick: ns, shape: shapeNs });
  }
  return out;
}

const LICK_T: Record<Lick, T2> = {
  '1': t('approach lick 1, a half step below', 'ליק גישה 1, חצי טון מלמטה'),
  '2ba': t('lick 2, the enclosure: below, then above', 'ליק 2, כיתור: מלמטה ואז מלמעלה'),
  '2ab': t('lick 2, the enclosure: above, then below', 'ליק 2, כיתור: מלמעלה ואז מלמטה'),
  '3': t('lick 3, the long enclosure', 'ליק 3, הכיתור הארוך'),
};
const SHAPE_T: Record<Shape, T2> = {
  '1': t('each scale degree', 'כל דרגה בסולם'),
  '3': t('the diatonic 3rds', 'הטרצות הדיאטוניות'),
  t: t('the triads', 'המשולשים'),
  '7': t('the 7th chords', 'הספטאקורדים'),
};
const DIR_T: Record<Dir, T2> = { up: t('up the scale', 'במעלה הסולם'), down: t('down the scale', 'במורד הסולם') };

/** kind `kl-<lick>-<shape>-<dir>`, e.g. kl-1-t-up, kl-2ab-7-down, kl-3-3-up. */
export function parseLickKind(kind: string): { lick: Lick; shape: Shape; dir: Dir } {
  const m = /^kl-(1|2ba|2ab|3)-(1|3|t|7)-(up|down)$/.exec(kind);
  if (!m) throw new Error(`Unknown approach-lick drill: ${kind}`);
  return { lick: m[1] as Lick, shape: m[2] as Shape, dir: m[3] as Dir };
}

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  /** One note per hand at one onset; two hands share a chord id (hands together, as the scales do). */
  add(beat: number, dur: number, parts: { hand: 'R' | 'L'; p: number; spell?: string; finger?: number }[]): void {
    const id = parts.length > 1 ? ++this.cid : undefined;
    for (const x of parts) this.list.push({ pitch: x.p, beat: r6(beat), dur: r6(dur), hand: x.hand, ...(x.spell ? { spell: x.spell } : {}), ...(x.finger ? { finger: x.finger } : {}), ...(id !== undefined ? { chordId: id } : {}) });
  }
}

function drillOf(s: DrillSpec, n: Notes, title: T2, startBpm: number, goal: Partial<DrillGoal>, keySig: string, meter = 4): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return {
    spec: { ...s },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter,
    keySig,
    goal: { evenness: true, hands: s.hands === 'RL', ...goal },
    startBpm: s.tempo ?? startBpm,
  };
}

const handsT = (s: DrillSpec): T2 => (s.hands === 'RL' ? t(' · hands together in octaves', ' · ידיים יחד באוקטבות') : s.hands === 'L' ? t(' · LH', ' · יד שמאל') : t('', ''));

function genLick(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const sc = scaleOf(s);
  const { lick, shape, dir } = parseLickKind(s.kind);
  const segs = lickRun(key, sc, lick, shape, dir, rhBase(key));
  const n = new Notes();
  const flat = segs.flatMap((g) => [...g.lick, ...g.shape]);
  let b = 0;
  flat.forEach((x, i) => {
    const dur = i === flat.length - 1 ? 2 : x.dur;
    const parts: { hand: 'R' | 'L'; p: number; spell: string }[] = s.hands === 'L' ? [{ hand: 'L', p: x.p - 12 * (shape === '7' ? 2 : 1), spell: x.name }] : [{ hand: 'R', p: x.p, spell: x.name }];
    if (s.hands === 'RL') parts.push({ hand: 'L', p: x.p - 12, spell: x.name });
    n.add(b, dur, parts);
    b += x.dur;
  });
  const h = handsT(s);
  const title = t(`${kName(key, sc)} ${sc.name.en}: ${LICK_T[lick].en} into ${SHAPE_T[shape].en}, ${DIR_T[dir].en}${h.en}`, `${kName(key, sc)} ${sc.name.he}: ${LICK_T[lick].he}, אל ${SHAPE_T[shape].he}, ${DIR_T[dir].he}${h.he}`);
  return drillOf(s, n, title, shape === '7' ? 54 : shape === '1' ? 66 : 60, {}, hSig(key, sc));
}

// ───────────────────────────── more exercises in the key (k-keyx) ─────────────────────────────

const OST: Record<string, { fig: number[]; en: string; he: string }> = {
  'kx-ost': { fig: [0, 4, 7, 4], en: 'over a LH 1-5-8-5 ostinato', he: 'מעל אוסטינטו 1-5-8-5 ביד שמאל' },
  'kx-ost3': { fig: [0, 4, 9], en: 'over a LH 3-note ostinato across the bar', he: 'מעל אוסטינטו של 3 צלילים ביד שמאל, נגד התיבה' },
};

function genKeyX(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  // I–IV–V7–I bass leaps: the existing waltz (advanced-5) and stride (accomp-3) generators, filed in the key.
  if (s.kind === 'kx-waltz' || s.kind === 'kx-stride') {
    const src: DrillSpec = s.kind === 'kx-waltz' ? { family: 'advanced', kind: 'leaps', key, hands: 'L', option: 0 } : { family: 'accomp', kind: 'stride', key, hands: 'RL', option: 1 };
    const d = generate(src);
    return { ...d, spec: { ...s }, itemId: itemIdOf(s), startBpm: s.tempo ?? d.startBpm };
  }
  const sc = scaleOf(s);
  const ints = sc.ints;
  const names = spellScale(kName(key, sc), ints);
  const R = rhBase(key);
  const Lt = pitchIn(key, 36);
  const dg = (tonic: number, k: number): number => tonic + 12 * Math.floor(k / 7) + ints[mod(k, 7)];
  const nm = (k: number): string => names[mod(k, 7)];
  const n = new Notes();
  const head = `${kName(key, sc)} ${sc.name.en}`;
  const headHe = `${kName(key, sc)} ${sc.name.he}`;
  const sig = hSig(key, sc);
  const hand: 'R' | 'L' = s.hands === 'L' ? 'L' : 'R';
  const hn = hand === 'L' ? t(' · LH', ' · יד שמאל') : t(' · RH', ' · יד ימין');
  const upDown = (top: number): number[] => [...Array.from({ length: top + 1 }, (_, i) => i), ...Array.from({ length: top }, (_, i) => top - 1 - i)];
  switch (s.kind) {
    case 'kx-boct': {
      // Broken octaves through the scale: each degree, then its octave, in 8ths — one octave up and back.
      const T = hand === 'R' ? R : Lt;
      const ks = upDown(7);
      ks.forEach((k, i) => {
        const last = i === ks.length - 1;
        n.add(i, 0.5, [{ hand, p: dg(T, k), spell: nm(k), finger: hand === 'R' ? 1 : 5 }]);
        n.add(i + 0.5, last ? 1.5 : 0.5, [{ hand, p: dg(T, k) + 12, spell: nm(k), finger: hand === 'R' ? 5 : 1 }]);
      });
      return drillOf(s, n, t(`${head}: broken octaves through the scale${hn.en}`, `${headHe}: אוקטבות שבורות לאורך הסולם${hn.he}`), 60, {}, sig);
    }
    case 'kx-leap': {
      // Scale degrees in leaps: each step of the scale an octave away from the last, the registers alternating.
      const T = hand === 'R' ? R : Lt;
      const ks = upDown(7);
      ks.forEach((k, i) => n.add(i, i === ks.length - 1 ? 2 : 1, [{ hand, p: dg(T, k) + (i % 2 ? 12 : 0), spell: nm(k) }]));
      return drillOf(s, n, t(`${head}: the scale in octave leaps, the registers alternating${hn.en}`, `${headHe}: הסולם בקפיצות של אוקטבה, האוגדנים מתחלפים${hn.he}`), 60, { evenness: false }, sig);
    }
    case 'kx-canon': {
      // A canon: the scale 2 octaves up and down in 8ths; the second hand enters one beat later, an octave lower.
      const lhLeads = (s.option ?? 0) >= 100;
      const ks = upDown(14);
      const lead: 'R' | 'L' = lhLeads ? 'L' : 'R';
      const follow: 'R' | 'L' = lhLeads ? 'R' : 'L';
      const tonicOf = (h: 'R' | 'L') => (h === 'R' ? R : R - 12);
      ks.forEach((k, i) => {
        const last = i === ks.length - 1;
        n.add(i * 0.5, last ? 1.5 : 0.5, [{ hand: lead, p: dg(tonicOf(lead), k), spell: nm(k) }]);
        n.add(i * 0.5 + 1, last ? 1.5 : 0.5, [{ hand: follow, p: dg(tonicOf(follow), k), spell: nm(k) }]);
      });
      const who = lhLeads ? t('the LH leads, the RH enters a beat later', 'יד שמאל פותחת, יד ימין נכנסת פעמה אחריה') : t('the RH leads, the LH enters a beat later', 'יד ימין פותחת, יד שמאל נכנסת פעמה אחריה');
      return drillOf(s, n, t(`${head}: a canon, 2 octaves — ${who.en}`, `${headHe}: קנון, 2 אוקטבות — ${who.he}`), 50, { hands: false }, sig);
    }
    case 'kx-ost':
    case 'kx-ost3': {
      // The scale (RH, 2 octaves up and down in 8ths) over a LH ostinato in the key.
      const o = OST[s.kind];
      const ks = upDown(14);
      ks.forEach((k, i) => n.add(i * 0.5, i === ks.length - 1 ? 1.5 : 0.5, [{ hand: 'R', p: dg(R, k), spell: nm(k) }]));
      const L0 = Lt - (Lt >= 42 ? 12 : 0);
      const len = Math.ceil(ks.length / 8) * 8;
      for (let i = 0; i < len; i++) n.add(i * 0.5, 0.5, [{ hand: 'L', p: dg(L0, o.fig[i % o.fig.length]), spell: nm(o.fig[i % o.fig.length]) }]);
      n.add(len * 0.5, 1, [{ hand: 'L', p: L0, spell: nm(0) }]);
      return drillOf(s, n, t(`${head}: the scale ${o.en}`, `${headHe}: הסולם ${o.he}`), 56, { hands: false }, sig);
    }
  }
  throw new Error(`Unknown key exercise: ${s.kind}`);
}

export function genKeyLicks(s: DrillSpec): Drill {
  return s.family === 'k-keyx' ? genKeyX(s) : genLick(s);
}

// ───────────────────────────── catalogues ─────────────────────────────

/** Path difficulty (path.ts KEYS_LEVEL_DIFF): after the harmonised scale's arpeggios (k-sharm 7ths ~1230–1340). */
export const K_KEYLICK_DIFF: Record<string, number> = Object.fromEntries([1100, 1150, 1210, 1270, 1290, 1330, 1370, 1410, 1430, 1470, 1510, 1550, 1580, 1610, 1640, 1650, 1670, 1690, 1720, 1740].map((d, i) => [`k-keylick-${i + 1}`, d]));
export const K_KEYX_DIFF: Record<string, number> = Object.fromEntries([1180, 1220, 1260, 1300, 1340, 1360, 1380].map((d, i) => [`k-keyx-${i + 1}`, d]));

export function keyLickFamily(): FamilyDef {
  const levels: LevelDef[] = [];
  const LV = (en: string, he: string, specs: SpecTemplate[], tempo: [number, number]) => {
    const level = levels.length + 1;
    levels.push({ id: `k-keylick-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: 'major', tempo });
  };
  const it = (lick: Lick, shape: Shape, dir: Dir, option: number, hands: 'R' | 'L' | 'RL' = 'R'): SpecTemplate => ({ family: 'k-keylick' as FamilyId, kind: `kl-${lick}-${shape}-${dir}`, hands, option, ...(option === 7 ? { minor: true } : {}) });
  /** One lick on one shape (owner 2026-11-22: both directions, each hand): RH up, down, LH up, down; major, then harmonic minor. */
  const each = (lick: Lick, shape: Shape): SpecTemplate[] => LICK_SCALES.flatMap((o) => (['R', 'L'] as const).flatMap((h) => [it(lick, shape, 'up', o, h), it(lick, shape, 'down', o, h)]));
  const tempoOf = (shape: Shape): [number, number] => (shape === '7' ? [50, 100] : shape === '1' ? [60, 126] : [56, 112]);
  const SH: [Shape, string, string][] = [['1', 'each scale degree', 'כל דרגה בסולם'], ['3', 'diatonic 3rds', 'טרצות דיאטוניות'], ['t', 'triads', 'משולשים'], ['7', '7th chords', 'ספטאקורדים']];
  for (const [sh, en, he] of SH) LV(`Approach lick 1 (a half step below) into ${en}, up and down, each hand: major, harmonic minor`, `ליק גישה 1 (חצי טון מלמטה) אל ${he}, למעלה ולמטה, כל יד: מז׳ור, מינור הרמוני`, each('1', sh), tempoOf(sh));
  for (const [sh, en, he] of SH) LV(`Lick 2, the enclosure (below–above, above–below) into ${en}, each hand: major, harmonic minor`, `ליק 2, כיתור (מלמטה–מלמעלה, מלמעלה–מלמטה) אל ${he}, כל יד: מז׳ור, מינור הרמוני`, [...each('2ba', sh), ...each('2ab', sh)], tempoOf(sh));
  for (const [sh, en, he] of SH) LV(`Lick 3, the long enclosure into ${en}, each hand: major, harmonic minor`, `ליק 3, הכיתור הארוך אל ${he}, כל יד: מז׳ור, מינור הרמוני`, each('3', sh), tempoOf(sh));
  // hands together in octaves, on the scale degrees, the triads and the 7th chords
  const ht = (licks: Lick[]): SpecTemplate[] => licks.flatMap((l) => (['1', 't', '7'] as Shape[]).flatMap((sh) => [it(l, sh, 'up', 0, 'RL'), it(l, sh, 'down', 0, 'RL'), it(l, sh, 'up', 7, 'RL'), it(l, sh, 'down', 7, 'RL')]));
  LV('Hands together in octaves: lick 1 into the scale degrees, triads and 7th chords', 'ידיים יחד באוקטבות: ליק גישה 1 אל הדרגות, המשולשים והספטאקורדים', ht(['1']), [50, 100]);
  LV('Hands together in octaves: lick 2 into the scale degrees, triads and 7th chords', 'ידיים יחד באוקטבות: ליק 2 אל הדרגות, המשולשים והספטאקורדים', ht(['2ba', '2ab']), [50, 96]);
  LV('Hands together in octaves: lick 3 into the scale degrees, triads and 7th chords', 'ידיים יחד באוקטבות: ליק 3 אל הדרגות, המשולשים והספטאקורדים', ht(['3']), [46, 92]);
  // BUILD-PLAN phase 7 (matrix breadth): the Aeolian inside the major key (from its 6th degree, so the relative major's
  // signature), the modes from the root, melodic minor — appended, so the levels above keep their ids and their items.
  const one = (licks: Lick[], shapes: Shape[], options: number[]): SpecTemplate[] => options.flatMap((o) => licks.flatMap((l) => shapes.flatMap((sh) => [it(l, sh, 'up', o), it(l, sh, 'down', o)])));
  LV('Aeolian (the major key from its 6th degree): approach lick 1 into 3rds, triads and 7th chords, up and down', 'איאולי (הסולם המז׳ורי מהדרגה השישית): ליק גישה 1 אל הטרצות, המשולשים והספטאקורדים, למעלה ולמטה', one(['1'], ['3', 't', '7'], [5]), [56, 112]);
  LV('Aeolian: lick 2, the enclosure (both orders), into triads and 7th chords', 'איאולי: ליק 2, כיתור (בשני הסדרים), אל המשולשים והספטאקורדים', one(['2ba', '2ab'], ['t', '7'], [5]), [52, 104]);
  LV('Aeolian: lick 3, the long enclosure, into triads and 7th chords', 'איאולי: ליק 3, הכיתור הארוך, אל המשולשים והספטאקורדים', one(['3'], ['t', '7'], [5]), [50, 100]);
  LV('The modes from the root: approach lick 1 into the 7th chords (dorian, phrygian, lydian, mixolydian, locrian)', 'המודוסים מהשורש: ליק גישה 1 אל הספטאקורדים (דורי, פריגי, לידי, מיקסולידי, לוקרי)', one(['1'], ['7'], [1, 2, 3, 4, 6]), [50, 100]);
  LV('Melodic minor: licks 1 and 2 into triads and 7th chords', 'מינור מלודי: ליקים 1 ו־2 אל המשולשים והספטאקורדים', one(['1', '2ba', '2ab'], ['t', '7'], [8]), [50, 100]);
  return { id: 'k-keylick', title: t('Approach licks through the scale', 'ליקי גישה לאורך הסולם'), style: 'both', levels };
}

export function keyExtraFamily(): FamilyDef {
  const levels: LevelDef[] = [];
  const LV = (en: string, he: string, specs: SpecTemplate[], tempo: [number, number]) => {
    const level = levels.length + 1;
    levels.push({ id: `k-keyx-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: 'major', tempo });
  };
  const x = (kind: string, hands: SpecTemplate['hands'], option = 0): SpecTemplate => ({ family: 'k-keyx' as FamilyId, kind, hands, option, ...(option % 100 === 7 ? { minor: true } : {}) });
  LV('Broken octaves through the scale', 'אוקטבות שבורות לאורך הסולם', [x('kx-boct', 'R'), x('kx-boct', 'L')], [56, 112]);
  LV('The scale in octave leaps', 'הסולם בקפיצות של אוקטבה', [x('kx-leap', 'R'), x('kx-leap', 'L')], [50, 100]);
  LV('A canon: the second hand enters a beat later', 'קנון: היד השנייה נכנסת פעמה אחרי', [x('kx-canon', 'RL', 0), x('kx-canon', 'RL', 100)], [50, 100]);
  LV('Bass leaps in the key: waltz and stride I–IV–V7–I', 'קפיצות בס בסולם: ואלס וסטרייד I–IV–V7–I', [x('kx-waltz', 'L'), x('kx-stride', 'L')], [60, 120]);
  LV('The scale over a left-hand ostinato', 'הסולם מעל אוסטינטו ביד שמאל', [x('kx-ost', 'RL'), x('kx-ost3', 'RL')], [50, 100]);
  LV('Harmonic minor: broken octaves and octave leaps', 'מינור הרמוני: אוקטבות שבורות וקפיצות של אוקטבה', [x('kx-boct', 'R', 7), x('kx-boct', 'L', 7), x('kx-leap', 'R', 7), x('kx-leap', 'L', 7)], [50, 104]);
  LV('Harmonic minor: the canon, and the scale over an ostinato', 'מינור הרמוני: הקנון, והסולם מעל אוסטינטו', [x('kx-canon', 'RL', 7), x('kx-canon', 'RL', 107), x('kx-ost', 'RL', 7), x('kx-ost3', 'RL', 7)], [50, 96]);
  return { id: 'k-keyx', title: t('More in the key: octaves, leaps, canon, ostinato', 'עוד בסולם: אוקטבות, קפיצות, קנון, אוסטינטו'), style: 'classical', levels };
}
