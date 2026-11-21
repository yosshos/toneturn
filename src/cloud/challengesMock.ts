// A stand-in for the community-challenge RPCs (dev builds only, localStorage tt.mockChallenges = 1, or "anon" for a
// visitor without an account). The e2e suite and local checks use it; production never loads this module
// (challenges.ts imports it only when challengesMockOn()). It runs the same rules as the migration: visibility,
// age gates (the device's year of birth: tt.mockChallenges.age), plausibility, duplicate devices, reports → hold.
// Seeded with a few phrases from other players (two of them friends) so the gallery and boards have rows.

import { encodePhraseRef, type PhraseAssignment } from '../engine/encore/assign';
import { compareRows, deviceConflict, HOLD_PHRASE_REPORTS, HOLD_ROW_REPORTS, implausible, newShareCode, pickFeatured, weekStart, type BoardRow } from '../engine/encore/community';
import type { LickInstrument, LickNote } from '../engine/licks';
import { INVITES_PER_DAY, INVITE_TTL_MS, REACTION_KINDS, SESSION_TTL_MS, SPAM_PER_HOUR, TOGETHER_MIN_MS, cleanNote, isReactionKind } from '../engine/encore/gifts';

type Row = Record<string, unknown>;
interface Phrase {
  id: string;
  code: string;
  owner: string;
  title: string;
  instrument: LickInstrument;
  level: number;
  style: string | null;
  context: string;
  home_key: number;
  ref: string;
  opb: number;
  needed: number;
  goal_bpm: number;
  grade: number | null;
  audio: string | null;
  visibility: 'friends' | 'class' | 'public';
  status: 'live' | 'held' | 'removed';
  created_at: string;
}
interface Result {
  phrase: string;
  user: string;
  keys: number;
  best_bpm: number;
  best_acc: number;
  source: string;
  digest: string | null;
  flagged: boolean;
  flag_reason?: 'machine' | 'device' | 'reports' | 'admin' | null;
  takes?: number;
  first_at: string;
  updated_at: string;
}
interface Db {
  v: 1;
  phrases: Phrase[];
  results: Result[];
  reactions: { phrase: string; user: string; kind: string; at: string }[];
  reports: { phrase: string; user: string | null; reporter: string; kind: string; status: 'open' | 'upheld' | 'dismissed'; at: string }[];
  featured: { week: string; phrase: string; by: 'app' | 'owner' }[];
  beats: { code: string; phrase: string; owner: string; bpm: number; keys: number }[];
  devices: { phrase: string; device: string; user: string }[];
  // gifts between friends (migration 20261205000000) — optional so an older stored mock db still loads
  gifts?: MockGift[];
  together?: MockTogether[];
  duetDays?: { friend: string; day: string }[];
}
interface MockGift {
  id: string;
  from: string;
  to: string;
  kind: 'fermata' | 'dedication';
  day: string;
  ref: string | null;
  title: string | null;
  note: string | null;
  created_at: string;
  claimed_at: string | null;
  done_at: string | null;
  bonus_to: boolean;
  bonus_from: boolean;
}
interface MockTogether {
  id: string;
  from: string;
  to: string;
  day: string;
  status: 'pending' | 'active' | 'done' | 'declined' | 'ended';
  created_at: string;
  accepted_at: string | null;
  from_ms: number;
  to_ms: number;
  from_active: string | null;
  to_active: string | null;
}
/** The mock friends' duet streaks before any together day (Noa and I keep one going). */
const DUET_BASE: Record<string, number> = { 'u-noa': 3 };
const KEY = 'tt.mockChallenges.db';
export const MOCK_ME = 'me';
const PLAYERS: Record<string, { name: string; friend: boolean; icon: string }> = {
  'u-owl': { name: 'BluesOwl', friend: false, icon: 'sax' },
  'u-noa': { name: 'Noa.K', friend: true, icon: 'piano' },
  'u-itai': { name: 'Itai', friend: true, icon: 'guitar' },
  'u-coda': { name: 'CodaFox42', friend: false, icon: 'piano' },
  'u-sam': { name: 'SamR', friend: false, icon: 'bass' },
};
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const DAY = 86_400_000;
const ref = (name: string, homeKey: number, rh: LickNote[], goal: number, chords: PhraseAssignment['chords'] = []): string =>
  encodePhraseRef({ v: 1, name, homeKey, minor: false, meter: 4, swing: 0.6, chords, rh, lh: [], instrument: 'piano', plan: { goalBpm: goal, startBpm: Math.round(goal * 0.6), keys: 'all', order: 'easiest', hands: 'R', band: false } });

function seed(): Db {
  const e = (semis: number[], step = 0.5): LickNote[] => semis.map((s, i) => [s, i * step, step] as LickNote);
  const ph = (id: string, owner: string, title: string, rh: LickNote[], goal: number, o: Partial<Phrase> = {}): Phrase => ({
    id,
    code: o.code ?? id.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, 'X').padEnd(8, 'Q').slice(0, 8),
    owner,
    title,
    instrument: 'piano',
    level: 3,
    style: 'bebop',
    context: 'ii–V–I',
    home_key: 5,
    ref: ref(title, o.home_key ?? 5, rh, goal),
    opb: 2,
    needed: 12,
    goal_bpm: goal,
    grade: 5,
    audio: null,
    visibility: 'public',
    status: 'live',
    created_at: iso(3 * DAY),
    ...o,
  });
  const phrases = [
    ph('p-owl', 'u-owl', 'Minor descent over ii–V', e([7, 5, 3, 2, 0, -1, 2, 5, 3, 0, -2, -5]), 168, { code: 'BLUESWL2', level: 4, style: 'blues', created_at: iso(5 * DAY) }),
    ph('p-noa', 'u-noa', 'Blues opener in B♭', e([0, 3, 5, 6, 7, 10, 7, 5, 3, 0]), 132, { code: 'NQAKBLS3', level: 2, style: 'blues', visibility: 'friends', home_key: 10 }),
    ph('p-itai', 'u-itai', 'Modal opening in D', e([0, 2, 5, 7, 9, 7, 5, 2, 4, 0]), 120, { code: 'TAMDDLD4', level: 3, style: 'modal', home_key: 2 }),
    ph('p-coda', 'u-coda', 'Enclosure chain on Cmaj7', e([2, -1, 0, 5, 3, 4, 9, 6, 7, 11, 13, 12]), 184, { code: 'CQDAFXC5', level: 5, created_at: iso(2 * DAY) }),
    ph('p-sam', 'u-sam', 'Walking line study', e([0, 4, 7, 9, 10, 9, 7, 4], 1), 140, { code: 'SAMRWLK6', level: 1, style: 'blues', created_at: iso(1 * DAY) }),
  ];
  const r = (phrase: string, user: string, keys: number, bpm: number, acc: number, src = 'midi', ago = DAY): Result => ({ phrase, user, keys, best_bpm: bpm, best_acc: acc, source: src, digest: null, flagged: false, first_at: iso(ago * 2), updated_at: iso(ago) });
  const results = [
    r('p-owl', 'u-owl', 12, 172, 0.98),
    r('p-owl', 'u-coda', 12, 168, 0.96),
    r('p-owl', 'u-noa', 6, 168, 0.94, 'mic'),
    r('p-owl', 'u-sam', 3, 160, 0.9),
    r('p-noa', 'u-noa', 12, 132, 0.97),
    r('p-noa', 'u-itai', 4, 132, 0.92, 'mic'),
    r('p-itai', 'u-itai', 9, 120, 0.95),
    r('p-coda', 'u-coda', 12, 184, 0.99),
    r('p-coda', 'u-owl', 12, 184, 0.97),
    r('p-sam', 'u-sam', 12, 140, 0.96),
  ];
  const reactions = [
    { phrase: 'p-owl', user: 'u-coda', kind: 'learned', at: iso(DAY) },
    { phrase: 'p-coda', user: 'u-owl', kind: 'learned', at: iso(DAY) },
    { phrase: 'p-coda', user: 'u-sam', kind: 'learned', at: iso(2 * DAY) },
  ];
  const db: Db = { v: 1, phrases, results, reactions, reports: [], featured: [], beats: [], devices: [], gifts: [], together: [], duetDays: [] };
  // tt.mockChallenges.gifts = 1: friends already sent me something (a fermata three days ago, a dedication, an invite)
  if (localStorage.getItem('tt.mockChallenges.gifts') === '1') {
    const dayOf = (ms: number) => localDayOf(new Date(Date.now() - ms));
    db.gifts!.push(
      { id: 'g-noa-fermata', from: 'u-noa', to: MOCK_ME, kind: 'fermata', day: dayOf(3 * DAY), ref: null, title: null, note: null, created_at: iso(3 * DAY), claimed_at: null, done_at: null, bonus_to: false, bonus_from: false },
      { id: 'g-itai-ded', from: 'u-itai', to: MOCK_ME, kind: 'dedication', day: dayOf(DAY), ref: phrases[2].ref, title: 'Modal opening in D', note: 'For the gig on Thursday', created_at: iso(DAY), claimed_at: null, done_at: null, bonus_to: false, bonus_from: false },
    );
    db.together!.push({ id: 't-itai', from: 'u-itai', to: MOCK_ME, day: dayOf(0), status: 'pending', created_at: iso(60_000), accepted_at: null, from_ms: 0, to_ms: 0, from_active: null, to_active: null });
  }
  return db;
}
const localDayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const load = (): Db => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Db | null;
    return o?.v === 1 ? o : seed();
  } catch {
    return seed();
  }
};
const save = (d: Db) => localStorage.setItem(KEY, JSON.stringify(d));
const uid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
/** Clips live in memory as object URLs (a reload forgets them; the flag `audio` stays). */
const CLIPS = new Map<string, string>();

const me = () => MOCK_ME;
const meName = () => localStorage.getItem('tt.mockChallenges.name') || 'You';
const age = (): number | null => {
  const y = Number(localStorage.getItem('tt.mockChallenges.age') ?? '');
  return Number.isFinite(y) && y > 0 ? y : null;
};
const nameOf = (u: string) => (u === me() ? meName() : (PLAYERS[u]?.name ?? 'Player'));
const isFriend = (u: string) => !!PLAYERS[u]?.friend;
const signedOut = () => localStorage.getItem('tt.mockChallenges') === 'anon';
const isAdmin = () => localStorage.getItem('tt.mockChallenges.admin') !== '0';

function visible(p: Phrase, viewer: string | null): boolean {
  if (p.status !== 'live' && p.owner !== viewer) return false;
  if (p.owner === viewer) return true;
  if (p.visibility === 'public') return viewer !== null && (age() === null || age()! >= 13) ? true : viewer === null;
  if (p.visibility === 'friends') return viewer !== null && isFriend(p.owner);
  return false; // class: the mock has no class for strangers
}
function reached(d: Db, p: Phrase) {
  return d.results.filter((r) => r.phrase === p.id && !r.flagged && r.keys >= p.needed).length;
}
function learnedWeek(d: Db, p: Phrase) {
  const since = Date.now() - 7 * DAY;
  return d.reactions.filter((x) => x.phrase === p.id && x.kind === 'learned' && Date.parse(x.at) >= since).length;
}
function out(d: Db, p: Phrase, viewer: string | null): Row {
  const week = weekStart();
  return {
    id: p.id,
    code: p.code,
    owner_id: p.owner,
    owner_name: nameOf(p.owner),
    owner_icon: PLAYERS[p.owner]?.icon ?? null,
    mine: p.owner === viewer,
    friend: isFriend(p.owner),
    title: p.title,
    instrument: p.instrument,
    level: p.level,
    style: p.style,
    context: p.context,
    home_key: p.home_key,
    ref: p.ref,
    opb: p.opb,
    needed: p.needed,
    goal_bpm: p.goal_bpm,
    grade: p.grade,
    has_audio: !!p.audio,
    visibility: p.visibility,
    status: p.status,
    created_at: p.created_at,
    reached: reached(d, p),
    learned_week: learnedWeek(d, p),
    featured: d.featured.some((f) => f.week === week && f.phrase === p.id),
    my_reactions: viewer === null ? [] : REACTION_KINDS.filter((k) => d.reactions.some((x) => x.phrase === p.id && x.user === viewer && x.kind === k)),
    // per-kind counts: the sharer only (like the migration)
    ...(p.owner === viewer ? { reactions: Object.fromEntries(REACTION_KINDS.map((k) => [k, d.reactions.filter((x) => x.phrase === p.id && x.kind === k).length])) } : {}),
  };
}
function featuredOf(d: Db): { p: Phrase; by: 'app' | 'owner' } | null {
  const week = weekStart();
  let f = d.featured.find((x) => x.week === week);
  if (!f) {
    const last = [...d.featured].sort((a, b) => b.week.localeCompare(a.week))[0]?.phrase ?? null;
    const pick = pickFeatured(
      d.phrases.map((p) => ({ ...p, learnedWeek: learnedWeek(d, p), reached: reached(d, p), createdAt: p.created_at })),
      last,
    );
    if (!pick) return null;
    f = { week, phrase: pick.id, by: 'app' };
    d.featured.push(f);
    save(d);
  }
  const p = d.phrases.find((x) => x.id === f!.phrase && x.status === 'live');
  return p ? { p, by: f.by } : null;
}
const need = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};

export async function mockChallengeRpc(fn: string, a: Record<string, unknown>): Promise<unknown> {
  const d = load();
  const viewer = signedOut() ? null : me();
  if (fn !== 'toneturn_phrase_public' && fn !== 'toneturn_phrase_audio_path') need(viewer, 'not signed in');
  switch (fn) {
    case 'toneturn_phrase_share': {
      const vis = String(a.p_visibility) as Phrase['visibility'];
      need(['friends', 'class', 'public'].includes(vis), 'bad visibility');
      const y = age();
      const years = y ? new Date().getFullYear() - y - 1 : null;
      need(vis !== 'public' || (years !== null && years >= 13), 'community from 13');
      need(!a.p_audio || (years !== null && years >= (vis === 'public' ? 16 : 13)), 'audio: age');
      need(vis !== 'class' || a.p_class, 'class: which');
      need(String(a.p_ref ?? '').startsWith('phrase1:') && String(a.p_ref).length <= 6000, 'bad phrase');
      need(String(a.p_title ?? '').trim().length >= 1 && String(a.p_title).length <= 60, 'bad title');
      need(d.phrases.filter((p) => p.owner === me() && Date.parse(p.created_at) > Date.now() - DAY).length < 10, 'too many shares today');
      let code = newShareCode();
      while (d.phrases.some((p) => p.code === code)) code = newShareCode();
      const p: Phrase = {
        id: uid(),
        code,
        owner: me(),
        title: String(a.p_title).trim(),
        instrument: a.p_instrument as LickInstrument,
        level: Math.max(1, Math.min(5, Number(a.p_level) || 1)),
        style: (a.p_style as string) ?? null,
        context: String(a.p_context ?? '').slice(0, 40),
        home_key: Number(a.p_home_key) || 0,
        ref: String(a.p_ref),
        opb: Number(a.p_opb) || 2,
        needed: Number(a.p_needed) || 12,
        goal_bpm: Number(a.p_goal_bpm) || 100,
        grade: a.p_grade === null ? null : Number(a.p_grade),
        audio: null,
        visibility: vis,
        status: 'live',
        created_at: new Date().toISOString(),
      };
      d.phrases.push(p);
      save(d);
      return { id: p.id, code: p.code };
    }
    case 'toneturn_phrase_set_audio': {
      const p = d.phrases.find((x) => x.id === a.p_phrase && x.owner === me());
      need(p, 'not yours');
      const blob = a._blob as Blob | undefined;
      need(!blob || blob.size <= 400_000, 'clip too big');
      p!.audio = String(a.p_path);
      if (blob) CLIPS.set(p!.id, URL.createObjectURL(blob));
      save(d);
      return null;
    }
    case 'toneturn_phrase_audio_path': {
      const p = d.phrases.find((x) => x.id === a.p_phrase);
      if (!p?.audio || !visible(p, viewer)) return null;
      return CLIPS.get(p.id) ?? null;
    }
    case 'toneturn_phrase_get': {
      const p = d.phrases.find((x) => x.code === a.p_code);
      if (!p || p.status === 'removed' || (p.status === 'held' && p.owner !== viewer)) return null;
      if (!visible(p, viewer)) return p.visibility === 'public' ? null : { locked: p.visibility, owner_name: nameOf(p.owner) };
      return out(d, p, viewer);
    }
    case 'toneturn_phrase_public': {
      const p = d.phrases.find((x) => x.code === a.p_code && x.visibility === 'public' && x.status === 'live');
      return p ? { ...out(d, p, null), owner_id: null, has_audio: !!p.audio } : null;
    }
    case 'toneturn_phrase_board': {
      const p = d.phrases.find((x) => x.id === a.p_phrase);
      need(p && visible(p, viewer), 'not visible');
      const scope = a.p_scope === 'all' ? 'all' : 'friends';
      const week = weekStart();
      const featured = d.featured.some((f) => f.week === week && f.phrase === p!.id);
      return d.results
        .filter((r) => r.phrase === p!.id && (scope === 'all' || r.user === viewer || r.user === p!.owner || isFriend(r.user)))
        .filter((r) => !r.flagged || r.user === viewer)
        .filter((r) => !featured || r.user === p!.owner || Date.parse(r.updated_at) >= Date.parse(week)) // the featured board resets weekly
        .map((r) => ({ user_id: r.user, name: nameOf(r.user), keys: r.keys, best_bpm: r.best_bpm, best_acc: r.best_acc, source: r.source, updated_at: r.updated_at, me: r.user === viewer, creator: r.user === p!.owner, flagged: r.flagged, icon: PLAYERS[r.user]?.icon ?? null }))
        .sort((x, y) => compareRows(x as unknown as BoardRow, y as unknown as BoardRow));
    }
    case 'toneturn_phrase_result': {
      const p = d.phrases.find((x) => x.id === a.p_phrase);
      need(p && visible(p, viewer), 'not visible');
      const prev = d.results.find((r) => r.phrase === p!.id && r.user === me());
      const res = { keys: Number(a.p_keys), bestBpm: Number(a.p_best_bpm), acc: Number(a.p_acc), takes: Number(a.p_takes), days: Number(a.p_days) };
      const bad = implausible(res, { instrument: p!.instrument, opb: p!.opb, needed: p!.needed, goalBpm: p!.goal_bpm }, prev ? { keys: prev.keys, at: Date.parse(prev.updated_at), takes: prev.takes } : null);
      if (bad.length) return `implausible:${bad.join(',')}`;
      const device = String(a.p_device ?? '');
      const dup = deviceConflict(d.devices.filter((x) => x.phrase === p!.id), device, me());
      if (device && !d.devices.some((x) => x.phrase === p!.id && x.device === device && x.user === me())) d.devices.push({ phrase: p!.id, device, user: me() });
      // like the migration: a sequencer-like take is judged on every post; device / reports / admin flags stay
      const why = a.p_machine ? 'machine' : dup ? 'device' : prev?.flagged && prev.flag_reason !== 'machine' ? (prev.flag_reason ?? 'admin') : null;
      const now = new Date().toISOString();
      const row: Result = { phrase: p!.id, user: me(), keys: res.keys, best_bpm: res.bestBpm, best_acc: res.acc, source: String(a.p_source), digest: (a.p_digest as string) ?? null, flagged: !!why, flag_reason: why, takes: res.takes, first_at: prev?.first_at ?? now, updated_at: now };
      d.results = [...d.results.filter((r) => r !== prev), row];
      if (!row.flagged && res.keys >= p!.needed && p!.owner !== me() && !d.reactions.some((x) => x.phrase === p!.id && x.user === me() && x.kind === 'learned')) d.reactions.push({ phrase: p!.id, user: me(), kind: 'learned', at: now });
      save(d);
      return row.flagged ? 'flagged' : 'ok';
    }
    case 'toneturn_phrase_react': {
      const p = d.phrases.find((x) => x.id === a.p_phrase);
      need(isReactionKind(a.p_kind), 'bad kind');
      need(p && visible(p, viewer), 'not visible');
      need(p!.owner !== me(), 'not your own');
      const kind = String(a.p_kind);
      d.reactions = d.reactions.filter((x) => !(x.phrase === p!.id && x.user === me() && x.kind === kind));
      if (a.p_on) {
        need(d.reactions.filter((x) => x.user === me() && x.kind !== 'learned' && Date.parse(x.at) > Date.now() - 3_600_000).length < SPAM_PER_HOUR, 'slow down');
        d.reactions.push({ phrase: p!.id, user: me(), kind, at: new Date().toISOString() });
      }
      save(d);
      return null;
    }
    case 'toneturn_gifts_view':
    case 'toneturn_gift_send':
    case 'toneturn_gift_claim':
    case 'toneturn_dedication_done':
    case 'toneturn_dedication_bonus':
    case 'toneturn_together_invite':
    case 'toneturn_together_answer':
    case 'toneturn_together_beat':
      return giftRpc(d, fn, a);
    case 'toneturn_phrase_report': {
      const p = d.phrases.find((x) => x.id === a.p_phrase);
      need(p, 'no phrase');
      const user = (a.p_user as string) ?? null;
      const kind = String(a.p_kind);
      need(['copied', 'implausible', 'other'].includes(kind), 'bad kind');
      if (d.reports.some((r) => r.phrase === p!.id && r.user === user && r.reporter === me() && r.status === 'open')) return 'already';
      d.reports.push({ phrase: p!.id, user, reporter: me(), kind, status: 'open', at: new Date().toISOString() });
      let res = 'ok';
      const distinct = (k: string, u: string | null) => new Set(d.reports.filter((r) => r.phrase === p!.id && r.user === u && r.kind === k && r.status === 'open').map((r) => r.reporter)).size;
      // the mock counts one seeded earlier reporter on BluesOwl's phrase, so a single report there shows the hold
      const seeded = p!.id === 'p-owl' && user === null && kind === 'copied' ? 1 : 0;
      if (user === null && distinct('copied', null) + seeded >= HOLD_PHRASE_REPORTS) {
        p!.status = 'held';
        res = 'held';
      }
      if (user !== null && distinct('implausible', user) >= HOLD_ROW_REPORTS) {
        const row = d.results.find((r) => r.phrase === p!.id && r.user === user);
        if (row) (row.flagged = true), (row.flag_reason = 'reports');
        res = 'row-hidden';
      }
      save(d);
      return res;
    }
    case 'toneturn_phrase_gallery': {
      const f = (p: Phrase) =>
        (!a.p_instrument || p.instrument === a.p_instrument) && (a.p_level_min == null || p.level >= Number(a.p_level_min)) && (a.p_level_max == null || p.level <= Number(a.p_level_max)) && (!a.p_style || p.style === a.p_style);
      const feat = featuredOf(d);
      const live = d.phrases.filter((p) => p.status === 'live' && p.owner !== me() && visible(p, viewer));
      const friends = live.filter((p) => isFriend(p.owner) && f(p)).sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 10);
      const young = (() => {
        const y = age();
        return y !== null && new Date().getFullYear() - y - 1 < 13;
      })();
      const rising = young
        ? []
        : live
            .filter((p) => p.visibility === 'public' && f(p) && p.id !== feat?.p.id)
            .map((p) => ({ p, n: learnedWeek(d, p) }))
            .filter((x) => x.n > 0)
            .sort((x, y) => y.n - x.n)
            .slice(0, 10)
            .map((x) => x.p);
      return { featured: feat && !young && visible(feat.p, viewer) ? out(d, feat.p, viewer) : null, featured_by: feat?.by ?? null, friends: friends.map((p) => out(d, p, viewer)), rising: rising.map((p) => out(d, p, viewer)) };
    }
    case 'toneturn_phrase_mine':
      return d.phrases.filter((p) => p.owner === me() && p.status !== 'removed').map((p) => out(d, p, viewer));
    case 'toneturn_phrase_delete': {
      d.phrases = d.phrases.filter((p) => !(p.id === a.p_phrase && p.owner === me()));
      d.results = d.results.filter((r) => d.phrases.some((p) => p.id === r.phrase));
      save(d);
      return null;
    }
    case 'toneturn_phrase_beat_create': {
      const row = d.results.find((r) => r.phrase === a.p_phrase && r.user === me() && !r.flagged);
      if (!row) return null;
      const code = newShareCode();
      d.beats.push({ code, phrase: String(a.p_phrase), owner: me(), bpm: row.best_bpm, keys: row.keys });
      save(d);
      return code;
    }
    case 'toneturn_phrase_beat_open': {
      const b = d.beats.find((x) => x.code === a.p_code);
      return b ? { from: nameOf(b.owner), bpm: b.bpm, keys: b.keys } : null;
    }
    case 'toneturn_phrase_reviews': {
      need(isAdmin(), 'admins only');
      const open = d.reports.filter((r) => r.status === 'open');
      const keys = [...new Set(open.map((r) => `${r.phrase}|${r.user ?? ''}`))];
      return keys.map((k) => {
        const [pid, u] = k.split('|');
        const p = d.phrases.find((x) => x.id === pid);
        const rs = open.filter((r) => r.phrase === pid && (r.user ?? '') === u);
        const kinds = [...new Set(rs.map((r) => r.kind))].map((kind) => ({ kind, n: rs.filter((r) => r.kind === kind).length }));
        const row = u ? d.results.find((r) => r.phrase === pid && r.user === u) : null;
        return { kind: u ? 'row' : 'phrase', phrase_id: pid, code: p?.code ?? '', title: p?.title ?? '', owner_name: p ? nameOf(p.owner) : '', user_id: u || null, user_name: u ? nameOf(u) : null, reports: kinds, status: u ? (row?.flagged ? 'hidden' : 'live') : (p?.status ?? 'removed'), facts: row ? { keys: row.keys, best_bpm: row.best_bpm, best_acc: row.best_acc, source: row.source, digest: row.digest } : null };
      });
    }
    case 'toneturn_phrase_review': {
      need(isAdmin(), 'admins only');
      const p = d.phrases.find((x) => x.id === a.p_phrase);
      const user = (a.p_user as string) ?? null;
      const keep = a.p_decision === 'restore';
      if (a.p_kind === 'phrase' && p) p.status = keep ? 'live' : 'removed';
      if (a.p_kind === 'row') {
        const row = d.results.find((r) => r.phrase === a.p_phrase && r.user === user);
        if (row) (row.flagged = !keep), (row.flag_reason = keep ? null : 'admin');
      }
      for (const r of d.reports) if (r.phrase === a.p_phrase && r.user === user && r.status === 'open') r.status = keep ? 'dismissed' : 'upheld';
      save(d);
      return null;
    }
    case 'toneturn_phrase_feature': {
      need(isAdmin(), 'admins only');
      const p = d.phrases.find((x) => x.code === a.p_code && x.visibility === 'public' && x.status === 'live');
      need(p, 'no such public phrase');
      const week = weekStart();
      d.featured = [...d.featured.filter((f) => f.week !== week), { week, phrase: p!.id, by: 'owner' }];
      save(d);
      return null;
    }
    default:
      throw new Error(`mock: ${fn} not offered`);
  }
}
// ───────────────────────────── gifts between friends (as migration 20261205000000) ─────────────────────────────

function giftRpc(d: Db, fn: string, a: Record<string, unknown>): unknown {
  const gifts = (d.gifts ??= []);
  const together = (d.together ??= []);
  const duetDays = (d.duetDays ??= []);
  const now = Date.now();
  const today = localDayOf(new Date());
  const friends = Object.entries(PLAYERS)
    .filter(([, v]) => v.friend)
    .map(([id]) => id);
  const mayGift = (to: unknown) => typeof to === 'string' && to !== me() && friends.includes(to);
  const lastHour = (at: string) => Date.parse(at) > now - 3_600_000;
  const spam = () => gifts.filter((g) => g.from === me() && lastHour(g.created_at)).length + together.filter((t) => t.from === me() && lastHour(t.created_at)).length >= SPAM_PER_HOUR;
  const okDay = (v: unknown) => typeof v === 'string' && Math.abs(Date.parse(`${v}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) <= DAY;
  for (const t of together) {
    if (t.status === 'pending' && now - Date.parse(t.created_at) > INVITE_TTL_MS) t.status = 'ended';
    if (t.status === 'active' && t.accepted_at && now - Date.parse(t.accepted_at) > SESSION_TTL_MS) t.status = 'ended';
    // the mock friends answer my invite at once, as if they had been practicing a while (five minutes in already)
    if (t.status === 'pending' && t.from === me() && friends.includes(t.to)) {
      t.status = 'active';
      t.accepted_at = new Date(now - 6 * 60_000).toISOString();
      t.to_ms = TOGETHER_MIN_MS;
      t.to_active = new Date(now).toISOString();
    }
  }
  const sessionOut = (t: MockTogether) => {
    const mine = t.from === me();
    const other = mine ? t.to : t.from;
    return { id: t.id, status: t.status, mine, friend: other, friend_name: nameOf(other), created_at: t.created_at, accepted_at: t.accepted_at, me_ms: mine ? t.from_ms : t.to_ms, them_ms: mine ? t.to_ms : t.from_ms, me_active: mine ? t.from_active : t.to_active, them_active: mine ? t.to_active : t.from_active };
  };
  const duet = (f: string) => (DUET_BASE[f] ?? 0) + new Set(duetDays.filter((x) => x.friend === f).map((x) => x.day)).size;
  switch (fn) {
    case 'toneturn_gifts_view': {
      const day = String(a.p_day ?? today);
      save(d);
      return {
        today: { gifts: gifts.filter((g) => g.from === me() && g.day === day).length, invites: together.filter((t) => t.from === me() && t.day === day).length },
        friends: friends.map((id) => ({ id, name: nameOf(id), icon: PLAYERS[id]?.icon ?? null, color: null, young: false, duet: duet(id) })),
        received: gifts
          .filter((g) => g.to === me())
          .sort((x, y) => y.created_at.localeCompare(x.created_at))
          .map((g) => ({ id: g.id, kind: g.kind, from_id: g.from, from_name: nameOf(g.from), title: g.title, ref: g.ref, note: g.note, created_at: g.created_at, claimed: !!g.claimed_at, done: !!g.done_at, bonus: g.bonus_to })),
        sent: gifts
          .filter((g) => g.from === me())
          .sort((x, y) => y.created_at.localeCompare(x.created_at))
          .map((g) => ({ id: g.id, kind: g.kind, to_id: g.to, to_name: nameOf(g.to), title: g.title, created_at: g.created_at, done: !!g.done_at, bonus: g.bonus_from })),
        sessions: together.filter((t) => (t.from === me() || t.to === me()) && now - Date.parse(t.created_at) < SESSION_TTL_MS).map(sessionOut),
      };
    }
    case 'toneturn_gift_send': {
      const kind = String(a.p_kind);
      need(kind === 'fermata' || kind === 'dedication', 'bad kind');
      need(mayGift(a.p_friend), 'not friends');
      need(okDay(a.p_day), 'bad day');
      need(Number(a.p_measured_ms ?? 0) >= 300_000, 'practice first');
      need(!gifts.some((g) => g.from === me() && g.day === a.p_day), 'one gift a day');
      need(!spam(), 'slow down');
      if (kind === 'dedication') need(String(a.p_ref ?? '').startsWith('phrase1:') && String(a.p_ref).length <= 6000, 'bad phrase');
      const ded = kind === 'dedication';
      const g: MockGift = { id: uid(), from: me(), to: String(a.p_friend), kind: kind as MockGift['kind'], day: String(a.p_day), ref: ded ? String(a.p_ref) : null, title: ded ? String(a.p_title ?? 'Phrase').slice(0, 60) : null, note: ded ? cleanNote(a.p_note as string | null) : null, created_at: new Date().toISOString(), claimed_at: null, done_at: null, bonus_to: false, bonus_from: false };
      gifts.push(g);
      save(d);
      return g.id;
    }
    case 'toneturn_gift_claim': {
      const g = gifts.find((x) => x.id === a.p_gift && x.to === me());
      if (g && !g.claimed_at) g.claimed_at = new Date().toISOString();
      save(d);
      return null;
    }
    case 'toneturn_dedication_done': {
      const g = gifts.find((x) => x.id === a.p_gift && x.to === me() && x.kind === 'dedication');
      need(g, 'no dedication');
      if (!g!.done_at) g!.done_at = new Date().toISOString();
      save(d);
      return null;
    }
    case 'toneturn_dedication_bonus': {
      const g = gifts.find((x) => x.id === a.p_gift && x.kind === 'dedication' && !!x.done_at);
      if (!g) return false;
      let ok = false;
      if (g.to === me() && !g.bonus_to) ok = g.bonus_to = true;
      else if (g.from === me() && !g.bonus_from) ok = g.bonus_from = true;
      save(d);
      return ok;
    }
    case 'toneturn_together_invite': {
      need(mayGift(a.p_friend), 'not friends');
      need(okDay(a.p_day), 'bad day');
      need(together.filter((t) => t.from === me() && t.day === a.p_day).length < INVITES_PER_DAY, 'three invites a day');
      need(!spam(), 'slow down');
      const pair = [me(), String(a.p_friend)];
      for (const t of together) if ((t.status === 'pending' || t.status === 'active') && pair.includes(t.from) && pair.includes(t.to)) t.status = 'ended';
      const t: MockTogether = { id: uid(), from: me(), to: String(a.p_friend), day: String(a.p_day), status: 'pending', created_at: new Date().toISOString(), accepted_at: null, from_ms: 0, to_ms: 0, from_active: null, to_active: null };
      together.push(t);
      save(d);
      return t.id;
    }
    case 'toneturn_together_answer': {
      const t = together.find((x) => x.id === a.p_id && x.to === me());
      need(t && t.status === 'pending' && now - Date.parse(t.created_at) <= INVITE_TTL_MS, 'no invite');
      t!.status = a.p_accept ? 'active' : 'declined';
      if (a.p_accept) {
        t!.accepted_at = new Date(now - 6 * 60_000).toISOString();
        // the mock friend practices along: five minutes in already, active now
        t!.from_ms = TOGETHER_MIN_MS;
        t!.from_active = new Date(now).toISOString();
      }
      save(d);
      return null;
    }
    case 'toneturn_together_beat': {
      const t = together.find((x) => x.id === a.p_id && (x.from === me() || x.to === me()));
      need(t, 'no session');
      if (t!.status === 'active') {
        const cap = Math.max(0, now - Date.parse(t!.accepted_at!));
        const ms = Math.min(Math.max(0, Number(a.p_ms) || 0), cap);
        const stamp = new Date(now).toISOString();
        if (t!.from === me()) {
          if (ms > t!.from_ms) (t!.from_active = stamp), (t!.from_ms = ms);
        } else if (ms > t!.to_ms) (t!.to_active = stamp), (t!.to_ms = ms);
        if (t!.from_ms >= TOGETHER_MIN_MS && t!.to_ms >= TOGETHER_MIN_MS) {
          t!.status = 'done';
          const other = t!.from === me() ? t!.to : t!.from;
          if (!duetDays.some((x) => x.friend === other && x.day === today)) duetDays.push({ friend: other, day: today });
        }
      }
      save(d);
      return sessionOut(t!);
    }
  }
  throw new Error(`mock: ${fn} not offered`);
}

/** Tests: start over. */
export const resetMockChallenges = () => {
  localStorage.removeItem(KEY);
  CLIPS.clear();
};
