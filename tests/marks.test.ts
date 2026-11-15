import { describe, expect, it } from 'vitest';
import { markCounts, markOf, seqMarks, tickLen, worstMark } from '../src/engine/noteMarks';
import type { Question } from '../src/engine/lesson';

const exp = { pitch: 60, beat: 0, dur: 0.5, hand: 'R' as const };

describe('note marks on the staff (right / early / late / wrong / missed)', () => {
  it('drill takes', () => {
    expect(markOf({ exp, played: null, dev: null, ok: false }, 40)).toBe('missed');
    expect(markOf({ exp, played: { pitch: 61, on: 0, off: null, vel: 64 }, dev: 0, ok: false }, 40)).toBe('wrong');
    expect(markOf({ exp, played: { pitch: 60, on: 0, off: null, vel: 64 }, dev: 70, ok: true }, 40)).toBe('late');
    expect(markOf({ exp, played: { pitch: 60, on: 0, off: null, vel: 64 }, dev: -70, ok: true }, 40)).toBe('early');
    expect(markOf({ exp, played: { pitch: 60, on: 0, off: null, vel: 64 }, dev: 40, ok: true }, 40)).toBe('ok');
    expect(markOf({ exp, played: { pitch: 60, on: 0, off: null, vel: 64 }, dev: -10, ok: true }, 40)).toBe('ok');
    expect(markOf(undefined, 40)).toBeUndefined();
  });
  it('early / late split: the counts match the take (no "all right but 83 %")', () => {
    const p = (dev: number, ok = true) => ({ exp, played: { pitch: ok ? 60 : 62, on: 0, off: null, vel: 64 }, dev, ok });
    const perNote = [p(0), p(-80), p(-50), p(90), p(10, false), { exp, played: null, dev: null, ok: false }];
    const c = markCounts({ perNote }, 40);
    expect(c).toEqual({ ok: 1, early: 2, late: 1, wrong: 1, missed: 1, extra: 0 });
    // right-pitch notes (ok + early + late) = the notes the analysis counts as right
    expect(c.ok + c.early + c.late).toBe(perNote.filter((r) => r.ok).length);
    expect(worstMark(['ok', 'early', 'late'])).toBe('late');
    expect(worstMark(['ok', 'wrong', 'missed'])).toBe('missed');
    expect(tickLen(40, 40)).toBe(4);
    expect(tickLen(-80, 40)).toBe(12);
    expect(tickLen(60, 40)).toBe(8);
  });
  it('sequence answers mark each note', () => {
    const q = { kind: 'degree-seq', answer: '1-3-5-4' } as unknown as Question & { answer: string };
    const want = q.answer.split('-');
    expect(seqMarks(q, q.answer)).toEqual(want.map(() => 'ok'));
    const wrong = want.map((d, i) => (i === 1 ? String((Number(d) % 7) + 1) : d)).join('-');
    const m = seqMarks(q, wrong)!;
    expect(m[1]).toBe('wrong');
    expect(m.filter((x) => x === 'ok').length).toBe(want.length - 1);
    expect(seqMarks(q, want.slice(0, 1).join('-'))!.slice(1).every((x) => x === 'missed')).toBe(true);
  });
});
