// Supabase Edge Function: hourly streak reminders via Web Push, and the social push budget (migration
// 20261130120000): nudges, cheers, friend requests, duels and quests go out as at most ONE merged push a day per
// player, outside their quiet hours (planned by ../_shared/socialPush.ts). A call with {"queue": true} (the duel
// trigger) only runs the queue / social part. Class notifications (SPEC-CLASS-NOTIFICATIONS, migration 20261214000000):
// their own queue, sent by the class planner — a call with {"class": true} (every 5 minutes) runs only that; the
// hourly run also sends the A2 due reminders, merged with the evening reminder when both go out.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { planSocialPush, type SocialItem } from '../_shared/socialPush.ts';
import { planClassPush, planDueReminder, STUDENT_CAP, TEACHER_CAP, type ClassItem, type DueItem } from '../_shared/classPush.ts';

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

type Sub = { id: number; endpoint: string; p256dh: string; auth: string };
type DB = ReturnType<typeof createClient>;

/** Send one payload to a user's devices (a dead endpoint is removed). */
async function toDevices(db: DB, subs: Sub[] | null, payload: Record<string, unknown>, opts: { TTL: number; urgency?: 'high' | 'normal' }) {
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), opts);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('toneturn_push_subscriptions').delete().eq('id', s.id);
    }
  }
  return sent;
}

/** Class notifications: a merged push to students, the teacher's daily digest (each claimed against its cap). */
async function sendClass(db: DB) {
  const { data: rows, error } = await db.rpc('toneturn_class_push_due');
  if (error) return { error: error.message, sent: 0 };
  let sent = 0;
  const now = new Date();
  for (const r of rows ?? []) {
    const plan = planClassPush({
      items: (r.items ?? []) as ClassItem[],
      now,
      tz: r.tz ?? 'UTC',
      lang: r.lang === 'he' ? 'he' : 'en',
      quietFrom: r.quiet_from,
      quietTo: r.quiet_to,
      birthYear: r.birth_year,
      notify: r.notify,
      digestHour: r.digest_hour,
      sent: r.sent,
    });
    for (const d of plan.drop) await db.rpc('toneturn_class_push_claim', { p_user: r.user_id, p_role: d.role, p_day: plan.day, p_cap: 0, p_ids: d.ids });
    for (const p of plan.pushes) {
      const { data: ok } = await db.rpc('toneturn_class_push_claim', { p_user: r.user_id, p_role: p.role, p_day: plan.day, p_cap: p.role === 'student' ? STUDENT_CAP : TEACHER_CAP, p_ids: p.ids });
      if (!ok) continue;
      const n = await toDevices(db, r.subs as Sub[] | null, { title: p.title, body: p.body, tag: p.tag, url: p.url }, { TTL: p.ttl, urgency: p.urgency });
      // reached no device: the items wait for the next run and the day's slot is given back
      if (n === 0) await db.rpc('toneturn_class_push_unclaim', { p_user: r.user_id, p_role: p.role, p_day: plan.day, p_ids: p.ids });
      sent += n;
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
  // the class path runs only on its own 5-minute call (review: the hourly and 5-minute runs met at :00)
  if (body?.class) return new Response(JSON.stringify({ class: await sendClass(db) }), { headers: { 'content-type': 'application/json' } });
  const queue = await sendQueue(db);
  const social = await sendSocial(db);
  if (body?.queue) return new Response(JSON.stringify({ queue, social }), { headers: { 'content-type': 'application/json' } });

  // A2: tomorrow's class assignments without a submission, at the student's reminder hour (no streak needed)
  const { data: dueRows } = await db.rpc('toneturn_class_due_reminders');
  const classDue = new Map<string, Record<string, unknown>>();
  for (const r of dueRows ?? []) classDue.set(r.user_id as string, r);
  const merged = new Set<string>();
  let dueSent = 0;
  const duePlan = (r: Record<string, unknown>, streak?: number) =>
    planDueReminder({ items: (r.items ?? []) as DueItem[], now: new Date(), lang: r.lang === 'he' ? 'he' : 'en', birthYear: r.birth_year as number | null, notify: r.notify as Record<string, unknown> | null, sent: r.sent as { student?: number } | null, today: r.local_day as string, streak });
  const claimDue = async (r: Record<string, unknown>, assignments: string[]) => {
    const { data: ok } = await db.rpc('toneturn_class_due_claim', { p_user: r.user_id, p_day: r.local_day, p_cap: STUDENT_CAP, p_assignments: assignments });
    return !!ok;
  };

  const { data: due, error } = await db.rpc('toneturn_due_reminders');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;
  let removed = 0;
  for (const s of due ?? []) {
    let m = message(s.kind ?? 'evening', s.lang === 'he' ? 'he' : 'en', s.streak);
    // the evening reminder and a class due reminder in the same run: one message
    const cd = s.user_id ? classDue.get(s.user_id) : undefined;
    if (cd && s.kind === 'evening') {
      const p = duePlan(cd, s.streak);
      if (p && (merged.has(s.user_id) || (await claimDue(cd, p.assignments)))) {
        merged.add(s.user_id);
        m = { title: p.title, body: p.body };
      }
    }
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: m.title, body: m.body, tag: 'streak', url: s.user_id && merged.has(s.user_id) ? '/#/classes' : '/' }),
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
  // the rest of the due reminders on their own
  for (const [user, r] of classDue) {
    if (merged.has(user)) continue;
    const p = duePlan(r);
    if (!p || !(await claimDue(r, p.assignments))) continue;
    dueSent += await toDevices(db, r.subs as Sub[] | null, { title: p.title, body: p.body, tag: 'class-due', url: '/#/classes' }, { TTL: 60 * 60 * 20, urgency: 'high' });
  }
  return new Response(JSON.stringify({ due: due?.length ?? 0, sent, removed, queue, social, classDue: dueSent + merged.size }), { headers: { 'content-type': 'application/json' } });
});
