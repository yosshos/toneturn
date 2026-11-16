// One drill take (spec AI §3): the notes, the metronome with a count-in, MIDI recording (velocity, release,
// both hands), then the analysis right away — verdict, the evenness strip, the velocity curve, the hands chart.

import { useEffect, useMemo, useRef, useState } from 'react';
import { scoreInformedNotes } from '../engine/drills/pianoMic';
import type { Drill, PlayedNote, TakeMetrics, DrillCalibration } from '../engine/drills/types';
import { analyzeTake, improvNotes, micUnmeasurable, tempoBand, thresholds } from '../engine/drills/analyze';
import type { ExpNote, NoteResult } from '../engine/drills/types';
import { glidePos, NoteStaff, TabLine, type NoteMark } from './NoteViews';
import { markOf, worstMark } from '../engine/noteMarks';
import { analyzeGuitarTake, captureOptsFor, detectOnsets, onsetOptsFor, untimedPitch, type GFrame } from '../engine/drills/guitarAnalyze';
import { isGuitarDrill } from '../engine/drills/events';
import { analyzePedal, pedalDown, type PedalEvent } from '../engine/drills/pedal';
import { piano } from './services';
import { callSound, REPLAY_SLOW } from '../engine/drills/phraseDrills';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { InputCheck, InputWatchdog } from './InputCheck';
import type { InputCheckMode } from '../engine/inputCheck';
import { tuningById } from '../engine/fretboard';
import { bandBass } from '../engine/drills/bassBand';
import { drillBandHits, drillDrumHits, unisonLine } from '../engine/drills/bandTimeline';
import { clickPlan, hasTimeline, staffLines, timeMapOf } from '../engine/drills/timeline';
import { withProg } from '../engine/drills/progAnalyze';
import { withHarmony, type ChromaFrame } from '../engine/drills/harmonyGrade';
import { isDrumDrill } from '../engine/drills/events';
import { analyzeDrumTake, drumLimbLine, type DrumTakeHit } from '../engine/drills/drumAnalyze';
import { withChoke } from '../engine/drills/drumChoke';
import { withSplash, type CcSample } from '../engine/drills/drumSplash';
import { kitKind, openness, VOICE_NOTE, type KitProfile } from '../engine/drumKit';
import { acousticHits, acousticOk, acousticOnsets, drillAcousticVoices } from '../engine/drumAcoustic';
import type { NoteEvent } from '../engine/lesson';
import { fakeTake, fakeTakeOn, fakeLiveOn } from './fakeTake';
import { liveGrade, liveMarkable, pocketRowKeys, type LiveTake } from '../engine/drills/liveGrade';
import { PocketMeter } from './PocketMeter';
import { VelocityBars } from './VelocityBars';
import { velBars, velBarsShown } from '../engine/drills/velBars';
import { ChordChart } from './ChordChart';
import { chartCells, type ChartCell, type NoteRole } from '../engine/drills/chartCells';
import { ornamentLegend, VF_ORNAMENT, type OrnKind } from '../engine/ornaments';
import { spellIn } from '../engine/aids';

/** The live marks of a running take, by note (slice 5): the same mark rule as the review, on the settled notes only. */
function liveIndex(live: LiveTake | null | undefined): Map<string, NoteResult> | null {
  if (!live) return null;
  const m = new Map<string, NoteResult>();
  for (const r of live.perNote) m.set(noteKey(r.exp), r);
  return m;
}

/**
 * The last take's ticks (§4.1 take overlay): per drawn item, its mark and offset in the previous take of the same item,
 * measured against that take's window. A chord: its worst note's.
 */
function priorFor(prior: TakeMetrics | null | undefined) {
  if (!prior) return null;
  const by = new Map<string, NoteResult>();
  for (const r of prior.perNote) by.set(noteKey(r.exp), r);
  const win = thresholds(tempoBand(prior.nps)).sd * 2;
  const at = (group: ExpNote[]): { mk: NoteMark; dev: number | null } => {
    const ms = group.map((x) => markOf(by.get(noteKey(x)), win));
    const mk = worstMark(ms);
    return { mk, dev: mk === 'early' || mk === 'late' ? (by.get(noteKey(group[ms.indexOf(mk)]))?.dev ?? null) : null };
  };
  return { at, win };
}

type Lang = 'he' | 'en';
const TX = {
  en: { play: 'Play', stop: 'Stop', countIn: 'Count-in…', go: 'Go!', again: 'Again', slower: 'Slower −10%', next: 'Next', clean: 'Clean', almost: 'Almost', not: 'Not yet', midiOff: 'Turn on MIDI in Settings for the full analysis — the microphone hears pitch and timing only.', evenness: 'Timing per note (early ← → late)', velocity: 'Loudness per note', hands: 'Hands together (RH − LH, ms)', notes: 'notes', wrong: 'wrong', missing: 'missing', bpm: '♩', loop: 'Loop the spot −15%' },
  he: { play: 'לנגן', stop: 'עצירה', countIn: 'ספירה…', go: 'עכשיו!', again: 'שוב', slower: 'לאט יותר −10%', next: 'הבא', clean: 'נקי', almost: 'כמעט', not: 'עוד לא', midiOff: 'הדליקו MIDI בהגדרות לניתוח המלא — המיקרופון שומע רק גובה ותזמון.', evenness: 'תזמון לכל תו (מוקדם ← → מאוחר)', velocity: 'עוצמה לכל תו', hands: 'שתי הידיים יחד (ימין − שמאל, מ״ש)', notes: 'תווים', wrong: 'שגויים', missing: 'חסרים', bpm: '♩', loop: 'לחזור על הקטע −15%' },
};

const keyName = (sig: string) => (sig === 'C' ? null : { letter: sig[0] as 'C', acc: (sig.includes('b') ? -1 : sig.includes('#') ? 1 : 0) as -1 | 0 | 1 });

/** Staff(s) for a drill: treble for RH, bass for LH (both when hands together). Long drills show the first 2 bars per line. */
const noteKey = (n: ExpNote) => `${n.hand}:${n.beat}:${n.pitch}`;
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const TECH_SYM: Partial<Record<NonNullable<ExpNote['technique']>, string>> = { hammer: 'h', pull: 'p', slide: '/', bend: 'b', prebend: 'pb', release: 'r', vibrato: '~', tap: 'T', harmonic: 'harm', mute: 'PM', dead: 'X', 'strum-down': '↓', 'strum-up': '↑', 'rest-stroke': 'apoy.', rasgueado: 'rasg.' };
const STROKE_SYM: Record<string, string> = { D: '⊓', U: 'V', p: 'p', i: 'i', m: 'm', a: 'a', c: 'c' };

/** A phone-width screen (the score as hero: one bar a line, tighter note spacing). */
export const phone = (): boolean => typeof window !== 'undefined' && window.innerWidth < 400;
/** 8+ notes in a bar (drill beats per bar `bar`) on a phone: one bar a line. */
export function denseOnPhone(drill: Drill, bar: number): boolean {
  if (!phone() || !bar) return false;
  const per = new Map<number, number>();
  for (const n of drill.notes) {
    if (n.chordId !== undefined && drill.notes.some((o) => o.chordId === n.chordId && o !== n && o.beat === n.beat && drill.notes.indexOf(o) < drill.notes.indexOf(n))) continue;
    const b = Math.floor(n.beat / bar + 1e-6);
    per.set(b, (per.get(b) ?? 0) + 1);
  }
  return Math.max(0, ...per.values()) >= 8;
}

/** A bass drill (bass course, the old g-bass family, or a bass custom drill). */
export const isBassDrill = (d: Drill): boolean => d.spec.instrument === 'bass' || d.spec.family === 'g-bass' || d.spec.family.startsWith('b-');
/** Drill beats → quarter notes (eighth-note meters count eighths). */
const qOf = (d: Drill): number => (d.pulse === 8 ? 0.5 : 1);

/**
 * B2: a moving window over the lines of a long drill — two lines (four bars) at a time, following the take's beat, so
 * the whole drill is reachable and still fits one phone screen. Idle: small ‹ › page buttons; after a take it opens
 * on the first line with a mistake.
 */
export function useLineWindow(lines: number, beat: number, perLine: number, focus: number, size = 2): { from: number; pager: React.ReactNode } {
  const [page, setPage] = useState(0);
  const [lastFocus, setLastFocus] = useState(focus);
  if (focus !== lastFocus) {
    setLastFocus(focus);
    setPage(Math.max(0, Math.min(lines - size, focus)));
  }
  const follow = beat >= 0 ? Math.max(0, Math.min(lines - size, Math.floor(beat / perLine + 1e-6))) : null;
  const from = follow ?? Math.max(0, Math.min(page, lines - size));
  const pager =
    lines > size && follow === null ? (
      <div className="tab-pager" dir="ltr">
        <button className="icon-btn" aria-label="Previous lines" disabled={from === 0} onClick={() => setPage(Math.max(0, from - size))}>
          ‹
        </button>
        <small>
          {size > 1 ? `${from + 1}–${Math.min(lines, from + size)}` : from + 1} / {lines}
        </small>
        <button className="icon-btn" aria-label="Next lines" disabled={from + size >= lines} onClick={() => setPage(Math.min(lines - size, from + size))}>
          ›
        </button>
      </div>
    ) : null;
  return { from, pager };
}

/** Guitar / bass drill as tab (spec AJ): string / fret, technique marks above, fingers or strokes below, result colours. */
export function DrillTab({ drill, fingering = false, picking = false, result, beat = -1, upTo, live, cue = false, prior }: { /** Slice 5: the running take's settled notes (live marks). */ live?: LiveTake | null; /** The count-in is running: the first digit pulses. */ cue?: boolean; /** The last take of this item (its ticks, faded, under the review's). */ prior?: TakeMetrics | null; drill: Drill; fingering?: boolean; picking?: boolean; result?: TakeMetrics | null; /** Beat of the running take (−1 idle): the window follows it. */ beat?: number; /** Only the notes before this beat (the written bars of a free-choice drill). */ upTo?: number }) {
  const ns = upTo === undefined ? drill.notes : drill.notes.filter((n) => n.beat < upTo - 1e-6);
  const byKey = new Map<string, NoteResult>();
  for (const r of result?.perNote ?? []) byKey.set(noteKey(r.exp), r);
  const timingMs = result ? thresholds(tempoBand(result.nps)).sd * 2 : 0;
  const lv = result ? null : liveIndex(live);
  const pf = result ? priorFor(prior) : null;
  const cols: { pos: { str: number; fret: number | 'x' }[]; dur: number; at: number; top?: string; bottom?: string; mark?: NoteMark; dev?: number | null; lmark?: NoteMark; ldev?: number | null; pmark?: NoteMark; pdev?: number | null }[] = [];
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
    const mark = result ? worstMark(ms) : undefined;
    // The tick of the note that set the mark (early / late), its offset in ms.
    const dev = mark === 'early' || mark === 'late' ? (byKey.get(noteKey(group[ms.indexOf(mark)]))?.dev ?? null) : null;
    // Live: a column shows once all its notes are settled (a chord is one mark: its worst note's).
    const lms = lv ? group.map((x) => (lv.has(noteKey(x)) ? markOf(lv.get(noteKey(x)), live!.win) : null)) : [];
    const lmark = lv && lms.every((x) => x !== null) ? worstMark(lms as NoteMark[]) : undefined;
    const ldev = lmark === 'early' || lmark === 'late' ? (lv!.get(noteKey(group[lms.indexOf(lmark)]))?.dev ?? null) : null;
    const pr = pf ? pf.at(group) : null;
    cols.push({ pos, dur: Math.max(0.25, n.dur * k), at: n.beat, top: tech, bottom, mark, dev, lmark, ldev, pmark: pr?.mk, pdev: pr?.dev ?? null });
  }
  // The count-in cue: the column of the first note.
  const firstCol = cols.length ? cols.reduce((a, c) => (c.at < a.at ? c : a)) : null;
  const strings = drill.spec.tuning ? tuningById(drill.spec.tuning).open.length : isBassDrill(drill) ? 4 : 6;
  // Bass "lock with the kick": where the kick lands, marked under the tab column that falls on it.
  const kicks = new Set(isBassDrill(drill) && drill.drums ? drillDrumHits(drill).filter((h) => h.d === 'k').map((h) => Math.round(h.beat * 1e3)) : []);
  // B2 (0.64): the whole drill, two bars a line (bar lines where the music has them), in a window that follows the beat.
  const perLine = (drill.meter || 4) * (denseOnPhone(drill, drill.meter || 4) || (phone() && cols.length > 12) ? 1 : 2);
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
            now={beat >= 0 && !result && lineOf(beat) === from + i ? glidePos(l.map((c) => c.at), sl?.[from + i] ? sl[from + i].to / k : (from + i + 1) * perLine, beat) : -1}
            cols={l.map(({ mark: _m, at: _a, lmark: _lm, ldev: _ld, pmark: _pm, pdev: _pd, ...c }) => ({ ...c, ...(kicks.has(Math.round(_a * 1e3)) ? { kick: true } : {}) }))}
            live={lv ? { marks: l.map((c) => c.lmark), devs: l.map((c) => c.ldev ?? null) } : undefined}
            prior={pf ? { marks: l.map((c) => c.pmark), devs: l.map((c) => c.pdev ?? null) } : undefined}
            cue={cue && !result && firstCol && l.includes(firstCol) ? l.indexOf(firstCol) : undefined}
            spacing={phone() ? 30 : 40}
            ahead={beat >= 0 && !result && lineOf(beat) !== from + i}
            marks={result ? l.map((c) => c.mark) : undefined}
            win={result ? timingMs : (live?.win ?? timingMs)}
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
export function ChartView({ drill, beat = -1, fromBeat = 0, result, loop, lang = 'en', compact = false, roles }: { /** Note-role dots per bar while the take runs (§4.7). */ roles?: NoteRole[][] | null; /** Under written bars (notation / tab above it): the compact chart, one screen. */ compact?: boolean; drill: Drill; beat?: number; fromBeat?: number; /** After the take: the bars' rule results (slice 8). */ result?: TakeMetrics | null; /** Bars picked on the error map for a loop (hatched). */ loop?: [number, number] | null; lang?: Lang }) {
  const meter = drill.meter || 4;
  const first = Math.floor(fromBeat / meter + 1e-6);
  // Slice 8: the shared chord chart — four bars a row, the rows around the bar being played (one screen).
  const cells = chartCells(drill, result)
    .map((c, i) => (!result && roles?.[i]?.length ? { ...c, dots: roles[i] } : c))
    .slice(first);
  return <ChordChart cells={cells} meter={meter} beat={beat >= 0 ? beat - first * meter : -1} first={first} lang={lang} size={compact ? 'compact' : 'full'} loop={loop ? [loop[0] - first, loop[1] - first] : null} attrs={{ 'data-chart-only': 1 }} />;
}

/** B11: an ear drill before its result — what to do, and which bars the band plays and which are yours. */
export function EarCard({ drill, beat = -1, lang, bpm, roles }: { drill: Drill; beat?: number; lang: Lang; bpm?: number; /** Note-role dots per bar while a rule-card take runs (§4.7). */ roles?: NoteRole[][] | null }) {
  const meter = drill.meter || 4;
  const bars = Math.ceil(drill.beats / meter - 1e-6);
  const band = (bar: number) => (drill.listen?.windows ?? []).some(([a, b]) => bar * meter >= a - 1e-6 && bar * meter < b - 1e-6);
  const dense = !!drill.phrase && bars > 8;
  // Phrases by ear: hear the call again, or slowed, before the take (never during it).
  const [playing, setPlaying] = useState<null | 'call' | 'slow'>(null);
  const stopRef = useRef<AbortController | null>(null);
  useEffect(() => () => stopRef.current?.abort(), []);
  const replay = async (rate: number, which: 'call' | 'slow') => {
    stopRef.current?.abort();
    if (playing === which) return setPlaying(null);
    const ac = new AbortController();
    stopRef.current = ac;
    setPlaying(which);
    try {
      await piano.unlock();
      const s = callSound(drill, bpm ?? drill.startBpm, rate);
      await piano.play(s.events, s.length, ac.signal);
    } catch {
      /* stopped */
    }
    if (stopRef.current === ac) setPlaying(null);
  };
  return (
    <div className="ear-card" data-ear-card="1">
      <p className="ear-ask">{drill.listen?.ask[lang]}</p>
      {drill.phrase && beat < 0 && (
        <div className="ear-replay" data-phrase-replay="1">
          <button className={`btn small ${playing === 'call' ? 'primary' : 'ghost'}`} onClick={() => void replay(1, 'call')} data-replay="call">
            {lang === 'he' ? 'לשמוע שוב' : 'Hear again'}
          </button>
          <button className={`btn small ${playing === 'slow' ? 'primary' : 'ghost'}`} onClick={() => void replay(REPLAY_SLOW, 'slow')} data-replay="slow">
            {lang === 'he' ? 'לאט יותר' : 'Slower'}
          </button>
        </div>
      )}
      {/* Long phrases (8 bars of a form: 16 bars in all): one line per bar — the chord only, Listen / You by colour. */}
      {dense && (
        <p className="ear-legend">
          <span className="band">{lang === 'he' ? 'הקשבה' : 'Listen'}</span> <span className="you">{lang === 'he' ? 'אתם' : 'You'}</span>
        </p>
      )}
      {/* Slice 8: the shared chord chart — Listen / You per bar, the chords (trading fours), a rule's target note. */}
      <ChordChart
        cells={Array.from({ length: bars }, (_, i): ChartCell => {
          const c = drill.chart ? chartCells(drill)[i] : undefined;
          const role = band(i) ? 'band' : 'you';
          const dots = role === 'you' && roles?.[i]?.length ? { dots: roles[i] } : {};
          return c ? { ...c, role, ...(role === 'band' ? { target: undefined } : {}), ...dots } : { role, ...(dense ? { chord: undefined } : {}), ...dots };
        })}
        meter={meter}
        beat={beat}
        lang={lang}
        size={dense || bars > 8 ? 'compact' : 'full'}
        attrs={{ 'data-ear-bars': bars }}
      />
    </div>
  );
}

export function DrillStaff({ drill, fingering = false, result, beat = -1, upTo, live, lang = 'en', cue = false, prior, roles }: { lang?: Lang; drill: Drill; fingering?: boolean; result?: TakeMetrics | null; beat?: number; upTo?: number; /** Slice 5: the running take's settled notes (live marks). */ live?: LiveTake | null; /** The count-in is running: the first note head pulses. */ cue?: boolean; /** The last take of this item (its ticks, faded, under the review's). */ prior?: TakeMetrics | null; /** Note-role dots per bar of the chord chart over the staff (played notes, live). */ roles?: NoteRole[][] | null }) {
  // B1 (0.64): bass is written in the bass clef an octave above where it sounds (standard bass notation); the
  // upright's upper register in the tenor clef. B7: eighth-note meters are drawn in eighths with an x/8 signature.
  const bass = isBassDrill(drill);
  const shift = bass ? 12 : 0;
  const qk = qOf(drill);
  // The upright's thumb position reads the treble clef (ABRSM Gr 8), also an octave above the sound.
  const rhClef: 'treble' | 'bass' | 'tenor' = bass ? (drill.spec.kind === 'tenor' ? 'tenor' : drill.spec.kind === 'treble' ? 'treble' : 'bass') : 'treble';
  // Ornament signs (ornaments.ts): one head with the sign stands for its written-out notes; they are marked as one group.
  const ornGroup = new Map<ExpNote, ExpNote[]>();
  const ornCode = new Map<ExpNote, string>();
  const withOrns = (ns: ExpNote[]): ExpNote[] => {
    const os = (drill.ornaments ?? []).filter((o) => ns.some((n) => n.hand === o.hand));
    if (!os.length) return ns;
    const hidden = new Set<ExpNote>();
    const add: ExpNote[] = [];
    for (const o of os) {
      const g = ns.filter((n) => n.hand === o.hand && n.beat >= o.beat - 1e-6 && n.beat < o.beat + o.dur - 1e-6);
      if (!g.length) continue;
      for (const n of g) hidden.add(n);
      const d: ExpNote = { pitch: o.pitch, beat: o.beat, dur: o.dur, hand: o.hand };
      ornGroup.set(d, g);
      ornCode.set(d, VF_ORNAMENT[o.kind]);
      add.push(d);
    }
    return [...ns.filter((n) => !hidden.has(n)), ...add].sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  };
  /** The notes a drawn head stands for: an ornament's realisation, a chord's notes, or itself. */
  const groupOf = (n: ExpNote, ns: ExpNote[]): ExpNote[] => ornGroup.get(n) ?? (n.chordId === undefined ? [n] : ns.filter((x) => x.chordId === n.chordId));
  const rh = withOrns(drill.notes.filter((n) => n.hand === 'R' && (upTo === undefined || n.beat < upTo - 1e-6)));
  const byKey = new Map<string, NoteResult>();
  for (const r of result?.perNote ?? []) byKey.set(noteKey(r.exp), r);
  const timingMs = result ? thresholds(tempoBand(result.nps)).sd * 2 : 0;
  /** A chord shows its worst note's mark. */
  const markFor = (n: ExpNote, ns: ExpNote[]): NoteMark => {
    if (!result) return undefined;
    const group = groupOf(n, ns);
    const ms = group.map((x) => markOf(byKey.get(noteKey(x)), timingMs));
    return worstMark(ms);
  };
  const lv = result ? null : liveIndex(live);
  /** Live: a chord shows once all its notes are settled, with its worst note's mark. */
  const liveFor = (n: ExpNote, ns: ExpNote[]): { mk: NoteMark; dev: number | null } => {
    if (!lv) return { mk: undefined, dev: null };
    const group = groupOf(n, ns);
    if (!group.every((x) => lv.has(noteKey(x)))) return { mk: undefined, dev: null };
    const ms = group.map((x) => markOf(lv.get(noteKey(x)), live!.win));
    const mk = worstMark(ms);
    return { mk, dev: mk === 'early' || mk === 'late' ? (lv.get(noteKey(group[ms.indexOf(mk)]))?.dev ?? null) : null };
  };
  const lh = withOrns(drill.notes.filter((n) => n.hand === 'L'));
  const pf = result ? priorFor(prior) : null;
  // The count-in cue: the first note's beat (both staves pulse when both hands start together).
  const firstBeat = cue && !result && drill.notes.length ? Math.min(...drill.notes.map((n) => n.beat)) : null;
  // A long item (a whole head, AUDIT-DEPTH-3): two lines at a time with a pager, like the bass (one phone screen).
  // Hands together (one phone screen at 320×720): one system at a time — the RH line and the LH line of the same bars —
  // paged like the bass, never four or more staff cards in a scrolling box.
  const ht = !bass && rh.length > 0 && lh.length > 0;
  const paged = bass || !!drill.paged || ht;
  const winSize = ht ? 1 : 2;
  const k = keyName(drill.keySig);
  const firstOfChord = (ns: typeof rh) => ns.filter((n, i) => n.chordId === undefined || ns.findIndex((m) => m.chordId === n.chordId) === i);
  /** Under a marked note (0.52): what was really played — the note name for a wrong pitch, ms early / late off time. */
  const playedLabel = (n: ExpNote): string => {
    const r = byKey.get(noteKey(n));
    if (!r) return '';
    // The ✕ and the ghost head are drawn on the staff; the label names the note really played.
    if (r.played && r.played.pitch !== n.pitch) return `${NAMES[((r.played.pitch % 12) + 12) % 12]}${Math.floor(r.played.pitch / 12) - 1}`;
    if (!r.played) return '';
    if (r.dev !== null && Math.abs(r.dev) > timingMs) return `${r.dev > 0 ? '+' : '−'}${Math.round(Math.abs(r.dev))}`;
    return '';
  };
  // Lines by bars (0.52): two bars a line, bar lines and the time signature — never a lone note on its own line.
  // Positions are in quarter notes (eighth-note meters: beats × ½).
  const meter = (drill.meter || 4) * qk;
  const sig = drill.pulse === 8 ? `${drill.meter}/8` : undefined;
  // COURSE-FEEDBACK-UI §4.1 (the score as hero): on a phone, one bar a line when a bar holds 8+ notes, so heads read
  // at ~9 px instead of ~5 px.
  const per = meter * (meter >= 6 || denseOnPhone(drill, meter / qk) ? 1 : 2);
  const bq = (n: ExpNote) => n.beat * qk;
  const dq = (n: ExpNote) => n.dur * qk;
  // Mixed meters / a tempo map (prog timeline): lines of whole bars from the engine, bar lines and time signatures per bar.
  const sl = hasTimeline(drill) ? staffLines(drill, 8) : null;
  const lineAtQ = (q: number) => (sl ? Math.max(0, sl.findIndex((l) => q < l.to - 1e-6) < 0 ? sl.length - 1 : sl.findIndex((l) => q < l.to - 1e-6)) : Math.floor(q / per + 1e-6));
  const lineOf = (n: ExpNote) => lineAtQ(bq(n));
  // A song shows all of itself (≤ 96 notes); a bass drill all of itself in a moving window (B2); others their first 8 bars.
  // A paged item (a piece's long section) all of itself too.
  const shown = (ns: ExpNote[]) => firstOfChord(ns).filter((n) => drill.chart || bass || drill.paged || bq(n) < meter * 8);
  const nLines = Math.max(1, ...shown(paged ? [...rh, ...lh] : rh).map((n) => lineOf(n) + 1));
  const firstBad = result ? shown(rh).find((n) => markFor(n, rh) && markFor(n, rh) !== 'ok') : undefined;
  const win = useLineWindow(nLines, beat >= 0 ? (sl ? lineAtQ(beat * qk) * per : beat * qk) : -1, per, firstBad ? lineOf(firstBad) : 0, winSize);
  const draw = (ns: typeof rh, clef: 'treble' | 'bass' | 'tenor', windowed: boolean) => {
    const all = shown(ns);
    const lines: (typeof all)[] = [];
    for (const n of all) (lines[lineOf(n)] ??= []).push(n);
    // a line with no new note but a note tied over from the line before is still drawn (the tie's continuation)
    for (let li = 0; li < nLines; li++) {
      const ls = sl ? (sl[li]?.from ?? li * per) : li * per;
      if (!lines[li] && all.some((n) => bq(n) < ls - 1e-6 && bq(n) + dq(n) > ls + 0.24)) lines[li] = [];
    }
    return lines.map((xs, li) => {
      if (!xs || (windowed && (li < win.from || li >= win.from + winSize))) return null;
      const fing = fingering && xs.some((n) => n.finger);
      const labels = result ? xs.map((n) => playedLabel(n) || (fing && n.finger ? String(n.finger) : '')) : fing ? xs.map((n) => (n.finger ? String(n.finger) : '')) : undefined;
      const marks = result ? xs.map((n) => markFor(n, ns)) : undefined;
      const devs = result ? xs.map((n) => byKey.get(noteKey(n))?.dev ?? null) : undefined;
      const lives = lv ? xs.map((n) => liveFor(n, ns)) : null;
      const priors = pf ? xs.map((n) => pf.at(groupOf(n, ns))) : null;
      const ghosts = result ? xs.map((n) => { const p = byKey.get(noteKey(n))?.played; return p && p.pitch !== n.pitch ? p.pitch + shift : null; }) : undefined;
      // Written values; a gap before the next note (or to the bar line at the end) becomes rests of standard values.
      // `at`: where the item really starts (quarter notes). The written value is rounded to a standard one (a triplet is
      // drawn as an eighth), so the now-cue follows `at`, never a sum of written values (it drifted off the notes).
      // 0.98: a length in 16ths is written exactly — 16ths, dotted 8ths, a note over the bar line as tied values (a piece's
      // ties, Bach's 16ths); anything else (triplets) keeps the old rounding to 8ths.
      type It = { n: ExpNote | null; dur: number; at: number; /** A tied continuation's pitch (n null, not a rest). */ p?: number; extra?: number[]; tie?: boolean; orn?: string };
      const items: It[] = [];
      const std = (d: number) => [4, 3, 2, 1.5, 1, 0.5].find((v) => v <= d + 1e-6) ?? 0.5;
      const in16 = (d: number) => Math.abs(d * 4 - Math.round(d * 4)) < 1e-3;
      const VALS16 = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
      /** A length in 16ths as standard written values, longest first (tied). */
      const split16 = (d: number): number[] => {
        const out: number[] = [];
        let g = d;
        while (g > 0.24) {
          const v = VALS16.find((x) => x <= g + 1e-6)!;
          out.push(v);
          g -= v;
        }
        return out;
      };
      const pushRest = (gap: number, from: number) => {
        let g = gap;
        let at = from;
        const fine = in16(gap);
        while (g > (fine ? 0.24 : 0.49)) {
          const v = (fine ? [4, 2, 1, 0.5, 0.25] : [4, 2, 1, 0.5]).find((x) => x <= g + 1e-6)!;
          items.push({ n: null, dur: v, at });
          g -= v;
          at += v;
        }
      };
      /** The end of the bar holding position q (quarter notes). */
      // (a step past q, so a bar's own start gives its end — never q itself; a guard keeps every loop moving)
      const barEndOf = (q: number) => Math.max(q + 0.25, barEnd(q + 1e-3));
      const extraOf = (n: ExpNote) => (n.chordId === undefined ? undefined : ns.filter((x) => x.chordId === n.chordId && x !== n).map((x) => x.pitch + shift));
      const lineStart = sl ? sl[li].from : li * per;
      const lineEnd = sl ? sl[li].to : lineStart + per;
      const barEnd = (q: number) => (sl ? (sl[li].bars.find((b) => q < b.from + b.len - 1e-6) ?? sl[li].bars[sl[li].bars.length - 1]).from + (sl[li].bars.find((b) => q < b.from + b.len - 1e-6) ?? sl[li].bars[sl[li].bars.length - 1]).len : Math.ceil(q / meter - 1e-6) * meter);
      // a note held over from the line before (a tie over the line's start): its rest of the length, tied in
      const held = all.filter((n) => in16(dq(n)) && bq(n) < lineStart - 1e-6 && bq(n) + dq(n) > lineStart + 0.24 && !all.some((m) => bq(m) > bq(n) + 1e-6 && bq(m) < lineStart + 1e-6));
      const carry = held[0];
      let from0 = lineStart;
      if (carry) {
        const end = Math.min(lineEnd, bq(carry) + dq(carry), xs[0] ? bq(xs[0]) : lineEnd);
        let a = lineStart;
        while (end - a > 0.24) {
          const be = Math.min(end, barEndOf(a));
          for (const v of split16(be - a)) {
            items.push({ n: null, p: carry.pitch + shift, extra: extraOf(carry), dur: v, at: a, tie: true });
            a += v;
          }
          a = be;
        }
        const last = items[items.length - 1];
        if (last && bq(carry) + dq(carry) <= lineEnd + 1e-6) last.tie = false;
        from0 = a;
      }
      if (xs[0] && bq(xs[0]) - from0 > 0.24) pushRest(bq(xs[0]) - from0, from0);
      xs.forEach((n, i) => {
        const nextAt = xs[i + 1] ? bq(xs[i + 1]) : Math.min(lineEnd, barEnd(bq(n) + dq(n) - 1e-6));
        const orn = ornCode.get(n);
        if (in16(dq(n)) && in16(bq(n))) {
          // exact: the written length up to the next note, split at each bar line into tied values
          const end = Math.min(bq(n) + dq(n), nextAt, lineEnd);
          let a = bq(n);
          let first = true;
          while (end - a > 0.24) {
            const be = Math.min(end, barEndOf(a));
            for (const v of split16(be - a)) {
              items.push(first ? { n, dur: v, at: a, extra: extraOf(n), tie: true, ...(orn ? { orn } : {}) } : { n: null, p: n.pitch + shift, extra: extraOf(n), dur: v, at: a, tie: true });
              first = false;
              a += v;
            }
            a = be;
          }
          if (first) items.push({ n, dur: 0.25, at: bq(n), extra: extraOf(n), ...(orn ? { orn } : {}) });
          // the last value is tied on only when the note goes on into the next line
          else if (bq(n) + dq(n) <= lineEnd + 1e-6 || end < lineEnd - 1e-6) items[items.length - 1].tie = false;
          if (nextAt - a > 0.24) pushRest(nextAt - a, a);
          return;
        }
        const d = std(Math.min(Math.max(0.5, dq(n)), Math.max(0.5, nextAt - bq(n))));
        items.push({ n, dur: d, at: bq(n), extra: extraOf(n), ...(orn ? { orn } : {}) });
        if (nextAt - (bq(n) + d) > 0.49) pushRest(nextAt - (bq(n) + d), bq(n) + d);
      });
      const idx = (n: ExpNote) => xs.indexOf(n);
      // The now-cue: the item (note or rest) the running take is on, in this line.
      const cur = beat >= 0 && !result ? beat * qk : -1;
      const now = cur >= lineStart - 0.03 && cur < lineEnd - 0.03 ? glidePos(items.map((x) => x.at), lineEnd, cur) : -1;
      // Look-ahead: while playing, every line but the one being played is drawn faded.
      const ahead = beat >= 0 && !result && now < 0;
      return (
        <NoteStaff
          now={now}
          ahead={ahead}
          spacing={phone() ? 32 : 44}
          key={`${clef}${li}`}
          notes={items.map((x) => (x.n ? x.n.pitch + shift : (x.p ?? 71)))}
          rests={items.map((x) => !x.n && x.p === undefined)}
          extra={items.some((x) => x.extra?.length) ? items.map((x) => x.extra) : undefined}
          ties={items.some((x) => x.tie) ? items.map((x) => !!x.tie) : undefined}
          tieIn={!!carry}
          sharps={drill.sharps}
          orns={items.some((x) => x.orn) ? items.map((x) => x.orn) : undefined}
          chord={false}
          keyPc={k}
          clef={clef}
          durs={items.map((x) => x.dur)}
          labels={labels ? items.map((x) => (x.n ? labels[idx(x.n)] : '')) : undefined}
          marks={marks ? items.map((x) => (x.n ? marks[idx(x.n)] : undefined)) : undefined}
          devs={devs ? items.map((x) => (x.n ? devs[idx(x.n)] : null)) : undefined}
          ghosts={ghosts ? items.map((x) => (x.n ? ghosts[idx(x.n)] : null)) : undefined}
          win={result ? timingMs : (live?.win ?? timingMs)}
          live={lives ? { marks: items.map((x) => (x.n ? lives[idx(x.n)].mk : undefined)), devs: items.map((x) => (x.n ? lives[idx(x.n)].dev : null)) } : undefined}
          prior={priors ? { marks: items.map((x) => (x.n ? priors[idx(x.n)].mk : undefined)), devs: items.map((x) => (x.n ? priors[idx(x.n)].dev : null)) } : undefined}
          cue={firstBeat !== null ? (() => { const c = items.findIndex((x) => x.n && Math.abs(x.n.beat - firstBeat) < 1e-6); return c >= 0 ? c : undefined; })() : undefined}
          meter={meter}
          timeSig={li === 0 || (windowed && li === win.from) || !!sl?.[li].bars[0].sig}
          sig={sl ? sl[li].bars[0].cur : (drill.sigText ?? sig)}
          bars={sl ? sl[li].bars.map((b) => ({ len: b.len, sig: b.sig })) : undefined}
        />
      );
    });
  };
  return (
    <div className={`drill-staff ${ht ? 'ht' : ''}`} data-clef={rhClef} data-hands-together={ht ? 1 : undefined}>
      {/* Slice 8: the chords over the staff in the shared chart (compact: four bars a row, the bar being played lit). */}
      {drill.chart && !paged && <ChordChart cells={drill.chart.map((c, i) => ({ chord: c, ...(!result && roles?.[i]?.length ? { dots: roles[i] } : {}) }))} meter={drill.meter || 4} beat={result ? -1 : beat} size="compact" maxRows={2} lang={lang} attrs={{ 'data-song-chart': drill.chart.length }} />}
      {drill.chart &&
        paged &&
        (() => {
          const a = sl ? sl.slice(0, win.from).reduce((x, l) => x + l.bars.length, 0) : (win.from * per) / meter;
          const z = sl ? sl.slice(0, win.from + winSize).reduce((x, l) => x + l.bars.length, 0) : ((win.from + winSize) * per) / meter;
          return <ChordChart cells={drill.chart.slice(a, z).map((c, i) => ({ chord: c, ...(!result && roles?.[a + i]?.length ? { dots: roles[a + i] } : {}) }))} first={a} meter={drill.meter || 4} beat={result || beat < 0 ? -1 : beat - a * (drill.meter || 4)} size="compact" maxRows={2} lang={lang} attrs={{ 'data-song-chart': drill.chart.length }} />;
        })()}
      {draw(rh, rhClef, paged)}
      {draw(lh, 'bass', paged)}
      {paged && win.pager}
      {drill.ornaments?.length ? <OrnamentLegend drill={drill} lang={lang} /> : null}
    </div>
  );
}

/** A small picture of each ornament sign (LTR, like the music), for the legend under the staff. */
function OrnIcon({ k }: { k: OrnKind }) {
  return (
    <svg className="orn-icon" viewBox="0 0 24 12" aria-hidden="true" style={{ direction: 'ltr' }}>
      {k === 'trill' ? (
        <text x={12} y={10} textAnchor="middle" fontStyle="italic" fontWeight={700} fontSize={11}>
          tr
        </text>
      ) : k === 'turn' ? (
        <path d="M4 8c0-3 4-4 6-1.5s2 3 4 3 4-1 4-3-3-3-4-1.5" fill="none" strokeWidth={1.8} strokeLinecap="round" />
      ) : (
        <>
          <path d="M3 8l3-4 3 4 3-4 3 4 3-4 3 4" fill="none" strokeWidth={1.8} strokeLinejoin="round" />
          {k === 'mordent' && <path d="M12 1v10" strokeWidth={1.6} />}
        </>
      )}
    </svg>
  );
}

/** How the signs on this staff are played (one line): each kind's name and the notes of its first use. */
export function OrnamentLegend({ drill, lang }: { drill: Drill; lang: Lang }) {
  // note names spelled in the key (F♯ in G, G♭ in D♭)
  const k = keyName(drill.keySig);
  const items = ornamentLegend(drill.ornaments ?? [], drill.notes, lang, (m) => { const sp = spellIn(m, k, drill.sharps); return sp.letter + (sp.acc === 1 ? '♯' : sp.acc === -1 ? '♭' : ''); });
  return (
    <p className="orn-legend" data-orn-legend={items.map((x) => x.kind).join(' ')}>
      {items.map((x) => (
        <span key={x.kind} className="orn-item">
          <OrnIcon k={x.kind} />
          {x.name} <bdi>{x.how}</bdi>
        </span>
      ))}
    </p>
  );
}

/** One mark as a small picture (the same shapes the staff draws): a head, and the tick for early / late. */
function MarkIcon({ k }: { k: 'ok' | 'early' | 'late' | 'wrong' | 'missed' }) {
  return (
    <svg className={`mk-icon mk ${k}`} viewBox="0 0 30 14" aria-hidden="true" style={{ direction: 'ltr' }}>
      <ellipse cx={15} cy={7} rx={5.4} ry={4} transform="rotate(-20 15 7)" className="mk-head" />
      {k === 'early' && <rect x={2} y={5.3} width={6} height={3.4} rx={1.1} className="mk-tick early" />}
      {k === 'late' && <rect x={22} y={5.3} width={6} height={3.4} rx={1.1} className="mk-tick late" />}
      {k === 'wrong' && <path d="M11.5 3.5l7 7M18.5 3.5l-7 7" className="mk-x" />}
    </svg>
  );
}

/** The key to the marks (shape + word in ink, never colour-only text; the shapes are LTR like the music). */
export function MarkLegend({ lang }: { lang: Lang }) {
  const L = lang === 'he' ? { ok: 'נכון', early: 'מוקדם', late: 'מאוחר', wrong: 'צליל שגוי', missed: 'חסר' } : { ok: 'Right', early: 'Early', late: 'Late', wrong: 'Wrong note', missed: 'Missed' };
  return (
    <p className="mark-legend" data-mark-legend="1">
      {(['ok', 'early', 'late', 'wrong', 'missed'] as const).map((k) => (
        <span key={k} className="ml-item">
          <MarkIcon k={k} />
          {L[k]}
        </span>
      ))}
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
export function DrillTake({ drill, bpm, lang, cal, onDone, onBeat, drumsOk, onDrums, kit, autoStart = false, liveMarks = false, onLive, onCount, onHeard }: { /** The count-in is running (true) or not: the score's first head pulses. */ onCount?: (on: boolean) => void; /** Rule-card items (§4.7 note roles): the improvised notes heard so far, in beats (null when the take ends). */ onHeard?: (notes: { beat: number; midi: number }[] | null) => void; /** Slice 5: grade each note as it is played and hand the marks to the score (practice); off = calm (the meter only). */ liveMarks?: boolean; /** The running take's settled notes (null when it ends). */ onLive?: (l: LiveTake | null) => void; /** Owner 2026-11-13: "Again" starts the take at once (count-in), no second Play press. */ autoStart?: boolean; drill: Drill; bpm: number; lang: Lang; cal: DrillCalibration; onDone: (m: TakeMetrics, played: PlayedNote[]) => void; /** Beat index of the take (after the count-in; −1 when idle) — for a score cursor. */ onBeat?: (beat: number) => void; /** B5: headphones / line-in confirmed (undefined = never asked). An audio-routing choice only — it never passes anything. */ drumsOk?: boolean; onDrums?: (headphones: boolean) => void; /** Drums: the player's kit (map, velocity bands, practice-pad mode). */ kit?: KitProfile }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'ready' | 'count' | 'play'>('ready');
  const [beat, setBeat] = useState(-1);
  const ac = useRef<AbortController | null>(null);
  // Slice 5: the pocket meter's state (the take so far), and whether its notes can be marked one by one.
  const [pocket, setPocket] = useState<LiveTake | null>(null);
  const markable = liveMarkable(drill);
  const rowKeys = useMemo(() => pocketRowKeys(drill), [drill]);
  // Velocity bars (§4.1): only for an item with a loudness, accent or velocity-evenness goal.
  const velOn = useMemo(() => velBarsShown(drill), [drill]);
  // Note roles (§4.7): rule-card items report the improvised notes heard so far.
  const hearRoles = !!onHeard && !!drill.goal.improv?.spans.length && !!drill.chart?.length;
  useEffect(() => {
    onCount?.(phase === 'count');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
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
  // Input check (owner 2026-11-15): the strip above Play shows the signal arriving; the watchdog speaks up mid-take.
  const checkMode: InputCheckMode | null = drumBlocked || pianoBlocked ? null : drum ? (drumMidi ? 'drum-midi' : 'drum-mic') : useMidi ? 'midi' : 'mic';
  const [arm, setArm] = useState<{ start: number; due: number | null } | null>(null);
  useEffect(() => () => ac.current?.abort(), []);
  // HARMONY-REHARM §6: an item with its own sound (k-organ: the tonewheel organ) plays on it, then the player's sound comes back.
  useEffect(() => {
    if (!drill.sound) return;
    const before = piano.soundId;
    void piano.setSound(drill.sound);
    return () => void piano.setSound(before);
  }, [drill.sound]);
  // B5: drums under the take only when the mic can't hear them (headphones, line-in, or a MIDI bass); else the click.
  const drums = !!(drill.drums || drill.band) && (useMidi || drumsOk === true);
  // A kit-only drum drill without a kit is blocked: no headphones question for a band it can't play under.
  const askDrums = !!(drill.drums || drill.band) && !useMidi && !drumBlocked && drumsOk === undefined && !!onDrums;
  const prep = usePrep(drill);
  const startRef = useRef<(() => Promise<void>) | null>(null);
  const autoGo = autoStart && !drill.untimed && !askDrums && !drumBlocked && !pianoBlocked;
  useEffect(() => {
    if (!autoGo) return;
    prep.skip();
    const id = window.setTimeout(() => void startRef.current?.(), 0);
    return () => window.clearTimeout(id);
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (drill.untimed) return <UntimedTake drill={drill} lang={lang} cal={cal} onDone={onDone} />;
  const start = async () => {
    // DEV ONLY (e2e / screenshots): a synthesized take through the real analysis, no audio.
    const fake = fakeTakeOn();
    if (fake) {
      const f = fakeTake(drill, bpm, cal, fake);
      const speed = fakeLiveOn();
      if (!speed) return onDone(f.m, f.played);
      // Played out in time (count-in, beats, onsets at their moments; no audio): the live marks and the meter.
      const abort = new AbortController();
      ac.current = abort;
      const beatMs = 60000 / bpm / speed;
      const lastBeat = drill.meter + Math.ceil(drill.beats) + 1;
      const t0 = performance.now();
      const upTo = (now: number): TakeMetrics => (f.hits ? analyzeDrumTake(drill, bpm, f.hits.filter((h) => h.on <= now)) : isGuitarDrill(drill) ? analyzeGuitarTake(drill, bpm, f.played.filter((p) => p.on <= now), cal) : analyzeTake(drill, bpm, f.played.filter((p) => p.on <= now), cal));
      setPhase('count');
      let shown = -1;
      await new Promise<void>((res) => {
        const id = window.setInterval(() => {
          if (abort.signal.aborted) return (window.clearInterval(id), res());
          const el = performance.now() - t0;
          const i = Math.floor(el / beatMs);
          if (i !== shown) {
            shown = i;
            setBeat(i);
            if (i >= drill.meter) setPhase('play');
          }
          onBeat?.(el / beatMs - drill.meter);
          const now = (el - drill.meter * beatMs) * speed;
          if (now >= -200 && markable) {
            const l = liveGrade(drill, upTo(now), bpm, now);
            setPocket(l);
            if (liveMarks) onLive?.(l);
          }
          if (now >= 0 && hearRoles) onHeard!(improvNotes(drill, bpm, f.played.filter((p) => p.on <= now)));
          if (i >= lastBeat) (window.clearInterval(id), res());
        }, 50);
      });
      setPocket(null);
      onLive?.(null);
      if (hearRoles) onHeard!(null);
      setPhase('ready');
      if (abort.signal.aborted) return;
      return onDone(f.m, f.played);
    }
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
    // Progressions by ear: the harmony report (root / colour / bass per chord) joins every result; guitar passes its chroma.
    let harmonyFrames: ChromaFrame[] = [];
    const done = (m: TakeMetrics, played: PlayedNote[]) => onDone(withHarmony(withProg(m, drill, bpm, played), drill, bpm, played, harmonyFrames), played);
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
          // AUDIT-7 #10: a half-pedal drill keeps every CC64 sample (the partial lift is in the values between).
          if (drill.goal.pedal?.style === 'half') pedal.push({ at: at - zero - cal.latencyMs, down: d, value });
          else if (d !== pedalWas) pedal.push({ at: at - zero - cal.latencyMs, down: d });
          pedalWas = d;
        })
      : null;
    // Drum hits (MIDI drum mode, on for the take whatever course it was opened from): voice, velocity, hat openness.
    const drumHitsIn: DrumTakeHit[] = [];
    const prevMode = { drums: midi.opts.drums, kit: midi.opts.kit };
    if (drumMidi) midi.setOptions({ drums: true, ...(kit ? { kit } : {}) });
    const offHit = drumMidi
      ? midi.onHit((h) => {
          if (zero) drumHitsIn.push({ voice: h.voice, on: h.at - zero - cal.latencyMs, vel: h.vel, open: h.open, hat: h.hat, note: h.note });
        })
      : null;
    // The foot splash (drumSplash.ts): the pedal's CC4 openness over the take, when the kit sends it.
    const cc4In: CcSample[] = [];
    const offCc4 =
      drumMidi && drill.goal.drum?.splash
        ? midi.onCC((cc, value, at) => {
            if (zero && cc === 4) cc4In.push({ at: at - zero - cal.latencyMs, open: openness(value, kit ?? undefined) });
          })
        : null;
    // Crash chokes (drumChoke.ts): the kit's pressure messages, when it sends them.
    const chokesIn: number[] = [];
    const offChoke =
      drumMidi && drill.goal.drum?.choke
        ? midi.onChoke((_n, pressure, at) => {
            if (zero && pressure >= 64) chokesIn.push(at - zero - cal.latencyMs);
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
    // Slice 5: the take so far, analysed again a few times a second — the live marks (practice) and the meter.
    const sofar: (() => TakeMetrics | null) | null = !markable
      ? null
      : drumMidi
        ? () => analyzeDrumTake(drill, bpm, drumHitsIn.slice(), { kit, mic: false })
        : drum
          ? acoustic
            ? null
            : () => analyzeDrumTake(drill, bpm, detectOnsets(frames.slice(), { refractoryMs: 35, ratio: 1.8 }).map((p) => ({ voice: null, on: p.on, vel: p.vel })), { kit, mic: true })
          : guitar
            ? () => {
                const heard = frames.slice();
                return analyzeGuitarTake(drill, bpm, heard.length ? detectOnsets(heard, onsetOptsFor(drill)) : notes.slice(), cal, heard);
              }
            : pianoChords
              ? null
              : () => analyzeTake(drill, bpm, notes.slice(), cal, { mic: !midi.devices.length || !!drill.sung, voice: !!drill.sung });
    const liveTimer = sofar
      ? window.setInterval(
          () => {
            if (!zero) return;
            const now = performance.now() - zero - cal.latencyMs;
            let m: TakeMetrics | null = null;
            try {
              m = sofar();
            } catch {
              return;
            }
            if (!m) return;
            const l = liveGrade(drill, m, bpm, now);
            setPocket(l);
            if (liveMarks) onLive?.(l);
          },
          guitar ? 220 : 120,
        )
      : 0;
    // Note roles (§4.7): the improvised notes heard so far (MIDI / piano microphone notes; guitar and bass by onsets).
    const heardTimer = hearRoles
      ? window.setInterval(() => {
          if (!zero) return;
          try {
            const ps = guitar ? (frames.length ? detectOnsets(frames.slice(), onsetOptsFor(drill)) : notes.slice()) : notes.slice();
            onHeard!(improvNotes(drill, bpm, ps));
          } catch {
            /* a frame mid-write: next tick */
          }
        }, 250)
      : 0;
    setPhase('count');
    const armStart = performance.now();
    const firstBeat = drill.notes.length ? Math.min(...drill.notes.map((n) => n.beat)) : 0;
    setArm({ start: armStart, due: null });
    // The score's now-cue glides between the clicks (owner 2026-11-13: it sat off the notes): a continuous beat from the
    // last heard click and the beat's length, about 30 times a second; the staff turns it into a place on the line.
    let lastBeat: { i: number; t: number; dt: number } | null = null;
    let sent = -99;
    const smooth = onBeat
      ? window.setInterval(() => {
          if (!lastBeat || lastBeat.i < drill.meter) return;
          const f = Math.min(0.999, (performance.now() - lastBeat.t) / lastBeat.dt);
          const b = lastBeat.i - drill.meter + f;
          if (Math.abs(b - sent) >= 0.01) onBeat((sent = b));
        }, 33)
      : 0;
    try {
      if (backing.length) void piano.play(backing, plan.responseEnd + 0.5, abort.signal).catch(() => {});
      await piano.playTimeline(
        tl,
        abort.signal,
        (i) => {
          setBeat(i);
          const t = performance.now();
          const gap = tl.clicks[i + 1] ? (tl.clicks[i + 1].t - tl.clicks[i].t) * 1000 : 0;
          lastBeat = { i, t, dt: gap > 60 ? gap : lastBeat && i === lastBeat.i + 1 ? Math.max(120, t - lastBeat.t) : (lastBeat?.dt ?? 60000 / Math.max(30, bpm)) };
          if (onBeat && i - drill.meter !== sent) onBeat((sent = i - drill.meter));
          if (i >= drill.meter) setPhase('play');
        },
        (perf) => {
          zero = perf;
          setArm({ start: armStart, due: perf + bms(firstBeat) });
        },
      );
    } catch {
      /* stopped */
    } finally {
      setArm(null);
      window.clearInterval(smooth);
      window.clearInterval(liveTimer);
      window.clearInterval(heardTimer);
      if (hearRoles) onHeard!(null);
      setPocket(null);
      onLive?.(null);
      offMidi();
      offCC?.();
      offHit?.();
      offChoke?.();
      offCc4?.();
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
      const dm = analyzeDrumTake(drill, bpm, hits, { kit, mic: !drumMidi });
      return done(drumMidi ? withSplash(withChoke(dm, drill, bpm, chokesIn), drill, bpm, hits.filter((h) => h.voice === 'hhPedal'), cc4In, kit) : dm, played);
    }
    if (guitar) {
      const heard = drill.listen ? frames.filter((f) => !inBand(f.t)) : frames;
      const played = (heard.length ? detectOnsets(heard, onsetOptsFor(drill)) : notes).filter((p) => !drill.listen || !inBand(p.on));
      if (drill.harmony?.mode === 'chords' && heard.length) harmonyFrames = heard;
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
    // Sung licks (the voice course): the voice's timing tolerance, always by microphone.
    const m = analyzeTake(drill, bpm, heardNotes, cal, { mic: pianoMicTake || !!drill.sung, voice: !!drill.sung });
    if (drill.goal.pedal && midi.devices.length) {
      const pr = analyzePedal(drill.goal.pedal, pedal, bpm);
      m.pedal = { ok: pr.ok, total: pr.total, pass: pr.pass };
      if (!pr.pass && m.verdict === 'clean') m.verdict = 'almost';
      if (!pr.pass || m.verdict === 'clean') m.why = pr.why;
    }
    done(m, heardNotes);
  };
  startRef.current = start;
  return (
    <div className="drill-take">
      {/* 0.91 (one screen): when the take is blocked without MIDI, the warning below says it — no second MIDI line. */}
      {/* Input check: the microphone strip's MIDI link says what MIDI adds (it replaced the old MIDI hint line). */}
      {checkMode && phase !== 'ready' && <InputWatchdog lang={lang} mode={checkMode} arm={arm} />}
      {drumBlocked && (
        <p className="kit-warn" data-drum-needs-kit="1">
          {acKit
            ? lang === 'he'
              ? <>התרגיל הזה צריך תופים אלקטרוניים (<bdi>MIDI</bdi>): במערכת אקוסטית המיקרופון לא מודד אותו.</>
              : 'This one needs an e-kit (MIDI): on an acoustic kit the microphone can’t measure it.'
            : lang === 'he'
              ? <>התרגיל הזה צריך תופים אלקטרוניים (<bdi>MIDI</bdi>): המיקרופון שומע משטח אחד בלבד.</>
              : 'This one needs an e-kit (MIDI): the microphone hears one surface only.'}
        </p>
      )}
      {pianoBlocked && (
        <p className="kit-warn" data-piano-needs-midi="1">
          {drill.goal.vl ? (lang === 'he' ? <>התרגיל הזה צריך מקלדת <bdi>MIDI</bdi>: המיקרופון לא שומע איזה קול בחרתם.</> : 'This one needs a MIDI keyboard: the microphone can’t hear which voicing you chose.') : lang === 'he' ? <>התרגיל הזה צריך מקלדת <bdi>MIDI</bdi>: המיקרופון לא מודד עוצמה, שחרור קלידים או פדל.</> : 'This one needs a MIDI keyboard: the microphone can’t measure loudness, key release or the pedal.'}
        </p>
      )}
      {/* Slice 5: velocity bars under the score (loudness / accent / velocity-evenness goals only). */}
      {velOn && <VelocityBars bars={velBars(drill, pocket?.perNote, cal)} />}
      {/* Slice 5: the pocket meter replaces "Go!" and the beat dot (count-in cells, the needle, the streak). */}
      <PocketMeter
        live={pocket}
        phase={phase}
        beat={beat}
        meter={drill.meter || 4}
        lang={lang}
        rows={markable ? rowKeys : []}
        idle={
          <bdi dir="ltr">
            {drill.pulse === 8 ? '♪' : tx.bpm} = {bpm}
          </bdi>
        }
      />
      {phase === 'ready' && (drill.drums || drill.band) && !askDrums && !useMidi && !drumBlocked && onDrums && (
        <button className="link drums-route" onClick={() => onDrums(!drumsOk)} data-drums={drums ? 'on' : 'off'} data-band={drill.band && drums ? drill.band.style : undefined}>
          {drums ? (drill.band ? (lang === 'he' ? 'להקה באוזניות · להחליף לקליק' : 'Band in headphones · switch to the click') : lang === 'he' ? 'תופים באוזניות · להחליף לקליק' : 'Drums in headphones · switch to the click') : lang === 'he' ? 'קליק ברמקול · יש לי אוזניות' : 'Click on the speaker · I have headphones'}
        </button>
      )}
      {phase === 'ready' && drill.goal.free && drill.band && !drums && !askDrums && !drumBlocked && (
        // Trading (PIANO_JAZZ P2 / guitar g-impro 7): by mic on a speaker the band stays out under your bars — say why.
        <p className="field-hint" data-trade-silent="1">
          {lang === 'he' ? 'בתיבות שלכם הלהקה שותקת, כדי שהמיקרופון ישמע רק אתכם. עם אוזניות או MIDI היא מלווה אתכם.' : 'The band lays out under your bars so the mic hears only you. With headphones or MIDI it comps for you.'}
        </p>
      )}
      {phase === 'ready' && askDrums ? (
        // B5: the headphones gate — where the sound goes, so the mic hears only the player's instrument. Not a pass of anything.
        <div className="sheet-backdrop drums-gate-backdrop">
        <div className="sheet drums-gate" data-drums-gate="1" role="dialog" aria-modal="true">
          <p className="field-hint">
            {drum
              ? lang === 'he'
                ? 'בתרגיל הזה מתנגן גרוב ליווי. כדי שהמיקרופון ישמע רק את הפד, הגרוב מתנגן רק באוזניות או בחיבור קווי.'
                : 'A backing groove plays in this drill. So the mic hears only your pad, it plays only in headphones or over a line-in.'
              : drill.band
              ? lang === 'he'
                ? `בתרגיל הזה מנגנת להקה. כדי שהמיקרופון ישמע רק את ${isBassDrill(drill) ? 'הבס' : drill.spec.instrument === 'guitar' ? 'הגיטרה' : drill.sung ? 'הקול שלכם' : 'הפסנתר'}, היא מתנגנת רק באוזניות או בחיבור קווי.`
                : `A band plays in this drill. So the mic hears only your ${isBassDrill(drill) ? 'bass' : drill.spec.instrument === 'guitar' ? 'guitar' : drill.sung ? 'voice' : 'piano'}, it plays only in headphones or over a line-in.`
              : lang === 'he'
                ? `יש תופים בתרגיל הזה. כדי שהמיקרופון ישמע רק את ${isBassDrill(drill) ? 'הבס' : drill.spec.instrument === 'guitar' ? 'הגיטרה' : drill.sung ? 'הקול שלכם' : 'הפסנתר'}, התופים מתנגנים רק באוזניות או בחיבור קווי.`
                : `This drill has drums. So the mic hears only your ${isBassDrill(drill) ? 'bass' : drill.spec.instrument === 'guitar' ? 'guitar' : drill.sung ? 'voice' : 'piano'}, they play only in headphones or over a line-in.`}
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
          {drill.drum?.teacherCheck && (
            <p className="field-hint teacher-check" data-teacher-check="1">
              {lang === 'he' ? 'התבנית עוד לא נבדקה בידי מורה.' : 'Pattern not yet teacher-checked.'}
            </p>
          )}
          {checkMode && <InputCheck mode={checkMode} lang={lang} alsoMidi={checkMode === 'mic' && !isGuitarDrill(drill)} />}
          <button className="btn mega" onClick={() => void start()} data-drill-play="1" disabled={(drumBlocked || pianoBlocked) && !fakeTakeOn()}>
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
export function TakeResult({ m, lang, onAgain, onSlower, onNext, onFree, free = false }: { m: TakeMetrics; lang: Lang; onAgain: () => void; onSlower: () => void; onNext?: () => void; /** A badly missed timed take: one take in free time (rubato.ts). */ onFree?: () => void; /** A free-time take: notes only, no timing numbers. */ free?: boolean }) {
  const tx = TX[lang];
  /** Ahead of the click on average (played − expected < −30 ms): slowing down is not the fix, waiting for the beat is. */
  const rushing = m.timingMean !== null && m.timingMean < -30;
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
        {!free && (
          <span>
            CV R <b>{pct(m.cvR)}</b> · L <b>{pct(m.cvL)}</b>
          </span>
        )}
        {!free && (
          <span>
            ± <b>{ms(m.timingSD)}</b>
          </span>
        )}
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
      {rushing && (
        // Owner 2026-11-12: "Slower −10%" showed even when the player was clearly ahead of the click — say what happened.
        <p className="field-hint" data-rushing="1">
          {lang === 'he'
            ? `הקדמתם את הפעמה בממוצע ב־${Math.round(-m.timingMean!)} מ״ש — אותו טמפו, לחכות לקליק.`
            : `You were ahead of the beat by ${Math.round(-m.timingMean!)} ms on average — same tempo, wait for the click.`}
        </p>
      )}
      <div className="drill-actions">
        <button className="btn" onClick={onAgain}>
          ↻ {tx.again}
        </button>
        {m.verdict !== 'clean' && !rushing && !free && (
          <button className="btn ghost" onClick={onSlower}>
            {tx.slower}
          </button>
        )}
        {onFree && !free && (
          <button className="btn ghost" onClick={onFree} data-to-rubato="1">
            {lang === 'he' ? 'פעם אחת בלי קצב' : 'Once in free time'}
          </button>
        )}
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
