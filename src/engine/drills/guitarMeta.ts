// GUITAR_DEEPENING §2 and §5 (owner-approved 2026-11-11): real target tempos, an RSL-equivalent grade on every guitar
// level, exam tags, and which levels belong to an add-on (the core path is everything else). Pure data + small helpers;
// guitar.ts applies it to the catalogue (applyGuitarMeta). No imports from guitar.ts at module load (circular import).

import type { DrillSettings, GuitarAddOn, LevelExamTag } from './types';
import type { SpecTemplate } from './generate';
import type { CourseId } from '../courses';

/** One level's meta: start → target (♩, or ♪ for eighth-pulse items), the subdivision, the RSL-equivalent grade (9 = beyond). */
export interface GuitarLevelMeta {
  tempo: [number, number];
  sub: string;
  grade: number;
  /** Items off the tempo ladder (ring checks, harmonics, vibrato): they pass on 3 clean takes on 2 days at their own start. */
  untimed?: (s: SpecTemplate) => boolean;
  /** Items with their own start → target (reggae / ska, the flamenco palos, bossa / Freddie Green / clave). */
  items?: { match: (s: SpecTemplate) => boolean; tempo: [number, number] }[];
  addOn?: GuitarAddOn;
  /** Country levels (owner 2026-11-11: country is not core): only with the country flavour. */
  country?: boolean;
}

const k = (kind: string, option?: number) => (s: SpecTemplate) => s.kind === kind && (option === undefined || (s.option ?? 0) === option);

/** §2.3: the table for the 79 levels of 0.68 (♩ unless noted). */
export const GUITAR_META: Record<string, GuitarLevelMeta> = {
  'g-fretting-1': { tempo: [60, 100], sub: '8ths', grade: 2 },
  'g-fretting-2': { tempo: [60, 100], sub: '8ths', grade: 3 },
  'g-fretting-3': { tempo: [60, 100], sub: '8ths', grade: 3 },
  'g-fretting-4': { tempo: [70, 110], sub: '8ths', grade: 4 },
  'g-fretting-5': { tempo: [50, 90], sub: '16ths', grade: 6 },
  'g-fretting-6': { tempo: [50, 80], sub: '8ths', grade: 5 },
  'g-picking-1': { tempo: [60, 120], sub: '8ths', grade: 1 },
  'g-picking-2': { tempo: [60, 110], sub: '8ths', grade: 3 },
  'g-picking-3': { tempo: [50, 90], sub: 'triplets', grade: 6 },
  'g-picking-4': { tempo: [60, 100], sub: '8ths', grade: 5 },
  'g-picking-5': { tempo: [60, 120], sub: '16ths', grade: 7 },
  'g-picking-6': { tempo: [40, 80], sub: 'triplets / 16ths', grade: 8 },
  'g-picking-7': { tempo: [60, 100], sub: '8ths', grade: 6, country: true },
  'g-legato-1': { tempo: [60, 100], sub: '8ths', grade: 2 },
  'g-legato-2': { tempo: [60, 100], sub: '8ths', grade: 2 },
  'g-legato-3': { tempo: [60, 100], sub: '16ths', grade: 4 },
  'g-legato-4': { tempo: [60, 100], sub: 'triplets', grade: 5 },
  'g-legato-5': { tempo: [60, 100], sub: 'triplets', grade: 7 },
  'g-legato-6': { tempo: [60, 100], sub: 'triplets / 16ths', grade: 8 },
  'g-scales-1': { tempo: [70, 100], sub: '8ths', grade: 1 },
  'g-scales-2': { tempo: [70, 100], sub: '8ths', grade: 4 },
  'g-scales-3': { tempo: [70, 100], sub: '8ths', grade: 3 },
  'g-scales-4': { tempo: [70, 100], sub: '8ths', grade: 4 },
  'g-scales-5': { tempo: [80, 110], sub: '8ths', grade: 5 },
  'g-scales-6': { tempo: [60, 100], sub: 'triplets', grade: 7 },
  'g-scales-7': { tempo: [80, 120], sub: '8ths', grade: 8 },
  'g-arps-1': { tempo: [60, 90], sub: '8ths', grade: 3 },
  'g-arps-2': { tempo: [60, 90], sub: '8ths', grade: 4 },
  'g-arps-3': { tempo: [60, 100], sub: '8ths', grade: 5 },
  'g-arps-4': { tempo: [70, 100], sub: '8ths', grade: 5 },
  'g-arps-5': { tempo: [70, 110], sub: '8ths', grade: 8 },
  'g-chords-1': { tempo: [60, 60], sub: 'ring check', grade: 0, untimed: () => true },
  'g-chords-2': { tempo: [60, 120], sub: 'quarters (1 strum a bar)', grade: 1 },
  'g-chords-3': { tempo: [60, 120], sub: 'halves (2 a bar)', grade: 2, untimed: k('chord-check') },
  'g-chords-4': { tempo: [80, 130], sub: '8ths', grade: 3 },
  'g-chords-5': { tempo: [60, 60], sub: 'ring check', grade: 3, untimed: () => true },
  'g-chords-6': { tempo: [60, 100], sub: 'quarters', grade: 4 },
  'g-chords-7': { tempo: [60, 90], sub: 'quarters', grade: 5 },
  'g-rhythm-1': { tempo: [70, 100], sub: '8ths', grade: 0 },
  'g-rhythm-2': { tempo: [70, 110], sub: '8ths', grade: 1 },
  'g-rhythm-3': { tempo: [80, 120], sub: 'swung 8ths / quarters', grade: 3 },
  'g-rhythm-4': { tempo: [70, 90], sub: '8ths', grade: 3, items: [{ match: k('ska'), tempo: [110, 150] }] },
  'g-rhythm-5': { tempo: [80, 105], sub: '16ths', grade: 5 },
  'g-rhythm-6': { tempo: [100, 140], sub: '8ths / quarters', grade: 5, addOn: 'jazz', items: [{ match: k('freddie'), tempo: [100, 180] }, { match: k('clave'), tempo: [90, 120] }] },
  'g-rhythm-7': { tempo: [90, 150], sub: '16th-8th-8th', grade: 5 },
  'g-lead-1': { tempo: [60, 90], sub: 'quarters', grade: 2, untimed: k('harmonics') },
  'g-lead-2': { tempo: [60, 80], sub: 'quarters', grade: 3 },
  'g-lead-3': { tempo: [60, 80], sub: 'quarters', grade: 4 },
  'g-lead-4': { tempo: [60, 80], sub: 'quarters', grade: 5 },
  'g-lead-5': { tempo: [60, 60], sub: 'vibrato (rate, width)', grade: 4, untimed: () => true },
  'g-lead-6': { tempo: [60, 100], sub: '8ths', grade: 5 },
  'g-lead-7': { tempo: [60, 90], sub: 'quarters / 8ths', grade: 6 },
  'g-fingerstyle-1': { tempo: [60, 90], sub: '8ths', grade: 1 },
  'g-fingerstyle-2': { tempo: [60, 100], sub: '8ths', grade: 2 },
  'g-fingerstyle-3': { tempo: [60, 100], sub: '8ths / triplets', grade: 3 },
  'g-fingerstyle-4': { tempo: [70, 110], sub: '8ths', grade: 4 },
  'g-fingerstyle-5': { tempo: [60, 96], sub: '8ths', grade: 5 },
  'g-fingerstyle-6': { tempo: [50, 80], sub: '16ths', grade: 8 },
  'g-flamenco-1': { tempo: [60, 100], sub: '16ths', grade: 3 },
  'g-flamenco-2': { tempo: [60, 100], sub: 'triplets', grade: 4 },
  'g-flamenco-3': { tempo: [60, 110], sub: '16ths', grade: 6 },
  'g-flamenco-4': { tempo: [60, 100], sub: 'triplets', grade: 6 },
  // The palos count in their own pulse (the generator's beat = one of the 12 counts): soleá, bulería, seguiriya; rumba in ♩.
  'g-flamenco-5': {
    tempo: [120, 180],
    sub: 'per palo (12-count pulses; rumba ♩)',
    grade: 7,
    items: [
      { match: k('compas', 0), tempo: [120, 180] },
      { match: k('compas', 1), tempo: [180, 240] },
      { match: k('compas', 2), tempo: [120, 160] },
      { match: k('compas', 3), tempo: [90, 120] },
    ],
  },
  'g-jazz-1': { tempo: [100, 160], sub: 'swing quarters', grade: 4 },
  'g-jazz-2': { tempo: [60, 100], sub: 'halves', grade: 5 },
  'g-jazz-3': { tempo: [60, 120], sub: 'halves', grade: 6 },
  'g-jazz-4': { tempo: [60, 120], sub: 'halves', grade: 6 },
  'g-jazz-5': { tempo: [80, 140], sub: 'halves / quarters', grade: 6 },
  'g-jazz-6': { tempo: [80, 140], sub: 'quarters', grade: 7 },
  'g-jazz-7': { tempo: [60, 100], sub: 'quarters / swing 8ths', grade: 8, items: [{ match: k('octaves'), tempo: [80, 140] }] },
  'g-reading-1': { tempo: [60, 70], sub: 'quarters / 8ths', grade: 1 },
  'g-reading-2': { tempo: [60, 75], sub: '8ths', grade: 2 },
  'g-reading-3': { tempo: [65, 85], sub: '8ths', grade: 3 },
  'g-reading-4': { tempo: [70, 90], sub: '8ths', grade: 4 },
  'g-reading-5': { tempo: [75, 100], sub: '8ths', grade: 5 },
  'g-impro-1': { tempo: [70, 90], sub: 'quarters', grade: 2 },
  'g-impro-2': { tempo: [75, 100], sub: 'quarters', grade: 3 },
  'g-impro-3': { tempo: [80, 110], sub: '8ths', grade: 5 },
  'g-impro-4': { tempo: [90, 120], sub: 'swing 8ths', grade: 6 },
};

/** Families that are an add-on as a whole (§5.2). Everything else is core. */
export const ADDON_FAMILY: Record<string, GuitarAddOn> = { 'g-jazz': 'jazz', 'g-harris': 'jazz', 'g-theory': 'jazz', 'g-flamenco': 'flamenco', 'g-fingerstyle': 'fingerstyle', 'g-prog': 'prog' };
export const GUITAR_ADDONS: GuitarAddOn[] = ['jazz', 'flamenco', 'fingerstyle', 'prog'];
export const ADDON_NAME: Record<GuitarAddOn, { en: string; he: string }> = {
  jazz: { en: 'Jazz', he: 'ג׳אז' },
  flamenco: { en: 'Flamenco', he: 'פלמנקו' },
  fingerstyle: { en: 'Fingerstyle / classical', he: 'פריטת אצבעות / קלאסי' },
  prog: { en: 'Prog / fusion', he: 'פרוג / פיוז׳ן' },
};
export const ADDON_DESC: Record<GuitarAddOn, { en: string; he: string }> = {
  jazz: { en: 'Comping, drop voicings, Barry Harris lines, standards', he: 'ליווי, קולות דרופ, הקווים של בארי האריס, סטנדרטים' },
  flamenco: { en: 'Rasgueado, picado, alzapúa, compás', he: 'ראסגאדו, פיקאדו, אלסאפואה, קומפאס' },
  fingerstyle: { en: 'p-i-m-a, Travis, rest stroke, tremolo', he: 'p-i-m-a, טראוויס, מכה נשענת, טרמולו' },
  prog: { en: 'Odd meters, metric modulation, fusion lines, unisons', he: 'משקלים אי-זוגיים, מודולציה מטרית, קווי פיוז׳ן, יוניסונים' },
};

/**
 * The add-ons a guitar player has (§5.2 migration, owner 2026-11-11). Set explicitly → as set. Otherwise from the old
 * single style: jazz / latin → jazz, flamenco → flamenco, classical / fingerstyle → fingerstyle, anything else → core
 * only; and jazz is pre-ticked for a player who also takes the Jazz course.
 */
export function guitarAddOnsOf(ds: Pick<DrillSettings, 'guitarAddOns' | 'guitarStyle'>, courses?: CourseId[]): GuitarAddOn[] {
  if (ds.guitarAddOns) return ds.guitarAddOns.filter((a) => GUITAR_ADDONS.includes(a));
  const st = ds.guitarStyle;
  const out = new Set<GuitarAddOn>();
  if (st === 'jazz' || st === 'latin') out.add('jazz');
  if (st === 'flamenco') out.add('flamenco');
  if (st === 'classical' || st === 'fingerstyle') out.add('fingerstyle');
  if (courses?.includes('jazz')) out.add('jazz');
  return GUITAR_ADDONS.filter((a) => out.has(a));
}

/** Exam tags from a grade (RSL-equivalent; 9 = beyond grade 8, no tag). */
export const examOfGrade = (grade: number): LevelExamTag[] => (grade <= 8 ? [{ board: 'RSL', grade: grade === 0 ? 'Debut' : String(grade) }] : []);

/** Notes per beat of a subdivision name (the level's `sub`), for the item tempo rule below. */
export function subNpb(sub: string): number {
  const s = sub.toLowerCase();
  if (s.startsWith('16')) return 4;
  if (s.startsWith('triplet')) return 3;
  if (s.startsWith('8th') || s.startsWith('swung 8') || s.startsWith('swing 8')) return 2;
  if (s.startsWith('half') || s.startsWith('halves')) return 0.5;
  if (s.startsWith('quarter') || s.startsWith('swing quarter')) return 1;
  return 2;
}

/**
 * An item's start → target (§2.2): its own row if it has one; a denser item than the level's subdivision whose
 * generator start is lower keeps that start and climbs the level's ratio; every other item takes the level's range.
 */
export function itemTempo(meta: GuitarLevelMeta, s: SpecTemplate, genStart: number, npb: number): { tempo?: number; target?: number } {
  if (meta.untimed?.(s)) return { target: 0 };
  const own = meta.items?.find((x) => x.match(s));
  if (own) return { tempo: own.tempo[0], target: own.tempo[1] };
  const [a, b] = meta.tempo;
  if (npb > subNpb(meta.sub) + 0.01 && genStart < a) return { tempo: genStart, target: Math.round((b * genStart) / a) };
  return { tempo: a };
}

/**
 * The guitar course's voice (§8): a fixed choice, else by the add-ons — prog or jazz → the clean electric (neck
 * pickup), fingerstyle or flamenco → nylon, otherwise the steel-string acoustic.
 */
export function guitarVoiceOf(choice: 'auto' | 'steel' | 'nylon' | 'electric' | undefined, addOns: GuitarAddOn[]): 'steel' | 'nylon' | 'electric' {
  if (choice && choice !== 'auto') return choice;
  if (addOns.includes('prog') || addOns.includes('jazz')) return 'electric';
  if (addOns.includes('fingerstyle') || addOns.includes('flamenco')) return 'nylon';
  return 'steel';
}

