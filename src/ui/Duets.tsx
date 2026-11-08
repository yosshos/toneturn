// Duet streaks (SPEC-SOCIAL §3, owner OK 2026-11-08): a streak kept together with a friend — a day counts only when
// both practised. Shown at the top of Community → Friends: up to five duets with today's status for both, invites to
// accept, a nudge when the partner has not practised yet, and "start a duet" with a friend.

import { useCallback, useEffect, useState } from 'react';
import { duetAction, listDuets, nudge, type DuetRow, type FriendRow } from '../cloud/social';

const TX = {
  en: { title: 'Duet streaks', hint: 'A day counts when you both practise.', start: 'Start a duet', pick: 'Choose a friend', invite: 'Invite', accept: 'Accept', waiting: 'Invited — waiting', nudge: 'Nudge', nudged: 'Nudged ✓', end: 'End duet', endQ: 'End the duet with', both: 'Both practised today', you: 'You practised — waiting for them', them: 'They practised — your turn', none: 'Nobody yet today', days: 'days', max: 'Up to 5 duets', invitedYou: 'invited you', error: 'Could not do that right now.' },
  he: { title: 'רצף בזוגות', hint: 'יום נספר כששניכם מתאמנים.', start: 'להתחיל רצף זוגי', pick: 'בחרו חבר', invite: 'להזמין', accept: 'לאשר', waiting: 'הוזמן — ממתינים', nudge: 'תזכורת', nudged: 'נשלחה ✓', end: 'לסיים', endQ: 'לסיים את הרצף עם', both: 'שניכם התאמנתם היום', you: 'התאמנתם — מחכים לחבר', them: 'החבר התאמן — תורכם', none: 'אף אחד עוד לא היום', days: 'ימים', max: 'עד 5 רצפים', invitedYou: 'הזמין אתכם', error: 'לא ניתן כרגע.' },
};

export function DuetsStrip({ lang, friends }: { lang: 'en' | 'he'; friends: FriendRow[] }) {
  const tx = TX[lang];
  const [duets, setDuets] = useState<DuetRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const load = useCallback(async () => {
    try {
      setDuets(await listDuets());
    } catch {
      setDuets([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await load();
    } catch {
      setMsg(tx.error);
    } finally {
      setBusy(false);
    }
  };
  if (!duets) return null;
  const live = duets.filter((d) => !d.expired);
  const inDuet = new Set(live.map((d) => d.friend));
  const free = friends.filter((f) => f.relation === 'friend' && !inDuet.has(f.user_id));
  if (!live.length && !free.length) return null;
  const state = (d: DuetRow) => (d.me_today && d.them_today ? 'both' : d.me_today ? 'you' : d.them_today ? 'them' : 'none');
  const cur = live.find((d) => d.friend === open) ?? null;
  return (
    <section className="set-card duets" data-duets="1">
      <div className="duets-head">
        <h2>{tx.title}</h2>
        <small className="field-hint">{tx.hint}</small>
      </div>
      {live.length > 0 && (
        <ul className="duet-row">
          {live.map((d) => {
            const st = state(d);
            return (
              <li key={d.friend}>
                <button className={`duet ${d.status} st-${st} ${open === d.friend ? 'on' : ''}`} onClick={() => setOpen(open === d.friend ? null : d.friend)} data-duet={d.status} aria-label={`${d.name}: ${d.status === 'active' ? `${d.streak} ${tx.days}, ${tx[st]}` : d.invited_by_me ? tx.waiting : tx.invitedYou}`}>
                  <span className="duet-flames" aria-hidden="true">
                    <i className={d.me_today ? 'lit' : ''}>🔥</i>
                    <i className={d.them_today ? 'lit' : ''}>🔥</i>
                  </span>
                  <b dir="ltr">{d.status === 'active' ? d.streak : '…'}</b>
                  <small dir="auto">{d.name}</small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {cur && (
        <div className="duet-card" data-duet-card={cur.friend}>
          {cur.status === 'pending' ? (
            cur.invited_by_me ? (
              <p className="field-hint">{tx.waiting}</p>
            ) : (
              <button className="btn" disabled={busy} onClick={() => void act(() => duetAction(cur.friend, 'accept'))} data-duet-accept="1">
                {tx.accept}
              </button>
            )
          ) : (
            <>
              <p>
                {tx[state(cur)]} · <b dir="ltr">{cur.streak}</b> {tx.days}
                {cur.best > cur.streak ? <small dir="ltr"> (best {cur.best})</small> : null}
              </p>
              {!cur.them_today && (
                <button
                  className="btn ghost small"
                  disabled={busy || nudged[cur.friend]}
                  onClick={() =>
                    void (async () => {
                      const r = await nudge(cur.friend, 'duet');
                      setNudged({ ...nudged, [cur.friend]: r === 'ok' || r === 'done' });
                      if (r === 'error' || r === 'off') setMsg(tx.error);
                    })()
                  }
                  data-duet-nudge="1"
                >
                  {nudged[cur.friend] ? tx.nudged : tx.nudge}
                </button>
              )}
            </>
          )}
          <button className="btn ghost small" disabled={busy} onClick={() => confirm(`${tx.endQ} ${cur.name}?`) && void act(() => duetAction(cur.friend, 'end').then(() => setOpen(null)))}>
            {tx.end}
          </button>
        </div>
      )}
      {free.length > 0 && live.length < 5 && (
        <div className="duet-start">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={tx.pick} data-duet-pick="1">
            <option value="">{tx.start}…</option>
            {free.map((f) => (
              <option key={f.user_id} value={f.user_id}>
                {f.name}
              </option>
            ))}
          </select>
          <button className="btn small" disabled={!pick || busy} onClick={() => void act(() => duetAction(pick, 'invite').then(() => setPick('')))} data-duet-invite="1">
            {tx.invite}
          </button>
        </div>
      )}
      {live.length >= 5 && <small className="field-hint">{tx.max}</small>}
      {msg && <small className="field-hint ch-err">{msg}</small>}
    </section>
  );
}
