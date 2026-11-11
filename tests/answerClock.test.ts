import { describe, expect, it } from 'vitest';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber } from '../src/game/fakes';
import { bflatTwoHomes } from '../src/engine/lesson';
import { Cancelled, type Clock } from '../src/game/adapters';

// Playtesting 0.68: "I answered every easy question the instant I could, and the recap said I was slower than the
// goal". The answer clock starts when the stimulus has finished AND the answer buttons are on screen and enabled.
const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 500) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}

function setup() {
  let t = 0;
  const clock: Clock & { advance: (ms: number) => void } = {
    now: () => t,
    advance: (ms) => void (t += ms),
    sleep: async (_ms, signal) => {
      if (signal.aborted) throw new Cancelled();
      await Promise.resolve();
    },
  };
  const lesson = { ...bflatTwoHomes(3), intro: [] };
  const c = new LessonController(lesson, { audio: new FakeAudio(), tts: new FakeTTS(), stt: new ScriptedTranscriber([]), mic: new FakeMic(null), pitch: new ScriptedPitch([]), clock, simulated: true }, { inputLang: 'en', outputLang: 'en', naming: 'letter' }, 'buttons');
  return { c, clock };
}

describe('answer clock', () => {
  it('starts when the buttons are enabled on screen, not when the sound ended', async () => {
    const { c, clock } = setup();
    await c.start();
    await until(() => c.getView().stage === 'question' && c.getView().phase === 'listening');
    clock.advance(900); // a slow frame: the buttons paint 0.9 s after the sound ended
    c.answerReady();
    clock.advance(120);
    c.answer(c.getView().question.answer);
    await until(() => c.getView().session.records[0].outcome !== 'pending');
    expect(c.getView().session.records[0].attempts[0].timeMs).toBe(120);
  });

  it('a second ready report in the same turn does not move the start', async () => {
    const { c, clock } = setup();
    await c.start();
    await until(() => c.getView().phase === 'listening');
    c.answerReady();
    clock.advance(300);
    c.answerReady();
    clock.advance(100);
    c.answer(c.getView().question.answer);
    await until(() => c.getView().session.records[0].outcome !== 'pending');
    expect(c.getView().session.records[0].attempts[0].timeMs).toBe(400);
  });

  it('without a ready report it falls back to the end of the stimulus', async () => {
    const { c, clock } = setup();
    await c.start();
    await until(() => c.getView().phase === 'listening');
    clock.advance(700);
    c.answer(c.getView().question.answer);
    await until(() => c.getView().session.records[0].outcome !== 'pending');
    expect(c.getView().session.records[0].attempts[0].timeMs).toBe(700);
  });
});
