// The Paper scenes (src/ui/paper/art-scenes.ts) and the last old-style drawings they replaced: the instrument sound
// cards, the first-session medal, the Tune-up / Echo intros, the path's unit-test and review nodes, the plain node
// icons (Arcade road, Practice rooms) and the trio art. One treatment: sheets with edges, no outlines, no lemon.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { echoArt, INSTRUMENT_ART, INSTRUMENT_VIEWBOX, medalArt, PATH_CHECK_ART, PATH_REPEAT_ART, TUNE_UP_ART } from '../src/ui/paper/art-scenes';
import { HUES, isYellow, type Art, type Role } from '../src/ui/paper/kit';
import { PaperSvg } from '../src/ui/paper/Paper';
import { PAPER } from '../src/ui/paper';
import { InstrumentArt } from '../src/ui/InstrumentArt';
import { NODE_GLYPH, NodeIcon } from '../src/ui/Home';
import { TrioArt } from '../src/ui/TrioArt';

const SOLID = new Set<Role>(['body', 'accent', 'light', 'ink', 'mark']);
const SCENES: [string, Art][] = [
  ...Object.entries(INSTRUMENT_ART).map(([k, a]) => [`inst:${k}`, a] as [string, Art]),
  ['medal', medalArt()],
  ['tuneup', TUNE_UP_ART],
  ['echo:melody', echoArt('melody')],
  ['echo:rhythm', echoArt('rhythm')],
  ['path:check', PATH_CHECK_ART],
  ['path:repeat', PATH_REPEAT_ART],
];
const SOUND_IDS = ['grand', 'upright', 'classic', 'wurli', 'tine', 'tonewheel', 'organ', 'vibraphone', 'marimba', 'harp', 'harpsichord'];

describe('Paper scenes', () => {
  it('every scene is mostly sheets (no stroke-only drawing), in palette hues, never lemon', () => {
    for (const [k, a] of SCENES) {
      expect(HUES[a.hue], k).toBeDefined();
      expect(HUES[a.hue2], k).toBeDefined();
      expect(isYellow(HUES[a.hue]) || isYellow(HUES[a.hue2]), k).toBe(false);
      const solid = a.parts.filter((p) => SOLID.has(p.role)).length;
      expect(solid, k).toBeGreaterThanOrEqual(3);
      // Strokes over the background (wires: staff lines, props) are details, never the drawing; strokes on sheets
      // (strings, cuts) are fine.
      expect(a.parts.filter((p) => p.role === 'wire').length, k).toBeLessThan(solid);
    }
  });

  it('renders through the one renderer: sheets with edges, colours only from the tone variables', () => {
    for (const [k, a] of SCENES) {
      const html = renderToStaticMarkup(h(PaperSvg, { art: a, cut: 'badge', viewBox: INSTRUMENT_VIEWBOX }));
      expect(html, k).toContain('class="pe"');
      const body = html.replace(/^<svg[^>]*>/, '');
      expect(body, k).not.toMatch(/(fill|stroke)="#/);
    }
  });

  it('every sound card has its Paper drawing', () => {
    for (const id of SOUND_IDS) {
      const html = renderToStaticMarkup(h(InstrumentArt, { id }));
      expect(html, id).toContain('inst-art');
      expect(html, id).toContain('class="pe"');
    }
  });

  it('the plain node icons are Paper drawings', () => {
    for (const [k, g] of Object.entries(NODE_GLYPH)) {
      expect(PAPER[g], `${k} -> ${g}`).toBeDefined();
      const html = renderToStaticMarkup(h(NodeIcon, { kind: k as keyof typeof NODE_GLYPH }));
      expect(html, k).toContain('class="pe"');
    }
  });

  it('the trio art has no outlines (edges instead), and no lemon', () => {
    const html = renderToStaticMarkup(h(TrioArt, { n: 1, left: 'C', mid: 'E', right: 'G', intervalLeft: 'M3', intervalRight: 'm3' }));
    expect(html).not.toMatch(/stroke-width="4"/);
    expect(html.toLowerCase()).not.toContain('#ffd43b');
  });

  it('the replaced old drawings are gone from their files', () => {
    for (const f of ['src/ui/InstrumentArt.tsx', 'src/ui/GameArt.tsx']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/strokeWidth=\{?["\d]/);
    const cs = readFileSync('src/ui/CourseStart.tsx', 'utf8');
    expect(cs.slice(cs.indexOf('function Medal'), cs.indexOf('function Medal') + 400)).not.toContain('stroke');
  });
});
