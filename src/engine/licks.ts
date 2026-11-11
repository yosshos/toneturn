// Lick & vocabulary trainer (docs/SPEC-LICKS-TRANSCRIPTION.md): a library of our own licks by chord context and
// level, each practised measured in all 12 keys up a tempo ladder on the course's instrument, then kept with spaced
// review and used in the improv studio. Pure.
//
// OWN MATERIAL ONLY. Every lick below was written for this app in the jazz tradition — chord tones on the beats,
// chromatic approach and enclosure notes, the bebop scale's passing half step, Barry Harris's "arpeggio up, scale
// down" — none is copied from a book, a course or a recording.

import type { Drill, DrillGoal, ExpNote, ItemState, TakeMetrics } from './drills/types';
import { itemPass } from './drills/ladder';
import { keyName } from './drills/generate';
import { tuningById } from './fretboard';
import type { RatingEvent } from './rating';

export type LickInstrument = 'piano' | 'guitar' | 'bass' | 'voice';
export type LickContext = 'major-251' | 'minor-251' | 'dominant' | 'altered' | 'blues' | 'barry' | 'enclosure' | 'guide';
type T2 = { en: string; he: string };

/** Chord qualities a lick can sit on: chord tones, the chord scale (passing tones included), and tensions allowed on a beat. */
export const LICK_Q: Record<string, { ct: number[]; sc: number[]; tens: number[]; sym: string }> = {
  maj7: { ct: [0, 4, 7, 11], sc: [0, 2, 4, 5, 7, 9, 11], tens: [2, 9], sym: 'maj7' },
  '6': { ct: [0, 4, 7, 9], sc: [0, 2, 4, 5, 7, 9, 11], tens: [2, 11], sym: '6' },
  m7: { ct: [0, 3, 7, 10], sc: [0, 2, 3, 5, 7, 9, 10], tens: [2, 5, 9], sym: 'm7' },
  m6: { ct: [0, 3, 7, 9], sc: [0, 2, 3, 5, 7, 9, 11], tens: [2, 11], sym: 'm6' },
  // The dominant bebop scale: mixolydian + the major 7th as a passing tone.
  '7': { ct: [0, 4, 7, 10], sc: [0, 2, 4, 5, 7, 9, 10, 11], tens: [2, 9], sym: '7' },
  // V7♭9 in minor: the 5th mode of harmonic minor (+ the ♯9 / ♭3 colour).
  '7b9': { ct: [0, 4, 7, 10], sc: [0, 1, 3, 4, 5, 7, 8, 10], tens: [1, 3, 8], sym: '7b9' },
  // The altered scale: 3 and ♭7 are the chord, every alteration a tension.
  alt: { ct: [0, 4, 10], sc: [0, 1, 3, 4, 6, 8, 10], tens: [1, 3, 6, 8], sym: '7alt' },
  hd7: { ct: [0, 3, 6, 10], sc: [0, 2, 3, 5, 6, 8, 10], tens: [2, 5, 8], sym: 'm7b5' },
  dim7: { ct: [0, 3, 6, 9], sc: [0, 2, 3, 5, 6, 8, 9, 11], tens: [2, 5, 8, 11], sym: 'dim7' },
  // A blues dominant: the blue notes ♭3 and ♭5 are part of the language.
  blues7: { ct: [0, 4, 7, 10], sc: [0, 2, 3, 4, 5, 6, 7, 9, 10], tens: [2, 3, 9], sym: '7' },
};

/** One chord of a lick: root in semitones above the key's tonic, quality, length in beats. */
export type LickChord = [root: number, q: string, beats: number];
/** One note: semitones above the key's tonic (around C4 in C), onset beat, length in beats. */
export type LickNote = [semi: number, beat: number, dur: number];

export interface Lick {
  id: string;
  ctx: LickContext;
  /** 1 (first ii–V shapes) … 5 (long bebop lines). */
  level: number;
  name: T2;
  chords: LickChord[];
  notes: LickNote[];
  /** Swung eighths (default yes). */
  straight?: boolean;
  /** The player's own lick (from the transcription coach or "my licks"). */
  own?: boolean;
}

export const CONTEXTS: { id: LickContext; name: T2; short: T2 }[] = [
  { id: 'major-251', name: { en: 'Major ii–V–I', he: 'ii–V–I מז׳ורי' }, short: { en: 'ii–V–I', he: 'ii–V–I' } },
  { id: 'minor-251', name: { en: 'Minor ii–V–i', he: 'ii–V–i מינורי' }, short: { en: 'minor', he: 'מינור' } },
  { id: 'dominant', name: { en: 'Dominant lines', he: 'קווים על דומיננט' }, short: { en: 'V7', he: 'V7' } },
  { id: 'altered', name: { en: 'Altered dominant', he: 'דומיננט אלטרד' }, short: { en: 'alt', he: 'אלטרד' } },
  { id: 'blues', name: { en: 'Blues', he: 'בלוז' }, short: { en: 'blues', he: 'בלוז' } },
  { id: 'barry', name: { en: 'Barry Harris lines', he: 'קווים של בארי האריס' }, short: { en: 'Barry', he: 'בארי' } },
  { id: 'enclosure', name: { en: 'Bebop enclosures', he: 'הקפות ביבופ' }, short: { en: 'enclose', he: 'הקפה' } },
  { id: 'guide', name: { en: 'Guide-tone lines', he: 'קווי צלילים מנחים' }, short: { en: 'guide', he: 'מנחים' } },
];

/**
 * A small line language: tokens "semi[len]" in time order, where len is e (eighth, default), q (quarter), h (half),
 * w (whole), d (dotted quarter), t (triplet eighth), s (sixteenth); "r" + len is a rest.
 */
const LEN: Record<string, number> = { e: 0.5, q: 1, h: 2, w: 4, d: 1.5, t: 1 / 3, s: 0.25 };
export function parseLine(src: string): LickNote[] {
  const out: LickNote[] = [];
  let beat = 0;
  for (const tok of src.trim().split(/[\s|]+/).filter(Boolean)) {
    const m = /^(r|-?\d+)([eqhwdts]?)$/.exec(tok);
    if (!m) throw new Error(`Bad lick token: ${tok}`);
    const len = LEN[m[2] || 'e'];
    if (m[1] !== 'r') out.push([Number(m[1]), beat, len]);
    beat += len;
  }
  return out;
}

const II_V_I: LickChord[] = [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 4]];
const II_V_I_SHORT: LickChord[] = [[2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]];
const MINOR_II_V_I: LickChord[] = [[2, 'hd7', 4], [7, '7b9', 4], [0, 'm6', 4]];
const V_I: LickChord[] = [[7, '7', 4], [0, 'maj7', 4]];
const V6: LickChord[] = [[7, '7', 4], [0, '6', 4]];
const ALT_I: LickChord[] = [[7, 'alt', 4], [0, 'maj7', 4]];
const II_ALT_I: LickChord[] = [[2, 'm7', 4], [7, 'alt', 4], [0, 'maj7', 4]];
const BLUES_I_IV: LickChord[] = [[0, 'blues7', 4], [5, 'blues7', 4]];
const BLUES_I: LickChord[] = [[0, 'blues7', 4], [0, 'blues7', 4]];

const L = (id: string, ctx: LickContext, level: number, en: string, he: string, chords: LickChord[], line: string): Lick => ({ id, ctx, level, name: { en, he }, chords, notes: parseLine(line) });

/** The library (in C: the key's tonic = 0). */
export const LICKS: Lick[] = [
  // ── major ii–V–I ──
  L('maj-arp', 'major-251', 1, 'Arpeggios that connect', 'ארפג׳ים שמתחברים', II_V_I, '2q 5q 9q 12q | 11q 7q 5q 2q | 4w'),
  L('maj-short', 'major-251', 1, 'Short ii–V, down to the 3rd', 'ii–V קצר, יורד לטרצה', II_V_I_SHORT, '9 7 5 2 | 5 4 2 -1 | 4h rh'),
  L('maj-bebop', 'major-251', 2, 'Bebop scale through the changes', 'סולם ביבופ דרך האקורדים', II_V_I, '14 12 11 9 7 5 4 2 | 5 4 2 0 -1 -3 -5 -6 | -5q -1q 4h'),
  L('maj-enclose', 'major-251', 3, 'Enclose every 3rd', 'להקיף כל טרצה', II_V_I, '7 4 5q 12 10 9q | 12 10 11q 9 7 5 3 | 4q 7q 11h'),
  L('maj-barry', 'major-251', 4, 'Down the scales, half step on the root', 'במורד הסולמות, חצי טון על השורש', II_V_I, '14 12 11 9 7 5 4 2 | 7 6 5 4 2 0 -1 -3 | -1 0 4 7 11h'),
  // ── minor ii–V–i ──
  L('min-arp', 'minor-251', 1, 'Minor arpeggios with the ♭9', 'ארפג׳ים במינור עם ה-♭9', MINOR_II_V_I, '2q 5q 8q 12q | 11q 8q 5q 2q | 3w'),
  L('min-line', 'minor-251', 2, 'Down from the 7th, into the ♭13', 'מהספטימה למטה, אל ה-♭13', MINOR_II_V_I, '12 10 8 7 5 4 2 0 | -1 2 5 8 7 5 3 2 | 3q 7q 9h'),
  L('min-enclose', 'minor-251', 3, 'Enclose the 3rd of V', 'להקיף את הטרצה של V', MINOR_II_V_I, '8 7 5 2 0 2 5 8 | 12 10 11q 8 7 5 4 | 3q 2q 0h'),
  // ── dominant ──
  L('dom-arp9', 'dominant', 1, 'Up to the 9th, down to the 3rd', 'עד הנונה, ובחזרה לטרצה', V_I, '-1 2 5 9 7 5 2 -1 | 0w'),
  L('dom-bebop', 'dominant', 2, 'The bebop scale from the root', 'סולם הביבופ מהשורש', V_I, '7 6 5 4 2 0 -1 -3 | -5q -1q 4h'),
  L('dom-enclose', 'dominant', 3, 'Enclose the 3rd and the 5th', 'להקיף את הטרצה ואת הקווינטה', V_I, '0 -2 -1q 5 3 2q | 0q 4q 7h'),
  L('dom-turn', 'dominant', 4, 'Triplet turn, then down', 'סיבוב בטריולה, ואז למטה', V_I, '7t 9t 7t 5 4 2 0 -1q | 0w'),
  // ── altered ──
  L('alt-down', 'altered', 3, 'Altered tensions on the beats', 'מתחים אלטרד על הפעמות', ALT_I, '15 13 11 10 8 5 3 1 | 0q 4q 7h'),
  L('alt-251', 'altered', 4, 'ii, then the altered scale up', 'ii, ואז הסולם האלטרד למעלה', II_ALT_I, '2 5 9 12 14 12 9 5 | -1 1 3 5 8 10 11 8 | 7q 4q 0h'),
  // ── blues ──
  L('blues-grace', 'blues', 1, 'The blue 3rd bends up', 'הטרצה הכחולה עולה', BLUES_I, '3 4 7q 10q 7q | 0w'),
  L('blues-down', 'blues', 2, 'Down through the ♭5', 'למטה דרך ה-♭5', BLUES_I_IV, '12 10 7 6 5 3 0q | 3q 2q 0h'),
  L('blues-trip', 'blues', 3, 'Triplet into the ♭7', 'טריולה אל ה-♭7', BLUES_I_IV, '3t 4t 7t 10q 12 10 7q | 9q 8q 5h'),
  // ── Barry Harris ──
  L('barry-arp-scale', 'barry', 2, 'Arpeggio up from the 3rd, scale down', 'ארפג׳ מהטרצה למעלה, סולם למטה', V6, '-1 2 5 9 7 6 5 4 | 2 0 -1 -3 -5h'),
  L('barry-pivot', 'barry', 3, 'Up to the 9th, the pivot back down', 'עד הנונה, ומשם חזרה למטה', V6, '-5 -1 2 5 9 7 5 2 | 4q 0q 9h'),
  L('barry-trip', 'barry', 4, 'Triplet from the root, chord tones on the beats', 'טריולה מהשורש, צלילי אקורד על הפעמות', V6, '7t 9t 7t 5 4 2 0 -1q | 0q 4q 9h'),
  // ── enclosures ──
  L('enc-third', 'enclosure', 1, 'Above, below, the 3rd', 'מלמעלה, מלמטה, הטרצה', [[0, 'maj7', 4]], '5 3 4h 7q'),
  L('enc-root', 'enclosure', 2, 'Enclose the root of V', 'להקיף את השורש של V', V_I, '9 6 7q 5 2 -1 1 | 0w'),
  L('enc-double', 'enclosure', 3, 'Double chromatic enclosure', 'הקפה כרומטית כפולה', [[0, 'maj7', 4]], '9 8 6 7d 4q'),
  L('enc-minor', 'enclosure', 4, 'Enclose the minor 3rd, then climb', 'להקיף את הטרצה הקטנה, ולטפס', [[0, 'm6', 8]], '5 2 3q 7 9 11 14 | 12w'),
  // ── guide tones ──
  L('guide-halves', 'guide', 1, '3rds and 7ths in half notes', 'טרצות וספטימות בחצאים', II_V_I, '5h 12h | 11h 5h | 4h 11h'),
  L('guide-cycle', 'guide', 2, 'Guide tones through a turnaround', 'צלילים מנחים בטרנאראונד', [[0, 'maj7', 2], [9, '7', 2], [2, 'm7', 2], [7, '7', 2], [0, 'maj7', 4]], '4h 7h 5h 5h | 4w'),
  L('guide-eighths', 'guide', 3, 'Guide tones on the beats, lines between', 'מנחים על הפעמות, קו ביניהם', II_V_I_SHORT, '5 7 9 12 | 11 9 7 5 | 4q 7q 11h'),
];

export const lickById = (id: string, own: Lick[] = []): Lick | undefined => LICKS.find((l) => l.id === id) ?? own.find((l) => l.id === id);
export const contextOf = (id: LickContext) => CONTEXTS.find((c) => c.id === id)!;

const mod = (n: number, m = 12) => ((n % m) + m) % m;
export const lickBeats = (l: Lick): number => Math.max(l.chords.reduce((a, c) => a + c[2], 0), ...l.notes.map((n) => n[1] + n[2]));

/** The chord sounding at a beat (index into lick.chords). */
export function chordAt(chords: LickChord[], beat: number): number {
  let b = 0;
  for (let i = 0; i < chords.length; i++) {
    if (beat < b + chords[i][2] - 1e-6) return i;
    b += chords[i][2];
  }
  return chords.length - 1;
}

/**
 * Is the lick valid over its chords? Every note is in its chord's scale, or a chromatic note that resolves by a half
 * step to the next note (or the one after: a double enclosure) which is in the scale; most notes on the beats are chord
 * tones or allowed tensions; the last note is a chord tone. Returns the problems (empty = valid).
 */
export function lickProblems(l: Lick): string[] {
  const err: string[] = [];
  const at = (i: number) => {
    const n = l.notes[i];
    const c = l.chords[chordAt(l.chords, n[1])];
    const q = LICK_Q[c[1]];
    return { n, c, q, rel: mod(n[0] - c[0]) };
  };
  if (!l.notes.length) return ['empty'];
  for (const c of l.chords) if (!LICK_Q[c[1]]) err.push(`unknown quality ${c[1]}`);
  if (err.length) return err;
  const inSc = (i: number) => {
    const x = at(i);
    return x.q.sc.includes(x.rel);
  };
  let beats = 0;
  let good = 0;
  for (let i = 0; i < l.notes.length; i++) {
    const x = at(i);
    if (!x.q.sc.includes(x.rel)) {
      const ok = [i + 1, i + 2].some((j) => j < l.notes.length && inSc(j) && Math.abs(l.notes[j][0] - x.n[0]) === 1);
      if (!ok) err.push(`note ${i + 1} (${x.n[0]}) is outside the ${x.c[1]} scale and does not resolve by a half step`);
    }
    if (Math.abs(x.n[1] - Math.round(x.n[1])) < 1e-6) {
      beats++;
      if (x.q.ct.includes(x.rel) || x.q.tens.includes(x.rel)) good++;
    }
  }
  if (beats && good / beats < 0.6) err.push(`only ${good}/${beats} beats on chord tones`);
  const last = at(l.notes.length - 1);
  if (!last.q.ct.includes(last.rel) && !last.q.tens.includes(last.rel)) err.push('the last note is not a chord tone');
  // Notes don't overlap and sit inside the chords' length.
  for (let i = 1; i < l.notes.length; i++) if (l.notes[i][1] < l.notes[i - 1][1] + l.notes[i - 1][2] - 1e-3) err.push(`note ${i + 1} overlaps`);
  return err;
}

// ───────────────────────────── keys, register, the instrument ─────────────────────────────

/** Playable window (sounding MIDI) and its centre per instrument; the voice uses the player's range. */
export function windowOf(inst: LickInstrument, range?: { low: number; high: number } | null): [number, number] {
  if (inst === 'guitar') return [43, 79];
  if (inst === 'bass') return [28, 60];
  if (inst === 'voice') return range && range.high - range.low >= 7 ? [range.low, range.high] : [55, 72];
  return [55, 86];
}

/** The lick's pitches in a key, placed in the instrument's register (the octave whose middle sits nearest the window's). */
export function lickPitches(l: Lick, key: number, inst: LickInstrument = 'piano', range?: { low: number; high: number } | null): number[] {
  const [lo, hi] = windowOf(inst, range);
  const semis = l.notes.map((n) => n[0]);
  const mn = Math.min(...semis);
  const mx = Math.max(...semis);
  const centre = (lo + hi) / 2;
  let best = 0;
  let bestCost = Infinity;
  for (let base = mod(key) + 12; base <= 96; base += 12) {
    const a = base + mn;
    const b = base + mx;
    const out = Math.max(0, lo - a) + Math.max(0, b - hi);
    const cost = out * 10 + Math.abs((a + b) / 2 - centre);
    if (cost < bestCost) {
      bestCost = cost;
      best = base;
    }
  }
  return semis.map((s) => best + s);
}

/**
 * Guitar / bass: one hand position for the whole lick (frets pos … pos+4, open strings allowed), the lowest position
 * that fits; notes that fit no single position take the nearest fret. Strings are 1 = highest.
 */
export function placeOnNeck(pitches: number[], open: number[]): { string: number; fret: number; pos: number }[] {
  const tryPos = (p: number) => {
    const out: { string: number; fret: number; pos: number }[] = [];
    for (const m of pitches) {
      let pick: { string: number; fret: number } | null = null;
      for (let s = open.length - 1; s >= 0; s--) {
        const f = m - open[s];
        if ((f >= p && f <= p + 4) || f === 0) {
          pick = { string: s + 1, fret: f };
          if (f !== 0) break;
        }
      }
      if (!pick) return null;
      out.push({ ...pick, pos: p });
    }
    return out;
  };
  for (let p = 1; p <= 14; p++) {
    const r = tryPos(p);
    if (r) return r;
  }
  return pitches.map((m) => {
    let best = { string: open.length, fret: Math.max(0, m - open[open.length - 1]) };
    for (let s = 0; s < open.length; s++) {
      const f = m - open[s];
      if (f >= 0 && f <= 17 && (best.fret < 0 || f < best.fret || best.fret > 17)) best = { string: s + 1, fret: f };
    }
    return { ...best, pos: Math.max(1, best.fret - 1) };
  });
}

const flatKey = (k: number) => [1, 3, 5, 8, 10].includes(mod(k));
const ROOT_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ROOT_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** A chord symbol the chart parser reads ("Dm7", "Bbmaj7", "G7alt"). */
export const chordSym = (c: LickChord, key: number): string => (flatKey(key) || [5].includes(mod(key)) ? ROOT_FLAT : ROOT_SHARP)[mod(c[0] + key)] + LICK_Q[c[1]].sym;
export const isMinorLick = (l: Lick) => LICK_Q[l.chords[l.chords.length - 1][1]].ct.includes(3) && !LICK_Q[l.chords[l.chords.length - 1][1]].ct.includes(4);

/** Chord names per bar (two chords in a bar are joined with a space), for the chart above the staff and the band. */
export function lickChart(l: Lick, key: number): string[] {
  const bars: string[][] = [];
  let beat = 0;
  for (const c of l.chords) {
    let left = c[2];
    let first = true;
    while (left > 1e-6) {
      const bar = Math.floor(beat / 4 + 1e-6);
      const inBar = Math.min(left, (bar + 1) * 4 - beat);
      (bars[bar] ??= []);
      if (first) bars[bar].push(chordSym(c, key));
      else if (!bars[bar].length) bars[bar].push('%');
      first = false;
      beat += inBar;
      left -= inBar;
    }
  }
  const total = Math.ceil(lickBeats(l) / 4 - 1e-6);
  for (let b = 0; b < total; b++) bars[b] ??= ['%'];
  return bars.map((b) => b.join(' '));
}

/** The tempo ladder of a lick: four rungs from its start to its target tempo (♩). */
export function lickTempos(l: Lick): number[] {
  const fast = l.notes.some((n) => n[2] < 0.5 - 1e-6);
  const start = Math.max(56, (fast ? 72 : 84) + (l.level - 1) * 4 - (l.notes.every((n) => n[2] >= 1) ? -12 : 0));
  const target = Math.round(start * (l.level >= 4 ? 1.75 : 1.6));
  return [0, 1, 2, 3].map((i) => Math.round(start + ((target - start) * i) / 3));
}
export const lickStart = (l: Lick) => lickTempos(l)[0];
export const lickTarget = (l: Lick) => lickTempos(l)[3];

export const lickItemId = (l: Lick, inst: LickInstrument, key: number) => `lick:${l.id}:${inst}:${mod(key)}`;

/** The lick as a drill in a key on an instrument: the take, the ladder, the ✓/✗ marks and the chart all come from the drills engine. */
export function lickDrill(l: Lick, key: number, inst: LickInstrument = 'piano', o: { range?: { low: number; high: number } | null; tuning?: string; band?: boolean } = {}): Drill {
  const k = mod(key);
  const ps = lickPitches(l, k, inst, o.range);
  const guitar = inst === 'guitar' || inst === 'bass';
  const tu = guitar ? tuningById(o.tuning ?? (inst === 'bass' ? 'bass' : 'standard')) : null;
  const neck = tu ? placeOnNeck(ps, tu.open) : null;
  const notes: ExpNote[] = l.notes.map((n, i) => {
    const c = l.chords[chordAt(l.chords, n[1])];
    const e: ExpNote = { pitch: ps[i], beat: n[1], dur: n[2], hand: 'R', chordTone: LICK_Q[c[1]]?.ct.includes(mod(n[0] - c[0])) };
    if (neck) {
      e.string = neck[i].string;
      e.fret = neck[i].fret;
      if (neck[i].fret > 0) {
        e.pos = neck[i].pos;
        e.finger = Math.max(1, Math.min(4, neck[i].fret - neck[i].pos + 1));
      }
    }
    return e;
  });
  const minor = isMinorLick(l);
  const kn = keyName(k, minor) + (minor ? 'm' : '');
  const goal: DrillGoal = { evenness: false, hands: false };
  const sig = ROOT_FLAT[minor ? mod(k + 3) : k];
  return {
    spec: { family: 'licks', kind: `lick:${l.id}`, key: k, hands: 'R', swing: !l.straight, ...(guitar ? { instrument: inst as 'guitar' | 'bass', tuning: tu!.id } : {}) },
    itemId: lickItemId(l, inst, k),
    title: { en: `${l.name.en} · ${kn}`, he: `${l.name.he} · ${kn}` },
    notes,
    beats: lickBeats(l),
    meter: 4,
    keySig: sig,
    goal,
    startBpm: lickStart(l),
    chart: lickChart(l, k),
    ...(o.band ? { band: { style: 'swing' as const, bass: true } } : {}),
  };
}

// ───────────────────────────── the 12-key × tempo grid, stars ─────────────────────────────

/** Keys in practice order: around the circle of fourths from C (the way ii–V–Is move). */
export const LICK_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

/** One cell per key: the highest rung (0 = none, 1–4) reached with a clean take. */
export function lickGrid(l: Lick, inst: LickInstrument, items: Record<string, ItemState>): { key: number; rung: number; passed: boolean }[] {
  const t = lickTempos(l);
  return LICK_KEYS.map((key) => {
    const st = items[lickItemId(l, inst, key)];
    const best = st ? Math.max(st.cleanBpm ?? 0, ...(st.passLog ?? []).map((x) => x.bpm)) : 0;
    let rung = 0;
    for (let i = 0; i < 4; i++) if (best >= t[i] * 0.95 - 1e-9) rung = i + 1;
    return { key, rung, passed: itemPass(st, t[0], t[3]).target };
  });
}

/**
 * Stars of a lick on the technique scale (owner 0.64): 5 = all 12 keys passed at the target tempo, 4 = half of them,
 * 3 = three keys (the lick is "known": it opens Use it and joins the review), 2 = a first key at target, 1 = clean at
 * the start tempo in three keys. Only measured, clean takes count.
 */
export function lickStars(l: Lick, inst: LickInstrument, items: Record<string, ItemState>): number {
  const t = lickTempos(l);
  const ps = LICK_KEYS.map((k) => itemPass(items[lickItemId(l, inst, k)], t[0], t[3]));
  const n = ps.filter((p) => p.target).length;
  if (n >= 12) return 5;
  if (n >= 6) return 4;
  if (n >= 3) return 3;
  if (n >= 1) return 2;
  return ps.filter((p) => p.start).length >= 3 ? 1 : 0;
}
export const LICK_KNOWN_STARS = 3;

/** The next key to practise: the first key (in order) not passed at the target, preferring keys already started. */
export function nextLickKey(l: Lick, inst: LickInstrument, items: Record<string, ItemState>): number {
  const g = lickGrid(l, inst, items);
  const started = g.find((c) => !c.passed && c.rung > 0);
  return (started ?? g.find((c) => !c.passed) ?? g[0]).key;
}

/** Rated events of a lick take: improvisation vocabulary first, the instrument (or the voice) second. */
export function lickEvents(l: Lick, inst: LickInstrument, m: TakeMetrics, bpm: number, at: string, sessionId: string, index: number, sub: 'vocab' | 'transcribe' = 'vocab'): RatingEvent[] {
  const second: NonNullable<RatingEvent['tags']>[number] =
    inst === 'voice' ? { skill: 'singing', sub: 'singing/sequence', w: 0.4 } : { skill: 'instrument', sub: `instrument/${inst}-tech`, w: 0.4 };
  const t = lickTempos(l);
  const tempoShare = Math.max(0, Math.min(1, (bpm - t[0]) / Math.max(1, t[3] - t[0])));
  const difficulty = Math.round(Math.min(1700, 860 + l.level * 110 + tempoShare * 160 + (l.notes.length > 12 ? 40 : 0)));
  const primary = sub === 'transcribe' ? { skill: 'dictation' as const, sub: 'dictation/transcribe', w: 0.6 } : { skill: 'improv' as const, sub: 'improv/vocab', w: 0.6 };
  return [{ id: `g:lick:${sessionId}:${index}`, skill: primary.skill, difficulty, correct: m.verdict === 'clean', score: Math.round(Math.max(0, Math.min(1, m.accuracy * (m.verdict === 'clean' ? 1 : m.verdict === 'almost' ? 0.85 : 0.6))) * 1000) / 1000, tags: [primary, second], at }];
}
/** XP of a lick take (league effort, like a drill take): clean 5, almost 2, not yet 1. */
export const lickXp = (m: TakeMetrics): number => (m.verdict === 'clean' ? 5 : m.verdict === 'almost' ? 2 : 1);

// ───────────────────────────── spaced review (Leitner) ─────────────────────────────

/** Review state of a known lick: box 0–6 and the day it is due. */
export interface LickReview {
  box: number;
  due: string;
  last: string;
}
/** Days until the next review per box (a pass moves up a box, a miss back to box 1). */
export const REVIEW_DAYS = [0, 1, 3, 7, 14, 30, 60];

const dayOf = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDays = (iso: string | Date, n: number) => {
  const d = typeof iso === 'string' ? new Date(iso) : new Date(iso.getTime());
  d.setDate(d.getDate() + n);
  return dayOf(d);
};

/** After a review take (a key picked by the app, at the lick's current goal tempo): pass → next box, miss → box 1. */
export function reviewAfter(prev: LickReview | undefined, pass: boolean, now: Date | string = new Date()): LickReview {
  const box = pass ? Math.min(REVIEW_DAYS.length - 1, (prev?.box ?? 0) + 1) : 1;
  return { box, due: addDays(now, REVIEW_DAYS[box]), last: typeof now === 'string' ? now : now.toISOString() };
}
/** A lick joins the review when it becomes known (3 stars): first review tomorrow. */
export const reviewStart = (now: Date | string = new Date()): LickReview => ({ box: 1, due: addDays(now, 1), last: typeof now === 'string' ? now : now.toISOString() });

/** Licks due for review today, most overdue first (lowest box breaks ties). */
export function dueLicks(review: Record<string, LickReview> | undefined, now: Date | string = new Date()): string[] {
  const today = dayOf(now);
  return Object.entries(review ?? {})
    .filter(([, r]) => r.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box || a[0].localeCompare(b[0]))
    .map(([id]) => id);
}
/** The key a review asks for: one not played last time, varied by day (never the same key twice running). */
export function reviewKey(l: Lick, day: string, lastKey?: number): number {
  const n = [...`${l.id}${day}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  const k = LICK_KEYS[n % 12];
  return k === lastKey ? LICK_KEYS[(n + 5) % 12] : k;
}

/** The player's lick book (Settings.lickBook): collected licks, their own licks, and the review state. */
export interface LickBook {
  /** Lick ids in "my licks" (library or own). */
  mine?: string[];
  /** The player's own licks (from the transcription coach). */
  own?: Lick[];
  review?: Record<string, LickReview>;
  /** "Use it" challenges passed: lick id → best occurrences in one chorus run. */
  used?: Record<string, number>;
}

/** Fold a session's result into the book: a lick that became known starts its review; a review take moves its box. */
export function bookAfterTake(book: LickBook | undefined, lickId: string, known: boolean, review: { pass: boolean } | null, now: Date | string = new Date()): LickBook {
  const b: LickBook = { ...(book ?? {}), review: { ...(book?.review ?? {}) } };
  const cur = b.review![lickId];
  if (review) b.review![lickId] = reviewAfter(cur, review.pass, now);
  else if (known && !cur) b.review![lickId] = reviewStart(now);
  if (known && !(b.mine ?? []).includes(lickId)) b.mine = [...(b.mine ?? []), lickId];
  return b;
}

/** A phrase (transcription coach) as the player's own lick: semitones above its key's tonic, chords if it has them. */
export function lickFromPhrase(id: string, name: T2, key: number, notes: { midi: number; beat: number; dur: number }[], chords: LickChord[] | null): Lick {
  const first = notes[0]?.midi ?? 60;
  const tonic = first - mod(first - key) + (mod(first - key) > 6 ? 12 : 0);
  const beats = Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur)) / 4 - 1e-6) * 4;
  const ch: LickChord[] = chords?.length ? chords : [[0, 'maj7', Math.max(4, beats)]];
  return { id, ctx: 'major-251', level: 3, name, own: true, chords: ch, notes: notes.map((n) => [n.midi - tonic, n.beat, n.dur] as LickNote) };
}
