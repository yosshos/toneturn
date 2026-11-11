import { describe, expect, it } from 'vitest';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock } from '../src/game/fakes';
import { bflatTwoHomes } from '../src/engine/lesson';
import { topicLesson } from '../src/engine/topicKit';

// Playtesting 0.68.1: controls in the exercise must never be dead buttons.
const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 800) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}
const make = (lesson: ReturnType<typeof bflatTwoHomes>, audio = new FakeAudio()) => ({
  audio,
  c: new LessonController(lesson, { audio, tts: new FakeTTS(), stt: new ScriptedTranscriber([]), mic: new FakeMic(null), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true }, { inputLang: 'en', outputLang: 'en', naming: 'letter' }, 'buttons'),
});

describe('Repeat is never a dead button', () => {
  it('after a wrong rhythm take (gap click), Repeat plays the reference rhythm', async () => {
    const def = topicLesson('gap-click', 1, 11, 1);
    expect(def.questions[0].stimulus).toEqual([]); // the sound comes from the performance timeline
    const audio = new FakeAudio();
    const { c } = make({ ...def, intro: [] }, audio);
    // Every take: one tap far off the beat → wrong.
    audio.respond = (start) => {
      c.tapBeat(start + 777);
    };
    await c.start();
    await until(() => !!c.getView().awaitNext);
    const before = audio.log.length;
    c.repeat();
    const played = audio.log.slice(before).filter((l) => l.startsWith('play:'));
    expect(played.length).toBe(1);
    expect(Number(played[0].slice(5))).toBeGreaterThan(0);
  });

  it('during the intro, Repeat replays the current intro step', async () => {
    const lesson = bflatTwoHomes(3);
    expect(lesson.intro.length).toBeGreaterThan(0);
    const tts = new FakeTTS();
    tts.holdIf = () => true; // hold on the first intro line
    const audio = new FakeAudio();
    const c = new LessonController(lesson, { audio, tts, stt: new ScriptedTranscriber([]), mic: new FakeMic(null), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true }, { inputLang: 'en', outputLang: 'en', naming: 'letter' }, 'buttons');
    await c.start();
    await until(() => c.getView().stage === 'intro' && tts.spoken.length > 0);
    const plays = audio.log.filter((l) => l.startsWith('play:')).length;
    c.repeat();
    await until(() => audio.log.filter((l) => l.startsWith('play:')).length > plays);
    expect(c.getView().stage).toBe('intro');
    expect(c.getView().introStep).toBe(0);
  });
});
