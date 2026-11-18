// Encore v3 — community challenges ("אתגר הדרן", SPEC-PHRASE-STUDIO §12 / §11.1–11.8, owner decisions §20.7, §20.8,
// §20.12). Pure: the share payload, the age gates, the board ranking, the anti-cheat rules, the result a player posts,
// the share card, the links. The server (supabase/migrations/20261204000000_toneturn_phrase_challenges.sql) repeats
// every rule that matters; the dev mock (src/cloud/challengesMock.ts) runs these same functions.
//
//  · The currency is measured mastery: keys passed at the target, then the best clean tempo, then accuracy. No likes,
//    no follower counts, no play counts; the one number shown about a phrase is how many players reached its target.
//  · A result comes only from measured takes (the drill engine's items), never typed in; MIDI takes that look like a
//    sequencer (onsets within 3 ms of the grid and identical velocities) are kept off boards.
//  · Age (§20.7): community (everyone) from 13, public audio only from 16; under 13: friends / class only, no audio.

import type { ItemState } from '../drills/types';
import type { Lick, LickInstrument } from '../licks';
import { PASS_SHARE, PASS_TAKES, PASS_DAYS } from '../drills/ladder';
import { assignmentOf, decodePhraseRef, encodePhraseRef, lickFromAssignment, refBytes, type PhraseAssignment } from './assign';
import { bestTempo, daysPractised, finalHand, itemOf, keysNeeded, NPS_CEIL, onsetsPerBeat, phraseBars, phraseItemId, planOf, passedKeys, PHRASE_PREFIX, type Hand } from './phrase';
import { ageOf } from '../privacy';

type T2 = { en: string; he: string };
const mod = (n: number) => ((n % 12) + 12) % 12;

// ───────────────────────────── limits ─────────────────────────────

/** §11.6: shared phrases are at most 8 bars (teacher assignments may be 16; a share never is). */
export const SHARE_MAX_BARS = 8;
/** The phrase data on the server (`data.ref`): the same compact code as a teacher assignment. */
export const SHARE_REF_MAX = 6000;
export const TITLE_MAX = 60;
/** §11.1 / §20.8: the sharer's own playing, ≤ 20 s, ≤ 400 KB. */
export const CLIP_MAX_S = 20;
export const CLIP_MAX_BYTES = 400_000;
/** Shares a day (the server's rate limit). */
export const SHARES_PER_DAY = 10;
/** Rows a board shows (the top, plus my own row wherever it is). */
export const BOARD_ROWS = 30;
/** Cards per gallery section: a finite page (no infinite scroll). */
export const GALLERY_ROWS = 10;
/** §11.5 automatic actions: distinct reporters. */
export const HOLD_PHRASE_REPORTS = 2;
export const HOLD_ROW_REPORTS = 3;

export type Visibility = 'friends' | 'class' | 'public';
export type InputSource = 'midi' | 'mic' | 'screen';
export const STYLES = ['bebop', 'blues', 'barry', 'modal', 'gospel', 'rock', 'classical', 'latin', 'pop', 'voice'] as const;
export type Style = (typeof STYLES)[number];
export const STYLE_NAME: Record<Style, T2> = {
  bebop: { en: 'Bebop', he: 'ביבופ' },
  blues: { en: 'Blues', he: 'בלוז' },
  barry: { en: 'Barry Harris', he: 'בארי האריס' },
  modal: { en: 'Modal', he: 'מודאלי' },
  gospel: { en: 'Gospel', he: 'גוספל' },
  rock: { en: 'Rock', he: 'רוק' },
  classical: { en: 'Classical', he: 'קלאסי' },
  latin: { en: 'Latin', he: 'לטיני' },
  pop: { en: 'Pop', he: 'פופ' },
  voice: { en: 'Voice', he: 'קולי' },
};
export const isStyle = (s: unknown): s is Style => typeof s === 'string' && (STYLES as readonly string[]).includes(s);

// ───────────────────────────── codes and links ─────────────────────────────

/** 8 opaque characters (no 0/O, 1/I/L): nothing personal in a link. Same alphabet as the challenge links. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const isShareCode = (c: unknown): c is string => typeof c === 'string' && /^[A-HJ-NP-Z2-9]{8}$/.test(c);
export function newShareCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return s;
}
/** The public link: `…/#/p/CODE` (and `/BEAT` for a "beat my tempo" link). */
export const phraseLink = (origin: string, path: string, code: string, beat?: string | null) => `${origin}${path}#/p/${code}${beat ? `/${beat}` : ''}`;
/** "#/p/CODE[/BEAT]" → the codes (null when it is not one). */
export function publicFromHash(hash: string): { code: string; beat: string | null } | null {
  const m = /^#\/?p\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?\/?$/.exec(hash.trim());
  if (!m) return null;
  const code = m[1].toUpperCase();
  const beat = m[2]?.toUpperCase() ?? null;
  return isShareCode(code) && (beat === null || isShareCode(beat)) ? { code, beat } : null;
}
export type ChallengeView = { view: 'gallery' } | { view: 'page'; code: string; beat: string | null } | { view: 'share'; id: string } | { view: 'review' } | { view: 'mine' } | { view: 'gifts'; friend: string | null; dedicate: boolean };
/** In-app routes: #/challenges, /p/CODE[/BEAT], /share/<phraseId>, /review, /mine, /gifts[/<friend>[/dedicate]]. */
export function parseChallengeHash(hash: string): ChallengeView {
  const h = hash.replace(/^#\/?/, '').replace(/^challenges\/?/, '');
  const p = /^p\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?/.exec(h);
  if (p && isShareCode(p[1].toUpperCase())) return { view: 'page', code: p[1].toUpperCase(), beat: p[2] && isShareCode(p[2].toUpperCase()) ? p[2].toUpperCase() : null };
  const s = /^share\/([\w~.-]{3,80})/.exec(h);
  if (s) return { view: 'share', id: decodeURIComponent(s[1]) };
  const g = /^gifts(?:\/([\w-]{1,64}))?(?:\/(dedicate))?/.exec(h);
  if (g) return { view: 'gifts', friend: g[1] ?? null, dedicate: !!g[2] };
  if (/^review\b/.test(h)) return { view: 'review' };
  if (/^mine\b/.test(h)) return { view: 'mine' };
  return { view: 'gallery' };
}

// ───────────────────────────── age gates (§20.7, SPEC-SOCIAL §9) ─────────────────────────────

export interface ShareGate {
  /** Age known (the year of birth is set). */
  known: boolean;
  friends: boolean;
  class: boolean;
  /** "Everyone" (the community): 13+. */
  public: boolean;
  /** Attach my clip to a friends / class share: 13+. */
  audio: boolean;
  /** Attach my clip to a public share: 16+. */
  publicAudio: boolean;
  /** Browse strangers' phrases and the "everyone" board: 13+ or age unknown (young players: friends and class only). */
  community: boolean;
}
/** What a player may do, from the year of birth. Unknown age: friends and class only, until the year is set. */
export function shareGate(birthYear: number | null | undefined, now = new Date()): ShareGate {
  const a = ageOf(birthYear, now);
  const known = a !== null;
  const teen = known && a! >= 13;
  return { known, friends: true, class: true, public: teen, audio: teen, publicAudio: known && a! >= 16, community: !known || teen };
}
/** May this share carry audio? */
export const audioAllowed = (g: ShareGate, v: Visibility) => (v === 'public' ? g.publicAudio : g.audio);
/** Why a choice is closed (null = open). */
export function gateReason(g: ShareGate, v: Visibility, withAudio: boolean): 'age-unknown' | 'under-13' | 'audio-16' | 'audio-13' | null {
  if (v === 'public' && !g.public) return g.known ? 'under-13' : 'age-unknown';
  if (withAudio && !audioAllowed(g, v)) return v === 'public' ? (g.known ? 'audio-16' : 'age-unknown') : g.known ? 'audio-13' : 'age-unknown';
  return null;
}

// ───────────────────────────── the share payload (§11.2) ─────────────────────────────

/** The level 1–5 from note rate at the target, range, chromaticism and hands (§11.2; editable one step). */
export function shareLevel(l: Lick, inst: LickInstrument = l.instrument ?? 'piano', bpm = planOf(l).goalBpm): number {
  const all = [...l.notes, ...(l.lh ?? [])];
  if (!all.length) return 1;
  const nps = (onsetsPerBeat(l) * bpm) / 60;
  const rate = nps / NPS_CEIL[inst]; // share of the instrument's ceiling
  let pts = rate < 0.2 ? 0 : rate < 0.32 ? 1 : rate < 0.45 ? 2 : rate < 0.6 ? 3 : 4;
  const semis = all.map((n) => n[0]);
  const range = Math.max(...semis) - Math.min(...semis);
  if (range > 12) pts += 1;
  if (range > 19) pts += 1;
  // chromatic: notes outside the home scale (major / natural minor) — the phrase is stored relative to its tonic
  const scale = l.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const out = l.notes.filter((n) => !scale.includes(mod(n[0]))).length / Math.max(1, l.notes.length);
  if (out > 0.2) pts += 1;
  if (l.lh?.length && l.notes.length) pts += 1;
  return Math.max(1, Math.min(5, 1 + Math.round((pts * 4) / 8)));
}

export interface ShareMeta {
  title: string;
  style: Style | null;
  /** The level after the player's edit (one step from the auto level at most). */
  level: number;
  visibility: Visibility;
  classId?: string | null;
  attested: boolean;
  /** Attach the clip (the upload happens after the share is made). */
  audio: boolean;
}
/** What goes to the server for one share. */
export interface SharePayload {
  title: string;
  instrument: LickInstrument;
  level: number;
  style: Style | null;
  /** The context line (chords / key) as the sharer sees it, e.g. "ii–V–I · F". */
  context: string;
  homeKey: number;
  visibility: Visibility;
  classId: string | null;
  /** The phrase + its challenge plan (the teacher-assignment code: notes packed, chords, plan). */
  ref: string;
  /** Onsets per beat (the server's note-rate check). */
  opb: number;
  /** Keys a player needs for "learned it" (12; a sung phrase: the keys in range). */
  needed: number;
  goalBpm: number;
  grade: number | null;
  audio: boolean;
}
export type ShareProblem = 'empty' | 'bars' | 'size' | 'title' | 'attest' | 'class' | 'age-unknown' | 'under-13' | 'audio-16' | 'audio-13' | 'known-melody';

/** The challenge plan a share carries (from the sharer's own plan, §11.2). */
export function challengeAssignment(l: Lick, inst: LickInstrument, lang: 'en' | 'he', title: string): PhraseAssignment {
  const p = planOf(l);
  const a = assignmentOf(l, { goalBpm: p.goalBpm, startBpm: p.startBpm, keys: p.keys, order: p.order, hands: p.hands, band: p.band }, { lang });
  return { ...a, name: title.trim().slice(0, TITLE_MAX) || a.name, instrument: inst };
}

/** Build the payload and say what blocks it (empty list = can go). `known` is the known-melody check's verdict. */
export function sharePayload(
  l: Lick,
  meta: ShareMeta,
  o: { inst?: LickInstrument; lang?: 'en' | 'he'; gate: ShareGate; context?: string; grade?: number | null; known?: boolean },
): { payload: SharePayload; problems: ShareProblem[] } {
  const inst = o.inst ?? l.instrument ?? 'piano';
  const a = challengeAssignment(l, inst, o.lang ?? 'he', meta.title);
  const ref = encodePhraseRef(a);
  const auto = shareLevel(l, inst);
  const level = Math.max(1, Math.min(5, Math.max(auto - 1, Math.min(auto + 1, Math.round(meta.level || auto)))));
  const problems: ShareProblem[] = [];
  if (!l.notes.length && !l.lh?.length) problems.push('empty');
  if (phraseBars(l) > SHARE_MAX_BARS + 1e-6) problems.push('bars');
  if (refBytes(ref) > SHARE_REF_MAX) problems.push('size');
  if (!meta.title.trim() || meta.title.trim().length > TITLE_MAX) problems.push('title');
  if (!meta.attested) problems.push('attest');
  if (meta.visibility === 'class' && !meta.classId) problems.push('class');
  const g = gateReason(o.gate, meta.visibility, meta.audio);
  if (g) problems.push(g);
  // §11.6: a known melody never goes to the community; a short quote for study may go to friends / the class
  if (o.known && meta.visibility === 'public') problems.push('known-melody');
  return {
    payload: {
      title: meta.title.trim().slice(0, TITLE_MAX),
      instrument: inst,
      level,
      style: meta.style,
      context: (o.context ?? '').slice(0, 40),
      homeKey: mod(l.homeKey ?? 0),
      visibility: meta.visibility,
      classId: meta.visibility === 'class' ? (meta.classId ?? null) : null,
      ref,
      opb: Math.round(onsetsPerBeat(l) * 1000) / 1000,
      needed: keysNeeded(l, inst),
      goalBpm: planOf(l).goalBpm,
      grade: o.grade ?? null,
      audio: meta.audio && !g,
    },
    problems,
  };
}

// ───────────────────────────── taking the challenge (§11.3) ─────────────────────────────

/** The taker's phrase id: stable per share code, so progress survives a reload / a second device. */
export const sharedPhraseId = (code: string) => `${PHRASE_PREFIX}sh-${code}`;
/** The shared phrase as the taker's Encore phrase: the challenge's plan, target / keys / hands locked (comparable boards). */
export function lickFromShare(ref: string, code: string, by: string, now = new Date().toISOString()): Lick | null {
  const a = decodePhraseRef(ref);
  if (!a) return null;
  const base = lickFromAssignment(a, code, by, now);
  return { ...base, id: sharedPhraseId(code), name: { en: a.name || 'Shared phrase', he: a.name || 'משפט משותף' }, source: { kind: 'shared', code, by } };
}
export const isSharedPhrase = (l: Lick) => l.source?.kind === 'shared';
/** The share code a phrase belongs to: one I took, or one I shared. */
export const shareCodeOf = (l: Lick): string | null => (l.source?.kind === 'shared' ? l.source.code : (l.shared?.code ?? null));

// ───────────────────────────── the result a player posts (§11.5) ─────────────────────────────

/** A measured take of the phrase (from My recordings): onsets in ms, MIDI velocities. */
export interface TakeTrace {
  source: InputSource;
  bpm: number;
  notes: { on: number; vel: number }[];
  acc?: number;
}
export interface ChallengeResult {
  keys: number;
  bestBpm: number;
  acc: number;
  source: InputSource;
  /** Hash of the best take's onset deviations + velocities (an admin may ask for that take on a report). */
  digest: string;
  /** Measured takes at tempo (all keys) and days practised: the server's ladder checks. */
  takes: number;
  days: number;
  /** A MIDI take that looks like a sequencer: graded, never on boards. */
  machine: boolean;
}

/**
 * MIDI timing sanity (§11.5): onsets whose spread from the nearest 1/12-beat grid point is under 3 ms AND identical
 * velocities look like a sequencer playing the phrase back. Needs at least 6 notes; only MIDI takes are judged.
 */
export function machineLike(t: TakeTrace): boolean {
  if (t.source !== 'midi' || t.notes.length < 6 || !(t.bpm > 0)) return false;
  const P = 60000 / t.bpm;
  const t0 = t.notes[0].on;
  const dev = t.notes.map((n) => {
    const b = (n.on - t0) / P;
    return (b - Math.round(b * 12) / 12) * P;
  });
  const mean = dev.reduce((a, b) => a + b, 0) / dev.length;
  const sd = Math.sqrt(dev.reduce((a, b) => a + (b - mean) ** 2, 0) / dev.length);
  const vels = new Set(t.notes.map((n) => n.vel));
  return sd < 3 && vels.size === 1;
}

/** FNV-1a over (onset deviation in ms, velocity) of a take: 16 hex characters. */
export function takeDigest(t: TakeTrace | null): string {
  if (!t || !t.notes.length) return '';
  const P = t.bpm > 0 ? 60000 / t.bpm : 500;
  const t0 = t.notes[0].on;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (const n of t.notes) {
    const b = (n.on - t0) / P;
    const d = Math.round((b - Math.round(b * 12) / 12) * P);
    for (const x of [d & 0xff, (d >> 8) & 0xff, n.vel & 0xff]) {
      h1 = Math.imul(h1 ^ x, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ x, 0x01000193 ^ 0x2f) >>> 0;
    }
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** All the item ids of a phrase on an instrument (12 keys × the final hand). */
export const phraseItemIds = (l: Lick, inst: LickInstrument = 'piano', hand: Hand = finalHand(l)): string[] => Array.from({ length: 12 }, (_, k) => phraseItemId(l, inst, k, hand));

/**
 * The result from the drill engine's items (only measured takes create items) and the kept takes of the phrase.
 * null = nothing measured at tempo yet (free-time takes alone never post).
 */
export function challengeResult(l: Lick, items: Record<string, ItemState>, inst: LickInstrument = 'piano', traces: readonly TakeTrace[] = []): ChallengeResult | null {
  const hand = finalHand(l);
  let takes = 0;
  let acc = 0;
  for (let k = 0; k < 12; k++) {
    const st = itemOf(l, items, k, inst, hand);
    if (!st) continue;
    const timed = (st.history ?? []).length + (st.passLog ?? []).length;
    if (timed > 0 || st.cleanBpm > 0) takes += st.takes;
    if (st.cleanBpm > 0) acc = Math.max(acc, st.ewma?.acc ?? 0);
  }
  const best = bestTempo(l, items, inst);
  if (!takes || best <= 0) return null;
  const keys = passedKeys(l, items, inst, hand).length;
  const midi = traces.filter((t) => t.source === 'midi');
  const source: InputSource = traces.length ? (midi.length * 2 >= traces.length ? 'midi' : traces.some((t) => t.source === 'mic') ? 'mic' : 'screen') : 'screen';
  const top = [...traces].sort((a, b) => b.bpm - a.bpm || (b.acc ?? 0) - (a.acc ?? 0))[0] ?? null;
  // A sequencer-like take in the measured set keeps the whole result off boards (graded on the device as usual).
  const machine = traces.some(machineLike);
  return { keys, bestBpm: Math.round(best), acc: Math.round(Math.min(1, Math.max(0, acc)) * 1000) / 1000, source, digest: takeDigest(top), takes, days: daysPractised(l, items, inst), machine };
}
/** Did the result change enough to send again? */
export const resultChanged = (a: Pick<ChallengeResult, 'keys' | 'bestBpm' | 'acc' | 'machine'> | null, b: Pick<ChallengeResult, 'keys' | 'bestBpm' | 'acc' | 'machine'>) =>
  !a || a.keys !== b.keys || a.bestBpm !== b.bestBpm || Math.abs(a.acc - b.acc) >= 0.005 || a.machine !== b.machine;

// ───────────────────────────── plausibility (§11.5; the server runs the same rules) ─────────────────────────────

export interface PhraseFacts {
  instrument: LickInstrument;
  /** Onsets per beat. */
  opb: number;
  needed: number;
  goalBpm: number;
}
export type Implausible = 'tempo-range' | 'note-rate' | 'keys-range' | 'keys-takes' | 'keys-days' | 'keys-tempo' | 'acc-range' | 'too-fast-rise' | 'takes-rate';
/**
 * Why a result cannot be real (empty = plausible): the note rate at the claimed tempo above the instrument's ceiling
 * (+10 %), more keys than needed, a key without its 3 takes on 2 days, keys at target without the target tempo, a rise
 * faster than the ladder allows since the last result (3 keys + one per 10 minutes), more takes than a person plays (10 +
 * 6 a minute since the last result).
 */
export function implausible(r: Pick<ChallengeResult, 'keys' | 'bestBpm' | 'acc' | 'takes' | 'days'>, f: PhraseFacts, prev?: { keys: number; at: number; takes?: number } | null, now = Date.now()): Implausible[] {
  const out: Implausible[] = [];
  if (!(r.bestBpm >= 20 && r.bestBpm <= 400)) out.push('tempo-range');
  if ((f.opb * r.bestBpm) / 60 > NPS_CEIL[f.instrument] * 1.1) out.push('note-rate');
  if (r.keys < 0 || r.keys > Math.max(1, f.needed)) out.push('keys-range');
  if (r.keys * PASS_TAKES > r.takes) out.push('keys-takes');
  if (r.keys > 0 && r.days < PASS_DAYS) out.push('keys-days');
  if (r.keys > 0 && r.bestBpm < PASS_SHARE * f.goalBpm - 1e-9) out.push('keys-tempo');
  if (!(r.acc >= 0 && r.acc <= 1)) out.push('acc-range');
  if (prev && r.keys - prev.keys > 3 + Math.floor(Math.max(0, now - prev.at) / 600_000)) out.push('too-fast-rise');
  if (prev && prev.takes !== undefined && r.takes - prev.takes > 10 + (6 * Math.max(0, now - prev.at)) / 60_000) out.push('takes-rate');
  return out;
}

/** One device posting for several accounts on the same phrase (duplicate devices): the newcomer's row is flagged. */
export function deviceConflict(seen: readonly { device: string; user: string }[], device: string, user: string): boolean {
  return !!device && seen.some((s) => s.device === device && s.user !== user);
}

// ───────────────────────────── the board (§11.3) ─────────────────────────────

export interface BoardRow {
  userId: string;
  name: string;
  keys: number;
  bestBpm: number;
  acc: number;
  source: InputSource;
  at: string;
  me?: boolean;
  creator?: boolean;
  flagged?: boolean;
  hasAudio?: boolean;
  icon?: string | null;
  color?: string | null;
}
/** Mastery order: keys at target, then the best clean tempo, then accuracy, then who got there first. */
export function compareRows(a: BoardRow, b: BoardRow): number {
  return b.keys - a.keys || b.bestBpm - a.bestBpm || b.acc - a.acc || a.at.localeCompare(b.at);
}
/**
 * The board as shown: flagged rows out (my own stays, marked), the creator pinned first with a tag, the rest ranked
 * 1…n; at most `max` ranked rows plus my own row when it is further down.
 */
export function rankBoard(rows: readonly BoardRow[], max = BOARD_ROWS): { creator: BoardRow | null; ranked: (BoardRow & { rank: number })[]; mine: (BoardRow & { rank: number }) | null } {
  const shown = rows.filter((r) => !r.flagged || r.me);
  const creator = shown.find((r) => r.creator) ?? null;
  const rest = shown.filter((r) => !r.creator && !r.flagged).sort(compareRows).map((r, i) => ({ ...r, rank: i + 1 }));
  const ranked = rest.slice(0, max);
  const meRow = rest.find((r) => r.me) ?? null;
  const myFlagged = shown.find((r) => r.me && r.flagged && !r.creator);
  const mine = meRow && !ranked.includes(meRow) ? meRow : myFlagged ? { ...myFlagged, rank: 0 } : null;
  return { creator, ranked, mine };
}
/** "12 keys · ♩208 · 98 %" parts. */
export const rowFacts = (r: Pick<BoardRow, 'keys' | 'bestBpm' | 'acc'>) => ({ keys: r.keys, bpm: r.bestBpm, pct: Math.round(r.acc * 100) });

// ───────────────────────────── gallery (§11.4) ─────────────────────────────

export interface GalleryFilter {
  instrument?: LickInstrument | null;
  /** Level band: [min, max]. */
  level?: [number, number] | null;
  style?: Style | null;
}
export const LEVEL_BANDS: [number, number][] = [
  [1, 2],
  [3, 3],
  [4, 5],
];
export function matchesGallery<T extends { instrument: LickInstrument; level: number; style: string | null }>(p: T, f: GalleryFilter): boolean {
  if (f.instrument && p.instrument !== f.instrument) return false;
  if (f.level && (p.level < f.level[0] || p.level > f.level[1])) return false;
  if (f.style && p.style !== f.style) return false;
  return true;
}
/** The ISO week's Monday (UTC) — the featured phrase's week and its board's reset. */
export function weekStart(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}
export const daysLeftInWeek = (d = new Date()) => 7 - ((d.getUTCDay() + 6) % 7);
/**
 * The app's pick for the week (§20.12) when the owner did not choose: a public live phrase, most "learned it" in the
 * last 7 days, then most players at the target, then the newest; never the same phrase two weeks running.
 */
export function pickFeatured<T extends { id: string; visibility: Visibility; status: string; learnedWeek: number; reached: number; createdAt: string }>(cands: readonly T[], lastWeek?: string | null): T | null {
  const ok = cands.filter((c) => c.visibility === 'public' && c.status === 'live' && c.id !== lastWeek);
  return [...ok].sort((a, b) => b.learnedWeek - a.learnedWeek || b.reached - a.reached || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

// ───────────────────────────── the share card (§11.7): src/ui/studio/shareCard.tsx ─────────────────────────────

/** The share text that goes with the link (no emoji, nothing personal beyond the nickname). */
export function shareText(o: { title: string; bpm: number; keys: number; lang: 'en' | 'he'; beat?: { bpm: number; keys: number } | null }): string {
  if (o.beat) return o.lang === 'he' ? `תנצחו את הטמפו שלי בחוש ה־7: ♩${o.beat.bpm} ב־${o.beat.keys} סולמות — ${o.title}` : `Beat my tempo on The 7th Sense: ♩${o.beat.bpm} in ${o.beat.keys} keys — ${o.title}`;
  return o.lang === 'he' ? `אתגר הדרן בחוש ה־7: ${o.title} · ♩${o.bpm} · ${o.keys} סולמות` : `Encore challenge on The 7th Sense: ${o.title} · ♩${o.bpm} · ${o.keys} keys`;
}

/** Notes of a shared phrase for the card / the staff (home key, the right hand or the line). */
export function shareNotes(ref: string): { notes: { pitch: number; beat: number; dur: number }[]; lh: { pitch: number; beat: number; dur: number }[]; beats: number; meter: number; a: PhraseAssignment } | null {
  const a = decodePhraseRef(ref);
  if (!a) return null;
  const t = 60 + mod(a.homeKey) - (mod(a.homeKey) > 5 ? 12 : 0);
  const notes = a.rh.map(([s, b, d]) => ({ pitch: t + s, beat: b, dur: d }));
  const lh = a.lh.map(([s, b, d]) => ({ pitch: t - 12 + s, beat: b, dur: d }));
  const beats = Math.max(1, ...[...notes, ...lh].map((n) => n.beat + n.dur));
  return { notes, lh, beats: Math.ceil(beats / a.meter - 1e-6) * a.meter, meter: a.meter, a };
}

export type { PhraseAssignment };
/** For tests and the mock: the "keys passed at target" share a result needs (re-exported pass rule). */
export const PASS_RULE = { takes: PASS_TAKES, days: PASS_DAYS, share: PASS_SHARE };
