// Vocal technique (spec addendum P): range calibration, the 10-level ladder, the daily warm-up, a live
// pitch trace, per-take metric cards with a tip and listen-back, the range map and per-metric trends.

import { Icon } from './icons';
import { vocalTags } from '../engine/taxonomy';
import type { SkillId } from '../engine/lesson';
import { useMiniGate } from './MiniLesson';
import { vocalUnit } from '../content/units';
import { NotesView } from './NotesView';
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
  LADDER,
  synthVibratoPhrase,
  vibratoConsistency,
  MODE_LEVELS,
  HARMONY_LEVELS,
  BARRY_LEVELS,
  SIGHT_LEVELS,
  sightKeyName,
  ORNAMENT_LEVELS,
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
export const levelDef = (level: number) => (level > ORNAMENT_BASE ? ORNAMENT_LEVELS[level - ORNAMENT_BASE - 1] : level > SIGHT_BASE ? SIGHT_LEVELS[level - SIGHT_BASE - 1] : level > BARRY_BASE ? BARRY_LEVELS[level - BARRY_BASE - 1] : level > HARMONY_BASE ? HARMONY_LEVELS[level - HARMONY_BASE - 1] : level > MODES_BASE ? MODE_LEVELS[level - MODES_BASE - 1] : LADDER[level - 1]);

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
  const shown = [...g.metrics].sort((a, b) => b.weight - a.weight).filter((m, i, a) => a.findIndex((x) => x.key === m.key) === i).slice(0, 4);
  return (
    <ul className="metric-bars">
      {shown.map((m) => (
        <li key={m.key} className={m.score >= 0.8 ? 'good' : m.score >= 0.5 ? 'fair' : 'weak'}>
          <span className="metric-name">{t.metricNames[m.key] ?? m.key}</span>
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

/** The reference: what the app plays before (or under) the take. */
function referenceEvents(item: VocalItem, targets: number[]): { events: NoteEvent[]; length: number } {
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
    const beat = 60 / (item.bpm ?? 72);
    const tonic = targets[0] - (item.steps?.[0] ?? 0);
    const clicks = [0, 1, 2, 3].map((k) => ({ midi: k === 0 ? 96 : 91, start: 1.4 + k * beat, duration: 0.06, velocity: 0.5 }));
    return { events: [{ midi: tonic, start: 0, duration: 1.2, velocity: 0.75 }, ...clicks], length: 1.4 + 4 * beat };
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
  | { kind: 'session'; level: number | 'warmup'; items: VocalItem[] };

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
}

export function VocalScreen({ t, settings, progress, onSettings, onProgress, onBack, onRuns, onSingAlong, startWarmup, startLevel }: Props) {
  const gate = useMiniGate();
  const v = progress.vocal ?? { best: {}, passed: [], takes: [] };
  const [view, setView] = useState<View>(() => (startLevel && levelDef(startLevel) ? { kind: 'session', level: startLevel, items: levelDef(startLevel).items.filter((it) => itemFits(it, settings.voiceRange ?? DEFAULT_RANGE)) } : startWarmup ? { kind: 'session', level: 'warmup', items: warmupItems(v.passed).filter((it) => itemFits(it, range)) } : { kind: 'home' }));
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const style: VibratoStyle = settings.vibratoStyle ?? 'pop';

  if (view.kind === 'range')
    return <RangeCalibration t={t} settings={settings} onDone={(r) => (r && onSettings({ voiceRange: r }), setView({ kind: 'home' }))} />;
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

  const unlocked = (lv: number) => lv === 1 || v.passed.includes(lv - 1);
  const levelBest = (lv: number) => {
    const items = LADDER[lv - 1]?.items ?? [];
    return items.length ? items.reduce((a, it) => a + (v.best[it.id] ?? 0), 0) / items.length : 0;
  };
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

      <ol className="vocal-levels">
        {Array.from({ length: VOCAL_TOP_LEVEL }, (_, i) => i + 1).map((lv) => {
          const open = unlocked(lv);
          const passed = v.passed.includes(lv);
          const best = levelBest(lv);
          return (
            <li key={lv}>
              <button
                className={`vocal-level ${passed ? 'passed' : ''} ${open ? '' : 'locked'}`}
                disabled={!open}
                onClick={() => (lv === VOCAL_TOP_LEVEL ? onRuns() : gate(vocalUnit(lv), () => setView({ kind: 'session', level: lv, items: LADDER[lv - 1].items.filter((it) => itemFits(it, range)) })))}
              >
                <span className="lv-num">{lv}</span>
                <span className="lv-text">
                  <b>{t.vocalLevelNames[lv - 1]}</b>
                  <small>{passed ? `✓ ${t.vocalPassed}` : !open ? <><Icon k="lock" /> {t.vocalLocked}</> : best > 0 ? `${Math.round(best * 100)}%` : fill(t.vocalLevel, { n: lv })}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <section className="set-card">
        <h2>{t.modesTitle}</h2>
        <p className="field-hint">{t.modesBlurb}</p>
        <ol className="vocal-levels">
          {MODE_LEVELS.map((lvDef, i) => {
            const lv = MODES_BASE + i + 1;
            const open = i === 0 || v.passed.includes(lv - 1);
            const passed = v.passed.includes(lv);
            const best = lvDef.items.reduce((a, it) => a + (v.best[it.id] ?? 0), 0) / lvDef.items.length;
            return (
              <li key={lv}>
                <button className={`vocal-level ${passed ? 'passed' : ''} ${open ? '' : 'locked'}`} disabled={!open} onClick={() => gate(vocalUnit(lv), () => setView({ kind: 'session', level: lv, items: lvDef.items.filter((it) => itemFits(it, range)) }))}>
                  <span className="lv-num">{i + 1}</span>
                  <span className="lv-text">
                    <b>{t.modesLevelNames[i]}</b>
                    <small>{passed ? `✓ ${t.vocalPassed}` : !open ? <><Icon k="lock" /> {t.vocalLocked}</> : best > 0 ? `${Math.round(best * 100)}%` : fill(t.vocalLevel, { n: i + 1 })}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="set-card">
        <h2>{t.ornTitle}</h2>
        <p className="field-hint">{t.ornBlurb}</p>
        <ol className="vocal-levels">
          {ORNAMENT_LEVELS.map((lvDef, i) => {
            const lv = ORNAMENT_BASE + i + 1;
            const open = i === 0 || v.passed.includes(lv - 1);
            const passed = v.passed.includes(lv);
            return (
              <li key={lv}>
                <button className={`vocal-level ${passed ? 'passed' : ''} ${open ? '' : 'locked'}`} disabled={!open} data-orn={i + 1} onClick={() => gate(vocalUnit(lv), () => setView({ kind: 'session', level: lv, items: lvDef.items.filter((it) => itemFits(it, range)) }))}>
                  <span className="lv-num">{i + 1}</span>
                  <span className="lv-text">
                    <b>{t.ornLevelNames[i]}</b>
                    <small>{passed ? `✓ ${t.vocalPassed}` : !open ? <><Icon k="lock" /> {t.vocalLocked}</> : fill(t.vocalLevel, { n: i + 1 })}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="set-card">
        <h2>{t.sightTitle}</h2>
        <p className="field-hint">{t.sightBlurb}</p>
        <ol className="vocal-levels">
          {SIGHT_LEVELS.map((lvDef, i) => {
            const lv = SIGHT_BASE + i + 1;
            const open = i === 0 || v.passed.includes(lv - 1);
            const passed = v.passed.includes(lv);
            return (
              <li key={lv}>
                <button className={`vocal-level ${passed ? 'passed' : ''} ${open ? '' : 'locked'}`} disabled={!open} data-sight={i + 1} onClick={() => gate(vocalUnit(lv), () => setView({ kind: 'session', level: lv, items: lvDef.items.filter((it) => itemFits(it, range)) }))}>
                  <span className="lv-num">{i + 1}</span>
                  <span className="lv-text">
                    <b>{t.sightLevelNames[i]}</b>
                    <small>{passed ? `✓ ${t.vocalPassed}` : !open ? <><Icon k="lock" /> {t.vocalLocked}</> : fill(t.vocalLevel, { n: i + 1 })}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="set-card">
        <h2>{t.barryTitle}</h2>
        <p className="field-hint">{t.barryBlurb}</p>
        <ol className="vocal-levels">
          {BARRY_LEVELS.map((lvDef, i) => {
            const lv = BARRY_BASE + i + 1;
            const open = i === 0 || v.passed.includes(lv - 1);
            const passed = v.passed.includes(lv);
            return (
              <li key={lv}>
                <button className={`vocal-level ${passed ? 'passed' : ''} ${open ? '' : 'locked'}`} disabled={!open} onClick={() => gate(vocalUnit(lv), () => setView({ kind: 'session', level: lv, items: lvDef.items.filter((it) => itemFits(it, range)) }))}>
                  <span className="lv-num">{i + 1}</span>
                  <span className="lv-text">
                    <b>{t.barryLevelNames[i]}</b>
                    <small>{passed ? `✓ ${t.vocalPassed}` : !open ? <><Icon k="lock" /> {t.vocalLocked}</> : fill(t.vocalLevel, { n: i + 1 })}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="set-card">
        <h2>{t.harmonyTitle}</h2>
        <p className="field-hint">{t.harmonyBlurb}</p>
        <ol className="vocal-levels">
          {HARMONY_LEVELS.map((lvDef, i) => {
            const lv = HARMONY_BASE + i + 1;
            const open = i === 0 || v.passed.includes(lv - 1);
            const passed = v.passed.includes(lv);
            return (
              <li key={lv}>
                <button className={`vocal-level ${passed ? 'passed' : ''} ${open ? '' : 'locked'}`} disabled={!open} onClick={() => gate(vocalUnit(lv), () => setView({ kind: 'session', level: lv, items: lvDef.items.filter((it) => itemFits(it, range)) }))}>
                  <span className="lv-num">{i + 1}</span>
                  <span className="lv-text">
                    <b>{t.harmonyLevelNames[i]}</b>
                    <small>{passed ? `✓ ${t.vocalPassed}` : !open ? <><Icon k="lock" /> {t.vocalLocked}</> : <><Icon k="phones" /> {t.headphonesNeeded}</>}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

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
}: {
  t: Strings;
  settings: Settings;
  range: VoiceRange;
  style: VibratoStyle;
  level: number | 'warmup';
  items: VocalItem[];
  onExit: () => void;
  onProgress: (p: Progress) => void;
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
  const [headphones, setHeadphones] = useState(() => {
    try {
      return localStorage.getItem('toneturn.headphones') === '1';
    } catch {
      return false;
    }
  });
  const best = useRef<Record<string, { score: number; take: VocalTake }>>(saved?.best ?? {});
  useEffect(() => {
    if (i === 0 && noteIdx === 0) return;
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
    await piano.unlock();
    const ref = referenceEvents(item, shownTargets);
    setPhase('listening');
    const acc = itemAccompaniment(item, range);
    const chordsAbs = item.chords ? item.chords.map((ch) => ch.map((x) => targets[0] - (item.steps?.[0] ?? 0) + x)) : null;
    const melodic = ['melody', 'leap', 'rhythmic', 'staccato', 'glide', 'harmony-line', 'sight'].includes(item.kind);
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
        if (item.reference === 'during' && !headphones && !item.kind.startsWith('harmony')) piano.stopDrone();
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
      else await piano.play(ref.events, ref.length, c.signal).catch(() => {});
      if (c.signal.aborted) {
        piano.stopDrone();
        setPhase('ready');
        return;
      }
      setPhase('singing');
      startTicking();
      captureT0.current = performance.now();
      if (SIMULATED) {
        const sim = simulatedFrames(item, targets, noteIdx);
        for (const f of sim) keep(f);
        await new Promise((r) => setTimeout(r, 300));
        got = sim;
      } else {
        const r = await new BrowserPitchCapture().sing({
          signal: c.signal,
          maxMs: (item.seconds + 4) * 1000,
          silenceMs: 6000,
          endSilenceMs: melodic ? (item.kind === 'staccato' ? 1200 : 900) : 700,
          hopMs: 20,
          record: true,
          onFrame: keep,
        });
        if (r.kind === 'frames') {
          got = r.frames;
          audio = r.audio;
        } else if (r.kind === 'aborted') {
          if (!stopped.current) {
            clearInterval(tick);
            piano.stopDrone();
            return;
          }
          got = buf; // "Stop": grade what was sung so far
        }
      }
    }
    clearInterval(tick);
    piano.stopDrone();
    setFrames(got ?? []);
    const g = got ? gradeTake(item, got, range, style, noteIdx) : { unclear: true, score: 0, metrics: [], weakest: null };
    setGrade(g);
    if (audio) setAudioUrl(URL.createObjectURL(audio));
    if (audio && settings.keepTakes && !g.unclear) void keepTake({ item: item.kind === 'range' || item.kind === 'vibrato-register' ? `${item.id}#${noteIdx}` : item.id, week: weekId(new Date()), score: g.score, at: new Date().toISOString(), blob: audio });
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
      lessonId: typeof level === 'number' ? (level > ORNAMENT_BASE ? `vocal-orn-${level - ORNAMENT_BASE}` : level > SIGHT_BASE ? `vocal-sight-${level - SIGHT_BASE}` : level > BARRY_BASE ? `vocal-barry-${level - BARRY_BASE}` : level > HARMONY_BASE ? `vocal-harmony-${level - HARMONY_BASE}` : level > MODES_BASE ? `vocal-modes-${level - MODES_BASE}` : `vocal-${level}`) : 'vocal-warmup',
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
        ...rated.map((x) => ({ id: `${sessionId}:${x.it.id}`, skill: (typeof level === 'number' && level > SIGHT_BASE && level < ORNAMENT_BASE ? 'sight' : typeof level === 'number' && level > HARMONY_BASE && level < BARRY_BASE ? 'singing' : 'technique') as SkillId, difficulty: x.it.difficulty, correct: x.score >= 0.6, tag: `vocal:${x.it.id}`, score: x.score, m: best.current[x.it.id]?.take.m, tags: vocalTags((typeof level === 'number' && level > SIGHT_BASE && level < ORNAMENT_BASE ? 'sight' : typeof level === 'number' && level > HARMONY_BASE && level < BARRY_BASE ? 'singing' : 'technique') as SkillId, x.it.kind, typeof level === 'number' && level > ORNAMENT_BASE) })),
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
  const hidden = item.kind === 'scale' && item.scale?.hear === 'tonic' && phase !== 'result';
  const title = level === 'warmup' ? t.vocalWarmup : level > ORNAMENT_BASE ? `${t.ornTitle} · ${t.ornLevelNames[level - ORNAMENT_BASE - 1]}` : level > SIGHT_BASE ? `${t.sightTitle} · ${t.sightLevelNames[level - SIGHT_BASE - 1]}` : level > BARRY_BASE ? `${t.barryTitle} · ${t.barryLevelNames[level - BARRY_BASE - 1]}` : level > HARMONY_BASE ? `${t.harmonyTitle} · ${t.harmonyLevelNames[level - HARMONY_BASE - 1]}` : level > MODES_BASE ? `${t.modesTitle} · ${t.modesLevelNames[level - MODES_BASE - 1]}` : `${fill(t.vocalLevel, { n: level })} · ${t.vocalLevelNames[level - 1]}`;

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
        <h1>{title}</h1>
      </header>
      <p className="field-hint">
        {fill(t.vocalItemOf, { i: i + 1, n: items.length })}
        {noteCount > 1 && ` · ${fill(t.vocalNoteOf, { i: noteIdx + 1, n: noteCount })}`}
      </p>
      <p className="vocal-instr">
        {item.kind === 'scale' && item.scale
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
          : item.kind === 'harmony-hold' && item.accompany?.length === 1
            ? fill(item.accompany[0] < 0 ? t.holdIntervalAbove : t.holdIntervalBelow, { iv: t.intervalNames[String(Math.abs(item.accompany[0]))] ?? '' })
            : fill(t.vocalInstr[item.kind] ?? '', { s: item.seconds, on: item.cueOn ?? 2, off: item.cueOff ?? 5, rate: item.vibRate ?? '', width: item.vibWidth === 'wide' ? t.vocalWide : t.vocalNarrow })}
      </p>
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
          <NotesView midis={shownTargets} keyPc={pc(sightKeyName(item, shownTargets[0]))} settings={settings} durs={item.durs} />
          <small className="field-hint">♩ = {item.bpm ?? 72}</small>
        </div>
      ) : (
      <p className="vocal-targets" dir="ltr">
        {(hidden ? shownTargets.slice(0, 1) : shownTargets).map((m) => noteLabel(m, settings)).join(' – ')}
      </p>
      )}
      {(item.kind === 'hold' || item.kind === 'straight' || item.kind.startsWith('vibrato') || item.kind === 'messa' || item.kind === 'range' || item.kind === 'dynamic') && (
        <div className="hold-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, ((sinceOnset ?? (phase === 'result' ? item.seconds : 0)) / item.seconds) * 100)}%` }} />
          <small>{fill(t.vocalHoldFor, { s: item.seconds })}</small>
        </div>
      )}
      {cue && (
        <p className={`vocal-cue ${cue === t.vocalNowVibrato ? 'vib' : ''}`} aria-live="assertive">
          {cue}
        </p>
      )}
      <PitchTrace frames={frames} targets={shownTargets} bands={hidden ? shownTargets.slice(0, 1) : undefined} seconds={item.seconds} label={`${(hidden ? shownTargets.slice(0, 1) : shownTargets).map((m) => noteLabel(m, settings)).join(' – ')}`} />
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
              {grade.chordMade && <p className="take-remark">🎹 {fill(t.barryMade, { chord: `${pcLabel(grade.chordMade.root)}${grade.chordMade.kind === 'dom7' ? '7' : 'm6'}` })}</p>}
              {item.bh?.mode === 'free' && !grade.chordMade && <p className="take-remark">{t.barryNotHalfStep}</p>}
              {remarkLine && <p className="take-remark"><Icon k="target" /> {remarkLine}</p>}
              {tipKey && <p className="take-tip"><Icon k="tip" /> {t.vocalTips[tipKey]}</p>}
              <NotesView midis={shownTargets} keyPc={null} settings={settings} />
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
        {phase === 'calibrating' && <p className="vocal-cue">🤫 {t.gateWait}</p>}
        {memoryItem(item) && phase !== 'calibrating' && (
          <button
            className="btn ghost"
            onClick={() => {
              const start = shownTargets[0];
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
        {phase === 'result' && (
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
