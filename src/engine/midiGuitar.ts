// MIDI guitar (GUITAR-AUDIT B7): a hex pickup + converter in per-string ("mono") mode sends each string on its own
// channel — usually channels 1–6 (Roland, Fishman, Jamstik) or 2–7 (MPE-style, channel 1 the master). Pure.
//  · channelBase — which channel is string 1 (high e), from the setting or, on 'auto', from the take itself;
//  · placeMidiGuitar — each note-on gets its string and fret, so the tab position and a dead string are exact;
//  · bendTrace — the pitch-bend messages as a pitch trace (GFrame-shaped), so bends and vibrato are graded by the
//    same code as the microphone's (analyzeBend / analyzeVibrato).

import type { PlayedNote } from './drills/types';

export type GuitarChannelMode = 'auto' | '1-6' | '2-7' | 'off';

/** A note-on from the MIDI input with its channel (0–15). */
export interface ChannelNote extends PlayedNote {
  ch: number;
}

/** A pitch-bend message: channel, bend in cents, time (ms, the take's clock). */
export interface BendEvent {
  ch: number;
  cents: number;
  at: number;
}

/** One trace point (the same shape as the microphone's GFrame: t ms, hz, conf, rms). */
export interface TracePoint {
  t: number;
  hz: number | null;
  conf: number;
  rms: number;
}

const midiHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** The highest fret a note may land on before a channel mapping is judged impossible. */
const MAX_FRET = 24;

/**
 * The channel (0-based) of string 1, or null when the input carries no string information (one channel: a keyboard, or
 * a converter in poly mode). 'auto' decides from the take: a note on channel 1 means 1–6, one on channel 7 means 2–7;
 * otherwise the mapping that puts every note on a playable fret of its string wins (1–6 when both do).
 */
export function channelBase(mode: GuitarChannelMode, notes: { pitch: number; ch: number }[], open: number[]): number | null {
  if (mode === 'off') return null;
  if (mode === '1-6') return 0;
  if (mode === '2-7') return 1;
  const chs = new Set(notes.map((n) => n.ch));
  if (chs.size < 2) return null;
  const n = open.length;
  const fits = (base: number) => [...chs].every((c) => c >= base && c < base + n) && notes.every((x) => { const f = x.pitch - open[x.ch - base]; return f >= 0 && f <= MAX_FRET; });
  if (chs.has(0)) return fits(0) ? 0 : null;
  if (chs.has(n)) return fits(1) ? 1 : null;
  return fits(0) ? 0 : fits(1) ? 1 : null;
}

/** String (1 = highest) of a channel, or null when outside the guitar's channels. */
export function stringOfChannel(ch: number, base: number, strings: number): number | null {
  const s = ch - base + 1;
  return s >= 1 && s <= strings ? s : null;
}

/**
 * Note-ons with their channel → played notes with string and fret (when the input is per-string). A note whose fret
 * would be negative on its channel's string keeps no place (a converter glitch, or the wrong channel mode).
 */
export function placeMidiGuitar(notes: ChannelNote[], mode: GuitarChannelMode, open: number[]): { played: PlayedNote[]; base: number | null } {
  const base = channelBase(mode, notes, open);
  const played = notes.map(({ ch, ...p }) => {
    if (base === null) return p;
    const s = stringOfChannel(ch, base, open.length);
    if (s === null) return p;
    const fret = p.pitch - open[s - 1];
    return fret >= 0 && fret <= MAX_FRET ? { ...p, string: s, fret } : p;
  });
  return { played, base };
}

/**
 * The pitch-bend messages as a pitch trace, one point every `stepMs`: at each moment the most recently struck note still
 * held (a monophonic reading, like the microphone's tracker) at its pitch plus its channel's latest bend. A bend sent
 * before the note-on counts (a pre-bend). Loudness: the note-on velocity, as a linear level.
 */
export function bendTrace(notes: ChannelNote[], bends: BendEvent[], o: { stepMs?: number; end?: number } = {}): TracePoint[] {
  if (!notes.length) return [];
  const step = o.stepMs ?? 10;
  const byCh = new Map<number, BendEvent[]>();
  for (const b of [...bends].sort((a, c) => a.at - c.at)) byCh.set(b.ch, [...(byCh.get(b.ch) ?? []), b]);
  const bendAt = (ch: number, t: number): number => {
    const xs = byCh.get(ch);
    if (!xs) return 0;
    let c = 0;
    for (const b of xs) {
      if (b.at > t) break;
      c = b.cents;
    }
    return c;
  };
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  const t0 = sorted[0].on;
  const lastOff = Math.max(...sorted.map((n) => n.off ?? n.on + 2000));
  const end = o.end ?? lastOff;
  const out: TracePoint[] = [];
  for (let t = t0; t <= end; t += step) {
    let cur: ChannelNote | null = null;
    for (const n of sorted) {
      if (n.on > t) break;
      if (n.off === null || n.off > t) cur = n;
    }
    if (!cur) out.push({ t, hz: null, conf: 0, rms: 0 });
    else out.push({ t, hz: midiHz(cur.pitch + bendAt(cur.ch, t) / 100), conf: 1, rms: Math.max(0.01, cur.vel / 127) * 0.3 });
  }
  return out;
}

/** Notes that sounded on another string than the tab wrote (a per-string MIDI guitar only): advice, never a grade. */
export function offStringCount(pairs: { written?: number; played?: number }[]): number {
  return pairs.filter((p) => p.written !== undefined && p.played !== undefined && p.written !== p.played).length;
}
