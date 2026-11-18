// Encore v3 — community challenges (SPEC-PHRASE-STUDIO §12): the share payload and its limits, the age gates (§20.7),
// board ranking, the anti-cheat rules (MIDI timing sanity, impossible speeds, the ladder, duplicate devices), the
// known-melody check, links, the share card, the result from measured takes only, and the dev mock server end to end.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Lick, LickNote } from '../src/engine/licks';
import type { ItemState } from '../src/engine/drills/types';
import {
  challengeResult,
  compareRows,
  deviceConflict,
  gateReason,
  implausible,
  isShareCode,
  lickFromShare,
  machineLike,
  matchesGallery,
  newShareCode,
  parseChallengeHash,
  phraseLink,
  pickFeatured,
  publicFromHash,
  rankBoard,
  resultChanged,
  shareGate,
  shareLevel,
  shareNotes,
  sharePayload,
  sharedPhraseId,
  takeDigest,
  weekStart,
  type BoardRow,
  type TakeTrace,
} from '../src/engine/encore/community';
import { knownMelody, matchLine, trivial, windows } from '../src/engine/encore/knownMelody';
import { SONGBOOK, songNotes } from '../src/content/songbook';
import { phraseItemId } from '../src/engine/encore/phrase';

// a tiny localStorage for the mock server (node has none)
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
} as Storage;

const NOW = new Date('2026-11-16T12:00:00Z');
const phrase = (o: Partial<Lick> = {}, notes?: LickNote[]): Lick => ({
  id: 'enc-x',
  v: 3,
  ctx: 'major-251',
  level: 3,
  name: { en: 'ii–V in F', he: 'ii–V ב־F' },
  own: true,
  chords: [
    [2, 'm7', 4],
    [7, '7', 4],
  ],
  notes: notes ?? [0, 4, 7, 11, 14, 11, 7, 6, 5, 2, 10, 9, 7, 3, 2, 0].map((s, i) => [s, i * 0.5, 0.5] as LickNote),
  meter: 4,
  swing: 0.6,
  homeKey: 5,
  instrument: 'piano',
  playedBpm: 120,
  plan: { startBpm: 80, goalBpm: 160, keys: 'all', order: 'easiest', hands: 'R', band: false },
  ...o,
});
const adult = shareGate(1990, NOW);
const meta = { title: 'ii–V in F — two enclosures', style: 'bebop' as const, level: 0, visibility: 'friends' as const, attested: true, audio: false };

describe('age gates (§20.7: community from 13, public audio from 16)', () => {
  it('an adult may do everything', () => {
    expect(adult).toMatchObject({ known: true, public: true, audio: true, publicAudio: true, community: true });
  });
  it('14: everyone without audio, friends with audio', () => {
    const g = shareGate(2011, NOW); // 14 at the end of 2026
    expect(g.public).toBe(true);
    expect(g.publicAudio).toBe(false);
    expect(gateReason(g, 'public', true)).toBe('audio-16');
    expect(gateReason(g, 'friends', true)).toBeNull();
    expect(gateReason(g, 'public', false)).toBeNull();
  });
  it('under 13: friends and class only, no audio, no community', () => {
    const g = shareGate(2015, NOW);
    expect(g).toMatchObject({ public: false, audio: false, community: false, friends: true, class: true });
    expect(gateReason(g, 'public', false)).toBe('under-13');
    expect(gateReason(g, 'friends', true)).toBe('audio-13');
  });
  it('unknown age: may browse, must set the year before sharing with everyone', () => {
    const g = shareGate(null, NOW);
    expect(g.community).toBe(true);
    expect(gateReason(g, 'public', false)).toBe('age-unknown');
    expect(gateReason(g, 'friends', false)).toBeNull();
  });
});

describe('the share payload (§11.2)', () => {
  it('carries the phrase as the assignment code with the sharer’s plan', () => {
    const l = phrase();
    const { payload, problems } = sharePayload(l, meta, { gate: adult, lang: 'en', context: 'ii–V–I · F' });
    expect(problems).toEqual([]);
    expect(payload.ref.startsWith('phrase1:')).toBe(true);
    expect(payload.goalBpm).toBe(160);
    expect(payload.needed).toBe(12);
    expect(payload.visibility).toBe('friends');
    expect(payload.title).toBe('ii–V in F — two enclosures');
    const back = shareNotes(payload.ref)!;
    expect(back.notes).toHaveLength(16);
    expect(back.a.plan.goalBpm).toBe(160);
  });
  it('needs the attestation, a title, ≤ 8 bars, a class for class shares', () => {
    const l = phrase();
    expect(sharePayload(l, { ...meta, attested: false }, { gate: adult }).problems).toContain('attest');
    expect(sharePayload(l, { ...meta, title: '  ' }, { gate: adult }).problems).toContain('title');
    expect(sharePayload(l, { ...meta, visibility: 'class' }, { gate: adult }).problems).toContain('class');
    const long = phrase({}, Array.from({ length: 80 }, (_, i) => [i % 12, i * 0.5, 0.5] as LickNote)); // 10 bars
    expect(sharePayload(long, meta, { gate: adult }).problems).toContain('bars');
  });
  it('a known melody may not go to everyone; friends may get it as a quote', () => {
    const l = phrase();
    expect(sharePayload(l, { ...meta, visibility: 'public' }, { gate: adult, known: true }).problems).toContain('known-melody');
    expect(sharePayload(l, meta, { gate: adult, known: true }).problems).not.toContain('known-melody');
  });
  it('the level is automatic, editable one step', () => {
    const l = phrase();
    const auto = shareLevel(l);
    expect(auto).toBeGreaterThanOrEqual(1);
    expect(auto).toBeLessThanOrEqual(5);
    expect(sharePayload(l, { ...meta, level: 5 }, { gate: adult }).payload.level).toBeLessThanOrEqual(Math.min(5, auto + 1));
    expect(sharePayload(l, { ...meta, level: 1 }, { gate: adult }).payload.level).toBeGreaterThanOrEqual(Math.max(1, auto - 1));
    // slow and narrow is easier than fast, wide and two-handed
    const easy = phrase({ plan: { startBpm: 40, goalBpm: 60, keys: 'all', order: 'easiest', hands: 'R', band: false } }, [0, 2, 4, 2].map((s, i) => [s, i, 1] as LickNote));
    const hard = phrase({ lh: [[0, 0, 4]], plan: { startBpm: 120, goalBpm: 240, keys: 'all', order: 'easiest', hands: 'RL', band: false } }, Array.from({ length: 32 }, (_, i) => [((i * 7) % 25) - 3, i * 0.25, 0.25] as LickNote));
    expect(shareLevel(easy)).toBeLessThan(shareLevel(hard));
  });
  it('audio is dropped when the age does not allow it', () => {
    const teen = shareGate(2011, NOW);
    const r = sharePayload(phrase(), { ...meta, visibility: 'public', audio: true }, { gate: teen });
    expect(r.problems).toContain('audio-16');
    expect(r.payload.audio).toBe(false);
  });
});

describe('links and codes', () => {
  it('8 opaque characters, public and in-app routes', () => {
    const c = newShareCode(() => 0.5);
    expect(isShareCode(c)).toBe(true);
    expect(isShareCode('ABC0EFGH')).toBe(false);
    expect(phraseLink('https://7sense.netlify.app', '/', 'K7Q2MX9A')).toBe('https://7sense.netlify.app/#/p/K7Q2MX9A');
    expect(publicFromHash('#/p/K7Q2MX9A')).toEqual({ code: 'K7Q2MX9A', beat: null });
    expect(publicFromHash('#/p/k7q2mx9a/BEATBEAT')).toEqual({ code: 'K7Q2MX9A', beat: 'BEATBEAT' });
    expect(publicFromHash('#/p/short')).toBeNull();
    expect(parseChallengeHash('#/challenges')).toEqual({ view: 'gallery' });
    expect(parseChallengeHash('#/challenges/p/K7Q2MX9A/BEATBEAT')).toEqual({ view: 'page', code: 'K7Q2MX9A', beat: 'BEATBEAT' });
    expect(parseChallengeHash('#/challenges/share/enc-abc12')).toEqual({ view: 'share', id: 'enc-abc12' });
    expect(parseChallengeHash('#/challenges/review')).toEqual({ view: 'review' });
  });
  it('taking a challenge makes a locked Encore phrase with a stable id', () => {
    const { payload } = sharePayload(phrase(), meta, { gate: adult });
    const l = lickFromShare(payload.ref, 'K7Q2MX9A', 'CodaFox42')!;
    expect(l.id).toBe(sharedPhraseId('K7Q2MX9A'));
    expect(l.source).toEqual({ kind: 'shared', code: 'K7Q2MX9A', by: 'CodaFox42' });
    expect(l.plan?.goalBpm).toBe(160);
    expect(l.plan?.locked).toEqual(['goalBpm', 'keys', 'hands']);
    expect(lickFromShare('nonsense', 'K7Q2MX9A', 'x')).toBeNull();
  });
});

describe('the board (§11.3)', () => {
  const row = (userId: string, keys: number, bestBpm: number, acc: number, o: Partial<BoardRow> = {}): BoardRow => ({ userId, name: userId, keys, bestBpm, acc, source: 'midi', at: '2026-11-10T10:00:00Z', ...o });
  it('keys at target first, then tempo, then accuracy, then who was first', () => {
    const rows = [row('a', 6, 200, 0.99), row('b', 12, 160, 0.9), row('c', 12, 180, 0.8), row('d', 12, 180, 0.95), row('e', 12, 180, 0.95, { at: '2026-11-09T10:00:00Z' })];
    expect([...rows].sort(compareRows).map((r) => r.userId)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });
  it('the creator is pinned; flagged rows are out except my own; my far row is added', () => {
    const rows = [row('owner', 12, 200, 0.99, { creator: true }), row('x', 3, 150, 0.9, { flagged: true }), ...Array.from({ length: 40 }, (_, i) => row(`p${i}`, 12, 300 - i, 0.95)), row('me', 1, 120, 0.8, { me: true })];
    const b = rankBoard(rows, 30);
    expect(b.creator?.userId).toBe('owner');
    expect(b.ranked).toHaveLength(30);
    expect(b.ranked[0]).toMatchObject({ userId: 'p0', rank: 1 });
    expect(b.ranked.some((r) => r.userId === 'x')).toBe(false);
    expect(b.mine).toMatchObject({ userId: 'me', rank: 41 });
    const mineFlagged = rankBoard([row('me', 2, 150, 0.9, { me: true, flagged: true })]);
    expect(mineFlagged.ranked).toHaveLength(0);
    expect(mineFlagged.mine?.flagged).toBe(true);
  });
});

describe('anti-cheat (§11.5)', () => {
  const facts = { instrument: 'piano' as const, opb: 2, needed: 12, goalBpm: 160 };
  it('MIDI timing sanity: grid-perfect onsets with identical velocities look like a sequencer', () => {
    const P = 60000 / 120;
    const seq: TakeTrace = { source: 'midi', bpm: 120, notes: Array.from({ length: 16 }, (_, i) => ({ on: 1000 + (i * P) / 2, vel: 100 })) };
    expect(machineLike(seq)).toBe(true);
    const human: TakeTrace = { ...seq, notes: seq.notes.map((n, i) => ({ on: n.on + ((i * 7) % 11) - 5, vel: 80 + (i % 5) })) };
    expect(machineLike(human)).toBe(false);
    // tight timing alone is not enough (good players exist); identical velocities alone are not either
    expect(machineLike({ ...seq, notes: seq.notes.map((n, i) => ({ ...n, vel: 90 + (i % 3) })) })).toBe(false);
    expect(machineLike({ ...seq, notes: seq.notes.map((n, i) => ({ ...n, on: n.on + ((i * 13) % 17) - 8 })) })).toBe(false);
    // mic takes are never judged this way
    expect(machineLike({ ...seq, source: 'mic' })).toBe(false);
  });
  it('impossible speeds and ladder jumps', () => {
    const ok = { keys: 4, bestBpm: 160, acc: 0.95, takes: 20, days: 3 };
    expect(implausible(ok, facts)).toEqual([]);
    // 2 onsets a beat at ♩600 = 20 notes/s on piano
    expect(implausible({ ...ok, bestBpm: 400 }, { ...facts, opb: 4 })).toContain('note-rate');
    expect(implausible({ ...ok, takes: 5 }, facts)).toContain('keys-takes');
    expect(implausible({ ...ok, days: 1 }, facts)).toContain('keys-days');
    expect(implausible({ ...ok, bestBpm: 140 }, facts)).toContain('keys-tempo');
    expect(implausible({ ...ok, keys: 13, takes: 60 }, facts)).toContain('keys-range');
    expect(implausible({ ...ok, acc: 1.4 }, facts)).toContain('acc-range');
    // from 0 to 12 keys a minute after the last post
    const t = Date.parse('2026-11-16T12:00:00Z');
    expect(implausible({ ...ok, keys: 12, takes: 40 }, facts, { keys: 0, at: t - 60_000 }, t)).toContain('too-fast-rise');
    expect(implausible({ ...ok, keys: 12, takes: 40 }, facts, { keys: 10, at: t - 60_000 }, t)).not.toContain('too-fast-rise');
    expect(implausible({ ...ok, takes: 400 }, facts, { keys: 4, at: t - 60_000, takes: 20 }, t)).toContain('takes-rate');
    // voice: 8 notes/s
    expect(implausible({ ...ok, keys: 0, bestBpm: 300 }, { ...facts, instrument: 'voice' })).toContain('note-rate');
  });
  it('duplicate devices: one device posting for a second account', () => {
    const seen = [{ device: 'abcdefabcdef1234', user: 'u1' }];
    expect(deviceConflict(seen, 'abcdefabcdef1234', 'u2')).toBe(true);
    expect(deviceConflict(seen, 'abcdefabcdef1234', 'u1')).toBe(false);
    expect(deviceConflict(seen, '', 'u2')).toBe(false);
  });
  it('the digest is stable and depends on the playing', () => {
    const t: TakeTrace = { source: 'midi', bpm: 120, notes: [0, 250, 500, 760].map((on, i) => ({ on, vel: 80 + i })) };
    expect(takeDigest(t)).toMatch(/^[0-9a-f]{16}$/);
    expect(takeDigest(t)).toBe(takeDigest({ ...t }));
    expect(takeDigest({ ...t, notes: t.notes.map((n) => ({ ...n, vel: n.vel + 1 })) })).not.toBe(takeDigest(t));
    expect(takeDigest(null)).toBe('');
  });
});

describe('the result posts only from measured takes', () => {
  const l = phrase();
  const item = (key: number, o: Partial<ItemState> = {}): [string, ItemState] => {
    const id = phraseItemId(l, 'piano', key);
    return [id, { itemId: id, family: 'licks', key, hands: 'R', cleanBpm: 0, goalBpm: 80, streak: 0, fails: 0, takes: 0, last: '2026-11-15T10:00:00Z', history: [], ewma: { cv: 0.05, sd: 20, vsd: 0, hands: 0, acc: 0.95 }, ...o } as ItemState];
  };
  it('free-time takes alone send nothing', () => {
    const items = Object.fromEntries([item(5, { takes: 3, rubato: { free: 3, quarters: 0 } })]);
    expect(challengeResult(l, items)).toBeNull();
  });
  it('a key passed at the target counts; source and machine come from the kept takes', () => {
    const pass = [
      { at: '2026-11-14T10:00:00Z', bpm: 160 },
      { at: '2026-11-15T10:00:00Z', bpm: 160 },
      { at: '2026-11-15T11:00:00Z', bpm: 160 },
    ];
    const items = Object.fromEntries([item(5, { cleanBpm: 160, takes: 6, passLog: pass, history: [{ at: '2026-11-15T11:00:00Z', bpm: 160, cv: 0.05 }] }), item(10, { cleanBpm: 120, takes: 2, history: [{ at: '2026-11-15T11:00:00Z', bpm: 120, cv: 0.05 }] })]);
    const human: TakeTrace = { source: 'midi', bpm: 160, notes: Array.from({ length: 16 }, (_, i) => ({ on: i * 187 + ((i * 7) % 9), vel: 70 + i })) };
    const r = challengeResult(l, items, 'piano', [human])!;
    expect(r).toMatchObject({ keys: 1, bestBpm: 160, source: 'midi', machine: false, takes: 8 });
    expect(r.days).toBeGreaterThanOrEqual(2);
    expect(r.digest).toMatch(/^[0-9a-f]{16}$/);
    const seq: TakeTrace = { source: 'midi', bpm: 160, notes: Array.from({ length: 16 }, (_, i) => ({ on: i * 187.5, vel: 100 })) };
    expect(challengeResult(l, items, 'piano', [human, seq])!.machine).toBe(true);
    expect(resultChanged(null, r)).toBe(true);
    expect(resultChanged(r, { ...r })).toBe(false);
    expect(resultChanged(r, { ...r, bestBpm: 164 })).toBe(true);
  });
});

describe('gallery and the featured phrase', () => {
  it('filters by instrument, level band and style', () => {
    const p = { instrument: 'piano' as const, level: 4, style: 'blues' };
    expect(matchesGallery(p, {})).toBe(true);
    expect(matchesGallery(p, { instrument: 'guitar' })).toBe(false);
    expect(matchesGallery(p, { level: [4, 5] })).toBe(true);
    expect(matchesGallery(p, { level: [1, 2] })).toBe(false);
    expect(matchesGallery(p, { style: 'bebop' })).toBe(false);
  });
  it('the app picks the most-learned public phrase, never last week’s', () => {
    const c = (id: string, learnedWeek: number, reached: number, o: Partial<{ visibility: 'public' | 'friends'; status: string }> = {}) => ({ id, visibility: 'public' as const, status: 'live', learnedWeek, reached, createdAt: '2026-11-10', ...o });
    expect(pickFeatured([c('a', 2, 9), c('b', 5, 1), c('c', 9, 9, { visibility: 'friends' })])?.id).toBe('b');
    expect(pickFeatured([c('a', 2, 9), c('b', 5, 1)], 'b')?.id).toBe('a');
    expect(pickFeatured([c('a', 0, 0, { status: 'held' })])).toBeNull();
    expect(weekStart(new Date('2026-11-18T09:00:00Z'))).toBe('2026-11-16');
  });
});

describe('known-melody check (§11.6)', () => {
  it('finds a songbook melody played in another key and tempo', () => {
    const s = SONGBOOK[0];
    const ns = songNotes(s).filter((n) => n.semi !== null);
    const line = ns.slice(0, 10).map((n) => ({ pitch: 67 + (n.semi as number), beat: n.at * 0.5 + 3 }));
    const m = matchLine(line);
    expect(m).not.toBeNull();
  });
  it('finds a famous riff by its intervals', () => {
    const smoke = [0, 3, 5, 0, 3, 6, 5].map((s, i) => [s + 2, i * 0.75, 0.5] as LickNote);
    expect(knownMelody({ notes: smoke })?.id).toBe('riff-smoke');
  });
  it('leaves common vocabulary alone: scale runs, repeated notes, trills, even arpeggios', () => {
    expect(trivial([2, 2, 1, 2, 2], [0, 0, 0, 0])).toBe(true);
    expect(trivial([0, 0, 0, 0, 0], [0, 1, 0, 0])).toBe(true);
    expect(trivial([1, -1, 1, -1, 1], [0, 0, 0, 0])).toBe(true);
    expect(trivial([4, 3, 5, 4, 3], [0, 0, 0, 0])).toBe(true);
    expect(trivial([4, -2, 5, -1, 3], [0, 1, 0, 0])).toBe(false);
    const run = [0, 2, 4, 5, 7, 9, 11, 12].map((s, i) => [s, i * 0.5, 0.5] as LickNote);
    expect(knownMelody({ notes: run })).toBeNull();
    expect(windows(run.map(([s, b]) => ({ pitch: 60 + s, beat: b })))).toEqual([]);
  });
  it('an original bebop line is not flagged', () => {
    expect(knownMelody(phrase())).toBeNull();
  });
});

describe('the dev mock server', () => {
  beforeEach(async () => {
    mem.clear();
    mem.set('tt.mockChallenges', '1');
    mem.set('tt.mockChallenges.age', '1990');
    (await import('../src/cloud/challengesMock')).resetMockChallenges();
  });
  it('share → open → board → measured result → beat link → report hides', async () => {
    const c = await import('../src/cloud/challenges');
    const { payload } = sharePayload(phrase(), { ...meta, visibility: 'public' }, { gate: adult });
    const { id, code } = await c.sharePhrase(payload);
    expect(isShareCode(code)).toBe(true);
    const o = await c.openPhrase(code);
    expect(o.kind).toBe('phrase');
    if (o.kind !== 'phrase') return;
    expect(o.p.mine).toBe(true);
    expect(await c.phraseBoard(id, 'all')).toEqual([]);
    // my measured result
    expect(await c.postResult(id, { keys: 1, bestBpm: 160, acc: 0.95, source: 'midi', digest: 'ab', takes: 6, days: 2, machine: false })).toBe('ok');
    const rows = await c.phraseBoard(id, 'friends');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ me: true, creator: true, keys: 1, bestBpm: 160 });
    // implausible posts are refused, never stored
    expect(await c.postResult(id, { keys: 12, bestBpm: 160, acc: 0.95, source: 'midi', digest: '', takes: 40, days: 3, machine: false })).toBe('implausible');
    // a sequencer-like take: stored, flagged, off boards for others
    expect(await c.postResult(id, { keys: 1, bestBpm: 164, acc: 0.95, source: 'midi', digest: '', takes: 7, days: 2, machine: true })).toBe('flagged');
    expect((await c.phraseBoard(id, 'all'))[0].flagged).toBe(true);
    expect(await c.beatLink(id)).toBeNull(); // no beat link from a flagged row
    expect(await c.postResult(id, { keys: 1, bestBpm: 164, acc: 0.96, source: 'midi', digest: '', takes: 8, days: 2, machine: false })).toBe('ok');
    const beat = await c.beatLink(id);
    expect(isShareCode(beat)).toBe(true);
    expect(await c.openBeat(beat!)).toMatchObject({ bpm: 164, keys: 1 });
    // the public link, signed out
    mem.set('tt.mockChallenges', 'anon');
    expect((await c.openPublic(code))?.title).toBe(payload.title);
    await expect(c.openPhrase(code)).rejects.toThrow();
    mem.set('tt.mockChallenges', '1');
  });
  it('the gallery is finite; reporting a phrase hides it (held at two reporters)', async () => {
    const c = await import('../src/cloud/challenges');
    const g = await c.gallery({});
    expect(g.featured?.code).toBe('CQDAFXC5'); // most "learned it" this week
    expect(g.featuredBy).toBe('app');
    expect(g.friends.map((p) => p.code).sort()).toEqual(['NQAKBLS3', 'TAMDDLD4']);
    expect(g.rising.length).toBeLessThanOrEqual(10);
    expect((await c.gallery({ instrument: 'guitar' })).friends).toEqual([]);
    const owl = await c.openPhrase('BLUESWL2');
    if (owl.kind !== 'phrase') throw new Error('no phrase');
    expect(await c.reportShared(owl.p.id, null, 'copied')).toBe('held');
    expect(c.hiddenSet().has(`${owl.p.id}:`)).toBe(true);
    expect((await c.openPhrase('BLUESWL2')).kind).toBe('none');
    // the owner replaces the featured phrase; the review list restores the held one
    await c.featurePhrase('TAMDDLD4');
    expect((await c.gallery({})).featuredBy).toBe('owner');
    const list = (await c.reviewList())!;
    expect(list.some((r) => r.kind === 'phrase' && r.code === 'BLUESWL2' && r.status === 'held')).toBe(true);
    await c.resolveReview('phrase', owl.p.id, null, 'restore');
    expect((await c.openPhrase('BLUESWL2')).kind).toBe('phrase');
  });
  it('age gates on the server side, friends-only phrases are locked for strangers', async () => {
    const c = await import('../src/cloud/challenges');
    mem.set('tt.mockChallenges.age', '2015');
    const { payload } = sharePayload(phrase(), { ...meta, visibility: 'public' }, { gate: adult });
    await expect(c.sharePhrase(payload)).rejects.toThrow(/13/);
    const g = await c.gallery({});
    expect(g.featured).toBeNull();
    expect(g.rising).toEqual([]);
  });
  it('a duplicate device posting for another account is flagged', async () => {
    const mock = await import('../src/cloud/challengesMock');
    const c = await import('../src/cloud/challenges');
    const itai = await c.openPhrase('TAMDDLD4');
    if (itai.kind !== 'phrase') throw new Error('no phrase');
    // someone else already posted from this device tag
    const db = JSON.parse(mem.get('tt.mockChallenges.db') ?? 'null') ?? null;
    if (db) {
      db.devices.push({ phrase: itai.p.id, device: c.deviceTag(), user: 'u-sam' });
      mem.set('tt.mockChallenges.db', JSON.stringify(db));
    } else {
      await mock.mockChallengeRpc('toneturn_phrase_gallery', {});
      const d2 = JSON.parse(mem.get('tt.mockChallenges.db')!);
      d2.devices.push({ phrase: itai.p.id, device: c.deviceTag(), user: 'u-sam' });
      mem.set('tt.mockChallenges.db', JSON.stringify(d2));
    }
    expect(await c.postResult(itai.p.id, { keys: 0, bestBpm: 110, acc: 0.9, source: 'mic', digest: '', takes: 3, days: 1, machine: false })).toBe('flagged');
  });
});
