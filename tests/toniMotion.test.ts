import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// 0.68.1 (owner: "Toni is often frozen"): every Toni state keeps a gentle motion (an infinite animation) after its
// one-shot gesture (the Paper Toni, src/toni.css), and the recap's off-screen cards hold their animations until shown.
const css = readFileSync('src/v2.css', 'utf8');
const toniCss = readFileSync('src/toni.css', 'utf8');
const toni = readFileSync('src/ui/Toni.tsx', 'utf8');
const states = /export type ToniState = ([^;]+);/.exec(toni)![1].match(/'([a-z]+)'/g)!.map((s) => s.slice(1, -1));

describe('Toni motion', () => {
  it('knows the states', () => expect(states.length).toBeGreaterThanOrEqual(12));
  for (const st of states) {
    it(`state ${st} has a continuing animation`, () => {
      const rules = [...toniCss.matchAll(new RegExp(`\\.toni-p\\.s-${st} [^{]*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
      expect(rules.some((r) => /animation:[^;]*infinite/.test(r))).toBe(true);
    });
  }
  it('reduced motion stops Toni', () => expect(css).toMatch(/data-motion='reduced'\] \.toni \*\s*\{\s*animation: none !important/));
  it('recap cards wait until shown', () => expect(css).toMatch(/\.rp\.rp-wait \*\s*\{\s*animation-play-state: paused !important/));
});
