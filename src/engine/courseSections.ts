// A course's sections (docs/SPEC-COURSE-SECTIONS.md, approved 2026-11-19): one list per instrument course drives the
// Overview radar and the Skills map (and, through the families, the level test and the workout). A section is a
// musical ability a teacher would assess, never a body part; technique is one section; every family is in exactly one.
// Owner 2026-11-21: on piano, time is its own section (it was folded into comping), and scales / arpeggios / fingers
// are not separate axes — they are technique. Pure.

import type { CourseId } from './courses';
import { DEFAULT_DRILL_SETTINGS, type FamilyId, type ItemState } from './drills/types';
import { familyById } from './drills/plan';
import { TECH_DONE_STARS, techStars } from './ladderFacts';
import { channelCounts, channelProfile } from './drills/channel';

export interface CourseSection {
  id: string;
  name: { en: string; he: string };
  desc: { en: string; he: string };
  families: string[];
  /** Time is also measured in every take: the section's value blends in the timing evenness of all items. */
  timing?: boolean;
}

const S = (id: string, en: string, he: string, den: string, dhe: string, families: string[], timing = false): CourseSection => ({ id, name: { en, he }, desc: { en: den, he: dhe }, families, ...(timing ? { timing } : {}) });

export const COURSE_SECTIONS: Partial<Record<CourseId, CourseSection[]>> = {
  keys: [
    S('technique', 'Technique', 'טכניקה', 'Scales, arpeggios, modes, fingers, hand independence', 'סולמות, ארפג׳יו, מודים, אצבעות, עצמאות הידיים', ['k-first', 'scales', 'arpeggios', 'fingers', 'advanced', 'k-indep', 'k-modes', 'k-mmhm', 'k-keylick', 'k-keyx']),
    S('tone', 'Dynamics', 'דינמיקה', 'Touch, dynamics, balance, voicing the melody, pedal, phrasing', 'מגע, דינמיקה, איזון, הבלטת מנגינה, פדל, משפטים', ['control', 'k-pedal', 'k-classic']),
    S('time', 'Time', 'זמן', 'Steady time in every take, subdivision, meters, polyrhythm', 'זמן יציב בכל נגינה, חלוקה, משקלים, פוליריתמיקה', ['k-rhythm', 'k-odd'], true),
    S('harmony', 'Harmony', 'הרמוניה', 'Chords, voicings, voice leading, cadences', 'אקורדים, ווייסינגים, הובלת קולות, קדנצות', ['cadences', 'voicings', 'k-vl', 'k-theory', 'k-keys', 'k-sharm', 'k-harm', 'k-sixdim', 'k-reharm', 'k-ctone', 'k-mediant', 'k-cadlib', 'k-dimcol']),
    S('comping', 'Comping', 'ליווי', 'Playing a song: accompaniment, textures, with a band', 'לנגן שיר: ליווי, מרקמים, עם להקה', ['accomp', 'k-pop', 'k-tune', 'k-comp', 'k-organ', 'k-lh', 'k-tex', 'k-gig', 'k-brazil', 'k-montuno', 'k-gospel', 'k-souljazz', 'k-nola']),
    S('improv', 'Improvisation', 'אלתור', 'Lines, vocabulary, solos', 'קווים, אוצר מילים, סולו', ['harris', 'jazz', 'k-bebop', 'k-vocab', 'k-harrisline', 'k-ctx', 'k-solo', 'k-impro', 'k-tpair']),
    S('byear', 'By ear', 'משמיעה', 'Hear it and play it: melodies, bass lines, progressions', 'שומעים ומנגנים: מנגינות, קווי בס, מהלכים', ['k-ear', 'k-phrase']),
    S('reading', 'Reading', 'קריאה', 'Playing at sight', 'לנגן מתווים שלא ראיתם', ['k-read']),
  ],
  guitar: [
    S('technique', 'Technique', 'טכניקה', 'Fretting, picking, legato, speed', 'לחיצה, פריטה, לגאטו, מהירות', ['g-first', 'g-fretting', 'g-picking', 'g-legato', 'g-lead', 'g-speed', 'g-fingerstyle', 'g-flamenco']),
    S('harmony', 'Harmony', 'הרמוניה', 'Chords, voicings and chord melody on the neck', 'אקורדים, ווייסינגים ואקורד־מלודיה על הצוואר', ['g-chords', 'g-jazz', 'g-vl', 'g-harm', 'g-theory', 'g-keys', 'g-harris', 'g-ctone', 'g-color', 'g-cmel', 'g-cmarr', 'g-solojazz', 'g-cadlib']),
    S('rhythm', 'Rhythm & groove', 'ריתם וגרוב', 'Comping, riffs, meters, steady time', 'ליווי, ריפים, משקלים, זמן יציב', ['g-riff', 'g-rhythm', 'g-meter', 'g-tune', 'g-jblues', 'g-gig', 'g-prog', 'g-brazil', 'g-guajeo', 'g-soul'], true),
    S('improv', 'Improvisation', 'אלתור', 'Scales, arpeggios, lines, solos', 'סולמות, ארפג׳יו, קווים, סולו', ['g-scales', 'g-arps', 'g-impro', 'g-bebop', 'g-harrisline', 'g-hlfast', 'g-tpair', 'g-ctx', 'g-solo', 'g-fusion']),
    S('byear', 'By ear', 'משמיעה', 'Hear it and play it', 'שומעים ומנגנים', ['g-ear', 'g-phrase']),
    S('reading', 'Reading', 'קריאה', 'Reading in positions', 'קריאה לפי מצבים', ['g-reading']),
  ],
  bass: [
    S('technique', 'Technique', 'טכניקה', 'Plucking, fretting, note length, slap', 'פריטה, לחיצה, אורך צליל, סלאפ', ['b-first', 'b-pluck', 'b-fret', 'b-length', 'b-legato', 'b-ext', 'b-pick', 'b-slap', 'g-bass', 'b-up-pos', 'b-up-arco', 'b-up-pizz']),
    S('groove', 'Time & groove', 'זמן וגרוב', 'The pocket, feels, styles, meters', 'כיס, תחושות, סגנונות, משקלים', ['b-time', 'b-pocket', 'b-ghost', 'b-feel', 'b-swing', 'b-styles', 'b-latin', 'b-soul', 'b-nola', 'b-riff', 'b-odd', 'b-prog', 'b-poly', 'b-gig'], true),
    S('lines', 'Lines & harmony', 'קווים והרמוניה', 'Chord tones, scales, walking, form', 'צלילי אקורד, סולמות, בס מהלך, צורה', ['b-chord', 'b-scale', 'b-walk', 'b-barry', 'b-keys', 'b-counter', 'b-jform', 'b-std', 'b-tune', 'b-cadlib', 'b-up-scales', 'b-up-walk']),
    S('improv', 'Improvisation', 'אלתור', 'Fills, lines, solos', 'מעברים, קווים, סולו', ['b-impro', 'b-bebop', 'b-harrisline', 'b-tpair', 'b-ctx', 'b-solo']),
    S('byear', 'By ear', 'משמיעה', 'Hear it and play it', 'שומעים ומנגנים', ['b-ear', 'b-phrase']),
    S('reading', 'Reading', 'קריאה', 'Notes and charts', 'תווים וצ׳ארטים', ['b-read', 'b-posread', 'b-up-read']),
  ],
  drums: [
    S('technique', 'Technique', 'טכניקה', 'Strokes, rolls, rudiments, brushes', 'מכות, גלגולים, רודימנטים, מברשות', ['d-first', 'd-strokes', 'd-rolls', 'd-diddles', 'd-pas', 'd-stick', 'd-brush']),
    S('groove', 'Time & groove', 'זמן וגרוב', 'Steady time and grooves', 'דופק יציב וגרובים', ['d-time', 'd-rock', 'd-funk', 'd-shuffle', 'd-jazz', 'd-linear']),
    S('coord', 'Coordination', 'תיאום', 'Four limbs, each with its own part', 'ארבע גפיים, כל אחת בתפקיד שלה', ['d-indep', 'd-feet', 'd-chapin']),
    S('styles', 'Styles & meters', 'סגנונות ומשקלים', 'Latin, Middle Eastern, prog, odd meters', 'לטיני, מזרחי, פרוג, משקלים אי־זוגיים', ['d-latin', 'd-mideast', 'd-prog', 'd-count', 'd-oddtempo']),
    S('form', 'Fills & form', 'מעברים וצורה', 'Fills, landings, solos over a form', 'מעברים, נחיתות, סולו על צורה', ['d-fills', 'd-trade', 'd-song', 'd-form']),
    S('reading', 'Reading & ear', 'קריאה ואוזן', 'Drum notation, syncopation, ear', 'כתב התופים, סינקופות, שמיעה', ['d-read', 'd-notation', 'd-synco', 'd-ear']),
  ],
};

/** The section a family belongs to in a course. */
export const sectionOfFamily = (course: CourseId, family: string): CourseSection | undefined => COURSE_SECTIONS[course]?.find((s) => s.families.includes(family));

/**
 * Timing evenness over every take of a course's families (0..1): the items' running IOI CV, 3 % → 1, 10 % → 0.
 * Null without enough measured items.
 */
export function timingScore(items: Record<string, ItemState>, families: Set<string>): number | null {
  const cvs = Object.values(items)
    .filter((s) => families.has(s.family) && s.takes > 0 && s.ewma?.cv !== undefined)
    .map((s) => s.ewma!.cv!);
  if (cvs.length < 3) return null;
  const m = cvs.reduce((a, b) => a + b, 0) / cvs.length;
  return Math.max(0, Math.min(1, (0.1 - m) / 0.07));
}

/** Measured channel takes at which the radar's "by ear" / "reading" value is all channel (below: blended with levels). */
export const CHANNEL_FULL_TAKES = 12;

/**
 * BUILD-PLAN-2026-11 §0.2 / SPEC-EAR-AND-READING §4: the "by ear" and "reading" sections keep their families as their
 * content, but their value comes from takes by channel (fresh ear takes, sight takes — channelProfile, measured only,
 * no self-rating). While there are few such takes the channel number is blended with the family-based value, its weight
 * growing to 1 at CHANNEL_FULL_TAKES. Below 3 takes and with no level passed the value stays empty.
 */
export function channelAxisValue(which: 'ear' | 'reading', items: Record<string, ItemState>, levels: number | null): number | null {
  const n = channelCounts(items)[which];
  const ch = channelProfile(items)[which];
  if (ch === null || n < 3) return levels;
  const w = Math.min(1, n / CHANNEL_FULL_TAKES);
  return levels === null ? ch : w * ch + (1 - w) * levels;
}

/** The radar values of a course's sections (0..1, null = nothing passed or measured yet). */
export function sectionAxes(secs: CourseSection[], items: Record<string, ItemState>, lang: 'he' | 'en'): { id: string; label: string; v: number | null; done: number; levels: number }[] {
  const all = new Set(secs.flatMap((s) => s.families));
  return secs.map((sec) => {
    let lv = 0;
    let done = 0;
    for (const id of sec.families) {
      const f = familyById(id as FamilyId);
      if (!f) continue;
      lv += f.levels.length;
      done += f.levels.filter((l) => techStars(l, items, DEFAULT_DRILL_SETTINGS.keyOrder) >= TECH_DONE_STARS).length;
    }
    const levels = done ? done / Math.max(1, lv) : null;
    const timing = sec.timing ? timingScore(items, all) : null;
    const base = levels === null ? timing : timing === null ? levels : (levels + timing) / 2;
    const v = sec.id === 'byear' ? channelAxisValue('ear', items, base) : sec.id === 'reading' ? channelAxisValue('reading', items, base) : base;
    return { id: sec.id, label: sec.name[lang], v, done, levels: lv };
  });
}
