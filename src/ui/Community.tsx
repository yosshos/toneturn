// The social round's UI pieces (SPEC-SOCIAL §8, owner OK 2026-11-12): report + block sheet, the blocked list,
// friends' activity with a one-tap cheer, quick messages for duels and rooms, the weekly friend quest, the
// challenge-link sheet and share button, the class board, and the admin report queue. Every piece hides itself when
// the server has no social-round migration yet; young players get no messaging and no feed.

import '../community.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  blockedList,
  blockUser,
  cheer,
  classBoard,
  classSettings,
  createChallenge,
  friendsActivity,
  openReports,
  questAction,
  questView,
  quickList,
  quickSend,
  reportUser,
  resolveReport,
  type ActivityRow,
  type BlockedRow,
  type ClassBoard,
  type OpenedChallenge,
  type OpenReport,
  type QuestView,
  type QuickMsg,
} from '../cloud/community';
import { activityText, canSendQuick, challengeLink, phrasesFor, phraseText, questProgress, REPORT_REASONS, type QuestMetric, type ReportKind } from '../engine/socialRound';

type Lang = 'he' | 'en';
const L = (lang: Lang, en: string, he: string) => (lang === 'he' ? he : en);

function Dots() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

const ago = (iso: string, lang: Lang) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 60) return L(lang, `${Math.max(1, m)} min`, `${Math.max(1, m)} דק׳`);
  const h = Math.round(m / 60);
  if (h < 24) return L(lang, `${h} h`, `${h} שע׳`);
  const d = Math.round(h / 24);
  return L(lang, `${d} d`, `${d} ימים`);
};

// ---------------------------------------------------------------- report + block

/** Report a player (or one quick message) and block them in the same step; or just block. */
export function ReportSheet({ lang, user, msg, onClose, onDone }: { lang: Lang; user: { id: string; name: string }; msg?: { ctx: 'room' | 'duel'; id: number }; onClose: () => void; onDone?: (blocked: boolean) => void }) {
  const [kind, setKind] = useState<ReportKind>(msg ? 'message' : 'nickname');
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    const r = await reportUser(user.id, kind, { block, ctx: msg?.ctx, msg: msg?.id });
    setBusy(false);
    if (r === 'error') return setDone(L(lang, 'Could not send — try again later.', 'לא נשלח — נסו שוב מאוחר יותר.'));
    setDone(r === 'already' ? L(lang, 'You already reported this. Thank you.', 'כבר דיווחתם על זה. תודה.') : L(lang, 'Thank you — we will review it.', 'תודה — נבדוק את זה.'));
    onDone?.(block);
  };
  const blockOnly = async () => {
    setBusy(true);
    const ok = await blockUser(user.id, true);
    setBusy(false);
    setDone(ok ? L(lang, 'Blocked. You will not see each other.', 'נחסם. לא תראו זה את זה.') : L(lang, 'Could not block right now.', 'לא ניתן לחסום כרגע.'));
    if (ok) onDone?.(true);
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet cm-report" role="dialog" aria-modal="true" aria-label={L(lang, 'Report', 'דיווח')} onClick={(e) => e.stopPropagation()} data-report-sheet="1">
        <h2>
          {L(lang, 'Report', 'דיווח על')} <bdi>{user.name}</bdi>
        </h2>
        {done ? (
          <>
            <p>{done}</p>
            <button className="btn primary" onClick={onClose}>
              {L(lang, 'Close', 'סגירה')}
            </button>
          </>
        ) : (
          <>
            <div className="cm-reasons" role="radiogroup" aria-label={L(lang, 'Reason', 'סיבה')}>
              {REPORT_REASONS.filter((r) => (msg ? r.id === 'message' || r.id === 'young' || r.id === 'other' : r.id !== 'message')).map((r) => (
                <button key={r.id} type="button" role="radio" aria-checked={kind === r.id} className={`chip ${kind === r.id ? 'on' : ''}`} onClick={() => setKind(r.id)} data-reason={r.id}>
                  {r[lang]}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} data-report-block="1" />
              <span>{L(lang, 'Also block (you disappear from each other)', 'גם לחסום (תיעלמו זה לזה)')}</span>
            </label>
            <div className="cm-row">
              <button className="btn primary" disabled={busy} onClick={() => void send()} data-report-send="1">
                {L(lang, 'Send report', 'שליחת דיווח')}
              </button>
              <button className="btn ghost" disabled={busy} onClick={() => void blockOnly()} data-block-only="1">
                {L(lang, 'Block only', 'רק לחסום')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** A small "⋯" button next to a player that opens the report / block sheet. */
export function PlayerSafety({ lang, user, msg, onBlocked }: { lang: Lang; user: { id: string; name: string }; msg?: { ctx: 'room' | 'duel'; id: number }; onBlocked?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn cm-more" aria-label={`${L(lang, 'Report or block', 'דיווח או חסימה')} ${user.name}`} onClick={() => setOpen(true)} data-safety={user.id}>
        <Dots />
      </button>
      {open && <ReportSheet lang={lang} user={user} msg={msg} onClose={() => setOpen(false)} onDone={(b) => b && onBlocked?.()} />}
    </>
  );
}

/** Settings → Privacy → Blocked: the list with Unblock (hidden text when the server can't list blocks yet). */
export function BlockedList({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const [rows, setRows] = useState<BlockedRow[] | null>(null);
  const load = useCallback(() => void blockedList().then(setRows), []);
  useEffect(() => {
    if (signedIn) load();
  }, [signedIn, load]);
  if (!signedIn || rows === null || rows.length === 0)
    return <p className="field-hint">{L(lang, 'No one is blocked. You can block from any player menu — it hides you from each other completely.', 'אין חסומים. אפשר לחסום מתפריט של כל שחקן, וזה מסתיר אתכם זה מזה לגמרי.')}</p>;
  return (
    <ul className="cm-blocked" data-blocked-list={rows.length}>
      {rows.map((r) => (
        <li key={r.user_id}>
          <bdi>{r.name}</bdi>
          <button className="btn small ghost" onClick={() => void blockUser(r.user_id, false).then(load)} data-unblock={r.user_id}>
            {L(lang, 'Unblock', 'ביטול חסימה')}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- friends' activity

/** Friends' measured milestones (automatic posts) with one-tap cheers. Hidden for young players. */
export function ActivityFeed({ lang, young, myId, onBlocked }: { lang: Lang; young: boolean; myId?: string; onBlocked?: () => void }) {
  const [rows, setRows] = useState<ActivityRow[] | null | 'loading'>('loading');
  const load = useCallback(() => void friendsActivity().then(setRows), []);
  useEffect(() => {
    if (!young) load();
  }, [young, load]);
  if (young) return <p className="field-hint cm-empty">{L(lang, "Friends' activity is off in young-player mode.", 'פעילות החברים כבויה במצב צעירים.')}</p>;
  if (rows === 'loading') return <p className="field-hint">{L(lang, 'Loading…', 'טוען…')}</p>;
  if (rows === null) return <p className="field-hint cm-empty">{L(lang, "Friends' activity will appear here soon.", 'פעילות החברים תופיע כאן בקרוב.')}</p>;
  if (!rows.length) return <p className="field-hint cm-empty">{L(lang, 'No news yet. Levels, ranks, standards and streaks you and your friends reach show up here.', 'עוד אין חדשות. רמות, דרגות, סטנדרטים ורצפים שלכם ושל החברים יופיעו כאן.')}</p>;
  return (
    <ul className="cm-feed" data-feed={rows.length}>
      {rows.slice(0, 7).map((r) => {
        const text = activityText(r.kind, r.payload, lang);
        if (!text) return null;
        const own = r.user_id === myId;
        return (
          <li key={r.id}>
            <span className="cm-av" aria-hidden="true" style={r.avatar_color ? { background: r.avatar_color } : undefined}>
              {(r.nickname[0] ?? '?').toUpperCase()}
            </span>
            <span className="cm-feed-main">
              <span>
                <b>
                  <bdi>{own ? L(lang, 'You', 'אתם') : r.nickname}</bdi>
                </b>{' '}
                {text}
              </span>
              <small>{ago(r.created_at, lang)}</small>
            </span>
            {own ? (
              <small className="cm-cheers" dir="ltr">
                {r.cheers > 0 ? `${r.cheers} ${L(lang, 'cheers', 'מחיאות')}` : ''}
              </small>
            ) : (
              <>
                <button
                  className={`btn small cm-cheer ${r.mine ? 'on' : ''}`}
                  disabled={r.mine}
                  onClick={() =>
                    void cheer(r.id).then((ok) => ok && setRows((rs) => (Array.isArray(rs) ? rs.map((x) => (x.id === r.id ? { ...x, mine: true, cheers: x.cheers + 1 } : x)) : rs)))
                  }
                  aria-pressed={r.mine}
                  data-cheer={r.id}
                >
                  {L(lang, 'Bravo', 'כל הכבוד')}
                  {r.cheers > 0 && <span dir="ltr"> {r.cheers}</span>}
                </button>
                <PlayerSafety lang={lang} user={{ id: r.user_id, name: r.nickname }} onBlocked={() => (load(), onBlocked?.())} />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- weekly friend quest

const METRIC_NAME: Record<QuestMetric, { en: string; he: string }> = {
  minutes: { en: 'minutes together', he: 'דקות ביחד' },
  clean: { en: 'clean answers together', he: 'תשובות נקיות ביחד' },
};

/** This week's co-op goal with one friend: measured minutes or clean (first-try) answers, both contributions. */
export function FriendQuest({ lang, friends, onDone }: { lang: Lang; friends: { id: string; name: string }[]; onDone?: (q: QuestView) => void }) {
  const [q, setQ] = useState<QuestView | null | 'missing' | 'loading'>('loading');
  const [pick, setPick] = useState('');
  const [metric, setMetric] = useState<QuestMetric>('minutes');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const load = useCallback(() => void questView().then(setQ), []);
  useEffect(load, [load]);
  const p = q && typeof q === 'object' ? questProgress(q.mine, q.theirs, q.target) : null;
  const doneRef = useRef(false);
  useEffect(() => {
    if (q && typeof q === 'object' && q.status === 'active' && p?.done && !doneRef.current) {
      doneRef.current = true;
      onDone?.(q);
    }
  }, [q, p?.done, onDone]);
  if (q === 'missing' || q === 'loading') return null;
  if (!q && !friends.length) return null;
  const act = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    setErr(!ok);
    load();
  };
  return (
    <section className="set-card cm-quest" data-quest={q ? q.status : 'none'}>
      <div className="cm-head">
        <h2>{L(lang, 'Friend quest', 'משימה משותפת')}</h2>
        <small className="field-hint">{L(lang, 'This week, together', 'השבוע, ביחד')}</small>
      </div>
      {q ? (
        <>
          <p className="cm-quest-line">
            <bdi>{q.name}</bdi> · <span dir="ltr">{Math.min(p!.total, q.target)}/{q.target}</span> {METRIC_NAME[q.metric][lang]}
          </p>
          <span className="cm-bar" aria-hidden="true">
            <span className="mine" style={{ width: `${p!.mineShare * 100}%` }} />
            <span className="theirs" style={{ width: `${Math.max(0, p!.ratio - p!.mineShare) * 100}%` }} />
          </span>
          {q.status === 'pending' ? (
            q.invited_by_me ? (
              <small className="field-hint">{L(lang, 'Invited — waiting for them', 'הוזמן — מחכים לאישור')}</small>
            ) : (
              <div className="cm-row">
                <button className="btn small primary" disabled={busy} onClick={() => void act(() => questAction(q.friend, 'accept'))} data-quest-accept="1">
                  {L(lang, 'Accept', 'לאשר')}
                </button>
                <button className="btn small ghost" disabled={busy} onClick={() => void act(() => questAction(q.friend, 'decline'))}>
                  {L(lang, 'Decline', 'לדחות')}
                </button>
              </div>
            )
          ) : p!.done ? (
            <small className="field-hint cm-ok">{L(lang, 'Quest complete — well played together.', 'המשימה הושלמה — כל הכבוד לשניכם.')}</small>
          ) : (
            <small className="field-hint">
              {L(lang, 'You', 'אתם')} <span dir="ltr">{q.mine}</span> · <bdi>{q.name}</bdi> <span dir="ltr">{q.theirs}</span>
            </small>
          )}
        </>
      ) : (
        <div className="cm-quest-new">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={L(lang, 'Choose a friend', 'בחרו חבר')} data-quest-pick="1">
            <option value="">{L(lang, 'Choose a friend…', 'בחרו חבר…')}</option>
            {friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <div className="seg small" role="radiogroup" aria-label={L(lang, 'Goal', 'יעד')}>
            {(['minutes', 'clean'] as QuestMetric[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={metric === m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
                {m === 'minutes' ? L(lang, '60 min', '60 דק׳') : L(lang, '150 clean', '150 נקיות')}
              </button>
            ))}
          </div>
          <button className="btn small primary" disabled={!pick || busy} onClick={() => void act(() => questAction(pick, 'invite', metric))} data-quest-invite="1">
            {L(lang, 'Invite', 'להזמין')}
          </button>
        </div>
      )}
      {err && <small className="field-hint ch-err">{L(lang, 'Could not do that right now.', 'לא ניתן כרגע.')}</small>}
    </section>
  );
}

// ---------------------------------------------------------------- quick messages (duels, rooms)

/** Preset phrases only (no free text); the receiver's setting decides what they see. Polls every 4 s while shown. */
export function QuickMessages({ lang, ctx, id, stage, canMessage, compact }: { lang: Lang; ctx: 'room' | 'duel'; id: string; stage: 'before' | 'after'; canMessage: boolean; compact?: boolean }) {
  const [msgs, setMsgs] = useState<QuickMsg[] | null>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [last, setLast] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [report, setReport] = useState<QuickMsg | null>(null);
  useEffect(() => {
    if (!canMessage) return;
    let live = true;
    const tick = () => void quickList(ctx, id).then((r) => live && setMsgs(r));
    tick();
    const t = window.setInterval(tick, 4000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [ctx, id, canMessage]);
  if (!canMessage || msgs === null) return null;
  const send = async (p: ReturnType<typeof phrasesFor>[number]) => {
    if (!canSendQuick(last, Date.now())) return;
    setLast(Date.now());
    const r = await quickSend(ctx, id, p);
    if (r === 'off') setNote(L(lang, 'Quick messages are off in your privacy settings.', 'הודעות מהירות כבויות בהגדרות הפרטיות.'));
    else if (r === 'ok') void quickList(ctx, id).then((x) => x && setMsgs(x));
  };
  const shown = msgs.filter((m) => !hidden.has(m.id)).slice(0, compact ? 2 : 3);
  return (
    <div className={`cm-quick ${compact ? 'compact' : ''}`} data-quick={ctx}>
      {shown.length > 0 && (
        <ul className="cm-quick-log">
          {shown.map((m) => (
            <li key={m.id} className={m.mine ? 'mine' : ''}>
              <b>
                <bdi>{m.mine ? L(lang, 'You', 'אתם') : m.name}</bdi>
              </b>
              <span>{phraseText(m.phrase, lang)}</span>
              {!m.mine && (
                <button type="button" className="icon-btn cm-more" aria-label={L(lang, 'Report message', 'דיווח על ההודעה')} onClick={() => setReport(m)} data-quick-report={m.id}>
                  <Dots />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="cm-phrases" role="group" aria-label={L(lang, 'Quick messages', 'הודעות מהירות')}>
        {phrasesFor(stage).map((p) => (
          <button key={p} type="button" className="chip" onClick={() => void send(p)} disabled={!canSendQuick(last, Date.now())} data-phrase={p}>
            {phraseText(p, lang)}
          </button>
        ))}
      </div>
      {note && <small className="field-hint">{note}</small>}
      {report && (
        <ReportSheet
          lang={lang}
          user={{ id: report.from_user, name: report.name }}
          msg={{ ctx, id: report.id }}
          onClose={() => setReport(null)}
          onDone={() => setHidden((h) => new Set([...h, report.id]))}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- challenge links

async function shareLink(text: string, url: string): Promise<boolean> {
  try {
    if (navigator.share) await navigator.share({ text, url });
    else await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  } catch {
    return false;
  }
}
const appLink = (code: string) => challengeLink(location.origin, location.pathname, code);

/** "Beat my score": a link with an opaque code for this game, tier and score (adults only — no outside sharing for young players). */
export function BeatMyScoreButton({ lang, game, tier, score, gameTitle, canShare }: { lang: Lang; game: string; tier: number; score: number; gameTitle: string; canShare: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  if (!canShare || !(score > 0)) return null;
  const go = async () => {
    setState('busy');
    const code = await createChallenge({ kind: 'beat', game, tier, score });
    if (!code) return setState('error');
    const ok = await shareLink(L(lang, `Can you beat my ${score.toLocaleString()} in ${gameTitle}? The 7th Sense:`, `תצליחו לעבור את ה־${score.toLocaleString()} שלי ב${gameTitle}? החוש השביעי:`), appLink(code));
    setState(ok ? 'done' : 'idle');
  };
  return (
    <button className="btn small cm-beat" disabled={state === 'busy'} onClick={() => void go()} data-beat-link="1">
      {state === 'done' ? L(lang, 'Link ready ✓', 'הקישור מוכן ✓') : state === 'error' ? L(lang, 'Not available yet', 'עוד לא זמין') : L(lang, 'Challenge a friend', 'לאתגר חבר')}
    </button>
  );
}

/** A duel invite by link: the set (kind, seed, answer key) is fixed now; whoever opens it plays the same items. */
export function DuelLinkButton({ lang, make, canShare }: { lang: Lang; make: () => { duelKind: string; seed: number; keys: string[] }; canShare: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  if (!canShare) return null;
  const go = async () => {
    setState('busy');
    const code = await createChallenge({ kind: 'duel', ...make() });
    if (!code) return setState('error');
    const ok = await shareLink(L(lang, 'A duel on The 7th Sense — same questions for both of us:', 'דו־קרב בחוש השביעי — אותן שאלות לשנינו:'), appLink(code));
    setState(ok ? 'done' : 'idle');
  };
  return (
    <button className="btn small ghost" disabled={state === 'busy'} onClick={() => void go()} data-duel-link="1">
      {state === 'done' ? L(lang, 'Link ready ✓', 'הקישור מוכן ✓') : state === 'error' ? L(lang, 'Not available yet', 'עוד לא זמין') : L(lang, 'Invite by link', 'הזמנה בקישור')}
    </button>
  );
}

/** What an opened link offers: play the same game / tier (or the duel), and the sender as a friend request. */
export function ChallengeSheet({ lang, ch, gameTitle, tierName, signedIn, onPlay, onFriends, onSignIn, onClose }: { lang: Lang; ch: OpenedChallenge | 'missing' | null | 'signin'; gameTitle?: string; tierName?: string; signedIn: boolean; onPlay: () => void; onFriends: () => void; onSignIn: () => void; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet cm-challenge" role="dialog" aria-modal="true" aria-label={L(lang, 'Challenge', 'אתגר')} onClick={(e) => e.stopPropagation()} data-challenge-sheet="1">
        {ch === 'signin' || !signedIn ? (
          <>
            <h2>{L(lang, 'A challenge is waiting', 'מחכה לכם אתגר')}</h2>
            <p>{L(lang, 'Sign in to accept it — the link stays here until you do.', 'התחברו כדי לקבל אותו — הקישור יחכה כאן עד אז.')}</p>
            <div className="cm-row">
              <button className="btn primary" onClick={onSignIn}>
                {L(lang, 'Sign in', 'התחברות')}
              </button>
              <button className="btn ghost" onClick={onClose}>
                {L(lang, 'Later', 'אחר כך')}
              </button>
            </div>
          </>
        ) : ch === null || ch === 'missing' ? (
          <>
            <h2>{L(lang, 'This link has expired', 'הקישור כבר לא בתוקף')}</h2>
            <p>{L(lang, 'Ask your friend for a new one.', 'בקשו מהחבר קישור חדש.')}</p>
            <button className="btn primary" onClick={onClose}>
              {L(lang, 'Close', 'סגירה')}
            </button>
          </>
        ) : ch.self ? (
          <>
            <h2>{L(lang, 'Your own challenge', 'האתגר שלכם')}</h2>
            <p>{L(lang, 'Send this link to a friend — they play the same game at the same level.', 'שלחו את הקישור לחבר — הוא ישחק באותו משחק ובאותה רמה.')}</p>
            <button className="btn primary" onClick={onClose}>
              {L(lang, 'Close', 'סגירה')}
            </button>
          </>
        ) : (
          <>
            <h2>
              <bdi>{ch.from}</bdi> {ch.kind === 'duel' ? L(lang, 'invites you to a duel', 'מזמין אתכם לדו־קרב') : L(lang, 'challenges you', 'מאתגר אתכם')}
            </h2>
            {ch.kind === 'beat' ? (
              <p>
                {gameTitle ?? ch.game} {tierName && <i className="dyn">{tierName}</i>} · {L(lang, 'score to beat', 'הניקוד לעבור')} <b dir="ltr">{(ch.score ?? 0).toLocaleString()}</b>
              </p>
            ) : (
              <p>{L(lang, 'Same questions for both of you. The duel is in Community → Duels.', 'אותן שאלות לשניכם. הדו־קרב מחכה בקהילה ← דו־קרבות.')}</p>
            )}
            {ch.friend === 'requested' && <small className="field-hint">{L(lang, 'A friend request from them is in Community.', 'בקשת חברות מהם מחכה בקהילה.')}</small>}
            <div className="cm-row">
              <button className="btn primary" onClick={onPlay} data-challenge-play="1">
                {L(lang, 'Play', 'לשחק')}
              </button>
              {ch.friend === 'requested' && (
                <button className="btn ghost" onClick={onFriends}>
                  {L(lang, 'Friend request', 'בקשת החברות')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- class board & goal

/** The class board this week (measured minutes, clean answers, days) and the class goal; teacher controls. */
export function ClassBoardCard({ lang, classId, teacher }: { lang: Lang; classId: string; teacher: boolean }) {
  const [b, setB] = useState<ClassBoard | null | 'loading'>('loading');
  const [metric, setMetric] = useState<QuestMetric>('minutes');
  const [target, setTarget] = useState('');
  const load = useCallback(() => void classBoard(classId).then(setB), [classId]);
  useEffect(load, [load]);
  if (b === 'loading' || b === null) return null;
  const goal = b.goal;
  const ratio = goal ? Math.min(1, goal.progress / Math.max(1, goal.target)) : 0;
  return (
    <div className="cm-class" data-class-board={classId}>
      <h3>{L(lang, 'This week', 'השבוע')}</h3>
      {goal ? (
        <div className="cm-goal">
          <span>
            {L(lang, 'Class goal', 'יעד הכיתה')}: <span dir="ltr">{Math.min(goal.progress, goal.target)}/{goal.target}</span> {goal.metric === 'minutes' ? L(lang, 'minutes', 'דקות') : L(lang, 'clean answers', 'תשובות נקיות')}
          </span>
          <span className="cm-bar" aria-hidden="true">
            <span className="mine" style={{ width: `${ratio * 100}%` }} />
          </span>
        </div>
      ) : teacher ? null : (
        <small className="field-hint">{L(lang, 'No class goal this week.', 'אין יעד כיתתי השבוע.')}</small>
      )}
      {b.hidden && !teacher && <small className="field-hint">{L(lang, 'Your teacher keeps the board private. Your own week:', 'המורה שומר/ת את הלוח פרטי. השבוע שלכם:')}</small>}
      {b.rows.length > 0 && (
        <ol className="cm-class-rows">
          {b.rows.slice(0, teacher ? 8 : 5).map((r, i) => (
            <li key={`${r.name}-${i}`} className={r.me ? 'me' : ''}>
              <bdi>{r.name}</bdi>
              <span dir="ltr">
                {r.minutes}′ · {r.clean} · {r.days}d
              </span>
            </li>
          ))}
        </ol>
      )}
      {teacher && (
        <div className="cm-class-teacher">
          <label className="toggle-row">
            <input type="checkbox" checked={!b.hidden} onChange={(e) => void classSettings(classId, { hidden: !e.target.checked }).then(load)} data-class-board-show="1" />
            <span>{L(lang, 'Students see the class board', 'התלמידים רואים את לוח הכיתה')}</span>
          </label>
          <div className="cm-row">
            <select value={metric} onChange={(e) => setMetric(e.target.value as QuestMetric)} aria-label={L(lang, 'Goal type', 'סוג יעד')}>
              <option value="minutes">{L(lang, 'Minutes', 'דקות')}</option>
              <option value="clean">{L(lang, 'Clean answers', 'תשובות נקיות')}</option>
            </select>
            <input className="cm-num" type="number" min={0} inputMode="numeric" value={target} placeholder={goal ? String(goal.target) : '300'} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} aria-label={L(lang, 'Class goal', 'יעד הכיתה')} dir="ltr" />
            <button className="btn small" disabled={target === ''} onClick={() => void classSettings(classId, { metric, target: Number(target) }).then(() => (setTarget(''), load()))} data-class-goal-set="1">
              {Number(target) === 0 && target !== '' ? L(lang, 'Remove goal', 'הסרת יעד') : L(lang, 'Set goal', 'קביעת יעד')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- admin: open reports

const ACTION_TEXT: Record<string, { en: string; he: string }> = {
  'auto:nickname-reset': { en: 'nickname reset automatically', he: 'הכינוי אופס אוטומטית' },
  'auto:photo-held': { en: 'photo hidden automatically', he: 'התמונה הוסתרה אוטומטית' },
  'auto:message-hidden': { en: 'message hidden automatically', he: 'ההודעה הוסתרה אוטומטית' },
};

export function ReportsAdmin({ lang }: { lang: Lang }) {
  const [rows, setRows] = useState<OpenReport[] | null | 'loading'>('loading');
  const load = useCallback(() => void openReports().then(setRows), []);
  useEffect(load, [load]);
  return (
    <section className="set-card cm-admin" data-admin-reports="1">
      <h2>{L(lang, 'Open reports', 'דיווחים פתוחים')}</h2>
      {rows === 'loading' ? (
        <p className="field-hint">{L(lang, 'Loading…', 'טוען…')}</p>
      ) : rows === null ? (
        <p className="field-hint">{L(lang, 'Reports need the social-round migration on the server.', 'הדיווחים דורשים את עדכון השרת של הסבב החברתי.')}</p>
      ) : rows.length === 0 ? (
        <p className="field-hint">{L(lang, 'No open reports.', 'אין דיווחים פתוחים.')}</p>
      ) : (
        <ul className="cm-reports">
          {rows.map((r) => (
            <li key={r.id} data-report={r.id}>
              <span className="cm-rep-main">
                <b>
                  <bdi>{r.reported_name}</bdi>
                </b>{' '}
                · {REPORT_REASONS.find((x) => x.id === r.kind)?.[lang] ?? r.kind}
                {r.reporters > 1 && <span dir="ltr"> ×{r.reporters}</span>}
                {r.phrase && <> · “{phraseText(r.phrase, lang)}”</>}
                <small>
                  {L(lang, 'by', 'מאת')} <bdi>{r.reporter_name}</bdi> · {ago(r.created_at, lang)}
                  {r.action && ACTION_TEXT[r.action] ? ` · ${ACTION_TEXT[r.action][lang]}` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                </small>
              </span>
              <span className="cm-row">
                <button className="btn small primary" onClick={() => void resolveReport(r.id, 'uphold').then(load)} data-uphold={r.id}>
                  {L(lang, 'Uphold', 'לאשר')}
                </button>
                <button className="btn small ghost" onClick={() => void resolveReport(r.id, 'dismiss').then(load)} data-dismiss={r.id}>
                  {L(lang, 'Dismiss', 'לדחות')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
