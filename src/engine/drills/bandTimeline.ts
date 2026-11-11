// The band on the prog timeline (docs/research/PROG_ENGINE.md §3): drums and comping bar by bar in mixed meters, the
// band in its own meter (polymeter: band in 4/4 under a riff in 7/8), section style changes (road map), and a unison
// part that doubles the written line. Pure: everything in drill beats on the take's beat clock.
//
// Old drills: `drumHits` (bass.ts) runs on `drumHitsOnBars` with constant bars — the same hits as before — and the
// harmony band keeps bassBand.ts `bandHits`. The functions here only take over when the drill has a timeline field.

import type { Drill } from './types';
import { GROOVES } from '../grooves';
import { buildTimeMap, hasTimeline, timeMapOf, type MeterSpec } from './timeline';
import { bandComping, closeVoicings, hashOf, voiceLead, type BandStyle, type CompHit } from '../band';
import { parseChart } from '../charts';
import { bandHits, chartText } from './bassBand';

export type DrumLaneHit = { beat: number; d: 'k' | 's' | 'h' | 'tom-hi' | 'tom-lo' | 'crash' };
/** A bar of the band's grid in drill beats. */
export interface BandBar {
  index: number;
  start: number;
  beats: number;
  /** Group starts (drill beats from the bar's start). */
  groups: number[];
  meter?: MeterSpec;
}

/**
 * The drum part on a list of bars (any lengths): each bar plays its section's groove from its first step, as many steps
 * as the bar holds (lanes wrap); fill bars play half a bar of groove, a 16th fill and a crash on the next bar's 1.
 */
export function drumHitsOnBars(dr: NonNullable<Drill['drums']>, bars: BandBar[], beats: number, pulse?: 8, exact = false): DrumLaneHit[] {
  const g0 = GROOVES.find((x) => x.id === dr.groove);
  if (!g0) return [];
  const out: DrumLaneHit[] = [];
  const fills = new Set(dr.fills ?? []);
  const secAt = (bar: number) => [...(dr.sections ?? [])].filter((x) => x.bar <= bar).sort((a, b) => b.bar - a.bar)[0];
  const grooveAt = (bar: number) => {
    const sec = secAt(bar);
    return (sec && GROOVES.find((x) => x.id === sec.groove)) || g0;
  };
  for (const B of bars) {
    const bar = B.index;
    const meter = B.beats;
    // Road-map sections: '-' = the drums lay out, 'stop' = stop-time (kick + crash on each 1).
    const special = secAt(bar)?.groove;
    if (special === '-') continue;
    if (special === 'stop') {
      if (B.start < beats - 1e-9) out.push({ beat: B.start, d: 'k' }, { beat: B.start, d: 'crash' });
      continue;
    }
    const g = grooveAt(bar);
    // One step in drill beats. The old grid (exact = false) kept its quirk: a quarter-beat groove under an eighth-pulse
    // drill stepped 1/sub drill beats. Timeline drills (exact) count a quarter as 2 eighth-pulse beats.
    const stepB = g.den === 8 && g.sub === 2 ? (pulse === 8 ? 1 : 0.5) : (exact && pulse === 8 ? 2 : 1) / g.sub;
    const steps = Math.round(meter / stepB);
    const b0 = B.start;
    if (fills.has(bar)) {
      const half = meter / 2;
      for (let i = 0; i < steps && i * stepB < half; i++) {
        if (g.k[i % g.k.length] === 'x') out.push({ beat: b0 + i * stepB, d: 'k' });
        if (g.s[i % g.s.length] === 'x') out.push({ beat: b0 + i * stepB, d: 's' });
      }
      for (let q = 0; q < half * 4; q++) out.push({ beat: b0 + half + q / 4, d: q < half * 2 ? 's' : q < half * 3 ? 'tom-hi' : 'tom-lo' });
      if (b0 + meter < beats) out.push({ beat: b0 + meter, d: 'crash' });
      continue;
    }
    for (let i = 0; i < steps; i++) {
      const at = b0 + i * stepB;
      if (at >= beats - 1e-9) break;
      if (g.k[i % g.k.length] === 'x') out.push({ beat: at, d: 'k' });
      if (g.s[i % g.s.length] === 'x') out.push({ beat: at, d: 's' });
      if (g.h[i % g.h.length] === 'x') out.push({ beat: at, d: 'h' });
    }
  }
  return out;
}

/** Constant bars of `meter` beats covering `beats` (the old grid). */
export function constantBars(beats: number, meter = 4): BandBar[] {
  const n = Math.ceil(beats / meter - 1e-9);
  return Array.from({ length: n }, (_, i) => ({ index: i, start: i * meter, beats: meter, groups: Array.from({ length: Math.ceil(meter - 1e-9) }, (_, k) => k) }));
}

/**
 * The band's bars: in `bandMeter` when the drill has one (polymeter — the band's own bar lines on the same beat clock),
 * else the drill's own bars (its meters), else the constant grid.
 */
export function bandBars(drill: Pick<Drill, 'beats' | 'meter' | 'pulse' | 'groups' | 'meters' | 'tempoMap' | 'bandMeter'>): BandBar[] {
  if (drill.bandMeter) {
    const tm = buildTimeMap({ beats: drill.beats, bpm: 60, pulse: drill.pulse, base: drill.bandMeter });
    return tm.bars.filter((b) => b.start < drill.beats - 1e-9).map((b) => ({ index: b.index, start: b.start, beats: b.beats, groups: b.groups, meter: b.meter }));
  }
  if (hasTimeline(drill)) return timeMapOf(drill, 60).bars.filter((b) => b.start < drill.beats - 1e-9).map((b) => ({ index: b.index, start: b.start, beats: b.beats, groups: b.groups, meter: b.meter }));
  return constantBars(drill.beats, drill.meter || 4);
}

/** The drill's drum lane hits on its band bars (timeline drills: mixed meters / polymeter; others: exactly the old drumHits). */
export function drillDrumHits(drill: Pick<Drill, 'drums' | 'band' | 'beats' | 'meter' | 'pulse' | 'groups' | 'meters' | 'tempoMap' | 'bandMeter'>): DrumLaneHit[] {
  if (!drill.drums) return [];
  return drumHitsOnBars(drill.drums, bandBars(drill), drill.beats, drill.pulse, bandOnTimeline(drill));
}

/** Does the band need the timeline path (meters, a tempo map, its own meter or section styles)? */
export const bandOnTimeline = (d: Pick<Drill, 'meters' | 'tempoMap' | 'bandMeter' | 'band'>): boolean => hasTimeline(d) || !!d.bandMeter || !!d.band?.sections?.length;

/** The band's style at a band bar (road-map sections; 'tacet' = lays out, 'stop' = one hit on each 1). */
export function bandStyleAt(drill: Pick<Drill, 'band'>, bar: number): BandStyle | 'tacet' | 'stop' | null {
  if (!drill.band) return null;
  const sec = [...(drill.band.sections ?? [])].filter((s) => s.bar <= bar).sort((a, b) => b.bar - a.bar)[0];
  return sec ? sec.style : drill.band.style;
}

/**
 * The harmony band's comping on the band's bars. Chart bars follow the band's bars. Runs of bars with one style and
 * one even bar length are comped as before (bandComping); bars in x/8 meters get a chord on each group start (the
 * odd-meter hits a prog band plays). 'tacet' sections and `rests` are silent. Old drills: bassBand `bandHits`.
 */
export function drillBandHits(drill: Pick<Drill, 'band' | 'chart' | 'meter' | 'beats' | 'itemId' | 'pulse' | 'groups' | 'meters' | 'tempoMap' | 'bandMeter'>): CompHit[] {
  if (!bandOnTimeline(drill)) return bandHits(drill);
  if (!drill.band || !drill.chart?.length) return [];
  const bars = bandBars(drill);
  const rests = drill.band.rests ?? [];
  const out: CompHit[] = [];
  let prev: number[] | null = null;
  const seed = hashOf(drill.itemId);
  let k = 0;
  while (k < bars.length) {
    const st = bandStyleAt(drill, bars[k].index);
    const odd = !!bars[k].meter && bars[k].meter!.den >= 8;
    let e = k + 1;
    while (e < bars.length && bandStyleAt(drill, bars[e].index) === st && bars[e].beats === bars[k].beats && !odd) e++;
    const run = bars.slice(k, e);
    const chart = run.map((b) => drill.chart![b.index % drill.chart!.length] ?? '%');
    if (st && st !== 'tacet' && chart.some((c) => /[A-G]/.test(c))) {
      const len = run[0].beats;
      const p = parseChart(chartText(chart), len);
      if (p.chords.length) {
        if (st === 'stop') {
          run.forEach((b, j) => {
            const c = [...p.chords].filter((x) => x.bar <= j).pop() ?? p.chords[0];
            const v = voiceLead(closeVoicings(c), prev);
            prev = v;
            out.push({ beat: b.start, len: 0.4, notes: v, vel: 0.42 });
          });
        } else if (odd) {
          for (const g of run[0].groups) {
            const c = [...p.chords].filter((x) => x.at <= g + 1e-6).pop() ?? p.chords[0];
            const v = voiceLead(closeVoicings(c), prev);
            prev = v;
            const next = run[0].groups.find((x) => x > g + 1e-6) ?? len;
            out.push({ beat: run[0].start + g, len: Math.max(0.3, (next - g) * 0.85), notes: v, vel: g === 0 ? 0.36 : 0.3 });
          }
        } else {
          for (const h of bandComping(p, len, run.length * len, st, seed + k)) out.push({ ...h, beat: h.beat + run[0].start });
        }
      }
    }
    k = e;
  }
  return out.filter((h) => h.beat >= 0 && h.beat < drill.beats - 1e-9 && !rests.some(([a, b]) => h.beat >= a - 1e-6 && h.beat < b - 1e-6));
}

/** One note of the band's unison part (drill beats). */
export interface UnisonNote {
  beat: number;
  len: number;
  midi: number;
  vel: number;
  inst: 'bass' | 'guitar' | 'keys';
}

/**
 * The unison part: the band's bass / guitar / keys play the written line with the player (prog unisons: a riff
 * doubled at the octave, a 5th below …). From `unison.line`, else the drill's own pitched notes (drums: none),
 * moved by `transpose`. Silent in the band's `rests` and in 'tacet' sections.
 */
export function unisonLine(drill: Pick<Drill, 'unison' | 'notes' | 'band' | 'spec' | 'beats' | 'meter' | 'pulse' | 'groups' | 'meters' | 'tempoMap' | 'bandMeter'>): UnisonNote[] {
  const u = drill.unison;
  if (!u) return [];
  const src = u.line ?? (drill.spec.instrument === 'drums' || drill.spec.family.startsWith('d-') ? [] : drill.notes.filter((n) => !n.voice).map((n) => ({ beat: n.beat, dur: n.dur, midi: n.pitch })));
  const rests = drill.band?.rests ?? [];
  const bars = drill.band?.sections?.length ? bandBars(drill) : [];
  const tacet = (b: number) => {
    if (!bars.length) return false;
    const bar = [...bars].filter((x) => x.start <= b + 1e-9).pop();
    return !!bar && bandStyleAt(drill, bar.index) === 'tacet';
  };
  const seen = new Set<string>();
  const out: UnisonNote[] = [];
  for (const n of src) {
    const midi = n.midi + (u.transpose ?? 0);
    const key = `${n.beat.toFixed(4)}:${midi}`;
    if (seen.has(key) || rests.some(([a, b]) => n.beat >= a - 1e-6 && n.beat < b - 1e-6) || tacet(n.beat)) continue;
    seen.add(key);
    out.push({ beat: n.beat, len: Math.max(0.1, n.dur * 0.95), midi, vel: u.vel ?? 0.7, inst: u.inst });
  }
  return out.sort((a, b) => a.beat - b.beat);
}

/**
 * Where the band's bars and the player's bars line up again (polymeter): the first beat > 0 where both start a bar,
 * or null within the take. Band in 4/4 (8 eighths) under 7/8: 56 eighths (8 bars of 7 / 7 of 4).
 */
export function realignBeat(drill: Pick<Drill, 'beats' | 'meter' | 'pulse' | 'groups' | 'meters' | 'tempoMap' | 'bandMeter'>): number | null {
  const band = new Set(bandBars(drill).map((b) => Math.round(b.start * 1000)));
  const mine = hasTimeline(drill) ? timeMapOf(drill, 60).bars.map((b) => b.start) : constantBars(drill.beats, drill.meter || 4).map((b) => b.start);
  const hit = mine.find((s) => s > 1e-9 && band.has(Math.round(s * 1000)));
  return hit ?? null;
}
