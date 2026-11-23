// A path step that requires a channel (docs/SPEC-PATH-TODAY-PRACTICE.md §4.4, owner 2026-11-22): a step is learned in
// the player's strong channel (SPEC-EAR-AND-READING) unless it says "this one by ear" or "from memory". Then only clean
// takes in that channel open it, and its run plays it that way (channelPlan.runPresentation's `force`). Pure.

import type { ItemState } from './drills/types';

export type StepChannel = 'ear' | 'memory';

/**
 * The steps that require a channel, by step id ("tech:<level id>"). Deliberately empty (owner 2026-11-23): the channel
 * stays dynamic, following the player's strong channel, rather than being pinned to specific steps. The mechanism is
 * kept for a future exception.
 */
export const STEP_CHANNEL: Record<string, StepChannel> = {};

/** A step's required channel: its own field, else the table. */
export const stepChannelOf = (s: { id: string; channel?: StepChannel }, table: Record<string, StepChannel> = STEP_CHANNEL): StepChannel | undefined => s.channel ?? table[s.id];

/** A clean take in the channel: by ear (fresh or known) / from memory (unaided). */
export const cleanIn = (st: ItemState | undefined, ch: StepChannel): boolean =>
  ch === 'ear' ? (st?.channels?.['ear-fresh']?.clean ?? 0) + (st?.channels?.['ear-known']?.clean ?? 0) > 0 : (st?.channels?.unaided?.clean ?? 0) > 0;

/** The items as the step sees them: an item never played clean in the channel counts as not played clean at all. */
export function inChannel(items: Record<string, ItemState>, ch: StepChannel): Record<string, ItemState> {
  const out: Record<string, ItemState> = {};
  for (const [k, st] of Object.entries(items)) out[k] = cleanIn(st, ch) ? st : { ...st, cleanBpm: 0, passLog: [], history: [] };
  return out;
}
