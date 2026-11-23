// SPEC-JAZZ-NEIGHBOURS §6a "fix what exists" (2026-11-22): the Afro-Cuban grooves (STYLE-AFROCUBAN F1–F4, F6), the
// baião bass (STYLE-BRAZIL §3.1), swing = 0 on every Brazilian item (STYLE-BRAZIL §0.2), and the organ voice
// (STYLE-SOUL §10.1: no velocity, single-trigger percussion, the CC11 swell). Pure engine tests pinning the patterns.
import { describe, expect, it } from 'vitest';
import { GROOVES, grooveBars, grooveCycle, grooveHits, grooveSteps } from '../src/engine/grooves';
import { SON23, SON32, SONGO_BELL, SONGO_SN, SONGO_K } from '../src/engine/drills/drumLatin2';
import { drillDrumHits } from '../src/engine/drills/bandTimeline';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { allDrumFamilies } from '../src/engine/drills/drums';
import { isStraightStd } from '../src/engine/standards';
import { chartIsStraight } from '../src/engine/drills/chartDrills';
import { ORGAN_LEVEL, organKey, PercussionGate, REGISTRATIONS, swellGain } from '../src/audio/organ';
import type { Drill, DrillSpec } from '../src/engine/drills/types';

const G = (id: string) => GROOVES.find((g) => g.id === id)!;
const at = (lane: string) => [...lane].flatMap((c, i) => (c === 'x' ? [i] : []));
const bassDrill = (family: string, level: number, specIndex = 0): Drill => {
  const l = guitarCatalog().find((f) => f.id === family)!.levels[level - 1];
  const sp = l.specs[specIndex];
  return generate({ ...sp, key: Array.isArray(l.keys) ? (l.keys[0] as number) : 0, tuning: 'bass' } as DrillSpec);
};
const near = (xs: number[], b: number) => xs.some((x) => Math.abs(x - b) < 1e-6);

describe('F1: the son clave is two bars of 8ths, aligned with the tumbao', () => {
  it('clave-32 / clave-23 are the son clave (not rumba), one cycle per two bars', () => {
    for (const [id, pos, model] of [
      ['clave-32', [0, 3, 6, 10, 12], SON32],
      ['clave-23', [2, 4, 8, 11, 14], SON23],
    ] as const) {
      const g = G(id);
      expect(g.sub, id).toBe(2);
      expect(grooveBars(g), id).toBe(2);
      expect(grooveSteps(g), id).toBe(8);
      expect(at(g.r!), id).toEqual(pos);
      expect(g.r, id).toBe(model);
    }
  });
  it('under b-latin L1 (3-2) and L2 (2-3) the bombo and ponche fall on clave strokes 2 and 3 of the three-side', () => {
    for (const [lv, threeSide] of [
      [1, 0],
      [2, 1],
    ] as const) {
      const d = bassDrill('b-latin', lv);
      const rim = drillDrumHits(d).filter((h) => h.d === 'r').map((h) => h.beat);
      expect(rim.length, `L${lv}`).toBeGreaterThan(0);
      for (let bar = threeSide; bar < 8; bar += 2) {
        // the three-side bar: clave on 1, the "&" of 2 and 4 = the tumbao's bombo (1.5) and ponche (3)
        for (const b of [0, 1.5, 3]) expect(near(rim, bar * 4 + b), `L${lv} bar ${bar} beat ${b}`).toBe(true);
        const bass = d.notes.filter((n) => n.beat >= bar * 4 - 1e-6 && n.beat < bar * 4 + 4 - 1e-6).map((n) => n.beat - bar * 4);
        expect(bass.every((b) => near([1.5, 3], b)), `L${lv} bar ${bar} bass`).toBe(true);
      }
      // the two-side bar: 8th cells 2 and 4 (counts 2 and 3)
      for (let bar = 1 - threeSide; bar < 8; bar += 2) for (const b of [1, 2]) expect(near(rim, bar * 4 + b), `L${lv} two-side bar ${bar}`).toBe(true);
    }
  });
});

describe('F2: the 6/8 bell is the bembé bell', () => {
  it('6-8-afro plays x.x.xx.x.x.x (7 strokes in 12) over two bars of 6/8', () => {
    const g = G('6-8-afro');
    expect(g.h).toBe('x.x.xx.x.x.x');
    expect(grooveCycle(g)).toBe(12);
    expect(grooveHits(g).filter((h) => h.kind === 'cowbell').map((h) => h.step)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
  it('under b-latin L7 every 12/8 bar carries the whole bell', () => {
    const d = bassDrill('b-latin', 7);
    const bell = drillDrumHits(d).filter((h) => h.d === 'h').map((h) => h.beat);
    for (let bar = 0; bar < 8; bar++) for (const c of [0, 2, 4, 5, 7, 9, 11]) expect(near(bell, bar * 4 + c / 3), `bar ${bar} cell ${c}`).toBe(true);
    expect(bell.filter((b) => b < 32 - 1e-6).length).toBe(8 * 7);
  });
});

describe('F3: the tumbao groove kick', () => {
  it('kicks on the "&" of 2 and on 4 in every bar', () => {
    expect(at(G('tumbao').k)).toEqual([6, 12]);
    const d = bassDrill('b-latin', 9);
    const k = drillDrumHits(d).filter((h) => h.d === 'k').map((h) => h.beat % 4);
    expect(new Set(k.map((b) => b.toFixed(2)))).toEqual(new Set(['1.50', '3.00']));
  });
});

describe('F4: songo, the right hand on the four beats', () => {
  it('the bell on the quarters, the left hand on the offbeats', () => {
    expect(at(SONGO_BELL)).toEqual([0, 4, 8, 12]);
    expect(at(SONGO_SN)).toEqual([2, 6, 10, 14]);
    expect(at(SONGO_K)).toEqual([6, 12]);
  });
  it('every d-latin L9 option: right-hand hits on the beats, left-hand hits on the "&"s', () => {
    const l = allDrumFamilies().find((f) => f.id === 'd-latin')!.levels[8];
    for (const sp of l.specs) {
      const d = generate({ ...sp, key: 0 } as DrillSpec);
      const hands = d.notes.filter((n) => n.voice !== 'kick');
      expect(hands.length).toBeGreaterThan(0);
      for (const n of hands) {
        const frac = n.beat % 1;
        if (n.hand === 'R') expect(frac, `${sp.option} R at ${n.beat}`).toBeCloseTo(0, 6);
        else expect(frac, `${sp.option} L at ${n.beat}`).toBeCloseTo(0.5, 6);
      }
    }
  });
});

describe('F6 / STYLE-BRAZIL §3.1: the baião bass', () => {
  it('root on 1 and 3, the 5th on the 16th before 2 and 4, tied over the beat', () => {
    const d = bassDrill('b-latin', 8, 1);
    for (let bar = 0; bar < 8; bar++) {
      const inBar = d.notes.filter((n) => n.beat >= bar * 4 - 1e-6 && n.beat < bar * 4 + 4 - 1e-6);
      expect(inBar.map((n) => +(n.beat - bar * 4).toFixed(3)), `bar ${bar}`).toEqual([0, 0.75, 2, 2.75]);
      expect(inBar.map((n) => +n.dur.toFixed(3)), `bar ${bar}`).toEqual([0.75, 1.25, 0.75, 1.25]);
    }
  });
});

describe('Brazilian items are never swung (STYLE-BRAZIL §0.2)', () => {
  const BR = /bossa|samba|bai[aã]o|partido|ipanema/i;
  const swung = (d: Drill) => !!d.spec.swing || d.swingRatio !== undefined || d.notes.some((n) => n.swing) || !!d.goal.bass?.swing;
  it('no bossa / samba / baião / partido-alto item swings, on keys, guitar, bass or drums', () => {
    const fams = [...catalog(), ...guitarCatalog(), ...allDrumFamilies()];
    let seen = 0;
    for (const f of fams)
      for (const l of f.levels)
        for (const sp of l.specs) {
          let d: Drill;
          try {
            d = generate({ ...sp, key: Array.isArray(l.keys) ? ((l.keys[0] as number) ?? 0) : 0 } as DrillSpec);
          } catch {
            continue;
          }
          const brazil = BR.test(`${d.title.en} ${sp.kind}`) || d.drums?.groove === 'bossa' || d.drums?.groove === 'samba' || d.band?.style === 'bossa';
          // a road map that only starts in bossa (Latin A, swing B) is graded per section, not swung throughout
          if (!brazil || (d.band?.style === 'swing' && !BR.test(d.title.en))) continue;
          seen++;
          expect(swung(d), `${l.id} ${sp.kind} ${sp.option ?? ''}: ${d.title.en}`).toBe(false);
        }
    expect(seen).toBeGreaterThan(20);
  }, 120_000);
  it('the bossa standards and charts are straight everywhere they are generated', () => {
    expect(isStraightStd('blue-bossa')).toBe(true);
    expect(isStraightStd('autumn')).toBe(false);
    expect(chartIsStraight('chart~std:blue-bossa~shell~anticip~comp')).toBe(true);
    expect(chartIsStraight('chart~std:autumn~shell~anticip~comp')).toBe(false);
    expect(generate({ family: 'voicings', kind: 'chart~std:blue-bossa~shell~anticip~comp', key: 0, hands: 'L' } as DrillSpec).spec.swing).toBe(false);
    expect(generate({ family: 'voicings', kind: 'chart~std:autumn~shell~anticip~comp', key: 0, hands: 'L' } as DrillSpec).spec.swing).toBe(true);
  });
  it('the bossa groove carries the whole two-bar bossa clave', () => {
    const g = G('bossa');
    expect(grooveBars(g)).toBe(2);
    expect(g.r).toBe('x..x..x...x..x..');
    expect(g.k).toBe('x..xx..xx..xx..x');
  });
});

describe('every groove lane spans its cycle', () => {
  it('lanes are bars × steps long', () => {
    for (const g of GROOVES) for (const lane of [g.k, g.s, g.h, g.r]) if (lane !== undefined) expect(lane.length, g.id).toBe(grooveCycle(g));
  });
});

// ---------------------------------------------------------------- the organ (STYLE-SOUL §10.1)

/** A minimal Web Audio stand-in that records every gain value set on the partials. */
function mockCtx() {
  const gains: number[] = [];
  const param = (rec = false) => {
    let v = 0;
    return {
      get value() {
        return v;
      },
      set value(x: number) {
        v = x;
        if (rec) gains.push(x);
      },
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      setTargetAtTime() {},
    };
  };
  const node = () => ({ connect: (x: unknown) => x });
  const ctx = {
    sampleRate: 8000,
    createGain: () => ({ ...node(), gain: param(true) }),
    createOscillator: () => ({ ...node(), frequency: param(), setPeriodicWave() {}, start() {}, stop() {} }),
    createPeriodicWave: () => ({}),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => ({ ...node(), buffer: null, start() {} }),
    createBiquadFilter: () => ({ ...node(), type: '', frequency: param(), Q: param() }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, gains };
}

describe('the organ voice', () => {
  const jazz = REGISTRATIONS.find((r) => r.id === 'jazz')!;
  it('ignores velocity: organKey takes none, every partial at the fixed level', () => {
    const { ctx, gains } = mockCtx();
    organKey(ctx, 220, jazz, 0, 1, {} as AudioNode, false);
    // three drawbars out (888): three partial gains, each a share of ORGAN_LEVEL
    const parts = gains.filter((g) => g > 0 && g < 1 && Math.abs(g - 0.18) > 1e-9);
    expect(parts.length).toBe(3);
    for (const g of parts) expect(g).toBeCloseTo(ORGAN_LEVEL / 3, 6);
  });
  it('the percussion sounds only when the gate fires', () => {
    const a = mockCtx();
    const b = mockCtx();
    const on = organKey(a.ctx, 220, jazz, 0, 1, {} as AudioNode, true);
    const off = organKey(b.ctx, 220, jazz, 0, 1, {} as AudioNode, false);
    expect(on.srcs.length - off.srcs.length).toBe(1);
  });
  it('single-trigger: a legato line sounds it once, a detached one on every note, a chord on all its keys', () => {
    const legato = new PercussionGate();
    expect([0, 0.5, 1, 1.5].map((t) => legato.press(t, t + 0.55).fires)).toEqual([true, false, false, false]);
    const detached = new PercussionGate();
    expect([0, 0.5, 1, 1.5].map((t) => detached.press(t, t + 0.4).fires)).toEqual([true, true, true, true]);
    const chord = new PercussionGate();
    expect([0, 0.01, 0.02].map((t) => chord.press(t, 2).fires)).toEqual([true, true, true]);
    // a key held under a new chord: no percussion
    expect(chord.press(1, 3).fires).toBe(false);
  });
  it('a live key holds the gate until its release', () => {
    const g = new PercussionGate();
    const k = g.press(0, Infinity);
    expect(k.fires).toBe(true);
    expect(g.press(1, Infinity).fires).toBe(false);
    const g2 = new PercussionGate();
    const k2 = g2.press(0, Infinity);
    g2.release(k2.key, 0.8);
    expect(g2.press(1, Infinity).fires).toBe(true);
    void k;
  });
  it('the swell pedal (CC11) scales the volume, never quite silent', () => {
    expect(swellGain(127)).toBeCloseTo(1, 6);
    expect(swellGain(0)).toBeCloseTo(0.1, 6);
    expect(swellGain(64)).toBeGreaterThan(swellGain(32));
    expect(swellGain(200)).toBeCloseTo(1, 6);
  });
});
