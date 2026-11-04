// Vocal agility — riffs and runs (spec addendum K).
// A run is a fast scale-like passage. It is graded on pitch AND agility (clarity, evenness), and its
// difficulty reflects how hard it is to sing (speed, length, steps, turns, scale material, range).

import type { SungFrame } from './sing';
import { segmentNotes } from './memory';
import { mulberry32, pick } from './lesson';

export type RunMaterial = 'major' | 'minor' | 'maj-penta' | 'min-penta' | 'blues';
export type RunShape = 'up' | 'down' | 'turn' | 'zigzag' | 'thirds';

/** Semitone sets per octave. */
export const SCALES: Record<RunMaterial, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  'maj-penta': [0, 2, 4, 7, 9],
  'min-penta': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
};

export interface RunSpec {
  /** Semitones from the tonic, in order. */
  offsets: number[];
  /** Notes per second. */
  nps: number;
  material: RunMaterial;
  shape: RunShape;
  level: number;
}

export interface RunFactors {
  speed: number;
  length: number;
  step: number;
  turns: number;
  material: number;
  range: number;
}

/** Weights of each factor level (0–3) in rating points; calibrated later from player data (spec K.2). */
export const RUN_WEIGHTS: RunFactors = { speed: 90, length: 45, step: 55, turns: 40, material: 50, range: 40 };

const lvl = (x: number, cuts: number[]) => cuts.filter((c) => x >= c).length;

export function runFactors(r: RunSpec): RunFactors {
  const steps = r.offsets.slice(1).map((o, i) => o - r.offsets[i]);
  const maxStep = Math.max(0, ...steps.map(Math.abs));
  let turns = 0;
  for (let i = 1; i < steps.length; i++) if (Math.sign(steps[i]) !== Math.sign(steps[i - 1]) && steps[i] !== 0) turns++;
  const span = Math.max(...r.offsets) - Math.min(...r.offsets);
  return {
    speed: lvl(r.nps, [3, 4.5, 6]),
    length: lvl(r.offsets.length, [5, 8, 12]),
    step: maxStep <= 2 ? 0 : maxStep <= 4 ? 1 : maxStep <= 6 ? 2 : 3,
    turns: Math.min(3, turns),
    // Blues ♭5 / chromatic half steps are the hardest material.
    material: Math.min(3, { major: 0, minor: 0, 'maj-penta': 1, 'min-penta': 1, blues: 2 }[r.material] + (r.material === 'blues' && steps.some((x) => Math.abs(x) === 1) ? 1 : 0)),
    range: lvl(span, [8, 13, 17]),
  };
}

export function runDifficulty(r: RunSpec): number {
  const f = runFactors(r);
  return Math.round(900 + (Object.keys(f) as (keyof RunFactors)[]).reduce((s, k) => s + f[k] * RUN_WEIGHTS[k], 0));
}

/** The weakest factor among missed runs (for the diagnosis "speed above 5 n/s", "leaps", "blues ♭5"). */
export function hardestFactor(r: RunSpec): keyof RunFactors {
  const f = runFactors(r);
  return (Object.keys(f) as (keyof RunFactors)[]).sort((a, b) => f[b] * RUN_WEIGHTS[b] - f[a] * RUN_WEIGHTS[a])[0];
}

/** Curriculum: from "three-note step at 2 n/s" to "gospel run, 12 notes, blues, 7 n/s" (spec K.2). */
export const RUN_LEVELS: { len: number; nps: number; materials: RunMaterial[]; shapes: RunShape[] }[] = [
  { len: 3, nps: 2, materials: ['major'], shapes: ['up', 'down'] },
  { len: 5, nps: 2.7, materials: ['major', 'minor'], shapes: ['up', 'down'] },
  { len: 5, nps: 3.3, materials: ['maj-penta', 'major'], shapes: ['turn', 'down'] },
  { len: 6, nps: 4, materials: ['min-penta', 'maj-penta'], shapes: ['turn', 'down'] },
  { len: 8, nps: 4.5, materials: ['major', 'minor'], shapes: ['thirds', 'turn'] },
  { len: 8, nps: 5, materials: ['blues', 'min-penta'], shapes: ['zigzag', 'turn'] },
  { len: 10, nps: 6, materials: ['min-penta', 'blues'], shapes: ['down', 'zigzag'] },
  { len: 12, nps: 7, materials: ['blues'], shapes: ['zigzag', 'turn'] },
];
export const MAX_RUN_LEVEL = RUN_LEVELS.length;

/** Scale ladder (semitones) from a fifth below the tonic to two octaves above. */
function ladder(m: RunMaterial): number[] {
  const out: number[] = [];
  for (let oct = -1; oct <= 2; oct++) for (const s of SCALES[m]) out.push(oct * 12 + s);
  return out.filter((x) => x >= -5 && x <= 24);
}

export function buildRun(material: RunMaterial, shape: RunShape, len: number, startDeg: 'tonic' | 'fifth' | 'top'): number[] {
  const L = ladder(material);
  const startVal = startDeg === 'tonic' ? 0 : startDeg === 'fifth' ? 7 : 12;
  let i = L.indexOf(startVal);
  if (i < 0) i = L.findIndex((x) => x >= startVal);
  const moves: number[] = [];
  const half = Math.ceil(len / 2);
  for (let k = 1; k < len; k++) {
    switch (shape) {
      case 'up':
        moves.push(1);
        break;
      case 'down':
        moves.push(-1);
        break;
      case 'turn':
        moves.push(k < half ? 1 : -1);
        break;
      case 'zigzag':
        // Down the scale with a turn around each note: -2 +1 -2 +1 …
        moves.push(k % 2 ? -2 : 1);
        break;
      case 'thirds':
        moves.push(k % 2 ? 2 : -1);
        break;
    }
  }
  const out = [L[i]];
  for (const mv of moves) {
    i = Math.max(0, Math.min(L.length - 1, i + mv));
    out.push(L[i]);
  }
  return out;
}

export function runAt(level: number, seed: number): RunSpec {
  const lv = Math.max(1, Math.min(MAX_RUN_LEVEL, Math.round(level)));
  const def = RUN_LEVELS[lv - 1];
  const rnd = mulberry32(seed);
  const material = pick(rnd, def.materials);
  const shape = pick(rnd, def.shapes);
  const descending = shape === 'down' || shape === 'zigzag';
  const start = descending ? (def.len > 6 ? 'top' : 'fifth') : 'tonic';
  return { offsets: buildRun(material, shape, def.len, start), nps: def.nps, material, shape, level: lv };
}

/** The same run slower (slow-down practice, spec K.6). */
export const atTempo = (r: RunSpec, factor: number): RunSpec => ({ ...r, nps: Math.round(r.nps * factor * 10) / 10 });

/** Pitch tolerance widens with speed: ±35 ¢ held/slow → about ±50 ¢ at 6–8 n/s (spec K.3). */
export const runTolerance = (nps: number) => Math.round(Math.max(35, Math.min(50, 35 + (nps - 2) * 3.5)));

/** Detector/segmenter settings for fast notes. */
export const runSegmentOptions = (nps: number) => ({
  minSec: Math.max(0.06, Math.min(0.14, 0.5 / nps)),
  hold: nps >= 4 ? 2 : 3,
  gapFrames: 2,
});
export const runHopMs = (nps: number) => (nps >= 4 ? 20 : 33);

export type RunNoteStatus = 'ok' | 'sharp' | 'flat' | 'smeared' | 'wrong' | 'missed';

export interface RunGrade {
  notes: { status: RunNoteStatus; cents: number | null }[];
  extra: number;
  /** Mean per-note pitch credit (ok 1, sharp/flat 0.5), extras count as 0 (spec K.4). */
  pitch: number;
  /** Fraction of target notes that came out as a separate, stable note. */
  clarity: number;
  /** 1 = perfectly even note lengths. */
  evenness: number;
  /** a = 0.6 pitch + 0.25 clarity + 0.15 evenness. */
  accuracy: number;
  pass: boolean;
  unclear: boolean;
}

/** A note whose stable middle still moves faster than this (semitones/second) was glided through. */
export const SMEAR_ST_PER_SEC = 5;

/** Pitch slope over the middle 60 % of a note (scoops at the edges are natural in runs). */
function glideRate(frames: SungFrame[], start: number, end: number): number {
  const a = start + (end - start) * 0.2;
  const b = end - (end - start) * 0.2;
  const pts = frames.filter((f) => f.t >= a && f.t <= b && f.hz && f.confidence >= 0.8).map((f) => ({ t: f.t, m: 69 + 12 * Math.log2(f.hz! / 440) }));
  if (pts.length < 3) return 0;
  const mt = pts.reduce((s, p) => s + p.t, 0) / pts.length;
  const mm = pts.reduce((s, p) => s + p.m, 0) / pts.length;
  const num = pts.reduce((s, p) => s + (p.t - mt) * (p.m - mm), 0);
  const den = pts.reduce((s, p) => s + (p.t - mt) ** 2, 0);
  return den ? Math.abs(num / den) : 0;
}

const pcOf = (m: number) => ((Math.round(m) % 12) + 12) % 12;
const centsToPc = (midi: number, pc: number) => ((((midi - pc) * 100 + 600) % 1200) + 1200) % 1200 - 600;

/** Align sung notes to the target by pitch class (octave-free), returning index pairs. */
function align(target: number[], given: number[]): { ti: number | null; gi: number | null }[] {
  const n = target.length;
  const m = given.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + (target[i - 1] === given[j - 1] ? 0 : 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
  const out: { ti: number | null; gi: number | null }[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (target[i - 1] === given[j - 1] ? 0 : 1)) out.unshift({ ti: --i, gi: --j });
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) out.unshift({ ti: --i, gi: null });
    else out.unshift({ ti: null, gi: --j });
  }
  return out;
}

export function gradeRun(frames: SungFrame[], targetMidis: number[], nps: number): RunGrade {
  const tol = runTolerance(nps);
  const segs = segmentNotes(frames, runSegmentOptions(nps));
  const n = targetMidis.length;
  if (!segs.length) return { notes: targetMidis.map(() => ({ status: 'missed', cents: null })), extra: 0, pitch: 0, clarity: 0, evenness: 0, accuracy: 0, pass: false, unclear: true };
  const tpc = targetMidis.map(pcOf);
  const scalePcs = [...new Set(tpc)];
  // Each sung note → nearest pitch class (a semitone off is another note), keeping its deviation.
  const given = segs.map((s) => {
    const nearest = pcOf(s.midi);
    // Prefer a target pitch class within 50 ¢ (handles fractional midis near the boundary).
    const near = scalePcs.find((p) => Math.abs(centsToPc(s.midi, p)) <= 50);
    const pcv = near ?? nearest;
    return { pc: pcv, cents: Math.round(centsToPc(s.midi, pcv)), dur: s.end - s.start, glide: glideRate(frames, s.start, s.end) };
  });
  const pairs = align(
    tpc,
    given.map((g) => g.pc),
  );
  const notes: RunGrade['notes'] = Array.from({ length: n }, () => ({ status: 'missed' as RunNoteStatus, cents: null }));
  let extra = 0;
  const durs: number[] = [];
  for (const p of pairs) {
    if (p.ti === null) {
      extra++;
      continue;
    }
    if (p.gi === null) continue;
    const g = given[p.gi];
    durs.push(g.dur);
    if (g.pc !== tpc[p.ti]) notes[p.ti] = { status: 'wrong', cents: null };
    else if (g.glide > SMEAR_ST_PER_SEC) notes[p.ti] = { status: 'smeared', cents: g.cents };
    else notes[p.ti] = { status: Math.abs(g.cents) <= tol ? 'ok' : g.cents > 0 ? 'sharp' : 'flat', cents: g.cents };
  }
  const credit = notes.reduce((s, x) => s + (x.status === 'ok' ? 1 : x.status === 'sharp' || x.status === 'flat' ? 0.5 : x.status === 'smeared' ? 0.25 : 0), 0);
  // Glides through a pitch range break into many short "notes": extras count against pitch.
  const pitch = credit / (n + extra);
  const clarity = notes.filter((x) => x.status !== 'missed' && x.status !== 'smeared').length / n;
  let evenness = 0;
  if (durs.length >= 2) {
    // The last note may be held: leave it out.
    const body = durs.slice(0, -1);
    const mean = body.reduce((a, b) => a + b, 0) / body.length;
    const sd = Math.sqrt(body.reduce((a, b) => a + (b - mean) ** 2, 0) / body.length);
    evenness = Math.max(0, Math.min(1, 1 - sd / mean / 0.6));
  } else if (durs.length === 1 && n === 1) evenness = 1;
  const accuracy = Math.round((0.6 * pitch + 0.25 * clarity + 0.15 * evenness) * 1000) / 1000;
  return { notes, extra, pitch, clarity, evenness, accuracy, pass: accuracy >= 0.85 && extra === 0 && notes.every((x) => x.status !== 'missed' && x.status !== 'wrong'), unclear: false };
}

/** Frames of a sung run for tests and demos: each note `cents` off, optional glide (smear) between notes. */
export function syntheticRun(midis: number[], nps: number, opts: { cents?: number[]; fps?: number; smear?: boolean; octave?: number } = {}): SungFrame[] {
  const fps = opts.fps ?? 50;
  const out: SungFrame[] = [];
  const noteSec = 1 / nps;
  let t = 0;
  midis.forEach((m, i) => {
    const target = m + 12 * (opts.octave ?? 0) + (opts.cents?.[i] ?? 0) / 100;
    const next = midis[i + 1] !== undefined ? midis[i + 1] + 12 * (opts.octave ?? 0) : target;
    const frames = Math.max(2, Math.round(noteSec * fps));
    for (let k = 0; k < frames; k++) {
      const x = k / frames;
      const midi = opts.smear ? target + (next - target) * x : target;
      out.push({ t, hz: 440 * 2 ** ((midi - 69) / 12), confidence: 0.95, rms: 0.1 });
      t += 1 / fps;
    }
    // A tiny articulation gap between notes (not when smeared).
    if (!opts.smear) {
      out.push({ t, hz: null, confidence: 0, rms: 0.001 });
      t += 1 / fps;
    }
  });
  return out;
}

const MATERIAL_NAMES: Record<RunMaterial, { en: string; he: string }> = {
  major: { en: 'major scale', he: 'סולם מז׳ור' },
  minor: { en: 'minor scale', he: 'סולם מינור' },
  'maj-penta': { en: 'major pentatonic', he: 'פנטטוני מז׳ורי' },
  'min-penta': { en: 'minor pentatonic', he: 'פנטטוני מינורי' },
  blues: { en: 'blues scale', he: 'סולם בלוז' },
};
export const materialName = (m: RunMaterial, l: 'en' | 'he') => MATERIAL_NAMES[m][l];

const SHAPE_NAMES: Record<RunShape, { en: string; he: string }> = {
  up: { en: 'up', he: 'עולה' },
  down: { en: 'down', he: 'יורד' },
  turn: { en: 'up and back down', he: 'עולה וחוזר למטה' },
  zigzag: { en: 'down with turns', he: 'יורד בזיגזג' },
  thirds: { en: 'up in thirds', he: 'עולה בטרצות' },
};
export const shapeName = (s: RunShape, l: 'en' | 'he') => SHAPE_NAMES[s][l];

/** "Told" prompt (spec K.1): "Minor pentatonic, down with turns, 8 notes, 5 per second". */
export function describeRun(r: RunSpec, l: 'en' | 'he'): string {
  const n = r.offsets.length;
  const nps = r.nps.toLocaleString(l === 'en' ? 'en' : 'he', { maximumFractionDigits: 1 });
  return l === 'en'
    ? `${materialName(r.material, l)}, ${shapeName(r.shape, l)}, ${n} notes, ${nps} per second`
    : `${materialName(r.material, l)}, ${shapeName(r.shape, l)}, ${n} צלילים, ${nps} בשנייה`;
}

/** Spoken summary of off notes: "notes 4 and 5 were flat". */
export function runSummary(g: RunGrade, l: 'en' | 'he'): string {
  const by = (s: RunNoteStatus) => g.notes.map((x, i) => (x.status === s ? i + 1 : 0)).filter(Boolean);
  const list = (xs: number[]) => (xs.length === 1 ? String(xs[0]) : `${xs.slice(0, -1).join(', ')} ${l === 'en' ? 'and' : 'ו־'}${xs[xs.length - 1]}`);
  const parts: string[] = [];
  const add = (xs: number[], en: string, he: string) => {
    if (!xs.length) return;
    parts.push(l === 'en' ? `${xs.length === 1 ? 'note' : 'notes'} ${list(xs)} ${xs.length === 1 ? 'was' : 'were'} ${en}` : `${xs.length === 1 ? 'צליל' : 'צלילים'} ${list(xs)} ${he}`);
  };
  add(by('flat'), 'flat', 'נמוכים מדי');
  add(by('sharp'), 'sharp', 'גבוהים מדי');
  add(by('wrong'), 'wrong', 'שגויים');
  add(by('smeared'), 'smeared', 'נמרחו');
  add(by('missed'), 'not clear', 'לא נשמעו ברור');
  return parts.join(l === 'en' ? '; ' : '; ');
}
