import { Toni } from './Toni';
import { Icon } from './icons';
import { sessionInsight } from '../engine/coach';
import { pairWeeks, profileDigest } from '../engine/analysis/profile';
import { AiCoachLine } from './AiExplain';
import { loadProfileHistory, refreshProfile } from '../storage/profile';
import { LevelStatsLine } from './LevelStats';
import { RatingCard } from './Rating';
import type { RatingChange } from '../engine/rating';
import { useEffect, useRef, useState } from 'react';
import { displayNote } from '../engine/pitch';
import { compareStimulus } from '../engine/lesson';
import { songById } from '../engine/songs';
import { summary } from '../engine/session';
import type { LessonView } from '../game/controller';
import { answerShort, capItems, capWords, choiceLabel, giveText, LESSON_META, questionBadge } from '../game/content';
import type { Strings } from '../i18n/strings';
import { namingFor, type Settings } from '../storage/progress';
import { levelOf } from '../engine/level';
import { Note, withNote } from './bits';
import { median } from '../engine/scoring';
import { itemPoints, paceTarget, sectionScore } from '../engine/fluency';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

interface Props {
  t: Strings;
  view: LessonView;
  settings: Settings;
  onReplay: (i: number) => void;
  onAgain: () => void;
  onHome: () => void;
  onNext: (() => void) | null;
  nextLabel?: string;
  /** A second action under the main one (the recap of a path step inside a workout: Continue workout). */
  secondary?: { label: string; open: () => void };
  /** Rating change of this session (spec L.3); null until saved. */
  rating?: { change: RatingChange; peakBefore: number | null } | null;
  /** Play your (wrong) answer, then the right one. */
  onCompare?: (i: number) => void;
  playerName?: string | null;
  /** Total XP before and after this session (level bar); null until saved. */
  xpTotals?: { before: number; after: number } | null;
  /** Something covers the recap (the streak screen): its animations wait until it is uncovered. */
  covered?: boolean;
}

export function Recap({ t, view, settings, onReplay, onCompare, onAgain, onHome, onNext, nextLabel, secondary, rating, playerName, xpTotals, covered = false }: Props) {
  const s = view.session;
  const sm = summary(s);
  const [page, setPage] = useState(0);
  // The coach's note (SPEC-AI §2): phrased from this session's numbers and the player profile — never a new grade.
  const [digest, setDigest] = useState<ReturnType<typeof profileDigest> | null>(null);
  useEffect(() => {
    let live = true;
    void refreshProfile().then((p) => live && setDigest(profileDigest(p)), () => live && setDigest({ strengths: [], patterns: [], resolved: [] }));
    return () => {
      live = false;
    };
  }, []);
  // 0.68.1 (owner: "the level bar doesn't fill, Toni doesn't move"): the cards sit side by side in a pager, so their
  // CSS animations used to run (and end) off screen or under the streak screen. A card's animations wait (paused)
  // until it is first shown; the count-ups start then too.
  const [shown, setShown] = useState<number[]>([]);
  const visible = covered ? -1 : page;
  useEffect(() => {
    if (visible >= 0) setShown((xs) => (xs.includes(visible) ? xs : [...xs, visible]));
  }, [visible]);
  const on = (k: number) => (shown.includes(k) ? 'rp-on' : 'rp-wait');
  const on0 = shown.includes(0);
  const [xp, setXp] = useState(0);
  useEffect(() => {
    if (!on0) return;
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
  }, [sm.xp, on0]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const pagesRef = useRef<HTMLDivElement>(null);
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
        {t.review}: {b.key && <Note>{displayNote(b.key, nm, lang)}</Note>} {b.text} → <b>{q.kind === 'sing' ? `${t.round} ${missed + 1}` : answerShort(q, q.answer, lang, nm)}</b>
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
  // Fluency score (engine/fluency.ts): right, without replays, within your pace goal.
  const paced = s.pace?.on ?? true;
  const fl = sectionScore(s.lesson.questions, s.records, s.pace?.profile, paced);
  const stars = fl.stars;
  const goals = s.lesson.questions
    .map((q, i) => ({ q, a: s.records[i].attempts[0] }))
    .filter(({ a }) => a)
    .map(({ q, a }) => paceTarget(q, a.modality ?? (a.via === 'voice' ? 'voice' : 'buttons'), s.pace?.profile));
  const goalMs = median(goals);
  const lacks: string[] = [];
  if (fl.score < 100) {
    const wrong = s.records.filter((r) => r.outcome !== 'correct' && r.outcome !== 'skipped').length;
    if (wrong) lacks.push(fill(t.lackWrong, { n: wrong }));
    if (fl.replays) lacks.push(fill(t.lackReplays, { n: fl.replays }));
    const slow = s.records.filter((r) => r.outcome === 'correct').length - fl.onPace;
    if (paced && slow > 0) lacks.push(fill(t.lackSlow, { n: slow }));
  }

  const hasProgress = !!xpTotals || (goalMs !== null && paced) || lacks.length > 0 || (rating !== undefined && rating !== null);
  const pages = hasProgress ? 3 : 2;
  const go = (k: number) => {
    const n = Math.max(0, Math.min(pages - 1, k));
    setPage(n);
    pagesRef.current?.children[n]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };
  return (
    <main className="recap paged" data-recap-page={page}>
      {/* 0.64 (owner): the recap is a few cards, one screen each, with Continue — like a story, not a long scroll. */}
      <div
        className="recap-pages"
        ref={pagesRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const w = el.clientWidth || 1;
          const k = Math.round(Math.abs(el.scrollLeft) / w);
          if (k !== page) setPage(k);
        }}
      >
      <section className={`rp rp-cele ${on(0)}`} aria-label={t.recapTitle}>
      {/* 0.61 (SPEC-REDESIGN): the lesson ends on a final barline with a fermata, and Toni celebrates. */}
      <div className="recap-art" aria-hidden="true">
        <svg className="recap-staff" viewBox="0 0 365 120" preserveAspectRatio="xMidYMid meet">
          <g className="rs-lines">
            <path d="M0 50H260M0 66H260M0 82H260M0 98H260M0 114H260" />
          </g>
          <rect x="260" y="50" width="3.5" height="64" className="rs-bar" />
          <rect x="269" y="50" width="11" height="64" className="rs-bar" />
          <path d="M244 38 A26 26 0 0 1 296 38" className="rs-fermata" />
          <circle cx="270" cy="33" r="4.5" className="rs-dot" />
        </svg>
        <Toni state={stars === 3 ? 'streak' : stars >= 1 ? 'correct' : 'close'} size={150} />
      </div>
      <p className="eyebrow">{withNote(meta.title[lang], bb)}</p>
      <h1>{t.recapTitle}</h1>
      {(() => {
        // Personal insight (spec X.4): the pair you mixed up most, or praise.
        const misses = s.records.flatMap((r, qi) => r.attempts.filter((a) => !a.correct).map((a) => ({ q: qi, given: a.answer })));
        const answered = s.records.filter((r) => r.attempts.length > 0);
        const ins = sessionInsight(s.lesson.questions, misses, answered.filter((r) => r.attempts[0]?.correct).length, answered.length, lang, playerName ?? null);
        return (
          <>
            <p className={`coach-insight ${ins.kind}`} data-insight={ins.kind}>
              {ins.kind === 'flawless' && fl.score < 100 ? t.flawlessNotFast : ins.text}
            </p>
            {ins.pair && <PairStreak pair={ins.pair} lang={lang} />}
            {answered.length >= 3 && (
              <AiCoachLine
                kind="card"
                lang={lang}
                naming={settings.naming === 'solfege' ? 'solfege' : 'letter'}
                label={lang === 'he' ? 'המאמן' : 'Coach'}
                context={
                  digest && {
                    session: meta.title.en,
                    questions: answered.length,
                    rightFirstTry: answered.filter((r) => r.attempts[0]?.correct && !r.hinted).length,
                    score: fl.score,
                    trickyPair: ins.pair ? `${ins.pair.a} vs ${ins.pair.b}` : undefined,
                    profile: { strengths: digest.strengths.slice(0, 2), patterns: digest.patterns.slice(0, 3) },
                  }
                }
              />
            )}
          </>
        );
      })()}
      <div className={`fluency-score s${stars}`} data-score={fl.score} aria-label={`${t.sectionScore}: ${fl.score}`}>
        <ScoreCount value={fl.score} run={on0} />
        <small>{t.sectionScore}</small>
      </div>
      <div className="stars" aria-label={`${stars} ${t.stars}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`star note ${i < stars ? 'won' : ''}`} style={{ ['--i' as string]: i }} aria-hidden="true">
            <svg viewBox="0 0 120 92" width="50" height="38">
              <ellipse cx="60" cy="46" rx="50" ry="36" transform="rotate(-14 60 46)" />
            </svg>
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
            · <span dir="ltr"><Icon k="clock" /> {(medianMs / 1000).toFixed(1)}s</span> <small>{t.medianTime}</small>
          </>
        )}
      </p>

      </section>
      {hasProgress && (
      <section className={`rp rp-progress ${on(1)}`} aria-label={lang === 'he' ? 'ההתקדמות שלך' : 'Your progress'}>
      <div className="rp-toni" aria-hidden="true">
        <Toni state="wow" size={96} />
      </div>
      {xpTotals && <LevelBar t={t} before={xpTotals.before} after={xpTotals.after} />}

      <p className="pace-line" data-pace-goal={goalMs ?? ''}>
        {goalMs !== null && paced && (
          <span className="pace-goal">
            {t.paceGoal} <b dir="ltr">{(goalMs / 1000).toFixed(1)}s</b> · <Icon k="bolt" /> {fl.onPace}/{fl.total}
          </span>
        )}
        {lacks.length > 0 && (
          <span className="pace-lacks">
            {t.lackPrefix} {lacks.join(' · ')}
          </span>
        )}
      </p>

      {rating !== undefined && rating !== null && <RatingCard t={t} change={rating.change} peakBefore={rating.peakBefore} accuracy={sm.total ? sm.firstTry / sm.total : 0} />}
      </section>
      )}

      <section className={`rp rp-answers ${on(hasProgress ? 2 : 1)}`} aria-label={lang === 'he' ? 'התשובות שלך' : 'Your answers'}>
      <ol className="recap-list">
        {s.lesson.questions.map((q, i) => {
          const r = s.records[i];
          const ok = r.outcome === 'correct' || r.outcome === 'correct-retry';
          const b = questionBadge(q, lang, nm);
          // A few words however long the item (sequences, dictations, entered notes: answerShort / capWords).
          const ans0 =
            q.kind === 'sing'
              ? `${t.singNow} ${q.promptBy === 'name' ? displayNote(q.target, nm, lang) : q.degree}`
              : q.kind === 'sing-seq'
                ? `${t.singNow} ${answerShort(q, q.answer, lang, nm)}`
                : q.kind === 'sing-run'
                  ? `${t.singNow} · ${q.run.offsets.length} × ${q.run.nps}/s`
                : q.kind === 'note-name'
                  ? displayNote(q.target, nm, lang)
                  : q.kind === 'name-seq' || q.kind === 'rhythm-read' || q.kind === 'rhythm-dict' || q.kind === 'degree-seq' || q.kind === 'place'
                    ? answerShort(q, q.answer, lang, nm)
                : typeof q.answer === 'number'
                  ? String(q.answer)
                  : capWords(choiceLabel(q, q.answer, lang, nm).small || choiceLabel(q, q.answer, lang, nm).big);
          const song = (q.kind === 'degree-seq' || q.kind === 'sing-seq') && q.song ? songById(q.song) : undefined;
          const ans = song ? `${ans0} · ♪ ${song.title[lang]}` : ans0;
          return (
            <li key={q.id} className={`recap-row ${r.outcome}`}>
              <span className="recap-mark" aria-hidden="true">
                {ok ? '✓' : r.outcome === 'skipped' ? '–' : '✗'}
              </span>
              {r.outcome !== 'skipped' && r.attempts.length > 0 && (
                <span className="recap-pts" dir="ltr" data-pts={itemPoints(q, r, s.pace?.profile, paced)}>
                  {itemPoints(q, r, s.pace?.profile, paced)}
                </span>
              )}
              <span className="recap-q">
                {b.key && <Note>{displayNote(b.key, nm, lang)}</Note>} {b.text} · <b>{ans}</b>
              </span>
              <span className="recap-given">
                {r.attempts.length > 0 && (
                  <>
                    {t.yourAnswer}: {capItems([...new Set(r.attempts.map((a) => giveText(q, a.answer, lang, nm)))], ', ', 3)}
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
        {secondary && (
          <button className="btn" onClick={secondary.open} data-recap-secondary="1">
            {secondary.label} <span className="flip-rtl">→</span>
          </button>
        )}
        <button className={onNext ? 'btn' : 'btn mega'} onClick={onAgain}>
          {t.again}
        </button>
        <button className="btn ghost" onClick={onHome}>
          {t.home}
        </button>
      </div>
      </section>
      </div>
      {page < pages - 1 && (
        <div className="rp-nav">
          <span className="rp-dots" aria-hidden="true">
            {Array.from({ length: pages }, (_, k) => (
              <i key={k} className={k === page ? 'on' : ''} />
            ))}
          </span>
          <button className="btn mega rp-next" onClick={() => go(page + 1)} data-recap-next="1">
            {lang === 'he' ? 'המשך' : 'Continue'} <span className="flip-rtl">→</span>
          </button>
        </div>
      )}
    </main>
  );
}

/** The section score counting up (lands on the final value even if frames are paused). */
function ScoreCount({ value, run = true }: { value: number; run?: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (document.documentElement.dataset.motion === 'reduced') return setV(value);
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const done = setTimeout(() => setV(value), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [value, run]);
  return <b dir="ltr">{v}</b>;
}

/** The level bar after a session: fills from where it was; a badge when a level was gained. */
function LevelBar({ t, before, after }: { t: Strings; before: number; after: number }) {
  const a = levelOf(before);
  const b = levelOf(after);
  const up = b.level > a.level;
  return (
    <section className="recap-level" data-level={b.level}>
      <div className="rl-head">
        <b>{fill(t.levelN, { n: b.level })}</b>
        {up ? <span className="rl-badge">{fill(t.levelUp, { n: b.level })}</span> : <small dir="ltr">{fill(t.levelXp, { a: b.into, b: b.need })}</small>}
      </div>
      <span className="rl-bar" aria-hidden="true">
        <span style={{ width: `${Math.round(b.pct * 100)}%`, ['--from' as string]: up ? '0%' : `${Math.round(a.pct * 100)}%` }} />
      </span>
    </section>
  );
}

/** After the session (SPEC-AI §8): when today's tricky pair has shown on the profile for weeks, say so — a pattern, not a slip. */
function PairStreak({ pair, lang }: { pair: { topic: string; a: string; b: string }; lang: 'en' | 'he' }) {
  const [weeks, setWeeks] = useState(0);
  useEffect(() => {
    let live = true;
    void refreshProfile().then(() => loadProfileHistory()).then((h) => live && setWeeks(pairWeeks(h, pair.topic, pair.a, pair.b)), () => {});
    return () => {
      live = false;
    };
  }, [pair.topic, pair.a, pair.b]);
  if (weeks < 2) return null;
  return (
    <p className="field-hint coach-streak" data-pair-weeks={weeks}>
      {lang === 'en' ? `This pair has come back ${weeks} weeks running — it's on your profile in Insights.` : `הזוג הזה חוזר כבר ${weeks} שבועות ברצף — הוא מופיע בפרופיל שלכם בתובנות.`}
    </p>
  );
}
