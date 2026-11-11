// Ranks + badges from the whole progress (spec AG §9). Pure: the app calls refreshRanksBadges after each save.

import type { Progress } from '../storage/progress';
import { practiceDays, ratingsOf } from '../storage/progress';
import { foldSubs } from './taxonomy';
import { updateRanks, type RankChange, type TechniqueInput } from './ranks';
import { earnBadges, type Badge, type BadgeInput } from './badges';
import { familyLevel } from './drills/ladder';
import type { FamilyId, ItemState } from './drills/types';
import { localDay } from './stats';


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

export function badgeInputOf(p: Progress, now: Date, weekendDays?: number[]): BadgeInput {
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
    weekendDays,
    technique: { levels: tech.levels, keysClean: tech.keysClean, cleanItems: tech.cleanItems, bestEvenCv: p.counts?.evenCv ?? null, cleanTakes: p.counts?.drillClean ?? 0, tempoRecords: p.counts?.tempoRecords ?? 0 },
  };
}

/** New ranks and badge log; null when nothing changed. */
export function refreshRanksBadges(p: Progress, now: Date, weekendDays?: number[]): { next: Progress; rankChanges: RankChange[]; newly: Badge[] } | null {
  const at = now.toISOString();
  const tech = techniqueOf(p.drillItems);
  const { ranks, changes } = updateRanks(p.ranks, ratingsOf(p), p.ratingEvents ?? [], at, tech.takes ? tech : null);
  const withRanks: Progress = { ...p, ranks };
  const { log, newly } = earnBadges(p.badges, badgeInputOf(withRanks, now, weekendDays), at);
  const same = JSON.stringify(ranks) === JSON.stringify(p.ranks ?? {}) && !newly.length;
  if (same) return null;
  return { next: { ...withRanks, badges: log }, rankChanges: changes, newly };
}
