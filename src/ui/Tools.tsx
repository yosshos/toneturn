import { weekId } from '../engine/adaptive';
import { SKILLS } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { ratingsOf, type Progress } from '../storage/progress';
import { dueReviews, localDay, reviewDue } from '../storage/progress';
import { NodeIcon } from './Home';
import { runLevelFor } from '../engine/lesson';

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
}) {
  const daily = progress.daily?.[localDay(new Date())];
  const ratings = ratingsOf(progress);
  const measured = SKILLS.filter((k) => (ratings[k]?.n ?? 0) > 0).length;
  const now = new Date();
  const reviewCount = new Set(dueReviews(progress.review, now).map((r) => r.key)).size;
  const nextDue = progress.review.length ? Math.min(...progress.review.map((r) => new Date(reviewDue(r)).getTime())) : null;
  const nextDays = nextDue !== null && reviewCount === 0 ? Math.max(1, Math.ceil((nextDue - now.getTime()) / 86400000)) : null;
  const p = progress.puzzles?.[weekId(new Date())];
  const puzzleStatus = !p ? t.puzzleNew : p.medal === 'gold' ? `🥇 ${t.puzzleGold}` : p.medal === 'silver' ? `🥈 ${t.puzzleSilver}` : t.puzzleTried;
  return (
    <section className="tools-row" aria-label={t.practiceTools}>
      <h2>{t.practiceTools}</h2>
      <div className="tool-cards">
        <button className="tool-card" onClick={measured ? onSkills : onPlacement}>
          <span className="tool-icon" aria-hidden="true">
            <NodeIcon kind="map" />
          </span>
          <b>{measured ? t.skillMap : t.findLevel}</b>
          <small>{measured ? `${measured}/${SKILLS.length}` : t.findLevelHint}</small>
        </button>
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
    </section>
  );
}
