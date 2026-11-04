import { describe, expect, it } from 'vitest';
import {
  nameToDegreeQuestion,
  noteNameQuestion,
  notesDegrees,
  pcKey,
  questionSkill,
  questionTag,
  singByQuestion,
  singDegrees,
  singNames,
  singSeqQuestion,
  compareStimulus,
  renderStimulus,
} from '../src/engine/lesson';
import { gradeSungSequence } from '../src/engine/memory';
import { pc, pcValue } from '../src/engine/pitch';
import { questionFromTag } from '../src/engine/adaptive';
import { parseAnswer, roundPrompt, choiceLabel } from '../src/game/content';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock, sungSequence, type SingStep } from '../src/game/fakes';
import { referenceTime } from '../src/engine/scoring';

const Eb = pc('Eb');

describe('matrix #2 / #6: note names', () => {
  it('heard → name: key cadence then the note; answer and choices are the spelled scale', () => {
    const q = noteNameQuestion('q', Eb, 5, true);
    expect(q.answer).toBe('B-1');
    expect(q.choices).toEqual(['E-1', 'F0', 'G0', 'A-1', 'B-1', 'C0', 'D0']);
    expect(q.stimulus[0].kind).toBe('cadence'); // reference before an absolute name
    expect(q.targetMidi % 12).toBe(pcValue(pc('Bb')));
    expect(questionSkill(q)).toBe('notes');
  });
  it('degree → name is symbolic (no sound) and counts as degree theory', () => {
    const q = noteNameQuestion('q', Eb, 4, false);
    expect(q.stimulus).toEqual([]);
    expect(q.answer).toBe('A-1');
    expect(questionSkill(q)).toBe('degrees');
    expect(referenceTime(q, 'buttons')).toBeGreaterThan(referenceTime(noteNameQuestion('x', Eb, 4, true), 'buttons'));
  });
  it('voice answers in either naming system and language', () => {
    const q = noteNameQuestion('q', Eb, 5, true);
    const v = (t: string, nm: 'letter' | 'solfege') => {
      const r = parseAnswer(q, [t], nm);
      return r.kind === 'answer' ? r.value : r.kind;
    };
    expect(v('B flat', 'letter')).toBe('B-1');
    expect(v('Bb', 'letter')).toBe('B-1');
    expect(v('si flat', 'solfege')).toBe('B-1');
    expect(v('סי במול', 'solfege')).toBe('B-1');
    expect(v('בי במול', 'letter')).toBe('B-1');
    expect(v('B flat or F', 'letter')).toBe('ambiguous');
  });
  it('labels follow naming', () => {
    const q = noteNameQuestion('q', Eb, 5, true);
    expect(choiceLabel(q, 'B-1', 'en', 'letter').big).toBe('B♭');
    expect(choiceLabel(q, 'B-1', 'he', 'solfege').big).toBe('סי♭');
  });
  it('your note vs the right one', () => {
    const q = noteNameQuestion('q', Eb, 5, true);
    const { events } = renderStimulus(compareStimulus(q, 'G0')!);
    expect(events.map((e) => e.midi % 12)).toEqual([7, 10]);
  });
});

describe('matrix #5: name → degree', () => {
  it('symbolic, all seven degrees offered, prompt names the note and the key', () => {
    const q = nameToDegreeQuestion('q', Eb, 5);
    expect(q.stimulus).toEqual([]);
    expect(q.choices).toHaveLength(7);
    expect(q.answer).toBe(5);
    expect(roundPrompt(q, 'en', 'letter', 1)).toBe('Round 1. In E flat major, which degree is B flat?');
    expect(roundPrompt(q, 'he', 'solfege', 1)).toContain('סי במול');
  });
});

describe('matrix #4 / #7: sing by name, echo', () => {
  it('name → sing gets a key reference; echo plays exactly the note', () => {
    const named = singByQuestion('q', pc('D'), 3, 'name');
    expect(named.stimulus[0].kind).toBe('cadence');
    const echo = singByQuestion('q', pc('D'), 3, 'echo');
    expect(echo.stimulus).toEqual([{ kind: 'note', midi: echo.targetMidi, duration: 1.4 }]);
    expect(roundPrompt(named, 'en', 'letter', 2)).toBe('Round 2. D major. Sing F sharp.');
  });
});

describe('matrix #3 (sequence): sing the degrees', () => {
  const q = singSeqQuestion('q', pc('C'), [1, 3, 5]);
  it('right notes in any octave pass', () => {
    const g = gradeSungSequence(sungSequence(q.midis.map((m) => m - 12)), q.midis);
    expect(g.pass).toBe(true);
    expect(g.accuracy).toBe(1);
  });
  it('one wrong note → partial credit and a per-note strip', () => {
    const g = gradeSungSequence(sungSequence([q.midis[0], q.midis[1] + 1, q.midis[2]]), q.midis);
    expect(g.pass).toBe(false);
    expect(g.notes.map((n) => n.status)).toEqual(['ok', 'wrong', 'ok']);
    expect(g.accuracy).toBeCloseTo(2 / 3);
  });
  it('a missed note does not shift the others', () => {
    const g = gradeSungSequence(sungSequence([q.midis[0], q.midis[2]]), q.midis);
    expect(g.notes.map((n) => n.status)).toEqual(['ok', 'missed', 'ok']);
  });
  it('silence is unclear, never wrong', () => {
    expect(gradeSungSequence([], q.midis).unclear).toBe(true);
  });
  it('review tags rebuild every new kind', () => {
    for (const x of [noteNameQuestion('a', Eb, 2, true), noteNameQuestion('b', Eb, 6, false), q]) {
      const r = questionFromTag(questionTag(x), 3, 'r');
      expect(r?.kind).toBe(x.kind);
      expect(r?.answer).toBe(x.answer);
    }
  });
});

describe('hands-free runs', () => {
  const tick = () => new Promise((r) => setTimeout(r, 0));
  async function until(pred: () => boolean, max = 1500) {
    for (let i = 0; i < max; i++) {
      if (pred()) return;
      await tick();
    }
    throw new Error('condition not reached');
  }
  const he: Record<string, string> = { C: 'דו', D: 'רה', E: 'מי', F: 'פה', G: 'סול', A: 'לה', B: 'סי' };
  const heNumbers = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע'];

  it('Notes and degrees by voice in Hebrew with Do-Re-Mi', async () => {
    const lesson = notesDegrees(8);
    const say = (e: unknown) => {
      if (typeof e === 'number') return heNumbers[e];
      const k = String(e);
      const acc = k.endsWith('-1') ? ' במול' : k.endsWith('1') ? ' דיאז' : '';
      return he[k[0]] + acc;
    };
    const stt = new ScriptedTranscriber(Array.from({ length: 8 }, () => say));
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch([]), clock: immediateClock, simulated: true },
      { inputLang: 'he', outputLang: 'he', naming: 'solfege', inputNaming: 'solfege' },
      'voice',
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.records.every((r) => r.outcome === 'correct')).toBe(true);
    expect(new Set(lesson.questions.map((q) => (q.kind === 'note-name' ? q.direction : q.kind === 'degree' ? q.direction : '')))).toEqual(
      new Set(['heard-pitch→name', 'name→degree', 'degree→name']),
    );
  });

  it('Sing it by name: echo and named notes', async () => {
    const lesson = singNames(4);
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt: new ScriptedTranscriber([]), mic: new FakeMic(), pitch: new ScriptedPitch([5, -10, 20, 0]), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'voice',
    );
    (c as unknown as { ad: { pitch: ScriptedPitch } }).ad.pitch.target = () => {
      const q = c.getView().question;
      return q.kind === 'sing' ? q.targetMidi : 60;
    };
    await c.start();
    await until(() => c.getView().stage === 'complete');
    expect(c.getView().session.records.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct', 'correct']);
  });

  it('Sing the degrees: one wrong note, then right', async () => {
    const lesson = singDegrees(2);
    const qs = lesson.questions.map((q) => (q.kind === 'sing-seq' ? q.midis : []));
    const steps: SingStep[] = [{ midis: [qs[0][0], qs[0][1] + 1, qs[0][2]] }, { midis: qs[0] }, { midis: qs[1] }, { midis: qs[2] }];
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt: new ScriptedTranscriber([]), mic: new FakeMic(), pitch: new ScriptedPitch(steps), clock: immediateClock, simulated: true },
      { inputLang: 'en', outputLang: 'en', naming: 'letter' },
      'voice',
    );
    await c.start();
    await until(() => c.getView().stage === 'complete');
    const recs = c.getView().session.records;
    expect(recs.map((r) => r.outcome)).toEqual(['correct-retry', 'correct', 'correct']);
    expect(recs[0].attempts[0].accuracy).toBeCloseTo(2 / 3);
    expect(recs[0].xp).toBe(8); // graded retry credit: round(15 × 0.5)
  });

  it('pcKey round-trips', () => {
    expect(pcKey(pc('F#'))).toBe('F1');
  });
});
