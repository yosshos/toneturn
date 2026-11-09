import { describe, expect, it } from 'vitest';
import { TOPIC_GEN, topicLesson } from '../src/engine/topics';
import { asChoice } from '../src/engine/topicKit';
import { questionTag } from '../src/engine/lesson';
import { questionFromTag } from '../src/engine/adaptive';
import { parseNamedChoice } from '../src/engine/parser';
import { renderStimulus } from '../src/engine/lesson';

describe('topic generators (spec T–V)', () => {
  for (const [topic, T] of Object.entries(TOPIC_GEN)) {
    it(`${topic}: every level is sound, deterministic, rebuildable and speakable`, () => {
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed < 40; seed++) {
          const g = T.gen(seed * 7919, level, 'x');
          if (g.kind !== 'choice') {
            // Notes to place, rhythms to tap, lines to sing / play (spec AE): stable, rebuildable, audible or drawn.
            expect(T.gen(seed * 7919, level, 'x')).toEqual(g);
            const r = questionFromTag(questionTag(g), 1, 'r')!;
            expect(r, `${topic} L${level} rebuild`).toBeTruthy();
            expect(r.answer).toBe(g.answer);
            if (g.stimulus.length) expect(renderStimulus(g.stimulus).length).toBeGreaterThan(0);
            continue;
          }
          const q = asChoice(g);
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          for (const c of q.choices) expect(q.names[c], `${topic} ${c}`).toBeTruthy();
          expect(q.stimulus.length > 0 || !!q.text || !!q.show || !!q.chart).toBe(true);
          if (q.stimulus.length) expect(renderStimulus(q.stimulus).length).toBeGreaterThan(0);
          const again = asChoice(T.gen(seed * 7919, level, 'x'));
          expect(again.answer).toBe(q.answer);
          const r = questionFromTag(questionTag(q), 1, 'r')!;
          expect(r.answer).toBe(q.answer);
          for (const c of q.choices) {
            const p = parseNamedChoice(q.names[c].en, q.choices, q.names);
            expect(p.kind === 'answer' ? p.value : p.kind === 'ambiguous' ? p.candidates : p.kind, `${topic} L${level} "${q.names[c].en}"`).toEqual(c);
          }
        }
      expect(topicLesson(topic, 1, 3).questions).toHaveLength(6);
    });
  }
});

import { spellAbove, spEn } from '../src/engine/topicsTheory';

describe('written theory spells correctly (spec U.11)', () => {
  const S = (l: number, a = 0) => ({ l, a });
  const C = 0, D = 1, E = 2, F = 3, G = 4, A = 5, B = 6;
  it('intervals', () => {
    expect(spEn(spellAbove(S(E, -1), 3, 4)!)).toBe('G'); // M3 above E♭
    expect(spEn(spellAbove(S(A, -1), 6, 9)!)).toBe('F'); // M6 above A♭
    expect(spEn(spellAbove(S(F), 4, 6)!)).toBe('B'); // A4 above F
    expect(spEn(spellAbove(S(B), 5, 6)!)).toBe('F'); // d5 above B
    expect(spEn(spellAbove(S(C, 1), 3, 4)!)).toBe('E♯'); // M3 above C♯
    expect(spEn(spellAbove(S(G, 1), 7, 9)!)).toBe('F'); // d7 above G♯
    expect(spEn(spellAbove(S(D), 2, 3)!)).toBe('E♯'); // A2 above D
    expect(spEn(spellAbove(S(C), 6, 9)!)).toBe('A'); // alto sax: concert C reads A
  });
  it('chord-spelling answers are real chords', () => {
    const T = TOPIC_GEN['chord-spelling'];
    for (let seed = 1; seed < 60; seed++) {
      const q = asChoice(T.gen(seed * 31, 2, 'x'));
      const notes = q.answer.split(' – ');
      // Each consecutive chord tone is a third (two letters) apart for seventh chords.
      const letters = notes.map((n) => 'CDEFGAB'.indexOf(n[0]));
      for (let i = 1; i < letters.length; i++) expect((letters[i] - letters[i - 1] + 7) % 7).toBe(2);
    }
  });
  it('maqam level 2 really uses quarter tones', () => {
    const q = asChoice(TOPIC_GEN['maqam'].gen(5, 2, 'x'));
    const s = q.stimulus[0];
    expect(s.kind === 'notes' && s.midis.some((m) => m % 1 !== 0)).toBe(true);
  });
  it('polyrhythm 3:2 has 3 high and 2 low hits per cycle', () => {
    const q = asChoice(TOPIC_GEN['polyrhythm'].gen(1, 1, 'x'));
    const st = q.choiceStim!['3:2'][0];
    expect(st.kind).toBe('events');
    if (st.kind === 'events') {
      expect(st.events.filter((e) => e.midi === 84).length).toBe(6);
      expect(st.events.filter((e) => e.midi === 45).length).toBe(4);
    }
  });
});

import { MODE_STEPS } from '../src/engine/modes';
describe('choices are always distinguishable', () => {
  it('no topic offers two scales with the same notes', () => {
    for (const [topic, T] of Object.entries(TOPIC_GEN))
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed < 20; seed++) {
          const q = T.gen(seed * 104729, level, 'x');
          const scales = q.choices.filter((c) => c in MODE_STEPS).map((c) => MODE_STEPS[c as keyof typeof MODE_STEPS].join(','));
          expect(new Set(scales).size, `${topic} L${level}`).toBe(scales.length);
        }
  });
});
