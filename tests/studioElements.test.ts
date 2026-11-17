// Studio-look design elements (2026-11-17): the share card keeps the brand and the facts; the shape cues of the note
// marks appear only in the studio look.
import { describe, expect, it } from 'vitest';
import { studioShareCardSvg, STUDIO_CARD } from '../src/ui/studio/shareCard';

describe('studio share card', () => {
  const notes = [60, 64, 67, 65, 69, 72, 71, 67].map((p, i) => ({ pitch: p, beat: i / 2 }));
  it('is a self-contained 4:5 SVG with the brand, Toni, the phrase and the facts', () => {
    const svg = studioShareCardSvg({ title: 'ii–V <F>', by: 'Ronit', bpm: 200, keys: 12, level: 4, notes, beats: 4, meter: 4, lang: 'he' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${STUDIO_CARD.w} ${STUDIO_CARD.h}"`);
    expect(svg).toContain('החוש ה־7');
    expect(svg).toContain('♩200 · 12 סולמות');
    expect(svg).toContain('&lt;F&gt;'); // escaped
    expect(svg).toContain('tp-body'); // Toni is drawn in
    expect((svg.match(/<ellipse/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });
  it('English card', () => {
    const svg = studioShareCardSvg({ title: 'Blues lick', by: 'Ronit', bpm: 132, keys: 6, level: 2, notes, beats: 4, meter: 4, lang: 'en' });
    expect(svg).toContain('The 7th Sense');
    expect(svg).toContain('♩132 · 6 keys');
  });
});
