// The Paper chrome cut (owner 2026-11-16): every control symbol is a Paper drawing rendered by the one renderer, made of
// sheets and thick strips (no hairlines), reading on every button surface in both themes (≥ 3:1, never yellow on
// white), with a tap motion of the vocabulary; and no text glyph or thin line icon is left standing in for one.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync as readRaw, statSync } from 'node:fs';
// CRLF checkouts (Windows) read as LF so CSS/selector matching is stable.
const readFileSync = (f: string, enc: 'utf8') => readRaw(f, enc).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '../src/ui/icons';
import { CHROME, CHROME_KEYS, CHROME_MIRROR } from '../src/ui/paper/art-chrome';
import { contrast, isYellow } from '../src/ui/paper/kit';
import { MOTION_MS, motionsOf } from '../src/ui/paper/motion';
import { CHROME_EDGE, PaperSvg } from '../src/ui/paper/Paper';

describe('chrome symbols', () => {
  it('every symbol renders through the shared renderer as a chrome cut', () => {
    expect(CHROME_KEYS.length).toBeGreaterThan(80);
    for (const k of CHROME_KEYS) {
      const html = renderToStaticMarkup(h(Icon, { k, size: 16 }));
      expect(html, k).toMatch(/^<svg class="pp pp-chrome/);
      expect(html, k).toContain(`ico-${k}`);
      expect(html, k).toContain('viewBox="0 0 48 48"');
      expect(html, k).toContain('aria-hidden="true"');
      // a sheet and its edge (class pe) 3 units below
      expect(html, k).toContain('class="pe"');
      expect(html, k).toContain(`translate(0 ${CHROME_EDGE})`);
      // painted only through the chrome ramp variables (src/paper.css), never a fixed colour
      for (const m of html.matchAll(/style="([^"]*)"/g)) if (!m[1].startsWith('stroke:none')) expect(m[1], k).toMatch(/^(fill|stroke):var\(--c(s|e|a|ae|l),/);
      expect(renderToStaticMarkup(h(PaperSvg, { art: CHROME[k], cut: 'chrome', width: 24 })), k).toContain('pp-chrome');
    }
  });

  it('2–4 parts (5 at most), sheets and thick strips: no hairline strokes', () => {
    for (const k of CHROME_KEYS) {
      const ps = CHROME[k].parts;
      expect(ps.length, k).toBeGreaterThanOrEqual(1);
      expect(ps.length, k).toBeLessThanOrEqual(5);
      for (const p of ps) {
        expect(['body', 'accent', 'tube', 'accentline', 'light', 'line'], `${k}: ${p.role}`).toContain(p.role);
        if (p.role === 'tube' || p.role === 'accentline') expect(p.w ?? 6.5, `${k}: strip width`).toBeGreaterThanOrEqual(4);
        // cut-outs (the surface colour through the sheet) are the only thin lines, and never thinner than 2.2 units
        if (p.role === 'line') expect(p.w ?? 2.6, `${k}: cut width`).toBeGreaterThanOrEqual(2.2);
        expect(p.lod ?? 0, k).toBe(0);
      }
      // a symbol is never only cut-outs
      expect(ps.some((p) => p.role !== 'light' && p.role !== 'line'), k).toBe(true);
    }
  });

  it('every symbol has a motion of the vocabulary; the asked-for ones are play nudging, record pulsing, close turning', () => {
    for (const k of CHROME_KEYS) for (const m of motionsOf(CHROME[k], 'chrome')) expect(Object.keys(MOTION_MS), `${k}: ${m}`).toContain(m);
    expect(motionsOf(CHROME.play, 'chrome')).toEqual(['nudge']);
    expect(motionsOf(CHROME.record, 'chrome')).toEqual(['pulse']);
    expect(motionsOf(CHROME.close, 'chrome')).toEqual(['turn']);
    const css = readFileSync('src/paper-motion.css', 'utf8');
    expect(css).toMatch(/\.pp-play \.pa-nudge \{[^}]*animation-name: pa-nudge/);
    expect(css).toMatch(/@keyframes pa-nudge/);
  });

  it('back / forward mirror in Hebrew, nothing else does', () => {
    expect([...CHROME_MIRROR].sort()).toEqual(['back', 'fwd']);
    expect(renderToStaticMarkup(h(Icon, { k: 'back' }))).toContain('flip-rtl');
    expect(renderToStaticMarkup(h(Icon, { k: 'play' }))).not.toContain('flip-rtl');
    const css = readFileSync('src/paper.css', 'utf8');
    expect(css).toMatch(/\[dir='ltr'\] \.ico\.flip-rtl \{\s*transform: none;/);
  });
});

/** The chrome ramps of src/paper.css by the selector that opens their block. */
function ramp(css: string, opener: string): Record<string, string> {
  const i = css.indexOf(opener);
  expect(i, opener).toBeGreaterThanOrEqual(0);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--(c[a-z]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

describe('chrome ramps read on every button surface, both themes', () => {
  const css = readFileSync('src/paper.css', 'utf8');
  const CARD = { light: '#ffffff', dark: '#241540' };
  const surfaces: [string, Record<string, string>, string[], string][] = [
    // [name, ramp, the surfaces it paints on, the cut-out colour there]
    ['light cards / outlined buttons', ramp(css, ":root,\n:root[data-theme='light'] {"), ['#ffffff', '#fbf7ff', '#f6f0ff', '#f3ecff'], CARD.light],
    ['dark cards / the dark bar', ramp(css, ":root[data-theme='dark'],"), ['#241540', '#140a24', '#2e1a4f', '#07030f', '#1e1033'], CARD.dark],
    ['lemon (mega, the Play note head)', ramp(css, ':root[data-theme] :is(.btn.mega, .pp-on-lemon, .ex-play) {'), ['#ffd43b'], '#ffd43b'],
    ['purple (primary, light)', ramp(css, ":root[data-theme='light'] :is(.btn.primary:not(.mega), .pp-on-purple) {"), ['#6d28d9'], '#6d28d9'],
    ['lilac (primary, dark)', ramp(css, ":root[data-theme='dark'] .btn.primary:not(.mega) {"), ['#a78bfa'], '#a78bfa'],
  ];
  it.each(surfaces)('%s', (_n, r, bgs, cut) => {
    for (const k of ['cs', 'ce', 'ca', 'cae']) expect(r[k], k).toMatch(/^#[0-9a-f]{6}$/);
    for (const bg of bgs) {
      expect(contrast(r.cs, bg), `sheet on ${bg}`).toBeGreaterThanOrEqual(3);
      expect(contrast(r.ca, bg), `accent on ${bg}`).toBeGreaterThanOrEqual(3);
      expect(contrast(r.ce, bg), `edge on ${bg}`).toBeGreaterThanOrEqual(3);
      if (bg !== '#ffd43b') expect(isYellow(r.cs), 'no lemon paper on white').toBe(false);
    }
    // the edge is a deeper (or, on dark surfaces, a lifted-but-darker) tone of the sheet, not the same colour
    expect(contrast(r.cs, r.ce), 'edge differs from the sheet').toBeGreaterThanOrEqual(1.4);
    // cut-outs (keyholes, pips, clock hands) show the surface through the sheet
    expect(contrast(r.cs, cut), 'cut-outs on the sheet').toBeGreaterThanOrEqual(3);
  });
  it('surfaces painted in other colours fall back to the text colour (the symbol reads wherever its label reads)', () => {
    const r = ramp(css, ":root[data-theme='contrast'],");
    expect(r).toEqual({ cs: 'initial', ce: 'initial', ca: 'initial', cae: 'initial', cl: 'initial' });
    expect(css).toMatch(/:root\[data-theme\] :is\(\.btn\.danger, \.chip\.on/);
    const p = readFileSync('src/ui/paper/Paper.tsx', 'utf8');
    expect(p).toContain("s: 'var(--cs, currentColor)'");
  });
});

// ---------------------------------------------------------------- no stand-ins left
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : [];
  });
const SRC = [...files('src/ui'), ...files('src/partner')];
/** The text glyphs that used to stand in for control symbols. */
const CONTROL = /[▶■✕‹›⋯⌫↻❚⏹⏮⏭＋⬇⏸⏵⏺↺]/;
/**
 * Typography and data marks that stay text (content, not controls): a pattern per file. Feedback copy, notation marks
 * drawn in SVG <text>, legends, ratings and counters.
 */
const ALLOW: [RegExp, RegExp][] = [
  [/ChordChart\.tsx$/, /c\.tab\.kind === 'ok' \? '✓'/], // the chord-tab check result is a word-like mark in the chart
  [/Instrument\.tsx$/, /^\s*✕\s*$/], // a muted string, drawn as SVG <text> on the chord box
  [/VoiceLeadScore\.tsx$/, /const MARK = /], // the score legend marks
];
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('no text glyphs or thin line icons standing in for control symbols', () => {
  it('no control glyph left in the UI code (allow-list: typography and data marks)', () => {
    const left: string[] = [];
    for (const f of SRC) {
      const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
      lines.forEach((ln, i) => {
        if (!CONTROL.test(ln)) return;
        if (ALLOW.some(([fp, lp]) => fp.test(f) && lp.test(ln))) return;
        left.push(`${f}:${i + 1}: ${ln.trim().slice(0, 90)}`);
      });
    }
    expect(left).toEqual([]);
  });

  it('no lone +, −, ← or → as a button’s whole content', () => {
    const left: string[] = [];
    for (const f of SRC) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        if (!/^\s*[+−←→]\s*$/.test(ln)) return;
        let j = i - 1;
        while (j >= 0 && !lines[j].trim()) j--;
        if (/^\s*<button\b[^]*>\s*$/.test(lines[j] ?? '')) left.push(`${f}:${i + 1}`);
      });
    }
    expect(left).toEqual([]);
  });

  it('no old flip-rtl text arrows, and every icon-only button keeps a name', () => {
    const left: string[] = [];
    const unnamed: string[] = [];
    for (const f of SRC) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<span className="flip-rtl">\s*[←→‹›▶]\s*<\/span>/g)) left.push(`${f}: ${m[0]}`);
      // <button ...>\n  <Icon ... />\n</button> — the symbol alone: the button must carry aria-label or title
      for (const m of s.matchAll(/<button\b([^<]*?)>\s*<Icon\b[^<]*?\/>\s*<\/button>/g)) if (!/aria-label|title=/.test(m[1])) unnamed.push(`${f}: ${m[0].slice(0, 100)}`);
    }
    expect(left).toEqual([]);
    expect(unnamed).toEqual([]);
  });

  it('no thin-stroke line icon (24 grid, currentColor, ≤ 2.6) left in a control component', () => {
    // Content drawings that stay line art: notation, the step / avatar art, charts and meters.
    const CONTENT = /(BadgeArt|Glyph|GameArt|TrioArt|InstrumentArt|LeagueBadge|Toni|NoteViews|Insights|Stats|Streak|Profile|Home|Path|encore[\\/]bits)\.tsx$/;
    const left: string[] = [];
    for (const f of SRC) {
      if (CONTENT.test(f)) continue;
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<svg\b[^>]*viewBox="0 0 24 24"[^>]*stroke="currentColor"[^>]*strokeWidth="(\d+(?:\.\d+)?)"/g)) if (Number(m[1]) <= 2.6) left.push(`${f}: ${m[0].slice(0, 90)}`);
    }
    expect(left).toEqual([]);
  });
});
