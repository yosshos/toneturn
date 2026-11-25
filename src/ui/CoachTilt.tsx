// The coach's weekly tilt and style taster suggestion (BUILD-PLAN-2026-11 phase 8; SPEC-RBI-ROTATION §7;
// SPEC-STYLE-FOCUS §9.2). Computed on the device from the measured profile (aiTilt.ts); the player accepts or declines,
// and only an accepted tilt changes the daily plan (workout2 SuggestInput.tilt). A card on the Insights page, beside
// the weekly summary, and (SPEC-WEEK-PLAN-TILT §2) on Today under the workout card while this week's proposal is
// unanswered — never inside an exercise, never a toast.

import { useEffect, useMemo, useState } from 'react';
import type { Settings } from '../storage/progress';
import type { CourseId } from '../engine/courses';
import type { Snapshot } from '../engine/snapshot';
import type { WeakArea } from '../engine/styleFocus';
import { STYLE_TEXT } from '../engine/styles';
import { DAY_SHARES } from '../engine/workout2';
import { activeTilt, isoWeek, proposeTilt, tasterNudge, tiltLine } from '../engine/aiTilt';
import { loadSnapshots } from '../storage/snapshots';
import { setWeeklyExtra } from '../cloud/ai';
import { matrixTierOf } from './todayTech';
import { drillSettingsOf } from './Drills';
import '../progress-time.css';

type Lang = 'he' | 'en';

export function CoachTilt({ settings: s, lang, course, today, weak, onSettings, snapshots, today_ = false }: { /** SPEC-WEEK-PLAN-TILT §2: the Today card — this week's unanswered tilt only (no taster, gone once answered). */ today_?: boolean; settings: Settings; lang: Lang; course: CourseId; today: string; weak: WeakArea; onSettings: (p: Partial<Settings>) => void; /** Tests: the snapshots instead of the device store. */ snapshots?: Record<string, Snapshot> }) {
  const he = lang === 'he';
  const [snaps, setSnaps] = useState<Record<string, Snapshot> | null>(snapshots ?? null);
  useEffect(() => {
    if (!snapshots) void loadSnapshots().then(setSnaps);
  }, [snapshots]);
  const week = isoWeek(today);
  const answered = s.aiTilt?.week === week ? s.aiTilt : null;
  const prev = s.aiTilt && s.aiTilt.week !== week ? s.aiTilt : null;
  const tilt = useMemo(() => (snaps ? proposeTilt({ snaps, today, course, stats: s.rotationStats, prev }) : null), [snaps, today, course, s.rotationStats, prev?.week]); // eslint-disable-line react-hooks/exhaustive-deps
  const nudge = useMemo(() => tasterNudge(s, course, today, weak), [s.styleTaste, s.styleFocus, course, today, weak]); // eslint-disable-line react-hooks/exhaustive-deps
  const tier = useMemo(() => (course === 'keys' || course === 'guitar' || course === 'bass' ? matrixTierOf(s, drillSettingsOf(s), {}) : 2), [course, s.courseStart, s.drillStart]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = 1 - (tier <= 1 ? DAY_SHARES.techBeginner : DAY_SHARES.tech);
  // the weekly summary may word the tilt and the taster (sent only once the server's prompt knows them, AI_TILT_SERVER)
  useEffect(() => {
    if (today_) return; // the Insights card feeds the weekly summary; the Today card only asks
    setWeeklyExtra(tilt || nudge ? { ...(tilt ? { tilt: { improvShare: Math.round((base + tilt.improv) * 100), from: Math.round(base * 100), reasons: tilt.reasons.map((r) => r.en) } } : {}), ...(nudge ? { taster: { style: STYLE_TEXT[nudge.style].en, reason: nudge.reason.en } } : {}) } : null);
    return () => setWeeklyExtra(null);
  }, [tilt, nudge, base, today_]);
  const coachTaster = s.styleTaste?.coach;
  const asked = !!coachTaster && coachTaster.course === course && coachTaster.style === nudge?.style;
  if (today_ && (answered || !tilt)) return null;
  if (!tilt && !answered && !nudge) return null;
  const shown = answered ?? (tilt ? { week, improv: tilt.improv, answer: null as null | 'yes' | 'no' } : null);
  return (
    <section className={`set-card coach-tilt ${today_ ? 'today' : ''}`} data-coach-tilt={shown ? (shown.answer ?? 'open') : 'taster'} data-coach-tilt-today={today_ ? '1' : undefined}>
      <h2>{he ? 'הצעת המאמן לשבוע' : "The coach's suggestion for the week"}</h2>
      {shown && (
        <div className="ct-tilt" data-tilt={Math.round(shown.improv * 100)}>
          <p className="ct-line">{tiltLine(shown, base, lang)}</p>
          {tilt && tilt.reasons.length > 0 && !answered && (
            <ul className="ct-reasons">
              {tilt.reasons.map((r) => (
                <li key={r.en}>{r[lang]}</li>
              ))}
            </ul>
          )}
          {!answered ? (
            <div className="ct-actions">
              <button type="button" className="btn primary small" onClick={() => onSettings({ aiTilt: { week, improv: shown.improv, answer: 'yes' } })} data-tilt-accept="1">
                {he ? 'לקבל' : 'Accept'}
              </button>
              <button type="button" className="btn ghost small" onClick={() => onSettings({ aiTilt: { week, improv: shown.improv, answer: 'no' } })} data-tilt-decline="1">
                {he ? 'לא השבוע' : 'Not this week'}
              </button>
            </div>
          ) : (
            <p className="field-hint" data-tilt-answer={answered.answer}>
              {answered.answer === 'yes' ? (he ? `התוכנית היומית של השבוע כבר כוללת את זה (${Math.round(activeTilt(answered, today) * 100)} נקודות).` : `This week's daily plan already includes it (${Math.round(activeTilt(answered, today) * 100)} points).`) : he ? 'התוכנית היומית נשארת כמו שהיא השבוע.' : 'The daily plan stays as it is this week.'}{' '}
              <button type="button" className="link" onClick={() => onSettings({ aiTilt: { ...answered, answer: answered.answer === 'yes' ? 'no' : 'yes' } })} data-tilt-toggle="1">
                {answered.answer === 'yes' ? (he ? 'לבטל' : 'Undo') : he ? 'בכל זאת לקבל' : 'Accept after all'}
              </button>
            </p>
          )}
        </div>
      )}
      {nudge && !today_ && (
        <div className="ct-taster" data-coach-taster={nudge.style}>
          <p className="ct-line">
            {he ? 'טעימת סגנון: ' : 'A style taster: '}
            <b>{STYLE_TEXT[nudge.style][lang]}</b>
          </p>
          <p className="field-hint">{nudge.reason[lang]}{he ? ' — סגנון שמאמן בדיוק את זה.' : ' — a style that trains exactly this.'}</p>
          {asked ? (
            <p className="field-hint" data-coach-taster-asked="1">{he ? 'הטעימה מחכה לכם במסך היום.' : 'The taster is waiting for you on Today.'}</p>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => onSettings({ styleTaste: { ...(s.styleTaste ?? {}), since: s.styleTaste?.since ?? today, coach: { style: nudge.style, course, day: today } } })} data-coach-taster-go="1">
              {he ? 'להציג במסך היום' : 'Show it on Today'}
            </button>
          )}
        </div>
      )}
      <small className="field-hint">{he ? 'מחושב במכשיר מתוך מה שנמדד.' : 'Computed on this device from what was measured.'}</small>
    </section>
  );
}
