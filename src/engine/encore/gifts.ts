// Encore v3 — reactions and gifts between friends (owner decisions 2026-11-16). Pure rules, shared by the client
// (src/cloud/gifts.ts, the screens), the dev mock and the tests; the migration
// supabase/migrations/20261205000000_toneturn_friend_gifts.sql applies the same rules on the server.
//
// Reactions — musicians' words, not likes: "הדרן!" (Encore!, its icon is the Encore glyph) and three compliments:
// גרוב (Groove — the time feels great), צליל (Tone — the sound), רעיון (Idea — the line). A viewer gives each one at
// most once per phrase (a toggle) and never on their own phrase; the counts per kind go back to the sharer only
// ("my shares" and the sharer's own challenge page) — never a public count.
//
// Gifts — one gift per practice day (owner, 2026-11-16, to keep anyone from being flooded): on a day with measured
// practice (the streak's 5 measured minutes) a player may send ONE gift — a fermata OR a phrase dedication. Today's
// allowance only; it does not build up. Practice-with-me invites are separate: up to 3 a day, each lives 30 minutes.
//  · פרמטה (Fermata): a streak freeze for the friend. It holds the first missed day after it arrives (engine/streak.ts).
//  · הקדשת משפט (Dedicate a phrase): one of my Encore phrases lands in their library marked "from <name>", with an
//    optional short note. When they make it "yours" (rank f — the target in every needed key) both get
//    DEDICATION_XP, once. Personal XP only: it raises the total and the day's goal ring, it is never posted as a lesson
//    result, so the weekly league (summed on the server from results) does not see it; no rating events either.
//  · תרגל איתי עכשיו (Practice with me now): both practice measured exercises at the same time; while both were active
//    within the last 10 minutes a small "together" mark shows; when both have 5 measured minutes since the session
//    started, the duet streak counts that day (a duet starts if they had none).

import type { ItemState } from '../drills/types';
import type { Lick, LickBook, LickInstrument } from '../licks';
import { decodePhraseRef } from './assign';
import { lickFromAssignment } from './assign';
import { phraseRank } from './phrase';

// ───────────────────────────── reactions ─────────────────────────────

export const REACTION_KINDS = ['encore', 'groove', 'tone', 'idea'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
export type ReactionCounts = Record<ReactionKind, number>;
export const REACTION_NAME: Record<ReactionKind, { en: string; he: string; hint: { en: string; he: string } }> = {
  encore: { en: 'Encore!', he: 'הדרן!', hint: { en: 'Play it again — I loved it', he: 'עוד פעם — אהבתי' } },
  groove: { en: 'Groove', he: 'גרוב', hint: { en: 'The time feels great', he: 'הזמן יושב נהדר' } },
  tone: { en: 'Tone', he: 'צליל', hint: { en: 'The sound', he: 'הסאונד' } },
  idea: { en: 'Idea', he: 'רעיון', hint: { en: 'The line', he: 'הקו המלודי' } },
};
export const isReactionKind = (k: unknown): k is ReactionKind => typeof k === 'string' && (REACTION_KINDS as readonly string[]).includes(k);
export const noCounts = (): ReactionCounts => ({ encore: 0, groove: 0, tone: 0, idea: 0 });

/** Who may react: a signed-in viewer, on someone else's phrase. */
export const canReact = (p: { mine: boolean }, signedIn = true) => signedIn && !p.mine;

/** My reactions after tapping one: each kind at most once (a tap again takes it back); the order is the canonical one. */
export function toggleReaction(mine: readonly ReactionKind[], k: ReactionKind): ReactionKind[] {
  const has = mine.includes(k);
  return REACTION_KINDS.filter((x) => (x === k ? !has : mine.includes(x)));
}

/** Counts as the viewer may see them: the sharer sees every kind (zeros too); anyone else sees nothing. */
export function visibleCounts(isOwner: boolean, raw: Partial<Record<string, unknown>> | null | undefined): ReactionCounts | null {
  if (!isOwner) return null;
  const out = noCounts();
  for (const k of REACTION_KINDS) {
    const v = Number(raw?.[k] ?? 0);
    out[k] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }
  return out;
}
export const totalReactions = (c: ReactionCounts | null | undefined) => (c ? REACTION_KINDS.reduce((a, k) => a + c[k], 0) : 0);

// ───────────────────────────── gifts: the allowance ─────────────────────────────

export const GIFTS_PER_PRACTICE_DAY = 1;
export const INVITES_PER_DAY = 3;
/** The server's anti-automation bound (gifts + invites + reactions an hour). Normal use never meets it. */
export const SPAM_PER_HOUR = 60;
export const NOTE_MAX = 140;

export type GiftKind = 'fermata' | 'dedication';
export type GiftAllowance = 'ready' | 'used' | 'practise-first';
/** Today's gift: practice first (5 measured minutes), then one gift; the next day starts over (nothing carries over). */
export function giftAllowance(o: { measuredToday: boolean; sentToday: number }): GiftAllowance {
  if (o.sentToday >= GIFTS_PER_PRACTICE_DAY) return 'used';
  return o.measuredToday ? 'ready' : 'practise-first';
}
export const ALLOWANCE_TEXT: Record<GiftAllowance, { en: string; he: string }> = {
  ready: { en: "One gift per practice day — today's is still yours to give", he: 'מתנה אחת ליום תרגול — נשארה לך היום' },
  used: { en: "Today's gift was sent", he: 'המתנה של היום נשלחה' },
  'practise-first': { en: 'Practice today to send a gift', he: 'תרגלו היום כדי לשלוח מתנה' },
};
export const invitesLeft = (sentToday: number) => Math.max(0, INVITES_PER_DAY - sentToday);

/** Who may receive: a friend, not me, not blocked either way. */
export function canGift(o: { me: string; to: string; friends: boolean; blocked: boolean }): boolean {
  return o.me !== o.to && o.friends && !o.blocked;
}
/** A short note: trimmed, one line, NOTE_MAX characters; young players (either side) send none. */
export function cleanNote(note: string | null | undefined, young = false): string | null {
  if (young || !note) return null;
  const t = note.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX);
  return t || null;
}

// ───────────────────────────── fermata ─────────────────────────────

/** The fermata as an entry of the (append-only, synced) purchase list: free, its id fixed by the gift (idempotent). */
export const fermataPurchase = (giftId: string, day: string, from: string) => ({ id: `gift-${giftId}`, kind: 'fermata' as const, day, item: from.slice(0, 40) });

// ───────────────────────────── dedication ─────────────────────────────

export const DEDICATION_XP = 20;
export const dedicationLickId = (giftId: string) => `ded-${giftId.replace(/[^\w-]/g, '').slice(0, 40)}`;
export function lickFromDedication(ref: string, giftId: string, by: string, note: string | null, now = new Date().toISOString()): Lick | null {
  const a = decodePhraseRef(ref);
  if (!a) return null;
  const base = lickFromAssignment(a, giftId, by, now);
  return { ...base, id: dedicationLickId(giftId), name: { en: a.name || 'Dedicated phrase', he: a.name || 'משפט מוקדש' }, source: { kind: 'dedication', giftId, by, ...(note ? { note } : {}) } };
}
export const isDedication = (l: Lick) => l.source?.kind === 'dedication';
export const dedicationOf = (l: Lick) => (l.source?.kind === 'dedication' ? l.source : null);
/** A dedication is completed when the receiver made it "yours": rank f (5) or more, measured. */
export function dedicationDone(l: Lick, items: Record<string, ItemState>, book?: LickBook, inst: LickInstrument = l.instrument ?? 'piano'): boolean {
  return isDedication(l) && phraseRank(l, items, book, inst) >= 5;
}
/** Phrases I may dedicate: my own (not a teacher's, not taken from a challenge, not one dedicated to me). */
export function dedicatable(book: LickBook | undefined): Lick[] {
  return (book?.own ?? []).filter((l) => l.v === 3 && l.notes.length >= 2 && !['teacher', 'shared', 'dedication'].includes(l.source?.kind ?? ''));
}
/** Bonus XP grants are idempotent by key ("ded:<gift>:to" / "ded:<gift>:from"). */
export const bonusKey = (giftId: string, side: 'to' | 'from') => `ded:${giftId}:${side}`;

// ───────────────────────────── practice together ─────────────────────────────

export const TOGETHER_MIN_MS = 5 * 60_000;
export const TOGETHER_WINDOW_MS = 10 * 60_000;
export const INVITE_TTL_MS = 30 * 60_000;
/** A session ends unfinished 2 hours after it started. */
export const SESSION_TTL_MS = 2 * 60 * 60_000;

export interface TogetherSide {
  /** Measured ms since the session started (from the practice ledger). */
  ms: number;
  /** When this side last gained measured time (ISO), or null. */
  activeAt: string | null;
}
/** Both practiced within the same 10-minute window (and recently): the live "together" mark. */
export function practisingTogether(a: TogetherSide, b: TogetherSide, now: number): boolean {
  if (!a.activeAt || !b.activeAt) return false;
  const ta = Date.parse(a.activeAt);
  const tb = Date.parse(b.activeAt);
  return Number.isFinite(ta) && Number.isFinite(tb) && now - ta <= TOGETHER_WINDOW_MS && now - tb <= TOGETHER_WINDOW_MS && Math.abs(ta - tb) <= TOGETHER_WINDOW_MS;
}
/** Both reached 5 measured minutes. */
export const togetherDone = (a: TogetherSide, b: TogetherSide) => a.ms >= TOGETHER_MIN_MS && b.ms >= TOGETHER_MIN_MS;
export const inviteExpired = (createdAt: string, now: number) => now - Date.parse(createdAt) > INVITE_TTL_MS;
/** What a side may claim: never more than the time since the session started (the server caps the same way). */
export const cappedMs = (ms: number, startedAt: string, now: number) => Math.max(0, Math.min(Math.round(ms), now - Date.parse(startedAt)));

/** The duet streak with together days: a day counts when both practiced OR a together session finished that day. */
export function duetStreak(o: { meDays: Set<string>; themDays: Set<string>; togetherDays: Set<string>; today: string; since?: string }): number {
  const both = (d: string) => o.togetherDays.has(d) || (o.meDays.has(d) && o.themDays.has(d));
  const prev = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  let day = both(o.today) ? o.today : prev(o.today);
  let n = 0;
  while (both(day) && (!o.since || day >= o.since) && n < 2000) {
    n++;
    day = prev(day);
  }
  return n;
}
