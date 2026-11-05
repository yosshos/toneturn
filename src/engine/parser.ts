// Deterministic, exercise-aware transcript parser.
// It never consults the expected answer: ambiguity is reported, not resolved.

import { canonMusic, intervalClassOf, seventhOf } from './musicSpeech';
import { MODE_NAMES } from './modes';
import type { PitchClass } from './pitch';

export type Command = 'repeat' | 'skip' | 'stop' | 'explain';

export type ParseResult<T> =
  | { kind: 'answer'; value: T; heard: string }
  | { kind: 'command'; command: Command; heard: string }
  | { kind: 'ambiguous'; candidates: T[]; heard: string }
  | { kind: 'unrecognized'; heard: string };

/** Lowercase, strip punctuation/niqqud, split into tokens. Hebrew prefix letters are handled per-lookup. */
export function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '') // Hebrew niqqud / cantillation
    .replace(/[׳']/g, "'")
    .replace(/[.,!?;:"“”()\-–—]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const HEB_PREFIXES = ['ו', 'ה', 'ב', 'ל', 'ש'];

/** Look up a token, also trying it without common one-letter Hebrew prefixes (ו/ה/ב/ל/ש). */
function lookup<V>(table: Map<string, V>, token: string): V | undefined {
  const direct = table.get(token);
  if (direct !== undefined) return direct;
  if (/^[א-ת]/.test(token) && token.length > 2) {
    for (const p of HEB_PREFIXES) {
      if (token.startsWith(p)) {
        const v = table.get(token.slice(1));
        if (v !== undefined) return v;
        // two stacked prefixes, e.g. "וה"
        for (const q of HEB_PREFIXES) {
          if (token.slice(1).startsWith(q) && token.length > 3) {
            const v2 = table.get(token.slice(2));
            if (v2 !== undefined) return v2;
          }
        }
      }
    }
  }
  return undefined;
}

// ---------- Commands ----------
const COMMAND_TOKENS = new Map<string, Command>([
  ['repeat', 'repeat'], ['again', 'repeat'], ['replay', 'repeat'],
  ['שוב', 'repeat'], ['חזור', 'repeat'], ['חזרה', 'repeat'], ['תחזור', 'repeat'], ['תחזרי', 'repeat'],
  ['skip', 'skip'], ['next', 'skip'], ['pass', 'skip'],
  ['דלג', 'skip'], ['תדלג', 'skip'], ['תדלגי', 'skip'], ['הבא', 'skip'],
  ['stop', 'stop'], ['pause', 'stop'], ['quit', 'stop'],
  ['עצור', 'stop'], ['תעצור', 'stop'], ['תעצרי', 'stop'], ['הפסק', 'stop'], ['הפסקה', 'stop'],
  ['explain', 'explain'], ['help', 'explain'], ['הסבר', 'explain'], ['תסביר', 'explain'], ['תסבירי', 'explain'], ['עזרה', 'explain'],
]);
const COMMAND_PHRASES: [string[], Command][] = [
  [['one', 'more', 'time'], 'repeat'],
  [['עוד', 'פעם'], 'repeat'],
  [['say', 'again'], 'repeat'],
];

function findCommands(tokens: string[]): Command[] {
  const found = new Set<Command>();
  for (const t of tokens) {
    const c = lookup(COMMAND_TOKENS, t);
    if (c) found.add(c);
  }
  for (const [phrase, c] of COMMAND_PHRASES) {
    for (let i = 0; i + phrase.length <= tokens.length; i++) {
      if (phrase.every((w, j) => tokens[i + j] === w)) found.add(c);
    }
  }
  return [...found];
}

function phraseCovers(tokens: string[], phrase: string[]): number[] {
  for (let i = 0; i + phrase.length <= tokens.length; i++) {
    if (phrase.every((w, j) => tokens[i + j] === w)) return phrase.map((_, j) => i + j);
  }
  return [];
}

// ---------- Scale degrees ----------
const DEGREE_TOKENS = new Map<string, number>([
  // English (incl. common recognizer homophones that are unambiguous in this context)
  ['1', 1], ['one', 1], ['won', 1], ['first', 1], ['i', 1], ['tonic', 1], ['home', 1],
  ['2', 2], ['two', 2], ['second', 2], ['ii', 2],
  ['3', 3], ['three', 3], ['third', 3], ['iii', 3],
  ['4', 4], ['four', 4], ['fourth', 4], ['iv', 4],
  ['5', 5], ['five', 5], ['fifth', 5], ['v', 5], ['dominant', 5],
  ['6', 6], ['six', 6], ['sixth', 6], ['vi', 6],
  ['7', 7], ['seven', 7], ['seventh', 7], ['vii', 7],
  ['8', 8], ['eight', 8], ['eighth', 8],
  // Hebrew (masc./fem./ordinal)
  ['אחת', 1], ['אחד', 1], ['ראשונה', 1], ['ראשון', 1], ['טוניקה', 1], ['בית', 1],
  ['שתיים', 2], ['שתים', 2], ['שניים', 2], ['שנים', 2], ['שנייה', 2], ['שניה', 2], ['שני', 2],
  ['שלוש', 3], ['שלושה', 3], ['שלישית', 3], ['שלישי', 3],
  ['ארבע', 4], ['ארבעה', 4], ['רביעית', 4], ['רביעי', 4],
  ['חמש', 5], ['חמישה', 5], ['חמישית', 5], ['חמישי', 5], ['דומיננטה', 5],
  ['שש', 6], ['שישה', 6], ['שישית', 6], ['שישי', 6],
  ['שבע', 7], ['שבעה', 7], ['שביעית', 7], ['שביעי', 7],
  ['שמונה', 8], ['שמינית', 8], ['שמיני', 8],
]);

/**
 * Parse a scale-degree answer. Degrees outside the exercise choices still
 * parse (they are valid
 * musical answers, graded as incorrect).
 */
export function parseDegree(transcript: string): ParseResult<number> {
  const heard = transcript.trim();
  const tokens = normalize(transcript);
  if (!tokens.length) return { kind: 'unrecognized', heard };

  // "one more time" must not be read as degree 1.
  const phraseIdx = new Set<number>();
  for (const [phrase] of COMMAND_PHRASES) phraseCovers(tokens, phrase).forEach((i) => phraseIdx.add(i));

  const degrees = new Set<number>();
  tokens.forEach((t, i) => {
    if (phraseIdx.has(i)) return;
    // "I" alone is the Roman numeral only when it's the whole answer.
    if (t === 'i' && tokens.length > 1) return;
    const d = lookup(DEGREE_TOKENS, t);
    if (d !== undefined) degrees.add(d);
  });
  const commands = findCommands(tokens);

  if (degrees.size === 1 && commands.length === 0) return { kind: 'answer', value: [...degrees][0], heard };
  if (degrees.size === 0 && commands.length === 1) return { kind: 'command', command: commands[0], heard };
  if (degrees.size > 1) return { kind: 'ambiguous', candidates: [...degrees].sort(), heard };
  if (degrees.size === 1 && commands.length) return { kind: 'ambiguous', candidates: [...degrees], heard };
  return { kind: 'unrecognized', heard };
}

/** Try recognizer alternatives in order; the first that is not unrecognized wins. */
export function parseAlternatives<T>(alts: string[], parse: (s: string) => ParseResult<T>): ParseResult<T> {
  let first: ParseResult<T> | null = null;
  for (const a of alts) {
    const r = parse(a);
    if (!first) first = r;
    if (r.kind !== 'unrecognized') return r;
  }
  return first ?? { kind: 'unrecognized', heard: '' };
}

// ---------- Note names (used by later lessons; covered by tests now) ----------
export type NamingVocab = 'letter' | 'solfege';
type L = PitchClass['letter'];

// Hebrew "סי" is C in letter naming and B (Si) in fixed-do, so vocab is chosen per exercise.
const NOTE_VOCAB: Record<NamingVocab, Map<string, L>> = {
  letter: new Map<string, L>([
    ['c', 'C'], ['see', 'C'], ['sea', 'C'], ['d', 'D'], ['dee', 'D'], ['e', 'E'], ['f', 'F'], ['ef', 'F'],
    ['g', 'G'], ['gee', 'G'], ['a', 'A'], ['b', 'B'], ['bee', 'B'], ['be', 'B'],
    ['סי', 'C'], ['די', 'D'], ['אי', 'E'], ['אף', 'F'], ["ג'י", 'G'], ['גי', 'G'], ['איי', 'A'], ['בי', 'B'],
  ]),
  solfege: new Map<string, L>([
    ['do', 'C'], ['doh', 'C'], ['re', 'D'], ['ray', 'D'], ['mi', 'E'], ['me', 'E'], ['fa', 'F'], ['far', 'F'],
    ['sol', 'G'], ['so', 'G'], ['la', 'A'], ['si', 'B'], ['ti', 'B'], ['tea', 'B'],
    ['דו', 'C'], ['רה', 'D'], ['רא', 'D'], ['מי', 'E'], ['פה', 'F'], ['פא', 'F'], ['סול', 'G'], ['לה', 'A'], ['לא', 'A'], ['סי', 'B'],
  ]),
};
const ACC_TOKENS = new Map<string, -1 | 1>([
  ['flat', -1], ['פלאט', -1], ['פלט', -1], ['במול', -1], ['bemol', -1], ['♭', -1],
  ['sharp', 1], ['שארפ', 1], ['שרפ', 1], ['דיאז', 1], ['diese', 1], ['♯', 1],
]);

/**
 * Parse a note name ("B flat", "Bb", "סי במול", "בי פלאט", "si bemol").
 * `vocab` selects which naming system resolves clashes like "סי" (C vs Si).
 */
export function parseNoteName(transcript: string, vocab: NamingVocab): ParseResult<PitchClass> {
  const heard = transcript.trim();
  // Split glued forms like "Bb", "Eb", "F#", "B♭" into letter + accidental.
  const prepped = transcript.replace(/(^|\s)([a-gA-G])(b|#|♭|♯)(?=[\s,.;]|$)/g, (_, pre, l, a) => `${pre}${l} ${a === 'b' || a === '♭' ? 'flat' : 'sharp'}`);
  const tokens = normalize(prepped);
  const commands = findCommands(tokens);
  const table = NOTE_VOCAB[vocab];
  const notes: PitchClass[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const letter = table.get(tokens[i]);
    if (!letter) continue;
    let acc: PitchClass['acc'] = 0;
    const next = tokens[i + 1];
    if (next && ACC_TOKENS.has(next)) {
      acc = ACC_TOKENS.get(next)!;
      i++;
    }
    notes.push({ letter, acc });
  }
  const uniq = notes.filter((n, i) => notes.findIndex((m) => m.letter === n.letter && m.acc === n.acc) === i);
  if (uniq.length === 1 && commands.length === 0) return { kind: 'answer', value: uniq[0], heard };
  if (uniq.length === 0 && commands.length === 1) return { kind: 'command', command: commands[0], heard };
  if (uniq.length > 1 || (uniq.length === 1 && commands.length)) return { kind: 'ambiguous', candidates: uniq, heard };
  return { kind: 'unrecognized', heard };
}

/**
 * A sequence of note names, in order ("B flat F", "סי במול פה"). Returns canonical keys joined
 * with '.', e.g. "B-1.F0". Commands win only when no note is present.
 */
export function parseNoteNameSequence(transcript: string, vocab: NamingVocab): ParseResult<string> {
  const heard = transcript.trim();
  const prepped = transcript.replace(/(^|\s)([a-gA-G])(b|#|♭|♯)(?=[\s,.;]|$)/g, (_, pre, l, a) => `${pre}${l} ${a === 'b' || a === '♭' ? 'flat' : 'sharp'}`);
  const tokens = normalize(prepped);
  const table = NOTE_VOCAB[vocab];
  const notes: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const letter = table.get(tokens[i]);
    if (!letter) continue;
    let acc: PitchClass['acc'] = 0;
    const next = tokens[i + 1];
    if (next && ACC_TOKENS.has(next)) {
      acc = ACC_TOKENS.get(next)!;
      i++;
    }
    notes.push(`${letter}${acc}`);
  }
  if (notes.length) return { kind: 'answer', value: notes.join('.'), heard };
  const commands = findCommands(tokens);
  if (commands.length === 1) return { kind: 'command', command: commands[0], heard };
  return { kind: 'unrecognized', heard };
}

// ---------- Chord quality / cadence answers ----------
function parseChoiceTable<T extends string>(
  transcript: string,
  table: Map<string, T>,
  negations: [string[], T][] = [],
): ParseResult<T> {
  const heard = transcript.trim();
  const tokens = normalize(transcript);
  if (!tokens.length) return { kind: 'unrecognized', heard };
  const found = new Set<T>();
  const used = new Set<number>();
  for (const [phrase, v] of negations) {
    const idx = phraseCovers(tokens, phrase);
    if (idx.length) {
      found.add(v);
      idx.forEach((i) => used.add(i));
    }
  }
  tokens.forEach((t, i) => {
    if (used.has(i)) return;
    const v = lookup(table, t);
    if (v) found.add(v);
  });
  const commands = findCommands(tokens);
  if (found.size === 1 && commands.length === 0) return { kind: 'answer', value: [...found][0], heard };
  if (found.size === 0 && commands.length === 1) return { kind: 'command', command: commands[0], heard };
  if (found.size > 1 || (found.size === 1 && commands.length)) return { kind: 'ambiguous', candidates: [...found], heard };
  return { kind: 'unrecognized', heard };
}

const QUALITY_TOKENS = new Map<string, 'maj' | 'min' | 'dim' | 'aug'>([
  ['diminished', 'dim'], ['dim', 'dim'], ['diminish', 'dim'], ['מוקטן', 'dim'], ['דימיניש', 'dim'], ['דים', 'dim'],
  ['augmented', 'aug'], ['aug', 'aug'], ['augment', 'aug'], ['מוגדל', 'aug'], ['אוגמנט', 'aug'], ['אוגמנטד', 'aug'],
  ['major', 'maj'], ['maj', 'maj'], ['majors', 'maj'], ['happy', 'maj'], ['bright', 'maj'],
  ["מז'ור", 'maj'], ['מז׳ור', 'maj'], ['מזור', 'maj'], ["מייג'ור", 'maj'], ['מייג׳ור', 'maj'], ['מייגור', 'maj'], ['שמח', 'maj'],
  ['minor', 'min'], ['min', 'min'], ['miner', 'min'], ['sad', 'min'], ['dark', 'min'],
  ['מינור', 'min'], ['מיינור', 'min'], ['עצוב', 'min'],
]);

/** "major" / "minor" in English or Hebrew (incl. "happy"/"sad" beginner words). */
export function parseQuality(transcript: string): ParseResult<'maj' | 'min' | 'dim' | 'aug'> {
  // ° → diminished, + → augmented (symbols spelled out); everything else as before.
  const t = transcript.replace(/°/g, ' diminished ').replace(/[+]/g, ' augmented ');
  return parseChoiceTable(t.replace(/[׳’]/g, "'"), QUALITY_TOKENS);
}

const CADENCE_TOKENS = new Map<string, 'resolved' | 'open'>([
  ['resolved', 'resolved'], ['resolve', 'resolved'], ['closed', 'resolved'], ['close', 'resolved'], ['home', 'resolved'],
  ['finished', 'resolved'], ['complete', 'resolved'], ['full', 'resolved'], ['authentic', 'resolved'], ['done', 'resolved'],
  ['נפתר', 'resolved'], ['נפתרה', 'resolved'], ['סגור', 'resolved'], ['סגורה', 'resolved'], ['בית', 'resolved'], ['הביתה', 'resolved'],
  ['גמור', 'resolved'], ['שלם', 'resolved'], ['מלא', 'resolved'], ['סיום', 'resolved'],
  ['open', 'open'], ['half', 'open'], ['unresolved', 'open'], ['hanging', 'open'], ['away', 'open'], ['unfinished', 'open'],
  ['פתוח', 'open'], ['פתוחה', 'open'], ['חצי', 'open'], ['תלוי', 'open'], ['תלויה', 'open'], ['באוויר', 'open'],
]);

const RUN_MATERIAL_TOKENS = new Map<string, 'major' | 'min-penta' | 'blues'>([
  ['major', 'major'], ['scale', 'major'], ['מז\'ור', 'major'], ['מזור', 'major'], ['סולם', 'major'],
  ['pentatonic', 'min-penta'], ['penta', 'min-penta'], ['minor', 'min-penta'], ['פנטטוני', 'min-penta'], ['פנטטונית', 'min-penta'], ['פנטה', 'min-penta'],
  ['blues', 'blues'], ['bluesy', 'blues'], ['בלוז', 'blues'],
]);
const RUN_SHAPE_TOKENS = new Map<string, 'up' | 'down' | 'turn'>([
  ['up', 'up'], ['upward', 'up'], ['ascending', 'up'], ['rising', 'up'], ['עולה', 'up'], ['למעלה', 'up'], ['עולים', 'up'],
  ['down', 'down'], ['downward', 'down'], ['descending', 'down'], ['falling', 'down'], ['יורד', 'down'], ['למטה', 'down'], ['יורדים', 'down'],
  ['turn', 'turn'], ['back', 'turn'], ['both', 'turn'], ['around', 'turn'], ['חוזר', 'turn'], ['הלוך', 'turn'], ['חזור', 'turn'], ['ושוב', 'turn'],
]);
/** Run recognition answers (spec K.1): scale material or shape. */
export const parseRunMaterial = (t: string) => parseChoiceTable(t, RUN_MATERIAL_TOKENS);
export function parseRunShape(t: string): ParseResult<'up' | 'down' | 'turn'> {
  // "up and down" / "עולה ויורד" is a turn.
  const n = normalize(t);
  const has = (xs: string[]) => n.some((w) => xs.includes(w) || xs.some((x) => w.endsWith(x) && w.length <= x.length + 1));
  if (has(['up', 'עולה']) && has(['down', 'יורד', 'ויורד'])) return { kind: 'answer', value: 'turn', heard: t.trim() };
  return parseChoiceTable(t, RUN_SHAPE_TOKENS);
}

/** Jazz seventh chords: "major seven", "dominant", "minor seven", "half diminished" (en/he). */
export function parseSeventh(t: string): ParseResult<'maj7' | '7' | 'm7' | 'm7b5'> {
  const heard = t.trim();
  // Synonyms first: Δ / maj7 / major seven / triangle, ø / m7b5 / half diminished, −7 / min7 / minor seven …
  const syn = seventhOf(t);
  if (syn && syn !== 'dim7') return { kind: 'answer', value: syn, heard };
  const n = normalize(t.replace(/maj7/gi, ' major ').replace(/m7b5|ø/gi, ' half diminished ').replace(/\bm7\b/gi, ' minor seven '));
  const has = (...ws: string[]) => n.some((w) => ws.includes(w));
  let v: 'maj7' | '7' | 'm7' | 'm7b5' | null = null;
  if (has('half', 'diminished', 'חצי', 'מוקטן', 'half-diminished')) v = 'm7b5';
  else if (has('dominant', 'דומיננטה', 'דומיננטי', 'דומיננט')) v = '7';
  else if (has('major', "מז'ור", 'מזור', 'מייג׳ור', "מייג'ור")) v = 'maj7';
  else if (has('minor', 'מינור')) v = 'm7';
  else if (has('seven', 'seventh', '7', 'שביעית', 'שבע', 'ספטים')) v = '7';
  if (v) return { kind: 'answer', value: v, heard };
  const commands = findCommands(n);
  if (commands.length === 1) return { kind: 'command', command: commands[0], heard };
  return { kind: 'unrecognized', heard };
}

const ROMAN_NUM: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
const PROG_BY_DEGREES: Record<string, 'ii-V-I' | 'V-I' | 'I-vi-ii-V' | 'iii-vi-ii-V'> = { '2-5-1': 'ii-V-I', '5-1': 'V-I', '1-6-2-5': 'I-vi-ii-V', '3-6-2-5': 'iii-vi-ii-V' };
/** Progressions spoken as numbers or Roman numerals: "two five one", "ii V I", "1 6 2 5", "שתיים חמש אחת". */
export function parseProgression(t: string): ParseResult<'ii-V-I' | 'V-I' | 'I-vi-ii-V' | 'iii-vi-ii-V'> {
  const heard = t.trim();
  if (/turnaround|טרנאראונד/i.test(t)) return { kind: 'answer', value: 'I-vi-ii-V', heard };
  const romanised = t.replace(/[–—-]/g, ' ').replace(/\b(vii|vi|v|iv|iii|ii|i)\b/gi, (m) => String(ROMAN_NUM[m.toLowerCase()]));
  const r = parseDegreeSequence(romanised);
  if (r.kind === 'answer') {
    const p = PROG_BY_DEGREES[r.value];
    if (p) return { kind: 'answer', value: p, heard };
    return { kind: 'unrecognized', heard };
  }
  if (r.kind === 'command') return r;
  return { kind: 'unrecognized', heard };
}

/** "resolved" vs "open" cadence answers; "not resolved" / "לא נפתר" count as open. */
export function parseCadence(transcript: string): ParseResult<'resolved' | 'open'> {
  return parseChoiceTable(transcript, CADENCE_TOKENS, [
    [['not', 'resolved'], 'open'],
    [['not', 'finished'], 'open'],
    [['לא', 'נפתר'], 'open'],
    [['לא', 'נפתרה'], 'open'],
    [['לא', 'סגור'], 'open'],
  ]);
}

/**
 * Ordered scale degrees from speech: "one three five", "1 3 5", "135", "אחת שלוש חמש".
 * Returns the canonical "1-3-5". Commands win only when no degree is present.
 */
export function parseDegreeSequence(transcript: string): ParseResult<string> {
  const heard = transcript.trim();
  // Glued digits ("135") → separate digits.
  const spaced = transcript.replace(/\b([1-7]{2,})\b/g, (m) => m.split('').join(' '));
  const tokens = normalize(spaced);
  const phraseIdx = new Set<number>();
  for (const [phrase] of COMMAND_PHRASES) phraseCovers(tokens, phrase).forEach((i) => phraseIdx.add(i));
  const seq: number[] = [];
  tokens.forEach((t, i) => {
    if (phraseIdx.has(i)) return;
    if (t === 'i' && tokens.length > 1) return;
    // "to"/"too"/"for" are common mishearings of 2/4 only inside a sequence of numbers.
    const alias: Record<string, number> = { to: 2, too: 2, for: 4 };
    const d = lookup(DEGREE_TOKENS, t) ?? alias[t];
    if (d !== undefined) seq.push(d);
  });
  if (seq.length) return { kind: 'answer', value: seq.join('-'), heard };
  const commands = findCommands(tokens);
  if (commands.length === 1) return { kind: 'command', command: commands[0], heard };
  return { kind: 'unrecognized', heard };
}

const INTERVAL_TOKENS = new Map<string, 'M3' | 'P5' | 'P8'>([
  ['third', 'M3'], ['3rd', 'M3'], ['three', 'M3'], ['3', 'M3'], ['thirds', 'M3'],
  ['טרצה', 'M3'], ['שלישית', 'M3'], ['שלוש', 'M3'],
  ['fifth', 'P5'], ['5th', 'P5'], ['five', 'P5'], ['5', 'P5'], ['fifths', 'P5'],
  ['קווינטה', 'P5'], ['קוינטה', 'P5'], ['חמישית', 'P5'], ['חמש', 'P5'],
  ['octave', 'P8'], ['octaves', 'P8'], ['eight', 'P8'], ['8', 'P8'], ['8th', 'P8'], ['eighth', 'P8'],
  ['אוקטבה', 'P8'], ['אוקטבות', 'P8'], ['שמינית', 'P8'],
]);

/** Interval names: "third" / "fifth" / "octave" (also "major third", "perfect fifth", טרצה / קווינטה / אוקטבה). */
export function parseInterval(transcript: string): ParseResult<'M3' | 'P5' | 'P8'> {
  // Any common name of the interval counts ("major third", "perfect fifth", "eight", "octave" …); a
  // different interval named explicitly (e.g. "minor third", "tritone") is not read as one of these.
  const ic = intervalClassOf(transcript);
  const byIc: Record<number, 'M3' | 'P5' | 'P8'> = { 4: 'M3', 7: 'P5', 12: 'P8' };
  if (ic !== null && byIc[ic]) return { kind: 'answer', value: byIc[ic], heard: transcript.trim() };
  if (ic !== null && / (minor|major|perfect|augmented|diminished|flat|sharp|tritone|semitone|whole) /.test(canonMusic(transcript))) return { kind: 'unrecognized', heard: transcript.trim() };
  return parseChoiceTable(transcript, INTERVAL_TOKENS);
}

const BASS_TOKENS = new Map<string, 'root' | 'third' | 'fifth'>([
  ['root', 'root'], ['bass', 'root'], ['שורש', 'root'], ['יסודי', 'root'], ['בסיס', 'root'],
  ['third', 'third'], ['3rd', 'third'], ['שלישית', 'third'], ['טרצה', 'third'],
  ['fifth', 'fifth'], ['5th', 'fifth'], ['חמישית', 'fifth'], ['קווינטה', 'fifth'],
]);

/** Bass of a triad: "root" / "third" / "fifth", or "root position" / "first inversion" / "second inversion". */
export function parseInversion(transcript: string): ParseResult<'root' | 'third' | 'fifth'> {
  return parseChoiceTable(transcript, BASS_TOKENS, [
    [['first', 'inversion'], 'third'],
    [['second', 'inversion'], 'fifth'],
    [['root', 'position'], 'root'],
    [['היפוך', 'ראשון'], 'third'],
    [['היפוך', 'שני'], 'fifth'],
    [['מצב', 'יסודי'], 'root'],
  ]);
}


/**
 * Mode names (spoken): the longest alias of one of the question's choices found in the transcript wins
 * ("dorian flat two" beats "dorian"). Hebrew and English aliases from MODE_NAMES.
 */
export function parseMode(transcript: string, choices: string[]): ParseResult<string> {
  const heard = transcript.trim();
  const text = canonMusic(transcript);
  if (!text.trim()) return { kind: 'unrecognized', heard };
  const hits: { id: string; len: number }[] = [];
  for (const id of choices) {
    const names = MODE_NAMES[id as keyof typeof MODE_NAMES];
    if (!names) continue;
    const aliases = [names.en, names.he, ...names.say.en, ...names.say.he].map((a) => canonMusic(a.replace(/[()]/g, ' ')));
    const best = Math.max(0, ...aliases.filter((a) => a.trim() && text.includes(a)).map((a) => a.length));
    if (best) hits.push({ id, len: best });
  }
  if (!hits.length) {
    const commands = findCommands(normalize(transcript));
    if (commands.length === 1) return { kind: 'command', command: commands[0], heard };
    return { kind: 'unrecognized', heard };
  }
  hits.sort((a, b) => b.len - a.len);
  if (hits.length > 1 && hits[0].len === hits[1].len) return { kind: 'ambiguous', candidates: hits.filter((h) => h.len === hits[0].len).map((h) => h.id), heard };
  return { kind: 'answer', value: hits[0].id, heard };
}
