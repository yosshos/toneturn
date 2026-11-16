// A store-only ZIP writer (no compression: audio is compressed already) for exporting a recordings folder
// (SPEC-PHRASE-STUDIO §6.5). Files are added one at a time, so only one file's bytes are in memory for its CRC; the
// archive is a Blob of the parts. UTF-8 names (flag bit 11) so Hebrew titles keep their letters. Pure but for Blob.

let TABLE: Uint32Array | null = null;
function table(): Uint32Array {
  if (TABLE) return TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (TABLE = t);
}
export function crc32(b: Uint8Array): number {
  const t = table();
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** DOS date and time of a JS date. */
function dos(d: Date): { time: number; date: number } {
  const y = Math.max(1980, d.getFullYear());
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
  date?: Date;
}

/** Unique names inside the archive ("a.wav", "a (2).wav"). */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const k = n.toLowerCase();
    const c = (seen.get(k) ?? 0) + 1;
    seen.set(k, c);
    if (c === 1) return n;
    const dot = n.lastIndexOf('.');
    return dot > 0 ? `${n.slice(0, dot)} (${c})${n.slice(dot)}` : `${n} (${c})`;
  });
}

/** The archive's bytes as parts (local headers + data, central directory, end record). */
export function zipParts(entries: readonly ZipEntry[]): Uint8Array[] {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.bytes);
    const { time, date } = dos(e.date ?? new Date());
    const size = e.bytes.length;
    const lh = new Uint8Array(30 + name.length);
    const v = new DataView(lh.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); // UTF-8 names
    v.setUint16(8, 0, true); // stored
    v.setUint16(10, time, true);
    v.setUint16(12, date, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, size, true);
    v.setUint32(22, size, true);
    v.setUint16(26, name.length, true);
    v.setUint16(28, 0, true);
    lh.set(name, 30);
    parts.push(lh, e.bytes);
    const ch = new Uint8Array(46 + name.length);
    const w = new DataView(ch.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(10, 0, true);
    w.setUint16(12, time, true);
    w.setUint16(14, date, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, size, true);
    w.setUint32(24, size, true);
    w.setUint16(28, name.length, true);
    w.setUint32(42, offset, true);
    ch.set(name, 46);
    central.push(ch);
    offset += lh.length + size;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const x = new DataView(end.buffer);
  x.setUint32(0, 0x06054b50, true);
  x.setUint16(8, entries.length, true);
  x.setUint16(10, entries.length, true);
  x.setUint32(12, cdSize, true);
  x.setUint32(16, offset, true);
  return [...parts, ...central, end];
}

/** One ZIP file's bytes (tests, small archives). */
export function zipBytes(entries: readonly ZipEntry[]): Uint8Array {
  const ps = zipParts(entries);
  const out = new Uint8Array(ps.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of ps) (out.set(p, o), (o += p.length));
  return out;
}
