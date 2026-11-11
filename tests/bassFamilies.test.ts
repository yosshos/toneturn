import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog, GUITAR_PROBES, guitarItemId, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { levelKeys, shownFamilies, withBassTuning, levelDrills } from '../src/engine/drills/plan';
import { tuningById, TUNINGS } from '../src/engine/fretboard';
import { crossingPenalty, ghostGapDb, kickLock, lengthClass, lengthMatch, loudSdDb, oddEvenAsym, releaseTime, walkRules, type WalkChord } from '../src/engine/drills/bassAnalyze';
import { analyzeGuitarTake, type GFrame } from '../src/engine/drills/guitarAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const ORDER = ['b-pluck', 'b-time', 'b-fret', 'b-chord', 'b-ear', 'b-scale', 'b-length', 'b-pocket', 'b-read', 'b-posread', 'b-styles', 'b-ghost', 'b-walk', 'b-impro', 'b-swing', 'b-barry', 'b-jform', 'b-latin', 'b-std', 'b-legato', 'b-ext', 'b-pick', 'b-odd', 'b-prog', 'b-poly', 'b-slap', 'b-up-pos', 'b-up-arco', 'b-up-scales', 'b-up-pizz', 'b-up-walk', 'b-up-read'];
const BASS = guitarCatalog().filter((f) => f.id.startsWith('b-'));
const TUNE_IDS = ['bass', 'bass5', 'bass6', 'bass-dropd'];

describe('bass course families', () => {
  it('has the families in teaching order (bass ear after chords, the upright track last), bass only, with ≥ 3 levels each', () => {
    expect(BASS.map((f) => f.id)).toEqual(ORDER);
    for (const f of BASS) {
      expect(f.instruments).toEqual(['bass']);
      expect(f.levels.length).toBeGreaterThanOrEqual(f.id.startsWith('b-up-') ? 3 : 5);
      expect(f.title.he.length).toBeGreaterThan(0);
    }
    expect(BASS.reduce((n, f) => n + f.levels.length, 0)).toBeGreaterThanOrEqual(118);
  });

  it('level ids are unique, numbered in order, titled in English and Hebrew, start ≤ target tempo', () => {
    const ids = guitarCatalog().flatMap((f) => f.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of BASS)
      f.levels.forEach((l: GuitarLevelDef, i) => {
        expect(l.level).toBe(i + 1);
        expect(l.title.en.length).toBeGreaterThan(2);
        expect(/[֐-׿]/.test(l.title.he)).toBe(true);
        expect(l.tempo).toBeDefined();
        expect(l.tempo![0]).toBeLessThanOrEqual(l.tempo![1]);
        expect(l.sub).toBeTruthy();
        expect(l.specs.length).toBeGreaterThan(0);
      });
  });

  it('every level generates for every key of its list, inside the neck, on 4-, 5-, 6-string and drop D', () => {
    for (const f of BASS)
      for (const l of f.levels)
        for (const [ki, key] of levelKeys(l, 'fifths-up').entries())
          for (const sp of l.specs)
            // Every key on the 4-string; the first two keys on 5-, 6-string and drop D.
            for (const tid of sp.tuning ? [sp.tuning] : ki < 2 ? TUNE_IDS : ['bass']) {
              const d = generate({ ...sp, key, tuning: tid });
              const tu = tuningById(tid);
              const where = `${l.id} ${sp.kind}#${sp.option ?? 0} key ${key} ${tid}`;
              expect(d.notes.length, where).toBeGreaterThan(3);
              expect(d.spec.instrument, where).toBe('bass');
              expect(Number.isFinite(d.beats) && d.beats > 0, where).toBe(true);
              for (const n of d.notes) {
                expect(n.string, where).toBeGreaterThanOrEqual(1);
                expect(n.string, where).toBeLessThanOrEqual(tu.open.length);
                expect(n.fret, where).toBeGreaterThanOrEqual(0);
                expect(n.fret, where).toBeLessThanOrEqual(24);
                expect(n.pitch, where).toBeGreaterThanOrEqual(tu.open[tu.open.length - 1]);
                // Harmonics (b-ext 1–2) sound above the fretted range: the 4th and 3rd fret partials.
                if (n.technique !== 'harmonic') expect(n.pitch, where).toBeLessThanOrEqual(tu.open[0] + 24);
                expect(n.beat, where).toBeGreaterThanOrEqual(0);
                expect(n.dur, where).toBeGreaterThan(0);
                if (n.technique !== 'harmonic') expect(n.pitch, where).toBe(tu.open[n.string! - 1] + n.fret!);
              }
            }
  }, 120000);

  it('start tempo of a new item is the level start tempo', () => {
    const lv = BASS.find((f) => f.id === 'b-walk')!.levels[0];
    const d = levelDrills(lv, 'fifths-up')[0];
    expect(d.startBpm).toBe(lv.tempo![0]);
  });

  it('shownFamilies for bass: all 14 course families, and the retired g-bass is hidden but kept', () => {
    const shown = shownFamilies({ emphasis: 'both', instrument: 'bass' }).map((f) => f.id);
    expect(shown).toEqual(ORDER);
    expect(shownFamilies({ emphasis: 'both', instrument: 'bass', guitarStyle: 'all' }).map((f) => f.id)).toEqual(ORDER);
    expect(guitarCatalog().find((f) => f.id === 'g-bass')?.levels.length).toBe(6);
    // A genre filter keeps every family; only the style levels of other genres drop out.
    const rock = shownFamilies({ emphasis: 'both', instrument: 'bass', guitarStyle: 'rock' });
    expect(rock.find((f) => f.id === 'b-styles')!.levels.every((l) => (l as GuitarLevelDef).genres?.some((g) => g === 'rock' || g === 'all'))).toBe(true);
    // 20 walking levels (19–20 the jazz waltz, BASS_NICHE_PLAN J5) less the 4 old standards levels retired for the ladder
    // (11/13/14/18, owner 2026-11-11); the low-B one (L17) only on a bass with a low B (N10).
    expect(shownFamilies({ emphasis: 'both', instrument: 'bass', guitarStyle: 'rock', bassTuning: 'bass5' }).find((f) => f.id === 'b-walk')!.levels.length).toBe(16);
    expect(rock.find((f) => f.id === 'b-walk')!.levels.length).toBe(15);
  });

  it('the tuning only moves notes: item ids ignore it, withBassTuning rebuilds on the player\'s bass', () => {
    const sp = BASS[0].levels[3].specs[0];
    expect(guitarItemId({ ...sp, key: 4, tuning: 'bass5' })).toBe(guitarItemId({ ...sp, key: 4 }));
    expect(TUNINGS.filter((t) => t.instrument === 'bass').map((t) => t.id)).toEqual([...TUNE_IDS, 'bass-fretless', 'upright']);
    expect(tuningById('bass5').open).toEqual([43, 38, 33, 28, 23]);
    expect(tuningById('bass6').open).toEqual([48, 43, 38, 33, 28, 23]);
    expect(tuningById('bass-dropd').open).toEqual([43, 38, 33, 26]);
    const ds = levelDrills(BASS.find((f) => f.id === 'b-scale')!.levels[1], 'fifths-up').slice(0, 2);
    const five = withBassTuning(ds, 'bass5');
    expect(five[0].spec.tuning).toBe('bass5');
    expect(five[0].itemId).toBe(ds[0].itemId);
    expect(withBassTuning(ds, 'standard')).toBe(ds);
    expect(withBassTuning(ds, undefined)).toBe(ds);
  });

  it('placement probes: the tasks of section 6, each placing its own family', () => {
    const probes = GUITAR_PROBES.filter((p) => p.instruments.includes('bass'));
    const placed = new Set(probes.flatMap((p) => [p.family, ...(p.seeds ?? [])]));
    for (const f of ['b-time', 'b-pocket', 'b-chord', 'b-fret', 'b-scale', 'b-pluck', 'b-walk']) expect(placed.has(f as never), f).toBe(true);
    for (const p of probes) {
      const d = generate(p.spec);
      expect(d.notes.length).toBeGreaterThan(3);
      expect(ORDER).toContain(p.family);
    }
  });

  it('time drills carry their click mode; kick drills follow the groove', () => {
    const tm = BASS.find((f) => f.id === 'b-time')!;
    expect(generate({ ...tm.levels[3].specs[0], key: 4 }).click).toBe('24');
    expect(generate({ ...tm.levels[4].specs[0], key: 4 }).click).toBe('and');
    expect(generate({ ...tm.levels[6].specs[0], key: 4 }).click).toBe('fade');
    const k = generate({ family: 'b-pocket', kind: 'kick', key: 4, hands: 'R', option: 0 });
    // rock-8: kicks on 1 and 3 → two notes a bar
    expect(k.notes.filter((n) => n.beat < 4).map((n) => n.beat)).toEqual([0, 2]);
    expect(k.goal.bass?.kick).toBe(25);
  });

  it('walking lines: chord tones on beat 1 and approaches on beat 4', () => {
    const d = generate({ family: 'b-walk', kind: 'chrom', key: 0, hands: 'R', perBeat: 1 });
    // Dm7 – G7 – Cmaj7: beat 4 of bar 1 is a half step from G
    const b4 = d.notes.find((n) => n.beat === 3)!.pitch;
    expect([6, 8]).toContain(((b4 % 12) + 12) % 12);
    expect(d.chart?.slice(0, 3)).toEqual(['Dm7', 'G7', 'Cmaj7']);
  });
});

describe('bass measures (pure)', () => {
  it('oddEvenAsym: a lazy second finger shows; even playing does not', () => {
    const even = Array.from({ length: 16 }, (_, i) => i * 250);
    expect(oddEvenAsym(even)!.ms).toBe(0);
    const limp = Array.from({ length: 16 }, (_, i) => i * 250 + (i % 2 ? 20 : 0));
    expect(oddEvenAsym(limp)!.ms).toBeCloseTo(40, 5);
    const loud = Array.from({ length: 16 }, (_, i) => (i % 2 ? 0.5 : 1));
    expect(oddEvenAsym(even, loud)!.db).toBeCloseTo(6.02, 1);
    expect(oddEvenAsym([0, 250, 500])).toBeNull();
  });

  it('loudSdDb', () => {
    expect(loudSdDb([1, 1, 1, 1])).toBe(0);
    expect(loudSdDb([1, 0.5, 1, 0.5])).toBeCloseTo(3.01, 1);
    expect(loudSdDb([1, 1])).toBeNull();
  });

  it('crossingPenalty: late crossings vs steady same-string notes', () => {
    expect(crossingPenalty([0, 5, 30, 5, 30], [4, 4, 3, 3, 2])).toBeCloseTo(25, 5);
    expect(crossingPenalty([0, 5, 5], [4, 4, 4])).toBeNull();
  });

  it('kickLock: share of kicks matched and stray notes', () => {
    expect(kickLock([0, 500, 1000, 1500], [3, 510, 1040, 1490, 1250], 25)).toEqual({ lock: 0.75, stray: 2 });
    expect(kickLock([], [1])).toEqual({ lock: 0, stray: 1 });
  });

  it('releaseTime, lengthClass and lengthMatch', () => {
    const frames: GFrame[] = Array.from({ length: 50 }, (_, i) => ({ t: i * 10, hz: 41, rms: i * 10 < 120 ? 1 : 0.05 }));
    expect(releaseTime(frames, 0, 490)).toBe(120);
    expect(lengthClass(0.25, 0.5)).toBe('short');
    expect(lengthClass(0.5, 0.5)).toBe('full');
    expect(lengthMatch([{ want: 'short', ratio: 0.4 }, { want: 'full', ratio: 0.9 }, { want: 'full', ratio: 0.5 }, { want: 'short', ratio: 0.9 }])).toBe(0.5);
    expect(lengthMatch([])).toBeNull();
  });

  it('ghostGapDb', () => {
    expect(ghostGapDb([0.1, 0.1], [1, 1])).toBeCloseTo(20, 5);
    expect(ghostGapDb([], [1])).toBeNull();
  });

  it('walkRules: labels chord tones and approaches, finds the first wrong downbeat', () => {
    const Dm7: WalkChord = { root: 2, iv: [0, 3, 7, 10] };
    const G7: WalkChord = { root: 7, iv: [0, 4, 7, 10] };
    const C: WalkChord = { root: 0, iv: [0, 4, 7, 11] };
    const at = (b: number) => [Dm7, G7, C][Math.min(2, Math.floor(b / 4))];
    const good = walkRules([38, 41, 45, 44, 43, 47, 50, 49, 48, 52, 55, 52], at);
    expect(good.labels.slice(0, 4)).toEqual(['R', '3', '5', 'chromatic']);
    expect(good.labels[7]).toBe('chromatic');
    expect(good.beat1Ct).toBe(1);
    expect(good.approach).toBe(1);
    expect(good.worst).toBe(-1);
    const bad = walkRules([38, 41, 45, 44, 44, 47, 50, 49, 48, 52, 55, 52], at);
    expect(bad.beat1Ct).toBeCloseTo(2 / 3, 5);
    expect(bad.worst).toBe(4);
    expect(bad.repeats).toBeGreaterThan(0);
  });
});

describe('bass rules in the take analysis', () => {
  const perfect = (d: Drill, bpm: number, shift = (_i: number) => 0): PlayedNote[] => d.notes.map((n, i) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) + shift(i), off: null, vel: 80 }));

  it('a clean even take passes; a limping second finger is held back (never raised)', () => {
    const d = generate({ family: 'b-pluck', kind: 'open', key: 4, hands: 'R', option: 1 });
    const ok = analyzeGuitarTake(d, 80, perfect(d, 80));
    expect(ok.guitar.bass?.asym?.ms ?? 0).toBeLessThan(1);
    const limp = analyzeGuitarTake(d, 80, perfect(d, 80, (i) => (i % 2 ? 14 : 0)));
    expect(limp.guitar.bass?.asym?.ms).toBeGreaterThan(8);
    expect(limp.verdict).not.toBe('clean');
  });

  it('kick lock: notes far from the kick lower the verdict', () => {
    const d = generate({ family: 'b-pocket', kind: 'kick', key: 4, hands: 'R', option: 1 });
    const late = analyzeGuitarTake(d, 90, perfect(d, 90, (i) => (i % 3 === 0 ? 45 : 0)));
    expect(late.guitar.bass?.kick?.lock).toBeLessThan(0.9);
    expect(late.verdict).not.toBe('clean');
  });
});
