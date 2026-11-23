// Two small cards at the top of Today: "continue where I stopped" (SPEC-PATH-TODAY-PRACTICE §3.4 — the same point as
// Practice's, continuePlace.ts) and the workout's one-time question about an area that keeps waiting (SPEC-WORKOUT §9.4).

import { useState } from 'react';
import { lastPlace } from './continuePlace';
import type { DomainId } from '../engine/rating';
import '../todayplan.css';

type Lang = 'he' | 'en';

/** The last place visited in Practice (a piece, a licks section, Improvise, technique), opened again in one tap. */
export function ContinueStrip({ lang }: { lang: Lang }) {
  const [last] = useState(() => lastPlace());
  if (!last) return null;
  return (
    <div className="pt-continue today-continue" data-continue-place={last.place} data-today-continue="1">
      <span className="pt-continue-text">
        <small>{lang === 'he' ? 'להמשיך מאיפה שעצרתי' : 'Continue where I stopped'}</small>
        <b dir="auto">{last.title}</b>
      </span>
      <button className="btn primary small" onClick={() => (location.hash = last.hash.replace(/^#/, ''))} data-continue-go="1">
        {lang === 'he' ? 'להמשיך' : 'Continue'}
      </button>
    </div>
  );
}

/**
 * §9.4: "Rhythm keeps waiting. Leave it out of your path, give it less room in each unit, or keep it?" — asked once,
 * dismissible for two weeks (the caller keeps the date).
 */
export function WaitingAsk({ lang, area, areaName, onLeaveOut, onLessRoom, onKeep }: { lang: Lang; area: DomainId; areaName: string; onLeaveOut: () => void; onLessRoom: () => void; onKeep: () => void }) {
  const he = lang === 'he';
  return (
    <section className="card wk-waiting" data-waiting-area={area} aria-label={he ? `${areaName} מחכה` : `${areaName} keeps waiting`}>
      <p dir="auto">
        <b>{he ? `${areaName} מחכה.` : `${areaName} keeps waiting.`}</b> {he ? 'להוציא מהמסלול, לתת פחות מקום בכל יחידה, או להשאיר?' : 'Leave it out of your path, give it less room in each unit, or keep it?'}
      </p>
      <div className="row wk-waiting-actions">
        <button className="btn small ghost" onClick={onLeaveOut} data-wait="out">
          {he ? 'להוציא' : 'Leave out'}
        </button>
        <button className="btn small ghost" onClick={onLessRoom} data-wait="less">
          {he ? 'פחות מקום' : 'Less room'}
        </button>
        <button className="btn small ghost" onClick={onKeep} data-wait="keep">
          {he ? 'להשאיר' : 'Keep'}
        </button>
      </div>
    </section>
  );
}
