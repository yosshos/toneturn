// Owner 2026-11-27: a done assignment vanished from the Home card; it stays a week with a check, and the card counts it.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssignedCard, doneLately } from '../src/ui/Classes';
import { STRINGS } from '../src/i18n/strings';
import type { AssignItem } from '../src/cloud/teacher';

const day = 86_400_000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const item = (id: string, sub: { score: number; ago: number } | null, created: number): AssignItem => ({
  id, kind: 'drill', lessonId: 'drill', ref: 'drill:scales-3@0/10', dueOn: null, strictness: 'moderate', targetBpm: null, note: null,
  createdAt: iso(now - created), className: 'כיול',
  submissions: sub ? [{ id: `s-${id}`, createdAt: iso(now - sub.ago), score: sub.score, comment: null, mark: null }] : [],
});

describe('the Home homework card keeps what was done', () => {
  const done = item('a1', { score: 0.9, ago: day }, 5 * day);
  const open = item('a2', null, 4 * day);
  const old = item('a3', { score: 0.9, ago: 9 * day }, 20 * day);
  it('done lately = passed, its take within a week', () => {
    expect(doneLately(done, now)).toBe(true);
    expect(doneLately(open, now)).toBe(false);
    expect(doneLately(old, now)).toBe(false);
  });
  it('a done one shows checked, with the count; an old done one is gone', () => {
    const html = renderToStaticMarkup(h(AssignedCard, { t: STRINGS.he, items: [done, open, old], lang: 'he', onOpen: () => {} }));
    expect(html).toContain('data-assigned-state="done"');
    expect(html).toContain('data-assigned-state="open"');
    expect(html).toContain('1 מתוך 2 בוצעו');
    expect(html).not.toContain('data-assigned="a3"');
  });
});
