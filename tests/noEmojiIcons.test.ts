// Mature UI (2026-11-12): topic groups and badges name symbols of the glyph set, never emoji.
import { describe, expect, it } from 'vitest';
import { TOPIC_GROUPS } from '../src/engine/topicGroups';
import { BADGES } from '../src/engine/badges';
import { GLYPHS } from '../src/ui/Glyph';

const EMOJI = /\p{Extended_Pictographic}/u;

describe('no emoji icons', () => {
  it('every topic group names a glyph', () => {
    for (const g of TOPIC_GROUPS) {
      expect(EMOJI.test(g.icon), g.id).toBe(false);
      expect(GLYPHS[g.icon], g.id).toBeTruthy();
    }
  });
  it('no badge icon is an emoji', () => {
    for (const b of BADGES) expect(EMOJI.test(b.icon), `${b.id} ${b.icon}`).toBe(false);
  });
});
