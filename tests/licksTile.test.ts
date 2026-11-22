import { describe, expect, it } from 'vitest';
import { legacyLicksHash, licksHash, licksSectionOf, LICKS_SECTIONS } from '../src/ui/licksHub';
import { lickShareCard, lickShareText } from '../src/ui/LickShare';
import { COURSE_ROWS, courseRows } from '../src/ui/courseRows';
import { PRACTICE_GROUPS } from '../src/ui/Arcade';
import { sectionOf } from '../src/ui/Sidebar';

// The Licks tile (owner 2026-11-22, SPEC-DAILY-WORKOUT §6.2): Encore moved inside Licks.
describe('Licks tile', () => {
  it('three sections, each with its own address', () => {
    expect(LICKS_SECTIONS).toEqual(['library', 'mine', 'challenges']);
    expect(LICKS_SECTIONS.map(licksHash)).toEqual(['/licks', '/licks/mine', '/licks/challenges']);
    for (const s of LICKS_SECTIONS) expect(licksSectionOf(`#${licksHash(s)}`)).toBe(s);
  });
  it('old Encore homes land on their section; deeper Encore screens keep their addresses', () => {
    expect(legacyLicksHash('#/encore')).toBe('/licks/mine');
    expect(legacyLicksHash('#/encore/')).toBe('/licks/mine');
    expect(legacyLicksHash('#encore')).toBe('/licks/mine');
    expect(legacyLicksHash('#/challenges')).toBe('/licks/challenges');
    expect(licksSectionOf('#/encore')).toBe('mine');
    expect(licksSectionOf('#/challenges')).toBe('challenges');
    for (const h of ['#/encore/plan/x', '#/encore/run/x~0~R', '#/encore/new?take=t', '#/encore/library', '#/challenges/p/ABCDEFGH', '#/challenges/gifts', '#/challenges/review', '#/licks', '#/licks/mine', '#/arcade'])
      expect(legacyLicksHash(h), h).toBeNull();
  });
  it('one Licks tile on Practice, no Encore tile', () => {
    for (const c of ['keys', 'guitar', 'bass', 'voice'] as const) {
      expect(COURSE_ROWS[c]).toContain('licks');
      expect(COURSE_ROWS[c]).not.toContain('encore');
    }
    expect(PRACTICE_GROUPS.flatMap((g) => g.items)).not.toContain('encore');
    // jazz rows still follow Technique and Licks
    expect(courseRows('keys', false, 'on').slice(0, 4)).toEqual(['drills', 'licks', 'charts', 'improv']);
  });
  it('the sidebar has no Encore item; Encore and challenge screens light Practice', () => {
    expect(sectionOf('encore')).toBe('arcade');
    expect(sectionOf('challenges')).toBe('arcade');
    expect(sectionOf('licks')).toBe('arcade');
  });
  it('share after a clean tempo: the lick, the key and the tempo', () => {
    const info = { title: 'Bebop line', key: 'E♭', bpm: 132, drill: { notes: [{ pitch: 63, beat: 0, dur: 0.5, hand: 'R' as const }, { pitch: 65, beat: 0.5, dur: 0.5, hand: 'R' as const }], beats: 4, meter: 4 }, by: 'Noa', level: 2 };
    expect(lickShareText(info, 'he')).toContain('♩132');
    expect(lickShareText(info, 'he')).toContain('E♭');
    expect(lickShareText(info, 'en')).toContain('Bebop line');
    const svg = lickShareCard(info, 'en');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('E♭ · ♩132');
    expect(svg).toContain('Bebop line');
    expect(svg).not.toContain('Encore challenge');
    expect(lickShareCard(info, 'he')).toContain('ליק בטמפו');
  });
});
