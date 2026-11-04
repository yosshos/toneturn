import { describe, expect, it } from 'vitest';
import { compareStimulus, INTERVAL_SEMITONES, intervalsLesson, inversionQuestion, inversionsLesson, questionSkill, questionTag, renderStimulus } from '../src/engine/lesson';
import { parseInterval, parseInversion } from '../src/engine/parser';
import { questionFromTag } from '../src/engine/adaptive';
import { pc } from '../src/engine/pitch';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock } from '../src/game/fakes';
import { answerWord } from '../src/game/content';

const val = <T,>(r: { kind: string; value?: T }) => (r.kind === 'answer' ? r.value : r.kind);

describe('intervals lesson', () => {
  it('six items: three melodic then three harmonic, every interval appears, sizes are right', () => {
    for (let seed = 0; seed < 30; seed++) {
      const l = intervalsLesson(seed);
      expect(l.questions.map((q) => (q.kind === 'interval' ? q.mode : ''))).toEqual(['melodic', 'melodic', 'melodic', 'harmonic', 'harmonic', 'harmonic']);
      expect(new Set(l.questions.map((q) => q.answer))).toEqual(new Set(['M3', 'P5', 'P8']));
      for (const q of l.questions) {
        if (q.kind !== 'interval') throw new Error('kind');
        const { events } = renderStimulus(q.stimulus);
        expect(events[1].midi - events[0].midi).toBe(INTERVAL_SEMITONES[q.answer]);
        expect(questionSkill(q)).toBe('intervals');
      }
    }
  });
  it.each([
    ['third', 'M3'], ['a major third', 'M3'], ['fifth', 'P5'], ['perfect fifth', 'P5'], ['octave', 'P8'], ['eight', 'P8'],
    ['טרצה', 'M3'], ['קווינטה', 'P5'], ['אוקטבה', 'P8'], ['זו קווינטה', 'P5'],
  ])('parse %s → %s', (t, v) => expect(val(parseInterval(t))).toBe(v));
  it('your interval next to the right one', () => {
    const q = intervalsLesson(1).questions[0];
    if (q.kind !== 'interval') throw new Error('kind');
    const other = q.answer === 'P8' ? 'M3' : 'P8';
    const { events } = renderStimulus(compareStimulus(q, other)!);
    expect(events[1].midi - events[0].midi).toBe(INTERVAL_SEMITONES[other]);
    expect(events[3].midi - events[2].midi).toBe(INTERVAL_SEMITONES[q.answer]);
  });
});

describe('inversions lesson', () => {
  it('bass note is the root / third / fifth and clearly below the triad', () => {
    for (const bass of ['root', 'third', 'fifth'] as const) {
      const q = inversionQuestion('x', pc('C'), bass);
      const { events } = renderStimulus(q.stimulus);
      const lowest = Math.min(...events.map((e) => e.midi));
      expect(lowest % 12).toBe({ root: 0, third: 4, fifth: 7 }[bass]);
      const upper = events.filter((e) => e.midi !== lowest).map((e) => e.midi);
      expect(Math.min(...upper) - lowest).toBeGreaterThanOrEqual(9);
      expect(events[0].midi).toBe(lowest); // the bass alone comes first
    }
  });
  it('all roles appear', () => {
    for (let seed = 0; seed < 20; seed++) expect(new Set(inversionsLesson(seed).questions.map((q) => q.answer))).toEqual(new Set(['root', 'third', 'fifth']));
  });
  it.each([
    ['root', 'root'], ['root position', 'root'], ['first inversion', 'third'], ['second inversion', 'fifth'], ['the third', 'third'],
    ['שורש', 'root'], ['מצב יסודי', 'root'], ['היפוך ראשון', 'third'], ['היפוך שני', 'fifth'], ['קווינטה', 'fifth'],
  ])('parse %s → %s', (t, v) => expect(val(parseInversion(t))).toBe(v));
  it('review tags rebuild into fresh items', () => {
    const iq = intervalsLesson(2).questions[4];
    expect(questionFromTag(questionTag(iq), 5, 'r')?.kind).toBe('interval');
    expect(questionFromTag('inversion:fifth', 5, 'r')?.answer).toBe('fifth');
  });
  it('spoken words', () => {
    expect(answerWord(inversionQuestion('x', pc('C'), 'third'), 'third', 'he')).toBe('הטרצה');
  });
});

describe('hands-free runs of the new lessons', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function until(pred: () => boolean, max = 1500) {
    for (let i = 0; i < max; i++) {
      if (pred()) return;
      await tick();
    }
    throw new Error('condition not reached');
  }
  const words: Record<string, string> = { M3: 'third', P5: 'fifth', P8: 'octave', root: 'root position', third: 'first inversion', fifth: 'second inversion' };
  it.each([
    ['intervals', intervalsLesson],
    ['inversions', inversionsLesson],
  ] as const)('%s by voice', async (_n, make) => {
    const lesson = make(4);
    const stt = new ScriptedTranscriber(Array.from({ length: 8 }, () => (e: unknown) => words[String(e)]));
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'he', naming: 'solfege' },
      'voice',
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.records.every((r) => r.outcome === 'correct')).toBe(true);
  });
});
