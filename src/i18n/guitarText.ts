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

  // ---- MIDI guitar (B7) ----
  /** Advice only: a per-string MIDI guitar heard notes on other strings than the tab. */
  otherString: (n: number): L => ({ en: `${n} notes on another string than the tab — fine if that's your fingering`, he: `${n} צלילים על מיתר אחר מהטאב — בסדר אם זו האצבוע שלכם` }),
  /** The take's input line when a MIDI device is connected on a guitar item (the mic is then off — said, not silent). */
  inputMidi: { en: 'Guitar by MIDI — the microphone is off', he: `גיטרה ב־${ltr('MIDI')} — המיקרופון כבוי` } as L,
  inputMic: { en: 'Guitar by microphone — MIDI is connected', he: `גיטרה במיקרופון — ${ltr('MIDI')} מחובר` } as L,
  useMic: { en: 'Use the mic', he: 'למיקרופון' } as L,
  useMidi: { en: 'Use MIDI', he: `ל־${ltr('MIDI')}` } as L,
  /** Settings → MIDI: how a MIDI guitar sends its strings. */
  setChannels: { en: 'MIDI guitar: a channel per string', he: `גיטרת ${ltr('MIDI')}: ערוץ לכל מיתר` } as L,
  chAuto: { en: 'Auto', he: 'אוטומטי' } as L,
  chOff: { en: 'Off', he: 'כבוי' } as L,
  setBend: { en: 'Pitch-bend range (semitones)', he: 'טווח כיפוף (חצאי טונים)' } as L,

  // ---- calibration log (diagnostics, never uploaded) ----
  calibTitle: { en: 'Guitar calibration log', he: 'יומן כיול לגיטרה' } as L,
  calibHint: { en: 'Off by default. Keeps the raw numbers of each guitar take (strums, chord notes, bends, changes) on this device only, to tune the thresholds. Nothing is uploaded.', he: 'כבוי כברירת מחדל. שומר את המספרים הגולמיים של כל טייק גיטרה (פריטות, צלילי אקורד, כיפופים, החלפות) במכשיר הזה בלבד, לכיוון הספים. שום דבר לא נשלח.' } as L,
  calibOn: { en: 'Record guitar takes', he: 'לתעד טייקים של גיטרה' } as L,
  calibCount: (n: number): L => ({ en: `${n} takes kept`, he: `${n} טייקים שמורים` }),
  calibExport: { en: 'Export JSON', he: `ייצוא ${ltr('JSON')}` } as L,
  calibClear: { en: 'Clear', he: 'ניקוי' } as L,
};
