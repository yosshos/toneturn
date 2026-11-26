import { describe, expect, it } from 'vitest';
import { dueText, itemLine, knownAdult, planClassPush, planDueReminder, refParts, STUDENT_CAP, type ClassItem } from '../supabase/functions/_shared/classPush';

// 2026-11-26 17:00 in Jerusalem (UTC+2) = 15:00 UTC
const NOW = new Date('2026-11-26T15:00:00Z');
const ago = (min: number) => new Date(NOW.getTime() - min * 60000).toISOString();
const assign = (id: number, min: number, extra: Partial<ClassItem> = {}): ClassItem => ({ id, role: 'student', kind: 'assign', at: ago(min), upd: ago(min), class: 'c1', akind: 'drill', ref: 'drill:scales-3@7/10', due: '2026-11-27', ...extra });
const base = { now: NOW, tz: 'Asia/Jerusalem', lang: 'he' as const, birthYear: 1980 };

describe('class push planner (SPEC-CLASS-NOTIFICATIONS phase 1)', () => {
  it('reads drill refs and relative due days', () => {
    expect(refParts('drill:scales-3@7/10')).toEqual({ key: 7, minutes: 10 });
    expect(refParts('drill:scales-3@10')).toEqual({ key: 10, minutes: null });
    expect(refParts('drill:scales-3/15')).toEqual({ key: null, minutes: 15 });
    expect(refParts('drill:scales-3')).toEqual({ key: null, minutes: null });
    expect(dueText('2026-11-27', '2026-11-26', 'he')).toBe('עד מחר');
    expect(dueText('2026-11-26', '2026-11-26', 'he')).toBe('עד היום');
    expect(dueText('2026-11-25', '2026-11-26', 'he')).toBeNull();
    expect(dueText('2026-12-03', '2026-11-26', 'he')).toBe('עד 3.12');
    expect(itemLine(assign(1, 0), '2026-11-26', 'he')).toBe('תרגיל טכניקה · בסולם G · 10 דק׳ · עד מחר');
    // a chart ref is never parsed for a key
    expect(itemLine({ akind: 'chart', ref: 'chart~x@3/4', due: null, minutes: null }, '2026-11-26', 'he')).toBe('מהלך אקורדים');
  });

  it('waits for a burst to settle, then sends ONE push for all of it', () => {
    const young = planClassPush({ ...base, items: [assign(1, 2), assign(2, 1)] });
    expect(young.pushes).toHaveLength(0);
    const settled = planClassPush({ ...base, items: [assign(1, 5), assign(2, 4), assign(3, 3)] });
    expect(settled.pushes).toHaveLength(1);
    expect(settled.pushes[0].ids).toEqual([1, 2, 3]);
    expect(settled.pushes[0].title).toBe('3 משימות חדשות מהמורה');
    expect(settled.pushes[0].body).toBe('הקרובה: עד מחר');
    // a long trickle still goes out after the max wait
    expect(planClassPush({ ...base, items: [assign(1, 11), assign(2, 0)] }).pushes).toHaveLength(1);
  });

  it('builds the text from fixed strings only, and no details for a user not known to be an adult', () => {
    const one = planClassPush({ ...base, items: [assign(1, 5)] }).pushes[0];
    expect(one.title).toBe('משימה חדשה מהמורה');
    expect(one.body).toBe('תרגיל טכניקה · בסולם G · 10 דק׳ · עד מחר');
    for (const birthYear of [null, 2015, 2010]) {
      const p = planClassPush({ ...base, birthYear, items: [assign(1, 5)] }).pushes[0];
      expect(p.title).toBe('יש עדכון מהמורה');
      expect(p.body).toBe('לחיצה פותחת את הכיתה');
    }
    expect(knownAdult(2007, NOW)).toBe(true);
    expect(knownAdult(2008, NOW)).toBe(false);
  });

  it("an overdue assignment pushes without a due day (owner Q7)", () => {
    const p = planClassPush({ ...base, items: [assign(1, 5, { due: '2026-11-20' })] }).pushes[0];
    expect(p.body).toBe('תרגיל טכניקה · בסולם G · 10 דק׳');
  });

  it('feedback: a reply alone, and mixed with a new assignment', () => {
    const fb: ClassItem = { id: 9, role: 'student', kind: 'feedback', at: ago(5), upd: ago(4), class: 'c1', akind: 'drill', ref: 'drill:scales-3@0/10' };
    expect(planClassPush({ ...base, items: [fb] }).pushes[0]).toMatchObject({ title: 'המורה הגיב על ההגשה שלך', body: 'תרגיל טכניקה · בסולם C · 10 דק׳' });
    expect(planClassPush({ ...base, items: [fb, assign(1, 5)] }).pushes[0]).toMatchObject({ title: 'עדכונים מהמורה', body: 'משימה חדשה · תגובה על הגשה' });
    // an edit just now (upd) holds it a little longer
    expect(planClassPush({ ...base, items: [{ ...fb, upd: ago(1) }] }).pushes).toHaveLength(0);
  });

  it('respects quiet hours, the daily cap and the switches', () => {
    const night = new Date('2026-11-26T21:30:00Z'); // 23:30 local
    expect(planClassPush({ ...base, now: night, items: [assign(1, 300)] }).pushes).toHaveLength(0);
    expect(planClassPush({ ...base, sent: { student: STUDENT_CAP }, items: [assign(1, 5)] }).pushes).toHaveLength(0);
    const off = planClassPush({ ...base, notify: { classNew: false }, items: [assign(1, 5)] });
    expect(off.pushes).toHaveLength(0);
    expect(off.drop).toEqual([{ role: 'student', ids: [1] }]);
  });

  it("the teacher's digest: only at the teacher's hour, counts only, once", () => {
    const sub = (id: number, student: string, ungraded: boolean, assignment = `as${id}`): ClassItem => ({ id, role: 'teacher', kind: 'submission', at: ago(60), class: 'c1', student, ungraded, akind: 'drill', assignment });
    const items = [sub(1, 'a', true), sub(2, 'a', false), sub(3, 'b', true), sub(4, 'c', true)];
    // one student's repeated takes of one assignment count once (the newest decides)
    const repeats = [sub(10, 'a', true, 'x'), sub(11, 'a', true, 'x'), sub(12, 'a', false, 'x')];
    expect(planClassPush({ ...base, digestHour: 17, items: repeats }).pushes[0].body).toBe('הגשה אחת מתלמיד אחד · כולן נבדקו');
    expect(planClassPush({ ...base, items }).pushes).toHaveLength(0); // 17:00, default hour 18
    const at18 = new Date('2026-11-26T16:05:00Z');
    const d = planClassPush({ ...base, now: at18, items }).pushes[0];
    expect(d).toMatchObject({ role: 'teacher', title: 'הגשות חדשות בכיתה', body: '4 הגשות מ־3 תלמידים · 3 מחכות לבדיקה', ids: [1, 2, 3, 4] });
    expect(planClassPush({ ...base, now: at18, sent: { teacher: 1 }, items }).pushes).toHaveLength(0);
    expect(planClassPush({ ...base, digestHour: 17, items }).pushes).toHaveLength(1);
    // the teacher's own hour goes out even inside quiet hours
    expect(planClassPush({ ...base, now: new Date('2026-11-26T21:10:00Z'), digestHour: 23, items }).pushes).toHaveLength(1);
    expect(planClassPush({ ...base, notify: { classDigest: false }, items }).drop).toEqual([{ role: 'teacher', ids: [1, 2, 3, 4] }]);
  });

  it('A2: tomorrow without a streak, merged with the practice reminder when both go out', () => {
    const items = [{ assignment: 'a1', akind: 'drill', ref: 'drill:scales-3@7/10', due: '2026-11-27' }];
    const r = planDueReminder({ items, now: NOW, lang: 'he', birthYear: 1980, today: '2026-11-26' });
    expect(r).toEqual({ title: 'משימה מהמורה עד מחר', body: 'תרגיל טכניקה · בסולם G · 10 דק׳', assignments: ['a1'] });
    const m = planDueReminder({ items, now: NOW, lang: 'he', birthYear: 1980, today: '2026-11-26', streak: 4 });
    expect(m?.body).toBe('תרגיל טכניקה · בסולם G · 10 דק׳. גם התוכנית של היום מחכה (4 ימי אימון ברצף).');
    expect(planDueReminder({ items, now: NOW, lang: 'he', birthYear: null, today: '2026-11-26' })?.body).toBe('לחיצה פותחת את הכיתה');
    expect(planDueReminder({ items, now: NOW, lang: 'he', notify: { classDue: false }, today: '2026-11-26' })).toBeNull();
    expect(planDueReminder({ items, now: NOW, lang: 'he', sent: { student: STUDENT_CAP }, today: '2026-11-26' })).toBeNull();
  });
});
