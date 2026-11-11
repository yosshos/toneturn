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
import { chartBacking, parseChart, transposeChart } from '../engine/charts';
import { songBacking, songPlan, voiceSong, type SongGrade, type SongPlan } from '../engine/voiceSongs';
import { feelVerdict, swingBand, synthDahs, synthLine, voiceOnsets, type TimeFeel } from '../engine/voiceTime';
import { gradeScat, gradeSong, gradeTime, scatChart } from '../engine/voiceGrade';
import { familyOfRef, NEW_LEVEL_NAMES, vocalLevelByRef, voiceItemTags } from '../engine/voiceFamilies';
import { METRIC_NAMES, SCAT_INSTR, SONG_INSTR, TIME_INSTR, VT } from '../content/voiceCourseText';
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
  const [summary, setSummary] = useState<{ score: number; passed: boolean } | null>(null);
  const best = useRef<Record<string, { score: number; take: VocalTake }>>({});
  const ctl = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  const sessionId = useMemo(() => `vocal-${level}-${Date.now().toString(36)}`, [level]);
  const item = items[i];
  const lvDef = vocalLevelByRef(level);
  useEffect(() => () => (ctl.current?.abort(), piano.stopAll()), []);

  // The song plan in the singer's range (tempo of the item, or slower in a loop).
  const plan: SongPlan | null = useMemo(() => {
    if (item?.kind !== 'song' || !item.song) return null;
    const s = voiceSong(item.song.id);
    if (!s) return null;
    const bpm = Math.round((item.song.bpm ?? s.bpm) * (loop?.scale ?? 1));
    return songPlan(s, range, bpm);
  }, [item, range, loop]);
  const span = useMemo(() => {
    if (!plan || !item.song) return null;
    if (loop) {
      const ph = plan.phrases[loop.phrase];
      return { from: ph.fromBar, to: ph.toBar };
    }
    const [a, b] = item.song.phrases ?? [0, plan.phrases.length - 1];
    return { from: plan.phrases[a].fromBar, to: plan.phrases[Math.min(b, plan.phrases.length - 1)].toBar };
  }, [plan, item, loop]);
  const tonicPc = useMemo(() => ((atRange(range, 0.35) % 12) + 12) % 12, [range]);
  const needsTiming = item?.kind === 'time' || (item?.kind === 'song' && (item.song?.rhythm || item.song?.feel || item.song?.interpret)) || item?.kind === 'scat';

  if (!item || !lvDef) return null;
  const title = `${L(familyOfRef(level)?.title ?? { en: '', he: '' })} · ${L(NEW_LEVEL_NAMES[level] ?? { en: String(level), he: String(level) })}`;

  const run = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    stopped.current = false;
    setTake(null);
    setFrames([]);
    setNow(0);
    await piano.unlock();
    const lat = (settings.micLatencyMs ?? 70) / 1000;
    // ---- what the app plays
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
        if (ts.call && b >= (ts.answerAt ?? 8)) continue;
        events.push({ midi: 0, start: lead + b * beat, duration: 0.05, velocity: b % ts.meter === 0 ? 0.7 : 0.5, perc: b % ts.meter === 0 ? 'accent' : 'click' });
      }
      for (const x of ts.call ?? []) events.push({ midi: note, start: lead + x * beat, duration: beat * 0.4, velocity: 0.7 });
      length = lead + ts.bars * ts.meter * beat + 0.6;
    } else if (item.kind === 'song' && plan && span && item.song) {
      const b = songBacking(plan, { fromBar: span.from, toBar: span.to, band: item.song.band, guide: guide && headphones });
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
      gatePitches = [...new Set(events.filter((e) => !e.perc).map((e) => e.midi))];
    }
    // ---- capture, on the clock of the first sung beat
    const buf: SungFrame[] = [];
    const gate = !headphones && gatePitches.length ? new BleedGate(gatePitches) : null;
    let calibrated = false;
    let zero = 0;
    setPhase('count');
    let got: SungFrame[] = [];
    const tick = setInterval(() => {
      const s = (performance.now() - zero) / 1000;
      setNow(s);
      setBeatNow(Math.floor(s / beat));
      if (s >= 0) setPhase((p) => (p === 'count' ? 'singing' : p));
    }, 60);
    if (SIMULATED) {
      zero = performance.now() + 400;
      got = simulate(item, plan, span, range, tonicPc);
      await new Promise((r) => setTimeout(r, 1200));
      setFrames(got);
    } else {
      let started: () => void = () => {};
      const ready = new Promise<void>((r) => (started = r));
      const cap = new BrowserPitchCapture().sing({
        signal: c.signal,
        maxMs: (length + 1) * 1000,
        silenceMs: 600_000,
        endSilenceMs: 600_000,
        hopMs: 20,
        record: true,
        onCapturing: () => started(),
        onFrame: (raw) => {
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
          if (buf.length % 4 === 0) setFrames(buf.slice());
        },
      });
      await ready;
      if (c.signal.aborted) return;
      zero = piano.heardTime((piano.audioNow() ?? 0) + 0.06) + lead * 1000;
      void piano.play(events, length, c.signal).catch(() => {});
      const r = await cap;
      if (r.kind === 'aborted' && !stopped.current) {
        clearInterval(tick);
        piano.stopAll();
        setPhase('ready');
        return;
      }
      got = buf;
      if (r.kind === 'frames' && r.audio && settings.keepTakes && !loop) void keepTake({ item: item.id, week: weekId(new Date()), score: 0, at: new Date().toISOString(), blob: r.audio });
    }
    clearInterval(tick);
    piano.stopAll();
    setFrames(got);
    setBeatNow(-1);
    // ---- grade
    let tk: Take;
    if (item.kind === 'time') {
      const res = gradeTime(item, voiceOnsets(got));
      tk = { grade: res.grade, feel: res.feel, swing: res.swing };
    } else if (item.kind === 'song' && plan && span) {
      const res = gradeSong(item, got, plan, span.from, span.to);
      tk = { grade: res.grade, song: res.song, feel: res.song.feel, loop: loop ?? undefined };
    } else {
      const res = gradeScat(item, got, tonicPc);
      tk = { grade: res.grade, slots: res.slots };
    }
    setTake(tk);
    setPhase('result');
    piano.cue(tk.grade.unclear ? 'wrong' : tk.grade.score >= lvDef.pass ? 'correct' : 'wrong');
    // A loop is practice: only whole takes count for the level.
    if (!tk.grade.unclear && !loop) {
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
    if (rated.length) onProgress(await store.recordVocal(r, Object.values(best.current).map((b) => b.take), { passedLevel: passed ? level : null }));
    setSummary({ score: mean, passed });
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

  const instr = (() => {
    if (item.kind === 'time') return L(TIME_INSTR[item.time!.feel]);
    if (item.kind === 'scat') return L(SCAT_INSTR[item.scat!.mode]);
    const s = item.song!;
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
        {fill(L(VT.itemOf), { i: i + 1, n: items.length })}
        {songTitle && ` · ${songTitle}`}
        {loop && ` · ${fill(L(VT.phrase), { n: loop.phrase + 1 })} · ${Math.round(loop.scale * 100)}%`}
      </p>
      <p className="vocal-instr">{instr}</p>
      {item.kind === 'time' && item.time && <BeatStrip item={item} beatNow={busy ? beatNow : -1} />}
      {item.kind === 'scat' && item.scat && <ChordStrip item={item} tonicPc={tonicPc} beatNow={busy ? beatNow : -1} slots={take?.slots} />}
      {shownNotes && shownNotes.length > 0 && <SingRoll notes={shownNotes} frames={frames} now={busy || phase === 'result' ? now : 0} />}
      {phase === 'count' && <p className="vocal-cue vib">{item.time?.call ? L(VT.listenCall) : L(VT.countIn)}</p>}
      {phase === 'singing' && item.time?.call && <p className="vocal-cue">{beatNow >= (item.time.answerAt ?? 8) ? L(VT.yourTurn) : L(VT.listenCall)}</p>}

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

      {item.kind !== 'time' && (
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
      {item.kind === 'song' && item.song?.band && headphones && !item.song.recital && (
        <label className="toggle-row vt-hp">
          <input type="checkbox" checked={guide} disabled={busy} onChange={(e) => setGuide(e.target.checked)} />
          <span>{L(VT.guide)}</span>
        </label>
      )}

      <div className="vocal-actions">
        {phase === 'ready' && (
          <button className="btn mega" onClick={() => void run()}>
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
            {take.song && !item.song?.recital && !loop && weak && weak.score < need && plan && plan.phrases.length > 1 && (
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
      {item.kind === 'song' && <p className="field-hint vt-foot">{item.song?.recital ? L(VT.recital) : item.song?.band === false ? L(VT.keyOnly) : fill(L(VT.needEvery), { p: Math.round(need * 100) })}</p>}
      {item.kind === 'scat' && <p className="field-hint vt-foot">{L(VT.notMeasured)}</p>}
      {plan && <span className="sr-only" dir="ltr">{noteLabel(plan.tonic, settings)}</span>}
    </main>
  );
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
            {m.key === 'swing' ? `${m.value} : 1` : m.unit === '%' ? `${Math.round(m.value)}%` : `${m.value > 0 && m.unit !== 'dB' ? '+' : ''}${m.value} ${m.unit === 'ms' ? 'ms' : m.unit}`}
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
    return synthLine(plan.notes.filter((n) => n.bar >= span.from && n.bar <= span.to).map((n) => ({ ...n, start: n.start - base })));
  }
  if (item.kind === 'scat' && item.scat) {
    const ch = scatChart(item, tonicPc);
    const beat = 60 / item.scat.bpm;
    const mid = atRange(range, 0.45);
    const near = (pc: number) => mid + ((((pc - mid) % 12) + 18) % 12) - 6;
    const notes = [];
    for (let b = 0; b < ch.beats; b += item.scat.mode === 'guide' ? 2 : 1) {
      const pcs = item.scat.mode === 'guide' ? ch.guideAt(b) : ch.pcsAt(b);
      notes.push({ midi: near(pcs[item.scat.mode === 'guide' ? (b / 2) % 2 : 1] ?? pcs[0]), start: b * beat, dur: (item.scat.mode === 'guide' ? 2 : 1) * beat * 0.9 });
    }
    return synthLine(notes);
  }
  return [];
}
