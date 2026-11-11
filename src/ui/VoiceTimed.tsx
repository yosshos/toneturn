// The timed takes of the voice course (VOICE_CURRICULUM F7, F13–F15): time feel against clicks, songs with the band
// scored phrase by phrase (the weakest looped slower until it passes), and scat over the band. The microphone delay
// is measured once (LatencyCalibrate) and removed from every onset. Only pitch, time and loudness are graded.

import '../voicecourse.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './icons';
import { LatencyCalibrate } from './LatencyCalibrate';
import { piano, SIMULATED, store } from './services';
import { noteLabel } from './Vocal';
import { SingRoll } from './SingAlong';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { BleedGate } from '../engine/bleed';
import { atRange, type TakeGrade, type VocalItem, type VoiceRange } from '../engine/vocal';
import type { SungFrame } from '../engine/sing';
import type { NoteEvent } from '../engine/lesson';
import { chartBacking, chordAtBeat, parseChart, transposeChart } from '../engine/charts';
import { sheetNotes, songBacking, songPlan, voiceSong, type SongGrade, type SongPlan } from '../engine/voiceSongs';
import { feelVerdict, swingBand, synthDahs, synthLine, voiceOnsets, type TimeFeel } from '../engine/voiceTime';
import { gradeRubatoSong, gradeScat, gradeSong, gradeTime, MOTIF_ANSWER_AT, motifCell, phraseFalls, scatCentre, scatChart, scatTurns } from '../engine/voiceGrade';
import { familyOfRef, NEW_LEVEL_NAMES, vocalLevelByRef, voiceItemTags } from '../engine/voiceFamilies';
import { Follower, restAdvice, sungLine, synthRubato, synthTrade, tradeOpening, tradeReply, type RestTake } from '../engine/voiceP2';
import type { PNote } from '../engine/improvPhrasing';
import { NoteStaff } from './NoteViews';
import { MySongPick } from './VoiceMySong';
import { noteSongScore } from './MySong';
import { pc } from '../engine/pitch';
import { METRIC_NAMES, MOTIF_KIND_NAMES, SCAT_INSTR, SONG_INSTR, TIME_INSTR, VT } from '../content/voiceCourseText';
import { keepTake } from '../storage/takes';
import { weekId } from '../engine/adaptive';
import type { LessonResult, Progress, Settings, VocalTake } from '../storage/progress';
import type { Strings } from '../i18n/strings';

type Lang = 'he' | 'en';
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
const HP_KEY = 'toneturn.headphones';
const readHp = () => {
  try {
    return localStorage.getItem(HP_KEY) === '1';
  } catch {
    return false;
  }
};

/** A timed level's take: what was played, and what came back. */
interface Take {
  grade: TakeGrade;
  feel?: TimeFeel | null;
  swing?: { ratio: number; pairs: number };
  song?: SongGrade;
  slots?: ('ok' | 'off' | null)[];
  /** A loop of one phrase (practice, not counted). */
  loop?: { phrase: number; scale: number };
  /** P2: the motif's developments heard, notes per trading turn, the colla voce follow share, falls at phrase ends. */
  kinds?: string[];
  turns?: number[];
  follow?: number;
  falls?: { falls: number; phrases: number };
}

/** Sung minutes and the tiring check from the kept takes (the rest reminder; never a score). */
export function restTakes(takes: VocalTake[]): RestTake[] {
  return takes.map((tk) => ({ at: tk.at, secs: vocalLevelByRef(tk.level)?.items.find((x) => x.id === tk.item)?.seconds ?? 6, ...(typeof tk.m?.stability === 'number' ? { stability: tk.m.stability } : {}) }));
}

export function TimedSession({ t, settings, range, level, items, onExit, onProgress, onSettings }: { t: Strings; settings: Settings; range: VoiceRange; level: number; items: VocalItem[]; onExit: () => void; onProgress: (p: Progress) => void; onSettings: (p: Partial<Settings>) => void }) {
  const lang: Lang = settings.uiLang === 'en' ? 'en' : 'he';
  const L = (b: { en: string; he: string }) => b[lang];
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'count' | 'singing' | 'result' | 'summary'>('ready');
  const [take, setTake] = useState<Take | null>(null);
  const [frames, setFrames] = useState<SungFrame[]>([]);
  const [now, setNow] = useState(0);
  const [beatNow, setBeatNow] = useState(-1);
  const [headphones, setHeadphones] = useState(readHp);
  const [guide, setGuide] = useState(false);
  const [loop, setLoop] = useState<{ phrase: number; scale: number } | null>(null);
  const [calDone, setCalDone] = useState(settings.micLatencyMs !== undefined || SIMULATED);
  const [summary, setSummary] = useState<{ score: number; passed: boolean; rest?: string } | null>(null);
  const [mine, setMine] = useState<{ plan: SongPlan; buffer: AudioBuffer; id?: string } | null>(null);
  const best = useRef<Record<string, { score: number; take: VocalTake }>>({});
  const ctl = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  const sessionId = useMemo(() => `vocal-${level}-${Date.now().toString(36)}`, [level]);
  const item = items[i];
  const lvDef = vocalLevelByRef(level);
  useEffect(() => () => (ctl.current?.abort(), piano.stopAll()), []);

  // The song plan in the singer's range (tempo of the item, or slower in a loop).
  const { plan, span } = useMemo(() => (item?.song?.mine ? (mine ? { plan: mine.plan, span: { from: 0, to: mine.plan.bars - 1 } } : { plan: null, span: null }) : item ? songSpan(item, range, loop) : { plan: null, span: null }), [item, range, loop, mine]);
  const tonicPc = useMemo(() => ((atRange(range, 0.35) % 12) + 12) % 12, [range]);
  const needsTiming = item?.kind === 'time' || (item?.kind === 'song' && (item.song?.rhythm || item.song?.feel || item.song?.interpret)) || item?.kind === 'scat';

  if (!item || !lvDef) return null;
  const title = L(NEW_LEVEL_NAMES[level] ?? { en: String(level), he: String(level) });
  const family = L(familyOfRef(level)?.title ?? { en: '', he: '' });

  const run = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    stopped.current = false;
    setTake(null);
    setFrames([]);
    setNow(0);
    setPhase('count');
    let tick: ReturnType<typeof setInterval> | undefined;
    const res = await captureTimed({
      item, plan, span, range, tonicPc, settings, headphones, guide, loop, signal: c.signal, stopped, mine: mine?.buffer ?? null,
      onFrames: setFrames,
      onClock: (zero, beat) => {
        tick = setInterval(() => {
          const s = (performance.now() - zero) / 1000;
          setNow(s);
          setBeatNow(Math.floor(s / beat));
          if (s >= 0) setPhase((p) => (p === 'count' ? 'singing' : p));
        }, 60);
      },
    });
    clearInterval(tick);
    setBeatNow(-1);
    if (!res) {
      setPhase('ready');
      return;
    }
    const tk = res.take;
    setFrames(res.frames);
    setTake(tk);
    setPhase('result');
    piano.cue(tk.grade.unclear ? 'wrong' : tk.grade.score >= lvDef.pass ? 'correct' : 'wrong');
    // A loop is practice: only whole takes count for the level.
    if (!tk.grade.unclear && !loop) {
      // SPEC-MY-SONG: the stored song keeps the singer's last score.
      if (item.song?.mine && mine?.id) void noteSongScore(mine.id, 'voice', tk.grade.score);
      const m: VocalTake['m'] = {};
      for (const x of tk.grade.metrics) if (m[x.key] === undefined) m[x.key] = x.value;
      const vt: VocalTake = { at: new Date().toISOString(), item: item.id, level, score: tk.grade.score, m };
      if (!best.current[item.id] || best.current[item.id].score < tk.grade.score) best.current[item.id] = { score: tk.grade.score, take: vt };
    }
  };
  const finishLevel = async () => {
    const perItem = items.map((it) => ({ it, score: best.current[it.id]?.score ?? 0 }));
    const mean = perItem.reduce((a, x) => a + x.score, 0) / Math.max(1, perItem.length);
    const passed = mean >= lvDef.pass;
    const rated = perItem.filter((x) => best.current[x.it.id]);
    const r: LessonResult = {
      lessonId: `vocal-f-${level}`,
      lessonVersion: 1,
      sessionId,
      completedAt: new Date().toISOString(),
      firstTry: perItem.filter((x) => x.score >= lvDef.pass).length,
      total: perItem.length,
      xp: Math.min(20 * perItem.length, Math.round(rated.reduce((a, x) => a + x.score, 0) * 10) + (passed ? 10 : 0)),
      missed: [],
      items: rated.map((x) => {
        const tg = voiceItemTags(level, x.it);
        return { id: `${sessionId}:${x.it.id}`, skill: tg.skill, difficulty: x.it.difficulty, correct: x.score >= lvDef.pass, tag: `vocal:${x.it.id}`, score: x.score, m: best.current[x.it.id]?.take.m, tags: tg.tags };
      }),
    };
    let rest: string | undefined;
    if (rated.length) {
      const pr = await store.recordVocal(r, Object.values(best.current).map((b) => b.take), { passedLevel: passed ? level : null });
      onProgress(pr);
      const ad = restAdvice(restTakes(pr.vocal?.takes ?? []), new Date());
      if (ad.suggest) rest = ad.tired ? L(VT.restTired) : fill(L(VT.restSuggest), { m: ad.minutes });
    }
    setSummary({ score: mean, passed, rest });
    setPhase('summary');
    piano.cue(passed ? 'complete' : 'correct');
  };

  const next = () => {
    setLoop(null);
    setTake(null);
    setFrames([]);
    if (i < items.length - 1) {
      setI(i + 1);
      setPhase('ready');
    } else void finishLevel();
  };

  if (phase === 'summary' && summary)
    return (
      <main className="panel-screen vocal vtimed">
        <header className="screen-head">
          <h1>{title}</h1>
        </header>
        <section className="vocal-summary" aria-live="polite">
          <div className="big-score">{Math.round(summary.score * 100)}%</div>
          <p>{summary.passed ? L(VT.levelPassed) : fill(L(VT.levelNotYet), { need: Math.round(lvDef.pass * 100) })}</p>
          {summary.rest && <p className="care-note" data-rest-note="1">{summary.rest}</p>}
        </section>
        <button className="btn mega" onClick={onExit}>
          {L(VT.done)}
        </button>
      </main>
    );

  // The first timed take needs the microphone delay (once): calibrate, or skip with the usual 70 ms.
  if (needsTiming && !calDone)
    return (
      <main className="panel-screen vocal vtimed">
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={L(VT.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{L(VT.calTitle)}</h1>
        </header>
        <p className="field-hint">{L(VT.calWhy)}</p>
        <LatencyCalibrate lang={lang} values={{ micLatencyMs: settings.micLatencyMs }} sources={['mic']} initial="mic" onSave={(p) => (onSettings(p), setCalDone(true))} />
        <button className="btn ghost" onClick={() => setCalDone(true)}>
          {L(VT.calSkip)}
        </button>
      </main>
    );

  // F13 L8: the recording is opened first (it stays on the device), then sung with.
  if (item.song?.mine && !mine)
    return (
      <main className="panel-screen vocal vtimed">
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={L(VT.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{title}</h1>
        </header>
        <MySongPick lang={lang} range={range} onReady={(plan, buffer, id) => setMine({ plan, buffer, id })} />
      </main>
    );

  const instr = (() => {
    if (item.kind === 'time') return L(TIME_INSTR[item.time!.feel]);
    if (item.kind === 'scat') return L(SCAT_INSTR[item.scat!.mode]);
    const s = item.song!;
    if (s.mine) return L(SONG_INSTR.mine);
    if (s.rubato) return L(SONG_INSTR.rubato);
    if (s.read) return L(s.read === 'lead' ? SONG_INSTR.readLead : SONG_INSTR.readBand);
    if (s.embellish) return L(SONG_INSTR.embellish);
    if (s.bop) return L(SONG_INSTR.bop);
    if (s.falls) return L(SONG_INSTR.falls);
    if (s.interpretFrom !== undefined) return L(SONG_INSTR.interpretLast);
    const parts = [L(s.band ? SONG_INSTR.band : SONG_INSTR.unacc)];
    if (s.interpret) parts.push(L(SONG_INSTR.interpret));
    if (s.feel === 'behind') parts.push(L(SONG_INSTR.behind));
    if (s.longNotes) parts.push(L(SONG_INSTR[s.longNotes]));
    if (s.chorus) parts.push(L(SONG_INSTR.chorus));
    return parts.join(' ');
  })();
  const songTitle = plan ? `${L(plan.song.title)}${plan.song.form ? ` · ${L(plan.song.form)}` : ''}` : null;
  const shownNotes = plan && span ? plan.notes.filter((n) => n.bar >= span.from && n.bar <= span.to).map((n) => ({ midi: n.midi, start: n.start - span.from * plan.meter * plan.beat, dur: n.dur, degree: 1 })) : null;
  const weak = take?.song ? take.song.phrases.reduce((w, p) => (p.score < w.score ? p : w), take.song.phrases[0]) : null;
  const need = item.song?.need ?? lvDef.pass;
  const busy = phase === 'count' || phase === 'singing';

  return (
    <main className="panel-screen vocal vtimed">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (ctl.current?.abort(), piano.stopAll(), onExit())} aria-label={L(VT.back)}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{title}</h1>
      </header>
      <p className="field-hint">
        {family} · {fill(L(VT.itemOf), { i: i + 1, n: items.length })}
        {songTitle && ` · ${songTitle}`}
        {loop && ` · ${fill(L(VT.phrase), { n: loop.phrase + 1 })} · ${Math.round(loop.scale * 100)}%`}
      </p>
      {phase !== 'result' && <p className="vocal-instr">{instr}</p>}
      {item.kind === 'time' && item.time && <BeatStrip item={item} beatNow={busy ? beatNow : -1} />}
      {item.kind === 'scat' && item.scat && <ChordStrip item={item} tonicPc={tonicPc} beatNow={busy ? beatNow : -1} slots={take?.slots} />}
      {item.song?.read && plan && span && phase !== 'result' ? (
        <ReadSheet plan={plan} span={span} lead={item.song.read === 'lead'} clef={range.low <= 45 ? 'bass' : undefined} lang={lang} />
      ) : shownNotes && shownNotes.length > 0 && phase === 'result' ? (
        <div className="roll-compact">
          <SingRoll notes={shownNotes} frames={frames} now={now} />
        </div>
      ) : (
        shownNotes && shownNotes.length > 0 && <SingRoll notes={shownNotes} frames={frames} now={busy || phase === 'result' ? now : 0} />
      )}
      {phase === 'count' && <p className="vocal-cue vib">{item.time?.call ? L(VT.listenCall) : item.song?.rubato ? L(VT.rubatoGo) : L(VT.countIn)}</p>}
      {phase === 'singing' && item.time?.call && <p className="vocal-cue">{beatNow >= (item.time.answerAt ?? 8) ? L(VT.yourTurn) : L(VT.listenCall)}</p>}
      {phase === 'singing' && item.scat?.mode === 'motif' && <p className="vocal-cue">{beatNow >= MOTIF_ANSWER_AT ? L(VT.yourTurn) : L(VT.motifListen)}</p>}
      {phase === 'singing' && item.scat?.mode === 'trade' && <p className="vocal-cue" data-trade-turn={scatTurns(item).find((x) => beatNow >= x.from && beatNow < x.to)?.who ?? ''}>{scatTurns(item).find((x) => beatNow >= x.from && beatNow < x.to)?.who === 'you' ? L(VT.yourTurn) : L(VT.appTurn)}</p>}
      {phase === 'singing' && item.song?.rubato && <p className="vocal-cue">{L(VT.singing)}</p>}

      {phase === 'result' && take && (
        <section className="take-card vt-result" aria-live="polite">
          {take.grade.unclear ? (
            <p>{L(VT.unclear)}</p>
          ) : (
            <>
              <div className="take-score">
                {L(VT.score)}: <b>{Math.round(take.grade.score * 100)}%</b>
                {take.loop && <small className="field-hint"> · {L(VT.loopNote)}</small>}
              </div>
              {take.song && (
                <ol className="vt-phrases" aria-label={L(VT.phrases)}>
                  {take.song.phrases.map((p) => (
                    <li key={p.i} className={p.score >= need ? 'good' : p.score >= need - 0.2 ? 'fair' : 'weak'}>
                      <span>{fill(L(VT.phrase), { n: p.i + 1 })}</span>
                      <b dir="ltr">{Math.round(p.score * 100)}%</b>
                    </li>
                  ))}
                </ol>
              )}
              <Bars g={take.grade} lang={lang} t={t} />
              <FeelLine take={take} item={item} lang={lang} />
            </>
          )}
        </section>
      )}

      {item.kind !== 'time' && item.song?.band !== false && phase !== 'result' && (
        <label className="toggle-row vt-hp">
          <input
            type="checkbox"
            checked={headphones}
            disabled={busy}
            onChange={(e) => {
              setHeadphones(e.target.checked);
              try {
                localStorage.setItem(HP_KEY, e.target.checked ? '1' : '0');
              } catch {
                /* private mode */
              }
            }}
          />
          <span>
            <Icon k="phones" /> {L(VT.headphones)}
          </span>
        </label>
      )}
      {item.kind === 'song' && item.song?.band && headphones && !item.song.recital && !item.song.read && !item.song.rubato && !item.song.mine && (
        <label className="toggle-row vt-hp">
          <input type="checkbox" checked={guide} disabled={busy} onChange={(e) => setGuide(e.target.checked)} />
          <span>{L(VT.guide)}</span>
        </label>
      )}

      <div className="vocal-actions">
        {phase === 'ready' && item.song?.mine && !headphones && <p className="field-hint">{L(VT.mineNeedsHp)}</p>}
        {phase === 'ready' && (
          <button className="btn mega" disabled={!!item.song?.mine && !headphones} onClick={() => void run()}>
            <Icon k="mic" /> {L(VT.sing)}
          </button>
        )}
        {busy && (
          <button className="btn mega ghost" onClick={() => ((stopped.current = phase === 'singing'), ctl.current?.abort())}>
            ■ {L(VT.stop)}
          </button>
        )}
        {phase === 'result' && take && (
          <>
            {/* Songs: loop the weakest phrase slower, then at full tempo, then the whole song again (piece-coach ladder). */}
            {take.song && !item.song?.recital && !item.song?.rubato && !item.song?.mine && !loop && weak && weak.score < need && plan && plan.phrases.length > 1 && (
              <button className="btn ghost" onClick={() => (setLoop({ phrase: weak.i, scale: 0.9 }), setPhase('ready'))}>
                ↻ {fill(L(VT.loopWeak), { n: weak.i + 1 })}
              </button>
            )}
            {loop && take.song && (take.song.phrases[0]?.score ?? 0) >= need && loop.scale < 1 && (
              <button className="btn ghost" onClick={() => (setLoop({ ...loop, scale: 1 }), setPhase('ready'))}>
                ↻ {fill(L(VT.loopFull), { n: loop.phrase + 1 })}
              </button>
            )}
            {loop && (
              <button className="btn ghost" onClick={() => (setLoop(null), setPhase('ready'), setTake(null))}>
                ↻ {L(VT.wholeAgain)}
              </button>
            )}
            {!loop && !item.song?.recital && (
              <button className="btn ghost" onClick={() => void run()}>
                ↻ {L(VT.retry)}
              </button>
            )}
            <button className="btn mega" onClick={next}>
              {i === items.length - 1 ? L(VT.done) : L(VT.next)} <span className="flip-rtl">→</span>
            </button>
          </>
        )}
      </div>
      {item.kind === 'song' && phase !== 'result' && item.song?.read && plan && <p className="field-hint vt-foot">{fill(L(VT.readTempo), { bpm: plan.bpm })}</p>}
      {item.kind === 'song' && !item.song?.read && <p className="field-hint vt-foot">{item.song?.recital ? L(VT.recital) : item.song?.band === false ? L(VT.keyOnly) : fill(L(VT.needEvery), { p: Math.round(need * 100) })}</p>}
      {item.kind === 'scat' && <p className="field-hint vt-foot">{L(VT.notMeasured)}</p>}
      {plan && <span className="sr-only" dir="ltr">{noteLabel(plan.tonic, settings)}</span>}
    </main>
  );
}

// ---------------------------------------------------------------- one timed take (the session and the probe)

/** The song plan and the bars of a song item (a loop of one phrase, or the item's phrases). */
export function songSpan(item: VocalItem, range: VoiceRange, loop: { phrase: number; scale: number } | null) {
  if (item.kind !== 'song' || !item.song) return { plan: null, span: null };
  const s = voiceSong(item.song.id);
  if (!s) return { plan: null, span: null };
  const plan = songPlan(s, range, Math.round((item.song.bpm ?? s.bpm) * (loop?.scale ?? 1)));
  if (loop) {
    const ph = plan.phrases[loop.phrase];
    return { plan, span: { from: ph.fromBar, to: ph.toBar } };
  }
  const [a, b] = item.song.phrases ?? [0, plan.phrases.length - 1];
  return { plan, span: { from: plan.phrases[a].fromBar, to: plan.phrases[Math.min(b, plan.phrases.length - 1)].toBar } };
}

/**
 * Play what a timed item needs (clicks, the band, the key) and capture the voice on the clock of the first sung beat,
 * the microphone delay removed; then grade it. Null when it was cancelled.
 */
export async function captureTimed(a: {
  item: VocalItem;
  plan: SongPlan | null;
  span: { from: number; to: number } | null;
  range: VoiceRange;
  tonicPc: number;
  settings: Settings;
  headphones: boolean;
  guide: boolean;
  loop: { phrase: number; scale: number } | null;
  signal: AbortSignal;
  stopped: { current: boolean };
  onFrames: (f: SungFrame[]) => void;
  onClock: (zeroPerfMs: number, beatSec: number) => void;
  /** F13 L8: the singer's recording (played instead of the band). */
  mine?: AudioBuffer | null;
}): Promise<{ frames: SungFrame[]; take: Take } | null> {
  const { item, plan, span, range, tonicPc, settings, headphones } = a;
  // An inner signal: the follower (colla voce) ends the take itself when the last note is reached.
  const inner = new AbortController();
  if (a.signal.aborted) inner.abort();
  a.signal.addEventListener('abort', () => inner.abort());
  const signal = inner.signal;
  const endTake = () => {
    a.stopped.current = true;
    inner.abort();
  };
  /** Called with every frame on the take's clock (live behaviour: the trading replies, the colla voce band). */
  let live: ((f: SungFrame, buf: SungFrame[]) => void) | null = null;
  await piano.unlock();
  const lat = (settings.micLatencyMs ?? 70) / 1000;
  let events: NoteEvent[] = [];
  let lead = 0;
  let length = 0;
  let gatePitches: number[] = [];
  let beat = 0.5;
  if (item.kind === 'time' && item.time) {
    const ts = item.time;
    beat = 60 / ts.bpm;
    lead = ts.meter * beat;
    const note = atRange(range, 0.4);
    for (let k = 0; k < ts.meter; k++) events.push({ midi: 0, start: k * beat, duration: 0.05, velocity: 0.8, perc: 'wood' });
    for (let b = 0; b < ts.bars * ts.meter; b++) {
      if (ts.silent && b >= ts.silent[0] && b < ts.silent[1]) continue;
      if (ts.clickOn && !ts.clickOn.includes(b % ts.meter)) continue;
      events.push({ midi: 0, start: lead + b * beat, duration: 0.05, velocity: b % ts.meter === 0 ? 0.7 : 0.5, perc: b % ts.meter === 0 ? 'accent' : 'click' });
    }
    for (const x of ts.call ?? []) events.push({ midi: note, start: lead + x * beat, duration: beat * 0.4, velocity: 0.7 });
    length = lead + ts.bars * ts.meter * beat + 0.6;
  } else if (item.kind === 'song' && plan && span && item.song?.mine) {
    beat = plan.beat;
    length = Math.min(a.mine?.duration ?? 60, 75) + 0.6;
  } else if (item.kind === 'song' && plan && span && item.song?.rubato) {
    // Colla voce: the first note and the first chord, then the band waits for the singer (no count-in, no clock).
    const sel = plan.notes.filter((n) => n.bar >= span.from && n.bar <= span.to);
    beat = plan.beat;
    lead = 1.2;
    events = [{ midi: sel[0].midi, start: 0, duration: 0.9, velocity: 0.6 }, ...padAt(plan, span.from, 1.0, 4)];
    length = sel.reduce((x, n) => x + n.dur, 0) * 2 + 8;
    gatePitches = [...new Set(plan.chartBars.flatMap((_, b) => padAt(plan, b, 0, 1).map((e) => e.midi)))];
    const fw = new Follower(sel.map((n) => n.midi));
    let doneAt = 0;
    live = (f) => {
      const k = fw.push(f);
      if (k !== null && k > 0 && sel[k].bar !== sel[k - 1].bar) void piano.play(padAt(plan, sel[k].bar, 0, 3.6), 4, signal).catch(() => {});
      if (fw.done && !doneAt) doneAt = f.t;
      if (doneAt && f.t - doneAt > 1.4) endTake();
    };
  } else if (item.kind === 'song' && plan && span && item.song) {
    const b = songBacking(plan, { fromBar: span.from, toBar: span.to, band: item.song.band, guide: a.guide && headphones });
    events = b.events;
    lead = b.lead;
    length = b.length + 0.8;
    beat = plan.beat;
    gatePitches = [...new Set(events.filter((e) => !e.perc).map((e) => e.midi))];
  } else if (item.kind === 'scat' && item.scat) {
    const sc = item.scat;
    beat = 60 / sc.bpm;
    const p = parseChart(transposeChart(sc.chart, tonicPc), 4);
    const bk = chartBacking(p, sc.style, sc.bpm, sc.loops ?? 1, 4, { countIn: true });
    events = bk.events;
    lead = bk.startBeat * beat;
    length = bk.length + 0.8;
    const centre = scatCentre(tonicPc, undefined, atRange(range, 0.45));
    const sw = (b: number) => (sc.style === 'swing' && Math.abs(b - Math.floor(b) - 0.5) < 1e-6 ? Math.floor(b) + 2 / 3 : b);
    const line = (ns: PNote[], from: number) => ns.map((n) => ({ midi: n.midi, start: lead + sw(from + n.beat) * beat, duration: Math.max(0.1, n.dur * beat * 0.9), velocity: 0.66 }));
    if (sc.mode === 'motif') events = [...events, ...line(motifCell(item, centre), 0)];
    if (sc.mode === 'trade') {
      const ch = scatChart(item, tonicPc);
      const turns = scatTurns(item);
      const tb = (sc.turn ?? 4) * 4;
      events = [...events, ...line(tradeOpening(ch.pcsAt, centre, turns[0].from, tb), turns[0].from)];
      const sent = new Set<number>();
      // Each app turn after the first answers the singer's last turn: the reply is computed a moment before the turn.
      live = (f, buf) => {
        const now = f.t + lat;
        for (const [k, t] of turns.entries()) {
          if (t.who !== 'app' || k === 0 || sent.has(k) || now < t.from * beat - 0.3 || now > t.from * beat) continue;
          sent.add(k);
          const prev = turns[k - 1];
          const sung = sungLine(buf, beat, prev.from * beat, t.from * beat);
          const reply = tradeReply(sung, centre, tb, () => tradeOpening(ch.pcsAt, centre, t.from, tb));
          const clockNow = (piano.heardTime((piano.audioNow() ?? 0) + 0.06) - zero) / 1000;
          const evs = line(reply, t.from).map((e) => ({ ...e, start: e.start - lead - clockNow })).filter((e) => e.start >= 0);
          if (evs.length) void piano.play(evs, tb * beat + 0.5, signal).catch(() => {});
        }
      };
    }
    gatePitches = [...new Set(events.filter((e) => !e.perc).map((e) => e.midi))];
  }
  const buf: SungFrame[] = [];
  const gate = !headphones && gatePitches.length ? new BleedGate(gatePitches) : null;
  let calibrated = false;
  let zero = 0;
  let got: SungFrame[] = [];
  if (SIMULATED) {
    zero = performance.now() + 400;
    a.onClock(zero, beat);
    got = simulate(item, plan, span, range, tonicPc);
    await new Promise((r) => setTimeout(r, 1200));
  } else {
    let started: () => void = () => {};
    const ready = new Promise<void>((r) => (started = r));
    const cap = new BrowserPitchCapture().sing({
      signal,
      maxMs: (length + 1) * 1000,
      silenceMs: 600_000,
      endSilenceMs: 600_000,
      hopMs: 20,
      record: true,
      onCapturing: () => started(),
      onFrame: (raw) => {
        if (!zero) return; // the clock starts with the playback
        const tt = (performance.now() - zero) / 1000 - lat;
        let f: SungFrame = { ...raw, t: tt };
        if (gate) {
          if (tt < 0) gate.calibrate(f);
          else {
            if (!calibrated) {
              gate.finishCalibration();
              calibrated = true;
            }
            f = gate.pass(f);
          }
        }
        if (tt >= -0.2) buf.push(f);
        if (live && tt >= 0) live(f, buf);
        if (buf.length % 4 === 0) a.onFrames(buf.slice());
      },
    });
    await ready;
    if (signal.aborted) return null;
    let own: AudioContext | null = null;
    if (a.mine) {
      // The singer's recording on its own audio clock: zero = the moment its first sample is heard.
      own = new AudioContext();
      const src = own.createBufferSource();
      src.buffer = a.mine;
      src.connect(own.destination);
      const startAt = own.currentTime + 0.15;
      src.start(startAt);
      zero = performance.now() + 150 + ((own as AudioContext & { outputLatency?: number }).outputLatency ?? own.baseLatency ?? 0) * 1000;
      signal.addEventListener('abort', () => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      });
    } else zero = piano.heardTime((piano.audioNow() ?? 0) + 0.06) + lead * 1000;
    a.onClock(zero, beat);
    if (events.length) void piano.play(events, length, signal).catch(() => {});
    const r = await cap;
    piano.stopAll();
    void own?.close().catch(() => {});
    if (r.kind === 'aborted' && !a.stopped.current) return null;
    got = buf;
    if (r.kind === 'frames' && r.audio && settings.keepTakes && !a.loop) void keepTake({ item: item.id, week: weekId(new Date()), score: 0, at: new Date().toISOString(), blob: r.audio });
  }
  piano.stopAll();
  let take: Take;
  if (item.kind === 'time') {
    const res = gradeTime(item, voiceOnsets(got));
    take = { grade: res.grade, feel: res.feel, swing: res.swing };
  } else if (item.kind === 'song' && plan && span && item.song?.rubato) {
    const res = gradeRubatoSong(item, got, plan, span.from, span.to);
    take = { grade: res.grade, song: res.song, follow: res.follow };
  } else if (item.kind === 'song' && plan && span) {
    const res = gradeSong(item, got, plan, span.from, span.to);
    take = { grade: res.grade, song: res.song, feel: res.song.feel, loop: a.loop ?? undefined, ...(item.song?.falls ? { falls: phraseFalls(got, plan, span.from, span.to) } : {}) };
  } else {
    const res = gradeScat(item, got, tonicPc);
    take = { grade: res.grade, slots: res.slots, kinds: res.kinds, turns: res.turns };
  }
  return { frames: got, take };
}
/** The bar(s) of a time item: one cell per eighth, the targets marked, the current beat lit. */
function BeatStrip({ item, beatNow }: { item: VocalItem; beatNow: number }) {
  const ts = item.time!;
  const beats = ts.bars * ts.meter;
  const marks = new Set((ts.written ?? ts.hits).map((h) => Math.round(h * 6)));
  const cells = Array.from({ length: beats * 2 }, (_, k) => k);
  return (
    <div className="vt-strip" dir="ltr" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${Math.min(16, beats * 2)}, 1fr)` }}>
      {cells.map((k) => {
        const b = k / 2;
        const on = [...marks].some((m) => m >= k * 3 && m < k * 3 + 3);
        const silent = ts.silent && b >= ts.silent[0] && b < ts.silent[1];
        const call = ts.call && b < (ts.answerAt ?? 8);
        return <span key={k} className={`${on ? 'hit' : ''} ${k % 2 === 0 ? 'beat' : ''} ${silent ? 'silent' : ''} ${call ? 'call' : ''} ${Math.floor(b) === beatNow ? 'now' : ''} ${k % (ts.meter * 2) === 0 ? 'bar' : ''}`} />;
      })}
    </div>
  );
}

/** The chords of a scat item, the current one lit; guide-tone slots coloured after the take. */
function ChordStrip({ item, tonicPc, beatNow, slots }: { item: VocalItem; tonicPc: number; beatNow: number; slots?: ('ok' | 'off' | null)[] }) {
  const bars = transposeChart(item.scat!.chart, tonicPc).split('|').map((b) => b.trim());
  return (
    <ol className="vt-chords" dir="ltr">
      {bars.map((b, k) => (
        <li key={k} className={`${Math.floor(beatNow / 4) % bars.length === k && beatNow >= 0 ? 'now' : ''} ${slots ? (slots.slice(k * 2, k * 2 + 2).every((x) => x === 'ok') ? 'ok' : slots.slice(k * 2, k * 2 + 2).some((x) => x === 'ok') ? 'half' : 'off') : ''}`}>
          {b}
        </li>
      ))}
    </ol>
  );
}

function Bars({ g, lang, t }: { g: TakeGrade; lang: Lang; t: Strings }) {
  const shown = [...g.metrics].filter((m) => m.weight >= 0.5).sort((a, b) => b.weight - a.weight).filter((m, i, a) => a.findIndex((x) => x.key === m.key) === i).slice(0, 4);
  const name = (k: string) => METRIC_NAMES[k]?.[lang] ?? (t.metricNames as Record<string, string>)[k] ?? k;
  return (
    <ul className="metric-bars">
      {shown.map((m) => (
        <li key={m.key} className={m.score >= 0.8 ? 'good' : m.score >= 0.5 ? 'fair' : 'weak'}>
          <span className="metric-name">{name(m.key)}</span>
          <span className="metric-val" dir="ltr">
            {m.key === 'swing' ? `${m.value} : 1` : m.key === 'tensions' ? `${m.value} / 3` : m.unit === '%' ? `${Math.round(m.value)}%` : `${m.value > 0 && m.unit !== 'dB' ? '+' : ''}${m.value} ${m.unit === 'ms' ? 'ms' : m.unit}`}
          </span>
          <span className="metric-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(m.score * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One plain line about the feel, the swing, the drift or the landing. */
function FeelLine({ take, item, lang }: { take: Take; item: VocalItem; lang: Lang }) {
  const L = (b: { en: string; he: string }) => b[lang];
  const lines: string[] = [];
  if (take.swing && item.time) {
    const [lo, hi] = swingBand(item.time.bpm);
    lines.push(fill(L(VT.swingRatio), { r: take.swing.ratio, lo, hi }));
  } else if (take.feel && take.feel.n > 0 && (item.kind === 'time' || item.song?.feel || item.song?.rhythm)) {
    const v = feelVerdict(take.feel);
    lines.push(`${L(VT.feel[v])} · ${fill(L(VT.meanLate), { ms: Math.abs(take.feel.meanMs), dir: take.feel.meanMs >= 0 ? L(VT.late) : L(VT.early), sd: take.feel.sdMs })}`);
  }
  if (take.song?.drift && item.song?.drift) lines.push(fill(L(VT.driftLine), { d: take.song.drift.drift, e: take.song.drift.medianError }));
  if (take.song?.chorusDb !== null && take.song?.chorusDb !== undefined && item.song?.chorus) lines.push(fill(L(VT.chorusLine), { db: take.song.chorusDb }));
  if (take.slots) lines.push(fill(L(VT.guideSlots), { k: take.slots.filter((x) => x === 'ok').length, n: take.slots.length }));
  if (take.kinds) lines.push(take.kinds.length ? fill(L(VT.motifKinds), { k: take.kinds.map((k) => L(MOTIF_KIND_NAMES[k] ?? { en: k, he: k })).join(', ') }) : L(VT.motifNone));
  if (take.turns) lines.push(fill(L(VT.turnsLine), { n: take.turns.join(' · ') }));
  if (take.follow !== undefined) lines.push(fill(L(VT.followLine), { p: Math.round(take.follow * 100) }));
  if (take.falls) lines.push(fill(L(VT.fallsLine), { k: take.falls.falls, n: take.falls.phrases }));
  return lines.length ? (
    <p className="take-remark">
      <Icon k="target" /> {lines.join(' · ')}
    </p>
  ) : null;
}

// ---------------------------------------------------------------- the simulator (screenshots, e2e)

function simulate(item: VocalItem, plan: SongPlan | null, span: { from: number; to: number } | null, range: VoiceRange, tonicPc: number): SungFrame[] {
  if (item.kind === 'time' && item.time) {
    const ts = item.time;
    const beat = 60 / ts.bpm;
    const at = (ts.written ?? ts.hits).map((h, k) => h * beat + (ts.feel === 'behind' ? 0.07 : ts.feel === 'back' && k < (ts.written?.length ?? 0) - 1 ? beat * 0.7 : 0));
    return synthDahs(at, atRange(range, 0.4), { len: Math.min(0.2, beat * 0.22), end: (ts.bars * ts.meter + 1) * beat });
  }
  if (item.kind === 'song' && plan && span) {
    const base = span.from * plan.meter * plan.beat;
    const sel = plan.notes.filter((n) => n.bar >= span.from && n.bar <= span.to).map((n) => ({ ...n, start: n.start - base }));
    if (item.song?.rubato) return synthRubato(sel.map((n) => n.midi), sel.map((n) => n.dur * 1.15));
    if (item.song?.embellish) return synthLine(sel.flatMap((n) => (n.dur >= plan.beat * 0.99 ? [{ ...n, dur: n.dur / 2 }, { ...n, midi: n.midi + 2, start: n.start + n.dur / 2, dur: n.dur / 4 }, { ...n, start: n.start + (3 * n.dur) / 4, dur: n.dur / 4 }] : [n])));
    const f = synthLine(sel);
    if (item.song?.bop) return f.map((x) => ({ ...x, rms: x.hz && x.rms > 0.05 && (x.t / plan.beat) % 1 > 0.55 && (x.t / plan.beat) % 1 < 0.8 ? 0.2 : x.rms }));
    if (item.song?.falls) {
      const ends = plan.phrases.filter((ph) => ph.toBar >= span.from && ph.fromBar <= span.to && ph.notes.length).map((ph) => plan.notes[ph.notes[ph.notes.length - 1]]).map((n) => ({ end: n.start + n.dur - base, midi: n.midi }));
      return f.map((x) => {
        const e = ends.find((y) => x.t >= y.end - 0.3 && x.t < y.end);
        return e && x.hz ? { ...x, hz: 440 * 2 ** ((e.midi - (x.t - (e.end - 0.3)) * 10 - 69) / 12) } : x;
      });
    }
    return f;
  }
  if (item.kind === 'scat' && item.scat?.mode === 'trade') return synthTrade(scatTurns(item), scatChart(item, tonicPc).pcsAt, item.scat.bpm, atRange(range, 0.45));
  if (item.kind === 'scat' && item.scat?.mode === 'motif') {
    const beat = 60 / item.scat.bpm;
    const cell = motifCell(item, scatCentre(tonicPc, undefined, atRange(range, 0.45)));
    // Repeated (displaced by a bar), then sequenced a step up: two developments.
    const notes = [...cell.map((n) => ({ midi: n.midi, start: (n.beat + 8) * beat, dur: n.dur * beat * 0.8 })), ...cell.map((n) => ({ midi: n.midi + 2, start: (n.beat + 16) * beat, dur: n.dur * beat * 0.8 })), ...cell.map((n) => ({ midi: n.midi, start: (n.beat + 25) * beat, dur: n.dur * beat * 0.8 }))];
    return synthLine(notes);
  }
  if (item.kind === 'scat' && item.scat) {
    const ch = scatChart(item, tonicPc);
    const beat = 60 / item.scat.bpm;
    const mid = atRange(range, 0.45);
    const near = (pc: number) => mid + ((((pc - mid) % 12) + 18) % 12) - 6;
    const notes = [];
    for (let b = 0; b < ch.beats; b += item.scat.mode === 'guide' ? 2 : 1) {
      const c = chordAtBeat(ch.parsed, 4, b);
      const ten = item.scat.mode === 'tensions' && b % 2 === 0 && c && c.iv.includes(10) ? [(c.root + 2) % 12] : null;
      const pcs = ten ?? (item.scat.mode === 'guide' ? ch.guideAt(b) : ch.pcsAt(b));
      notes.push({ midi: near(pcs[item.scat.mode === 'guide' ? (b / 2) % 2 : 1] ?? pcs[0]), start: b * beat, dur: (item.scat.mode === 'guide' ? 2 : 1) * beat * 0.9 });
    }
    return synthLine(notes);
  }
  return [];
}

/** A sustained chord of one bar (colla voce): the chart's first chord in the bar, mid register, with a bass root. */
function padAt(plan: SongPlan, bar: number, start: number, dur: number): NoteEvent[] {
  const text = plan.chartBars.slice(0, bar + 1).reverse().find((b) => b && b !== '%') ?? 'C';
  const c = parseChart(text.split(/\s+/)[0], 4).chords[0];
  if (!c) return [];
  const notes = c.iv.slice(0, 4).map((x) => 52 + ((c.root + x - 52 + 120) % 12));
  return [...notes.map((m) => ({ midi: m, start, duration: dur, velocity: 0.38 })), { midi: 36 + ((c.root - 36 + 120) % 12), start, duration: dur, velocity: 0.5, inst: 'bass' as const }];
}

/** F9 L8–L9: the melody on the staff (four bars a line), the chord symbols above each bar on a lead sheet. */
function ReadSheet({ plan, span, lead, clef, lang }: { plan: SongPlan; span: { from: number; to: number }; lead: boolean; clef?: 'bass'; lang: Lang }) {
  const all = sheetNotes(plan.song, plan.tonic).filter((n) => n.bar >= span.from && n.bar <= span.to);
  const minor = !!plan.song.minor;
  const keyName = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][(((plan.tonic + (minor ? 3 : 0)) % 12) + 12) % 12];
  const lines: (typeof all)[] = [];
  for (const n of all) {
    const k = Math.floor((n.bar - span.from) / 4);
    (lines[k] ??= []).push(n);
  }
  return (
    <div className="vt-sheet" dir="ltr" aria-label={lang === 'he' ? 'תווים' : 'Score'}>
      {lines.map((ln, k) => (
        <div key={k} className="vt-sheet-line">
          {lead && (
            <ol className="vt-sheet-chords">
              {[0, 1, 2, 3].map((b) => {
                const bar = span.from + k * 4 + b;
                return bar <= span.to ? <li key={b}>{plan.chartBars[bar] === '%' ? '' : plan.chartBars[bar]}</li> : null;
              })}
            </ol>
          )}
          <NoteStaff notes={ln.map((n) => n.midi)} chord={false} keyPc={pc(keyName)} durs={ln.map((n) => n.beats)} rests={ln.map((n) => n.rest)} ties={ln.map((n, i) => n.tie && i < ln.length - 1)} meter={plan.meter} timeSig={k === 0} clef={clef} />
        </div>
      ))}
    </div>
  );
}
