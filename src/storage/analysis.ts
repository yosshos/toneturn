// The player model on this device (0.49): every judged take of a drill or a piece is folded in. Small (a few KB).

import { addTake, emptyModel, type PlayerModel } from '../engine/analysis/model';
import type { Drill, TakeMetrics } from '../engine/drills/types';
import { indexedKV, memoryKV, type KV } from './kv';

const kv: KV = (() => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedKV('toneturn-analysis', 'model') : memoryKV();
  } catch {
    return memoryKV();
  }
})();
let cache: PlayerModel | null = null;
let chain: Promise<unknown> = Promise.resolve();

export async function loadModel(): Promise<PlayerModel> {
  if (cache) return cache;
  cache = (await kv.get<PlayerModel>('model')) ?? emptyModel();
  return cache;
}

/** Fold one take in (serialised, so quick takes never overwrite each other). */
export function recordTakeAnalysis(drill: Drill, m: TakeMetrics, bpm: number): Promise<unknown> {
  chain = chain.then(async () => {
    const cur = await loadModel();
    cache = addTake(cur, drill, m, bpm, new Date().toISOString());
    await kv.set('model', cache);
  }).catch(() => {});
  return chain;
}

// ---------------------------------------------------------------- the groove fingerprint (0.50)
import { addPerformance, emptyGroove, type GrooveModel } from '../engine/analysis/groove';

let gcache: GrooveModel | null = null;
export async function loadGroove(): Promise<GrooveModel> {
  if (gcache) return gcache;
  gcache = (await kv.get<GrooveModel>('groove')) ?? emptyGroove();
  return gcache;
}
/** Fold one rhythm performance in (onsets in quarter beats, signed offsets in ms). */
export function recordGroove(onsets: number[], offsets: (number | null)[], bpm: number, beatsPerBar: number): Promise<unknown> {
  chain = chain
    .then(async () => {
      gcache = addPerformance(await loadGroove(), onsets, offsets, bpm, beatsPerBar, new Date());
      await kv.set('groove', gcache);
    })
    .catch(() => {});
  return chain;
}
