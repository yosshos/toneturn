import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { placeKey, questionSkill, renderStimulus, type PlaceQuestion } from '../src/engine/lesson';
import { parseNamedChoice } from '../src/engine/parser';
import { questionTags, TOPIC_TAGS } from '../src/engine/taxonomy';
import { LESSONS, UNITS } from '../src/content/mini/instrument';
import {
  CAGED,
  OPEN_CHORDS,
  TUNINGS,
  arpeggioShape,
  boxPicture,
  cagedShape,
  defaultTuning,
  dropVoicing,
  midisAt,
  noteAt,
  parseShape,
  pentaBox,
  positionsOf,
  rootFiveOctave,
  threeNps,
  triadVoicings,
  type Tuning,
} from '../src/engine/fretboard';

const TOPICS = ['play-back', 'fret-notes', 'string-notes', 'fret-intervals', 'fret-chords', 'fret-scales', 'key-notes'];
const STD = TUNINGS[0];
const BASS = defaultTuning('bass');
const pcs = (ms: number[]) => [...new Set(ms.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
const tuningOf = (q: PlaceQuestion): Tuning => (q.instrument === 'bass' ? BASS : q.instrument && q.instrument !== 'keys' && q.instrument !== 'guitar' ? defaultTuning(q.instrument) : STD);

describe('fretboard shapes', () => {
  it('open chords and CAGED shapes hold exactly the chord tones', () => {
    for (const [, o] of Object.entries(OPEN_CHORDS)) {
      const ms = midisAt(STD, parseShape(o.shape).dots);
      expect(pcs(ms)).toEqual(pcs([o.root, o.root + (o.minor ? 3 : 4), o.root + 7]));
    }
    for (const s of CAGED)
      for (let r = 0; r < 12; r++) {
        const sh = cagedShape(s, r);
        expect(pcs(midisAt(STD, sh.dots))).toEqual(pcs([r, r + 4, r + 7]));
        expect(Math.min(...sh.dots.map((d) => d.fret))).toBeGreaterThanOrEqual(1);
        expect(Math.max(...sh.dots.map((d) => d.fret))).toBeLessThanOrEqual(15);
        expect(boxPicture(STD, sh, r).dots.some((d) => d.root)).toBe(true);
      }
  });
  it('pentatonic boxes: 12 rising notes of the minor pentatonic, box 1 starts on the root', () => {
    for (let n = 1; n <= 5; n++)
      for (let r = 0; r < 12; r++) {
        const ps = pentaBox(n, r);
        const ms = midisAt(STD, ps);
        expect(ps).toHaveLength(12);
        expect(pcs(ms)).toEqual(pcs([r, r + 3, r + 5, r + 7, r + 10]));
        for (let i = 1; i < ms.length; i++) expect(ms[i]).toBeGreaterThan(ms[i - 1]);
        for (const p of ps) expect(p.fret >= 0 && p.fret <= 15).toBe(true);
        if (n === 1) expect(ms[0] % 12).toBe(r);
      }
  });
  it('drop 2 / drop 3 voicings stack R 5 7 3 and R 7 3 5', () => {
    const v2 = dropVoicing(STD, 2, 'maj7', 5, 3)!; // Cmaj7, root on string 5
    expect(midisAt(STD, v2)).toEqual([48, 55, 59, 64]);
    expect(v2.map((p) => p.str)).toEqual([5, 4, 3, 2]);
    const v3 = dropVoicing(STD, 3, '7', 6, 3)!; // G7, root on string 6
    expect(midisAt(STD, v3)).toEqual([43, 53, 59, 62]);
    expect(v3.map((p) => p.str)).toEqual([6, 4, 3, 2]);
  });
  it('triad voicings are close, one note per string, every tone present', () => {
    const vs = triadVoicings(STD, [0, 4, 7], [3, 2, 1]);
    expect(vs.length).toBeGreaterThanOrEqual(3);
    for (const v of vs) {
      const ms = midisAt(STD, v);
      expect(pcs(ms)).toEqual([0, 4, 7]);
      expect(ms[2] - ms[0]).toBeLessThan(12);
    }
  });
  it('three notes per string and bass shapes', () => {
    const ps = threeNps(STD, 43, [0, 2, 4, 5, 7, 9, 11], [6, 5, 4]);
    expect(ps.map((p) => p.fret)).toEqual([3, 5, 7, 3, 5, 7, 4, 5, 7]);
    expect(midisAt(BASS, rootFiveOctave(BASS, 4, 3)!)).toEqual([31, 38, 43]);
    expect(midisAt(BASS, arpeggioShape(BASS, 3, 3, [0, 3, 7, 10])!)).toEqual([36, 39, 43, 46]);
  });
});

describe('Your instrument topics (spec AE §4.1)', () => {
  it('every topic is registered, tagged, filtered by instrument and has a quick lesson', () => {
    for (const t of TOPICS) {
      expect(TOPIC_GEN[t], t).toBeTruthy();
      expect(TOPIC_GEN[t].forPlays?.length, t).toBeGreaterThan(0);
      expect(TOPIC_TAGS[t], t).toBeTruthy();
      const id = UNITS[`topic:${t}`];
      expect(LESSONS.find((l) => l.id === id), t).toBeTruthy();
    }
    expect(TOPIC_GEN['play-back'].levels).toHaveLength(7);
  });

  for (const topic of TOPICS)
    it(`${topic}: deterministic, every answer reachable`, () => {
      const T = TOPIC_GEN[topic];
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed < 60; seed++) {
          const s = seed * 7919;
          const q = T.gen(s, level, 'x');
          expect(T.gen(s, level, 'x'), `${topic} L${level}`).toEqual(q);
          expect(questionSkill(q)).toBe('instrument');
          const tags = questionTags(q);
          expect(tags[0].skill).toBe('instrument');
          if (q.stimulus.length) expect(renderStimulus(q.stimulus).length).toBeGreaterThan(0);
          if (q.stimulus.length) expect(renderStimulus(q.stimulus).length, `${topic} L${level} too long`).toBeLessThan(25);
          if (q.kind === 'choice') {
            expect(q.choices).toContain(q.answer);
            expect(q.diagram).toBeTruthy();
            for (const c of q.choices) {
              const p = parseNamedChoice(q.names[c].en, q.choices, q.names);
              expect(p.kind === 'answer' ? p.value : p.kind, `${topic} L${level} "${q.names[c].en}"`).toBe(c);
            }
            continue;
          }
          if (q.kind === 'sing-seq') {
            expect(q.topic).toEqual({ id: topic, level, seed: s });
            expect(q.play).toBeTruthy();
            expect(q.midis).toHaveLength(q.degrees.length);
            if (level === 7) expect(q.play!.beats).toHaveLength(q.midis.length);
            continue;
          }
          expect(q.kind).toBe('place');
          if (q.kind !== 'place') continue;
          expect(q.answer).toBe(placeKey(q, q.target));
          expect(q.ask.en && q.ask.he).toBeTruthy();
          expect(q.target.length).toBeGreaterThan(0);
          if (q.surface === 'keys') {
            for (const m of q.target) expect(m >= 36 && m <= 96).toBe(true);
            continue;
          }
          // Every target note can be played on the allowed strings, inside the allowed frets.
          const t = tuningOf(q);
          const [lo, hi] = q.neck?.frets ?? [0, 15];
          const strs = q.neck?.onString ? [q.neck.onString] : q.neck?.strings;
          for (const m of q.target) expect(positionsOf(t, m, lo, hi, strs).length, `${topic} L${level} note ${m}`).toBeGreaterThan(0);
          for (const d of q.neck?.dots ?? []) expect(noteAt(t, d.str, d.fret)).toBeGreaterThan(0);
        }
    });

  it('chord items are the named chords; scale items are the named scales', () => {
    for (let seed = 1; seed < 40; seed++) {
      const tri = TOPIC_GEN['fret-chords'].gen(seed, 5, 'x') as PlaceQuestion;
      expect(pcs(tri.target)).toHaveLength(3);
      const pent = TOPIC_GEN['fret-scales'].gen(seed, 2, 'x') as PlaceQuestion;
      expect(pent.target).toHaveLength(12);
      const np = TOPIC_GEN['fret-scales'].gen(seed, 4, 'x') as PlaceQuestion;
      expect(np.target).toHaveLength(9);
      const every = TOPIC_GEN['fret-notes'].gen(seed, 4, 'x') as PlaceQuestion;
      expect(every.as).toBe('set');
      expect(pcs(every.target)).toHaveLength(1);
      const bowed = TOPIC_GEN['string-notes'].gen(seed, 2, 'x') as PlaceQuestion;
      expect(['violin', 'viola', 'cello']).toContain(bowed.instrument);
    }
  });
  it('bass levels are bass items', () => {
    for (let seed = 1; seed < 20; seed++) {
      expect((TOPIC_GEN['fret-chords'].gen(seed, 6, 'x') as PlaceQuestion).instrument).toBe('bass');
      expect((TOPIC_GEN['fret-chords'].gen(seed, 7, 'x') as PlaceQuestion).instrument).toBe('bass');
      expect((TOPIC_GEN['fret-scales'].gen(seed, 5, 'x') as PlaceQuestion).instrument).toBe('bass');
    }
  });
});
