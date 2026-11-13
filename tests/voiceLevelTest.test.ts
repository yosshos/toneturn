import { describe, expect, it } from 'vitest';
import { DEFAULT_RANGE } from '../src/engine/vocal';
import { savedVoiceStart, verdictOf, voiceStartState, voiceStrands, voiceStrandStart, voiceTake, VOICE_TEST_FAMILIES } from '../src/engine/voiceLevelTest';
import { placementOfCourse } from '../src/engine/placement';
import { catchUp } from '../src/engine/catchup';

describe('voice level test: sections of the course, one take per step', () => {
  const strands = voiceStrands(DEFAULT_RANGE);
  it('has a section per measured family, each a rising ladder of real levels', () => {
    expect(strands.map((s) => s.family)).toEqual(VOICE_TEST_FAMILIES.filter((f) => strands.some((s) => s.family === f)));
    expect(strands.length).toBeGreaterThanOrEqual(5);
    for (const s of strands) {
      expect(s.rungs.length).toBeGreaterThanOrEqual(2);
      expect(s.rungs.length).toBeLessThanOrEqual(6);
      for (let k = 1; k < s.rungs.length; k++) expect(s.rungs[k].pos).toBeGreaterThan(s.rungs[k - 1].pos);
    }
  });
  it('a miss moves on, a clean take climbs, "almost" gets one more take', () => {
    const s = strands[0];
    let st = voiceStartState(s);
    const at0 = st.at;
    st = voiceTake(st, s, 0.2, 0.7); // a miss goes down (or ends the section)
    expect(st.at).toBeLessThan(Math.max(at0, 0) + (at0 === 0 ? 0 : 1));
    if (st.at >= 0) st = voiceTake(st, s, 0.2, 0.7);
    expect(st.at).toBe(-1);
    expect(voiceStrandStart(s, st)).toBeNull();
    let up = voiceStartState(s);
    const first = up.at;
    up = voiceTake(up, s, 0.95, 0.7);
    expect(up.at).toBeGreaterThan(first);
    let al = voiceStartState(s);
    const at = al.at;
    al = voiceTake(al, s, 0.6, 0.7);
    expect(al.at).toBe(at);
    expect(verdictOf(0.6, 0.7)).toBe('almost');
  });
  it('the start is the level after the hardest clean one', () => {
    const s = strands[0];
    let st = voiceStartState(s);
    const r = s.rungs[st.at];
    st = voiceTake(st, s, 0.95, 0.7);
    st = voiceTake(st, s, 0.1, 0.7);
    expect(voiceStrandStart(s, st)).toBe(Math.min(s.size, r.pos + 1));
    expect(savedVoiceStart('v-songs', 4)).toBe(3); // a family with a level put in front counts it on reading
  });
});

describe('a saved level test and catching up belong to the course', () => {
  const old = { lesson: { placementSkills: ['degrees', 'instrument', 'timbre', 'expression'] as never[] } };
  it('an all-areas test from before does not come back in the keys or ear course', () => {
    expect(placementOfCourse(old, [])).toBeNull();
    expect(placementOfCourse(old, ['pitch', 'time', 'memory', 'reading'])).toBeNull();
    const ear = { lesson: { placementSkills: ['degrees', 'intervals'] as never[] } };
    expect(placementOfCourse(ear, ['pitch', 'time', 'memory', 'reading'])).toBe(ear);
  });
  it('an instrument course has nothing to catch up on in the ear placement', () => {
    expect(catchUp({ intake: null }, { lessons: {} }, []).unmeasured).toEqual([]);
    const ear = catchUp({ intake: null }, { lessons: {} }, ['pitch', 'time', 'memory', 'reading']).unmeasured;
    expect(ear).not.toContain('instrument');
    expect(ear).not.toContain('expression');
  });
});
