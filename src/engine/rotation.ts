// Rule-based improvisation with a scale per chord, rotated (docs/SPEC-RBI-ROTATION.md, track A; research in
// docs/research/CHORD-SCALE-ROTATION.md; owner answers 2026-11-22: altered over V→major from T2, half-whole over
// V→minor only from T4). Pure.
//
//   1. the harmony timeline: each chord span with its function — what it resolves to (a fifth down = resolving, to a
//      major or a minor target; a half step down = a tritone sub; otherwise not resolving);
//   2. the menus: per function, the chord-scales open at the tier, mild → tense (Aebersold's order);
//   3. colour notes: what a chosen scale adds over the function's default scale (the notes the rotation tests);
//   4. the rotation: per chorus (T1–2) or every 4 bars (T3+), each function's scale picked by need (never played on
//      that function → lowest colour coverage → longest ago), ~15 % maintenance of scales already strong;
//   5. logical half-bar substitutions by tier (each leads to the next chord);
//   6. the note classifier and the metrics: in-set rate, chord tones on strong beats, avoid faults, colour coverage.

import { MODE_STEPS, type ModeId } from './modes';

/** One chord in beats (as ruleCards.spansOfChart gives it): root pitch class, intervals above the root. */
export interface ChordSpan {
  at: number;
  beats: number;
  root: number;
  iv: number[];
}

export type Quality = 'maj' | 'm7' | 'mtonic' | 'hd7' | 'dom' | 'dim7' | 'sus';
export type Fn = 'I' | 'IV' | 'ii' | 'iii' | 'vi' | 'i' | 'iiø' | 'V-maj' | 'V-min' | 'V-free' | 'dim' | 'sus';

export interface HarmonySpan extends ChordSpan {
  q: Quality;
  fn: Fn;
  /** A substitution inserted by the rotation (shown above the original). */
  sub?: { root: number; iv: number[]; label: { en: string; he: string } };
}

const mod = (n: number) => ((n % 12) + 12) % 12;
const has = (iv: number[], x: number) => iv.some((i) => mod(i) === x);

export function qualityOf(iv: number[]): Quality {
  const m3 = has(iv, 3), M3 = has(iv, 4), b5 = has(iv, 6), m7 = has(iv, 10), M7 = has(iv, 11), d7 = has(iv, 9) && !m7 && !M7;
  if (m3 && b5 && d7) return 'dim7';
  if (m3 && b5 && m7) return 'hd7';
  if (m3 && (M7 || (!m7 && has(iv, 9)))) return 'mtonic';
  if (m3) return m7 ? 'm7' : 'mtonic';
  if (!M3 && has(iv, 5) && m7) return 'sus';
  if (M3 && m7) return 'dom';
  return 'maj';
}

/**
 * The function of each chord from its neighbours and the key's tonic: a dominant resolving a fifth down to a major
 * or minor chord, a dominant a half step above its target (tritone sub) or going elsewhere (free), diatonic minor
 * sevenths by their degree, the tonic minor, the half-diminished ii, a passing diminished, a sus.
 */
export function harmonyOf(spans: ChordSpan[], tonic: number): HarmonySpan[] {
  return spans.map((s, i) => {
    const q = qualityOf(s.iv);
    const next = spans[i + 1] ?? spans[0];
    const nq = next ? qualityOf(next.iv) : 'maj';
    const deg = mod(s.root - tonic);
    let fn: Fn;
    if (q === 'dom') {
      const toNext = next ? mod(next.root - s.root) : -1;
      if (toNext === 5) fn = nq === 'm7' || nq === 'mtonic' || nq === 'hd7' ? 'V-min' : 'V-maj';
      else fn = 'V-free';
    } else if (q === 'm7') fn = deg === 4 ? 'iii' : deg === 9 ? 'vi' : deg === 0 ? 'i' : 'ii';
    else if (q === 'mtonic') fn = 'i';
    else if (q === 'hd7') fn = 'iiø';
    else if (q === 'dim7') fn = 'dim';
    else if (q === 'sus') fn = 'sus';
    else fn = deg === 5 ? 'IV' : 'I';
    return { ...s, q, fn };
  });
}

export interface MenuEntry {
  mode: ModeId;
  /** The tier it opens at. */
  min: number;
}

/** The chord-scale menus per function, mild → tense; the first entry is the function's default. */
export const MENUS: Record<Fn, MenuEntry[]> = {
  I: [{ mode: 'ionian', min: 0 }, { mode: 'major-pentatonic', min: 1 }, { mode: 'lydian', min: 2 }, { mode: 'bebop-major', min: 2 }],
  IV: [{ mode: 'lydian', min: 0 }, { mode: 'ionian', min: 1 }, { mode: 'major-pentatonic', min: 1 }],
  ii: [{ mode: 'dorian', min: 0 }, { mode: 'minor-pentatonic', min: 1 }],
  iii: [{ mode: 'phrygian', min: 0 }, { mode: 'dorian', min: 3 }],
  vi: [{ mode: 'aeolian', min: 0 }, { mode: 'dorian', min: 2 }],
  i: [{ mode: 'dorian', min: 0 }, { mode: 'melodic-minor', min: 1 }, { mode: 'harmonic-minor', min: 2 }, { mode: 'minor-sixth-dim', min: 3 }],
  iiø: [{ mode: 'locrian', min: 0 }, { mode: 'locrian-sharp2', min: 2 }],
  // owner 2026-11-22: altered over a V going to major from T2
  'V-maj': [{ mode: 'mixolydian', min: 0 }, { mode: 'bebop-dominant', min: 1 }, { mode: 'altered', min: 2 }, { mode: 'diminished', min: 2 }, { mode: 'lydian-dominant', min: 3 }],
  // owner 2026-11-22: half-whole over a V going to minor only as an advanced colour from T4
  'V-min': [{ mode: 'phrygian-dominant', min: 0 }, { mode: 'altered', min: 2 }, { mode: 'mixolydian-b6', min: 2 }, { mode: 'diminished', min: 4 }],
  'V-free': [{ mode: 'mixolydian', min: 0 }, { mode: 'lydian-dominant', min: 2 }],
  dim: [{ mode: 'whole-half', min: 0 }],
  // (the pentatonic on the ♭7 has Mixolydian's notes: no colour notes, so it is not a rotation choice)
  sus: [{ mode: 'mixolydian', min: 0 }],
};

/** The scale's pitch classes from a root. */
export const scalePcs = (mode: ModeId, root: number): number[] => [...new Set(MODE_STEPS[mode].map((x) => mod(root + x)))];

/** Colour notes: the scale's pitch classes the function's default scale does not have. */
export function colourNotes(fn: Fn, mode: ModeId, root: number): number[] {
  const def = new Set(scalePcs(MENUS[fn][0].mode, root));
  return scalePcs(mode, root).filter((p) => !def.has(p));
}

/** Per (function, mode): measured use — takes, mean colour coverage, last played. */
export type ModeStats = Record<string, { n: number; cov: number; last: string }>;
export const modeKey = (fn: Fn, mode: ModeId) => `${fn}|${mode}`;

/** A small deterministic generator (the rotation is reproducible for a seed). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The scale for a function: by need (never played → lowest coverage → oldest), ~15 % maintenance of strong ones. */
export function pickScale(fn: Fn, tier: number, stats: ModeStats, rand: () => number): ModeId {
  const open = MENUS[fn].filter((e) => tier >= e.min).map((e) => e.mode);
  if (open.length <= 1) return open[0] ?? MENUS[fn][0].mode;
  const rated = open.map((m) => ({ m, st: stats[modeKey(fn, m)] }));
  const strong = rated.filter((x) => x.st && x.st.cov >= 0.7);
  if (strong.length && rand() < 0.15) return strong[Math.floor(rand() * strong.length)].m;
  rated.sort((a, b) => (a.st ? 1 : 0) - (b.st ? 1 : 0) || (a.st?.cov ?? 0) - (b.st?.cov ?? 0) || (a.st?.last ?? '').localeCompare(b.st?.last ?? ''));
  return rated[0].m;
}

/** How often the scales change (SPEC-RBI-ROTATION §3): once per chorus at T1–2, every 4 bars at T3, every 2 at T4, per chord at T5. */
export const rotationBars = (tier: number, chorusBars: number): number => (tier <= 2 ? chorusBars : tier === 3 ? 4 : tier === 4 ? 2 : 1);

/**
 * The scale of every span over `choruses` choruses: within one rotation window, every span of the same function keeps
 * the same scale; a new window picks again by need. Returns the scale per span (index-aligned over all choruses).
 */
export function assignScales(h: HarmonySpan[], tier: number, meter: number, chorusBars: number, choruses: number, stats: ModeStats, seed = 1): { span: HarmonySpan; mode: ModeId; window: number }[] {
  const rand = rng(seed);
  const win = rotationBars(tier, chorusBars) * meter;
  const chorusBeats = chorusBars * meter;
  const out: { span: HarmonySpan; mode: ModeId; window: number }[] = [];
  let curWin = -1;
  let picks: Partial<Record<Fn, ModeId>> = {};
  for (let c = 0; c < choruses; c++)
    for (const s of h) {
      const at = c * chorusBeats + s.at;
      const w = Math.floor(at / win);
      if (w !== curWin) {
        curWin = w;
        picks = {};
      }
      const fn = s.sub ? 'V-free' : s.fn;
      picks[fn] ??= pickScale(fn, tier, stats, rand);
      out.push({ span: { ...s, at }, mode: picks[fn]!, window: w });
    }
  return out;
}

/**
 * Logical half-bar substitutions by tier (each leads to the next chord; at most one per 4 bars below T4):
 * T1+ a VI7 for a vi going to ii; T2+ a passing #I°7 on the second half of a I going up to ii; T3+ the tritone sub
 * of a resolving V (♭II7, a half step above its target) on the second half of a whole-bar V.
 */
export function insertSubs(h: HarmonySpan[], tier: number, tonic: number, meter = 4): HarmonySpan[] {
  const out: HarmonySpan[] = [];
  let lastSubBar = -99;
  const room = (at: number) => Math.floor(at / meter) - lastSubBar >= (tier >= 4 ? 1 : 4);
  for (let i = 0; i < h.length; i++) {
    const s = h[i];
    const next = h[i + 1];
    const bar = Math.floor(s.at / meter);
    if (tier >= 1 && s.fn === 'vi' && next?.fn === 'ii' && room(s.at)) {
      out.push({ ...s, sub: { root: s.root, iv: [0, 4, 7, 10], label: { en: 'VI7 for vi (V of ii)', he: 'VI7 במקום vi (הדומיננטה של ii)' } }, q: 'dom', fn: 'V-min' });
      lastSubBar = bar;
      continue;
    }
    if (tier >= 3 && (s.fn === 'V-maj' || s.fn === 'V-min') && s.beats >= 4 && room(s.at)) {
      const half = s.beats / 2;
      out.push({ ...s, beats: half });
      out.push({ ...s, at: s.at + half, beats: half, sub: { root: mod(s.root + 6), iv: [0, 4, 7, 10], label: { en: 'Tritone sub', he: 'תחליף טריטון' } }, fn: 'V-free' });
      lastSubBar = bar;
      continue;
    }
    if (tier >= 2 && s.fn === 'I' && next?.fn === 'ii' && mod(next.root - s.root) === 2 && s.beats >= 2 && room(s.at)) {
      const half = s.beats / 2;
      out.push({ ...s, beats: half });
      out.push({ ...s, at: s.at + half, beats: half, sub: { root: mod(s.root + 1), iv: [0, 3, 6, 9], label: { en: 'Passing diminished', he: 'מוקטן עובר' } }, q: 'dim7', fn: 'dim' });
      lastSubBar = bar;
      continue;
    }
    out.push(s);
  }
  void tonic;
  return out;
}

export type NoteClass = 'ct' | 'tension' | 'colour' | 'avoid' | 'passing' | 'wrong';
export interface PlayedNote {
  beat: number;
  dur: number;
  midi: number;
}

/** The chord tones of a span (the substitution's when there is one). */
export const chordPcs = (s: HarmonySpan): number[] => {
  const root = s.sub ? s.sub.root : s.root;
  const iv = s.sub ? s.sub.iv : s.iv;
  return [...new Set(iv.map((x) => mod(root + x)))];
};

/** An avoid note: a scale note a half step above a chord tone (on a dominant only the 11th over the 3rd). */
function isAvoid(pc: number, s: HarmonySpan, cts: number[]): boolean {
  const root = s.sub ? s.sub.root : s.root;
  if (s.q === 'dom' || s.fn.startsWith('V')) return mod(pc - root) === 5 && cts.includes(mod(root + 4));
  return cts.some((c) => mod(pc - c) === 1);
}

/** Classify every note against the scale active at its onset (an anticipation an eighth early belongs to the next chord). */
export function classifyNotes(notes: PlayedNote[], plan: { span: HarmonySpan; mode: ModeId }[]): NoteClass[] {
  const at = (b: number) => plan.find((p) => b >= p.span.at - 1e-6 && b < p.span.at + p.span.beats - 1e-6);
  return notes.map((n, i) => {
    let p = at(n.beat);
    const ahead = at(n.beat + 0.5);
    const pc = mod(n.midi);
    const test = (q: typeof p) => {
      if (!q) return null;
      const root = q.span.sub ? q.span.sub.root : q.span.root;
      const cts = chordPcs(q.span);
      const sc = scalePcs(q.mode, root);
      if (cts.includes(pc)) return 'ct' as NoteClass;
      if (sc.includes(pc)) return isAvoid(pc, q.span, cts) ? 'avoid' : colourNotes(q.span.sub ? 'V-free' : q.span.fn, q.mode, root).includes(pc) ? 'colour' : 'tension';
      return null;
    };
    let c = test(p);
    if (!c && ahead && ahead !== p) {
      const c2 = test(ahead);
      if (c2) (c = c2), (p = ahead);
    }
    if (c) return c;
    // a passing note: off the beat, short, moving a half step into the next note in the scale
    const nx = notes[i + 1];
    const off = Math.abs(n.beat - Math.round(n.beat)) > 0.15;
    if (off && n.dur <= 0.6 && nx && Math.abs(nx.midi - n.midi) === 1) return 'passing';
    return 'wrong';
  });
}

export interface RotationMetrics {
  /** Share of note duration in the set (chord tones, tensions, colour, avoid handled, passing). */
  inSet: number;
  /** Share of notes on beats 1 and 3 that are chord tones. */
  strongCt: number;
  /** Avoid notes held a beat or more on a strong beat. */
  avoidFaults: number;
  /** Spans of ≥ 2 beats with at least one colour note ÷ such spans that had notes. */
  colour: number;
  colourSpans: number;
}

export function rotationMetrics(notes: PlayedNote[], plan: { span: HarmonySpan; mode: ModeId }[], meter = 4): RotationMetrics {
  const cls = classifyNotes(notes, plan);
  let dur = 0, ok = 0, strong = 0, strongOk = 0, faults = 0;
  notes.forEach((n, i) => {
    dur += n.dur;
    if (cls[i] !== 'wrong') ok += n.dur;
    const inBar = n.beat % meter;
    const onStrong = Math.abs(inBar) < 0.15 || Math.abs(inBar - meter / 2) < 0.15;
    if (onStrong) {
      strong++;
      if (cls[i] === 'ct') strongOk++;
      if (cls[i] === 'avoid' && n.dur >= 1) faults++;
    }
  });
  let spans = 0, hit = 0;
  for (const p of plan) {
    if (p.span.beats < 2) continue;
    const idx = notes.map((n, i) => (n.beat >= p.span.at - 1e-6 && n.beat < p.span.at + p.span.beats - 1e-6 ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    spans++;
    if (idx.some((i) => cls[i] === 'colour')) hit++;
  }
  return { inSet: dur ? ok / dur : 0, strongCt: strong ? strongOk / strong : 0, avoidFaults: faults, colour: spans ? hit / spans : 0, colourSpans: spans };
}

/** Fold one take's coverage into the per (function, mode) stats. */
export function updateModeStats(stats: ModeStats, plan: { span: HarmonySpan; mode: ModeId }[], notes: PlayedNote[], at: string): ModeStats {
  const cls = classifyNotes(notes, plan);
  const out: ModeStats = { ...stats };
  for (const p of plan) {
    const idx = notes.map((n, i) => (n.beat >= p.span.at - 1e-6 && n.beat < p.span.at + p.span.beats - 1e-6 ? i : -1)).filter((i) => i >= 0);
    if (!idx.length || p.span.beats < 2) continue;
    const fn = p.span.sub ? 'V-free' : p.span.fn;
    const k = modeKey(fn, p.mode);
    const cur = out[k] ?? { n: 0, cov: 0, last: '' };
    const hit = idx.some((i) => cls[i] === 'colour') ? 1 : 0;
    out[k] = { n: cur.n + 1, cov: (cur.cov * cur.n + hit) / (cur.n + 1), last: at };
  }
  return out;
}
