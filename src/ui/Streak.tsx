// Streak 2.0 UI (spec addendum N): flame states, the streak screen after the first session of the day,
// the streak sheet (calendar, freezes, gems, shop) and the "freeze used" notice. Reduced motion respected.

import { useEffect, useState } from 'react';
import { addDays, canBuy, canBuyCosmetic, COSMETICS, MAX_FREEZES, ownsCosmetic, PRICES, THEMES, type Purchase, type StreakState } from '../engine/streak';
import type { Strings } from '../i18n/strings';

const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const reduced = () => document.documentElement.dataset.motion === 'reduced';

export function Flame({ lit, size = 22 }: { lit: boolean; size?: number }) {
  return (
    <svg className={`flame ${lit ? 'lit' : 'cold'}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={lit ? 'fl-lit' : 'fl-cold'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lit ? '#FFD66B' : '#B9AECF'} />
          <stop offset="1" stopColor={lit ? '#FF5E3A' : '#6E6190'} />
        </linearGradient>
      </defs>
      <path d="M12 2c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.2-3.9 2.4-5.1.2 1.6.9 2.6 1.9 3.1C10.3 8.2 11.2 4.9 12 2z" fill={`url(#${lit ? 'fl-lit' : 'fl-cold'})`} />
      <path d="M12 12.5c.6 1.4 2.3 2.2 2.3 4.1a2.3 2.3 0 0 1-4.6 0c0-1.3.9-2.2 2.3-4.1z" fill={lit ? '#FFF1B8' : '#D7D0E6'} opacity=".9" />
    </svg>
  );
}

/** Header chip: flame (grey until today is done) + count; opens the streak sheet. */
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
            <i aria-hidden="true">{freeze.has(d) ? '❄' : done ? '🔥' : ''}</i>
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
      {gemsGained > 0 && <p className="sc-gems">+{gemsGained} 💎</p>}
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
  theme = 'violet',
  onBuyCosmetic,
  onTheme,
  onClose,
}: {
  t: Strings;
  st: StreakState;
  gems: number;
  today: string;
  lang: 'he' | 'en';
  onBuy: (kind: 'freeze' | 'repair') => void;
  purchases?: Purchase[];
  theme?: string;
  onBuyCosmetic?: (item: string) => void;
  onTheme?: (theme: string) => void;
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
            <b>
              {'❄'.repeat(st.freezes)}
              <span className="dim">{'❄'.repeat(MAX_FREEZES - st.freezes)}</span>
            </b>
          </div>
          <div>
            <small>{t.gems}</small>
            <b>💎 {gems}</b>
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
                {cls === 'freeze' ? '❄' : i + 1}
              </li>
            );
          })}
        </ol>
        <section className="menu-card shop">
          <h3>💎 {t.shop}</h3>
          <div className="shop-row">
            <div>
              <b>❄ {t.streakFreeze}</b>
              <small>{t.freezeHint}</small>
            </div>
            <button className="btn primary small" disabled={!canBuy('freeze', gems, st)} onClick={() => onBuy('freeze')}>
              {PRICES.freeze} 💎
            </button>
          </div>
          {st.repairable && (
            <div className="shop-row repair">
              <div>
                <b>🔧 {t.streakRepair}</b>
                <small>{fmt(t.repairHint, { n: st.repairable.lost })}</small>
              </div>
              <button className="btn primary small" disabled={!canBuy('repair', gems, st)} onClick={() => onBuy('repair')}>
                {PRICES.repair} 💎
              </button>
            </div>
          )}
          <p className="field-hint">{t.gemsHint}</p>
        </section>
        {onBuyCosmetic && onTheme && (
          <section className="menu-card shop themes">
            <h3>🎨 {t.themesTitle}</h3>
            <div className="theme-grid">
              {THEMES.map((id) => {
                const item = `theme-${id}`;
                const owned = ownsCosmetic(purchases, item);
                return (
                  <div key={id} className={`theme-opt ${theme === id ? 'on' : ''}`} data-theme-opt={id}>
                    <span className={`theme-swatch sw-${id}`} aria-hidden="true" />
                    <b>{t.themeNames[id]}</b>
                    {owned ? (
                      <button className="btn ghost small" disabled={theme === id} onClick={() => onTheme(id)}>
                        {theme === id ? `✓ ${t.themeInUse}` : t.themeUse}
                      </button>
                    ) : (
                      <button className="btn primary small" disabled={!canBuyCosmetic(item, gems, purchases)} onClick={() => onBuyCosmetic(item)}>
                        {COSMETICS[item]} 💎
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="field-hint">{t.themesHint}</p>
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
      <span className="ice" aria-hidden="true">
        ❄
      </span>
      <span>{fmt(t.freezeUsed, { n: count })}</span>
      <button className="icon-btn small" onClick={onClose} aria-label={t.done}>
        ✕
      </button>
    </div>
  );
}
