import { DuelsSection, LeagueCard } from './Compete';
import { DuetsStrip } from './Duets';
import type { Settings } from '../storage/progress';
import { RatingBadge } from './Rating';
import { useCallback, useEffect, useState } from 'react';
import { addFriend, avatarUrl, listFriends, myProfile, removeFriend, respondFriend, weeklyBoard, type FriendRow, type MyProfile } from '../cloud/social';
import type { CloudUser } from '../cloud/cloud';
import type { Strings } from '../i18n/strings';
import { AccountCard, type SyncState } from './Account';
import { CompareSheet, FriendsBoard, type FriendStats } from './Compare';
import { Avatar } from './Profile';
import { ratingsOf, type Progress } from '../storage/progress';
import { courseOf, type CourseId } from '../engine/courses';
import { courseLevel, friendsInCourse, type DynName } from '../engine/courseSocial';
import { Glyph } from './Glyph';

export function FriendsScreen({ t, user: realUser, sync, onBack, settings, onBestTier, onLeagueSeen, progress, streak = 0, classes, profileErr }: { profileErr?: string | null; classes?: React.ReactNode; t: Strings; user: CloudUser | null; sync: SyncState; onBack: () => void; settings: Settings; onBestTier?: (tier: number) => void; onLeagueSeen?: (tier: number) => void; progress?: Progress; streak?: number }) {
  // Dev-only layout preview with made-up friends (?demoFriends): never in a production build.
  const user = realUser ?? (import.meta.env.DEV && DEMO ? DEMO_USER : null);
  const [duelPlaying, setDuelPlaying] = useState(false);
  const [cmp, setCmp] = useState<FriendStats | null>(null);
  const [me, setMe] = useState<MyProfile | null>(null);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    if (import.meta.env.DEV && DEMO && !realUser) {
      setMe({ friend_code: 'K7Q2MX', display_name: settings.nickname ?? 'DorianShredder11', tz: 'UTC', reminder_hour: 19 });
      setName(settings.nickname ?? 'DorianShredder11');
      setRows(demoRows());
      return;
    }
    try {
      const p = await myProfile(null);
      setMe(p);
      // The nickname (not the Google name) is what friends see (SPEC-SOCIAL §1).
      const want = settings.nickname ?? (p?.display_name || user.name || '');
      setName(want);
      setRows(await listFriends());
      setErr(null);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }, [user, settings.nickname]);

  useEffect(() => {
    void load();
  }, [load]);

  const [sortBy, setSortBy] = useState<'xp' | 'rating'>('xp');
  const board = sortBy === 'xp' ? weeklyBoard(rows) : [...weeklyBoard(rows)].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const incoming = rows.filter((r) => r.relation === 'incoming');
  const outgoing = rows.filter((r) => r.relation === 'outgoing');
  const maxWeek = Math.max(1, ...board.map((r) => r.week_xp ?? 0));

  const lang = settings.uiLang;
  const he = lang === 'he';
  // Per course (owner 2026-11-09): compare levels only with friends who take the active course.
  const course = settings.activeCourse ?? 'ear';
  const cdef = courseOf(course);
  const [scope, setScope] = useState<'all' | 'course'>('all');
  type Tab = 'friends' | 'league' | 'duels' | 'class';
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (sessionStorage.getItem('toneturn.friendsTab') as Tab | null) ?? 'friends';
    } catch {
      return 'friends';
    }
  });
  const pickTab = (x: Tab) => {
    setTab(x);
    try {
      sessionStorage.setItem('toneturn.friendsTab', x);
    } catch {
      /* fine */
    }
  };
  const friends = rows.filter((r) => r.relation === 'friend');
  const shareCode = async () => {
    const text = `${t.shareText} ${me?.friend_code}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(me?.friend_code ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* cancelled */
    }
  };
  const TABS = [
    ['friends', t.friends],
    ['league', lang === 'he' ? 'ליגה' : 'League'],
    ['duels', lang === 'he' ? 'דו־קרבות' : 'Duels'],
    ...(classes ? ([['class', lang === 'he' ? 'כיתה' : 'Class']] as const) : []),
  ] as const;

  return (
    <main className="panel-screen friends fr2">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{lang === 'he' ? 'קהילה' : 'Community'}</h1>
      </header>

      {!user ? (
        <>
          <p className="field-hint">{t.friendsHint}</p>
          <AccountCard t={t} user={user} sync={sync} />
        </>
      ) : (
        <>
          {err && <p className="field-hint warn">{err}</p>}

          {/* Me: picture, flag, nickname (edited in Settings → Account) and the friend code to share. */}
          <section className="fr-me" data-fr-me="1">
            <Avatar s={settings} size={48} />
            <span className="fr-me-text">
              <b>{name || '…'}</b>
              <small>
                {t.yourCode}{' '}
                <span className="friend-code" dir="ltr">
                  {me?.friend_code ?? '······'}
                </span>
              </small>
            </span>
            <button className="btn small" disabled={!me} onClick={() => void shareCode()} data-fr-share="1">
              {copied ? `✓ ${t.copied}` : lang === 'he' ? 'שיתוף' : 'Share'}
            </button>
          </section>

          {profileErr && <p className="field-hint warn">{profileErr}</p>}
          {!duelPlaying && incoming.length > 0 && (
            <section className="set-card fr-requests">
              <h2>{t.requests}</h2>
              <ul className="fr-req-list">
                {incoming.map((r) => (
                  <li key={r.user_id}>
                    <FriendAvatar r={r} size={30} />
                    <b>{r.name}</b>
                    <button className="btn small primary" onClick={() => void respondFriend(r.user_id, true).then(load)}>
                      {t.accept}
                    </button>
                    <button className="btn small ghost" onClick={() => void respondFriend(r.user_id, false).then(load)}>
                      {t.decline}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="seg fr-tabs" role="tablist" aria-label={t.friends}>
            {TABS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => pickTab(k)} data-fr-tab={k}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'friends' && (
            <>
              {realUser && <DuetsStrip lang={lang} friends={rows} />}
              <div className="seg small fr-scope" role="radiogroup" aria-label={he ? 'להשוות עם' : 'Compare with'}>
                {(['all', 'course'] as const).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={scope === k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)} data-fr-scope={k}>
                    {k === 'all' ? (he ? 'כל החברים' : 'All friends') : he ? `חברים ב${cdef.short.he}` : `Friends in ${cdef.short.en}`}
                  </button>
                ))}
              </div>
              {scope === 'course' && <CourseFriends rows={rows} course={course} myLevel={progress ? courseLevel(course, ratingsOf(progress), settings.courses).name : null} lang={lang} settings={settings} you={t.you} />}
              {scope === 'all' && <section className="set-card fr-board">
                <div className="fr-board-head">
                  <h2>{sortBy === 'xp' ? t.thisWeek : t.overallRating}</h2>
                  <div className="fr-sort" role="radiogroup" aria-label={t.sortBy}>
                    {(['xp', 'rating'] as const).map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={sortBy === k} className={`chip ${sortBy === k ? 'on' : ''}`} onClick={() => setSortBy(k)}>
                        {k === 'xp' ? 'XP' : t.overallRating}
                      </button>
                    ))}
                  </div>
                </div>
                <ol className="fr-list">
                  {board.map((r, i) => {
                    const mine = r.relation === 'me';
                    return (
                      <li key={r.user_id} className={`fr-row ${mine ? 'me' : ''}`}>
                        <span className="fr-rank">{i + 1}</span>
                        {mine ? (
                          <Avatar s={settings} size={34} />
                        ) : (
                          <FriendAvatar r={r} />
                        )}
                        <span className="fr-main">
                          <span className="fr-top">
                            <b className="fr-name">{r.name}</b>
                            {mine && <small className="fr-you">{t.you}</small>}
                            <span className="fr-xp" dir="ltr">
                              {sortBy === 'xp' ? `${r.week_xp ?? 0} XP` : (r.rating ?? '—')}
                            </span>
                          </span>
                          <span className="fr-bar" aria-hidden="true">
                            <span style={{ width: `${((r.week_xp ?? 0) / maxWeek) * 100}%` }} />
                          </span>
                          <span className="fr-stats">
                            <span title={t.streak}>
                              <LineIcon d={FLAME} /> {r.streak ?? 0}
                            </span>
                            <span title={t.lessons}>
                              <LineIcon d={BOOK} /> {r.lessons_done ?? 0}
                            </span>
                            {sortBy === 'xp' && <RatingBadge r={r.rating} provisional={!!r.rating_provisional} t={t} size="sm" />}
                          </span>
                        </span>
                        {r.relation === 'friend' && (
                          <button
                            className="icon-btn fr-remove"
                            aria-label={`${t.remove} ${r.name}`}
                            onClick={() => {
                              if (confirm(`${t.remove} ${r.name}?`)) void removeFriend(r.user_id).then(load);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {board.length <= 1 && <p className="field-hint">{t.noFriends}</p>}
              </section>}

              {progress && friends.length > 0 && (
                <section className="set-card">
                  <FriendsBoard t={t} rows={friends as FriendStats[]} share={settings.shareStats ?? 'levels'} onOpen={setCmp} />
                </section>
              )}
              {progress && cmp && <CompareSheet t={t} progress={progress} friend={cmp} share={settings.shareStats ?? 'levels'} myStreak={streak} onClose={() => setCmp(null)} />}

              <section className="set-card fr-add">
                <h2>{t.addFriend}</h2>
                <form
                  className="fr-add-row"
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
                  <input className="code-input" dir="ltr" value={code} maxLength={8} placeholder="ABC234" aria-label={t.friendCode} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                  <button className="btn primary" type="submit" disabled={code.length < 6}>
                    {t.add}
                  </button>
                </form>
                {msg && <p className="field-hint">{msg}</p>}
                {outgoing.length > 0 && (
                  <ul className="fr-req-list fr-pending">
                    {outgoing.map((r) => (
                      <li key={r.user_id}>
                        <FriendAvatar r={r} size={30} />
                        <b>{r.name}</b>
                        <small>{t.pending}</small>
                        <button className="btn small ghost" onClick={() => void removeFriend(r.user_id).then(load)}>
                          {t.remove}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
          {tab === 'league' && <LeagueCard t={t} lang={lang} onBestTier={onBestTier} lastSeen={settings.leagueSeen} onSeen={onLeagueSeen} history={progress?.history} />}
          {tab === 'class' && classes}
          {tab === 'duels' && <DuelsSection t={t} settings={settings} friends={friends.map((r) => ({ id: r.user_id, name: r.name }))} onPlaying={setDuelPlaying} />}
        </>
      )}
    </main>
  );
}

/** Me and the friends who take this course, by level (pp … ff). Older servers / apps: a friendly note instead. */
function CourseFriends({ rows, course, myLevel, lang, settings, you }: { you: string; rows: FriendRow[]; course: CourseId; myLevel: DynName | null; lang: 'he' | 'en'; settings: Settings }) {
  const he = lang === 'he';
  const c = courseOf(course);
  const v = friendsInCourse(rows, course, myLevel);
  const others = v.rows.filter((r) => r.relation !== 'me');
  return (
    <section className="set-card fr-board fr-course" data-fr-course={course}>
      <div className="fr-board-head">
        <h2>{he ? `הדרגה ב${c.short.he}` : `Level in ${c.short.en}`}</h2>
        <Glyph kind={c.glyph} color={c.color} size={30} />
      </div>
      {!v.known ? (
        <p className="fr-course-empty" data-fr-course-empty="1">
          {he ? 'הדרגות של החברים בכל קורס יופיעו אחרי שהם יעדכנו את האפליקציה.' : "Friends' course levels appear once they update the app."}
        </p>
      ) : (
        <>
          <ol className="fr-list">
            {v.rows.map((r, i) => {
              const mine = r.relation === 'me';
              return (
                <li key={r.user_id} className={`fr-row ${mine ? 'me' : ''}`}>
                  <span className="fr-rank">{i + 1}</span>
                  {mine ? <Avatar s={settings} size={34} /> : <FriendAvatar r={r} />}
                  <span className="fr-main">
                    <span className="fr-top">
                      <b className="fr-name">{r.name}</b>
                      {mine && <small className="fr-you">{you}</small>}
                      <span className={`fr-level ${r.level ? '' : 'none'}`} dir="ltr">
                        {r.level ?? '–'}
                      </span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          {others.length === 0 && <p className="field-hint">{he ? `עוד אין חברים שלומדים ${c.short.he}.` : `No friends take ${c.short.en} yet.`}</p>}
        </>
      )}
    </section>
  );
}

const DEMO = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demoFriends');
const demo = (user_id: string, name: string, relation: FriendRow['relation'], week_xp: number, streak: number, lessons_done: number, rating: number): FriendRow => ({ user_id, name, relation, week_xp, total_xp: week_xp * 6, streak, lessons_done, best_melody: null, best_rhythm: null, last_active: null, rating, rating_provisional: false });
const DEMO_USER = { id: 'demo', name: 'Demo' } as unknown as CloudUser;
const demoRows = (): FriendRow[] => [
  demo('me', 'DorianShredder11', 'me', 420, 3, 12, 1414),
  { ...demo('a', 'CodaFox42', 'friend', 610, 12, 40, 1288), avatar_icon: 'guitar', avatar_color: '#c9733a', country: 'IL', course_levels: { guitar: 'f', ear: 'mf' } },
  { ...demo('b', 'Mixolydia', 'friend', 180, 1, 7, 1102), avatar_icon: 'mic', country: 'FR', course_levels: { voice: 'mp', ear: 'p' } },
  demo('c', 'BlueNoteBenjamin_TheLongName', 'friend', 95, 0, 3, 960),
  demo('d', 'Allegra', 'incoming', 0, 0, 0, 900),
  demo('e', 'Ostinato7', 'outgoing', 0, 0, 0, 900),
];
const initial = (n: string | null | undefined) => (n?.trim()?.[0] ?? '?').toUpperCase();
const FLAME = 'M12 3c.5 3-2.5 4.5-2.5 8a2.5 2.5 0 0 0 5 0c0-1-.4-1.8-.9-2.5 2.3 1 3.9 3.3 3.9 6A5.5 5.5 0 0 1 6 14.5C6 9.5 10 7.5 12 3z';
const BOOK = 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5';
function LineIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** A friend's picture: their photo when they share it with me, else their instrument icon + colour; their flag. */
function FriendAvatar({ r, size = 34 }: { r: FriendRow; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (r.has_photo) void avatarUrl(r.user_id).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [r.user_id, r.has_photo]);
  if (!r.avatar_icon && !r.avatar_color && !url && !r.country)
    return (
      <span className="fr-av" aria-hidden="true">
        {initial(r.name)}
      </span>
    );
  return <Avatar s={{ avatarIcon: r.avatar_icon ?? undefined, avatarColor: r.avatar_color ?? undefined, avatarPhoto: url, country: r.country ?? null }} size={size} />;
}
