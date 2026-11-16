// The Paper icon language (src/ui/paper): one renderer, one treatment, the 48 grid, readable tones in both themes,
// unique step drawings, a simplified cut for the nav, and every badge drawn.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BADGES } from '../src/engine/badges';
import { COURSES } from '../src/engine/courses';
import { glyphKeyOf } from '../src/ui/BadgeArt';
import { Glyph, GLYPHS, paperFallbacks } from '../src/ui/Glyph';
import { PAPER } from '../src/ui/paper';
import { ART_CORE, navArt } from '../src/ui/paper/art-core';
import { ART_EAR } from '../src/ui/paper/art-ear';
import { ART_DRUMS } from '../src/ui/paper/art-drums';
import { ART_GUITAR } from '../src/ui/paper/art-guitar';
import { ART_BASS } from '../src/ui/paper/art-bass';
import { ART_KEYS } from '../src/ui/paper/art-keys';
import { ART_VOICE } from '../src/ui/paper/art-voice';
import { badgePaper, BADGE_ONLY } from '../src/ui/paper/art-badge';
import { contrast, HUES, isYellow, tones, type Art } from '../src/ui/paper/kit';
import { paperParts, PaperSvg } from '../src/ui/paper/Paper';
import { BONUS_STEP_GLYPH, FAMILY_GLYPH, GAME_STEP_GLYPH, LESSON_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';

const ROLES = new Set(['body', 'accent', 'light', 'ink', 'mark', 'line', 'inkline', 'wire', 'accentline', 'tube', 'dash', 'shine']);
const SHAPES = new Set(['ellipse', 'rect', 'path', 'circle', 'line', 'text', 'polygon']);
const ALL: [string, Art][] = [...Object.entries(PAPER), ...Object.entries(BADGE_ONLY)];

describe('Paper glyph set', () => {
  it('every glyph name renders (Paper, or its old drawing as a listed fallback)', () => {
    for (const k of Object.keys(GLYPHS)) {
      const html = renderToStaticMarkup(h(Glyph, { kind: k, size: 46 }));
      expect(html.startsWith('<span'), k).toBe(true);
      expect(html, k).toContain('<svg');
    }
    // At the redraw every glyph had a drawing; names appended later fall back (and should be drawn).
    const fb = paperFallbacks();
    if (fb.length) console.warn('glyphs without a Paper drawing:', fb.join(' '));
    expect(fb.length).toBeLessThan(10);
  });

  it('no name is drawn twice across the art files', () => {
    const seen = new Map<string, string>();
    for (const [file, set] of Object.entries({ ART_CORE, ART_EAR, ART_DRUMS, ART_GUITAR, ART_BASS, ART_KEYS, ART_VOICE }))
      for (const k of Object.keys(set)) {
        expect(seen.get(k), `${k} in ${file} and ${seen.get(k)}`).toBeUndefined();
        seen.set(k, file);
      }
  });

  it('every drawing uses only the shared parts and treatment, on the 48 grid', () => {
    for (const [k, a] of ALL) {
      expect(HUES[a.hue], k).toBeDefined();
      expect(HUES[a.hue2], k).toBeDefined();
      expect(a.parts.length, k).toBeGreaterThanOrEqual(3);
      for (const p of a.parts) {
        expect(ROLES.has(p.role), `${k}: ${p.role}`).toBe(true);
        expect(SHAPES.has(p.t), `${k}: ${p.t}`).toBe(true);
        for (const [att, v] of Object.entries(p.a)) if (typeof v === 'number' && /^(c?[xy]\d?|r[xy]?)$/.test(att)) expect(v, `${k}.${att}`).toBeGreaterThanOrEqual(-3), expect(v, `${k}.${att}`).toBeLessThanOrEqual(51);
      }
      for (const cut of ['small', 'full', 'badge'] as const) {
        const html = renderToStaticMarkup(h(PaperSvg, { art: a, cut }));
        expect(html, k).toContain('viewBox="0 0 48 48"');
        // Parts paint only through the surface variables (no literal colours on a part).
        const body = html.replace(/^<svg[^>]*>/, '');
        expect(body, `${k} ${cut}`).not.toMatch(/(fill|stroke)="#|(fill|stroke):\s*#/);
        for (const m of body.matchAll(/style="([^"]*)"/g)) expect(m[1], k).toMatch(/^(fill|stroke):var\(--p[a-zA-Z]+, var\(--[a-zA-Z]+\)\)$/);
      }
    }
  });

  it('never lemon on light, and the tones read on light cards, dark cards and the dark bar', () => {
    for (const [k, a] of ALL) {
      for (const h0 of [a.hue, a.hue2]) expect(isYellow(HUES[h0]), `${k}: ${h0}`).toBe(false);
      const L = tones(HUES[a.hue], HUES[a.hue2], 'light');
      for (const t of Object.values(L)) expect(isYellow(t), `${k} light tone ${t}`).toBe(false);
      // Free marks and wires sit on the background: ג‰¥ 3:1 against the card in both themes and against the bar.
      expect(contrast(L.f, '#ffffff'), k).toBeGreaterThanOrEqual(3);
      const K = tones(HUES[a.hue], HUES[a.hue2], 'dark');
      for (const bg of ['#241540', '#140a24', '#07030f']) {
        expect(contrast(K.f, bg), `${k} on ${bg}`).toBeGreaterThanOrEqual(3);
        expect(contrast(K.b, bg), `${k} body on ${bg}`).toBeGreaterThanOrEqual(2.5);
      }
      // Details on the light tint stay legible.
      expect(contrast(L.d, L.l), k).toBeGreaterThanOrEqual(3);
    }
  });

  it('every path step keeps its own drawing (distinct kinds draw distinctly)', () => {
    const kinds = new Set<string>([...Object.values(FAMILY_GLYPH), ...Object.values(TOPIC_GLYPH), ...Object.values(GAME_STEP_GLYPH), ...Object.values(LESSON_GLYPH), ...Object.values(BONUS_STEP_GLYPH)]);
    const byDrawing = new Map<string, string>();
    for (const k of kinds) {
      const a = PAPER[k];
      expect(a, k).toBeDefined();
      // Marks are unique per course path by their text (tests/earTheoryAudit.test.ts); some texts recur across courses.
      if (k.startsWith('m:')) continue;
      expect(a, k).toBeDefined();
      const sig = JSON.stringify(a);
      expect(byDrawing.get(sig), `${k} draws like ${byDrawing.get(sig)}`).toBeUndefined();
      byDrawing.set(sig, k);
    }
  });

  it('nav glyphs have a simplified cut; courses and Encore are drawn', () => {
    for (const id of ['home', 'path', 'arcade', 'skills', 'friends', 'tools', 'achievements']) {
      const a = navArt(id, 16)!;
      expect(a, id).toBeTruthy();
      expect(paperParts(a, 'small').length, id).toBeLessThan(paperParts(a, 'badge').length);
    }
    for (const c of COURSES) expect(PAPER[c.glyph], c.id).toBeDefined();
    expect(PAPER.encore).toBeDefined();
  });

  it('every badge has a Paper drawing', () => {
    for (const b of BADGES) expect(badgePaper(glyphKeyOf(b)), `${b.id} ג†’ ${glyphKeyOf(b)}`).toBeTruthy();
  });
});
