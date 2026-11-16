// Stats: a Hebrew duration ("1 ש׳ 5 דק׳") is isolated in its own direction, as in the practice diary — wrapped as LTR
// text it read reversed. Every duration on the Stats pages goes through the same formatter and isolation.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { Dur, fmtDuration } from '../src/ui/Stats';
import { dur } from '../src/ui/PracticeDiary';

describe('durations in Hebrew', () => {
  it('one formatter: hours and minutes, minutes, seconds — Hebrew words, no Latin unit', () => {
    expect(fmtDuration(65 * 60000, 'he')).toBe('1 ש׳ 5 דק׳');
    expect(fmtDuration(65 * 60000, 'en')).toBe('1 h 5 min');
    expect(fmtDuration(12 * 60000, 'he')).toBe('12 דק׳');
    expect(fmtDuration(42000, 'he')).toBe('42 שנ׳');
    expect(fmtDuration(42000, 'en')).toBe('42 s');
    // the diary's helper is the same formatter (plus "0" for nothing)
    expect(dur(65 * 60000, 'he')).toBe(fmtDuration(65 * 60000, 'he'));
    expect(dur(0, 'he')).toBe('0');
  });
  it('isolated without forcing LTR (the browser orders the Hebrew words right to left)', () => {
    const he = renderToStaticMarkup(h(Dur, { ms: 65 * 60000, lang: 'he' }));
    expect(he).toBe('<bdi data-dur="1">1 ש׳ 5 דק׳</bdi>');
    expect(he).not.toContain('dir="ltr"');
  });
  it('no Stats or Compare duration is wrapped as LTR text any more', () => {
    const stats = readFileSync('src/ui/Stats.tsx', 'utf8');
    expect(stats).not.toMatch(/<N>\{[^}]*fmtDuration/);
    const cmp = readFileSync('src/ui/Compare.tsx', 'utf8');
    expect(cmp).toContain('<bdi>{fmt(a)}</bdi>');
  });
});
