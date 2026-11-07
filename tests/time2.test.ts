import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { TOPIC_TAGS } from '../src/engine/taxonomy';
import { applyClicks, gapBars, gradeLanes, gradeTempo, steadyBeat, tempoTimeline } from '../src/engine/clicks';
import { onsetBeats, readTimeline, totalBeats, type Rhythm } from '../src/engine/rhythm';
import { renderStimulus } from '../src/engine/lesson';
import { LESSONS, UNITS } from '../src/content/mini/time2';

const NEW = ['click-subdivide', 'click-backbeat', 'gap-click', 'tempo-memory', 'poly-tap', 'rhythm-errors', 'drum-read', 'tempo-react', 'sight-tap'];
const DEEP: Record<string, number> = { polyrhythm: 4, 'swing-ratio': 4, syncopation: 4, downbeat: 4, 'displacement-3': 3, 'eastern-rhythm': 5, 'odd-meter': 5 };

describe('time with the click: topics', () => {
  it('new topics are registered, tagged and have a quick lesson', () => {
    for (const t of NEW) {
      expect(TOPIC_GEN[t], t).toBeTruthy();
      expect(TOPIC_TAGS[t], t).toBeTruthy();
      expect(UNITS[`topic:${t}`], t).toBeTruthy();
      expect(LESSONS.some((l) => l.id === UNITS[`topic:${t}`])).toBe(true);
    }
  });
  it('deepened topics have their new levels', () => {
    for (const [t, n] of Object.entries(DEEP)) expect(TOPIC_GEN[t].levels.length, t).toBe(n);
  });
  it('every level is deterministic, every choice answer is reachable, sound stays under 25 s', () => {
    for (const t of [...NEW, ...Object.keys(DEEP)]) {
      const T = TOPIC_GEN[t];
      // Deepened topics: only the new levels are ours (displacement-3 L1 never asks "dq" — a base-topic quirk).
      const first = t in DEEP ? T.levels.length - (t === 'eastern-rhythm' ? 3 : t === 'odd-meter' ? 1 : 2) + 1 : 1;
      for (let level = first; level <= T.levels.length; level++) {
        const seen = new Set<string>();
        let choices: string[] = [];
        for (let s = 1; s <= 120; s++) {
          const q = T.gen(s * 7919, level, 'x');
          expect(T.gen(s * 7919, level, 'x')).toEqual(q);
          if (q.stimulus.length) expect(renderStimulus(q.stimulus).length, `${t} L${level}`).toBeLessThan(25);
          if (q.kind === 'choice') {
            expect(q.topic).toBe(t);
            expect(q.level).toBe(level);
            for (const st of Object.values(q.choiceStim ?? {})) expect(renderStimulus(st).length).toBeLessThan(25);
            seen.add(q.answer);
            choices = [...new Set([...choices, ...q.choices])];
          } else {
            expect(q.kind === 'rhythm-read' || q.kind === 'sing-seq').toBe(true);
            if (q.kind === 'rhythm-read' || q.kind === 'sing-seq') expect(q.topic).toEqual({ id: t, level, seed: s * 7919 });
            if (q.kind === 'rhythm-read') {
              // Tapping time: count-in plus the passage stays under ~25 s.
              expect(((totalBeats(q.rhythm) + 4) * 60) / q.bpm, `${t} L${level}`).toBeLessThan(25);
              for (const l of q.lanes ?? []) expect(totalBeats(l.rhythm)).toBe(totalBeats(q.rhythm));
            }
          }
        }
        for (const c of choices) expect(seen.has(c), `${t} L${level} answer ${c}`).toBe(true);
      }
    }
  });
  it('sight-tap lines end on the tonic and their durations fill whole bars', () => {
    for (let level = 1; level <= 3; level++)
      for (let s = 1; s < 40; s++) {
        const q = TOPIC_GEN['sight-tap'].gen(s, level, 'x');
        if (q.kind !== 'sing-seq') throw new Error('kind');
        expect(q.degrees[q.degrees.length - 1]).toBe(1);
        expect(q.show!.durs!.length).toBe(q.midis.length);
        expect(q.show!.durs!.reduce((a, b) => a + b, 0) % 4).toBe(0);
        expect(q.tapBeat?.bpm).toBeGreaterThan(0);
        expect(q.skillAs).toBe('sight');
      }
  });
  it('eastern-rhythm L5 lanes split the pattern into dum and tek', () => {
    const q = TOPIC_GEN['eastern-rhythm'].gen(3, 5, 'x');
    if (q.kind !== 'rhythm-read') throw new Error('kind');
    const all = onsetBeats(q.rhythm).length;
    expect(q.lanes!.reduce((a, l) => a + onsetBeats(l.rhythm).length, 0)).toBe(all);
  });
});

describe('clicks.ts', () => {
  const r44 = (bars: number): Rhythm => ({ beatsPerBar: 4, bars, cells: Array(4 * bars).fill('q') });
  const tl = (bars: number) => readTimeline(r44(bars), 60).clicks;
  it('keeps the count-in and applies each pattern', () => {
    const c = tl(4); // 4 count-in + 16
    expect(applyClicks(c, { kind: 'beats' }, 4, 4)).toHaveLength(20);
    const back = applyClicks(c, { kind: 'backbeat' }, 4, 4);
    expect(back.slice(0, 4)).toEqual(c.slice(0, 4));
    expect(back.slice(4).map((x) => x.t)).toEqual([5, 7, 9, 11, 13, 15, 17, 19]);
    expect(applyClicks(c, { kind: 'one' }, 4, 4).slice(4).map((x) => x.t)).toEqual([4, 8, 12, 16]);
    expect(applyClicks(c, { kind: 'offbeat' }, 4, 4).slice(4)[0].t).toBeCloseTo(4.5);
    expect(applyClicks(c, { kind: 'every2' }, 4, 4).slice(4).map((x) => x.t)).toEqual([4, 12]);
    const g = applyClicks(tl(6), { kind: 'gaps', on: 2, off: 1 }, 4, 4).slice(4).map((x) => x.t);
    expect(g).toHaveLength(16);
    expect(g.some((t) => t >= 12 && t < 16)).toBe(false); // bar 3 is silent
  });
  it('random gaps are deterministic, start with two bars on, and never touch', () => {
    for (let s = 1; s < 50; s++) {
      const b = gapBars(s, 12);
      expect(gapBars(s, 12)).toEqual(b);
      expect(b.slice(0, 2)).toEqual([true, true]);
      expect(b.includes(false)).toBe(true);
      // A gap is at most two bars, so two gaps never run together.
      expect(b.join('').includes('falsefalsefalse')).toBe(false);
    }
    const c = tl(8);
    expect(applyClicks(c, { kind: 'random-gaps', seed: 7 }, 4, 4)).toEqual(applyClicks(c, { kind: 'random-gaps', seed: 7 }, 4, 4));
  });
  it('tempo timeline: start when ready, or clicks then silence', () => {
    const free = tempoTimeline({ bpm: 60, beats: 8 });
    expect(free.clicks).toHaveLength(0);
    expect(free.responseAt).toBe(0);
    expect(free.responseEnd).toBeGreaterThan(8);
    const held = tempoTimeline({ bpm: 120, beats: 16, withClicks: 8 });
    expect(held.clicks).toHaveLength(8);
    expect(held.responseAt).toBeCloseTo(4);
    expect(held.responseEnd).toBeGreaterThan(held.responseAt + 8);
  });
  it('grades a tapped tempo by % error and steadiness', () => {
    const at = (bpm: number, n: number, jitter = 0) => Array.from({ length: n }, (_, i) => i * (60000 / bpm) + (i % 2 ? jitter : -jitter));
    const exact = gradeTempo(at(120, 12), { bpm: 120, beats: 12 });
    expect(exact.accuracy).toBeCloseTo(1);
    expect(exact.pass).toBe(true);
    expect(gradeTempo(at(123, 12), { bpm: 120, beats: 12 }).errPct).toBeLessThanOrEqual(3);
    expect(gradeTempo(at(123, 12), { bpm: 120, beats: 12 }).accuracy).toBeGreaterThan(0.99);
    const off = gradeTempo(at(140, 12), { bpm: 120, beats: 12 });
    expect(off.errPct).toBeGreaterThan(15);
    expect(off.pass).toBe(false);
    expect(gradeTempo(at(120, 12, 40), { bpm: 120, beats: 12 }).steadiness).toBeLessThan(0.5);
    expect(gradeTempo([0, 500], { bpm: 120, beats: 12 }).pass).toBe(false);
  });
  it('grades lanes weighted by onsets', () => {
    const left: Rhythm = { beatsPerBar: 4, bars: 1, cells: ['q', 'q', 'q', 'q'] };
    const right: Rhythm = { beatsPerBar: 4, bars: 1, cells: ['ee', 'ee', 'ee', 'ee'] };
    const lanes = [{ rhythm: left }, { rhythm: right }];
    const taps = [...[0, 1000, 2000, 3000].map((ms) => ({ ms, lane: 0 })), ...[0, 500, 1000, 1500, 2000, 2500, 3000, 3500].map((ms) => ({ ms, lane: 1 }))];
    const g = gradeLanes(lanes, 60, taps, 2);
    expect(g.pass).toBe(true);
    expect(g.accuracy).toBeCloseTo(1);
    const wrong = gradeLanes(lanes, 60, taps.map((t) => ({ ...t, lane: 1 - t.lane })), 2);
    expect(wrong.pass).toBe(false);
    expect(wrong.perLane).toHaveLength(2);
    const halfMissing = gradeLanes(lanes, 60, taps.filter((t) => t.lane === 1), 2);
    expect(halfMissing.perLane[1]).toBeCloseTo(1);
    expect(halfMissing.accuracy).toBeCloseTo(8 / 12);
  });
  it('steady beat: even taps score high, skipped taps are forgiven, uneven taps score low', () => {
    const even = [0, 1000, 2000, 3000, 4000];
    expect(steadyBeat(even, 60)).toBeCloseTo(1);
    expect(steadyBeat([0, 1000, 3000, 4000], 60)).toBeCloseTo(1);
    expect(steadyBeat([0, 800, 2100, 2900, 4200], 60)).toBeLessThan(0.3);
    expect(steadyBeat([0, 1000], 60)).toBe(0);
  });
});
