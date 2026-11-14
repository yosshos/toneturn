// The player profile's timeline on this device (SPEC-AI §8): one small snapshot per week of the patterns that showed.
// Refreshed when Insights opens, at app start and after practice; the snapshot of the current week is simply replaced.

import { buildProfile, emptyHistory, profileItems, withSnapshot, type Profile, type ProfileCounters, type ProfileHistory } from '../engine/analysis/profile';
import { loadGroove, loadModel } from './analysis';
import { loadConfusions, topConfusions } from './confusion';
import { indexedKV, memoryKV, type KV } from './kv';

const kv: KV = (() => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedKV('toneturn-profile', 'history') : memoryKV();
  } catch {
    return memoryKV();
  }
})();
let cache: ProfileHistory | null = null;
let chain: Promise<unknown> = Promise.resolve();

export async function loadProfileHistory(): Promise<ProfileHistory> {
  if (cache) return cache;
  cache = (await kv.get<ProfileHistory>('history')) ?? emptyHistory();
  return cache;
}

/**
 * Recompute the profile from the current measures and write this week's snapshot.
 * `ear` = the Ear Index by day (pass [] where the progress isn't at hand; the ear strength then just doesn't show).
 */
export function refreshProfile(ear: { day: string; r: number }[] = [], now = new Date()): Promise<Profile> {
  const run = chain.then(async () => {
    const [model, groove, conf, h] = await Promise.all([loadModel(), loadGroove(), loadConfusions(), loadProfileHistory()]);
    const items = profileItems({ model, groove, pairs: topConfusions(conf, 12), ear, now });
    const c: ProfileCounters = { takes: model.takes, taps: groove.taps, misses: Object.values(conf).reduce((a, x) => a + x.n, 0) };
    cache = withSnapshot(h, items, c, now);
    await kv.set('history', cache);
    // All rows: the screen keeps the active course's and cuts them to size.
    return buildProfile(items, cache, c, { strengths: 20, patterns: 20, gone: 20 });
  });
  chain = run.catch(() => {});
  return run;
}
