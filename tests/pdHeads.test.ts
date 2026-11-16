// Public-domain heads (docs/AUDIT-DEPTH-3.md §3): served PD melodies are PD worldwide and carry the PD source they were
// checked against note for note (a Mutopia Project LilyPond file with a "Public Domain" licence line).
import { describe, expect, it } from 'vitest';
import { HEADS, servedHeads } from '../src/content/heads';
import { parseMelody } from '../src/engine/heads';

/** The first bar of each checked melody (MIDI): a regression anchor against the source. */
const FIRST_BAR: Record<string, number[]> = {
  // G4 G4 G4 G4 B♭4 G4 ("Hard times …" verse, after the E♭ F pickup)
  'hard-times': [67, 67, 67, 67, 70, 67],
  // C5 C5 C5 C5 ("There's music in the air", after the E♭ pickup)
  'music-in-the-air': [72, 72, 72, 72],
};

describe('public-domain heads', () => {
  const pd = servedHeads().filter((h) => h.licence.kind === 'pd-worldwide');
  it('at least two PD melodies are served', () => {
    expect(pd.length).toBeGreaterThanOrEqual(2);
  });
  it('PD worldwide: every composer died 1955 or earlier, published 1930 or earlier, a PD-licensed source URL', () => {
    for (const h of pd) {
      if (h.licence.kind !== 'pd-worldwide') continue;
      expect(h.licence.published, h.id).toBeLessThanOrEqual(1930);
      for (const c of h.licence.composers) expect(c.died, `${h.id} ${c.name}`).toBeLessThanOrEqual(1955);
      expect(h.licence.source, h.id).toMatch(/^https:\/\/www\.mutopiaproject\.org\/ftp\/.+\.ly/);
      expect(h.licence.source, h.id).toContain('Public Domain');
    }
  });
  it('every bar 4 beats; the first bar matches the source', () => {
    for (const h of pd) {
      const p = parseMelody(h.melody!);
      expect(p.errors, h.id).toEqual([]);
      p.barBeats.forEach((b, i) => expect(b, `${h.id} bar ${i + 1}`).toBeCloseTo(4, 6));
      expect(FIRST_BAR[h.id], `${h.id}: add its first bar to FIRST_BAR`).toBeTruthy();
      expect(p.notes.filter((n) => n.beat < 4 - 1e-6).map((n) => n.pitch), h.id).toEqual(FIRST_BAR[h.id]);
    }
  });
  it('appended after the earlier heads (option order kept)', () => {
    const ids = HEADS.map((h) => h.id);
    expect(ids.slice(0, 9)).toEqual(['corner-bench', 'long-way-round', 'back-porch', 'night-ferry', 'quiet-hours', 'indiana', 'love-me-or-leave-me', 'mean-to-me', 'my-blue-heaven']);
  });
});
