// Sustain-pedal grading from MIDI CC64 (pedalling drills, spec AI §4.9). Pure.
// Direct pedal: down with the new bass note, up before the next change. Legato (syncopated) pedal: up at the change,
// down again just after the new chord sounds — the classic "up-down" that joins chords without blur.

import type { DrillGoal } from './types';

export interface PedalEvent {
  /** ms from beat 0 of the drill (latency already removed). */
  at: number;
  down: boolean;
}
export interface PedalResult {
  /** Changes done right / total. */
  ok: number;
  total: number;
  pass: boolean;
  /** Per change: right, or what went wrong. */
  perChange: { beat: number; ok: boolean; why?: 'no-up' | 'early-down' | 'late-down' | 'no-down' | 'blur' }[];
  why: { en: string; he: string };
}

/** CC64 value → pedal down (half-pedal counts as down from 64). */
export const pedalDown = (value: number): boolean => value >= 64;

export function analyzePedal(goal: NonNullable<DrillGoal['pedal']>, events: PedalEvent[], bpm: number): PedalResult {
  const beatMs = 60000 / bpm;
  const ev = [...events].sort((a, b) => a.at - b.at);
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
