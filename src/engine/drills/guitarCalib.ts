// The guitar calibration log (GUITAR-AUDIT B10): the chord-completeness, bend and change thresholds are research
// starting points (guitarAnalyze.ts CHORD_CLEAR_MISS, CHORD_MIC_REPORT_SHARE, the bend / vibrato limits). With the log
// turned on (#/diagnostics, off by default), each guitar take's RAW numbers are kept on this device — strum spread, the
// chroma level of every chord note per strum and the missing-note decision taken, bend / vibrato measures, changes per
// minute — and can be exported as a JSON file to set the thresholds from real players. Local only: never uploaded.

import type { Drill } from './types';
import { CHORD_CLEAR_MISS, CHORD_MIC_REPORT_SHARE, type GuitarTakeMetrics } from './guitarAnalyze';

/** The thresholds a take was graded with (kept with every entry, so a later change is visible in the data). */
export const calibThresholds = (): Record<string, number> => ({ chordClearMiss: CHORD_CLEAR_MISS, chordMicReportShare: CHORD_MIC_REPORT_SHARE, ringShare: 0.18, strumWindowMs: 90, bendCleanCents: 15, bendAlmostCents: 30 });

export const CALIB_KEY = 'tt.guitar.calib.v1';
export const CALIB_ON_KEY = 'tt.guitar.calib.on';
/** The newest takes kept (each a few hundred bytes to a few kB). */
export const CALIB_MAX = 300;

export interface CalibEntry {
  at: string;
  itemId: string;
  family: string;
  bpm: number;
  input: 'mic' | 'midi' | 'midi-strings';
  free: boolean;
  verdict: string;
  accuracy: number;
  strumSpread: number | null;
  /** Each judged strum: time (ms), chroma level per chord pitch class (mic), missing pitches, those reported, "clear". */
  strums: { at: number; levels: Record<number, number> | null; missing: number[]; told: number[]; clear: boolean }[];
  chord: { checked: number; missed: number; clear: number; reported: boolean } | null;
  ring: { chords: number; full: number; missing: Record<number, number> } | null;
  bends: { target: number; peak: number; held: number | null; error: number; riseMs: number | null; wobble: number | null; released: boolean; verdict: string }[];
  vibrato: { rateHz: number | null; widthCents: number | null; irregularity: number | null; cycles: number; verdict: string }[];
  changesPerMin: number | null;
  changeGapMs: number | null;
  unclear: number;
  unpitched: number;
  /** The thresholds in force when the take was graded. */
  thresholds: Record<string, number>;
}

const r1 = (x: number | null | undefined): number | null => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);

/** One take's raw numbers (pure). */
export function calibEntry(drill: Drill, bpm: number, m: GuitarTakeMetrics, o: { input: CalibEntry['input']; free?: boolean; at?: string; thresholds?: Record<string, number> }): CalibEntry {
  const g = m.guitar;
  const cc = g.chordMiss ?? null;
  return {
    at: o.at ?? new Date().toISOString(),
    itemId: drill.itemId,
    family: drill.spec.family,
    bpm,
    input: o.input,
    free: !!o.free,
    verdict: m.verdict,
    accuracy: Math.round(m.accuracy * 1000) / 1000,
    strumSpread: r1(g.strumSpread),
    strums: (cc?.detail ?? []).map((d) => ({ ...d })),
    chord: cc ? { checked: cc.checked, missed: cc.missed, clear: cc.clear, reported: (g.factors ?? []).some((f) => f.id === 'chord') } : null,
    ring: g.ring ? { ...g.ring, missing: { ...g.ring.missing } } : null,
    bends: g.bends.map((b) => ({ target: b.target, peak: r1(b.peak)!, held: r1(b.held), error: r1(b.error)!, riseMs: r1(b.riseMs), wobble: r1(b.wobble), released: b.released, verdict: b.verdict })),
    vibrato: g.vibrato.map((v) => ({ rateHz: r1(v.rateHz), widthCents: r1(v.widthCents), irregularity: v.irregularity === null ? null : Math.round(v.irregularity * 1000) / 1000, cycles: v.cycles, verdict: v.verdict })),
    changesPerMin: r1(g.changesPerMin),
    changeGapMs: r1(g.changeGapMs),
    unclear: g.unclear,
    unpitched: g.unpitched,
    thresholds: o.thresholds ?? calibThresholds(),
  };
}

/** The log with one more take, the oldest dropped past `max` (pure). */
export function appendCalib(list: CalibEntry[], e: CalibEntry, max = CALIB_MAX): CalibEntry[] {
  return [...list, e].slice(-max);
}

/** The exported file's content (pure): a header with what it is, then the takes. */
export function calibJson(list: CalibEntry[], meta: { app?: string; at?: string } = {}): string {
  return JSON.stringify({ kind: 'toneturn-guitar-calibration', v: 1, exported: meta.at ?? new Date().toISOString(), app: meta.app ?? '', takes: list }, null, 1);
}

// ───────────────────────── device storage (localStorage, guarded) ─────────────────────────

const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

export function calibEnabled(): boolean {
  try {
    return ls()?.getItem(CALIB_ON_KEY) === '1';
  } catch {
    return false;
  }
}
export function setCalibEnabled(on: boolean): void {
  try {
    if (on) ls()?.setItem(CALIB_ON_KEY, '1');
    else ls()?.removeItem(CALIB_ON_KEY);
  } catch {
    /* storage blocked: the log stays off */
  }
}
export function readCalib(): CalibEntry[] {
  try {
    const v = JSON.parse(ls()?.getItem(CALIB_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? (v as CalibEntry[]) : [];
  } catch {
    return [];
  }
}
export function clearCalib(): void {
  try {
    ls()?.removeItem(CALIB_KEY);
  } catch {
    /* nothing to clear */
  }
}
/** Keep a take's numbers when the log is on (never throws: a full or blocked storage just skips it). */
export function logGuitarTake(drill: Drill, bpm: number, m: GuitarTakeMetrics, o: { input: CalibEntry['input']; free?: boolean }): void {
  if (!calibEnabled()) return;
  try {
    const next = appendCalib(readCalib(), calibEntry(drill, bpm, m, o));
    ls()?.setItem(CALIB_KEY, JSON.stringify(next));
  } catch {
    /* storage full: the oldest takes stay, this one is skipped */
  }
}
