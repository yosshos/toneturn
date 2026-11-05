// A second Skip during the short beat after the first moves on at once (it used to restart the beat,
// so quick repeated taps never advanced).
import { expect, it } from 'vitest';
import { LessonController } from '../src/game/controller';
import { placementLesson, adaptPlacement } from '../src/engine/placement';
import { FakeAudio, FakeTTS, FakeMic, ScriptedPitch, ScriptedTranscriber } from '../src/game/fakes';
import { Cancelled, type Adapters, type Clock } from '../src/game/adapters';

const realClock: Clock = {
  sleep: (ms, signal) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(new Cancelled());
      const t = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => (clearTimeout(t), reject(new Cancelled())), { once: true });
    }),
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

it('repeated Skip taps (every 300 ms, faster than the 700 ms beat) still walk through Find my level', async () => {
  const lesson = placementLesson(5, { singing: false });
  const ad = { audio: new FakeAudio(), tts: new FakeTTS(), stt: new ScriptedTranscriber([{ hang: true }, { hang: true }, { hang: true }]), mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: realClock, simulated: true } as unknown as Adapters;
  const c = new LessonController(lesson, ad, { inputLang: 'en', outputLang: 'en', naming: 'letter' } as never, 'buttons', { adapt: (s) => adaptPlacement(s, 5) });
  void c.start();
  for (let i = 0; i < 60 && c.getView().stage !== 'complete'; i++) {
    await wait(300);
    c.skip();
  }
  expect(c.getView().stage).toBe('complete');
  c.dispose();
}, 40_000);
