import { describe, expect, it } from 'vitest';
import { jazzVoicing, PROGRESSIONS, voiceProgression } from '../src/engine/jazz';
import { SONGS } from '../src/engine/songs';
import { makeLesson, progressionQuestion, questionTag, seventhQuestion, songDegreesQuestion } from '../src/engine/lesson';
import { questionFromTag } from '../src/engine/adaptive';
import { parseProgression, parseSeventh } from '../src/engine/parser';
import { pc } from '../src/engine/pitch';
import { correctText, revealText } from '../src/game/content';

const pcs = (ms: number[]) => ms.map((m) => ((m % 12) + 12) % 12).sort((a, b) => a - b);

describe('jazz track', () => {
  it('shell voicings: root in the bass, 3rd and 7th always present', () => {
    expect(pcs(jazzVoicing(0, 'maj7'))).toEqual([0, 2, 4, 11]); // C E B D
    expect(pcs(jazzVoicing(7, '7'))).toEqual([5, 7, 9, 11]); // G B F A
    expect(pcs(jazzVoicing(2, 'm7'))).toEqual([0, 2, 4, 5]); // D F C E
    expect(pcs(jazzVoicing(11, 'm7b5'))).toEqual([2, 5, 9, 11]); // B D F A
    expect(jazzVoicing(0, 'maj7')[0]).toBe(36);
  });
  it('ii–V–I moves smoothly: upper voices move by small steps', () => {
    const [ii, V, I] = voiceProgression(0, PROGRESSIONS['ii-V-I']);
    const move = (a: number[], b: number[]) => a.slice(1).reduce((s, x, i) => s + Math.abs(x - b[i + 1]), 0);
    expect(move(ii, V)).toBeLessThanOrEqual(8);
    expect(move(V, I)).toBeLessThanOrEqual(8);
  });
  it('spoken answers: chords and progressions (en, he, Roman numerals)', () => {
    expect(parseSeventh('major seven')).toMatchObject({ value: 'maj7' });
    expect(parseSeventh('dominant')).toMatchObject({ value: '7' });
    expect(parseSeventh('half diminished')).toMatchObject({ value: 'm7b5' });
    expect(parseSeventh('מינור שביעית')).toMatchObject({ value: 'm7' });
    expect(parseProgression('two five one')).toMatchObject({ value: 'ii-V-I' });
    expect(parseProgression('ii V I')).toMatchObject({ value: 'ii-V-I' });
    expect(parseProgression('one six two five')).toMatchObject({ value: 'I-vi-ii-V' });
    expect(parseProgression('חמש אחת')).toMatchObject({ value: 'V-I' });
    expect(parseProgression('turnaround')).toMatchObject({ value: 'I-vi-ii-V' });
  });
  it('review tags rebuild jazz and song items', () => {
    for (const q of [seventhQuestion('a', pc('F'), 'm7b5'), progressionQuestion('b', pc('G'), 'V-I', ['ii-V-I', 'V-I', 'I-vi-ii-V']), songDegreesQuestion('c', pc('D'), SONGS[1], 5)]) {
      const r = questionFromTag(questionTag(q), 2, 'r')!;
      expect(r.kind).toBe(q.kind);
      expect(r.answer).toBe(q.answer);
    }
  });
  it('lessons: Jazz 1 and Songs you know generate playable items', () => {
    expect(makeLesson('jazz-1', 1).questions.map((q) => q.kind)).toEqual(['seventh', 'seventh', 'progression', 'seventh', 'progression']);
    expect(makeLesson('songs', 1).questions.filter((q) => q.kind === 'degree-seq')).toHaveLength(4);
  });
});

describe('songs you know', () => {
  it('every opening stays within degrees 1–7 and has a length per note', () => {
    for (const s of SONGS) {
      expect(s.degrees.every((d) => d >= 1 && d <= 7)).toBe(true);
      expect(s.beats).toHaveLength(s.degrees.length);
    }
  });
  it('the title is revealed after the answer (en/he)', () => {
    const q = songDegreesQuestion('q', pc('C'), SONGS.find((s) => s.id === 'ode')!, 5);
    expect(q.answer).toBe('3-3-4-5-5');
    expect(correctText(q, 'en', true)).toContain('Ode to Joy');
    expect(revealText(q, 'he', 'solfege')).toContain('האודה לשמחה');
  });
});
