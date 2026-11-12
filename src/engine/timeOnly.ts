import { questionSkill, type Question } from './lesson';
import { domainOf } from './rating';

/** A question about time only — rhythm, beat, meter, tempo, groove: no keyboard, no keyboard hint (owner 2026-11-12). */
export function isTimeOnly(q: Question): boolean {
  if (q.kind === 'rhythm-read' || q.kind === 'rhythm-dict') return true;
  const sk = questionSkill(q);
  if (domainOf(sk) === 'time' || sk === 'rhythm') return true;
  const st = q.stimulus ?? [];
  // Sounds with no pitched notes: rhythms, markers, rests, percussion, or click tracks (short ticks at fixed pitches).
  return st.length > 0 && st.every((el) => el.kind === 'rhythm' || el.kind === 'rest' || el.kind === 'marker' || (el.kind === 'events' && el.events.every((e) => !!e.perc || e.duration <= 0.08)));
}
