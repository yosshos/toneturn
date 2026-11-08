// Practice log sheet (SPEC-0.48 §P1): add practice done away from the app — kind + minutes, one tap each.
// It counts toward the streak, practice time (Progress → Activity) and a little XP.

import { useEffect, useMemo, useState } from 'react';
import { LOG_KINDS, LOG_MINUTES, LOG_NAME, LOG_XP_PER_DAY, isLog, logKind, logMinutes, logXpOn, type LogKind } from '../engine/practiceLog';
import { localDay, type Progress } from '../storage/progress';

const TX = {
  en: { title: 'Log practice', what: 'What did you practice?', long: 'How long?', min: 'min', save: 'Save', week: 'This week, away from the app', none: 'Nothing logged this week yet.', close: 'Close', xpCap: `Logged practice earns up to ${LOG_XP_PER_DAY} XP a day.`, other: 'Other' },
  he: { title: 'רישום אימון', what: 'על מה התאמנתם?', long: 'כמה זמן?', min: 'דק׳', save: 'שמירה', week: 'השבוע, מחוץ לאפליקציה', none: 'עדיין לא נרשם אימון השבוע.', close: 'סגירה', xpCap: `אימון שנרשם מזכה בעד ${LOG_XP_PER_DAY} XP ביום.`, other: 'אחר' },
};

export function PracticeLogSheet({ lang, progress, onSave, onClose }: { lang: 'en' | 'he'; progress: Progress; onSave: (kind: LogKind, minutes: number, xpToday: number) => void; onClose: () => void }) {
  const tx = TX[lang];
  const [kind, setKind] = useState<LogKind | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const today = localDay(new Date());
  const week = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    const rows = progress.history.filter((h) => isLog(h.lessonId) && new Date(h.completedAt).getTime() >= since);
    const by = new Map<LogKind, number>();
    for (const r of rows) by.set(logKind(r.lessonId)!, (by.get(logKind(r.lessonId)!) ?? 0) + logMinutes(r));
    return { total: rows.reduce((a, r) => a + logMinutes(r), 0), by: [...by.entries()].sort((a, b) => b[1] - a[1]) };
  }, [progress.history]);
  const xpToday = logXpOn(progress.history, today, (iso) => localDay(new Date(iso)));
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet plog" role="dialog" aria-modal="true" aria-labelledby="plog-title" onClick={(e) => e.stopPropagation()} data-practice-log="1">
        <div className="menu-head">
          <h2 id="plog-title">{tx.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={tx.close}>
            ✕
          </button>
        </div>
        <p className="plog-q">{tx.what}</p>
        <div className="chips wrap">
          {LOG_KINDS.map((k) => (
            <button key={k} className={`chip ${kind === k ? 'on' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)} data-log-kind={k}>
              {LOG_NAME[k][lang]}
            </button>
          ))}
        </div>
        <p className="plog-q">{tx.long}</p>
        <div className="chips wrap" dir="ltr">
          {LOG_MINUTES.map((m) => (
            <button key={m} className={`chip ${minutes === m ? 'on' : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)} data-log-min={m}>
              {m} {tx.min}
            </button>
          ))}
        </div>
        <button className="btn plog-save" disabled={!kind || !minutes} onClick={() => kind && minutes && onSave(kind, minutes, xpToday)} data-log-save="1">
          {tx.save}
        </button>
        <small className="field-hint">{tx.xpCap}</small>
        <section className="plog-week" aria-label={tx.week}>
          <h3>
            {tx.week}{' '}
            <b dir="ltr">
              {week.total} {tx.min}
            </b>
          </h3>
          {week.by.length ? (
            <ul>
              {week.by.map(([k, m]) => (
                <li key={k}>
                  <span>{LOG_NAME[k][lang]}</span>
                  <b dir="ltr">
                    {m} {tx.min}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <small className="field-hint">{tx.none}</small>
          )}
        </section>
      </div>
    </div>
  );
}
