import { useEffect, useRef, useState } from 'react';
import { droneMidis, HoldTracker, readDegree, type DegreeReading } from '../engine/drone';
import { displayNote, pc, pcValue, type PitchClass } from '../engine/pitch';
import type { SungFrame } from '../engine/sing';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Strings } from '../i18n/strings';
import { namingFor, type Settings } from '../storage/progress';
import { piano, SIMULATED } from './services';

const KEYS = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];

/** Simulator: "sings" degrees 1–7 over the drone (for tests and demos without a microphone). */
function simulatedSinging(key: PitchClass, signal: AbortSignal, onFrame: (f: SungFrame) => void) {
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const base = 60 + pcValue(key); // tonic at or above middle C
  let t = 0;
  let i = 0;
  const timer = setInterval(() => {
    if (signal.aborted) return clearInterval(timer);
    const deg = Math.floor(i / 45) % 7; // ~1.5 s per degree at 30 fps
    const midi = base + steps[deg] + (i % 45 < 5 ? 0.6 : 0.03);
    onFrame({ t, hz: 440 * 2 ** ((midi - 69) / 12), confidence: 0.95, rms: 0.1 });
    t += 1 / 30;
    i++;
  }, 33);
}

export function DroneScreen({ t, settings, onBack }: { t: Strings; settings: Settings; onBack: () => void }) {
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const [keyName, setKeyName] = useState('C');
  const [fifth, setFifth] = useState(true);
  const [on, setOn] = useState(false);
  const [reading, setReading] = useState<DegreeReading | null>(null);
  const [found, setFound] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const key = pc(keyName);

  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    piano.stopDrone();
    setOn(false);
    setReading(null);
  };
  useEffect(() => stop, []);

  const start = async () => {
    await piano.unlock();
    piano.startDrone(droneMidis(key, fifth));
    setOn(true);
    setFound([]);
    setErr(null);
    const c = new AbortController();
    ctl.current = c;
    const tracker = new HoldTracker(key);
    const onFrame = (f: SungFrame) => {
      setReading(f.hz && f.confidence >= 0.8 ? readDegree(f.hz, key) : null);
      const d = tracker.push(f);
      if (d) {
        setFound([...tracker.found].sort());
        piano.cue(tracker.complete ? 'complete' : 'correct');
      }
    };
    if (SIMULATED) return simulatedSinging(key, c.signal, onFrame);
    const cap = new BrowserPitchCapture();
    // Keep listening in long chunks until stopped.
    while (!c.signal.aborted) {
      const r = await cap.sing({ signal: c.signal, maxMs: 120_000, silenceMs: 120_000, endSilenceMs: 120_000, onFrame });
      if (r.kind === 'error') {
        setErr(t.micBlocked);
        stop();
        return;
      }
      if (r.kind === 'aborted') return;
    }
  };

  const centsPos = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0;
  return (
    <main className="panel-screen drone">
      <header className="screen-head">
        <button
          className="icon-btn"
          onClick={() => {
            stop();
            onBack();
          }}
          aria-label={t.back}
        >
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.dronePractice}</h1>
      </header>
      <p className="field-hint">{t.droneHint}</p>
      <section className="set-card">
        <fieldset className="seg-field">
          <legend>{t.droneKey}</legend>
          <div className="seg" role="radiogroup" aria-label={t.droneKey}>
            {KEYS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={keyName === k} className={keyName === k ? 'on' : ''} disabled={on} onClick={() => setKeyName(k)}>
                {displayNote(pc(k), nm, lang)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="toggle-row">
          <input type="checkbox" checked={fifth} disabled={on} onChange={(e) => setFifth(e.target.checked)} />
          <span>{t.droneFifth}</span>
        </label>
      </section>
      <section className={`drone-live ${on ? 'on' : ''}`} aria-live="polite">
        <div className="drone-degree" data-degree={reading?.degree ?? ''}>
          {reading ? (reading.degree ?? '♯/♭') : '–'}
        </div>
        <div className="drone-meter" aria-hidden="true">
          <span className="mid" />
          <span className="needle" style={{ left: `${50 + centsPos}%` }} />
        </div>
        <p className="drone-cents" dir="ltr">
          {reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} ¢` : ''}
        </p>
        <ol className="drone-ladder" dir="ltr" aria-label={t.droneLadder}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <li key={d} className={found.includes(d) ? 'hit' : ''}>
              {d}
            </li>
          ))}
        </ol>
        {found.length === 7 && <p className="drone-done">🎉 {t.droneAll}</p>}
      </section>
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
      <button className={`btn mega ${on ? 'ghost' : ''}`} onClick={() => (on ? stop() : void start())}>
        {on ? `■ ${t.stop}` : `▶ ${t.startDrone}`}
      </button>
    </main>
  );
}
