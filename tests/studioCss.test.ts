// The studio look (redesign stage 1): src/studio.css is a switchable layer, so every rule must be scoped under
// :root[data-look='studio'] (the classic look stays reachable, untouched), it never draws a dashed border, and it loads after every
// other stylesheet. The switch itself: studio by default; ?look=classic / tt.look = 'classic' keep the previous look.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { lookFromSearch } from '../src/ui/look';

const read = (f: string) => readFileSync(f, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)); // CRLF checkouts (Windows)
const CSS = read('src/studio.css');
const PREFIX = ":root[data-look='studio']";

/** Top-level comma split (commas inside :is() / :not() stay). */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Every style rule's selector list and body (descending into @media / @supports blocks). */
function rules(css: string): { sel: string; body: string }[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { sel: string; body: string }[] = [];
  let i = 0;
  const walk = (end: number) => {
    while (i < end) {
      const open = src.indexOf('{', i);
      if (open < 0 || open >= end) return;
      const head = src.slice(i, open).trim();
      // find the matching brace
      let depth = 1;
      let j = open + 1;
      while (depth && j < src.length) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        j++;
      }
      if (/^@(media|supports|container|layer)\b/.test(head)) {
        i = open + 1;
        walk(j - 1);
        i = j;
      } else {
        out.push({ sel: head, body: src.slice(open + 1, j - 1) });
        i = j;
      }
    }
  };
  walk(src.length);
  return out;
}

describe('studio.css', () => {
  const all = rules(CSS);

  it('has rules', () => {
    expect(all.length).toBeGreaterThan(100);
  });

  it("scopes every rule under :root[data-look='studio']", () => {
    const bad: string[] = [];
    for (const r of all) {
      expect(r.sel.startsWith('@'), `no other at-rules: ${r.sel}`).toBe(false);
      for (const s of splitTop(r.sel)) if (!s.startsWith(PREFIX)) bad.push(s);
    }
    expect(bad).toEqual([]);
  });

  it('never draws a dashed border or outline (buttons are solid; disabled looks faded)', () => {
    expect(CSS.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/dashed/);
  });

  it('turns the dashed disabled buttons of the classic look solid', () => {
    const disabled = all.filter((r) => /\.btn[^,]*:disabled/.test(r.sel));
    expect(disabled.length).toBeGreaterThan(0);
    expect(disabled.some((r) => /border:\s*0/.test(r.body) && /border-style:\s*solid/.test(r.body))).toBe(true);
  });

  it('keeps the hard shadow for the main action only (the lemon mega button)', () => {
    const hard = all.filter((r) => /box-shadow:\s*0 3px 0 var\(--st-cta-edge\)/.test(r.body));
    expect(hard.length).toBeGreaterThan(0);
    for (const r of hard) expect(r.sel, r.sel).toMatch(/\.btn\.mega|\.bu-btn|\.tap-pad|\.mt-play|\.ex-play/);
  });

  it('is imported after every other stylesheet', () => {
    const main = read('src/main.tsx');
    const at = main.indexOf("import './studio.css'");
    expect(at).toBeGreaterThan(0);
    expect(main.indexOf("import { App }")).toBeLessThan(at);
    const after = main.slice(at + 1);
    expect(after).not.toMatch(/import '[^']+\.css'/);
  });
});

describe('the look switch', () => {
  it('reads ?look= from the URL', () => {
    expect(lookFromSearch('?look=studio')).toBe('studio');
    expect(lookFromSearch('?sim=1&look=classic')).toBe('classic');
    expect(lookFromSearch('?look=other')).toBeNull();
    expect(lookFromSearch('')).toBeNull();
  });

  it('is applied before the first paint by index.html, studio by default', () => {
    const html = read('index.html');
    expect(html).toMatch(/localStorage\.getItem\('tt\.look'\) !== 'classic'/);
    expect(html).toMatch(/setAttribute\('data-look', 'studio'\)/);
    expect(html.indexOf("'data-look'")).toBeLessThan(html.indexOf('src/main.tsx'));
  });
});
