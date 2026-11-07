// Arrangement builder (spec AE §4.5, §10.2): drums + bass + chords + a lead line from a section plan, as plain
// note events, plus a few synthesised style idioms (Baroque, Classical, Romantic, 20th century). Pure, no audio.
// Used by song-form and style (topicsHarmony2.ts). Chords are voice-led: the upper voices move as little as
// possible from one chord to the next.

import type { NoteEvent, PercKind } from './lesson';

// ---------------------------------------------------------------- chords and voice leading

export type ChordQ = 'M' | 'm' | 'd' | '+' | '7' | 'maj7' | 'm7' | 'ø7' | 'o7' | '6' | 'm6' | 'sus2' | 'sus4' | 'mmaj7' | 'maj7#5' | '7sus4';
export const CHORD_IV: Record<ChordQ, number[]> = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  d: [0, 3, 6],
  '+': [0, 4, 8],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  'ø7': [0, 3, 6, 10],
  o7: [0, 3, 6, 9],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  mmaj7: [0, 3, 7, 11],
  'maj7#5': [0, 4, 8, 11],
  '7sus4': [0, 5, 7, 10],
};

/** A chord in a key: root in semitones above the tonic; `bass` (semitones above the tonic) for inversions. */
export interface Chord {
  root: number;
  q: ChordQ;
  bass?: number;
}
export const ch = (root: number, q: ChordQ = 'M', bass?: number): Chord => (bass === undefined ? { root, q } : { root, q, bass });

const mod12 = (x: number) => ((x % 12) + 12) % 12;

/**
 * Upper voices for a set of pitch classes: `pcs.length` notes (doublings allowed: repeat a pc), close position
 * (span ≤ an octave), inside [lo, hi], moving as little as possible from `prev` (sorted). Deterministic.
 */
export function voiceLead(pcs: number[], prev: number[] | null, lo = 52, hi = 79, center = 65): number[] {
  const opts = pcs.map((p) => {
    const out: number[] = [];
    for (let m = lo; m <= hi; m++) if (mod12(m) === mod12(p)) out.push(m);
    return out;
  });
  let best: number[] | null = null;
  let bestCost = Infinity;
  const cur: number[] = [];
  const walk = (i: number) => {
    if (i === opts.length) {
      const s = cur.slice().sort((a, b) => a - b);
      for (let k = 1; k < s.length; k++) if (s[k] === s[k - 1]) return;
      if (s[s.length - 1] - s[0] > 12) return;
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      let cost: number;
      if (prev && prev.length) cost = s.reduce((a, m, k) => a + Math.abs(m - prev[Math.min(k, prev.length - 1)]), 0) * 10 + Math.abs(mean - center);
      else cost = Math.abs(mean - center) * 10;
      if (cost < bestCost - 1e-9) {
        bestCost = cost;
        best = s;
      }
      return;
    }
    for (const m of opts[i]) {
      cur.push(m);
      walk(i + 1);
      cur.pop();
    }
  };
  walk(0);
  return best ?? pcs.map((p) => lo + mod12(p - lo)).sort((a, b) => a - b);
}

/** The bass note of a pitch class nearest the previous bass (or the middle of the range). */
export function bassNote(pc: number, prev: number | null, lo = 38, hi = 52): number {
  const target = prev ?? (lo + hi) / 2;
  let best = lo + mod12(pc - lo);
  for (let m = best; m <= hi; m += 12) if (Math.abs(m - target) < Math.abs(best - target)) best = m;
  return best;
}

/** Upper pitch classes of a chord for three voices: the tones not in the bass (root position seventh chords keep 3, 5, 7). */
export function upperPcs(c: Chord, voices = 3): number[] {
  const iv = CHORD_IV[c.q].map((x) => mod12(c.root + x));
  const bass = mod12(c.bass ?? c.root);
  if (iv.length > voices) {
    const rest = iv.filter((p) => p !== bass);
    return rest.length === voices ? rest : iv.filter((_, i) => i !== 2).slice(0, voices);
  }
  const out = iv.slice();
  while (out.length < voices) out.push(iv[0]);
  return out;
}

/** A voice-led progression in a key at `tonic` (midi): each chord as [bass, ...upper], ascending. */
export function voiceChords(chords: Chord[], tonic: number, o: { lo?: number; hi?: number; center?: number; voices?: number; bassLo?: number; bassHi?: number } = {}): number[][] {
  let prev: number[] | null = null;
  let prevBass: number | null = null;
  const t = mod12(tonic);
  return chords.map((c) => {
    const abs: Chord = { root: t + c.root, q: c.q, ...(c.bass !== undefined ? { bass: t + c.bass } : {}) };
    const upper = voiceLead(upperPcs(abs, o.voices ?? 3), prev, o.lo ?? 52, o.hi ?? 76, o.center ?? 64);
    const b = bassNote(abs.bass ?? abs.root, prevBass, o.bassLo ?? 38, o.bassHi ?? 52);
    prev = upper;
    prevBass = b;
    return [b, ...upper];
  });
}

// ---------------------------------------------------------------- the arrangement builder

export type Groove = 'rock' | 'swing' | 'shuffle' | 'classical';
/** A lead note: [beat from the section start, semitones above the tonic, length in beats]. */
export type LeadNote = [number, number, number];
export interface Section {
  /** Chords per bar (one, or two = half a bar each). */
  bars: Chord[][];
  /** 1 sparse (verse) · 2 medium · 3 full (chorus). */
  energy: 1 | 2 | 3;
  lead?: LeadNote[];
}
export interface ArrangeOpts {
  /** Tonic midi (the lead sits around it; bass and chords below). */
  tonic: number;
  bpm: number;
  groove: Groove;
  beats?: number;
  /** Stop after this many bars (play up to a position in the form). */
  stopAfterBars?: number;
  /** A bar of clicks first (count-in). */
  countIn?: boolean;
}
export interface Arrangement {
  events: NoteEvent[];
  length: number;
  /** Start time of each section and of each bar (seconds). */
  sectionStarts: number[];
  barStarts: number[];
}

const P = (perc: PercKind, start: number, velocity: number): NoteEvent => ({ midi: 60, start, duration: 0.08, velocity, perc });
const N = (midi: number, start: number, duration: number, velocity: number): NoteEvent => ({ midi, start, duration, velocity: Math.min(1, Math.max(0.05, velocity)) });
/** Swung position of an off-beat eighth (beat + ½ → beat + ⅔). */
const swingAt = (beat: number) => {
  const f = beat - Math.floor(beat);
  return Math.abs(f - 0.5) < 1e-6 ? Math.floor(beat) + 2 / 3 : beat;
};

/** Builds an arrangement from sections. Pure. */
export function arrange(sections: Section[], o: ArrangeOpts): Arrangement {
  const beats = o.beats ?? 4;
  const q = 60 / o.bpm;
  const swung = o.groove === 'swing' || o.groove === 'shuffle';
  const tp = (beat: number) => (swung ? swingAt(beat) : beat) * q;
  const events: NoteEvent[] = [];
  const sectionStarts: number[] = [];
  const barStarts: number[] = [];
  let t = 0;
  if (o.countIn) {
    for (let b = 0; b < beats; b++) events.push(P(b === 0 ? 'accent' : 'click', b * q, b === 0 ? 0.5 : 0.35));
    t = beats * q;
  }
  // All chords in order, voiced together so the voice leading runs across section borders.
  const flat: { c: Chord; bar: number; half: number; of: number; si: number }[] = [];
  let barNo = 0;
  sections.forEach((s, si) => s.bars.forEach((bar) => {
    bar.forEach((c, h) => flat.push({ c, bar: barNo, half: h, of: bar.length, si }));
    barNo++;
  }));
  const voiced = voiceChords(flat.map((f) => f.c), o.tonic, o.groove === 'classical' ? { lo: 48, hi: 65, center: 56, bassLo: 33, bassHi: 48 } : { lo: 50, hi: 71, center: 61 });
  const limit = o.stopAfterBars ?? Infinity;
  let fi = 0;
  barNo = 0;
  for (let si = 0; si < sections.length && barNo < limit; si++) {
    const s = sections[si];
    sectionStarts.push(t);
    const e = s.energy;
    const vm = e === 1 ? 0.72 : e === 2 ? 0.88 : 1.08;
    const secStart = t;
    const secBar0 = barNo;
    for (let b = 0; b < s.bars.length && barNo < limit; b++, barNo++) {
      const bt = t;
      barStarts.push(bt);
      const at = (beat: number) => bt + tp(beat);
      // ---- drums
      for (let k = 0; k < beats; k++) {
        if (o.groove === 'rock') {
          if (e === 1) {
            if (k === 0) events.push(P('kick', at(k), 0.5));
            events.push(P('hat', at(k), 0.22));
          } else {
            if (k % 2 === 0) events.push(P('kick', at(k), e === 3 ? 0.85 : 0.65));
            else events.push(P('snare', at(k), e === 3 ? 0.85 : 0.6));
            events.push(P('hat', at(k), e === 3 ? 0.45 : 0.3), P('hat', at(k + 0.5), e === 3 ? 0.38 : 0.22));
            if (e === 3 && k === 2) events.push(P('kick', at(k + 0.5), 0.6));
          }
        } else if (o.groove === 'swing') {
          events.push(P('hat', at(k), (k % 2 ? 0.42 : 0.32) * vm));
          if (k % 2 === 1) events.push(P('hat', at(k + 0.5), 0.26 * vm));
          if (e >= 2) events.push(P('kick', at(k), 0.16));
          if (e >= 2 && k % 2 === 1) events.push(P('snare-soft', at(k), 0.22 * vm));
        } else if (o.groove === 'shuffle') {
          events.push(P('hat', at(k), 0.3 * vm), P('hat', at(k + 0.5), 0.2 * vm));
          events.push(k % 2 === 0 ? P('kick', at(k), 0.6 * vm) : P('snare', at(k), 0.6 * vm));
        }
      }
      // ---- bass and chords, per chord span
      const bar = s.bars[b];
      const span = beats / bar.length;
      bar.forEach((c, h) => {
        const v = voiced[fi];
        const next = voiced[fi + 1];
        fi++;
        const b0 = h * span;
        const [bass, ...up] = v;
        const iv = CHORD_IV[c.q];
        const tone = (k: number) => bass + iv[k % iv.length] + (k >= iv.length ? 12 : 0);
        // bass
        if (o.groove === 'rock') {
          if (e === 1) for (let k = 0; k < span; k += 2) events.push(N(bass, at(b0 + k), q * Math.min(2, span - k) * 0.95, 0.55));
          else if (e === 2) for (let k = 0; k < span; k++) events.push(N(k === 2 ? bass + 7 : bass, at(b0 + k), q * 0.9, 0.6));
          else for (let k = 0; k < span; k += 0.5) events.push(N(bass, at(b0 + k), q * 0.45, k % 1 ? 0.55 : 0.72));
        } else if (o.groove === 'swing') {
          // walking: root, chord tones, chromatic approach to the next root
          const nextRoot = next ? next[0] : bass;
          for (let k = 0; k < span; k++) {
            const m = k === 0 ? bass : k === span - 1 && span > 1 ? nextRoot + (nextRoot > bass ? -1 : 1) : tone(k);
            events.push(N(m, at(b0 + k), q * 0.9, 0.6 * vm));
          }
        } else if (o.groove === 'shuffle') {
          const boogie = barNo % 2 ? [10, 9, 7, 4] : [0, 4, 7, 9];
          for (let k = 0; k < span; k++) events.push(N(bass + boogie[(b0 + k) % 4], at(b0 + k), q * 0.85, 0.62));
        } else {
          events.push(N(bass, at(b0), q * span * 0.95, 0.5));
        }
        // chords
        if (o.groove === 'rock') {
          const vel = e === 1 ? 0.24 : e === 2 ? 0.3 : 0.4;
          const voices = e === 3 && up[0] + 12 !== up[up.length - 1] ? [...up, up[0] + 12] : up;
          if (e === 1) for (const m of voices) events.push(N(m, at(b0), q * span * 0.95, vel));
          else for (let k = 0; k < span; k++) for (const m of voices) events.push(N(m, at(b0 + k), q * (e === 3 ? 0.5 : 0.85), vel * (k % 2 ? 0.85 : 1)));
        } else if (o.groove === 'swing') {
          // Charleston comp: on the beat, then the anticipation of the next one
          const hits = span >= 4 ? [0, 1.5] : [0];
          for (const k of hits) for (const m of up) events.push(N(m, at(b0 + k), q * 0.7, 0.3 * vm));
        } else if (o.groove === 'shuffle') {
          for (let k = 1; k < span; k += 2) for (const m of up) events.push(N(m, at(b0 + k), q * 0.4, 0.3 * vm));
        } else {
          // Alberti: low, high, middle, high
          const [a, m2, c3] = up;
          const pat = [a, c3, m2, c3];
          for (let k = 0; k < span * 2; k++) events.push(N(pat[k % 4], at(b0 + k / 2), q * 0.45, 0.3));
        }
      });
      t += beats * q;
    }
    // lead (only the bars actually played)
    const playedBeats = (barNo - secBar0) * beats;
    for (const [beat, semi, len] of s.lead ?? []) {
      if (beat >= playedBeats) continue;
      const m = o.tonic + semi;
      const st = secStart + tp(beat);
      const dur = Math.min(len, playedBeats - beat) * q * 0.92;
      events.push(N(m, st, dur, (e === 1 ? 0.55 : e === 2 ? 0.66 : 0.8)));
      if (e === 3) events.push(N(m - 12, st, dur, 0.4));
    }
  }
  return { events, length: t + 0.6, sectionStarts, barStarts };
}

// ---------------------------------------------------------------- style idioms (spec AE §10.2 `style`)

export type StyleId = 'baroque' | 'classical' | 'romantic' | 'modern' | 'jazz' | 'pop';
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** Diatonic degree index (0 = tonic, may be negative or > 6) → semitones. */
const dg = (d: number) => 12 * Math.floor(d / 7) + MAJ[((d % 7) + 7) % 7];

/** A short synthesised example of a style (8–11 s). `tonic` = midi of the key's tonic (around 60). */
export function styleClip(style: StyleId, tonic: number, variant: number): { events: NoteEvent[]; length: number } {
  const v = Math.abs(Math.floor(variant));
  switch (style) {
    case 'baroque':
      return baroque(tonic, v);
    case 'classical':
      return classical(tonic, v);
    case 'romantic':
      return romantic(tonic, v);
    case 'modern':
      return modern(tonic, v);
    case 'jazz': {
      const bars = v % 2 ? [[ch(2, 'm7'), ch(7, '7')], [ch(0, 'maj7')], [ch(9, '7'), ch(2, 'm7')], [ch(7, '7'), ch(0, 'maj7')]] : [[ch(0, 'maj7'), ch(9, '7')], [ch(2, 'm7'), ch(7, '7')], [ch(4, 'm7'), ch(9, '7')], [ch(2, 'm7'), ch(7, '7')]];
      const lead: LeadNote[] = [[0.5, 4, 0.5], [1, 7, 0.5], [1.5, 9, 0.5], [2, 11, 1], [3.5, 9, 0.5], [4, 7, 1.5], [6, 4, 0.5], [6.5, 3, 0.5], [7, 2, 1], [8.5, 9, 0.5], [9, 12, 1], [10, 11, 0.5], [10.5, 9, 0.5], [11, 7, 1], [12.5, 5, 0.5], [13, 4, 0.5], [13.5, 2, 0.5], [14, 0, 2]];
      const a = arrange([{ bars, energy: 2, lead }], { tonic, bpm: 138, groove: 'swing' });
      return { events: a.events, length: a.length };
    }
    case 'pop': {
      const bars = v % 2 ? [[ch(0)], [ch(7)], [ch(9, 'm')], [ch(5)]] : [[ch(9, 'm')], [ch(5)], [ch(0)], [ch(7)]];
      const hook: LeadNote[] = [[0, 7, 0.5], [0.5, 7, 0.5], [1, 9, 1], [2.5, 7, 0.5], [3, 4, 1]];
      const lead = [0, 1, 2, 3].flatMap((b) => hook.map(([x, s, l]) => [x + b * 4, b === 3 && x === 3 ? 0 : s, l] as LeadNote));
      const a = arrange([{ bars, energy: 2, lead }], { tonic, bpm: 100, groove: 'rock' });
      return { events: a.events, length: a.length };
    }
  }
}

/** Baroque: two independent voices in steady sixteenths and eighths over a circle-of-fifths sequence, detached. */
function baroque(tonic: number, v: number) {
  const q = 0.6; // 100 bpm
  const s16 = q / 4;
  const out: NoteEvent[] = [];
  const roots = [0, 3, 6, 2, 5, 1, 4, 0]; // I IV vii° iii vi ii V I (degree indices)
  const figs = [[4, 3, 2, 3, 4, 2, 0, 2], [0, 2, 4, 2, 0, 4, 2, 4], [4, 2, 3, 1, 2, 0, 1, -1]];
  const fig = figs[v % figs.length];
  roots.forEach((r, i) => {
    const t0 = i * 2 * q;
    // upper voice: a sixteenth figure, the same figure moved down the sequence
    const last = i === roots.length - 1;
    if (last) out.push(N(tonic + 12 + dg(0), t0, 2 * q * 0.9, 0.55));
    else fig.forEach((f, k) => out.push(N(tonic + 7 + dg(r + f) - (r > 3 ? 12 : 0), t0 + k * s16, s16 * 0.8, 0.55)));
    // lower voice: octave-leaping eighths, imitating with a delay
    const b = tonic - 12 + dg(r) - (r > 3 ? 12 : 0);
    const pat = last ? [0] : [0, 12, dg(r + 4) - dg(r), 12];
    pat.forEach((x, k) => out.push(N(b + x, t0 + k * q / 2, last ? 2 * q * 0.9 : (q / 2) * 0.75, 0.5)));
  });
  return { events: out, length: roots.length * 2 * q + 0.4 };
}

/** Classical: an Alberti bass under a simple, singable tune with a clear cadence. */
function classical(tonic: number, v: number) {
  const tunes: [number, number][][] = [
    [[4, 2], [2, 1], [4, 1], [7, 2], [5, 1], [3, 1], [6, 1], [4, 1], [3, 1], [1, 1], [0, 4]],
    [[2, 1], [3, 1], [4, 2], [5, 1], [7, 1], [5, 2], [4, 1], [3, 1], [1, 1], [6, 1], [0, 4]],
  ];
  const tune = tunes[v % tunes.length];
  const chords = [ch(0), ch(5), ch(7, '7'), ch(0)];
  const lead: LeadNote[] = [];
  let b = 0;
  for (const [d, len] of tune) {
    lead.push([b, dg(d) + 12, len]);
    b += len;
  }
  const a = arrange([{ bars: chords.map((c) => [c]), energy: 2, lead }], { tonic: tonic - 12, bpm: 120, groove: 'classical' });
  return { events: a.events, length: a.length };
}

/** Romantic: rich chords (sevenths, ninths, a chromatic bass), wide arpeggios, rubato and a swelling line. */
function romantic(tonic: number, v: number) {
  const out: NoteEvent[] = [];
  // Rubato: beat lengths push forward, then hold back at the end of the phrase.
  const beatLen = [0.82, 0.76, 0.72, 0.74, 0.7, 0.72, 0.8, 0.9, 1.0, 1.15, 1.3, 1.6];
  const at: number[] = [0];
  for (const l of beatLen) at.push(at[at.length - 1] + l);
  const progs = [
    [[0, 4, 11, 14], [9, 12, 19, 23], [8, 12, 18, 22], [7, 11, 17, 20]], // Imaj9 · vi7(add9) · ♭VI7 (chromatic bass) · V7♭9
    [[0, 7, 16, 23], [-1, 7, 14, 17], [-2, 4, 10, 16], [-3, 6, 12, 15]], // I · V/7 · I7/♭7 · vi°-ish: a falling chromatic bass
  ];
  const prog = progs[v % progs.length];
  const swell = [0.4, 0.5, 0.6, 0.72, 0.8, 0.85, 0.82, 0.72, 0.6, 0.5, 0.45, 0.4];
  prog.forEach((c, i) => {
    // wide left-hand arpeggio over three beats: bass, then up through the chord across two octaves
    const b0 = i * 3;
    const span = at[b0 + 3] - at[b0];
    const bass = tonic - 24 + c[0];
    const arp = [bass, bass + 7, tonic - 12 + c[1], tonic - 12 + c[2], tonic + c[3] - 12, tonic - 12 + c[2]];
    arp.forEach((m, k) => out.push(N(m, at[b0] + (k * span) / 6, span - (k * span) / 6, 0.32 + swell[b0] * 0.2)));
  });
  // melody: long notes, an expressive leap of a sixth, a sighing appoggiatura
  const mel = v % 2 ? [[7, 2], [16, 1], [14, 2], [12, 1], [11, 1], [9, 1], [8, 1], [7, 3]] : [[4, 1], [12, 2], [11, 1], [9, 2], [8, 1], [7, 2], [6, 0.5], [7, 2.5]];
  let b = 0;
  for (const [s, len] of mel) {
    const i0 = Math.min(11, Math.floor(b));
    const st = at[i0] + (b - i0) * beatLen[i0];
    const end = Math.min(12, b + len);
    const i1 = Math.min(11, Math.floor(end));
    const en = end >= 12 ? at[12] : at[i1] + (end - i1) * beatLen[i1];
    out.push(N(tonic + s, st, (en - st) * 0.97, swell[i0] + 0.1));
    b += len;
  }
  return { events: out, length: at[12] + 0.6 };
}

/** 20th century: parallel quartal chords (stacked fourths) and a whole-tone line, in uneven 3+2 groups. */
function modern(tonic: number, v: number) {
  const out: NoteEvent[] = [];
  const e8 = 0.24;
  const groups = [3, 2, 3, 2, 2, 3, 3, 2];
  const quart = (r: number) => [r, r + 5, r + 10, r + 15];
  const roots = v % 2 ? [0, 2, -2, 3, 5, 3, 1, 0] : [0, -2, 1, 3, -1, 2, 4, 0];
  const wt = v % 2 ? [12, 14, 16, 18, 20, 18, 16, 14, 12, 10] : [18, 16, 14, 12, 10, 12, 14, 16, 18, 20];
  let t = 0;
  let w = 0;
  groups.forEach((g, i) => {
    // planing: the same quartal shape moved in parallel, accented on the start of each group
    for (const m of quart(tonic - 12 + roots[i])) out.push(N(m, t, g * e8 * 0.9, i % 2 ? 0.34 : 0.46));
    for (let k = 0; k < g; k++) {
      if (k === 0 || k === 2) {
        out.push(N(tonic + wt[w % wt.length], t + k * e8, (k === 0 ? 2 : 1) * e8 * 0.9, k === 0 ? 0.68 : 0.5));
        w++;
      }
    }
    t += g * e8;
  });
  for (const m of [...quart(tonic - 12), tonic + 6 + 12]) out.push(N(m, t, 1.4, 0.4));
  return { events: out, length: t + 1.6 };
}
