// Practice by key (owner 2026-11-21, docs/SPEC-PRACTICE-KEYS.md + SPEC-COACH-2 §6): the 12 keys as cards with their
// mastery, a tab per scale family (major · minor · melodic/harmonic-minor modes · symmetric), and a key page whose
// first button is the key's continuous session; under it one row per kind of exercise (scale, arpeggio, cadence …,
// control & dynamics), each with its levels in this key and their numbers: best clean tempo, accuracy, timing spread.
// The key-neutral families (rhythm, independence, mechanics) sit under the cards as General technique.

import type { StyleFocus } from '../engine/styleFocus';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Drill, DrillSettings, ItemState } from '../engine/drills/types';
import type { FacetGroup, FacetRole } from '../engine/drills/keyFacet';
import { families as familiesOf, itemTargetBpm } from '../engine/drills/plan';
import type { Lick } from '../engine/licks';
import { lickGroup, lickKeyDrill } from '../engine/drills/lickRungs';
import { itemStatus, STATUS_WORD } from '../engine/drills/itemStatus';
import type { FamilyDef } from '../engine/drills/generate';
import type { MatrixCell, MatrixSummary, MatrixView } from '../engine/drills/keyMatrix';
import { whyCounts, type PlanCell } from '../engine/drills/todayPlan';
import { AEOLIAN_FROM_TIER, cleanAt, currentEntry, groupsOf, keyCeilings, keyLadder, ladderFocus, keySession, LENS_NAME, LENS_SHORT, LENSES, measure, ROLE_ORDER, withLens, type KeyEntry, type KeyIndex, type Lens } from '../engine/drills/keyIndex';
import { keyName, keysInOrder } from '../engine/drills/generate';
import { Icon } from './icons';
import { keyFacts, keyQuiz, minorModesOn } from '../engine/keyTheory';
import { weekOf } from '../engine/drills/keyIndex';
import { KeyClosedLine } from './PlaceCharts';
import { levelLadder } from '../engine/statusLadder';
import type { ItemRef } from '../engine/itemAssign';
import { ItemHead, type WhereChip } from './ItemHead';
import { useAssignFor, useTeaching } from './itemAssigns';
import type { WayIn } from './practiceRoutes';

type Lang = 'he' | 'en';
export type PracticeView = 'topic' | 'key';

export const GROUP_NAME: Record<FacetGroup, { en: string; he: string }> = {
  major: { en: 'Major', he: 'מז׳ור' },
  minor: { en: 'Minor', he: 'מינור' },
  mmhm: { en: 'Melodic / harmonic modes', he: 'מודים מלודי / הרמוני' },
  symmetric: { en: 'Symmetric', he: 'סימטריים' },
};
export const ROLE_NAME: Record<FacetRole, { en: string; he: string }> = {
  scale: { en: 'Scales and modes', he: 'סולמות ומודים' },
  arpeggio: { en: 'Arpeggios and broken chords', he: 'ארפג׳יו ואקורדים שבורים' },
  cadence: { en: 'Cadences and progressions', he: 'קדנצות ומהלכים' },
  pattern: { en: 'Finger patterns', he: 'תבניות אצבעות' },
  control: { en: 'Control and dynamics', he: 'שליטה ודינמיקה' },
  harris: { en: 'Barry Harris', he: 'בארי האריס' },
  harmony: { en: 'Scale harmonisation', he: 'הרמוניזציה של הסולם' },
  voicing: { en: 'Voicings', he: 'ווייסינגים' },
  line: { en: 'Lines', he: 'קווים' },
  colour: { en: 'Colours', he: 'צבעים' },
  comping: { en: 'Comping', he: 'ליווי' },
  apply: { en: 'In music', he: 'ביישום' },
};

/** The key's name on a tab: C, Cm. */
const nameOf = (root: number, group: FacetGroup) => (group === 'minor' ? `${keyName(root, true)}m` : keyName(root));

/** Topic | Key: how Practice is laid out (remembered on this device). */
export function ViewSwitch({ view, onView, lang }: { view: PracticeView; onView: (v: PracticeView) => void; lang: Lang }) {
  const he = lang === 'he';
  return (
    <div className="seg practice-view" role="radiogroup" aria-label={he ? 'סידור התרגול' : 'Practice by'}>
      {(['topic', 'key'] as const).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={view === v} className={view === v ? 'on' : ''} onClick={() => onView(v)} data-practice-view={v}>
          {v === 'topic' ? (he ? 'לפי נושא' : 'By topic') : he ? 'לפי סולם' : 'By key'}
        </button>
      ))}
    </div>
  );
}

function GroupTabs({ groups, group, onGroup, lang }: { groups: FacetGroup[]; group: FacetGroup; onGroup: (g: FacetGroup) => void; lang: Lang }) {
  if (groups.length < 2) return null;
  return (
    <div className="chips key-groups" role="tablist" aria-label={lang === 'he' ? 'משפחת סולמות' : 'Scale family'}>
      {groups.map((g) => (
        <button key={g} type="button" role="tab" aria-selected={group === g} className={`chip ${group === g ? 'on' : ''}`} onClick={() => onGroup(g)} data-key-group={g}>
          {GROUP_NAME[g][lang]}
        </button>
      ))}
    </div>
  );
}

/**
 * The groups shown (owner 2026-11-21: the advanced tabs only from the right level): major, minor and symmetric (the
 * chromatic scale is early technique) always; the melodic / harmonic-minor modes for a player past the basics or in a
 * jazz focus, or once one of them was played — never in a classical-only emphasis.
 */
export function shownGroups(idx: KeyIndex, ds: DrillSettings, advanced = true, items: Record<string, ItemState> = {}): FacetGroup[] {
  const all = new Set<FacetGroup>();
  for (let r = 0; r < 12; r++) for (const g of groupsOf(idx, r)) all.add(g);
  const triedModes = () => {
    for (let r = 0; r < 12; r++) for (const es of Object.values(idx.pages[r].mmhm)) for (const e of es ?? []) if (e.drills.some((d) => (items[d.itemId]?.takes ?? 0) > 0)) return true;
    return false;
  };
  return (['major', 'minor', 'mmhm', 'symmetric'] as FacetGroup[]).filter((g) => all.has(g) && (g !== 'mmhm' || (ds.emphasis !== 'classical' && (advanced || ds.emphasis === 'jazz' || triedModes()))));
}

/** The circle of fifths on a wide screen (owner 2026-11-21); the grid on a phone. */
function useWide(min = 900): boolean {
  const q = () => typeof window !== 'undefined' && !!window.matchMedia?.(`(min-width: ${min}px)`).matches;
  const [wide, setWide] = useState(q);
  useEffect(() => {
    const m = window.matchMedia?.(`(min-width: ${min}px)`);
    if (!m) return;
    const on = () => setWide(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, [min]);
  return wide;
}
/** The circle, clockwise from C at the top. */
const CIRCLE = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/** The core rows a key card shows as dots (owner 2026-11-21: dynamics included). */
const CORE: FacetRole[] = ['scale', 'arpeggio', 'cadence', 'pattern', 'control'];

/** A row's level: the level worked on (its place among the row's levels) — promotion, never a "full" bar by count. */
function rowLevel(entries: KeyEntry[], items: Record<string, ItemState>): { at: number; of: number; done: number; cur: KeyEntry | null } {
  const sorted = [...entries].sort((a, b) => a.level.level - b.level.level);
  const cur = currentEntry(sorted, items);
  const done = sorted.filter((e) => e.drills.every((d) => cleanAt(items[d.itemId], d))).length;
  return { at: cur ? sorted.indexOf(cur) + 1 : 1, of: sorted.length, done, cur };
}

function LevelBar({ done, of }: { done: number; of: number }) {
  return (
    <span className="kp-bar" aria-hidden="true">
      <i style={{ width: `${of ? Math.round((done / of) * 100) : 0}%` }} />
    </span>
  );
}

/** The 12 key cards of a tab, in the player's key order, and General technique under them. */
/** The matrix as the player reads it (SPEC-DAILY-WORKOUT §2, §5): exercises, closed, time left, and the projection. */
type MatrixInfo = (MatrixSummary & { cellsList?: MatrixCell[]; perDay: number; days: number | null }) | null | undefined;
const hrs = (m: number, he: boolean): string => (m < 90 ? (he ? `כ־${Math.round(m)} דקות` : `about ${Math.round(m)} min`) : he ? `כ־${Math.round(m / 60)} שעות` : `about ${Math.round(m / 60)} h`);
function MatrixLine({ m, lang }: { m: MatrixInfo; lang: Lang }) {
  if (!m || !m.cells) return null;
  const he = lang === 'he';
  return (
    <p className="key-matrix-line" data-key-matrix={m.cells} data-key-matrix-closed={m.closed}>
      {he ? `כל התרגילים בכל הסולמות ברמה שלכם: ${m.cells} · סגורים ${m.closed} · נשארו ${hrs(m.minutesLeft, true)}` : `Every exercise in every key at your level: ${m.cells} · closed ${m.closed} · ${hrs(m.minutesLeft, false)} left`}
      {/* D5 (BUILD-PLAN-2026-11 §3): the projection lives on the Progress page only (measured time, phase 8) */}
    </p>
  );
}

/** Today's technique (BUILD-PLAN phase 2): the cells of the plan, the view of its rest, and the marks per key. */
export interface TodayInfo {
  plan: PlanCell[];
  view: MatrixView;
  onView: (v: MatrixView) => void;
  /** Today's cells per key ('major-0' → count). */
  byKey?: Map<string, number>;
}
/**
 * Part of today's workout (BUILD-PLAN phase 2: no private "today" here): the same cells as the workout's technique
 * block — half from the key of the week, the rest in the chosen view (remembered) — and the button that runs them.
 */
function TodayKeys({ today, lang, onToday }: { today: TodayInfo; lang: Lang; onToday: () => void }) {
  const he = lang === 'he';
  const { plan, view: mv } = today;
  const mins = Math.round(plan.reduce((n, p) => n + p.cell.minutes, 0));
  const w = whyCounts(plan);
  const parts = [w.week ? (he ? `${w.week} בסולם השבוע` : `${w.week} in the key of the week`) : '', w.strengthen ? (he ? `${w.strengthen} לחיזוק` : `${w.strengthen} to strengthen`) : '', w.review ? (he ? `${w.review} חזרה` : `${w.review} review`) : '', w.style ? (he ? `${w.style} בסגנונות שלי` : `${w.style} in my styles`) : ''].filter(Boolean);
  const VIEWS: [MatrixView, string, string][] = [['weak', 'Weakest first', 'קודם החלש'], ['key', 'By key', 'לפי סולם'], ['exercise', 'By exercise', 'לפי תרגיל']];
  return (
    <div className="key-today" data-key-today={mv} data-today-plan={plan.length}>
      <div className="chips" role="radiogroup" aria-label={he ? 'סדר העבודה' : 'Order of work'}>
        {VIEWS.map(([v, en, h]) => (
          <button key={v} className={`chip ${mv === v ? 'on' : ''}`} role="radio" aria-checked={mv === v} onClick={() => today.onView(v)} data-matrix-view={v}>
            {he ? h : en}
          </button>
        ))}
      </div>
      {plan.length > 0 && (
        <button className="coach-entry" onClick={onToday} data-key-today-run={plan.length} data-today-part="1">
          <Icon k="play" size={20} />
          <span>
            <b>{he ? `חלק מהאימון של היום · כ־${mins} דקות` : `Part of today's workout · about ${mins} min`}</b>
            <small>{he ? `${plan.length} תרגילים: ${parts.join(' · ')}` : `${plan.length} exercises: ${parts.join(' · ')}`}</small>
          </span>
        </button>
      )}
    </div>
  );
}

export function KeyGrid({ matrix, today, onToday, idx, items, lang, ds, group, onGroup, onKey, general, advanced = true, weekRoot = null, onWeek }: { matrix?: MatrixInfo; /** BUILD-PLAN phase 2: today's technique cells (the workout's block) and their marks. */ today?: TodayInfo; /** Run today's technique cells. */ onToday?: () => void; /** The key of the week (owner 2026-11-21) and its session. */ weekRoot?: number | null; onWeek?: (root: number, group: FacetGroup) => void; /** Past the basics (SPEC-COACH-2 §3): the advanced tabs show. */ advanced?: boolean; idx: KeyIndex; items: Record<string, ItemState>; lang: Lang; ds: DrillSettings; group: FacetGroup; onGroup: (g: FacetGroup) => void; onKey: (root: number) => void; general: ReactNode }) {
  const he = lang === 'he';
  const groups = shownGroups(idx, ds, advanced, items);
  const g = groups.includes(group) ? group : groups[0] ?? 'major';
  const wide = useWide();
  const order = wide ? CIRCLE : keysInOrder(ds.keyOrder, false);
  return (
    <section className="key-grid-wrap" data-key-grid={g}>
      <GroupTabs groups={groups} group={g} onGroup={onGroup} lang={lang} />
      <MatrixLine m={matrix} lang={lang} />
      {today && onToday && <TodayKeys today={today} lang={lang} onToday={onToday} />}
      {weekRoot !== null && onWeek && (
        <button className="coach-entry" onClick={() => onWeek(weekRoot, g)} data-week-key={weekRoot}>
          <Icon k="play" size={20} />
          <span>
            <b>
              {he ? 'סולם השבוע: ' : 'Key of the week: '}
              <bdi dir="ltr">{nameOf(weekRoot, g)}</bdi>
            </b>
            <small>{he ? 'אימון רציף בכל סוגי התרגילים בסולם, ברמה שלכם' : 'Continuous practice across the key, at your level'}</small>
          </span>
        </button>
      )}
      <div className={`key-grid ${wide ? 'circle' : ''}`} data-key-layout={wide ? 'circle' : 'grid'}>
        {wide && <span className="kc-centre" aria-hidden="true">{he ? 'מעגל הקווינטות' : 'Circle of fifths'}</span>}
        {order.map((root, ci) => {
          const rows = idx.pages[root][g];
          const drills = ROLE_ORDER.filter((r) => r !== 'apply').flatMap((r) => (rows[r] ?? []).flatMap((e) => e.drills));
          if (!drills.length) return null;
          const m = measure(dedupe(drills), items);
          const line = m.status === 'untried' ? (he ? 'עוד לא' : 'Not yet') : he ? `${m.clean} נקיים` : `${m.clean} clean`;
          // a key with cells in today's plan carries a small mark (BUILD-PLAN phase 2)
          const nToday = today?.byKey?.get(`${g}-${root}`) ?? 0;
          const todayTx = nToday ? (he ? `, ${nToday} באימון של היום` : `, ${nToday} in today's workout`) : '';
          return (
            <button key={root} type="button" className={`key-card st-${m.status} ${root === weekRoot ? 'week' : ''}`} style={wide ? circlePos(ci) : undefined} onClick={() => onKey(root)} data-key-card={root} data-today={nToday || undefined} aria-label={`${nameOf(root, g)}: ${line}${todayTx}`}>
              {nToday > 0 && (
                <span className="kc-today" aria-hidden="true">
                  {he ? 'היום' : 'Today'}
                </span>
              )}
              <b dir="ltr">{nameOf(root, g)}</b>
              <small>{line}</small>
              <span className="kc-dots" aria-hidden="true">
                {CORE.map((r) => {
                  const es = rows[r] ?? [];
                  if (!es.length) return null;
                  const rm = measure(dedupe(es.flatMap((e) => e.drills)), items);
                  return <i key={r} className={rm.clean ? (rm.status === 'strong' ? 'strong' : 'some') : rm.tried ? 'tried' : ''} title={ROLE_NAME[r][lang]} />;
                })}
              </span>
            </button>
          );
        })}
      </div>
      <p className="field-hint">{he ? 'הנקודות בכל כרטיס: סולמות, ארפג׳יו, קדנצות, תבניות, שליטה ודינמיקה.' : 'The dots on each card: scales, arpeggios, cadences, patterns, control and dynamics.'}</p>
      {general && (
        <section className="drill-topic" data-key-general="1">
          <h2>{he ? 'טכניקה כללית' : 'General technique'}</h2>
          {general}
        </section>
      )}
    </section>
  );
}

/** A card's place on the circle (percent of the square), clockwise from the top. */
const circlePos = (i: number): CSSProperties => {
  const a = (i / 12) * 2 * Math.PI;
  return { left: `${50 + 41 * Math.sin(a)}%`, top: `${50 - 41 * Math.cos(a)}%` };
};

const dedupe = (ds: Drill[]): Drill[] => {
  const seen = new Set<string>();
  return ds.filter((d) => (seen.has(d.itemId) ? false : (seen.add(d.itemId), true)));
};

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

/** One key page: the continuous session first, then a row per kind of exercise. */
export function KeyPage({ onRung, gained = 0, today, matrix, idx, root, group, items, lang, ds, onGroup, onRun, advanced = true, onOpenKey, tier = -1, onCoach, licks = [], focus: styleFocus, rung, onImproviseLick }: { /** Open a rung's item page here (lit, with its ladder, tempo chart and assign). */ onRung?: (levelId: string) => void; /** SPEC-DAILY-WORKOUT §5: "+N new exercises opened" after a tier rise (shown 3 days). */ gained?: number; /** SPEC-LICKS-IN-IMPROV §5.4: after a lick closes in the key, "now improvise with it" (over the key's progression, today's lick = it). */ onImproviseLick?: (l: Lick, key: number) => void; /** SPEC-PATH-TODAY-PRACTICE §2: the page opened on one rung (a technique level in this key) — its item page, lit. */ rung?: { id: string; wayIn: WayIn; where: WhereChip | null; onWhere?: () => void }; /** SPEC-STYLE-FOCUS: the course's style focus (block H of the key's ladder). */ focus?: StyleFocus; /** The player's lick pool (vocab.lickPool): the "language in the key" row (block G, phase 4). */ licks?: Lick[]; /** BUILD-PLAN phase 2: today's cells in this key and today's items (the marks). */ today?: { n: number; ids: Set<string> }; matrix?: MatrixInfo; /** The player's technique tier (−1 unknown) and the coach run of the key's ladder (owner 2026-11-22). */ tier?: number; onCoach?: (fam: FamilyDef) => void; /** Open a related key's page (relative, parallel). */ onOpenKey?: (root: number, group: FacetGroup) => void; advanced?: boolean; idx: KeyIndex; root: number; group: FacetGroup; items: Record<string, ItemState>; lang: Lang; ds: DrillSettings; onGroup: (g: FacetGroup) => void; onRun: (q: Drill[]) => void }) {
  const he = lang === 'he';
  const groups = shownGroups(idx, ds, advanced, items).filter((g) => groupsOf(idx, root).includes(g));
  const g = groups.includes(group) ? group : groups[0] ?? 'major';
  const rows = idx.pages[root][g];
  // the lit rung's row opens with the page (SPEC-PATH-TODAY-PRACTICE 3.1)
  const [open, setOpen] = useState<FacetRole | 'lang' | null>(() => (rung ? ROLE_ORDER.find((r) => (rows[r] ?? []).some((e) => e.level.id === rung.id)) ?? null : null));
  // Dynamics as a lens (owner 2026-11-21): the session and every single-line exercise through a touch, remembered here.
  const [lens, setLensState] = useState<Lens>(() => {
    try {
      return (localStorage.getItem('toneturn.lens') as Lens | null) ?? 'none';
    } catch {
      return 'none';
    }
  });
  const setLens = (l: Lens) => {
    setLensState(l);
    try {
      localStorage.setItem('toneturn.lens', l);
    } catch {
      /* fine */
    }
  };
  const run = (q: Drill[]) => onRun(q.map((d) => withLens(d, lens)));
  const session = keySession(idx, root, g, items);
  // the coach over the key's ladder: the scale at the player's tier, then 3rds, triads and 7ths along the whole scale
  // phase 7: the guitar and the bass have their own ladders (drums: no keys)
  const inst = ds.instrument ?? 'piano';
  const li = inst === 'piano' || inst === 'guitar' || inst === 'bass' ? inst : null;
  const ladder = li ? keyLadder(familiesOf(li), root, g, tier >= 0 ? tier : advanced ? 2 : 0, items, { jazz: ds.emphasis === 'jazz', instrument: li, ...(li === 'piano' ? { licks } : {}), ...(styleFocus ? { focus: styleFocus } : {}) }) : null;
  const focus = ladder ? ladderFocus(ladder, items) : null;
  // SPEC-KEY-SESSION §1c / §2: the ceilings for now in this key (where the coach's limit rule stopped a rung's climb)
  const ceilings = li && (g === 'major' || g === 'minor') ? keyCeilings(familiesOf(li), root, g, tier >= 0 ? tier : advanced ? 2 : 0, items, { jazz: ds.emphasis === 'jazz', instrument: li, ...(styleFocus ? { focus: styleFocus } : {}) }) : [];
  const mk = matrix?.byKey.find((k) => k.root === root && k.group === g);
  return (
    <div className="key-page" data-key-page={root} data-key-group-shown={g}>
      {rung && <RungCard rung={rung} idx={idx} root={root} items={items} lang={lang} ds={ds} today={today} onRun={run} />}
      <GroupTabs groups={groups} group={g} onGroup={onGroup} lang={lang} />
      <KnowTheKey root={root} group={g} lang={lang} onOpenKey={onOpenKey} />
      {/* SPEC-PROGRESS-CHARTS §2: the key's line — how much of it is closed, over time (the daily snapshots) */}
      <KeyClosedLine root={root} lang={lang} name={keyName(root)} />
      {today && today.n > 0 && (
        <p className="kp-today" data-kp-today={today.n}>
          <span className="today-chip">{he ? 'חלק מהאימון של היום' : "Part of today's workout"}</span>
          {he ? `${today.n} תרגילים בסולם הזה` : `${today.n} ${today.n === 1 ? 'exercise' : 'exercises'} in this key`}
        </p>
      )}
      {mk && (
        <p className="key-matrix-line" data-key-matrix-key={mk.cells}>
          {he ? `כל התרגילים בסולם הזה ברמה שלכם: ${mk.cells} · סגורים ${mk.closed} · ${hrs(mk.minutes, true)}` : `Every exercise in this key at your level: ${mk.cells} · closed ${mk.closed} · ${hrs(mk.minutes, false)}`}
        </p>
      )}
      {gained > 0 && (
        <p className="field-hint today-gained" dir="auto" data-gained={gained}>
          {he ? `+${gained} תרגילים חדשים נפתחו` : `+${gained} new exercises opened`}
        </p>
      )}
      {ceilings.length > 0 && (
        <p className="key-matrix-line" data-kp-ceilings={ceilings.length}>
          {he ? 'תקרה לעכשיו: ' : 'Ceiling for now: '}
          {ceilings.slice(0, 3).map((c, i) => (
            <span key={c.rung}>
              {i > 0 ? ' · ' : ''}
              {c.title[lang]} <bdi dir="ltr">♩{c.bpm}/{c.target}</bdi>
            </span>
          ))}
        </p>
      )}
      {li && g === 'major' && (tier >= 0 ? tier : advanced ? 2 : 0) >= AEOLIAN_FROM_TIER && (
        // phase 7: the Aeolian lives inside the major key, practised from its 6th degree (SPEC-DAILY-WORKOUT §1)
        <p className="key-matrix-line" data-kp-aeolian={(root + 9) % 12}>
          {he ? (
            <>
              האיאולי של הסולם: <bdi dir="ltr">{keyName((root + 9) % 12, true)}</bdi> מינור = סולם <bdi dir="ltr">{keyName(root)}</bdi> מז׳ור מהדרגה השישית
            </>
          ) : (
            <>
              The key&apos;s Aeolian: <bdi dir="ltr">{keyName((root + 9) % 12, true)}</bdi> minor = the <bdi dir="ltr">{keyName(root)}</bdi> major scale from its 6th degree
            </>
          )}
        </p>
      )}
      {session.length > 0 && (
        <button className="coach-entry" onClick={() => (ladder && onCoach ? onCoach(ladder) : run(session))} data-key-session={root} data-key-ladder={ladder ? ladder.levels.length : 0}>
          <Icon k="play" size={20} />
          <span>
            <b>
              {he ? 'אימון רציף ב־' : 'Continuous practice in '}
              <bdi dir="ltr">{nameOf(root, g)}</bdi>
            </b>
            <small>{ladder ? `${he ? `${ladder.levels.filter((l) => !l.id.endsWith('-again')).length} תרגילים: הסולם, טרצות, משולשים וספטאקורדים לאורך כל הסולם, ומה שהכי צריך חיזוק` : `${ladder.levels.filter((l) => !l.id.endsWith('-again')).length} exercises: the scale, 3rds, triads and 7th chords along the whole scale, and what needs work most`}${focus ? (he ? `. בדגש היום: ${focus.title.he}` : `. Today's focus: ${focus.title.en}`) : ''}` : he ? 'סולם, ארפג׳יו, קדנצה, תבנית ושליטה לסירוגין, כל אחד ברמה שלכם' : 'Scale, arpeggio, cadence, pattern and control in turn, each at your level'}</small>
          </span>
        </button>
      )}
      <div className="kp-lens">
        <small>{he ? 'עדשת דינמיקה' : 'Dynamics lens'}</small>
        <div className="chips" role="radiogroup" aria-label={he ? 'עדשת דינמיקה' : 'Dynamics lens'}>
          {LENSES.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={lens === l} className={`chip ${lens === l ? 'on' : ''}`} onClick={() => setLens(l)} data-lens={l} title={LENS_NAME[l][lang]}>
              {LENS_SHORT[l][lang]}
            </button>
          ))}
        </div>
      </div>
      <p className="field-hint kp-legend" dir="auto">
        {he ? '♩ הטמפו הנקי הגבוה · דיוק · סטיית קצב' : '♩ best clean tempo · accuracy · timing spread'}
      </p>
      {ROLE_ORDER.map((r) => {
        const entries = (rows[r] ?? []).slice().sort((a, b) => a.family.title[lang].localeCompare(b.family.title[lang]) || a.level.level - b.level.level);
        if (!entries.length) return null;
        const lv = rowLevel(entries, items);
        const isOpen = open === r;
        return (
          <section key={r} className="kp-row" data-kp-row={r}>
            <button type="button" className="kp-row-head" onClick={() => setOpen(isOpen ? null : r)} aria-expanded={isOpen}>
              <b>{ROLE_NAME[r][lang]}</b>
              <small>{he ? `שלב ${lv.at} מתוך ${lv.of}` : `Level ${lv.at} of ${lv.of}`}</small>
              {lv.cur && <span className="kp-now">{lv.cur.level.title[lang]}</span>}
              <LevelBar done={lv.done} of={lv.of} />
            </button>
            {isOpen && (
              <ol className="kp-entries">
                {entries.map((e) => {
                  const em = measure(e.drills, items);
                  const done = e.drills.every((d) => cleanAt(items[d.itemId], d));
                  const inToday = !!today?.ids.size && e.drills.some((d) => today.ids.has(d.itemId));
                  return (
                    <li key={`${e.family.id}:${e.level.id}`} className={onRung ? 'has-page' : undefined}>
                      <button type="button" className={`kp-entry ${done ? 'done' : ''} ${rung?.id === e.level.id ? 'lit' : ''}`} onClick={() => run(e.drills)} data-kp-entry={e.level.id} data-today={inToday ? '1' : undefined} data-kp-lit={rung?.id === e.level.id ? '1' : undefined}>
                        <span className="kp-name">
                          <small>
                            {e.family.title[lang]}
                            {inToday && <span className="today-chip">{he ? 'היום' : 'Today'}</span>}
                          </small>
                          {e.level.title[lang]}
                        </span>
                        {em.tried > 0 && (
                          <span className="kp-nums" dir="ltr">
                            {em.bestBpm ? `♩${em.bestBpm}` : '♩—'} · {pct(em.accuracy)} · {em.evenness === null ? '—' : `±${Math.round(em.evenness * 100)}%`}
                          </span>
                        )}
                      </button>
                      {onRung && rung?.id !== e.level.id && (
                        <button type="button" className="icon-btn kp-page" onClick={() => onRung(e.level.id)} aria-label={he ? 'הדף של השלב' : "The level's page"} title={he ? 'הדף של השלב' : "The level's page"} data-kp-page={e.level.id}>
                          <Icon k="eye" size={18} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
      {(g === 'major' || g === 'minor') && (ds.instrument ?? 'piano') === 'piano' && <LanguageRow licks={licks.filter((l) => lickGroup(l) === g)} root={root} items={items} lang={lang} today={today} open={open === 'lang'} onOpen={(o) => setOpen(o ? 'lang' : null)} onRun={run} onImprovise={onImproviseLick ? (l) => onImproviseLick(l, root) : undefined} />}
    </div>
  );
}

const RUNG_MAIN: Record<WayIn, { en: string; he: string }> = {
  practice: { en: 'Practise', he: 'לתרגל' },
  path: { en: 'Continue the step', he: 'להמשיך את הצעד' },
  today: { en: "Today's dose", he: 'המנה של היום' },
  teacher: { en: 'The assignment', he: 'המשימה' },
};

/**
 * The rung's item page on the key page (SPEC-PATH-TODAY-PRACTICE §2, §3.1, §3.3): the level in this key, lit — its
 * status ladder over all its keys, where it sits on the path, why today, the teacher's part (and, for a teacher, assign),
 * and the main button by the way in; the rest of the key page (all 12 keys of the level are its key cards) below.
 */
function RungCard({ rung, idx, root, items, lang, ds, today, onRun }: { rung: NonNullable<Parameters<typeof KeyPage>[0]['rung']>; idx: KeyIndex; root: number; items: Record<string, ItemState>; lang: Lang; ds: DrillSettings; today?: { n: number; ids: Set<string> }; onRun: (q: Drill[]) => void }) {
  const he = lang === 'he';
  const pages = idx.pages[root];
  const found = (Object.keys(pages) as FacetGroup[]).flatMap((g) => Object.values(pages[g]).flatMap((es) => (es ?? []).map((e) => ({ e, g })))).find((x) => x.e.level.id === rung.id);
  const item: ItemRef = { k: 'level', id: rung.id };
  const assigned = useAssignFor(item);
  const teaching = useTeaching();
  if (!found) return null;
  const { e, g } = found;
  const ladder = levelLadder(e.level, items, ds.keyOrder);
  const inToday = !!today?.ids.size && e.drills.some((d) => today.ids.has(d.itemId));
  const title = `${e.family.title[lang]} · ${e.level.title[lang]}`;
  return (
    <section className="rung-card" data-rung-card={rung.id} data-rung-key={root} data-way-in={rung.wayIn}>
      <h2 dir="auto">
        {e.level.title[lang]} · <bdi dir="ltr">{nameOf(root, g)}</bdi>
      </h2>
      <ItemHead
        lang={lang}
        ladder={ladder}
        kicker={e.family.title[lang]}
        where={rung.where}
        onWhere={rung.onWhere}
        why={inToday ? { en: "Part of today's workout", he: 'חלק מהאימון של היום' } : null}
        assigned={assigned}
        item={item}
        teaching={teaching}
        title={title}
        tempoItem={e.drills.map((d) => items[d.itemId]).filter((x): x is ItemState => !!x && x.takes > 0).sort((a, b) => (b.history?.length ?? 0) - (a.history?.length ?? 0))[0] ?? null}
      />
      <div className="ih-ways">
        <button className="btn primary ih-main" onClick={() => onRun(e.drills)} data-item-main={rung.wayIn} data-rung-run={rung.id}>
          <span>{RUNG_MAIN[rung.wayIn][lang]}</span>
          <small>
            {he ? 'בסולם ' : 'In '}
            <bdi dir="ltr">{nameOf(root, g)}</bdi>
          </small>
        </button>
      </div>
    </section>
  );
}

/**
 * Language in the key (block G, SPEC-DAILY-WORKOUT §6, phase 4): every lick of the player's pool in this key — the
 * library's, the player's own and the technique families' lines — with its status in this key; a tap plays it here.
 * Empty pool: one line that says how a lick gets here.
 */
/** The lick closed most recently (its last take within three days) among closed ones; null when none. */
export function closedRecently(xs: { l: Lick; st: ItemState | undefined; closed: boolean }[], now = Date.now()): Lick | null {
  const DAY = 86_400_000;
  const r = xs.filter((x) => x.closed && x.st?.last && now - Date.parse(x.st.last) <= 3 * DAY).sort((a, b) => (b.st!.last ?? '').localeCompare(a.st!.last ?? ''));
  return r[0]?.l ?? null;
}

function LanguageRow({ licks, root, items, lang, today, open, onOpen, onRun, onImprovise }: { licks: Lick[]; root: number; items: Record<string, ItemState>; lang: Lang; today?: { ids: Set<string> }; open: boolean; onOpen: (o: boolean) => void; onRun: (q: Drill[]) => void; onImprovise?: (l: Lick) => void }) {
  const he = lang === 'he';
  const ds = licks.map((l) => ({ l, d: lickKeyDrill(l, root) }));
  const closed = ds.filter(({ d }) => cleanAt(items[d.itemId], d)).length;
  // SPEC-LICKS-IN-IMPROV §5.4: a lick that closed in this key in the last three days — "now improvise with it"
  const fresh = closedRecently(ds.map(({ l, d }) => ({ l, st: items[d.itemId], closed: itemStatus(items[d.itemId], d.startBpm, itemTargetBpm(d)) === 'closed' })));
  return (
    <section className="kp-row" data-kp-row="lang" data-kp-licks={licks.length}>
      <button type="button" className="kp-row-head" onClick={() => onOpen(!open)} aria-expanded={open}>
        <b>{he ? 'שפה בסולם' : 'Language in the key'}</b>
        <small>{licks.length ? (he ? `${licks.length} ליקים · סגורים ${closed}` : `${licks.length} licks · closed ${closed}`) : he ? 'ליק שניגנתם מגיע לכאן, בכל סולם' : 'A lick you have played comes here, in every key'}</small>
        {licks.length > 0 && <LevelBar done={closed} of={licks.length} />}
      </button>
      {fresh && onImprovise && (
        <div className="kp-improvise" data-kp-improvise={fresh.id}>
          <small>
            {he ? 'נסגר בסולם הזה:' : 'Closed in this key:'} {fresh.name[lang]}
          </small>
          <button type="button" className="btn ghost small" onClick={() => onImprovise(fresh)} data-kp-improvise-go={fresh.id}>
            {he ? 'עכשיו לאלתר איתו' : 'Now improvise with it'}
          </button>
        </div>
      )}
      {open && licks.length > 0 && (
        <ol className="kp-entries">
          {ds.map(({ l, d }) => {
            const em = measure([d], items);
            const st = itemStatus(items[d.itemId], d.startBpm, itemTargetBpm(d));
            const inToday = !!today?.ids.has(d.itemId);
            return (
              <li key={l.id}>
                <button type="button" className={`kp-entry ${st === 'closed' ? 'done' : ''}`} onClick={() => onRun([d])} data-kp-lick={l.id} data-today={inToday ? '1' : undefined}>
                  <span className="kp-name">
                    <small>
                      {STATUS_WORD[st][lang]}
                      {inToday && <span className="today-chip">{he ? 'היום' : 'Today'}</span>}
                    </small>
                    {l.name[lang]}
                  </span>
                  {em.tried > 0 && (
                    <span className="kp-nums" dir="ltr">
                      {em.bestBpm ? `♩${em.bestBpm}` : '♩—'} · {pct(em.accuracy)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const SYM_SCALES: { name: { en: string; he: string }; ints: number[] }[] = [
  { name: { en: 'whole-tone', he: 'טונים שלמים' }, ints: [0, 2, 4, 6, 8, 10] },
  { name: { en: 'diminished half–whole', he: 'מוקטן חצי–שלם' }, ints: [0, 1, 3, 4, 6, 7, 9, 10] },
  { name: { en: 'diminished whole–half', he: 'מוקטן שלם–חצי' }, ints: [0, 2, 3, 5, 6, 8, 9, 11] },
];

/**
 * "Know the key" (owner 2026-11-21): the key's facts before playing — signature, scale, the chord on each degree, the
 * ii–V–I, the 6th-diminished, the relative and parallel keys (one tap away) — and a three-question warm-up. The modes
 * tab lists the melodic / harmonic-minor modes on the root with their parents; the symmetric tab its scales.
 */
function KnowTheKey({ root, group, lang, onOpenKey }: { root: number; group: FacetGroup; lang: Lang; onOpenKey?: (root: number, group: FacetGroup) => void }) {
  const he = lang === 'he';
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const head = (
    <button type="button" className="kk-head" onClick={() => setOpen(!open)} aria-expanded={open} data-know-key={root}>
      <b>{he ? 'הכירו את הסולם' : 'Know the key'}</b>
      <small>{open ? (he ? 'סגירה' : 'Close') : he ? 'עובדות ושלוש שאלות לפני שמנגנים' : 'Facts and three questions before you play'}</small>
    </button>
  );
  if (!open) return <section className="kk card">{head}</section>;
  const sig = (n: number) => (n === 0 ? (he ? 'בלי סימני היתק' : 'no sharps or flats') : n > 0 ? `${n}♯` : `${-n}♭`);
  let body: ReactNode = null;
  if (group === 'major' || group === 'minor') {
    const f = keyFacts(root, group === 'minor');
    const seed = Number(weekOf().replace(/-/g, '')) + root;
    const quiz = keyQuiz(root, group === 'minor', seed);
    body = (
      <>
        <dl className="kk-facts">
          <dt>{he ? 'סימני היתק' : 'Key signature'}</dt>
          <dd dir="ltr">{sig(f.signature)}</dd>
          <dt>{he ? 'הסולם' : 'Scale'}</dt>
          <dd dir="ltr">{f.notes.join(' ')}</dd>
          {f.more.map((m) => (
            <span key={m.name.en} className="kk-pair">
              <dt>{m.name[lang]}</dt>
              <dd dir="ltr">{m.notes.join(' ')}</dd>
            </span>
          ))}
          <dt>{he ? 'האקורדים בסולם' : 'Chords of the key'}</dt>
          <dd dir="ltr">{f.chords.join(' · ')}</dd>
          <dt>ii–V–{group === 'minor' ? 'i' : 'I'}</dt>
          <dd dir="ltr">{f.cadence}</dd>
          <dt>{he ? 'שישית־מוקטן' : '6th-diminished'}</dt>
          <dd dir="ltr">{f.sixDim}</dd>
        </dl>
        {onOpenKey && (
          <div className="kk-links">
            <button type="button" className="chip" onClick={() => onOpenKey(f.relative.root, f.relative.minor ? 'minor' : 'major')} data-kk-relative={f.relative.root}>
              {he ? 'היחסי: ' : 'Relative: '}
              <bdi dir="ltr">{f.relative.name}</bdi>
            </button>
            <button type="button" className="chip" onClick={() => onOpenKey(f.parallel.root, f.parallel.minor ? 'minor' : 'major')} data-kk-parallel={f.parallel.root}>
              {he ? 'המקביל: ' : 'Parallel: '}
              <bdi dir="ltr">{f.parallel.name}</bdi>
            </button>
          </div>
        )}
        <ol className="kk-quiz">
          {quiz.map((q, k) => (
            <li key={k} data-kk-q={k}>
              <span>{q.q[lang]}</span>
              <span className="kk-opts">
                {q.options.map((o) => {
                  const sel = picked[k] === o;
                  const state = picked[k] === undefined ? '' : o === q.answer ? 'right' : sel ? 'wrong' : '';
                  return (
                    <button key={o} type="button" className={`chip ${state}`} disabled={picked[k] !== undefined} onClick={() => setPicked({ ...picked, [k]: o })} dir="ltr">
                      {o}
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ol>
      </>
    );
  } else if (group === 'mmhm') {
    body = (
      <dl className="kk-facts">
        {minorModesOn(root).map((m) => {
          const [pen, phe] = m.parent.split('|');
          return (
            <span key={m.name.en} className="kk-pair">
              <dt>
                {m.name[lang]} <small>({he ? `מ־${phe}` : `of ${pen}`})</small>
              </dt>
              <dd dir="ltr">{m.notes.join(' ')}</dd>
            </span>
          );
        })}
      </dl>
    );
  } else {
    const names = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
    body = (
      <dl className="kk-facts">
        {SYM_SCALES.map((sc) => (
          <span key={sc.name.en} className="kk-pair">
            <dt>{sc.name[lang]}</dt>
            <dd dir="ltr">{sc.ints.map((i) => names[(root + i) % 12]).join(' ')}</dd>
          </span>
        ))}
        <dt>{he ? 'אותם צלילים' : 'Same notes'}</dt>
        <dd>{he ? 'טונים שלמים חוזר כל 2 סולמות, מוקטן כל 3' : 'whole-tone repeats every 2 keys, diminished every 3'}</dd>
      </dl>
    );
  }
  return (
    <section className="kk card">
      {head}
      {body}
    </section>
  );
}
