// The practice session's end screen (docs/SPEC-PRACTICE-SESSION.md §5, §6, §11.4, §11.6). Props only — fed by
// engine/sessionReward.ts sessionReward() and engine/momentum.ts momentum(); no store access.
//
// Above the fold on a 375 px phone: Toni proud, the minutes counting up, what was done, the milestone (one big in the
// celebration style, in the Paper look; up to two chips), the week ring against the goal, the Momentum ring and the
// stretch minutes. Below: the totals, the one graph, tomorrow, "raise the goal" (§6), "How was it?". Share and Done stay
// in a bar at the bottom. A calm teacher's tone: no emoji, no exclamation marks.

import { useEffect, useState, type ReactNode } from 'react';
import { Toni } from './Toni';
import { Icon, type IconKey } from './icons';
import { PracticeCalendar } from './OverTimeCharts';
import { SmallLine } from './ProgressOverTime';
import type { Momentum } from '../engine/momentum';
import { BOOST_AT, momentumLine } from '../engine/momentum';
import { graphTitle, headlineLine, hm, milestoneText, stretchText, tomorrowText, type GraphChoice, type Milestone, type MilestoneKind, type SessionReward } from '../engine/sessionReward';

type Lang = 'he' | 'en';

const S = {
  min: { he: 'דק׳', en: 'min' },
  week: { he: 'השבוע', en: 'This week' },
  month: { he: 'החודש', en: 'This month' },
  year: { he: 'השנה', en: 'This year' },
  ofGoal: { he: 'מתוך', en: 'of' },
  onLast: { he: 'יותר משבוע שעבר', en: 'on last week' },
  momentum: { he: 'מומנטום', en: 'Momentum' },
  persistence: { he: 'התמדה', en: 'Persistence' },
  progress: { he: 'התקדמות', en: 'Progress' },
  weekRing: { he: 'דקות השבוע מול היעד', en: "This week's minutes against the goal" },
  totals: { he: 'סיכומים', en: 'Totals' },
  share: { he: 'שיתוף', en: 'Share' },
  done: { he: 'סיום', en: 'Done' },
  raise: { he: (n: number) => `להעלות ל-${n} דקות ביום?`, en: (n: number) => `Make it ${n} minutes a day?` },
  raiseWhy: { he: 'שלושה שבועות ברצף עמדת ביעד.', en: 'Three weeks in a row at your goal.' },
  yes: { he: 'כן', en: 'Yes' },
  notNow: { he: 'לא עכשיו', en: 'Not now' },
  lastAvg: { he: 'ממוצע שבוע שעבר', en: "Last week's average" },
} as const;

const GLYPH: Record<MilestoneKind, IconKey> = {
  hours: 'clock',
  sessions: 'check',
  streak: 'flame',
  longest: 'trophy',
  bestWeek: 'trophy',
  bestMonth: 'trophy',
  average: 'up',
  weekGoal: 'target',
  itemClosed: 'star',
  keyFilled: 'trophy',
};

const reduced = () => typeof document === 'undefined' || document.documentElement.dataset.motion === 'reduced';

/** The minutes counting up to their number (instant with reduced motion, and on the server). */
function useCountUp(n: number, ms = 900): number {
  const [v, setV] = useState(() => (reduced() ? n : 0));
  useEffect(() => {
    if (reduced() || n <= 0) return setV(n);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(n * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, ms]);
  return v;
}

/** A ring: one or two arcs (shares 0..1) around a number. */
function Ring({ parts, label, children, size = 64 }: { parts: { share: number; cls: string }[]; label: string; children: ReactNode; size?: number }) {
  const r = 26;
  const C = 2 * Math.PI * r;
  let at = 0;
  return (
    <span className="se-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <circle cx={32} cy={32} r={r} fill="none" className="se-ring-track" strokeWidth={6} />
        {parts.map((p, i) => {
          const len = Math.max(0, Math.min(1, p.share)) * C * (parts.length > 1 ? 0.5 : 1);
          const off = at;
          at += (parts.length > 1 ? 0.5 : 1) * C;
          return len > 0 ? <circle key={i} cx={32} cy={32} r={r} fill="none" className={p.cls} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${len} ${C}`} strokeDashoffset={-off} transform="rotate(-90 32 32)" /> : null;
        })}
      </svg>
      <span className="se-ring-num">{children}</span>
    </span>
  );
}

function BigMilestone({ m, lang }: { m: Milestone; lang: Lang }) {
  return (
    <section className="se-big" data-milestone={m.kind} aria-live="polite">
      <span className="se-big-art" aria-hidden="true">
        <Icon k={GLYPH[m.kind]} size={34} />
      </span>
      <p>{milestoneText(m)[lang]}</p>
    </section>
  );
}

function MinutesBars({ g, lang }: { g: Extract<GraphChoice, { kind: 'minutes' }>; lang: Lang }) {
  const w = 300, h = 110, pad = { l: 8, r: 8, t: 10, b: 18 };
  const max = Math.max(1, g.lastWeekAvgMin, ...g.days.map((d) => d.min));
  const bw = (w - pad.l - pad.r) / 7;
  const y = (v: number) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const letters = lang === 'he' ? ['ב', 'ג', 'ד', 'ה', 'ו', 'ש', 'א'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="pt-chart" dir="ltr" data-graph="minutes">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={g.days.map((d) => `${d.day}: ${d.min}`).join(', ')}>
        {g.days.map((d, i) => (
          <g key={d.day}>
            {d.min > 0 && d.day <= g.today && <rect x={pad.l + i * bw + 6} y={y(d.min)} width={bw - 12} height={h - pad.b - y(d.min)} rx={4} className={d.day === g.today ? 'se-bar se-bar-today' : 'se-bar'} />}
            <text x={pad.l + i * bw + bw / 2} y={h - 4} textAnchor="middle" className="tg-tick">{letters[i]}</text>
          </g>
        ))}
        {g.lastWeekAvgMin > 0 && <line x1={pad.l} x2={w - pad.r} y1={y(g.lastWeekAvgMin)} y2={y(g.lastWeekAvgMin)} className="pt-target" />}
      </svg>
      {g.lastWeekAvgMin > 0 && <small className="se-graph-key">{`${S.lastAvg[lang]}: ${g.lastWeekAvgMin} ${S.min[lang]}`}</small>}
    </div>
  );
}

function Graph({ g, lang }: { g: GraphChoice; lang: Lang }) {
  const color = 'var(--hue-instrument, #6250d6)';
  const title = graphTitle(g)[lang];
  return (
    <section className="se-graph" data-graph-kind={g.kind}>
      <h2>{title}</h2>
      {g.kind === 'improvement' ? (
        <SmallLine pts={g.pts} color={color} name={title} lang={lang} fmt={(v) => (g.unit === 'bpm' ? `♩${Math.round(v)}` : `${Math.round(v * 100)}%`)} />
      ) : g.kind === 'average' ? (
        <SmallLine pts={g.pts} color={color} name={title} lang={lang} fmt={(v) => `${Math.round(v)}′`} />
      ) : g.kind === 'minutes' ? (
        <MinutesBars g={g} lang={lang} />
      ) : (
        <PracticeCalendar days={g.days} color={color} lang={lang} weeks={g.weeks} today={g.today} />
      )}
    </section>
  );
}

/** §11.4 on Today: the week's Momentum as a small tile (the persistence and progress arcs, the score, one line). */
export function MomentumTile({ m, lang, onOpen }: { m: Momentum; lang: Lang; onOpen?: () => void }) {
  return (
    <button type="button" className="tc-card st-stat st-momentum" onClick={onOpen} data-today-momentum={m.score}>
      <Ring size={36} parts={[{ share: m.persistence / 50, cls: 'se-arc-persist' }, { share: m.progress / 50, cls: 'se-arc-progress' }]} label={`${S.momentum[lang]} ${m.score}: ${S.persistence[lang]} ${Math.round(m.persistence)}, ${S.progress[lang]} ${Math.round(m.progress)}`}>
        <b dir="ltr">{m.score}</b>
      </Ring>
      <span className="st-momentum-txt">
        <small>{S.momentum[lang]}</small>
        <span className={`st-xs ${m.score >= BOOST_AT ? 'se-boost' : ''}`}>{momentumLine(m)[lang]}</span>
      </span>
    </button>
  );
}

export interface SessionEndProps {
  lang: Lang;
  reward: SessionReward;
  /** This week's Momentum (engine/momentum.ts), or null before there is any. */
  momentum?: Momentum | null;
  /** The "How was it?" slot (the existing feedback chips). */
  feedback?: ReactNode;
  onShare: () => void;
  onDone: () => void;
  /** The totals open Progress › Over time. */
  onTotals?: () => void;
  /** §6: the answer to "Make it N minutes a day?" */
  onRaiseGoal?: (yes: boolean) => void;
}

export function SessionEnd({ lang, reward: r, momentum, feedback, onShare, onDone, onTotals, onRaiseGoal }: SessionEndProps) {
  const shown = useCountUp(r.minutes);
  const [raised, setRaised] = useState(false);
  const ring = r.ring;
  const head = headlineLine(r.parts)[lang];
  return (
    <main className="session-end" data-session-end={r.minutes}>
      <div className="se-fold">
        <header className="se-head">
          <span className="se-toni">
            <Toni state="proud" size={72} />
          </span>
          <div>
            <p className="se-min" aria-label={`${r.minutes} ${S.min[lang]}`}>
              <b dir="ltr">{shown}</b> <span>{S.min[lang]}</span>
            </p>
            <h1>{head}</h1>
          </div>
        </header>
        {r.big && <BigMilestone m={r.big} lang={lang} />}
        {r.small.length > 0 && (
          <ul className="se-chips">
            {r.small.map((m) => (
              <li key={m.kind} data-milestone={m.kind}>
                <Icon k={GLYPH[m.kind]} size={14} />
                <span>{milestoneText(m)[lang]}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="se-rings">
          <div className="se-ring-box" data-week-ring={`${ring.nowMin}/${ring.goalMin}`}>
            <Ring parts={[{ share: ring.goalMin > 0 ? ring.nowMin / ring.goalMin : 0, cls: 'se-arc-week' }]} label={`${S.weekRing[lang]}: ${ring.nowMin} / ${ring.goalMin}`}>
              <b dir="ltr">{ring.nowMin}</b>
            </Ring>
            <span className="se-ring-cap">
              <b>{S.week[lang]}</b>
              <small>{`${S.ofGoal[lang]} ${ring.goalMin} ${S.min[lang]}`}</small>
              {ring.upMin !== null && <small className="se-up" dir="auto">{`▲ ${ring.upMin} ${S.min[lang]} ${S.onLast[lang]}`}</small>}
            </span>
          </div>
          {momentum && (
            <div className="se-ring-box" data-momentum={momentum.score}>
              <Ring parts={[{ share: momentum.persistence / 50, cls: 'se-arc-persist' }, { share: momentum.progress / 50, cls: 'se-arc-progress' }]} label={`${S.momentum[lang]} ${momentum.score}: ${S.persistence[lang]} ${Math.round(momentum.persistence)}, ${S.progress[lang]} ${Math.round(momentum.progress)}`}>
                <b dir="ltr">{momentum.score}</b>
              </Ring>
              <span className="se-ring-cap">
                <b>{S.momentum[lang]}</b>
                <small className={momentum.score >= BOOST_AT ? 'se-boost' : ''}>{momentumLine(momentum)[lang]}</small>
              </span>
            </div>
          )}
        </div>
        {r.stretch && <p className="se-stretch">{stretchText(r.stretch)[lang]}</p>}
      </div>

      <div className="se-more">
        <button type="button" className="se-totals" onClick={onTotals} disabled={!onTotals} aria-label={S.totals[lang]}>
          {(
            [
              ['week', r.totals.weekMs],
              ['month', r.totals.monthMs],
              ['year', r.totals.yearMs],
            ] as const
          ).map(([k, ms]) => (
            <span key={k}>
              <small>{S[k][lang]}</small>
              <b>{hm(ms, lang)}</b>
            </span>
          ))}
        </button>
        <Graph g={r.graph} lang={lang} />
        {r.tomorrow && <p className="se-tomorrow">{tomorrowText(r.tomorrow)[lang]}</p>}
        {r.raiseGoal && onRaiseGoal && !raised && (
          <section className="se-raise">
            <p>
              <b>{S.raise[lang](r.raiseGoal.to)}</b> <small>{S.raiseWhy[lang]}</small>
            </p>
            <div>
              <button type="button" className="btn small" onClick={() => (setRaised(true), onRaiseGoal(true))}>
                {S.yes[lang]}
              </button>
              <button type="button" className="btn small ghost" onClick={() => (setRaised(true), onRaiseGoal(false))}>
                {S.notNow[lang]}
              </button>
            </div>
          </section>
        )}
        {feedback && <div className="se-feedback">{feedback}</div>}
      </div>

      <footer className="se-actions">
        <button type="button" className="btn ghost" onClick={onShare}>
          <Icon k="share" size={16} /> {S.share[lang]}
        </button>
        <button type="button" className="btn primary" onClick={onDone}>
          {S.done[lang]}
        </button>
      </footer>
    </main>
  );
}
