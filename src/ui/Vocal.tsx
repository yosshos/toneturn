// Vocal technique (spec addendum P): range calibration, the 10-level ladder, the daily warm-up, a live
// pitch trace, per-take metric cards with a tip and listen-back, the range map and per-metric trends.

import { Icon } from './icons';
import { vocalTags } from '../engine/taxonomy';
import type { SkillId } from '../engine/lesson';
import { useMiniGate } from './MiniLesson';
import { vocalUnit } from '../content/units';
import { NotesView } from './NotesView';
import { loadClick, PulseNotes, pulseClicks, saveClick, usePulseNow, type Pulse, type PulseClock } from './PulseNotes';
import { remarksFor } from '../engine/feedback';
import { sungMelodyRemarks } from '../engine/feedbackMelody';
import { melodyRemarkText, remarkText } from '../game/content';
import { BleedGate, CALIBRATE_SEC } from '../engine/bleed';
import { ThenAndNow } from './Extras';
import { keepTake } from '../storage/takes';
import { weekId } from '../engine/adaptive';
import { useEffect, useMemo, useRef, useState } from 'react';
import { clearSlot, loadSlot, saveSlot } from '../storage/resume';
import { spellMidi } from '../engine/aids';
import type { NoteEvent } from '../engine/lesson';
import { displayNote, hzToMidi, type PitchClass } from '../engine/pitch';
import type { SungFrame } from '../engine/sing';
import {
  DEFAULT_RANGE,
  gradeTake,
  itemFits,
  itemTargets,
  MIN_RANGE,
  rangeEvenness,
  rangeFromGlide,
  synthGlide,
  synthHold,
  synthMelody,
  tipFor,
  VOCAL_LEVELS,
  synthVibratoPhrase,
  vibratoConsistency,
  sightKeyName,
  ornamentNotes,
  synthOrnament,
  synthDynamic,
  itemAccompaniment,
  memoryFactor,
  scaleTonic,
  VOCAL_TOP_LEVEL,
  type MetricKey,
  type TakeGrade,
  type VibratoStyle,
  type VocalItem,
  type VoiceRange,
} from '../engine/vocal';
import type { Strings } from '../i18n/strings';
import { MODE_NAMES } from '../engine/modes';
import { pc } from '../engine/pitch';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { namingFor, type LessonResult, type Progress, type Settings, type VocalTake } from '../storage/progress';
import { piano, SIMULATED, store } from './services';
import { TIMED_KINDS } from '../engine/vocal';
import { familyOfRef, isNewLevel, NEW_LEVEL_NAMES, VOICE_FAMILIES, vocalLevelByRef, voiceItemTags, voiceLevelUnlocked } from '../engine/voiceFamilies';
import { earInstruction, earReference, earReplayNote, earShown, sessionEarItem } from '../engine/voiceEar';
import { gradeMore, moreReference, simulateMore, MORE_KINDS } from '../engine/vocalMore';
import { MORE_INSTR, METRIC_NAMES, TONE_NAMES, VT } from '../content/voiceCourseText';
import { restTakes, TimedSession, type VoiceTestMode } from './VoiceTimed';
import { restAdvice } from '../engine/voiceP2';
import { VoiceLevelTest } from './VoiceLevelTest';
import { LatencyCalibrate } from './LatencyCalibrate';
import { Glyph, DOMAIN_COLOR } from './Glyph';
import { FAMILY_GLYPH } from './stepGlyphs';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/** Written pitch = concert pitch + this (B♭ instruments read a tone higher, E♭ a major sixth, F a fifth). */
export const TRANSPOSE: Record<NonNullable<Settings['instrument']>, number> = { voice: 0, C: 0, Bb: 2, Eb: 9, F: 7, guitar: 12, bass: 12, keys: 0, strings: 0 };

export function noteLabel(midi: number, settings: Settings, key: PitchClass | null = null): string {
  const s = spellMidi(midi + TRANSPOSE[settings.instrument ?? 'voice'], key && TRANSPOSE[settings.instrument ?? 'voice'] ? null : key);
  const p: PitchClass = { letter: s.letter as PitchClass['letter'], acc: s.acc };
  return `${displayNote(p, namingFor(settings.naming, settings.uiLang), settings.uiLang)}${s.octave}`;
}

/** Levels 1–9: the vocal ladder; 101–108: scales and modes. */
export const MODES_BASE = 100;
export const HARMONY_BASE = 200;
export const BARRY_BASE = 300;
export const SIGHT_BASE = 400;
export const ORNAMENT_BASE = 500;
/** A vocal level by its number: the old programs (1–11, 101–108, 201–205, 301–307, 401–405, 501–504) and the new
 *  families of the voice course (600 and up, VOICE_CURRICULUM). */
export const levelDef = (level: number) => vocalLevelByRef(level)!;
/** A level sung against a clock (time feel, songs with the band, scat): the timed session runs it. */
export const isTimedLevel = (level: number) => !!vocalLevelByRef(level)?.items.some((it) => TIMED_KINDS.includes(it.kind));
/** The name of any level (old programs by their own lists, new ones from the families). */
export function levelName(level: number, t: Strings, lang: 'he' | 'en'): string {
  if (isNewLevel(level)) return NEW_LEVEL_NAMES[level]?.[lang] ?? String(level);
  if (level > ORNAMENT_BASE) return t.ornLevelNames[level - ORNAMENT_BASE - 1];
  if (level > SIGHT_BASE) return t.sightLevelNames[level - SIGHT_BASE - 1];
  if (level > BARRY_BASE) return t.barryLevelNames[level - BARRY_BASE - 1];
  if (level > HARMONY_BASE) return t.harmonyLevelNames[level - HARMONY_BASE - 1];
  if (level > MODES_BASE) return t.modesLevelNames[level - MODES_BASE - 1];
  return t.vocalLevelNames[level - 1];
}

// ------------------------------------------------------------------ live pitch trace

export function PitchTrace({ frames, targets, seconds, label, fold = true, bands }: { frames: SungFrame[]; targets: number[]; seconds: number; label: string; fold?: boolean; bands?: number[] }) {
  const W = 320;
  const H = 140;
  const lo = Math.min(...targets) - 2.5;
  const hi = Math.max(...targets) + 2.5;
  const centre = (Math.min(...targets) + Math.max(...targets)) / 2;
  const pts = frames.filter((f) => f.hz && f.confidence >= 0.8);
  const t0 = pts.length ? pts[0].t : 0;
  const span = Math.max(seconds, pts.length ? pts[pts.length - 1].t - t0 + 0.2 : seconds);
  const x = (t: number) => ((t - t0) / span) * W;
  const y = (m: number) => H - ((m - lo) / (hi - lo)) * H;
  const lines: string[] = [];
  let cur: string[] = [];
  let lastT = -1;
  for (const f of pts) {
    let m = hzToMidi(f.hz!);
    if (fold) m += Math.round((centre - m) / 12) * 12; // octave fold
    if (lastT >= 0 && f.t - lastT > 0.12 && cur.length) {
      lines.push(cur.join(' '));
      cur = [];
    }
    cur.push(`${x(f.t).toFixed(1)},${Math.max(0, Math.min(H, y(m))).toFixed(1)}`);
    lastT = f.t;
  }
  if (cur.length) lines.push(cur.join(' '));
  return (
    <figure className="pitch-trace" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-hidden="true">
        {[...new Set(bands ?? targets)].map((m) => (
          <g key={m}>
            <rect x="0" width={W} y={y(m + 0.25)} height={y(m - 0.25) - y(m + 0.25)} className="trace-band" />
            <line x1="0" x2={W} y1={y(m)} y2={y(m)} className="trace-target" />
          </g>
        ))}
        {lines.map((l, i) => (
          <polyline key={i} points={l} className="trace-line" />
        ))}
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------ metric card

function MetricBars({ t, g }: { t: Strings; g: TakeGrade }) {
  const lang = t.back === 'Back' ? 'en' : 'he';
  const shown = [...g.metrics].sort((a, b) => b.weight - a.weight).filter((m, i, a) => a.findIndex((x) => x.key === m.key) === i).slice(0, 4);
  return (
    <ul className="metric-bars">
      {shown.map((m) => (
        <li key={m.key} className={m.score >= 0.8 ? 'good' : m.score >= 0.5 ? 'fair' : 'weak'}>
          <span className="metric-name">{(t.metricNames as Record<string, string>)[m.key] ?? METRIC_NAMES[m.key]?.[lang] ?? m.key}</span>
          <span className="metric-val" dir="ltr">
            {m.unit === '%' ? `${Math.round(m.value)}%` : `${m.value > 0 && (m.unit === '¢' || m.unit === '¢/s') ? '+' : ''}${m.value} ${m.unit}`}
          </span>
          <span className="metric-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(m.score * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(30 - ((v - lo) / (hi - lo || 1)) * 26 - 2).toFixed(1)}`).join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} />
    </svg>
  );
}

const TREND_KEYS: MetricKey[] = ['intonation', 'stability', 'settle', 'duration', 'vibratoRegularity', 'transition', 'timing', 'landing'];

const isInstrument = (s: Settings) => !!s.instrument && s.instrument !== 'voice';

/** Sung passages from memory: scales, melodies, leaps, rhythmic lines (reference requests count, spec P.9). */
const memoryItem = (it: VocalItem) => ['scale', 'melody', 'leap', 'rhythmic'].includes(it.kind);
/** Sight-singing: the melody is read, not heard (spec V.1). */
const isSight = (it: VocalItem) => it.kind === 'sight';

/** Items sung as several separate holds (one take per note). */
const multiNote = (it: VocalItem) => it.kind === 'range' || it.kind === 'vibrato-register';

// ------------------------------------------------------------------ simulator takes

function simulatedFrames(item: VocalItem, targets: number[], noteIdx: number): SungFrame[] {
  const more = simulateMore(item, targets);
  if (more) return more;
  switch (item.kind) {
    case 'glide':
      return synthGlide(targets[0], targets[1], item.seconds - 0.5);
    case 'melody':
    case 'leap':
    case 'rhythmic':
    case 'staccato':
    case 'scale':
      return synthMelody(targets, item.bpm ? 60 / item.bpm / (item.perBeat ?? 1) : 0.5, { gap: item.kind === 'staccato' ? 0.15 : 0 });
    case 'range':
      return synthHold(targets[noteIdx], { seconds: item.seconds + 0.3, jitter: 2 });
    case 'vibrato-steady':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: 32 });
    case 'vibrato-delayed':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: 32, vibFrom: item.cueOn ?? 2 });
    case 'vibrato-onoff':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: 32, vibFrom: item.cueOn ?? 2, vibTo: item.cueOff ?? 5 });
    case 'messa':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, jitter: 2, rmsFrom: 0.02, rmsPeak: 0.2 });
    case 'vibrato-rate':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: item.vibRate ?? 5.5, vibExtent: 32 });
    case 'vibrato-width':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: item.vibWidth === 'wide' ? 70 : 26 });
    case 'vibrato-alternate': {
      const c = item.cues ?? [];
      const wins: [number, number][] = [];
      for (let k = 0; k < c.length; k += 2) wins.push([c[k], c[k + 1] ?? item.seconds + 1]);
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: 32, vibWindows: wins });
    }
    case 'vibrato-register':
      return synthHold(targets[noteIdx], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: 32 });
    case 'vibrato-messa':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.6, vibExtent: 32, rmsFrom: 0.02, rmsPeak: 0.2 });
    case 'harmony-hold':
      return synthHold(targets[0], { seconds: item.seconds + 0.3, jitter: 2 });
    case 'harmony-line':
      return synthMelody(targets, 60 / (item.bpm ?? 72));
    case 'ornament':
      return synthOrnament(item, targets[0]);
    case 'dynamic':
      return synthDynamic(item.curve ?? 'cresc', targets[0], item.seconds);
    case 'sight':
      return synthMelody(targets, 0.5, { noteSecs: (item.durs ?? []).map((d) => (d * 60) / (item.bpm ?? 72)) });
    case 'vibrato-notes':
      return synthVibratoPhrase(targets, item.noteSecs ?? [], item.vibNotes ?? []);
    default:
      return synthHold(targets[0], { seconds: item.seconds + 0.3, jitter: 2 });
  }
}

/**
 * The grid a melodic take is sung on — the reference's own pace — so the take gets a count-in, a click
 * and the notes lighting up in time (null = sung freely: holds, glides, harmony over the app's sound).
 */
export function pulseOf(item: VocalItem, targets: number[]): Pulse | null {
  if (targets.length < 2 || item.reference === 'during') return null;
  if (!item.ear && (item.kind === 'melody' || item.kind === 'leap' || item.kind === 'rhythmic' || item.kind === 'staccato')) {
    const d = item.bpm ? 60 / item.bpm / (item.perBeat ?? 1) : 0.55;
    const beat = item.bpm ? 60 / item.bpm : d;
    return { beat, onsets: targets.map((_, i) => i * d), countIn: 4, length: targets.length * d };
  }
  if (item.kind === 'scale') {
    const d = 0.42;
    return { beat: 2 * d, onsets: targets.map((_, i) => i * d), countIn: 4, length: targets.length * d };
  }
  if (item.kind === 'sight') {
    const beat = 60 / (item.bpm ?? 72);
    const durs = item.durs ?? targets.map(() => 1);
    const onsets = durs.map((_, i) => durs.slice(0, i).reduce((a, b) => a + b, 0) * beat);
    return { beat, onsets, countIn: 4, length: durs.reduce((a, b) => a + b, 0) * beat };
  }
  // Owner 2026-11-13: every other phrase of several notes (by ear, terraced, accents, arcs, breath phrases, vibrato
  // on chosen notes) is sung on the grid its reference was played on — one reference note per sung note.
  if (FREE_KINDS.includes(item.kind)) return null;
  const ref = referenceEvents(item, targets).events.filter((e) => !e.perc);
  if (ref.length !== targets.length || ref.some((e, i) => i > 0 && e.start <= ref[i - 1].start)) return null;
  const onsets = ref.map((e) => e.start - ref[0].start);
  const iois = onsets.slice(1).map((o, i) => o - onsets[i]).sort((a, b) => a - b);
  const step = iois[0];
  const beat = step < 0.4 ? 2 * step : step;
  const last = ref[ref.length - 1];
  return { beat, onsets, countIn: 4, length: last.start - ref[0].start + last.duration };
}

/** Sung freely, never on a click: slides, sirens, ornaments, single held notes. */
const FREE_KINDS: VocalItem['kind'][] = ['glide', 'siren', 'ornament', 'hold', 'straight', 'messa', 'dynamic', 'breath-hold', 'fine-tune', 'edge', 'harmony-hold', 'harmony-line', 'range', 'vibrato-register', 'micro', 'inflect'];

/** The reference: what the app plays before (or under) the take. */
function referenceEvents(item: VocalItem, targets: number[]): { events: NoteEvent[]; length: number } {
  const ear = earReference(item, targets);
  if (ear) return ear;
  const more = moreReference(item, targets);
  if (more) return more;
  if (item.kind === 'melody' || item.kind === 'leap' || item.kind === 'rhythmic' || item.kind === 'staccato') {
    const d = item.bpm ? 60 / item.bpm / (item.perBeat ?? 1) : 0.55;
    const events = targets.map((m, i) => ({ midi: m, start: i * d, duration: item.kind === 'staccato' ? d * 0.5 : d * 0.95, velocity: 0.7 }));
    return { events, length: targets.length * d + 0.4 };
  }
  if (item.kind === 'ornament') {
    let at = 0;
    const events = ornamentNotes(item).map(([x, d], k, all) => {
      const dur = k === all.length - 1 ? 1 : d;
      const e = { midi: targets[0] + x, start: at, duration: dur * 0.95, velocity: 0.7 };
      at += dur;
      return e;
    });
    return { events, length: at + 0.4 };
  }
  if (item.kind === 'sight') {
    // The key note only: the count-in and the click come from the take's pulse.
    const tonic = targets[0] - (item.steps?.[0] ?? 0);
    return { events: [{ midi: tonic, start: 0, duration: 1.2, velocity: 0.75 }], length: 1.4 };
  }
  if (item.kind === 'vibrato-notes') {
    const secs = item.noteSecs ?? targets.map(() => 0.6);
    let at = 0;
    const events = targets.map((m, i) => {
      const e = { midi: m, start: at, duration: secs[i] * 0.95, velocity: 0.7 };
      at += secs[i];
      return e;
    });
    return { events, length: at + 0.4 };
  }
  if (item.kind === 'scale') {
    if (item.scale?.hear === 'tonic') return { events: [{ midi: targets[0], start: 0, duration: 1.3, velocity: 0.75 }], length: 1.6 };
    const events = targets.map((m, i) => ({ midi: m, start: i * 0.42, duration: 0.4, velocity: 0.7 }));
    return { events, length: targets.length * 0.42 + 0.5 };
  }
  if (item.kind === 'glide') return { events: targets.map((m, i) => ({ midi: m, start: i * 0.8, duration: 0.75, velocity: 0.7 })), length: 2 };
  return { events: [{ midi: targets[0], start: 0, duration: 1.4, velocity: 0.7 }], length: 1.6 };
}

// ------------------------------------------------------------------ warm-up

export function warmupItems(passed: number[]): VocalItem[] {
  const pick = (lv: number, i: number) => VOCAL_LEVELS[lv - 1].items[i];
  const items = [pick(1, 1), pick(2, 0), pick(6, 0), pick(6, 1)];
  items.push(passed.includes(3) ? pick(3, 1) : pick(5, 0));
  items.push(pick(1, 3));
  return items.map((it) => ({ ...it, id: `w-${it.id}` }));
}

// ------------------------------------------------------------------ the screen

type View =
  | { kind: 'home' }
  | { kind: 'range' }
  | { kind: 'session'; level: number | 'warmup'; items: VocalItem[] }
  | { kind: 'timed'; level: number; items: VocalItem[] }
  | { kind: 'test' };

/** The view that opens a level: timed levels (clicks / band) in the timed session, the rest in the vocal session. */
const openLevel = (level: number, range: VoiceRange): View => {
  // Echo and audiation items get a fresh melody every session (no memorizable items); ids stay.
  const seed = Date.now() >>> 0;
  const items = levelDef(level).items.map((it) => sessionEarItem(it, seed)).filter((it) => itemFits(it, range));
  return isTimedLevel(level) ? { kind: 'timed', level, items: levelDef(level).items } : { kind: 'session', level, items };
};

interface Props {
  t: Strings;
  settings: Settings;
  progress: Progress;
  onSettings: (p: Partial<Settings>) => void;
  onProgress: (p: Progress) => void;
  onBack: () => void;
  onRuns: () => void;
  onSingAlong?: () => void;
  startWarmup?: boolean;
  /** Open this level directly (class assignment): 1–11, 101–108 modes, 201–205 harmony. */
  startLevel?: number | null;
  /** Open the voice level test (the voice course's Find my level, 0.84). */
  startTest?: boolean;
}

export function VocalScreen({ t, settings, progress, onSettings, onProgress, onBack, onRuns, onSingAlong, startWarmup, startLevel, startTest }: Props) {
  const gate = useMiniGate();
  const v = progress.vocal ?? { best: {}, passed: [], takes: [] };
  // The simulator (screenshots, e2e) can open any level directly: ?sim=1&vlevel=1101#/vocal.
  const simLevel = SIMULATED && typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('vlevel')) || 0 : 0;
  if (simLevel && !startLevel) startLevel = simLevel;
  const [view, setView] = useState<View>(() => (startTest ? { kind: 'test' } : startLevel && vocalLevelByRef(startLevel) ? openLevel(startLevel, settings.voiceRange ?? DEFAULT_RANGE) : startWarmup ? { kind: 'session', level: 'warmup', items: warmupItems(v.passed).filter((it) => itemFits(it, settings.voiceRange ?? DEFAULT_RANGE)) } : { kind: 'home' }));
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const style: VibratoStyle = settings.vibratoStyle ?? 'pop';
  // The level test sets up first (0.85): the voice range (so the items fit the voice) and the microphone delay (so the
  // timed sections are graded fairly) — never a setup screen in the middle of the test.
  const [testRangeSkip, setTestRangeSkip] = useState(false);
  const [testLatSkip, setTestLatSkip] = useState(false);
  const [openFam, setOpenFam] = useState<string | null>(() => {
    try {
      return localStorage.getItem('toneturn.voiceFamily');
    } catch {
      return null;
    }
  });

  if (view.kind === 'range')
    return <RangeCalibration t={t} settings={settings} onDone={(r) => (r && onSettings({ voiceRange: r }), setView({ kind: 'home' }))} />;
  if (view.kind === 'test' && !settings.voiceRange && !testRangeSkip && !SIMULATED)
    return <RangeCalibration t={t} settings={settings} onDone={(r) => (r ? onSettings({ voiceRange: r }) : setTestRangeSkip(true))} />;
  if (view.kind === 'test' && settings.micLatencyMs === undefined && !testLatSkip && !SIMULATED)
    return (
      <main className="panel-screen vocal vtimed">
        <header className="screen-head">
          <button className="icon-btn" onClick={() => setTestLatSkip(true)} aria-label={t.back}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{VT.calTitle[settings.uiLang === 'en' ? 'en' : 'he']}</h1>
        </header>
        <p className="field-hint">{VT.calWhy[settings.uiLang === 'en' ? 'en' : 'he']}</p>
        <LatencyCalibrate lang={settings.uiLang === 'en' ? 'en' : 'he'} values={{ micLatencyMs: settings.micLatencyMs }} sources={['mic']} initial="mic" onSave={(p) => onSettings(p)} />
        <button className="btn ghost" onClick={() => setTestLatSkip(true)}>
          {VT.calSkip[settings.uiLang === 'en' ? 'en' : 'he']}
        </button>
      </main>
    );
  if (view.kind === 'test')
    return (
      <VoiceLevelTest
        lang={settings.uiLang === 'en' ? 'en' : 'he'}
        range={range}
        onBack={() => (startTest ? onBack() : setView({ kind: 'home' }))}
        onDone={(starts) => (onSettings({ drillStart: { ...(settings.drillStart ?? {}), ...starts } as Settings['drillStart'] }), startTest ? onBack() : setView({ kind: 'home' }))}
        renderTake={(rung, test, key) =>
          TIMED_KINDS.includes(rung.item.kind) ? (
            <TimedSession key={key} t={t} settings={settings} range={range} level={rung.level} items={[rung.item]} onExit={() => setView({ kind: 'home' })} onProgress={onProgress} onSettings={onSettings} test={test} />
          ) : (
            <VocalSession key={key} t={t} settings={settings} range={range} style={style} level={rung.level} items={[sessionEarItem(rung.item, (Date.now() >>> 0) ^ rung.level)]} onExit={() => setView({ kind: 'home' })} onProgress={onProgress} test={test} />
          )
        }
      />
    );
  if (view.kind === 'timed') return <TimedSession t={t} settings={settings} range={range} level={view.level} items={view.items} onExit={() => setView({ kind: 'home' })} onProgress={onProgress} onSettings={onSettings} />;
  if (view.kind === 'session')
    return (
      <VocalSession
        t={t}
        settings={settings}
        range={range}
        style={style}
        level={view.level}
        items={view.items}
        onExit={() => setView({ kind: 'home' })}
        onProgress={onProgress}
      />
    );

  const midis = Array.from({ length: 49 }, (_, i) => 36 + i);
  const rangeMap = Object.entries(v.rangeMap ?? {})
    .map(([m, s]) => ({ m: Number(m), s }))
    .sort((a, b) => a.m - b.m);
  return (
    <main className="panel-screen vocal">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.vocalTitle}</h1>
      </header>
      <p className="field-hint">{t.vocalBlurb}</p>
      <p className="care-note">{t.vocalCare}</p>
      {(() => {
        // Vocal health: sung minutes today, or a tiring voice, suggest a break (a reminder, never a score).
        const ad = restAdvice(restTakes(v.takes), new Date());
        const lang = settings.uiLang === 'en' ? 'en' : 'he';
        return ad.suggest ? (
          <p className="care-note" data-rest-note="1">
            {ad.tired ? VT.restTired[lang] : VT.restSuggest[lang].replace('{m}', String(ad.minutes))}
          </p>
        ) : null;
      })()}

      <section className="set-card">
        <h2>{t.vocalRangeTitle}</h2>
        <p className="field-hint">{settings.voiceRange ? fill(t.vocalRangeSaved, { low: noteLabel(range.low, settings), high: noteLabel(range.high, settings) }) : t.vocalRangeDefault}</p>
        <div className="range-row">
          <label>
            {t.vocalLow}
            <select value={range.low} onChange={(e) => onSettings({ voiceRange: { low: Number(e.target.value), high: Math.max(Number(e.target.value) + MIN_RANGE, range.high) } })}>
              {midis.map((m) => (
                <option key={m} value={m}>
                  {noteLabel(m, settings)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.vocalHigh}
            <select value={range.high} onChange={(e) => onSettings({ voiceRange: { low: Math.min(range.low, Number(e.target.value) - MIN_RANGE), high: Number(e.target.value) } })}>
              {midis.map((m) => (
                <option key={m} value={m}>
                  {noteLabel(m, settings)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn ghost small" onClick={() => setView({ kind: 'range' })}>
          {settings.voiceRange ? t.vocalRangeAgain : t.vocalRangeStart}
        </button>
        <fieldset className="seg-field">
          <legend>{t.vocalStyle}</legend>
          <div className="seg" role="radiogroup" aria-label={t.vocalStyle}>
            {(['pop', 'classical'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={style === s} className={style === s ? 'on' : ''} onClick={() => onSettings({ vibratoStyle: s })}>
                {s === 'pop' ? t.vocalStylePop : t.vocalStyleClassical}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <button className="tool-card warmup-card" onClick={() => setView({ kind: 'session', level: 'warmup', items: warmupItems(v.passed).filter((it) => itemFits(it, range)) })}>
        <b>{t.vocalWarmup}</b>
        <small>{t.vocalWarmupHint}</small>
      </button>
      {onSingAlong && (
        <button className="tool-card warmup-card" onClick={onSingAlong}>
          <b>{t.singAlongTitle}</b>
          <small>{t.singAlongHint}</small>
        </button>
      )}

      <button className="tool-card warmup-card" data-voice-probe="1" onClick={() => setView({ kind: 'test' })}>
        <b>{VT.probe[settings.uiLang === 'en' ? 'en' : 'he']}</b>
        <small>{VT.probeHint[settings.uiLang === 'en' ? 'en' : 'he']}</small>
      </button>
      <VoiceFamilies t={t} settings={settings} passed={v.passed} best={v.best} open={openFam} onOpen={(id) => {
        setOpenFam(id);
        try {
          if (id) localStorage.setItem('toneturn.voiceFamily', id);
        } catch {
          /* private mode */
        }
      }} onLevel={(lv) => (lv === VOCAL_TOP_LEVEL ? onRuns() : gate(vocalUnit(lv), () => setView(openLevel(lv, range))))} onRuns={onRuns} />

      {rangeMap.length > 0 && (
        <section className="set-card">
          <h2>{t.vocalRangeMap}</h2>
          <ul className="range-map">
            {rangeMap.map(({ m, s }) => (
              <li key={m} className={s >= 0.8 ? 'good' : s >= 0.5 ? 'fair' : 'weak'}>
                <span dir="ltr">{noteLabel(m, settings)}</span>
                <span className="metric-bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(s * 100)}%` }} />
                </span>
                <span>{Math.round(s * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="field-hint">{Math.round(rangeEvenness(rangeMap.map((x) => x.s)) * 100)}%</p>
        </section>
      )}

      <VocalTrends t={t} takes={v.takes} />

      <section className="set-card">
        <h2>{t.thenNowTitle}</h2>
        <label className="toggle-row">
          <input type="checkbox" checked={!!settings.keepTakes} onChange={(e) => onSettings({ keepTakes: e.target.checked })} />
          <span>{t.keepTakes}</span>
        </label>
        {settings.keepTakes && <ThenAndNow t={t} refresh={v.takes.length} />}
      </section>
    </main>
  );
}

/**
 * The voice course's families (VOICE_CURRICULUM §5), grouped by stage. Old levels sit in their family by number (a
 * display map — never renumbered), so every level passed or open before stays passed or open.
 */
function VoiceFamilies({ t, settings, passed, best, open, onOpen, onLevel, onRuns }: { t: Strings; settings: Settings; passed: number[]; best: Record<string, number>; open: string | null; onOpen: (id: string | null) => void; onLevel: (lv: number) => void; onRuns: () => void }) {
  const lang = settings.uiLang === 'en' ? 'en' : 'he';
  const stages = ['A', 'B', 'C', 'D'] as const;
  const levelBest = (n: number) => {
    const items = vocalLevelByRef(n)?.items ?? [];
    return items.length ? items.reduce((a, it) => a + (best[it.id] ?? 0), 0) / items.length : 0;
  };
  return (
    <section className="vfam-wrap">
      <h2>{VT.families[lang]}</h2>
      <p className="field-hint">{VT.familiesHint[lang]}</p>
      {stages.map((st) => (
        <div key={st}>
          <p className="vstage">{VT.stage[st][lang]}</p>
          <ol className="vfam-list">
            {VOICE_FAMILIES.filter((f) => f.stage === st).map((f) => {
              const done = f.refs.filter((n) => passed.includes(n)).length;
              const isOpen = open === f.id;
              return (
                <li key={f.id} className="vfam" data-family={f.id}>
                  <button className="vfam-head" aria-expanded={isOpen} onClick={() => onOpen(isOpen ? null : f.id)}>
                    <Glyph kind={FAMILY_GLYPH[f.id] ?? 'sing'} color={DOMAIN_COLOR.voice} size={38} />
                    <span className="vfam-text">
                      <b>{f.title[lang]}</b>
                      <small>{fill(VT.levelsOf[lang], { done, n: f.refs.length + (f.id === 'v-agility' ? 8 : 0) })}</small>
                      <span className="vfam-bar" aria-hidden="true">
                        <span style={{ width: `${Math.round((done / Math.max(1, f.refs.length)) * 100)}%` }} />
                      </span>
                    </span>
                  </button>
                  {isOpen && (
                    <ol className="vocal-levels">
                      {f.id === 'v-agility' && (
                        <li>
                          <button className="vocal-level" onClick={onRuns}>
                            <span className="lv-num">↯</span>
                            <span className="lv-text">
                              <b>{VT.runsCard[lang]}</b>
                            </span>
                          </button>
                        </li>
                      )}
                      {f.refs.map((n, i) => {
                        const ok = passed.includes(n);
                        const unlocked = i === 0 || voiceLevelUnlocked(f, n, passed);
                        const b = levelBest(n);
                        const harmony = (n > HARMONY_BASE && n < BARRY_BASE) || (n > 1700 && n < 1800);
                        return (
                          <li key={n}>
                            <button className={`vocal-level ${ok ? 'passed' : ''} ${unlocked ? '' : 'locked'}`} disabled={!unlocked} data-vlevel={n} onClick={() => onLevel(n)}>
                              <span className="lv-num">{i + 1}</span>
                              <span className="lv-text">
                                <b>{levelName(n, t, lang)}</b>
                                <small>{ok ? `✓ ${t.vocalPassed}` : !unlocked ? <><Icon k="lock" /> {t.vocalLocked}</> : harmony ? <><Icon k="phones" /> {t.headphonesNeeded}</> : b > 0 ? `${Math.round(b * 100)}%` : fill(t.vocalLevel, { n: i + 1 })}</small>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

function VocalTrends({ t, takes }: { t: Strings; takes: VocalTake[] }) {
  const rows = TREND_KEYS.map((k) => ({ k, vals: takes.filter((x) => x.m[k] !== undefined).map((x) => Math.abs(x.m[k]!)).slice(-20) })).filter((r) => r.vals.length >= 2);
  if (!rows.length) return null;
  return (
    <section className="set-card">
      <h2>{t.vocalTrends}</h2>
      <ul className="vocal-trends">
        {rows.map((r) => (
          <li key={r.k}>
            <span>{t.metricNames[r.k]}</span>
            <Sparkline values={r.vals} />
            <span dir="ltr">{Math.round(r.vals[r.vals.length - 1] * 10) / 10}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ range calibration

function RangeCalibration({ t, settings, onDone }: { t: Strings; settings: Settings; onDone: (r: VoiceRange | null) => void }) {
  const [on, setOn] = useState(false);
  const [frames, setFrames] = useState<SungFrame[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [result, setResult] = useState<VoiceRange | null | 'unclear'>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const start = async () => {
    setOn(true);
    setResult(null);
    setFrames([]);
    const c = new AbortController();
    ctl.current = c;
    const buf: SungFrame[] = [];
    const onFrame = (f: SungFrame) => {
      buf.push(f);
      if (f.hz && f.confidence > 0.85) setNow(hzToMidi(f.hz));
      if (buf.length % 4 === 0) setFrames(buf.slice());
    };
    let got: SungFrame[] = [];
    if (SIMULATED) {
      got = Array.from({ length: 300 }, (_, i) => ({ t: i / 30, hz: 440 * 2 ** ((48 + (26 * i) / 299 - 69) / 12), confidence: 0.95, rms: 0.1 }));
      got.forEach(onFrame);
    } else {
      const r = await new BrowserPitchCapture().sing({ signal: c.signal, maxMs: 14000, silenceMs: 6000, endSilenceMs: 1500, hopMs: 33, onFrame });
      if (r.kind === 'frames') got = r.frames;
    }
    setOn(false);
    setFrames(got);
    const rg = rangeFromGlide(got);
    setResult(rg ?? 'unclear');
  };
  return (
    <main className="panel-screen vocal">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (ctl.current?.abort(), onDone(null))} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.vocalRangeTitle}</h1>
      </header>
      <p className="field-hint">{t.vocalRangeHint}</p>
      <div className="range-now" aria-live="polite" dir="ltr">
        {now !== null ? noteLabel(Math.round(now), settings) : '–'}
      </div>
      {frames.length > 0 && <PitchTrace frames={frames} targets={[40, 84]} seconds={8} label={t.vocalRangeTitle} fold={false} />}
      {result === 'unclear' && (
        <p className="form-error" role="alert">
          {t.vocalRangeUnclear}
        </p>
      )}
      {result && result !== 'unclear' && <p className="range-result">{fill(t.vocalRangeSaved, { low: noteLabel(result.low, settings), high: noteLabel(result.high, settings) })}</p>}
      {result && result !== 'unclear' ? (
        <button className="btn mega" onClick={() => onDone(result)}>
          ✓ {t.vocalDone}
        </button>
      ) : (
        <button className={`btn mega ${on ? 'ghost' : ''}`} disabled={on} onClick={() => void start()}>
          {on ? '…' : <><Icon k="mic" /> {t.vocalRangeStart}</>}
        </button>
      )}
    </main>
  );
}

// ------------------------------------------------------------------ a session (one level or the warm-up)

type Phase = 'ready' | 'calibrating' | 'listening' | 'singing' | 'result' | 'summary';

function VocalSession({
  t,
  settings,
  range,
  style,
  level,
  items,
  onExit,
  onProgress,
  test,
}: {
  t: Strings;
  settings: Settings;
  range: VoiceRange;
  style: VibratoStyle;
  level: number | 'warmup';
  items: VocalItem[];
  onExit: () => void;
  onProgress: (p: Progress) => void;
  test?: VoiceTestMode;
}) {
  // Left half-way, the level continues at the same exercise with the takes so far (playtesting, 0.35.3).
  const slotKey = `vocal:${level}`;
  const [saved] = useState(() => {
    const v = loadSlot<{ ids: string[]; i: number; noteIdx: number; best: Record<string, { score: number; take: VocalTake }> }>(slotKey);
    return v && v.data.ids.join() === items.map((it) => it.id).join() && v.data.i < items.length ? v.data : null;
  });
  const [i, setI] = useState(saved?.i ?? 0);
  const [noteIdx, setNoteIdx] = useState(saved?.noteIdx ?? 0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [frames, setFrames] = useState<SungFrame[]>([]);
  const [grade, setGrade] = useState<TakeGrade | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [onsetAt, setOnsetAt] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const [summary, setSummary] = useState<{ score: number; passed: boolean } | null>(null);
  // The now-cue of timed takes: the reference lights its notes, then a count-in and the click carry the take.
  const [pulseClock, setPulseClock] = useState<PulseClock | null>(null);
  const [clickOn, setClickOn] = useState(loadClick);
  const pulseNow = usePulseNow(pulseClock).glide;
  const [headphones, setHeadphones] = useState(() => {
    try {
      return localStorage.getItem('toneturn.headphones') === '1';
    } catch {
      return false;
    }
  });
  const best = useRef<Record<string, { score: number; take: VocalTake }>>(saved?.best ?? {});
  useEffect(() => {
    if (test?.autoStart) void take();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A level-test take shows its score for a moment, then the test moves on by itself (like the playing tests).
  useEffect(() => {
    if (!test || phase !== 'result' || !grade || grade.unclear) return;
    const pass = typeof level === 'number' ? levelDef(level).pass : 0.7;
    const id = window.setTimeout(() => test.onTake(grade.score, pass), grade.score >= pass ? 1800 : 2800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, grade]);
  useEffect(() => {
    if ((i === 0 && noteIdx === 0) || test) return;
    saveSlot(slotKey, { title: typeof level === 'number' ? `${t.vocalTitle} · ${level}` : t.vocalWarmup, route: 'vocal', done: i, total: items.length, data: { ids: items.map((it) => it.id), i, noteIdx, best: best.current } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, noteIdx]);
  const rangeScores = useRef<number[]>([]);
  const ctl = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  // Reference requests (spec P.9): extra listens cost melodic memory; their sound is cut from the take.
  const [refs, setRefs] = useState(0);
  const refsRef = useRef(0);
  const captureT0 = useRef<number | null>(null);
  const refWindows = useRef<[number, number][]>([]);
  const sessionId = useMemo(() => `vocal-${level}-${Date.now().toString(36)}`, [level]);
  const item = items[i];
  const targets = useMemo(() => itemTargets(item, range), [item, range]);
  const noteCount = multiNote(item) ? targets.length : 1;
  const shownTargets = multiNote(item) ? [targets[noteIdx]] : targets;
  const pulse = useMemo(() => (multiNote(item) ? null : pulseOf(item, targets)), [item, targets]);
  /** The notes are the task (scale by name, by ear): the now-cue shows dots, the reference lights nothing. */
  const hiddenTask = (item.kind === 'scale' && item.scale?.hear === 'tonic') || !!item.ear;

  useEffect(
    () => () => {
      ctl.current?.abort();
      piano.stopDrone();
    },
    [],
  );
  useEffect(() => () => void (audioUrl && URL.revokeObjectURL(audioUrl)), [audioUrl]);

  const take = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    stopped.current = false;
    refWindows.current = [];
    captureT0.current = null;
    setGrade(null);
    setFrames([]);
    setOnsetAt(null);
    setAudioUrl(null);
    setPulseClock(null);
    await piano.unlock();
    const ref = referenceEvents(item, shownTargets);
    setPhase('listening');
    const acc = itemAccompaniment(item, range);
    const chordsAbs = item.chords ? item.chords.map((ch) => ch.map((x) => targets[0] - (item.steps?.[0] ?? 0) + x)) : null;
    const melodic = ['melody', 'leap', 'rhythmic', 'staccato', 'glide', 'harmony-line', 'sight', 'breath-phrase', 'breath-plan', 'drift-phrase', 'siren', 'terraced-scale', 'terraced', 'accents', 'arc'].includes(item.kind) || (item.kind === 'inflect' && item.more?.shape === 'ghost');
    // The app keeps sounding while the player sings (harmony, a held reference): without headphones the
    // microphone hears it too — a bleed gate learns its level first and drops it (spec P.0).
    const sounding = item.kind === 'harmony-hold' || item.kind === 'harmony-line' || item.reference === 'during';
    const needGate = sounding && !headphones && !SIMULATED;
    const buf: SungFrame[] = [];
    let onset: number | null = null;
    let got: SungFrame[] | null = null;
    let audio: Blob | undefined;
    let tick: ReturnType<typeof setInterval> | undefined;
    const startTicking = () => {
      const startClock = performance.now();
      tick = setInterval(() => setClock((performance.now() - startClock) / 1000), 100);
    };
    const keep = (raw: SungFrame) => {
      const f = refWindows.current.some(([a, b]) => raw.t >= a && raw.t <= b) ? { ...raw, hz: null, confidence: 0 } : raw;
      buf.push(f);
      if (onset === null && f.hz && f.confidence >= 0.8) {
        onset = f.t;
        setOnsetAt(f.t);
        // Fine tuning sings INTO the drone: it keeps sounding (the bleed gate keeps it out of the measurement).
        if (item.reference === 'during' && !headphones && !item.kind.startsWith('harmony') && item.kind !== 'fine-tune') piano.stopDrone();
      }
      if (buf.length % 3 === 0) setFrames(buf.slice());
    };

    if (needGate) {
      const gate = new BleedGate(item.kind === 'harmony-line' || item.kind === 'harmony-hold' ? acc : [shownTargets[0]]);
      let stage: 'cal' | 'pre' | 'sing' = 'cal';
      let lastT = 0;
      let tStart = 0;
      const beat = 60 / (item.bpm ?? 72);
      const extra = CALIBRATE_SEC + (item.kind === 'harmony-line' ? 4 * beat : 0) + 1;
      const capture = new BrowserPitchCapture().sing({
        signal: c.signal,
        maxMs: (item.seconds + 4 + extra) * 1000,
        silenceMs: 60_000,
        endSilenceMs: melodic ? 900 : undefined,
        hopMs: 20,
        record: true,
        onFrame: (raw) => {
          lastT = raw.t;
          if (stage === 'cal') return gate.calibrate(raw);
          if (stage === 'pre') return;
          keep(gate.pass({ ...raw, t: raw.t - tStart }));
        },
      });
      setPhase('calibrating');
      // The sound plays while the player waits: the drone / chord, or the melody's first note.
      if (item.pre) await piano.play(item.pre.map((x) => ({ midi: shownTargets[0] + x, start: 0, duration: 1.2, velocity: 0.6 })), 1.4, c.signal).catch(() => {});
      if (item.kind === 'harmony-hold') piano.startDrone(acc, 0.12);
      else if (item.kind === 'harmony-line') piano.startDrone(item.chords ? acc.slice(0, 1) : [acc[0]], 0.12);
      else piano.startDrone([shownTargets[0]], 0.12);
      await new Promise((r) => setTimeout(r, CALIBRATE_SEC * 1000 + 150));
      gate.finishCalibration();
      if (item.kind === 'harmony-line') {
        piano.stopDrone();
        stage = 'pre';
        setPhase('listening');
        const clicks = [0, 1, 2, 3].map((k) => ({ midi: 0, start: k * beat, duration: 0.05, velocity: 0.8, perc: (k === 0 ? 'accent' : 'click') as 'accent' | 'click' }));
        await piano.play(clicks, 4 * beat, c.signal).catch(() => {});
        void piano.play(lineAccompaniment(acc, chordsAbs, beat), acc.length * beat + 0.3, c.signal).catch(() => {});
      }
      tStart = lastT;
      stage = 'sing';
      setPhase('singing');
      startTicking();
      const r = await capture;
      if (r.kind === 'frames' || (r.kind === 'aborted' && stopped.current)) {
        got = buf;
        if (r.kind === 'frames') audio = r.audio;
      } else if (r.kind === 'aborted') {
        clearInterval(tick);
        piano.stopDrone();
        return;
      }
    } else {
      if (item.pre) await piano.play(item.pre.map((x) => ({ midi: shownTargets[0] + x, start: 0, duration: 1.2, velocity: 0.6 })), 1.4, c.signal).catch(() => {});
      if (item.kind === 'harmony-hold') piano.startDrone(acc, 0.12);
      else if (item.kind === 'harmony-line') {
        // Count-in (4 clicks), then the melody plays while the player sings the harmony.
        const beat = 60 / (item.bpm ?? 72);
        const clicks = [0, 1, 2, 3].map((k) => ({ midi: 0, start: k * beat, duration: 0.05, velocity: 0.8, perc: (k === 0 ? 'accent' : 'click') as 'accent' | 'click' }));
        await piano.play(clicks, 4 * beat, c.signal).catch(() => {});
        void piano.play(lineAccompaniment(acc, chordsAbs, beat), acc.length * beat + 0.3, c.signal).catch(() => {});
      } else if (item.reference === 'during') piano.startDrone([shownTargets[0]], 0.12);
      else {
        // The reference lights its own notes as they sound (same grid as the take).
        if (pulse && !isSight(item) && !hiddenTask) setPulseClock({ pulse: { ...pulse, countIn: 0 }, zero: performance.now() + 30 });
        await piano.play(ref.events, ref.length, c.signal).catch(() => {});
        setPulseClock(null);
      }
      if (c.signal.aborted) {
        piano.stopDrone();
        setPulseClock(null);
        setPhase('ready');
        return;
      }
      setPhase('singing');
      startTicking();
      // Timed takes: a bar of count-in, then the click (if on) and the lit notes carry the singer through.
      const lead = pulse ? pulse.countIn * pulse.beat : 0;
      const clickCtl = new AbortController();
      c.signal.addEventListener('abort', () => clickCtl.abort());
      captureT0.current = performance.now() + lead * 1000;
      if (pulse) {
        const pc = pulseClicks(pulse, clickOn);
        setPulseClock({ pulse, zero: captureT0.current });
        void piano.play(pc.events, pc.length, clickCtl.signal).catch(() => {});
      }
      const keepShifted = (f: SungFrame) => {
        if (f.t >= lead - 0.4) keep(lead ? { ...f, t: f.t - lead } : f);
      };
      if (SIMULATED) {
        const sim = simulatedFrames(item, targets, noteIdx);
        for (const f of sim) keep(f);
        // The simulator runs through the count-in and the first notes too (the now-cue is part of the take).
        await new Promise((r) => setTimeout(r, 300 + (pulse ? (lead + Math.min(pulse.length, 1.5)) * 1000 : 0)));
        got = sim;
      } else {
        const r = await new BrowserPitchCapture().sing({
          signal: c.signal,
          maxMs: (item.seconds + 4 + lead) * 1000,
          silenceMs: 6000 + lead * 1000,
          endSilenceMs: melodic ? (item.kind === 'staccato' ? 1200 : 900) : 700,
          hopMs: 20,
          record: true,
          onFrame: keepShifted,
        });
        clickCtl.abort();
        if (r.kind === 'frames') {
          got = lead ? buf : r.frames;
          audio = r.audio;
        } else if (r.kind === 'aborted') {
          if (!stopped.current) {
            clearInterval(tick);
            piano.stopDrone();
            setPulseClock(null);
            return;
          }
          got = buf; // "Stop": grade what was sung so far
        }
      }
    }
    clearInterval(tick);
    piano.stopDrone();
    setPulseClock(null);
    setFrames(got ?? []);
    const g = got ? (MORE_KINDS.includes(item.kind) ? gradeMore(item, got, range) : gradeTake(item, got, range, style, noteIdx)) : { unclear: true, score: 0, metrics: [], weakest: null };
    setGrade(g);
    if (audio) setAudioUrl(URL.createObjectURL(audio));
    if (audio && settings.keepTakes && !g.unclear && !test) void keepTake({ item: item.kind === 'range' || item.kind === 'vibrato-register' ? `${item.id}#${noteIdx}` : item.id, week: weekId(new Date()), score: g.score, at: new Date().toISOString(), blob: audio });
    setPhase('result');
    piano.cue(g.unclear ? 'wrong' : g.score >= 0.6 ? 'correct' : 'wrong');
    if (!g.unclear) {
      const key = multiNote(item) ? `${item.id}#${noteIdx}` : item.id;
      const m: VocalTake['m'] = {};
      for (const x of g.metrics) if (m[x.key] === undefined) m[x.key] = x.value;
      if (memoryItem(item)) m.references = refsRef.current;
      const tk: VocalTake = { at: new Date().toISOString(), item: item.id, level: typeof level === 'number' ? level : 0, score: g.score, m };
      if (!best.current[key] || best.current[key].score < g.score) best.current[key] = { score: g.score, take: tk };
    }
  };

  const finishSession = async () => {
    clearSlot(slotKey);
    const perItem = items.map((it) => {
      if (it.kind === 'vibrato-register') {
        const n = itemTargets(it, range).length;
        const bs = Array.from({ length: n }, (_, k) => best.current[`${it.id}#${k}`]);
        const scores = bs.map((b) => b?.score ?? 0);
        const cons = vibratoConsistency(bs.filter(Boolean).map((b) => ({ rate: b!.take.m.vibratoRate ?? 0, extent: b!.take.m.vibratoExtent ?? 0 })));
        return { it, score: (scores.reduce((a, b) => a + b, 0) / n) * (0.7 + 0.3 * cons) };
      }
      if (it.kind === 'range') {
        const n = itemTargets(it, range).length;
        const scores = Array.from({ length: n }, (_, k) => best.current[`${it.id}#${k}`]?.score ?? 0);
        rangeScores.current = scores;
        return { it, score: scores.reduce((a, b) => a + b, 0) / n };
      }
      return { it, score: best.current[it.id]?.score ?? 0 };
    });
    const mean = perItem.reduce((a, x) => a + x.score, 0) / perItem.length;
    const lvDef = typeof level === 'number' ? levelDef(level) : null;
    const passed = lvDef ? mean >= lvDef.pass : false;
    const rated = perItem.filter((x) => Object.keys(best.current).some((k) => k === x.it.id || k.startsWith(`${x.it.id}#`)));
    const now = new Date().toISOString();
    const r: LessonResult = {
      lessonId: typeof level === 'number' ? (isNewLevel(level) ? `vocal-f-${level}` : level > ORNAMENT_BASE ? `vocal-orn-${level - ORNAMENT_BASE}` : level > SIGHT_BASE ? `vocal-sight-${level - SIGHT_BASE}` : level > BARRY_BASE ? `vocal-barry-${level - BARRY_BASE}` : level > HARMONY_BASE ? `vocal-harmony-${level - HARMONY_BASE}` : level > MODES_BASE ? `vocal-modes-${level - MODES_BASE}` : `vocal-${level}`) : 'vocal-warmup',
      lessonVersion: 1,
      sessionId,
      completedAt: now,
      firstTry: perItem.filter((x) => x.score >= 0.6).length,
      total: perItem.length,
      // The server accepts at most 20 XP per item (migration 8): stay inside it.
      xp: Math.min(20 * perItem.length, Math.round(rated.reduce((a, x) => a + x.score, 0) * 10) + (passed ? 10 : 0)),
      missed: [],
      items: [
        // Harmony singing measures singing in tune; sight-singing measures reading; the rest vocal technique.
        // The voice course's new families: their own skills and rating tags (voiceItemTags).
        ...rated.filter(() => typeof level === 'number' && isNewLevel(level)).map((x) => {
          const tg = voiceItemTags(level as number, x.it);
          return { id: `${sessionId}:${x.it.id}`, skill: tg.skill, difficulty: x.it.difficulty, correct: x.score >= 0.6, tag: `vocal:${x.it.id}`, score: x.score, m: best.current[x.it.id]?.take.m, tags: tg.tags };
        }),
        ...rated.filter(() => !(typeof level === 'number' && isNewLevel(level))).map((x) => ({ id: `${sessionId}:${x.it.id}`, skill: (typeof level === 'number' && level > SIGHT_BASE && level < ORNAMENT_BASE ? 'sight' : typeof level === 'number' && level > HARMONY_BASE && level < BARRY_BASE ? 'singing' : 'technique') as SkillId, difficulty: x.it.difficulty, correct: x.score >= 0.6, tag: `vocal:${x.it.id}`, score: x.score, m: best.current[x.it.id]?.take.m, tags: vocalTags((typeof level === 'number' && level > SIGHT_BASE && level < ORNAMENT_BASE ? 'sight' : typeof level === 'number' && level > HARMONY_BASE && level < BARRY_BASE ? 'singing' : 'technique') as SkillId, x.it.kind, typeof level === 'number' && level > ORNAMENT_BASE) })),
        // Melodic memory (spec P.9): the right notes, less for every extra listen to the reference.
        ...rated
          .filter((x) => memoryItem(x.it) && best.current[x.it.id])
          .map((x) => {
            const m = best.current[x.it.id].take.m;
            const s = Math.round(((m.hit ?? 0) / 100) * memoryFactor(m.references ?? 0) * 1000) / 1000;
            return { id: `${sessionId}:${x.it.id}:mem`, skill: 'sequences' as const, difficulty: x.it.difficulty, correct: s >= 0.6, tag: `vocal-mem:${x.it.id}`, score: s };
          }),
      ],
    };
    const takes = Object.values(best.current).map((b) => b.take);
    const rangeItem = items.find((it) => it.kind === 'range');
    const rangeMap = rangeItem ? Object.fromEntries(itemTargets(rangeItem, range).map((m, k) => [String(m), rangeScores.current[k] ?? 0])) : undefined;
    if (rated.length) onProgress(await store.recordVocal(r, takes, { passedLevel: passed && typeof level === 'number' ? level : null, rangeMap }));
    setSummary({ score: mean, passed });
    setPhase('summary');
    piano.cue(passed || level === 'warmup' ? 'complete' : 'correct');
  };

  const next = () => {
    if (multiNote(item) && noteIdx < noteCount - 1) {
      setNoteIdx(noteIdx + 1);
      setPhase('ready');
      setGrade(null);
      setFrames([]);
      return;
    }
    if (i < items.length - 1) {
      setRefs(0);
      refsRef.current = 0;
      setI(i + 1);
      setNoteIdx(0);
      setPhase('ready');
      setGrade(null);
      setFrames([]);
      return;
    }
    void finishSession();
  };

  const sinceOnset = onsetAt !== null && phase === 'singing' ? clock - onsetAt : null;
  const altCue =
    sinceOnset !== null && item.kind === 'vibrato-alternate'
      ? (item.cues ?? []).filter((c) => sinceOnset >= c).length % 2 === 1
        ? t.vocalNowVibrato
        : t.vocalNowStraight
      : null;
  const cue = altCue ??
    (sinceOnset !== null && (item.kind === 'vibrato-delayed' || item.kind === 'vibrato-onoff')
      ? sinceOnset >= (item.cueOff ?? Infinity)
        ? t.vocalNowStraight
        : sinceOnset >= (item.cueOn ?? 2)
          ? t.vocalNowVibrato
          : t.vocalNowStraight
      : null);
  const tipKey = grade ? tipFor(grade) : null;
  // Precise feedback (spec W): how and where the take was off.
  const remarkLine = (() => {
    if (!grade || grade.unclear || !frames.length) return null;
    if (['melody', 'leap', 'rhythmic', 'scale', 'staccato', 'harmony-line', 'vibrato-notes', 'sight'].includes(item.kind)) {
      const items = sungMelodyRemarks(frames, shownTargets);
      return items.length ? melodyRemarkText(items, settings.uiLang) : null;
    }
    // Glides move on purpose; ornaments are judged by shape and speed (their own metrics), not as one note.
    if (item.kind === 'glide' || item.kind === 'ornament') return null;
    // Barry Harris free choice: judge the note the singer chose, not the base note.
    const target = item.bh?.mode === 'free' ? chosenMidi(frames) : shownTargets[0];
    if (target === null) return null;
    const rs = remarksFor(frames, target).filter((r) => !(item.kind.startsWith('vibrato') && r === 'unsteady'));
    return rs.length ? remarkText(rs, settings.uiLang, rs[0] === 'spot') : null;
  })();
  // Scales asked by name: only the tonic is shown until the take is graded (the notes are the task).
  // Ear items (P3): only the given note — none for audiation — until the take is graded.
  const hidden = (item.kind === 'scale' && item.scale?.hear === 'tonic' && phase !== 'result') || (!!item.ear && phase !== 'result');
  const visible = hidden ? (item.ear ? earShown(item, shownTargets) : shownTargets.slice(0, 1)) : shownTargets;
  const title = level === 'warmup' ? t.vocalWarmup : isNewLevel(level) ? levelName(level, t, settings.uiLang === 'en' ? 'en' : 'he') : level > ORNAMENT_BASE ? `${t.ornTitle} · ${t.ornLevelNames[level - ORNAMENT_BASE - 1]}` : level > SIGHT_BASE ? `${t.sightTitle} · ${t.sightLevelNames[level - SIGHT_BASE - 1]}` : level > BARRY_BASE ? `${t.barryTitle} · ${t.barryLevelNames[level - BARRY_BASE - 1]}` : level > HARMONY_BASE ? `${t.harmonyTitle} · ${t.harmonyLevelNames[level - HARMONY_BASE - 1]}` : level > MODES_BASE ? `${t.modesTitle} · ${t.modesLevelNames[level - MODES_BASE - 1]}` : `${fill(t.vocalLevel, { n: level })} · ${t.vocalLevelNames[level - 1]}`;

  if (phase === 'summary' && summary)
    return (
      <main className="panel-screen vocal">
        <header className="screen-head">
          <h1>{title}</h1>
        </header>
        <section className="vocal-summary" aria-live="polite">
          <div className="big-score">{Math.round(summary.score * 100)}%</div>
          {level !== 'warmup' && <p>{summary.passed ? t.vocalLevelPassed : fill(t.vocalLevelNotYet, { need: Math.round(levelDef(level).pass * 100) })}</p>}
        </section>
        <button className="btn mega" onClick={onExit}>
          {t.vocalDone}
        </button>
      </main>
    );

  return (
    <main className="panel-screen vocal">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (ctl.current?.abort(), piano.stopDrone(), onExit())} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{test ? test.title : title}</h1>
      </header>
      {test?.head}
      <p className="field-hint">
        {typeof level === 'number' && isNewLevel(level) && `${familyOfRef(level)?.title[settings.uiLang === 'en' ? 'en' : 'he'] ?? ''}${test ? '' : ' · '}`}
        {!test && fill(t.vocalItemOf, { i: i + 1, n: items.length })}
        {noteCount > 1 && ` · ${fill(t.vocalNoteOf, { i: noteIdx + 1, n: noteCount })}`}
      </p>
      {phase !== 'result' && <p className="vocal-instr">
        {item.ear
          ? earInstruction(item, settings.uiLang === 'en' ? 'en' : 'he', (s) => t.intervalNames[String(s)] ?? '')
          : item.kind === 'scale' && item.scale
          ? (() => {
              const tn = scaleTonic(item.scale, range);
              const lang = settings.uiLang;
              const tonic = tn ? displayNote(pc(tn.name), namingFor(settings.naming, lang), lang) : '';
              return fill(item.scale.down && item.scale.down !== item.scale.up ? t.scaleUpDown : item.scale.down ? t.scaleUpAndBack : t.scaleUp, {
                tonic,
                up: MODE_NAMES[item.scale.up][lang],
                down: item.scale.down ? MODE_NAMES[item.scale.down][lang] : '',
                n: item.scale.notes ?? '',
              }) + (item.scale.notes ? ` ${fill(t.scaleFirstN, { n: item.scale.notes })}` : '') + (item.scale.hear === 'tonic' ? ` ${t.scaleTonicOnly}` : '');
            })()
          : item.bh
            ? barryInstruction(item, shownTargets[0], t, settings)
          : isSight(item)
            ? t.sightInstr
          : item.kind === 'ornament'
            ? t.ornInstr[item.orn ?? 'grace']
          : item.kind === 'dynamic'
            ? t.dynInstr[item.curve ?? 'cresc']
          : MORE_KINDS.includes(item.kind)
            ? fill(MORE_INSTR[item.kind === 'inflect' ? item.more?.shape ?? 'scoop' : item.kind]?.[settings.uiLang === 'en' ? 'en' : 'he'] ?? '', { s: item.seconds })
          : item.kind === 'harmony-hold' && item.more?.tone
            ? fill(MORE_INSTR.tone[settings.uiLang === 'en' ? 'en' : 'he'], { tone: TONE_NAMES[item.more.tone]?.[settings.uiLang === 'en' ? 'en' : 'he'] ?? item.more.tone }) + (item.more.straight ? ` ${MORE_INSTR.straightTone[settings.uiLang === 'en' ? 'en' : 'he']}` : '')
          : item.kind === 'harmony-hold' && item.accompany?.length === 1
            ? fill(item.accompany[0] < 0 ? t.holdIntervalAbove : t.holdIntervalBelow, { iv: t.intervalNames[String(Math.abs(item.accompany[0]))] ?? '' })
            : fill(t.vocalInstr[item.kind] ?? '', { s: item.seconds, on: item.cueOn ?? 2, off: item.cueOff ?? 5, rate: item.vibRate ?? '', width: item.vibWidth === 'wide' ? t.vocalWide : t.vocalNarrow })}
      </p>}
      {item.kind === 'vibrato-notes' && (
        <p className="vib-notes" dir="ltr" aria-label={t.vocalVibMarks}>
          {targets.map((m, k) => (
            <span key={k} className={item.vibNotes?.[k] ? 'vib' : ''}>
              {noteLabel(m, settings)}
              {item.vibNotes?.[k] ? ' 〰' : ''}
            </span>
          ))}
        </p>
      )}
      {item.kind === 'vibrato-rate' && phase === 'singing' && <div className="vib-pulse" style={{ animationDuration: `${1 / (item.vibRate ?? 5.5)}s` }} aria-hidden="true" />}
      {isSight(item) ? (
        <div className="sight-score">
          <NotesView midis={shownTargets} keyPc={pc(sightKeyName(item, shownTargets[0]))} settings={settings} durs={item.durs} clef={item.more?.clef ?? (range.low <= 45 ? 'bass' : undefined)} now={pulseNow} />
          <div className="pulse-wrap compact">
            <PulseNotes clock={pulseClock} count={0} labels={null} beatOnly />
            <small className="field-hint">♩ = {item.bpm ?? 72}</small>
            <button className={`chip pn-click${clickOn ? ' on' : ''}`} aria-pressed={clickOn} onClick={() => (setClickOn(!clickOn), saveClick(!clickOn))}>
            <Icon k="metronome" /> {settings.uiLang === 'en' ? 'Click' : 'קליק'}
          </button>
          </div>
        </div>
      ) : pulse && phase !== 'result' ? null : (
      <p className="vocal-targets" dir="ltr">
        {visible.map((m) => (Math.abs(m - Math.round(m)) > 0.2 ? `${noteLabel(Math.ceil(m), settings)}¼↓` : noteLabel(m, settings))).join(' – ')}
      </p>
      )}
      {pulse && phase !== 'result' && !isSight(item) && (
        <div className="pulse-wrap">
          <PulseNotes clock={pulseClock} count={targets.length} labels={hiddenTask ? null : isSight(item) ? null : targets.map((m) => noteLabel(m, settings))} />
          <button className={`chip pn-click${clickOn ? ' on' : ''}`} aria-pressed={clickOn} onClick={() => (setClickOn(!clickOn), saveClick(!clickOn))}>
            <Icon k="metronome" /> {settings.uiLang === 'en' ? 'Click' : 'קליק'}
          </button>
        </div>
      )}
      {phase !== 'result' && (item.kind === 'hold' || item.kind === 'straight' || item.kind.startsWith('vibrato') || item.kind === 'messa' || item.kind === 'range' || item.kind === 'dynamic' || item.kind === 'breath-hold' || item.kind === 'fine-tune' || item.kind === 'edge') && (
        <div className="hold-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, ((sinceOnset ?? 0) / item.seconds) * 100)}%` }} />
          <small>{fill(t.vocalHoldFor, { s: item.seconds })}</small>
        </div>
      )}
      {cue && (
        <p className={`vocal-cue ${cue === t.vocalNowVibrato ? 'vib' : ''}`} aria-live="assertive">
          {cue}
        </p>
      )}
      <div className={phase === 'result' ? 'trace-compact' : undefined}>
      <PitchTrace frames={frames} targets={shownTargets} bands={hidden ? visible : undefined} seconds={item.seconds} label={`${visible.map((m) => noteLabel(m, settings)).join(' – ')}`} />
      </div>
      {item.reference === 'during' && (
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={headphones}
            onChange={(e) => {
              setHeadphones(e.target.checked);
              try {
                localStorage.setItem('toneturn.headphones', e.target.checked ? '1' : '0');
              } catch {
                /* private mode */
              }
            }}
          />
          <span><Icon k="phones" /> {t.vocalHeadphones}</span>
        </label>
      )}

      {phase === 'result' && grade && (
        <section className="take-card" aria-live="polite">
          {grade.unclear ? (
            <p>{t.vocalUnclear}</p>
          ) : (
            <>
              <div className="take-score">
                {t.vocalScore}: <b>{Math.round(grade.score * 100)}%</b>
              </div>
              <MetricBars t={t} g={grade} />
              {grade.chordMade && <p className="take-remark">{fill(t.barryMade, { chord: `${pcLabel(grade.chordMade.root)}${grade.chordMade.kind === 'dom7' ? '7' : 'm6'}` })}</p>}
              {item.bh?.mode === 'free' && !grade.chordMade && <p className="take-remark">{t.barryNotHalfStep}</p>}
              {remarkLine && <p className="take-remark"><Icon k="target" /> {remarkLine}</p>}
              {tipKey && <p className="take-tip"><Icon k="tip" /> {t.vocalTips[tipKey]}</p>}
              {memoryItem(item) && refs > 0 && <p className="field-hint"><Icon k="repeat" /> {fill(t.refCost, { n: refs, p: Math.round((1 - memoryFactor(refs)) * 100) })}</p>}
            </>
          )}
          {audioUrl && (
            <div className="listen-back">
              <span>{t.vocalListenBack}</span>
              <audio controls src={audioUrl} />
            </div>
          )}
        </section>
      )}

      <div className="vocal-actions">
        {phase === 'ready' && (
          <button className="btn mega" onClick={() => void take()}>
            {isInstrument(settings) ? t.playNow : <><Icon k="mic" /> {t.vocalSing}</>}
          </button>
        )}
        {phase === 'calibrating' && <p className="vocal-cue">{t.gateWait}</p>}
        {memoryItem(item) && phase !== 'calibrating' && (
          <button
            className="btn ghost"
            onClick={() => {
              const start = earReplayNote(item, shownTargets);
              void piano.play([{ midi: start, start: 0, duration: 1.1, velocity: 0.7 }], 1.3, new AbortController().signal).catch(() => {});
              if (phase === 'singing' && captureT0.current !== null) {
                const at = (performance.now() - captureT0.current) / 1000;
                refWindows.current.push([at - 0.05, at + 1.6]);
              }
              refsRef.current += 1;
              setRefs(refsRef.current);
            }}
          >
            <Icon k="repeat" /> {t.refAgain}
            {refs > 0 && ` (${refs})`}
          </button>
        )}
        {(phase === 'listening' || phase === 'singing' || phase === 'calibrating') && (
          <button
            className="btn mega ghost"
            onClick={() => {
              stopped.current = phase === 'singing';
              ctl.current?.abort();
            }}
          >
            ■ {phase === 'listening' ? `${t.vocalListen}…` : t.vocalStop}
          </button>
        )}
        {phase === 'result' && test && (
          <>
            {grade?.unclear && (
              <button className="btn ghost" onClick={() => void take()}>
                ↻ {t.vocalRetry}
              </button>
            )}
            <button className="btn mega" onClick={() => test.onTake(!grade || grade.unclear ? 0 : grade.score, typeof level === 'number' ? levelDef(level).pass : 0.7)}>
              {t.vocalNext} <span className="flip-rtl">→</span>
            </button>
          </>
        )}
        {phase === 'result' && !test && (
          <>
            <button className="btn ghost" onClick={() => void take()}>
              ↻ {t.vocalRetry}
            </button>
            <button className="btn mega" onClick={next}>
              {i === items.length - 1 && noteIdx === noteCount - 1 ? t.vocalDone : t.vocalNext} <span className="flip-rtl">→</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const PCN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const pcLabel = (pc: number) => PCN[((pc % 12) + 12) % 12];

/** Barry Harris singing instructions with the real chord names (spec T.2). */
function barryInstruction(item: VocalItem, target: number, t: Strings, settings: Settings): string {
  const bh = item.bh!;
  void settings;
  if (bh.mode === 'six') return t.barrySixNotes;
  if (bh.mode === 'dim') return t.barryDimNotes;
  if (bh.mode === 'chromatic') return t.barryChromatic;
  if (bh.mode === 'free') return t.barryFree;
  if (bh.mode === 'resolve') return t.barryResolve;
  const chord = `${pcLabel(target + (bh.rootOffset ?? 0))}${bh.kind === 'dom7' ? '7' : 'm6'}`;
  if (bh.mode === 'name') return fill(t.barryMakeIt, { chord });
  return fill(bh.dir === 'down' ? t.barryLowerDeg : t.barryRaiseDeg, { n: t.ordinals[(bh.degree ?? 1) - 1], chord });
}

/** What the app plays with a harmony line: the melody, or a chord under each sung note. */
function lineAccompaniment(acc: number[], chords: number[][] | null, beat: number) {
  if (chords) return chords.flatMap((ch, k) => ch.map((m) => ({ midi: m, start: k * beat, duration: beat * 0.95, velocity: 0.5 })));
  return acc.map((m, k) => ({ midi: m, start: k * beat, duration: beat * 0.95, velocity: 0.55 }));
}

/** The whole semitone a free-choice take settled on (median pitch), or null. */
function chosenMidi(frames: SungFrame[]): number | null {
  const ms = frames.filter((f) => f.hz && f.confidence >= 0.8).map((f) => hzToMidi(f.hz!)).sort((a, b) => a - b);
  return ms.length ? Math.round(ms[ms.length >> 1]) : null;
}
