import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { DRUM_PROBES, drumFamilies, drumProbes, placeDrums, type DrumLevelDef } from '../src/engine/drills/drums';
import { analyzeDrumTake, drumLimbLine, drumWindow, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { familyById, levelDrills, levelOfDrill, levelStars, LEVEL_DONE_STARS, shownFamilies, targetBpmOf, todayDrills } from '../src/engine/drills/plan';
import { drillEvents, isDrumDrill } from '../src/engine/drills/events';
import { DEFAULT_DRILL_SETTINGS, type Drill, type ItemState } from '../src/engine/drills/types';
import { VOICE_NOTE } from '../src/engine/drumKit';

const FAMS = drumFamilies();
const V1: Record<string, number> = { 'd-strokes': 5, 'd-rolls': 6, 'd-diddles': 4, 'd-time': 6, 'd-rock': 8, 'd-fills': 5, 'd-read': 5 };
const HE = /[֐-׿]/;
const allDrills = (): { lv: DrumLevelDef; d: Drill }[] => FAMS.flatMap((f) => f.levels.flatMap((lv) => levelDrills(lv, 'fifths-up').map((d) => ({ lv, d }))));

/** A perfect take: every note on time, the right voice, velocities in their bands, the hat open where written. */
export function perfectHits(d: Drill, bpm: number): DrumTakeHit[] {
  return d.notes.map((n) => ({
    voice: n.voice ?? 'snare',
    on: expTimeMs(d, n.beat, bpm),
    vel: n.ghost ? 35 : n.accent ? 116 : n.dyn === 'p' ? 45 : n.dyn === 'f' ? 112 : 78,
    open: n.voice === 'hhOpen' ? 1 : 0,
    hat: n.voice === 'hhOpen' ? 'open' : n.voice === 'hihat' ? 'closed' : null,
  }));
}

describe('drums v1 catalogue (DRUMS_CURRICULUM §4.3)', () => {
  it('has the seven v1 families with the v1 level counts, in the drums instrument only', () => {
    expect(FAMS.map((f) => f.id)).toEqual(Object.keys(V1));
    for (const f of FAMS) {
      expect(f.levels.length, f.id).toBe(V1[f.id]);
      expect(f.instruments).toEqual(['drums']);
      expect(HE.test(f.title.he)).toBe(true);
    }
    // In the shared catalogue, found by id, and only for the drums instrument.
    expect(guitarCatalog().filter((f) => f.id.startsWith('d-')).length).toBe(7);
    expect(familyById('d-rock')?.levels.length).toBe(8);
    expect(shownFamilies({ emphasis: 'both', instrument: 'drums' }).map((f) => f.id)).toEqual(Object.keys(V1));
    expect(shownFamilies({ emphasis: 'both', instrument: 'bass' }).some((f) => f.id.startsWith('d-'))).toBe(false);
  });

  it('every level: numbered in order, Hebrew title, start ≤ target tempo, ≥ 3 variants that all generate', () => {
    for (const f of FAMS)
      f.levels.forEach((lv, i) => {
        expect(lv.level).toBe(i + 1);
        expect(HE.test(lv.title.he), lv.id).toBe(true);
        expect(lv.tempo![0]).toBeLessThanOrEqual(lv.tempo![1]);
        expect(lv.specs.length, lv.id).toBeGreaterThanOrEqual(3);
        const ds = levelDrills(lv, 'fifths-up');
        expect(ds.length).toBe(lv.specs.length);
        for (const d of ds) {
          expect(d.notes.length, d.itemId).toBeGreaterThan(3);
          expect(HE.test(d.title.he), d.itemId).toBe(true);
          expect(d.startBpm).toBe(lv.tempo![0]);
          expect(targetBpmOf(lv, d)).toBe(lv.tempo![1]);
          expect(levelOfDrill(d)?.id).toBe(lv.id);
          expect(isDrumDrill(d)).toBe(true);
          for (const n of d.notes) {
            expect(n.voice).toBeDefined();
            expect(n.pitch).toBe(VOICE_NOTE[n.voice!]);
            expect(n.beat).toBeLessThan(d.beats + 1e-6);
          }
        }
      });
  });

  it('item ids are unique; mic-OK levels are single-surface (snare only), grooves need a kit', () => {
    const ids = allDrills().map((x) => x.d.itemId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { lv, d } of allDrills()) {
      expect(d.drum?.mic).toBe(lv.mic);
      if (lv.mic) expect(d.notes.every((n) => n.voice === 'snare'), d.itemId).toBe(true);
    }
    const mic = shownFamilies({ emphasis: 'both', instrument: 'drums', drumMic: true });
    expect(mic.map((f) => f.id)).toEqual(['d-strokes', 'd-rolls', 'd-diddles', 'd-time', 'd-read']);
    expect(mic.find((f) => f.id === 'd-read')!.levels.length).toBe(4);
  });

  it('tiers follow the level (L1–3 beginner, L4–7 intermediate, L8 advanced); fills land on 1 with crash + kick', () => {
    const lv = (id: string) => FAMS.flatMap((f) => f.levels).find((l) => l.id === id)!;
    expect(levelDrills(lv('d-rock-1'), 'fifths-up')[0].drum?.tier).toBe(1);
    expect(levelDrills(lv('d-rock-5'), 'fifths-up')[0].drum?.tier).toBe(2);
    expect(levelDrills(lv('d-rock-8'), 'fifths-up')[0].drum?.tier).toBe(3);
    for (const d of levelDrills(lv('d-fills-3'), 'fifths-up')) {
      for (const b of [16, 32]) {
        const at = d.notes.filter((n) => n.beat === b).map((n) => n.voice);
        expect(at).toContain('crash');
        expect(at).toContain('kick');
        expect(at.filter((v) => v === 'kick').length).toBe(1);
      }
      expect(d.goal.drum?.landing?.beats).toEqual([16, 32]);
    }
    // Gap-click levels carry their click plan; reading shows notation.
    expect(levelDrills(lv('d-time-5'), 'fifths-up')[0].gap).toEqual([1, 3]);
    expect(levelDrills(lv('d-read-5'), 'fifths-up')[0].show).toBe('staff');
  });

  it('a drum take rates drum technique plus a timing share', () => {
    const d = generate({ family: 'd-time', kind: '4:gap22', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const m = analyzeDrumTake(d, 80, perfectHits(d, 80));
    const ev = drillEvents(d, m, '2026-11-09T10:00:00Z', 's', 0)[0];
    expect(ev.tags?.map((x) => x.sub)).toEqual(['instrument/drum-tech', 'timing/gap']);
  });
});

describe('drum take analysis', () => {
  it('a synthetic perfect MIDI take is clean for every v1 item, at the start and at the target tempo', () => {
    for (const { lv, d } of allDrills())
      for (const bpm of [lv.tempo![0], lv.tempo![1]]) {
        const m = analyzeDrumTake(d, bpm, perfectHits(d, bpm));
        expect(m.verdict, `${d.itemId} @${bpm}: ${m.why.en} ${m.drum?.missed.join(',')}`).toBe('clean');
        expect(m.drum!.hitRate).toBe(1);
      }
  });

  it('a late kick is not clean (and the feedback names the kick)', () => {
    const d = generate({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const hits = perfectHits(d, 90).map((h) => (h.voice === 'kick' ? { ...h, on: h.on + 40 } : h));
    const m = analyzeDrumTake(d, 90, hits);
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/Kick 40 ms late/);
    expect(drumLimbLine(m.drum!, m.wrong, 'en')).toMatch(/Kick 40 ms late/);
    expect(drumLimbLine(m.drum!, m.wrong, 'en')).toMatch(/Hi-hat on time/);
  });

  it('a little late is almost; within the tier is clean', () => {
    const d = generate({ family: 'd-rock', kind: '1:rock', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const shift = (ms: number) => perfectHits(d, 90).map((h) => (h.voice === 'kick' ? { ...h, on: h.on + ms } : h));
    expect(analyzeDrumTake(d, 90, shift(15)).verdict).toBe('clean');
    expect(analyzeDrumTake(d, 90, shift(29)).verdict).toBe('almost');
  });

  it('ghost notes played too loud are not clean', () => {
    const lv = FAMS.find((f) => f.id === 'd-read')!.levels[3];
    const d = levelDrills(lv, 'fifths-up').find((x) => x.notes.filter((n) => n.ghost).length >= 2)!;
    expect(d).toBeDefined();
    const loud = perfectHits(d, 60).map((h, i) => (d.notes[i].ghost ? { ...h, vel: 100 } : h));
    const m = analyzeDrumTake(d, 60, loud);
    expect(m.verdict).toBe('not');
    expect(m.drum!.missed[0]).toBe('ghost');
    expect(m.why.en).toMatch(/Ghost notes too loud/);
  });

  it('a missing open hat is almost; no open hats at all is not', () => {
    const d = generate({ family: 'd-rock', kind: '3:hats', option: 2, key: 0, hands: 'RL', instrument: 'drums' });
    const opens = d.notes.map((n, i) => (n.voice === 'hhOpen' ? i : -1)).filter((i) => i >= 0);
    expect(opens.length).toBe(8);
    const closeAt = (idx: number[]) => perfectHits(d, 90).map((h, i) => (idx.includes(i) ? { ...h, voice: 'hihat' as const, open: 0, hat: 'closed' as const } : h));
    expect(analyzeDrumTake(d, 90, closeAt([opens[3]])).verdict).toBe('almost');
    const none = analyzeDrumTake(d, 90, closeAt(opens));
    expect(none.verdict).toBe('not');
    expect(none.drum!.hatOpen).toBe(0);
  });

  it('a CC4 kit: the hat note with the pedal half / fully open counts as open', () => {
    const d = generate({ family: 'd-rock', kind: '3:hats', option: 2, key: 0, hands: 'RL', instrument: 'drums' });
    const hits = perfectHits(d, 90).map((h) => (h.voice === 'hhOpen' ? { ...h, voice: 'hihat' as const, open: 0.5, hat: 'half' as const } : h));
    expect(analyzeDrumTake(d, 90, hits).verdict).toBe('clean');
  });

  it('a late landing after the fill is not clean; a missing crash is not', () => {
    const d = generate({ family: 'd-fills', kind: '1:fill1', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const late = perfectHits(d, 90).map((h, i) => (d.notes[i].beat === 16 && (h.voice === 'crash' || h.voice === 'kick') ? { ...h, on: h.on + 35 } : h));
    const m = analyzeDrumTake(d, 90, late);
    expect(m.verdict).not.toBe('clean');
    expect(m.drum!.landing[0]).toBeCloseTo(35, 0);
    const noCrash = perfectHits(d, 90).filter((h, i) => !(d.notes[i].beat === 32 && h.voice === 'crash'));
    expect(analyzeDrumTake(d, 90, noCrash).verdict).toBe('not');
  });

  it('drifting in the silent click bars fails the gap rule', () => {
    const d = generate({ family: 'd-time', kind: '4:gap22', option: 1, key: 0, hands: 'RL', instrument: 'drums' });
    const drift = perfectHits(d, 80).map((h, i) => {
      const bar = Math.floor(d.notes[i].beat / 4);
      return bar % 4 >= 2 ? { ...h, on: h.on + 24 } : h;
    });
    const m = analyzeDrumTake(d, 80, drift);
    expect(m.drum!.gapMean).toBeCloseTo(24, 0);
    expect(m.drum!.missed).toContain('gap');
  });

  it('wrong drums count as wrong voice; extra hits do not steal notes', () => {
    const d = generate({ family: 'd-fills', kind: '3:fill4', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const hits = perfectHits(d, 80).map((h) => (h.voice === 'tom2' ? { ...h, voice: 'tom1' as const } : h));
    const m = analyzeDrumTake(d, 80, hits);
    expect(m.wrong).toBe(8);
    expect(m.verdict).toBe('not');
    const extra = [...perfectHits(d, 80), { voice: 'ride' as const, on: 300, vel: 60 }];
    const m2 = analyzeDrumTake(d, 80, extra);
    expect(m2.drum!.extra).toBe(1);
    expect(m2.verdict).toBe('clean');
  });

  it('doubles: a weak second stroke fails the ratio; accents too soft fail the gap', () => {
    const d = generate({ family: 'd-rolls', kind: '3:doubles8', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const weak = perfectHits(d, 70).map((h, i) => (d.notes[i].dbl === 2 ? { ...h, vel: 40 } : h));
    expect(analyzeDrumTake(d, 70, weak).drum!.missed).toContain('ratio');
    const a = generate({ family: 'd-strokes', kind: '4:accent', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const flat = perfectHits(a, 70).map((h) => ({ ...h, vel: 80 }));
    expect(analyzeDrumTake(a, 70, flat).verdict).toBe('not');
  });

  it('microphone mode: one surface, matched by time only; no velocity data skips the velocity rules', () => {
    const d = generate({ family: 'd-strokes', kind: '1:quarters', option: 2, key: 0, hands: 'RL', instrument: 'drums' });
    const hits = perfectHits(d, 70).map((h) => ({ ...h, voice: null, vel: 64 }));
    expect(analyzeDrumTake(d, 70, hits, { mic: true }).verdict).toBe('clean');
    expect(analyzeDrumTake(d, 70, [], { mic: true }).verdict).toBe('not');
  });

  it('the window tightens with the tempo (22 % of the shortest gap) but not below 1.6 × the tier SD, never past 35 %', () => {
    const d = generate({ family: 'd-rolls', kind: '2:singles16', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(drumWindow(d, 110)).toBeCloseTo(40, 1);
    expect(drumWindow(d, 200)).toBeCloseTo(0.35 * (60000 / 200 / 4), 1);
    const q = generate({ family: 'd-time', kind: '1:pulse', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(drumWindow(q, 60)).toBe(60);
  });
});

describe('five stars on a drum level (0.64 scale)', () => {
  const lv = FAMS.find((f) => f.id === 'd-rock')!.levels[1]; // 4 variants
  const ds = levelDrills(lv, 'fifths-up');
  const passed = (n: number): Record<string, ItemState> =>
    Object.fromEntries(ds.slice(0, n).map((d) => [d.itemId, { itemId: d.itemId, family: d.spec.family, key: 0, hands: 'RL', cleanBpm: lv.tempo![1], goalBpm: lv.tempo![1], streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 3, last: '', history: [], passLog: [{ at: '2026-11-07T10:00:00Z', bpm: lv.tempo![1] }, { at: '2026-11-07T10:05:00Z', bpm: lv.tempo![1] }, { at: '2026-11-08T10:00:00Z', bpm: lv.tempo![1] }] } as ItemState]));
  it('2 = a first variant at the target, 4 = half, 3 = three (done), 5 = all', () => {
    expect(levelStars(lv, passed(1), 'fifths-up')).toBe(2);
    expect(levelStars(lv, passed(2), 'fifths-up')).toBe(4);
    expect(levelStars(lv, passed(3), 'fifths-up')).toBe(4);
    expect(levelStars(lv, passed(4), 'fifths-up')).toBe(5);
    const three = FAMS.find((f) => f.id === 'd-fills')!.levels[0];
    const ds3 = levelDrills(three, 'fifths-up');
    const st = Object.fromEntries(ds3.map((d) => [d.itemId, { ...Object.values(passed(1))[0], itemId: d.itemId }]));
    expect(levelStars(three, st, 'fifths-up')).toBe(5);
    expect(LEVEL_DONE_STARS).toBe(3);
  });
  it('Today offers drum items for a new drummer (strokes, time, grooves)', () => {
    const t = todayDrills({ ...DEFAULT_DRILL_SETTINGS, instrument: 'drums' }, {}, {}, [], 5, '2026-11-09T10:00:00Z');
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((x) => x.drill.spec.family.startsWith('d-'))).toBe(true);
    const mic = todayDrills({ ...DEFAULT_DRILL_SETTINGS, instrument: 'drums', drumMic: true } as never, {}, {}, [], 9, '2026-11-09T10:00:00Z');
    expect(mic.every((x) => x.drill.drum?.mic)).toBe(true);
  });
});

describe('drum placement probe (§5)', () => {
  const fams = FAMS.map((f) => ({ id: f.id, levels: f.levels.length }));
  it('runs the v1 steps (≈ 2.5 min); mic mode runs the snare steps with snare reading', () => {
    expect(DRUM_PROBES.map((p) => p.slot)).toEqual(['pulse', 'hands', 'doubles', 'diddle', 'dynamics', 'groove', 'fill', 'read']);
    const mic = drumProbes(true);
    expect(mic.map((p) => p.slot)).toEqual(['pulse', 'hands', 'doubles', 'diddle', 'dynamics', 'read']);
    expect(mic.every((p) => generate(p.spec).drum?.mic)).toBe(true);
    for (const p of DRUM_PROBES) expect(generate(p.spec).notes.length).toBeGreaterThan(0);
  });
  it('places a beginner at level 1 everywhere and a strong player deep in each family', () => {
    const none = placeDrums({}, fams);
    for (const f of fams) expect(none[f.id]).toBe(1);
    const strong = placeDrums({ pulse: { verdict: 'clean', sd: 8 }, hands: { verdict: 'clean', best: 120 }, doubles: { verdict: 'clean' }, diddle: { verdict: 'clean' }, dynamics: { verdict: 'clean' }, groove: { verdict: 'clean' }, fill: { verdict: 'clean' }, read: { verdict: 'clean', kit: true } }, fams);
    expect(strong).toMatchObject({ 'd-time': 6, 'd-rolls': 5, 'd-diddles': 3, 'd-strokes': 5, 'd-rock': 3, 'd-fills': 4, 'd-read': 5 });
    const mid = placeDrums({ pulse: { verdict: 'clean', sd: 20 }, hands: { verdict: 'clean', best: 95 }, groove: { verdict: 'almost' }, read: { verdict: 'clean' } }, fams);
    expect(mid).toMatchObject({ 'd-time': 4, 'd-rolls': 2, 'd-rock': 2, 'd-read': 3, 'd-strokes': 2 });
  });
});
