// Chord progressions by ear as a graded ladder (owner 2026-11-14): the grid dictation (grading per part, the fix-it
// pass, the ladder's chords and spelling in all 12 keys), the instrument levels (k-ear 10–16, g-ear 11–16, b-ear 22–23)
// and the harmony-aware grader of instrument takes.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { TOPIC_GEN } from '../src/engine/topicKit';
import type { GridQuestion } from '../src/engine/lesson';
import { renderStimulus } from '../src/engine/lesson';
import {
  bassPcOf,
  chordPcs,
  colourPcs,
  degSemis,
  gradeGrid,
  gradeGridCells,
  gridCredit,
  gridFixStimulus,
  gridItem,
  gridKey,
  gridLine,
  GRID_LEVELS,
  gridWhy,
  gridWrong,
  keyName,
  mergeFix,
  parseGrid,
  realize,
  rootChips,
  rootName,
  spellDeg,
  type GridCell,
} from '../src/engine/progGrid';
import { rng } from '../src/engine/topicKit';
import { createSession, grade } from '../src/engine/session';
import { ratingScore, xpFor } from '../src/engine/scoring';
import { outcomeOf } from '../src/engine/session';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { expTimeMs } from '../src/engine/drills/analyze';
import { evidenceFromChroma, evidenceFromNotes, gradeHarmony, withHarmony } from '../src/engine/drills/harmonyGrade';
import type { Drill, TakeMetrics } from '../src/engine/drills/types';

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Pitch class of a spelled note at the start of a symbol ("B♭maj7" → 10, "F♯°7" → 6). */
const pcOfName = (sym: string): number => {
  const m = /^([A-G])(𝄫|𝄪|♭|♯)?/.exec(sym)!;
  const acc = { '𝄫': -2, '♭': -1, '♯': 1, '𝄪': 2 }[m[2] ?? ''] ?? 0;
  return (((NOTE_PC[m[1]] + acc) % 12) + 12) % 12;
};
const item = (level: number, seed: number) => gridItem(seed, level, `t${level}-${seed}`, rng(seed));

describe('grid grading: root 0.5, quality 0.3, bass / colour 0.2', () => {
  const want: GridCell[] = [{ root: 2, q: 'm7', x: '9' }, { root: 7, q: '7', x: 'b9' }];
  it('root only = 0.5, root + quality = 0.8, all three = 1, nothing = 0', () => {
    expect(gradeGridCells(want, [{ root: 2, q: 'maj7', x: '13' }, { root: 7, q: 'm7', x: '13' }], true).score).toBeCloseTo(0.5);
    expect(gradeGridCells(want, [{ root: 2, q: 'm7', x: '13' }, { root: 7, q: '7', x: '#9' }], true).score).toBeCloseTo(0.8);
    expect(gradeGridCells(want, want, true).score).toBe(1);
    expect(gradeGridCells(want, [null, null], true).score).toBe(0);
    // Quality and colour right, the root wrong: 0.5.
    expect(gradeGridCells(want, [{ root: 3, q: 'm7', x: '9' }, { root: 1, q: '7', x: 'b9' }], true).score).toBeCloseTo(0.5);
  });
  it('a level without the third row: root and quality share the credit (5 : 3)', () => {
    const g = gradeGridCells([{ root: 0, q: 'maj', x: 'none' }], [{ root: 0, q: 'm', x: 'none' }], false);
    expect(g.score).toBeCloseTo(0.625);
    expect(g.extras).toBeNull();
  });
  it('enharmonics are the same note: answers are pitch classes', () => {
    const q = item(2, 11);
    const a = q.slots.map((c) => ({ root: c.root + 12, q: c.q, x: c.x }));
    expect(gradeGrid(q, gridKey(a)).score).toBe(1);
  });
  it('the session takes the partial credit as the attempt accuracy', () => {
    const q = item(3, 5);
    const lesson = { id: 'topic' as const, version: 1, skill: 'cadences' as const, scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions: [q] };
    let s = { ...createSession(lesson), phase: 'listening' as const };
    const cells = parseGrid(q.answer, q.slots.length) as GridCell[];
    const wrong = cells.map((c, i) => (i === 1 ? { ...c, q: c.q === '7' ? ('m7' as const) : ('7' as const) } : c));
    const [s2, r] = grade(s, s.turn, 0, gridKey(wrong), 'buttons');
    expect(r.kind).toBe('retry');
    const acc = s2.records[0].attempts[0].accuracy!;
    // Level 3 asks no third part: quality is 3/8 of a slot.
    expect(acc).toBeCloseTo(1 - 0.375 / 8, 5);
    s = { ...s2, phase: 'listening' };
    const [s3, r2] = grade(s, s.turn, 0, q.answer, 'buttons');
    expect(r2.kind).toBe('correct');
    // The fix-it credit: first try + half of what the fix recovered.
    const o = outcomeOf(s3.records[0], false);
    expect(ratingScore(q, o)).toBeCloseTo(gridCredit(acc, 1) * 1, 5);
    expect(xpFor(q, o, 10)).toBe(Math.round(10 * gridCredit(acc, 1)));
  });
});

describe('the fix-it pass', () => {
  it('credit = first + half the gain, never lower than the first try', () => {
    expect(gridCredit(0.6, 1)).toBeCloseTo(0.8);
    expect(gridCredit(0.6, 0.4)).toBeCloseTo(0.6);
    expect(gridCredit(0.6, null)).toBeCloseTo(0.6);
    expect(gridCredit(1, 1)).toBe(1);
  });
  it('replays only the wrong bars and keeps the right slots', () => {
    const q = item(5, 21);
    const cells = parseGrid(q.answer, q.slots.length) as GridCell[];
    const first = cells.map((c, i) => (i === 2 || i === 5 ? { ...c, root: (c.root + 1) % 12 } : c));
    const a1 = gridKey(first);
    expect(gridWrong(q, a1)).toEqual([2, 5]);
    const fix = gridFixStimulus(q, a1);
    // Two bars, a rest between them.
    expect(fix.filter((x) => x.kind === 'events')).toHaveLength(2);
    expect(fix.filter((x) => x.kind === 'rest')).toHaveLength(1);
    const len = renderStimulus(fix).length;
    expect(len).toBeLessThan(renderStimulus(q.stimulus).length / 2);
    // The fix-it answer: wrong slots replaced, right ones kept even if the fix tried to change them.
    const g = gradeGrid(q, a1);
    const fixes = cells.map((c, i) => (i === 0 ? { ...c, root: 11 } : c));
    const merged = mergeFix(first, fixes, g.marks);
    expect(gridKey(merged as GridCell[])).toBe(q.answer);
  });
  it('one compact line, and Why? names the first wrong bar', () => {
    const q = item(4, 3);
    const cells = parseGrid(q.answer, q.slots.length) as GridCell[];
    const first = cells.map((c, i) => (i === 1 ? { ...c, x: c.x === 'none' ? ('/3' as const) : ('none' as const) } : c));
    const line = gridLine(q, gridKey(first), 'en');
    expect(line).toMatch(/^Roots ✓ · quality ✓ · bass 7\/8$/);
    expect(gridLine(q, gridKey(first), 'he')).toContain('יסודות ✓');
    expect(gridWhy(q, gridKey(first), 'en')).toMatch(/^Bar 2: /);
    expect(gridWhy(q, q.answer, 'en')).toBeNull();
  });
});

describe('spelling and chord tones (all 12 keys)', () => {
  it('degrees keep their letters: flats in flat keys, sharps in sharp keys', () => {
    expect(realize(3, { deg: '2', q: 'm7', x: 'none', beats: 4 }).sym).toBe('Fm7');
    expect(realize(7, { deg: '#4', q: 'dim7', x: 'none', beats: 4 }).sym).toBe('C♯°7');
    expect(realize(0, { deg: '#4', q: 'dim7', x: 'none', beats: 4 }).sym).toBe('F♯°7');
    expect(realize(0, { deg: 'b2', q: '7', x: '#11', beats: 4 }).sym).toBe('D♭7♯11');
    expect(realize(5, { deg: '4', q: 'maj7', x: '9', beats: 4 }).sym).toBe('B♭maj9');
    expect(realize(3, { deg: 'b7', q: '7', x: '13', beats: 4 }).sym).toBe('D♭13');
    expect(realize(0, { deg: '1', q: 'maj', x: '/3', beats: 4 }).sym).toBe('C/E');
    expect(realize(5, { deg: '5', q: '7', x: '/7', beats: 4 }).sym).toBe('C7/B♭');
    expect(realize(2, { deg: '3', q: '7', x: 'alt', beats: 4 }).sym).toBe('F♯7alt');
    expect(realize(6, { deg: '7', q: 'm7b5', x: 'none', beats: 4 }).sym).toBe('E♯m7♭5');
    expect(keyName(10)).toBe('B♭');
    expect(keyName(10, true)).toBe('סי במול');
  });
  it('diatonic chords of flat keys have no sharps, of sharp keys no flats', () => {
    for (const k of [5, 10, 3, 8, 1]) for (const d of ['1', '2', '3', '4', '5', '6', '7']) expect(spellDeg(k, d), `${k} ${d}`).not.toContain('♯');
    for (const k of [7, 2, 9, 4, 11, 6]) for (const d of ['1', '2', '3', '4', '5', '6', '7']) expect(spellDeg(k, d), `${k} ${d}`).not.toContain('♭');
  });
  it('chord tones: the altered dominant drops its 5th; the colour leaves out root and 5th; slash bass', () => {
    expect(chordPcs({ root: 7, q: '7', x: 'alt' }).sort((a, b) => a - b)).toEqual([2, 5, 7, 8, 10, 11, 3].filter((p) => p !== 2).sort((a, b) => a - b));
    expect(colourPcs({ root: 2, q: 'm7', x: '9' }).sort((a, b) => a - b)).toEqual([0, 4, 5]);
    expect(bassPcOf({ root: 0, q: 'maj7', x: '/7' })).toBe(11);
    expect(bassPcOf({ root: 0, q: 'm', x: '/5' })).toBe(7);
  });
  it('every level, many seeds: symbols match roots, chips are 12 distinct pitch classes spelled for the key', () => {
    for (let level = 1; level <= GRID_LEVELS.length; level++) {
      const tonics = new Set<number>();
      for (let seed = 1; seed <= 60; seed++) {
        const q = item(level, seed * 7919);
        tonics.add(q.tonic);
        expect(q.difficulty).toBe(GRID_LEVELS[level - 1].rating);
        expect(q.spell).toHaveLength(12);
        // One chip per pitch class (no enharmonic decoys), each spelled as that pitch class.
        q.spell.forEach((n, pc) => expect(pcOfName(n), `${n}`).toBe(pc));
        for (const c of q.slots) {
          expect(pcOfName(c.sym), `${c.sym} in ${keyName(q.tonic)}`).toBe(c.root);
          expect(c.root).toBe((q.tonic + degSemis(c.deg) + 12) % 12);
          expect(q.spell[c.root]).toBe(rootName(q.tonic, c.deg));
          expect(c.sym).not.toMatch(/[𝄫𝄪]/);
          expect(q.qualities).toContain(c.q);
          if (q.extras.length) expect(q.extras).toContain(c.x);
          else expect(c.x).toBe('none');
        }
        expect(parseGrid(q.answer, q.slots.length).every(Boolean)).toBe(true);
        expect(gradeGrid(q, q.answer).score).toBe(1);
      }
      expect(tonics.size, `level ${level} keys`).toBe(12);
    }
  });
  it('the ladder: lengths, forms and what each level asks', () => {
    const lens = (level: number) => Array.from({ length: 20 }, (_, i) => item(level, 100 + i).slots.length);
    expect(lens(1).every((n) => n === 4)).toBe(true);
    expect(lens(2).every((n) => n === 4)).toBe(true);
    for (const l of [3, 4, 5, 6]) expect(lens(l).every((n) => n === 8), `level ${l}`).toBe(true);
    expect(lens(7).every((n) => n >= 10)).toBe(true);
    // Level 3: secondary dominants (a dominant that is not V).
    for (let i = 0; i < 20; i++) expect(item(3, 300 + i).slots.some((c) => c.q === '7' && c.deg !== '5')).toBe(true);
    // Level 4: inversions / slash bass.
    for (let i = 0; i < 20; i++) expect(item(4, 400 + i).slots.filter((c) => c.x.startsWith('/')).length).toBeGreaterThanOrEqual(2);
    // Level 5: a tritone sub, the backdoor or a minor ii–V in every item.
    for (let i = 0; i < 20; i++) expect(item(5, 500 + i).slots.some((c) => c.deg === 'b2' || c.deg === 'b7' || c.deg === 'b3' || c.q === 'm7b5')).toBe(true);
    // Level 6: a colour on every chord.
    for (let i = 0; i < 20; i++) expect(item(6, 600 + i).slots.every((c) => c.x !== 'none')).toBe(true);
    // Level 7: twelve bars; level 8: 32 bars played A A B A.
    for (let i = 0; i < 20; i++) {
      const b = item(7, 700 + i);
      expect(b.slots.reduce((a, c) => a + c.beats, 0)).toBe(48);
      const f = item(8, 800 + i) as GridQuestion;
      expect(f.order.reduce((a, k) => a + f.slots[k].beats, 0)).toBe(128);
      expect(f.sections?.map((s) => s.label)).toEqual(['A', 'B']);
    }
    // Voicings: close up to 1450, shells at 1550, rootless above.
    expect(GRID_LEVELS.map((l) => l.voicing)).toEqual(['close', 'close', 'close', 'close', 'shell', 'rootless', 'rootless', 'rootless']);
  });
  it('the topic: 8 levels on the ~700–1900 scale, rated as harmonic dictation', () => {
    const T = TOPIC_GEN['grid-dictation'];
    expect(T.levels).toHaveLength(8);
    expect(GRID_LEVELS.map((l) => l.rating)).toEqual([1100, 1250, 1350, 1450, 1550, 1650, 1750, 1850]);
    const q = T.gen(42, 6, 'x');
    expect(q.kind).toBe('grid');
    expect(rootChips(0, []).join(' ')).toBe('C D♭ D E♭ E F F♯ G A♭ A B♭ B');
  });
});

// ---------------------------------------------------------------- instruments

const PIANO = catalog();
const GUITAR = guitarCatalog();
const fam = (id: string) => [...PIANO, ...GUITAR].find((f) => f.id === id)!;
const level = (fid: string, n: number): LevelDef => fam(fid).levels.find((l) => l.id === `${fid}-${n}`)! as LevelDef;
const pcOf = (k: number) => ((k % 12) + 12) % 12;

describe('instrument playback ladders: every new level in all 12 keys', () => {
  const NEW: [string, number[]][] = [
    ['k-ear', [10, 11, 12, 13, 14, 15, 16]],
    ['g-ear', [11, 12, 13]],
    ['b-ear', [22, 23]],
  ];
  for (const [fid, ns] of NEW)
    it(`${fid} ${ns.join(', ')}`, () => {
      for (const n of ns) {
        const l = level(fid, n);
        expect(l, `${fid}-${n}`).toBeTruthy();
        const ds = levelDrills(l, 'fifths-up');
        expect(new Set(ds.map((d) => pcOf(d.spec.key))).size, `${l.id}`).toBe(12);
        expect(new Set(ds.map((d) => d.itemId)).size).toBe(ds.length);
        for (const d of ds) {
          expect(d.harmony?.chords.length, d.itemId).toBeGreaterThan(0);
          expect(d.listen?.notes.length, d.itemId).toBeGreaterThan(0);
          expect(d.notes.length, d.itemId).toBeGreaterThan(0);
          expect(d.show).toBe('none');
          // The answer starts after the call: every plan chord after the call's window.
          const end = Math.max(...d.listen!.windows.map((w) => w[1]));
          expect(Math.min(...d.harmony!.chords.map((c) => c.beat))).toBeGreaterThanOrEqual(end);
          // The chart is spelled for the key.
          d.harmony!.chords.forEach((c) => expect(pcOfName(c.sym), `${d.itemId} ${c.sym}`).toBe(c.root));
        }
      }
    });
  it('b-ear key-relative levels widened to 12 keys; the open-string and riff levels keep theirs', () => {
    for (const n of [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) expect(new Set(levelDrills(level('b-ear', n), 'fifths-up').map((d) => pcOf(d.spec.key))).size, `b-ear-${n}`).toBe(12);
    expect(new Set(levelDrills(level('b-ear', 5), 'fifths-up').map((d) => pcOf(d.spec.key))).size).toBeLessThan(12);
  });
  it('updated counts: k-ear 16 levels, g-ear 13, b-ear 24 (+ borrowed chords by ear)', () => {
    expect(fam('k-ear').levels).toHaveLength(16);
    expect(fam('g-ear').levels).toHaveLength(13);
    expect(fam('b-ear').levels).toHaveLength(24);
  });
  it('the keys play back the progression with the root in the left hand (shells, rootless)', () => {
    const d = generate({ family: 'k-ear', kind: 'prog-iivi', key: 3, hands: 'RL', tempo: 72 });
    expect(d.chart).toEqual(['Fm7', 'B♭7', 'E♭maj7']);
    const r = generate({ family: 'k-ear', kind: 'prog-rootless', key: 0, hands: 'RL', option: 1, tempo: 72 });
    expect(r.chart).toEqual(['Dm7♭5', 'G7♭9', 'Cm6']);
    expect(d.notes.some((n) => n.hand === 'L')).toBe(true);
  });
});

/** A synthetic take: the drill's answer notes played on time (MIDI). */
const takeOf = (d: Drill, bpm: number, edit: (pitch: number, beat: number, hand: string) => number | null = (p) => p) =>
  d.notes.flatMap((n) => {
    const p = edit(n.pitch, n.beat, n.hand);
    return p === null ? [] : [{ pitch: p, on: expTimeMs(d, n.beat, bpm) + 5, off: null, vel: 80 }];
  });
const metrics = (): TakeMetrics => ({ verdict: 'clean', why: { en: 'Clean', he: 'נקי' } }) as unknown as TakeMetrics;

describe('the harmony grader (synthetic takes)', () => {
  const bpm = 80;
  const d = generate({ family: 'k-ear', kind: 'prog-iivi', key: 0, hands: 'RL', tempo: 72 });
  it('the written answer: roots, colours and bass all right', () => {
    const r = gradeHarmony(d.harmony!, evidenceFromNotes(d, d.harmony!, bpm, takeOf(d, bpm)));
    expect(r.score).toBe(1);
    expect(r.line.en).toBe('roots ✓ · colours ✓ · bass ✓');
    const m = withHarmony(metrics(), d, bpm, takeOf(d, bpm));
    expect(m.verdict).toBe('clean');
    expect(m.harmony?.score).toBe(1);
  });
  it('the root motion right, the 7ths left out: partial credit, colours missed', () => {
    const plan = d.harmony!;
    // The right hand leaves out each chord's 7th.
    const at = (beat: number) => plan.chords.find((c) => beat >= c.beat && beat < c.beat + c.dur)!;
    const take = takeOf(d, bpm, (p, beat, hand) => (hand === 'R' && p % 12 === at(beat).guide[1] ? null : p));
    const r = gradeHarmony(plan, evidenceFromNotes(d, plan, bpm, take));
    expect(r.roots.ok).toBe(3);
    expect(r.colours!.ok).toBe(0);
    expect(r.score).toBeCloseTo(0.7, 5);
    expect(r.line.en).toBe('roots ✓ · colours 0/3 · bass ✓');
    const m = withHarmony(metrics(), d, bpm, take);
    expect(m.verdict).toBe('almost');
    expect(m.why.en).toContain('colours 0/3');
  });
  it('a wrong bass under the right guide tones (G under D♭7) is a wrong root and a wrong bass', () => {
    const t = generate({ family: 'k-ear', kind: 'prog-subs', key: 0, hands: 'RL', tempo: 72 });
    const plan = t.harmony!;
    const i = plan.chords.findIndex((c) => c.root === 1 && c.sym.startsWith('D♭7'));
    if (i < 0) return; // this seed has no ♭II7
    const c = plan.chords[i];
    const take = takeOf(t, bpm, (p, beat) => (beat === c.beat && p < 48 ? 43 : p));
    const r = gradeHarmony(plan, evidenceFromNotes(t, plan, bpm, take));
    expect(r.chords[i].root).toBe(false);
    expect(r.chords[i].bass).toBe(false);
  });
  it('nothing played: no credit, not clean', () => {
    const m = withHarmony(metrics(), d, bpm, []);
    expect(m.harmony?.score).toBe(0);
    expect(m.verdict).toBe('not');
  });
  it('the bass line (b-ear): roots on time pass; a wrong root counts against roots only', () => {
    const b = generate({ family: 'b-ear', kind: 'walk-ear', key: 5, hands: 'R', instrument: 'bass', perBeat: 0.5, tempo: 80 } as never);
    expect(b.harmony?.mode).toBe('bass');
    const ok = gradeHarmony(b.harmony!, evidenceFromNotes(b, b.harmony!, bpm, takeOf(b, bpm)));
    expect(ok.line.en).toBe('roots ✓');
    const first = b.harmony!.chords[0];
    const bad = gradeHarmony(b.harmony!, evidenceFromNotes(b, b.harmony!, bpm, takeOf(b, bpm, (p, beat) => (beat === first.beat ? p + 1 : p))));
    expect(bad.roots.ok).toBe(b.harmony!.chords.length - 1);
    expect(bad.colours).toBeNull();
  });
  it('the guitar by chroma: any voicing of the right notes; a strum missing the 3rd misses the colour', () => {
    const g = generate({ family: 'g-ear', kind: 'prog-iivi', key: 7, hands: 'R', option: 0, position: 1, tempo: 72 } as never);
    const plan = g.harmony!;
    const frames = (drop: number | null) =>
      plan.chords.flatMap((c) => {
        const t0 = expTimeMs(g, c.beat, bpm);
        return Array.from({ length: 8 }, (_, k) => ({
          t: t0 + 250 + k * 25,
          rms: 0.1,
          chroma: Array.from({ length: 12 }, (_, p) => (c.pcs.includes(p) && p !== (drop === null ? -1 : (c.root + drop) % 12) ? 1 : 0.05)),
          hz: null,
        }));
      });
    const ok = gradeHarmony(plan, evidenceFromChroma(g, plan, bpm, frames(null)));
    expect(ok.line.en).toBe('roots ✓ · colours ✓');
    const m3 = gradeHarmony(plan, evidenceFromChroma(g, plan, bpm, frames(plan.chords[0].guide[0] - plan.chords[0].root + 12)));
    expect(m3.chords[0].colour).toBe(false);
    expect(m3.roots.ok).toBe(3);
  });
});
