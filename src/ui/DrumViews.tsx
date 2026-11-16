// Drums course screens (0.65, DRUMS_CURRICULUM §6): the drill on a percussion staff (standard voice positions, x note
// heads for cymbals, accents, ghost notes in brackets, open hat "o", sticking under single-surface lines) or as lanes;
// the kit connect & mapping wizard (detect the e-kit, hit each pad, the hi-hat pedal range, soft / loud strokes, the
// latency, a headphones / Bluetooth warning) and the practice-pad (microphone) mode. The kit, staff and lanes stay LTR.

import { useEffect, useRef, useState } from 'react';
import type { Drill, DrumVoice, ExpNote, TakeMetrics } from '../engine/drills/types';
import { markOf, tickLen, type NoteMark } from '../engine/noteMarks';
import type { LiveTake } from '../engine/drills/liveGrade';
import { barsPerLine, beamBeats, dotted, eighthGroupOf, restsOf, type RestKind } from '../engine/drumNotation';
import { calibrateVel, classOf, DEFAULT_KIT, kitKind, pedalRange, PRESETS, slowOutput, voiceOf, VOICE_NAME, wizardDone, wizardHit, wizardSkip, wizardStart, WIZARD_PADS, QUICK_PADS, type WizardPad, type AcousticCal, type AcousticVoice, type KitKind, type KitPreset, type KitProfile, type WizardState, KIT_NOTICE } from '../engine/drumKit';
import { buildCal, CAL_HITS, CAL_ORDER, OnsetTracker } from '../engine/drumAcoustic';
import { midi } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { DOMAIN_COLOR, Glyph, type GlyphKind } from './Glyph';
import { LatencyCalibrate, type LatencyValues } from './LatencyCalibrate';
import { useLineWindow } from './DrillTake';
import { beamGroupAt, hasTimeline, staffLines, timeMapOf } from '../engine/drills/timeline';
import { expandForm } from '../engine/drills/roadmap';
import { SECTION_HE, sectionName } from '../engine/drills/drumSong';

type Lang = 'he' | 'en';

/** Staff step of each voice (half-spaces above the bottom line; standard drum key). */
const STEP: Record<DrumVoice, number> = { hhPedal: -1, kick: 1, tom3: 3, snare: 5, rim: 5, tom2: 6, tom1: 7, ride: 8, hihat: 9, hhOpen: 9, crash: 10 };
const XHEAD = new Set<DrumVoice>(['hihat', 'hhOpen', 'ride', 'crash', 'hhPedal']);
const isFoot = (v: DrumVoice) => v === 'kick' || v === 'hhPedal';
/** The glyph of a pad (wizard, lanes). */
export const PAD_GLYPH: Record<DrumVoice, GlyphKind> = { kick: 'kick', snare: 'snare', rim: 'snare', hihat: 'hihat', hhOpen: 'hihat', hhPedal: 'hihat', ride: 'cymbal', crash: 'cymbal', tom1: 'toms', tom2: 'toms', tom3: 'toms' };

const noteKey = (n: ExpNote) => `${n.voice}:${n.beat}`;

/** Each marked hit's offset (ms) and the window, for the early / late tick (COURSE-FEEDBACK-UI §4.1). */
const DEVS = new WeakMap<Map<string, NoteMark>, { dev: Map<string, number | null>; win: number }>();
function marksOf(result?: TakeMetrics | null, live?: LiveTake | null): Map<string, NoteMark> {
  const out = new Map<string, NoteMark>();
  const dev = new Map<string, number | null>();
  // Slice 5: while the take runs, the settled hits (the same rule and window as the review).
  const w = result ? (result.drum?.windowMs ?? 40) : (live?.win ?? 40);
  for (const r of result ? result.perNote : (live?.perNote ?? [])) {
    out.set(noteKey(r.exp), markOf(r, w));
    dev.set(noteKey(r.exp), r.dev);
  }
  DEVS.set(out, { dev, win: w });
  return out;
}
/** The timing tick beside a head at (x, y): tangerine on the left (early), purple on the right (late). */
function Tick({ marks, k, x, y, edge, prior = false }: { marks: Map<string, NoteMark>; k: string; x: number; y: number; edge: number; /** The last take's tick (faded, drawn under this take's). */ prior?: boolean }) {
  const m = marks.get(k);
  if (m !== 'early' && m !== 'late') return null;
  const d = DEVS.get(marks);
  const len = tickLen(d?.dev.get(k) ?? 0, d?.win ?? 40);
  return <rect x={m === 'early' ? x - edge - len : x + edge} y={y - 1.6} width={len} height={3.2} rx={1.1} className={`mk-tick ${m} ${prior ? 'dn-prior' : ''}`} data-prior={prior ? 1 : undefined} />;
}
/** The count-in cue on a drum head (§4.1): a pulse once, or a static outline with reduced motion. */
function DrumCue({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g className="mk-cue" data-cue="1">
      <circle cx={x} cy={y} r={r * 1.7} className="dn-cue dn-cue-ring" />
      <circle cx={x} cy={y} r={r + 1.5} className="dn-cue dn-cue-pulse" />
    </g>
  );
}

/** One line of the score: its drill-beat range and bars (a time signature where it changes, beam groups for x/8 bars). */
interface LineGeo {
  from: number;
  to: number;
  bars: { from: number; len: number; index: number; sig?: string; groups?: number[] }[];
}
/**
 * The score's lines. Constant-meter drills: `bars` bars a line, as before. Timeline drills (mixed meters, a tempo map,
 * songs): whole bars up to two 4/4 bars a line (one when dense), a signature where the meter changes.
 */
function scoreLines(drill: Drill, bars: 1 | 2): LineGeo[] {
  if (!hasTimeline(drill)) {
    const meter = drill.meter || 4;
    const per = meter * bars;
    const n = Math.max(1, Math.ceil(drill.beats / per - 1e-6));
    return Array.from({ length: n }, (_, li) => ({ from: li * per, to: (li + 1) * per, bars: Array.from({ length: bars }, (_, k) => ({ from: li * per + k * meter, len: meter, index: li * bars + k })) }));
  }
  const q = drill.pulse === 8 ? 0.5 : 1;
  const changes = (drill.meters?.length ?? 0) > 1;
  let index = 0;
  return staffLines(drill, bars === 1 ? 4 : 8).map((l) => ({
    from: l.from / q,
    to: l.to / q,
    bars: l.bars.map((b) => ({ from: b.from / q, len: b.len / q, index: index++, ...(b.sig && (changes || b.sig !== '4/4') ? { sig: b.sig } : {}), ...(b.groups ? { groups: b.groups.map((g) => g / q) } : {}) })),
  }));
}

/** A note as drawn: swung skip notes written straight (drum.swing8), tremolo strokes folded into one head. */
type ShownNote = ExpNote & { key: string; trem?: 1 | 2 | 3; hidden?: boolean };
function shownNotes(drill: Drill): ShownNote[] {
  const trem = drill.drum?.trem ?? [];
  return drill.notes.map((n) => {
    const key = noteKey(n);
    const t = trem.find((x) => n.beat >= x.beat - 1e-6 && n.beat < x.beat + x.dur - 1e-6);
    if (t) return Math.abs(n.beat - t.beat) < 1e-6 ? { ...n, key, dur: t.dur, trem: t.slashes } : { ...n, key, hidden: true };
    if (drill.drum?.swing8 && n.swing) return { ...n, key, beat: Math.floor(n.beat + 1e-6) + 0.5, dur: 0.5 };
    return { ...n, key };
  });
}

/** The drill's notes, two bars a line (one for dense rudiments), in a window of two lines that follows the take (B2, one screen). */
export function DrumScore({ drill, view, result, beat = -1, lang, live, cue = false, prior }: { drill: Drill; view: 'staff' | 'lanes'; result?: TakeMetrics | null; beat?: number; lang: Lang; /** Slice 5: the running take's settled hits. */ live?: LiveTake | null; /** The count-in is running: the first hit's head pulses. */ cue?: boolean; /** The last take of this item: its ticks, faded, under the review's. */ prior?: TakeMetrics | null }) {
  const meter = drill.meter || 4;
  // Eighth-pulse meters: a drill beat is an eighth — measure the density in quarters.
  const q = drill.pulse === 8 ? 0.5 : 1;
  // Slice 6 (§4.5): one bar a line on a phone, so the heads keep their size (≥ 9 px) and the spacing reads.
  const phone = typeof window !== 'undefined' && window.innerWidth < 400;
  const bars = view === 'staff' ? (phone ? 1 : barsPerLine(q === 1 ? drill.notes : drill.notes.map((n) => ({ beat: n.beat * q, voice: n.voice })), meter * q)) : 2;
  const geo = scoreLines(drill, bars);
  const lines = geo.length;
  const lineOf = (b: number) => Math.max(0, geo.findIndex((l) => b >= l.from - 1e-6 && b < l.to - 1e-6));
  const marks = marksOf(result, live);
  const pmarks = result && prior ? marksOf(prior) : null;
  const cueBeat = cue && !result && drill.notes.length ? Math.min(...drill.notes.map((n) => n.beat)) : null;
  const firstBad = result ? drill.notes.findIndex((n) => (marks.get(noteKey(n)) ?? 'ok') !== 'ok') : -1;
  // The window follows the line the take is in (lines may differ in length on a timeline drill).
  const { from, pager } = useLineWindow(lines, beat >= 0 ? lineOf(beat) : -1, 1, firstBad >= 0 ? lineOf(drill.notes[firstBad].beat) : 0);
  // The review needs the room (error map, chips): taller lanes show one line there, the pager pages the rest.
  const shown = Array.from({ length: Math.min(result && view === 'lanes' ? 1 : 2, lines - from) }, (_, i) => from + i);
  const notes = shownNotes(drill);
  return (
    <div className={`drum-score ${view}`} dir="ltr" data-drum-view={view} data-drum-lines={lines} data-drum-bars={bars}>
      {drill.form && <DrumRoadMap drill={drill} beat={beat} lang={lang} />}
      {shown.map((li) =>
        view === 'staff' ? <StaffLine key={li} lang={lang} drill={drill} notes={notes} line={li} geo={geo[li]} marks={marks} pmarks={pmarks} cueBeat={cueBeat} beat={beat} sticking={!!drill.drum?.mic || !!drill.drum?.sticking || drill.notes.some((n) => n.grace)} /> : <LaneLine key={li} drill={drill} line={li} geo={geo[li]} marks={marks} pmarks={pmarks} cueBeat={cueBeat} beat={beat} lang={lang} />,
      )}
      {pager}
      {view === 'lanes' && <LaneKey lang={lang} />}
    </div>
  );
}

/** Words of the road map's signs in Hebrew (the symbols stay). */
const signText = (s: string, lang: Lang): string => (lang === 'he' ? s.split(' ').map((w) => (w !== 'Coda' && SECTION_HE[w] ? SECTION_HE[w] : w)).join(' ') : s);

/**
 * The road map (DRUMS_NICHE_PLAN §2.2): one row of section blocks above the score. Live: the current section lit, the
 * next one cued one bar ahead ("→ Chorus"), the bar in the section. Written (road-map reading): the chart's signs and
 * the bar count only — the player follows the repeats, endings and D.S. on their own.
 */
export function DrumRoadMap({ drill, beat, lang }: { drill: Drill; beat: number; lang: Lang }) {
  const spans = expandForm(drill.form!, drill.pulse);
  const tm = timeMapOf(drill, 60);
  const bar = beat >= 0 ? tm.barAt(beat).index : -1;
  if (drill.drum?.roadmap === 'written') {
    const signs = drill.drum.chartSigns ?? spans.map((s) => `${s.name} ${s.bars}`);
    return (
      <div className="drum-road written" data-roadmap="written">
        {signs.map((s, i) => (
          <span key={i} className="road-sign" dir="ltr">
            {signText(s, lang)
              .split(' ')
              .map((w, j) => (
                <span key={j}>
                  {j ? ' ' : ''}
                  {/[א-ת]/.test(w) ? <bdi>{w}</bdi> : w}
                </span>
              ))}
          </span>
        ))}
        <b className="road-bar" aria-live="off">
          {bar >= 0 ? `${lang === 'he' ? 'תיבה' : 'Bar'} ${bar + 1}` : `${spans.reduce((a, s) => a + s.bars, 0)} ${lang === 'he' ? 'תיבות' : 'bars'}`}
        </b>
      </div>
    );
  }
  const k = bar >= 0 ? spans.findIndex((s) => bar >= s.startBar && bar < s.startBar + s.bars) : -1;
  const cur = k >= 0 ? spans[k] : null;
  const next = k >= 0 ? spans[k + 1] : null;
  const cue = cur && next && bar === cur.startBar + cur.bars - 1 ? next : null;
  return (
    <div className="drum-road" data-roadmap="live" data-road-section={cur?.name ?? ''}>
      {spans.map((s, i) => (
        <span key={i} className={`road-block ${i === k ? 'on' : ''} ${i < k ? 'past' : ''}`} style={{ flexGrow: Math.max(1, s.bars) }} dir={lang === 'he' ? 'rtl' : 'ltr'}>
          {sectionName(s.name, lang)}
          <small>{s.bars}</small>
        </span>
      ))}
      {cue ? (
        <b className="road-cue" data-road-cue={cue.name}>
          → {sectionName(cue.name, lang)}
        </b>
      ) : cur ? (
        <b className="road-bar">
          {bar - cur.startBar + 1}/{cur.bars}
        </b>
      ) : null}
    </div>
  );
}

const W = 340;
const X0 = 30;
const yOf = (step: number) => 60 - step * 4;

/** Gap-click drills (Time Lock, the gap-click drills): is this bar one of the silent ones (no click)? */
export const silentBar = (drill: Drill, bar: number): boolean => drill.click === 'gap' && !!drill.gap && bar % (drill.gap[0] + drill.gap[1]) >= drill.gap[0];

function StaffLine({ drill, notes, line, geo, marks, pmarks, cueBeat, beat, sticking, lang }: { drill: Drill; notes: ShownNote[]; line: number; geo: LineGeo; marks: Map<string, NoteMark>; pmarks?: Map<string, NoteMark> | null; cueBeat?: number | null; beat: number; sticking: boolean; lang: Lang }) {
  const b0 = geo.from;
  const per = geo.to - geo.from;
  const repeat = new Set(drill.drum?.repeatBars ?? []);
  const rests = drill.drum?.mbRests ?? [];
  const inRest = (bi: number) => rests.some((r) => bi >= r.bar && bi < r.bar + r.n);
  const barOf = (b: number) => geo.bars.find((x) => b >= x.from - 1e-6 && b < x.from + x.len - 1e-6);
  const ns = notes.filter((n) => n.beat >= b0 - 1e-6 && n.beat < b0 + per - 1e-6 && n.voice && !n.hidden && !(barOf(n.beat) && repeat.has(barOf(n.beat)!.index)));
  const xOf = (b: number) => X0 + 10 + ((b - b0) / per) * (W - X0 - 8 - 14);
  const xBar = (b: number) => X0 - 4 + ((b - b0) / per) * (W - X0);
  // Onsets → stems: hands up, feet down.
  const groups = new Map<string, ShownNote[]>();
  for (const n of ns) {
    const k = `${isFoot(n.voice!) ? 'd' : 'u'}:${n.beat}`;
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }
  const stems: { x: number; y1: number; y2: number; up: boolean; beat: number; dur: number; trem?: 1 | 2 | 3 }[] = [];
  for (const [k, g] of groups) {
    const up = k.startsWith('u');
    const ys = g.map((n) => yOf(STEP[n.voice!]));
    const x = xOf(g[0].beat) + (up ? 4.5 : -4.5);
    const dur = Math.min(...g.map((n) => n.dur));
    const trem = g.find((n) => n.trem)?.trem;
    stems.push(up ? { x, y1: Math.max(...ys), y2: Math.min(10, Math.min(...ys) - 20), up, beat: g[0].beat, dur, trem } : { x, y1: Math.min(...ys), y2: Math.max(...ys) + 20, up, beat: g[0].beat, dur, trem });
  }
  // Beams per beat (drumNotation): a primary beam over the 8ths and shorter, a second beam only between 16ths (a stub for
  // a lone one), a flag for a lone short note, 3 / 5 / 6 under a bracket over tuplets; quarters and longer stand alone.
  // Eighth-pulse meters (one drill beat = an eighth) are beamed in quarter-note units by their beat groups (9/8 =
  // 2+2+2+3); timeline drills by each bar's own groups.
  const q8 = drill.pulse === 8 ? 0.5 : 1;
  const groupOf = hasTimeline(drill) ? (x: number) => beamGroupAt(drill, x) : drill.pulse === 8 ? eighthGroupOf(drill.meter, drill.groups ?? [drill.meter]) : undefined;
  const beams: React.ReactNode[] = [];
  for (const up of [true, false]) {
    const ss = stems.filter((x) => x.up === up && !x.trem);
    for (const g of beamBeats(q8 === 1 ? ss : ss.map((x) => ({ beat: x.beat * q8, dur: x.dur * q8 })), groupOf)) {
      const m = g.idx.map((i) => ss[i]);
      const y = up ? Math.min(...m.map((s) => s.y2)) : Math.max(...m.map((s) => s.y2));
      for (const s of m) s.y2 = y;
      const key = `${up}${m[0].beat}`;
      const dy = up ? 4 : -4;
      if (g.flag) {
        const s = m[0];
        for (let k = 0; k < g.flag; k++) beams.push(<path key={`f${key}${k}`} d={up ? `M${s.x} ${y + k * dy} q 6 6 7 14` : `M${s.x} ${y + k * dy} q 6 -6 7 -14`} className="dn-flag" />);
      } else {
        beams.push(<line key={`b${key}`} x1={m[0].x} x2={m[m.length - 1].x} y1={y} y2={y} className="dn-beam" />);
        for (const [a, b] of g.second) beams.push(<line key={`b2${key}${a}`} x1={m[a].x} x2={m[b].x} y1={y + dy} y2={y + dy} className="dn-beam" />);
        for (const st of g.stubs) beams.push(<line key={`bs${key}${st.at}`} x1={m[st.at].x} x2={m[st.at].x + st.dir * 6} y1={y + dy} y2={y + dy} className="dn-beam" />);
      }
      if (g.tuplet) {
        // The tuplet number in a bracket over (under) its notes.
        const xa = m[g.tuplet.from].x - 2;
        const xb = m[g.tuplet.to].x + 2;
        const yb = up ? y - 6 : y + 6;
        const mid = (xa + xb) / 2;
        beams.push(<path key={`tb${key}`} d={up ? `M${xa} ${yb + 3}V${yb}H${mid - 4}M${mid + 4} ${yb}H${xb}V${yb + 3}` : `M${xa} ${yb - 3}V${yb}H${mid - 4}M${mid + 4} ${yb}H${xb}V${yb - 3}`} className="dn-stem dn-tup-br" />);
        beams.push(<text key={`t${key}`} x={mid} y={up ? yb + 3 : yb + 3} className="dn-tup" textAnchor="middle" data-tuplet={g.tuplet.n}>{g.tuplet.n}</text>);
      }
    }
  }
  // Tremolo slashes across the stem (one written head for the strokes).
  for (const s of stems.filter((x) => x.trem)) {
    const ym = (s.y1 + s.y2) / 2;
    for (let k = 0; k < s.trem!; k++) beams.push(<line key={`tr${s.beat}${k}`} x1={s.x - 4} x2={s.x + 4} y1={ym + 3 + k * 4 - 1} y2={ym - 1 + k * 4 - 1} className="dn-beam dn-trem" data-trem={s.trem} />);
  }
  // Rests for a one-voice line (reading, rudiments): whatever no note covers, on the 16th grid (not in repeat or
  // multi-bar-rest bars: those have their own signs).
  const REST: Record<RestKind, string> = { q: '\u{1D13D}', '8': '\u{1D13E}', '16': '\u{1D13F}' };
  const restMarks: React.ReactNode[] =
    q8 === 1 && ns.every((n) => n.voice === 'snare') && !drill.drum?.trem
      ? restsOf(drill.notes.filter((n) => n.voice === 'snare'), b0, b0 + per)
          .filter((r) => {
            const bb = barOf(r.beat);
            return !bb || (!inRest(bb.index) && !repeat.has(bb.index));
          })
          .map((r) => (
            <text key={`r${r.beat}`} x={xOf(r.beat)} y={r.kind === 'q' ? 47 : 44} className="dn-rest" textAnchor="middle" data-rest={r.kind}>
              {REST[r.kind]}
            </text>
          ))
      : [];
  // Repeat-bar signs and multi-bar rests.
  const signs: React.ReactNode[] = [];
  for (const b of geo.bars) {
    const xm = (xBar(b.from) + xBar(b.from + b.len)) / 2;
    if (repeat.has(b.index))
      signs.push(
        <g key={`rp${b.index}`} className="dn-repeat" data-repeat-bar={b.index}>
          <path d={`M${xm - 7} 50L${xm + 7} 38`} className="dn-beam" />
          <circle cx={xm - 6} cy={40} r={1.8} className="dn-head" />
          <circle cx={xm + 6} cy={48} r={1.8} className="dn-head" />
        </g>,
      );
    const r = rests.find((x) => x.bar === b.index);
    if (r) {
      const end = geo.bars.find((x) => x.index === r.bar + r.n - 1) ?? b;
      const xa = xBar(b.from) + 8;
      const xb = xBar(end.from + end.len) - 8;
      signs.push(
        <g key={`mr${b.index}`} className="dn-mbrest" data-mb-rest={r.n}>
          <path d={`M${xa} 40V48M${xb} 40V48`} className="dn-stem" />
          <line x1={xa} x2={xb} y1={44} y2={44} className="dn-beam" strokeWidth={5} />
          <text x={(xa + xb) / 2} y={24} className="dn-sig" textAnchor="middle">
            {r.n}
          </text>
        </g>,
      );
    }
  }
  let lastDyn: string | undefined;
  const cursor = beat >= b0 && beat < b0 + per ? xOf(beat) : null;
  const groupSizes = (b: LineGeo['bars'][number]) => (b.groups ?? []).map((g, i, xs) => (xs[i + 1] ?? b.len) - g);
  const constSig = line === 0 && !hasTimeline(drill) && (drill.pulse === 8 || drill.meter !== 4);
  // Signatures and the swing marking sit in a strip above the staff (clear of the beams and accents).
  const top = constSig || (line === 0 && drill.drum?.swing8) || (hasTimeline(drill) && geo.bars.some((b) => b.sig)) ? 12 : 0;
  return (
    <svg className="drum-staff" viewBox={`0 ${-top} ${W} ${92 + top}`} role="img" aria-label="drum notation">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={X0 - 4} x2={W - 4} y1={28 + i * 8} y2={28 + i * 8} className="dn-line" />
      ))}
      {line === 0 && (
        <g className="dn-clef">
          <rect x={6} y={36} width={3.5} height={16} />
          <rect x={13} y={36} width={3.5} height={16} />
        </g>
      )}
      {line === 0 && drill.drum?.swing8 && (
        <text x={W - 6} y={-3} className="dn-sig" textAnchor="end" data-swing-mark="1">
          Swing ♫ = ♪³
        </text>
      )}
      {constSig && (
        <text x={X0 + 2} y={-3} className="dn-sig" data-time-sig={drill.pulse === 8 ? `${drill.meter}/8` : `${drill.meter}/4`}>
          {drill.pulse === 8 ? `${drill.meter}/8` : `${drill.meter}/4`}
          {drill.groups && drill.groups.length > 1 && drill.groups.some((g) => g !== drill.groups![0]) ? ` (${drill.groups.join('+')})` : ''}
        </text>
      )}
      {hasTimeline(drill) &&
        geo.bars
          .filter((b) => b.sig)
          .map((b) => (
            <text key={`sig${b.index}`} x={Math.max(X0 + 2, xBar(b.from) + 3)} y={-3} className="dn-sig" data-time-sig={b.sig}>
              {b.sig}
              {groupSizes(b).length > 1 && groupSizes(b).some((g, _i, xs) => g !== xs[0]) ? ` (${groupSizes(b).join('+')})` : ''}
            </text>
          ))}
      {/* Time Lock (games fix): the silent bars are hatched and labelled — the gap is the game, so it must be seen. */}
      {geo.bars
        .filter((b) => silentBar(drill, b.index))
        .map((b) => {
          const xa = xBar(b.from) + 2;
          const xb = xBar(b.from + b.len) - 2;
          return (
            <g key={`sil${b.index}`} className="dn-silent" data-silent-bar={b.index}>
              <rect x={xa} y={24} width={Math.max(0, xb - xa)} height={40} rx={3} className="dn-silent-bg" />
              {Array.from({ length: Math.max(1, Math.floor((xb - xa) / 9)) }, (_, k) => (
                <line key={k} x1={xa + 4 + k * 9} x2={xa + 4 + k * 9 + 10} y1={64} y2={24} className="dn-silent-hatch" />
              ))}
              <text x={(xa + xb) / 2} y={20} className="dn-silent-label" textAnchor="middle">
                {lang === 'he' ? 'בלי קליק' : 'click off'}
              </text>
            </g>
          );
        })}
      {/* Land It (games fix): the downbeat you land on carries the lemon now-cue. */}
      {(drill.goal?.drum?.landing?.beats ?? [])
        .filter((lb) => lb >= b0 - 1e-6 && lb < b0 + per - 1e-6)
        .map((lb) => (
          <g key={`land${lb}`} className="dn-landing" data-landing-beat={lb}>
            <rect x={xOf(lb) - 8} y={12} width={16} height={64} rx={8} className="dn-landing-bg" />
            <text x={xOf(lb)} y={9} className="dn-landing-label" textAnchor="middle">
              1
            </text>
          </g>
        ))}
      {geo.bars.map((b) => (
        <line key={`bar${b.index}`} x1={xBar(b.from + b.len)} x2={xBar(b.from + b.len)} y1={28} y2={60} className="dn-bar" />
      ))}
      {stems.map((s, i) => (
        <line key={`s${i}`} x1={s.x} x2={s.x} y1={s.y1} y2={s.y2} className="dn-stem" />
      ))}
      {beams}
      {restMarks}
      {signs}
      {ns.map((n, i) => {
        const x = xOf(n.beat);
        const y = yOf(STEP[n.voice!]);
        const m = marks.get(n.key);
        const dyn = n.dyn && n.dyn !== lastDyn ? n.dyn : undefined;
        if (n.dyn) lastDyn = n.dyn;
        const half = n.trem && n.dur >= 2 && !XHEAD.has(n.voice!);
        return (
          <g key={i} className={`dn ${m ?? ''}`} data-voice={n.voice}>
            {STEP[n.voice!] >= 10 && <line x1={x - 7} x2={x + 7} y1={20} y2={20} className="dn-line" />}
            {XHEAD.has(n.voice!) ? (
              <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} className="dn-x" />
            ) : half ? (
              <ellipse cx={x} cy={y} rx={5.6} ry={4.1} transform={`rotate(-20 ${x} ${y})`} className="dn-stem" />
            ) : (
              <ellipse cx={x} cy={y} rx={5.6} ry={4.1} transform={`rotate(-20 ${x} ${y})`} className="dn-head" />
            )}
            {pmarks && <Tick marks={pmarks} k={n.key} x={x} y={y} edge={6.5} prior />}
            <Tick marks={marks} k={n.key} x={x} y={y} edge={6.5} />
            {cueBeat !== null && cueBeat !== undefined && Math.abs(n.beat - cueBeat) < 1e-6 && <DrumCue x={x} y={y} r={5} />}
            {m === 'wrong' && <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} className="mk-x" />}
            {n.grace && (
              // Grace note(s): small heads just before the stroke, the flam's with a slash.
              <g className="dn-grace">
                {Array.from({ length: n.grace }, (_, k) => (
                  <ellipse key={k} cx={x - 9 - (n.grace! - 1 - k) * 5} cy={y - 1} rx={2.6} ry={2} transform={`rotate(-20 ${x - 9 - (n.grace! - 1 - k) * 5} ${y - 1})`} className="dn-head" />
                ))}
                <path d={`M${x - 7} ${y - 2}V${y - 14}`} className="dn-stem" />
                {n.grace === 1 && <path d={`M${x - 11} ${y - 6}l7 -6`} className="dn-stem" />}
              </g>
            )}
            {dotted(n.dur * q8) && <circle cx={x + 8} cy={y - 1} r={1.6} className="dn-dot" />}
            {n.ghost && <text x={x} y={y + 3.5} className="dn-ghost" textAnchor="middle">(  )</text>}
            {n.accent && <path d={`M${x - 4} ${isFoot(n.voice!) ? 82 : 6}l8 3-8 3`} className="dn-acc" />}
            {n.voice === 'hhOpen' && <circle cx={x} cy={7} r={2.6} className="dn-open" />}
            {dyn && <text x={x} y={90} className="dn-dyn">{dyn}</text>}
            {sticking && !dyn && (
              <text x={x} y={86} className="dn-stick" textAnchor="middle">
                {n.grace ? (n.hand === 'R' ? 'l' : 'r').repeat(n.grace) : ''}
                {n.hand}
              </text>
            )}
          </g>
        );
      })}
      {cursor !== null && <line x1={cursor} x2={cursor} y1={14} y2={74} className="dn-cursor" />}
    </svg>
  );
}

const LANE_ORDER: DrumVoice[] = ['crash', 'ride', 'hihat', 'tom1', 'snare', 'tom2', 'tom3', 'kick', 'hhPedal'];
const laneOf = (v: DrumVoice): DrumVoice => (v === 'hhOpen' ? 'hihat' : v === 'rim' ? 'snare' : v);

/** Lane icons (24-unit box, ink line drawings — the same drums as the Highway's pads). */
function LaneIcon({ v, x, y, s = 18 }: { v: DrumVoice; x: number; y: number; s?: number }) {
  const k = PAD_GLYPH[v];
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 24})`} className="dl-icon" data-lane-icon={v}>
      {k === 'hihat' && (
        <g {...p}>
          <ellipse cx="12" cy="7" rx="9" ry="2" />
          <ellipse cx="12" cy="10" rx="9" ry="2" />
          <path d={v === 'hhPedal' ? 'M12 12v8M7 20l10 2' : 'M12 12v10M8 22h8'} />
        </g>
      )}
      {k === 'snare' && (
        <g {...p}>
          <ellipse cx="12" cy="8" rx="9" ry="3" />
          <path d="M3 8v7c0 1.7 4 3 9 3s9-1.3 9-3V8M7 10.5v6M12 11v7M17 10.5v6" />
        </g>
      )}
      {k === 'kick' && (
        <g {...p}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" />
        </g>
      )}
      {k === 'toms' && (
        <g {...p}>
          <ellipse cx="12" cy="7" rx="7" ry="2.5" />
          <path d="M5 7v8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7M12 17.5V22" />
          {v !== 'tom1' && (
            <text x="19" y="23" fontSize="10" stroke="none" fill="currentColor" fontWeight="700">
              {v === 'tom2' ? 2 : 3}
            </text>
          )}
        </g>
      )}
      {k === 'cymbal' && (
        <g {...p}>
          <path d="M2 10c3-2.5 17-2.5 20 0-3 1.6-17 1.6-20 0z" />
          <path d={v === 'ride' ? 'M12 8V6M12 11v11M8 22h8M10 10h4' : 'M12 8V6M12 11v11M8 22h8'} />
        </g>
      )}
    </g>
  );
}

/** The lanes key behind a "?" (the shapes are big enough to read on their own; the key is there when asked). */
function LaneKey({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const he = lang === 'he';
  const rows: [React.ReactNode, string][] = [
    [<path key="x" d="M5 2l10 10M15 2L5 12" className="dl-x" />, he ? 'מצילה / היי־האט' : 'Cymbal / hi-hat'],
    [<circle key="d" cx={10} cy={7} r={5} className="dl-hit" />, he ? 'תוף' : 'Drum'],
    [<circle key="g" cx={10} cy={7} r={4} className="dl-hit ghost" />, he ? 'מכת רפאים' : 'Ghost note'],
    [<circle key="a" cx={10} cy={7} r={5.5} className="dl-hit accent" />, he ? 'הדגשה' : 'Accent'],
    [<rect key="k" x={2} y={4} width={16} height={6} rx={3} className="dl-kick" />, he ? 'בס־תוף' : 'Kick'],
  ];
  return (
    <>
      <button type="button" className="icon-btn drum-key-help" onClick={() => setOpen(true)} aria-label={he ? 'מקרא' : 'Key'} data-lane-key="1">
        ?
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet tr-sheet" role="dialog" aria-modal="true" aria-label={he ? 'מקרא' : 'Key'} onClick={(e) => e.stopPropagation()} data-lane-key-sheet="1" dir={he ? 'rtl' : 'ltr'}>
            <header className="tr-sheet-head">
              <h2>{he ? 'מקרא' : 'Key'}</h2>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label={he ? 'סגירה' : 'Close'}>
                ✕
              </button>
            </header>
            <ul className="tr-detail">
              {rows.map(([g, t], i) => (
                <li key={i} className="lane-key-row">
                  <svg viewBox="0 0 20 14" width={30} height={21} className="drum-lanes" aria-hidden="true">
                    {g}
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function LaneLine({ drill, line, geo, marks, pmarks, cueBeat, beat }: { drill: Drill; line: number; geo: LineGeo; marks: Map<string, NoteMark>; pmarks?: Map<string, NoteMark> | null; cueBeat?: number | null; beat: number; lang: Lang }) {
  // Slice 6 (§4.5): lanes 26 units (≈ 22 px on a phone), the drums as icons in a narrow column, cymbals on top and the
  // kick as a short bar across the bottom of the lanes; ✕ cymbal heads, ● drum heads, hollow ghosts, thick accents.
  // Its own (narrower) width: the lanes then scale up to about 22 px on a 320 px phone.
  const LW = 280;
  const LX0 = 28;
  const H = 26;
  const KH = 14;
  const lanes = LANE_ORDER.filter((v) => v !== 'kick' && drill.notes.some((n) => n.voice && laneOf(n.voice) === v));
  const hasKick = drill.notes.some((n) => n.voice === 'kick');
  const b0 = geo.from;
  const per = geo.to - geo.from;
  const ns = drill.notes.filter((n) => n.beat >= b0 - 1e-6 && n.beat < b0 + per - 1e-6 && n.voice);
  const kickY = 3 + lanes.length * H;
  const h = kickY + (hasKick ? KH + 2 : 0) + 3;
  const xOf = (b: number) => LX0 + 8 + ((b - b0) / per) * (LW - LX0 - 18);
  const cursor = beat >= b0 && beat < b0 + per ? xOf(beat) : null;
  const barStarts = new Set(geo.bars.map((b) => Math.round(b.from * 1e4)));
  const step = (LW - LX0 - 18) / Math.max(1, per * 4);
  const isCue = (n: ExpNote) => cueBeat !== null && cueBeat !== undefined && Math.abs(n.beat - cueBeat) < 1e-6;
  return (
    <svg className="drum-lanes" viewBox={`0 0 ${LW} ${h}`} role="img" aria-label="drum lanes" data-line={line} data-kick-bar={hasKick ? 1 : 0}>
      {lanes.map((v, i) => (
        <g key={v}>
          <rect x={LX0} y={3 + i * H} width={LW - LX0 - 4} height={H - 2} rx={5} className={`dl-lane l-${classOf(v)}`} />
          <LaneIcon v={v} x={4} y={3 + i * H + (H - 2) / 2 - 9} />
        </g>
      ))}
      {hasKick && (
        <g>
          <rect x={LX0} y={kickY} width={LW - LX0 - 4} height={KH} rx={5} className="dl-lane l-kick" />
          <LaneIcon v="kick" x={6} y={kickY - 1} s={15} />
        </g>
      )}
      {Array.from({ length: Math.round(per) + 1 }, (_, k) => (
        <line key={k} x1={xOf(b0 + k)} x2={xOf(b0 + k)} y1={2} y2={h - 2} className={barStarts.has(Math.round((b0 + k) * 1e4)) || k === Math.round(per) ? 'dl-bar' : 'dl-beat'} />
      ))}
      {ns.map((n, i) => {
        const k = noteKey(n);
        const m = marks.get(k);
        const x = xOf(n.beat);
        if (n.voice === 'kick') {
          const w = Math.max(9, Math.min(18, step * 1.6));
          const y = kickY + KH / 2;
          return (
            <g key={i} data-voice="kick">
              <rect x={x - w / 2} y={kickY + 3} width={w} height={KH - 6} rx={3} className={`dl-kick ${m ?? ''} ${n.accent ? 'accent' : ''}`} />
              {pmarks && <Tick marks={pmarks} k={k} x={x} y={y} edge={w / 2 + 1.5} prior />}
              <Tick marks={marks} k={k} x={x} y={y} edge={w / 2 + 1.5} />
              {isCue(n) && <DrumCue x={x} y={y} r={5} />}
            </g>
          );
        }
        const li = lanes.indexOf(laneOf(n.voice!));
        const y = 3 + li * H + (H - 2) / 2;
        const xh = XHEAD.has(n.voice!);
        const r = n.accent ? 6.5 : n.ghost ? 4.6 : 5.6;
        return (
          <g key={i} data-voice={n.voice} className={`dl ${m ?? ''}`}>
            {xh ? (
              <>
                <circle cx={x} cy={y} r={7} className={`dl-xbg ${m ?? ''}`} />
                <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} className={`dl-x ${m ?? ''}`} strokeWidth={n.accent ? 3.2 : undefined} />
              </>
            ) : (
              <circle cx={x} cy={y} r={r} className={`dl-hit ${m ?? ''} ${n.ghost ? 'ghost' : ''} ${n.accent ? 'accent' : ''}`} />
            )}
            {m === 'wrong' && !xh && <path d={`M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8`} className="mk-x" />}
            {n.accent && <path d={`M${x - 4} ${y - 12.5}l7 2.5-7 2.5`} className="dl-acc" />}
            {n.voice === 'hhOpen' && <circle cx={x + 8} cy={y - 7} r={2.4} className="dl-open" />}
            {pmarks && <Tick marks={pmarks} k={k} x={x} y={y} edge={7.5} prior />}
            <Tick marks={marks} k={k} x={x} y={y} edge={7.5} />
            {isCue(n) && <DrumCue x={x} y={y} r={r} />}
          </g>
        );
      })}
      {cursor !== null && <line x1={cursor} x2={cursor} y1={0} y2={h} className="dn-cursor" />}
    </svg>
  );
}

// ───────────────────────────── kit connect & mapping wizard ─────────────────────────────

type Step = 'connect' | 'map' | 'pedal' | 'vel' | 'latency' | 'acal' | 'done';
const TX = {
  en: {
    title: 'Set up your kit', connect: 'Connect my e-kit (USB-MIDI)', pad: 'Practice pad (microphone)', padHint: 'One surface by microphone: strokes, rudiments, time and snare reading. Grooves and fills need an e-kit.',
    noMidi: 'This browser has no MIDI (Safari, iPhone, iPad). Use Chrome or Edge with an e-kit, or a practice pad by microphone.', none: 'No MIDI device found. Plug the kit in by USB (not through a hub) and try again.', retry: 'Try again',
    phones: 'Listen through the kit’s headphone jack or wired headphones. Bluetooth adds 150–250 ms, so every hit would look late.',
    map: 'Hit each pad', preset: 'Kit brand', skip: 'I don’t have this pad', again: 'Two different notes — hit the same pad twice.', taken: 'That pad is already learned — hit the one asked for.',
    pedal: 'Hi-hat pedal', pedalDown: 'Press the pedal fully down, then tap Measure', pedalUp: 'Lift the pedal fully, then tap Measure', measure: 'Measure', noCc: 'Your kit sends the hat state as notes — nothing to set here.', next: 'Next',
    vel: 'Soft and loud', soft: 'Play 8 soft strokes on the snare', loud: 'Now 8 loud strokes on the snare', velBad: 'Soft and loud came out too close — once more, softer and louder.',
    latency: 'Latency', slow: 'That is a lot of delay — Bluetooth? Use wired headphones or the kit’s jack, then measure again.',
    done: 'Your kit is ready', test: 'Find my level (2–3 min)', start: 'To the drills', pads: 'pads learned',
    acoustic: 'Acoustic kit (microphone)', acousticHint: 'Kick, snare, toms and cymbals told apart by sound: the basic grooves and fills. Less accurate than MIDI.',
    acal: 'Teach the app your drums', acalHint: 'Phone 1–2 m from the kit. Normal strength.', acalBad: 'Some drums sounded alike. Move the phone and try again.', acalTom: 'The tom sounded like the snare: toms count as the snare.', again2: 'Again', acalOk: 'told apart', micErr: 'The microphone is not available.',
    quickMap: 'Three pads to start', quickRest: 'The other pads come from the kit brand. The pedal, soft and loud strokes and every pad can be fine-tuned later on the kit card.', quickCard: 'Quick setup · finish it for every pad', finish: 'Finish setup',
  },
  he: {
    title: 'הגדרת המערכת', connect: 'לחבר תופים אלקטרוניים (USB-MIDI)', pad: 'פד אימון (מיקרופון)', padHint: 'משטח אחד דרך המיקרופון: מכות, רודימנטים, זמן וקריאה לסנר. גרובים ומעברים דורשים תופים אלקטרוניים.',
    noMidi: 'בדפדפן הזה אין MIDI (ספארי, אייפון, אייפד). השתמשו בכרום או באדג׳ עם תופים אלקטרוניים, או בפד אימון עם מיקרופון.', none: 'לא נמצא התקן MIDI. חברו את המודול ב-USB (לא דרך מפצל) ונסו שוב.', retry: 'לנסות שוב',
    phones: 'הקשיבו דרך שקע האוזניות של המודול או באוזניות חוטיות. בלוטות׳ מוסיף 150–250 מ״ש, וכל מכה תיראה מאחרת.',
    map: 'מכה על כל פד', preset: 'יצרן', skip: 'אין לי את הפד הזה', again: 'שני תווים שונים — הכו באותו פד פעמיים.', taken: 'הפד הזה כבר נלמד — הכו בזה שמבוקש.',
    pedal: 'פדל ההיי־האט', pedalDown: 'לחצו את הפדל עד הסוף, ואז הקישו על מדידה', pedalUp: 'הרימו את הפדל עד הסוף, ואז הקישו על מדידה', measure: 'מדידה', noCc: 'המערכת שלכם שולחת את מצב ההיי־האט כתווים — אין מה לכוון כאן.', next: 'הבא',
    vel: 'חלש וחזק', soft: 'נגנו 8 מכות חלשות על הסנר', loud: 'עכשיו 8 מכות חזקות על הסנר', velBad: 'החלש והחזק יצאו קרובים מדי — עוד פעם, חלש יותר וחזק יותר.',
    latency: 'השהיה', slow: 'זו השהיה גדולה — בלוטות׳? עברו לאוזניות חוטיות או לשקע של המודול ומדדו שוב.',
    done: 'המערכת מוכנה', test: 'למצוא את הרמה שלי (2–3 דק׳)', start: 'לתרגילים', pads: 'פדים נלמדו',
    acoustic: 'מערכת אקוסטית (מיקרופון)', acousticHint: 'בס־תוף, סנר, טומים ומצלתיים מזוהים לפי הצליל: הגרובים והמעברים הבסיסיים. פחות מדויק מ-MIDI.',
    acal: 'ללמד את האפליקציה את התופים', acalHint: 'הטלפון במרחק 1–2 מ׳ מהמערכת. מכות בעוצמה רגילה.', acalBad: 'חלק מהתופים נשמעו דומים. הזיזו את הטלפון ונסו שוב.', acalTom: 'הטום נשמע כמו הסנר: הטומים ייספרו כסנר.', again2: 'שוב', acalOk: 'זוהו נכון', micErr: 'המיקרופון לא זמין.',
    quickMap: 'שלושה פדים להתחלה', quickRest: 'שאר הפדים לפי היצרן. את הפדל, המכות החלשות והחזקות וכל הפדים אפשר לכוונן אחר כך בכרטיס המערכת.', quickCard: 'הגדרה מהירה · להשלים לכל הפדים', finish: 'להשלים הגדרה',
  },
};

/** What a microphone setup covers (one line under the notice). */
const KIND_SCOPE: Record<KitKind, { en: string; he: string }> = {
  midi: { en: '', he: '' },
  acoustic: { en: 'By microphone: strokes, rudiments, time, snare reading, and the basic grooves and fills.', he: 'במיקרופון: מכות, רודימנטים, זמן, קריאה לסנר, וגרובים ומעברים בסיסיים.' },
  pad: { en: 'By microphone: strokes, rudiments, time and snare reading.', he: 'במיקרופון: מכות, רודימנטים, זמן וקריאה לסנר.' },
};

/** The notice where it matters (kit card, path top): shown until an e-kit is set up; says what a mic setup covers. */
export function KitNotice({ kit, lang, className = '' }: { kit?: KitProfile; lang: Lang; className?: string }) {
  const kind = kitKind(kit);
  if (kit?.done && kind === 'midi') return null;
  const scope = kit?.done ? KIND_SCOPE[kind][lang] : '';
  return (
    <p className={`kit-notice ${className}`} data-kit-notice={kit?.done ? kind : 'none'}>
      <b>{KIT_NOTICE[lang]}</b>
      {scope && <small>{scope}</small>}
    </p>
  );
}

const KIND_NAME: Record<KitKind, { en: string; he: string }> = {
  midi: { en: 'E-kit (MIDI)', he: 'אלקטרוניים (MIDI)' },
  acoustic: { en: 'Acoustic kit', he: 'מערכת אקוסטית' },
  pad: { en: 'Practice pad', he: 'פד אימון' },
};

/** The kit card on the drums Technique page: the setup (e-kit / acoustic kit / practice pad), its status, the notice. */
export function KitCard({ kit, lang, onSetup, onKit }: { kit?: KitProfile; lang: Lang; onSetup: (kind?: KitKind) => void; onKit?: (k: KitProfile) => void }) {
  const tx = TX[lang];
  const ready = !!kit?.done;
  const kind = kitKind(kit);
  // The chosen setup: an acoustic kit still waiting for its calibration shows as acoustic (not yet usable).
  const chosen: KitKind = kit?.kind === 'acoustic' && kit.mic ? 'acoustic' : kind;
  const learned = Object.keys(kit?.map ?? {}).length;
  const he = lang === 'he';
  const status = !ready
    ? he ? 'עוד לא הוגדרה מערכת' : 'No kit set up yet'
    : chosen === 'acoustic'
      ? kind === 'acoustic'
        ? he ? 'מיקרופון · התופים כוילו' : 'Microphone · drums calibrated'
        : he ? 'מיקרופון · צריך כיול' : 'Microphone · needs calibrating'
      : kind === 'pad'
        ? tx.pad
        : kit!.quick
          ? `${kit!.device ?? PRESETS[kit!.preset].name} · ${tx.quickCard}`
          : `${kit!.device ?? PRESETS[kit!.preset].name} · ${learned} ${tx.pads}`;
  return (
    <section className={`kit-card ${ready ? 'ready' : ''}`} data-kit-card={ready ? 'ready' : 'none'} data-kit-kind={chosen}>
      <div className="kc-row">
        <Glyph kind="drums" color={DOMAIN_COLOR.rhythm} size={44} />
        <span className="kc-text">
          <b>{ready ? KIND_NAME[chosen][lang] : tx.title}</b>
          <small>{status}</small>
        </span>
        <button className={`btn small ${ready ? 'ghost' : 'primary'}`} onClick={() => onSetup(ready ? chosen : undefined)} data-kit-setup="1">
          {ready ? (kind === 'midi' && kit!.quick ? tx.finish : he ? 'שינוי' : 'Change') : he ? 'להתחיל' : 'Start'}
        </button>
      </div>
      <div className="chips kit-kinds" role="radiogroup" aria-label={he ? 'על מה מנגנים' : 'What you play on'}>
        {(['midi', 'acoustic', 'pad'] as KitKind[]).map((k) => (
          <button key={k} role="radio" aria-checked={ready && chosen === k} className={`chip ${ready && chosen === k ? 'on' : ''}`} onClick={() => onSetup(k)} data-kit-kind-pick={k}>
            {KIND_NAME[k][lang]}
          </button>
        ))}
      </div>
      <KitNotice kit={kit} lang={lang} />
      {ready && kind === 'midi' && onKit && (
        <label className="kit-sounds" data-kit-sounds={kit!.sounds ? 'on' : 'off'}>
          <input type="checkbox" checked={!!kit!.sounds} onChange={(e) => onKit({ ...kit!, sounds: e.target.checked })} />
          <span>
            {he ? 'האפליקציה מנגנת את צלילי התופים' : 'The app plays the drum sounds'}
            <small>{he ? 'לפדים בלי מודול צליל' : 'For pads without a sound module'}</small>
          </span>
        </label>
      )}
    </section>
  );
}

export function KitSetup({ lang, kit: kit0, latency, onSave, onLatency, onDone, onTest, start, quick }: { lang: Lang; kit?: KitProfile; latency: LatencyValues; onSave: (k: KitProfile) => void; onLatency: (p: LatencyValues) => void; onDone: () => void; onTest?: () => void; /** Picked on the kit card: go straight to that setup. */ start?: KitKind; /** The short course-start form: three pads, no pedal / velocity steps (SPEC-COURSE-START). */ quick?: boolean }) {
  const tx = TX[lang];
  // A setup picked on the kit card: the acoustic kit / pad start at the latency (the pick is saved at once).
  const first: Step = start === 'acoustic' || start === 'pad' ? 'latency' : 'connect';
  const [step, setStep] = useState<Step>(first);
  const [kit, setKit] = useState<KitProfile>(() => ({ ...DEFAULT_KIT, ...(kit0 ?? {}), ...(start === 'acoustic' ? { mic: true, kind: 'acoustic' as const } : start === 'pad' ? { mic: true, kind: 'pad' as const } : {}), done: false }));
  const [devices, setDevices] = useState<string[] | null>(null);
  const save = (p: Partial<KitProfile>) =>
    setKit((k) => {
      const n = { ...k, ...p };
      onSave(n);
      return n;
    });
  const connect = async () => {
    try {
      const ds = await midi.enable();
      setDevices(ds);
      if (ds.length) {
        save({ mic: false, kind: 'midi', device: ds[0], quick: !!quick });
        setStep('map');
      }
    } catch {
      setDevices([]);
    }
  };
  const usePad = () => {
    save({ mic: true, kind: 'pad' });
    setStep('latency');
  };
  const useAcoustic = () => {
    save({ mic: true, kind: 'acoustic' });
    setStep('latency');
  };
  const order: Step[] = !kit.mic ? (quick ? ['connect', 'map', 'latency', 'done'] : ['connect', 'map', 'pedal', 'vel', 'latency', 'done']) : kit.kind === 'acoustic' ? ['connect', 'latency', 'acal', 'done'] : ['connect', 'latency', 'done'];
  const next = () => setStep(order[Math.min(order.length - 1, order.indexOf(step) + 1)]);
  const bt = slowOutput(kit.mic ? (latency.micLatencyMs ?? 0) : (latency.midiLatencyMs ?? 0));
  return (
    <div className="kit-setup" data-kit-step={step} data-kit-quick={quick ? '1' : undefined}>
      <ol className="kit-steps" aria-hidden="true">
        {order.slice(0, -1).map((s) => (
          <li key={s} className={s === step ? 'now' : order.indexOf(s) < order.indexOf(step) ? 'past' : ''} />
        ))}
      </ol>
      {step === 'connect' && (
        <section className="kit-step">
          <Glyph kind="drums" color={DOMAIN_COLOR.rhythm} size={72} shadow />
          {!midi.supported ? <p className="field-hint">{tx.noMidi}</p> : devices && !devices.length ? <p className="field-hint warn">{tx.none}</p> : null}
          {midi.supported && (
            <button className="btn primary" onClick={() => void connect()} data-kit-connect="1">
              {devices && !devices.length ? tx.retry : tx.connect}
            </button>
          )}
          <p className="kit-notice" data-kit-notice="connect">
            <b>{KIT_NOTICE[lang]}</b>
          </p>
          <button className="btn ghost" onClick={useAcoustic} data-kit-acoustic="1">
            {tx.acoustic}
          </button>
          <p className="field-hint small">{tx.acousticHint}</p>
          <button className="btn ghost" onClick={usePad} data-kit-pad="1">
            {tx.pad}
          </button>
          <p className="field-hint small">{tx.padHint}</p>
          <p className="kit-warn" data-kit-phones="1">
            {tx.phones}
          </p>
        </section>
      )}
      {step === 'map' && <MapStep lang={lang} kit={kit} pads={quick ? QUICK_PADS : WIZARD_PADS} onPreset={(p) => save({ preset: p })} onDone={(map) => (save({ map }), next())} />}
      {step === 'pedal' && <PedalStep lang={lang} onDone={(cc4) => (cc4 && save({ cc4 }), next())} />}
      {step === 'vel' && <VelStep lang={lang} kit={kit} onDone={(r) => (r && save({ vel: { ...(kit.vel ?? {}), snare: r } }), next())} />}
      {step === 'latency' && (
        <section className="kit-step">
          <h2>{tx.latency}</h2>
          <LatencyCalibrate lang={lang} values={latency} onSave={onLatency} sources={kit.mic ? ['mic'] : ['midi']} />
          {bt && <p className="kit-warn">{tx.slow}</p>}
          <button className="btn primary" onClick={() => (save({ done: true }), next())} data-kit-next="latency">
            {tx.next}
          </button>
        </section>
      )}
      {step === 'acal' && <AcousticCalStep lang={lang} onDone={(cal) => (save({ acoustic: cal, done: true }), next())} onSkip={next} />}
      {step === 'done' && (
        <section className="kit-step">
          <Glyph kind="drums" color={DOMAIN_COLOR.rhythm} size={72} shadow />
          <h2>{tx.done}</h2>
          {onTest && (
            <button className="btn primary" onClick={onTest} data-kit-test="1">
              {tx.test}
            </button>
          )}
          <button className={`btn ${onTest ? 'ghost' : 'primary'}`} onClick={onDone} data-kit-done="1">
            {tx.start}
          </button>
        </section>
      )}
    </div>
  );
}

function MapStep({ lang, kit, pads = WIZARD_PADS, onPreset, onDone }: { lang: Lang; kit: KitProfile; pads?: WizardPad[]; onPreset: (p: KitPreset) => void; onDone: (map: KitProfile['map']) => void }) {
  const tx = TX[lang];
  const [w, setW] = useState<WizardState>(wizardStart);
  const ref = useRef(w);
  ref.current = w;
  const [flash, setFlash] = useState<DrumVoice | null>(null);
  useEffect(() => {
    // Raw notes while learning (drum mode: no octave shift), whatever course the wizard was opened from.
    const prev = midi.opts.drums;
    midi.setOptions({ drums: true });
    const off = midi.onNote((note, on, _at, vel) => {
      if (!on) return;
      const n = wizardHit(ref.current, note, vel, pads);
      setW(n);
      if (n.note === 'learned') setFlash(pads[ref.current.step].voice);
    });
    return () => {
      off();
      midi.setOptions({ drums: prev });
    };
  }, []);
  useEffect(() => {
    if (wizardDone(w, pads)) onDone(w.map);
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  if (wizardDone(w, pads)) return null;
  const pad = pads[w.step];
  const short = pads.length < WIZARD_PADS.length;
  return (
    <section className="kit-step">
      <h2>{short ? tx.quickMap : tx.map}</h2>
      <div className="chips kit-presets" role="radiogroup" aria-label={tx.preset}>
        {(Object.keys(PRESETS) as KitPreset[]).map((p) => (
          <button key={p} role="radio" aria-checked={kit.preset === p} className={`chip ${kit.preset === p ? 'on' : ''}`} onClick={() => onPreset(p)}>
            {PRESETS[p].name}
          </button>
        ))}
      </div>
      <div className="kit-pad" data-kit-pad-now={pad.voice}>
        <Glyph kind={PAD_GLYPH[pad.voice]} color="#FFD43B" size={84} shadow />
        <b>{pad.prompt[lang]}</b>
        <span className="kit-dots" aria-hidden="true">
          {[0, 1].map((k) => (
            <i key={k} className={k < w.heard.length ? 'on' : ''} />
          ))}
        </span>
      </div>
      {w.note === 'again' && <p className="field-hint warn">{tx.again}</p>}
      {w.note === 'taken' && <p className="field-hint warn">{tx.taken}</p>}
      <ul className="kit-learned" dir="ltr">
        {pads.slice(0, w.step).map((p) => {
          const note = Object.entries(w.map).find(([, v]) => v === p.voice)?.[0];
          return (
            <li key={p.voice} className={flash === p.voice ? 'flash' : ''}>
              {VOICE_NAME[p.voice][lang]} <small>{note ? `#${note}` : p.voice === 'hhOpen' && w.hatByCc ? 'CC4' : '—'}</small>
            </li>
          );
        })}
      </ul>
      {short && <p className="field-hint small" data-kit-quick-rest="1">{tx.quickRest}</p>}
      {pad.optional && (
        <button className="btn ghost" onClick={() => setW(wizardSkip(w, pads))} data-kit-skip="1">
          {tx.skip}
        </button>
      )}
    </section>
  );
}

function PedalStep({ lang, onDone }: { lang: Lang; onDone: (cc4: KitProfile['cc4'] | null) => void }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'down' | 'up'>('down');
  const [seen, setSeen] = useState(midi.cc4 !== null);
  const vals = useRef<{ down: number[]; up: number[] }>({ down: [], up: [] });
  const cur = useRef<number | null>(midi.cc4);
  useEffect(
    () =>
      midi.onCC((cc, v) => {
        if (cc !== 4) return;
        cur.current = v;
        setSeen(true);
      }),
    [],
  );
  const measure = () => {
    if (cur.current !== null) vals.current[phase].push(cur.current);
    if (phase === 'down') setPhase('up');
    else onDone(pedalRange(vals.current.down, vals.current.up));
  };
  return (
    <section className="kit-step">
      <h2>{tx.pedal}</h2>
      <Glyph kind="hihat" color="#FFD43B" size={72} shadow />
      {seen ? <p>{phase === 'down' ? tx.pedalDown : tx.pedalUp}</p> : <p className="field-hint">{tx.noCc}</p>}
      {seen ? (
        <button className="btn primary" onClick={measure} data-kit-measure={phase}>
          {tx.measure}
        </button>
      ) : (
        <button className="btn primary" onClick={() => onDone(null)} data-kit-next="pedal">
          {tx.next}
        </button>
      )}
    </section>
  );
}

function VelStep({ lang, kit, onDone }: { lang: Lang; kit: KitProfile; onDone: (r: { soft: number; loud: number } | null) => void }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'soft' | 'loud'>('soft');
  const [n, setN] = useState(0);
  const [bad, setBad] = useState(false);
  const v = useRef<{ soft: number[]; loud: number[] }>({ soft: [], loud: [] });
  const ph = useRef(phase);
  ph.current = phase;
  useEffect(
    () =>
      midi.onNote((note, on, _at, vel) => {
        if (!on || voiceOf(note, kit) !== 'snare') return;
        const arr = v.current[ph.current];
        arr.push(vel);
        setN(arr.length);
        if (arr.length < 8) return;
        if (ph.current === 'soft') {
          setPhase('loud');
          setN(0);
          return;
        }
        const r = calibrateVel(v.current.soft, v.current.loud);
        if (r) onDone(r);
        else {
          v.current = { soft: [], loud: [] };
          setBad(true);
          setPhase('soft');
          setN(0);
        }
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <section className="kit-step">
      <h2>{tx.vel}</h2>
      <Glyph kind="snare" color={phase === 'soft' ? '#A78BFA' : '#FF8A3D'} size={72} shadow />
      <p>{phase === 'soft' ? tx.soft : tx.loud}</p>
      <span className="kit-dots eight" aria-label={`${n} / 8`}>
        {Array.from({ length: 8 }, (_, k) => (
          <i key={k} className={k < n ? 'on' : ''} />
        ))}
      </span>
      {bad && <p className="field-hint warn">{tx.velBad}</p>}
      <button className="btn ghost" onClick={() => onDone(null)} data-kit-next="vel">
        {lang === 'he' ? 'דילוג' : 'Skip'}
      </button>
    </section>
  );
}

/**
 * The acoustic kit calibration (DRUMS_AUDIT §5): kick, snare, a tom (may be skipped), the closed hi-hat — 4 hits each
 * by microphone; each drum's band template, then a check that the hits come out as the drum asked for.
 */
function AcousticCalStep({ lang, onDone, onSkip }: { lang: Lang; onDone: (cal: AcousticCal) => void; onSkip: () => void }) {
  const tx = TX[lang];
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [res, setRes] = useState<ReturnType<typeof buildCal> | null>(null);
  const [err, setErr] = useState(false);
  const [run, setRun] = useState(0);
  const samples = useRef<Partial<Record<AcousticVoice, number[][]>>>({});
  const step = useRef(0);
  const quietUntil = useRef(0);
  const advance = () => {
    step.current++;
    // The last drum still rings: half a second before the next one is heard.
    quietUntil.current = performance.now() + 500;
    setN(0);
    if (step.current >= CAL_ORDER.length) setRes(buildCal(samples.current));
    else setI(step.current);
  };
  useEffect(() => {
    const stop = new AbortController();
    const tr = new OnsetTracker();
    void listenLoop(
      new BrowserPitchCapture(),
      stop.signal,
      (f) => {
        if (!f.bands || step.current >= CAL_ORDER.length) return;
        const o = tr.push({ t: performance.now(), bands: f.bands });
        if (!o || o.t < quietUntil.current) return;
        const v = CAL_ORDER[step.current].voice;
        const arr = (samples.current[v] ??= []);
        arr.push(o.x);
        setN(arr.length);
        if (arr.length >= CAL_HITS) advance();
      },
      undefined,
      { bands: true },
    ).then((e) => e && setErr(true));
    return () => stop.abort();
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  const again = () => {
    samples.current = {};
    step.current = 0;
    quietUntil.current = 0;
    setI(0);
    setN(0);
    setRes(null);
    setRun((x) => x + 1);
  };
  if (res)
    return (
      <section className="kit-step" data-kit-acal={res.ok ? 'ok' : 'bad'}>
        <h2>{tx.acal}</h2>
        <p dir="auto">
          {Math.round(res.acc * 100)}% {tx.acalOk}
        </p>
        {res.droppedTom && <p className="field-hint">{tx.acalTom}</p>}
        {res.ok ? (
          <button className="btn primary" onClick={() => onDone(res.cal)} data-kit-next="acal">
            {tx.next}
          </button>
        ) : (
          <>
            <p className="kit-warn">{tx.acalBad}</p>
            <button className="btn primary" onClick={again} data-kit-acal-again="1">
              {tx.again2}
            </button>
          </>
        )}
      </section>
    );
  const cur = CAL_ORDER[i];
  const glyph: Record<AcousticVoice, GlyphKind> = { kick: 'kick', snare: 'snare', tom: 'toms', hat: 'hihat' };
  return (
    <section className="kit-step" data-kit-acal-now={cur.voice}>
      <h2>{tx.acal}</h2>
      <p className="field-hint small">{tx.acalHint}</p>
      {err && <p className="kit-warn">{tx.micErr}</p>}
      <div className="kit-pad">
        <Glyph kind={glyph[cur.voice]} color={DOMAIN_COLOR.rhythm} size={84} shadow />
        <b>{cur.prompt[lang]}</b>
        <span className="kit-dots" aria-label={`${n} / ${CAL_HITS}`}>
          {Array.from({ length: CAL_HITS }, (_, k) => (
            <i key={k} className={k < n ? 'on' : ''} />
          ))}
        </span>
      </div>
      {cur.optional && (
        <button className="btn ghost" onClick={advance} data-kit-skip="1">
          {tx.skip}
        </button>
      )}
      <button className="btn ghost" onClick={onSkip} data-kit-acal-skip="1">
        {lang === 'he' ? 'אחר כך (עד אז: כמו פד אימון)' : 'Later (until then: like a practice pad)'}
      </button>
    </section>
  );
}
