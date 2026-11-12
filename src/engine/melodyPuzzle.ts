// Melody Puzzle (spec AE §8): hear a melody after a cadence, put note tiles (+ 1–2 decoys) into slots.
// Levels follow staff-dictation difficulty: 3 notes by step → 8 notes with leaps, minor, chromatic. Pure.

import { mulberry32, pick, shuffle, type NoteEvent } from './lesson';
import { displayNote, majorCadence, pcValue, voiceChord, type Naming, type PitchClass } from './pitch';

export type PuzzleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** The highest level a free (untiered) run reaches; 9 (jazz lines, 0.75) is the ff tier's own. */
export const MAX_PUZZLE_LEVEL: PuzzleLevel = 8;
export const JAZZ_PUZZLE_LEVEL: PuzzleLevel = 9;

export interface PuzzleTile {
  id: string;
  /** Semitones above the tonic (0..12). */
  semis: number;
  /** Degree label: "1", "♭3", "♯4", "8". */
  degree: string;
  pc: PitchClass;
  midi: number;
  decoy: boolean;
}

export interface Puzzle {
  level: PuzzleLevel;
  seed: number;
  key: PitchClass;
  minor: boolean;
  tonicMidi: number;
  /** The melody, as semitones above the tonic. */
  answer: number[];
  /** Answer tiles (one per note) and decoys, shuffled. */
  tiles: PuzzleTile[];
  decoys: number[];
}

interface LevelDef {
  notes: number;
  /** Largest move, in scale steps. */
  maxStep: number;
  minor: boolean | 'either';
  /** Highest scale position (0 = tonic … 7 = octave). */
  top: number;
  chromatic: number;
  decoys: 1 | 2;
  /** 0.75: bebop lines (enclosures, bebop-scale passing tones), half of them an octave lower. */
  jazz?: boolean;
}

export const PUZZLE_LEVELS: Record<PuzzleLevel, LevelDef> = {
  1: { notes: 3, maxStep: 1, minor: false, top: 4, chromatic: 0, decoys: 1 },
  2: { notes: 4, maxStep: 1, minor: false, top: 5, chromatic: 0, decoys: 1 },
  3: { notes: 5, maxStep: 2, minor: false, top: 7, chromatic: 0, decoys: 1 },
  4: { notes: 5, maxStep: 4, minor: false, top: 7, chromatic: 0, decoys: 2 },
  5: { notes: 6, maxStep: 5, minor: false, top: 7, chromatic: 0, decoys: 2 },
  6: { notes: 6, maxStep: 4, minor: true, top: 7, chromatic: 0, decoys: 2 },
  7: { notes: 7, maxStep: 7, minor: 'either', top: 7, chromatic: 0, decoys: 2 },
  8: { notes: 8, maxStep: 5, minor: false, top: 7, chromatic: 2, decoys: 2 },
  9: { notes: 8, maxStep: 5, minor: false, top: 7, chromatic: 2, decoys: 2, jazz: true },
};

// 0.75 (Melody Puzzle ff): jazz lines as semitones above the tonic (0..12), own material from the bebop rules —
// an enclosure (scale note above, half step below, or both chromatic) lands a chord tone, the major bebop scale
// passes through ♭6, the dominant bebop through ♭7 and 7, a chromatic run falls from the 7th to the 5th.
const ENC_5 = [[9, 6, 7], [6, 8, 7], [8, 6, 7]];
const ENC_3 = [[5, 3, 4], [3, 5, 4]];
const JAZZ_LINES: ((rnd: () => number) => number[])[] = [
  (rnd) => [12, 11, 9, 8, 7, ...pick(rnd, ENC_3)], // major bebop down through ♭6, enclose the 3rd
  (rnd) => [...pick(rnd, ENC_5), 5, 4, 2, 1, 0], // enclose the 5th, down to the root with a chromatic step
  () => [0, 4, 7, 11, 10, 9, 8, 7], // arpeggio up, chromatic down from the 7th to the 5th
  (rnd) => [4, 7, 9, 10, 12, 11, ...pick(rnd, [[9, 7], [8, 7]])], // dominant bebop (♭7 and 7) over the V
  (rnd) => [2, 4, 5, 7, ...pick(rnd, ENC_3), 0], // up the scale, enclose the 3rd, home
];
/** A jazz line for level 9 (8 notes). */
export function jazzLine(rnd: () => number): number[] {
  return pick(rnd, JAZZ_LINES)(rnd);
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
/** Minor ladder: natural minor with the raised 7th as leading note (harmonic). */
const MINOR = [0, 2, 3, 5, 7, 8, 11, 12];
const MAJOR_KEYS = ['C', 'G', 'D', 'F', 'Bb', 'A', 'Eb'];
const MINOR_KEYS = ['A', 'E', 'D', 'C', 'G', 'B'];
const CHROMATIC = [1, 3, 6, 8, 10];

/** Label and letter offset per semitone (major-relative degree names). */
const DEGREE_OF: Record<number, { label: string; steps: number }> = {
  0: { label: '1', steps: 0 },
  1: { label: '♯1', steps: 0 },
  2: { label: '2', steps: 1 },
  3: { label: '♭3', steps: 2 },
  4: { label: '3', steps: 2 },
  5: { label: '4', steps: 3 },
  6: { label: '♯4', steps: 3 },
  7: { label: '5', steps: 4 },
  8: { label: '♭6', steps: 5 },
  9: { label: '6', steps: 5 },
  10: { label: '♭7', steps: 6 },
  11: { label: '7', steps: 6 },
  12: { label: '8', steps: 7 },
};

const LETTERS: PitchClass['letter'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

function toPc(name: string): PitchClass {
  return { letter: name[0] as PitchClass['letter'], acc: name.endsWith('b') ? -1 : name.endsWith('#') ? 1 : 0 };
}

/** Spelled pitch class of `semis` above `tonic`, using the degree's letter. */
export function spellDegree(tonic: PitchClass, semis: number): PitchClass {
  const d = DEGREE_OF[semis];
  const li = (LETTERS.indexOf(tonic.letter) + d.steps) % 7;
  const target = (pcValue(tonic) + semis) % 12;
  let acc = target - LETTER_PC[li];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return { letter: LETTERS[li], acc: Math.max(-2, Math.min(2, acc)) as PitchClass['acc'] };
}

const STABLE = new Set([0, 3, 4, 7, 12]);

function melody(rnd: () => number, def: LevelDef, ladder: number[]): number[] {
  const top = Math.min(def.top, ladder.length - 1);
  for (let tries = 0; tries < 400; tries++) {
    const starts = [0, 2, 4].filter((x) => x <= top);
    let pos = pick(rnd, starts);
    const out = [pos];
    while (out.length < def.notes) {
      const choices: number[] = [];
      for (let d = -def.maxStep; d <= def.maxStep; d++) {
        if (d === 0) continue;
        const p = pos + d;
        if (p < 0 || p > top) continue;
        // Steps are commoner than leaps.
        const w = Math.abs(d) === 1 ? 4 : Math.abs(d) === 2 ? 2 : 1;
        for (let k = 0; k < w; k++) choices.push(p);
      }
      pos = pick(rnd, choices);
      out.push(pos);
    }
    const semis = out.map((p) => ladder[p]);
    if (!STABLE.has(semis[semis.length - 1])) continue;
    // Bigger levels must actually use what they teach.
    if (def.maxStep >= 4 && !out.some((p, i) => i > 0 && Math.abs(p - out[i - 1]) >= 3)) continue;
    return semis;
  }
  return ladder.slice(0, def.notes).map((x) => x);
}

/** Chromatic neighbours (L8): a note a semitone from the next one, outside the scale. */
function addChromatic(rnd: () => number, semis: number[], count: number, ladder: number[]): number[] {
  const out = semis.slice();
  const positions = shuffle(rnd, Array.from({ length: out.length - 2 }, (_, i) => i + 1));
  let added = 0;
  for (const i of positions) {
    if (added >= count) break;
    const next = out[i + 1];
    const opts = [next - 1, next + 1].filter((x) => x > 0 && x < 12 && !ladder.includes(x) && CHROMATIC.includes(x) && x !== out[i - 1]);
    if (!opts.length) continue;
    // Not two chromatic notes in a row.
    if (out[i - 1] !== undefined && !ladder.includes(out[i - 1])) continue;
    out[i] = pick(rnd, opts);
    added++;
  }
  return out;
}

export function puzzleAt(level: PuzzleLevel, seed: number): Puzzle {
  const def = PUZZLE_LEVELS[level];
  const rnd = mulberry32((seed ^ (level * 0x9e3779b1)) >>> 0);
  const minor = def.minor === 'either' ? rnd() < 0.5 : def.minor;
  const key = toPc(pick(rnd, minor ? MINOR_KEYS : MAJOR_KEYS));
  const ladder = minor ? MINOR : MAJOR;
  let answer = def.jazz ? jazzLine(rnd) : melody(rnd, def, ladder);
  if (def.chromatic && !def.jazz) answer = addChromatic(rnd, answer, def.chromatic, ladder);
  const tp = pcValue(key);
  // jazz lines: half of them in the bass register (an octave lower)
  const tonicMidi = 60 + tp - (tp > 6 ? 12 : 0) - (def.jazz && rnd() < 0.5 ? 12 : 0);
  const used = new Set(answer);
  // Decoys: never a pitch of the answer; near the melody's range, from what this level could use.
  const pool = [...new Set([...ladder, ...(def.chromatic ? CHROMATIC : [])])].filter((x) => !used.has(x) && x <= 12);
  const lo = Math.min(...answer) - 2;
  const hi = Math.max(...answer) + 2;
  const near = pool.filter((x) => x >= lo && x <= hi);
  const decoys = shuffle(rnd, near.length >= def.decoys ? near : pool).slice(0, def.decoys);
  const tile = (semis: number, i: number, decoy: boolean): PuzzleTile => ({
    id: `${decoy ? 'd' : 'n'}${i}`,
    semis,
    degree: DEGREE_OF[semis].label,
    pc: spellDegree(key, semis),
    midi: tonicMidi + semis,
    decoy,
  });
  const tiles = shuffle(rnd, [...answer.map((s, i) => tile(s, i, false)), ...decoys.map((s, i) => tile(s, i, true))]);
  return { level, seed, key, minor, tonicMidi, answer, tiles, decoys };
}

export type TileNaming = 'degrees' | Naming;

export function tileLabel(t: PuzzleTile, naming: TileNaming, lang: 'he' | 'en'): string {
  if (naming === 'degrees') return t.degree;
  return displayNote(t.pc, naming, lang) + (t.semis >= 12 ? '′' : '');
}

/** Placed tile ids per slot (null = empty) → which slots are right (by pitch: equal tiles are interchangeable). */
export function checkPuzzle(p: Puzzle, placed: (string | null)[]): { correct: boolean[]; solved: boolean } {
  const byId = new Map(p.tiles.map((t) => [t.id, t]));
  const correct = p.answer.map((s, i) => {
    const id = placed[i];
    return !!id && byId.get(id)?.semis === s;
  });
  return { correct, solved: correct.every(Boolean) };
}

/** Points for a solved puzzle: 100, −10 per replay after the first hearing, −20 per extra check, + up to 20 for speed. */
export function puzzlePoints(o: { notes: number; replays: number; checks: number; ms: number }): number {
  const base = 100 - 10 * Math.max(0, o.replays) - 20 * Math.max(0, o.checks - 1);
  const speed = o.ms <= o.notes * 4000 ? 20 : o.ms <= o.notes * 8000 ? 10 : 0;
  return Math.max(10, base) + speed;
}

/** The key's cadence, then the melody (quarters, the last note held). */
export function puzzleEvents(p: Puzzle, bpm = 92, withCadence = true): { events: NoteEvent[]; length: number } {
  const beat = 60 / bpm;
  const out: NoteEvent[] = [];
  let t = 0;
  if (withCadence) {
    const chords = p.minor ? minorCadence(pcValue(p.key)) : majorCadence(p.key);
    for (const ch of chords) {
      for (const m of ch) out.push({ midi: m, start: t, duration: beat * 0.95, velocity: 0.42 });
      t += beat;
    }
    t += beat;
  }
  p.answer.forEach((s, i) => {
    const last = i === p.answer.length - 1;
    out.push({ midi: p.tonicMidi + s, start: t, duration: (last ? 2 : 1) * beat * 0.92, velocity: 0.72 });
    t += beat;
  });
  return { events: out, length: t + beat + 0.3 };
}

/** The player's answer, played back (empty slots are rests). */
export function answerEvents(p: Puzzle, placed: (string | null)[], bpm = 92): { events: NoteEvent[]; length: number } {
  const beat = 60 / bpm;
  const byId = new Map(p.tiles.map((t) => [t.id, t]));
  const out: NoteEvent[] = [];
  placed.forEach((id, i) => {
    const t = id ? byId.get(id) : null;
    if (t) out.push({ midi: t.midi, start: i * beat, duration: beat * 0.9, velocity: 0.7 });
  });
  return { events: out, length: placed.length * beat + 0.4 };
}

/** i – iv – V7 – i. */
export function minorCadence(tonicPc: number): number[][] {
  const i = voiceChord(tonicPc, 'min');
  const iv = voiceChord(tonicPc + 5, 'min', i.slice(1));
  const V = voiceChord(tonicPc + 7, 'dom7', iv.slice(1));
  const i2 = voiceChord(tonicPc, 'min', V.slice(1));
  return [i, iv, V, i2];
}

/** A run: this many puzzles; two solved at the first check in a row move up a level. */
export const PUZZLES_PER_RUN = 6;
export function nextLevel(level: PuzzleLevel, streak: number, max: PuzzleLevel = MAX_PUZZLE_LEVEL): { level: PuzzleLevel; streak: number } {
  if (streak >= 2 && level < max) return { level: (level + 1) as PuzzleLevel, streak: 0 };
  return { level, streak };
}
