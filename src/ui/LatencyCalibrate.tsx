// Input latency calibration (owner, 2026-11-07): play along with 16 clicks on the input you use — tap the screen,
// press a MIDI key, or clap / pluck into the microphone. The median offset after 4 warm-up clicks is saved for that
// input and removed from every timing judgement (rhythm, Highway, drills). An unsteady take is not saved.

import { useEffect, useRef, useState } from 'react';
import { latencyFrom, type LatencyResult, type LatencySource } from '../engine/latency';
import { piano } from './services';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';

type Lang = 'he' | 'en';
const T = {
  en: {
    title: 'Timing calibration',
    intro: 'Every device adds a small delay between what you play and when the app hears it. Play along with the clicks on the input you use, and the app removes that delay — so you are never marked late when you were on time.',
    src: { tap: 'Screen tap', midi: 'MIDI keyboard', mic: 'Microphone' } as Record<LatencySource, string>,
    how: { tap: 'Tap the pad on every click.', midi: 'Press any key on every click.', mic: 'Clap, or pluck one note, on every click.' } as Record<LatencySource, string>,
    start: 'Start (16 clicks)',
    listening: 'Play along… the first 4 clicks are a warm-up',
    saved: 'Saved',
    unsteady: 'Not steady enough to trust — try again, right on the click.',
    none: 'Not enough hits were heard — try again.',
    noMidi: 'No MIDI keyboard connected.',
    current: 'Current delay',
    reset: 'Reset',
    spread: 'spread',
    notSet: 'not calibrated',
  },
  he: {
    title: 'כיול תזמון',
    intro: 'כל מכשיר מוסיף השהיה קטנה בין מה שמנגנים לרגע שהאפליקציה שומעת. נגנו יחד עם הקליקים בקלט שבו אתם משתמשים, והאפליקציה תנכה את ההשהיה — כך לא תסומנו כמאחרים כשהייתם בזמן.',
    src: { tap: 'הקשה על המסך', midi: 'מקלדת MIDI', mic: 'מיקרופון' } as Record<LatencySource, string>,
    how: { tap: 'הקישו על המשטח בכל קליק.', midi: 'לחצו על קליד כלשהו בכל קליק.', mic: 'מחאו כף, או פרטו צליל אחד, בכל קליק.' } as Record<LatencySource, string>,
    start: 'להתחיל (16 קליקים)',
    listening: 'נגנו יחד… 4 הקליקים הראשונים הם חימום',
    saved: 'נשמר',
    unsteady: 'לא יציב מספיק כדי לסמוך עליו — נסו שוב, בדיוק על הקליק.',
    none: 'לא נשמעו מספיק הקשות — נסו שוב.',
    noMidi: 'אין מקלדת MIDI מחוברת.',
    current: 'ההשהיה הנוכחית',
    reset: 'איפוס',
    spread: 'פיזור',
    notSet: 'לא כויל',
  },
};

const BPM = 90;
const N = 16;

export interface LatencyValues {
  tapLatencyMs?: number;
  midiLatencyMs?: number;
  micLatencyMs?: number;
}
const KEY: Record<LatencySource, keyof LatencyValues> = { tap: 'tapLatencyMs', midi: 'midiLatencyMs', mic: 'micLatencyMs' };

export function LatencyCalibrate({ lang, values, onSave, sources = ['tap', 'midi', 'mic'], initial }: { lang: Lang; values: LatencyValues; onSave: (p: LatencyValues) => void; sources?: LatencySource[]; initial?: LatencySource }) {
  const tx = T[lang];
  const [src, setSrc] = useState<LatencySource>(initial ?? (midi.devices.length && sources.includes('midi') ? 'midi' : sources[0]));
  const [state, setState] = useState<'idle' | 'run' | 'done' | 'unsteady' | 'none'>('idle');
  const [beat, setBeat] = useState(-1);
  const [res, setRes] = useState<LatencyResult | null>(null);
  const onsets = useRef<number[]>([]);
  const ac = useRef<AbortController | null>(null);
  useEffect(() => () => ac.current?.abort(), []);

  const run = async () => {
    await piano.unlock();
    onsets.current = [];
    setRes(null);
    setState('run');
    const abort = new AbortController();
    ac.current = abort;
    const b = 60 / BPM;
    const tl = { clicks: Array.from({ length: N }, (_, i) => ({ t: i * b, accent: i % 4 === 0 })), wood: [], responseAt: 0, responseEnd: (N + 0.5) * b };
    let off: (() => void) | null = null;
    const mic = new AbortController();
    if (src === 'midi') off = midi.onNote((_m, on, at) => on && onsets.current.push(at));
    if (src === 'mic') {
      let floor = 1;
      let last = -1e9;
      let prev = 0;
      void listenLoop(new BrowserPitchCapture(), mic.signal, (f) => {
        const now = performance.now();
        floor = Math.min(floor * 1.02 + 0.0005, Math.max(0.002, f.rms));
        if (f.rms > Math.max(0.02, floor * 3) && f.rms > prev * 1.5 && now - last > 200) {
          onsets.current.push(now);
          last = now;
        }
        prev = f.rms;
      });
    }
    try {
      const first = await piano.playTimeline(tl, abort.signal, (i) => setBeat(i));
      const r = latencyFrom(first, onsets.current, BPM, 4);
      if (!r) setState('none');
      else {
        setRes(r);
        if (r.ok) {
          onSave({ [KEY[src]]: Math.max(-50, Math.min(400, r.ms)) });
          setState('done');
        } else setState('unsteady');
      }
    } catch {
      setState('idle');
    } finally {
      off?.();
      mic.abort();
      setBeat(-1);
    }
  };
  const cur = values[KEY[src]];
  return (
    <section className="latency-cal card set-card" data-latency={src}>
      <h2>⏱ {tx.title}</h2>
      <p className="field-hint">{tx.intro}</p>
      <div className="chips" role="radiogroup">
        {sources.map((x) => (
          <button key={x} role="radio" aria-checked={src === x} className={`chip ${src === x ? 'on' : ''}`} disabled={state === 'run'} onClick={() => (setSrc(x), setState('idle'), setRes(null))} data-lat-src={x}>
            {tx.src[x]}
          </button>
        ))}
      </div>
      <p className="lat-current">
        {tx.current}: <b dir="ltr">{cur === undefined ? tx.notSet : `${cur} ms`}</b>
        {cur !== undefined && (
          <button className="link" onClick={() => onSave({ [KEY[src]]: undefined })}>
            {tx.reset}
          </button>
        )}
      </p>
      {src === 'midi' && !midi.devices.length && <p className="field-hint warn">{tx.noMidi}</p>}
      <p>{tx.how[src]}</p>
      {state === 'run' ? (
        <>
          <p className="field-hint" aria-live="polite">
            {tx.listening}
          </p>
          <button
            className={`tap-pad lat-pad ${beat >= 0 && beat < 4 ? 'warm' : ''} ${beat % 2 ? 'odd' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (src === 'tap') onsets.current.push(e.timeStamp);
            }}
            data-lat-pad="1"
          >
            {beat >= 0 ? beat + 1 : '·'}
          </button>
        </>
      ) : (
        <button className="btn primary" onClick={() => void run()} disabled={src === 'midi' && !midi.devices.length} data-lat-start="1">
          ▶ {tx.start}
        </button>
      )}
      {res && (
        <p className={`lat-result ${state}`} aria-live="polite">
          {state === 'done' ? `✓ ${tx.saved}: ` : ''}
          <b dir="ltr">{res.ms} ms</b> · {tx.spread} <span dir="ltr">±{res.sd} ms</span>
          {state === 'unsteady' && <span className="field-hint warn"> — {tx.unsteady}</span>}
        </p>
      )}
      {state === 'none' && <p className="field-hint warn">{tx.none}</p>}
    </section>
  );
}
