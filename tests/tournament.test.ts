import { describe, expect, it } from 'vitest';
import { dailySet, MIN_HUMAN_MS, scoreRound, shareText, standings, tournamentSet } from '../src/engine/tournament';
import { TournamentController } from '../src/game/tournamentController';
import { FakeAudio, FakeTTS } from '../src/game/fakes';
import { Cancelled, type Clock } from '../src/game/adapters';

describe('tournament sets', () => {
  it('daily challenge: same 5 items for everyone on a day, different the next day', () => {
    const a = dailySet('2026-11-05');
    const b = dailySet('2026-11-05');
    expect(a.map((q) => q.answer)).toEqual(b.map((q) => q.answer));
    expect(a).toHaveLength(5);
    expect(JSON.stringify(dailySet('2026-11-06').map((q) => q.stimulus))).not.toBe(JSON.stringify(a.map((q) => q.stimulus)));
  });
  it('every item is answerable with ≤ 4 buttons and the answer is among them', () => {
    for (const kind of ['mixed', 'degrees', 'chords', 'intervals'] as const) {
      for (const q of tournamentSet(kind, 12, 3)) {
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        expect(q.choices.length).toBeLessThanOrEqual(4);
        expect(q.choices).toContain(q.answer);
      }
    }
  });
});

describe('round scoring', () => {
  const item = tournamentSet('degrees', 1, 1)[0];
  const wrong = item.choices.find((c) => c !== item.answer)!;
  it('faster correct answers score more; wrong and missing score 0', () => {
    const r = scoreRound(
      item,
      [
        { player: 0, answer: item.answer, timeMs: 800 },
        { player: 1, answer: item.answer, timeMs: 4000 },
        { player: 2, answer: wrong, timeMs: 500 },
        { player: 3, answer: null, timeMs: null },
      ],
      [0, 0, 0, 0],
    );
    const pts = r.answers.map((a) => a.points);
    expect(pts[0]).toBeGreaterThan(pts[1]);
    expect(pts[2]).toBe(0);
    expect(pts[3]).toBe(0);
    expect(r.fastest).toBe(0);
  });
  it('implausibly fast or late answers do not count', () => {
    const r = scoreRound(item, [{ player: 0, answer: item.answer, timeMs: MIN_HUMAN_MS - 1 }, { player: 1, answer: item.answer, timeMs: 10_001 }], [0, 0]);
    expect(r.answers.map((a) => a.correct)).toEqual([false, false]);
  });
  it('streaks multiply points; standings break ties by total time', () => {
    const s0 = scoreRound(item, [{ player: 0, answer: item.answer, timeMs: 1000 }], [0]).answers[0].points;
    const s5 = scoreRound(item, [{ player: 0, answer: item.answer, timeMs: 1000 }], [5]).answers[0].points;
    expect(s5).toBeCloseTo(s0 * 1.5, -1);
    const r1 = scoreRound(item, [{ player: 0, answer: item.answer, timeMs: 1000 }, { player: 1, answer: item.answer, timeMs: 1000 }], [0, 0]);
    const tie = standings(2, [r1]);
    expect(tie[0].points).toBe(tie[1].points);
  });
  it('share text has no answers in it', () => {
    const r = scoreRound(item, [{ player: 0, answer: item.answer, timeMs: 900 }], [0]);
    const txt = shareText('2026-11-05', [r, scoreRound(item, [{ player: 0, answer: wrong, timeMs: 900 }], [0])], 1234, 'en');
    expect(txt).toContain('🟩⬜');
    // Only a date line and a squares + points line: nothing that reveals an answer.
    const lines = txt.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^[🟩🟨⬜]+ {2}[\d,]+ pts$/u);
  });
});

describe('tournament controller', () => {
  let t = 0;
  const clock: Clock = {
    now: () => t,
    sleep: (_ms, signal) =>
      new Promise((res, rej) => {
        if (signal.aborted) return rej(new Cancelled());
        setTimeout(() => (signal.aborted ? rej(new Cancelled()) : res()), 0);
      }),
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function until(pred: () => boolean, max = 3000) {
    for (let i = 0; i < max; i++) {
      if (pred()) return;
      await tick();
    }
    throw new Error('condition not reached');
  }

  it('duel on one device: same item for both, first answer per player counts, round ends when both answered', async () => {
    const items = tournamentSet('mixed', 3, 7);
    let over: number[] | null = null;
    const c = new TournamentController(items, ['Dana', 'Omer'], { audio: new FakeAudio(), tts: new FakeTTS(), clock }, { onOver: (_r, st) => (over = st.map((s) => s.player)) });
    await c.start();
    for (let i = 0; i < 3; i++) {
      await until(() => c.getView().stage === 'answering' && c.getView().round === i);
      const q = c.getView().item;
      const wrong = q.choices.find((x) => x !== q.answer)!;
      t += 700;
      c.answer(0, q.answer); // Dana fast and right
      c.answer(0, wrong); // a second tap is ignored
      t += 900;
      c.answer(1, i === 1 ? q.answer : wrong);
      await until(() => c.getView().stage === 'reveal' || c.getView().stage === 'over' || c.getView().round > i);
    }
    await until(() => c.getView().stage === 'over');
    const v = c.getView();
    expect(v.results).toHaveLength(3);
    expect(v.results.every((r) => r.answers[0].correct)).toBe(true);
    expect(v.results.map((r) => r.answers[1].correct)).toEqual([false, true, false]);
    expect(over).toEqual([0, 1]);
    expect(v.standings[0].points).toBeGreaterThan(v.standings[1].points);
  });
});

describe('daily challenge storage', () => {
  it('only the first play of a day counts; sync keeps it', async () => {
    const { ProgressStore } = await import('../src/storage/progress');
    const { memoryKV } = await import('../src/storage/kv');
    const { rebuildProgress } = await import('../src/storage/sync');
    const store = new ProgressStore(memoryKV());
    let p = await store.recordDaily('2026-11-05', 4200, 'first');
    p = await store.recordDaily('2026-11-05', 9999, 'replay');
    expect(p.daily?.['2026-11-05']).toEqual({ points: 4200, text: 'first' });
    expect(rebuildProgress([], p).daily?.['2026-11-05']?.points).toBe(4200);
  });
});

describe('daily leaderboard parity with the server', () => {
  it('the seeded answer keys match the generator (re-run `npm run daily-keys` after changing it)', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync('supabase/seed/daily_keys.sql', 'utf-8');
    const { DAILY_VERSION } = await import('../src/engine/tournament');
    for (const day of ['2026-11-04', '2027-02-28', '2027-12-31', '2028-12-31']) {
      const m = new RegExp(String.raw`\('${day}', 'soft', (\d+), array\[(.*?)\]\)`).exec(sql);
      expect(m, day).not.toBeNull();
      expect(Number(m![1])).toBe(DAILY_VERSION);
      expect(m![2].split(',').map((s) => s.replace(/'/g, ''))).toEqual(dailySet(day).map((q) => String(q.answer)));
    }
  });
  it('local points equal the server grading (verified live: 5 right at 1 s = 5700)', () => {
    const items = dailySet('2026-11-04');
    const rounds = [] as ReturnType<typeof scoreRound>[];
    for (const q of items) {
      const streak = standings(1, rounds)[0].streak;
      rounds.push(scoreRound(q, [{ player: 0, answer: q.answer, timeMs: 1000 }], [streak]));
    }
    expect(standings(1, rounds)[0].points).toBe(5700);
  });
  it('stores what was answered and marks the upload once', async () => {
    const { ProgressStore } = await import('../src/storage/progress');
    const { memoryKV } = await import('../src/storage/kv');
    const store = new ProgressStore(memoryKV());
    await store.recordDaily('2026-11-05', 100, 'x', { answers: ['1', null, '5', 'maj', 'P5'], times: [900, null, 800, 700, 600] });
    const p = await store.markDailySubmitted('2026-11-05');
    expect(p.daily?.['2026-11-05']).toMatchObject({ submitted: true, answers: ['1', null, '5', 'maj', 'P5'] });
  });
});

describe('ghost race storage', () => {
  it('the first run becomes the ghost; only a better run replaces it', async () => {
    const { ProgressStore } = await import('../src/storage/progress');
    const { memoryKV } = await import('../src/storage/kv');
    const store = new ProgressStore(memoryKV());
    const run = (points: number) => ({ seed: 7, points, answers: [{ answer: 1, timeMs: 900 }], at: '2026-11-05' });
    expect((await store.recordGhost('mixed:5', run(2000))).kept).toBe(true);
    expect((await store.recordGhost('mixed:5', run(1500))).kept).toBe(false);
    const r = await store.recordGhost('mixed:5', run(2600));
    expect(r.kept).toBe(true);
    expect(r.progress.ghosts?.['mixed:5'].points).toBe(2600);
  });
});
