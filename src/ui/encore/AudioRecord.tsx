// Record mode by audio (SPEC-PHRASE-STUDIO §4.3 v2, §14.2): sing or play a single line into the microphone — voice,
// guitar or bass single notes, a horn; the piano's top line — and Encore catches it as notes with a confidence each.
// Armed until the first pitched sound above the room's noise floor (measured in the first 500 ms); a live pitch trace
// and the notes caught so far; stops after 2.5 s of silence (or Stop, max 3 min); then the same caught → trim →
// context flow as MIDI. One microphone stream (the app's pitch capture); its audio is kept in My recordings through the
// capture tap (on the device, never uploaded). Chords by microphone (polyphonic transcription) are v3: said plainly.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LickInstrument } from '../../engine/licks';
import { audioNotes, firstSound, gateOf, noiseFloor, UNCLEAR, type AFrame, type AudioNote } from '../../engine/encore/audio';
import { catchTake, dotsOf } from '../../engine/encore/detect';
import { putMemoryTake, type EncoreTake } from '../../engine/encore/takeSource';
import { bassPitchOpts } from '../../engine/yin';
import { BrowserPitchCapture } from '../../speech/pitchCapture';
import { addCaptureTap, type CaptureSegment } from '../../speech/captureTap';
import { recordingPrefs, saveTake } from '../../storage/recordings';
import { listenLoop } from '../Flight';
import { piano } from '../services';
import { Conf, KeyB, Tempo, type Lang } from './bits';

type Head = (title: React.ReactNode, sub?: React.ReactNode, back?: () => void, extra?: React.ReactNode) => React.ReactNode;

const SILENCE_MS = 2500;
const MAX_MS = 180_000;
const TRACE_MS = 8000;
const nav = (path: string) => {
  location.hash = `/encore${path ? `/${path}` : ''}`;
};
const NAME: Record<LickInstrument, { en: string; he: string }> = { piano: { en: 'Piano', he: 'פסנתר' }, guitar: { en: 'Guitar', he: 'גיטרה' }, bass: { en: 'Bass', he: 'בס' }, voice: { en: 'Voice', he: 'קול' } };
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

export function AudioRecordMode({ lang, head, inst, onMidi }: { lang: Lang; head: Head; inst: LickInstrument; onMidi?: () => void }) {
  const he = lang === 'he';
  const [state, setState] = useState<'armed' | 'listening'>('armed');
  const [notes, setNotes] = useState<AudioNote[]>([]);
  const [poly, setPoly] = useState(0);
  const [level, setLevel] = useState(0);
  const [now, setNow] = useState(0);
  const [click, setClick] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [short, setShort] = useState(false);
  const frames = useRef<AFrame[]>([]);
  const zero = useRef(0);
  const t0 = useRef<number | null>(null);
  const lastSound = useRef(0);
  const done = useRef(false);
  const seg = useRef<CaptureSegment | null>(null);
  const stop = useRef<AbortController | null>(null);
  const topLine = inst === 'piano';

  const caughtNow = (): ReturnType<typeof audioNotes> => {
    const from = t0.current ?? 0;
    // the take's timeline starts at the first sound (0 ms); a little before it keeps the attack
    const fs = frames.current.filter((f) => f.t >= from - 600).map((f) => ({ ...f, t: f.t - from }));
    return audioNotes(fs, { topLine });
  };
  const finish = async () => {
    if (done.current) return;
    done.current = true;
    stop.current?.abort();
    const a = caughtNow();
    if (a.notes.length < 3) {
      // too little to keep: arm again (nothing is lost — nothing was caught)
      done.current = false;
      frames.current = frames.current.slice(-20);
      t0.current = null;
      setNotes([]);
      setState('armed');
      setShort(true);
      start();
      return;
    }
    const title = { en: 'Free recording', he: 'הקלטה חופשית' };
    const ns = a.notes.map((n) => ({ pitch: n.pitch, on: n.on, off: n.off, vel: n.vel }));
    const id = putMemoryTake({ kind: 'record', instrument: inst, title, source: 'mic', notes: ns, conf: a.notes.map((n) => n.conf), poly: a.poly, ...(topLine ? { topLine: true } : {}) });
    // My recordings: the notes, and the audio of this capture when the player keeps audio (on the device only)
    const durationMs = Math.round(Math.max(...ns.map((n) => n.off ?? n.on)));
    const s = seg.current;
    const audio = s ? await Promise.race([s.done.then(() => s.audio()), new Promise<null>((r) => setTimeout(() => r(null), 1500))]).catch(() => null) : null;
    void saveTake({ durationMs, course: null, instrument: inst, kind: 'record', title, sung: inst === 'voice', source: 'mic', played: ns }, audio).catch(() => {});
    nav(`caught/${encodeURIComponent(id)}`);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const start = () => {
    const c = new AbortController();
    stop.current = c;
    const bass = inst === 'bass';
    void listenLoop(
      new BrowserPitchCapture(),
      c.signal,
      (f) => {
        if (done.current) return;
        const t = performance.now() - zero.current;
        frames.current.push({ t, hz: f.hz, conf: f.confidence, rms: f.rms, ...(f.chroma ? { chroma: f.chroma } : {}) });
      },
      undefined,
      { chroma: true, ...(bass ? bassPitchOpts(false) : {}) },
    ).then((e) => {
      if (e && !done.current) setErr(e.code === 'permission-denied' || e.code === 'os-blocked' ? (he ? 'אין גישה למיקרופון. אפשרו אותו בהגדרות הדפדפן.' : 'No microphone access. Allow it in the browser settings.') : he ? 'המיקרופון לא זמין.' : 'The microphone is not available.');
    });
  };

  useEffect(() => {
    zero.current = performance.now();
    const off = addCaptureTap({ audio: recordingPrefs().keepAudio && recordingPrefs().keepNotes, onSegment: (s) => (seg.current = s) });
    start();
    const id = window.setInterval(() => {
      if (done.current) return;
      const fs = frames.current;
      const tnow = performance.now() - zero.current;
      setNow(t0.current === null ? 0 : tnow - t0.current);
      const last = fs[fs.length - 1];
      setLevel(last ? Math.min(1, Math.sqrt(last.rms) * 2.2) : 0);
      const floor = noiseFloor(fs);
      const gate = gateOf(floor);
      if (t0.current === null) {
        // armed: the floor needs its first 500 ms, then the first loud, pitched frame starts the take
        if (tnow < 500) return;
        const at = firstSound(fs.filter((f) => f.t >= 500), gate);
        if (at === null) return;
        t0.current = at;
        lastSound.current = tnow;
        setShort(false);
        setState('listening');
      }
      if (last && last.rms >= gate && last.hz) lastSound.current = tnow;
      const a = caughtNow();
      setNotes(a.notes);
      setPoly(a.poly);
      if (tnow - lastSound.current > SILENCE_MS || (t0.current !== null && tnow - t0.current > MAX_MS)) void finishRef.current();
    }, 250);
    return () => {
      window.clearInterval(id);
      off();
      stop.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // the click (optional, default off), as in the MIDI record mode — through headphones it never reaches the take
  useEffect(() => {
    if (!click) return;
    const c = new AbortController();
    void piano.unlock().then(() => piano.play(Array.from({ length: 360 }, (_, k) => ({ midi: 96, start: k * 0.6, duration: 0.05, velocity: k % 4 ? 0.25 : 0.4, perc: (k % 4 ? 'click' : 'accent') as 'click' | 'accent' })), 216, c.signal).catch(() => {}));
    return () => c.abort();
  }, [click]);
  const live = notes.length >= 8 ? catchTake(notes) : null;
  const secs = Math.floor(now / 1000);
  const tracePts = useMemo(() => {
    const from = (t0.current ?? 0) + Math.max(0, now - TRACE_MS);
    return frames.current.filter((f) => f.t >= from && f.hz && f.conf >= 0.6).map((f) => ({ t: f.t - (t0.current ?? 0), m: midiOf(f.hz!) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, notes]);
  return (
    <main className="panel-screen enc-screen" data-encore="record" data-rec-state={state} data-rec-source="mic" data-rec-notes={notes.length}>
      {head(
        he ? 'הקלטה חופשית' : 'Free recording',
        <>
          {NAME[inst][lang]} · {he ? 'מיקרופון' : 'mic'}
        </>,
        () => nav(''),
        onMidi ? (
          <button className="link" onClick={onMidi} data-rec-midi="1">
            <bdi dir="ltr">MIDI</bdi>
          </button>
        ) : undefined,
      )}
      <div className="enc-card-flat enc-rec-bar row">
        <span className={`enc-recdot ${state === 'listening' ? 'on' : ''}`} aria-hidden="true" />
        <b className="grow">{state === 'listening' ? (he ? 'מקליט' : 'Recording') : inst === 'voice' ? (he ? 'שירו כשתרצו' : 'Sing when you like') : he ? 'נגנו כשתרצו' : 'Play when you like'}</b>
        <span className="enc-level" aria-hidden="true">
          <i style={{ width: `${Math.round(level * 100)}%` }} />
        </span>
        <span className="enc-time" dir="ltr">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="enc-card">
        <PitchTrace pts={tracePts} notes={notes} now={now} label={he ? 'מה ששמעתי' : 'what I heard'} />
        <div className="row wrap enc-live" style={{ opacity: live ? 1 : 0.55 }} data-live-detect={live ? '1' : '0'}>
          <span className="ch q">
            {live ? <KeyB k={live.key.best.tonic} minor={live.key.best.minor} /> : '—'} {live && <Conf d={dotsOf(live.key.conf)} />}
          </span>
          <span className="ch q">
            {live ? <Tempo bpm={`≈${live.grid.bpm}`} /> : <Tempo bpm="—" />} {live && <Conf d={dotsOf(live.grid.conf)} />}
          </span>
          <span className="ch q">
            <bdi dir="ltr">{notes.length}</bdi> {he ? 'צלילים' : 'notes'}
          </span>
        </div>
      </div>
      {poly > 0.4 && state === 'listening' ? (
        <p className="field-hint" data-rec-poly="1">{he ? 'נשמעים אקורדים — כרגע נתפס רק קו אחד. תמלול אקורדים מהמיקרופון יגיע בגרסה הבאה.' : 'Chords heard — only a single line is caught for now. Chords by microphone come in a later version.'}</p>
      ) : topLine ? (
        <p className="field-hint">{he ? 'פסנתר במיקרופון: רק הקו העליון, בביטחון נמוך יותר.' : 'Piano by mic: the top line only, at lower confidence.'}</p>
      ) : short ? (
        <p className="field-hint" data-rec-short="1">{he ? 'נתפסו פחות משלושה צלילים — נסו שוב, קרוב יותר למיקרופון.' : 'Fewer than three notes caught — try again, closer to the mic.'}</p>
      ) : null}
      {err && <p className="field-hint" role="alert">{err}</p>}
      <div className="row">
        <small className="t3 grow">{he ? 'נעצר אחרי 2.5 שניות של שקט' : 'Stops after 2.5 s of silence'}</small>
        <label className="row enc-tog-row">
          <small className="t3">{he ? 'מטרונום' : 'Click'}</small>
          <input type="checkbox" className="enc-tog" checked={click} onChange={(e) => setClick(e.target.checked)} data-rec-click="1" />
        </label>
      </div>
      <div className="enc-foot">
        <button className="btn mega enc-full" onClick={() => void finish()} disabled={state !== 'listening'} data-rec-stop="1">
          <span className="enc-stop" aria-hidden="true" />
          {he ? 'לעצור' : 'Stop'}
        </button>
      </div>
    </main>
  );
}

/** The live pitch trace (§4.3): the heard pitch over the last 8 s as a line, the caught notes as bars under it. */
function PitchTrace({ pts, notes, now, label }: { pts: { t: number; m: number }[]; notes: AudioNote[]; now: number; label: string }) {
  const W = 340;
  const H = 170;
  const t1 = Math.max(TRACE_MS, now);
  const t0 = t1 - TRACE_MS;
  const ms = [...pts.map((p) => p.m), ...notes.filter((n) => (n.off ?? n.on) >= t0).map((n) => n.pitch)];
  const lo = Math.floor(Math.min(...ms, 57)) - 2;
  const hi = Math.ceil(Math.max(...ms, 69)) + 2;
  const x = (t: number) => ((t - t0) / TRACE_MS) * (W - 8) + 4;
  const y = (m: number) => H - 6 - ((m - lo) / Math.max(1, hi - lo)) * (H - 12);
  let path = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const gap = i === 0 || p.t - pts[i - 1].t > 90;
    path += `${gap ? 'M' : 'L'}${x(p.t).toFixed(1)} ${y(p.m).toFixed(1)} `;
  }
  return (
    <svg className="enc-trace" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ direction: 'ltr' }} data-trace-pts={pts.length}>
      <rect x={0} y={0} width={W} height={H} rx={10} className="er-bg" />
      {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
        .filter((m) => m % 12 === 0)
        .map((m) => (
          <line key={m} x1={0} x2={W} y1={y(m)} y2={y(m)} className="er-beat" />
        ))}
      {notes
        .filter((n) => (n.off ?? n.on) >= t0)
        .map((n, i) => (
          <rect key={i} x={x(Math.max(t0, n.on))} y={y(n.pitch) - 4} width={Math.max(3, x(n.off ?? n.on + 100) - x(Math.max(t0, n.on)))} height={8} rx={3} className={`er-note ${n.conf < UNCLEAR ? 'ghost' : ''}`} />
        ))}
      <path d={path} className="enc-trace-line" />
      <line x1={x(t1) - 1} x2={x(t1) - 1} y1={4} y2={H - 4} className="er-play" />
    </svg>
  );
}

/** Tap 4 beats (§14.2): when the tempo of a rubato take is not sure, the player sets it. */
export function TapTempo({ lang, onBpm }: { lang: Lang; onBpm: (bpm: number) => void }) {
  const he = lang === 'he';
  const taps = useRef<number[]>([]);
  const [n, setN] = useState(0);
  const tap = () => {
    const t = performance.now();
    const ts = taps.current.filter((x) => t - x < 3000);
    ts.push(t);
    taps.current = ts;
    setN(ts.length);
    if (ts.length >= 4) {
      const iv = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b);
      const med = iv[iv.length >> 1];
      onBpm(Math.max(40, Math.min(320, Math.round(60000 / med))));
      taps.current = [];
      setN(0);
    }
  };
  return (
    <button className="ch" onClick={tap} data-tap-tempo={n}>
      {n ? <bdi dir="ltr">{'●'.repeat(n) + '○'.repeat(4 - n)}</bdi> : he ? 'הקישו 4 פעמות' : 'Tap 4 beats'}
    </button>
  );
}

/** The caught card's line for an audio take: by ear, its confidence, unclear notes — and "too polyphonic" plainly. */
export function audioTakeNote(t: EncoreTake, lang: Lang): React.ReactNode {
  if (t.source !== 'mic') return null;
  const he = lang === 'he';
  const conf = t.conf?.length ? t.conf.reduce((a, b) => a + b, 0) / t.conf.length : null;
  const unclear = t.conf?.filter((c) => c < UNCLEAR).length ?? t.notes.filter((n) => n.vel < 25).length;
  if ((t.poly ?? 0) > 0.4)
    return (
      <p className="field-hint enc-poly" data-caught-poly="1">
        {he ? 'הניסיון הזה פוליפוני מדי — נתפס רק הקו העליון. תמלול אקורדים מהמיקרופון יגיע בגרסה 3.' : 'This take is too polyphonic — only its top line was caught. Chords by microphone come in version 3.'}
      </p>
    );
  return (
    <small className="t3 enc-center" data-caught-audio="1">
      {he ? 'נתפס מהמיקרופון' : 'Caught by ear'}
      {t.topLine ? (he ? ' · קו עליון בלבד' : ' · top line only') : ''}
      {conf !== null && (
        <>
          {' · '}
          <Conf d={dotsOf(conf)} />
        </>
      )}
      {unclear > 0 && (
        <>
          {' · '}
          <bdi dir="ltr">{unclear}</bdi> {he ? 'לא ברורים' : 'unclear'}
        </>
      )}
    </small>
  );
}
