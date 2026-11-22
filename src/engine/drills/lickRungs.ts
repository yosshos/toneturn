// Language in the key (docs/SPEC-DAILY-WORKOUT.md §6, block G; BUILD-PLAN phase 4): every lick of the player's pool
// (vocab.lickPool: any take) is a rung of every key's ladder, built from the lick in that key on the piano — a library
// lick or the player's own as its lick drill (items lick:<id>:piano:<key>), an Encore phrase as its phrase drill, a line
// of a technique family as the family's own drill (its items unchanged: one progress with the level). Picked by need
// like every rung, in the matrix and on the key page. Pure (it only remembers the licks it was given, by id).

import type { Drill, DrillSpec } from './types';
import type { LevelDef } from './generate';
import { isMinorLick, knowLicks, lickById, lickDrill, lickTarget, type Lick } from '../licks';
import { finalHand, phraseDrill } from '../encore/phrase';

/** An Encore phrase (Lick v3) practises through its phrase drill (its own items and plan). */
const isPhrase = (l: Lick) => l.v === 3 || l.id.startsWith('enc-');

/** The lick in a key as a piano drill, with its target tempo on the spec (so the ladder, the matrix and the status agree). */
export function lickKeyDrill(l: Lick, key: number): Drill {
  if (l.src) return lickDrill(l, key, 'piano');
  const d = isPhrase(l) ? phraseDrill(l, key, finalHand(l), { inst: 'piano' }) : lickDrill(l, key, 'piano');
  const target = Math.max(d.startBpm, l.plan?.goalBpm ?? lickTarget(l));
  return { ...d, spec: { ...d.spec, target } };
}

/** A 'licks' spec (family 'licks', kind 'lick:<id>') made into its drill — the plan's generator calls this. */
export function lickSpecDrill(spec: DrillSpec): Drill {
  const l = lickById(spec.kind.replace(/^lick:/, ''));
  if (!l) throw new Error(`Unknown lick: ${spec.kind}`);
  return lickKeyDrill(l, spec.key);
}

/** Does a lick belong to the key's major or minor rows (a minor lick ends on a minor tonic). */
export const lickGroup = (l: Lick): 'major' | 'minor' => (isMinorLick(l) ? 'minor' : 'major');

/** The rung of a lick in one key: a line keeps its family level's spec; any other lick is a 'licks' spec. */
export function lickRungLevel(l: Lick, root: number, title?: (l: Lick) => { en: string; he: string }): LevelDef {
  knowLicks([l]);
  const t = title ? title(l) : l.name;
  if (l.src) return { id: `key-${root}-lick-${l.id}`, level: 0, title: t, specs: [l.src.spec as unknown as LevelDef['specs'][number]], keys: [root] };
  return { id: `key-${root}-lick-${l.id}`, level: 0, title: t, specs: [{ family: 'licks', kind: `lick:${l.id}`, hands: 'R' } as unknown as LevelDef['specs'][number]], keys: [root] };
}
