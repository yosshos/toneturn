// Reactions and gifts between friends (owner decisions 2026-11-16): reaction rules and who sees counts, the fermata in
// the streak engine, the one-gift-per-practice-day allowance, dedications (library, completion bonus once per side),
// practise-together (the 10-minute window, five measured minutes each, the duet streak), and the dev mock server.
import { beforeEach, describe, expect, it } from 'vitest';
import type { Lick, LickNote } from '../src/engine/licks';
import type { ItemState } from '../src/engine/drills/types';
import { addDays, gemsSpent, streakState, type Purchase } from '../src/engine/streak';
import {
  ALLOWANCE_TEXT,
  DEDICATION_XP,
  INVITES_PER_DAY,
  REACTION_KINDS,
  TOGETHER_MIN_MS,
  bonusKey,
  canGift,
  canReact,
  cappedMs,
  cleanNote,
  dedicatable,
  dedicationDone,
  dedicationLickId,
  duetStreak,
  fermataPurchase,
  giftAllowance,
  inviteExpired,
  invitesLeft,
  lickFromDedication,
  practisingTogether,
  toggleReaction,
  togetherDone,
  totalReactions,
  visibleCounts,
} from '../src/engine/encore/gifts';
import { challengeAssignment, parseChallengeHash, sharePayload, shareGate } from '../src/engine/encore/community';
import { encodePhraseRef } from '../src/engine/encore/assign';
import { finalHand, keyOrder, phraseDrill, planOf } from '../src/engine/encore/phrase';
import { newItem } from '../src/engine/drills/ladder';

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

const phrase = (o: Partial<Lick> = {}): Lick => ({
  id: 'enc-g1',
  v: 3,
  ctx: 'major-251',
  level: 3,
  name: { en: 'ii–V in F', he: 'ii–V ב־F' },
  own: true,
  chords: [
    [2, 'm7', 4],
    [7, '7', 4],
  ],
  notes: [0, 4, 7, 11, 14, 11, 7, 6].map((s, i) => [s, i * 0.5, 0.5] as LickNote),
  meter: 4,
  swing: 0.6,
  homeKey: 5,
  instrument: 'piano',
  plan: { startBpm: 80, goalBpm: 120, keys: 'all', order: 'easiest', hands: 'R', band: false },
  ...o,
});
const MON = '2026-11-02';
const run = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

describe('reactions: "הדרן!" and three compliments', () => {
  it('four kinds, each once per viewer (a tap again takes it back)', () => {
    expect(REACTION_KINDS).toEqual(['encore', 'groove', 'tone', 'idea']);
    let mine = toggleReaction([], 'encore');
    mine = toggleReaction(mine, 'tone');
    mine = toggleReaction(mine, 'encore');
    expect(mine).toEqual(['tone']);
    expect(toggleReaction(['idea'], 'groove')).toEqual(['groove', 'idea']);
  });
  it('never on my own phrase, never signed out', () => {
    expect(canReact({ mine: true })).toBe(false);
    expect(canReact({ mine: false })).toBe(true);
    expect(canReact({ mine: false }, false)).toBe(false);
  });
  it('counts are for the sharer only', () => {
    expect(visibleCounts(false, { encore: 3 })).toBeNull();
    const c = visibleCounts(true, { encore: 3, idea: '2', groove: -1 });
    expect(c).toEqual({ encore: 3, groove: 0, tone: 0, idea: 2 });
    expect(totalReactions(c)).toBe(5);
  });
});

describe('fermata in the streak engine', () => {
  it('a fermata holds the first missed day after it arrives, marked as a fermata day', () => {
    // Mon–Wed practised, Thu missed, Fri practised; a fermata arrived on Tue
    const days = [...run(MON, 3), addDays(MON, 4)];
    const p: Purchase[] = [fermataPurchase('g1', addDays(MON, 1), 'Noa')];
    const st = streakState(days, p, addDays(MON, 4));
    expect(st.count).toBe(4);
    expect(st.fermataDays).toEqual([addDays(MON, 3)]);
    expect(st.freezeDays).toEqual([addDays(MON, 3)]);
    // the weekly free freeze is still there (the gift went first)
    expect(st.freezes).toBe(1);
    expect(st.fermatas).toBe(0);
  });
  it('is consumed once: a second miss uses the free freeze, a third breaks', () => {
    const days = [MON, addDays(MON, 2), addDays(MON, 4)];
    const st = streakState(days, [fermataPurchase('g1', MON, 'Noa')], addDays(MON, 4));
    expect(st.fermataDays).toEqual([addDays(MON, 1)]);
    expect(st.freezeDays).toEqual([addDays(MON, 1), addDays(MON, 3)]);
    expect(st.count).toBe(3); // held days keep the run; only practised days add
    const broke = streakState([MON, addDays(MON, 2), addDays(MON, 4), addDays(MON, 6)], [fermataPurchase('g1', MON, 'Noa')], addDays(MON, 6));
    expect(broke.count).toBe(1);
  });
  it('waits when nothing was missed, and is not capped by the two bought / free freezes', () => {
    const p = [fermataPurchase('a', MON, 'Noa'), fermataPurchase('b', MON, 'Itai'), fermataPurchase('c', MON, 'Noa')];
    const st = streakState(run(MON, 4), [{ id: 'f', kind: 'freeze', day: MON }, ...p], addDays(MON, 3));
    expect(st.fermatas).toBe(3);
    expect(st.freezes).toBe(2);
  });
  it('a fermata that came before the first practice day still counts; it costs no gems; its id is fixed by the gift', () => {
    const st = streakState([addDays(MON, 2), addDays(MON, 4)], [fermataPurchase('g', MON, 'Noa')], addDays(MON, 4));
    expect(st.fermataDays).toEqual([addDays(MON, 3)]);
    expect(gemsSpent([fermataPurchase('g', MON, 'Noa')])).toBe(0);
    expect(fermataPurchase('g9', MON, 'Noa').id).toBe('gift-g9');
  });
});

describe('the allowance: one gift per practice day; three invites a day', () => {
  it('practise first, then one gift, nothing carries over', () => {
    expect(giftAllowance({ measuredToday: false, sentToday: 0 })).toBe('practise-first');
    expect(giftAllowance({ measuredToday: true, sentToday: 0 })).toBe('ready');
    expect(giftAllowance({ measuredToday: true, sentToday: 1 })).toBe('used');
    expect(ALLOWANCE_TEXT.ready.he).toBe('מתנה אחת ליום תרגול — נשארה לך היום');
    expect(ALLOWANCE_TEXT.used.he).toBe('המתנה של היום נשלחה');
    expect(ALLOWANCE_TEXT['practise-first'].he).toBe('תרגלו היום כדי לשלוח מתנה');
    expect(invitesLeft(0)).toBe(INVITES_PER_DAY);
    expect(invitesLeft(5)).toBe(0);
  });
  it('friends only, never to myself, never across a block; notes trimmed, none for young players', () => {
    expect(canGift({ me: 'a', to: 'a', friends: true, blocked: false })).toBe(false);
    expect(canGift({ me: 'a', to: 'b', friends: false, blocked: false })).toBe(false);
    expect(canGift({ me: 'a', to: 'b', friends: true, blocked: true })).toBe(false);
    expect(canGift({ me: 'a', to: 'b', friends: true, blocked: false })).toBe(true);
    expect(cleanNote('  for   the gig  ')).toBe('for the gig');
    expect(cleanNote('x'.repeat(300))?.length).toBe(140);
    expect(cleanNote('hi', true)).toBeNull();
    expect(cleanNote('   ')).toBeNull();
  });
});

describe('dedication', () => {
  const ref = encodePhraseRef(challengeAssignment(phrase(), 'piano', 'en', 'ii–V in F'));
  it('lands in the library marked "from <name>" with the note; my own phrases only can be dedicated', () => {
    const l = lickFromDedication(ref, 'gift-1', 'Noa.K', 'for Thursday')!;
    expect(l.id).toBe(dedicationLickId('gift-1'));
    expect(l.source).toEqual({ kind: 'dedication', giftId: 'gift-1', by: 'Noa.K', note: 'for Thursday' });
    expect(lickFromDedication('nope', 'g', 'x', null)).toBeNull();
    const book = { own: [phrase(), l, phrase({ id: 'enc-t', source: { kind: 'teacher', assignmentId: 'a', teacher: 'T' } })] };
    expect(dedicatable(book).map((x) => x.id)).toEqual(['enc-g1']);
  });
  it('is completed when the receiver makes it "yours" (all 12 keys at the target), bonus keyed once per side', () => {
    const l = lickFromDedication(ref, 'gift-2', 'Noa.K', null)!;
    expect(dedicationDone(l, {})).toBe(false);
    const items: Record<string, ItemState> = {};
    const goal = planOf(l).goalBpm;
    for (const k of keyOrder(l, planOf(l), 'piano')) {
      const d = phraseDrill(l, k, finalHand(l), { inst: 'piano' });
      items[d.itemId] = { ...newItem(d), cleanBpm: goal, goalBpm: goal, passLog: ['2026-11-09T10:00:00Z', '2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z'].map((x) => ({ at: x, bpm: goal })) } as unknown as ItemState;
    }
    expect(dedicationDone(l, items)).toBe(true);
    expect(dedicationDone(phrase(), items)).toBe(false); // not a dedication
    expect(DEDICATION_XP).toBe(20);
    expect(bonusKey('g', 'to')).not.toBe(bonusKey('g', 'from'));
  });
});

describe('practise together', () => {
  const t0 = Date.parse('2026-11-16T18:00:00Z');
  const at = (min: number) => new Date(t0 + min * 60_000).toISOString();
  it('"together" only while both gained measured time within the same 10 minutes', () => {
    expect(practisingTogether({ ms: 1, activeAt: at(0) }, { ms: 1, activeAt: at(4) }, t0 + 5 * 60_000)).toBe(true);
    expect(practisingTogether({ ms: 1, activeAt: at(0) }, { ms: 1, activeAt: at(11) }, t0 + 11 * 60_000)).toBe(false);
    expect(practisingTogether({ ms: 1, activeAt: at(0) }, { ms: 1, activeAt: at(1) }, t0 + 30 * 60_000)).toBe(false);
    expect(practisingTogether({ ms: 1, activeAt: null }, { ms: 1, activeAt: at(1) }, t0)).toBe(false);
  });
  it('done at five measured minutes each; invites expire after 30 minutes; claimed time is capped by the session', () => {
    expect(togetherDone({ ms: TOGETHER_MIN_MS, activeAt: null }, { ms: TOGETHER_MIN_MS - 1, activeAt: null })).toBe(false);
    expect(togetherDone({ ms: TOGETHER_MIN_MS, activeAt: null }, { ms: TOGETHER_MIN_MS, activeAt: null })).toBe(true);
    expect(inviteExpired(at(0), t0 + 29 * 60_000)).toBe(false);
    expect(inviteExpired(at(0), t0 + 31 * 60_000)).toBe(true);
    expect(cappedMs(10 * 60_000, at(0), t0 + 3 * 60_000)).toBe(3 * 60_000);
  });
  it('the duet streak counts a together day even when the day-rule alone would not', () => {
    const today = '2026-11-16';
    const meDays = new Set(['2026-11-13', '2026-11-14', '2026-11-15']);
    const themDays = new Set(['2026-11-13', '2026-11-14', '2026-11-15']);
    expect(duetStreak({ meDays, themDays, togetherDays: new Set(), today })).toBe(3);
    expect(duetStreak({ meDays, themDays, togetherDays: new Set([today]), today })).toBe(4);
    expect(duetStreak({ meDays: new Set(['2026-11-15']), themDays: new Set(), togetherDays: new Set(['2026-11-14']), today })).toBe(0);
  });
});

describe('routes', () => {
  it('#/challenges/gifts[/<friend>[/dedicate]]', () => {
    expect(parseChallengeHash('#/challenges/gifts')).toEqual({ view: 'gifts', friend: null, dedicate: false });
    expect(parseChallengeHash('#/challenges/gifts/u-noa')).toEqual({ view: 'gifts', friend: 'u-noa', dedicate: false });
    expect(parseChallengeHash('#/challenges/gifts/u-noa/dedicate')).toEqual({ view: 'gifts', friend: 'u-noa', dedicate: true });
  });
});

describe('the dev mock server: reactions and gifts', () => {
  beforeEach(async () => {
    mem.clear();
    mem.set('tt.mockChallenges', '1');
    mem.set('tt.mockChallenges.age', '1990');
    (await import('../src/cloud/challengesMock')).resetMockChallenges();
  });
  it('a viewer reacts once per kind; the sharer sees per-kind counts, the viewer never does', async () => {
    const c = await import('../src/cloud/challenges');
    const o = await c.openPhrase('BLUESWL2');
    if (o.kind !== 'phrase') throw new Error('no phrase');
    expect(o.p.reactions).toBeUndefined();
    await c.setReaction(o.p.id, 'encore', true);
    await c.setReaction(o.p.id, 'encore', true); // once
    await c.setReaction(o.p.id, 'groove', true);
    const again = await c.openPhrase('BLUESWL2');
    if (again.kind !== 'phrase') throw new Error('no phrase');
    expect(again.p.myReactions).toEqual(['encore', 'groove']);
    expect(again.p.reactions).toBeUndefined();
    // my own phrase: no reacting; counts visible
    const { payload } = sharePayload(phrase(), { title: 'Mine', style: 'bebop', level: 0, visibility: 'friends', attested: true, audio: false }, { gate: shareGate(1990) });
    const { id, code } = await c.sharePhrase(payload);
    await expect(c.setReaction(id, 'tone', true)).rejects.toThrow();
    const raw = JSON.parse(mem.get('tt.mockChallenges.db')!);
    raw.reactions.push({ phrase: id, user: 'u-noa', kind: 'encore', at: new Date().toISOString() }, { phrase: id, user: 'u-itai', kind: 'encore', at: new Date().toISOString() }, { phrase: id, user: 'u-noa', kind: 'idea', at: new Date().toISOString() });
    mem.set('tt.mockChallenges.db', JSON.stringify(raw));
    const mine = await c.openPhrase(code);
    if (mine.kind !== 'phrase') throw new Error('no phrase');
    expect(mine.p.reactions).toEqual({ encore: 2, groove: 0, tone: 0, idea: 1 });
    expect((await c.myShares()).find((x) => x.id === id)?.reactions?.encore).toBe(2);
  });
  it('one gift per practice day (fermata OR dedication), practise first, friends only', async () => {
    const g = await import('../src/cloud/gifts');
    expect(await g.sendFermata('u-noa', 60_000)).toBe('practise-first');
    expect(await g.sendFermata('u-owl', 400_000)).toBe('not-friends');
    expect(await g.sendFermata('me', 400_000)).toBe('not-friends');
    expect(await g.sendFermata('u-noa', 400_000)).toBe('ok');
    expect(await g.sendDedication('u-itai', phrase(), 'hi', 400_000)).toBe('used');
    const v = await g.giftsView();
    expect(v.today.gifts).toBe(1);
    expect(v.sent[0].kind).toBe('fermata');
  });
  it('a dedication sent tomorrow arrives; the receiver side syncs fermata + dedication, completion pays both sides once', async () => {
    mem.set('tt.mockChallenges.gifts', '1');
    (await import('../src/cloud/challengesMock')).resetMockChallenges();
    const g = await import('../src/cloud/gifts');
    const s1 = await g.syncGifts({ book: { own: [] }, purchases: [], items: {}, granted: {} });
    expect(s1.purchases.map((p) => p.id)).toEqual(['gift-g-noa-fermata']);
    expect(s1.purchases[0].kind).toBe('fermata');
    expect(s1.licks.map((l) => l.id)).toEqual([dedicationLickId('g-itai-ded')]);
    expect(s1.licks[0].source).toMatchObject({ kind: 'dedication', by: 'Itai', note: 'For the gig on Thursday' });
    // a second sync with the results applied adds nothing
    const book = { own: s1.licks };
    const s2 = await g.syncGifts({ book, purchases: s1.purchases, items: {}, granted: {} });
    expect(s2.purchases).toEqual([]);
    expect(s2.licks).toEqual([]);
    expect(s2.xp).toEqual([]);
    // the phrase made "yours": every key at the target
    const l = s1.licks[0];
    const items: Record<string, ItemState> = {};
    const goal = planOf(l).goalBpm;
    for (const k of keyOrder(l, planOf(l), 'piano')) {
      const d = phraseDrill(l, k, finalHand(l), { inst: 'piano' });
      items[d.itemId] = { ...newItem(d), cleanBpm: goal, goalBpm: goal, passLog: ['2026-11-09T10:00:00Z', '2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z'].map((x) => ({ at: x, bpm: goal })) } as unknown as ItemState;
    }
    const s3 = await g.syncGifts({ book, purchases: s1.purchases, items, granted: {} });
    expect(s3.xp).toEqual([{ key: bonusKey('g-itai-ded', 'to'), xp: DEDICATION_XP }]);
    const s4 = await g.syncGifts({ book, purchases: s1.purchases, items, granted: {} });
    expect(s4.xp).toEqual([]); // the server pays once
  });
  it('practise together: invite (3 a day) → the friend accepts → five measured minutes each → the duet streak +1', async () => {
    const g = await import('../src/cloud/gifts');
    const before = (await g.giftsView()).friends.find((f) => f.id === 'u-noa')!.duet;
    const r = await g.inviteTogether('u-noa');
    if (!r.ok) throw new Error('no invite');
    const v = await g.giftsView();
    const s = v.sessions.find((x) => x.id === r.id)!;
    expect(s.status).toBe('active');
    expect((await g.beatTogether(r.id, 60_000)).status).toBe('active');
    const done = await g.beatTogether(r.id, TOGETHER_MIN_MS + 1000);
    expect(done.status).toBe('done');
    expect((await g.giftsView()).friends.find((f) => f.id === 'u-noa')!.duet).toBe(before + 1);
    expect((await g.inviteTogether('u-noa')).ok).toBe(true);
    expect((await g.inviteTogether('u-itai')).ok).toBe(true);
    const fourth = await g.inviteTogether('u-noa');
    expect(fourth).toEqual({ ok: false, why: 'limit' });
  });
  it('an incoming invite: accept, then my measured time counts (capped by the session)', async () => {
    mem.set('tt.mockChallenges.gifts', '1');
    (await import('../src/cloud/challengesMock')).resetMockChallenges();
    const g = await import('../src/cloud/gifts');
    const inv = (await g.giftsView()).sessions.find((s) => !s.mine && s.status === 'pending')!;
    expect(inv.friendName).toBe('Itai');
    await g.answerTogether(inv.id, true);
    const b = await g.beatTogether(inv.id, 99 * 60_000);
    expect(b.meMs).toBeLessThanOrEqual(7 * 60_000);
    expect(b.status).toBe('done');
  });
});

describe('quiet notifications', () => {
  it('gifts, dedications and invites join the one merged social push, Hebrew first, no emoji', async () => {
    const { socialMessage } = await import('../supabase/functions/_shared/socialPush');
    const at = '2026-11-16T10:00:00Z';
    const m = socialMessage(
      [
        { id: 1, kind: 'together', data: { from: 'Noa' }, at },
        { id: 2, kind: 'gift', data: { from: 'Itai', gift: 'fermata' }, at },
        { id: 3, kind: 'gift', data: { from: 'Noa', gift: 'dedication' }, at },
        { id: 4, kind: 'dedication_done', data: { from: 'Itai' }, at },
      ],
      'he',
    );
    expect(m.title).toBe('Noa מזמין/ה לתרגל יחד עכשיו');
    expect(m.body).toContain('פרמטה מ־Itai');
    expect(m.body).toContain('Noa הקדיש/ה לך משפט');
    expect(m.body).toContain('Itai השלים/ה את המשפט שהקדשת');
    expect(/\p{Extended_Pictographic}/u.test(m.title + m.body)).toBe(false);
  });
});
