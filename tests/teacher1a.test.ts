import { describe, expect, it } from 'vitest';
import { assignState, wasUpdated, type AssignItem, type Submission } from '../src/cloud/teacher';

const a = (subs: Partial<Submission>[], extra: Partial<AssignItem> = {}): AssignItem => ({
  id: 'a1',
  kind: 'drill',
  lessonId: 'drill',
  ref: 'drill:scales-3',
  dueOn: null,
  strictness: 'moderate',
  targetBpm: null,
  note: null,
  createdAt: '2026-11-26T10:00:00Z',
  submissions: subs.map((s, i) => ({ id: `s${i}`, createdAt: `2026-11-26T1${5 - i}:00:00Z`, score: null, comment: null, mark: null, ...s })),
  ...extra,
});

describe('SPEC-TEACHER-CLASS 1a: a student state on an assignment', () => {
  it('open, sent, passed by score', () => {
    expect(assignState(a([]))).toBe('open');
    expect(assignState(a([{ score: 0.5 }]))).toBe('sent');
    expect(assignState(a([{ score: 0.8 }]))).toBe('passed');
    // an older passing take still counts
    expect(assignState(a([{ score: 0.4 }, { score: 0.9 }]))).toBe('passed');
  });
  it('"again" on the newest take reopens it, even over a passing score', () => {
    expect(assignState(a([{ score: 0.95, mark: 'again' }]))).toBe('again');
    // and a passing take that was marked "again" no longer counts once a new take comes in
    expect(assignState(a([{ score: 0.5 }, { score: 0.95, mark: 'again' }]))).toBe('sent');
    expect(assignState(a([{ score: 0.8 }, { score: 0.95, mark: 'again' }]))).toBe('passed');
    // a passing take sent before the "again" does not close it (review round 1, M3)
    expect(assignState(a([{ score: 0.4 }, { score: 0.95, mark: 'again' }, { score: 0.92 }]))).toBe('sent');
  });
  it("the teacher's good / great closes it even under the pass mark", () => {
    expect(assignState(a([{ score: 0.3, mark: 'good' }]))).toBe('passed');
  });
  it('updated only when edited after the send', () => {
    expect(wasUpdated(a([], { updatedAt: '2026-11-26T10:00:30Z' }))).toBe(false);
    expect(wasUpdated(a([], { updatedAt: '2026-11-27T09:00:00Z' }))).toBe(true);
    expect(wasUpdated(a([]))).toBe(false);
  });
});
