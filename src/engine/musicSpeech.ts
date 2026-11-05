// Spoken music vocabulary: every way players say the same thing maps to one canonical form, so the
// parsers accept synonyms — "#11", "♯4", "b5", "tritone", "augmented fourth", "diminished fifth";
// "Δ", "maj7", "major seven", "triangle"; "ø", "m7b5", "half diminished"; Hebrew דיאז / במול / בקר / טריטון.

const NUM_WORDS: Record<string, string> = {
  '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
};
const ORDINALS: Record<string, string> = {
  first: 'one', second: 'two', third: 'three', fourth: 'four', fifth: 'five', sixth: 'six', seventh: 'seven', eighth: 'eight', ninth: 'nine', tenth: 'ten', eleventh: 'eleven', twelfth: 'twelve', thirteenth: 'thirteen',
  '2nd': 'two', '3rd': 'three', '4th': 'four', '5th': 'five', '6th': 'six', '7th': 'seven', '8th': 'eight', '9th': 'nine', '11th': 'eleven', '13th': 'thirteen',
  thirds: 'three', fifths: 'five', sevenths: 'seven', octaves: 'octave',
};
// Hebrew number words that speech recognition may produce for tensions.
const HE_NUMS: Record<string, string> = {
  'אחת עשרה': 'eleven', 'אחד עשרה': 'eleven', 'אחד עשר': 'eleven', 'שלוש עשרה': 'thirteen', 'שלושה עשר': 'thirteen', 'תשע': 'nine', 'תשיעית': 'nine',
  שתיים: 'two', שתים: 'two', שנייה: 'two', שניה: 'two', שלוש: 'three', שלישית: 'three', ארבע: 'four', רביעית: 'four', חמש: 'five', חמישית: 'five', שש: 'six', שישית: 'six', שבע: 'seven', שביעית: 'seven', שמונה: 'eight',
};

const HE_WORDS: Record<string, string> = {
  יוני: 'ionian', דורי: 'dorian', פריגי: 'phrygian', לידי: 'lydian', מיקסולידי: 'mixolydian', איולי: 'aeolian', איאולי: 'aeolian', אאולי: 'aeolian', לוקרי: 'locrian',
  מינור: 'minor', מינורי: 'minor', 'מז׳ור': 'major', "מז'ור": 'major', מזור: 'major', 'מז׳ורי': 'major', "מז'ורי": 'major', מזורי: 'major',
  הרמוני: 'harmonic', מלודי: 'melodic', דומיננטי: 'dominant', דומיננט: 'dominant', מוגדל: 'augmented', מוקטן: 'diminished',
  אלטרד: 'altered', סופר: 'super', פנטטוני: 'pentatonic', בלוז: 'blues', טבעי: 'natural', ביבופ: 'bebop', הונגרי: 'hungarian', כפול: 'double',
};

/**
 * Canonical spoken form: lower case, symbols spelled out (♯/# → sharp, ♭/b → flat, ♮ → natural, Δ → major
 * seven, ø → half diminished, ° → diminished, + → augmented), numbers and ordinals as cardinal words,
 * Hebrew accidentals translated. Returns space-separated words with a leading and trailing space.
 */
export function canonMusic(text: string): string {
  let t = ` ${text} `;
  // Chord symbols (case matters before lower-casing: M7 = major seven, m7 = minor seven).
  t = t
    .replace(/m7\s*\(?\s*[b♭]5\s*\)?/gi, ' half diminished ')
    .replace(/ø7?/g, ' half diminished ')
    .replace(/(maj|ma|Δ|△)\s*7/gi, ' major seven ')
    .replace(/[Δ△]/g, ' major seven ')
    .replace(/(^|[\s(])M7\b/g, '$1 major seven ')
    .replace(/([A-G][#b♯♭]?)M7\b/g, '$1 major seven ')
    .replace(/([A-G][#b♯♭]?)(m|-|min|mi)7\b/g, '$1 minor seven ')
    .replace(/°\s*7|dim\s*7/gi, ' diminished seven ')
    .replace(/°/g, ' diminished ')
    .replace(/\b(min|mi)\s*7\b/gi, ' minor seven ')
    .replace(/(^|[\s(])(m|-)7\b/g, '$1 minor seven ')
    .replace(/\bdom\s*7\b/gi, ' dominant seven ')
    .replace(/\bsus\s*4?\b/gi, ' suspended four ')
    .replace(/\badd\s*9\b/gi, ' add nine ');
  t = t.toLowerCase();
  // Accidentals before numbers: #11, ♯4, b5, ♭9, ♮6.
  t = t
    .replace(/[#♯]\s*(\d+)/g, ' sharp $1 ')
    .replace(/(^|[\s(/])[b♭]\s*(\d+)/g, '$1 flat $2 ')
    .replace(/♮\s*(\d+)/g, ' natural $1 ')
    .replace(/(\d+)\s*[#♯]/g, ' sharp $1 ')
    .replace(/(\d+)\s*[b♭](?![a-z])/g, ' flat $1 ')
    .replace(/[#♯]/g, ' sharp ')
    .replace(/♭/g, ' flat ')
    .replace(/♮/g, ' natural ')
    .replace(/\+/g, ' augmented ');
  // Hebrew accidentals and words.
  t = t
    .replace(/דיאז/g, ' sharp ')
    .replace(/במול/g, ' flat ')
    .replace(/בקר/g, ' natural ')
    .replace(/טריטון/g, ' tritone ')
    .replace(/חצי טון/g, ' semitone ')
    .replace(/חצי מוקטן/g, ' half diminished ');
  for (const [he, w] of Object.entries(HE_NUMS).sort((a, b) => b[0].length - a[0].length)) t = t.replaceAll(` ${he} `, ` ${w} `);
  // Hebrew music words → the canonical (English) vocabulary, so every alias works in both languages.
  t = ` ${t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => HE_WORDS[w.replace(/^[וה](?=..)/, '')] ?? HE_WORDS[w] ?? w)
    .join(' ')} `;
  // Punctuation → spaces; numbers and ordinals → words.
  t = t.replace(/[.,!?;:"“”()\[\]/\\–—-]/g, ' ').replace(/[׳']/g, "'");
  const words = t
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUM_WORDS[w] ?? ORDINALS[w] ?? w)
    .map((w) => (w === 'diminish' || w === 'dim' ? 'diminished' : w === 'aug' || w === 'augment' ? 'augmented' : w === 'maj' ? 'major' : w === 'min' ? 'minor' : w === 'dom' ? 'dominant' : w === 'triton' ? 'tritone' : w === 'perf' ? 'perfect' : w));
  let s = ` ${words.join(' ')} `;
  // Shorthand phrases.
  s = s
    .replace(/ half dim /g, ' half diminished ')
    .replace(/ minus seven /g, ' minor seven ')
    .replace(/ triangle( seven)? /g, ' major seven ')
    .replace(/ devil's interval | devil s interval | devils interval /g, ' tritone ')
    .replace(/ half step | half tone /g, ' semitone ')
    .replace(/ whole step /g, ' whole tone ');
  return s.replace(/\s+/g, ' ');
}

/** Interval classes (semitones 0–12) and every common spoken name; longest phrase wins. */
const INTERVAL_NAMES: [string, number][] = [
  ['unison', 0], ['prime', 0],
  ['minor two', 1], ['flat two', 1], ['flat nine', 1], ['minor nine', 1], ['semitone', 1], ['augmented one', 1],
  ['major two', 2], ['whole tone', 2], ['two', 2], ['nine', 2], ['major nine', 2], ['diminished three', 2],
  ['minor three', 3], ['flat three', 3], ['sharp two', 3], ['sharp nine', 3], ['augmented two', 3],
  ['major three', 4], ['three', 4], ['diminished four', 4], ['flat four', 4],
  ['perfect four', 4 + 1], ['four', 5], ['eleven', 5], ['augmented three', 5], ['sharp three', 5],
  ['tritone', 6], ['sharp four', 6], ['sharp eleven', 6], ['augmented four', 6], ['augmented eleven', 6], ['flat five', 6], ['diminished five', 6],
  ['perfect five', 7], ['five', 7], ['diminished six', 7],
  ['minor six', 8], ['flat six', 8], ['flat thirteen', 8], ['sharp five', 8], ['augmented five', 8],
  ['major six', 9], ['six', 9], ['thirteen', 9], ['major thirteen', 9], ['diminished seven', 9],
  ['minor seven', 10], ['flat seven', 10], ['dominant seven', 10], ['augmented six', 10],
  ['major seven', 11], ['diminished eight', 11],
  ['octave', 12], ['eight', 12], ['perfect eight', 12],
  // Hebrew names that pass through canonMusic unchanged.
  ['סקונדה קטנה', 1], ['סקונדה גדולה', 2], ['טרצה קטנה', 3], ['טרצה גדולה', 4], ['טרצה', 4], ['קוורטה', 5], ['קווינטה מוקטנת', 6], ['קוורטה מוגדלת', 6],
  ['קווינטה', 7], ['קוינטה', 7], ['סקסטה קטנה', 8], ['סקסטה גדולה', 9], ['ספטימה קטנה', 10], ['ספטימה גדולה', 11], ['אוקטבה', 12],
];

/** The interval class named in a transcript (0–12 semitones), or null. Longest matching phrase wins. */
export function intervalClassOf(text: string): number | null {
  const s = canonMusic(text);
  let best: { len: number; ic: number } | null = null;
  for (const [name, ic] of INTERVAL_NAMES) {
    const p = ` ${name} `;
    if (s.includes(p) && (!best || p.length > best.len)) best = { len: p.length, ic };
  }
  return best ? best.ic : null;
}

/** Seventh-chord qualities and their spoken names (canonical forms). */
export const SEVENTH_NAMES: [string, 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7'][] = [
  ['major seven', 'maj7'], ['major', 'maj7'],
  ['dominant seven', '7'], ['dominant', '7'], ['seven', '7'],
  ['minor seven', 'm7'], ['minor', 'm7'],
  ['half diminished', 'm7b5'], ['minor seven flat five', 'm7b5'],
  ['diminished seven', 'dim7'], ['fully diminished', 'dim7'],
  ['מז׳ור שביעית', 'maj7'], ["מז'ור שביעית", 'maj7'], ['מז׳ור', 'maj7'], ["מז'ור", 'maj7'], ['מזור', 'maj7'], ['מייג׳ור', 'maj7'],
  ['דומיננטה', '7'], ['דומיננטי', '7'], ['דומיננט', '7'], ['ספטאקורד', '7'], ['seven', '7'],
  ['מינור שביעית', 'm7'], ['מינור', 'm7'],
  ['מוקטן', 'dim7'],
];

/** Seventh-chord quality named in a transcript (longest phrase wins), or null. */
export function seventhOf(text: string): 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | null {
  const s = canonMusic(text);
  let best: { len: number; v: 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' } | null = null;
  for (const [name, v] of SEVENTH_NAMES) {
    const p = ` ${name} `;
    if (s.includes(p) && (!best || p.length > best.len)) best = { len: p.length, v };
  }
  return best ? best.v : null;
}

/** Chord tensions / extensions in a transcript: "sharp eleven", "flat nine", "thirteen" … (canonical list). */
export function tensionsOf(text: string): string[] {
  const s = canonMusic(text);
  const out: string[] = [];
  for (const m of s.matchAll(/ (?:(sharp|flat|natural) )?(nine|eleven|thirteen|five)(?= )/g)) {
    if (m[2] === 'five' && !m[1]) continue; // a plain "five" is not a tension
    out.push(`${m[1] === 'sharp' ? '#' : m[1] === 'flat' ? 'b' : ''}${{ nine: 9, eleven: 11, thirteen: 13, five: 5 }[m[2] as 'nine']}`);
  }
  if (/ (altered|alt) /.test(s)) out.push('alt');
  return [...new Set(out)];
}
