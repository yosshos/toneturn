import { weekId } from '../engine/adaptive';
import { SKILLS } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { ratingsOf, type Progress } from '../storage/progress';
import { localDay } from '../storage/progress';
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
}: {
  t: Strings;
  progress: Progress;
  onSkills: () => void;
  onPlacement: () => void;
  onReview: () => void;
  onPuzzle: () => void;
  onDaily: () => void;
  onRuns: () => void;
}) {
  const daily = progress.daily?.[localDay(new Date())];
  const ratings = ratingsOf(progress);
  const measured = SKILLS.filter((k) => (ratings[k]?.n ?? 0) > 0).length;
  const reviewCount = new Set(progress.review.map((r) => r.key)).size;
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
          <small>{reviewCount ? `${reviewCount}` : t.nothingToReview}</small>
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
