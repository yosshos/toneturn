import { describe, expect, it } from 'vitest';
import { itemStatus, unitStatus, channelProfile, defaultChannel } from '../src/engine/drills/itemStatus';
import { applyTake, newItem } from '../src/engine/drills/ladder';
import { generate } from '../src/engine/drills/generate';
import type { ItemState, TakeMetrics } from '../src/engine/drills/types';

const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'R', scale: 'major', tempo: 60 } as never);
const clean = { verdict: 'clean', accuracy: 1, timingSD: 5, handsAbs: null } as unknown as TakeMetrics;

describe('one status (BUILD-PLAN D1): closed = 3 clean takes at ≥ 95 % of target on 2 days', () => {
  it('new → learning → almost → closed', () => {
    expect(itemStatus(undefined, 60, 80)).toBe('new');
    let st: ItemState = newItem(d);
    st = applyTake(st, clean, 62, '2026-11-20T10:00:00Z', undefined, { targetBpm: 80 }).state;
    expect(itemStatus(st, 60, 80)).toBe('learning');
    st = { ...st, goalBpm: 80 };
    st = applyTake(st, clean, 80, '2026-11-20T10:05:00Z', undefined, { targetBpm: 80 }).state;
    expect(itemStatus(st, 60, 80)).toBe('almost');
    st = applyTake({ ...st, goalBpm: 80 }, clean, 80, '2026-11-20T10:10:00Z', undefined, { targetBpm: 80 }).state;
    expect(itemStatus(st, 60, 80)).toBe('almost'); // two takes, one day
    st = applyTake({ ...st, goalBpm: 80 }, clean, 80, '2026-11-21T09:00:00Z', undefined, { targetBpm: 80 }).state;
    expect(itemStatus(st, 60, 80)).toBe('closed');
  });
  it('a unit is its weakest item, at least learning once anything is played', () => {
    expect(unitStatus(['closed', 'almost'])).toBe('almost');
    expect(unitStatus(['new', 'closed'])).toBe('learning');
    expect(unitStatus(['new', 'new'])).toBe('new');
  });
});

describe('the take channel (SPEC-EAR-AND-READING §1)', () => {
  it('applyTake tallies the channel and active time; the default is page-known', () => {
    const st = applyTake(newItem(d), clean, 60, '2026-11-20T10:00:00Z', undefined, { channel: 'ear-fresh', activeMs: 9000 }).state;
    expect(st.channels?.['ear-fresh']).toEqual({ n: 1, clean: 1, best: 60 });
    expect(st.activeMs).toBe(9000);
    const st2 = applyTake(st, clean, 62, '2026-11-20T10:01:00Z').state;
    expect(st2.channels?.['page-known']?.n).toBe(1);
  });
  it('an ear family is ear-fresh on its first take; a reading family is sight on its first take; a coached drill is page-known', () => {
    expect(defaultChannel({ spec: { family: 'k-ear' } } as never, undefined)).toBe('ear-fresh');
    expect(defaultChannel({ spec: { family: 'k-read' } } as never, undefined)).toBe('page-sight');
    expect(defaultChannel({ spec: { family: 'k-read' } } as never, { takes: 2 } as ItemState)).toBe('page-known');
    expect(defaultChannel({ spec: { family: 'scales' } } as never, undefined)).toBe('page-known');
  });
  it('the profile counts only fresh ear and sight takes, shrunk toward the 1–5 self-rating', () => {
    const items: Record<string, ItemState> = {
      a: { channels: { 'ear-fresh': { n: 10, clean: 9, best: 90 }, 'page-known': { n: 50, clean: 50, best: 120 } } } as ItemState,
      b: { channels: { 'page-sight': { n: 10, clean: 3, best: 60 } } } as ItemState,
    };
    const p = channelProfile(items);
    expect(p.ear!).toBeCloseTo(0.9);
    expect(p.reading!).toBeCloseTo(0.3);
    expect(channelProfile({}, { ear: 5, reading: 2 })).toEqual({ ear: 1, reading: 0.25 });
    expect(channelProfile({}).ear).toBeNull();
  });
});
