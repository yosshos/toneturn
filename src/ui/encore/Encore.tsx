// Encore / הדרן — "My phrases" (SPEC-PHRASE-STUDIO): keep a phrase from any take or just play, trim it to ≤ 8 bars, fix
// the context, plan it (target tempo, 12 keys easiest first, hands), practise it on the drills engine through the
// 12-key × tempo map until it is yours. Routes: #/encore, /library, /record, /caught/<take>, /new?take=…&from=…&to=…,
// /context?take=…, /plan/<id>, /phrase/<id>, /run/<id>/<key>[/<hand>], /yours/<id>, /pattern[/<id>].
// Every screen fits one phone screen (320×720); musical time runs left → right; Latin is isolated in Hebrew.

import { useEffect, useMemo, useRef, useState } from 'react';
import '../../encore.css';
import type { ItemState } from '../../engine/drills/types';
import type { Settings } from '../../storage/progress';
import type { CustomDrill } from '../../engine/drills/types';
import type { Lick, LickBook, LickInstrument } from '../../engine/licks';
import { saveSlot, loadSlot, clearSlot } from '../../storage/resume';
import { piano } from '../services';
import { DrillScore, drillSettingsOf } from '../Drills';
import { DrillCreator } from '../DrillCreator';
import { Toni } from '../Toni';
import { getEncoreTake, getEncoreTakeSync, parseEncoreHash, putMemoryTake, recentFreeTakes, encoreTakeHash, type EncoreTake, type RawNote } from '../../engine/encore/takeSource';
import { catchTake, detectKeyChords, dotsOf, onsetEvents, type Caught, type BeatNote } from '../../engine/encore/detect';
import { candidates, boundaries, clampSpan, snapHandle, spanBars, MAX_BARS } from '../../engine/encore/segment';
import { isGhost, splitHands, wrongNoteFix, type QuantMode } from '../../engine/encore/quantise';
import { badge, whyLine, xpPreview, gradeOf } from '../../engine/encore/difficulty';
import { bestTempo, daysPractised, finalHand, forInstrument, handsOf, keyOrder, keysInRange, keysNeeded, makePhrase, nextKey, overCeiling, passedKeys, phraseDrill, phraseMap, phraseNeck, phraseRank, phraseRungs, planOf, promotion, RANK_NAME, roundToLadder, twoHands, type Hand } from '../../engine/encore/phrase';
import { setInstrumentCtx, singerRange } from '../../engine/encore/placement';
import { lickInstrumentOf } from '../LickTrainer';
import { bassTuningOf } from '../../storage/progress';
import { AudioRecordMode, TapTempo, audioTakeNote } from './AudioRecord';
import { duePhrases } from '../../engine/encore/connect';
import { chartChords, chordsFor, draftFrom, gridNotes, library, newPhraseId, patternToPhrase, takeOnGrid, type TrimState } from '../../engine/encore/library';
import { ladderStep } from '../../engine/drills/ladder';
import { midi } from '../../speech/midi';
import { saveTake } from '../../storage/recordings';
import { PianoRoll, type RollNote } from './PianoRoll';
import { EncoreRun, type EncoreTakeFn } from './EncoreRun';
import { Bi, Conf, DiffBadge, Dyn, EncoreGlyph, KeyB, KeyMap, KeyStrip, Seg, T, Tempo, kName, type Lang } from './bits';

export interface EncoreProps {
  lang: Lang;
  settings: Settings;
  items: Record<string, ItemState>;
  onSettings: (p: Partial<Settings>) => void;
  onTake: EncoreTakeFn;
  onBack: () => void;
  /** Patterns practise as before, in the technique hub. */
  onDrills: () => void;
}

const mod = (n: number) => ((n % 12) + 12) % 12;
/** The open course's instrument (keys → piano; guitar, bass, voice; Jazz → the player's own): set on every render. */
let INST: LickInstrument = 'piano';
const INST_NAME: Record<LickInstrument, { en: string; he: string }> = { piano: { en: 'Piano', he: 'פסנתר' }, guitar: { en: 'Guitar', he: 'גיטרה' }, bass: { en: 'Bass', he: 'בס' }, voice: { en: 'Voice', he: 'קול' } };
const nav = (path: string) => {
  location.hash = `/encore${path ? `/${path}` : ''}`;
};

export function EncoreScreen(p: EncoreProps) {
  const { lang, settings } = p;
  const he = lang === 'he';
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const r = parseEncoreHash(hash);
  // v2: the course's instrument, the singer's range and the tunings for placement (§7.4)
  INST = lickInstrumentOf(settings);
  setInstrumentCtx({ range: settings.voiceRange ?? null, bassTuning: bassTuningOf(settings) ?? 'bass', guitarTuning: settings.tuning && settings.tuning !== 'upright' && !settings.tuning.startsWith('bass') ? settings.tuning : 'standard' });
  // The latest lick book (several writes can follow each other before the settings come back).
  const bookRef = useRef<LickBook>(settings.lickBook ?? {});
  useEffect(() => {
    bookRef.current = settings.lickBook ?? {};
  }, [settings.lickBook]);
  const setBook = (b: LickBook) => {
    bookRef.current = b;
    p.onSettings({ lickBook: b });
  };
  const [live, setLive] = useState<Record<string, ItemState>>({});
  const items = useMemo(() => ({ ...p.items, ...live }), [p.items, live]);
  const onTake: EncoreTakeFn = (st, evs, xp, m) => {
    setLive((x) => ({ ...x, [st.itemId]: st }));
    if (m.verdict === 'skip') return p.onTake(st, [], 0, { ...m, verdict: 'not' });
    p.onTake(st, evs, xp, m);
  };
  // off the piano a two-hand phrase is practised as its main line (forInstrument); saving never drops its left hand
  const byId = (id?: string) => {
    const l = id ? (bookRef.current.own ?? []).find((x) => x.id === id) : undefined;
    return l ? forInstrument(l, INST) : undefined;
  };
  const savePhrase = (l0: Lick) => {
    const old = (bookRef.current.own ?? []).find((x) => x.id === l0.id);
    const l = old?.lh?.length && !l0.lh?.length && INST !== 'piano' ? { ...l0, lh: old.lh } : l0;
    const own = [...(bookRef.current.own ?? []).filter((x) => x.id !== l.id), l];
    setBook({ ...bookRef.current, own });
  };
  const deletePhrase = (id: string) => setBook({ ...bookRef.current, own: (bookRef.current.own ?? []).filter((x) => x.id !== id) });

  const head = (title: React.ReactNode, sub?: React.ReactNode, back: () => void = () => history.back(), extra?: React.ReactNode) => (
    <header className="screen-head enc-head">
      <button className="icon-btn" onClick={back} aria-label={he ? 'חזרה' : 'Back'}>
        <span className="flip-rtl">‹</span>
      </button>
      <h1>
        {title}
        {sub && <small className="enc-sub">{sub}</small>}
      </h1>
      {extra}
    </header>
  );

  // ─── views ───
  if (r.view === 'record') return INST !== 'piano' || r.id === 'mic' || (!midi.devices.length && !settings.midiInput) ? <AudioRecordMode lang={lang} head={head} inst={INST} onMidi={INST === 'piano' && midi.devices.length ? () => nav('record') : undefined} /> : <RecordMode lang={lang} head={head} />;
  if (r.view === 'caught' && r.id) return <CaughtView lang={lang} head={head} takeId={r.id} />;
  if ((r.view === 'new' || r.view === 'context') && r.take)
    return <TrimFlow key={r.take} lang={lang} head={head} takeId={r.take} from={r.from} to={r.to} step={r.view === 'new' ? 'trim' : 'context'} settings={settings} onSave={(l) => (savePhrase(l), clearSlot(`encore:trim:${r.take}`), nav(`plan/${l.id}`))} />;
  if (r.view === 'plan') {
    const l = byId(r.id);
    if (l) return <PlanView lang={lang} head={head} l={l} items={items} onSave={savePhrase} />;
  }
  if (r.view === 'phrase') {
    const l = byId(r.id);
    if (l) return <PhraseView lang={lang} head={head} l={l} items={items} book={bookRef.current} onDelete={() => (deletePhrase(l.id), nav('library'))} />;
  }
  if (r.view === 'run' && r.id) {
    const [id, k, h] = r.id.split('~');
    const l = byId(id);
    if (l) {
      const key = Number.isFinite(Number(k)) ? mod(Number(k)) : nextKey(l, items, INST);
      const hand = (['R', 'L', 'RL'].includes(h) ? h : handsOf(l)[0]) as Hand;
      return (
        <main className="drills-screen enc-screen" data-encore="run" data-drills="run" data-phrase={l.id}>
          {head(<Bi text={T(l.name, lang)} />, <>{he ? 'בסולם' : 'in'} <KeyB k={key} minor={!!l.minor} /></>, () => nav(`phrase/${l.id}`))}
          <EncoreRun
            key={`${l.id}:${key}:${hand}`}
            lang={lang}
            settings={settings}
            l={l}
            keyPc={key}
            hand={hand}
            inst={INST}
            items={items}
            onTake={onTake}
            onBook={setBook}
            onYours={() => nav(`yours/${l.id}`)}
            onNextKey={(nk, nh) => nav(`run/${l.id}~${nk}~${nh}`)}
            onClose={() => nav(`phrase/${l.id}`)}
          />
        </main>
      );
    }
  }
  if (r.view === 'yours') {
    const l = byId(r.id);
    if (l) return <YoursView lang={lang} l={l} items={items} onClose={() => nav(`phrase/${l.id}`)} />;
  }
  if (r.view === 'library') return <LibraryView lang={lang} head={head} book={bookRef.current} custom={settings.customDrills} items={items} onMakePhrase={(c) => {
    const l = patternToPhrase(c, newPhraseId());
    if (l) (savePhrase(l), nav(`plan/${l.id}`));
  }} />;
  if (r.view === 'pattern') {
    const edit = (settings.customDrills ?? []).find((c) => c.id === r.id);
    const ds = drillSettingsOf(settings);
    return (
      <main className="drills-screen enc-screen" data-encore="pattern">
        {head(he ? 'תבנית חדשה' : 'New pattern', he ? 'הדרן' : 'Encore', () => nav('library'))}
        <DrillCreator
          lang={lang}
          edit={edit}
          instrument="piano"
          settings={ds}
          onSave={(c: CustomDrill) => {
            p.onSettings({ customDrills: [...(settings.customDrills ?? []).filter((x) => x.id !== c.id), c] });
            nav('library');
          }}
          onDelete={edit ? () => (p.onSettings({ customDrills: (settings.customDrills ?? []).filter((x) => x.id !== edit.id) }), nav('library')) : undefined}
          onTry={(c: CustomDrill) => {
            p.onSettings({ customDrills: [...(settings.customDrills ?? []).filter((x) => x.id !== c.id), c] });
            p.onDrills();
          }}
        />
      </main>
    );
  }
  // home
  const due = duePhrases(bookRef.current, items, 'today', undefined, INST, 2);
  const lib = library(bookRef.current, settings.customDrills, items, INST);
  const nPh = lib.filter((x) => x.kind === 'phrase');
  const yours = nPh.filter((x) => x.rank >= 5).length;
  const sketch = nPh.filter((x) => x.rank === 0).length;
  return (
    <main className="panel-screen enc-screen" data-encore="home">
      {head(he ? 'הדרן' : 'Encore', he ? 'המשפטים שלי' : 'My phrases', p.onBack, (
        <button className="icon-btn" onClick={() => nav('library')} aria-label={he ? 'המשפטים שלי' : 'My phrases'} data-enc-lib="1">
          <EncoreGlyph size={16} />
        </button>
      ))}
      {due.length > 0 && (
        <section className="enc-block" data-enc-due={due.length}>
          <div className="row">
            <b className="t2 grow">{he ? 'לחזרה היום' : 'Due today'}</b>
            <span className="enc-pill ac">{due.length}</span>
          </div>
          {due.map((d) => (
            <button key={d.l.id} className="enc-card enc-due-card" onClick={() => nav(`run/${d.l.id}~${d.key}`)} data-due-phrase={d.l.id}>
              <Dyn rank={phraseRank(d.l, items, bookRef.current, INST)} />
              <span className="grow col">
                <b className="t2">
                  <Bi text={T(d.l.name, lang)} />
                </b>
                <small className="t3">
                  <KeyB k={d.key} minor={!!d.l.minor} /> {he ? 'ב־' : 'at '}
                  <Tempo bpm={d.bpm} /> · <bdi dir="ltr">{d.minutes}</bdi> {he ? 'דק׳' : 'min'}
                </small>
              </span>
              <KeyStrip passed={passedKeys(d.l, items, INST).length} current />
            </button>
          ))}
        </section>
      )}
      <Shelf lang={lang} />
      <button className="enc-block enc-card-soft enc-lib-sum" onClick={() => nav('library')} data-enc-libsum="1">
        <span className="row">
          <b className="t2 grow">{he ? 'המשפטים שלי' : 'My phrases'}</b>
          <small className="t3">
            <bdi dir="ltr">{nPh.length}</bdi> {he ? 'משפטים' : 'phrases'} · <bdi dir="ltr">{lib.length - nPh.length}</bdi> {he ? 'תבניות' : 'patterns'}
          </small>
        </span>
        <span className="row wrap">
          <span className="enc-pill">
            {he ? 'שלך' : 'Yours'} · <bdi dir="ltr">{yours}</bdi>
          </span>
          <span className="enc-pill">
            {he ? 'בלמידה' : 'Learning'} · <bdi dir="ltr">{nPh.length - yours - sketch}</bdi>
          </span>
          <span className="enc-pill">
            {he ? 'טיוטה' : 'Sketch'} · <bdi dir="ltr">{sketch}</bdi>
          </span>
        </span>
      </button>
      <div className="enc-foot">
        <button className="btn primary enc-full" onClick={() => nav('record')} data-enc-record="1">
          <span className="enc-recdot" aria-hidden="true" />
          {he ? 'להקליט משהו חדש' : 'Record something new'}
        </button>
        <button className="link" onClick={() => nav('pattern')} data-enc-pattern="1">
          {he ? 'תבנית חדשה (עורך התרגילים)' : 'New pattern (drill editor)'}
        </button>
      </div>
    </main>
  );
}

/** "From your recent playing" (§4.2): the last free takes in My recordings; a tap opens the trim screen. */
function Shelf({ lang }: { lang: Lang }) {
  const he = lang === 'he';
  const [shelf, setShelf] = useState<EncoreTake[]>([]);
  useEffect(() => {
    let on = true;
    void recentFreeTakes(3).then((x) => on && setShelf(x));
    return () => {
      on = false;
    };
  }, []);
  return (
      <section className="enc-block enc-card-flat" data-enc-shelf={shelf.length}>
        <div className="row">
          <b className="t2 grow">{he ? 'מהנגינה האחרונה שלך' : 'From your recent playing'}</b>
        </div>
        {shelf.length ? (
          <ul className="enc-shelf">
            {shelf.map((t) => (
              <li key={t.id}>
                <button className="enc-shelf-row" onClick={() => (location.hash = encoreTakeHash(t.id).slice(1))} data-shelf-take={t.id}>
                  <span className="enc-thumb">
                    {(() => {
                      const ns = t.notes.slice(0, 40);
                      const s0 = Math.min(...ns.map((n) => n.on));
                      const end = Math.max(...ns.map((n) => (n.off ?? n.on + 200) - s0)) / 500;
                      return <PianoRoll notes={ns.map((n) => ({ midi: n.pitch, beat: (n.on - s0) / 500, dur: Math.max(0.2, ((n.off ?? n.on + 200) - n.on) / 500), vel: n.vel }))} from={0} to={Math.max(4, end)} height={38} barNums={false} label="" />;
                    })()}
                  </span>
                  <span className="grow col">
                    <b className="t2">
                      <Bi text={T(t.title, lang)} />
                    </b>
                    <small className="t3">
                      <bdi dir="ltr">{new Date(t.at).toLocaleDateString(he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric' })}</bdi> · <bdi dir="ltr">{t.notes.length}</bdi> {he ? 'תווים' : 'notes'}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t3">{he ? 'נגנו משהו — אלתור, הקלטה חופשית או תרגיל — ושמרו ממנו משפט.' : 'Play something — an improv, a free recording, a drill — and keep a phrase from it.'}</p>
        )}
      </section>
  );
}

type Head = (title: React.ReactNode, sub?: React.ReactNode, back?: () => void, extra?: React.ReactNode) => React.ReactNode;

// ───────────────────────────── Record mode (§4.3, MIDI) ─────────────────────────────

const SILENCE_MS = 2500;
const MAX_MS = 180_000;

function RecordMode({ lang, head }: { lang: Lang; head: Head }) {
  const he = lang === 'he';
  const [notes, setNotes] = useState<RawNote[]>([]);
  const [state, setState] = useState<'armed' | 'listening'>('armed');
  const [click, setClick] = useState(false);
  const [now, setNow] = useState(0);
  const t0 = useRef(0);
  const last = useRef(0);
  const held = useRef(new Map<number, RawNote>());
  const buf = useRef<RawNote[]>([]);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    const ns = buf.current.map((n) => ({ ...n, off: n.off ?? now }));
    if (ns.length < 3) {
      done.current = false;
      buf.current = [];
      setNotes([]);
      setState('armed');
      return;
    }
    const title = { en: 'Free recording', he: 'הקלטה חופשית' };
    const id = putMemoryTake({ kind: 'record', instrument: 'piano', title, source: 'midi', notes: ns });
    // the take is kept in My recordings too (it shows on the shelf and in the timeline)
    void saveTake({ durationMs: Math.round(Math.max(...ns.map((n) => n.off ?? n.on))), course: null, instrument: 'piano', kind: 'record', title, sung: false, source: 'midi', played: ns }).catch(() => {});
    nav(`caught/${encodeURIComponent(id)}`);
  };
  useEffect(() => {
    const off = midi.onNote((m, on, at, vel) => {
      if (done.current) return;
      if (on) {
        if (!t0.current) {
          t0.current = at;
          setState('listening');
        }
        const n: RawNote = { pitch: m, on: at - t0.current, off: null, vel };
        buf.current.push(n);
        held.current.set(m, n);
      } else {
        const n = held.current.get(m);
        if (n) n.off = at - t0.current;
        held.current.delete(m);
      }
      last.current = at;
      setNotes([...buf.current]);
    });
    const id = window.setInterval(() => {
      if (!t0.current || done.current) return;
      const t = performance.now();
      setNow(t - t0.current);
      if ((held.current.size === 0 && t - last.current > SILENCE_MS) || t - t0.current > MAX_MS) finish();
    }, 100);
    return () => (off(), window.clearInterval(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // the click (optional, default off): a soft tick at ♩100 while armed / listening
  useEffect(() => {
    if (!click) return;
    const c = new AbortController();
    void piano.unlock().then(() => piano.play(Array.from({ length: 360 }, (_, k) => ({ midi: 96, start: k * 0.6, duration: 0.05, velocity: k % 4 ? 0.25 : 0.4, perc: (k % 4 ? 'click' : 'accent') as 'click' | 'accent' })), 216, c.signal).catch(() => {}));
    return () => c.abort();
  }, [click]);
  const caughtLive = notes.length >= 8 ? catchTake(notes) : null;
  const secs = Math.floor(now / 1000);
  const span = Math.max(8, (notes.length ? Math.max(...notes.map((n) => n.off ?? now)) : 0) / 500 + 1);
  return (
    <main className="panel-screen enc-screen" data-encore="record" data-rec-state={state}>
      {head(he ? 'הקלטה חופשית' : 'Free recording', <>{he ? 'פסנתר' : 'Piano'} · <bdi dir="ltr">MIDI</bdi></>, () => nav(''), (
        <button className="link" onClick={() => nav('record/mic')} data-rec-mic="1">
          {he ? 'מיקרופון' : 'Mic'}
        </button>
      ))}
      <div className="enc-card-flat enc-rec-bar row">
        <span className={`enc-recdot ${state === 'listening' ? 'on' : ''}`} aria-hidden="true" />
        <b className="grow">{state === 'listening' ? (he ? 'מקליט' : 'Recording') : he ? 'נגנו כשתרצו' : 'Play when you like'}</b>
        <span className="enc-time" dir="ltr">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="enc-card">
        <PianoRoll notes={notes.map((n) => ({ midi: n.pitch, beat: n.on / 500, dur: Math.max(0.15, ((n.off ?? now) - n.on) / 500), vel: n.vel }))} from={Math.max(0, span - 16)} to={span} height={200} barNums={false} playhead={now / 500} label={he ? 'מה שניגנתם' : 'what you played'} />
        <div className="row wrap enc-live" style={{ opacity: caughtLive ? 1 : 0.55 }} data-live-detect={caughtLive ? '1' : '0'}>
          <span className="ch q">
            {caughtLive ? <KeyB k={caughtLive.key.best.tonic} minor={caughtLive.key.best.minor} /> : '—'} {caughtLive && <Conf d={dotsOf(caughtLive.key.conf)} />}
          </span>
          <span className="ch q">
            {caughtLive ? <Tempo bpm={`≈${caughtLive.grid.bpm}`} /> : <Tempo bpm="—" />} {caughtLive && <Conf d={dotsOf(caughtLive.grid.conf)} />}
          </span>
          <span className="ch q">
            <bdi dir="ltr">{caughtLive ? `${caughtLive.meter}/4` : '4/4'}</bdi>
          </span>
        </div>
      </div>
      <div className="row">
        <small className="t3 grow">{he ? 'נעצר אחרי 2.5 שניות של שקט' : 'Stops after 2.5 s of silence'}</small>
        <label className="row enc-tog-row">
          <small className="t3">{he ? 'מטרונום' : 'Click'}</small>
          <input type="checkbox" className="enc-tog" checked={click} onChange={(e) => setClick(e.target.checked)} data-rec-click="1" />
        </label>
      </div>
      {!midi.devices.length && <p className="field-hint">{he ? 'חברו מקלדת MIDI והדליקו MIDI בהגדרות כדי להקליט.' : 'Connect a MIDI keyboard and turn MIDI on in Settings to record.'}</p>}
      <div className="enc-foot">
        <button className="btn mega enc-full" onClick={finish} disabled={state !== 'listening'} data-rec-stop="1">
          <span className="enc-stop" aria-hidden="true" />
          {he ? 'לעצור' : 'Stop'}
        </button>
      </div>
    </main>
  );
}

// ───────────────────────────── Caught (§4.3 step 4) ─────────────────────────────

function CaughtView({ lang, head, takeId }: { lang: Lang; head: Head; takeId: string }) {
  const he = lang === 'he';
  const take = getEncoreTakeSync(takeId);
  const caught = useMemo(() => (take ? catchTake(take.notes, { bpm: take.bpm, t0: take.t0, meter: take.meter }) : null), [take]);
  const [key, setKey] = useState<{ tonic: number; minor: boolean } | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  if (!take || !caught) return <Missing lang={lang} head={head} />;
  const k = key ?? caught.key.best;
  const kd = dotsOf(caught.key.conf);
  const td = dotsOf(caught.grid.conf);
  const b = bpm ?? caught.grid.bpm;
  const go = () => {
    saveSlot(`encore:caught:${takeId}`, { title: 'Encore', route: `encore/new?take=${takeId}`, done: 0, total: 1, data: { key: k, bpm: b } });
    location.hash = encoreTakeHash(takeId).slice(1);
  };
  const ev = onsetEvents(take.notes);
  return (
    <main className="panel-screen enc-screen" data-encore="caught">
      {head(he ? 'נתפס משפט' : 'Phrase caught', undefined, () => nav('record'))}
      <div className="enc-card">
        <PianoRoll notes={take.notes.map((n) => ({ midi: n.pitch, beat: (n.on - caught.grid.t0) / (60000 / b), dur: Math.max(0.1, ((n.off ?? n.on + 200) - n.on) / (60000 / b)), vel: n.vel }))} from={Math.floor(((caught.span.start - caught.grid.t0) / (60000 / b)) / caught.meter) * caught.meter} to={Math.ceil(((caught.span.end - caught.grid.t0) / (60000 / b)) / caught.meter) * caught.meter} meter={caught.meter} height={110} label={he ? 'ההקלטה' : 'the take'} />
        <small className="tiny enc-center">
          <bdi dir="ltr">{(caught.span.start / 1000).toFixed(1)}</bdi> — <bdi dir="ltr">{(caught.span.end / 1000).toFixed(1)}</bdi> {he ? 'שנ׳ · שקט בסוף נחתך' : 's · silent tail trimmed'}
        </small>
      </div>
      <div className="enc-card enc-kv-list">
        <div className="kv">
          <span>{he ? 'תיבות' : 'Bars'}</span>
          <b dir="ltr">{caught.bars}</b>
        </div>
        <div className="kv">
          <span>{he ? 'סולם' : 'Key'}</span>
          <span className="row">
            <b>
              <KeyB k={k.tonic} /> {k.minor ? (he ? 'מינור' : 'minor') : he ? 'מז׳ור' : 'major'}
            </b>
            <Conf d={kd} />
          </span>
        </div>
        {kd < 3 && (
          <div className="kv" data-key-question="1">
            <span className="t3">{he ? 'או אולי' : 'Or maybe'}</span>
            <span className="row">
              {[caught.key.best, caught.key.second].map((g, i) => (
                <button key={i} className={`ch ${k.tonic === g.tonic && k.minor === g.minor ? 'on' : ''}`} onClick={() => setKey(g)} data-key-choice={i}>
                  <KeyB k={g.tonic} /> {g.minor ? (he ? 'מינור' : 'minor') : he ? 'מז׳ור' : 'major'}
                </button>
              ))}
            </span>
          </div>
        )}
        <div className="kv">
          <span>{he ? 'טמפו' : 'Tempo'}</span>
          <span className="row">
            <b>
              <Tempo bpm={b} />
            </b>
            <Conf d={td} />
          </span>
        </div>
        {caught.grid.alt && (
          <div className="kv" data-tempo-question="1">
            <span className="t3">{he ? 'או אולי' : 'Or maybe'}</span>
            <span className="row">
              {[caught.grid.bpm, caught.grid.alt].map((x) => (
                <button key={x} className={`ch ${b === x ? 'on' : ''}`} onClick={() => setBpm(x)} data-tempo-choice={x}>
                  <Tempo bpm={x} />
                </button>
              ))}
            </span>
          </div>
        )}
        {!caught.grid.alt && caught.grid.conf < 0.3 && (
          <div className="kv" data-tempo-tap="1">
            <span className="t3">{he ? 'הטמפו לא ברור' : 'Tempo unclear'}</span>
            <TapTempo lang={lang} onBpm={setBpm} />
          </div>
        )}
        <div className="kv">
          <span>{he ? 'משקל' : 'Meter'}</span>
          <span className="row">
            <b dir="ltr">{caught.meter}/4</b>
            <Conf d={dotsOf(caught.meterConf)} />
          </span>
        </div>
        <div className="kv">
          <span>{he ? 'תחושה' : 'Feel'}</span>
          <span className="row">
            <b>{caught.swing > 0.54 ? (he ? `סווינג ${Math.round(caught.swing * 100)}%` : `Swing ${Math.round(caught.swing * 100)}%`) : he ? 'ישר' : 'Straight'}</b>
            <Conf d={dotsOf(caught.swingConf)} />
          </span>
        </div>
      </div>
      {audioTakeNote(take, lang)}
      <small className="sr-only">{ev.length}</small>
      <div className="enc-foot">
        <button className="btn primary enc-full" onClick={go} data-caught-next="1">
          {he ? 'לבחור תיבות' : 'Choose bars'}
        </button>
        <button className="btn ghost enc-full" onClick={() => nav('record')}>
          {he ? 'להקליט שוב' : 'Record again'}
        </button>
      </div>
    </main>
  );
}

function Missing({ lang, head }: { lang: Lang; head: Head }) {
  return (
    <main className="panel-screen enc-screen" data-encore="missing">
      {head(lang === 'he' ? 'הדרן' : 'Encore', undefined, () => nav(''))}
      <p className="t3">{lang === 'he' ? 'הניסיון הזה לא נמצא במכשיר.' : 'This take is not on this device.'}</p>
    </main>
  );
}

// ───────────────────────────── Trim + context (§5.2–5.7) ─────────────────────────────

function TrimFlow({ lang, head, takeId, from, to, step, settings, onSave }: { lang: Lang; head: Head; takeId: string; from?: number; to?: number; step: 'trim' | 'context'; settings: Settings; onSave: (l: Lick) => void }) {
  const [take, setTake] = useState<EncoreTake | null>(() => getEncoreTakeSync(takeId));
  useEffect(() => {
    if (!take) void getEncoreTake(takeId).then(setTake);
  }, [take, takeId]);
  if (!take) return <Missing lang={lang} head={head} />;
  return <TrimInner lang={lang} head={head} take={take} from={from} to={to} step={step} settings={settings} onSave={onSave} />;
}

function initialTrim(take: EncoreTake, from?: number, to?: number): { s: TrimState; caught: Caught } {
  const slot = loadSlot<TrimState>(`encore:trim:${take.id}`);
  const { caught } = takeOnGrid(take);
  const over = loadSlot<{ key: { tonic: number; minor: boolean }; bpm: number }>(`encore:caught:${take.id}`)?.data;
  const spanKey = from === undefined ? '' : `${from}:${to}`;
  if (slot?.data && (from === undefined || slot.data.spanKey === spanKey)) return { s: slot.data, caught };
  const bpm = over?.bpm ?? caught.grid.bpm;
  const t0 = caught.grid.t0;
  const notes = gridNotes(take, { bpm, meter: caught.meter, t0 });
  const m = caught.meter;
  // the route's span is in seconds on the take's timeline → beats of the grid (to the beat)
  const P = 60000 / bpm;
  let f = from === undefined ? undefined : Math.round((from * 1000 - t0) / P);
  let t = to === undefined ? undefined : Math.max((f ?? 0) + 1, Math.round((to * 1000 - t0) / P));
  if (f === undefined || t === undefined) {
    const c = candidates(notes, m)[0];
    if (c) {
      f = c.from;
      t = c.to;
    } else {
      f = Math.floor(Math.min(...notes.map((n) => n.beat)) / m + 1e-6) * m;
      t = Math.min(f + MAX_BARS * m, Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur)) / m - 1e-6) * m);
    }
  }
  const sp = clampSpan(f, t, m, MAX_BARS);
  const key = over?.key ?? caught.key.best;
  return { s: { takeId: take.id, from: sp.from, to: sp.to, view: 'roll', key: key.tonic, minor: key.minor, chordsOn: true, quant: caught.swing > 0.54 ? 'swing' : 'grid', split: take.instrument !== 'piano' || take.source === 'mic' ? -1 : null, name: '', bpm, meter: m, swing: caught.swing, edits: {}, t0, spanKey }, caught };
}

function TrimInner({ lang, head, take, from, to, step, settings, onSave }: { lang: Lang; head: Head; take: EncoreTake; from?: number; to?: number; step: 'trim' | 'context'; settings: Settings; onSave: (l: Lick) => void }) {
  const he = lang === 'he';
  const init = useMemo(() => initialTrim(take, from, to), [take, from, to]);
  const [s, setS0] = useState<TrimState>(init.s);
  const [capped, setCapped] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [speed, setSpeed] = useState(0.75);
  const [playing, setPlaying] = useState(false);
  const [why, setWhy] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const setS = (x: TrimState) => {
    setS0(x);
    // never lose progress: the trim state sits in a resume slot (Back / reload returns to the same handles)
    saveSlot(`encore:trim:${take.id}`, { title: he ? 'הדרן · בחירת תיבות' : 'Encore · choosing bars', route: `encore/new?take=${take.id}`, done: 0, total: 1, data: x });
  };
  useEffect(() => {
    saveSlot(`encore:trim:${take.id}`, { title: he ? 'הדרן · בחירת תיבות' : 'Encore · choosing bars', route: `encore/new?take=${take.id}`, done: 0, total: 1, data: s });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const m = s.meter;
  const notes = useMemo(() => gridNotes(take, s), [take, s.bpm, s.meter, s.t0]); // eslint-disable-line react-hooks/exhaustive-deps
  const lo = Math.floor(Math.min(...notes.map((n) => n.beat), s.from) / m + 1e-6) * m;
  const hi = Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur), s.to) / m - 1e-6) * m;
  // a long take: a window of the selection ± 2 bars
  const vFrom = hi - lo > 16 * m ? Math.max(lo, s.from - 2 * m) : lo;
  const vTo = hi - lo > 16 * m ? Math.min(hi, s.to + 2 * m) : hi;
  const bnd = useMemo(() => boundaries(notes, m).map((b) => b.beat), [notes, m]);
  const cands = useMemo(() => candidates(notes, m), [notes, m]);
  const inSel = (n: { beat: number }) => n.beat >= s.from - 0.12 && n.beat < s.to - 0.12;
  const selIdx = notes.map((n, i) => (inSel(n) ? i : -1)).filter((i) => i >= 0);
  const selNotes: BeatNote[] = selIdx.filter((i) => s.edits[i] !== 'x').map((i) => ({ midi: notes[i].midi + (typeof s.edits[i] === 'number' ? (s.edits[i] as number) : 0), beat: notes[i].beat - Math.floor(s.from / m + 1e-6) * m, dur: notes[i].dur }));
  // context: key / chords from the selection itself
  const det = useMemo(() => detectKeyChords(selNotes, m), [JSON.stringify(selNotes), m]); // eslint-disable-line react-hooks/exhaustive-deps
  const chords = take.chart ? chordsFor(chartChords(take.chart, s.key, m, s.to + m), s.from, s.to, m) : det.best.tonic === s.key && det.best.minor === s.minor ? det.chords : [];
  const ctx = take.chart ? det.ctx : det.best.tonic === s.key ? det.ctx : 'free';
  const draft = useMemo(() => draftFrom(take, s, chords, ctx, 'enc-draft'), [take, s, JSON.stringify(chords), ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useMemo(() => (draft.rh.length + draft.lh.length >= 1 ? makePhrase(draft) : null), [draft]);
  const bars = spanBars(s.from, s.to, m);
  const onHandle = (which: 'from' | 'to', beat: number, held: boolean, shift: boolean) => {
    const v = snapHandle(beat, shift ? 'eighth' : held ? 'beat' : 'bar', m, bnd);
    const sp = clampSpan(which === 'from' ? v : s.from, which === 'to' ? v : s.to, m, MAX_BARS, which);
    setCapped(sp.capped);
    if (sp.from !== s.from || sp.to !== s.to) setS({ ...s, from: sp.from, to: sp.to });
  };
  const play = async () => {
    ctl.current?.abort();
    if (playing) return setPlaying(false);
    const c = new AbortController();
    ctl.current = c;
    setPlaying(true);
    const beatS = 60 / (s.bpm * speed);
    const ev = selNotes.map((n) => ({ midi: n.midi, start: 0.05 + n.beat * beatS, duration: Math.max(0.1, n.dur * beatS * 0.95), velocity: 0.7 }));
    try {
      await piano.unlock();
      await piano.play(ev, 0.1 + bars * m * beatS, c.signal);
    } catch {
      /* stopped */
    }
    if (ctl.current === c) setPlaying(false);
  };
  const keyPick = (
    <label className="ch enc-keypick">
      <select value={`${s.key}:${s.minor ? 1 : 0}`} onChange={(e) => {
        const [k, mi] = e.target.value.split(':').map(Number);
        setS({ ...s, key: k, minor: !!mi });
      }} aria-label={he ? 'סולם' : 'Key'} data-ctx-key="1">
        {Array.from({ length: 24 }, (_, i) => ({ k: i % 12, mi: i >= 12 })).map((o) => (
          <option key={`${o.k}:${o.mi}`} value={`${o.k}:${o.mi ? 1 : 0}`}>
            {kName(o.k, o.mi)} {o.mi ? (he ? 'מינור' : 'minor') : he ? 'מז׳ור' : 'major'}
          </option>
        ))}
      </select>
      <Conf d={dotsOf(det.conf)} />
    </label>
  );
  const ghosts = selIdx.filter((i) => s.edits[i] !== 'x' && isGhost(notes[i].vel, notes[i].durMs));
  const hands = splitHands(selNotes, s.split);
  const rollNotes: RollNote[] = notes.map((n, i) => ({ midi: n.midi + (typeof s.edits[i] === 'number' ? (s.edits[i] as number) : 0), beat: n.beat, dur: n.dur, vel: n.vel, mark: s.edits[i] === 'x' ? 'ghost' : isGhost(n.vel, n.durMs) ? 'ghost' : null, hand: hands.split !== null && n.midi < hands.split ? 'L' : 'R' }));
  const chordNames = chords.length ? (() => {
    const out: string[] = [];
    let b = Math.floor(s.from / m + 1e-6) * m;
    for (const c of chords) {
      out[Math.floor(b / m)] = kName(mod(c[0] + s.key)).replace('m', '') + ({ maj7: 'maj7', m7: 'm7', '7': '7', hd7: 'm7♭5', m6: 'm6', '6': '6', '7b9': '7♭9', alt: '7alt', dim7: 'dim7', blues7: '7' } as Record<string, string>)[c[1]];
      b += c[2];
    }
    return out;
  })() : undefined;

  if (step === 'trim') {
    return (
      <main className="panel-screen enc-screen" data-encore="trim" data-sel={`${s.from}-${s.to}`}>
        {head(he ? 'בחירת תיבות' : 'Choose bars', <>{he ? 'ת׳' : 'b.'} <bdi dir="ltr">{Math.floor(s.from / m) + 1}–{Math.ceil(s.to / m)}</bdi></>, () => history.back())}
        <div className="row">
          <Seg value={s.view} label={he ? 'תצוגה' : 'View'} onChange={(v) => setS({ ...s, view: v })} options={[{ k: 'roll', t: he ? 'נוטות' : 'Roll' }, { k: 'score', t: he ? 'תווים' : 'Score' }]} />
          <span className={`enc-pill ${capped ? 'warn' : 'ac'}`} data-bars={bars}>
            <bdi dir="ltr">{bars}</bdi> {he ? 'תיבות מתוך' : 'bars of'} <bdi dir="ltr">{MAX_BARS}</bdi>
          </span>
        </div>
        {cands.length > 1 && (
          <div className="row wrap enc-cands" data-cands={cands.length}>
            {cands.map((c) => (
              <button key={`${c.from}-${c.to}`} className={`ch ${c.from === s.from && c.to === s.to ? 'on' : ''}`} onClick={() => setS({ ...s, from: c.from, to: c.to })} data-cand-chip={`${c.from}-${c.to}`}>
                {he ? 'ת׳' : 'b.'} <bdi dir="ltr">{Math.floor(c.from / m) + 1}–{Math.ceil(c.to / m)}</bdi>
              </button>
            ))}
          </div>
        )}
        <div className="enc-card enc-trim-card">
          {s.view === 'roll' ? (
            <PianoRoll notes={rollNotes} from={vFrom} to={vTo} meter={m} sel={[s.from, s.to]} onHandle={onHandle} ticks={bnd} cands={cands.length > 1 ? cands.filter((c) => c.from !== s.from).map((c) => [c.from, c.to] as [number, number]) : []} chords={chordNames} height={200} label={he ? 'נוטות' : 'piano roll'} />
          ) : preview ? (
            <DrillScore drill={phraseDrill(preview, s.key, twoHands(preview) ? 'RL' : 'R')} ds={drillSettingsOf(settings)} lang={lang} />
          ) : null}
          <small className="tiny enc-center">{he ? 'גררו את הידיות · נצמד לתיבות · החזקה = פעמה' : 'Drag the handles · snaps to bars · hold = beat'}</small>
        </div>
        <div className="row enc-play-row">
          <button className={`icon-btn ${playing ? 'on' : ''}`} onClick={() => void play()} aria-label={he ? 'לנגן' : 'Play'} data-trim-play="1">
            {playing ? '■' : '▶'}
          </button>
          {[0.5, 0.75, 1].map((x) => (
            <button key={x} className={`ch ${speed === x ? 'on' : ''}`} onClick={() => setSpeed(x)} data-speed={x}>
              <bdi dir="ltr">{x * 100}%</bdi>
            </button>
          ))}
        </div>
        <div className="enc-foot">
          <button className="btn primary enc-full" onClick={() => (location.hash = `/encore/context?take=${encodeURIComponent(take.id)}`)} disabled={selNotes.length < 3} data-trim-next="1">
            {selNotes.length < 3 ? (he ? 'קצר מדי למשפט' : 'Too short for a phrase') : he ? 'המשך — ההקשר' : 'Next — the context'}
          </button>
        </div>
      </main>
    );
  }
  // context
  const pickedNote = picked !== null ? notes[picked] : null;
  const fix = (i: number) => {
    const n = notes[i];
    const semi = n.midi + (typeof s.edits[i] === 'number' ? (s.edits[i] as number) : 0) - (60 + s.key - (s.key > 5 ? 12 : 0));
    const rel = n.beat - Math.floor(s.from / m + 1e-6) * m;
    let at: [number, string] | null = null;
    let b = 0;
    for (const c of chords) {
      if (rel < b + c[2]) {
        at = [c[0], c[1]];
        break;
      }
      b += c[2];
    }
    const to = wrongNoteFix(semi, at, s.minor);
    setS({ ...s, edits: { ...s.edits, [i]: (typeof s.edits[i] === 'number' ? (s.edits[i] as number) : 0) + (to - semi) } });
  };
  const save = () => {
    const id = newPhraseId();
    const d = draftFrom(take, s, chords, ctx, id);
    if (d.rh.length + d.lh.length < 3) return;
    onSave(makePhrase(d));
  };
  return (
    <main className="panel-screen enc-screen" data-encore="context">
      {head(he ? 'ההקשר' : 'The context', undefined, () => history.back())}
      <div className="row wrap enc-ctx-chips">
        {keyPick}
        <button className={`ch ${s.chordsOn && chords.length ? 'on' : 'gh'}`} onClick={() => setS({ ...s, chordsOn: !s.chordsOn })} disabled={!chords.length} data-ctx-chords={chords.length && s.chordsOn ? 'on' : 'off'}>
          {chords.length ? <bdi dir="ltr">{(chordNames ?? []).filter(Boolean).join(' | ')}</bdi> : he ? 'ללא אקורדים' : 'No chords'}
        </button>
        <button className="ch" onClick={() => setS({ ...s, meter: s.meter === 4 ? 3 : 4 })} data-ctx-meter={s.meter}>
          <bdi dir="ltr">{s.meter}/4</bdi>
        </button>
        <span className="ch gh">{s.swing > 0.54 ? (he ? `סווינג ${Math.round(s.swing * 100)}%` : `Swing ${Math.round(s.swing * 100)}%`) : he ? 'ישר' : 'Straight'}</span>
      </div>
      <div className="enc-card enc-ctx-roll">
        <PianoRoll notes={rollNotes} from={Math.floor(s.from / m) * m} to={Math.ceil(s.to / m) * m} meter={m} chords={chordNames} height={150} onNote={(i) => setPicked(picked === i ? null : i)} picked={picked} label={he ? 'התווים שנבחרו' : 'the chosen notes'} />
        {pickedNote && picked !== null && (
          <div className="enc-pop row" data-note-pop={picked}>
            <button className="icon-btn" onClick={() => setS({ ...s, edits: { ...s.edits, [picked]: (typeof s.edits[picked] === 'number' ? (s.edits[picked] as number) : 0) + 1 } })} aria-label={he ? 'חצי טון למעלה' : 'Semitone up'}>
              ▲
            </button>
            <button className="icon-btn" onClick={() => setS({ ...s, edits: { ...s.edits, [picked]: (typeof s.edits[picked] === 'number' ? (s.edits[picked] as number) : 0) - 1 } })} aria-label={he ? 'חצי טון למטה' : 'Semitone down'}>
              ▼
            </button>
            <button className="ch" onClick={() => fix(picked)} data-wrong-fix="1">
              {he ? 'תו שגוי ← צליל אקורד' : 'Wrong note → chord tone'}
            </button>
            <button className="icon-btn" onClick={() => (setS({ ...s, edits: { ...s.edits, [picked]: 'x' } }), setPicked(null))} aria-label={he ? 'מחיקה' : 'Delete'}>
              ✕
            </button>
          </div>
        )}
        {ghosts.length > 0 && !pickedNote && (
          <button className="ch gh" onClick={() => setS({ ...s, edits: { ...s.edits, ...Object.fromEntries(ghosts.map((i) => [i, 'x'])) } })} data-ghosts={ghosts.length}>
            <bdi dir="ltr">{ghosts.length}</bdi> {he ? 'תווי רפאים — להסיר?' : 'ghost notes — remove?'}
          </button>
        )}
      </div>
      <div className="enc-card col enc-q">
        <div className="row">
          <b className="t2 grow">{he ? 'קוונטיזציה' : 'Quantise'}</b>
          <small className="tiny">{he ? 'מדויק ← → טבעי' : 'tight ← → natural'}</small>
        </div>
        <Seg<QuantMode> value={s.quant} label={he ? 'קוונטיזציה' : 'Quantise'} onChange={(q) => setS({ ...s, quant: q })} options={[{ k: 'grid', t: he ? 'רשת' : 'Grid' }, { k: 'swing', t: he ? 'סווינג' : 'Swing' }, { k: 'played', t: he ? 'כמו שניגנתי' : 'As played' }]} />
        {hands.lh.length > 0 || s.split === -1 ? (
          <Seg<'auto' | 'one'> value={s.split === -1 ? 'one' : 'auto'} label={he ? 'ידיים' : 'Hands'} onChange={(v) => setS({ ...s, split: v === 'one' ? -1 : null })} options={[{ k: 'auto', t: he ? 'שתי ידיים' : 'Two hands' }, { k: 'one', t: he ? 'יד אחת' : 'One hand' }]} />
        ) : null}
      </div>
      <input className="enc-input" value={s.name} placeholder={T(draft.name, lang)} onChange={(e) => setS({ ...s, name: e.target.value.slice(0, 60) })} aria-label={he ? 'שם המשפט' : 'Phrase name'} data-ctx-name="1" dir="auto" />
      {why && <p className="t3">{he ? 'צריך לפחות שלושה צלילים.' : 'At least three notes are needed.'}</p>}
      <div className="enc-foot">
        <button className="btn primary enc-full" onClick={() => (draft.rh.length + draft.lh.length >= 3 ? save() : setWhy(true))} data-ctx-save="1">
          {he ? 'לשמור ולתכנן' : 'Save and plan'}
        </button>
      </div>
    </main>
  );
}

// ───────────────────────────── Plan (§7, §10.9) ─────────────────────────────

const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

function PlanView({ lang, head, l, items, onSave }: { lang: Lang; head: Head; l: Lick; items: Record<string, ItemState>; onSave: (l: Lick) => void }) {
  const he = lang === 'he';
  const plan = planOf(l);
  const set = (p: Partial<typeof plan>) => onSave({ ...l, plan: { ...plan, ...p } });
  const [why, setWhy] = useState(false);
  const keys = plan.keys === 'all' ? FIFTHS : plan.keys;
  const toggle = (k: number) => {
    const cur = new Set(plan.keys === 'all' ? FIFTHS : plan.keys);
    if (cur.has(k) && cur.size > 1) cur.delete(k);
    else cur.add(k);
    set({ keys: cur.size === 12 ? 'all' : [...cur], order: cur.size === 12 && plan.order === 'custom' ? 'easiest' : plan.order });
  };
  const b = badge(l, INST);
  const prev = xpPreview(l, INST, keyOrder(l, plan, INST));
  const order = keyOrder(l, plan, INST);
  const step = (dir: 1 | -1) => {
    const g = Math.max(plan.startBpm + 4, Math.min(320, plan.goalBpm + dir * ladderStep(plan.goalBpm) * 2));
    set({ goalBpm: roundToLadder(g) });
  };
  const rungs = phraseRungs(plan);
  const first = order[0] ?? l.homeKey ?? 0;
  const R = 70;
  const inRange = INST === 'voice' ? keysInRange(l) : FIFTHS;
  return (
    <main className="panel-screen enc-screen" data-encore="plan" data-phrase={l.id}>
      {head(he ? 'תוכנית אימון' : 'Practice plan', <Bi text={T(l.name, lang)} />, () => nav(`phrase/${l.id}`))}
      <div className="enc-card row enc-target">
        <button className="icon-btn" onClick={() => step(-1)} aria-label={he ? 'פחות' : 'Slower'} disabled={plan.locked?.includes('goalBpm')} data-goal-minus="1">
          −
        </button>
        <div className="grow enc-center">
          <div className="enc-big" data-goal={plan.goalBpm}>
            <Tempo bpm={plan.goalBpm} />
          </div>
          <small className="t3">
            {he ? 'יעד · ניגנת ב־' : 'Target · you played it at '}
            <Tempo bpm={l.playedBpm ?? plan.startBpm} />
          </small>
        </div>
        <button className="icon-btn" onClick={() => step(1)} aria-label={he ? 'יותר' : 'Faster'} disabled={plan.locked?.includes('goalBpm')} data-goal-plus="1">
          +
        </button>
      </div>
      {overCeiling(l, plan.goalBpm) && <small className="t3">{he ? 'מהיר מאוד לכלי — אפשר, אבל בזהירות.' : 'Very fast for the instrument — allowed, but take care.'}</small>}
      <div className="enc-card-soft row enc-ladderline">
        <small className="t3 grow">
          {he ? 'בלי קצב ← רבעים ← ' : 'Free → quarters → '}
          <bdi dir="ltr">
            ♩{rungs[0]} … ♩{rungs[rungs.length - 1]}
          </bdi>
        </small>
        <span className="enc-pill">
          <bdi dir="ltr">{rungs.length + 2}</bdi> {he ? 'שלבים' : 'steps'}
        </span>
      </div>
      {!why && <div className="enc-card col enc-ringcard">
        <svg className="enc-ring" viewBox="0 0 180 180" role="group" aria-label={he ? 'סולמות' : 'Keys'} style={{ direction: 'ltr' }} data-ring-keys={keys.length}>
          {FIFTHS.map((k, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 90 + R * Math.cos(a);
            const y = 90 + R * Math.sin(a);
            const on = keys.includes(k);
            const outOf = INST === 'voice' && !inRange.includes(k);
            return (
              <g key={k} onClick={() => !plan.locked?.includes('keys') && toggle(k)} className={`enc-rk ${on && !outOf ? 'on' : ''} ${k === first ? 'first' : ''} ${outOf ? 'out' : ''}`} data-out={outOf ? 1 : undefined} role="checkbox" aria-checked={on} aria-label={kName(k)} data-ring-key={k}>
                <ellipse cx={x} cy={y} rx={15} ry={11} transform={`rotate(-20 ${x} ${y})`} />
                <text x={x} y={y + 4} textAnchor="middle">
                  {kName(k)}
                </text>
              </g>
            );
          })}
          <text x={90} y={86} textAnchor="middle" className="enc-ring-n">
            {keys.length}
          </text>
          <text x={90} y={104} textAnchor="middle" className="enc-ring-s">
            {keys.length === 12 ? '12/12' : `${keys.length}/12`}
          </text>
        </svg>
        <div className="row wrap enc-center-row">
          {(['easiest', 'fourths', 'chromatic'] as const).map((o) => (
            <button key={o} className={`ch ${plan.order === o ? 'on' : ''}`} onClick={() => set({ order: o })} data-order={o}>
              {o === 'easiest' ? (he ? 'קל קודם' : 'Easiest first') : o === 'fourths' ? (he ? 'מעגל רביעיות' : 'Cycle of 4ths') : he ? 'כרומטי' : 'Chromatic'}
            </button>
          ))}
        </div>
      </div>}
      {(INST === 'guitar' || INST === 'bass') && <NeckLine lang={lang} l={l} order={order} onPosition={(v) => set({ position: v })} />}
      {INST === 'voice' && <RangeLine lang={lang} l={l} />}
      {twoHands(l) && (
        <Seg<'R-then-RL' | 'RL' | 'R' | 'L'> value={plan.hands} label={he ? 'ידיים' : 'Hands'} onChange={(h) => set({ hands: h })} options={[{ k: 'R-then-RL', t: he ? 'יד אחת, ואז יחד' : 'One, then both' }, { k: 'RL', t: he ? 'יחד' : 'Together' }, { k: 'R', t: he ? 'ימין' : 'RH' }, { k: 'L', t: he ? 'שמאל' : 'LH' }]} />
      )}
      <label className="row enc-tog-row">
        <small className="t3 grow">{he ? 'ביעד — עם הלהקה' : 'At the target — with the band'}</small>
        <input type="checkbox" className="enc-tog" checked={plan.band} disabled={!l.chords.length} onChange={(e) => set({ band: e.target.checked })} data-plan-band="1" />
      </label>
      <div className="enc-card col enc-diff">
        <div className="row">
          <DiffBadge grade={b.grade} D={b.D} lang={lang} />
          <small className="t3 grow enc-why1" data-why-line="1">
            <Bi text={whyLine(b.d, lang)} />
          </small>
          <button className="link" onClick={() => setWhy(!why)} data-diff-why="1">
            {he ? 'למה?' : 'Why?'}
          </button>
        </div>
        {why ? (
          <ul className="enc-parts" data-why-parts="1">
            {Object.entries(b.d.parts)
              .filter(([, v]) => v >= 1)
              .sort((a, c) => c[1] - a[1])
              .slice(0, 5)
              .map(([k, v]) => (
                <li key={k}>
                  <span>{PART_NAME[k]?.[lang] ?? k}</span>
                  <b dir="ltr">+{Math.round(v)}</b>
                </li>
              ))}
            <li>
              <span>
                {he ? 'פיזי · ' : 'Physical · '}
                {INST_NAME[INST][lang]}
              </span>
              <b dir="ltr">+{b.d.P}</b>
            </li>
            <li>
              <span>{he ? 'טמפו' : 'Tempo'}</span>
              <b dir="ltr">+{b.d.T}</b>
            </li>
          </ul>
        ) : (
          <small className="t3 enc-xp" data-xp-preview="1">
            {prev.tempi.map((t, i) => (
              <span key={t.bpm}>
                {i ? ' · ' : ''}
                <Tempo bpm={t.bpm} />: <bdi dir="ltr">{t.xp}</bdi>
              </span>
            ))}{' '}
<bdi dir="ltr">XP</bdi> {he ? 'לניסיון נקי' : 'a clean take'} · {he ? 'כל 12' : 'All 12'}: <bdi dir="ltr">+{prev.all12}</bdi>
          </small>
        )}
      </div>
      <div className="enc-foot">
        <button className="btn primary enc-full" onClick={() => nav(`run/${l.id}~${first}~${handsOf(l)[0]}`)} data-plan-start="1">
          {he ? 'להתחיל — ' : 'Start — '}
          <KeyB k={first} minor={!!l.minor} /> {passedKeys(l, items, INST).length || Object.keys(items).some((id) => id.startsWith(`lick:${l.id}:`)) ? '' : he ? 'בלי קצב' : 'free time'}
        </button>
      </div>
    </main>
  );
}
const PART_NAME: Record<string, { en: string; he: string }> = {
  length: { en: 'Effective length', he: 'אורך אפקטיבי' },
  density: { en: 'Density', he: 'צפיפות' },
  syncopation: { en: 'Off the beat', he: 'סינקופות' },
  switches: { en: 'Mixed rhythms', he: 'מקצבים מתחלפים' },
  interval: { en: 'Wide steps', he: 'צעדים רחבים' },
  leaps: { en: 'Leaps', he: 'קפיצות' },
  range: { en: 'Range', he: 'מנעד' },
  chromatic: { en: 'Chromatic notes', he: 'כרומטיות' },
  approaches: { en: 'Approach notes', he: 'צלילי גישה' },
  enclosures: { en: 'Enclosures', he: 'עטיפות' },
  pivots: { en: 'Pivots on chord tones', he: 'פיבוט על צליל אקורד' },
  nct: { en: 'Tensions on the beat', he: 'לא־אקורדי על פעמה' },
  hands: { en: 'Two hands', he: 'שתי ידיים' },
};

// ───────────────────────────── The phrase: map and rank (§8.4) ─────────────────────────────

function PhraseView({ lang, head, l, items, book, onDelete }: { lang: Lang; head: Head; l: Lick; items: Record<string, ItemState>; book: LickBook; onDelete: () => void }) {
  const he = lang === 'he';
  const hs = handsOf(l);
  const [hand, setHand] = useState<Hand>(finalHand(l));
  const [more, setMore] = useState(false);
  const map = phraseMap(l, items, INST, hand);
  const pr = promotion(l, items, book, INST);
  const passed = passedKeys(l, items, INST).length;
  const days = daysPractised(l, items, INST);
  const due = book.review?.[l.id];
  const nk = map.current?.key ?? nextKey(l, items, INST, hand);
  const st = items[phraseDrill(l, nk, hand, { inst: INST }).itemId];
  const nb = st?.goalBpm ?? planOf(l).startBpm;
  const b = badge(l, INST);
  return (
    <main className="panel-screen enc-screen" data-encore="phrase" data-phrase={l.id} data-rank={pr.rank}>
      {head(<Bi text={T(l.name, lang)} />, undefined, () => nav('library'), (
        <button className="icon-btn" onClick={() => setMore(!more)} aria-label={he ? 'עוד' : 'More'} data-phrase-more="1">
          ⋯
        </button>
      ))}
      {more && (
        <div className="enc-card row wrap">
          <button className="btn small ghost" onClick={() => nav(`plan/${l.id}`)} data-phrase-plan="1">
            {he ? 'תוכנית' : 'Plan'}
          </button>
          <button className="btn small ghost" onClick={onDelete} data-phrase-delete="1">
            {he ? 'מחיקה' : 'Delete'}
          </button>
        </div>
      )}
      <div className="enc-card row enc-rank">
        <Dyn rank={pr.rank} size={34} />
        <div className="grow col">
          <b className="t2">
            <bdi dir="ltr">{passed}</bdi> {he ? 'מתוך' : 'of'} <bdi dir="ltr">{keysNeeded(l, INST)}</bdi> {he ? 'סולמות ביעד' : 'keys at the target'}
          </b>
          {pr.to !== null && (
            <>
              <span className="enc-meter" aria-hidden="true">
                <i style={{ width: `${Math.round(pr.value * 100)}%` }} />
              </span>
              <small className="tiny">
                {pr.need > 0 ? (
                  <>
                    {he ? 'עוד' : ''} <bdi dir="ltr">{pr.need}</bdi> {he ? (pr.need === 1 ? 'סולם ל־' : 'סולמות ל־') : pr.need === 1 ? 'more key to ' : 'more keys to '}
                  </>
                ) : he ? 'הקידום הבא: ' : 'Next: '}
                <Dyn rank={pr.to} size={13} /> {pr.to === 5 ? (he ? '— “שלך”' : '— “yours”') : ''}
              </small>
            </>
          )}
          {pr.to === null && <small className="tiny">{RANK_NAME[6][lang]}</small>}
        </div>
        <DiffBadge grade={b.grade} D={b.D} lang={lang} />
      </div>
      {hs.length > 1 && <Seg<Hand> value={hand} label={he ? 'ידיים' : 'Hands'} onChange={setHand} options={hs.map((h) => ({ k: h, t: h === 'R' ? (he ? 'ימין' : 'RH') : h === 'L' ? (he ? 'שמאל' : 'LH') : he ? 'יחד' : 'Both' }))} />}
      <div className="enc-card enc-mapcard">
        <KeyMap keys={map.keys} rows={map.rows} cells={map.cells} lang={lang} minor={!!l.minor} due={due && due.due <= new Date().toISOString().slice(0, 10) ? [nk] : []} />
      </div>
      <div className="enc-legend">
        <span>
          <i className="sw d" />
          {he ? 'נקי' : 'Clean'}
        </span>
        <span>
          <i className="sw p" />
          {he ? 'עבר יעד' : 'Passed'}
        </span>
        <span>
          <i className="sw c" />
          {he ? 'עכשיו' : 'Now'}
        </span>
        <span>
          <i className="sw" />
          {he ? 'עוד לא' : 'Not yet'}
        </span>
      </div>
      <div className="row enc-days" data-days={days}>
        <span className="enc-ticks" dir="ltr" aria-hidden="true">
          {Array.from({ length: Math.min(14, days) }, (_, i) => (
            <i key={i} />
          ))}
        </span>
        <small className="tiny">
          <bdi dir="ltr">{days}</bdi> {he ? 'ימי תרגול' : 'days practised'}
          {bestTempo(l, items, INST) > 0 && (
            <>
              {' · '}
              {he ? 'הכי מהר' : 'best'} <Tempo bpm={bestTempo(l, items, INST)} />
            </>
          )}
          {due && (
            <>
              {' · '}
              {he ? 'חזרה' : 'review'} <bdi dir="ltr">{due.due.slice(5).split('-').reverse().join('.')}</bdi>
            </>
          )}
        </small>
      </div>
      <div className="enc-foot">
        <button className="btn primary enc-full" onClick={() => nav(`run/${l.id}~${nk}~${hand}`)} data-phrase-continue="1">
          {he ? 'להמשיך — ' : 'Continue — '}
          <KeyB k={nk} minor={!!l.minor} /> {he ? 'ב־' : 'at '}
          <Tempo bpm={nb} />
        </button>
      </div>
    </main>
  );
}

// ───────────────────────────── "The phrase is yours" (§8.5) ─────────────────────────────

/** A small staff of the phrase (treble, heads by diatonic step) ending with a final barline and a fermata. */
function FinalStaff({ l, keyPc }: { l: Lick; keyPc: number }) {
  const d = phraseDrill(l, keyPc, 'R');
  const ns = d.notes.filter((n) => n.hand === 'R').slice(0, 32);
  const W = 320;
  const H = 96;
  const top = 34;
  const gap = 7;
  const step = (m: number) => {
    const pc = mod(m);
    const oct = Math.floor(m / 12);
    const dia = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc];
    return oct * 7 + dia;
  };
  const e4 = step(64);
  const y = (m: number) => top + 4 * gap - ((step(m) - e4) * gap) / 2;
  const total = Math.max(1, d.beats);
  const x = (b: number) => 26 + (b / total) * (W - 52);
  return (
    <svg className="enc-final" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="final barline with a fermata" style={{ direction: 'ltr' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={8} x2={W - 12} y1={top + i * gap} y2={top + i * gap} className="ef-line" />
      ))}
      {ns.map((n, i) => {
        const cy = Math.max(6, Math.min(H - 6, y(n.pitch)));
        return <ellipse key={i} cx={x(n.beat)} cy={cy} rx={4.4} ry={3.2} transform={`rotate(-20 ${x(n.beat)} ${cy})`} className="ef-head" />;
      })}
      <line x1={W - 18} x2={W - 18} y1={top} y2={top + 4 * gap} className="ef-line" />
      <rect x={W - 15} y={top} width={3.5} height={4 * gap} className="ef-bold" />
      <path d={`M${W - 26} ${top - 8} a9 9 0 0 1 18 0`} className="ef-fermata" />
      <circle cx={W - 17} cy={top - 10} r={1.8} className="ef-dot" />
    </svg>
  );
}

function YoursView({ lang, l, items, onClose }: { lang: Lang; l: Lick; items: Record<string, ItemState>; onClose: () => void }) {
  const he = lang === 'he';
  const plan = planOf(l);
  const order = keyOrder(l, plan, INST);
  const lastKey = order[order.length - 1] ?? 0;
  const days = daysPractised(l, items, INST);
  const ctl = useRef<AbortController | null>(null);
  const playPhrase = async (key: number, bpm: number, original?: RawNote[]) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    if (original?.length) {
      const t0 = Math.min(...original.map((n) => n.on));
      await piano.play(original.map((n) => ({ midi: n.pitch, start: 0.05 + (n.on - t0) / 1000, duration: Math.max(0.1, ((n.off ?? n.on + 300) - n.on) / 1000), velocity: Math.min(1, n.vel / 110) })), (Math.max(...original.map((n) => n.off ?? n.on)) - t0) / 1000 + 0.4, c.signal).catch(() => {});
      return;
    }
    const d = phraseDrill(l, key, finalHand(l));
    const beatS = 60 / bpm;
    await piano.play(d.notes.map((n) => ({ midi: n.pitch, start: 0.05 + n.beat * beatS, duration: Math.max(0.1, n.dur * beatS * 0.92), velocity: 0.72 })), 0.4 + d.beats * beatS, c.signal).catch(() => {});
  };
  // The coda: the phrase once, in the last key, at the target tempo (the player's own phrase is the celebration sound).
  useEffect(() => {
    void playPhrase(lastKey, plan.goalBpm);
    return () => ctl.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const src = l.source && 'takeId' in l.source ? getEncoreTakeSync(l.source.takeId) : null;
  const first = l.createdAt ? new Date(l.createdAt) : null;
  return (
    <main className="panel-screen enc-screen enc-yours" data-encore="yours" data-phrase={l.id}>
      <div className="enc-center enc-yours-top">
        <h1 className="enc-yours-h">{he ? 'המשפט שלך.' : 'The phrase is yours.'}</h1>
        <small className="t3">
          <Bi text={T(l.name, lang)} />
        </small>
      </div>
      <div className="enc-card">
        <FinalStaff l={l} keyPc={lastKey} />
      </div>
      <div className="row enc-facts">
        <div>
          <b className="enc-big" dir="ltr">
            {keysNeeded(l, INST)}
          </b>
          <small className="tiny">{he ? 'סולמות' : 'keys'}</small>
        </div>
        <div>
          <b className="enc-big">
            <Tempo bpm={plan.goalBpm} />
          </b>
          <small className="tiny">{he ? 'טמפו' : 'tempo'}</small>
        </div>
        <div>
          <b className="enc-big" dir="ltr">
            {days}
          </b>
          <small className="tiny">{he ? 'ימים' : 'days'}</small>
        </div>
      </div>
      <div className="row enc-thenNow">
        <button className="enc-card col grow" onClick={() => void playPhrase(l.homeKey ?? 0, l.playedBpm ?? plan.startBpm, src?.notes)} data-then="1">
          <span className="icon-btn" aria-hidden="true">
            ▶
          </span>
          <b className="t2">{he ? 'הניסיון הראשון' : 'The first take'}</b>
          <small className="tiny">
            <Tempo bpm={l.playedBpm ?? plan.startBpm} />
            {first && (
              <>
                {' · '}
                <bdi dir="ltr">
                  {first.getDate()}.{first.getMonth() + 1}
                </bdi>
              </>
            )}
          </small>
        </button>
        <button className="enc-card col grow" onClick={() => void playPhrase(lastKey, plan.goalBpm)} data-now="1">
          <span className="icon-btn on" aria-hidden="true">
            ▶
          </span>
          <b className="t2">{he ? 'היום' : 'Today'}</b>
          <small className="tiny">
            <Tempo bpm={plan.goalBpm} />
          </small>
        </button>
      </div>
      <div className="row enc-center-row">
        <Toni state="wow" size={48} />
        <Dyn rank={5} size={30} />
      </div>
      <div className="enc-foot">
        <button className="btn primary enc-full" onClick={() => (location.hash = '/improv')} data-yours-useit="1">
          {he ? 'להשתמש בזה באלתור' : 'Use it in an improvisation'}
        </button>
        <button className="btn ghost enc-full" onClick={onClose} data-yours-close="1">
          {he ? 'סגירה' : 'Close'}
        </button>
      </div>
    </main>
  );
}

// ───────────────────────────── The library (§8.6) ─────────────────────────────

function LibraryView({ lang, head, book, custom, items, onMakePhrase }: { lang: Lang; head: Head; book: LickBook; custom: CustomDrill[] | undefined; items: Record<string, ItemState>; onMakePhrase: (c: CustomDrill) => void }) {
  const he = lang === 'he';
  const [tab, setTab] = useState<'phrase' | 'pattern'>('phrase');
  const [sort, setSort] = useState<'due' | 'recent' | 'rank'>('due');
  const all = library(book, custom, items, INST);
  const due = new Set(duePhrases(book, items, 'today', undefined, INST, 50).filter((d) => d.why === 'review').map((d) => d.l.id));
  const list = all
    .filter((x) => x.kind === tab)
    .sort((a, b) => (sort === 'rank' ? b.rank - a.rank : sort === 'due' ? Number(due.has(b.id)) - Number(due.has(a.id)) || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const nPh = all.filter((x) => x.kind === 'phrase').length;
  return (
    <main className="panel-screen enc-screen enc-scroll" data-encore="library">
      {head(he ? 'המשפטים שלי' : 'My phrases', he ? 'הדרן' : 'Encore', () => nav(''), (
        <button className="icon-btn" onClick={() => nav('record')} aria-label={he ? 'הקלטה חדשה' : 'New recording'} data-lib-add="1">
          +
        </button>
      ))}
      <Seg value={tab} label={he ? 'סוג' : 'Kind'} onChange={setTab} options={[{ k: 'phrase', t: <>{he ? 'משפטים' : 'Phrases'} · <bdi dir="ltr">{nPh}</bdi></> }, { k: 'pattern', t: <>{he ? 'תבניות' : 'Patterns'} · <bdi dir="ltr">{all.length - nPh}</bdi></> }]} />
      {tab === 'phrase' && (
        <div className="row enc-sorts">
          {(['due', 'recent', 'rank'] as const).map((k) => (
            <button key={k} className={`ch ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)} data-sort={k}>
              {k === 'due' ? (he ? 'לחזרה קודם' : 'Due first') : k === 'recent' ? (he ? 'אחרונים' : 'Recent') : he ? 'דרגה' : 'Rank'}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 && (
        <p className="t3">
          {tab === 'phrase' ? (he ? 'עוד אין משפטים. שמרו משפט מכל ניסיון, או הקליטו משהו.' : 'No phrases yet. Keep one from any take, or record something.') : he ? 'תבניות מעורך התרגילים יופיעו כאן.' : 'Patterns from the drill editor show here.'}
        </p>
      )}
      <ul className="enc-list">
        {list.map((x) =>
          x.kind === 'phrase' && x.lick ? (
            <li key={x.id}>
              <button className="enc-card enc-libcard" onClick={() => nav(`phrase/${x.id}`)} data-lib-phrase={x.id}>
                <Dyn rank={x.rank} />
                <span className="grow col">
                  <b className="t2">
                    <Bi text={T(x.name, lang)} />
                  </b>
                  <small className="t3">
                    {SRC[x.lick.source?.kind ?? 'lick'][lang]} · <KeyB k={x.lick.homeKey ?? 0} minor={!!x.lick.minor} /> · <bdi dir="ltr">{gradeOf(badge(x.lick, INST).D)}</bdi>
                  </small>
                  <KeyStrip passed={passedKeys(x.lick, items, INST).length} current={x.rank > 0 && x.rank < 5} />
                </span>
                {due.has(x.id) ? <span className="enc-pill">{he ? 'לחזרה' : 'Due'}</span> : x.rank >= 5 ? <span className="enc-pill ac">{he ? 'שלך' : 'Yours'}</span> : x.rank === 0 ? <span className="enc-pill">{he ? 'טיוטה' : 'Sketch'}</span> : null}
              </button>
            </li>
          ) : x.drill ? (
            <li key={x.id}>
              <div className="enc-card enc-libcard" data-lib-pattern={x.id}>
                <Dyn rank={0} />
                <span className="grow col">
                  <b className="t2">
                    <Bi text={T(x.name, lang)} />
                  </b>
                  <small className="t3">{he ? 'תבנית' : 'Pattern'}</small>
                  <span className="row wrap">
                    <button className="btn small ghost" onClick={() => nav(`pattern/${x.id}`)}>
                      {he ? 'עריכה' : 'Edit'}
                    </button>
                    <button className="btn small ghost" onClick={() => onMakePhrase(x.drill!)} data-make-phrase={x.id}>
                      {he ? 'להפוך למשפט' : 'Make it a phrase'}
                    </button>
                  </span>
                </span>
              </div>
            </li>
          ) : null,
        )}
      </ul>
      {tab === 'pattern' && (
        <button className="btn ghost" onClick={() => nav('pattern')} data-enc-pattern="1">
          {he ? 'תבנית חדשה' : 'New pattern'}
        </button>
      )}
    </main>
  );
}
const SRC: Record<string, { en: string; he: string }> = {
  take: { en: 'From a take', he: 'מניסיון' },
  record: { en: 'Free recording', he: 'מהקלטה חופשית' },
  lick: { en: 'Lick library', he: 'מספריית הליקים' },
  piece: { en: 'From a piece', he: 'מיצירה' },
  pattern: { en: 'From a pattern', he: 'מתבנית' },
  teacher: { en: 'From the teacher', he: 'מהמורה' },
  shared: { en: 'Shared', he: 'שיתוף' },
};

// ───────────────────────────── v2: guitar / bass position, voice range (§7.4) ─────────────────────────────

/** Guitar / bass: the position per key in the plan's order ("A♭ · pos. 4") and "same position in every key" / "by key". */
function NeckLine({ lang, l, order, onPosition }: { lang: Lang; l: Lick; order: number[]; onPosition: (v: 'same' | 'per-key') => void }) {
  const he = lang === 'he';
  const inst = INST as 'guitar' | 'bass';
  const mode = planOf(l).position ?? 'same';
  const pos = order.slice(0, 3).map((k) => ({ k, n: phraseNeck(l, k, inst) }));
  // one row (the plan stays one screen): the first keys' positions, and one chip that switches same shape ↔ by key
  return (
    <div className="row enc-neckline" data-neck-mode={mode}>
      <small className="t3 grow enc-poslist" data-neck-pos={pos.map((p) => p.n.pos).join(',')}>
        {pos.map((p, i) => (
          <span key={p.k}>
            {i ? ' · ' : ''}
            <KeyB k={p.k} minor={!!l.minor} /> {p.n.pos ? <>{he ? 'פוז׳' : 'pos.'} <bdi dir="ltr">{p.n.pos}</bdi></> : he ? 'פתוחה' : 'open'}
          </span>
        ))}
      </small>
      <button className="ch" onClick={() => onPosition(mode === 'same' ? 'per-key' : 'same')} aria-pressed={mode === 'same'} data-neck-toggle={mode}>
        {mode === 'same' ? (he ? 'אותה צורה' : 'Same shape') : he ? 'לפי סולם' : 'By key'}
      </button>
    </div>
  );
}

/** Voice: the singer's range and the keys outside it (excluded from "yours", with the reason in one line). */
function RangeLine({ lang, l }: { lang: Lang; l: Lick }) {
  const he = lang === 'he';
  const r = singerRange();
  const ok = keysInRange(l);
  const name = (m: number) => `${['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  return (
    <small className="t3 enc-rangeline" data-range-keys={ok.length}>
      {he ? 'הטווח שלך' : 'Your range'} <bdi dir="ltr">{name(r.low)}–{name(r.high)}</bdi>
      {r.estimated ? (he ? ' (משוער)' : ' (estimated)') : ''} ·{' '}
      {ok.length === 12
        ? he
          ? 'כל 12 הסולמות בטווח'
          : 'all 12 keys in range'
        : ok.length
          ? he
            ? `${12 - ok.length} סולמות מחוץ לטווח — לא נדרשים ל״שלך״`
            : `${12 - ok.length} keys out of range — not needed for “yours”`
          : he
            ? 'המשפט רחב מהטווח שלך'
            : 'the phrase is wider than your range'}
    </small>
  );
}
