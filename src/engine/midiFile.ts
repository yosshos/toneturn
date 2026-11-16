// A Standard MIDI File writer (format 0, one track) for exporting a take (SPEC-PHRASE-STUDIO §6.6 "Export"). Pure.
// Notes in ms → ticks at the take's tempo (or ♩120 when unknown), so a DAW opens it on its bar grid when the tempo
// was known.

export interface MidiNoteIn {
  pitch: number;
  /** ms */
  on: number;
  /** ms (null → a short note) */
  off: number | null;
  vel: number;
  channel?: number;
}
export const PPQ = 480;

function vlq(n: number): number[] {
  let v = Math.max(0, Math.round(n));
  const out = [v & 0x7f];
  while ((v >>= 7)) out.unshift((v & 0x7f) | 0x80);
  return out;
}
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n: number) => [(n >> 8) & 255, n & 255];

/** The .mid bytes of some notes. `t0` (ms) is beat 0 (notes before it are shifted so nothing is negative). */
export function midiFileOf(notes: readonly MidiNoteIn[], o: { bpm?: number; meter?: number; t0?: number; name?: string } = {}): Uint8Array {
  const bpm = o.bpm && o.bpm > 0 ? o.bpm : 120;
  const t0 = Math.min(o.t0 ?? 0, ...notes.map((n) => n.on));
  const msPerTick = 60000 / bpm / PPQ;
  const tick = (ms: number) => Math.max(0, Math.round((ms - t0) / msPerTick));
  type Ev = { t: number; order: number; bytes: number[] };
  const evs: Ev[] = [];
  for (const n of notes) {
    const ch = Math.max(0, Math.min(15, n.channel ?? 0));
    const p = Math.max(0, Math.min(127, Math.round(n.pitch)));
    const on = tick(n.on);
    const off = Math.max(on + 1, tick(n.off ?? n.on + 200));
    evs.push({ t: on, order: 1, bytes: [0x90 | ch, p, Math.max(1, Math.min(127, Math.round(n.vel)))] });
    evs.push({ t: off, order: 0, bytes: [0x80 | ch, p, 64] });
  }
  evs.sort((a, b) => a.t - b.t || a.order - b.order);
  const track: number[] = [];
  const mpq = Math.round(60_000_000 / bpm);
  if (o.name) {
    const name = [...new TextEncoder().encode(o.name.slice(0, 60))];
    track.push(0, 0xff, 0x03, ...vlq(name.length), ...name);
  }
  track.push(0, 0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255);
  const meter = o.meter && o.meter > 0 && o.meter < 16 ? o.meter : 4;
  track.push(0, 0xff, 0x58, 0x04, meter, 2, 24, 8);
  let last = 0;
  for (const e of evs) {
    track.push(...vlq(e.t - last), ...e.bytes);
    last = e.t;
  }
  track.push(0, 0xff, 0x2f, 0x00);
  return new Uint8Array([0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(0), ...u16(1), ...u16(PPQ), 0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track]);
}

/** Read back the notes of a file this writer made (tests; one track, running status not used). */
export function readMidiNotes(b: Uint8Array): { pitch: number; onTick: number; offTick: number; vel: number }[] {
  let i = 14 + 8; // header chunk (14) + "MTrk" + length
  let t = 0;
  const open = new Map<number, { onTick: number; vel: number }>();
  const out: { pitch: number; onTick: number; offTick: number; vel: number }[] = [];
  while (i < b.length) {
    let d = 0;
    let c: number;
    do {
      c = b[i++];
      d = (d << 7) | (c & 0x7f);
    } while (c & 0x80);
    t += d;
    const s = b[i++];
    if (s === 0xff) {
      const type = b[i++];
      let len = 0;
      do {
        c = b[i++];
        len = (len << 7) | (c & 0x7f);
      } while (c & 0x80);
      i += len;
      if (type === 0x2f) break;
    } else if ((s & 0xf0) === 0x90) {
      open.set(b[i], { onTick: t, vel: b[i + 1] });
      i += 2;
    } else if ((s & 0xf0) === 0x80) {
      const o = open.get(b[i]);
      if (o) out.push({ pitch: b[i], onTick: o.onTick, offTick: t, vel: o.vel });
      open.delete(b[i]);
      i += 2;
    } else i += 2;
  }
  return out.sort((a, b) => a.onTick - b.onTick);
}
