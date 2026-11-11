import { describe, expect, it } from 'vitest';
import { expTimeMs, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { generateGuitarProg, guitarProgFamily } from '../src/engine/drills/guitarProg';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { withProg } from '../src/engine/drills/progAnalyze';
import { hasTimeline } from '../src/engine/drills/timeline';
import { noteAt, tuningById } from '../src/engine/fretboard';
import { MAX_FRET, rng } from '../src/engine/drills/guitar';
import type { Drill, DrillSpec, PlayedNote } from '../src/engine/drills/types';

const TU = tuningById('standard');
const FAM = guitarProgFamily();
const gen = (s: DrillSpec): Drill => generateGuitarProg(s, TU);
const LEVELS = FAM.levels.map((l) => ({ l, drills: l.keys.length && Array.isArray(l.keys) ? l.keys.flatMap((k) => l.specs.map((s) => gen({ ...s, key: k }))) : [] }));
const ALL = LEVELS.flatMap((x) => x.drills);

/** The level's target tempo for an item (eighth-pulse items climb the range's ratio from their start). */
const target = (lv: (typeof FAM.levels)[number], d: Drill): number => (d.pulse === 8 ? Math.round((d.startBpm * lv.tempo![1]) / lv.tempo![0]) : lv.tempo![1]);

/** A take: every expected pitch once at its time (+ seeded jitter), accented notes louder. */
function take(d: Drill, bpm: number, sd = 0, seed = 3, at: (beat: number) => number = (b) => expTimeMs(d, b, bpm)): PlayedNote[] {
  const r = rng(`take:${d.itemId}:${seed}`);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ pitch: n.pitch, on: at(n.beat) + gauss() * sd, off: null, vel: n.accent ? 100 : 60 });
  }
  return out.sort((a, b) => a.on - b.on);
}
const verdict = (d: Drill, bpm: number, ps: PlayedNote[]) => withProg(analyzeGuitarTake(d, bpm, ps), d, bpm, ps);

describe('g-prog: catalogue', () => {
  it('8 levels with grades, tempo ranges, subdivisions and the prog add-on', () => {
    expect(FAM.id).toBe('g-prog');
    expect(FAM.addOn).toBe('prog');
    expect(FAM.levels.map((l) => l.grade)).toEqual([5, 6, 7, 7, 8, 6, 8, 9]);
    FAM.levels.forEach((l, i) => {
      expect(l.id).toBe(`g-prog-${i + 1}`);
      expect(l.tempo![1]).toBeGreaterThan(l.tempo![0]);
      expect(l.sub).toBeTruthy();
      expect(l.title.he).toMatch(/[א-ת]/);
    });
  });

  it('every item × key generates valid, playable notes', () => {
    const bad: string[] = [];
    const check = (ok: boolean, msg: string) => {
      if (!ok && bad.length < 20) bad.push(msg);
    };
    expect(ALL.length).toBeGreaterThan(80);
    for (const d of ALL) {
      const id = d.itemId;
      check(d.notes.length > 0, `${id}: no notes`);
      check(d.startBpm >= 40 && d.startBpm <= 200, `${id}: start ${d.startBpm}`);
      check(!/\b(major|minor|alternating|string|fret)\b/i.test(d.title.he), `${id}: he title ${d.title.he}`);
      for (const n of d.notes) {
        const at = `${id} beat ${n.beat} ${n.string}:${n.fret}`;
        check(Number.isInteger(n.string) && n.string! >= 1 && n.string! <= 6, `${at}: string`);
        check(Number.isInteger(n.fret) && n.fret! >= 0 && n.fret! <= MAX_FRET, `${at}: fret`);
        check(n.pitch === noteAt(TU, n.string!, n.fret!), `${at}: pitch`);
        if (n.finger !== undefined) check(n.finger >= 1 && n.finger <= 4, `${at}: finger`);
        if (n.fret! > 0) {
          const dv = n.fret! - (n.pos ?? NaN);
          check(dv >= -1 && dv <= 4, `${at}: outside position ${n.pos}`);
        }
      }
      const byChord = new Map<number, typeof d.notes>();
      for (const n of d.notes) if (n.chordId !== undefined) byChord.set(n.chordId, [...(byChord.get(n.chordId) ?? []), n]);
      for (const ns of byChord.values()) {
        check(new Set(ns.map((n) => n.string)).size === ns.length, `${id}: two notes on one string`);
        const fr = ns.filter((n) => n.fret! > 0).map((n) => n.fret!);
        if (fr.length) check(Math.max(...fr) - Math.min(...fr) <= 4, `${id}: chord span`);
      }
      for (let i = 1; i < d.notes.length; i++) check(d.notes[i].beat >= d.notes[i - 1].beat, `${id}: unsorted`);
      check(d.notes.every((n) => n.beat + n.dur <= d.beats + 1e-6), `${id}: notes past the end`);
    }
    expect(bad).toEqual([]);
  });

  it('no two items of a level play the same notes', () => {
    for (const { l, drills } of LEVELS) {
      const sigs = drills.map((d) => d.notes.map((n) => `${n.beat}:${n.string}:${n.fret}:${n.accent ? 1 : 0}`).join(' '));
      expect(new Set(sigs).size, l.id).toBe(drills.length);
    }
  });

  it('the engine features each level needs', () => {
    const lv = (n: number) => LEVELS[n - 1].drills;
    expect(lv(1).every((d) => hasTimeline(d) && !!d.drums?.groove)).toBe(true);
    expect(lv(1).filter((d) => d.pulse === 8).length).toBe(lv(1).length);
    expect(lv(2).some((d) => d.listen && d.show === 'none' && d.listen.windows.length === 2)).toBe(true);
    expect(lv(2).some((d) => (d.meters?.length ?? 0) > 1)).toBe(true); // changing groupings
    expect(lv(3).every((d) => (d.meters?.length ?? 0) > 1 && !!d.form && !!d.band && d.goal.prog?.form)).toBe(true);
    expect(lv(4).every((d) => d.goal.prog?.groupAccent && d.meters!.some((m) => m.meter.unit === 16))).toBe(true);
    expect(lv(5).every((d) => d.tempoMap?.length === 1 && d.goal.prog?.tempoRatio)).toBe(true);
    expect(lv(8).every((d) => d.unison?.inst === 'bass' && d.goal.prog?.unison && d.pulse === 8)).toBe(true);
  });
});

describe('g-prog: analysis', () => {
  it('a perfect take is clean at the start tempo, with the prog checks', () => {
    for (const d of ALL) {
      const ps = take(d, d.startBpm);
      const m = verdict(d, d.startBpm, ps);
      expect(m.verdict, `${d.itemId}: ${m.why.en}`).toBe('clean');
      expect(m.accuracy, d.itemId).toBe(1);
    }
  }, 60000);

  it('a steady human take (8 ms jitter) is clean at every level target tempo', () => {
    for (const { l, drills } of LEVELS)
      for (const d of drills) {
        const bpm = target(l, d);
        for (const seed of [11, 12, 13, 14]) {
          const m = verdict(d, bpm, take(d, bpm, 8, seed));
          expect(m.verdict, `${d.itemId} @${bpm} seed ${seed}: ${m.why.en}`).toBe('clean');
        }
      }
  }, 60000);

  // 3 × 8 ms (24 ms) sits inside the shared analysis' timing limits at slow bands (SD 20–30 ms by tempo band), so the
  // sloppy take is 2 × the band's limit, as in the drums sweep.
  it('a sloppy take (jitter = 2 × the tempo band SD limit) is never clean', () => {
    const clean: string[] = [];
    for (const { l, drills } of LEVELS)
      for (const d of drills) {
        const bpm = target(l, d);
        const sd = 2 * thresholds(tempoBand(analyzeGuitarTake(d, bpm, take(d, bpm)).nps)).sd;
        if (verdict(d, bpm, take(d, bpm, sd, 5)).verdict === 'clean') clean.push(`${d.itemId}@${bpm}`);
      }
    expect(clean).toEqual([]);
  }, 60000);

  it('accents: the polyrhythm levels want the group starts louder', () => {
    const d = LEVELS[3].drills[0];
    const flat = take(d, d.startBpm).map((p) => ({ ...p, vel: p.vel === 100 ? 70 : 64 }));
    const loud = take(d, d.startBpm);
    expect(verdict(d, d.startBpm, loud).verdict).toBe('clean');
    expect(verdict(d, d.startBpm, flat).verdict).not.toBe('clean');
  });

  it('L5: a take that keeps the old tempo through the modulation is not clean', () => {
    for (const d of LEVELS[4].drills.slice(0, 3)) {
      const bpm = d.startBpm;
      const ps = take(d, bpm, 0, 1, (b) => (b * 60000) / bpm);
      const m = verdict(d, bpm, ps);
      expect(m.verdict, d.itemId).not.toBe('clean');
    }
  });

  it('L3: a take that drops a bar is not clean (and names the lost bar)', () => {
    for (const d of LEVELS[2].drills.slice(0, 3)) {
      const bpm = d.startBpm;
      // Skip the 3rd bar: every note after it comes a bar early.
      const ms = (b: number) => expTimeMs(d, b, bpm);
      const firstBars = d.notes.filter((n) => n.chordId !== undefined).map((n) => n.beat);
      const barStarts = [...new Set(firstBars)].sort((a, b) => a - b); // power chords sit on every bar's 1
      const [b2, b3] = [barStarts[2], barStarts[3]];
      const ps = take(d, bpm)
        .filter((p) => {
          const beat = d.notes.find((n) => Math.abs(ms(n.beat) - p.on) < 1)!.beat;
          return beat < b2 || beat >= b3;
        })
        .map((p) => (p.on >= ms(b3) - 1 ? { ...p, on: p.on - (ms(b3) - ms(b2)) } : p));
      const m = verdict(d, bpm, ps);
      expect(m.verdict, d.itemId).toBe('not');
    }
  });

  it('L8: playing behind the band\'s bass is not clean', () => {
    const d = LEVELS[7].drills[0];
    const bpm = d.startBpm;
    const late = take(d, bpm).map((p) => ({ ...p, on: p.on + 30 }));
    const m = verdict(d, bpm, late);
    expect(m.prog?.unison?.mean).toBeGreaterThan(20);
    expect(m.verdict).not.toBe('clean');
  });
});
