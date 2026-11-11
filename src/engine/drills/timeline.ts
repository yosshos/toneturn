// The prog / band timeline (docs/research/PROG_ENGINE.md): meter per bar (mixed meters, eighth-note groupings such as
// 2+2+3), a tempo map (metric modulation: new tempo = old × ratio at a bar), the click / count-in plan that follows
// both, and the notation bars (bar lines, a time signature where it changes). Shared by bass, guitar and drums.
//
// Pure. A drill without `meters` / `tempoMap` keeps the old constant grid: every function here returns exactly what the
// old code computed for it (tests/progTimeline.test.ts checks the click plan against the old rule).
//
// Units: a DRILL BEAT is a quarter note, or an eighth when `drill.pulse === 8` (as everywhere in the drills engine).
// `bpm` always counts drill beats at the start of the take; the tempo map scales it from a bar on.

import type { Drill } from './types';

// ───────────────────────────── meters ─────────────────────────────

/** One bar's meter: num/den, and optional beat groups (in 1/`unit` notes, default 1/den), e.g. 7/8 = 2+2+3. */
export interface MeterSpec {
  num: number;
  den: 2 | 4 | 8 | 16;
  /** Beat groups that sum to the bar (9/8 = [2, 2, 2, 3]; 4/4 in eighths as [3, 3, 2] with unit 8). */
  groups?: number[];
  /** Note value of the group numbers (default `den`): 4/4 grouped 3+3+2 in eighths has unit 8. */
  unit?: 4 | 8 | 16;
}

/** A meter change: from bar `bar` (0-based) on, bars are in `meter` (until the next change). */
export interface MeterChange {
  bar: number;
  meter: MeterSpec;
}

/** A tempo change: from bar `bar` on, tempo = the tempo before × `ratio` (metric modulation). */
export interface TempoChange {
  bar: number;
  ratio: number;
}

/** "Old note value `from` becomes the new `to`" → the tempo ratio (values in quarter notes: triplet ♩ = 2/3, dotted ♪ = 3/4). */
export const metricRatio = (from: number, to: number): number => to / from;
/** Common modulations (the tempo ratio each gives). */
export const MODULATIONS = {
  /** The triplet quarter becomes the new quarter (120 → 180). */
  tripletQuarterToQuarter: metricRatio(2 / 3, 1),
  /** The dotted eighth becomes the new quarter (120 → 160). */
  dottedEighthToQuarter: metricRatio(3 / 4, 1),
  /** The quarter becomes the new dotted quarter (120 → 80). */
  quarterToDottedQuarter: metricRatio(1, 3 / 2),
  /** The triplet eighth becomes the new eighth (120 → 180). */
  tripletEighthToEighth: metricRatio(1 / 3, 1 / 2),
  /** The quarter becomes the new triplet quarter (180 → 120). */
  quarterToTripletQuarter: metricRatio(1, 2 / 3),
} as const;

/** Parse "7/8", "7/8 2+2+3", "4/4 3+3+2/8" (groups in eighths) into a MeterSpec. */
export function parseMeter(s: string): MeterSpec {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*(?:\(?\s*([\d+\s]+?)\s*\)?\s*(?:\/\s*(\d+))?)?\s*$/.exec(s);
  if (!m) throw new Error(`bad meter "${s}"`);
  const den = Number(m[2]) as MeterSpec['den'];
  const out: MeterSpec = { num: Number(m[1]), den };
  if (m[3]) out.groups = m[3].split('+').map((x) => Number(x.trim()));
  if (m[4]) out.unit = Number(m[4]) as MeterSpec['unit'];
  return out;
}

/** The time signature text of a meter ("7/8"). */
export const meterSig = (m: MeterSpec): string => `${m.num}/${m.den}`;
/** The grouping text of a meter ("2+2+3"), or '' when it has none. */
export const groupText = (m: MeterSpec): string => (m.groups && m.groups.length > 1 ? m.groups.join('+') : '');

/** The usual grouping of an x/8 (or x/16) meter: 3s when it divides by 3, 5 = 3+2, 7 = 2+2+3, 11 = 3+3+3+2, 13 = 3+3+3+2+2, else 2s and a 3. */
export function defaultGroups(num: number, den: number): number[] | undefined {
  if (den < 8) return undefined;
  if (num % 3 === 0) return Array.from({ length: num / 3 }, () => 3);
  const T: Record<number, number[]> = { 2: [2], 4: [2, 2], 5: [3, 2], 7: [2, 2, 3], 8: [3, 3, 2], 10: [3, 3, 2, 2], 11: [3, 3, 3, 2], 13: [3, 3, 3, 2, 2], 14: [3, 3, 3, 3, 2] };
  if (T[num]) return T[num];
  const out: number[] = [];
  let left = num;
  while (left > 3) {
    out.push(2);
    left -= 2;
  }
  out.push(left);
  return out;
}

/** Length of a bar in drill beats (quarters; eighths for pulse 8). */
export function barBeats(m: MeterSpec, pulse?: 8): number {
  return (m.num * (pulse === 8 ? 8 : 4)) / m.den;
}

/** Group starts of a bar in drill beats from the bar's start (no groups: each beat of the meter, 1/den). */
export function groupStartsOf(m: MeterSpec, pulse?: 8): number[] {
  const len = barBeats(m, pulse);
  const groups = m.groups ?? defaultGroups(m.num, m.den);
  // No groups: every beat of the meter (1/den) — quarters of a 4/4 bar even on an eighth pulse.
  if (!groups) {
    const step = (pulse === 8 ? 8 : 4) / m.den;
    return Array.from({ length: Math.ceil(len / step - 1e-9) }, (_, i) => i * step);
  }
  const unitBeats = (pulse === 8 ? 8 : 4) / (m.unit ?? m.den);
  const out: number[] = [];
  let at = 0;
  for (const g of groups) {
    out.push(at);
    at += g * unitBeats;
  }
  return out;
}

/** Problems with a meter plan (empty = fine): groups that don't sum to the bar, bars that aren't whole drill beats. */
export function meterErrors(changes: MeterChange[], pulse?: 8): string[] {
  const errs: string[] = [];
  for (const c of changes) {
    const m = c.meter;
    const len = barBeats(m, pulse);
    if (Math.abs(len - Math.round(len)) > 1e-9) errs.push(`bar ${c.bar}: ${meterSig(m)} is not a whole number of drill beats (use pulse 8)`);
    if (m.groups) {
      const unit = m.unit ?? m.den;
      const sum = m.groups.reduce((a, b) => a + b, 0);
      if (Math.abs((sum * m.den) / unit - m.num) > 1e-9) errs.push(`bar ${c.bar}: groups ${m.groups.join('+')} don't fill ${meterSig(m)}`);
    }
  }
  return errs;
}

/** The meter a drill starts in: its first change at bar 0, or the old fields (meter beats, pulse, groups). */
export function baseMeter(drill: Pick<Drill, 'meter' | 'pulse' | 'groups' | 'meters'>): MeterSpec {
  const first = drill.meters?.find((c) => c.bar === 0);
  if (first) return first.meter;
  const n = drill.meter || 4;
  return drill.pulse === 8 ? { num: n, den: 8, ...(drill.groups ? { groups: drill.groups } : {}) } : { num: n, den: 4 };
}

// ───────────────────────────── the time map ─────────────────────────────

/** One bar of the timeline. */
export interface BarInfo {
  index: number;
  /** First drill beat of the bar. */
  start: number;
  /** Length in drill beats. */
  beats: number;
  meter: MeterSpec;
  /** Group starts in drill beats from the bar's start (accent points; every beat when the meter has no groups). */
  groups: number[];
  /** The time signature changed here (or bar 0): notation writes it. */
  sigChange: boolean;
  /** Onset of the bar in ms from beat 0, and the tempo (drill beats per minute) in force. */
  ms: number;
  bpm: number;
}

/** A drill's beat ↔ time map with its bars. */
export interface TimeMap {
  bars: BarInfo[];
  /** ms from beat 0 of a drill beat (negative beats: the count-in, at the first tempo). */
  msAt(beat: number): number;
  /** The drill beat at a time (inverse of msAt). */
  beatAt(ms: number): number;
  /** Tempo (drill beats per minute) at a beat. */
  bpmAt(beat: number): number;
  /** The bar a beat falls in (past the end: the last bar's meter repeated). */
  barAt(beat: number): BarInfo;
  /** Where a beat sits: bar, beat inside the bar, the group it belongs to and its offset inside it. */
  position(beat: number): { bar: number; inBar: number; group: number; inGroup: number };
  /** Total beats covered by `bars`. */
  beats: number;
  /** True when the drill uses neither meters nor a tempo map (the old constant grid). */
  constant: boolean;
}

/** The fields a timeline reads. */
export type TimelineFields = Pick<Drill, 'meter' | 'pulse' | 'groups' | 'meters' | 'tempoMap' | 'beats'>;

/** Does a drill use the prog timeline (meter changes or a tempo map)? */
export const hasTimeline = (d: Pick<Drill, 'meters' | 'tempoMap'>): boolean => !!(d.meters?.length || d.tempoMap?.length);

/** Build the time map of bars in `changes` (sorted by bar) covering at least `beats`, at `bpm`, with a tempo map. */
export function buildTimeMap(o: { beats: number; bpm: number; pulse?: 8; base: MeterSpec; meters?: MeterChange[]; tempo?: TempoChange[] }): TimeMap {
  const meters = [...(o.meters ?? [])].sort((a, b) => a.bar - b.bar);
  const tempo = [...(o.tempo ?? [])].sort((a, b) => a.bar - b.bar);
  const meterOf = (bar: number): MeterSpec => {
    let m = o.base;
    for (const c of meters) if (c.bar <= bar) m = c.meter;
    return m;
  };
  const bars: BarInfo[] = [];
  let start = 0;
  let ms = 0;
  let bpm = o.bpm;
  let prevSig = '';
  // At least one bar; bars until the beats are covered (and up to the last change so its bar exists).
  const lastChange = Math.max(0, ...meters.map((c) => c.bar), ...tempo.map((c) => c.bar));
  for (let i = 0; start < o.beats - 1e-9 || i <= lastChange || i === 0; i++) {
    for (const t of tempo) if (t.bar === i) bpm *= t.ratio;
    const meter = meterOf(i);
    const beats = barBeats(meter, o.pulse);
    const sig = `${meterSig(meter)} ${groupText(meter)}`;
    bars.push({ index: i, start, beats, meter, groups: groupStartsOf(meter, o.pulse), sigChange: sig !== prevSig, ms, bpm });
    prevSig = sig;
    start += beats;
    ms += (beats * 60000) / bpm;
    if (i > 10000) break;
  }
  const total = start;
  const constant = !meters.length && !tempo.length;
  const last = bars[bars.length - 1];
  const barAt = (beat: number): BarInfo => {
    if (beat < 0) return bars[0];
    if (beat >= total - 1e-9) {
      // Past the end: the last bar's meter and tempo repeated.
      const k = Math.floor((beat - total) / last.beats + 1e-9);
      const s = total + k * last.beats;
      return { ...last, index: last.index + 1 + k, start: s, sigChange: false, ms: last.ms + ((s - last.start) * 60000) / last.bpm };
    }
    let lo = 0;
    let hi = bars.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (bars[mid].start <= beat + 1e-9) lo = mid;
      else hi = mid - 1;
    }
    return bars[lo];
  };
  const msAt = (beat: number): number => {
    if (beat < 0) return (beat * 60000) / bars[0].bpm;
    const b = barAt(beat);
    return b.ms + ((beat - b.start) * 60000) / b.bpm;
  };
  const beatAt = (t: number): number => {
    if (t < 0) return (t * bars[0].bpm) / 60000;
    const endMs = last.ms + (last.beats * 60000) / last.bpm;
    if (t >= endMs) return total + ((t - endMs) * last.bpm) / 60000;
    let lo = 0;
    let hi = bars.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (bars[mid].ms <= t + 1e-9) lo = mid;
      else hi = mid - 1;
    }
    const b = bars[lo];
    return b.start + ((t - b.ms) * b.bpm) / 60000;
  };
  const position = (beat: number) => {
    const b = barAt(beat);
    const inBar = beat - b.start;
    let g = 0;
    for (let k = 0; k < b.groups.length; k++) if (b.groups[k] <= inBar + 1e-9) g = k;
    return { bar: b.index, inBar, group: g, inGroup: inBar - (b.groups[g] ?? 0) };
  };
  return { bars, msAt, beatAt, bpmAt: (beat) => barAt(beat).bpm, barAt, position, beats: total, constant };
}

const cache = new WeakMap<object, Map<number, TimeMap>>();
/** The time map of a drill at a start tempo (cached per drill object and tempo). */
export function timeMapOf(drill: TimelineFields, bpm: number): TimeMap {
  let byBpm = cache.get(drill);
  if (!byBpm) cache.set(drill, (byBpm = new Map()));
  const hit = byBpm.get(bpm);
  if (hit) return hit;
  const tm = buildTimeMap({ beats: drill.beats, bpm, pulse: drill.pulse, base: baseMeter(drill), meters: drill.meters, tempo: drill.tempoMap });
  byBpm.set(bpm, tm);
  return tm;
}

/** Drill beat → ms on the drill's timeline (swung 8ths at 2/3 of their own beat). The old `beat × 60000 / bpm` when constant. */
export function timelineMs(drill: TimelineFields & Pick<Drill, 'spec'>, beat: number, bpm: number): number {
  const tm = timeMapOf(drill, bpm);
  if (drill.spec.swing) {
    const f = beat - Math.floor(beat);
    if (Math.abs(f - 0.5) < 1e-6) {
      const b0 = Math.floor(beat);
      return tm.msAt(b0) + (2 / 3) * (tm.msAt(b0 + 1) - tm.msAt(b0));
    }
  }
  return tm.msAt(beat);
}

// ───────────────────────────── the click and the count-in ─────────────────────────────

/** One click of a take's timeline (seconds from the first count-in click), as `piano.playTimeline` takes it. */
export interface Click {
  t: number;
  accent: boolean;
  silent: boolean;
  /** 2 = bar start, 1 = group start, 0 = other pulse (engine detail; the audio plays accent / normal). */
  level?: 0 | 1 | 2;
  /** Count-in click. */
  count?: boolean;
}
export interface ClickPlan {
  clicks: Click[];
  /** Woodblock times (s): the off-beat click ('and'). */
  wood: number[];
  /** Count-in length in drill beats (the first bar). */
  countIn: number;
  /** When the take starts and ends (s from the first click). */
  responseAt: number;
  responseEnd: number;
  /** Seconds from the first click of a drill beat (the backing's clock). */
  at: (beat: number) => number;
}

const legacyGroupStarts = (g: number[]): number[] => g.map((_, k) => g.slice(0, k).reduce((a, b) => a + b, 0));

/** The old rule (DrillTake.clickHeard), kept verbatim for constant-grid drills. */
export function legacyClickHeard(drill: Pick<Drill, 'meter' | 'click' | 'gap' | 'groups'>, i: number): boolean {
  const m = drill.meter || 4;
  if (drill.groups && !legacyGroupStarts(drill.groups).includes(i % m)) return false;
  if (i < m || !drill.click || drill.click === 'all') return true;
  const beat = (i - m) % m;
  const bar = Math.floor((i - m) / m);
  if (drill.click === 'gap') return !drill.gap || bar % (drill.gap[0] + drill.gap[1]) < drill.gap[0];
  if (drill.click === '24') return beat === 1 || beat === 3;
  // DRUMS P2 (d-time 9): 'one' with a gap = the 1 only in the bars the gap leaves on (every other bar with [1, 1]).
  if (drill.click === 'one') return beat === 0 && (!drill.gap || bar % (drill.gap[0] + drill.gap[1]) < drill.gap[0]);
  if (drill.click === 'and') return false;
  return bar < 2 || (bar < 4 && beat === 0);
}

/**
 * The click plan of a take: the count-in (one bar of the first meter, at the first tempo), then a click per drill beat
 * on the timeline. On a timeline drill the click sounds on each group start (the bar's 1 accented) and follows the
 * tempo map; the drill's click mode ('one', '24', 'gap', 'fade', 'and') is read per bar. With the band playing
 * (`drums`), the click stops after the count-in, as before.
 */
export function clickPlan(drill: Pick<Drill, 'meter' | 'click' | 'gap' | 'groups' | 'pulse' | 'meters' | 'tempoMap' | 'beats' | 'spec'>, bpm: number, opts: { drums?: boolean } = {}): ClickPlan {
  const drums = !!opts.drums;
  if (!hasTimeline(drill)) {
    const beatS = 60 / bpm;
    const clicks = Array.from({ length: drill.meter + Math.ceil(drill.beats) + 1 }, (_, i) => ({ t: i * beatS, accent: i % drill.meter === 0, silent: !legacyClickHeard(drill, i) || (drums && i >= drill.meter) }));
    const wood = drill.click === 'and' && !drums ? Array.from({ length: Math.ceil(drill.beats) }, (_, k) => (drill.meter + k + 0.5) * beatS) : [];
    return { clicks, wood, countIn: drill.meter, responseAt: drill.meter * beatS, responseEnd: (drill.meter + drill.beats + 1) * beatS, at: (b) => (drill.meter + b) * beatS };
  }
  const tm = timeMapOf(drill, bpm);
  const first = tm.bars[0];
  const countIn = Math.round(first.beats);
  const lead = (countIn * 60) / first.bpm;
  const at = (b: number) => lead + tm.msAt(b) / 1000;
  const clicks: Click[] = [];
  for (let i = 0; i < countIn + Math.ceil(drill.beats) + 1; i++) {
    const b = i - countIn;
    if (b < 0) {
      const inBar = i;
      const lvl = inBar === 0 ? 2 : first.groups.some((g) => Math.abs(g - inBar) < 1e-9) ? 1 : 0;
      clicks.push({ t: at(b), accent: inBar === 0, silent: lvl === 0, level: lvl, count: true });
      continue;
    }
    const bar = tm.barAt(b);
    const inBar = b - bar.start;
    const lvl: 0 | 1 | 2 = Math.abs(inBar) < 1e-9 ? 2 : bar.groups.some((g) => Math.abs(g - inBar) < 1e-9) ? 1 : 0;
    const k = bar.index;
    const beatNo = bar.groups.findIndex((g) => Math.abs(g - inBar) < 1e-9);
    let heard = lvl > 0;
    if (heard && drill.click && drill.click !== 'all') {
      if (drill.click === 'gap') heard = !drill.gap || k % (drill.gap[0] + drill.gap[1]) < drill.gap[0];
      else if (drill.click === '24') heard = beatNo === 1 || beatNo === 3;
      else if (drill.click === 'one') heard = lvl === 2 && (!drill.gap || k % (drill.gap[0] + drill.gap[1]) < drill.gap[0]);
      else if (drill.click === 'and') heard = false;
      else heard = k < 2 || (k < 4 && lvl === 2);
    }
    clicks.push({ t: at(b), accent: lvl === 2, silent: !heard || drums, level: lvl });
  }
  const wood: number[] = [];
  if (drill.click === 'and' && !drums) for (let k = 0; k < Math.ceil(drill.beats); k++) wood.push(at(k + 0.5));
  return { clicks, wood, countIn, responseAt: lead, responseEnd: at(drill.beats + 1), at };
}

// ───────────────────────────── notation bars ─────────────────────────────

/** One notation line: its bars in quarter notes, each with the signature to write (only where it changes). */
export interface StaffLine {
  /** First / end position of the line in quarter notes from beat 0. */
  from: number;
  to: number;
  /** `sig` only where the meter changes (write it there); `cur` always (the bar's own signature). */
  bars: { from: number; len: number; sig?: string; cur: string; groups?: number[] }[];
}

/**
 * Lines of bars for the staff: bars in quarter notes, a time signature at bar 0 and wherever the meter changes,
 * beam groups (in quarter notes from the bar's start) for x/8 bars. A line holds whole bars up to `perLine` quarters
 * (at least one bar a line).
 */
export function staffLines(drill: TimelineFields, perLine = 8): StaffLine[] {
  const tm = timeMapOf(drill, 60);
  const q = drill.pulse === 8 ? 0.5 : 1;
  const out: StaffLine[] = [];
  let cur: StaffLine | null = null;
  for (const b of tm.bars) {
    if (b.start >= drill.beats - 1e-9) break;
    const from = b.start * q;
    const len = b.beats * q;
    if (!cur || (cur.to - cur.from + len > perLine + 1e-9 && cur.bars.length)) {
      cur = { from, to: from, bars: [] };
      out.push(cur);
    }
    const groups = b.meter.den >= 8 ? b.groups.map((g) => g * q) : undefined;
    cur.bars.push({ from, len, cur: meterSig(b.meter), ...(b.sigChange ? { sig: meterSig(b.meter) } : {}), ...(groups && groups.length > 1 ? { groups } : {}) });
    cur.to = from + len;
  }
  return out;
}

/** Beam-group start (in quarter notes) of a position (in quarter notes), on a timeline drill's mixed bars. */
export function beamGroupAt(drill: TimelineFields, q: number): number {
  const tm = timeMapOf(drill, 60);
  const k = drill.pulse === 8 ? 0.5 : 1;
  const b = tm.barAt(q / k);
  const inBar = q / k - b.start;
  let g = 0;
  for (const x of b.groups) if (x <= inBar + 1e-9) g = x;
  return (b.start + g) * k;
}

// ───────────────────────────── building drills ─────────────────────────────

/**
 * Give a drill a bar plan: a list of meters (one per bar, or [meter, bars] runs) and optional tempo changes. Sets
 * `meters`, `tempoMap`, `meter` (the first bar's beats, so the count-in and old readers stay right) and `groups` /
 * `pulse` hints. Throws on a plan the grid can't hold (meterErrors).
 */
export function withBarPlan<D extends Drill>(drill: D, plan: (MeterSpec | string | [MeterSpec | string, number])[], tempo: TempoChange[] = []): D {
  const changes: MeterChange[] = [];
  let bar = 0;
  let prev = '';
  for (const p of plan) {
    const [m0, n] = Array.isArray(p) ? p : [p, 1];
    const m = typeof m0 === 'string' ? parseMeter(m0) : m0;
    const key = `${meterSig(m)} ${(m.groups ?? []).join('+')} ${m.unit ?? ''}`;
    if (key !== prev) changes.push({ bar, meter: m });
    prev = key;
    bar += n;
  }
  const errs = meterErrors(changes, drill.pulse);
  if (errs.length) throw new Error(errs.join('; '));
  const first = changes[0]?.meter;
  const out: D = { ...drill, meters: changes, ...(tempo.length ? { tempoMap: tempo } : {}) };
  if (first) {
    out.meter = barBeats(first, drill.pulse);
    if (drill.pulse === 8 && first.den === 8) out.groups = first.groups ?? defaultGroups(first.num, first.den);
  }
  return out;
}

/** Total drill beats of a list of meters (for building notes bar by bar). */
export function planBars(plan: MeterSpec[], pulse?: 8): { start: number; beats: number; meter: MeterSpec; groups: number[] }[] {
  let s = 0;
  return plan.map((m) => {
    const b = { start: s, beats: barBeats(m, pulse), meter: m, groups: groupStartsOf(m, pulse) };
    s += b.beats;
    return b;
  });
}
