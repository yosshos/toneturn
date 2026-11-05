import { TOPIC_GEN } from '../engine/topics';
import { TOPIC_GROUPS } from '../engine/topicGroups';
import { weekId } from '../engine/adaptive';
import { SKILLS } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { ratingsOf, type Progress } from '../storage/progress';
import { dueReviews, localDay, reviewDue } from '../storage/progress';
import { NodeIcon } from './Home';
import { runLevelFor, MODE_ID_LEVELS, WRONG_NOTE_LEVELS } from '../engine/lesson';
import { modesLevelFor } from '../engine/recommend';

/** Home-screen practice row: Skill Map / placement, review queue, weekly puzzle. */
export function PracticeTools({
  t,
  progress,
  onSkills,
  onPlacement,
  onReview,
  onPuzzle,
  onDaily,
  onRuns,
  onDrone,
  onModes,
  onWrongNotes,
  onAbsolute,
  onTopic,
  lang = 'en',
}: {
  t: Strings;
  progress: Progress;
  onSkills: () => void;
  onPlacement: () => void;
  onReview: () => void;
  onPuzzle: () => void;
  onDaily: () => void;
  onRuns: () => void;
  onDrone: () => void;
  onModes: (level: number) => void;
  onWrongNotes: (level: number) => void;
  onAbsolute: (level: number) => void;
  onTopic: (topic: string, level: number) => void;
  lang?: 'he' | 'en';
}) {
  const daily = progress.daily?.[localDay(new Date())];
  const ratings = ratingsOf(progress);
  const measured = SKILLS.filter((k) => (ratings[k]?.n ?? 0) > 0).length;
  const now = new Date();
  const placed = (progress.lessons.placement?.completions ?? 0) > 0;
  const reviewCount = new Set(dueReviews(progress.review, now).map((r) => r.key)).size;
  const nextDue = progress.review.length ? Math.min(...progress.review.map((r) => new Date(reviewDue(r)).getTime())) : null;
  const nextDays = nextDue !== null && reviewCount === 0 ? Math.max(1, Math.ceil((nextDue - now.getTime()) / 86400000)) : null;
  const p = progress.puzzles?.[weekId(new Date())];
  const puzzleStatus = !p ? t.puzzleNew : p.medal === 'gold' ? `🥇 ${t.puzzleGold}` : p.medal === 'silver' ? `🥈 ${t.puzzleSilver}` : t.puzzleTried;
  return (
    <section className="tools-row" aria-label={t.practiceTools}>
      <h2>{t.practiceTools}</h2>
      <div className="tool-cards">
        {/* Find my level stays available: re-take it any time (e.g. after an old, shorter placement). */}
        <button className="tool-card placement-card" onClick={onPlacement}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="map" />
          </span>
          <b>{t.findLevel}</b>
          <small>{placed ? t.retakePlacement : t.findLevelHint}</small>
        </button>
        {measured > 0 && (
          <button className="tool-card" onClick={onSkills}>
            <span className="tool-icon" aria-hidden="true">
              <NodeIcon kind="map" />
            </span>
            <b>{t.skillMap}</b>
            <small>
              {measured}/{SKILLS.length} {t.measuredShort}
            </small>
          </button>
        )}
        <button className="tool-card" onClick={onReview} disabled={reviewCount === 0}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="review" />
          </span>
          <b>{t.reviewN}</b>
          <small>{reviewCount ? `${reviewCount} ${t.dueNow}` : nextDays ? t.nextReviewIn.replace('{n}', String(nextDays)) : t.nothingToReview}</small>
          {reviewCount > 0 && <span className="count-badge">{reviewCount}</span>}
        </button>
        <button className="tool-card" onClick={onPuzzle}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="puzzle" />
          </span>
          <b>{t.weeklyPuzzle}</b>
          <small>{puzzleStatus}</small>
        </button>
        <button className="tool-card runs-card" onClick={onRuns}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="mic" />
          </span>
          <b>{t.runsWorkshop}</b>
          <small>{t.runsWorkshopHint.replace('{n}', String(runLevelFor(ratings.agility?.n ? ratings.agility.r : null)))}</small>
        </button>
        <button className="tool-card drone-card" onClick={onDrone}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="mic" />
          </span>
          <b>{t.dronePractice}</b>
          <small>{t.droneBlurb}</small>
        </button>
        <button className="tool-card daily-card" onClick={onDaily}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="puzzle" />
          </span>
          <b>{t.dailyChallenge}</b>
          <small>{daily ? `✓ ${t.dailyDone} · ${daily.points.toLocaleString()} ${t.points}` : t.dailyBlurb}</small>
        </button>
      </div>
      <div className="modes-row">
        <b>🎼 {t.skillNames.modes}</b>
        <small>{t.modesByEarHint}</small>
        <div className="modes-levels" role="group" aria-label={t.skillNames.modes}>
          {MODE_ID_LEVELS.map((_, i) => {
            const rec = modesLevelFor(ratings.modes?.n ? ratings.modes.r : null) === i + 1;
            return (
              <button key={i} className={`chip ${rec ? 'on' : ''}`} onClick={() => onModes(i + 1)} title={t.modesByEarLevels[i]}>
                {i + 1}. {t.modesByEarLevels[i]}
                {rec && ' ★'}
              </button>
            );
          })}
        </div>
      </div>
      {TOPIC_GROUPS.map((g) => (
        <details key={g.id} className="topic-group">
          <summary>
            {g.icon} {g.title[lang]}
          </summary>
          {g.topics
            .filter((id) => TOPIC_GEN[id])
            .map((id) => (
              <div key={id} className="modes-row">
                <b>{TOPIC_GEN[id].title[lang]}</b>
                <div className="modes-levels" role="group" aria-label={TOPIC_GEN[id].title[lang]}>
                  {TOPIC_GEN[id].levels.map((lv, i) => (
                    <button key={i} className="chip" data-topic={id} onClick={() => onTopic(id, i + 1)}>
                      {i + 1}. {lv[lang]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </details>
      ))}
      <div className="modes-row">
        <b>🎯 {t.skillNames.absolute}</b>
        <small>{t.absoluteHint}</small>
        <div className="modes-levels" role="group" aria-label={t.skillNames.absolute}>
          {[1, 2, 3].map((lv) => (
            <button key={lv} className="chip" onClick={() => onAbsolute(lv)}>
              {lv}. {t.absoluteLevels[lv - 1]}
            </button>
          ))}
        </div>
      </div>
      <div className="modes-row">
        <b>🔎 {t.wrongNotesTitle}</b>
        <small>{t.wrongNotesHint}</small>
        <div className="modes-levels" role="group" aria-label={t.wrongNotesTitle}>
          {WRONG_NOTE_LEVELS.map((_, i) => (
            <button key={i} className="chip" onClick={() => onWrongNotes(i + 1)}>
              {i + 1}. {t.wrongNotesLevels[i]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
