// What the daily snapshot reads from settings and progress (docs/SPEC-PROGRESS-CHARTS.md §1): the lick book, the mode ×
// function stats, the Ear course's finished steps and levels, and the target mix of channels. Kept out of App.tsx so
// the app's wiring stays one line.

import type { Progress, Settings } from '../storage/progress';
import { ratingsOf } from '../storage/progress';
import type { RecordExtra } from '../storage/snapshots';
import { earLevels, earSteps } from '../engine/earSnapshot';
import { channelProfile } from '../engine/drills/channel';
import { inFingersShare } from '../engine/channelPlan';
import { strongOf, targetMix } from '../engine/presentation';
import type { ChannelMix } from '../engine/snapshot';

/** The target mix as ear / page / memory shares (the strong channel takes "strong", the other "weak"). */
export function targetMixShares(items: Progress['drillItems']): ChannelMix {
  const prof = channelProfile(items ?? {});
  const t = targetMix(prof, inFingersShare(items ?? {}));
  const r = (x: number) => Math.round(x * 1000) / 1000;
  return strongOf(prof) === 'ear' ? { ear: r(t.strong), page: r(t.weak), memory: r(t.memory) } : { ear: r(t.weak), page: r(t.strong), memory: r(t.memory) };
}

export function snapshotExtra(s: Settings, p: Progress): RecordExtra {
  const earFacts = s.activeCourse === 'ear' ? s.pathFacts : s.pathFactsBy?.ear;
  const hasEar = (s.courses ?? ['ear']).includes('ear') || s.activeCourse === 'ear';
  return {
    book: s.lickBook ? { own: s.lickBook.own, uses: s.lickBook.uses } : undefined,
    modeStats: s.rotationStats,
    ...(hasEar ? { ear: { steps: earSteps(earFacts), level: earLevels(ratingsOf(p)) } } : {}),
    mixTarget: targetMixShares(p.drillItems),
  };
}
