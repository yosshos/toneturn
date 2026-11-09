// Play & improvise (spec V.4–V.7): play-along backing tracks, guided improvisation over a chart, MIDI
// keyboard drills (with an on-screen keyboard when there is no MIDI device), guitar from tab.

import { Icon } from './icons';
import { useMiniGate } from './MiniLesson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { clockEvents, clockPlan, clockReport, type ClockReport } from '../engine/perform';
import { backingPitches, backingTrack, chartBeats, CHARTS, checkVoicing, chordAt, chordSymbol, CIRCLE_KEYS, hasGuideTones, improvReport, QUALITY, scaleEvenness, synthImprov, type ChartId, type ImprovReport, type Quality, type VoicingKind } from '../engine/perform';
import { BleedGate } from '../engine/bleed';
import type { SungFrame } from '../engine/sing';
import { gradeTake, itemTargets, sightKeyName, SIGHT_LEVELS, synthMelody, type TakeGrade } from '../engine/vocal';
import { pc } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Progress, Settings } from '../storage/progress';
import { NotesView } from './NotesView';
import { piano, SIMULATED, store } from './services';

type Tab = 'backing' | 'improv' | 'clock' | 'midi' | 'guitar';
const KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function useHeadphones(): [boolean, (v: boolean) => void] {
  const [h, setH] = useState(() => {
    try {
      return localStorage.getItem('toneturn.headphones') === '1';
    } catch {
      return false;
    }
  });
  return [
    h,
    (v) => {
      setH(v);
      try {
        localStorage.setItem('toneturn.headphones', v ? '1' : '0');
      } catch {
        /* private mode */
      }
    },
  ];
}

export function PerformScreen({ t, settings, onBack, onProgress }: { t: Strings; settings: Settings; onBack: () => void; onProgress?: (p: Progress) => void }) {
  const [tab, setTab] = useState<Tab>('backing');
  const gate = useMiniGate();
  const [chart, setChart] = useState<ChartId>('ii-V-I');
  const [key, setKey] = useState(0);
  const [bpm, setBpm] = useState(120);
  const ctl = useRef<AbortController | null>(null);
  const stopAll = () => {
    ctl.current?.abort();
    ctl.current = null;
  };
  useEffect(() => stopAll, []);

  const chartControls = (
    <div className="perf-controls">
      <label>
        <small>{t.perfChart}</small>
        <select value={chart} onChange={(e) => setChart(e.target.value as ChartId)} data-chart="1">
          {(Object.keys(CHARTS) as ChartId[]).map((c) => (
            <option key={c} value={c}>
              {t.perfCharts[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <small>{t.perfKey}</small>
        <select value={key} onChange={(e) => setKey(Number(e.target.value))}>
          {KEYS.map((k, i) => (
            <option key={k} value={i}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label>
        <small>
          {t.perfTempo} <b dir="ltr">{bpm}</b>
        </small>
        <input type="range" min={60} max={220} step={4} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
      </label>
    </div>
  );

  return (
    <main className="panel-screen perform">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (stopAll(), onBack())} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.perfTitle}</h1>
      </header>
      <div className="seg perf-tabs" role="tablist">
        {(['backing', 'improv', 'clock', 'midi', 'guitar'] as Tab[]).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? 'on' : ''} onClick={() => gate(`perform:${x}`, () => (stopAll(), setTab(x)))}>
            {t.perfTabs[x]}
          </button>
        ))}
      </div>
      {tab === 'backing' && <Backing t={t} chart={chart} keyPc={key} bpm={bpm} controls={chartControls} ctl={ctl} />}
      {tab === 'improv' && <Improv t={t} chart={chart} keyPc={key} bpm={bpm} controls={chartControls} ctl={ctl} onProgress={onProgress} />}
      {tab === 'clock' && <InnerClock t={t} ctl={ctl} onProgress={onProgress} />}
      {tab === 'midi' && <MidiDrills t={t} settings={settings} onProgress={onProgress} />}
      {tab === 'guitar' && <GuitarTabDrill t={t} settings={settings} ctl={ctl} onProgress={onProgress} />}
    </main>
  );
}

function ChartLine({ chart, keyPc, beat }: { chart: ChartId; keyPc: number; beat: number | null }) {
  let at = 0;
  return (
    <p className="chart-line" dir="ltr">
      {CHARTS[chart].map((c, i) => {
        const on = beat !== null && beat >= at && beat < at + c.beats;
        at += c.beats;
        return (
          <span key={i} className={on ? 'on' : ''}>
            {chordSymbol(keyPc, c)}
          </span>
        );
      })}
    </p>
  );
}

function useBeatClock(bpm: number, startBeat: number, running: boolean, chart: ChartId): number | null {
  const [beat, setBeat] = useState<number | null>(null);
  useEffect(() => {
    if (!running) return setBeat(null);
    const t0 = performance.now();
    const id = setInterval(() => {
      const b = ((performance.now() - t0) / 1000) * (bpm / 60) - startBeat;
      setBeat(b < 0 ? null : b % chartBeats(chart));
    }, 80);
    return () => clearInterval(id);
  }, [running, bpm, startBeat, chart]);
  return beat;
}

function Backing({ t, chart, keyPc, bpm, controls, ctl }: { t: Strings; chart: ChartId; keyPc: number; bpm: number; controls: React.ReactNode; ctl: React.MutableRefObject<AbortController | null> }) {
  const [playing, setPlaying] = useState(false);
  const beat = useBeatClock(bpm, 4, playing, chart);
  const play = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    setPlaying(true);
    const tr = backingTrack(chart, keyPc, bpm, chart === 'blues' ? 3 : 8);
    await piano.play(tr.events, tr.length, c.signal).catch(() => {});
    if (ctl.current === c) setPlaying(false);
  };
  return (
    <section className="set-card">
      <p className="field-hint">{t.perfBackingHint}</p>
      {controls}
      <ChartLine chart={chart} keyPc={keyPc} beat={beat} />
      {playing ? (
        <button className="btn mega" onClick={() => (ctl.current?.abort(), setPlaying(false))}>
          ■ {t.perfStop}
        </button>
      ) : (
        <button className="btn mega" data-backing="play" onClick={() => void play()}>
          ▶ {t.perfPlay}
        </button>
      )}
    </section>
  );
}

function Improv({ t, chart, keyPc, bpm, controls, ctl, onProgress }: { t: Strings; chart: ChartId; keyPc: number; bpm: number; controls: React.ReactNode; ctl: React.MutableRefObject<AbortController | null>; onProgress?: (p: Progress) => void }) {
  const [headphones, setHeadphones] = useHeadphones();
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [report, setReport] = useState<ImprovReport | null>(null);
  const choruses = chart === 'blues' ? 1 : 2;
  const beat = useBeatClock(bpm, 4, phase === 'playing', chart);
  const go = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    setReport(null);
    setPhase('playing');
    const tr = backingTrack(chart, keyPc, bpm, choruses + 1);
    const secBeat = 60 / bpm;
    const t0 = tr.startBeat * secBeat; // the first beat of the chart
    const listenFrom = t0 + chartBeats(chart) * secBeat * 0 + 4 * secBeat; // the first bar is for listening (and the bleed gate)
    let frames: SungFrame[] = [];
    if (SIMULATED) {
      await new Promise((r) => setTimeout(r, 400));
      frames = synthImprov(chart, keyPc, bpm, choruses + 1).map((f) => ({ ...f, t: f.t + t0 })).filter((f) => f.t >= listenFrom);
    } else {
      const gate = headphones ? null : new BleedGate(backingPitches(tr.events));
      const buf: SungFrame[] = [];
      void piano.play(tr.events, tr.length, c.signal).catch(() => {});
      const r = await new BrowserPitchCapture().sing({
        signal: c.signal,
        maxMs: tr.length * 1000,
        silenceMs: 600_000,
        hopMs: 20,
        onFrame: (f) => {
          if (f.t < listenFrom) return gate?.calibrate(f);
          if (gate && f.t - listenFrom < 0.03) gate.finishCalibration();
          buf.push(gate ? gate.pass(f) : f);
        },
      });
      frames = r.kind === 'frames' ? buf : [];
    }
    if (c.signal.aborted && !SIMULATED) return setPhase('idle');
    // Analyse against the chart: time 0 = the chart's first beat (the listening bar is chart bar 1).
    const rep = improvReport(frames.map((f) => ({ ...f, t: f.t - t0 })), chart, keyPc, bpm);
    setReport(rep);
    // Improvisation skill: the report's score; harder charts and faster tempi are harder.
    if (rep.notes >= 3) void store.recordRatingEvents([{ id: `improv:${Date.now()}`, skill: 'improv', difficulty: Math.round(1050 + (chart === 'blues' ? 40 : chart === 'minor-ii-V-i' ? 80 : 0) + Math.max(0, bpm - 90) * 2), correct: rep.score >= 0.6, score: rep.score, at: new Date().toISOString() }]).then((p2) => onProgress?.(p2));
    setPhase('done');
  };
  return (
    <section className="set-card">
      <p className="field-hint">{t.perfImprovHint}</p>
      {controls}
      <ChartLine chart={chart} keyPc={keyPc} beat={beat} />
      <label className="toggle-row">
        <input type="checkbox" checked={headphones} onChange={(e) => setHeadphones(e.target.checked)} />
        <span><Icon k="phones" /> {t.vocalHeadphones}</span>
      </label>
      {phase === 'playing' ? (
        <>
          <p className="vocal-cue" aria-live="assertive">
            {beat === null || beat < 4 ? t.perfListenBar : t.perfNowPlay}
          </p>
          <button className="btn ghost" onClick={() => (ctl.current?.abort(), setPhase('idle'))}>
            ■ {t.perfStop}
          </button>
        </>
      ) : (
        <button className="btn mega" data-improv="go" onClick={() => void go()}>
          <Icon k="mic" /> {t.perfImprovGo}
        </button>
      )}
      {report && (
        <div className="take-card" aria-live="polite" data-improv-score={Math.round(report.score * 100)}>
          <div className="take-score">
            {t.vocalScore}: <b>{pct(report.score)}</b>
          </div>
          <ul className="perf-report">
            <li>
              {t.perfStrong}: <b dir="ltr">{pct(report.strongChordTones)}</b>
            </li>
            <li>
              {t.perfEnding}: <b>{report.endsOnChordTone ? '✓' : '✗'}</b>
            </li>
            <li>
              {t.perfRhythm}: <b dir="ltr">{report.rhythmicVariety}/4</b>
            </li>
            <li>
              {t.perfRange}: <b dir="ltr">{report.rangeSemis}</b>
            </li>
            <li>
              {t.perfApproach}: <b dir="ltr">{pct(report.chromaticApproaches)}</b>
            </li>
          </ul>
          {report.tips.map((k) => (
            <p key={k} className="take-tip">
              <Icon k="tip" /> {t.perfTips[k]}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- MIDI drills

type Drill = 'voicing' | 'melody' | 'scale' | 'read' | 'iivi';
const Q_ROT: Quality[] = ['maj7', 'm7', 'dom7', 'hd'];
const SYM: Record<Quality, string> = { maj7: 'maj7', m7: 'm7', dom7: '7', hd: 'ø7', b9: '7♭9', m6: 'm6' };
/** A major scale up and down (15 notes) from a root that fits the screen keys (C3–C5). */
const SCALE_ROOTS = [0, 7, 5, 2, 10, 9, 3];
const majorUpDown = (root: number) => {
  const up = [0, 2, 4, 5, 7, 9, 11, 12].map((x) => 48 + root + x);
  return [...up, ...up.slice(0, -1).reverse()];
};

function MidiDrills({ t, settings, onProgress }: { t: Strings; settings: Settings; onProgress?: (p: Progress) => void }) {
  const [devices, setDevices] = useState<string[] | null>(null);
  const [drill, setDrill] = useState<Drill>('voicing');
  const [vk, setVk] = useState<VoicingKind>('any');
  const [seed, setSeed] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [notesOn, setNotesOn] = useState<{ m: number; at: number }[]>([]);
  const [built, setBuilt] = useState<number[]>([]);
  const [iv, setIv] = useState({ k: 0, step: 0, ok: 0 });
  const held = useRef(new Set<number>());
  const peak = useRef(new Set<number>());

  const task = useMemo(() => {
    const r = (seed * 7919) % 12;
    const scaleRoot = SCALE_ROOTS[seed % SCALE_ROOTS.length];
    // Sight-reading on the keys (spec V.1 / Z.5): a written melody from the sight-singing levels.
    const lvl = SIGHT_LEVELS[seed % 3];
    const item = lvl.items[seed % lvl.items.length];
    const readNotes = itemTargets(item, { low: 52, high: 72 });
    return { root: r, q: Q_ROT[seed % 4], melody: Array.from({ length: 5 }, (_, i) => [60, 62, 64, 65, 67, 69, 71, 72][(seed * (i + 3) * 5) % 8]), scaleRoot, scale: majorUpDown(scaleRoot), read: { item, notes: readNotes } };
  }, [seed]);
  const ivChord = (k: number, step: number): { root: number; q: Quality } => {
    const key = CIRCLE_KEYS[k % 12];
    return step === 0 ? { root: (key + 2) % 12, q: 'm7' } : step === 1 ? { root: (key + 7) % 12, q: 'dom7' } : { root: key, q: 'maj7' };
  };
  const name = (root: number, q: Quality) => `${KEYS[root]}${SYM[q]}`;

  // A chord gesture: everything held together, judged when all keys are up.
  const onChord = (ns: number[]) => {
    if (drill === 'voicing') {
      const r = checkVoicing(ns, task.root, task.q, vk);
      setMsg(r.ok ? `✓ ${t.perfRight}` : `✗ ${fill(t.perfVoicingWrong, { missing: r.missing.map((p) => KEYS[p]).join(' ') || '—', extra: r.extra.map((p) => KEYS[p]).join(' ') || '—' })}`);
      if (r.ok) setTimeout(() => (setSeed((x) => x + 1), setMsg(null)), 900);
    } else if (drill === 'iivi') {
      const ch = ivChord(iv.k, iv.step);
      const ok = hasGuideTones(ns, ch.root, ch.q);
      setMsg(ok ? `✓ ${name(ch.root, ch.q)}` : `✗ ${fill(t.perfGuideTones, { chord: name(ch.root, ch.q) })}`);
      if (ok) setIv((s) => (s.step === 2 ? { k: s.k + 1, step: 0, ok: s.ok + 1 } : { ...s, step: s.step + 1 }));
    }
  };
  const onNoteOn = (m: number, at: number) => {
    if (drill === 'melody' || drill === 'scale' || drill === 'read') {
      setNotesOn((xs) => {
        const next = [...xs, { m, at }];
        const want = drill === 'melody' ? task.melody : drill === 'read' ? task.read.notes : task.scale;
        if (next.length >= want.length) {
          // Reading counts the pitch class (any octave on the keys).
          const right = want.filter((w, i) => (drill === 'read' ? next[i] && (next[i].m - w) % 12 === 0 : next[i]?.m === w)).length;
          if (drill === 'read') {
            const score = right / want.length;
            setMsg(`${right}/${want.length} ${t.perfNotesRight}`);
            void store.recordRatingEvents([{ id: `read:${Date.now()}`, skill: 'sight', difficulty: task.read.item.difficulty, correct: score >= 0.75, score, at: new Date().toISOString() }]).then((p2) => onProgress?.(p2));
          } else if (drill === 'melody') setMsg(`${right}/${want.length} ${t.perfNotesRight}`);
          else setMsg(`${right}/${want.length} ${t.perfNotesRight} · ${t.perfEvenness}: ${Math.round((1 - Math.min(1, scaleEvenness(next.map((x) => x.at)))) * 100)}%`);
          return [];
        }
        return next;
      });
    }
  };

  useEffect(() => {
    const off = midi.onNote((m, on, at) => {
      if (on) {
        held.current.add(m);
        peak.current.add(m);
        onNoteOn(m, at);
      } else {
        held.current.delete(m);
        if (!held.current.size && peak.current.size) {
          const ns = [...peak.current];
          peak.current.clear();
          if (ns.length >= 2) onChord(ns);
        }
      }
    });
    return off;
  });

  const enable = async () => {
    try {
      setDevices(await midi.enable());
    } catch {
      setDevices([]);
    }
  };
  const prompt =
    drill === 'voicing'
      ? fill(t.perfPlayChord, { chord: name(task.root, task.q), kind: t.perfVoicingKinds[vk] })
      : drill === 'melody'
        ? t.perfPlayBack
        : drill === 'scale'
          ? fill(t.perfPlayScale, { key: KEYS[task.scaleRoot] })
          : drill === 'read'
            ? t.perfReadPrompt
          : fill(t.perfIiVi, { key: KEYS[CIRCLE_KEYS[iv.k % 12]], chord: name(ivChord(iv.k, iv.step).root, ivChord(iv.k, iv.step).q), n: iv.ok });
  const isChordDrill = drill === 'voicing' || drill === 'iivi';
  return (
    <section className="set-card">
      <p className="field-hint">{t.perfMidiHint}</p>
      {devices === null ? (
        <button className="btn ghost" onClick={() => void enable()}>
          {t.perfEnableMidi}
        </button>
      ) : (
        <p className="field-hint">{devices.length ? `${devices.join(', ')}` : t.perfNoMidi}</p>
      )}
      <div className="seg" role="radiogroup">
        {(['voicing', 'melody', 'scale', 'read', 'iivi'] as Drill[]).map((d) => (
          <button key={d} role="radio" aria-checked={drill === d} className={drill === d ? 'on' : ''} data-drill={d} onClick={() => (setDrill(d), setMsg(null), setNotesOn([]), setBuilt([]))}>
            {t.perfDrills[d]}
          </button>
        ))}
      </div>
      {drill === 'voicing' && (
        <div className="seg" role="radiogroup">
          {(['any', 'shell', 'rootless'] as VoicingKind[]).map((k) => (
            <button key={k} role="radio" aria-checked={vk === k} className={vk === k ? 'on' : ''} onClick={() => setVk(k)}>
              {t.perfVoicingKinds[k]}
            </button>
          ))}
        </div>
      )}
      <p className="vocal-instr" data-midi-prompt="1">
        {prompt}
      </p>
      {drill === 'read' && <NotesView midis={task.read.notes} keyPc={pc(sightKeyName(task.read.item, task.read.notes[0]))} settings={settings} durs={task.read.item.durs} />}
      {(drill === 'melody' || drill === 'scale' || drill === 'read') && (
        <p className="seq-shown" dir="ltr">
          {notesOn.length ? notesOn.map((x) => KEYS[x.m % 12]).join(' ') : '…'}
        </p>
      )}
      {drill === 'melody' && (
        <button className="btn ghost" onClick={() => void piano.unlock().then(() => piano.play(task.melody.map((m, i) => ({ midi: m, start: i * 0.45, duration: 0.42, velocity: 0.7 })), 2.6, new AbortController().signal))}>
          <Icon k="speaker" /> {t.perfHearMelody}
        </button>
      )}
      <ScreenKeys
        selected={isChordDrill ? built : []}
        onKey={(m) => {
          void piano.play([{ midi: m, start: 0, duration: 0.5, velocity: 0.6 }], 0.6, new AbortController().signal);
          if (isChordDrill) setBuilt((b) => (b.includes(m) ? b.filter((x) => x !== m) : [...b, m]));
          else onNoteOn(m, performance.now());
        }}
      />
      {isChordDrill && (
        <button className="btn primary" data-chord-done="1" disabled={built.length < 2} onClick={() => (onChord(built), setBuilt([]))}>
          ✓ {t.send}
        </button>
      )}
      {msg && (
        <p className="take-remark" aria-live="polite" data-midi-result="1">
          {msg}
        </p>
      )}
      <button className="btn ghost" onClick={() => (setSeed((x) => x + 1), setMsg(null), setNotesOn([]), setBuilt([]))}>
        ↻ {t.perfNext}
      </button>
    </section>
  );
}

/** A clickable two-octave keyboard (C3–C5) for when there is no MIDI device. */
function ScreenKeys({ onKey, selected }: { onKey: (m: number) => void; selected: number[] }) {
  const keys = Array.from({ length: 25 }, (_, i) => 48 + i);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  return (
    <div className="screen-keys" dir="ltr" aria-label="keyboard">
      {keys.map((m) => (
        <button key={m} className={`sk ${black(m) ? 'b' : 'w'} ${selected.includes(m) ? 'sel' : ''}`} data-key={m} aria-label={`${KEYS[m % 12]}${Math.floor(m / 12) - 1}`} onPointerDown={(e) => (e.preventDefault(), onKey(m))} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- guitar from tab

const GUITAR_RANGE = { low: 52, high: 76 };

function GuitarTabDrill({ t, settings, ctl, onProgress }: { t: Strings; settings: Settings; ctl: React.MutableRefObject<AbortController | null>; onProgress?: (p: Progress) => void }) {
  const [level, setLevel] = useState(1);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'count' | 'playing' | 'done'>('idle');
  const [grade, setGrade] = useState<TakeGrade | null>(null);
  const item = SIGHT_LEVELS[level - 1].items[idx % SIGHT_LEVELS[level - 1].items.length];
  const targets = itemTargets(item, GUITAR_RANGE);
  const views = [...new Set(['tab', ...(settings.noteViews ?? [])])] as NonNullable<Settings['noteViews']>;
  const go = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    setGrade(null);
    setPhase('count');
    const beat = 60 / (item.bpm ?? 72);
    const tonic = targets[0] - (item.steps?.[0] ?? 0);
    const clicks = [0, 1, 2, 3].map((k) => ({ midi: k === 0 ? 96 : 91, start: 1.4 + k * beat, duration: 0.05, velocity: 0.5 }));
    await piano.play([{ midi: tonic, start: 0, duration: 1.2, velocity: 0.75 }, ...clicks], 1.4 + 4 * beat, c.signal).catch(() => {});
    if (c.signal.aborted) return setPhase('idle');
    setPhase('playing');
    let frames: SungFrame[] = [];
    if (SIMULATED) {
      await new Promise((r) => setTimeout(r, 400));
      frames = synthMelody(targets, 0.5, { noteSecs: (item.durs ?? []).map((d) => d * beat) });
    } else {
      const total = (item.durs ?? []).reduce((a, b) => a + b, 0) * beat;
      const r = await new BrowserPitchCapture().sing({ signal: c.signal, maxMs: (total + 3) * 1000, silenceMs: 5000, endSilenceMs: 1200, hopMs: 20 });
      frames = r.kind === 'frames' ? r.frames : [];
    }
    const g = gradeTake(item, frames, GUITAR_RANGE);
    setGrade(g);
    // Reading: playing from tab on the guitar.
    if (!g.unclear) void store.recordRatingEvents([{ id: `guitar:${Date.now()}`, skill: 'sight', difficulty: item.difficulty, correct: g.score >= 0.6, score: g.score, at: new Date().toISOString() }]).then((p2) => onProgress?.(p2));
    setPhase('done');
  };
  return (
    <section className="set-card">
      <p className="field-hint">{t.perfGuitarHint}</p>
      <div className="seg" role="radiogroup">
        {SIGHT_LEVELS.map((_, i) => (
          <button key={i} role="radio" aria-checked={level === i + 1} className={level === i + 1 ? 'on' : ''} onClick={() => (setLevel(i + 1), setIdx(0), setGrade(null))}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className="sight-score">
        <NotesView midis={targets} keyPc={pc(sightKeyName(item, targets[0]))} settings={{ ...settings, noteViews: views }} durs={item.durs} />
        <small className="field-hint">♩ = {item.bpm ?? 72}</small>
      </div>
      <button className="btn mega" data-guitar="go" disabled={phase === 'count' || phase === 'playing'} onClick={() => void go()}>
        {phase === 'count' ? t.sightCountIn : phase === 'playing' ? '…' : t.perfGuitarGo}
      </button>
      {grade && (
        <div className="take-card" aria-live="polite" data-guitar-score={Math.round(grade.score * 100)}>
          {grade.unclear ? (
            <p>{t.vocalUnclear}</p>
          ) : (
            <>
              <div className="take-score">
                {t.vocalScore}: <b>{pct(grade.score)}</b>
              </div>
              <ul className="perf-report">
                {grade.metrics.map((m) => (
                  <li key={m.key}>
                    {t.metricNames[m.key] ?? m.key}: <b dir="ltr">{m.unit === '%' ? `${Math.round(m.value)}%` : `${m.value} ${m.unit}`}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button className="btn ghost" onClick={() => (setIdx((x) => x + 1), setGrade(null), setPhase('idle'))}>
            ↻ {t.perfNext}
          </button>
        </div>
      )}
    </section>
  );
}

void QUALITY;
void chordAt;

// ---------------------------------------------------------------- internal clock

/** The metronome plays two bars, goes silent, then comes back for one bar: keep tapping the beat throughout. */
function InnerClock({ t, ctl, onProgress }: { t: Strings; ctl: React.MutableRefObject<AbortController | null>; onProgress?: (p: Progress) => void }) {
  const [bpm, setBpm] = useState(92);
  const [silentBars, setSilentBars] = useState(2);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [report, setReport] = useState<ClockReport | null>(null);
  const [beatNow, setBeatNow] = useState<number | null>(null);
  const taps = useRef<number[]>([]);
  const t0 = useRef(0);
  const plan = clockPlan(bpm, silentBars);
  const tap = () => {
    if (phase !== 'running') return;
    taps.current.push((performance.now() - t0.current) / 1000);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'running') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const go = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    taps.current = [];
    setReport(null);
    setPhase('running');
    const p = clockPlan(bpm, silentBars);
    const ev = clockEvents(p);
    t0.current = performance.now();
    const tick = setInterval(() => setBeatNow(Math.floor((performance.now() - t0.current) / 1000 / p.beat)), 50);
    if (SIMULATED) {
      // A slightly dragging player.
      taps.current = Array.from({ length: p.totalBeats }, (_, i) => i * p.beat * 1.006 + 0.012);
      await new Promise((r) => setTimeout(r, 600));
    } else await piano.play(ev.events, ev.length, c.signal).catch(() => {});
    clearInterval(tick);
    setBeatNow(null);
    if (c.signal.aborted && !SIMULATED) return setPhase('idle');
    const rep = clockReport(p, taps.current);
    setReport(rep);
    // Tempo & pulse: longer silences and tempi far from the comfortable middle are harder.
    void store.recordRatingEvents([{ id: `clock:${Date.now()}`, skill: 'tempo', difficulty: Math.round(1000 + silentBars * 70 + Math.abs(bpm - 100) * 1.5), correct: rep.score >= 0.6, score: rep.score, at: new Date().toISOString() }]).then((p2) => onProgress?.(p2));
    setPhase('done');
  };
  const silentNow = beatNow !== null && beatNow >= plan.silent[0] && beatNow < plan.silent[1];
  return (
    <section className="set-card">
      <p className="field-hint">{t.clockHint}</p>
      <div className="perf-controls">
        <label>
          <small>
            {t.perfTempo} <b dir="ltr">{bpm}</b>
          </small>
          <input type="range" min={60} max={180} step={4} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </label>
      </div>
      <div className="seg" role="radiogroup" aria-label={t.clockSilent}>
        {[2, 4, 8].map((n) => (
          <button key={n} role="radio" aria-checked={silentBars === n} className={silentBars === n ? 'on' : ''} onClick={() => setSilentBars(n)}>
            {fill(t.clockBars, { n })}
          </button>
        ))}
      </div>
      {phase === 'running' ? (
        <button className={`clock-pad ${silentNow ? 'silent' : ''}`} data-clock-tap="1" onPointerDown={(e) => (e.preventDefault(), tap())}>
          {beatNow === null ? '…' : silentNow ? `${t.clockKeepGoing}` : beatNow < plan.silent[0] ? `${(beatNow % 4) + 1}` : `${t.clockBack}`}
        </button>
      ) : (
        <button className="btn mega" data-clock="go" onClick={() => void go()}>
          ▶ {t.clockStart}
        </button>
      )}
      {report && (
        <div className="take-card" aria-live="polite" data-clock-score={Math.round(report.score * 100)}>
          <div className="take-score">
            {t.vocalScore}: <b>{pct(report.score)}</b>
          </div>
          <p className="take-remark">{t.clockVerdicts[report.verdict]}</p>
          <ul className="perf-report">
            <li>
              {t.clockOff}: <b dir="ltr">{report.absMs} ms</b>
            </li>
            <li>
              {t.clockEnd}: <b dir="ltr">{report.endMs > 0 ? '+' : ''}{report.endMs} ms</b>
            </li>
            <li>
              {t.clockHits}: <b dir="ltr">{report.hits}/{report.silentBeats}</b>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
