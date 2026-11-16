// Auto-keep (SPEC-PHRASE-STUDIO §6.1): the one call each take screen makes so its take lands in My recordings.
// Drills and everything built on DrillTake (licks, level tests, pieces, My song phrases, drum games) go through
// `keepingTakes`, one wrap of DrillTake's onDone; charts, the improvisation studio and the voice exercises call their
// own keeper. Notes always (unless the player turned it off), audio of microphone takes by default.

import type { Drill, PlayedNote, TakeMetrics } from '../engine/drills/types';
import type { CourseId } from '../engine/courses';
import type { SungFrame } from '../engine/sing';
import type { NoteEvent, PercKind } from '../engine/lesson';
import { segmentNotes } from '../engine/memory';
import { drillBandHits, drillDrumHits, unisonLine } from '../engine/drills/bandTimeline';
import { bandBass } from '../engine/drills/bassBand';
import { isDrumDrill, isGuitarDrill } from '../engine/drills/events';
import { midi } from '../speech/midi';
import { packNotes, saveTake, type NewTake, type RecKind, type RecTake } from '../storage/recordings';

/** Band instrument bytes in a packed backing: 0 piano, 1 bass, 2.. a percussion kind. */
export const PERC_KINDS: PercKind[] = ['click', 'accent', 'wood', 'kick', 'snare', 'snare-soft', 'hat', 'bell', 'ride', 'ride-bell', 'hat-foot', 'hat-open', 'rim', 'crash', 'tom-hi', 'tom-lo', 'brush-sweep', 'brush-tap'];
export const instByte = (e: Pick<NoteEvent, 'inst' | 'perc'>) => (e.perc ? 2 + Math.max(0, PERC_KINDS.indexOf(e.perc)) : e.inst === 'bass' ? 1 : 0);
export const eventOfByte = (b: number): Pick<NoteEvent, 'inst' | 'perc'> => (b >= 2 ? { perc: PERC_KINDS[b - 2] ?? 'click' } : b === 1 ? { inst: 'bass' } : {});

/** A hint for the next takes' kind (App sets 'level-test' while a level test runs). */
let kindHint: RecKind | null = null;
export function setRecKindHint(k: RecKind | null) {
  kindHint = k;
}

let routeNow = '';
let courseNow: CourseId | null = null;
/** The open screen (App, on every route / course change) — names the kind of a DrillTake take. */
export function setRecRoute(route: string, course: CourseId | null) {
  routeNow = route;
  courseNow = course;
}

const KIND_OF_ROUTE: Record<string, RecKind> = { licks: 'lick', pieces: 'piece', mysong: 'song', charts: 'chart', improv: 'improv', vocal: 'vocal', encore: 'phrase' };
const INST_OF_COURSE: Partial<Record<CourseId, RecTake['instrument']>> = { keys: 'piano', guitar: 'guitar', bass: 'bass', voice: 'voice', drums: 'drums' };
const instrumentNow = (): RecTake['instrument'] => (courseNow && INST_OF_COURSE[courseNow]) || 'piano';

/** The band of a drill (drums, comping, bass line, unison, call-and-response), ms from beat 0, packed with instruments. */
export function drillBand(drill: Drill, bpm: number): Uint8Array | undefined {
  const beatMs = 60000 / Math.max(20, bpm);
  const out: (PlayedNote & { inst: number })[] = [];
  const add = (beat: number, len: number, m: number, vel: number, e: Pick<NoteEvent, 'inst' | 'perc'>) => out.push({ pitch: m, on: beat * beatMs, off: beat * beatMs + Math.max(40, len * beatMs), vel: Math.round(Math.max(0, Math.min(1, vel)) * 127), inst: instByte(e) });
  try {
    const PERC = { k: 'kick', s: 'snare', h: 'hat', 'tom-hi': 'tom-hi', 'tom-lo': 'tom-lo', crash: 'crash' } as const;
    for (const h of drillDrumHits(drill)) add(h.beat, 0.25, 36, h.d === 'h' ? 0.4 : h.d === 'crash' ? 0.7 : 0.85, { perc: PERC[h.d] });
    for (const h of drillBandHits(drill)) for (const m of h.notes) add(h.beat, h.len, m, h.vel, { inst: 'piano' });
    for (const n of bandBass(drill)) add(n.beat, n.len, n.midi, n.vel, { inst: 'bass' });
    for (const n of unisonLine(drill)) add(n.beat, n.len, n.midi, n.vel, { inst: n.inst === 'bass' ? 'bass' : 'piano' });
    for (const n of drill.listen?.notes ?? []) for (const m of n.midi) add(n.beat, n.dur, m, n.vel ?? (n.inst === 'bass' ? 0.85 : 0.5), n.perc ? { perc: n.perc } : { inst: n.inst === 'bass' ? 'bass' : 'piano' });
  } catch {
    /* no band */
  }
  return out.length ? packNotes(out, true) : undefined;
}

/** Keep a drill take (any DrillTake). Fire and forget. */
export function keepDrillTake(drill: Drill, m: TakeMetrics, played: PlayedNote[], bpm: number): void {
  try {
    const drum = isDrumDrill(drill);
    const instrument: RecTake['instrument'] = drum ? 'drums' : drill.sung ? 'voice' : (drill.spec.instrument ?? (isGuitarDrill(drill) ? 'guitar' : instrumentNow()));
    const beatMs = 60000 / Math.max(20, bpm);
    const last = played.reduce((a, n) => Math.max(a, n.off ?? n.on + 300), 0);
    const kind: RecKind = kindHint ?? KIND_OF_ROUTE[routeNow] ?? 'drill';
    const input: NewTake = {
      durationMs: Math.round(Math.max(last, (drill.beats ?? 0) * beatMs)),
      course: courseNow,
      instrument,
      kind,
      itemId: drill.itemId,
      title: drill.title,
      sung: !!drill.sung,
      source: midi.devices.length ? 'midi' : 'mic',
      played,
      ...(bpm > 0 ? { bpm: Math.round(bpm), meter: drill.meter, t0: 0 } : {}),
      ...(drill.chart?.length ? { chart: drill.chart.map((b) => (Array.isArray(b) ? b.join(' ') : String(b))).join(' | ') } : {}),
      result: { verdict: m.verdict, acc: m.accuracy, ...(m.bpm || bpm ? { bpm: Math.round(m.bpm || bpm) } : {}) },
    };
    const band = bpm > 0 ? drillBand(drill, bpm) : undefined;
    if (band) input.backing = { kind: 'drill', ref: drill.itemId, bpm: Math.round(bpm), notes: band };
    void saveTake(input);
  } catch {
    /* never in the way of the take */
  }
}

/** DrillTake's onDone, keeping the take on the way (the one hook call in DrillTake / RubatoTake). */
export function keepingTakes<A extends unknown[]>(drill: Drill, bpm: number, onDone: (m: TakeMetrics, played: PlayedNote[], ...rest: A) => void) {
  return (m: TakeMetrics, played: PlayedNote[], ...rest: A) => {
    keepDrillTake(drill, m, played ?? [], bpm);
    onDone(m, played, ...rest);
  };
}

/** Sung / played microphone frames → notes (ms on the frames' own clock, shifted by `offsetS`). */
export function notesFromFrames(frames: readonly SungFrame[], offsetS = 0): PlayedNote[] {
  try {
    return segmentNotes(frames as SungFrame[], { minSec: 0.08 }).map((n) => ({ pitch: Math.round(n.midi), on: Math.round((n.start - offsetS) * 1000), off: Math.round((n.end - offsetS) * 1000), vel: 64 }));
  } catch {
    return [];
  }
}

/** A voice exercise take (Vocal, timed singing): its sung notes and, when allowed, its audio. */
export function keepVocalTake(o: { itemId: string; title: { en: string; he: string }; frames: readonly SungFrame[]; audio?: Blob | null; score?: number; bpm?: number; kind?: RecKind; t0?: number }): void {
  const last = o.frames.length ? o.frames[o.frames.length - 1].t : 0;
  void saveTake(
    {
      durationMs: Math.round(last * 1000),
      course: courseNow ?? 'voice',
      instrument: 'voice',
      kind: kindHint ?? o.kind ?? 'vocal',
      itemId: o.itemId,
      title: o.title,
      sung: true,
      source: 'mic',
      played: notesFromFrames(o.frames, o.t0 ?? 0),
      ...(o.bpm ? { bpm: Math.round(o.bpm), meter: 4 } : {}),
      ...(o.t0 !== undefined ? { t0: 0 } : {}),
      ...(o.score !== undefined ? { result: { score: o.score } } : {}),
    },
    o.audio ?? null,
  ).catch(() => {});
}

/** A take over a chord chart (Charts' improvise, the improvisation studio): notes in seconds from the solo's beat 0. */
export function keepChartTake(o: {
  kind: 'chart' | 'improv' | 'guided';
  title: { en: string; he: string } | string;
  notes: readonly { start: number; end: number; midi: number; vel?: number }[];
  bpm: number;
  meter: number;
  chart: string;
  style: string;
  loops: number;
  source: 'midi' | 'mic' | 'screen';
  audio?: Blob | null;
  score?: number;
  itemId?: string;
}): void {
  const played: PlayedNote[] = o.notes.map((n) => ({ pitch: Math.round(n.midi), on: Math.round(n.start * 1000), off: Math.round(n.end * 1000), vel: Math.round(n.vel ?? 72) }));
  const beats = o.loops * o.meter * Math.max(1, o.chart.split('|').filter((x) => x.trim()).length);
  void saveTake(
    {
      durationMs: Math.round(Math.max(beats * (60000 / o.bpm), ...played.map((n) => n.off ?? n.on))),
      course: courseNow,
      instrument: instrumentNow(),
      kind: o.kind,
      ...(o.itemId ? { itemId: o.itemId } : {}),
      title: o.title,
      sung: o.source === 'mic' && courseNow === 'voice',
      source: o.source,
      played,
      bpm: Math.round(o.bpm),
      meter: o.meter,
      t0: 0,
      chart: o.chart,
      backing: { kind: 'chart', ref: JSON.stringify({ loops: o.loops, meter: o.meter }), bpm: Math.round(o.bpm), style: o.style },
      ...(o.score !== undefined ? { result: { score: o.score } } : {}),
    },
    o.audio ?? null,
  ).catch(() => {});
}
