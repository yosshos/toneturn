// Live marks and the pocket meter (COURSE-FEEDBACK-UI §4.1, slice 5). Pure.
//
// While a take runs, the take's own analysis (analyzeTake / analyzeGuitarTake / analyzeDrumTake) is run again on what
// has been played so far, and each expected note is shown once it is *settled*:
//   - played (matched): about 80 ms after its onset — the head fills and the tick appears;
//   - not played: once its match window (half a beat) has passed with nothing in it — the dashed "missed" outline.
// Because the marks come from the same analysis, the live marks of a finished take are the review's marks (no
// "all green but 83 %"). The meter: a needle at the mean offset of the last 6 settled onsets, one row per hand (keys,
// hands together) or per limb (drums), and the streak of notes in a row inside the window.

import { markOf, type NoteMark } from '../noteMarks';
import { expTimeMs, tempoBand, thresholds, isImprovised } from './analyze';
import type { Drill, Limb, NoteResult, TakeMetrics } from './types';

/** ms after an onset before its mark shows (the analysis needs the onset; the eye needs a beat to read it). */
export const LIVE_LAG_MS = 80;
/** The needle: the mean of the last this many settled onsets. */
export const NEEDLE_OF = 6;

/** The window (ms) the marks and ticks are measured against — the same one the views use after the take. */
export function markWindow(m: Pick<TakeMetrics, 'nps' | 'drum'>): number {
  return m.drum?.windowMs ?? thresholds(tempoBand(m.nps)).sd * 2;
}

/** One row of the meter (a hand or a limb) with its own needle. */
export interface PocketRow {
  key: 'R' | 'L' | Limb;
  mean: number | null;
}

/** What the run screen draws while the take runs. */
export interface LiveTake {
  /** The settled notes' results (a subset of the expected notes, in the drill's order): the marks to draw. */
  perNote: NoteResult[];
  /** Timing window (ms). */
  win: number;
  /** Mean offset of the last 6 settled onsets (− early, + late); null before any. */
  mean: number | null;
  /** Hands (keys, hands together) or limbs (drums): a needle each; empty when one row says it all. */
  rows: PocketRow[];
  /** Settled notes in a row inside the window (reset by any other mark). */
  streak: number;
  /**
   * Hands together (keys, both hands): RH − LH onset gap over the settled beats where both hands played — `abs` the mean
   * size (the review's handsAbs), `mean` its sign (+ = the left hand first). Null with one hand or no shared beat yet.
   */
  hands: { abs: number; mean: number } | null;
  /** Played notes not in the score, settled (LIVE_LAG_MS old): drawn as a small ✕ above the staff / in the drum lane. */
  extras: NonNullable<TakeMetrics['extras']>;
  /** Settled notes so far / all expected. */
  done: number;
  total: number;
}

/** Can the drill's notes be marked one by one while it is played? (Improvised, phrase, voicing-choice and ear items: no.) */
export function liveMarkable(drill: Drill): boolean {
  if (drill.untimed || drill.show === 'none' || drill.phrase) return false;
  if (drill.goal.vl || drill.goal.ct || drill.goal.freeComp) return false;
  if (isImprovised(drill) || drill.listen) return false;
  return drill.notes.length > 0;
}

const limbOf = (n: NoteResult['exp']): Limb => n.limb ?? (n.hand === 'L' ? 'LH' : 'RH');
const LIMB_ORDER: Limb[] = ['RH', 'LH', 'RF', 'LF'];

/**
 * The live state from an analysis of the take so far (`m`, run on the onsets played up to `nowMs`, the take's clock).
 * A note is settled once it is matched and LIVE_LAG_MS old, or once its match window has passed unmatched.
 */
export function liveGrade(drill: Drill, m: Pick<TakeMetrics, 'perNote' | 'nps' | 'drum' | 'extras'>, bpm: number, nowMs: number): LiveTake {
  const win = markWindow(m);
  const half = 30000 / bpm;
  const settled: { r: NoteResult; t: number; mark: NoteMark }[] = [];
  for (const r of m.perNote) {
    const t = expTimeMs(drill, r.exp.beat, bpm);
    const ok = r.played ? nowMs >= r.played.on + LIVE_LAG_MS : nowMs >= t + half + LIVE_LAG_MS;
    if (ok) settled.push({ r, t, mark: markOf(r, win) });
  }
  // Onsets in time order (a chord's notes are one onset: their mean).
  const byT = [...settled].sort((a, b) => a.t - b.t);
  const onsets = (xs: typeof byT): number[] => {
    const g = new Map<number, number[]>();
    for (const s of xs) if (s.r.dev !== null) g.set(Math.round(s.t), [...(g.get(Math.round(s.t)) ?? []), s.r.dev]);
    return [...g.entries()].sort((a, b) => a[0] - b[0]).map(([, ds]) => ds.reduce((a, b) => a + b, 0) / ds.length);
  };
  const lastMean = (xs: typeof byT): number | null => {
    const os = onsets(xs).slice(-NEEDLE_OF);
    return os.length ? os.reduce((a, b) => a + b, 0) / os.length : null;
  };
  let streak = 0;
  for (let k = byT.length - 1; k >= 0 && byT[k].mark === 'ok'; k--) streak++;
  const rows: PocketRow[] = pocketRowKeys(drill).map((key) => ({ key, mean: lastMean(byT.filter((s) => (key === 'R' || key === 'L' ? s.r.exp.hand === key : limbOf(s.r.exp) === key))) }));
  return { perNote: settled.map((s) => s.r), win, mean: lastMean(byT), rows, streak, hands: handsGap(settled.map((s) => ({ r: s.r, t: s.t }))), extras: (m.extras ?? []).filter((x) => nowMs >= x.on + LIVE_LAG_MS), done: settled.length, total: m.perNote.length };
}

/** The ⇆ chip shows only when the hands are further apart than this (ms, §4.1). */
export const HANDS_CHIP_MS = 30;

/** RH − LH onset gap on the beats both hands played (each hand's mean onset there), as `abs` and `mean`. */
export function handsGap(xs: { r: NoteResult; t: number }[]): { abs: number; mean: number } | null {
  const at = new Map<number, { R: number[]; L: number[] }>();
  for (const { r, t } of xs) {
    if (!r.played || r.dev === null || (r.exp.hand !== 'R' && r.exp.hand !== 'L') || r.exp.voice) continue;
    const k = Math.round(t);
    const g = at.get(k) ?? { R: [], L: [] };
    g[r.exp.hand].push(r.played.on);
    at.set(k, g);
  }
  const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const ds = [...at.values()].filter((g) => g.R.length && g.L.length).map((g) => avg(g.R) - avg(g.L));
  if (!ds.length) return null;
  return { abs: avg(ds.map(Math.abs)), mean: avg(ds) };
}

/** The meter's rows: drums by limb (only the limbs the groove uses), keys hands together by hand; none for one part. */
export function pocketRowKeys(drill: Pick<Drill, 'notes'>): PocketRow['key'][] {
  if (drill.notes.some((n) => n.voice)) {
    const used = LIMB_ORDER.filter((l) => drill.notes.some((n) => limbOf(n) === l));
    return used.length > 1 ? used : [];
  }
  return drill.notes.some((n) => n.hand === 'L') && drill.notes.some((n) => n.hand === 'R') ? ['R', 'L'] : [];
}

/** Live marks setting (drill settings): always, while learning (default), never. */
export type LiveMarksPref = 'always' | 'learning' | 'never';

/**
 * Practice or calm (§4.1): live marks while an item is being learned — the free-time and quarters steps and its first
 * takes at tempo, until 2 clean takes count toward its level; calm (the meter only) after that and always in a level test.
 */
export function liveMarksOn(pref: LiveMarksPref | undefined, o: { learningStep: boolean; cleanTakes: number; levelTest?: boolean }): boolean {
  if (o.levelTest) return false;
  const p = pref ?? 'learning';
  if (p === 'never') return false;
  if (p === 'always') return true;
  return o.learningStep || o.cleanTakes < 2;
}
