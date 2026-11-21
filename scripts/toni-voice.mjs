// Toni's voice clips (docs/TONI-VOICE.md): calls the toneturn-tts edge function (Google Cloud TTS) and writes MP3s.
// Usage: node scripts/toni-voice.mjs voices
//        node scripts/toni-voice.mjs say <voice> <outfile.mp3> <text...>
// The admin token is read from .env.local (TTS_ADMIN_TOKEN) and never printed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const env = readFileSync('.env.local', 'utf8');
const ADMIN = (env.match(/^\s*TTS_ADMIN_TOKEN\s*=\s*(.+)$/m) ?? [])[1]?.trim();
const URL = 'https://jgmahngenrpqnvbvpztf.supabase.co/functions/v1/toneturn-tts';

export async function tts(body) {
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tts-admin': ADMIN }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j.error}`);
  return j;
}

export async function say(voice, text, out, extra = {}) {
  const { mp3 } = await tts({ action: 'say', voice, ...(text.startsWith('<speak') ? { ssml: text } : { text }), ...extra });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(mp3, 'base64'));
}

if (process.argv[1]?.endsWith('toni-voice.mjs')) {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'voices') console.log((await tts({ action: 'voices' })).voices.map((v) => `${v.name} ${v.gender}`).join('\n'));
  else if (cmd === 'say') await say(a[0], a.slice(2).join(' '), a[1]).then(() => console.log('ok', a[1]));
}
