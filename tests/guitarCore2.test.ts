import { describe, expect, it } from 'vitest';
import { CORE2_KINDS, core2Levels, generateCore2 } from '../src/engine/drills/guitarCore2';
import { expTimeMs, IOI_FLOOR_MS, npsOf, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { MAX_FRET, rng } from '../src/engine/drills/guitar';
import { noteAt, tuningById } from '../src/engine/fretboard';
import type { Drill, DrillSpec, PlayedNote } from '../src/engine/drills/types';
import type { GuitarLevelDef } from '../src/engine/drills/guitar';

const ALL12 = Array.from({ length: 12 }, (_, i) => i);
const LEVELS: GuitarLevelDef[] = Object.values(core2Levels()).flat() as GuitarLevelDef[];
const gen = (s: DrillSpec): Drill => {
  const d = generateCore2(s, tuningById(s.tuning ?? 'standard'));
  if (!d) throw new Error(`not owned: ${s.family}:${s.kind}`);
  return d;
};
const ITEMS = LEVELS.map((l) => ({ level: l, drills: (Array.isArray(l.keys) ? l.keys : ALL12).flatMap((k) => l.specs.map((s) => gen({ ...s, key: k } as DrillSpec))) }));

/** A take: every expected pitch once, at its time + seeded jitter (ms SD). */
function take(d: Drill, bpm: number, sd = 0, seed = 'x'): PlayedNote[] {
  const r = rng(`${d.itemId}:${seed}`);
  const gauss = () => {
    const u = Math.max(1e-9, r());
    // Clipped at ±2.5 SD: a steady player, no single wild note (that is its own rule).
    return Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())));
  };
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

describe('guitar core batch C: catalogue', () => {
  it('20 levels with the doc numbering, titles, tempo ranges, grades and add-ons', () => {
    expect(LEVELS.length).toBe(21);
    const ids = LEVELS.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(['g-scales-8', 'g-scales-10', 'g-rhythm-10', 'g-lead-10', 'g-picking-9', 'g-legato-8', 'g-reading-8', 'g-arps-7', 'g-impro-6']));
    for (const l of LEVELS) {
      expect(l.title.en.length && l.title.he.length).toBeTruthy();
      expect(/major|minor/i.test(l.title.he)).toBe(false);
      expect(l.tempo![1]).toBeGreaterThanOrEqual(l.tempo![0]);
      expect(l.sub).toBeTruthy();
      expect(l.grade).toBeGreaterThanOrEqual(4);
      for (const s of l.specs) expect(CORE2_KINDS[s.family]).toContain(s.kind);
    }
    expect(LEVELS.filter((l) => l.addOn === 'prog').map((l) => l.id).sort()).toEqual(['g-legato-8', 'g-picking-8', 'g-picking-9']);
    expect(LEVELS.filter((l) => l.addOn === 'jazz').map((l) => l.id).sort()).toEqual(['g-impro-5', 'g-impro-6', 'g-impro-7']);
  });

  it('every item × key generates valid, playable notes', () => {
    const bad: string[] = [];
    const check = (ok: boolean, msg: string) => {
      if (!ok && bad.length < 20) bad.push(msg);
    };
    const tu = tuningById('standard');
    for (const { drills } of ITEMS)
      for (const d of drills) {
        const id = d.itemId;
        check(d.notes.length > 0, `${id}: no notes`);
        check(d.startBpm >= 40 && d.startBpm <= 200, `${id}: start bpm`);
        const stretch = !!d.spec.stretch;
        for (const n of d.notes) {
          const at = `${id} beat ${n.beat} ${n.string}:${n.fret}`;
          check(n.string! >= 1 && n.string! <= 6, `${at}: string`);
          check(n.fret! >= 0 && n.fret! <= MAX_FRET, `${at}: fret`);
          if (n.technique !== 'harmonic' && n.technique !== 'prebend') check(n.pitch === noteAt(tu, n.string!, n.fret!), `${at}: pitch`);
          if (n.finger !== undefined) check(n.finger >= 1 && n.finger <= 4, `${at}: finger ${n.finger}`);
          if (n.fret! > 0 && n.technique !== 'tap' && n.technique !== 'harmonic') {
            const off = n.fret! - (n.pos ?? NaN);
            check(off >= -1 && off <= (stretch ? 6 : 4), `${at}: outside position ${n.pos}`);
          }
        }
        const by = new Map<number, typeof d.notes>();
        for (const n of d.notes) if (n.chordId !== undefined) by.set(n.chordId, [...(by.get(n.chordId) ?? []), n]);
        for (const ns of by.values()) {
          check(new Set(ns.map((n) => n.string)).size === ns.length, `${id}: two notes on one string`);
          const fr = ns.filter((n) => n.fret! > 0).map((n) => n.fret!);
          if (fr.length) check(Math.max(...fr) - Math.min(...fr) <= 4, `${id}: chord span`);
        }
        for (let i = 1; i < d.notes.length; i++) check(d.notes[i].beat >= d.notes[i - 1].beat, `${id}: unsorted`);
      }
    expect(bad).toEqual([]);
  });

  it('no two items of a level play the same notes; ids are unique', () => {
    const ids = new Set<string>();
    for (const { level, drills } of ITEMS) {
      const sigs = new Map<string, string>();
      for (const d of drills) {
        expect(ids.has(d.itemId), d.itemId).toBe(false);
        ids.add(d.itemId);
        const sig = d.notes.map((n) => `${n.beat}:${n.pitch}:${n.string}:${n.fret}`).join(',');
        expect(sigs.get(sig), `${level.id}: ${d.itemId} = ${sigs.get(sig)}`).toBeUndefined();
        sigs.set(sig, d.itemId);
      }
    }
  });

  it('kinds outside batch C are not taken', () => {
    expect(generateCore2({ family: 'g-scales', kind: 'penta', key: 0, hands: 'R' }, tuningById('standard'))).toBeNull();
  });
});

describe('guitar core batch C: measured', () => {
  it('a perfect take is clean at the start tempo', () => {
    for (const { drills } of ITEMS)
      for (const d of drills) {
        const m = analyzeGuitarTake(d, d.startBpm, take(d, d.startBpm));
        expect(m.verdict, `${d.itemId}: ${m.why.en}`).toBe('clean');
        expect(m.accuracy, d.itemId).toBe(1);
      }
  }, 60000);

  // A steady human: 8 ms onset jitter, capped at 45 % of what the evenness limit (IOI CV) allows at fast notes.
  it('a steady human take (≤ 8 ms jitter) is clean at the level target tempo; a sloppy one (3 × the tier SD) never is', () => {
    const fails: string[] = [];
    for (const { level, drills } of ITEMS)
      for (const d of drills) {
        const bpm = d.spec.target ?? level.tempo![1];
        const nps = npsOf(d, bpm);
        const ioi = 1000 / nps;
        const cv = Math.max(thresholds(tempoBand(nps)).cv, IOI_FLOOR_MS.midi / ioi);
        const jit = Math.min(8, (0.45 * cv * ioi) / Math.SQRT2);
        const good = analyzeGuitarTake(d, bpm, take(d, bpm, jit, 'good'));
        if (good.verdict !== 'clean' && fails.length < 10) fails.push(`${d.itemId} @${bpm}: ${good.why.en}`);
        const sd = thresholds(tempoBand(npsOf(d, bpm))).sd;
        const bad = analyzeGuitarTake(d, bpm, take(d, bpm, 3 * sd, 'bad'));
        expect(bad.verdict, `${d.itemId} sloppy`).not.toBe('clean');
      }
    expect(fails).toEqual([]);
  }, 60000);
});

describe('guitar trading 4s / 2s with the band (g-impro 7)', () => {
  const tradeLv = LEVELS.find((l) => l.id === 'g-impro-7')!;
  const pc = (p: number) => ((p % 12) + 12) % 12;
  it('the band plays, you answer, in turn; its phrase stops a beat before yours; your notes are landings on 1 and 3', () => {
    for (const k of tradeLv.keys as number[])
      for (const s of tradeLv.specs) {
        const d = gen({ ...s, key: k } as DrillSpec);
        const len = s.option === 2 ? 8 : 16;
        expect(d.beats).toBe(64);
        expect(d.show).toBe('none');
        expect(d.chart).toHaveLength(16);
        expect(d.listen!.windows).toEqual(Array.from({ length: 32 / len }, (_, i) => [i * 2 * len, i * 2 * len + len - 1]));
        expect(d.listen!.notes.every((n) => d.listen!.windows.some(([a, b]) => n.beat >= a && n.beat + n.dur <= b + 1e-6)), d.itemId).toBe(true);
        expect(d.goal.free!.windows).toEqual(Array.from({ length: 32 / len }, (_, i) => [i * 2 * len + len, (i + 1) * 2 * len]));
        expect(d.notes).toHaveLength(16);
        expect(d.notes.every((n) => n.land && n.land.includes(pc(n.pitch)) && n.beat % 2 === 0 && n.fret! <= MAX_FRET), d.itemId).toBe(true);
        // The band comps and the drums play only in your bars (headphones / MIDI): it rests in its own.
        expect(d.band?.rests).toEqual(d.listen!.windows.map(([a, b]) => [a, b + 1]));
        expect(d.drums?.groove).toBe('swing');
      }
  });
  const d = gen({ ...tradeLv.specs[0], key: 0 } as DrillSpec);
  const bpm = 120;
  const ms = (b: number) => expTimeMs(d, b, bpm);
  /** The model line of your bars, played as a guitarist would (8ths). */
  const modelTake = (): PlayedNote[] => d.goal.free!.model.map((n) => ({ pitch: n.pitch, on: ms(n.beat), off: null, vel: 64 }));
  const atLanding = (p: PlayedNote) => d.notes.some((n) => Math.abs(p.on - ms(n.beat)) < 5);
  it('your own line passes: the model line, or any chord tone at the landings (another octave)', () => {
    const m = analyzeGuitarTake(d, bpm, modelTake());
    expect(m.verdict, m.why.en).toBe('clean');
    const oct = modelTake().map((p) => (atLanding(p) ? { ...p, pitch: p.pitch + 12 } : p));
    expect(analyzeGuitarTake(d, bpm, oct).verdict).toBe('clean');
  });
  it('a wrong landing, laying out, or a line outside the changes never passes', () => {
    const base = modelTake();
    const i16 = base.findIndex((p) => Math.abs(p.on - ms(16)) < 5);
    expect(analyzeGuitarTake(d, bpm, base.map((p, i) => (i === i16 ? { ...p, pitch: p.pitch + 1 } : p))).verdict).not.toBe('clean');
    expect(analyzeGuitarTake(d, bpm, base.filter((p) => p.on < ms(48) - 100)).verdict).not.toBe('clean');
    const outside = base.map((p) => (atLanding(p) ? p : { ...p, pitch: p.pitch + 6 }));
    expect(analyzeGuitarTake(d, bpm, outside).verdict).not.toBe('clean');
  });
});
