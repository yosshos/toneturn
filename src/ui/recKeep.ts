// Auto-keep (SPEC-PHRASE-STUDIO §6.1): the one call each take screen makes so its take lands in My recordings.
// Drills and everything built on DrillTake (licks, level tests, pieces, My song phrases, drum games) go through
// `useKeptTakes`, one wrap of DrillTake's onDone (its microphone takes keep their audio through a capture tap, the
// capture's own stream); charts, the improvisation studio and the voice exercises call their own keeper; lessons wrap
// their pitch capture (`keepingPitch`); the games are tapped while on screen (`armGameTap` → `keepGameTake`).
// Notes always (unless the player turned it off), audio of microphone takes by default.

import { useEffect } from 'react';

import type { Drill, PlayedNote, TakeMetrics } from '../engine/drills/types';
import type { CourseId } from '../engine/courses';
import type { SungFrame } from '../engine/sing';
import type { NoteEvent, PercKind } from '../engine/lesson';
import { segmentNotes } from '../engine/memory';
import { drillBandHits, drillDrumHits, unisonLine } from '../engine/drills/bandTimeline';
import { bandBass } from '../engine/drills/bassBand';
import { isDrumDrill, isGuitarDrill } from '../engine/drills/events';
import { midi } from '../speech/midi';
import { addCaptureTap, type CaptureSegment } from '../speech/captureTap';
import type { PitchCapture } from '../game/adapters';
import { packNotes, recordingPrefs, saveTake, type NewTake, type RecKind, type RecTake } from '../storage/recordings';

type T2 = { en: string; he: string };
/** Takes kept by a screen's own keeper (drill, vocal, chart): a game on screen then keeps no second take of them. */
let ownSaves = 0;
const wantAudio = () => recordingPrefs().keepAudio && recordingPrefs().keepNotes;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** A segment's audio once it ended (or what it holds after `ms`). */
async function segAudio(seg: CaptureSegment, ms = 1500): Promise<Blob | null> {
  if (!seg.recording) return null;
  await Promise.race([seg.done, wait(ms)]);
  try {
    return await seg.audio();
  } catch {
    return null;
  }
}

/** Band instrument bytes in a packed backing: 0 piano, 1 bass, 2.. a percussion kind. */
export const PERC_KINDS: PercKind[] = ['click', 'accent', 'wood', 'kick', 'snare', 'snare-soft', 'hat', 'bell', 'ride', 'ride-bell', 'hat-foot', 'hat-open', 'rim', 'crash', 'tom-hi', 'tom-lo', 'brush-sweep', 'brush-tap'];
export const instByte = (e: Pick<NoteEvent, 'inst' | 'perc'>) => (e.perc ? 2 + Math.max(0, PERC_KINDS.indexOf(e.perc)) : e.inst === 'bass' ? 1 : 0);
export const eventOfByte = (b: number): Pick<NoteEvent, 'inst' | 'perc'> => (b >= 2 ? { perc: PERC_KINDS[b - 2] ?? 'click' } : b === 1 ? { inst: 'bass' } : {});

/** A hint for the next takes' kind (App sets 'level-test' while a level test runs). */
let kindHint: RecKind | null = null;
/** A screen's own kind for its takes while it is open (VoiceLevelTest: 'level-test'); wins over the route's hint. */
let screenKind: RecKind | null = null;
export function setRecScreenKind(k: RecKind | null) {
  screenKind = k;
}
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

// ── DrillTake's microphone audio: a capture tap while a DrillTake is on screen ──
let drillSegs: CaptureSegment[] = [];
let drillZero: number | null = null;
let drillTaps = 0;
let drillTapOff: (() => void) | null = null;
function armDrillTap(): () => void {
  if (!drillTaps++)
    drillTapOff = addCaptureTap({
      get audio() {
        return wantAudio();
      },
      onSegment: (seg) => {
        drillSegs = [...drillSegs.slice(-3), seg];
      },
    });
  return () => {
    if (--drillTaps) return;
    drillTapOff?.();
    drillTapOff = null;
    drillSegs = [];
    drillZero = null;
  };
}
/** DrillTake: beat 0 of the running take on the performance clock (the audio's offset to the notes). */
export function markTakeZero(perf: number) {
  drillZero = perf;
}
/** The capture of the take that just ended (the newest one; earlier takes consumed theirs), consumed. */
function takeSegment(): { seg: CaptureSegment; t0?: number } | null {
  const zero = drillZero;
  const seg = drillSegs[drillSegs.length - 1];
  drillSegs = [];
  drillZero = null;
  // t0: where beat 0 sits in the audio (a microphone slow to open starts after it: 0).
  return seg ? { seg, ...(zero !== null ? { t0: Math.max(0, (zero - seg.startPerf) / 1000) } : {}) } : null;
}

/** Keep a drill take (any DrillTake). Fire and forget. */
export function keepDrillTake(drill: Drill, m: TakeMetrics, played: PlayedNote[], bpm: number): void {
  ownSaves++;
  const mic = takeSegment();
  try {
    const drum = isDrumDrill(drill);
    const instrument: RecTake['instrument'] = drum ? 'drums' : drill.sung ? 'voice' : (drill.spec.instrument ?? (isGuitarDrill(drill) ? 'guitar' : instrumentNow()));
    const beatMs = 60000 / Math.max(20, bpm);
    const last = played.reduce((a, n) => Math.max(a, n.off ?? n.on + 300), 0);
    const kind: RecKind = (screenKind ?? kindHint) ?? KIND_OF_ROUTE[routeNow] ?? 'drill';
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
    // A microphone take: its audio (the capture's own stream), with beat 0's place in it.
    if (input.source === 'mic' && mic?.seg.recording) {
      void segAudio(mic.seg)
        .then((audio) => saveTake(mic.t0 !== undefined ? { ...input, t0: Math.round(mic.t0 * 1000) / 1000 } : input, audio))
        .catch(() => {});
    } else void saveTake(input);
  } catch {
    /* never in the way of the take */
  }
}

/** DrillTake's onDone, keeping the take on the way. */
export function keepingTakes<A extends unknown[]>(drill: Drill, bpm: number, onDone: (m: TakeMetrics, played: PlayedNote[], ...rest: A) => void) {
  return (m: TakeMetrics, played: PlayedNote[], ...rest: A) => {
    keepDrillTake(drill, m, played ?? [], bpm);
    onDone(m, played, ...rest);
  };
}

/** The one hook call in DrillTake / RubatoTake: keeps every take, with the microphone's audio when allowed. */
export function useKeptTakes<A extends unknown[]>(drill: Drill, bpm: number, onDone: (m: TakeMetrics, played: PlayedNote[], ...rest: A) => void) {
  useEffect(() => armDrillTap(), []);
  return keepingTakes(drill, bpm, onDone);
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
  ownSaves++;
  const last = o.frames.length ? o.frames[o.frames.length - 1].t : 0;
  void saveTake(
    {
      durationMs: Math.round(last * 1000),
      course: courseNow ?? 'voice',
      instrument: 'voice',
      kind: (screenKind ?? kindHint) ?? o.kind ?? 'vocal',
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
  ownSaves++;
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

// ───────────────────────────── lessons: sung questions ─────────────────────────────

/** What a lesson's current question is, for its take (null: nothing to keep). */
export interface LessonTakeInfo {
  itemId: string;
  title: T2;
  /** The voice itself is measured (sung), not an instrument played back. */
  sung: boolean;
  /** Answered on MIDI (no audio). */
  midi: boolean;
}

/** A lesson's pitch capture that keeps each sung / played-back answer (notes; audio of the microphone unless off). */
export function keepingPitch(inner: PitchCapture, about: () => LessonTakeInfo | null): PitchCapture {
  return {
    sing: async (opts) => {
      let a: LessonTakeInfo | null = null;
      try {
        a = about();
      } catch {
        a = null;
      }
      const rec = !!a && !a.midi && wantAudio() && !opts.record;
      const r = await inner.sing(rec ? { ...opts, record: true } : opts);
      if (a && r.kind === 'frames') keepLessonTake(a, r.frames, r.audio ?? null);
      if (rec && r.kind === 'frames' && r.audio) {
        const { audio: _a, ...rest } = r;
        void _a;
        return rest;
      }
      return r;
    },
  };
}

export function keepLessonTake(a: LessonTakeInfo, frames: readonly SungFrame[], audio: Blob | null): void {
  try {
    ownSaves++;
    const last = frames.length ? frames[frames.length - 1].t : 0;
    void saveTake(
      {
        durationMs: Math.round(last * 1000),
        course: courseNow,
        instrument: a.sung ? 'voice' : instrumentNow(),
        kind: (screenKind ?? kindHint) ?? 'lesson',
        itemId: a.itemId,
        title: a.title,
        sung: a.sung,
        source: a.midi ? 'midi' : 'mic',
        played: notesFromFrames(frames),
        t0: 0,
      },
      a.midi ? null : audio,
    ).catch(() => {});
  } catch {
    /* never in the way */
  }
}

// ───────────────────────────── games: tapped while on screen ─────────────────────────────

interface GameTap {
  game: string;
  title: T2;
  own: number;
  notes: PlayedNote[];
  open: Map<number, PlayedNote>;
  /** Mic captures of this run, each from `from` seconds (a capture still running when the last run was kept). */
  segs: { seg: CaptureSegment; from: number }[];
  off: () => void;
}
let gameTap: GameTap | null = null;

/** App: a game route opened (`game` its id, `title` its name). Returns the disarm. */
export function armGameTap(game: string, title: T2): () => void {
  gameTap?.off();
  const g: GameTap = { game, title, own: ownSaves, notes: [], open: new Map(), segs: [], off: () => {} };
  const offMidi = midi.onNote((m, on, at, vel) => {
    const t = at || performance.now();
    if (on) {
      const n: PlayedNote = { pitch: m, on: t, off: null, vel };
      g.notes.push(n);
      g.open.set(m, n);
    } else {
      const n = g.open.get(m);
      if (n) n.off = t;
      g.open.delete(m);
    }
  });
  const offTap = addCaptureTap({
    get audio() {
      return wantAudio();
    },
    onSegment: (seg) => void g.segs.push({ seg, from: 0 }),
  });
  g.off = () => {
    offMidi();
    offTap();
    if (gameTap === g) gameTap = null;
  };
  gameTap = g;
  return g.off;
}

/** A game's accuracy (0..1) from its result detail, when it says one. */
export function gameAccuracy(detail: unknown): number | undefined {
  const d = (detail ?? {}) as { accuracy?: unknown; acc?: unknown; right?: unknown; wrong?: unknown; total?: unknown };
  const acc = typeof d.accuracy === 'number' ? d.accuracy : typeof d.acc === 'number' ? d.acc : undefined;
  if (acc !== undefined && acc >= 0) return acc > 1 ? Math.min(1, acc / 100) : acc;
  const right = typeof d.right === 'number' ? d.right : null;
  const total = typeof d.total === 'number' ? d.total : right !== null && typeof d.wrong === 'number' ? right + d.wrong : null;
  return right !== null && total ? Math.max(0, Math.min(1, right / total)) : undefined;
}

/** Gaps between a game's microphone captures are shortened to this in its take. */
export const GAME_GAP_S = 0.6;

/** Where each capture part sits in one take: [from, to] seconds on its own clock → `at` seconds in the take. */
export function layoutParts(parts: readonly { startPerf: number; from: number; to: number }[], gapS = GAME_GAP_S): number[] {
  const out: number[] = [];
  let at = 0;
  let prevEnd: number | null = null;
  for (const p of parts) {
    const start = p.startPerf / 1000 + p.from;
    if (prevEnd !== null) at += Math.min(gapS, Math.max(0, start - prevEnd));
    out.push(at);
    at += Math.max(0, p.to - p.from);
    prevEnd = p.startPerf / 1000 + p.to;
  }
  return out;
}

/** App (every game result): keep the run's notes (and microphone audio) as one take of kind 'game'. */
export function keepGameTake(game: string, detail?: unknown): void {
  const g = gameTap;
  if (!g) return;
  const now = performance.now();
  const notes = g.notes.splice(0).map((n) => ({ ...n, off: n.off ?? now }));
  g.open.clear();
  const parts = g.segs.filter((x) => x.seg.frames.length && (x.seg.frames[x.seg.frames.length - 1].t > x.from));
  // Running captures carry on into the next run from here; ended ones are done.
  g.segs = g.segs.filter((x) => !x.seg.ended).map((x) => ({ seg: x.seg, from: x.seg.frames.length ? x.seg.frames[x.seg.frames.length - 1].t : x.from }));
  // A screen that kept its own takes (a game built on DrillTake) needs no second one.
  if (ownSaves !== g.own) {
    g.own = ownSaves;
    return;
  }
  const acc = gameAccuracy(detail);
  const base = { course: courseNow, kind: 'game' as RecKind, itemId: `game:${game}`, title: g.title, ...(acc !== undefined ? { result: { acc } } : {}) };
  try {
    if (parts.length) {
      const ps = parts.map((x) => ({ seg: x.seg, startPerf: x.seg.startPerf, from: x.from, to: x.seg.frames[x.seg.frames.length - 1].t }));
      const at = layoutParts(ps);
      const played: PlayedNote[] = [];
      ps.forEach((p, i) => {
        const fr = p.seg.frames.filter((f) => f.t >= p.from);
        for (const n of notesFromFrames(fr, p.from - at[i])) played.push(n);
      });
      const durationMs = Math.round((at[at.length - 1] + ps[ps.length - 1].to - ps[ps.length - 1].from) * 1000);
      const sung = courseNow === 'voice' || g.game.startsWith('sing') || g.game === 'harmonyhold' || g.game === 'holdnote';
      const input: NewTake = { ...base, durationMs, instrument: sung ? 'voice' : instrumentNow(), sung, source: 'mic', played, t0: 0 };
      void gameAudio(ps, at)
        .then((audio) => saveTake(input, audio))
        .catch(() => saveTake(input));
      return;
    }
    if (notes.length) {
      const t0 = notes[0].on;
      const played = notes.map((n) => ({ ...n, on: Math.round(n.on - t0), off: Math.round((n.off ?? n.on) - t0) }));
      const durationMs = played.reduce((a, n) => Math.max(a, n.off ?? n.on), 0);
      void saveTake({ ...base, durationMs, instrument: instrumentNow(), sung: false, source: 'midi', played }).catch(() => {});
    }
  } catch {
    /* never in the way */
  }
}

/** The run's audio: one capture as recorded; several laid end to end (gaps shortened) as a 16 kHz mono WAV. */
async function gameAudio(ps: { seg: CaptureSegment; from: number; to: number }[], at: number[]): Promise<Blob | null> {
  if (!ps.some((p) => p.seg.recording)) return null;
  if (ps.length === 1 && ps[0].from === 0) return segAudio(ps[0].seg, 800);
  const SR = 16000;
  const total = Math.ceil((at[at.length - 1] + ps[ps.length - 1].to - ps[ps.length - 1].from) * SR) + SR / 10;
  if (total > SR * 600) return null; // over 10 minutes of stitched audio: notes only
  const out = new Float32Array(total);
  type OAC = typeof OfflineAudioContext;
  const Ctx: OAC | undefined = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : (globalThis as unknown as { webkitOfflineAudioContext?: OAC }).webkitOfflineAudioContext;
  if (!Ctx) return null;
  let any = false;
  for (let i = 0; i < ps.length; i++) {
    const b = await segAudio(ps[i].seg, 800);
    if (!b) continue;
    try {
      const buf = await new Ctx(1, SR, SR).decodeAudioData(await b.arrayBuffer());
      const ch = buf.getChannelData(0);
      const a = Math.floor(ps[i].from * buf.sampleRate);
      const z = Math.min(ch.length, Math.ceil(ps[i].to * buf.sampleRate) + Math.floor(buf.sampleRate / 10));
      const off = Math.floor(at[i] * SR);
      const k = buf.sampleRate / SR;
      for (let j = 0; off + j < total && a + j * k < z; j++) out[off + j] = ch[Math.floor(a + j * k)];
      any = true;
    } catch {
      /* this part stays silent */
    }
  }
  return any ? wavOf(out, SR) : null;
}

/** 16-bit mono PCM WAV. */
export function wavOf(pcm: Float32Array, sr: number): Blob {
  const b = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(b);
  const str = (o: number, x: string) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([b], { type: 'audio/wav' });
}
