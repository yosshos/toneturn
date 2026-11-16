// Encore v3 — community challenges (SPEC-PHRASE-STUDIO §12): the client of migration
// supabase/migrations/20261204000000_toneturn_phrase_challenges.sql (NOT applied by the agent — the owner dry-runs it).
//
// FLAG: nothing here calls the server until the flag is on —
//   · build with VITE_ENCORE_CHALLENGES=1 (after the owner applied the migration), or
//   · localStorage "tt.flag.challenges" = "1" on one device (to try it on the live server), or
//   · the dev mock: localStorage "tt.mockChallenges" = "1" (dev builds only; "anon" = signed out) — e2e runs on it.
// With the flag off every entry point hides itself and the routes say "not available yet".

import { currentUser, supabase } from './cloud';
import type { Lick, LickBook, LickInstrument } from '../engine/licks';
import type { ItemState } from '../engine/drills/types';
import { challengeResult, isShareCode, phraseItemIds, resultChanged, shareCodeOf, type BoardRow, type ChallengeResult, type InputSource, type SharePayload, type Style, type TakeTrace, type Visibility } from '../engine/encore/community';

export const CHALLENGES_MIGRATION = '20261204000000_toneturn_phrase_challenges';
/** Private bucket for the sharer's clip (≤ 20 s, ≤ 400 KB); read through signed URLs by who may see the phrase. */
export const CLIP_BUCKET = 'toneturn-phrase-clips';

const ls = {
  get(k: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* private mode: forget */
    }
  },
};

/** The dev mock answers every call (dev builds only). "anon" = a visitor without an account. */
export const challengesMockOn = (): boolean => {
  if (!import.meta.env.DEV) return false;
  const v = ls.get('tt.mockChallenges');
  return v === '1' || v === 'anon';
};
export const mockSignedOut = () => challengesMockOn() && ls.get('tt.mockChallenges') === 'anon';
/** The feature flag (see the header). */
export const CHALLENGES_ON = (): boolean => {
  if (challengesMockOn()) return true;
  try {
    if (import.meta.env.VITE_ENCORE_CHALLENGES === '1') return true;
  } catch {
    /* no env in some test runners */
  }
  return ls.get('tt.flag.challenges') === '1';
};

// ───────────────────────────── transport ─────────────────────────────

type Backend = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
let backend: Backend | null = null;
/** Tests: answer the RPCs with a function (null = back to the real server / the dev mock). */
export function setChallengeBackend(b: Backend | null) {
  backend = b;
}
export class ChallengeError extends Error {}
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!backend && challengesMockOn()) backend = (await import('./challengesMock')).mockChallengeRpc;
  if (backend) return (await backend(fn, args)) as T;
  if (!CHALLENGES_ON()) throw new ChallengeError('off');
  const sb = supabase();
  if (!sb) throw new ChallengeError('offline');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new ChallengeError(error.message);
  return data as T;
}

// ───────────────────────────── shapes ─────────────────────────────

export interface SharedPhrase {
  id: string;
  code: string;
  ownerId: string | null;
  ownerName: string;
  ownerIcon?: string | null;
  ownerColor?: string | null;
  mine: boolean;
  friend: boolean;
  title: string;
  instrument: LickInstrument;
  level: number;
  style: Style | null;
  context: string;
  homeKey: number;
  ref: string;
  opb: number;
  needed: number;
  goalBpm: number;
  grade: number | null;
  hasAudio: boolean;
  visibility: Visibility;
  status: 'live' | 'held' | 'removed';
  createdAt: string;
  /** Players at the target in every needed key — the one number shown (it is mastery). */
  reached: number;
  /** "Learned it" in the last 7 days (the "rising" order). */
  learnedWeek: number;
  featured: boolean;
  myBravo: boolean;
  /** Only on my own phrases: bravos received (never shown to others). */
  bravos?: number;
}
type Raw = Record<string, unknown>;
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
export function phraseFromRaw(r: Raw): SharedPhrase {
  return {
    id: str(r.id),
    code: str(r.code),
    ownerId: (r.owner_id as string) ?? null,
    ownerName: str(r.owner_name, 'Player'),
    ownerIcon: (r.owner_icon as string) ?? null,
    ownerColor: (r.owner_color as string) ?? null,
    mine: !!r.mine,
    friend: !!r.friend,
    title: str(r.title),
    instrument: (['piano', 'guitar', 'bass', 'voice'].includes(str(r.instrument)) ? r.instrument : 'piano') as LickInstrument,
    level: Math.max(1, Math.min(5, num(r.level, 1))),
    style: (r.style as Style) ?? null,
    context: str(r.context),
    homeKey: num(r.home_key),
    ref: str(r.ref),
    opb: num(r.opb, 2),
    needed: num(r.needed, 12),
    goalBpm: num(r.goal_bpm, 100),
    grade: r.grade === null || r.grade === undefined ? null : num(r.grade),
    hasAudio: !!r.has_audio,
    visibility: (['friends', 'class', 'public'].includes(str(r.visibility)) ? r.visibility : 'friends') as Visibility,
    status: (['live', 'held', 'removed'].includes(str(r.status)) ? r.status : 'live') as SharedPhrase['status'],
    createdAt: str(r.created_at),
    reached: num(r.reached),
    learnedWeek: num(r.learned_week),
    featured: !!r.featured,
    myBravo: !!r.my_bravo,
    ...(r.bravos !== undefined && r.bravos !== null ? { bravos: num(r.bravos) } : {}),
  };
}
export function rowFromRaw(r: Raw): BoardRow {
  return {
    userId: str(r.user_id),
    name: str(r.name, 'Player'),
    keys: num(r.keys),
    bestBpm: num(r.best_bpm),
    acc: num(r.best_acc),
    source: (['midi', 'mic', 'screen'].includes(str(r.source)) ? r.source : 'screen') as InputSource,
    at: str(r.updated_at),
    me: !!r.me,
    creator: !!r.creator,
    flagged: !!r.flagged,
    hasAudio: !!r.has_audio,
    icon: (r.icon as string) ?? null,
    color: (r.color as string) ?? null,
  };
}

// ───────────────────────────── calls ─────────────────────────────

export async function sharePhrase(p: SharePayload): Promise<{ id: string; code: string }> {
  const r = await rpc<Raw>('toneturn_phrase_share', {
    p_title: p.title,
    p_instrument: p.instrument,
    p_level: p.level,
    p_style: p.style,
    p_context: p.context,
    p_home_key: p.homeKey,
    p_ref: p.ref,
    p_opb: p.opb,
    p_needed: p.needed,
    p_goal_bpm: p.goalBpm,
    p_grade: p.grade,
    p_visibility: p.visibility,
    p_class: p.classId,
    p_audio: p.audio,
  });
  const code = str(r?.code);
  if (!isShareCode(code)) throw new ChallengeError('bad answer');
  rememberId(code, str(r.id));
  return { id: str(r.id), code };
}
export type Opened = { kind: 'phrase'; p: SharedPhrase } | { kind: 'locked'; scope: 'friends' | 'class'; ownerName: string } | { kind: 'none' };
/** A phrase by its code (as a signed-in player). */
export async function openPhrase(code: string): Promise<Opened> {
  const r = await rpc<Raw | null>('toneturn_phrase_get', { p_code: code });
  if (!r) return { kind: 'none' };
  if (r.locked) return { kind: 'locked', scope: r.locked === 'class' ? 'class' : 'friends', ownerName: str(r.owner_name, 'Player') };
  const p = phraseFromRaw(r);
  rememberId(p.code, p.id);
  return { kind: 'phrase', p };
}
/** A public phrase for a visitor without an account (anon key; public + live only). */
export async function openPublic(code: string): Promise<SharedPhrase | null> {
  const r = await rpc<Raw | null>('toneturn_phrase_public', { p_code: code });
  return r ? phraseFromRaw(r) : null;
}
export async function phraseBoard(id: string, scope: 'friends' | 'all'): Promise<BoardRow[]> {
  return ((await rpc<Raw[] | null>('toneturn_phrase_board', { p_phrase: id, p_scope: scope })) ?? []).map(rowFromRaw);
}
export type PostAnswer = 'ok' | 'flagged' | 'implausible' | 'error';
export async function postResult(id: string, r: ChallengeResult): Promise<PostAnswer> {
  try {
    const a = await rpc<string>('toneturn_phrase_result', {
      p_phrase: id,
      p_keys: r.keys,
      p_best_bpm: r.bestBpm,
      p_acc: r.acc,
      p_source: r.source,
      p_digest: r.digest || null,
      p_takes: r.takes,
      p_days: r.days,
      p_machine: r.machine,
      p_device: deviceTag(),
    });
    return a === 'ok' || a === 'flagged' ? a : String(a).startsWith('implausible') ? 'implausible' : 'ok';
  } catch {
    return 'error';
  }
}
export const setBravo = (id: string, on: boolean) => rpc<void>('toneturn_phrase_bravo', { p_phrase: id, p_on: on });
export type ReportKind = 'copied' | 'implausible' | 'other';
export type ReportAnswer = 'ok' | 'already' | 'held' | 'row-hidden' | 'error';
/** Report a phrase (userId null) or one board row (userId). It hides at once for me; the server holds it at 2 / 3 reports. */
export async function reportShared(id: string, userId: string | null, kind: ReportKind, note?: string): Promise<ReportAnswer> {
  hideLocally(id, userId);
  try {
    return (await rpc<ReportAnswer>('toneturn_phrase_report', { p_phrase: id, p_user: userId, p_kind: kind, p_note: note?.slice(0, 300) || null })) ?? 'ok';
  } catch {
    return 'error';
  }
}
export interface Gallery {
  featured: SharedPhrase | null;
  /** The featured phrase was chosen by the owner (else by the app). */
  featuredBy: 'app' | 'owner' | null;
  friends: SharedPhrase[];
  rising: SharedPhrase[];
}
export async function gallery(f: { instrument?: LickInstrument | null; level?: [number, number] | null; style?: Style | null }): Promise<Gallery> {
  const r = await rpc<Raw>('toneturn_phrase_gallery', { p_instrument: f.instrument ?? null, p_level_min: f.level?.[0] ?? null, p_level_max: f.level?.[1] ?? null, p_style: f.style ?? null });
  const hidden = hiddenSet();
  const keep = (p: SharedPhrase) => !hidden.has(`${p.id}:`);
  const list = (v: unknown) => (Array.isArray(v) ? (v as Raw[]).map(phraseFromRaw).filter(keep) : []);
  const featured = r?.featured ? phraseFromRaw(r.featured as Raw) : null;
  return { featured: featured && keep(featured) ? featured : null, featuredBy: (r?.featured_by as Gallery['featuredBy']) ?? null, friends: list(r?.friends), rising: list(r?.rising) };
}
export async function myShares(): Promise<SharedPhrase[]> {
  return ((await rpc<Raw[] | null>('toneturn_phrase_mine')) ?? []).map(phraseFromRaw);
}
export const deleteShare = (id: string) => rpc<void>('toneturn_phrase_delete', { p_phrase: id });
/** "Beat my tempo": a link fixed at my row's tempo and keys (null = no row of mine yet). */
export async function beatLink(id: string): Promise<string | null> {
  try {
    const c = await rpc<string | null>('toneturn_phrase_beat_create', { p_phrase: id });
    return isShareCode(c) ? c : null;
  } catch {
    return null;
  }
}
export async function openBeat(code: string): Promise<{ from: string; bpm: number; keys: number } | null> {
  try {
    const r = await rpc<Raw | null>('toneturn_phrase_beat_open', { p_code: code });
    return r ? { from: str(r.from, 'Player'), bpm: num(r.bpm), keys: num(r.keys) } : null;
  } catch {
    return null;
  }
}

// ───────────────────────────── the clip ─────────────────────────────

export async function uploadClip(phraseId: string, blob: Blob): Promise<boolean> {
  if (blob.size > 400_000) return false;
  if (backend || challengesMockOn()) {
    await rpc('toneturn_phrase_set_audio', { p_phrase: phraseId, p_path: `mock/${phraseId}`, _blob: blob });
    return true;
  }
  const sb = supabase();
  const ownerId = (await currentUser())?.id;
  if (!sb || !ownerId) return false;
  const ext = /mp4|aac|m4a/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
  const path = `${ownerId}/${phraseId}.${ext}`;
  const { error } = await sb.storage.from(CLIP_BUCKET).upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: true });
  if (error) return false;
  await rpc('toneturn_phrase_set_audio', { p_phrase: phraseId, p_path: path });
  return true;
}
/** A short-lived link to a phrase's clip (null without one or without access). */
export async function clipUrl(phraseId: string): Promise<string | null> {
  try {
    const path = await rpc<string | null>('toneturn_phrase_audio_path', { p_phrase: phraseId });
    if (!path) return null;
    if (backend || challengesMockOn()) return path; // the mock returns an object URL
    const sb = supabase();
    if (!sb) return null;
    const { data } = await sb.storage.from(CLIP_BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

// ───────────────────────────── admin ─────────────────────────────

export interface ReviewItem {
  kind: 'phrase' | 'row';
  phraseId: string;
  code: string;
  title: string;
  ownerName: string;
  userId: string | null;
  userName: string | null;
  reports: { kind: ReportKind; n: number }[];
  status: string;
  facts?: { keys: number; bpm: number; acc: number; source: InputSource; digest: string | null } | null;
}
/** The owner / admin review list (null = not an admin, or no server). */
export async function reviewList(): Promise<ReviewItem[] | null> {
  try {
    const r = await rpc<Raw[] | null>('toneturn_phrase_reviews');
    return (r ?? []).map((x) => ({
      kind: x.kind === 'row' ? 'row' : 'phrase',
      phraseId: str(x.phrase_id),
      code: str(x.code),
      title: str(x.title),
      ownerName: str(x.owner_name, 'Player'),
      userId: (x.user_id as string) ?? null,
      userName: (x.user_name as string) ?? null,
      reports: Array.isArray(x.reports) ? (x.reports as Raw[]).map((k) => ({ kind: str(k.kind) as ReportKind, n: num(k.n) })) : [],
      status: str(x.status),
      facts: x.facts ? { keys: num((x.facts as Raw).keys), bpm: num((x.facts as Raw).best_bpm), acc: num((x.facts as Raw).best_acc), source: str((x.facts as Raw).source) as InputSource, digest: ((x.facts as Raw).digest as string) ?? null } : null,
    }));
  } catch {
    return null;
  }
}
export const resolveReview = (kind: 'phrase' | 'row', phraseId: string, userId: string | null, decision: 'restore' | 'remove') =>
  rpc<void>('toneturn_phrase_review', { p_kind: kind, p_phrase: phraseId, p_user: userId, p_decision: decision });
/** Replace this week's featured phrase (owner / admin). */
export const featurePhrase = (code: string) => rpc<void>('toneturn_phrase_feature', { p_code: code });

// ───────────────────────────── device memory ─────────────────────────────

const IDS = 'tt.challenges.ids';
const SENT = 'tt.challenges.sent';
const HIDDEN = 'tt.challenges.hidden';
const json = <T>(k: string, d: T): T => {
  try {
    return (JSON.parse(ls.get(k) ?? 'null') as T) ?? d;
  } catch {
    return d;
  }
};
function rememberId(code: string, id: string) {
  if (!code || !id) return;
  const m = json<Record<string, string>>(IDS, {});
  if (m[code] === id) return;
  m[code] = id;
  ls.set(IDS, JSON.stringify(m));
}
export const idOfCode = (code: string): string | null => json<Record<string, string>>(IDS, {})[code] ?? null;
/** What I reported stays out of my own views at once ("<phrase>:" for a phrase, "<phrase>:<user>" for a row). */
function hideLocally(id: string, userId: string | null) {
  const s = json<string[]>(HIDDEN, []);
  const k = `${id}:${userId ?? ''}`;
  if (!s.includes(k)) ls.set(HIDDEN, JSON.stringify([...s, k].slice(-500)));
}
export const hiddenSet = () => new Set(json<string[]>(HIDDEN, []));

/** A random per-device tag (hashed, nothing personal): duplicate devices posting for several accounts. */
export function deviceTag(): string {
  let d = ls.get('tt.deviceTag');
  if (!d || !/^[a-z0-9]{12,32}$/.test(d)) {
    d = Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    ls.set('tt.deviceTag', d);
  }
  return d;
}

/** The measured takes of a phrase from My recordings (notes, source, tempo) — for the MIDI sanity check and the digest. */
export async function phraseTraces(l: Lick, inst: LickInstrument): Promise<TakeTrace[]> {
  try {
    const { takesOfItem, unpackNotes } = await import('../storage/recordings');
    const out: TakeTrace[] = [];
    for (const id of phraseItemIds(l, inst)) {
      for (const t of (await takesOfItem(id)).slice(-20)) {
        if (!t.bpm || !t.notes) continue;
        const ns = unpackNotes(t.notes);
        if (ns.length < 3) continue;
        out.push({ source: t.source, bpm: t.bpm, notes: ns.map((n) => ({ on: n.on, vel: n.vel })), acc: t.result?.acc });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Post my result for every shared phrase I practise (taken or my own), when it changed. Results come only from
 * measured takes (the drill items); nothing is sent while the flag is off or for a phrase whose id is unknown here.
 */
export async function syncChallengeResults(book: LickBook | undefined, items: Record<string, ItemState>): Promise<number> {
  if (!CHALLENGES_ON() || mockSignedOut()) return 0;
  let n = 0;
  for (const l of book?.own ?? []) {
    const code = shareCodeOf(l);
    const id = code ? idOfCode(code) : null;
    if (!id) continue;
    if ((await syncOne(l, items, id)) !== null) n++;
  }
  return n;
}
/** Post my result for one shared phrase when it changed (null = nothing sent). */
export async function syncOne(l: Lick, items: Record<string, ItemState>, id: string): Promise<PostAnswer | null> {
  const code = shareCodeOf(l);
  if (!code || !CHALLENGES_ON() || mockSignedOut()) return null;
  rememberId(code, id);
  const sent = json<Record<string, Pick<ChallengeResult, 'keys' | 'bestBpm' | 'acc' | 'machine'>>>(SENT, {});
  const inst = l.instrument ?? 'piano';
  const r = challengeResult(l, items, inst, await phraseTraces(l, inst));
  if (!r || !resultChanged(sent[code] ?? null, r)) return null;
  const a = await postResult(id, r);
  if (a === 'error') return null;
  sent[code] = { keys: r.keys, bestBpm: r.bestBpm, acc: r.acc, machine: r.machine };
  ls.set(SENT, JSON.stringify(sent));
  return a;
}
/** Forget what was sent for a code (tests; a deleted share). */
export function forgetSent(code: string) {
  const sent = json<Record<string, unknown>>(SENT, {});
  delete sent[code];
  ls.set(SENT, JSON.stringify(sent));
}
