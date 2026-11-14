// GUITAR_DEEPENING (owner-approved 2026-11-11): real target tempos, the core path + add-ons, grade ordering, the
// guitarist's ear, jazz 8–12 and Barry Harris on the neck — catalogue, path and synthetic human takes.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { expTimeMs, IOI_FLOOR_MS, npsOf, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { analyzeGuitarTake, type GFrame } from '../src/engine/drills/guitarAnalyze';
import { QUALITY_INTS } from '../src/engine/chordRecognize';
import { guitarCatalog, MAX_FRET, rng, type GuitarFamilyDef, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { GUITAR_META, guitarAddOnsOf } from '../src/engine/drills/guitarMeta';
import { guitarProbesFor, placeGuitar, probeRuns } from '../src/engine/drills/guitarProbes';
import { shownFamilies, targetBpmOf } from '../src/engine/drills/plan';
import { eligible, guitarPathDifficulty, stepCatalogue } from '../src/engine/path';
import { courseInput } from '../src/engine/courses';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS, type Drill, type DrillSettings, type DrillSpec, type PlayedNote } from '../src/engine/drills/types';
import { drillEvents } from '../src/engine/drills/events';

const ALL12 = Array.from({ length: 12 }, (_, i) => i);
const GUITAR = guitarCatalog().filter((f) => f.instruments.includes('guitar') && !f.retired);
const LEVELS: { fam: GuitarFamilyDef; lv: GuitarLevelDef }[] = GUITAR.flatMap((fam) => fam.levels.map((lv) => ({ fam, lv })));
const keysOf = (lv: GuitarLevelDef) => (Array.isArray(lv.keys) ? lv.keys : ALL12);

/** A take: every expected pitch once at its time + seeded jitter (ms SD, clipped at ±2.5 SD). */
function take(d: Drill, bpm: number, sd = 0, seed = 'x'): PlayedNote[] {
  const r = rng(`${d.itemId}:${seed}`);
  const gauss = () => Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())));
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ pitch: n.technique === 'dead' ? -1 : n.pitch, on: expTimeMs(d, n.beat, bpm) + gauss() * sd, off: null, vel: 64 });
  }
  return out.sort((a, b) => a.on - b.on);
}

describe('guitar deepening: catalogue', () => {
  it('131 guitar levels: 79 + ear 10 + jazz 6 + Barry Harris 7 (HARRIS_2: +1) + prog 8 + core 21', () => {
    expect(LEVELS.length).toBe(131);
    const n = (id: string) => GUITAR.find((f) => f.id === id)!.levels.length;
    expect([n('g-ear'), n('g-jazz'), n('g-harris'), n('g-prog')]).toEqual([10, 13, 7, 8]);
    for (const { lv } of LEVELS) expect(lv.title.en.length > 0 && /[֐-׿]/.test(lv.title.he), lv.id).toBe(true);
  });

  it('every guitar level has a start → target, a subdivision, a grade 0–9 and an RSL tag up to grade 8 (§2.3)', () => {
    for (const { lv } of LEVELS) {
      expect(lv.tempo, lv.id).toBeDefined();
      expect(lv.tempo![1], lv.id).toBeGreaterThanOrEqual(lv.tempo![0]);
      expect(lv.sub, lv.id).toBeTruthy();
      expect(lv.grade! >= 0 && lv.grade! <= 9, lv.id).toBe(true);
      if (lv.grade! <= 8) expect(lv.exam?.[0]?.board, lv.id).toBe('RSL');
    }
    // The 0.68 table is complete.
    expect(Object.keys(GUITAR_META).length).toBe(79);
  });

  it('each item climbs to its own target; untimed items (ring checks, harmonics, vibrato) are off the ladder', () => {
    for (const { lv } of LEVELS)
      for (const s of lv.specs) {
        const d = generate({ ...s, key: keysOf(lv)[0] } as DrillSpec);
        const tgt = targetBpmOf(lv, d);
        expect(tgt, d.itemId).toBeGreaterThanOrEqual(d.startBpm);
        if (s.target === 0) expect(tgt, d.itemId).toBe(d.startBpm);
      }
    const ring = generate({ ...GUITAR.find((f) => f.id === 'g-chords')!.levels[0].specs[0], key: 0 } as DrillSpec);
    expect(targetBpmOf(GUITAR.find((f) => f.id === 'g-chords')!.levels[0], ring)).toBe(ring.startBpm);
    // Per-item targets: ska climbs higher than reggae in the same level.
    const r4 = GUITAR.find((f) => f.id === 'g-rhythm')!.levels[3];
    const [reggae, ska] = r4.specs.map((s) => generate({ ...s, key: 7 } as DrillSpec));
    expect(targetBpmOf(r4, reggae)).toBe(90);
    expect(targetBpmOf(r4, ska)).toBe(150);
  });

  it('a steady human take is clean at each item target tempo; a sloppy one (3 × the tier SD) never is', () => {
    const fails: string[] = [];
    const ids = ['g-ear', 'g-harris', 'g-jazz', 'g-fretting', 'g-picking', 'g-legato', 'g-scales', 'g-arps', 'g-chords', 'g-rhythm', 'g-lead', 'g-reading', 'g-impro', 'g-fingerstyle', 'g-flamenco'];
    for (const { fam, lv } of LEVELS) {
      if (!ids.includes(fam.id)) continue;
      for (const s of lv.specs)
        for (const k of keysOf(lv).slice(0, 2)) {
          const d = generate({ ...s, key: k } as DrillSpec);
          const bpm = targetBpmOf(lv, d);
          const nps = npsOf(d, bpm);
          const ioi = 1000 / nps;
          const cv = Math.max(thresholds(tempoBand(nps)).cv, IOI_FLOOR_MS.midi / ioi);
          const jit = Math.min(8, (0.45 * cv * ioi) / Math.SQRT2);
          const good = analyzeGuitarTake(d, bpm, take(d, bpm, jit, 'good'));
          if (good.verdict !== 'clean' && fails.length < 12) fails.push(`${lv.id} ${d.itemId} @${bpm}: ${good.why.en}`);
          const sd = thresholds(tempoBand(nps)).sd;
          const bad = analyzeGuitarTake(d, bpm, take(d, bpm, 3 * sd, 'bad'));
          // Untimed items (ring checks) are judged by what rings, not by time.
          if (s.target !== 0 && bad.verdict === 'clean' && fails.length < 12) fails.push(`${lv.id} ${d.itemId} sloppy take clean`);
        }
    }
    expect(fails).toEqual([]);
  }, 120000);
});

describe("guitar deepening: the guitarist's ear", () => {
  const ear = GUITAR.find((f) => f.id === 'g-ear')!;
  it('every answer is on the neck, every call note sits in a call window, no answer inside one or a beat after it', () => {
    // Every call-and-response drill of the guitar course (the ear, jazz 9, prog 2): the take drops onsets up to 120 ms
    // after a window, so a window must end at least a beat before the answer starts.
    for (const { lv } of LEVELS.filter(({ lv }) => generate({ ...lv.specs[0], key: keysOf(lv)[0] } as DrillSpec).listen || lv.specs.some((s) => generate({ ...s, key: keysOf(lv)[0] } as DrillSpec).listen)))
      for (const s of lv.specs)
        for (const k of keysOf(lv)) {
          const d = generate({ ...s, key: k } as DrillSpec);
          if (!d.listen) continue;
          expect(d.show).toBe('none');
          const w = d.listen!.windows;
          for (const [, z] of w) expect(d.notes.some((n) => n.beat >= z - 1e-6 && n.beat < z + 1 - 1e-6), `${d.itemId} answer right after a window`).toBe(false);
          const inW = (b: number) => w.some(([a, z]) => b >= a - 1e-6 && b < z - 1e-6);
          for (const n of d.notes) {
            expect(n.fret! <= MAX_FRET, d.itemId).toBe(true);
            expect(inW(n.beat), `${d.itemId} answer at ${n.beat}`).toBe(false);
          }
          for (const c of d.listen!.notes) expect(inW(c.beat), `${d.itemId} call at ${c.beat}`).toBe(true);
        }
  });
  it("the speaker's call is never taken for the answer (onsets in the call windows are dropped, as DrillTake does)", () => {
    for (const lv of ear.levels) {
      const d = generate({ ...lv.specs[0], key: keysOf(lv)[0] } as DrillSpec);
      const bpm = d.startBpm;
      const bms = (b: number) => expTimeMs(d, b, bpm);
      const inBand = (ms: number) => d.listen!.windows.some(([a, b]) => ms >= bms(a) - 40 && ms < bms(b) + 120);
      const speaker: PlayedNote[] = d.listen!.notes.filter((n) => !n.perc).map((n) => ({ pitch: n.midi[0], on: bms(n.beat) + 12, off: null, vel: 70 }));
      const heard = [...speaker, ...take(d, bpm)].sort((a, b) => a.on - b.on).filter((p) => !inBand(p.on));
      expect(analyzeGuitarTake(d, bpm, heard).verdict, lv.id).toBe('clean');
      // The calls are seeded per key and option: in the recall levels two keys never play the same shape.
      if (['melodic1', 'melodic2', 'riff', 'rhythm', 'transcribe'].includes(lv.specs[0].kind)) {
        const k2 = keysOf(lv)[1];
        const d2 = generate({ ...lv.specs[0], key: k2 } as DrillSpec);
        const shape = (x: Drill, k: number) => x.listen!.notes.filter((n) => !n.perc).map((n) => `${n.beat}:${n.midi.map((m) => (((m - k) % 12) + 12) % 12).join(',')}`).join(' ');
        expect(shape(d2, k2), lv.id).not.toBe(shape(d, keysOf(lv)[0]));
      }
    }
  });
  it('ear 8, strum it: the closed-set recognizer names the strummed chord; a wrong chord is not clean, an unclear one asks again', () => {
    const d = generate({ family: 'g-ear', kind: 'quality', key: 7, hands: 'R', option: 2, instrument: 'guitar' } as DrillSpec);
    expect(d.recognize?.length).toBe(4);
    const bpm = d.startBpm;
    const played = take(d, bpm);
    const chordOns = [...new Set(d.notes.map((n) => n.beat))].map((b) => expTimeMs(d, b, bpm));
    const framesFor = (pcsOf: (k: number) => number[] | null): GFrame[] => {
      const out: GFrame[] = [];
      for (let t = 0; t < expTimeMs(d, d.beats, bpm); t += 20) {
        const k = chordOns.findIndex((on, i) => t >= on && (i === chordOns.length - 1 || t < chordOns[i + 1]));
        const pcs = k >= 0 ? pcsOf(k) : null;
        const chroma = Array.from({ length: 12 }, (_, i) => (pcs ? (pcs.includes(i) ? 1 : 0.05) : 0.3));
        out.push({ t, hz: null, rms: 0.2, chroma });
      }
      return out;
    };
    const right = (k: number) => {
      const r = d.recognize![k];
      const c = r.candidates[r.answer];
      return QUALITY_INTS[c.quality].map((i) => (c.root + i) % 12);
    };
    const m = analyzeGuitarTake(d, bpm, played, undefined, framesFor(right));
    expect(m.guitar.recognized).toMatchObject({ ok: 4, wrong: 0, unsure: 0 });
    expect(m.verdict).toBe('clean');
    // Strummed a different chord of the pool each time → not clean, and the line names it.
    const wrong = (k: number) => {
      const r = d.recognize![k];
      const c = r.candidates[(r.answer + 1) % r.candidates.length];
      return QUALITY_INTS[c.quality].map((i) => (c.root + i) % 12);
    };
    const mw = analyzeGuitarTake(d, bpm, played, undefined, framesFor(wrong));
    expect(mw.verdict).toBe('not');
    expect(mw.why.en).toMatch(/Another chord/);
    // Noise (a flat chroma) → never a guess: "play it again".
    const mu = analyzeGuitarTake(d, bpm, played, undefined, framesFor(() => null));
    expect(mu.guitar.recognized!.unsure).toBe(4);
    expect(mu.verdict).not.toBe('clean');
  });

  it('the key is never named where it is the answer (find the tonic, find the key)', () => {
    for (const kind of ['tonic', 'key'])
      for (const key of ALL12) {
        const d = generate({ family: 'g-ear', kind, key, hands: 'R', instrument: 'guitar' } as DrillSpec);
        expect(/ · [A-G]/.test(d.title.en) || / · [A-G]/.test(d.title.he), d.title.en).toBe(false);
      }
  });

  it('a wrong answer is not clean (the 5th instead of the tonic)', () => {
    const d = generate({ ...ear.levels[0].specs[0], key: 0 } as DrillSpec);
    const played = take(d, d.startBpm).map((p) => ({ ...p, pitch: p.pitch + 7 }));
    expect(analyzeGuitarTake(d, d.startBpm, played).verdict).not.toBe('clean');
  });
  it('ear takes feed the ear share of the rating (dictation, harmony, tonality)', () => {
    const subs = ear.levels.map((lv) => {
      const d = generate({ ...lv.specs[0], key: keysOf(lv)[0] } as DrillSpec);
      return drillEvents(d, analyzeGuitarTake(d, d.startBpm, take(d, d.startBpm)), '2026-11-11T10:00:00Z', 's', 0)[0].tags!.map((t) => t.sub);
    });
    for (const s of subs) expect(s[0]).toBe('instrument/guitar-tech');
    expect(subs.map((s) => s[1])).toEqual(['degrees/find-tonic', 'dictation/melodic', 'dictation/melodic', 'rhythm-dictation/dictate', 'dictation/melodic', 'cadences/progression', 'cadences/progression', 'chords/quality', 'degrees/find-tonic', 'dictation/melodic']);
  });
});

describe('guitar deepening: the core path and add-ons (§5, owner 2026-11-11)', () => {
  const ds = (o: Partial<DrillSettings> = {}): DrillSettings => ({ ...DEFAULT_DRILL_SETTINGS, instrument: 'guitar', ...o });
  const base = { leaveOut: [], packs: ['pop', 'jazz'], plays: ['guitar'], track: 'standard', facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-11') } as never;
  const pathOf = (d: DrillSettings) => {
    const inp = { ...courseInput(base, 'guitar'), ladderFamilies: ladderFamiliesFor('guitar', d), ladderHidden: ladderHiddenFor('guitar', undefined, undefined, false, d) };
    return stepCatalogue().filter((s) => s.ladder && eligible(s, inp));
  };
  const ADDON_LEVELS = ['g-rhythm-6', 'g-impro-5', 'g-impro-6', 'g-picking-8', 'g-picking-9', 'g-legato-8'];

  it('no style chosen → the core only: no add-on family or level, no country level', () => {
    const steps = pathOf(ds());
    const fams = new Set(steps.map((s) => s.ladder!.family));
    for (const f of ['g-jazz', 'g-harris', 'g-prog', 'g-flamenco', 'g-fingerstyle']) expect(fams.has(f), f).toBe(false);
    for (const f of ['g-fretting', 'g-picking', 'g-chords', 'g-rhythm', 'g-scales', 'g-lead', 'g-reading', 'g-ear', 'g-legato', 'g-arps', 'g-impro']) expect(fams.has(f), f).toBe(true);
    const refs = steps.map((s) => s.ladder!.ref);
    for (const id of [...ADDON_LEVELS, 'g-picking-7']) expect(refs, id).not.toContain(id);
    // §5.2 counted 85 with country in the core; the owner left country out (picking 7).
    expect(steps.length).toBe(84);
  });

  it('each add-on adds its families and levels; all four give the full 130 minus country', () => {
    const jazz = pathOf(ds({ guitarAddOns: ['jazz'] })).map((s) => s.ladder!.ref);
    expect(jazz).toEqual(expect.arrayContaining(['g-jazz-12', 'g-harris-6', 'g-impro-6', 'g-rhythm-6']));
    expect(jazz.some((r) => r.startsWith('g-prog'))).toBe(false);
    const prog = pathOf(ds({ guitarAddOns: ['prog'] })).map((s) => s.ladder!.ref);
    expect(prog).toEqual(expect.arrayContaining(['g-prog-1', 'g-prog-8', 'g-picking-9', 'g-legato-8']));
    expect(pathOf(ds({ guitarAddOns: ['jazz', 'flamenco', 'fingerstyle', 'prog'] })).length).toBe(130);
    expect(pathOf(ds({ guitarAddOns: ['jazz', 'flamenco', 'fingerstyle', 'prog'], guitarStyle: 'country' })).length).toBe(131);
    // The Technique hub shows the same.
    expect(shownFamilies(ds({ guitarAddOns: [] })).map((f) => f.id)).not.toContain('g-jazz');
    expect(shownFamilies(ds({ guitarAddOns: ['fingerstyle'] })).map((f) => f.id)).toContain('g-fingerstyle');
  });

  it('the old single style migrates; jazz is pre-ticked for a Jazz-course player; an explicit choice stays', () => {
    expect(guitarAddOnsOf({ guitarStyle: 'jazz' })).toEqual(['jazz']);
    expect(guitarAddOnsOf({ guitarStyle: 'latin' })).toEqual(['jazz']);
    expect(guitarAddOnsOf({ guitarStyle: 'flamenco' })).toEqual(['flamenco']);
    expect(guitarAddOnsOf({ guitarStyle: 'classical' })).toEqual(['fingerstyle']);
    expect(guitarAddOnsOf({ guitarStyle: 'fingerstyle' })).toEqual(['fingerstyle']);
    expect(guitarAddOnsOf({ guitarStyle: 'rock' })).toEqual([]);
    expect(guitarAddOnsOf({ guitarStyle: 'metal' })).toEqual([]);
    expect(guitarAddOnsOf({ guitarStyle: 'all' })).toEqual([]);
    expect(guitarAddOnsOf({})).toEqual([]);
    expect(guitarAddOnsOf({}, ['guitar', 'jazz'])).toEqual(['jazz']);
    expect(guitarAddOnsOf({ guitarStyle: 'flamenco' }, ['guitar', 'jazz'])).toEqual(['jazz', 'flamenco']);
    expect(guitarAddOnsOf({ guitarAddOns: ['prog'] }, ['guitar', 'jazz'])).toEqual(['prog']);
    expect(guitarAddOnsOf({ guitarAddOns: [] }, ['jazz'])).toEqual([]);
  });

  it('the path orders guitar levels by grade (sweep picking after 3nps scales; 3nps picking with them)', () => {
    const steps = pathOf(ds({ guitarAddOns: ['jazz', 'flamenco', 'fingerstyle', 'prog'] }));
    const d = (ref: string) => steps.find((s) => s.ladder!.ref === ref)!.difficulty;
    expect(d('g-picking-6')).toBeGreaterThan(d('g-scales-6'));
    expect(Math.abs(d('g-picking-3') - d('g-scales-6'))).toBeLessThanOrEqual(90 + 10);
    // Monotonic: a higher grade never sits before a lower one.
    for (const a of steps)
      for (const b of steps) {
        const ga = LEVELS.find((x) => x.lv.id === a.ladder!.ref)!.lv.grade!;
        const gb = LEVELS.find((x) => x.lv.id === b.ladder!.ref)!.lv.grade!;
        if (ga < gb) expect(a.difficulty, `${a.ladder!.ref} vs ${b.ladder!.ref}`).toBeLessThan(b.difficulty);
      }
    expect(guitarPathDifficulty('g-fretting', 0)).toBe(700);
  });
});

describe('guitar deepening: placement probes for every family (§7)', () => {
  const fams = GUITAR.map((f) => ({ id: f.id, levels: f.levels.length, addOn: f.addOn }));
  it('a step for every core family; add-on steps only when chosen; every step generates', () => {
    const core = guitarProbesFor([]);
    expect(new Set(core.map((p) => p.family))).toEqual(new Set(['g-fretting', 'g-picking', 'g-chords', 'g-rhythm', 'g-scales', 'g-legato', 'g-arps', 'g-lead', 'g-reading', 'g-ear', 'g-impro']));
    const all = guitarProbesFor(['jazz', 'flamenco', 'fingerstyle', 'prog']);
    expect(all.map((p) => p.family)).toEqual(expect.arrayContaining(['g-jazz', 'g-harris', 'g-prog', 'g-fingerstyle', 'g-flamenco']));
    for (const p of all) expect(generate(p.spec).notes.length, p.id).toBeGreaterThan(0);
  });
  it('places each family from its step, harder steps only after the easier one, the rest from the mean', () => {
    const none = placeGuitar({}, fams);
    expect(Object.values(none).every((v) => v === 1)).toBe(true);
    // The barre step never runs without a clean A ↔ D first.
    const barreOnly = placeGuitar({ 'g-chords-barre': 60 }, fams);
    expect(barreOnly['g-chords']).toBe(1);
    const strong = placeGuitar({ 'g-fretting': 100, 'g-chords': 90, 'g-chords-barre': 60, 'g-scales': 100, 'g-scales-major': 90, 'g-rhythm': 90, 'g-picking': 95, 'g-legato': 75, 'g-arps': 95, 'g-lead': 60, 'g-reading': 70, 'g-ear': 85, 'g-impro': 90 }, fams);
    expect(strong['g-fretting']).toBe(5);
    expect(strong['g-chords']).toBe(5);
    expect(strong['g-scales']).toBe(5);
    expect(strong['g-rhythm']).toBe(2);
    expect(strong['g-lead']).toBe(3);
    expect(strong['g-ear']).toBe(3);
    // Add-on families start at 1 unless their own step was clean.
    expect(strong['g-jazz']).toBe(1);
    expect(placeGuitar({ 'g-jazz': 120 }, fams, ['jazz'])['g-jazz']).toBe(3);
    expect(placeGuitar({ 'g-jazz': 120 }, fams, [])['g-jazz']).toBe(1);
    expect(probeRuns(guitarProbesFor([]).find((p) => p.id === 'g-lead-vib')!, { 'g-lead': 0 })).toBe(false);
  });
});

