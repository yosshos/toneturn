// Grading the timed items of the voice course (time feel, band songs, scat). Pure: frames come on the take's clock
// (seconds from the first beat after the count-in / the first sung bar), with the microphone delay removed.

import type { SungFrame } from './sing';
import { bandScore, finish, holdMetrics, inBandScore, M, reachScore, UNCLEAR, type MetricScore, type TakeGrade, type VocalItem } from './vocal';
import { swingBand, swingRatioOf, timeFeel, voiceOnsets, type TimeFeel } from './voiceTime';
import { gradeSongTake, pitchChanges, type PhraseScore, type PlanNote, type SongGrade, type SongPlan } from './voiceSongs';
import { chordAtBeat, parseChart, transposeChart } from './charts';
import { improvReportBy, type ImprovReport } from './perform';
import { hzToMidi, midiToHz } from './pitch';
import { segmentNotes } from './memory';
import { Follower, gradeMotif, gradeRubato, gradeTrade, reentryOffset, rejoinAt, synthRubato, tradeOpening, tradeTurns, type TradeTurn } from './voiceP2';
import type { PNote } from './improvPhrasing';

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
  const g = s.interpretFrom !== undefined ? gradeSplitTake(frames, plan, from, to, s.interpretFrom, s) : gradeSongTake(frames, plan, { fromBar: from, toBar: to, tol: s.tol, rhythm: s.rhythm, need: s.need });
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
  if (s.interpretFrom !== undefined) {
    const ph = plan.phrases[s.interpretFrom];
    if (ph && ph.fromBar >= from && ph.toBar <= to) {
      const shift = (ph.fromBar - from) * plan.meter * plan.beat;
      const it = interpretation(frames.map((f) => ({ ...f, t: f.t - shift })), plan, ph.fromBar, ph.toBar);
      out.push(M('kept', it.kept * 100, '%', reachScore(it.kept, 0.85), 2.5));
      out.push(M('moved', it.moved * 100, '%', reachScore(it.moved, 0.3), 2.5));
      if (it.kept < 0.85 || it.moved < 0.3) ok = false;
    }
  }
  if (s.embellish) {
    const e = embellishment(frames, plan, from, to);
    out.push(M('kept', e.kept * 100, '%', reachScore(e.kept, 0.8), 2.5));
    out.push(M('added', e.added * 100, '%', reachScore(e.added, 0.2), 2.5));
    if (e.kept < 0.8 || e.added < 0.2) ok = false;
  }
  if (s.bop) {
    const b = bopAccents(frames, plan, from, to);
    const [lo, hi] = swingBand(plan.bpm);
    out.push(M('swing', b.ratio, '%', b.pairs >= 3 ? inBandScore(b.ratio, [lo, hi], 0.4) : 0, 2));
    out.push(M('lift', b.lift, 'dB', reachScore(b.lift, 1.5), 2.5));
    if (b.pairs < 3 || b.ratio < lo - 0.2 || b.lift < 1.5) ok = false;
  }
  if (s.falls) {
    const f = phraseFalls(frames, plan, from, to);
    out.push(M('falls', f.falls, '%', reachScore(f.falls, Math.max(1, f.phrases - 1)), 2.5));
    if (f.falls < Math.max(1, f.phrases - 1)) ok = false;
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
 * F14 L6, colla voce: no clock — the follower's path through the melody (the band changed chords as the singer
 * reached each bar); every phrase scored on the notes reached and in tune. Breath and time are free here.
 */
export function gradeRubatoSong(item: VocalItem, frames: SungFrame[], plan: SongPlan, from: number, to: number): SongResult & { follow: number } {
  const s = item.song!;
  const sel = plan.notes.filter((n) => n.bar >= from && n.bar <= to);
  const r = gradeRubato(frames, sel.map((n) => n.midi), sel.map((n) => n.phrase), s.tol ?? 50);
  const phrases = r.phrases.map((p) => ({ i: p.i, pitch: p.score, time: null, breath: 1, score: p.score, sung: p.reached, notes: p.notes }));
  const mean = phrases.length ? phrases.reduce((a, p) => a + p.score, 0) / phrases.length : 0;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const song: SongGrade = { phrases, score: r3(phrases.some((p) => p.score < s.need) ? Math.min(mean, s.need - 0.01) : mean), mean: r3(mean), weakest: phrases.length ? phrases.reduce((w, p) => (p.score < w.score ? p : w), phrases[0]).i : 0, feel: null, drift: null, chorusDb: null, notePitch: r.cents.map((c) => (c === null ? null : Math.abs(c) <= (s.tol ?? 50) ? 1 : 0)) };
  if (r.follow === 0) return { grade: UNCLEAR, song, follow: 0 };
  const base = finish([M('phrases', mean * 100, '%', mean, 4), M('follow', r.follow * 100, '%', reachScore(r.follow, 0.9), 2)], {});
  let score = Math.min(song.score, base.score);
  if (r.follow < 0.8) score = Math.min(score, s.need - 0.01);
  return { grade: { ...base, score: r3(score) }, song, follow: r.follow };
}

/** A colla voce item's parts: the bar where the tempo starts, the free notes, the tempo notes (start s from that bar) and the last free note's written beats. */
export function collaParts(plan: SongPlan, from: number, to: number, freeUntil: number): { split: number; free: PlanNote[]; tempo: { midi: number; start: number; dur: number }[]; lastBeats: number } {
  const ph = plan.phrases[Math.max(1, Math.min(freeUntil, plan.phrases.length - 1))];
  const split = Math.min(Math.max(ph.fromBar, from + 1), to + 1);
  const free = plan.notes.filter((n) => n.bar >= from && n.bar < split);
  const base = split * plan.meter * plan.beat;
  const tempo = plan.notes.filter((n) => n.bar >= split && n.bar <= to).map((n) => ({ midi: n.midi, start: n.start - base, dur: n.dur }));
  return { split, free, tempo, lastBeats: free.length ? free[free.length - 1].dur / plan.beat : 1 };
}

/**
 * F14 L6 / L9 (P3), colla voce then a tempo: the free phrases graded without a clock (the follower's path, each note
 * reached in tune); the band then counted one bar and came in on `rejoin` (take clock, s; null = the free part was
 * never finished). The tempo phrases are graded as a band song from that downbeat, and the singer must be back on the
 * bar: the onset nearest the written re-entry within one beat (a hard rule), scored by how close.
 */
export function gradeCollaSong(item: VocalItem, frames: SungFrame[], plan: SongPlan, from: number, to: number, rejoin: number | null): SongResult & { follow: number; reentry: number | null } {
  const s = item.song!;
  const { split, free, tempo } = collaParts(plan, from, to, s.freeUntil ?? 1);
  const countAt = rejoin === null ? Infinity : rejoin - plan.meter * plan.beat;
  const r = gradeRubato(frames.filter((f) => f.t < countAt), free.map((n) => n.midi), free.map((n) => n.phrase), s.tol ?? 50);
  const freePh: PhraseScore[] = r.phrases.map((p) => ({ i: p.i, pitch: p.score, time: null, breath: 1, score: p.score, sung: p.reached, notes: p.notes }));
  let tempoPh: PhraseScore[];
  let feel: SongGrade['feel'] = null;
  let reentry: number | null = null;
  let tempoPitch: (number | null)[] = tempo.map(() => null);
  if (rejoin !== null) {
    const shifted = frames.filter((f) => f.t >= countAt).map((f) => ({ ...f, t: f.t - rejoin }));
    const g = gradeSongTake(shifted, plan, { fromBar: split, toBar: to, tol: s.tol, rhythm: s.rhythm, need: s.need });
    tempoPh = g.phrases;
    feel = g.feel;
    tempoPitch = g.notePitch;
    const on = [...voiceOnsets(shifted), ...pitchChanges(shifted)].sort((a, b) => a - b);
    reentry = tempo.length ? reentryOffset(on, tempo[0].start, plan.beat) : null;
  } else tempoPh = plan.phrases.filter((ph) => ph.fromBar >= split && ph.fromBar <= to).map((ph) => ({ i: ph.i, pitch: 0, time: s.rhythm ? 0 : null, breath: 0, score: 0, sung: 0, notes: ph.notes.length }));
  const phrases = [...freePh, ...tempoPh];
  const mean = phrases.length ? phrases.reduce((a, p) => a + p.score, 0) / phrases.length : 0;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const weakest = phrases.length ? phrases.reduce((w, p) => (p.score < w.score ? p : w), phrases[0]).i : 0;
  const notePitch = [...r.cents.map((c) => (c === null ? null : Math.abs(c) <= (s.tol ?? 50) ? 1 : 0)), ...tempoPitch];
  const song: SongGrade = { phrases, score: r3(phrases.some((p) => p.score < s.need) ? Math.min(mean, s.need - 0.01) : mean), mean: r3(mean), weakest, feel, drift: null, chorusDb: null, notePitch };
  if (r.follow === 0) return { grade: UNCLEAR, song, follow: 0, reentry };
  const beatMs = plan.beat * 1000;
  const back = reentry === null ? 0 : bandScore(reentry * 1000, [beatMs * 0.15, beatMs * 0.4, beatMs]);
  const base = finish([M('phrases', mean * 100, '%', mean, 4), M('follow', r.follow * 100, '%', reachScore(r.follow, 0.9), 2), M('reentry', reentry === null ? beatMs * 2 : reentry * 1000, 'ms', back, 2.5)], {});
  let score = Math.min(song.score, base.score);
  if (r.follow < 0.8 || reentry === null || Math.abs(reentry) > plan.beat) score = Math.min(score, s.need - 0.01);
  return { grade: { ...base, score: r3(score) }, song, follow: r.follow, reentry };
}

/** One section of a colla voce song: free (the band follows) or in time (the band's groove), bars inclusive. */
export interface CollaSection {
  free: boolean;
  fromBar: number;
  toBar: number;
  notes: PlanNote[];
}

/**
 * The sections of a colla voce item: free until `freeUntil`, then in time; with `again`, free once more from that
 * phrase and (with `until`) back in time at the end — free – tempo – free – tempo. Every section has at least one bar.
 */
export function collaSections(plan: SongPlan, from: number, to: number, freeUntil: number, again?: { from: number; until?: number }): CollaSection[] {
  const barOf = (i: number) => plan.phrases[Math.max(0, Math.min(i, plan.phrases.length - 1))].fromBar;
  const cuts = [from, Math.min(Math.max(barOf(Math.max(1, freeUntil)), from + 1), to + 1)];
  if (again && again.from < plan.phrases.length) {
    const b2 = Math.min(Math.max(barOf(again.from), cuts[1] + 1), to + 1);
    cuts.push(b2);
    if (again.until !== undefined && again.until < plan.phrases.length) cuts.push(Math.min(Math.max(barOf(again.until), b2 + 1), to + 1));
  }
  cuts.push(to + 1);
  const out: CollaSection[] = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const [a, b] = [cuts[k], cuts[k + 1] - 1];
    if (b < a) continue;
    out.push({ free: k % 2 === 0, fromBar: a, toBar: b, notes: plan.notes.filter((n) => n.bar >= a && n.bar <= b) });
  }
  return out;
}

/**
 * Colla voce with a free section in the middle (free – tempo – free – tempo): every free section graded without a
 * clock (the follower's path, each note reached in tune), every tempo section as a band song from its downbeat
 * (`rejoins[k]`, take clock s, null = never reached), and **back on the bar at every return to tempo** — the onset
 * nearest each written re-entry within one beat (a hard rule), scored by the worst of them.
 */
export function gradeCollaMulti(item: VocalItem, frames: SungFrame[], plan: SongPlan, from: number, to: number, rejoins: (number | null)[]): SongResult & { follow: number; reentry: number | null; reentries: (number | null)[] } {
  const s = item.song!;
  const secs = collaSections(plan, from, to, s.freeUntil ?? 1, s.freeAgain);
  const bar = plan.meter * plan.beat;
  const phrases: PhraseScore[] = [];
  const notePitch: (number | null)[] = [];
  const reentries: (number | null)[] = [];
  let reached = 0;
  let total = 0;
  let firstFollow = 0;
  let feel: SongGrade['feel'] = null;
  let open = -Infinity; // frames from here belong to the current section
  let broken = false; // a tempo section was never reached: what follows is not sung
  let t = 0; // tempo sections seen
  const zero = (sec: CollaSection) => {
    for (const ph of plan.phrases.filter((p) => p.fromBar >= sec.fromBar && p.fromBar <= sec.toBar)) phrases.push({ i: ph.i, pitch: 0, time: sec.free || !s.rhythm ? null : 0, breath: 0, score: 0, sung: 0, notes: ph.notes.length });
    notePitch.push(...sec.notes.map(() => null));
  };
  secs.forEach((sec, k) => {
    if (sec.free) {
      total += sec.notes.length;
      if (broken) return zero(sec);
      const next = secs[k + 1] ? rejoins[t] : undefined;
      const end = next === undefined ? Infinity : next === null ? Infinity : next - bar;
      const r = gradeRubato(frames.filter((f) => f.t >= open && f.t < end), sec.notes.map((n) => n.midi), sec.notes.map((n) => n.phrase), s.tol ?? 50);
      if (k === 0) firstFollow = r.follow;
      reached += Math.round(r.follow * sec.notes.length);
      phrases.push(...r.phrases.map((p) => ({ i: p.i, pitch: p.score, time: null, breath: 1, score: p.score, sung: p.reached, notes: p.notes })));
      notePitch.push(...r.cents.map((c) => (c === null ? null : Math.abs(c) <= (s.tol ?? 50) ? 1 : 0)));
      return;
    }
    const r = rejoins[t++] ?? null;
    if (broken || r === null) {
      broken = true;
      reentries.push(null);
      return zero(sec);
    }
    const len = (sec.toBar - sec.fromBar + 1) * bar;
    const shifted = frames.filter((f) => f.t >= r - bar && f.t < r + len).map((f) => ({ ...f, t: f.t - r }));
    const g = gradeSongTake(shifted, plan, { fromBar: sec.fromBar, toBar: sec.toBar, tol: s.tol, rhythm: s.rhythm, need: s.need });
    phrases.push(...g.phrases);
    notePitch.push(...g.notePitch);
    feel ??= g.feel;
    const on = [...voiceOnsets(shifted), ...pitchChanges(shifted)].sort((a, b) => a - b);
    reentries.push(sec.notes.length ? reentryOffset(on, sec.notes[0].start - sec.fromBar * bar, plan.beat) : null);
    open = r + len - 0.25 * plan.beat;
  });
  const follow = total ? Math.round((reached / total) * 1000) / 1000 : 0;
  const mean = phrases.length ? phrases.reduce((a, p) => a + p.score, 0) / phrases.length : 0;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const weakest = phrases.length ? phrases.reduce((w, p) => (p.score < w.score ? p : w), phrases[0]).i : 0;
  const song: SongGrade = { phrases, score: r3(phrases.some((p) => p.score < s.need) ? Math.min(mean, s.need - 0.01) : mean), mean: r3(mean), weakest, feel, drift: null, chorusDb: null, notePitch };
  // the worst return decides (a miss is the worst)
  const worst = reentries.length && reentries.every((x) => x !== null) ? reentries.reduce((a, b) => (Math.abs(b!) > Math.abs(a!) ? b : a)) : null;
  if (firstFollow === 0) return { grade: UNCLEAR, song, follow: 0, reentry: worst, reentries };
  const beatMs = plan.beat * 1000;
  const back = worst === null ? 0 : bandScore(worst * 1000, [beatMs * 0.15, beatMs * 0.4, beatMs]);
  const base = finish([M('phrases', mean * 100, '%', mean, 4), M('follow', follow * 100, '%', reachScore(follow, 0.9), 2), M('reentry', worst === null ? beatMs * 2 : worst * 1000, 'ms', back, 2.5)], {});
  let score = Math.min(song.score, base.score);
  if (follow < 0.8 || worst === null || Math.abs(worst) > plan.beat) score = Math.min(score, s.need - 0.01);
  return { grade: { ...base, score: r3(score) }, song, follow, reentry: worst, reentries };
}

/**
 * The simulator and tests: a colla voce song with any sections — free notes sung rubato (`slow` × written), each
 * rejoin found by the follower as live, tempo notes `late[k]` seconds off their downbeat; a free section after a tempo
 * one starts `gap` seconds after the tempo section's end.
 */
export function synthCollaSections(secs: CollaSection[], plan: SongPlan, o: { slow?: number; late?: number[]; cents?: number; gap?: number } = {}): { frames: SungFrame[]; rejoins: number[] } {
  const bar = plan.meter * plan.beat;
  const out: SungFrame[] = [];
  const rejoins: number[] = [];
  let t = 0.5;
  let tk = 0;
  secs.forEach((sec, k) => {
    if (sec.free) {
      const a = synthRubato(sec.notes.map((n) => n.midi), sec.notes.map((n) => n.dur * (o.slow ?? 1.15)), { cents: o.cents, t0: t });
      const fw = new Follower(sec.notes.map((n) => n.midi));
      for (const f of a) fw.push(f);
      const last = fw.matched.length ? fw.matched[fw.matched.length - 1].t : a.length ? a[a.length - 1].t : t;
      const lastBeats = sec.notes.length ? sec.notes[sec.notes.length - 1].dur / plan.beat : 1;
      if (secs[k + 1]) {
        const { count, downbeat } = rejoinAt(last, lastBeats, plan.beat, plan.meter);
        out.push(...a.filter((f) => f.t < count));
        for (let x = Math.max(count, (out[out.length - 1]?.t ?? count) + 0.01); x < downbeat; x += 0.01) out.push({ t: x, hz: null, confidence: 0, rms: 0.002 });
        rejoins.push(downbeat);
        t = downbeat;
      } else out.push(...a);
      return;
    }
    const late = o.late?.[tk++] ?? 0;
    const base = sec.fromBar * bar;
    const len = (sec.toBar - sec.fromBar + 1) * bar;
    for (let x = t; x < t + len; x += 0.01) {
      const n = sec.notes.find((m) => x >= t + late + m.start - base && x < t + late + m.start - base + m.dur);
      if (!n) {
        out.push({ t: x, hz: null, confidence: 0, rms: 0.002 });
        continue;
      }
      const dip = x - (t + late + n.start - base) < 0.03;
      out.push({ t: x, hz: midiToHz(n.midi + (o.cents ?? 0) / 100), confidence: dip ? 0.5 : 0.95, rms: dip ? 0.01 : 0.12 });
    }
    t += len + (o.gap ?? 0.4);
  });
  return { frames: out, rejoins };
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

// ---------------------------------------------------------------- P2 song rules (F14 L9–L10, F15 L3, F15 L7)

/** F14 L9: the phrases before `split` graded as written (time counts), the rest interpreted (no time grid, pitch only). */
function gradeSplitTake(frames: SungFrame[], plan: SongPlan, from: number, to: number, split: number, s: NonNullable<VocalItem['song']>): SongGrade {
  const ph = plan.phrases[split];
  if (!ph || ph.fromBar <= from || ph.fromBar > to) return gradeSongTake(frames, plan, { fromBar: from, toBar: to, tol: s.tol, rhythm: s.rhythm, need: s.need });
  const a = gradeSongTake(frames, plan, { fromBar: from, toBar: ph.fromBar - 1, tol: s.tol, rhythm: s.rhythm, need: s.need });
  const shift = (ph.fromBar - from) * plan.meter * plan.beat;
  const b = gradeSongTake(frames.map((f) => ({ ...f, t: f.t - shift })), plan, { fromBar: ph.fromBar, toBar: to, tol: s.tol ?? 60, rhythm: false, need: s.need - 0.1 });
  const phrases = [...a.phrases, ...b.phrases];
  const mean = phrases.length ? phrases.reduce((x, p) => x + p.score, 0) / phrases.length : 0;
  const capped = a.phrases.some((p) => p.score < s.need) || b.phrases.some((p) => p.score < s.need - 0.1) ? Math.min(mean, s.need - 0.01) : mean;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const weakest = phrases.length ? phrases.reduce((w, p) => (p.score < w.score ? p : w), phrases[0]).i : 0;
  return { ...a, phrases, score: r3(capped), mean: r3(mean), weakest, notePitch: [...a.notePitch, ...b.notePitch] };
}

/**
 * F15 L3, embellishing a head: the long notes (2 beats or more, and each phrase's last) still sung where they are
 * written (± half a beat), and at least 20 % more notes than written (neighbours, approaches, turns).
 */
export function embellishment(frames: SungFrame[], plan: SongPlan, from: number, to: number): { kept: number; added: number } {
  const { kept } = interpretation(frames, plan, from, to);
  const written = plan.notes.filter((n) => n.bar >= from && n.bar <= to).length;
  const sung = segmentNotes(frames, { minSec: 0.08 }).length;
  return { kept, added: written ? Math.max(0, (sung - written) / written) : 0 };
}

/**
 * F15 L7, bebop syllable phrasing: the swing ratio of the sung eighths, and the accent on the off-beats (the
 * "doo-BAH"): the median attack loudness of the notes that start on an off-beat minus that of the on-beat ones (dB).
 */
export function bopAccents(frames: SungFrame[], plan: SongPlan, from: number, to: number): { ratio: number; pairs: number; lift: number } {
  const beats = (to - from + 1) * plan.meter;
  const all = [...voiceOnsets(frames), ...pitchMoves(frames)].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.08);
  const sw = swingRatioOf(all, plan.beat, beats);
  const db = (r: number) => 20 * Math.log10(Math.max(1e-5, r));
  const offs: number[] = [];
  const downs: number[] = [];
  for (const n of segmentNotes(frames, { minSec: 0.08 })) {
    const b = n.start / plan.beat;
    const f = b - Math.floor(b);
    const xs = frames.filter((x) => x.t >= n.start && x.t <= Math.min(n.end, n.start + 0.12) && x.hz).map((x) => db(x.rms));
    if (xs.length < 2) continue;
    const peak = Math.max(...xs);
    if (f >= 0.4 && f <= 0.85) offs.push(peak);
    else if (f < 0.2 || f > 0.9) downs.push(peak);
  }
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
  const lift = offs.length >= 2 && downs.length >= 2 ? Math.round((med(offs) - med(downs)) * 10) / 10 : 0;
  return { ratio: sw.ratio, pairs: sw.pairs, lift };
}
/** Legato note changes as onsets (a sung eighth line is often one breath). */
function pitchMoves(frames: SungFrame[]): number[] {
  const out: number[] = [];
  let prev: number | null = null;
  let run = 0;
  let at = 0;
  for (const f of frames) {
    if (!f.hz || f.confidence < 0.75) {
      // a short dip (a consonant) keeps the last pitch: the next note is still a move
      run = 0;
      continue;
    }
    const m = Math.round(hzToMidi(f.hz));
    if (prev === null) {
      prev = m;
      continue;
    }
    if (m !== prev) {
      if (run === 0) at = f.t;
      run++;
      if (run >= 3) {
        out.push(at);
        prev = m;
        run = 0;
      }
    } else run = 0;
  }
  return out;
}

/**
 * F14 L10: a fall-off at the end of each sung phrase — the voice drops 150 ¢ or more under the phrase's last note
 * within 0.45 s of its written end (the jazz "fall"). Counted per phrase.
 */
export function phraseFalls(frames: SungFrame[], plan: SongPlan, from: number, to: number): { falls: number; phrases: number } {
  const base = from * plan.meter * plan.beat;
  let falls = 0;
  let n = 0;
  for (const ph of plan.phrases) {
    if (ph.toBar < from || ph.fromBar > to || !ph.notes.length) continue;
    const last = plan.notes[ph.notes[ph.notes.length - 1]];
    const end = last.start + last.dur - base;
    n++;
    const tail = frames.filter((f) => f.t >= end - 0.45 && f.t <= end + 0.4 && f.hz && f.confidence >= 0.7).map((f) => (hzToMidi(f.hz!) - last.midi) * 100);
    if (tail.length < 4) continue;
    const k = Math.round([...tail].sort((a, b) => a - b)[tail.length >> 1] / 1200) * 1200;
    if (Math.min(...tail.map((c) => c - k)) <= -150) falls++;
  }
  return { falls, phrases: n };
}

// ---------------------------------------------------------------- scat (F15)

export interface ScatResult {
  grade: TakeGrade;
  report?: ImprovReport;
  /** F15 L2: the developments heard (repeat, sequence, inversion, displaced, rhythm). */
  kinds?: string[];
  /** F15 L10: notes per singer turn. */
  turns?: number[];
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

/**
 * F15 L8: tensions placed on purpose — notes that start on a strong beat (1 or 3) over a dominant seventh and are its
 * 9th or 13th, or over a major seventh and are its ♯11. Counted per take (the level asks for three or more).
 */
export function tensionsOnStrongBeats(frames: SungFrame[], item: VocalItem, tonicPc: number): number {
  const sc = item.scat!;
  const beat = 60 / sc.bpm;
  const ch = scatChart(item, tonicPc);
  let n = 0;
  for (const note of segmentNotes(frames, { minSec: 0.09 })) {
    const b = note.start / beat;
    const near = Math.round(b);
    if (Math.abs(b - near) > 0.25 || near % 2 !== 0) continue;
    const c = chordAtBeat(ch.parsed, 4, near);
    if (!c) continue;
    const pc = ((Math.round(note.midi) % 12) + 12) % 12;
    const rel = (pc - c.root + 12) % 12;
    const dom = c.iv.includes(4) && c.iv.includes(10);
    const maj7 = c.iv.includes(4) && c.iv.includes(11);
    if ((dom && (rel === 2 || rel === 9)) || (maj7 && rel === 6)) n++;
  }
  return n;
}

export function gradeScat(item: VocalItem, frames: SungFrame[], tonicPc: number): ScatResult {
  const sc = item.scat!;
  const beat = 60 / sc.bpm;
  const ch = scatChart(item, tonicPc);
  if (frames.filter((f) => f.hz && f.confidence >= 0.8).length < 20) return { grade: UNCLEAR };
  if (sc.mode === 'motif') {
    const cell = motifCell(item, scatCentre(tonicPc, frames));
    const r = gradeMotif(cell, frames, beat, MOTIF_ANSWER_AT);
    return { grade: r.grade, kinds: r.kinds };
  }
  if (sc.mode === 'trade') {
    const turns = scatTurns(item);
    const centre = scatCentre(tonicPc, frames);
    const opening = tradeOpening(ch.pcsAt, centre, 0, (sc.turn ?? 4) * 4);
    const r = gradeTrade(frames, turns, ch.pcsAt, sc.bpm, [opening]);
    return { grade: r.grade, turns: r.turns };
  }
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
  // Tensions on strong beats are on purpose in L8: there the landing rule is the tensions' own count.
  const out: MetricScore[] = sc.mode === 'tensions' ? [M('landing', r.endsOnChordTone ? 100 : 0, '%', r.endsOnChordTone ? 1 : 0, 1.5)] : [M('landingTones', r.strongChordTones * 100, '%', reachScore(r.strongChordTones, 0.7), 3), M('landing', r.endsOnChordTone ? 100 : 0, '%', r.endsOnChordTone ? 1 : 0, 1.5)];
  if (sc.mode === 'approach') out.push(M('approach', r.chromaticApproaches * 100, '%', reachScore(r.chromaticApproaches, 0.4), 3));
  if (sc.mode === 'tensions') {
    const t = tensionsOnStrongBeats(frames, item, tonicPc);
    out.push(M('tensions', t, '%', reachScore(t, 3), 3));
  }
  out.push(M('coverage', r.notes, '%', reachScore(r.notes, ch.beats / 2), 0.5));
  return { grade: finish(out, {}), report: r };
}

// ---------------------------------------------------------------- F15 L2 motif, F15 L10 trading (shared with the take screen)

/** The motif cell is played in the first two bars; the singer answers from bar 3. */
export const MOTIF_ANSWER_AT = 8;

/** The pitch the app's lines sit around: the scat tonic in the singer's middle (the median of what was sung, else near C4). */
export function scatCentre(tonicPc: number, frames?: SungFrame[], fallback?: number): number {
  const ref = fallback ?? 60;
  const base = ref - 6 + (((tonicPc - (ref - 6)) % 12) + 12) % 12;
  const ms = (frames ?? []).filter((f) => f.hz && f.confidence >= 0.8).map((f) => hzToMidi(f.hz!));
  if (ms.length < 20) return base;
  const mid = [...ms].sort((a, b) => a - b)[ms.length >> 1];
  return base + Math.round((mid - base) / 12) * 12;
}

/** The motif cell of an item as notes (beats from the take's first bar). */
export function motifCell(item: VocalItem, centre: number): PNote[] {
  return (item.scat?.cell ?? []).map(([beat, st, dur]) => ({ beat, dur, midi: centre + st }));
}

/** The turns of a trading item (app first). */
export function scatTurns(item: VocalItem): TradeTurn[] {
  const sc = item.scat!;
  const bars = parseChart(sc.chart, 4).bars * (sc.loops ?? 1);
  return tradeTurns(bars, sc.turn ?? 4);
}
