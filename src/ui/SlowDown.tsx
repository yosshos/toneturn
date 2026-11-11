// Slow-down & loop (SPEC-0.48 §P3): open your own recording (it never leaves the device), slow it down without
// changing the pitch (the browser's preservesPitch), loop a passage A–B — for transcribing and learning by ear.

import { useEffect, useRef, useState } from 'react';

const TX = {
  en: { title: 'Slow down', pick: 'Open an audio file', hint: 'Your own recordings only. The file stays on this device.', speed: 'Speed', setA: 'Set A', setB: 'Set B', clear: 'Clear loop', back: 'Back', play: 'Play', pause: 'Pause', other: 'Another file', loop: 'Loop' },
  he: { title: 'האטה', pick: 'לפתוח קובץ שמע', hint: 'רק הקלטות שלכם. הקובץ נשאר במכשיר.', speed: 'מהירות', setA: 'נקודה A', setB: 'נקודה B', clear: 'לבטל לופ', back: 'חזרה', play: 'לנגן', pause: 'השהיה', other: 'קובץ אחר', loop: 'לופ' },
};
export const SPEEDS = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Peaks of an audio buffer for a small waveform (one max per column). */
export function peaks(buf: AudioBuffer, n: number): number[] {
  const d = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(d.length / n));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let k = i * step; k < Math.min(d.length, (i + 1) * step); k += 16) m = Math.max(m, Math.abs(d[k]));
    out.push(m);
  }
  const max = Math.max(0.0001, ...out);
  return out.map((x) => x / max);
}

/** The waveform with the A–B loop and the playhead; click to seek (shared with "My song", SPEC-MY-SONG). */
export function LoopWave({ wave, dur, t, a, b, onSeek, marks }: { wave: number[]; dur: number; t: number; a: number | null; b: number | null; onSeek: (s: number) => void; /** Section starts (s), drawn as thin lines. */ marks?: number[] }) {
  const frac = (x: number | null) => (x === null || !dur ? 0 : (100 * x) / dur);
  return (
    <div
      className="sd-wave"
      dir="ltr"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.round(dur)}
      aria-valuenow={Math.round(t)}
      tabIndex={0}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - r.left) / r.width) * dur);
      }}
      onKeyDown={(e) => (e.key === 'ArrowRight' ? onSeek(t + 5) : e.key === 'ArrowLeft' ? onSeek(t - 5) : null)}
    >
      {wave.map((p, i) => (
        <span key={i} style={{ height: `${Math.max(4, p * 100)}%` }} />
      ))}
      {marks?.map((m, i) => <i key={i} className="sd-mark" style={{ left: `${frac(m)}%` }} />)}
      {a !== null && b !== null && <i className="sd-loop" style={{ left: `${frac(a)}%`, width: `${frac(b) - frac(a)}%` }} />}
      <i className="sd-head" style={{ left: `${frac(t)}%` }} />
    </div>
  );
}

export function SlowDownScreen({ lang, onBack }: { lang: 'en' | 'he'; onBack: () => void }) {
  const tx = TX[lang];
  const audio = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [wave, setWave] = useState<number[]>([]);
  const [dur, setDur] = useState(0);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(0.75);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => {
    audio.current?.pause();
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  // A–B loop and the playhead, checked every 25 ms (timeupdate is too coarse for a tight loop; a timer keeps going in the background).
  useEffect(() => {
    const id = setInterval(() => {
      const el = audio.current;
      if (!el) return;
      if (a !== null && b !== null && b > a && el.currentTime >= b) el.currentTime = a;
      setT(el.currentTime);
    }, 25);
    return () => clearInterval(id);
  }, [a, b]);
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.playbackRate = speed;
    (el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch = true;
    (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
  }, [speed, url]);

  const open = async (f: File) => {
    audio.current?.pause();
    setPlaying(false);
    if (url) URL.revokeObjectURL(url);
    setA(null);
    setB(null);
    setName(f.name);
    setUrl(URL.createObjectURL(f));
    try {
      const ctx = new AudioContext();
      const buf = await ctx.decodeAudioData(await f.arrayBuffer());
      setWave(peaks(buf, 120));
      void ctx.close();
    } catch {
      setWave([]);
    }
  };
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      if (a !== null && b !== null && (el.currentTime < a || el.currentTime >= b)) el.currentTime = a;
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };
  const seek = (x: number) => {
    if (audio.current && dur) audio.current.currentTime = Math.max(0, Math.min(dur, x));
  };
  return (
    <main className="panel-screen slowdown" data-slowdown="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <label className={`btn ${url ? 'ghost small' : ''} sd-pick`}>
        {url ? tx.other : tx.pick}
        <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && void open(e.target.files[0])} data-slowdown-file="1" />
      </label>
      {!url && <p className="field-hint">{tx.hint}</p>}
      {url && (
        <>
          <audio ref={audio} src={url} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onEnded={() => setPlaying(false)} preload="auto" />
          <p className="sd-name" dir="auto">
            {name}
          </p>
          <LoopWave wave={wave} dur={dur} t={t} a={a} b={b} onSeek={seek} />
          <div className="sd-time" dir="ltr">
            <span>{fmt(t)}</span>
            <span>{fmt(dur)}</span>
          </div>
          <div className="chips sd-speeds" role="radiogroup" aria-label={tx.speed} dir="ltr">
            {SPEEDS.map((s) => (
              <button key={s} role="radio" aria-checked={speed === s} className={`chip ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)} data-speed={s}>
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>
          <div className="sd-ab" dir="ltr">
            <button className="icon-btn" onClick={() => seek(t - 5)} aria-label="−5 s">
              −5
            </button>
            <button className="btn ghost small" onClick={() => setA(t)} data-set-a="1">
              {tx.setA}
              {a !== null ? ` ${fmt(a)}` : ''}
            </button>
            <button className="btn ghost small" onClick={() => a !== null && t > a && setB(t)} disabled={a === null} data-set-b="1">
              {tx.setB}
              {b !== null ? ` ${fmt(b)}` : ''}
            </button>
            {(a !== null || b !== null) && (
              <button className="icon-btn" onClick={() => (setA(null), setB(null))} aria-label={tx.clear}>
                ✕
              </button>
            )}
            <button className="icon-btn" onClick={() => seek(t + 5)} aria-label="+5 s">
              +5
            </button>
          </div>
          <button className="btn mega" onClick={toggle} data-slowdown-play="1">
            {playing ? `■ ${tx.pause}` : `▶ ${tx.play}`}
          </button>
        </>
      )}
    </main>
  );
}
