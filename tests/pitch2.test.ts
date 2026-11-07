import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { asChoice, genTopic } from '../src/engine/topicKit';
import { questionTags, TOPIC_TAGS } from '../src/engine/taxonomy';
import { SING_HI, SING_LO } from '../src/engine/topicsPitch2';
import type { Stimulus } from '../src/engine/lesson';

const DEEPER: Record<string, number> = { maqam: 6, 'scale-types': 5, 'degrees-ext': 4, 'chord-scale': 3, 'transpose-adv': 3, mood: 4, 'bh-keys': 2, 'bh-tone': 2, 'bh-pivot': 2, 'sing-intervals': 6 };
const NEW_FROM: Record<string, number> = { maqam: 4, 'scale-types': 4, 'degrees-ext': 3, 'chord-scale': 3, 'transpose-adv': 3, mood: 3, 'bh-keys': 2, 'bh-tone': 2, 'bh-pivot': 2, 'sing-intervals': 1 };

describe('pitch & voice, 0.38 (spec AE §4.7, §10.3)', () => {
  it('every topic has its new levels, with EN + HE names', () => {
    for (const [t, n] of Object.entries(DEEPER)) {
      expect(TOPIC_GEN[t].levels, t).toHaveLength(n);
      for (const l of TOPIC_GEN[t].levels) expect(l.en && l.he, t).toBeTruthy();
    }
  });

  it('new levels are deterministic and every answer is reachable', () => {
    for (const [t, n] of Object.entries(DEEPER))
      for (let level = NEW_FROM[t]; level <= n; level++) {
        const seen = new Set<string>();
        let all = new Set<string>();
        for (let s = 1; s <= 300; s++) {
          const q = TOPIC_GEN[t].gen(s * 7919, level, 'x');
          expect(TOPIC_GEN[t].gen(s * 7919, level, 'x')).toEqual(q);
          if (q.kind !== 'choice') continue;
          expect(q.level, `${t} L${level}`).toBe(level);
          expect(q.topic).toBe(t);
          seen.add(q.answer);
          all = new Set([...all, ...q.choices]);
          for (const c of q.choices) expect(q.names[c].en && q.names[c].he, `${t} ${c}`).toBeTruthy();
        }
        if (all.size) expect([...all].filter((c) => !seen.has(c)), `${t} L${level} unreachable`).toEqual([]);
      }
  });

  it('base levels are untouched by the wrappers', () => {
    expect(asChoice(TOPIC_GEN['maqam'].gen(5, 2, 'x')).choices.sort()).toEqual(['bayati', 'hijaz', 'rast', 'saba', 'sikah']);
    expect(asChoice(TOPIC_GEN['bh-keys'].gen(5, 1, 'x')).level).toBe(1);
  });

  it('maqam: quarter tones in Huzam and the neutral third; sayr moves to another tonic or maqam', () => {
    const fr = (st: Stimulus[]) => st.some((s) => (s.kind === 'notes' || s.kind === 'chord' ? s.midis : s.kind === 'events' ? s.events.map((e) => e.midi) : []).some((m) => m % 1 !== 0));
    for (let s = 1; s < 60; s++) {
      const q4 = asChoice(TOPIC_GEN['maqam'].gen(s, 4, 'x'));
      expect(fr(q4.choiceStim!.huzam)).toBe(true);
      const q5 = asChoice(TOPIC_GEN['maqam'].gen(s, 5, 'x'));
      expect(fr(q5.stimulus)).toBe(q5.answer === 'neutral');
      const q6 = asChoice(TOPIC_GEN['maqam'].gen(s, 6, 'x'));
      expect(q6.choices).toHaveLength(4);
      const a = q6.choiceStim![q6.choices[0]][0];
      const b = q6.choiceStim![q6.choices[1]][0];
      expect(a).not.toEqual(b);
    }
  });

  it('transpose-adv 3: reading treble as alto moves every letter up one, as tenor down one', () => {
    for (let s = 1; s < 80; s++) {
      const q = asChoice(TOPIC_GEN['transpose-adv'].gen(s * 13, 3, 'x'));
      expect(q.show?.clef).toBe('treble');
      const L = 'CDEFGAB';
      const written = q.show!.midis.map((m) => L[[0, 2, 4, 5, 7, 9, 11].indexOf(m % 12)]);
      const alto = q.ask.en.includes('alto');
      const ans = q.names[q.answer].en.split(' ');
      written.forEach((w, i) => expect((L.indexOf(ans[i]) - L.indexOf(w) + 7) % 7).toBe(alto ? 1 : 6));
    }
  });

  it('chord-scale 3 and bh-pivot 2 name pitches, so they are never transposed', () => {
    for (let s = 1; s < 40; s++) {
      for (const [t, l] of [['chord-scale', 3], ['bh-pivot', 2]] as const) {
        const pitches = (st: Stimulus[]) => st.map((x) => (x.kind === 'chord' || x.kind === 'melody' ? x.midis : []));
        expect(pitches(genTopic(t, s * 31, l, 'x').stimulus)).toEqual(pitches(TOPIC_GEN[t].gen(s * 31, l, 'x').stimulus));
      }
    }
  });

  it('mood 4: the two versions differ in exactly the named way', () => {
    for (let s = 1; s < 30; s++) {
      const q = asChoice(TOPIC_GEN['mood'].gen(s, 4, 'x'));
      const [, a, , b] = q.stimulus;
      expect(q.stimulus[0].kind).toBe('marker');
      if (a.kind !== 'events' || b.kind !== 'events') throw new Error('events expected');
      if (q.answer === 'tempo') expect(b.length).toBeGreaterThan(a.length * 1.5);
      if (q.answer === 'register') expect(b.events[0].midi).toBe(a.events[0].midi - 12);
      if (q.answer === 'loudness') expect(b.events[0].velocity).toBeLessThan(a.events[0].velocity);
      if (q.answer === 'mode') expect(b.events.map((e) => e.midi)).not.toEqual(a.events.map((e) => e.midi));
    }
  });

  it('sing-intervals: right kinds, topic set, notes in a singable range, the interval adds up', () => {
    for (let level = 1; level <= 6; level++)
      for (let s = 1; s < 200; s++) {
        const q = TOPIC_GEN['sing-intervals'].gen(s * 101, level, 'x');
        if (level <= 4) {
          if (q.kind !== 'sing') throw new Error('sing expected');
          expect(q.promptBy).toBe('interval');
          expect(q.topic).toEqual({ id: 'sing-intervals', level, seed: s * 101 });
          const iv = q.interval!;
          expect(iv.fromMidi + iv.semis).toBe(q.targetMidi);
          for (const m of [iv.fromMidi, q.targetMidi]) expect(m >= SING_LO && m <= SING_HI, `L${level} ${m}`).toBe(true);
          if (level === 1) expect([4, 7, 12]).toContain(iv.semis);
          if (level === 2) expect(iv.semis).toBeGreaterThan(0);
          if (level === 3) expect(iv.semis).toBeLessThan(0);
          if (level === 4) {
            expect(q.stimulus[0].kind).toBe('cadence');
            const t = q.key;
            const rel = (iv.fromMidi - [0, 2, 4, 5, 7, 9, 11][['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(t.letter)] - t.acc + 120) % 12;
            expect(rel).not.toBe(0); // not from the tonic
            expect([0, 2, 4, 5, 7, 9, 11]).toContain(rel);
          }
          expect(iv.name.en && iv.name.he).toBeTruthy();
        } else {
          if (q.kind !== 'sing-seq') throw new Error('sing-seq expected');
          expect(q.topic).toEqual({ id: 'sing-intervals', level, seed: s * 101 });
          for (const m of q.midis) expect(m >= SING_LO && m <= SING_HI).toBe(true);
          expect(q.degrees).toHaveLength(q.midis.length);
          if (level === 6) expect(q.degrees[0]).toBe(1);
        }
        const tags = questionTags(q);
        expect(tags[0]).toEqual({ skill: 'singing', sub: 'singing/intervals', w: 0.7 });
      }
  });

  it('transpose-adv 3 tags reading the staff', () => {
    const t = TOPIC_TAGS['transpose-adv'];
    expect(typeof t === 'function' && t(3).map((x) => x.sub)).toEqual(['transpose/pitch', 'notes/staff']);
  });
});
