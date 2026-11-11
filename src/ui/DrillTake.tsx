// One drill take (spec AI §3): the notes, the metronome with a count-in, MIDI recording (velocity, release,
// both hands), then the analysis right away — verdict, the evenness strip, the velocity curve, the hands chart.

import { useEffect, useMemo, useRef, useState } from 'react';
import { scoreInformedNotes } from '../engine/drills/pianoMic';
import type { Drill, PlayedNote, TakeMetrics, DrillCalibration } from '../engine/drills/types';
import { analyzeTake, micUnmeasurable, tempoBand, thresholds } from '../engine/drills/analyze';
import type { ExpNote, NoteResult } from '../engine/drills/types';
import { NoteStaff, TabLine, type NoteMark } from './NoteViews';
import { markOf } from '../engine/noteMarks';
import { analyzeGuitarTake, captureOptsFor, detectOnsets, onsetOptsFor, untimedPitch, type GFrame } from '../engine/drills/guitarAnalyze';
import { isGuitarDrill } from '../engine/drills/events';
import { analyzePedal, pedalDown, type PedalEvent } from '../engine/drills/pedal';
import { piano } from './services';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { tuningById } from '../engine/fretboard';
import { bandBass } from '../engine/drills/bassBand';
import { drillBandHits, drillDrumHits, unisonLine } from '../engine/drills/bandTimeline';
import { clickPlan, hasTimeline, staffLines, timeMapOf } from '../engine/drills/timeline';
import { withProg } from '../engine/drills/progAnalyze';
import { isDrumDrill } from '../engine/drills/events';
import { analyzeDrumTake, drumLimbLine, type DrumTakeHit } from '../engine/drills/drumAnalyze';
import { kitKind, VOICE_NOTE, type KitProfile } from '../engine/drumKit';
import { acousticHits, acousticOk, acousticOnsets, drillAcousticVoices } from '../engine/drumAcoustic';
import type { NoteEvent } from '../engine/lesson';

type Lang = 'he' | 'en';
const TX = {
  en: { play: 'Play', stop: 'Stop', countIn: 'Count-in…', go: 'Go!', again: 'Again', slower: 'Slower −10%', next: 'Next', clean: 'Clean', almost: 'Almost', not: 'Not yet', midiOff: 'Turn on MIDI in Settings for the full analysis — the microphone hears pitch and timing only.', evenness: 'Timing per note (early ← → late)', velocity: 'Loudness per note', hands: 'Hands together (RH − LH, ms)', notes: 'notes', wrong: 'wrong', missing: 'missing', bpm: '♩', loop: 'Loop the spot −15%' },
  he: { play: 'לנגן', stop: 'עצירה', countIn: 'ספירה…', go: 'עכשיו!', again: 'שוב', slower: 'לאט יותר −10%', next: 'הבא', clean: 'נקי', almost: 'כמעט', not: 'עוד לא', midiOff: 'הדליקו MIDI בהגדרות לניתוח המלא — המיקרופון שומע רק גובה ותזמון.', evenness: 'תזמון לכל תו (מוקדם ← → מאוחר)', velocity: 'עוצמה לכל תו', hands: 'שתי הידיים יחד (ימין − שמאל, מ״ש)', notes: 'תווים', wrong: 'שגויים', missing: 'חסרים', bpm: '♩', loop: 'לחזור על הקטע −15%' },
};

const keyName = (sig: string) => (sig === 'C' ? null : { letter: sig[0] as 'C', acc: (sig.includes('b') ? -1 : sig.includes('#') ? 1 : 0) as -1 | 0 | 1 });

/** Staff(s) for a drill: treble for RH, bass for LH (both when hands together). Long drills show the first 2 bars per line. */
const noteKey = (n: ExpNote) => `${n.hand}:${n.beat}:${n.pitch}`;
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const WORSE: NoteMark[] = ['missed', 'wrong', 'timing', 'ok'];

const TECH_SYM: Partial<Record<NonNullable<ExpNote['technique']>, string>> = { hammer: 'h', pull: 'p', slide: '/', bend: 'b', prebend: 'pb', release: 'r', vibrato: '~', tap: 'T', harmonic: 'harm', mute: 'PM', dead: 'X', 'strum-down': '↓', 'strum-up': '↑', 'rest-stroke': 'apoy.', rasgueado: 'rasg.' };
const STROKE_SYM: Record<string, string> = { D: '⊓', U: 'V', p: 'p', i: 'i', m: 'm', a: 'a', c: 'c' };

/** A bass drill (bass course, the old g-bass family, or a bass custom drill). */
export const isBassDrill = (d: Drill): boolean => d.spec.instrument === 'bass' || d.spec.family === 'g-bass' || d.spec.family.startsWith('b-');
/** Drill beats → quarter notes (eighth-note meters count eighths). */
const qOf = (d: Drill): number => (d.pulse === 8 ? 0.5 : 1);

/**
 * B2: a moving window over the lines of a long drill — two lines (four bars) at a time, following the take's beat, so
 * the whole drill is reachable and still fits one phone screen. Idle: small ‹ › page buttons; after a take it opens
 * on the first line with a mistake.
 */
export function useLineWindow(lines: number, beat: number, perLine: number, focus: number): { from: number; pager: React.ReactNode } {
  const [page, setPage] = useState(0);
  const [lastFocus, setLastFocus] = useState(focus);
  if (focus !== lastFocus) {
    setLastFocus(focus);
    setPage(Math.max(0, Math.min(lines - 2, focus)));
  }
  const follow = beat >= 0 ? Math.max(0, Math.min(lines - 2, Math.floor(beat / perLine + 1e-6))) : null;
  const from = follow ?? Math.max(0, Math.min(page, lines - 2));
  const pager =
    lines > 2 && follow === null ? (
      <div className="tab-pager" dir="ltr">
        <button className="icon-btn" aria-label="Previous lines" disabled={from === 0} onClick={() => setPage(Math.max(0, from - 2))}>
          ‹
        </button>
        <small>
          {from + 1}–{Math.min(lines, from + 2)} / {lines}
        </small>
        <button className="icon-btn" aria-label="Next lines" disabled={from + 2 >= lines} onClick={() => setPage(Math.min(lines - 2, from + 2))}>
          ›
        </button>
      </div>
    ) : null;
  return { from, pager };
}

/** Guitar / bass drill as tab (spec AJ): string / fret, technique marks above, fingers or strokes below, result colours. */
export function DrillTab({ drill, fingering = false, picking = false, result, beat = -1, upTo }: { drill: Drill; fingering?: boolean; picking?: boolean; result?: TakeMetrics | null; /** Beat of the running take (−1 idle): the window follows it. */ beat?: number; /** Only the notes before this beat (the written bars of a free-choice drill). */ upTo?: number }) {
  const ns = upTo === undefined ? drill.notes : drill.notes.filter((n) => n.beat < upTo - 1e-6);
  const byKey = new Map<string, NoteResult>();
  for (const r of result?.perNote ?? []) byKey.set(noteKey(r.exp), r);
  const timingMs = result ? thresholds(tempoBand(result.nps)).sd * 2 : 0;
  const cols: { pos: { str: number; fret: number | 'x' }[]; dur: number; at: number; top?: string; bottom?: string; mark?: NoteMark }[] = [];
  const seen = new Set<number>();
  const k = qOf(drill);
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
    cols.push({ pos, dur: Math.max(0.25, n.dur * k), at: n.beat, top: tech, bottom, mark: result ? WORSE.find((w) => ms.includes(w)) : undefined });
  }
  const strings = drill.spec.tuning ? tuningById(drill.spec.tuning).open.length : isBassDrill(drill) ? 4 : 6;
  // B2 (0.64): the whole drill, two bars a line (bar lines where the music has them), in a window that follows the beat.
  const perLine = (drill.meter || 4) * 2;
  // Mixed meters (prog timeline, GUITAR_DEEPENING P2): lines of whole bars from the time map, bar lines at each bar's
  // real length and the time signature where it changes — not a constant bar.
  const sl = hasTimeline(drill) ? staffLines(drill, 8) : null;
  const lineOf = (at: number) => (sl ? Math.max(0, sl.findIndex((l) => at * k < l.to - 1e-6)) : Math.floor(at / perLine + 1e-6));
  const lines: (typeof cols)[] = [];
  for (const c of cols) (lines[lineOf(c.at)] ??= []).push(c);
  for (let i = 0; i < Math.max(lines.length, sl?.length ?? 0); i++) lines[i] ??= [];
  const firstBad = result ? lines.findIndex((l) => l.some((c) => c.mark && c.mark !== 'ok')) : -1;
  // The window follows the running beat by line (a timeline's lines differ in length).
  const lineBeat = sl && beat >= 0 ? Math.max(0, lineOf(beat)) * perLine : beat;
  const { from, pager } = useLineWindow(lines.length, lineBeat, perLine, Math.max(0, firstBad));
  return (
    <div className="drill-staff drill-tab" data-tab-lines={lines.length} {...(sl ? { 'data-tab-bars': sl.map((l) => l.bars.map((b) => b.cur).join(' ')).join(' | ') } : {})}>
      {lines.slice(from, from + 2).map((l, i) =>
        l.length ? (
          <TabLine
            key={from + i}
            cols={l.map(({ mark: _m, at: _a, ...c }) => c)}
            marks={result ? l.map((c) => c.mark) : undefined}
            strings={strings}
            {...(sl?.[from + i] ? { bars: sl[from + i].bars.map((b, j) => ({ len: b.len, sig: b.sig ?? (from + i === 0 && j === 0 ? b.cur : undefined) })), at: l.map((c) => c.at * k - sl[from + i].from) } : {})}
          />
        ) : (
          <div key={from + i} className="tab-rest-line" />
        ),
      )}
      {pager}
    </div>
  );
}

/**
 * B3: a free-choice drill shows only its chord chart — bars with the chord and one slash a beat, the bar being played
 * marked. From `fromBeat` on (a written start comes before it in notation / tab).
 */
export function ChartView({ drill, beat = -1, fromBeat = 0 }: { drill: Drill; beat?: number; fromBeat?: number }) {
  const meter = drill.meter || 4;
  const first = Math.floor(fromBeat / meter + 1e-6);
  const bars = (drill.chart ?? []).slice(first);
  const cur = beat >= 0 ? Math.floor(beat / meter + 1e-6) - first : -1;
  // Four bars a row; long charts show the rows around the bar being played (one screen).
  const rows: string[][] = [];
  for (let i = 0; i < bars.length; i += 4) rows.push(bars.slice(i, i + 4));
  const curRow = cur >= 0 ? Math.floor(cur / 4) : 0;
  const start = Math.max(0, Math.min(rows.length - 4, curRow - 1));
  const slashes = Math.min(meter, 7);
  return (
    <div className="chart-view" dir="ltr" data-chart-only="1" aria-label="chord chart">
      {rows.slice(start, start + 4).map((r, ri) => (
        <ol key={start + ri} className="chart-row">
          {r.map((c, i) => {
            const idx = (start + ri) * 4 + i;
            return (
              <li key={idx} className={`chart-bar ${idx === cur ? 'now' : ''}`}>
                <b>{c || '%'}</b>
                <span aria-hidden>{'/ '.repeat(slashes).trim()}</span>
              </li>
            );
          })}
        </ol>
      ))}
    </div>
  );
}

/** B11: an ear drill before its result — what to do, and which bars the band plays and which are yours. */
export function EarCard({ drill, beat = -1, lang }: { drill: Drill; beat?: number; lang: Lang }) {
  const meter = drill.meter || 4;
  const bars = Math.ceil(drill.beats / meter - 1e-6);
  const cur = beat >= 0 ? Math.floor(beat / meter + 1e-6) : -1;
  const band = (bar: number) => (drill.listen?.windows ?? []).some(([a, b]) => bar * meter >= a - 1e-6 && bar * meter < b - 1e-6);
  return (
    <div className="ear-card" data-ear-card="1">
      <p className="ear-ask">{drill.listen?.ask[lang]}</p>
      <ol className="ear-bars" dir="ltr">
        {Array.from({ length: bars }, (_, i) => (
          <li key={i} className={`${band(i) ? 'band' : 'you'} ${i === cur ? 'now' : ''}`}>
            {band(i) ? (lang === 'he' ? 'הקשבה' : 'Listen') : lang === 'he' ? 'אתם' : 'You'}
            {/* PIANO_JAZZ trading fours: the bar's chords under the label. */}
            {drill.chart?.[i] && <small className="ear-chord">{drill.chart[i]}</small>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DrillStaff({ drill, fingering = false, result, beat = -1, upTo }: { drill: Drill; fingering?: boolean; result?: TakeMetrics | null; beat?: number; upTo?: number }) {
  // B1 (0.64): bass is written in the bass clef an octave above where it sounds (standard bass notation); the
  // upright's upper register in the tenor clef. B7: eighth-note meters are drawn in eighths with an x/8 signature.
  const bass = isBassDrill(drill);
  const shift = bass ? 12 : 0;
  const qk = qOf(drill);
  // The upright's thumb position reads the treble clef (ABRSM Gr 8), also an octave above the sound.
  const rhClef: 'treble' | 'bass' | 'tenor' = bass ? (drill.spec.kind === 'tenor' ? 'tenor' : drill.spec.kind === 'treble' ? 'treble' : 'bass') : 'treble';
  const rh = drill.notes.filter((n) => n.hand === 'R' && (upTo === undefined || n.beat < upTo - 1e-6));
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
  /** Under a marked note (0.52): what was really played — the note name for a wrong pitch, ms early / late off time. */
  const playedLabel = (n: ExpNote): string => {
    const r = byKey.get(noteKey(n));
    if (!r) return '';
    if (r.played && r.played.pitch !== n.pitch) return `✕ ${NAMES[((r.played.pitch % 12) + 12) % 12]}${Math.floor(r.played.pitch / 12) - 1}`;
    if (!r.played) return '○';
    if (r.dev !== null && Math.abs(r.dev) > timingMs) return `${r.dev > 0 ? '+' : '−'}${Math.round(Math.abs(r.dev))}`;
    return '';
  };
  // Lines by bars (0.52): two bars a line, bar lines and the time signature — never a lone note on its own line.
  // Positions are in quarter notes (eighth-note meters: beats × ½).
  const meter = (drill.meter || 4) * qk;
  const sig = drill.pulse === 8 ? `${drill.meter}/8` : undefined;
  const per = meter * (meter >= 6 ? 1 : 2);
  const bq = (n: ExpNote) => n.beat * qk;
  const dq = (n: ExpNote) => n.dur * qk;
  // Mixed meters / a tempo map (prog timeline): lines of whole bars from the engine, bar lines and time signatures per bar.
  const sl = hasTimeline(drill) ? staffLines(drill, 8) : null;
  const lineAtQ = (q: number) => (sl ? Math.max(0, sl.findIndex((l) => q < l.to - 1e-6) < 0 ? sl.length - 1 : sl.findIndex((l) => q < l.to - 1e-6)) : Math.floor(q / per + 1e-6));
  const lineOf = (n: ExpNote) => lineAtQ(bq(n));
  // A song shows all of itself (≤ 96 notes); a bass drill all of itself in a moving window (B2); others their first 8 bars.
  const shown = (ns: ExpNote[]) => firstOfChord(ns).filter((n) => drill.chart || bass || bq(n) < meter * 8);
  const nLines = Math.max(1, ...shown(rh).map((n) => lineOf(n) + 1));
  const firstBad = result ? shown(rh).find((n) => markFor(n, rh) && markFor(n, rh) !== 'ok') : undefined;
  const win = useLineWindow(nLines, beat >= 0 ? (sl ? lineAtQ(beat * qk) * per : beat * qk) : -1, per, firstBad ? lineOf(firstBad) : 0);
  const draw = (ns: typeof rh, clef: 'treble' | 'bass' | 'tenor', windowed: boolean) => {
    const all = shown(ns);
    const lines: (typeof all)[] = [];
    for (const n of all) (lines[lineOf(n)] ??= []).push(n);
    return lines.map((xs, li) => {
      if (!xs || (windowed && (li < win.from || li >= win.from + 2))) return null;
      const fing = fingering && xs.some((n) => n.finger);
      const labels = result ? xs.map((n) => playedLabel(n) || (fing && n.finger ? String(n.finger) : '')) : fing ? xs.map((n) => (n.finger ? String(n.finger) : '')) : undefined;
      const marks = result ? xs.map((n) => markFor(n, ns)) : undefined;
      // Written values; a gap before the next note (or to the bar line at the end) becomes rests of standard values.
      type It = { n: ExpNote | null; dur: number };
      const items: It[] = [];
      const std = (d: number) => [4, 3, 2, 1.5, 1, 0.5].find((v) => v <= d + 1e-6) ?? 0.5;
      const pushRest = (gap: number) => {
        let g = gap;
        while (g > 0.49) {
          const v = [4, 2, 1, 0.5].find((x) => x <= g + 1e-6)!;
          items.push({ n: null, dur: v });
          g -= v;
        }
      };
      const lineStart = sl ? sl[li].from : li * per;
      const lineEnd = sl ? sl[li].to : lineStart + per;
      const barEnd = (q: number) => (sl ? (sl[li].bars.find((b) => q < b.from + b.len - 1e-6) ?? sl[li].bars[sl[li].bars.length - 1]).from + (sl[li].bars.find((b) => q < b.from + b.len - 1e-6) ?? sl[li].bars[sl[li].bars.length - 1]).len : Math.ceil(q / meter - 1e-6) * meter);
      if (bq(xs[0]) - lineStart > 0.49) pushRest(bq(xs[0]) - lineStart);
      xs.forEach((n, i) => {
        const nextAt = xs[i + 1] ? bq(xs[i + 1]) : Math.min(lineEnd, barEnd(bq(n) + dq(n) - 1e-6));
        const d = std(Math.min(Math.max(0.5, dq(n)), Math.max(0.5, nextAt - bq(n))));
        items.push({ n, dur: d });
        if (nextAt - (bq(n) + d) > 0.49) pushRest(nextAt - (bq(n) + d));
      });
      const idx = (n: ExpNote) => xs.indexOf(n);
      return (
        <NoteStaff
          key={`${clef}${li}`}
          notes={items.map((x) => (x.n ? x.n.pitch + shift : 71))}
          rests={items.map((x) => !x.n)}
          chord={false}
          keyPc={k}
          clef={clef}
          durs={items.map((x) => x.dur)}
          labels={labels ? items.map((x) => (x.n ? labels[idx(x.n)] : '')) : undefined}
          marks={marks ? items.map((x) => (x.n ? marks[idx(x.n)] : undefined)) : undefined}
          meter={meter}
          timeSig={li === 0 || (windowed && li === win.from) || !!sl?.[li].bars[0].sig}
          sig={sl ? sl[li].bars[0].cur : sig}
          bars={sl ? sl[li].bars.map((b) => ({ len: b.len, sig: b.sig })) : undefined}
        />
      );
    });
  };
  return (
    <div className="drill-staff" data-clef={rhClef}>
      {drill.chart && !bass && (
        <ol className="song-chart" aria-label="chords" dir="ltr">
          {drill.chart.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      )}
      {drill.chart && bass && (
        <ol className="song-chart" aria-label="chords" dir="ltr">
          {(sl ? drill.chart.slice(sl.slice(0, win.from).reduce((a, l) => a + l.bars.length, 0), sl.slice(0, win.from + 2).reduce((a, l) => a + l.bars.length, 0)) : drill.chart.slice((win.from * per) / meter, ((win.from + 2) * per) / meter)).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      )}
      {draw(rh, rhClef, bass)}
      {draw(lh, 'bass', false)}
      {bass && win.pager}
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
/** The band part of a bass drill as audio events (B5 drums, B11 ear prompts), in seconds from the timeline's start. */
function backingEvents(drill: Drill, beatS: number, drums: boolean, clock?: (beat: number) => number): NoteEvent[] {
  // piano.play schedules 60 ms ahead, playTimeline 120 ms: shift by the difference so both share one clock.
  // Timeline drills (mixed meters, a tempo map): the click plan's clock; lengths in beats at the local tempo.
  const at = (b: number) => 0.06 + (clock ? clock(b) : (drill.meter + b) * beatS);
  const len = (b: number, l: number) => (clock ? clock(b + l) - clock(b) : l * beatS);
  const out: NoteEvent[] = [];
  if (drums && drill.drums) {
    const PERC = { k: 'kick', s: 'snare', h: 'hat', 'tom-hi': 'tom-hi', 'tom-lo': 'tom-lo', crash: 'crash' } as const;
    for (const h of drillDrumHits(drill)) out.push({ midi: 36, start: at(h.beat), duration: 0.2, velocity: h.d === 'h' ? 0.4 : h.d === 'crash' ? 0.7 : 0.85, perc: PERC[h.d] });
  }
  // The harmony band (bassBand.ts / bandTimeline.ts): comping on the same clock, only where the drums may play (headphones / MIDI).
  if (drums) for (const h of drillBandHits(drill)) for (const m of h.notes) out.push({ midi: m, start: at(h.beat), duration: len(h.beat, h.len), velocity: h.vel, inst: 'piano' });
  // Drums course: the band's bass line (roots on the groove's kick, or walking in swing).
  if (drums) for (const n of bandBass(drill)) out.push({ midi: n.midi, start: at(n.beat), duration: len(n.beat, n.len), velocity: n.vel, inst: 'bass' });
  // PROG_ENGINE: the band doubles the written line (a unison riff): bass on the bass, guitar / keys on the piano for now.
  if (drums) for (const n of unisonLine(drill)) out.push({ midi: n.midi, start: at(n.beat), duration: len(n.beat, n.len), velocity: n.vel, inst: n.inst === 'bass' ? 'bass' : 'piano' });
  for (const n of drill.listen?.notes ?? [])
    for (const m of n.midi) out.push(n.perc ? { midi: m, start: at(n.beat), duration: len(n.beat, n.dur), velocity: n.vel ?? 0.45, perc: n.perc } : { midi: m, start: at(n.beat), duration: len(n.beat, n.dur), velocity: n.inst === 'bass' ? 0.85 : 0.5, inst: n.inst === 'bass' ? ('bass' as const) : ('piano' as const) });
  return out;
}

/** Items whose prep time has run (or was skipped) in this session: prep comes once per item, not before every take. */
const prepped = new Set<string>();
/** RSL Quick Study Piece: a prep countdown before the first take of a drill with `prep` seconds. */
function usePrep(drill: Drill): { left: number; skip: () => void } {
  const [left, setLeft] = useState(() => (drill.prep && !prepped.has(drill.itemId) ? drill.prep : 0));
  useEffect(() => {
    if (left <= 0) {
      if (drill.prep) prepped.add(drill.itemId);
      return;
    }
    const t = window.setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, drill.prep, drill.itemId]);
  return { left, skip: () => setLeft(0) };
}

/** Play a drill once: count-in, metronome, record; resolves with the analysis. */
export function DrillTake({ drill, bpm, lang, cal, onDone, onBeat, drumsOk, onDrums, kit }: { drill: Drill; bpm: number; lang: Lang; cal: DrillCalibration; onDone: (m: TakeMetrics, played: PlayedNote[]) => void; /** Beat index of the take (after the count-in; −1 when idle) — for a score cursor. */ onBeat?: (beat: number) => void; /** B5: headphones / line-in confirmed (undefined = never asked). An audio-routing choice only — it never passes anything. */ drumsOk?: boolean; onDrums?: (headphones: boolean) => void; /** Drums: the player's kit (map, velocity bands, practice-pad mode). */ kit?: KitProfile }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'ready' | 'count' | 'play'>('ready');
  const [beat, setBeat] = useState(-1);
  const ac = useRef<AbortController | null>(null);
  // Drums (0.65): an e-kit by MIDI, or a practice pad by microphone (single-surface items only — never self-report).
  const drum = isDrumDrill(drill);
  const drumMidi = drum && midi.devices.length > 0 && !kit?.mic;
  // An acoustic kit by microphone (calibrated): the basic groove levels, drums told apart by their sound (drumAcoustic).
  const acKit = drum && !drumMidi && kitKind(kit) === 'acoustic';
  const acoustic = acKit && !drill.drum?.mic && acousticOk(drill);
  const drumBlocked = drum && !drumMidi && !drill.drum?.mic && !acoustic;
  // A take whose drums were mostly not told apart: not counted (no pass, no fail) — the reason, and play again.
  const [voided, setVoided] = useState<{ en: string; he: string } | null>(null);
  const useMidi = drum ? drumMidi : midi.devices.length > 0;
  // PIANO_AUDIT A2: a piano drill whose goal is loudness, release or the pedal needs MIDI (the mic would pass it on notes alone).
  const pianoBlocked = !drum && !isGuitarDrill(drill) && !useMidi && micUnmeasurable(drill).length > 0;
  useEffect(() => () => ac.current?.abort(), []);
  // B5: drums under the take only when the mic can't hear them (headphones, line-in, or a MIDI bass); else the click.
  const drums = !!(drill.drums || drill.band) && (useMidi || drumsOk === true);
  // A kit-only drum drill without a kit is blocked: no headphones question for a band it can't play under.
  const askDrums = !!(drill.drums || drill.band) && !useMidi && !drumBlocked && drumsOk === undefined && !!onDrums;
  const prep = usePrep(drill);
  if (drill.untimed) return <UntimedTake drill={drill} lang={lang} cal={cal} onDone={onDone} />;
  const start = async () => {
    await piano.unlock();
    const abort = new AbortController();
    ac.current = abort;
    const beatS = 60 / bpm;
    // The click plan (timeline.ts): count-in, clicks (on the group starts in odd meters; following a tempo map), the
    // off-beat woodblock; with the drums playing, the click stops after the count-in (the drummer keeps time).
    const plan = clickPlan(drill, bpm, { drums });
    const tl = { clicks: plan.clicks, wood: plan.wood, responseAt: plan.responseAt, responseEnd: plan.responseEnd };
    const backing = backingEvents(drill, beatS, drums, hasTimeline(drill) ? plan.at : undefined);
    // B11: onsets inside the band's bars are not the answer (a speaker's sound on the mic).
    // Beat -> ms of the take (the timeline's map on prog drills; the old constant grid otherwise).
    const bms = (b: number) => (hasTimeline(drill) ? timeMapOf(drill, bpm).msAt(b) : b * beatS * 1000);
    // Every result passes the prog measures (unchanged for drills without a timeline, unison, form or goal.prog).
    const done = (m: TakeMetrics, played: PlayedNote[]) => onDone(withProg(m, drill, bpm, played), played);
    const inBand = (ms: number) => (drill.listen?.windows ?? []).some(([a, b]) => ms >= bms(a) - 40 && ms < bms(b) + 120);
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
    // Drum hits (MIDI drum mode, on for the take whatever course it was opened from): voice, velocity, hat openness.
    const drumHitsIn: DrumTakeHit[] = [];
    const prevMode = { drums: midi.opts.drums, kit: midi.opts.kit };
    if (drumMidi) midi.setOptions({ drums: true, ...(kit ? { kit } : {}) });
    const offHit = drumMidi
      ? midi.onHit((h) => {
          if (zero) drumHitsIn.push({ voice: h.voice, on: h.at - zero - cal.latencyMs, vel: h.vel, open: h.open, hat: h.hat });
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
    // Piano chords by microphone (0.49): frames with chroma, judged against the expected chords (score-informed).
    const pianoChords = !guitar && !drum && !midi.devices.length && drill.notes.some((n) => n.chordId !== undefined);
    // A practice pad by microphone: energy onsets on the raw frames (no pitch).
    const drumMic = drum && !drumMidi;
    if (((guitar || pianoChords) && !midi.devices.length) || drumMic) {
      micStop = new AbortController();
      // Chords in the drill → also a chroma per frame, so the analysis can hear which strings rang (SPEC-0.48 §I1).
      const chords = drill.notes.some((n, i) => drill.notes.some((o, j) => j !== i && Math.abs(o.beat - n.beat) < 1e-4));
      void listenLoop(
        new BrowserPitchCapture(),
        micStop.signal,
        (f) => {
          if (!zero) return;
          frames.push({ t: performance.now() - zero - cal.latencyMs, hz: f.hz, conf: f.confidence, rms: f.rms, chroma: f.chroma, centroid: f.centroid, bands: f.bands });
        },
        undefined,
        // BASS_AUDIT A1: bass hears down to low E / low B (28 / 22 Hz, a 4096-sample window, the spectral centroid).
        { chroma: chords && !drum, ...(captureOptsFor(drill) ?? {}), ...(acoustic ? { bands: true } : {}) },
      );
    } else if (!midi.devices.length && !drum) {
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
      if (backing.length) void piano.play(backing, plan.responseEnd + 0.5, abort.signal).catch(() => {});
      await piano.playTimeline(
        tl,
        abort.signal,
        (i) => {
          setBeat(i);
          onBeat?.(i - drill.meter);
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
      offHit?.();
      micStop?.abort();
      if (drumMidi) midi.setOptions(prevMode);
    }
    if (abort.signal.aborted) {
      setPhase('ready');
      return;
    }
    setPhase('ready');
    if (drum && acoustic && kit?.acoustic) {
      // Score-informed (only the drill's drums); ear drills: onsets inside the call's bars are the speaker, not the answer.
      const inCall = (ms: number) => (drill.listen?.windows ?? []).some(([a, b]) => ms >= bms(a) - 40 && ms < bms(b) - 40);
      const onsets = acousticOnsets(frames).filter((o) => !drill.listen || !inCall(o.t));
      const hits = acousticHits(onsets, kit.acoustic, drillAcousticVoices(drill, kit.acoustic));
      const played: PlayedNote[] = hits.map((h) => ({ pitch: h.voice ? VOICE_NOTE[h.voice] : VOICE_NOTE.snare, on: h.on, off: null, vel: h.vel }));
      const m = analyzeDrumTake(drill, bpm, hits, { kit, acoustic: { toms: !!kit.acoustic.tpl.tom } });
      if (m.drum?.missed.includes('unsure')) return setVoided(m.why);
      setVoided(null);
      return done(m, played);
    }
    if (drum) {
      // Ear drills: a speaker's call heard by the mic is never the answer — onsets inside the call's bars are dropped.
      // The answer's first stroke falls right on the call's end, so (unlike a ringing bass note) no tail is added.
      const inCall = (ms: number) => (drill.listen?.windows ?? []).some(([a, b]) => ms >= bms(a) - 40 && ms < bms(b) - 40);
      const hits: DrumTakeHit[] = drumMidi ? drumHitsIn : detectOnsets(frames, { refractoryMs: 35, ratio: 1.8 }).filter((p) => !drill.listen || !inCall(p.on)).map((p) => ({ voice: null, on: p.on, vel: p.vel }));
      const played: PlayedNote[] = hits.map((h) => ({ pitch: h.voice ? VOICE_NOTE[h.voice] : VOICE_NOTE.snare, on: h.on, off: null, vel: h.vel }));
      return done(analyzeDrumTake(drill, bpm, hits, { kit, mic: !drumMidi }), played);
    }
    if (guitar) {
      const heard = drill.listen ? frames.filter((f) => !inBand(f.t)) : frames;
      const played = (heard.length ? detectOnsets(heard, onsetOptsFor(drill)) : notes).filter((p) => !drill.listen || !inBand(p.on));
      return done(analyzeGuitarTake(drill, bpm, played, cal, heard), played);
    }
    // PIANO_AUDIT A2: the microphone is flagged so a loudness / release / pedal goal can't pass on notes alone.
    const pianoMicTake = !midi.devices.length;
    // Pianist's ear (k-ear): notes inside the call's bars are the app's call (or noodling), never the answer.
    const answer = (ps: PlayedNote[]) => (drill.listen ? ps.filter((p) => !inBand(p.on)) : ps);
    if (pianoChords) {
      const played = answer(scoreInformedNotes(drill, bpm, frames));
      return done(analyzeTake(drill, bpm, played, cal, { mic: true }), played);
    }
    const heardNotes = answer(notes);
    const m = analyzeTake(drill, bpm, heardNotes, cal, { mic: pianoMicTake });
    if (drill.goal.pedal && midi.devices.length) {
      const pr = analyzePedal(drill.goal.pedal, pedal, bpm);
      m.pedal = { ok: pr.ok, total: pr.total, pass: pr.pass };
      if (!pr.pass && m.verdict === 'clean') m.verdict = 'almost';
      if (!pr.pass || m.verdict === 'clean') m.why = pr.why;
    }
    done(m, heardNotes);
  };
  return (
    <div className="drill-take">
      {!useMidi && !isGuitarDrill(drill) && !drum && <p className="field-hint">{tx.midiOff}</p>}
      {drumBlocked && (
        <p className="kit-warn" data-drum-needs-kit="1">
          {acKit
            ? lang === 'he'
              ? 'התרגיל הזה צריך תופים אלקטרוניים (MIDI): במערכת אקוסטית המיקרופון לא מודד אותו.'
              : 'This one needs an e-kit (MIDI): on an acoustic kit the microphone can’t measure it.'
            : lang === 'he'
              ? 'התרגיל הזה צריך תופים אלקטרוניים (MIDI): המיקרופון שומע משטח אחד בלבד.'
              : 'This one needs an e-kit (MIDI): the microphone hears one surface only.'}
        </p>
      )}
      {pianoBlocked && (
        <p className="kit-warn" data-piano-needs-midi="1">
          {lang === 'he' ? 'התרגיל הזה צריך מקלדת MIDI: המיקרופון לא מודד עוצמה, שחרור קלידים או פדל.' : 'This one needs a MIDI keyboard: the microphone can’t measure loudness, key release or the pedal.'}
        </p>
      )}
      <div className={`drill-beat ${phase}`} aria-live="polite" dir="ltr">
        {phase === 'count' ? `${tx.countIn} ${Math.max(1, drill.meter - beat)}` : phase === 'play' ? tx.go : `${drill.pulse === 8 ? '♪' : tx.bpm} = ${bpm}`}
        <span className={`beat-dot ${beat % drill.meter === 0 ? 'accent' : ''}`} key={beat} />
      </div>
      {phase === 'ready' && (drill.drums || drill.band) && !askDrums && !useMidi && !drumBlocked && onDrums && (
        <button className="link drums-route" onClick={() => onDrums(!drumsOk)} data-drums={drums ? 'on' : 'off'} data-band={drill.band && drums ? drill.band.style : undefined}>
          {drums ? (drill.band ? (lang === 'he' ? 'להקה באוזניות · להחליף לקליק' : 'Band in headphones · switch to the click') : lang === 'he' ? 'תופים באוזניות · להחליף לקליק' : 'Drums in headphones · switch to the click') : lang === 'he' ? 'קליק ברמקול · יש לי אוזניות' : 'Click on the speaker · I have headphones'}
        </button>
      )}
      {phase === 'ready' && askDrums ? (
        // B5: the headphones gate — where the sound goes, so the mic hears only the bass. Not a pass of anything.
        <div className="drums-gate" data-drums-gate="1">
          <p className="field-hint">
            {drum
              ? lang === 'he'
                ? 'בתרגיל הזה מתנגן גרוב ליווי. כדי שהמיקרופון ישמע רק את הפד, הגרוב מתנגן רק באוזניות או בחיבור קווי.'
                : 'A backing groove plays in this drill. So the mic hears only your pad, it plays only in headphones or over a line-in.'
              : drill.band
              ? lang === 'he'
                ? 'בתרגיל הזה מנגנת להקה (תופים ופסנתר). כדי שהמיקרופון ישמע רק את הבס, היא מתנגנת רק באוזניות או בחיבור קווי.'
                : 'A band plays in this drill (drums and piano). So the mic hears only your bass, it plays only in headphones or over a line-in.'
              : lang === 'he'
                ? 'יש תופים בתרגיל הזה. כדי שהמיקרופון ישמע רק את הבס, התופים מתנגנים רק באוזניות או בחיבור קווי.'
                : 'This drill has drums. So the mic hears only your bass, they play only in headphones or over a line-in.'}
          </p>
          <div className="drill-actions">
            <button className="btn primary" onClick={() => onDrums!(true)} data-drums-choice="headphones">
              {lang === 'he' ? 'אוזניות / חיבור קווי' : 'Headphones / line-in'}
            </button>
            <button className="btn ghost" onClick={() => onDrums!(false)} data-drums-choice="speaker">
              {lang === 'he' ? 'רמקול: רק קליק' : 'Speaker: click only'}
            </button>
          </div>
        </div>
      ) : phase === 'ready' && prep.left > 0 ? (
        // RSL Quick Study Piece: time to read the score first (the player may start sooner).
        <div className="drill-prep" data-prep={prep.left}>
          <p className="field-hint">{lang === 'he' ? `זמן הכנה: קראו את התווים · ${prep.left} שנ׳` : `Prep time: read the score · ${prep.left} s`}</p>
          <button className="btn primary" onClick={prep.skip} data-prep-ready="1">
            {lang === 'he' ? 'מוכנים' : 'Ready'}
          </button>
        </div>
      ) : phase === 'ready' ? (
        <>
          {voided && (
            <p className="kit-warn" data-drum-unsure="1">
              {voided[lang]} {lang === 'he' ? 'קרבו את המיקרופון לתופים, או כיילו שוב בכרטיס המערכת.' : 'Move the mic closer, or calibrate again on the kit card.'}
            </p>
          )}
          <button className="btn mega" onClick={() => void start()} data-drill-play="1" disabled={drumBlocked || pianoBlocked}>
            ▶ {tx.play}
          </button>
        </>
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
      {m.drum && (
        <p className="drum-limbs" dir="auto" data-drum-limbs="1">
          {drumLimbLine(m.drum, m.wrong, lang)}
        </p>
      )}
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
        {(m as TakeMetrics & { guitar?: { ring: { chords: number; full: number } | null } }).guitar?.ring && (
          <span data-ring="1">
            {lang === 'he' ? 'אקורדים מלאים' : 'full chords'}{' '}
            <b>
              {(m as TakeMetrics & { guitar: { ring: { chords: number; full: number } } }).guitar.ring.full}/{(m as TakeMetrics & { guitar: { ring: { chords: number; full: number } } }).guitar.ring.chords}
            </b>
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

/**
 * B10: untimed note finding (reading L1) — one note at a time on the bass clef; the player finds it on the bass and the
 * pitch heard (mic) or played (MIDI) is checked, with the response time. Clean = ≥ 95 % right, each within maxMs.
 */
function UntimedTake({ drill, lang, cal, onDone }: { drill: Drill; lang: Lang; cal: DrillCalibration; onDone: (m: TakeMetrics, played: PlayedNote[]) => void }) {
  const [i, setI] = useState(-1);
  const ac = useRef<AbortController | null>(null);
  const res = useRef<{ played: PlayedNote | null; ms: number | null; ok: boolean }[]>([]);
  useEffect(() => () => ac.current?.abort(), []);
  const maxMs = drill.untimed?.maxMs ?? 2000;
  const notes = drill.notes;
  const k = keyName(drill.keySig);
  const run = () => {
    const abort = new AbortController();
    ac.current = abort;
    res.current = [];
    let idx = 0;
    let shownAt = performance.now();
    setI(0);
    const answer = (midiNote: number, at: number) => {
      if (abort.signal.aborted || idx >= notes.length) return;
      const want = notes[idx];
      const ms = Math.max(0, at - shownAt - cal.latencyMs);
      // Any octave counts on the mic (bass octave errors); the note name must be right.
      const ok = (((midiNote - want.pitch) % 12) + 12) % 12 === 0;
      res.current.push({ played: { pitch: midiNote, on: ms, off: null, vel: 64 }, ms, ok });
      idx++;
      if (idx >= notes.length) return finish();
      shownAt = performance.now();
      setI(idx);
    };
    const giveUp = window.setInterval(() => {
      if (abort.signal.aborted) {
        window.clearInterval(giveUp);
        offMidi();
        return;
      }
      if (idx < notes.length && performance.now() - shownAt > maxMs * 2.5) {
        res.current.push({ played: null, ms: null, ok: false });
        idx++;
        if (idx >= notes.length) return finish();
        shownAt = performance.now();
        setI(idx);
      }
    }, 200);
    const offMidi = midi.onNote((m, on, at) => on && answer(m, at));
    // N3: the bass capture (28 / 22 Hz floor, 4096 window) so E1–C2 are heard, and the bass pitch window (40–120 ms
    // after the note starts) — the same options as the timed take.
    let buf: { t: number; hz: number | null; conf: number }[] = [];
    let held: number | null = null;
    const win = onsetOptsFor(drill);
    if (!midi.devices.length)
      void listenLoop(
        new BrowserPitchCapture(),
        abort.signal,
        (f) => {
          const fr = { t: performance.now(), hz: f.hz, conf: f.confidence };
          if (!f.hz || f.confidence < 0.85) {
            held = null;
            if (!buf.some((x) => x.hz)) return void (buf = []);
          }
          buf.push(fr);
          const got = untimedPitch(buf, { ...win, held });
          if (got) {
            held = got.midi;
            buf = [];
            answer(got.midi, got.at);
          }
        },
        undefined,
        { ...(captureOptsFor(drill) ?? {}) },
      );
    function finish() {
      window.clearInterval(giveUp);
      offMidi();
      abort.abort();
      setI(-1);
      const r = res.current;
      const right = r.filter((x) => x.ok).length;
      const slow = r.filter((x) => x.ok && (x.ms ?? Infinity) > maxMs).length;
      const acc = right / notes.length;
      const verdict = acc >= 0.95 && slow === 0 ? 'clean' : acc >= 0.8 ? 'almost' : 'not';
      const rts = r.filter((x) => x.ms !== null).map((x) => x.ms!);
      const mean = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : null;
      const perNote = notes.map((n, j) => ({ exp: n, played: r[j]?.played ?? null, dev: r[j]?.ms ?? null, ok: !!r[j]?.ok && (r[j].ms ?? Infinity) <= maxMs }));
      const why =
        verdict === 'clean'
          ? { en: `Every note found, ${mean ? (mean / 1000).toFixed(1) : '–'} s on average.`, he: `כל התווים נמצאו, ${mean ? (mean / 1000).toFixed(1) : '–'} ש׳ בממוצע.` }
          : slow && acc >= 0.95
            ? { en: `${slow} took longer than ${maxMs / 1000} s.`, he: `${slow} לקחו יותר מ-${maxMs / 1000} ש׳.` }
            : { en: `${notes.length - right} of ${notes.length} were another note.`, he: `${notes.length - right} מתוך ${notes.length} היו תו אחר.` };
      const m: TakeMetrics = { bpm: 0, nps: 0, accuracy: acc, wrong: r.filter((x) => x.played && !x.ok).length, missing: r.filter((x) => !x.played).length + Math.max(0, notes.length - r.length), timingMean: mean, timingSD: null, cvR: null, cvL: null, handsMean: null, handsAbs: null, chordSpread: null, velSD: null, velMean: null, bandHit: null, slope: null, r2: null, accentGap: null, kot: null, kdr: null, hesitations: slow, glitches: [], chordToneOnBeats: null, voiceLeading: null, perNote, verdict, why };
      onDone(m, r.map((x) => x.played).filter((x): x is PlayedNote => !!x));
    }
  };
  const cur = i >= 0 ? notes[i] : null;
  return (
    <div className="drill-take untimed" data-untimed="1">
      {cur ? (
        <>
          <p className="drill-goal" dir="ltr">
            {i + 1} / {notes.length}
          </p>
          <NoteStaff notes={[cur.pitch + 12]} chord={false} keyPc={k} clef="bass" />
          <p className="field-hint">{lang === 'he' ? 'מצאו את התו הזה על הבס ונגנו אותו' : 'Find this note on your bass and play it'}</p>
          <button className="btn mega ghost" onClick={() => (ac.current?.abort(), setI(-1))}>
            ■ {TX[lang].stop}
          </button>
        </>
      ) : (
        <>
          <p className="field-hint">{lang === 'he' ? `תו אחד בכל פעם, בלי קצב — עד ${maxMs / 1000} שניות לכל תו.` : `One note at a time, no beat — up to ${maxMs / 1000} s each.`}</p>
          <button className="btn mega" onClick={run} data-drill-play="1">
            ▶ {TX[lang].play}
          </button>
        </>
      )}
    </div>
  );
}
