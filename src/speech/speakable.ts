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

/** A Roman-numeral chord ("♭VII7", "ii7", "V") as words; null otherwise. */
function romanWords(tok: string, l: Lang): string | null {
  const m = /^([♭b♯#]?)(vii|iii|iv|vi|ii|v|i|VII|III|IV|VI|II|V|I)(7|°7?|ø7?|maj7)?$/.exec(tok);
  if (!m) return null;
  const n = ROMAN_N[m[2].toLowerCase()];
  const w = W[l];
  const acc = m[1] === '♭' || m[1] === 'b' ? `${w.flat} ` : m[1] ? `${w.sharp} ` : '';
  const minor = m[2] === m[2].toLowerCase();
  const q = m[3] === '7' ? (minor ? ` ${w.m7}` : ` ${w.dom7}`) : m[3]?.startsWith('°') ? ` ${w.dim}` : m[3]?.startsWith('ø') ? ` ${w.half}` : m[3] === 'maj7' ? ` ${w.maj7}` : minor ? ` ${w.m}` : '';
  return `${acc}${NUM[l][n]}${q}`;
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
  // Progressions: "iv7–♭VII7–I" → "four minor seven, flat seven seven, one".
  t = t.replace(/(?:[♭b♯#]?(?:VII|III|IV|VI|II|V|I|vii|iii|iv|vi|ii|v|i)(?:7|°7?|ø7?|maj7)?)(?:\s*[–—-]\s*[♭b♯#]?(?:VII|III|IV|VI|II|V|I|vii|iii|iv|vi|ii|v|i)(?:7|°7?|ø7?|maj7)?)+/g, (seq) =>
    seq
      .split(/\s*[–—-]\s*/)
      .map((r) => romanWords(r, l) ?? r)
      .join(', '),
  );
  // Meters: "6/8" → "6 eight" / "6 שמיניות"; ratios "3:1" → "3 to 1"; "2 against 1" stays.
  t = t.replace(/\b(\d{1,2})\/(2|4|8|16)\b/g, (_, a, b) => (l === 'he' ? `${a} ${METER_DEN.he[Number(b)]}` : `${a} ${b}`));
  t = t.replace(/\b(\d+):(\d+)\b/g, (_, a, b) => (l === 'he' ? `${a} ${W.he.to}${b}` : `${a} ${W[l].to} ${b}`));
  t = t.replace(/\b(\d)(?:\+(\d))+\b/g, (g) => g.split('+').join(', '));
  // Chord symbols and note names with accidentals, token by token.
  t = t.replace(/(^|[\s(,;:"“”'׳])([A-G][♭b♯#]?[^\s,.;:!?)"“”]*)/g, (all, pre, tok) => {
    const c = chordWords(tok, l);
    return c ? `${pre}${c}` : all;
  });
  // Lone tensions: "♯9 ♭13" → "sharp 9, flat 13".
  t = t.replace(/(^|\s|\()([♭♯])(\d{1,2})\b/g, (_, pre, a, n) => `${pre}${a === '♭' ? W[l].flat : W[l].sharp} ${n}`);
  t = t.replace(/[♭]/g, ` ${W[l].flat} `).replace(/[♯]/g, ` ${W[l].sharp} `);
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
