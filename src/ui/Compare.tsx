// Compare (docs/SPEC-STATS.md §1, S4, S9, S10): me vs a friend (radar overlay, per-area levels, streak,
// XP, lessons, game bests, duel record), me vs past me (this frame vs the one before), and the friends
// leaderboard with frame chips (default: XP in the frame — effort, not level). Privacy: the "Share my stats
// with friends" setting comes in as a prop; friends' own settings ride on their rows (absent = pre-0.38).

import { useMemo, useState } from 'react';
import type { FriendRow } from '../cloud/social';
import type { DuelRow } from '../cloud/compete';
import { DOMAINS, domainValue, overallRating, type DomainId } from '../engine/rating';
import { canSeeActivity, canSeeLevels, compareAreas, duelRecord, foldFromMemo, pastMe, type AreaLevels, type Frame, type FrameTotals, type ShareStats } from '../engine/stats';
import type { ProgressStats } from '../engine/achievements';
import type { Strings } from '../i18n/strings';
import { localDay, type Progress } from '../storage/progress';
import { LevelStatsLine } from './LevelStats';
import { RankCrest } from './Badges';
import { divisionFor } from '../engine/ranks';
import { fmtDuration } from './Stats';
import { FrameChips, langOf, useStatsFrame } from './Trends';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(100 * x)}%`);

/** A friend row as the server may send it from 0.38 on (all new fields optional). */
export type FriendStats = FriendRow & {
  /** Area levels written by the friend's own app (0.38+); absent → "—" per area (S4). */
  areas?: AreaLevels | null;
  /** The friend's "share my stats" setting (absent = pre-0.38 friend). */
  share?: ShareStats | null;
  /** XP in longer frames, when the server provides them. */
  xp_30?: number | null;
  xp_90?: number | null;
  xp_365?: number | null;
};

const CX = {
  compare: { en: 'Compare', he: 'השוואה' },
  vsFriend: { en: 'Me vs {n}', he: 'אני מול {n}' },
  vsPast: { en: 'Me vs past me', he: 'אני מול עצמי בעבר' },
  me: { en: 'Me', he: 'אני' },
  overall: { en: 'Overall level', he: 'רמה כללית' },
  streak: { en: 'Streak', he: 'רצף' },
  weekXp: { en: 'XP this week', he: 'XP השבוע' },
  totalXp: { en: 'Total XP', he: 'סך XP' },
  lessons: { en: 'Lessons', he: 'שיעורים' },
  echo: { en: 'Echo Chain best', he: 'שיא שרשרת הד' },
  beat: { en: 'Beat Echo best', he: 'שיא הד קצב' },
  h2h: { en: 'Duels head to head', he: 'דו־קרבות ראש בראש' },
  h2hLine: { en: '{w} won · {l} lost · {d} drawn', he: '{w} ניצחונות · {l} הפסדים · {d} תיקו' },
  areas: { en: 'Areas', he: 'תחומים' },
  hidden: { en: 'hidden', he: 'מוסתר' },
  privateFriend: { en: '{n} keeps their stats private.', he: '{n} שומר/ת את הנתונים פרטיים.' },
  privateMe: { en: "Your stats are hidden from friends (Settings → Share my stats).", he: 'הנתונים שלך מוסתרים מחברים (הגדרות ← שיתוף הנתונים שלי).' },
  levelsOnly: { en: 'You share levels only — friends don’t see your activity.', he: 'את/ה משתף/ת רמות בלבד — חברים לא רואים את הפעילות שלך.' },
  areasOld: { en: 'Area levels appear once {n} updates the app.', he: 'רמות התחומים יופיעו כש{n} יעדכן/תעדכן את האפליקציה.' },
  thisFrame: { en: 'This frame', he: 'הטווח הזה' },
  before: { en: 'The one before', he: 'הטווח שלפניו' },
  pickFrame: { en: 'Pick a time frame to compare with the one before it.', he: 'בחרו טווח זמן כדי להשוות לטווח שלפניו.' },
  items: { en: 'Answers', he: 'תשובות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  speed: { en: 'Median speed', he: 'מהירות חציונית' },
  time: { en: 'Practice time', he: 'זמן תרגול' },
  xp: { en: 'XP', he: 'XP' },
  days: { en: 'Days', he: 'ימים' },
  board: { en: 'Friends leaderboard', he: 'טבלת החברים' },
  byXp: { en: 'XP in frame', he: 'XP בטווח' },
  byLevel: { en: 'Level', he: 'רמה' },
  noFriends: { en: 'No friends yet — here are players at your level:', he: 'עוד אין חברים — הנה שחקנים ברמה שלך:' },
  close: { en: 'Close', he: 'סגירה' },
  legendMe: { en: 'me (solid)', he: 'אני (קו מלא)' },
  legendThem: { en: '{n} (dashed)', he: '{n} (קו מקווקו)' },
  you: { en: 'you', he: 'את/ה' },
};

/** Overall level + area levels of the player, from the based fold. */
export function mySummary(p: Progress): { overall: number | null; areas: AreaLevels } {
  const ps = p as ProgressStats;
  const r = foldFromMemo(ps.ratingBase, p.ratingEvents ?? []);
  const areas: AreaLevels = {};
  for (const d of DOMAINS) {
    const v = domainValue(r, d.id);
    if (v) areas[d.id] = Math.round(600 + v.v * 1000);
  }
  return { overall: overallRating(r)?.r ?? null, areas };
}

// ---------------------------------------------------------------- radar overlay

/** Two series on one radar: me solid, them dashed (never colour alone). Unmeasured axes get no point. */
export function CompareRadar({ t, me, them, themName }: { t: Strings; me: AreaLevels; them?: AreaLevels | null; themName: string }) {
  const lang = langOf(t);
  const rows = compareAreas(me, them);
  const S = 220;
  const c = S / 2;
  const R = 82;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / rows.length;
  const pos = (i: number, v: number) => {
    const f = Math.max(0, Math.min(1, (v - 600) / 1000));
    return [c + Math.cos(ang(i)) * R * f, c + Math.sin(ang(i)) * R * f] as const;
  };
  const poly = (key: 'me' | 'them') =>
    rows
      .map((r, i) => (r[key] === null ? null : pos(i, r[key]!)))
      .filter((x): x is readonly [number, number] => !!x)
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');
  return (
    <figure className="cmp-radar">
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`${CX.areas[lang]}: ${rows.map((r) => `${t.domainNames[r.d]} ${r.me ?? '—'} / ${r.them ?? '—'}`).join(', ')}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} className="cmp-ring" points={rows.map((_, i) => `${c + Math.cos(ang(i)) * R * f},${c + Math.sin(ang(i)) * R * f}`).join(' ')} />
        ))}
        {rows.map((r, i) => (
          <g key={r.d}>
            <line className="cmp-spoke" x1={c} y1={c} x2={c + Math.cos(ang(i)) * R} y2={c + Math.sin(ang(i)) * R} />
            <text className="cmp-label" x={c + Math.cos(ang(i)) * (R + 16)} y={c + Math.sin(ang(i)) * (R + 16) + 4} textAnchor="middle">
              {t.domainNames[r.d].split(' ')[0]}
            </text>
          </g>
        ))}
        {poly('them') && <polygon className="cmp-them" points={poly('them')} />}
        {poly('me') && <polygon className="cmp-me" points={poly('me')} />}
        {rows.map((r, i) => (r.me !== null ? <circle key={`m${r.d}`} className="cmp-me-dot" cx={pos(i, r.me)[0]} cy={pos(i, r.me)[1]} r={3.5} /> : null))}
        {rows.map((r, i) => (r.them !== null ? <rect key={`t${r.d}`} className="cmp-them-dot" x={pos(i, r.them)[0] - 3} y={pos(i, r.them)[1] - 3} width={6} height={6} /> : null))}
      </svg>
      <figcaption className="legend">
        <span className="cmp-sw me" /> {CX.legendMe[lang]} <span className="cmp-sw them" /> {fill(CX.legendThem[lang], { n: themName })}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- compare sheet

function Row({ k, a, b, lowerBetter = false }: { k: string; a: number | null | undefined; b: number | null | undefined; lowerBetter?: boolean }) {
  const has = a !== null && a !== undefined && b !== null && b !== undefined;
  const lead = has && a !== b ? ((lowerBetter ? a! < b! : a! > b!) ? 'a' : 'b') : null;
  return (
    <tr>
      <th scope="row">{k}</th>
      <td dir="ltr" className={lead === 'a' ? 'lead' : ''}>
        {a ?? '—'}
        {lead === 'a' && <span aria-hidden="true"> ★</span>}
      </td>
      <td dir="ltr" className={lead === 'b' ? 'lead' : ''}>
        {b ?? '—'}
        {lead === 'b' && <span aria-hidden="true"> ★</span>}
      </td>
    </tr>
  );
}

export function CompareSheet({
  t,
  progress,
  friend,
  duels = [],
  share,
  myStreak,
  onClose,
}: {
  t: Strings;
  progress: Progress;
  friend: FriendStats | null;
  duels?: DuelRow[];
  /** My "share my stats" setting (S9). */
  share: ShareStats;
  myStreak: number;
  onClose: () => void;
}) {
  const lang = langOf(t);
  const [tab, setTab] = useState<'friend' | 'past'>(friend ? 'friend' : 'past');
  const me = useMemo(() => mySummary(progress), [progress]);
  const fname = friend?.name ?? '';
  const seeLv = canSeeLevels(friend?.share);
  const seeAct = canSeeActivity(friend?.share);
  const rec = friend ? duelRecord(duels, friend.user_id) : null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet cmp-sheet" role="dialog" aria-modal="true" aria-labelledby="cmp-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="cmp-title">{CX.compare[lang]}</h2>
        <div className="ps-seg" role="tablist">
          {friend && (
            <button role="tab" aria-selected={tab === 'friend'} className={tab === 'friend' ? 'on' : ''} onClick={() => setTab('friend')}>
              {fill(CX.vsFriend[lang], { n: fname })}
            </button>
          )}
          <button role="tab" aria-selected={tab === 'past'} className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>
            {CX.vsPast[lang]}
          </button>
        </div>

        {tab === 'friend' && friend && (
          <div className="cmp-body">
            {share === 'nothing' && <p className="field-hint">{CX.privateMe[lang]}</p>}
            {share === 'levels' && <p className="field-hint">{CX.levelsOnly[lang]}</p>}
            {!seeLv ? (
              <p className="field-hint">{fill(CX.privateFriend[lang], { n: fname })}</p>
            ) : (
              <>
                <CompareRadar t={t} me={me.areas} them={friend.areas ?? null} themName={fname} />
                {!friend.areas && <p className="field-hint">{fill(CX.areasOld[lang], { n: fname })}</p>}
              </>
            )}
            <table className="cmp-table">
              <thead>
                <tr>
                  <th />
                  <th scope="col">{CX.me[lang]}</th>
                  <th scope="col">{fname}</th>
                </tr>
              </thead>
              <tbody>
                <Row k={CX.overall[lang]} a={me.overall} b={seeLv ? friend.rating : null} />
                {seeLv && DOMAINS.map((d) => <Row key={d.id} k={t.domainNames[d.id as DomainId]} a={me.areas[d.id] ?? null} b={friend.areas?.[d.id] ?? null} />)}
                <Row k={CX.streak[lang]} a={myStreak} b={seeAct ? friend.streak : null} />
                <Row k={CX.weekXp[lang]} a={null} b={seeAct ? friend.week_xp : null} />
                <Row k={CX.totalXp[lang]} a={progress.xp} b={seeAct ? friend.total_xp : null} />
                <Row k={CX.lessons[lang]} a={(progress as ProgressStats).counts?.lessons ?? progress.history.length} b={seeAct ? friend.lessons_done : null} />
                <Row k={CX.echo[lang]} a={progress.games?.melody ?? null} b={seeAct ? friend.best_melody : null} />
                <Row k={CX.beat[lang]} a={progress.games?.rhythm ?? null} b={seeAct ? friend.best_rhythm : null} />
              </tbody>
            </table>
            {rec && rec.w + rec.l + rec.d > 0 && (
              <p>
                <b>{CX.h2h[lang]}:</b> <bdi dir="ltr">{fill(CX.h2hLine[lang], rec)}</bdi>
              </p>
            )}
          </div>
        )}

        {tab === 'past' && <PastMe t={t} progress={progress} />}
        {!friend && (
          <>
            <p className="field-hint">{CX.noFriends[lang]}</p>
            <LevelStatsLine t={t} kind="daily" day={localDay(new Date())} />
          </>
        )}
        <div className="ps-sheet-actions">
          <button className="btn primary" onClick={onClose}>
            {CX.close[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- me vs past me

function Cmp({ label, a, b, fmt, lowerBetter = false }: { label: string; a: number | null; b: number | null; fmt: (x: number) => string; lowerBetter?: boolean }) {
  const d = a !== null && b !== null ? a - b : null;
  const better = d !== null && d !== 0 ? (lowerBetter ? d < 0 : d > 0) : null;
  return (
    <tr>
      <th scope="row">{label}</th>
      <td dir="ltr">{a === null ? '—' : fmt(a)}</td>
      <td dir="ltr">{b === null ? '—' : fmt(b)}</td>
      <td dir="ltr">{better === null ? '' : <span className={`trend-delta ${better ? 'up' : 'down'}`}>{d! > 0 ? '▲' : '▼'}</span>}</td>
    </tr>
  );
}

export function PastMe({ t, progress }: { t: Strings; progress: Progress }) {
  const lang = langOf(t);
  const [frame] = useStatsFrame();
  const ps = progress as ProgressStats;
  const { now, before } = useMemo(() => pastMe(ps.statsDays, frame, localDay(new Date())), [ps.statsDays, frame]);
  const b: FrameTotals | null = before;
  return (
    <div className="cmp-body">
      <FrameChips lang={lang} />
      {!b ? (
        <p className="field-hint">{CX.pickFrame[lang]}</p>
      ) : (
        <table className="cmp-table">
          <thead>
            <tr>
              <th />
              <th scope="col">{CX.thisFrame[lang]}</th>
              <th scope="col">{CX.before[lang]}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <Cmp label={CX.items[lang]} a={now.items} b={b.items} fmt={String} />
            <Cmp label={CX.accuracy[lang]} a={now.accuracy} b={b.accuracy} fmt={(x) => pct(x)} />
            <Cmp label={CX.speed[lang]} a={now.medianMs} b={b.medianMs} fmt={(x) => `${(x / 1000).toFixed(1)} s`} lowerBetter />
            <Cmp label={CX.time[lang]} a={now.hasTime ? now.ms : null} b={b.hasTime ? b.ms : null} fmt={(x) => fmtDuration(x, lang)} />
            <Cmp label={CX.xp[lang]} a={now.xp} b={b.xp} fmt={String} />
            <Cmp label={CX.days[lang]} a={now.days} b={b.days} fmt={String} />
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- friends leaderboard (S10)

/** XP of a row in a frame (null = the server does not provide that frame). */
export function xpInFrame(r: FriendStats, f: Frame): number | null {
  if (f === '7d') return r.week_xp ?? null;
  if (f === 'all') return r.total_xp ?? null;
  return (f === '30d' ? r.xp_30 : f === '90d' ? r.xp_90 : r.xp_365) ?? null;
}

export function FriendsBoard({ t, rows, share, onOpen }: { t: Strings; rows: FriendStats[]; share: ShareStats; onOpen?: (r: FriendStats) => void }) {
  const lang = langOf(t);
  const [metric, setMetric] = useState<'xp' | 'level'>('xp');
  const [frame, setFrame] = useState<Frame>('7d');
  /** Per-area board (spec AG §9): one area's level among friends, with the rank crest. */
  const [area, setArea] = useState<DomainId | 'all'>('all');
  const people = rows.filter((r) => r.relation === 'me' || r.relation === 'friend');
  const allowed: Frame[] = (['7d', '30d', '90d', '1y', 'all'] as Frame[]).filter((f) => f === '7d' || f === 'all' || people.some((r) => xpInFrame(r, f) !== null));
  const visible = people.filter((r) => (r.relation === 'me' ? true : metric === 'xp' ? canSeeActivity(r.share) : canSeeLevels(r.share)));
  const val = (r: FriendStats) => (metric === 'xp' ? xpInFrame(r, frame) : area === 'all' ? (r.rating ?? null) : (r.areas?.[area] ?? null));
  const sorted = [...visible].sort((a, b) => (val(b) ?? -1) - (val(a) ?? -1));
  const max = Math.max(1, ...sorted.map((r) => val(r) ?? 0));
  return (
    <section className="set-card cmp-board">
      <h2>{CX.board[lang]}</h2>
      <div className="ps-seg" role="radiogroup">
        {(['xp', 'level'] as const).map((m) => (
          <button key={m} role="radio" aria-checked={metric === m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
            {m === 'xp' ? CX.byXp[lang] : CX.byLevel[lang]}
          </button>
        ))}
      </div>
      {metric === 'xp' && <FrameChips lang={lang} frame={frame} onChange={setFrame} allowed={allowed} />}
      {metric === 'level' && (
        <div className="frame-chips cmp-areas" role="radiogroup" aria-label={CX.areas[lang]}>
          {(['all', ...DOMAINS.map((d) => d.id)] as (DomainId | 'all')[]).map((a) => (
            <button key={a} role="radio" aria-checked={area === a} className={`chip ${area === a ? 'on' : ''}`} onClick={() => setArea(a)} data-area={a}>
              {a === 'all' ? CX.overall[lang] : t.domainNames[a]}
            </button>
          ))}
        </div>
      )}
      <ol className="cmp-rank">
        {sorted.map((r, i) => {
          const v = val(r);
          const meHidden = r.relation === 'me' && (share === 'nothing' || (metric === 'xp' && share === 'levels'));
          return (
            <li key={r.user_id} className={r.relation === 'me' ? 'me' : ''}>
              <button className="cmp-rank-row" onClick={() => r.relation !== 'me' && onOpen?.(r)} disabled={r.relation === 'me' || !onOpen}>
                <span className="cmp-pos" dir="ltr">
                  {i + 1}
                </span>
                <span className="cmp-name">
                  {r.name}
                  {r.relation === 'me' && <small className="field-hint"> ({CX.you[lang]}{meHidden ? ` · ${CX.hidden[lang]}` : ''})</small>}
                </span>
                <span className="cmp-bar" aria-hidden="true">
                  <span style={{ width: `${Math.round((100 * (v ?? 0)) / max)}%` }} />
                </span>
                {metric === 'level' && area !== 'all' && v !== null && <RankCrest div={divisionFor(v)} size={22} lang={lang} />}
                <b dir="ltr">{v ?? '—'}</b>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
