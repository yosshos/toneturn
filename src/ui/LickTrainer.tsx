// Lick & vocabulary trainer (docs/SPEC-LICKS-TRANSCRIPTION.md): the library by chord context, a lick's 12-key ×
// tempo grid and stars, the measured run (the drills engine: MIDI or microphone, the tempo ladder), the spaced review
// and the "Use it" challenge over a band. Per course it plays on the course's instrument (the voice sings it).

import { useEffect, useMemo, useRef, useState } from 'react';
import '../licks.css';
import { bassTuningOf, type Settings } from '../storage/progress';
import type { Drill, DrillCalibration, ItemState, PlayedNote, TakeMetrics } from '../engine/drills/types';
import type { RatingEvent } from '../engine/rating';
import { applyTake, newItem, type LadderResult } from '../engine/drills/ladder';
import { keyName } from '../engine/drills/generate';
import { inputLatency } from '../engine/latency';
import { midi } from '../speech/midi';
import { piano } from './services';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { DrillTake, MarkLegend, TakeResult } from './DrillTake';
import { DEFAULT_CAL, DrillScore, drillSettingsOf } from './Drills';
import { Glyph } from './Glyph';
import { chartBacking, parseChart } from '../engine/charts';
import {
  bookAfterTake, CONTEXTS, contextOf, dueLicks, LICK_KEYS, LICK_KNOWN_STARS, lickById, lickDrill, lickEvents, lickGrid, LICKS, lickStars, lickTempos, lickTarget, lickXp, nextLickKey, reviewKey,
  type Lick, type LickBook, type LickContext, type LickInstrument,
} from '../engine/licks';
import { findLick, useItChart, useItPassed, type ImpNote } from '../engine/lickDetect';

type Lang = 'he' | 'en';
export type TakeFn = (state: ItemState, evs: RatingEvent[], xp: number, m?: { verdict: string; hands: string; cv: number | null }) => void;

const TX = {
  en: {
    title: 'Licks', all: 'All', review: 'Review', mine: 'My licks', none: 'Nothing due — your licks are fresh.', noneMine: 'Licks you know (3 stars) and your own transcribed phrases land here.',
    practise: 'Practise', useIt: 'Use it', add: 'Add to my licks', remove: 'Remove from my licks', locked: 'Use it opens at 3 stars (three keys at the target tempo).',
    keys: 'Keys', tempo: 'Tempo', lv: 'Level', due: 'due', start: 'Start', stop: 'Stop', listen: 'Hear it',
    useHow: (n: string) => `Improvise over the band. Use "${n}" at least twice — in any key the band is in, over the right chords.`,
    found: 'Found', exact: 'the lick', shape: 'its shape', wrongChord: 'over another chord', passed: 'Used it — it is yours.', notYet: 'Not twice over the right chords yet.',
    reviewDone: 'Review done', reviewNext: 'Next', keysOnScreen: 'No MIDI keyboard: play here', of: 'of', voice: 'Sing it: pitch and time are measured.',
    insts: { piano: 'Piano', guitar: 'Guitar', bass: 'Bass', voice: 'Voice' } as Record<LickInstrument, string>,
  },
  he: {
    title: 'ליקים', all: 'הכול', review: 'חזרה', mine: 'הליקים שלי', none: 'אין מה לחזור היום — הליקים שלך טריים.', noneMine: 'ליקים שאתם יודעים (3 כוכבים) ומשפטים שתמללתם בעצמכם מגיעים לכאן.',
    practise: 'לתרגל', useIt: 'להשתמש', add: 'להוסיף לליקים שלי', remove: 'להסיר מהליקים שלי', locked: '"להשתמש" נפתח ב-3 כוכבים (שלושה סולמות בטמפו היעד).',
    keys: 'סולמות', tempo: 'טמפו', lv: 'שלב', due: 'לחזרה', start: 'להתחיל', stop: 'עצירה', listen: 'להקשיב',
    useHow: (n: string) => `אלתרו מעל הלהקה. השתמשו ב"${n}" לפחות פעמיים — בסולם שבו הלהקה נמצאת, מעל האקורדים הנכונים.`,
    found: 'נמצא', exact: 'הליק', shape: 'הצורה שלו', wrongChord: 'מעל אקורד אחר', passed: 'השתמשתם בו — הוא שלכם.', notYet: 'עוד לא פעמיים מעל האקורדים הנכונים.',
    reviewDone: 'החזרה הושלמה', reviewNext: 'הבא', keysOnScreen: 'אין מקלדת MIDI: נגנו כאן', of: 'מתוך', voice: 'שירו אותו: הגובה והזמן נמדדים.',
    insts: { piano: 'פסנתר', guitar: 'גיטרה', bass: 'בס', voice: 'קול' } as Record<LickInstrument, string>,
  },
};

/** The course's instrument (keys → piano, guitar, bass, voice); Jazz and Ear use the player's own instrument. */
export function lickInstrumentOf(s: Pick<Settings, 'activeCourse' | 'instrument'>): LickInstrument {
  const c = s.activeCourse;
  if (c === 'keys') return 'piano';
  if (c === 'guitar' || c === 'bass' || c === 'voice') return c;
  return s.instrument === 'guitar' ? 'guitar' : s.instrument === 'bass' ? 'bass' : s.instrument === 'voice' ? 'voice' : 'piano';
}
export const calOf = (s: Settings): DrillCalibration => ({ ...DEFAULT_CAL, ...(s.drillCal ?? {}), latencyMs: inputLatency(s, midi.devices.length ? 'midi' : 'mic') });

export function Stars({ n, of = 5 }: { n: number; of?: number }) {
  return (
    <span className="lk-stars" aria-label={`${n}/${of}`} data-stars={n}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

/** The 12 keys × 4 tempos grid: a column per key (circle of fourths), the reached rungs filled. */
export function LickGrid({ l, inst, items, lang }: { l: Lick; inst: LickInstrument; items: Record<string, ItemState>; lang: Lang }) {
  const g = lickGrid(l, inst, items);
  const t = lickTempos(l);
  return (
    <div className="lk-grid" dir="ltr" data-lick-grid={g.filter((c) => c.passed).length}>
      <div className="lk-grid-rows">
        {[3, 2, 1, 0].map((r) => (
          <small key={r} className="lk-grid-t">
            {t[r]}
          </small>
        ))}
      </div>
      {g.map((c) => (
        <div key={c.key} className={`lk-col ${c.passed ? 'passed' : ''}`} title={keyName(c.key)}>
          {[4, 3, 2, 1].map((r) => (
            <span key={r} className={`lk-cell ${c.rung >= r ? 'on' : ''}`} />
          ))}
          <small>{keyName(c.key)}</small>
        </div>
      ))}
      <span className="sr-only">{lang === 'he' ? 'סולמות וטמפו' : 'Keys and tempos'}</span>
    </div>
  );
}

/**
 * A measured run of lick drills (also the transcription coach's "12 keys"): the drill's notes and chart, the take, the
 * result with ✓ / ✗ marks, and the tempo ladder climbing toward the lick's target. Review mode = one take per drill.
 */
export function LickRun({ lang, settings, l, inst, queue, items, onTake, onEnd, review, sub = 'vocab' }: { lang: Lang; settings: Settings; l: (d: Drill) => Lick; inst: LickInstrument; queue: Drill[]; items: Record<string, ItemState>; onTake: TakeFn; onEnd: (takes: number, clean: number, reviews: { lick: string; pass: boolean }[]) => void; review?: boolean; sub?: 'vocab' | 'transcribe' }) {
  const ds = drillSettingsOf(settings);
  const cal = calOf(settings);
  const [i, setI] = useState(0);
  const drill = queue[i];
  const local = useRef<Record<string, ItemState>>({});
  const stateOf = (d: Drill) => local.current[d.itemId] ?? items[d.itemId] ?? newItem(d);
  const [bpm, setBpm] = useState(() => (drill ? stateOf(drill).goalBpm : 80));
  const [res, setRes] = useState<{ m: TakeMetrics; lad: LadderResult } | null>(null);
  const [take, setTake] = useState(0);
  const [beat, setBeat] = useState(-1);
  const count = useRef({ takes: 0, clean: 0 });
  const reviews = useRef<{ lick: string; pass: boolean }[]>([]);
  const session = useRef(Date.now().toString(36));
  if (!drill) return null;
  const lick = l(drill);
  const go = (j: number) => {
    setRes(null);
    if (j >= queue.length) return onEnd(count.current.takes, count.current.clean, reviews.current);
    setI(j);
    setBpm(stateOf(queue[j]).goalBpm);
    setTake((t) => t + 1);
  };
  const done = (m: TakeMetrics, _p: PlayedNote[]) => {
    const st0 = stateOf(drill);
    const lad = applyTake(st0, m, bpm, new Date().toISOString(), ds, { targetBpm: lickTarget(lick), slower: bpm < (st0.goalBpm ?? 0) * 0.99 });
    local.current[drill.itemId] = lad.state;
    const n = count.current.takes++;
    if (m.verdict === 'clean') count.current.clean++;
    if (review) reviews.current.push({ lick: lick.id, pass: m.verdict === 'clean' });
    onTake(lad.state, lickEvents(lick, inst, m, bpm, new Date().toISOString(), session.current, n, sub), lickXp(m), { verdict: m.verdict, hands: 'R', cv: null });
    setRes({ m, lad });
    setBpm(lad.next.bpm);
  };
  return (
    <div className="drill-run lk-run" data-drill={drill.itemId} data-lick-run={review ? 'review' : 'practice'}>
      <p className="drill-goal">
        {i + 1} / {queue.length} · <span dir="ltr">♩ {bpm}</span>
        {inst === 'voice' && <small className="lk-voice-hint"> · {TX[lang].voice}</small>}
      </p>
      <DrillScore drill={drill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} />
      {res && <MarkLegend lang={lang} />}
      {!res && <DrillTake key={`${drill.itemId}:${take}`} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), done(m, p))} onBeat={setBeat} drumsOk={settings.headphones} />}
      {res && (
        <>
          {!review && <p className="drill-ladder">{res.lad.message[lang]}</p>}
          <TakeResult m={res.m} lang={lang} onAgain={() => (setRes(null), setTake((t) => t + 1))} onSlower={() => (setRes(null), setBpm((b) => Math.max(40, Math.round(b * 0.9))), setTake((t) => t + 1))} onNext={() => go(i + 1)} />
        </>
      )}
    </div>
  );
}

/** Two octaves of keys for the "Use it" challenge without a MIDI keyboard. */
function KeyStrip({ onKey }: { onKey: (m: number) => void }) {
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  return (
    <div className="is-keys" dir="ltr">
      {keys.map((m) => (
        <button key={m} className={`is-key ${black(m) ? 'b' : 'w'}`} onPointerDown={() => onKey(m)} aria-label={String(m)} />
      ))}
    </div>
  );
}

/**
 * Use it: the band plays the lick's changes through four keys; the player improvises and the detector looks for the
 * lick (or its rhythm and contour) over the right chords. MIDI or the on-screen keys on piano; the microphone on the
 * other instruments and the voice.
 */
export function UseIt({ lang, settings, lick, inst, onResult }: { lang: Lang; settings: Settings; lick: Lick; inst: LickInstrument; onResult: (ok: boolean, good: number) => void }) {
  const tx = TX[lang];
  const key = useMemo(() => LICK_KEYS[Math.floor(Math.random() * 4)], []);
  const chart = useMemo(() => useItChart(lick, key), [lick, key]);
  const bpm = Math.max(72, Math.min(132, Math.round(lickTempos(lick)[1])));
  const [running, setRunning] = useState(false);
  const [beatNow, setBeatNow] = useState(-1);
  const [res, setRes] = useState<ReturnType<typeof findLick> | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  const notes = useRef<ImpNote[]>([]);
  const beatS = 60 / bpm;
  const latency = inputLatency(settings, midi.devices.length ? 'midi' : 'mic') / 1000;
  const onNote = (m: number, at = performance.now()) => {
    if (!t0.current) return;
    notes.current.push({ midi: m, beat: ((at - t0.current) / 1000 - latency) / beatS });
  };
  useEffect(() => midi.onNote((m, on, at) => on && onNote(m, at)));
  useEffect(() => () => ctl.current?.abort(), []);
  const start = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setRes(null);
    setRunning(true);
    await piano.unlock();
    const b = chartBacking(parseChart(chart.text), 'swing', bpm, 1);
    notes.current = [];
    t0.current = performance.now() + 60 + b.startBeat * beatS * 1000;
    // The microphone for the instruments without MIDI: a stable new pitch is a new note.
    if (!midi.devices.length && inst !== 'piano') {
      let cand: number | null = null;
      let since = 0;
      let last: number | null = null;
      void listenLoop(new BrowserPitchCapture(), c.signal, (f) => {
        const now = performance.now();
        if (!f.hz || f.confidence < 0.85) {
          cand = null;
          last = null;
          return;
        }
        const m = Math.round(69 + 12 * Math.log2(f.hz / 440));
        if (m !== cand) {
          cand = m;
          since = now;
          return;
        }
        if (now - since > 60 && m !== last) {
          last = m;
          onNote(m, since);
        }
      }, undefined, inst === 'bass' ? { minHz: 28, fftSize: 4096 } : {});
    }
    const tick = window.setInterval(() => setBeatNow(Math.floor((performance.now() - t0.current) / 1000 / beatS)), 120);
    await piano.play(b.events, b.length, c.signal).catch(() => {});
    window.clearInterval(tick);
    setBeatNow(-1);
    const aborted = c.signal.aborted;
    c.abort();
    setRunning(false);
    if (aborted) return;
    const hits = findLick(lick, notes.current.filter((n) => n.beat > -0.5 && n.beat < chart.beats + 1), chart.spans);
    setRes(hits);
    const u = useItPassed(hits);
    onResult(u.ok, u.good);
  };
  const bars = chart.text.split('|').map((x) => x.trim());
  const barNow = beatNow >= 0 ? Math.floor(beatNow / 4) : -1;
  const u = res ? useItPassed(res) : null;
  return (
    <section className="lk-useit" data-useit={u ? (u.ok ? 'pass' : 'fail') : 'ready'}>
      <p className="field-hint">{tx.useHow(lick.name[lang])}</p>
      <ol className="lk-chart" dir="ltr">
        {bars.map((b, i) => (
          <li key={i} className={i === barNow ? 'now' : ''}>
            {b}
          </li>
        ))}
      </ol>
      {running ? (
        <button className="btn primary" onClick={() => ctl.current?.abort()}>
          {tx.stop}
        </button>
      ) : (
        <button className="btn primary" onClick={() => void start()} data-useit-start="1">
          {tx.start} · <span dir="ltr">♩ {bpm}</span>
        </button>
      )}
      {inst === 'piano' && midi.devices.length === 0 && (
        <>
          <small className="field-hint">{tx.keysOnScreen}</small>
          <KeyStrip
            onKey={(m) => {
              onNote(m);
              void piano.play([{ midi: m, start: 0, duration: 0.3, velocity: 0.7 }], 0.35, new AbortController().signal).catch(() => {});
            }}
          />
        </>
      )}
      {res && u && (
        <div className={`lk-useit-res ${u.ok ? 'ok' : 'no'}`} data-useit-found={u.good}>
          <p>
            <b>{u.ok ? tx.passed : tx.notYet}</b>
          </p>
          <ul>
            {res.slice(0, 4).map((h, i) => (
              <li key={i} dir="auto">
                {tx.found}: {h.kind === 'exact' ? tx.exact : tx.shape} · {keyName(h.transpose)} · {lang === 'he' ? 'תיבה' : 'bar'} {Math.floor(h.beat / 4) + 1}
                {!h.overChord && <small> · {tx.wrongChord}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

type View = { k: 'lib' } | { k: 'lick'; id: string } | { k: 'run'; id: string; queue: Drill[]; review?: boolean } | { k: 'useit'; id: string } | { k: 'reviewRun'; queue: Drill[]; ids: string[] };

export interface LickTrainerProps {
  lang: Lang;
  settings: Settings;
  items: Record<string, ItemState>;
  onSettings: (p: Partial<Settings>) => void;
  onTake: TakeFn;
  /** A "Use it" result (rated improvisation event + XP). */
  onUsed: (evs: RatingEvent[], xp: number) => void;
  onBack: () => void;
  /** Open on the review (the workout's lick block). */
  startReview?: boolean;
  /** A path step: open on this level's licks; onPathDone gets the stars when the player leaves. */
  pathLevel?: number;
  onPathDone?: (stars: number) => void;
}

export function LickTrainerScreen({ lang, settings, items, onSettings, onTake, onUsed, onBack, startReview, pathLevel, onPathDone }: LickTrainerProps) {
  const tx = TX[lang];
  const inst = lickInstrumentOf(settings);
  const book: LickBook = settings.lickBook ?? {};
  const own = book.own ?? [];
  const all = [...LICKS, ...own];
  const due = dueLicks(book.review).filter((id) => lickById(id, own));
  const [tab, setTab] = useState<LickContext | 'all' | 'review' | 'mine'>(startReview && due.length ? 'review' : 'all');
  const [view, setView] = useState<View>({ k: 'lib' });
  const [live, setLive] = useState<Record<string, ItemState>>({});
  const itemsNow = { ...items, ...live };
  const opts = { range: settings.voiceRange ?? null, tuning: inst === 'bass' ? bassTuningOf(settings) : undefined, band: true };
  const lickOf = (d: Drill) => lickById(d.spec.kind.slice(5), own) ?? all[0];
  const take: TakeFn = (st, evs, xp, m) => {
    setLive((x) => ({ ...x, [st.itemId]: st }));
    onTake(st, evs, xp, m);
  };
  const finishLick = (id: string, reviewsIn: { lick: string; pass: boolean }[]) => {
    const l = lickById(id, own);
    let b = settings.lickBook ?? {};
    for (const r of reviewsIn) b = bookAfterTake(b, r.lick, true, { pass: r.pass });
    if (l && lickStars(l, inst, itemsNow) >= LICK_KNOWN_STARS) b = bookAfterTake(b, l.id, true, null);
    onSettings({ lickBook: b });
  };
  const leave = () => {
    if (onPathDone && pathLevel) {
      const lv = all.filter((l) => l.level === pathLevel);
      return onPathDone(Math.min(3, Math.max(0, ...lv.map((l) => lickStars(l, inst, itemsNow)))));
    }
    onBack();
  };
  const head = (title: string, back: () => void) => (
    <header className="screen-head">
      <button className="icon-btn" onClick={back} aria-label="Back">
        <span className="flip-rtl">‹</span>
      </button>
      <h1>{title}</h1>
    </header>
  );
  const runFor = (l: Lick) => {
    const first = nextLickKey(l, inst, itemsNow);
    const order = [...LICK_KEYS.slice(LICK_KEYS.indexOf(first)), ...LICK_KEYS.slice(0, LICK_KEYS.indexOf(first))].filter((k) => !lickGrid(l, inst, itemsNow).find((c) => c.key === k)?.passed);
    return (order.length ? order : LICK_KEYS).map((k) => lickDrill(l, k, inst, opts));
  };

  if (view.k === 'run' || view.k === 'reviewRun')
    return (
      <main className="drills-screen lk-screen" data-licks="run">
        {head(view.k === 'run' ? (lickById(view.id, own)?.name[lang] ?? tx.title) : tx.review, () => setView(view.k === 'run' ? { k: 'lick', id: view.id } : { k: 'lib' }))}
        <LickRun
          lang={lang}
          settings={settings}
          l={lickOf}
          inst={inst}
          queue={view.queue}
          items={itemsNow}
          onTake={take}
          review={view.k === 'reviewRun' || view.review}
          onEnd={(_t, _c, reviews) => {
            if (view.k === 'run') {
              finishLick(view.id, reviews);
              setView({ k: 'lick', id: view.id });
            } else {
              finishLick(view.ids[0], reviews);
              setView({ k: 'lib' });
            }
          }}
        />
      </main>
    );
  if (view.k === 'useit') {
    const l = lickById(view.id, own)!;
    return (
      <main className="panel-screen lk-screen" data-licks="useit">
        {head(`${tx.useIt} · ${l.name[lang]}`, () => setView({ k: 'lick', id: l.id }))}
        <UseIt
          lang={lang}
          settings={settings}
          lick={l}
          inst={inst}
          onResult={(ok, good) => {
            const at = new Date().toISOString();
            onUsed([{ id: `g:useit:${l.id}:${Date.now().toString(36)}`, skill: 'improv', difficulty: Math.round(1000 + l.level * 120), correct: ok, score: Math.min(1, good / 2), tags: [{ skill: 'improv', sub: 'improv/vocab', w: 0.6 }, { skill: 'improv', sub: 'improv/play', w: 0.4 }], at }], ok ? 8 : good ? 3 : 1);
            if (ok) onSettings({ lickBook: { ...(settings.lickBook ?? {}), used: { ...(settings.lickBook?.used ?? {}), [l.id]: Math.max(good, settings.lickBook?.used?.[l.id] ?? 0) } } });
          }}
        />
      </main>
    );
  }
  if (view.k === 'lick') {
    const l = lickById(view.id, own)!;
    const stars = lickStars(l, inst, itemsNow);
    const mine = (book.mine ?? []).includes(l.id);
    const key = nextLickKey(l, inst, itemsNow);
    const preview = lickDrill(l, key, inst, opts);
    return (
      <main className="panel-screen lk-screen" data-licks="lick" data-lick={l.id}>
        {head(l.name[lang], () => setView({ k: 'lib' }))}
        <p className="lk-meta">
          <span>{contextOf(l.ctx).name[lang]}</span> · <span>{tx.lv} {l.level}</span> · <Stars n={stars} />
          {book.used?.[l.id] ? <b className="lk-used"> · {tx.useIt} ✓</b> : null}
        </p>
        <DrillScore drill={preview} ds={drillSettingsOf(settings)} lang={lang} />
        <LickGrid l={l} inst={inst} items={itemsNow} lang={lang} />
        <div className="drill-actions lk-actions">
          <button className="btn primary" onClick={() => setView({ k: 'run', id: l.id, queue: runFor(l) })} data-lick-practise="1">
            {tx.practise} · {keyName(key)}
          </button>
          <button className="btn" disabled={stars < LICK_KNOWN_STARS} onClick={() => setView({ k: 'useit', id: l.id })} data-lick-useit="1" title={stars < LICK_KNOWN_STARS ? tx.locked : undefined}>
            {tx.useIt}
          </button>
          <button className="btn ghost" onClick={() => onSettings({ lickBook: { ...book, mine: mine ? (book.mine ?? []).filter((x) => x !== l.id) : [...(book.mine ?? []), l.id] } })} data-lick-mine={mine ? 'on' : 'off'}>
            {mine ? tx.remove : tx.add}
          </button>
        </div>
        {stars < LICK_KNOWN_STARS && <small className="field-hint">{tx.locked}</small>}
      </main>
    );
  }
  // The library.
  const list = tab === 'review' ? due.map((id) => lickById(id, own)!) : tab === 'mine' ? all.filter((l) => (book.mine ?? []).includes(l.id)) : tab === 'all' ? all.filter((l) => !l.own) : all.filter((l) => l.ctx === tab && !l.own);
  const shown = pathLevel && tab === 'all' ? [...list.filter((l) => l.level === pathLevel), ...list.filter((l) => l.level !== pathLevel)] : list;
  const startReviewRun = () => {
    const day = new Date().toISOString().slice(0, 10);
    const q = due.map((id) => {
      const l = lickById(id, own)!;
      return lickDrill(l, reviewKey(l, day), inst, opts);
    });
    if (q.length) setView({ k: 'reviewRun', queue: q, ids: due });
  };
  return (
    <main className="panel-screen lk-screen" data-licks="lib">
      {head(tx.title, leave)}
      <p className="lk-inst">
        <Glyph kind="lick" color="#A78BFA" size={34} /> {tx.insts[inst]}
      </p>
      <div className="chips lk-tabs" role="tablist">
        {(['all', 'review', 'mine'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)} data-lick-tab={k}>
            {tx[k]}
            {k === 'review' && due.length ? ` · ${due.length}` : ''}
          </button>
        ))}
        {CONTEXTS.map((c) => (
          <button key={c.id} role="tab" aria-selected={tab === c.id} className={`chip ${tab === c.id ? 'on' : ''}`} onClick={() => setTab(c.id)} data-lick-tab={c.id}>
            {c.short[lang]}
          </button>
        ))}
      </div>
      {tab === 'review' && due.length > 0 && (
        <button className="btn primary" onClick={startReviewRun} data-lick-review="1">
          {tx.review} · {due.length}
        </button>
      )}
      {!shown.length && <p className="field-hint">{tab === 'review' ? tx.none : tx.noneMine}</p>}
      <ul className="lk-list">
        {shown.map((l) => {
          const s = lickStars(l, inst, itemsNow);
          const g = lickGrid(l, inst, itemsNow);
          return (
            <li key={l.id}>
              <button className="lk-card" onClick={() => setView({ k: 'lick', id: l.id })} data-lick-card={l.id}>
                <span className="lk-card-top">
                  <b>{l.name[lang]}</b>
                  <Stars n={s} />
                </span>
                <span className="lk-card-sub">
                  <small>
                    {l.own ? tx.mine : contextOf(l.ctx).short[lang]} · {tx.lv} {l.level}
                  </small>
                  <span className="lk-heat" dir="ltr" aria-hidden="true">
                    {g.map((c) => (
                      <i key={c.key} className={`r${c.rung}${c.passed ? ' p' : ''}`} />
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
