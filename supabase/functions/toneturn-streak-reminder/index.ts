// Supabase Edge Function: hourly streak reminders via Web Push.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const MESSAGES = {
  en: { title: 'Keep your streak 🔥', body: (n: number) => `${n}-day streak. One short lesson keeps it alive.` },
  he: { title: 'שמרו על הרצף 🔥', body: (n: number) => `רצף של ${n} ימים. שיעור קצר אחד שומר עליו.` },
};

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: due, error } = await db.rpc('toneturn_due_reminders');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  let removed = 0;
  for (const s of due ?? []) {
    const m = MESSAGES[s.lang === 'he' ? 'he' : 'en'];
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: m.title, body: m.body(s.streak), tag: 'streak', url: '/' }),
        { TTL: 60 * 60 * 3 },
      );
      sent++;
      await db.from('toneturn_push_subscriptions').update({ last_sent_on: s.local_day }).eq('id', s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        // Subscription expired or revoked by the browser.
        await db.from('toneturn_push_subscriptions').delete().eq('id', s.id);
        removed++;
      }
    }
  }
  return new Response(JSON.stringify({ due: due?.length ?? 0, sent, removed }), { headers: { 'content-type': 'application/json' } });
});
