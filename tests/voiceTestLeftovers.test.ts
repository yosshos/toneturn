// 0.97 leftovers, voice: improvising (v-impro) is a section of "Find my level" — one measured take per step — and the
// first steps (v-first 4–7) are ✓ once a harder step that asks the same is passed (level test and placement probe).
import { describe, expect, it } from 'vitest';
import { DEFAULT_RANGE } from '../src/engine/vocal';
import { firstStepsStart, verdictOf, voiceStrands, withFirstSteps, VOICE_TEST_FAMILIES } from '../src/engine/voiceLevelTest';
import { IMPRO_LEVELS } from '../src/engine/voiceAudit7';
import { gradeScat } from '../src/engine/voiceGrade';
import { synthLine } from '../src/engine/voiceTime';
import { probeStarts, VOICE_FAMILIES } from '../src/engine/voiceFamilies';
import { withLadderFacts } from '../src/engine/ladderFacts';

describe('v-impro in the voice level test', () => {
  const strand = voiceStrands(DEFAULT_RANGE).find((s) => s.family === 'v-impro');
  it('is a section after the blues start, a rung per level, each a scat take one take can grade', () => {
    expect(VOICE_TEST_FAMILIES.indexOf('v-impro')).toBe(VOICE_TEST_FAMILIES.indexOf('v-jazz1') + 1);
    expect(strand).toBeTruthy();
    expect(strand!.rungs.map((r) => r.pos)).toEqual([1, 2, 3, 4]);
    expect(strand!.rungs.map((r) => r.item.scat!.mode)).toEqual(['trade', 'landing', 'scale', 'scale']);
  });
  it('other jazz scat stays out (guide tones over a whole form)', () => {
    const jz = voiceStrands(DEFAULT_RANGE).find((s) => s.family === 'v-jazz1')!;
    expect(jz.rungs.some((r) => r.item.kind === 'scat')).toBe(false);
  });
  it('one take of the pentatonic step is judged: inside the scale on the beat is clean, outside it is not', () => {
    const rung = strand!.rungs.find((r) => r.level === 2313)!;
    const it0 = rung.item;
    const b = 60 / it0.scat!.bpm;
    const good = [0, 4, 7, 4, 9, 0, 4, 0, 9, 0, 9, 0, 7, 2, 7, 2, 0, 4, 7, 4, 9, 0, 4, 0, 9, 0, 7, 2, 0, 4, 7, 0];
    const bad = good.map((pc) => (pc === 0 ? 1 : pc === 4 ? 5 : pc === 7 ? 6 : pc === 9 ? 10 : 11));
    const line = (pcs: number[]) => synthLine(pcs.map((pc, k) => ({ midi: 60 + pc, start: k * b, dur: b * 0.85 })));
    expect(verdictOf(gradeScat(it0, line(good), 0).grade.score, rung.pass)).toBe('clean');
    expect(verdictOf(gradeScat(it0, line(bad), 0).grade.score, rung.pass)).not.toBe('clean');
    expect(IMPRO_LEVELS.find((l) => l.level === 2313)!.pass).toBe(rung.pass);
  });
});

describe('the first steps after the level test', () => {
  const first = VOICE_FAMILIES.find((f) => f.id === 'v-first')!;
  it('nothing passed: nothing proved', () => {
    expect(firstStepsStart({})).toBeNull();
    expect(withFirstSteps({})).toEqual({});
  });
  it('a passed pitch step proves holding, sliding and matching (1–4); the rhythm needs a time step', () => {
    expect(firstStepsStart({ 'v-pitch': 2 })).toBe(5);
    expect(firstStepsStart({ 'v-pitch': 2, 'v-time': 2 })).toBe(7);
  });
  it('pitch, time and a song passed: every first step is ✓ (v-first 4–7 no longer stay to do)', () => {
    const s = withFirstSteps({ 'v-pitch': 3, 'v-time': 2, 'v-songs': 2 });
    expect(s['v-first']).toBe(first.refs.length + 1);
    const f = withLadderFacts({}, { families: ['v-first'], items: {}, order: 'fifths-up', start: s as never, vocalPassed: [], at: '2026-11-16T10:00:00Z' });
    for (const ref of first.refs) expect(f.tests?.[`vocal:${ref}`], `vocal:${ref}`).toBeDefined();
  });
  it('a higher saved start for v-first stays', () => {
    expect(withFirstSteps({ 'v-pitch': 2, 'v-first': 7 })['v-first']).toBe(7);
  });
});

describe('the placement probe', () => {
  it('a clear hold and echo: v-first 1–4; with the time item 1–6; with the song all seven', () => {
    expect(probeStarts({ hold: 0.9, echo: 0.9, time: 0.5, song: 0.5 })['v-first']).toBe(5);
    expect(probeStarts({ hold: 0.9, echo: 0.9, time: 0.9, song: 0.5 })['v-first']).toBe(7);
    expect(probeStarts({ hold: 0.9, echo: 0.9, time: 0.9, song: 0.9 })['v-first']).toBe(8);
    expect(probeStarts({ hold: 0.9, echo: 0.5, time: 0.9, song: 0.9 })['v-first']).toBeUndefined();
  });
});
