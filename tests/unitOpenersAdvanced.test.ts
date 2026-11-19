// Owner 2026-11-19: every unit opener — the new advanced units too — says what that unit is for.
import { describe, expect, it } from 'vitest';
import { THEMES } from '../src/engine/path';
import { UNIT_THEMES, unitThemeOf } from '../src/content/openers';

const st = (...ids: string[]) => ids.map((id) => ({ id }));
describe('advanced unit openers', () => {
  it('a unit is described by its advanced topics', () => {
    expect(unitThemeOf('ear', 'chords', st('topic:octave-division:1', 'topic:octave-division:2', 'topic:intervals-all:3'), THEMES)).toBe('symmetry');
    expect(unitThemeOf('ear', 'home', st('topic:neo-riemann:1', 'topic:interval-vector:1'), THEMES)).toBe('symmetry');
    expect(unitThemeOf('ear', 'home', st('topic:twelve-tone:1', 'topic:messiaen-modes:2'), THEMES)).toBe('posttonal');
    expect(unitThemeOf('ear', 'home', st('topic:negative-harmony:1', 'topic:mediants:2'), THEMES)).toBe('reharm');
    expect(unitThemeOf('ear', 'home', st('topic:bh-scale:1', 'topic:bh-tone:1'), THEMES)).toBe('barry');
  });
  it('a beginner unit keeps its own copy', () => {
    expect(unitThemeOf('ear', 'home', st('lesson:degrees-135', 'topic:find-tonic:1'), THEMES)).toBe('home');
  });
  it('every advanced copy is complete in both languages', () => {
    for (const k of ['symmetry', 'posttonal', 'barry', 'reharm', 'jazz', 'world']) {
      const c = UNIT_THEMES[k];
      expect(c, k).toBeDefined();
      for (const t of [c.name!, c.what, c.whatSay, c.why, c.whySay, c.goal, c.goalSay, ...c.feeds.map((f) => f.t), ...c.demo.map((d) => d.cap)]) {
        expect(t.he.length, k).toBeGreaterThan(0);
        expect(t.en.length, k).toBeGreaterThan(0);
      }
    }
  });
});
