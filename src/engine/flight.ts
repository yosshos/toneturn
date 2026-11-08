// Voice Flight (spec AE §8): a drone sets the key; gates (gaps between pillars) sit on scale degrees; the
// sung or played pitch is the bird's height. Levels: 1 = wide gates moving by step, 2 = narrow gates with
// leaps, 3 = chromatic. The course is generated from a seed (deterministic), so a checkpoint (every 10
// gates) is enough to resume after Back / reload. Pure: no browser APIs.

export type FlightLevel = 1 | 2 | 3;

export interface FlightRange {
  /** MIDI, lowest comfortable note. */
  low: number;
  /** MIDI, highest comfortable note. */
  high: number;
}

export interface Gate {
  i: number;
  /** World x of the pillar pair (units; the bird flies `speed` units per second). */
  x: number;
  /** MIDI of the gap's centre. */
  center: number;
  /** Half the gap height in semitones (passing = |pitch − centre| ≤ half). */
  half: number;
  level: FlightLevel;
  /** Semitones above the tonic, 0–11 (for the label). */
  semis: number;
}

export interface Course {
  seed: number;
  startLevel: FlightLevel;
  range: FlightRange;
  /** MIDI of the tonic gate (also sets the drone). */
  tonic: number;
  gates: Gate[];
}

export interface FlightState {
  /** Distance flown (world units). */
  x: number;
  /** Bird height as a (fractional) MIDI note. */
  y: number;
  /** Index of the next gate to reach. */
  next: number;
  passed: number;
  lives: number;
  over: boolean;
}

export type FlightEvent = 'pass' | 'hit' | 'checkpoint' | 'level' | 'over';

export interface FlightCheckpoint {
  v: 1;
  seed: number;
  startLevel: FlightLevel;
  next: number;
  passed: number;
  lives: number;
  x: number;
  /** The range the course was built for (the same course comes back on resume). */
  range: FlightRange;
}

export const LEAD = 520;
export const GATE_SPACING = 300;
export const START_LIVES = 3;
export const CHECKPOINT_EVERY = 10;
/** Gates per level before the course moves to the next level. */
export const GATES_PER_LEVEL = 30;

export const LEVELS: Record<FlightLevel, { half: number; speed: number; chromatic: boolean }> = {
  1: { half: 1.5, speed: 110, chromatic: false },
  2: { half: 0.9, speed: 125, chromatic: false },
  3: { half: 0.65, speed: 135, chromatic: true },
};
/** Reduced motion: a slower course (spec §10.4). */
export const CALM_SPEED = 0.75;

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const CHROMA = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const levelAt = (start: FlightLevel, i: number): FlightLevel => Math.min(3, start + Math.floor(i / GATES_PER_LEVEL)) as FlightLevel;

/** The label inside a gap: the degree ("5") or a chromatic degree ("♭3"). */
export const gateLabel = (g: Gate): string => CHROMA[((g.semis % 12) + 12) % 12];

/** The comfortable range to fly in: the voice range, or a keyboard / instrument range. */
export function flightRange(voiceRange: FlightRange | null | undefined, input: 'voice' | 'midi' | 'instrument'): FlightRange {
  if (input === 'midi') return { low: 57, high: 76 };
  if (input === 'instrument') return voiceRange && voiceRange.high - voiceRange.low >= 12 ? voiceRange : { low: 55, high: 74 };
  // The singer's own range, never beyond it (0.52, owner: "limit every voice exercise to my range"). A narrow range
  // stays narrow — the course just uses fewer notes; only a missing range falls back to a middle octave.
  return voiceRange && voiceRange.high > voiceRange.low ? { low: voiceRange.low, high: voiceRange.high } : { low: 55, high: 67 };
}

/** The visible pitch band (a little air above and below the range). */
export const viewBand = (r: FlightRange) => ({ low: r.low - 3, high: r.high + 3 });

/** An octave error is not a crash: the pitch is folded into the band (sung an octave down still flies). */
export function foldPitch(midi: number, r: FlightRange): number {
  const b = viewBand(r);
  let m = midi;
  for (let k = 0; k < 8 && m < b.low; k++) m += 12;
  for (let k = 0; k < 8 && m > b.high; k++) m -= 12;
  return m;
}

/** A new course: the key comes from the seed; the tonic sits near the middle of the range. */
export function makeCourse(seed: number, startLevel: FlightLevel, range: FlightRange): Course {
  const r = rng(seed);
  const pc = Math.floor(r() * 12);
  const mid = (range.low + range.high) / 2;
  let tonic = range.low + ((pc - range.low) % 12 + 12) % 12;
  while (tonic + 12 <= mid + 3 && tonic + 12 <= range.high) tonic += 12;
  if (Math.abs(tonic + 12 - mid) < Math.abs(tonic - mid) && tonic + 12 <= range.high) tonic += 12;
  // A narrow range may not hold this key's tonic at all: then the key moves so its tonic sits in the middle of the range.
  if (tonic > range.high || tonic < range.low) tonic = Math.round(mid);
  const c: Course = { seed, startLevel, range, tonic, gates: [] };
  ensureGates(c, 12);
  return c;
}

/** Notes the gates may sit on (inside the comfortable range). */
function pool(c: Course, chromatic: boolean): number[] {
  const out: number[] = [];
  for (let m = c.range.low; m <= c.range.high; m++) {
    const s = (((m - c.tonic) % 12) + 12) % 12;
    if (chromatic || MAJOR.includes(s)) out.push(m);
  }
  return out;
}

/** Extend the course to at least n gates (sequential, seeded: always the same course for a seed). */
export function ensureGates(c: Course, n: number): Gate[] {
  while (c.gates.length < n) {
    const i = c.gates.length;
    const level = levelAt(c.startLevel, i);
    const cfg = LEVELS[level];
    const notes = pool(c, cfg.chromatic);
    const r = rng((c.seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0);
    let center: number;
    if (i === 0) center = c.tonic;
    else {
      const prev = c.gates[i - 1].center;
      let k = notes.indexOf(prev);
      if (k < 0) k = notes.reduce((best, m, j) => (Math.abs(m - prev) < Math.abs(notes[best] - prev) ? j : best), 0);
      let move: number;
      if (level === 1) move = r() < 0.2 ? 0 : r() < 0.5 ? -1 : 1;
      else if (level === 2) move = (1 + Math.floor(r() * 4)) * (r() < 0.5 ? -1 : 1); // a step up to a 5th
      else move = (1 + Math.floor(r() * 7)) * (r() < 0.5 ? -1 : 1); // up to 7 semitones
      let j = k + move;
      if (j < 0 || j >= notes.length) j = k - move; // bounce off the edge of the range
      j = Math.max(0, Math.min(notes.length - 1, j));
      center = notes[j];
    }
    c.gates.push({ i, x: LEAD + i * GATE_SPACING, center, half: cfg.half, level, semis: (((center - c.tonic) % 12) + 12) % 12 });
  }
  return c.gates;
}

export function initState(c: Course, cp?: FlightCheckpoint | null): FlightState {
  if (cp && cp.seed === c.seed) {
    ensureGates(c, cp.next + 12);
    const g = c.gates[Math.max(0, cp.next - 1)];
    return { x: cp.next > 0 ? g.x + 40 : 0, y: c.gates[cp.next]?.center ?? c.tonic, next: cp.next, passed: cp.passed, lives: cp.lives, over: false };
  }
  return { x: 0, y: c.tonic, next: 0, passed: 0, lives: START_LIVES, over: false };
}

export const checkpointOf = (c: Course, s: FlightState): FlightCheckpoint => ({ v: 1, seed: c.seed, startLevel: c.startLevel, next: s.next, passed: s.passed, lives: s.lives, x: s.x, range: c.range });

export function isCheckpoint(v: unknown): v is FlightCheckpoint {
  const o = v as FlightCheckpoint | null;
  return !!o && o.v === 1 && typeof o.seed === 'number' && typeof o.next === 'number' && typeof o.passed === 'number' && typeof o.lives === 'number' && typeof o.range?.low === 'number' && typeof o.range?.high === 'number' && [1, 2, 3].includes(o.startLevel);
}

/** Bird speed (units/s) at the current gate. */
export const speedOf = (c: Course, s: FlightState, calm = false) => LEVELS[levelAt(c.startLevel, s.next)].speed * (calm ? CALM_SPEED : 1);

/**
 * Advance the world by dt seconds. `pitch` is the folded sung / played MIDI (null = silence: the bird sinks
 * slowly). Returns the new state and what happened.
 */
export function step(c: Course, s0: FlightState, dt: number, pitch: number | null, calm = false): { s: FlightState; events: FlightEvent[] } {
  if (s0.over) return { s: s0, events: [] };
  const events: FlightEvent[] = [];
  const s = { ...s0 };
  const band = viewBand(c.range);
  if (pitch !== null) s.y += (pitch - s.y) * (1 - Math.exp(-dt / 0.09));
  else s.y = Math.max(band.low, s.y - 1.6 * dt);
  s.x += speedOf(c, s, calm) * dt;
  ensureGates(c, s.next + 4);
  while (!s.over && c.gates[s.next].x <= s.x) {
    const g = c.gates[s.next];
    const prevLevel = levelAt(c.startLevel, s.next);
    if (Math.abs(s.y - g.center) <= g.half) {
      s.passed++;
      events.push('pass');
    } else {
      s.lives--;
      events.push('hit');
    }
    s.next++;
    ensureGates(c, s.next + 4);
    if (s.lives <= 0) {
      s.over = true;
      events.push('over');
      break;
    }
    if (s.next % CHECKPOINT_EVERY === 0) events.push('checkpoint');
    if (levelAt(c.startLevel, s.next) !== prevLevel) events.push('level');
  }
  return { s, events };
}

export const distanceOf = (s: FlightState) => Math.floor(s.x / 100);
/** Score = distance (1 per 100 units) + 10 per gate. */
export const scoreOf = (s: FlightState) => distanceOf(s) + s.passed * 10;

/** Drone notes for the course (tonic + fifth, an octave under the tonic gate). */
export const droneOf = (c: Course) => [c.tonic - 12, c.tonic - 5];

/**
 * Touch / keyboard steering (no microphone): the next note one scale step above (dir 1) or below (−1) `midi`
 * in the course's key — a semitone on chromatic levels — kept inside the visible band.
 */
export function scaleStep(c: Course, midi: number, dir: 1 | -1, chromatic = false): number {
  const b = viewBand(c.range);
  const from = Math.round(midi);
  for (let m = from + dir; m >= Math.floor(b.low) && m <= Math.ceil(b.high); m += dir) {
    const s = (((m - c.tonic) % 12) + 12) % 12;
    if (chromatic || MAJOR.includes(s)) return m;
  }
  return from;
}

/** Touch steering: a height on the course (0 = top, 1 = bottom) as a MIDI pitch inside the band. */
export function heightToMidi(c: Course, frac: number): number {
  const b = viewBand(c.range);
  return b.high - Math.max(0, Math.min(1, frac)) * (b.high - b.low);
}
