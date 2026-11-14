// Supabase Edge Function: the AI coach and "Explain more" (docs/SPEC-AI.he.md §2, §8, §9; owner decisions 2026-11-14).
//  - card    after a session: one or two sentences on what was measured (Claude Haiku 5.5).
//  - weekly  the week's summary from the player profile digest (Claude Opus 5.5).
//  - explain more explanation of a topic / a missed question, with follow-ups (Claude Sonnet 5.5; Opus 5.5 for jazz).
//  - hint    a nudge before answering, which must never give the answer away (Claude Sonnet 5.5).
//  - health  whether the key is set (never the key itself).
// The model never grades and never sets a level: it phrases what the app measured, and explains music.
// Signed-in players only (the daily caps are per player). First-turn explanations are cached for everyone.
// Secret: the Anthropic API key, as ANTHROPIC_API_KEY or under the owner's name for it (claude-7sense-cauch).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Kind = 'card' | 'weekly' | 'explain' | 'hint';
const MODEL: Record<Kind, string> = { card: 'claude-haiku-5-5', weekly: 'claude-opus-5-5', explain: 'claude-sonnet-5-5', hint: 'claude-sonnet-5-5' };
const MAX_TOKENS: Record<Kind, number> = { card: 400, weekly: 1500, explain: 1500, hint: 400 };
const EFFORT: Record<Kind, 'low' | 'medium'> = { card: 'low', weekly: 'medium', explain: 'medium', hint: 'low' };
/** New (uncached) answers per player per day. */
const CAP: Record<Kind, number> = { card: 30, weekly: 3, explain: 20, hint: 30 };
const MAX_FOLLOWUPS = 4;
const MAX_FIELD = 1200;

const apiKey = () => (Deno.env.get('ANTHROPIC_API_KEY') ?? Deno.env.get('claude-7sense-cauch') ?? '').trim();

function systemPrompt(kind: Kind, lang: 'he' | 'en', naming: string): string {
  const langLine =
    lang === 'he'
      ? 'Write in natural, fluent Hebrew (not translated-sounding), addressing the player in the plural form (אתם) as the app does. Keep music terms the way Israeli musicians say them (מז׳ור, מינור, ספטימה, קדנצה).'
      : 'Write in plain, warm English.';
  const names = naming === 'solfege' ? 'Name notes in solfège (Do Re Mi), as the app does.' : 'Name notes with letters (C D E), as the app does.';
  const common = [
    'You are the music teacher inside "The 7th Sense", an ear-training and music app with a mature, serious tone (jazz, harmony, sophisticated music; pop as an on-ramp).',
    langLine,
    names,
    'No emoji, no exclamation-mark cheerleading, no filler. Never invent scores, levels or measurements: use only the data you are given.',
    'Stay on music. If asked about anything else, say briefly that you only help with music and the exercise at hand.',
  ];
  const by: Record<Kind, string> = {
    card: 'Write a short note after a practice session: at most two sentences, about 30 words. Name one concrete thing from the data (a strength or a pattern) and one concrete next step. Plain text only.',
    weekly:
      'Write the week\'s summary from the player profile: 4–7 short sentences. Start with what improved or what is solid, then the one or two recurring patterns that matter most and how they may connect, then a concrete plan for the coming week that uses the "practise" suggestions given. Plain text, short paragraphs, no headings.',
    explain:
      'Explain the topic or the question the player asks about, at their level: start from what they hear, then the theory, then one way to recognise it next time. 80–180 words. When they answered wrong, explain what distinguishes their answer from the right one, by sound. Plain text, short paragraphs; a simple list is fine. Be accurate: if unsure, say so rather than guess.',
    hint:
      'Give ONE short hint (one or two sentences) that helps the player find the answer by listening. NEVER state, spell, spell out or clearly imply the right answer, and do not eliminate all but one option. Point their attention to what to listen for.',
  };
  return [...common, by[kind]].join('\n');
}

const clip = (s: unknown) => String(s ?? '').slice(0, MAX_FIELD);

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad-json' }, 400);
  }
  const key = apiKey();
  if (body.kind === 'health') {
    // The key's kind by its public prefix only, and (probe) whether one tiny call goes through. Never the key.
    const shape = key.startsWith('sk-ant-api') ? 'api' : key.startsWith('sk-ant-') ? key.slice(7, 10) : key ? 'other' : 'none';
    const out: Record<string, unknown> = { ok: true, key: !!key, shape, spaces: key !== key.trim() };
    if (body.probe && key) {
      try {
        await new Anthropic({ apiKey: key.trim() }).messages.create({ model: 'claude-haiku-5-5', max_tokens: 16, messages: [{ role: 'user', content: 'Reply: ok' }] });
        out.probe = 'ok';
      } catch (e) {
        out.probe = e instanceof Anthropic.AuthenticationError ? 'auth' : e instanceof Anthropic.APIError ? `api-${e.status}` : 'failed';
      }
    }
    return json(out);
  }

  const kind = body.kind as Kind;
  if (!(kind in MODEL)) return json({ error: 'kind' }, 400);
  if (!key) return json({ error: 'no-key' }, 503);

  const url = Deno.env.get('SUPABASE_URL')!;
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who } = await db.auth.getUser(jwt);
  const user = who?.user;
  if (!user) return json({ error: 'signin' }, 401);

  const lang = body.lang === 'en' ? 'en' : 'he';
  const naming = body.naming === 'solfege' ? 'solfege' : 'letter';
  const context = clip(JSON.stringify(body.context ?? {}));
  const follow = (Array.isArray(body.followups) ? body.followups : []).slice(0, MAX_FOLLOWUPS * 2) as { role: string; text: string }[];
  const jazz = body.jazz === true;
  const model = kind === 'explain' && jazz ? 'claude-opus-5-5' : MODEL[kind];

  // First-turn explanations and hints are the same for everyone at the same question: cache them.
  const cacheable = (kind === 'explain' || kind === 'hint') && follow.length === 0 && body.cache !== false;
  const ckey = cacheable ? await sha(`${kind}|${model}|${lang}|${naming}|${context}`) : null;
  if (ckey) {
    const { data: hit } = await db.from('toneturn_ai_cache').select('body').eq('key', ckey).maybeSingle();
    if (hit?.body?.text) return json({ text: hit.body.text, cached: true });
  }

  const day = new Date().toISOString().slice(0, 10);
  const { data: used } = await db.from('toneturn_ai_usage').select('n').eq('user_id', user.id).eq('day', day).eq('kind', kind).maybeSingle();
  if ((used?.n ?? 0) >= CAP[kind]) return json({ error: 'cap' }, 429);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: `Data from the app (JSON):\n${context}` }];
  for (const m of follow) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const text = clip(m.text).trim();
    if (!text) continue;
    const last = messages[messages.length - 1];
    if (last.role === role) last.content += `\n\n${text}`;
    else messages.push({ role, content: text });
  }
  if (messages[messages.length - 1].role !== 'user') return json({ error: 'turns' }, 400);

  const client = new Anthropic({ apiKey: key });
  const ask = async (extra = '') => {
    const r = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS[kind],
      system: systemPrompt(kind, lang, naming) + extra,
      output_config: { effort: EFFORT[kind] },
      messages,
    });
    if (r.stop_reason === 'refusal') return '';
    return r.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  };
  let text = '';
  try {
    text = await ask();
    // A hint that names the answer is no hint: one stricter try, then nothing.
    const answer = String((body.context as { answer?: unknown } | undefined)?.answer ?? '').trim();
    const leaks = (t: string) => kind === 'hint' && answer.length >= 2 && t.toLowerCase().includes(answer.toLowerCase());
    if (leaks(text)) {
      text = await ask(`\nThe answer is "${answer}". Do not write it or any synonym of it.`);
      if (leaks(text)) text = '';
    }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'bad-key' }, 503);
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: 'api', status: e.status }, 502);
    return json({ error: 'failed' }, 500);
  }
  if (!text) return json({ error: 'empty' }, 502);

  await db.from('toneturn_ai_usage').upsert({ user_id: user.id, day, kind, n: (used?.n ?? 0) + 1 }, { onConflict: 'user_id,day,kind' });
  if (ckey) await db.from('toneturn_ai_cache').upsert({ key: ckey, kind, body: { text } }, { onConflict: 'key' });
  return json({ text });
});
