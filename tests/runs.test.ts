import { describe, expect, it } from 'vitest';
import { atTempo, buildRun, describeRun, gradeRun, MAX_RUN_LEVEL, runAt, runDifficulty, runFactors, runSummary, runTolerance, syntheticRun } from '../src/engine/runs';

const C = 60;
const midisOf = (offs: number[]) => offs.map((o) => C + o);

describe('run generation and difficulty (spec K.2)', () => {
  it('shapes follow the scale', () => {
    expect(buildRun('major', 'up', 5, 'tonic')).toEqual([0, 2, 4, 5, 7]);
    expect(buildRun('min-penta', 'down', 5, 'top')).toEqual([12, 10, 7, 5, 3]);
    expect(buildRun('major', 'turn', 5, 'tonic')).toEqual([0, 2, 4, 2, 0]);
  });
  it('difficulty rises along the curriculum; a fast blues run outranks a slow three-note step', () => {
    // Average over shapes/materials per level.
    const d = Array.from({ length: MAX_RUN_LEVEL }, (_, i) => Array.from({ length: 30 }, (_, s) => runDifficulty(runAt(i + 1, s))).reduce((x, y) => x + y) / 30);
    expect(d[0]).toBe(900);
    expect(d[MAX_RUN_LEVEL - 1]).toBeGreaterThan(d[0] + 400);
    for (let i = 1; i < d.length; i++) expect(d[i], `level ${i + 1}`).toBeGreaterThan(d[i - 1]);
    const blues = runAt(8, 1);
    expect(runFactors(blues).speed).toBe(3);
    expect(runFactors(blues).length).toBe(3);
  });
  it('slow-down practice keeps the notes and lowers the speed', () => {
    const r = runAt(6, 2);
    const slow = atTempo(r, 0.6);
    expect(slow.offsets).toEqual(r.offsets);
    expect(slow.nps).toBeCloseTo(r.nps * 0.6, 1);
    expect(runDifficulty(slow)).toBeLessThanOrEqual(runDifficulty(r));
  });
  it('tolerance widens with speed (±35 ¢ slow → ±50 ¢ fast)', () => {
    expect(runTolerance(2)).toBe(35);
    expect(runTolerance(7)).toBe(50);
  });
  it('told-mode description', () => {
    expect(describeRun({ offsets: [0, 2, 4, 2, 0], nps: 3.3, material: 'maj-penta', shape: 'turn', level: 3 }, 'en')).toBe('major pentatonic, up and back down, 5 notes, 3.3 per second');
  });
});

describe('run grading (spec K.3–K.4)', () => {
  const run = midisOf(buildRun('major', 'up', 5, 'tonic'));
  it('a clean run passes, also an octave lower (male voice)', () => {
    for (const octave of [0, -1]) {
      const g = gradeRun(syntheticRun(run, 4, { octave }), run, 4);
      expect(g.notes.map((n) => n.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
      expect(g.pass).toBe(true);
      expect(g.accuracy).toBeGreaterThan(0.95);
    }
  });
  it('fast notes get a wider tolerance: 45 ¢ flat is fine at 7 n/s but flat at 2 n/s', () => {
    const cents = [0, 0, -45, 0, 0];
    expect(gradeRun(syntheticRun(run, 7, { cents, fps: 50 }), run, 7).notes[2].status).toBe('ok');
    expect(gradeRun(syntheticRun(run, 2, { cents }), run, 2).notes[2].status).toBe('flat');
  });
  it('a wrong note and a summary', () => {
    const sung = [...run];
    sung[3] = C + 6; // F♯ instead of F
    const g = gradeRun(syntheticRun(sung, 3), run, 3);
    expect(g.notes[3].status).toBe('wrong');
    expect(g.pass).toBe(false);
    expect(runSummary(g, 'en')).toBe('note 4 was wrong');
  });
  it('a smeared glide scores low on clarity even if start and end are right', () => {
    const clean = gradeRun(syntheticRun(run, 5), run, 5);
    const smear = gradeRun(syntheticRun(run, 5, { smear: true }), run, 5);
    expect(smear.clarity).toBeLessThan(clean.clarity);
    expect(smear.accuracy).toBeLessThan(clean.accuracy);
  });
  it('silence is unclear, not wrong', () => {
    expect(gradeRun([], run, 4).unclear).toBe(true);
  });
});

describe('runs in lessons, review and parsing', async () => {
  const { makeLesson, questionTag, questionSkill, runsWorkshop, runLevelFor } = await import('../src/engine/lesson');
  const { questionFromTag } = await import('../src/engine/adaptive');
  const { parseAnswer } = await import('../src/game/content');
  it('the runs lesson: two recognition items, three sung runs, all on the Vocal agility axis', () => {
    const l = makeLesson('runs', 4);
    expect(l.questions.map((q) => q.kind)).toEqual(['run-id', 'run-id', 'sing-run', 'sing-run', 'sing-run']);
    expect(l.questions.every((q) => questionSkill(q) === 'agility')).toBe(true);
    for (const q of l.questions) if (q.kind === 'run-id') expect(q.choices).toContain(q.answer);
  });
  it('workshop: each run at 60 %, 80 %, 100 % tempo, same notes', () => {
    const w = runsWorkshop(5, 1);
    const sung = w.questions.filter((q) => q.kind === 'sing-run');
    expect(sung).toHaveLength(6);
    if (sung[0].kind !== 'sing-run' || sung[2].kind !== 'sing-run') throw new Error();
    expect(sung[0].midis).toEqual(sung[2].midis);
    expect(sung[0].run.nps).toBeLessThan(sung[2].run.nps);
    expect(runLevelFor(null)).toBe(1);
    expect(runLevelFor(1500)).toBeGreaterThan(5);
  });
  it('review rebuilds a missed run from its tag', () => {
    for (const q of makeLesson('runs', 9).questions) {
      const again = questionFromTag(questionTag(q), 3, 'r1')!;
      expect(again.kind).toBe(q.kind);
      expect(questionTag(again)).toBe(questionTag(q));
    }
  });
  it('spoken run answers: “blues”, “pentatonic”, “up and down”, Hebrew', () => {
    const l = makeLesson('runs', 2);
    const mat = l.questions[0];
    const shape = l.questions[1];
    expect(parseAnswer(mat, ['that was blues'])).toMatchObject({ kind: 'answer', value: 'blues' });
    expect(parseAnswer(mat, ['פנטטוני'])).toMatchObject({ kind: 'answer', value: 'min-penta' });
    expect(parseAnswer(shape, ['up and down'])).toMatchObject({ kind: 'answer', value: 'turn' });
    expect(parseAnswer(shape, ['יורד'])).toMatchObject({ kind: 'answer', value: 'down' });
  });
});

describe('runs lesson hands-free (controller)', async () => {
  const { makeLesson } = await import('../src/engine/lesson');
  const { LessonController } = await import('../src/game/controller');
  const { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock } = await import('../src/game/fakes');
  const { answerWord } = await import('../src/game/content');
  const tick = () => new Promise((r) => setTimeout(r, 0));
  it('names two runs by voice, then sings three runs back — all first try', async () => {
    const lesson = makeLesson('runs', 11);
    const sung = lesson.questions.flatMap((q) => (q.kind === 'sing-run' ? [{ midis: q.midis }] : []));
    const stt = new ScriptedTranscriber(Array.from({ length: 4 }, () => (a: unknown) => answerWord(lesson.questions[0], a as string, 'en')));
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch(sung), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'voice',
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    for (let i = 0; i < 3000 && c.getView().stage !== 'complete'; i++) await tick();
    const recs = c.getView().session.records;
    expect(recs.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    c.dispose();
  });
});
