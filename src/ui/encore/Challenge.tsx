// Encore v3 — community challenges ("אתגרי הדרן", SPEC-PHRASE-STUDIO §12, screens: docs/phrase-studio-preview slides
// 20–22). Routes: #/challenges (the gallery: featured this week, from friends, rising — a finite page), /p/CODE[/BEAT]
// (the challenge page and its board), /share/<phraseId> (the share sheet), /mine (my shares), /review (owner / admin).
// The public link #/p/CODE[/BEAT] opens PhrasePublicScreen for visitors without an account: hear it, see the notes,
// try it in free time on the on-screen keys; signing in is needed only to appear on the board.
// Mature and quiet: words, no emoji, no likes, no follower counts, nothing plays until tapped.

import { shareOut as shareWithLink } from '../../engine/shareLinks';
import { useEffect, useMemo, useRef, useState } from 'react';
import '../../encore.css';
import '../../challenges.css';
import type { ItemState } from '../../engine/drills/types';
import type { Lick, LickBook, LickChord, LickInstrument } from '../../engine/licks';
import type { Settings } from '../../storage/progress';
import { piano } from '../services';
import { isYoung } from '../../engine/privacy';
import { phraseEvents, phraseSeconds, withAssignedPhrase, type PhraseAssignment } from '../../engine/encore/assign';
import { badge } from '../../engine/encore/difficulty';
import { chordName, finalHand, passedKeys, phraseItemId, planOf } from '../../engine/encore/phrase';
import {
  CLIP_MAX_BYTES,
  CLIP_MAX_S,
  LEVEL_BANDS,
  STYLE_NAME,
  STYLES,
  daysLeftInWeek,
  lickFromShare,
  parseChallengeHash,
  phraseLink,
  rankBoard,
  rowFacts,
  shareGate,
  shareLevel,
  shareNotes,
  sharePayload,
  shareText,
  sharedPhraseId,
  type BoardRow,
  type ShareProblem,
  type Style,
  type Visibility,
} from '../../engine/encore/community';
import type { KnownMatch } from '../../engine/encore/knownMelody';
import {
  CHALLENGES_ON,
  beatLink,
  challengesMockOn,
  clipUrl,
  deleteShare,
  featurePhrase,
  gallery as fetchGallery,
  hiddenSet,
  myShares,
  openBeat,
  openPhrase,
  openPublic,
  phraseBoard,
  reportShared,
  resolveReview,
  reviewList,
  sharePhrase,
  syncOne,
  uploadClip,
  type Gallery,
  type Opened,
  type ReportKind,
  type ReviewItem,
  type SharedPhrase,
} from '../../cloud/challenges';
import { Bi, EncoreGlyph, KeyStrip, Seg, T, Tempo, kName, type Lang } from './bits';
import { ReactionBar, ReactionCountsLine } from './Reactions';
import { GiftIcon, GiftsView } from './Gifts';
import { Icon } from '../icons';
import { studioShareCardSvg, svgToPng } from '../studio/shareCard';
import { LicksHead } from '../LicksHead';

const L = (lang: Lang, en: string, he: string) => (lang === 'he' ? he : en);
const mod = (n: number) => ((n % 12) + 12) % 12;
const INST: Record<LickInstrument, { en: string; he: string }> = { piano: { en: 'Piano', he: 'פסנתר' }, guitar: { en: 'Guitar', he: 'גיטרה' }, bass: { en: 'Bass', he: 'בס' }, voice: { en: 'Voice', he: 'קול' } };
const go = (path: string) => {
  location.hash = `/challenges${path ? `/${path}` : ''}`;
};
const dateOf = (iso: string) => (iso ? iso.slice(5, 10).split('-').reverse().join('.') : '');

// ───────────────────────────── small pieces ─────────────────────────────


/** The phrase on a small treble staff (heads by diatonic step, bar lines, chord names above). */
export function MiniStaff({ code, w = 320, h = 92, chords = true }: { code: string; w?: number; h?: number; chords?: boolean }) {
  const sn = useMemo(() => shareNotes(code), [code]);
  if (!sn) return null;
  const top = Math.round(h * 0.34);
  const gap = Math.max(5, Math.round(h * 0.075));
  const stepOf = (m: number) => Math.floor(m / 12) * 7 + [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][mod(m)];
  const e4 = stepOf(64);
  const total = Math.max(1, sn.beats);
  const x = (b: number) => 14 + (b / total) * (w - 28);
  const y = (m: number) => Math.max(4, Math.min(h - 4, top + 4 * gap - ((stepOf(m) - e4) * gap) / 2));
  const ch: { name: string; at: number }[] = [];
  let at = 0;
  for (const c of sn.a.chords as LickChord[]) {
    ch.push({ name: chordName(c, sn.a.homeKey), at });
    at += c[2];
  }
  const bars: number[] = [];
  for (let b = sn.meter; b < total - 1e-6; b += sn.meter) bars.push(b);
  return (
    <svg className="chl-staff" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="staff" style={{ direction: 'ltr' }} data-staff-notes={sn.notes.length}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={6} x2={w - 6} y1={top + i * gap} y2={top + i * gap} className="cs-line" />
      ))}
      {bars.map((b) => (
        <line key={b} x1={x(b) - 4} x2={x(b) - 4} y1={top} y2={top + 4 * gap} className="cs-line" />
      ))}
      {chords && ch.slice(0, 8).map((c, i) => (
        <text key={i} x={x(c.at)} y={top - gap * 1.3} className="cs-chord">
          {c.name}
        </text>
      ))}
      {sn.notes.slice(0, 48).map((n, i) => {
        const cx = x(n.beat);
        const cy = y(n.pitch);
        return <ellipse key={i} cx={cx} cy={cy} rx={gap * 0.62} ry={gap * 0.45} transform={`rotate(-20 ${cx} ${cy})`} className="cs-head" />;
      })}
    </svg>
  );
}

function usePlayer() {
  const ctl = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState<'notes' | 'clip' | null>(null);
  const stop = () => {
    ctl.current?.abort();
    audio.current?.pause();
    setOn(null);
  };
  useEffect(() => () => stop(), []);
  const playNotes = async (a: PhraseAssignment, bpm: number) => {
    stop();
    const c = new AbortController();
    ctl.current = c;
    setOn('notes');
    await piano.unlock();
    await piano.play(phraseEvents(a, bpm).map((e) => ({ ...e, start: e.start + 0.05 })), phraseSeconds(a, bpm) + 0.4, c.signal).catch(() => {});
    if (ctl.current === c) setOn(null);
  };
  const playClip = async (url: string) => {
    stop();
    const el = new Audio(url);
    audio.current = el;
    setOn('clip');
    el.onended = () => setOn(null);
    await el.play().catch(() => setOn(null));
  };
  return { on, stop, playNotes, playClip };
}

function SourceBadge({ s }: { s: BoardRow['source'] }) {
  return <span className="chl-src">{s === 'midi' ? <bdi dir="ltr">MIDI</bdi> : s === 'mic' ? 'מיק׳' : 'מסך'}</span>;
}
function SourceBadgeL({ s, lang }: { s: BoardRow['source']; lang: Lang }) {
  if (lang === 'he') return <SourceBadge s={s} />;
  return <span className="chl-src">{s === 'midi' ? 'MIDI' : s === 'mic' ? 'Mic' : 'Screen'}</span>;
}

function TargetChips({ p, lang }: { p: Pick<SharedPhrase, 'goalBpm' | 'needed' | 'ref'>; lang: Lang }) {
  const a = useMemo(() => shareNotes(p.ref)?.a ?? null, [p.ref]);
  const keys = a?.plan.keys;
  const hands = a?.plan.hands;
  return (
    <span className="row wrap chl-target" data-target={p.goalBpm}>
      <span className="ch">
        <Tempo bpm={p.goalBpm} />
      </span>
      <span className="ch">{keys === 'all' || !keys ? (p.needed >= 12 ? L(lang, 'all 12', 'כל 12') : L(lang, `${p.needed} keys`, `${p.needed} סולמות`)) : L(lang, `${keys.length} keys`, `${keys.length} סולמות`)}</span>
      {hands && <span className="ch">{hands === 'RL' || hands === 'R-then-RL' ? L(lang, 'both hands', 'שתי ידיים') : hands === 'L' ? L(lang, 'left hand', 'יד שמאל') : L(lang, 'right hand', 'יד ימין')}</span>}
    </span>
  );
}

function ReportSheet({ lang, row, onClose, onDone }: { lang: Lang; row: boolean; onClose: () => void; onDone: (k: ReportKind) => void }) {
  const [k, setK] = useState<ReportKind>(row ? 'implausible' : 'copied');
  const opts: { k: ReportKind; t: string }[] = row
    ? [
        { k: 'implausible', t: L(lang, 'Result not believable', 'תוצאה לא אמינה') },
        { k: 'other', t: L(lang, 'Something else', 'משהו אחר') },
      ]
    : [
        { k: 'copied', t: L(lang, 'Not their own phrase', 'לא המשפט שלו/ה') },
        { k: 'other', t: L(lang, 'Something else', 'משהו אחר') },
      ];
  return (
    <div className="chl-sheet-back" role="dialog" aria-modal="true" aria-label={L(lang, 'Report', 'דיווח')} data-chl-report="1">
      <div className="chl-sheet enc-card">
        <div className="row">
          <b className="t2 grow">{L(lang, 'Report', 'דיווח')}</b>
          <button className="icon-btn" onClick={onClose} aria-label={L(lang, 'Close', 'סגירה')}>
            <Icon k="close" />
          </button>
        </div>
        <div className="col chl-reasons" role="radiogroup">
          {opts.map((o) => (
            <label key={o.k} className="chl-reason">
              <input type="radio" name="chl-r" checked={k === o.k} onChange={() => setK(o.k)} data-report-kind={o.k} />
              <span>{o.t}</span>
            </label>
          ))}
        </div>
        <p className="t3">{L(lang, 'It disappears for you at once; the team reviews it.', 'זה נעלם אצלך מיד, והצוות בודק.')}</p>
        <button className="btn primary enc-full" onClick={() => onDone(k)} data-report-send="1">
          {L(lang, 'Send report', 'לשלוח דיווח')}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── the screen ─────────────────────────────

export interface ChallengeProps {
  lang: Lang;
  settings: Settings;
  items: Record<string, ItemState>;
  signedIn: boolean;
  onSettings: (p: Partial<Settings>) => void;
  onBack: () => void;
  onSignIn: () => void;
  /** Inside the Licks tile (owner 2026-11-22): the gallery is the tile's "Challenges" section, under its header. */
  hub?: boolean;
}

export function ChallengeScreen(p: ChallengeProps) {
  const { lang } = p;
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const r = parseChallengeHash(hash);
  const head = (title: React.ReactNode, sub?: React.ReactNode, back: () => void = () => history.back(), extra?: React.ReactNode) => (
    <header className="screen-head enc-head">
      <button className="icon-btn" onClick={back} aria-label={L(lang, 'Back', 'חזרה')}>
        <Icon k="back" />
      </button>
      <h1>
        {title}
        {sub && <small className="enc-sub">{sub}</small>}
      </h1>
      {extra}
    </header>
  );
  // In the Licks tile the section's home (the gallery, or the sign-in / not-yet notes) sits under the tile's header.
  const top: Head = p.hub && r.view === 'gallery' ? (_t, _s, _b, extra) => <LicksHead lang={lang} section="challenges" onBack={p.onBack} book={p.settings.lickBook} extra={extra} /> : head;
  if (!CHALLENGES_ON())
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="off">
        {top(L(lang, 'Lick challenges', 'אתגרי ליקים'), undefined, p.onBack)}
        <p className="t3">{L(lang, 'Not available yet — coming with the next server update.', 'עוד לא זמין — יגיע עם עדכון השרת הבא.')}</p>
      </main>
    );
  if (!p.signedIn && r.view !== 'page')
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="signin">
        {top(L(lang, 'Lick challenges', 'אתגרי ליקים'), undefined, p.onBack)}
        <p className="t3">{L(lang, 'Sign in to share phrases and take challenges.', 'כדי לשתף משפטים ולקבל אתגרים צריך להתחבר.')}</p>
        <button className="btn primary enc-full" onClick={p.onSignIn} data-chl-signin="1">
          {L(lang, 'Sign in', 'להתחבר')}
        </button>
      </main>
    );
  if (r.view === 'share') return <ShareSheet {...p} head={head} phraseId={r.id} />;
  if (r.view === 'page') return <ChallengePage {...p} head={head} code={r.code} beat={r.beat} />;
  if (r.view === 'mine') return <MineView lang={lang} head={head} />;
  if (r.view === 'review') return <ReviewView lang={lang} head={head} />;
  if (r.view === 'gifts') return <GiftsView {...p} head={head} friend={r.friend} dedicate={r.dedicate} />;
  return <GalleryView {...p} head={top} />;
}
type Head = (title: React.ReactNode, sub?: React.ReactNode, back?: () => void, extra?: React.ReactNode) => React.ReactNode;

// ───────────────────────────── share sheet (§11.2) ─────────────────────────────

interface ClipChoice {
  id: string;
  at: string;
  seconds: number;
  bytes: number;
}
const DEFAULT_STYLE: Partial<Record<string, Style>> = { barry: 'barry', blues: 'blues', modal: 'modal', 'major-251': 'bebop', 'minor-251': 'bebop', dominant: 'bebop', altered: 'bebop', enclosure: 'bebop', guide: 'bebop' };

function ShareSheet({ lang, settings, onSettings, head, phraseId }: ChallengeProps & { head: Head; phraseId: string }) {
  // The approved dark-purple 4:5 share card.
  const book = settings.lickBook ?? {};
  const l = (book.own ?? []).find((x) => x.id === phraseId);
  const gate = shareGate(settings.birthYear);
  const [title, setTitle] = useState(() => (l ? T(l.name, lang) : ''));
  const auto = l ? shareLevel(l) : 1;
  const [level, setLevel] = useState(auto);
  const [style, setStyle] = useState<Style | null>(() => (l ? (DEFAULT_STYLE[l.ctx] ?? (l.instrument === 'voice' ? 'voice' : null)) : null));
  const [vis, setVis] = useState<Visibility>('friends');
  const [attested, setAttested] = useState(false);
  const [audio, setAudio] = useState(false);
  const [clips, setClips] = useState<ClipChoice[] | null>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [known, setKnown] = useState<KnownMatch | null | undefined>(undefined);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  // SPEC-TEACHER-CLASS §1.3: the class to share with (it always went to the first one)
  const [classPick, setClassPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!l) return;
    let live = true;
    // the known-melody check (§11.6) loads its index on first use
    void import('../../engine/encore/knownMelody').then((m) => live && setKnown(m.knownMelody(l))).catch(() => live && setKnown(null));
    // my own playing of this phrase, recorded in the app, ≤ 20 s (never imported files)
    void import('../../storage/recordings')
      .then(async (rec) => {
        const inst = l.instrument ?? 'piano';
        const out: ClipChoice[] = [];
        for (let k = 0; k < 12; k++) {
          for (const t of await rec.takesOfItem(phraseItemId(l, inst, k, finalHand(l)))) {
            if (t.audioId && !t.deletedAt && t.durationMs <= CLIP_MAX_S * 1000 && (t.audioBytes ?? Infinity) <= CLIP_MAX_BYTES) out.push({ id: t.id, at: t.at, seconds: Math.round(t.durationMs / 1000), bytes: t.audioBytes ?? 0 });
          }
        }
        out.sort((a, b) => b.at.localeCompare(a.at));
        if (live) {
          setClips(out.slice(0, 3));
          setClip(out[0]?.id ?? null);
        }
      })
      .catch(() => live && setClips([]));
    void import('../../cloud/classes')
      .then((c) => c.myClasses())
      .then((m) => live && setClasses([...m.teaching.map((x) => ({ id: x.id, name: x.name })), ...m.memberOf.filter((x) => x.kind !== 'studio').map((x) => ({ id: x.id, name: x.name }))]))
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phraseId]);

  if (!l)
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="share">
        {head(L(lang, 'Share', 'לשתף'))}
        <p className="t3">{L(lang, 'This phrase is not on this device.', 'המשפט הזה לא נמצא במכשיר.')}</p>
      </main>
    );
  const inst = l.instrument ?? 'piano';
  const plan = planOf(l);
  const b = badge(l, inst);
  const context = `${l.ctx === 'free' ? '' : `${l.ctx === 'blues' ? 'blues' : l.ctx === 'minor-251' ? 'ii–V–i' : 'ii–V–I'} · `}${kName(l.homeKey ?? 0, !!l.minor)}`;
  const { payload, problems } = sharePayload(l, { title, style, level, visibility: vis, classId: vis === 'class' ? ((classes.find((c) => c.id === classPick) ?? classes[0])?.id ?? null) : null, attested, audio: audio && !!clip }, { inst, lang, gate, context, grade: b.grade, known: !!known });
  const blocking = problems.filter((x) => x !== 'attest');
  const sn = shareNotes(payload.ref);
  const card = sn ? studioShareCardSvg({ title: payload.title || T(l.name, lang), by: settings.nickname || L(lang, 'Player', 'נגן/ית'), bpm: plan.goalBpm, keys: payload.needed, level: payload.level, notes: sn.notes, beats: sn.beats, meter: sn.meter, lang }) : '';
  const cardUrl = card ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card)}` : '';
  const why: Partial<Record<ShareProblem, string>> = {
    'under-13': L(lang, 'Sharing with everyone opens at 13.', 'שיתוף עם כולם נפתח מגיל 13.'),
    'age-unknown': L(lang, 'Set your year of birth (Settings → Account) to share with everyone.', 'כדי לשתף עם כולם צריך שנת לידה (הגדרות ← חשבון).'),
    'audio-16': L(lang, 'Audio for everyone opens at 16 — share without the clip, or with friends.', 'שמע לכולם נפתח מגיל 16 — אפשר בלי הקטע, או עם חברים.'),
    'audio-13': L(lang, 'Audio clips open at 13.', 'קטעי שמע נפתחים מגיל 13.'),
    bars: L(lang, 'Up to 8 bars can be shared.', 'אפשר לשתף עד 8 תיבות.'),
    size: L(lang, 'This phrase is too long to share.', 'המשפט ארוך מדי לשיתוף.'),
    title: L(lang, 'A title, up to 60 characters.', 'כותרת, עד 60 תווים.'),
    class: L(lang, 'You are not in a class yet.', 'עוד אין לך כיתה.'),
    'known-melody': L(lang, 'Is this a known melody? Only your own phrases go to everyone. With friends or your class it may go as a short quote for study.', 'זה לחן מוכר? לכולם אפשר לשתף רק משפטים שלך. עם חברים או הכיתה — כציטוט קצר ללימוד.'),
    empty: L(lang, 'No notes to share.', 'אין תווים לשתף.'),
  };
  const link = done ? phraseLink(location.origin, location.pathname, done.code) : '';
  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await sharePhrase(payload);
      if (payload.audio && clip) {
        const rec = await import('../../storage/recordings');
        const blob = await rec.getTakeAudio(clip);
        if (blob) await uploadClip(r.id, blob).catch(() => false);
      }
      // my own lick remembers its share (my results post as the creator's row)
      const own = (book.own ?? []).map((x) => (x.id === l.id ? { ...x, shared: { code: r.code, visibility: vis } } : x));
      onSettings({ lickBook: { ...book, own } });
      setDone(r);
    } catch (e) {
      const m = String((e as Error)?.message ?? e);
      setErr(/too many/.test(m) ? L(lang, 'That is ten shares today — more tomorrow.', 'שיתפת עשרה היום — עוד מחר.') : /13|16|age/.test(m) ? (why['under-13'] ?? m) : L(lang, 'Could not share — try again.', 'לא הצלחנו לשתף — אפשר לנסות שוב.'));
    } finally {
      setBusy(false);
    }
  };
  const shareOut = async () => {
    const text = shareText({ title: payload.title, bpm: plan.goalBpm, keys: payload.needed, lang });
    try {
      const png = await svgToPng(card);
      const file = png ? new File([png], 'encore-challenge.png', { type: 'image/png' }) : null;
      if ((await shareWithLink(text, link, file ? [file] : undefined)) === 'copied') setCopied(true);
    } catch {
      /* cancelled */
    }
  };
  if (done)
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="shared" data-share-code={done.code}>
        {head(L(lang, 'Shared', 'שותף'), <Bi text={payload.title} />, () => go(`p/${done.code}`))}
        <img className="chl-card-img" src={cardUrl} alt={L(lang, 'Share card', 'תמונת השיתוף')} data-share-card="1" />
        <div className="enc-card-soft col">
          <small className="tiny">{L(lang, 'Link', 'קישור')}</small>
          <bdi dir="ltr" className="chl-link" data-share-link={link}>
            {link.replace(/^https?:\/\//, '')}
          </bdi>
        </div>
        <p className="t3">{L(lang, 'The link opens without an account too: hear it, see the notes, try it in free time. To appear on the board, sign in.', 'הקישור נפתח גם בלי חשבון: שומעים, רואים תווים, מנסים בלי קצב. כדי להופיע בלוח צריך להירשם.')}</p>
        <div className="enc-foot">
          <button className="btn primary enc-full" onClick={() => void shareOut()} data-share-out="1">
            <Icon k="share" />
            {copied ? L(lang, 'Link copied', 'הקישור הועתק') : L(lang, 'Send the link', 'לשלוח את הקישור')}
          </button>
          <button className="btn ghost enc-full" onClick={() => go(`p/${done.code}`)} data-share-open="1">
            {L(lang, 'To the challenge page', 'לדף האתגר')}
          </button>
        </div>
      </main>
    );
  const visOpts: { k: Visibility; t: string }[] = [
    { k: 'friends', t: L(lang, 'Friends', 'חברים') },
    { k: 'class', t: L(lang, 'Class', 'הכיתה') },
    { k: 'public', t: L(lang, 'Everyone', 'כולם') },
  ];
  const audioOk = vis === 'public' ? gate.publicAudio : gate.audio;
  return (
    <main className="panel-screen enc-screen chl-screen chl-share" data-chl="share" data-share-problems={problems.join(' ')}>
      {head(L(lang, 'Share', 'לשתף'), <Bi text={T(l.name, lang)} />)}
      <input className="chl-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} aria-label={L(lang, 'Title', 'כותרת')} data-share-title="1" dir="auto" />
      <div className="row wrap chl-chips">
        <span className="ch gh">
          <Bi text={context} />
        </span>
        <span className="ch gh">{INST[inst][lang]}</span>
        <span className="chl-level" data-share-level={payload.level} dir="ltr">
          <button className="ch" onClick={() => setLevel(Math.max(1, auto - 1, payload.level - 1))} disabled={payload.level <= Math.max(1, auto - 1)} aria-label={L(lang, 'Easier', 'קל יותר')}>
            <Icon k="minus" />
          </button>
          <span className="tiny" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            {L(lang, 'Level', 'רמה')} <b>{payload.level}</b>
          </span>
          <button className="ch" onClick={() => setLevel(Math.min(5, auto + 1, payload.level + 1))} disabled={payload.level >= Math.min(5, auto + 1)} aria-label={L(lang, 'Harder', 'קשה יותר')}>
            <Icon k="plus" />
          </button>
        </span>
      </div>
      <div className="chl-scroll-x" role="radiogroup" aria-label={L(lang, 'Style', 'סגנון')}>
        {STYLES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={style === s} className={`ch ${style === s ? 'on' : ''}`} onClick={() => setStyle(style === s ? null : s)} data-share-style={s}>
            <Bi text={STYLE_NAME[s][lang]} />
          </button>
        ))}
      </div>
      <div className="enc-card-flat col chl-kv">
        <div className="row">
          <span className="grow t3">{L(lang, 'Challenge target', 'יעד האתגר')}</span>
          <b className="t2">
            <Tempo bpm={plan.goalBpm} /> · {payload.needed >= 12 ? L(lang, 'all 12', 'כל 12') : payload.needed}
          </b>
        </div>
        <label className="row">
          <span className="grow t3">
            {L(lang, 'Add a clip of my playing', 'לצרף קטע שמע שלי')} <small className="tiny">{L(lang, '(up to 20 s)', '(עד 20 שנ׳)')}</small>
          </span>
          <input type="checkbox" className="enc-tog" checked={audio && audioOk} disabled={!audioOk || !clips?.length} onChange={(e) => setAudio(e.target.checked)} data-share-audio="1" />
        </label>
        {audio && audioOk && clips && clips.length > 1 && (
          <div className="row wrap">
            {clips.map((c) => (
              <button key={c.id} className={`ch ${clip === c.id ? 'on' : ''}`} onClick={() => setClip(c.id)}>
                {dateOf(c.at)} · {c.seconds} {L(lang, 's', 'שנ׳')}
              </button>
            ))}
          </div>
        )}
        {clips && !clips.length && <small className="tiny">{L(lang, 'No recorded audio of this phrase under 20 s yet.', 'עוד אין הקלטת שמע של המשפט עד 20 שנ׳.')}</small>}
      </div>
      <div className="col">
        <b className="t2">{L(lang, 'Who sees it', 'מי רואה')}</b>
        <Seg value={vis} label={L(lang, 'Who sees it', 'מי רואה')} onChange={(v) => setVis(v)} options={visOpts.map((o) => ({ k: o.k, t: o.t }))} />
        {vis === 'class' && classes.length > 1 && (
          <label className="af-row">
            <span>{L(lang, 'Class', 'כיתה')}</span>
            <select value={classPick || classes[0].id} onChange={(e) => setClassPick(e.target.value)} data-share-class="1">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="enc-card-soft row chl-attest">
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} data-share-attest="1" />
        <span className="t3 chl-ink">{L(lang, 'This is my own phrase — not someone else’s melody or recording.', 'זה משפט שלי — לא לחן או הקלטה של מישהו אחר.')}</span>
      </label>
      {blocking.length > 0 && (
        <p className="t3 chl-why" data-share-why={blocking[0]}>
          {why[blocking[0]]}
          {blocking[0] === 'known-melody' && known && (
            <>
              {' '}
              (<Bi text={T(known.title, lang)} />)
            </>
          )}
        </p>
      )}
      {err && <p className="t3 chl-why">{err}</p>}
      {cardUrl && <img className="chl-card-img sm" src={cardUrl} alt={L(lang, 'Share card', 'תמונת השיתוף')} />}
      <div className="enc-foot">
        <button className="btn primary enc-full" disabled={busy || problems.length > 0 || known === undefined} onClick={() => void send()} data-share-send="1">
          <Icon k="share" />
          {vis === 'friends' ? L(lang, 'Share with friends', 'לשתף עם חברים') : vis === 'class' ? L(lang, 'Share with the class', 'לשתף עם הכיתה') : L(lang, 'Share with everyone', 'לשתף עם כולם')}
        </button>
      </div>
    </main>
  );
}

// ───────────────────────────── the challenge page (§11.3) ─────────────────────────────

function ChallengePage({ lang, settings, items, onSettings, head, code, beat, signedIn, onSignIn }: ChallengeProps & { head: Head; code: string; beat: string | null }) {
  const [opened, setOpened] = useState<Opened | null>(null);
  const [scope, setScope] = useState<'friends' | 'all'>('friends');
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [beatInfo, setBeatInfo] = useState<{ from: string; bpm: number; keys: number } | null>(null);
  const [report, setReport] = useState<{ row: BoardRow | null } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [clip, setClip] = useState<string | null>(null);
  const player = usePlayer();
  const young = isYoung(settings.birthYear);
  const book = settings.lickBook ?? {};
  const p = opened?.kind === 'phrase' ? opened.p : null;
  const myLick: Lick | undefined = p ? (book.own ?? []).find((x) => x.id === sharedPhraseId(p.code) || x.shared?.code === p.code) : undefined;

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void openPhrase(code)
      .then((o) => {
        if (!live) return;
        setOpened(o);
        if (o.kind === 'phrase') {
          if (o.p.hasAudio) void clipUrl(o.p.id).then((u) => live && setClip(u));
        }
      })
      .catch(() => live && setOpened({ kind: 'none' }));
    if (beat) void openBeat(beat).then((b) => live && setBeatInfo(b));
    return () => {
      live = false;
    };
  }, [code, beat, signedIn]);
  useEffect(() => {
    if (!p) return;
    let live = true;
    // my result first (from measured takes only), then the board
    void (async () => {
      if (myLick) await syncOne(myLick, items, p.id).catch(() => null);
      const r = await phraseBoard(p.id, scope).catch(() => [] as BoardRow[]);
      if (live) setRows(r);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, scope, tick, myLick?.id]);

  if (!signedIn)
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="page-signin">
        {head(L(lang, 'Lick challenge', 'אתגר ליקים'))}
        <p className="t3">{L(lang, 'Sign in to take the challenge and appear on the board.', 'כדי לקבל את האתגר ולהופיע בלוח צריך להתחבר.')}</p>
        <button className="btn primary enc-full" onClick={onSignIn}>
          {L(lang, 'Sign in', 'להתחבר')}
        </button>
      </main>
    );
  if (!opened)
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="page-loading">
        {head(L(lang, 'Lick challenge', 'אתגר ליקים'))}
        <p className="t3">…</p>
      </main>
    );
  if (opened.kind !== 'phrase' || hiddenSet().has(`${opened.p.id}:`))
    return (
      <main className="panel-screen enc-screen chl-screen" data-chl="page-none">
        {head(L(lang, 'Lick challenge', 'אתגר ליקים'), undefined, () => go(''))}
        <p className="t3" data-chl-locked={opened.kind === 'locked' ? opened.scope : 'none'}>
          {opened.kind === 'locked' ? (
            opened.scope === 'friends' ? (
              <>
                {L(lang, 'This phrase is for the friends of ', 'המשפט הזה לחברים של ')}
                <Bi text={opened.ownerName} />.
              </>
            ) : (
              L(lang, 'This phrase is for a class.', 'המשפט הזה לכיתה.')
            )
          ) : (
            L(lang, 'This challenge is not available (removed, hidden, or the link is wrong).', 'האתגר הזה לא זמין (הוסר, הוסתר, או שהקישור שגוי).')
          )}
        </p>
        <button className="btn ghost enc-full" onClick={() => go('')}>
          {L(lang, 'To the gallery', 'לגלריה')}
        </button>
      </main>
    );
  const ph = p!;
  const a = shareNotes(ph.ref)?.a ?? null;
  const hidden = hiddenSet();
  const board = rankBoard((rows ?? []).filter((r) => !hidden.has(`${ph.id}:${r.userId}`)));
  const myRow = board.creator?.me ? board.creator : (board.ranked.find((r) => r.me) ?? board.mine);
  const passed = myLick ? passedKeys(myLick, items, myLick.instrument ?? 'piano', finalHand(myLick)).length : 0;
  const take = () => {
    const l = lickFromShare(ph.ref, ph.code, ph.ownerName);
    if (!l) return;
    onSettings({ lickBook: withAssignedPhrase(book as LickBook, l) });
    location.hash = `/encore/phrase/${l.id}`;
  };
  const sendBeat = async () => {
    const c = await beatLink(ph.id);
    if (!c) return setMsg(L(lang, 'Post a measured result first.', 'קודם צריך תוצאה מדודה.'));
    const link = phraseLink(location.origin, location.pathname, ph.code, c);
    const text = shareText({ title: ph.title, bpm: ph.goalBpm, keys: ph.needed, lang, beat: myRow ? { bpm: myRow.bestBpm, keys: myRow.keys } : null });
    try {
      await shareWithLink(text, link);
      setMsg(L(lang, 'Link ready.', 'הקישור מוכן.'));
    } catch {
      setMsg(L(lang, 'Link ready.', 'הקישור מוכן.'));
    }
    document.querySelector('[data-beat-link]')?.setAttribute('data-beat-link', c);
  };
  const doReport = async (k: ReportKind) => {
    const row = report?.row ?? null;
    setReport(null);
    const r = await reportShared(ph.id, row ? row.userId : null, k);
    setMsg(r === 'error' ? L(lang, 'Could not send — try again later.', 'לא נשלח — אפשר לנסות מאוחר יותר.') : L(lang, 'Thank you. It is hidden for you and will be reviewed.', 'תודה. זה מוסתר אצלך וייבדק.'));
    if (!row) go('');
    else setTick((t) => t + 1);
  };
  const rowEl = (r: BoardRow & { rank?: number }, tag?: string) => {
    const f = rowFacts(r);
    return (
      <li key={r.userId} className={`chl-row ${r.me ? 'me' : ''}`} data-board-row={r.userId} data-board-me={r.me ? '1' : undefined} data-board-keys={r.keys}>
        <span className="chl-rank">{tag ? '' : r.rank}</span>
        <span className="grow col chl-row-main">
          <b className="t2 chl-name">
            {r.name === 'Player' ? L(lang, 'Player', 'נגן/ית') : <Bi text={r.name} />}
            {tag && <span className="enc-pill">{tag}</span>}
          </b>
          <small className="t3">
            {f.keys} {L(lang, 'keys', 'סולמות')} · <Tempo bpm={f.bpm} /> · <bdi dir="ltr">{f.pct}%</bdi>
            {r.flagged && r.me && <span className="chl-flag"> · {L(lang, 'not measured as playing', 'לא נמדד כנגינה')}</span>}
          </small>
        </span>
        <SourceBadgeL s={r.source} lang={lang} />
        <small className="tiny">{dateOf(r.at)}</small>
        {!r.me && (
          <button className="icon-btn chl-mini" onClick={() => setReport({ row: r })} aria-label={L(lang, 'Report', 'דיווח')} data-row-report={r.userId}>
            <Icon k="flag" size={13} />
          </button>
        )}
      </li>
    );
  };
  return (
    <main className="panel-screen enc-screen chl-screen chl-fit" data-chl="page" data-chl-code={ph.code}>
      {head(
        <Bi text={ph.title} />,
        <>
          {L(lang, 'Lick challenge · by ', 'אתגר ליקים · מאת ')}
          <Bi text={ph.ownerName} />
        </>,
        () => go(''),
        !ph.mine ? (
          <button className="icon-btn" onClick={() => setReport({ row: null })} aria-label={L(lang, 'Report', 'דיווח')} data-phrase-report="1">
            <Icon k="flag" />
          </button>
        ) : undefined,
      )}
      {beatInfo && (
        <p className="enc-card-soft t3 chl-beat" data-beat-from={beatInfo.from}>
          <Bi text={beatInfo.from} /> {L(lang, 'challenges you: beat ', 'מאתגר/ת אותך: לנצח את ')}
          <Tempo bpm={beatInfo.bpm} /> {L(lang, `in ${beatInfo.keys} keys`, `ב־${beatInfo.keys} סולמות`)}
        </p>
      )}
      <div className="enc-card col chl-phrase">
        <MiniStaff code={ph.ref} />
        <div className="row">
          {a && (
            <button className="ch" onClick={() => (player.on === 'notes' ? player.stop() : void player.playNotes(a, ph.goalBpm))} aria-label={L(lang, 'Play', 'להשמיע')} data-chl-play="1">
              <Icon k={player.on === 'notes' ? 'stop' : 'play'} size={12} />
              {L(lang, 'Play', 'להשמיע')}
            </button>
          )}
          {clip && (
            <button className="ch" onClick={() => (player.on === 'clip' ? player.stop() : void player.playClip(clip))} data-chl-clip="1">
              <Icon k="mic" size={12} />
              {L(lang, 'Their clip', 'הקליפ של היוצר')}
            </button>
          )}
          <span className="grow" />
          <span className="enc-bdg" data-level={ph.level}>{L(lang, "Level", "רמה")} <b>{ph.level}</b></span>
        </div>
      </div>
      <div className="row wrap">
        <TargetChips p={ph} lang={lang} />
        <span className="grow" />
        <small className="tiny" data-reached={ph.reached}>
          {L(lang, `${ph.reached} reached the target`, `${ph.reached} הגיעו ליעד`)}
        </small>
      </div>
      {myLick && !ph.mine && (
        <div className="row chl-mine">
          <KeyStrip passed={passed} current n={Math.max(1, ph.needed)} />
          <small className="t3">{L(lang, `${passed} keys at the target`, `${passed} סולמות ביעד`)}</small>
        </div>
      )}
      {ph.mine ? (
        <button className="btn primary enc-full" onClick={() => (location.hash = `/encore/phrase/${myLick?.id ?? ''}`)} disabled={!myLick} data-chl-practice="1">
          {L(lang, 'Practice it', 'לתרגל')}
        </button>
      ) : myLick ? (
        <button className="btn primary enc-full" onClick={() => (location.hash = `/encore/phrase/${myLick.id}`)} data-chl-practice="1">
          {L(lang, 'Keep practicing', 'להמשיך לתרגל')}
        </button>
      ) : (
        <button className="btn primary enc-full" onClick={take} data-chl-take="1">
          {L(lang, 'Take the challenge', 'לקבל את האתגר')}
        </button>
      )}
      <div className="row">
        <b className="t2 grow">{L(lang, 'The board', 'הלוח')}</b>
        {!young && (
          <Seg
            value={scope}
            label={L(lang, 'Board', 'הלוח')}
            onChange={(v) => setScope(v)}
            options={[
              { k: 'friends', t: L(lang, 'Friends', 'חברים') },
              { k: 'all', t: L(lang, 'Everyone', 'כולם') },
            ]}
          />
        )}
      </div>
      <ol className="chl-board" data-board={rows ? rows.length : -1} data-board-scope={scope}>
        {board.creator && rowEl(board.creator, L(lang, 'creator', 'יוצר/ת'))}
        {board.ranked.map((r) => rowEl(r))}
        {board.mine && rowEl(board.mine)}
        {rows && !board.ranked.length && !board.creator && <li className="t3 chl-empty">{L(lang, 'No measured results yet.', 'עוד אין תוצאות מדודות.')}</li>}
      </ol>
      <small className="tiny chl-rule">{L(lang, 'Ranked by keys at the target · clean tempo · accuracy. Measured takes only.', 'דירוג: סולמות ביעד · טמפו נקי · דיוק. רק ניסיונות שנמדדו.')}</small>
      {msg && (
        <p className="t3" data-chl-msg="1">
          {msg}
        </p>
      )}
      {!ph.mine && <ReactionBar lang={lang} p={ph} />}
      {ph.mine && <ReactionCountsLine lang={lang} counts={ph.reactions} />}
      <div className="row chl-actions">
        {!ph.mine && ph.friend && ph.ownerId && (
          <button className="btn ghost grow" onClick={() => go(`gifts/${ph.ownerId}`)} data-chl-gift={ph.ownerId}>
            {L(lang, 'Gift', 'מתנה')}
          </button>
        )}
        {myRow && !myRow.flagged && (
          <button className="btn ghost grow" onClick={() => void sendBeat()} data-beat-link="">
            <Icon k="send" size={13} />
            {L(lang, 'Beat my tempo', 'לנצח את הטמפו שלי')}
          </button>
        )}
      </div>
      {report && <ReportSheet lang={lang} row={!!report.row} onClose={() => setReport(null)} onDone={(k) => void doReport(k)} />}
    </main>
  );
}

// ───────────────────────────── gallery (§11.4) ─────────────────────────────

function PhraseCard({ p, lang, items, book, big = false, line }: { p: SharedPhrase; lang: Lang; items: Record<string, ItemState>; book: LickBook; big?: boolean; line?: React.ReactNode }) {
  const mine = (book.own ?? []).find((x) => x.id === sharedPhraseId(p.code));
  const passed = mine ? passedKeys(mine, items, mine.instrument ?? 'piano', finalHand(mine)).length : null;
  return (
    <button className={`enc-card chl-pcard ${big ? 'big' : ''}`} onClick={() => go(`p/${p.code}`)} data-gallery-phrase={p.code}>
      <MiniStaff code={p.ref} h={big ? 84 : 52} w={big ? 320 : 300} chords={big} />
      <span className="row">
        <b className="t2 grow chl-ellip">
          <Bi text={p.title} />
        </b>
        {passed !== null && <KeyStrip passed={passed} n={Math.max(1, p.needed)} />}
      </span>
      <small className="t3">
        <Bi text={p.ownerName} /> · {L(lang, 'level', 'רמה')} {p.level}
        {p.style ? (
          <>
            {' · '}
            <Bi text={STYLE_NAME[p.style as Style]?.[lang] ?? ''} />
          </>
        ) : null}
        {' · '}
        {line ?? L(lang, `${p.reached} reached the target`, `${p.reached} הגיעו ליעד`)}
      </small>
    </button>
  );
}

function GalleryView({ lang, settings, items, head, onBack }: ChallengeProps & { head: Head }) {
  const [inst, setInst] = useState<LickInstrument | null>(null);
  const [band, setBand] = useState<number | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [g, setG] = useState<Gallery | null>(null);
  const [admin, setAdmin] = useState(false);
  const young = isYoung(settings.birthYear);
  const book = settings.lickBook ?? {};
  useEffect(() => {
    let live = true;
    setG(null);
    void fetchGallery({ instrument: inst, level: band === null ? null : LEVEL_BANDS[band], style })
      .then((x) => live && setG(x))
      .catch(() => live && setG({ featured: null, featuredBy: null, friends: [], rising: [] }));
    return () => {
      live = false;
    };
  }, [inst, band, style]);
  useEffect(() => {
    void reviewList().then((r) => setAdmin(r !== null));
  }, []);
  const chip = (on: boolean, t: React.ReactNode, f: () => void, data: string) => (
    <button type="button" className={`ch ${on ? 'on' : ''}`} aria-pressed={on} onClick={f} data-gfilter={data}>
      {t}
    </button>
  );
  return (
    <main className="panel-screen enc-screen chl-screen chl-fit" data-chl="gallery">
      {head(L(lang, 'Lick challenges', 'אתגרי ליקים'), L(lang, 'Community · this week', 'קהילה · השבוע'), onBack, (
        <span className="row chl-head-btns">
          <button className="icon-btn" onClick={() => go('gifts')} aria-label={L(lang, 'Gifts between friends', 'מתנות בין חברים')} data-chl-gifts="1">
            <GiftIcon size={16} />
          </button>
          <button className="icon-btn" onClick={() => go('mine')} aria-label={L(lang, 'My shared phrases', 'המשפטים ששיתפתי')} data-chl-mine="1">
            <EncoreGlyph size={15} />
          </button>
        </span>
      ))}
      <div className="chl-scroll-x" data-gfilters="1">
        {(['piano', 'guitar', 'bass', 'voice'] as LickInstrument[]).map((k) => chip(inst === k, INST[k][lang], () => setInst(inst === k ? null : k), `inst-${k}`))}
        {LEVEL_BANDS.map((b, i) =>
          chip(
            band === i,
            <>
              {L(lang, 'Level', 'רמה')} <bdi dir="ltr">{b[0] === b[1] ? b[0] : `${b[0]}–${b[1]}`}</bdi>
            </>,
            () => setBand(band === i ? null : i),
            `level-${i}`,
          ),
        )}
        {STYLES.slice(0, 7).map((s) => chip(style === s, <Bi text={STYLE_NAME[s][lang]} />, () => setStyle(style === s ? null : s), `style-${s}`))}
      </div>
      <div className="chl-list" data-gallery={g ? 'ready' : 'loading'}>
        {!g && <p className="t3">…</p>}
        {g && !young && g.featured && (
          <section className="enc-block" data-gallery-featured={g.featured.code}>
            <div className="row">
              <span className="enc-pill ac">{L(lang, 'Phrase of the week', 'משפט השבוע')}</span>
              <span className="grow" />
              <small className="tiny">{L(lang, `ends in ${daysLeftInWeek()} days`, `נגמר בעוד ${daysLeftInWeek()} ימים`)}</small>
            </div>
            <PhraseCard p={g.featured} lang={lang} items={items} book={book} big />
          </section>
        )}
        {g && (
          <section className="enc-block" data-gallery-friends={g.friends.length}>
            <b className="t2">{L(lang, 'From friends', 'מחברים')}</b>
            {g.friends.length ? g.friends.map((p) => <PhraseCard key={p.id} p={p} lang={lang} items={items} book={book} />) : <small className="t3">{L(lang, 'Nothing new from friends this week.', 'אין חדש מחברים השבוע.')}</small>}
          </section>
        )}
        {g && !young && (
          <section className="enc-block" data-gallery-rising={g.rising.length}>
            <b className="t2">{L(lang, 'Rising this week', 'עולים השבוע')}</b>
            {g.rising.length ? (
              g.rising.map((p) => <PhraseCard key={p.id} p={p} lang={lang} items={items} book={book} line={L(lang, `${p.learnedWeek} learned it this week`, `${p.learnedWeek} למדו את זה השבוע`)} />)
            ) : (
              <small className="t3">{L(lang, 'Nothing yet this week.', 'עוד אין השבוע.')}</small>
            )}
          </section>
        )}
        {young && <small className="t3">{L(lang, 'In young-player mode you see phrases from friends and your class.', 'במצב שחקן צעיר רואים משפטים של חברים ושל הכיתה.')}</small>}
        {g && (
          <p className="tiny enc-center" data-gallery-end="1">
            {L(lang, 'That is all for this week.', 'זה הכול לשבוע הזה.')}
          </p>
        )}
      </div>
      {admin && (
        <button className="link" onClick={() => go('review')} data-chl-review="1">
          {L(lang, 'Review reports', 'דיווחים לבדיקה')}
        </button>
      )}
    </main>
  );
}

// ───────────────────────────── my shares ─────────────────────────────

function MineView({ lang, head }: { lang: Lang; head: Head }) {
  const [list, setList] = useState<SharedPhrase[] | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const load = () => void myShares().then(setList).catch(() => setList([]));
  useEffect(load, []);
  const visName = (v: Visibility) => (v === 'friends' ? L(lang, 'friends', 'חברים') : v === 'class' ? L(lang, 'class', 'הכיתה') : L(lang, 'everyone', 'כולם'));
  return (
    <main className="panel-screen enc-screen chl-screen chl-fit" data-chl="mine">
      {head(L(lang, 'My shared phrases', 'המשפטים ששיתפתי'), undefined, () => go(''))}
      <div className="chl-list">
        {list && !list.length && <p className="t3">{L(lang, 'Nothing shared yet. Share from one of your phrases in Licks.', 'עוד לא שיתפת. משתפים מתוך משפט שלך בליקים.')}</p>}
        {list?.map((p) => (
          <div key={p.id} className="enc-card col" data-mine-phrase={p.code}>
            <button className="chl-plain row" onClick={() => go(`p/${p.code}`)}>
              <b className="t2 grow chl-ellip">
                <Bi text={p.title} />
              </b>
              <span className="enc-pill">{visName(p.visibility)}</span>
            </button>
            <small className="t3">
              {L(lang, `${p.reached} reached the target`, `${p.reached} הגיעו ליעד`)}
              {p.status === 'held' && <> · {L(lang, 'held for review', 'מוחזק לבדיקה')}</>}
            </small>
            <ReactionCountsLine lang={lang} counts={p.reactions} />
            {ask === p.id ? (
              <div className="row">
                <button className="btn ghost grow" onClick={() => setAsk(null)}>
                  {L(lang, 'Keep', 'להשאיר')}
                </button>
                <button className="btn grow" onClick={() => void deleteShare(p.id).then(() => (setAsk(null), load()))} data-mine-delete-yes={p.code}>
                  {L(lang, 'Delete with its board', 'למחוק עם הלוח')}
                </button>
              </div>
            ) : (
              <button className="link" onClick={() => setAsk(p.id)} data-mine-delete={p.code}>
                {L(lang, 'Stop sharing', 'להפסיק לשתף')}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

// ───────────────────────────── owner / admin review (§11.5) ─────────────────────────────

function ReviewView({ lang, head }: { lang: Lang; head: Head }) {
  const [list, setList] = useState<ReviewItem[] | null | undefined>(undefined);
  const [code, setCode] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const load = () => void reviewList().then(setList);
  useEffect(load, []);
  const statusName = (st: string) =>
    st === 'held' ? L(lang, 'held', 'מוחזק') : st === 'hidden' ? L(lang, 'hidden', 'מוסתר') : st === 'removed' ? L(lang, 'removed', 'הוסר') : L(lang, 'live', 'פעיל');
  const kindName = (k: ReportKind) => (k === 'copied' ? L(lang, 'not their own', 'לא שלו/ה') : k === 'implausible' ? L(lang, 'implausible', 'לא אמין') : L(lang, 'other', 'אחר'));
  return (
    <main className="panel-screen enc-screen chl-screen chl-fit" data-chl="review">
      {head(L(lang, 'Reports to review', 'דיווחים לבדיקה'), L(lang, 'Lick challenges', 'אתגרי ליקים'), () => go(''))}
      {list === null && <p className="t3">{L(lang, 'Admins only.', 'למנהלים בלבד.')}</p>}
      <div className="chl-list">
        {list?.length === 0 && <p className="t3">{L(lang, 'Nothing to review.', 'אין מה לבדוק.')}</p>}
        {list?.map((r) => (
          <div key={`${r.phraseId}:${r.userId ?? ''}`} className="enc-card col" data-review-item={r.kind} data-review-status={r.status}>
            <span className="row">
              <b className="t2 grow chl-ellip">
                <Bi text={r.title} />
              </b>
              <bdi dir="ltr" className="tiny">
                {r.code}
              </bdi>
            </span>
            <small className="t3">
              {r.kind === 'phrase' ? L(lang, 'Phrase by ', 'משפט של ') : L(lang, 'Board row of ', 'שורה בלוח של ')}
              <Bi text={r.kind === 'phrase' ? r.ownerName : (r.userName ?? '')} /> · {r.reports.map((k) => `${kindName(k.kind)} ×${k.n}`).join(' · ')} · {statusName(r.status)}
            </small>
            {r.facts && (
              <small className="t3">
                {r.facts.keys} {L(lang, 'keys', 'סולמות')} · <Tempo bpm={r.facts.bpm} /> · <bdi dir="ltr">{Math.round(r.facts.acc * 100)}%</bdi> · <SourceBadgeL s={r.facts.source} lang={lang} />
                {r.facts.digest && (
                  <>
                    {' · '}
                    <bdi dir="ltr">{r.facts.digest}</bdi>
                  </>
                )}
              </small>
            )}
            <div className="row">
              <button className="btn ghost grow" onClick={() => void resolveReview(r.kind, r.phraseId, r.userId, 'restore').then(load)} data-review-restore="1">
                {L(lang, 'Restore', 'להחזיר')}
              </button>
              <button className="btn grow" onClick={() => void resolveReview(r.kind, r.phraseId, r.userId, 'remove').then(load)} data-review-remove="1">
                {L(lang, 'Remove', 'להסיר')}
              </button>
            </div>
          </div>
        ))}
      </div>
      {list && (
        <div className="enc-card-soft col">
          <small className="tiny">{L(lang, 'Replace this week’s featured phrase (code):', 'להחליף את משפט השבוע (קוד):')}</small>
          <div className="row">
            <input className="chl-input grow" dir="ltr" value={code} maxLength={8} onChange={(e) => setCode(e.target.value.toUpperCase())} data-feature-code="1" />
            <button
              className="btn"
              onClick={() =>
                void featurePhrase(code)
                  .then(() => setNote(L(lang, 'Featured.', 'נבחר.')))
                  .catch(() => setNote(L(lang, 'Only a public, live phrase.', 'רק משפט ציבורי ופעיל.')))
              }
              data-feature-set="1"
            >
              {L(lang, 'Feature', 'לבחור')}
            </button>
          </div>
          {note && <small className="t3">{note}</small>}
        </div>
      )}
    </main>
  );
}

// ───────────────────────────── public link page (§11.7) ─────────────────────────────

/** Free time on the on-screen keys: the next note is marked; a right key moves on. Nothing is saved, no account. */
function TryKeys({ a, lang }: { a: PhraseAssignment; lang: Lang }) {
  const t = 60 + mod(a.homeKey) - (mod(a.homeKey) > 5 ? 12 : 0);
  const line = useMemo(() => a.rh.map(([s]) => t + s), [a, t]);
  const lo0 = Math.min(...line);
  const hi0 = Math.max(...line);
  const lo = lo0 - mod(lo0); // from a C
  const hi = Math.max(hi0, lo + 11);
  const keys = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const white = keys.filter((m) => ![1, 3, 6, 8, 10].includes(mod(m)));
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const done = i >= line.length;
  const tap = async (m: number) => {
    await piano.unlock();
    void piano.play([{ midi: m, start: 0.01, duration: 0.45, velocity: 0.72 }], 0.5, new AbortController().signal).catch(() => {});
    if (done) return;
    if (m === line[i]) {
      setRight((r) => r + 1);
      setI(i + 1);
    } else setWrong((w) => w + 1);
  };
  const W = 100 / white.length;
  return (
    <div className="col chl-try" data-try-i={i} data-try-n={line.length}>
      <small className="t3">
        {done
          ? L(lang, `Played in free time: ${right} of ${line.length} right${wrong ? `, ${wrong} wrong keys` : ''}.`, `נוגן בלי קצב: ${right} מתוך ${line.length} נכונים${wrong ? `, ${wrong} מקשים שגויים` : ''}.`)
          : L(lang, `Try it in free time — note ${i + 1} of ${line.length} is marked.`, `לנסות בלי קצב — תו ${i + 1} מתוך ${line.length} מסומן.`)}
      </small>
      <div className="chl-keys" dir="ltr" role="group" aria-label={L(lang, 'Keys', 'מקשים')}>
        {white.map((m, k) => (
          <button key={m} className={`chl-w ${!done && line[i] === m ? 'next' : ''}`} style={{ left: `${k * W}%`, width: `${W}%` }} onPointerDown={() => void tap(m)} aria-label={kName(m)} data-key={m} />
        ))}
        {keys
          .filter((m) => [1, 3, 6, 8, 10].includes(mod(m)))
          .map((m) => {
            const k = white.findIndex((w) => w > m);
            return <button key={m} className={`chl-b ${!done && line[i] === m ? 'next' : ''}`} style={{ left: `${k * W - W * 0.3}%`, width: `${W * 0.6}%` }} onPointerDown={() => void tap(m)} aria-label={kName(m)} data-key={m} />;
          })}
      </div>
      {done && (
        <button className="link" onClick={() => (setI(0), setRight(0), setWrong(0))} data-try-again="1">
          {L(lang, 'Again', 'שוב')}
        </button>
      )}
    </div>
  );
}

export function PhrasePublicScreen({ code, beat, lang, signedIn, onOpenInApp, onSignIn, onHome }: { code: string; beat: string | null; lang: Lang; signedIn: boolean; onOpenInApp: () => void; onSignIn: () => void; onHome: () => void }) {
  const [p, setP] = useState<SharedPhrase | null | undefined>(undefined);
  const [clip, setClip] = useState<string | null>(null);
  const player = usePlayer();
  useEffect(() => {
    if (!CHALLENGES_ON()) return setP(null);
    let live = true;
    void openPublic(code)
      .then((x) => {
        if (!live) return;
        setP(x);
        if (x?.hasAudio) void clipUrl(x.id).then((u) => live && setClip(u));
      })
      .catch(() => live && setP(null));
    return () => {
      live = false;
    };
  }, [code]);
  const a = p ? (shareNotes(p.ref)?.a ?? null) : null;
  return (
    <main className="panel-screen enc-screen chl-screen chl-public" data-chl="public" data-public-code={code}>
      <header className="row chl-brand">
        <EncoreGlyph size={16} />
        <b className="t2 grow">{L(lang, 'The 7th Sense · Lick challenge', 'החוש ה־7 · אתגר ליקים')}</b>
        <button className="link" onClick={onHome}>
          {L(lang, 'Home', 'לדף הבית')}
        </button>
      </header>
      {p === undefined && <p className="t3">…</p>}
      {p === null && (
        <p className="t3" data-public-none="1">
          {CHALLENGES_ON() ? L(lang, 'This phrase is not public, or the link is wrong. Friends-only phrases open inside the app.', 'המשפט הזה לא ציבורי, או שהקישור שגוי. משפטים לחברים נפתחים בתוך האפליקציה.') : L(lang, 'Lick challenges are not available yet.', 'אתגרי ליקים עוד לא זמינים.')}
        </p>
      )}
      {p && (
        <>
          <h1 className="chl-pub-title">
            <Bi text={p.title} />
          </h1>
          <small className="t3">
            {L(lang, 'by ', 'מאת ')}
            <Bi text={p.ownerName} /> · {INST[p.instrument][lang]} · {L(lang, 'level', 'רמה')} {p.level} · {L(lang, `${p.reached} reached the target`, `${p.reached} הגיעו ליעד`)}
          </small>
          <div className="enc-card col">
            <MiniStaff code={p.ref} />
            <div className="row">
              {a && (
                <button className="ch" onClick={() => (player.on === 'notes' ? player.stop() : void player.playNotes(a, p.goalBpm))} data-public-play="1">
                  <Icon k={player.on === 'notes' ? 'stop' : 'play'} size={12} />
                  {L(lang, 'Play', 'להשמיע')}
                </button>
              )}
              {clip && (
                <button className="ch" onClick={() => (player.on === 'clip' ? player.stop() : void player.playClip(clip))} data-public-clip="1">
                  <Icon k="mic" size={12} />
                  {L(lang, 'Their clip', 'הקליפ של היוצר')}
                </button>
              )}
              <span className="grow" />
              <TargetChips p={p} lang={lang} />
            </div>
          </div>
          {a && <TryKeys a={a} lang={lang} />}
          <div className="enc-foot">
            {signedIn ? (
              <button className="btn primary enc-full" onClick={onOpenInApp} data-public-open="1">
                {L(lang, 'Open the challenge', 'לפתוח את האתגר')}
              </button>
            ) : (
              <button className="btn primary enc-full" onClick={onSignIn} data-public-signin="1">
                {L(lang, 'Sign up to appear on the board', 'להירשם כדי להופיע בלוח')}
              </button>
            )}
            {beat && <small className="tiny enc-center">{L(lang, 'A friend sent you a tempo to beat — it opens after signing in.', 'חבר/ה שלח/ה טמפו לנצח — נפתח אחרי ההרשמה.')}</small>}
          </div>
        </>
      )}
    </main>
  );
}

/** Small entry button (Encore phrase / "yours" moment): opens the share sheet for a phrase. Hidden while the flag is off. */
export function ShareButton({ lang, phraseId, className = 'btn ghost enc-full' }: { lang: Lang; phraseId: string; className?: string }) {
  if (!CHALLENGES_ON()) return null;
  return (
    <button className={className} onClick={() => go(`share/${encodeURIComponent(phraseId)}`)} data-enc-share={phraseId}>
      <Icon k="share" size={14} />
      {L(lang, 'Share as a challenge', 'לשתף כאתגר')}
    </button>
  );
}
export { challengesMockOn };
