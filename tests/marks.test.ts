import { describe, expect, it } from 'vitest';
import { markOf, seqMarks } from '../src/engine/noteMarks';
import type { Question } from '../src/engine/lesson';

const exp = { pitch: 60, beat: 0, dur: 0.5, hand: 'R' as const };

describe('note marks on the staff (green right / amber off time / red wrong or missed)', () => {
  it('drill takes', () => {
    expect(markOf({ exp, played: null, dev: null, ok: false }, 40)).toBe('missed');
    expect(markOf({ exp, played: { pitch: 61, on: 0, off: null, vel: 64 }, dev: 0, ok: false }, 40)).toBe('wrong');
    expect(markOf({ exp, played: { pitch: 60, on: 0, off: null, vel: 64 }, dev: 70, ok: true }, 40)).toBe('timing');
    expect(markOf({ exp, played: { pitch: 60, on: 0, off: null, vel: 64 }, dev: -10, ok: true }, 40)).toBe('ok');
    expect(markOf(undefined, 40)).toBeUndefined();
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
