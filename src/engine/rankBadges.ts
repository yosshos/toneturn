// Ranks + badges from the whole progress (spec AG §9). Pure: the app calls refreshRanksBadges after each save.

import type { Progress } from '../storage/progress';
import { practiceDays, ratingsOf } from '../storage/progress';
import { foldSubs } from './taxonomy';
import { updateRanks, type RankChange, type TechniqueInput } from './ranks';
import { earnBadges, type Badge, type BadgeInput } from './badges';
import { familyLevel } from './drills/ladder';
import type { FamilyId, ItemState } from './drills/types';
import { localDay } from './stats';
import { REPERTOIRE, repCounts, repResults } from './repertoire';
import type { CourseId } from './courses';

/** Standards (tiers 3 and 4) and advanced pieces learned per course, from the repertoire results in progress.lessons. */
export function repertoireOf(p: Progress): Partial<Record<CourseId, { standards: number; advanced: number }>> {
  const out: Partial<Record<CourseId, { standards: number; advanced: number }>> = {};
  for (const c of Object.keys(REPERTOIRE) as CourseId[]) {
    const k = repCounts(c, repResults(p.lessons, c));
    if (k.standards || k.tier[4]) out[c] = { standards: k.standards, advanced: k.tier[4] };
  }
  return out;
}


export function techniqueOf(items: Record<string, ItemState> | undefined): TechniqueInput & { keysClean: Partial<Record<FamilyId, number>>; cleanItems: Record<string, number> } {
  const list = Object.values(items ?? {});
  const levels: Partial<Record<FamilyId, number>> = {};
  const keysClean: Partial<Record<FamilyId, number>> = {};
  // Every family played (piano and guitar / bass), never the player's own drills.
  const FAMS = [...new Set(list.map((s) => s.family))].filter((f) => f !== 'custom');
  for (const f of FAMS) {
    const lv = familyLevel(list, f);
    if (lv > 0) levels[f] = lv;
    const keys = new Set(list.filter((s) => s.family === f && s.cleanBpm > 0).map((s) => s.key));
    if (keys.size) keysClean[f] = keys.size;
  }
  const cleanItems = Object.fromEntries(list.filter((s) => s.cleanBpm > 0).map((s) => [s.itemId, s.cleanBpm]));
  return { levels, takes: list.reduce((a, s) => a + s.takes, 0), keysClean, cleanItems };
}

/** `extra`: facts kept outside Progress (e.g. the courses with a measured first win, from Settings.courseStart). */
export function badgeInputOf(p: Progress, now: Date, weekendDays?: number[], extra: Partial<BadgeInput> = {}): BadgeInput {
  const tech = techniqueOf(p.drillItems);
  return {
    today: localDay(now),
    ratings: ratingsOf(p),
    peaks: p.peaks,
    subs: foldSubs(p.ratingEvents ?? []),
    ranks: p.ranks,
    statsDays: p.statsDays,
    statsHours: p.statsHours,
    counts: p.counts,
    days: [...practiceDays(p)],
    gameTiers: p.gameTiers,
    repertoire: repertoireOf(p),
    vocalPassed: p.vocal?.passed,
    weekendDays,
    technique: { levels: tech.levels, keysClean: tech.keysClean, cleanItems: tech.cleanItems, bestEvenCv: p.counts?.evenCv ?? null, cleanTakes: p.counts?.drillClean ?? 0, tempoRecords: p.counts?.tempoRecords ?? 0 },
    ...extra,
  };
}

/** New ranks and badge log; null when nothing changed. */
export function refreshRanksBadges(p: Progress, now: Date, weekendDays?: number[], extra: Partial<BadgeInput> = {}): { next: Progress; rankChanges: RankChange[]; newly: Badge[] } | null {
  const at = now.toISOString();
  const tech = techniqueOf(p.drillItems);
  const { ranks, changes } = updateRanks(p.ranks, ratingsOf(p), p.ratingEvents ?? [], at, tech.takes ? tech : null);
  const withRanks: Progress = { ...p, ranks };
  const { log, newly } = earnBadges(p.badges, badgeInputOf(withRanks, now, weekendDays, extra), at);
  const same = JSON.stringify(ranks) === JSON.stringify(p.ranks ?? {}) && !newly.length;
  if (same) return null;
  return { next: { ...withRanks, badges: log }, rankChanges: changes, newly };
}
