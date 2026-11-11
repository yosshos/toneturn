// DRUMS_NICHE_PLAN P2 (§6.3): the rest of the curriculum (drumMore.ts) and its measures — the swell line, the pocket,
// endurance, the double pedal's odd / even balance, improvised zones, the click on 1 every other bar.
import { describe, expect, it } from 'vitest';
import { drumFamilies, type DrumLevelDef } from '../src/engine/drills/drums';
import { MORE_FROM } from '../src/engine/drills/drumMore';
import { analyzeDrumTake, DRUM_TIERS, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { levelDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { clickPlan } from '../src/engine/drills/timeline';
import { stepCatalogue } from '../src/engine/path';
import { ACOUSTIC_LEVELS } from '../src/engine/drumAcoustic';
import type { Drill } from '../src/engine/drills/types';
import { drumRound, scoreRound } from '../src/engine/drumGames';
import { QUICK_PADS, WIZARD_PADS, wizardDone, wizardHit, wizardStart } from '../src/engine/drumKit';

const FAMS = drumFamilies();
const NEW: DrumLevelDef[] = FAMS.flatMap((f) => (MORE_FROM[f.id] ? f.levels.filter((l) => l.level >= MORE_FROM[f.id]) : []));
const gen = (family: string, kind: string, option = 0) => generate({ family: family as never, kind, option, key: 0, hands: 'RL', instrument: 'drums' });

function noise(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
/**
 * A take that plays the drill as written: jitter `sd` ms; velocities by mark (a swell zone ramps from soft to loud);
 * swung notes at the middle of the goal's range; pocket notes at their target; improvised zones filled with toms.
 */
function take(d: Drill, bpm: number, sd = 0, seed = 3): DrumTakeHit[] {
  const g = noise(seed);
  const goal = d.goal.drum ?? {};
  const sw = goal.swing ? (goal.swing.lo + goal.swing.hi) / 2 : 0.65;
  const velOf = (beat: number, ghost?: boolean, accent?: boolean) => {
    const z = goal.swell?.zones.find((x) => beat >= x.from - 1e-6 && beat < x.to - 1e-6);
    if (z) {
      const f = (beat - z.from) / (z.to - z.from);
      return Math.round(z.dir > 0 ? 40 + 75 * f : 115 - 75 * f);
    }
    return ghost ? 34 : accent ? 116 : 78;
  };
  const pocketOf = (beat: number, voice?: string): number => {
    const pk = goal.pocket;
    if (!pk) return 0;
    if (pk.zones) return pk.zones.find((z) => beat >= z.from - 1e-6 && beat < z.to - 1e-6)?.ms ?? 0;
    if (pk.voices) return voice && pk.voices.includes(voice as never) ? (pk.ms ?? 0) : 0;
    return pk.ms ?? 0;
  };
  const hits: DrumTakeHit[] = d.notes.flatMap((n) => {
    const j = sd ? g() * sd : 0;
    const b0 = Math.floor(n.beat + 1e-6);
    const on = (n.swing ? expTimeMs(d, b0, bpm) + sw * (expTimeMs(d, b0 + 1, bpm) - expTimeMs(d, b0, bpm)) : expTimeMs(d, n.beat, bpm)) + pocketOf(n.beat, n.voice);
    const graces: DrumTakeHit[] = Array.from({ length: n.grace ?? 0 }, (_, k) => ({ voice: n.voice!, on: on + j - 25 * ((n.grace ?? 0) - k), vel: 40 }));
    return [...graces, { voice: n.voice!, on: on + j, vel: velOf(n.beat, n.ghost, n.accent), open: n.voice === 'hhOpen' ? 1 : 0, hat: n.voice === 'hhOpen' ? 'open' : n.voice === 'hihat' ? 'closed' : null } as DrumTakeHit];
  });
  for (const [a, b] of goal.impro?.zones ?? []) for (let x = a; x < b - 1e-6; x += 0.5) hits.push({ voice: 'tom2', on: expTimeMs(d, x, bpm), vel: 80 });
  return hits;
}
const judge = (d: Drill, bpm: number, hits: DrumTakeHit[]) => analyzeDrumTake(d, bpm, hits);
const all = (): Drill[] => NEW.flatMap((lv) => levelDrills(lv, 'fifths-up'));

describe('the rest of the curriculum: catalogue', () => {
  it('34 curriculum levels: strokes 8, rolls 10, diddles 10, time 9, rock 9, funk 8, shuffle 8, fills 8, indep 8, feet 8, read 11', () => {
    const n = (id: string) => FAMS.find((f) => f.id === id)!.levels.length;
    expect(['d-strokes', 'd-rolls', 'd-diddles', 'd-time', 'd-rock', 'd-funk', 'd-shuffle', 'd-fills', 'd-indep', 'd-feet', 'd-read'].map(n)).toEqual([8, 10, 10, 9, 9, 8, 8, 8, 8, 8, 11]);
    // 33 built here; F14 L6 (a kit groove + fill) is d-read 10.
    expect(NEW.length).toBe(33);
  });
  it('every drum family numbers its levels 1..n (no gaps: placement caps by count)', () => {
    for (const f of FAMS) expect(f.levels.map((l) => l.level), f.id).toEqual(f.levels.map((_, i) => i + 1));
  });
  it('every item generates, every note inside the take and inside its bar; each lane of a bar sums to at most the meter', () => {
    for (const d of all()) {
      expect(d.notes.length, d.itemId).toBeGreaterThan(3);
      const m = d.meter;
      for (const n of d.notes) {
        expect(n.beat + n.dur, d.itemId).toBeLessThanOrEqual(d.beats + 1e-6);
        const end = (Math.floor(n.beat / m + 1e-9) + 1) * m;
        expect(n.beat + n.dur, `${d.itemId} @${n.beat}`).toBeLessThanOrEqual(end + 1e-6);
      }
      const lanes = new Map<string, number>();
      for (const n of d.notes) {
        const k = `${n.voice}:${Math.floor(n.beat / m + 1e-9)}`;
        lanes.set(k, (lanes.get(k) ?? 0) + n.dur);
      }
      for (const [k, sum] of lanes) expect(sum, `${d.itemId} ${k}`).toBeLessThanOrEqual(m + 1e-6);
    }
  });
  it('microphone (pad) levels are single-surface; the rest need the kit', () => {
    for (const lv of NEW) for (const d of levelDrills(lv, 'fifths-up')) if (lv.mic) expect(d.notes.every((n) => n.voice === 'snare'), d.itemId).toBe(true);
  });
  it('every new level is a drums path step, after the family’s earlier levels; none on an acoustic kit before a real-kit check', () => {
    const steps = new Map(stepCatalogue().map((s) => [s.id, s]));
    for (const lv of NEW) {
      const st = steps.get(`tech:${lv.id}`)!;
      expect(st, lv.id).toBeTruthy();
      expect(st.forPlays).toContain('drums');
      const prev = steps.get(`tech:${lv.id.replace(/-\d+$/, '')}-${lv.level - 1}`)!;
      expect(st.difficulty, lv.id).toBeGreaterThan(prev.difficulty);
      expect(ACOUSTIC_LEVELS.has(lv.id), lv.id).toBe(false);
    }
  });
});

describe('takes', () => {
  it('a take as written is clean for every item (at the start and the target tempo)', () => {
    for (const lv of NEW)
      for (const d of levelDrills(lv, 'fifths-up'))
        for (const bpm of [lv.tempo![0], lv.tempo![1]]) {
          const m = judge(d, bpm, take(d, bpm));
          expect(m.verdict, `${d.itemId} @${bpm}: ${m.drum!.missed.join(',')}`).toBe('clean');
        }
  });
  it('a human take (jitter 0.4 × the tier SD) is clean or almost', () => {
    for (const d of all())
      for (const seed of [5, 11]) {
        const bpm = d.startBpm;
        const sd = 0.4 * DRUM_TIERS[d.drum!.tier].sd;
        const m = judge(d, bpm, take(d, bpm, d.goal.drum?.pocket ? Math.min(sd, 4) : sd, seed));
        expect(m.verdict, `${d.itemId}: ${m.drum!.missed.join(',')}`).not.toBe('not');
      }
  });
  it('the swell: flat strokes fail, the wrong direction fails', () => {
    const d = gen('d-strokes', '7:swell', 0);
    const flat = take(d, 70).map((h) => ({ ...h, vel: 78 }));
    expect(judge(d, 70, flat).drum!.missed.some((x) => x.startsWith('swell'))).toBe(true);
    const rev = take(d, 70).map((h) => ({ ...h, vel: 155 - h.vel }));
    expect(judge(d, 70, rev).verdict).toBe('not');
  });
  it('the pocket: on the grid when asked to lay back fails; the lazy snare alone is judged', () => {
    const d = gen('d-time', '8:pocket', 0);
    const grid = d.notes.map((n) => ({ voice: n.voice!, on: expTimeMs(d, n.beat, 90), vel: 78 }));
    const m = judge(d, 90, grid);
    expect(m.drum!.missed).toContain('pocket');
    expect(Math.round(m.drum!.pocketMean!)).toBe(0);
    const zones = gen('d-time', '8:pocket', 2);
    expect(judge(zones, 90, take(zones, 90)).verdict).toBe('clean');
    const bb = gen('d-funk', '7:boombap', 0);
    const onGrid = bb.notes.map((n) => ({ voice: n.voice!, on: expTimeMs(bb, n.beat, 85), vel: 78 }));
    expect(judge(bb, 85, onGrid).drum!.missed).toContain('pocket');
    // Laying everything back (not just the snare) moves the hat and kick off the grid: the timing rules catch it.
    const allBack = bb.notes.map((n) => ({ voice: n.voice!, on: expTimeMs(bb, n.beat, 85) + 25, vel: 78 }));
    expect(judge(bb, 85, allBack).verdict).not.toBe('clean');
  });
  it('endurance: a take that slows down or loosens towards the end fails', () => {
    const d = gen('d-rolls', '9:endure', 0);
    const slow = take(d, 100).map((h) => ({ ...h, on: h.on * 1.03 }));
    expect(judge(d, 100, slow).drum!.missed.some((x) => x.startsWith('endure') || x.startsWith('mean') || x === 'hit')).toBe(true);
    const g = noise(9);
    const n = take(d, 100).length;
    const loose = take(d, 100).map((h, i) => ({ ...h, on: h.on + g() * (i > (2 * n) / 3 ? 14 : 3) }));
    expect(judge(d, 100, loose).drum!.missed).toContain('endure');
  });
  it('the double pedal: a weak foot (every other kick soft) fails the balance; uneven feet fail the evenness', () => {
    const d = gen('d-feet', '6:dpedal', 1);
    let k = 0;
    const weak = take(d, 80).map((h) => (h.voice === 'kick' ? { ...h, vel: k++ % 2 ? 50 : 90 } : h));
    expect(judge(d, 80, weak).drum!.missed).toContain('altVel');
    let q = 0;
    const limp = take(d, 80).map((h) => (h.voice === 'kick' ? { ...h, on: h.on + (q++ % 2 ? 28 : 0) } : h));
    expect(judge(d, 80, limp).drum!.missed).toContain('altCv');
  });
  it('an improvised fill: nothing in the empty beats fails; any drums there pass', () => {
    const d = gen('d-fills', '8:free', 0);
    const empty = take(d, 90).filter((h) => h.voice !== 'tom2');
    expect(judge(d, 90, empty).drum!.missed.some((x) => x.startsWith('impro'))).toBe(true);
    expect(judge(d, 90, take(d, 90)).verdict).toBe('clean');
  });
  it('the swing dial: a triplet swing fails the 55 % item', () => {
    const d = gen('d-shuffle', '5:dial', 0);
    const tri = d.notes.map((n) => ({ voice: n.voice!, on: n.swing ? expTimeMs(d, Math.floor(n.beat), 100) + 0.667 * 600 : expTimeMs(d, n.beat, 100), vel: 78 }));
    expect(judge(d, 100, tri).drum!.missed).toContain('swing');
  });
  it('the click on 1 every other bar: the click plan sounds only bar 1 of each pair, and the silent bars are measured', () => {
    const d = gen('d-time', '9:one', 1);
    const plan = clickPlan(d, 80);
    const heard = plan.clicks.filter((c) => !c.silent).map((c) => Math.round((c.t * 80) / 60));
    // Count-in (4 beats) heard, then beat 0, 8, 16 ... of the drill.
    expect(heard.slice(0, 4)).toEqual([0, 1, 2, 3]);
    expect(heard.slice(4, 8)).toEqual([4, 12, 20, 28]);
    const late = take(d, 80).map((h) => ({ ...h, on: Math.floor(h.on / 3000) % 2 ? h.on + 30 : h.on }));
    expect(judge(d, 80, late).drum!.gapMean).not.toBeNull();
  });
  it('the swung 16ths (go-go) sit on the sextuplet grid: e at 1/3, a at 5/6', () => {
    const d = gen('d-funk', '8:gogo', 0);
    const fr = new Set(d.notes.map((n) => Math.round((n.beat % 1) * 6)));
    for (const x of fr) expect([0, 2, 3, 5]).toContain(x);
  });
});

describe('games P2: Time Lock and Ghost Control', () => {
  const tiers = ['pp', 'p', 'mp', 'mf', 'f', 'ff'] as const;
  it('every tier and round builds; a take as written passes; one surface (a pad can play it)', () => {
    for (const g of ['time-lock', 'ghost-control'] as const)
      for (const tier of tiers)
        for (let round = 0; round < 5; round++) {
          const r = drumRound(g, tier, round, 7);
          expect(r.drill.notes.every((n) => n.voice === 'snare'), `${g} ${tier}`).toBe(true);
          for (const n of r.drill.notes) expect(n.beat + n.dur).toBeLessThanOrEqual(r.drill.beats + 1e-6);
          const s = scoreRound(r, analyzeDrumTake(r.drill, r.bpm, take(r.drill, r.bpm)));
          expect(s.ok, `${g} ${tier} ${round}: ${s.line.en}`).toBe(true);
        }
  });
  it('Time Lock: drifting late in the silent bars fails the round', () => {
    const r = drumRound('time-lock', 'mf', 3, 7);
    const beatMs = 60000 / r.bpm;
    const late = take(r.drill, r.bpm).map((h) => {
      const bar = Math.floor(h.on / (4 * beatMs));
      return bar >= r.lock!.on && bar < r.lock!.on + r.lock!.off ? { ...h, on: h.on + 40 } : h;
    });
    expect(scoreRound(r, analyzeDrumTake(r.drill, r.bpm, late)).ok).toBe(false);
  });
  it('Ghost Control: every stroke at one level fails', () => {
    const r = drumRound('ghost-control', 'mf', 0, 7);
    const flat = take(r.drill, r.bpm).map((h) => ({ ...h, vel: 78 }));
    expect(scoreRound(r, analyzeDrumTake(r.drill, r.bpm, flat)).ok).toBe(false);
  });
});

describe('sloppy takes and the short kit setup', () => {
  it('a sloppy take (jitter 2 × the tier SD) is never clean', () => {
    for (const d of all()) {
      const sd = 2 * DRUM_TIERS[d.drum!.tier].sd;
      expect(judge(d, d.startBpm, take(d, d.startBpm, sd, 4)).verdict, d.itemId).not.toBe('clean');
    }
  });
  it('the course-start setup learns snare, kick and hi-hat only; the full wizard is unchanged', () => {
    expect(QUICK_PADS.map((p) => p.voice)).toEqual(['snare', 'kick', 'hihat']);
    let w = wizardStart();
    for (const n of [38, 38, 36, 36, 42, 42]) w = wizardHit(w, n, 90, QUICK_PADS);
    expect(wizardDone(w, QUICK_PADS)).toBe(true);
    expect(w.map).toEqual({ 38: 'snare', 36: 'kick', 42: 'hihat' });
    expect(wizardDone(w)).toBe(false);
    expect(WIZARD_PADS.length).toBeGreaterThan(QUICK_PADS.length);
  });
});
