// Repertoire (docs/SPEC-REPERTOIRE.md): the Practice row that was "Songs", in every course. A goal header ("Next goal:
// your first standard" + bar), the four tiers as tabs, items named by what they teach; an item page says what it leads
// to, shows the best result and opens the course's measured practice for it. One phone screen each, no emoji.

import { useState } from 'react';
import type { RepCourse } from '../engine/repertoire';
import { REP_TIERS, repGoal, repItem, repLeadsFrom, repResults, repStatus, repertoireFor, tierName, wayLabel, type RepItem, type RepTier, type RepWay } from '../engine/repertoire';
import { ListenOriginal } from './ListenOriginal';
import { loadMemo, memoProgress, MEMO_STEPS, moveTune, saveMemo, toggleMemoStep, TUNE_LISTS, tunesIn, type MemoState, type TuneList } from '../engine/practiceMethod';
import '../repertoire.css';
import { Icon } from './icons';

type Lang = 'he' | 'en';

export interface RepertoireProps {
  lang: Lang;
  course: RepCourse;
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
  // Memorising tunes (practiceMethod.ts, Siskind's "How to Memorize a Jazz Standard"): the three lists, on the device.
  const [memo, setMemoRaw] = useState<MemoState>(() => loadMemo());
  const setMemo = (m: MemoState) => {
    setMemoRaw(m);
    saveMemo(m);
  };
  const [lists, setLists] = useState(false);

  if (item) return <ItemPage lang={lang} course={course} item={item} res={res} onBack={() => setOpen(null)} onOpen={setOpen} onWay={onWay} memo={memo} setMemo={setMemo} />;
  if (lists) return <ListsPage lang={lang} course={course} memo={memo} onBack={() => setLists(false)} onOpen={setOpen} />;

  const items = repertoireFor(course).filter((x) => x.tier === tier);
  const title = he ? 'רפרטואר' : 'Repertoire';
  return (
    <main className="rep-screen" data-repertoire={course}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
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
      <button className="link rep-songbook" onClick={() => setLists(true)} data-rep-lists="1">
        {he ? 'שלוש הרשימות: יודעים · לומדים · הבא' : 'Three lists: know · learning · next'}
      </button>
      {onSongbook && (
        <button className="link rep-songbook" onClick={onSongbook} data-rep-songbook="1">
          {he ? 'כל שירי נחלת הכלל — לפי האקורדים שאתם מכירים' : 'All public-domain songs — by the chords you know'}
        </button>
      )}
    </main>
  );
}

function ItemPage({ lang, course, item, res, onBack, onOpen, onWay, memo, setMemo }: { lang: Lang; course: RepCourse; item: RepItem; res: ReturnType<typeof repResults>; onBack: () => void; onOpen: (id: string) => void; onWay: (item: RepItem, way: RepWay) => void; memo: MemoState; setMemo: (m: MemoState) => void }) {
  const he = lang === 'he';
  const [memoOpen, setMemoOpen] = useState(false);
  if (memoOpen) return <MemoPage lang={lang} item={item} memo={memo} setMemo={setMemo} onBack={() => setMemoOpen(false)} onWay={onWay} />;
  const mp = memoProgress(memo, item.id);
  const r = res[item.id];
  const st = repStatus(r);
  const to = item.leads?.to ? repItem(course, item.leads.to) : undefined;
  const from = repLeadsFrom(course, item.id);
  return (
    <main className="rep-screen rep-item" data-rep-open={item.id}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
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
              {to.title[lang]} <Icon k="fwd" />
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
      <button className="link" onClick={() => setMemoOpen(true)} data-rep-memo={mp.done}>
        {he ? 'לשנן' : 'Memorise'} <span dir="ltr">{mp.done}/{MEMO_STEPS.length}</span>
      </button>
      {/* "Listen to the original" (src/content/references.ts, 0.70.2): standards only — the songbook tunes have no entry. */}
      {item.ref?.kind === 'standard' && (
        <div className="rep-refs" data-rep-ref={item.ref.id}>
          <ListenOriginal id={item.ref.id} lang={lang} compact />
        </div>
      )}
      <p className="rep-legal">
        {item.legal === 'pd' ? (he ? 'מנגינה מנחלת הכלל' : 'Public-domain melody') : item.legal === 'chords' ? (he ? 'מהלך אקורדים בלבד — בלי המנגינה' : 'Chord changes only — no melody') : he ? 'חומר מקורי של האפליקציה' : 'Our own material'}
      </p>
    </main>
  );
}

/** The three lists (Siskind: know / learning / next), tunes by title; tap opens the tune. */
function ListsPage({ lang, course, memo, onBack, onOpen }: { lang: Lang; course: RepCourse; memo: MemoState; onBack: () => void; onOpen: (id: string) => void }) {
  const he = lang === 'he';
  return (
    <main className="rep-screen" data-rep-listpage="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>{he ? 'שלוש הרשימות' : 'Three lists'}</h1>
      </header>
      {TUNE_LISTS.map((l) => {
        const ids = tunesIn(memo, l.id).filter((id) => repItem(course, id));
        return (
          <section key={l.id} className="rep-leads" data-rep-list={l.id}>
            <small>
              {l.name[lang]} <span dir="ltr">· {ids.length}</span>
            </small>
            <span className="rep-from">
              {ids.length ? (
                ids.map((id) => (
                  <button key={id} className="chip" onClick={() => onOpen(id)}>
                    {repItem(course, id)!.title[lang]}
                  </button>
                ))
              ) : (
                <span className="field-hint">{he ? 'ריק' : 'Empty'}</span>
              )}
            </span>
          </section>
        );
      })}
    </main>
  );
}

/** One tune's memorising steps (tick each) and which list it is on. The write step opens harmonic dictation. */
function MemoPage({ lang, item, memo, setMemo, onBack, onWay }: { lang: Lang; item: RepItem; memo: MemoState; setMemo: (m: MemoState) => void; onBack: () => void; onWay: (item: RepItem, way: RepWay) => void }) {
  const he = lang === 'he';
  const today = new Date().toISOString().slice(0, 10);
  const cur = memo.steps[item.id] ?? {};
  const list: TuneList | undefined = memo.lists[item.id];
  return (
    <main className="rep-screen rep-item" data-rep-memopage={item.id}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>{item.title[lang]}</h1>
      </header>
      <div className="chips" role="radiogroup" aria-label={he ? 'רשימה' : 'List'}>
        {TUNE_LISTS.map((l) => (
          <button key={l.id} role="radio" aria-checked={list === l.id} className={`chip ${list === l.id ? 'on' : ''}`} onClick={() => setMemo(moveTune(memo, item.id, l.id))} data-memo-list={l.id}>
            {l.name[lang]}
          </button>
        ))}
      </div>
      <ul className="rep-list">
        {MEMO_STEPS.map((x) => (
          <li key={x.id}>
            <label className="toggle-row" data-memo-step={x.id}>
              <input type="checkbox" checked={!!cur[x.id]} onChange={() => setMemo(toggleMemoStep(memo, item.id, x.id, today))} />
              <span>
                <b>{x.title[lang]}</b> <small className="field-hint">{x.how[lang]}</small>
              </span>
            </label>
            {x.topic && (
              <button className="link" onClick={() => onWay(item, { k: 'topic', topic: x.topic!, level: 1 })} data-memo-topic={x.topic}>
                {he ? 'לתרגל' : 'Practice'} <Icon k="fwd" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
