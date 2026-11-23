// The audit's leftovers, wired after the merge (2026-11-23): the item page's tempo over time folds open under ItemHead;
// the workout's drums technique block leads with the style block (grooves by tempo, drumStyleBlock); the guitar / bass
// technique plan draws by THE weights (weightedFocus); a scale-rotation take reports its in-scale share.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ItemHead } from '../src/ui/ItemHead';
import { levelLadder } from '../src/engine/statusLadder';
import { catalog } from '../src/engine/drills/generate';
import type { ItemState } from '../src/engine/drills/types';

const st = {
  itemId: 'scales:major:0:R:0', family: 'scales', key: 0, hands: 'R', cleanBpm: 92, goalBpm: 120, streak: 0, fails: 0,
  ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 4, last: '2026-11-12T10:00:00Z',
  history: [{ at: '2026-11-10T10:00:00Z', bpm: 80, cv: 0 }, { at: '2026-11-12T10:00:00Z', bpm: 92, cv: 0 }], passLog: [], targetBpm: 120, ceiling: { bpm: 92, until: '2026-11-15' },
} as unknown as ItemState;

describe('the audit leftovers', () => {
  it("ItemHead folds the item's tempo over time (target and ceiling) open under the head", () => {
    const lv = catalog().find((f) => f.id === 'scales')!.levels[0];
    const ladder = levelLadder(lv, { [st.itemId]: st }, 'fifths-up');
    const html = renderToStaticMarkup(createElement(ItemHead, { lang: 'he', ladder, tempoItem: st }));
    expect(html).toContain('data-ih-tempo="scales:major:0:R:0"');
    expect(html).toContain('data-item-target="120"');
    expect(html).toContain('data-item-ceiling="92"');
    // a single day of takes: nothing to chart, nothing shown
    const one = { ...st, history: st.history.slice(0, 1) } as ItemState;
    expect(renderToStaticMarkup(createElement(ItemHead, { lang: 'he', ladder, tempoItem: one }))).not.toContain('data-ih-tempo');
  });
  it('the wiring: drums style block in the workout, weighted focus for guitar / bass, the rotation take in-scale share', () => {
    const app = readFileSync('src/ui/App.tsx', 'utf8');
    expect(app).toMatch(/drumStyleBlock\(families\('drums'\), items, weightedFocus\(s, 'drums', day\)/);
    const tech = readFileSync('src/ui/todayTech.ts', 'utf8');
    expect(tech).toMatch(/focus: weightedFocus\(a\.settings, inst === 'piano' \? 'keys' : inst, a\.day\)/);
    const rot = readFileSync('src/ui/ScaleRotation.tsx', 'utf8');
    expect(rot).toContain('inSet: g.m.inSet');
  });
});
