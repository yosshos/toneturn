// The voice course, second build (VOICE_CURRICULUM "Not built yet" → P2): quarter tones (F2 L7), a motif developed
// in scat (F15 L2), trading twos and fours with the band (F15 L10), the colla voce follower (F14 L6) and the
// sung-minutes rest reminder. Pure and deterministic; the UI feeds frames on the take's clock.
//
// Honest limits: a quarter tone is 50 ¢, so each note must be sung on its own syllable (a legato slide between
// neighbours a quarter tone apart cannot be split reliably); the follower hears only pitch, never words.

import type { SungFrame } from './sing';
import { hzToMidi, midiToHz } from './pitch';
import { segmentNotes } from './memory';
import { bandScore, finish, M, reachScore, UNCLEAR, type MetricScore, type TakeGrade } from './vocal';
import { motifReturns, developmentScore, tradeAnswer, type PNote, type Transform } from './improvPhrasing';
import { improvReportBy } from './perform';
import { voiceOnsets } from './voiceTime';

const fold = (c: number) => ((((c + 600) % 1200) + 1200) % 1200) - 600;
const voiced = (f: SungFrame) => !!f.hz && f.confidence >= 0.8 && f.hz > 55 && f.hz < 1400;
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- F2 L7: quarter tones and chromatic neighbours

/**
 * Detached notes against fractional targets (a quarter tone = 0.5 semitone). Notes are split at short silences and
 * at pitch moves of a third of a semitone or more; each target takes the next note within ±90 ¢ (three ahead at most).
 */
export function microNotes(frames: SungFrame[], targets: number[]): { cents: (number | null)[]; hit: number; meanAbs: number } {
  const segs = segmentNotes(frames, { jump: 0.33, minSec: 0.15, hold: 4 });
  const cents: (number | null)[] = [];
  let j = 0;
  for (const tg of targets) {
    let found = -1;
    for (let k = j; k < Math.min(segs.length, j + 3); k++) {
      if (Math.abs(fold((segs[k].midi - tg) * 100)) <= 90) {
        found = k;
        break;
      }
    }
    if (found < 0) {
      cents.push(null);
      continue;
    }
    cents.push(Math.round(fold((segs[found].midi - tg) * 100)));
    j = found + 1;
  }
  const got = cents.filter((c): c is number => c !== null);
  return { cents, hit: got.filter((c) => Math.abs(c) <= 25).length / Math.max(1, targets.length), meanAbs: Math.round(mean(got.map(Math.abs))) };
}

/** F2 L7 grade: the notes that sit between the piano keys (and their neighbours) within 15 ¢ on average. */
export function gradeMicro(frames: SungFrame[], targets: number[]): TakeGrade {
  if (frames.filter(voiced).length < 20) return UNCLEAR;
  const m = microNotes(frames, targets);
  const frac = targets.map((t, i) => (Math.abs(t - Math.round(t)) > 0.2 ? m.cents[i] : undefined)).filter((c): c is number | null => c !== undefined);
  const fracGot = frac.filter((c): c is number => c !== null);
  const fracAbs = fracGot.length ? Math.round(mean(fracGot.map(Math.abs))) : m.meanAbs;
  const out: MetricScore[] = [
    M('hit', m.hit * 100, '%', reachScore(m.hit, 0.8), 2),
    M('intonation', fracAbs, '¢', fracGot.length || !frac.length ? bandScore(fracAbs, [10, 15, 30]) : 0, 3),
  ];
  const g = finish(out, {});
  return { ...g, score: r3(g.score * (0.4 + 0.6 * Math.min(1, m.hit / 0.8))) };
}

/** A clean detached take of fractional targets (the simulator, tests). */
export function synthDetached(targets: number[], o: { noteSec?: number; gap?: number; cents?: number; t0?: number } = {}): SungFrame[] {
  const { noteSec = 0.6, gap = 0.12, cents = 0, t0 = 0.3 } = o;
  const out: SungFrame[] = [];
  let t = t0;
  for (const m of targets) {
    for (let k = 0; k < Math.round(noteSec * 50); k++, t += 0.02) out.push({ t, hz: midiToHz(m + cents / 100), confidence: 0.95, rms: 0.09 });
    for (let k = 0; k < Math.round(gap * 50); k++, t += 0.02) out.push({ t, hz: null, confidence: 0, rms: 0.002 });
  }
  return out;
}

// ---------------------------------------------------------------- sung notes as a line in beats

/** Sung notes between two clock times as PNotes (beats from `fromSec`), onsets quantized to the eighth (swung or straight). */
export function sungLine(frames: SungFrame[], beatSec: number, fromSec: number, toSec = Infinity): PNote[] {
  const fs = frames.filter((f) => f.t >= fromSec - 0.08 && f.t < toSec + 0.05);
  return segmentNotes(fs, { minSec: 0.09 }).map((n) => {
    const b = (n.start - fromSec) / beatSec;
    // A swung eighth (2/3) and a straight one (1/2) are the same written eighth.
    const q = Math.max(0, Math.round(b * 2) / 2);
    return { beat: q, dur: Math.max(0.5, Math.round(((n.end - n.start) / beatSec) * 2) / 2), midi: Math.round(n.midi) };
  });
}

/** Move a sung line by octaves so its middle sits nearest the reference pitch (a low voice singing a cell an octave down). */
export function nearOctave(line: PNote[], ref: number): PNote[] {
  if (!line.length) return line;
  const mid = median(line.map((n) => n.midi));
  const k = Math.round((ref - mid) / 12) * 12;
  return line.map((n) => ({ ...n, midi: n.midi + k }));
}

// ---------------------------------------------------------------- F15 L2: develop a motif

export interface MotifResult {
  grade: TakeGrade;
  kinds: Transform[];
}

/**
 * The given three-note cell (beats from the take's start) and what the singer did with it after `answerAt` beats:
 * its returns — repeated, sequenced, inverted, displaced, rhythm kept — found by `motifReturns` with the cell as the
 * motif. Two different developments pass (Trinity "motivic").
 */
export function gradeMotif(cell: PNote[], frames: SungFrame[], beatSec: number, answerAt: number): MotifResult {
  const line = nearOctave(sungLine(frames, beatSec, answerAt * beatSec).map((n) => ({ ...n, beat: n.beat + answerAt })), median(cell.map((n) => n.midi)));
  if (line.length < 3) return { grade: UNCLEAR, kinds: [] };
  const all = [...cell, ...line].sort((a, b) => a.beat - b.beat);
  const r = motifReturns(all, cell.length);
  const kinds = [...new Set(r.returns.map((x) => x.how))];
  const out: MetricScore[] = [
    M('develop', kinds.length, '%', kinds.length >= 2 ? 1 : kinds.length === 1 ? 0.5 : 0, 3),
    M('motif', Math.round(developmentScore(r.returns) * 100), '%', developmentScore(r.returns), 1.5),
    M('coverage', line.length, '%', reachScore(line.length, 6), 1),
  ];
  const g = finish(out, {});
  return { grade: { ...g, score: r3(g.score * (0.4 + 0.6 * out[0].score)) }, kinds };
}

// ---------------------------------------------------------------- F15 L10: trading twos and fours

export interface TradeTurn {
  who: 'app' | 'you';
  /** Beats from the first bar (after the count-in). */
  from: number;
  to: number;
}

/** Alternate turns of `turnBars` over `bars` bars of 4/4, the app first. */
export function tradeTurns(bars: number, turnBars: number): TradeTurn[] {
  const out: TradeTurn[] = [];
  for (let b = 0, k = 0; b + turnBars <= bars; b += turnBars, k++) out.push({ who: k % 2 === 0 ? 'app' : 'you', from: b * 4, to: (b + turnBars) * 4 });
  return out;
}

/** The app's opening line of a turn: eighths walking the chord tones near `centre`, a long note to end (beats from the turn). */
export function tradeOpening(pcsAt: (beat: number) => number[], centre: number, from: number, turnBeats: number): PNote[] {
  const out: PNote[] = [];
  let last = centre;
  for (let b = 0; b < turnBeats - 2; b += 0.5) {
    const pcs = pcsAt(from + Math.floor(b));
    if (!pcs.length) continue;
    // The nearest chord tone above (on the way up for the first half of each bar), below after.
    const up = Math.floor(b) % 4 < 2;
    const cands = pcs.flatMap((pc) => [-12, 0, 12].map((o) => centre - 6 + (((pc - (centre - 6)) % 12) + 12) % 12 + o));
    const next = cands.filter((m) => (up ? m > last : m < last)).sort((a, c) => Math.abs(a - last) - Math.abs(c - last))[0] ?? last;
    last = Math.max(centre - 7, Math.min(centre + 9, next));
    out.push({ beat: b, dur: 0.5, midi: last });
  }
  const end = pcsAt(from + turnBeats - 2);
  if (end.length) out.push({ beat: turnBeats - 2, dur: 1.5, midi: centre - 6 + (((end[0] - (centre - 6)) % 12) + 12) % 12 });
  return out;
}

/** The app's reply to the singer's turn: their opening cell developed (sequenced, inverted) inside the turn (beats from the turn). */
export function tradeReply(sung: PNote[], centre: number, turnBeats: number, fallback: () => PNote[]): PNote[] {
  if (sung.length < 2) return fallback();
  const t0 = sung[0].beat;
  const rel = sung.map((n) => ({ ...n, beat: n.beat - t0 }));
  return tradeAnswer(rel, centre - 12, 0).filter((n) => n.beat < turnBeats - 0.5).map((n) => ({ ...n, dur: Math.min(n.dur, turnBeats - n.beat - 0.25) }));
}

export interface TradeResult {
  grade: TakeGrade;
  /** Per singer turn: notes sung. */
  turns: number[];
}

/**
 * The singer's turns: chord tones on the strong beats (`improvReportBy`), onsets on the swung-eighth grid, every
 * turn used (three notes or more — trading is not laying out), and an idea that returns (a motif repeated,
 * sequenced or displaced across the turns, or the app's cell picked up).
 */
export function gradeTrade(frames: SungFrame[], turns: TradeTurn[], pcsAt: (beat: number) => number[], bpm: number, appCells: PNote[][] = []): TradeResult {
  const beat = 60 / bpm;
  const mine = turns.filter((t) => t.who === 'you');
  const inMine = (t: number) => mine.some((x) => t >= x.from * beat - 0.1 && t < x.to * beat + 0.1);
  const fs = frames.filter((f) => inMine(f.t));
  if (fs.filter(voiced).length < 20) return { grade: UNCLEAR, turns: mine.map(() => 0) };
  const perTurn = mine.map((x) => segmentNotes(frames.filter((f) => f.t >= x.from * beat - 0.1 && f.t < x.to * beat + 0.1), { minSec: 0.09 }).length);
  const r = improvReportBy(fs, pcsAt, bpm);
  // Onsets against the swung-eighth grid (the downbeat, or two thirds into the beat).
  const offs = voiceOnsets(fs).map((t) => {
    const b = t / beat;
    const f = b - Math.floor(b);
    return Math.min(f, Math.abs(f - 2 / 3), 1 - f) * beat * 1000;
  });
  const offMs = offs.length ? Math.round(mean(offs)) : 999;
  const used = perTurn.filter((n) => n >= 3).length / Math.max(1, mine.length);
  const line = sungLine(fs, beat, 0);
  const ret = motifReturns(line, 3).returns;
  const ints = (ns: PNote[]) => ns.slice(1).map((n, i) => n.midi - ns[i].midi).join(',');
  const picked = appCells.some((c) => c.length >= 3 && line.some((_, i) => i + 3 <= line.length && ints(line.slice(i, i + 3)) === ints(c.slice(0, 3))));
  const motif = Math.min(1, developmentScore(ret) + (picked ? 0.5 : 0));
  const out: MetricScore[] = [
    M('landingTones', r.strongChordTones * 100, '%', reachScore(r.strongChordTones, 0.6), 3),
    M('onset', offMs, 'ms', bandScore(offMs, [40, 70, 120]), 2),
    M('coverage', used * 100, '%', used, 1.5),
    M('motif', Math.round(motif * 100), '%', motif, 1.5),
  ];
  return { grade: finish(out, {}), turns: perTurn };
}

/** A simulated singer's turns: the app's last idea sequenced, landing on chord tones (the simulator, tests). */
export function synthTrade(turns: TradeTurn[], pcsAt: (beat: number) => number[], bpm: number, centre: number): SungFrame[] {
  const beat = 60 / bpm;
  const out: SungFrame[] = [];
  const notes: { midi: number; start: number; dur: number }[] = [];
  for (const t of turns.filter((x) => x.who === 'you')) {
    for (let b = t.from; b < t.to - 1; b += 2) {
      const pcs = pcsAt(b);
      const cell = [0, 1, 2].map((k) => centre - 6 + (((pcs[k % pcs.length] - (centre - 6)) % 12) + 12) % 12);
      cell.forEach((m, k) => notes.push({ midi: m, start: (b + k * (2 / 3)) * beat, dur: beat * 0.5 }));
    }
  }
  const end = notes.length ? notes[notes.length - 1].start + 1 : 1;
  for (let t = 0; t <= end; t += 0.02) {
    const n = notes.find((x) => t >= x.start && t < x.start + x.dur);
    out.push(n ? { t, hz: midiToHz(n.midi), confidence: 0.95, rms: 0.1 } : { t, hz: null, confidence: 0, rms: 0.002 });
  }
  return out;
}

// ---------------------------------------------------------------- F14 L6: colla voce, the band follows the singer

/**
 * Follows a sung melody by pitch, without a clock: the next note is "reached" when the voice sits within ±70 ¢ of it
 * (octave-folded) for three frames — after a fresh attack when it repeats the previous pitch. A note skipped by the
 * singer is passed when the one after it is held for five frames. Used live (the band changes chords) and to grade.
 */
export class Follower {
  k = 0;
  private stable = 0;
  private stableAt = 0;
  private skip = 0;
  private skipAt = 0;
  private attack = true;
  private quiet = 0;
  private lastT = -1;
  private dbs: { t: number; db: number }[] = [];
  readonly matched: { k: number; t: number }[] = [];
  constructor(private readonly targets: number[]) {}
  get done() {
    return this.k >= this.targets.length;
  }
  /** Feed one frame; returns the index of the note reached on this frame, or null. */
  push(f: SungFrame): number | null {
    const dt = this.lastT < 0 ? 0.02 : Math.max(0, f.t - this.lastT);
    this.lastT = f.t;
    const db = 20 * Math.log10(Math.max(1e-5, f.rms));
    this.dbs.push({ t: f.t, db });
    while (this.dbs.length && f.t - this.dbs[0].t > 0.12) this.dbs.shift();
    if (!voiced(f)) {
      this.quiet += dt;
      if (this.quiet >= 0.06) this.attack = true;
      this.stable = 0;
      this.skip = 0;
      return null;
    }
    this.quiet = 0;
    if (db - Math.min(...this.dbs.map((x) => x.db)) >= 8) this.attack = true;
    if (this.done) return null;
    const m = hzToMidi(f.hz!);
    const near = (i: number) => i < this.targets.length && Math.abs(fold((m - this.targets[i]) * 100)) <= 70;
    const repeat = this.k > 0 && Math.abs(this.targets[this.k] - this.targets[this.k - 1]) < 0.5;
    if (near(this.k) && (!repeat || this.attack)) {
      if (this.stable === 0) this.stableAt = f.t;
      this.stable++;
    } else this.stable = 0;
    // A skipped note: the one after it is held — but not while the voice is still on the note just reached.
    const onPrev = this.k > 0 && Math.abs(fold((m - this.targets[this.k - 1]) * 100)) <= 70;
    if (!near(this.k) && !onPrev && near(this.k + 1) && Math.abs(this.targets[this.k + 1] - this.targets[this.k]) >= 0.5) {
      if (this.skip === 0) this.skipAt = f.t;
      this.skip++;
    } else this.skip = 0;
    let hit: number | null = null;
    if (this.stable >= 3) hit = this.k;
    else if (this.skip >= 5) {
      this.k++;
      this.stableAt = this.skipAt;
      hit = this.k;
    }
    if (hit === null) return null;
    this.matched.push({ k: hit, t: this.stableAt });
    this.k = hit + 1;
    this.stable = 0;
    this.skip = 0;
    // A repeated pitch needs a fresh attack after this point (the rise that started this note does not count again).
    this.attack = false;
    this.dbs = [{ t: f.t, db }];
    return hit;
  }
}

export interface RubatoGrade {
  /** Per phrase: share of its notes reached and in tune (±tol), 0..1. */
  phrases: { i: number; score: number; reached: number; notes: number }[];
  /** Notes reached / notes. */
  follow: number;
  /** Per note: median cents from its reach to the next (null = not reached). */
  cents: (number | null)[];
}

/** A colla voce take, graded without a clock: the follower's path through the melody, each reached note's tuning. */
export function gradeRubato(frames: SungFrame[], targets: number[], phraseOf: number[], tol = 50): RubatoGrade {
  const fw = new Follower(targets);
  for (const f of frames) fw.push(f);
  const at = new Map(fw.matched.map((x) => [x.k, x.t]));
  const times = fw.matched.map((x) => x.t);
  const cents = targets.map((tg, k) => {
    const a = at.get(k);
    if (a === undefined) return null;
    const b = times.find((t) => t > a + 0.05) ?? a + 1.5;
    const cs = frames.filter((f) => f.t >= a && f.t < b - 0.03 && voiced(f)).map((f) => fold((hzToMidi(f.hz!) - tg) * 100));
    return cs.length >= 3 ? Math.round(median(cs)) : null;
  });
  const ids = [...new Set(phraseOf)];
  const phrases = ids.map((i) => {
    const ks = targets.map((_, k) => k).filter((k) => phraseOf[k] === i);
    const ok = ks.filter((k) => cents[k] !== null && Math.abs(cents[k]!) <= tol).length;
    return { i, score: r3(ok / Math.max(1, ks.length)), reached: ks.filter((k) => at.has(k)).length, notes: ks.length };
  });
  return { phrases, follow: r3(fw.matched.length / Math.max(1, targets.length)), cents };
}

/** A free-tempo sung melody (a ballad sung rubato): each note its own length, a dip between notes (the simulator, tests). */
export function synthRubato(targets: number[], secs: number[], o: { cents?: number; t0?: number } = {}): SungFrame[] {
  const out: SungFrame[] = [];
  let t = o.t0 ?? 0.5;
  targets.forEach((m, i) => {
    const n = Math.round((secs[i] ?? 0.8) * 50);
    for (let k = 0; k < n; k++, t += 0.02) {
      const dip = k < 2;
      out.push({ t, hz: midiToHz(m + (o.cents ?? 0) / 100), confidence: dip ? 0.5 : 0.95, rms: dip ? 0.005 : 0.1 });
    }
  });
  return out;
}

// ---------------------------------------------------------------- the sung-minutes rest reminder (vocal health)

export interface RestTake {
  at: string;
  /** Seconds sung (the item's length). */
  secs: number;
  /** The hold stability metric of the take (¢), when it has one. */
  stability?: number;
}

/**
 * Sung minutes today, and whether a break is due: after about 30 minutes, or when the voice tires inside one
 * session (the last three takes' stability ≥ 8 ¢ worse than the first three, within the last hour). A reminder,
 * never a score.
 */
export function restAdvice(takes: RestTake[], now: Date): { minutes: number; tired: boolean; suggest: boolean } {
  const day = now.toISOString().slice(0, 10);
  const today = takes.filter((t) => t.at.slice(0, 10) === day);
  const minutes = Math.round(today.reduce((a, t) => a + t.secs, 0) / 60);
  const hour = today.filter((t) => now.getTime() - new Date(t.at).getTime() <= 3600_000 && t.stability !== undefined).sort((a, b) => a.at.localeCompare(b.at));
  let tired = false;
  if (hour.length >= 6) {
    const first = mean(hour.slice(0, 3).map((t) => t.stability!));
    const last = mean(hour.slice(-3).map((t) => t.stability!));
    tired = last - first >= 8;
  }
  return { minutes, tired, suggest: minutes >= 30 || tired };
}
