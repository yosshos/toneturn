// The Rush result card, shared (games fix, AUDIT-GAMES §3 #9): the timed games' end screen — a heading, the big score,
// "new personal best" or the best so far, a stats grid (right, wrong, best combo, level / tier reached …) and
// Again / Back. Rush, Sing Interval, Voicing Sprint and Kit Read all end on this card, so every game reads the same.
import '../rush.css';
import type { ReactNode } from 'react';
import { G2Head } from './Flight';

type Lang = 'en' | 'he';

const T = {
  score: { en: 'Score', he: 'ניקוד' },
  best: { en: 'Best', he: 'שיא' },
  newBest: { en: 'New personal best', he: 'שיא אישי חדש' },
  right: { en: 'Right', he: 'נכונות' },
  wrong: { en: 'Wrong', he: 'שגויות' },
  again: { en: 'Play again', he: 'לשחק שוב' },
  back: { en: 'Back', he: 'חזרה' },
};

/** One extra cell of the stats grid (label, value). */
export interface ResultStat {
  label: string;
  value: ReactNode;
  key?: string;
}

export interface RushResultProps {
  lang: Lang;
  heading: string;
  score: number;
  /** The best before this run (0 / undefined = none). */
  best?: number;
  newBest?: boolean;
  right: number;
  wrong: number;
  /** More cells after right / wrong (best combo, level reached, tier …). */
  stats?: ResultStat[];
  /** A line under the grid (e.g. "practice run — does not clear a level"). */
  note?: ReactNode;
  onAgain: () => void;
  onBack: () => void;
  againLabel?: string;
}

/** The card itself (inside the game's own <main>). */
export function RushResultCard({ lang, heading, score, best, newBest, right, wrong, stats = [], note, onAgain, onBack, againLabel }: RushResultProps) {
  return (
    <section className="g2-card rush-card rush-result" aria-live="polite" data-result-card="1">
      <h2>{heading}</h2>
      <p className="rush-final">
        <span>{T.score[lang]}</span>
        <b>{score}</b>
      </p>
      {newBest ? (
        <p className="rush-newbest">{T.newBest[lang]}</p>
      ) : best ? (
        <p className="g2-dim">
          {T.best[lang]}: {best}
        </p>
      ) : null}
      <dl className="rush-stats">
        <div>
          <dt>{T.right[lang]}</dt>
          <dd>{right}</dd>
        </div>
        <div>
          <dt>{T.wrong[lang]}</dt>
          <dd>{wrong}</dd>
        </div>
        {stats.map((s) => (
          <div key={s.key ?? s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="g2-dim">{note}</p> : null}
      <div className="g2-row">
        <button className="btn primary" onClick={onAgain} data-result-again="1">
          {againLabel ?? T.again[lang]}
        </button>
        <button className="btn ghost" onClick={onBack}>
          {T.back[lang]}
        </button>
      </div>
    </section>
  );
}

/** A whole result screen: the game's header plus the card (for games whose result has no other chrome). */
export function RushResultScreen({ title, className = '', calm = false, ...card }: RushResultProps & { title: string; className?: string; calm?: boolean }) {
  return (
    <main className={`rush rush-over ${calm ? 'calm' : ''} ${className}`}>
      <G2Head title={title} backLabel={T.back[card.lang]} onBack={card.onBack} />
      <RushResultCard {...card} />
    </main>
  );
}
