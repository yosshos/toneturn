// My recordings — "ההקלטות שלי" (SPEC-PHRASE-STUDIO §6.3–6.4; screens docs/phrase-studio-preview slides 16–17).
// The library: a timeline by day → practice session → takes, filter chips, search, star, rename, folders, delete to a
// 30-day bin, bulk select, and the storage meter. The player: the take's roll (MIDI) or waveform (audio), loop whole or
// A–B (snapped to bars when the tempo is known), speed 50–125 % with the pitch kept, "only me / with the band / only
// the band" for MIDI takes with a known backing, and "Practise this span" into Encore. Listening is not practice:
// the route is outside the practice clock (practiceTime.ts NOT_PRACTICE).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStudio } from './look';
import { EmptyState } from './EmptyState';
import '../recordings.css';
import type { CourseId } from '../engine/courses';
import type { NoteEvent } from '../engine/lesson';
import { chartBacking, parseChart, type ChartStyle } from '../engine/charts';
import {
  AUDIO_BUDGET,
  deleteTake,
  emptyBin,
  countTakes,
  getSessions,
  getTake,
  getTakeAudio,
  listFolders,
  listTakesPage,
  notesSpan,
  PEAK_MS,
  renameTake,
  restoreTake,
  runCleanup,
  setTakeFolder,
  setTakePeaks,
  starTake,
  storageUsage,
  subscribeRecordings,
  takeTitle,
  takesOfItem,
  unpackNotes,
  updateTakes,
  groupBySession,
  takeFacets,
  takesByDay,
  TAKE_PAGE,
  type TakeHead,
  type PageCursor,
  type RecSession,
  type RecTake,
  type StorageUsage,
  type TakeFacets,
  type TakeFilter,
} from '../storage/recordings';
import type { Settings } from '../storage/progress';
import { CONSENT_BODY, RX, fillRx } from '../i18n/recordingsText';
import { EX } from '../i18n/encoreText';
import { cloudConfigured } from '../cloud/cloud';
import { TAKE_NOTES_SYNC_ON } from '../cloud/takeNotes';
import { eventOfByte } from './recKeep';
import { openEncoreFromTake } from './encoreBridge';
import { piano } from './services';
import { fmtDuration } from './Stats';
// v2 (SPEC-PHRASE-STUDIO §6.5–6.6): playlists, background playback, export, A/B compare, whole-session recording
import { AddToPlaylistSheet, ExportSheet, exportFolderZip, NowPlaying, PlaylistsScreen, playTakeInBackground, RX2, SessionRecToggle, XIcon } from './RecPlaylists';
import { CompareScreen, ProgressChart } from './RecCompare';
import { progressPoints } from '../engine/recCompare';
import { refreshReserve, sessionAudioOf } from '../storage/recExtras';
import { bgPlayer } from '../audio/bgPlayer';
import { Icon, type IconKey } from './icons';

type Lang = 'en' | 'he';
const RX2Compare = { en: 'Compare', he: 'להשוות' };

// ───────────────────────────── small pieces ─────────────────────────────

const N = ({ children }: { children: ReactNode }) => <bdi dir="ltr">{children}</bdi>;
/** Latin runs (chord symbols, key names, MIDI) inside a Hebrew line go in <bdi dir="ltr">. */
export function Bidi({ text }: { text: string }) {
  // Content titles already carry Unicode isolates (generate.ts isoLatin): each isolated run becomes a <bdi>.
  if (text.includes('⁨')) {
    const iso = text.split(/⁨([^⁩]*)⁩/);
    return <>{iso.map((x, i) => (i % 2 ? <N key={i}>{x}</N> : x))}</>;
  }
  const parts = text.split(/([A-Za-z0-9♭♯#][A-Za-z0-9♭♯#'’.:/+\-–()]*(?:\s+[A-Za-z0-9♭♯#][A-Za-z0-9♭♯#'’.:/+\-–()]*)*)/);
  return <>{parts.map((x, i) => (i % 2 ? <N key={i}>{x}</N> : x))}</>;
}

/** The library's control symbols, by their old names, drawn in the Paper chrome cut (src/ui/paper/art-chrome*.ts). */
const RKEY = {
  search: 'search',
  star: 'star',
  folder: 'folder',
  trash: 'trash',
  select: 'select',
  more: 'more',
  play: 'play',
  pause: 'pause',
  loop: 'repeat',
  back5: 'skipback',
  fwd5: 'skipfwd',
  mic: 'mic',
  keys: 'keys',
  voice: 'voice',
  close: 'close',
  restore: 'restore',
  export: 'export',
} as const satisfies Record<string, IconKey>;
type IconName = keyof typeof RKEY;
/** `fill` keeps its old meaning for the star: filled = starred, otherwise the star as a paper strip. */
export const RIcon = ({ k, size = 18, fill = false }: { k: IconName; size?: number; fill?: boolean }) => (
  <Icon k={k === 'star' && !fill ? 'staroff' : RKEY[k]} size={size} className={`rec-ico rec-ico-${k}`} />
);

const mmss = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const mb = (b: number) => (b < 1e6 ? `${Math.max(0, Math.round(b / 1e3))} KB` : `${Math.round(b / 1e6)} MB`);
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const clock = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
function dayLabel(iso: string, lang: Lang): string {
  const k = dayKey(iso);
  const now = new Date();
  if (k === dayKey(now.toISOString())) return RX.today[lang];
  if (k === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) return RX.yesterday[lang];
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The take's result as the app's mark row: "clean · ♩144 · 96%". */
function resultLine(t: RecTake, lang: Lang): string {
  const r = t.result;
  if (!r) return '';
  const parts: string[] = [];
  if (r.verdict) parts.push(RX.verdict[r.verdict]?.[lang] ?? '');
  if (r.bpm) parts.push(`♩${r.bpm}`);
  if (r.acc !== undefined) parts.push(`${Math.round(r.acc * 100)}%`);
  else if (r.score !== undefined) parts.push(`${Math.round(r.score * 100)}%`);
  return parts.filter(Boolean).join(' · ');
}
const sourceTag = (t: RecTake, lang: Lang) => (t.source === 'mic' ? RX.mic[lang] : 'MIDI');

// ───────────────────────────── the screen (library or player by hash) ─────────────────────────────

const takeIdFromHash = () => {
  const m = /^#\/recordings\/([^?]+)/.exec(location.hash);
  return m ? decodeURIComponent(m[1]) : null;
};

export function RecordingsScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [takeId, setTakeId] = useState(takeIdFromHash);
  useEffect(() => {
    const on = () => setTakeId(takeIdFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  // The retention policy runs when the library opens (and at app start).
  useEffect(() => void runCleanup().then(() => refreshReserve()), []);
  const open = (id: string) => (location.hash = `/recordings/${encodeURIComponent(id)}`);
  const close = () => {
    if (history.length > 1 && takeIdFromHash()) history.back();
    else location.hash = '/recordings';
  };
  // v2 routes: /recordings/compare/<a>[~<b>], /recordings/playlists, /recordings/playlist/<id>
  const cmp = takeId ? /^compare\/([^~]+)(?:~(.+))?$/.exec(takeId) : null;
  if (cmp) return <CompareScreen key={takeId!} lang={lang} a={cmp[1]} b={cmp[2] ?? null} onBack={close} onOpen={open} />;
  if (takeId === 'playlists') return <PlaylistsScreen lang={lang} id={null} onBack={close} onOpenTake={open} />;
  const pl = takeId ? /^playlist\/(.+)$/.exec(takeId) : null;
  if (pl) return <PlaylistsScreen key={takeId!} lang={lang} id={pl[1]} onBack={close} onOpenTake={open} />;
  if (takeId) return <TakePlayer key={takeId} id={takeId} lang={lang} onBack={close} onOpen={open} />;
  return <Library lang={lang} onBack={onBack} onOpen={open} />;
}

// ───────────────────────────── the library ─────────────────────────────

type Chip = 'all' | `c:${CourseId}` | 'sung' | 'played' | 'midi' | 'audio' | 'star' | 'test' | `f:${string}`;
const FILTER_KEY = 'toneturn.recordings.filter';
const filterOf = (c: Chip, q: string): TakeFilter => {
  const f: TakeFilter = q.trim() ? { q: q.trim() } : {};
  if (c.startsWith('c:')) f.course = c.slice(2) as CourseId;
  else if (c === 'sung') f.sung = true;
  else if (c === 'played') f.sung = false;
  else if (c === 'midi') f.media = 'midi';
  else if (c === 'audio') f.media = 'audio';
  else if (c === 'star') f.starred = true;
  else if (c === 'test') f.kind = 'level-test';
  else if (c.startsWith('f:')) f.folder = c.slice(2);
  return f;
};

function useRecordings<T>(load: () => Promise<T>, deps: unknown[], init: T): [T, () => void] {
  const [v, setV] = useState<T>(init);
  const [n, setN] = useState(0);
  useEffect(() => subscribeRecordings(() => setN((x) => x + 1)), []);
  useEffect(() => {
    let live = true;
    void load().then((x) => live && setV(x));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return [v, () => setN((x) => x + 1)];
}

const NO_FACETS: TakeFacets = { total: 0, bin: 0, courses: [], sung: false, played: false, midi: false, audio: false, levelTest: false };

/**
 * The library's takes, a page (TAKE_PAGE) at a time from the date index: only the shown takes are read whole. A change
 * in the store reloads as many as are shown; a new filter starts again at one page.
 */
function usePagedTakes(filter: TakeFilter) {
  const [data, setData] = useState<{ takes: RecTake[]; sessions: RecSession[]; next: PageCursor | null; ready: boolean }>({ takes: [], sessions: [], next: null, ready: false });
  const [n, setN] = useState(0);
  const want = useRef(TAKE_PAGE);
  const key = JSON.stringify(filter);
  const lastKey = useRef(key);
  const busy = useRef(false);
  useEffect(() => subscribeRecordings(() => setN((x) => x + 1)), []);
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      want.current = TAKE_PAGE;
    }
    let live = true;
    void (async () => {
      const r = await listTakesPage(filter, { limit: want.current });
      const sessions = await getSessions(r.takes.map((t) => t.sessionId));
      if (live) setData({ takes: r.takes, sessions, next: r.next, ready: true });
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  const more = useCallback(async () => {
    if (!data.next || busy.current) return;
    busy.current = true;
    try {
      const r = await listTakesPage(filter, { after: data.next, limit: TAKE_PAGE });
      const known = new Set(data.sessions.map((x) => x.id));
      const sessions = await getSessions(r.takes.map((t) => t.sessionId).filter((id) => !known.has(id)));
      want.current = data.takes.length + r.takes.length;
      setData((d) => ({ takes: [...d.takes, ...r.takes.filter((t) => !d.takes.some((x) => x.id === t.id))], sessions: [...d.sessions, ...sessions], next: r.next, ready: true }));
    } finally {
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key]);
  return { ...data, more };
}

/** One calm line about where recordings live on this device (private window, a full device, iPhone not installed). */
function StorageNotice({ lang, u }: { lang: Lang; u: StorageUsage }) {
  if (u.volatile)
    return (
      <p className="rec-note" data-rec-notice="volatile">
        {RX.volatile[lang]}
      </p>
    );
  if (u.quotaAt && Date.now() - Date.parse(u.quotaAt) < 3 * 86_400_000)
    return (
      <p className="rec-note warn" data-rec-notice="quota">
        {RX.quota[lang]}
      </p>
    );
  if (u.iosBrowser && u.persisted !== true && u.takes > 0)
    return (
      <p className="rec-note" data-rec-notice="install">
        {RX.installKeep[lang]}
      </p>
    );
  return null;
}

function Library({ lang, onBack, onOpen }: { lang: Lang; onBack: () => void; onOpen: (id: string) => void }) {
  const studio = useStudio();
  const [chip, setChipS] = useState<Chip>(() => {
    try {
      return (sessionStorage.getItem(FILTER_KEY) as Chip | null) ?? 'all';
    } catch {
      return 'all';
    }
  });
  const setChip = (c: Chip) => {
    setChipS(c);
    try {
      sessionStorage.setItem(FILTER_KEY, c);
    } catch {
      /* private mode */
    }
  };
  const [q, setQ] = useState('');
  const [bin, setBin] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<RecTake | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(false);
  // a folder as one .zip (audio, or .mid for notes-only takes) — the share sheet or a download
  const [zipping, setZipping] = useState<string | null>(null);
  const zipFolder = async (name: string) => {
    setZipping(RX2.zipping[lang]);
    const r = await exportFolderZip(name, lang).catch(() => 'failed' as const);
    setZipping(r === 'failed' ? RX2.exportFail[lang] : r === 'empty' ? RX2.zipEmpty[lang] : null);
    if (r === 'failed' || r === 'empty') window.setTimeout(() => setZipping(null), 2500);
  };
  const [askEmpty, setAskEmpty] = useState(false);
  const filter = useMemo(() => (bin ? { bin: true, ...(q.trim() ? { q: q.trim() } : {}) } : filterOf(chip, q)), [chip, q, bin]);
  const data = usePagedTakes(filter);
  const [usage] = useRecordings(storageUsage, [], null as StorageUsage | null);
  const [folders] = useRecordings(listFolders, [], [] as { name: string; count: number }[]);
  const [facets] = useRecordings(takeFacets, [], NO_FACETS);
  const binCount = facets.bin;

  const groups = useMemo(() => groupBySession(data.takes, data.sessions), [data.takes, data.sessions]);
  const byDay: { day: string; label: string; items: typeof groups }[] = [];
  for (const g of groups) {
    const k = dayKey(g.takes[0].at);
    const last = byDay[byDay.length - 1];
    if (last?.day === k) last.items.push(g);
    else byDay.push({ day: k, label: dayLabel(g.takes[0].at, lang), items: [g] });
  }
  const courses = facets.courses;
  const chips: [Chip, ReactNode][] = [
    ['all', RX.all[lang]],
    ...courses.map((c) => [`c:${c}`, RX.courses[c]?.[lang] ?? c] as [Chip, ReactNode]),
    ...(facets.sung ? [['sung', RX.sung[lang]] as [Chip, ReactNode]] : []),
    ...(facets.played ? [['played', RX.played[lang]] as [Chip, ReactNode]] : []),
    ...(facets.midi ? [['midi', <N key="m">MIDI</N>] as [Chip, ReactNode]] : []),
    ...(facets.audio ? [['audio', RX.audio[lang]] as [Chip, ReactNode]] : []),
    [
      'star',
      <span key="s" className="rec-chip-ic">
        <RIcon k="star" size={14} fill /> {RX.starred[lang]}
      </span>,
    ],
    ...(facets.levelTest ? [['test', RX.levelTest[lang]] as [Chip, ReactNode]] : []),
    ...(chip.startsWith('f:') ? [[chip, <span key="f" className="rec-chip-ic"><RIcon k="folder" size={14} /> {chip.slice(2)}</span>] as [Chip, ReactNode]] : []),
  ];
  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const endSelect = () => {
    setSelecting(false);
    setSel(new Set());
  };
  const bulk = async (p: Parameters<typeof updateTakes>[1]) => {
    await updateTakes([...sel], p);
    endSelect();
  };
  const [bulkFolder, setBulkFolder] = useState(false);
  const [bulkList, setBulkList] = useState(false);

  return (
    <main className="panel-screen recordings" data-recordings="library" data-rec-bin={bin ? '1' : '0'}>
      <header className="screen-head rec-head">
        <button className="icon-btn" onClick={() => (bin ? setBin(false) : onBack())} aria-label={RX.back[lang]}>
          <Icon k="back" />
        </button>
        <h1>{bin ? RX.bin[lang] : RX.title[lang]}</h1>
        {!bin && (
          <div className="rec-head-tools">
            <button className={`icon-btn small ${selecting ? 'on' : ''}`} aria-pressed={selecting} onClick={() => (selecting ? endSelect() : setSelecting(true))} aria-label={RX.select[lang]} data-rec-select="1">
              <RIcon k="select" />
            </button>
            <button className="icon-btn small" onClick={() => setFoldersOpen(true)} aria-label={RX.folders[lang]} data-rec-folders="1">
              <RIcon k="folder" />
            </button>
            <button className="icon-btn small" onClick={() => (location.hash = '/recordings/playlists')} aria-label={RX2.playlists[lang]} data-rec-playlists="1">
              <XIcon k="list" />
            </button>
            <button className="icon-btn small rec-bin-btn" onClick={() => setBin(true)} aria-label={`${RX.bin[lang]} (${binCount})`} data-rec-binbtn={binCount}>
              <RIcon k="trash" />
              {binCount > 0 && <span className="rec-badge"><N>{binCount}</N></span>}
            </button>
          </div>
        )}
      </header>

      <label className="rec-search">
        <RIcon k="search" size={16} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={RX.search[lang]} aria-label={RX.search[lang]} data-rec-search="1" />
      </label>

      {!bin && (
        <div className="rec-chips" role="toolbar" aria-label={RX.title[lang]}>
          {chips.map(([c, label]) => (
            <button key={c} className={`chip ${chip === c ? 'on' : ''}`} aria-pressed={chip === c} onClick={() => setChip(chip === c && c !== 'all' ? 'all' : c)} data-rec-chip={c}>
              {label}
            </button>
          ))}
        </div>
      )}

      {bin && (
        <div className="rec-binbar">
          <p className="field-hint">{RX.binNote[lang]}</p>
          {data.takes.length > 0 && (
            <button className="btn small ghost" onClick={() => setAskEmpty(true)} data-rec-emptybin="1">
              {RX.emptyBin[lang]}
            </button>
          )}
        </div>
      )}

      {!bin && usage?.autoPrune && Date.now() - Date.parse(usage.autoPrune.at) < 7 * 86_400_000 && <p className="rec-note">{fillRx(RX.autoPruned[lang], { n: usage.autoPrune.n, b: mb(usage.budget) })}</p>}
      {!bin && usage && <StorageNotice lang={lang} u={usage} />}
      {!bin && !selecting && <SessionRecToggle lang={lang} />}

      <div className="rec-timeline" data-rec-count={data.takes.length} data-rec-more={data.next ? '1' : '0'}>
        {data.ready && !data.takes.length && (studio && !facets.total && !bin ? <EmptyState glyph="record" text={RX.empty[lang]} data="recordings" action={{ label: lang === 'he' ? 'לתרגל' : 'Practise', onClick: () => (location.hash = '#/arcade') }} /> : <p className="rec-empty">{facets.total || bin ? RX.emptyFilter[lang] : RX.empty[lang]}</p>)}
        {byDay.map((d) => (
          <section key={d.day} className="rec-day">
            {!bin && <h2 className="rec-day-h">{d.label}</h2>}
            {d.items.map((g) => (
              <SessionCard key={g.session.id} lang={lang} session={g.session} takes={g.takes} bin={bin} selecting={selecting} sel={sel} onSel={toggleSel} onOpen={onOpen} onMenu={setMenu} />
            ))}
          </section>
        ))}
        {data.next && (
          <button className="btn small ghost rec-more" onClick={() => void data.more()} data-rec-loadmore="1">
            {RX.loadMore[lang]}
          </button>
        )}
      </div>

      {!bin && usage && <StorageMeter lang={lang} u={usage} />}

      {selecting && (
        <div className="rec-bulk" role="toolbar" aria-label={fillRx(RX.selected[lang], { n: sel.size })} data-rec-bulk={sel.size}>
          <span className="rec-bulk-n">{fillRx(RX.selected[lang], { n: sel.size })}</span>
          <button className="icon-btn small" disabled={!sel.size} onClick={() => void bulk({ star: true })} aria-label={RX.star[lang]} data-rec-bulk-star="1">
            <RIcon k="star" />
          </button>
          <button className="icon-btn small" disabled={!sel.size} onClick={() => setBulkFolder(true)} aria-label={RX.folder[lang]} data-rec-bulk-folder="1">
            <RIcon k="folder" />
          </button>
          <button className="icon-btn small" disabled={!sel.size} onClick={() => setBulkList(true)} aria-label={RX2.addTo[lang]} data-rec-bulk-playlist="1">
            <XIcon k="list" />
          </button>
          <button className="icon-btn small" disabled={!sel.size} onClick={() => void bulk({ deleted: true })} aria-label={RX.del[lang]} data-rec-bulk-delete="1">
            <RIcon k="trash" />
          </button>
          <button className="btn small ghost" onClick={endSelect}>
            {RX.cancel[lang]}
          </button>
        </div>
      )}

      {menu && <TakeMenu lang={lang} take={menu} folders={folders} onClose={() => setMenu(null)} />}
      {bulkList && <AddToPlaylistSheet lang={lang} takeIds={[...sel]} onClose={() => (setBulkList(false), endSelect())} />}
      {!selecting && <NowPlaying lang={lang} />}
      {bulkFolder && (
        <FolderPicker
          lang={lang}
          folders={folders}
          current=""
          onPick={(f) => {
            setBulkFolder(false);
            void bulk({ folder: f });
          }}
          onClose={() => setBulkFolder(false)}
        />
      )}
      {foldersOpen && (
        <Sheet lang={lang} title={RX.folders[lang]} onClose={() => setFoldersOpen(false)}>
          {!folders.length && <p className="field-hint">{RX.noFolder[lang]}</p>}
          {zipping && (
            <p className="rec-note" role="status" data-rec-zip-msg="1">
              {zipping}
            </p>
          )}
          <ul className="rec-folders">
            {folders.map((f) => (
              <li key={f.name}>
                <button
                  className="rec-folder-row"
                  onClick={() => {
                    setChip(`f:${f.name}`);
                    setFoldersOpen(false);
                  }}
                  data-rec-folder={f.name}
                >
                  <RIcon k="folder" size={16} />
                  <span className="grow">
                    <Bidi text={f.name} />
                  </span>
                  <b>
                    <N>{f.count}</N>
                  </b>
                </button>
                <button className="icon-btn small" disabled={zipping !== null} onClick={() => void zipFolder(f.name)} aria-label={`${RX2.exportZip[lang]}: ${f.name}`} data-rec-folder-zip={f.name}>
                  <RIcon k="export" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {askEmpty && (
        <Sheet lang={lang} title={RX.emptyBin[lang]} onClose={() => setAskEmpty(false)}>
          <p>{fillRx(RX.emptyBinAsk[lang], { n: binCount })}</p>
          <div className="rec-sheet-actions">
            <button className="btn ghost" onClick={() => setAskEmpty(false)}>
              {RX.cancel[lang]}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                setAskEmpty(false);
                void emptyBin();
              }}
              data-rec-emptybin-ok="1"
            >
              {RX.del[lang]}
            </button>
          </div>
        </Sheet>
      )}
    </main>
  );
}

function SessionCard({ lang, session, takes, bin, selecting, sel, onSel, onOpen, onMenu }: { lang: Lang; session: RecSession; takes: RecTake[]; bin: boolean; selecting: boolean; sel: Set<string>; onSel: (id: string) => void; onOpen: (id: string) => void; onMenu: (t: RecTake) => void }) {
  const [all, setAll] = useState(false);
  const SHOW = 4;
  const list = all ? takes : takes.slice(0, SHOW);
  const course = session.course ?? takes[0]?.course ?? null;
  return (
    <article className="rec-session" data-rec-session={session.id}>
      {!bin && (
        <header className="rec-session-h">
          <div className="grow">
            <b>
              {RX.session[lang]} · <N>{clock(takes[takes.length - 1].at)}</N>
            </b>
            <small>
              {takes.length === 1 ? RX.oneTake[lang] : fillRx(RX.takes[lang], { n: takes.length })}
              {session.measuredMs >= 60_000 && (
                <>
                  {' · '}
                  <bdi>{fillRx(RX.measured[lang], { m: fmtDuration(session.measuredMs, lang) })}</bdi>
                </>
              )}
            </small>
          </div>
          {session.audioId && (
            <button className="icon-btn small rec-session-play" onClick={() => void playSessionAudio(session, lang)} aria-label={RX2.wholeSession[lang]} title={RX2.wholeSession[lang]} data-rec-session-audio={session.id}>
              <RIcon k="play" size={14} fill />
            </button>
          )}
          {course && <span className="rec-pill">{RX.courses[course]?.[lang] ?? course}</span>}
        </header>
      )}
      <ul className="rec-takes">
        {list.map((t) => (
          <TakeRow key={t.id} lang={lang} t={t} bin={bin} selecting={selecting} checked={sel.has(t.id)} onSel={() => onSel(t.id)} onOpen={() => onOpen(t.id)} onMenu={() => onMenu(t)} />
        ))}
      </ul>
      {takes.length > SHOW && !all && (
        <button className="link rec-session-more" onClick={() => setAll(true)}>
          {fillRx(RX.moreTakes[lang], { n: takes.length - SHOW })}
        </button>
      )}
    </article>
  );
}

/** Play a whole-session recording in the background player. */
async function playSessionAudio(session: RecSession, lang: Lang) {
  bgPlayer.lang = lang;
  await bgPlayer.playQueue([{ takeId: session.id, title: `${RX2.wholeSession[lang]} · ${clock(session.startedAt)}`, album: dayLabel(session.startedAt, lang), source: async () => (await sessionAudioOf(session.id))?.blob ?? null }], 0, { loop: 'off' });
}

function TakeRow({ lang, t, bin, selecting, checked, onSel, onOpen, onMenu }: { lang: Lang; t: RecTake; bin: boolean; selecting: boolean; checked: boolean; onSel: () => void; onOpen: () => void; onMenu: () => void }) {
  const res = resultLine(t, lang);
  const glyph: IconName = t.sung ? 'voice' : t.source === 'mic' ? 'mic' : 'keys';
  const dur = t.durationMs > 0 ? mmss(t.durationMs / 1000) : '';
  return (
    <li className={`rec-take ${checked ? 'sel' : ''}`} data-rec-take={t.id} data-rec-star={t.star ? '1' : '0'} data-rec-audio={t.audioId ? '1' : '0'} data-rec-kind={t.kind}>
      {selecting ? (
        <input type="checkbox" className="rec-check" checked={checked} onChange={onSel} aria-label={takeTitle(t, lang)} />
      ) : (
        <span className="rec-glyph" aria-hidden="true">
          <RIcon k={glyph} size={16} />
        </span>
      )}
      <button className="rec-take-main" onClick={selecting ? onSel : bin ? undefined : onOpen} disabled={bin && !selecting} data-rec-open={t.id}>
        <span className="rec-take-title">
          <Bidi text={takeTitle(t, lang)} />
        </span>
        <small className="rec-take-meta">
          {dur && (
            <>
              <N>{dur}</N> ·{' '}
            </>
          )}
          {t.source === 'mic' ? sourceTag(t, lang) : <N>MIDI</N>}
          {!t.audioId && t.prunedAt && <> · {RX.notesOnly[lang]}</>}
          {!t.audioId && t.fromCloud && <span data-from-cloud="1"> · {EX.fromCloud[lang]}</span>}
          {res && (
            <>
              {' · '}
              <Bidi text={res} />
            </>
          )}
          {t.folder && (
            <>
              {' · '}
              <span className="rec-folder-tag">
                <RIcon k="folder" size={12} /> <Bidi text={t.folder} />
              </span>
            </>
          )}
        </small>
      </button>
      {bin ? (
        <button className="icon-btn small ghosty" onClick={() => void restoreTake(t.id)} aria-label={RX.restore[lang]} data-rec-restore={t.id}>
          <RIcon k="restore" />
        </button>
      ) : (
        !selecting && (
          <>
            <button className={`icon-btn small ghosty rec-star ${t.star ? 'on' : ''}`} aria-pressed={!!t.star} onClick={() => void starTake(t.id, !t.star)} aria-label={t.star ? RX.unstar[lang] : RX.star[lang]} data-rec-starbtn={t.id}>
              <RIcon k="star" fill={!!t.star} />
            </button>
            <button className="icon-btn small ghosty" onClick={onMenu} aria-label={RX.more[lang]} data-rec-menu={t.id}>
              <RIcon k="more" />
            </button>
          </>
        )
      )}
    </li>
  );
}

/** "Used 212 MB of 500" with the waveform-bars motif. */
function StorageMeter({ lang, u }: { lang: Lang; u: StorageUsage }) {
  const used = u.audioBytes + u.notesBytes;
  const share = Math.min(1, used / (u.budget || AUDIO_BUDGET));
  const n = 24;
  const hs = Array.from({ length: n }, (_, i) => 4 + Math.round(8 * Math.abs(Math.sin(i * 1.7))));
  return (
    <footer className="rec-meter" data-rec-used={used}>
      <span className="rec-meter-text">
        <Used lang={lang} used={used} budget={u.budget} />
      </span>
      <svg className="rec-bars" viewBox={`0 0 ${n * 5} 14`} aria-hidden="true" style={{ direction: 'ltr' }}>
        {hs.map((h, i) => (
          <rect key={i} x={i * 5} y={14 - h} width={3} height={h} rx={1} className={i / n < share || (i === 0 && used > 0) ? 'on' : ''} />
        ))}
      </svg>
      <small className="rec-meter-note">{RX.pruneNote[lang]}</small>
    </footer>
  );
}
const Used = ({ lang, used, budget }: { lang: Lang; used: number; budget: number }) => {
  const [a, b] = RX.used[lang].split('{u}');
  const [c, d] = b.split('{b}');
  return (
    <>
      {a}
      <N>{mb(used)}</N>
      {c}
      <N>{mb(budget)}</N>
      {d}
    </>
  );
};

// ───────────────────────────── sheets: menu, folders, rename ─────────────────────────────

function Sheet({ lang, title, onClose, children }: { lang: Lang; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet rec-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="rec-sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn small" onClick={onClose} aria-label={RX.close[lang]}>
            <RIcon k="close" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function TakeMenu({ lang, take, folders, onClose, onDeleted }: { lang: Lang; take: RecTake; folders: { name: string; count: number }[]; onClose: () => void; onDeleted?: () => void }) {
  const [name, setName] = useState(takeTitle(take, lang));
  const [picking, setPicking] = useState(false);
  if (picking)
    return (
      <FolderPicker
        lang={lang}
        folders={folders}
        current={take.folder ?? ''}
        onPick={(f) => {
          void setTakeFolder(take.id, f);
          onClose();
        }}
        onClose={() => setPicking(false)}
      />
    );
  return (
    <Sheet lang={lang} title={takeTitle(take, lang)} onClose={onClose}>
      <form
        className="rec-rename"
        onSubmit={(e) => {
          e.preventDefault();
          void renameTake(take.id, name);
          onClose();
        }}
      >
        <label>
          <small>{RX.rename[lang]}</small>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-rec-rename-input="1" />
        </label>
        <button className="btn small" type="submit" data-rec-rename-save="1">
          {RX.save[lang]}
        </button>
      </form>
      <button className="rec-menu-row" onClick={() => setPicking(true)} data-rec-menu-folder="1">
        <RIcon k="folder" size={16} />
        <span className="grow">{RX.folder[lang]}</span>
        <small>{take.folder ? <Bidi text={take.folder} /> : RX.noFolder[lang]}</small>
      </button>
      <button
        className="rec-menu-row danger"
        onClick={() => {
          void deleteTake(take.id);
          onClose();
          onDeleted?.();
        }}
        data-rec-delete="1"
      >
        <RIcon k="trash" size={16} />
        <span className="grow">{RX.del[lang]}</span>
      </button>
    </Sheet>
  );
}

function FolderPicker({ lang, folders, current, onPick, onClose }: { lang: Lang; folders: { name: string; count: number }[]; current: string; onPick: (f: string | null) => void; onClose: () => void }) {
  const [fresh, setFresh] = useState('');
  return (
    <Sheet lang={lang} title={RX.folder[lang]} onClose={onClose}>
      <ul className="rec-folders">
        <li>
          <button className={`rec-folder-row ${!current ? 'on' : ''}`} onClick={() => onPick(null)}>
            <span className="grow">{RX.noFolder[lang]}</span>
          </button>
        </li>
        {folders.map((f) => (
          <li key={f.name}>
            <button className={`rec-folder-row ${current === f.name ? 'on' : ''}`} onClick={() => onPick(f.name)} data-rec-pick={f.name}>
              <RIcon k="folder" size={16} />
              <span className="grow">
                <Bidi text={f.name} />
              </span>
              <b>
                <N>{f.count}</N>
              </b>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="rec-rename"
        onSubmit={(e) => {
          e.preventDefault();
          if (fresh.trim()) onPick(fresh);
        }}
      >
        <label>
          <small>{RX.newFolder[lang]}</small>
          <input value={fresh} maxLength={60} placeholder={RX.folderName[lang]} onChange={(e) => setFresh(e.target.value)} data-rec-newfolder="1" />
        </label>
        <button className="btn small" type="submit" disabled={!fresh.trim()} data-rec-newfolder-save="1">
          {RX.save[lang]}
        </button>
      </form>
    </Sheet>
  );
}

// ───────────────────────────── the player ─────────────────────────────

type Mix = 'me' | 'band' | 'bandOnly';
const SPEEDS = { min: 50, max: 125, step: 5 };

/** The band of a take as note events in seconds on the take's timeline (beat 0 = 0), or null when unknown. */
export function bandEvents(t: RecTake): NoteEvent[] | null {
  if (t.backing?.notes) return unpackNotes(t.backing.notes).map((n) => ({ midi: n.pitch, start: n.on / 1000, duration: Math.max(0.05, ((n.off ?? n.on + 200) - n.on) / 1000), velocity: n.vel / 127, ...eventOfByte(n.inst ?? 0) }));
  if (t.backing?.kind === 'chart' && t.chart && t.bpm) {
    try {
      const o = JSON.parse(t.backing.ref || '{}') as { loops?: number; meter?: number };
      const b = chartBacking(parseChart(t.chart), (t.backing.style ?? 'swing') as ChartStyle, t.bpm, o.loops ?? 1, o.meter ?? t.meter ?? 4, { countIn: true });
      const shift = b.startBeat * (60 / t.bpm);
      return b.events.map((e) => ({ ...e, start: e.start - shift })).filter((e) => e.start >= -0.01);
    } catch {
      return null;
    }
  }
  return null;
}
/** The player's own notes as events. */
const myEvents = (t: RecTake): NoteEvent[] => unpackNotes(t.notes).map((n) => ({ midi: n.pitch, start: n.on / 1000, duration: Math.max(0.06, ((n.off ?? n.on + 250) - n.on) / 1000), velocity: Math.max(0.15, n.vel / 127) }));

/** Peaks (0..255 per PEAK_MS) of an audio blob, decoded once and released (§15). */
async function peaksOf(blob: Blob): Promise<{ peaks: Uint8Array; seconds: number } | null> {
  try {
    const Ctx = (window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext) as typeof OfflineAudioContext | undefined;
    if (!Ctx) return null;
    const ctx = new Ctx(1, 2, 44100);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const ch = buf.getChannelData(0);
    const hop = Math.max(1, Math.round((buf.sampleRate * PEAK_MS) / 1000));
    const n = Math.ceil(ch.length / hop);
    const out = new Uint8Array(n);
    let max = 0.0001;
    const raw = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = i * hop, e = Math.min(ch.length, j + hop); j < e; j += 4) m = Math.max(m, Math.abs(ch[j]));
      raw[i] = m;
      max = Math.max(max, m);
    }
    for (let i = 0; i < n; i++) out[i] = Math.round((raw[i] / max) * 255);
    return { peaks: out, seconds: buf.duration };
  } catch {
    return null;
  }
}

function TakePlayer({ id, lang, onBack, onOpen }: { id: string; lang: Lang; onBack: () => void; onOpen: (id: string) => void }) {
  const [take, setTake] = useState<RecTake | null | undefined>(undefined);
  const [n, setN] = useState(0);
  useEffect(() => subscribeRecordings(() => setN((x) => x + 1)), []);
  useEffect(() => {
    let live = true;
    void getTake(id).then((t) => live && setTake(t));
    return () => {
      live = false;
    };
  }, [id, n]);
  if (take === undefined) return <main className="panel-screen recordings rec-player" data-recordings="player" />;
  if (!take || take.deletedAt)
    return (
      <main className="panel-screen recordings rec-player" data-recordings="player">
        <header className="screen-head rec-head">
          <button className="icon-btn" onClick={onBack} aria-label={RX.back[lang]}>
            <Icon k="back" />
          </button>
          <h1>{RX.title[lang]}</h1>
        </header>
        <p className="rec-empty">{RX.missing[lang]}</p>
      </main>
    );
  return <PlayerBody take={take} lang={lang} onBack={onBack} onOpen={onOpen} />;
}

function PlayerBody({ take, lang, onBack, onOpen }: { take: RecTake; lang: Lang; onBack: () => void; onOpen: (id: string) => void }) {
  const notes = useMemo(() => unpackNotes(take.notes), [take.notes]);
  const band = useMemo(() => bandEvents(take), [take]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDur, setAudioDur] = useState<number | null>(null);
  const [peaks, setPeaks] = useState<Uint8Array | null>(take.peaks ?? null);
  const isAudio = !!take.audioId;
  // Audio: an object URL for a plain <audio> element (playbackRate + preservesPitch); peaks decoded once.
  useEffect(() => {
    if (!take.audioId) return;
    let url: string | null = null;
    let live = true;
    void getTakeAudio(take.id).then(async (b) => {
      if (!b || !live) return;
      url = URL.createObjectURL(b);
      setAudioUrl(url);
      if (!take.peaks) {
        const p = await peaksOf(b);
        if (p && live) {
          setPeaks(p.peaks);
          setAudioDur((d) => d ?? p.seconds);
          void setTakePeaks(take.id, p.peaks);
        }
      }
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [take.id, take.audioId, take.peaks]);

  // The timeline (seconds): MIDI from the first note (or beat 0) to the last release; audio from 0 to its length.
  const [n0, n1] = notesSpan(notes);
  const start = isAudio ? 0 : Math.min(0, n0 / 1000);
  const end = isAudio ? (audioDur ?? (take.durationMs > 0 ? take.durationMs / 1000 : peaks ? (peaks.length * PEAK_MS) / 1000 : 1)) : Math.max(n1 / 1000, (take.durationMs || 0) / 1000, start + 0.5);
  const barS = !isAudio && take.bpm ? ((take.meter ?? 4) * 60) / take.bpm : null;
  const snap = (x: number, up: boolean) => (barS ? (up ? Math.ceil(x / barS - 1e-6) : Math.floor(x / barS + 1e-6)) * barS : Math.round(x * 10) / 10);

  const [pos, setPos] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const [ab, setAb] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState(100);
  const [mix, setMix] = useState<Mix>(band ? 'band' : 'me');
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState<RecTake[] | null>(null);
  const [sheet2, setSheet2] = useState<'list' | 'export' | null>(null);
  const [folders] = useRecordings(listFolders, [], [] as { name: string; count: number }[]);
  const lo = ab ? ab[0] : start;
  const hi = ab ? ab[1] : end;

  const audioEl = useRef<HTMLAudioElement | null>(null);
  const midiCtl = useRef<AbortController | null>(null);
  const raf = useRef(0);
  const posRef = useRef(pos);
  posRef.current = pos;
  const st = useRef({ loopOn, lo, hi, speed, mix });
  st.current = { loopOn, lo, hi, speed, mix };

  const stopAll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    midiCtl.current?.abort();
    midiCtl.current = null;
    audioEl.current?.pause();
    setPlaying(false);
  }, []);
  useEffect(() => () => stopAll(), [stopAll]);

  // MIDI: render the slice from `from` with the app's instruments, tempo scaled by the speed; loop by re-rendering.
  const playMidi = async (from: number) => {
    await piano.unlock();
    const c = new AbortController();
    midiCtl.current = c;
    setPlaying(true);
    let at = from;
    while (!c.signal.aborted) {
      const { hi: b, speed: sp, mix: mx } = st.current;
      const k = sp / 100;
      const evs = [...(mx !== 'bandOnly' ? myEvents(take) : []), ...(mx !== 'me' && band ? band : [])]
        .filter((e) => e.start >= at - 0.001 && e.start < b)
        .map((e) => ({ ...e, start: (e.start - at) / k + 0.08, duration: Math.min(e.duration, b - e.start) / k }));
      const len = (b - at) / k + 0.1;
      const t0 = performance.now() + 80;
      const tick = () => {
        const x = at + (Math.max(0, performance.now() - t0) / 1000) * k;
        setPos(Math.min(b, x));
        if (!c.signal.aborted) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      await piano.play(evs, len, c.signal).catch(() => {});
      cancelAnimationFrame(raf.current);
      if (c.signal.aborted) break;
      if (!st.current.loopOn) {
        setPos(st.current.lo);
        break;
      }
      at = st.current.lo;
    }
    if (midiCtl.current === c) {
      midiCtl.current = null;
      setPlaying(false);
    }
  };
  // Audio: the element plays; a frame loop moves the playhead and jumps back at B when looping.
  const playAudio = async (from: number) => {
    const el = audioEl.current;
    if (!el) return;
    el.playbackRate = st.current.speed / 100;
    (el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch = true;
    (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    try {
      el.currentTime = from;
    } catch {
      /* not seekable yet */
    }
    try {
      await el.play();
    } catch {
      return;
    }
    setPlaying(true);
    const tick = () => {
      const { loopOn: L, lo: a, hi: b } = st.current;
      const x = el.currentTime;
      if (x >= b - 0.02 || el.ended) {
        if (L) {
          el.currentTime = a;
          if (el.paused) void el.play().catch(() => {});
        } else {
          el.pause();
          setPos(a);
          setPlaying(false);
          return;
        }
      }
      setPos(el.currentTime);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const play = (from = posRef.current) => {
    stopAll();
    const f = from >= hi - 0.05 || from < lo ? lo : from;
    if (isAudio) void playAudio(f);
    else if (notes.length || band) void playMidi(f);
  };
  const toggle = () => (playing ? stopAll() : play());
  const seek = (x: number) => {
    const v = Math.max(start, Math.min(end, x));
    setPos(v);
    if (playing) play(v);
  };
  // Speed / mix changes take effect at once (audio: the element; MIDI: re-render from here).
  useEffect(() => {
    if (audioEl.current) audioEl.current.playbackRate = speed / 100;
    if (playing && !isAudio) play(posRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, mix]);
  const setA = () => {
    const a = Math.max(start, snap(pos, false));
    const b = ab && ab[1] > a + 0.05 ? ab[1] : Math.min(end, barS ? Math.max(0, a) + barS : a + 2);
    setAb([a, Math.max(a + 0.1, b)]);
    setLoopOn(true);
  };
  const setB = () => {
    const b = Math.min(end, snap(pos, true));
    const a = ab && ab[0] < b - 0.05 ? ab[0] : Math.max(start, barS ? b - barS : b - 2);
    setAb([a, Math.max(a + 0.1, b)]);
    setLoopOn(true);
  };
  const barNo = (x: number) => (barS ? Math.round(x / barS) + 1 : 0);
  const loopLabel = ab ? (barS ? barNo(ab[1]) - 1 <= barNo(ab[0]) ? fillRx(RX.loopBars[lang], { a: barNo(ab[0]), b: '' }).replace(/[–-]\s*$/, '') : fillRx(RX.loopBars[lang], { a: barNo(ab[0]), b: barNo(ab[1]) - 1 }) : fillRx(RX.loopSpan[lang], { a: mmss(ab[0] - start), b: mmss(ab[1] - start) })) : RX.loopAll[lang];
  // Keyboard (desktop): Space plays, L loops, A / B set points, [ ] speed.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return;
      if (e.key === ' ') (e.preventDefault(), toggle());
      else if (e.key === 'l' || e.key === 'L') setLoopOn((x) => !x);
      else if (e.key === 'a' || e.key === 'A') setA();
      else if (e.key === 'b' || e.key === 'B') setB();
      else if (e.key === '[') setSpeed((s) => Math.max(SPEEDS.min, s - SPEEDS.step));
      else if (e.key === ']') setSpeed((s) => Math.min(SPEEDS.max, s + SPEEDS.step));
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  });
  const date = new Date(take.at);
  const sub = `${dayLabel(take.at, lang)} ${clock(take.at)}`;
  const canPlay = isAudio ? !!audioUrl : notes.length > 0 || !!band;
  return (
    <main className="panel-screen recordings rec-player" data-recordings="player" data-rec-playing={playing ? '1' : '0'} data-rec-loop={loopOn ? '1' : '0'} data-rec-ab={ab ? `${ab[0].toFixed(2)}:${ab[1].toFixed(2)}` : ''} data-rec-pos={pos.toFixed(2)}>
      <header className="screen-head rec-head">
        <button className="icon-btn" onClick={() => (stopAll(), onBack())} aria-label={RX.back[lang]}>
          <Icon k="back" />
        </button>
        <div className="rec-ptitle">
          <h1>
            <Bidi text={takeTitle(take, lang)} />
          </h1>
          <small>
            <bdi>{sub}</bdi> · {take.source === 'mic' ? RX.mic[lang] : <N>MIDI</N>}
            {take.bpm ? (
              <>
                {' · '}
                <N>♩{take.bpm}</N>
              </>
            ) : null}
          </small>
        </div>
        <div className="rec-head-tools">
          <button className={`icon-btn small rec-star ${take.star ? 'on' : ''}`} aria-pressed={!!take.star} onClick={() => void starTake(take.id, !take.star)} aria-label={take.star ? RX.unstar[lang] : RX.star[lang]} data-rec-player-star="1">
            <RIcon k="star" fill={!!take.star} />
          </button>
          <button className="icon-btn small" onClick={() => setMenu(true)} aria-label={RX.more[lang]} data-rec-player-menu="1">
            <RIcon k="more" />
          </button>
        </div>
      </header>
      <time className="sr-only" dateTime={date.toISOString()} />

      <div className="rec-view" data-rec-view={isAudio ? 'audio' : 'midi'}>
        {isAudio ? (
          <Waveform peaks={peaks} start={start} end={end} pos={pos} ab={ab} notes={take.sung ? notes : []} onSeek={seek} />
        ) : (
          <Roll notes={notes} band={mix !== 'me' ? band : null} start={start} end={end} pos={pos} ab={ab} barS={barS} onSeek={seek} />
        )}
        {!canPlay && !isAudio && <p className="rec-empty">{RX.noSound[lang]}</p>}
      </div>

      <div className="rec-timerow" dir="ltr">
        <span className="t3">{mmss(pos - start)}</span>
        <button className={`chip rec-loopchip ${loopOn ? 'on' : ''}`} aria-pressed={loopOn} onClick={() => setLoopOn((x) => !x)} data-rec-loop-toggle="1" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <RIcon k="loop" size={14} /> <Bidi text={loopLabel} />
        </button>
        <span className="t3">{mmss(end - start)}</span>
      </div>

      <div className="rec-ab" dir="ltr">
        <button className="btn small ghost" onClick={setA} data-rec-seta="1">
          A
        </button>
        <button className="btn small ghost" onClick={() => setAb(null)} disabled={!ab} data-rec-clearab="1">
          {RX.clearAB[lang]}
        </button>
        <button className="btn small ghost" onClick={setB} data-rec-setb="1">
          B
        </button>
      </div>

      <div className="rec-transport" dir="ltr">
        <button className="icon-btn" onClick={() => seek(pos - 5)} aria-label={RX.back5[lang]}>
          <RIcon k="back5" />
        </button>
        <button className="icon-btn rec-playbtn" onClick={toggle} disabled={!canPlay} aria-label={playing ? RX.pause[lang] : RX.play[lang]} data-rec-play="1">
          <RIcon k={playing ? 'pause' : 'play'} size={28} fill={!playing} />
        </button>
        <button className="icon-btn" onClick={() => seek(pos + 5)} aria-label={RX.fwd5[lang]}>
          <RIcon k="fwd5" />
        </button>
      </div>

      <label className="rec-speed">
        <span className="grow">{RX.speed[lang]}</span>
        <input type="range" min={SPEEDS.min} max={SPEEDS.max} step={SPEEDS.step} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} dir="ltr" aria-valuetext={`${speed}%`} data-rec-speed="1" />
        <b>
          <N>{speed}%</N>
        </b>
        {isAudio && <small>{RX.pitchKept[lang]}</small>}
      </label>

      {band && !isAudio && (
        <div className="ps-seg rec-mix" role="radiogroup" aria-label={RX.withBand[lang]}>
          {(['me', 'band', 'bandOnly'] as Mix[]).map((m) => (
            <button key={m} role="radio" aria-checked={mix === m} className={mix === m ? 'on' : ''} onClick={() => setMix(m)} data-rec-mix={m}>
              {m === 'me' ? RX.onlyMe[lang] : m === 'band' ? RX.withBand[lang] : RX.onlyBand[lang]}
            </button>
          ))}
        </div>
      )}

      <div className="rec-actions">
        <button className="btn primary" onClick={() => (stopAll(), openEncoreFromTake(take.id, ab))} data-rec-practise="1">
          {RX.practise[lang]}
        </button>
        {take.itemId && (
          <button className="btn small ghost" onClick={() => void takesOfItem(take.itemId!).then(setHistory)} data-rec-history="1">
            {RX.allOfItem[lang]}
          </button>
        )}
      </div>
      <div className="rec-actions2" data-rec-actions2="1">
        <button className="icon-btn small" onClick={() => (stopAll(), (location.hash = `/recordings/compare/${encodeURIComponent(take.id)}`))} aria-label={RX2Compare[lang]} title={RX2Compare[lang]} data-rec-compare="1">
          <Icon k="swap" size={18} />
        </button>
        <button className="icon-btn small" onClick={() => setSheet2('list')} aria-label={RX2.addTo[lang]} title={RX2.addTo[lang]} data-rec-addlist="1">
          <XIcon k="list" />
        </button>
        <button className="icon-btn small" disabled={!canPlay} onClick={() => (stopAll(), void playTakeInBackground(take, lang, ab, loopOn ? 'one' : 'off'))} aria-label={RX2.playBg[lang]} title={RX2.playBg[lang]} data-rec-bg="1">
          <XIcon k="bg" />
        </button>
        <button className="icon-btn small" onClick={() => setSheet2('export')} aria-label={RX2.export[lang]} title={RX2.export[lang]} data-rec-export="1">
          <Icon k="share" size={18} />
        </button>
      </div>
      {sheet2 === 'list' && <AddToPlaylistSheet lang={lang} takeIds={[take.id]} onClose={() => setSheet2(null)} />}
      {sheet2 === 'export' && <ExportSheet lang={lang} take={take} onClose={() => setSheet2(null)} />}

      {audioUrl && <audio ref={audioEl} src={audioUrl} preload="auto" onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setAudioDur(e.currentTarget.duration)} />}
      {menu && <TakeMenu lang={lang} take={take} folders={folders} onClose={() => setMenu(false)} onDeleted={() => (stopAll(), onBack())} />}
      {history && (
        <Sheet lang={lang} title={RX.allOfItem[lang]} onClose={() => setHistory(null)}>
          <ProgressChart
            lang={lang}
            pts={progressPoints(history.map((h) => ({ id: h.id, at: h.at, notes: unpackNotes(h.notes).map((n) => ({ pitch: n.pitch, on: n.on })), bpm: h.bpm, result: h.result ?? null })))}
            current={[take.id]}
            onOpen={(id) => {
              setHistory(null);
              if (id !== take.id) (stopAll(), onOpen(id));
            }}
          />
          <ul className="rec-history">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  className={`rec-folder-row ${h.id === take.id ? 'on' : ''}`}
                  onClick={() => {
                    setHistory(null);
                    if (h.id !== take.id) (stopAll(), onOpen(h.id));
                  }}
                >
                  <span className="grow">
                    <N>{dayKey(h.at).split('-').reverse().slice(0, 2).join('.')}</N> <N>{clock(h.at)}</N>
                  </span>
                  <small>
                    <Bidi text={resultLine(h, lang)} />
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </main>
  );
}

/** Seek by tapping the view: musical time runs left → right in both languages. */
function useSeek(start: number, end: number, onSeek: (x: number) => void) {
  return (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(start + ((e.clientX - r.left) / r.width) * (end - start));
  };
}

const W = 1000;
function Roll({ notes, band, start, end, pos, ab, barS, onSeek }: { notes: ReturnType<typeof unpackNotes>; band: NoteEvent[] | null; start: number; end: number; pos: number; ab: [number, number] | null; barS: number | null; onSeek: (x: number) => void }) {
  const H = 220;
  const span = Math.max(0.5, end - start);
  const x = (t: number) => ((t - start) / span) * W;
  const ps = [...notes.map((n) => n.pitch), ...(band ?? []).filter((e) => !e.perc).map((e) => e.midi)];
  const loP = ps.length ? Math.min(...ps) - 2 : 48;
  const hiP = ps.length ? Math.max(...ps) + 2 : 84;
  const rows = Math.max(12, hiP - loP);
  const y = (p: number) => H - 14 - ((p - loP) / rows) * (H - 22);
  const rowH = Math.max(2.5, (H - 22) / rows - 0.6);
  const bars: number[] = [];
  if (barS) for (let b = Math.ceil(start / barS) * barS; b <= end + 1e-6 && bars.length < 400; b += barS) bars.push(b);
  const seek = useSeek(start, end, onSeek);
  return (
    <svg className="rec-roll" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ direction: 'ltr' }} onPointerDown={seek} role="img" aria-label="roll" data-rec-notes={notes.length}>
      <rect x={0} y={0} width={W} height={H} className="rec-bg" />
      {ab && <rect x={x(ab[0])} y={0} width={Math.max(2, x(ab[1]) - x(ab[0]))} height={H} className="rec-sel" />}
      {bars.map((b, i) => (
        <g key={i}>
          <line x1={x(b)} x2={x(b)} y1={10} y2={H} className="rec-barline" />
          {bars.length <= 48 && (
            <text x={x(b) + 4} y={10} className="rec-barno">
              {Math.round(b / barS!) + 1}
            </text>
          )}
        </g>
      ))}
      {(band ?? [])
        .filter((e) => !e.perc)
        .map((e, i) => (
          <rect key={`b${i}`} x={x(e.start)} y={y(e.midi) - rowH / 2} width={Math.max(2, (e.duration / span) * W)} height={rowH} rx={1.5} className="rec-bandnote" />
        ))}
      {notes.map((n, i) => (
        <rect key={i} x={x(n.on / 1000)} y={y(n.pitch) - rowH / 2} width={Math.max(3, (((n.off ?? n.on + 250) - n.on) / 1000 / span) * W)} height={rowH} rx={2} className="rec-note-r" />
      ))}
      <line x1={x(pos)} x2={x(pos)} y1={0} y2={H} className="rec-playhead" />
    </svg>
  );
}

function Waveform({ peaks, start, end, pos, ab, notes, onSeek }: { peaks: Uint8Array | null; start: number; end: number; pos: number; ab: [number, number] | null; notes: ReturnType<typeof unpackNotes>; onSeek: (x: number) => void }) {
  const H = 160;
  const span = Math.max(0.5, end - start);
  const x = (t: number) => ((t - start) / span) * W;
  const cols = 160;
  const vals = useMemo(() => {
    if (!peaks?.length) return Array.from({ length: cols }, (_, i) => 0.12 + 0.1 * Math.abs(Math.sin(i * 0.9)));
    return Array.from({ length: cols }, (_, i) => {
      const a = Math.floor((i / cols) * peaks.length);
      const b = Math.max(a + 1, Math.floor(((i + 1) / cols) * peaks.length));
      let m = 0;
      for (let k = a; k < b; k++) m = Math.max(m, peaks[k]);
      return Math.max(0.03, m / 255);
    });
  }, [peaks]);
  const ps = notes.map((n) => n.pitch);
  const loP = ps.length ? Math.min(...ps) - 3 : 0;
  const hiP = ps.length ? Math.max(...ps) + 3 : 1;
  const seek = useSeek(start, end, onSeek);
  return (
    <svg className="rec-wave" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ direction: 'ltr' }} onPointerDown={seek} role="img" aria-label="waveform" data-rec-peaks={peaks?.length ?? 0}>
      <rect x={0} y={0} width={W} height={H} className="rec-bg" />
      {ab && <rect x={x(ab[0])} y={0} width={Math.max(2, x(ab[1]) - x(ab[0]))} height={H} className="rec-sel" />}
      {vals.map((v, i) => {
        const h = v * (H - 20);
        return <rect key={i} x={(i / cols) * W + 1} y={(H - h) / 2} width={W / cols - 2} height={h} rx={2} className={((i + 0.5) / cols) * span + start <= pos ? 'rec-wbar on' : 'rec-wbar'} />;
      })}
      {notes.map((n, i) => (
        <line key={i} x1={x(n.on / 1000)} x2={x((n.off ?? n.on + 200) / 1000)} y1={H - 10 - ((n.pitch - loP) / Math.max(1, hiP - loP)) * (H - 20)} y2={H - 10 - ((n.pitch - loP) / Math.max(1, hiP - loP)) * (H - 20)} className="rec-trace" />
      ))}
      <line x1={x(pos)} x2={x(pos)} y1={0} y2={H} className="rec-playhead" />
    </svg>
  );
}

// ───────────────────────────── outside the library ─────────────────────────────

/** Settings → Privacy: the two switches, the privacy line, and a way in. */
export function RecordingSettings({ lang, s, onChange }: { lang: Lang; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  return (
    <section className="set-card rec-settings" data-rec-settings="1">
      <h2>{RX.setTitle[lang]}</h2>
      <label className="toggle-row">
        <input type="checkbox" checked={s.keepTakeNotes !== false} onChange={(e) => onChange({ keepTakeNotes: e.target.checked })} data-rec-keepnotes="1" />
        <span>
          {RX.keepNotes[lang]}
          <small className="field-hint">{RX.keepNotesHint[lang]}</small>
        </span>
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={s.keepTakes !== false} onChange={(e) => onChange({ keepTakes: e.target.checked })} data-rec-keepaudio="1" />
        <span>
          {RX.keepAudio[lang]}
          <small className="field-hint">
            <Bidi text={RX.keepAudioHint[lang]} />
          </small>
        </span>
      </label>
      {cloudConfigured && TAKE_NOTES_SYNC_ON() && (
        <label className="toggle-row">
          <input type="checkbox" checked={!!s.syncTakeNotes} onChange={(e) => onChange({ syncTakeNotes: e.target.checked })} data-rec-syncnotes="1" />
          <span>
            {EX.syncNotes[lang]}
            <small className="field-hint">{EX.syncNotesHint[lang]}</small>
          </span>
        </label>
      )}
      <p className="field-hint">{RX.privacy[lang]}</p>
      <a className="link" href="#/recordings" data-open-recordings="settings">
        {RX.open[lang]}
      </a>
    </section>
  );
}

/** The voice-consent sheet's body (replaces strings.ts' consentBody, which said no recordings are kept). */
export const ConsentBody = ({ lang }: { lang: Lang }) => <Bidi text={CONSENT_BODY[lang]} />;

/** "All my recordings" from a take review or the diary (a small link, app chrome). */
export function RecLink({ lang, className = '' }: { lang: Lang; className?: string }) {
  return (
    <a className={`link rec-link ${className}`} href="#/recordings" data-open-recordings="1">
      <RIcon k="voice" size={14} /> {RX.allRecordings[lang]}
    </a>
  );
}

/** The Progress screen's entry card (beside the practice diary): how many takes are kept, one tap to the library. */
export function RecordingsEntryCard({ lang }: { lang: Lang }) {
  const [n] = useRecordings(() => countTakes(), [], 0);
  return (
    <a className="set-card in-entry rec-entry" href="#/recordings" data-open-recordings="progress">
      <span className="in-entry-n">
        <RIcon k="voice" size={22} />
      </span>
      <span className="in-entry-text">
        <b>{RX.title[lang]}</b>
        <small>{n === 1 ? RX.oneTake[lang] : fillRx(RX.takes[lang], { n })}</small>
      </span>
      <span aria-hidden="true">
        <Icon k="fwd" />
      </span>
    </a>
  );
}

// ───────────────────────────── the practice diary's recordings (§6.7) ─────────────────────────────

/** Local midnight of a 'YYYY-MM-DD' day as ISO, `plus` days later. */
const dayStartIso = (day: string, plus = 0) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d + plus).toISOString();
};

/**
 * The diary's compact list of a day's (or a span's) recordings: one row per take — glyph, name, time — linking to the
 * player; a span shows its newest `maxDays` days with recordings, `perDay` rows each and "N more" into the library.
 */
export function DayRecordings({ lang, from, to = from, maxDays = 7, perDay = 3, title = true, asCard = false }: { lang: Lang; from: string; to?: string; maxDays?: number; perDay?: number; title?: boolean; /** In its own card with a heading (the Time tab); nothing at all when the span has no recordings. */ asCard?: boolean }) {
  const [days] = useRecordings(
    async () => {
      const m = await takesByDay(dayStartIso(from), dayStartIso(to, 1), dayKey);
      return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, maxDays);
    },
    [from, to, maxDays],
    [] as [string, TakeHead[]][],
  );
  if (!days.length) return null;
  const span = from !== to;
  const list = (
    <div className="rec-dayrecs" data-rec-day={span ? `${from}..${to}` : from}>
      {title && !asCard && (
        <small className="rec-dayrecs-h">
          <RIcon k="voice" size={13} /> {RX.dayRecs[lang]}
        </small>
      )}
      {days.map(([day, hs]) => (
        <div key={day} className="rec-dayrecs-day">
          {span && <span className="rec-dayrecs-d">{dayLabel(hs[0].at, lang)}</span>}
          <ul className="rec-dayrecs-list">
            {hs.slice(0, perDay).map((h) => (
              <li key={h.id}>
                <a className="rec-dayrec" href={`#/recordings/${encodeURIComponent(h.id)}`} data-rec-dayrec={h.id}>
                  <span className="rec-glyph" aria-hidden="true">
                    <RIcon k={h.audioId ? 'play' : h.sung ? 'voice' : h.source === 'mic' ? 'mic' : 'keys'} size={13} />
                  </span>
                  <span className="rec-dayrec-t">
                    <Bidi text={takeTitle(h, lang)} />
                  </span>
                  <small>
                    <N>{clock(h.at)}</N>
                  </small>
                </a>
              </li>
            ))}
          </ul>
          {hs.length > perDay && (
            <a className="link rec-dayrecs-more" href="#/recordings" data-open-recordings="diary-day">
              {fillRx(RX.dayMore[lang], { n: hs.length - perDay })}
            </a>
          )}
        </div>
      ))}
    </div>
  );
  return asCard ? (
    <section className="set-card" data-rec-daycard="1">
      <h2>{RX.dayRecs[lang]}</h2>
      {list}
    </section>
  ) : (
    list
  );
}
