// Renders the narrator's lines offline with Kokoro (af_heart, speed 1) into public/voice/en/<id>.mp3 and keeps
// public/voice/en/manifest.json (id → duration ms) up to date. Incremental: lines already in the manifest are
// skipped, so it can be stopped and started again. Lines come from scripts/voice/.lines.json (npm run voice:lines),
// in priority order (mini-lessons and intros first).
//   node scripts/voice/render.mjs [--device cpu|dml] [--dtype fp32|q8] [--limit N] [--src mini,intro,...]
// MP3, mono, 24 kHz, 32 kbps (MPEG-2 layer III): plays everywhere (iOS Safari too), ~4 KB per second of speech.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';
import { Mp3Encoder } from '@breezystack/lamejs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const DEVICE = arg('device', 'cpu');
const DTYPE = arg('dtype', 'fp32');
const LIMIT = Number(arg('limit', Infinity));
// Default: only the fixed lines the app plays from files (prompts / feedback are made per question and are never shipped — 0.69).
const SRC = (arg('src', null) ?? 'mini,mini-name,intro,go,preview,memory,other').split(',');
// --shard k/n: this process renders every n-th line (run n processes side by side); each writes its own part file
// and merges all parts into manifest.json on every save.
const [SHARD, SHARDS] = (arg('shard', '0/1')).split('/').map(Number);
const VOICE = 'af_heart';
const MODEL = 'k82m-v1';
// 48 kbps: lamejs at 32 kbps resamples 24 kHz to 22.05 kHz and writes SILENCE (every 0.66–0.74 file decoded to a
// peak of 1e-5 — the owner heard only pops on the phone). 48 kbps keeps 24 kHz and the speech. Checked 2026-11-11.
const KBPS = 48;

const OUT = path.resolve('public/voice/en');
const MANIFEST = path.join(OUT, 'manifest.json');
mkdirSync(OUT, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { v: 1, voice: VOICE, model: MODEL, files: {} };
if (manifest.voice !== VOICE || manifest.model !== MODEL) throw new Error('manifest is for another voice/model: clear public/voice/en first');

const PART = path.join(OUT, `manifest.part${SHARD}.json`);
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const parts = () => readdirSync(OUT).filter((f) => /^manifest\.part\d+\.json$/.test(f)).map((f) => readJson(path.join(OUT, f))?.files ?? {});
for (const p of parts()) Object.assign(manifest.files, p);
const mine = readJson(PART)?.files ?? {};

const lines = JSON.parse(readFileSync(new URL('./.lines.json', import.meta.url), 'utf8'));
const todo = lines.filter((l, i) => i % SHARDS === SHARD && !manifest.files[l.key] && (!SRC || SRC.includes(l.src))).slice(0, LIMIT);
console.log(`${lines.length} lines, ${Object.keys(manifest.files).length} rendered, ${todo.length} to do (${DEVICE}, ${DTYPE})`);
if (!todo.length) process.exit(0);

const write = (p, files) => {
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ v: 1, voice: VOICE, model: MODEL, files: Object.fromEntries(Object.entries(files).sort()) }));
  renameSync(tmp, p);
};
const save = () => {
  write(PART, mine);
  const all = { ...(readJson(MANIFEST)?.files ?? {}) };
  for (const p of parts()) Object.assign(all, p);
  write(MANIFEST, all);
};

function mp3(f32, sr) {
  // gentle peak normalisation to −1 dBFS so every line sits at the same level
  let peak = 0;
  for (const x of f32) peak = Math.max(peak, Math.abs(x));
  const g = peak > 0 ? Math.min(3, 0.89 / peak) : 1;
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * g * 32767)));
  const enc = new Mp3Encoder(1, sr, KBPS);
  const parts = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const b = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (b.length) parts.push(Buffer.from(b));
  }
  const end = enc.flush();
  if (end.length) parts.push(Buffer.from(end));
  return Buffer.concat(parts);
}

/** Whole sentences, packed up to ~220 characters per generation. */
function pieces(text) {
  if (text.length <= 220) return [text];
  const out = [];
  let cur = '';
  for (const s of text.split(/(?<=[.!?:;])\s+/)) {
    if (cur && cur.length + s.length + 1 > 220) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: DTYPE, device: DEVICE });
const t0 = Date.now();
let audioMs = 0;
let done = 0;
for (const l of todo) {
  // long lines go sentence by sentence (the model takes ≤ 510 phoneme tokens at a time)
  const chunks = [];
  let sr = 24000;
  // (kokoro-js' stream() never settles on a plain string here, so long lines are split by sentence ourselves)
  for (const part of pieces(l.say)) {
    const a = await tts.generate(part, { voice: VOICE, speed: 1 });
    chunks.push(a.audio);
    sr = a.sampling_rate;
  }
  const n = chunks.reduce((s, c) => s + c.length, 0);
  const f32 = new Float32Array(n);
  let o = 0;
  for (const c of chunks) {
    f32.set(c, o);
    o += c.length;
  }
  writeFileSync(path.join(OUT, `${l.key}.mp3`), mp3(f32, sr));
  const ms = Math.round((1000 * n) / sr);
  manifest.files[l.key] = ms;
  mine[l.key] = ms;
  audioMs += ms;
  done++;
  if (done % 10 === 0 || done === todo.length) {
    save();
    const el = (Date.now() - t0) / 1000;
    console.log(`${done}/${todo.length}  audio ${(audioMs / 60000).toFixed(1)} min  RTF ${(el / (audioMs / 1000)).toFixed(2)}  eta ${(((todo.length - done) * el) / done / 60).toFixed(0)} min`);
  }
}
save();
