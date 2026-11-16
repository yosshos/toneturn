// Teacher phrase assignments (SPEC-PHRASE-STUDIO §11, §12.3, owner decisions §20.5 and §20.9). Pure.
//
//  · The teacher plays a few bars (or picks one of their phrases), trims to ≤ 16 bars, and sets the target tempo, the
//    keys (all / some / home only), the order, the hands, the band, the strictness, a note. The phrase and the plan
//    travel in the assignment's `ref` as a compact code (`phrase1:` + JSON, notes packed 5 bytes each, base64url):
//    ≤ 4 KB for 16 bars (§11.4 sync model — note data only; the teacher's audio only when attached).
//  · The student's copy is an ordinary Encore phrase (Lick v3) with `source: { kind: 'teacher' }` and the teacher's
//    fields locked (`plan.locked`); it practises like any phrase (slower and in any order are always allowed).
//  · Each key passed at the target (the level rule: 3 clean takes on 2 days) becomes one submission —
//    score = accuracy × timing factor, metrics `{ key, bpm, acc, timingSD, hands, takes }` (§11.3).
//  · The teacher's inbox grades automatically by the strictness (owner decision §20.9) and the teacher may override.

import type { ItemState } from '../drills/types';
import type { Lick, LickBook, LickChord, LickInstrument, LickNote, PhrasePlan } from '../licks';
import { catchTake } from './detect';
import { chordsFor, draftFrom, type TrimState } from './library';
import { autoName, defaultPlan, finalHand, itemOf, keyPassed, makePhrase, phraseBars, phraseBeats, PHRASE_PREFIX, planOf, type Hand } from './phrase';
import type { RawNote, EncoreTake } from './takeSource';

type T2 = { en: string; he: string };
const mod = (n: number) => ((n % 12) + 12) % 12;

/** Owner decision §20.5: phrases up to 8 bars, teacher assignments up to 16. */
export const MAX_TEACHER_BARS = 16;
/** §11.4: the assigned phrase's note data stays under 4 KB. */
export const PHRASE_REF_MAX = 4096;
/** The old server rule on `ref` (2000 chars) — the limit while the phrase migration is not applied. */
export const LEGACY_REF_MAX = 2000;
export const REF_PREFIX = 'phrase1:';
/** Teacher's attached audio (§11.4): ≤ 30 s, ≤ 300 KB. */
export const TEACHER_AUDIO_MAX_BYTES = 300_000;
export const TEACHER_AUDIO_MAX_S = 30;

export type Strictness = 'lenient' | 'moderate' | 'strict';
export type Mark = 'great' | 'good' | 'again';
/** Pass marks by strictness (= teacher.ts PASS, kept here so the engine stays free of the cloud client). */
export const STRICT_PASS: Record<Strictness, number> = { lenient: 0.6, moderate: 0.75, strict: 0.9 };

/** What the teacher sets (§11.1). */
export interface PhraseAssignPlan {
  goalBpm: number;
  startBpm?: number;
  keys: number[] | 'all';
  order: PhrasePlan['order'];
  hands: PhrasePlan['hands'];
  band: boolean;
}
/** The assignment's phrase payload (decoded `ref`). */
export interface PhraseAssignment {
  v: 1;
  name: string;
  homeKey: number;
  minor: boolean;
  meter: 3 | 4 | 5 | 6;
  swing: number;
  chords: LickChord[];
  rh: LickNote[];
  lh: LickNote[];
  instrument: LickInstrument;
  plan: PhraseAssignPlan;
  /** The teacher's attached audio (a storage path) — only when attached and the server has the bucket. */
  audio?: string;
  /** The teacher's display name (shown as "from the teacher: …"). */
  teacher?: string;
}

// ───────────────────────────── packing (5 bytes a note) ─────────────────────────────

/** Beats are kept in 1/24 of a beat: sixteenths, triplets and thirty-seconds stay exact. */
const TICKS = 24;
function packNotes(ns: readonly LickNote[]): Uint8Array {
  const out = new Uint8Array(ns.length * 5);
  ns.forEach(([semi, beat, dur], i) => {
    const s = Math.max(-128, Math.min(127, Math.round(semi))) + 128;
    const b = Math.max(0, Math.min(65535, Math.round(beat * TICKS)));
    const d = Math.max(1, Math.min(65535, Math.round(dur * TICKS)));
    out.set([s, b >> 8, b & 255, d >> 8, d & 255], i * 5);
  });
  return out;
}
function unpackNotesB(b: Uint8Array): LickNote[] {
  const out: LickNote[] = [];
  for (let i = 0; i + 4 < b.length; i += 5) out.push([b[i] - 128, ((b[i + 1] << 8) | b[i + 2]) / TICKS, ((b[i + 3] << 8) | b[i + 4]) / TICKS]);
  return out;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const k = Math.min(3, bytes.length - i);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (k > 1 ? B64[(n >> 6) & 63] : '') + (k > 2 ? B64[n & 63] : '');
  }
  return s;
}
export function unb64url(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9_-]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c = [0, 1, 2, 3].map((j) => (i + j < clean.length ? B64.indexOf(clean[i + j]) : -1));
    const n = (c[0] << 18) | (c[1] << 12) | (Math.max(0, c[2]) << 6) | Math.max(0, c[3]);
    out.push((n >> 16) & 255);
    if (c[2] >= 0) out.push((n >> 8) & 255);
    if (c[3] >= 0) out.push(n & 255);
  }
  return new Uint8Array(out);
}
const utf8 = (s: string) => new TextEncoder().encode(s);
const INST_CH: Record<LickInstrument, string> = { piano: 'p', guitar: 'g', bass: 'b', voice: 'v' };
const CH_INST: Record<string, LickInstrument> = { p: 'piano', g: 'guitar', b: 'bass', v: 'voice' };
const ORDERS: PhrasePlan['order'][] = ['easiest', 'fourths', 'chromatic', 'weak', 'custom'];
const HANDS: PhrasePlan['hands'][] = ['R', 'L', 'RL', 'R-then-RL'];

/** The assignment as its `ref` code. */
export function encodePhraseRef(a: PhraseAssignment): string {
  const o: Record<string, unknown> = {
    n: a.name.slice(0, 60),
    k: mod(a.homeKey),
    m: a.meter,
    c: a.chords.map(([r, q, b]) => [mod(r), q, Math.round(b * 100) / 100]),
    r: b64url(packNotes(a.rh)),
    i: INST_CH[a.instrument] ?? 'p',
    p: [Math.round(a.plan.goalBpm), a.plan.startBpm ? Math.round(a.plan.startBpm) : 0, a.plan.keys === 'all' ? 'a' : a.plan.keys.map(mod).join('.'), ORDERS.indexOf(a.plan.order), HANDS.indexOf(a.plan.hands), a.plan.band ? 1 : 0],
  };
  if (a.minor) o.mi = 1;
  if (Math.abs(a.swing - 0.5) > 0.005) o.s = Math.round(a.swing * 100) / 100;
  if (a.lh.length) o.l = b64url(packNotes(a.lh));
  if (a.audio) o.au = a.audio;
  if (a.teacher) o.t = a.teacher.slice(0, 40);
  // the notes are already packed; the wrapper stays plain JSON (a second base64 would cost a third more)
  return REF_PREFIX + JSON.stringify(o);
}
export const isPhraseRef = (ref: string | null | undefined): boolean => !!ref && ref.startsWith(REF_PREFIX);

/** A `ref` code back as the assignment (null when it is not one, or broken). */
export function decodePhraseRef(ref: string | null | undefined): PhraseAssignment | null {
  if (!isPhraseRef(ref)) return null;
  try {
    const o = JSON.parse(ref!.slice(REF_PREFIX.length)) as Record<string, unknown>;
    const p = (o.p as (number | string)[]) ?? [];
    const keys = p[2] === 'a' || p[2] === undefined ? ('all' as const) : String(p[2]).split('.').filter(Boolean).map(Number).filter((k) => Number.isFinite(k)).map(mod);
    const meter = ([3, 4, 5, 6].includes(o.m as number) ? o.m : 4) as 3 | 4 | 5 | 6;
    const rh = unpackNotesB(unb64url(String(o.r ?? '')));
    const lh = o.l ? unpackNotesB(unb64url(String(o.l))) : [];
    if (!rh.length && !lh.length) return null;
    return {
      v: 1,
      name: String(o.n ?? '').slice(0, 60),
      homeKey: mod(Number(o.k ?? 0)),
      minor: o.mi === 1,
      meter,
      swing: typeof o.s === 'number' ? o.s : 0.5,
      chords: ((o.c as LickChord[]) ?? []).filter((c) => Array.isArray(c) && c.length === 3).map(([r, q, b]) => [mod(Number(r)), String(q), Number(b)] as LickChord),
      rh,
      lh,
      instrument: CH_INST[String(o.i)] ?? 'piano',
      plan: {
        goalBpm: Math.max(20, Math.min(400, Number(p[0]) || 100)),
        ...(Number(p[1]) ? { startBpm: Number(p[1]) } : {}),
        keys: keys === 'all' || keys.length ? keys : 'all',
        order: ORDERS[Number(p[3])] ?? 'easiest',
        hands: HANDS[Number(p[4])] ?? 'R',
        band: Number(p[5]) === 1,
      },
      ...(o.au ? { audio: String(o.au) } : {}),
      ...(o.t ? { teacher: String(o.t) } : {}),
    };
  } catch {
    return null;
  }
}

/** Bytes the ref takes on the wire (UTF-8; the code itself is ASCII). */
export const refBytes = (ref: string) => utf8(ref).length;

// ───────────────────────────── teacher: make the assignment ─────────────────────────────

/** A phrase (one of the teacher's, or just recorded) + the teacher's plan → the assignment. */
export function assignmentOf(l: Lick, plan: PhraseAssignPlan, o: { teacher?: string; audio?: string; lang?: 'en' | 'he' } = {}): PhraseAssignment {
  // the name in the teacher's language (the class reads what the teacher sees)
  const name = typeof l.name === 'string' ? (l.name as string) : l.name[o.lang ?? 'he'] || l.name.he || l.name.en;
  return {
    v: 1,
    name,
    homeKey: l.homeKey ?? 0,
    minor: !!l.minor,
    meter: l.meter ?? 4,
    swing: l.swing ?? (l.straight === false ? 0.6 : 0.5),
    chords: l.chords,
    rh: l.lh?.length || l.notes.length ? l.notes : [],
    lh: l.lh ?? [],
    instrument: l.instrument ?? 'piano',
    plan,
    ...(o.audio ? { audio: o.audio } : {}),
    ...(o.teacher ? { teacher: o.teacher } : {}),
  };
}

/** Cut a phrase to bars [fromBar, toBar) (0-based, whole bars), at most MAX_TEACHER_BARS. */
export function trimBars(l: Lick, fromBar: number, toBar: number): Lick {
  const m = l.meter ?? 4;
  const total = phraseBars(l);
  const f = Math.max(0, Math.min(total - 1, Math.floor(fromBar)));
  const t = Math.max(f + 1, Math.min(total, Math.floor(toBar), f + MAX_TEACHER_BARS));
  const a = f * m;
  const b = t * m;
  const cut = (ns: readonly LickNote[]) => ns.filter((n) => n[1] >= a - 1e-6 && n[1] < b - 1e-6).map(([s, x, d]) => [s, Math.round((x - a) * 1000) / 1000, Math.round(Math.min(d, b - x) * 1000) / 1000] as LickNote);
  const chords: LickChord[] = [];
  let at = 0;
  for (const c of l.chords) {
    const s = Math.max(at, a);
    const e = Math.min(at + c[2], b);
    if (e > s) chords.push([c[0], c[1], e - s]);
    at += c[2];
  }
  const notes = cut(l.notes);
  const lh = l.lh ? cut(l.lh) : undefined;
  return { ...l, notes, ...(lh?.length ? { lh } : { lh: undefined }), chords };
}

/**
 * Notes the teacher just played (MIDI, ms) → a phrase on the detected grid: key, tempo, meter and chords detected (the
 * teacher can fix the key / tempo), the selection from the first bar with notes, up to MAX_TEACHER_BARS bars.
 */
export function phraseFromPlaying(notes: RawNote[], o: { id?: string; bpm?: number; key?: number; minor?: boolean; bars?: number; inst?: LickInstrument; now?: string } = {}): { l: Lick; bars: number; bpm: number; key: number; minor: boolean } | null {
  if (notes.length < 3) return null;
  const now = o.now ?? new Date().toISOString();
  const caught = catchTake(notes, o.bpm ? { bpm: o.bpm } : undefined);
  const bpm = o.bpm ?? caught.grid.bpm;
  const m = caught.meter;
  const P = 60000 / bpm;
  const t0 = caught.grid.t0;
  const first = Math.min(...notes.map((n) => (n.on - t0) / P));
  const last = Math.max(...notes.map((n) => ((n.off ?? n.on + P / 2) - t0) / P));
  const from = Math.floor(first / m + 1e-6) * m;
  const bars = Math.max(1, Math.min(o.bars ?? MAX_TEACHER_BARS, MAX_TEACHER_BARS, Math.ceil((last - from) / m - 0.05)));
  const to = from + bars * m;
  const key = o.key ?? caught.key.best.tonic;
  const minor = o.minor ?? caught.key.best.minor;
  const take: EncoreTake = { id: `teach-${Date.parse(now).toString(36)}`, at: now, kind: 'record', instrument: o.inst ?? 'piano', title: { en: 'Teacher', he: 'מורה' }, source: 'midi', notes };
  const s: TrimState = { takeId: take.id, from, to, view: 'roll', key, minor, chordsOn: true, quant: caught.swing > 0.54 ? 'swing' : 'grid', split: null, name: '', bpm, meter: m, swing: caught.swing, edits: {}, t0 };
  // detected chords are relative to the detected key: a key the teacher changed drops them
  const sameKey = key === caught.key.best.tonic && minor === caught.key.best.minor;
  const chords = sameKey ? chordsFor(caught.key.chords ?? [], from, to, m) : [];
  const d = draftFrom(take, s, chords, chords.length ? caught.key.ctx : 'free', o.id ?? `${PHRASE_PREFIX}t${Date.parse(now).toString(36)}`, now);
  const l = makePhrase({ ...d, source: undefined, name: autoName(d.ctx, key, minor, 'record', new Date(now)) });
  return { l, bars, bpm, key, minor };
}

/** The teacher's default plan for a phrase (the app's own default, then the teacher changes what they like). */
export function defaultAssignPlan(l: Lick): PhraseAssignPlan {
  const p = defaultPlan(l, l.playedBpm ?? 80);
  return { goalBpm: p.goalBpm, keys: 'all', order: 'easiest', hands: p.hands, band: false };
}

/** Why the assignment cannot go yet (null = fine): too long, too big for the server's current limit. */
export function assignProblem(a: PhraseAssignment, refLimit: number): 'empty' | 'bars' | 'size' | null {
  if (!a.rh.length && !a.lh.length) return 'empty';
  const beats = Math.max(...[...a.rh, ...a.lh].map((n) => n[1] + n[2]));
  if (beats / a.meter > MAX_TEACHER_BARS + 1e-6) return 'bars';
  if (refBytes(encodePhraseRef(a)) > refLimit) return 'size';
  return null;
}

// ───────────────────────────── student: the phrase and its submissions ─────────────────────────────

/** The student's phrase id for an assignment: stable, so progress survives a reload / a second device. */
export const teacherPhraseId = (assignmentId: string) => `${PHRASE_PREFIX}as-${assignmentId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

/** The assignment as the student's Encore phrase: the teacher's plan, target / keys / hands locked. */
export function lickFromAssignment(a: PhraseAssignment, assignmentId: string, teacher: string, now = new Date().toISOString()): Lick {
  const rh = a.rh.length ? a.rh : a.lh.map(([s, b, d]) => [s - 12, b, d] as LickNote);
  const base: Lick = {
    id: teacherPhraseId(assignmentId),
    v: 3,
    ctx: 'free',
    level: 3,
    name: { en: a.name || 'From the teacher', he: a.name || 'מהמורה' },
    own: true,
    chords: a.chords,
    notes: rh,
    ...(a.rh.length && a.lh.length ? { lh: a.lh } : {}),
    meter: a.meter,
    swing: a.swing,
    straight: a.swing <= 0.54,
    homeKey: a.homeKey,
    minor: a.minor,
    instrument: a.instrument,
    playedBpm: a.plan.goalBpm,
    source: { kind: 'teacher', assignmentId, teacher },
    createdAt: now,
  };
  const d = defaultPlan(base, a.plan.goalBpm * 0.8, a.instrument);
  const goal = a.plan.goalBpm;
  const start = Math.min(goal, a.plan.startBpm ?? Math.min(d.startBpm, Math.round(goal * 0.6)));
  const hands = base.lh?.length ? a.plan.hands : a.plan.hands === 'L' ? 'L' : 'R';
  return { ...base, plan: { ...d, startBpm: Math.max(30, start), goalBpm: goal, keys: a.plan.keys, order: a.plan.order, hands, band: a.plan.band, locked: ['goalBpm', 'keys', 'hands'], inToday: true, inWorkout: true } };
}

/** Put (or refresh) the teacher's phrase in the lick book, keeping the student's own fields when it is already there. */
export function withAssignedPhrase(book: LickBook | undefined, l: Lick): LickBook {
  const own = book?.own ?? [];
  const have = own.find((x) => x.id === l.id);
  const next = have ? { ...l, createdAt: have.createdAt ?? l.createdAt, ...(have.folder ? { folder: have.folder } : {}), ...(have.tags ? { tags: have.tags } : {}) } : l;
  return { ...(book ?? {}), own: [...own.filter((x) => x.id !== l.id), next] };
}

export const isTeacherPhrase = (l: Lick): boolean => l.source?.kind === 'teacher';
export const assignmentIdOf = (l: Lick): string | null => (l.source?.kind === 'teacher' ? l.source.assignmentId : null);
/** The keys the teacher asked for (all 12 when 'all'). */
export const requiredKeys = (l: Lick): number[] => {
  const k = planOf(l).keys;
  return k === 'all' ? Array.from({ length: 12 }, (_, i) => i) : [...new Set(k.map(mod))].sort((a, b) => a - b);
};

export interface KeySubmission {
  key: number;
  score: number;
  metrics: { key: number; bpm: number; acc: number; timingSD: number | null; hands: Hand; takes: number; kind: 'phrase'; phrase: string };
}

/** Accuracy × timing factor (a spread under 25 ms costs nothing; 175 ms and more costs 40 %). */
export function phraseScore(acc: number, timingSD: number | null): number {
  const f = timingSD === null || !Number.isFinite(timingSD) ? 1 : Math.max(0.6, Math.min(1, 1 - Math.max(0, timingSD - 25) / 375));
  return Math.round(Math.max(0, Math.min(1, acc)) * f * 1000) / 1000;
}

/** The submission of one passed key (null when the key is not passed at the target). */
export function keySubmission(l: Lick, items: Record<string, ItemState>, key: number, inst: LickInstrument = 'piano'): KeySubmission | null {
  const hand = finalHand(l);
  if (!keyPassed(l, items, key, inst, hand)) return null;
  const st = itemOf(l, items, key, inst, hand);
  if (!st) return null;
  const bpm = Math.max(st.cleanBpm ?? 0, ...(st.passLog ?? []).map((x) => x.bpm));
  const sd = st.ewma?.sd ? Math.round(st.ewma.sd) : null;
  const acc = Math.round((st.ewma?.acc ?? 1) * 1000) / 1000;
  return { key: mod(key), score: phraseScore(acc, sd), metrics: { key: mod(key), bpm: Math.round(bpm), acc, timingSD: sd, hands: hand, takes: st.takes, kind: 'phrase', phrase: l.id } };
}

/** Required keys passed but not sent yet (each passed key is submitted once). */
export function pendingKeySubmissions(l: Lick, items: Record<string, ItemState>, sent: readonly number[], inst: LickInstrument = 'piano'): KeySubmission[] {
  const done = new Set(sent.map(mod));
  return requiredKeys(l)
    .filter((k) => !done.has(k))
    .map((k) => keySubmission(l, items, k, inst))
    .filter((x): x is KeySubmission => !!x);
}

/** The automatic grade (owner decision §20.9): pass at the strictness → good, well above → great, else again. */
export function autoMark(score: number | null, strictness: Strictness): Mark {
  if (score === null) return 'again';
  const p = STRICT_PASS[strictness];
  return score >= Math.min(0.99, p + 0.08) ? 'great' : score >= p ? 'good' : 'again';
}

/** A submission's key and tempo from its metrics (phrase submissions only). */
export function submissionKey(metrics: Record<string, unknown> | undefined): { key: number; bpm: number } | null {
  if (!metrics || metrics.kind !== 'phrase' || typeof metrics.key !== 'number') return null;
  return { key: mod(metrics.key), bpm: Number(metrics.bpm) || 0 };
}

/** The teacher's per-student strip: best score per key among the student's submissions. */
export function keyStrip(subs: readonly { metrics?: Record<string, unknown>; score: number | null }[]): Map<number, { score: number; bpm: number }> {
  const out = new Map<number, { score: number; bpm: number }>();
  for (const s of subs) {
    const k = submissionKey(s.metrics);
    if (!k || s.score === null) continue;
    const have = out.get(k.key);
    if (!have || s.score > have.score) out.set(k.key, { score: s.score, bpm: k.bpm });
  }
  return out;
}

/** The assignment is passed when every required key has a submission at the strictness. */
export function assignmentPassed(required: readonly number[], strip: Map<number, { score: number }>, strictness: Strictness): boolean {
  return required.every((k) => (strip.get(mod(k))?.score ?? 0) >= STRICT_PASS[strictness]);
}

/** Notes of a phrase as events to play the teacher's playing (home key, at the target tempo). */
export function phraseEvents(a: Pick<PhraseAssignment, 'rh' | 'lh' | 'homeKey' | 'plan'>, bpm = a.plan.goalBpm): { midi: number; start: number; duration: number; velocity: number }[] {
  const t = 60 + mod(a.homeKey) - (mod(a.homeKey) > 5 ? 12 : 0);
  const S = 60 / Math.max(20, bpm);
  return [
    ...a.rh.map(([s, b, d]) => ({ midi: t + s, start: b * S, duration: Math.max(0.08, d * S * 0.95), velocity: 0.7 })),
    ...a.lh.map(([s, b, d]) => ({ midi: t - 12 + s, start: b * S, duration: Math.max(0.08, d * S * 0.95), velocity: 0.6 })),
  ].sort((x, y) => x.start - y.start);
}
export const phraseSeconds = (a: Pick<PhraseAssignment, 'rh' | 'lh' | 'plan'>, bpm = a.plan.goalBpm) => (Math.max(1, ...[...a.rh, ...a.lh].map((n) => n[1] + n[2])) * 60) / Math.max(20, bpm);
/** Bars of an assignment's phrase. */
export const assignBars = (a: PhraseAssignment): number => {
  const l = { notes: a.rh, lh: a.lh, chords: a.chords, meter: a.meter } as unknown as Lick;
  return phraseBeats(l) / a.meter;
};
export const assignTitle = (a: Pick<PhraseAssignment, 'name'>, lang: 'en' | 'he'): string => a.name || (lang === 'he' ? 'משפט מהמורה' : 'Phrase from the teacher');
export type { T2 };
