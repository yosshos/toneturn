// Voice leading as a performed skill (docs/AUDIT-CONTENT-THEORY.md §ה.2, VL-1…VL-8; TP-6 in §ז.2). Pure.
//
// The learner sees chord symbols (and the first voicing) and CHOOSES each next voicing. The grader accepts any voicing
// that (a) has the right chord tones for the requested type — close triad, close 7th, drop 2, drop 3, guide tones,
// spread — and (b) moves from the voicing the learner really played before with at most the smallest possible motion
// + a tolerance (total semitones, voices paired low → high). Feedback names the voice that jumped, the common tone that
// could have stayed, and the 7th that should step down to the next 3rd (ii–V–I).

import type { Verdict } from './types';
import { tuningById } from '../fretboard';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

export type VLQuality = 'M' | 'm' | 'dim' | 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | '6' | 'm6' | '7b9';
/** What the voicing must be: a close triad, a close 4-note chord, drop 2, drop 3, the 3rd + 7th, or a two-hand spread (LH 1–7, RH 3–5–9). */
export type VLType = 'triad' | 'close' | 'drop2' | 'drop3' | 'guide' | 'spread';

export interface VLChord {
  /** Root pitch class. */
  root: number;
  q: VLQuality;
  /** A written melody note (MIDI) the voicing must carry on top (VL-7: harmonise a melody). */
  melody?: number;
}

/** The voice-leading goal of a drill (DrillGoal.vl). */
export interface VLGoal {
  chords: VLChord[];
  /** Beat of each chord (a voicing per bar / half bar on the click; in a rubato take, each voicing when ready). */
  at: number[];
  type: VLType;
  /** Semitones of total motion above the smallest possible move still accepted at each change. */
  tol: number;
  /** A root in the left hand under the voicing (it may leap; it is not counted in the motion). */
  bass?: boolean;
  /** The written first voicing (the measured voices, low → high; spread: with its bass). */
  first?: number[];
  /** Register of the measured voices (the optimum is searched inside it). */
  lo: number;
  hi: number;
  /** Guitar: the string sets (low → high string numbers) a voicing must fit, and the tuning. */
  strings?: number[][];
  tuning?: string;
  /** ii–V–I rule: the 7th steps down to the 3rd of the next chord when the root falls a 5th. */
  sevenToThree?: boolean;
  /** Spell with flats (else sharps). */
  flats?: boolean;
}

interface QualDef {
  ints: number[];
  third: number;
  /** The 7th (the 6th of a 6 chord, the ♭♭7 of a °7); null for triads. */
  seventh: number | null;
  label: string;
  /** Spread: the LH note above the root and the acceptable RH sets (3–5–9 and friends). */
  spread?: { low: number; upper: number[][] };
}
export const QUAL: Record<VLQuality, QualDef> = {
  M: { ints: [0, 4, 7], third: 4, seventh: null, label: '' },
  m: { ints: [0, 3, 7], third: 3, seventh: null, label: 'm' },
  dim: { ints: [0, 3, 6], third: 3, seventh: null, label: '°' },
  maj7: { ints: [0, 4, 7, 11], third: 4, seventh: 11, label: 'maj7', spread: { low: 11, upper: [[4, 7, 2], [4, 9, 2]] } },
  '7': { ints: [0, 4, 7, 10], third: 4, seventh: 10, label: '7', spread: { low: 10, upper: [[4, 9, 2], [4, 7, 2]] } },
  m7: { ints: [0, 3, 7, 10], third: 3, seventh: 10, label: 'm7', spread: { low: 10, upper: [[3, 7, 2], [3, 5, 2]] } },
  m7b5: { ints: [0, 3, 6, 10], third: 3, seventh: 10, label: 'm7♭5', spread: { low: 10, upper: [[3, 6, 5]] } },
  dim7: { ints: [0, 3, 6, 9], third: 3, seventh: 9, label: '°7' },
  '6': { ints: [0, 4, 7, 9], third: 4, seventh: 9, label: '6', spread: { low: 9, upper: [[4, 7, 2]] } },
  m6: { ints: [0, 3, 7, 9], third: 3, seventh: 9, label: 'm6', spread: { low: 9, upper: [[3, 7, 2]] } },
  '7b9': { ints: [0, 4, 7, 10], third: 4, seventh: 10, label: '7♭9', spread: { low: 10, upper: [[4, 8, 1], [4, 9, 1]] } },
};

// ───────────────────────────── names ─────────────────────────────

const SHARP_EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_EN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARP_HE = ['דו', 'דו♯', 'רה', 'רה♯', 'מי', 'פה', 'פה♯', 'סול', 'סול♯', 'לה', 'לה♯', 'סי'];
const FLAT_HE = ['דו', 'רה♭', 'רה', 'מי♭', 'מי', 'פה', 'סול♭', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
/** Keys spelled with sharps (G D A E B, and their relative minors E B F♯ C♯ G♯). */
export const flatsFor = (key: number, minor = false): boolean => ![7, 2, 9, 4, 11].includes(mod12(minor ? key + 3 : key));
export const pcName = (pc: number, flats = true, lang: 'en' | 'he' = 'en'): string => (lang === 'he' ? (flats ? FLAT_HE : SHARP_HE) : flats ? FLAT_EN : SHARP_EN)[mod12(pc)];
/** Chord symbol (letters in both languages, as Israeli musicians write them). */
export const chordSymbol = (c: VLChord, flats = true): string => pcName(c.root, flats) + QUAL[c.q].label;

// ───────────────────────────── shapes ─────────────────────────────

/** The pitch classes a voicing of this type is built from. */
export function typePcs(c: VLChord, type: VLType): number[] {
  const Q = QUAL[c.q];
  if (type === 'guide') return [mod12(c.root + Q.third), mod12(c.root + (Q.seventh ?? 7))];
  if (type === 'triad') return Q.ints.slice(0, 3).map((i) => mod12(c.root + i));
  return Q.ints.map((i) => mod12(c.root + i));
}

/** Close position: distinct pitch classes inside an octave. */
const isClose = (v: number[]): boolean => new Set(v.map(mod12)).size === v.length && v[v.length - 1] - v[0] <= 11;
const sortN = (v: number[]): number[] => v.slice().sort((a, b) => a - b);
/** Drop 2 (four voices): the lowest note an octave up gives close position with it second from the top. */
export function isDrop2(v0: number[]): boolean {
  if (v0.length !== 4) return false;
  const v = sortN(v0);
  const w = sortN([v[1], v[2], v[3], v[0] + 12]);
  return isClose(w) && w[2] === v[0] + 12;
}
/** Drop 3: the lowest note an octave up gives close position with it third from the top. */
export function isDrop3(v0: number[]): boolean {
  if (v0.length !== 4) return false;
  const v = sortN(v0);
  const w = sortN([v[1], v[2], v[3], v[0] + 12]);
  return isClose(w) && w[1] === v[0] + 12;
}

/** Every close-position voicing of the pitch classes inside [lo, hi]. */
export function closeShapes(pcs: number[], lo: number, hi: number): number[][] {
  const u = [...new Set(pcs.map(mod12))].sort((a, b) => a - b);
  const out: number[][] = [];
  for (let r = 0; r < u.length; r++) {
    const ord = [...u.slice(r), ...u.slice(0, r)];
    for (let b = lo; b <= hi; b++) {
      if (mod12(b) !== ord[0]) continue;
      const v = [b];
      for (let i = 1; i < ord.length; i++) v.push(v[i - 1] + (mod12(ord[i] - v[i - 1]) || 12));
      if (v[v.length - 1] <= hi) out.push(v);
    }
  }
  return out;
}

/** Guitar: frets of a voicing on a string set (one note a string, low → high), or null when it doesn't fit a hand. */
export function fitOnSet(v: number[], set: number[], tuning = 'standard'): { s: number; f: number }[] | null {
  if (v.length !== set.length) return null;
  const tu = tuningById(tuning);
  const ps = sortN(v);
  const out = ps.map((p, i) => ({ s: set[i], f: p - tu.open[set[i] - 1] }));
  if (out.some((x) => x.f < 0 || x.f > 15)) return null;
  const fr = out.filter((x) => x.f > 0).map((x) => x.f);
  if (fr.length && Math.max(...fr) - Math.min(...fr) > 4) return null;
  return out;
}
const fitsGoalStrings = (v: number[], g: Pick<VLGoal, 'strings' | 'tuning'>): boolean => !g.strings || g.strings.some((s) => fitOnSet(v, s, g.tuning) !== null);

/**
 * The measured voices of a full voicing: a LH root in bass mode is not measured, and a spread's left hand (root + 7th)
 * moves with the root — only its right hand (3–5–9) is led by step.
 */
export const measuredOf = (v: number[], type: VLType): number[] => (type === 'spread' ? sortN(v).slice(2) : sortN(v));

const cache = new Map<string, number[][]>();
/** Every voicing of a chord that satisfies the goal's type, register, melody and string sets (full voicings; spread with its bass). */
export function candidates(c: VLChord, g: Pick<VLGoal, 'type' | 'lo' | 'hi' | 'strings' | 'tuning'>): number[][] {
  const key = `${c.root}|${c.q}|${c.melody ?? ''}|${g.type}|${g.lo}|${g.hi}|${JSON.stringify(g.strings ?? null)}|${g.tuning ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const Q = QUAL[c.q];
  let out: number[][] = [];
  if (g.type === 'triad' || g.type === 'close') out = closeShapes(typePcs(c, g.type), g.lo, g.hi);
  else if (g.type === 'drop2' || g.type === 'drop3') {
    const k = g.type === 'drop2' ? 2 : 1; // index (low → high) of the voice dropped an octave
    for (const v of closeShapes(typePcs(c, 'close'), g.lo, g.hi + 12)) {
      const d = sortN(v.map((p, i) => (i === k ? p - 12 : p)));
      if (d[0] >= g.lo && d[3] <= g.hi) out.push(d);
    }
  } else if (g.type === 'guide') {
    const [a, b] = typePcs(c, 'guide');
    for (let x = g.lo; x <= g.hi; x++) {
      if (mod12(x) !== a && mod12(x) !== b) continue;
      const other = mod12(x) === a ? b : a;
      const y = x + (mod12(other - x) || 12);
      if (y <= g.hi && y - x <= 11) out.push([x, y]);
    }
  } else if (g.type === 'spread' && Q.spread) {
    for (let b = 36; b <= 52; b++) {
      if (mod12(b) !== mod12(c.root)) continue;
      const low = b + Q.spread.low;
      for (const set of Q.spread.upper)
        for (const up of closeShapes(set.map((i) => c.root + i), Math.max(g.lo, low + 1), g.hi)) out.push([b, low, ...up]);
    }
  }
  if (c.melody !== undefined) out = out.filter((v) => Math.max(...v) === c.melody);
  if (g.strings) out = out.filter((v) => fitsGoalStrings(v, g));
  cache.set(key, out);
  return out;
}

// ───────────────────────────── classification ─────────────────────────────

export type VLKind = 'ok' | 'empty' | 'wrong' | 'missing' | 'type' | 'bass' | 'melody' | 'strings';
export interface VLClass {
  ok: boolean;
  kind: VLKind;
  /** The measured voices (low → high). */
  voices: number[];
  bass: number | null;
  wrongPcs: number[];
  missingPcs: number[];
}

/** Is a played set of pitches a right voicing of the chord for the goal (and which voices are measured)? */
export function classify(played: number[], c: VLChord, g: Pick<VLGoal, 'type' | 'bass' | 'strings' | 'tuning'>): VLClass {
  const ps = [...new Set(played)].sort((a, b) => a - b);
  const res = (kind: VLKind, voices: number[], bass: number | null, wrongPcs: number[] = [], missingPcs: number[] = []): VLClass => ({ ok: kind === 'ok', kind, voices, bass, wrongPcs, missingPcs });
  if (!ps.length) return res('empty', [], null);
  const Q = QUAL[c.q];
  const hasBass = !!g.bass || g.type === 'spread';
  const bass = hasBass ? ps[0] : null;
  const rest = hasBass ? ps.slice(1) : ps;
  if (bass !== null && mod12(bass) !== mod12(c.root)) return res('bass', rest, bass);
  let allowed: number[];
  let required: number[];
  if (g.type === 'spread') {
    const sp = Q.spread!;
    allowed = [sp.low, ...sp.upper.flat()].map((i) => mod12(c.root + i));
    required = [sp.low, ...sp.upper[0]].map((i) => mod12(c.root + i));
  } else {
    allowed = typePcs(c, g.type);
    required = allowed;
  }
  const pcs = rest.map(mod12);
  const wrongPcs = [...new Set(pcs.filter((p) => !allowed.includes(p)))];
  if (wrongPcs.length) return res('wrong', rest, bass, wrongPcs);
  if (g.type === 'spread') {
    const sp = Q.spread!;
    const ok = rest.length === 4 && mod12(rest[0]) === mod12(c.root + sp.low) && sp.upper.some((set) => {
      const want = set.map((i) => mod12(c.root + i)).sort((a, b) => a - b);
      const got = rest.slice(1).map(mod12).sort((a, b) => a - b);
      return want.every((p, i) => p === got[i]);
    }) && rest[3] - rest[1] <= 11;
    if (!ok) {
      const missing = required.filter((p) => !pcs.includes(p));
      return res(missing.length ? 'missing' : 'type', rest.slice(1), bass, [], missing);
    }
    if (g.strings && !fitsGoalStrings(ps, g)) return res('strings', rest.slice(1), bass);
    return res('ok', rest.slice(1), bass);
  } else {
    const missing = required.filter((p) => !pcs.includes(p));
    if (missing.length) return res('missing', rest, bass, [], missing);
    const size = g.type === 'guide' ? 2 : g.type === 'triad' ? 3 : 4;
    const shapeOk =
      rest.length === size &&
      (g.type === 'drop2' ? isDrop2(rest) : g.type === 'drop3' ? isDrop3(rest) : isClose(rest));
    if (!shapeOk) return res('type', rest, bass);
  }
  if (c.melody !== undefined && rest[rest.length - 1] !== c.melody) return res('melody', rest, bass);
  if (g.strings && !fitsGoalStrings(rest, g)) return res('strings', rest, bass);
  return res('ok', rest, bass);
}

// ───────────────────────────── motion ─────────────────────────────

/** Voice-leading motion between two voicings of the same size: voices paired low → high (the cheapest pairing on a line). */
export function motion(a: number[], b: number[]): { total: number; moves: number[] } {
  const x = sortN(a);
  const y = sortN(b);
  if (x.length !== y.length) {
    // Different sizes: each voice of the bigger to the nearest of the smaller (only for reports, never for grading).
    const [big, small] = x.length > y.length ? [x, y] : [y, x];
    const moves = big.map((p) => Math.min(...small.map((q) => Math.abs(p - q))));
    return { total: moves.reduce((s, m) => s + m, 0), moves };
  }
  const moves = x.map((p, i) => y[i] - p);
  return { total: moves.reduce((s, m) => s + Math.abs(m), 0), moves };
}

/** The smallest motion from a played voicing (measured voices) to any right voicing of the next chord, and those voicings. */
export function bestMove(prev: number[], c: VLChord, g: VLGoal): { best: number; via: number[][] } {
  let best = Infinity;
  let via: number[][] = [];
  for (const cand of candidates(c, g)) {
    const m = measuredOf(cand, g.type);
    if (m.length !== prev.length) continue;
    const d = motion(prev, m).total;
    if (d < best - 1e-9) {
      best = d;
      via = [m];
    } else if (Math.abs(d - best) < 1e-9) via.push(m);
  }
  return { best, via };
}

/** Does the change into chord k leave the 7th of the chord before hanging (root falling a 5th, 7 not → 3)? */
function breaks73(g: VLGoal, k: number, prev: number[], next: number[]): boolean {
  if (!g.sevenToThree || k < 1) return false;
  const pc = g.chords[k - 1];
  const c = g.chords[k];
  const s7 = QUAL[pc.q].seventh;
  if (s7 === null || mod12(c.root - pc.root) !== 5) return false;
  const sev = prev.filter((x) => mod12(x) === mod12(pc.root + s7));
  const t3 = mod12(c.root + QUAL[c.q].third);
  return sev.length > 0 && !sev.some((x) => next.some((y) => mod12(y) === t3 && (x - y === 1 || x - y === 2)));
}

/**
 * The model path: the smallest total motion through the progression (dynamic programming over the candidates), from
 * the written first voicing (else the candidate nearest the middle of the register). Full voicings (spread: with bass).
 */
export function optimalPath(g: VLGoal): number[][] {
  const cands = g.chords.map((c, i) => {
    const all = candidates(c, g);
    if (i === 0 && g.first) {
      const f = sortN(g.first);
      const same = all.filter((v) => sortN(v).join() === f.join());
      return same.length ? same : [f];
    }
    return all;
  });
  if (cands.some((c) => !c.length)) throw new Error('voice leading: no voicing fits');
  const mid = (g.lo + g.hi) / 2;
  let cost = cands[0].map((v) => (g.first ? 0 : Math.abs((Math.min(...v) + Math.max(...v)) / 2 - mid) * 0.01));
  const back: number[][] = [cands[0].map(() => -1)];
  for (let k = 1; k < cands.length; k++) {
    const nc: number[] = [];
    const bk: number[] = [];
    for (const v of cands[k]) {
      let best = Infinity;
      let arg = 0;
      cands[k - 1].forEach((u, j) => {
        // The model resolves 7 → 3 whenever a move within the tolerance can (the grader asks for it there).
        const d = cost[j] + motion(measuredOf(u, g.type), measuredOf(v, g.type)).total + (breaks73(g, k, measuredOf(u, g.type), measuredOf(v, g.type)) ? g.tol + 0.5 : 0);
        if (d < best) {
          best = d;
          arg = j;
        }
      });
      nc.push(best);
      bk.push(arg);
    }
    cost = nc;
    back.push(bk);
  }
  let j = cost.indexOf(Math.min(...cost));
  const path: number[][] = [];
  for (let k = cands.length - 1; k >= 0; k--) {
    path.unshift(cands[k][j]);
    j = back[k][j];
  }
  return path;
}

// ───────────────────────────── grading ─────────────────────────────

export interface VLStep {
  i: number;
  cls: VLClass;
  /** Played motion from the chord before, the smallest possible from that voicing, and the difference (semitones). */
  motion: number | null;
  best: number | null;
  excess: number | null;
  /** The voice that moved most: its index from the top (0 = top), the number of voices and the signed move. */
  jump: { voice: number; of: number; by: number } | null;
  /** A common tone the smallest move keeps and the player let go of (MIDI pitch). */
  held: number | null;
  /** ii–V: did the 7th of the chord before step down to this chord's 3rd? (null = not asked here) */
  sevenThree: boolean | null;
  /** The first voicing is not the written one. */
  firstOff?: boolean;
  verdict: Verdict;
}

/** Grade the voicings a player chose (one set of pitches per chord, in order). */
export function gradeVoicings(played: number[][], g: VLGoal): VLStep[] {
  const steps: VLStep[] = [];
  played.forEach((p, i) => {
    const c = g.chords[i];
    const cls = classify(p, c, g);
    const step: VLStep = { i, cls, motion: null, best: null, excess: null, jump: null, held: null, sevenThree: null, verdict: cls.ok ? 'clean' : 'not' };
    if (i === 0 && g.first && cls.ok) {
      const f = measuredOf(g.first, g.type);
      const shift = cls.voices[0] - f[0];
      const same = cls.voices.length === f.length && shift % 12 === 0 && cls.voices.every((x, k) => x - f[k] === shift);
      if (!same) {
        step.firstOff = true;
        step.verdict = 'almost';
      }
    }
    const prev = i > 0 ? steps[i - 1] : null;
    if (cls.ok && prev?.cls.ok && prev.cls.voices.length === cls.voices.length) {
      const m = motion(prev.cls.voices, cls.voices);
      const { best, via } = bestMove(prev.cls.voices, c, g);
      step.motion = m.total;
      step.best = Number.isFinite(best) ? best : m.total;
      step.excess = Math.max(0, m.total - step.best);
      let k = 0;
      m.moves.forEach((d, j) => {
        if (Math.abs(d) > Math.abs(m.moves[k])) k = j;
      });
      step.jump = { voice: m.moves.length - 1 - k, of: m.moves.length, by: m.moves[k] };
      // A common tone the best move keeps (same key) and the player did not.
      if (step.excess > 0) {
        const keep = prev.cls.voices.filter((x) => via.length && via.every((v) => v.includes(x)));
        step.held = keep.find((x) => !cls.voices.includes(x)) ?? null;
      }
      if (step.excess > g.tol + 2) step.verdict = 'not';
      else if (step.excess > g.tol && step.verdict === 'clean') step.verdict = 'almost';
      // The 7th → 3rd rule when the root falls a 5th (ii → V → I).
      const pc = g.chords[i - 1];
      const s7 = QUAL[pc.q].seventh;
      if (g.sevenToThree && s7 !== null && mod12(c.root - pc.root) === 5) {
        const sev = prev.cls.voices.filter((x) => mod12(x) === mod12(pc.root + s7));
        const t3 = mod12(c.root + QUAL[c.q].third);
        const resolves = (v: number[]) => sev.length === 0 || sev.some((x) => v.some((y) => mod12(y) === t3 && (x - y === 1 || x - y === 2)));
        step.sevenThree = resolves(cls.voices);
        // Asked only where a move within the tolerance can do it (a 6 chord or a spread's left hand may not allow it).
        if (!step.sevenThree) {
          const can = candidates(c, g).some((v) => {
            const mv = measuredOf(v, g.type);
            return mv.length === prev.cls.voices.length && motion(prev.cls.voices, mv).total <= step.best! + g.tol && resolves(mv);
          });
          if (!can) step.sevenThree = null;
          else if (step.verdict === 'clean') step.verdict = 'almost';
        }
      }
    }
    steps.push(step);
  });
  return steps;
}

// ───────────────────────────── one-line feedback ─────────────────────────────

const VOICE_EN: Record<number, string[]> = { 2: ['top', 'lower'], 3: ['top', 'middle', 'bottom'], 4: ['top', 'second', 'third', 'bottom'] };
const VOICE_HE: Record<number, string[]> = { 2: ['העליון', 'התחתון'], 3: ['העליון', 'האמצעי', 'התחתון'], 4: ['העליון', 'השני', 'השלישי', 'התחתון'] };
const TYPE_NAME: Record<VLType, { en: string; he: string }> = {
  triad: { en: 'a close triad', he: 'משולש צמוד' },
  close: { en: 'close position', he: 'מצב צמוד' },
  drop2: { en: 'drop 2', he: 'דרופ 2' },
  drop3: { en: 'drop 3', he: 'דרופ 3' },
  guide: { en: 'the 3rd and 7th', he: 'טרצה וספטימה' },
  spread: { en: 'LH 1–7, RH 3–5–9', he: 'שמאל 1–7, ימין 3–5–9' },
};
export const typeName = (t: VLType): { en: string; he: string } => TYPE_NAME[t];

/** The one line for a step (few words: chord, what, how to fix). Null when the step is right. */
export function stepLine(s: VLStep, g: VLGoal): { en: string; he: string } | null {
  const fl = g.flats ?? true;
  const c = g.chords[s.i];
  const sym = chordSymbol(c, fl);
  const nm = (p: number) => ({ en: pcName(p, fl), he: pcName(p, fl, 'he') });
  const list = (ps: number[]) => ({ en: ps.map((p) => nm(p).en).join(', '), he: ps.map((p) => nm(p).he).join(', ') });
  const k = s.cls;
  if (k.kind === 'empty') return { en: `${sym}: not played`, he: `${sym}: לא נוגן` };
  if (k.kind === 'bass') return { en: `${sym}: ${nm(c.root).en} in the bass`, he: `${sym}: ${nm(c.root).he} בבס` };
  if (k.kind === 'wrong') return { en: `${sym}: ${list(k.wrongPcs).en} not in the chord`, he: `${sym}: ${list(k.wrongPcs).he} לא באקורד` };
  if (k.kind === 'missing') return { en: `${sym}: missing ${list(k.missingPcs).en}`, he: `${sym}: חסר ${list(k.missingPcs).he}` };
  if (k.kind === 'type') return { en: `${sym}: not ${TYPE_NAME[g.type].en}`, he: `${sym}: לא ${TYPE_NAME[g.type].he}` };
  if (k.kind === 'melody') return { en: `${sym}: the melody note on top`, he: `${sym}: צליל המנגינה למעלה` };
  if (k.kind === 'strings') return { en: `${sym}: not on strings ${g.strings!.map((x) => x.join('-')).join(' / ')}`, he: `${sym}: לא על מיתרים ${g.strings!.map((x) => x.join('-')).join(' / ')}` };
  if (s.firstOff) return { en: 'Start from the written voicing', he: 'להתחיל מהקול הכתוב' };
  if (s.excess !== null && s.excess > g.tol && s.jump) {
    if (s.held !== null) return { en: `${sym}: keep ${nm(s.held).en}, step the rest`, he: `${sym}: להשאיר ${nm(s.held).he}, השאר בצעדים` };
    const v = s.jump;
    return { en: `${sym}: ${VOICE_EN[v.of]?.[v.voice] ?? ''} voice jumped ${Math.abs(v.by)} — move by step`, he: `${sym}: הקול ${VOICE_HE[v.of]?.[v.voice] ?? ''} קפץ ${Math.abs(v.by)} — לזוז בצעד` };
  }
  if (s.sevenThree === false) {
    const pc = g.chords[s.i - 1];
    const s7 = mod12(pc.root + QUAL[pc.q].seventh!);
    const t3 = mod12(c.root + QUAL[c.q].third);
    return { en: `${sym}: the 7th (${nm(s7).en}) steps down to ${nm(t3).en}`, he: `${sym}: הספטימה (${nm(s7).he}) יורדת ל־${nm(t3).he}` };
  }
  return null;
}
