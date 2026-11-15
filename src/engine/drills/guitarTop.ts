// STAGE C (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md §2, GA-4): the guitar above grade 8. The path's grade formula
// gets diploma grades 9–11 (path.ts guitarPathDifficulty: ≈1590–1670, 1690–1770, 1790–1870, under PATH_CAP), the
// genuinely advanced levels move up to them (GUITAR_GRADE_UP), and five new families fill the empty top band:
//
//  g-speed    speed technique at concert tempo: 3nps picking and legato in 16ths, sweeps, tapping, skips, tremolo
//  g-fusion   fusion legato and outside lines: four notes a string, the half-step side-slip, the altered triad pair,
//             in-out-in phrases over a vamp
//  g-cmarr    chord-melody arranging (jazz): melody over a walking bass, a reharmonised chorus, intro + chorus + tag,
//             two choruses, a rubato ballad chorus
//  g-solojazz solo jazz guitar (jazz): a walking bass with guide tones / shells above it, through ii–V–I, the blues,
//             rhythm changes and a whole head with its melody on top
//  g-hlfast   Barry Harris lines at bebop tempo (jazz): the g-harrisline material at ♩200+ and over whole outlines
//
// Every key-relative item runs in all 12 keys; pitched items start in free time (rubato.ts) and then climb the tempo
// ladder. Levels that reuse an existing generator name it in their kind ("g-picking>3nps"); the drill keeps this
// family's id and item id. Pure. Imports guitar.ts helpers only inside functions (guitar.ts imports this module).

// generate.ts first: it loads headDrills in the order the soloPianoDrills tables expect (a load-order cycle).
import './generate';
import type { Drill, DrillSpec, FamilyId } from './types';
import { isVerified } from '../verifiedContent';
/** A row's two titles naming only what is on show (items hidden until verified: verifiedContent.ts). */
const pickT = (shown: boolean, full: [string, string], short: [string, string]): [string, string] => (shown ? full : short);
import type { LevelDef, SpecTemplate } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import { finish, generateGuitar, guitarItemId, NAMES, place, SIG, windowScale, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type GuitarStyle, type T2 } from './guitar';
import { chartFor, chordMelodyEvs, decodeHead, HEAD_KEYS, SERVED } from './headDrills';
import { chordAt, headIn, type HNote } from '../heads';
import { parseChart, type ChartChordEv } from '../charts';
import { keyLabel } from '../stdKey';

// Local helpers: guitar.ts imports this module, so its exports are not ready at this module's top level.
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** The new guitar families (FamilyId members). */
export const GUITAR_TOP_FAMILIES = ['g-speed', 'g-fusion', 'g-cmarr', 'g-solojazz', 'g-hlfast'] as const;
export type GuitarTopFamily = (typeof GUITAR_TOP_FAMILIES)[number];
export const isGuitarTopFamily = (f: string): f is GuitarTopFamily => (GUITAR_TOP_FAMILIES as readonly string[]).includes(f);

/**
 * GA-4: existing levels that belong above grade 8 (the diploma band). Grade 9: rule mixes and comp-and-solo, trading
 * with the band, rhythm-changes lines, triad pairs in inversions, the pivot with an enclosure, the triplet rules.
 * Grade 10: the eight expressions / elevator / substitution comping (g-harris 11–13), pentatonic superimposition, the
 * Coltrane sub in context, the whole chorus of chord-melody, compose a line, sweeps of 7ths with a tap, tapped
 * sequences, 8 bars by ear over a form, borrowing on every string set, the solo-guitar texture. Grade 11: Giant Steps,
 * the Coltrane reharm of a head with its melody, and writing and playing a whole solo chorus.
 */
export const GUITAR_GRADE_UP: Record<string, number> = {
  'g-solo-8': 9, 'g-solo-9': 9, 'g-impro-7': 9, 'g-theory-5': 9, 'g-harris-10': 9, 'g-harrisline-7': 9,
  'g-harris-11': 10, 'g-harris-12': 10, 'g-harris-13': 10, 'g-theory-6': 10, 'g-ctx-8': 10, 'g-cmel-6': 10, 'g-harrisline-9': 10,
  'g-picking-8': 10, 'g-legato-8': 10, 'g-phrase-8': 10, 'g-harm-13': 10, 'g-jazz-12': 10,
  'g-tune-9': 10,
  'g-theory-3': 11, 'g-solo-10': 11,
};

/** Teaching rank inside a grade (path.ts GUITAR_RANK): the hands first, then the comping textures, the lines last. */
export const GUITAR_TOP_RANK: Record<GuitarTopFamily, number> = { 'g-speed': 3, 'g-solojazz': 4, 'g-fusion': 6, 'g-hlfast': 6, 'g-cmarr': 7 };

/** The grade a guitar level ends up at (the table, else its own). */
export const topGrade = (id: string, grade: number): number => GUITAR_GRADE_UP[id] ?? grade;

const CYC4 = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
/** Guitar-friendly tonics first, then the rest of the twelve. */
const G12 = [7, 9, 4, 2, 0, 5, 10, 3, 8, 1, 6, 11];
const opt = (idx: number, phrase = 0): number => idx * 16 + phrase;

type LTFn = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: LevelDef['keys'], tempo: [number, number], sub: string, grade: number) => GuitarLevelDef;
type GFamFn = (id: FamilyId, en: string, he: string, style: 'classical' | 'jazz', genres: GuitarStyle[], levels: GuitarLevelDef[]) => GuitarFamilyDef;

const sp = (family: GuitarTopFamily, kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: family as FamilyId, kind, hands: 'R', instrument: 'guitar', ...o });

/** One row of a family: [en, he, items, keys, tempo, sub, grade]. */
type Row = [string, string, SpecTemplate[], LevelDef['keys'], [number, number], string, number];

export const SPEED_ROWS = (): Row[] => {
  const S = (kind: string, o: Partial<SpecTemplate> = {}) => sp('g-speed', kind, o);
  return [
    ['3nps scales in 16ths at speed', 'סולמות 3 צלילים במיתר בשש-עשריות במהירות', [S('g-picking>3nps', { option: 0, perBeat: 4, stretch: true }), S('g-picking>3nps-economy', { option: 1, perBeat: 4, stretch: true }), S('g-picking>3nps', { option: 4, perBeat: 4, stretch: true })], G12, [96, 144], '16ths', 9],
    ['3nps legato in 16ths at speed', 'לגאטו 3 צלילים במיתר בשש-עשריות במהירות', [0, 1, 4].map((o) => S('g-legato>3nps-legato', { option: o, perBeat: 4, stretch: true })), G12, [96, 144], '16ths', 10],
    ['Sweeps at speed: 3 and 5 strings, major and minor', 'סוויפ במהירות: 3 ו-5 מיתרים, מז׳ור ומינור', [S('g-picking>sweep5'), S('g-picking>sweep5', { minor: true }), S('g-picking>sweep3'), S('g-picking>sweep3', { minor: true })], G12, [80, 132], 'triplets / 16ths', 10],
    ['Tapped arpeggios and sweeps at concert tempo', 'ארפג׳ים בטאפינג וסוויפ בטמפו של הופעה', [S('g-legato>tap'), S('g-legato>tap', { minor: true }), S('g-picking>sweep5', { minor: true, option: 1 })], G12, [100, 152], 'triplets / 16ths', 11],
    ['String skipping and tremolo at speed', 'דילוג מיתרים וטרמולו במהירות', [S('g-picking>skip'), S('g-picking>skip', { option: 1 }), S('g-picking>tremolo', { option: 1 }), S('g-picking>tremolo', { option: 2 })], G12, [110, 168], '16ths', 11],
  ];
};

export const FUSION_ROWS = (): Row[] => {
  const S = (kind: string, o: Partial<SpecTemplate> = {}) => sp('g-fusion', kind, o);
  return [
    ['Fusion legato at tempo: side-slips and wide intervals', 'לגאטו פיוז׳ן בטמפו: החלקות ומרווחים רחבים', [S('g-prog>fusion', { option: 0 }), S('g-prog>fusion', { option: 3 })], G12, [90, 132], '16ths', 9],
    ['Four notes a string: stretch legato', 'ארבעה צלילים במיתר: לגאטו במתיחה', [S('fu-4nps', { option: 0, stretch: true }), S('fu-4nps', { option: 1, stretch: true })], G12, [70, 120], '16ths', 10],
    ['Outside by a half step: in, out, in', 'בחוץ בחצי טון: פנימה, החוצה, פנימה', [S('fu-slip', { option: 0 }), S('fu-slip', { option: 1 })], G12, [80, 126], '16ths', 10],
    ['The altered triad pair over V7, resolving to I', 'זוג המשולשים האלטרד מעל V7, עם פתרון ל-I', [S('fu-pair', { option: 0 }), S('fu-pair', { option: 1 })], G12, [80, 132], '8th triplets / 16ths', 11],
    ['Outside lines over a vamp, at tempo', 'קווים בחוץ מעל וואמפ, בטמפו', [S('fu-vamp', { option: 0 }), S('fu-vamp', { option: 1 })], G12, [90, 138], '16ths', 11],
  ];
};

export const CMARR_ROWS = (): Row[] => {
  const S = (kind: string) => SERVED.map((idx) => sp('g-cmarr', kind, { option: opt(idx) }));
  return [
    ['The melody over the bass line, a whole chorus', 'המנגינה מעל קו הבס, פזמון שלם', S('ar-walk'), HEAD_KEYS, [56, 104], 'melody + walking quarters', 9],
    ['A reharmonised chorus in drop 2', 'פזמון בהרמון מחדש בדרופ 2', S('ar-reharm'), HEAD_KEYS, [56, 100], 'chord-melody', 10],
    ['Intro, chorus and a tag ending', 'פתיחה, פזמון וסיום בתג', S('ar-intro'), HEAD_KEYS, [56, 100], 'chord-melody', 10],
    ['Two choruses: as written, then reharmonised', 'שני פזמונים: כפי שנכתב, ואז בהרמון מחדש', S('ar-two'), HEAD_KEYS, [56, 100], 'chord-melody', 11],
    ['A ballad chorus, rubato', 'פזמון בלדה, רובאטו', S('ar-ballad'), HEAD_KEYS, [56, 56], 'free time', 11],
  ];
};

export const SOLOJAZZ_ROWS = (): Row[] => {
  const S = (kind: string, o: Partial<SpecTemplate> = {}) => sp('g-solojazz', kind, o);
  return [
    ['Walking bass and guide tones through ii–V–I, at tempo', 'בס מהלך וצלילים מנחים ב-ii–V–I, בטמפו', [S('g-jazz>solo-texture', { option: 0, swing: true }), S('g-jazz>solo-texture', { option: 1, swing: true })], CYC4, [100, 160], 'quarters + 8ths', 9],
    ['Walking bass with shells on the blues', 'בס מהלך עם קונכיות על הבלוז', [S('sj-blues', { option: 0, swing: true }), S('sj-blues', { option: 1, swing: true })], CYC4, [90, 150], 'quarters + 8ths', 10],
    ['Walking bass with shells on rhythm changes', 'בס מהלך עם קונכיות על ריתם צ׳יינג׳ס', [S('sj-rhythm', { option: 0, swing: true }), S('sj-rhythm', { option: 1, swing: true })], CYC4, [100, 170], 'quarters + 8ths', 10],
    ['A whole head solo: two choruses, guide tones then drop 2', 'שיר שלם סולו: שני פזמונים, צלילים מנחים ואז דרופ 2', SERVED.map((idx) => S('sj-head', { option: opt(idx) })), HEAD_KEYS, [56, 100], 'three voices', 11],
  ];
};

export const HLFAST_ROWS = (): Row[] => {
  const S = (kind: string, option: number) => sp('g-hlfast', `g-harrisline>${kind}`, { option });
  return [
    [...pickT(isVerified('item:hl-chrom'), ["Barry's chromatic scales and the outlines at bebop tempo", 'הסולמות הכרומטיים של בארי והמתארים בטמפו ביבופ'], ['The outlines at bebop tempo', 'המתארים בטמפו ביבופ']), [S('hl-chrom', 0), S('hl-chrom', 1), S('hl-chrom', 2), S('hl-outline', 0), S('hl-outline', 1)], CYC4, [140, 220], '8ths', 9],
    [...pickT(isVerified('item:hl-5432:0'), ['The rules from every degree and 5-4-3-2, at tempo', 'החוקים מכל דרגה ו-5-4-3-2, בטמפו'], ['The rules from every degree, at tempo', 'החוקים מכל דרגה, בטמפו']), [S('hl-rules', 4), S('hl-rules', 9), S('hl-rules', 13), S('hl-5432', 0), S('hl-5432', 2), S('hl-lick', 0)], CYC4, [150, 230], '8ths', 10],
    [...pickT(isVerified('item:hl-sevendown') && isVerified('item:hl-3b9'), ['Seven down, 3 to ♭9 and the triplet rules, at tempo', 'שבע למטה, 3 עד ♭9 וחוקי הטריולה, בטמפו'], ['The triplet rules, at tempo', 'חוקי הטריולה, בטמפו']), [S('hl-sevendown', 0), S('hl-sevendown', 1), S('hl-3b9', 1), S('hl-triplet', 1), S('hl-triplet', 3)], CYC4, [150, 230], '8ths and triplets', 10],
    ['Lines through whole outlines at tempo', 'קווים לאורך מתארים שלמים בטמפו', [2, 3, 4, 5].map((o) => S('hl-outline', o)), CYC4, [160, 240], '8ths', 11],
    ['Compose a line at bebop tempo', 'לחבר קו בטמפו ביבופ', [S('hl-compose', 0), S('hl-compose', 1), S('hl-compose', 2)], CYC4, [130, 210], 'free 8ths', 11],
  ];
};

const TITLES: Record<GuitarTopFamily, T2> = {
  'g-speed': t('Speed technique', 'טכניקת מהירות'),
  'g-fusion': t('Fusion and outside', 'פיוז׳ן ובחוץ'),
  'g-cmarr': t('Chord-melody arranging', 'עיבוד אקורד-מלודיה'),
  'g-solojazz': t('Solo jazz guitar', 'גיטרת ג׳אז סולו'),
  'g-hlfast': t('Harris lines at tempo', 'קווי האריס בטמפו'),
};
export const guitarTopTitle = (f: GuitarTopFamily): T2 => TITLES[f];

const ROWS: Record<GuitarTopFamily, () => Row[]> = { 'g-speed': SPEED_ROWS, 'g-fusion': FUSION_ROWS, 'g-cmarr': CMARR_ROWS, 'g-solojazz': SOLOJAZZ_ROWS, 'g-hlfast': HLFAST_ROWS };
/** Jazz add-on families (the rest are core). */
const JAZZ: GuitarTopFamily[] = ['g-cmarr', 'g-solojazz', 'g-hlfast'];

/** The five families, for guitarCatalog (built with its LT and fam). */
export function guitarTopFamilies(LT: LTFn, fam: GFamFn): GuitarFamilyDef[] {
  return GUITAR_TOP_FAMILIES.map((id) => {
    const levels = ROWS[id]().map(([en, he, specs, keys, tempo, sub, grade], i) => LT(id, i + 1, en, he, specs, keys, tempo, sub, grade));
    const f = fam(id as FamilyId, TITLES[id].en, TITLES[id].he, JAZZ.includes(id) ? 'jazz' : 'classical', JAZZ.includes(id) ? ['jazz'] : id === 'g-speed' ? ['rock', 'metal', 'all'] : ['all'], levels);
    return JAZZ.includes(id) ? { ...f, addOn: 'jazz' as const } : f;
  });
}

// ───────────────────────────── generation ─────────────────────────────

/** A drill of a new family (null for every other family). */
export function generateGuitarTop(s: DrillSpec, tu: Tuning): Drill | null {
  if (!isGuitarTopFamily(s.family)) return null;
  const k = s.kind.indexOf('>');
  if (k > 0) {
    const d = generateGuitar({ ...s, family: s.kind.slice(0, k) as FamilyId, kind: s.kind.slice(k + 1) });
    return { ...d, spec: { ...d.spec, family: s.family, kind: s.kind }, itemId: guitarItemId(s) };
  }
  switch (s.kind) {
    case 'fu-4nps':
      return fourNps(s, tu);
    case 'fu-slip':
      return slip(s, tu);
    case 'fu-pair':
      return triadPair(s, tu);
    case 'fu-vamp':
      return { ...slip(s, tu, true), drums: { groove: 'funk-1' } };
    case 'sj-blues':
    case 'sj-rhythm':
      return soloForm(s, tu);
    case 'sj-head':
    case 'ar-walk':
    case 'ar-reharm':
    case 'ar-intro':
    case 'ar-two':
    case 'ar-ballad':
      return arrange(s, tu);
    default:
      throw new Error(`Unknown ${s.family} kind ${s.kind}`);
  }
}

const tt = (en: string, he: string, key: number): T2 => t(`${en} · ${NAMES[mod(key, 12)]}`, `${he} · ${NAMES[mod(key, 12)]}`);
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const PENTA_MINOR = [0, 3, 5, 7, 10];
/** The lowest fret (≥ 1) of the key's tonic on the 6th string, kept low on the neck. */
const pos6 = (tu: Tuning, key: number): number => {
  const f = mod(key - tu.open[5], 12);
  return f < 1 ? 12 : f;
};
const sixteenths = (gns: GN[], last = 1): Ev[] => gns.map((g, i) => ({ beat: i / 4, dur: i === gns.length - 1 ? last : 0.25, notes: [{ ...g, stroke: g.stroke ?? (i % 2 ? 'U' : 'D') }] }));

/** Four notes a string (stretch legato): op 0 the major scale up and down strings 6 → 1, op 1 the Dorian from the 2nd. */
function fourNps(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  // op 1: the melodic minor (jazz minor) — a different set of notes from the major of the same key.
  const ints = s.option === 1 ? [0, 2, 3, 5, 7, 9, 11] : MAJ;
  const tonic = key;
  // From the lowest scale note at frets 1–3 of the 6th string, so the 24 notes stay under the 20th fret.
  let start = noteAt(tu, 6, 1);
  while (!ints.includes(mod(start - tonic, 12))) start++;
  const scale: number[] = [];
  for (let m = start; scale.length < 24; m++) if (ints.includes(mod(m - tonic, 12))) scale.push(m);
  const up: GN[] = [];
  for (let str = 6; str >= 1; str--) {
    const grp = scale.slice((6 - str) * 4, (6 - str) * 4 + 4);
    grp.forEach((m, j) => {
      const f = m - tu.open[str - 1];
      up.push({ s: str, f, tech: j === 0 ? 'pick' : 'hammer', finger: Math.min(4, j + 1) });
    });
  }
  const down = [...up].reverse().map((g, i, arr) => ({ ...g, tech: i === 0 || arr[i - 1].s !== g.s ? ('pick' as const) : ('pull' as const) }));
  const gns = [...up, ...down.slice(1)];
  const title = s.option === 1 ? tt('Four notes a string: melodic minor, hammer up, pull down', 'ארבעה צלילים במיתר: מינור מלודי, הקשות למעלה, משיכות למטה', key) : tt('Four notes a string: major, hammer up, pull down', 'ארבעה צלילים במיתר: מז׳ור, הקשות למעלה, משיכות למטה', key);
  return finish(s, tu, sixteenths(gns), { title, bpm: 70 });
}

/**
 * The half-step side-slip: a two-bar in-out-in phrase — the minor pentatonic in position, the same shape a half step up
 * (op 0) or down (op 1), then back home and resolve to the root. With the vamp (fu-vamp) the phrase runs twice, the
 * second time slipping the other way, over a funk groove.
 */
function slip(s: DrillSpec, tu: Tuning, vamp = false): Drill {
  const key = mod(s.key, 12);
  const lo = pos6(tu, key) < 3 ? pos6(tu, key) + 12 : pos6(tu, key);
  const box = windowScale(tu, key, PENTA_MINOR, lo, lo + 3, [4, 3, 2, 1]).slice(0, 8);
  const dir = s.option === 1 ? -1 : 1;
  const phrase = (d: number): GN[] => {
    const out = box.map((x) => ({ ...x, f: x.f + d }));
    return [...box, ...out, ...[...out].reverse(), ...[...box].reverse()];
  };
  const gns = vamp ? [...phrase(dir), ...phrase(-dir)] : phrase(dir);
  const root = place(tu, noteAt(tu, box[0].s, box[0].f), [4, 3], lo - 1, lo + 4) ?? box[0];
  const evs = sixteenths(gns, 0.25);
  evs.push({ beat: gns.length / 4, dur: 1, notes: [{ ...root, stroke: 'D', ct: true }] });
  const what = dir > 0 ? t('a half step up', 'חצי טון למעלה') : t('a half step down', 'חצי טון למטה');
  const title = vamp ? tt(`Outside over the vamp: up, then down, back home`, 'בחוץ מעל הוואמפ: למעלה, ואז למטה, וחזרה הביתה', key) : tt(`Side-slip ${what.en}: in, out, in`, `החלקה ${what.he}: פנימה, החוצה, פנימה`, key);
  return finish(s, tu, evs, { title, bpm: 80, goal: { chordTonesOnBeats: false } });
}

/**
 * The altered triad pair: over V7 the major triads on its ♭5 and ♭6 (the IV and V of the melodic minor a half step above
 * V — ♯11, 7, ♭9 and ♭13, R, ♯9), alternated in inversions, then resolved to the 3rd of I. op 0 in 8th triplets, op 1 in
 * 16th groups of 3 (the over-the-bar-line feel).
 */
function triadPair(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const dom = mod(key + 7, 12);
  const a = mod(dom + 6, 12);
  const b = mod(dom + 8, 12);
  const lo = (() => {
    const f = mod(dom - tu.open[4], 12);
    return f < 2 ? f + 12 : f;
  })();
  const tri = (root: number) => windowScale(tu, root, [0, 4, 7], lo - 1, lo + 4, [4, 3, 2, 1]).slice(0, 6);
  const A = tri(a);
  const B = tri(b);
  const line: GN[] = [];
  for (let k = 0; k < 4; k++) line.push(...(k % 2 ? B : A).slice(k % 2 ? 1 : 0, (k % 2 ? 1 : 0) + 3));
  for (let k = 0; k < 4; k++) line.push(...[...(k % 2 ? A : B)].reverse().slice(0, 3));
  const unit = s.option === 1 ? 0.25 : 1 / 3;
  const evs: Ev[] = line.map((g, i) => ({ beat: i * unit, dur: unit, notes: [{ ...g, stroke: i % 2 ? 'U' : 'D' }] }));
  const third = place(tu, 60 + mod(key + 4 - 60, 12), [3, 2, 4], lo - 2, lo + 5) ?? place(tu, 64 + mod(key + 4 - 64, 12), [2, 1], 0, 17)!;
  const end = line.length * unit;
  evs.push({ beat: Math.ceil(end), dur: 2, notes: [{ ...third, stroke: 'D', ct: true }] });
  const title = t(`Altered triad pair: ${NAMES[a]} and ${NAMES[b]} over ${NAMES[dom]}7 → ${NAMES[key]}`, `זוג משולשים אלטרד: ${NAMES[a]} ו-${NAMES[b]} מעל ${NAMES[dom]}7 ← ${NAMES[key]}`);
  const d = finish(s, tu, evs, { title, bpm: 80, keySig: SIG[key] });
  const bars = Math.ceil((Math.ceil(end) + 2) / 4);
  return { ...d, chart: Array.from({ length: bars }, (_, i) => (i < bars - 1 ? `${NAMES[dom]}7alt` : `${NAMES[key]}maj7`)) };
}

// ───────────────────────────── a walking bass under chords / a melody ─────────────────────────────

/** Chord tones of a chart chord (the iv list): 3rd and 7th (guide tones), 5th. */
const third = (c: ChartChordEv): number => c.iv.find((x) => x === 3 || x === 4) ?? 4;
const seventh = (c: ChartChordEv): number => c.iv.find((x) => x === 10 || x === 11 || x === 9) ?? 10;
const fifth = (c: ChartChordEv): number => c.iv.find((x) => x === 6 || x === 7 || x === 8) ?? 7;

/** A walking line (MIDI, one note a beat): the root on each chord's first beat, chord tones, a half-step approach last. */
export function walkLine(chords: ChartChordEv[], beats: number, lo = 40, hi = 55): number[] {
  const out: number[] = [];
  const rootNear = (pcv: number, to: number): number => {
    const a = lo + mod(pcv - lo, 12);
    return a + 12 <= hi && Math.abs(a + 12 - to) < Math.abs(a - to) ? a + 12 : a;
  };
  let prev = lo + 5;
  for (let b = 0; b < beats; b++) {
    const c = chordAt(chords, b);
    const start = c.bar * 4 + c.at;
    const next = chordAt(chords, b + 1);
    const changes = next !== c || b === beats - 1;
    let p: number;
    if (Math.abs(b - start) < 1e-6) p = rootNear(c.root, prev);
    else if (changes && b < beats - 1) {
      const target = rootNear(next.root, prev);
      p = target + (target > prev ? -1 : 1);
    } else {
      const R = rootNear(c.root, prev);
      const tones = [R + third(c), R + fifth(c), R + 12 > hi ? R + seventh(c) - 12 : R + seventh(c)].filter((x) => x >= lo && x <= hi);
      p = tones.reduce((a2, b2) => (Math.abs(b2 - prev) < Math.abs(a2 - prev) && b2 !== prev ? b2 : a2), tones[0] ?? R);
    }
    out.push(p);
    prev = p;
  }
  return out;
}

/** The bass note on strings 6–5 (4 above B♭2) near a fret. */
const bassAt = (tu: Tuning, m: number, near: number): GN => place(tu, m, [6, 5, 4], Math.max(0, near - 4), near + 4) ?? place(tu, m, [6, 5, 4], 0, 15) ?? { s: 6, f: Math.max(0, m - tu.open[5]) };

/** A 12-bar blues (op 0 the basic jazz blues) or rhythm changes A (I vi ii V) in a key, as a chart. */
function formChart(kind: 'sj-blues' | 'sj-rhythm', key: number): string {
  const n = (d: number) => NAMES[mod(key + d, 12)].replace('♭', 'b').replace('♯', '#');
  if (kind === 'sj-blues') return [`${n(0)}7`, `${n(5)}7`, `${n(0)}7`, `${n(0)}7`, `${n(5)}7`, `${n(6)}dim7`, `${n(0)}7`, `${n(9)}7`, `${n(2)}m7`, `${n(7)}7`, `${n(0)}7 ${n(9)}7`, `${n(2)}m7 ${n(7)}7`].join(' | ');
  return [`${n(0)}maj7 ${n(9)}m7`, `${n(2)}m7 ${n(7)}7`, `${n(4)}m7 ${n(9)}7`, `${n(2)}m7 ${n(7)}7`, `${n(0)}7 ${n(0)}7`, `${n(5)}maj7 ${n(5)}m7`, `${n(0)}maj7 ${n(7)}7`, `${n(0)}6 ${n(0)}6`].join(' | ');
}

/** The guide tones (3rd under 7th, or 7th under 3rd) of a chord on strings 4–2, near a fret. */
function guidePair(tu: Tuning, c: ChartChordEv, near: number): GN[] {
  const ps: GN[] = [];
  for (const x of [third(c), seventh(c)]) {
    const m = 52 + mod(c.root + x - 52, 12);
    const p = place(tu, m, [4, 3, 2], Math.max(0, near - 3), near + 4) ?? place(tu, m + 12, [3, 2], Math.max(0, near - 3), near + 5);
    if (p && !ps.some((q) => q.s === p.s)) ps.push(p);
  }
  return ps;
}

/** Solo guitar over a form: the walking line on the beats, the guide-tone shell on the "and" of 2 and 4 (op 0) or of 1 and 3 (op 1). */
function soloForm(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const kind = s.kind as 'sj-blues' | 'sj-rhythm';
  const text = formChart(kind, key);
  const chords = parseChart(text).chords;
  const bars = text.split('|').length;
  const line = walkLine(chords, bars * 4);
  const evs: Ev[] = [];
  let near = 5;
  line.forEach((m, b) => {
    const g = bassAt(tu, m, near);
    near = g.f > 0 ? g.f : near;
    const c = chordAt(chords, b);
    evs.push({ beat: b, dur: 1, notes: [{ ...g, stroke: 'p', ct: Math.abs(b - (c.bar * 4 + c.at)) < 1e-6 }] });
  });
  for (let bar = 0; bar < bars; bar++)
    for (const off of s.option === 1 ? [0.5, 2.5] : [1.5, 3.5]) {
      const c = chordAt(chords, bar * 4 + off);
      const ps = guidePair(tu, c, Math.max(3, near));
      if (ps.length) evs.push({ beat: bar * 4 + off, dur: 0.5, notes: ps.map((p) => ({ ...p, stroke: 'i' as const, ct: true })) });
    }
  evs.sort((a, b) => a.beat - b.beat);
  const what = kind === 'sj-blues' ? t('the jazz blues', 'הבלוז בג׳אז') : t('rhythm changes, A section', 'ריתם צ׳יינג׳ס, חלק A');
  const d = finish(s, tu, evs, { title: tt(`Solo guitar on ${what.en}: walking bass, shells on the "and"`, `גיטרת סולו על ${what.he}: בס מהלך, קונכיות על ה"וְ"`, key), bpm: 90, evenness: false, keySig: SIG[key], goal: { chordTonesOnBeats: true } });
  return { ...d, chart: text.split('|').map((x) => x.trim().replace(/b/g, '♭')) };
}

/** Chord-melody arranging and the solo head (option = head index × 16). */
function arrange(s: DrillSpec, tu: Tuning): Drill {
  const { head } = decodeHead(s.option);
  const hi = headIn(head, s.key, 'guitar');
  const beats = hi.bars.length * 4;
  const plain = parseChart(hi.text).chords;
  const shift = (ns: HNote[], by: number): HNote[] => ns.map((n) => ({ ...n, beat: n.beat + by }));
  const shiftChords = (cs: ChartChordEv[], bars: number): ChartChordEv[] => cs.map((c) => ({ ...c, bar: c.bar + bars }));
  let evs: Ev[] = [];
  let chart: string[] = hi.bars;
  let what: T2;
  let rubato = false;
  switch (s.kind) {
    case 'ar-walk': {
      // The melody with the bass on the chords' downbeats, a whole chorus (the walking quarters are g-solojazz's).
      evs = chordMelodyEvs(tu, hi.notes, plain, 'bass');
      what = t('melody over the bass line, a whole chorus', 'מנגינה מעל קו הבס, פזמון שלם');
      break;
    }
    case 'sj-head': {
      // The whole head solo: the melody with a guide tone under it (as the comp would sound), then the drop-2 chorus.
      const one = chordMelodyEvs(tu, hi.notes, plain, 'guide');
      const two = chordMelodyEvs(tu, hi.notes.map((n) => ({ ...n, beat: n.beat + beats })), plain.map((c) => ({ ...c, bar: c.bar + hi.bars.length })), 'drop2');
      evs = [...one, ...two];
      chart = [...hi.bars, ...hi.bars];
      what = t('a whole head solo: guide tones, then drop 2', 'שיר שלם סולו: צלילים מנחים, ואז דרופ 2');
      break;
    }
    case 'ar-reharm':
    case 'ar-ballad': {
      const rh = chartFor(hi, 'tn-rh1');
      evs = chordMelodyEvs(tu, hi.notes, parseChart(rh.text).chords, s.kind === 'ar-ballad' ? 'dim' : 'drop2');
      chart = rh.bars;
      rubato = s.kind === 'ar-ballad';
      what = s.kind === 'ar-ballad' ? t('a rubato ballad chorus, reharmonised', 'פזמון בלדה ברובאטו, בהרמון מחדש') : t('a reharmonised chorus', 'פזמון בהרמון מחדש');
      break;
    }
    case 'ar-intro': {
      // Intro: the last four bars' chords (drop 2, two strums a bar); the chorus; a tag: the last two bars twice more.
      const n = hi.bars.length;
      const introChords = plain.filter((c) => c.bar >= n - 4).map((c) => ({ ...c, bar: c.bar - (n - 4) }));
      const introNotes: HNote[] = introChords.map((c) => ({ pitch: 64 + mod(c.root + seventh(c) - 64, 12), beat: c.bar * 4 + c.at, dur: c.beats }));
      const intro = chordMelodyEvs(tu, introNotes, introChords, 'drop2');
      const body = chordMelodyEvs(tu, shift(hi.notes, 16), shiftChords(plain, 4), 'dim');
      const tailNotes = hi.notes.filter((x) => x.beat >= (n - 2) * 4);
      const tailChords = plain.filter((c) => c.bar >= n - 2);
      const tag1 = chordMelodyEvs(tu, shift(tailNotes, 16 + 8), shiftChords(tailChords, 4 + 2), 'drop2');
      const tag2 = chordMelodyEvs(tu, shift(tailNotes, 16 + 16), shiftChords(tailChords, 4 + 4), 'drop2');
      evs = [...intro, ...body, ...tag1, ...tag2];
      chart = [...hi.bars.slice(n - 4), ...hi.bars, ...hi.bars.slice(n - 2), ...hi.bars.slice(n - 2)];
      what = t('intro, chorus, tag', 'פתיחה, פזמון, תג');
      break;
    }
    default: {
      // ar-two: the chorus as written (drop 2), then again over the backdoor / passing-dim reharm (with passing dim).
      const rh = chartFor(hi, 'tn-rh2');
      const one = chordMelodyEvs(tu, hi.notes, plain, 'drop2');
      const two = chordMelodyEvs(tu, shift(hi.notes, beats), shiftChords(parseChart(rh.text).chords, hi.bars.length), 'dim');
      evs = [...one, ...two];
      chart = [...hi.bars, ...rh.bars];
      what = t('two choruses: written, then reharmonised', 'שני פזמונים: כפי שנכתב, ואז בהרמון מחדש');
    }
  }
  const k = keyLabel(hi.tonic);
  const sigs = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const d = finish(s, tu, evs, { title: t(`${hi.head.title.en} · ${what.en} · ${k}`, `${hi.head.title.he} · ${what.he} · ${k}`), bpm: head.feel === 'ballad' ? 56 : 66, evenness: false, keySig: sigs[mod(hi.tonic.minor ? hi.tonic.key + 3 : hi.tonic.key, 12)] });
  const pretty = (x: string) => x.replace(/([A-G])b/g, '$1♭').replace(/#/g, '♯');
  return { ...d, beats: Math.max(d.beats, chart.length * 4), chart: chart.map(pretty), tonic: hi.tonic, paged: chart.length > 8, ...(rubato ? { rubatoOnly: true } : {}) };
}
