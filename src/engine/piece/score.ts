// The piece model (SPEC-PIECE §3) and its importers: MusicXML (score-partwise, repeats and 1st / 2nd endings
// expanded to the order they are played) and Standard MIDI Files. Pure.
// Time is in quarter-note beats from the start of the performance order.

import { find, kid, kids, parseXml, txt, type XNode } from './xml';

export type PieceHand = 'R' | 'L';

export interface PieceNote {
  midi: number;
  /** Onset (quarter beats from the start, performance order). */
  start: number;
  /** Written length (quarter beats; tied notes merged). */
  dur: number;
  /** Index into Piece.bars (performance order). */
  bar: number;
  hand: PieceHand;
  /** Articulation marks on the note. */
  staccato?: boolean;
  accent?: boolean;
  /** Dynamic in force (pp … ff) when the score says so. */
  dyn?: string;
}

export interface PieceBar {
  /** Bar number as printed (written order, 1-based). */
  number: string;
  /** Onset (quarter beats). */
  start: number;
  /** Length (quarter beats). */
  beats: number;
  /** Time signature in force. */
  sig: [number, number];
  /** A rehearsal mark / section start (double bar, repeat start, new key / time) — preferred chunk boundary. */
  boundary?: boolean;
}

export interface Piece {
  title: string;
  composer?: string;
  bars: PieceBar[];
  notes: PieceNote[];
  /** Tempo marking (quarter bpm) when the score has one. */
  tempo?: number;
  /** Key signature (fifths, −7…7) at the start. */
  fifths: number;
  /** Where it came from. */
  source: 'musicxml' | 'midi';
}

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// ---------------------------------------------------------------- MusicXML

interface RawNote {
  midi: number;
  at: number; // within the bar, quarter beats
  dur: number;
  staff: number;
  tieStart: boolean;
  tieStop: boolean;
  staccato?: boolean;
  accent?: boolean;
  dyn?: string;
}
interface RawBar {
  number: string;
  beats: number;
  sig: [number, number];
  notes: RawNote[];
  repeatStart: boolean;
  repeatEnd: boolean;
  /** Volta numbers on this bar ("1", "2", "1, 2"). */
  ending: number[] | null;
  boundary: boolean;
  tempo?: number;
  fifths?: number;
}

export function parseMusicXml(src: string): Piece {
  const doc = parseXml(src);
  const score = find(doc, 'score-partwise');
  if (!score) throw new Error('Not a MusicXML score (score-partwise)');
  const title = txt(find(score, 'work'), 'work-title') || txt(score, 'movement-title') || 'Untitled';
  const composer = kids(find(score, 'identification'), 'creator').find((c) => c.attrs.type === 'composer')?.text.trim();
  const parts = kids(score, 'part');
  // Multi-part scores: the first two parts become right / left hand (a piano is usually one part with two staves).
  const rawParts = parts.slice(0, 2).map((p) => readPart(p));
  const base = rawParts[0];
  if (!base?.length) throw new Error('The score has no measures');
  if (rawParts[1]) base.forEach((b, i) => rawParts[1][i] && b.notes.push(...rawParts[1][i].notes.map((n) => ({ ...n, staff: 2 }))));
  return expand(base, title, composer);
}

function readPart(part: XNode): RawBar[] {
  const out: RawBar[] = [];
  let divisions = 1;
  let sig: [number, number] = [4, 4];
  let dyn: string | undefined;
  for (const m of kids(part, 'measure')) {
    let pos = 0;
    let maxPos = 0;
    let lastStart = 0;
    const bar: RawBar = { number: m.attrs.number ?? String(out.length + 1), beats: 0, sig, notes: [], repeatStart: false, repeatEnd: false, ending: null, boundary: out.length === 0 };
    for (const el of m.children) {
      if (el.name === 'attributes') {
        const d = txt(el, 'divisions');
        if (d) divisions = Number(d) || 1;
        const t = kid(el, 'time');
        if (t) {
          sig = [Number(txt(t, 'beats')) || 4, Number(txt(t, 'beat-type')) || 4];
          bar.sig = sig;
          bar.boundary = true;
        }
        const k = kid(el, 'key');
        if (k && txt(k, 'fifths') !== undefined) {
          bar.fifths = Number(txt(k, 'fifths'));
          if (out.length) bar.boundary = true;
        }
      } else if (el.name === 'backup') pos -= Number(txt(el, 'duration') ?? 0) / divisions;
      else if (el.name === 'forward') pos += Number(txt(el, 'duration') ?? 0) / divisions;
      else if (el.name === 'direction') {
        const snd = find(el, 'sound');
        if (snd?.attrs.tempo) bar.tempo = Number(snd.attrs.tempo);
        const dy = find(el, 'dynamics');
        if (dy?.children[0]) dyn = dy.children[0].name;
        if (find(el, 'rehearsal')) bar.boundary = true;
      } else if (el.name === 'sound' && el.attrs.tempo) bar.tempo = Number(el.attrs.tempo);
      else if (el.name === 'barline') {
        const rep = kid(el, 'repeat');
        if (rep?.attrs.direction === 'forward') {
          bar.repeatStart = true;
          bar.boundary = true;
        }
        if (rep?.attrs.direction === 'backward') bar.repeatEnd = true;
        const end = kid(el, 'ending');
        if (end && (end.attrs.type === 'start' || !bar.ending)) bar.ending = (end.attrs.number ?? '1').split(/[,\s]+/).filter(Boolean).map(Number);
        if (txt(el, 'bar-style') === 'light-light' || txt(el, 'bar-style') === 'light-heavy') {
          // a double bar ends a section: the next bar starts one (marked when it is read)
          (bar as RawBar & { endsSection?: boolean }).endsSection = true;
        }
      } else if (el.name === 'note') {
        const dur = Number(txt(el, 'duration') ?? 0) / divisions;
        const chord = !!kid(el, 'chord');
        const grace = !!kid(el, 'grace');
        if (grace) continue;
        const start = chord ? lastStart : pos;
        if (!chord) {
          lastStart = pos;
          pos += dur;
        }
        maxPos = Math.max(maxPos, pos);
        const p = kid(el, 'pitch');
        if (!p || kid(el, 'rest')) continue;
        const midi = 12 * ((Number(txt(p, 'octave')) || 4) + 1) + (STEP[txt(p, 'step') ?? 'C'] ?? 0) + (Number(txt(p, 'alter')) || 0);
        const ties = kids(el, 'tie');
        const notations = kid(el, 'notations');
        const art = kid(notations, 'articulations');
        bar.notes.push({
          midi: Math.round(midi),
          at: start,
          dur,
          staff: Number(txt(el, 'staff')) || 1,
          tieStart: ties.some((t) => t.attrs.type === 'start'),
          tieStop: ties.some((t) => t.attrs.type === 'stop'),
          ...(kid(art, 'staccato') || kid(art, 'staccatissimo') ? { staccato: true } : {}),
          ...(kid(art, 'accent') || kid(art, 'strong-accent') ? { accent: true } : {}),
          ...(dyn ? { dyn } : {}),
        });
      }
    }
    const full = (sig[0] * 4) / sig[1];
    bar.beats = m.attrs.implicit === 'yes' ? Math.max(maxPos, 0.25) : Math.max(full, maxPos);
    const prev = out[out.length - 1] as (RawBar & { endsSection?: boolean }) | undefined;
    if (prev?.endsSection) bar.boundary = true;
    out.push(bar);
  }
  return out;
}

/** Repeats and voltas → the order the bars are played. */
export function performanceOrder(bars: Pick<RawBar, 'repeatStart' | 'repeatEnd' | 'ending'>[]): number[] {
  const order: number[] = [];
  const done = new Set<number>();
  let i = 0;
  let start = 0;
  let pass = 1;
  let inEnding = false;
  let guard = 0;
  while (i < bars.length && guard++ < 20000) {
    const b = bars[i];
    if (b.repeatStart && pass === 1) start = i;
    if (b.ending && !b.ending.includes(pass)) {
      i++;
      continue;
    }
    if (!b.ending && pass === 2 && inEnding) {
      pass = 1;
      inEnding = false;
    }
    if (b.ending) inEnding = true;
    order.push(i);
    if (b.repeatEnd && !done.has(i)) {
      done.add(i);
      pass = 2;
      inEnding = false;
      i = start;
      continue;
    }
    if (b.repeatEnd) {
      pass = 1;
      start = i + 1;
    }
    i++;
  }
  return order;
}

function expand(raw: RawBar[], title: string, composer?: string): Piece {
  const order = performanceOrder(raw);
  const bars: PieceBar[] = [];
  const notes: PieceNote[] = [];
  let t = 0;
  const open = new Map<string, PieceNote>(); // tied notes: "midi:hand"
  order.forEach((ri, k) => {
    const rb = raw[ri];
    bars.push({ number: rb.number, start: t, beats: rb.beats, sig: rb.sig, ...(rb.boundary || (k > 0 && order[k - 1] !== ri - 1) ? { boundary: true } : {}) });
    for (const n of [...rb.notes].sort((a, b) => a.at - b.at)) {
      const hand: PieceHand = n.staff >= 2 ? 'L' : 'R';
      const key = `${n.midi}:${hand}`;
      const prev = open.get(key);
      if (n.tieStop && prev && Math.abs(prev.start + prev.dur - (t + n.at)) < 1e-3) {
        prev.dur += n.dur;
        if (!n.tieStart) open.delete(key);
        continue;
      }
      const pn: PieceNote = { midi: n.midi, start: t + n.at, dur: n.dur, bar: k, hand, ...(n.staccato ? { staccato: true } : {}), ...(n.accent ? { accent: true } : {}), ...(n.dyn ? { dyn: n.dyn } : {}) };
      notes.push(pn);
      if (n.tieStart) open.set(key, pn);
      else open.delete(key);
    }
    t += rb.beats;
  });
  // One staff only: split by pitch around middle C so "hands" still mean something.
  if (!notes.some((n) => n.hand === 'L')) for (const n of notes) n.hand = n.midi < 60 && notes.some((m) => m.midi >= 60) ? 'L' : 'R';
  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
  return { title, ...(composer ? { composer } : {}), bars, notes, tempo: raw.find((b) => b.tempo)?.tempo, fifths: raw[0].fifths ?? 0, source: 'musicxml' };
}

// ---------------------------------------------------------------- Standard MIDI File

export function parseMidi(buf: Uint8Array, title = 'Untitled'): Piece {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const str = (o: number, l: number) => String.fromCharCode(...buf.slice(o, o + l));
  if (str(0, 4) !== 'MThd') throw new Error('Not a MIDI file');
  const ntr = dv.getUint16(10);
  const div = dv.getUint16(12);
  if (div & 0x8000) throw new Error('SMPTE time in MIDI files is not supported');
  let o = 8 + dv.getUint32(4);
  let tempo: number | undefined;
  let sig: [number, number] = [4, 4];
  const sigs: { tick: number; sig: [number, number] }[] = [];
  const tracks: { midi: number; on: number; off: number; ch: number; vel: number }[][] = [];
  for (let tr = 0; tr < ntr && o < buf.length; tr++) {
    if (str(o, 4) !== 'MTrk') break;
    const len = dv.getUint32(o + 4);
    let p = o + 8;
    const end = p + len;
    o = end;
    let tick = 0;
    let run = 0;
    const open = new Map<string, { on: number; vel: number }>();
    const notes: { midi: number; on: number; off: number; ch: number; vel: number }[] = [];
    const vlq = () => {
      let v = 0;
      let b: number;
      do {
        b = buf[p++];
        v = (v << 7) | (b & 0x7f);
      } while (b & 0x80 && p < end);
      return v;
    };
    while (p < end) {
      tick += vlq();
      let st = buf[p];
      if (st & 0x80) p++;
      else st = run;
      if (st === 0xff) {
        const type = buf[p++];
        const l = vlq();
        if (type === 0x51 && l === 3 && tempo === undefined) tempo = Math.round(60000000 / ((buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2]));
        if (type === 0x58 && l >= 2) sigs.push({ tick, sig: [buf[p], 2 ** buf[p + 1]] });
        if (type === 0x03 && tr === 0 && l) title = title === 'Untitled' ? new TextDecoder().decode(buf.slice(p, p + l)) || title : title;
        p += l;
        continue;
      }
      if (st === 0xf0 || st === 0xf7) {
        p += vlq();
        continue;
      }
      run = st;
      const kind = st & 0xf0;
      const ch = st & 0x0f;
      if (kind === 0x90 || kind === 0x80) {
        const m = buf[p];
        const v = buf[p + 1];
        p += 2;
        const k = `${ch}:${m}`;
        if (kind === 0x90 && v > 0) open.set(k, { on: tick, vel: v });
        else {
          const s = open.get(k);
          if (s) {
            notes.push({ midi: m, on: s.on, off: tick, ch, vel: s.vel });
            open.delete(k);
          }
        }
      } else p += kind === 0xc0 || kind === 0xd0 ? 1 : 2;
    }
    if (notes.length) tracks.push(notes);
  }
  if (sigs.length) sig = sigs[0].sig;
  // Two tracks → right / left hand; one track → split at middle C.
  const all = tracks.flatMap((ns, ti) => ns.filter((n) => n.ch !== 9).map((n) => ({ ...n, hand: (tracks.length >= 2 ? (ti === 0 ? 'R' : 'L') : n.midi < 60 ? 'L' : 'R') as PieceHand })));
  if (!all.length) throw new Error('The MIDI file has no notes');
  const q = (ticks: number) => Math.round((ticks / div) * 48) / 48;
  const barBeats = (sig[0] * 4) / sig[1];
  const last = Math.max(...all.map((n) => q(n.off)));
  const nBars = Math.max(1, Math.ceil(last / barBeats - 1e-6));
  const bars: PieceBar[] = Array.from({ length: nBars }, (_, i) => ({ number: String(i + 1), start: i * barBeats, beats: barBeats, sig, ...(i === 0 ? { boundary: true } : {}) }));
  const notes: PieceNote[] = all
    .map((n) => ({ midi: n.midi, start: q(n.on), dur: Math.max(1 / 12, q(n.off) - q(n.on)), bar: Math.min(nBars - 1, Math.floor(q(n.on) / barBeats + 1e-6)), hand: n.hand }))
    .sort((a, b) => a.start - b.start || a.midi - b.midi);
  return { title, bars, notes, tempo, fifths: 0, source: 'midi' };
}

/** Notes of bars [from, to] (inclusive), times relative to the first bar's start. */
export function notesIn(p: Piece, from: number, to: number): PieceNote[] {
  const t0 = p.bars[from]?.start ?? 0;
  return p.notes.filter((n) => n.bar >= from && n.bar <= to).map((n) => ({ ...n, start: n.start - t0 }));
}
export const beatsIn = (p: Piece, from: number, to: number) => p.bars.slice(from, to + 1).reduce((a, b) => a + b.beats, 0);
