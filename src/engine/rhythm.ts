// Rhythm reading & dictation (spec addendum G): canonical model, levels R1–R3, words, grading. Pure.

import { mulberry32, shuffle } from './lesson';
import type { NoteEvent } from './lesson';
import { gradeRhythm, type RhythmGrade } from './memory';

/** 12 ticks per quarter: eighth 6, sixteenth 3, eighth-triplet 4, dotted quarter 18. */
export const TPQ = 12;

/** A rhythm cell — the unit players build and name. Spans one or more beats in 4/4. */
export type CellId = 'q' | 'qr' | 'h' | 'w' | 'ee' | 'dqe';

export interface CellDef {
  id: CellId;
  beats: number;
  /** Events relative to the cell start, in ticks. */
  events: { start: number; dur: number; rest?: boolean }[];
  level: 1 | 2 | 3;
}

export const CELLS: Record<CellId, CellDef> = {
  q: { id: 'q', beats: 1, events: [{ start: 0, dur: 12 }], level: 1 },
  qr: { id: 'qr', beats: 1, events: [{ start: 0, dur: 12, rest: true }], level: 1 },
  h: { id: 'h', beats: 2, events: [{ start: 0, dur: 24 }], level: 1 },
  w: { id: 'w', beats: 4, events: [{ start: 0, dur: 48 }], level: 1 },
  ee: { id: 'ee', beats: 1, events: [{ start: 0, dur: 6 }, { start: 6, dur: 6 }], level: 2 },
  dqe: { id: 'dqe', beats: 2, events: [{ start: 0, dur: 18 }, { start: 18, dur: 6 }], level: 3 },
};

export interface RhythmEvent {
  start: number; // ticks from the start of bar 1
  dur: number;
  rest: boolean;
}

export interface Rhythm {
  /** 4/4 only at R1–R3. */
  beatsPerBar: 4;
  bars: number;
  cells: CellId[];
}

export function events(r: Rhythm): RhythmEvent[] {
  const out: RhythmEvent[] = [];
  let beat = 0;
  for (const c of r.cells) {
    for (const e of CELLS[c].events) out.push({ start: beat * TPQ + e.start, dur: e.dur, rest: !!e.rest });
    beat += CELLS[c].beats;
  }
  return out;
}

export const totalBeats = (r: Rhythm) => r.cells.reduce((a, c) => a + CELLS[c].beats, 0);

/** Onsets in beats (sounding notes only) — what performance is graded on. */
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

const POOLS: Record<1 | 2 | 3, CellId[]> = {
  1: ['q', 'q', 'q', 'qr', 'h', 'w'],
  2: ['q', 'q', 'ee', 'ee', 'qr', 'h'],
  3: ['q', 'ee', 'dqe', 'dqe', 'qr', 'h'],
};

/**
 * Generate `bars` bars of 4/4 at a level. Cells never cross a bar line; a bar never starts with a rest
 * at R1; each level's new cell appears at least once.
 */
export function rhythmAt(level: 1 | 2 | 3, bars: number, seed: number): Rhythm {
  const rnd = mulberry32(seed);
  for (let tries = 0; tries < 200; tries++) {
    const cells: CellId[] = [];
    for (let b = 0; b < bars; b++) {
      let left = 4;
      while (left > 0) {
        const pool = POOLS[level].filter((c) => CELLS[c].beats <= left && !(left === 4 && b === 0 && c === 'qr'));
        const c = pool[Math.floor(rnd() * pool.length)];
        cells.push(c);
        left -= CELLS[c].beats;
      }
    }
    const newCell: Record<number, CellId[]> = { 1: ['h', 'qr'], 2: ['ee'], 3: ['dqe'] };
    if (newCell[level].some((c) => cells.includes(c))) return { beatsPerBar: 4, bars, cells };
  }
  return { beatsPerBar: 4, bars, cells: Array.from({ length: bars * 4 }, () => 'q' as CellId) };
}

/** Minimal-pair distractors: change one cell for another of the same length (never sounding identical). */
export function distractors(r: Rhythm, level: 1 | 2 | 3, count: number, seed: number): Rhythm[] {
  const rnd = mulberry32(seed);
  const sig = signature(r);
  const out: Rhythm[] = [];
  const seen = new Set([sig]);
  const sameLen = (c: CellId) => (Object.keys(CELLS) as CellId[]).filter((x) => CELLS[x].beats === CELLS[c].beats && CELLS[x].level <= level && x !== c);
  for (let tries = 0; tries < 300 && out.length < count; tries++) {
    const i = Math.floor(rnd() * r.cells.length);
    const alts = sameLen(r.cells[i]);
    // Swapping a two-beat cell for two one-beat cells keeps the bar full.
    let cells: CellId[] | null = null;
    if (alts.length) {
      cells = r.cells.slice();
      cells[i] = alts[Math.floor(rnd() * alts.length)];
    } else if (CELLS[r.cells[i]].beats === 2) {
      const pool = POOLS[level].filter((c) => CELLS[c].beats === 1);
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

/** Note events for hearing a rhythm (single pitch, durations audible) after a count-in of clicks. */
export function rhythmSound(r: Rhythm, bpm: number, midi = 67, countIn = 4): { events: NoteEvent[]; length: number } {
  const beat = 60 / bpm;
  const out: NoteEvent[] = [];
  for (let i = 0; i < countIn; i++) out.push({ midi: 96, start: i * beat, duration: 0.05, velocity: i === 0 ? 0.5 : 0.3, perc: i === 0 ? 'accent' : 'click' });
  const t0 = countIn * beat;
  for (const e of events(r)) {
    if (e.rest) continue;
    out.push({ midi, start: t0 + (e.start / TPQ) * beat, duration: Math.max(0.12, (e.dur / TPQ) * beat * 0.92), velocity: 0.7 });
  }
  return { events: out, length: t0 + totalBeats(r) * beat + 0.4 };
}

/** Timeline for performing: one-bar count-in, then clicks under every beat of the passage. */
export function readTimeline(r: Rhythm, bpm: number, countIn = 4) {
  const b = 60 / bpm;
  const beats = totalBeats(r);
  const clicks = Array.from({ length: countIn + beats }, (_, i) => ({ t: i * b, accent: i % 4 === 0 }));
  return { clicks, wood: [] as number[], responseAt: countIn * b, responseEnd: (countIn + beats) * b + b * 0.6 };
}

// ---------------------------------------------------------------- grading a performance

/**
 * Tolerance follows the grid that must be distinguished (spec G.5): R1 quarters → wrong onsets are a
 * half beat away; eighths (R2–R3) → a quarter beat away. Tolerance = 40 % of that distance.
 */
export function readTolerance(level: 1 | 2 | 3, bpm: number): number {
  const beatMs = 60000 / bpm;
  const nearestWrong = level === 1 ? 0.5 : 0.5; // eighth-grid neighbours at all three levels
  return Math.round(beatMs * nearestWrong * 0.4);
}

export interface ReadGrade {
  pass: boolean;
  /** 0..1 for the scoring model: 70 % pattern, 30 % precision (spec J.2). */
  accuracy: number;
  pattern: number;
  precision: number;
  grade: RhythmGrade;
}

export function gradeReading(r: Rhythm, bpm: number, tapsMs: number[], level: 1 | 2 | 3): ReadGrade {
  const tol = readTolerance(level, bpm);
  const p = { bpm, beats: totalBeats(r), onsets: onsetBeats(r) };
  const g = gradeRhythm(p, tapsMs, tol);
  const hit = g.hits.filter((h) => h.offsetMs !== null).length;
  const pattern = Math.max(0, (hit - g.extra) / p.onsets.length);
  const offs = g.hits.filter((h) => h.offsetMs !== null).map((h) => Math.abs(h.offsetMs!));
  const precision = offs.length ? Math.max(0, 1 - offs.reduce((a, b) => a + b, 0) / offs.length / tol) : 0;
  return { pass: g.pass, accuracy: 0.7 * pattern + 0.3 * precision, pattern, precision, grade: g };
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
};
const SYLLABLES: Record<CellId, { en: string; he: string }> = {
  q: { en: 'ta', he: 'טָה' },
  qr: { en: 'sh', he: 'שְׁ' },
  h: { en: 'ta-a', he: 'טָה-אָה' },
  w: { en: 'ta-a-a-a', he: 'טָה-אָה-אָה-אָה' },
  ee: { en: 'ti-ti', he: 'טִי-טִי' },
  dqe: { en: 'ta-i ti', he: 'טָה-אִי טִי' },
};

export function describe(r: Rhythm, words: RhythmWords, lang: 'he' | 'en'): string {
  const table = words === 'names' ? NAMES : SYLLABLES;
  const bars: string[] = [];
  let cur: string[] = [];
  let beats = 0;
  for (const c of r.cells) {
    cur.push(table[c][lang]);
    beats += CELLS[c].beats;
    if (beats % 4 === 0) {
      bars.push(cur.join(words === 'names' ? ', ' : ' '));
      cur = [];
    }
  }
  return bars.join(' | ');
}

/** Spoken description → cells (names or syllables, English or Hebrew). Null when unparseable. */
export function parseRhythmWords(text: string): CellId[] | null {
  const t = ` ${text.toLowerCase().replace(/[,|.]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const patterns: [RegExp, CellId[]][] = [
    [/\b(dotted quarter( note)? (and )?(an )?eighth|ta-?i ti)\b|רבע מנוקד(,)? (ו)?שמינית|טה-?אי טי/, ['dqe']],
    [/\b(quarter rest|rest|sh)\b|הפסקת רבע|הפסקה|שְׁ|ש(?=\s)/, ['qr']],
    [/\b(two eighths?|eighth notes|eighths|ti-?ti)\b|שתי שמיניות|שמיניות|טי-?טי/, ['ee']],
    [/\b(whole( note)?|ta-?a-?a-?a)\b|שלם|טה-?אה-?אה-?אה/, ['w']],
    [/\b(half( note)?|ta-?a)\b|חצי|טה-?אה/, ['h']],
    [/\b(quarter( note)?|ta)\b|רבע|טה/, ['q']],
  ];
  const out: CellId[] = [];
  let rest = t;
  for (let guard = 0; guard < 64 && rest.trim(); guard++) {
    let best: { idx: number; len: number; cells: CellId[] } | null = null;
    for (const [re, cells] of patterns) {
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
  return signature(a) === signature(b) && totalBeats(a) === totalBeats(b);
}

export const rhythmKey = (r: Rhythm) => r.cells.join('.');
export const rhythmFromKey = (k: string, bars = 1): Rhythm => ({ beatsPerBar: 4, bars, cells: k.split('.').filter(Boolean) as CellId[] });

/** Shuffle the right answer among distractors, deterministically. */
export function options(r: Rhythm, level: 1 | 2 | 3, n: number, seed: number): Rhythm[] {
  return shuffle(mulberry32(seed), [r, ...distractors(r, level, n - 1, seed + 7)]);
}
