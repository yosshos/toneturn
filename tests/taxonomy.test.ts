import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import '../src/engine/basics';
import { LESSON_ORDER, makeLesson, questionSkill } from '../src/engine/lesson';
import { LADDERS, PLACEMENT_DERIVED } from '../src/engine/placement';
import { DOMAINS, SKILLS } from '../src/engine/rating';
import { questionTags, SUB_BY_ID, SUB_SKILLS, TOPIC_TAGS } from '../src/engine/taxonomy';

const check = (where: string, q: Parameters<typeof questionTags>[0]) => {
  const tags = questionTags(q);
  expect(tags.length, where).toBeGreaterThan(0);
  expect(tags.length, where).toBeLessThanOrEqual(3);
  expect(tags[0].skill, where).toBe(questionSkill(q));
  expect(tags[0].w, where).toBeGreaterThanOrEqual(0.5);
  expect(Math.abs(tags.reduce((a, t) => a + t.w, 0) - 1), where).toBeLessThan(0.011);
  expect(new Set(tags.map((t) => t.skill)).size, where).toBe(tags.length);
  for (const t of tags) {
    expect(SUB_BY_ID[t.sub], `${where} ${t.sub}`).toBeTruthy();
    expect(SUB_BY_ID[t.sub].skill, `${where} ${t.sub}`).toBe(t.skill);
  }
  return tags;
};

// Sub-skills fed only by events outside question items (vocal studio, Perform, games).
const EVENT_SOURCED = ['singing/harmony', 'technique/control', 'technique/vibrato', 'agility/ornaments', 'sight/sing', 'improv/play', 'timing/precision', 'instrument/piano-tech', 'instrument/guitar-tech', 'instrument/bass-tech', 'instrument/drum-tech', 'improv/vocab', 'dictation/transcribe'];

describe('exercise taxonomy (spec AD)', () => {
  it('seven domains (0.38: Instrument & sound) hold every skill exactly once', () => {
    expect(DOMAINS).toHaveLength(7);
    const all = DOMAINS.flatMap((d) => d.skills);
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all)).toEqual(new Set(SKILLS));
  });
  it('every topic is tagged, every tag vector is well formed, every sub-skill is reachable', () => {
    const reached = new Set<string>(EVENT_SOURCED);
    for (const [topic, T] of Object.entries(TOPIC_GEN)) {
      expect(TOPIC_TAGS[topic], topic).toBeTruthy();
      for (let level = 1; level <= T.levels.length; level++) {
        const t = TOPIC_TAGS[topic];
        const tags = typeof t === 'function' ? t(level) : t;
        expect(tags[0].skill, `${topic} L${level}: tag primary = rated skill`).toBe(questionSkill(T.gen(5, level, 'x')));
      }
      for (let level = 1; level <= T.levels.length; level++)
        for (let s = 1; s <= 6; s++) check(`${topic} L${level}`, T.gen(s * 97, level, 'q')).forEach((t) => reached.add(t.sub));
    }
    for (const id of LESSON_ORDER) for (const q of makeLesson(id, 7).questions) check(`${id}:${q.id}`, q).forEach((t) => reached.add(t.sub));
    for (const [k, ladder] of Object.entries(LADDERS)) ladder!.forEach((r, i) => check(`ladder ${k}#${i}`, r.make(11, `p:${k}:${i + 1}:1`)).forEach((t) => reached.add(t.sub)));
    const missing = SUB_SKILLS.map((s) => s.id).filter((id) => !reached.has(id));
    expect(missing).toEqual([]);
  });
  it('every skill has a Find-my-level ladder whose rungs rise', () => {
    for (const k of SKILLS) {
      if (PLACEMENT_DERIVED[k]) continue;
      const l = LADDERS[k];
      expect(l?.length, k).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < l!.length; i++) expect(l![i].difficulty, `${k} rung ${i + 1}`).toBeGreaterThan(l![i - 1].difficulty);
    }
  });
  it('within a sub-skill, a topic\'s levels never get easier', () => {
    for (const [topic, T] of Object.entries(TOPIC_GEN)) {
      const last = new Map<string, number>();
      for (let level = 1; level <= T.levels.length; level++) {
        const q = T.gen(12345, level, 'q');
        const sub = questionTags(q)[0].sub;
        const prev = last.get(sub);
        if (prev !== undefined) expect(q.difficulty, `${topic} L${level} (${sub})`).toBeGreaterThanOrEqual(prev);
        last.set(sub, q.difficulty);
      }
    }
  });
});

import { foldRatings, rate, type RatingEvent } from '../src/engine/rating';
import { foldSubs } from '../src/engine/taxonomy';

describe('multi-skill credit (spec AD §3.2)', () => {
  const at = (i: number) => `2026-11-06T10:00:${String(i).padStart(2, '0')}.000Z`;
  it('a single tag is exactly the classic update', () => {
    const e: RatingEvent = { id: 'a', skill: 'degrees', difficulty: 1100, correct: true, tags: [{ skill: 'degrees', sub: 'degrees/diatonic', w: 1 }], at: at(1) };
    expect(foldRatings([e]).degrees).toEqual(rate(undefined, e));
  });
  it('success spreads by weight; a miss leans on the weaker skill', () => {
    // Strong in degrees, weak in note names.
    const warm: RatingEvent[] = [
      { id: 'p1', skill: 'degrees', difficulty: 1300, correct: true, set: 1300, at: at(1) },
      { id: 'p2', skill: 'notes', difficulty: 900, correct: true, set: 900, at: at(2) },
      { id: 'p3', skill: 'transpose', difficulty: 1100, correct: true, set: 1100, at: at(3) },
    ];
    const tags = [
      { skill: 'transpose' as const, sub: 'transpose/pitch', w: 0.6 },
      { skill: 'degrees' as const, sub: 'degrees/diatonic', w: 0.25 },
      { skill: 'notes' as const, sub: 'notes/names', w: 0.15 },
    ];
    const before = foldRatings(warm);
    const miss = foldRatings([...warm, { id: 'm', skill: 'transpose', difficulty: 1100, correct: false, tags, at: at(4) }]);
    const dDeg = miss.degrees!.r - before.degrees!.r;
    const dNotes = miss.notes!.r - before.notes!.r;
    expect(miss.transpose!.r).toBeLessThan(before.transpose!.r);
    expect(dNotes).toBeLessThan(0);
    // Note names weigh less (0.15 vs 0.25) but are far weaker, so they take more of the blame per weight.
    expect(dNotes / 0.15).toBeLessThan(dDeg / 0.25);
    const hit = foldRatings([...warm, { id: 'h', skill: 'transpose', difficulty: 1100, correct: true, tags, at: at(4) }]);
    expect(hit.transpose!.r - before.transpose!.r).toBeGreaterThan(hit.degrees!.r - before.degrees!.r);
  });
  it('sub-skills keep an accuracy average per sub-skill', () => {
    const subs = foldSubs([
      { id: '1', skill: 'expression', correct: true, tags: [{ skill: 'expression', sub: 'expression/dynamics', w: 1 }], at: at(1) },
      { id: '2', skill: 'expression', correct: false, tags: [{ skill: 'expression', sub: 'expression/dynamics', w: 1 }], at: at(2) },
      { id: '3', skill: 'meter', correct: true, at: at(3) },
    ]);
    expect(subs['expression/dynamics'].n).toBe(2);
    expect(subs['expression/dynamics'].ewma).toBeCloseTo(0.8);
    expect(subs['meter/count'].n).toBe(1);
  });
});
