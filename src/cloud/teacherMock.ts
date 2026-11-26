// A stand-in for the teacher-loop RPCs (dev builds only, localStorage tt.mockTeacher = 1): one class "demo-class"
// where this device is both the teacher and a student. The e2e suite and local checks of the phrase assignment flow
// use it; production never loads this module (teacher.ts imports it only when teacherMockOn()).

type Row = Record<string, unknown>;
interface Db {
  assignments: Row[];
  submissions: Row[];
  opts?: Record<string, Row>;
  students?: Record<string, Row>;
}
// "me" is this device as a student, so an assignment for one student can be tried locally
const MOCK_STUDENTS: [string, string][] = [
  ['me', 'Me'],
  ['s1', 'Noa'],
  ['s2', 'Ari'],
  ['s3', 'Maya'],
];
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
      const row = { id: id(), class: a.p_class === MOCK_CLASS ? 'Demo' : String(a.p_class), kind: a.p_kind, lesson_id: a.p_kind === 'lesson' ? a.p_lesson : a.p_kind, ref: a.p_ref, due_on: a.p_due, strictness: a.p_strict ?? 'moderate', target_bpm: a.p_bpm, note: a.p_note, created_at: new Date().toISOString(), student_id: a.p_student ?? null };
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
    case 'toneturn_class_assign_update': {
      const x = d.assignments.find((r) => r.id === a.p_assignment);
      if (!x) throw new Error('not your assignment');
      Object.assign(x, { ...(a.p_ref != null ? { ref: a.p_ref } : {}), due_on: a.p_due, strictness: a.p_strict ?? x.strictness, target_bpm: a.p_bpm, note: a.p_note || null, updated_at: new Date(Date.now() + 120_000).toISOString() });
      save(d);
      return null;
    }
    case 'toneturn_class_archive': {
      const x = d.assignments.find((r) => r.id === a.p_assignment);
      if (!x) throw new Error('not your assignment');
      x.archived_at = a.p_on ? new Date().toISOString() : null;
      save(d);
      return null;
    }
    case 'toneturn_teacher_set_student': {
      const st = (d.students ??= {});
      const cur = st[String(a.p_student)] ?? {};
      st[String(a.p_student)] = { ...cur, ...(a.p_clear_dow ? { lesson_dow: null } : a.p_dow != null ? { lesson_dow: a.p_dow } : {}), ...(a.p_note != null ? { private_note: a.p_note || null } : {}), ...(a.p_status ? { status: a.p_status } : {}) };
      save(d);
      return null;
    }
    case 'toneturn_class_new_code':
      return 'NEW' + Math.random().toString(36).slice(2, 5).toUpperCase();
    case 'toneturn_class_comment': {
      const s = d.submissions.find((x) => x.id === a.p_submission);
      if (!s) throw new Error('not your student');
      s.comment = a.p_comment || null;
      s.mark = a.p_mark ?? null;
      save(d);
      return null;
    }
    // SPEC-PATH-TODAY-PRACTICE §5.2: an assignment's options (channel, minutes a day, spread / all today)
    case 'toneturn_assignment_set_opts': {
      if (!d.assignments.some((x) => x.id === a.p_assignment)) throw new Error('not your assignment');
      d.opts = { ...(d.opts ?? {}), [String(a.p_assignment)]: { assignment_id: a.p_assignment, channel: a.p_channel, minutes: a.p_minutes, if_short: a.p_if_short } };
      save(d);
      return null;
    }
    case 'toneturn_assignment_opts_for':
      return ((a.p_ids as string[]) ?? []).map((k) => d.opts?.[k]).filter(Boolean);
    case 'toneturn_class_detail':
      return {
        assignments: [...d.assignments].reverse().map((x) => ({ ...x, submissions: d.submissions.filter((s) => s.assignment_id === x.id).reverse() })),
        minutes: { me: d.submissions.reduce((m, s) => m + Number(s.minutes ?? 0), 0) },
        students: MOCK_STUDENTS.map(([user_id, name]) => ({ user_id, name, lesson_dow: null, status: 'active', private_note: null, young: false, ...(d.students?.[user_id] ?? {}) })),
      };
    // BUILD-PLAN phase 6: the class page itself (the teacher charts read the snapshot mock, snapshotsMock.ts)
    case 'toneturn_my_classes':
      return {
        teaching: [
          {
            id: MOCK_CLASS,
            code: 'DEMO42',
            name: 'Demo',
            kind: 'group',
            code_expires_at: null,
            assignments: [],
            students: MOCK_STUDENTS.map(([user_id, name]) => ({ user_id, name, lessons_done: 3, week_xp: 120, streak: 2, last_active: new Date().toISOString(), skills: {} })),
          },
        ],
        member_of: [{ id: MOCK_CLASS, name: 'Demo', kind: 'group', teacher: 'Teacher', assignments: [] }],
      };
    case 'toneturn_my_assignments':
      return d.assignments.filter((x) => !x.archived_at && (!x.student_id || x.student_id === 'me')).map((x) => ({ ...x, personal: !!x.student_id, submissions: d.submissions.filter((s) => s.assignment_id === x.id).reverse() }));
    default:
      throw new Error(`mock: ${fn} not offered`);
  }
}
