// Rhythm reading & dictation (spec addendum G): canonical model, levels R1–R8, words, grading. Pure.

import { mulberry32, shuffle } from './lesson';
import type { NoteEvent } from './lesson';
import { gradeRhythm, type RhythmGrade } from './memory';

/** 12 ticks per quarter: eighth 6, sixteenth 3, eighth-triplet 4, quarter-triplet 8, dotted quarter 18. */
export const TPQ = 12;

export type RhythmLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const MAX_RHYTHM_LEVEL = 8;
export type Meter = '4/4' | '3/4' | '6/8' | '12/8';

/** A rhythm cell — the unit players build and name. `beats` are in quarter notes. */
export type CellId =
  | 'q'
  | 'qr'
  | 'h'
  | 'w'
  | 'ee'
  | 'dqe'
  // R4 sixteenths
  | 'ssss'
  | 'es'
  | 'se'
  // R5 syncopation, eighth rest
  | 'syn'
  | 'ere'
  // R6 eighth triplet
  | 'trip'
  // R7 3/4 and 6/8
  | 'dh'
  | 'dq'
  | 'qe'
  | 'eq'
  | 'eee'
  | 'dqr'
  // R8 quarter triplet
  | 'qtrip';

export interface CellDef {
  id: CellId;
  beats: number;
  /** Events relative to the cell start, in ticks. */
  events: { start: number; dur: number; rest?: boolean }[];
  level: RhythmLevel;
  /** Compound-meter (6/8) cell: one dotted-quarter pulse. */
  compound?: boolean;
  /** Drawn as a triplet. */
  tuplet?: boolean;
}

const ev = (...xs: [number, number, boolean?][]) => xs.map(([start, dur, rest]) => ({ start, dur, ...(rest ? { rest: true } : {}) }));

export const CELLS: Record<CellId, CellDef> = {
  q: { id: 'q', beats: 1, events: ev([0, 12]), level: 1 },
  qr: { id: 'qr', beats: 1, events: ev([0, 12, true]), level: 1 },
  h: { id: 'h', beats: 2, events: ev([0, 24]), level: 1 },
  w: { id: 'w', beats: 4, events: ev([0, 48]), level: 1 },
  ee: { id: 'ee', beats: 1, events: ev([0, 6], [6, 6]), level: 2 },
  dqe: { id: 'dqe', beats: 2, events: ev([0, 18], [18, 6]), level: 3 },
  ssss: { id: 'ssss', beats: 1, events: ev([0, 3], [3, 3], [6, 3], [9, 3]), level: 4 },
  es: { id: 'es', beats: 1, events: ev([0, 6], [6, 3], [9, 3]), level: 4 },
  se: { id: 'se', beats: 1, events: ev([0, 3], [3, 3], [6, 6]), level: 4 },
  syn: { id: 'syn', beats: 2, events: ev([0, 6], [6, 12], [18, 6]), level: 5 },
  ere: { id: 'ere', beats: 1, events: ev([0, 6, true], [6, 6]), level: 5 },
  trip: { id: 'trip', beats: 1, events: ev([0, 4], [4, 4], [8, 4]), level: 6, tuplet: true },
  dh: { id: 'dh', beats: 3, events: ev([0, 36]), level: 7 },
  dq: { id: 'dq', beats: 1.5, events: ev([0, 18]), level: 7, compound: true },
  qe: { id: 'qe', beats: 1.5, events: ev([0, 12], [12, 6]), level: 7, compound: true },
  eq: { id: 'eq', beats: 1.5, events: ev([0, 6], [6, 12]), level: 7, compound: true },
  eee: { id: 'eee', beats: 1.5, events: ev([0, 6], [6, 6], [12, 6]), level: 7, compound: true },
  dqr: { id: 'dqr', beats: 1.5, events: ev([0, 18, true]), level: 7, compound: true },
  qtrip: { id: 'qtrip', beats: 2, events: ev([0, 8], [8, 8], [16, 8]), level: 8, tuplet: true },
};

export interface RhythmEvent {
  start: number; // ticks from the start of bar 1
  dur: number;
  rest: boolean;
}

export interface Rhythm {
  /** Quarter notes per bar: 4 (4/4), 3 (3/4 and 6/8). */
  beatsPerBar: number;
  bars: number;
  cells: CellId[];
  /** Default 4/4. */
  meter?: Meter;
  /** Jazz swing (R8): written straight eighths, played long-short (2:1). */
  swing?: boolean;
}

export const meterOf = (r: Rhythm): Meter => r.meter ?? '4/4';
export const barBeats = (m: Meter) => (m === '4/4' ? 4 : m === '12/8' ? 6 : 3);
/** Compound meters: the pulse is a dotted quarter split in three. */
export const compound = (m: Meter) => m === '6/8' || m === '12/8';
/** Length of the metronome pulse in quarter notes: a dotted quarter in 6/8. */
export const pulseBeats = (m: Meter) => (compound(m) ? 1.5 : 1);
export const cellFits = (c: CellId, m: Meter) => (compound(m) ? !!CELLS[c].compound : !CELLS[c].compound && CELLS[c].beats <= barBeats(m));

export function events(r: Rhythm): RhythmEvent[] {
  const out: RhythmEvent[] = [];
  let beat = 0;
  for (const c of r.cells) {
    for (const e of CELLS[c].events) out.push({ start: Math.round(beat * TPQ) + e.start, dur: e.dur, rest: !!e.rest });
    beat += CELLS[c].beats;
  }
  if (!r.swing) return out;
  // Swing: an off-beat eighth starts a third of a beat later (triplet feel); the on-beat eighth before it is longer.
  return out.map((e) => {
    if (e.start % TPQ === 6 && e.dur === 6) return { ...e, start: e.start + 2, dur: 4 };
    if (e.start % TPQ === 0 && e.dur === 6) return { ...e, dur: 8 };
    if (e.start % TPQ === 6 && e.dur === 12) return { ...e, start: e.start + 2, dur: 10 }; // syncopated quarter
    return e;
  });
}

export const totalBeats = (r: Rhythm) => r.cells.reduce((a, c) => a + CELLS[c].beats, 0);

/** Onsets in quarter beats (sounding notes only) — what performance is graded on. */
export const onsetBeats = (r: Rhythm) => events(r).filter((e) => !e.rest).map((e) => e.start / TPQ);

/**
 * What the ear hears: each sounding note's onset and length. Two notations that sound the same
 * (spec G.3) produce the same signature.
 */
export function signature(r: Rhythm): string {
  return events(r)
    .filter((e) => !e.rest)
    .map((e) => `${e.start}:${e.dur}`)
    .join(',');
}

const POOLS: Record<RhythmLevel, CellId[]> = {
  1: ['q', 'q', 'q', 'qr', 'h', 'w'],
  2: ['q', 'q', 'ee', 'ee', 'qr', 'h'],
  3: ['q', 'ee', 'dqe', 'dqe', 'qr', 'h'],
  4: ['q', 'ee', 'ssss', 'es', 'se', 'qr'],
  5: ['q', 'ee', 'syn', 'syn', 'ere', 'qr', 'dqe'],
  6: ['q', 'ee', 'trip', 'trip', 'qr', 'h'],
  7: ['q', 'h', 'dh', 'ee', 'qr', 'dqe', 'dq', 'qe', 'eq', 'eee', 'dqr'],
  8: ['q', 'ee', 'ee', 'syn', 'qr', 'qtrip', 'h'],
};
/** The level's new material: at least one must appear. */
const NEW_CELLS: Record<RhythmLevel, CellId[]> = {
  1: ['h', 'qr'],
  2: ['ee'],
  3: ['dqe'],
  4: ['ssss', 'es', 'se'],
  5: ['syn', 'ere'],
  6: ['trip'],
  7: ['dh', 'h', 'dq', 'qe', 'eq', 'eee'],
  8: ['ee', 'syn', 'qtrip'],
};

/** R7 alternates 3/4 and 6/8; R8 is swung 4/4. */
export function meterFor(level: RhythmLevel, seed: number): Meter {
  if (level !== 7) return '4/4';
  const x = mulberry32(seed ^ 0x5eed)();
  return x < 0.4 ? '3/4' : x < 0.75 ? '6/8' : '12/8';
}

/**
 * Generate `bars` bars at a level. Cells never cross a bar line; a passage never starts with a rest
 * at R1; each level's new material appears at least once.
 */
export function rhythmAt(level: RhythmLevel, bars: number, seed: number, meter: Meter = meterFor(level, seed)): Rhythm {
  const rnd = mulberry32(seed);
  const per = barBeats(meter);
  const swing = level === 8 ? true : undefined;
  const base = (cells: CellId[]): Rhythm => ({ beatsPerBar: per, bars, cells, ...(meter !== '4/4' ? { meter } : {}), ...(swing ? { swing } : {}) });
  for (let tries = 0; tries < 300; tries++) {
    const cells: CellId[] = [];
    for (let b = 0; b < bars; b++) {
      let left = per;
      while (left > 1e-9) {
        const pool = POOLS[level].filter((c) => cellFits(c, meter) && CELLS[c].beats <= left + 1e-9 && !(left === per && b === 0 && (c === 'qr' || c === 'dqr' || c === 'ere')));
        if (!pool.length) break;
        const c = pool[Math.floor(rnd() * pool.length)];
        cells.push(c);
        left -= CELLS[c].beats;
      }
    }
    if (Math.abs(cells.reduce((a, c) => a + CELLS[c].beats, 0) - per * bars) > 1e-9) continue;
    if (NEW_CELLS[level].some((c) => cells.includes(c))) return base(cells);
  }
  const fill: CellId = compound(meter) ? 'dq' : 'q';
  return base(Array.from({ length: Math.round((bars * per) / CELLS[fill].beats) }, () => fill));
}

/** Minimal-pair distractors: change one cell for another of the same length (never sounding identical). */
export function distractors(r: Rhythm, level: RhythmLevel, count: number, seed: number): Rhythm[] {
  const rnd = mulberry32(seed);
  const m = meterOf(r);
  const sig = signature(r);
  const out: Rhythm[] = [];
  const seen = new Set([sig]);
  const sameLen = (c: CellId) =>
    (Object.keys(CELLS) as CellId[]).filter((x) => Math.abs(CELLS[x].beats - CELLS[c].beats) < 1e-9 && CELLS[x].level <= level && x !== c && cellFits(x, m));
  for (let tries = 0; tries < 400 && out.length < count; tries++) {
    const i = Math.floor(rnd() * r.cells.length);
    const alts = sameLen(r.cells[i]);
    // Swapping a two-beat cell for two one-beat cells keeps the bar full.
    let cells: CellId[] | null = null;
    if (alts.length) {
      cells = r.cells.slice();
      cells[i] = alts[Math.floor(rnd() * alts.length)];
    } else if (CELLS[r.cells[i]].beats === 2) {
      const pool = POOLS[level].filter((c) => CELLS[c].beats === 1 && cellFits(c, m));
      if (!pool.length) continue;
      cells = [...r.cells.slice(0, i), pool[Math.floor(rnd() * pool.length)], pool[Math.floor(rnd() * pool.length)], ...r.cells.slice(i + 1)];
    }
    if (!cells) continue;
    const cand: Rhythm = { ...r, cells };
    const s = signature(cand);
    if (!seen.has(s) && onsetBeats(cand).length > 0) {
      seen.add(s);
      out.push(cand);
    }
  }
  return out;
}

// ---------------------------------------------------------------- audio

/** Count-in: one bar of metronome pulses. */
const countInPulses = (m: Meter) => barBeats(m) / pulseBeats(m);

/**
 * Note events for hearing a rhythm (single pitch, durations audible) after a one-bar count-in.
 * `bpm` is always in quarter notes; in 6/8 the clicks fall on dotted quarters.
 */
export function rhythmSound(r: Rhythm, bpm: number, midi = 67, countIn?: number): { events: NoteEvent[]; length: number } {
  const m = meterOf(r);
  const beat = 60 / bpm;
  const pulse = beat * pulseBeats(m);
  const n = countIn ?? countInPulses(m);
  const out: NoteEvent[] = [];
  for (let i = 0; i < n; i++) out.push({ midi: 96, start: i * pulse, duration: 0.05, velocity: i === 0 ? 0.5 : 0.3, perc: i === 0 ? 'accent' : 'click' });
  const t0 = n * pulse;
  // The metronome keeps going softly under the rhythm (playtesting 0.37): the pulse is the frame you hear it in.
  const perBar = countInPulses(m);
  const passage = Math.round(totalBeats(r) / pulseBeats(m));
  for (let i = 0; i < passage; i++) out.push({ midi: 96, start: t0 + i * pulse, duration: 0.05, velocity: i % perBar === 0 ? 0.26 : 0.16, perc: i % perBar === 0 ? 'accent' : 'click' });
  for (const e of events(r)) {
    if (e.rest) continue;
    // A snare hit marks each note; a soft held tone under it keeps long notes audibly long (a half is not a quarter + rest).
    const at = t0 + (e.start / TPQ) * beat;
    out.push({ midi: 38, start: at, duration: 0.05, velocity: 0.85, perc: 'snare' });
    out.push({ midi, start: at, duration: Math.max(0.1, (e.dur / TPQ) * beat * 0.92), velocity: 0.3 });
  }
  return { events: out, length: t0 + totalBeats(r) * beat + 0.4 };
}

/** Timeline for performing: one-bar count-in, then clicks on every pulse of the passage. */
export function readTimeline(r: Rhythm, bpm: number, silentAfterBars?: number) {
  const m = meterOf(r);
  const b = 60 / bpm;
  const pulse = b * pulseBeats(m);
  const perBar = countInPulses(m);
  const n = perBar + Math.round(totalBeats(r) / pulseBeats(m));
  // Internal pulse (spec AD): after the count-in and `silentAfterBars` bars, the clicks stop.
  const keep = silentAfterBars === undefined ? n : perBar * (1 + silentAfterBars);
  const clicks = Array.from({ length: Math.min(n, keep) }, (_, i) => ({ t: i * pulse, accent: i % perBar === 0 }));
  const responseAt = perBar * pulse;
  return { clicks, wood: [] as number[], responseAt, responseEnd: responseAt + totalBeats(r) * b + b * 0.6 };
}

// ---------------------------------------------------------------- grading a performance

/** Distance (in beats) from a right onset to the nearest plausible wrong one, per level (spec G.5). */
const NEAREST_WRONG: Record<RhythmLevel, number> = { 1: 0.5, 2: 0.5, 3: 0.5, 4: 0.25, 5: 0.5, 6: 1 / 6, 7: 0.5, 8: 1 / 6 };

/** Tolerance = 40 % of the distance that must be distinguished, never under 45 ms. */
export function readTolerance(level: RhythmLevel, bpm: number): number {
  const beatMs = 60000 / bpm;
  return Math.max(45, Math.round(beatMs * NEAREST_WRONG[level] * 0.4));
}

export interface ReadGrade {
  pass: boolean;
  /** 0..1 for the scoring model: 70 % pattern, 30 % precision (spec J.2). */
  accuracy: number;
  pattern: number;
  precision: number;
  grade: RhythmGrade;
}

export function gradeReading(r: Rhythm, bpm: number, tapsMs: number[], level: RhythmLevel): ReadGrade {
  const tol = readTolerance(level, bpm);
  const p = { bpm, beats: totalBeats(r), onsets: onsetBeats(r) };
  const g = gradeRhythm(p, tapsMs, tol);
  const hit = g.hits.filter((h) => h.offsetMs !== null).length;
  const pattern = Math.max(0, (hit - g.extra) / p.onsets.length);
  const offs = g.hits.filter((h) => h.offsetMs !== null).map((h) => Math.abs(h.offsetMs!));
  const precision = offs.length ? Math.max(0, 1 - offs.reduce((a, b) => a + b, 0) / offs.length / tol) : 0;
  return { pass: g.pass, accuracy: 0.7 * pattern + 0.3 * precision, pattern, precision, grade: g };
}

/**
 * Hold-to-sustain (spec G.5): for every note of a beat or longer, the press that starts it must last at
 * least 60 % of the note (and not run on more than a quarter-beat into the next one). Presses are
 * {down, up} in ms from beat 1. Returns how many long notes were judged and how many were held right.
 */
export function gradeHolds(r: Rhythm, bpm: number, presses: { down: number; up: number | null }[]): { judged: number; held: number } {
  const beatMs = 60_000 / bpm;
  const evs = events(r).filter((e) => !e.rest && e.dur >= TPQ);
  let judged = 0;
  let held = 0;
  for (const e of evs) {
    const start = (e.start / TPQ) * beatMs;
    const len = (e.dur / TPQ) * beatMs;
    const p = presses.find((x) => Math.abs(x.down - start) <= Math.min(160, beatMs / 3));
    if (!p || p.up === null) continue;
    judged++;
    const d = p.up - p.down;
    if (d >= 0.6 * len && d <= len + beatMs / 4) held++;
  }
  return { judged, held };
}

// ---------------------------------------------------------------- words (spec G.4)

export type RhythmWords = 'names' | 'syllables';

const NAMES: Record<CellId, { en: string; he: string }> = {
  q: { en: 'quarter', he: 'רבע' },
  qr: { en: 'quarter rest', he: 'הפסקת רבע' },
  h: { en: 'half', he: 'חצי' },
  w: { en: 'whole', he: 'שלם' },
  ee: { en: 'two eighths', he: 'שתי שמיניות' },
  dqe: { en: 'dotted quarter, eighth', he: 'רבע מנוקד, שמינית' },
  ssss: { en: 'four sixteenths', he: 'ארבע שש-עשריות' },
  es: { en: 'eighth, two sixteenths', he: 'שמינית ושתי שש-עשריות' },
  se: { en: 'two sixteenths, eighth', he: 'שתי שש-עשריות ושמינית' },
  syn: { en: 'eighth, quarter, eighth', he: 'סינקופה' },
  ere: { en: 'eighth rest, eighth', he: 'הפסקת שמינית ושמינית' },
  trip: { en: 'triplet', he: 'טריולה' },
  dh: { en: 'dotted half', he: 'חצי מנוקד' },
  dq: { en: 'dotted quarter', he: 'רבע מנוקד' },
  qe: { en: 'quarter, eighth', he: 'רבע ושמינית' },
  eq: { en: 'eighth, quarter', he: 'שמינית ורבע' },
  eee: { en: 'three eighths', he: 'שלוש שמיניות' },
  dqr: { en: 'dotted quarter rest', he: 'הפסקת רבע מנוקד' },
  qtrip: { en: 'quarter-note triplet', he: 'טריולת רבעים' },
};
const SYLLABLES: Record<CellId, { en: string; he: string }> = {
  q: { en: 'ta', he: 'טָה' },
  qr: { en: 'sh', he: 'שְׁ' },
  h: { en: 'ta-a', he: 'טָה-אָה' },
  w: { en: 'ta-a-a-a', he: 'טָה-אָה-אָה-אָה' },
  ee: { en: 'ti-ti', he: 'טִי-טִי' },
  dqe: { en: 'ta-i ti', he: 'טָה-אִי טִי' },
  ssss: { en: 'tika-tika', he: 'טִיקָה-טִיקָה' },
  es: { en: 'ti tika', he: 'טִי טִיקָה' },
  se: { en: 'tika ti', he: 'טִיקָה טִי' },
  syn: { en: 'syn-co-pa', he: 'סִין-קוֹ-פָּה' },
  ere: { en: 'sh-ti', he: 'שְׁ-טִי' },
  trip: { en: 'tri-o-la', he: 'טְרִי-אוֹ-לָה' },
  dh: { en: 'ta-a-a', he: 'טָה-אָה-אָה' },
  dq: { en: 'ta-i-i', he: 'טָה-אִי-אִי' },
  qe: { en: 'ta ti', he: 'טָה טִי' },
  eq: { en: 'ti ta', he: 'טִי טָה' },
  eee: { en: 'ti-ti-ti', he: 'טִי-טִי-טִי' },
  dqr: { en: 'sh-sh', he: 'שְׁ-שְׁ' },
  qtrip: { en: 'ta-ta-ta', he: 'טָה-טָה-טָה' },
};

export function describe(r: Rhythm, words: RhythmWords, lang: 'he' | 'en'): string {
  const table = words === 'names' ? NAMES : SYLLABLES;
  const per = barBeats(meterOf(r));
  const bars: string[] = [];
  let cur: string[] = [];
  let beats = 0;
  for (const c of r.cells) {
    cur.push(table[c][lang]);
    beats += CELLS[c].beats;
    if (Math.abs(beats - per) < 1e-9 || beats > per) {
      bars.push(cur.join(words === 'names' ? ', ' : ' '));
      cur = [];
      beats = 0;
    }
  }
  if (cur.length) bars.push(cur.join(words === 'names' ? ', ' : ' '));
  const m = meterOf(r);
  const prefix = [r.swing ? (lang === 'en' ? 'swing' : 'סווינג') : '', m !== '4/4' ? m : ''].filter(Boolean).join(' ');
  return (prefix ? `${prefix}: ` : '') + bars.join(' | ');
}

/** Spoken description → cells (names or syllables, English or Hebrew). Null when unparseable. */
export function parseRhythmWords(text: string, meter?: Meter): CellId[] | null {
  const t = ` ${text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[,|.:]/g, ' ')
    .replace(/\b(swing|3\/4|6\/8)\b|סווינג/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
  const N = '(?![-\\w\\u0590-\\u05FF])';
  const patterns: [RegExp, CellId[]][] = [
    [new RegExp(`\\b(quarter-note triplet|ta-ta-ta)${N}|טריולת רבעים|טה-טה-טה`), ['qtrip']],
    [new RegExp(`\\b(dotted quarter rest|sh-sh)${N}|הפסקת רבע מנוקד|ש-ש${N}`), ['dqr']],
    [/\b(dotted quarter( note)? (and )?(an )?eighth|ta-?i ti)\b|רבע מנוקד(,)? (ו)?שמינית|טה-?אי טי/, ['dqe']],
    [new RegExp(`\\b(dotted quarter( note)?|ta-i-i)${N}|רבע מנוקד${N}|טה-אי-אי`), ['dq']],
    [new RegExp(`\\b(dotted half( note)?|ta-?a-?a)${N}|חצי מנוקד|טה-?אה-?אה${N}`), ['dh']],
    [/\b(four sixteenths|sixteenths|ti-?ka-?ti-?ka|tika-?tika)\b|ארבע שש-?עשריות|שש-?עשריות|טיקה-?טיקה|טי-?קה-?טי-?קה/, ['ssss']],
    [/\b(eighth,? (and )?two sixteenths|ti tika)\b|שמינית ושתי שש-?עשריות|טי טיקה/, ['es']],
    [/\b(two sixteenths,? (and )?(an )?eighth|tika ti)\b|שתי שש-?עשריות ושמינית|טיקה טי(?![-֐-׿])/, ['se']],
    [/\b(syncopa(tion)?|syn-?co-?pa|eighth,? quarter,? eighth)\b|סינקופה|סין-?קו-?פה/, ['syn']],
    [/\b(eighth rest,? (and )?(an )?eighth\b|sh-ti(?![-\w]))|הפסקת שמינית( ו)?שמינית|ש-טי(?![-֐-׿])/, ['ere']],
    [/\b(triplet|tri-?o-?la)\b|טריולה|טרי-?או-?לה/, ['trip']],
    [/\b(three eighths|ti-ti-ti)\b|שלוש שמיניות|טי-טי-טי/, ['eee']],
    [new RegExp(`\\b(quarter,? (and )?(an )?eighth|ta ti)${N}|רבע ושמינית|טה טי${N}`), ['qe']],
    [new RegExp(`\\b(eighth,? (and )?(a )?quarter|ti ta)${N}|שמינית ורבע|טי טה${N}`), ['eq']],
    [/\b(quarter rest|rest|sh)\b|הפסקת רבע|הפסקה|ש(?=\s)/, ['qr']],
    [/\b(two eighths?|eighth notes|eighths|ti-?ti)\b|שתי שמיניות|שמיניות|טי-?טי/, ['ee']],
    [/\b(whole( note)?|ta-?a-?a-?a)\b|שלם|טה-?אה-?אה-?אה/, ['w']],
    [/\b(half( note)?|ta-?a)\b|חצי|טה-?אה/, ['h']],
    [/\b(quarter( note)?|ta)\b|רבע|טה/, ['q']],
  ];
  const out: CellId[] = [];
  let rest = t;
  // Only cells that exist in this meter (a 6/8 "quarter, eighth" is not a 4/4 cell).
  const usable = meter ? patterns.filter(([, cells]) => cells.every((c) => cellFits(c, meter))) : patterns;
  for (let guard = 0; guard < 64 && rest.trim(); guard++) {
    let best: { idx: number; len: number; cells: CellId[] } | null = null;
    for (const [re, cells] of usable) {
      const m = re.exec(rest);
      if (m && (best === null || m.index < best.idx || (m.index === best.idx && m[0].length > best.len))) best = { idx: m.index, len: m[0].length, cells };
    }
    if (!best) break;
    out.push(...best.cells);
    rest = rest.slice(best.idx + best.len);
  }
  return out.length ? out : null;
}

export function sameRhythm(a: Rhythm, b: Rhythm) {
  return signature(a) === signature(b) && Math.abs(totalBeats(a) - totalBeats(b)) < 1e-9 && meterOf(a) === meterOf(b);
}

/** "q.ee.h" (4/4), "m3:…" (3/4), "m6:…" (6/8), "sw:…" (swing). */
export const rhythmKey = (r: Rhythm) => `${r.swing ? 'sw:' : ''}${meterOf(r) === '3/4' ? 'm3:' : meterOf(r) === '6/8' ? 'm6:' : meterOf(r) === '12/8' ? 'm12:' : ''}${r.cells.join('.')}`;
export function rhythmFromKey(k: string, bars = 1): Rhythm {
  let s = k;
  let swing = false;
  let meter: Meter = '4/4';
  if (s.startsWith('sw:')) {
    swing = true;
    s = s.slice(3);
  }
  if (s.startsWith('m3:')) {
    meter = '3/4';
    s = s.slice(3);
  } else if (s.startsWith('m6:')) {
    meter = '6/8';
    s = s.slice(3);
  } else if (s.startsWith('m12:')) {
    meter = '12/8';
    s = s.slice(4);
  }
  return { beatsPerBar: barBeats(meter), bars, cells: s.split('.').filter(Boolean) as CellId[], ...(meter !== '4/4' ? { meter } : {}), ...(swing ? { swing } : {}) };
}

/** Shuffle the right answer among distractors, deterministically. */
export function options(r: Rhythm, level: RhythmLevel, n: number, seed: number): Rhythm[] {
  return shuffle(mulberry32(seed), [r, ...distractors(r, level, n - 1, seed + 7)]);
}

/** Cells a player can build with at a level and meter (spec G.6 "Build"). */
export function buildPalette(level: RhythmLevel, meter: Meter): CellId[] {
  return [...new Set(POOLS[level])].filter((c) => cellFits(c, meter) && c !== 'w');
}
