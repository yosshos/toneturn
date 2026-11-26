// The class bell (SPEC-CLASS-NOTIFICATIONS §4.5, owner 2026-11-26: "a push you missed must wait in the app"): a small
// icon button in the top bar with the number of things new from your classes — new assignments and teacher replies
// for a student, submissions waiting for review for a teacher — and a sheet that lists them. Built from the class
// data the app already reads (no inbox table yet): "new" is what this device has not seen (storage/classSeen.ts).

import { useCallback, useEffect, useState } from 'react';
import { myClasses } from '../cloud/classes';
import { classDetail, inboxOf, myAssignments, type AssignItem } from '../cloud/teacher';
import type { CloudUser } from '../cloud/cloud';
import type { Strings } from '../i18n/strings';
import { freshOf, loadSeen, markSeen, setAppBadge } from '../storage/classSeen';
import { Icon } from './icons';
import { itemTitle } from './TeacherLoop';

type Lang = 'he' | 'en';
export interface BellItem {
  key: string;
  kind: 'assign' | 'reply' | 'review';
  title: string;
  sub: string;
  at: string;
  fresh: boolean;
  /** The student's assignment (opens it). */
  a?: AssignItem;
}
export interface ClassInbox {
  /** Signed in and in at least one class (as a student or a teacher): the bell shows. */
  inClass: boolean;
  items: BellItem[];
  /** New for the student + waiting for review for the teacher. */
  count: number;
  reload: () => void;
  /** Everything listed as a student's item is now seen. */
  seen: () => void;
}

const RECENT_DAYS = 14;

export function useClassInbox(user: CloudUser | null, lang: Lang, t: Strings, tick: unknown): ClassInbox {
  const [state, setState] = useState<{ inClass: boolean; items: BellItem[]; mine: AssignItem[] }>({ inClass: false, items: [], mine: [] });
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    if (!user) {
      setState({ inClass: false, items: [], mine: [] });
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const [mine, classes] = await Promise.all([myAssignments().catch(() => [] as AssignItem[]), myClasses().catch(() => null)]);
        const he = lang === 'he';
        const f = freshOf(mine, loadSeen(user.id));
        const since = Date.now() - RECENT_DAYS * 86400000;
        const items: BellItem[] = [];
        for (const a of mine) {
          const reply = a.submissions.find((s) => s.comment || s.mark);
          if (reply)
            items.push({ key: `r:${a.id}`, kind: 'reply', title: he ? 'המורה הגיב על ההגשה שלך' : 'Your teacher replied to your submission', sub: itemTitle(a, lang, t), at: reply.createdAt, fresh: f.replies.has(a.id), a });
          if (Date.parse(a.createdAt) > since || f.assigns.has(a.id))
            items.push({ key: `a:${a.id}`, kind: 'assign', title: he ? 'משימה חדשה מהמורה' : 'A new assignment from your teacher', sub: [itemTitle(a, lang, t), a.className].filter(Boolean).join(' · '), at: a.createdAt, fresh: f.assigns.has(a.id), a });
        }
        // the teacher's side: submissions with no mark or comment yet, per class
        for (const c of classes?.teaching ?? []) {
          const d = await classDetail(c.id).catch(() => null);
          for (const { a, s } of d ? inboxOf(d) : [])
            items.push({ key: `t:${s.id}`, kind: 'review', title: he ? 'הגשה לבדיקה' : 'A submission to review', sub: [s.name, itemTitle(a, lang, t), c.name].filter(Boolean).join(' · '), at: s.createdAt, fresh: true });
        }
        items.sort((x, y) => Number(y.fresh) - Number(x.fresh) || y.at.localeCompare(x.at));
        if (!alive) return;
        const inClass = !!classes && (classes.memberOf.length > 0 || classes.teaching.length > 0);
        setState({ inClass, items: items.slice(0, 30), mine });
        setAppBadge(items.filter((i) => i.fresh).length);
      } catch {
        /* offline: the bell keeps what it had */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, lang, n, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  // back to the app: read again (a push may have arrived while it was in the background)
  useEffect(() => {
    if (!user) return;
    const on = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [user?.id, reload]); // eslint-disable-line react-hooks/exhaustive-deps
  const seen = useCallback(() => {
    if (!user) return;
    markSeen(user.id, state.mine);
    setState((s) => ({ ...s, items: s.items.map((i) => (i.kind === 'review' ? i : { ...i, fresh: false })) }));
    setAppBadge(state.items.filter((i) => i.kind === 'review').length);
  }, [user, state.mine, state.items]);
  return { inClass: state.inClass, items: state.items, count: state.items.filter((i) => i.fresh).length, reload, seen };
}

/** The top bar's bell: shown only to a signed-in member or teacher of a class; the number when something is new. */
export function BellButton({ inbox, lang, onOpen }: { inbox: Pick<ClassInbox, 'inClass' | 'count'>; lang: Lang; onOpen: () => void }) {
  if (!inbox.inClass) return null;
  const he = lang === 'he';
  const label = inbox.count ? (he ? `התראות מהכיתה · ${inbox.count} חדשות` : `Class notifications · ${inbox.count} new`) : he ? 'התראות מהכיתה' : 'Class notifications';
  return (
    <button type="button" className={`icon-btn bell-btn ${inbox.count ? 'has-count' : ''}`} onClick={onOpen} aria-label={label} data-class-bell={inbox.count}>
      <Icon k="bell" size={22} />
      {inbox.count > 0 && (
        <span className="bell-count" aria-hidden="true">
          {inbox.count > 9 ? '9+' : inbox.count}
        </span>
      )}
    </button>
  );
}

const ago = (iso: string, lang: Lang) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  const he = lang === 'he';
  if (m < 60) return he ? `לפני ${Math.max(1, m)} דק׳` : `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return he ? `לפני ${h} שע׳` : `${h} h ago`;
  const d = Math.round(h / 24);
  return he ? (d === 1 ? 'אתמול' : `לפני ${d} ימים`) : d === 1 ? 'yesterday' : `${d} days ago`;
};

/** The bell's sheet: what is new first; a student's item opens its assignment, a teacher's opens the class page.
 *  Closing it marks the student's items seen. */
export function BellSheet({ inbox, lang, onClose, onOpenAssignment, onOpenClasses }: { inbox: ClassInbox; lang: Lang; onClose: () => void; onOpenAssignment: (a: AssignItem) => void; onOpenClasses: () => void }) {
  const he = lang === 'he';
  const close = () => {
    inbox.seen();
    onClose();
  };
  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet bell-sheet" role="dialog" aria-modal="true" aria-labelledby="bell-title" onClick={(e) => e.stopPropagation()} data-bell-sheet="1">
        <header className="ai-head">
          <h2 id="bell-title">{he ? 'מהכיתה' : 'From your classes'}</h2>
          <button className="icon-btn" onClick={close} aria-label={he ? 'סגירה' : 'Close'}>
            <Icon k="close" />
          </button>
        </header>
        {inbox.items.length === 0 ? (
          <p className="field-hint">{he ? 'אין עדכונים מהכיתה כרגע.' : 'Nothing new from your classes.'}</p>
        ) : (
          <ul className="bell-list">
            {inbox.items.map((i) => (
              <li key={i.key} className={i.fresh ? 'fresh' : ''} data-bell-item={i.kind}>
                <button
                  type="button"
                  className="bell-row"
                  onClick={() => {
                    inbox.seen();
                    onClose();
                    if (i.a && i.kind !== 'review' && i.a.kind !== 'piece') onOpenAssignment(i.a);
                    else onOpenClasses();
                  }}
                >
                  <b>{i.title}</b>
                  <small dir="auto">{i.sub}</small>
                  <small className="bell-when">{ago(i.at, lang)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="link bell-all" onClick={() => (inbox.seen(), onClose(), onOpenClasses())}>
          {he ? 'לדף הכיתה' : 'Open the class page'}
        </button>
      </div>
    </div>
  );
}
