// A stand-in for the teacher-loop RPCs (dev builds only, localStorage tt.mockTeacher = 1): one class "demo-class"
// where this device is both the teacher and a student. The e2e suite and local checks of the phrase assignment flow
// use it; production never loads this module (teacher.ts imports it only when teacherMockOn()).

type Row = Record<string, unknown>;
interface Db {
  assignments: Row[];
  submissions: Row[];
}
const KEY = 'tt.mockTeacher.db';
const load = (): Db => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Db | null;
    return o ?? { assignments: [], submissions: [] };
  } catch {
    return { assignments: [], submissions: [] };
  }
};
const save = (d: Db) => localStorage.setItem(KEY, JSON.stringify(d));
const id = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const MOCK_CLASS = 'demo-class';

export async function mockTeacherRpc(fn: string, a: Record<string, unknown>): Promise<unknown> {
  const d = load();
  switch (fn) {
    case 'toneturn_class_assign_item': {
      const row = { id: id(), class: a.p_class === MOCK_CLASS ? 'Demo' : String(a.p_class), kind: a.p_kind, lesson_id: a.p_kind === 'lesson' ? a.p_lesson : a.p_kind, ref: a.p_ref, due_on: a.p_due, strictness: a.p_strict ?? 'moderate', target_bpm: a.p_bpm, note: a.p_note, created_at: new Date().toISOString() };
      if (typeof row.ref === 'string' && row.ref.length > 2000 && row.kind !== 'phrase') throw new Error('ref too long');
      d.assignments.push(row);
      save(d);
      return row.id;
    }
    case 'toneturn_class_submit': {
      if (!d.assignments.some((x) => x.id === a.p_assignment)) throw new Error('not your assignment');
      const row = { id: id(), assignment_id: a.p_assignment, user_id: 'me', name: 'Student', created_at: new Date().toISOString(), score: a.p_score, minutes: a.p_minutes, metrics: a.p_metrics, comment: null, mark: null };
      if (JSON.stringify(row.metrics ?? {}).length > 4096) throw new Error('metrics too big');
      d.submissions.push(row);
      save(d);
      return row.id;
    }
    case 'toneturn_class_comment': {
      const s = d.submissions.find((x) => x.id === a.p_submission);
      if (!s) throw new Error('not your student');
      s.comment = a.p_comment || null;
      s.mark = a.p_mark ?? null;
      save(d);
      return null;
    }
    case 'toneturn_class_detail':
      return {
        assignments: [...d.assignments].reverse().map((x) => ({ ...x, submissions: d.submissions.filter((s) => s.assignment_id === x.id).reverse() })),
        minutes: { me: d.submissions.reduce((m, s) => m + Number(s.minutes ?? 0), 0) },
      };
    case 'toneturn_my_assignments':
      return d.assignments.map((x) => ({ ...x, submissions: d.submissions.filter((s) => s.assignment_id === x.id).reverse() }));
    default:
      throw new Error(`mock: ${fn} not offered`);
  }
}
