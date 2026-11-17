// The gifts between friends in the Paper icon language (SPEC-PHRASE-STUDIO §20.1): rich drawings for the content marks
// (layered tonal sheets, no outlines), the chrome cut inside buttons drawn as sheets, and the gift UI using them.
import { describe, expect, it } from 'vitest';
import { readFileSync as readRaw } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PAPER } from '../src/ui/paper';
import { ART_GIFTS } from '../src/ui/paper/art-gifts';
import { ART_CORE } from '../src/ui/paper/art-core';
import { ART_EAR } from '../src/ui/paper/art-ear';
import { ART_DRUMS } from '../src/ui/paper/art-drums';
import { ART_GUITAR } from '../src/ui/paper/art-guitar';
import { ART_BASS } from '../src/ui/paper/art-bass';
import { ART_KEYS } from '../src/ui/paper/art-keys';
import { ART_VOICE } from '../src/ui/paper/art-voice';
import { CHROME } from '../src/ui/paper/art-chrome';
import { PaperSvg } from '../src/ui/paper/Paper';
import { GiftArt } from '../src/ui/encore/Gifts';

const read = (f: string) => readRaw(f, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const NAMES = ['gift', 'gift-fermata', 'gift-dedicate', 'gift-together'];
const SHEETS = new Set(['body', 'accent', 'light', 'ink', 'mark']);

describe('gift drawings (Paper)', () => {
  it('the four gift drawings are registered and drawn once', () => {
    for (const k of NAMES) expect(PAPER[k], k).toBe(ART_GIFTS[k]);
    for (const set of [ART_CORE, ART_EAR, ART_DRUMS, ART_GUITAR, ART_BASS, ART_KEYS, ART_VOICE]) for (const k of NAMES) expect(set[k], k).toBeUndefined();
  });

  it('layered tonal sheets: a light sheet, body and accent sheets, the note-head motif; thin strokes only as detail', () => {
    for (const k of NAMES) {
      const ps = ART_GIFTS[k].parts;
      const roles = new Set(ps.map((p) => p.role));
      for (const r of ['light', 'body', 'accent']) expect(roles.has(r as never), `${k}: ${r}`).toBe(true);
      // most of the drawing is sheets, not lines
      const always = ps.filter((p) => (p.lod ?? 0) === 0);
      expect(always.filter((p) => SHEETS.has(p.role)).length, k).toBeGreaterThanOrEqual(Math.ceil(always.length * 0.6));
      // the motif: a −20° tilted head
      expect(ps.some((p) => p.t === 'ellipse' && /^rotate\(-20 /.test(String(p.a.transform ?? ''))), k).toBe(true);
      // no outline strokes on the background in the small cut (wires / dashes are detail only)
      for (const p of always) expect(['wire', 'dash', 'line'], `${k}: ${p.role}`).not.toContain(p.role);
    }
  });

  it('renders through the one renderer with edges, in every cut', () => {
    for (const k of NAMES)
      for (const cut of ['small', 'full', 'badge'] as const) {
        const html = renderToStaticMarkup(h(PaperSvg, { art: ART_GIFTS[k], cut }));
        expect(html, k).toContain('class="pe"');
        expect(html, k).not.toMatch(/(fill|stroke)="#/);
      }
    const g = renderToStaticMarkup(h(GiftArt, { kind: 'fermata', size: 20 }));
    expect(g).toContain('gift-art-fermata');
    expect(g).toContain('pp-small');
  });

  it('the chrome cut of the gifts is sheets: no strip arcs, no cut-out lines; a dedication symbol exists', () => {
    for (const k of ['fermata', 'gift', 'dedicate'] as const) {
      const ps = CHROME[k].parts;
      for (const p of ps) expect(['tube', 'line', 'accentline'], `${k}: ${p.role}`).not.toContain(p.role);
    }
    expect(CHROME.together.parts.some((p) => p.role === 'accent')).toBe(true);
  });

  it('the gift screens use the drawings beside text and the chrome symbols in buttons', () => {
    const gifts = read('src/ui/encore/Gifts.tsx');
    expect(gifts).toMatch(/<GiftArt kind="fermata"/);
    expect(gifts).toMatch(/<GiftArt kind="together"/);
    expect(gifts).toMatch(/<GiftArt kind="dedicate"/);
    expect(gifts).toContain('<Icon k="dedicate"');
    expect(read('src/ui/encore/Together.tsx')).toContain('<GiftArt kind="together"');
  });
});
