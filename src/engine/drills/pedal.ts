// Sustain-pedal grading from MIDI CC64 (pedalling drills, spec AI §4.9). Pure.
// Direct pedal: down with the new bass note, up before the next change. Legato (syncopated) pedal: up at the change,
// down again just after the new chord sounds — the classic "up-down" that joins chords without blur.

import type { DrillGoal } from './types';

export interface PedalEvent {
  /** ms from beat 0 of the drill (latency already removed). */
  at: number;
  down: boolean;
  /** The raw CC64 value (0–127) when the take records every sample (half-pedal drills); absent on transitions only. */
  value?: number;
}
export interface PedalResult {
  /** Changes done right / total. */
  ok: number;
  total: number;
  pass: boolean;
  /** Per change: right, or what went wrong. */
  perChange: { beat: number; ok: boolean; why?: 'no-up' | 'early-down' | 'late-down' | 'no-down' | 'blur' | 'full-lift' | 'no-half' }[];
  why: { en: string; he: string };
  /** Half-pedal drills on an on/off pedal (no value between the ends): graded as legato pedal instead (AUDIT-7 #10). */
  switchPedal?: boolean;
}

/**
 * AUDIT-7 #10: a half change is a partial lift — the pedal comes up past the damping point but not all the way, so the
 * low strings keep ringing. Measured from the CC64 values of a continuous (half-pedal capable) pedal: within −200…+450 ms
 * of the change the value dips into HALF_RANGE (never to the top of the lift, ≤ FULL_LIFT), then is back down (≥ 64)
 * by +700 ms. A pedal that only ever sends its two ends (a switch pedal) cannot show a half change.
 */
export const HALF_RANGE: [number, number] = [12, 58];
export const FULL_LIFT = 6;
/** Does the take's CC64 stream hold values between the ends (a continuous pedal)? */
export const continuousPedal = (events: PedalEvent[]): boolean => events.some((e) => e.value !== undefined && e.value > FULL_LIFT && e.value < 121);
/** Half-pedal analysis: per change, the lowest value near it must be a partial lift. */
function analyzeHalf(goal: NonNullable<DrillGoal['pedal']>, events: PedalEvent[], bpm: number): PedalResult {
  const beatMs = 60000 / bpm;
  const ev = [...events].filter((e) => e.value !== undefined).sort((a, b) => a.at - b.at);
  const perChange: PedalResult['perChange'] = goal.changes.map((b, i) => {
    const T = b * beatMs;
    // The first chord: the pedal goes down with it (a moment after is fine).
    if (i === 0) return ev.some((e) => e.value! >= 64 && e.at >= T - 300 && e.at <= T + 600) ? { beat: b, ok: true } : { beat: b, ok: false, why: 'no-down' as const };
    const near = ev.filter((e) => e.at >= T - 200 && e.at <= T + 450);
    if (!near.length) return { beat: b, ok: false, why: 'no-half' as const };
    const lo = Math.min(...near.map((e) => e.value!));
    if (lo <= FULL_LIFT) return { beat: b, ok: false, why: 'full-lift' as const };
    if (lo > HALF_RANGE[1]) return { beat: b, ok: false, why: 'no-half' as const };
    const back = ev.filter((e) => e.at > T && e.at <= T + 700).some((e) => e.value! >= 64);
    if (!back) return { beat: b, ok: false, why: 'late-down' as const };
    return { beat: b, ok: true };
  });
  const ok = perChange.filter((c) => c.ok).length;
  const total = perChange.length;
  const pass = total > 0 && ok / total >= 0.8;
  const worst = perChange.find((c) => !c.ok)?.why;
  const WHY: Record<string, { en: string; he: string }> = {
    'full-lift': { en: 'Only half-way up: a full lift cuts the low note', he: 'רק עד חצי הדרך: הרמה מלאה קוטעת את הצליל הנמוך' },
    'no-half': { en: 'Lift the pedal part-way at each chord change', he: 'הרימו את הפדל חלקית בכל החלפת אקורד' },
    'late-down': { en: 'Back down sooner after the half change', he: 'חזרה למטה מהר יותר אחרי חצי ההחלפה' },
    'no-down': { en: 'Press the pedal at each change', he: 'לחצו על הפדל בכל החלפה' },
  };
  return { ok, total, pass, perChange, why: pass ? { en: `Half-pedal clean (${ok}/${total})`, he: `חצי פדל נקי (${ok}/${total})` } : WHY[worst ?? 'no-half'] };
}

/** CC64 value → pedal down (half-pedal counts as down from 64). */
export const pedalDown = (value: number): boolean => value >= 64;
/** Down / up transitions only (a half-pedal take records every sample; the other analyses read the transitions). */
export function transitions(events: PedalEvent[]): PedalEvent[] {
  if (!events.some((e) => e.value !== undefined)) return [...events];
  const out: PedalEvent[] = [];
  let was = false;
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const d = e.value !== undefined ? pedalDown(e.value) : e.down;
    if (d !== was) out.push({ at: e.at, down: d });
    was = d;
  }
  return out;
}

export function analyzePedal(goal: NonNullable<DrillGoal['pedal']>, events: PedalEvent[], bpm: number): PedalResult {
  if (goal.style === 'half') {
    if (continuousPedal(events)) return analyzeHalf(goal, events, bpm);
    // An on/off pedal: the half change cannot be measured — graded as legato pedal, and the result says so.
    const r = analyzePedal({ ...goal, style: 'legato' }, transitions(events), bpm);
    return { ...r, switchPedal: true, why: { en: `${r.why.en} — your pedal is on/off only, so this was graded as legato pedal (half-pedal needs a continuous pedal)`, he: `${r.why.he} — הפדל שלכם רק מופעל/כבוי, לכן נבדק כפדל לגאטו (חצי פדל צריך פדל רציף)` } };
  }
  const beatMs = 60000 / bpm;
  const ev = transitions(events).sort((a, b) => a.at - b.at);
  const perChange: PedalResult['perChange'] = [];
  goal.changes.forEach((b, i) => {
    const T = b * beatMs;
    const next = goal.changes[i + 1] !== undefined ? goal.changes[i + 1] * beatMs : null;
    if (goal.style === 'legato') {
      // Up near the change (it may come with the new note), then down 30–450 ms after the change.
      const up = i === 0 ? { at: T - 1 } : ev.find((e) => !e.down && e.at >= T - 200 && e.at <= T + 250);
      if (!up) return perChange.push({ beat: b, ok: false, why: 'no-up' });
      const down = ev.find((e) => e.down && e.at > up.at && e.at <= T + 600);
      if (!down) return perChange.push({ beat: b, ok: false, why: 'no-down' });
      if (down.at < T + 30) return perChange.push({ beat: b, ok: false, why: 'early-down' });
      if (down.at > T + 450) return perChange.push({ beat: b, ok: false, why: 'late-down' });
      perChange.push({ beat: b, ok: true });
    } else {
      // Down with the bass (−120…+200 ms), and up again before the next change (blur otherwise).
      const down = ev.find((e) => e.down && e.at >= T - 120 && e.at <= T + 200);
      if (!down) return perChange.push({ beat: b, ok: false, why: ev.some((e) => e.down && e.at > T + 200 && (next === null || e.at < next)) ? 'late-down' : 'no-down' });
      if (next !== null && !ev.some((e) => !e.down && e.at > down.at && e.at <= next + 60)) return perChange.push({ beat: b, ok: false, why: 'blur' });
      perChange.push({ beat: b, ok: true });
    }
  });
  const ok = perChange.filter((c) => c.ok).length;
  const total = perChange.length;
  const pass = total > 0 && ok / total >= 0.8;
  const worst = perChange.find((c) => !c.ok)?.why;
  const WHY: Record<string, { en: string; he: string }> = {
    'no-up': { en: 'Lift the pedal right at the chord change', he: 'הרימו את הפדל בדיוק בהחלפת האקורד' },
    'early-down': { en: 'Pedal down a moment after the new chord, not with it', he: 'הורידו את הפדל רגע אחרי האקורד החדש, לא איתו' },
    'late-down': { en: 'Pedal down sooner after the change', he: 'הורידו את הפדל מוקדם יותר אחרי ההחלפה' },
    'no-down': { en: 'Press the pedal at each change', he: 'לחצו על הפדל בכל החלפה' },
    blur: { en: 'Lift before the next chord — it blurs', he: 'הרימו לפני האקורד הבא — זה מתערבב' },
  };
  return { ok, total, pass, perChange, why: pass ? { en: `Pedal clean (${ok}/${total})`, he: `פדל נקי (${ok}/${total})` } : WHY[worst ?? 'no-down'] };
}
