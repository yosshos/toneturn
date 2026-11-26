import { useCallback, useEffect, useRef, useState } from 'react';
import { enablePush, PUSH_OFF_KEY, pushStatus, type PushStatus } from '../cloud/social';
import { freshOf, loadSeen, markSeen } from '../storage/classSeen';
import { ClassBoardCard } from './Community';
import { classVocal, createClass, deleteClass, EXTRA_ASSIGNABLE, joinClass, leaveClass, myClasses, unassign, type MyClasses, type StudentVocal, type TeachingClass } from '../cloud/classes';
import { cloudConfigured, signInWithGoogle, type CloudUser } from '../cloud/cloud';
import { normaliseCode, ROOM_CODE_RE } from '../cloud/rooms';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { SKILLS } from '../engine/rating';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { classDetail, myAssignments, passed, teacherMockOn, type AssignItem, type ClassDetail } from '../cloud/teacher';
import { localDay } from '../storage/progress';
import { ClassCharts, ClassMedianSetting } from './ClassCharts'; // phase 6: the teacher charts (only while the summaries sync)
import { AssignForm, ClassHeatmap, GradingInbox, itemTitle, MyAssignmentsList, ParentLinkCard } from './TeacherLoop';
import { Icon } from './icons';
import { WeekPlans, type PlansUpdate } from './WeekPlans';
import type { WeekPlan } from '../engine/weekPlan';
import { intlTag } from '../i18n/translate';

export function ClassesScreen({ t, settings, onSettings, user, onBack, onOpenLesson, onOpenItem, embedded }: { t: Strings; settings: Settings; /** SPEC-WEEK-PLAN-TILT §1: the teacher's weekly plans live in settings (a patch, or a function of the latest settings). */ onSettings?: (p: Partial<Settings> | ((cur: Settings) => Partial<Settings>)) => void; user: CloudUser | null; onBack: () => void; onOpenLesson: (id: LessonId) => void; /** An assignment of any kind (0.52); its result is sent when finished. */ onOpenItem?: (a: AssignItem) => void; /** Inside the Community tab (0.45): no own header. */ embedded?: boolean }) {
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
      setErr(/not found/.test(String(e)) ? t.classNotFound : String((e as Error).message));
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
          <section className="set-card">
            <h2>{t.joinClass}</h2>
            <div className="join-row">
              <input className="code-input" dir="ltr" value={code} aria-label={t.classCode} placeholder="ABC234" autoComplete="off" onChange={(e) => setCode(normaliseCode(e.target.value))} />
              <button className="btn primary" disabled={busy || !ROOM_CODE_RE.test(code)} onClick={() => act(() => joinClass(code).then(() => (setCode(''), setJustActed(true))))}>
                {t.join}
              </button>
            </div>
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
              {c.assignments.length === 0 ? (
                <p className="field-hint">{t.noAssignments}</p>
              ) : (
                <ul className="assign-list">
                  {c.assignments.map((a) => (
                    <li key={a.id} className={a.done ? 'done' : ''}>
                      <button className="link" disabled={!openable(a.lessonId)} onClick={() => onOpenLesson(a.lessonId as LessonId)}>
                        {a.done ? '✓ ' : ''}
                        {title(a.lessonId)}
                      </button>
                      {a.dueOn && <small dir="ltr">{t.dueLabel} {a.dueOn}</small>}
                    </li>
                  ))}
                </ul>
              )}
              <ClassBoardCard lang={lang} classId={c.id} teacher={false} />
              <button className="btn ghost small" disabled={busy} onClick={() => act(() => leaveClass(c.id))}>
                {t.leaveClass}
              </button>
            </section>
          ))}

          <section className="set-card">
            <h2>{t.teachAClass}</h2>
            <div className="join-row">
              <input value={name} maxLength={40} placeholder={t.className} aria-label={t.className} onChange={(e) => setName(e.target.value)} className="code-input name-input" />
              <button className="btn primary" disabled={busy || !name.trim()} onClick={() => act(() => createClass(name.trim()).then(() => (setName(''), setJustActed(true))))}>
                {t.create}
              </button>
            </div>
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
        <h2>{c.name}</h2>
        <small>
          {t.classCode}: <b dir="ltr" className="class-code">{c.code}</b>
        </small>
      </div>
      <ClassMedianSetting classId={c.id} lang={lang} />
      <ClassBoardCard lang={lang} classId={c.id} teacher />
      <h3>
        {t.students} ({c.students.length})
      </h3>
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
      <ul className="assign-list">
        {(detail?.assignments ?? c.assignments.map((a) => ({ ...a, kind: 'lesson' as const, ref: null, submissions: [] as { userId?: string }[] }))).map((a) => {
          const who = new Set(a.submissions.map((x) => x.userId)).size;
          return (
            <li key={a.id}>
              <span>{itemTitle(a, lang, t)}</span>
              <small dir="ltr">
                {who}/{c.students.length} ✓{a.dueOn ? ` · ${t.dueLabel} ${a.dueOn}` : ''}
              </small>
              <button className="icon-btn small" aria-label={t.remove} disabled={busy} onClick={() => act(() => unassign(a.id)).then(loadDetail)}>
                <Icon k="close" />
              </button>
            </li>
          );
        })}
      </ul>
      {onPlans && <WeekPlans classId={c.id} assignments={detail?.assignments ?? null} plans={plans ?? []} onPlans={onPlans} lang={lang} t={t} onSent={loadDetail} />}
      <AssignForm classId={c.id} lang={lang} t={t} busy={busy} onAssigned={loadDetail} onError={onError} />
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

/** Home card: the student's open assignments (not passed yet), soonest due first — the exercise's own name, the due
 *  day in words, "new" since the last look; a tap opens the assignment itself. */
export function AssignedCard({ t, items, lang, onOpen, fresh }: { t: Strings; items: AssignItem[]; lang: 'he' | 'en'; onOpen: (a: AssignItem) => void; /** New since the last look (SPEC-CLASS-NOTIFICATIONS §4.5). */ fresh?: Set<string> }) {
  const open = items
    .filter((a) => !(a.submissions[0] && passed(a, a.submissions[0])))
    .sort((x, y) => (x.dueOn ?? '9999').localeCompare(y.dueOn ?? '9999') || y.createdAt.localeCompare(x.createdAt));
  if (!open.length) return null;
  return (
    <section className="assigned-card" aria-label={t.yourAssignments} data-assigned-card={open.length}>
      <h2>{t.yourAssignments}</h2>
      <ul className="assign-list">
        {open.slice(0, 4).map((a) => (
          <li key={a.id}>
            <button type="button" className="ac-row" onClick={() => onOpen(a)} data-assigned={a.id}>
              <span className="ac-title">
                {itemTitle(a, lang, t)}
                {fresh?.has(a.id) && <span className="new-mark" data-new-assignment={a.id}>{lang === 'he' ? 'חדש' : 'New'}</span>}
              </span>
              <small>{[dueShort(a.dueOn, lang), a.className].filter(Boolean).join(' · ')}</small>
            </button>
          </li>
        ))}
      </ul>
      {open.length > 4 && <small className="ac-more">{lang === 'he' ? `ועוד ${open.length - 4} בדף הכיתה` : `${open.length - 4} more on the class page`}</small>}
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

const openable = (id: string) => LESSON_ORDER.includes(id as LessonId) || EXTRA_ASSIGNABLE.includes(id);

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
