import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cloudConfigured, signInWithGoogle, type CloudUser } from '../cloud/cloud';
import { normaliseCode, ROOM_CODE_RE, RoomError, supabaseRooms, type RoomBackend } from '../cloud/rooms';
import { tournamentSet, type SetKind } from '../engine/tournament';
import { displayNote } from '../engine/pitch';
import { createRoom, RoomController, type RoomStanding } from '../game/roomController';
import { askTemplate, choiceLabel } from '../game/content';
import { realClock } from '../game/adapters';
import type { Strings } from '../i18n/strings';
import { namingFor, type Settings } from '../storage/progress';
import { withNote } from './bits';
import { params, piano, tts } from './services';
import { TimeBar } from './Tournament';

/** Dev/E2E only: an in-page room server with bot opponents (never in production builds). */
const FAKE_ROOMS = import.meta.env.DEV && params.has('fakeRooms');
let fakeServer: import('../game/roomFake').FakeRoomServer | null = null;
async function fakeBackend(): Promise<RoomBackend> {
  const { FakeRoomServer } = await import('../game/roomFake');
  fakeServer ??= new FakeRoomServer();
  return fakeServer.client('me');
}

export const PENDING_ONLINE_KEY = 'toneturn.pendingOnline';

const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

function errorText(t: Strings, e: unknown) {
  const code = e instanceof RoomError ? e.code : 'other';
  return code === 'not-found' ? t.roomNotFound : code === 'started' ? t.roomStarted : code === 'full' ? t.roomFull : code === 'sign-in' ? t.signInToPlay : t.roomError;
}

export function OnlineScreen({ t, settings, user, initialCode, onBack }: { t: Strings; settings: Settings; user: CloudUser | null; initialCode: string; onBack: () => void }) {
  const [backend, setBackend] = useState<RoomBackend | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [nick, setNick] = useState(() => (user?.name ?? '').split(' ')[0].slice(0, 16));
  const [code, setCode] = useState(normaliseCode(initialCode));
  const [kind, setKind] = useState<SetKind>('mixed');
  const [rounds, setRounds] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (FAKE_ROOMS) void fakeBackend().then(setBackend);
    else if (user) setBackend(supabaseRooms());
  }, [user]);

  if (roomId && backend) return <RoomScreen t={t} settings={settings} backend={backend} roomId={roomId} onExit={onBack} />;

  const ready = FAKE_ROOMS || (cloudConfigured && user);
  const name = nick.trim() || t.you;
  const kinds: [SetKind, string][] = [
    ['mixed', t.setMixed],
    ['degrees', t.skillNames.degrees],
    ['chords', t.skillNames.chords],
    ['intervals', t.skillNames.intervals],
  ];
  const run = async (f: (b: RoomBackend) => Promise<string>) => {
    if (!backend) return;
    setBusy(true);
    setErr(null);
    try {
      void piano.unlock();
      setRoomId(await f(backend));
    } catch (e) {
      setErr(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="panel-screen online">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.online}</h1>
      </header>
      <p className="field-hint">{t.onlineHint}</p>
      {!FAKE_ROOMS && !cloudConfigured ? (
        <p className="set-card">{t.onlineUnavailable}</p>
      ) : !ready ? (
        <section className="set-card online-signin">
          <p>{t.signInToPlay}</p>
          <button
            className="btn google"
            onClick={() => {
              try {
                sessionStorage.setItem(PENDING_ONLINE_KEY, code || '-');
              } catch {
                /* private mode */
              }
              void signInWithGoogle();
            }}
          >
            {t.signInGoogle}
          </button>
        </section>
      ) : (
        <>
          <label className="inline-field set-card">
            <small>{t.nickname}</small>
            <input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} placeholder={t.you} />
          </label>
          <section className="set-card">
            <h2>{t.joinRoom}</h2>
            <div className="join-row">
              <input
                className="code-input"
                dir="ltr"
                value={code}
                aria-label={t.roomCode}
                placeholder="ABC234"
                autoCapitalize="characters"
                autoComplete="off"
                onChange={(e) => setCode(normaliseCode(e.target.value))}
              />
              <button className="btn primary" disabled={busy || !ROOM_CODE_RE.test(code)} onClick={() => run((b) => b.join(code, name))}>
                {t.join}
              </button>
            </div>
          </section>
          <section className="set-card">
            <h2>{t.createRoom}</h2>
            <fieldset className="seg-field">
              <legend>{t.questionsOn}</legend>
              <div className="seg" role="radiogroup" aria-label={t.questionsOn}>
                {kinds.map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={kind === v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="seg-field">
              <legend>{t.roundsLabel}</legend>
              <div className="seg" role="radiogroup" aria-label={t.roundsLabel}>
                {[5, 10, 15].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rounds === n} className={rounds === n ? 'on' : ''} onClick={() => setRounds(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
            <button
              className="btn mega"
              disabled={busy}
              onClick={() =>
                run(async (b) => {
                  const r = await createRoom(b, kind, rounds, name);
                  if (FAKE_ROOMS && fakeServer) {
                    const room = fakeServer.rooms.get(r.id)!;
                    const items = tournamentSet(room.kind, room.rounds, room.seed);
                    fakeServer.addBots(r.code, ['Ada', 'Ravi'], { choices: (i) => items[i].choices.map(String), delayMs: [400, 1600] });
                  }
                  return r.id;
                })
              }
            >
              {t.create}
            </button>
          </section>
        </>
      )}
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
    </main>
  );
}

function Arrow({ s }: { s: RoomStanding }) {
  if (s.prevRank === null || s.prevRank === s.rank) return <span className="move same" aria-hidden="true" />;
  return s.prevRank > s.rank ? <span className="move up">▲</span> : <span className="move down">▼</span>;
}

function Board({ t, standings, me, limit, lang }: { t: Strings; standings: RoomStanding[]; me: string; limit?: number; lang: 'he' | 'en' }) {
  const top = limit ? standings.slice(0, limit) : standings;
  const mine = standings.find((s) => s.userId === me);
  const rows = mine && !top.includes(mine) ? [...top, mine] : top;
  return (
    <ol className="board room-board">
      {rows.map((s) => (
        <li key={s.userId} className={`${s.userId === me ? 'me' : ''} ${s.rank === 1 ? 'win' : ''}`}>
          <span className="rank">{s.rank}</span>
          <Arrow s={s} />
          <span className="pname">{s.nickname}</span>
          <span className="pbest" dir="ltr">
            {s.points.toLocaleString(lang)} <small>{t.points}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

function RoomScreen({ t, settings, backend, roomId, onExit }: { t: Strings; settings: Settings; backend: RoomBackend; roomId: string; onExit: () => void }) {
  const ref = useRef<RoomController | null>(null);
  ref.current ??= new RoomController(backend, roomId, { audio: piano, tts, clock: realClock });
  const c = ref.current;
  const v = useSyncExternalStore(c.subscribe, c.getView);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    c.start();
    return () => c.dispose();
  }, [c]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const s = v.snap;
  if (!s) {
    return (
      <main className="panel-screen">
        <p className="field-hint">{v.offline ? t.reconnecting : t.connecting}</p>
        <button className="btn ghost" onClick={onExit}>
          {t.leave}
        </button>
      </main>
    );
  }

  if (v.phase === 'lobby' || v.phase === 'connecting') {
    const link = `${location.origin}${location.pathname}#/online/${s.code}`;
    return (
      <main className="panel-screen room-lobby">
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={t.leave}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{t.online}</h1>
        </header>
        <section className="set-card room-code-card">
          <small>{t.roomCode}</small>
          <b className="room-code" dir="ltr" data-code={s.code}>
            {s.code}
          </b>
          <button
            className="btn primary"
            onClick={async () => {
              const text = fmt(t.inviteText, { c: s.code });
              try {
                if (navigator.share) await navigator.share({ text, url: link });
                else await navigator.clipboard.writeText(`${text}\n${link}`);
                setShared(true);
              } catch {
                /* cancelled */
              }
            }}
          >
            {shared ? `✓ ${t.copied}` : t.invite}
          </button>
        </section>
        <section className="set-card">
          <h2>
            {t.roomPlayers} <small dir="ltr">({s.players.length})</small>
          </h2>
          <ul className="room-players">
            {s.players.map((p) => (
              <li key={p.userId} className={p.userId === s.me ? 'me' : ''}>
                {p.nickname}
                {p.userId === s.host && <small className="host-tag">{t.hostTag}</small>}
              </li>
            ))}
          </ul>
        </section>
        {v.isHost ? (
          <>
            <button className="btn mega" disabled={s.players.length < 2} onClick={() => void c.startGame()}>
              ▶ {t.startGame}
            </button>
            {s.players.length < 2 && <p className="field-hint">{t.needTwo}</p>}
          </>
        ) : (
          <p className="field-hint">{t.waitingForHost}</p>
        )}
      </main>
    );
  }

  if (v.phase === 'over') {
    const top = v.standings.slice(0, 3);
    return (
      <main className="recap scoreboard room-over">
        <p className="eyebrow">{t.online}</p>
        <h1>{t.finalStandings}</h1>
        <div className="podium">
          {[top[1], top[0], top[2]].map((p, i) =>
            p ? (
              <div key={p.userId} className={`step s${p.rank}`} style={{ order: i }}>
                <b>{p.nickname}</b>
                <span dir="ltr">{p.points.toLocaleString(lang)}</span>
                <i>{p.rank}</i>
              </div>
            ) : null,
          )}
        </div>
        <Board t={t} standings={v.standings} me={s.me} lang={lang} />
        <div className="recap-actions">
          <button className="btn ghost" onClick={onExit}>
            {t.home}
          </button>
        </div>
      </main>
    );
  }

  const q = v.item!;
  const target = q.kind === 'degree' ? displayNote(q.target, nm, lang) : '';
  const reveal = v.phase === 'reveal';
  const mine = v.last?.answers.find((a) => a.userId === s.me);
  return (
    <main className={`tournament single online-play stage-${v.phase}`}>
      <section className="t-center">
        <div className="t-top">
          <button className="icon-btn" onClick={onExit} aria-label={t.leave}>
            ✕
          </button>
          <span className="t-answered" dir="auto">
            {!reveal && fmt(t.answeredN, { n: s.answered, m: s.players.length })}
          </span>
          <span className="t-round" dir="ltr">
            {v.round + 1}/{s.rounds}
          </span>
        </div>
        {v.offline && <p className="offline-chip">{t.reconnecting}</p>}
        {v.phase === 'countdown' ? (
          <div className="t-countdown" key={v.countdown}>
            {v.countdown}
          </div>
        ) : (
          <h2 className="ask">{withNote(askTemplate(q, lang, nm), target)}</h2>
        )}
        <TimeBar endsAt={v.phase === 'answering' ? v.windowEndsAt : null} />
      </section>
      <section className="duel-half p0">
        <div className={`answers n-${q.choices.length}`}>
          {q.choices.map((ch) => {
            const lb = choiceLabel(q, ch, lang, nm);
            const picked = reveal ? mine?.answer === String(ch) : v.myAnswer === ch;
            const cls = reveal ? (String(ch) === v.last?.key ? 'right' : picked ? 'wrongpick' : '') : picked ? 'locked' : '';
            return (
              <button
                key={String(ch)}
                className={`answer tone-${lb.tone} ${cls}`}
                disabled={v.phase !== 'answering'}
                data-answer={String(ch)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  c.answer(ch);
                }}
              >
                <b>{lb.big}</b>
                <small>{lb.small}</small>
              </button>
            );
          })}
        </div>
        {v.phase === 'waiting' && <p className="half-result">{t.waitingOthers}</p>}
        {reveal && (
          <p className={`half-result ${mine?.correct ? 'good' : ''}`} dir="ltr">
            {mine?.correct ? `+${mine.points}` : mine?.answer == null ? t.timeUp : '0'}
            {mine?.correct && mine.timeMs !== null && ` · ${(mine.timeMs / 1000).toFixed(2)}s`}
          </p>
        )}
      </section>
      {reveal && <Board t={t} standings={v.standings} me={s.me} limit={5} lang={lang} />}
    </main>
  );
}
