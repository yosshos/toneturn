import { beforeEach, describe, expect, it } from 'vitest';
import { freshCount, freshOf, loadSeen, markSeen } from '../src/storage/classSeen';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};

const NOW = Date.parse('2026-11-26T18:00:00Z');
const a = (id: string, created: string, subs: { id: string; comment: string | null; mark: string | null }[] = []) => ({ id, createdAt: created, submissions: subs });

describe('class "new" marks (SPEC-CLASS-NOTIFICATIONS §4.5)', () => {
  beforeEach(() => localStorage.clear());

  it('a first visit counts the last three days as new', () => {
    const f = freshOf([a('old', '2026-11-20T10:00:00Z'), a('recent', '2026-11-25T10:00:00Z')], null, NOW);
    expect([...f.assigns]).toEqual(['recent']);
    expect(freshCount(f)).toBe(1);
  });

  it('after a visit: only what came later, and a new or changed teacher reply', () => {
    const items = [a('x', '2026-11-25T10:00:00Z', [{ id: 's1', comment: null, mark: 'good' }])];
    markSeen('u1', items, new Date(NOW));
    const seen = loadSeen('u1');
    expect(freshCount(freshOf(items, seen, NOW))).toBe(0);
    const later = [
      a('x', '2026-11-25T10:00:00Z', [{ id: 's1', comment: 'Lovely', mark: 'good' }]),
      a('y', '2026-11-26T19:00:00Z'),
    ];
    const f = freshOf(later, seen, NOW + 3600000);
    expect([...f.assigns]).toEqual(['y']);
    expect([...f.replies]).toEqual(['x']);
    expect(freshCount(f)).toBe(2);
  });

  it('per user', () => {
    markSeen('u1', [a('x', '2026-11-25T10:00:00Z')], new Date(NOW));
    expect(loadSeen('u2')).toBeNull();
  });
});
