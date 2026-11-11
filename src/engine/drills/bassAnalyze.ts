// Bass measures (BASS_CURRICULUM §4, §10.3): small pure functions on what the take analysis already has — onset
// times, per-note timing offsets, strings, loudness peaks and RMS frames. Each one feeds a pass rule in BassGoal and
// can only lower a verdict (guitarAnalyze.ts). Thresholds marked ⚙ are research starting points to calibrate.

import type { GFrame } from './guitarAnalyze';
import type { TakeRules } from './types';

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const db = (x: number): number => 20 * Math.log10(Math.max(1e-6, x));

/**
 * Odd / even asymmetry (stand-in for finger or pick alternation): the mean IOI after odd vs after even notes, and the
 * mean loudness of odd vs even notes. Long gaps (> 1.5 × the median IOI: rests, the last note) are left out.
 * Null with fewer than 6 notes.
 */
export function oddEvenAsym(onsets: number[], loud?: number[], idx?: number[]): { ms: number; db: number | null } | null {
  if (onsets.length < 6) return null;
  // Parity from the EXPECTED note index when given (A10): an extra or missed onset no longer swaps the fingers for the
  // rest of the take. Only IOIs between consecutive expected notes count.
  const ix = idx && idx.length === onsets.length ? idx : onsets.map((_, i) => i);
  const iois = onsets.slice(1).map((t, i) => t - onsets[i]);
  const med = median(iois);
  const ev: number[] = [];
  const od: number[] = [];
  iois.forEach((x, i) => {
    if (x <= 0 || x > 1.5 * med || ix[i + 1] !== ix[i] + 1) return;
    (ix[i] % 2 ? od : ev).push(x);
  });
  if (ev.length < 2 || od.length < 2) return null;
  let d: number | null = null;
  if (loud && loud.length === onsets.length && loud.every((x) => x > 0)) {
    const le = loud.filter((_, i) => ix[i] % 2 === 0).map(db);
    const lo = loud.filter((_, i) => ix[i] % 2 === 1).map(db);
    if (le.length && lo.length) d = Math.abs(mean(le) - mean(lo));
  }
  return { ms: Math.abs(mean(ev) - mean(od)), db: d };
}

/** Loudness spread in dB (SD of the per-note peak level); null with fewer than 4 notes. */
export function loudSdDb(loud: number[]): number | null {
  const xs = loud.filter((x) => x > 0).map(db);
  if (xs.length < 4) return null;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/**
 * String-crossing penalty: mean |timing offset| on notes that change string minus the same on notes that stay on
 * the string (an inefficient plucking hand shows up as late / early crossings). Null without crossings. When every
 * note crosses (open strings, one per string: A10) the baseline is the take's median |offset| instead, so spikes on
 * some crossings still show.
 */
export function crossingPenalty(devs: (number | null)[], strings: (number | undefined)[]): number | null {
  const cross: number[] = [];
  const same: number[] = [];
  devs.forEach((d, i) => {
    if (i === 0 || d === null || strings[i] === undefined || strings[i - 1] === undefined) return;
    (strings[i] !== strings[i - 1] ? cross : same).push(Math.abs(d));
  });
  if (!cross.length) return null;
  if (!same.length) {
    const all = devs.filter((d): d is number => d !== null).map(Math.abs);
    return cross.length >= 4 ? Math.max(0, mean(cross) - median(all)) : null;
  }
  return mean(cross) - mean(same);
}

/**
 * Lock with the kick: the share of kick hits with a bass onset within ±tol ms, and the bass onsets near no kick
 * (stray notes). Both lists in ms.
 */
export function kickLock(kicks: number[], onsets: number[], tolMs = 25): { lock: number; stray: number } {
  if (!kicks.length) return { lock: 0, stray: onsets.length };
  const near = (t: number, xs: number[]) => xs.some((x) => Math.abs(x - t) <= tolMs);
  const lock = kicks.filter((k) => near(k, onsets)).length / kicks.length;
  const stray = onsets.filter((o) => !near(o, kicks)).length;
  return { lock, stray };
}

/** When a note stops: the first frame after the onset whose RMS falls under `floor` × the note's peak (else `until`). */
export function releaseTime(frames: GFrame[], onMs: number, untilMs: number, floor = 0.2): number {
  const win = frames.filter((f) => f.t >= onMs && f.t <= untilMs);
  if (!win.length) return untilMs - onMs;
  const pk = Math.max(...win.filter((f) => f.t <= onMs + 60).map((f) => f.rms), 0);
  if (pk <= 0) return 0;
  const end = win.find((f) => f.t > onMs + 30 && f.rms < floor * pk);
  return (end ? end.t : untilMs) - onMs;
}

/** A written note's length class: short (staccato / clipped: under 60 % of the time to the next note) or full. */
export const lengthClass = (durBeats: number, gapBeats: number): 'short' | 'full' => (durBeats < 0.6 * gapBeats ? 'short' : 'full');

/**
 * Share of notes whose sounded length (release ÷ time to the next note) is in the written class: ⚙ short ≤ 0.6,
 * full ≥ 0.75. Null when nothing could be measured.
 */
export function lengthMatch(notes: { want: 'short' | 'full'; ratio: number }[]): number | null {
  if (!notes.length) return null;
  return notes.filter((n) => (n.want === 'short' ? n.ratio <= 0.6 : n.ratio >= 0.75)).length / notes.length;
}

/** How much quieter the ghost notes are than the pitched ones (dB, median vs median); null without both. */
export function ghostGapDb(ghost: number[], pitched: number[]): number | null {
  const g = ghost.filter((x) => x > 0);
  const p = pitched.filter((x) => x > 0);
  if (!g.length || !p.length) return null;
  return db(median(p)) - db(median(g));
}

// ───────────────────────────── 0.64 measures (BASS_AUDIT A6–A13) ─────────────────────────────

const pc = (n: number): number => ((n % 12) + 12) % 12;
const sdOf = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
/** Frame spacing (ms), for turning frame counts into durations. */
const stepOf = (frames: GFrame[]): number => (frames.length > 1 ? Math.max(1, (frames[frames.length - 1].t - frames[0].t) / (frames.length - 1)) : 10);
const peakNear = (frames: GFrame[], t0: number, ms = 60): number => Math.max(0, ...frames.filter((f) => f.t >= t0 && f.t <= t0 + ms).map((f) => f.rms));
const midiOfHz = (hz: number): number => 69 + 12 * Math.log2(hz / 440);

/**
 * Pocket on purpose (A6): the share of notes whose offset lies within ±win ms of their section's target
 * (sections = equal parts of the take; + = behind the beat). Null without offsets.
 */
export function pocketShare(pts: { beat: number; dev: number }[], targets: number[], totalBeats: number, win = 12): { share: number; means: number[] } | null {
  if (!pts.length || !targets.length) return null;
  const n = targets.length;
  const secOf = (b: number) => Math.min(n - 1, Math.max(0, Math.floor((b / Math.max(1e-6, totalBeats)) * n)));
  const by: number[][] = targets.map(() => []);
  let hit = 0;
  for (const p of pts) {
    const s = secOf(p.beat);
    by[s].push(p.dev);
    if (Math.abs(p.dev - targets[s]) <= win) hit++;
  }
  return { share: hit / pts.length, means: by.map((xs) => (xs.length ? mean(xs) : NaN)) };
}

/**
 * Shift gap (A8): silence before shifted notes (ms), mean over the shifts. With frames: the time between the previous
 * onset (+30 ms) and the shifted onset with RMS under `floor` × the previous note's peak. Without frames (MIDI): the
 * shifted onset − the previous note-off. Null when nothing could be measured.
 */
export function shiftGap(pairs: { prevOn: number; on: number; prevOff?: number | null }[], frames: GFrame[] = [], floor = 0.1): number | null {
  const gaps: number[] = [];
  const step = stepOf(frames);
  for (const p of pairs) {
    if (p.on <= p.prevOn) continue;
    if (frames.length) {
      const pk = peakNear(frames, p.prevOn);
      if (pk <= 0) continue;
      gaps.push(frames.filter((f) => f.t > p.prevOn + 30 && f.t < p.on && f.rms < floor * pk).length * step);
    } else if (p.prevOff !== undefined && p.prevOff !== null) gaps.push(Math.max(0, p.on - p.prevOff));
  }
  return gaps.length ? mean(gaps) : null;
}

/**
 * Stamina drift (A8): IOI evenness of the last `bars` bars against the first (played ÷ written IOI, CV), as a ratio of
 * change: (CV last − CV first) / max(CV first, 0.03). + = less even at the end. Null on takes shorter than 2 × bars.
 */
export function ioiDrift(pts: { beat: number; on: number }[], meter: number, bars = 2): number | null {
  const s = [...pts].sort((a, b) => a.beat - b.beat);
  if (s.length < 6) return null;
  const end = s[s.length - 1].beat;
  const span = bars * meter;
  if (end < 2 * span - 1e-6) return null;
  const cv = (w: typeof s): number | null => {
    const rs: number[] = [];
    for (let i = 1; i < w.length; i++) {
      const db = w[i].beat - w[i - 1].beat;
      if (db > 1e-6) rs.push((w[i].on - w[i - 1].on) / db);
    }
    if (rs.length < 3) return null;
    const m = mean(rs);
    return m > 0 ? sdOf(rs) / m : null;
  };
  const a = cv(s.filter((p) => p.beat < span - 1e-6));
  const b = cv(s.filter((p) => p.beat > end - span + 1e-6));
  if (a === null || b === null) return null;
  return (b - a) / Math.max(a, 0.03);
}

/**
 * Tempo drift with a sparse click (time L6, one click a bar): the least-squares slope of the timing offset (ms) per
 * bar — + = dragging, − = rushing. Null with fewer than 6 notes or under 2 bars.
 */
export function barDrift(pts: { beat: number; dev: number }[], meter: number): number | null {
  if (pts.length < 6) return null;
  const xs = pts.map((p) => p.beat / meter);
  if (Math.max(...xs) - Math.min(...xs) < 2 - 1e-6) return null;
  const mx = mean(xs);
  const my = mean(pts.map((p) => p.dev));
  let num = 0;
  let den = 0;
  pts.forEach((p, i) => {
    num += (xs[i] - mx) * (p.dev - my);
    den += (xs[i] - mx) ** 2;
  });
  return den > 0 ? num / den : null;
}

/**
 * Landing after the drummer's fills (pocket L8, B5): for each fill bar, the |offset| (ms) of the note played on the
 * downbeat after it (Infinity when nothing was played there; fills after the last bar are skipped).
 */
export function fillLandings(fills: number[], meter: number, beats: number, pts: { beat: number; dev: number }[]): number[] {
  return fills
    .map((f) => (f + 1) * meter)
    .filter((b) => b <= beats + 1e-6)
    .map((b) => {
      const p = pts.find((x) => Math.abs(x.beat - b) < 1e-6);
      return p ? Math.abs(p.dev) : Infinity;
    });
}

/**
 * Swing ratio (A8): long ÷ short of each swung pair (8ths: per beat; 16ths: per half beat), median. 1 = straight,
 * 2 = triplet swing. Null with fewer than 3 measurable pairs.
 */
export function swingRatio(pts: { beat: number; on: number }[], sub: 8 | 16): number | null {
  const unit = sub === 8 ? 1 : 0.5;
  const at = new Map<number, number>();
  for (const p of pts) at.set(Math.round(p.beat * 48), p.on);
  const rs: number[] = [];
  for (const p of pts) {
    const k = p.beat / unit;
    if (Math.abs(k - Math.round(k)) > 1e-3) continue;
    const next = at.get(Math.round((p.beat + unit) * 48));
    if (next === undefined) continue;
    const off = pts.find((q) => q.beat > p.beat + 0.4 * unit && q.beat < p.beat + 0.8 * unit);
    if (!off || off.on <= p.on || next <= off.on) continue;
    rs.push((off.on - p.on) / (next - off.on));
  }
  return rs.length >= 3 ? median(rs) : null;
}

/** Per-subdivision bias (A8): mean offset (ms) on the beat / 8th off-beats / 16ths / triplets, each with ≥ min notes. */
export function subBias(pts: { beat: number; dev: number }[], min = 3): Record<string, number> {
  const subOf = (beat: number) => {
    const f = beat - Math.floor(beat + 1e-6);
    return Math.abs(f) < 0.05 ? 'beat' : Math.abs(f - 0.5) < 0.05 ? '8' : Math.abs(f - 1 / 3) < 0.06 || Math.abs(f - 2 / 3) < 0.06 ? 'trip' : '16';
  };
  const by: Record<string, number[]> = {};
  for (const p of pts) (by[subOf(p.beat)] ??= []).push(p.dev);
  return Object.fromEntries(Object.entries(by).filter(([, xs]) => xs.length >= min).map(([k, xs]) => [k, mean(xs)]));
}

/**
 * Ring-through on written rests (A9). Mic: a rest rings when ≥ half of its frames are still loud (≥ floor × the
 * previous note's peak) or carry the previous pitch / an open-string pitch class. MIDI: the previous note-off falls
 * after the middle of the rest. Returns how many rests were judged and how many rang.
 */
export function ringThrough(rests: { from: number; to: number; prevOn: number; prevPitch: number; prevOff?: number | null }[], frames: GFrame[] = [], openPcs: number[] = [], floor = 0.25): { rests: number; rang: number } {
  let judged = 0;
  let rang = 0;
  for (const r of rests) {
    if (r.to - r.from < 60) continue;
    if (frames.length) {
      const pk = peakNear(frames, r.prevOn);
      const win = frames.filter((f) => f.t >= r.from + 60 && f.t <= r.to - 20);
      if (pk <= 0 || win.length < 2) continue;
      judged++;
      const ring = win.filter((f) => f.rms >= floor * pk || (f.hz && (f.conf ?? 1) >= 0.8 && f.rms >= 0.08 * pk && (pc(Math.round(midiOfHz(f.hz))) === pc(r.prevPitch) || openPcs.includes(pc(Math.round(midiOfHz(f.hz))))))).length;
      if (ring >= win.length / 2) rang++;
    } else if (typeof r.prevOff === 'number') {
      // MIDI note-off known; a missing release (null) is unknown, not "kept ringing".
      judged++;
      if (r.prevOff > (r.from + r.to) / 2) rang++;
    }
  }
  return { rests: judged, rang };
}

/** Release accuracy (A9): share of notes released within ±tol ms of the written end. Null when none measured. */
export function releaseAccuracy(notes: { release: number | null; target: number }[], tol: number): number | null {
  const xs = notes.filter((n) => n.release !== null);
  if (!xs.length) return null;
  return xs.filter((n) => Math.abs(n.release! - n.target) <= tol).length / xs.length;
}

/**
 * Overlap of consecutive different pitches (A9), ms per pair (null = not measurable). MIDI: previous note-off − next
 * onset. Mic with chroma: how long after the next onset the previous pitch class keeps ≥ half the new one's energy.
 */
export function overlapMs(pairs: { prevPitch: number; prevOff?: number | null; nextPitch: number; nextOn: number }[], frames: GFrame[] = []): (number | null)[] {
  const step = stepOf(frames);
  const chromaOk = frames.some((f) => f.chroma);
  return pairs.map((p) => {
    if (p.prevOff !== undefined && p.prevOff !== null) return Math.max(0, p.prevOff - p.nextOn);
    if (!chromaOk || pc(p.prevPitch) === pc(p.nextPitch)) return null;
    let n = 0;
    for (const f of frames) {
      if (f.t < p.nextOn || f.t > p.nextOn + 200 || !f.chroma) continue;
      if (f.chroma[pc(p.prevPitch)] >= 0.5 * f.chroma[pc(p.nextPitch)] && f.chroma[pc(p.prevPitch)] > 0.2) n++;
      else break;
    }
    return n * step;
  });
}

/**
 * Intonation (fretless / upright): each note's median cents off the written pitch over its sustain (80 ms after the
 * onset until the end), octave errors folded. Null for notes without confident frames.
 */
export function centsOff(frames: GFrame[], notes: { pitch: number; from: number; to: number }[]): (number | null)[] {
  return notes.map((n) => {
    const cs = frames
      .filter((f) => f.t >= n.from + 80 && f.t <= n.to && f.hz && (f.conf ?? 1) >= 0.8)
      .map((f) => {
        const c = 100 * (midiOfHz(f.hz!) - n.pitch);
        return ((((c + 600) % 1200) + 1200) % 1200) - 600;
      });
    return cs.length >= 2 ? median(cs) : null;
  });
}

/**
 * Plucking zone (A12): median attack centroid of the second half's notes ÷ the first half's. Neck → bridge is
 * brighter (> 1). Self-calibrating: the first half is the player's own neck tone on this instrument. Null without
 * centroid frames.
 */
export function zoneShift(frames: GFrame[], onsets: number[], splitMs: number): number | null {
  const cOf = (on: number): number | null => {
    const cs = frames.filter((f) => f.t >= on && f.t <= on + 80 && f.centroid !== undefined && f.centroid > 0).map((f) => f.centroid!);
    return cs.length ? median(cs) : null;
  };
  const a = onsets.filter((t) => t < splitMs).map(cOf).filter((x): x is number => x !== null);
  const b = onsets.filter((t) => t >= splitMs).map(cOf).filter((x): x is number => x !== null);
  if (a.length < 3 || b.length < 3) return null;
  return median(b) / median(a);
}

export type SlapClass = 'thumb' | 'pop' | 'finger';
/**
 * Slap / pop / finger guess from one attack (A13, advice only, never gates): rise time to the peak, attack centroid
 * and loudness against the take's median peak. ⚙ pop = very bright (≥ 2.2 kHz) and loud; thumb = bright (≥ 1.2 kHz)
 * with a fast rise (≤ 15 ms); else finger. Null without centroid frames.
 */
export function slapClass(frames: GFrame[], on: number, medianPeak: number): SlapClass | null {
  const win = frames.filter((f) => f.t >= on - 10 && f.t <= on + 80);
  const cs = win.filter((f) => f.centroid !== undefined && f.t >= on).map((f) => f.centroid!);
  if (!cs.length) return null;
  const c = median(cs);
  const pk = Math.max(0, ...win.map((f) => f.rms));
  const peakAt = win.find((f) => f.rms === pk)?.t ?? on;
  const rise = Math.max(0, peakAt - on);
  if (c >= 2200 && pk >= 1.2 * medianPeak) return 'pop';
  if (c >= 1200 && rise <= 15) return 'thumb';
  return 'finger';
}

// ───────────────────────────── free-choice rules (A5) ─────────────────────────────

export type RuleKind = 'walk' | 'chordTones' | 'nearest' | 'target' | 'downbeatCt';
export interface RuleChart {
  chord: string;
  root: number;
  /**
   * Chord tones as INTERVALS above the root, root included as 0 (like WalkChord.iv). A list without 0 that holds the
   * root's pitch class is read as pitch classes instead (the only unambiguous case).
   */
  tones: number[];
  /** Length in beats. */
  beats: number;
  /** target rules (0.66): the notes to land on at this chord's first beat, as intervals above the root. */
  land?: number[];
}
/** Without a `land` list a target line lands on any chord tone (root, 3rd, 5th or 7th, any quality). */
const LAND_ANY = [0, 3, 4, 6, 7, 8, 10, 11];
export interface RuleNote {
  /** Played pitch at this slot, or null when nothing was played. */
  pitch: number | null;
  beat: number;
}
export type RuleReport = TakeRules;

/** Chord tones of a chart entry as pitch classes (tones given as intervals above the root, or as pitch classes). */
export function chartPcs(c: RuleChart): number[] {
  const asPcs = !c.tones.includes(0) && c.tones.map(pc).includes(pc(c.root)) && pc(c.root) !== 0;
  return [...new Set(c.tones.map((x) => (asPcs ? pc(x) : pc(c.root + x))))];
}

/** The chart entry sounding at a beat (the chart repeats when the line is longer). */
export function chartAt(chart: RuleChart[], beat: number): { c: RuleChart; start: number; i: number } {
  const total = chart.reduce((a, c) => a + c.beats, 0);
  if (!chart.length || total <= 0) return { c: { chord: '', root: 0, tones: [], beats: 0 }, start: 0, i: -1 };
  const loops = Math.floor(beat / total + 1e-9);
  let b = beat - loops * total;
  let s = loops * total;
  for (let i = 0; i < chart.length; i++) {
    if (b < chart[i].beats - 1e-6) return { c: chart[i], start: s, i: loops * chart.length + i };
    b -= chart[i].beats;
    s += chart[i].beats;
  }
  return { c: chart[chart.length - 1], start: s - chart[chart.length - 1].beats, i: loops * chart.length + chart.length - 1 };
}

/**
 * Judge a free-choice line by rules (A5) instead of note for note. walk: a chord tone on each chord change, chord
 * tones / tensions elsewhere, and on the last note before a change an approach to the next root (chromatic, dominant
 * or scale step) or a chord tone. chordTones: chord tones only (a chromatic approach to the next root allowed on the
 * last note before a change). nearest: chord tones, and moves ≤ maxMove semitones. target (0.66, fills and solos):
 * the chart's tones are the chord scale, and the first note of each chord must land on a target (`land`).
 */
export function ruleCheck(kind: RuleKind, chart: RuleChart[], notes: RuleNote[], meter: number, maxMove = 4, opts: RuleOpts = {}): RuleReport {
  const labels: string[] = [];
  const valid: boolean[] = [];
  let changes = 0;
  let ctAtChange = 0;
  let movesOk = 0;
  let movesN = 0;
  let downN = 0;
  let downCt = 0;
  let early = 0;
  let prevPitch: number | null = null;
  const ant = kind === 'target' && opts.anticipate ? opts.anticipate : 0;
  const every = opts.every ?? 1;
  notes.forEach((n, k) => {
    if (n.pitch === null) {
      labels.push('-');
      valid.push(false);
      return;
    }
    // Anticipation (target + anticipate): a note `ant` beats before a chord change belongs to the NEW chord and is its
    // landing; the downbeat after it is an ordinary note (a tumbao leaves beat 1 empty anyway).
    const antHere = ant > 0 && n.beat + ant > 1e-6 && Math.abs(chartAt(chart, n.beat + ant).start - (n.beat + ant)) < 1e-6;
    const eff = antHere ? n.beat + ant : n.beat;
    const cur = chartAt(chart, eff);
    const ct = chartPcs(cur.c);
    const rel = pc(n.pitch - cur.c.root);
    const nextBeat = k + 1 < notes.length ? notes[k + 1].beat : n.beat + 1;
    const nx = chartAt(chart, nextBeat + (ant > 0 && Math.abs(chartAt(chart, nextBeat + ant).start - (nextBeat + ant)) < 1e-6 ? ant : 0));
    const beforeChange = k + 1 < notes.length && nx.i !== cur.i;
    const isNew = antHere || (Math.abs(n.beat - cur.start) < 1e-6 && !(ant > 0 && n.beat > 1e-6));
    let lab = 'other';
    if (rel === 0) lab = 'R';
    else if (ct.includes(pc(n.pitch))) lab = rel === 3 || rel === 4 ? '3' : rel === 6 || rel === 7 || rel === 8 ? '5' : rel >= 9 ? '7' : 'tension';
    else if ([2, 5, 9].includes(rel)) lab = 'tension';
    const isCt = ct.includes(pc(n.pitch));
    let ok = false;
    if (kind === 'walk') {
      ok = lab !== 'other';
      if (beforeChange) {
        const d = pc(n.pitch - nx.c.root);
        const ap = d === 1 || d === 11 ? 'chromatic' : d === 7 ? 'dominant' : d === 2 || d === 10 ? 'scale' : null;
        if (ap && !isCt) lab = ap;
        ok = ok || !!ap;
      }
      if (isNew) ok = isCt;
    } else if (kind === 'target') {
      ok = isCt;
      if (!ok && beforeChange) {
        const d = pc(n.pitch - nx.c.root);
        if (d === 1 || d === 11) {
          lab = 'chromatic';
          ok = true;
        }
      }
      // Passing notes (bass b-impro 7+: enclosures, chromatic passing): a note outside the scale a step or less from
      // the next note played.
      if (!ok && opts.passing) {
        const nextP = k + 1 < notes.length ? notes[k + 1].pitch : null;
        if (nextP !== null && Math.abs(nextP - n.pitch) <= opts.passing) {
          lab = 'chromatic';
          ok = true;
        }
      }
      if (isNew) {
        const landed = (cur.c.land ?? LAND_ANY).includes(rel);
        ok = landed;
        if (landed) ctAtChange++;
        if (landed && antHere) early++;
        changes++;
      }
    } else if (kind === 'downbeatCt') {
      // Barry Harris: a chord tone on every downbeat; between them scale tones, tensions or a chromatic step to the
      // next note (the half-step rule's passing notes).
      const down = Math.abs(n.beat / every - Math.round(n.beat / every)) < 1e-6;
      if (down) {
        downN++;
        if (isCt) downCt++;
        ok = isCt;
      } else {
        const nextP = k + 1 < notes.length ? notes[k + 1].pitch : null;
        ok = lab !== 'other' || (nextP !== null && Math.abs(nextP - n.pitch) <= 2);
        if (lab === 'other' && ok) lab = 'chromatic';
      }
    } else {
      ok = isCt;
      if (!ok && beforeChange) {
        const d = pc(n.pitch - nx.c.root);
        if (d === 1 || d === 11) {
          lab = 'chromatic';
          ok = true;
        }
      }
      if (kind === 'nearest' && prevPitch !== null) {
        movesN++;
        if (Math.abs(n.pitch - prevPitch) <= maxMove) movesOk++;
      }
    }
    if (isNew && kind !== 'target') {
      changes++;
      if (isCt) ctAtChange++;
    }
    labels.push(lab);
    valid.push(ok);
    prevPitch = n.pitch;
  });
  const played = notes.map((n, k) => ({ n, k })).filter((x) => x.n.pitch !== null);
  const ps = played.map((x) => x.n.pitch!);
  const repeats = ps.length > 1 ? ps.slice(1).filter((m, i) => m === ps[i]).length / (ps.length - 1) : 0;
  // N6 variety: roots in alternating octaves are all chord tones and never an exact repeat, so walking also needs
  // notes that aren't the root (3rds, 5ths, 7ths, tensions, approaches) and few same-pitch-class neighbours.
  const pcRepeats = ps.length > 1 ? ps.slice(1).filter((m, i) => pc(m) === pc(ps[i])).length / (ps.length - 1) : 0;
  const nonRoot = played.length ? played.filter((x) => labels[x.k] !== 'R' && labels[x.k] !== 'other').length / played.length : 0;
  // The worst bar: most invalid slots; its first invalid slot is the pointer.
  const bad = new Map<number, number[]>();
  notes.forEach((n, k) => {
    if (n.pitch !== null && !valid[k]) {
      const bar = Math.floor(n.beat / meter + 1e-6);
      bad.set(bar, [...(bad.get(bar) ?? []), k]);
    }
  });
  let worst: RuleReport['worst'] = null;
  let most = 0;
  for (const [bar, ks] of [...bad.entries()].sort((a, b) => a[0] - b[0]))
    if (ks.length > most) {
      most = ks.length;
      const k = ks[0];
      worst = { slot: k, bar, beatInBar: notes[k].beat - bar * meter, chord: chartAt(chart, notes[k].beat).c.chord, label: labels[k] };
    }
  return {
    kind,
    labels,
    valid,
    validShare: played.length ? played.filter((x) => valid[x.k]).length / played.length : 0,
    beat1Ct: changes ? ctAtChange / changes : 1,
    repeats,
    pcRepeats,
    nonRoot,
    moves: kind === 'nearest' ? (movesN ? movesOk / movesN : 1) : null,
    worst,
    ...(kind === 'downbeatCt' ? { downbeat: downN ? downCt / downN : 1 } : {}),
    ...(ant > 0 ? { anticipated: anticipatedShare(chart, notes, ant, early) } : {}),
  };
}

/** Chord changes after beat 0 inside the line, and the share of them landed early (missing slots count as missed). */
function anticipatedShare(chart: RuleChart[], notes: RuleNote[], ant: number, early: number): number {
  if (!notes.length) return 1;
  const end = Math.max(...notes.map((n) => n.beat)) + ant;
  let n = 0;
  for (let b = 0, i = 0; b <= end + 1e-6 && i < 10000; i++) {
    b += chart[i % chart.length]?.beats ?? Infinity;
    if (b <= end + 1e-6) n++;
  }
  return n ? Math.min(1, early / n) : 1;
}

/** Options of `ruleCheck`: the downbeat spacing (downbeatCt) and the anticipation of target landings. */
export interface RuleOpts {
  /** downbeatCt: downbeats every this many beats (default 1). */
  every?: number;
  /** target: landings this many beats before each chord change (0.5 = an 8th early). */
  anticipate?: number;
  /** target: a note outside the scale is a passing note when the next note is at most this many semitones away. */
  passing?: number;
}

/** N6: the least variety a free walking line needs — non-root notes (chord tones, tensions, approaches) and at most this share of same-pitch-class neighbours. */
export const WALK_VARIETY = { nonRoot: 0.3, pcRepeats: 0.25 };

// ───────────────────────────── walking-bass rules ─────────────────────────────

export type WalkLabel = 'R' | '3' | '5' | '7' | 'tension' | 'chromatic' | 'dominant' | 'scale' | 'other';
export interface WalkChord {
  /** Root pitch class. */
  root: number;
  /** Intervals above the root. */
  iv: number[];
}
export interface WalkReport {
  labels: WalkLabel[];
  /** Share of chord changes (beat 1 of a new chord) on a chord tone. */
  beat1Ct: number;
  /** Share of last beats before a change that approach the next root (chromatic, dominant or scale step). */
  approach: number;
  /** Share of notes repeating the note before. */
  repeats: number;
  /** Lowest to highest note (semitones). */
  range: number;
  /** Index of the first beat-1 that is not a chord tone (−1 = none): the "Why?" pointer. */
  worst: number;
}

/**
 * Label a walking line beat by beat (one note a beat) against the chords: chord tones R/3/5/7, approaches on the
 * beat before a change (chromatic ±1 to the next root, its 5th = dominant, ±2 = scale step), tensions, other.
 */
export function walkRules(line: number[], chordAt: (beat: number) => WalkChord): WalkReport {
  const pc = (n: number) => ((n % 12) + 12) % 12;
  const labels: WalkLabel[] = [];
  let changes = 0;
  let ctAtChange = 0;
  let pre = 0;
  let approaches = 0;
  let worst = -1;
  line.forEach((m, b) => {
    const c = chordAt(b);
    const nx = chordAt(b + 1);
    const rel = pc(m - c.root);
    const isNew = b === 0 || chordAt(b - 1) !== c;
    const beforeChange = b < line.length - 1 && nx !== c;
    let lab: WalkLabel = 'other';
    const ct = c.iv.map((x) => pc(x));
    if (rel === 0) lab = 'R';
    else if (ct.includes(rel)) lab = rel === 3 || rel === 4 ? '3' : rel === 6 || rel === 7 || rel === 8 ? '5' : rel === 9 || rel === 10 || rel === 11 ? '7' : 'tension';
    else if ([2, 5, 9].includes(rel)) lab = 'tension';
    if (beforeChange) {
      const d = pc(m - nx.root);
      const ap: WalkLabel | null = d === 1 || d === 11 ? 'chromatic' : d === 7 ? 'dominant' : d === 2 || d === 10 ? 'scale' : null;
      pre++;
      // An approach is a note that is NOT a chord tone of its own chord (N2b): on Dm7–G7–C every root is a 5th above
      // the next one, so a roots-only line would otherwise "approach" every change.
      if (ap && (lab === 'other' || lab === 'tension')) {
        approaches++;
        lab = ap;
      }
    }
    if (isNew) {
      changes++;
      if (ct.includes(rel)) ctAtChange++;
      else if (worst < 0) worst = b;
    }
    labels.push(lab);
  });
  const repeats = line.length > 1 ? line.slice(1).filter((m, i) => m === line[i]).length / (line.length - 1) : 0;
  return {
    labels,
    beat1Ct: changes ? ctAtChange / changes : 1,
    approach: pre ? approaches / pre : 1,
    repeats,
    range: line.length ? Math.max(...line) - Math.min(...line) : 0,
    worst,
  };
}

/**
 * The placement walk task (B6, N2): one played pitch per beat (−100 = nothing) against the drill's rule chart, whose
 * tones are intervals above the root (chartPcs reads them). Beat-1 chord tones, approach share, share of roots.
 */
export function walkProbeReport(chart: RuleChart[], line: number[]): { beat1Ct: number; approach: number; rootShare: number } {
  const chords: { from: number; c: WalkChord }[] = [];
  let at = 0;
  for (const c of chart) {
    chords.push({ from: at, c: { root: pc(c.root), iv: chartPcs(c).map((p) => pc(p - c.root)) } });
    at += c.beats;
  }
  const chordAt = (b: number) => (chords.filter((x) => x.from <= b).pop() ?? chords[0]).c;
  const rep = walkRules(line, chordAt);
  return { beat1Ct: rep.beat1Ct, approach: rep.approach, rootShare: rep.labels.filter((l) => l === 'R').length / Math.max(1, rep.labels.length) };
}

// ───────────────────────────── walking swing (b-swing, PROG_ENGINE §5) ─────────────────────────────

/** Share of notes sounding at least `min` × their beat (long quarters: ≥ 0.85). Lengths and beats in ms. Null when empty. */
export function longShare(lens: (number | null)[], beatMs: number[] | number, min = 0.85): number | null {
  const xs = lens.map((l, i) => ({ l, b: typeof beatMs === 'number' ? beatMs : beatMs[i] })).filter((x): x is { l: number; b: number } => x.l !== null && x.b > 0);
  return xs.length ? xs.filter((x) => x.l >= min * x.b - 1e-9).length / xs.length : null;
}

/**
 * Placement vs the ride (ms, + = the bass behind the cymbal): each onset paired with the nearest ride hit within
 * `tol` ms. Mean, SD and how many were paired; null with fewer than 4 pairs.
 */
export function ridePlacement(onsets: number[], ride: number[], tol = 90): { mean: number; sd: number; n: number } | null {
  const offs: number[] = [];
  for (const o of onsets) {
    let best = Infinity;
    for (const r of ride) if (Math.abs(o - r) < Math.abs(best)) best = o - r;
    if (Math.abs(best) <= tol) offs.push(best);
  }
  if (offs.length < 4) return null;
  const m = mean(offs);
  return { mean: m, sd: Math.sqrt(mean(offs.map((x) => (x - m) ** 2))), n: offs.length };
}

/**
 * Tempo drift over choruses: the played beat length of each chorus (median of IOI ÷ written beats, ms) and the change
 * from the first chorus to the last as a share (+ = slower, dragging; − = rushing). Null under 2 measurable choruses.
 */
export function chorusDrift(pts: { beat: number; on: number }[], chorusBeats: number): { beatMs: number[]; drift: number } | null {
  const s = [...pts].sort((a, b) => a.beat - b.beat);
  const by = new Map<number, number[]>();
  for (let i = 1; i < s.length; i++) {
    const d = s[i].beat - s[i - 1].beat;
    if (d <= 1e-6 || d > 2) continue;
    const c = Math.floor(s[i - 1].beat / chorusBeats + 1e-9);
    by.set(c, [...(by.get(c) ?? []), (s[i].on - s[i - 1].on) / d]);
  }
  const cs = [...by.entries()].filter(([, xs]) => xs.length >= 3).sort((a, b) => a[0] - b[0]);
  if (cs.length < 2) return null;
  const beatMs = cs.map(([, xs]) => median(xs));
  return { beatMs, drift: (beatMs[beatMs.length - 1] - beatMs[0]) / beatMs[0] };
}

export interface SwingWalk {
  long: number | null;
  ride: { mean: number; sd: number; n: number } | null;
  drift: { beatMs: number[]; drift: number } | null;
}
/** The walking-swing suite in one call: long quarters, placement vs the ride, drift over choruses (each null when not measurable). */
export function swingWalk(notes: { beat: number; on: number; len: number | null; beatMs: number }[], ride: number[], chorusBeats: number, long = 0.85): SwingWalk {
  return {
    long: longShare(
      notes.map((n) => n.len),
      notes.map((n) => n.beatMs),
      long,
    ),
    ride: ridePlacement(
      notes.map((n) => n.on),
      ride,
    ),
    drift: chorusDrift(notes, chorusBeats),
  };
}

// ───────────────────────────── double-stops and shells by chroma (b-ext) ─────────────────────────────

/**
 * Chord matching for double-stops / shells: for each expected chord (pitch classes, onset, end in ms) the mean chroma
 * of the frames 50–400 ms after its onset must hold every pitch class (≥ `present` × the strongest class) and no
 * strong foreign class (≥ `extra`). Per chord ok / missing / extra; `share` = chords fully right. Null without chroma.
 */
export function doubleStopMatch(frames: GFrame[], chords: { pcs: number[]; on: number; until: number }[], present = 0.25, extra = 0.6): { share: number; per: { ok: boolean; missing: number[]; extra: number[] }[] } | null {
  if (!frames.some((f) => f.chroma)) return null;
  const per = chords.map((c) => {
    const want = new Set(c.pcs.map(pc));
    const win = frames.filter((f) => f.chroma && f.t >= c.on + 50 && f.t <= Math.min(c.until, c.on + 400) && f.rms > 0.005);
    if (!win.length) return { ok: false, missing: [...want], extra: [] as number[] };
    const acc = new Array<number>(12).fill(0);
    for (const f of win) for (let i = 0; i < 12; i++) acc[i] += f.chroma![i];
    const mx = Math.max(...acc);
    const ch = mx > 0 ? acc.map((x) => x / mx) : acc;
    const missing = [...want].filter((p) => ch[p] < present);
    const ex: number[] = [];
    for (let p = 0; p < 12; p++) if (!want.has(p) && ch[p] >= extra) ex.push(p);
    return { ok: !missing.length && !ex.length, missing, extra: ex };
  });
  return { share: per.length ? per.filter((p) => p.ok).length / per.length : 0, per };
}
