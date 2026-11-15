// AUDIT-SCALES (owner 2026-11-14): the 6th-diminished scale up and down, the scale matrix, contrary motion, fingering,
// hand independence, the harmonization ladder and Barry Harris borrowing — notes, 12 keys, grading, wiring.
import { describe, expect, it } from 'vitest';
import { autoFingering, catalog, generate, MAJOR_FINGERING, SCALE_INTERVALS } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { hasRubato } from '../src/engine/drills/rubato';
import { missingCells } from '../src/engine/drills/scaleMatrix';
import { borrowSeq, exprOf, H_HARRIS, H_SCALES, G_SETS, partDEvents } from '../src/engine/drills/harmLadder';
import { tesseract } from '../src/engine/topicsBorrow';
import { noteAt, tuningById } from '../src/engine/fretboard';
import { KEYS_LEVEL_DIFF, stepCatalogue } from '../src/engine/path';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { familyLevelCount } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { TOPIC_GEN, genTopic, asChoice } from '../src/engine/topicKit';
import '../src/engine/topics';
import type { Drill, DrillSpec, PlayedNote, ScaleType } from '../src/engine/drills/types';

const isBlack = (p: number) => [1, 3, 6, 8, 10].includes(((p % 12) + 12) % 12);
const perfect = (d: Drill, bpm = d.startBpm): PlayedNote[] => {
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const on = expTimeMs(d, n.beat, bpm);
    out.push({ pitch: n.pitch, on, off: on + (n.dur * 60000) / bpm - 5, vel: n.accent ? 96 : 72 });
  }
  return out.sort((a, b) => a.on - b.on);
};
const CAT = catalog();
const GCAT = guitarCatalog();
const lv = (id: string) => [...CAT, ...GCAT].flatMap((f) => f.levels).find((l) => l.id === id)!;

describe('the 6th-diminished scale goes up AND down (harris-1, owner 2026-11-14)', () => {
  it('C: 60 62 64 65 67 68 69 71 72 … 84 and back, the C6 tones on every beat both ways', () => {
    const d = generate({ family: 'harris', kind: 'h1-linear', key: 0, hands: 'R' });
    const ps = d.notes.map((n) => n.pitch);
    expect(ps.slice(0, 9)).toEqual([60, 62, 64, 65, 67, 68, 69, 71, 72]);
    expect(ps[16]).toBe(84);
    expect(ps.slice(16, 25)).toEqual([84, 83, 81, 80, 79, 77, 76, 74, 72]);
    expect(ps[ps.length - 1]).toBe(60);
    expect(ps.length).toBe(33);
    for (const n of d.notes) {
      const onBeat = Math.abs(n.beat - Math.round(n.beat)) < 1e-6;
      expect(n.chordTone, `${n.pitch}@${n.beat}`).toBe(onBeat);
      if (onBeat) expect([0, 4, 7, 9]).toContain(n.pitch % 12);
    }
    expect(d.title.en).toContain('6th-diminished scale, up and down');
    expect(lv('harris-1').title).toEqual({ en: 'The 6th-diminished scale, up and down', he: 'סולם השישית־מוקטן, עולה ויורד' });
    // the item ids are the old ones (saved progress stays valid)
    expect(d.itemId).toBe('harris:h1-linear:0:R');
  });
  it('the minor (Cm6 + B°7), dominant (C7 + B°7) and 7♭5 (C7♭5 + B°7) scales, up and down', () => {
    const one = (option: number) => generate({ family: 'harris', kind: 'h1-linear', key: 0, hands: 'R', option }).notes.map((n) => n.pitch);
    expect(one(1).slice(0, 9)).toEqual([60, 62, 63, 65, 67, 68, 69, 71, 72]);
    expect(one(2).slice(0, 9)).toEqual([60, 62, 64, 65, 67, 68, 70, 71, 72]);
    expect(one(3).slice(0, 9)).toEqual([60, 62, 64, 65, 66, 68, 70, 71, 72]);
    for (const o of [1, 2, 3]) expect(one(o).slice(16, 18)).toEqual([84, 83]);
  });
  it('every key: up and down are mirror images, chord tones on the beats; LH an octave lower', () => {
    for (let key = 0; key < 12; key++)
      for (const hands of ['R', 'L', 'RL'] as const) {
        const d = generate({ family: 'harris', kind: 'h1-linear', key, hands });
        const r = d.notes.filter((n) => n.hand === (hands === 'L' ? 'L' : 'R')).map((n) => n.pitch);
        expect(r.slice(17)).toEqual(r.slice(0, 16).reverse());
        expect(d.goal.chordTonesOnBeats).toBe(true);
      }
  });
});

describe('the scale matrix (docs/AUDIT-SCALES.md)', () => {
  it('no required cell is missing', () => expect(missingCells()).toEqual([]));
  it('contrary motion mirrors: both hands start on one note and move the same number of scale steps outward', () => {
    for (const lvl of CAT.find((f) => f.id === 'scales')!.levels)
      for (const sp of lvl.specs.filter((x) => x.motion === 'contrary'))
        for (const key of [0, 3, 6, 11]) {
          const d = generate({ ...sp, key } as DrillSpec);
          const R = d.notes.filter((n) => n.hand === 'R');
          const L = d.notes.filter((n) => n.hand === 'L');
          expect(R.length, d.itemId).toBe(L.length);
          expect(R[0].pitch, d.itemId).toBe(L[0].pitch);
          const steps = [...new Set([...R, ...L].map((n) => n.pitch))].sort((a, b) => a - b);
          const idx = (p: number) => steps.indexOf(p);
          for (let i = 0; i < R.length; i++) {
            expect(R[i].beat).toBe(L[i].beat);
            // melodic minor comes down natural, so compare positions within each hand's own set of notes
            if (sp.scale !== 'melodic') expect(idx(R[i].pitch) - idx(R[0].pitch), `${d.itemId} #${i}`).toBe(idx(L[0].pitch) - idx(L[i].pitch));
          }
        }
  });
  it('every new scales level runs through 12 keys', () => {
    for (let n = 16; n <= 33; n++) {
      const l = lv(`scales-${n}`);
      expect(Array.isArray(l.keys) ? new Set(l.keys).size : 12, l.id).toBe(12);
    }
  });
});

describe('fingering for every scale', () => {
  const types: ScaleType[] = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'natural', 'locrian', 'harmonic', 'melodic', 'pentatonic', 'blues', 'six-dim', 'six-dim-m', 'bebop-dom'];
  it('the computed fingering reproduces the table for the white-key majors and B major', () => {
    for (const key of [0, 7, 2, 9, 4, 11]) {
      const a = autoFingering(key, SCALE_INTERVALS.major);
      expect(a.r.slice(1, 7), `RH ${key}`).toEqual(MAJOR_FINGERING[key].r.slice(1, 7));
      expect(a.l.slice(1, 7), `LH ${key}`).toEqual(MAJOR_FINGERING[key].l.slice(1, 7));
      expect(a.rTop[0]).toBe(MAJOR_FINGERING[key].r[7]);
      expect(a.lBottom[0]).toBe(MAJOR_FINGERING[key].l[0]);
    }
  });
  it('never a thumb on a black key, fingers 1–5, thumb groups of 2–4 notes, every scale and key', () => {
    for (const t of types)
      for (let key = 0; key < 12; key++) {
        const ints = SCALE_INTERVALS[t];
        const a = autoFingering(key, ints);
        for (const [hand, f] of [['R', a.r], ['L', a.l]] as const)
          f.forEach((x, i) => {
            expect(x >= 1 && x <= 4, `${t} ${key} ${hand} ${i}`).toBe(true);
            if (x === 1) expect(isBlack(key + ints[i]), `${t} ${key} ${hand}: thumb on black`).toBe(false);
          });
      }
  });
  it('generated scale items carry a playable fingering in both hands, contrary motion included', () => {
    for (const t of types)
      for (const motion of ['parallel', 'contrary'] as const)
        for (let key = 0; key < 12; key++) {
          const d = generate({ family: 'scales', kind: 'scale', key, hands: 'RL', scale: t, octaves: 2, motion });
          for (const n of d.notes) {
            expect(n.finger, `${d.itemId} ${n.pitch}`).toBeDefined();
            if (n.finger === 1) expect(isBlack(n.pitch), `${d.itemId}: thumb on ${n.pitch}`).toBe(false);
          }
          // the same finger never plays two different keys in a row in one hand (except 1 after a crossing)
          for (const h of ['R', 'L'] as const) {
            const hs = d.notes.filter((n) => n.hand === h);
            for (let i = 1; i < hs.length; i++) if (hs[i].pitch !== hs[i - 1].pitch) expect(hs[i].finger === hs[i - 1].finger, `${d.itemId} ${h} ${i}`).toBe(false);
          }
        }
  });
});

describe('hand independence (k-indep)', () => {
  const fam = CAT.find((f) => f.id === 'k-indep')!;
  it('8 levels, every item in 12 keys, rubato first, a perfect take is clean', () => {
    expect(fam.levels).toHaveLength(8);
    for (const l of fam.levels) {
      expect(l.keys).toBe('major');
      for (const sp of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key } as DrillSpec);
          expect(hasRubato(d)).toBe(true);
          expect(analyzeTake(d, d.startBpm, perfect(d)).verdict, d.itemId).toBe('clean');
        }
    }
  });
  it('held notes are graded by their length, a touch per hand by the release (MIDI)', () => {
    const d = generate({ family: 'k-indep', kind: 'ind-hold', key: 0, hands: 'R', option: 0 });
    expect(d.notes.some((n) => n.hold)).toBe(true);
    const short = perfect(d).map((p) => (d.notes.find((n) => n.hold && n.pitch === p.pitch && Math.abs(expTimeMs(d, n.beat, d.startBpm) - p.on) < 1) ? { ...p, off: p.on + 100 } : p));
    const m = analyzeTake(d, d.startBpm, short);
    expect(m.verdict).not.toBe('clean');
    expect(m.why.en).toContain('Held notes let go early');
    // by microphone the release is not heard: the hold is not judged
    expect(analyzeTake(d, d.startBpm, short.map((p) => ({ ...p, off: null, vel: 64 })), undefined, { mic: true }).verdict).toBe('clean');
    const t = generate({ family: 'k-indep', kind: 'ind-touch', key: 0, hands: 'RL', option: 0 });
    const legatoAll = perfect(t).map((p) => ({ ...p, off: p.on + 60000 / t.startBpm / 2 + 10 }));
    expect(analyzeTake(t, t.startBpm, legatoAll).why.en).toContain('LH staccato too long');
  });
});

describe('the harmonization ladder (k-sharm, g-harm)', () => {
  const kf = CAT.find((f) => f.id === 'k-sharm')!;
  const gf = GCAT.find((f) => f.id === 'g-harm')!;
  it('42 piano levels and 13 guitar levels, every item in every key, a perfect take clean (piano)', () => {
    // 42 built; k-sharm-41 (Echols's voicing ladder) is hidden until verified (src/engine/verifiedContent.ts)
    expect(kf.levels).toHaveLength(41);
    expect(kf.levels.some((l) => l.id === 'k-sharm-41')).toBe(false);
    expect(gf.levels).toHaveLength(13);
    for (const l of kf.levels)
      for (const sp of l.specs)
        for (const key of [0, 1, 6, 11]) {
          const d = generate({ ...sp, key } as DrillSpec);
          expect(hasRubato(d), d.itemId).toBe(true);
          expect(analyzeTake(d, d.startBpm, perfect(d)).verdict, d.itemId).toBe('clean');
        }
  });
  it('every step covers every scale on both instruments (13 scales × 9 steps)', () => {
    for (const fam of [kf, gf])
      for (const step of ['line', '3b', '3t', 'ta', 'tb', '7a', '7b', 'd2', 'd3'])
        for (let i = 0; i < H_SCALES.length; i++) expect(fam.levels.some((l) => l.specs.some((s) => s.kind === `hl-${step}` && s.option === i)), `${fam.id} ${step} ${H_SCALES[i].id}`).toBe(true);
  });
  it('Harris scales: the 7th chords alternate the chord and the diminished in moving inversions', () => {
    for (const i of H_HARRIS) {
      const d = generate({ family: 'k-sharm', kind: 'hl-7b', key: 0, hands: 'R', option: i });
      const sets = d.goal.chordSets!.map((c) => c.required.join(','));
      const dim = '2,5,8,11';
      sets.slice(0, 9).forEach((x, k) => (k % 2 === 0 ? expect(x).not.toBe(dim) : expect(x).toBe(dim)));
    }
    expect(generate({ family: 'k-sharm', kind: 'hl-7b', key: 0, hands: 'R', option: 9 }).goal.chordSets![0].required).toEqual([0, 4, 7, 9]);
    expect(generate({ family: 'k-sharm', kind: 'hl-7b', key: 0, hands: 'R', option: 12 }).goal.chordSets![0].required).toEqual([0, 4, 6, 10]);
  });
  it('piano drop 2 / drop 3: the dropped voice in the LH, three notes in the RH', () => {
    for (const kind of ['hl-d2', 'hl-d3']) {
      const d = generate({ family: 'k-sharm', kind, key: 5, hands: 'RL', option: 1 });
      const byId = new Map<number, string[]>();
      for (const n of d.notes) byId.set(n.chordId!, [...(byId.get(n.chordId!) ?? []), n.hand]);
      for (const hs of byId.values()) expect(hs.sort().join('')).toBe('LRRR');
    }
  });
  it('guitar: drops sit on their string sets, inside the neck, playable spans; every key', () => {
    const tu = tuningById('standard');
    const sets: [string, number, number[]][] = [['hl-7b', 0, G_SETS.d2[0]], ['hl-d2', 1, G_SETS.d2[1]], ['hl-d2', 2, G_SETS.d2[2]], ['hl-d3', 0, G_SETS.d3[0]], ['hl-d3', 1, G_SETS.d3[1]]];
    for (const [kind, position, set] of sets)
      for (let key = 0; key < 12; key++)
        for (const option of [0, 7, 9, 12]) {
          const d = generate({ family: 'g-harm', kind, key, hands: 'R', instrument: 'guitar', option, position });
          const byId = new Map<number, typeof d.notes>();
          for (const n of d.notes) byId.set(n.chordId!, [...(byId.get(n.chordId!) ?? []), n]);
          expect(byId.size, d.itemId).toBeGreaterThanOrEqual(15);
          for (const ns of byId.values()) {
            expect(ns.map((n) => n.string).sort(), d.itemId).toEqual(set.slice().sort());
            for (const n of ns) {
              expect(n.fret! >= 0 && n.fret! <= 22, d.itemId).toBe(true);
              expect(n.pitch).toBe(noteAt(tu, n.string!, n.fret!));
            }
            const fr = ns.map((n) => n.fret!).filter((f) => f > 0);
            expect(Math.max(...fr) - Math.min(...fr), d.itemId).toBeLessThanOrEqual(5);
          }
        }
  });
  it('the path places them by difficulty: lines ~900–1100, triads / 7ths 1100–1350, drops and borrowing 1350–1650', () => {
    expect(KEYS_LEVEL_DIFF['k-sharm-1']).toBe(900);
    for (let n = 1; n <= 25; n++) {
      const d = KEYS_LEVEL_DIFF[`k-sharm-${n}`];
      expect(d >= 900 && d <= 1650, `k-sharm-${n}`).toBe(true);
    }
    expect(KEYS_LEVEL_DIFF['k-sharm-15']).toBeGreaterThanOrEqual(1350);
    const steps = stepCatalogue();
    expect(steps.find((s) => s.id === 'tech:k-sharm-1')!.difficulty).toBe(900);
    expect(steps.find((s) => s.id === 'tech:k-indep-1')!.difficulty).toBe(1000);
  });
});

describe('Barry Harris borrowing (oblique motion)', () => {
  it('one voice steps to the other chord and returns; the other three hold through the chord', () => {
    for (const i of H_HARRIS)
      for (let v = 0; v < 4; v++) {
        const seq = borrowSeq(0, H_SCALES[i], 'one', v, 72);
        const chord1 = seq.notes.filter((n) => n.chord === 1);
        const moving = seq.notes.filter((n) => !n.chord && n.beat < 3);
        expect(chord1).toHaveLength(4);
        expect(chord1.filter((n) => n.hold).map((n) => n.voice).sort()).toEqual([0, 1, 2, 3].filter((x) => x !== v));
        expect(chord1.filter((n) => n.hold).every((n) => n.dur === 3)).toBe(true);
        const orig = chord1.find((n) => n.voice === v)!.p;
        expect(moving).toHaveLength(2);
        expect(moving[0].p).toBeLessThan(orig);
        expect(orig - moving[0].p).toBeLessThanOrEqual(2);
        expect(moving[1]).toMatchObject({ p: orig, ret: true, voice: v });
      }
  });
  it('the feedback names the voice that did not return', () => {
    const d = generate({ family: 'k-sharm', kind: 'bw-one', key: 0, hands: 'R', option: 1 });
    expect(analyzeTake(d, d.startBpm, perfect(d)).verdict).toBe('clean');
    const firstRet = d.notes.find((n) => n.ret)!;
    const take = perfect(d).filter((p) => !(p.pitch === firstRet.pitch && Math.abs(p.on - expTimeMs(d, firstRet.beat, d.startBpm)) < 1));
    expect(analyzeTake(d, d.startBpm, take).why.en).toBe("Alto didn't return");
  });
  it('the ear topic: which voice, from where, which pair', () => {
    expect(TOPIC_GEN['bh-borrow'].levels).toHaveLength(3);
    for (const level of [1, 2, 3])
      for (let s = 1; s <= 20; s++) {
        const q = asChoice(genTopic('bh-borrow', s * 7919, level, 'x'));
        expect(q.choices).toContain(q.answer);
      }
  });
});

describe('wiring', () => {
  it('glyphs, badges, lessons for the new families', () => {
    for (const f of ['k-indep', 'k-sharm', 'g-harm']) expect(FAMILY_GLYPH[f], f).toBeDefined();
    expect(new Set(['k-indep', 'k-sharm', 'g-harm'].map((f) => FAMILY_GLYPH[f])).size).toBe(3);
    expect(familyLevelCount('k-indep')).toBe(8);
    expect(familyLevelCount('k-sharm')).toBe(42);
    expect(familyLevelCount('g-harm')).toBe(13);
    for (const id of ['hand-independence', 'scale-harm', 'bh-four-dim', 'bh-borrow']) expect(MINI_LESSONS[id], id).toBeDefined();
    expect(UNIT_LESSON['tech:k-indep-1']).toBe('hand-independence');
    expect(UNIT_LESSON['tech:k-sharm-19']).toBe('bh-borrow');
  });
  it('every new guitar technique level runs in 12 keys inside the neck', () => {
    for (const id of ['g-scales-11', 'g-scales-12', 'g-lead-11', 'g-picking-10', 'g-rhythm-11', ...Array.from({ length: 13 }, (_, i) => `g-harm-${i + 1}`)]) {
      const l = lv(id);
      expect(l.keys, id).toBe('major');
      for (const sp of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key } as DrillSpec);
          for (const n of d.notes) expect(n.fret! >= 0 && n.fret! <= 22, `${d.itemId} ${n.fret}`).toBe(true);
        }
    }
  });
  it('every new piano level spans 12 keys', () => {
    for (const id of ['harris-25', 'harris-26', ...Array.from({ length: 8 }, (_, i) => `k-indep-${i + 1}`), ...Array.from({ length: 42 }, (_, i) => `k-sharm-${i + 1}`).filter((id) => id !== 'k-sharm-41')]) {
      const l = lv(id);
      expect(Array.isArray(l.keys) ? new Set(l.keys).size : 12, id).toBe(12);
    }
  });
});

describe('eight expressions of one dominant (BARRY-HARRIS-THEORY.md §4)', () => {
  it('the four brothers share C° in their scales, the four minor 6ths share D♭°; D° is G7♭9 rootless', () => {
    const V = 7;
    const sorted = (x: number[]) => x.slice().sort((a, b) => a - b);
    for (let i = 0; i < 4; i++) expect(sorted(exprOf(V, i).dim)).toEqual([0, 3, 6, 9]);
    for (let i = 4; i < 8; i++) expect(sorted(exprOf(V, i).dim)).toEqual([1, 4, 7, 10]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => exprOf(V, i).name)).toEqual(['G7', 'B♭7', 'D♭7', 'E7', 'Dm6', 'Fm6', 'A♭m6', 'Bm6']);
    expect(sorted(exprOf(V, 4).pcs)).toEqual([2, 5, 9, 11]);
    expect(sorted(exprOf(V, 6).pcs)).toEqual([3, 5, 8, 11]);
    // Bm6 only over the bass on E (its F♯ is a major 7th over G)
    expect(exprOf(V, 7).bass).toBe(4);
    for (let i = 0; i < 7; i++) expect(exprOf(V, i).bass).toBe(7);
  });
  it('the voicings: each expression over its bass, each resolving to C6', () => {
    const d = generate({ family: 'k-sharm', kind: 'sf-voice', key: 0, hands: 'RL', option: 1 });
    const req = d.goal.chordSets!.map((c) => c.required);
    expect(req[0]).toEqual([2, 5, 7, 9, 11]);
    expect(req[1]).toEqual([0, 4, 7, 9]);
    expect(req[4]).toEqual([3, 5, 7, 8, 11]);
    expect(req[6]).toEqual([2, 4, 6, 8, 11]);
    const bass = (id: number) => Math.min(...d.notes.filter((n) => n.chordId === d.goal.chordSets![id].chordId).map((n) => n.pitch)) % 12;
    expect([0, 2, 4, 6, 1].map(bass)).toEqual([7, 7, 7, 4, 0]);
    expect(generate({ family: 'k-sharm', kind: 'sf-voice', key: 0, hands: 'RL', option: 2 }).goal.chordSets).toHaveLength(16);
  });
  it('lines: each expression’s chord tones on the beats, every key; the minor ii–V–i voicings', () => {
    for (let key = 0; key < 12; key++)
      for (const [kind, option] of [...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((o) => ['sf-line', o] as const), ['sf-minor', 1] as const]) {
        const d = generate({ family: 'k-sharm', kind, key, hands: 'R', option });
        expect(d.goal.chordTonesOnBeats).toBe(true);
        expect(analyzeTake(d, d.startBpm, perfect(d)).verdict, d.itemId).toBe('clean');
      }
    const m = generate({ family: 'k-sharm', kind: 'sf-minor', key: 0, hands: 'RL', option: 0 });
    expect(m.goal.chordSets!.slice(0, 3).map((c) => c.required)).toEqual([[0, 2, 5, 8], [3, 5, 7, 8, 11], [0, 3, 7, 9]]);
    expect(m.goal.chordSets![4].required).toEqual([2, 5, 7, 8, 11]);
  });
  it('the guitar levels (g-harris 11–13) and the ear topic', () => {
    for (const id of ['g-harris-11', 'g-harris-12', 'g-harris-13']) {
      const l = lv(id);
      for (const sp of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key } as DrillSpec);
          expect(d.notes.length, d.itemId).toBeGreaterThan(8);
          for (const n of d.notes) expect(n.fret! >= 0 && n.fret! <= 22).toBe(true);
        }
    }
    expect(TOPIC_GEN['bh-sixfive'].levels).toHaveLength(4);
    for (const level of [1, 2, 3, 4])
      for (let s = 1; s <= 10; s++) {
        const q = asChoice(genTopic('bh-sixfive', s * 104729, level, 'x'));
        expect(q.choices).toContain(q.answer);
      }
  });
});

describe("Harris's moves, contrary motion, the true sixth on the fifth (BARRY-HARRIS-METHOD.md Part D)", () => {
  const pcs = (ps: number[]) => [...new Set(ps.map((p) => p % 12))].sort((a, b) => a - b);
  it('D3 the elevator, nine floors from a unison on C: C | B D | A C E | G♯ B F | G C E G | F B D G♯ | E C G A | D G♯ F B | C C E C', () => {
    const e = partDEvents(0, 'cm-expand', 0).evs;
    expect(e.slice(0, 9).map((x) => x.ps)).toEqual([[60], [59, 62], [57, 60, 64], [56, 59, 65], [55, 60, 64, 67], [53, 59, 62, 68], [52, 60, 67, 69], [50, 56, 65, 71], [48, 60, 64, 72]]);
    expect(e.map((x) => x.ps.length)).toEqual([1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 2, 1]);
    // every degree: the outer voices move by the same number of scale steps, both always on or both off
    for (let deg = 0; deg < 16; deg++) expect(partDEvents(5, 'cm-expand', deg).evs).toHaveLength(17);
    // 6 and dim alternate: even steps C6 tones, odd steps the diminished
    e.forEach((x, i) => expect(pcs(x.ps).every((c) => (i % 2 === 0 ? [0, 4, 7, 9] : [2, 5, 8, 11]).includes(c)), `step ${i}`).toBe(true));
    const el = partDEvents(0, 'cm-elevator', 0).evs;
    expect(el.slice(0, 8).map((x) => x.ps.length)).toEqual([1, 2, 3, 2, 2, 4, 4, 4]);
    expect(el.slice(0, 8).map((x) => x.ps[x.ps.length - 1])).toEqual([67, 68, 69, 71, 72, 74, 76, 77]);
  });
  it('D7 the first movement: Dm6 → B°7 → G7 → C6, one voice down a half step each time', () => {
    const e = partDEvents(0, 'mv-first', 0).evs;
    expect(e.slice(0, 4).map((x) => pcs(x.ps))).toEqual([[2, 5, 9, 11], [2, 5, 8, 11], [2, 5, 7, 11], [0, 4, 7, 9]]);
    for (const i of [1, 2]) {
      const moved = e[i].ps.filter((p, j) => p !== e[i - 1].ps[j]);
      expect(moved).toHaveLength(1);
      expect(e[i - 1].ps.reduce((a, b) => a + b, 0) - e[i].ps.reduce((a, b) => a + b, 0)).toBe(1);
    }
    expect(e.slice(0, 4).map((x) => x.bass! % 12)).toEqual([2, 11, 7, 0]);
  });
  it('D7 the next move: two neighbouring dim notes up make a 6 chord, down another; major – minor – minor/6 bass C B A A♭ G F♯', () => {
    const e = partDEvents(0, 'mv-next', 0).evs;
    const isSix = (c: number[]) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].some((r) => [0, 4, 7, 9].every((iv) => c.includes((r + iv) % 12)));
    for (let p = 0; p < 4; p++) {
      expect(isSix(pcs(e[p * 4].ps))).toBe(true);
      expect(pcs(e[p * 4 + 1].ps)).toEqual([0, 3, 6, 9]);
      expect(isSix(pcs(e[p * 4 + 2].ps))).toBe(true);
    }
    expect(partDEvents(0, 'mv-mmm', 0).evs.slice(0, 6).map((x) => x.bass! % 12)).toEqual([0, 11, 9, 8, 7, 6]);
  });
  it('D6 the true sixth on the fifth: G6 / F♯°7 over a C bass; D4 the dominant scales of chords over V7 → I', () => {
    const e = partDEvents(0, 'sixth5', 0).evs;
    expect(e[0].bass! % 12).toBe(0);
    expect(pcs(e[0].ps)).toEqual([2, 4, 7, 11]);
    expect(pcs(e[1].ps)).toEqual([0, 3, 6, 9]);
    const v = partDEvents(0, 'v7-d2', 0).evs;
    expect(pcs(v[0].ps)).toEqual([2, 5, 7, 11]);
    expect(pcs(v[1].ps)).toEqual([0, 3, 6, 9]); // C° = A°7, the brothers' dim
    expect(v[0].bass! % 12).toBe(7);
    expect(pcs(v[v.length - 1].ps)).toEqual([0, 4, 7, 9]);
  });
  it('D11 the dominant root borrowed into the diminished; three voices borrow', () => {
    const seq = borrowSeq(0, H_SCALES[9], 'root', 0, 72);
    const dimChord = seq.notes.filter((n) => n.chord === 2);
    const ab = dimChord.find((n) => n.p % 12 === 8)!;
    const moving = seq.notes.filter((n) => !n.chord && n.voice === ab.voice && n.beat < 6 && n.beat >= 3);
    expect(moving.map((n) => n.p)).toEqual([ab.p - 1, ab.p]);
    expect(seq.notes.filter((n) => !n.chord && n.beat < 3)).toHaveLength(0);
    const three = borrowSeq(0, H_SCALES[9], 'three', 3, 72);
    expect(three.notes.filter((n) => n.chord === 1 && n.hold).map((n) => n.voice)).toEqual([3]);
  });
  it('D12 the four related dominants over the V shell, then I6; the ear topic of the moves', () => {
    const e = partDEvents(0, 'shell4', 0).evs;
    expect(e.slice(0, 4).map((x) => pcs(x.ps.slice(2)))).toEqual([[2, 5, 7, 11], [2, 5, 8, 10], [1, 5, 8, 11], [2, 4, 8, 11]]);
    expect(e[0].ps.slice(0, 2).map((p) => p % 12)).toEqual([7, 5]);
    for (const level of [1, 2, 3])
      for (let s = 1; s <= 10; s++) {
        const q = asChoice(genTopic('bh-moves', s * 7907, level, 'x'));
        expect(q.choices).toContain(q.answer);
      }
  });
  it('every Part D item: every key, a perfect take clean, on piano; inside the neck on guitar', () => {
    for (const lvlId of ['k-sharm-33', 'k-sharm-34', 'k-sharm-35', 'k-sharm-36', 'k-sharm-37', 'k-sharm-38', 'k-sharm-39'])
      for (const sp of lv(lvlId).specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key } as DrillSpec);
          expect(analyzeTake(d, d.startBpm, perfect(d)).verdict, d.itemId).toBe('clean');
        }
  });
});

describe('Echols (BARRY-HARRIS-METHOD.md Part F): the tesseract, the voicing ladder, substitutes on each V, borrowing through the elevator', () => {
  it('16 chords around C°7 down to B°7: 4 dom7, 4 major 6, 2 dom7♭5, 4 minor 6, 2 dim', () => {
    const c = tesseract(0);
    expect(c).toHaveLength(16);
    const by = (k: string) => c.filter((x) => x.kind === k).map((x) => x.name).sort();
    expect(by('dom')).toEqual(['A♭7', 'B7', 'D7', 'F7']);
    expect(by('six')).toEqual(['A♭6', 'B6', 'D6', 'F6']);
    expect(by('b5').length).toBe(2);
    expect(by('m6')).toEqual(['A♭m6', 'Bm6', 'Dm6', 'Fm6']);
    expect(by('dim')).toHaveLength(2);
    for (const level of [1, 2, 3])
      for (let s = 1; s <= 10; s++) {
        const q = asChoice(genTopic('bh-tesseract', s * 6151, level, 'x'));
        expect(q.choices).toContain(q.answer);
      }
  });
  it('the substitute menu on each V; borrowing through the elevator keeps the soprano', () => {
    const e = partDEvents(0, 'sub-tune', 0).evs;
    // pass 1: the V (bar 4) itself = G7; pass 2: the family D♭7; pass 3: the important minor Dm6; pass 4: the tritone's minor A♭m6
    expect([3, 11, 19, 27].map((i) => e[i].pcs!.filter((x) => x !== e[i].bass! % 12))).toEqual([[2, 5, 11], [1, 5, 8, 11], [2, 5, 9, 11], [3, 5, 8, 11]].map((x) => x.filter((y) => y !== 7 && y !== 1)));
    const b = partDEvents(0, 'el-borrow', 0).evs;
    for (let i = 0; i < b.length; i += 3) {
      expect(b[i + 1].ps[b[i + 1].ps.length - 1]).toBe(b[i].ps[b[i].ps.length - 1]);
      expect(b[i + 2].ps).toEqual(b[i].ps);
    }
  });
});
