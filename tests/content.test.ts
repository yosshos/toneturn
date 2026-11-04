import { describe, expect, it } from 'vitest';
import { LESSON_ORDER, makeLesson, renderStimulus, type Question } from '../src/engine/lesson';
import { parseCadence, parseQuality } from '../src/engine/parser';
import { evaluateSung, syntheticFrames } from '../src/engine/sing';
import { degreeInMajor, pcValue } from '../src/engine/pitch';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock, type ScriptStep, type SingStep } from '../src/game/fakes';
import { LESSON_META, roundPrompt, singFeedbackText } from '../src/game/content';
import { mergeResults, pendingUploads, rebuildProgress } from '../src/storage/sync';
import type { LessonResult } from '../src/storage/progress';

const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 800) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}

describe('lesson catalogue', () => {
  it.each(LESSON_ORDER)('%s generates deterministically, with intro, meta and playable stimulus', (id) => {
    const a = makeLesson(id, 11);
    const b = makeLesson(id, 11);
    expect(a.questions.map((q) => q.answer)).toEqual(b.questions.map((q) => q.answer));
    expect(a.intro.length).toBeGreaterThan(0);
    expect(LESSON_META[id].title.en.length).toBeGreaterThan(3);
    for (const q of a.questions) {
      const { events, length } = renderStimulus(q.stimulus);
      const symbolic = q.stimulus.length === 0; // name→degree / degree→name: no sound by design
      if (!symbolic) {
        expect(events.length).toBeGreaterThan(0);
        expect(length).toBeGreaterThan(1);
      }
      for (const e of events.filter((x) => !x.perc)) {
        expect(e.midi).toBeGreaterThanOrEqual(36);
        expect(e.midi).toBeLessThanOrEqual(84);
      }
      // Performance items (singing, rhythm reading) have no answer choices.
      if (q.kind !== 'sing' && q.kind !== 'sing-seq' && q.kind !== 'rhythm-read') expect(q.choices).toContain(q.answer);
    }
  });

  it('every answer choice appears across seeds (no lopsided lessons)', () => {
    for (const id of LESSON_ORDER) {
      if (['sing-home-five', 'notes-degrees', 'sing-names', 'sing-degrees', 'rhythm-r1', 'rhythm-r2', 'rhythm-r3'].includes(id)) continue; // mixed / open answer sets
      for (let seed = 0; seed < 30; seed++) {
        const l = makeLesson(id, seed);
        const answers = new Set(l.questions.map((q) => q.answer));
        for (const c of l.questions[0].choices) expect(answers).toContain(c);
      }
    }
  });

  it('degree questions are musically correct: target is that degree of the key', () => {
    for (let seed = 0; seed < 40; seed++) {
      for (const q of makeLesson('degrees-135', seed).questions) {
        if (q.kind !== 'degree') throw new Error('kind');
        expect(degreeInMajor(q.key, q.target)).toBe(q.answer);
        expect(((q.targetMidi % 12) + 12) % 12).toBe(pcValue(q.target));
      }
    }
  });

  it('quality chords really are major / minor triads', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const q of makeLesson('major-minor', seed).questions) {
        if (q.kind !== 'quality') throw new Error('kind');
        const chord = q.stimulus.find((s) => s.kind === 'chord');
        if (!chord || chord.kind !== 'chord') throw new Error('no chord');
        expect(chord.midis[1] - chord.midis[0]).toBe(q.answer === 'maj' ? 4 : 3);
        expect(chord.midis[2] - chord.midis[0]).toBe(7);
      }
    }
  });

  it('cadence phrases end on I (resolved) or V (open)', () => {
    for (const q of makeLesson('cadences', 3).questions) {
      if (q.kind !== 'cadence') throw new Error('kind');
      const ph = q.stimulus[0];
      if (ph.kind !== 'phrase') throw new Error('phrase');
      expect(ph.chords.at(-1)).toBe(q.answer === 'resolved' ? 'I' : 'V');
    }
  });

  it('sing targets are degree 1 then 5 relative to the played tonic', () => {
    const l = makeLesson('sing-home-five', 4);
    const qs = l.questions as Extract<Question, { kind: 'sing' }>[];
    expect(qs.map((q) => q.degree)).toEqual([1, 5, 5]);
    for (const q of qs) {
      const tonic = q.stimulus.find((s) => s.kind === 'note');
      if (!tonic || tonic.kind !== 'note') throw new Error('tonic');
      expect(q.targetMidi - tonic.midi).toBe(q.degree === 1 ? 0 : 7);
    }
  });
});

describe('parsers: quality & cadence', () => {
  const v = <T,>(r: { kind: string; value?: T }) => (r.kind === 'answer' ? r.value : r.kind);
  it.each([
    ['major', 'maj'], ['Major!', 'maj'], ['it is minor', 'min'], ['happy', 'maj'], ['sad', 'min'],
    ["מז'ור", 'maj'], ['מייג׳ור', 'maj'], ['מינור', 'min'], ['זה מינור', 'min'],
  ])('quality %s → %s', (t, x) => expect(v(parseQuality(t))).toBe(x));
  it('quality ambiguity and commands', () => {
    expect(parseQuality('major or minor').kind).toBe('ambiguous');
    expect(parseQuality('repeat').kind).toBe('command');
    expect(parseQuality('banana').kind).toBe('unrecognized');
  });
  it.each([
    ['resolved', 'resolved'], ['it went home', 'resolved'], ['closed', 'resolved'], ['open', 'open'], ['half', 'open'],
    ['not resolved', 'open'], ['unresolved', 'open'], ['נפתר', 'resolved'], ['הביתה', 'resolved'], ['פתוח', 'open'], ['לא נפתר', 'open'], ['תלוי', 'open'],
  ])('cadence %s → %s', (t, x) => expect(v(parseCadence(t))).toBe(x));
});

describe('sung pitch scoring', () => {
  const T = 67; // G4
  it.each([
    [0, 'accurate'], [30, 'accurate'], [-34, 'accurate'], [45, 'sharp'], [-60, 'flat'], [150, 'wrong'], [-300, 'wrong'],
  ])('%s cents → %s', (c, status) => expect(evaluateSung(syntheticFrames(T, c), T).status).toBe(status));
  it('octave-insensitive by default, octave-sensitive on request', () => {
    expect(evaluateSung(syntheticFrames(T, 10, 1.5, 30, -1), T).status).toBe('accurate');
    expect(evaluateSung(syntheticFrames(T, 10, 1.5, 30, -1), T, { octaveSensitive: true }).status).toBe('wrong');
  });
  it('reports signed cents', () => {
    expect(evaluateSung(syntheticFrames(T, -60), T).cents).toBe(-60);
  });
  it('too short, silent or unstable capture is unclear (never wrong)', () => {
    expect(evaluateSung(syntheticFrames(T, 0, 0.3), T).status).toBe('unclear');
    expect(evaluateSung([], T).status).toBe('unclear');
    const wobble = syntheticFrames(T, 0, 1.5).map((f, i) => ({ ...f, hz: f.hz! * Math.pow(2, ((i % 10) - 5) / 4) }));
    expect(evaluateSung(wobble, T).status).toBe('unclear');
  });
  it('ignores the attack', () => {
    const fr = syntheticFrames(T, 0, 1.5);
    for (let i = 0; i < 3; i++) fr[i] = { ...fr[i], hz: fr[i].hz! * 1.3 }; // scoop
    expect(evaluateSung(fr, T).status).toBe('accurate');
  });
  it('feedback says the direction', () => {
    expect(singFeedbackText({ status: 'sharp', cents: 45, detectedMidi: 0, voicedSeconds: 1 }, 'en')).toMatch(/high.*lower/);
    expect(singFeedbackText({ status: 'flat', cents: -60, detectedMidi: 0, voicedSeconds: 1 }, 'he')).toMatch(/נמוך.*גבוה/);
  });
});

function run(id: Parameters<typeof makeLesson>[0], script: ScriptStep[], sing: SingStep[] = [], mode: 'voice' | 'buttons' = 'voice') {
  const lesson = makeLesson(id, 5);
  const stt = new ScriptedTranscriber(script);
  const pitch = new ScriptedPitch(sing);
  const tts = new FakeTTS();
  const c = new LessonController(
    lesson,
    { audio: new FakeAudio(), tts, stt, mic: new FakeMic(), pitch, clock: immediateClock, simulated: true },
    { inputLang: 'en', outputLang: 'en', naming: 'letter' },
    mode,
  );
  stt.expected = () => c.getView().question.answer;
  pitch.target = () => {
    const q = c.getView().question;
    return q.kind === 'sing' ? q.targetMidi : 60;
  };
  return { c, tts, pitch };
}

describe('controller with new lesson kinds', () => {
  const say = (e: unknown) => (e === 'maj' ? 'major' : e === 'min' ? 'minor' : e === 1 ? 'one' : e === 3 ? 'three' : e === 5 ? 'five' : String(e));
  it.each(['degrees-135', 'major-minor', 'cadences'] as const)('%s: hands-free voice run to a perfect score', async (id) => {
    const { c } = run(id, Array.from({ length: 6 }, () => say));
    await c.start();
    await until(() => c.getView().stage === 'complete');
    const recs = c.getView().session.records;
    expect(recs.every((r) => r.outcome === 'correct')).toBe(true);
    expect(c.getView().session.xp).toBe(recs.length * 10);
  });

  it('cadence answers in Hebrew phrases parse in a run', async () => {
    const { c } = run('cadences', Array.from({ length: 6 }, () => (e: unknown) => (e === 'resolved' ? 'נפתר' : 'לא נפתר')));
    await c.start();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.records.every((r) => r.outcome === 'correct')).toBe(true);
  });

  it('singing: accurate, flat→retry→accurate, unclear does not cost an attempt', async () => {
    const { c, tts, pitch } = run('sing-home-five', [], [5, -60, 10, { noise: true }, { silence: true }, 0]);
    await c.start();
    await until(() => c.getView().stage === 'complete');
    const recs = c.getView().session.records;
    expect(recs.map((r) => r.outcome)).toEqual(['correct', 'correct-retry', 'correct']);
    expect(recs[1].attempts.map((a) => a.answer)).toEqual(['flat', 'accurate']);
    expect(recs[2].attempts).toHaveLength(1);
    expect(recs[2].unclear).toBe(2);
    expect(c.getView().session.xp).toBe(38); // 15 + round(15 × 0.5) for the 2nd-try fix + 15 (spec J.6)
    expect(tts.spoken.some((x) => /little low/.test(x))).toBe(true);
    expect(pitch.calls).toBe(6);
  });

  it('singing in Buttons mode waits for an explicit Record action', async () => {
    const { c, pitch } = run('sing-home-five', [], [0, 0, 0], 'buttons');
    await c.start();
    c.skipIntro();
    for (let i = 0; i < 3; i++) {
      await until(() => c.getView().stage === 'question' && c.getView().phase === 'listening' && c.getView().index === i);
      expect(pitch.calls).toBe(i);
      c.record();
      await until(() => c.getView().session.records[i].outcome !== 'pending');
    }
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.xp).toBe(45);
  });

  it('three wrong sung attempts reveal and play the target', async () => {
    const { c } = run('sing-home-five', [], [200, -200, 300, 0, 0]);
    await c.start();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.records[0].outcome).toBe('revealed');
  });

  it('prompts name the task', () => {
    const l = makeLesson('sing-home-five', 1);
    expect(roundPrompt(l.questions[1], 'en', 'letter', 2)).toMatch(/Sing degree five/);
    expect(roundPrompt(makeLesson('major-minor', 1).questions[0], 'he', 'solfege', 1)).toMatch(/מינור/);
  });
});

describe('cloud sync merge', () => {
  const r = (id: string, day: number, xp = 30): LessonResult => ({
    lessonId: 'bflat-two-homes',
    lessonVersion: 1,
    sessionId: id,
    completedAt: new Date(2026, 10, day, 12).toISOString(),
    firstTry: 3,
    total: 3,
    xp,
    missed: [],
  });
  it('union by session id, no double XP, deterministic order', () => {
    const local = [r('a', 1), r('b', 2)];
    const remote = [r('b', 2), r('c', 3)];
    const merged = mergeResults(local, remote);
    expect(merged.map((x) => x.sessionId)).toEqual(['a', 'b', 'c']);
    const p = rebuildProgress(merged);
    expect(p.xp).toBe(90);
    expect(p.lessons['bflat-two-homes'].completions).toBe(3);
    expect(p.streak.count).toBe(3);
    expect(rebuildProgress(mergeResults(merged, merged)).xp).toBe(90); // syncing again changes nothing
  });
  it('only uploads what the server lacks', () => {
    expect(pendingUploads([r('a', 1), r('b', 2)], [r('b', 2)]).map((x) => x.sessionId)).toEqual(['a']);
  });
});
