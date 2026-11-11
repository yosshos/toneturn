// Metronome (owner, 2026-11-07): an analog pendulum metronome — tempo (slider, ±, tap), meter (beats + /4 or /8),
// tap a beat to accent / mute it, subdivisions, sounds (click, woodblock, hi-hat, kit, bell), a speed trainer, and a
// bank of drum grooves sorted by style. Look-ahead scheduling on the audio clock (sample-accurate, no drift); the
// pendulum follows the audio clock too, so it swings exactly to what you hear.

import { useEffect, useMemo, useRef, useState } from 'react';
import { clampBpm, DEFAULT_METRO, defaultAccents, DRUM_KITS, KIT_NAME, GROOVES, grooveHits, grooveSteps, groovesOf, STYLE_NAME, stepSeconds, tapBpm, tempoName, type DrumKit, type GrooveStyle, type MetroSettings } from '../engine/grooves';
import type { Settings } from '../storage/progress';
import { piano } from './services';

type Lang = 'en' | 'he';

const TX = {
  title: { en: 'Metronome', he: 'מטרונום' },
  tap: { en: 'Tap', he: 'הקשה' },
  meter: { en: 'Meter', he: 'משקל' },
  sub: { en: 'Subdivide', he: 'חלוקה' },
  sound: { en: 'Sound', he: 'צליל' },
  click: { en: 'Click', he: 'קליק' },
  grooves: { en: 'Grooves', he: 'מקצבים' },
  off: { en: 'Click only', he: 'רק קליק' },
  all: { en: 'All', he: 'הכול' },
  trainer: { en: 'Speed trainer', he: 'מאמן מהירות' },
  trainerHint: { en: '+{s} BPM every {b} bars, up to {t}', he: '+{s} BPM כל {b} תיבות, עד {t}' },
  accentHint: { en: 'Tap a beat: accent → normal → silent', he: 'הקישו על פעמה: מודגשת ← רגילה ← שקטה' },
  start: { en: 'Start', he: 'הפעלה' },
  stop: { en: 'Stop', he: 'עצירה' },
  bars: { en: 'bars', he: 'תיבות' },
  kit: { en: 'Drum kit', he: 'ערכת תופים' },
};
const SOUNDS: [MetroSettings['sound'], { en: string; he: string }][] = [
  ['click', { en: 'Click', he: 'קליק' }],
  ['wood', { en: 'Woodblock', he: 'בלוק עץ' }],
  ['hat', { en: 'Hi-hat', he: 'היי־האט' }],
  ['kit', { en: 'Kit', he: 'תופים' }],
  ['bell', { en: 'Bell', he: 'פעמון' }],
];
const SUBS: [MetroSettings['sub'], string][] = [
  [1, '♩'],
  [2, '♫'],
  [3, '3'],
  [4, '♬'],
];
const BEATS = [2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 15];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

export function Metronome({ lang, settings, onChange, onBack }: { lang: Lang; settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void }) {
  const he = lang === 'he';
  const [m, setM] = useState<MetroSettings>(() => ({ ...DEFAULT_METRO, ...(settings.metronome ?? {}) }));
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [tab, setTab] = useState<'click' | 'grooves'>(m.groove ? 'grooves' : 'click');
  const [style, setStyle] = useState<GrooveStyle | null>(null);
  const [live, setLive] = useState(m.bpm); // tempo while the trainer climbs
  const taps = useRef<number[]>([]);
  const mRef = useRef(m);
  mRef.current = m;
  const groove = m.groove ? GROOVES.find((g) => g.id === m.groove) ?? null : null;
  const beats = groove ? (groove.den === 8 && groove.sub === 2 ? groove.beats : groove.beats) : m.beats;
  const den = groove ? groove.den : m.den;

  // Save (debounced through React batching; the settings store writes once per change).
  const save = (p: Partial<MetroSettings>) => {
    const next = { ...mRef.current, ...p };
    setM(next);
    onChange({ metronome: next });
  };
  // The drum kit: chosen here, loaded on demand; picking one while stopped plays a short sample bar.
  const kit: DrumKit = m.kit ?? 'classic';
  useEffect(() => {
    void piano.setDrumKit(kit);
  }, [kit]);
  const pickKit = async (k: DrumKit) => {
    save({ kit: k });
    if (running) return void piano.setDrumKit(k);
    await piano.unlock();
    await piano.setDrumKit(k);
    const t = (piano.audioNow() ?? 0) + 0.05;
    const e = 0.22;
    piano.metroHit('kick', t, 0.9);
    piano.metroHit('hat', t, 0.6);
    piano.metroHit('hat', t + e, 0.45);
    piano.metroHit('snare', t + 2 * e, 0.85);
    piano.metroHit('hat', t + 2 * e, 0.6);
    piano.metroHit('hat-open', t + 3 * e, 0.5);
  };
  const kitRow = (
    <div className="mt-row mt-kit">
      <span className="mt-label">{TX.kit[lang]}</span>
      <div className="mt-chips">
        {DRUM_KITS.map((k) => (
          <button key={k} type="button" className={`chip ${kit === k ? 'on' : ''}`} onClick={() => void pickKit(k)} data-kit={k}>
            {KIT_NAME[k][lang]}
          </button>
        ))}
      </div>
    </div>
  );
  const setBpm = (b: number) => {
    const bpm = clampBpm(b);
    save({ bpm });
    setLive(bpm);
  };

  // ---------------------------------------------------------------- the scheduler (audio clock, look-ahead)
  const sched = useRef<{ timer: number; next: number; step: number; bar: number; bpm: number; beatTimes: { t: number; beat: number; n: number }[]; count: number } | null>(null);
  const raf = useRef(0);
  const [angle, setAngle] = useState(0);

  const stop = () => {
    if (sched.current) clearInterval(sched.current.timer);
    sched.current = null;
    cancelAnimationFrame(raf.current);
    setRunning(false);
    setBeat(-1);
    setAngle(0);
  };

  const start = async () => {
    await piano.unlock();
    const now = piano.audioNow();
    if (now === null) return;
    const st = { timer: 0, next: now + 0.08, step: 0, bar: 0, bpm: mRef.current.bpm, beatTimes: [] as { t: number; beat: number; n: number }[], count: 0 };
    sched.current = st;
    setLive(st.bpm);
    const tick = () => {
      const cur = mRef.current;
      const nowA = piano.audioNow() ?? 0;
      while (st.next < nowA + 0.12) {
        const g = cur.groove ? GROOVES.find((x) => x.id === cur.groove) ?? null : null;
        if (g) {
          const n = grooveSteps(g);
          const s = st.step % n;
          for (const h of grooveHits(g)) if (h.step === s) piano.metroHit(h.kind, st.next, h.vel);
          const perBeat = g.den === 8 && g.sub === 2 ? 1 : g.sub;
          if (s % perBeat === 0) st.beatTimes.push({ t: st.next, beat: s / perBeat, n: st.count++ });
          st.next += stepSeconds(g, st.bpm);
          st.step++;
          if (st.step % n === 0) barDone(st, cur);
        } else {
          const sub = cur.sub;
          const n = cur.beats * sub;
          const s = st.step % n;
          const b = Math.floor(s / sub);
          const j = s % sub;
          const acc = cur.accents[b] ?? 1;
          if (j === 0) {
            if (acc > 0) clickSound(cur.sound, acc === 2, b, cur.beats, st.next);
            st.beatTimes.push({ t: st.next, beat: b, n: st.count++ });
          } else if (acc > 0 || sub > 1) piano.metroHit(cur.sound === 'hat' || cur.sound === 'kit' ? 'hat' : 'click', st.next, 0.3);
          // /8 meters: the tempo counts eighths, so one beat = one eighth.
          st.next += 60 / st.bpm / sub;
          st.step++;
          if (st.step % n === 0) barDone(st, cur);
        }
      }
      if (st.beatTimes.length > 16) st.beatTimes.splice(0, st.beatTimes.length - 16);
    };
    const barDone = (s: typeof st, cur: MetroSettings) => {
      s.bar++;
      const tr = cur.trainer;
      if (tr && s.bar % tr.bars === 0 && s.bpm < tr.to) {
        s.bpm = Math.min(tr.to, s.bpm + tr.step);
        setLive(s.bpm);
      }
    };
    tick();
    st.timer = window.setInterval(tick, 25);
    setRunning(true);
    const frame = () => {
      const s = sched.current;
      if (!s) return;
      const nowP = performance.now();
      const times = s.beatTimes.map((x) => ({ p: piano.heardTime(x.t), beat: x.beat, n: x.n }));
      let i = -1;
      for (let k = 0; k < times.length; k++) if (times[k].p <= nowP) i = k;
      if (i >= 0) {
        const cur = times[i];
        const nxt = times[i + 1];
        const period = nxt ? nxt.p - cur.p : 60000 / s.bpm;
        const phase = Math.min(1, (nowP - cur.p) / period);
        const parity = cur.n % 2 === 0 ? 1 : -1;
        setAngle(26 * parity * Math.cos(Math.PI * phase));
        setBeat(cur.beat);
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  };

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Space toggles; arrows change the tempo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (sched.current) stop();
        else void start();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setBpm(mRef.current.bpm + 1);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setBpm(mRef.current.bpm - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Tempo changes apply at once while running (unless the trainer is climbing from its own start).
  useEffect(() => {
    if (sched.current && !m.trainer) sched.current.bpm = m.bpm;
  }, [m.bpm, m.trainer]);

  const setMeter = (b: number, d: 4 | 8) => save({ beats: b, den: d, accents: defaultAccents(b, d), groove: null });
  const cycleAccent = (i: number) => {
    const a = [...m.accents];
    while (a.length < m.beats) a.push(1);
    a[i] = a[i] === 2 ? 1 : a[i] === 1 ? 0 : 2;
    save({ accents: a });
  };
  const doTap = () => {
    const now = performance.now();
    taps.current = [...taps.current.slice(-7), now];
    const b = tapBpm(taps.current);
    if (b) setBpm(b);
  };

  const shown = useMemo(() => groovesOf(style), [style]);
  const styles = useMemo(() => [...new Set(GROOVES.map((g) => g.style))], []);
  const bpmShown = running ? live : m.bpm;
  // The weight sits higher on the rod for slow tempi (like a real metronome).
  const weightY = 40 + ((bpmShown - 30) / 230) * 70;

  return (
    <main className="panel-screen metronome" data-metronome="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (stop(), onBack())} aria-label={he ? 'חזרה' : 'Back'}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{TX.title[lang]}</h1>
      </header>

      <div className="mt-stage">
        <svg className="mt-pendulum" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="mtWood" x1="0" x2="1">
              <stop offset="0" stopColor="var(--mt-wood-a)" />
              <stop offset="1" stopColor="var(--mt-wood-b)" />
            </linearGradient>
          </defs>
          <path d="M70 12h60l32 176H38z" fill="url(#mtWood)" className="mt-body" />
          <path d="M84 26h32l20 132H64z" className="mt-face" />
          {Array.from({ length: 11 }, (_, i) => (
            <path key={i} d={`M${98 - (i % 2 ? 3 : 6)} ${36 + i * 11}h${i % 2 ? 6 : 12}`} className="mt-scale" transform={`translate(${i % 2 ? 1.5 : 0} 0)`} />
          ))}
          <g transform={`rotate(${angle} 100 164)`}>
            <path d="M100 164V20" className="mt-rod" />
            <path d={`M90 ${weightY}h20l-3 14h-14z`} className="mt-weight" />
          </g>
          <circle cx="100" cy="164" r="5" className="mt-pivot" />
          <path d="M38 188h124" className="mt-base" />
        </svg>
        <div className="mt-beats" role="group" aria-label={TX.accentHint[lang]}>
          {Array.from({ length: beats }, (_, i) => (
            <button key={i} type="button" className={`mt-dot a${groove ? (groove.groups ? defaultAccents(groove.beats, groove.den, groove.groups)[i] ?? 1 : 1) : m.accents[i] ?? 1} ${beat === i ? 'now' : ''}`} onClick={() => !groove && cycleAccent(i)} disabled={!!groove} aria-label={`${i + 1}`} data-beat={i} />
          ))}
        </div>
      </div>

      <div className="mt-tempo">
        <button className="icon-btn mt-step" onClick={() => setBpm(m.bpm - 1)} aria-label="−1">
          −
        </button>
        <div className="mt-bpm">
          <b data-bpm={bpmShown}>{bpmShown}</b>
          <small>
            BPM · {tempoName(bpmShown)}
            {running && m.trainer ? ` · ${fill(TX.trainerHint[lang], { s: m.trainer.step, b: m.trainer.bars, t: m.trainer.to })}` : ''}
          </small>
        </div>
        <button className="icon-btn mt-step" onClick={() => setBpm(m.bpm + 1)} aria-label="+1">
          +
        </button>
      </div>
      <input className="mt-slider" type="range" min={30} max={260} value={m.bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="BPM" />

      <div className="mt-main">
        <button className="btn ghost mt-tap" onClick={doTap} data-tap="1">
          {TX.tap[lang]}
        </button>
        <button className={`mt-play ${running ? 'on' : ''}`} onClick={() => (running ? stop() : void start())} aria-label={running ? TX.stop[lang] : TX.start[lang]} data-metro-play="1">
          {running ? (
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className="mt-meter-tag" aria-hidden="true">
          {groove ? grooveMeter(groove) : `${beats}/${den}`}
        </span>
      </div>

      <div className="ps-seg mt-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'click'} className={tab === 'click' ? 'on' : ''} onClick={() => setTab('click')}>
          {TX.click[lang]}
        </button>
        <button role="tab" aria-selected={tab === 'grooves'} className={tab === 'grooves' ? 'on' : ''} onClick={() => setTab('grooves')} data-tab-grooves="1">
          {TX.grooves[lang]}
        </button>
      </div>

      {tab === 'click' ? (
        <section className="set-card mt-panel">
          {groove && (
            <button className="btn small" onClick={() => save({ groove: null })}>
              {TX.off[lang]}
            </button>
          )}
          <div className="mt-row">
            <span className="mt-label">{TX.meter[lang]}</span>
            <div className="mt-chips">
              {BEATS.map((b) => (
                <button key={b} type="button" className={`chip ${!groove && m.beats === b ? 'on' : ''}`} onClick={() => setMeter(b, m.den)}>
                  {b}
                </button>
              ))}
              <button type="button" className="chip" onClick={() => setMeter(m.beats, m.den === 4 ? 8 : 4)} aria-label={he ? 'ערך הפעמה' : 'Beat value'}>
                /{m.den}
              </button>
            </div>
          </div>
          <div className="mt-row">
            <span className="mt-label">{TX.sub[lang]}</span>
            <div className="mt-chips">
              {SUBS.map(([v, l]) => (
                <button key={v} type="button" className={`chip ${m.sub === v ? 'on' : ''}`} onClick={() => save({ sub: v })} aria-label={`${v}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-row">
            <span className="mt-label">{TX.sound[lang]}</span>
            <div className="mt-chips">
              {SOUNDS.map(([v, l]) => (
                <button key={v} type="button" className={`chip ${m.sound === v ? 'on' : ''}`} onClick={() => save({ sound: v })} data-sound={v}>
                  {l[lang]}
                </button>
              ))}
            </div>
          </div>
          {m.sound === 'kit' && kitRow}
          <p className="field-hint">{TX.accentHint[lang]}</p>
        </section>
      ) : (
        <section className="set-card mt-panel">
          {kitRow}
          <div className="mt-chips mt-styles">
            <button type="button" className={`chip ${style === null ? 'on' : ''}`} onClick={() => setStyle(null)}>
              {TX.all[lang]}
            </button>
            {styles.map((st) => (
              <button key={st} type="button" className={`chip ${style === st ? 'on' : ''}`} onClick={() => setStyle(st)} data-style={st}>
                {STYLE_NAME[st][lang]}
              </button>
            ))}
          </div>
          <ul className="mt-grooves">
            {shown.map((g) => (
              <li key={g.id}>
                <button className={`mt-groove ${m.groove === g.id ? 'on' : ''}`} onClick={() => (m.groove === g.id ? save({ groove: null }) : (save({ groove: g.id, bpm: running ? m.bpm : g.bpm }), setLive(running ? m.bpm : g.bpm)))} data-groove={g.id}>
                  <span>{g.name[lang]}</span>
                  <small>
                    {STYLE_NAME[g.style][lang]} · {grooveMeter(g)} · {g.bpm}
                  </small>
                  <GrooveMini g={g} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="set-card mt-panel">
        <label className="toggle-row">
          <input type="checkbox" checked={!!m.trainer} onChange={(e) => save({ trainer: e.target.checked ? { step: 4, bars: 4, to: Math.min(260, m.bpm + 40) } : null })} data-trainer="1" />
          <span>{TX.trainer[lang]}</span>
        </label>
        {m.trainer && (
          <div className="mt-trainer">
            <label>
              +<input type="number" min={1} max={20} value={m.trainer.step} onChange={(e) => save({ trainer: { ...m.trainer!, step: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } })} /> BPM
            </label>
            <label>
              /<input type="number" min={1} max={32} value={m.trainer.bars} onChange={(e) => save({ trainer: { ...m.trainer!, bars: Math.max(1, Math.min(32, Number(e.target.value) || 1)) } })} /> {TX.bars[lang]}
            </label>
            <label>
              → <input type="number" min={31} max={260} value={m.trainer.to} onChange={(e) => save({ trainer: { ...m.trainer!, to: clampBpm(Number(e.target.value) || m.bpm) } })} />
            </label>
          </div>
        )}
      </section>
    </main>
  );
}

/** The sound of one click-metronome beat. */
function clickSound(sound: MetroSettings['sound'], accent: boolean, beat: number, beats: number, at: number) {
  switch (sound) {
    case 'click':
      return piano.metroHit(accent ? 'accent' : 'click', at, accent ? 0.95 : 0.7);
    case 'wood':
      return piano.metroHit('wood', at, accent ? 1 : 0.6);
    case 'hat':
      return piano.metroHit(accent ? 'hat-open' : 'hat', at, accent ? 0.9 : 0.6);
    case 'bell':
      return piano.metroHit(accent ? 'bell' : 'wood', at, accent ? 0.8 : 0.5);
    case 'kit':
      if (accent) piano.metroHit('kick', at, 0.95);
      else if (beats % 2 === 0 && beat % 2 === 1) piano.metroHit('snare', at, 0.8);
      return piano.metroHit('hat', at, 0.5);
  }
}

/** A tiny drum-grid preview of a groove (kick / snare / hats). */
function GrooveMini({ g }: { g: (typeof GROOVES)[number] }) {
  const n = grooveSteps(g);
  const lanes = [g.h, g.s, g.k];
  return (
    <svg className="mt-mini" viewBox={`0 0 ${n * 4} 12`} preserveAspectRatio="none" aria-hidden="true">
      {lanes.map((l, row) =>
        (l ?? '').split('').map((c, i) => (c === '.' ? null : <rect key={`${row}-${i}`} x={i * 4 + 0.6} y={row * 4 + 0.6} width="2.8" height="2.8" rx="0.8" className={`r${row} ${c === 'o' ? 'soft' : ''}`} />)),
      )}
    </svg>
  );
}

const grooveMeter = (g: (typeof GROOVES)[number]) => (g.den === 8 ? `${g.sub === 3 ? g.beats * 3 : g.beats}/8` : `${g.beats}/4`);
