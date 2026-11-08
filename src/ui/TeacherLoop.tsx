// The teacher loop (0.52): assign anything (a path lesson, a topic level, a technique level, a chord chart with a
// voicing / rhythm / improvisation, a piece instruction) with strictness, a target tempo and a note; the grading inbox
// (each submission: score, minutes, metrics → a short comment and a mark); the class heat map (students × skills,
// practice minutes, who is behind); the student's assignment list with the teacher's comments; the parent link and
// the parent digest page.
import { useEffect, useMemo, useState } from 'react';
import type { TeachingClass } from '../cloud/classes';
import { EXTRA_ASSIGNABLE } from '../cloud/classes';
import { assignItem, commentOn, createDigestLink, inboxOf, parseTopicRef, passed, readDigest, revokeDigestLink, type AssignItem, type AssignKind, type ClassDetail, type Digest, type Mark, type Strictness } from '../cloud/teacher';
import { IMPROV_LEVELS } from '../engine/charts';
import { chartKind, parseChartKind, RHYTHMS, RHYTHM_NAME, VOICINGS, VOICING_NAME } from '../engine/drills/chartDrills';
import { catalog } from '../engine/drills/generate';
import { LESSON_ORDER } from '../engine/lesson';
import { SKILLS } from '../engine/rating';
import { TOPIC_GEN } from '../engine/topics';
import type { Strings } from '../i18n/strings';
import { assignmentTitle } from './Classes';

type Lang = 'en' | 'he';
const TX = {
  en: {
    kind: 'What', lesson: 'Path lesson', topic: 'Topic level', drill: 'Technique level', chart: 'Chord chart', piece: 'Piece',
    level: 'Level', strict: 'Strictness', lenient: 'Lenient', moderate: 'Moderate', strictS: 'Strict', bpm: 'Target ♩', note: 'Note to the class',
    due: 'Due', assign: 'Assign', voicing: 'Voicing', rhythm: 'Rhythm', mode: 'Mode', comp: 'Comp', improv: 'Improvise', pieceText: 'What to practice (piece, bars, tempo…)',
    inbox: 'To grade', inboxEmpty: 'Nothing new to grade.', score: 'score', min: 'min', commentPh: 'A short comment…', great: 'Great', good: 'Good', again: 'Again', send: 'Send',
    heat: 'Class map', heatHint: 'First-try accuracy per skill, 30 days · practice minutes this week', behind: 'behind', minutes: 'min 7d',
    mine: 'Your assignments', open: 'Open', teacherSays: 'Teacher', sent: 'Sent', pass: 'passed', try: 'not yet',
    parent: 'Parent link', parentHint: 'A private page for a parent: this week’s practice, streak, skills mastered and the teacher’s latest comments. No sign-in needed; you can turn it off.', make: 'Make a link', copy: 'Copy', revoke: 'Turn off', copied: 'Copied',
  },
  he: {
    kind: 'מה', lesson: 'שיעור במסלול', topic: 'רמה בנושא', drill: 'רמה בטכניקה', chart: 'מהלך אקורדים', piece: 'יצירה',
    level: 'רמה', strict: 'קפדנות', lenient: 'מקלה', moderate: 'בינונית', strictS: 'קפדנית', bpm: 'טמפו יעד ♩', note: 'הערה לכיתה',
    due: 'עד', assign: 'להטיל', voicing: 'קולות', rhythm: 'קצב', mode: 'מצב', comp: 'ליווי', improv: 'אלתור', pieceText: 'מה לתרגל (יצירה, תיבות, טמפו…)',
    inbox: 'לבדיקה', inboxEmpty: 'אין הגשות חדשות.', score: 'ציון', min: 'דק׳', commentPh: 'הערה קצרה…', great: 'מצוין', good: 'טוב', again: 'שוב', send: 'לשלוח',
    heat: 'מפת הכיתה', heatHint: 'דיוק בניסיון ראשון לכל מיומנות, 30 יום · דקות אימון השבוע', behind: 'מאחר בקצב', minutes: 'דק׳ 7 ימים',
    mine: 'המשימות שלך', open: 'לפתוח', teacherSays: 'המורה', sent: 'הוגש', pass: 'עבר', try: 'עוד לא',
    parent: 'קישור להורים', parentHint: 'דף פרטי להורה: האימון השבוע, הרצף, מיומנויות שנשלטו וההערות האחרונות של המורה. בלי התחברות; אפשר לכבות.', make: 'ליצור קישור', copy: 'להעתיק', revoke: 'לכבות', copied: 'הועתק',
  },
};

/** A readable title for any assignment. */
export function itemTitle(a: Pick<AssignItem, 'kind' | 'lessonId' | 'ref'>, lang: Lang, t: Strings): string {
  if (a.kind === 'topic') {
    const r = parseTopicRef(a.ref);
    const T = r ? TOPIC_GEN[r.id] : null;
    return T && r ? `${T.title[lang]} · ${T.levels[r.level - 1]?.[lang] ?? r.level}` : a.ref ?? '';
  }
  if (a.kind === 'drill') {
    const id = (a.ref ?? '').replace(/^drill:/, '');
    for (const f of catalog()) for (const l of f.levels) if (l.id === id) return `${f.title[lang]} · ${l.title[lang]}`;
    return id;
  }
  if (a.kind === 'chart') {
    const k = parseChartKind(a.ref ?? '');
    if (!k) return a.ref ?? '';
    const lv = /^lv:(\d+)$/.exec(k.ref);
    const name = lv ? IMPROV_LEVELS.find((x) => x.n === Number(lv[1]))?.title[lang] ?? k.ref : k.ref;
    return `${name} · ${k.mode === 'improv' ? TX[lang].improv : VOICING_NAME[k.voicing]?.[lang] ?? k.voicing}`;
  }
  if (a.kind === 'piece') return a.ref ?? TX[lang].piece;
  return assignmentTitle(a.lessonId, lang, t);
}

// ---------------------------------------------------------------- teacher: assign

export function AssignForm({ classId, lang, t, busy, onAssigned, onError }: { classId: string; lang: Lang; t: Strings; busy: boolean; onAssigned: () => void; onError: (e: string) => void }) {
  const tx = TX[lang];
  const [kind, setKind] = useState<AssignKind>('topic');
  const [lesson, setLesson] = useState<string>(LESSON_ORDER[0]);
  const topics = useMemo(() => Object.keys(TOPIC_GEN).sort((a, b) => TOPIC_GEN[a].title[lang].localeCompare(TOPIC_GEN[b].title[lang])), [lang]);
  const [topic, setTopic] = useState(topics[0]);
  const [topicLv, setTopicLv] = useState(1);
  const levels = useMemo(() => catalog().flatMap((f) => f.levels.map((l) => ({ id: l.id, title: `${f.title[lang]} · ${l.title[lang]}` }))), [lang]);
  const [drill, setDrill] = useState(levels[0]?.id ?? '');
  const [chartLv, setChartLv] = useState(IMPROV_LEVELS[0].n);
  const [voicing, setVoicing] = useState(VOICINGS[0]);
  const [rhythm, setRhythm] = useState(RHYTHMS[0]);
  const [mode, setMode] = useState<'comp' | 'improv'>('comp');
  const [piece, setPiece] = useState('');
  const [strict, setStrict] = useState<Strictness>('moderate');
  const [bpm, setBpm] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState('');
  const ref =
    kind === 'topic' ? `topic:${topic}:${topicLv}` : kind === 'drill' ? `drill:${drill}` : kind === 'chart' ? chartKind(`lv:${chartLv}`, voicing, rhythm, mode) : kind === 'piece' ? piece.trim() : null;
  const can = kind !== 'piece' || piece.trim().length > 0;
  const go = async () => {
    try {
      await assignItem({ classId, kind, lessonId: kind === 'lesson' ? lesson : null, ref, dueOn: due || null, strictness: strict, targetBpm: bpm ? Number(bpm) : null, note });
      setNote('');
      onAssigned();
    } catch (e) {
      onError(String((e as Error).message));
    }
  };
  const nT = TOPIC_GEN[topic]?.levels.length ?? 1;
  return (
    <div className="assign-form2" data-assign-form="1">
      <label className="af-row">
        <span>{tx.kind}</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as AssignKind)} data-assign-kind="1">
          {(['topic', 'lesson', 'drill', 'chart', 'piece'] as const).map((k) => (
            <option key={k} value={k}>
              {tx[k]}
            </option>
          ))}
        </select>
      </label>
      {kind === 'lesson' && (
        <select value={lesson} onChange={(e) => setLesson(e.target.value)} aria-label={tx.lesson}>
          {LESSON_ORDER.map((id, i) => (
            <option key={id} value={id}>
              {i + 1}. {assignmentTitle(id, lang, t)}
            </option>
          ))}
          {EXTRA_ASSIGNABLE.map((id) => (
            <option key={id} value={id}>
              {assignmentTitle(id, lang, t)}
            </option>
          ))}
        </select>
      )}
      {kind === 'topic' && (
        <div className="af-pair">
          <select value={topic} onChange={(e) => (setTopic(e.target.value), setTopicLv(1))} aria-label={tx.topic}>
            {topics.map((id) => (
              <option key={id} value={id}>
                {TOPIC_GEN[id].title[lang]}
              </option>
            ))}
          </select>
          <select value={topicLv} onChange={(e) => setTopicLv(Number(e.target.value))} aria-label={tx.level}>
            {Array.from({ length: nT }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}. {TOPIC_GEN[topic]?.levels[i]?.[lang]}
              </option>
            ))}
          </select>
        </div>
      )}
      {kind === 'drill' && (
        <select value={drill} onChange={(e) => setDrill(e.target.value)} aria-label={tx.drill}>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      )}
      {kind === 'chart' && (
        <div className="af-grid">
          <select value={chartLv} onChange={(e) => setChartLv(Number(e.target.value))} aria-label={tx.chart}>
            {IMPROV_LEVELS.map((l) => (
              <option key={l.n} value={l.n}>
                {l.n}. {l.title[lang]}
              </option>
            ))}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'comp' | 'improv')} aria-label={tx.mode}>
            <option value="comp">{tx.comp}</option>
            <option value="improv">{tx.improv}</option>
          </select>
          <select value={voicing} onChange={(e) => setVoicing(e.target.value as typeof voicing)} aria-label={tx.voicing}>
            {VOICINGS.map((v) => (
              <option key={v} value={v}>
                {VOICING_NAME[v][lang]}
              </option>
            ))}
          </select>
          <select value={rhythm} onChange={(e) => setRhythm(e.target.value as typeof rhythm)} aria-label={tx.rhythm}>
            {RHYTHMS.map((r) => (
              <option key={r} value={r}>
                {RHYTHM_NAME[r][lang]}
              </option>
            ))}
          </select>
        </div>
      )}
      {kind === 'piece' && <input value={piece} maxLength={200} onChange={(e) => setPiece(e.target.value)} placeholder={tx.pieceText} aria-label={tx.pieceText} />}
      <div className="af-grid">
        <label className="af-row">
          <span>{tx.strict}</span>
          <select value={strict} onChange={(e) => setStrict(e.target.value as Strictness)}>
            <option value="lenient">{tx.lenient}</option>
            <option value="moderate">{tx.moderate}</option>
            <option value="strict">{tx.strictS}</option>
          </select>
        </label>
        <label className="af-row">
          <span>{tx.bpm}</span>
          <input type="number" min={20} max={400} inputMode="numeric" value={bpm} onChange={(e) => setBpm(e.target.value)} dir="ltr" />
        </label>
        <label className="af-row">
          <span>{tx.due}</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      </div>
      <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={tx.note} aria-label={tx.note} />
      <button className="btn primary small" disabled={busy || !can} onClick={() => void go()} data-assign-go="1">
        {tx.assign}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- teacher: inbox and heat map

export function GradingInbox({ detail, lang, t, onChanged }: { detail: ClassDetail; lang: Lang; t: Strings; onChanged: () => void }) {
  const tx = TX[lang];
  const items = inboxOf(detail);
  const [text, setText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const send = async (id: string, mark: Mark | null) => {
    setBusy(id);
    try {
      await commentOn(id, text[id] ?? '', mark);
      onChanged();
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="inbox" data-inbox="1">
      <h3>
        {tx.inbox} {items.length ? `(${items.length})` : ''}
      </h3>
      {!items.length && <p className="field-hint">{tx.inboxEmpty}</p>}
      <ul className="inbox-list">
        {items.slice(0, 30).map(({ a, s }) => (
          <li key={s.id} className={passed(a, s) ? 'ok' : 'low'}>
            <div className="ib-head">
              <b>{s.name}</b>
              <span>{itemTitle(a, lang, t)}</span>
              <small dir="ltr">
                {s.score !== null ? `${Math.round(s.score * 100)}%` : '—'} · {s.minutes ?? 0} {tx.min} · {new Date(s.createdAt).toLocaleDateString(lang)}
              </small>
            </div>
            <div className="ib-act">
              <input value={text[s.id] ?? ''} maxLength={500} placeholder={tx.commentPh} onChange={(e) => setText({ ...text, [s.id]: e.target.value })} aria-label={tx.commentPh} />
              {(['great', 'good', 'again'] as const).map((m) => (
                <button key={m} className="btn ghost small" disabled={busy === s.id} onClick={() => void send(s.id, m)} data-mark={m}>
                  {tx[m]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Students × skills: each cell coloured by first-try accuracy; minutes this week; "behind" when the week is empty. */
export function ClassHeatmap({ c, minutes, lang, t }: { c: TeachingClass; minutes: Record<string, number>; lang: Lang; t: Strings }) {
  const tx = TX[lang];
  const shown = SKILLS.filter((k) => c.students.some((s) => s.skills[k]?.n));
  if (!c.students.length) return null;
  const cell = (s: { n: number; correct: number } | undefined) => {
    if (!s?.n) return { bg: 'transparent', txt: '–' };
    const p = s.correct / s.n;
    const hue = Math.round(p * 120); // red → green
    return { bg: `hsl(${hue} 55% 42% / ${0.25 + Math.min(1, s.n / 20) * 0.55})`, txt: `${Math.round(p * 100)}` };
  };
  return (
    <div className="heat" data-heatmap="1">
      <h3>{tx.heat}</h3>
      <small className="field-hint">{tx.heatHint}</small>
      <div className="roster-wrap">
        <table className="roster heat-table">
          <thead>
            <tr>
              <th>{t.nickname}</th>
              <th>{tx.minutes}</th>
              {shown.map((k) => (
                <th key={k} title={t.skillNames[k]}>
                  {t.skillNames[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.students.map((s) => {
              const m = minutes[s.userId] ?? 0;
              const behind = !s.weekXp && !m;
              return (
                <tr key={s.userId} className={behind ? 'behind' : ''}>
                  <td>
                    {s.name}
                    {behind && <small className="behind-tag"> · {tx.behind}</small>}
                  </td>
                  <td dir="ltr">{m}</td>
                  {shown.map((k) => {
                    const x = cell(s.skills[k]);
                    return (
                      <td key={k} style={{ background: x.bg }} dir="ltr">
                        {x.txt}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- student

export function MyAssignmentsList({ items, lang, t, onOpen }: { items: AssignItem[]; lang: Lang; t: Strings; onOpen: (a: AssignItem) => void }) {
  const tx = TX[lang];
  if (!items.length) return null;
  return (
    <section className="set-card my-assign" data-my-assignments="1">
      <h2>{tx.mine}</h2>
      <ul className="assign-list">
        {items.map((a) => {
          const last = a.submissions[0];
          const ok = last ? passed(a, last) : false;
          const said = a.submissions.find((s) => s.comment || s.mark);
          return (
            <li key={a.id} className={ok ? 'done' : ''}>
              <div className="ma-main">
                <b>{itemTitle(a, lang, t)}</b>
                <small>
                  {a.className}
                  {a.targetBpm ? ` · ♩=${a.targetBpm}` : ''}
                  {a.dueOn ? ` · ${t.dueLabel} ${a.dueOn}` : ''}
                  {last ? ` · ${tx.sent} ${Math.round((last.score ?? 0) * 100)}% (${ok ? tx.pass : tx.try})` : ''}
                </small>
                {a.note && <small className="ma-note">{a.note}</small>}
                {said && (
                  <small className="ma-teacher">
                    {tx.teacherSays}: {said.mark ? `${tx[said.mark]} — ` : ''}
                    {said.comment ?? ''}
                  </small>
                )}
              </div>
              {a.kind !== 'piece' && (
                <button className="btn ghost small" onClick={() => onOpen(a)} data-open-assignment={a.id}>
                  {tx.open}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ParentLinkCard({ lang }: { lang: Lang }) {
  const tx = TX[lang];
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    try {
      const tok = await createDigestLink();
      setLink(`${location.origin}${location.pathname}#/digest/${tok}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="set-card parent-link" data-parent-link="1">
      <h2>{tx.parent}</h2>
      <p className="field-hint">{tx.parentHint}</p>
      {link ? (
        <div className="pl-row">
          <input readOnly value={link} dir="ltr" aria-label={tx.parent} onFocus={(e) => e.target.select()} />
          <button
            className="btn ghost small"
            onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => setCopied(true));
            }}
          >
            {copied ? tx.copied : tx.copy}
          </button>
          <button className="btn ghost small" onClick={() => void revokeDigestLink().then(() => setLink(null))}>
            {tx.revoke}
          </button>
        </div>
      ) : (
        <button className="btn ghost small" disabled={busy} onClick={() => void make()} data-make-parent-link="1">
          {tx.make}
        </button>
      )}
    </section>
  );
}

/** The parent page (#/digest/<token>): no sign-in. */
export function DigestScreen({ token, lang, t, onHome }: { token: string; lang: Lang; t: Strings; onHome: () => void }) {
  const [d, setD] = useState<Digest | null | 'none'>(null);
  useEffect(() => {
    void readDigest(token).then((x) => setD(x ?? 'none'), () => setD('none'));
  }, [token]);
  const he = lang === 'he';
  return (
    <main className="panel-screen digest" data-digest="1">
      <header className="screen-head">
        <h1>{he ? 'סיכום שבועי' : 'Weekly summary'}</h1>
      </header>
      {d === null && <p className="field-hint">…</p>}
      {d === 'none' && <p className="set-card">{he ? 'הקישור לא פעיל.' : 'This link is not active.'}</p>}
      {d && d !== 'none' && (
        <>
          <h2>{d.name}</h2>
          <div className="digest-stats">
            <div>
              <b>{d.days}</b>
              <small>{he ? 'ימי אימון השבוע' : 'days practiced this week'}</small>
            </div>
            <div>
              <b>{d.sessions}</b>
              <small>{he ? 'אימונים' : 'sessions'}</small>
            </div>
            <div>
              <b>{d.streak}</b>
              <small>{he ? 'ימים ברצף' : 'day streak'}</small>
            </div>
            <div>
              <b>{d.xp}</b>
              <small>XP</small>
            </div>
            {d.minutes > 0 && (
              <div>
                <b>{d.minutes}</b>
                <small>{he ? 'דקות במשימות' : 'minutes on assignments'}</small>
              </div>
            )}
          </div>
          {d.mastered.length > 0 && (
            <section className="set-card">
              <h3>{he ? 'נשלט החודש' : 'Mastered this month'}</h3>
              <p>{d.mastered.map((k) => t.skillNames[k as keyof Strings['skillNames']] ?? k).join(' · ')}</p>
            </section>
          )}
          {d.comments.length > 0 && (
            <section className="set-card">
              <h3>{he ? 'מהמורה' : 'From the teacher'}</h3>
              <ul className="assign-list">
                {d.comments.map((c, i) => (
                  <li key={i}>
                    <span>{c.comment}</span>
                    <small dir="ltr">{new Date(c.at).toLocaleDateString(lang)}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <button className="btn ghost small" onClick={onHome}>
        {he ? 'לאפליקציה' : 'Open the app'}
      </button>
    </main>
  );
}
