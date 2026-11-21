// Practice by key (owner 2026-11-21, docs/SPEC-PRACTICE-KEYS.md + SPEC-COACH-2 §6): the 12 keys as cards with their
// mastery, a tab per scale family (major · minor · melodic/harmonic-minor modes · symmetric), and a key page whose
// first button is the key's continuous session; under it one row per kind of exercise (scale, arpeggio, cadence …,
// control & dynamics), each with its levels in this key and their numbers: best clean tempo, accuracy, timing spread.
// The key-neutral families (rhythm, independence, mechanics) sit under the cards as General technique.

import { useState, type ReactNode } from 'react';
import type { Drill, DrillSettings, ItemState } from '../engine/drills/types';
import type { FacetGroup, FacetRole } from '../engine/drills/keyFacet';
import { cleanAt, currentEntry, groupsOf, keySession, measure, ROLE_ORDER, type KeyEntry, type KeyIndex } from '../engine/drills/keyIndex';
import { keyName, keysInOrder } from '../engine/drills/generate';
import { Icon } from './icons';

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

/** The groups shown: all the root has, the melodic / harmonic-minor modes not in a classical-only emphasis. */
export function shownGroups(idx: KeyIndex, ds: DrillSettings): FacetGroup[] {
  const all = new Set<FacetGroup>();
  for (let r = 0; r < 12; r++) for (const g of groupsOf(idx, r)) all.add(g);
  return (['major', 'minor', 'mmhm', 'symmetric'] as FacetGroup[]).filter((g) => all.has(g) && !(g === 'mmhm' && ds.emphasis === 'classical'));
}

/** The core rows a key card shows as dots (owner 2026-11-21: dynamics included). */
const CORE: FacetRole[] = ['scale', 'arpeggio', 'cadence', 'pattern', 'control'];

/** A row's level: the level worked on (its place among the row's levels) — promotion, never a "full" bar by count. */
function rowLevel(entries: KeyEntry[], items: Record<string, ItemState>): { at: number; of: number; done: number } {
  const sorted = [...entries].sort((a, b) => a.level.level - b.level.level);
  const cur = currentEntry(sorted, items);
  const done = sorted.filter((e) => e.drills.every((d) => cleanAt(items[d.itemId], d))).length;
  return { at: cur ? sorted.indexOf(cur) + 1 : 1, of: sorted.length, done };
}

function LevelBar({ done, of }: { done: number; of: number }) {
  return (
    <span className="kp-bar" aria-hidden="true">
      <i style={{ width: `${of ? Math.round((done / of) * 100) : 0}%` }} />
    </span>
  );
}

/** The 12 key cards of a tab, in the player's key order, and General technique under them. */
export function KeyGrid({ idx, items, lang, ds, group, onGroup, onKey, general }: { idx: KeyIndex; items: Record<string, ItemState>; lang: Lang; ds: DrillSettings; group: FacetGroup; onGroup: (g: FacetGroup) => void; onKey: (root: number) => void; general: ReactNode }) {
  const he = lang === 'he';
  const groups = shownGroups(idx, ds);
  const g = groups.includes(group) ? group : groups[0] ?? 'major';
  const order = keysInOrder(ds.keyOrder === 'difficulty' ? 'fifths-up' : ds.keyOrder, false);
  return (
    <section className="key-grid-wrap" data-key-grid={g}>
      <GroupTabs groups={groups} group={g} onGroup={onGroup} lang={lang} />
      <div className="key-grid">
        {order.map((root) => {
          const rows = idx.pages[root][g];
          const drills = ROLE_ORDER.filter((r) => r !== 'apply').flatMap((r) => (rows[r] ?? []).flatMap((e) => e.drills));
          if (!drills.length) return null;
          const m = measure(dedupe(drills), items);
          const line = m.status === 'untried' ? (he ? 'עוד לא' : 'Not yet') : he ? `${m.clean} נקיים` : `${m.clean} clean`;
          return (
            <button key={root} type="button" className={`key-card st-${m.status}`} onClick={() => onKey(root)} data-key-card={root} aria-label={`${nameOf(root, g)}: ${line}`}>
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

const dedupe = (ds: Drill[]): Drill[] => {
  const seen = new Set<string>();
  return ds.filter((d) => (seen.has(d.itemId) ? false : (seen.add(d.itemId), true)));
};

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

/** One key page: the continuous session first, then a row per kind of exercise. */
export function KeyPage({ idx, root, group, items, lang, ds, onGroup, onRun }: { idx: KeyIndex; root: number; group: FacetGroup; items: Record<string, ItemState>; lang: Lang; ds: DrillSettings; onGroup: (g: FacetGroup) => void; onRun: (q: Drill[]) => void }) {
  const he = lang === 'he';
  const groups = shownGroups(idx, ds).filter((g) => groupsOf(idx, root).includes(g));
  const g = groups.includes(group) ? group : groups[0] ?? 'major';
  const rows = idx.pages[root][g];
  const [open, setOpen] = useState<FacetRole | null>(null);
  const session = keySession(idx, root, g, items);
  return (
    <div className="key-page" data-key-page={root} data-key-group-shown={g}>
      <GroupTabs groups={groups} group={g} onGroup={onGroup} lang={lang} />
      {session.length > 0 && (
        <button className="coach-entry" onClick={() => onRun(session)} data-key-session={root}>
          <Icon k="play" size={20} />
          <span>
            <b>
              {he ? 'אימון רציף ב־' : 'Continuous practice in '}
              <bdi dir="ltr">{nameOf(root, g)}</bdi>
            </b>
            <small>{he ? 'סולם, ארפג׳יו, קדנצה, תבנית ושליטה לסירוגין, כל אחד ברמה שלכם' : 'Scale, arpeggio, cadence, pattern and control in turn, each at your level'}</small>
          </span>
        </button>
      )}
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
              <LevelBar done={lv.done} of={lv.of} />
            </button>
            {isOpen && (
              <ol className="kp-entries">
                {entries.map((e) => {
                  const em = measure(e.drills, items);
                  const done = e.drills.every((d) => cleanAt(items[d.itemId], d));
                  return (
                    <li key={`${e.family.id}:${e.level.id}`}>
                      <button type="button" className={`kp-entry ${done ? 'done' : ''}`} onClick={() => onRun(e.drills)} data-kp-entry={e.level.id}>
                        <span className="kp-name">
                          <small>{e.family.title[lang]}</small>
                          {e.level.title[lang]}
                        </span>
                        {em.tried > 0 && (
                          <span className="kp-nums" dir="ltr">
                            {em.bestBpm ? `♩${em.bestBpm}` : '♩—'} · {pct(em.accuracy)} · {em.evenness === null ? '—' : `±${Math.round(em.evenness * 100)}%`}
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
      })}
    </div>
  );
}
