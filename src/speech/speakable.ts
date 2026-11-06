// What the narrator actually says. Screen text is full of symbols a speech engine reads badly ("B♭maj7",
// "iv7–♭VII7–I", "6/8", "2+2+3") and of rhythm syllables that mean nothing spoken in a monotone ("ta ti-ti").
// speakable() turns symbols into words; text wrapped with unspoken() is shown but never read aloud.

type Lang = 'he' | 'en';

const OPEN = '⟦';
const CLOSE = '⟧';

/** Shown on screen, skipped by the narrator (rhythm syllables, long symbol strings). */
export const unspoken = (s: string) => `${OPEN}${s}${CLOSE}`;

/** Screen form: the unspoken markers removed, their content kept. */
export const shown = (text: string) => text.replace(/[⟦⟧]/g, '');

const W = {
  en: { flat: 'flat', sharp: 'sharp', maj7: 'major seven', m7: 'minor seven', m: 'minor', dom7: 'seven', dim7: 'diminished seven', dim: 'diminished', half: 'half diminished', aug: 'augmented', sus: 'sus', over: 'over', against: 'against', to: 'to', alt: 'altered', add: 'add' },
  he: { flat: 'במול', sharp: 'דיאז', maj7: 'מייג׳ור שבע', m7: 'מינור שבע', m: 'מינור', dom7: 'שבע', dim7: 'מוקטן שבע', dim: 'מוקטן', half: 'חצי מוקטן', aug: 'מוגדל', sus: 'סאס', over: 'על', against: 'נגד', to: 'ל־', alt: 'אלטרד', add: 'אד' },
};
const ROMAN_N: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
const NUM = {
  en: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'],
  he: ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע'],
};
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
  let out = `${m[1]}${acc(m[2])}`;
  if (q) out += ` ${qual[q] ?? q}`;
  if (m[4]) out += ` ${w.over} ${m[4]}${acc(m[5] ?? '')}`;
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

/** Narration text → words a speech engine says naturally. Pure. */
export function speakable(text: string, l: Lang): string {
  let t = text.replace(/⟦[^⟧]*⟧/g, ' ');
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
  t = t.replace(/\b(\d+):(\d+)\b/g, (_, a, b) => (l === 'he' ? `${a} ${W.he.to}${b}` : `${a} to ${b}`));
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
