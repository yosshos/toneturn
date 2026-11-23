// Licks › "Ear challenges" (docs/SPEC-EAR-AND-READING.md §3.1–§3.2; BUILD-PLAN-2026-11 phase 8): the combined
// sentence, reverse recognition ("find the lick") and transpose by ear, all from the player's own learned licks
// (earVocab.ts). The sentence and the transposition run in the lick runner (count-in, click, the now-cue of the take);
// "find the lick" has its own count-in, a click on every beat and a moving now-cue, and a big "There" button (exercise
// buttons may be big; the chrome stays small). One phone screen each.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Drill, ItemState } from '../engine/drills/types';
import type { NoteEvent } from '../engine/lesson';
import type { RatingEvent } from '../engine/rating';
import { lickDrill, lickSound, type Lick, type LickInstrument } from '../engine/licks';
import { channelProfile } from '../engine/drills/channel';
import { combinedSentence, findEvents, gradeFind, learnedChannel, learnedLicks, passage, pickPair, sentenceChannel, sentenceDebrief, transposePlan, type FindResult, type Joined } from '../engine/earVocab';
import { piano } from './services';
import { Icon } from './icons';
import { BeatDots } from './NewGameBits';
import { kName } from './encore/bits';

type Lang = 'he' | 'en';
type Tab = 'sentence' | 'find' | 'transpose';

/** What the screen asks the lick runner to run. */
export type EarRun =
  | { kind: 'sentence'; drill: Drill; lick: Lick; byEar: boolean; parts: Joined['parts'] }
  | { kind: 'transpose'; drill: Drill; lick: Lick; hear: Drill; from: number; to: number };

/** The segmented control's short labels (the full name is the button's accessible name). */
const SEG: Record<Lang, Record<Tab, string>> = {
  en: { sentence: 'Sentence', find: 'Find it', transpose: 'Transpose' },
  he: { sentence: 'משפט', find: 'זיהוי', transpose: 'העברה' },
};
const TX = {
  en: {
    sentence: 'Combined sentence', find: 'Find the lick', transpose: 'Transpose by ear',
    sentenceHow: 'Two licks you learned, joined into a new sentence with one link note. Play it back.',
    findHow: 'Hear a longer passage and tap “There” when the lick sounds. No playing.',
    transposeHow: 'Hear a lick in a key you closed it in, then play it in a new key — no notes on screen.',
    needTwo: 'Close two licks in at least one key and the combined sentence opens.',
    needOne: 'Close a lick in at least one key and this opens.',
    byEarNow: 'You learned them from the page: this time by ear.',
    pageNow: 'You learned them by ear: this time from the page.',
    mixedEar: 'This time by ear.', mixedPage: 'This time from the page.',
    another: 'Another pair', start: 'Start', inKey: 'in', there: 'There', listenA: 'Hear the lick', again: 'Again', next: 'Another lick',
    found: 'Found it', missed: 'Not found', wrongTaps: 'taps elsewhere', heardIn: 'Heard in', playIn: 'play it in', findWhich: 'Find:',
    known: 'recognised', isNew: 'new', part: 'Part',
  },
  he: {
    sentence: 'המשפט המשולב', find: 'מצאו את הליק', transpose: 'העברת סולם בשמיעה',
    sentenceHow: 'שני ליקים שלמדתם, מחוברים למשפט חדש בצליל חיבור אחד. נגנו אותו בחזרה.',
    findHow: 'שמעו קטע ארוך יותר והקישו "כאן" כשהליק נשמע. בלי לנגן.',
    transposeHow: 'שמעו ליק בסולם שבו סגרתם אותו, ונגנו אותו בסולם חדש — בלי תווים על המסך.',
    needTwo: 'סגרו שני ליקים בסולם אחד לפחות, והמשפט המשולב ייפתח.',
    needOne: 'סגרו ליק בסולם אחד לפחות, וזה ייפתח.',
    byEarNow: 'למדתם אותם מהדף: הפעם בשמיעה.',
    pageNow: 'למדתם אותם בשמיעה: הפעם מהדף.',
    mixedEar: 'הפעם בשמיעה.', mixedPage: 'הפעם מהדף.',
    another: 'זוג אחר', start: 'להתחיל', inKey: 'ב־', there: 'כאן', listenA: 'לשמוע את הליק', again: 'שוב', next: 'ליק אחר',
    found: 'מצאתם', missed: 'לא נמצא', wrongTaps: 'הקשות במקום אחר', heardIn: 'נשמע ב־', playIn: 'נגנו ב־', findWhich: 'מצאו:',
    known: 'זוהה', isNew: 'חדש', part: 'חלק',
  },
};

export function EarVocab({ lang, items, licks, library, inst, dayKey, opts, onRun, onFound }: { lang: Lang; items: Record<string, ItemState>; /** The player's licks (library, lines, own). */ licks: Lick[]; /** The library (the other licks in "find the lick"). */ library: Lick[]; inst: LickInstrument; dayKey: number; opts: Parameters<typeof lickDrill>[3]; onRun: (r: EarRun) => void; /** A recognition take: rated events and XP. */ onFound: (evs: RatingEvent[], xp: number) => void }) {
  const tx = TX[lang];
  const [tab, setTab] = useState<Tab>('sentence');
  const learned = useMemo(() => learnedLicks(licks, items), [licks, items]);
  const [seed, setSeed] = useState(() => Math.floor(Date.parse(new Date().toISOString().slice(0, 10)) / 86400000));
  return (
    <section className="ev" data-ear-vocab={tab}>
      <div className="seg ev-seg" role="tablist" aria-label={tx.sentence}>
        {(['sentence', 'find', 'transpose'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} data-ev-tab={t} aria-label={tx[t]} title={tx[t]}>
            {SEG[lang][t]}
          </button>
        ))}
      </div>
      {tab === 'sentence' && <SentencePanel lang={lang} learned={learned} items={items} inst={inst} dayKey={dayKey} opts={opts} seed={seed} onSeed={() => setSeed((s) => s + 1)} onRun={onRun} />}
      {tab === 'find' && <FindPanel lang={lang} learned={learned} library={library} inst={inst} dayKey={dayKey} opts={opts} seed={seed} onSeed={() => setSeed((s) => s + 1)} onFound={onFound} />}
      {tab === 'transpose' && <TransposePanel lang={lang} learned={learned} items={items} inst={inst} opts={opts} seed={seed} onSeed={() => setSeed((s) => s + 1)} onRun={onRun} />}
    </section>
  );
}

function SentencePanel({ lang, learned, items, inst, dayKey, opts, seed, onSeed, onRun }: { lang: Lang; learned: Lick[]; items: Record<string, ItemState>; inst: LickInstrument; dayKey: number; opts: Parameters<typeof lickDrill>[3]; seed: number; onSeed: () => void; onRun: (r: EarRun) => void }) {
  const tx = TX[lang];
  const pair = pickPair(learned, seed);
  if (!pair) return <p className="field-hint" data-ev-locked="sentence">{tx.needTwo}</p>;
  const [a, b] = pair;
  const ca = learnedChannel(items, a), cb = learnedChannel(items, b);
  const prof = channelProfile(items);
  const weak = prof.ear !== null && prof.reading !== null ? (prof.ear < prof.reading ? 'ear' : 'reading') : null;
  const ch = sentenceChannel(ca, cb, weak);
  const why = ca === 'page' && cb === 'page' ? tx.byEarNow : ca === 'ear' && cb === 'ear' ? tx.pageNow : ch === 'ear' ? tx.mixedEar : tx.mixedPage;
  const start = () => {
    const j = combinedSentence(a, b);
    const d = lickDrill(j.lick, dayKey, inst, opts);
    const drill: Drill = { ...d, goal: { ...d.goal, sections: j.parts.map((p) => ({ from: p.from, to: p.to, name: p.name })) } };
    onRun({ kind: 'sentence', drill, lick: j.lick, byEar: ch === 'ear', parts: j.parts });
  };
  return (
    <div className="ev-panel" data-ev-sentence={`${a.id}+${b.id}`} data-ev-channel={ch}>
      <p className="field-hint">{tx.sentenceHow}</p>
      <p className="ev-pair">
        <b>A</b> {a.name[lang]} <span aria-hidden="true">+</span> <b>B</b> {b.name[lang]}
      </p>
      <p className="ev-why">
        {why} · {tx.inKey}
        <bdi dir="ltr">{kName(dayKey)}</bdi>
      </p>
      <div className="ev-actions">
        <button className="btn primary" onClick={start} data-ev-start="sentence">
          <Icon k="play" /> {tx.start}
        </button>
        {learned.length > 2 && (
          <button className="btn ghost small" onClick={onSeed} data-ev-another="1">
            {tx.another}
          </button>
        )}
      </div>
    </div>
  );
}

/** The debrief of a sentence take: which part was recognised (A, B) and the link note. */
export function SentenceDebrief({ sections, lang }: { sections: { name: { en: string; he: string }; ok: number; total: number }[] | undefined; lang: Lang }) {
  const tx = TX[lang];
  const rows = sentenceDebrief(sections, lang);
  if (!rows.length) return null;
  return (
    <ul className="ev-debrief" data-ev-debrief={rows.filter((r) => r.known).length}>
      {rows.map((r, i) => (
        <li key={i} className={r.known ? 'known' : ''}>
          <b>{i === 0 ? 'A' : rows.length === 3 && i === 1 ? '+' : 'B'}</b> {r.name}
          <small>
            <bdi dir="ltr">
              {r.ok}/{r.total}
            </bdi>{' '}
            · {r.known ? tx.known : tx.isNew}
          </small>
        </li>
      ))}
    </ul>
  );
}

function TransposePanel({ lang, learned, items, inst, opts, seed, onSeed, onRun }: { lang: Lang; learned: Lick[]; items: Record<string, ItemState>; inst: LickInstrument; opts: Parameters<typeof lickDrill>[3]; seed: number; onSeed: () => void; onRun: (r: EarRun) => void }) {
  const tx = TX[lang];
  const can = learned.map((l) => ({ l, p: transposePlan(l, items) })).filter((x): x is { l: Lick; p: { from: number; to: number } } => !!x.p);
  if (!can.length) return <p className="field-hint" data-ev-locked="transpose">{tx.needOne}</p>;
  const { l, p } = can[Math.abs(seed) % can.length];
  const minor = !!l.minor;
  return (
    <div className="ev-panel" data-ev-transpose={l.id} data-ev-from={p.from} data-ev-to={p.to}>
      <p className="field-hint">{tx.transposeHow}</p>
      <p className="ev-pair">
        <b>{l.name[lang]}</b>
      </p>
      <p className="ev-why">
        {tx.heardIn}
        <bdi dir="ltr">{kName(p.from, minor)}</bdi> · {tx.playIn}
        <bdi dir="ltr">{kName(p.to, minor)}</bdi>
      </p>
      <div className="ev-actions">
        <button className="btn primary" onClick={() => onRun({ kind: 'transpose', drill: lickDrill(l, p.to, inst, opts), lick: l, hear: lickDrill(l, p.from, inst, opts), from: p.from, to: p.to })} data-ev-start="transpose">
          <Icon k="play" /> {tx.start}
        </button>
        {can.length > 1 && (
          <button className="btn ghost small" onClick={onSeed}>
            {tx.next}
          </button>
        )}
      </div>
    </div>
  );
}

function FindPanel({ lang, learned, library, inst, dayKey, opts, seed, onSeed, onFound }: { lang: Lang; learned: Lick[]; library: Lick[]; inst: LickInstrument; dayKey: number; opts: Parameters<typeof lickDrill>[3]; seed: number; onSeed: () => void; onFound: (evs: RatingEvent[], xp: number) => void }) {
  const tx = TX[lang];
  const a = learned.length ? learned[Math.abs(seed) % learned.length] : null;
  const ps = useMemo(() => (a ? passage(a, library, seed) : null), [a?.id, library, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const bpm = 92;
  const beatS = 60 / bpm;
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [res, setRes] = useState<FindResult | null>(null);
  const taps = useRef<number[]>([]);
  const t0 = useRef(0);
  const ctl = useRef<AbortController | null>(null);
  const raf = useRef(0);
  useEffect(
    () => () => {
      ctl.current?.abort();
      cancelAnimationFrame(raf.current);
    },
    [],
  );
  useEffect(() => setRes(null), [seed]);
  if (!a || !ps) return <p className="field-hint" data-ev-locked="find">{tx.needOne}</p>;
  const total = Math.ceil(ps.joined.parts[ps.joined.parts.length - 1].to);
  const hearA = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    const s = lickSound(lickDrill(a, dayKey, inst, opts), bpm);
    await piano.play(s.events, s.length, c.signal).catch(() => {});
  };
  const start = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setRes(null);
    taps.current = [];
    setRunning(true);
    const COUNT = 4;
    const d = lickDrill(ps.joined.lick, dayKey, inst, opts);
    const s = lickSound(d, bpm);
    // the count-in (4) and a click on every beat of the passage (the timing-cue rule), the passage after the count-in
    const clicks: NoteEvent[] = Array.from({ length: COUNT + total }, (_, k) => ({ midi: 96, start: 0.05 + k * beatS, duration: 0.04, velocity: k < COUNT ? (k ? 0.4 : 0.5) : k % 4 ? 0.14 : 0.22, perc: (k % 4 ? 'click' : 'accent') as 'click' | 'accent' }));
    const events: NoteEvent[] = [...clicks, ...s.events.map((e) => ({ ...e, start: e.start + COUNT * beatS }))];
    await piano.unlock();
    t0.current = performance.now() + 50 + COUNT * beatS * 1000;
    const tick = () => {
      setBeat((performance.now() - t0.current) / 1000 / beatS);
      if (!c.signal.aborted) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    await piano.play(events, s.length + COUNT * beatS + 0.2, c.signal).catch(() => {});
    cancelAnimationFrame(raf.current);
    const done = !c.signal.aborted;
    c.abort();
    setRunning(false);
    setBeat(null);
    if (!done) return;
    const r = gradeFind(taps.current, ps.target);
    setRes(r);
    const { evs, xp } = findEvents(a, r, new Date().toISOString(), Date.now().toString(36));
    onFound(evs, xp);
  };
  const tap = () => {
    if (!running || !t0.current) return;
    taps.current.push((performance.now() - t0.current) / 1000 / beatS);
  };
  const countNow = beat === null ? -1 : beat < 0 ? Math.max(0, Math.min(3, Math.floor(beat + 4))) : 4 + (Math.floor(beat) % 4);
  const pos = beat === null ? 0 : Math.max(0, Math.min(1, beat / total));
  return (
    <div className="ev-panel" data-ev-find={a.id}>
      <p className="field-hint">{tx.findHow}</p>
      <p className="ev-pair">
        {tx.findWhich} <b>{a.name[lang]}</b>
        <button className="btn ghost small" onClick={() => void hearA()} disabled={running} data-ev-hear="1">
          <Icon k="play" size={14} /> {tx.listenA}
        </button>
      </p>
      <div className="ev-track" dir="ltr" aria-hidden="true">
        {Array.from({ length: Math.ceil(total / 4) - 1 }, (_, k) => (
          <i key={k} className="ev-barline" style={{ left: `${((k + 1) * 4 * 100) / total}%` }} />
        ))}
        {res && <i className="ev-target" style={{ left: `${(ps.target.from * 100) / total}%`, width: `${((ps.target.to - ps.target.from) * 100) / total}%` }} />}
        <i className="ev-now" style={{ left: `${pos * 100}%` }} data-ev-now={running ? '1' : undefined} />
      </div>
      {running && <BeatDots countIn={4} beats={4} now={countNow} />}
      {res && (
        <p className={`ev-result ${res.hit ? 'ok' : 'miss'}`} data-ev-result={res.hit ? 'hit' : 'miss'}>
          {res.hit ? tx.found : tx.missed}
          {res.wrong ? ` · ${res.wrong} ${tx.wrongTaps}` : ''}
        </p>
      )}
      {running ? (
        <button className="btn primary mega ev-there" onPointerDown={tap} data-ev-there="1">
          {tx.there}
        </button>
      ) : (
        <div className="ev-actions">
          <button className="btn primary" onClick={() => void start()} data-ev-start="find">
            <Icon k="play" /> {res ? tx.again : tx.start}
          </button>
          {learned.length > 1 && (
            <button className="btn ghost small" onClick={onSeed}>
              {tx.next}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
