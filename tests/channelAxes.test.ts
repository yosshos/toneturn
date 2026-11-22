import { describe, expect, it } from 'vitest';
import { channelAxisValue, COURSE_SECTIONS, CHANNEL_FULL_TAKES, sectionAxes } from '../src/engine/courseSections';
import { channelCounts } from '../src/engine/drills/channel';
import type { ItemState } from '../src/engine/drills/types';

// Phase 6 (BUILD-PLAN-2026-11 §0.2, SPEC-EAR-AND-READING §4): the "by ear" and "reading" axes from take channels.
const item = (id: string, family: string, channels: ItemState['channels']): ItemState => ({ itemId: id, family: family as ItemState['family'], key: 0, hands: 'R', cleanBpm: 0, goalBpm: 60, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 0 }, takes: 1, last: '', history: [], channels });

describe('skill map axes from channels', () => {
  it('counts fresh ear takes and sight takes only', () => {
    const items = { a: item('a', 'k-ear', { 'ear-fresh': { n: 4, clean: 3, best: 80 }, 'ear-known': { n: 9, clean: 9, best: 90 } }), b: item('b', 'scales', { 'page-known': { n: 20, clean: 20, best: 100 } }) };
    expect(channelCounts(items)).toEqual({ ear: 4, reading: 0 });
  });
  it('blends with the family value while there are few channel takes, all channel from CHANNEL_FULL_TAKES on', () => {
    const few = { a: item('a', 'k-read', { 'page-sight': { n: 3, clean: 3, best: 60 } }) };
    expect(channelAxisValue('reading', few, 0)).toBeCloseTo((3 / CHANNEL_FULL_TAKES) * 1, 5);
    const many = { a: item('a', 'k-read', { 'page-sight': { n: CHANNEL_FULL_TAKES, clean: CHANNEL_FULL_TAKES / 2, best: 60 } }) };
    expect(channelAxisValue('reading', many, 0.9)).toBeCloseTo(0.5, 5);
    // under 3 takes the family value stands
    expect(channelAxisValue('ear', { a: item('a', 'k-ear', { 'ear-fresh': { n: 2, clean: 2, best: 60 } }) }, 0.2)).toBe(0.2);
    // no level passed: the channel value alone
    expect(channelAxisValue('ear', { a: item('a', 'k-ear', { 'ear-fresh': { n: 4, clean: 1, best: 60 } }) }, null)).toBe(0.25);
  });
  it('sectionAxes: page-known takes never move reading; sight takes on any family do', () => {
    const secs = COURSE_SECTIONS.keys!;
    const known = { s: item('s', 'scales', { 'page-known': { n: 30, clean: 30, best: 100 } }) };
    expect(sectionAxes(secs, known, 'en').find((a) => a.id === 'reading')!.v).toBeNull();
    const sight = { d: item('sight:k-read:2026-11-22', 'k-read', { 'page-sight': { n: 12, clean: 9, best: 60 } }) };
    const ax = sectionAxes(secs, sight, 'en');
    expect(ax.find((a) => a.id === 'reading')!.v).toBeCloseTo(0.75, 5);
    expect(ax.find((a) => a.id === 'byear')!.v).toBeNull();
    // the families stay the sections' content
    expect(secs.find((s) => s.id === 'byear')!.families).toEqual(['k-ear', 'k-phrase']);
  });
});
