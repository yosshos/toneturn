// The scales and mode names shared by keyTheory.ts and drills/modeScales.ts (standard theory). No imports, so any module
// can read these at load time without an import cycle.

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
export const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
export const MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11];

/** The modes of melodic minor, degrees 2–7 (standard names). */
export const MM_MODES: [number, T2][] = [
  [1, t('dorian ♭2', 'דורי ♭2')],
  [2, t('lydian augmented', 'לידי מוגדל')],
  [3, t('lydian dominant', 'לידי דומיננטי')],
  [4, t('mixolydian ♭6', 'מיקסולידי ♭6')],
  [5, t('locrian ♮2', 'לוקרי ♮2')],
  [6, t('altered', 'אלטרד')],
];
/** The modes of harmonic minor, degrees 2–7 (standard names). */
export const HM_MODES: [number, T2][] = [
  [1, t('locrian ♮6', 'לוקרי ♮6')],
  [2, t('ionian ♯5', 'יוני ♯5')],
  [3, t('dorian ♯4', 'דורי ♯4')],
  [4, t('phrygian dominant', 'פריגי דומיננטי')],
  [5, t('lydian ♯2', 'לידי ♯2')],
  [6, t('altered ♭♭7', 'אלטרד ♭♭7')],
];

/** Intervals of mode `deg` of a scale, from its own tonic (D dorian from C major: 0 2 3 5 7 9 10). */
export const modeOf = (scale: number[], deg: number): number[] => [...scale.slice(deg), ...scale.slice(0, deg).map((x) => x + 12)].map((x) => x - scale[deg]);
