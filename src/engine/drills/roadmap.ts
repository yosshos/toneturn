// The road map / section engine (docs/research/PROG_ENGINE.md §4; DRUMS_NICHE_PLAN §2.2, BASS_NICHE_PLAN J4,
// GUITAR_DEEPENING g-reading 6): a song form of named sections (intro, verse, chorus, bridge, solo, outro; repeats,
// a 2 → 4 feel change, stop-time, tags) that drives the band's style per section, and the measures of a take against
// it: lost bars (the take aligned bar by bar), landing on each section's 1, tempo drift across the form, and per-section
// timing. Pure.

import type { Drill, PlayedNote } from './types';
import type { BandStyle } from '../band';
import { barBeats, parseMeter, timeMapOf, withBarPlan, type MeterSpec, type TempoChange } from './timeline';

export type SectionKind = 'intro' | 'verse' | 'pre' | 'chorus' | 'bridge' | 'solo' | 'interlude' | 'head' | 'tag' | 'vamp' | 'outro';

/** One section of a form. */
export interface FormSection {
  /** Shown on the road map ("A", "Verse", "Bridge"). */
  name: string;
  kind: SectionKind;
  bars: number;
  /** Meter of the section (default: the section before's, else 4/4). */
  meter?: MeterSpec | string;
  /** Chords, one string per bar (repeats cyclically over the section's bars). */
  chart?: string[];
  /** Drum groove (a GROOVES id; '-' = drums lay out, 'stop' = stop-time hits on each 1). */
  groove?: string;
  /** The harmony band: a style, 'tacet' (lays out), or 'stop' (stop-time: one short hit on each 1). */
  band?: BandStyle | 'tacet' | 'stop';
  /** Feel (shown and checked by the course's rules: 2 = halves, 4 = quarters, half / double time). */
  feel?: '2' | '4' | 'half' | 'double';
  /** Tempo × this from the section's first bar (metric modulation). */
  tempo?: number;
  /** A drum fill in the bar before the section (set-up). */
  fillBefore?: boolean;
  /** Ensemble hits (beats from the section's start). */
  hits?: number[];
  /** Loudness the chart asks for (the dynamics arc). */
  dynamic?: 'p' | 'mf' | 'f';
  /** A cue line one bar ahead on the road map. */
  cue?: { en: string; he: string };
}

/** A form: sections and the order they are played in (indices; absent = in list order). Repeat = list it twice. */
export interface FormPlan {
  sections: FormSection[];
  order?: number[];
}

/** One played section on the drill's beat line. */
export interface FormSpan {
  /** Index into plan.sections and the n-th time it is played (0-based). */
  section: number;
  pass: number;
  name: string;
  kind: SectionKind;
  startBar: number;
  bars: number;
  startBeat: number;
  beats: number;
  meter: MeterSpec;
}

const sectionMeter = (s: FormSection, prev: MeterSpec): MeterSpec => (s.meter === undefined ? prev : typeof s.meter === 'string' ? parseMeter(s.meter) : s.meter);

/** The form in play order with bars and beats. */
export function expandForm(plan: FormPlan, pulse?: 8): FormSpan[] {
  const order = plan.order ?? plan.sections.map((_, i) => i);
  const passes = new Map<number, number>();
  const out: FormSpan[] = [];
  let bar = 0;
  let beat = 0;
  let meter: MeterSpec = { num: 4, den: 4 };
  for (const i of order) {
    const s = plan.sections[i];
    if (!s) throw new Error(`form order names section ${i}, which is not in the plan`);
    meter = sectionMeter(s, meter);
    const len = barBeats(meter, pulse);
    const pass = passes.get(i) ?? 0;
    passes.set(i, pass + 1);
    out.push({ section: i, pass, name: s.name, kind: s.kind, startBar: bar, bars: s.bars, startBeat: beat, beats: s.bars * len, meter });
    bar += s.bars;
    beat += s.bars * len;
  }
  return out;
}

/** The span a bar belongs to. */
export const spanAtBar = (spans: FormSpan[], bar: number): FormSpan | undefined => spans.find((s) => bar >= s.startBar && bar < s.startBar + s.bars);

/**
 * Put a form on a drill: total `beats`, the bar plan (meters, tempo changes), the chart (each section's chords over its
 * bars), the drums' sections (grooves, fills before marked sections), the band's sections (style / tacet / stop).
 * The drill's notes are the caller's (the course writes the part per section); `form` is kept for the analysis.
 */
export function applyForm<D extends Drill>(drill: D, plan: FormPlan): D {
  const spans = expandForm(plan, drill.pulse);
  const meters: [MeterSpec, number][] = spans.map((s) => [s.meter, s.bars]);
  const tempo: TempoChange[] = [];
  const chart: string[] = [];
  const grooves: { bar: number; groove: string }[] = [];
  const band: { bar: number; style: BandStyle | 'tacet' | 'stop' }[] = [];
  const fills: number[] = [];
  for (const sp of spans) {
    const s = plan.sections[sp.section];
    if (s.tempo && s.tempo !== 1) tempo.push({ bar: sp.startBar, ratio: s.tempo });
    for (let b = 0; b < sp.bars; b++) chart.push(s.chart?.length ? s.chart[b % s.chart.length] : '%');
    if (s.groove) grooves.push({ bar: sp.startBar, groove: s.groove });
    if (s.band) band.push({ bar: sp.startBar, style: s.band });
    if (s.fillBefore && sp.startBar > 0) fills.push(sp.startBar - 1);
  }
  const total = spans.reduce((a, s) => a + s.beats, 0);
  const base = withBarPlan({ ...drill, beats: total }, meters, tempo);
  const firstGroove = grooves.find((g) => g.bar === 0)?.groove ?? drill.drums?.groove ?? grooves[0]?.groove;
  const out: D = { ...base, form: plan, chart };
  if (firstGroove) out.drums = { ...(drill.drums ?? {}), groove: firstGroove, sections: grooves, ...(fills.length || drill.drums?.fills ? { fills: [...(drill.drums?.fills ?? []), ...fills] } : {}) };
  if (drill.band || band.length) out.band = { ...(drill.band ?? { style: 'hold' as BandStyle }), sections: band };
  return out;
}

// ───────────────────────────── measuring a take against the form ─────────────────────────────

export interface SectionReport {
  name: string;
  kind: SectionKind;
  startBar: number;
  /** Expected notes matched / expected (on the aligned position). */
  hit: number;
  /** Mean / SD timing offset (ms, + = late) of the matched notes. */
  mean: number | null;
  sd: number | null;
  /** Played tempo ÷ written tempo in the section (> 1 = rushing), from matched IOIs. */
  tempo: number | null;
  /** |offset| of the note on the section's 1 (ms), null = nothing played there. Absent for the first section. */
  landing?: number | null;
}
export interface FormReport {
  sections: SectionReport[];
  /** Bars lost or gained: each place the take's bar position shifts against the form (bar = the first bar it shows in). */
  lost: { bar: number; shift: number; section: string }[];
  /** max |tempo − 1| over the sections (the form's tempo drift). */
  drift: number | null;
  /** Section starts landed within the window / section starts. */
  landings: { ok: number; of: number };
}

const keyOf = (drill: Pick<Drill, 'spec'>, pitch: number) => (drill.spec.instrument === 'drums' || drill.spec.family.startsWith('d-') ? pitch : ((pitch % 12) + 12) % 12);

/**
 * Align a take bar by bar against the form (a small dynamic program over the take's bars with a shift of −2…+2 bars;
 * changing the shift costs, so identical bars keep shift 0 until a section change shows the slip), then measure each
 * section. `played`: onsets with pitch (drums: the voice's GM note), latency removed, ms from beat 0.
 */
export function analyzeForm(drill: Drill, bpm: number, played: Pick<PlayedNote, 'pitch' | 'on'>[], opts: { landingMs?: number } = {}): FormReport {
  const plan = drill.form;
  const tm = timeMapOf(drill, bpm);
  const spans = plan ? expandForm(plan, drill.pulse) : [{ section: 0, pass: 0, name: '', kind: 'verse' as const, startBar: 0, bars: tm.bars.length, startBeat: 0, beats: drill.beats, meter: tm.bars[0].meter }];
  const bars = tm.bars.filter((b) => b.start < drill.beats - 1e-9);
  const nB = bars.length;
  const winMs = (b: number) => [tm.msAt(bars[b].start), tm.msAt(bars[b].start + bars[b].beats)] as const;
  // Expected notes per bar, relative to the bar start (ms at the bar's own tempo).
  const expBar: { rel: number; k: number; i: number }[][] = bars.map(() => []);
  drill.notes.forEach((n, i) => {
    const b = tm.barAt(n.beat).index;
    if (b < nB) expBar[b].push({ rel: tm.msAt(n.beat) - tm.msAt(bars[b].start), k: keyOf(drill, n.pitch), i });
  });
  const ps = [...played].sort((a, b) => a.on - b.on);
  const playedIn = (w: number) => {
    const [a, z] = winMs(w);
    const pad = (z - a) * 0.06;
    return ps.filter((p) => p.on >= a - pad && p.on < z - pad).map((p) => ({ rel: p.on - a, k: keyOf(drill, p.pitch), on: p.on }));
  };
  const tolOf = (w: number) => Math.max(60, (0.2 * 60000) / bars[w].bpm);
  // Similarity of the take's bar w to the form's bar e: F1 of notes matched by key within the tolerance.
  const sim = (w: number, e: number): number => {
    const P = playedIn(w);
    if (e < 0 || e >= nB) return P.length ? 0 : 1;
    const E = expBar[e];
    if (!E.length && !P.length) return 1;
    if (!E.length || !P.length) return 0;
    if (Math.abs(bars[e].beats - bars[w].beats) > 1e-9) return 0;
    const used = new Set<number>();
    let m = 0;
    for (const x of E) {
      let best = -1;
      let bd = tolOf(w);
      P.forEach((p, j) => {
        const d = Math.abs(p.rel - x.rel);
        if (!used.has(j) && p.k === x.k && d <= bd) {
          bd = d;
          best = j;
        }
      });
      if (best >= 0) {
        used.add(best);
        m++;
      }
    }
    return (2 * m) / (E.length + P.length);
  };
  const SH = [-2, -1, 0, 1, 2];
  const PEN = 0.6;
  const cost: number[][] = [];
  const from: number[][] = [];
  for (let w = 0; w < nB; w++) {
    cost.push([]);
    from.push([]);
    SH.forEach((d, si) => {
      const local = 1 - sim(w, w - d);
      if (w === 0) {
        cost[w][si] = local + (d === 0 ? 0 : PEN * Math.abs(d));
        from[w][si] = si;
        return;
      }
      let best = Infinity;
      let arg = 0;
      SH.forEach((d0, s0) => {
        const c = cost[w - 1][s0] + (d0 === d ? 0 : PEN * Math.abs(d - d0));
        // On a tie, switch as late as possible (where the evidence is: identical bars before a section change can't tell).
        if (c < best - 1e-12 || (Math.abs(c - best) < 1e-12 && d0 !== d && (SH[arg] === d || Math.abs(d - d0) < Math.abs(d - SH[arg])))) {
          best = c;
          arg = s0;
        }
      });
      cost[w][si] = best + local;
      from[w][si] = arg;
    });
  }
  const shift: number[] = new Array(nB).fill(0);
  if (nB) {
    let si = cost[nB - 1].indexOf(Math.min(...cost[nB - 1]));
    for (let w = nB - 1; w >= 0; w--) {
      shift[w] = SH[si];
      si = from[w][si];
    }
  }
  const lost: FormReport['lost'] = [];
  for (let w = 0; w < nB; w++) {
    const prev = w ? shift[w - 1] : 0;
    if (shift[w] !== prev) lost.push({ bar: w, shift: shift[w] - prev, section: spanAtBar(spans, w)?.name ?? '' });
  }
  // Per-section measures on the aligned positions: a take bar w holds form bar w − shift.
  const match = new Map<number, { on: number; dev: number }>();
  for (let w = 0; w < nB; w++) {
    const e = w - shift[w];
    if (e < 0 || e >= nB) continue;
    const P = playedIn(w);
    const used = new Set<number>();
    for (const x of expBar[e]) {
      let best = -1;
      let bd = tolOf(w);
      P.forEach((p, j) => {
        const d = Math.abs(p.rel - x.rel);
        if (!used.has(j) && p.k === x.k && d <= bd) {
          bd = d;
          best = j;
        }
      });
      if (best >= 0) {
        used.add(best);
        // Timing against the note's own place on the form, moved to the window the player is in.
        match.set(x.i, { on: P[best].on, dev: P[best].rel - x.rel });
      }
    }
  }
  const LW = opts.landingMs ?? 30;
  const sections: SectionReport[] = spans.map((sp, k) => {
    const idx = drill.notes.map((n, i) => ({ n, i })).filter((x) => x.n.beat >= sp.startBeat - 1e-9 && x.n.beat < sp.startBeat + sp.beats - 1e-9);
    const got = idx.filter((x) => match.has(x.i));
    const devs = got.map((x) => match.get(x.i)!.dev);
    const mean = devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : null;
    const sd = devs.length > 1 && mean !== null ? Math.sqrt(devs.reduce((a, b) => a + (b - mean) ** 2, 0) / devs.length) : null;
    // Tempo: played IOI ÷ written IOI over consecutive matched notes.
    const rs: number[] = [];
    for (let j = 1; j < got.length; j++) {
      const a = got[j - 1];
      const b = got[j];
      const wr = tm.msAt(b.n.beat) - tm.msAt(a.n.beat);
      const pl = match.get(b.i)!.on - match.get(a.i)!.on;
      if (wr > 20 && pl > 0) rs.push(wr / pl);
    }
    rs.sort((a, b) => a - b);
    const tempo = rs.length >= 3 ? rs[rs.length >> 1] : null;
    const rep: SectionReport = { name: sp.name, kind: sp.kind, startBar: sp.startBar, hit: idx.length ? got.length / idx.length : 1, mean, sd, tempo };
    if (k > 0) {
      const on1 = idx.find((x) => Math.abs(x.n.beat - sp.startBeat) < 1e-6 && match.has(x.i));
      rep.landing = on1 ? Math.abs(match.get(on1.i)!.dev) : null;
    }
    return rep;
  });
  const tempos = sections.map((s) => s.tempo).filter((x): x is number => x !== null);
  const lands = sections.slice(1).filter((s) => s.landing !== undefined);
  return {
    sections,
    lost,
    drift: tempos.length ? Math.max(...tempos.map((t) => Math.abs(t - 1))) : null,
    landings: { ok: lands.filter((s) => s.landing !== null && s.landing! <= LW).length, of: lands.length },
  };
}
