// What the narrator actually says. Screen text is full of symbols a speech engine reads badly ("B♭maj7",
// "iv7–♭VII7–I", "6/8", "2+2+3") and of rhythm syllables that mean nothing spoken in a monotone ("ta ti-ti").
// speakable() turns symbols into words; text wrapped with unspoken() is shown but never read aloud.

/** The languages the narrator can say: Hebrew and English, and the translated locales recorded in a voice of their
 *  own (src/speech/voice/manifest.ts LOCALE_VOICES). */
export type SpeechLang = 'he' | 'en' | 'es' | 'fr' | 'it' | 'pt';
type Lang = SpeechLang;

const OPEN = '⟦';
const CLOSE = '⟧';

/** Shown on screen, skipped by the narrator (rhythm syllables, long symbol strings). */
export const unspoken = (s: string) => `${OPEN}${s}${CLOSE}`;

/** Screen form: the unspoken markers removed, their content kept. */
export const shown = (text: string) => text.replace(/[⟦⟧]/g, '');

const W = {
  en: { flat: 'flat', sharp: 'sharp', maj7: 'major seven', m7: 'minor seven', m: 'minor', dom7: 'seven', dim7: 'diminished seven', dim: 'diminished', half: 'half diminished', aug: 'augmented', sus: 'sus', over: 'over', against: 'against', to: 'to', alt: 'altered', add: 'add' },
  es: { flat: 'bemol', sharp: 'sostenido', maj7: 'séptima mayor', m7: 'menor siete', m: 'menor', dom7: 'siete', dim7: 'disminuido siete', dim: 'disminuido', half: 'semidisminuido', aug: 'aumentado', sus: 'sus', over: 'sobre', against: 'contra', to: 'a', alt: 'alterado', add: 'add' },
  fr: { flat: 'bémol', sharp: 'dièse', maj7: 'majeur sept', m7: 'mineur sept', m: 'mineur', dom7: 'sept', dim7: 'diminué sept', dim: 'diminué', half: 'demi-diminué', aug: 'augmenté', sus: 'sus', over: 'sur', against: 'contre', to: 'à', alt: 'altéré', add: 'add' },
  it: { flat: 'bemolle', sharp: 'diesis', maj7: 'settima maggiore', m7: 'minore settima', m: 'minore', dom7: 'settima', dim7: 'diminuito settima', dim: 'diminuito', half: 'semidiminuito', aug: 'aumentato', sus: 'sus', over: 'su', against: 'contro', to: 'a', alt: 'alterato', add: 'add' },
  pt: { flat: 'bemol', sharp: 'sustenido', maj7: 'sétima maior', m7: 'menor com sétima', m: 'menor', dom7: 'sete', dim7: 'diminuto com sétima', dim: 'diminuto', half: 'meio diminuto', aug: 'aumentado', sus: 'sus', over: 'com baixo em', against: 'contra', to: 'para', alt: 'alterado', add: 'add' },
  he: { flat: 'במול', sharp: 'דיאז', maj7: 'מייג׳ור שבע', m7: 'מינור שבע', m: 'מינור', dom7: 'שבע', dim7: 'מוקטן שבע', dim: 'מוקטן', half: 'חצי מוקטן', aug: 'מוגדל', sus: 'סאס', over: 'על', against: 'נגד', to: 'ל־', alt: 'אלטרד', add: 'אד' },
};
const ROMAN_N: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
const NUM = {
  en: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'],
  he: ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע'],
  es: ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'],
  fr: ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept'],
  it: ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette'],
  pt: ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete'],
};
/** Fixed-do note names, as the locale's prose writes them (i18n/GLOSSARY.md): a chord symbol's letter is said this way. */
const SOLFEGE: Partial<Record<Lang, Record<string, string>>> = {
  es: { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' },
  fr: { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' },
  it: { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' },
  pt: { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' },
};
const noteWord = (letter: string, l: Lang) => SOLFEGE[l]?.[letter] ?? letter;
const METER_DEN = { he: { 2: 'חצאים', 4: 'רבעים', 8: 'שמיניות', 16: 'שש־עשריות' } as Record<number, string> };

/** One chord symbol ("B♭maj7", "F#m7b5", "G7", "Am", "C/E") as words; null when `tok` isn't one. */
function chordWords(tok: string, l: Lang): string | null {
  const m = /^([A-G])([♭b♯#]?)(maj7|Δ7?|M7|m7♭5|m7b5|ø7?|min7|m7|-7|dim7|°7|dim|°|aug|\+|m|min|7|9|11|13|6|sus4?|7sus4|add9|7alt)?(?:\/([A-G])([♭b♯#]?))?$/.exec(tok);
  if (!m) return null;
  const w = W[l];
  const acc = (a: string) => (a === '♭' || a === 'b' ? ` ${w.flat}` : a === '♯' || a === '#' ? ` ${w.sharp}` : '');
  const q = m[3] ?? '';
  const qual: Record<string, string> = {
    maj7: w.maj7, 'Δ': w.maj7, 'Δ7': w.maj7, M7: w.maj7, 'm7♭5': w.half, m7b5: w.half, 'ø': w.half, 'ø7': w.half,
    min7: w.m7, m7: w.m7, '-7': w.m7, dim7: w.dim7, '°7': w.dim7, dim: w.dim, '°': w.dim, aug: w.aug, '+': w.aug,
    m: w.m, min: w.m, '7': w.dom7, sus: `${w.sus} ${NUM[l][4]}`, sus4: `${w.sus} ${NUM[l][4]}`, '7sus4': `${w.dom7} ${w.sus} ${NUM[l][4]}`,
    add9: `${w.add} 9`, '7alt': `${w.dom7} ${w.alt}`, '6': '6', '9': '9', '11': '11', '13': '13',
  };
  let out = `${noteWord(m[1], l)}${acc(m[2])}`;
  if (q) out += ` ${qual[q] ?? q}`;
  if (m[4]) out += ` ${w.over} ${noteWord(m[4], l)}${acc(m[5] ?? '')}`;
  return out;
}

/** English number words 0–99 (the narrator's "1-2-3-5", "6/4", "16ths"); other languages keep the digits. */
const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EN_ORD: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
function enNumber(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : '');
  return String(n);
}
/** "3" → "third", "16" → "sixteenth", "21" → "twenty-first". */
function enOrdinal(n: number): string {
  const w = enNumber(n);
  if (/^\d+$/.test(w)) return `${w}th`;
  const m = /^(.*?)([a-z]+)$/.exec(w)!;
  const last = m[2];
  const ord = EN_ORD[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return m[1] + ord;
}
/** A number said in the language: English words (to 99), the others' 1–7 words, else the digits. */
const numWord = (n: number, l: Lang): string => (l === 'en' ? enNumber(n) : n >= 1 && n <= 7 ? NUM[l][n] : String(n));

const ROMAN_RE = '(?:VII|III|IV|VI|II|V|I|vii|iii|iv|vi|ii|v|i)';
/** A Roman-numeral chord's quality / figure after the numeral: 7, °, ø, maj7, the 6/4 and 6 inversions. */
const ROMAN_SUF = '(?:maj7|7|°7?|ø7?|6\\/5|6\\/4|4\\/3|4\\/2|65|64|43|42|6)';

/** A Roman-numeral chord ("♭VII7", "ii7", "V", "I6/4", "V/V", "I/5") as words; null otherwise. */
function romanWords(tok: string, l: Lang): string | null {
  const m = new RegExp(`^([♭b♯#]?)(${ROMAN_RE})(${ROMAN_SUF})?(?:\\/(?:(${ROMAN_RE})|(\\d)))?$`).exec(tok);
  if (!m) return null;
  const n = ROMAN_N[m[2].toLowerCase()];
  const w = W[l];
  const acc = m[1] === '♭' || m[1] === 'b' ? `${w.flat} ` : m[1] ? `${w.sharp} ` : '';
  const minor = m[2] === m[2].toLowerCase();
  const s = m[3];
  // inversion figures: "I6" one six, "I6/4" one six four, "V6/5" five six five, "V4/2" five four two
  const fig = s && /^[46]/.test(s) ? ' ' + s.replace('/', '').split('').map((d) => numWord(Number(d), l)).join(' ') : '';
  const q =
    s === '7' ? (minor ? ` ${w.m7}` : ` ${w.dom7}`) : s?.startsWith('°') ? ` ${s === '°7' ? w.dim7 : w.dim}` : s?.startsWith('ø') ? ` ${w.half}` : s === 'maj7' ? ` ${w.maj7}` : minor ? ` ${w.m}` : '';
  // "V/V" five of five (a secondary chord); "I/5" one over five (the bass on the 5th)
  const of = { en: 'of', he: 'של', es: 'de', fr: 'de', it: 'di', pt: 'de' }[l];
  const slash = m[4] ? ` ${of} ${romanWords(m[4], l)}` : m[5] ? ` ${w.over} ${numWord(Number(m[5]), l)}` : '';
  return `${acc}${NUM[l][n]}${q}${fig}${slash}`;
}

/** Tokens that are a Roman numeral for sure (a figure, an accidental, a slash, or a numeral that is no English word). */
const SLASH = `(?:\\/(?:${ROMAN_RE}|\\d))?`;
const STRONG_ROMAN = new RegExp(
  `^(?:[♭♯]${ROMAN_RE}${ROMAN_SUF}?${SLASH}|[b#](?:VII|III|IV|VI|II|V|I)${ROMAN_SUF}?${SLASH}|${ROMAN_RE}${ROMAN_SUF}${SLASH}|${ROMAN_RE}\\/(?:${ROMAN_RE}|\\d)|VII|III|IV|VI|II|V|vii|iii|iv|vi|ii)$`,
);
const WEAK_ROMAN = /^(?:I|i|v)$/;
/** Words that join numerals in prose: "I and V", "IV or V", "V to I", "from ii to V". */
const JOIN = new Set(['and', 'or', 'to', 'then', 'from', 'into', 'vs', 'and/or', '&', '+']);
/** Words before a numeral naming a chord: "on V", "resolve to I", "back to I", "over I". */
const BEFORE = new Set(['on', 'to', 'from', 'over', 'onto', 'into', 'toward', 'towards']);
/** Verbs the pronoun "I" never takes ("I is rest", "I sounds like home"): the numeral. */
const THIRD_PERSON = new Set(['is', 'was', 'has', 'does', 'goes', 'sounds', 'feels', 'leans', 'moves', 'needs', 'wants', 'pulls', 'resolves', 'becomes', 'gets', 'comes', 'stays', 'lands', 'falls', 'rises', 'chords']);
/** Words before an object, where the pronoun would be "me" ("swap I for iii", "instead of I"): with other numerals, the chord. */
const OBJECT_BEFORE = new Set(['for', 'of', 'with', 'at', 'by', 'swap', 'replace', 'replaces', 'play', 'plays', 'hear']);
/** Words after which a clause-final "I" is the pronoun ("than I.", "so do I.", "you and I."). */
const PRONOUN_BEFORE = new Set(['than', 'do', 'did', 'does', 'am', 'as', 'so', 'can', 'could', 'will', 'would', 'should', 'shall', 'have', 'had', 'may', 'might', 'must', 'and', 'or', 'nor', 'if', 'when', 'where', 'while', 'because', 'but', 'that', 'who', 'what', 'then', 'now', 'yes', 'no', 'me', 'you', 'here', 'there', 'wish', 'hope', 'think', 'say', 'said']);

/**
 * Lone Roman numerals (not in a dashed progression): converted when they clearly are numerals. The English pronoun "I"
 * (and a lone "i", "v") stays unless it stands next to another numeral, names a chord ("the I chord", "on I." at a
 * clause end) or is a title part on its own (", V,").
 */
function loneRomans(t: string, l: Lang): string {
  const re = /\S+/g;
  const toks: { s: number; e: number; core: string; pre: string; post: string }[] = [];
  for (let m; (m = re.exec(t)); ) {
    const raw = m[0];
    const cm = /^([("“'[]*)(.*?)([)"”'\],.;:!?]*)$/.exec(raw)!;
    toks.push({ s: m.index, e: m.index + raw.length, pre: cm[1], core: cm[2], post: cm[3] });
  }
  // the translated locales: "vi", "i" are words there (Spanish "vi", Italian "i"), so only the unmistakable forms
  const words = l !== 'en' && l !== 'he';
  const strong = toks.map((x) => STRONG_ROMAN.test(x.core) && !(words && /^(?:vii|iii|iv|vi|ii)$/.test(x.core)));
  const weak = toks.map((x) => !words && WEAK_ROMAN.test(x.core));
  const isNum = strong.slice();
  const hasStrong = strong.some(Boolean);
  const lower = (i: number) => toks[i]?.core.toLowerCase() ?? '';
  // a weak token joins a numeral within two tokens (skipping a joining word), or names a chord
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < toks.length; i++) {
      if (!weak[i] || isNum[i]) continue;
      const x = toks[i];
      const near = (d: number) => {
        const j = i + d;
        if (j < 0 || j >= toks.length) return false;
        if (isNum[j]) return true;
        const k = i + 2 * d;
        return JOIN.has(lower(j)) && k >= 0 && k < toks.length && isNum[k];
      };
      const nextChord = /^chords?$/.test(lower(i + 1));
      const prevIsThe = lower(i - 1) === 'the' || lower(i - 1) === 'a';
      const segStart = i === 0 || /[,;:]$/.test(toks[i - 1].post) || /[,;:]$/.test(toks[i - 1].core);
      const segEnd = i === toks.length - 1 || /[,.;:!?]/.test(x.post);
      const solo = segStart && segEnd && !x.pre;
      const clauseEnd = /[.,;:!?]/.test(x.post) || i === toks.length - 1;
      // after a preposition the pronoun would be "me": "on V", "resolve to I.", "other than I", "toward I"
      const named = (BEFORE.has(lower(i - 1)) && (clauseEnd || hasStrong)) || (lower(i - 2) === 'other' && lower(i - 1) === 'than');
      // the pronoun never ends a clause after a verb object ("…lands on vi instead of I.", "it wants I."): with other
      // numerals in the same text, a clause-final "I" is the chord unless a pronoun's word comes before it ("than I")
      const chordEnd = clauseEnd && hasStrong && i > 0 && !PRONOUN_BEFORE.has(lower(i - 1));
      // "I is rest", "I sounds like home": the pronoun takes "am", never a third-person verb; "swap I for iii": the
      // pronoun is never an object; a lowercase "i" / "v" is no English word, next to other numerals it is one
      const third = THIRD_PERSON.has(lower(i + 1));
      const object = hasStrong && OBJECT_BEFORE.has(lower(i - 1));
      const lowerNum = hasStrong && x.core !== 'I';
      if (near(-1) || near(1) || (nextChord && (prevIsThe || x.core !== 'I')) || solo || named || chordEnd || third || object || lowerNum) isNum[i] = true;
    }
  let out = '';
  let at = 0;
  toks.forEach((x, i) => {
    if (!isNum[i]) return;
    const w = romanWords(x.core, l);
    if (!w) return;
    out += t.slice(at, x.s) + x.pre + w + x.post;
    at = x.e;
  });
  return out + t.slice(at);
}

/** English ordinals: "3rds" → "thirds", "7th" → "seventh", "16ths" → "sixteenths", "1st" → "first". */
function ordinals(t: string): string {
  return t.replace(/\b(\d{1,2})(?:st|nd|rd|th)(s?)\b/g, (_, n, s) => enOrdinal(Number(n)) + s);
}

/** Digit patterns: "1-2-3-5" → "one two three five"; "3-2 clave" → "three-two clave"; "2–5" → "two to five". */
function digitPatterns(t: string, l: Lang): string {
  t = t.replace(/\b(\d{1,2}(?:-\d{1,2})+)(\s+(?:son\s+|rumba\s+)?clave)\b/gi, (_, g, rest) => g.split('-').map((d: string) => numWord(Number(d), l)).join('-') + rest);
  t = t.replace(/(?<![\d-])\b\d{1,2}(?:-\d{1,2})+\b(?!-?\d)/g, (g) => g.split('-').map((d) => numWord(Number(d), l)).join(' '));
  const to = l === 'he' ? 'עד' : W[l].to;
  t = t.replace(/\b(\d+)\s*[–—]\s*(\d+)\b/g, (_, a, b) => `${a} ${to} ${b}`);
  return t;
}

/**
 * Abbreviations the screen uses to stay short (owner 2026-11-21: "1 oct, RH" was read letter by letter): the narrator
 * says the words. Runs before the symbols are dropped, so "♩66" and the "·" between title parts are read too.
 */
const DYN_W: Record<string, Record<'en' | 'he', string>> = {
  ppp: { en: 'triple piano', he: 'פיאניסימו מאוד' }, pp: { en: 'pianissimo', he: 'פיאניסימו' }, p: { en: 'piano', he: 'פיאנו' },
  mp: { en: 'mezzo piano', he: 'מצו פיאנו' }, mf: { en: 'mezzo forte', he: 'מצו פורטה' }, f: { en: 'forte', he: 'פורטה' },
  ff: { en: 'fortissimo', he: 'פורטיסימו' }, fff: { en: 'triple forte', he: 'פורטיסימו מאוד' }, sfz: { en: 'sforzando', he: 'ספורצנדו' },
};
function expandAbbrev(t: string, l: Lang): string {
  // a translated locale's text was written out by its translator: only the pause between title parts
  if (l !== 'en' && l !== 'he') return t.replace(/\s*[·•]\s*/g, ', ');
  const en = l === 'en';
  // the tempo: "♩66" / "♩ = 66" (prose that says "BPM" is left as recorded)
  t = t.replace(/♩\s*=?\s*(\d{2,3})/g, (_, n) => (en ? ` ${n} beats a minute` : ` ${n} לדקה`));
  // the parts of a title: "C major · 2 oct · RH" — a short pause between them
  t = t.replace(/\s*[·•]\s*/g, ', ');
  // hands
  t = t.replace(/\bRH\b/g, en ? 'right hand' : 'יד ימין').replace(/\bLH\b/g, en ? 'left hand' : 'יד שמאל').replace(/\bHT\b|\bHS\b/g, (m) => (m === 'HT' ? (en ? 'hands together' : 'ידיים יחד') : en ? 'hands separately' : 'ידיים לחוד'));
  // octaves: "1 oct" / "2 oct" / "2 אוק׳"
  t = t.replace(/\b(\d)\s*oct\b\.?/g, (_, n) => (n === '1' ? 'one octave' : `${n} octaves`));
  t = t.replace(/(\d)\s*אוק[׳']/g, (_, n) => (n === '1' ? 'אוקטבה אחת' : `${n} אוקטבות`));
  // a technique title's dynamics ("even mf", "p then f", "cresc. out, dim. back"); prose listing the marks stays as recorded
  t = t.replace(/\b(cresc|dim)\. (out|back)\b/g, (_, d, w) => `${d === 'cresc' ? (en ? 'crescendo' : 'קרשנדו') : en ? 'diminuendo' : 'דימינואנדו'} ${w}`);
  t = t.replace(/\beven (pp|p|mp|mf|f|ff)\b/g, (_, d) => `even ${DYN_W[d][en ? 'en' : 'he']}`);
  t = t.replace(/\bp then f\b/g, en ? 'piano then forte' : 'פיאנו ואז פורטה');
  return t;
}

/** Narration text → words a speech engine says naturally. Pure. */
export function speakable(text: string, l: Lang): string {
  let t = text.replace(/⟦[^⟧]*⟧/g, ' ');
  t = expandAbbrev(t, l);
  // Emoji, arrows and decorative symbols are for the eye.
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{266C}\u{2670}-\u{27BF}\u{2B00}-\u{2BFF}↗↘⌣⌢→←↑↓⬆⬇♩♪♫·•|]/gu, ' ').replace(/️/g, '');
  // Progressions: "iv7–♭VII7–I" → "four minor seven, flat seven seven, one"; "I–IV–I6/4–V7–I" (a figure, a slash).
  const rn = `[♭b♯#]?${ROMAN_RE}${ROMAN_SUF}?(?:\\/(?:${ROMAN_RE}|\\d))?`;
  t = t.replace(new RegExp(`(?<![A-Za-z0-9])${rn}(?:\\s*[–—-]\\s*${rn})+(?![A-Za-z0-9])`, 'g'), (seq) =>
    seq
      .split(/\s*[–—-]\s*/)
      .map((r) => romanWords(r, l) ?? r)
      .join(', '),
  );
  // "Cm(maj7)" / "m(maj7)": the parentheses belong to the chord symbol (they are dropped further down)
  t = t.replace(/(^|[^A-Za-z])([A-G][♭♯b#]?)?m\(maj7\)/g, (_, pre, root) => `${pre}${root ? `${chordWords(`${root}m`, l)} ` : `${W[l].m} `}${W[l].maj7}`);
  // English: ordinals ("3rds", "7th", "16ths") and digit patterns ("1-2-3-5", "3-2 clave", "2–5") said as words.
  if (l === 'en') t = ordinals(t);
  t = digitPatterns(t, l);
  // Lone numerals ("on V", "the I chord", "V7", "vii°", "I/5"); the pronoun "I" stays.
  t = loneRomans(t, l);
  // Meters: "6/8" → "six eight" / "6 שמיניות"; ratios "3:1" → "3 to 1"; "2 against 1" stays.
  t = t.replace(/\b(\d{1,2})\/(2|4|8|16)\b/g, (_, a, b) => (l === 'he' ? `${a} ${METER_DEN.he[Number(b)]}` : l === 'en' ? `${enNumber(Number(a))} ${enNumber(Number(b))}` : `${a} ${b}`));
  t = t.replace(/\b(\d+):(\d+)\b/g, (_, a, b) => (l === 'he' ? `${a} ${W.he.to}${b}` : `${a} ${W[l].to} ${b}`));
  t = t.replace(/\b(\d)(?:\+(\d))+\b/g, (g) => g.split('+').join(', '));
  // Chord symbols and note names with accidentals, token by token.
  t = t.replace(/(^|[\s(,;:"“”'׳])([A-G][♭b♯#]?[^\s,.;:!?)"“”]*)/g, (all, pre, tok, at: number, whole: string) => {
    // English "Am I…?" is the verb, not A minor
    if (l === 'en' && tok === 'Am' && /^\s+I\b/.test(whole.slice(at + all.length))) return all;
    const c = chordWords(tok, l);
    return c ? `${pre}${c}` : all;
  });
  // Lone tensions: "♯9 ♭13" → "sharp 9, flat 13".
  t = t.replace(/(^|\s|\()([♭♯])(\d{1,2})\b/g, (_, pre, a, n) => `${pre}${a === '♭' ? W[l].flat : W[l].sharp} ${n}`);
  t = t.replace(/[♭]/g, ` ${W[l].flat} `).replace(/[♯]/g, ` ${W[l].sharp} `);
  // What is left of the symbols: a lone "°" / "ø", a slash ("3rd / 6th", "A / B", "1/2"), parentheses (kept: the words).
  t = t.replace(/°/g, ` ${W[l].dim} `).replace(/ø/g, ` ${W[l].half} `);
  // two numbers: said one after the other, as musicians say them ("6/9" six nine, figures "6/5" six five, "60/40")
  t = t.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (_, a, b) => (l === 'en' ? `${enNumber(Number(a))} ${enNumber(Number(b))}` : `${a} ${b}`));
  const or = { en: 'or', he: 'או', es: 'o', fr: 'ou', it: 'o', pt: 'ou' }[l];
  t = t.replace(/\band\/or\b/g, 'and or').replace(/\b([A-Z])\/([A-Z])\b/g, `$1 ${W[l].over} $2`).replace(/\s*\/\s*/g, ` ${or} `);
  t = t.replace(/\(\s*\)/g, ' ').replace(/\s*[()]\s*/g, ', ');
  t = t.replace(/([:;,.!?])(\s*,)+/g, '$1').replace(/,\s*([.!?;:])/g, '$1').replace(/^\s*,\s*/, '').replace(/\s*,\s*$/, '');
  // Tidy: "סופרים: ." → "סופרים.", doubled spaces, space before punctuation.
  t = t
    .replace(/[:：]\s*([.!?])/g, '$1')
    .replace(/[:：]\s*$/g, '.')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return t;
}
