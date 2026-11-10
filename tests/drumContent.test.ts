// Drums content 0.66: the drummer's ear, Middle-Eastern odd meters, flams and drags, jazz, Latin, the band under grooves.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { drumFamilies } from '../src/engine/drills/drums';
import { analyzeDrumTake, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { gradeGrid, withDrumWrite } from '../src/engine/drills/drumEar';
import { bandBass, bandHits } from '../src/engine/drills/bassBand';
import { beamBeats, eighthGroupOf } from '../src/engine/drumNotation';
import { drillEvents } from '../src/engine/drills/events';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import type { Drill } from '../src/engine/drills/types';

/** A perfect take: every note on time, velocities in their bands, grace hits 25 ms before flams / drags. */
function perfectHits(d: Drill, bpm: number): DrumTakeHit[] {
  return d.notes.flatMap((n) => {
    const on = expTimeMs(d, n.beat, bpm);
    const graces = Array.from({ length: n.grace ?? 0 }, (_, k) => ({ voice: n.voice ?? 'snare', on: on - 25 * ((n.grace ?? 0) - k), vel: 40 }) as DrumTakeHit);
    return [...graces, { voice: n.voice ?? 'snare', on, vel: n.ghost ? 35 : n.accent ? 116 : 78, open: n.voice === 'hhOpen' ? 1 : 0, hat: n.voice === 'hhOpen' ? 'open' : n.voice === 'hihat' ? 'closed' : null } as DrumTakeHit];
  });
}

const gen = (family: string, kind: string, option = 0) => generate({ family: family as never, kind, option, key: 0, hands: 'RL', instrument: 'drums' });
const at = (d: Drill, voice: string, from: number, to: number) => d.notes.filter((n) => n.voice === voice && n.beat >= from - 1e-6 && n.beat < to - 1e-6).map((n) => Math.round((n.beat - from) * 1000) / 1000);

describe('Middle-Eastern: wahda, ayyub, chiftetelli, odd meters, switching (Frishkopf durub chart)', () => {
  it('ayyub: dum 1, ka on the "a", dum 2, tak on its "&" (D--kD-T-), twice a 4/4 bar', () => {
    const d = gen('d-mideast', '5:ayyub', 1);
    expect(at(d, 'kick', 0, 4)).toEqual([0, 1, 2, 3]);
    expect(d.notes.filter((n) => n.voice === 'snare' && n.beat < 4).map((n) => [n.beat, !!n.ghost])).toEqual([
      [0.75, true],
      [1.5, false],
      [2.75, true],
      [3.5, false],
    ]);
  });
  it('wahda: one dum, the teks on the "&" of 2 and on 4', () => {
    const d = gen('d-mideast', '5:ayyub', 0);
    expect(at(d, 'kick', 0, 4)).toEqual([0]);
    expect(at(d, 'snare', 0, 4)).toEqual([1.5, 3]);
  });
  it('chiftetelli: D . T T . D T . | D . D . T over two bars of 8ths', () => {
    const d = gen('d-mideast', '6:chifte', 0);
    expect(at(d, 'kick', 0, 8)).toEqual([0, 2.5, 4, 5]);
    expect(at(d, 'snare', 0, 8)).toEqual([1, 1.5, 3, 6]);
  });
  it('karsilama is 9/8 (2+2+2+3), ♪ = eighths: D.T.D.TT. per bar; the bars stay 9 eighths long', () => {
    const d = gen('d-mideast', '7:98', 0);
    expect(d.meter).toBe(9);
    expect(d.pulse).toBe(8);
    expect(d.groups).toEqual([2, 2, 2, 3]);
    expect(d.beats).toBe(72);
    for (let b = 0; b < 8; b++) {
      expect(at(d, 'kick', b * 9, b * 9 + 9)).toEqual([0, 4]);
      expect(at(d, 'snare', b * 9, b * 9 + 9)).toEqual([2, 6, 7]);
    }
    expect(d.startBpm).toBe(200);
    // Aqsaq: the last tek moved to the last eighth.
    expect(at(gen('d-mideast', '7:98', 2), 'snare', 0, 9)).toEqual([2, 6, 8]);
  });
  it("7/8 dawr hindi (3+2+2) and 10/8 sama'i thaqil (3+2+2+3)", () => {
    const h = gen('d-mideast', '8:odd', 0);
    expect([h.meter, h.groups]).toEqual([7, [3, 2, 2]]);
    expect(at(h, 'kick', 0, 7)).toEqual([0, 3]);
    expect(at(h, 'snare', 0, 7)).toEqual([1, 2, 5]);
    const s = gen('d-mideast', '8:odd', 1);
    expect([s.meter, s.groups]).toEqual([10, [3, 2, 2, 3]]);
    expect(at(s, 'kick', 0, 10)).toEqual([0, 5, 6]);
    expect(at(s, 'snare', 0, 10)).toEqual([3, 7]);
  });
  it('odd-meter takes are timed in eighths: a perfect take is clean, one an eighth late everywhere is not', () => {
    const d = gen('d-mideast', '7:98', 0);
    expect(analyzeDrumTake(d, 260, perfectHits(d, 260)).verdict).toBe('clean');
    expect(expTimeMs(d, 9, 240) - expTimeMs(d, 0, 240)).toBeCloseTo(9 * 250, 3);
    const late = perfectHits(d, 260).map((h) => ({ ...h, on: h.on + 60000 / 260 }));
    expect(analyzeDrumTake(d, 260, late).verdict).not.toBe('clean');
  });
  it('switching on cue: two bars each, the rhythm changes on the 1', () => {
    const d = gen('d-mideast', '9:switch', 0);
    expect(d.title.en).toMatch(/maqsum → sa'idi → ayyub → maqsum/);
    expect(at(d, 'kick', 8, 12)).toEqual([0, 1.5, 2]); // sa'idi: D . . D D
    expect(at(d, 'kick', 16, 20)).toEqual([0, 1, 2, 3]); // ayyub
  });
});

describe('notation for eighth-pulse meters', () => {
  it('9/8 beams in 2+2+2+3: group starts in quarter notes', () => {
    const g = eighthGroupOf(9, [2, 2, 2, 3]);
    expect([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map(g)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 3]);
    expect(g(4.5)).toBe(4.5); // the next bar
    const stems = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((e) => ({ beat: e / 2, dur: 0.5 }));
    expect(beamBeats(stems, g).map((b) => b.idx.length)).toEqual([2, 2, 2, 3]);
  });
});

describe('flams and drags (F3 L5–9, MIDI)', () => {
  const sticking = (d: Drill) => d.notes.map((n) => (n.grace ? (n.hand === 'R' ? 'l' : 'r').repeat(n.grace) : '') + n.hand).join(' ');
  it('PAS stickings: flam accent, flam tap, single drag tap, Swiss army triplet, flam paradiddle, ratamacue', () => {
    expect(sticking(gen('d-diddles', '6:flam-acc', 0)).startsWith('lR L R rL R L')).toBe(true);
    expect(sticking(gen('d-diddles', '6:flam-acc', 1)).startsWith('lR R rL L')).toBe(true);
    expect(sticking(gen('d-diddles', '7:drag', 1)).startsWith('llR L rrL R')).toBe(true);
    expect(sticking(gen('d-diddles', '8:swiss', 0)).startsWith('lR R L lR R L')).toBe(true);
    expect(sticking(gen('d-diddles', '8:swiss', 1)).startsWith('lR L R R rL R L L')).toBe(true);
    expect(sticking(gen('d-diddles', '9:ratamacue', 1)).startsWith('llR L R L rrL R L R')).toBe(true);
    const fl = gen('d-diddles', '5:flam', 0);
    expect(fl.drum?.mic).toBe(false);
    expect(fl.goal.drum?.flam).toBe(0.9);
  });
  const d = gen('d-diddles', '5:flam', 1);
  const take = (gap: number, graceVel = 40): DrumTakeHit[] =>
    d.notes.flatMap((n) => {
      const on = expTimeMs(d, n.beat, 70);
      return [{ voice: 'snare' as const, on: on - gap, vel: graceVel }, { voice: 'snare' as const, on, vel: 90 }];
    });
  it('a grace 25 ms before, softer: clean; the flam gap is measured', () => {
    const m = analyzeDrumTake(d, 70, take(25));
    expect(m.verdict).toBe('clean');
    expect(m.drum!.flamGap).toBeCloseTo(25, 5);
    expect(m.drum!.extra).toBe(0);
  });
  it('flat flams (8 ms), loose graces (60 ms), loud graces or no graces never pass', () => {
    expect(analyzeDrumTake(d, 70, take(8)).drum!.missed).toContain('flam');
    expect(analyzeDrumTake(d, 70, take(60)).verdict).not.toBe('clean');
    expect(analyzeDrumTake(d, 70, take(25, 100)).drum!.missed).toContain('flam');
    const none = analyzeDrumTake(d, 70, perfectHits({ ...d, notes: d.notes.map(({ grace: _g, ...n }) => n) }, 70));
    expect(none.verdict).toBe('not');
  });
  it('uneven flam spacing (SD > 8 ms) is caught', () => {
    const hits = d.notes.flatMap((n, i) => {
      const on = expTimeMs(d, n.beat, 70);
      return [{ voice: 'snare' as const, on: on - (i % 2 ? 17 : 38), vel: 40 }, { voice: 'snare' as const, on, vel: 90 }];
    });
    expect(analyzeDrumTake(d, 70, hits).drum!.missed).toContain('flamSd');
  });
});

describe('jazz (F8)', () => {
  it('the ride pattern: 1, 2, the skip of 2, 3, 4, the skip of 4; the skip notes are swung', () => {
    const d = gen('d-jazz', '1:ride', 0);
    expect(at(d, 'ride', 0, 4)).toEqual([0, 1, 1.667, 2, 3, 3.667]);
    expect(d.notes.filter((n) => n.swing).every((n) => Math.abs((n.beat % 1) - 2 / 3) < 1e-6)).toBe(true);
    expect(d.goal.drum?.swing).toEqual({ lo: 0.58, hi: 0.72 });
  });
  it('the swing ratio is measured: triplet swing clean, straight 8ths too straight, dotted too dotted', () => {
    const d = gen('d-jazz', '1:ride', 0);
    const bpm = 140;
    const play = (ratio: number) => d.notes.map((n) => ({ voice: n.voice!, on: expTimeMs(d, Math.floor(n.beat + 1e-6), bpm) + (n.swing ? ratio : n.beat % 1) * (60000 / bpm), vel: 80 }));
    expect(analyzeDrumTake(d, bpm, play(2 / 3)).verdict).toBe('clean');
    const straight = analyzeDrumTake(d, bpm, play(0.5));
    expect(straight.drum!.missed).toContain('swing');
    expect(straight.why.en).toMatch(/straight/);
    expect(analyzeDrumTake(d, bpm, play(0.8)).drum!.missed).toContain('swing');
  });
  it('hi-hat foot on 2 and 4, feathered kick as ghosts, the waltz in 3/4', () => {
    const f = gen('d-jazz', '3:feather', 0);
    expect(at(f, 'hhPedal', 0, 4)).toEqual([1, 3]);
    expect(f.notes.filter((n) => n.voice === 'kick').every((n) => n.ghost)).toBe(true);
    const w = gen('d-jazz', '6:waltz', 0);
    expect(w.meter).toBe(3);
    expect(w.beats).toBe(24);
    expect(at(w, 'ride', 0, 3)).toEqual([0, 1, 1.667, 2]);
    expect(at(w, 'hhPedal', 0, 3)).toEqual([1]);
  });
  it('comping lines are generated per item, on triplet partials, kick never on a snare', () => {
    const a = gen('d-jazz', '5:comp2', 0);
    const b = gen('d-jazz', '5:comp2', 1);
    expect(at(a, 'snare', 0, 32)).not.toEqual(at(b, 'snare', 0, 32));
    for (const n of a.notes.filter((x) => x.voice === 'snare' || x.voice === 'kick')) expect([0, 0.667]).toContain(Math.round((n.beat % 1) * 1000) / 1000);
    const sn = new Set(at(a, 'snare', 0, 32));
    for (const k of at(a, 'kick', 0, 32)) expect(sn.has(k)).toBe(false);
  });
  it('trading 4s: no notes in the solo bars, crash + kick landings, the band lays out in the solos', () => {
    const d = gen('d-jazz', '8:trade', 0);
    expect(d.notes.filter((n) => (n.beat >= 16 && n.beat < 32) || (n.beat >= 48 && n.beat < 64))).toEqual([]);
    expect(d.goal.drum?.landing?.beats).toEqual([32, 64]);
    expect(bandHits(d).some((h) => (h.beat >= 16 && h.beat < 32) || (h.beat >= 48 && h.beat < 64))).toBe(false);
    expect(bandHits(d).length).toBeGreaterThan(0);
    expect(bandBass(d).some((h) => h.beat >= 16 && h.beat < 32)).toBe(false);
  });
});

describe('Latin & Brazilian (F11)', () => {
  it('son clave 3-2 / 2-3 and rumba clave on the cross-stick, left hand', () => {
    expect(at(gen('d-latin', '3:clave', 0), 'rim', 0, 8)).toEqual([0, 1.5, 3, 5, 6]);
    expect(at(gen('d-latin', '3:clave', 1), 'rim', 0, 8)).toEqual([1, 2, 4, 5.5, 7]);
    expect(at(gen('d-latin', '3:clave', 2), 'rim', 0, 8)).toEqual([0, 1.5, 3.5, 5, 6]);
    expect(gen('d-latin', '3:clave', 0).notes.filter((n) => n.voice === 'rim').every((n) => n.hand === 'L')).toBe(true);
  });
  it('bossa nova: the bossa clave (3rd note of the 2 side moved to the "&" of 3), kick 1, &2, 3, &4', () => {
    const d = gen('d-latin', '1:bossa', 0);
    expect(at(d, 'rim', 0, 8)).toEqual([0, 1.5, 3, 5, 6.5]);
    expect(at(d, 'kick', 0, 4)).toEqual([0, 1.5, 2, 3.5]);
    expect(d.band?.style).toBe('bossa');
  });
  it('cascara 2-3: 1 2 3 &3 &4 | 1 2 &2 &3 &4; samba feet; bembé bell in 6/8; baião kick', () => {
    expect(at(gen('d-latin', '4:cascara', 0), 'ride', 0, 8)).toEqual([0, 1, 2, 2.5, 3.5, 4, 5, 5.5, 6.5, 7.5]);
    const s = gen('d-latin', '2:samba', 0);
    expect(at(s, 'kick', 0, 4)).toEqual([0, 0.75, 1, 1.75, 2, 2.75, 3, 3.75]);
    expect(at(s, 'hhPedal', 0, 4)).toEqual([0.5, 1.5, 2.5, 3.5]);
    const b = gen('d-latin', '6:bembe', 0);
    expect([b.meter, b.pulse, b.groups]).toEqual([6, 8, [3, 3]]);
    expect(at(b, 'ride', 0, 12)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(at(gen('d-latin', '7:baiao', 0), 'kick', 0, 4)).toEqual([0, 0.75, 2, 2.75]);
  });
});

describe("the drummer's ear (d-ear)", () => {
  it('every item: a call in the listen bars, the answer only outside them, notes hidden until the result', () => {
    const fam = drumFamilies().find((f) => f.id === 'd-ear')!;
    for (const lv of fam.levels)
      for (const sp of lv.specs) {
        const d = generate({ ...sp, key: 0 } as never);
        expect(d.show, d.itemId).toBe('none');
        expect(d.listen!.notes.length).toBeGreaterThan(3);
        const inWin = (b: number) => d.listen!.windows.some(([a, e]) => b >= a - 1e-6 && b < e - 1e-6);
        for (const n of d.listen!.notes) expect(inWin(n.beat), d.itemId).toBe(true);
        // Landings may coincide with the next call's 1; every other answer note is in a "You" bar.
        for (const n of d.notes) if (n.voice !== 'crash' && !(n.voice === 'kick' && d.notes.some((c) => c.voice === 'crash' && c.beat === n.beat))) expect(inWin(n.beat), d.itemId).toBe(false);
        expect(d.listen!.notes.every((n) => n.perc)).toBe(true);
      }
  });
  it('echo: the answer bar is the call bar, one bar later', () => {
    const d = gen('d-ear', '1:echo8', 0);
    const call = d.listen!.notes.filter((n) => n.beat < 4).map((n) => n.beat);
    expect(at(d, 'snare', 4, 8)).toEqual(call);
    expect(d.drum?.mic).toBe(true);
  });
  it('spot the change: the answer is the changed 4th bar, played twice', () => {
    const d = gen('d-ear', '6:spot', 0);
    const fourth = d.listen!.notes.filter((n) => n.beat >= 12 && n.beat < 16).map((n) => `${n.perc}@${n.beat - 12}`).sort();
    const first = d.listen!.notes.filter((n) => n.beat < 4).map((n) => `${n.perc}@${n.beat}`).sort();
    expect(fourth).not.toEqual(first);
    expect(d.notes.filter((n) => n.beat >= 16 && n.beat < 20).length).toBe(fourth.length);
  });
  it('dictation: the grid holds what was played; grading counts misses and extras; a wrong grid keeps a take from clean', () => {
    const d = gen('d-ear', '8:kitwrite', 0);
    const w = d.drumWrite!;
    expect(w.kind).toBe('grid');
    if (w.kind !== 'grid') return;
    expect(w.lanes.map((l) => l.voice)).toEqual(['hihat', 'snare', 'kick']);
    const kicks = w.lanes[2].steps.map((x, i) => (x ? i / w.sub : -1)).filter((x) => x >= 0);
    expect(at(d, 'kick', 8, 12)).toEqual(kicks);
    const right = gradeGrid(w.lanes, w.lanes.map((l) => l.steps));
    expect(right.ok).toBe(right.total);
    const oneOff = w.lanes.map((l, i) => (i === 1 ? l.steps.map((x, k) => (k === 1 ? !x : x)) : l.steps));
    const g = gradeGrid(w.lanes, oneOff);
    expect(g.ok).toBe(right.total);
    expect(g.total).toBe(right.total + 1);
    const m = analyzeDrumTake(d, 70, perfectHits(d, 70));
    expect(m.verdict).toBe('clean');
    expect(withDrumWrite(m, g, d).verdict).toBe('almost');
    expect(withDrumWrite(m, right, d).verdict).toBe('clean');
  });
  it('style by ear: six items, each its own answer among four names', () => {
    const fam = drumFamilies().find((f) => f.id === 'd-ear')!;
    const answers = fam.levels[6].specs.map((sp) => {
      const d = generate({ ...sp, key: 0 } as never);
      const w = d.drumWrite!;
      if (w.kind !== 'pick') throw new Error('pick');
      expect(w.options.length).toBe(4);
      return w.options[w.answer].en;
    });
    expect(new Set(answers).size).toBe(6);
  });
  it("feeds the ear side: rhythm dictation; odd meters feed meter", () => {
    const m = analyzeDrumTake(gen('d-ear', '4:groove', 0), 70, []);
    expect(drillEvents(gen('d-ear', '4:groove', 0), m, '2026-11-10', 's', 0)[0].tags!.map((x) => x.sub)).toContain('rhythm-dictation/dictate');
    expect(drillEvents(gen('d-mideast', '7:98', 0), m, '2026-11-10', 's', 0)[0].tags!.map((x) => x.sub)).toContain('meter/odd');
    expect(drillEvents(gen('d-latin', '6:bembe', 0), m, '2026-11-10', 's', 0)[0].tags!.map((x) => x.sub)).toContain('meter/compound');
  });
});

describe('the band under grooves, and the path symbols', () => {
  it('a bass line on the kick (the chord root) and comping, from rock L2 on; none on a practice-pad level', () => {
    const d = gen('d-rock', '2:kick', 0);
    expect(d.band?.bass).toBe(true);
    const bass = bandBass(d);
    expect(bass.map((b) => b.beat)).toEqual([...new Set(d.notes.filter((n) => n.voice === 'kick').map((n) => n.beat))].sort((a, b) => a - b));
    expect(bass[0].midi % 12).toBe(9); // A
    expect(bandHits(d).length).toBeGreaterThan(0);
    expect(gen('d-rock', '1:rock', 0).band).toBeUndefined();
    expect(gen('d-funk', '1:ghosts', 0).band).toBeUndefined();
    expect(bandBass(gen('d-jazz', '2:foot', 0)).length).toBeGreaterThan(20); // walking
  });
  it('every drum family has its own path symbol', () => {
    const ids = drumFamilies().map((f) => f.id);
    const gl = ids.map((id) => FAMILY_GLYPH[id]);
    expect(gl.every(Boolean)).toBe(true);
    expect(new Set(gl).size).toBe(ids.length);
  });
});
