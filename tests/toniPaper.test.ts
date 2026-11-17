import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { Toni } from '../src/ui/Toni';
import { FLAG_COLORS, POSES, TONI_BASE_STATES, TONI_EXTRA_STATES, TONI_MOODS, ToniPaper, toBase } from '../src/ui/ToniPaper';

const CSS = readFileSync('src/toni.css', 'utf8');

describe('Paper Toni', () => {
  it('has the 12 classic states plus the extra moods', () => {
    expect(TONI_BASE_STATES).toHaveLength(12);
    expect(TONI_EXTRA_STATES).toEqual(['proud', 'focused', 'encouraging', 'celebrating', 'curious']);
    for (const s of TONI_MOODS) expect(POSES[s], s).toBeDefined();
    for (const s of TONI_EXTRA_STATES) expect(TONI_BASE_STATES).toContain(toBase(s));
  });

  it('every state renders the Paper Toni (also with no document: server render)', () => {
    for (const s of TONI_MOODS) {
      const html = renderToStaticMarkup(h(Toni, { state: s, size: 48 }));
      expect(html, s).toContain(`toni toni-p s-${s}`);
      expect(html, s).not.toContain('data-look');
    }
  });

  it('body sheets carry no stroke outline; no cheeks, no feet', () => {
    for (const s of TONI_MOODS) {
      const html = renderToStaticMarkup(h(ToniPaper, { state: s }));
      const sheets = html.match(/<(rect|ellipse|path|circle)[^>]*class="tp-sheet"[^>]*>/g) ?? [];
      expect(sheets.length, s).toBeGreaterThanOrEqual(6); // stem, flag, head, each with its edge copy
      for (const el of sheets) expect(el, s).not.toMatch(/stroke/);
      // the head and stem sheets are lilac, each over a darker edge copy shifted down
      expect(html, s).toMatch(/class="tp-sheet"[^>]*fill="#5d3fbf" transform="translate\(0 3.6\)/);
      expect(html, s).not.toMatch(/#ff5fa2/i); // the classic pink cheeks
    }
  });

  it('wrong waves a raspberry-red flag; correct a teal one', () => {
    expect(FLAG_COLORS.wrong).toEqual(['#e23a5a', '#9c1d3a']);
    expect(FLAG_COLORS.correct).toEqual(['#3fe0c9', '#0d8f80']);
    const wrong = renderToStaticMarkup(h(ToniPaper, { state: 'wrong' }));
    expect(wrong).toContain('fill="#e23a5a"');
    expect(wrong).toContain('fill="#9c1d3a"');
    expect(renderToStaticMarkup(h(ToniPaper, { state: 'correct' }))).toContain('fill="#3fe0c9"');
  });

  it('headphones in every state but sleepy', () => {
    for (const s of TONI_MOODS) expect(renderToStaticMarkup(h(ToniPaper, { state: s })).includes('tp-phones'), s).toBe(s !== 'sleepy');
  });

  it('every state has its own motion in toni.css; reduced motion stops it all', () => {
    for (const s of TONI_MOODS) expect(CSS, s).toMatch(new RegExp(`\\.toni-p\\.s-${s} \\.tp-body \\{ animation:`));
    expect(CSS).toMatch(/:root\[data-motion='reduced'\] \.toni-p \*[^{]*\{\s*animation: none !important;/);
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.toni-p,\s*\.toni-p \* \{\s*animation: none !important;/);
    // origins set: body about its base, flag about the stem top
    expect(CSS).toContain('transform-origin: 94px 188px');
    expect(CSS).toContain('transform-origin: 139px 30px');
  });

  it('one-shot gestures run under a second', () => {
    // every animation that is not infinite (one-shots) lasts < 1 s
    const decls = [...CSS.matchAll(/animation: ([^;]+);/g)].flatMap((m) => m[1].split(/,(?![^(]*\))/));
    const oneShots = decls.filter((d) => d.trim() !== 'none !important' && !/infinite/.test(d));
    expect(oneShots.length).toBeGreaterThan(10);
    for (const d of oneShots) {
      const [dur] = d.trim().match(/[\d.]+s/) ?? ['0s'];
      const n = d.match(/\s(\d)(\s|$)/);
      const total = parseFloat(dur) * (n ? Number(n[1]) : 1);
      expect(total, d).toBeLessThan(1);
    }
  });
});
