// Streak 2.0 UI (spec addendum N): flame states, the streak screen after the first session of the day,
// the streak sheet (calendar, freezes, gems, shop) and the "freeze used" notice. Reduced motion respected.

import { Icon } from './icons';
import { useEffect, useState } from 'react';
import { addDays, canBuy, canBuyCosmetic, COSMETICS, FRAMES, MAX_FREEZES, ownsCosmetic, PRICES, type Purchase, type StreakState } from '../engine/streak';
import type { Strings } from '../i18n/strings';

const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const reduced = () => document.documentElement.dataset.motion === 'reduced';

/** The streak mark (0.61, SPEC-REDESIGN): a streak is counted in bars — a measure with a note, lemon once today is in.
 *  (The name stays Flame for the callers.) */
export function Flame({ lit, size = 22 }: { lit: boolean; size?: number }) {
  return (
    <svg className={`flame bars ${lit ? 'lit' : 'cold'}`} width={size * 1.3} height={size} viewBox="0 0 30 22" aria-hidden="true">
      {lit && <rect x="15" y="2" width="12" height="18" rx="2" fill="#FFD43B" />}
      <path d="M2 5H28M2 9H28M2 13H28M2 17H28" stroke="currentColor" strokeWidth="1" opacity=".35" />
      <path d="M2 2V20M15 2V20M28 2V20" stroke="currentColor" strokeWidth="2.2" />
      <ellipse cx="8.5" cy="14" rx="3.4" ry="2.5" transform="rotate(-20 8.5 14)" fill={lit ? '#6D28D9' : 'currentColor'} opacity={lit ? 1 : 0.45} />
      <ellipse cx="21.5" cy="9.5" rx="3.4" ry="2.5" transform="rotate(-20 21.5 9.5)" fill={lit ? '#1E1033' : 'currentColor'} opacity={lit ? 1 : 0.3} />
    </svg>
  );
}

export function StreakChip({ t, st, onOpen }: { t: Strings; st: StreakState; onOpen: () => void }) {
  return (
    <button className={`chip streak streak-chip ${st.practicedToday ? 'done' : 'todo'}`} onClick={onOpen} aria-label={`${t.streak}: ${st.count}${st.practicedToday ? '' : ` · ${t.streakTodo}`}`}>
      <Flame lit={st.practicedToday} />
      <b>{st.count}</b>
    </button>
  );
}

/** Days practised in the current run (counting back from today, skipping freeze / repaired days). */
export function runDays(st: StreakState, today: string): Set<string> {
  const freeze = new Set(st.freezeDays);
  const repaired = new Set(st.repairedDays);
  const out = new Set<string>();
  let d = st.practicedToday ? today : addDays(today, -1);
  let left = st.count;
  while (left > 0) {
    if (!freeze.has(d) && !repaired.has(d)) {
      out.add(d);
      left--;
    }
    d = addDays(d, -1);
  }
  return out;
}

function WeekStrip({ st, today, t }: { st: StreakState; today: string; t: Strings }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const freeze = new Set(st.freezeDays);
  const run = runDays(st, today);
  return (
    <ol className="week-strip" dir="ltr" aria-label={t.thisWeek}>
      {days.map((d, i) => {
        const isToday = i === 6;
        const done = run.has(d);
        return (
          <li key={d} className={`${done ? 'done' : ''} ${freeze.has(d) ? 'freeze' : ''} ${isToday ? 'today' : ''}`} style={{ ['--i' as string]: i }}>
            <span>{new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            <i aria-hidden="true">{freeze.has(d) ? <Icon k="snow" size={14} /> : done ? <Icon k="flame" size={14} /> : null}</i>
          </li>
        );
      })}
    </ol>
  );
}

/** Full-screen moment after the first qualifying session of the day (spec N.2 / N.5). */
export function StreakCelebration({ t, before, after, gemsGained, today, onDone }: { t: Strings; before: number; after: StreakState; gemsGained: number; today: string; onDone: () => void }) {
  const [shown, setShown] = useState(reduced() ? after.count : before);
  const milestone = after.milestones.find((m) => m.day === today && m.days === after.count);
  useEffect(() => {
    if (reduced()) return;
    const id = window.setTimeout(() => setShown(after.count), 650);
    try {
      navigator.vibrate?.(30);
    } catch {
      /* not supported */
    }
    return () => window.clearTimeout(id);
  }, [after.count]);
  return (
    <div className="streak-celebrate" role="dialog" aria-modal="true" aria-label={t.streakExtended}>
      {milestone && <Confetti />}
      <div className="sc-flame">
        <Flame lit size={132} />
      </div>
      <div className="sc-count" dir="ltr" aria-live="polite">
        <span key={shown} className="roll">
          {shown}
        </span>
      </div>
      <h1>{milestone ? fmt(t.milestoneReached, { n: milestone.days }) : t.streakExtended}</h1>
      <WeekStrip st={after} today={today} t={t} />
      {after.next && <p className="sc-next">{fmt(t.daysToMilestone, { n: after.next.left, m: after.next.days })}</p>}
      {gemsGained > 0 && <p className="sc-gems">+{gemsGained} <Icon k="gem" /></p>}
      <p className="field-hint">{t.seeYouTomorrow}</p>
      <button className="btn mega" onClick={onDone} autoFocus>
        {t.continue}
      </button>
    </div>
  );
}

function Confetti() {
  if (reduced()) return null;
  const colors = ['#FFC94D', '#4BE3B5', '#A98BFF', '#FF6A4D', '#FFF6EA'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 97) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 0.08}s`, ['--r' as string]: `${(i * 47) % 360}deg` }} />
      ))}
    </div>
  );
}

/** Streak sheet: calendar, freezes, gems, next milestone, shop (spec N.3–N.5). */
export function StreakSheet({
  t,
  st,
  gems,
  today,
  lang,
  onBuy,
  purchases = [],
  frame,
  onBuyCosmetic,
  onFrame,
  onClose,
}: {
  t: Strings;
  st: StreakState;
  gems: number;
  today: string;
  lang: 'he' | 'en';
  onBuy: (kind: 'freeze' | 'repair') => void;
  purchases?: Purchase[];
  frame?: string | null;
  onBuyCosmetic?: (item: string) => void;
  onFrame?: (frame: string | null) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const first = `${month}-01`;
  const startDow = (new Date(first + 'T12:00:00').getDay() + 6) % 7;
  const nDays = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const freeze = new Set(st.freezeDays);
  const repaired = new Set(st.repairedDays);
  const milestoneDays = new Set(st.milestones.map((m) => m.day));
  const practiced = runDays(st, today);
  const shift = (n: number) => {
    const [y, m] = month.split('-').map(Number);
    const dt = new Date(y, m - 1 + n, 1);
    setMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet streak-sheet" role="dialog" aria-modal="true" aria-label={t.streak} onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <h2>
            <Flame lit={st.practicedToday} size={26} /> {fmt(t.dayStreak, { n: st.count })}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.back}>
            ✕
          </button>
        </div>
        {!st.practicedToday && st.count > 0 && <p className="streak-risk">{t.streakTodo}</p>}
        <div className="streak-facts">
          <div>
            <small>{t.best}</small>
            <b>{st.best}</b>
          </div>
          <div>
            <small>{t.freezes}</small>
            <b data-freezes={st.freezes}>
              {Array.from({ length: st.freezes }, (_, i) => (
                <Icon key={i} k="snow" />
              ))}
              <span className="dim">
                {Array.from({ length: MAX_FREEZES - st.freezes }, (_, i) => (
                  <Icon key={i} k="snow" />
                ))}
              </span>
            </b>
          </div>
          <div>
            <small>{t.gems}</small>
            <b><Icon k="gem" /> {gems}</b>
          </div>
        </div>
        {st.next && (
          <div className="milestone-ring" style={{ ['--p' as string]: `${(100 * (st.next.days - st.next.left)) / st.next.days}%` }}>
            <span>{fmt(t.daysToMilestone, { n: st.next.left, m: st.next.days })}</span>
          </div>
        )}
        <div className="cal-head">
          <button className="icon-btn small" onClick={() => shift(-1)} aria-label="‹">
            <span className="flip-rtl">‹</span>
          </button>
          <b>{new Date(first + 'T12:00:00').toLocaleDateString(lang, { month: 'long', year: 'numeric' })}</b>
          <button className="icon-btn small" onClick={() => shift(1)} aria-label="›" disabled={month >= today.slice(0, 7)}>
            <span className="flip-rtl">›</span>
          </button>
        </div>
        <ol className="streak-cal" dir="ltr">
          {Array.from({ length: startDow }, (_, i) => (
            <li key={`e${i}`} className="empty" />
          ))}
          {Array.from({ length: nDays }, (_, i) => {
            const d = `${month}-${String(i + 1).padStart(2, '0')}`;
            const cls = freeze.has(d) ? 'freeze' : repaired.has(d) ? 'repaired' : practiced.has(d) ? 'done' : '';
            return (
              <li key={d} className={`${cls} ${d === today ? 'today' : ''} ${milestoneDays.has(d) ? 'milestone' : ''}`} title={d}>
                {cls === 'freeze' ? <Icon k="snow" size={14} /> : i + 1}
              </li>
            );
          })}
        </ol>
        <section className="menu-card shop">
          <h3>{t.shop}</h3>
          <div className="shop-row">
            <div>
              <b><Icon k="snow" /> {t.streakFreeze}</b>
              <small>{t.freezeHint}</small>
            </div>
            <button className="btn primary small" disabled={!canBuy('freeze', gems, st)} onClick={() => onBuy('freeze')}>
              {PRICES.freeze} <Icon k="gem" />
            </button>
          </div>
          {st.repairable && (
            <div className="shop-row repair">
              <div>
                <b>{t.streakRepair}</b>
                <small>{fmt(t.repairHint, { n: st.repairable.lost })}</small>
              </div>
              <button className="btn primary small" disabled={!canBuy('repair', gems, st)} onClick={() => onBuy('repair')}>
                {PRICES.repair} <Icon k="gem" />
              </button>
            </div>
          )}
          <p className="field-hint">{t.gemsHint}</p>
        </section>
        {onBuyCosmetic && onFrame && (
          <section className="menu-card shop frames">
            <h3>{t.framesTitle}</h3>
            <div className="frame-grid">
              {FRAMES.map((id) => {
                const item = `frame-${id}`;
                const owned = ownsCosmetic(purchases, item);
                return (
                  <div key={id} className={`frame-opt ${frame === id ? 'on' : ''}`} data-frame-opt={id}>
                    <span className={`frame-preview avatar-frame fr-${id}`} aria-hidden="true" />
                    <b>{t.frameNames[id]}</b>
                    {owned ? (
                      <button className="btn ghost small" onClick={() => onFrame(frame === id ? null : id)}>
                        {frame === id ? t.frameNone : t.frameUse}
                      </button>
                    ) : (
                      <button className="btn primary small" disabled={!canBuyCosmetic(item, gems, purchases)} onClick={() => onBuyCosmetic(item)}>
                        {COSMETICS[item]} <Icon k="gem" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="field-hint">{t.framesHint}</p>
          </section>
        )}
      </div>
    </div>
  );
}

/** "Your freeze kept your 12-day streak" — shown once per used freeze. */
export function FreezeToast({ t, count, onClose }: { t: Strings; count: number; onClose: () => void }) {
  return (
    <div className="freeze-toast" role="status">
      <span className="ice fermata" aria-hidden="true">
        <svg viewBox="0 0 24 20" width="24" height="20">
          <path d="M3 15a9 9 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="12" cy="13" r="2.2" fill="currentColor" />
        </svg>
      </span>
      <span>{fmt(t.freezeUsed, { n: count })}</span>
      <button className="icon-btn small" onClick={onClose} aria-label={t.done}>
        ✕
      </button>
    </div>
  );
}
