// The target tempo of a level's item (A4), apart from plan.ts so that modules in the catalog's import cycle (licks.ts:
// the line families as licks) can use it. Pure.

import type { Drill } from './types';
import type { LevelDef } from './generate';
import { notesPerBeat } from './analyze';

/** Levels without a stated tempo range: the target is the start tempo + 25 % (about one tempo band). */
export const DEFAULT_TARGET_FACTOR = 1.25;

/**
 * The level's target tempo for one of its items (A4): the level's stated target (bass levels: `tempo[1]`, never below
 * the item's own start), else the start tempo × DEFAULT_TARGET_FACTOR.
 */
export function targetBpmOf(level: LevelDef | undefined, drill: Drill): number {
  // Untimed items (B10 note finding, N3) have no tempo: they are off the tempo ladder (target = start), so they pass on
  // 3 clean takes on 2 days and never move a goal tempo.
  if (drill.untimed) return drill.startBpm;
  // GUITAR_DEEPENING §2.2: an item's own target (never below its start); equal to the start = off the ladder.
  if (drill.spec.target !== undefined) return Math.max(drill.startBpm, drill.spec.target);
  const range = (level as (LevelDef & { tempo?: [number, number] }) | undefined)?.tempo;
  // Eighth-pulse items (7/8, 10/8: ♪ = bpm, N9) start in eighths while the level's range is in quarters: they climb
  // the same ratio as the range from their own start, so they have a ladder too.
  if (range && drill.pulse === 8 && range[0] > 0) return Math.max(drill.startBpm, Math.round((drill.startBpm * range[1]) / range[0]));
  if (range) return Math.max(drill.startBpm, range[1]);
  // Piano levels with an exam speed (PIANO_AUDIT T1): the target in notes per second, whatever the item's note value.
  const nps = level?.nps;
  if (nps) return Math.max(drill.startBpm, Math.min(240, Math.round((nps[1] * 60) / notesPerBeat(drill))));
  return Math.round(drill.startBpm * DEFAULT_TARGET_FACTOR);
}

