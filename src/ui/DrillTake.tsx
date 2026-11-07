// One drill take (spec AI §3): the notes, the metronome with a count-in, MIDI recording (velocity, release,
// both hands), then the analysis right away — verdict, the evenness strip, the velocity curve, the hands chart.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Drill, PlayedNote, TakeMetrics, DrillCalibration } from '../engine/drills/types';
import { analyzeTake, tempoBand, thresholds } from '../engine/drills/analyze';
import type { ExpNote, NoteResult } from '../engine/drills/types';
import { NoteStaff, TabLine, type NoteMark } from './NoteViews';
import { markOf } from '../engine/noteMarks';
import { analyzeGuitarTake, detectOnsets, type GFrame } from '../engine/drills/guitarAnalyze';
import { isGuitarDrill } from '../engine/drills/events';
import { analyzePedal, pedalDown, type PedalEvent } from '../engine/drills/pedal';
import { piano } from './services';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';

type Lang = 'he' | 'en';
const TX = {
  en: { play: 'Play', stop: 'Stop', countIn: 'Count-in…', go: 'Go!', again: 'Again', slower: 'Slower −10 %', next: 'Next', clean: 'Clean', almost: 'Almost', not: 'Not yet', midiOff: 'Turn on MIDI in Settings for the full analysis — the microphone hears pitch and timing only.', evenness: 'Timing per note (early ← → late)', velocity: 'Loudness per note', hands: 'Hands together (RH − LH, ms)', notes: 'notes', wrong: 'wrong', missing: 'missing', bpm: '♩', loop: 'Loop the spot −15 %' },
  he: { play: 'לנגן', stop: 'עצירה', countIn: 'ספירה…', go: 'עכשיו!', again: 'שוב', slower: 'לאט יותר −10%', next: 'הבא', clean: 'נקי', almost: 'כמעט', not: 'עוד לא', midiOff: 'הדליקו MIDI בהגדרות לניתוח המלא — המיקרופון שומע רק גובה ותזמון.', evenness: 'תזמון לכל תו (מוקדם ← → מאוחר)', velocity: 'עוצמה לכל תו', hands: 'שתי הידיים יחד (ימין − שמאל, מ״ש)', notes: 'תווים', wrong: 'שגויים', missing: 'חסרים', bpm: '♩', loop: 'לחזור על הקטע −15%' },
};

const keyName = (sig: string) => (sig === 'C' ? null : { letter: sig[0] as 'C', acc: (sig.includes('b') ? -1 : sig.includes('#') ? 1 : 0) as -1 | 0 | 1 });

/** Staff(s) for a drill: treble for RH, bass for LH (both when hands together). Long drills show the first 2 bars per line. */
const noteKey = (n: ExpNote) => `${n.hand}:${n.beat}:${n.pitch}`;
const WORSE: NoteMark[] = ['missed', 'wrong', 'timing', 'ok'];

const TECH_SYM: Partial<Record<NonNullable<ExpNote['technique']>, string>> = { hammer: 'h', pull: 'p', slide: '/', bend: 'b', prebend: 'pb', release: 'r', vibrato: '~', tap: 'T', harmonic: 'harm', mute: 'PM', dead: 'X', 'strum-down': '↓', 'strum-up': '↑', 'rest-stroke': 'apoy.', rasgueado: 'rasg.' };
const STROKE_SYM: Record<string, string> = { D: '⊓', U: 'V', p: 'p', i: 'i', m: 'm', a: 'a', c: 'c' };

/** Guitar / bass drill as tab (spec AJ): string / fret, technique marks above, fingers or strokes below, result colours. */
export function DrillTab({ drill, fingering = false, picking = false, result }: { drill: Drill; fingering?: boolean; picking?: boolean; result?: TakeMetrics | null }) {
  const ns = drill.notes;
  const byKey = new Map<string, NoteResult>();
  for (const r of result?.perNote ?? []) byKey.set(noteKey(r.exp), r);
  const timingMs = result ? thresholds(tempoBand(result.nps)).sd * 2 : 0;
  const cols: { pos: { str: number; fret: number | 'x' }[]; dur: number; top?: string; bottom?: string; mark?: NoteMark }[] = [];
  const seen = new Set<number>();
  for (const n of ns) {
    if (n.chordId !== undefined) {
      if (seen.has(n.chordId)) continue;
      seen.add(n.chordId);
    }
    const group = n.chordId === undefined ? [n] : ns.filter((x) => x.chordId === n.chordId);
    const pos = group.filter((x) => x.string).map((x) => ({ str: x.string!, fret: x.technique === 'dead' ? ('x' as const) : (x.fret ?? 0) }));
    if (!pos.length) continue;
    const tech = n.technique && TECH_SYM[n.technique] ? TECH_SYM[n.technique]! + (n.bendCents && n.technique !== 'vibrato' ? (n.bendCents >= 200 ? ' full' : ' ½') : '') : undefined;
    const bottom = picking ? (n.stroke ? STROKE_SYM[n.stroke] : undefined) : fingering && n.finger ? String(n.finger) : undefined;
    const ms = result ? group.map((x) => markOf(byKey.get(noteKey(x)), timingMs)) : [];
    cols.push({ pos, dur: Math.max(0.25, n.dur), top: tech, bottom, mark: result ? WORSE.find((w) => ms.includes(w)) : undefined });
  }
  const strings = drill.spec.instrument === 'bass' || drill.spec.family === 'g-bass' ? 4 : 6;
  const lines: (typeof cols)[] = [];
  for (let i = 0; i < Math.min(cols.length, 32); i += 8) lines.push(cols.slice(i, i + 8));
  return (
    <div className="drill-staff drill-tab">
      {lines.map((l, i) => (
        <TabLine key={i} cols={l.map(({ mark: _m, ...c }) => c)} marks={result ? l.map((c) => c.mark) : undefined} strings={strings} />
      ))}
    </div>
  );
}

export function DrillStaff({ drill, fingering = false, result }: { drill: Drill; fingering?: boolean; result?: TakeMetrics | null }) {
  const rh = drill.notes.filter((n) => n.hand === 'R');
  const byKey = new Map<string, NoteResult>();
  for (const r of result?.perNote ?? []) byKey.set(noteKey(r.exp), r);
  const timingMs = result ? thresholds(tempoBand(result.nps)).sd * 2 : 0;
  /** A chord shows its worst note's mark. */
  const markFor = (n: ExpNote, ns: ExpNote[]): NoteMark => {
    if (!result) return undefined;
    const group = n.chordId === undefined ? [n] : ns.filter((x) => x.chordId === n.chordId);
    const ms = group.map((x) => markOf(byKey.get(noteKey(x)), timingMs));
    return WORSE.find((w) => ms.includes(w));
  };
  const lh = drill.notes.filter((n) => n.hand === 'L');
  const k = keyName(drill.keySig);
  const firstOfChord = (ns: typeof rh) => ns.filter((n, i) => n.chordId === undefined || ns.findIndex((m) => m.chordId === n.chordId) === i);
  const draw = (ns: typeof rh, clef: 'treble' | 'bass') => {
    // A song shows all of itself (≤ 96 notes); other drills their first 32.
    const all = firstOfChord(ns).slice(0, drill.chart ? 96 : 32);
    const lines: (typeof all)[] = [];
    for (let i = 0; i < all.length; i += 8) lines.push(all.slice(i, i + 8));
    return lines.map((xs, li) => {
      const labels = fingering && xs.some((n) => n.finger) ? xs.map((n) => (n.finger ? String(n.finger) : '')) : undefined;
      const marks = result ? xs.map((n) => markFor(n, ns)) : undefined;
      return <NoteStaff key={`${clef}${li}`} notes={xs.map((n) => n.pitch)} chord={false} keyPc={k} clef={clef} durs={xs.map((n) => Math.max(0.5, n.dur))} labels={labels} marks={marks} />;
    });
  };
  return (
    <div className="drill-staff">
      {drill.chart && (
        <ol className="song-chart" aria-label="chords" dir="ltr">
          {drill.chart.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      )}
      {draw(rh, 'treble')}
      {draw(lh, 'bass')}
    </div>
  );
}

/** The colour key under a marked staff (shape + word, never colour-only). */
export function MarkLegend({ lang }: { lang: Lang }) {
  const L = lang === 'he' ? { ok: 'נכון', timing: '~ לא בזמן', wrong: '✕ שגוי', missed: '○ חסר' } : { ok: 'Right', timing: '~ Off time', wrong: '✕ Wrong', missed: '○ Missed' };
  return (
    <p className="mark-legend">
      <span className="mk ok">● {L.ok}</span>
      <span className="mk timing">● {L.timing}</span>
      <span className="mk wrong">● {L.wrong}</span>
      <span className="mk missed">● {L.missed}</span>
    </p>
  );
}

export function EvennessStrip({ m, lang }: { m: TakeMetrics; lang: Lang }) {
  const W = 300;
  const H = 70;
  const res = m.perNote;
  const max = 80;
  const bw = W / Math.max(1, res.length);
  return (
    <figure className="drill-chart">
      <figcaption>{TX[lang].evenness}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={TX[lang].evenness} style={{ direction: 'ltr' }}>
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="axis" />
        {res.map((r, i) => {
          const d = r.dev ?? 0;
          const h = (Math.max(-max, Math.min(max, d)) / max) * (H / 2 - 4);
          const cls = !r.played ? 'miss' : !r.ok ? 'bad' : Math.abs(d) > 40 ? 'warn' : 'good';
          return <rect key={i} x={i * bw + 1} width={Math.max(1, bw - 2)} y={h < 0 ? H / 2 + h : H / 2 - h} height={Math.max(1.5, Math.abs(h))} className={`bar ${cls} ${r.exp.hand}`} />;
        })}
        {m.glitches.map((g) => (
          <circle key={`g${g}`} cx={g * bw + bw / 2} cy={6} r={3} className="glitch" />
        ))}
      </svg>
    </figure>
  );
}

export function VelocityCurve({ m, lang }: { m: TakeMetrics; lang: Lang }) {
  const pts = m.perNote.filter((r) => r.played);
  if (pts.length < 2) return null;
  const W = 300;
  const H = 60;
  return (
    <figure className="drill-chart">
      <figcaption>{TX[lang].velocity}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={TX[lang].velocity} style={{ direction: 'ltr' }}>
        {pts.map((r, i) => (
          <circle key={i} cx={(i + 0.5) * (W / pts.length)} cy={H - 4 - ((r.played!.vel / 127) * (H - 8))} r={2.6} className={`vdot ${r.exp.hand} ${r.exp.accent ? 'acc' : ''}`} />
        ))}
      </svg>
    </figure>
  );
}

/** Play a drill once: count-in, metronome, record; resolves with the analysis. */
export function DrillTake({ drill, bpm, lang, cal, onDone }: { drill: Drill; bpm: number; lang: Lang; cal: DrillCalibration; onDone: (m: TakeMetrics, played: PlayedNote[]) => void }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'ready' | 'count' | 'play'>('ready');
  const [beat, setBeat] = useState(-1);
  const ac = useRef<AbortController | null>(null);
  const useMidi = midi.devices.length > 0;
  useEffect(() => () => ac.current?.abort(), []);
  const start = async () => {
    await piano.unlock();
    const abort = new AbortController();
    ac.current = abort;
    const beatS = 60 / bpm;
    const clicks = Array.from({ length: drill.meter + Math.ceil(drill.beats) + 1 }, (_, i) => ({ t: i * beatS, accent: i % drill.meter === 0 }));
    const tl = { clicks, wood: [] as number[], responseAt: drill.meter * beatS, responseEnd: (drill.meter + drill.beats + 1) * beatS };
    let zero = 0;
    const notes: PlayedNote[] = [];
    const open = new Map<number, PlayedNote>();
    // Sustain pedal (CC64) for pedalling drills.
    const pedal: PedalEvent[] = [];
    let pedalWas = false;
    const offCC = drill.goal.pedal
      ? midi.onCC((cc, value, at) => {
          if (cc !== 64 || !zero) return;
          const d = pedalDown(value);
          if (d !== pedalWas) pedal.push({ at: at - zero - cal.latencyMs, down: d });
          pedalWas = d;
        })
      : null;
    const offMidi = midi.onNote((m, on, at, vel) => {
      if (!zero) return;
      const t = at - zero - cal.latencyMs;
      if (on) {
        const n: PlayedNote = { pitch: m, on: t, off: null, vel };
        notes.push(n);
        open.set(m, n);
      } else {
        const n = open.get(m);
        if (n) n.off = t;
        open.delete(m);
      }
    });
    // Microphone fallback (spec AI §6): pitch onsets only, no velocity / release.
    let micStop: AbortController | null = null;
    // Guitar / bass (spec AJ): raw frames → onsets (repeated notes and strums count) → the guitar analysis.
    const guitar = isGuitarDrill(drill);
    const frames: GFrame[] = [];
    if (guitar && !midi.devices.length) {
      micStop = new AbortController();
      void listenLoop(new BrowserPitchCapture(), micStop.signal, (f) => {
        if (!zero) return;
        frames.push({ t: performance.now() - zero - cal.latencyMs, hz: f.hz, conf: f.confidence, rms: f.rms });
      });
    } else if (!midi.devices.length) {
      micStop = new AbortController();
      let cand: number | null = null;
      let since = 0;
      let last: number | null = null;
      void listenLoop(new BrowserPitchCapture(), micStop.signal, (f) => {
        if (!zero) return;
        const now = performance.now();
        if (!f.hz || f.confidence < 0.85) {
          last = null;
          cand = null;
          return;
        }
        const m = Math.round(69 + 12 * Math.log2(f.hz / 440));
        if (m !== cand) {
          cand = m;
          since = now;
          return;
        }
        if (now - since > 60 && m !== last) {
          last = m;
          notes.push({ pitch: m, on: since - zero - cal.latencyMs, off: null, vel: 64 });
        }
      });
    }
    setPhase('count');
    try {
      await piano.playTimeline(
        tl,
        abort.signal,
        (i) => {
          setBeat(i);
          if (i >= drill.meter) setPhase('play');
        },
        (perf) => {
          zero = perf;
        },
      );
    } catch {
      /* stopped */
    } finally {
      offMidi();
      offCC?.();
      micStop?.abort();
    }
    if (abort.signal.aborted) {
      setPhase('ready');
      return;
    }
    setPhase('ready');
    if (guitar) {
      const played = frames.length ? detectOnsets(frames) : notes;
      return onDone(analyzeGuitarTake(drill, bpm, played, cal, frames), played);
    }
    const m = analyzeTake(drill, bpm, notes, cal);
    if (drill.goal.pedal && midi.devices.length) {
      const pr = analyzePedal(drill.goal.pedal, pedal, bpm);
      m.pedal = { ok: pr.ok, total: pr.total, pass: pr.pass };
      if (!pr.pass && m.verdict === 'clean') m.verdict = 'almost';
      if (!pr.pass || m.verdict === 'clean') m.why = pr.why;
    }
    onDone(m, notes);
  };
  return (
    <div className="drill-take">
      {!useMidi && !isGuitarDrill(drill) && <p className="field-hint">{tx.midiOff}</p>}
      <div className={`drill-beat ${phase}`} aria-live="polite" dir="ltr">
        {phase === 'count' ? `${tx.countIn} ${Math.max(1, drill.meter - beat)}` : phase === 'play' ? tx.go : `${tx.bpm} = ${bpm}`}
        <span className={`beat-dot ${beat % drill.meter === 0 ? 'accent' : ''}`} key={beat} />
      </div>
      {phase === 'ready' ? (
        <button className="btn mega" onClick={() => void start()} data-drill-play="1">
          ▶ {tx.play}
        </button>
      ) : (
        <button className="btn mega ghost" onClick={() => ac.current?.abort()}>
          ■ {tx.stop}
        </button>
      )}
    </div>
  );
}

/** The analysis shown after a take. */
export function TakeResult({ m, lang, onAgain, onSlower, onNext }: { m: TakeMetrics; lang: Lang; onAgain: () => void; onSlower: () => void; onNext?: () => void }) {
  const tx = TX[lang];
  const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`);
  const ms = (x: number | null) => (x === null ? '—' : `${Math.round(x)} ms`);
  const verdictText = m.verdict === 'clean' ? `✓ ${tx.clean}` : m.verdict === 'almost' ? tx.almost : tx.not;
  const hands = useMemo(() => m.handsAbs, [m]);
  return (
    <section className={`drill-result v-${m.verdict}`} aria-live="polite">
      <h2>{verdictText}</h2>
      <p className="drill-why">{m.why[lang]}</p>
      <div className="drill-stats" dir="ltr">
        <span>
          <b>{Math.round(m.accuracy * 100)}%</b> {tx.notes}
          {m.wrong ? ` · ${m.wrong} ${tx.wrong}` : ''}
          {m.missing ? ` · ${m.missing} ${tx.missing}` : ''}
        </span>
        <span>
          CV R <b>{pct(m.cvR)}</b> · L <b>{pct(m.cvL)}</b>
        </span>
        <span>
          ± <b>{ms(m.timingSD)}</b>
        </span>
        {hands !== null && (
          <span>
            ⇆ <b>{ms(hands)}</b>
          </span>
        )}
        {m.pedal && (
          <span>
            𝆮 <b>{m.pedal.ok}/{m.pedal.total}</b>
          </span>
        )}
        {m.velSD !== null && (
          <span>
            vel SD <b>{m.velSD.toFixed(1)}</b>
          </span>
        )}
      </div>
      <EvennessStrip m={m} lang={lang} />
      <VelocityCurve m={m} lang={lang} />
      <div className="drill-actions">
        <button className="btn" onClick={onAgain}>
          ↻ {tx.again}
        </button>
        <button className="btn ghost" onClick={onSlower}>
          {tx.slower}
        </button>
        {onNext && (
          <button className="btn primary" onClick={onNext}>
            {tx.next} ▶
          </button>
        )}
      </div>
    </section>
  );
}
