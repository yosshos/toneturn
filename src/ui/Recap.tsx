import { sessionInsight } from '../engine/coach';
import { LevelStatsLine } from './LevelStats';
import { RatingCard } from './Rating';
import type { RatingChange } from '../engine/rating';
import { useEffect, useState } from 'react';
import { displayNote } from '../engine/pitch';
import { compareStimulus, pcFromKey } from '../engine/lesson';
import { songById } from '../engine/songs';
import { summary } from '../engine/session';
import type { LessonView } from '../game/controller';
import { answerWord, choiceLabel, giveText, LESSON_META, questionBadge } from '../game/content';
import type { Strings } from '../i18n/strings';
import { namingFor, type Settings } from '../storage/progress';
import { Note, withNote } from './bits';
import { median } from '../engine/scoring';

interface Props {
  t: Strings;
  view: LessonView;
  settings: Settings;
  onReplay: (i: number) => void;
  onAgain: () => void;
  onHome: () => void;
  onNext: (() => void) | null;
  nextLabel?: string;
  /** Rating change of this session (spec L.3); null until saved. */
  rating?: { change: RatingChange; peakBefore: number | null } | null;
  /** Play your (wrong) answer, then the right one. */
  onCompare?: (i: number) => void;
  playerName?: string | null;
}

export function Recap({ t, view, settings, onReplay, onCompare, onAgain, onHome, onNext, nextLabel, rating, playerName }: Props) {
  const s = view.session;
  const sm = summary(s);
  const [xp, setXp] = useState(0);
  useEffect(() => {
    if (document.documentElement.dataset.motion === 'reduced') return setXp(sm.xp);
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      setXp(Math.round(sm.xp * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // Animation frames can be paused (background tab, hidden pane): always land on the final value.
    const done = setTimeout(() => setXp(sm.xp), 1200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [sm.xp]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const meta = LESSON_META[s.lesson.id];
  const bb = displayNote({ letter: 'B', acc: -1 }, nm, lang);
  const eb = displayNote({ letter: 'E', acc: -1 }, nm, lang);
  // One concrete review target: the first question not answered right on the first try.
  const missed = s.records.findIndex((r) => r.outcome !== 'correct');
  let rec: React.ReactNode;
  if (missed < 0) rec = withNote(meta.tip[lang], bb, eb);
  else {
    const q = s.lesson.questions[missed];
    const b = questionBadge(q, lang, nm);
    rec = (
      <>
        {t.review}: {b.key && <Note>{displayNote(b.key, nm, lang)}</Note>} {b.text} → <b>{q.kind === 'sing' ? `${t.round} ${missed + 1}` : answerWord(q, q.answer, lang)}</b>
        {s.lesson.id === 'bflat-two-homes' && (
          <>
            <br />
            {withNote(q.kind === 'degree' && q.answer === 5 ? t.recReview : t.recReviewBb, bb, eb)}
          </>
        )}
      </>
    );
  }
  const times = s.records.flatMap((r) => r.attempts.filter((a) => a.correct && a.timeMs != null).map((a) => a.timeMs as number));
  const medianMs = median(times);
  const ratio = sm.firstTry / sm.total;
  const stars = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;

  return (
    <main className="recap">
      <p className="eyebrow">{withNote(meta.title[lang], bb)}</p>
      <h1>{t.recapTitle}</h1>
      {(() => {
        // Personal insight (spec X.4): the pair you mixed up most, or praise.
        const misses = s.records.flatMap((r, qi) => r.attempts.filter((a) => !a.correct).map((a) => ({ q: qi, given: a.answer })));
        const answered = s.records.filter((r) => r.attempts.length > 0);
        const ins = sessionInsight(s.lesson.questions, misses, answered.filter((r) => r.attempts[0]?.correct).length, answered.length, lang, playerName ?? null);
        return (
          <p className={`coach-insight ${ins.kind}`} data-insight={ins.kind}>
            {ins.kind === 'pair' ? '🎯 ' : ins.kind === 'flawless' ? '' : '💪 '}
            {ins.text}
          </p>
        );
      })()}
      <div className="stars" aria-label={`${stars} ${t.stars}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`star ${i < stars ? 'won' : ''}`} style={{ ['--i' as string]: i }} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
      <p className="score-line">
        <b>
          {sm.firstTry}/{sm.total}
        </b>{' '}
        {t.recapScore} ·{' '}
        <bdi className="xp-count" dir="ltr">
          +{xp} {t.xp}
        </bdi>
        {medianMs !== null && (
          <>
            {' '}
            · <span dir="ltr">⏱ {(medianMs / 1000).toFixed(1)}s</span> <small>{t.medianTime}</small>
          </>
        )}
      </p>

      {rating !== undefined && rating !== null && <RatingCard t={t} change={rating.change} peakBefore={rating.peakBefore} accuracy={sm.total ? sm.firstTry / sm.total : 0} />}

      <ol className="recap-list">
        {s.lesson.questions.map((q, i) => {
          const r = s.records[i];
          const ok = r.outcome === 'correct' || r.outcome === 'correct-retry';
          const b = questionBadge(q, lang, nm);
          const ans0 =
            q.kind === 'sing'
              ? `${t.singNow} ${q.promptBy === 'name' ? displayNote(q.target, nm, lang) : q.degree}`
              : q.kind === 'sing-seq'
                ? `${t.singNow} ${q.degrees.join(' ')}`
                : q.kind === 'name-seq'
                  ? q.names.map((k) => { const p = pcFromKey(k); return p ? displayNote(p, nm, lang) : k; }).join(' ')
                : q.kind === 'sing-run'
                  ? `${t.singNow} · ${q.run.offsets.length} × ${q.run.nps}/s`
                : q.kind === 'note-name'
                  ? displayNote(q.target, nm, lang)
                  : q.kind === 'degree-seq'
                ? q.answer.split('-').join(' ')
                : typeof q.answer === 'number'
                  ? String(q.answer)
                  : choiceLabel(q, q.answer, lang).small || choiceLabel(q, q.answer, lang).big;
          const song = (q.kind === 'degree-seq' || q.kind === 'sing-seq') && q.song ? songById(q.song) : undefined;
          const ans = song ? `${ans0} · ♪ ${song.title[lang]}` : ans0;
          return (
            <li key={q.id} className={`recap-row ${r.outcome}`}>
              <span className="recap-mark" aria-hidden="true">
                {r.outcome === 'correct' ? '★' : ok ? '✓' : r.outcome === 'skipped' ? '–' : '✗'}
              </span>
              <span className="recap-q">
                {b.key && <Note>{displayNote(b.key, nm, lang)}</Note>} {b.text} · <b>{ans}</b>
              </span>
              <span className="recap-given">
                {r.attempts.length > 0 && (
                  <>
                    {t.yourAnswer}: {r.attempts.map((a) => giveText(q, a.answer, lang, nm)).join(', ')}
                  </>
                )}
              </span>
              <button className="btn small" onClick={() => onReplay(i)} aria-label={`${t.replay} ${i + 1}`}>
                ▶ {t.replay}
              </button>
              {onCompare && r.attempts.some((a) => !a.correct) && compareStimulus(q, r.attempts.find((a) => !a.correct)!.answer) && (
                <button className="btn small ghost" onClick={() => onCompare(i)} aria-label={`${t.yoursVsRight} ${i + 1}`}>
                  ▶ {t.yoursVsRight}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {s.lesson.id === 'weekly-puzzle' && (() => {
        const qid = s.lesson.questions[0]?.id ?? '';
        const cut = qid.lastIndexOf('-');
        return <LevelStatsLine t={t} kind="puzzle" week={qid.slice(0, cut)} band={qid.slice(cut + 1)} />;
      })()}

      <section className="rec-card">
        <h2>{t.recommendation}</h2>
        <p>{rec}</p>
      </section>

      <div className="recap-actions">
        {onNext && (
          <button className="btn mega" onClick={onNext}>
            {nextLabel ?? t.nextLesson} <span className="flip-rtl">→</span>
          </button>
        )}
        <button className={onNext ? 'btn' : 'btn mega'} onClick={onAgain}>
          {t.again}
        </button>
        <button className="btn ghost" onClick={onHome}>
          {t.home}
        </button>
      </div>
    </main>
  );
}
