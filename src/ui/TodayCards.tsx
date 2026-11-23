// Today, under the workout (0.63, the design's Main board): the daily goal and the league side by side, then today's
// two quests. Everything is read from what the player did today; the league card needs an account (else it invites).

import { TeacherPhraseTodayCard } from './TeachPhrase';
import { useEffect, useState } from 'react';
import { myLeague, type League } from '../cloud/compete';
import type { CourseId } from '../engine/courses';
import { dailyQuests } from '../engine/quests';
import { localDay, type Progress, type Settings } from '../storage/progress';
import { Glyph } from './Glyph';
import { examCard } from '../engine/examPrep';
import type { ExamDef } from '../content/bagrut';
import { EXAM_PREP_NAME } from './CourseSwitcher';
import { repGoal, repResults } from '../engine/repertoire';
import { repGoalFor } from '../engine/repStyleGoal';
import '../repertoire.css';
import '../todaypm.css';
import { dayKey, doneOn, meanAbs, trend } from '../engine/pitchMemory';
import { EncoreTodayCard, encoreInstOf } from './encore/EncoreToday';
import { FeaturedPhraseCard } from './encore/FeaturedToday';
import '../encore.css';
import { studioText, sfill } from '../i18n/studioText';
import { Icon } from './icons';
import { WeeklyRingTile, WeeklySummaryCard } from './PlaceCharts';
import { areaLabel } from './Stats';

/** What the exam-prep card opens (0.67): the next mock, a weak section's topic, the full exams list. */
export interface ExamActions {
  mock: (e: ExamDef) => void;
  practise: (topic: string, level: number) => void;
  all: () => void;
}

/** Exam prep (0.67, the Ear course's mode): the next mock exam and the weakest sections of the last one. */
function ExamPrepCard({ progress, lang, on }: { progress: Progress; lang: 'he' | 'en'; on: ExamActions }) {
  const he = lang === 'he';
  const c = examCard(progress.history);
  const last = c.lastAt ? new Date(c.lastAt).toLocaleDateString(he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' }) : null;
  return (
    <section className="tc-card tc-exam" aria-label={EXAM_PREP_NAME[lang]} data-today-exam={c.exam.id}>
      <small>{EXAM_PREP_NAME[lang]}</small>
      <b>{c.exam.title[lang]}</b>
      <small className="tc-hint">{last ? (he ? `מבחן דמה אחרון: ${last}` : `Last mock: ${last}`) : he ? 'עוד לא נבחנתם' : 'No mock yet'}</small>
      {c.weak.length > 0 && (
        <div className="tx-weak">
          <small>{he ? 'לחזק:' : 'Work on:'}</small>
          {c.weak.map((w) => (
            <button key={w.section.id} type="button" className="chip" onClick={() => on.practise(w.section.topic, w.section.level)} data-exam-weak={w.section.id}>
              {w.section.title[lang]}
            </button>
          ))}
        </div>
      )}
      <span className="tx-actions">
        <button type="button" className="btn primary small" onClick={() => on.mock(c.exam)} data-today-mock="1">
          {he ? 'מבחן דמה' : 'Mock exam'} · {c.minutes} {he ? 'דק׳' : 'min'}
        </button>
        <button type="button" className="link" onClick={on.all}>
          {he ? 'כל המבחנים' : 'All exams'}
        </button>
      </span>
    </section>
  );
}

/** Repertoire (SPEC-REPERTOIRE): the course's next goal on the road to standards, and the piece to play next. */
function RepGoalCard({ progress, course, lang, onOpen, settings }: { progress: Progress; course: CourseId; lang: 'he' | 'en'; onOpen: (itemId?: string) => void; settings?: Settings }) {
  const he = lang === 'he';
  // SPEC-STYLE-FOCUS §4: the goal follows the main style (THE weight); a jazz focus keeps the road to the standards
  const g = settings ? repGoalFor(course, repResults(progress.lessons, course), settings) : repGoal(course, repResults(progress.lessons, course));
  return (
    <button type="button" className="tc-card tc-rep" onClick={() => onOpen(g.next?.id)} data-today-rep={g.id}>
      <small>{he ? 'היעד הבא ברפרטואר' : 'Next repertoire goal'}</small>
      <b>{g.title[lang]}</b>
      <span className="rep-bar" aria-hidden="true">
        <i style={{ width: `${(100 * g.now) / Math.max(1, g.target)}%` }} />
      </span>
      <small className="tc-hint">
        <span dir="ltr">
          {g.now}/{g.target}
        </span>
        {g.next ? ` · ${he ? 'הבא:' : 'Next:'} ${g.next.teaches[lang]}` : ''}
      </small>
    </button>
  );
}

/** The courses whose Today shows the daily pitch-memory card (it was a game in their lists). */
export const PITCH_MEMORY_COURSES: CourseId[] = ['ear', 'voice'];

/**
 * Pitch Memory as a daily ritual (AUDIT-GAMES §9, was a games-list entry): today's note from memory — done or waiting —
 * and the last 14 days as a flat bar trend (taller = closer). Opens the Pitch Memory screen.
 */
export function PitchMemoryCard({ progress, lang, onOpen }: { progress: Progress; lang: 'he' | 'en'; onOpen: () => void }) {
  const he = lang === 'he';
  const log = progress.pitchMemory ?? [];
  const now = new Date();
  const today = doneOn(log, dayKey(now));
  const pts = trend(log, now, 14);
  const mean = meanAbs(trend(log, now));
  return (
    <button type="button" className="tc-card tc-pm" onClick={onOpen} data-today-pitchmemory={today ? 'done' : 'open'}>
      <small>{he ? 'זיכרון צליל · פעם ביום' : 'Pitch memory · once a day'}</small>
      <b>{today ? (he ? 'היום: ' : 'Today: ') : he ? 'הצליל שלכם, מהזיכרון' : 'Your note, from memory'}{today && <bdi dir="ltr">{today.cents > 0 ? '+' : ''}{Math.round(today.cents)}¢</bdi>}</b>
      <span className="pm-trend" aria-hidden="true">
        {pts.map((p) => (
          <i key={p.day} className={p.cents === null ? 'none' : ''} style={p.cents === null ? undefined : { height: `${Math.max(12, 100 - Math.min(100, Math.abs(p.cents)))}%` }} />
        ))}
      </span>
      <small className="tc-hint">
        {mean !== null ? (
          <>
            {he ? 'סטייה ממוצעת' : 'Average error'} <bdi dir="ltr">{Math.round(mean)}¢</bdi>
          </>
        ) : he ? 'היום הראשון — המגמה מתחילה כאן' : 'Day one — the trend starts here'}
      </small>
    </button>
  );
}

export function TodayCards({ settings, progress, goalXp, signedIn, onLeague, exam, onRepertoire, onPitchMemory, onEncore, streak, onStreak }: { /** The streak in the stats row. */ streak?: number; onStreak?: () => void; settings: Settings; progress: Progress; goalXp: number; signedIn: boolean; onLeague: () => void; exam?: ExamActions; onRepertoire?: (itemId?: string) => void; onPitchMemory?: () => void; /** Encore (SPEC-PHRASE-STUDIO §9): open a due phrase (a hash). */ onEncore?: (hash: string) => void }) {
  const lang = settings.uiLang;
  const he = lang === 'he';
  const day = localDay(new Date());
  const today = progress.history.filter((h) => localDay(new Date(h.completedAt)) === day);
  const todayXp = Math.max(today.reduce((a, h) => a + h.xp, 0), progress.stats?.xpByDay?.[day] ?? 0);
  const minutes = (progress.statsDays?.[day]?.ms ?? 0) / 60000;
  const facts = settings.pathFacts?.steps ?? {};
  const stepsToday = Object.values(facts).filter((f) => f.at && localDay(new Date(f.at)) === day).length;
  const course = (settings.activeCourse ?? 'ear') as CourseId;
  const examPrep = course === 'ear' && !!settings.examPrep;
  const quests = dailyQuests({ day, course, examPrep, events: progress.ratingEvents ?? [], sessions: today.map((h) => h.lessonId), stepsToday, minutesToday: minutes, tierRuns: progress.tierRuns });

  const [league, setLeague] = useState<League | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    void myLeague().then(setLeague).catch(() => setLeague(null));
  }, [signedIn]);
  const rank = league ? [...league.members].sort((a, b) => b.xp - a.xp).findIndex((m) => m.me) + 1 : 0;
  const days = league ? Math.max(0, Math.ceil((new Date(league.endsAt).getTime() - Date.now()) / 86_400_000)) : 0;

  const sx = studioText(lang);
  const questsDone = quests.filter((q) => q.now >= q.target).length;
  return (
    <>
      {/* One compact row of numbers under the workout, then at most a card or two, then a quiet list. */}
      <section className="today-cards st-stats" aria-label={he ? 'היום שלך' : 'Your day'}>
        <div className="tc-card tc-goal st-stat">
          <small>{sx.dailyGoal}</small>
          <b dir="ltr">
            {todayXp}
            <span>/{goalXp} XP</span>
          </b>
          <span className="st-bar sm" aria-hidden="true">
            <i style={{ width: `${goalXp ? Math.min(100, (100 * todayXp) / goalXp) : 0}%` }} />
          </span>
        </div>
        <button type="button" className="tc-card tc-league st-stat" onClick={onLeague} data-today-league="1">
          <small>{sx.league}</small>
          {league && rank > 0 ? (
            <>
              <b>{sfill(sx.place, { n: rank })}</b>
              <small className="st-xs">{he ? (days === 1 ? 'עוד יום' : days === 2 ? 'עוד יומיים' : sfill(sx.daysLeft, { d: days })) : sfill(sx.daysLeft, { d: days })}</small>
            </>
          ) : (
            <>
              <b>{sx.leagueJoin}</b>
              <small className="st-xs">{he ? '30 שחקנים' : '30 players'}</small>
            </>
          )}
        </button>
        {/* SPEC-PROGRESS-CHARTS §2: the small weekly ring — this week's minutes against last week's, with ▲/▼ */}
        <WeeklyRingTile lang={lang} />
        {streak !== undefined && (
          <button type="button" className="tc-card st-stat st-streak" onClick={onStreak} data-today-streak="1">
            <small>{sx.streak}</small>
            <b>
              {streak} <span>{sx.days}</span>
            </b>
          </button>
        )}
      </section>
      {examPrep && exam && <ExamPrepCard progress={progress} lang={lang} on={exam} />}
      {onEncore && !examPrep && <TeacherPhraseTodayCard lang={lang} book={settings.lickBook} items={progress.drillItems ?? {}} onOpen={onEncore} />}
      {onEncore && !examPrep && <EncoreTodayCard lang={lang} book={settings.lickBook} items={progress.drillItems ?? {}} onOpen={onEncore} inst={encoreInstOf(settings)} range={settings.voiceRange ?? null} />}
      {/* §5: the weekly summary, once a week (4 tiles, the largest change, one sentence) */}
      <WeeklySummaryCard lang={lang} areaName={(a) => areaLabel(a, lang)} />
      <section className="st-more" aria-label={sx.moreToday}>
        {onRepertoire && !examPrep && <RepGoalCard progress={progress} course={course} lang={lang} onOpen={onRepertoire} settings={settings} />}
        {onPitchMemory && !examPrep && PITCH_MEMORY_COURSES.includes(course) && <PitchMemoryCard progress={progress} lang={lang} onOpen={onPitchMemory} />}
        {onEncore && !examPrep && <FeaturedPhraseCard lang={lang} book={settings.lickBook} />}
        <details className="today-quests st-quests">
          <summary>
            <span id="tq-title">{sx.quests}</span>
            <span className="tq-n" dir="ltr">
              {questsDone}/{quests.length}
            </span>
            <Icon k="down" size={16} />
          </summary>
          <ul className="tq-list">
            {quests.map((q) => (
              <li key={q.id} className={q.now >= q.target ? 'done' : ''} data-quest={q.id}>
                <Glyph kind={q.glyph} color={q.color} size={32} />
                <span className="tq-text">
                  <b>{q.title[lang]}</b>
                  <span className="tq-bar" aria-hidden="true">
                    <i style={{ width: `${(100 * q.now) / q.target}%` }} />
                  </span>
                </span>
                <span className="tq-n" dir="ltr">
                  {q.now}/{q.target}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}
