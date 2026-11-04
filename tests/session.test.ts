import { describe, expect, it } from 'vitest';
import { bflatTwoHomes } from '../src/engine/lesson';
import { advance, createSession, grade, newTurn, skip } from '../src/engine/session';
import { applyResult, bumpStreak, emptyProgress, resultFromSession, visibleStreak, ProgressStore } from '../src/storage/progress';
import { memoryKV } from '../src/storage/kv';

describe('session reducer', () => {
  it('ignores stale turns and duplicate grades', () => {
    let s = newTurn(createSession(bflatTwoHomes(1)), 'listening');
    const turn = s.turn;
    const ans = s.lesson.questions[0].answer;
    const [s1, g1] = grade(s, turn, 0, ans, 'voice');
    expect(g1.kind).toBe('correct');
    const [s2, g2] = grade(s1, turn, 0, ans, 'voice'); // duplicate callback
    expect(g2.kind).toBe('stale');
    expect(s2.xp).toBe(10);
    s = s2;
    const [, g3] = grade(s, turn - 1, 0, ans, 'voice');
    expect(g3.kind).toBe('stale');
  });

  it('cannot advance an unresolved question; skip resolves without XP', () => {
    let s = newTurn(createSession(bflatTwoHomes(1)), 'listening');
    expect(advance(s).index).toBe(0);
    s = skip(s);
    expect(s.records[0].outcome).toBe('skipped');
    s = advance(s);
    expect(s.index).toBe(1);
    expect(s.xp).toBe(0);
  });
});

describe('progress', () => {
  const finished = () => {
    let s = newTurn(createSession(bflatTwoHomes(5)), 'listening');
    for (let i = 0; i < 3; i++) {
      [s] = grade(s, s.turn, i, s.lesson.questions[i].answer, 'buttons');
      s = advance(s);
    }
    return s;
  };

  it('completion is idempotent', async () => {
    const store = new ProgressStore(memoryKV());
    const r = resultFromSession(finished(), 'sess-1', new Date(2026, 10, 4, 10));
    const p1 = await store.recordCompletion(r, new Date(2026, 10, 4, 10));
    const p2 = await store.recordCompletion(r, new Date(2026, 10, 4, 11)); // replayed callback / resume
    expect(p1.xp).toBe(30);
    expect(p2.xp).toBe(30);
    expect(p2.lessons['bflat-two-homes'].completions).toBe(1);
  });

  it('streak date boundaries use local days', () => {
    let st = emptyProgress().streak;
    st = bumpStreak(st, new Date(2026, 10, 4, 23, 59));
    expect(st.count).toBe(1);
    st = bumpStreak(st, new Date(2026, 10, 5, 0, 1)); // two minutes later, next day
    expect(st.count).toBe(2);
    st = bumpStreak(st, new Date(2026, 10, 5, 22));
    expect(st.count).toBe(2);
    expect(visibleStreak(st, new Date(2026, 10, 6, 12))).toBe(2);
    expect(visibleStreak(st, new Date(2026, 10, 7, 12))).toBe(0);
    st = bumpStreak(st, new Date(2026, 10, 8));
    expect(st.count).toBe(1);
    // month / year boundary
    let y = bumpStreak({ count: 4, lastDay: '2026-12-31' }, new Date(2027, 0, 1, 8));
    expect(y.count).toBe(5);
    y = bumpStreak({ count: 4, lastDay: '2026-02-28' }, new Date(2026, 2, 1, 8));
    expect(y.count).toBe(5);
  });

  it('missed questions enter the review queue', () => {
    let s = newTurn(createSession(bflatTwoHomes(5)), 'listening');
    const q0 = s.lesson.questions[0];
    [s] = grade(s, s.turn, 0, q0.answer === 1 ? 5 : 1, 'buttons');
    [s] = grade(s, s.turn, 0, q0.answer === 1 ? 5 : 1, 'buttons');
    expect(s.records[0].outcome).toBe('revealed');
    const p = applyResult(emptyProgress(), resultFromSession(s, 'x', new Date()), new Date());
    expect(p.review).toHaveLength(1);
    expect(p.review[0].answer).toBe(q0.answer);
  });
});
