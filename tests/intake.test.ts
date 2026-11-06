// Intake questionnaire: tracks, the personal path order, Today's plan and placement follow the player's priorities.
import { describe, expect, it } from 'vitest';
import { intakeSettings, LESSON_AREA, personalOrder, PREREQ, priorityBoost, trackOf, voiceTypeOf, type Intake } from '../src/engine/intake';
import { LESSON_ORDER } from '../src/engine/lesson';
import { weakestSkills } from '../src/engine/workout';
import { domainOf } from '../src/engine/rating';
import { placementSkills } from '../src/engine/placement';

const base: Intake = { v: 1, at: '', music: 0, singing: 0, theory: 0, reading: 0, plays: [], priorities: null, motivation: 'learn', minutes: 10 };

describe('intake: tracks', () => {
  it('listener → explorer, hobby → hobby, lessons → student, pro → pro', () => {
    expect(trackOf(base)).toBe('explorer');
    expect(trackOf({ ...base, music: 1 })).toBe('hobby');
    expect(trackOf({ ...base, music: 2, theory: 1 })).toBe('student');
    expect(trackOf({ ...base, music: 3 })).toBe('pro');
    expect(trackOf({ ...base, music: 2, theory: 3, reading: 2 })).toBe('pro');
  });
  it('settings: pros skip quick lessons; "just get better" gets the clean view', () => {
    expect(intakeSettings({ ...base, music: 3 }).miniLessons).toBe(false);
    expect(intakeSettings(base).miniLessons).toBe(true);
    expect(intakeSettings(base).cleanView).toBe(true);
    expect(intakeSettings({ ...base, motivation: 'collect' }).cleanView).toBe(false);
  });
  it('a rough, playful voice type', () => {
    expect(voiceTypeOf({ low: 40, high: 60 })).toBe('bass');
    expect(voiceTypeOf({ low: 62, high: 82 })).toBe('soprano');
    expect(voiceTypeOf({ low: 47, high: 68 })).toBe('baritone');
  });
});

describe('intake: personal path order', () => {
  it('mixed = the original path', () => {
    expect(personalOrder(null)).toEqual(LESSON_ORDER);
  });
  it('every order is a permutation that respects prerequisites', () => {
    const orders = [
      ['time', 'pitch', 'memory', 'reading', 'voice'],
      ['voice', 'time', 'pitch', 'memory', 'reading'],
      ['reading', 'memory', 'voice', 'time', 'pitch'],
      ['memory', 'reading', 'time', 'voice', 'pitch'],
    ] as const;
    for (const pr of orders) {
      const o = personalOrder([...pr]);
      expect(o.slice().sort()).toEqual(LESSON_ORDER.slice().sort());
      for (const [id, pre] of Object.entries(PREREQ)) for (const p of pre!) expect(o.indexOf(p as never), `${pr[0]}: ${p} before ${id}`).toBeLessThan(o.indexOf(id as never));
    }
  });
  it('rhythm first, singing last → the path starts with rhythm and singing comes late', () => {
    const o = personalOrder(['time', 'pitch', 'memory', 'reading', 'voice']);
    expect(LESSON_AREA[o[0]]).toBe('time');
    const avg = (area: string, arr: string[]) => {
      const idx = arr.map((id, i) => (LESSON_AREA[id as never] === area ? i : -1)).filter((i) => i >= 0);
      return idx.reduce((a, b) => a + b, 0) / idx.length;
    };
    expect(avg('time', o)).toBeLessThan(avg('time', LESSON_ORDER));
    expect(avg('voice', o)).toBeGreaterThan(avg('voice', LESSON_ORDER));
    // Within an area the original order is kept (rhythm 1 before rhythm 2 …).
    const rh = o.filter((id) => id.startsWith('rhythm-'));
    expect(rh).toEqual(LESSON_ORDER.filter((id) => id.startsWith('rhythm-')));
  });
});

describe('intake: Today and placement follow the order', () => {
  it("the top area's skills come first in Today's plan", () => {
    const w = weakestSkills({}, true, ['voice', 'time', 'pitch', 'memory', 'reading']);
    expect(domainOf(w[0])).toBe('voice');
    expect(priorityBoost(null, 'pitch')).toBe(0);
  });
  it('placement measures the top area first', () => {
    const s = placementSkills({ singing: false, priorities: ['time', 'reading', 'pitch', 'memory', 'voice'] });
    expect(['rhythm-dictation', 'rhythm-reading', 'tempo']).toContain(s[0]);
    expect(s.slice().sort()).toEqual(placementSkills({ singing: false }).slice().sort());
  });
});
