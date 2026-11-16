// My recordings v2 (SPEC-PHRASE-STUDIO §6.5–6.6; screens docs/phrase-studio-preview slides 18–19): playlists
// (create, reorder, loop one / all / A–B) played in the background through one media element with lock-screen
// controls (Media Session); MIDI takes rendered to audio with the app's instruments (cached, in the budget), A–B
// spans bounced to short clips that loop gaplessly; export a take (audio file / .mid) through the share sheet or a
// download; the whole-session recording switch.

import { useEffect, useState, type ReactNode } from 'react';
import '../recordings2.css';
import type { NoteEvent } from '../engine/lesson';
import { getTake, getTakeAudio, listHeads, notesSpan, subscribeRecordings, takeTitle, unpackNotes, type RecPlaylist, type RecTake, type TakeHead } from '../storage/recordings';
import { addTakesTo, deletePlaylist, getPlaylist, listPlaylists, loopOf, moveInPlaylist, playlistName, refreshReserve, removeFromPlaylist, renderBytes, savePlaylist, setLoop, STARRED_ID } from '../storage/recExtras';
import { backgroundSource, renderedBytes } from '../audio/renderTake';
import { bgPlayer, installedApp, isIOSDevice, type BgItem, type BgLoop, type BgState } from '../audio/bgPlayer';
import { midiFileOf } from '../engine/midiFile';
import { sessionRecOn, sessionRecSupported, startSessionRec, stopSessionRec, subscribeSessionRec } from '../storage/sessionRec';
import { piano } from './services';
import { bandEvents, Bidi, RIcon } from './Recordings';

type Lang = 'en' | 'he';
const N = ({ children }: { children: ReactNode }) => <bdi dir="ltr">{children}</bdi>;

export const RX2 = {
  playlists: { en: 'Playlists', he: 'רשימות השמעה' },
  newList: { en: 'New playlist', he: 'רשימה חדשה' },
  name: { en: 'Name', he: 'שם' },
  create: { en: 'Create', he: 'ליצור' },
  addTo: { en: 'Add to a playlist', he: 'להוסיף לרשימה' },
  added: { en: 'Added', he: 'נוסף' },
  empty: { en: 'Nothing here yet — add takes from the player.', he: 'עוד אין כאן כלום — מוסיפים מהנגן.' },
  takes: { en: 'takes', he: 'ניסיונות' },
  play: { en: 'Play', he: 'לנגן' },
  pause: { en: 'Pause', he: 'עצירה' },
  next: { en: 'Next', he: 'הבא' },
  prev: { en: 'Previous', he: 'הקודם' },
  repeat: { en: 'Repeat', he: 'חזרה' },
  off: { en: 'Off', he: 'בלי' },
  one: { en: 'One', he: 'אחד' },
  all: { en: 'All', he: 'הכול' },
  ab: { en: 'A–B', he: 'A–B' },
  up: { en: 'Move up', he: 'למעלה' },
  down: { en: 'Move down', he: 'למטה' },
  remove: { en: 'Remove', he: 'להסיר' },
  del: { en: 'Delete playlist', he: 'למחוק את הרשימה' },
  speed: { en: 'Speed', he: 'מהירות' },
  bg: { en: 'Background playback', he: 'השמעה ברקע' },
  bgBody: { en: 'Keeps playing with the screen locked; controls on the lock screen and headphones. MIDI takes are rendered to audio the first time; A–B loops become a short clip. Volume is evened out.', he: 'ממשיך לנגן עם מסך נעול, עם שליטה ממסך הנעילה ומהאוזניות. ניסיונות MIDI מוקלטים לשמע בפעם הראשונה; לולאת A–B נצרבת לקליפ קצר. העוצמה מנורמלת.' },
  iosNote: { en: 'On iPhone: add the app to the Home Screen to keep listening with the screen locked.', he: 'באייפון: הוסיפו את האפליקציה למסך הבית כדי להמשיך לשמוע עם מסך נעול.' },
  rendering: { en: 'Preparing audio…', he: 'מכין שמע…' },
  inCache: { en: 'rendered audio', he: 'שמע מוכן' },
  playBg: { en: 'Play in the background', he: 'לנגן ברקע' },
  noAb: { en: 'Set A and B in the player first', he: 'קודם לסמן A ו־B בנגן' },
  export: { en: 'Export', he: 'לייצא' },
  exportAudio: { en: 'Audio file', he: 'קובץ שמע' },
  exportMidi: { en: 'MIDI file (.mid)', he: 'קובץ MIDI ‏(.mid)' },
  exportNote: { en: 'Opens the share sheet (Save to Files) where the device offers it, otherwise a download. Inside a preview frame downloads may be blocked.', he: 'נפתח גיליון השיתוף (שמירה בקבצים) כשהמכשיר מאפשר, אחרת הורדה. בתוך חלון תצוגה מקדימה הורדות עלולות להיחסם.' },
  exportFail: { en: 'This browser did not allow the file.', he: 'הדפדפן לא אפשר את הקובץ.' },
  sessionRec: { en: 'Record the whole session', he: 'להקליט את כל האימון' },
  sessionRecOn: { en: 'Recording the session', he: 'מקליט את האימון' },
  sessionRecHint: { en: 'One continuous file alongside the takes: what the app plays and your microphone while it listens. Stays on this device.', he: 'קובץ אחד רציף לצד הניסיונות: מה שהאפליקציה מנגנת והמיקרופון כשהוא מקשיב. נשאר במכשיר.' },
  wholeSession: { en: 'Whole session', he: 'כל האימון' },
  close: { en: 'Close', he: 'סגירה' },
  back: { en: 'Back', he: 'חזרה' },
};

// ───────────────────────────── a take as a background item ─────────────────────────────

/** The player's own notes as events (seconds from beat 0). */
const myEvents = (t: RecTake): NoteEvent[] => unpackNotes(t.notes).map((n) => ({ midi: n.pitch, start: n.on / 1000, duration: Math.max(0.06, ((n.off ?? n.on + 250) - n.on) / 1000), velocity: Math.max(0.15, n.vel / 127) }));
/** A take's events on a timeline starting at 0 (a pickup before beat 0 moves everything right), and its length. */
export function takeTimeline(t: RecTake, mix: 'me' | 'band' | 'bandOnly' = 'band'): { events: NoteEvent[]; seconds: number; shift: number } {
  const band = mix !== 'me' ? bandEvents(t) : null;
  const evs = [...(mix !== 'bandOnly' ? myEvents(t) : []), ...(band ?? [])];
  const [n0, n1] = notesSpan(unpackNotes(t.notes));
  const shift = Math.max(0, -Math.min(0, n0 / 1000, ...evs.map((e) => e.start)));
  const end = Math.max(n1 / 1000, (t.durationMs || 0) / 1000, ...evs.map((e) => e.start + e.duration));
  return { events: evs.map((e) => ({ ...e, start: e.start + shift })), seconds: end + shift, shift };
}

/** The background item of a take (A–B: the span in seconds on the take's own timeline). */
export function bgItemOf(t: RecTake, album: string, lang: Lang, ab?: [number, number] | null): BgItem {
  const audio = !!t.audioId;
  const tl = audio ? null : takeTimeline(t);
  const span = ab ? ([ab[0] + (tl?.shift ?? 0), ab[1] + (tl?.shift ?? 0)] as [number, number]) : null;
  return {
    takeId: t.id,
    title: takeTitle(t, lang),
    album,
    clip: !!span,
    roll: unpackNotes(t.notes).map((n) => ({ pitch: n.pitch, on: n.on })),
    source: async () => {
      const r = await backgroundSource({ takeId: t.id, audio: audio ? () => getTakeAudio(t.id) : undefined, events: tl ? () => tl.events : undefined, seconds: tl?.seconds ?? t.durationMs / 1000, mix: audio ? 'audio' : 'band', span, engine: piano });
      return r?.blob ?? null;
    },
  };
}

/** Play a playlist from `index` in the background (from a tap). */
export async function playPlaylist(p: RecPlaylist, index: number, lang: Lang) {
  const pl = await loopOf(p);
  const takes = (await Promise.all(pl.takeIds.map((id) => getTake(id)))).filter((t): t is RecTake => !!t && !t.deletedAt);
  const name = playlistName(pl, lang);
  bgPlayer.lang = lang;
  const items = takes.map((t) => bgItemOf(t, name, lang, pl.loop === 'ab' && pl.abTake === t.id ? pl.ab : null));
  await piano.unlock().catch(() => {});
  const start = pl.loop === 'ab' && pl.abTake ? Math.max(0, takes.findIndex((t) => t.id === pl.abTake)) : index;
  await bgPlayer.playQueue(items, start, { loop: pl.loop as BgLoop });
}

export function useBg(): BgState {
  const [s, setS] = useState(bgPlayer.state);
  useEffect(() => bgPlayer.subscribe(() => setS(bgPlayer.state)), []);
  return s;
}

// ───────────────────────────── export ─────────────────────────────

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'take';
const extOf = (type: string) => (/wav/.test(type) ? 'wav' : /mp4|aac|m4a/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm');
/** Hand a file to the share sheet where offered, else download it. */
export async function shareOrDownload(blob: Blob, name: string): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const file = new File([blob], name, { type: blob.type });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: name });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'shared';
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
export function takeFileName(t: RecTake, lang: Lang, ext: string) {
  return `${safeName(takeTitle(t, lang))} ${t.at.slice(0, 10)}.${ext}`;
}
/** The take as audio: its recording, or (MIDI) rendered with the app's instruments. */
export async function exportTakeAudio(t: RecTake, lang: Lang) {
  const blob = t.audioId ? await getTakeAudio(t.id) : await bgItemOf(t, '', lang).source();
  if (!blob) return 'failed' as const;
  return shareOrDownload(blob, takeFileName(t, lang, extOf(blob.type)));
}
export function takeMidiBytes(t: RecTake, lang: Lang): Uint8Array {
  return midiFileOf(unpackNotes(t.notes), { bpm: t.bpm, meter: t.meter, t0: 0, name: takeTitle(t, lang) });
}
export async function exportTakeMidi(t: RecTake, lang: Lang) {
  const b = takeMidiBytes(t, lang);
  return shareOrDownload(new Blob([b as BlobPart], { type: 'audio/midi' }), takeFileName(t, lang, 'mid'));
}

// ───────────────────────────── sheets ─────────────────────────────

function Sheet({ lang, title, onClose, children }: { lang: Lang; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet rec-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="rec-sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn small" onClick={onClose} aria-label={RX2.close[lang]}>
            <RIcon k="close" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function AddToPlaylistSheet({ lang, takeIds, onClose }: { lang: Lang; takeIds: string[]; onClose: () => void }) {
  const [lists, setLists] = useState<RecPlaylist[] | null>(null);
  const [name, setName] = useState('');
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => void listPlaylists().then((l) => setLists(l.filter((p) => p.id !== STARRED_ID && !p.id.startsWith('pl-folder:')))), []);
  const add = async (id: string | null) => {
    const p = await addTakesTo(id, takeIds, name || RX2.newList[lang]);
    setDone(p.id);
    setTimeout(onClose, 500);
  };
  return (
    <Sheet lang={lang} title={RX2.addTo[lang]} onClose={onClose}>
      <ul className="rec-history" data-rec-addto="1">
        {(lists ?? []).map((p) => (
          <li key={p.id}>
            <button className={`rec-folder-row ${done === p.id ? 'on' : ''}`} onClick={() => void add(p.id)} data-rec-addto-list={p.id}>
              <span className="grow">
                <Bidi text={playlistName(p, lang)} />
              </span>
              <small>
                {done === p.id ? RX2.added[lang] : <N>{p.takeIds.length}</N>}
              </small>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="rec-rename"
        onSubmit={(e) => {
          e.preventDefault();
          void add(null);
        }}
      >
        <label>
          <small>{RX2.newList[lang]}</small>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={RX2.name[lang]} data-rec-newlist-name="1" />
        </label>
        <button className="btn small" type="submit" data-rec-newlist="1">
          {RX2.create[lang]}
        </button>
      </form>
    </Sheet>
  );
}

export function ExportSheet({ lang, take, onClose }: { lang: Lang; take: RecTake; onClose: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<'shared' | 'downloaded' | 'failed'>) => {
    setBusy(true);
    const r = await f().catch(() => 'failed' as const);
    setBusy(false);
    if (r === 'failed') setMsg(RX2.exportFail[lang]);
    else onClose();
  };
  const hasNotes = !!take.notes?.length;
  return (
    <Sheet lang={lang} title={RX2.export[lang]} onClose={onClose}>
      <button className="rec-menu-row" disabled={busy || (!take.audioId && !hasNotes)} onClick={() => void run(() => exportTakeAudio(take, lang))} data-rec-export-audio="1">
        <RIcon k="voice" size={16} />
        <span className="grow">{RX2.exportAudio[lang]}</span>
        <small>
          <N>{take.audioId ? extOf(take.audioType ?? '') : 'wav'}</N>
        </small>
      </button>
      {hasNotes && (
        <button className="rec-menu-row" disabled={busy} onClick={() => void run(() => exportTakeMidi(take, lang))} data-rec-export-midi="1">
          <RIcon k="keys" size={16} />
          <span className="grow">{RX2.exportMidi[lang]}</span>
        </button>
      )}
      <p className="rec-note">{busy ? RX2.rendering[lang] : (msg ?? RX2.exportNote[lang])}</p>
    </Sheet>
  );
}

// ───────────────────────────── the now-playing bar ─────────────────────────────

const ICO = {
  prev: <path d="M7 6v12M18 6l-8 6 8 6z" />,
  next: <path d="M17 6v12M6 6l8 6-8 6z" />,
  up: <path d="M6 14l6-6 6 6" />,
  down: <path d="M6 10l6 6 6-6" />,
  bg: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <path d="M10 15l2-1.2 2 1.2V9.5h-4z" />
    </>
  ),
  list: <path d="M4 7h11M4 12h11M4 17h7M18 14v6M15 17h6" />,
};
export const XIcon = ({ k, size = 18 }: { k: keyof typeof ICO; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {ICO[k]}
  </svg>
);
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export function NowPlaying({ lang }: { lang: Lang }) {
  const s = useBg();
  const it = s.items[s.index];
  if (!it) return null;
  return (
    <div className="rec-now" data-rec-now="1" data-rec-now-playing={s.playing ? '1' : '0'}>
      <div className="rec-now-main">
        <b>
          <Bidi text={it.title} />
          {it.clip && <N> · A–B</N>}
        </b>
        <small>
          {s.loading ? RX2.rendering[lang] : <Bidi text={it.album} />} · <N>{mmss(s.pos)}</N>
        </small>
      </div>
      <div className="rec-now-tools" dir="ltr">
        <button className="icon-btn small" onClick={() => void bgPlayer.step(-1)} aria-label={RX2.prev[lang]}>
          <XIcon k="prev" />
        </button>
        <button className="icon-btn small rec-now-play" onClick={() => bgPlayer.toggle()} aria-label={s.playing ? RX2.pause[lang] : RX2.play[lang]} data-rec-now-toggle="1">
          <RIcon k={s.playing ? 'pause' : 'play'} fill={!s.playing} />
        </button>
        <button className="icon-btn small" onClick={() => void bgPlayer.step(1)} aria-label={RX2.next[lang]}>
          <XIcon k="next" />
        </button>
        <button className="icon-btn small ghosty" onClick={() => bgPlayer.stop()} aria-label={RX2.close[lang]}>
          <RIcon k="close" size={16} />
        </button>
      </div>
    </div>
  );
}

export function BackgroundNote({ lang }: { lang: Lang }) {
  const ios = isIOSDevice() && !installedApp();
  return (
    <div className="rec-bgnote" data-rec-bgnote="1">
      <b>{RX2.bg[lang]}</b>
      <small>{RX2.bgBody[lang]}</small>
      {ios && <small className="rec-ios">{RX2.iosNote[lang]}</small>}
    </div>
  );
}

// ───────────────────────────── playlists ─────────────────────────────

export function PlaylistsScreen({ lang, id, onBack, onOpenTake }: { lang: Lang; id: string | null; onBack: () => void; onOpenTake: (id: string) => void }) {
  if (id) return <PlaylistView lang={lang} id={id} onBack={onBack} onOpenTake={onOpenTake} />;
  return <PlaylistList lang={lang} onBack={onBack} />;
}

function useTick() {
  const [n, setN] = useState(0);
  useEffect(() => subscribeRecordings(() => setN((x) => x + 1)), []);
  return n;
}

function PlaylistList({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const n = useTick();
  const [lists, setLists] = useState<RecPlaylist[] | null>(null);
  const [cache, setCache] = useState(0);
  const [name, setName] = useState('');
  useEffect(() => {
    void listPlaylists().then(setLists);
    void renderBytes().then(setCache);
    void refreshReserve();
  }, [n]);
  return (
    <main className="panel-screen recordings rec-lists" data-recordings="playlists">
      <header className="screen-head rec-head">
        <button className="icon-btn" onClick={onBack} aria-label={RX2.back[lang]}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{RX2.playlists[lang]}</h1>
      </header>
      <ul className="rec-pl-list">
        {(lists ?? []).map((p) => (
          <li key={p.id}>
            <button className="rec-pl-row" onClick={() => (location.hash = `/recordings/playlist/${encodeURIComponent(p.id)}`)} data-rec-playlist={p.id}>
              <XIcon k="list" />
              <span className="grow">
                <Bidi text={playlistName(p, lang)} />
              </span>
              <small>
                <N>{p.takeIds.length}</N> {RX2.takes[lang]}
              </small>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="rec-rename"
        onSubmit={(e) => {
          e.preventDefault();
          void addTakesTo(null, [], name || RX2.newList[lang]).then(() => setName(''));
        }}
      >
        <label>
          <small>{RX2.newList[lang]}</small>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={RX2.name[lang]} data-rec-pl-name="1" />
        </label>
        <button className="btn small" type="submit" data-rec-pl-create="1">
          {RX2.create[lang]}
        </button>
      </form>
      <BackgroundNote lang={lang} />
      {cache > 0 && (
        <small className="rec-note">
          {RX2.inCache[lang]}: <N>{Math.round(cache / 1e6)} MB</N>
        </small>
      )}
      <NowPlaying lang={lang} />
    </main>
  );
}

function PlaylistView({ lang, id, onBack, onOpenTake }: { lang: Lang; id: string; onBack: () => void; onOpenTake: (id: string) => void }) {
  const n = useTick();
  const [p, setP] = useState<RecPlaylist | null | undefined>(undefined);
  const [heads, setHeads] = useState<Record<string, TakeHead>>({});
  const bg = useBg();
  useEffect(() => {
    void getPlaylist(id).then(async (x) => setP(x ? await loopOf(x) : null));
    void listHeads({}).then((hs) => setHeads(Object.fromEntries(hs.map((h) => [h.id, h]))));
  }, [id, n]);
  if (p === undefined) return <main className="panel-screen recordings" data-recordings="playlist" />;
  if (!p)
    return (
      <main className="panel-screen recordings" data-recordings="playlist">
        <header className="screen-head rec-head">
          <button className="icon-btn" onClick={onBack} aria-label={RX2.back[lang]}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{RX2.playlists[lang]}</h1>
        </header>
      </main>
    );
  const own = p.id !== STARRED_ID && !p.id.startsWith('pl-folder:');
  const save = (x: RecPlaylist) => {
    setP(x);
    void savePlaylist(x);
  };
  const playing = bg.items.length > 0 && bg.items[0]?.album === playlistName(p, lang);
  const ids = p.takeIds.filter((t) => heads[t]);
  const abSpan = p.ab ?? null;
  const setMode = (m: BgLoop) => {
    if (m === 'ab') {
      const t = ids.find((x) => x === p.abTake) ?? null;
      if (!t || !abSpan) return;
      save(setLoop(p, 'ab', { take: t, span: abSpan }));
    } else if (m === 'one' || m === 'all') save(setLoop(p, m));
    bgPlayer.setLoop(m);
  };
  const est = ids.reduce((a, t) => a + (heads[t]?.audioId ? 0 : renderedBytes((heads[t]?.durationMs ?? 0) / 1000)), 0);
  return (
    <main className="panel-screen recordings rec-playlist" data-recordings="playlist" data-rec-pl-loop={p.loop} data-rec-pl-n={ids.length}>
      <header className="screen-head rec-head">
        <button className="icon-btn" onClick={onBack} aria-label={RX2.back[lang]}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>
          <Bidi text={playlistName(p, lang)} />
        </h1>
        {own && (
          <div className="rec-head-tools">
            <button className="icon-btn small" onClick={() => void deletePlaylist(p.id).then(onBack)} aria-label={RX2.del[lang]}>
              <RIcon k="trash" />
            </button>
          </div>
        )}
      </header>
      <div className="rec-pl-bar">
        <button className="btn primary" disabled={!ids.length} onClick={() => void playPlaylist({ ...p, takeIds: ids }, 0, lang)} data-rec-pl-play="1">
          <RIcon k="play" fill size={16} /> {RX2.playBg[lang]}
        </button>
        <div className="ps-seg rec-pl-loop" role="radiogroup" aria-label={RX2.repeat[lang]}>
          {(['one', 'all', 'ab'] as BgLoop[]).map((m) => {
            const cur = playing ? bg.loop : p.loop;
            return (
              <button key={m} role="radio" aria-checked={cur === m} className={cur === m ? 'on' : ''} disabled={m === 'ab' && !abSpan} title={m === 'ab' && !abSpan ? RX2.noAb[lang] : undefined} onClick={() => setMode(m)} data-rec-pl-mode={m}>
                {m === 'ab' ? <N>A–B</N> : RX2[m as 'one' | 'all'][lang]}
              </button>
            );
          })}
        </div>
      </div>
      {!ids.length && <p className="rec-empty">{RX2.empty[lang]}</p>}
      <ol className="rec-pl-items">
        {ids.map((t, i) => {
          const h = heads[t];
          const now = playing && bg.items[bg.index]?.takeId === t;
          return (
            <li key={t} className={now ? 'now' : ''} data-rec-pl-item={t}>
              <button className="rec-pl-take" onClick={() => void playPlaylist({ ...p, takeIds: ids }, i, lang)} aria-current={now ? 'true' : undefined}>
                <span className="rec-pl-n">
                  <N>{i + 1}</N>
                </span>
                <span className="grow">
                  <Bidi text={takeTitle(h, lang)} />
                  <small>
                    {h.audioId ? '' : <N>MIDI · </N>}
                    <N>{mmss(h.durationMs / 1000)}</N>
                    {p.abTake === t && p.ab ? <N> · A–B</N> : null}
                  </small>
                </span>
              </button>
              <button className="icon-btn small ghosty" onClick={() => onOpenTake(t)} aria-label={takeTitle(h, lang)}>
                <RIcon k="more" size={16} />
              </button>
              {own && (
                <>
                  <button className="icon-btn small ghosty" disabled={i === 0} onClick={() => save(moveInPlaylist(p, p.takeIds.indexOf(t), p.takeIds.indexOf(ids[i - 1])))} aria-label={RX2.up[lang]} data-rec-pl-up={i}>
                    <XIcon k="up" size={16} />
                  </button>
                  <button className="icon-btn small ghosty" disabled={i === ids.length - 1} onClick={() => save(moveInPlaylist(p, p.takeIds.indexOf(t), p.takeIds.indexOf(ids[i + 1])))} aria-label={RX2.down[lang]} data-rec-pl-down={i}>
                    <XIcon k="down" size={16} />
                  </button>
                  <button className="icon-btn small ghosty" onClick={() => save(removeFromPlaylist(p, t))} aria-label={RX2.remove[lang]}>
                    <RIcon k="close" size={16} />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <label className="rec-speed">
        <span className="grow">{RX2.speed[lang]}</span>
        <input type="range" min={50} max={125} step={5} value={bg.speed} onChange={(e) => bgPlayer.setSpeed(Number(e.target.value))} dir="ltr" aria-valuetext={`${bg.speed}%`} />
        <b>
          <N>{bg.speed}%</N>
        </b>
      </label>
      <BackgroundNote lang={lang} />
      {est > 0 && (
        <small className="rec-note">
          {RX2.rendering[lang].replace('…', '')}: ≈<N>{Math.max(1, Math.round(est / 1e6))} MB</N>
        </small>
      )}
      <NowPlaying lang={lang} />
    </main>
  );
}

/** "A–B to a playlist": keep the span on the playlist (loop 'ab'). */
export async function setPlaylistAB(playlistId: string, takeId: string, span: [number, number]) {
  const p = await getPlaylist(playlistId);
  if (!p) return;
  await savePlaylist(setLoop(addToPlaylistIfMissing(p, takeId), 'ab', { take: takeId, span }));
}
const addToPlaylistIfMissing = (p: RecPlaylist, id: string): RecPlaylist => (p.takeIds.includes(id) ? p : { ...p, takeIds: [...p.takeIds, id] });

/** Play one take (or its A–B span) in the background right away. */
export async function playTakeInBackground(t: RecTake, lang: Lang, ab: [number, number] | null, loop: BgLoop) {
  bgPlayer.lang = lang;
  await piano.unlock().catch(() => {});
  await bgPlayer.playQueue([bgItemOf(t, lang === 'he' ? 'ההקלטות שלי' : 'My recordings', lang, ab)], 0, { loop: ab ? 'ab' : loop });
}

// ───────────────────────────── whole-session recording ─────────────────────────────

export function SessionRecToggle({ lang }: { lang: Lang }) {
  const [on, setOn] = useState(sessionRecOn());
  const [busy, setBusy] = useState(false);
  useEffect(() => subscribeSessionRec(() => setOn(sessionRecOn())), []);
  if (!sessionRecSupported()) return null;
  const flip = async () => {
    setBusy(true);
    try {
      if (on) await stopSessionRec();
      else {
        await piano.unlock().catch(() => {});
        await startSessionRec(() => piano.voiceOut());
      }
    } finally {
      setBusy(false);
      setOn(sessionRecOn());
    }
  };
  return (
    <label className={`rec-sesstog ${on ? 'on' : ''}`} title={RX2.sessionRecHint[lang]} data-rec-session-toggle={on ? 'on' : 'off'}>
      <span className="enc-recdot-s" aria-hidden="true" />
      <span className="grow">{on ? RX2.sessionRecOn[lang] : RX2.sessionRec[lang]}</span>
      <input type="checkbox" className="rec-tog" checked={on} disabled={busy} onChange={() => void flip()} aria-describedby="rec-sess-hint" />
      <span id="rec-sess-hint" className="sr-only">
        {RX2.sessionRecHint[lang]}
      </span>
    </label>
  );
}
