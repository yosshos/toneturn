import { useEffect, useState } from 'react';
import { displayNote } from '../engine/pitch';
import { summary } from '../engine/session';
import type { LessonView } from '../game/controller';
import type { Strings } from '../i18n/strings';
import { namingFor, type Settings } from '../storage/progress';
import { Note, withNote } from './bits';

interface Props {
  t: Strings;
  view: LessonView;
  settings: Settings;
  onReplay: (i: number) => void;
  onAgain: () => void;
  onHome: () => void;
}

export function Recap({ t, view, settings, onReplay, onAgain, onHome }: Props) {
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
    return () => cancelAnimationFrame(raf);
  }, [sm.xp]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  // One concrete review target: the first missed question, else the next step.
  const missed = s.records.findIndex((r) => r.outcome !== 'correct');
  const recT = missed < 0 ? t.recNext : s.lesson.questions[missed].answer === 5 ? t.recReview : t.recReviewBb;
  const q0 = s.lesson.questions[0];
  const fifthKey = s.lesson.intro.find((x) => x.degree === 5)?.key ?? q0.key;
  const rec = withNote(recT, displayNote(q0.target, nm, lang), displayNote(fifthKey, nm, lang));

  return (
    <main className="recap">
      <h1>{t.recapTitle}</h1>
      <div className="stars" aria-label={`${sm.firstTry} ${t.of} ${sm.total} ${t.recapScore}`}>
        {Array.from({ length: sm.total }).map((_, i) => (
          <span key={i} className={`star ${i < sm.firstTry ? 'won' : ''}`} style={{ ['--i' as string]: i }} aria-hidden="true">
            ★
          </span>
        ))}
      </div>
      <p className="score-line">
        <b>
          {sm.firstTry}/{sm.total}
        </b>{' '}
        {t.recapScore} · <bdi className="xp-count" dir="ltr">+{xp} {t.xp}</bdi>
      </p>

      <ol className="recap-list">
        {s.lesson.questions.map((q, i) => {
          const r = s.records[i];
          const ok = r.outcome === 'correct' || r.outcome === 'correct-retry';
          return (
            <li key={q.id} className={`recap-row ${r.outcome}`}>
              <span className="recap-mark" aria-hidden="true">
                {r.outcome === 'correct' ? '★' : ok ? '✓' : r.outcome === 'skipped' ? '–' : '✗'}
              </span>
              <span className="recap-q">
                <Note>{displayNote(q.key, nm, lang)}</Note> {t.major} · {t.answer} <b>{q.answer}</b>
              </span>
              <span className="recap-given">
                {r.attempts.length > 0 && (
                  <>
                    {t.yourAnswer}: {r.attempts.map((a) => a.answer).join(', ')}
                  </>
                )}
              </span>
              <button className="btn small" onClick={() => onReplay(i)} aria-label={`${t.replay} ${i + 1}`}>
                ▶ {t.replay}
              </button>
            </li>
          );
        })}
      </ol>

      <section className="rec-card">
        <h2>{t.recommendation}</h2>
        <p>{rec}</p>
      </section>

      <div className="row center">
        <button className="btn mega" onClick={onAgain}>
          {t.again}
        </button>
        <button className="btn ghost" onClick={onHome}>
          {t.home}
        </button>
      </div>
    </main>
  );
}
