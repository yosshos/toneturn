// Tuner (spec AE §7): chromatic or per-instrument presets, cents needle, reference tones, A4 calibration.
// The microphone is opened only while this screen is open; nothing is recorded.

import { useEffect, useMemo, useRef, useState } from 'react';
import { courseInstrumentOf, type Settings } from '../storage/progress';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { MidiPitchCapture } from '../speech/midi';
import { listenLoop } from './Flight';
import { inTune, midiToHzA, presetById, TUNER_PRESETS, TunerSmoother, tunerReading } from '../engine/tuner';
import { piano } from './services';
import type { AccessError } from '../game/adapters';

type Lang = 'he' | 'en';
const TX = {
  en: { title: 'Tuner', back: 'Back', preset: 'Instrument', listen: 'Play a note…', inTune: 'In tune', sharp: 'Too high — loosen', flat: 'Too low — tighten', a4: 'Calibration A4', play: 'Reference', auto: 'Auto', micOff: 'The microphone is not available. Allow it for this site and try again.', retry: 'Try again', hz: 'Hz', cents: 'cents', strings: 'Strings', tip: 'Pluck one string at a time and let it ring. Tap a string to hear its reference or to lock it.' },
  he: { title: 'טיונר', back: 'חזרה', preset: 'כלי', listen: 'נגנו צליל…', inTune: 'מכוון', sharp: 'גבוה מדי — לשחרר', flat: 'נמוך מדי — להדק', a4: 'כיול לה4', play: 'צליל ייחוס', auto: 'אוטומטי', micOff: 'המיקרופון לא זמין. אפשרו אותו לאתר ונסו שוב.', retry: 'לנסות שוב', hz: 'הרץ', cents: 'סנט', strings: 'מיתרים', tip: 'פרטו מיתר אחד בכל פעם ותנו לו להדהד. הקישו על מיתר כדי לשמוע צליל ייחוס או לנעול אותו.' },
};
const NAMES_EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const NAMES_SOL = ['דו', 'דו♯', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const noteName = (m: number, sol: boolean) => `${(sol ? NAMES_SOL : NAMES_EN)[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

export function Tuner({ lang, settings, onChange, onBack }: { lang: Lang; settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void }) {
  const tx = TX[lang];
  const preset = presetById(settings.tunerPreset ?? (courseInstrumentOf(settings) === 'bass' ? 'bass' : courseInstrumentOf(settings) === 'guitar' ? 'guitar' : 'chromatic'));
  const a4 = settings.a4 ?? 440;
  const sol = settings.naming === 'solfege' || (settings.naming === 'auto' && lang === 'he');
  const [lock, setLock] = useState<number | null>(null);
  const [read, setRead] = useState<{ target: number; cents: number; string: number | null; hz: number; stable: boolean } | null>(null);
  const [err, setErr] = useState<AccessError | null>(null);
  const [run, setRun] = useState(0);
  const smoother = useMemo(() => new TunerSmoother(), []);
  const lastVoiced = useRef(0);
  const presetRef = useRef(preset);
  const lockRef = useRef(lock);
  presetRef.current = preset;
  lockRef.current = lock;

  useEffect(() => {
    const ac = new AbortController();
    const cap = settings.midiInput ? new MidiPitchCapture() : new BrowserPitchCapture();
    setErr(null);
    void listenLoop(cap, ac.signal, (f) => {
      const now = performance.now();
      if (!f.hz || f.confidence < 0.85) {
        if (now - lastVoiced.current > 1500) {
          smoother.reset();
          setRead(null);
        }
        return;
      }
      lastVoiced.current = now;
      const m = 69 + 12 * Math.log2(f.hz / a4);
      const s = smoother.push(m, now);
      const hz = a4 * 2 ** ((s.m - 69) / 12);
      const r = tunerReading(hz, a4, presetRef.current, lockRef.current);
      setRead({ ...r, hz, stable: s.stable });
    }).then((e) => e && setErr(e));
    return () => ac.abort();
  }, [a4, settings.midiInput, smoother, run]);

  const reference = (m: number) => {
    void piano.play([{ midi: m, start: 0, duration: 1.6, velocity: 0.7 }], 1.8, new AbortController().signal).catch(() => {});
  };
  void midiToHzA;
  const cents = read?.cents ?? 0;
  const ok = read ? inTune(cents) : false;
  const angle = Math.max(-50, Math.min(50, cents)) * 0.9;

  return (
    <main className="tuner-screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">‹</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <label className="tuner-preset">
        <span>{tx.preset}</span>
        <select value={preset.id} onChange={(e) => (setLock(null), onChange({ tunerPreset: e.target.value }))}>
          {TUNER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name[lang]}
            </option>
          ))}
        </select>
      </label>
      {err ? (
        <div className="perm-panel" role="alert">
          <p>{tx.micOff}</p>
          <button className="btn primary" onClick={() => setRun((x) => x + 1)}>
            {tx.retry}
          </button>
        </div>
      ) : (
        <section className={`tuner-dial ${read ? (ok ? 'ok' : 'off') : 'idle'} ${read?.stable && ok ? 'locked' : ''}`} aria-live="polite">
          <svg viewBox="0 0 240 140" className="dial" aria-hidden="true">
            <path d="M20 125 A100 100 0 0 1 220 125" className="dial-arc" />
            <path d="M108 26 A100 100 0 0 1 132 26" className="dial-zone" />
            {[-50, -25, 0, 25, 50].map((c) => {
              const a = ((c * 0.9 - 90) * Math.PI) / 180;
              return <line key={c} x1={120 + 92 * Math.cos(a)} y1={125 + 92 * Math.sin(a)} x2={120 + 102 * Math.cos(a)} y2={125 + 102 * Math.sin(a)} className="dial-tick" />;
            })}
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '120px 125px', transition: 'transform 120ms linear' }}>
              <line x1={120} y1={125} x2={120} y2={36} className="needle" />
            </g>
            <circle cx={120} cy={125} r={6} className="needle-hub" />
          </svg>
          <div className="tuner-note" dir="ltr">{read ? noteName(read.target, sol) : '—'}</div>
          <div className="tuner-cents" dir="ltr">
            {read ? `${cents > 0 ? '+' : ''}${cents} ${tx.cents} · ${read.hz.toFixed(1)} ${tx.hz}` : tx.listen}
          </div>
          <p className="tuner-verdict">{read ? (ok ? tx.inTune : cents > 0 ? `▲ ${tx.sharp}` : `▼ ${tx.flat}`) : ''}</p>
        </section>
      )}
      {preset.strings.length > 0 && (
        <section className="tuner-strings" aria-label={tx.strings}>
          <button className={`chip ${lock === null ? 'on' : ''}`} onClick={() => setLock(null)}>
            {tx.auto}
          </button>
          <div className="string-row" dir="ltr">
            {preset.strings.map((m, i) => (
              <button
                key={i}
                className={`string-chip ${read?.string === i ? 'active' : ''} ${lock === i ? 'on' : ''} ${read?.string === i && ok ? 'ok' : ''}`}
                onClick={() => {
                  setLock(i);
                  reference(m);
                }}
                aria-label={`${noteName(m, sol)} — ${tx.play}`}
              >
                {noteName(m, sol)}
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="field-hint">{tx.tip}</p>
      <label className="tuner-a4">
        <span>{tx.a4}</span>
        <input type="range" min={430} max={450} step={1} value={a4} onChange={(e) => onChange({ a4: Number(e.target.value) })} />
        <b dir="ltr">{a4} Hz</b>
      </label>
    </main>
  );
}
