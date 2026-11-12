// The band's players (0.56, owner 2026-11-09: "a walking bass and comping that sound like a band, not software").
// Pure and seeded: the same chart always gets the same performance, a different chart a different one.
//
// Walking bass, the way bass teachers describe it:
//   • beat 1 of a chord: its root (when the chord carries on from the bar before, sometimes its 3rd or 5th);
//   • the beat before a chord change: an approach to the next root — a half step below or above (most often), a scale
//     step, or its fifth (the "dominant approach");
//   • the beats between: a line that heads for that target — chord tones on the strong beat, scale tones between,
//     steps rather than leaps, inside the bass's sweet range (E1–C3), turning around at the edges;
//   • now and then a "skip" — a ghosted note a triplet before the beat.
// Comping (piano), the way pianists describe it:
//   • rootless voicings in two forms (3-5-7-9 and 7-9-3-5), always the form and inversion nearest the last one, so the
//     voices move by step (voice leading), kept between D3 and A4;
//   • rhythms from a vocabulary — Charleston, reverse Charleston, the "and of 4" push into the next bar, 2 and 4,
//     a held whole note, offbeats — chosen per bar, never the same one three bars running; two chords in a bar get
//     one hit each, sometimes anticipated.

import type { ChartChordEv, ParsedChart } from './charts';
import { chordAtBeat } from './charts';
import { MODE_STEPS } from './modes';
import { autoScale } from './improvRules';

/** A small seeded random generator (mulberry32). */
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
export const hashOf = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const LO = 28; // E1
const HI = 50; // D3
const pc = (m: number) => ((m % 12) + 12) % 12;
/** The pitch of pitch-class `p` nearest to `near`, kept inside the bass range. */
function nearest(p: number, near: number): number {
  let m = near + ((((p - near) % 12) + 18) % 12) - 6;
  while (m < LO) m += 12;
  while (m > HI) m -= 12;
  return m;
}

export interface BassNote {
  /** Beat (from the chart's start). */
  beat: number;
  midi: number;
  /** A ghosted skip note (shorter and softer). */
  ghost?: boolean;
}

/**
 * The scale steps (semitones above the root) the walker passes through on a chord. A 6th chord (6, m6, 6/9, m6/9) has
 * no 7th, so its scale loses the 7ths the mode would add (Gm6 walked Dorian used to play an F); a diminished 7th keeps
 * its four tones plus the 9th and 11th of the whole-half scale (its ♭13 and major 7th are not the chord's; the
 * diminished mode in MODE_STEPS is the half-whole, dominant one).
 */
export function walkScale(iv: number[]): number[] {
  const m = iv.map((x) => ((x % 12) + 12) % 12);
  const has = (x: number) => m.includes(x);
  const steps = MODE_STEPS[autoScale(iv)];
  if (has(3) && has(6) && has(9) && !has(10)) return [0, 2, 3, 5, 6, 9, 12];
  if (has(9) && !has(10) && !has(11) && (has(3) || has(4))) return steps.filter((x) => x !== 10 && x !== 11);
  return steps;
}

/** A walking bass line for `total` beats of the chart (one note a beat, a few skips). */
export function walkingBass(p: ParsedChart, meter: number, total: number, seed: number): BassNote[] {
  const r = rng(seed);
  const out: BassNote[] = [];
  let prev = 40;
  let dir = 1;
  for (let b = 0; b < total; b++) {
    const c = chordAtBeat(p, meter, b);
    if (!c) continue;
    const startHere = (b % (p.bars * meter)) === c.bar * meter + Math.round(c.at);
    const next = chordAtBeat(p, meter, b + 1) ?? c;
    const changes = next !== c || (b + 1) % (p.bars * meter) === 0;
    const tones = c.iv.map((x) => pc(c.root + x));
    const scale = walkScale(c.iv).map((x) => pc(c.root + x));
    let m: number;
    if (startHere) {
      const carry = out.length > 0 && chordAtBeat(p, meter, b - 1) === c;
      const pick = carry && r() < 0.35 ? tones[r() < 0.5 ? 1 : Math.min(2, tones.length - 1)] : pc(c.bass);
      m = nearest(pick, prev);
    } else if (changes) {
      const target = nearest(pc(next.bass), prev);
      const x = r();
      const cand = x < 0.5 ? [target - 1, target + 1] : x < 0.8 ? [target + 2, target - 2] : [target + 7, target - 5];
      const ok = cand.filter((q) => q >= LO && q <= HI && q !== prev);
      // At the edge of the range both picks can be ruled out; then any other approach (half step, step, fifth) that
      // fits — `target + 1` alone got clamped back onto the target (the next root a beat early).
      const any = [target - 1, target + 1, target + 2, target - 2, target + 7, target - 5].filter((q) => q >= LO && q <= HI && q !== prev);
      m = ok.length ? ok.sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev))[r() < 0.75 ? 0 : ok.length - 1] : (any[0] ?? target + 1);
    } else {
      // head toward the next chord's root through chord tones (strong beats) or scale tones
      const target = nearest(pc(next.bass), prev);
      if (target > prev + 2) dir = 1;
      else if (target < prev - 2) dir = -1;
      if (prev >= HI - 3) dir = -1;
      if (prev <= LO + 3) dir = 1;
      const strong = (b % meter) % 2 === 0;
      const pool = strong ? tones : scale;
      const opts: number[] = [];
      for (let d = 1; d <= 5; d++) {
        const q = prev + dir * d;
        if (q >= LO && q <= HI && pool.includes(pc(q))) opts.push(q);
      }
      m = opts.length ? opts[Math.min(opts.length - 1, Math.floor(r() * 2))] : nearest(tones[1] ?? tones[0], prev + dir * 3);
    }
    if (m === prev && !startHere) m = m + (dir || 1) * (scale.includes(pc(m + 2 * dir)) ? 2 : 1);
    m = Math.max(LO, Math.min(HI, m));
    // a skip: a ghosted triplet before beats 2 or 4, on the note before
    if (out.length && (b % meter) % 2 === 1 && r() < 0.08) out.push({ beat: b - 1 / 3, midi: prev, ghost: true });
    out.push({ beat: b, midi: m });
    prev = m;
  }
  return out;
}

/** Rootless voicing candidates for a chord: both forms, in every octave placement inside D3–A4. */
export function rootless(c: ChartChordEv): number[][] {
  const iv = c.iv.map((x) => x % 12);
  const has = (x: number) => iv.includes(x);
  const third = has(4) ? 4 : has(3) ? 3 : has(5) ? 5 : 4;
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : null;
  const fifth = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : 7;
  const ninth = c.iv.find((x) => x === 13 || x === 15) !== undefined ? c.iv.find((x) => x === 13 || x === 15)! % 12 : c.iv.includes(14) || seventh !== null ? 2 : null;
  const thirteenth = c.iv.includes(21) ? 9 : null;
  const upper = thirteenth ?? fifth;
  const forms: number[][] = seventh === null ? [[third, fifth, 0], [0, third, fifth], [fifth, 0, third]] : [[third, upper, seventh, ninth ?? 0], [seventh, ninth ?? 0, third, upper]];
  const out: number[][] = [];
  for (const f of forms) {
    for (let base = 50; base <= 62; base++) {
      if (pc(base) !== pc(c.root + f[0])) continue;
      const v = [base];
      for (const x of f.slice(1)) {
        let m = v[v.length - 1] + 1;
        while (pc(m) !== pc(c.root + x)) m++;
        v.push(m);
      }
      if (v[v.length - 1] <= 70) out.push(v);
    }
  }
  return out.length ? out : [[60, 64, 67]];
}

/** The candidate nearest the previous voicing (least total movement, then the top voice nearest). */
export function voiceLead(cands: number[][], prev: number[] | null): number[] {
  if (!prev) return cands.sort((a, b) => Math.abs(a[0] - 55) - Math.abs(b[0] - 55))[0];
  const cost = (v: number[]) => {
    const a = [...v].sort((x, y) => x - y);
    const b = [...prev].sort((x, y) => x - y);
    let s = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) s += Math.abs((a[Math.min(i, a.length - 1)] ?? 0) - (b[Math.min(i, b.length - 1)] ?? 0));
    return s + 0.5 * Math.abs(a[a.length - 1] - b[b.length - 1]);
  };
  return [...cands].sort((a, b) => cost(a) - cost(b))[0];
}

export interface CompHit {
  /** Beat from the chart's start (may be before a bar line: an anticipation). */
  beat: number;
  /** Length in beats. */
  len: number;
  notes: number[];
  vel: number;
}

/** Swing comping rhythms for one 4/4 bar: [beat, length] pairs, `sw` = the swung "and" (2/3 of a beat). */
const SWING_RHYTHMS = (sw: number): { w: number; hits: [number, number][] }[] => [
  { w: 3, hits: [[0, 0.8], [1 + sw, 1.2]] }, // Charleston
  { w: 2, hits: [[sw, 0.6], [2, 1]] }, // reverse Charleston
  { w: 2, hits: [[1, 0.5], [3, 0.5]] }, // 2 and 4
  { w: 2, hits: [[1 + sw, 0.6], [3 + sw, 1.2]] }, // offbeats, the last pushing into the next bar
  { w: 1, hits: [[0, 3.6]] }, // a held chord
  { w: 2, hits: [[0, 0.6], [2 + sw, 0.8]] },
  { w: 1, hits: [[3 + sw, 1.4]] }, // only the push
];

/** Comping for a whole chart in a style (swing, bossa, ballad, waltz, pop/rock use their own patterns). */
export function comping(p: ParsedChart, meter: number, total: number, style: 'swing' | 'bossa' | 'ballad' | 'waltz', seed: number): CompHit[] {
  const r = rng(seed ^ 0x5bd1e995);
  const out: CompHit[] = [];
  let prev: number[] | null = null;
  let lastPat = -1;
  let repeat = 0;
  const sw = 2 / 3;
  const voice = (c: ChartChordEv) => {
    const v = voiceLead(rootless(c), prev);
    prev = v;
    return v;
  };
  const bars = Math.ceil(total / meter);
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * meter;
    const chords: { c: ChartChordEv; at: number }[] = [];
    for (let k = 0; k < meter; k++) {
      const c = chordAtBeat(p, meter, b0 + k);
      if (c && (!chords.length || chords[chords.length - 1].c !== c)) chords.push({ c, at: k });
    }
    if (!chords.length) continue;
    if (style === 'ballad') {
      for (const { c, at } of chords) out.push({ beat: b0 + at, len: chords.length > 1 ? 1.9 : meter - 0.1, notes: voice(c), vel: 0.3 + r() * 0.06 });
      continue;
    }
    if (style === 'waltz') {
      for (const { c, at } of chords) {
        const v = voice(c);
        for (const k of [1, 2]) if (k >= at && (chords.length === 1 || k < meter)) out.push({ beat: b0 + k, len: 0.6, notes: v, vel: 0.28 + r() * 0.05 });
      }
      continue;
    }
    if (style === 'bossa') {
      const pat = bar % 2 === 0 ? [[0, 1], [1.5, 1], [3, 0.9]] : [[1, 1], [2.5, 1.4]];
      for (const [at, len] of pat) {
        const c = chordAtBeat(p, meter, b0 + Math.floor(at)) ?? chords[0].c;
        out.push({ beat: b0 + at, len, notes: voice(c), vel: 0.32 + r() * 0.05 });
      }
      continue;
    }
    // swing
    if (chords.length > 1) {
      // two chords: one hit each, the second sometimes anticipated
      const ant = r() < 0.35;
      out.push({ beat: b0 + chords[0].at, len: 1.4, notes: voice(chords[0].c), vel: 0.38 });
      out.push({ beat: b0 + chords[1].at - (ant ? 1 - sw : 0), len: 1.4, notes: voice(chords[1].c), vel: ant ? 0.42 : 0.36 });
      continue;
    }
    const pats = SWING_RHYTHMS(sw);
    let i: number;
    do {
      let x = r() * pats.reduce((s, q) => s + q.w, 0);
      i = 0;
      while (x > pats[i].w) x -= pats[i++].w;
    } while (i === lastPat && repeat >= 1);
    repeat = i === lastPat ? repeat + 1 : 0;
    lastPat = i;
    const c = chords[0].c;
    for (const [at, len] of pats[i].hits) {
      // a hit pushed into the next bar plays the next bar's chord
      const pushed = at + len > meter && at >= meter - 1;
      const cc = pushed ? chordAtBeat(p, meter, b0 + meter) ?? c : c;
      out.push({ beat: b0 + at, len, notes: voice(cc), vel: 0.34 + r() * 0.08 + (at % 1 ? 0.03 : 0) });
    }
  }
  return out.filter((h) => h.beat >= 0 && h.beat < total);
}

/** Close triads / 7ths in the middle register (G3 … about C5) for pop, rock, funk and Latin comping (no rootless forms). */
export function closeVoicings(c: ChartChordEv): number[][] {
  const iv = Array.from(new Set(c.iv.map((x) => x % 12))).filter((x) => x !== 0);
  const third = iv.find((x) => x === 3 || x === 4 || x === 5 || x === 2) ?? 4;
  const fifth = iv.find((x) => x === 6 || x === 7 || x === 8) ?? 7;
  const sev = iv.find((x) => x === 9 || x === 10 || x === 11);
  const tones = [0, third, fifth, ...(sev !== undefined ? [sev] : [])];
  const out: number[][] = [];
  // every inversion, its lowest note between G3 and F4
  for (let inv = 0; inv < tones.length; inv++) {
    const order = [...tones.slice(inv), ...tones.slice(0, inv)];
    for (let base = 55; base <= 65; base++) {
      if (pc(base) !== pc(c.root + order[0])) continue;
      const v = [base];
      for (const x of order.slice(1)) {
        let m = v[v.length - 1] + 1;
        while (pc(m) !== pc(c.root + x)) m++;
        v.push(m);
      }
      out.push(v);
    }
  }
  return out.length ? out : [[60, 64, 67]];
}

/** Comping styles of the harmony band under bass drills (BASS_VALIDATION §3: styles, riffs, pieces with a band). */
export type BandStyle = 'swing' | 'bossa' | 'ballad' | 'waltz' | 'pop' | 'rock' | 'funk' | 'reggae' | 'latin' | 'shuffle' | 'hold';
type GrooveBandStyle = Exclude<BandStyle, 'swing' | 'bossa' | 'ballad' | 'waltz'>;

const SW = 2 / 3;
/** [beat, length, velocity] rhythm cells for one 4/4 bar per groove style (other meters hold each chord). */
const CELLS: Record<GrooveBandStyle, [number, number, number][][]> = {
  pop: [
    [[0, 1.5, 0.36], [1.5, 1, 0.32], [2.5, 1.5, 0.34]],
    [[0, 2, 0.36], [2, 2, 0.32]],
    [[0, 0.5, 0.36], [1, 0.5, 0.3], [1.5, 1, 0.32], [3, 0.5, 0.3], [3.5, 0.5, 0.34]],
  ],
  rock: [
    [[0, 0.45, 0.4], [0.5, 0.45, 0.3], [1, 0.45, 0.34], [1.5, 0.45, 0.3], [2, 0.45, 0.38], [2.5, 0.45, 0.3], [3, 0.45, 0.34], [3.5, 0.45, 0.3]],
    [[0, 1.5, 0.4], [1.5, 2.5, 0.36]],
  ],
  funk: [
    [[0, 0.2, 0.38], [0.75, 0.2, 0.3], [1.5, 0.2, 0.34], [2.25, 0.2, 0.3], [3, 0.2, 0.32], [3.5, 0.2, 0.34]],
    [[0.5, 0.2, 0.34], [1, 0.2, 0.3], [1.75, 0.2, 0.32], [2.5, 0.2, 0.34], [3.25, 0.2, 0.3]],
  ],
  reggae: [
    [[1, 0.3, 0.34], [3, 0.3, 0.34]],
    [[0.5, 0.25, 0.3], [1.5, 0.25, 0.32], [2.5, 0.25, 0.3], [3.5, 0.25, 0.32]],
  ],
  latin: [
    [[0, 0.4, 0.34], [0.5, 0.4, 0.3], [1.5, 0.4, 0.32], [2.5, 0.4, 0.3], [3, 0.4, 0.32], [3.5, 0.4, 0.34]],
    [[0.5, 0.4, 0.32], [1, 0.4, 0.3], [2, 0.4, 0.32], [3, 0.4, 0.3], [3.5, 0.4, 0.34]],
  ],
  shuffle: [
    [[1, 0.4, 0.34], [1 + SW, 0.3, 0.28], [3, 0.4, 0.34], [3 + SW, 0.3, 0.28]],
    [[0, 0.6, 0.34], [1, 0.4, 0.3], [2, 0.6, 0.32], [3, 0.4, 0.3]],
  ],
  hold: [[[0, 3.9, 0.3]]],
};

/**
 * The harmony band's comping for any style: the jazz styles go to `comping` (rootless voicings); the groove styles
 * (pop, rock, funk, reggae, Latin, shuffle, a held pad) use close voicings led by voice leading and one rhythm cell a
 * bar from the style's vocabulary. Every chord change gets a hit at its own beat. Pure and seeded.
 */
export function bandComping(p: ParsedChart, meter: number, total: number, style: BandStyle, seed: number): CompHit[] {
  if (style === 'waltz' || ((style === 'swing' || style === 'bossa' || style === 'ballad') && meter === 4)) return comping(p, meter, total, style, seed);
  const st: GrooveBandStyle = style === 'swing' || style === 'bossa' || style === 'ballad' ? 'hold' : style;
  const r = rng(seed ^ 0x2545f491);
  const out: CompHit[] = [];
  let prev: number[] | null = null;
  const voice = (c: ChartChordEv) => {
    const v = voiceLead(closeVoicings(c), prev);
    prev = v;
    return v;
  };
  const bars = Math.ceil(total / meter - 1e-9);
  let last = -1;
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * meter;
    const cells = meter === 4 ? CELLS[st] : [[[0, meter - 0.1, 0.3]] as [number, number, number][]];
    let i = Math.floor(r() * cells.length);
    if (i === last && cells.length > 1 && r() < 0.5) i = (i + 1) % cells.length;
    last = i;
    const hits: CompHit[] = [];
    for (const [at, len, vel] of cells[i]) {
      const c = chordAtBeat(p, meter, b0 + at);
      if (c) hits.push({ beat: b0 + at, len, notes: [], vel: vel + r() * 0.04 });
    }
    // a chord that starts inside the bar with no hit on its beat gets one there; held hits stop at the change
    for (let k = 1; k < meter; k++) {
      const ck = chordAtBeat(p, meter, b0 + k);
      if (!ck || ck === chordAtBeat(p, meter, b0 + k - 1)) continue;
      for (const h of hits) if (h.beat < b0 + k && h.beat + h.len > b0 + k) h.len = b0 + k - h.beat - 0.05;
      if (!hits.some((h) => Math.abs(h.beat - (b0 + k)) < 1e-6)) hits.push({ beat: b0 + k, len: 0.9, notes: [], vel: 0.32 });
    }
    hits.sort((a, b) => a.beat - b.beat);
    for (const h of hits) out.push({ ...h, notes: voice(chordAtBeat(p, meter, h.beat)!) });
  }
  return out.filter((h) => h.beat >= 0 && h.beat < total);
}
