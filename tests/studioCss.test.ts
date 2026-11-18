// The studio look (redesign stage 1), the app's only look since 2026-11-17: src/studio.css is a layer over the base
// sheets, every rule scoped under :root:root (the weight it had as :root[data-look='studio'], so it keeps winning over
// the base sheets' :root[data-theme] rules), it never draws a dashed border, and it loads after every other stylesheet.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)); // CRLF checkouts (Windows)
const CSS = read('src/studio.css');
const PREFIX = ':root:root';

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

  it('scopes every rule under :root:root', () => {
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

  it('turns the dashed disabled buttons of the base sheets solid', () => {
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
    // Only the studio layer's own sheets (studio-screens / studio-games / studio-elements) may follow it.
    expect(after.replace(/import '\.\/studio-[a-z]+\.css';/g, '')).not.toMatch(/import '[^']+\.css'/);
  });
});

describe('one look', () => {
  it('has no look switch left: no data-look, no tt.look, no ?look= anywhere in the app', () => {
    const files = readdirSync('src', { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.(tsx?|css)$/.test(f) && !/AvatarStudio/.test(f))
      .map((f) => `src/${f.split(String.fromCharCode(92)).join('/')}`);
    files.push('index.html');
    const hits = files.filter((f) => /data-look|dataset\.look|tt\.look|toneturn\.look|[?&]look=/.test(read(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')));
    expect(hits).toEqual([]);
  });
});
