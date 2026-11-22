// The technique hub's small channel line (BUILD-PLAN-2026-11 phase 6; SPEC-EAR-AND-READING §3.1, §5, §8.1): this
// week's channel mix and why ("reading 28%: the gap between ear and reading is still large"), and today's sight dose —
// one short new reading exercise in the key of the day, played at sight (no demo). Small, quiet, one line each.

import type { Drill } from '../engine/drills/types';
import { mixReason, type Mix, type Strong } from '../engine/presentation';
import { mixLine } from '../engine/channelPlan';
import { Icon } from './icons';

type Lang = 'he' | 'en';

/** What a technique run needs to present items by mastery (channelPlan.runPresentation). */
export interface RunChan {
  strong: Strong;
  mix: Mix | null;
  day: string;
}

export function ChannelStrip({ lang, mix, strong, sight, onSight }: { lang: Lang; mix: Mix; strong: Strong; sight: { drill: Drill; done: boolean } | null; onSight: (d: Drill) => void }) {
  const he = lang === 'he';
  return (
    <div className="ch-strip" data-channel-strip="1">
      <p className="ch-mix" data-channel-mix={`${Math.round(mix.strong * 100)}/${Math.round(mix.weak * 100)}/${Math.round(mix.memory * 100)}`}>
        <b>{he ? 'השבוע' : 'This week'}</b> <span>{mixLine(mix, strong, lang)}</span>
        <small>{mixReason(mix, strong, lang)}</small>
      </p>
      {sight && (
        <button type="button" className={`ch-sight ${sight.done ? 'done' : ''}`} onClick={() => onSight(sight.drill)} disabled={sight.done} data-sight-dose={sight.done ? 'done' : 'open'}>
          <Icon k={sight.done ? 'check' : 'book'} size={18} />
          <span>
            <b>{he ? 'קריאה יומית' : 'Daily sight-reading'}</b>
            <small>{sight.done ? (he ? 'נקרא היום' : 'Read today') : he ? 'תרגיל קצר וחדש, מהדף, בלי האזנה לפני' : 'A short new piece, from the page, no listening first'}</small>
          </span>
        </button>
      )}
    </div>
  );
}
