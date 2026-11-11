// Grading the timed items of the voice course (time feel, band songs, scat). Pure: frames come on the take's clock
// (seconds from the first beat after the count-in / the first sung bar), with the microphone delay removed.

import type { SungFrame } from './sing';
import { bandScore, finish, holdMetrics, inBandScore, M, reachScore, UNCLEAR, type MetricScore, type TakeGrade, type VocalItem } from './vocal';
import { swingBand, swingRatioOf, timeFeel, voiceOnsets, type TimeFeel } from './voiceTime';
import { gradeSongTake, type SongGrade, type SongPlan } from './voiceSongs';
import { chordAtBeat, parseChart, transposeChart } from './charts';
import { improvReportBy, type ImprovReport } from './perform';
import { hzToMidi } from './pitch';

/** The level's own rule dominates: a take that misses it cannot pass on the other metrics. */
const gated = (g: TakeGrade, key: number): TakeGrade => ({ ...g, score: Math.round(g.score * (0.4 + 0.6 * key) * 1000) / 1000 });

export interface TimeResult {
  grade: TakeGrade;
  feel: TimeFeel | null;
  swing?: { ratio: number; pairs: number };
}

/** A time-feel take: onsets (s, from beat 0, delay removed) against the item's grid. */
export function gradeTime(item: VocalItem, onsets: number[]): TimeResult {
  const ts = item.time!;
  const beat = 60 / ts.bpm;
  const grid = ts.hits.map((b) => b * beat);
  const win = Math.min(0.25, beat * 0.4);
  if (onsets.length < 2) return { grade: UNCLEAR, feel: null };
  const out: MetricScore[] = [];
  let feel: TimeFeel | null = null;
  switch (ts.feel) {
    case 'swing': {
      const sw = swingRatioOf(onsets, beat, ts.bars * ts.meter);
      const downs = ts.hits.filter((b) => Math.abs(b - Math.round(b)) < 1e-6).map((b) => b * beat);
      feel = timeFeel(onsets, downs, { window: win });
      const [lo, hi] = swingBand(ts.bpm);
      out.push(M('swing', sw.ratio, '%', sw.pairs >= 3 ? inBandScore(sw.ratio, [lo, hi], 0.4) : 0, 3));
      out.push(M('coverage', (sw.pairs / Math.max(1, downs.length)) * 100, '%', reachScore(sw.pairs, downs.length * 0.75), 1.5));
      out.push(M('onset', feel.meanMs, 'ms', bandScore(feel.meanMs, [20, 40, 80]), 1.5));
      return { grade: gated(finish(out, {}), out[0].score), feel, swing: sw };
    }
    case 'back': {
      const written = (ts.written ?? []).map((b) => b * beat);
      const first = onsets.find((t) => t >= written[0] - 0.15);
      const delayBeats = first === undefined ? 0 : (first - written[0]) / beat;
      const tgt = (ts.target ?? 0) * beat;
      const near = onsets.filter((t) => Math.abs(t - tgt) <= beat * 0.5).sort((a, b) => Math.abs(a - tgt) - Math.abs(b - tgt))[0];
      const tErr = near === undefined ? 999 : Math.round((near - tgt) * 1000);
      const sung = onsets.filter((t) => t >= written[0] - 0.15 && t <= tgt + beat).length;
      out.push(M('entry', delayBeats * 100, '%', delayBeats >= 0.5 && delayBeats <= 1.5 ? 1 : delayBeats >= 0.35 && delayBeats <= 1.8 ? 0.5 : 0, 2));
      out.push(M('target', tErr, 'ms', bandScore(tErr, [40, 60, 120]), 3));
      out.push(M('coverage', (sung / written.length) * 100, '%', reachScore(sung, written.length - 1), 1));
      return { grade: finish(out, {}), feel: null };
    }
    case 'clock': {
      feel = timeFeel(onsets, grid, { window: Math.min(0.3, beat * 0.45) });
      const [a, b] = ts.silent ?? [0, 0];
      const silentIdx = ts.hits.map((h, i) => (h >= a && h < b ? i : -1)).filter((i) => i >= 0);
      const silentHits = silentIdx.filter((i) => feel!.offsets[i] !== null);
      const lastBar = silentIdx.filter((i) => ts.hits[i] >= b - ts.meter).map((i) => feel!.offsets[i]).filter((x): x is number => x !== null);
      const endMs = lastBar.length ? Math.round(lastBar.reduce((s, x) => s + x, 0) / lastBar.length) : 999;
      const backIdx = ts.hits.findIndex((h) => h >= b);
      const re = backIdx >= 0 ? feel.offsets[backIdx] : null;
      out.push(M('coverage', (silentHits.length / Math.max(1, silentIdx.length)) * 100, '%', reachScore(silentHits.length, silentIdx.length * 0.8), 1.5));
      out.push(M('onset', endMs, 'ms', bandScore(endMs, [30, 60, 120]), 2));
      out.push(M('reentry', re ?? 999, 'ms', re === null ? 0 : bandScore(re, [30, 60, 120]), 3));
      return { grade: gated(finish(out, {}), out[2].score), feel };
    }
    default: {
      feel = timeFeel(onsets, grid, { window: win });
      const cover = feel.n / Math.max(1, grid.length);
      const extraPen = Math.max(0, 1 - feel.extra / Math.max(4, grid.length));
      out.push(M('coverage', cover * 100, '%', reachScore(cover, 0.85) * extraPen, 1.5));
      if (ts.feel === 'behind') {
        out.push(M('lateness', feel.meanMs, 'ms', feel.n >= 8 ? inBandScore(feel.meanMs, [40, 120], 40) : 0, 3));
        out.push(M('spread', feel.sdMs, 'ms', bandScore(feel.sdMs, [25, 40, 70]), 2));
      } else if (ts.feel === 'on') {
        out.push(M('onset', feel.meanMs, 'ms', bandScore(feel.meanMs, [15, 30, 60]), 2.5));
        out.push(M('spread', feel.sdMs, 'ms', bandScore(feel.sdMs, [25, 40, 70]), 2));
      } else {
        // entry / anticipate / call: every target onset where it belongs
        out.push(M('entry', feel.absMs, 'ms', bandScore(feel.absMs, ts.feel === 'entry' ? [30, 50, 90] : [40, 60, 110]), 3));
        out.push(M('spread', feel.sdMs, 'ms', bandScore(feel.sdMs, [30, 50, 80]), 1));
      }
      // The rule of the feel must hold for a pass (on top / behind / the entries), not only the notes being there.
      return { grade: gated(finish(out, {}), out[1].score), feel };
    }
  }
}

export interface SongResult {
  grade: TakeGrade;
  song: SongGrade;
}

/** A band-song take of bars [from, to] (frames from the first sung bar, delay removed). */
export function gradeSong(item: VocalItem, frames: SungFrame[], plan: SongPlan, from: number, to: number): SongResult {
  const s = item.song!;
  const g = gradeSongTake(frames, plan, { fromBar: from, toBar: to, tol: s.tol, rhythm: s.rhythm, need: s.need });
  if (!g.phrases.length || g.phrases.every((p) => p.sung === 0)) return { grade: UNCLEAR, song: g };
  const out: MetricScore[] = [M('phrases', g.mean * 100, '%', g.mean, 4)];
  const worst = g.phrases.reduce((w, p) => Math.min(w, p.score), 1);
  out.push(M('phrases', worst * 100, '%', worst, 0.01));
  let score = g.score;
  let ok = true;
  if (s.chorus && g.chorusDb !== null) {
    out.push(M('chorus', g.chorusDb, 'dB', reachScore(g.chorusDb, 3), 1));
    if (g.chorusDb < 3) ok = false;
  }
  if (s.drift) {
    const d = g.drift;
    out.push(M('tuneDrift', d?.drift ?? 99, '¢', d ? bandScore(d.drift, [s.drift.max / 2, s.drift.max, s.drift.max * 2]) : 0, 2));
    out.push(M('noteError', d?.medianError ?? 99, '¢', d ? bandScore(d.medianError, [s.drift.median / 2, s.drift.median, s.drift.median * 2]) : 0, 2));
    if (!d || Math.abs(d.drift) > s.drift.max || d.medianError > s.drift.median) ok = false;
  }
  if (s.feel === 'behind') {
    const f = g.feel;
    const late = f && f.n >= 8 ? inBandScore(f.meanMs, [40, 120], 40) : 0;
    out.push(M('lateness', f?.meanMs ?? 0, 'ms', late, 3));
    out.push(M('spread', f?.sdMs ?? 0, 'ms', f ? bandScore(f.sdMs, [25, 40, 70]) : 0, 1.5));
    if (!f || f.n < 8 || f.meanMs < 40 || f.meanMs > 120 || f.sdMs > 40) ok = false;
  }
  if (s.interpret) {
    const it = interpretation(frames, plan, from, to);
    out.push(M('kept', it.kept * 100, '%', reachScore(it.kept, 0.85), 2.5));
    out.push(M('moved', it.moved * 100, '%', reachScore(it.moved, 0.3), 2.5));
    if (it.kept < 0.85 || it.moved < 0.3) ok = false;
  }
  if (s.longNotes) {
    const st = longNoteSteadiness(frames, plan, from, to, s.longNotes === 'straight');
    if (st !== null) {
      out.push(M('steady', st * 100, '%', st, 2));
      if (st < 0.6) ok = false;
    }
  }
  const base = finish(out, {});
  // Every rule of the level must hold for a pass: otherwise the score stays just under the bar.
  score = Math.min(score, base.score);
  if (!ok) score = Math.min(score, s.need - 0.01);
  return { grade: { ...base, score: Math.round(score * 1000) / 1000 }, song: g };
}

/**
 * F14 L3, interpreting a head: the long notes (2 beats or more, and each phrase's last) are still sung — anywhere
 * from half a beat before to the end of the written note — and at least 30 % of the clear onsets moved by a quarter
 * beat or more from the written rhythm.
 */
export function interpretation(frames: SungFrame[], plan: SongPlan, from: number, to: number): { kept: number; moved: number } {
  const base = from * plan.meter * plan.beat;
  const sel = plan.notes.map((n, k) => ({ n: { ...n, start: n.start - base }, k })).filter(({ n }) => n.bar >= from && n.bar <= to);
  const ns = sel.map(({ n }) => n);
  const last = new Set(plan.phrases.map((p) => p.notes[p.notes.length - 1]));
  const longs = sel.filter(({ n, k }) => n.dur >= 2 * plan.beat - 1e-6 || last.has(k)).map(({ n }) => n);
  const keptN = longs.filter((n) => {
    const cs = frames.filter((f) => f.t >= n.start - plan.beat / 2 && f.t <= n.start + n.dur && f.hz && f.confidence >= 0.75).map((f) => Math.abs(((((hzToMidi(f.hz!) - n.midi) * 100 + 600) % 1200) + 1200) % 1200 - 600));
    return cs.filter((c) => c <= 50).length >= 8;
  }).length;
  const on = voiceOnsets(frames);
  const f = timeFeel(on, ns.map((n) => n.start), { window: plan.beat * 0.9 });
  const hit = f.offsets.filter((x): x is number => x !== null);
  const moved = hit.filter((x) => Math.abs(x) >= plan.beat * 250).length;
  return { kept: longs.length ? keptN / longs.length : 0, moved: hit.length ? moved / ns.length : 0 };
}

/** Long notes (2 beats or more): steady pitch (and no vibrato when `straight`), 0..1; null without long notes. */
export function longNoteSteadiness(frames: SungFrame[], plan: SongPlan, from: number, to: number, straight: boolean): number | null {
  const base = from * plan.meter * plan.beat;
  const longs = plan.notes.filter((n) => n.bar >= from && n.bar <= to && n.dur >= 2 * plan.beat - 1e-6);
  if (!longs.length) return null;
  const scores = longs.map((n) => {
    const fs = frames.filter((f) => f.t >= n.start - base && f.t <= n.start - base + n.dur);
    const h = holdMetrics(fs, n.midi);
    if (h.unclear) return 0;
    const steady = bandScore(h.maxTrendDev, [12, 20, 35]);
    return straight && h.vibrato.present ? steady * 0.4 : steady;
  });
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000;
}

// ---------------------------------------------------------------- scat (F15)

export interface ScatResult {
  grade: TakeGrade;
  report?: ImprovReport;
  /** Guide tones: per half-note slot, right / wrong / not sung. */
  slots?: ('ok' | 'off' | null)[];
}

/** The chart of a scat item in the sung key (tonic pitch class), and its chord tones at a beat. */
export function scatChart(item: VocalItem, tonicPc: number) {
  const sc = item.scat!;
  const p = parseChart(transposeChart(sc.chart, tonicPc), 4);
  const pcsAt = (b: number) => {
    const c = chordAtBeat(p, 4, b);
    return c ? c.iv.map((x) => (c.root + x) % 12) : [];
  };
  const guideAt = (b: number) => {
    const c = chordAtBeat(p, 4, b);
    if (!c) return [];
    const third = c.iv.find((x) => x === 3 || x === 4) ?? 4;
    const seventh = c.iv.find((x) => x === 10 || x === 11 || x === 9) ?? 10;
    return [(c.root + third) % 12, (c.root + seventh) % 12];
  };
  return { parsed: p, beats: p.bars * 4 * (sc.loops ?? 1), pcsAt, guideAt };
}

export function gradeScat(item: VocalItem, frames: SungFrame[], tonicPc: number): ScatResult {
  const sc = item.scat!;
  const beat = 60 / sc.bpm;
  const ch = scatChart(item, tonicPc);
  if (frames.filter((f) => f.hz && f.confidence >= 0.8).length < 20) return { grade: UNCLEAR };
  if (sc.mode === 'guide') {
    const slots: ('ok' | 'off' | null)[] = [];
    for (let b = 0; b < ch.beats; b += 2) {
      const cs = frames.filter((f) => f.t >= b * beat + 0.12 && f.t <= (b + 2) * beat - 0.05 && f.hz && f.confidence >= 0.8).map((f) => hzToMidi(f.hz!));
      if (cs.length < 5) {
        slots.push(null);
        continue;
      }
      const m = [...cs].sort((x, y) => x - y)[cs.length >> 1];
      const ok = ch.guideAt(b).some((pc) => {
        const c = ((((m - pc) * 100) % 1200) + 1200) % 1200;
        return Math.min(c, 1200 - c) <= 30;
      });
      slots.push(ok ? 'ok' : 'off');
    }
    const share = slots.filter((x) => x === 'ok').length / Math.max(1, slots.length);
    return { grade: finish([M('guide', share * 100, '%', reachScore(share, 0.85), 3)], {}), slots };
  }
  const r = improvReportBy(frames, ch.pcsAt, sc.bpm);
  if (r.notes < 3) return { grade: UNCLEAR, report: r };
  const out: MetricScore[] = [M('landingTones', r.strongChordTones * 100, '%', reachScore(r.strongChordTones, 0.7), 3), M('landing', r.endsOnChordTone ? 100 : 0, '%', r.endsOnChordTone ? 1 : 0, 1.5)];
  if (sc.mode === 'approach') out.push(M('approach', r.chromaticApproaches * 100, '%', reachScore(r.chromaticApproaches, 0.4), 3));
  out.push(M('coverage', r.notes, '%', reachScore(r.notes, ch.beats / 2), 0.5));
  return { grade: finish(out, {}), report: r };
}
