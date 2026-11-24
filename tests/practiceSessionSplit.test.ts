// SPEC-PRACTICE-SESSION §3.3 (the length shapes the session), §3.2 (the coach moves the shares by need) and §12 (a key,
// an exercise, an item or a family as the session's focus).
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { buildPath, type PathInput } from '../src/engine/path';
import { blockRange, earSharesByNeed, focusIdOf, parseFocus, reasonLine, reviewMinutes, sessionReason, SHAPE, suggestWorkout, targetFocusBlocks, techShareByNeed, total, warmMinutes, DAY_SHARES, SHARES, type Block, type FocusTarget, type SuggestInput } from '../src/engine/workout2';
import { closeness, slippingItems, weekAreaMinutes } from '../src/engine/sessionNeed';
import { emptyLedger, bookTime, bookItem } from '../src/engine/practiceTime';
import { newItem } from '../src/engine/drills/ladder';
import { families, specDrills } from '../src/engine/drills/plan';
import type { ItemState } from '../src/engine/drills/types';

const now = new Date('2026-11-24T12:00:00Z');
const DAY = '2026-11-24';
const pin: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 30, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now };
const view = buildPath(pin);
const inst = (t: number, extra: Partial<SuggestInput> = {}) => suggestWorkout({ total: t, goal: 'general', priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view, opened: 5, technique: true, course: 'keys', techTier: 2, day: DAY, ...extra });
const ear = (t: number, extra: Partial<SuggestInput> = {}) => suggestWorkout({ total: t, goal: 'general', priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view, opened: 5, course: 'ear', day: DAY, ...extra });
const kinds = (bs: Block[]) => bs.map((b) => b.target.kind);
const short = (b: Block) => b.target.kind === 'warmup' || b.target.kind === 'rubato' || b.target.kind === 'vocal' || (b.target.kind === 'game' && ['licks', 'encore', 'pieces', 'rep-review'].includes(b.target.game));
const pleasant = (b: Block) => b.target.kind === 'improv' || b.target.kind === 'game';
const LENGTHS = [5, 10, 20, 30, 45, 60, 90, 180];

describe('§3.3 the length shapes the session', () => {
  const cases: [string, (t: number, x?: Partial<SuggestInput>) => Block[], number][] = [
    ['instrument', inst, SHAPE.minInstrument],
    ['ear', ear, SHAPE.minEar],
  ];
  for (const [name, sugg, minB] of cases)
    for (const due of [0, 9])
      it(`${name}${due ? ' with reviews due' : ''}: blocks per length, minimum block, sums exactly`, () => {
        for (const T of LENGTHS) {
          const bs = sugg(T, { reviewsDue: due });
          const [lo, hi] = blockRange(T);
          expect(total(bs), `${name} total ${T}`).toBe(T);
          expect(bs.length, `${name} count ${T}: ${kinds(bs)}`).toBeGreaterThanOrEqual(lo);
          expect(bs.length, `${name} count ${T}: ${kinds(bs)}`).toBeLessThanOrEqual(hi);
          for (const b of bs) expect(b.minutes, `${name} ${T} ${b.target.kind}`).toBeGreaterThanOrEqual(short(b) ? 2 : minB);
          if (T >= SHAPE.endFrom) expect(pleasant(bs.at(-1)!), `${name} ${T} ends on ${bs.at(-1)!.target.kind}`).toBe(true);
          if (T >= SHAPE.longFrom) expect(bs.every((b) => b.minutes <= SHAPE.maxLong), `${name} ${T}: ${bs.map((b) => b.minutes)}`).toBe(true);
          // deterministic
          expect(sugg(T, { reviewsDue: due })).toEqual(bs);
        }
      });

  it('the table for an instrument course, length by length', () => {
    expect(kinds(inst(5))).toEqual(['keys']);
    expect(kinds(inst(10))).toEqual(['keys']);
    expect(kinds(inst(10, { reviewsDue: 3 }))).toEqual(['warmup', 'keys']);
    expect(inst(10, { reviewsDue: 3 })[0].minutes).toBe(2);
    // 5 minutes can't hold a review and a 4-minute block: the most needed block alone
    expect(kinds(inst(5, { reviewsDue: 3 }))).toEqual(['keys']);
    // 20: a short warm-up (2), the main block, a second area
    expect(kinds(inst(20))).toEqual(['rubato', 'keys', 'improv']);
    expect(inst(20)[0].minutes).toBe(2);
    // 30: warm-up 3 · (path) · technique · improvisation
    expect(kinds(inst(30))).toEqual(['rubato', 'path', 'keys', 'improv']);
    expect(inst(30)[0].minutes).toBe(3);
    expect(kinds(inst(30, { reviewsDue: 3 }))).toEqual(['rubato', 'warmup', 'keys', 'improv']);
    // 45: a second technique block
    expect(kinds(inst(45))).toEqual(['rubato', 'path', 'keys', 'keys', 'improv']);
    // 60: a tune and a game join, the improvisation still ends
    const s60 = inst(60);
    expect(kinds(s60)).toEqual(['rubato', 'path', 'keys', 'game', 'improv', 'improv']);
    expect(s60.at(-2)!.target).toEqual({ kind: 'improv', mode: 'repertoire' });
    expect(s60.at(-1)!.target).toMatchObject({ kind: 'improv', mode: 'improv' });
    expect(inst(90).length).toBeLessThanOrEqual(8);
    expect(inst(180).length).toBe(11);
  });

  it('the table for the ear course, length by length', () => {
    expect(kinds(ear(10))).toEqual(['strengthen']);
    expect(kinds(ear(10, { reviewsDue: 2 }))).toEqual(['warmup', 'strengthen']);
    expect(kinds(ear(20))).toEqual(['warmup', 'path', 'strengthen']);
    expect(kinds(ear(20, { singer: true }))).toEqual(['vocal', 'path', 'strengthen']);
    expect(kinds(ear(20, { reviewsDue: 5 }))).toEqual(['warmup', 'path', 'strengthen']);
    expect(kinds(ear(30))).toEqual(['warmup', 'path', 'strengthen', 'game']);
    expect(kinds(ear(45))).toEqual(['warmup', 'path', 'strengthen', 'strengthen', 'game']);
    // a new player: the path is the main block
    expect(kinds(ear(10, { opened: 0 }))).toEqual(['path']);
  });

  it('warm-up ~10 % from 20 minutes, the review 2 → 6 minutes by the reviews due', () => {
    expect([10, 15, 20, 30, 45, 60, 90, 180].map(warmMinutes)).toEqual([0, 0, 2, 3, 5, 6, 8, 8]);
    expect([1, 3, 4, 7, 10, 13, 40].map((n) => reviewMinutes(n, 60))).toEqual([2, 2, 3, 4, 5, 6, 6]);
    expect(reviewMinutes(40, 10)).toBe(2);
    expect(reviewMinutes(0, 60)).toBe(0);
    const few = inst(60, { reviewsDue: 1 }).find((b) => b.target.kind === 'warmup')!.minutes;
    const many = inst(60, { reviewsDue: 14 }).find((b) => b.target.kind === 'warmup')!.minutes;
    expect([few, many]).toEqual([2, 6]);
  });

  it('review add-ons join while the table has room, and beside the review from 30 minutes', () => {
    for (const T of LENGTHS) {
      const bs = inst(T, { licksDue: 2, piecesDue: 1 });
      const addOns = bs.filter((b) => b.target.kind === 'game' && (b.target.game === 'licks' || b.target.game === 'pieces')).length;
      expect(bs.length - (T >= SHAPE.endFrom ? addOns : 0), `${T}`).toBeLessThanOrEqual(blockRange(T)[1]);
      expect(total(bs)).toBe(T);
      if (T >= SHAPE.endFrom) expect(addOns, `${T}`).toBe(2);
      for (const b of bs) expect(b.minutes).toBeGreaterThanOrEqual(short(b) ? 2 : SHAPE.minInstrument);
    }
    expect(inst(20, { licksDue: 2 }).length).toBeLessThanOrEqual(3);
    expect(inst(90, { licksDue: 2 }).some((b) => b.target.kind === 'game' && b.target.game === 'licks')).toBe(true);
  });
});

describe('§3.2 the coach moves the shares by need', () => {
  it('neglect adds up to 10 points to the area short of its planned minutes', () => {
    const base = DAY_SHARES.tech;
    // 60 minutes of technique, none of improvisation: improvisation +10 → technique 60 %
    const r = techShareByNeed(base, { week: { tech: 60, improv: 0 } });
    expect(r.share).toBeCloseTo(base - 0.1, 5);
    expect(r.moves[0]).toMatchObject({ kind: 'neglect', area: 'improv', week: 0, planned: 18, points: 10 });
    // a third short or less: no move
    expect(techShareByNeed(base, { week: { tech: 50, improv: 15 } }).moves).toEqual([]);
    // too little measured: no move
    expect(techShareByNeed(base, { week: { tech: 10, improv: 0 } }).share).toBe(base);
  });
  it('the gap adds 5 to the area furthest from its target; with the tilt, at most ±15', () => {
    expect(techShareByNeed(0.7, { close: { tech: 0.5, improv: 0.8 } }).share).toBeCloseTo(0.75, 5);
    expect(techShareByNeed(0.7, { close: { tech: 0.8, improv: 0.78 } }).moves).toEqual([]);
    const all = techShareByNeed(0.7, { week: { tech: 60, improv: 0 }, close: { tech: 0.9, improv: 0.2 } }, 0.1);
    expect(all.share).toBeCloseTo(0.55, 5);
    expect(all.moves.map((m) => m.kind)).toEqual(['neglect', 'tilt', 'gap']);
  });
  it('the moves reach the suggestion', () => {
    const imp = (bs: Block[]) => bs.filter((b) => b.target.kind === 'improv').reduce((a, b) => a + b.minutes, 0);
    expect(imp(inst(30, { need: { week: { tech: 60, improv: 0 } } }))).toBeGreaterThan(imp(inst(30)));
    expect(imp(inst(30, { need: { close: { tech: 0.3, improv: 0.9 } } }))).toBeLessThanOrEqual(imp(inst(30)));
  });
  it('ear: review short of its share gains, review beyond it gives to strengthening', () => {
    const up = earSharesByNeed(SHARES, { week: { review: 0, work: 60 } }).shares;
    expect(up.review).toBeCloseTo(SHARES.review + 0.1, 5);
    expect(up.new + up.strengthen + up.review).toBeCloseTo(1, 5);
    const down = earSharesByNeed(SHARES, { week: { review: 60, work: 0 } }).shares;
    expect(down.strengthen).toBeGreaterThan(SHARES.strengthen);
    expect(down.review).toBeLessThan(SHARES.review);
  });
  it('slipping closed items take the warm-up; one reason line for the biggest move', () => {
    const s = inst(30, { need: { slipping: ['a', 'b'] } });
    expect(s[0].target).toEqual({ kind: 'rubato', items: ['a', 'b'] });
    expect(inst(15, { need: { slipping: ['a'] } })[0]).toMatchObject({ target: { kind: 'rubato', items: ['a'] }, minutes: 2 });
    const base: SuggestInput = { total: 30, goal: 'general', priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view, opened: 5, technique: true, course: 'keys', techTier: 2 };
    expect(sessionReason(base)).toBeNull();
    const r = sessionReason({ ...base, need: { week: { tech: 30, improv: 2 }, slipping: ['a'] } })!;
    expect(r).toMatchObject({ kind: 'neglect', area: 'improv' });
    expect(reasonLine(r)).toEqual({ en: 'More improvisation today: 2 min this week out of 10 planned', he: 'יותר אימפרוביזציה היום: 2 דק׳ השבוע מתוך 10 שתוכננו' });
    expect(reasonLine(r, 'repertoire').en).toContain('repertoire');
    expect(sessionReason({ ...base, reviewsDue: 9 })).toEqual({ kind: 'due', n: 9 });
    expect(sessionReason({ ...base, need: { slipping: ['a', 'b'] } })).toEqual({ kind: 'slipping', n: 2 });
    expect(reasonLine({ kind: 'slipping', n: 1 }).he).toBe('החימום חוזר לפריט סגור שהחליק השבוע');
  });
  it('the signals come from the ledger, the items and the improvisation bests', () => {
    let l = emptyLedger('2026-11-01');
    l = bookTime(l, '2026-11-23', { course: 'keys', kind: 'technique', q: 'edge' }, 40 * 60000);
    l = bookTime(l, '2026-11-22', { course: 'keys', kind: 'improv', q: 'run' }, 5 * 60000);
    l = bookTime(l, '2026-11-10', { course: 'keys', kind: 'improv', q: 'run' }, 50 * 60000);
    l = bookTime(l, '2026-11-23', { course: 'guitar', kind: 'improv', q: 'run' }, 50 * 60000);
    expect(weekAreaMinutes(l, DAY, 'keys', true)).toEqual({ tech: 40, improv: 5 });
    l = bookTime(l, '2026-11-23', { course: 'ear', kind: 'lesson', q: 'review' }, 6 * 60000);
    l = bookTime(l, '2026-11-23', { course: 'ear', kind: 'lesson', q: 'edge' }, 24 * 60000);
    expect(weekAreaMinutes(l, DAY, 'ear', false)).toEqual({ review: 6, work: 24 });
    // a closed item missed twice this week is slipping
    const d = specDrills(families('piano')[0].levels[0], 0, 'fifths-up')[0];
    const closed: ItemState = { ...newItem(d), takes: 8, cleanBpm: 100, targetBpm: 100, last: '2026-11-23', passLog: [{ at: '2026-11-10', bpm: 100 }, { at: '2026-11-11', bpm: 100 }, { at: '2026-11-11', bpm: 100 }] };
    const items = { [d.itemId]: closed };
    expect(slippingItems(items, l, DAY)).toEqual([]);
    l = bookItem(l, `d:${d.itemId}`, '2026-11-23', { n: 3, c: 1, of: 3 });
    expect(slippingItems(items, l, DAY)).toEqual([d.itemId]);
    expect(closeness(items, DAY, { levels: [{ id: 'a' }, { id: 'b' }], best: { a: 0.95, b: 0.4 } })).toEqual({ tech: 1, improv: 0.4 });
    expect(closeness({}, DAY)).toEqual({});
  });
});

describe('§12 a key, an exercise, an item, a family', () => {
  const targets: FocusTarget[] = [
    { kind: 'key', root: 3, group: 'major' },
    { kind: 'rung', rung: 'aeolian:k-sharm-3', group: 'minor' },
    { kind: 'item', id: 'scales:x:3:RL' },
    { kind: 'family', family: 'grooves' },
    { kind: 'mode', mode: 'repertoire' },
  ];
  it('the focus string goes both ways; areas and the plan are not targets', () => {
    for (const t of targets) expect(parseFocus(focusIdOf(t))).toEqual(t);
    expect(parseFocus('plan')).toBeNull();
    expect(parseFocus('instrument')).toBeNull();
    expect(parseFocus('key:12:major')).toBeNull();
    expect(parseFocus('rung:dorian:x')).toBeNull();
    expect(parseFocus('mode:jazz')).toBeNull();
  });
  it('the length still shapes a focus: the target alone at 10, the improvisation in the key from 15, ending it from 30', () => {
    const key = targets[0];
    expect(kinds(targetFocusBlocks(key, 10, { course: 'keys' }))).toEqual(['key']);
    const t20 = targetFocusBlocks(key, 20, { course: 'keys' });
    expect(kinds(t20)).toEqual(['key', 'improv']);
    expect(t20[1].target).toMatchObject({ kind: 'improv', mode: 'improv', root: 3, group: 'major' });
    for (const T of LENGTHS) {
      const bs = targetFocusBlocks(key, T, { course: 'keys' });
      expect(total(bs)).toBe(T);
      expect(bs.every((b) => b.minutes >= SHAPE.minInstrument)).toBe(true);
      const [lo, hi] = blockRange(T);
      if (T > 10) expect(bs.length).toBeGreaterThanOrEqual(2);
      void lo;
      expect(bs.length).toBeLessThanOrEqual(hi);
      if (T >= SHAPE.endFrom) expect(bs.at(-1)!.target.kind).toBe('improv');
      if (T >= SHAPE.longFrom) expect(bs.every((b) => b.minutes <= SHAPE.maxLong)).toBe(true);
    }
    // a rung keeps the key of the week for its improvisation; the drums end on grooves
    expect(targetFocusBlocks(targets[1], 30, { course: 'keys' }).at(-1)!.target).toEqual({ kind: 'improv', mode: 'improv' });
    expect(targetFocusBlocks(targets[3], 30, { course: 'drums' }).at(-1)!.target).toEqual({ kind: 'improv', mode: 'grooves' });
    // Improvise / Repertoire / Licks: the share as the whole session
    expect(targetFocusBlocks({ kind: 'mode', mode: 'licks' }, 10)).toEqual([{ id: 'game-1', target: { kind: 'game', game: 'licks' }, minutes: 10 }]);
    expect(kinds(targetFocusBlocks(key, 30, { course: 'keys' }))).toEqual(['key', 'improv']);
    const rep = targetFocusBlocks(targets[4], 90);
    expect(total(rep)).toBe(90);
    expect(rep.every((b) => b.minutes <= SHAPE.maxLong && b.target.kind === 'improv')).toBe(true);
  });
});
