import { describe, expect, it } from 'vitest';
import { chartOfRulesRef, rulesRef } from '../src/ui/ImprovRules';
import { CHALLENGES } from '../src/engine/improvRules';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { parseChart } from '../src/engine/charts';

describe('a teacher assigns improvising under rules', () => {
  it('the reference opens the chart with the challenge’s rules, over a level or a standard', () => {
    const lv = chartOfRulesRef(rulesRef('bebop-test', 'lv:4'), 'en')!;
    expect(lv.rules).toEqual(CHALLENGES.find((c) => c.id === 'bebop-test')!.rules);
    expect(lv.level).toBe('two-five-one');
    const std = chartOfRulesRef(rulesRef('one-note-swing', 'std:autumn'), 'he')!;
    expect(std.text).toBe(STANDARD_CHANGES.find((s) => s.id === 'autumn')!.text);
    expect(chartOfRulesRef('rules:nope@lv:1', 'en')).toBeNull();
  });
  it('every standard parses cleanly', () => {
    for (const s of STANDARD_CHANGES) expect(parseChart(s.text, s.style === 'waltz' ? 3 : 4).errors, s.id).toEqual([]);
  });
});
