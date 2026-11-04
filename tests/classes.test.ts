import { describe, expect, it } from 'vitest';
import { classesFromRaw, openAssignments } from '../src/cloud/classes';

describe('class mode (client mapping)', () => {
  const raw = {
    teaching: [
      {
        id: 'c1',
        code: 'ABC234',
        name: 'Choir',
        assignments: [{ id: 'a1', lesson_id: 'degrees-135', due_on: '2026-11-08', created_at: '2026-11-05', done: 1 }],
        students: [{ user_id: 'u1', name: 'Sam', lessons_done: 3, week_xp: 40, streak: 2, last_active: '2026-11-05T10:00:00Z', skills: { degrees: { n: 2, correct: 1 } } }],
      },
    ],
    member_of: [
      {
        id: 'c2',
        name: 'Theory 1',
        teacher: 'Ms T',
        assignments: [
          { id: 'b2', lesson_id: 'runs', due_on: null, created_at: '2026-11-05', done: false },
          { id: 'b1', lesson_id: 'intervals', due_on: '2026-11-07', created_at: '2026-11-05', done: false },
          { id: 'b3', lesson_id: 'cadences', due_on: '2026-11-06', created_at: '2026-11-05', done: true },
        ],
      },
    ],
  };
  it('maps the server snapshot', () => {
    const c = classesFromRaw(raw);
    expect(c.teaching[0].students[0]).toMatchObject({ name: 'Sam', weekXp: 40, skills: { degrees: { n: 2, correct: 1 } } });
    expect(c.teaching[0].assignments[0]).toMatchObject({ lessonId: 'degrees-135', done: 1 });
  });
  it('Home shows open assignments only, soonest due first, undated last', () => {
    expect(openAssignments(classesFromRaw(raw)).map((a) => a.lessonId)).toEqual(['intervals', 'runs']);
  });
});
