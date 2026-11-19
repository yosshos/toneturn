// Owner 2026-11-19: rhythm questions are answered by playing the rhythm back, never by saying "ta ti-ti".
import { describe, expect, it } from 'vitest';
import { rhythmDictQuestion, type LessonDef } from '../src/engine/lesson';
import { asRhythmEcho, rhythmByPerformance } from '../src/engine/rhythmEcho';
import { hintText, sayChoices } from '../src/game/content';

describe('rhythm by performance', () => {
  const dict = rhythmDictQuestion('q1', 2, 1, 7);
  it('a heard-rhythm item becomes an echo of the same rhythm, rated as rhythm by ear', () => {
    const e = asRhythmEcho(dict);
    expect(e.kind).toBe('rhythm-read');
    if (e.kind !== 'rhythm-read') return;
    expect(e.byEar).toBe(true);
    expect(e.rhythm).toEqual(dict.rhythm);
    expect(e.bpm).toBe(dict.bpm);
    expect(e.skillAs).toBe('rhythm-dictation');
  });
  it('build-from-blocks items stay, and nothing changes when off', () => {
    const build = rhythmDictQuestion('q2', 4, 1, 7, 'build');
    expect(asRhythmEcho(build)).toBe(build);
    const lesson = { id: 'rhythm-r2', version: 1, skill: 'rhythm-reading', scoring: {}, intro: [], questions: [dict, build] } as unknown as LessonDef;
    expect(rhythmByPerformance(lesson, false)).toBe(lesson);
    expect(rhythmByPerformance(lesson, true).questions.map((q) => q.kind)).toEqual(['rhythm-read', 'rhythm-dict']);
  });
  it('with two heard items the first stays a tapped choice of the written bar, the second is played back', () => {
    const second = rhythmDictQuestion('q5', 2, 2, 9);
    const lesson = { id: 'rhythm-r2', version: 1, skill: 'rhythm-reading', scoring: {}, intro: [], questions: [dict, second] } as unknown as LessonDef;
    const out = rhythmByPerformance(lesson, true).questions;
    expect(out[0]).toBe(dict);
    expect(out[1].kind).toBe('rhythm-read');
  });
  it('no prompt asks for rhythm syllables', () => {
    for (const l of ['he', 'en'] as const) {
      const texts = [hintText(dict, l, true), hintText(dict, l, false), sayChoices(dict, l), hintText(asRhythmEcho(dict), l, true)];
      for (const t of texts) expect(t).not.toMatch(/ti-ti|טי-טי|“ta|"טה/);
    }
  });
});
