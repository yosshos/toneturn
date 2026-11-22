import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassProgress, MedianSwitch, studentSummary, type StudentSnaps } from '../src/ui/TeacherProgress';
import type { Snapshot } from '../src/engine/snapshot';

const day = (i: number) => new Date(Date.UTC(2026, 9, 26) + i * 86400000).toISOString().slice(0, 10);
const snap = (d: string, closed: number, minutes: number): Snapshot => ({ day: d, status: { 'keys:technique': { closed } }, tempo: {}, minutes: minutes ? { technique: minutes } : {}, channels: { ear: null, reading: null }, keys: {}, vocab: { played: 0, closed: 0 }, practised: minutes > 0 });
const today = day(27);
const busy: StudentSnaps = { id: 'a', name: 'דנה', snaps: Object.fromEntries(Array.from({ length: 28 }, (_, i) => [day(i), snap(day(i), Math.floor(i / 2), 25)])) };
const idle: StudentSnaps = { id: 'b', name: 'יואב', snaps: Object.fromEntries(Array.from({ length: 28 }, (_, i) => [day(i), snap(day(i), 3, i === 2 ? 20 : 0)])) };

describe("the teacher's class charts (SPEC-PROGRESS-CHARTS §4)", () => {
  it('summarises 4 weeks per student and puts who needs attention first', () => {
    const b = studentSummary(busy, today);
    expect(b.minutes.reduce((a, x) => a + x, 0)).toBe(28 * 25);
    expect(b.practised14).toBe(14);
    const i = studentSummary(idle, today);
    expect(i.need).toBe(3);
    const html = renderToStaticMarkup(createElement(ClassProgress, { students: [busy, idle], lang: 'he', today }));
    expect(html.indexOf('data-student="b"')).toBeLessThan(html.indexOf('data-student="a"'));
    expect(html).toContain('תלמידים מול שבועות');
  });
  it('the median switch (default off, the teacher chooses)', () => {
    expect(renderToStaticMarkup(createElement(MedianSwitch, { on: false, lang: 'he', onChange: () => {} }))).toContain('data-median-switch="off"');
  });
});
