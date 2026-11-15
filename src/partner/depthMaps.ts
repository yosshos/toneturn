// The depth page's maps (docs/SPEC-PARTNER-PITCH.md §3.3): each row names a part of a method, its sources, and the
// families / topics in the app that drill it. Level counts beside each row are computed live (depth.ts).
// Sources: docs/BARRY-HARRIS-THEORY.md, docs/research/BARRY-HARRIS-METHOD.md (Kingstone, Rees, Parks, Echols),
// docs/research/SISKIND-SOLO-PIANO.md, docs/HARMONY-REHARM.md + docs/research/REHARM-AND-COLOR.md, docs/AUDIT-SCALES.md.
import type { Bi, DepthLink } from './types';

export interface MapRow {
  name: Bi;
  sources?: string[];
  links: DepthLink[];
}
export interface DepthMap {
  id: 'harris' | 'siskind' | 'reharm' | 'voicings' | 'ear';
  title: Bi;
  lead: Bi;
  rows: MapRow[];
}

const F = (id: string): DepthLink => ({ kind: 'family', id });
const T = (id: string): DepthLink => ({ kind: 'topic', id });

export const DEPTH_MAPS: DepthMap[] = [
  {
    id: 'harris',
    title: { en: 'Barry Harris method', he: 'השיטה של בארי האריס' },
    lead: { en: 'From the sources, checked line by line: Kingstone, Rees, Parks, Echols.', he: 'מהמקורות, נבדק שורה אחר שורה: קינגסטון, ריס, פארקס, אקולס.' },
    rows: [
      { name: { en: 'The four 6th-diminished scales and their harmony', he: 'ארבעת סולמות השישית־מוקטן וההרמוניה שלהם' }, sources: ['Rees', 'Kingstone', 'Echols'], links: [F('harris'), F('k-sixdim'), F('g-harris'), T('bh-scale')] },
      { name: { en: 'Half-step rules, lines and devices', he: 'כללי חצי הטון, קווים והתקנים' }, sources: ['Rees', 'Parks'], links: [F('k-harrisline'), F('g-harrisline'), F('b-harrisline'), T('bh-lines')] },
      { name: { en: 'Scale of chords, drop 2, borrowing', he: 'סולם האקורדים, דרופ 2, השאלה' }, sources: ['Kingstone', 'Rees', 'Echols'], links: [F('k-sharm'), F('g-harm'), T('bh-borrow')] },
      { name: { en: 'Family of dominants, eight ways, the important minor', he: 'משפחת הדומיננטים, שמונה דרכים, המינור החשוב' }, sources: ['Rees', 'Parks'], links: [T('bh-family'), T('bh-brothers'), T('bh-six-over')] },
      { name: { en: 'The pivot, moves, the Elevator, the tesseract', he: 'הציר, המהלכים, המעלית, הטסרקט' }, sources: ['Parks', 'Kingstone', 'Echols'], links: [T('bh-pivot-arp'), T('bh-moves'), T('bh-tesseract')] },
      { name: { en: 'Improvising under rule cards', he: 'אלתור לפי כרטיסי כללים' }, sources: ['Parks', 'Echols'], links: [F('k-solo'), F('g-solo')] },
      { name: { en: 'Hearing it: which dominant, which line', he: 'לשמוע את זה: איזה דומיננט, איזה קו' }, links: [T('bh-line-ear'), T('bh-dim-roles')] },
    ],
  },
  {
    id: 'siskind',
    title: { en: 'Solo piano (after Siskind)', he: 'פסנתר סולו (בעקבות סיסקינד)' },
    lead: { en: 'Three registers, the left hand ladder, textures through tunes.', he: 'שלושה אזורים, סולם יד שמאל, מרקמים דרך שירים.' },
    rows: [
      { name: { en: 'Left hand: positions, stride, tenths, shuttles', he: 'יד שמאל: תנוחות, סטרייד, דצימות, שאטל' }, sources: ['Siskind'], links: [F('k-lh'), T('lh-tex-ear')] },
      { name: { en: 'Textures: thickened line, shared hands, ballads', he: 'מרקמים: קו מעובה, ידיים משותפות, בלדות' }, sources: ['Siskind'], links: [F('k-tex'), T('solo-tex-ear')] },
      { name: { en: 'Comping vocabulary and improvising habits', he: 'אוצר ליווי והרגלי אלתור' }, sources: ['Siskind'], links: [F('k-comp'), F('k-impro')] },
    ],
  },
  {
    id: 'reharm',
    title: { en: 'Reharmonization and colour', he: 'הרמוניה מחדש וצבע' },
    lead: { en: 'Functional and colour reharm, from common tones to modern sounds.', he: 'הרמוניה מחדש פונקציונלית וצבעונית, מצליל משותף ועד צלילים מודרניים.' },
    rows: [
      { name: { en: 'One note, many chords (common tone)', he: 'צליל אחד, אקורדים רבים (צליל משותף)' }, sources: ['Goldings'], links: [F('k-ctone'), F('g-ctone'), T('ct-degree')] },
      { name: { en: 'Chromatic mediants, borrowed chords', he: 'מדיאנטות כרומטיות, אקורדים שאולים' }, links: [F('k-mediant'), T('mediants'), T('borrowed-ext')] },
      { name: { en: 'Substitutions, approach chords, planing', he: 'תחליפים, אקורדי גישה, פליינינג' }, links: [F('k-reharm'), T('approach-chord'), T('planing'), T('reharm-spot')] },
      { name: { en: 'Colour on guitar, the bass reharmonizes', he: 'צבע בגיטרה, הבס מהרמן מחדש' }, links: [F('g-color'), F('b-counter'), T('counter-line')] },
      { name: { en: 'Organ comping, modern colour', he: 'ליווי עוגב, צבע מודרני' }, sources: ['Goldings'], links: [F('k-organ'), T('modern-color'), T('func-color')] },
    ],
  },
  {
    id: 'voicings',
    title: { en: 'Voicings', he: 'קולות (וויסינגים)' },
    lead: { en: 'From shells to rootless and upper structures, on both instruments.', he: 'משלדים ועד ללא־שורש ומבנים עליונים, בשני הכלים.' },
    rows: [
      { name: { en: 'Shells, guide tones, rootless A/B', he: 'שלדים, צלילים מנחים, ללא־שורש A/B' }, links: [F('voicings'), T('guide-tones'), T('upper-rootless')] },
      { name: { en: 'Voice leading and accompaniment', he: 'הובלת קולות וליווי' }, links: [F('k-vl'), F('accomp'), T('voice-leading')] },
      { name: { en: 'Triad pairs, polychords, quartal', he: 'זוגות משולשים, פוליאקורדים, קוורטלי' }, links: [T('triad-pairs'), T('polychords'), T('voicing-type')] },
      { name: { en: 'Guitar: jazz chords, chord-melody', he: 'גיטרה: אקורדי ג׳אז, מלודיה באקורדים' }, links: [F('g-chords'), F('g-jazz'), F('g-cmel')] },
    ],
  },
  {
    id: 'ear',
    title: { en: 'Ear training', he: 'פיתוח שמיעה' },
    lead: { en: 'Heard on the instrument and as theory: changes, voicings, lines, time.', he: 'נשמע על הכלי וכתיאוריה: מהלכים, קולות, קווים, זמן.' },
    rows: [
      { name: { en: 'The pianist’s and guitarist’s ear', he: 'השמיעה של הפסנתרן והגיטריסט' }, links: [F('k-ear'), F('g-ear'), F('k-phrase'), F('g-phrase')] },
      { name: { en: 'Progressions, jazz changes, dictation', he: 'מהלכים, מהלכי ג׳אז, הכתבה' }, links: [T('progressions'), T('jazz-changes'), T('jazz-dictation'), T('harmonic-dictation')] },
      { name: { en: 'Comping rhythm, swing, form', he: 'מקצב ליווי, סווינג, צורה' }, links: [T('comp-rhythm-ear'), T('swing-ratio'), T('jazz-form')] },
    ],
  },
];

/** Hebrew names for the scale matrix rows (the English names come from the catalogue). */
export const SCALE_HE: Record<string, string> = {
  major: 'מז׳ור (יוני)',
  dorian: 'דורי',
  phrygian: 'פריגי',
  lydian: 'לידי',
  mixolydian: 'מיקסולידי',
  natural: 'מינור טבעי (איולי)',
  locrian: 'לוקרי',
  harmonic: 'מינור הרמוני',
  melodic: 'מינור מלודי',
  pentatonic: 'פנטטוני מז׳ורי',
  blues: 'בלוז',
  'six-dim': 'שישית־מוקטן (האריס)',
  'six-dim-m': 'מינור שישית־מוקטן (האריס)',
};

/** Short English names for the matrix rows on a phone (full names in the cell title). */
export const SCALE_SHORT: Record<string, string> = {
  major: 'Major',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  natural: 'Aeolian',
  locrian: 'Locrian',
  harmonic: 'Harm. minor',
  melodic: 'Mel. minor',
  pentatonic: 'Pentatonic',
  blues: 'Blues',
  'six-dim': '6th-dim',
  'six-dim-m': 'Minor 6th-dim',
};
