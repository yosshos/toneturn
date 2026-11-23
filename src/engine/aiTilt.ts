// The coach's tilt (BUILD-PLAN-2026-11 phase 8 "the AI tilt"; SPEC-RBI-ROTATION §7; SPEC-STYLE-FOCUS §9.2).
//
// Once a week the coach may nudge the daily plan's weights from the MEASURED profile: the improvisation share of an
// instrument course's workout (the 70/30 technique / improvisation split after the path, D2) moves by 5 points a week,
// at most ±10 points in all (RBI §7: "up to ±10 %, with a reason the player can accept or decline"). It is computed on
// the device from the daily snapshots and the mode × function map — the language model only words it (and only once
// the server's weekly prompt knows the field: AI_TILT_SERVER in cloud/ai.ts). Until the player accepts, the plan is
// exactly what it was.
//
// The rules (conservative; every reason is a measured fact):
// - improvisation needs time: over the last 14 days technique closed ≥ 3 items while improvisation closed none, or the
//   colour coverage of the scale rotation is under 50 % across ≥ 3 measured chord functions;
// - technique needs time: over the last 14 days (≥ 5 practice days) technique closed nothing while improvisation moved
//   (closed ≥ 3), or the technique tempo index fell ≥ 5 points;
// - both or neither: no tilt (an earlier accepted tilt steps back toward 0 by 5 points a week).
//
// The style taster suggestion (§9.2): when the ratings show a weak area (styleFocus.weakAreaOf), the coach names one
// unchosen, not-turned-down style that trains it, with that reason ("your timing is the weakest area: try a montuno").
// Pure.

import type { Snapshot } from './snapshot';
import type { ModeStats } from './rotation';
import { focusOf, tasterRotation, declined, WEAK_STYLES, daysBetween, type FocusSettings, type WeakArea } from './styleFocus';
import type { CourseId } from './courses';
import type { StyleId } from './styles';

type L = { en: string; he: string };

export const TILT_STEP = 0.05;
export const TILT_MAX = 0.1;
const WINDOW = 14;

export interface Tilt {
  /** The ISO week (YYYY-Www) it is for. */
  week: string;
  /** The change of the improvisation share (+ more improvisation, − more technique), a multiple of 0.05 in ±0.1. */
  improv: number;
  /** Why, in measured facts (empty when the tilt only steps back toward 0). */
  reasons: L[];
}

/** The player's answer, kept in Settings.aiTilt (one per week). */
export interface TiltAnswer {
  week: string;
  improv: number;
  answer: 'yes' | 'no';
}

/** The ISO week of a local day ('2026-W48'). */
export function isoWeek(day: string): string {
  const d = new Date(day + 'T12:00:00Z');
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - wd + 3);
  const y = t.getUTCFullYear();
  const first = new Date(Date.UTC(y, 0, 4));
  const n = 1 + Math.round(((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(n).padStart(2, '0')}`;
}

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const round2 = (x: number) => Math.round(x * 100) / 100;

/** The closed count of the areas matching `test` on the last snapshot on or before `day`. */
function closedAt(snaps: Snapshot[], day: string, test: (area: string) => boolean): number {
  const s = snaps.filter((x) => x.day <= day).at(-1);
  if (!s) return 0;
  return Object.entries(s.status).filter(([a]) => test(a)).reduce((n, [, st]) => n + (st.closed ?? 0), 0);
}
const tempoAt = (snaps: Snapshot[], day: string, test: (area: string) => boolean): number | null => {
  const s = snaps.filter((x) => x.day <= day).at(-1);
  if (!s) return null;
  const v = Object.entries(s.tempo).filter(([a]) => test(a)).map(([, t]) => t);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export interface TiltInput {
  snaps: Record<string, Snapshot>;
  today: string;
  course: CourseId;
  /** The scale rotation's mode × function map (Settings.rotationStats). */
  stats?: ModeStats;
  /** Last week's accepted tilt (steps from it), if any. */
  prev?: TiltAnswer | null;
}

/** This week's proposed tilt, or null when there is nothing to propose (no need and nothing to step back from). */
export function proposeTilt(inp: TiltInput): Tilt | null {
  if (inp.course !== 'keys' && inp.course !== 'guitar' && inp.course !== 'bass') return null;
  const snaps = Object.values(inp.snaps).sort((a, b) => a.day.localeCompare(b.day));
  const week = isoWeek(inp.today);
  const from = addDays(inp.today, -WINDOW);
  const tech = (a: string) => a === `${inp.course}:technique`;
  const imp = (a: string) => a === `${inp.course}:improv` || a === 'lick';
  const techMoved = closedAt(snaps, inp.today, tech) - closedAt(snaps, from, tech);
  const impMoved = closedAt(snaps, inp.today, imp) - closedAt(snaps, from, imp);
  const days = snaps.filter((s) => s.day > from && s.day <= inp.today && s.practised).length;
  const measured = Object.values(inp.stats ?? {}).filter((x) => x.n >= 2);
  const cov = measured.length >= 3 ? measured.reduce((a, x) => a + x.cov, 0) / measured.length : null;
  const t0 = tempoAt(snaps, from, tech), t1 = tempoAt(snaps, inp.today, tech);
  const reasonsImp: L[] = [];
  const reasonsTech: L[] = [];
  if (techMoved >= 3 && impMoved <= 0) reasonsImp.push({ en: `In 14 days technique closed ${techMoved} items and improvisation none.`, he: `ב־14 יום הטכניקה סגרה ${techMoved} פריטים והאלתור אף אחד.` });
  if (cov !== null && cov < 0.5) reasonsImp.push({ en: `Colour coverage in the scale rotation is ${Math.round(cov * 100)}%.`, he: `כיסוי הצבע בסבב הסולמות עומד על ${Math.round(cov * 100)}%.` });
  if (days >= 5 && techMoved <= 0 && impMoved >= 3) reasonsTech.push({ en: `In 14 days improvisation closed ${impMoved} items and technique none.`, he: `ב־14 יום האלתור סגר ${impMoved} פריטים והטכניקה אף אחד.` });
  if (t0 !== null && t1 !== null && t0 - t1 >= 0.05) reasonsTech.push({ en: `The technique tempo index fell ${Math.round((t0 - t1) * 100)} points.`, he: `מדד הטמפו בטכניקה ירד ${Math.round((t0 - t1) * 100)} נקודות.` });
  const prev = inp.prev && inp.prev.answer === 'yes' && inp.prev.week !== week ? inp.prev.improv : 0;
  let dir = 0;
  if (reasonsImp.length && !reasonsTech.length) dir = 1;
  else if (reasonsTech.length && !reasonsImp.length) dir = -1;
  let next: number;
  if (dir === 0) next = prev > 0 ? Math.max(0, prev - TILT_STEP) : prev < 0 ? Math.min(0, prev + TILT_STEP) : 0;
  else next = Math.max(-TILT_MAX, Math.min(TILT_MAX, prev + dir * TILT_STEP));
  next = round2(next);
  if (next === 0 && prev === 0) return null;
  if (next === prev && dir === 0) return null;
  return { week, improv: next, reasons: dir > 0 ? reasonsImp : dir < 0 ? reasonsTech : [] };
}

/** The tilt the plan uses today: this week's accepted answer (0 otherwise — the plan as it always was). */
export const activeTilt = (a: TiltAnswer | null | undefined, today: string): number => (a && a.answer === 'yes' && a.week === isoWeek(today) ? Math.max(-TILT_MAX, Math.min(TILT_MAX, a.improv)) : 0);

/** The words of a tilt: "Improvisation 30% → 35% this week". `base` is the improvisation share without a tilt. */
export function tiltLine(t: Pick<Tilt, 'improv'>, base: number, lang: 'he' | 'en'): string {
  const a = Math.round(base * 100), b = Math.round((base + t.improv) * 100);
  return lang === 'he' ? `השבוע: אלתור ${a}% ← ${b}% מזמן הטכניקה והאלתור` : `This week: improvisation ${a}% → ${b}% of the technique and improvisation time`;
}

const WEAK_REASON: Record<Exclude<WeakArea, null>, L> = {
  timing: { en: 'Your timing is your weakest measured area', he: 'התזמון הוא התחום החלש ביותר שנמדד אצלכם' },
  voicings: { en: 'Your chords are your weakest measured area', he: 'האקורדים הם התחום החלש ביותר שנמדד אצלכם' },
  melody: { en: 'Your melodic hearing is your weakest measured area', he: 'השמיעה המלודית היא התחום החלש ביותר שנמדד אצלכם' },
};

export interface TasterNudge {
  style: StyleId;
  weak: Exclude<WeakArea, null>;
  reason: L;
}

/**
 * The coach's style taster (§9.2): a style that trains the measured weak area, unchosen, not turned down, not tasted in
 * the last two weeks — in the rotation's order. Null without a weak area (no data reason, no suggestion).
 */
export function tasterNudge(s: FocusSettings, course: CourseId, today: string, weak: WeakArea): TasterNudge | null {
  if (!weak) return null;
  const t = s.styleTaste;
  const fits = WEAK_STYLES[weak];
  const style = tasterRotation(s, course, today, weak).find((x) => fits.includes(x) && !declined(t, x, today) && !(t?.by?.[x]?.tasted && daysBetween(t.by[x]!.tasted!, today) < 14));
  if (!style || focusOf(s, course).main === style) return null;
  return { style, weak, reason: WEAK_REASON[weak] };
}
