// "My song" in every course (SPEC-MY-SONG): the player's own recordings, kept on this device, practised with each
// course's own measuring — keys / guitar / bass / drums play along (timing against the detected beat, notes against
// the line where it came out cleanly), ear / jazz transcribe its phrases. The slow-down tool's waveform and speeds are
// shared (SlowDown.tsx); the slowing keeps the pitch (WSOLA) so the take stays on the recording's clock. A half-done
// session is kept and resumes.

import '../mysong.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CourseId } from '../engine/courses';
import type { Settings } from '../storage/progress';
import type { SungFrame } from '../engine/sing';
import type { PlayedNote } from '../engine/drills/types';
import { piano, SIMULATED } from './services';
import { LoopWave, SPEEDS, fmt, peaks } from './SlowDown';
import { pitchCaptureFor } from './Flight';
import { DrillTake } from './DrillTake';
import { calOf, lickInstrumentOf, Stars } from './LickTrainer';
import { MS } from '../content/mySongText';
import { analyseRecording, ANALYSIS_VERSION, beatsOk, demoSong, gradePlayAlong, measurePlan, melodyOk, mixDown, phraseOfMine, phraseTake, sectionChordsOk, sessionResult, songKeyOf, takeOnsets, timeStretch, transcribePhrases, type PlayAlongGrade, type SongAnalysis, type TakeLog } from '../engine/mySong';
import { chordAt, chordName, CHORD_CONFIDENT, segPcs, type ChordTrack } from '../engine/chordTrack';
import { acousticOnsets } from '../engine/drumAcoustic';
import { segmentNotes } from '../engine/memory';
import { bassPitchOpts } from '../engine/yin';
import { inputLatency } from '../engine/latency';
import { comparePhrase, heardOfPlayed, type PhraseResult } from '../engine/transcribe';
import { DEGREE_NAMES, gradeDegrees, phraseStars } from '../engine/transcribe';
import { keyName } from '../engine/drills/generate';
import '../licks.css';
import { lickDrill, lickFromPhrase } from '../engine/licks';
import { clearMySession, cleanName, deviceSongStore, loadMySession, MAX_FILE_BYTES, MAX_SECONDS, memorySongStore, newSongId, roomFor, saveMySession, songName, storageEstimate, type MySession, type SongMeta, type SongStore, type StoredSong } from '../storage/mySongs';

type Lang = 'he' | 'en';
type T2 = { en: string; he: string };
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/** The song library: the device's IndexedDB, or memory in the simulator (simulated runs never touch real data). */
export const songs: SongStore = SIMULATED ? memorySongStore() : deviceSongStore();

export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close();
  }
}
export const monoOf = (b: AudioBuffer): Float32Array => mixDown(Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i)));

/** 16-bit PCM WAV of mono samples (the demo recording is kept like a real file). */
export function wavBlob(x: Float32Array, sr: number): Blob {
  const buf = new ArrayBuffer(44 + x.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + x.length * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
const bufferOf = (x: Float32Array, sr: number): AudioBuffer => {
  const b = new AudioBuffer({ length: Math.max(1, x.length), numberOfChannels: 1, sampleRate: sr });
  b.copyToChannel(x as Float32Array<ArrayBuffer>, 0);
  return b;
};

const Pen = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);
const Bin = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
  </svg>
);

// ───────────────────────────── the library ─────────────────────────────

/**
 * The list of the player's songs (name editable, duration, this course's last score, delete) and "Add a recording".
 * Opening a song decodes it and analyses it once (the analysis is kept with it).
 */
export function MySongLibrary({ lang, course, onOpen, demo }: { lang: Lang; course: CourseId; onOpen: (song: StoredSong, buffer: AudioBuffer) => void; /** Simulator: a demo recording to add. */ demo?: () => AudioBuffer }) {
  const L = (b: T2) => b[lang];
  const [list, setList] = useState<SongMeta[] | null>(null);
  const [busy, setBusy] = useState<{ label: T2; pct: number } | null>(null);
  const [msg, setMsg] = useState<T2 | null>(null);
  const [low, setLow] = useState(false);
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);
  const [ask, setAsk] = useState<SongMeta | null>(null);
  const reload = () => void songs.list().then(setList);
  useEffect(() => {
    reload();
    void storageEstimate().then((e) => e && setLow(roomFor(e.usage, e.quota, 0) !== 'ok'));
  }, []);

  const analyse = async (buffer: AudioBuffer): Promise<SongAnalysis> => {
    setBusy({ label: MS.analysing, pct: 0 });
    return analyseRecording(monoOf(buffer), buffer.sampleRate, { onProgress: (p) => setBusy({ label: MS.analysing, pct: Math.round(p * 100) }) });
  };
  /** A new recording: checked, analysed, kept (when there is room), opened. */
  const addBuffer = async (buffer: AudioBuffer, blob: Blob, name: string) => {
    if (buffer.duration > MAX_SECONDS) return setMsg(MS.tooBig);
    const est = await storageEstimate();
    const room = est ? roomFor(est.usage, est.quota, blob.size) : 'ok';
    if (room === 'full') {
      setBusy(null);
      return setMsg(MS.full);
    }
    const analysis = await analyse(buffer);
    const song: StoredSong = { id: newSongId(), name, addedAt: new Date().toISOString(), duration: buffer.duration, size: blob.size, type: blob.type, analysis, blob };
    const r = await songs.put(song);
    setBusy(null);
    if (!r.ok && r.reason === 'quota') return setMsg(MS.full);
    if (!r.ok) setMsg(MS.notKept);
    if (room === 'low') setLow(true);
    onOpen(song, buffer);
  };
  const add = async (f: File | undefined) => {
    if (!f) return;
    setMsg(null);
    if (f.size > MAX_FILE_BYTES) return setMsg(MS.tooBig);
    setBusy({ label: MS.decoding, pct: 0 });
    let buffer: AudioBuffer;
    try {
      buffer = await decodeBlob(f);
    } catch {
      setBusy(null);
      return setMsg(MS.bad);
    }
    await addBuffer(buffer, f, songName(f.name));
  };
  const open = async (m: SongMeta) => {
    setMsg(null);
    setBusy({ label: MS.decoding, pct: 0 });
    const s = await songs.get(m.id);
    if (!s) {
      setBusy(null);
      return reload();
    }
    let buffer: AudioBuffer;
    try {
      buffer = await decodeBlob(s.blob);
    } catch {
      setBusy(null);
      return setMsg(MS.bad);
    }
    let song = s;
    if (!s.analysis || s.analysis.v !== ANALYSIS_VERSION) {
      const analysis = await analyse(buffer);
      song = { ...s, analysis };
      void songs.update(s.id, { analysis });
    }
    setBusy(null);
    onOpen(song, buffer);
  };
  const rename = async () => {
    if (!edit) return;
    const old = list?.find((x) => x.id === edit.id)?.name ?? '';
    await songs.update(edit.id, { name: cleanName(edit.name, old) });
    setEdit(null);
    reload();
  };

  return (
    <section className="ms-lib" data-my-songs={list?.length ?? -1}>
      <h2>{L(MS.library)}</h2>
      {low && <p className="field-hint warn">{L(MS.low)}</p>}
      {msg && <p className="take-remark" data-ms-msg="1">{L(msg)}</p>}
      {busy ? (
        <p className="vocal-cue ms-busy" aria-live="polite">
          {L(busy.label)} <span dir="ltr">{busy.pct}%</span>
        </p>
      ) : (
        <>
          {list && !list.length && <p className="field-hint">{L(MS.empty)}</p>}
          {!!list?.length && (
            <ul className="ms-list">
              {list.map((s) => {
                const sc = s.scores?.[course];
                if (ask?.id === s.id)
                  return (
                    <li key={s.id} className="ms-row ask">
                      <span dir="auto">{fill(L(MS.delAsk), { name: s.name })}</span>
                      <button className="btn ghost small" onClick={() => setAsk(null)}>
                        {L(MS.no)}
                      </button>
                      <button
                        className="btn small danger"
                        data-ms-confirm-del="1"
                        onClick={() => {
                          void songs.remove(s.id).then(() => {
                            setAsk(null);
                            reload();
                            void storageEstimate().then((e) => e && setLow(roomFor(e.usage, e.quota, 0) !== 'ok'));
                          });
                        }}
                      >
                        {L(MS.yes)}
                      </button>
                    </li>
                  );
                if (edit?.id === s.id)
                  return (
                    <li key={s.id} className="ms-row edit">
                      <input className="ms-name-input" value={edit.name} maxLength={60} dir="auto" autoFocus aria-label={L(MS.rename)} onChange={(e) => setEdit({ id: s.id, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && void rename()} />
                      <button className="btn small" onClick={() => void rename()} data-ms-save-name="1">
                        {L(MS.save)}
                      </button>
                    </li>
                  );
                return (
                  <li key={s.id} className="ms-row">
                    <button className="ms-open" onClick={() => void open(s)} data-ms-open={s.id}>
                      <b dir="auto">{s.name}</b>
                      <small>
                        <span dir="ltr">{fmt(s.duration)}</span> · {sc ? `${L(MS.last)} ${Math.round(sc.score * 100)}%` : L(MS.never)}
                      </small>
                    </button>
                    <button className="icon-btn" onClick={() => setEdit({ id: s.id, name: s.name })} aria-label={L(MS.rename)} title={L(MS.rename)} data-ms-rename="1">
                      <Pen />
                    </button>
                    <button className="icon-btn" onClick={() => setAsk(s)} aria-label={L(MS.del)} title={L(MS.del)} data-ms-del="1">
                      <Bin />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <label className="btn ms-add">
            {L(MS.add)}
            <input type="file" accept="audio/*" className="sr-only" onChange={(e) => void add(e.target.files?.[0])} data-ms-file="1" />
          </label>
          <p className="field-hint">{L(MS.addHint)}</p>
          {SIMULATED && demo && (
            <button
              className="btn ghost small"
              data-my-song-demo="1"
              onClick={() => {
                const b = demo();
                void addBuffer(b, wavBlob(b.getChannelData(0), b.sampleRate), L(MS.demo));
              }}
            >
              {L(MS.demo)}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** Keep a course's last score on a stored song (the voice level's takes call this too). */
export async function noteSongScore(id: string, course: CourseId, score: number): Promise<void> {
  const s = await songs.get(id);
  if (s) await songs.update(id, { scores: { ...(s.scores ?? {}), [course]: { score, at: new Date().toISOString() } } });
}

/** The simulator's demo song (a beat, a melody, a bass line). */
export function demoSongBuffer(): AudioBuffer {
  const sr = 22050;
  return bufferOf(demoSong(sr, 100, 8), sr);
}

// ───────────────────────────── playback on the take's clock ─────────────────────────────

/** Play mono samples on their own audio context; resolves with the moment (performance.now ms) the first sample is heard. */
function playSamples(x: Float32Array, sr: number, signal: AbortSignal, loop = false): { zero: number; stop: () => void } {
  const ctx = new AudioContext();
  const src = ctx.createBufferSource();
  src.buffer = bufferOf(x, sr);
  src.loop = loop;
  src.connect(ctx.destination);
  const startAt = ctx.currentTime + 0.15;
  src.start(startAt);
  const zero = performance.now() + 150 + ((ctx as AudioContext & { outputLatency?: number }).outputLatency ?? ctx.baseLatency ?? 0) * 1000;
  const stop = () => {
    try {
      src.stop();
    } catch {
      /* stopped */
    }
    void ctx.close().catch(() => {});
  };
  signal.addEventListener('abort', stop, { once: true });
  return { zero, stop };
}

/** Simulator: a take that plays the line (or the beat) a little late, as frames on the take's clock. */
function simFrames(from: number, to: number, speed: number, beats: number[] | null, line: { midi: number; start: number }[] | null, chords: ChordTrack | null = null): SungFrame[] {
  const hits = line?.length ? line.filter((n) => n.start >= from && n.start <= to).map((n) => ({ t: n.start, hz: 440 * 2 ** ((n.midi - 69) / 12) })) : (beats ?? []).filter((b) => b >= from && b <= to).map((t) => ({ t, hz: 220 }));
  const out: SungFrame[] = [];
  const end = (to - from) / speed;
  for (let t = 0; t < end; t += 0.02) {
    const song = from + t * speed + 0.015;
    const h = hits.find((x) => song >= x.t && song < x.t + 0.2 * speed);
    const c = h && chords ? chordAt(chords, song) : null;
    const chroma = c ? Array.from({ length: 12 }, (_, i) => (segPcs(c).includes(i) ? 1 : 0.05)) : undefined;
    out.push(h ? { t, hz: h.hz, confidence: 0.95, rms: 0.2, ...(chroma ? { chroma } : {}) } : { t, hz: null, confidence: 0, rms: 0.001 });
  }
  return out;
}

// ───────────────────────────── the practice screens ─────────────────────────────

interface Opened {
  song: StoredSong;
  buffer: AudioBuffer;
  analysis: SongAnalysis;
}

function Head({ title, onBack, lang }: { title: string; onBack: () => void; lang: Lang }) {
  return (
    <header className="screen-head">
      <button className="icon-btn" onClick={onBack} aria-label={MS.back[lang]}>
        <span className="flip-rtl">‹</span>
      </button>
      <h1 dir="auto">{title}</h1>
    </header>
  );
}

function Speeds({ speed, onSpeed, lang, disabled }: { speed: number; onSpeed: (s: number) => void; lang: Lang; disabled?: boolean }) {
  return (
    <div className="chips sd-speeds ms-speeds" role="radiogroup" aria-label={MS.speed[lang]} dir="ltr">
      {SPEEDS.filter((s) => s >= 0.5).map((s) => (
        <button key={s} role="radio" aria-checked={speed === s} className={`chip ${speed === s ? 'on' : ''}`} onClick={() => onSpeed(s)} data-speed={s} disabled={disabled}>
          {Math.round(s * 100)}%
        </button>
      ))}
    </div>
  );
}

/** Keys / guitar / bass / drums: play along with a section, measured on the recording's own clock. */
function PlayAlong({ lang, settings, course, o, session, onSession, onFinish, onBack, onSettings }: { lang: Lang; settings: Settings; course: CourseId; o: Opened; session: MySession; onSession: (s: MySession) => void; onFinish: () => void; onBack: () => void; onSettings: (p: Partial<Settings>) => void }) {
  const L = (b: T2) => b[lang];
  const { analysis, buffer } = o;
  const plan = useMemo(() => measurePlan(analysis, course), [analysis, course]);
  const sections = analysis.sections;
  const sec = Math.min(session.section, sections.length - 1);
  const S = sections[sec];
  const speed = session.speed;
  const mono = useMemo(() => monoOf(buffer), [buffer]);
  const wave = useMemo(() => peaks(buffer, 90), [buffer]);
  const sr = buffer.sampleRate;
  const beats = plan.timing && analysis.beats ? analysis.beats.beats : null;
  // Keys / guitar against the chords: only in a section that lies mostly under confident chords; elsewhere the melody
  // (when it came out cleanly) or timing only — and the screen says which.
  const secChords = plan.pitch === 'chords' && !!S && sectionChordsOk(analysis, S);
  const chordTrack = secChords ? (analysis.chords ?? null) : null;
  const line = plan.pitch === 'bass' ? (analysis.bass?.notes ?? null) : plan.pitch === 'melody' || (plan.pitch === 'chords' && !secChords && melodyOk(analysis)) ? (analysis.melody?.notes ?? null) : null;
  const secSegs = S && analysis.chords ? analysis.chords.segs.filter((x) => x.end > S.start + 0.05 && x.start < S.end - 0.05) : [];
  const beatSec = analysis.beats ? 60 / analysis.beats.bpm : 0.6;
  const [phase, setPhase] = useState<'ready' | 'listen' | 'count' | 'play' | 'result'>('ready');
  const [t, setT] = useState(S?.start ?? 0);
  const [grade, setGrade] = useState<PlayAlongGrade | null>(null);
  const [err, setErr] = useState<T2 | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Float32Array>());
  const midiIn = !!settings.midiInput;
  const hpOk = midiIn || !!settings.headphones || SIMULATED;
  useEffect(() => () => ctl.current?.abort(), []);
  if (!S) return null;

  const segment = (from: number, to: number) => {
    const key = `${from.toFixed(3)}:${to.toFixed(3)}:${speed}`;
    let x = cache.current.get(key);
    if (!x) {
      x = timeStretch(mono.subarray(Math.max(0, Math.floor(from * sr)), Math.min(mono.length, Math.ceil(to * sr))), sr, speed);
      cache.current.set(key, x);
    }
    return x;
  };
  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    setPhase((p) => (p === 'listen' ? 'ready' : p));
  };
  const listen = async () => {
    stop();
    await piano.unlock();
    const c = new AbortController();
    ctl.current = c;
    const x = segment(S.start, S.end);
    const len = x.length / sr;
    const { zero } = playSamples(x, sr, c.signal, true);
    setPhase('listen');
    const id = setInterval(() => {
      const el = (performance.now() - zero) / 1000;
      setT(S.start + (((el % len) + len) % len) * speed);
    }, 50);
    c.signal.addEventListener('abort', () => clearInterval(id), { once: true });
  };
  const take = async () => {
    stop();
    setErr(null);
    setGrade(null);
    await piano.unlock();
    const lead = beats ? Math.min(S.start, 4 * beatSec) : Math.min(S.start, 1.5);
    const from = S.start - lead;
    const to = Math.min(analysis.duration, S.end + 0.3);
    const x = segment(from, to);
    const segDur = x.length / sr;
    const c = new AbortController();
    ctl.current = c;
    setPhase('count');
    let frames: SungFrame[] = [];
    const clock = (zero: number) => {
      const id = setInterval(() => {
        const songT = from + ((performance.now() - zero) / 1000) * speed;
        setT(songT);
        setPhase((p) => (p === 'count' && songT >= S.start ? 'play' : p));
      }, 50);
      c.signal.addEventListener('abort', () => clearInterval(id), { once: true });
      return id;
    };
    if (SIMULATED) {
      clock(performance.now());
      await new Promise((r) => setTimeout(r, 900));
      frames = simFrames(from, to, speed, beats, line, chordTrack);
    } else {
      const lat = inputLatency(settings, midiIn ? 'midi' : 'mic') / 1000;
      let zero = 0;
      let started: () => void = () => {};
      const ready = new Promise<void>((r) => (started = r));
      const inner = new AbortController();
      c.signal.addEventListener('abort', () => inner.abort(), { once: true });
      const cap = pitchCaptureFor(settings).sing({
        signal: inner.signal,
        maxMs: (segDur + 2) * 1000,
        silenceMs: 600_000,
        endSilenceMs: 600_000,
        hopMs: 20,
        onCapturing: () => started(),
        onFrame: (raw) => {
          if (!zero) return;
          const tt = (performance.now() - zero) / 1000 - lat;
          if (tt >= -0.2) frames.push({ ...raw, t: tt });
        },
        ...(course === 'drums' ? { bands: true } : {}),
        ...(course === 'bass' ? bassPitchOpts() : {}),
        ...(chordTrack ? { chroma: true } : {}),
      });
      const first = await Promise.race([ready.then(() => 'ok' as const), cap.then(() => 'done' as const)]);
      if (first === 'done') {
        const r = await cap;
        setPhase('ready');
        if (r.kind === 'error') setErr(MS.mic);
        return;
      }
      const p = playSamples(x, sr, inner.signal);
      zero = p.zero;
      clock(zero);
      const end = setTimeout(() => inner.abort(), segDur * 1000 + 600);
      const r = await cap;
      clearTimeout(end);
      if (c.signal.aborted && ctl.current !== c) return;
      if (r.kind === 'error') {
        setPhase('ready');
        return setErr(MS.mic);
      }
    }
    c.abort();
    // Onsets and notes on the song's clock.
    const toSong = (tt: number) => from + tt * speed;
    const drumOns = course === 'drums' && frames.some((f) => f.bands) ? acousticOnsets(frames.map((f) => ({ t: f.t * 1000, bands: f.bands }))).map((a) => a.t / 1000) : null;
    const onsets = (drumOns ?? takeOnsets(frames)).map(toSong);
    const notes = course === 'drums' ? [] : segmentNotes(frames, { minSec: 0.08 }).map((n) => ({ midi: n.midi, start: toSong(n.start) }));
    const chromaFrames = chordTrack ? frames.filter((f) => f.chroma).map((f) => ({ t: toSong(f.t), chroma: f.chroma })) : undefined;
    const g = gradePlayAlong({ start: S.start, end: S.end, speed, beats, notes: chordTrack ? null : line, chords: chordTrack }, { onsets, notes, frames: chromaFrames });
    setGrade(g);
    setT(S.end);
    setPhase('result');
    piano.cue(g.unclear ? 'wrong' : g.verdict === 'not' ? 'wrong' : 'correct');
    if (!g.unclear) {
      const slow = speed < 1 ? 0.9 + 0.1 * speed : 1;
      const log: TakeLog = { section: sec, score: Math.round(g.score * slow * 1000) / 1000, timing: g.timing, pitch: g.pitch, verdict: g.verdict, speed };
      onSession({ ...session, takes: [...session.takes, log] });
    }
  };
  const go = (k: number) => {
    stop();
    setGrade(null);
    setPhase('ready');
    const n = Math.max(0, Math.min(sections.length - 1, k));
    setT(sections[n].start);
    onSession({ ...session, section: n });
  };
  const busy = phase === 'count' || phase === 'play';
  const counted = session.takes.length;
  return (
    <main className="panel-screen ms-screen" data-my-song-practice={course} data-ms-phase={phase}>
      <Head title={o.song.name} onBack={onBack} lang={lang} />
      <p className={`ms-plan ${plan.none ? 'none' : ''}`} data-ms-plan={plan.none ? 'none' : `${plan.timing ? 'timing' : ''}${plan.pitch ? `+${plan.pitch}` : ''}`} data-ms-chords={plan.pitch === 'chords' ? (secChords ? 'measured' : 'unclear') : undefined}>
        {plan.pitch === 'chords' && !secChords ? fill(L(MS.chordsUnclear), { what: line ? L(MS.melodyHere) : L(MS.timingOnly) }) : L(plan.why)}
        {analysis.beats && plan.timing && (
          <span dir="ltr" className="ms-bpm">
            {fill(L(MS.bpm), { bpm: Math.round(analysis.beats.bpm) })}
            {analysis.beats.meter === 3 ? ` · ${L(MS.waltz)}` : ''}
          </span>
        )}
      </p>
      <LoopWave wave={wave} dur={analysis.duration} t={t} a={S.start} b={S.end} onSeek={(s) => go(sections.findIndex((x) => s >= x.start && s < x.end))} marks={sections.map((x) => x.start)} />
      {plan.pitch === 'chords' && secSegs.length > 0 && (
        <ol className="ms-chords" dir="ltr" aria-label={L(MS.chordsHere)} data-ms-chord-row="1">
          {secSegs.map((x, k) => {
            const sure = x.root !== null && x.conf >= CHORD_CONFIDENT;
            return (
              <li key={k} className={`${sure ? '' : 'unsure'} ${t >= x.start && t < x.end ? 'on' : ''}`} title={sure ? undefined : L(MS.chordUnsure)}>
                {sure ? chordName(x) : '?'}
              </li>
            );
          })}
        </ol>
      )}
      <div className="ms-nav" dir="ltr">
        <button className="icon-btn" onClick={() => go(sec - 1)} disabled={sec === 0 || busy} aria-label="‹">
          ‹
        </button>
        <span dir={lang === 'he' ? 'rtl' : 'ltr'}>
          {L(MS.section)} <b>{sec + 1}</b>/{sections.length} · <span dir="ltr">{fmt(S.start)}–{fmt(S.end)}</span>
        </span>
        <button className="icon-btn" onClick={() => go(sec + 1)} disabled={sec >= sections.length - 1 || busy} aria-label="›">
          ›
        </button>
      </div>
      <Speeds speed={speed} lang={lang} disabled={busy} onSpeed={(s) => (stop(), cache.current.clear(), onSession({ ...session, speed: s }))} />
      {!midiIn && !plan.none && (
        <label className="ms-hp">
          <input type="checkbox" checked={!!settings.headphones} onChange={(e) => onSettings({ headphones: e.target.checked })} /> {L(MS.headphones)}
        </label>
      )}
      {err && <p className="take-remark">{L(err)}</p>}
      {phase === 'result' && grade && (
        <section className={`ms-result v-${grade.unclear ? 'unclear' : grade.verdict}`} data-ms-verdict={grade.unclear ? 'unclear' : grade.verdict} aria-live="polite">
          {grade.unclear ? (
            <p>
              <b>{L(MS.notCounted)}</b> · {L(grade.unclear)}
            </p>
          ) : (
            <>
              <div className="ms-score">{Math.round(grade.score * 100)}%</div>
              <p className="ms-bars" dir="ltr">
                {grade.timing !== null && (
                  <span>
                    {L(MS.timing)} {Math.round(grade.timing * 100)}%
                  </span>
                )}
                {grade.pitch !== null && (
                  <span>
                    {L(MS.notes)} {Math.round(grade.pitch * 100)}%
                  </span>
                )}
              </p>
              <p className="ms-why">{L(grade.why)}</p>
              {speed < 1 && <small className="field-hint">{L(MS.slowNote)}</small>}
            </>
          )}
        </section>
      )}
      {(phase === 'count' || phase === 'play') && <p className="vocal-cue ms-cue">{phase === 'count' ? L(MS.count) : L(MS.playing)}</p>}
      {!hpOk && !plan.none && <p className="field-hint">{L(MS.needHp)}</p>}
      <div className="ms-actions">
        {phase === 'listen' ? (
          <button className="btn ghost" onClick={stop}>
            {L(MS.stop)}
          </button>
        ) : (
          <button className="btn ghost" onClick={() => void listen()} disabled={busy} data-ms-listen="1">
            {L(MS.listen)}
          </button>
        )}
        {phase === 'result' && sec < sections.length - 1 && (
          <button className="btn ghost" onClick={() => go(sec + 1)} data-ms-next="1">
            {L(MS.next)}
          </button>
        )}
        {!plan.none && (
          <button className="btn mega" onClick={() => void take()} disabled={busy || !hpOk} data-ms-take="1">
            {phase === 'result' ? L(MS.again) : L(MS.playAlong)}
          </button>
        )}
      </div>
      {counted > 0 && !busy && (
        <button className="link ms-finish" onClick={onFinish} data-ms-finish="1">
          {L(MS.finish)} · {fill(L(MS.takes), { n: counted, c: session.takes.filter((x) => x.verdict === 'clean').length })}
        </button>
      )}
    </main>
  );
}

/** Ear / jazz: a phrase of the melody, looped and slowed, then played or sung back and compared note by note. */
function TranscribeMine({ lang, settings, course, o, session, onSession, onFinish, onBack }: { lang: Lang; settings: Settings; course: CourseId; o: Opened; session: MySession; onSession: (s: MySession) => void; onFinish: () => void; onBack: () => void }) {
  const L = (b: T2) => b[lang];
  const { analysis, buffer } = o;
  const plan = useMemo(() => measurePlan(analysis, course), [analysis, course]);
  const phrases = useMemo(() => transcribePhrases(analysis.melody), [analysis]);
  const songKey = useMemo(() => songKeyOf(analysis), [analysis]);
  const key = songKey.tonic;
  const bpm = beatsOk(analysis) && analysis.beats ? analysis.beats.bpm : null;
  const i = Math.min(session.section, Math.max(0, phrases.length - 1));
  const P = phrases[i];
  const speed = session.speed;
  const mono = useMemo(() => monoOf(buffer), [buffer]);
  const wave = useMemo(() => peaks(buffer, 90), [buffer]);
  const sr = buffer.sampleRate;
  const inst = lickInstrumentOf(settings);
  const phrase0 = useMemo(() => (P ? phraseOfMine(P, key, bpm, `ms-${o.song.id}-${i}`, songKey.minor) : null), [P, key, bpm, o.song.id, i, songKey.minor]);
  const drill = useMemo(() => (phrase0 ? { ...lickDrill(lickFromPhrase(phrase0.id, phrase0.title, key, phrase0.notes, null), key, inst, { range: settings.voiceRange ?? null }), show: 'none' as const } : null), [phrase0, key, inst, settings.voiceRange]);
  const phrase = useMemo(() => (phrase0 && drill ? { ...phrase0, notes: drill.notes.map((n) => ({ midi: n.pitch, beat: n.beat, dur: n.dur })) } : null), [phrase0, drill]);
  const [step, setStep] = useState<'hear' | 'back' | 'result' | 'write'>('hear');
  const [res, setRes] = useState<PhraseResult | null>(null);
  // The degrees step (the transcription coach's): written degrees (semitones above the key) and their grade.
  const [written, setWritten] = useState<number[]>([]);
  const [grade, setGrade] = useState<ReturnType<typeof gradeDegrees> | null>(null);
  const [t, setT] = useState(P?.start ?? 0);
  const [playing, setPlaying] = useState(false);
  const [take, setTake] = useState(0);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    setPlaying(false);
  };
  if (plan.none || !P || !phrase || !drill)
    return (
      <main className="panel-screen ms-screen" data-my-song-practice={course}>
        <Head title={o.song.name} onBack={onBack} lang={lang} />
        <p className="ms-plan none" data-ms-plan="none">
          {L(plan.why)}
        </p>
        <LoopWave wave={wave} dur={analysis.duration} t={t} a={null} b={null} onSeek={setT} />
      </main>
    );
  const listen = async () => {
    stop();
    await piano.unlock();
    const c = new AbortController();
    ctl.current = c;
    const from = Math.max(0, P.start - 0.15);
    const to = Math.min(analysis.duration, P.end + 0.25);
    const x = timeStretch(mono.subarray(Math.floor(from * sr), Math.ceil(to * sr)), sr, speed);
    const len = x.length / sr;
    const { zero } = playSamples(x, sr, c.signal, true);
    setPlaying(true);
    const id = setInterval(() => setT(from + ((((performance.now() - zero) / 1000) % len) + len) % len * speed), 50);
    c.signal.addEventListener('abort', () => clearInterval(id), { once: true });
  };
  const go = (k: number) => {
    stop();
    setRes(null);
    setStep('hear');
    setWritten([]);
    setGrade(null);
    const n = Math.max(0, Math.min(phrases.length - 1, k));
    setT(phrases[n].start);
    onSession({ ...session, section: n });
  };
  const done = (played: PlayedNote[]) => {
    const r = comparePhrase(phrase, heardOfPlayed(played), phrase.bpm);
    setRes(r);
    setWritten([]);
    setGrade(null);
    setStep('result');
    piano.cue(r.verdict === 'not' ? 'wrong' : 'correct');
    onSession({ ...session, takes: [...session.takes, phraseTake(i, phrase, r, speed, new Date().toISOString(), session.sessionId)] });
  };
  return (
    <main className="panel-screen ms-screen" data-my-song-practice={course} data-ms-step={step}>
      <Head title={o.song.name} onBack={onBack} lang={lang} />
      <p className="ms-plan" data-ms-plan="transcribe">
        {L(plan.why)}
      </p>
      <LoopWave wave={wave} dur={analysis.duration} t={t} a={P.start} b={P.end} onSeek={(s) => go(phrases.findIndex((x) => s >= x.start - 0.2 && s < x.end + 0.2))} marks={phrases.map((x) => x.start)} />
      <div className="ms-nav" dir="ltr">
        <button className="icon-btn" onClick={() => go(i - 1)} disabled={i === 0 || step === 'back'} aria-label="‹">
          ‹
        </button>
        <span dir={lang === 'he' ? 'rtl' : 'ltr'}>
          {L(MS.phrase)} <b>{i + 1}</b>/{phrases.length} · {P.notes.length}
          {' ♪'}
        </span>
        <button className="icon-btn" onClick={() => go(i + 1)} disabled={i >= phrases.length - 1 || step === 'back'} aria-label="›">
          ›
        </button>
      </div>
      {step !== 'back' && step !== 'write' && <Speeds speed={speed} lang={lang} onSpeed={(s) => (stop(), onSession({ ...session, speed: s }))} />}
      {step === 'back' && <DrillTake key={`${phrase.id}:${take}`} drill={drill} bpm={phrase.bpm} lang={lang} cal={calOf(settings)} drumsOk={settings.headphones} onDone={(_m, played) => done(played)} />}
      {step === 'result' && res && (
        <section className={`ms-result v-${res.verdict}`} data-ms-verdict={res.verdict} aria-live="polite">
          <div className="ms-score">{Math.round(res.score * 100)}%</div>
          <p className="ms-bars" dir="ltr">
            <span>
              {L(MS.pitch)} {Math.round(res.pitchAcc * 100)}%
            </span>
            <span>
              {L(MS.rhythm)} {Math.round(res.rhythmAcc * 100)}%
            </span>
          </p>
          <p className="ms-why">{res.why[lang]}</p>
        </section>
      )}
      {step === 'write' && res && (
        <section className="ms-write" data-ms-write={grade ? 'graded' : written.length}>
          <p className="field-hint">
            {L(MS.writeHow)} <span dir="ltr">{fill(L(phrase.minor ? MS.keyOfMinor : MS.keyOf), { k: keyName(phrase.key, phrase.minor) })}</span>
          </p>
          <ol className="tx-written" dir="ltr">
            {phrase.notes.map((n, k) => (
              <li key={k} className={grade ? (grade.marks[k] ? 'ok' : 'bad') : k === written.length ? 'now' : ''}>
                {written[k] !== undefined ? DEGREE_NAMES[written[k]] : '·'}
                {grade && !grade.marks[k] && <small> {DEGREE_NAMES[(((n.midi - phrase.key) % 12) + 12) % 12]}</small>}
              </li>
            ))}
          </ol>
          {!grade ? (
            <div className="tx-pad" dir="ltr">
              {DEGREE_NAMES.map((d, k) => (
                <button key={d} className="tx-deg" onClick={() => written.length < phrase.notes.length && setWritten([...written, k])} data-ms-deg={k}>
                  {d}
                </button>
              ))}
            </div>
          ) : (
            <p className="ms-bars" data-ms-written={`${grade.ok}/${grade.total}`}>
              {fill(L(MS.written), { ok: grade.ok, n: grade.total })} <Stars n={phraseStars(res, grade)} of={3} />
            </p>
          )}
        </section>
      )}
      <div className="ms-actions">
        {step === 'write' && !grade && (
          <>
            <button className="btn ghost" disabled={!written.length} onClick={() => setWritten(written.slice(0, -1))}>
              {L(MS.undo)}
            </button>
            <button
              className="btn mega"
              disabled={written.length < phrase.notes.length}
              onClick={() => {
                if (!res) return;
                const g = gradeDegrees(phrase, written);
                setGrade(g);
                piano.cue(g.ok === g.total ? 'correct' : 'wrong');
                // The phrase's take now carries the writing (the coach's stars and score): it replaces the play-back take.
                const t0 = phraseTake(i, phrase, res, speed, new Date().toISOString(), session.sessionId, g);
                const last = session.takes.length - 1;
                const takes = last >= 0 && session.takes[last].section === i ? [...session.takes.slice(0, last), t0] : [...session.takes, t0];
                onSession({ ...session, takes });
              }}
              data-ms-check="1"
            >
              {L(MS.check)}
            </button>
          </>
        )}
        {step === 'result' && (
          <button className="btn ghost" onClick={() => (stop(), setStep('write'))} data-ms-to-write="1">
            {L(MS.toWrite)}
          </button>
        )}
        {step !== 'back' &&
          (playing ? (
            <button className="btn ghost" onClick={stop}>
              {L(MS.stop)}
            </button>
          ) : (
            <button className="btn ghost" onClick={() => void listen()} data-ms-listen="1">
              {L(MS.listen)}
            </button>
          ))}
        {(step === 'result' || (step === 'write' && grade)) && i < phrases.length - 1 && (
          <button className="btn ghost" onClick={() => go(i + 1)} data-ms-next="1">
            {L(MS.next)}
          </button>
        )}
        {step !== 'back' && !(step === 'write' && !grade) && (
          <button className="btn mega" onClick={() => (stop(), setRes(null), setTake((k) => k + 1), setStep('back'))} data-ms-take="1">
            {step === 'result' || step === 'write' ? L(MS.again) : L(MS.singBack)}
          </button>
        )}
        {step === 'back' && (
          <button className="btn ghost" onClick={() => setStep('hear')}>
            {L(MS.listen)}
          </button>
        )}
      </div>
      {session.takes.length > 0 && step !== 'back' && (
        <button className="link ms-finish" onClick={onFinish} data-ms-finish="1">
          {L(MS.finish)} · {fill(L(MS.takes), { n: session.takes.length, c: session.takes.filter((x) => x.verdict === 'clean').length })}
        </button>
      )}
    </main>
  );
}

// ───────────────────────────── the screen ─────────────────────────────

export interface MySongResult {
  course: CourseId;
  sessionId: string;
  xp: number;
  total: number;
  firstTry: number;
  items: ReturnType<typeof sessionResult>['items'];
}

/** "My song" for a course: the library, then the course's practice; a half-done session resumes on the next open. */
export function MySongScreen({ lang, settings, course, onBack, onResult, onSettings }: { lang: Lang; settings: Settings; course: CourseId; onBack: () => void; onResult: (r: MySongResult) => void; onSettings: (p: Partial<Settings>) => void }) {
  const L = (b: T2) => b[lang];
  const [o, setO] = useState<Opened | null>(null);
  const [session, setSession] = useState<MySession | null>(null);
  const [resuming, setResuming] = useState(() => !!loadMySession(course));
  const [resumed, setResumed] = useState(false);
  const [summary, setSummary] = useState<{ xp: number; total: number; clean: number; score: number } | null>(null);
  const keep = (s: MySession) => {
    setSession(s);
    saveMySession(course, s);
  };
  // Never lose progress: a session left half-done (reload, the app closed) opens again where it stopped.
  useEffect(() => {
    const s = loadMySession(course);
    if (!s) return;
    let alive = true;
    void (async () => {
      const song = await songs.get(s.songId);
      if (!song?.analysis || song.analysis.v !== ANALYSIS_VERSION) {
        clearMySession(course);
        if (alive) setResuming(false);
        return;
      }
      try {
        const buffer = await decodeBlob(song.blob);
        if (!alive) return;
        setO({ song, buffer, analysis: song.analysis });
        setSession(s);
        setResumed(true);
      } catch {
        clearMySession(course);
      }
      if (alive) setResuming(false);
    })();
    return () => {
      alive = false;
    };
  }, [course]);

  const finish = async () => {
    if (!o || !session) return;
    const r = sessionResult(course, session.takes, session.sessionId, o.analysis.beats?.bpm ?? null);
    clearMySession(course);
    if (r.total > 0) {
      onResult({ course, sessionId: session.sessionId, xp: r.xp, total: r.total, firstTry: r.firstTry, items: r.items });
      await songs.update(o.song.id, { scores: { ...(o.song.scores ?? {}), [course]: { score: r.score, at: new Date().toISOString() } } });
    }
    setSummary({ xp: r.xp, total: r.total, clean: r.firstTry, score: r.score });
    setO(null);
    setSession(null);
  };
  const leavePractice = () => {
    if (session?.takes.length) return void finish();
    clearMySession(course);
    setO(null);
    setSession(null);
  };

  if (summary)
    return (
      <main className="panel-screen ms-screen" data-ms-summary="1">
        <Head title={L(MS.summary)} onBack={() => setSummary(null)} lang={lang} />
        <section className="ms-result v-summary" aria-live="polite">
          {summary.total ? (
            <>
              <div className="ms-score">{Math.round(summary.score * 100)}%</div>
              <p>{fill(L(MS.takes), { n: summary.total, c: summary.clean })}</p>
              <p className="ms-xp">{fill(L(MS.xp), { xp: summary.xp })}</p>
            </>
          ) : (
            <p>{L(MS.noTakes)}</p>
          )}
        </section>
        <button className="btn mega" onClick={() => setSummary(null)} data-ms-done="1">
          {L(MS.done)}
        </button>
      </main>
    );
  if (o && session) {
    const props = { lang, settings, course, o, session, onSession: keep, onFinish: () => void finish(), onBack: leavePractice };
    return (
      <>
        {resumed && (
          <p className="ms-toast" role="status" onAnimationEnd={() => setResumed(false)}>
            {L(MS.resumed)}
          </p>
        )}
        {course === 'ear' || course === 'jazz' ? <TranscribeMine {...props} /> : <PlayAlong {...props} onSettings={onSettings} />}
      </>
    );
  }
  return (
    <main className="panel-screen ms-screen" data-my-song={course}>
      <Head title={L(MS.title)} onBack={onBack} lang={lang} />
      {resuming ? (
        <p className="vocal-cue ms-busy">{L(MS.decoding)}</p>
      ) : (
        <MySongLibrary
          lang={lang}
          course={course}
          demo={demoSongBuffer}
          onOpen={(song, buffer) => {
            if (!song.analysis) return;
            setO({ song, buffer, analysis: song.analysis });
            keep({ songId: song.id, sessionId: `mysong-${course}-${Date.now().toString(36)}`, section: 0, speed: 1, takes: [], startedAt: new Date().toISOString() });
          }}
        />
      )}
    </main>
  );
}
