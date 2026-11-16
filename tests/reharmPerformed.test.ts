// Reharmonisation, performed (AUDIT-DEPTH-3 #2, C3): each device under a melody in a ii–V–I (k-reharm 23–24), and a
// solo chorus over the reharm (k-tune 15, g-tune 14; the studio's own plan as tn-ownsolo~<plan>).
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { RH_DEVICES, guideTops, heldFits } from '../src/engine/drills/colorDrills';
import { SERVED, chartFor, soloPlan } from '../src/engine/drills/headDrills';
import { headIn } from '../src/engine/heads';
import { HEADS } from '../src/content/heads';
import { autoPlan, planCode } from '../src/engine/reharm';
import { ruleCheck } from '../src/engine/improvRules';
import { RULE_CARDS, cardKept } from '../src/engine/ruleCards';
import { KEYS_LEVEL_DIFF } from '../src/engine/path';
import type { DrillSpec } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;

describe('#2 L1–L2: each device under the melody (k-reharm 23–24)', () => {
  const fam = () => catalog().find((f) => f.id === 'k-reharm')!;
  it('two levels at 1350 and 1420, five devices each, 12 keys', () => {
    const l23 = fam().levels.find((l) => l.id === 'k-reharm-23')!;
    const l24 = fam().levels.find((l) => l.id === 'k-reharm-24')!;
    expect(l23.specs.map((s) => s.option)).toEqual([0, 2, 4, 6, 8]);
    expect(l24.specs.map((s) => s.option)).toEqual([1, 3, 5, 7, 9]);
    expect(KEYS_LEVEL_DIFF['k-reharm-23']).toBe(1350);
    expect(KEYS_LEVEL_DIFF['k-reharm-24']).toBe(1420);
    expect(l23.keys).toHaveLength(12);
  });
  it('the held note fits every chord of its device (chord tone or natural tension), and is on top of every voicing', () => {
    for (const dv of RH_DEVICES)
      for (let k = 0; k < 12; k++) {
        for (const [d, q] of dv.bars) expect(heldFits(k + dv.held, k + d, q), `${dv.id} ${k} ${d}${q}`).toBe(true);
        const op = RH_DEVICES.indexOf(dv) * 2;
        const dr = generate({ family: 'k-reharm', kind: 'rh-dev', key: k, hands: 'RL', option: op } as DrillSpec);
        const rhTops = [...new Set(dr.notes.filter((n) => n.hand === 'R').map((n) => n.beat))].map((b) => Math.max(...dr.notes.filter((n) => n.hand === 'R' && n.beat === b).map((n) => n.pitch)));
        expect(new Set(rhTops.map(pc))).toEqual(new Set([pc(k + dv.held)]));
      }
  });
  it('the guide-tone line: each top note a 3rd or 7th of its chord, moving a minor 3rd at most', () => {
    for (const dv of RH_DEVICES)
      for (let k = 0; k < 12; k++) {
        const tops = guideTops(k, dv.bars);
        tops.forEach((t, i) => {
          const [d, q] = dv.bars[i];
          const iv = q === 'maj7' ? [4, 11] : q === 'm7' ? [3, 10] : q === '7' ? [4, 10] : q === 'dim7' ? [3, 9] : [4, 9];
          expect(iv.map((x) => pc(k + d + x))).toContain(pc(t));
          if (i) expect(Math.abs(t - tops[i - 1])).toBeLessThanOrEqual(3);
        });
      }
  });
});

describe('C3 step 5: a solo chorus over the reharm', () => {
  const lv = (fam: string, id: string) => [...catalog(), ...guitarCatalog()].find((f) => f.id === fam)!.levels.find((l) => l.id === id)!;
  it('k-tune 15 and g-tune 14: every served head, all 12 keys, timed with the band, the reharmed chart', () => {
    for (const [fam, id] of [['k-tune', 'k-tune-15'], ['g-tune', 'g-tune-14']] as const) {
      const l = lv(fam, id);
      expect(l.specs.every((s) => s.kind === 'tn-rhsolo')).toBe(true);
      for (const d of levelDrills(l, 'fifths-up').slice(0, 24)) {
        expect(d.goal.free?.windows).toHaveLength(1);
        expect(d.goal.improv?.cards).toEqual(['target-ct', 'inside']);
        expect(d.band).toBeDefined();
        expect(d.drums).toBeDefined();
        expect(d.notes.filter((n) => n.land).length).toBe(2);
      }
    }
    expect(KEYS_LEVEL_DIFF['k-tune-15']).toBe(1760);
  });
  it('the model keeps both cards over the reharmed changes (12 keys, every served head)', () => {
    for (const i of SERVED)
      for (const k of [0, 3, 6, 9]) {
        const hi = headIn(HEADS[i], k, 'piano');
        const sp = soloPlan(hi, 'tn-rhsolo', 60, 86);
        const ctx = { notes: sp.goal.free.model.map((n) => ({ beat: n.beat, dur: n.dur, midi: n.pitch })), spans: sp.goal.improv.spans, meter: 4, bpm: 100 };
        for (const c of sp.goal.improv.cards) {
          expect(RULE_CARDS[c]).toBeDefined();
          expect(cardKept(c, ruleCheck(c, ctx)), `${HEADS[i].id} ${k} ${c}`).toBe(true);
        }
        // the chart under the solo is the reharm, not the written chart
        expect(chartFor(hi, 'tn-rhsolo').reharm).toBe(true);
      }
  });
  it('the studio: my own plan as a solo drill (tn-ownsolo~<plan>) plays over my chords', () => {
    const i = SERVED[0];
    const hi = headIn(HEADS[i], HEADS[i].home.key);
    const plan = autoPlan(hi.text, hi.tonic, ['tritone'], hi.notes);
    const kind = `tn-ownsolo~${planCode(plan)}`;
    const d = generate({ family: 'k-tune', kind, key: HEADS[i].home.key, hands: 'RL', option: i * 16 } as DrillSpec);
    expect(d.goal.improv?.cards.length).toBe(2);
    expect(d.chart!.join(' ')).toBe(chartFor(hi, kind).bars.join(' ').replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯'));
  });
});
