// Performance (spec V.4–V.7): chord charts, play-along backing tracks (walking bass, comping, ride),
// guided-improvisation analysis, MIDI keyboard drills. Pure.

import type { NoteEvent } from './lesson';
import type { SungFrame } from './sing';
import { segmentNotes } from './memory';

export type ChartId = 'ii-V-I' | 'minor-ii-V-i' | 'blues';
export type Quality = 'maj7' | 'm7' | 'dom7' | 'hd' | 'b9' | 'm6';
export const QUALITY: Record<Quality, number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], hd: [0, 3, 6, 10], b9: [0, 4, 7, 10, 13], m6: [0, 3, 7, 9] };
const SYM: Record<Quality, string> = { maj7: 'maj7', m7: 'm7', dom7: '7', hd: 'ø7', b9: '7♭9', m6: 'm6' };

export interface ChartChord {
  /** Root in semitones above the key. */
  deg: number;
  q: Quality;
  beats: number;
}
export const CHARTS: Record<ChartId, ChartChord[]> = {
  'ii-V-I': [{ deg: 2, q: 'm7', beats: 4 }, { deg: 7, q: 'dom7', beats: 4 }, { deg: 0, q: 'maj7', beats: 8 }],
  'minor-ii-V-i': [{ deg: 2, q: 'hd', beats: 4 }, { deg: 7, q: 'b9', beats: 4 }, { deg: 0, q: 'm6', beats: 8 }],
  blues: [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((deg) => ({ deg, q: 'dom7' as Quality, beats: 4 })),
};
export const chartBeats = (id: ChartId) => CHARTS[id].reduce((a, c) => a + c.beats, 0);

const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export const chordSymbol = (key: number, c: ChartChord) => `${NAMES[(key + c.deg) % 12]}${SYM[c.q]}`;

/** The chord sounding at a beat (beats from the start of the loop; wraps around). */
export function chordAt(id: ChartId, beat: number): ChartChord {
  const chart = CHARTS[id];
  let b = ((beat % chartBeats(id)) + chartBeats(id)) % chartBeats(id);
  for (const c of chart) {
    if (b < c.beats) return c;
    b -= c.beats;
  }
  return chart[chart.length - 1];
}
export const chordPcs = (key: number, c: ChartChord) => QUALITY[c.q].map((x) => (key + c.deg + x) % 12);

/** A backing track: walking bass, Charleston comping (shell + colour), ride cymbal with a swung skip. */
export function backingTrack(id: ChartId, key: number, bpm: number, choruses: number, o: { countIn?: boolean; swing?: number } = {}): { events: NoteEvent[]; length: number; startBeat: number } {
  const beat = 60 / bpm;
  const swing = o.swing ?? 2; // long:short
  const ev: NoteEvent[] = [];
  const startBeat = o.countIn === false ? 0 : 4;
  for (let k = 0; k < startBeat; k++) ev.push({ midi: k === 0 ? 96 : 91, start: k * beat, duration: 0.05, velocity: 0.55 });
  const total = chartBeats(id) * choruses;
  const bassOf = (pc: number) => 36 + ((pc - 36 + 120) % 12) + (pc % 12 < 4 ? 12 : 0);
  for (let b = 0; b < total; b++) {
    const t = (startBeat + b) * beat;
    const c = chordAt(id, b);
    const next = chordAt(id, b + 1);
    const root = bassOf((key + c.deg) % 12);
    const pos = b % 4;
    const iv = QUALITY[c.q];
    const bass = pos === 0 ? root : pos === 1 ? root + iv[1] : pos === 2 ? root + iv[2] : bassOf((key + next.deg) % 12) + (next !== c || (b + 1) % 4 === 0 ? (b % 8 < 4 ? -1 : 1) : 0);
    ev.push({ midi: bass, start: t, duration: beat * 0.9, velocity: 0.7 });
    // Ride: every beat, with the swung skip note on 2 and 4.
    ev.push({ midi: 93, start: t, duration: 0.05, velocity: pos % 2 ? 0.35 : 0.28 });
    if (pos % 2 === 1) ev.push({ midi: 93, start: t + (beat * swing) / (swing + 1), duration: 0.04, velocity: 0.22 });
    // Comping: beat 1 and the "and" of 2 (Charleston) — 3rd, 7th and a colour tone.
    if (pos === 0 || pos === 1) {
      const at = pos === 0 ? t : t + (beat * swing) / (swing + 1);
      const tones = [iv[1], iv[3] ?? iv[2], c.q === 'm6' || c.q === 'hd' ? iv[2] : 14].map((x) => 55 + ((key + c.deg + x - 55 + 120) % 12));
      for (const m of tones) ev.push({ midi: m, start: at, duration: pos === 0 ? beat * 0.8 : beat * 1.2, velocity: 0.42 });
    }
  }
  return { events: ev, length: (startBeat + total) * beat + 0.3, startBeat };
}

/** Every pitch the backing sounds (for the bleed gate). */
export const backingPitches = (events: NoteEvent[]) => [...new Set(events.map((e) => e.midi))];

// ---------------------------------------------------------------- guided improvisation (V.4)

export interface ImprovReport {
  notes: number;
  /** Share of notes that start on a strong beat (1 or 3) and are chord tones there. */
  strongChordTones: number;
  /** The last note is a chord tone of the last chord. */
  endsOnChordTone: boolean;
  /** Distinct note lengths used (eighths, quarters, longer…), 1–4. */
  rhythmicVariety: number;
  /** Lowest to highest note, in semitones. */
  rangeSemis: number;
  /** Share of non-chord tones that move a half step into a chord tone (chromatic approach). */
  chromaticApproaches: number;
  score: number;
  tips: ('strong' | 'ending' | 'rhythm' | 'range' | 'approach')[];
}

/** Analyse an improvised take over a chart (frames timed from the first beat after the count-in). */
export function improvReport(frames: SungFrame[], id: ChartId, key: number, bpm: number): ImprovReport {
  const beat = 60 / bpm;
  const notes = segmentNotes(frames, { minSec: 0.09 });
  const none: ImprovReport = { notes: 0, strongChordTones: 0, endsOnChordTone: false, rhythmicVariety: 0, rangeSemis: 0, chromaticApproaches: 0, score: 0, tips: ['strong', 'rhythm', 'range'] };
  if (notes.length < 3) return none;
  const pcOf = (m: number) => ((Math.round(m) % 12) + 12) % 12;
  const isCT = (m: number, b: number) => chordPcs(key, chordAt(id, Math.floor(b))).includes(pcOf(m));
  const beats = notes.map((n) => n.start / beat);
  const strong = notes.filter((_, i) => {
    const b = beats[i];
    const nearest = Math.round(b);
    return Math.abs(b - nearest) < 0.25 && nearest % 2 === 0;
  });
  const strongCT = strong.length ? strong.filter((n) => isCT(n.midi, Math.round(n.start / beat))).length / strong.length : 0;
  const last = notes[notes.length - 1];
  const endsOnChordTone = isCT(last.midi, last.start / beat);
  const lenClass = (n: { start: number; end: number }) => {
    const d = (n.end - n.start) / beat;
    return d < 0.4 ? 0 : d < 0.8 ? 1 : d < 1.6 ? 2 : 3;
  };
  const rhythmicVariety = new Set(notes.map(lenClass)).size;
  const ms = notes.map((n) => n.midi);
  const rangeSemis = Math.round(Math.max(...ms) - Math.min(...ms));
  const nct = notes.map((n, i) => ({ n, i })).filter(({ n }) => !isCT(n.midi, n.start / beat));
  const approached = nct.filter(({ n, i }) => {
    const nx = notes[i + 1];
    return nx && Math.abs(Math.round(nx.midi) - Math.round(n.midi)) === 1 && isCT(nx.midi, nx.start / beat);
  }).length;
  const chromaticApproaches = nct.length ? approached / nct.length : 0;
  const parts = [strongCT, endsOnChordTone ? 1 : 0, Math.min(1, (rhythmicVariety - 1) / 2), Math.min(1, rangeSemis / 10), Math.min(1, chromaticApproaches * 2)];
  const w = [3, 1.5, 1.5, 1, 1];
  const score = Math.round((parts.reduce((a, p, i) => a + p * w[i], 0) / w.reduce((a, b) => a + b, 0)) * 1000) / 1000;
  const tips: ImprovReport['tips'] = [];
  if (strongCT < 0.6) tips.push('strong');
  if (!endsOnChordTone) tips.push('ending');
  if (rhythmicVariety < 2) tips.push('rhythm');
  if (rangeSemis < 7) tips.push('range');
  if (chromaticApproaches < 0.25 && nct.length) tips.push('approach');
  return { notes: notes.length, strongChordTones: strongCT, endsOnChordTone, rhythmicVariety, rangeSemis, chromaticApproaches, score, tips };
}

/** A plausible improvised line for the simulator and tests: chord tones on the beats, approach notes between. */
export function synthImprov(id: ChartId, key: number, bpm: number, choruses = 1, fps = 50): SungFrame[] {
  const beat = 60 / bpm;
  const out: SungFrame[] = [];
  const total = chartBeats(id) * choruses;
  const push = (m: number, from: number, dur: number) => {
    for (let k = 0; k < Math.round(dur * fps); k++) out.push({ t: from + k / fps, hz: 440 * Math.pow(2, (m - 69) / 12), confidence: 0.95, rms: 0.08 });
  };
  for (let b = 0; b < total - 1; b += 2) {
    const c = chordAt(id, b);
    const ct = 60 + ((key + c.deg + QUALITY[c.q][(b / 2) % 3 === 0 ? 1 : (b / 2) % 3 === 1 ? 2 : 3] - 60 + 120) % 12);
    push(ct, b * beat, beat * 0.95);
    // Eighth notes: a chromatic approach into the next chord tone.
    const n = chordAt(id, b + 2);
    const nt = 60 + ((key + n.deg + QUALITY[n.q][1] - 60 + 120) % 12);
    push(nt + (b % 4 === 0 ? -1 : 1), (b + 1) * beat, beat * 0.45);
    push(ct + 7 > 74 ? ct - 5 : ct + 7, (b + 1.5) * beat, beat * 0.45);
  }
  const end = chordAt(id, total - 1);
  push(60 + ((key + end.deg - 60 + 120) % 12), (total - 1) * beat, beat * 1.5);
  return out;
}

// ---------------------------------------------------------------- MIDI keyboard drills (V.5)

export type VoicingKind = 'any' | 'shell' | 'rootless';

/** Is the played set of keys the named chord in the asked voicing? */
export function checkVoicing(played: number[], root: number, q: Quality, kind: VoicingKind): { ok: boolean; missing: number[]; extra: number[] } {
  const ns = [...new Set(played)].sort((a, b) => a - b);
  const pcs = new Set(ns.map((m) => ((m % 12) + 12) % 12));
  const iv = QUALITY[q];
  const want = kind === 'shell' ? [0, iv[1], iv[3] ?? iv[2]] : kind === 'rootless' ? [iv[1], iv[2], iv[3] ?? 9, 14] : iv.slice(0, 4);
  const wantPcs = want.map((x) => (root + x) % 12);
  const missing = wantPcs.filter((p) => !pcs.has(p));
  const extra = [...pcs].filter((p) => !wantPcs.includes(p));
  let ok = !missing.length && !extra.length;
  if (ok && kind === 'shell') ok = ns.length === 3 && ns[0] % 12 === root % 12;
  if (ok && kind === 'rootless') ok = !pcs.has(root % 12);
  return { ok, missing, extra };
}

/** Evenness of a played scale: coefficient of variation of the inter-onset intervals (0 = perfectly even). */
export function scaleEvenness(onsetsMs: number[]): number {
  if (onsetsMs.length < 3) return 1;
  const ioi = onsetsMs.slice(1).map((t, i) => t - onsetsMs[i]);
  const m = ioi.reduce((a, b) => a + b, 0) / ioi.length;
  const sd = Math.sqrt(ioi.reduce((a, b) => a + (b - m) ** 2, 0) / ioi.length);
  return m > 0 ? sd / m : 1;
}

/** ii–V–I in all keys: the keys in order around the circle (down a fifth each time). */
export const CIRCLE_KEYS = Array.from({ length: 12 }, (_, i) => (i * 5) % 12);

/** A ii–V–I chord played with at least its guide tones (3rd and 7th). */
export function hasGuideTones(played: number[], root: number, q: Quality): boolean {
  const pcs = new Set(played.map((m) => ((m % 12) + 12) % 12));
  const iv = QUALITY[q];
  return pcs.has((root + iv[1]) % 12) && pcs.has((root + (iv[3] ?? iv[2])) % 12);
}

// ---------------------------------------------------------------- internal clock (U.9)

export interface ClockPlan {
  beat: number;
  /** Beat indexes that click (lead-in bars and the closing check bar). */
  audible: number[];
  /** The silent stretch, in beats [from, to). */
  silent: [number, number];
  totalBeats: number;
}
/** Two bars with the metronome, `silentBars` without, one bar with it again (4/4). */
export function clockPlan(bpm: number, silentBars: number): ClockPlan {
  const lead = 8;
  const silent: [number, number] = [lead, lead + silentBars * 4];
  const totalBeats = silent[1] + 4;
  const audible = Array.from({ length: totalBeats }, (_, i) => i).filter((i) => i < silent[0] || i >= silent[1]);
  return { beat: 60 / bpm, audible, silent, totalBeats };
}
export function clockEvents(p: ClockPlan): { events: NoteEvent[]; length: number } {
  return { events: p.audible.map((i) => ({ midi: i % 4 === 0 ? 96 : 91, start: i * p.beat, duration: 0.05, velocity: i % 4 === 0 ? 0.6 : 0.45 })), length: p.totalBeats * p.beat + 0.3 };
}

export interface ClockReport {
  /** Mean signed error over the silent bars (ms; + = late / dragging, − = early / rushing). */
  meanMs: number;
  /** Mean absolute error over the silent bars (ms). */
  absMs: number;
  /** Signed error over the last silent bar: where the inner clock ended up. */
  endMs: number;
  /** Silent beats with a tap near them. */
  hits: number;
  silentBeats: number;
  score: number;
  verdict: 'steady' | 'rushing' | 'dragging' | 'lost';
}
/** Taps (seconds from the first click) against the beat grid. */
export function clockReport(p: ClockPlan, taps: number[]): ClockReport {
  const errs: { i: number; e: number }[] = [];
  for (let i = p.silent[0]; i < p.silent[1]; i++) {
    const want = i * p.beat;
    let best: number | null = null;
    for (const t of taps) if (Math.abs(t - want) < p.beat / 2 && (best === null || Math.abs(t - want) < Math.abs(best - want))) best = t;
    if (best !== null) errs.push({ i, e: (best - want) * 1000 });
  }
  const silentBeats = p.silent[1] - p.silent[0];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const meanMs = Math.round(avg(errs.map((x) => x.e)));
  const absMs = Math.round(avg(errs.map((x) => Math.abs(x.e))));
  const last = errs.filter((x) => x.i >= p.silent[1] - 4);
  const endMs = Math.round(avg(last.map((x) => x.e)));
  const cover = errs.length / silentBeats;
  const tight = Math.max(0, 1 - Math.max(0, absMs - 25) / 150);
  const score = Math.round(cover * tight * 1000) / 1000;
  const verdict = cover < 0.6 ? 'lost' : Math.abs(endMs) <= 40 ? 'steady' : endMs < 0 ? 'rushing' : 'dragging';
  return { meanMs, absMs, endMs, hits: errs.length, silentBeats, score, verdict };
}
