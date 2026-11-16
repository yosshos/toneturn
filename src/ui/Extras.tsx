// Spec S: the daily workout planner card, the achievements screen and "then vs. now" for vocal takes.

import { Glyph, glyphForEmoji } from './Glyph';
import { useEffect, useMemo, useState } from 'react';
import { type AchievementExtra, achievements } from '../engine/achievements';
import { AWARD_TEXT } from './Stats';
import { langOf } from './Trends';
import { planWorkout, stepKey, type WorkoutStep } from '../engine/workout';
import { LESSON_META } from '../game/content';
import { foldSubs, SUB_BY_ID } from '../engine/taxonomy';
import { TOPIC_GEN } from '../engine/topics';
import { STRINGS, type Strings } from '../i18n/strings';
import { dueReviews, lessonMastered, localDay, ratingsOf, type Progress, type Settings } from '../storage/progress';
import { getTakeAudio, listTakes, thenAndNowOf, type RecTake } from '../storage/recordings';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/** Steps done today: lessons from today's history, other steps from a per-day local mark. */
function doneToday(p: Progress, s: WorkoutStep, day: string): boolean {
  const today = p.history.filter((h) => localDay(new Date(h.completedAt)) === day).map((h) => h.lessonId);
  switch (s.kind) {
    case 'lesson':
      return today.includes(s.lessonId);
    case 'review':
      return today.includes('review');
    case 'vocal-warmup':
      return today.includes('vocal-warmup');
    case 'vocal':
      return today.some((id) => id.startsWith('vocal-') && id !== 'vocal-warmup');
    case 'modes':
      return today.includes('modes');
    case 'runs':
      return today.includes('runs-workshop');
    default:
      try {
        return localStorage.getItem(`toneturn.workout.${day}.${stepKey(s)}`) === '1';
      } catch {
        return false;
      }
  }
}

export function WorkoutCard({ t, progress, settings, onOpen }: { t: Strings; progress: Progress; settings: Settings; onOpen: (s: WorkoutStep) => void }) {
  const [minutes, setMinutes] = useState<5 | 10 | 20>(() => {
    try {
      const v = Number(localStorage.getItem('toneturn.workout.minutes'));
      return v === 5 || v === 20 ? v : 10;
    } catch {
      return 10;
    }
  });
  const day = localDay(new Date());
  const plan = useMemo(
    () =>
      planWorkout({
        minutes,
        ratings: ratingsOf(progress),
        reviewsDue: dueReviews(progress.review, new Date()).length,
        voice: settings.mode === 'voice',
        mastered: (id) => lessonMastered(progress, id),
        day,
        priorities: (settings.intake as import('../engine/intake').Intake | null | undefined)?.priorities,
        subs: foldSubs(progress.ratingEvents ?? []),
        track: settings.track ?? null,
      }),
    // The plan is fixed for the day and length; progress changes only tick the steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minutes, day],
  );
  const lang = settings.uiLang;
  const label = (s: WorkoutStep) => {
    switch (s.kind) {
      case 'lesson':
        return LESSON_META[s.lessonId]?.title[lang].replace(/\{n\}/g, 'B♭').replace(/\{k\}/g, '').trim() ?? s.lessonId;
      case 'review':
        return t.reviewN;
      case 'vocal-warmup':
        return t.vocalWarmup;
      case 'vocal':
        return t.vocalTitle;
      case 'modes':
        return `${t.skillNames.modes} · ${t.modesByEarLevels[s.level - 1]}`;
      case 'runs':
        return t.runsWorkshop;
      case 'game':
        return s.game === 'truefalse' ? t.trueFalse : s.game === 'echo' ? t.echoChain : t.beatEcho;
      case 'topic':
        return `${TOPIC_GEN[s.topic]?.title[lang] ?? s.topic} · ${TOPIC_GEN[s.topic]?.levels[s.level - 1]?.[lang] ?? s.level}`;
    }
  };
  const why = (s: WorkoutStep) => (s.kind === 'topic' ? `${s.why === 'new' ? t.whyNew : s.why === 'review' ? t.whyReview : t.whyWeak}: ${SUB_BY_ID[s.sub]?.[lang] ?? ''}` : null);
  const done = plan.filter((s) => doneToday(progress, s, day)).length;
  return (
    <section className="workout-card" aria-label={t.workoutTitle}>
      <div className="workout-head">
        <h2>{t.workoutTitle}</h2>
        <div className="seg small" role="radiogroup" aria-label={t.workoutTitle}>
          {([5, 10, 20] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              className={minutes === m ? 'on' : ''}
              onClick={() => {
                setMinutes(m);
                try {
                  localStorage.setItem('toneturn.workout.minutes', String(m));
                } catch {
                  /* private mode */
                }
              }}
            >
              {fill(t.minutesN, { n: m })}
            </button>
          ))}
        </div>
      </div>
      <ol className="workout-steps">
        {plan.map((s) => {
          const ok = doneToday(progress, s, day);
          return (
            <li key={stepKey(s)} className={ok ? 'done' : ''}>
              <button
                onClick={() => {
                  if (s.kind === 'game' || s.kind === 'topic') {
                    try {
                      localStorage.setItem(`toneturn.workout.${day}.${stepKey(s)}`, '1');
                    } catch {
                      /* private mode */
                    }
                  }
                  onOpen(s);
                }}
              >
                <span className="ws-check" aria-hidden="true">
                  {ok ? '✓' : '○'}
                </span>
                <span className="ws-label">
                  {label(s)}
                  {why(s) && <small className="ws-why">{why(s)}</small>}
                </span>
                <small dir="ltr">~{s.minutes}′</small>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="field-hint">{done === plan.length ? t.workoutDone : fill(t.workoutProgress, { n: done, m: plan.length })}</p>
    </section>
  );
}

export function AchievementsScreen({ t, progress, extra, onBack }: { t: Strings; progress: Progress; extra?: AchievementExtra; onBack: () => void }) {
  const list = achievements(progress, extra);
  const got = list.filter((a) => a.got).length;
  return (
    <main className="panel-screen achievements">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.achievementsTitle}</h1>
      </header>
      <p className="field-hint">{fill(t.achievementsCount, { n: got, m: list.length })}</p>
      <ul className="badge-grid">
        {list.map((a) => (
          <li key={a.id} className={a.got ? 'got' : ''}>
            <span className="badge-icon" aria-hidden="true">
              <Glyph kind={glyphForEmoji(a.icon)} color="#FFD43B" size={40} />
            </span>
            {/* Newer awards have their text in AWARD_TEXT (Stats); never show a bare id. */}
            <b>{t.achievementNames[a.id] ?? AWARD_TEXT[a.id]?.name[langOf(t)] ?? a.id}</b>
            <small>{t.achievementHints[a.id] ?? (AWARD_TEXT[a.id]?.hint[langOf(t)] ?? '').replace('{v}', String(a.next ?? a.tiers?.[a.tiers.length - 1] ?? ''))}</small>
            {!a.got && (
              <span className="metric-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(a.progress * 100)}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

/** Vocal technique: the first and latest kept take of each exercise, side by side (from My recordings since 0.99). */
export function ThenAndNow({ t, refresh }: { t: Strings; refresh: number }) {
  const [rows, setRows] = useState<{ item: string; then: RecTake; now: RecTake }[]>([]);
  const [urls, setUrls] = useState<{ then: string; now: string }[]>([]);
  useEffect(() => {
    let live = true;
    const made: string[] = [];
    void listTakes({ kind: 'vocal' }).then(async (all) => {
      const pairs = thenAndNowOf(all);
      const us = await Promise.all(
        pairs.map(async (p) => {
          const [a, b] = await Promise.all([getTakeAudio(p.then.id), getTakeAudio(p.now.id)]);
          const u = { then: a ? URL.createObjectURL(a) : '', now: b ? URL.createObjectURL(b) : '' };
          made.push(u.then, u.now);
          return u;
        }),
      );
      if (!live) return;
      setRows(pairs);
      setUrls(us);
    });
    return () => {
      live = false;
      made.filter(Boolean).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [refresh]);
  const day = (iso: string) => iso.slice(0, 10);
  if (!rows.length) return <p className="field-hint">{t.thenNowEmpty}</p>;
  return (
    <ul className="then-now">
      {rows.map((r, i) => (
        <li key={r.item}>
          <b>{typeof r.now.title === 'string' ? r.now.title : r.now.title[t === STRINGS.en ? 'en' : 'he']}</b>
          <div>
            <small>
              <bdi dir="ltr">{day(r.then.at)}</bdi> · <bdi dir="ltr">{Math.round((r.then.result?.score ?? 0) * 100)}%</bdi>
            </small>
            <audio controls src={urls[i]?.then} />
          </div>
          <div>
            <small>
              <bdi dir="ltr">{day(r.now.at)}</bdi> · <bdi dir="ltr">{Math.round((r.now.result?.score ?? 0) * 100)}%</bdi>
            </small>
            <audio controls src={urls[i]?.now} />
          </div>
        </li>
      ))}
    </ul>
  );
}
