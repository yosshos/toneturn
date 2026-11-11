// Repertoire (docs/SPEC-REPERTOIRE.md): the Practice row that was "Songs", in every course. A goal header ("Next goal:
// your first standard" + bar), the four tiers as tabs, items named by what they teach; an item page says what it leads
// to, shows the best result and opens the course's measured practice for it. One phone screen each, no emoji.

import { useState } from 'react';
import type { CourseId } from '../engine/courses';
import { REP_TIERS, repGoal, repItem, repLeadsFrom, repResults, repStatus, repertoireFor, tierName, wayLabel, type RepItem, type RepTier, type RepWay } from '../engine/repertoire';
import '../repertoire.css';

type Lang = 'he' | 'en';

export interface RepertoireProps {
  lang: Lang;
  course: CourseId;
  lessons: Record<string, { best: number; completions: number }> | undefined;
  /** The item to open on entry (from the Today card or a quest). */
  initialItem?: string | null;
  onBack: () => void;
  onWay: (item: RepItem, way: RepWay) => void;
  /** The full public-domain songbook (melody / chords by the chords you know) — instrument courses. */
  onSongbook?: () => void;
  /** The item shown, so Back from a practice comes back to it. */
  onItem?: (id: string | null) => void;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function RepertoireScreen({ lang, course, lessons, initialItem, onBack, onWay, onSongbook, onItem }: RepertoireProps) {
  const he = lang === 'he';
  const res = repResults(lessons, course);
  const goal = repGoal(course, res);
  const [open, setOpenRaw] = useState<string | null>(initialItem && repItem(course, initialItem) ? initialItem : null);
  const setOpen = (id: string | null) => {
    setOpenRaw(id);
    onItem?.(id);
  };
  const [tier, setTier] = useState<RepTier>(goal.next?.tier ?? 1);
  const item = open ? repItem(course, open) : undefined;

  if (item) return <ItemPage lang={lang} course={course} item={item} res={res} onBack={() => setOpen(null)} onOpen={setOpen} onWay={onWay} />;

  const items = repertoireFor(course).filter((x) => x.tier === tier);
  const title = he ? 'רפרטואר' : 'Repertoire';
  return (
    <main className="rep-screen" data-repertoire={course}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <span className="flip-rtl">‹</span>
        </button>
        <h1>{title}</h1>
      </header>
      <button className="rep-goal" onClick={() => goal.next && setOpen(goal.next.id)} data-rep-goal={goal.id} disabled={!goal.next}>
        <small>{he ? 'היעד הבא' : 'Next goal'}</small>
        <b>{goal.title[lang]}</b>
        <span className="rep-bar" aria-hidden="true">
          <i style={{ width: `${(100 * goal.now) / Math.max(1, goal.target)}%` }} />
        </span>
        <span className="rep-goal-foot">
          <span dir="ltr">
            {goal.now}/{goal.target}
          </span>
          {goal.next && (
            <span className="rep-next">
              {he ? 'הבא: ' : 'Next: '}
              {goal.next.title[lang]}
            </span>
          )}
        </span>
      </button>
      <div className="rep-tiers" role="tablist" aria-label={he ? 'שלבים' : 'Tiers'}>
        {REP_TIERS.map((t) => {
          const all = repertoireFor(course).filter((x) => x.tier === t.n);
          const done = all.filter((x) => repStatus(res[x.id]) === 'learned').length;
          return (
            <button key={t.n} role="tab" aria-selected={tier === t.n} className={`rep-tier ${tier === t.n ? 'on' : ''}`} onClick={() => setTier(t.n)} data-rep-tier={t.n}>
              <b>{t.n}</b>
              <span>{t.name[lang]}</span>
              <small dir="ltr">
                {done}/{all.length}
              </small>
            </button>
          );
        })}
      </div>
      <p className="rep-tier-blurb">{REP_TIERS[tier - 1].blurb[lang]}</p>
      <ul className="rep-list">
        {items.map((x) => {
          const st = repStatus(res[x.id]);
          return (
            <li key={x.id}>
              <button className={`rep-row ${st}`} onClick={() => setOpen(x.id)} data-rep-item={x.id}>
                <span className="rep-row-text">
                  <b>{x.teaches[lang]}</b>
                  <small>{x.title[lang]}</small>
                </span>
                <span className={`rep-mark ${st}`} aria-label={st === 'learned' ? (he ? 'נלמד' : 'Learned') : st === 'started' ? (he ? 'בתהליך' : 'Started') : he ? 'חדש' : 'New'}>
                  {st === 'learned' ? '✓' : st === 'started' ? pct(res[x.id]!.best) : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {onSongbook && (
        <button className="link rep-songbook" onClick={onSongbook} data-rep-songbook="1">
          {he ? 'כל שירי נחלת הכלל — לפי האקורדים שאתם מכירים' : 'All public-domain songs — by the chords you know'}
        </button>
      )}
    </main>
  );
}

function ItemPage({ lang, course, item, res, onBack, onOpen, onWay }: { lang: Lang; course: CourseId; item: RepItem; res: ReturnType<typeof repResults>; onBack: () => void; onOpen: (id: string) => void; onWay: (item: RepItem, way: RepWay) => void }) {
  const he = lang === 'he';
  const r = res[item.id];
  const st = repStatus(r);
  const to = item.leads?.to ? repItem(course, item.leads.to) : undefined;
  const from = repLeadsFrom(course, item.id);
  return (
    <main className="rep-screen rep-item" data-rep-open={item.id}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <span className="flip-rtl">‹</span>
        </button>
        <h1>{item.title[lang]}</h1>
      </header>
      <p className="rep-kicker">
        {tierName(item.tier)[lang]}
        {item.standard ? (he ? ' · סטנדרט' : ' · Standard') : ''}
      </p>
      <h2 className="rep-teaches">{item.teaches[lang]}</h2>
      <div className={`rep-status ${st}`} data-rep-status={st}>
        {st === 'new' ? (he ? 'עוד לא ניגנתם' : 'Not played yet') : st === 'learned' ? (he ? `נלמד · הכי טוב ${pct(r!.best)}` : `Learned · best ${pct(r!.best)}`) : he ? `הכי טוב ${pct(r!.best)} · ב־80% זה נלמד` : `Best ${pct(r!.best)} · learned at 80%`}
      </div>
      {item.leads && (
        <div className="rep-leads">
          <small>{he ? 'לאן זה מוביל' : 'Where it leads'}</small>
          <p>{item.leads.text[lang]}</p>
          {to && (
            <button className="chip" onClick={() => onOpen(to.id)} data-rep-to={to.id}>
              {to.title[lang]} ›
            </button>
          )}
        </div>
      )}
      {!item.leads && from.length > 0 && (
        <div className="rep-leads">
          <small>{he ? 'מגיעים לכאן מ־' : 'Comes from'}</small>
          <span className="rep-from">
            {from.map((x) => (
              <button key={x.id} className="chip" onClick={() => onOpen(x.id)}>
                {x.title[lang]}
              </button>
            ))}
          </span>
        </div>
      )}
      <div className="rep-ways">
        {item.ways.map((w, i) => (
          <button key={i} className={`btn ${i === 0 ? 'primary' : 'ghost'}`} onClick={() => onWay(item, w)} data-rep-way={w.k}>
            {wayLabel(w, course)[lang]}
          </button>
        ))}
      </div>
      {/* Slot for the "Listen to the original" row (src/content/references.ts, built by another task): when it lands,
          render <ReferenceRow kind={item.ref.kind} id={item.ref.id} /> here. TODO(references). */}
      {item.ref && <div className="rep-refs" data-rep-ref={`${item.ref.kind}:${item.ref.id}`} />}
      <p className="rep-legal">
        {item.legal === 'pd' ? (he ? 'מנגינה מנחלת הכלל' : 'Public-domain melody') : item.legal === 'chords' ? (he ? 'מהלך אקורדים בלבד — בלי המנגינה' : 'Chord changes only — no melody') : he ? 'חומר מקורי של האפליקציה' : 'Our own material'}
      </p>
    </main>
  );
}
