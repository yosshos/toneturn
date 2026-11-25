// The teacher's weekly plans on a class card (SPEC-WEEK-PLAN-TILT §1): save the class's assignments as a plan, keep the
// plans tidy (rename, remove / reorder items, delete), and send a plan to this class from a start day — each item an
// ordinary assignment with its options.
//
// Sending never duplicates: the items are queued on the plan (per class, each with its own id) when the send begins and
// leave the queue the moment their assignment exists. Whatever is still queued — a failure, a closed panel, a reload in
// the middle — shows on the class card by name, and only those are sent again (or discarded).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Strings } from '../i18n/strings';
import { assignItem, assignOptsFor, classDetail, setAssignOpts, type AssignItem } from '../cloud/teacher';
import { addDays, addPlan, beginSend, defaultPick, deletePlan, dropPlan, DUE_MAX, itemDone, markSentDay, matchMade, moveItem, needsOpts, sameItem, withMade, pendingOf, PLAN_MAX, PLAN_MAX_ITEMS, PLAN_NAME_MAX, planOf, queueOf, removeItem, renamePlan, saveProblem, sendItems, sentOn, type PendingItem, type PlanItem, type SourceAssignment, type WeekPlan } from '../engine/weekPlan';
import { batchBefore, isFlying, noteCreated, queueNow, saveBatch, setFlying, takenIds, updateQueue, useWeekPlanQueue, withSendLock } from '../storage/weekPlanQueue';
import { isPhraseRef } from '../engine/encore/assign';
import { localDay } from '../storage/progress';
import { intlTag } from '../i18n/translate';
import { itemTitle } from './TeacherLoop';
import { Icon } from './icons';
import '../teacher.css';

type Lang = 'he' | 'en';
/** Plans change through an update of the LATEST list (never a copy captured before an await). */
export type PlansUpdate = (f: (list: WeekPlan[]) => WeekPlan[]) => void;

const TX = {
  en: {
    save: 'Save as a weekly plan', send: 'Send a weekly plan', name: 'Plan name', namePh: 'Week 3: ii–V in 4 keys', saveBtn: 'Save', cancel: 'Cancel', loading: 'Loading the options…',
    pick: 'Which assignments (up to 12)', plans: 'Weekly plans', none: 'No plans yet. Assign a week, then save it as a plan.', start: 'Start day',
    full: `You have ${PLAN_MAX} plans, the most there can be. Delete one to save another.`,
    tooBig: 'This plan is too large to keep (long phrases take room). Save fewer phrase assignments in it.', tooBigAll: 'Your plans together are too large to keep. Delete a plan you no longer use, then save.',
    optsFailed: (n: number) => (n === 1 ? 'The options (channel, minutes a day) of 1 assignment were not saved.' : `The options (channel, minutes a day) of ${n} assignments were not saved.`), optsLoadFailed: 'The assignments’ options could not be loaded; the plan will use the default options.',
    preview: 'What goes out', sendBtn: 'Send to the class', sending: 'Sending…', sent: (n: number) => (n === 1 ? 'Sent: 1 assignment.' : `Sent: ${n} assignments.`),
    waitingHead: 'Not sent yet', waitingFrom: (plan: string, d: string) => `${plan} · from ${d}`, retry: 'Send the rest', gonePlan: 'A deleted plan', againWaiting: 'Some of its assignments have not gone out yet: to finish that send, use Send the rest above instead (sending again repeats the ones that went out).', otherSend: 'A send to this class is already running. Wait for it, then try again.', noneOutFresh: 'Nothing went out. Check the connection and try again.', full100: 'The class has the most assignments it can hold (100). Remove old ones, then send the rest.', tooLong: (what: string) => `Too long for the server: ${what}. Discard it, or shorten the phrase and assign it again.`, optsNotSaved: 'options not saved', optsSaved: 'The options are saved.', discard: 'Discard', noneOut: 'Nothing went out. Check the connection and send the rest.',
    again: 'This plan was already sent to this class for that day. Send again?', yes: 'Send again',
    edit: 'Edit', done: 'Done', rename: 'Name', del: 'Delete plan', delAsk: 'Delete this plan? The assignments already sent stay.', delAskWaiting: (n: number) => (n === 1 ? 'Delete this plan? The assignments already sent stay; 1 assignment not sent yet will not be sent.' : `Delete this plan? The assignments already sent stay; ${n} assignments not sent yet will not be sent.`),
    up: 'Up', down: 'Down', remove: 'Remove',
    items: (n: number) => (n === 1 ? '1 assignment' : `${n} assignments`), after: (n: number) => (n === 0 ? 'due the same day' : n === 1 ? 'due in 1 day' : `due in ${n} days`), due: 'due',
    noDemo: 'Recorded demos are not kept in a plan.',
  },
  he: {
    save: 'לשמור כתוכנית שבועית', send: 'לשלוח תוכנית שבועית', name: 'שם התוכנית', namePh: 'שבוע 3: II–V בארבעה סולמות', saveBtn: 'לשמור', cancel: 'ביטול', loading: 'טוען את ההגדרות…',
    pick: 'אילו משימות (עד 12)', plans: 'תוכניות שבועיות', none: 'אין עדיין תוכניות. הטילו משימות לשבוע ושמרו אותן כתוכנית.', start: 'יום התחלה',
    full: `יש לכם ${PLAN_MAX} תוכניות, המקסימום. מחקו אחת כדי לשמור חדשה.`,
    tooBig: 'התוכנית גדולה מדי לשמירה (משפטים ארוכים תופסים מקום). שמרו בה פחות משימות של משפטים.', tooBigAll: 'כל התוכניות יחד גדולות מדי לשמירה. מחקו תוכנית שאתם כבר לא צריכים ואז שמרו.',
    optsFailed: (n: number) => (n === 1 ? 'ההגדרות (ערוץ, דקות ביום) של משימה אחת לא נשמרו.' : `ההגדרות (ערוץ, דקות ביום) של ${n} משימות לא נשמרו.`), optsLoadFailed: 'לא הצלחנו לטעון את הגדרות המשימות; התוכנית תשתמש בהגדרות ברירת המחדל.',
    preview: 'מה יישלח', sendBtn: 'לשלוח לכיתה', sending: 'שולח…', sent: (n: number) => (n === 1 ? 'נשלחה משימה אחת.' : `נשלחו ${n} משימות.`),
    waitingHead: 'עוד לא נשלחו', waitingFrom: (plan: string, d: string) => `${plan} · מ־${d}`, retry: 'לשלוח את השאר', gonePlan: 'תוכנית שנמחקה', againWaiting: 'חלק מהמשימות שלה עוד לא נשלחו: כדי להשלים את השליחה ההיא השתמשו למעלה ב״לשלוח את השאר״ (שליחה חוזרת תכפיל את מה שכבר נשלח).', otherSend: 'שליחה לכיתה הזאת כבר רצה. חכו שתסתיים ונסו שוב.', noneOutFresh: 'שום דבר לא נשלח. בדקו את החיבור ונסו שוב.', full100: 'בכיתה יש כבר את מספר המשימות המרבי (100). הסירו משימות ישנות ואז שלחו את השאר.', tooLong: (what: string) => `ארוך מדי לשרת: ${what}. ותרו עליו, או קצרו את המשפט והטילו אותו שוב.`, optsNotSaved: 'ההגדרות לא נשמרו', optsSaved: 'ההגדרות נשמרו.', discard: 'לוותר', noneOut: 'שום דבר לא נשלח. בדקו את החיבור ושלחו את השאר.',
    again: 'התוכנית הזאת כבר נשלחה לכיתה הזאת לאותו יום. לשלוח שוב?', yes: 'לשלוח שוב',
    edit: 'עריכה', done: 'סיום', rename: 'שם', del: 'למחוק את התוכנית', delAsk: 'למחוק את התוכנית? משימות שכבר נשלחו נשארות.', delAskWaiting: (n: number) => (n === 1 ? 'למחוק את התוכנית? משימות שכבר נשלחו נשארות; משימה אחת שעוד לא נשלחה לא תישלח.' : `למחוק את התוכנית? משימות שכבר נשלחו נשארות; ${n} משימות שעוד לא נשלחו לא יישלחו.`),
    up: 'למעלה', down: 'למטה', remove: 'להסיר',
    items: (n: number) => (n === 1 ? 'משימה אחת' : `${n} משימות`), after: (n: number) => (n === 0 ? 'להגשה באותו יום' : n === 1 ? 'להגשה תוך יום' : `להגשה תוך ${n} ימים`), due: 'הגשה',
    noDemo: 'הקלטות הדגמה לא נשמרות בתוכנית.',
  },
};

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const dateText = (day: string, lang: Lang) => new Date(day + 'T12:00:00').toLocaleDateString(intlTag(lang), { weekday: 'short', day: 'numeric', month: 'short' });
const titleOf = (it: PlanItem, lang: Lang, t: Strings) => itemTitle({ kind: it.kind, lessonId: it.lessonId ?? it.kind, ref: it.ref }, lang, t);

export function WeekPlans({ classId, assignments, plans, onPlans, lang, t, onSent, today = localDay(new Date()) }: { classId: string; /** The class's assignments (the teacher's class detail). */ assignments: AssignItem[] | null; plans: WeekPlan[]; onPlans: PlansUpdate; lang: Lang; t: Strings; onSent: () => void; today?: string }) {
  const tx = TX[lang];
  const [mode, setMode] = useState<null | 'save' | 'send'>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const { queue, flying } = useWeekPlanQueue();
  // a send in flight for this class (it outlives a closed panel or a remounted card): every send button waits for it
  const busy = Object.values(queue).some((byClass) => (byClass[classId] ?? []).some((e) => flying.has(e.pid)));
  const [note, setNote] = useState<{ plan: string; text: string } | null>(null);
  const hooks = (planId: string) => ({
    created: (e: PendingItem, id: string) => {
      noteCreated(id);
      // recorded at once; an item with options stays queued (marked made) until they are saved too
      updateQueue((q) => (needsOpts(e.item) && id ? withMade(q, planId, classId, e.pid, id) : itemDone(q, planId, classId, e.pid)));
      onPlans((list) => markSentDay(list, planId, classId, e.start));
    },
    // sent or discarded meanwhile (another window): skipped
    keep: (e: PendingItem) => pendingOf(queueNow(), planId, classId).some((x) => x.pid === e.pid),
    done: (e: PendingItem) => updateQueue((q) => itemDone(q, planId, classId, e.pid)),
  });
  /** Send entries (queued now, or already waiting): each is recorded the moment its assignment exists. */
  const send = async (planId: string, entries: PendingItem[], fresh: boolean) => {
    if (busy || !entries.length || entries.some((e) => isFlying(e.pid))) return;
    setNote(null);
    const got = await withSendLock(classId, () => sendNow(planId, entries, fresh));
    if (!got) setNote({ plan: planId, text: tx.otherSend });
  };
  const sendNow = async (planId: string, entries0: PendingItem[], fresh: boolean) => {
    // every send first asks the server what the class already has; without that answer nothing is sent
    const made = await classDetail(classId).then((d) => d.assignments, () => null);
    if (!made) {
      setNote({ plan: planId, text: fresh ? tx.noneOutFresh : tx.noneOut });
      return;
    }
    const taken = takenIds();
    const h = hooks(planId);
    const now = () => pendingOf(queueNow(), planId, classId);
    let entries: PendingItem[];
    let known = 0;
    if (fresh) {
      // a whole-plan send for a day that still has items waiting from an earlier try: each waiting item is first checked
      // against the server (an answer lost on the way); a new entry of the same item stands in for it, one for one
      const days = new Set(entries0.map((e) => e.start));
      const prior = now().filter((e) => !e.made && days.has(e.start));
      const found = matchMade(prior, made, taken, batchBefore);
      const batch = newId();
      saveBatch(batch, made.map((a) => a.id));
      const fresh0 = entries0.map((e) => ({ ...e, batch }));
      const resolved = new Set<string>();
      const optsOf: PendingItem[] = [];
      for (const p of prior) {
        const n = fresh0.find((x) => !resolved.has(x.pid) && x.start === p.start && sameItem(x.item, p.item));
        if (!n) continue;
        resolved.add(n.pid);
        const id = found.get(p.pid);
        if (id !== undefined) {
          // it was created after all: the earlier entry is recorded, the new one is not sent again
          known++;
          h.created(p, id);
          resolved.add(`made:${n.pid}`);
          if (needsOpts(p.item) && id) optsOf.push({ ...p, made: id });
        }
      }
      entries = fresh0.filter((x) => !resolved.has(`made:${x.pid}`));
      updateQueue((q) => beginSend(q, planId, classId, entries));
      // the options of an item found on the server are saved in this same run
      entries = [...optsOf, ...entries];
    } else {
      // the queue's current copy of each entry (another window may have recorded it meanwhile)
      entries = entries0.flatMap((e) => now().filter((x) => x.pid === e.pid));
      const found = matchMade(entries, made, taken, batchBefore);
      entries = entries.flatMap((e) => {
        const id = found.get(e.pid);
        if (id === undefined) return [e];
        known++;
        h.created(e, id);
        // its options still have to be saved: it goes on as an entry that only needs them
        return needsOpts(e.item) && id ? [{ ...e, made: id }] : [];
      });
    }
    if (!entries.length) {
      if (known) (setNote({ plan: planId, text: tx.sent(known) }), onSent());
      return;
    }
    const pids = entries.map((e) => e.pid);
    setFlying(pids, true);
    try {
      const r = await sendItems(entries, classId, { assign: assignItem, setOpts: setAssignOpts }, h);
      const n = r.sent.length + known;
      const optsOnly = r.optsFailed.length;
      const optsDone = entries.filter((e) => e.made).length - optsOnly;
      const refusedText = r.refused.some((x) => x.why === 'full') ? tx.full100 : r.refused.length ? tx.tooLong(r.refused.map((x) => titleOf(x.e.item, lang, t)).join(', ')) : '';
      const parts = [n ? tx.sent(n) : '', optsOnly ? tx.optsFailed(optsOnly) : '', !n && optsDone > 0 ? tx.optsSaved : '', refusedText];
      const unrefused = r.failed.length - r.refused.length;
      if (unrefused > 0 && !n && optsDone <= 0) parts.unshift(tx.noneOut);
      setNote({ plan: planId, text: parts.filter(Boolean).join(' ') });
      if (n) onSent();
    } finally {
      setFlying(pids, false);
    }
  };
  // a send that ran on while this card was closed and opened again: refresh the class's list when it ends
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy) onSent();
    wasBusy.current = busy;
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  // every plan with items waiting for this class, a plan deleted meanwhile (on another device) too
  const waitingIds = Object.keys(queue).filter((id) => pendingOf(queue, id, classId).length);
  const nameOf = (id: string) => plans.find((p) => p.id === id)?.name ?? tx.gonePlan;
  return (
    <div className="week-plans" data-week-plans={classId}>
      {waitingIds.length > 0 && (
        <div className="wp-waiting" data-wp-waiting={waitingIds.reduce((n, id) => n + pendingOf(queue, id, classId).length, 0)}>
          <h4>{tx.waitingHead}</h4>
          {waitingIds.map((id) => {
            const items = pendingOf(queue, id, classId);
            const days = [...new Set(items.map((x) => x.start))];
            return (
              <div key={id} className="wp-waiting-plan" data-wp-pending={items.length} data-wp-pending-plan={id}>
                <small>{tx.waitingFrom(nameOf(id), days.map((d) => dateText(d, lang)).join(', '))}</small>
                <ul className="wp-items">
                  {items.map((e) => (
                    <li key={e.pid} data-wp-pending-item={e.pid} data-wp-made={e.made ? '1' : undefined}>
                      <span>
                        {titleOf(e.item, lang, t)}
                        {e.made && <small> · {tx.optsNotSaved}</small>}
                      </span>
                      <button type="button" className="link" disabled={busy || flying.has(e.pid)} onClick={() => updateQueue((q) => itemDone(q, id, classId, e.pid))} data-wp-discard={e.pid}>
                        {tx.discard}
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn primary small" disabled={busy} onClick={() => void send(id, items, false)} data-wp-retry={id}>
                  {busy ? tx.sending : tx.retry}
                </button>
                {note && note.plan === id && (
                  <p className="field-hint" role="status">
                    {note.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="wp-actions">
        <button type="button" className="btn ghost small" disabled={busy || !assignments?.length} onClick={() => setMode(mode === 'save' ? null : 'save')} aria-expanded={mode === 'save'} data-wp-save-open="1">
          {tx.save}
        </button>
        <button type="button" className="btn ghost small" disabled={busy} onClick={() => setMode(mode === 'send' ? null : 'send')} aria-expanded={mode === 'send'} data-wp-send-open="1">
          {tx.send}
        </button>
      </div>
      {mode === 'save' && assignments && (
        <SavePlan assignments={assignments} plans={plans} lang={lang} t={t} onCancel={() => setMode(null)} onSave={(p) => (onPlans((list) => addPlan(list, p)), setSavedId(p.id), setMode('send'))} />
      )}
      {mode === 'send' && (
        <SendPlan classId={classId} plans={plans} first={savedId} onPlans={onPlans} lang={lang} t={t} today={today} busy={busy} note={note} waitingOf={(id) => Object.values(queue[id] ?? {}).flat().filter((e) => !e.made).length} waitingHere={(id) => pendingOf(queue, id, classId).length > 0} onDelete={(id) => updateQueue((q) => dropPlan(q, id))} planFlying={(id) => Object.values(queue[id] ?? {}).flat().some((e) => flying.has(e.pid))} onSend={(p, items, start) => void send(p.id, queueOf(items, start, newId), true)} />
      )}
    </div>
  );
}

function SavePlan({ assignments, plans, lang, t, onSave, onCancel }: { assignments: AssignItem[]; plans: WeekPlan[]; lang: Lang; t: Strings; onSave: (p: WeekPlan) => void; onCancel: () => void }) {
  const tx = TX[lang];
  // in the order the teacher assigned them; the newest 12 checked
  const list = useMemo(() => [...assignments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [assignments]);
  const [on, setOn] = useState<Set<string>>(() => new Set(defaultPick(list).map((a) => a.id)));
  const [name, setName] = useState('');
  const [opts, setOpts] = useState<Record<string, SourceAssignment['opts']> | null>(null);
  const [optsErr, setOptsErr] = useState(false);
  const [problem, setProblem] = useState<'plan' | 'total' | null>(null);
  const full = plans.length >= PLAN_MAX;
  useEffect(() => {
    let live = true;
    void assignOptsFor(list.map((a) => a.id)).then(
      (o) => live && setOpts(o),
      () => live && (setOpts({}), setOptsErr(true)),
    );
    return () => {
      live = false;
    };
  }, [list]);
  const picked = list.filter((a) => on.has(a.id));
  const toggle = (id: string) => {
    const next = new Set(on);
    if (next.has(id)) next.delete(id);
    else if (next.size < PLAN_MAX_ITEMS) next.add(id);
    setOn(next);
  };
  const save = () => {
    if (!opts || full) return;
    const p = planOf(name, picked.map((a) => ({ ...a, opts: opts[a.id] ?? null })), newId(), new Date().toISOString());
    if (!p) return;
    const why = saveProblem(plans, p);
    if (why === 'plan' || why === 'total') return setProblem(why);
    setProblem(null);
    onSave(p);
  };
  const hasDemo = picked.some((a) => isPhraseRef(a.ref) && (a.ref ?? '').includes('"au":'));
  if (full) return <p className="field-hint wp-form" role="status" data-wp-full="1">{tx.full}</p>;
  return (
    <div className="wp-form" data-wp-save="1">
      <label className="wp-field">
        <span>{tx.name}</span>
        <input type="text" value={name} maxLength={PLAN_NAME_MAX} placeholder={tx.namePh} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} data-wp-name="1" />
      </label>
      <fieldset className="wp-pick">
        <legend>{tx.pick}</legend>
        {list.map((a) => (
          <label key={a.id} className="wp-check">
            <input type="checkbox" checked={on.has(a.id)} disabled={!on.has(a.id) && on.size >= PLAN_MAX_ITEMS} onChange={() => toggle(a.id)} data-wp-pick={a.id} />
            <span>{itemTitle(a, lang, t)}</span>
          </label>
        ))}
      </fieldset>
      {!opts ? <small className="field-hint">{tx.loading}</small> : optsErr ? <small className="field-hint" data-wp-opts-load-failed="1">{tx.optsLoadFailed}</small> : hasDemo ? <small className="field-hint">{tx.noDemo}</small> : null}
      {problem && (
        <p className="field-hint" role="status" data-wp-too-big={problem}>
          {problem === 'plan' ? tx.tooBig : tx.tooBigAll}
        </p>
      )}
      <div className="wp-actions">
        <button type="button" className="btn primary small" disabled={!name.trim() || !picked.length || !opts} onClick={save} data-wp-save-go="1">
          {tx.saveBtn}
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          {tx.cancel}
        </button>
      </div>
    </div>
  );
}

function SendPlan({ classId, plans, first, onPlans, lang, t, today, busy, note, waitingOf, waitingHere, onDelete, planFlying, onSend }: { /** A send of this plan (to any class) is running here: it cannot be deleted now. */ planFlying: (planId: string) => boolean; classId: string; plans: WeekPlan[]; first: string | null; onPlans: PlansUpdate; lang: Lang; t: Strings; today: string; busy: boolean; note: { plan: string; text: string } | null; waitingOf: (planId: string) => number; waitingHere: (planId: string) => boolean; onDelete: (planId: string) => void; onSend: (p: WeekPlan, items: PlanItem[], start: string) => void }) {
  const tx = TX[lang];
  const [pick, setPick] = useState<string>(first ?? plans[0]?.id ?? '');
  const [startRaw, setStartRaw] = useState(today);
  const [editing, setEditing] = useState(false);
  const [ask, setAsk] = useState(false);
  const [askDel, setAskDel] = useState(false);
  const plan = plans.find((p) => p.id === pick) ?? plans[0] ?? null;
  useEffect(() => {
    if (plan && plan.id !== pick) setPick(plan.id);
  }, [plan, pick]);
  if (!plan) return <p className="field-hint" data-wp-none="1">{tx.none}</p>;
  // never before today (a panel left open past midnight, or a date typed past the picker's minimum)
  const start = startRaw < today ? today : startRaw;
  const setStart = (v: string) => (setStartRaw(v || today), setAsk(false));
  const go = () => (setAsk(false), onSend(plan, plan.items, start));
  const waitingN = waitingOf(plan.id);
  return (
    <div className="wp-form" data-wp-send="1">
      <h4 id={`wp-plans-${classId}`}>{tx.plans}</h4>
      <div className="wp-list" role="group" aria-labelledby={`wp-plans-${classId}`}>
        {plans.map((p) => (
          <button key={p.id} type="button" aria-pressed={p.id === plan.id} className={`wp-plan ${p.id === plan.id ? 'on' : ''}`} disabled={busy} onClick={() => (setPick(p.id), setEditing(false), setAsk(false), setAskDel(false))} data-wp-plan={p.id}>
            <b>{p.name}</b>
            <small>{tx.items(p.items.length)}</small>
          </button>
        ))}
      </div>
      {editing ? (
        <div className="wp-edit" data-wp-edit={plan.id}>
          <label className="wp-field">
            <span>{tx.rename}</span>
            <input
              key={plan.id}
              type="text"
              defaultValue={plan.name}
              maxLength={PLAN_NAME_MAX}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) onPlans((list) => renamePlan(list, plan.id, v));
                else e.target.value = plan.name;
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              data-wp-rename="1"
            />
          </label>
          <ol className="wp-items">
            {plan.items.map((it, i) => (
              <li key={i} data-wp-item={i}>
                <span>{titleOf(it, lang, t)}</span>
                <small>{tx.after(Math.min(DUE_MAX, it.dueAfter))}</small>
                <span className="wp-item-btns">
                  <button type="button" className="icon-btn small" aria-label={tx.up} disabled={i === 0} onClick={() => onPlans((list) => moveItem(list, plan.id, i, -1))} data-wp-up={i}>
                    <Icon k="up" />
                  </button>
                  <button type="button" className="icon-btn small" aria-label={tx.down} disabled={i === plan.items.length - 1} onClick={() => onPlans((list) => moveItem(list, plan.id, i, 1))} data-wp-down={i}>
                    <Icon k="down" />
                  </button>
                  <button type="button" className="icon-btn small" aria-label={tx.remove} disabled={plan.items.length <= 1} onClick={() => onPlans((list) => removeItem(list, plan.id, i))} data-wp-remove={i}>
                    <Icon k="close" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
          {askDel ? (
            <div className="wp-ask" role="alert">
              <p>{waitingN ? tx.delAskWaiting(waitingN) : tx.delAsk}</p>
              <button type="button" className="btn small danger" disabled={busy} onClick={() => (onPlans((list) => deletePlan(list, plan.id)), onDelete(plan.id), setEditing(false), setAskDel(false))} data-wp-delete-yes="1">
                {tx.del}
              </button>
              <button type="button" className="btn ghost small" onClick={() => setAskDel(false)}>
                {tx.cancel}
              </button>
            </div>
          ) : (
            <div className="wp-actions">
              <button type="button" className="btn primary small" onClick={() => setEditing(false)} data-wp-edit-done="1">
                {tx.done}
              </button>
              <button type="button" className="btn ghost small" disabled={busy || planFlying(plan.id)} onClick={() => setAskDel(true)} data-wp-delete="1">
                {tx.del}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <label className="wp-field wp-start">
            <span>{tx.start}</span>
            <input type="date" value={start} min={today} disabled={busy} onChange={(e) => setStart(e.target.value)} data-wp-start="1" />
          </label>
          <h4>{tx.preview}</h4>
          <ol className="wp-items" data-wp-preview="1">
            {plan.items.map((item, i) => (
              <li key={i}>
                <span>{titleOf(item, lang, t)}</span>
                <small>
                  {tx.due}: {dateText(addDays(start, Math.min(DUE_MAX, Math.max(0, item.dueAfter))), lang)}
                </small>
              </li>
            ))}
          </ol>
          {ask ? (
            <div className="wp-ask" role="alert" data-wp-again="1">
              <p>{tx.again}</p>
              {waitingHere(plan.id) && <p data-wp-again-waiting="1">{tx.againWaiting}</p>}
              <button type="button" className="btn primary small" disabled={busy} onClick={go} data-wp-again-yes="1">
                {tx.yes}
              </button>
              <button type="button" className="btn ghost small" onClick={() => setAsk(false)}>
                {tx.cancel}
              </button>
            </div>
          ) : (
            <div className="wp-actions">
              <button type="button" className="btn primary small" disabled={busy} onClick={() => (sentOn(plan, classId, start) ? setAsk(true) : go())} data-wp-send-go="1">
                {busy ? tx.sending : tx.sendBtn}
              </button>
              <button type="button" className="btn ghost small" disabled={busy} onClick={() => setEditing(true)} data-wp-edit-open="1">
                {tx.edit}
              </button>
            </div>
          )}
          {note && note.plan === plan.id && !waitingHere(plan.id) && (
            <p className="field-hint" role="status" data-wp-result="ok">
              {note.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
