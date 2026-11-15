// Supabase Edge Function: hourly streak reminders via Web Push, and the social push budget (migration
// 20261130120000): nudges, cheers, friend requests, duels and quests go out as at most ONE merged push a day per
// player, outside their quiet hours (planned by ../_shared/socialPush.ts). A call with {"queue": true} (the duel
// trigger) only runs the queue / social part.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { planSocialPush, type SocialItem } from '../_shared/socialPush.ts';

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

/** Message per kind (spec N.6). AUDIT-5 #4: plan-framed and emoji-free — what is waiting, not what could be lost; a
 * practice day is measured practice (a take, a finished session, or 5 measured minutes). */
function message(kind: string, lang: 'en' | 'he', n: number): { title: string; body: string } {
  const nextIsMilestone = MILESTONES.includes(n + 1);
  if (lang === 'he') {
    if (kind === 'freeze_used') return { title: 'ההקפאה כיסתה את אתמול', body: `${n} ימי אימון ברצף. התוכנית של היום מחכה.` };
    if (kind === 'at_risk') return { title: 'האימון של היום מחכה', body: `חמש דקות של נגינה נמדדת נספרות כיום אימון (${n} ברצף).` };
    return nextIsMilestone
      ? { title: `מחר ${n + 1} ימי אימון`, body: 'התוכנית של היום מוכנה: חזרה קצרה ועבודה על מה שבקצה.' }
      : { title: 'התוכנית של היום מוכנה', body: `חזרה קצרה ועבודה על מה שבקצה. ${n} ימי אימון ברצף.` };
  }
  if (kind === 'freeze_used') return { title: 'A freeze covered yesterday', body: `${n} practice days in a row. Today's plan is waiting.` };
  if (kind === 'at_risk') return { title: "Today's practice is waiting", body: `Five measured minutes make a practice day (${n} in a row).` };
  return nextIsMilestone
    ? { title: `Tomorrow: ${n + 1} practice days`, body: "Today's plan is ready: a short review and work at your edge." }
    : { title: "Today's plan is ready", body: `A short review and work at your edge. ${n} practice days in a row.` };
}

/** One-off notifications (friend duels). */
function queueMessage(kind: string, lang: 'en' | 'he', d: { from?: string; mine?: number; theirs?: number }): { title: string; body: string } {
  const who = d.from || (lang === 'he' ? 'חבר' : 'A friend');
  if (kind === 'duel_new')
    return lang === 'he' ? { title: 'הוזמנתם לדו־קרב', body: `${who} שיחק את הסיבוב שלו — תורכם.` } : { title: 'You were challenged', body: `${who} played their round — your turn.` };
  const mine = d.mine ?? 0;
  const theirs = d.theirs ?? 0;
  if (lang === 'he') {
    const r = mine > theirs ? 'ניצחתם' : mine < theirs ? `${who} ניצח` : 'תיקו';
    return { title: `הדו־קרב הסתיים: ${r}`, body: `${who} שיחק את הדו־קרב: ${mine} מול ${theirs}.` };
  }
  const r = mine > theirs ? 'you won' : mine < theirs ? `${who} won` : 'a draw';
  return { title: `Duel over: ${r}`, body: `${who} played your duel: ${mine} vs ${theirs}.` };
}

async function sendQueue(db: ReturnType<typeof createClient>) {
  const { data: rows, error } = await db.rpc('toneturn_push_queue_due');
  if (error) return { error: error.message, sent: 0 };
  let sent = 0;
  const done = new Set<number>();
  for (const r of rows ?? []) {
    const m = queueMessage(r.kind, r.lang === 'he' ? 'he' : 'en', r.data ?? {});
    try {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        JSON.stringify({ title: m.title, body: m.body, tag: `duel-${r.data?.duel ?? r.queue_id}`, url: '/#friends' }),
        { TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('toneturn_push_subscriptions').delete().eq('id', r.sub_id);
    }
    done.add(r.queue_id);
  }
  if (done.size) await db.from('toneturn_push_queue').update({ sent_at: new Date().toISOString() }).in('id', [...done]);
  return { sent };
}

/** The social budget: one merged push a day per player (claimed in toneturn_push_log before sending). */
async function sendSocial(db: ReturnType<typeof createClient>) {
  const { data: rows, error } = await db.rpc('toneturn_social_push_due');
  if (error) return { error: error.message, sent: 0 };
  let sent = 0;
  const now = new Date();
  for (const r of rows ?? []) {
    const plan = planSocialPush({
      items: (r.items ?? []) as SocialItem[],
      now,
      tz: r.tz ?? 'UTC',
      lang: r.lang === 'he' ? 'he' : 'en',
      quietFrom: r.quiet_from,
      quietTo: r.quiet_to,
      lastDay: r.last_day,
    });
    if (!plan.send) continue;
    const { data: claimed } = await db.rpc('toneturn_social_push_claim', { p_user: r.user_id, p_day: plan.day, p_ids: plan.ids });
    if (!claimed) continue;
    for (const s of (r.subs ?? []) as { id: number; endpoint: string; p256dh: string; auth: string }[]) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: plan.title, body: plan.body, tag: 'social', url: '/#friends' }),
          { TTL: 60 * 60 * 12 },
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('toneturn_push_subscriptions').delete().eq('id', s.id);
      }
    }
  }
  return { sent };
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const queue = await sendQueue(db);
  const social = await sendSocial(db);
  if (body?.queue) return new Response(JSON.stringify({ queue, social }), { headers: { 'content-type': 'application/json' } });

  const { data: due, error } = await db.rpc('toneturn_due_reminders');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  let removed = 0;
  for (const s of due ?? []) {
    const m = message(s.kind ?? 'evening', s.lang === 'he' ? 'he' : 'en', s.streak);
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: m.title, body: m.body, tag: 'streak', url: '/' }),
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
  return new Response(JSON.stringify({ due: due?.length ?? 0, sent, removed, queue, social }), { headers: { 'content-type': 'application/json' } });
});
