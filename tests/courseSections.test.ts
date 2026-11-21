import { describe, expect, it } from 'vitest';
import { COURSE_SECTIONS } from '../src/engine/courseSections';
import { families } from '../src/engine/drills/plan';

// SPEC-COURSE-SECTIONS: every family of an instrument course is in exactly one section (the radar and the Skills map
// read the sections; a family left out would never count anywhere).
const INST = { keys: 'piano', guitar: 'guitar', bass: 'bass', drums: 'drums' } as const;
describe('course sections', () => {
  for (const [course, inst] of Object.entries(INST)) {
    it(`${course}: every family in exactly one section`, () => {
      const secs = COURSE_SECTIONS[course as keyof typeof INST]!;
      const ids = families(inst).map((f) => f.id);
      const missing = ids.filter((id) => !secs.some((s) => s.families.includes(id)));
      const twice = ids.filter((id) => secs.filter((s) => s.families.includes(id)).length > 1);
      expect({ missing, twice }).toEqual({ missing: [], twice: [] });
    });
  }
  it('piano: time is its own section, and scales / arpeggios / fingers sit inside technique', () => {
    const k = COURSE_SECTIONS.keys!;
    expect(k.find((s) => s.id === 'time')?.timing).toBe(true);
    expect(k.find((s) => s.id === 'technique')?.families).toEqual(expect.arrayContaining(['scales', 'arpeggios', 'fingers']));
  });
});
