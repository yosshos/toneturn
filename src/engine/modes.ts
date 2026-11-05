// Scales and modes shared by singing (vocal technique) and listening (mode recognition).
// Modes of the major scale, of melodic minor and of harmonic minor, plus symmetric and pentatonic scales.

export type ModeId =
  // major scale
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  // melodic minor family
  | 'melodic-minor'
  | 'dorian-b2'
  | 'lydian-augmented'
  | 'lydian-dominant'
  | 'mixolydian-b6'
  | 'locrian-sharp2'
  | 'altered'
  // harmonic minor family
  | 'harmonic-minor'
  | 'locrian-nat6'
  | 'ionian-sharp5'
  | 'dorian-sharp4'
  | 'phrygian-dominant'
  | 'lydian-sharp2'
  | 'ultralocrian'
  // others
  | 'whole-tone'
  | 'diminished'
  | 'major-pentatonic'
  | 'minor-pentatonic'
  | 'blues'
  | 'major-blues'
  | 'bebop-dominant'
  | 'bebop-major'
  | 'double-harmonic'
  | 'hungarian-minor'
  | 'hirajoshi'
  | 'in-sen'
  | 'augmented';

/** Semitones from the tonic up to (and including) the octave. */
export const MODE_STEPS: Record<ModeId, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
  locrian: [0, 1, 3, 5, 6, 8, 10, 12],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11, 12],
  'dorian-b2': [0, 1, 3, 5, 7, 9, 10, 12],
  'lydian-augmented': [0, 2, 4, 6, 8, 9, 11, 12],
  'lydian-dominant': [0, 2, 4, 6, 7, 9, 10, 12],
  'mixolydian-b6': [0, 2, 4, 5, 7, 8, 10, 12],
  'locrian-sharp2': [0, 2, 3, 5, 6, 8, 10, 12],
  altered: [0, 1, 3, 4, 6, 8, 10, 12],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11, 12],
  'locrian-nat6': [0, 1, 3, 5, 6, 9, 10, 12],
  'ionian-sharp5': [0, 2, 4, 5, 8, 9, 11, 12],
  'dorian-sharp4': [0, 2, 3, 6, 7, 9, 10, 12],
  'phrygian-dominant': [0, 1, 4, 5, 7, 8, 10, 12],
  'lydian-sharp2': [0, 3, 4, 6, 7, 9, 11, 12],
  ultralocrian: [0, 1, 3, 4, 6, 8, 9, 12],
  'whole-tone': [0, 2, 4, 6, 8, 10, 12],
  diminished: [0, 1, 3, 4, 6, 7, 9, 10, 12],
  'major-pentatonic': [0, 2, 4, 7, 9, 12],
  'minor-pentatonic': [0, 3, 5, 7, 10, 12],
  blues: [0, 3, 5, 6, 7, 10, 12],
  'major-blues': [0, 2, 3, 4, 7, 9, 12],
  'bebop-dominant': [0, 2, 4, 5, 7, 9, 10, 11, 12],
  'bebop-major': [0, 2, 4, 5, 7, 8, 9, 11, 12],
  'double-harmonic': [0, 1, 4, 5, 7, 8, 11, 12],
  'hungarian-minor': [0, 2, 3, 6, 7, 8, 11, 12],
  hirajoshi: [0, 2, 3, 7, 8, 12],
  'in-sen': [0, 1, 5, 7, 10, 12],
  augmented: [0, 3, 4, 7, 8, 11, 12],
};

export const MODE_FAMILY: Record<ModeId, 'major' | 'melodic' | 'harmonic' | 'other'> = {
  ionian: 'major',
  dorian: 'major',
  phrygian: 'major',
  lydian: 'major',
  mixolydian: 'major',
  aeolian: 'major',
  locrian: 'major',
  'melodic-minor': 'melodic',
  'dorian-b2': 'melodic',
  'lydian-augmented': 'melodic',
  'lydian-dominant': 'melodic',
  'mixolydian-b6': 'melodic',
  'locrian-sharp2': 'melodic',
  altered: 'melodic',
  'harmonic-minor': 'harmonic',
  'locrian-nat6': 'harmonic',
  'ionian-sharp5': 'harmonic',
  'dorian-sharp4': 'harmonic',
  'phrygian-dominant': 'harmonic',
  'lydian-sharp2': 'harmonic',
  ultralocrian: 'harmonic',
  'whole-tone': 'other',
  diminished: 'other',
  'major-pentatonic': 'other',
  'minor-pentatonic': 'other',
  blues: 'other',
  'major-blues': 'other',
  'bebop-dominant': 'other',
  'bebop-major': 'other',
  'double-harmonic': 'other',
  'hungarian-minor': 'other',
  hirajoshi: 'other',
  'in-sen': 'other',
  augmented: 'other',
};

/** Names (English / Hebrew) and spoken aliases accepted by the voice grammar. */
export const MODE_NAMES: Record<ModeId, { en: string; he: string; say: { en: string[]; he: string[] } }> = {
  ionian: { en: 'Ionian (major)', he: 'יוני (מז׳ור)', say: { en: ['ionian', 'major'], he: ['יוני', 'מז׳ור', 'מזור'] } },
  dorian: { en: 'Dorian', he: 'דורי', say: { en: ['dorian'], he: ['דורי', 'דוריאן'] } },
  phrygian: { en: 'Phrygian', he: 'פריגי', say: { en: ['phrygian'], he: ['פריגי', 'פריגיאן'] } },
  lydian: { en: 'Lydian', he: 'לידי', say: { en: ['lydian'], he: ['לידי', 'לידיאן'] } },
  mixolydian: { en: 'Mixolydian', he: 'מיקסולידי', say: { en: ['mixolydian', 'mixo'], he: ['מיקסולידי', 'מיקסו'] } },
  aeolian: { en: 'Aeolian (natural minor)', he: 'איולי (מינור טבעי)', say: { en: ['aeolian', 'natural minor', 'minor'], he: ['איולי', 'מינור טבעי', 'מינור'] } },
  locrian: { en: 'Locrian', he: 'לוקרי', say: { en: ['locrian'], he: ['לוקרי', 'לוקריאן'] } },
  'melodic-minor': { en: 'Melodic minor', he: 'מינור מלודי', say: { en: ['melodic minor', 'jazz minor'], he: ['מינור מלודי', 'מלודי'] } },
  'dorian-b2': { en: 'Dorian ♭2', he: 'דורי ♭2', say: { en: ['dorian flat two', 'dorian flat 2', 'phrygian natural six'], he: ['דורי במול שתיים', 'דורי במול 2'] } },
  'lydian-augmented': { en: 'Lydian augmented', he: 'לידי מוגדל', say: { en: ['lydian augmented', 'lydian sharp five'], he: ['לידי מוגדל', 'לידי אוגמנטד'] } },
  'lydian-dominant': { en: 'Lydian dominant', he: 'לידי דומיננטי', say: { en: ['lydian dominant', 'lydian flat seven'], he: ['לידי דומיננטי', 'לידי דומיננט'] } },
  'mixolydian-b6': { en: 'Mixolydian ♭6', he: 'מיקסולידי ♭6', say: { en: ['mixolydian flat six', 'mixolydian flat 6', 'hindu'], he: ['מיקסולידי במול שש', 'מיקסולידי במול 6'] } },
  'locrian-sharp2': { en: 'Locrian ♮2', he: 'לוקרי ♮2', say: { en: ['locrian natural two', 'locrian sharp two', 'half diminished'], he: ['לוקרי שתיים', 'לוקרי בקר שתיים', 'חצי מוקטן'] } },
  altered: { en: 'Altered (Superlocrian)', he: 'אלטרד (סופר־לוקרי)', say: { en: ['altered', 'super locrian', 'superlocrian'], he: ['אלטרד', 'סופר לוקרי', 'סופרלוקרי'] } },
  'harmonic-minor': { en: 'Harmonic minor', he: 'מינור הרמוני', say: { en: ['harmonic minor'], he: ['מינור הרמוני', 'הרמוני'] } },
  'locrian-nat6': { en: 'Locrian ♮6', he: 'לוקרי ♮6', say: { en: ['locrian natural six', 'locrian sharp six'], he: ['לוקרי שש', 'לוקרי בקר שש'] } },
  'ionian-sharp5': { en: 'Ionian ♯5', he: 'יוני ♯5', say: { en: ['ionian sharp five', 'ionian augmented'], he: ['יוני דיאז חמש', 'יוני מוגדל'] } },
  'dorian-sharp4': { en: 'Dorian ♯4', he: 'דורי ♯4', say: { en: ['dorian sharp four', 'ukrainian dorian'], he: ['דורי דיאז ארבע', 'דורי אוקראיני'] } },
  'phrygian-dominant': { en: 'Phrygian dominant', he: 'פריגי דומיננטי', say: { en: ['phrygian dominant', 'freygish'], he: ['פריגי דומיננטי', 'פריגיש', 'אהבה רבה'] } },
  'lydian-sharp2': { en: 'Lydian ♯2', he: 'לידי ♯2', say: { en: ['lydian sharp two', 'lydian sharp 2'], he: ['לידי דיאז שתיים', 'לידי דיאז 2'] } },
  ultralocrian: { en: 'Ultralocrian', he: 'אולטרה־לוקרי', say: { en: ['ultralocrian', 'ultra locrian'], he: ['אולטרה לוקרי', 'אולטרלוקרי'] } },
  'whole-tone': { en: 'Whole tone', he: 'טון שלם', say: { en: ['whole tone'], he: ['טון שלם', 'טונים שלמים'] } },
  diminished: { en: 'Diminished (half–whole)', he: 'מוקטן (חצי–שלם)', say: { en: ['diminished', 'half whole', 'octatonic'], he: ['מוקטן', 'דימיניש', 'חצי שלם'] } },
  'major-pentatonic': { en: 'Major pentatonic', he: 'פנטטוני מז׳ורי', say: { en: ['major pentatonic'], he: ['פנטטוני מז׳ורי', 'פנטטוני מזורי'] } },
  'minor-pentatonic': { en: 'Minor pentatonic', he: 'פנטטוני מינורי', say: { en: ['minor pentatonic'], he: ['פנטטוני מינורי'] } },
  blues: { en: 'Blues (minor)', he: 'בלוז (מינורי)', say: { en: ['blues', 'minor blues'], he: ['בלוז', 'בלוז מינורי'] } },
  'major-blues': { en: 'Major blues', he: 'בלוז מז׳ורי', say: { en: ['major blues'], he: ['בלוז מז׳ורי', 'בלוז מזורי'] } },
  'bebop-dominant': { en: 'Bebop dominant', he: 'ביבופ דומיננטי', say: { en: ['bebop dominant', 'bebop'], he: ['ביבופ דומיננטי', 'ביבופ'] } },
  'bebop-major': { en: 'Bebop major', he: 'ביבופ מז׳ורי', say: { en: ['bebop major'], he: ['ביבופ מז׳ורי', 'ביבופ מזורי'] } },
  'double-harmonic': { en: 'Double harmonic (Arabic)', he: 'הרמוני כפול (ערבי)', say: { en: ['double harmonic', 'arabic', 'byzantine'], he: ['הרמוני כפול', 'ערבי', 'חיג׳אז קאר'] } },
  'hungarian-minor': { en: 'Hungarian minor', he: 'מינור הונגרי', say: { en: ['hungarian minor', 'gypsy minor'], he: ['מינור הונגרי', 'הונגרי'] } },
  hirajoshi: { en: 'Hirajoshi', he: 'הירג׳ושי', say: { en: ['hirajoshi'], he: ['הירג׳ושי', 'הירגושי', 'יפני'] } },
  'in-sen': { en: 'In-sen', he: 'אין־סן', say: { en: ['in sen', 'insen'], he: ['אין סן', 'אינסן'] } },
  augmented: { en: 'Augmented (hexatonic)', he: 'מוגדל (הקסטוני)', say: { en: ['augmented scale', 'hexatonic', 'augmented'], he: ['סולם מוגדל', 'הקסטוני', 'מוגדל'] } },
};

/**
 * The near neighbours of each mode (one note apart) — used as distractors so a recognition
 * question tests the characteristic note, not a far-away scale.
 */
export function modeDistance(a: ModeId, b: ModeId): number {
  const A = new Set(MODE_STEPS[a]);
  const B = new Set(MODE_STEPS[b]);
  let d = 0;
  for (const x of A) if (!B.has(x)) d++;
  for (const x of B) if (!A.has(x)) d++;
  return d;
}
