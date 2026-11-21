// Gifts between friends (owner decisions 2026-11-16; rules in src/engine/encore/gifts.ts): the client of migration
// supabase/migrations/20261205000000_toneturn_friend_gifts.sql (NOT applied by the agent). Same flag and transport as
// the challenges (src/cloud/challenges.ts): nothing reaches the server while CHALLENGES_ON() is off; the dev mock
// (localStorage tt.mockChallenges = 1) answers every call.
//
// syncGifts() runs from the app (signed in, flag on): fermatas join the purchase list (free; they hold the next missed
// streak day), dedications join the Encore library marked "from <name>", a dedication made "yours" is reported once,
// and each completion bonus is granted once per side (the server is the referee; the device keeps the grant keys too).
// Never lose progress: each step is idempotent (ids fixed by the gift), so a reload or a second device repeats nothing.

import { CHALLENGES_ON, challengeRpc, mockSignedOut } from './challenges';
import type { ItemState } from '../engine/drills/types';
import type { Lick, LickBook } from '../engine/licks';
import type { Purchase } from '../engine/streak';
import { encodePhraseRef, withAssignedPhrase } from '../engine/encore/assign';
import { challengeAssignment } from '../engine/encore/community';
import { DEDICATION_XP, bonusKey, cleanNote, dedicationDone, dedicationLickId, dedicationOf, fermataPurchase, lickFromDedication, type GiftKind } from '../engine/encore/gifts';

type Raw = Record<string, unknown>;
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

export interface GiftFriend {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  young: boolean;
  /** The active duet streak with them (0 = none). */
  duet: number;
}
export interface ReceivedGift {
  id: string;
  kind: GiftKind;
  fromId: string;
  fromName: string;
  title: string | null;
  ref: string | null;
  note: string | null;
  createdAt: string;
  claimed: boolean;
  done: boolean;
}
export interface SentGift {
  id: string;
  kind: GiftKind;
  toId: string;
  toName: string;
  title: string | null;
  createdAt: string;
  done: boolean;
  bonus: boolean;
}
export interface TogetherSession {
  id: string;
  status: 'pending' | 'active' | 'done' | 'declined' | 'ended';
  /** I sent the invite. */
  mine: boolean;
  friend: string;
  friendName: string;
  createdAt: string;
  acceptedAt: string | null;
  meMs: number;
  themMs: number;
  meActive: string | null;
  themActive: string | null;
}
export interface GiftsView {
  today: { gifts: number; invites: number };
  friends: GiftFriend[];
  received: ReceivedGift[];
  sent: SentGift[];
  sessions: TogetherSession[];
}

export function sessionFromRaw(r: Raw): TogetherSession {
  const st = str(r.status);
  return {
    id: str(r.id),
    status: (['pending', 'active', 'done', 'declined', 'ended'].includes(st) ? st : 'ended') as TogetherSession['status'],
    mine: !!r.mine,
    friend: str(r.friend),
    friendName: str(r.friend_name, 'Player'),
    createdAt: str(r.created_at),
    acceptedAt: (r.accepted_at as string) ?? null,
    meMs: num(r.me_ms),
    themMs: num(r.them_ms),
    meActive: (r.me_active as string) ?? null,
    themActive: (r.them_active as string) ?? null,
  };
}
export function viewFromRaw(r: Raw | null | undefined): GiftsView {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Raw[]) : []);
  const kind = (v: unknown): GiftKind => (v === 'fermata' ? 'fermata' : 'dedication');
  const t = (r?.today ?? {}) as Raw;
  return {
    today: { gifts: num(t.gifts), invites: num(t.invites) },
    friends: arr(r?.friends).map((f) => ({ id: str(f.id), name: str(f.name, 'Player'), icon: (f.icon as string) ?? null, color: (f.color as string) ?? null, young: !!f.young, duet: num(f.duet) })),
    received: arr(r?.received).map((g) => ({ id: str(g.id), kind: kind(g.kind), fromId: str(g.from_id), fromName: str(g.from_name, 'Player'), title: (g.title as string) ?? null, ref: (g.ref as string) ?? null, note: (g.note as string) ?? null, createdAt: str(g.created_at), claimed: !!g.claimed, done: !!g.done })),
    sent: arr(r?.sent).map((g) => ({ id: str(g.id), kind: kind(g.kind), toId: str(g.to_id), toName: str(g.to_name, 'Player'), title: (g.title as string) ?? null, createdAt: str(g.created_at), done: !!g.done, bonus: !!g.bonus })),
    sessions: arr(r?.sessions).map(sessionFromRaw),
  };
}

export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ───────────────────────────── calls ─────────────────────────────

export async function giftsView(day = localDay()): Promise<GiftsView> {
  return viewFromRaw(await challengeRpc<Raw>('toneturn_gifts_view', { p_day: day }));
}
export type SendAnswer = 'ok' | 'practise-first' | 'used' | 'not-friends' | 'error';
const answerOf = (e: unknown): SendAnswer => {
  const m = String((e as Error)?.message ?? e);
  return /practice first/.test(m) ? 'practise-first' : /one gift a day/.test(m) ? 'used' : /not friends/.test(m) ? 'not-friends' : 'error';
};
/** Today's gift: a fermata. measuredMs = today's measured practice on this device (the server's proof). */
export async function sendFermata(friend: string, measuredMs: number, day = localDay()): Promise<SendAnswer> {
  try {
    await challengeRpc('toneturn_gift_send', { p_friend: friend, p_kind: 'fermata', p_day: day, p_measured_ms: Math.round(measuredMs) });
    return 'ok';
  } catch (e) {
    return answerOf(e);
  }
}
/** Today's gift: one of my Encore phrases, with an optional note (none to or from a young player). */
export async function sendDedication(friend: string, l: Lick, note: string | null, measuredMs: number, o: { young?: boolean; lang?: 'en' | 'he'; day?: string } = {}): Promise<SendAnswer> {
  const lang = o.lang ?? 'he';
  const name = typeof l.name === 'string' ? (l.name as string) : l.name[lang] || l.name.he || l.name.en;
  const a = challengeAssignment(l, l.instrument ?? 'piano', lang, name);
  const ref = encodePhraseRef(a);
  try {
    await challengeRpc('toneturn_gift_send', { p_friend: friend, p_kind: 'dedication', p_day: o.day ?? localDay(), p_measured_ms: Math.round(measuredMs), p_ref: ref, p_title: a.name.slice(0, 60), p_note: cleanNote(note, o.young) });
    return 'ok';
  } catch (e) {
    return answerOf(e);
  }
}
export const claimGift = (id: string) => challengeRpc<void>('toneturn_gift_claim', { p_gift: id });
export const reportDedicationDone = (id: string) => challengeRpc<void>('toneturn_dedication_done', { p_gift: id });
export const claimDedicationBonus = async (id: string): Promise<boolean> => !!(await challengeRpc<boolean>('toneturn_dedication_bonus', { p_gift: id }));

export type InviteAnswer = { ok: true; id: string } | { ok: false; why: 'limit' | 'not-friends' | 'error' };
/** Invite a friend to practice together now (three a day; the invite lives 30 minutes). */
export async function inviteTogether(friend: string, day = localDay()): Promise<InviteAnswer> {
  try {
    const id = await challengeRpc<string>('toneturn_together_invite', { p_friend: friend, p_day: day });
    return typeof id === 'string' && id ? { ok: true, id } : { ok: false, why: 'error' };
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    return { ok: false, why: /three invites/.test(m) ? 'limit' : /not friends/.test(m) ? 'not-friends' : 'error' };
  }
}
export const answerTogether = (id: string, accept: boolean) => challengeRpc<void>('toneturn_together_answer', { p_id: id, p_accept: accept });
export async function beatTogether(id: string, ms: number): Promise<TogetherSession> {
  return sessionFromRaw(await challengeRpc<Raw>('toneturn_together_beat', { p_id: id, p_ms: Math.max(0, Math.round(ms)) }));
}

// ───────────────────────────── the device's side of a together session ─────────────────────────────

const TOGETHER_KEY = 'tt.together';
export interface TogetherLocal {
  id: string;
  friendName: string;
  /** Today's measured ms when the session became active on this device (my time counts from here). */
  base: number | null;
  day: string;
}
export function loadTogether(): TogetherLocal | null {
  try {
    const o = JSON.parse(localStorage.getItem(TOGETHER_KEY) ?? 'null') as TogetherLocal | null;
    return o && typeof o.id === 'string' ? o : null;
  } catch {
    return null;
  }
}
export function saveTogether(t: TogetherLocal | null) {
  try {
    if (t) localStorage.setItem(TOGETHER_KEY, JSON.stringify(t));
    else localStorage.removeItem(TOGETHER_KEY);
  } catch {
    /* private mode */
  }
  try {
    window.dispatchEvent(new Event('tt-together'));
  } catch {
    /* no window in tests */
  }
}

// ───────────────────────────── the app's sync ─────────────────────────────

export interface GiftSync {
  /** Fermatas to append to the purchase list (empty = nothing new). */
  purchases: Purchase[];
  /** Dedicated phrases new to the library (add with withAssignedPhrase; ids fixed by the gift). */
  licks: Lick[];
  /** Completion bonuses to grant now (personal XP, idempotent by key). */
  xp: { key: string; xp: number }[];
  view: GiftsView | null;
}
const DONE_KEY = 'tt.gifts.doneSent';
const doneSent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};
/** Dedications this device already reported done (a reload never re-reports; the server ignores repeats anyway). */
const markDoneSent = (id: string) => {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...doneSent().filter((x) => x !== id), id].slice(-200)));
  } catch {
    /* ignore */
  }
};

export async function syncGifts(o: { book: LickBook | undefined; purchases: Purchase[]; items: Record<string, ItemState>; granted: Record<string, unknown> | undefined; day?: string }): Promise<GiftSync> {
  const none: GiftSync = { purchases: [], licks: [], xp: [], view: null };
  if (!CHALLENGES_ON() || mockSignedOut()) return none;
  let view: GiftsView;
  try {
    view = await giftsView(o.day);
  } catch {
    return none;
  }
  const have = new Set(o.purchases.map((p) => p.id));
  const purchases: Purchase[] = [];
  let book: LickBook = o.book ?? {};
  const added: Lick[] = [];
  for (const g of view.received) {
    if (g.kind === 'fermata') {
      const p = fermataPurchase(g.id, localDay(new Date(g.createdAt || Date.now())), g.fromName);
      if (!have.has(p.id)) purchases.push(p);
      if (!g.claimed) void claimGift(g.id).catch(() => {});
    } else if (g.ref && !g.claimed && !(book.own ?? []).some((l) => l.id === dedicationLickId(g.id))) {
      const l = lickFromDedication(g.ref, g.id, g.fromName, g.note, g.createdAt || undefined);
      if (l) {
        book = withAssignedPhrase(book, l);
        added.push(l);
        void claimGift(g.id).catch(() => {});
      }
    }
  }
  // completion: my dedicated phrases made "yours" → tell the server once
  const reported = new Set(doneSent());
  for (const l of book.own ?? []) {
    const d = dedicationOf(l);
    if (!d || reported.has(d.giftId) || view.received.find((g) => g.id === d.giftId)?.done) continue;
    if (dedicationDone(l, o.items, book)) {
      try {
        await reportDedicationDone(d.giftId);
        markDoneSent(d.giftId);
        const g = view.received.find((x) => x.id === d.giftId);
        if (g) g.done = true;
      } catch {
        /* next sync */
      }
    }
  }
  // bonuses, once per side
  const xp: GiftSync['xp'] = [];
  const grant = async (id: string, side: 'to' | 'from') => {
    const key = bonusKey(id, side);
    if (o.granted?.[key] !== undefined) return;
    try {
      if (await claimDedicationBonus(id)) xp.push({ key, xp: DEDICATION_XP });
    } catch {
      /* next sync */
    }
  };
  for (const g of view.received) if (g.kind === 'dedication' && g.done) await grant(g.id, 'to');
  for (const g of view.sent) if (g.kind === 'dedication' && g.done && !g.bonus) await grant(g.id, 'from');
  return { purchases, licks: added, xp, view };
}
