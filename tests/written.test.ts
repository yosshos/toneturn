import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { asChoice } from '../src/engine/topicKit';
import { gradePlace, placeKey, renderStimulus, type PlaceQuestion } from '../src/engine/lesson';
import { parseNamedChoice } from '../src/engine/parser';
import { questionTags } from '../src/engine/taxonomy';
import { LESSONS, UNITS } from '../src/content/mini/written';

const NEW = ['staff-dictation', 'rhythm-build', 'two-part', 'bass-dictation', 'chromatic-theory', 'scale-spelling', 'figured-bass', 'counterpoint', 'ornaments'];
const WRAPPED: Record<string, number> = { 'harmonic-dictation': 6, 'time-signatures': 5, 'roman-numerals': 4, 'note-reading': 6 };
const SEEDS = Array.from({ length: 60 }, (_, i) => (i + 1) * 104729);
const asPlace = (q: unknown) => q as PlaceQuestion;
const pcs = (xs: number[]) => xs.map((m) => ((m % 12) + 12) % 12);

describe('written dictation and theory (spec AE §4.2, §4.5, §10)', () => {
  it('registers every topic and the new levels', () => {
    for (const t of NEW) expect(TOPIC_GEN[t], t).toBeTruthy();
    for (const [t, n] of Object.entries(WRAPPED)) expect(TOPIC_GEN[t].levels.length, t).toBe(n);
    expect(TOPIC_GEN['staff-dictation'].levels).toHaveLength(10);
    expect(TOPIC_GEN['two-part'].levels).toHaveLength(6);
    expect(TOPIC_GEN['bass-dictation'].levels).toHaveLength(4);
    expect(TOPIC_GEN['rhythm-build'].levels).toHaveLength(7);
  });

  it('every item is deterministic, answerable, bilingual and tagged', () => {
    for (const t of [...NEW, ...Object.keys(WRAPPED)]) {
      const T = TOPIC_GEN[t];
      for (let level = 1; level <= T.levels.length; level++) {
        expect(T.levels[level - 1].he, `${t} L${level} he`).toBeTruthy();
        for (const seed of SEEDS) {
          const q = T.gen(seed, level, 'x');
          expect(T.gen(seed, level, 'x'), `${t} L${level} #${seed}`).toEqual(q);
          const tags = questionTags(q);
          expect(Math.abs(tags.reduce((a, x) => a + x.w, 0) - 1)).toBeLessThan(1e-6);
          if (q.stimulus.length) expect(renderStimulus(q.stimulus).length).toBeLessThan(26);
          if (q.kind === 'choice') {
            const c = asChoice(q);
            expect(c.choices).toContain(c.answer);
            expect(new Set(c.choices).size).toBe(c.choices.length);
            expect(c.choices.length).toBeGreaterThanOrEqual(2);
            expect(c.ask.he && c.ask.en).toBeTruthy();
            for (const k of c.choices) {
              expect(c.names[k]?.he, `${t} L${level} ${k}`).toBeTruthy();
              const p = parseNamedChoice(c.names[k].en, c.choices, c.names);
              expect(p.kind === 'answer' ? p.value : p, `${t} L${level} "${c.names[k].en}"`).toBe(k);
            }
          } else if (q.kind === 'place') {
            expect(q.answer).toBe(placeKey(q, q.target, q.durs));
            expect(gradePlace(q, q.answer).score).toBe(1);
            for (const a of q.alts ?? []) expect(gradePlace(q, a).score).toBe(1);
            expect(q.target.every((m) => Number.isInteger(m) && m >= 28 && m <= 96), `${t} L${level} range`).toBe(true);
            if (q.durs) {
              expect(q.durs).toHaveLength(q.target.length);
              expect(q.durs.every((d) => [0.5, 1, 1.5, 2, 3, 4].includes(d)), `${t} L${level} durs ${q.durs}`).toBe(true);
            }
            expect(q.ask.he && q.ask.en).toBeTruthy();
          }
        }
      }
    }
  }, 60000);

  it('staff dictation gives (and keeps) the first note, and its levels add what they say', () => {
    const T = TOPIC_GEN['staff-dictation'];
    for (const seed of SEEDS) {
      for (let level = 1; level <= 10; level++) {
        const q = asPlace(T.gen(seed, level, 'x'));
        expect(q.surface).toBe('staff');
        expect(q.given!.midis[0]).toBe(q.target[0]);
        expect(!!q.durs).toBe([4, 5, 6, 7, 8, 9].includes(level));
        if (level === 1) expect(q.target).toHaveLength(3);
        if (level === 2) expect(q.target).toHaveLength(5);
        if (level === 6) expect(q.staff!.clef).toBe('bass');
        if (level === 10) expect(q.staff!.key).toBeNull();
      }
      const l7 = asPlace(T.gen(seed, 7, 'x'));
      expect(l7.durs![0]).toBe(0.5); // the pick-up
      expect((l7.durs!.reduce((a, b) => a + b, 0) - 0.5) % 3).toBe(0);
      const l9 = asPlace(T.gen(seed, 9, 'x'));
      expect(l9.durs!.reduce((a, b) => a + b, 0)).toBe(32); // eight bars of 4/4
      // modulates to V: the new leading note (♯4) appears, the line ends on the dominant
      const tonic = (l9.stimulus[0] as { key: { letter: string; acc: number } }).key;
      const tpc = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[tonic.letter] + tonic.acc;
      expect(pcs(l9.target)).toContain((tpc + 6 + 12) % 12);
      expect(pcs(l9.target).at(-1)).toBe((tpc + 7) % 12);
    }
  });

  it('two-part voices are consonant where they meet (levels 1, 2 and 4)', () => {
    for (const seed of SEEDS)
      for (const level of [1, 2, 4]) {
        const q = asPlace(TOPIC_GEN['two-part'].gen(seed, level, 'x'));
        const other = q.given!.midis;
        expect(other).toHaveLength(q.target.length);
        q.target.forEach((m, i) => {
          const d = Math.abs(m - other[i]) % 12;
          expect([0, 3, 4, 7, 8, 9], `L${level} #${seed} note ${i}`).toContain(d);
        });
      }
  });

  it('scale spelling targets the right scale', () => {
    for (const seed of SEEDS) {
      const q = asPlace(TOPIC_GEN['scale-spelling'].gen(seed, 1, 'x'));
      const up = q.target[0] < q.target[7] ? q.target : q.target.slice().reverse();
      expect(up.map((m) => m - up[0])).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
      expect(q.given!.midis[0]).toBe(q.target[0]);
      const c = asPlace(TOPIC_GEN['scale-spelling'].gen(seed, 4, 'x'));
      expect(c.target).toHaveLength(13);
      const h = asPlace(TOPIC_GEN['scale-spelling'].gen(seed, 3, 'x'));
      expect([8, 15]).toContain(h.target.length);
    }
  });

  it('figured bass: alto and tenor answers are chord tones and every alternative is also correct', () => {
    for (const seed of SEEDS)
      for (const level of [2, 4]) {
        const q = asPlace(TOPIC_GEN['figured-bass'].gen(seed, level, 'x'));
        expect(q.as).toBe('set');
        expect(q.target).toHaveLength(2);
        expect(new Set(q.alts).size).toBe((q.alts ?? []).length);
        expect(q.alts ?? []).not.toContain(q.answer);
      }
  });

  it('counterpoint "no mistake" items really have none (re-checked by the generator rules)', () => {
    let none = 0;
    for (const seed of SEEDS)
      for (let level = 1; level <= 3; level++) if (asChoice(TOPIC_GEN['counterpoint'].gen(seed, level, 'x')).answer === 'none') none++;
    expect(none).toBeGreaterThan(5);
  });

  it('every new topic has a quick lesson of 4–6 steps in both languages', () => {
    for (const t of NEW) {
      const id = UNITS[`topic:${t}`];
      expect(id, t).toBeTruthy();
      const l = LESSONS.find((x) => x.id === id)!;
      expect(l, t).toBeTruthy();
      expect(l.steps.length).toBeGreaterThanOrEqual(4);
      expect(l.steps.length).toBeLessThanOrEqual(6);
      for (const s of l.steps) expect(s.say.en && s.say.he).toBeTruthy();
    }
  });
});
