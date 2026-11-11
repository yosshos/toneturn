// Sound quality and live-play latency (0.69, SOUND_LIVE_SESSION.md Phases 0–1): the Settings choices (Sound → quality,
// MIDI → live play latency), the Bluetooth warning, and the Diagnostics card (decoded memory, output timing, a tap test).

import { useEffect, useRef, useState } from 'react';
import { autoTier, BLUETOOTH_MS, deviceFacts, isIOS, qualityOf, TIERS, wirelessName, type SoundQuality, type SoundTier } from '../audio/quality';
import { latencyFrom } from '../engine/latency';
import type { Settings } from '../storage/progress';
import { piano } from './services';
import { midi } from '../speech/midi';

type Lang = 'en' | 'he';

const TIER_NAME: Record<SoundTier, { en: string; he: string }> = {
  lite: { en: 'Lite', he: 'קל' },
  standard: { en: 'Standard', he: 'רגיל' },
  studio: { en: 'Studio', he: 'אולפן' },
};
/** One line per choice: what it keeps. */
const TIER_LINE: Record<SoundTier, { en: string; he: string }> = {
  lite: { en: 'Up to ~150 MB: 4 piano dynamics, shorter notes, for older phones and Data Saver.', he: 'עד כ־150MB: 4 עוצמות פסנתר וצלילים קצרים יותר — לטלפונים ישנים ולחיסכון בנתונים.' },
  standard: { en: 'Up to ~300 MB: 5 piano dynamics, 6-second notes — every phone and tablet.', he: 'עד כ־300MB: 5 עוצמות פסנתר וצלילים של 6 שניות — לכל טלפון וטאבלט.' },
  studio: { en: 'The full recordings: 16 piano dynamics, every note to its end (~1.5 GB) — computers.', he: 'ההקלטות המלאות: 16 עוצמות פסנתר, כל צליל עד סופו (כ־1.5GB) — למחשב.' },
};

/** Settings → Sound → quality. */
export function SoundQualitySetting({ lang, s, onChange }: { lang: Lang; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  const he = lang === 'he';
  const value = qualityOf(s);
  const auto = autoTier(deviceFacts());
  const tier = value === 'auto' ? auto : value;
  const [mem, setMem] = useState(() => piano.soundMemory());
  const [ready, setReady] = useState(piano.grandReady);
  useEffect(() => {
    const id = setInterval(() => {
      setMem(piano.soundMemory());
      setReady(piano.grandReady);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const opts: [SoundQuality, string][] = [
    ['auto', `${he ? 'אוטומטי' : 'Automatic'} (${TIER_NAME[auto][lang]})`],
    ['lite', TIER_NAME.lite[lang]],
    ['standard', TIER_NAME.standard[lang]],
    ['studio', TIER_NAME.studio[lang]],
  ];
  const phoneStudio = tier === 'studio' && isIOS(deviceFacts());
  return (
    <section className="set-card" data-sound-quality={tier}>
      <h2>{he ? 'איכות הצליל' : 'Sound quality'}</h2>
      <p className="field-hint">{TIER_LINE[tier][lang]}</p>
      <div className="chips" role="radiogroup" aria-label={he ? 'איכות הצליל' : 'Sound quality'}>
        {opts.map(([id, label]) => (
          <button key={id} role="radio" aria-checked={value === id} className={`chip ${value === id ? 'on' : ''}`} onClick={() => onChange({ soundQuality: id, pianoDetail: undefined })} data-sound-quality-opt={id}>
            {label}
          </button>
        ))}
      </div>
      {phoneStudio && <p className="field-hint warn">{he ? 'בטלפון, "אולפן" עלול לגרום לדפדפן לסגור את האפליקציה מחוסר זיכרון.' : 'On a phone, Studio can make the browser close the app for lack of memory.'}</p>}
      <small className="field-hint" dir="auto" data-sound-mem={Math.round(mem.totalMB)}>
        {he ? `בזיכרון עכשיו: ${Math.round(mem.totalMB)}MB מתוך ${mem.budgetMB}MB` : `In memory now: ${Math.round(mem.totalMB)} of ${mem.budgetMB} MB`}
        {(s.sound ?? 'grand') === 'grand' && ready.total > 0 ? (he ? ` · שכבות הפסנתר: ${ready.loaded} מתוך ${ready.total}` : ` · piano layers ready: ${ready.loaded} of ${ready.total}`) : ''}
      </small>
    </section>
  );
}

/** The output's name and reported delay; whether it looks like Bluetooth (≥ 150 ms, or a wireless device name). */
export function useOutputCheck(sinkId: string | null | undefined) {
  const [label, setLabel] = useState<string | null>(null);
  const [info, setInfo] = useState(() => piano.latencyInfo());
  useEffect(() => {
    let live = true;
    const read = async () => {
      setInfo(piano.latencyInfo());
      try {
        const all = await navigator.mediaDevices?.enumerateDevices?.();
        const outs = (all ?? []).filter((d) => d.kind === 'audiooutput');
        const d = outs.find((x) => x.deviceId === (sinkId || 'default')) ?? outs[0];
        if (live) setLabel(d?.label || null);
      } catch {
        /* no device list: the reported delay alone decides */
      }
    };
    void read();
    const id = setInterval(() => void read(), 3000);
    navigator.mediaDevices?.addEventListener?.('devicechange', read);
    return () => {
      live = false;
      clearInterval(id);
      navigator.mediaDevices?.removeEventListener?.('devicechange', read);
    };
  }, [sinkId]);
  const total = info.outputMs !== null ? info.outputMs + (info.baseMs ?? 0) : null;
  const wireless = (total !== null && total >= BLUETOOTH_MS) || (!!label && wirelessName(label));
  return { label, info, totalMs: total, wireless };
}

export function BluetoothWarning({ lang, sinkId }: { lang: Lang; sinkId: string | null | undefined }) {
  const he = lang === 'he';
  const o = useOutputCheck(sinkId);
  if (!o.wireless) return null;
  return (
    <p className="field-hint warn" role="status" data-bt-warning="1">
      {he
        ? `נראה שהצליל יוצא לאוזניות או רמקול בלוטות׳${o.totalMs !== null ? ` (השהיה מדווחת ${Math.round(o.totalMs)}ms)` : ''}. בלוטות׳ מוסיף 150–300ms — הקלידים יישמעו באיחור. לנגינה חיה חברו אוזניות בכבל או את הרמקולים של המכשיר.`
        : `The sound seems to go to Bluetooth headphones or a speaker${o.totalMs !== null ? ` (reported delay ${Math.round(o.totalMs)} ms)` : ''}. Bluetooth adds 150–300 ms, so your keys will sound late. For live playing, use wired headphones or the device's own speakers.`}
    </p>
  );
}

/** Settings → MIDI: live play latency (the AudioContext latency hint), with the iOS and Bluetooth notes. */
export function LiveLatencySetting({ lang, s, onChange }: { lang: Lang; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  const he = lang === 'he';
  const v = s.audioLatency ?? 'auto';
  const [pending, setPending] = useState(piano.latencyPending);
  useEffect(() => setPending(piano.latencyPending), [v]);
  const ios = isIOS(deviceFacts());
  return (
    <div className="live-latency" data-live-latency={v}>
      <div className="chips" role="radiogroup" aria-label={he ? 'השהיית נגינה חיה' : 'Live play latency'}>
        <span className="mt-label">{he ? 'השהיית נגינה חיה' : 'Live play latency'}</span>
        {(['auto', 'low'] as const).map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={v === id}
            className={`chip ${v === id ? 'on' : ''}`}
            onClick={() => {
              piano.setLatencyMode(id);
              onChange({ audioLatency: id });
              setPending(piano.latencyPending);
            }}
            data-live-latency-opt={id}
          >
            {id === 'auto' ? (he ? 'רגילה' : 'Normal') : he ? 'נמוכה' : 'Low'}
          </button>
        ))}
      </div>
      <p className="field-hint">
        {ios
          ? he
            ? 'באייפון ובאייפד הדפדפן קובע את ההשהיה בעצמו (בדרך כלל נמוכה), ולכן ההגדרה הזו לא משנה שם.'
            : 'On iPhone and iPad the browser sets the delay itself (usually low), so this has no effect there.'
          : he
            ? 'נמוכה: הדפדפן משמיע עם החוצץ הקטן ביותר — הקלידים מגיבים מהר יותר. אם שומעים קליקים או קטיעות, חזרו לרגילה.'
            : 'Low asks the browser for its smallest buffer, so keys answer sooner. If you hear clicks or dropouts, go back to Normal.'}
      </p>
      {pending && (
        <p className="field-hint" role="status">
          {he ? 'ייכנס לתוקף אחרי טעינה מחדש.' : 'Applies after a reload.'}{' '}
          <button className="btn ghost small" onClick={() => location.reload()} data-live-latency-reload="1">
            {he ? 'לטעון מחדש' : 'Reload'}
          </button>
        </p>
      )}
      <BluetoothWarning lang={lang} sinkId={s.audioOutput} />
    </div>
  );
}

/** iPhone / iPad: no browser there reads MIDI (Safari has no Web MIDI) — said up front, not only after a failed try. */
export function MidiIosNote({ lang }: { lang: Lang }) {
  const he = lang === 'he';
  if (midi.supported || !isIOS(deviceFacts())) return null;
  return (
    <p className="field-hint warn" role="note" data-midi-ios="1">
      {he
        ? 'באייפון ובאייפד אין עדיין דפדפן שקורא מקלדת MIDI (ל־Safari אין Web MIDI). נגנו בכפתורים שעל המסך או במיקרופון, או פתחו את האפליקציה במחשב או באנדרואיד ב־Chrome.'
        : 'iPhone and iPad have no browser that reads a MIDI keyboard yet (Safari has no Web MIDI). Play with the on-screen buttons or the microphone, or open the app on a computer or Android in Chrome.'}
    </p>
  );
}

const TEST_BPM = 60; // slow: a 300 ms Bluetooth delay still lands nearer its own click than the next
const TEST_N = 10;

/** Diagnostics → Sound: the tier and decoded memory, the output's timing, and a tap-along latency test. */
export function SoundDiagnostics({ lang, sinkId }: { lang: Lang; sinkId?: string | null }) {
  const he = lang === 'he';
  const [mem, setMem] = useState(() => piano.soundMemory());
  const out = useOutputCheck(sinkId);
  const [state, setState] = useState<'idle' | 'run' | 'done' | 'none'>('idle');
  const [beat, setBeat] = useState(-1);
  const [res, setRes] = useState<{ tapMs: number; outMs: number; totalMs: number; sd: number } | null>(null);
  const taps = useRef<number[]>([]);
  const ac = useRef<AbortController | null>(null);
  useEffect(() => {
    const id = setInterval(() => setMem(piano.soundMemory()), 1000);
    return () => {
      clearInterval(id);
      ac.current?.abort();
    };
  }, []);
  // Tap (or press a MIDI key) on every click. The taps are compared with when the click was *scheduled*, so the
  // result is the whole loop a live player feels: output delay (incl. Bluetooth the system hides) + input + you.
  const run = async () => {
    await piano.unlock();
    taps.current = [];
    setRes(null);
    setState('run');
    const abort = new AbortController();
    ac.current = abort;
    const b = 60 / TEST_BPM;
    const tl = { clicks: Array.from({ length: TEST_N }, (_, i) => ({ t: i * b, accent: i % 4 === 0 })), wood: [], responseAt: 0, responseEnd: (TEST_N + 0.5) * b };
    const off = midi.onNote((_m, on, at) => on && taps.current.push(at));
    // playTimeline starts its first click 120 ms after "now": that is when it is scheduled (before any output delay)
    const scheduled = performance.now() + 120;
    try {
      const heard = await piano.playTimeline(tl, abort.signal, (i) => setBeat(i));
      const r = latencyFrom(scheduled, taps.current, TEST_BPM, 2);
      if (!r) setState('none');
      else {
        const outMs = Math.round(heard - scheduled);
        setRes({ tapMs: r.ms - outMs, outMs, totalMs: r.ms, sd: r.sd });
        setState('done');
      }
    } catch {
      setState('idle');
    } finally {
      off();
      setBeat(-1);
    }
  };
  const li = out.info;
  return (
    <section className="diag-card diag-sound" data-diag-sound="1">
      <h2>{he ? 'צליל: זיכרון והשהיה' : 'Sound: memory and latency'}</h2>
      <p>
        {he ? 'רמת איכות' : 'Quality tier'}: <b>{TIER_NAME[mem.tier][lang]}</b> ({mem.quality === 'auto' ? (he ? 'אוטומטי' : 'automatic') : he ? 'נבחר' : 'chosen'}) · {he ? 'פענוח' : 'decode'} <span dir="ltr">{mem.rate ? `${mem.rate / 1000} kHz` : '—'}</span>
      </p>
      <p data-diag-mem={Math.round(mem.totalMB)}>
        {he ? 'זיכרון צליל' : 'Decoded sound'}: <b dir="ltr">{mem.totalMB.toFixed(1)} MB</b> / <span dir="ltr">{mem.budgetMB} MB</span> · {he ? 'שיא' : 'peak'} <span dir="ltr">{mem.peakMB.toFixed(1)} MB</span>
      </p>
      {mem.sets.length > 0 && (
        <ul className="diag-sets" dir="ltr">
          {mem.sets.map((x) => (
            <li key={x.id}>
              {x.id}: {x.mb.toFixed(1)} MB · idle {x.idleS} s
            </li>
          ))}
        </ul>
      )}
      {mem.log.length > 0 && (
        <details>
          <summary>{he ? 'יומן טעינה' : 'Load log'}</summary>
          <ul className="diag-log" dir="ltr">
            {mem.log.slice(-25).map((e, i) => (
              <li key={i}>
                {(e.t / 1000).toFixed(1)}s {e.what} {e.id} {e.mb.toFixed(1)} MB{e.why ? ` (${e.why})` : ''} → {e.totalMb} MB
              </li>
            ))}
          </ul>
        </details>
      )}
      <p dir="auto">
        {he ? 'יציאה' : 'Output'}: {out.label ?? (he ? 'לא ידוע' : 'unknown')} · <span dir="ltr">{li.sampleRate ? `${li.sampleRate / 1000} kHz` : '—'}</span> · {he ? 'השהיה מדווחת' : 'reported delay'}{' '}
        <span dir="ltr">{out.totalMs !== null ? `${Math.round(out.totalMs)} ms` : li.baseMs !== null ? `${li.baseMs} ms (base)` : '—'}</span> · latencyHint <span dir="ltr">{li.mode === 'low' ? '0' : li.mode ? 'interactive' : '—'}</span>
      </p>
      <BluetoothWarning lang={lang} sinkId={sinkId} />
      <h3>{he ? 'בדיקת השהיה' : 'Latency test'}</h3>
      <p className="field-hint">{he ? `הקישו (או לחצו על קליד MIDI) על כל קליק — ${TEST_N} קליקים.` : `Tap (or press a MIDI key) on every click — ${TEST_N} clicks.`}</p>
      {state === 'run' ? (
        <button
          className={`tap-pad lat-pad ${beat % 2 ? 'odd' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            taps.current.push(e.timeStamp);
          }}
          data-diag-lat-pad="1"
        >
          {beat >= 0 ? beat + 1 : '·'}
        </button>
      ) : (
        <button className="btn primary small" onClick={() => void run()} data-diag-lat-start="1">
          {he ? 'להתחיל' : 'Start'}
        </button>
      )}
      {res && (
        <p aria-live="polite" data-diag-lat-total={res.totalMs}>
          {he ? 'מהקליק עד ההקשה שלכם' : 'Click to your tap'}: <b dir="ltr">{res.totalMs} ms</b> (±{res.sd}) · {he ? 'מתוכם יציאת הצליל לפי הדפדפן' : 'of which the browser reports for output'} <span dir="ltr">{res.outMs} ms</span>
          {res.totalMs >= BLUETOOTH_MS && <span className="field-hint warn"> — {he ? 'השהיה גבוהה: לנגינה חיה השתמשו באוזניות בכבל.' : 'high: for live playing use wired headphones.'}</span>}
        </p>
      )}
      {state === 'none' && <p className="field-hint warn">{he ? 'לא נקלטו מספיק הקשות — נסו שוב.' : 'Not enough taps — try again.'}</p>}
      <small className="field-hint">{he ? `מגבלת הזיכרון לכל רמה: קל ${TIERS.lite.budgetMB}MB, רגיל ${TIERS.standard.budgetMB}MB, אולפן ${TIERS.studio.budgetMB}MB.` : `Memory cap per tier: Lite ${TIERS.lite.budgetMB} MB, Standard ${TIERS.standard.budgetMB} MB, Studio ${TIERS.studio.budgetMB} MB.`}</small>
    </section>
  );
}
