// The studio look's remaining screens (src/studio-rest.css): every rule scoped under :root[data-look='studio'], no
// dashed borders, no hard offset shadow and no 800/900 weight of its own; imported last.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const CSS = read('src/studio-rest.css').replace(/\/\*[\s\S]*?\*\//g, '');
const PREFIX = ":root[data-look='studio']";

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

function rules(src: string): { sel: string; body: string }[] {
  const out: { sel: string; body: string }[] = [];
  let i = 0;
  const walk = (end: number) => {
    while (i < end) {
      const open = src.indexOf('{', i);
      if (open < 0 || open >= end) return;
      const head = src.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (depth && j < src.length) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        j++;
      }
      if (/^@media\b/.test(head)) {
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

describe('studio-rest.css', () => {
  const all = rules(CSS);
  it('has rules, all scoped to the studio look', () => {
    expect(all.length).toBeGreaterThan(100);
    const bad = all.flatMap((r) => (r.sel.startsWith('@') ? [r.sel] : splitTop(r.sel).filter((s) => !s.startsWith(PREFIX))));
    expect(bad).toEqual([]);
  });
  it('draws no dashed border, no hard offset shadow, no 800 / 900 weight', () => {
    expect(CSS).not.toMatch(/dashed/);
    expect(CSS).not.toMatch(/font-weight:\s*(800|900)/);
    expect(CSS).not.toMatch(/box-shadow:[^;]*var\(--sx\)/);
  });
  it('is imported last in main.tsx', () => {
    const main = read('src/main.tsx');
    const at = main.indexOf("import './studio-rest.css'");
    expect(at).toBeGreaterThan(main.indexOf("import './studio-games.css'"));
    expect(main.slice(at + 1)).not.toMatch(/import '[^']+\.css'/);
  });
});
