// Toni's voice (docs/TONI-VOICE.md): Google Cloud Text-to-Speech, used only to pre-generate the app's fixed clips.
// Called by scripts/toni-voice.mjs, never by the app. The service-account JSON lives in the GOOGLE_TTS_SA_JSON secret
// (set by the owner); callers must send the TTS_ADMIN_TOKEN secret in x-tts-admin.
//   POST { action: 'voices', lang?: 'he-IL' }                      -> { voices: [{ name, gender, rate }] }
//   POST { action: 'say', text | ssml, voice, lang?, rate?, pitch? } -> { mp3: base64 }

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

interface SA { client_email: string; private_key: string; token_uri?: string }
let cached: { token: string; until: number } | null = null;

const b64url = (b: Uint8Array | string) => {
  const s = typeof b === 'string' ? btoa(unescape(encodeURIComponent(b))) : btoa(String.fromCharCode(...b));
  return s.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

async function token(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const sa = JSON.parse(Deno.env.get('GOOGLE_TTS_SA_JSON') ?? '{}') as SA;
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_TTS_SA_JSON missing');
  const now = Math.floor(Date.now() / 1000);
  const aud = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud, iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`)));
  const r = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64url(sig)}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`token ${r.status}: ${j.error ?? ''} ${j.error_description ?? ''}`);
  cached = { token: j.access_token, until: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

Deno.serve(async (req) => {
  const admin = (Deno.env.get('TTS_ADMIN_TOKEN') ?? '').trim();
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!admin || req.headers.get('x-tts-admin') !== admin) return json({ error: 'forbidden' }, 403);
  try {
    const b = await req.json();
    const lang = b.lang ?? 'he-IL';
    const auth = { Authorization: `Bearer ${await token()}` };
    if (b.action === 'voices') {
      const r = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=${encodeURIComponent(lang)}`, { headers: auth });
      const j = await r.json();
      if (!r.ok) return json({ error: j.error?.message ?? r.status }, 502);
      return json({ voices: (j.voices ?? []).map((v: { name: string; ssmlGender: string; naturalSampleRateHertz: number }) => ({ name: v.name, gender: v.ssmlGender, rate: v.naturalSampleRateHertz })) });
    }
    if (b.action === 'say') {
      if (!b.voice || !(b.text || b.ssml)) return json({ error: 'voice and text/ssml required' }, 400);
      const audioConfig: Record<string, unknown> = { audioEncoding: 'MP3' };
      if (b.rate) audioConfig.speakingRate = b.rate;
      if (b.pitch) audioConfig.pitch = b.pitch;
      const input: Record<string, unknown> = b.ssml ? { ssml: b.ssml } : { text: b.text };
      if (b.prompt) input.prompt = b.prompt;
      const voice: Record<string, unknown> = { languageCode: lang, name: b.voice };
      if (b.model) voice.model_name = b.model; // Gemini-TTS, e.g. gemini-2.5-pro-tts
      const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, voice, audioConfig }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: j.error?.message ?? r.status }, 502);
      return json({ mp3: j.audioContent });
    }
    if (b.action === 'hear') {
      // Intelligibility check: Google Speech-to-Text on a generated clip.
      const r = await fetch('https://speech.googleapis.com/v1p1beta1/speech:recognize', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { encoding: 'MP3', sampleRateHertz: b.hz ?? 24000, languageCode: lang }, audio: { content: b.mp3 } }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: j.error?.message ?? r.status }, 502);
      return json({ text: (j.results ?? []).map((x: { alternatives: { transcript: string }[] }) => x.alternatives?.[0]?.transcript ?? '').join(' ') });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
