// Optional cloud save on Supabase: Google sign-in + idempotent result sync.
// Without VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY the app stays fully local.

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { withoutDeviceSettings, type LessonResult, type Progress, type Settings } from '../storage/progress';
import { mergeResults, pendingUploads, rebuildProgress } from '../storage/sync';
import { currentResults } from '../storage/freshStart';

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

/** AUDIT-5: the result's measured time and note have columns once migration 20261202000000_toneturn_practice_time
 * is applied (the owner dry-runs it first). Until then they stay on this device (sync.ts keeps them on merge). */
export const RESULT_EXTRAS_SYNCED = true; // migration 20261202000000 applied by the owner 2026-11-16

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
  duration_ms?: number | null;
  note?: string | null;
}

/**
 * The server's row checks (total 1..50, first_try <= total, xp <= total * 20): a long technique session (more than 50
 * takes) is sent within them, so one big session can never block the device's whole upload. The local result keeps its
 * real numbers.
 */
export function rowCounts(r: Pick<LessonResult, 'total' | 'firstTry' | 'xp'>): { total: number; first_try: number; xp: number } {
  const total = Math.min(50, Math.max(1, Math.round(r.total || 0)));
  const ratio = r.total > 0 ? Math.min(1, Math.max(0, r.firstTry / r.total)) : 0;
  const first_try = Math.min(total, Math.round(ratio * total));
  const xp = Math.min(total * 20, Math.max(0, Math.round(r.xp || 0)));
  return { total, first_try, xp };
}
const toRow = (r: LessonResult): ResultRow => ({
  session_id: r.sessionId,
  lesson_id: r.lessonId,
  lesson_version: r.lessonVersion,
  ...rowCounts(r),
  missed: r.missed,
  completed_at: r.completedAt,
  items: r.items ?? [],
  ...(RESULT_EXTRAS_SYNCED ? { duration_ms: r.durationMs ? Math.round(r.durationMs) : null, note: r.note ? r.note.slice(0, 500) : null } : {}),
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
  ...(x.duration_ms ? { durationMs: x.duration_ms } : {}),
  ...(x.note ? { note: x.note } : {}),
});

/**
 * Two-way sync. Uploads local results the server lacks (upsert on (user, session) → idempotent),
 * downloads the rest, and rebuilds progress from the union.
 */
export async function syncProgress(local: Progress): Promise<Progress> {
  const sb = supabase();
  if (!sb) return local;
  const { data, error } = await sb.from('toneturn_lesson_results').select(`session_id,lesson_id,lesson_version,first_try,total,xp,missed,items,completed_at${RESULT_EXTRAS_SYNCED ? ',duration_ms,note' : ''}`).order('completed_at');
  if (error) throw error;
  // Results from before the fresh start (storage/freshStart.ts) are neither uploaded nor brought back.
  const remote = currentResults((data as unknown as ResultRow[]).map(fromRow));
  const mine = currentResults(local.history);
  const up = pendingUploads(mine, remote);
  if (up.length) {
    const { error: e2 } = await sb.from('toneturn_lesson_results').upsert(up.map(toRow), { onConflict: 'user_id,session_id', ignoreDuplicates: true });
    if (e2) {
      // One bad row must not block every later result: retry one by one and skip (log) only the rows the server refuses.
      let sent = 0;
      for (const r of up) {
        const { error: e3 } = await sb.from('toneturn_lesson_results').upsert([toRow(r)], { onConflict: 'user_id,session_id', ignoreDuplicates: true });
        if (e3) console.warn('result not synced', r.sessionId, e3.message);
        else sent++;
      }
      if (!sent) throw e2;
    }
  }
  return rebuildProgress(mergeResults(mine, remote), local);
}

export async function pushSettings(userId: string, s: Settings) {
  const sb = supabase();
  if (!sb) return;
  await sb.from('toneturn_profiles').upsert({ id: userId, settings: portableSettings(s) });
}

/** What goes to the cloud: everything but this device's own keys (consent, calibration, MIDI / mic / output). */
export const portableSettings = (s: Partial<Settings>): Partial<Settings> => withoutDeviceSettings(s);

export async function pullSettings(userId: string): Promise<Partial<Settings> | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from('toneturn_profiles').select('settings').eq('id', userId).maybeSingle();
  // older cloud copies still hold device keys (another device's calibration and sound choice): never bring them in
  const raw = data?.settings as Partial<Settings> | undefined;
  return raw ? portableSettings(raw) : null;
}
