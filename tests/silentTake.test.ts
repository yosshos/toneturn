import { describe, expect, it } from 'vitest';
import { silentTake } from '../src/ui/DrillTake';

describe('silent take (owner 2026-11-28)', () => {
  it('a take with no input on an item with notes is a technical failure', () => {
    expect(silentTake({ notes: [{ pitch: 60, beat: 0, dur: 1, hand: 'R' }] as never }, [])).toBe(true);
  });
  it('any input at all is graded as usual', () => {
    expect(silentTake({ notes: [{ pitch: 60, beat: 0, dur: 1, hand: 'R' }] as never }, [{ pitch: 61 }])).toBe(false);
  });
  it('an item that expects no notes is never voided', () => {
    expect(silentTake({ notes: [] }, [])).toBe(false);
  });
});
