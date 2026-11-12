import { describe, expect, it } from 'vitest';
import { createElement as h, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BADGES, GUITAR_BADGE_FAMILIES } from '../src/engine/badges';
import { BadgeArt, glyphKeyOf, GLYPHS, registerFamilyGlyph, resolveGlyph } from '../src/ui/BadgeArt';
import { BadgeUnlock, RankUpUnlock } from '../src/ui/BadgeUnlock';

const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

describe('glyph registry', () => {
  it('every badge resolves to a glyph; no fallback for area / skill / technique / special', () => {
    for (const b of BADGES) {
      const r = resolveGlyph(b);
      expect(typeof r.glyph, b.id).toBe('function');
      if (['area', 'skill', 'technique', 'special', 'season', 'sub'].includes(b.cat)) expect(r.fallback, `${b.id} → ${r.key}`).toBe(false);
    }
  });
  it('sub-skill badges reuse their skill glyph', () => {
    for (const b of BADGES.filter((x) => x.cat === 'sub')) expect(glyphKeyOf(b), b.id).toBe(`skill:${b.group}`);
  });
  it('every guitar family and guitar special has its own drawn glyph (not the generic guitar)', () => {
    for (const f of GUITAR_BADGE_FAMILIES) {
      const lv = resolveGlyph({ id: `tech:${f}:1`, cat: 'technique', group: f });
      expect(lv.key, f).toBe(`family:${f}`);
      expect(GLYPHS[lv.key], f).toBeDefined();
      expect(lv.glyph, f).not.toBe(GLYPHS['family:guitar']);
    }
    const specials = BADGES.filter((b) => /^tech:g-[^:]+$/.test(b.id));
    expect(specials.length).toBeGreaterThanOrEqual(5);
    for (const b of specials) expect(GLYPHS[glyphKeyOf(b)], b.id).toBeDefined();
    const fams = new Set(GUITAR_BADGE_FAMILIES.map((f) => GLYPHS[`family:${f}`]));
    expect(fams.size).toBe(GUITAR_BADGE_FAMILIES.length);
  });
  it('level pips follow the family length', () => {
    // g-impro has 7 levels since the guitar trade (g-impro 7).
    const b = BADGES.find((x) => x.id === 'tech:g-impro:2')!;
    const html = renderToStaticMarkup(h(BadgeArt, { badge: b, earned: true }));
    expect([...html.matchAll(/cy="13.2"/g)].length).toBe(7);
  });
  it('unknown guitar families get the guitar glyph, and new families can register one', () => {
    const g = resolveGlyph({ id: 'tech:g-strum:1', cat: 'technique', group: 'g-strum' });
    expect(g.fallback).toBe(false);
    expect(g.glyph).toBe(GLYPHS['family:guitar']);
    const mine = () => null;
    registerFamilyGlyph('g-barre', mine);
    expect(resolveGlyph({ id: 'tech:g-barre:2', cat: 'technique', group: 'g-barre' }).glyph).toBe(mine);
  });
});

describe('BadgeArt', () => {
  it('renders every badge, earned and locked, as an accessible svg', () => {
    for (const b of BADGES)
      for (const earned of [true, false]) {
        const html = renderToStaticMarkup(h(BadgeArt, { badge: b, earned, size: 48 }));
        expect(html.startsWith('<svg'), b.id).toBe(true);
        expect(html, b.id).toContain('role="img"');
        expect(html, b.id).toContain('aria-label=');
        expect(html, b.id).not.toMatch(/\p{Extended_Pictographic}/u);
        if (!earned) expect(html, b.id).toContain('(locked)');
      }
  });
  it('gradient ids are unique across many instances in one tree', () => {
    const html = renderToStaticMarkup(h(Fragment, null, ...BADGES.map((b, i) => h(BadgeArt, { key: b.id, badge: b, earned: i % 2 === 0 }))));
    const all = ids(html);
    expect(all.length).toBeGreaterThan(BADGES.length * 4);
    expect(new Set(all).size).toBe(all.length);
    for (const ref of html.matchAll(/url\(#([^)]+)\)/g)) expect(all, ref[1]).toContain(ref[1]);
  });
  it('decorative mode hides from assistive tech; Hebrew label', () => {
    expect(renderToStaticMarkup(h(BadgeArt, { badge: BADGES[0], earned: true, decorative: true }))).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(h(BadgeArt, { badge: BADGES[0], earned: false, lang: 'he' }))).toContain(BADGES[0].name.he);
  });
});

describe('BadgeUnlock', () => {
  it('renders the first badge with a counter and the rank variant with its label', () => {
    const html = renderToStaticMarkup(h(BadgeUnlock, { badges: BADGES.slice(0, 5), lang: 'en', onDone: () => {} }));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('1/3');
    expect(html).toContain('Nice!');
    const r = renderToStaticMarkup(h(RankUpUnlock, { change: { area: 'time', to: 7, kind: 'up' }, lang: 'en', onDone: () => {} }));
    expect(r).toContain('Gold II in Rhythm &amp; time');
  });
});
