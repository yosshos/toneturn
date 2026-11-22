import { describe, expect, it } from 'vitest';
import { bookUses, closedKeys, findUses, inMyLanguage, lickPool, usesXp, type LickUse } from '../src/engine/vocab';
import { LICKS, lickPitches } from '../src/engine/licks';
import type { ItemState } from '../src/engine/drills/types';

const lick = LICKS.find((l) => l.id === 'dom-arp9')!; // V–I: up to the 9th, down to the 3rd
const st = (id: string, takes: number, closed = false): ItemState =>
  ({ itemId: id, family: 'licks', key: Number(id.split(':').pop()), takes, cleanBpm: 100, targetBpm: 100, history: [], passLog: closed ? ['2026-11-19', '2026-11-20', '2026-11-20'].map((at) => ({ at, bpm: 100 })) : [] }) as unknown as ItemState;

describe('the vocabulary pool and uses (SPEC-LICKS-IN-IMPROV, owner 2026-11-22)', () => {
  it('a lick enters the pool after any take; closed keys by the one rule', () => {
    expect(lickPool({}, undefined)).toHaveLength(0);
    const items = { a: st(`lick:${lick.id}:piano:0`, 1), b: st(`lick:${lick.id}:piano:5`, 4, true) };
    expect(lickPool(items, undefined).map((l) => l.id)).toEqual([lick.id]);
    expect(closedKeys(items, lick.id)).toEqual([5]);
  });
  it('finds a clean use over the right chord, in another key; also over the tritone sub', () => {
    // the lick in F (transpose +5) over C7 → F
    const notes = lick.notes.map(([p, b]) => ({ midi: p + 60 + 5, beat: b }));
    const chart = [{ root: 0, iv: [0, 4, 7, 10], at: 0, beats: 4 }, { root: 5, iv: [0, 4, 7, 11], at: 4, beats: 4 }];
    const uses = findUses([lick], notes, chart, 's1', '2026-11-22');
    expect(uses.length).toBeGreaterThan(0);
    expect(uses[0].key).toBe(5);
    // the same notes over G♭7 (the tritone sub of C7) → F
    const sub = [{ root: 6, iv: [0, 4, 7, 10], at: 0, beats: 4 }, { root: 5, iv: [0, 4, 7, 11], at: 4, beats: 4 }];
    expect(findUses([lick], notes, sub, 's1', '2026-11-22')[0]?.viaSub).toBe(true);
    void lickPitches;
  });
  it('XP: full, half, then nothing for the same lick in a take; a new key and a variation earn more', () => {
    const u = (key: number, kind: LickUse['kind'] = 'exact'): LickUse => ({ id: 'x', key, kind, at: '', session: 's' });
    expect(usesXp([u(0), u(0), u(0)], [{ ...u(0) }])).toBe(6 + 3);
    expect(usesXp([u(2)], [{ ...u(0) }])).toBe(9);
    expect(usesXp([u(0, 'varied')], [{ ...u(0) }])).toBe(8);
  });
  it('"in my language" = 3 sessions and 2 keys; a use is a review only once the lick is closed in a key', () => {
    const log: LickUse[] = [{ id: 'x', key: 0, kind: 'exact', at: '', session: 'a' }, { id: 'x', key: 0, kind: 'exact', at: '', session: 'b' }, { id: 'x', key: 7, kind: 'exact', at: '', session: 'c' }];
    expect(inMyLanguage(log.slice(0, 2), 'x')).toBe(false);
    expect(inMyLanguage(log, 'x')).toBe(true);
    let reviewed: string[] = [];
    const rev = (b: object, id: string) => ((reviewed = [...reviewed, id]), b);
    bookUses(undefined, [{ id: lick.id, key: 0, kind: 'exact', at: '', session: 's' }], { a: st(`lick:${lick.id}:piano:0`, 1) }, rev);
    expect(reviewed).toEqual([]);
    const b = bookUses(undefined, [{ id: lick.id, key: 0, kind: 'exact', at: '', session: 's' }], { a: st(`lick:${lick.id}:piano:5`, 4, true) }, rev);
    expect(reviewed).toEqual([lick.id]);
    expect(b.uses).toHaveLength(1);
  });
});
