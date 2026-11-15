// Input check strip (owner 2026-11-15): before an exercise starts the player plays a note, sings, hits a pad or presses
// a key and SEES that the signal arrives. One compact row (~44 px) above the Play button: a hard-edged level meter and
// the heard note (microphone), a hit flash (drums by microphone), or the device name, an activity light on every
// note-on and the last note with its velocity (MIDI). "Listening…" → "Got it ✓"; after ~4 s of nothing, one hint and a
// link to the matching settings (the microphone picker and calibration, or MIDI). The watchdog banner (below) tells a
// running take that nothing is heard, instead of grading a silent miss.
//
// Exported for any screen with instrument or voice input (the voice screens can add it as they are redesigned).
// Audio: the check opens its own capture through openCapture({ check: true }) and registers its release, so a take
// opening the microphone releases it first (never two audio graphs on the mic). Automation (navigator.webdriver) and
// the simulator (?sim=1) show a simulated microphone signal; MIDI always uses the real plumbing (e2e stubs it).

import '../inputcheck.css';
import { useEffect, useRef, useState } from 'react';
import { hintFor, isDrumMode, isMidiMode, METER_BARS, meterBars, noteLabel, onInput, lastInputAt, SignalDetector, watchdogDue, type InputCheckMode, type InputHint } from '../engine/inputCheck';
import { yin } from '../engine/yin';
import { openCapture, registerCheckCapture, stopStream } from '../speech/mic';
import { midi } from '../speech/midi';
import { Icon } from './icons';

type Lang = 'en' | 'he';

const params = () => (typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams());
/** Simulated microphone: the simulator and automated runs (unless ?realcheck). */
export const simulatedCheck = () => {
  const p = params();
  if (p.has('realcheck')) return false;
  return p.has('sim') || (typeof navigator !== 'undefined' && !!navigator.webdriver);
};
/** The watchdog stays quiet in automated runs (they play no input) unless ?watchdog is in the address. */
const watchdogOn = () => !(typeof navigator !== 'undefined' && navigator.webdriver) || params().has('watchdog');

const TX = {
  en: {
    listening: 'Listening…',
    gotIt: 'Got it',
    test: 'Test the mic',
    hit: 'Hit',
    noDevice: 'No MIDI device',
    keysLabel: 'Keys:',
    padsLabel: 'Pads:',
    mic: 'Microphone',
    hints: {
      permission: 'Allow the microphone (the icon in the address bar).',
      device: 'Nothing reaches the mic. Check the input device.',
      volume: 'Too quiet. Play louder or move closer.',
      plug: 'Plug in your MIDI device, or switch to the microphone.',
      'midi-device': 'No notes yet. Check the device in MIDI settings.',
      unsupported: 'This browser can’t use it here. Try Chrome.',
    } as Record<NonNullable<InputHint>, string>,
    settings: 'Settings',
    micSettings: 'Microphone and calibration settings',
    midiSettings: 'MIDI settings',
    midiLink: 'MIDI',
    midiWhy: 'Turn on MIDI for the full analysis: the microphone hears pitch and timing only.',
    notHeard: 'We don’t hear you',
    fix: 'Fix it',
  },
  he: {
    listening: 'מקשיבים…',
    gotIt: 'קלטנו',
    test: 'לבדוק מיקרופון',
    hit: 'מכה',
    noDevice: 'אין התקן MIDI',
    keysLabel: 'מקלדת:',
    padsLabel: 'פדים:',
    mic: 'מיקרופון',
    hints: {
      permission: 'אשרו את המיקרופון (הסמל בשורת הכתובת).',
      device: 'שום צליל לא מגיע למיקרופון. בדקו את התקן הקלט.',
      volume: 'שקט מדי. נגנו חזק יותר או התקרבו.',
      plug: 'חברו את התקן ה־MIDI, או עברו למיקרופון.',
      'midi-device': 'עוד לא הגיעו צלילים. בדקו את ההתקן בהגדרות MIDI.',
      unsupported: 'הדפדפן הזה לא תומך בזה כאן. נסו את Chrome.',
    } as Record<NonNullable<InputHint>, string>,
    settings: 'הגדרות',
    micSettings: 'הגדרות מיקרופון וכיול',
    midiSettings: 'הגדרות MIDI',
    midiLink: 'MIDI',
    midiWhy: 'הדליקו MIDI לניתוח המלא: המיקרופון שומע רק גובה ותזמון.',
    notHeard: 'אנחנו לא שומעים אתכם',
    fix: 'לתקן',
  },
};

/** Where each input's settings live (SettingsScreen groups: the mic picker + calibration, MIDI + its calibration). */
export const settingsHref = (mode: InputCheckMode) => (isMidiMode(mode) ? '#/settings/midi' : '#/settings/input');

interface MicState {
  bars: number;
  note: number | null;
  gotIt: boolean;
  peak: number;
  error: string | null;
  flash: number;
}

/** The microphone side: a real capture (released on unmount or when a take opens the mic), or a simulated one. */
function useMicCheck(drums: boolean, run: boolean): MicState & { started: boolean; startedAt: number } {
  const [s, setS] = useState<MicState>({ bars: 0, note: null, gotIt: false, peak: 0, error: null, flash: 0 });
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => {
    if (!run) return;
    let alive = true;
    setStartedAt(performance.now());
    const det = new SignalDetector(drums);
    let flash = 0;
    if (simulatedCheck()) {
      // A short simulated phrase: the meter rises, a note (or a hit) is heard, then the room is quiet again.
      let t = 0;
      const id = window.setInterval(() => {
        if (!alive) return;
        t += 80;
        const on = t > 300 && t < 1300;
        const f = { t, hz: on && !drums ? 440 : null, confidence: on ? 0.95 : 0, rms: on ? (drums ? (t % 400 < 90 ? 0.2 : 0.004) : 0.06) : 0.002 };
        const r = det.feed(f);
        if (r === 'hit') flash++;
        setS({ bars: meterBars(f.rms), note: det.note, gotIt: det.gotIt, peak: det.peak, error: null, flash });
        if (t > 1600) window.clearInterval(id);
      }, 80);
      return () => {
        alive = false;
        window.clearInterval(id);
      };
    }
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let timer = 0;
    const release = () => {
      window.clearInterval(timer);
      stopStream(stream);
      stream = null;
      void ctx?.close().catch(() => {});
      ctx = null;
    };
    void openCapture({ echoCancellation: false, noiseSuppression: false, autoGainControl: false }, { check: true }).then((r) => {
      if (!r.ok) {
        if (alive) setS((x) => ({ ...x, error: r.error.code }));
        return;
      }
      if (!alive) return stopStream(r.stream);
      stream = r.stream;
      registerCheckCapture(() => {
        alive = false;
        release();
      });
      ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      ctx.createMediaStreamSource(r.stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      const sr = ctx.sampleRate;
      const t0 = performance.now();
      timer = window.setInterval(() => {
        if (!alive) return;
        an.getFloatTimeDomainData(buf);
        const y = yin(buf, sr, { minRms: 0.008 });
        const res = det.feed({ t: performance.now() - t0, hz: y.hz, confidence: y.confidence, rms: y.rms });
        if (res === 'hit') flash++;
        setS({ bars: meterBars(y.rms), note: det.note, gotIt: det.gotIt, peak: det.peak, error: null, flash });
      }, 40);
    });
    return () => {
      alive = false;
      registerCheckCapture(null);
      release();
    };
  }, [drums, run]);
  return { ...s, started: run, startedAt };
}

/** Whether the microphone may open without a prompt: granted → listen at once; otherwise wait for a tap. */
function useMicGranted(): boolean | null {
  const [g, setG] = useState<boolean | null>(() => (simulatedCheck() ? true : null));
  useEffect(() => {
    if (g) return;
    let alive = true;
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!perms?.query) return void setG(false);
    perms
      .query({ name: 'microphone' as PermissionName })
      .then((st) => alive && setG(st.state === 'granted'))
      .catch(() => alive && setG(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return g;
}

interface MidiState {
  devices: string[];
  last: { note: number; vel: number } | null;
  blink: number;
}

function useMidiCheck(run: boolean): MidiState & { startedAt: number; supported: boolean } {
  const [s, setS] = useState<MidiState>({ devices: [...midi.devices], last: null, blink: 0 });
  const [startedAt] = useState(() => performance.now());
  useEffect(() => {
    if (!run) return;
    let alive = true;
    const offState = midi.onState(() => alive && setS((x) => ({ ...x, devices: [...midi.devices] })));
    const offNote = midi.onNote((note, on, _at, vel) => {
      if (on && alive) setS((x) => ({ ...x, last: { note, vel }, blink: x.blink + 1 }));
    });
    if (midi.supported)
      void midi
        .enable()
        .then((d) => alive && setS((x) => ({ ...x, devices: [...d] })))
        .catch(() => {});
    return () => {
      alive = false;
      offState();
      offNote();
    };
  }, [run]);
  return { ...s, startedAt, supported: midi.supported };
}

/** A ticking clock (ms since mount) until `stop`, for the quiet-wait hint. */
function useElapsed(from: number, stop: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (stop) return;
    const id = window.setInterval(() => setNow(performance.now()), 500);
    return () => window.clearInterval(id);
  }, [stop]);
  return from ? now - from : 0;
}

/** Latin product words ("MIDI", "Chrome") inside a sentence, isolated in <bdi> so a Hebrew line keeps its order. */
function MidiWord({ text }: { text: string }) {
  const parts = text.split(/(MIDI|Chrome)/);
  return <>{parts.map((p, i) => (i % 2 ? <bdi key={i}>{p}</bdi> : p))}</>;
}

function Meter({ bars }: { bars: number }) {
  return (
    <span className="ic-meter" aria-hidden="true" dir="ltr">
      {Array.from({ length: METER_BARS }, (_, i) => (
        <i key={i} className={i < bars ? 'on' : ''} style={{ height: `${30 + (70 * (i + 1)) / METER_BARS}%` }} />
      ))}
    </span>
  );
}

function Led({ n }: { n: number }) {
  // Keyed on the count so each note-on restarts the blink.
  return <span key={n} className={`ic-led ${n > 0 ? 'blink' : ''}`} aria-hidden="true" data-ic-led={n} />;
}

function Links({ mode, lang, alsoMidi }: { mode: InputCheckMode; lang: Lang; alsoMidi?: boolean }) {
  const tx = TX[lang];
  return (
    <span className="ic-links">
      {alsoMidi && !isMidiMode(mode) && (
        <a className="ic-link" href="#/settings/midi" title={tx.midiWhy} aria-label={tx.midiWhy} data-ic-link="midi">
          <bdi>{tx.midiLink}</bdi>
        </a>
      )}
      <a className="ic-gear" href={settingsHref(mode)} aria-label={isMidiMode(mode) ? tx.midiSettings : tx.micSettings} title={isMidiMode(mode) ? tx.midiSettings : tx.micSettings} data-ic-link={isMidiMode(mode) ? 'midi' : 'input'}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </a>
    </span>
  );
}

/**
 * The strip. `mode`: what the exercise listens to. `alsoMidi`: offer the MIDI settings next to a microphone hint (a
 * piano item: MIDI gives the full analysis). Always one row.
 */
export function InputCheck({ mode, lang, alsoMidi = false, className = '', noteName }: { mode: InputCheckMode; lang: Lang; alsoMidi?: boolean; className?: string; /** MIDI: names the last note (a kit's pad) instead of the note name. */ noteName?: (midi: number) => string }) {
  const midiMode = isMidiMode(mode);
  return midiMode ? <MidiStrip mode={mode} lang={lang} className={className} noteName={noteName} /> : <MicStrip mode={mode} lang={lang} alsoMidi={alsoMidi} className={className} />;
}

function MicStrip({ mode, lang, alsoMidi, className }: { mode: InputCheckMode; lang: Lang; alsoMidi: boolean; className: string }) {
  const tx = TX[lang];
  const drums = isDrumMode(mode);
  const granted = useMicGranted();
  const [asked, setAsked] = useState(false);
  const run = !!granted || asked;
  const m = useMicCheck(drums, run);
  const elapsed = useElapsed(m.startedAt, m.gotIt || !run);
  const hint = run ? hintFor({ mode, gotIt: m.gotIt, elapsed, error: m.error, peak: m.peak }) : null;
  const state = m.gotIt ? 'got' : hint ? 'hint' : run ? 'listening' : 'idle';
  return (
    <div className={`input-check ${className}`} data-input-check={mode} data-ic-state={state} data-ic-sim={simulatedCheck() ? '1' : undefined} role="status" aria-live="polite">
      <span className="ic-icon" aria-hidden="true">
        <Icon k="mic" size={18} />
      </span>
      {drums ? <Led n={m.flash} /> : null}
      <Meter bars={m.bars} />
      <span className="ic-line">
        {!run ? (
          <button type="button" className="ic-test" onClick={() => setAsked(true)} data-ic-test="1">
            {tx.test}
          </button>
        ) : m.gotIt ? (
          <>
            <Icon k="check" size={16} className="ic-check" />
            <b>{tx.gotIt}</b>
            {!drums && m.note !== null && (
              <bdi className="ic-note" dir="ltr">
                {noteLabel(m.note)}
              </bdi>
            )}
          </>
        ) : hint ? (
          <span className="ic-hint" data-ic-hint={hint}>
            <MidiWord text={tx.hints[hint]} />
          </span>
        ) : (
          <span className="ic-dim">{tx.listening}</span>
        )}
      </span>
      <Links mode={mode} lang={lang} alsoMidi={alsoMidi} />
    </div>
  );
}

function MidiStrip({ mode, lang, className, noteName }: { mode: InputCheckMode; lang: Lang; className: string; noteName?: (midi: number) => string }) {
  const tx = TX[lang];
  const m = useMidiCheck(true);
  const gotIt = !!m.last;
  const elapsed = useElapsed(m.startedAt, gotIt);
  const hint = hintFor({ mode, gotIt, elapsed, devices: m.devices.length, midiSupported: m.supported });
  const drums = isDrumMode(mode);
  const state = gotIt ? 'got' : hint ? 'hint' : 'listening';
  return (
    <div className={`input-check midi ${className}`} data-input-check={mode} data-ic-state={state} data-ic-notes={m.blink} role="status" aria-live="polite">
      <Led n={m.blink} />
      {m.devices.length ? (
        <span className="ic-dev" data-ic-dev="1">
          <span className="ic-dev-label">{drums ? tx.padsLabel : tx.keysLabel}</span> <bdi>{m.devices.join(', ')}</bdi>
        </span>
      ) : hint ? null : (
        // No device: the hint (after a quiet wait) says what to do, so the bare "no device" line gives way to it.
        <span className="ic-dev">
          <MidiWord text={tx.noDevice} />
        </span>
      )}
      <span className="ic-line">
        {gotIt && m.last ? (
          <>
            <Icon k="check" size={16} className="ic-check" />
            <b>{tx.gotIt}</b>
            <bdi className="ic-note" dir="ltr" data-ic-last={m.last.note}>
              {noteName ? noteName(m.last.note) : drums ? tx.hit : noteLabel(m.last.note)}
            </bdi>
            <span className="ic-vel" aria-label={`velocity ${m.last.vel}`} dir="ltr">
              <i style={{ width: `${Math.round((m.last.vel / 127) * 100)}%` }} />
            </span>
          </>
        ) : hint ? (
          <span className="ic-hint" data-ic-hint={hint}>
            <MidiWord text={tx.hints[hint]} />
          </span>
        ) : (
          <span className="ic-dim">{tx.listening}</span>
        )}
      </span>
      <Links mode={mode} lang={lang} />
    </div>
  );
}

/**
 * The in-take watchdog. `arm`: when the take began listening and when its first note was expected (performance time;
 * null while the count-in is still running). Shows a small non-blocking banner when nothing arrived WATCHDOG_MS after
 * the first expected note; it goes away as soon as any input arrives.
 */
export function InputWatchdog({ lang, mode, arm }: { lang: Lang; mode: InputCheckMode; arm: { start: number; due: number | null } | null }) {
  const tx = TX[lang];
  const [show, setShow] = useState(false);
  const armRef = useRef(arm);
  armRef.current = arm;
  useEffect(() => {
    if (!arm || !watchdogOn()) {
      setShow(false);
      return;
    }
    const check = () => {
      const a = armRef.current;
      setShow(!!a && watchdogDue(performance.now(), a.due, lastInputAt(), a.start));
    };
    const id = window.setInterval(check, 250);
    const off = onInput(() => setShow(false));
    check();
    return () => {
      window.clearInterval(id);
      off();
    };
  }, [arm?.start, arm?.due]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  return (
    <div className="input-watchdog" role="status" aria-live="polite" data-input-watchdog={mode}>
      <span className="ic-led warn" aria-hidden="true" />
      <b>{tx.notHeard}</b>
      <a className="ic-link" href={settingsHref(mode)}>
        {tx.fix}
      </a>
    </div>
  );
}

