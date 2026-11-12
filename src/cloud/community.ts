// The social round's server calls (migration 20261130120000_toneturn_social_round.sql): block & report, the admin
// report queue, friends' activity + cheers, quick messages, challenge links, the weekly friend quest, the class board.
// Every call degrades gracefully: on a server without the migration (or signed out) reads return null / [] and the
// screens hide the feature; writes report 'missing' instead of throwing where the caller can fall back.

import { supabase } from './cloud';
import { milestonePosts, type ActivityKind, type MilestoneEvents, type MilestoneSnapshot, type QuestMetric, type QuickPhrase, type ReportKind } from '../engine/socialRound';

type RpcError = { code?: string; message?: string };
/** PostgREST "no such function" (the migration is not applied yet). */
export const isMissingFn = (e: RpcError | null | undefined) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function|schema cache/i.test(e.message ?? ''));

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: RpcError | null }> {
  const sb = supabase();
  if (!sb) return { data: null, error: { code: 'offline', message: 'not configured' } };
  try {
    const { data, error } = await sb.rpc(fn, args);
    return { data: (data as T) ?? null, error };
  } catch (e) {
    return { data: null, error: { message: String((e as Error)?.message ?? e) } };
  }
}

// ---------------------------------------------------------------- block & report

export async function blockUser(uid: string, on = true): Promise<boolean> {
  const { error } = await call('toneturn_block', { p_user: uid, p_on: on });
  return !error;
}

export type ReportResult = 'ok' | 'already' | 'nickname-reset' | 'photo-held' | 'message-hidden' | 'error';
/** Report (and by default block) a player; `msg` points at a quick message. Falls back to the older report call. */
export async function reportUser(uid: string, kind: ReportKind, opts: { note?: string; block?: boolean; ctx?: 'room' | 'duel'; msg?: number } = {}): Promise<ReportResult> {
  const block = opts.block ?? true;
  const { data, error } = await call<string>('toneturn_report_v2', {
    p_user: uid,
    p_kind: kind,
    p_note: opts.note?.slice(0, 500) || null,
    p_context: opts.msg ? { ctx: opts.ctx ?? null, msg: opts.msg } : {},
    p_block: block,
  });
  if (!error) return (data as ReportResult) ?? 'ok';
  if (!isMissingFn(error)) return 'error';
  // Older server: the 20261122 report (no 'young' reason) + a separate block.
  const r = await call('toneturn_report', { p_user: uid, p_kind: kind === 'young' ? 'other' : kind, p_note: opts.note ?? (kind === 'young' ? 'seems under 13' : null) });
  if (block) await blockUser(uid, true);
  return r.error ? 'error' : 'ok';
}

export interface BlockedRow {
  user_id: string;
  name: string;
  created_at: string;
}
/** The players I blocked (null = this server can't list them yet). */
export async function blockedList(): Promise<BlockedRow[] | null> {
  const { data, error } = await call<BlockedRow[]>('toneturn_blocked_list');
  return error ? null : (data ?? []);
}

export interface OpenReport {
  id: number;
  created_at: string;
  kind: ReportKind;
  note: string | null;
  context: { ctx?: string; msg?: number } | null;
  action: string | null;
  reporter_name: string;
  reported: string;
  reported_name: string;
  reporters: number;
  phrase: string | null;
}
export async function openReports(): Promise<OpenReport[] | null> {
  const { data, error } = await call<OpenReport[]>('toneturn_reports_open');
  return error ? null : (data ?? []);
}
export async function resolveReport(id: number, decision: 'uphold' | 'dismiss'): Promise<boolean> {
  const { error } = await call('toneturn_report_resolve', { p_id: id, p_decision: decision });
  return !error;
}

// ---------------------------------------------------------------- friends' activity & cheers

export interface ActivityRow {
  id: number;
  user_id: string;
  nickname: string;
  country: string | null;
  avatar_icon?: string | null;
  avatar_color?: string | null;
  kind: ActivityKind;
  payload: Record<string, unknown>;
  created_at: string;
  cheers: number;
  mine: boolean;
}
/** Friends' activity, last 14 days (null = not available on this server). */
export async function friendsActivity(): Promise<ActivityRow[] | null> {
  const { data, error } = await call<ActivityRow[]>('toneturn_friends_activity');
  return error ? null : (data ?? []);
}
export async function postActivity(kind: ActivityKind, payload: Record<string, unknown>): Promise<'ok' | 'missing' | 'error'> {
  const { error } = await call('toneturn_post_activity', { p_kind: kind, p_payload: payload });
  return !error ? 'ok' : isMissingFn(error) ? 'missing' : 'error';
}
export async function cheer(activityId: number): Promise<boolean> {
  const { error } = await call('toneturn_cheer', { p_activity: activityId });
  return !error;
}

// ---------------------------------------------------------------- quick messages

export interface QuickMsg {
  id: number;
  from_user: string;
  name: string;
  phrase: QuickPhrase;
  created_at: string;
  mine: boolean;
}
export async function quickList(ctx: 'room' | 'duel', id: string, after = 0): Promise<QuickMsg[] | null> {
  const { data, error } = await call<QuickMsg[]>('toneturn_quick_list', { p_ctx: ctx, p_id: id, p_after: after });
  return error ? null : (data ?? []);
}
export async function quickSend(ctx: 'room' | 'duel', id: string, phrase: QuickPhrase): Promise<'ok' | 'slow' | 'off' | 'error'> {
  const { error } = await call('toneturn_quick_send', { p_ctx: ctx, p_id: id, p_phrase: phrase });
  if (!error) return 'ok';
  const m = error.message ?? '';
  return /slow down/.test(m) ? 'slow' : /off|young/.test(m) ? 'off' : 'error';
}

// ---------------------------------------------------------------- challenge links

/** "Beat my score" (game key + tier index + score) or a duel invite (kind, seed, answer key). null = not available. */
export async function createChallenge(
  c: { kind: 'beat'; game: string; tier: number; score: number; seed?: number } | { kind: 'duel'; duelKind: string; seed: number; keys: string[] },
): Promise<string | null> {
  const args =
    c.kind === 'beat'
      ? { p_kind: 'beat', p_game: c.game, p_tier: c.tier, p_seed: c.seed ?? null, p_score: Math.round(c.score), p_duel_kind: null, p_keys: null }
      : { p_kind: 'duel', p_game: null, p_tier: null, p_seed: c.seed, p_score: null, p_duel_kind: c.duelKind, p_keys: c.keys };
  const { data, error } = await call<string>('toneturn_challenge_create', args);
  return error ? null : data;
}

export interface OpenedChallenge {
  kind: 'beat' | 'duel';
  game: string | null;
  tier: number | null;
  seed: number | null;
  score: number | null;
  from: string;
  from_id?: string;
  friend?: 'friends' | 'requested' | 'none';
  duel?: string | null;
  self: boolean;
}
/** Open a link: null = unknown / expired / blocked; 'missing' = this server has no challenge links yet. */
export async function openChallenge(code: string): Promise<OpenedChallenge | null | 'missing'> {
  const { data, error } = await call<OpenedChallenge>('toneturn_challenge_open', { p_code: code });
  if (error) return isMissingFn(error) ? 'missing' : null;
  return data;
}

// ---------------------------------------------------------------- weekly friend quest

export interface QuestView {
  friend: string;
  name: string;
  metric: QuestMetric;
  target: number;
  status: 'pending' | 'active';
  invited_by_me: boolean;
  ends_at: string;
  mine: number;
  theirs: number;
}
/** This week's quest: a quest, null (none this week), or 'missing' (server without quests). */
export async function questView(): Promise<QuestView | null | 'missing'> {
  const { data, error } = await call<QuestView | null>('toneturn_quest_view');
  if (error) return isMissingFn(error) ? 'missing' : null;
  return data;
}
export async function questAction(friend: string, action: 'invite' | 'accept' | 'decline' | 'end', metric: QuestMetric = 'minutes'): Promise<boolean> {
  const { error } = await call('toneturn_quest', { p_friend: friend, p_action: action, p_metric: metric });
  return !error;
}

// ---------------------------------------------------------------- class board & goal

export interface ClassBoard {
  hidden: boolean;
  teacher: boolean;
  ends_at: string;
  goal: { metric: QuestMetric; target: number; progress: number } | null;
  rows: { name: string; minutes: number; clean: number; days: number; me: boolean }[];
}
export async function classBoard(classId: string): Promise<ClassBoard | null> {
  const { data, error } = await call<ClassBoard>('toneturn_class_board', { p_class: classId });
  return error ? null : data;
}
export async function classSettings(classId: string, s: { hidden?: boolean; metric?: QuestMetric; target?: number }): Promise<boolean> {
  const { error } = await call('toneturn_class_settings', { p_class: classId, p_hidden: s.hidden ?? null, p_metric: s.metric ?? null, p_target: s.target ?? null });
  return !error;
}

// ---------------------------------------------------------------- device memory (pending link, posted milestones)

const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode: the feature just forgets */
    }
  },
};

const PENDING = 'toneturn.challenge';
/** A challenge link opened before sign-in waits here (a day) — the OAuth round trip drops the URL hash. */
export const savePendingChallenge = (code: string) => store.set(PENDING, { code, at: Date.now() });
export function pendingChallenge(): string | null {
  const p = store.get<{ code: string; at: number }>(PENDING);
  return p && Date.now() - p.at < 864e5 ? p.code : null;
}
export const clearPendingChallenge = () => store.set(PENDING, null);

const SNAP = 'toneturn.feedSnap';
const POSTED = 'toneturn.feedPosted';
/**
 * Post the milestones that changed since the last snapshot to friends' activity (automatic, friends only). The first
 * run on a device only remembers. Milestones are moments, not a backlog: the snapshot moves on even when a post fails.
 */
export async function postMilestones(next: MilestoneSnapshot, ev: MilestoneEvents): Promise<void> {
  const prev = store.get<MilestoneSnapshot>(SNAP);
  const posts = milestonePosts(prev, next, ev, store.get<string[]>(POSTED) ?? []);
  store.set(SNAP, next);
  for (const p of posts) {
    const r = await postActivity(p.kind, p.payload);
    if (r === 'ok') store.set(POSTED, [...(store.get<string[]>(POSTED) ?? []), p.key].slice(-300));
  }
}
