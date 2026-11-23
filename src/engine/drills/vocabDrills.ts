// Bebop vocabulary as drills (docs/AUDIT-GAPS-2.md High #1, #2, #3, #7, #8, #10; Medium #9): the keys family
// k-vocab, the guitar family g-bebop (the jazz add-on) and the bass family b-bebop (the jazz track). The music is in
// ../bebopVocab.ts; this file turns its lines into drills on each instrument. Every item runs in all 12 keys. Lines
// are graded note for note (approach notes and enclosures are exact), so a new item starts in free time (rubato.ts);
// the time items (click on 2 & 4, the gap click, the click on the "and") stay timed and keep the count-in, the click
// pattern and the now-cue.
//
// NOTE: guitar.ts, bass.ts and generate.ts import this module and it imports theirs: nothing here may call their
// exports at module top level (only inside functions).

import type { Drill, DrillSpec, ExpNote, FamilyId, BassFamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { isVerified } from '../verifiedContent';
/** "3 to ♭9": gated by verifiedContent bh-3-to-b9 (hidden 2026-11-21, owner-confirmed and switched on 2026-11-23). */
const B9 = (): boolean => isVerified('item:v-3b9');
import type { Tuning } from '../fretboard';
import type { GuitarFamilyDef, GuitarLevelDef, GuitarStyle, Ev } from './guitar';
import { finish as gFinish, place } from './guitar';
import { fitStrings } from './guitarJazz';
import { drillOf, alt, type BN } from './bass';
import {
  LEAD_ITEMS, TIME_GAP, TIME_ITEMS, DIGIT_NAMES, cell3b9, compShells, digitalLine, formLine, leadItemLine, leadItemName, makeItMinor, mod12, swingOnRamp, timeLine, tripletLine, type VLine,
} from '../bebopVocab';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const CYC4 = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

/** The kinds of the vocabulary families (shared by keys, guitar and bass). */
export const VOCAB_KINDS = ['v-lead', 'v-3b9', 'v-trip', 'v-minor', 'v-digit', 'v-line', 'v-time'];
export const isVocabKind = (k: string): boolean => VOCAB_KINDS.includes(k);

/**
 * Registers (MIDI): the right hand, the guitar neck (frets 0–15), the bass (frets 0–17). Each spans 32 semitones or
 * more, so a written line up to an octave and a 9th wide always fits by octaves.
 */
const REG = { piano: [53, 86], guitar: [45, 79], bass: [28, 60] } as const;
type Inst = keyof typeof REG;

const keyLabel = (key: number, minor?: boolean): string => (minor ? `${MINOR_NAMES[mod12(key)]}m` : NAMES[mod12(key)]);
const withKey = (n: T2, key: number, minor?: boolean): T2 => t(`${n.en} · ${keyLabel(key, minor)}`, `${n.he} · ${keyLabel(key, minor)}`);

/** The line of a vocabulary item (not the time items' comping), its name (without the key) and its click. */
function vocabLine(s: DrillSpec, inst: Inst): { line: VLine; name: T2; click?: Drill['click']; gap?: [number, number] } {
  const key = mod12(s.key);
  const op = s.option ?? 0;
  const [lo, hi] = REG[inst];
  const seed = `${s.family}:${s.kind}:${key}:${op}`;
  switch (s.kind) {
    case 'v-lead':
      return { line: leadItemLine(key, op, lo, hi), name: leadItemName(LEAD_ITEMS[op % LEAD_ITEMS.length]) };
    case 'v-3b9':
      return { line: cell3b9(key, op, lo, hi), name: op % 2 ? t('3 to ♭9 on the V, minor ii–V–i', '3 עד ♭9 על ה־V, ii–V–i מינורי') : t('3 to ♭9 on the V, the ♭9 falls to the 5th of I', '3 עד ♭9 על ה־V, ה־♭9 יורד לקווינטה של I') };
    case 'v-trip':
      return { line: tripletLine(key, op, lo, hi), name: op % 2 ? t('Triplet rules through ii–V: from the root and the 3rd', 'חוקי הטריולה ב־ii–V: מהשורש ומהטרצה') : t('Triplet rules on the V: a triplet down from the root', 'חוקי הטריולה על ה־V: טריולה יורדת מהשורש') };
    case 'v-minor':
      return { line: makeItMinor(key, op, lo, hi), name: op % 2 ? t('Make it minor: the m7♭5 on the V’s 3rd', 'להפוך למינור: m7♭5 על הטרצה של ה־V') : t('Make it minor: the m6 a 5th above the V', 'להפוך למינור: m6 קווינטה מעל ה־V') };
    case 'v-digit': {
      const nm = DIGIT_NAMES[op % DIGIT_NAMES.length];
      return { line: digitalLine(key, op, lo, hi), name: t(`Digital pattern ${nm.en} through ii–V–I–VI7`, `תבנית דיגיטלית ${nm.he} לאורך ii–V–I–VI7`) };
    }
    case 'v-line': {
      const l = formLine(key, op, lo, hi, seed);
      return { line: l, name: t(`Bebop line over ${l.name.en}`, `קו ביבופ על ${l.name.he}`) };
    }
    case 'v-time': {
      const it = TIME_ITEMS[op % TIME_ITEMS.length];
      const line = it.what === 'scale' || it.what === 'arp' ? swingOnRamp(key, it.what === 'arp' ? 1 : 0, lo, hi) : timeLine(key, lo, hi, seed);
      return { line, name: it.name, click: it.click, ...(it.click === 'gap' ? { gap: TIME_GAP } : {}) };
    }
  }
  throw new Error(`Unknown vocabulary kind ${s.kind}`);
}
const isComp = (s: DrillSpec): boolean => s.kind === 'v-time' && TIME_ITEMS[(s.option ?? 0) % TIME_ITEMS.length].what === 'comp';
const timeOf = (s: DrillSpec) => TIME_ITEMS[(s.option ?? 0) % TIME_ITEMS.length];
function withClick(d: Drill, click?: Drill['click'], gap?: [number, number]): Drill {
  if (click && click !== 'all') d.click = click;
  if (gap) d.gap = gap;
  return d;
}

// ───────────────────────────── keys: k-vocab ─────────────────────────────

export function genKeysVocab(s: DrillSpec): Drill {
  const key = mod12(s.key);
  const notes: ExpNote[] = [];
  let title: T2;
  let chart: string[];
  let minor = false;
  let click: Drill['click'];
  let gap: [number, number] | undefined;
  let lines = true;
  if (isComp(s)) {
    // LH shells in the Charleston rhythm (root, 7th, 3rd an octave up).
    let cid = 0;
    for (const c of compShells(key, 40, (s.option ?? 0) - 5)) {
      cid++;
      for (const p of c.v) notes.push({ pitch: p, beat: r6(c.beat), dur: r6(c.dur), hand: 'L', chordId: cid, chordTone: true });
    }
    const it = timeOf(s);
    title = withKey(it.name, key);
    chart = timeLine(key, REG.piano[0], REG.piano[1], 'chart').chart;
    click = it.click;
    gap = it.click === 'gap' ? TIME_GAP : undefined;
    lines = false;
  } else {
    const v = vocabLine(s, 'piano');
    for (const n of v.line.notes) notes.push({ pitch: n.p, beat: r6(n.beat), dur: r6(n.dur), hand: 'R', chordTone: n.ct });
    minor = !!v.line.minor;
    title = withKey(v.name, key, minor);
    chart = v.line.chart;
    click = v.click;
    gap = v.gap;
  }
  notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const d: Drill = {
    spec: { ...s, key },
    itemId: itemIdOf({ ...s, key }),
    title,
    notes,
    beats: r6(Math.max(...notes.map((n) => n.beat + n.dur))),
    meter: 4,
    keySig: SIG[minor ? mod12(key + 3) : key],
    goal: { evenness: lines, hands: false, ...(lines ? { chordTonesOnBeats: true } : {}) },
    startBpm: s.tempo ?? 70,
    chart,
  };
  return withClick(d, click, gap);
}

/** The keys family (jazz emphasis): from the swing on-ramp (~980) to the click that moves (~1610). */
export function keysVocabFamily(): FamilyDef {
  const v = (kind: string, option: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: 'k-vocab', kind, hands: 'R', swing: true, option, ...o });
  const lead = (ops: number[]) => ops.map((o) => v('v-lead', o));
  const JT = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `k-vocab-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: CYC4, tempo });
  return {
    id: 'k-vocab',
    title: t('Bebop vocabulary', 'שפת הביבופ'),
    style: 'jazz',
    levels: [
      JT(1, 'Swing 8ths with the click on 2 and 4', 'שמיניות סווינג עם קליק על 2 ו-4', [v('v-time', 0), v('v-time', 1)], [70, 140]),
      JT(2, 'Chromatic approach notes', 'צלילי גישה כרומטיים', lead([0, 1, 2, 3]), [60, 120]),
      JT(3, 'Double chromatic and the dominant approach', 'גישה כרומטית כפולה וגישה דומיננטית', lead([4, 5, 6, 7]), [60, 120]),
      JT(4, 'Enclosures: half step above and below', 'כיתורים: חצי טון מעל ומתחת', lead([8, 9, 10]), [60, 130]),
      JT(5, 'Enclosures: scale step above, double chromatic', 'כיתורים: צעד בסולם מעל, כרומטי כפול', lead([11, 12, 13, 14, 15]), [60, 130]),
      JT(6, 'The bebop enclosure and the delayed resolution', 'כיתור הביבופ והפתרון המושהה', lead([16, 17, 18]), [60, 130]),
      JT(7, 'Enclose every chord tone through ii–V–I', 'כיתור לכל צליל אקורד לאורך ii–V–I', lead([19, 20, 21, 22, 23]), [70, 140]),
      JT(8, B9() ? 'Barry Harris: 3 to ♭9 and the triplet rules' : 'Barry Harris: the triplet rules', B9() ? 'בארי האריס: 3 עד ♭9 וחוקי הטריולה' : 'בארי האריס: חוקי הטריולה', [v('v-3b9', 0), v('v-3b9', 1), v('v-trip', 0), v('v-trip', 1)], [70, 140]),
      JT(9, 'Barry Harris: make it minor', 'בארי האריס: להפוך למינור', [v('v-minor', 0), v('v-minor', 1)], [70, 140]),
      JT(10, 'Time: click on 2 and 4, the gap, the "and"', 'זמן: קליק על 2 ו-4, החור, ה"וְ"', [2, 3, 4, 5, 6, 7].map((o) => v('v-time', o, o >= 5 ? { hands: 'L' } : {})), [90, 160]),
    ],
  };
}

// ───────────────────────────── guitar: g-bebop ─────────────────────────────

/** A line on the neck, in one position around the lowest note where it fits (strings 6 → 1). */
function onNeck(tu: Tuning, ps: number[]): { s: number; f: number }[] {
  const lo = Math.min(...ps);
  const c = Math.max(1, Math.min(12, lo - tu.open[tu.open.length - 1]));
  const strs = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  return ps.map((m) => place(tu, m, strs, Math.max(0, c - 1), c + 4) ?? place(tu, m, strs, Math.max(0, c - 3), c + 6) ?? place(tu, m, strs, 0, 17)!);
}

export function genGuitarVocab(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  let evs: Ev[];
  let title: T2;
  let chart: string[];
  let click: Drill['click'];
  let gap: [number, number] | undefined;
  let lines = true;
  let minor = false;
  if (isComp(s)) {
    // Shells (root, 7th, 3rd) on strings 6-4-3 / 5-4-3, Charleston rhythm, the grip nearest the last.
    let near = 5;
    evs = compShells(key, 40, (s.option ?? 0) - 5).map((c) => {
      const v = fitStrings(tu, c.v, near, [6, 5, 4, 3], 4) ?? fitStrings(tu, c.v, near, [6, 5, 4, 3, 2], 5)!;
      near = Math.min(...v.map((p) => p.f).filter((f) => f > 0).concat([near]));
      return { beat: c.beat, dur: c.dur, notes: v.map((p) => ({ ...p, stroke: 'D' as const, tech: 'strum-down' as const, ct: true })) };
    });
    const it = timeOf(s);
    title = withKey(it.name, key);
    chart = timeLine(key, REG.guitar[0], REG.guitar[1], 'chart').chart;
    click = it.click;
    gap = it.click === 'gap' ? TIME_GAP : undefined;
    lines = false;
  } else {
    const v = vocabLine(s, 'guitar');
    const pos = onNeck(tu, v.line.notes.map((n) => n.p));
    evs = v.line.notes.map((n, i) => ({ beat: n.beat, dur: n.dur, notes: [{ ...pos[i], stroke: i % 2 === 0 ? ('D' as const) : ('U' as const), ct: n.ct }] }));
    minor = !!v.line.minor;
    title = withKey(v.name, key, minor);
    chart = v.line.chart;
    click = v.click;
    gap = v.gap;
  }
  const d = gFinish(s, tu, evs, { title, bpm: s.tempo ?? 70, evenness: lines, ...(lines ? { goal: { chordTonesOnBeats: true } } : {}), keySig: SIG[minor ? mod12(key + 3) : key] });
  d.chart = chart;
  return withClick(d, click, gap);
}

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The guitar family (the jazz add-on): grades 3 (the swing on-ramp) to 8. */
export function guitarVocabFamily(LT: LTFn, fam: GFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number): SpecTemplate => ({ family: 'g-bebop', kind, hands: 'R', instrument: 'guitar', swing: true, option });
  const vs = (kind: string, ops: number[]) => ops.map((o) => v(kind, o));
  const SW = 'swing 8ths';
  return fam('g-bebop', 'Bebop on guitar', 'ביבופ בגיטרה', 'jazz', ['jazz'], [
    LT('g-bebop', 1, 'Swing 8ths with the click on 2 and 4', 'שמיניות סווינג עם קליק על 2 ו-4', vs('v-time', [0, 1]), CYC4, [70, 140], SW, 3),
    LT('g-bebop', 2, 'Chromatic approach notes', 'צלילי גישה כרומטיים', vs('v-lead', [0, 1, 2, 3, 4, 5, 6, 7]), CYC4, [60, 120], SW, 5),
    LT('g-bebop', 3, 'Enclosures: chromatic, scale step, double chromatic', 'כיתורים: כרומטי, צעד בסולם, כרומטי כפול', vs('v-lead', [8, 9, 11, 12, 14, 15]), CYC4, [60, 130], SW, 5),
    LT('g-bebop', 4, 'The bebop enclosure and the delayed resolution', 'כיתור הביבופ והפתרון המושהה', vs('v-lead', [16, 17, 18]), CYC4, [60, 130], SW, 6),
    LT('g-bebop', 5, 'Enclose every chord tone through ii–V–I', 'כיתור לכל צליל אקורד לאורך ii–V–I', vs('v-lead', [19, 20, 21, 22, 23]), CYC4, [70, 140], SW, 6),
    LT('g-bebop', 6, 'Digital patterns through the changes', 'תבניות דיגיטליות לאורך המהלך', vs('v-digit', [0, 1, 2, 3]), CYC4, [70, 150], SW, 6),
    LT('g-bebop', 7, 'Lines over minor ii–V–i and altered dominants', 'קווים על ii–V–i מינורי ודומיננט אלטרד', vs('v-line', [0, 1]), CYC4, [80, 150], SW, 7),
    LT('g-bebop', 8, 'Lines over the blues and turnarounds', 'קווים על בלוז וטרנאראונדים', vs('v-line', [2, 5, 6, 7]), CYC4, [80, 160], SW, 7),
    LT('g-bebop', 9, 'Lines over rhythm changes: A section and bridge', 'קווים על ריתם צ׳יינג׳ס: חלק A והגשר', vs('v-line', [3, 4]), CYC4, [90, 170], SW, 8),
    LT('g-bebop', 10, B9() ? 'Barry Harris: 3 to ♭9 and the triplet rules' : 'Barry Harris: the triplet rules', B9() ? 'בארי האריס: 3 עד ♭9 וחוקי הטריולה' : 'בארי האריס: חוקי הטריולה', [...vs('v-3b9', [0, 1]), ...vs('v-trip', [0, 1])], CYC4, [70, 140], SW, 8),
    LT('g-bebop', 11, 'Barry Harris: make it minor', 'בארי האריס: להפוך למינור', vs('v-minor', [0, 1]), CYC4, [70, 140], SW, 8),
    LT('g-bebop', 12, 'Time: click on 2 and 4, the gap, the "and"', 'זמן: קליק על 2 ו-4, החור, ה"וְ"', vs('v-time', [2, 3, 4, 5, 6, 7]), CYC4, [90, 160], 'swing 8ths / Charleston', 8),
  ]);
}

// ───────────────────────────── bass: b-bebop ─────────────────────────────

export function genBassVocab(s: DrillSpec, tu: Tuning): Drill {
  const key = mod12(s.key);
  const v = vocabLine(s, 'bass');
  const line: BN[] = v.line.notes.map((n) => ({ b: n.beat, d: n.dur, p: n.p, ct: n.ct }));
  const minor = !!v.line.minor;
  return drillOf({ ...s, key }, tu, alt(line), {
    en: v.name.en,
    he: v.name.he,
    chart: v.line.chart,
    evenness: true,
    goal: { chordTonesOnBeats: true },
    keySig: SIG[minor ? mod12(key + 3) : key],
    ...(minor ? { keyName: keyLabel(key, true) } : {}),
  });
}

type BLFn = (fam: BassFamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, genres?: GuitarStyle[]) => GuitarLevelDef;
type BFamFn = (id: BassFamilyId, en: string, he: string, levels: GuitarLevelDef[]) => GuitarFamilyDef;
/** The bass family (jazz track): enclosures, digital patterns, bebop lines over forms, Barry Harris lines. */
export function bassVocabFamily(L: BLFn, fam: BFamFn): GuitarFamilyDef {
  const v = (kind: string, option: number): SpecTemplate => ({ family: 'b-bebop', kind, hands: 'R', instrument: 'bass', swing: true, option });
  const vs = (kind: string, ops: number[]) => ops.map((o) => v(kind, o));
  const SW = 'swung 8ths';
  return fam('b-bebop', 'Bebop on bass', 'ביבופ בבס', [
    L('b-bebop', 1, 'Enclosures: chromatic, scale step, double chromatic', 'כיתורים: כרומטי, צעד בסולם, כרומטי כפול', vs('v-lead', [8, 9, 11, 12, 14, 15]), 'major', [60, 130], SW),
    L('b-bebop', 2, 'The bebop enclosure, the delayed resolution, every chord tone', 'כיתור הביבופ, הפתרון המושהה, כל צליל אקורד', vs('v-lead', [16, 17, 18, 19, 20, 21, 22, 23]), 'major', [60, 130], SW),
    L('b-bebop', 3, 'Digital patterns through the changes', 'תבניות דיגיטליות לאורך המהלך', vs('v-digit', [0, 1, 2, 3]), 'major', [70, 150], SW),
    L('b-bebop', 4, 'Lines over minor ii–V–i and altered dominants', 'קווים על ii–V–i מינורי ודומיננט אלטרד', vs('v-line', [0, 1]), 'major', [80, 150], SW),
    // The tritone turnaround stays on the guitar: the bass charts spell sharp keys with sharps only.
    L('b-bebop', 5, 'Lines over the blues and turnarounds', 'קווים על בלוז וטרנאראונדים', vs('v-line', [2, 5, 6]), 'major', [80, 160], SW),
    L('b-bebop', 6, 'Lines over rhythm changes: A section and bridge', 'קווים על ריתם צ׳יינג׳ס: חלק A והגשר', vs('v-line', [3, 4]), 'major', [90, 170], SW),
    L('b-bebop', 7, B9() ? 'Barry Harris: 3 to ♭9, triplets, make it minor' : 'Barry Harris: triplets, make it minor', B9() ? 'בארי האריס: 3 עד ♭9, טריולות, להפוך למינור' : 'בארי האריס: טריולות, להפוך למינור', [...vs('v-3b9', [0, 1]), ...vs('v-trip', [0, 1]), ...vs('v-minor', [0, 1])], 'major', [70, 140], SW),
  ]);
}
