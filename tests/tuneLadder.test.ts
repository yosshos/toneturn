// One tune, step by step (AUDIT-DEPTH-3 C4): the gated ladder per head on keys, guitar and bass.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { generateGuitar } from '../src/engine/drills/guitar';
import { SERVED } from '../src/engine/drills/headDrills';
import { HEADS } from '../src/content/heads';
import { TUNE_LADDERS, ladderDone, stepSpec, tuneLadderStatus, type LadderInst } from '../src/engine/tuneLadder';
import type { ItemState } from '../src/engine/drills/types';

const state = (itemId: string, family: string, clean: number): ItemState => ({ itemId, family, key: Number(itemId.split(':')[2]), hands: 'R', cleanBpm: clean, goalBpm: 60, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 1 }) as unknown as ItemState;

describe('the tune ladders', () => {
  it('every step of every instrument generates for every served head (the home key)', () => {
    for (const inst of ['piano', 'guitar', 'bass'] as LadderInst[])
      for (const i of SERVED)
        for (const st of TUNE_LADDERS[inst]) {
          const s = stepSpec(st, inst, i, HEADS[i].home.key);
          const d = inst === 'piano' ? generate(s) : generateGuitar(s);
          expect(d.notes.length, `${inst} ${HEADS[i].id} ${st.kind}`).toBeGreaterThan(0);
          expect(d.itemId).toContain(`op${i * 16}`);
        }
  });
  it('gating: only the first step is open on a fresh tune; a clean take opens the next; the 12-key step needs all twelve', () => {
    const i = SERVED[1];
    const fresh = tuneLadderStatus({}, 'piano', i);
    expect(fresh.map((x) => x.open)).toEqual([true, ...fresh.slice(1).map(() => false)]);
    expect(ladderDone(fresh)).toBe(0);
    const id = (kind: string, fam: string, k: number) => generate(stepSpec({ family: fam as never, kind, name: { en: '', he: '' } }, 'piano', i, k)).itemId;
    const items: ItemState[] = [state(id('tn-root', 'k-tune', 5), 'k-tune', 70)];
    let st = tuneLadderStatus(items, 'piano', i);
    expect(st[0].done).toBe(true);
    expect(st[1].open).toBe(true);
    expect(st[2].open).toBe(false);
    // another head's clean take does not count here
    const other = SERVED[0];
    expect(tuneLadderStatus(items, 'piano', other)[0].done).toBe(false);
    // all steps before the last, then 11 keys of the rootless comp: the last step open, not done; the 12th key: done
    const all = TUNE_LADDERS.piano.slice(0, -1).map((s) => state(id(s.kind, s.family, 0), s.family, 70));
    const k11 = Array.from({ length: 11 }, (_, k) => state(id('tn-rootless', 'k-tune', k), 'k-tune', 70));
    st = tuneLadderStatus([...all, ...k11], 'piano', i);
    expect(st[st.length - 1].open).toBe(true);
    expect(st[st.length - 1].done).toBe(false);
    expect(st[st.length - 1].keys).toBe(11);
    st = tuneLadderStatus([...all, ...k11, state(id('tn-rootless', 'k-tune', 11), 'k-tune', 70)], 'piano', i);
    expect(ladderDone(st)).toBe(TUNE_LADDERS.piano.length);
  });
});
