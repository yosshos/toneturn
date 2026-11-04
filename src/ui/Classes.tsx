import { useCallback, useEffect, useState } from 'react';
import { assignLesson, createClass, deleteClass, joinClass, leaveClass, myClasses, unassign, type MyClasses, type TeachingClass } from '../cloud/classes';
import { cloudConfigured, signInWithGoogle, type CloudUser } from '../cloud/cloud';
import { normaliseCode, ROOM_CODE_RE } from '../cloud/rooms';
import { LESSON_ORDER, type LessonId } from '../engine/lesson';
import { SKILLS } from '../engine/rating';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';

export function ClassesScreen({ t, settings, user, onBack, onOpenLesson }: { t: Strings; settings: Settings; user: CloudUser | null; onBack: () => void; onOpenLesson: (id: LessonId) => void }) {
  const lang = settings.uiLang;
  const [data, setData] = useState<MyClasses | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await myClasses());
      setErr(null);
    } catch (e) {
      setErr(String((e as Error).message));
    }
  }, []);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);
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
  const title = (id: string) => (LESSON_META[id as LessonId]?.title[lang] ?? id).replace(/\{[nk]\}/g, '');

  return (
    <main className="panel-screen classes">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.classes}</h1>
      </header>
      <p className="field-hint">{t.classesHint}</p>
      {!cloudConfigured ? (
        <p className="set-card">{t.onlineUnavailable}</p>
      ) : !user ? (
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
              <button className="btn primary" disabled={busy || !ROOM_CODE_RE.test(code)} onClick={() => act(() => joinClass(code).then(() => setCode('')))}>
                {t.join}
              </button>
            </div>
          </section>

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
                      <button className="link" disabled={!LESSON_ORDER.includes(a.lessonId as LessonId)} onClick={() => onOpenLesson(a.lessonId as LessonId)}>
                        {a.done ? '✓ ' : ''}
                        {title(a.lessonId)}
                      </button>
                      {a.dueOn && <small dir="ltr">{t.dueLabel} {a.dueOn}</small>}
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn ghost small" disabled={busy} onClick={() => act(() => leaveClass(c.id))}>
                {t.leaveClass}
              </button>
            </section>
          ))}

          <section className="set-card">
            <h2>{t.teachAClass}</h2>
            <div className="join-row">
              <input value={name} maxLength={40} placeholder={t.className} aria-label={t.className} onChange={(e) => setName(e.target.value)} className="code-input name-input" />
              <button className="btn primary" disabled={busy || !name.trim()} onClick={() => act(() => createClass(name.trim()).then(() => setName('')))}>
                {t.create}
              </button>
            </div>
          </section>
          {data?.teaching.map((c) => <TeacherCard key={c.id} t={t} c={c} lang={lang} busy={busy} act={act} title={title} />)}
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

function TeacherCard({ t, c, lang, busy, act, title }: { t: Strings; c: TeachingClass; lang: 'he' | 'en'; busy: boolean; act: (f: () => Promise<unknown>) => Promise<void>; title: (id: string) => string }) {
  const [lesson, setLesson] = useState<LessonId>(LESSON_ORDER[0]);
  const [due, setDue] = useState('');
  const shown = SKILLS.filter((k) => c.students.some((s) => s.skills[k]?.n));
  return (
    <section className="set-card class-card teacher">
      <div className="class-head">
        <h2>{c.name}</h2>
        <small>
          {t.classCode}: <b dir="ltr" className="class-code">{c.code}</b>
        </small>
      </div>
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
                <th>{t.lessonsDoneShort}</th>
                <th>XP 7d</th>
                <th>🔥</th>
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
                  <td>{s.lessonsDone}</td>
                  <td>{s.weekXp}</td>
                  <td>{s.streak}</td>
                  {shown.map((k) => (
                    <td key={k}>{pct(s.skills[k])}</td>
                  ))}
                  <td dir="ltr">{s.lastActive ? new Date(s.lastActive).toLocaleDateString(lang) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>{t.assignments}</h3>
      <ul className="assign-list">
        {c.assignments.map((a) => (
          <li key={a.id}>
            <span>{title(a.lessonId)}</span>
            <small dir="ltr">
              {a.done}/{c.students.length} ✓{a.dueOn ? ` · ${t.dueLabel} ${a.dueOn}` : ''}
            </small>
            <button className="icon-btn small" aria-label={t.remove} disabled={busy} onClick={() => act(() => unassign(a.id))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="assign-form">
        <select value={lesson} onChange={(e) => setLesson(e.target.value as LessonId)} aria-label={t.assignLesson}>
          {LESSON_ORDER.map((id, i) => (
            <option key={id} value={id}>
              {i + 1}. {title(id)}
            </option>
          ))}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t.dueLabel} />
        <button className="btn primary small" disabled={busy} onClick={() => act(() => assignLesson(c.id, lesson, due || null))}>
          {t.assignLesson}
        </button>
      </div>
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

/** Home card: open assignments from the student's classes, soonest due first. */
export function AssignedCard({ t, items, lang, onOpen }: { t: Strings; items: { id: string; lessonId: string; dueOn: string | null; className: string }[]; lang: 'he' | 'en'; onOpen: (id: LessonId) => void }) {
  if (!items.length) return null;
  return (
    <section className="assigned-card" aria-label={t.yourAssignments}>
      <h2>🏫 {t.yourAssignments}</h2>
      <ul className="assign-list">
        {items.slice(0, 4).map((a) => (
          <li key={a.id}>
            <button className="link" disabled={!LESSON_ORDER.includes(a.lessonId as LessonId)} onClick={() => onOpen(a.lessonId as LessonId)}>
              {(LESSON_META[a.lessonId as LessonId]?.title[lang] ?? a.lessonId).replace(/\{[nk]\}/g, '')}
            </button>
            <small>
              {a.className}
              {a.dueOn ? ` · ${t.dueLabel} ${a.dueOn}` : ''}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}
