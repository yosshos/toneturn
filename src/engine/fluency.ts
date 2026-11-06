// Fluency (playtesting, 0.36): a section must not score 100 when the answers were slow or needed replays.
// The skill RATING stays about being right (scoring.ts); the section SCORE, stars and the XP speed bonus
// add how fluently you were right — against a personal pace goal, never a fixed clock.
//
// The pace goal is a ratio to the reference time of each item (scoring.referenceTime: modality, number of
// choices, reading time), learned per skill × modality from your own first-try correct answers. It tightens
// slowly (at most ~5 % a week) and never below a floor of how fast a person can choose among n options
// (Hick's law + motor time), so it is a goal you can actually beat — and it moves when you do.

import type { Question } from './lesson';
import { questionSkill } from './lesson';
import { median, referenceTime, type Modality } from './scoring';

export const FLUENCY = {
  /** Points for a correct first try, before the speed part. */
  base: 70,
  /** Speed part: full within the goal, 0 at slowAt × goal (log scale). */
  speed: 30,
  slowAt: 2.5,
  /** Each replay of the sound costs this much (first try), never below minFirstTry. */
  replay: 10,
  minFirstTry: 40,
  /** A correct second try. */
  retry: 35,
  retryReplay: 5,
  minRetry: 20,
  /** Stars from the section score. */
  stars: [1, 65, 90] as const,
  /** Pace goal learning. */
  pace: { window: 20, minSamples: 5, aim: 0.95, weeklyTighten: 0.05, minStep: 0.01, loosen: 0.05, ratioMin: 0.35, ratioMax: 1.6 },
} as const;

/** Per skill × modality: goal ratio to the reference time, recent sample ratios, last change. */
export interface PaceEntry {
  r: number;
  samples: number[];
  at: string | null;
}
export type PaceProfile = Record<string, PaceEntry>;

export const paceKey = (q: Question, modality: Modality) => `${questionSkill(q)}|${modality === 'sing' ? 'sing' : modality === 'voice' ? 'voice' : 'buttons'}`;

/** Fastest reasonable goal for this item: choice reaction (Hick) + motor, plus speaking time. */
export function paceFloor(q: Question, modality: Modality): number {
  const n = Math.max(2, q.choices.length || 2);
  let t = 450 + 220 * Math.log2(n);
  if (modality === 'voice') t += 600;
  if (modality === 'sing') t += 300;
  return Math.round(t);
}

/** The answer-time goal for this item, in ms. */
export function paceTarget(q: Question, modality: Modality, profile: PaceProfile | undefined): number {
  const ref = referenceTime(q, modality);
  const r = profile?.[paceKey(q, modality)]?.r ?? 1;
  return Math.round(Math.max(paceFloor(q, modality), ref * r));
}

/** 1 within the goal, falling (log scale) to 0 at slowAt × goal; unmeasured time counts as on time. */
export function speedCredit(timeMs: number | null | undefined, targetMs: number): number {
  if (timeMs == null || !(timeMs > 0) || timeMs <= targetMs) return 1;
  const k = Math.log(timeMs / targetMs) / Math.log(FLUENCY.slowAt);
  return Math.max(0, 1 - k);
}

export type PaceBand = 'fast' | 'ok' | 'slow';
export function paceBand(timeMs: number | null | undefined, targetMs: number): PaceBand | null {
  if (timeMs == null) return null;
  if (timeMs <= targetMs) return 'fast';
  return speedCredit(timeMs, targetMs) >= 0.5 ? 'ok' : 'slow';
}

export interface FluencyRecord {
  outcome: 'pending' | 'correct' | 'correct-retry' | 'revealed' | 'skipped';
  attempts: { correct: boolean; accuracy?: number; timeMs?: number | null; modality?: Modality; via?: 'voice' | 'buttons' }[];
  replays?: number;
}

const memoryTask = (q: Question) => q.kind === 'sing-seq' || q.kind === 'sing-run';
const modalityOf = (a: FluencyRecord['attempts'][number]): Modality => a.modality ?? (a.via === 'voice' ? 'voice' : 'buttons');

/** Points 0..100 for one item. `paced` = false (the player turned timing off) gives full speed credit. */
export function itemPoints(q: Question, r: FluencyRecord, profile: PaceProfile | undefined, paced: boolean): number {
  if (!r.attempts.length || r.outcome === 'skipped' || r.outcome === 'pending') return 0;
  const replays = memoryTask(q) ? 0 : r.replays ?? 0;
  if (r.outcome === 'revealed') {
    // Graded items keep partial credit for the best attempt.
    const a = Math.max(0, ...r.attempts.map((x) => x.accuracy ?? 0));
    return Math.round(FLUENCY.retry * a * 0.6);
  }
  if (r.outcome === 'correct-retry') return Math.max(FLUENCY.minRetry, FLUENCY.retry - FLUENCY.retryReplay * replays);
  const first = r.attempts[0];
  const acc = first.accuracy ?? 1;
  const m = modalityOf(first);
  const credit = paced ? speedCredit(first.timeMs, paceTarget(q, m, profile)) : 1;
  const p = FLUENCY.base * acc + FLUENCY.speed * acc * credit - FLUENCY.replay * replays;
  return Math.round(Math.max(FLUENCY.minFirstTry * acc, Math.min(100, p)));
}

export interface SectionScore {
  score: number;
  stars: 0 | 1 | 2 | 3;
  /** How many items were answered right first try, within the goal, without a replay. */
  perfect: number;
  onPace: number;
  replays: number;
  total: number;
}

export function sectionScore(qs: Question[], rs: FluencyRecord[], profile: PaceProfile | undefined, paced: boolean): SectionScore {
  const live = rs.map((r, i) => ({ r, q: qs[i] })).filter(({ r }) => r.outcome !== 'skipped');
  const pts = live.map(({ q, r }) => itemPoints(q, r, profile, paced));
  const score = pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) : 0;
  const [s1, s2, s3] = FLUENCY.stars;
  const stars = score >= s3 ? 3 : score >= s2 ? 2 : score >= s1 ? 1 : 0;
  const onPace = live.filter(({ q, r }) => r.outcome === 'correct' && (!paced || speedCredit(r.attempts[0].timeMs, paceTarget(q, modalityOf(r.attempts[0]), profile)) >= 1)).length;
  return {
    score,
    stars,
    perfect: pts.filter((p) => p >= 100).length,
    onPace,
    replays: live.reduce((a, { r }) => a + (r.replays ?? 0), 0),
    total: live.length,
  };
}

/**
 * Learn the pace goal from a finished session: first-try correct answers without replays, as ratios to their
 * reference time. The goal moves toward ~95 % of your recent median — down at most ~5 % a week, up at most 5 % a
 * session (a bad day never makes the goal impossible).
 */
export function updatePace(profile: PaceProfile, qs: Question[], rs: FluencyRecord[], now: Date): PaceProfile {
  const P = FLUENCY.pace;
  const next: PaceProfile = { ...profile };
  const touched = new Set<string>();
  rs.forEach((r, i) => {
    const q = qs[i];
    if (!q || r.outcome !== 'correct' || (r.replays ?? 0) > 0) return;
    const a = r.attempts[0];
    if (a.timeMs == null || !(a.timeMs > 0)) return;
    const m = modalityOf(a);
    const key = paceKey(q, m);
    const e = next[key] ?? { r: 1, samples: [], at: null };
    next[key] = { ...e, samples: [...e.samples, a.timeMs / referenceTime(q, m)].slice(-P.window) };
    touched.add(key);
  });
  for (const key of touched) {
    const e = next[key];
    if (e.samples.length < P.minSamples) continue;
    const want = Math.min(P.ratioMax, Math.max(P.ratioMin, (median(e.samples) ?? 1) * P.aim));
    let r = e.r;
    if (want < r) {
      const days = e.at ? (now.getTime() - new Date(e.at).getTime()) / 86400000 : 7;
      const step = Math.max(P.minStep, P.weeklyTighten * Math.min(1, days / 7));
      r = Math.max(want, r * (1 - step));
    } else if (want > r) r = Math.min(want, r * (1 + P.loosen));
    next[key] = { ...e, r: Math.round(r * 1000) / 1000, at: r !== e.r ? now.toISOString() : e.at };
  }
  return next;
}
