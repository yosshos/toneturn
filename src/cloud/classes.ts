// Teacher / class mode (needs sign-in). All reads and writes go through server functions.

import { supabase } from './cloud';

export interface Assignment {
  id: string;
  lessonId: string;
  dueOn: string | null;
  createdAt: string;
}
export interface StudentRow {
  userId: string;
  name: string;
  lessonsDone: number;
  weekXp: number;
  streak: number;
  lastActive: string | null;
  /** Per skill over the last 30 days: rated items and first-try correct. */
  skills: Record<string, { n: number; correct: number }>;
}
export interface TeachingClass {
  id: string;
  code: string;
  name: string;
  assignments: (Assignment & { done: number })[];
  students: StudentRow[];
}
export interface MemberClass {
  id: string;
  name: string;
  teacher: string;
  assignments: (Assignment & { done: boolean })[];
}
export interface MyClasses {
  teaching: TeachingClass[];
  memberOf: MemberClass[];
}

interface RawA {
  id: string;
  lesson_id: string;
  due_on: string | null;
  created_at: string;
}
const asA = (a: RawA) => ({ id: a.id, lessonId: a.lesson_id, dueOn: a.due_on, createdAt: a.created_at });

export function classesFromRaw(r: {
  teaching: { id: string; code: string; name: string; assignments: (RawA & { done: number })[]; students: { user_id: string; name: string; lessons_done: number; week_xp: number; streak: number; last_active: string | null; skills: Record<string, { n: number; correct: number }> }[] }[];
  member_of: { id: string; name: string; teacher: string; assignments: (RawA & { done: boolean })[] }[];
}): MyClasses {
  return {
    teaching: r.teaching.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      assignments: c.assignments.map((a) => ({ ...asA(a), done: Number(a.done) })),
      students: c.students.map((s) => ({ userId: s.user_id, name: s.name, lessonsDone: Number(s.lessons_done), weekXp: Number(s.week_xp), streak: Number(s.streak ?? 0), lastActive: s.last_active, skills: s.skills ?? {} })),
    })),
    memberOf: r.member_of.map((c) => ({ id: c.id, name: c.name, teacher: c.teacher, assignments: c.assignments.map((a) => ({ ...asA(a), done: !!a.done })) })),
  };
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = supabase();
  if (!sb) throw new Error('Cloud is not configured');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const myClasses = async () => classesFromRaw(await rpc('toneturn_my_classes'));
export const createClass = async (name: string) => (await rpc<{ id: string; code: string }[]>('toneturn_class_create', { p_name: name }))[0];
export const joinClass = (code: string) => rpc<string>('toneturn_class_join', { p_code: code });
export const leaveClass = (id: string) => rpc<void>('toneturn_class_leave', { p_class: id });
export const deleteClass = (id: string) => rpc<void>('toneturn_class_delete', { p_class: id });
export const assignLesson = (classId: string, lessonId: string, dueOn: string | null) => rpc<string>('toneturn_class_assign', { p_class: classId, p_lesson: lessonId, p_due: dueOn });
export const unassign = (id: string) => rpc<void>('toneturn_class_unassign', { p_assignment: id });

/** Open assignments for the Home card: not done yet, soonest due first. */
export function openAssignments(c: MyClasses) {
  return c.memberOf
    .flatMap((m) => m.assignments.filter((a) => !a.done).map((a) => ({ ...a, className: m.name })))
    .sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'));
}
