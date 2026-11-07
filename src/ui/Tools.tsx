import type { ReactNode } from 'react';
import { TOPIC_GEN } from '../engine/topics';
import { TOPIC_GROUPS } from '../engine/topicGroups';
import type { Strings } from '../i18n/strings';
import { ratingsOf, type Progress } from '../storage/progress';
import { dueReviews, reviewDue } from '../storage/progress';
import { topicMarks, type PathView } from '../engine/path';
import { NodeIcon } from './Home';
import { runLevelFor, MODE_ID_LEVELS, WRONG_NOTE_LEVELS } from '../engine/lesson';
import { modesLevelFor } from '../engine/recommend';

const markText = (m: 'done' | 'current' | undefined) => (m === 'done' ? ' ✓' : m === 'current' ? ' ▶' : '');

/**
 * Below the road on the Path tab (SPEC-TODAY §4): "Practice rooms" (the free-practice tools) and "All topics" (moved
 * from Home, each level marked from the path). Both closed by default, so the path stays the focus.
 */
export function PathExtras({
  t,
  progress,
  view,
  lang,
  onTopic,
  onModes,
  onWrongNotes,
  onAbsolute,
  onReview,
  onRuns,
  onDrone,
  onPerform,
  onLearned,
  learnedCount = 0,
  onDrills,
  onVocal,
}: {
  t: Strings;
  progress: Progress;
  view: PathView;
  lang: 'he' | 'en';
  onTopic: (topic: string, level: number) => void;
  onModes: (level: number) => void;
  onWrongNotes: (level: number) => void;
  onAbsolute: (level: number) => void;
  onReview: () => void;
  onRuns: () => void;
  onDrone: () => void;
  onPerform?: () => void;
  onLearned?: () => void;
  learnedCount?: number;
  onDrills: () => void;
  onVocal: (warmup: boolean) => void;
}) {
  const ratings = ratingsOf(progress);
  const marks = topicMarks(view);
  const now = new Date();
  const reviewCount = new Set(dueReviews(progress.review, now).map((r) => r.key)).size;
  const nextDue = progress.review.length ? Math.min(...progress.review.map((r) => new Date(reviewDue(r)).getTime())) : null;
  const nextDays = nextDue !== null && reviewCount === 0 ? Math.max(1, Math.ceil((nextDue - now.getTime()) / 86400000)) : null;
  const passed = (progress.vocal?.passed ?? []).filter((x) => x < 100);
  const vocalLv = Math.min(12, (passed.length ? Math.max(...passed) : 0) + 1);
  const he = lang === 'he';
  const room = (key: string, icon: ReactNode, title: string, sub: string, onClick: () => void, extra?: { data?: Record<string, string>; badge?: number; disabled?: boolean }) => (
    <button key={key} className={`room-row ${key}`} onClick={onClick} disabled={extra?.disabled} {...(extra?.data ?? {})}>
      <span className="room-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="room-text">
        <b>{title}</b>
        <small>{sub}</small>
      </span>
      {extra?.badge ? (
        <span className="count-badge">{extra.badge}</span>
      ) : (
        <span className="room-chev flip-rtl" aria-hidden="true">
          ›
        </span>
      )}
    </button>
  );
  return (
    <div className="path-extras">
      <details className="px-section" data-px="rooms">
        <summary>
          <span aria-hidden="true">🏋️</span> {he ? 'חדרי תרגול' : 'Practice rooms'}
        </summary>
        <div className="room-list">
          {room('drills-room', '🎹', he ? 'תרגילים טכניים' : 'Technique drills', he ? 'סולמות, ארפג׳ים ועוד — פסנתר, גיטרה ובס' : 'Scales, arpeggios and more — piano, guitar, bass', onDrills, { data: { 'data-room': 'drills' } })}
          {room('vocal-room', '🎤', t.vocalTitle, `${t.vocalLevel.replace('{n}', String(vocalLv))} · ${t.vocalLevelNames[vocalLv - 1]}`, () => onVocal(false), { data: { 'data-room': 'vocal' } })}
          {room('warmup-room', '☀️', t.vocalWarmup, t.vocalBlurb, () => onVocal(true), { data: { 'data-room': 'vocal-warmup' } })}
          {room('review-room', <NodeIcon kind="review" />, t.reviewN, reviewCount ? `${reviewCount} ${t.dueNow}` : nextDays ? t.nextReviewIn.replace('{n}', String(nextDays)) : t.nothingToReview, onReview, { badge: reviewCount, disabled: reviewCount === 0, data: { 'data-room': 'review' } })}
          {room('runs-card', <NodeIcon kind="mic" />, t.runsWorkshop, t.runsWorkshopHint.replace('{n}', String(runLevelFor(ratings.agility?.n ? ratings.agility.r : null))), onRuns, { data: { 'data-room': 'runs' } })}
          {room('drone-card', <NodeIcon kind="mic" />, t.dronePractice, t.droneBlurb, onDrone, { data: { 'data-room': 'drone' } })}
          {onPerform && room('perform-card', <NodeIcon kind="mic" />, t.perfTitle, t.perfBlurb, onPerform, { data: { 'data-perform': '1' } })}
          {onLearned && room('learned-card-tool', '📚', t.learnedTitle, learnedCount ? `${learnedCount} · ${t.learnedBlurb}` : t.learnedBlurb, onLearned, { data: { 'data-learned': '1' } })}
        </div>
      </details>
      <details className="px-section" data-px="topics">
        <summary>
          <span aria-hidden="true">🎯</span> {he ? 'כל הנושאים' : 'All topics'}
          <small>{he ? '✓ = המסלול כבר סופר את הרמה' : '✓ = the path already counts that level'}</small>
        </summary>
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
                    {TOPIC_GEN[id].levels.map((lv, i) => {
                      const m = marks.get(`${id}:${i + 1}`);
                      return (
                        <button key={i} className={`chip ${m === 'done' ? 'done' : m === 'current' ? 'on' : ''}`} data-topic={id} data-mark={m} onClick={() => onTopic(id, i + 1)}>
                          {i + 1}. {lv[lang]}
                          {markText(m)}
                        </button>
                      );
                    })}
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
      </details>
    </div>
  );
}
