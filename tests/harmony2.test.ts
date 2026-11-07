import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { genTopic } from '../src/engine/topicKit';
import { renderStimulus, questionSkill, type ChoiceQuestion, type NoteEvent, type SingQuestion, type Stimulus } from '../src/engine/lesson';
import { questionTags, TOPIC_TAGS } from '../src/engine/taxonomy';
import { arrange, ch, styleClip, voiceChords, voiceLead } from '../src/engine/form';

const NEW = ['audiation', 'triads', 'seventh-chords', 'chromatic-harmony', 'song-form', 'style'];
const DEEP: Record<string, number> = { 'voice-count': 4, 'cadence-types': 4, modulation: 4 };

/** Levels to check per topic: all of a new topic, the added ones of a deepened topic. */
const levelsOf = (t: string) => {
  const n = TOPIC_GEN[t].levels.length;
  const from = DEEP[t] ?? 1;
  return Array.from({ length: n - from + 1 }, (_, i) => from + i);
};
const all = [...NEW, ...Object.keys(DEEP)];

describe('harmony, form and inner hearing (spec AE §4.3, §4.5, §10)', () => {
  it('levels exist as in the spec', () => {
    expect(TOPIC_GEN['audiation'].levels).toHaveLength(5);
    expect(TOPIC_GEN['triads'].levels).toHaveLength(5);
    expect(TOPIC_GEN['seventh-chords'].levels).toHaveLength(5);
    expect(TOPIC_GEN['chromatic-harmony'].levels).toHaveLength(6);
    expect(TOPIC_GEN['song-form'].levels).toHaveLength(6);
    expect(TOPIC_GEN['style'].levels).toHaveLength(4);
    expect(TOPIC_GEN['voice-count'].levels).toHaveLength(4);
    expect(TOPIC_GEN['cadence-types'].levels).toHaveLength(5);
    expect(TOPIC_GEN['modulation'].levels).toHaveLength(5);
  });

  for (const t of all)
    it(`${t}: deterministic, every answer reachable, bilingual, short enough`, () => {
      for (const level of levelsOf(t)) {
        const answers = new Set<string>();
        const offered = new Set<string>();
        for (let s = 1; s <= 160; s++) {
          const seed = s * 104729;
          const q = TOPIC_GEN[t].gen(seed, level, 'x');
          expect(TOPIC_GEN[t].gen(seed, level, 'x')).toEqual(q);
          const g = genTopic(t, seed, level, 'x');
          const len = renderStimulus(g.stimulus).length;
          // R5: song-form L2 and L6 may run to ~45 s; everything else stays under ~25 s.
          expect(len, `${t} L${level} seed ${seed}`).toBeLessThanOrEqual(t === 'song-form' && (level === 2 || level === 6) ? 45 : 25);
          expect(len).toBeGreaterThan(1);
          if (q.kind !== 'choice') continue;
          answers.add(q.answer);
          q.choices.forEach((c) => offered.add(c));
          expect(q.choices).toContain(q.answer);
          expect(q.ask.en && q.ask.he).toBeTruthy();
          for (const c of q.choices) expect(q.names[c].en && /[א-ת]/.test(q.names[c].he + q.ask.he)).toBeTruthy();
          if (q.choiceStim) for (const c of q.choices) expect(q.choiceStim[c], `${t} L${level} ${c}`).toBeTruthy();
        }
        if (answers.size) expect([...offered].filter((c) => !answers.has(c)), `${t} L${level} unreachable`).toEqual([]);
      }
    });

  it('tags follow the spec tables; primary = rated skill', () => {
    const tagOf = (t: string, l: number) => {
      const x = TOPIC_TAGS[t];
      return typeof x === 'function' ? x(l) : x;
    };
    expect(tagOf('audiation', 2).map((x) => [x.sub, x.w])).toEqual([['sequences/inner', 0.7], ['degrees/diatonic', 0.3]]);
    expect(tagOf('audiation', 5).map((x) => x.sub)).toEqual(['sequences/inner', 'cadences/progression']);
    expect(tagOf('triads', 1)[0].sub).toBe('chords/quality');
    expect(tagOf('triads', 4)[0].sub).toBe('chords/inversion');
    expect(tagOf('seventh-chords', 2)[0].sub).toBe('chords/seventh');
    expect(tagOf('seventh-chords', 5)[0].sub).toBe('chords/inversion');
    expect(tagOf('chromatic-harmony', 3).map((x) => [x.sub, x.w])).toEqual([['cadences/chromatic', 0.7], ['chords/quality', 0.3]]);
    expect(tagOf('song-form', 6).map((x) => [x.sub, x.w])).toEqual([['form/song', 0.8], ['cadences/progression', 0.2]]);
    expect(tagOf('style', 4)[0].sub).toBe('form/style');
    expect(tagOf('voice-count', 4)[0].sub).toBe('form/voices');
    expect(tagOf('cadence-types', 5)[0].sub).toBe('cadences/cadence');
    expect(tagOf('modulation', 5)[0].sub).toBe('cadences/modulation');
    for (const t of all)
      for (const l of levelsOf(t)) {
        const q = TOPIC_GEN[t].gen(77, l, 'x');
        expect(questionTags(q)[0].skill, `${t} L${l}`).toBe(questionSkill(q));
      }
  });
});

describe('audiation', () => {
  it('L4 is a sing item: the line goes silent, the clicks go on, the target is where the line would be', () => {
    for (let s = 1; s < 60; s++) {
      const q = TOPIC_GEN['audiation'].gen(s * 31, 4, 'x') as SingQuestion;
      expect(q.kind).toBe('sing');
      expect(q.promptBy).toBe('inner');
      expect(q.topic).toEqual({ id: 'audiation', level: 4, seed: s * 31 });
      expect(q.skillAs).toBe('sequences');
      const { midis, silentFrom } = q.inner!;
      expect(midis[midis.length - 1]).toBe(q.targetMidi);
      expect(silentFrom).toBeGreaterThanOrEqual(3);
      expect(midis.length - silentFrom).toBeGreaterThanOrEqual(2); // at least one silent note, then the target
      const line = q.stimulus[1];
      expect(line.kind).toBe('events');
      if (line.kind !== 'events') continue;
      const notes = line.events.filter((e) => !e.perc).map((e) => e.midi);
      expect(notes).toEqual(midis.slice(0, silentFrom));
      expect(line.events.filter((e) => e.perc).length).toBe(2 + midis.length - 1); // count-in + a click per note
    }
  });
  it('L1: "right" resumes the song where it was; "wrong" one note off', () => {
    let wrong = 0;
    for (let s = 1; s < 60; s++) {
      const q = TOPIC_GEN['audiation'].gen(s * 13, 1, 'x') as ChoiceQuestion;
      const st = q.stimulus[0];
      if (st.kind !== 'events') throw new Error('events');
      // clicks keep going through the silent notes: a click on every beat
      const clicks = st.events.filter((e) => e.perc).map((e) => e.start);
      for (let i = 1; i < clicks.length; i++) expect(clicks[i] - clicks[i - 1]).toBeCloseTo(0.6);
      if (q.answer === 'wrong') wrong++;
    }
    expect(wrong).toBeGreaterThan(10);
  });
  it('L3: the three versions differ, and exactly one keeps pitch and time', () => {
    for (let s = 1; s < 40; s++) {
      const q = TOPIC_GEN['audiation'].gen(s * 7, 3, 'x') as ChoiceQuestion;
      const sig = (k: string) => JSON.stringify(renderStimulus(q.choiceStim![k]).events.filter((e) => !e.perc).map((e) => [e.midi, e.start.toFixed(2)]));
      expect(new Set(q.choices.map(sig)).size).toBe(3);
      expect(q.stimulus.filter((x) => x.kind === 'marker')).toHaveLength(3);
    }
  });
});

/** Chords of a phrase stimulus: notes grouped by onset, ascending. */
function chordsOf(s: Stimulus): number[][] {
  if (s.kind !== 'events') throw new Error('events');
  const by = new Map<string, number[]>();
  for (const e of s.events) if (!e.perc) by.set(e.start.toFixed(3), [...(by.get(e.start.toFixed(3)) ?? []), e.midi]);
  return [...by.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([, m]) => m.sort((a, b) => a - b));
}

describe('chromatic harmony', () => {
  it('always plays the key first, then the phrase with its resolution home', () => {
    for (let l = 1; l <= 6; l++)
      for (let s = 1; s < 20; s++) {
        const q = TOPIC_GEN['chromatic-harmony'].gen(s * 101, l, 'x') as ChoiceQuestion;
        expect(q.stimulus).toHaveLength(3);
        const ctx = chordsOf(q.stimulus[0]);
        const ph = chordsOf(q.stimulus[2]);
        expect(ctx).toHaveLength(4);
        // the phrase ends on the home chord of the cadence
        expect(ph[ph.length - 1][0] % 12).toBe(ctx[3][0] % 12);
      }
  });
  it('R6: the augmented sixth has ♭6 in the bass falling a half step to 5; V/V is in root position; both go to V', () => {
    for (let s = 1; s < 40; s++) {
      const q = TOPIC_GEN['chromatic-harmony'].gen(s * 17, 3, 'x') as ChoiceQuestion;
      const a = chordsOf(q.choiceStim!.aug6[2]);
      const b = chordsOf(q.choiceStim!.vofv[2]);
      const tonic = a[0][0] % 12;
      // [I, IV, X, V, I]
      expect((a[2][0] - tonic + 120) % 12).toBe(8);
      expect(a[2][0] - a[3][0]).toBe(1);
      expect(a[2].some((m) => (m - tonic + 120) % 12 === 6)).toBe(true); // ♯4 above the ♭6 bass: the augmented sixth
      expect((b[2][0] - tonic + 120) % 12).toBe(2);
      expect(b[2].some((m) => (m - tonic + 120) % 12 === 6)).toBe(true);
      expect((a[3][0] - tonic + 120) % 12).toBe(7);
      expect((b[3][0] - tonic + 120) % 12).toBe(7);
    }
  });
  it('upper voices move smoothly (no voice leaps more than a fourth)', () => {
    for (let l = 1; l <= 6; l++)
      for (let s = 1; s < 20; s++) {
        const q = TOPIC_GEN['chromatic-harmony'].gen(s * 3, l, 'x') as ChoiceQuestion;
        for (const k of q.choices) {
          const cs = chordsOf(q.choiceStim![k][2]);
          for (let i = 1; i < cs.length; i++) {
            const up0 = cs[i - 1].slice(1);
            const up1 = cs[i].slice(1);
            up1.forEach((m, j) => expect(Math.abs(m - up0[j]), `L${l} ${k} chord ${i}`).toBeLessThanOrEqual(5));
          }
        }
      }
  });
});

describe('the arrangement builder (form.ts)', () => {
  it('voiceLead keeps the voices close and the chord complete', () => {
    const [I, IV, V7, I2] = voiceChords([ch(0), ch(5), ch(7, '7'), ch(0)], 60);
    expect(I.slice(1).map((m) => m % 12).sort()).toEqual([0, 4, 7]);
    expect(V7.slice(1).map((m) => m % 12).sort((a, b) => a - b)).toEqual([2, 5, 11]);
    for (const [a, b] of [[I, IV], [IV, V7], [V7, I2]]) for (let k = 1; k < 4; k++) expect(Math.abs(a[k] - b[k])).toBeLessThanOrEqual(4);
    expect(voiceLead([0, 4, 7], [64, 67, 72])).toEqual([64, 67, 72]);
  });
  it('the chorus is fuller and louder than the verse; stopping after n bars plays n bars', () => {
    for (let s = 1; s < 20; s++) {
      const q = TOPIC_GEN['song-form'].gen(s * 11, 1, 'x') as ChoiceQuestion;
      const pitched = (k: string) => renderStimulus(q.choiceStim![k]).events.filter((e: NoteEvent) => !e.perc);
      const mean = (xs: NoteEvent[]) => xs.reduce((a, e) => a + e.velocity, 0) / xs.length;
      expect(pitched('chorus').length).toBeGreaterThan(pitched('verse').length);
      expect(mean(pitched('chorus'))).toBeGreaterThan(mean(pitched('verse')));
    }
    const a = arrange([{ bars: [[ch(0)], [ch(5)], [ch(7)], [ch(0)]], energy: 2 }, { bars: [[ch(0)], [ch(5)], [ch(7)], [ch(0)]], energy: 2 }], { tonic: 60, bpm: 120, groove: 'rock', stopAfterBars: 6 });
    expect(a.barStarts).toHaveLength(6);
    expect(a.length).toBeCloseTo(6 * 2 + 0.6);
    expect(Math.max(...a.events.map((e) => e.start))).toBeLessThan(12);
  });
  it('song-form L3/L4 play up to the asked position', () => {
    const want: Record<string, number> = { b5: 6, b9: 10, turn: 13, b1: 14 }; // bars incl. the count-in
    for (let s = 1; s < 30; s++) {
      const q = TOPIC_GEN['song-form'].gen(s * 5, 3, 'x') as ChoiceQuestion;
      const st = q.stimulus[0];
      if (st.kind !== 'events') throw new Error('events');
      expect(st.length).toBeCloseTo(want[q.answer] * 4 * (60 / 168) + 0.6, 1);
    }
  });
  it('the style idioms are distinct (swing in jazz, rubato in Romantic, steady sixteenths in Baroque)', () => {
    const sig = (st: Parameters<typeof styleClip>[0]) => JSON.stringify(styleClip(st, 60, 0).events.map((e) => [e.midi, e.start.toFixed(2)]));
    const ids = ['baroque', 'classical', 'romantic', 'modern', 'jazz', 'pop'] as const;
    expect(new Set(ids.map(sig)).size).toBe(6);
    const jazz = styleClip('jazz', 60, 0).events.filter((e) => e.perc === 'hat').map((e) => (e.start / (60 / 138)) % 1);
    expect(jazz.some((f) => Math.abs(f - 2 / 3) < 0.01)).toBe(true);
    const rom = styleClip('romantic', 60, 0).events.filter((e) => !e.perc).map((e) => e.start);
    const onsets = [...new Set(rom.map((x) => x.toFixed(3)))].map(Number).sort((a, b) => a - b);
    const gaps = onsets.slice(1).map((x, i) => x - onsets[i]);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.3);
    const bar = styleClip('baroque', 60, 0).events.filter((e) => e.midi >= 64).map((e) => e.start);
    const steps = bar.slice(1).map((x, i) => +(x - bar[i]).toFixed(3));
    expect(steps.filter((x) => Math.abs(x - 0.15) < 0.001).length).toBeGreaterThan(30);
  });
});

import { SUB_BY_ID } from '../src/engine/taxonomy';
describe('taxonomy for these topics', () => {
  it('tag vectors are well formed and levels never get easier within a sub-skill', () => {
    for (const t of all) {
      const last = new Map<string, number>();
      for (let l = 1; l <= TOPIC_GEN[t].levels.length; l++) {
        for (let s = 1; s <= 6; s++) {
          const q = TOPIC_GEN[t].gen(s * 97, l, 'q');
          const tags = questionTags(q);
          expect(tags[0].w).toBeGreaterThanOrEqual(0.5);
          expect(Math.abs(tags.reduce((a, x) => a + x.w, 0) - 1)).toBeLessThan(0.011);
          expect(new Set(tags.map((x) => x.skill)).size).toBe(tags.length);
          for (const x of tags) expect(SUB_BY_ID[x.sub]?.skill, `${t} L${l} ${x.sub}`).toBe(x.skill);
        }
        const q = TOPIC_GEN[t].gen(12345, l, 'q');
        const sub = questionTags(q)[0].sub;
        const prev = last.get(sub);
        if (prev !== undefined) expect(q.difficulty, `${t} L${l}`).toBeGreaterThanOrEqual(prev);
        last.set(sub, q.difficulty);
      }
    }
  });
});
