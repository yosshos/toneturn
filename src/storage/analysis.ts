// The player model on this device (0.49): every judged take of a drill or a piece is folded in. Small (a few KB).

import { addTake, emptyModel, type PlayerModel } from '../engine/analysis/model';
import type { Drill, TakeMetrics } from '../engine/drills/types';
import { analysisDrill, anyOwn, type OwnFingerings } from '../engine/drills/ownFingering';
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

/**
 * Fold one take in (serialised, so quick takes never overwrite each other). `own` = the player's own fingerings: the
 * item's notes carry the player's numbers (none where not entered), and the model's ownFingering flag follows them.
 */
export function recordTakeAnalysis(drill: Drill, m: TakeMetrics, bpm: number, own?: OwnFingerings): Promise<unknown> {
  chain = chain.then(async () => {
    const cur = await loadModel();
    const next = addTake(cur, own ? analysisDrill(drill, own) : drill, m, bpm, new Date().toISOString());
    cache = own === undefined ? next : withOwnFlag(next, anyOwn(own));
    await kv.set('model', cache);
  }).catch(() => {});
  // Bass takes also feed the groove fingerprint (BASS_AUDIT A14).
  const g = feedsGroove(drill) ? takeGroove(drill, m) : null;
  if (g) void recordGroove(g.onsets, g.offsets, bpm, g.beatsPerBar);
  return chain;
}

const withOwnFlag = (m: PlayerModel, on: boolean): PlayerModel => {
  if (!!m.ownFingering === on) return m;
  const { ownFingering: _old, ...rest } = m;
  return on ? { ...rest, ownFingering: true } : rest;
};

/** The player marked / unmarked an item's own fingering: the model's flag follows at once (no take needed). */
export function syncOwnFingering(own: OwnFingerings | undefined): Promise<unknown> {
  chain = chain
    .then(async () => {
      const cur = await loadModel();
      const next = withOwnFlag(cur, anyOwn(own));
      if (next === cur) return;
      cache = next;
      await kv.set('model', cache);
    })
    .catch(() => {});
  return chain;
}

// ---------------------------------------------------------------- the groove fingerprint (0.50)
import { addPerformance, emptyGroove, feedsGroove, takeGroove, type GrooveModel } from '../engine/analysis/groove';

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
