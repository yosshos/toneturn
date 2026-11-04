// Optional cloud save on Supabase: Google sign-in + idempotent result sync.
// Without VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY the app stays fully local.

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { LessonResult, Progress, Settings } from '../storage/progress';
import { mergeResults, pendingUploads, rebuildProgress } from '../storage/sync';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const cloudConfigured = Boolean(URL_ && KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  client ??= createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return client;
}

export interface CloudUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}

const toUser = (s: Session | null): CloudUser | null =>
  s?.user
    ? {
        id: s.user.id,
        email: s.user.email ?? null,
        name: (s.user.user_metadata?.full_name as string | undefined) ?? (s.user.user_metadata?.name as string | undefined) ?? null,
        avatar: (s.user.user_metadata?.avatar_url as string | undefined) ?? null,
      }
    : null;

export async function currentUser(): Promise<CloudUser | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return toUser(data.session);
}

export function onAuthChange(cb: (u: CloudUser | null) => void): () => void {
  const sb = supabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toUser(s)));
  return () => data.subscription.unsubscribe();
}

export async function signInWithGoogle() {
  const sb = supabase();
  if (!sb) throw new Error('Cloud save is not configured');
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}${location.pathname}` },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

interface ResultRow {
  session_id: string;
  lesson_id: string;
  lesson_version: number;
  first_try: number;
  total: number;
  xp: number;
  missed: LessonResult['missed'];
  completed_at: string;
  items?: LessonResult['items'];
}

const toRow = (r: LessonResult): ResultRow => ({
  session_id: r.sessionId,
  lesson_id: r.lessonId,
  lesson_version: r.lessonVersion,
  first_try: r.firstTry,
  total: r.total,
  xp: r.xp,
  missed: r.missed,
  completed_at: r.completedAt,
  items: r.items ?? [],
});
const fromRow = (x: ResultRow): LessonResult => ({
  sessionId: x.session_id,
  lessonId: x.lesson_id,
  lessonVersion: x.lesson_version,
  firstTry: x.first_try,
  total: x.total,
  xp: x.xp,
  missed: x.missed ?? [],
  items: x.items ?? [],
  completedAt: new Date(x.completed_at).toISOString(),
});

/**
 * Two-way sync. Uploads local results the server lacks (upsert on (user, session) → idempotent),
 * downloads the rest, and rebuilds progress from the union.
 */
export async function syncProgress(local: Progress): Promise<Progress> {
  const sb = supabase();
  if (!sb) return local;
  const { data, error } = await sb.from('toneturn_lesson_results').select('session_id,lesson_id,lesson_version,first_try,total,xp,missed,items,completed_at').order('completed_at');
  if (error) throw error;
  const remote = (data as ResultRow[]).map(fromRow);
  const up = pendingUploads(local.history, remote);
  if (up.length) {
    const { error: e2 } = await sb.from('toneturn_lesson_results').upsert(up.map(toRow), { onConflict: 'user_id,session_id', ignoreDuplicates: true });
    if (e2) throw e2;
  }
  return rebuildProgress(mergeResults(local.history, remote), local);
}

export async function pushSettings(userId: string, s: Settings) {
  const sb = supabase();
  if (!sb) return;
  const { voiceConsent: _drop, ...portable } = s; // consent is per device
  void _drop;
  await sb.from('toneturn_profiles').upsert({ id: userId, settings: portable });
}

export async function pullSettings(userId: string): Promise<Partial<Settings> | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from('toneturn_profiles').select('settings').eq('id', userId).maybeSingle();
  return (data?.settings as Partial<Settings> | undefined) ?? null;
}
