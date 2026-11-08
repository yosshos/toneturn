import { describe, expect, it } from 'vitest';
import { drumEvents, DRUM_TOPICS } from '../src/engine/drumVoice';
import { genTopic } from '../src/engine/topicKit';
import { renderStimulus } from '../src/engine/lesson';

describe('rhythm items on drums (0.50.1)', () => {
  it('turns notes into snare hits, accents into kick + snare, long notes get a hum', () => {
    const ev = drumEvents([
      { midi: 60, start: 0, duration: 0.2, velocity: 0.9 },
      { midi: 64, start: 0, duration: 0.2, velocity: 0.9 },
      { midi: 62, start: 0.5, duration: 1, velocity: 0.5 },
      { midi: 96, start: 0, duration: 0.05, velocity: 0.3, perc: 'click' },
    ]);
    expect(ev.filter((e) => e.perc === 'snare')).toHaveLength(2);
    expect(ev.filter((e) => e.perc === 'kick').map((e) => e.start)).toEqual([0]);
    expect(ev.filter((e) => e.inst === 'hum').map((e) => e.start)).toEqual([0.5]);
    expect(ev.some((e) => !e.perc && !e.fx && e.inst !== 'hum')).toBe(false);
    expect(ev.some((e) => e.perc === 'click')).toBe(true);
  });
  it('no time topic plays piano notes', () => {
    for (const topic of DRUM_TOPICS) {
      for (let lv = 1; lv <= 8; lv++) {
        let q;
        try {
          q = genTopic(topic, 11, lv, 'x') as { stimulus?: Parameters<typeof renderStimulus>[0] };
        } catch {
          break;
        }
        if (!q.stimulus) continue;
        const { events } = renderStimulus(q.stimulus);
        expect(events.filter((e) => !e.perc && !e.fx && e.inst !== 'hum'), `${topic} L${lv}`).toEqual([]);
      }
    }
  });
});
