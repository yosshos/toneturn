import { describe, expect, it } from 'vitest';
import { isPraise } from '../src/game/narration';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock, type ScriptStep } from '../src/game/fakes';
import { bflatTwoHomes } from '../src/engine/lesson';
import type { AccessError } from '../src/game/adapters';
import type { InputMode } from '../src/engine/session';

const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 500) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}

function setup(script: ScriptStep[], opts: { mode?: InputMode; micError?: AccessError | null; seed?: number } = {}) {
  const lesson = bflatTwoHomes(opts.seed ?? 3);
  const stt = new ScriptedTranscriber(script);
  const audio = new FakeAudio();
  const tts = new FakeTTS();
  const mic = new FakeMic(opts.micError ?? null);
  const c = new LessonController(
    lesson,
    { audio, tts, stt, mic, pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
    { inputLang: 'en', outputLang: 'en', naming: 'letter' },
    opts.mode ?? 'voice',
  );
  stt.expected = () => c.getView().question.answer;
  const word = (d: number) => (d === 1 ? 'one' : 'five');
  return { c, stt, audio, tts, mic, lesson, word };
}

const right: ScriptStep = (e) => (e === 1 ? 'one' : 'five');
const wrong: ScriptStep = (e) => (e === 1 ? 'five' : 'one');

describe('LessonController — voice', () => {
  it('runs intro + three spoken rounds after a single Start, with no taps', async () => {
    const { c, mic, stt, tts } = setup([right, right, right]);
    await c.start();
    await until(() => c.getView().stage === 'complete');
    const v = c.getView();
    expect(v.session.xp).toBe(30);
    expect(v.session.records.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct']);
    expect(v.session.records.every((r) => r.attempts.every((a) => a.via === 'voice'))).toBe(true);
    expect(mic.calls).toBe(1);
    expect(stt.listens).toBe(3);
    expect(tts.spoken.some((t) => t.startsWith('Lesson complete. 3 of 3'))).toBe(true);
  });

  it('wrong then right = correct-retry with no XP; two wrongs reveal', async () => {
    const { c } = setup([wrong, right, wrong, wrong, right]);
    await c.start();
    await until(() => c.getView().stage === 'complete');
    const recs = c.getView().session.records;
    expect(recs.map((r) => r.outcome)).toEqual(['correct-retry', 'revealed', 'correct']);
    expect(c.getView().session.xp).toBe(12); // 1 (retry on a 2-choice item: guess-corrected credit 0 → minimum 1) + 1 (revealed) + 10
  });

  it('silence and unclear speech never consume attempts', async () => {
    const { c, tts } = setup([{ silence: true }, 'banana', right, right, right]);
    await c.start();
    await until(() => c.getView().stage === 'complete');
    const r0 = c.getView().session.records[0];
    expect(r0.attempts).toHaveLength(1);
    expect(r0.outcome).toBe('correct');
    expect(r0.unclear).toBe(2);
    expect(tts.spoken).toContain("I didn't hear you. One, or five?");
  });

  it('bounded silence falls back to a Listen tap', async () => {
    const { c } = setup([{ silence: true }, { silence: true }, { silence: true }, right, right, right]);
    await c.start();
    await until(() => c.getView().needsListenTap);
    expect(c.getView().session.records[0].attempts).toHaveLength(0);
    c.listenNow();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.xp).toBe(30);
  });

  it('voice commands: repeat replays, skip skips, stop pauses and releases mic', async () => {
    const { c, stt } = setup(['repeat', right, 'skip', 'stop']);
    await c.start();
    await until(() => c.getView().phase === 'paused');
    const v = c.getView();
    expect(v.session.records[0].outcome).toBe('correct');
    expect(v.session.records[1].outcome).toBe('skipped');
    expect(v.index).toBe(2);
    expect(v.mic).toBe('off');
    expect(stt.aborts).toBeGreaterThan(0);
  });
});

describe('LessonController — permissions', () => {
  const denied: AccessError = { stage: 'capture', code: 'permission-denied', raw: 'NotAllowedError: Permission denied' };

  it('capture denial at Start shows the error and does not start', async () => {
    const { c } = setup([right, right, right], { micError: denied });
    await c.start();
    expect(c.getView().error).toEqual(denied);
    expect(c.getView().stage).toBe('starting');
  });

  it('Retry after fixing permission continues; nothing is scored as wrong', async () => {
    const { c, mic } = setup([right, right, right], { micError: denied });
    await c.start();
    mic.error = null;
    await c.retryAccess();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.xp).toBe(30);
  });

  it('recognition-service denial mid-question preserves the exercise', async () => {
    const svc: AccessError = { stage: 'recognition', code: 'service-denied', raw: 'not-allowed' };
    const { c, tts } = setup([right, { error: svc }, right, right]);
    await c.start();
    await until(() => c.getView().error !== null);
    const v = c.getView();
    expect(v.index).toBe(1);
    expect(v.error?.stage).toBe('recognition');
    expect(v.session.records[1].attempts).toHaveLength(0);
    const prompts = tts.spoken.filter((t) => t.startsWith('Round 2')).length;
    await c.retryAccess();
    await until(() => c.getView().stage === 'complete');
    expect(tts.spoken.filter((t) => t.startsWith('Round 2')).length).toBe(prompts + 1); // replayed, same question
    expect(c.getView().session.xp).toBe(30);
  });

  it('denied capture can switch to Buttons and finish', async () => {
    const { c } = setup([], { micError: denied });
    await c.start();
    c.setMode('buttons');
    await c.start();
    for (let i = 0; i < 3; i++) {
      await until(() => c.getView().phase === 'listening' && c.getView().stage === 'question');
      c.answer(c.getView().question.answer);
      await until(() => c.getView().session.records[i].outcome !== 'pending');
    }
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.xp).toBe(30);
  });
});

describe('LessonController — mode switching', () => {
  it('Voice → Buttons while listening cancels recognition; a late double click scores once', async () => {
    const { c, stt } = setup([{ hang: true }]);
    await c.start();
    await until(() => c.getView().stage === 'question' && c.getView().mic === 'capturing');
    const aborts = stt.aborts;
    c.setMode('buttons');
    expect(stt.aborts).toBeGreaterThan(aborts);
    await until(() => c.getView().phase === 'listening' && c.getView().mode === 'buttons');
    const q = c.getView().question;
    c.answer(q.answer);
    c.answer(q.answer); // duplicate
    await until(() => c.getView().session.records[0].outcome !== 'pending');
    expect(c.getView().session.records[0].attempts).toHaveLength(1);
    expect(c.getView().session.xp).toBe(10);
  });

  it('Buttons → Voice mid-question replays the prompt and keeps attempts and score', async () => {
    const { c, tts } = setup([right, right, right], { mode: 'buttons' });
    await c.start();
    await until(() => c.getView().stage === 'question' && c.getView().phase === 'listening');
    // one wrong attempt by button
    const q = c.getView().question;
    c.answer(q.answer === 1 ? 5 : 1);
    await until(() => c.getView().phase === 'listening' && c.getView().session.records[0].attempts.length === 1);
    const before = tts.spoken.filter((t) => t.startsWith('Round 1')).length;
    c.setMode('voice');
    await until(() => c.getView().stage === 'complete');
    const r0 = c.getView().session.records[0];
    expect(tts.spoken.filter((t) => t.startsWith('Round 1')).length).toBe(before + 1);
    expect(r0.attempts.map((a) => a.via)).toEqual(['buttons', 'voice']);
    expect(r0.outcome).toBe('correct-retry');
    expect(c.getView().session.xp).toBe(21); // 1 (2-choice retry → minimum 1 XP) + 10 + 10
  });

  it('switching during feedback does not double-score and moves on', async () => {
    const { c, tts } = setup([right, right, right]);
    tts.holdIf = (t) => isPraise(t);
    await c.start();
    await until(() => c.getView().phase === 'feedback' && c.getView().feedback?.kind === 'correct');
    tts.holdIf = () => false;
    c.setMode('buttons');
    await until(() => c.getView().index === 1 && c.getView().phase === 'listening');
    expect(c.getView().session.xp).toBe(10);
    c.answer(c.getView().question.answer);
    await until(() => c.getView().index === 2 && c.getView().phase === 'listening');
    c.answer(c.getView().question.answer);
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.xp).toBe(30);
  });

  it('pause releases the mic; resume replays the current question', async () => {
    const { c, tts } = setup([{ hang: true }, right, right, right]);
    await c.start();
    await until(() => c.getView().mic === 'capturing');
    c.pause();
    expect(c.getView().phase).toBe('paused');
    expect(c.getView().mic).toBe('off');
    await c.resume();
    await until(() => c.getView().stage === 'complete');
    expect(tts.spoken.filter((t) => t.startsWith('Round 1')).length).toBe(2);
    expect(c.getView().session.xp).toBe(30);
  });
});
