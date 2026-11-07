import { describe, expect, it } from 'vitest';
import type { RatingEvent, Ratings } from '../src/engine/rating';
import {
  areaBoard,
  areaEvidence,
  areaTarget,
  atYourLevel,
  challengeFor,
  challengeProgress,
  completedChallenges,
  CHALLENGE_ORDER,
  divFloor,
  divisionFor,
  evidenceCap,
  MASTER_DIV,
  mergeRanks,
  rankLabel,
  romanOfDiv,
  stepRank,
  techniqueLevel,
  techniqueTarget,
  tierOfDiv,
  updateRanks,
  type BoardPlayer,
} from '../src/engine/ranks';
import type { StatsDays } from '../src/engine/stats';

const sr = (r: number, n: number) => ({ r, n, correct: Math.round(n * 0.7), recent: [] });
/** Rhythm & time with three measured skills (n = 10 each → 30 answers). */
const timeRatings = (r: number, n = 10): Ratings => ({ timing: sr(r, n), tempo: sr(r, n), meter: sr(r, n) });
const D = (day: string) => `${day}T12:00:00.000Z`;

describe('division mapping', () => {
  it('is monotonic over the whole band and hits every division', () => {
    let prev = -1;
    const seen = new Set<number>();
    for (let L = 600; L <= 1600; L += 5) {
      const d = divisionFor(L);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
      seen.add(d);
    }
    expect(seen.size).toBe(16);
  });
  it('documented anchors', () => {
    expect(divisionFor(600)).toBe(0);
    expect(rankLabel(divisionFor(600), 'en')).toBe('Bronze III');
    expect(rankLabel(divisionFor(900), 'en')).toBe('Silver I');
    expect(rankLabel(divisionFor(1440), 'en')).toBe('Diamond I');
    expect(divisionFor(1549)).toBe(14);
    expect(divisionFor(1550)).toBe(MASTER_DIV);
    expect(rankLabel(MASTER_DIV, 'he')).toBe('מאסטר');
    expect(rankLabel(null, 'en')).toBe('Unranked');
    expect(tierOfDiv(7)).toBe('gold');
    expect(tierOfDiv(5)).toBe('silver');
    expect(romanOfDiv(9)).toBe('III');
    for (let d = 0; d < 15; d++) expect(divisionFor(divFloor(d))).toBe(d);
  });
});

describe('evidence', () => {
  it('needs 20 answers and enough measured skills; higher tiers need more', () => {
    expect(evidenceCap(19, 3, 3)).toBe(-1);
    expect(evidenceCap(20, 2, 3)).toBe(-1);
    expect(evidenceCap(20, 3, 3)).toBe(5);
    expect(evidenceCap(50, 3, 3)).toBe(8);
    expect(evidenceCap(300, 3, 3)).toBe(MASTER_DIV);
  });
  it('a strong but thin area is capped; nothing measured is unranked', () => {
    expect(areaTarget({}, [], 'time')).toBeNull();
    expect(areaTarget({ timing: sr(1500, 30) }, [], 'time')).toBeNull(); // one measured skill of 3 needed
    expect(areaTarget(timeRatings(1500, 10), [], 'time')).toBe(5); // 30 answers → max Silver I
    expect(areaTarget(timeRatings(1500, 40), [], 'time')).toBe(11); // 120 answers → max Platinum I
    expect(areaTarget(timeRatings(700, 40), [], 'time')).toBe(1);
  });
  it('placement credit does not count as answers', () => {
    const ev: RatingEvent[] = [{ id: 'p', skill: 'timing', difficulty: 1000, correct: true, set: 1000, at: D('2026-11-01') }];
    expect(areaEvidence(timeRatings(1000, 8), ev, 'time').answers).toBe(24 - 6);
    expect(areaEvidence(timeRatings(1000, 8), [], 'time').answers).toBe(24);
  });
  it('small areas need fewer measured skills', () => {
    expect(areaEvidence({}, [], 'instrument').needMeasured).toBe(1);
    expect(areaEvidence({}, [], 'pitch').needMeasured).toBe(3);
  });
});

describe('no demotion below a division held 7 days', () => {
  it('drops freely within 7 days, never below a held division', () => {
    let s = stepRank(undefined, 6, D('2026-11-01'))!;
    expect(s).toMatchObject({ div: 6, best: 6 });
    s = stepRank(s, 3, D('2026-11-03'))!; // held 2 days → may drop
    expect(s.div).toBe(3);
    s = stepRank(s, 7, D('2026-11-04'))!;
    expect(s).toMatchObject({ div: 7, best: 7, since: D('2026-11-04') });
    s = stepRank(s, 7, D('2026-11-12'))!; // held 8 days → locked
    s = stepRank(s, 2, D('2026-11-13'))!;
    expect(s.div).toBe(7);
    expect(s.floor).toBe(7);
    s = stepRank(s, 9, D('2026-11-14'))!;
    s = stepRank(s, 1, D('2026-11-15'))!; // 9 not held yet → back to the floor 7, not 1
    expect(s.div).toBe(7);
    expect(s.best).toBe(9);
  });
  it('updateRanks reports changes and keeps ranks when evidence is missing', () => {
    const a = updateRanks(undefined, timeRatings(1000, 10), [], D('2026-11-01'));
    expect(a.ranks.time?.div).toBe(5);
    expect(a.changes).toEqual([{ area: 'time', from: null, to: 5, kind: 'new', newTier: true }]);
    const b = updateRanks(a.ranks, {}, [], D('2026-11-20'));
    expect(b.ranks.time?.div).toBe(5);
    expect(b.changes).toEqual([]);
  });
  it('mergeRanks keeps the higher division and best', () => {
    const m = mergeRanks({ time: { div: 3, since: 'a', best: 6, floor: 2 } }, { time: { div: 5, since: 'b', best: 5 }, pitch: { div: 1, since: 'c', best: 1 } });
    expect(m.time).toEqual({ div: 5, since: 'b', best: 6, floor: 2 });
    expect(m.pitch?.div).toBe(1);
  });
});

describe('technique rank', () => {
  it('mean of the 3 best families, Master at 7', () => {
    expect(techniqueLevel({ scales: 6, arpeggios: 3 })).toBe(3);
    expect(techniqueTarget({ levels: { scales: 2 }, takes: 10 })).toBeNull();
    expect(techniqueTarget({ levels: { scales: 3, arpeggios: 3, fingers: 3 }, takes: 400 })).toBe(6);
    expect(techniqueTarget({ levels: { scales: 7, arpeggios: 7, fingers: 7 }, takes: 400 })).toBe(MASTER_DIV);
    expect(techniqueTarget({ levels: { scales: 7, arpeggios: 7, fingers: 7 }, takes: 30 })).toBe(5);
    const r = updateRanks(undefined, {}, [], D('2026-11-01'), { levels: { scales: 4 }, takes: 60 });
    expect(r.ranks.technique?.div).toBe(2);
  });
});

describe('area leaderboard', () => {
  const me: BoardPlayer = { id: 'me', name: 'Me', levels: { time: 1000 } };
  const friends: BoardPlayer[] = [
    { id: 'a', name: 'Ann', levels: { time: 1200 } },
    { id: 'b', name: 'Bob', levels: { time: 1000 } },
    { id: 'c', name: 'Cy', share: 'nothing', levels: { time: 1500 } },
    { id: 'd', name: 'Dee', levels: { pitch: 900 } },
    { id: 'me', name: 'Me again', levels: { time: 1 } },
  ];
  it('ranks with shared places, hides private players, counts unranked', () => {
    const b = areaBoard(me, friends, 'time');
    expect(b.rows.map((r) => [r.id, r.place])).toEqual([
      ['a', 1],
      ['b', 2],
      ['me', 2],
    ]);
    expect(b.hidden).toBe(1);
    expect(b.unranked).toBe(1);
    expect(b.myPlace).toBe(2);
  });
  it('players at your level are within ±100', () => {
    const b = atYourLevel(me, friends, 'time');
    expect(b.rows.map((r) => r.id)).toEqual(['b', 'me']);
  });
});

describe('monthly area challenge', () => {
  it('rotates deterministically through all 7 areas', () => {
    const months = Array.from({ length: 14 }, (_, i) => `${2026 + Math.floor((10 + i) / 12)}-${String(((10 + i) % 12) + 1).padStart(2, '0')}`);
    const areas = months.map((m) => challengeFor(m).area);
    expect(new Set(areas.slice(0, 7)).size).toBe(7);
    expect(areas.slice(7)).toEqual(areas.slice(0, 7));
    expect(challengeFor('2026-11')).toEqual(challengeFor('2026-11'));
    expect(CHALLENGE_ORDER).toHaveLength(7);
  });
  it('progress from statsDays byArea (right answers this month only)', () => {
    const ch = challengeFor('2026-11');
    const days: StatsDays = {
      '2026-11-02': { items: 200, correct: 180, ms: 0, xp: 0, sessions: 3, byArea: { [ch.area]: [200, 180] } },
      '2026-11-20': { items: 10, correct: 10, ms: 0, xp: 0, sessions: 1, byArea: { [ch.area]: [10, 10] } },
      '2026-10-30': { items: 900, correct: 900, ms: 0, xp: 0, sessions: 9, byArea: { [ch.area]: [900, 900] } },
    };
    const p = challengeProgress(ch, days);
    expect(p.value).toBe(190);
    expect(p.tier).toBe(ch.tiers.filter((t) => t <= 190).length);
    expect(completedChallenges(days).every((c) => c.tier > 0)).toBe(true);
  });
});
