// Build the app's instrument sample sets (spec Q) from downloaded sources:
//   node scripts/build-samples.mjs <raw-dir>
// <raw-dir>/grand/*.mp3 (Salamander Grand Piano V3 subset, CC BY 3.0, Alexander Holm) are copied as-is;
// <raw-dir>/<instrument>/*.wav (VCSL, CC0) are converted: mono, 22 050 Hz, 16-bit, trimmed after the
// onset, faded out, normalised per instrument. Each sample's pitch is measured (autocorrelation) and must
// agree with its file name (±40 ¢), so a mislabelled file can never play the wrong note.
// Output: public/samples/<instrument>/<midi>.<ext> + public/samples/manifest.json

import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const RAW = process.argv[2];
const OUT = path.resolve('public/samples');
const RATE = 22050;
const LENGTH = { upright: 2.6, harpsichord: 2.2, harp: 2.6, marimba: 1.6, vibraphone: 2.6, organ: 2.2 };
const RANGE = [36, 96];

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiFromName(n) {
  const m = /(?:^|_)([A-G])(#|s)?(-?\d)(?:_|\.)/.exec(n.replace(/^([A-G])(s?)(\d)\.mp3$/, '_$1$2$3_'));
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] ? 1 : 0);
}

function readWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not wav');
  let p = 12;
  let fmt = null;
  let data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(p + 8), channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') data = buf.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('bad wav');
  const { channels, bits, format } = fmt;
  const bps = bits / 8;
  const frames = Math.floor(data.length / (bps * channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) {
      const o = (i * channels + c) * bps;
      let v;
      if (format === 3 && bits === 32) v = data.readFloatLE(o);
      else if (bits === 16) v = data.readInt16LE(o) / 32768;
      else if (bits === 24) v = ((data[o] | (data[o + 1] << 8) | (data[o + 2] << 16)) << 8 >> 8) / 8388608;
      else if (bits === 32) v = data.readInt32LE(o) / 2147483648;
      else throw new Error(`bits ${bits}`);
      s += v;
    }
    out[i] = s / channels;
  }
  return { rate: fmt.rate, samples: out };
}

/** Low-pass (windowed sinc) + resample to RATE. */
function resample(x, from) {
  const ratio = from / RATE;
  const cutoff = 0.45 / ratio; // relative to source Nyquist… normalised to source rate
  const taps = 48;
  const kernel = [];
  for (let k = -taps; k <= taps; k++) {
    const sinc = k === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * k) / (Math.PI * k);
    const w = 0.42 + 0.5 * Math.cos((Math.PI * k) / taps) + 0.08 * Math.cos((2 * Math.PI * k) / taps);
    kernel.push(sinc * w);
  }
  const n = Math.floor(x.length / ratio);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = i * ratio;
    const ci = Math.floor(c);
    let s = 0;
    for (let k = -taps; k <= taps; k++) {
      const j = ci + k;
      if (j >= 0 && j < x.length) s += x[j] * kernel[k + taps];
    }
    y[i] = s;
  }
  return y;
}

/** Fundamental (Hz) by normalised autocorrelation over the steady part. */
function pitchOf(x, rate) {
  const start = Math.floor(rate * 0.15);
  const len = Math.min(x.length - start, Math.floor(rate * 0.25));
  if (len < 2000) return null;
  const seg = x.subarray(start, start + len);
  let best = 0;
  let bestLag = 0;
  const minLag = Math.floor(rate / 2200);
  const maxLag = Math.floor(rate / 55);
  const r = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i + lag < seg.length; i++) {
      s += seg[i] * seg[i + lag];
      e1 += seg[i] * seg[i];
      e2 += seg[i + lag] * seg[i + lag];
    }
    const v = s / Math.sqrt(e1 * e2 || 1);
    r.push(v);
    if (v > best) {
      best = v;
      bestLag = lag;
    }
  }
  // Prefer the first peak close to the best (avoids octave-down errors).
  for (let i = 1; i < r.length - 1; i++) if (r[i] > 0.9 * best && r[i] >= r[i - 1] && r[i] >= r[i + 1]) return rate / (i + minLag);
  return bestLag ? rate / bestLag : null;
}

function writeWav16(y) {
  const buf = Buffer.alloc(44 + y.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + y.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(y.length * 2, 40);
  for (let i = 0; i < y.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767))), 44 + i * 2);
  return buf;
}

const manifest = { credits: { grand: 'Salamander Grand Piano V3 — Alexander Holm (CC BY 3.0)', vcsl: 'Versilian Community Sample Library — Versilian Studios (CC0)' }, sets: {} };

// Grand piano: copy mp3s.
{
  const dir = path.join(RAW, 'grand');
  await mkdir(path.join(OUT, 'grand'), { recursive: true });
  const notes = [];
  for (const f of (await readdir(dir)).filter((n) => n.endsWith('.mp3'))) {
    const m = midiFromName(f);
    if (m === null || m < RANGE[0] - 3 || m > RANGE[1] + 3) continue;
    await copyFile(path.join(dir, f), path.join(OUT, 'grand', `${m}.mp3`));
    notes.push(m);
  }
  manifest.sets.grand = { ext: 'mp3', notes: notes.sort((a, b) => a - b) };
  console.log('grand', notes.length);
}

for (const inst of Object.keys(LENGTH)) {
  const dir = path.join(RAW, inst);
  let files;
  try {
    files = (await readdir(dir)).filter((n) => n.toLowerCase().endsWith('.wav'));
  } catch {
    continue;
  }
  const items = [];
  for (const f of files) {
    const named = midiFromName(f);
    if (named === null || named < RANGE[0] || named > RANGE[1]) continue;
    const { rate, samples } = readWav(await readFile(path.join(dir, f)));
    let y = rate === RATE ? samples : resample(samples, rate);
    // Onset: first sample above −40 dB of the peak.
    let peak = 0;
    for (const v of y) peak = Math.max(peak, Math.abs(v));
    const thr = peak * 0.01;
    let on = 0;
    while (on < y.length && Math.abs(y[on]) < thr) on++;
    on = Math.max(0, on - Math.floor(RATE * 0.004));
    y = y.slice(on, on + Math.floor(RATE * LENGTH[inst]));
    const hz = pitchOf(y, RATE);
    const measured = hz ? 69 + 12 * Math.log2(hz / 440) : null;
    const off = measured === null ? null : Math.round((measured - named) * 100);
    // Accept the name when the measurement agrees (±40 ¢) or is an octave error of the detector.
    const ok = off !== null && [0, 1200, -1200, 1900, -1900].some((o) => Math.abs(off - o) <= 40);
    if (!ok) {
      console.log(`  skip ${inst}/${f}: named ${named}, measured ${measured?.toFixed(2)}`);
      continue;
    }
    items.push({ midi: named, y, peak });
  }
  if (!items.length) continue;
  // De-duplicate notes, normalise the set so its loudest sample peaks at −1 dB, fade out.
  const byMidi = new Map();
  for (const it of items) if (!byMidi.has(it.midi)) byMidi.set(it.midi, it);
  const maxPeak = Math.max(...[...byMidi.values()].map((i) => i.peak));
  const gain = 0.89 / maxPeak;
  await mkdir(path.join(OUT, inst), { recursive: true });
  for (const { midi, y } of byMidi.values()) {
    const fade = Math.floor(RATE * 0.18);
    for (let i = 0; i < y.length; i++) y[i] *= gain * (i > y.length - fade ? (y.length - i) / fade : 1);
    await writeFile(path.join(OUT, inst, `${midi}.wav`), writeWav16(y));
  }
  manifest.sets[inst] = { ext: 'wav', notes: [...byMidi.keys()].sort((a, b) => a - b) };
  console.log(inst, byMidi.size, 'notes');
}
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
