import { beforeEach, describe, expect, it } from 'vitest';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock } from '../src/game/fakes';
import { adaptPlacement, placementLesson } from '../src/engine/placement';
import type { SessionState } from '../src/engine/session';
import { clearPlacement, clearSession, latestSession, loadPlacement, loadSession, placementProgressOf, savePlacement, saveSession, sessionProgressOf } from '../src/storage/resume';

// A minimal localStorage for node.
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 2000) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}

function run(lesson: ReturnType<typeof placementLesson>, seed: number, hooks: { onStep?: (s: SessionState) => void; resume?: Pick<SessionState, 'records' | 'index' | 'xp'> }) {
  const stt = new ScriptedTranscriber([]);
  const c = new LessonController(
    lesson,
    { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(null), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
    { inputLang: 'en', outputLang: 'en', naming: 'letter' },
    'buttons',
    { adapt: (st) => adaptPlacement(st, seed), ...hooks },
  );
  return c;
}

describe('Find my level survives leaving half-way', () => {
  beforeEach(() => mem.clear());

  it('saves after each answer; a new controller continues at the same question with the answers kept', async () => {
    const seed = 42;
    const lesson = placementLesson(seed, { singing: false });
    const steps: SessionState[] = [];
    const c = run(lesson, seed, { onStep: (st) => (steps.push(st), savePlacement(seed, st)) });
    await c.start();
    for (let n = 0; n < 3; n++) {
      await until(() => c.getView().phase === 'listening');
      c.skip();
      await until(() => steps.length > n);
    }
    c.dispose();
    const saved = loadPlacement()!;
    expect(saved).not.toBeNull();
    expect(saved.index).toBe(3);
    expect(saved.records.filter((r) => r.outcome !== 'pending')).toHaveLength(3);
    expect(placementProgressOf(saved).answered).toBe(3);
    // JSON round trip keeps the questions intact.
    expect(saved.lesson.questions.slice(0, 3)).toEqual(steps[2].lesson.questions.slice(0, 3));

    const c2 = run(saved.lesson, saved.seed!, { resume: saved });
    expect(c2.getView().index).toBe(3);
    expect(c2.getView().question.id).toBe(saved.lesson.questions[3].id);
    expect(c2.getView().session.records.slice(0, 3).every((r) => r.outcome !== 'pending')).toBe(true);
    c2.dispose();
  });

  it('cleared and stale saves are not offered', () => {
    const lesson = placementLesson(1, {});
    const st = { lesson, records: lesson.questions.map((_, i) => ({ attempts: [], outcome: i === 0 ? ('skipped' as const) : ('pending' as const), xp: 0, unclear: 0 })), index: 0, xp: 0 } as unknown as SessionState;
    savePlacement(1, st);
    expect(loadPlacement()).not.toBeNull();
    expect(loadPlacement(Date.now() + 15 * 24 * 3600 * 1000)).toBeNull();
    clearPlacement();
    expect(loadPlacement()).toBeNull();
  });

  it('every lesson has its own slot; nothing answered is not saved; the latest unfinished comes first', () => {
    const lesson = placementLesson(1, {});
    const st = (answered: boolean) => ({ lesson, records: lesson.questions.map((_, i) => ({ attempts: [], outcome: answered && i === 0 ? ('correct' as const) : ('pending' as const), xp: 0, unclear: 0 })), index: answered ? 1 : 0, xp: 0 }) as unknown as SessionState;
    saveSession('path:degrees-1', 'Degrees', st(false));
    expect(loadSession('path:degrees-1')).toBeNull();
    saveSession('path:degrees-1', 'Degrees', st(true));
    saveSession('topic:meter-feel:2', 'Meter', st(true));
    expect(loadSession('path:degrees-1')?.title).toBe('Degrees');
    expect(latestSession()?.key).toBe('topic:meter-feel:2');
    clearSession('topic:meter-feel:2');
    expect(latestSession()?.key).toBe('path:degrees-1');
    expect(sessionProgressOf(loadSession('path:degrees-1')!)).toEqual({ answered: 1, total: lesson.questions.length });
  });
});
