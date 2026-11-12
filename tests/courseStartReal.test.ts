import { describe, expect, it } from 'vitest';
import { firstWinCourses, markRealDone, markRealOpened, markRealSeen, REAL_MUSIC, realMusicCard, realMusicFor, skipReal, SELF_REPORTS, type CourseStartMap, type CourseStartState } from '../src/engine/courseStart';
import { realDrills, tasteLesson } from '../src/engine/tasteLessons';
import { BADGE_BY_ID, BADGES, badgeInCourse, earnedBadges } from '../src/engine/badges';
import { resolveGlyph } from '../src/ui/BadgeArt';
import { badgeInputOf } from '../src/engine/rankBadges';
import { emptyProgress } from '../src/storage/progress';
import type { CourseId } from '../src/engine/courses';

const COURSES: CourseId[] = ['ear', 'keys', 'guitar', 'bass', 'drums', 'voice', 'jazz'];
const started: CourseStartState = { report: 'new', welcomeAt: 'a', tasteDoneAt: '2026-11-01T10:00:00Z', win: { kind: 'lesson', right: 3, total: 4, xp: 30 }, winSeenAt: '2026-11-01T10:01:00Z' };

describe('day 3: the first real-music moment (SPEC-COURSE-START)', () => {
  it('is offered from the third session, until taken, declined or a few sessions on', () => {
    expect(realMusicCard(started, 0)).toBeNull();
    expect(realMusicCard(started, 1)).toBe('offer');
    expect(realMusicCard(started, 5)).toBe('offer');
    expect(realMusicCard(started, 6)).toBeNull();
    expect(realMusicCard({ ...started, winSeenAt: undefined }, 1)).toBeNull();
    expect(realMusicCard({ legacy: true }, 3)).toBeNull();
    expect(realMusicCard(undefined, 3)).toBeNull();
  });

  it('opened → done (kept once) → result until closed; Not now hides the offer', () => {
    let m: CourseStartMap = { keys: started };
    m = markRealOpened(m, 'keys', 't1');
    expect(m.keys?.real?.at).toBe('t1');
    expect(realMusicCard(m.keys, 1)).toBe('offer');
    m = markRealDone(m, 'keys', { kind: 'drills', takes: 2, clean: 1, bars: 24, xp: 12 }, 't2');
    expect(realMusicCard(m.keys, 1)).toBe('result');
    // A replay never overwrites the first result.
    const again = markRealDone(m, 'keys', { kind: 'drills', takes: 9, clean: 9, bars: 99, xp: 40 }, 't3');
    expect(again.keys?.real?.win?.takes).toBe(2);
    m = markRealSeen(m, 'keys', 't4');
    expect(realMusicCard(m.keys, 3)).toBeNull();
    // The rest of the start state is untouched.
    expect(m.keys?.win).toEqual(started.win);
    const skipped = skipReal({ ear: started }, 'ear', 't5', 2, '2026-11-12');
    expect(realMusicCard(skipped.ear, 2, '2026-11-12')).toBeNull();
  });

  it('"Not now" on the day-3 card snoozes until the next session day, at most 3 times inside sessions 3–6', () => {
    let m: CourseStartMap = { ear: started };
    // session 3: offered, snoozed
    expect(realMusicCard(m.ear, 1, '2026-11-12')).toBe('offer');
    m = skipReal(m, 'ear', 't1', 1, '2026-11-12');
    expect(realMusicCard(m.ear, 1, '2026-11-12')).toBeNull();
    expect(realMusicCard(m.ear, 1, '2026-11-13')).toBeNull(); // no new session yet
    expect(realMusicCard(m.ear, 2, '2026-11-12')).toBeNull(); // a new session, the same day
    expect(realMusicCard(m.ear, 2, '2026-11-13')).toBe('offer'); // the next session day
    m = skipReal(m, 'ear', 't2', 2, '2026-11-13');
    expect(realMusicCard(m.ear, 3, '2026-11-14')).toBe('offer');
    m = skipReal(m, 'ear', 't3', 3, '2026-11-14');
    expect(m.ear?.real?.skips).toBe(3);
    expect(realMusicCard(m.ear, 4, '2026-11-15')).toBeNull(); // three snoozes: gone
    // the window still ends at session 6 for a player who never answered
    expect(realMusicCard(started, 6, '2026-11-20')).toBeNull();
    // a skip saved before snoozing existed comes back at the next session (it counts as one snooze)
    const old: CourseStartState = { ...started, real: { skippedAt: '2026-11-10T10:00:00Z' } };
    expect(realMusicCard(old, 2, '2026-11-12')).toBe('offer');
  });

  it('every course × report builds a measured session with the band (a whole chorus or form)', () => {
    for (const c of COURSES)
      for (const r of SELF_REPORTS) {
        const def = realMusicFor(c, r);
        expect(def.id).toBe(`${c}-${r}-real`);
        if (def.run.kind === 'lesson') {
          const l = tasteLesson(def, 7);
          expect(l.questions.length).toBeGreaterThanOrEqual(4);
        } else if (def.run.kind === 'vocal') {
          expect(c).toBe('voice');
          expect([1303, 1304]).toContain(def.run.level);
        } else {
          const ds = realDrills(def);
          expect(ds.length, def.id).toBeGreaterThan(0);
          for (const d of ds) {
            // The band is under every take (the drill's own band, or the moment's).
            expect(!!d.band || !!d.drums, `${def.id} ${d.itemId}`).toBe(true);
            const bars = d.beats / (d.meter || 4);
            // A whole chorus: 12 bars (blues), or the whole song form; the beginner guitar progression is one pass of I–IV–V–I.
            expect(bars, `${def.id} ${d.itemId}`).toBeGreaterThanOrEqual(def.id === 'guitar-new-real' ? 4 : 12);
          }
        }
      }
  });

  it('keys: the roots of a blues for a beginner, the F blues comped for the rest', () => {
    const roots = realDrills(REAL_MUSIC.keys.new)[0];
    expect(roots.notes).toHaveLength(12);
    expect(roots.notes.every((n) => n.hand === 'L')).toBe(true);
    const comp = realDrills(REAL_MUSIC.keys.well)[0];
    expect(comp.itemId).toContain('tpl:blues-f~shell~charleston');
    expect(comp.chart).toHaveLength(12);
  });
});

describe('"First session" badge (catalogue)', () => {
  it('one per course, in its course, drawn, earned by the measured first win', () => {
    for (const c of COURSES) {
      const b = BADGE_BY_ID[`special:first:${c}`];
      expect(b, c).toBeDefined();
      expect(b.course).toBe(c);
      expect(badgeInCourse(b, c)).toBe(true);
      expect(resolveGlyph(b).fallback).toBe(false);
    }
    expect(BADGES.filter((b) => b.id.startsWith('special:first:'))).toHaveLength(7);
    const got = earnedBadges({ today: '2026-11-11', firstWins: ['keys'] }).map((b) => b.id);
    expect(got).toContain('special:first:keys');
    expect(got).not.toContain('special:first:ear');
  });

  it('first wins come from the course-start state, never for migrated courses; the input carries them', () => {
    const m: CourseStartMap = { keys: started, ear: { legacy: true, win: started.win }, bass: { report: 'bit' } };
    expect(firstWinCourses(m)).toEqual(['keys']);
    expect(firstWinCourses(undefined)).toEqual([]);
    const x = badgeInputOf(emptyProgress(), new Date('2026-11-11T12:00:00Z'), undefined, { firstWins: ['keys'] });
    expect(x.firstWins).toEqual(['keys']);
  });
});
