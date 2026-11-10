import { describe, expect, it } from 'vitest';
import { isMissingArg } from '../src/cloud/social';
import { courseLevel, courseLevels, courseOfResult, courseSetKinds, firstKind, forCourse, friendsInCourse, leagueWeekBounds, weeklyCourseXp, type ResultLike } from '../src/engine/courseSocial';
import { inCourse } from '../src/engine/courses';
import { stepCatalogue } from '../src/engine/path';
import type { Ratings } from '../src/engine/rating';
import { BADGES, badgeCourse, badgeInCourse } from '../src/engine/badges';

const at = '2026-11-10T10:00:00.000Z';
const res = (lessonId: string, o: Partial<ResultLike> = {}): ResultLike => ({ lessonId, completedAt: at, xp: 10, ...o });
const cat = stepCatalogue();
const techFor = (plays: string) => cat.find((s) => s.kind === 'tech' && s.forPlays?.length === 1 && s.forPlays[0] === plays) ?? cat.find((s) => s.kind === 'tech' && s.forPlays?.includes(plays))!;

describe('courseOfResult', () => {
  it('technique levels → their instrument course', () => {
    const piano = cat.find((s) => s.kind === 'tech' && s.forPlays?.includes('piano'))!;
    expect(courseOfResult(res(piano.id))).toBe('keys');
    expect(courseOfResult(res(techFor('bass').id))).toBe('bass');
    const gtr = cat.find((s) => s.kind === 'tech' && s.forPlays?.includes('guitar') && !s.forPlays.includes('bass'))!;
    expect(courseOfResult(res(gtr.id))).toBe('guitar');
  });
  it('vocal sessions and vocal path steps → voice, whatever course was active', () => {
    expect(courseOfResult(res('vocal-3', { course: 'ear' }))).toBe('voice');
    expect(courseOfResult(res('vocal-modes-2'))).toBe('voice');
    expect(courseOfResult(res('vocal:1'))).toBe('voice');
  });
  it('topics and lessons go through the step catalogue + inCourse', () => {
    const ear = cat.find((s) => s.kind === 'topic' && inCourse(s, 'ear'))!;
    expect(courseOfResult(res(ear.id))).toBe('ear');
    // 0.67: a result stored in the old Exams course counts for Ear.
    expect(courseOfResult(res(ear.id, { course: 'exam' }))).toBe('ear');
    expect(courseOfResult(res('practice-log', { course: 'exam' }))).toBe('ear');
    const sung = cat.find((s) => s.kind === 'topic' && inCourse(s, 'voice'));
    if (sung) expect(courseOfResult(res(sung.id))).toBe('voice');
    const lesson = cat.find((s) => s.kind === 'lesson' && inCourse(s, 'ear'))!;
    expect(courseOfResult(res(lesson.lesson!))).toBe('ear');
    expect(courseOfResult(res(lesson.id))).toBe('ear');
  });
  it('a generated topic session reads its items’ topic tags', () => {
    const ear = cat.find((s) => s.kind === 'topic' && inCourse(s, 'ear'))!;
    expect(courseOfResult(res('topic', { items: [{ tag: `${ear.id}:12345` }] }))).toBe('ear');
  });
  it('generic technique results use the stored course; unknown → ear', () => {
    expect(courseOfResult(res('technique', { course: 'guitar' }))).toBe('guitar');
    expect(courseOfResult(res('technique-test', { course: 'bass' }))).toBe('bass');
    expect(courseOfResult(res('log:piece', { course: 'keys' }))).toBe('keys');
    expect(courseOfResult(res('technique'))).toBe('ear');
    expect(courseOfResult(res('weekly-puzzle'))).toBe('ear');
  });
  it('content wins over a stored course that does not hold it', () => {
    expect(courseOfResult(res(techFor('bass').id, { course: 'ear' }))).toBe('bass');
  });
});

describe('weeklyCourseXp', () => {
  it('sums the league week per course, biggest first, skipping 0 and out-of-week results', () => {
    const { from, to } = leagueWeekBounds('2026-11-16T00:00:00.000Z');
    const h: ResultLike[] = [
      res('technique', { course: 'guitar', xp: 70 }),
      res('technique', { course: 'guitar', xp: 50 }),
      res('vocal-2', { xp: 30 }),
      res('intervals-1', { xp: 80, course: 'ear' }),
      res('technique', { course: 'bass', xp: 0 }),
      res('technique', { course: 'keys', xp: 99, completedAt: '2026-11-01T10:00:00.000Z' }),
      res('technique', { course: 'keys', xp: 99, completedAt: '2026-11-16T00:00:00.000Z' }),
    ];
    expect(weeklyCourseXp(h, from, to)).toEqual([
      { course: 'guitar', xp: 120 },
      { course: 'ear', xp: 80 },
      { course: 'voice', xp: 30 },
    ]);
  });
});

const sr = (r: number, n = 20) => ({ r, n, correct: n, recent: [] });
describe('courseLevel', () => {
  it('ear → the overall rating on the pp…ff scale; not measured → null', () => {
    expect(courseLevel('ear', {}).name).toBeNull();
    expect(courseLevel('ear', {}).i).toBe(-1);
    const ratings = { intervals: sr(1150), chords: sr(1150), degrees: sr(1150), cadences: sr(1150) } as Ratings;
    const l = courseLevel('ear', ratings);
    expect(l.name).toBe('mf');
    expect(l.next?.name).toBe('f');
    expect(l.into).toBeGreaterThan(0);
    expect(l.into).toBeLessThan(1);
  });
  it('an instrument course reads the instrument area; voice the voice area', () => {
    const ratings = { instrument: sr(1450), singing: sr(700) } as Ratings;
    expect(courseLevel('bass', ratings).name).toBe('ff');
    expect(courseLevel('bass', ratings).next).toBeNull();
    expect(courseLevel('voice', ratings).name).toBe('pp');
    expect(courseLevel('jazz', ratings).name).toBeNull();
    expect(courseLevels(['bass', 'voice', 'jazz'], ratings)).toEqual({ bass: 'ff', voice: 'pp' });
  });
});

describe('badge course tags', () => {
  it('every badge is tagged', () => {
    for (const b of BADGES) expect(b.course, b.id).toBeTruthy();
  });
  it('technique families → their instrument, vocal → voice, ear skills → ear, specials → general', () => {
    const byId = (id: string) => BADGES.find((b) => b.id === id)!;
    expect(byId('tech:scales:1').course).toBe('keys');
    expect(BADGES.find((b) => b.id.startsWith('tech:g-fretting'))!.course).toBe('guitar');
    expect(BADGES.find((b) => b.id.startsWith('tech:g-bass:'))!.course).toBe('bass');
    expect(byId('tech:g-bassist').course).toBe('bass');
    expect(byId('special:hat-trick').course).toBe('general');
    expect(BADGES.find((b) => b.cat === 'season')!.course).toBe('general');
    expect(byId('area:voice:bronze').course).toBe('voice');
    expect(byId('area:pitch:bronze').course).toBe('ear');
    expect(BADGES.find((b) => b.cat === 'skill' && b.group === 'singing')!.course).toBe('voice');
    expect(BADGES.find((b) => b.cat === 'skill' && b.group === 'intervals')!.course).toBe('ear');
    expect(badgeCourse({ id: 'x', cat: 'skill', group: 'theory' })).toEqual({ course: 'ear' });
    expect(badgeCourse({ id: 'x', cat: 'skill', group: 'cadences' })).toEqual({ course: 'ear', alsoIn: ['jazz'] });
    expect(BADGES.some((b) => (b.alsoIn as string[] | undefined)?.includes('exam') || (b.course as string) === 'exam')).toBe(false);
  });
  it('the course filter shows the course + general (+ shared ones)', () => {
    const guitar = BADGES.filter((b) => badgeInCourse(b, 'guitar'));
    expect(guitar.some((b) => b.id === 'special:hat-trick')).toBe(true);
    expect(guitar.some((b) => b.id === 'tech:scales:1')).toBe(false);
    expect(guitar.some((b) => b.id === 'tech:clean-10')).toBe(true);
    expect(guitar.some((b) => b.id === 'area:pitch:bronze')).toBe(false);
    expect(BADGES.filter((b) => badgeInCourse(b, 'ear')).some((b) => b.id === 'area:pitch:bronze')).toBe(true);
  });
});

describe('friendsInCourse', () => {
  const row = (name: string, relation: 'me' | 'friend' | 'incoming', course_levels?: Record<string, string> | null) => ({ name, relation, ...(course_levels !== undefined ? { course_levels } : {}) });
  it('me + friends who take the course, highest level first', () => {
    const rows = [row('Me', 'me', {}), row('Ann', 'friend', { bass: 'mp', ear: 'f' }), row('Bob', 'friend', { ear: 'mf' }), row('Cy', 'friend', { bass: 'ff' }), row('Req', 'incoming', { bass: 'ff' })];
    const v = friendsInCourse(rows, 'bass', 'mf');
    expect(v.known).toBe(true);
    expect(v.rows.map((r) => [r.name, r.level])).toEqual([
      ['Cy', 'ff'],
      ['Me', 'mf'],
      ['Ann', 'mp'],
    ]);
  });
  it('an older server (no course_levels at all) or friends who have not updated → known=false', () => {
    expect(friendsInCourse([row('Me', 'me'), row('Ann', 'friend')], 'ear', null).known).toBe(false);
    expect(friendsInCourse([row('Me', 'me', null), row('Ann', 'friend', null)], 'ear', null).known).toBe(false);
    const v = friendsInCourse([row('Me', 'me'), row('Ann', 'friend')], 'ear', 'p');
    expect(v.rows.map((r) => r.name)).toEqual(['Me']);
  });
  it('ignores level names it does not know', () => {
    expect(friendsInCourse([row('Ann', 'friend', { ear: 'fff' })], 'ear', null).rows[0].level).toBeNull();
  });
});

describe('courseSetKinds', () => {
  const all = ['mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'echo', 'beat', 'vocal-hold', 'choir'] as const;
  it('voice keeps the sung sets, ear drops them, instruments keep everything', () => {
    expect(courseSetKinds('voice', [...all])).toEqual(['degrees', 'intervals', 'echo', 'vocal-hold', 'choir']);
    expect(courseSetKinds('ear', [...all])).not.toContain('vocal-hold');
    expect(courseSetKinds('guitar', [...all])).toEqual([...all]);
    expect(courseSetKinds('jazz', ['mixed', 'chords', 'beat'])).toEqual(['mixed', 'chords']);
  });
  it('labelled lists: kept in order, default mixed else the first', () => {
    const v = forCourse('voice', [['mixed', 'M'], ['intervals', 'I'], ['vocal-hold', 'V']]);
    expect(v).toEqual([['intervals', 'I'], ['vocal-hold', 'V']]);
    expect(firstKind(v)).toBe('intervals');
    expect(firstKind(forCourse('ear', [['degrees', 'D'], ['mixed', 'M']]))).toBe('mixed');
  });
});

describe('profile sync against an older server', () => {
  it('recognises "no such argument" so the profile is saved without course levels', () => {
    expect(isMissingArg({ code: 'PGRST202', message: 'Could not find the function public.toneturn_set_profile(p_course_levels)' })).toBe(true);
    expect(isMissingArg({ message: 'nickname: taken' })).toBe(false);
  });
});
