import { useCallback, useEffect, useRef, useState } from 'react';
import { enablePush, PUSH_OFF_KEY, pushStatus, type PushStatus } from '../cloud/social';
import { freshOf, loadSeen, markSeen } from '../storage/classSeen';
import { ClassBoardCard } from './Community';
import { classVocal, createClass, deleteClass, joinClass, leaveClass, myClasses, newClassCode, unassign, type ClassKind, type MyClasses, type StudentVocal, type TeachingClass } from '../cloud/classes';
import { cloudConfigured, signInWithGoogle, type CloudUser } from '../cloud/cloud';
import { normaliseCode, ROOM_CODE_RE } from '../cloud/rooms';
import type { LessonId } from '../engine/lesson';
import { SKILLS } from '../engine/rating';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { archiveAssignment, assignState, classDetail, myAssignments, setStudent, teacherMockOn, updateAssignment, wasUpdated, type AssignItem, type ClassDetail, type EnrolledStudent, type Strictness } from '../cloud/teacher';
import { localDay } from '../storage/progress';
import { ClassCharts, ClassMedianSetting } from './ClassCharts'; // phase 6: the teacher charts (only while the summaries sync)
import { AssignForm, ClassHeatmap, GradingInbox, itemTitle, MyAssignmentsList, ParentLinkCard } from './TeacherLoop';
import { Icon } from './icons';
import { WeekPlans, type PlansUpdate } from './WeekPlans';
import type { WeekPlan } from '../engine/weekPlan';
import { intlTag } from '../i18n/translate';

export function ClassesScreen({ t, settings, onSettings, user, onBack, onOpenItem, embedded }: { t: Strings; settings: Settings; /** SPEC-WEEK-PLAN-TILT §1: the teacher's weekly plans live in settings (a patch, or a function of the latest settings). */ onSettings?: (p: Partial<Settings> | ((cur: Settings) => Partial<Settings>)) => void; user: CloudUser | null; onBack: () => void; onOpenLesson: (id: LessonId) => void; /** An assignment of any kind (0.52); its result is sent when finished. */ onOpenItem?: (a: AssignItem) => void; /** Inside the Community tab (0.45): no own header. */ embedded?: boolean }) {
  const lang = settings.uiLang;
  // SPEC-WEEK-PLAN-TILT §1: plans change against the app's LATEST settings (a send that ends after an edit, or after
  // leaving this screen, never writes back an older copy)
  const onPlans = onSettings ? (f: (list: WeekPlan[]) => WeekPlan[]) => onSettings((cur) => ({ teacherPlans: f(cur.teacherPlans ?? []) })) : undefined;
  // the dev mock (tt.mockTeacher = 1): the demo class stands in for a signed-in teacher (teacherMock.ts)
  const mock = teacherMockOn();
  const signedIn = !!user || mock;
  const [data, setData] = useState<MyClasses | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  // SPEC-TEACHER-CLASS 1a: joining asks how the teacher should call you, and a year of birth when the profile has none
  const [joinName, setJoinName] = useState('');
  const [joinYear, setJoinYear] = useState('');
  const [needYear, setNeedYear] = useState(false);
  const [kind, setKind] = useState<ClassKind>('group');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<AssignItem[]>([]);
  // SPEC-CLASS-NOTIFICATIONS §4.5: what is new since the last visit, marked for this visit; seen when leaving
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const freshTaken = useRef(false);
  const seenItems = useRef<AssignItem[]>([]);
  /** When the listed items were loaded: only what was loaded counts as seen (review L5). */
  const loadedAt = useRef<Date | null>(null);
  const uid = user?.id;
  useEffect(() => () => {
    if (uid && seenItems.current.length) markSeen(uid, seenItems.current, loadedAt.current ?? undefined);
  }, [uid]);
  /** A class was joined or created on this visit (SPEC-CLASS-NOTIFICATIONS §4.6: the moment to ask). */
  const [justActed, setJustActed] = useState(false);
  const load = useCallback(async () => {
    try {
      void myAssignments().then((as) => {
        setMine(as);
        seenItems.current = as;
        loadedAt.current = new Date();
        if (!freshTaken.current && user) {
          freshTaken.current = true;
          const f = freshOf(as, loadSeen(user.id));
          setFresh(new Set([...f.assigns, ...f.replies]));
        }
      }, () => {});
      setData(await myClasses());
      setErr(null);
    } catch (e) {
      setErr(String((e as Error).message));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);
  const act = async (f: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await f();
      await load();
    } catch (e) {
      const m = String((e as Error).message ?? e);
      const he = lang === 'he';
      setErr(
        /not found/.test(m) ? t.classNotFound
        : /code expired/.test(m) ? (he ? 'הקוד הזה כבר לא בתוקף. בקשו מהמורה קוד חדש.' : 'This code has expired. Ask your teacher for a new one.')
        : /birth year needed/.test(m) ? (setNeedYear(true), he ? 'צריך שנת לידה כדי להצטרף לכיתה.' : 'A year of birth is needed to join a class.')
        : /one studio/.test(m) ? (he ? 'יש לך כבר סטודיו. אפשר לפתוח קבוצות נוספות.' : 'You already have a studio. You can open more groups.')
        : m,
      );
    } finally {
      setBusy(false);
    }
  };
  const title = (id: string) => assignmentTitle(id, lang, t);

  return (
    <main className={embedded ? "classes embedded" : "panel-screen classes"}>
      {!embedded && (
        <header className="screen-head">
          <button className="icon-btn" onClick={onBack} aria-label={t.back}>
            <Icon k="back" />
          </button>
          <h1>{t.classes}</h1>
        </header>
      )}
      <p className="field-hint">{t.classesHint}</p>
      {!cloudConfigured && !mock ? (
        <p className="set-card">{t.onlineUnavailable}</p>
      ) : !signedIn ? (
        <section className="set-card">
          <p>{t.signInForClasses}</p>
          <button className="btn google" onClick={() => void signInWithGoogle()}>
            {t.signInGoogle}
          </button>
        </section>
      ) : (
        <>
          <MyClassesStrip data={data} lang={lang} />
          <section className="set-card">
            <h2>{t.joinClass}</h2>
            <div className="join-row">
              <input className="code-input" dir="ltr" value={code} aria-label={t.classCode} placeholder="ABC234" autoComplete="off" onChange={(e) => setCode(normaliseCode(e.target.value))} />
              <button
                className="btn primary"
                disabled={busy || !ROOM_CODE_RE.test(code) || (needYear && !joinYear)}
                onClick={() =>
                  act(() =>
                    joinClass(code, { name: joinName.trim() || null, birthYear: needYear && joinYear ? Number(joinYear) : (settings.birthYear ?? null) }).then(() => {
                      // the server keeps this year only when it had none: the device takes the same one
                      if (needYear && joinYear) onSettings?.({ birthYear: Number(joinYear) });
                      setNeedYear(false);
                      setCode('');
                      setJoinName('');
                      setJustActed(true);
                    }),
                  )
                }
                data-join-go="1"
              >
                {t.join}
              </button>
            </div>
            {ROOM_CODE_RE.test(code) && (
              <div className="join-more" data-join-more="1">
                <label className="af-row">
                  <span>{lang === 'he' ? 'איך המורה יקרא לך' : 'How your teacher sees you'}</span>
                  <input value={joinName} maxLength={40} onChange={(e) => setJoinName(e.target.value)} placeholder={lang === 'he' ? 'שם פרטי או כינוי' : 'First name or nickname'} data-join-name="1" />
                </label>
                {needYear && (
                  <label className="af-row">
                    <span>{lang === 'he' ? 'שנת לידה' : 'Year of birth'}</span>
                    <select value={joinYear} onChange={(e) => setJoinYear(e.target.value)} data-join-year="1">
                      <option value="">—</option>
                      {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - 4 - i).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {needYear && <small className="field-hint">{lang === 'he' ? 'שנת הלידה קובעת אילו כלים חברתיים פתוחים לך. המורה לא רואה אותה.' : 'Your year of birth decides which social tools are open to you. Your teacher does not see it.'}</small>}
              </div>
            )}
          </section>

          {user && data && (data.memberOf.length > 0 || data.teaching.length > 0) && <ClassPushAsk lang={lang} student={data.memberOf.length > 0} teacher={data.teaching.length > 0} hour={settings.reminderHour} justActed={justActed} />}
          {onOpenItem && <MyAssignmentsList items={mine} lang={lang} t={t} onOpen={onOpenItem} fresh={fresh} />}
          {data && data.memberOf.length > 0 && <ParentLinkCard lang={lang} />}
          {data?.memberOf.map((c) => (
            <section key={c.id} className="set-card class-card">
              <div className="class-head">
                <h2>{c.name}</h2>
                <small>
                  {t.teacherLabel}: {c.teacher}
                </small>
              </div>
              {mine.filter((a) => a.classId === c.id || (!a.classId && a.className === c.name)).length === 0 && <p className="field-hint">{t.noAssignments}</p>}
              {c.kind !== 'studio' && <ClassBoardCard lang={lang} classId={c.id} teacher={false} />}
              <button className="btn ghost small" disabled={busy} onClick={() => act(() => leaveClass(c.id))}>
                {t.leaveClass}
              </button>
            </section>
          ))}

          <section className="set-card">
            <h2>{t.teachAClass}</h2>
            <div className="join-row">
              <input value={name} maxLength={40} placeholder={t.className} aria-label={t.className} onChange={(e) => setName(e.target.value)} className="code-input name-input" />
              <button className="btn primary" disabled={busy || !name.trim()} onClick={() => act(() => createClass(name.trim(), kind).then(() => (setName(''), setJustActed(true))))} data-create-class="1">
                {t.create}
              </button>
            </div>
            <label className="af-row">
              <span>{lang === 'he' ? 'סוג' : 'Kind'}</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as ClassKind)} data-class-kind="1">
                <option value="group">{lang === 'he' ? 'קבוצה (כיתה, הרכב)' : 'Group (a class, a combo)'}</option>
                <option value="studio">{lang === 'he' ? 'סטודיו (תלמידים פרטיים)' : 'Studio (private students)'}</option>
              </select>
            </label>
            <small className="field-hint">
              {kind === 'studio'
                ? lang === 'he' ? 'בסטודיו התלמידים לא רואים זה את זה. כל תלמיד מקבל משימות משלו.' : 'In a studio students never see each other. Each student gets their own assignments.'
                : lang === 'he' ? 'בקבוצה אפשר מטרה משותפת ולוח כיתה. הקוד פג אחרי 14 יום, ואפשר להחליף אותו.' : 'A group can have a shared goal and a class board. The code expires after 14 days, and you can replace it.'}
            </small>
          </section>
          {data?.teaching.map((c) => <TeacherCard key={c.id} t={t} c={c} lang={lang} busy={busy} act={act} title={title} onError={setErr} plans={settings.teacherPlans} onPlans={onPlans} />)}
        </>
      )}
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
    </main>
  );
}

function pct(s: { n: number; correct: number } | undefined) {
  return s && s.n ? `${Math.round((100 * s.correct) / s.n)}%` : '–';
}

function TeacherCard({ t, c, lang, busy, act, onError, plans, onPlans }: { /** SPEC-WEEK-PLAN-TILT §1 */ plans?: WeekPlan[]; onPlans?: PlansUpdate; t: Strings; c: TeachingClass; lang: 'he' | 'en'; busy: boolean; act: (f: () => Promise<unknown>) => Promise<void>; title: (id: string) => string; onError: (e: string) => void }) {
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const loadDetail = useCallback(() => void classDetail(c.id).then(setDetail, () => {}), [c.id]);
  useEffect(() => loadDetail(), [loadDetail]);
  const [vocal, setVocal] = useState<StudentVocal[] | null>(null);
  useEffect(() => {
    void classVocal(c.id).then(setVocal);
  }, [c.id]);
  const shown = SKILLS.filter((k) => c.students.some((s) => s.skills[k]?.n));
  return (
    <section className="set-card class-card teacher">
      <div className="class-head">
        <h2>
          {c.name} <span className="tag-mark">{c.kind === 'studio' ? (lang === 'he' ? 'סטודיו' : 'Studio') : lang === 'he' ? 'קבוצה' : 'Group'}</span>
        </h2>
        <small>
          {t.classCode}: <b dir="ltr" className="class-code">{c.code}</b>
          {' · '}
          {codeExpiry(c.codeExpiresAt, lang)}{' '}
          <button className="link" disabled={busy} onClick={() => void act(() => newClassCode(c.id))} data-new-code={c.id}>
            {lang === 'he' ? 'קוד חדש' : 'New code'}
          </button>
        </small>
      </div>
      {c.kind !== 'studio' && <ClassMedianSetting classId={c.id} lang={lang} />}
      {c.kind !== 'studio' && <ClassBoardCard lang={lang} classId={c.id} teacher />}
      {detail?.students && detail.students.length > 0 && <StudentsPanel students={detail.students} assignments={detail.assignments} lang={lang} onChanged={loadDetail} onError={onError} />}
      <h3>{lang === 'he' ? 'נתוני התלמידים' : 'Student data'}</h3>
      {c.students.length === 0 ? (
        <p className="field-hint">{t.shareClassCode}</p>
      ) : (
        <div className="roster-wrap">
          <table className="roster">
            <thead>
              <tr>
                <th>{t.nickname}</th>
                <th>{t.overallRating}</th>
                <th>{t.lessonsDoneShort}</th>
                <th>XP 7d</th>
                <th>{lang === 'he' ? 'רצף' : 'Streak'}</th>
                {shown.map((k) => (
                  <th key={k} title={t.skillNames[k]}>
                    {t.skillNames[k]}
                  </th>
                ))}
                <th>{t.lastActive}</th>
              </tr>
            </thead>
            <tbody>
              {c.students.map((s) => (
                <tr key={s.userId}>
                  <td>{s.name}</td>
                  <td>{s.rating ? `${s.rating}${s.ratingProvisional ? '?' : ''}` : '–'}</td>
                  <td>{s.lessonsDone}</td>
                  <td>{s.weekXp}</td>
                  <td>{s.streak}</td>
                  {shown.map((k) => (
                    <td key={k}>{pct(s.skills[k])}</td>
                  ))}
                  <td dir="ltr">{s.lastActive ? new Date(s.lastActive).toLocaleDateString(intlTag(lang)) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {vocal && vocal.some((s) => s.takes > 0) && (
        <>
          <h3>{t.vocalTitle}</h3>
          <div className="roster-wrap">
            <table className="roster">
              <thead>
                <tr>
                  <th>{t.nickname}</th>
                  <th>{t.vocalScore}</th>
                  <th>{t.metricNames.intonation} (¢)</th>
                  <th>{t.metricNames.stability} (¢)</th>
                  <th>{t.metricNames.vibratoRegularity} (%)</th>
                  <th>{t.metricNames.transition} (ms)</th>
                  <th>{t.metricNames.hit} (%)</th>
                </tr>
              </thead>
              <tbody>
                {vocal.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.score ?? '–'}</td>
                    <td dir="ltr">{s.intonation ?? '–'}</td>
                    <td dir="ltr">{s.stability ?? '–'}</td>
                    <td dir="ltr">{s.vibrato_evenness ?? '–'}</td>
                    <td dir="ltr">{s.transition_ms ?? '–'}</td>
                    <td dir="ltr">{s.right_notes ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <h3>{t.assignments}</h3>
      {detail ? (
        <TeacherAssignments detail={detail} total={c.students.length} lang={lang} t={t} busy={busy} onChanged={loadDetail} onError={onError} onRemove={(id) => act(() => unassign(id)).then(loadDetail)} />
      ) : (
        <p className="field-hint">{lang === 'he' ? 'טוען…' : 'Loading…'}</p>
      )}
      {onPlans && <WeekPlans classId={c.id} assignments={detail?.assignments ?? null} plans={plans ?? []} onPlans={onPlans} lang={lang} t={t} onSent={loadDetail} />}
      <AssignForm classId={c.id} lang={lang} t={t} busy={busy} onAssigned={loadDetail} onError={onError} students={detail?.students?.filter((x) => x.status !== 'left').map((x) => ({ userId: x.userId, name: x.name }))} />
      {detail && <GradingInbox detail={detail} lang={lang} t={t} onChanged={loadDetail} />}
      {detail && <ClassHeatmap c={c} minutes={detail.minutes} lang={lang} t={t} />}
      {c.students.length > 0 && <ClassCharts classId={c.id} students={c.students.map((s) => ({ id: s.userId, name: s.name }))} lang={lang} assignments={detail?.assignments} titleOf={(a) => itemTitle(a, lang, t)} />}
      <button
        className="btn ghost small danger"
        disabled={busy}
        onClick={() => {
          if (confirm(t.deleteClassConfirm)) void act(() => deleteClass(c.id));
        }}
      >
        {t.deleteClass}
      </button>
    </section>
  );
}

const DOW: Record<'he' | 'en', string[]> = {
  he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** "expires on 3.12" / "never expires" / "expired". */
function codeExpiry(at: string | null, lang: 'he' | 'en'): string {
  const he = lang === 'he';
  if (!at) return he ? 'לא פג' : 'never expires';
  const d = new Date(at);
  if (d.getTime() < Date.now()) return he ? 'פג' : 'expired';
  return he ? `בתוקף עד ${d.getDate()}.${d.getMonth() + 1}` : `valid until ${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * SPEC-TEACHER-CLASS 1a: the teacher's own row per student — the name the student chose, the lesson day, a private note
 * (never shown to the student or a parent), paused / active, and how many assignments are just for them.
 */
function StudentsPanel({ students, assignments, lang, onChanged, onError }: { students: EnrolledStudent[]; assignments: AssignItem[]; lang: 'he' | 'en'; onChanged: () => void; onError: (e: string) => void }) {
  const he = lang === 'he';
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const save = (id: string, p: Parameters<typeof setStudent>[1]) => void setStudent(id, p).then(onChanged, (e) => onError(String((e as Error).message)));
  return (
    <div className="students-panel" data-students-panel="1">
      <h3>{he ? `תלמידים (${students.length})` : `Students (${students.length})`}</h3>
      <ul className="student-list">
        {students.map((x) => {
          const mine = assignments.filter((a) => a.studentId === x.userId && !a.archivedAt).length;
          const isOpen = open === x.userId;
          return (
            <li key={x.userId} className={x.status === 'paused' ? 'paused' : ''}>
              <button type="button" className="student-row" aria-expanded={isOpen} onClick={() => (setOpen(isOpen ? null : x.userId), setNote(x.privateNote ?? ''))} data-student-row={x.userId}>
                <bdi>{x.name}</bdi>
                <small>
                  {[x.lessonDow != null ? (he ? `שיעור ביום ${DOW.he[x.lessonDow]}` : `Lessons on ${DOW.en[x.lessonDow]}`) : null, x.status === 'paused' ? (he ? 'בהפסקה' : 'Paused') : null, mine ? (he ? `${mine} משימות אישיות` : `${mine} own assignments`) : null, x.young ? (he ? 'צעיר' : 'Young') : null].filter(Boolean).join(' · ')}
                </small>
              </button>
              {isOpen && (
                <div className="student-panel" data-student-panel={x.userId}>
                  <label className="af-row">
                    <span>{he ? 'יום השיעור' : 'Lesson day'}</span>
                    <select value={x.lessonDow ?? ''} onChange={(e) => save(x.userId, { lessonDow: e.target.value === '' ? null : Number(e.target.value) })} data-student-dow="1">
                      <option value="">—</option>
                      {DOW[lang].map((d, i) => (
                        <option key={i} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toggle-row">
                    <input type="checkbox" checked={x.status === 'paused'} onChange={(e) => save(x.userId, { status: e.target.checked ? 'paused' : 'active' })} />
                    <span>{he ? 'בהפסקה (חופשה, חזרה בהמשך)' : 'Paused (a break, back later)'}</span>
                  </label>
                  <label className="af-col">
                    <span>{he ? 'הערה פרטית שלך' : 'Your private note'}</span>
                    <textarea value={note} maxLength={2000} rows={3} onChange={(e) => setNote(e.target.value)} data-student-note="1" />
                    <small className="field-hint">{he ? 'רק את/ה רואה. לא התלמיד ולא ההורה.' : 'Only you see it. Not the student, not a parent.'}</small>
                  </label>
                  <button className="btn small" disabled={note === (x.privateNote ?? '')} onClick={() => save(x.userId, { note })} data-student-note-save="1">
                    {he ? 'שמירה' : 'Save'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The teacher's assignments: for whom, who sent, edit (everything but the kind), archive (frees the class's cap), remove. */
function TeacherAssignments({ detail, total, lang, t, busy, onChanged, onError, onRemove }: { detail: ClassDetail; total: number; lang: 'he' | 'en'; t: Strings; busy: boolean; onChanged: () => void; onError: (e: string) => void; onRemove: (id: string) => void }) {
  const he = lang === 'he';
  const [editing, setEditing] = useState<string | null>(null);
  const names = new Map((detail.students ?? []).map((x) => [x.userId, x.name]));
  const live = detail.assignments.filter((a) => !a.archivedAt);
  const archived = detail.assignments.filter((a) => a.archivedAt);
  const run = (p: Promise<unknown>) => void p.then(onChanged, (e) => onError(String((e as Error).message)));
  const row = (a: AssignItem) => {
    const who = new Set(a.submissions.map((x) => x.userId)).size;
    const of = a.studentId ? 1 : total;
    const again = a.submissions.length > 0 && [...new Set(a.submissions.map((x) => x.userId))].some((u) => assignState(a, a.submissions.filter((x) => x.userId === u)) === 'again');
    return (
      <li key={a.id} data-teacher-assignment={a.id}>
        <div className="ma-main">
          <span>
            {itemTitle(a, lang, t)}
            {wasUpdated(a) && <span className="tag-mark">{he ? 'עודכן' : 'Updated'}</span>}
          </span>
          <small>
            {a.studentId ? (he ? `ל־⁨${names.get(a.studentId) ?? ''}⁩` : `For ⁨${names.get(a.studentId) ?? ''}⁩`) : he ? 'לכל הכיתה' : 'Whole class'}
            {' · '}
            <span dir="ltr">
              {who}/{of}
            </span>{' '}
            {he ? 'הגישו' : 'sent'}
            {a.dueOn ? ` · ${dueShort(a.dueOn, lang)}` : ''}
            {again ? (he ? ' · מחכה לניסיון חוזר' : ' · waiting for another take') : ''}
          </small>
          {editing === a.id && <EditAssignment a={a} lang={lang} t={t} onCancel={() => setEditing(null)} onSave={(p) => (setEditing(null), run(updateAssignment(a.id, p)))} />}
        </div>
        {!a.archivedAt ? (
          <span className="ta-actions">
            <button className="link" disabled={busy} onClick={() => setEditing(editing === a.id ? null : a.id)} data-edit-assignment={a.id}>
              {he ? 'עריכה' : 'Edit'}
            </button>
            <button className="link" disabled={busy} onClick={() => run(archiveAssignment(a.id, true))} data-archive-assignment={a.id}>
              {he ? 'לארכיון' : 'Archive'}
            </button>
            <button className="icon-btn small" aria-label={t.remove} disabled={busy} onClick={() => onRemove(a.id)}>
              <Icon k="close" />
            </button>
          </span>
        ) : (
          <button className="link" disabled={busy} onClick={() => run(archiveAssignment(a.id, false))}>
            {he ? 'להחזיר' : 'Restore'}
          </button>
        )}
      </li>
    );
  };
  return (
    <>
      {live.length === 0 ? <p className="field-hint">{t.noAssignments}</p> : <ul className="assign-list">{live.map(row)}</ul>}
      {archived.length > 0 && (
        <details className="ta-archived">
          <summary>{he ? `בארכיון (${archived.length})` : `Archived (${archived.length})`}</summary>
          <ul className="assign-list">{archived.map(row)}</ul>
        </details>
      )}
    </>
  );
}

function EditAssignment({ a, lang, t, onSave, onCancel }: { a: AssignItem; lang: 'he' | 'en'; t: Strings; onSave: (p: { dueOn: string | null; strictness: Strictness; targetBpm: number | null; note: string | null }) => void; onCancel: () => void }) {
  const he = lang === 'he';
  const [due, setDue] = useState(a.dueOn ?? '');
  const [bpm, setBpm] = useState(a.targetBpm ? String(a.targetBpm) : '');
  const [strict, setStrict] = useState<Strictness>(a.strictness);
  const [note, setNote] = useState(a.note ?? '');
  return (
    <div className="edit-assign" data-edit-form={a.id}>
      <div className="af-grid">
        <label className="af-row">
          <span>{t.dueLabel}</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="af-row">
          <span>{he ? 'טמפו יעד' : 'Target tempo'}</span>
          <input type="number" min={20} max={400} inputMode="numeric" value={bpm} onChange={(e) => setBpm(e.target.value)} dir="ltr" />
        </label>
        <label className="af-row">
          <span>{he ? 'רמת דרישה' : 'Strictness'}</span>
          <select value={strict} onChange={(e) => setStrict(e.target.value as Strictness)}>
            <option value="lenient">{he ? 'מקלה' : 'Lenient'}</option>
            <option value="moderate">{he ? 'רגילה' : 'Moderate'}</option>
            <option value="strict">{he ? 'מחמירה' : 'Strict'}</option>
          </select>
        </label>
      </div>
      <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} aria-label={he ? 'הערה' : 'Note'} placeholder={he ? 'הערה' : 'Note'} />
      <span className="ta-actions">
        <button className="btn primary small" onClick={() => onSave({ dueOn: due || null, strictness: strict, targetBpm: bpm ? Math.max(20, Math.min(400, Number(bpm))) : null, note: note.trim() || null })} data-edit-save="1">
          {he ? 'שמירה' : 'Save'}
        </button>
        <button className="btn ghost small" onClick={onCancel}>
          {he ? 'ביטול' : 'Cancel'}
        </button>
      </span>
    </div>
  );
}

/**
 * "My classes" (owner 2026-11-26: "nothing on the Community screen says I'm in a class, its name, or who my teacher
 * is"): one card per class — its name and the teacher for a student; "you teach", the students and the join code for a
 * teacher. On the Community screen it opens the Class tab; on the Class tab it heads the page.
 */
export function MyClassesStrip({ data, lang, onOpen }: { data: MyClasses | null; lang: 'he' | 'en'; onOpen?: () => void }) {
  if (!data || (data.memberOf.length === 0 && data.teaching.length === 0)) return null;
  const he = lang === 'he';
  const rows = [
    ...data.memberOf.map((c) => ({ id: c.id, name: c.name, sub: he ? `המורה: ⁨${c.teacher}⁩` : `Teacher: ⁨${c.teacher}⁩`, role: 'student' as const })),
    ...data.teaching.map((c) => ({ id: c.id, name: c.name, sub: he ? `את/ה המורה · ${c.students.length} תלמידים · קוד ${c.code}` : `You teach · ${c.students.length} students · code ${c.code}`, role: 'teacher' as const })),
  ];
  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <>
      <span className="mc-kicker">{r.role === 'student' ? (he ? 'הכיתה שלי' : 'My class') : he ? 'כיתה שאני מלמד/ת' : 'A class I teach'}</span>
      <b>
        <bdi>{r.name}</bdi>
      </b>
      <small>{r.sub}</small>
    </>
  );
  return (
    <section className="my-classes" aria-label={he ? 'הכיתות שלי' : 'My classes'} data-my-classes={rows.length}>
      {rows.map((r) =>
        onOpen ? (
          <button key={`${r.role}:${r.id}`} type="button" className="mc-card" onClick={onOpen} data-my-class={r.role}>
            <Row r={r} />
          </button>
        ) : (
          <div key={`${r.role}:${r.id}`} className="mc-card" data-my-class={r.role}>
            <Row r={r} />
          </div>
        ),
      )}
    </section>
  );
}

/** "due tomorrow" / "עד מחר" (the player's local day), a short date further off, nothing when past or unset. */
export function dueShort(due: string | null, lang: 'he' | 'en', today = localDay(new Date())): string | null {
  if (!due) return null;
  const d = Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  const he = lang === 'he';
  if (d < 0) return he ? 'המועד עבר' : 'past due';
  if (d === 0) return he ? 'עד היום' : 'due today';
  if (d === 1) return he ? 'עד מחר' : 'due tomorrow';
  const [, m, day] = due.split('-').map(Number);
  return he ? `עד ${day}.${m}` : `due ${m}/${day}`;
}

/** Done assignments stay on the Home card with a check for this long after the take that closed them. */
const DONE_SHOWN_MS = 7 * 86_400_000;

/** An assignment done lately (passed, its newest take within DONE_SHOWN_MS): it stays on the card, checked. */
export function doneLately(a: AssignItem, now = Date.now()): boolean {
  if (assignState(a) !== 'passed') return false;
  const last = a.submissions.reduce((m, s) => (s.createdAt > m ? s.createdAt : m), '');
  return !!last && now - Date.parse(last) < DONE_SHOWN_MS;
}

/** Home card: the student's homework in the teacher's order (soonest due first) — the exercise's own name, the due day
 *  in words, "new" since the last look; a tap opens the assignment itself. Owner 2026-11-27: a done one stays for a week
 *  with a check ("it just vanished"), and the card says how many are done. */
export function AssignedCard({ t, items, lang, onOpen, fresh, next }: { t: Strings; items: AssignItem[]; lang: 'he' | 'en'; onOpen: (a: AssignItem) => void; /** New since the last look (SPEC-CLASS-NOTIFICATIONS §4.5). */ fresh?: Set<string>; /** Just back from one (owner 2026-11-27): the first open one is marked "Next". */ next?: boolean }) {
  const now = Date.now();
  const open = items
    .filter((a) => assignState(a) !== 'passed' || doneLately(a, now))
    .sort((x, y) => (x.dueOn ?? '9999').localeCompare(y.dueOn ?? '9999') || x.createdAt.localeCompare(y.createdAt)); // owner 2026-11-27: homework in the teacher's order (1 before 4)
  const doneN = open.filter((a) => assignState(a) === 'passed').length;
  if (!open.length) return null;
  // the open ones first in the first four places, so a done list never hides what is left
  const rows = [...open.filter((a) => assignState(a) !== 'passed'), ...open.filter((a) => assignState(a) === 'passed')].slice(0, Math.max(4, Math.min(6, open.length)));
  const shown = open.filter((a) => rows.includes(a));
  return (
    <section className="assigned-card" aria-label={t.yourAssignments} data-assigned-card={open.length - doneN}>
      <h2>
        {t.yourAssignments}
        {doneN > 0 && (
          <small className="ac-done-count" data-assigned-done={doneN}>
            {lang === 'he' ? ` · ${doneN} מתוך ${open.length} בוצעו` : ` · ${doneN} of ${open.length} done`}
          </small>
        )}
      </h2>
      <small className="ac-class">{[...new Set(open.map((a) => a.className).filter(Boolean))].join(' · ')}</small>
      <ul className="assign-list">
        {shown.map((a) => {
          const done = assignState(a) === 'passed';
          const isNext = !!next && !done && a.id === rows.find((r) => assignState(r) !== 'passed')?.id;
          return (
          <li key={a.id}>
            <button type="button" className={`ac-row${done ? ' done' : ''}${isNext ? ' next' : ''}`} onClick={() => onOpen(a)} data-assigned={a.id} data-assigned-state={done ? 'done' : 'open'} {...(isNext ? { 'data-assigned-next': '1' } : {})}>
              <span className="ac-title">
                {done && <Icon k="check" size={16} className="ac-check" />}
                {itemTitle(a, lang, t)}
                {fresh?.has(a.id) && <span className="new-mark" data-new-assignment={a.id}>{lang === 'he' ? 'חדש' : 'New'}</span>}
              </span>
              {done ? <small>{lang === 'he' ? 'בוצע' : 'Done'}</small> : isNext ? <small className="ac-next">{lang === 'he' ? 'הבאה' : 'Next'}</small> : dueShort(a.dueOn, lang) && <small>{dueShort(a.dueOn, lang)}</small>}
            </button>
          </li>
          );
        })}
      </ul>
      {open.length > shown.length && <small className="ac-more">{lang === 'he' ? `ועוד ${open.length - shown.length} בדף הכיתה` : `${open.length - shown.length} more on the class page`}</small>}
    </section>
  );
}

const ASK_KEY = 'tt.classPushAsk';

/**
 * SPEC-CLASS-NOTIFICATIONS §4.6: right after joining a class (or teaching one) — "get a notification when your teacher
 * assigns or replies?" Our own short card first; only "Yes" opens the system prompt. "Not now" rests it 7 days. On an
 * iPhone outside the installed app: how to install it first. Hidden once notifications are on (or can't be).
 */
function ClassPushAsk({ lang, student, teacher, hour, justActed }: { lang: 'he' | 'en'; student: boolean; teacher: boolean; hour: number; justActed: boolean }) {
  const he = lang === 'he';
  const [st, setSt] = useState<PushStatus | null>(null);
  // asked once (or notifications were turned off in the app): only a new join / class brings the question back
  const [answered, setAnswered] = useState(() => {
    try {
      return !!localStorage.getItem(ASK_KEY) || localStorage.getItem(PUSH_OFF_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [later2, setLater2] = useState(false);
  const rest = later2 || (answered && !justActed);
  useEffect(() => {
    void pushStatus().then(setSt, () => setSt('unsupported'));
  }, []);
  if (rest || (st !== 'off' && st !== 'needs-install')) return null;
  const later = () => {
    try {
      localStorage.setItem(ASK_KEY, String(Date.now()));
    } catch {
      /* blocked storage: asked again next visit */
    }
    setAnswered(true);
    setLater2(true);
  };
  const what = student && teacher
    ? he ? 'לקבל התראה כשהמורה מטיל משימה או מגיב, וריכוז יומי של ההגשות בכיתות שלך?' : 'Get notified when your teacher assigns or replies, and a daily summary of submissions in your classes?'
    : student
      ? he ? 'לקבל התראה כשהמורה מטיל משימה או מגיב?' : 'Get notified when your teacher assigns or replies?'
      : he ? 'לקבל ריכוז יומי של ההגשות בכיתה?' : 'Get a daily summary of your class’s submissions?';
  return (
    <section className="set-card push-ask" data-class-push-ask={st}>
      {st === 'needs-install' ? (
        <>
          <p>{he ? 'כדי לקבל התראות באייפון, מוסיפים את האפליקציה למסך הבית (שיתוף, ואז "הוספה למסך הבית") ופותחים אותה משם.' : 'To get notifications on an iPhone, add the app to your Home Screen (Share, then "Add to Home Screen") and open it from there.'}</p>
          <div className="pa-row">
            <button type="button" className="btn ghost small" onClick={later}>{he ? 'הבנתי' : 'Got it'}</button>
          </div>
        </>
      ) : (
        <>
          <p>{what}</p>
          <div className="pa-row">
            <button type="button" className="btn primary small" onClick={() => void enablePush(lang, hour).then(setSt, () => setSt('unsupported'))} data-class-push-yes="1">
              {he ? 'כן' : 'Yes'}
            </button>
            <button type="button" className="btn ghost small" onClick={later}>{he ? 'לא עכשיו' : 'Not now'}</button>
          </div>
        </>
      )}
    </section>
  );
}

/** Title of any assignable id (path lesson or generated practice). */
export function assignmentTitle(id: string, lang: 'he' | 'en', t: Strings): string {
  const m = /^vocal-(modes-|harmony-|barry-|sight-|orn-)?(\d+)$/.exec(id);
  if (m) {
    const n = Number(m[2]);
    if (m[1] === 'orn-') return `${t.ornTitle} · ${t.ornLevelNames[n - 1] ?? n}`;
    if (m[1] === 'sight-') return `${t.sightTitle} · ${t.sightLevelNames[n - 1] ?? n}`;
    if (m[1] === 'barry-') return `${t.barryTitle} · ${t.barryLevelNames[n - 1] ?? n}`;
    if (m[1] === 'modes-') return `${t.modesTitle} · ${t.modesLevelNames[n - 1] ?? n}`;
    if (m[1] === 'harmony-') return `${t.harmonyTitle} · ${t.harmonyLevelNames[n - 1] ?? n}`;
    return `${t.vocalTitle} · ${t.vocalLevelNames[n - 1] ?? n}`;
  }
  if (id === 'modes') return t.skillNames.modes;
  if (id === 'wrong-notes') return t.wrongNotesTitle;
  return (LESSON_META[id as LessonId]?.title[lang] ?? id).replace(/\{[nk]\}/g, '');
}
