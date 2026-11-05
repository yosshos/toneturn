import { RatingBadge } from './Rating';
import { useCallback, useEffect, useState } from 'react';
import { addFriend, listFriends, myProfile, removeFriend, respondFriend, weeklyBoard, type FriendRow, type MyProfile } from '../cloud/social';
import type { CloudUser } from '../cloud/cloud';
import type { Strings } from '../i18n/strings';
import { AccountCard, type SyncState } from './Account';

export function FriendsScreen({ t, user, sync, onBack }: { t: Strings; user: CloudUser | null; sync: SyncState; onBack: () => void }) {
  const [me, setMe] = useState<MyProfile | null>(null);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await myProfile(null);
      setMe(p);
      setName(p?.display_name ?? user.name ?? '');
      if (p && !p.display_name && user.name) setMe(await myProfile(user.name));
      setRows(await listFriends());
      setErr(null);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const [sortBy, setSortBy] = useState<'xp' | 'rating'>('xp');
  const board = sortBy === 'xp' ? weeklyBoard(rows) : [...weeklyBoard(rows)].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const incoming = rows.filter((r) => r.relation === 'incoming');
  const outgoing = rows.filter((r) => r.relation === 'outgoing');
  const maxWeek = Math.max(1, ...board.map((r) => r.week_xp ?? 0));

  return (
    <main className="panel-screen friends">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.friends}</h1>
      </header>

      {!user ? (
        <>
          <p className="field-hint">{t.friendsHint}</p>
          <AccountCard t={t} user={user} sync={sync} />
        </>
      ) : (
        <>
          {err && <p className="field-hint warn">{err}</p>}

          <section className="set-card code-card">
            <div className="code-row">
              <div>
                <small>{t.yourCode}</small>
                <b className="friend-code" dir="ltr">
                  {me?.friend_code ?? '······'}
                </b>
              </div>
              <button
                className="btn small"
                disabled={!me}
                onClick={async () => {
                  const text = `${t.shareText} ${me?.friend_code}`;
                  try {
                    if (navigator.share) await navigator.share({ text });
                    else await navigator.clipboard.writeText(me?.friend_code ?? '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* cancelled */
                  }
                }}
              >
                {copied ? `✓ ${t.copied}` : t.copy}
              </button>
            </div>
            <form
              className="row"
              onSubmit={async (e) => {
                e.preventDefault();
                setMe(await myProfile(name));
                void load();
              }}
            >
              <label className="grow inline-field">
                <small>{t.nickname}</small>
                <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              </label>
              <button className="btn small" type="submit">
                {t.save}
              </button>
            </form>
          </section>

          <section className="set-card">
            <h2>➕ {t.addFriend}</h2>
            <form
              className="row"
              onSubmit={async (e) => {
                e.preventDefault();
                setMsg(null);
                try {
                  const r = await addFriend(code);
                  setMsg(t.addResult[r]);
                  if (r === 'requested' || r === 'accepted') setCode('');
                  void load();
                } catch (x) {
                  setMsg(String((x as Error).message ?? x));
                }
              }}
            >
              <input
                className="code-input grow"
                dir="ltr"
                value={code}
                maxLength={8}
                placeholder="ABC234"
                aria-label={t.friendCode}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
              <button className="btn primary" type="submit" disabled={code.length < 6}>
                {t.add}
              </button>
            </form>
            {msg && <p className="field-hint">{msg}</p>}
          </section>

          {incoming.length > 0 && (
            <section className="set-card">
              <h2>📨 {t.requests}</h2>
              <ul className="req-list">
                {incoming.map((r) => (
                  <li key={r.user_id}>
                    <b>{r.name}</b>
                    <button className="btn small primary" onClick={() => void respondFriend(r.user_id, true).then(load)}>
                      {t.accept}
                    </button>
                    <button className="btn small" onClick={() => void respondFriend(r.user_id, false).then(load)}>
                      {t.decline}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="set-card">
            <div className="league-head">
              <h2>🏆 {sortBy === 'xp' ? t.thisWeek : t.overallRating}</h2>
              <div className="seg small-seg" role="radiogroup" aria-label={t.sortBy}>
                {(['xp', 'rating'] as const).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={sortBy === k} className={sortBy === k ? 'on' : ''} onClick={() => setSortBy(k)}>
                    {k === 'xp' ? t.xpThisWeek : t.overallRating}
                  </button>
                ))}
              </div>
            </div>
            {board.length <= 1 && <p className="field-hint">{t.noFriends}</p>}
            <ol className="league">
              {board.map((r, i) => (
                <li key={r.user_id} className={r.relation === 'me' ? 'me' : ''}>
                  <span className="rank">{i + 1}</span>
                  <div className="league-main">
                    <div className="league-top">
                      <b>
                        {r.relation === 'me' ? `${r.name} (${t.you})` : r.name} <RatingBadge r={r.rating} provisional={!!r.rating_provisional} t={t} size="sm" />
                      </b>
                      <span className="wk" dir="ltr">
                        {r.week_xp ?? 0} XP
                      </span>
                    </div>
                    <div className="bar" aria-hidden="true">
                      <span style={{ width: `${((r.week_xp ?? 0) / maxWeek) * 100}%` }} />
                    </div>
                    <div className="league-stats">
                      <span title={t.streak}>🔥 {r.streak ?? 0}</span>
                      <span title={t.totalXp}>★ {r.total_xp ?? 0}</span>
                      <span title={t.lessons}>📘 {r.lessons_done ?? 0}</span>
                      <span title={t.echoChain}>🎵 {r.best_melody ?? '–'}</span>
                      <span title={t.beatEcho}>🥁 {r.best_rhythm ?? '–'}</span>
                    </div>
                  </div>
                  {r.relation === 'friend' && (
                    <button
                      className="icon-btn small-x"
                      aria-label={`${t.remove} ${r.name}`}
                      onClick={() => {
                        if (confirm(`${t.remove} ${r.name}?`)) void removeFriend(r.user_id).then(load);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ol>
            <p className="field-hint">🎵🥁 {t.selfReported}</p>
          </section>

          {outgoing.length > 0 && (
            <section className="set-card">
              <h2>⏳ {t.pending}</h2>
              <ul className="req-list">
                {outgoing.map((r) => (
                  <li key={r.user_id}>
                    <b>{r.name}</b>
                    <button className="btn small" onClick={() => void removeFriend(r.user_id).then(load)}>
                      {t.remove}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
