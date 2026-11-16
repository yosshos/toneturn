// Embellish a melody (AUDIT-DEPTH-3 C2): approaches, enclosures, pivots, free — the head's notes stay on their beats.
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { embellish, keyScale, pivotOf } from '../src/engine/embellish';
import { headIn } from '../src/engine/heads';
import { decodeHead, embPlan, SERVED } from '../src/engine/drills/headDrills';
import { HEADS } from '../src/content/heads';
import { parseChart } from '../src/engine/charts';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { KEYS_LEVEL_DIFF } from '../src/engine/path';
import type { Drill, DrillSpec, PlayedNote } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;
const KINDS = ['em-appr', 'em-encl', 'em-pivot', 'em-free'];

describe('embellish.ts', () => {
  it('the pivot arpeggio: the root on top, then 3rd, 5th, 7th below it, climbing (Cmaj7: C, then E G B)', () => {
    const c = parseChart('Cmaj7').chords[0];
    expect(pivotOf(c, 72)).toEqual([72, 64, 67, 71]);
    const g = parseChart('G7').chords[0];
    const p = pivotOf(g, 70);
    expect(pc(p[0])).toBe(7);
    expect(p.slice(1).every((x, i) => x < p[0] && (i === 0 || x > p[i]))).toBe(true);
  });
  it('every served head in 12 keys: the melody notes keep pitch and onset; approaches a half step below; enclosures above then below', () => {
    for (const i of SERVED)
      for (let k = 0; k < 12; k++) {
        const hi = headIn(HEADS[i], k, 'piano');
        for (const kind of ['approach', 'enclose', 'pivot'] as const) {
          const e = embellish(hi.notes, hi.chords, kind, keyScale(hi.tonic.key, hi.tonic.minor));
          const mel = e.notes.filter((n) => n.role === 'melody');
          expect(mel.map((n) => `${n.pitch}@${n.beat}`)).toEqual(hi.notes.map((n) => `${n.pitch}@${n.beat}`));
          // nothing overlaps: one line
          for (let j = 1; j < e.notes.length; j++) expect(e.notes[j].beat).toBeGreaterThanOrEqual(e.notes[j - 1].beat + e.notes[j - 1].dur - 1e-6);
          for (const n of mel) expect(n.dur).toBeGreaterThan(0.24);
          const added = e.notes.filter((n) => n.role !== 'melody');
          expect(added.length, `${HEADS[i].id} ${k} ${kind}`).toBeGreaterThan(0);
          for (const a of added.filter((x) => x.role === 'approach')) {
            const t = mel.find((m) => Math.abs(m.beat - a.beat - 0.5) < 1e-6)!;
            expect(t.pitch - a.pitch).toBe(1);
            expect(t.beat % 4).toBe(0);
          }
          if (kind === 'enclose')
            for (const t of mel.filter((m) => m.target)) {
              const [up, dn] = added.filter((x) => x.beat >= t.beat - 1 - 1e-6 && x.beat < t.beat - 1e-6);
              expect(up.pitch - t.pitch === 1 || up.pitch - t.pitch === 2).toBe(true);
              expect(t.pitch - dn.pitch).toBe(1);
            }
        }
      }
  });
});

describe('the levels: k-tune 11–14, g-tune 10–13, b-tune 8–11', () => {
  const lvOf = (fam: string, n: number) => [...catalog(), ...guitarCatalog()].find((f) => f.id === fam)!.levels.find((l) => l.id === `${fam}-${n}`)!;
  it('levels and placement (1350–1600 on the keys)', () => {
    KINDS.forEach((k, j) => {
      expect(lvOf('k-tune', 11 + j).specs[0].kind).toBe(k);
      expect(lvOf('g-tune', 10 + j).specs[0].kind).toBe(k);
      expect(lvOf('b-tune', 8 + j).specs[0].kind).toBe(k);
    });
    expect([11, 12, 13, 14].map((n) => KEYS_LEVEL_DIFF[`k-tune-${n}`])).toEqual([1350, 1420, 1500, 1600]);
  });
  it('every item generates in all 12 keys on keys, guitar and bass; the bass sits in its register', () => {
    for (const fam of ['k-tune', 'g-tune', 'b-tune'])
      for (let j = 0; j < 4; j++) {
        const lv = lvOf(fam, (fam === 'k-tune' ? 11 : fam === 'g-tune' ? 10 : 8) + j);
        for (const d of levelDrills(lv, 'fifths-up')) {
          expect(d.notes.length).toBeGreaterThan(8);
          if (fam === 'b-tune') expect(Math.max(...d.notes.map((n) => n.pitch))).toBeLessThanOrEqual(67);
          if (KINDS[j] === 'em-free') expect(d.goal.free!.windows.length).toBeGreaterThan(0);
        }
      }
  });
  const take = (d: Drill, bpm: number, ns: { pitch: number; beat: number; dur: number }[]): PlayedNote[] => ns.map((n) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) + 3, off: expTimeMs(d, n.beat + n.dur, bpm) - 10, vel: 80 }));
  it('a perfect take is clean; the written approach missed is not; free: the targets graded, the windows anything', () => {
    const bpm = 80;
    const spec = (kind: string): DrillSpec => ({ family: 'k-tune', kind, key: 5, hands: 'R', option: SERVED[0] * 16 });
    const d = generate(spec('em-appr'));
    const m0 = analyzeTake(d, bpm, take(d, bpm, d.notes));
    expect(m0.verdict, m0.why.en).toBe('clean');
    const appr = embPlan(headIn(decodeHead(d.spec.option).head, 5, 'piano'), 'em-appr').written.filter((n) => n.role === 'approach').map((n) => `${n.pitch}@${n.beat}`);
    expect(appr.length).toBeGreaterThan(0);
    const noAppr = d.notes.filter((n) => !appr.includes(`${n.pitch}@${n.beat}`));
    expect(analyzeTake(d, bpm, take(d, bpm, noAppr)).verdict).not.toBe('clean');
    const f = generate(spec('em-free'));
    const { head } = decodeHead(f.spec.option);
    const pl = embPlan(headIn(head, 5, 'piano'), 'em-free');
    const model = f.goal.free!.model.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur }));
    expect(analyzeTake(f, bpm, take(f, bpm, [...f.notes, ...model].sort((a, b) => a.beat - b.beat))).verdict).toBe('clean');
    // a different embellishment inside the windows (a whole step below instead) still passes
    const other = model.map((n) => ({ ...n, pitch: n.pitch - 2 }));
    expect(analyzeTake(f, bpm, take(f, bpm, [...f.notes, ...other].sort((a, b) => a.beat - b.beat))).verdict).toBe('clean');
    expect(pl.spans.length).toBe(f.goal.free!.windows.length);
  });
});
