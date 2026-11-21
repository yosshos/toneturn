// The jazz cadence chart library (docs/research/JAZZ-CADENCE-INVENTORY.md §1, gap list items 1–7): one short chart per
// standard cadence that resolves to a key, written in Roman numerals relative to the tonic so it runs in all 12 keys.
// The piano chart engine (chartDrills.ts, ref "cad:<id>"), the guitar comping and the bass walking families
// (drills/cadenceLibrary.ts) all read the same charts. Pure data and a Roman-numeral reader; no engine imports.
//
// Roman numerals: the degree is a major-scale step of the tonic (I … VII), with ♭ / ♯ for the chromatic ones — in a
// minor key the ♭III, ♭VI and ♭VII are written as such (jazz practice). Upper case is a major-third chord, lower case a
// minor-third chord; the suffix is the chord's quality ("ii7" = m7, "iiø7" = m7♭5, "♯i°7" = dim7, "V7♭9", "V7sus4",
// "im6", "IVmaj7", "IV/V" = IV over the bass V).

export type T2 = { en: string; he: string };

export interface Cadence {
  /** Stable id (item ids are built from it). */
  id: string;
  /** The inventory row (C1–C29) it realises. */
  row: string;
  name: T2;
  /** Bars split by "|", chords by spaces, in Roman numerals (ASCII b / # for flats and sharps). */
  roman: string;
  /** A minor-key cadence: the drill's tonic is { key, minor: true } and it files under minor. */
  minor?: boolean;
  /** Practice group: the ii–V family, the substitutes and borrowed approaches, the longer progressions. */
  group: 'core' | 'sub' | 'form';
  /** Has slash chords (the pedal): only the bass plays it (the piano and guitar voicings voice the upper chord only). */
  slash?: boolean;
  /** Chart tempo (♩); the drills start at about 55 % of it. */
  bpm: number;
}

const C = (id: string, row: string, en: string, he: string, roman: string, group: Cadence['group'], o: Partial<Cadence> = {}): Cadence => ({ id, row, name: { en, he }, roman, group, bpm: 140, ...o });

/** Every cadence of the library, in teaching order inside each group. */
export const CADENCES: Cadence[] = [
  // ── the ii–V family
  C('ii-v-i', 'C1', 'Major ii–V–I', 'ii–V–I מז׳ורי', 'ii7 V7 | Imaj7', 'core'),
  C('m-ii-v-i', 'C2', 'Minor ii–V–i', 'ii–V–i מינורי', 'iiø7 V7b9 | im6', 'core', { minor: true }),
  C('half-dim-to-major', 'C3', 'Half-diminished ii–V into major', 'ii–V חצי-מוקטן אל מז׳ור', 'iiø7 V7b9 | Imaj7', 'core'),
  C('turnaround', 'C4', 'Diatonic turnaround', 'טרנאראונד דיאטוני', 'Imaj7 vi7 | ii7 V7 | Imaj7', 'core'),
  C('long-turnaround', 'C5', 'Long turnaround from iii', 'טרנאראונד ארוך מ־iii', 'iii7 VI7 | ii7 V7 | Imaj7', 'core'),
  C('vi7-turnaround', 'C6', 'Turnaround with VI7', 'טרנאראונד עם VI7', 'Imaj7 VI7 | ii7 V7 | Imaj7', 'core'),
  C('m-turnaround', 'C28', 'Minor turnaround', 'טרנאראונד מינורי', 'im6 bVImaj7 | iiø7 V7b9 | im6', 'core', { minor: true }),
  C('secondary', 'C23', 'Secondary dominants', 'דומיננטות משניות', 'VI7 ii7 | II7 V7 | Imaj7', 'core'),
  C('extended-dominants', 'C7', 'Extended dominants (rhythm-changes bridge)', 'דומיננטות מורחבות (הגשר של ריתם צ׳יינג׳ס)', 'III7 | VI7 | II7 | V7 | Imaj7', 'core'),
  C('chain-whole', 'C18', 'ii–V chain down in whole steps', 'שרשרת ii–V יורדת בטונים', '#iv7 VII7 | iii7 VI7 | ii7 V7 | Imaj7', 'core'),
  C('chain-half', 'C19', 'Chromatic ii–V chain', 'שרשרת ii–V כרומטית', 'iii7 VI7 | biii7 bVI7 | ii7 V7 | Imaj7', 'core'),
  C('deceptive', 'C21', 'Deceptive cadence V–vi', 'קדנצה מטעה V–vi', 'ii7 V7 | vi7 | ii7 V7 | Imaj7', 'core'),
  C('m-deceptive', 'C22', 'Deceptive cadence to ♭VI, minor key', 'קדנצה מטעה אל ♭VI, בסולם מינורי', 'iiø7 V7b9 | bVImaj7 | iiø7 V7b9 | im6', 'core', { minor: true }),
  // ── substitutes and borrowed approaches
  C('tritone-sub', 'C9', 'Tritone substitution', 'תחליף טריטון', 'ii7 bII7 | Imaj7', 'sub'),
  C('m-tritone-sub', 'C9', 'Tritone substitution, minor key', 'תחליף טריטון, בסולם מינורי', 'iiø7 bII7 | im6', 'sub', { minor: true }),
  C('tritone-ii-v', 'C10', 'ii–V of the tritone sub', 'ii–V של תחליף הטריטון', 'bvi7 bII7 | Imaj7', 'sub'),
  C('tritone-turnaround', 'C11', 'Tritone turnaround', 'טרנאראונד טריטון', 'Imaj7 bIII7 | bVI7 bII7 | Imaj7', 'sub'),
  C('lady-bird', 'C12', 'Lady Bird turnaround', 'טרנאראונד Lady Bird', 'Imaj7 bIII7 | bVImaj7 bII7 | Imaj7', 'sub'),
  C('chromatic-dominants', 'C8', 'Chromatic dominants', 'דומיננטות כרומטיות', 'III7 bIII7 | II7 bII7 | Imaj7', 'sub'),
  C('backdoor', 'C13', 'Backdoor cadence', 'קדנצת הדלת האחורית', 'iv7 bVII7 | Imaj7', 'sub'),
  C('plagal-borrowed', 'C14', 'Plagal with the borrowed iv', 'פלגלית עם iv שאול', 'IVmaj7 | iv6 | Imaj7', 'sub'),
  C('m-plagal', 'C14', 'Plagal iv–i, minor key', 'פלגלית iv–i, בסולם מינורי', 'im6 | iv7 | im6', 'sub', { minor: true }),
  C('borrowed-approach', 'C15', 'Borrowed ♭VI–♭VII approach', 'גישה שאולה ♭VI–♭VII', 'bVImaj7 | bVII7 | Imaj7', 'sub'),
  C('m-flat-six-seven', 'C15', '♭VI–♭VII–i, minor key', '♭VI–♭VII–i, בסולם מינורי', 'bVImaj7 | bVII7 | im7', 'sub', { minor: true }),
  C('ending-dominants', 'C16', 'Ending on ♭VI7–♭II7', 'סיום ב־♭VI7–♭II7', 'bVI7 bII7 | Imaj7', 'sub'),
  C('ending-maj7', 'C16', 'Ending on ♭VImaj7–♭IImaj7', 'סיום ב־♭VImaj7–♭IImaj7', 'bVImaj7 bIImaj7 | Imaj7', 'sub'),
  C('sus', 'C20', 'Sus cadence', 'קדנצת sus', 'V7sus4 | V7 | Imaj7', 'sub'),
  C('sus-9', 'C20', 'Sus cadence with V9sus4', 'קדנצת sus עם V9sus4', 'V9sus4 | V7b9 | Imaj7', 'sub'),
  C('m-sus', 'C20', 'Sus cadence, minor key', 'קדנצת sus, בסולם מינורי', 'V7sus4 | V7b9 | im6', 'sub', { minor: true }),
  C('deceptive-flat-six', 'C22', 'Deceptive cadence to ♭VI', 'קדנצה מטעה אל ♭VI', 'ii7 V7 | bVImaj7 | ii7 V7 | Imaj7', 'sub'),
  // ── longer progressions
  C('coltrane', 'C17', 'Coltrane changes into I', 'מהלכי קולטריין אל I', 'ii7 bIII7 | bVImaj7 VII7 | IIImaj7 V7 | Imaj7', 'form', { bpm: 120 }),
  C('passing-dim-up', 'C24', 'Ascending passing diminished', 'מוקטנים עוברים בעלייה', 'Imaj7 #i°7 | ii7 #ii°7 | iii7 VI7 | ii7 V7 | Imaj7', 'form'),
  C('dim-walkdown', 'C25', 'Descending passing diminished', 'מוקטן עובר בירידה', 'iii7 biii°7 | ii7 V7 | Imaj7', 'form'),
  C('blues-turnaround', 'C26', 'Blues turnaround', 'טרנאראונד בלוז', 'I7 VI7 | ii7 V7 | I7', 'form'),
  C('bird-blues', 'C27', 'Bird-blues approach to IV', 'הגישה של בלוז בירד אל IV', 'Imaj7 | viiø7 III7 | vi7 II7 | v7 I7 | IV7', 'form'),
  C('m-blues-ending', 'C28', 'Minor-blues ending', 'סיום של בלוז מינורי', 'im6 | bVI7 | V7b9 | im6', 'form', { minor: true }),
  C('dom-pedal', 'C29', 'Dominant pedal', 'פדל על הדומיננטה', 'ii7/V | IV/V | bVI/V | V7 | Imaj7', 'form', { slash: true }),
];

export const cadenceById = (id: string): Cadence | undefined => CADENCES.find((c) => c.id === id);

const DEG: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
const LETTERS = 'CDEFGAB';
const NAT = [0, 2, 4, 5, 7, 9, 11];
const LOWER: Record<string, string> = { '': 'm', '7': 'm7', '6': 'm6', m7: 'm7', m6: 'm6', 'ø7': 'm7b5', '°7': 'dim7', '(maj7)': 'm(maj7)' };
const UPPER = new Set(['', '7', 'maj7', '6', '7b9', '7sus4', '9sus4']);
const ROMAN = /^([b#]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)([^/]*)(?:\/([b#]?)(VII|VI|V|IV|III|II|I))?$/;

export interface RomanChord {
  /** The chord symbol in C (ASCII, as chart texts are written: "Ebmaj7", "Dm7b5", "C#dim7", "Dm7/G"). */
  sym: string;
  /** Semitones of the root above the tonic. */
  root: number;
  /** Semitones of the bass above the tonic. */
  bass: number;
  /** The numeral for titles (♭ / ♯ as signs). */
  label: string;
}

const noteInC = (acc: string, num: string): { name: string; pc: number } => {
  const d = DEG[num.toUpperCase()];
  const a = acc === 'b' ? -1 : acc === '#' ? 1 : 0;
  return { name: LETTERS[d] + acc, pc: (NAT[d] + a + 12) % 12 };
};

/** One Roman-numeral token as a chord in C; throws on a token it can't read (the guard test reads every chart). */
export function romanChord(tok: string): RomanChord {
  const m = ROMAN.exec(tok);
  if (!m) throw new Error(`Roman numeral: ${tok}`);
  const [, acc, num, q, bAcc, bNum] = m;
  const lower = num === num.toLowerCase();
  const quality = lower ? LOWER[q] : UPPER.has(q) ? q : undefined;
  if (quality === undefined) throw new Error(`Roman numeral quality: ${tok}`);
  const r = noteInC(acc, num);
  const b = bNum ? noteInC(bAcc, bNum) : r;
  return {
    sym: r.name + quality + (bNum ? '/' + b.name : ''),
    root: r.pc,
    bass: b.pc,
    label: tok.replace(/b(?=[IViv])/g, '♭').replace(/#/g, '♯').replace(/(\d)b(\d)/g, '$1♭$2'),
  };
}

/** The chart text in C (or C minor): "Dm7 G7 | Cmaj7". */
export const cadenceText = (c: Cadence): string =>
  c.roman
    .split('|')
    .map((bar) => bar.trim().split(/\s+/).map((t) => romanChord(t).sym).join(' '))
    .join(' | ');

/** The chart as it is played: a cadence of fewer than four chords twice through (a take needs a few onsets to be timed). */
export const cadencePlayText = (c: Cadence): string => {
  const t = cadenceText(c);
  return t.split(/[\s|]+/).filter(Boolean).length < 4 ? `${t} | ${t}` : t;
};

/** The numerals in a line for titles: "ii7–V7–Imaj7". */
export const cadenceRoman = (c: Cadence): string => c.roman.split(/[\s|]+/).filter(Boolean).map((t) => romanChord(t).label).join('–');

/** The chart's title (its key is added by the engine): "Minor ii–V–i · iiø7–V7♭9–im6". */
export const cadenceTitle = (c: Cadence): T2 => {
  const r = cadenceRoman(c);
  return { en: `${c.name.en} · ${r}`, he: `${c.name.he} · ${r}` };
};
