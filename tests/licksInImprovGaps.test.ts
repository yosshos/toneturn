// SPEC-LICKS-IN-IMPROV gaps (2026-11-23 audit): the detection's acceptance tests (the first note dropped, displaced by
// a beat), the tier's timing tolerance, the approach licks as cells, the "three different licks" card, the variety
// bonus and "new key" = not closed in that key, "a lick in the chorus" at level 2, the shared take boundary, and the
// skill map's "vocabulary in use".
import { describe, expect, it } from 'vitest';
import { findCells, findLick, lickTimingTol, LICK_TIMING_TOL, type ChartSpan, type ImpNote } from '../src/engine/lickDetect';
import { LICKS, lickPitches } from '../src/engine/licks';
import { APPROACH_CELLS, takeUses, usesXp, vocabInUse, vocabPool, todaysLick, type LickUse } from '../src/engine/vocab';
import { cardKept, checkCard, RULE_CARDS } from '../src/engine/ruleCards';
import { CHALLENGES, VOCAB_RULES } from '../src/engine/improvRules';
import type { ItemState } from '../src/engine/drills/types';

const lick = LICKS.find((l) => l.id === 'maj-enclose')!; // ii–V–I, 3 bars
// the lick's own chords in C: Dm7 | G7 | Cmaj7 (two bars), then a bar of C to spare
const spans: ChartSpan[] = [
  { root: 2, q: 'm7', at: 0, beats: 4 },
  { root: 7, q: '7', at: 4, beats: 4 },
  { root: 0, q: 'maj7', at: 8, beats: 12 },
];
const play = (key: number, shift = 0, drop = 0): ImpNote[] => lickPitches(lick, key).map((p, i) => ({ midi: p, beat: shift + lick.notes[i][1] })).slice(drop);
const over = (key: number): ChartSpan[] => spans.map((s) => ({ ...s, root: (s.root + key) % 12 }));

describe('detection: the spec\'s acceptance tests (§7)', () => {
  it('the exact lick is exact', () => {
    const h = findLick(lick, play(0), spans).filter((x) => x.overChord);
    expect(h[0]).toMatchObject({ kind: 'exact', transpose: 0 });
  });
  it('the first note dropped is found, as varied (not exact)', () => {
    const h = findLick(lick, play(0, 0, 1), spans).filter((x) => x.overChord);
    expect(h).toHaveLength(1);
    expect(h[0].kind).toBe('varied');
  });
  it('the first two notes dropped are still found (varied)', () => {
    expect(findLick(lick, play(0, 0, 2), spans).filter((x) => x.overChord)[0]?.kind).toBe('varied');
  });
  it('displaced by a beat: found, as varied', () => {
    const h = findLick(lick, play(0, 1), spans).filter((x) => x.overChord);
    expect(h[0]?.kind).toBe('varied');
  });
  it('displaced by a beat AND the first note dropped, in another key: varied, over the right chord', () => {
    const h = findLick(lick, play(5, 1, 1), over(5)).filter((x) => x.overChord);
    expect(h[0]).toMatchObject({ kind: 'varied', transpose: 5 });
  });
  it('the same lick over the wrong chord does not count', () => {
    expect(findLick(lick, play(5), spans).filter((x) => x.overChord)).toEqual([]);
  });
  it('a whole bar later is still exact (its place in the bar is kept)', () => {
    const sp = [{ root: 0, q: 'maj7', at: 0, beats: 4 }, ...spans.map((s) => ({ ...s, at: s.at + 4 }))];
    expect(findLick(lick, play(0, 4), sp).filter((x) => x.overChord)[0]?.kind).toBe('exact');
  });
  it('one hit per occurrence, with the beat of its last note (for the replay)', () => {
    const h = findLick(lick, play(0), spans);
    expect(h).toHaveLength(1);
    expect(h[0].end).toBe(lick.notes[lick.notes.length - 1][1]);
  });
});

describe('clean = within the tier\'s timing tolerance (§3)', () => {
  it('T1 is looser than T2 (0.2 beat), T3 tighter', () => {
    expect(lickTimingTol(2)).toBeCloseTo(LICK_TIMING_TOL, 3);
    expect(lickTimingTol(1)).toBeGreaterThan(lickTimingTol(2));
    expect(lickTimingTol(3)).toBeLessThan(lickTimingTol(2));
  });
  it('a lick played a little loose is clean at T1 but not at T3', () => {
    // every other note ±0.18 beat off its place
    const loose = play(0).map((n, i) => ({ ...n, beat: n.beat + (i % 2 ? 0.18 : -0.18) }));
    const at = (tier: number) => findLick(lick, loose, spans, { tol: lickTimingTol(tier) }).filter((x) => x.overChord)[0];
    expect(at(1)?.tight).toBe(true);
    expect(at(3)?.tight).toBe(false);
  });
});

describe('the approach licks as cells (§1, §3)', () => {
  const g7: ChartSpan[] = [{ root: 7, q: '7', at: 0, beats: 4 }, { root: 0, q: 'maj7', at: 4, beats: 4 }];
  it('lick 1: a half step below into a chord tone', () => {
    // C♯ → D (the 5th of G7) — then a non-chord-tone landing that does not count
    const h = findCells(1, [{ beat: 0, midi: 61 }, { beat: 0.5, midi: 62 }, { beat: 1.5, midi: 68 }, { beat: 2, midi: 69 }], g7);
    expect(h).toHaveLength(1);
    expect(h[0].target).toMatchObject({ root: 7, deg: 7 });
  });
  it('lick 2 (enclosure, both orders) and lick 3 (the long enclosure, and its turn-over); the longest cell wins', () => {
    // B (3rd of G7): A♯ C B
    expect(findCells(2, [{ beat: 0, midi: 70 }, { beat: 0.5, midi: 72 }, { beat: 1, midi: 71 }], g7)).toHaveLength(1);
    expect(findCells(2, [{ beat: 0, midi: 72 }, { beat: 0.5, midi: 70 }, { beat: 1, midi: 71 }], g7)).toHaveLength(1);
    // G (root of G7): F♯ A A♭ F♯ G
    const l3 = [66, 69, 68, 66, 67].map((m, i) => ({ beat: i * 0.5, midi: m }));
    expect(findCells(3, l3, g7)).toHaveLength(1);
    expect(findCells(1, l3, g7)).toHaveLength(0);
    expect(findCells(2, l3, g7)).toHaveLength(0);
    // E over Cmaj7 (only a half step above): F D E♭ E
    expect(findCells(3, [65, 62, 63, 64].map((m, i) => ({ beat: 4 + i * 0.5, midi: m })), g7)).toHaveLength(1);
  });
  it('cells enter the vocabulary after any take of their k-keylick items, never as today\'s lick', () => {
    const items = { a: { itemId: 'k-keylick:kl-2ba-t-up:0:R', family: 'k-keylick', key: 0, takes: 2 } as unknown as ItemState };
    const pool = vocabPool(items, undefined);
    expect(pool.map((l) => l.id)).toEqual(['ap-2']);
    expect(todaysLick(pool, undefined, items)).toBeNull();
  });
  it('findLick dispatches a cell to the pattern search', () => {
    const ap1 = APPROACH_CELLS[0];
    expect(findLick(ap1, [{ beat: 0, midi: 61 }, { beat: 0.5, midi: 62 }], [{ root: 7, q: '7', at: 0, beats: 4 }])).toHaveLength(1);
  });
});

describe('XP: the variety bonus and "new key" = not closed there (§4)', () => {
  const u = (id: string, key = 0, kind: LickUse['kind'] = 'exact'): LickUse => ({ id, key, kind, at: '', session: 's' });
  it('the same lick 4 times: full, half, 0, 0', () => {
    expect(usesXp([u('a')], { a: [0] })).toBe(6);
    expect(usesXp([u('a'), u('a'), u('a'), u('a')], { a: [0] })).toBe(9);
  });
  it('a key where the lick is not closed earns more, even if it was used there before', () => {
    expect(usesXp([u('a', 5)], { a: [0] })).toBe(9);
    expect(usesXp([u('a', 0)], { a: [0] })).toBe(6);
  });
  it('distinct licks earn a variety bonus (+2 each after the first, capped)', () => {
    const closed = { a: [0], b: [0], c: [0] };
    expect(usesXp([u('a'), u('b'), u('c')], closed)).toBe(18 + 4);
  });
});

describe('the cards (§2)', () => {
  it('"a lick in the chorus" is level 2; "three different licks" exists and counts distinct licks', () => {
    expect(RULE_CARDS['use-lick'].level).toBe(2);
    expect(CHALLENGES.find((c) => c.id === 'lick-in')?.level).toBe(2);
    expect(VOCAB_RULES).toContain('lick-three');
    expect(CHALLENGES.map((c) => c.id)).toContain('lick-three');
    const two = LICKS.filter((l) => ['maj-arp', 'maj-bebop', 'maj-enclose'].includes(l.id));
    expect(two).toHaveLength(3);
    const notesOf = (l: (typeof two)[number], at: number) => lickPitches(l, 0).map((p, i) => ({ beat: at + l.notes[i][1], dur: 0.4, midi: p }));
    const sp = (at: number) => spans.map((s) => ({ root: s.root, iv: s.q === 'm7' ? [0, 3, 7, 10] : s.q === '7' ? [0, 4, 7, 10] : [0, 4, 7, 11], at: s.at + at, beats: s.q === 'maj7' ? 8 : 4 }));
    const ctx = (n: number) => ({ notes: two.slice(0, n).flatMap((l, k) => notesOf(l, k * 16)), spans: [0, 16, 32].flatMap(sp), meter: 4, bpm: 120, opt: { licks: two } });
    const c3 = checkCard('lick-three', ctx(3));
    expect(c3).toMatchObject({ ok: 3, total: 3 });
    expect(cardKept('lick-three', c3)).toBe(true);
    expect(cardKept('lick-three', checkCard('lick-three', ctx(2)))).toBe(false);
  });
});

describe('the shared take boundary (§3–4) and "vocabulary in use"', () => {
  it('takeUses: the uses of a take with their chord, the new-key mark and the XP', () => {
    const chart = spans.map((s) => ({ root: s.root, iv: s.q === 'm7' ? [0, 3, 7, 10] : s.q === '7' ? [0, 4, 7, 10] : [0, 4, 7, 11], at: s.at, beats: s.beats }));
    const r = takeUses({ pool: [lick], closed: { [lick.id]: [5] }, notes: play(0), spans: chart, session: 's' });
    expect(r.uses).toHaveLength(1);
    expect(r.uses[0]).toMatchObject({ id: lick.id, key: 0, fresh: true, chord: 'Dm7' });
    expect(r.xp).toBe(9);
    expect(takeUses({ pool: [], notes: play(0), spans: chart, session: 's' }).uses).toEqual([]);
  });
  it('vocabInUse: licks in my language ÷ licks learned (closed in a key)', () => {
    const st = (id: string): ItemState => ({ itemId: id, family: 'licks', key: 0, takes: 4, cleanBpm: 100, targetBpm: 100, history: [], passLog: ['2026-11-19', '2026-11-20', '2026-11-20'].map((at) => ({ at, bpm: 100 })) }) as unknown as ItemState;
    const a = LICKS[0].id, b = LICKS[1].id;
    const items = { x: st(`lick:${a}:piano:0`), y: st(`lick:${b}:piano:0`) };
    expect(vocabInUse({}, undefined)).toBeNull();
    const uses: LickUse[] = [0, 1, 2].map((i) => ({ id: a, key: i % 2 ? 7 : 0, kind: 'exact', at: '', session: `s${i}` }));
    expect(vocabInUse(items, { uses })).toMatchObject({ learned: 2, inLanguage: 1, share: 0.5 });
  });
});
