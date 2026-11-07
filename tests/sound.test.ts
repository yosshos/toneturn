import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { asChoice } from '../src/engine/topicKit';
import { renderStimulus, type Stimulus } from '../src/engine/lesson';
import { fxSpecsIn, fxTail, itemNeedsHeadphones, needsHeadphones, sourceSeconds, speakerSafe, type FxSpec } from '../src/engine/fx';
import { driveCurve, makeImpulse, matchGain, pinkNoise, renderSource, rms } from '../src/audio/fx';

const TOPICS = ['eq-ear', 'filter-ear', 'tone-hz', 'space-ear', 'pan-ear', 'width-ear', 'dyn-ear'];
const LEVELS: Record<string, number> = { 'eq-ear': 7, 'filter-ear': 3, 'tone-hz': 3, 'space-ear': 6, 'pan-ear': 3, 'width-ear': 2, 'dyn-ear': 6 };
const specs = (s: Stimulus[]) => fxSpecsIn(s);

describe('sound & production ear topics (spec AE §4.4, §10)', () => {
  it('all topics registered with their levels, skill timbre', () => {
    for (const t of TOPICS) {
      expect(TOPIC_GEN[t], t).toBeTruthy();
      expect(TOPIC_GEN[t].levels.length, t).toBe(LEVELS[t]);
      expect(TOPIC_GEN[t].skill).toBe('timbre');
    }
  });

  it('deterministic; every answer reachable; every choice audible; under ~25 s', () => {
    for (const t of TOPICS)
      for (let l = 1; l <= LEVELS[t]; l++) {
        const seen = new Set<string>();
        let choices: string[] = [];
        for (let s = 1; s <= 150; s++) {
          const q = asChoice(TOPIC_GEN[t].gen(s * 131, l, 'x'));
          expect(TOPIC_GEN[t].gen(s * 131, l, 'x')).toEqual(q);
          seen.add(q.answer);
          choices = [...new Set([...choices, ...q.choices])];
          expect(renderStimulus(q.stimulus).length, `${t} L${l}`).toBeLessThan(25);
          expect(specs(q.stimulus).length, `${t} L${l}`).toBeGreaterThan(0);
          if (q.choiceStim) for (const c of q.choiceStim ? Object.keys(q.choiceStim) : []) expect(q.choices).toContain(c);
        }
        // every option that can be offered can also be the answer
        for (const c of choices) expect(seen.has(c), `${t} L${l} answer ${c}`).toBe(true);
      }
  });

  it('R1: loudness-matched everywhere except dyn-ear "which is louder"', () => {
    for (const t of TOPICS)
      for (let l = 1; l <= LEVELS[t]; l++)
        for (let s = 1; s <= 10; s++) {
          const q = asChoice(TOPIC_GEN[t].gen(s * 17, l, 'x'));
          const all = [q.stimulus, ...Object.values(q.choiceStim ?? {})].flatMap(specs);
          const levelItem = t === 'dyn-ear' && l === 4;
          const absolute = t === 'tone-hz';
          for (const f of all) expect(!!f.matchTo, `${t} L${l}`).toBe(!levelItem && !absolute);
        }
  });

  it('A/B items compare the same source (same seed) and B is matched to A\'s chain', () => {
    const q = asChoice(TOPIC_GEN['space-ear'].gen(99, 4, 'x'));
    const [a, b] = specs(q.stimulus);
    expect(a.seed).toBe(b.seed);
    expect(b.matchTo).toEqual(a.chain);
  });

  it('dyn-ear L4: the louder one really is 1–3 dB louder', () => {
    for (let s = 1; s < 40; s++) {
      const q = asChoice(TOPIC_GEN['dyn-ear'].gen(s, 4, 'x'));
      const [a, b] = specs(q.stimulus);
      const d = (a.chain.gainDb ?? 0) - (b.chain.gainDb ?? 0);
      expect(Math.abs(d)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(d)).toBeLessThanOrEqual(3);
      expect(q.answer).toBe(d > 0 ? 'a' : 'b');
    }
  });

  it('R2: eq-ear and filter-ear L1 are speaker-safe; headphone levels are reported correctly', () => {
    for (const t of ['eq-ear', 'filter-ear'])
      for (let s = 1; s < 60; s++) {
        const q = asChoice(TOPIC_GEN[t].gen(s, 1, 'x'));
        for (const f of [q.stimulus, ...Object.values(q.choiceStim ?? {})].flatMap(specs)) expect(speakerSafe(f), t).toBe(true);
        expect(itemNeedsHeadphones(q)).toBe(false);
      }
    // pan / width always ask for headphones
    for (const t of ['pan-ear', 'width-ear'])
      for (let l = 1; l <= LEVELS[t]; l++) expect(itemNeedsHeadphones(asChoice(TOPIC_GEN[t].gen(3, l, 'x'))), `${t} L${l}`).toBe(true);
    // a 125 Hz band needs them
    const low: FxSpec = { source: 'pink', seconds: 2, seed: 1, chain: { eq: [{ type: 'peaking', freq: 125, gain: 9 }] } };
    expect(needsHeadphones(low)).toBe(true);
    expect(speakerSafe(low)).toBe(false);
    expect(speakerSafe({ source: 'sine', seconds: 1, seed: 0, sineHz: 400, chain: {} })).toBe(false);
    expect(speakerSafe({ source: 'sine', seconds: 1, seed: 0, sineHz: 1000, chain: {} })).toBe(true);
  });

  it('delay times follow the tempo (space-ear L3)', () => {
    for (let s = 1; s < 30; s++) {
      const q = asChoice(TOPIC_GEN['space-ear'].gen(s, 3, 'x'));
      const f = specs(q.stimulus)[0];
      const beat = 60 / f.bpm!;
      const want = { quarter: beat, eighth: beat / 2, dotted: beat * 0.75 }[q.answer as 'quarter']!;
      expect(f.chain.delay!.time).toBeCloseTo(want, 2);
    }
  });

  it('fx spec seconds = source + tail', () => {
    const q = asChoice(TOPIC_GEN['space-ear'].gen(5, 2, 'x'));
    for (const f of Object.values(q.choiceStim!).flatMap(specs)) {
      expect(f.seconds).toBeCloseTo(sourceSeconds(f) + fxTail(f.chain), 1);
      expect(sourceSeconds(f)).toBeGreaterThan(1);
    }
    expect(fxTail({})).toBe(0);
    expect(fxTail({ reverb: { decay: 2, mix: 0.3, predelay: 0.1 } })).toBeCloseTo(2.1);
  });
});

describe('fx renderer helpers (pure, no Web Audio)', () => {
  it('RMS and the match gain', () => {
    const a = new Float32Array(1000).fill(0.5);
    expect(rms([a])).toBeCloseTo(0.5);
    expect(matchGain(0.1, 0.4)).toBeCloseTo(0.25);
    expect(matchGain(0.1, 0)).toBe(1);
  });
  it('the impulse starts after the pre-delay and decays by ~60 dB', () => {
    const rate = 8000;
    const [l, r] = makeImpulse(rate, 1, 0.1, 3);
    expect(l.length).toBe(rate * 1.1);
    expect(l.subarray(0, 0.1 * rate - 1).every((x) => x === 0)).toBe(true);
    const head = rms([l.subarray(800, 1200)]);
    const tail = rms([l.subarray(l.length - 400)]);
    expect(20 * Math.log10(head / tail)).toBeGreaterThan(45);
    expect(Array.from(l.subarray(900, 920))).not.toEqual(Array.from(r.subarray(900, 920))); // decorrelated
  });
  it('drive curve is bounded, odd and steeper with more drive', () => {
    const c = driveCurve(1, 101);
    expect(Math.max(...c)).toBeLessThanOrEqual(1.0001);
    expect(c[0]).toBeCloseTo(-c[100]);
    expect(driveCurve(1, 101)[60]).toBeGreaterThan(driveCurve(0, 101)[60]);
  });
  it('sources are deterministic, normalised and silent in the tail', () => {
    expect(Array.from(pinkNoise(64, 5))).toEqual(Array.from(pinkNoise(64, 5)));
    for (const source of ['pink', 'loop', 'drums', 'voice', 'sine'] as const) {
      const spec: FxSpec = { source, seconds: 2.5, seed: 9, bpm: 120, sineHz: 1000, chain: { reverb: { decay: 0.5, mix: 0.3 } } };
      const [L, R] = renderSource(spec, 8000);
      const [L2] = renderSource(spec, 8000);
      expect(Array.from(L.subarray(0, 200))).toEqual(Array.from(L2.subarray(0, 200)));
      const src = Math.floor(sourceSeconds(spec) * 8000);
      expect(rms([L.subarray(0, src), R.subarray(0, src)]), source).toBeCloseTo(0.07, 2);
      expect(rms([L.subarray(src)]), source).toBe(0);
    }
  });
  it('part pan puts the chosen loop part on the left', () => {
    const spec: FxSpec = { source: 'loop', seconds: 2, seed: 4, bpm: 120, parts: ['keys'], partPan: { keys: -0.9 }, chain: {} };
    const [L, R] = renderSource(spec, 8000);
    expect(rms([L])).toBeGreaterThan(rms([R]) * 3);
  });
});
