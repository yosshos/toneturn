// The channel an assignment requires (SPEC-PATH-TODAY-PRACTICE §5.2, owner): free / from the page / by ear / from
// memory. The grading checks the channel — a take played with the notation shown does not meet "by ear", and a take in
// another channel does not count toward the assignment. Pure.

import type { ItemState } from './drills/types';

export type AssignChannel = 'free' | 'page' | 'ear' | 'memory';
export type TakeChannel = keyof NonNullable<ItemState['channels']>;

/** The channels of the take event (BUILD-PLAN §0.2) that meet a required channel. */
export const CHANNEL_MEETS: Record<AssignChannel, TakeChannel[] | null> = {
  free: null,
  page: ['page-sight', 'page-known'],
  ear: ['ear-fresh', 'ear-known'],
  memory: ['unaided'],
};

/** The channel of the take that turned `prev` into `next` (the channel whose count grew; null: unknown). */
export function takeChannel(prev: Pick<ItemState, 'channels'> | undefined, next: Pick<ItemState, 'channels'>): TakeChannel | null {
  for (const [k, v] of Object.entries(next.channels ?? {}) as [TakeChannel, { n: number }][]) if ((v?.n ?? 0) > (prev?.channels?.[k]?.n ?? 0)) return k;
  return null;
}

/** Does a take in channel `ch` count toward an assignment requiring `req`? (free: any take, even of unknown channel.) */
export function meetsChannel(req: AssignChannel | undefined, ch: TakeChannel | null): boolean {
  const ok = CHANNEL_MEETS[req ?? 'free'];
  return !ok || (!!ch && ok.includes(ch));
}

/** The assignment's tally: only the takes in the required channel count. */
export interface ChannelTally {
  takes: number;
  clean: number;
  /** Takes played in another channel (not counted; the result says so). */
  other: number;
}
export const emptyTally = (): ChannelTally => ({ takes: 0, clean: 0, other: 0 });
export function tallyTake(t: ChannelTally, req: AssignChannel | undefined, ch: TakeChannel | null, clean: boolean): ChannelTally {
  return meetsChannel(req, ch) ? { ...t, takes: t.takes + 1, clean: t.clean + (clean ? 1 : 0) } : { ...t, other: t.other + 1 };
}

export const CHANNEL_WORD: Record<AssignChannel, { en: string; he: string }> = {
  free: { en: 'Any way', he: 'בכל דרך' },
  page: { en: 'From the page', he: 'מהדף' },
  ear: { en: 'By ear', he: 'משמיעה' },
  memory: { en: 'From memory', he: 'מהזיכרון' },
};
