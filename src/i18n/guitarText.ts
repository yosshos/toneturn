// GUITAR-AUDIT (2026-11-17): the words of the guitar fixes — chord completeness, the string / fret vs finger
// hypothesis, chord boxes, the tab's finger row and the neck. He + en, kept out of strings.ts like measureText.ts.
// Few words, no emoji; note and string names stay Latin (the views isolate them).

export type L = { en: string; he: string };

/** U+2066 … U+2069: keeps a numeric range ("5–6") left-to-right inside a Hebrew line that is a plain string. */
export const ltr = (s: string): string => `⁦${s}⁩`;

const andHe = (xs: string[]): string => xs.map((x, i) => (i === 0 ? `ה־${x}` : `וה־${x}`)).join(' ');

export const GT = {
  /**
   * B1: the chord notes that did not sound — observed sound, not a cause. `names` = up to two note names, `str` = the
   * string when only one note is missing and the tab gives it.
   */
  chordMiss: (names: string[], missed: number, checked: number, str: { str: number; open: string } | null): L => {
    const two = names.length > 1;
    const inEn = checked > 1 ? `in ${missed} of ${checked} chords` : 'in the chord';
    const inHe = checked > 1 ? `ב־${missed} מתוך ${checked} אקורדים` : 'באקורד';
    const sEn = str ? ` — string ${str.str} (${str.open})` : '';
    const sHe = str ? ` — מיתר ${str.str} (${str.open})` : '';
    return {
      en: `The ${names.join(' and ')} didn't sound ${inEn}${sEn}`,
      he: `${andHe(names)} לא ${two ? 'נשמעו' : 'נשמע'} ${inHe}${sHe}`,
    };
  },

  // ---- long-term: places (facts) and a fretting finger (a hypothesis only) ----
  /** A place on the neck that keeps missing (string × fret): a fact. */
  weakPlace: (str: number, fret: number, pct: number): L =>
    fret === 0
      ? { en: `Open string ${str} misses ${pct}% of the time`, he: `מיתר ${str} פתוח מחטיא ב־${pct}% מהפעמים` }
      : { en: `String ${str}, fret ${fret} misses ${pct}% of the time`, he: `מיתר ${str}, סריג ${fret} מחטיא ב־${pct}% מהפעמים` },
  weakPlaceNote: { en: 'Slowly on that spot: press right behind the fret, let it ring', he: 'לאט על המקום הזה: ללחוץ ממש מאחורי הסריג ולתת לצליל לצלצל' } as L,
  /** The finger hypothesis: the misses follow the suggested finger across places, not one place. */
  fingerHyp: (f: number, places: number, strings: string): L => ({
    en: `Possibly finger ${f}: misses follow it across ${places} places (strings ${strings})`,
    he: `ייתכן שזו אצבע ${f}: הטעויות עוברות איתה ל־${places} מקומות (מיתרים ${ltr(strings)})`,
  }),
  fingerHypNote: (f: number): L => ({
    en: `Check finger ${f}: on its tip, right behind the fret. If you finger it another way, say so in the profile`,
    he: `לבדוק את אצבע ${f}: על הקצה, ממש מאחורי הסריג. אם אתם מאצבעים אחרת, אפשר לסמן זאת בפרופיל`,
  }),

  // ---- views ----
  fingerRow: { en: 'finger', he: 'אצבע' } as L,
  chordNow: { en: 'Now', he: 'עכשיו' } as L,
  chordNext: { en: 'Next', he: 'הבא' } as L,
  chordBox: (name: string): L => ({ en: `Chord box: ${name}`, he: `דיאגרמת אקורד: ${name}` }),
  baseFret: (f: number): L => ({ en: `fret ${f}`, he: `סריג ${f}` }),
  /** "strings 5–6" with the range isolated, for plain-string contexts. */
  strings: (range: string): L => ({ en: `strings ${range}`, he: `מיתרים ${ltr(range)}` }),
};
