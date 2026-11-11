import { describe, expect, it } from 'vitest';
import { BADGES, BADGE_BY_ID, badgeCounts, badgeProgress, badgeStates, earnBadges, earnedBadges, FAMILY_NAME, familyLevelCount, GUITAR_BADGE_FAMILIES, KEYS_FAMILIES, mergeBadgeLog, type BadgeInput } from '../src/engine/badges';
import { guitarCatalog, guitarItemId } from '../src/engine/drills/guitar';
import type { DrillSpec } from '../src/engine/drills/types';
import { SKILLS } from '../src/engine/rating';
import { SUB_SKILLS } from '../src/engine/taxonomy';
import { challengeFor } from '../src/engine/ranks';
import type { StatsDays } from '../src/engine/stats';

const HEB = /[֐-׿]/;
const sr = (r: number, n: number) => ({ r, n, correct: n, recent: [] });
const ids = (x: BadgeInput) => new Set(earnedBadges(x).map((b) => b.id));

describe('catalogue', () => {
  it('every badge has a unique id, an icon, EN + HE name and description', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(b.icon.length, b.id).toBeGreaterThan(0);
      expect(b.name.en.trim().length, b.id).toBeGreaterThan(0);
      expect(b.desc.en.trim().length, b.id).toBeGreaterThan(0);
      expect(HEB.test(b.name.he), `${b.id} he name`).toBe(true);
      expect(HEB.test(b.desc.he), `${b.id} he desc`).toBe(true);
      expect(HEB.test(b.name.en), `${b.id} en name`).toBe(false);
    }
  });
  it('names are unique within their category ladders (no copy-paste titles)', () => {
    for (const cat of ['area', 'skill', 'technique'] as const) {
      const xs = BADGES.filter((b) => b.cat === cat);
      expect(new Set(xs.map((b) => b.name.en)).size, cat).toBe(xs.length);
      expect(new Set(xs.map((b) => b.name.he)).size, cat).toBe(xs.length);
    }
  });
  it('covers every area × tier, skill × level and sub-skill', () => {
    const c = badgeCounts();
    expect(c.area).toBe(8 * 6);
    expect(c.skill).toBe(SKILLS.length * 4);
    expect(c.sub).toBe(SUB_SKILLS.length);
    expect(c.technique).toBeGreaterThanOrEqual(10 * 7 + 10 + 14 * 4 + 9);
    expect(c.special).toBeGreaterThanOrEqual(10);
    expect(c.season).toBeGreaterThanOrEqual(3);
  });
  it('an empty input earns nothing and never throws', () => {
    expect(earnedBadges({ today: '2026-11-07' })).toEqual([]);
    expect(badgeProgress({ today: '2026-11-07' })).toEqual([]);
  });
});

describe('rules on sample inputs', () => {
  it('area titles follow ranks.best', () => {
    const got = ids({ today: '2026-11-07', ranks: { time: { div: 4, since: 'x', best: 7 }, technique: { div: 15, since: 'x', best: 15 } } });
    expect(got.has('area:time:bronze') && got.has('area:time:silver') && got.has('area:time:gold')).toBe(true);
    expect(got.has('area:time:platinum')).toBe(false);
    expect(got.has('area:technique:master')).toBe(true);
    expect(got.has('special:hall-of-fame')).toBe(true);
  });
  it('skill levels need the rating and the evidence', () => {
    expect(ids({ today: 'x', ratings: { intervals: sr(1200, 10) } }).has('skill:intervals:solid')).toBe(true);
    expect(ids({ today: 'x', ratings: { intervals: sr(1450, 10) } }).has('skill:intervals:advanced')).toBe(false); // n < 20
    expect(ids({ today: 'x', ratings: { intervals: sr(1450, 25) } }).has('skill:intervals:advanced')).toBe(true);
    expect(ids({ today: 'x', ratings: { intervals: sr(950, 3) } }).has('skill:intervals:developing')).toBe(false);
    // the peak counts once measured
    expect(ids({ today: 'x', ratings: { chords: sr(1000, 10) }, peaks: { chords: { r: 1200, at: 'y' } } }).has('skill:chords:solid')).toBe(true);
  });
  it('sub-skill mastered: EWMA ≥ 0.85 with n ≥ 20', () => {
    const id = `sub:${SUB_SKILLS[0].id}`;
    expect(ids({ today: 'x', subs: { [SUB_SKILLS[0].id]: { ewma: 0.9, n: 20, last: '' } } }).has(id)).toBe(true);
    expect(ids({ today: 'x', subs: { [SUB_SKILLS[0].id]: { ewma: 0.9, n: 19, last: '' } } }).has(id)).toBe(false);
    expect(ids({ today: 'x', subs: { [SUB_SKILLS[0].id]: { ewma: 0.8, n: 50, last: '' } } }).has(id)).toBe(false);
  });
  it('technique families, keys, evenness, takes, tempo records', () => {
    const got = ids({ today: 'x', technique: { levels: { scales: 3 }, keysClean: { scales: 12, arpeggios: 11 }, bestEvenCv: 0.025, cleanTakes: 100, tempoRecords: 1 } });
    for (const id of ['tech:scales:1', 'tech:scales:3', 'tech-keys:scales', 'tech:even-3', 'tech:clean-100', 'tech:tempo-1']) expect(got.has(id), id).toBe(true);
    for (const id of ['tech:scales:4', 'tech-keys:arpeggios', 'tech:even-2', 'tech:clean-1000']) expect(got.has(id), id).toBe(false);
  });
  it('streaks, workouts, variety, time of day', () => {
    const days = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const n = new Array(168).fill(0);
    n[1 * 24 + 6] = 60; // Monday 6 am
    const areas = ['pitch', 'time', 'memory', 'voice', 'reading', 'creative', 'instrument'] as const;
    const statsDays: StatsDays = Object.fromEntries(
      areas.map((a, i) => [`2026-10-0${i + 1}`, { items: 60, correct: 58, ms: 0, xp: 0, sessions: 1, byArea: { [a]: [60, 58] }, byInput: { voice: [1, 1], buttons: [1, 1], sing: [1, 1], play: [1, 1], tap: [1, 1] } }]),
    );
    const got = ids({ today: '2026-11-07', days, workoutDays: days.slice(0, 7), statsDays, statsHours: { n, ok: n } });
    for (const id of ['special:hat-trick', 'special:fortnight', 'special:weekly-ritual', 'special:seven-seas', 'special:swiss-army-ears', 'special:dawn-chorus', 'special:bullseye-day']) expect(got.has(id), id).toBe(true);
    for (const id of ['special:half-century', 'special:iron-routine', 'special:midnight-jazz', 'special:marathon']) expect(got.has(id), id).toBe(false);
  });
  it('seasons from monthly challenges', () => {
    const months = ['2026-08', '2026-09', '2026-10'];
    const statsDays: StatsDays = Object.fromEntries(months.map((m) => [`${m}-10`, { items: 900, correct: 900, ms: 0, xp: 0, sessions: 5, byArea: { [challengeFor(m).area]: [900, 900] } }]));
    const got = ids({ today: '2026-11-07', statsDays });
    expect(got.has('season:first') && got.has('season:three') && got.has('season:gold-rush') && got.has('season:golden-trio')).toBe(true);
    expect(got.has('season:vivaldi')).toBe(false);
  });
});

describe('progress, log and merge', () => {
  it('badgeProgress returns started, unearned badges, closest first', () => {
    const x: BadgeInput = { today: 'x', ratings: { intervals: sr(1100, 10) }, technique: { cleanTakes: 90 } };
    const top = badgeProgress(x, 3);
    expect(top.length).toBe(3);
    expect(top.every((s) => !s.got && s.check.p > 0 && s.check.p < 1)).toBe(true);
    expect(top[0].check.p).toBeGreaterThanOrEqual(top[1].check.p);
  });
  it('earned badges are kept once logged and merged with the earliest date', () => {
    const x: BadgeInput = { today: 'x', ratings: { intervals: sr(1200, 10) } };
    const a = earnBadges(undefined, x, '2026-11-01');
    expect(a.newly.map((b) => b.id)).toEqual(['skill:intervals:developing', 'skill:intervals:solid']);
    const again = earnBadges(a.log, x, '2026-11-02');
    expect(again.newly).toEqual([]);
    // a later dip does not take it away
    const s = badgeStates({ today: 'x', ratings: { intervals: sr(800, 30) } }, a.log).find((z) => z.badge.id === 'skill:intervals:solid')!;
    expect(s.got).toBe(true);
    expect(mergeBadgeLog({ a: '2026-11-03' }, { a: '2026-11-01', b: '2026-11-05' })).toEqual({ a: '2026-11-01', b: '2026-11-05' });
    expect(BADGE_BY_ID['skill:intervals:solid'].name.en).toBe('Leap Spotter');
  });
});

describe('guitar technique badges', () => {
  // Bass-course families (b-*) have no family badges yet; the guitar list and g-bass do.
  const cat = guitarCatalog().filter((f) => !f.id.startsWith('b-') && !f.id.startsWith('d-'));
  const allKeys = (k: number[] | 'major' | 'minor') => (Array.isArray(k) ? k : Array.from({ length: 12 }, (_, i) => i));
  it('every guitar family has one level badge per catalogue level, EN + HE, and a glyph group', () => {
    expect(GUITAR_BADGE_FAMILIES.slice().sort()).toEqual(cat.map((f) => f.id).sort());
    for (const f of cat) {
      expect(familyLevelCount(f.id), f.id).toBe(f.levels.length);
      expect(f.levels.length).toBeLessThanOrEqual(13);
      for (let lv = 1; lv <= f.levels.length; lv++) {
        const b = BADGE_BY_ID[`tech:${f.id}:${lv}`];
        expect(b, `${f.id}:${lv}`).toBeDefined();
        expect(b.group).toBe(f.id);
        expect(b.desc.en).toContain(`of ${f.levels.length}`);
      }
      expect(BADGE_BY_ID[`tech:${f.id}:${f.levels.length + 1}`]).toBeUndefined();
      expect(HEB.test(FAMILY_NAME[f.id as keyof typeof FAMILY_NAME].he)).toBe(true);
    }
  });
  it('Around the Clock exists exactly for the families whose levels cover all 12 keys', () => {
    const twelve = cat.filter((f) => new Set(f.levels.flatMap((l) => allKeys(l.keys))).size === 12).map((f) => f.id);
    expect(KEYS_FAMILIES.filter((f) => f.startsWith('g-')).sort()).toEqual(twelve.sort());
    for (const f of twelve) expect(BADGE_BY_ID[`tech-keys:${f}`], f).toBeDefined();
  });
  it('existing piano ids are stable', () => {
    for (const id of ['tech:scales:7', 'tech:accomp:1', 'tech-keys:harris', 'tech:even-2', 'tech:clean-1000', 'tech:tempo-100']) expect(BADGE_BY_ID[id], id).toBeDefined();
  });
  it('levels feed guitar level badges', () => {
    const got = ids({ today: 'x', technique: { levels: { 'g-impro': 4, 'g-lead': 2 }, keysClean: { 'g-scales': 12 } } });
    for (const id of ['tech:g-impro:4', 'tech:g-lead:1', 'tech:g-lead:2', 'tech-keys:g-scales']) expect(got.has(id), id).toBe(true);
    expect(got.has('tech:g-lead:3')).toBe(false);
  });
  it('guitar specials read the clean items', () => {
    const G = (s: Partial<DrillSpec> & Pick<DrillSpec, 'family' | 'kind' | 'key'>) => guitarItemId({ hands: 'R', instrument: s.family === 'g-bass' ? 'bass' : 'guitar', ...s } as DrillSpec);
    const clean: Record<string, number> = {};
    const add = (s: Parameters<typeof G>[0], bpm = 70) => (clean[G(s)] = bpm);
    add({ family: 'g-lead', kind: 'bend', key: 9, option: 2 });
    add({ family: 'g-lead', kind: 'vibrato', key: 9, option: 0 });
    for (const b of [1, 2, 3, 4, 5]) add({ family: 'g-scales', kind: 'penta', key: 9, position: b, minor: true });
    for (const p of [0, 1, 2, 3]) add({ family: 'g-scales', kind: 'caged', key: 7, position: p });
    add({ family: 'g-scales', kind: 'caged', key: 2, position: 4 });
    add({ family: 'g-chords', kind: 'one-minute', key: 0, option: 1, perBeat: 0.25 }, 124);
    for (const k of [5, 7, 9, 10, 0, 2]) for (const ps of [6, 5]) for (const minor of [false, true]) add({ family: 'g-chords', kind: 'barre-check', key: k, position: ps, minor });
    for (const kind of ['spider', 'major', 'r58', 'arp', 'octaves', 'walking']) add({ family: 'g-bass', kind, key: 9, ...(kind === 'spider' ? { option: 0 } : {}) });
    add({ family: 'g-rhythm', kind: 'eighths', key: 7 });
    const got = ids({ today: 'x', technique: { cleanItems: clean } });
    for (const id of ['tech:g-bend-tune', 'tech:g-five-boxes', 'tech:g-changes-30', 'tech:g-barre', 'tech:g-bassist']) expect(got.has(id), id).toBe(true);
    for (const id of ['tech:g-vibrato', 'tech:g-caged', 'tech:g-changes-60', 'tech:g-jukebox']) expect(got.has(id), id).toBe(false);
    const st = Object.fromEntries(badgeStates({ today: 'x', technique: { cleanItems: clean } }).map((s) => [s.badge.id, s.check]));
    expect(st['tech:g-vibrato'].v).toBe(1);
    expect(st['tech:g-caged'].v).toBe(4);
    expect(st['tech:g-jukebox'].v).toBe(1);
    // the second vibrato width completes it; zero-tempo items never count
    expect(ids({ today: 'x', technique: { cleanItems: { ...clean, [G({ family: 'g-lead', kind: 'vibrato', key: 4, option: 1 })]: 60 } } }).has('tech:g-vibrato')).toBe(true);
    expect(ids({ today: 'x', technique: { cleanItems: { [G({ family: 'g-lead', kind: 'bend', key: 9, option: 1 })]: 0 } } }).has('tech:g-bend-tune')).toBe(false);
  });
});
