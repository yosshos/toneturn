// The AI coach and "Explain more" on the client (docs/SPEC-AI.he.md §8–9): one call to the toneturn-ai edge function.
// The key lives only on the server. Signed-in players only; without a session, offline, or over the daily cap the
// caller gets a reason and the app simply works as before. In sim mode (?sim=1) answers are scripted.

import { supabase } from './cloud';

export type AiKind = 'card' | 'weekly' | 'explain' | 'hint';
export type AiError = 'signin' | 'cap' | 'unavailable';
export type AiResult = { text: string; cached?: boolean } | { error: AiError };

export interface AiRequest {
  lang: 'he' | 'en';
  naming?: string;
  /** What the app knows about the moment (topic, question, answers, profile digest) — measured data only. */
  context: Record<string, unknown>;
  /** Follow-up turns after the first answer (explain). */
  followups?: { role: 'user' | 'assistant'; text: string }[];
  /** Advanced jazz: the stronger model. */
  jazz?: boolean;
}

const sim = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('sim');
const memo = new Map<string, AiResult>();

function scripted(kind: AiKind, r: AiRequest): AiResult {
  const he = r.lang === 'he';
  const t: Record<AiKind, string> = {
    card: he ? 'הזיהוי של מז׳ור ומינור יציב. בפעם הבאה: להקשיב לצליל האמצעי לפני שעונים.' : 'Major and minor are steady now. Next time: listen to the middle note before you answer.',
    weekly: he ? 'השבוע הזמן שלכם התייצב. הבלבול בין סקסטה לספטימה עדיין חוזר — שווה לתרגל את שתיהן זו לצד זו.' : 'Your time steadied this week. The sixth/seventh mix-up still recurs — practise the two side by side.',
    explain: he ? 'הסבר לדוגמה (מצב סימולציה).' : 'A sample explanation (simulation mode).',
    hint: he ? 'הקשיבו לכיוון: האם הצליל השני עולה או יורד?' : 'Listen to the direction: does the second note go up or down?',
  };
  return { text: r.followups?.length ? (he ? 'תשובת המשך לדוגמה.' : 'A sample follow-up answer.') : t[kind] };
}

export async function askAi(kind: AiKind, r: AiRequest): Promise<AiResult> {
  const key = JSON.stringify([kind, r]);
  const hit = memo.get(key);
  if (hit) return hit;
  if (sim()) {
    await new Promise((res) => setTimeout(res, 250));
    return scripted(kind, r);
  }
  const sb = supabase();
  if (!sb) return { error: 'unavailable' };
  const { data: sess } = await sb.auth.getSession();
  if (!sess.session) return { error: 'signin' };
  try {
    const { data, error } = await sb.functions.invoke('toneturn-ai', { body: { kind, ...r } });
    if (error) {
      let code = '';
      try {
        code = ((await (error as { context?: Response }).context?.json()) as { error?: string })?.error ?? '';
      } catch {
        /* no body */
      }
      return { error: code === 'signin' ? 'signin' : code === 'cap' ? 'cap' : 'unavailable' };
    }
    const out = data as { text?: string; cached?: boolean };
    if (!out?.text) return { error: 'unavailable' };
    const res = { text: out.text, cached: out.cached };
    memo.set(key, res);
    return res;
  } catch {
    return { error: 'unavailable' };
  }
}

export const aiErrorText = (e: AiError, lang: 'he' | 'en'): string =>
  lang === 'he'
    ? { signin: 'התחברו לחשבון כדי לקבל הסבר מורחב.', cap: 'הגעתם למכסת ההסברים להיום. מחר יש עוד.', unavailable: 'ההסבר לא זמין כרגע. נסו שוב עוד מעט.' }[e]
    : { signin: 'Sign in to get a fuller explanation.', cap: 'That’s today’s explanations. More tomorrow.', unavailable: 'Not available right now. Try again in a moment.' }[e];
