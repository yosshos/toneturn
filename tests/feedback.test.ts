import { describe, expect, it } from 'vitest';
import { remarksFor, offsetRemark } from '../src/engine/feedback';
import { synthHold } from '../src/engine/vocal';
import { remarkText } from '../src/game/content';

describe('precise singing feedback (W)', () => {
  it('offset categories', () => {
    expect(offsetRemark(5)).toBe('spot');
    expect(offsetRemark(-18)).toBe('touch-flat');
    expect(offsetRemark(35)).toBe('bit-sharp');
    expect(offsetRemark(-70)).toBe('quite-flat');
  });
  it('a steady note is spot on; a flat one is a bit flat', () => {
    expect(remarksFor(synthHold(60, { seconds: 2, jitter: 2 }), 60)).toEqual(['spot']);
    expect(remarksFor(synthHold(60, { seconds: 2, cents: -35 }), 60)[0]).toBe('bit-flat');
  });
  it('going sharp at the end', () => {
    const r = remarksFor(synthHold(60, { seconds: 2, driftPerSec: 25 }), 60);
    expect(r).toContain('end-sharp');
  });
  it('sliding up into the note', () => {
    expect(remarksFor(synthHold(60, { seconds: 1.5, scoop: -150 }), 60)).toContain('scoop-up');
  });
  it('sentences in both languages', () => {
    expect(remarkText(['bit-flat', 'end-sharp'], 'en')).toBe('That was a bit flat, and you went sharp at the end.');
    expect(remarkText(['spot'], 'he')).toBe('מדויק!');
    expect(remarkText(['quite-sharp'], 'he')).toContain('גבוה מדי');
  });
});
