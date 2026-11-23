// Lick & vocabulary trainer (docs/SPEC-LICKS-TRANSCRIPTION.md): the library by chord context, a lick's 12-key ×
// tempo grid and stars, the measured run (the drills engine: MIDI or microphone, the tempo ladder), the spaced review
// and the "Use it" challenge over a band. Per course it plays on the course's instrument (the voice sings it).

import { focusOf, picksOf } from '../engine/styleFocus';
import { STYLE_TEXT, type StyleId } from '../engine/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { drillTakeMs } from './takeClock';
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
  bookAfterTake, byEarXp, CONTEXTS, LICK_Q, contextOf, dueLicks, isMinorLick, LICK_KEYS, LICK_KNOWN_STARS, lickById, lickDrill, lickEvents, lickGrid, lickOfDrill, LICKS, lickSound, lickStars, lickTempoItem, lickTempos, lickTarget, lickXp, lineLicks, nextLickKey, reviewKey,
  type Lick, type LickBook, type LickContext, type LickInstrument,
} from '../engine/licks';
import { findLick, useItChart, useItPassed, type ImpNote } from '../engine/lickDetect';
import { canComplete, completeStep, LICK_CONCEPTS, LICK_STEPS, loadLickFlows, newLickFlow, saveLickFlows, stepCards, withKeyStars, type LickConcept, type LickFlow, type LickStepN } from '../engine/practiceMethod';
import { RULE_NAME } from '../engine/improvRules';
import { Icon } from './icons';
import { LicksHead } from './LicksHead';
import { PlaceSpark } from './PlaceSpark';
import type { CourseId } from '../engine/courses';
import { LickShareButton } from './LickShare';
import { EarVocab, SentenceDebrief, type EarRun } from './EarVocab';
import { dayKeyIfKept } from './todayTech';
import { courseOfInstrument, profileOf, strongOf } from '../engine/channelPlan';
import { kName } from './encore/bits';
import { bookTake, inMyLanguage, usesOf } from '../engine/vocab';
import { lickLadder } from '../engine/statusLadder';
import { assignmentFor } from '../engine/itemAssign';
import { AssignMark, ItemHead, StatusLadder, TodayMark, type WhereChip } from './ItemHead';
import { assignedKeys, itemKey, useMyAssigns, useTeaching } from './itemAssigns';
import type { WayIn } from './practiceRoutes';
import { localDay } from '../storage/progress';
import { BidiText } from './BidiText';

/** The item page's main button by the way in (SPEC-PATH-TODAY-PRACTICE §2). */
const ITEM_MAIN: Record<WayIn, { en: string; he: string }> = {
  practice: { en: 'Practise', he: 'לתרגל' },
  path: { en: 'Continue the step', he: 'להמשיך את הצעד' },
  today: { en: "Today's dose", he: 'המנה של היום' },
  teacher: { en: 'The assignment', he: 'המשימה' },
};
import { lickImprovChart, lickInRepertoire, TODAYS_LICK_RULES } from '../engine/lickImprov';
import { STANDARD_CHANGES } from '../engine/standards';
import type { MyChart, VocabCtx } from './Charts';

type Lang = 'he' | 'en';
export type TakeFn = (state: ItemState, evs: RatingEvent[], xp: number, m?: { verdict: string; hands: string; cv: number | null }) => void;

const TX = {
  en: {
    title: 'Licks', all: 'All', review: 'Review', mine: 'My licks', earTab: 'Ear challenges', sentence: 'Combined sentence', transpose: 'Transpose by ear', heardIn: 'Heard in ', playIn: 'play it in ', none: 'Nothing due — your licks are fresh.', noneMine: 'Licks you know (3 stars) and your own transcribed phrases land here.',
    practise: 'Practice', useIt: 'Use it', add: 'Add to my licks', remove: 'Remove from my licks', locked: 'Use it opens at 3 stars (three keys at the target tempo).',
    keys: 'Keys', tempo: 'Tempo', lv: 'Level', due: 'due', start: 'Start', stop: 'Stop', listen: 'Hear it',
    useHow: (n: string) => `Improvise over the band. Use "${n}" at least twice — in any key the band is in, over the right chords.`,
    found: 'Found', exact: 'the lick', shape: 'its shape', wrongChord: 'over another chord', passed: 'Used it — it is yours.', notYet: 'Not twice over the right chords yet.',
    reviewDone: 'Review done', reviewNext: 'Next', keysOnScreen: 'No MIDI keyboard: play here', of: 'of', voice: 'Sing it: pitch and time are measured.',
    byEar: 'By ear', earAsk: 'Notes hidden: hear it, then play it back. They show once you play it right.', slower: 'Slower', reveal: 'Show the notes (less credit)', earLess: 'notes shown: less credit',
    fromPage: 'From the page', improvise: 'Use it in improvisation', inLang: 'In my language', used: (n: number, k: number) => `used ${n} ${n === 1 ? 'time' : 'times'} in ${k} ${k === 1 ? 'key' : 'keys'}`, notUsed: 'Not used in improvisation yet', fits: 'Where it fits in the repertoire', bars: 'bars',
    insts: { piano: 'Piano', guitar: 'Guitar', bass: 'Bass', voice: 'Voice' } as Record<LickInstrument, string>,
  },
  he: {
    title: 'ליקים', all: 'הכול', review: 'חזרה', mine: 'הליקים שלי', earTab: 'אתגרי שמיעה', sentence: 'המשפט המשולב', transpose: 'העברת סולם בשמיעה', heardIn: 'נשמע ב־', playIn: 'נגנו ב־', none: 'אין מה לחזור היום — הליקים שלך טריים.', noneMine: 'ליקים שאתם יודעים (3 כוכבים) ומשפטים שתמללתם בעצמכם מגיעים לכאן.',
    practise: 'לתרגל', useIt: 'להשתמש', add: 'להוסיף לליקים שלי', remove: 'להסיר מהליקים שלי', locked: '"להשתמש" נפתח ב-3 כוכבים (שלושה סולמות בטמפו היעד).',
    keys: 'סולמות', tempo: 'טמפו', lv: 'שלב', due: 'לחזרה', start: 'להתחיל', stop: 'עצירה', listen: 'להקשיב',
    useHow: (n: string) => `אלתרו מעל הלהקה. השתמשו ב"${n}" לפחות פעמיים — בסולם שבו הלהקה נמצאת, מעל האקורדים הנכונים.`,
    found: 'נמצא', exact: 'הליק', shape: 'הצורה שלו', wrongChord: 'מעל אקורד אחר', passed: 'השתמשתם בו — הוא שלכם.', notYet: 'עוד לא פעמיים מעל האקורדים הנכונים.',
    reviewDone: 'החזרה הושלמה', reviewNext: 'הבא', keysOnScreen: 'אין מקלדת MIDI: נגנו כאן', of: 'מתוך', voice: 'שירו אותו: הגובה והזמן נמדדים.',
    byEar: 'בשמיעה', earAsk: 'התווים מוסתרים: שמעו, ואז נגנו בחזרה. הם מופיעים כשמנגנים נכון.', slower: 'לאט יותר', reveal: 'להציג את התווים (פחות ניקוד)', earLess: 'התווים הוצגו: פחות ניקוד',
    fromPage: 'מהדף', improvise: 'להשתמש באלתור', inLang: 'בשפה שלי', used: (n: number, k: number) => `שימוש ${n} ${n === 1 ? 'פעם' : 'פעמים'} ב־${k} ${k === 1 ? 'סולם' : 'סולמות'}`, notUsed: 'עוד לא שימש באלתור', fits: 'איפה הוא מתאים ברפרטואר', bars: 'תיבות',
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
export function LickRun({ lang, settings, l, inst, queue, items, onTake, onEnd, review, sub = 'vocab', byEar = false, hearFrom, earNote, debrief, noShare = false }: { lang: Lang; settings: Settings; l: (d: Drill) => Lick; inst: LickInstrument; queue: Drill[]; items: Record<string, ItemState>; onTake: TakeFn; onEnd: (takes: number, clean: number, reviews: { lick: string; pass: boolean }[]) => void; review?: boolean; sub?: 'vocab' | 'transcribe'; /** By ear (owner 2026-11-14): the notes hidden until the first take; revealing them early gives less credit. */ byEar?: boolean; /** Phase 8, transpose by ear: what "Listen" plays (the lick in another key) instead of the drill itself. */ hearFrom?: (d: Drill) => Drill; /** A line over the hidden notes ("heard in E♭ — play it in A♭"). */ earNote?: React.ReactNode; /** Phase 8, the combined sentence: the debrief under the result (which part was recognised). */ debrief?: (m: TakeMetrics) => React.ReactNode; /** No share (a generated sentence is not a lick of the player's). */ noShare?: boolean }) {
  const ds = drillSettingsOf(settings);
  const cal = calOf(settings);
  const [i, setI] = useState(0);
  const drill = queue[i];
  const local = useRef<Record<string, ItemState>>({});
  const stateOf = (d: Drill) => local.current[d.itemId] ?? items[d.itemId] ?? newItem(d);
  const [bpm, setBpm] = useState(() => (drill ? stateOf(drill).goalBpm : 80));
  const [res, setRes] = useState<{ m: TakeMetrics; lad: LadderResult; bpm: number } | null>(null);
  const [take, setTake] = useState(0);
  const [again, setAgain] = useState(false);
  const [beat, setBeat] = useState(-1);
  const count = useRef({ takes: 0, clean: 0 });
  const reviews = useRef<{ lick: string; pass: boolean }[]>([]);
  const session = useRef(Date.now().toString(36));
  // By ear: per key, whether a take was made (the notes show after it) and whether the notes were revealed before it.
  const [ear, setEar] = useState<Record<string, { taken?: boolean; revealed?: boolean }>>({});
  if (!drill) return null;
  const lick = l(drill);
  const earNow = ear[drill.itemId] ?? {};
  // by ear (SPEC-EAR-AND-READING §3.2): the notes stay hidden until the lick is played back right (a clean take)
  const hidden = byEar && !earNow.taken && !earNow.revealed;
  const go = (j: number) => {
    setRes(null);
    if (j >= queue.length) return onEnd(count.current.takes, count.current.clean, reviews.current);
    setI(j);
    setBpm(stateOf(queue[j]).goalBpm);
    setAgain(false);
    setTake((t) => t + 1);
  };
  const done = (m: TakeMetrics, _p: PlayedNote[]) => {
    const st0 = stateOf(drill);
    // the channel: by ear with the notes still hidden = ear (fresh on the item's first take); otherwise read from the page
    const ch = byEar && !earNow.revealed ? (st0.takes ? 'ear-known' : 'ear-fresh') : 'page-known';
    const lad = applyTake(st0, m, bpm, new Date().toISOString(), ds, { targetBpm: lickTarget(lick), slower: bpm < (st0.goalBpm ?? 0) * 0.99, channel: ch, activeMs: drillTakeMs(drill, bpm) });
    local.current[drill.itemId] = lad.state;
    const n = count.current.takes++;
    if (m.verdict === 'clean') count.current.clean++;
    if (review) reviews.current.push({ lick: lick.id, pass: m.verdict === 'clean' });
    const by = byEar ? { byEar: true, revealed: !!earNow.revealed } : undefined;
    onTake(lad.state, lickEvents(lick, inst, m, bpm, new Date().toISOString(), session.current, n, sub, by), by ? byEarXp(m, by) : lickXp(m), { verdict: m.verdict, hands: 'R', cv: null });
    if (byEar && m.verdict === 'clean') setEar((x) => ({ ...x, [drill.itemId]: { ...earNow, taken: true } }));
    setRes({ m, lad, bpm });
    setBpm(lad.next.bpm);
  };
  return (
    <div className="drill-run lk-run" data-drill={drill.itemId} data-lick-run={review ? 'review' : byEar ? 'ear' : 'practice'}>
      <p className="drill-goal">
        {i + 1} / {queue.length} · <span dir="ltr">♩ {bpm}</span>
        {inst === 'voice' && <small className="lk-voice-hint"> · {TX[lang].voice}</small>}
        {byEar && earNow.revealed && !earNow.taken && <small className="lk-voice-hint"> · {TX[lang].earLess}</small>}
      </p>
      {hidden ? <EarLick drill={drill} sound={hearFrom?.(drill)} note={earNote} bpm={bpm} lang={lang} onReveal={() => setEar((x) => ({ ...x, [drill.itemId]: { ...earNow, revealed: true } }))} /> : <DrillScore drill={drill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} />}
      {res && !hidden && <MarkLegend lang={lang} />}
      {!res && <DrillTake key={`${drill.itemId}:${take}`} autoStart={again} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), done(m, p))} onBeat={setBeat} drumsOk={settings.headphones} />}
      {res && (
        <>
          {!review && <p className="drill-ladder">{res.lad.message[lang]}</p>}
          <TakeResult m={res.m} lang={lang} onAgain={() => (setRes(null), setAgain(true), setTake((t) => t + 1))} onSlower={() => (setRes(null), setAgain(true), setBpm((b) => Math.max(40, Math.round(b * 0.9))), setTake((t) => t + 1))} onNext={() => go(i + 1)} extra={!review && !noShare && sub === 'vocab' && res.m.verdict === 'clean' ? <LickShareButton compact lang={lang} info={{ title: lick.name[lang], key: kName(drill.spec.key, isMinorLick(lick)), bpm: Math.round(res.m.bpm || res.bpm), drill, by: settings.nickname, level: lick.level }} /> : undefined} />
          {/* Owner 2026-11-22: a clean take at a tempo offers a small share (the lick, the key, ♩N) in the actions row. */}
          {debrief?.(res.m)}
        </>
      )}
    </div>
  );
}

/** By ear: the notes hidden — hear the lick (and slowed), then play it; the notes can be shown, for less credit. */
function EarLick({ drill, sound, note, bpm, lang, onReveal }: { drill: Drill; /** What "Listen" plays (default the drill). */ sound?: Drill; note?: React.ReactNode; bpm: number; lang: Lang; onReveal: () => void }) {
  const tx = TX[lang];
  const [playing, setPlaying] = useState<null | 1 | 0.65>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const hear = async (rate: 1 | 0.65) => {
    ctl.current?.abort();
    if (playing === rate) return setPlaying(null);
    const c = new AbortController();
    ctl.current = c;
    setPlaying(rate);
    try {
      await piano.unlock();
      const s = lickSound(sound ?? drill, bpm, rate);
      await piano.play(s.events, s.length, c.signal);
    } catch {
      /* stopped */
    }
    if (ctl.current === c) setPlaying(null);
  };
  return (
    <div className="ear-card lk-ear" data-lick-ear="hidden">
      <p className="ear-ask">{tx.earAsk}</p>
      {note}
      <p className="lk-ear-chart" dir="ltr">
        {(drill.chart ?? []).join(' | ')}
      </p>
      <div className="ear-replay">
        <button className={`btn small ${playing === 1 ? 'primary' : 'ghost'}`} onClick={() => void hear(1)} data-lick-hear="1">
          {tx.listen}
        </button>
        <button className={`btn small ${playing === 0.65 ? 'primary' : 'ghost'}`} onClick={() => void hear(0.65)} data-lick-hear="slow">
          {tx.slower}
        </button>
      </div>
      <button className="link lk-reveal" onClick={onReveal} data-lick-reveal="1">
        {tx.reveal}
      </button>
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
export function UseIt({ lang, settings, lick, inst, onResult, vocab }: { lang: Lang; settings: Settings; lick: Lick; inst: LickInstrument; onResult: (ok: boolean, good: number) => void; /** SPEC-LICKS-IN-IMPROV §3: every lick of mine in the take is booked (the log, the review, XP). */ vocab?: VocabCtx }) {
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
    const played = notes.current.filter((n) => n.beat > -0.5 && n.beat < chart.beats + 1);
    const hits = findLick(lick, played, chart.spans);
    setRes(hits);
    // the take is an improvisation over the band: every lick of mine in it is booked (not only the one asked for)
    bookTake(vocab, { notes: played, spans: chart.spans.map((x) => ({ root: x.root, iv: LICK_Q[x.q]?.ct ?? [0, 4, 7, 11], at: x.at, beats: x.beats })), meter: 4 }, `useit-${Date.now().toString(36)}`);
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

type View = { k: 'lib' } | { k: 'earRun'; run: EarRun } | { k: 'lick'; id: string } | { k: 'run'; id: string; queue: Drill[]; review?: boolean; byEar?: boolean } | { k: 'useit'; id: string } | { k: 'reviewRun'; queue: Drill[]; ids: string[] } | { k: 'absorb'; id: string };

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
  /** SPEC-STYLE-FOCUS §9.1: the style taster's lick part — open on this style (the library filtered to it), and on this lick when given. */
  startStyle?: StyleId;
  startLick?: string;
  /** A path step: open on this level's licks; onPathDone gets the stars when the player leaves. */
  pathLevel?: number;
  onPathDone?: (stars: number) => void;
  /** Inside the Licks tile (owner 2026-11-22): the library's header is the tile's, with its three sections. */
  hub?: boolean;
  /** Phase 4: the usage log ("in my language", "used N times in K keys"). */
  vocab?: VocabCtx;
  /** "Use it in improvisation": open the chart player with this chart (today's lick = the lick). */
  onImprovise?: (c: MyChart) => void;
  /** SPEC-PATH-TODAY-PRACTICE §2: open straight on this lick's page (an assignment, the path step's full practice). */
  openLick?: string;
  /** The way in (the main button's words): the path, Today, the teacher, or Practice. */
  wayIn?: WayIn;
  /** "Where it sits": the path step of a lick level (licks:<course>:<level>), or null. */
  whereOf?: (level: number) => WhereChip | null;
  onWhere?: () => void;
}

export function LickTrainerScreen({ lang, settings, items, onSettings, onTake, onUsed, onBack, startReview, pathLevel, onPathDone, hub, onImprovise, vocab, openLick, wayIn: wayInProp, whereOf, onWhere, startStyle, startLick }: LickTrainerProps) {
  const tx = TX[lang];
  const inst = lickInstrumentOf(settings);
  // SPEC-EAR-AND-READING §2.2 outside technique: a lick is learned in the player's strong channel first (by ear or from
  // the page, the measured profile with the course's self-ratings as the prior); the other way stays one tap away
  const strongCh = strongOf(profileOf(items, settings.channelSelf?.[courseOfInstrument(inst === 'voice' ? 'piano' : inst)]));
  const book: LickBook = settings.lickBook ?? {};
  // Encore phrases (Lick v3) live in the same book but practice in Encore (their own plan and map).
  const own = (book.own ?? []).filter((l) => !(l.v === 3 || l.id.startsWith('enc-')));
  // the line families' lines are licks too (phase 4: one progress with their levels) — on the piano, where they live
  const all = [...LICKS, ...(inst === 'piano' ? lineLicks() : []), ...own];
  const due = dueLicks(book.review).filter((id) => lickById(id, own));
  const [tab, setTab] = useState<LickContext | 'all' | 'review' | 'mine' | 'ear'>(startReview && due.length ? 'review' : 'all');
  // SPEC-STYLE-FOCUS §4: the library opens on the first of my styles that has licks (untagged licks are jazz)
  const [styleF, setStyleF] = useState<StyleId | 'all'>(() => startStyle ?? picksOf(focusOf(settings, (settings.activeCourse ?? 'keys') as CourseId)).find((st) => all.some((l) => !l.own && (l.style ?? 'jazz') === st)) ?? 'all');
  // the taster's lick (§9.1) or an opened lick: its page at once, when the library has it
  const firstLick = openLick ?? startLick;
  const [view, setView] = useState<View>(() => (firstLick && (lickById(firstLick, own) || all.some((l) => l.id === firstLick)) ? { k: 'lick', id: firstLick } : { k: 'lib' }));
  const [live, setLive] = useState<Record<string, ItemState>>({});
  const itemsNow = { ...items, ...live };
  // the one item page (SPEC-PATH-TODAY-PRACTICE §2): the way in, today's licks (today's lick, the due reviews), assignments
  const wayIn: WayIn = wayInProp ?? (pathLevel ? 'path' : startReview ? 'today' : 'practice');
  const todayIds = new Set([...(vocab?.today ? [vocab.today.id] : []), ...due]);
  const myAssigns = useMyAssigns();
  const assignedSet = assignedKeys(myAssigns);
  const teaching = useTeaching();
  const ladderOfLick = (l: Lick) => lickLadder(l, inst, itemsNow, inMyLanguage(book.uses, l.id));
  const opts = { range: settings.voiceRange ?? null, tuning: inst === 'bass' ? bassTuningOf(settings) : undefined, band: true };
  const lickOf = (d: Drill) => lickOfDrill(d, own) ?? all[0];
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
        <Icon k="back" />
      </button>
      <h1>{title}</h1>
    </header>
  );
  const runFor = (l: Lick) => {
    const first = nextLickKey(l, inst, itemsNow);
    const order = [...LICK_KEYS.slice(LICK_KEYS.indexOf(first)), ...LICK_KEYS.slice(0, LICK_KEYS.indexOf(first))].filter((k) => !lickGrid(l, inst, itemsNow).find((c) => c.key === k)?.passed);
    return (order.length ? order : LICK_KEYS).map((k) => lickDrill(l, k, inst, opts));
  };

  if (view.k === 'earRun') {
    const r = view.run;
    const back = () => (setView({ k: 'lib' }), setTab('ear'));
    return (
      <main className="drills-screen lk-screen" data-licks="ear-run" data-ear-run={r.kind}>
        {head(r.kind === 'sentence' ? tx.sentence : `${tx.transpose} · ${r.lick.name[lang]}`, back)}
        <LickRun
          lang={lang}
          settings={settings}
          l={() => r.lick}
          inst={inst}
          queue={[r.drill]}
          items={itemsNow}
          onTake={take}
          byEar={r.kind === 'transpose' || r.byEar}
          noShare={r.kind === 'sentence'}
          hearFrom={r.kind === 'transpose' ? () => r.hear : undefined}
          earNote={
            r.kind === 'transpose' ? (
              <p className="ev-why" data-ev-note="transpose">
                {tx.heardIn}
                <bdi dir="ltr">{kName(r.from, !!r.lick.minor)}</bdi> · {tx.playIn}
                <bdi dir="ltr">{kName(r.to, !!r.lick.minor)}</bdi>
              </p>
            ) : undefined
          }
          debrief={r.kind === 'sentence' ? (m) => <SentenceDebrief sections={m.sections} lang={lang} /> : undefined}
          onEnd={back}
        />
      </main>
    );
  }
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
          byEar={view.k === 'run' && !!view.byEar}
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
          vocab={vocab}
          onResult={(ok, good) => {
            const at = new Date().toISOString();
            onUsed([{ id: `g:useit:${l.id}:${Date.now().toString(36)}`, skill: 'improv', difficulty: Math.round(1000 + l.level * 120), correct: ok, score: Math.min(1, good / 2), tags: [{ skill: 'improv', sub: 'improv/vocab', w: 0.6 }, { skill: 'improv', sub: 'improv/play', w: 0.4 }], at }], ok ? 8 : good ? 3 : 1);
            if (ok) onSettings({ lickBook: { ...(settings.lickBook ?? {}), used: { ...(settings.lickBook?.used ?? {}), [l.id]: Math.max(good, settings.lickBook?.used?.[l.id] ?? 0) } } });
          }}
        />
      </main>
    );
  }
  if (view.k === 'absorb') {
    const l = lickById(view.id, own)!;
    return (
      <main className="panel-screen lk-screen" data-licks="absorb" data-lick={l.id}>
        {head(`${lang === 'he' ? 'לספוג' : 'Absorb'} · ${l.name[lang]}`, () => setView({ k: 'lick', id: l.id }))}
        <AbsorbFlow lang={lang} lickId={l.id} stars={lickStars(l, inst, itemsNow)} onPractise={() => setView({ k: 'run', id: l.id, queue: runFor(l) })} />
      </main>
    );
  }
  if (view.k === 'lick') {
    const l = lickById(view.id, own)!;
    const stars = lickStars(l, inst, itemsNow);
    const mine = (book.mine ?? []).includes(l.id);
    const key = nextLickKey(l, inst, itemsNow);
    const preview = lickDrill(l, key, inst, opts);
    const u = usesOf(book.uses, l.id);
    const lang2 = inMyLanguage(book.uses, l.id);
    const fitsRep = onImprovise ? lickInRepertoire(l, 3) : [];
    const improvise = (k: number) => {
      const c = lickImprovChart(l, k);
      onImprovise?.({ id: `lick-${l.id}-${Date.now()}`, title: `${l.name[lang]} · ${kName(k, isMinorLick(l))}`, text: c.text, style: c.style, bpm: c.bpm, rules: TODAYS_LICK_RULES, lick: l.id });
    };
    return (
      <main className="panel-screen lk-screen" data-licks="lick" data-lick={l.id}>
        {head(l.name[lang], () => setView({ k: 'lib' }))}
        <ItemHead
          dense
          lang={lang}
          tempoItem={lickTempoItem(l, inst, itemsNow)}
          ladder={ladderOfLick(l)}
          kicker={
            <span className="lk-meta" data-stars={stars}>
              <span>
                <BidiText text={contextOf(l.ctx).name[lang]} />
              </span>{' '}
              · <span>{tx.lv} {l.level}</span>
              {lang2 && <b className="lk-lang" data-lick-lang="1"> · {tx.inLang}</b>}
              {/* the usage log on the same line (one phone screen) */}
              <span className="lk-uses" data-lick-uses={u.n} data-lick-use-keys={u.keys}>
                {u.n ? ` · ${tx.used(u.n, u.keys)}` : ''}
              </span>
            </span>
          }
          where={l.own ? null : whereOf?.(l.level) ?? null}
          onWhere={onWhere}
          why={todayIds.has(l.id) ? (due.includes(l.id) ? { en: 'Review', he: 'חזרה' } : { en: "Today's lick", he: 'הליק של היום' }) : null}
          assigned={assignmentFor(myAssigns, { k: 'lick', id: l.id }, localDay(new Date()))}
          item={l.own ? null : { k: 'lick', id: l.id }}
          teaching={teaching}
          title={l.name[lang]}
        />

        <DrillScore drill={preview} ds={drillSettingsOf(settings)} lang={lang} />
        <LickGrid l={l} inst={inst} items={itemsNow} lang={lang} />
        <div className="drill-actions lk-actions">
          {/* two modes per lick (SPEC-EAR-AND-READING §3.2): from the page, or by ear (the notes hidden until played right) */}
          <button className={`btn ${strongCh === 'ear' ? '' : 'primary'}`} style={strongCh === 'ear' ? { order: 1 } : undefined} onClick={() => setView({ k: 'run', id: l.id, queue: runFor(l) })} data-lick-practice="1" data-item-main={wayIn} title={`${tx.fromPage} · ${keyName(key)}`}>
            {ITEM_MAIN[wayIn][lang]} · <bdi dir="ltr">{keyName(key)}</bdi>
          </button>
          <button className={`btn ${strongCh === 'ear' ? 'primary' : ''}`} style={strongCh === 'ear' ? { order: 0 } : undefined} onClick={() => setView({ k: 'run', id: l.id, queue: runFor(l), byEar: true })} data-lick-byear="1" data-lick-strong={strongCh}>
            {tx.byEar}
          </button>
          {onImprovise && (
            <button className="btn" onClick={() => improvise(l.homeKey ?? key)} data-lick-improvise="1">
              {tx.improvise}
            </button>
          )}
          <button className="btn" onClick={() => setView({ k: 'absorb', id: l.id })} data-lick-absorb="1">
            {lang === 'he' ? 'לספוג' : 'Absorb'}
          </button>
          <button className="btn ghost" onClick={() => onSettings({ lickBook: { ...book, mine: mine ? (book.mine ?? []).filter((x) => x !== l.id) : [...(book.mine ?? []), l.id] } })} data-lick-mine={mine ? 'on' : 'off'}>
            {mine ? tx.remove : tx.add}
          </button>
        </div>
        {fitsRep.length > 0 && (
          <details className="lk-fits" data-lick-fits={fitsRep.length}>
            <summary>{tx.fits}</summary>
            <ul>
              {fitsRep.map((f) => (
                <li key={f.id}>
                  <button
                    className="link"
                    onClick={() => {
                      const sc = STANDARD_CHANGES.find((x) => x.id === f.id)!;
                      onImprovise?.({ id: `lick-${l.id}-${f.id}-${Date.now()}`, title: `${f.name} · ${l.name[lang]}`, text: sc.text, style: sc.style, bpm: sc.bpm, std: sc.id, rules: TODAYS_LICK_RULES, lick: l.id });
                    }}
                    data-lick-fit={f.id}
                  >
                    {f.name} — {f.part[lang]}
                  </button>
                  <small dir="auto">
                    {' '}
                    · {tx.bars} <bdi dir="ltr">{f.bars.slice(0, 4).join(', ')}</bdi>
                  </small>
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>
    );
  }
  // The library.
  const list = tab === 'review' ? due.map((id) => lickById(id, own)!) : tab === 'mine' ? all.filter((l) => (book.mine ?? []).includes(l.id)) : tab === 'all' ? all.filter((l) => !l.own && !l.src) : all.filter((l) => l.ctx === tab && !l.own);
  // SPEC-STYLE-FOCUS §4: the context filter opens on the main style (a lick without a tag is jazz, the library's own)
  const lickStyle = (l: Lick): StyleId => l.style ?? 'jazz';
  // (the row shows once the library holds more than one style — today every built-in lick is jazz)
  const libStyles = new Set(all.filter((l) => !l.own).map(lickStyle));
  const myStyles0 = libStyles.size > 1 ? picksOf(focusOf(settings, (settings.activeCourse ?? 'keys') as CourseId)).filter((st) => libStyles.has(st)) : [];
  // opened by the style taster on a style (§9.1): its chip shows even before the library holds licks in it
  const myStyles1 = startStyle && !myStyles0.includes(startStyle) ? [startStyle, ...myStyles0] : myStyles0;
  // the style devices tab: its chips are the styles it holds (mine first), and a style it does not hold shows them all
  const tabStyles = tab === 'style' ? [...new Set(list.map(lickStyle))] : null;
  const myStyles = tabStyles ? [...myStyles1.filter((st) => tabStyles.includes(st)), ...tabStyles.filter((st) => !myStyles1.includes(st))] : myStyles1;
  const styleOn: StyleId | 'all' = tabStyles && styleF !== 'all' && !tabStyles.includes(styleF) ? 'all' : styleF;
  const styleEmpty = styleOn !== 'all' && !libStyles.has(styleOn);
  const styled = styleOn === 'all' || (tab !== 'all' && !CONTEXTS.some((c) => c.id === tab)) ? list : list.filter((l) => l.own || lickStyle(l) === styleOn);
  const shown = pathLevel && tab === 'all' ? [...styled.filter((l) => l.level === pathLevel), ...styled.filter((l) => l.level !== pathLevel)] : styled;
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
      {hub ? <LicksHead lang={lang} section="library" onBack={leave} book={book} spark={<PlaceSpark place="licks" course={(settings.activeCourse ?? 'keys') as CourseId} lang={lang} />} /> : head(tx.title, leave)}
      <p className="lk-inst">
        <Glyph kind="lick" color="#A78BFA" size={34} /> {tx.insts[inst]}
      </p>
      {pathLevel ? (() => {
        // SPEC-PATH-TODAY-PRACTICE §3.1: a lick step's full practice = the lick's page (12 keys, the two modes)
        const lv = all.filter((l) => l.level === pathLevel && !l.own);
        const first = lv.find((l) => !ladderOfLick(l).lit.includes('keys12')) ?? lv[0];
        return first ? (
          <button className="link ex-full" onClick={() => setView({ k: 'lick', id: first.id })} data-brief-full="lick" data-step-full-lick={first.id}>
            {lang === 'he' ? 'התרגול המלא של הצעד' : 'The full practice of the step'}
          </button>
        ) : null;
      })() : null}
      <div className="chips lk-tabs" role="tablist">
        {(['all', 'review', 'mine', 'ear'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)} data-lick-tab={k}>
            {k === 'ear' ? tx.earTab : tx[k]}
            {k === 'review' && due.length ? ` · ${due.length}` : ''}
          </button>
        ))}
        {CONTEXTS.filter((c) => c.id !== 'lines' || inst === 'piano').map((c) => (
          <button key={c.id} role="tab" aria-selected={tab === c.id} className={`chip ${tab === c.id ? 'on' : ''}`} onClick={() => setTab(c.id)} data-lick-tab={c.id}>
            {c.short[lang]}
          </button>
        ))}
      </div>
      {myStyles.length > 0 && (tab === 'all' || CONTEXTS.some((c) => c.id === tab)) && (
        <div className="chips lk-style" role="radiogroup" aria-label={lang === 'he' ? 'סגנון' : 'Style'} data-lick-style={styleOn}>
          {myStyles.map((st) => (
            <button key={st} role="radio" aria-checked={styleOn === st} className={`chip ${styleOn === st ? 'on' : ''}`} onClick={() => setStyleF(st)} data-lick-style-pick={st}>
              {STYLE_TEXT[st][lang]}
            </button>
          ))}
          <button role="radio" aria-checked={styleOn === 'all'} className={`chip ${styleOn === 'all' ? 'on' : ''}`} onClick={() => setStyleF('all')} data-lick-style-pick="all">
            {lang === 'he' ? 'כל הסגנונות' : 'All styles'}
          </button>
        </div>
      )}
      {styleEmpty && (tab === 'all' || CONTEXTS.some((c) => c.id === tab)) && (
        <p className="field-hint" data-lick-style-empty={styleOn}>
          {lang === 'he' ? `עוד אין בספרייה ליקים בסגנון ${STYLE_TEXT[styleOn as StyleId].he}. הם ייכנסו כשיימצאו להם מקורות מאומתים.` : `No ${STYLE_TEXT[styleOn as StyleId].en} licks in the library yet. They come in once verified sources are found.`}
        </p>
      )}
      {tab === 'review' && due.length > 0 && (
        <button className="btn primary" onClick={startReviewRun} data-lick-review="1">
          {tx.review} · {due.length}
        </button>
      )}
      {/* Phase 8 (SPEC-EAR-AND-READING §3.1–3.2): the combined sentence, find the lick, transpose by ear */}
      {tab === 'ear' && (
        <EarVocab
          lang={lang}
          items={itemsNow}
          licks={all}
          library={LICKS}
          inst={inst}
          dayKey={dayKeyIfKept(inst === 'voice' ? 'piano' : inst)?.root ?? 0}
          opts={opts}
          onRun={(run) => setView({ k: 'earRun', run })}
          onFound={(evs, xp) => onUsed(evs, xp)}
        />
      )}
      {tab !== 'ear' && !shown.length && <p className="field-hint">{tab === 'review' ? tx.none : tx.noneMine}</p>}
      {tab !== 'ear' && <ul className="lk-list">
        {shown.map((l) => {
          const s = lickStars(l, inst, itemsNow);
          const g = lickGrid(l, inst, itemsNow);
          return (
            <li key={l.id}>
              <button className="lk-card" onClick={() => setView({ k: 'lick', id: l.id })} data-lick-card={l.id}>
                <span className="lk-card-top">
                  <b>
                    {l.name[lang]}
                    {todayIds.has(l.id) && <TodayMark lang={lang} short />}
                    {assignedSet.has(itemKey({ k: 'lick', id: l.id })) && <AssignMark lang={lang} />}
                  </b>
                  <span data-stars={s} data-lick-lang={inMyLanguage(book.uses, l.id) ? '1' : undefined}>
                    <StatusLadder ladder={ladderOfLick(l)} lang={lang} compact />
                  </span>
                </span>
                <span className="lk-card-sub">
                  <small>
                    {l.own ? tx.mine : contextOf(l.ctx).short[lang]} · {tx.lv} {l.level}
                    {(() => {
                      const uu = usesOf(book.uses, l.id);
                      return uu.n ? ` · ${tx.used(uu.n, uu.keys)}` : '';
                    })()}
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
      </ul>}
    </main>
  );
}

/**
 * The 7-step flow for making a lick your own (practiceMethod.ts; Siskind's "7-Step Program to Improvised Bliss",
 * coursepack): one row per step, the current one with its action. Step 2 is the 12-key trainer (done at 3 stars);
 * step 3 tags the concept; steps 4–7 name the rule cards that check it. Stored on the device.
 */
function AbsorbFlow({ lang, lickId, stars, onPractise }: { lang: Lang; lickId: string; stars: number; onPractise: () => void }) {
  const he = lang === 'he';
  const [all, setAll] = useState<Record<string, LickFlow>>(() => loadLickFlows());
  const [pick, setPick] = useState<LickConcept | undefined>(undefined);
  const today = new Date().toISOString().slice(0, 10);
  const f = withKeyStars(all[lickId] ?? newLickFlow(), stars, LICK_KNOWN_STARS, today);
  const put = (nf: LickFlow) => {
    const m = { ...all, [lickId]: nf };
    setAll(m);
    saveLickFlows(m);
  };
  useEffect(() => {
    // step 2 done by the 12-key trainer: keep it
    if (f.step !== (all[lickId]?.step ?? 1)) put(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.step]);
  return (
    <ol className="lk-flow" data-lick-flow={f.step} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
      {LICK_STEPS.map((x) => {
        const done = !!f.done[x.n];
        const now = x.n === f.step;
        const cards = stepCards(x.n, f.concept);
        return (
          <li key={x.n} data-flow-step={x.n} data-flow-state={done ? 'done' : now ? 'now' : 'later'} style={{ opacity: done || now ? 1 : 0.55 }}>
            <b dir="ltr">{done ? '✓' : x.n}</b> <b>{x.title[lang]}</b> <small className="field-hint">{x.how[lang]}</small>
            {x.n === 3 && (now || f.concept) && (
              <span className="chips" role="radiogroup" style={{ marginTop: 2 }}>
                {LICK_CONCEPTS.map((c) => {
                  const on = (now ? (pick ?? f.concept) : f.concept) === c.id;
                  return (
                    <button key={c.id} role="radio" aria-checked={on} className={`chip ${on ? 'on' : ''}`} disabled={!now} onClick={() => setPick(c.id)} data-flow-concept={c.id}>
                      {c.name[lang]}
                    </button>
                  );
                })}
              </span>
            )}
            {cards.length > 0 && (now || done) && (
              <small className="field-hint" data-flow-cards={cards.join(',')}>
                {' · '}
                {cards.map((id) => (RULE_NAME as Record<string, { en: string; he: string }>)[id]?.[lang] ?? id).join(', ')}
              </small>
            )}
            {now && x.n === 2 && (
              <button className="btn small" onClick={onPractise} data-flow-practice="1">
                {he ? 'לתרגל בסולמות' : 'Practice in keys'}
              </button>
            )}
            {now && x.n !== 2 && (
              <button className="btn small primary" disabled={!canComplete(f, x.n as LickStepN, pick)} onClick={() => put(completeStep(f, x.n as LickStepN, today, pick))} data-flow-done={x.n}>
                {he ? 'בוצע' : 'Done'}
              </button>
            )}
          </li>
        );
      })}
      {f.step > 7 && <li className="field-hint" data-flow-complete="1">{he ? 'הליק שלכם.' : 'The lick is yours.'}</li>}
    </ol>
  );
}
