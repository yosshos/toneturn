import { describe, expect, it } from 'vitest';
import { ladderIndex, placementUnlocks, recommendFor, SKILL_LADDER, topicProgress, TOPICS } from '../src/engine/recommend';
import { LESSON_ORDER, makeLesson, type LessonId } from '../src/engine/lesson';
import { ratingHistory, trendDelta, type RatingEvent } from '../src/engine/rating';
import { keysGiveAway } from '../src/game/content';
import { adaptPlacement, placementLesson } from '../src/engine/adaptive';
import { createSession, grade, newTurn, advance } from '../src/engine/session';
import { applyResult, emptyProgress, ratingsOf, resultFromSession } from '../src/storage/progress';

const R = (r: number) => ({ r, n: 6, correct: 4, recent: [] });

describe('level-matched recommendations (Skill Map → practice)', () => {
  it('the rung follows the rating band', () => {
    expect(ladderIndex('rhythm-dictation', null)).toBe(0);
    expect(ladderIndex('rhythm-dictation', 850)).toBe(0); // beginner
    expect(ladderIndex('rhythm-dictation', 1000)).toBe(2); // developing → R3
    expect(ladderIndex('rhythm-dictation', 1200)).toBe(5); // solid → R6
    expect(ladderIndex('rhythm-dictation', 1400)).toBe(7); // advanced → R8
  });
  it('a stronger player is sent to harder lessons; mastered rungs are skipped', () => {
    const none = () => false;
    expect(recommendFor('chords', { chords: R(850) }, none)).toEqual({ kind: 'lesson', lessonId: 'major-minor' });
    expect(recommendFor('chords', { chords: R(1350) }, none)).toEqual({ kind: 'lesson', lessonId: 'jazz-1' });
    expect(recommendFor('degrees', { degrees: R(1000) }, (id) => id === 'degrees-135')).toEqual({ kind: 'lesson', lessonId: 'notes-degrees' });
    expect(recommendFor('rhythm', {}, none)).toEqual({ kind: 'rhythm-game' });
  });
  it('every ladder lesson exists on the path', () => {
    for (const l of Object.values(SKILL_LADDER)) for (const id of l!) expect(LESSON_ORDER).toContain(id);
  });
  it('placement opens the path up to the player’s level per skill', () => {
    const u = placementUnlocks({ 'rhythm-dictation': R(1200), chords: R(850) });
    expect(u).toEqual(expect.arrayContaining(['rhythm-r1', 'rhythm-r6', 'major-minor']));
    expect(u).not.toContain('rhythm-r7');
    expect(u).not.toContain('inversions');
  });
  it('a finished placement stores unlocks in progress', () => {
    const l = placementLesson(3);
    let s = newTurn(createSession(l), 'listening');
    // Right answers all the way: every skill climbs its ladder (rhythm reading by answer key, as tapped).
    for (let g = 0; g < 200; g++) {
      [s] = grade(s, s.turn, s.index, s.lesson.questions[s.index].answer, 'buttons');
      const next = adaptPlacement(s, 3);
      s = { ...s, lesson: { ...s.lesson, questions: next }, records: next.map((_, i) => s.records[i] ?? { attempts: [], outcome: 'pending', xp: 0, unclear: 0 }) };
      if (next.length === s.index + 1) break;
      s = newTurn(advance(s), 'listening');
    }
    s = advance(s);
    const p = applyResult(emptyProgress(), resultFromSession(s, 'P', new Date()), new Date());
    expect(Object.keys(ratingsOf(p)).length).toBeGreaterThanOrEqual(10);
    expect(ratingsOf(p).chords!.r).toBeGreaterThan(1600); // set from the top of the ladder, not nudged
    expect(p.placementUnlocks!.length).toBeGreaterThan(3);
    expect(p.xp).toBe(s.lesson.questions.length * 5);
  });
});

describe('topics: done X of Y', () => {
  it('every path lesson belongs to exactly one topic', () => {
    const all = TOPICS.flatMap((t) => t.lessons);
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all)).toEqual(new Set(LESSON_ORDER));
  });
  it('counts finished lessons per topic', () => {
    const done = new Set<LessonId>(['rhythm-r1', 'rhythm-r2', 'intervals']);
    const rows = topicProgress((id) => done.has(id));
    expect(rows.find((r) => r.id === 'rhythm')).toEqual({ id: 'rhythm', done: 2, total: 8 });
    expect(rows.find((r) => r.id === 'intervals')).toEqual({ id: 'intervals', done: 1, total: 2 });
  });
});

describe('keyboard: no lit keys that give the answer away', () => {
  it('listening questions hide them until answered; singing from a degree / name keeps them', () => {
    for (const id of LESSON_ORDER) {
      for (const q of makeLesson(id, 4).questions) {
        const performance = (q.kind === 'sing' && q.promptBy !== 'echo') || q.kind === 'sing-seq' || (q.kind === 'sing-run' && q.prompt === 'told');
        expect(keysGiveAway(q), `${id} ${q.kind}`).toBe(!performance);
      }
    }
  });
});

describe('skill trends', () => {
  const ev = (i: number, day: string, correct: boolean): RatingEvent => ({ id: `e${i}`, skill: 'chords', difficulty: 1100, correct, at: `${day}T10:0${i % 10}:00Z` });
  it('one point per day, rising with right answers, falling with misses', () => {
    const events = [ev(1, '2026-11-01', true), ev(2, '2026-11-01', true), ev(3, '2026-11-02', true), ev(4, '2026-11-03', false), ev(5, '2026-11-03', false)];
    const pts = ratingHistory(events, 'chords');
    expect(pts.map((p) => p.day)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(pts[1].r).toBeGreaterThan(pts[0].r);
    expect(pts[2].r).toBeLessThan(pts[1].r);
    expect(pts[2].n).toBe(5);
    expect(trendDelta(pts)).toBe(pts[2].r - pts[0].r);
    expect(trendDelta(pts.slice(0, 1))).toBeNull();
    expect(ratingHistory(events, 'degrees')).toEqual([]);
  });
});

describe('overall rating (spec L)', async () => {
  const { overallRating, ratingChange, overallHistory, peakOf } = await import('../src/engine/rating');
  const S = (r: number, n: number) => ({ r, n, correct: 0, recent: [] });
  it('confidence-weighted: a barely measured skill hardly moves it; provisional until 4 skills and 30 answers', () => {
    const o = overallRating({ chords: S(1300, 12), degrees: S(1300, 12) })!;
    expect(o.r).toBe(1300);
    expect(o.provisional).toBe(true);
    const lucky = overallRating({ chords: S(1300, 12), degrees: S(1300, 12), intervals: S(1500, 1) })!;
    expect(lucky.r).toBeLessThan(1320);
    const full = overallRating({ chords: S(1100, 12), degrees: S(1100, 12), notes: S(1100, 12), cadences: S(1100, 12) })!;
    expect(full.provisional).toBe(false);
    expect(overallRating({})).toBeNull();
  });
  it('game-only axes count half', () => {
    const a = overallRating({ chords: S(1000, 12), timing: S(1400, 12) })!;
    const b = overallRating({ chords: S(1000, 12), degrees: S(1400, 12) })!;
    expect(a.r).toBeLessThan(b.r);
  });
  it('session change: overall from → to, touched skills only, bands reached', () => {
    const before = { chords: S(1080, 10), degrees: S(1000, 5) };
    const after = { chords: S(1120, 12), degrees: S(1000, 5) };
    const c = ratingChange(before, after);
    expect(c.skills.map((s) => s.skill)).toEqual(['chords']);
    expect(c.skills[0]).toMatchObject({ from: 1080, to: 1120, answers: 2 });
    expect(c.bandsReached).toEqual([{ skill: 'chords', band: 'solid' }]);
    expect(c.overall!.to).toBeGreaterThan(c.overall!.from!);
  });
  it('history and peak', () => {
    const ev = (i: number, day: string, ok: boolean) => ({ id: `x${i}`, skill: 'chords' as const, difficulty: 1100, correct: ok, at: `${day}T10:0${i}:00Z` });
    const h = overallHistory([ev(1, '2026-11-01', true), ev(2, '2026-11-02', true), ev(3, '2026-11-03', false)]);
    expect(h).toHaveLength(3);
    expect(peakOf(h)).toBe(h[1].r);
  });
});
