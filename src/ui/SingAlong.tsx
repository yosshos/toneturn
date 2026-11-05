// Sing-along (spec S.10): pick a public-domain song, sing it over a count-in while a note roll scrolls and
// your pitch is drawn on top; then a score per note. The song sits inside the player's range.

import { useEffect, useRef, useState } from 'react';
import { gradeSingAlong, songTimeline, type RollNote, type SingAlongGrade } from '../engine/singalong';
import type { SungFrame } from '../engine/sing';
import { SONGS, type SongOpening } from '../engine/songs';
import { DEFAULT_RANGE } from '../engine/vocal';
import { hzToMidi, pc } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Settings } from '../storage/progress';
import { piano, SIMULATED } from './services';
import { noteLabel } from './Vocal';

const BPM = 84;
/** Usual major-key spelling for a tonic pitch class. */
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function Roll({ notes, frames, now }: { notes: RollNote[]; frames: SungFrame[]; now: number }) {
  const W = 320;
  const H = 150;
  const lo = Math.min(...notes.map((n) => n.midi)) - 3;
  const hi = Math.max(...notes.map((n) => n.midi)) + 3;
  const span = 4; // seconds visible
  const x0 = Math.max(0, now - 1); // the cursor sits a second from the left
  const x = (t: number) => ((t - x0) / span) * W;
  const y = (m: number) => H - ((m - lo) / (hi - lo)) * H;
  const centre = (lo + hi) / 2;
  const pts = frames
    .filter((f) => f.hz && f.confidence >= 0.8 && f.t >= x0 && f.t <= x0 + span)
    .map((f) => {
      let m = hzToMidi(f.hz!);
      m += Math.round((centre - m) / 12) * 12;
      return `${x(f.t).toFixed(1)},${y(m).toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="sing-roll" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {notes.map((n, i) => (
        <rect key={i} x={x(n.start)} y={y(n.midi + 0.4)} width={Math.max(2, x(n.start + n.dur) - x(n.start) - 2)} height={y(n.midi - 0.4) - y(n.midi + 0.4)} rx="4" className={now >= n.start && now < n.start + n.dur ? 'roll-note on' : 'roll-note'} />
      ))}
      <line x1={x(now)} x2={x(now)} y1="0" y2={H} className="roll-cursor" />
      {pts && <polyline points={pts} className="trace-line" />}
    </svg>
  );
}

export function SingAlongScreen({ t, settings, onBack }: { t: Strings; settings: Settings; onBack: () => void }) {
  const [song, setSong] = useState<SongOpening | null>(null);
  const [phase, setPhase] = useState<'pick' | 'ready' | 'count' | 'singing' | 'done'>('pick');
  const [frames, setFrames] = useState<SungFrame[]>([]);
  const [now, setNow] = useState(0);
  const [grade, setGrade] = useState<SingAlongGrade | null>(null);
  // Off by default: the guide plays the very notes being sung, so only with headphones can it stay out of the microphone.
  const [guide, setGuide] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const lang = settings.uiLang;
  const tl = song ? songTimeline(song, range, BPM) : null;
  const keyPc = tl ? pc(KEY_NAMES[((tl.tonic % 12) + 12) % 12]) : null;

  const run = async () => {
    if (!song || !tl) return;
    const c = new AbortController();
    ctl.current = c;
    setGrade(null);
    setFrames([]);
    await piano.unlock();
    setPhase('count');
    const beat = 60 / BPM;
    const clicks = [0, 1, 2, 3].map((k) => ({ midi: 0, start: k * beat, duration: 0.05, velocity: 0.8, perc: (k === 0 ? 'accent' : 'click') as 'accent' | 'click' }));
    await piano.play(clicks, 4 * beat, c.signal).catch(() => {});
    if (c.signal.aborted) return;
    setPhase('singing');
    const end = tl.notes[tl.notes.length - 1].start + tl.notes[tl.notes.length - 1].dur;
    if (guide) void piano.play(tl.notes.map((n) => ({ midi: n.midi, start: n.start, duration: n.dur * 0.92, velocity: 0.35 })), end + 0.2, c.signal).catch(() => {});
    const t0 = performance.now();
    const tick = setInterval(() => setNow((performance.now() - t0) / 1000), 50);
    let got: SungFrame[] = [];
    const buf: SungFrame[] = [];
    if (SIMULATED) {
      // A clean synthetic take, timed to the song.
      got = tl.notes.flatMap((n) => Array.from({ length: Math.floor(n.dur / 0.02) }, (_, k) => ({ t: n.start + k * 0.02, hz: 440 * 2 ** ((n.midi - 69) / 12), confidence: 0.95, rms: 0.08 })));
      await new Promise((r) => setTimeout(r, Math.min(3000, end * 1000)));
      setFrames(got);
    } else {
      const r = await new BrowserPitchCapture().sing({
        signal: c.signal,
        maxMs: (end + 1.5) * 1000,
        silenceMs: 4000,
        endSilenceMs: 1500,
        hopMs: 20,
        onFrame: (f) => {
          buf.push({ ...f, t: (performance.now() - t0) / 1000 });
          if (buf.length % 3 === 0) setFrames(buf.slice());
        },
      });
      got = r.kind === 'frames' || r.kind === 'aborted' ? buf : [];
    }
    clearInterval(tick);
    piano.stopAll();
    setNow(end);
    setGrade(gradeSingAlong(got, tl.notes));
    setPhase('done');
    piano.cue('complete');
  };

  if (!song || !tl)
    return (
      <main className="panel-screen singalong">
        <header className="screen-head">
          <button className="icon-btn" onClick={onBack} aria-label={t.back}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>🎶 {t.singAlongTitle}</h1>
        </header>
        <p className="field-hint">{t.singAlongHint}</p>
        <ul className="song-list">
          {SONGS.map((s) => (
            <li key={s.id}>
              <button
                className="tool-card"
                onClick={() => {
                  setSong(s);
                  setPhase('ready');
                }}
              >
                <b>{s.title[lang]}</b>
                <small>{s.source}</small>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );

  return (
    <main className="panel-screen singalong">
      <header className="screen-head">
        <button
          className="icon-btn"
          onClick={() => {
            ctl.current?.abort();
            piano.stopAll();
            setSong(null);
            setPhase('pick');
          }}
          aria-label={t.back}
        >
          <span className="flip-rtl">←</span>
        </button>
        <h1>{song.title[lang]}</h1>
      </header>
      <p className="field-hint" dir="ltr">
        {noteLabel(tl.tonic, settings, keyPc)} · ♩ = {BPM}
      </p>
      <Roll notes={tl.notes} frames={frames} now={phase === 'pick' || phase === 'ready' ? 0 : now} />
      {phase === 'count' && <p className="vocal-cue vib">1 · 2 · 3 · 4</p>}
      {grade && (
        <section className="take-card" aria-live="polite">
          <div className="take-score">
            {t.vocalScore}: <b>{Math.round(grade.total * 100)}%</b>
          </div>
          <ol className="sing-notes" dir="ltr">
            {grade.notes.map((g, i) => (
              <li key={i} className={g === null ? 'miss' : g >= 0.7 ? 'good' : g >= 0.4 ? 'fair' : 'weak'}>
                {noteLabel(tl.notes[i].midi, settings, keyPc).replace(/\d+$/, '')}
              </li>
            ))}
          </ol>
        </section>
      )}
      <label className="toggle-row">
        <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
        <span>{t.singAlongGuide}</span>
      </label>
      <div className="vocal-actions">
        <button className="btn mega" disabled={phase === 'count' || phase === 'singing'} onClick={() => void run()}>
          {settings.instrument && settings.instrument !== 'voice' ? '🎷' : '🎤'} {phase === 'done' ? t.vocalRetry : settings.instrument && settings.instrument !== 'voice' ? t.playNow : t.vocalSing}
        </button>
      </div>
    </main>
  );
}
