// Today, under the workout (0.63, the design's Main board): the daily goal and the league side by side, then today's
// two quests. Everything is read from what the player did today; the league card needs an account (else it invites).

import { useEffect, useState } from 'react';
import { myLeague, type League } from '../cloud/compete';
import type { CourseId } from '../engine/courses';
import { dailyQuests } from '../engine/quests';
import { localDay, type Progress, type Settings } from '../storage/progress';
import { Glyph } from './Glyph';
import { LeagueBadge } from './LeagueBadge';
import type { Strings } from '../i18n/strings';
import { WaveMeter } from './WaveMeter';

export function TodayCards({ t, settings, progress, goalXp, signedIn, onLeague }: { t: Strings; settings: Settings; progress: Progress; goalXp: number; signedIn: boolean; onLeague: () => void }) {
  const lang = settings.uiLang;
  const he = lang === 'he';
  const day = localDay(new Date());
  const today = progress.history.filter((h) => localDay(new Date(h.completedAt)) === day);
  const todayXp = Math.max(today.reduce((a, h) => a + h.xp, 0), progress.stats?.xpByDay?.[day] ?? 0);
  const minutes = (progress.statsDays?.[day]?.ms ?? 0) / 60000;
  const facts = settings.pathFacts?.steps ?? {};
  const stepsToday = Object.values(facts).filter((f) => f.at && localDay(new Date(f.at)) === day).length;
  const quests = dailyQuests({ day, course: (settings.activeCourse ?? 'ear') as CourseId, events: progress.ratingEvents ?? [], sessions: today.map((h) => h.lessonId), stepsToday, minutesToday: minutes });

  const [league, setLeague] = useState<League | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    void myLeague().then(setLeague).catch(() => setLeague(null));
  }, [signedIn]);
  const rank = league ? [...league.members].sort((a, b) => b.xp - a.xp).findIndex((m) => m.me) + 1 : 0;
  const days = league ? Math.max(0, Math.ceil((new Date(league.endsAt).getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <>
      <section className="today-cards" aria-label={he ? 'היום שלך' : 'Your day'}>
        <div className="tc-card tc-goal">
          <small>{he ? 'יעד יומי' : 'Daily goal'}</small>
          <b dir="ltr">
            {todayXp} / {goalXp} XP
          </b>
          <WaveMeter value={goalXp ? Math.min(1, todayXp / goalXp) : 0} bars={14} height={22} />
        </div>
        <button className="tc-card tc-league" onClick={onLeague} data-today-league="1">
          <small>{he ? 'ליגה' : 'League'}</small>
          {league && rank > 0 ? (
            <>
              <b>
                {he ? `מקום ${rank}` : `Rank ${rank}`} · {t.leagueTiers[league.tier - 1]}
              </b>
              <span className="tc-foot">
                <LeagueBadge tier={league.tier} size={26} title={t.leagueTiers[league.tier - 1]} />
                <small>{he ? (days === 1 ? 'עוד יום' : days === 2 ? 'עוד יומיים' : `עוד ${days} ימים`) : `${days} days left`}</small>
              </span>
            </>
          ) : (
            <>
              <b>{he ? 'להצטרף לליגה' : 'Join a league'}</b>
              <small className="tc-hint">{he ? 'תחרות שבועית עם עוד 29 שחקנים' : 'A weekly race with 29 players'}</small>
            </>
          )}
        </button>
      </section>
      <section className="today-quests" aria-labelledby="tq-title">
        <div className="tq-head">
          <h2 id="tq-title">{he ? 'משימות היום' : "Today's quests"}</h2>
        </div>
        <ul className="tq-list">
          {quests.map((q) => (
            <li key={q.id} className={q.now >= q.target ? 'done' : ''} data-quest={q.id}>
              <Glyph kind={q.glyph} color={q.color} size={40} />
              <span className="tq-text">
                <b>{q.title[lang]}</b>
                <span className="tq-bar" aria-hidden="true">
                  <i style={{ width: `${(100 * q.now) / q.target}%`, background: q.color }} />
                </span>
              </span>
              <span className="tq-n" dir="ltr">
                {q.now}/{q.target}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
