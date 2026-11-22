import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressOverTime } from '../src/ui/ProgressOverTime';
import type { Snapshot } from '../src/engine/snapshot';

const days = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 9, 24) + i * 86400000).toISOString().slice(0, 10));
const snaps: Record<string, Snapshot> = Object.fromEntries(
  days.map((d, i) => [d, { day: d, status: { 'keys:technique': { closed: Math.floor(i / 3), learning: 4, almost: 2 }, 'keys:harmony': { learning: 3, closed: Math.floor(i / 6) } }, tempo: { 'keys:technique': 0.6 + i * 0.01, 'keys:harmony': 0.5 }, minutes: { technique: 20, ear: 5 }, channels: { ear: 0.8, reading: 0.3 + i * 0.01 }, keys: { 0: 0.5, 7: 0.2 }, vocab: { played: 2, closed: 0 }, practised: true }]),
);

describe('the Over time tab (SPEC-PROGRESS-CHARTS §2)', () => {
  it('renders frames (30 days default after two weeks), tiles, insights, the area charts with names, the ladder, tempo, ear/reading, keys, minutes', () => {
    const html = renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'he', areaName: (a: string) => ({ 'keys:technique': 'טכניקה', 'keys:harmony': 'הרמוניה' })[a] ?? a, today: days.at(-1)!, snapshots: snaps }));
    expect(html).toContain('data-progress-time="30d"');
    expect(html).toContain('data-frame="7d"');
    expect(html).not.toContain('data-frame="90d"');
    expect(html).toContain('data-tile="minutes"');
    expect(html).toContain('הקריאה עלתה');
    expect(html).toContain('טכניקה');
    expect(html).toContain('פריטים עולים בסולם');
    expect(html).toContain('קרבה לטמפו היעד');
    expect(html).toContain('שמיעה וקריאה');
    expect(html).toContain('הסולמות מתמלאים');
    expect(html).toContain('לאן הולכות הדקות');
    expect(html).toContain('data-table-toggle');
  });
  it('an empty history says the charts fill in after a few days', () => {
    const html = renderToStaticMarkup(createElement(ProgressOverTime, { lang: 'en', areaName: (a: string) => a, today: '2026-11-22', snapshots: {} }));
    expect(html).toContain('data-progress-time="empty"');
  });
});
