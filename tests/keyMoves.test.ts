// Key changes and turnarounds (docs/AUDIT-GAPS-2.md #5, #6, #11, #12): the music core, the k-keys / g-keys / b-keys
// families in all 12 keys, and the ear topics (how it modulated, where to, a tune's key centres).
import { describe, expect, it } from 'vitest';
import { bridge, chordPcs, dimMove, directMove, iiVMove, keyName, moveDim, pivotMove, popMove, sixDimLine, spellDeg, tritoneMove, turnaround } from '../src/engine/keyMoves';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { kmPlan, KM_KEYS } from '../src/engine/drills/keyMoveDrills';
import { classify, gradeVoicings, motion } from '../src/engine/drills/voiceLead';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';
import type { ChoiceQuestion } from '../src/engine/lesson';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const pcs = (xs: number[]) => [...new Set(xs.map(mod12))].sort((a, b) => a - b);

describe('key moves: the music', () => {
  it('C6 → B°7 → E7 → A6: the chord tones, and the diminished turns into E7 by one half step', () => {
    const m = dimMove(0, 9);
    expect(m.chords.map((c) => c.name)).toEqual(['C6', 'B°7', 'E7', 'A6']);
    expect(chordPcs(m.chords[0])).toEqual([0, 4, 7, 9]);
    expect(pcs(chordPcs(m.chords[1]))).toEqual([2, 5, 8, 11]);
    expect(pcs(chordPcs(m.chords[2]))).toEqual([2, 4, 8, 11]);
    expect(pcs(chordPcs(m.chords[3]))).toEqual([1, 4, 6, 9]);
    // three notes shared, one lowered a half step (F → E)
    const dim = chordPcs(m.chords[1]);
    const dom = chordPcs(m.chords[2]);
    expect(dim.filter((p) => dom.includes(p)).length).toBe(3);
    expect(dim.filter((p) => !dom.includes(p))).toEqual([5]);
    expect(dom.filter((p) => !dim.includes(p))).toEqual([4]);
  });

  it('the four doors of B°7 are G7, B♭7, D♭7 and E7 (C, E♭, G♭, A), spelled in their keys', () => {
    expect([0, 3, 6, 9].map((off) => dimMove(0, off).chords.slice(1).map((c) => c.name).join(' '))).toEqual(['B°7 G7 C6', 'B°7 B♭7 E♭6', 'B°7 D♭7 G♭6', 'B°7 E7 A6']);
  });

  it('every move: the diminished becomes the V7 by lowering one note a half step, or the 7♭9 by raising one a whole step', () => {
    for (const A of KM_KEYS)
      for (let off = 1; off < 12; off++) {
        const B = A + off;
        const d = moveDim(A, B);
        const dim = chordPcs(d);
        expect(dim).toContain(mod12(B - 1)); // the leading tone of key B is in the diminished
        const V = chordPcs(dimMove(A, B).chords[2]);
        const lowered = dim.filter((p) => !V.includes(p));
        expect(lowered.length, `${A}→${B}`).toBe(1);
        expect(V).toContain(mod12(lowered[0] - 1));
        expect(mod12(dimMove(A, B).chords[2].root - B)).toBe(7);
        const b9 = dimMove(A, B, { b9: true }).chords[2];
        expect(b9.name.endsWith('7♭9')).toBe(true);
        const raised = dim.filter((p) => !chordPcs(b9).includes(p));
        expect(raised.length).toBe(1);
        expect(mod12(raised[0] + 2)).toBe(b9.root);
        // from key A's own diminished when key B is a minor third away
        if (off % 3 === 0) expect(d.name).toBe(`${spellDeg(A, 11, 6)}°7`);
      }
  });

  it('spells flat keys with flats and sharp keys with sharps; key names', () => {
    expect(spellDeg(9, 1, 1)).toBe('B♭'); // ♭II in A
    expect(spellDeg(5, 1, 0)).toBe('F♯'); // ♯I in F
    expect(spellDeg(10, 1, 0)).toBe('B'); // ♯I in B♭
    expect(spellDeg(4, 4, 2)).toBe('G♯'); // III in E
    expect(turnaround(0, 'ladybird').map((c) => c.name)).toEqual(['Cmaj7', 'E♭7', 'A♭maj7', 'D♭7', 'Cmaj7']);
    expect(turnaround(9, 'tritone').map((c) => c.name)).toEqual(['Amaj7', 'C7', 'F7', 'B♭7', 'Amaj7']);
    expect(turnaround(0, 'dim').map((c) => c.name).slice(0, 5)).toEqual(['Cmaj7', 'C♯°7', 'Dm7', 'D♯°7', 'Em7']);
    expect(turnaround(5, 'vi7').map((c) => c.name)).toEqual(['Fmaj7', 'D7', 'Gm7', 'C7', 'Fmaj7']);
    expect(bridge(10).map((c) => c.name)).toEqual(['D7', 'G7', 'C7', 'F7', 'B♭maj7']);
    expect(keyName(6)).toBe('G♭');
    expect(keyName(6, true)).toBe('F♯m');
  });

  it('the other means: pivot, ii–V, tritone sub, direct, pop', () => {
    expect(pivotMove(0, 0).chords.map((c) => c.name)).toEqual(['Cmaj7', 'Am7', 'D7', 'Gmaj7']);
    expect(pivotMove(0, 3).chords.map((c) => c.name)).toEqual(['Cmaj7', 'Fmaj7', 'Bm7♭5', 'E7', 'Am6']);
    expect(pivotMove(0, 3).toMinor).toBe(true);
    // a pivot chord belongs to both keys (diatonic in A and in B)
    const major = (k: number) => [0, 2, 4, 5, 7, 9, 11].map((x) => mod12(k + x));
    for (let w = 0; w < 3; w++) {
      const m = pivotMove(3, w);
      const p = m.chords.find((c) => c.role === 'move')!;
      for (const pc of chordPcs(p)) {
        expect(major(m.from)).toContain(pc);
        expect(major(m.to)).toContain(pc);
      }
    }
    expect(iiVMove(0, 3).chords.map((c) => c.name)).toEqual(['Cmaj7', 'Fm7', 'B♭7', 'E♭maj7']);
    expect(tritoneMove(0, 8).chords.map((c) => c.name)).toEqual(['Cmaj7', 'B♭m7', 'A7', 'A♭maj7']);
    expect(directMove(0, 3).chords.map((c) => c.name)).toEqual(['Cmaj7', 'G7', 'Cmaj7', 'E♭maj7', 'B♭7', 'E♭maj7']);
    expect(popMove(0, 1, false).chords.map((c) => c.name)).toEqual(['C', 'F', 'G', 'D♭', 'G♭', 'A♭', 'D♭']);
    expect(popMove(0, 2, true).chords.map((c) => c.name)).toEqual(['C', 'F', 'G', 'A', 'D', 'G', 'A', 'D']);
  });

  it('the 6th-diminished line: key A scale up, the diminished and V7, key B scale down to its tonic', () => {
    const l = sixDimLine(0, 9, 55);
    expect(l.length).toBe(25);
    expect(l.slice(0, 8).map((n) => mod12(n.pitch))).toEqual([0, 2, 4, 5, 7, 8, 9, 11]);
    expect(pcs(l.slice(8, 12).map((n) => n.pitch))).toEqual([2, 5, 8, 11]);
    expect(pcs(l.slice(12, 16).map((n) => n.pitch))).toEqual([2, 4, 8, 11]);
    expect(l.slice(16, 24).map((n) => mod12(n.pitch))).toEqual([9, 8, 6, 5, 4, 2, 1, 11]);
    expect(mod12(l[24].pitch)).toBe(9);
    expect(l[24].beat).toBe(12);
    for (let i = 1; i < l.length; i++) expect(Math.abs(l[i].pitch - l[i - 1].pitch)).toBeLessThanOrEqual(12);
  });
});

describe('key moves: voice leading at the piano', () => {
  it('C6 → B°7 → E7 → A6 voice-led: the °7 → E7 change is one half step, and any note of the °7 may be in the bass', () => {
    const { goal, path } = kmPlan({ family: 'k-keys', kind: 'km-dim', key: 0, hands: 'RL', option: 2 });
    expect(goal.chords.map((c) => c.name)).toEqual(['C6', 'B°7', 'E7', 'A6']);
    expect(path.length).toBe(4);
    expect(motion(path[1], path[2]).total).toBe(1);
    const steps = gradeVoicings(path.map((v, i) => [36 + mod12(goal.chords[i].root), ...v]), goal);
    expect(steps.every((s) => s.verdict === 'clean')).toBe(true);
    // D under B°7 is fine; D under E7 is not
    expect(classify([38, ...path[1]], goal.chords[1], goal).ok).toBe(true);
    expect(classify([38, ...path[2]], goal.chords[2], goal).kind).toBe('bass');
  });
});

describe('key moves: the families', () => {
  const piano = catalog().find((f) => f.id === 'k-keys')!;
  const guitar = guitarCatalog().find((f) => f.id === 'g-keys')!;
  const bass = guitarCatalog().find((f) => f.id === 'b-keys')!;

  it('12 levels each, titled in English and Hebrew, every level in all 12 keys', () => {
    for (const f of [piano, guitar, bass]) {
      expect(f.levels.length, f.id).toBe(12);
      f.levels.forEach((l, i) => {
        expect(l.level).toBe(i + 1);
        expect(l.id).toBe(`${f.id}-${i + 1}`);
        expect(/[֐-׿]/.test(l.title.he)).toBe(true);
        expect([...(l.keys as number[])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      });
    }
  });

  it('every item of every level generates in all 12 keys (voicings fit, lines in range)', () => {
    for (const f of [piano, guitar, bass])
      for (const l of f.levels)
        for (const key of l.keys as number[])
          for (const sp of l.specs) {
            const d = generate({ ...sp, key });
            const where = `${l.id} ${sp.kind}#${sp.option} ${key}`;
            expect(d.notes.length, where).toBeGreaterThan(3);
            expect(d.beats, where).toBeGreaterThan(0);
            expect(d.chart?.length, where).toBeGreaterThan(0);
            expect(d.title.en.length, where).toBeGreaterThan(5);
            if (f.id !== 'k-keys') for (const n of d.notes) expect(n.fret!, where).toBeGreaterThanOrEqual(0);
            if (d.goal.vl) expect(d.goal.vl.chords.length, where).toBe(d.goal.vl.at.length);
          }
  }, 120000);

  it('piano chords are voice-led and graded by the voice-leading grader; the line is plain notes', () => {
    const d = generate({ family: 'k-keys', kind: 'km-iiv', key: 2, hands: 'RL', option: 1 });
    expect(d.goal.vl?.type).toBe('close');
    expect(d.title.en).toContain('D → F');
    const line = generate({ family: 'k-keys', kind: 'km-line', key: 0, hands: 'R', option: 0 });
    expect(line.goal.vl).toBeUndefined();
    expect(line.notes.length).toBe(25);
    const bridgeGuide = generate({ family: 'k-keys', kind: 'km-bridge', key: 0, hands: 'RL', option: 0 });
    expect(bridgeGuide.goal.vl?.type).toBe('guide');
    expect(bridgeGuide.chart).toEqual(['E7', 'A7', 'D7', 'G7', 'Cmaj7']);
  });

  it('guitar: drop 2 on 4-3-2-1 / 5-4-3-2, triads for the pop lift; the tab is the model path', () => {
    const d = generate({ family: 'g-keys', kind: 'km-dim', key: 0, hands: 'R', instrument: 'guitar', option: 2, position: 1 });
    expect(d.goal.vl?.type).toBe('drop2');
    expect(d.goal.vl?.strings).toEqual([[5, 4, 3, 2]]);
    expect(new Set(d.notes.map((n) => n.string))).toEqual(new Set([5, 4, 3, 2]));
    const pop = generate({ family: 'g-keys', kind: 'km-direct', key: 0, hands: 'R', instrument: 'guitar', option: 2, position: 0 });
    expect(pop.goal.vl?.type).toBe('triad');
  });

  it('bass: the line leads the move — roots on the chord changes, a half-step approach into each new root', () => {
    const d = generate({ family: 'b-keys', kind: 'km-dim', key: 0, hands: 'R', instrument: 'bass', option: 2, perBeat: 1 });
    // C6 (4 beats), B°7, E7, A6
    const at = (b: number) => d.notes.find((n) => Math.abs(n.beat - b) < 1e-6)!;
    expect(mod12(at(0).pitch)).toBe(0);
    expect(mod12(at(4).pitch)).toBe(11);
    expect(mod12(at(6).pitch)).toBe(4);
    expect(mod12(at(8).pitch)).toBe(9);
    for (const b of [3, 5, 7]) expect(Math.abs(at(b).pitch - at(b + 1).pitch)).toBe(1);
  });
});

describe('modulation by ear', () => {
  const q = (topic: string, level: number, seed: number) => TOPIC_GEN[topic].gen(seed, level, 'x') as ChoiceQuestion;

  it('modulation-means: five levels, the answer is among the choices, every choice can be heard', () => {
    expect(TOPIC_GEN['modulation-means'].levels.length).toBe(5);
    for (let level = 1; level <= 5; level++)
      for (let seed = 1; seed <= 40; seed++) {
        const x = q('modulation-means', level, seed);
        expect(x.choices).toContain(x.answer);
        expect(new Set(x.choices).size).toBe(x.choices.length);
        expect(x.stimulus.length).toBeGreaterThan(4);
        for (const c of x.choices) expect(x.names[c]?.en, `${level} ${c}`).toBeTruthy();
        expect(x.difficulty).toBeGreaterThanOrEqual(1300);
        expect(x.difficulty).toBeLessThanOrEqual(1650);
      }
  });

  it('modulation-means: the pool grows level by level (pivot/direct → + ii–V → + common dim → + tritone)', () => {
    const seen = (level: number) => new Set(Array.from({ length: 80 }, (_, s) => q('modulation-means', level, s + 1).answer));
    expect([...seen(1)].sort()).toEqual(['direct', 'pivot']);
    expect([...seen(2)].sort()).toEqual(['direct', 'iiv', 'pivot']);
    expect([...seen(3)].sort()).toEqual(['dim', 'direct', 'iiv', 'pivot']);
    expect([...seen(4)].sort()).toEqual(['dim', 'direct', 'iiv', 'pivot', 'tritone']);
  });

  it('key-centres: where to (distant keys), name the new key, and a tune’s key centres in order', () => {
    expect(TOPIC_GEN['key-centres'].levels.length).toBe(3);
    for (let level = 1; level <= 3; level++)
      for (let seed = 1; seed <= 40; seed++) {
        const x = q('key-centres', level, seed);
        expect(x.choices).toContain(x.answer);
        expect(new Set(x.choices).size).toBe(x.choices.length);
        for (const c of x.choices) expect(x.names[c]?.he, `${level} ${c}`).toBeTruthy();
      }
    // level 2: the answer is the key the stimulus ends in (its last chord's root)
    for (let seed = 1; seed <= 30; seed++) {
      const x = q('key-centres', 2, seed);
      const last = x.stimulus[x.stimulus.length - 1] as { midis: number[] };
      expect(`k${mod12(Math.min(...last.midis))}`).toBe(x.answer);
    }
    expect(q('key-centres', 3, 7).difficulty).toBeGreaterThanOrEqual(1550);
  });
});
