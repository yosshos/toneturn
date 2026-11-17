// Gifts between friends (owner decisions 2026-11-16) — #/challenges/gifts[/<friend>[/dedicate]]: today's allowance
// (one gift per practice day), "for you" (fermatas, dedications, practise-together invites), and per friend: a
// fermata, a phrase dedication, "practise with me now". Quiet and mature: words and Paper drawings (src/ui/paper/
// art-gifts.ts for the content marks, the chrome cut inside buttons), no emoji, no counts of anyone else's.
// Rules: src/engine/encore/gifts.ts; server: migration 20261205000000_toneturn_friend_gifts.sql.

import { useEffect, useMemo, useState } from 'react';
import '../../encore.css';
import '../../challenges.css';
import '../../gifts.css';
import { isYoung } from '../../engine/privacy';
import { measuredMsOn, STREAK_MIN_MS } from '../../engine/practiceTime';
import { loadLedger } from '../../storage/practice';
import { ALLOWANCE_TEXT, DEDICATION_XP, NOTE_MAX, dedicatable, dedicationLickId, giftAllowance, invitesLeft, type GiftAllowance } from '../../engine/encore/gifts';
import { answerTogether, giftsView, inviteTogether, localDay, saveTogether, sendDedication, sendFermata, type GiftFriend, type GiftsView as View, type SendAnswer } from '../../cloud/gifts';
import { Icon } from '../icons';
import { PAPER } from '../paper';
import { PaperSvg } from '../paper/Paper';
import { Bi, T, type Lang } from './bits';
import type { ChallengeProps } from './Challenge';

const L = (lang: Lang, en: string, he: string) => (lang === 'he' ? he : en);
const go = (path: string) => {
  location.hash = `/challenges${path ? `/${path}` : ''}`;
};
type Head = (title: React.ReactNode, sub?: React.ReactNode, back?: () => void, extra?: React.ReactNode) => React.ReactNode;

/** The control symbol (chrome cut) for icon buttons. */
export function GiftIcon({ size = 16 }: { size?: number }) {
  return <Icon k="gift" size={size} />;
}

export type GiftKind = 'gift' | 'fermata' | 'dedicate' | 'together';
/** A gift's Paper drawing (layered tonal sheets, src/ui/paper/art-gifts.ts) beside text: allowance, inbox rows. */
export function GiftArt({ kind, size = 20 }: { kind: GiftKind; size?: number }) {
  const art = PAPER[kind === 'gift' ? 'gift' : `gift-${kind}`];
  return <PaperSvg art={art} cut={size <= 24 ? 'small' : 'full'} width={size} className={`gift-art gift-art-${kind}`} />;
}

/** Today's measured practice on this device (the 5 minutes that make a practice day). */
export const measuredToday = () => {
  try {
    return measuredMsOn(loadLedger(), localDay());
  } catch {
    return 0;
  }
};

export function GiftsView({ lang, settings, head, friend, dedicate }: ChallengeProps & { head: Head; friend: string | null; dedicate: boolean }) {
  const [v, setV] = useState<View | null>(null);
  const [msg, setMsg] = useState<React.ReactNode>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const ms = measuredToday();
  const youngMe = isYoung(settings.birthYear);
  useEffect(() => {
    let live = true;
    void giftsView()
      .then((x) => live && setV(x))
      .catch(() => live && setV({ today: { gifts: 0, invites: 0 }, friends: [], received: [], sent: [], sessions: [] }));
    return () => {
      live = false;
    };
  }, [tick, dedicate, friend]);
  const allowance: GiftAllowance = giftAllowance({ measuredToday: ms >= STREAK_MIN_MS, sentToday: v?.today.gifts ?? 0 });
  const reload = () => setTick((t) => t + 1);
  const said = (a: SendAnswer, name: string, what: 'fermata' | 'dedication') => {
    if (a === 'ok') return <>{what === 'fermata' ? L(lang, 'A fermata is on its way to ', 'פרמטה בדרך אל ') : L(lang, 'Your phrase is on its way to ', 'המשפט בדרך אל ')}<Bi text={name} />.</>;
    if (a === 'practise-first') return ALLOWANCE_TEXT['practise-first'][lang];
    if (a === 'used') return ALLOWANCE_TEXT.used[lang];
    return L(lang, 'Could not send right now.', 'לא נשלח כרגע.');
  };
  const pick = friend ? (v?.friends ?? []).find((f) => f.id === friend) : undefined;

  if (dedicate && v && pick) return <DedicateView lang={lang} settings={settings} head={head} f={pick} allowance={allowance} youngMe={youngMe} ms={ms} />;

  const forMe = v?.received.slice(0, 12) ?? [];
  const invites = (v?.sessions ?? []).filter((s) => !s.mine && s.status === 'pending');
  const openWith = new Set((v?.sessions ?? []).filter((s) => s.status === 'pending' || s.status === 'active').map((s) => s.friend));
  const friends = pick ? [pick] : (v?.friends ?? []);
  const left = invitesLeft(v?.today.invites ?? 0);

  const giveFermata = async (f: GiftFriend) => {
    setBusy(true);
    const a = await sendFermata(f.id, ms);
    setBusy(false);
    setAsk(null);
    setMsg(said(a, f.name, 'fermata'));
    reload();
  };
  const invite = async (f: GiftFriend) => {
    setBusy(true);
    const r = await inviteTogether(f.id);
    setBusy(false);
    if (r.ok) {
      saveTogether({ id: r.id, friendName: f.name, base: null, day: localDay() });
      setMsg(<>{L(lang, 'Invite sent to ', 'ההזמנה נשלחה אל ')}<Bi text={f.name} />{L(lang, '. It is open for 30 minutes.', '. היא פתוחה 30 דקות.')}</>);
    } else setMsg(r.why === 'limit' ? L(lang, 'Three invites a day — that was today’s last.', 'שלוש הזמנות ביום — זו הייתה האחרונה להיום.') : L(lang, 'Could not send right now.', 'לא נשלח כרגע.'));
    reload();
  };

  return (
    <main className="panel-screen enc-screen chl-screen chl-fit" data-chl="gifts" data-gift-allowance={allowance}>
      {head(L(lang, 'Gifts between friends', 'מתנות בין חברים'), undefined, () => (friend ? go('gifts') : history.back()))}
      <p className={`gift-allow ${allowance}`} data-gift-allow-text="1">
        <GiftArt kind="gift" size={22} />
        <span>{ALLOWANCE_TEXT[allowance][lang]}</span>
      </p>
      <div className="chl-list">
        {!v && <p className="t3">…</p>}
        {v && (forMe.length > 0 || invites.length > 0) && (
          <section className="enc-block col" data-gift-inbox={forMe.length + invites.length}>
            <b className="t2">{L(lang, 'For you', 'בשבילך')}</b>
            {invites.map((s) => (
              <div key={s.id} className="enc-card col gift-item" data-gift-invite={s.id}>
                <span className="row">
                  <GiftArt kind="together" size={22} />
                  <span className="grow">
                    <Bi text={s.friendName} /> {L(lang, 'invites you to practise together now', 'מזמין/ה אותך לתרגל יחד עכשיו')}
                  </span>
                </span>
                <span className="row">
                  <button
                    className="btn small primary grow"
                    disabled={busy}
                    onClick={() =>
                      void answerTogether(s.id, true)
                        .then(() => (saveTogether({ id: s.id, friendName: s.friendName, base: measuredToday(), day: localDay() }), setMsg(L(lang, 'Practising together — five measured minutes each.', 'מתרגלים יחד — חמש דקות נמדדות לכל אחד.'))))
                        .catch(() => setMsg(L(lang, 'The invite has expired.', 'ההזמנה פגה.')))
                        .finally(reload)
                    }
                    data-gift-invite-accept={s.id}
                  >
                    {L(lang, 'Practise together', 'לתרגל יחד')}
                  </button>
                  <button className="btn small ghost" disabled={busy} onClick={() => void answerTogether(s.id, false).catch(() => {}).finally(reload)} data-gift-invite-decline={s.id}>
                    {L(lang, 'Not now', 'לא עכשיו')}
                  </button>
                </span>
              </div>
            ))}
            {forMe.map((g) =>
              g.kind === 'fermata' ? (
                <div key={g.id} className="enc-card row gift-item" data-gift-received="fermata" data-gift-id={g.id}>
                  <GiftArt kind="fermata" size={24} />
                  <span className="grow col">
                    <span>
                      {L(lang, 'A fermata from ', 'פרמטה מ־')}
                      <Bi text={g.fromName} />
                    </span>
                    <small className="t3">{L(lang, 'It holds one missed day of your streak.', 'היא שומרת יום אחד שהוחמץ ברצף.')}</small>
                  </span>
                </div>
              ) : (
                <div key={g.id} className="enc-card col gift-item" data-gift-received="dedication" data-gift-id={g.id}>
                  <span className="row">
                    <GiftArt kind="dedicate" size={22} />
                    <span className="grow">
                      <Bi text={g.fromName} /> {L(lang, 'dedicated a phrase to you', 'הקדיש/ה לך משפט')}
                    </span>
                    {g.done && <span className="enc-pill ac">{L(lang, 'Completed', 'הושלם')}</span>}
                  </span>
                  <b className="t2 chl-ellip">
                    <Bi text={g.title ?? ''} />
                  </b>
                  {g.note && (
                    <small className="t3 gift-note">
                      <bdi dir="auto">{g.note}</bdi>
                    </small>
                  )}
                  {!g.done && (
                    <button className="btn small ghost" onClick={() => (location.hash = `/encore/phrase/${dedicationLickId(g.id)}`)} data-gift-practise={g.id}>
                      {L(lang, 'Practise it', 'לתרגל')}
                    </button>
                  )}
                </div>
              ),
            )}
          </section>
        )}
        {v && (
          <section className="enc-block col" data-gift-friends={friends.length}>
            <b className="t2">{pick ? <Bi text={pick.name} /> : L(lang, 'Friends', 'חברים')}</b>
            {!friends.length && <small className="t3">{L(lang, 'Add friends in Community to send gifts.', 'מוסיפים חברים בקהילה כדי לשלוח מתנות.')}</small>}
            {friends.map((f) => (
              <div key={f.id} className="enc-card col gift-friend" data-gift-friend={f.id}>
                <span className="row">
                  <b className="t2 grow chl-ellip">
                    <Bi text={f.name} />
                  </b>
                  {f.duet > 0 && (
                    <small className="t3" data-gift-duet={f.duet}>
                      {L(lang, 'duet streak', 'רצף זוגי')} <bdi dir="ltr">{f.duet}</bdi>
                    </small>
                  )}
                </span>
                {ask === f.id ? (
                  <span className="row">
                    <small className="t3 grow">
                      {L(lang, 'A fermata for ', 'פרמטה ל־')}
                      <Bi text={f.name} />
                      {L(lang, "? It is today's gift.", '? זו המתנה של היום.')}
                    </small>
                    <button className="btn small ghost" onClick={() => setAsk(null)}>
                      {L(lang, 'Cancel', 'ביטול')}
                    </button>
                    <button className="btn small primary" disabled={busy} onClick={() => void giveFermata(f)} data-gift-fermata-send={f.id}>
                      {L(lang, 'Send', 'לשלוח')}
                    </button>
                  </span>
                ) : (
                  <span className="row gift-acts">
                    <button className="btn small ghost" disabled={allowance !== 'ready' || busy} onClick={() => setAsk(f.id)} data-gift-fermata={f.id}>
                      <Icon k="fermata" size={14} />
                      {L(lang, 'Fermata', 'פרמטה')}
                    </button>
                    <button className="btn small ghost" disabled={allowance !== 'ready' || busy} onClick={() => go(`gifts/${f.id}/dedicate`)} data-gift-dedicate={f.id}>
                      <Icon k="dedicate" size={14} />
                      {L(lang, 'Dedicate', 'הקדשה')}
                    </button>
                    <button className="btn small ghost" disabled={busy || left === 0 || openWith.has(f.id)} onClick={() => void invite(f)} data-gift-together={f.id}>
                      <Icon k="together" size={14} />
                      {openWith.has(f.id) ? L(lang, 'Invited', 'הוזמן/ה') : L(lang, 'Practise with me', 'תרגל/י איתי')}
                    </button>
                  </span>
                )}
              </div>
            ))}
            {pick && (
              <button className="link" onClick={() => go('gifts')}>
                {L(lang, 'All friends', 'כל החברים')}
              </button>
            )}
            <small className="tiny">{L(lang, `Practise-together invites: ${left} left today (of 3).`, `הזמנות לתרגול משותף: נשארו ${left} היום (מתוך 3).`)}</small>
          </section>
        )}
        {v && v.sent.some((g) => g.kind === 'dedication') && (
          <section className="enc-block col" data-gift-sent={v.sent.length}>
            <b className="t2">{L(lang, 'Phrases I dedicated', 'משפטים שהקדשתי')}</b>
            {v.sent
              .filter((g) => g.kind === 'dedication')
              .slice(0, 8)
              .map((g) => (
                <small key={g.id} className="t3" data-gift-sent-done={g.done ? '1' : '0'}>
                  <Bi text={g.title ?? ''} /> · <Bi text={g.toName} /> · {g.done ? L(lang, 'completed', 'הושלם') : L(lang, 'in progress', 'בתהליך')}
                </small>
              ))}
          </section>
        )}
      </div>
      {msg && (
        <p className="t3" data-gift-msg="1" role="status">
          {msg}
        </p>
      )}
    </main>
  );
}

function DedicateView({ lang, settings, head, f, allowance, youngMe, ms }: { lang: Lang; settings: ChallengeProps['settings']; head: Head; f: GiftFriend; allowance: GiftAllowance; youngMe: boolean; ms: number }) {
  const list = useMemo(() => dedicatable(settings.lickBook), [settings.lickBook]);
  const [id, setId] = useState<string | null>(list[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<React.ReactNode>(null);
  const [busy, setBusy] = useState(false);
  const noNotes = youngMe || f.young;
  const send = async () => {
    const l = list.find((x) => x.id === id);
    if (!l) return;
    setBusy(true);
    const a = await sendDedication(f.id, l, noNotes ? null : note, ms, { young: noNotes, lang });
    setBusy(false);
    if (a === 'ok') {
      setMsg(<>{L(lang, 'Your phrase is on its way to ', 'המשפט בדרך אל ')}<Bi text={f.name} />.</>);
      window.setTimeout(() => go(`gifts/${f.id}`), 900);
    } else setMsg(a === 'used' ? ALLOWANCE_TEXT.used[lang] : a === 'practise-first' ? ALLOWANCE_TEXT['practise-first'][lang] : L(lang, 'Could not send right now.', 'לא נשלח כרגע.'));
  };
  return (
    <main className="panel-screen enc-screen chl-screen chl-fit" data-chl="dedicate">
      {head(L(lang, 'Dedicate a phrase', 'הקדשת משפט'), <Bi text={f.name} />, () => go(`gifts/${f.id}`))}
      <p className={`gift-allow ${allowance}`}>
        <GiftArt kind="dedicate" size={22} />
        <span>{ALLOWANCE_TEXT[allowance][lang]}</span>
      </p>
      <div className="chl-list" role="radiogroup" aria-label={L(lang, 'My phrases', 'המשפטים שלי')}>
        {!list.length && <p className="t3">{L(lang, 'No phrase of your own yet. Keep one in Encore first.', 'עוד אין משפט משלך. שומרים משפט בהדרן קודם.')}</p>}
        {list.map((l) => (
          <label key={l.id} className={`enc-card row gift-pick ${id === l.id ? 'on' : ''}`} data-gift-pick={l.id}>
            <input type="radio" name="gift-ph" checked={id === l.id} onChange={() => setId(l.id)} />
            <span className="grow chl-ellip">
              <Bi text={T(l.name, lang)} />
            </span>
          </label>
        ))}
      </div>
      {!noNotes && (
        <label className="col gift-note-field">
          <small className="t3">{L(lang, 'A short note (optional)', 'מילה קצרה (לא חובה)')}</small>
          <input className="chl-input" dir="auto" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} data-gift-note="1" />
        </label>
      )}
      <small className="tiny">
        {L(lang, 'When they make it theirs in all keys, you both get ', 'כשהמשפט יהיה שלהם בכל הסולמות, שניכם מקבלים ')}
        <bdi dir="ltr">+{DEDICATION_XP} XP</bdi>.
      </small>
      {msg && (
        <p className="t3" data-gift-msg="1" role="status">
          {msg}
        </p>
      )}
      <button className="btn primary enc-full" disabled={!id || busy || allowance !== 'ready'} onClick={() => void send()} data-gift-dedicate-send="1">
        {L(lang, 'Send the dedication', 'לשלוח את ההקדשה')}
      </button>
    </main>
  );
}

/** The feed's "for you" card (Community → Activity): gifts, dedications and invites that came in, quietly. */
export function GiftInboxCard({ lang }: { lang: Lang }) {
  const [v, setV] = useState<View | null>(null);
  useEffect(() => {
    let live = true;
    void giftsView()
      .then((x) => live && setV(x))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (!v) return null;
  const invites = v.sessions.filter((s) => !s.mine && s.status === 'pending');
  const recent = v.received.filter((g) => Date.now() - Date.parse(g.createdAt) < 14 * 86_400_000).slice(0, 3);
  if (!invites.length && !recent.length) return null;
  return (
    <section className="set-card col gift-inbox" data-gift-inbox-card={invites.length + recent.length}>
      <h2>{L(lang, 'For you', 'בשבילך')}</h2>
      {invites.map((s) => (
        <small key={s.id} className="row">
          <GiftArt kind="together" size={20} />
          <span>
            <Bi text={s.friendName} /> {L(lang, 'invites you to practise together now', 'מזמין/ה אותך לתרגל יחד עכשיו')}
          </span>
        </small>
      ))}
      {recent.map((g) => (
        <small key={g.id} className="row">
          <GiftArt kind={g.kind === 'fermata' ? 'fermata' : 'dedicate'} size={20} />
          <span>
            {g.kind === 'fermata' ? L(lang, 'A fermata from ', 'פרמטה מ־') : L(lang, 'A phrase dedicated by ', 'משפט שהקדיש/ה ')}
            <Bi text={g.fromName} />
          </span>
        </small>
      ))}
      <button className="btn small ghost" onClick={() => go('gifts')} data-gift-inbox-open="1">
        {L(lang, 'Open', 'לפתוח')}
      </button>
    </section>
  );
}
