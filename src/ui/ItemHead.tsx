// The top of every item page (docs/SPEC-PATH-TODAY-PRACTICE.md §2, owner 2026-11-22): the same four things whether the
// item is a technique rung in a key, a lick, a piece or an improvisation level —
//   1. the status ladder (BUILD-PLAN D4: new · learning · almost · closed · 12 keys · in my language · in the fingers);
//   2. "where it sits": a chip to its path node, or "later in your path";
//   3. "why today": a chip when it is in today's plan;
//   4. "from your teacher": the note, the target and the channel, when it was assigned;
// and, for a teacher, "assign to a student or a class" (§5.2). The marks in the places (part of today, assignment) are
// here too, so every list draws them the same way. One phone screen; no emoji; Latin in <bdi dir="ltr">.

import { ItemTempoChart, itemTempoPoints } from './PlaceCharts';
import type { ItemState } from '../engine/drills/types';
import { useState, type ReactNode } from 'react';
import { ladderWord, nextRung, rungLabel, type Ladder } from '../engine/statusLadder';
import type { AssignItem } from '../cloud/teacher';
import type { TeachingClass } from '../cloud/classes';
import { assignRefOf, type ItemRef } from '../engine/itemAssign';
import { AssignForm } from './TeacherLoop';
import { STRINGS } from '../i18n/strings';
import { Icon } from './icons';
import { refreshAssigns } from './itemAssigns';
import '../itempage.css';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };

/**
 * The status ladder. Compact (lists, path nodes): small rising rungs and the word. Full (the item page): every rung of
 * the item's kind with its short name, the lit ones filled, the upper rungs (12 keys, in my language, in the fingers)
 * marked as the summit rungs, and the next rung named.
 */
export function StatusLadder({ ladder, lang, compact = false, word = true }: { ladder: Ladder; lang: Lang; compact?: boolean; word?: boolean }) {
  const next = nextRung(ladder);
  const he = lang === 'he';
  const label = `${ladderWord(ladder, lang)}${next ? ` · ${he ? 'הבא' : 'next'}: ${rungLabel(ladder, next, lang)}` : ''}`;
  if (compact)
    return (
      <span className={`sl sl-compact st-${ladder.top}`} role="img" aria-label={label} data-status={ladder.top} data-rungs={ladder.lit.length} data-ladder={ladder.kind}>
        <span className="sl-bars" dir="ltr" aria-hidden="true">
          {ladder.rungs.slice(1).map((r, i) => (
            <i key={r} className={`${ladder.lit.includes(r) ? 'on' : ''} ${i >= 3 ? 'up' : ''}`} style={{ height: `${5 + i * 2}px` }} data-rung={r} title={rungLabel(ladder, r, lang)} />
          ))}
        </span>
        {word && <b>{ladderWord(ladder, lang)}</b>}
      </span>
    );
  return (
    <div className={`sl sl-full st-${ladder.top}`} data-status={ladder.top} data-ladder={ladder.kind}>
      <div className="sl-head">
        <b className="sl-word">{ladderWord(ladder, lang)}</b>
        {next && (
          <small className="sl-next">
            {he ? 'הבא' : 'Next'}: {rungLabel(ladder, next, lang)}
          </small>
        )}
      </div>
      <ol className="sl-rungs" aria-label={label}>
        {ladder.rungs.map((r, i) => (
          <li key={r} className={`${ladder.lit.includes(r) ? 'on' : ''} ${i >= 4 ? 'up' : ''} ${r === ladder.top ? 'top' : ''}`} data-rung={r}>
            <i aria-hidden="true" />
            <small>{rungLabel(ladder, r, lang)}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** "Part of today's workout" (§3.4), the same small mark in every place. */
export function TodayMark({ lang, short = false }: { lang: Lang; short?: boolean }) {
  return (
    <span className="today-chip" data-today-mark="1">
      {short ? (lang === 'he' ? 'היום' : 'Today') : lang === 'he' ? 'חלק מהאימון של היום' : "Part of today's workout"}
    </span>
  );
}
/** An assigned item (§5.1), the same small mark in every place. */
export function AssignMark({ lang }: { lang: Lang }) {
  return (
    <span className="assign-chip" data-assign-mark="1">
      <Icon k="cap" size={12} />
      {lang === 'he' ? 'משימה' : 'Assignment'}
    </span>
  );
}

export interface WhereChip {
  state: 'done' | 'current' | 'ahead';
  unit: number;
  step: number;
}

const CHANNEL: Record<string, Bi> = {
  page: { en: 'from the page', he: 'מהתווים' },
  ear: { en: 'by ear', he: 'מהאוזן' },
  memory: { en: 'from memory', he: 'מהזיכרון' },
};

/** The four parts of the top of an item page, and the teacher's assign button. */
export function ItemHead({ lang, ladder, kicker, where, onWhere, why, assigned, assignChannel, item, teaching, title, children, dense = false, tempoItem }: {
  lang: Lang;
  /** SPEC-PROGRESS-CHARTS §2: the item whose tempo over time (target, ceiling) folds open under the head. */
  tempoItem?: ItemState | null;
  /** A page whose exercise needs the room (the lick page: score + 12-key grid on one screen): the compact ladder on the kicker's line. */
  dense?: boolean;
  ladder: Ladder;
  kicker?: ReactNode;
  where?: WhereChip | null;
  onWhere?: () => void;
  why?: Bi | null;
  /** The open assignment for this item (the student's side). */
  assigned?: AssignItem | null;
  /** The assignment's required channel, when the server keeps it (§5.2). */
  assignChannel?: 'free' | 'page' | 'ear' | 'memory' | null;
  /** The item (for the teacher's assign sheet). */
  item?: ItemRef | null;
  /** The classes this user teaches: the assign button shows when there is one. */
  teaching?: TeachingClass[];
  /** The item's name (the assign sheet's title). */
  title?: string;
  children?: ReactNode;
}) {
  const he = lang === 'he';
  const [sheet, setSheet] = useState(false);
  const chip = (body: ReactNode, attrs: Record<string, string>, onClick?: () => void) =>
    onClick ? (
      <button className="chip rep-chip" onClick={onClick} {...attrs}>
        {body}
      </button>
    ) : (
      <span className="chip rep-chip passive" {...attrs}>
        {body}
      </span>
    );
  const canAssign = !!item && (teaching?.length ?? 0) > 0;
  return (
    <div className="item-head" data-item-head={ladder.kind}>
      <div className={`ih-top ${dense ? 'dense' : ''}`}>
        {dense ? (
          <>
            {kicker && <small className="rep-kicker ih-kicker">{kicker}</small>}
            <StatusLadder ladder={ladder} lang={lang} compact />
          </>
        ) : (
          <StatusLadder ladder={ladder} lang={lang} />
        )}
        {canAssign && (
          <button className="icon-btn ih-assign" onClick={() => setSheet(true)} aria-label={he ? 'להטיל על תלמיד או כיתה' : 'Assign to a student or a class'} title={he ? 'להטיל על תלמיד או כיתה' : 'Assign to a student or a class'} data-item-assign="1">
            <Icon k="cap" />
          </button>
        )}
      </div>
      {kicker && !dense && <small className="rep-kicker ih-kicker">{kicker}</small>}
      {(where || why || assigned) && (
        <div className="rep-chips ih-chips">
          {where &&
            chip(
              where.state === 'ahead' ? (he ? `בהמשך המסלול · יחידה ${where.unit}` : `Later in your path · Unit ${where.unit}`) : he ? `במסלול · יחידה ${where.unit} · צעד ${where.step}` : `In your path · Unit ${where.unit} · step ${where.step}`,
              { 'data-rep-where': where.state, 'data-item-where': where.state },
              onWhere,
            )}
          {why && chip(<>{why[lang]}</>, { 'data-rep-why': '1', 'data-item-why': '1' })}
          {assigned && <AssignMark lang={lang} />}
        </div>
      )}
      {assigned && (
        <div className="ih-teacher" data-item-teacher={assigned.id}>
          <small>
            {he ? 'מהמורה' : 'From your teacher'}
            {assigned.className ? <> · <bdi>{assigned.className}</bdi></> : null}
          </small>
          {assigned.note && <p dir="auto">{assigned.note}</p>}
          <span className="ih-target">
            {[
              assigned.targetBpm ? (
                <span key="t">
                  {he ? 'יעד' : 'Target'} <bdi dir="ltr">♩{assigned.targetBpm}</bdi>
                </span>
              ) : null,
              assignChannel && assignChannel !== 'free' && CHANNEL[assignChannel] ? <span key="c">{CHANNEL[assignChannel][lang]}</span> : null,
              assigned.dueOn ? (
                <span key="d">
                  {he ? 'עד' : 'due'} <bdi dir="ltr">{assigned.dueOn}</bdi>
                </span>
              ) : null,
            ]
              .filter(Boolean)
              .flatMap((x, i) => (i ? [' · ', x] : [x]))}
          </span>
        </div>
      )}
      {tempoItem && itemTempoPoints(tempoItem).length > 1 && (
        <details className="ih-tempo" data-ih-tempo={tempoItem.itemId}>
          <summary>{he ? 'טמפו לאורך זמן' : 'Tempo over time'}</summary>
          <ItemTempoChart item={tempoItem} lang={lang} />
        </details>
      )}
      {children}
      {sheet && item && <AssignSheet lang={lang} item={item} title={title ?? ''} teaching={teaching ?? []} onClose={() => setSheet(false)} />}
    </div>
  );
}

/** "Assign to a student or a class" from the item's page (§5.2): the class, then the teacher loop's form with the item fixed. */
function AssignSheet({ lang, item, title, teaching, onClose }: { lang: Lang; item: ItemRef; title: string; teaching: TeachingClass[]; onClose: () => void }) {
  const he = lang === 'he';
  const [cls, setCls] = useState(teaching[0]?.id ?? '');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet ih-sheet" role="dialog" aria-modal="true" aria-labelledby="ih-assign-title" onClick={(e) => e.stopPropagation()} data-item-assign-sheet="1">
        <div className="menu-head">
          <h2 id="ih-assign-title" dir="auto">
            {he ? 'להטיל' : 'Assign'} · <bdi>{title}</bdi>
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label={he ? 'סגירה' : 'Close'}>
            <Icon k="close" />
          </button>
        </div>
        {done ? (
          <p className="field-hint" data-item-assigned="1">
            {he ? 'הוטל. התלמידים יראו את זה באימון היומי ובדף הזה.' : 'Assigned. Students see it in their daily workout and on this page.'}
          </p>
        ) : (
          <>
            {teaching.length > 1 && (
              <label className="af-row">
                <span>{he ? 'כיתה' : 'Class'}</span>
                <select value={cls} onChange={(e) => setCls(e.target.value)} data-item-assign-class="1">
                  {teaching.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <AssignForm
              classId={cls}
              students={teaching.find((c) => c.id === cls)?.students.map((x) => ({ userId: x.userId, name: x.name }))}
              lang={lang}
              t={STRINGS[lang]}
              busy={false}
              preset={assignRefOf(item)}
              onAssigned={() => {
                refreshAssigns();
                setDone(true);
              }}
              onError={setErr}
            />
            {err && <p className="field-hint">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}
