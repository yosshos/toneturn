// Repertoire, one place for every piece (docs/SPEC-PRACTICE-IA-3.md §3, BUILD-PLAN-2026-11 phase 3). It absorbs
// Charts & lead sheets, My pieces, My song and Ear's jazz standards; the engines stay (ChartPlayer, the piece coach,
// My song, the course's measured ways) and open from the piece page.
//   The list: tabs Foundations · Blues & progressions · Standards · Advanced · Mine, search, the next-goal card,
//   "Add a piece" (lead sheet / score / my recording / type the chords).
//   The piece page (SPEC-PATH-TODAY-PRACTICE §2, the one item page): name + status word, "where it sits" (its path
//   node, or "later in your path"), "why today", the main button by the way in, then only the actions this piece has.
// On a wide screen the list and the piece sit side by side. One phone screen each, no emoji.

import { repGoalFor } from '../engine/repStyleGoal';
import { useEffect, useMemo, useState } from 'react';
import { REP_TIERS, repItem, repLeadsFrom, repResults, tierName, wayLabel, type RepCourse } from '../engine/repertoire';
import { STYLE_TEXT, type StyleId } from '../engine/styles';
import { chartOfPiece, entryStyle, libraryFor, mineEntries, mineMatches, parsePieceKey, pieceActions, pieceKeys, pieceStatus, recStatus, REP_TABS, scoreStatus, searchLib, tabName, whereInPath, type LibEntry, type MineFilter, type MyChartLike, type PieceAction, type RepTab } from '../engine/repLibrary';
import type { ItemStatus } from '../engine/drills/itemStatus';
import { CHART_TEMPLATES } from '../engine/charts';
import type { CourseId } from '../engine/courses';
import type { PathView } from '../engine/path';
import type { LeadSheet } from '../engine/leadsheet';
import { ListenOriginal } from './ListenOriginal';
import { LeadSheetImport } from './ImprovRules';
import { loadMemo, memoProgress, MEMO_STEPS, moveTune, saveMemo, toggleMemoStep, TUNE_LISTS, tunesIn, type MemoState, type TuneList } from '../engine/practiceMethod';
import { repHash, repViewOf, type RepView, type WayIn } from './practiceRoutes';
import { loadPieces } from './Pieces';
import { planProgress } from '../engine/piece/coach';
import { songs } from './MySong';
import { PlaceSpark } from './PlaceSpark';
import '../repertoire.css';
import { Icon } from './icons';
import { AssignMark, ItemHead, StatusLadder, TodayMark } from './ItemHead';
import { assignedKeys, itemKey, useAssignFor, useMyAssigns, useTeaching } from './itemAssigns';
import { pieceLadder } from '../engine/statusLadder';
import type { ItemRef } from '../engine/itemAssign';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };

export interface RepertoireProps {
  lang: Lang;
  course: CourseId;
  jazz: 'off' | 'on' | 'focus';
  /** SPEC-STYLE-FOCUS §4: the course's styles (first = main) — the list opens on the main style, "All styles" one tap away. */
  styles?: StyleId[];
  lessons: Record<string, { best: number; completions: number }> | undefined;
  history: { lessonId: string; completedAt: string; firstTry: number; total: number }[] | undefined;
  myCharts: MyChartLike[] | undefined;
  /** The player's path, for "where it sits". */
  pathView?: PathView | null;
  /** Why a piece is in today's plan (null when it is not). */
  whyToday?: (key: string) => Bi | null;
  /** Leave the place (the list's Back). */
  onBack: () => void;
  /** Leave a piece page that was opened from outside the list (the path, Today, the teacher). */
  onLeavePiece: (from: WayIn) => void;
  onAction: (e: LibEntry, a: PieceAction) => void;
  /** The "where it sits" chip: the path, at this step. */
  onPathNode: (stepId: string) => void;
  /** Add a piece: a score (the piece coach), a recording (My song), typed chords (a new chart). */
  onAdd: (src: 'score' | 'recording' | 'type') => void;
  /** Lead sheets imported here become my charts; returns the piece key of the one to open (one sheet), or null. */
  onSheets: (sheets: LeadSheet[]) => string | null;
  /** Start a chart from a progression template. */
  onTemplate: (id: string) => void;
  /** The full public-domain songbook (instrument courses). */
  onSongbook?: () => void;
  /** SPEC-LICKS-IN-IMPROV §5.3: the licks of mine that fit a chart (its text) — shown with "Improvise on it". */
  licksFit?: (text: string) => { id: string; name: Bi; bars: number[]; key: string }[];
  /** SPEC-EAR-AND-READING §3.3: the player's strong channel — its way to learn a melody comes first. */
  strong?: 'ear' | 'page';
}

/** The view in the address (#/repertoire/…), followed as it changes. */
function useRepView(): RepView {
  const [v, setV] = useState<RepView>(() => repViewOf(location.hash));
  useEffect(() => {
    const on = () => setV(repViewOf(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return v;
}
/** Wide screens: the list and the piece side by side. */
function useWide(): boolean {
  const q = '(min-width: 960px)';
  const [w, setW] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(q);
    const on = () => setW(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return w;
}
/** A piece opened from the list sits on its own history entry, so Back returns to the list. */
let openedFromList = false;

const KEY_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export function RepertoireScreen(p: RepertoireProps) {
  const { lang, course, jazz, lessons, history: hist } = p;
  const he = lang === 'he';
  const view = useRepView();
  const wide = useWide();
  const goalCourse: RepCourse = course;
  const res = repResults(lessons, goalCourse);
  // SPEC-STYLE-FOCUS §4: the next-goal card follows the main style ("your third Brazilian piece"); jazz keeps the road
  const goal = repGoalFor(goalCourse, res, p.styles?.length ? { styleFocus: { [course]: { main: p.styles[0], also: p.styles.slice(1) } } } : {});
  const lib = useMemo(() => libraryFor(course, jazz), [course, jazz]);
  // Mine: my charts (settings), my scores and recordings (IndexedDB on this device).
  const [scores, setScores] = useState<{ id: string; title: string; composer?: string; progress: number; done: boolean }[]>([]);
  const [recs, setRecs] = useState<{ id: string; name: string; best?: number }[]>([]);
  useEffect(() => {
    let alive = true;
    void loadPieces()
      .then((ps) => alive && setScores(ps.map((x) => ({ id: x.id, title: x.piece.title, composer: x.piece.composer, progress: planProgress(x.plan, x.piece.bars.length), done: !!x.plan.done }))))
      .catch(() => undefined);
    void songs
      .list()
      .then((ls) => alive && setRecs(ls.map((x) => ({ id: x.id, name: x.name, best: x.scores?.[course]?.score }))))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [course]);
  const mine = useMemo(() => mineEntries(p.myCharts, scores, recs), [p.myCharts, scores, recs]);
  const all = useMemo(() => [...lib, ...mine], [lib, mine]);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [memo, setMemoRaw] = useState<MemoState>(() => loadMemo());
  const setMemo = (m: MemoState) => {
    setMemoRaw(m);
    saveMemo(m);
  };
  const [lists, setLists] = useState(false);
  const [memoFor, setMemoFor] = useState<LibEntry | null>(null);
  // §3.4 / §5.1: the marks in the list — part of today, assigned by the teacher
  const assignedSet = assignedKeys(useMyAssigns());

  const statusOf = (e: LibEntry): ItemStatus => {
    if (e.ref.kind === 'rep' && e.ref.course) return pieceStatus(hist, lessons, e.ref.course, e.ref.id);
    if (e.ref.kind === 'score') {
      const s = scores.find((x) => x.id === e.ref.id);
      return s ? scoreStatus(s.progress, s.done) : 'new';
    }
    if (e.ref.kind === 'rec') return recStatus(recs.find((x) => x.id === e.ref.id)?.best);
    return 'new';
  };
  const tab: RepTab = view.tab ?? goal.next?.tier ?? 1;
  // SPEC-STYLE-FOCUS §4: the style filter opens on the first of my styles that has pieces here (else all styles)
  const styleHas = (st: StyleId) => lib.some((e) => entryStyle(e) === st);
  const startStyle = (p.styles ?? []).find(styleHas) ?? null;
  const [styleF, setStyleF] = useState<StyleId | 'all'>(startStyle ?? 'all');
  const byStyle = (e: LibEntry) => styleF === 'all' || entryStyle(e) === styleF;
  const mineF: MineFilter = view.mine ?? 'all';
  const setView = (v: RepView, push = false) => {
    const h = `#${repHash(v)}`;
    if (push) location.hash = h.slice(1);
    else location.replace(h);
  };
  const openPiece = (key: string) => {
    if (wide && !view.piece) return setView({ tab, mine: view.mine, piece: key });
    openedFromList = true;
    setView({ tab, mine: view.mine, piece: key }, !wide);
  };
  const entry = view.piece ? (all.find((e) => e.key === view.piece) ?? entryOfKey(view.piece, p.myCharts)) : undefined;
  const closePiece = () => {
    const from = view.from ?? 'practice';
    if (from !== 'practice') return p.onLeavePiece(from);
    if (openedFromList && !wide) {
      openedFromList = false;
      return window.history.length > 1 ? window.history.back() : setView({ tab, mine: view.mine });
    }
    setView({ tab, mine: view.mine });
  };

  if (memoFor) return <MemoPage lang={lang} id={memoFor.item?.id ?? memoFor.key} title={memoFor.title[lang]} memo={memo} setMemo={setMemo} onBack={() => setMemoFor(null)} onTopic={memoFor.item ? (topic) => p.onAction(memoFor, { k: 'way', way: { k: 'topic', topic, level: 1 } }) : undefined} />;
  if (lists) return <ListsPage lang={lang} entries={all} memo={memo} onBack={() => setLists(false)} onOpen={(k) => (setLists(false), openPiece(k))} />;

  const piecePage = entry ? (
    <PiecePage
      key={entry.key}
      {...p}
      entry={entry}
      status={statusOf(entry)}
      wayIn={view.from ?? 'practice'}
      inPane={wide && !!view.piece && (view.from ?? 'practice') === 'practice'}
      memoDone={memoProgress(memo, entry.item?.id ?? entry.key).done}
      onMemo={() => setMemoFor(entry)}
      onBackPiece={closePiece}
      onOpen={openPiece}
    />
  ) : null;
  // A piece opened from outside the list (path, Today, teacher), or any piece on a phone: the page alone.
  if (piecePage && (!wide || (view.from ?? 'practice') !== 'practice')) return piecePage;

  const shown = q.trim() ? searchLib(all, q) : tab === 'mine' ? mine.filter((e) => mineMatches(e, mineF)) : lib.filter((e) => e.tab === tab && byStyle(e));
  const list = (
    <main className="rep-screen" data-repertoire={course} data-rep-tab={String(tab)}>
      <header className="screen-head">
        <button className="icon-btn" onClick={p.onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>{he ? 'רפרטואר' : 'Repertoire'}</h1>
        <PlaceSpark place="repertoire" course={course} lang={lang} />
        <button className="icon-btn rep-add-btn" onClick={() => setAdding(true)} aria-label={he ? 'להוסיף יצירה' : 'Add a piece'} title={he ? 'להוסיף יצירה' : 'Add a piece'} data-rep-add="1">
          <Icon k="plus" />
        </button>
      </header>
      <label className="rep-search">
        <Icon k="search" size={16} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={he ? 'חיפוש יצירה' : 'Search a piece'} aria-label={he ? 'חיפוש יצירה' : 'Search a piece'} data-rep-search="1" />
      </label>
      {!q.trim() && tab !== 'mine' && (
        <button className="rep-goal" onClick={() => goal.next && openPiece(`rep:${goalCourse}:${goal.next.id}`)} data-rep-goal={goal.id} disabled={!goal.next}>
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
      )}
      {!q.trim() && (
        <div className="rep-tabs" role="tablist" aria-label={he ? 'שלבים' : 'Tiers'}>
          {REP_TABS.map((t) => {
            const inTab = t === 'mine' ? mine : lib.filter((x) => x.tab === t && byStyle(x));
            const closed = inTab.filter((x) => statusOf(x) === 'closed').length;
            return (
              <button key={String(t)} role="tab" aria-selected={tab === t} className={`rep-tier ${tab === t ? 'on' : ''}`} onClick={() => setView({ tab: t })} data-rep-tier={String(t)}>
                <span>{tabName(t)[lang]}</span>
                <small dir="ltr">{t === 'mine' ? inTab.length : `${closed}/${inTab.length}`}</small>
              </button>
            );
          })}
        </div>
      )}
      {!q.trim() && tab === 'mine' && (
        <div className="chips rep-mine-f" role="radiogroup" aria-label={he ? 'סוג' : 'Kind'}>
          {(['all', 'charts', 'scores', 'recordings'] as MineFilter[]).map((f) => (
            <button key={f} role="radio" aria-checked={mineF === f} className={`chip ${mineF === f ? 'on' : ''}`} onClick={() => setView({ tab: 'mine', mine: f })} data-rep-mine={f}>
              {MINE_NAME[f][lang]}
            </button>
          ))}
        </div>
      )}
      {!q.trim() && tab !== 'mine' && (p.styles ?? []).some(styleHas) && (
        <div className="chips rep-style-f" role="radiogroup" aria-label={he ? 'סגנון' : 'Style'} data-rep-style={styleF}>
          {(p.styles ?? []).filter(styleHas).map((st) => (
            <button key={st} role="radio" aria-checked={styleF === st} className={`chip ${styleF === st ? 'on' : ''}`} onClick={() => setStyleF(st)} data-rep-style-pick={st}>
              {STYLE_TEXT[st][lang]}
            </button>
          ))}
          <button role="radio" aria-checked={styleF === 'all'} className={`chip ${styleF === 'all' ? 'on' : ''}`} onClick={() => setStyleF('all')} data-rep-style-pick="all">
            {he ? 'כל הסגנונות' : 'All styles'}
          </button>
        </div>
      )}
      {!q.trim() && tab !== 'mine' && <p className="rep-tier-blurb">{REP_TIERS[(tab as number) - 1].blurb[lang]}</p>}
      {shown.length ? (
        <ul className="rep-list">
          {shown.map((x) => {
            const st = statusOf(x);
            return (
              <li key={x.key}>
                <button className={`rep-row st-${st} ${view.piece === x.key ? 'on' : ''}`} onClick={() => openPiece(x.key)} data-rep-item={x.ref.kind === 'rep' ? x.ref.id : x.key} data-rep-key={x.key}>
                  <span className="rep-row-text">
                    <b>{x.item ? x.teaches[lang] : x.title[lang]}</b>
                    <small>
                      {x.item ? x.title[lang] : x.teaches[lang]}
                      {/* SPEC-PRACTICE-IA-3 §3: each piece shows its style */}
                      {entryStyle(x) && <span className="rep-row-style" data-rep-row-style={entryStyle(x)!}> · {STYLE_TEXT[entryStyle(x)!][lang]}</span>}
                      {p.whyToday?.(x.key) && <TodayMark lang={lang} short />}
                      {assignedSet.has(itemKey({ k: 'piece', key: x.key })) && <AssignMark lang={lang} />}
                    </small>
                  </span>
                  <span className={`rep-mark st-${st}`} data-status={st}>
                    {st === 'new' ? '' : <StatusLadder ladder={pieceLadder(st, memoProgress(memo, x.item?.id ?? x.key).done >= MEMO_STEPS.length)} lang={lang} compact />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        // A first step instead of an empty list (SPEC-PRACTICE-IA-3 §8).
        <div className="rep-empty" data-rep-empty="1">
          <p>{tab === 'mine' && !q.trim() ? (he ? 'עוד לא הוספתם יצירה. דף אקורדים, תווים, הקלטה שלכם או אקורדים בהקלדה.' : 'Nothing added yet. A lead sheet, a score, your own recording or typed chords.') : he ? 'לא נמצאה יצירה.' : 'No piece found.'}</p>
          {tab === 'mine' && !q.trim() && (
            <button className="btn primary" onClick={() => setAdding(true)} data-rep-add-first="1">
              {he ? 'להוסיף יצירה' : 'Add a piece'}
            </button>
          )}
        </div>
      )}
      <div className="rep-links">
        <button className="link" onClick={() => setLists(true)} data-rep-lists="1">
          {he ? 'שלוש הרשימות: יודעים · לומדים · הבא' : 'Three lists: know · learning · next'}
        </button>
        {p.onSongbook && (
          <button className="link" onClick={p.onSongbook} data-rep-songbook="1">
            {he ? 'כל שירי נחלת הכלל' : 'All public-domain songs'}
          </button>
        )}
      </div>
      {adding && <AddPieceSheet lang={lang} onClose={() => setAdding(false)} onAdd={(s) => (setAdding(false), p.onAdd(s))} onTemplate={(id) => (setAdding(false), p.onTemplate(id))} onSheets={(sh) => {
        const k = p.onSheets(sh);
        if (k) {
          setAdding(false);
          setView({ tab: 'mine', piece: k }, true);
        }
      }} />}
    </main>
  );
  if (!wide) return list;
  return (
    <div className="rep-split" data-rep-split="1">
      {list}
      <section className="rep-pane" aria-live="polite">
        {piecePage ?? (
          <div className="rep-pane-empty">
            <p>{he ? 'בחרו יצירה מהרשימה' : 'Pick a piece from the list'}</p>
          </div>
        )}
      </section>
    </div>
  );
}

const MINE_NAME: Record<MineFilter, Bi> = {
  all: { en: 'All', he: 'הכול' },
  charts: { en: 'Charts', he: 'מהלכים' },
  scores: { en: 'Scores', he: 'תווים' },
  recordings: { en: 'Recordings', he: 'הקלטות' },
};

/** A piece that is not in the lists on show (a standard in another collection, a template): built from its key. */
function entryOfKey(key: string, myCharts: MyChartLike[] | undefined): LibEntry | undefined {
  const ref = parsePieceKey(key);
  if (!ref) return undefined;
  if (ref.kind === 'rep' && ref.course) {
    const it = repItem(ref.course, ref.id);
    return it ? { key, ref, tab: it.tier, title: it.title, teaches: it.teaches, item: it } : undefined;
  }
  const c = chartOfPiece(ref, 'en', myCharts);
  if (!c) return undefined;
  const he = chartOfPiece(ref, 'he', myCharts)!;
  return { key, ref, tab: ref.kind === 'chart' ? 'mine' : 2, title: { en: c.title, he: he.title }, teaches: { en: 'Chord chart', he: 'מהלך אקורדים' }, ...(c.std ? { std: c.std } : {}) };
}

// ------------------------------------------------------------------ the piece page

const MAIN: Record<WayIn, Bi> = {
  practice: { en: 'Practise', he: 'לתרגל' },
  path: { en: 'Continue the step', he: 'להמשיך את הצעד' },
  today: { en: "Today's dose", he: 'המנה של היום' },
  teacher: { en: 'The assignment', he: 'המשימה' },
};

function actionLabel(a: PieceAction, course: CourseId, ref: LibEntry['ref']): Bi {
  switch (a.k) {
    case 'way':
      return wayLabel(a.way, (ref.course ?? course) as RepCourse);
    case 'band':
      return { en: 'Play with the band', he: 'לנגן עם הלהקה' };
    case 'improvise':
      return { en: 'Improvise on it', he: 'לאלתר עליו' };
    case 'score':
      return { en: 'Learn it from the score', he: 'ללמוד מהתווים' };
    case 'recording':
      return course === 'ear' ? { en: 'Transcribe a phrase', he: 'לתמלל משפט' } : { en: 'Play along with my recording', he: 'לנגן עם ההקלטה שלי' };
    case 'technique':
      return { en: 'Practise it in the technique hub', he: 'לתרגל במרכז הטכניקה' };
    case 'melody':
      return a.mode === 'ear' ? { en: 'Learn the melody by ear', he: 'ללמוד את המנגינה בשמיעה' } : { en: 'Learn the melody from the page', he: 'ללמוד את המנגינה מהתווים' };
    case 'comp':
      return course === 'bass' ? { en: 'Comp it: walk the changes', he: 'ללוות: בס מהלך' } : { en: 'Comp it', he: 'ללוות אותו' };
    case 'voicings':
      return { en: 'Its voicings', he: 'הווייסינגים שלו' };
    case 'transcribe':
      return { en: 'Transcribe a phrase', he: 'לתמלל משפט' };
  }
}

function PiecePage(props: RepertoireProps & { entry: LibEntry; status: ItemStatus; wayIn: WayIn; inPane: boolean; memoDone: number; onMemo: () => void; onBackPiece: () => void; onOpen: (key: string) => void }) {
  const { lang, course, entry, status, wayIn, pathView, myCharts } = props;
  const he = lang === 'he';
  const it = entry.item;
  const chart = chartOfPiece(entry.ref, lang, myCharts);
  const hasChart = !!chart;
  const hasMelody = !!(chart as { melody?: unknown[] } | null)?.melody?.length || !!it?.ways.some((w) => w.k === 'song');
  const actions = pieceActions(entry, course, hasChart, { melody: hasMelody, strong: props.strong });
  // the technique hub: the piece's keys (and, on the piano, its voicings) to pick from
  const [techOpen, setTechOpen] = useState(false);
  const keys = techOpen && chart ? pieceKeys(chart.text) : [];
  const fits = chart && actions.some((a) => a.k === 'improvise') ? (props.licksFit?.(chart.text) ?? []) : [];
  const act = (a: PieceAction) => (a.k === 'technique' && a.key === undefined && chart ? setTechOpen((v) => !v) : props.onAction(entry, a));
  const [full, setFull] = useState(wayIn !== 'path');
  const where = entry.ref.kind === 'rep' ? whereInPath(pathView, entry.key) : null;
  const why = props.whyToday?.(entry.key) ?? null;
  const to = it?.leads?.to && entry.ref.course ? repItem(entry.ref.course, it.leads.to) : undefined;
  const from = it && entry.ref.course ? repLeadsFrom(entry.ref.course, it.id) : [];
  const main = actions[0];
  const rest = full ? actions.slice(1) : [];
  const std = entry.std ?? (it?.ref?.kind === 'standard' ? it.ref.id : undefined);
  const kicker = it ? `${tierName(it.tier)[lang]}${it.standard ? (he ? ' · סטנדרט' : ' · Standard') : ''}` : entry.teaches[lang];
  // the one item page's top (ItemHead): the ladder, where it sits, why today, the teacher's part, assign (a teacher)
  const itemRef: ItemRef = { k: 'piece', key: entry.key };
  const assigned = useAssignFor(itemRef);
  const teaching = useTeaching();
  return (
    <main className={`rep-screen rep-item ${props.inPane ? 'in-pane' : ''}`} data-rep-open={it?.id ?? entry.key} data-rep-piece={entry.key} data-way-in={wayIn}>
      <header className="screen-head">
        {!props.inPane && (
          <button className="icon-btn" onClick={props.onBackPiece} aria-label={he ? 'חזרה' : 'Back'} data-rep-back="1">
            <Icon k="back" />
          </button>
        )}
        <h1 dir="auto">{entry.title[lang]}</h1>
      </header>
      <ItemHead
        lang={lang}
        ladder={pieceLadder(status, props.memoDone >= MEMO_STEPS.length)}
        kicker={kicker}
        where={where}
        onWhere={() => props.onPathNode(entry.key)}
        why={why}
        assigned={assigned}
        item={itemRef}
        teaching={teaching}
        title={entry.title[lang]}
      />
      {it && <h2 className="rep-teaches">{it.teaches[lang]}</h2>}
      <div className="rep-ways">
        {main && (
          <button className="btn primary rep-main" onClick={() => act(main)} data-rep-main={wayIn} data-rep-way={main.k === 'way' ? main.way.k : main.k}>
            <span>{MAIN[wayIn][lang]}</span>
            <small>{actionLabel(main, course, entry.ref)[lang]}</small>
          </button>
        )}
        {!full && actions.length > 0 && (
          <button className="btn ghost" onClick={() => setFull(true)} data-rep-full="1">
            {he ? 'התרגול המלא של הצעד' : 'The full practice of the step'}
          </button>
        )}
        {rest.length > 0 && (
          <div className="rep-actions">
            {rest.map((a, i) => (
              <button key={i} className="btn ghost" onClick={() => act(a)} data-rep-way={a.k === 'way' ? a.way.k : a.k} data-rep-action={a.k === 'melody' ? `melody-${a.mode}` : a.k} aria-expanded={a.k === 'technique' ? techOpen : undefined}>
                {actionLabel(a, course, entry.ref)[lang]}
              </button>
            ))}
          </div>
        )}
        {techOpen && keys.length > 0 && (
          // SPEC-PRACTICE-IA-3 §3: "that piece's keys and voicings into the key session"
          <div className="rep-tech chips" data-rep-tech={keys.length}>
            <small>{he ? 'הסולמות של היצירה' : "The piece's keys"}</small>
            {keys.map((k) => (
              <button key={`${k.root}-${k.minor}`} className="chip" onClick={() => props.onAction(entry, { k: 'technique', key: k.root })} data-rep-tech-key={k.root}>
                <bdi dir="ltr">{KEY_NAME[k.root] + (k.minor ? 'm' : '')}</bdi>
              </button>
            ))}
            {course === 'keys' && (
              <button className="chip" onClick={() => props.onAction(entry, { k: 'voicings' })} data-rep-tech-voicings="1">
                {actionLabel({ k: 'voicings' }, course, entry.ref)[lang]}
              </button>
            )}
          </div>
        )}
        {full && fits.length > 0 && (
          // SPEC-LICKS-IN-IMPROV §5.3: "Improvise on it" shows the licks of mine that fit this progression
          <p className="rep-licks field-hint" data-rep-licks={fits.length}>
            {he ? 'הליקים שלכם שמתאימים: ' : 'Your licks that fit: '}
            {fits.map((f, i) => (
              <span key={f.id} data-rep-lick={f.id}>
                {i ? ' · ' : ''}
                {f.name[lang]} <bdi dir="ltr">({f.key}, {he ? 'תיבות' : 'bars'} {f.bars.slice(0, 3).join(', ')})</bdi>
              </span>
            ))}
          </p>
        )}
      </div>
      {full && it?.leads && (
        <div className="rep-leads">
          <small>{he ? 'לאן זה מוביל' : 'Where it leads'}</small>
          <p>{it.leads.text[lang]}</p>
          {to && (
            <button className="chip" onClick={() => props.onOpen(`rep:${entry.ref.course}:${to.id}`)} data-rep-to={to.id}>
              {to.title[lang]} <Icon k="fwd" />
            </button>
          )}
        </div>
      )}
      {full && !it?.leads && from.length > 0 && (
        <div className="rep-leads">
          <small>{he ? 'מגיעים לכאן מ־' : 'Comes from'}</small>
          <span className="rep-from">
            {from.map((x) => (
              <button key={x.id} className="chip" onClick={() => props.onOpen(`rep:${entry.ref.course}:${x.id}`)}>
                {x.title[lang]}
              </button>
            ))}
          </span>
        </div>
      )}
      {full && entry.ref.kind !== 'score' && entry.ref.kind !== 'rec' && (
        <button className="link" onClick={props.onMemo} data-rep-memo={props.memoDone}>
          {he ? 'לשנן' : 'Memorise'} <span dir="ltr">{props.memoDone}/{MEMO_STEPS.length}</span>
        </button>
      )}
      {full && std && (
        <div className="rep-refs" data-rep-ref={std}>
          <ListenOriginal id={std} lang={lang} compact />
        </div>
      )}
      {it && (
        <p className="rep-legal">
          {it.legal === 'pd' ? (he ? 'מנגינה מנחלת הכלל' : 'Public-domain melody') : it.legal === 'chords' ? (he ? 'מהלך אקורדים בלבד — בלי המנגינה' : 'Chord changes only — no melody') : he ? 'חומר מקורי של האפליקציה' : 'Our own material'}
        </p>
      )}
      {(entry.ref.kind === 'score' || entry.ref.kind === 'rec' || entry.ref.kind === 'chart') && <p className="rep-legal">{he ? 'נשמר רק במכשיר הזה' : 'Kept on this device only'}</p>}
    </main>
  );
}

// ------------------------------------------------------------------ Add a piece

function AddPieceSheet({ lang, onClose, onAdd, onSheets, onTemplate }: { lang: Lang; onClose: () => void; onAdd: (s: 'score' | 'recording' | 'type') => void; onSheets: (s: LeadSheet[]) => void; onTemplate: (id: string) => void }) {
  const he = lang === 'he';
  const [lead, setLead] = useState(false);
  const [typed, setTyped] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  const row = (id: string, title: string, sub: string, onClick: () => void) => (
    <button className="rep-src" onClick={onClick} data-rep-src={id}>
      <b>{title}</b>
      <small>{sub}</small>
    </button>
  );
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet rep-add-sheet" role="dialog" aria-modal="true" aria-labelledby="rep-add-title" onClick={(e) => e.stopPropagation()} data-rep-add-sheet="1">
        <div className="menu-head">
          <h2 id="rep-add-title">{he ? 'להוסיף יצירה' : 'Add a piece'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={he ? 'סגירה' : 'Close'}>
            <Icon k="close" />
          </button>
        </div>
        {lead ? (
          <LeadSheetImport lang={lang} onAdd={onSheets} />
        ) : typed ? (
          <div className="rep-typed">
            <button className="btn primary" onClick={() => onAdd('type')} data-rep-type-new="1">
              {he ? 'מהלך חדש' : 'A new chart'}
            </button>
            <small className="field-hint">{he ? 'או להתחיל ממהלך מוכר:' : 'Or start from a progression:'}</small>
            <div className="chips">
              {CHART_TEMPLATES.map((t) => (
                <button key={t.id} className="chip" onClick={() => onTemplate(t.id)} data-rep-template={t.id}>
                  {t.title[lang]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rep-srcs">
            {row('leadsheet', he ? 'דף אקורדים' : 'Lead sheet', 'MusicXML · mxl · iReal Pro · ChordPro · text', () => setLead(true))}
            {row('score', he ? 'תווים' : 'Score', he ? 'MusicXML · MIDI — למאמן היצירות' : 'MusicXML · MIDI — for the piece coach', () => onAdd('score'))}
            {row('recording', he ? 'הקלטה שלי' : 'My recording', he ? 'קובץ שמע עד 10 דקות — נשאר במכשיר' : 'An audio file up to 10 minutes — stays on the device', () => onAdd('recording'))}
            {row('type', he ? 'להקליד אקורדים' : 'Type the chords', he ? 'סימני אקורדים מופרדים ב־|' : 'Chord symbols separated by |', () => setTyped(true))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ memorising (Siskind): the three lists and the steps

function ListsPage({ lang, entries, memo, onBack, onOpen }: { lang: Lang; entries: LibEntry[]; memo: MemoState; onBack: () => void; onOpen: (key: string) => void }) {
  const he = lang === 'he';
  const byId = (id: string) => entries.find((e) => (e.item?.id ?? e.key) === id);
  return (
    <main className="rep-screen" data-rep-listpage="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>{he ? 'שלוש הרשימות' : 'Three lists'}</h1>
      </header>
      {TUNE_LISTS.map((l) => {
        const ids = tunesIn(memo, l.id).filter((id) => byId(id));
        return (
          <section key={l.id} className="rep-leads" data-rep-list={l.id}>
            <small>
              {l.name[lang]} <span dir="ltr">· {ids.length}</span>
            </small>
            <span className="rep-from">
              {ids.length ? (
                ids.map((id) => (
                  <button key={id} className="chip" onClick={() => onOpen(byId(id)!.key)}>
                    {byId(id)!.title[lang]}
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
function MemoPage({ lang, id, title, memo, setMemo, onBack, onTopic }: { lang: Lang; id: string; title: string; memo: MemoState; setMemo: (m: MemoState) => void; onBack: () => void; onTopic?: (topic: string) => void }) {
  const he = lang === 'he';
  const today = new Date().toISOString().slice(0, 10);
  const cur = memo.steps[id] ?? {};
  const list: TuneList | undefined = memo.lists[id];
  return (
    <main className="rep-screen rep-item" data-rep-memopage={id}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1 dir="auto">{title}</h1>
      </header>
      <div className="chips" role="radiogroup" aria-label={he ? 'רשימה' : 'List'}>
        {TUNE_LISTS.map((l) => (
          <button key={l.id} role="radio" aria-checked={list === l.id} className={`chip ${list === l.id ? 'on' : ''}`} onClick={() => setMemo(moveTune(memo, id, l.id))} data-memo-list={l.id}>
            {l.name[lang]}
          </button>
        ))}
      </div>
      <ul className="rep-list">
        {MEMO_STEPS.map((x) => (
          <li key={x.id}>
            <label className="toggle-row" data-memo-step={x.id}>
              <input type="checkbox" checked={!!cur[x.id]} onChange={() => setMemo(toggleMemoStep(memo, id, x.id, today))} />
              <span>
                <b>{x.title[lang]}</b> <small className="field-hint">{x.how[lang]}</small>
              </span>
            </label>
            {x.topic && onTopic && (
              <button className="link" onClick={() => onTopic(x.topic!)} data-memo-topic={x.topic}>
                {he ? 'לתרגל' : 'Practice'} <Icon k="fwd" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
