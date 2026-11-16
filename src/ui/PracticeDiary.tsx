// Practice diary (AUDIT-5 §4 #1–#5): measured practice time, the quality ledger, plateaus and the journal on one
// screen with three tabs. Time: active, idle-trimmed minutes per week, course, kind, skill and key (engine/
// practiceTime.ts). Quality: how much of it was deliberate (edge + consolidation), how clean each item's takes were
// day by day, and the plateau detector's suggestions (engine/plateau.ts). Journal: one entry per day — what was
// played and the player's notes, searchable (engine/journal.ts).

import { useMemo, useState, type ReactNode } from 'react';
import { useLedger } from './useLedger';
import { courseOf, type CourseId } from '../engine/courses';
import { journalDays, latestNext, searchJournal, type JournalDay } from '../engine/journal';
import { brokeThrough, detectPlateaus, type PlateauFinding } from '../engine/plateau';
import { addDay, measuredMsOn, qualityRatio, STREAK_MIN_MS, summarize, weekStart, weekTotals, type PracticeKind, type PracticeLedger, type Quality } from '../engine/practiceTime';
import { WEEKLY_TARGETS, weekCovers } from '../engine/streak';
import { familyById } from '../engine/drills/plan';
import { weekId } from '../engine/adaptive';
import { LOG_NAME, type LogKind } from '../engine/practiceLog';
import type { FamilyId } from '../engine/drills/types';
import { addJournalNote, deleteJournalNote } from '../storage/practice';
import { localDay, practiceDays, type Progress } from '../storage/progress';
import { fmtDuration } from './Stats';
import { fmtDay } from './Trends';
import { DayRecordings, RIcon } from './Recordings';
import { RX } from '../i18n/recordingsText';
import { Icon } from './icons';

type Lang = 'en' | 'he';
type L = { en: string; he: string };
const N = ({ children }: { children: ReactNode }) => <bdi dir="ltr">{children}</bdi>;
/** Latin runs in a label (key names, titles) go in <bdi dir="ltr"> so Hebrew lines stay ordered. */
const Bidi = ({ text }: { text: string }) => {
  const parts = text.split(/([A-Za-z][A-Za-z0-9♭♯#'’.\-–]*(?:\s+[A-Za-z0-9♭♯#'’.\-–]+)*)/);
  return <>{parts.map((x, i) => (i % 2 ? <N key={i}>{x}</N> : x))}</>;
};
/** A duration in the reader's language, isolated (Hebrew "1 ש׳ 5 דק׳" keeps its order); Stats uses the same (Stats.Dur). */
export const dur = (ms: number, lang: Lang) => (ms <= 0 ? '0' : fmtDuration(ms, lang));
const Dur = ({ ms, lang }: { ms: number; lang: Lang }) => <bdi>{dur(ms, lang)}</bdi>;
const KEY_N = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export const DX = {
  title: { en: 'Practice diary', he: 'יומן אימון' },
  back: { en: 'Back', he: 'חזרה' },
  tabs: { time: { en: 'Time', he: 'זמן' }, quality: { en: 'Quality', he: 'איכות' }, journal: { en: 'Journal', he: 'יומן' } },
  frames: { week: { en: 'This week', he: 'השבוע' }, last: { en: 'Last week', he: 'שבוע שעבר' }, d30: { en: '30 days', he: '30 יום' } },
  inApp: { en: 'measured in the app', he: 'נמדד באפליקציה' },
  offApp: { en: 'logged away from it', he: 'נרשם מחוץ לה' },
  none: { en: 'No practice measured here yet. The clock runs while you play: lessons, technique, games, songs.', he: 'עדיין לא נמדד כאן אימון. השעון רץ בזמן שמנגנים: שיעורים, טכניקה, משחקים, שירים.' },
  idle: { en: 'Time pauses after a minute without input.', he: 'הזמן נעצר אחרי דקה בלי קלט.' },
  weeks: { en: 'Last 8 weeks', he: '8 השבועות האחרונים' },
  byCourse: { en: 'By course', he: 'לפי קורס' },
  byKind: { en: 'By kind', he: 'לפי סוג' },
  bySkill: { en: 'By skill and key', he: 'לפי מיומנות וסולם' },
  streakRule: { en: 'What counts as a practice day', he: 'מה נחשב יום אימון' },
  streakHint: { en: 'A take, a finished session, or 5 measured minutes. Logged minutes count as time, not as a streak day.', he: 'טייק, אימון שהושלם, או 5 דקות שנמדדו. דקות שנרשמו נספרות כזמן, לא כיום ברצף.' },
  everyDay: { en: 'Every day', he: 'כל יום' },
  perWeek: { en: '{n} a week', he: '{n} בשבוע' },
  weekNow: { en: 'This week: {d} of {n} days', he: 'השבוע: {d} מתוך {n} ימים' },
  restOk: { en: 'Days off are rest days while the week makes its target.', he: 'ימי חופש הם ימי מנוחה כל עוד השבוע עומד ביעד.' },
  todayMeasured: { en: 'Today: {m} measured', he: 'היום: {m} נמדדו' },
  quality: { en: 'Quality minutes', he: 'דקות איכות' },
  qualityHint: { en: 'At the edge of what you can play, or clean reps at the goal.', he: 'בקצה של מה שאתם מסוגלים לנגן, או חזרות נקיות ביעד.' },
  share: { en: '{p} of the time in the app', he: '{p} מהזמן באפליקציה' },
  q: { edge: { en: 'At the edge', he: 'בקצה' }, consolidation: { en: 'Clean at the goal', he: 'נקי ביעד' }, review: { en: 'Review', he: 'חזרה' }, run: { en: 'Run-through', he: 'ניגון חופשי' }, offapp: { en: 'Away from the app', he: 'מחוץ לאפליקציה' } } as Record<Quality, L>,
  ledger: { en: 'How clean, day by day', he: 'כמה נקי, יום אחרי יום' },
  ledgerHint: { en: 'Each square is a day: the share of clean takes.', he: 'כל ריבוע הוא יום: חלק הטייקים הנקיים.' },
  takes: { en: '{n} takes · {c} clean', he: '{n} טייקים · {c} נקיים' },
  noLedger: { en: 'Play a few takes and they show here.', he: 'נגנו כמה טייקים והם יופיעו כאן.' },
  plateaus: { en: 'Stuck or slipping', he: 'תקוע או נשחק' },
  noPlateaus: { en: 'Nothing has stalled. A plateau shows after three weeks of practice with no gain.', he: 'שום דבר לא נתקע. מישור מופיע אחרי שלושה שבועות של אימון בלי שיפור.' },
  journal: { en: 'Journal', he: 'יומן' },
  write: { en: 'What did you work on?', he: 'על מה עבדתם?' },
  asNext: { en: 'Next time', he: 'לפעם הבאה' },
  save: { en: 'Save', he: 'שמירה' },
  search: { en: 'Search notes and pieces', he: 'חיפוש בהערות וביצירות' },
  next: { en: 'Next', he: 'הבא' },
  more: { en: 'Show more', he: 'עוד' },
  del: { en: 'Delete note', he: 'מחיקת הערה' },
  noMatch: { en: 'Nothing matches.', he: 'אין התאמה.' },
  noJournal: { en: 'Your days show here: what you played, the tempos you gained, your notes.', he: 'כאן יופיעו הימים שלכם: מה ניגנתם, אילו טמפו הרווחתם, וההערות שלכם.' },
  qMin: { en: '{m} quality', he: '{m} איכות' },
  away: { en: 'away', he: 'מחוץ לאפליקציה' },
  srcWorkout: { en: 'Workout', he: 'אימון' },
  srcLog: { en: 'Log', he: 'רישום' },
  kinds: {
    lesson: { en: 'Lessons', he: 'שיעורים' },
    technique: { en: 'Technique', he: 'טכניקה' },
    game: { en: 'Games', he: 'משחקים' },
    ear: { en: 'Transcribing', he: 'תמלול' },
    vocal: { en: 'Voice', he: 'קול' },
    song: { en: 'Songs', he: 'שירים' },
    chart: { en: 'Charts', he: 'דפי אקורדים' },
    piece: { en: 'Pieces', he: 'יצירות' },
    improv: { en: 'Improvising', he: 'אלתור' },
    tool: { en: 'Metronome and drone', he: 'מטרונום וצליל רקע' },
    offapp: { en: 'Away from the app', he: 'מחוץ לאפליקציה' },
  } as Record<PracticeKind, L>,
  // plateau cards
  plateau: { en: 'Flat for 3 weeks', he: 'ללא שיפור 3 שבועות' },
  fading: { en: 'Slipping', he: 'נשחק' },
  bpmLine: { en: 'Clean ♩ {now} · best before ♩ {best}', he: 'נקי ♩ {now} · שיא קודם ♩ {best}' },
  shareLine: { en: 'Clean {now}% · before {best}%', he: 'נקי {now}% · קודם {best}%' },
  ratingLine: { en: 'Level {now} · best {best}', he: 'רמה {now} · שיא {best}' },
  how: {
    slower: { en: 'Step back on the tempo ladder: 85 % of your clean tempo, then climb.', he: 'צעד אחורה בסולם הטמפו: 85% מהטמפו הנקי, ואז לטפס.' },
    key: { en: 'Change the key: the same pattern somewhere fresh.', he: 'החליפו סולם: אותה תבנית במקום חדש.' },
    loop: { en: 'Loop the weak bars: play it once, then tap the worst bar on the error map.', he: 'לופ על התיבות החלשות: נגנו פעם אחת, ואז הקישו על התיבה הכי חלשה במפת הטעויות.' },
    mix: { en: 'Change the task: mix it into a workout with other skills.', he: 'שנו את המשימה: שלבו אותה באימון עם מיומנויות אחרות.' },
  },
  go: { slower: { en: 'Slower', he: 'לאט יותר' }, key: { en: 'Other key', he: 'סולם אחר' }, loop: { en: 'Open', he: 'פתיחה' }, mix: { en: 'Workout', he: 'אימון' } },
  broke: { en: 'Broke through since {d}', he: 'פרצתם מאז {d}' },
  tried: { en: 'Tried: {h}', he: 'ניסיתם: {h}' },
};

export { useLedger };

/** A readable name for a ledger item id: "d:<drill item>", "l:<lesson>", "g:<game>". */
export function itemLabel(id: string, lang: Lang, progress: Progress, extra?: (id: string) => string | null): string {
  const x = extra?.(id);
  if (x) return x;
  if (id.startsWith('d:')) {
    const st = progress.drillItems?.[id.slice(2)];
    if (!st) return id.slice(2);
    const f = familyById(st.family as FamilyId);
    return `${f ? f.title[lang] : st.family} · ${KEY_N[((st.key % 12) + 12) % 12]}`;
  }
  return id.slice(2);
}

const skillLabel = (skill: string, lang: Lang, skillNames: Record<string, string>, extra?: (id: string) => string | null): string => {
  const f = familyById(skill as FamilyId);
  if (f) return f.title[lang];
  if (skillNames[skill]) return skillNames[skill];
  if (skill in LOG_NAME) return LOG_NAME[skill as LogKind][lang];
  return extra?.(`g:${skill}`) ?? skill;
};

const Q_ORDER: Quality[] = ['edge', 'consolidation', 'review', 'run', 'offapp'];

function QualityBar({ by, lang }: { by: Record<Quality, number>; lang: Lang }) {
  const total = Q_ORDER.reduce((a, q) => a + by[q], 0);
  if (!total) return null;
  return (
    <>
      <div className="pd-qbar" role="img" aria-label={Q_ORDER.filter((q) => by[q] > 0).map((q) => `${DX.q[q][lang]} ${Math.round((100 * by[q]) / total)}%`).join(', ')}>
        {Q_ORDER.filter((q) => by[q] > 0).map((q) => (
          <i key={q} className={`pd-q-${q}`} style={{ flexGrow: by[q] }} />
        ))}
      </div>
      <ul className="pd-legend">
        {Q_ORDER.filter((q) => by[q] > 0).map((q) => (
          <li key={q}>
            <i className={`pd-sw pd-q-${q}`} aria-hidden="true" />
            <span>{DX.q[q][lang]}</span>
            <b>
              <Dur ms={by[q]} lang={lang} />
            </b>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Eight weeks as columns: deliberate time at the foot, the rest of the app time above, logged time on top. */
function WeekColumns({ l, today, lang, course }: { l: PracticeLedger; today: string; lang: Lang; course?: CourseId }) {
  const ws = weekTotals(l, today, 8, course);
  const max = Math.max(...ws.map((w) => w.ms), 1);
  if (!ws.some((w) => w.ms > 0)) return null;
  const W = 300;
  const H = 96;
  const cw = W / ws.length;
  return (
    <svg className="pd-weeks" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={ws.map((w) => `${fmtDay(w.week, lang)} ${fmtDuration(w.ms, lang)}`).join(', ')} style={{ direction: 'ltr' }}>
      {ws.map((w, i) => {
        const x = i * cw + cw * 0.18;
        const bw = cw * 0.64;
        const hq = (w.quality / max) * H;
        const hr = ((w.inApp - w.quality) / max) * H;
        const ho = ((w.ms - w.inApp) / max) * H;
        return (
          <g key={w.week}>
            <rect className="pd-col-q" x={x} y={H - hq} width={bw} height={hq} />
            <rect className="pd-col-r" x={x} y={H - hq - hr} width={bw} height={hr} />
            <rect className="pd-col-o" x={x} y={H - hq - hr - ho} width={bw} height={ho} />
            <text x={x + bw / 2} y={H + 13} textAnchor="middle" className="pd-col-lab">
              {w.week.slice(8)}/{Number(w.week.slice(5, 7))}
            </text>
          </g>
        );
      })}
      <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} className="pd-axis" />
    </svg>
  );
}

function Rows({ rows, lang }: { rows: { k: string; label: ReactNode; ms: number; sub?: ReactNode }[]; lang: Lang }) {
  const total = rows.reduce((a, r) => a + r.ms, 0) || 1;
  return (
    <ul className="pd-rows">
      {rows.map((r) => (
        <li key={r.k} data-pd-row={r.k}>
          <span className="pd-row-main">
            <span className="pd-row-label">{r.label}</span>
            {r.sub && <small>{r.sub}</small>}
          </span>
          <b>
            <Dur ms={r.ms} lang={lang} />
          </b>
          <span className="pd-share" aria-hidden="true">
            <i style={{ width: `${Math.max(3, (100 * r.ms) / total)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

type Frame = 'week' | 'last' | 'd30';
const rangeOf = (f: Frame, today: string): [string, string] => {
  const w = weekStart(today);
  return f === 'week' ? [w, today] : f === 'last' ? [addDay(w, -7), addDay(w, -1)] : [addDay(today, -29), today];
};

function TimeTab({ lang, l, progress, today, skillNames, label, weeklyTarget, onWeekly, multiCourse }: { lang: Lang; l: PracticeLedger; progress: Progress; today: string; skillNames: Record<string, string>; label: (id: string) => string | null; weeklyTarget: number; onWeekly: (n: number) => void; multiCourse: boolean }) {
  const [frame, setFrame] = useState<Frame>('week');
  const [from, to] = rangeOf(frame, today);
  const s = useMemo(() => summarize(l, from, to), [l, from, to]);
  const he = lang === 'he';
  const days = practiceDays(progress);
  const w0 = weekStart(today);
  let doneThisWeek = 0;
  for (let i = 0; i < 7; i++) if (days.has(addDay(w0, i)) && addDay(w0, i) <= today) doneThisWeek++;
  const skills = Object.entries(s.bySkill)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, ms]) => {
      const keys = Object.entries(s.byKey)
        .filter(([kk]) => kk.startsWith(`${k}|`))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([kk, m]) => (
          <span key={kk} className="pd-keyt">
            <N>{KEY_N[Number(kk.split('|')[1])]}</N> <Dur ms={m} lang={lang} />
          </span>
        ));
      return { k, label: <Bidi text={skillLabel(k, lang, skillNames, label)} />, ms, sub: keys.length ? <>{keys}</> : undefined };
    });
  return (
    <div className="pd-tab" data-pd-tab="time">
      <div className="chips" role="group" aria-label={DX.tabs.time[lang]}>
        {(Object.keys(DX.frames) as Frame[]).map((f) => (
          <button key={f} className={`chip ${frame === f ? 'on' : ''}`} aria-pressed={frame === f} onClick={() => setFrame(f)} data-pd-frame={f}>
            {DX.frames[f][lang]}
          </button>
        ))}
      </div>
      <section className="set-card pd-hero">
        <b className="pd-big" data-pd-total={Math.round(s.ms / 1000)}>
          <Dur ms={s.ms} lang={lang} />
        </b>
        <small>
          <Dur ms={s.inApp} lang={lang} /> {DX.inApp[lang]}
          {s.offApp > 0 && (
            <>
              {' · '}
              <Dur ms={s.offApp} lang={lang} /> {DX.offApp[lang]}
            </>
          )}
        </small>
        {!s.ms && <p className="field-hint">{DX.none[lang]}</p>}
        <WeekColumns l={l} today={today} lang={lang} />
        <small className="field-hint">{DX.idle[lang]}</small>
      </section>
      {multiCourse && Object.keys(s.byCourse).length > 1 && (
        <section className="set-card">
          <h2>{DX.byCourse[lang]}</h2>
          <Rows lang={lang} rows={Object.entries(s.byCourse).sort((a, b) => b[1] - a[1]).map(([c, ms]) => ({ k: c || 'none', label: c ? courseOf(c).name[lang] : '—', ms }))} />
        </section>
      )}
      {Object.keys(s.byKind).length > 0 && (
        <section className="set-card">
          <h2>{DX.byKind[lang]}</h2>
          <Rows lang={lang} rows={Object.entries(s.byKind).sort((a, b) => b[1] - a[1]).map(([k, ms]) => ({ k, label: DX.kinds[k as PracticeKind][lang], ms }))} />
        </section>
      )}
      {skills.length > 0 && (
        <section className="set-card">
          <h2>{DX.bySkill[lang]}</h2>
          <Rows lang={lang} rows={skills} />
        </section>
      )}
      {/* §6.7: the span's recordings, day by day (compact rows into the player). */}
      <DayRecordings lang={lang} from={from} to={to} asCard />
      <section className="set-card" data-pd-streak={weeklyTarget || 'daily'}>
        <h2>{DX.streakRule[lang]}</h2>
        <small className="field-hint">{DX.streakHint[lang]}</small>
        <div className="chips wrap" role="group" aria-label={DX.streakRule[lang]}>
          <button className={`chip ${!weeklyTarget ? 'on' : ''}`} aria-pressed={!weeklyTarget} onClick={() => onWeekly(0)} data-pd-weekly="0">
            {DX.everyDay[lang]}
          </button>
          {WEEKLY_TARGETS.map((n) => (
            <button key={n} className={`chip ${weeklyTarget === n ? 'on' : ''}`} aria-pressed={weeklyTarget === n} onClick={() => onWeekly(n)} data-pd-weekly={n}>
              {fill(DX.perWeek[lang], { n })}
            </button>
          ))}
        </div>
        {weeklyTarget > 0 && (
          <p className="pd-line">
            {fill(DX.weekNow[lang], { d: doneThisWeek, n: weeklyTarget })}
            {weekCovers(days, today, today, weeklyTarget) && <small className="field-hint"> {DX.restOk[lang]}</small>}
          </p>
        )}
        <p className="pd-line">
          {fill(DX.todayMeasured[lang], { m: dur(measuredMsOn(l, today), lang) })}
          {measuredMsOn(l, today) < STREAK_MIN_MS && !days.has(today) && <small className="field-hint"> ({he ? `${Math.ceil((STREAK_MIN_MS - measuredMsOn(l, today)) / 60000)} דק׳ ליום אימון` : `${Math.ceil((STREAK_MIN_MS - measuredMsOn(l, today)) / 60000)} min to a practice day`})</small>}
        </p>
      </section>
    </div>
  );
}

/** One day's cleanness: a flat square per day, darker teal = cleaner (never colour alone: the title says the share). */
function CleanStrip({ rows, lang }: { rows: { d: string; n: number; c: number; of: number }[]; lang: Lang }) {
  return (
    <span className="pd-strip" style={{ direction: 'ltr' }}>
      {rows.map((r) => {
        const sh = r.of ? r.c / r.of : 0;
        const cls = sh >= 0.8 ? 'hi' : sh >= 0.5 ? 'mid' : sh > 0 ? 'lo' : 'none';
        return <i key={r.d} className={`pd-sq ${cls}`} title={`${fmtDay(r.d, lang)}: ${Math.round(sh * 100)}%`} />;
      })}
    </span>
  );
}

export function PlateauCards({ findings, lang, progress, skillNames, label, tries, onAct }: { findings: PlateauFinding[]; lang: Lang; progress: Progress; skillNames: Record<string, string>; label?: (id: string) => string | null; tries?: PracticeLedger['tries']; onAct?: (f: PlateauFinding) => void }) {
  // Suggestions that paid off since (a plateau item whose clean tempo rose ≥ 5 % above the tried base).
  const wins = (tries ?? [])
    .filter((t) => !t.id.startsWith('skill:'))
    .map((t) => ({ t, st: progress.drillItems?.[t.id] }))
    .filter((x) => x.st && brokeThrough(x.t, x.st.cleanBpm))
    .slice(-3);
  if (!findings.length && !wins.length) return <p className="field-hint">{DX.noPlateaus[lang]}</p>;
  return (
    <ul className="in-list pd-plateaus">
      {findings.map((f) => {
        const name = f.scope === 'item' ? itemLabel(`d:${f.id}`, lang, progress, label) : (skillNames[f.id] ?? f.id);
        const line = f.scope === 'skill' ? DX.ratingLine : f.how === 'loop' && f.kind === 'fading' ? DX.shareLine : DX.bpmLine;
        return (
          <li key={`${f.scope}:${f.id}`} data-plateau={f.kind} data-plateau-how={f.how}>
            <span className="in-text">
              <b><Bidi text={name} /></b>
              <small>
                <span className={`pd-tag ${f.kind}`}>{f.kind === 'plateau' ? DX.plateau[lang] : DX.fading[lang]}</span> <bdi>{fill(line[lang], { now: f.now || '—', best: f.best || '—' })}</bdi>
              </small>
              <small>{DX.how[f.how][lang]}</small>
              {f.tried && <small className="field-hint">{fill(DX.tried[lang], { h: DX.go[f.tried.how as keyof typeof DX.go]?.[lang] ?? f.tried.how })}</small>}
            </span>
            {onAct && (
              <button className="btn small" onClick={() => onAct(f)} data-plateau-go={f.how}>
                {DX.go[f.how][lang]}
              </button>
            )}
          </li>
        );
      })}
      {wins.map(({ t }) => (
        <li key={`win:${t.id}`} data-plateau-broke={t.id}>
          <span className="in-text">
            <b><Bidi text={itemLabel(`d:${t.id}`, lang, progress, label)} /></b>
            <small>{fill(DX.broke[lang], { d: fmtDay(t.at.slice(0, 10), lang) })}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

function QualityTab({ lang, l, progress, today, skillNames, label, findings, onPlateau }: { lang: Lang; l: PracticeLedger; progress: Progress; today: string; skillNames: Record<string, string>; label: (id: string) => string | null; findings: PlateauFinding[]; onPlateau?: (f: PlateauFinding) => void }) {
  const [frame, setFrame] = useState<Frame>('week');
  const [from, to] = rangeOf(frame, today);
  const s = useMemo(() => summarize(l, from, to), [l, from, to]);
  const r = qualityRatio(s);
  const since = addDay(today, -27);
  const items = Object.entries(l.items)
    .map(([id, rows]) => ({ id, rows: rows.filter((x) => x.d >= since) }))
    .filter((x) => x.rows.length)
    .sort((a, b) => b.rows[b.rows.length - 1].d.localeCompare(a.rows[a.rows.length - 1].d) || b.rows.length - a.rows.length)
    .slice(0, 12);
  return (
    <div className="pd-tab" data-pd-tab="quality">
      <div className="chips" role="group" aria-label={DX.tabs.quality[lang]}>
        {(Object.keys(DX.frames) as Frame[]).map((f) => (
          <button key={f} className={`chip ${frame === f ? 'on' : ''}`} aria-pressed={frame === f} onClick={() => setFrame(f)}>
            {DX.frames[f][lang]}
          </button>
        ))}
      </div>
      <section className="set-card pd-hero">
        <small>{DX.quality[lang]}</small>
        <b className="pd-big" data-pd-quality={Math.round(s.quality / 1000)}>
          <Dur ms={s.quality} lang={lang} />
        </b>
        {r !== null && <small>{fill(DX.share[lang], { p: `${Math.round(r * 100)}%` })}</small>}
        <small className="field-hint">{DX.qualityHint[lang]}</small>
        <QualityBar by={s.byQuality} lang={lang} />
      </section>
      <section className="set-card" data-pd-plateaus={findings.length}>
        <h2>{DX.plateaus[lang]}</h2>
        <PlateauCards findings={findings} lang={lang} progress={progress} skillNames={skillNames} label={label} tries={l.tries} onAct={onPlateau} />
      </section>
      <section className="set-card" data-pd-ledger={items.length}>
        <h2>{DX.ledger[lang]}</h2>
        <small className="field-hint">{DX.ledgerHint[lang]}</small>
        {items.length ? (
          <ul className="pd-items">
            {items.map(({ id, rows }) => {
              const n = rows.reduce((a, x) => a + x.n, 0);
              const c = rows.reduce((a, x) => a + x.c, 0);
              const of = rows.reduce((a, x) => a + x.of, 0);
              const b = rows.reduce((a, x) => Math.max(a, x.b ?? 0), 0);
              const isLesson = id.startsWith('l:');
              return (
                <li key={id} data-pd-item={id}>
                  <span className="in-text">
                    <b><Bidi text={itemLabel(id, lang, progress, label)} /></b>
                    <small>
                      {isLesson ? <N>{`${c}/${of}`}</N> : <bdi>{fill(DX.takes[lang], { n, c })}</bdi>}
                      {b > 0 && (
                        <>
                          {' · '}
                          <N>♩ {b}</N>
                        </>
                      )}
                    </small>
                  </span>
                  <CleanStrip rows={rows.slice(-10)} lang={lang} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="field-hint">{DX.noLedger[lang]}</p>
        )}
      </section>
    </div>
  );
}

function DayEntry({ d, lang, progress, label, onDelete }: { d: JournalDay; lang: Lang; progress: Progress; label: (id: string) => string | null; onDelete: (id: string) => void }) {
  const items = d.items.slice(0, 6);
  const offApp = d.sessions.filter((s) => s.offApp);
  return (
    <li className="pd-day" data-pd-day={d.day}>
      <div className="pd-day-head">
        <b>{fmtDay(d.day, lang, true)}</b>
        <small>
          {d.ms > 0 && <Dur ms={d.ms} lang={lang} />}
          {d.quality > 0 && (
            <>
              {' · '}
              <bdi>{fill(DX.qMin[lang], { m: dur(d.quality, lang) })}</bdi>
            </>
          )}
        </small>
      </div>
      {items.length > 0 && (
        <ul className="pd-day-items">
          {items.map((it) => (
            <li key={it.id}>
              <span><Bidi text={itemLabel(it.id, lang, progress, label)} /></span>
              <small>
                <N>
                  {it.id.startsWith('l:') ? `${it.c}/${it.of}` : `${it.c}/${it.n}`}
                  {it.b ? ` · ♩ ${it.b}` : ''}
                  {it.gain ? ` (+${it.gain})` : ''}
                </N>
              </small>
            </li>
          ))}
        </ul>
      )}
      {offApp.map((s) => (
        <div key={s.sessionId}>
          <p className="pd-off">
            <small>
              <Dur ms={s.total * 60000} lang={lang} /> {DX.away[lang]}
            </small>
          </p>
          {/* A note kept on an older log entry (before the diary booked it as a note of its own). */}
          {s.note && !d.notes.some((n) => n.id === `r:${s.sessionId}`) && (
            <div className="pd-note" data-pd-note={`r:${s.sessionId}`}>
              <p dir="auto">{s.note}</p>
              <small className="field-hint">{DX.srcLog[lang]}</small>
            </div>
          )}
        </div>
      ))}
      <DayRecordings lang={lang} from={d.day} perDay={4} />
      {d.notes.map((n) => (
        <div key={n.id} className={`pd-note ${n.next ? 'next' : ''}`} data-pd-note={n.id}>
          <p dir="auto">
            {n.next && <b>{DX.asNext[lang]}: </b>}
            {n.text}
          </p>
          {n.src && n.src !== 'diary' && <small className="field-hint">{n.src === 'workout' ? DX.srcWorkout[lang] : DX.srcLog[lang]}</small>}
          {(!n.src || n.src === 'diary') && (
            <button className="icon-btn pd-del" onClick={() => onDelete(n.id)} aria-label={DX.del[lang]}>
              <Icon k="close" />
            </button>
          )}
        </div>
      ))}
    </li>
  );
}

const DRAFT_KEY = 'toneturn.diary.draft';
function JournalTab({ lang, l, progress, label, course }: { lang: Lang; l: PracticeLedger; progress: Progress; label: (id: string) => string | null; course?: CourseId }) {
  // Never lose progress: the unsent note survives Back and a reload.
  const [text, setText] = useState<string>(() => {
    try {
      return sessionStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(DRAFT_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [asNext, setAsNext] = useState(false);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(10);
  const setDraft = (v: string) => {
    setText(v);
    try {
      localStorage.setItem(DRAFT_KEY, v);
    } catch {
      /* private mode */
    }
  };
  const days = useMemo(() => journalDays(l, progress.history, (iso) => localDay(new Date(iso))), [l, progress.history]);
  const found = useMemo(() => searchJournal(days, q, (id) => itemLabel(id, lang, progress, label)), [days, q, lang, progress, label]);
  const nx = latestNext(l);
  const save = () => {
    if (!text.trim()) return;
    addJournalNote(text, { next: asNext, course: course ?? null });
    setDraft('');
    setAsNext(false);
  };
  return (
    <div className="pd-tab" data-pd-tab="journal">
      {nx && (
        <section className="set-card pd-next" data-pd-next="1">
          <small>{DX.next[lang]}</small>
          <p dir="auto">{nx.text}</p>
        </section>
      )}
      <section className="set-card pd-write">
        <label className="sr-only" htmlFor="pd-note">
          {DX.write[lang]}
        </label>
        <textarea id="pd-note" className="pd-text" rows={2} maxLength={500} placeholder={DX.write[lang]} value={text} onChange={(e) => setDraft(e.target.value)} data-pd-input="1" dir="auto" />
        <div className="pd-write-row">
          <label className="toggle-row">
            <input type="checkbox" checked={asNext} onChange={(e) => setAsNext(e.target.checked)} data-pd-asnext="1" />
            <span>{DX.asNext[lang]}</span>
          </label>
          <button className="btn small primary" disabled={!text.trim()} onClick={save} data-pd-save="1">
            {DX.save[lang]}
          </button>
        </div>
      </section>
      <input className="pd-search" type="search" placeholder={DX.search[lang]} aria-label={DX.search[lang]} value={q} onChange={(e) => (setQ(e.target.value), setShown(10))} data-pd-search="1" dir="auto" />
      {!days.length ? (
        <p className="field-hint">{DX.noJournal[lang]}</p>
      ) : !found.length ? (
        <p className="field-hint">{DX.noMatch[lang]}</p>
      ) : (
        <ul className="pd-days">
          {found.slice(0, shown).map((d) => (
            <DayEntry key={d.day} d={d} lang={lang} progress={progress} label={label} onDelete={(id) => deleteJournalNote(id)} />
          ))}
        </ul>
      )}
      {found.length > shown && (
        <button className="btn small ghost" onClick={() => setShown((n) => n + 10)}>
          {DX.more[lang]}
        </button>
      )}
    </div>
  );
}

type Tab = 'time' | 'quality' | 'journal';
const TAB_KEY = 'toneturn.diary.tab';

export function PracticeDiaryScreen({
  lang,
  progress,
  skillNames,
  label,
  course,
  weeklyTarget = 0,
  onWeekly,
  onBack,
  onPlateau,
  initialTab,
}: {
  lang: Lang;
  progress: Progress;
  skillNames: Record<string, string>;
  /** App-side names (lesson titles, game names) for ledger ids. */
  label: (id: string) => string | null;
  course?: CourseId;
  weeklyTarget?: number;
  onWeekly: (n: number) => void;
  onBack: () => void;
  onPlateau?: (f: PlateauFinding) => void;
  initialTab?: Tab;
}) {
  const l = useLedger();
  const [tab, setTabS] = useState<Tab>(() => {
    if (initialTab) return initialTab;
    try {
      const v = sessionStorage.getItem(TAB_KEY);
      return v === 'quality' || v === 'journal' ? v : 'time';
    } catch {
      return 'time';
    }
  });
  const setTab = (t: Tab) => {
    setTabS(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignore */
    }
  };
  const today = localDay(new Date());
  const findings = useMemo(() => plateausOf(progress, l, today), [progress, l, today]);
  const multiCourse = new Set(Object.values(l.days).flatMap((b) => Object.keys(b).map((k) => k.split('|')[0]))).size > 1;
  return (
    <main className="panel-screen pdiary" data-practice-diary="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={DX.back[lang]}>
          <Icon k="back" />
        </button>
        <h1>{DX.title[lang]}</h1>
        <a className="icon-btn small pd-rec" href="#/recordings" aria-label={RX.title[lang]} title={RX.title[lang]} data-open-recordings="diary">
          <RIcon k="voice" />
        </a>
      </header>
      <div className="ps-seg" role="tablist" aria-label={DX.title[lang]}>
        {(['time', 'quality', 'journal'] as Tab[]).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)} data-pd-tabbtn={x}>
            {DX.tabs[x][lang]}
          </button>
        ))}
      </div>
      {tab === 'time' && <TimeTab lang={lang} l={l} progress={progress} today={today} skillNames={skillNames} label={label} weeklyTarget={weeklyTarget} onWeekly={onWeekly} multiCourse={multiCourse} />}
      {tab === 'quality' && <QualityTab lang={lang} l={l} progress={progress} today={today} skillNames={skillNames} label={label} findings={findings} onPlateau={onPlateau} />}
      {tab === 'journal' && <JournalTab lang={lang} l={l} progress={progress} label={label} course={course} />}
    </main>
  );
}

/** The plateau detector over this player's data (drill items + the quality ledger + weekly skill snapshots). */
export function plateausOf(progress: Progress, l: PracticeLedger, today: string, limit = 6): PlateauFinding[] {
  const evs = progress.ratingEvents ?? [];
  const perWeek = new Map<string, number>();
  for (const e of evs) {
    const k = `${e.skill}|${weekId(new Date(e.at))}`;
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  return detectPlateaus(
    {
      drillItems: progress.drillItems,
      ledgerItems: l.items,
      snapshots: (progress.snapshots ?? []).map((s) => ({ week: s.week, ratings: s.ratings as Partial<Record<string, number>> })),
      eventsPerWeek: (skill, week) => perWeek.get(`${skill}|${week}`) ?? 0,
      tries: l.tries,
    },
    today,
    limit,
  );
}

/** The Progress screen's entry card: this week's time and quality, one tap to the diary. */
export function DiaryEntryCard({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  const l = useLedger();
  const today = localDay(new Date());
  const s = summarize(l, weekStart(today), today);
  const r = qualityRatio(s);
  return (
    <button className="set-card in-entry" onClick={onOpen} data-open-diary="1">
      <span className="in-entry-n">
        <bdi>{dur(s.ms, lang)}</bdi>
      </span>
      <span className="in-entry-text">
        <b>{DX.title[lang]}</b>
        <small>
          {DX.frames.week[lang]}
          {r !== null ? ` · ${fill(DX.qMin[lang], { m: `${Math.round(r * 100)}%` })}` : ''}
        </small>
      </span>
      <span aria-hidden="true">
        <Icon k="fwd" />
      </span>
    </button>
  );
}
