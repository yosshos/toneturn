// The player profile's timeline on this device (SPEC-AI §8): one small snapshot per week of the patterns that showed.
// Refreshed when Insights opens, at app start and after practice; the snapshot of the current week is simply replaced.

import { buildProfile, emptyHistory, keyCounters, keyLineOf, profileItems, withSnapshot, type Profile, type ProfileCounters, type ProfileHistory } from '../engine/analysis/profile';
import { instrumentKeys } from '../engine/analysis/keyMastery';
import { familyById } from '../engine/drills/plan';
import type { FamilyId, ItemState } from '../engine/drills/types';
import type { Progress } from './progress';
import { loadGroove, loadModel } from './analysis';
import { phrasingSummary } from '../engine/phraseOrg';
import { loadConfusions, topConfusions } from './confusion';
import { defaultKV, indexedKV, memoryKV, type KV } from './kv';

const kv: KV = (() => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedKV('toneturn-profile', 'history') : memoryKV();
  } catch {
    return memoryKV();
  }
})();
let cache: ProfileHistory | null = null;
let chain: Promise<unknown> = Promise.resolve();
/** The drill items last handed in (key mastery); read once from the saved progress when no caller passed them yet. */
let drillCache: Record<string, ItemState> | null = null;

export async function loadProfileHistory(): Promise<ProfileHistory> {
  if (cache) return cache;
  cache = (await kv.get<ProfileHistory>('history')) ?? emptyHistory();
  return cache;
}

async function drillItemsNow(given?: Record<string, ItemState>): Promise<Record<string, ItemState>> {
  if (given) return (drillCache = given);
  if (drillCache) return drillCache;
  // Simulated runs keep their progress in memory only: never read the device's real progress there.
  const sim = typeof location !== 'undefined' && new URLSearchParams(location.search).has('sim');
  if (sim) return {};
  try {
    drillCache = (await defaultKV().get<Progress>('progress'))?.drillItems ?? {};
  } catch {
    drillCache = {};
  }
  return drillCache;
}

/** A skill's name for the profile rows (the drill family's title). */
export const skillTitle = (f: FamilyId) => familyById(f)?.title ?? { en: f, he: f };

/**
 * Recompute the profile from the current measures and write this week's snapshot.
 * `ear` = the Ear Index by day (pass [] where the progress isn't at hand; the ear strength then just doesn't show).
 * `drillItems` = the technique items (key mastery); the last ones given are kept for callers without them.
 */
export function refreshProfile(ear: { day: string; r: number }[] = [], now = new Date(), drillItems?: Record<string, ItemState>): Promise<Profile> {
  const run = chain.then(async () => {
    const [model, groove, conf, h, drills] = await Promise.all([loadModel(), loadGroove(), loadConfusions(), loadProfileHistory(), drillItemsNow(drillItems)]);
    const keys = instrumentKeys(drills, now.getTime());
    const items = profileItems({ model, groove, pairs: topConfusions(conf, 12), ear, now, keys, titleOf: skillTitle });
    const c: ProfileCounters = { takes: model.takes, taps: groove.taps, misses: Object.values(conf).reduce((a, x) => a + x.n, 0), ...keyCounters(drills, keys) };
    cache = withSnapshot(h, items, c, now);
    await kv.set('history', cache);
    // All rows: the screen keeps the active course's and cuts them to size.
    const phrasing = phrasingSummary(model.phrasing ?? []);
    return { ...buildProfile(items, cache, c, { strengths: 20, patterns: 20, gone: 20 }), keyLine: keyLineOf(keys, skillTitle), ...(phrasing ? { phrasing } : {}) };
  });
  chain = run.catch(() => {});
  return run;
}
