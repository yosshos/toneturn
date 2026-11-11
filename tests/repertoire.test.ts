import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { techLevel } from '../src/engine/ladderFacts';
import { SONGBOOK } from '../src/content/songbook';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { bassStandardSpec } from '../src/engine/drills/bass';
import { REPERTOIRE, REP_TIERS, hasFirstStandard, parseRepLesson, repGoal, repLessonId, repRefs, repResult, repResults, repertoireFor, repLeadsFrom, type RepBest } from '../src/engine/repertoire';
import { isDrillWay, repDrills } from '../src/engine/repertoireDrills';
import type { CourseId } from '../src/engine/courses';

const COURSES = Object.keys(REPERTOIRE) as CourseId[];

describe('repertoire catalogue', () => {
  it('covers every course with all four tiers, and a standard in tier 3', () => {
    expect([...COURSES].sort()).toEqual(['bass', 'drums', 'ear', 'guitar', 'jazz', 'keys', 'voice']);
    for (const c of COURSES) {
      for (const t of REP_TIERS) expect(repertoireFor(c).filter((x) => x.tier === t.n).length, `${c} tier ${t.n}`).toBeGreaterThan(0);
      expect(repertoireFor(c).some((x) => x.tier === 3 && x.standard), c).toBe(true);
      // simple tunes never count as a standard
      expect(repertoireFor(c).filter((x) => x.tier <= 2 && x.standard), c).toEqual([]);
    }
  });
  it('ids are unique, server-safe, and lead somewhere real', () => {
    for (const c of COURSES) {
      const ids = repertoireFor(c).map((x) => x.id);
      expect(new Set(ids).size, c).toBe(ids.length);
      for (const it of repertoireFor(c)) {
        const lid = repLessonId(c, it.id);
        expect(lid).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(lid.length).toBeLessThanOrEqual(40);
        expect(parseRepLesson(lid)).toEqual({ course: c, id: it.id });
        if (it.leads?.to) {
          expect(ids, `${c}:${it.id} → ${it.leads.to}`).toContain(it.leads.to);
          expect(repLeadsFrom(c, it.leads.to).map((x) => x.id)).toContain(it.id);
        }
        expect(it.ways.length, `${c}:${it.id}`).toBeGreaterThan(0);
        expect(it.teaches.en.length).toBeGreaterThan(3);
        expect(it.teaches.he.length).toBeGreaterThan(3);
      }
    }
  });
  it('every song, standard, level and topic it opens exists', () => {
    for (const c of COURSES)
      for (const it of repertoireFor(c)) {
        const r = repRefs(it);
        for (const s of r.songs) expect(SONGBOOK.some((x) => x.id === s), `${c}:${it.id} song ${s}`).toBe(true);
        for (const s of r.standards) expect(STANDARD_CHANGES.some((x) => x.id === s), `${c}:${it.id} std ${s}`).toBe(true);
        for (const l of r.levels) expect(techLevel(l), `${c}:${it.id} level ${l}`).toBeDefined();
        for (const t of r.topics) expect(TOPIC_GEN[t.topic]?.levels.length ?? 0, `${c}:${it.id} topic ${t.topic}`).toBeGreaterThanOrEqual(t.level);
        for (const w of it.ways) if (w.k === 'bassStd') expect(bassStandardSpec(w.std), `${c}:${it.id} bass std ${w.std}`).not.toBeNull();
        // melodies only from the public-domain songbook; standards are chord-only charts
        if (it.legal === 'pd') expect(it.ref?.kind).toBe('song');
        if (it.legal === 'chords') expect(r.songs).toEqual([]);
      }
  });
  it('the measured drill ways build runnable drills', () => {
    for (const c of COURSES)
      for (const it of repertoireFor(c))
        for (const w of it.ways.filter(isDrillWay)) {
          const ds = repDrills(w, c);
          expect(ds.length, `${c}:${it.id} ${JSON.stringify(w)}`).toBeGreaterThan(0);
          for (const d of ds) expect(d.itemId).toBeTruthy();
        }
  });
  it('drums and voice open only their own kinds of practice', () => {
    for (const it of repertoireFor('drums')) for (const w of it.ways) expect(['level', 'chart']).toContain(w.k);
    for (const it of repertoireFor('voice')) for (const w of it.ways) expect(['sing', 'topic']).toContain(w.k);
  });
});

describe('repertoire results and the goal', () => {
  const learned = (ids: string[]): Record<string, RepBest> => Object.fromEntries(ids.map((id) => [id, { best: 0.9, plays: 1 }]));
  it('stores a result out of 10 and reads it back from lessons', () => {
    const r = repResult('keys', 'autumn', 0.84, 12, new Date('2026-11-11T10:00:00Z'));
    expect(r).toMatchObject({ lessonId: 'rep-keys-autumn', firstTry: 8, total: 10, course: 'keys' });
    const res = repResults({ 'rep-keys-autumn': { best: 8, completions: 2 } }, 'keys');
    expect(res.autumn).toEqual({ best: 0.8, plays: 2 });
    expect(hasFirstStandard('keys', res)).toBe(true);
    expect(hasFirstStandard('keys', repResults({ 'rep-keys-twinkle': { best: 10, completions: 1 } }, 'keys'))).toBe(false);
  });
  it('walks the road: 2 foundations, 2 progressions, then a standard', () => {
    let g = repGoal('keys', {});
    expect(g).toMatchObject({ id: 'first-standard', now: 0, target: 5 });
    expect(g.next?.tier).toBe(1);
    g = repGoal('keys', learned(['twinkle', 'saints']));
    expect(g.now).toBe(2);
    expect(g.next?.tier).toBe(2);
    g = repGoal('keys', learned(['twinkle', 'saints', 'blues-basic', 'turnarounds-f']));
    expect(g.now).toBe(4);
    expect(g.next?.standard).toBe(true);
    g = repGoal('keys', learned(['twinkle', 'saints', 'blues-basic', 'turnarounds-f', 'autumn']));
    expect(g.id).toBe('five-standards');
    expect(g.now).toBe(1);
  });
  it('a started item comes before a fresh one', () => {
    expect(repGoal('keys', { jingle: { best: 0.5, plays: 1 } }).next?.id).toBe('jingle');
  });
  it('every course has a goal and a next item from the first day', () => {
    for (const c of COURSES) {
      const g = repGoal(c, {});
      expect(g.next, c).toBeDefined();
      expect(g.title.he.length).toBeGreaterThan(3);
    }
  });
});
