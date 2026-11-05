// Friends, game bests and push-reminder subscriptions (all optional; need sign-in).

import { supabase } from './cloud';
import { swRegistration } from '../pwa';

export interface FriendRow {
  user_id: string;
  name: string;
  relation: 'me' | 'friend' | 'incoming' | 'outgoing';
  week_xp: number | null;
  total_xp: number | null;
  streak: number | null;
  lessons_done: number | null;
  best_melody: number | null;
  best_rhythm: number | null;
  last_active: string | null;
  /** Overall rating (spec L); absent until the server has the rating migration. */
  rating?: number | null;
  rating_provisional?: boolean | null;
}

export interface MyProfile {
  friend_code: string;
  display_name: string | null;
  tz: string;
  reminder_hour: number;
}

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export async function myProfile(name?: string | null, hour?: number): Promise<MyProfile | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('toneturn_my_profile', { p_name: name ?? null, p_tz: localTz(), p_hour: hour ?? null });
  if (error) throw error;
  return (data as MyProfile[])[0] ?? null;
}

export async function listFriends(): Promise<FriendRow[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('toneturn_friends');
  if (error) throw error;
  return data as FriendRow[];
}

export type AddFriendResult = 'requested' | 'accepted' | 'already' | 'not_found' | 'self';
export async function addFriend(code: string): Promise<AddFriendResult> {
  const sb = supabase();
  if (!sb) throw new Error('not configured');
  const { data, error } = await sb.rpc('toneturn_add_friend', { p_code: code });
  if (error) throw error;
  return data as AddFriendResult;
}

export async function respondFriend(other: string, accept: boolean) {
  const { error } = (await supabase()?.rpc('toneturn_respond_friend', { p_other: other, p_accept: accept })) ?? { error: null };
  if (error) throw error;
}

export async function removeFriend(other: string) {
  const { error } = (await supabase()?.rpc('toneturn_remove_friend', { p_other: other })) ?? { error: null };
  if (error) throw error;
}

export async function reportGameBest(kind: 'melody' | 'rhythm', best: number) {
  if (best <= 0) return;
  await supabase()?.rpc('toneturn_report_game_best', { p_kind: kind, p_best: best });
}

/** Rank by this week's XP, then streak, then name. "me" included. Pending rows excluded. */
export function weeklyBoard(rows: FriendRow[]): FriendRow[] {
  return rows
    .filter((r) => r.relation === 'me' || r.relation === 'friend')
    .sort((a, b) => (b.week_xp ?? 0) - (a.week_xp ?? 0) || (b.streak ?? 0) - (a.streak ?? 0) || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- push

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushStatus = 'unsupported' | 'needs-install' | 'no-sw' | 'denied' | 'off' | 'on';

export function pushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

export async function pushStatus(): Promise<PushStatus> {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  if (!pushSupported()) return ios && !standalone ? 'needs-install' : 'unsupported';
  if (!VAPID) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = swRegistration();
  if (!reg) return 'no-sw';
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function b64ToBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Must be called from a tap. Asks permission, subscribes, stores the subscription. */
export async function enablePush(lang: 'he' | 'en', hour: number): Promise<PushStatus> {
  if (!pushSupported() || !VAPID) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = swRegistration();
  if (!reg) return 'no-sw';
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) as BufferSource }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const sb = supabase();
  if (sb) {
    const { error } = await sb
      .from('toneturn_push_subscriptions')
      .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, tz: localTz(), hour, lang }, { onConflict: 'endpoint' });
    if (error) throw error;
  }
  return 'on';
}

export async function disablePush(): Promise<void> {
  const reg = swRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase()?.from('toneturn_push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Keep hour / language in sync after the player changes them. */
export async function updatePushPrefs(lang: 'he' | 'en', hour: number) {
  const sub = await swRegistration()?.pushManager.getSubscription();
  if (!sub) return;
  await supabase()?.from('toneturn_push_subscriptions').update({ hour, lang, tz: localTz() }).eq('endpoint', sub.endpoint);
}

/** Report the overall rating so friends, rooms and classes can show it (spec L.2). Silent if unavailable. */
export async function reportRating(rating: number, provisional: boolean): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  await sb.rpc('toneturn_report_rating', { p_rating: rating, p_provisional: provisional });
}

/** Report freeze / repair days so the server streak (and reminders) count them (spec N.6). Silent if unavailable. */
export async function reportStreakDays(days: { day: string; kind: 'freeze' | 'repair' }[]): Promise<void> {
  const sb = supabase();
  if (!sb || !days.length) return;
  await sb.rpc('toneturn_report_streak_days', { p_days: days });
}
