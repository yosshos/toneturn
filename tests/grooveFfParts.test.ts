// Groove level test ff (owner 2026-11-12): two passing runs in two DIFFERENT parts clear it; Flight ff stays at 30 gates.
import { describe, expect, it } from 'vitest';
import { afterRun, mergeGameTiers, tierDef } from '../src/engine/gameTiers';
import { applyGameRun, emptyProgress } from '../src/storage/progress';

const need = { needParts: 2 };

describe('Groove ff needs two different parts', () => {
  it('two passes in the same part do not clear; a pass in a second part does', () => {
    let s = afterRun(undefined, 'ff', true, 90, undefined, { part: 'slow', ...need });
    s = afterRun(s.state, 'ff', true, 92, undefined, { part: 'slow', ...need });
    expect(s.newlyCleared).toBeNull();
    s = afterRun(s.state, 'ff', true, 88, undefined, { part: 'odd', ...need });
    expect(s.newlyCleared).toBe('ff');
    expect(s.state.parts?.ff).toEqual(['slow', 'odd']);
  });
  it('a failed run in a part does not count that part', () => {
    let s = afterRun(undefined, 'ff', true, 90, undefined, { part: 'slow', ...need });
    s = afterRun(s.state, 'ff', false, 40, undefined, { part: 'swing', ...need });
    expect(s.state.parts?.ff).toEqual(['slow']);
    s = afterRun(s.state, 'ff', true, 90, undefined, { part: 'slow', ...need });
    expect(s.newlyCleared).toBeNull();
  });
  it('other tiers and games keep the 2-of-3 rule', () => {
    let s = afterRun(undefined, 'f', true, 90);
    s = afterRun(s.state, 'f', true, 90);
    expect(s.newlyCleared).toBe('f');
    expect(s.state.parts).toBeUndefined();
  });
  it('the tier table asks for two parts on Groove ff only, and Flight ff stays at 30 gates', () => {
    expect(tierDef('groove', 'ff')?.distinctParts).toBe(2);
    expect(tierDef('groove', 'f')?.distinctParts).toBeUndefined();
    expect(tierDef('flight', 'ff')?.target).toBe(30);
  });
  it('through applyGameRun: the run detail part is used', () => {
    let p = emptyProgress();
    const run = (id: string, part: string) => (p = applyGameRun(p, { game: 'groove', tier: 'ff', score: 90, detail: { tier: 'ff', accuracy: 90, part }, runId: id }).progress);
    run('a', 'pocket');
    run('b', 'pocket');
    expect(p.gameTiers?.groove?.cleared ?? null).toBeNull();
    run('c', 'swing');
    expect(p.gameTiers?.groove?.cleared).toBe('ff');
  });
  it('sync merges the parts of both devices', () => {
    const a = { groove: { cleared: null, recent: { ff: [1 as const] }, best: {}, runs: 1, parts: { ff: ['slow'] } } };
    const b = { groove: { cleared: null, recent: { ff: [1 as const] }, best: {}, runs: 1, parts: { ff: ['odd'] } } };
    expect(mergeGameTiers(a, b)?.groove.parts?.ff?.sort()).toEqual(['odd', 'slow']);
  });
});
