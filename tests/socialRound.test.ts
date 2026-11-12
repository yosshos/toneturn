import { describe, expect, it } from 'vitest';
import { inQuietHours, localClock, planSocialPush, socialMessage, whoText, type SocialItem } from '../supabase/functions/_shared/socialPush';
import {
  activityText,
  canSendQuick,
  challengeFromHash,
  challengeLink,
  CHALLENGE_CODE_RE,
  feedWorthyBadge,
  milestonePosts,
  phrasesFor,
  phraseText,
  QUICK_PHRASES,
  questProgress,
  withoutBlocked,
  type MilestoneSnapshot,
} from '../src/engine/socialRound';
import { effectivePrivacy } from '../src/engine/privacy';

const item = (id: number, kind: string, from: string, at: string): SocialItem => ({ id, kind, data: { from }, at });

describe('push budget: quiet hours', () => {
  it('wraps past midnight and treats from = to as none', () => {
    expect(inQuietHours(23, 22, 8)).toBe(true);
    expect(inQuietHours(3, 22, 8)).toBe(true);
    expect(inQuietHours(8, 22, 8)).toBe(false);
    expect(inQuietHours(21, 22, 8)).toBe(false);
    expect(inQuietHours(13, 13, 15)).toBe(true);
    expect(inQuietHours(15, 13, 15)).toBe(false);
    expect(inQuietHours(3, 0, 0)).toBe(false);
  });
  it('reads the local day and hour in a time zone', () => {
    const now = new Date('2026-11-12T21:30:00Z');
    expect(localClock(now, 'UTC')).toEqual({ day: '2026-11-12', hour: 21 });
    expect(localClock(now, 'Asia/Jerusalem')).toEqual({ day: '2026-11-12', hour: 23 });
    expect(localClock(now, 'Pacific/Auckland').day).toBe('2026-11-13');
    expect(localClock(now, 'Not/AZone')).toEqual({ day: '2026-11-12', hour: 21 });
  });
});

describe('push budget: one merged push a day', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  const base = { now, tz: 'UTC', lang: 'en' as const };
  it('merges nudges and cheers into one message', () => {
    const items = [item(1, 'nudge', 'CodaFox42', '2026-11-12T10:00:00Z'), item(2, 'nudge', 'Mixolydia', '2026-11-12T10:05:00Z'), item(3, 'nudge', 'Allegra', '2026-11-12T10:06:00Z'), item(4, 'cheer', 'Ostinato7', '2026-11-12T10:07:00Z'), item(5, 'cheer', 'Allegra', '2026-11-12T10:08:00Z')];
    const p = planSocialPush({ ...base, items });
    expect(p.send).toBe(true);
    if (p.send) {
      expect(p.ids).toEqual([1, 2, 3, 4, 5]);
      expect(p.day).toBe('2026-11-12');
      expect(p.title).toBe('CodaFox42 and 2 friends nudged you');
      expect(p.body).toBe('2 friends cheered you');
    }
  });
  it('holds after today’s push, in quiet hours, for cheers alone and while collecting', () => {
    const items = [item(1, 'nudge', 'A', '2026-11-12T10:00:00Z')];
    expect(planSocialPush({ ...base, items, lastDay: '2026-11-12' })).toEqual({ send: false, reason: 'budget' });
    expect(planSocialPush({ ...base, items, lastDay: '2026-11-11' }).send).toBe(true);
    expect(planSocialPush({ ...base, items, tz: 'Pacific/Auckland' })).toEqual({ send: false, reason: 'quiet' }); // 01:00 there
    expect(planSocialPush({ ...base, items, tz: 'Pacific/Auckland', quietFrom: 2, quietTo: 7 }).send).toBe(true);
    expect(planSocialPush({ ...base, items: [item(2, 'cheer', 'B', '2026-11-12T09:00:00Z')] })).toEqual({ send: false, reason: 'cheers-only' });
    expect(planSocialPush({ ...base, items: [item(3, 'duel_new', 'C', '2026-11-12T11:50:00Z')] })).toEqual({ send: false, reason: 'collecting' });
    expect(planSocialPush({ ...base, items: [] })).toEqual({ send: false, reason: 'empty' });
  });
  it('names people in both languages', () => {
    expect(whoText(['A'], 'en')).toBe('A');
    expect(whoText(['A', 'B'], 'en')).toBe('A and B');
    expect(whoText(['A', 'A', 'B', 'C'], 'en')).toBe('A and 2 friends');
    expect(whoText(['A', 'B', 'C'], 'he')).toBe('A ועוד 2 חברים');
    const m = socialMessage([item(1, 'duel_new', 'A', ''), item(2, 'friend_req', 'B', ''), item(3, 'duel_done', '', '')], 'he');
    expect(m.title).toContain('A');
    expect(m.body).toContain('B');
    expect(`${m.title} ${m.body}`).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('block filtering', () => {
  it('drops blocked players and keeps rows without an id', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: null }, { id: 'c' }];
    expect(withoutBlocked(rows, ['b', 'c'], (r) => r.id)).toEqual([{ id: 'a' }, { id: null }]);
    expect(withoutBlocked(rows, [], (r) => r.id)).toBe(rows);
  });
});

describe('challenge links', () => {
  it('carries only an opaque 8-character code', () => {
    const link = challengeLink('https://7sense.netlify.app', '/', 'K7Q2MXAB');
    expect(link).toBe('https://7sense.netlify.app/#/c/K7Q2MXAB');
    expect(challengeFromHash('#/c/K7Q2MXAB')).toBe('K7Q2MXAB');
    expect(challengeFromHash('#c/k7q2mxab')).toBe('K7Q2MXAB');
    expect(challengeFromHash('#/c/K7Q2MXA')).toBeNull();
    expect(challengeFromHash('#/c/K7Q2MXA0')).toBeNull(); // 0 is a look-alike, never issued
    expect(challengeFromHash('#/online/ABC234')).toBeNull();
    expect(CHALLENGE_CODE_RE.test('ABCDEFGH')).toBe(true);
    expect(CHALLENGE_CODE_RE.test('ABCDEFGI')).toBe(false);
  });
});

describe('quick messages', () => {
  it('are a fixed bilingual set with a 3-second gap', () => {
    for (const p of QUICK_PHRASES) {
      expect(p.en.length).toBeGreaterThan(0);
      expect(p.he.length).toBeGreaterThan(0);
      expect(p.en + p.he).not.toMatch(/\p{Extended_Pictographic}/u);
    }
    expect(phrasesFor('before')).toContain('gl');
    expect(phrasesFor('after')).toContain('gg');
    expect(phraseText('gg', 'he')).toBe('משחק טוב!');
    expect(phraseText('nope', 'en')).toBe('');
    expect(canSendQuick(null, 1000)).toBe(true);
    expect(canSendQuick(1000, 3500)).toBe(false);
    expect(canSendQuick(1000, 4000)).toBe(true);
  });
  it('are off for young players (and the feed with them)', () => {
    const now = new Date('2026-11-12');
    const young = effectivePrivacy({ preset: 'open', feed: true }, 2016, false, now);
    expect(young.canMessage).toBe(false);
    expect(young.feed).toBe(false);
    const adult = effectivePrivacy({ preset: 'friends' }, 1990, false, now);
    expect(adult.canMessage).toBe(true);
    expect(adult.feed).toBe(true);
    expect(adult.quietFrom).toBe(22);
    expect(adult.quietTo).toBe(8);
    expect(effectivePrivacy({ preset: 'friends', feed: false, quietFrom: 21, quietTo: 7 }, 1990, false, now)).toMatchObject({ feed: false, quietFrom: 21, quietTo: 7 });
  });
});

describe("friends' activity milestones", () => {
  const snap = (levels: Record<string, string>, standards: string[], streak: number): MilestoneSnapshot => ({ levels, standards, streak });
  it('first run only remembers; later diffs post levels, standards and streak milestones', () => {
    expect(milestonePosts(null, snap({ ear: 'mf' }, ['jazz:autumn'], 40), {}, [])).toEqual([]);
    const posts = milestonePosts(snap({ ear: 'mp', keys: 'p' }, [], 6), snap({ ear: 'mf', keys: 'p' }, ['jazz:autumn-leaves'], 7), {}, []);
    expect(posts.map((p) => p.kind)).toEqual(['level', 'standard', 'streak']);
    expect(posts[0].payload).toEqual({ course: 'ear', level: 'mf' });
    expect(posts[1].payload).toMatchObject({ course: 'jazz', id: 'autumn-leaves', first: 1 });
    expect(posts[2].payload).toEqual({ n: 7 });
  });
  it('skips posted keys, small badges and rank moves inside a tier; caps at three', () => {
    const s = snap({}, [], 0);
    const ev = {
      badges: [
        { id: 'x-small', cat: 'skill' as const, tone: 'bronze' as const },
        { id: 'x-big', cat: 'skill' as const, tone: 'gold' as const },
      ],
      rank: { area: 'pitch', to: 7, newTier: false, kind: 'up' },
    };
    expect(milestonePosts(s, s, ev, []).map((p) => p.key)).toEqual(['badge:x-big']);
    expect(milestonePosts(s, s, ev, ['badge:x-big'])).toEqual([]);
    expect(milestonePosts(s, s, { rank: { area: 'pitch', to: 6, newTier: true, kind: 'up' } }, [])[0]).toMatchObject({ kind: 'rank', payload: { area: 'pitch', div: 6 } });
    const many = { badges: ['a', 'b', 'c', 'd'].map((id) => ({ id, cat: 'special' as const })) };
    expect(milestonePosts(s, s, many, []).length).toBe(3);
    expect(feedWorthyBadge({ cat: 'area' })).toBe(true);
    expect(feedWorthyBadge({ cat: 'sub', tone: 'silver' })).toBe(false);
  });
  it('renders one line per post in both languages', () => {
    expect(activityText('streak', { n: 30 }, 'en')).toBe('30 days in a row');
    expect(activityText('level', { course: 'ear', level: 'f' }, 'he')).toContain('f');
    expect(activityText('rank', { area: 'pitch', div: 6 }, 'en')).toMatch(/^reached /);
    expect(activityText('nonsense', {}, 'en')).toBe('');
  });
});

describe('friend quest', () => {
  it('adds both contributions toward the goal', () => {
    expect(questProgress(20, 25, 60)).toMatchObject({ total: 45, done: false });
    expect(questProgress(40, 25, 60)).toMatchObject({ total: 65, ratio: 1, done: true });
    expect(questProgress(30, 0, 60).mineShare).toBe(0.5);
    expect(questProgress(-5, 10, 0).total).toBe(10);
  });
});
