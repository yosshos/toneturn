// A listening sample per locale voice: a few translated narrator lines → one MP3 per locale (for the owner's ear
// before the full render). Usage: node scripts/voice/sample-locales.mjs <outDir> [count=4]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Mp3Encoder } from '@breezystack/lamejs';
import { loadKokoro, speakLocale, unknownSymbols, LOCALE_VOICES } from './locale-kokoro.mjs';

const [outDir, countArg] = process.argv.slice(2);
const COUNT = Number(countArg ?? 4);
mkdirSync(outDir, { recursive: true });
const lines = JSON.parse(readFileSync('scripts/voice/.lines.json', 'utf8')).filter((l) => l.src === 'mini');

function mp3(f32, sr) {
  let peak = 0;
  for (const x of f32) peak = Math.max(peak, Math.abs(x));
  const g = peak > 0 ? Math.min(3, 0.89 / peak) : 1;
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * g * 32767)));
  const enc = new Mp3Encoder(1, sr, 48);
  const parts = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const b = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (b.length) parts.push(Buffer.from(b));
  }
  parts.push(Buffer.from(enc.flush()));
  return Buffer.concat(parts);
}

const tts = await loadKokoro();
for (const loc of Object.keys(LOCALE_VOICES)) {
  const cat = JSON.parse(readFileSync(`public/i18n/${loc}.json`, 'utf8'));
  const picked = lines.filter((l) => cat[l.say] && l.say.length < 200).slice(0, COUNT);
  const gap = new Float32Array(24000 * 0.7);
  const all = [];
  const txt = [];
  for (const l of picked) {
    const r = await speakLocale(tts, cat[l.say], loc);
    const unk = unknownSymbols(tts, r.phonemes);
    txt.push(`${cat[l.say]}\n  /${r.phonemes}/${unk.length ? `  unknown: ${unk.join(' ')}` : ''}`);
    all.push(r.audio, gap);
  }
  const n = all.reduce((s, a) => s + a.length, 0);
  const f = new Float32Array(n);
  let o = 0;
  for (const a of all) {
    f.set(a, o);
    o += a.length;
  }
  writeFileSync(path.join(outDir, `sample-${loc}.mp3`), mp3(f, 24000));
  console.log(`== ${loc} (${LOCALE_VOICES[loc]})\n${txt.join('\n')}`);
}
