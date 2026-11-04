import { describe, expect, it } from 'vitest';
import { makeLesson, nameSeqQuestion, namesToDegreesQuestion, questionSkill, questionTag, singNamesSeqQuestion } from '../src/engine/lesson';
import { questionFromTag } from '../src/engine/adaptive';
import { parseNoteNameSequence } from '../src/engine/parser';
import { pc } from '../src/engine/pitch';
import { parseAnswer } from '../src/game/content';
import { LessonController } from '../src/game/controller';
import { FakeAudio, FakeMic, FakeTTS, ScriptedPitch, ScriptedTranscriber, immediateClock } from '../src/game/fakes';

const Eb = pc('Eb');

describe('melodic matrix — sequences (spec H #2 #4 #5 #6)', () => {
  it('#2 / #6: answers are the note names of those degrees in the key', () => {
    const q = nameSeqQuestion('a', pc('Eb'), [5, 2], 'sound');
    expect(q.answer).toBe('B-1.F0');
    expect(questionSkill(q)).toBe('notes');
    const s = nameSeqQuestion('b', pc('Eb'), [5, 2], 'degrees');
    expect(s.stimulus).toEqual([]);
    expect(questionSkill(s)).toBe('degrees');
  });
  it('#5: names → degrees is symbolic', () => {
    const q = namesToDegreesQuestion('c', pc('Eb'), [5, 2]);
    expect(q.names).toEqual(['B-1', 'F0']);
    expect(q.answer).toBe('5-2');
    expect(q.stimulus).toEqual([]);
  });
  it('spoken name sequences: English letters, Hebrew Do-Re-Mi with במול', () => {
    expect(parseNoteNameSequence('B flat F', 'letter')).toMatchObject({ kind: 'answer', value: 'B-1.F0' });
    expect(parseNoteNameSequence('Bb, F, Eb', 'letter')).toMatchObject({ kind: 'answer', value: 'B-1.F0.E-1' });
    expect(parseNoteNameSequence('סי במול פה', 'solfege')).toMatchObject({ kind: 'answer', value: 'B-1.F0' });
    const q = nameSeqQuestion('a', pc('Eb'), [5, 2], 'sound');
    expect(parseAnswer(q, ['B flat, F'], 'letter')).toMatchObject({ kind: 'answer', value: 'B-1.F0' });
  });
  it('review tags rebuild every variant', () => {
    for (const q of [nameSeqQuestion('a', pc('D'), [1, 3, 5], 'sound'), nameSeqQuestion('b', pc('D'), [5, 4], 'degrees'), namesToDegreesQuestion('c', pc('F'), [3, 2, 1]), singNamesSeqQuestion('d', pc('G'), [1, 3, 5])]) {
      const r = questionFromTag(questionTag(q), 1, 'r')!;
      expect(r.kind).toBe(q.kind);
      expect(questionTag(r)).toBe(questionTag(q));
      expect(r.answer).toBe(q.answer);
    }
  });
  it('lesson 20 hands-free in Hebrew with Do-Re-Mi: hear → names, names → degrees, degrees → names, sing from names', async () => {
    void Eb;
    const lesson = makeLesson('note-sequences', 3);
    expect(lesson.questions.map((q) => q.kind)).toEqual(['name-seq', 'degree-seq', 'name-seq', 'sing-seq', 'name-seq']);
    const heNotes: Record<string, string> = { C: 'דו', D: 'רה', E: 'מי', F: 'פה', G: 'סול', A: 'לה', B: 'סי' };
    const heNum = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע'];
    const say = (a: unknown) => {
      const s = String(a);
      if (/^\d(-\d)*$/.test(s)) return s.split('-').map((d) => heNum[Number(d)]).join(' ');
      return s
        .split('.')
        .map((k) => heNotes[k[0]] + (k.endsWith('-1') ? ' במול' : k.endsWith('1') ? ' דיאז' : ''))
        .join(' ');
    };
    const sing = lesson.questions.flatMap((q) => (q.kind === 'sing-seq' ? [{ midis: q.midis }] : []));
    const stt = new ScriptedTranscriber(Array.from({ length: 6 }, () => say));
    const c = new LessonController(
      lesson,
      { audio: new FakeAudio(), tts: new FakeTTS(), stt, mic: new FakeMic(), pitch: new ScriptedPitch(sing), clock: immediateClock, simulated: true },
      { inputLang: 'he', outputLang: 'he', naming: 'solfege', inputNaming: 'solfege' },
      'voice',
    );
    stt.expected = () => c.getView().question.answer;
    await c.start();
    for (let i = 0; i < 3000 && c.getView().stage !== 'complete'; i++) await new Promise((r) => setTimeout(r, 0));
    expect(c.getView().session.records.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    c.dispose();
  });
});
