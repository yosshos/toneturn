import { describe, expect, it } from 'vitest';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills, levelKeys } from '../src/engine/drills/plan';
import type { Drill, DrillSpec } from '../src/engine/drills/types';
import { FIRST_STEPS_DIFF, NEW_FIRST_FAMILIES } from '../src/engine/drills/firstStepsDiff';
import { FIRST_STEP_FAMILIES, stepCatalogue } from '../src/engine/path';
import { analyzeDrumTake } from '../src/engine/drills/drumAnalyze';
import { strandsFor } from '../src/engine/drills/levelTest';
import { techLevel } from '../src/engine/ladderFacts';
import { echoTimeline, gradeReading, onsetBeats, countInPulses, meterOf } from '../src/engine/rhythm';
import { TOPIC_GEN } from '../src/engine/topics';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { BADGES } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { hasShortName } from '../src/engine/pathNames';
import { hasRubato } from '../src/engine/drills/rubato';
import type { ChoiceQuestion, RhythmReadQuestion } from '../src/engine/lesson';

const FAMS = ['k-first', 'k-read', 'g-first', 'g-riff', 'b-first', 'd-first'] as const;
const ALL = [...catalog(), ...guitarCatalog()];
const fam = (id: string) => ALL.find((f) => f.id === id)!;
const lv = (id: string): LevelDef => techLevel(id)!;
const gen = (s: Partial<DrillSpec> & Pick<DrillSpec, 'family' | 'kind'>): Drill => generate({ key: 0, hands: 'R', ...s } as DrillSpec);
const pitches = (d: Drill) => d.notes.map((n) => n.pitch);
/** A melody's shape, whatever its key: intervals from the first note and the rhythm. */
const shape = (d: Drill) => d.notes.map((n) => `${n.pitch - d.notes[0].pitch}@${n.beat}/${n.dur}/${n.hand}`).join(' ');

describe('counts and placement', () => {
  it('the six families have their levels', () => {
    expect(FAMS.map((f) => fam(f).levels.length)).toEqual([11, 10, 8, 5, 8, 8]);
  });
  it('every level sits on the path at its FIRST_STEPS_DIFF rating, in level order', () => {
    const cat = stepCatalogue();
    for (const f of FAMS) {
      const ds = fam(f).levels.map((l) => cat.find((s) => s.id === `tech:${l.id}`)!.difficulty);
      expect(ds, f).toEqual(fam(f).levels.map((l) => FIRST_STEPS_DIFF[l.id]));
      expect([...ds].sort((a, b) => a - b), f).toEqual(ds);
    }
    // the ranges the stage asked for
    expect(FIRST_STEPS_DIFF['k-first-11']).toBe(900);
    expect(FIRST_STEPS_DIFF['k-read-1']).toBeGreaterThanOrEqual(760);
    expect(FIRST_STEPS_DIFF['k-read-10']).toBe(1400);
    expect(FIRST_STEPS_DIFF['g-first-8']).toBeLessThanOrEqual(880);
    expect(FIRST_STEPS_DIFF['b-first-8']).toBe(860);
    expect(FIRST_STEPS_DIFF['d-first-8']).toBe(880);
  });
  it('the four bass families that all opened at 700 are staggered, after the first holding and tuning steps', () => {
    const cat = stepCatalogue();
    const at = (id: string) => cat.find((s) => s.id === `tech:${id}`)!.difficulty;
    const opens = ['b-time-1', 'b-pluck-1', 'b-chord-1', 'b-pocket-1'].map(at);
    expect(new Set(opens).size).toBe(4);
    expect(Math.min(...opens)).toBeGreaterThan(at('b-first-2'));
    // each family's level 2 still comes after its level 1
    for (const f of ['b-time', 'b-pluck', 'b-chord', 'b-pocket']) expect(at(`${f}-2`), f).toBeGreaterThan(at(`${f}-1`));
    expect(at('d-rock-1')).toBeGreaterThan(at('d-first-5'));
  });
  it('the new first steps are first-step families (✓ for a player past them)', () => {
    for (const f of NEW_FIRST_FAMILIES) expect(FIRST_STEP_FAMILIES).toContain(f);
  });
  it('every item generates, is measured and fits the drill contract', () => {
    for (const f of FAMS)
      for (const l of fam(f).levels)
        for (const d of levelDrills(l, 'fifths-up')) {
          expect(d.notes.length, d.itemId).toBeGreaterThan(0);
          expect(d.startBpm, d.itemId).toBeGreaterThan(0);
          expect(d.title.en.length && /[֐-׿]/.test(d.title.he), d.itemId).toBeTruthy();
          expect(/\p{Extended_Pictographic}/u.test(d.title.en + d.title.he), d.itemId).toBe(false);
        }
  });
  it('pitched technique items start in free time (rubato) where the engine allows it', () => {
    for (const id of ['k-first-5', 'k-read-4', 'g-first-4', 'g-riff-3', 'b-first-6']) expect(hasRubato(levelDrills(lv(id), 'fifths-up')[0]), id).toBe(true);
  });
});

describe('the exact notes of the first steps', () => {
  it('guitar: the tuning check plays every open string, low to high, and checks it in cents', () => {
    const d = gen({ family: 'g-first', kind: 'gf-tune' });
    expect(pitches(d)).toEqual([40, 45, 50, 55, 59, 64]);
    expect(d.notes.map((n) => n.beat)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(d.goal.bass?.cents).toBe(15);
  });
  it('guitar: first notes on string 1 are E, F and G at frets 0, 1, 3', () => {
    const d = gen({ family: 'g-first', kind: 'gf-notes', option: 0 });
    expect(pitches(d)).toEqual([64, 65, 67, 65, 64, 65, 67, 67, 65, 64, 65, 64]);
    expect(d.notes.map((n) => n.fret)).toEqual([0, 1, 3, 1, 0, 1, 3, 3, 1, 0, 1, 0]);
    expect(d.beats).toBe(16);
  });
  it('guitar: the first change is Em ↔ Am, one strum a bar, then G ↔ D', () => {
    const d = gen({ family: 'g-first', kind: 'gf-change', option: 0 });
    const at = (b: number) => d.notes.filter((n) => n.beat === b).map((n) => n.pitch).sort((x, y) => x - y);
    expect(at(0)).toEqual([40, 47, 52, 55, 59, 64]); // Em
    expect(at(4)).toEqual([45, 52, 57, 60, 64]); // Am
    expect(d.chart?.slice(0, 2)).toEqual(['Em', 'Am']);
    const g = gen({ family: 'g-first', kind: 'gf-change', option: 2 });
    expect(g.chart?.slice(0, 2)).toEqual(['G', 'D']);
  });
  it('guitar: TAB reading shows TAB only; rhythm reading strums muted strings from the staff', () => {
    expect(gen({ family: 'g-first', kind: 'gf-tab' }).show).toBe('tab');
    const r = gen({ family: 'g-first', kind: 'gf-rhythm' });
    expect(r.show).toBe('staff');
    expect(r.notes.every((n) => n.technique === 'dead')).toBe(true);
  });
  it('guitar: the grade 1 riff in E and in A (moved 5 frets)', () => {
    const e = gen({ family: 'g-riff', kind: 'riff-1', option: 0, key: 4 });
    expect(pitches(e).slice(0, 7)).toEqual([40, 40, 43, 40, 45, 47, 43]);
    expect(e.notes.slice(0, 7).map((n) => n.beat)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
    const a = gen({ family: 'g-riff', kind: 'riff-1', option: 0, key: 9 });
    expect(pitches(a)).toEqual(pitches(e).map((p) => p + 5));
    // grade 2: palm-muted 2-note power chords (root + 5th)
    const p2 = gen({ family: 'g-riff', kind: 'riff-2', option: 0, key: 4 });
    expect(p2.notes.filter((n) => n.beat === 0).map((n) => n.pitch)).toEqual([40, 47]);
    expect(p2.notes.filter((n) => n.beat === 0).every((n) => n.technique === 'mute')).toBe(true);
  });
  it('bass: the 2-note riff is the root on E and its 5th on A; roots of I–IV–V on the E and A strings', () => {
    const r = gen({ family: 'b-first', kind: 'bf-riff', key: 4, instrument: 'bass' });
    expect([...new Set(pitches(r))].sort((x, y) => x - y)).toEqual([28, 35]);
    expect(r.notes.slice(0, 4).map((n) => n.beat)).toEqual([0, 1.5, 2, 3]);
    const ra = gen({ family: 'b-first', kind: 'bf-riff', key: 9, instrument: 'bass' });
    expect([...new Set(pitches(ra))].sort((x, y) => x - y)).toEqual([33, 40]);
    const roots = gen({ family: 'b-first', kind: 'bf-roots', key: 0, instrument: 'bass' });
    const first = (bar: number) => roots.notes.find((n) => n.beat === bar * 4)!;
    expect([0, 1, 2].map((b) => [first(b).pitch, first(b).string, first(b).fret])).toEqual([
      [36, 3, 3], // C on the A string
      [29, 4, 1], // F on the E string
      [31, 4, 3], // G on the E string
    ]);
    const tune = gen({ family: 'b-first', kind: 'bf-tune', instrument: 'bass' });
    expect(pitches(tune)).toEqual([28, 33, 38, 43]);
  });
  it('drums: the basic rock beat and the 8th-note paradiddle', () => {
    const rock = gen({ family: 'd-first', kind: '5:rock', option: 0, hands: 'RL' });
    const bar1 = rock.notes.filter((n) => n.beat < 4);
    const on = (v: string) => bar1.filter((n) => n.voice === v).map((n) => n.beat);
    expect(on('hihat')).toEqual([0, 1, 2, 3]);
    expect(on('kick')).toEqual([0, 2]);
    expect(on('snare')).toEqual([1, 3]);
    const para = gen({ family: 'd-first', kind: '6:para8', option: 0, hands: 'RL' });
    expect(para.notes.slice(0, 8).map((n) => n.hand).join('')).toBe('RLRRLRLL');
    expect(para.notes.slice(0, 8).map((n) => n.beat)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(para.notes.filter((n) => n.accent).length).toBe(8);
    expect(levelDrills(lv('d-first-6'), 'fifths-up').map((d) => targetOf(d))).toEqual([70, 70, 70]);
    // every first step is judged on the beginner's tier
    for (const l of fam('d-first').levels) for (const d of levelDrills(l, 'fifths-up')) expect(d.drum?.tier, d.itemId).toBe(1);
  });
  it('drums: snare reading in 2/4, 3/4 and 6/8 (an 8th pulse, beats of three)', () => {
    const ds = levelDrills(lv('d-first-7'), 'fifths-up');
    expect(ds.map((d) => d.meter)).toEqual([2, 2, 3, 3, 6, 6]);
    const six = ds[4];
    expect(six.pulse).toBe(8);
    expect(six.groups).toEqual([3, 3]);
    expect(six.beats).toBe(24);
    // no note crosses a beat of three 8ths, the last note fills the last bar
    for (const n of six.notes.slice(0, -1)) expect(Math.floor(n.beat / 3)).toBe(Math.floor((n.beat + n.dur - 1e-6) / 3));
    expect(six.notes[six.notes.length - 1]).toMatchObject({ beat: 18, dur: 6 });
    expect(ds[0].beats).toBe(16);
    expect(ds[2].beats).toBe(18);
  });
  it('keys: the black-key groups, the first piece, block chords and LH root + RH triad over I–V–vi–IV', () => {
    expect(pitches(gen({ family: 'k-first', kind: 'kf-black', perBeat: 1 })).slice(0, 8)).toEqual([61, 63, 61, 63, 66, 68, 70, 68]);
    const piece = gen({ family: 'k-first', kind: 'kf-piece', hands: 'RL', perBeat: 1 });
    expect(piece.notes.filter((n) => n.hand === 'R').slice(0, 6).map((n) => n.pitch)).toEqual([60, 64, 67, 65, 64, 62]);
    expect(piece.notes.filter((n) => n.hand === 'L').map((n) => n.pitch)).toEqual([48, 55, 48, 55, 48, 55, 55, 48]);
    expect(piece.beats).toBe(32);
    const block = gen({ family: 'k-first', kind: 'kf-block', perBeat: 0.25 });
    const chordAt = (d: Drill, b: number, h = 'R') => d.notes.filter((n) => n.beat === b && n.hand === h).map((n) => n.pitch);
    expect([0, 4, 8, 12].map((b) => chordAt(block, b))).toEqual([[60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69]]);
    expect(block.chart?.slice(0, 4)).toEqual(['C', 'G', 'Am', 'F']);
    const pop = gen({ family: 'k-first', kind: 'kf-pop', hands: 'RL', perBeat: 0.5 });
    expect([0, 4, 8, 12].map((b) => chordAt(pop, b, 'L'))).toEqual([[48], [43], [45], [41]]);
    // in G: the same shapes a fifth up (or a fourth down)
    const g = gen({ family: 'k-first', kind: 'kf-block', key: 7, perBeat: 0.25 });
    expect(g.chart?.slice(0, 4)).toEqual(['G', 'D', 'Em', 'C']);
    expect(new Set(chordAt(g, 0).map((p) => p % 12))).toEqual(new Set([7, 11, 2]));
  });
});

/** The level's target tempo, as plan.ts reads it. */
const targetOf = (d: Drill) => (techLevel(`${d.spec.family}-${Number(d.spec.kind.split(':')[0])}`) as LevelDef & { tempo?: [number, number] }).tempo![1];

describe('all 12 keys', () => {
  it('key-relative levels run through all 12 keys (C, G and F first on the keys)', () => {
    const KEYED = ['k-first-5', 'k-first-6', 'k-first-7', 'k-first-8', 'k-first-9', 'k-first-10', 'k-first-11', ...Array.from({ length: 10 }, (_, i) => `k-read-${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `g-riff-${i + 1}`), 'b-first-5', 'b-first-6'];
    for (const id of KEYED) {
      const ks = levelKeys(lv(id), 'fifths-up');
      expect(new Set(ks).size, id).toBe(12);
      const tonics = new Set(levelDrills(lv(id), 'fifths-up').map((d) => d.spec.key));
      expect(tonics.size, id).toBe(12);
    }
    expect(levelKeys(lv('k-first-5'), 'fifths-up').slice(0, 3)).toEqual([0, 7, 5]);
  });
  it('a riff and a piece keep their shape in every key', () => {
    for (const id of ['g-riff-1', 'g-riff-4', 'k-first-9', 'b-first-6']) {
      const ds = levelDrills(lv(id), 'fifths-up');
      const byOp = new Map<string, Set<string>>();
      for (const d of ds) {
        const k = `${d.spec.option ?? 0}`;
        if (!byOp.has(k)) byOp.set(k, new Set());
        byOp.get(k)!.add(shape(d));
      }
      for (const [op, shapes] of byOp) expect(shapes.size, `${id} op${op}`).toBe(1);
    }
  });
});

describe('reading: generated, never the same twice', () => {
  it('every sight-reading item of every level is a different melody (12 keys × 4 variants)', () => {
    const seen = new Map<string, string>();
    let n = 0;
    for (const l of fam('k-read').levels)
      for (const d of levelDrills(l, 'fifths-up')) {
        const sh = shape(d);
        expect(seen.get(sh), `${d.itemId} repeats ${seen.get(sh)}`).toBeUndefined();
        seen.set(sh, d.itemId);
        n++;
      }
    expect(n).toBe(10 * 48);
  });
  it('the reading ladder grows: hands together from level 4, accidentals at 6, minor at 7, chords at 8–9, 3/4 and 6/8 with a 30-second look at 10', () => {
    const one = (id: string) => levelDrills(lv(id), 'fifths-up');
    expect(one('k-read-1').every((d) => d.notes.every((n) => n.hand === d.notes[0].hand))).toBe(true);
    expect(one('k-read-4').every((d) => d.notes.some((n) => n.hand === 'L') && d.notes.some((n) => n.hand === 'R'))).toBe(true);
    expect(one('k-read-6').some((d) => d.notes.some((n) => ![0, 2, 4, 5, 7, 9, 11].includes((((n.pitch - d.spec.key) % 12) + 12) % 12)))).toBe(true);
    expect(one('k-read-7').every((d) => d.spec.minor)).toBe(true);
    expect(one('k-read-8').every((d) => d.notes.some((n) => n.hand === 'L' && n.chordId !== undefined && d.notes.filter((x) => x.chordId === n.chordId && x.hand === 'L').length === 3))).toBe(true);
    const q = one('k-read-10');
    expect(q.every((d) => d.prep === 30)).toBe(true);
    expect(new Set(q.map((d) => d.meter))).toEqual(new Set([3, 6]));
  });
  it('TAB, rhythm and snare reading variants differ from each other', () => {
    for (const id of ['g-first-7', 'g-first-8', 'b-first-7', 'b-first-8', 'd-first-7']) {
      const ds = levelDrills(lv(id), 'fifths-up');
      expect(new Set(ds.map(shape)).size, id).toBe(ds.length);
    }
  });
});

describe('rhythm echo: hear it, tap it back', () => {
  it('the topic is a hidden rhythm-read item on the 720–1200 ladder', () => {
    const T = TOPIC_GEN['rhythm-echo'];
    expect(T.levels.length).toBe(7);
    const qs = T.levels.map((_, i) => T.gen(12345, i + 1, 'x') as RhythmReadQuestion);
    expect(qs.every((q) => q.kind === 'rhythm-read' && q.byEar)).toBe(true);
    expect(qs.map((q) => q.difficulty)).toEqual([720, 800, 880, 960, 1050, 1130, 1200]);
    // generated: different seeds, different rhythms
    const sigs = new Set(Array.from({ length: 12 }, (_, s) => onsetBeats((T.gen(s * 977, 4, 'x') as RhythmReadQuestion).rhythm).join(',')));
    expect(sigs.size).toBeGreaterThan(4);
  });
  it('the timeline plays the rhythm first, then a counted bar, then opens the answer', () => {
    const q = TOPIC_GEN['rhythm-echo'].gen(7, 3, 'x') as RhythmReadQuestion;
    const tl = echoTimeline(q.rhythm, q.bpm);
    const per = countInPulses(meterOf(q.rhythm));
    const beat = 60 / q.bpm;
    const ons = onsetBeats(q.rhythm);
    expect(tl.wood).toEqual(ons.map((x) => per * beat + x * beat));
    expect(tl.drums?.every((d) => d === 's')).toBe(true);
    const counted = tl.clicks.map((c, i) => (c.count ? i : -1)).filter((i) => i >= 0);
    expect(counted).toEqual(Array.from({ length: per }, (_, i) => tl.countFrom + i));
    expect(tl.responseAt).toBeCloseTo((tl.countFrom + per) * beat, 6);
    // the demo is over before the count-in starts
    expect(Math.max(...tl.wood)).toBeLessThan(tl.countFrom * beat);
  });
  it('the grader: an exact echo passes, a wrong rhythm fails', () => {
    const q = TOPIC_GEN['rhythm-echo'].gen(99, 4, 'x') as RhythmReadQuestion;
    const ms = 60000 / q.bpm;
    const ons = onsetBeats(q.rhythm);
    const exact = gradeReading(q.rhythm, q.bpm, ons.map((b) => b * ms + 8), q.level);
    expect(exact.pass).toBe(true);
    // every onset half a beat late, plus a missing note: not the rhythm heard
    const wrong = gradeReading(q.rhythm, q.bpm, ons.slice(1).map((b) => (b + 0.5) * ms), q.level);
    expect(wrong.pass).toBe(false);
  });
});

describe('the Ear topics', () => {
  it('descending intervals from 800: the second note is lower by the answer', () => {
    const T = TOPIC_GEN['intervals-down'];
    expect(T.levels.length).toBe(5);
    for (let l = 1; l <= 5; l++)
      for (let s = 0; s < 20; s++) {
        const q = T.gen(s * 31 + l, l, 'x') as ChoiceQuestion;
        const st = q.stimulus[0] as { midis: number[] };
        expect(st.midis[0] - st.midis[1]).toBe(Number(q.answer.slice(1)));
        expect(q.choices).toContain(q.answer);
      }
    expect((T.gen(1, 1, 'x') as ChoiceQuestion).difficulty).toBe(800);
  });
  it('root, 3rd or 5th: a general Ear topic (not in the jazz pack), ~950', () => {
    const T = TOPIC_GEN['chord-member'];
    const cat = stepCatalogue().filter((s) => s.topic === 'chord-member');
    expect(cat.map((s) => s.difficulty)).toEqual([950, 1030, 1100]);
    expect(cat.every((s) => !s.pack)).toBe(true);
    for (let s = 0; s < 30; s++) {
      const q = T.gen(s, 1, 'x') as ChoiceQuestion;
      const [ch, , note] = q.stimulus as { midis?: number[] }[];
      const root = Math.min(...ch.midis!);
      const iv = ((note.midis![0] - root) % 12 + 12) % 12;
      expect({ r1: [0], r3: [3, 4], r5: [7] }[q.answer as 'r1']).toContain(iv);
    }
  });
  it('which note changed: the answer is the note that differs, earlier than 1300', () => {
    const T = TOPIC_GEN['melody-change'];
    for (let l = 1; l <= 4; l++)
      for (let s = 0; s < 20; s++) {
        const q = T.gen(s * 7 + l, l, 'x') as ChoiceQuestion;
        const a = (q.stimulus[0] as { midis: number[] }).midis;
        const b = (q.stimulus[2] as { midis: number[] }).midis;
        const i = a.findIndex((m, k) => m !== b[k]);
        expect(i).toBeGreaterThan(0);
        if (l === 1) expect(q.answer).toBe(i < a.length / 2 ? 'start' : 'end');
        else if (l <= 3) expect(q.answer).toBe(`n${i + 1}`);
        else expect(q.answer).toBe(`n${i + 1}${b[i] > a[i] ? 'u' : 'd'}`);
      }
    expect(stepCatalogue().filter((s) => s.topic === 'melody-change').every((s) => s.difficulty < 1300)).toBe(true);
  });
  it('the four topics are Ear-course steps', () => {
    for (const t of ['rhythm-echo', 'intervals-down', 'chord-member', 'melody-change']) {
      const steps = stepCatalogue().filter((s) => s.topic === t);
      expect(steps.length, t).toBe(TOPIC_GEN[t].levels.length);
      expect(steps.every((s) => !s.pack && s.domain !== 'creative' && !s.forPlays && !s.sung), t).toBe(true);
    }
  });
});

describe('the buzz roll is measured by its bounces', () => {
  it('three or more bounces a stroke pass; plain single strokes do not', () => {
    const d = gen({ family: 'd-first', kind: '8:buzz', option: 0, hands: 'RL' });
    const bpm = d.startBpm;
    const ms = 60000 / bpm;
    const buzzed = d.notes.flatMap((n) => [0, 30, 60, 90].map((o) => ({ voice: 'snare' as const, on: n.beat * ms + o, vel: o ? 70 - o / 3 : 90 })));
    const single = d.notes.map((n) => ({ voice: 'snare' as const, on: n.beat * ms, vel: 90 }));
    expect(analyzeDrumTake(d, bpm, buzzed).verdict).toBe('clean');
    const m = analyzeDrumTake(d, bpm, single);
    expect(m.verdict).toBe('not');
    expect(m.drum?.missed).toContain('buzz');
  });
});

describe('wiring', () => {
  it('every new family has its own path glyph, and every new topic its own mark', () => {
    const glyphs = FAMS.map((f) => FAMILY_GLYPH[f]);
    expect(glyphs.every(Boolean)).toBe(true);
    for (const f of FAMS.filter((x) => x !== 'k-first')) expect(Object.entries(FAMILY_GLYPH).filter(([, g]) => g === FAMILY_GLYPH[f]).map(([k]) => k), f).toEqual([f]);
    const marks = ['rhythm-echo', 'intervals-down', 'chord-member', 'melody-change'].map((t) => TOPIC_GLYPH[t]);
    expect(marks.every(Boolean)).toBe(true);
    for (const m of marks) expect(Object.values(TOPIC_GLYPH).filter((g) => g === m).length, m).toBe(1);
  });
  it('badges: one per level for the keys and guitar families, named milestones for bass and drums, unique titles', () => {
    for (const [f, n] of [['k-first', 11], ['k-read', 10], ['g-first', 8], ['g-riff', 5]] as const) expect(BADGES.filter((b) => b.id.startsWith(`tech:${f}:`)).length, f).toBe(n);
    const named = BADGES.filter((b) => b.group === 'b-first' || b.group === 'd-first');
    expect(named.length).toBe(6);
    expect(named.every((b) => !/first steps:/i.test(b.name.en))).toBe(true);
  });
  it('the path names, mini-lessons and level-test rungs point at real things', () => {
    for (const t of ['rhythm-echo', 'intervals-down', 'chord-member', 'melody-change']) expect(hasShortName(t), t).toBe(true);
    for (const [unit, lesson] of Object.entries(UNIT_LESSON).filter(([u]) => /^(tech:(k-first|k-read|g-first|g-riff|b-first|d-first)|topic:(rhythm-echo|intervals-down|chord-member|melody-change))/.test(u))) {
      expect(MINI_LESSONS[lesson], unit).toBeDefined();
      if (unit.startsWith('tech:')) expect(techLevel(unit.slice(5)), unit).toBeDefined();
    }
    for (const id of ['first-bass', 'first-tab', 'first-riff', 'first-keyboard', 'first-clefs', 'first-chord-symbols', 'keys-sight-reading', 'drum-paradiddle', 'drum-meters', 'drum-buzz', 'rhythm-echo', 'intervals-down', 'chord-members', 'melody-change']) {
      const l = MINI_LESSONS[id];
      expect(l, id).toBeDefined();
      for (const s of l.steps) expect(/[֐-׿]/.test(s.say.he) && s.say.en.length > 0, id).toBe(true);
    }
    // the guitar and drum first-steps lessons now open the measured first steps
    expect(UNIT_LESSON['tech:g-first-1']).toBe('first-guitar');
    expect(UNIT_LESSON['tech:d-first-1']).toBe('first-sticks');
    const rungs = (['piano', 'guitar', 'bass', 'drums'] as const).flatMap((i) => strandsFor(i, 'both').flatMap((s) => s.rungs.map((r) => r.level)));
    for (const id of ['k-read-1', 'k-read-10', 'g-first-5', 'g-first-7', 'g-riff-2', 'b-first-3', 'b-first-5', 'b-first-7', 'd-first-2', 'd-first-6', 'd-first-7']) expect(rungs, id).toContain(id);
  });
});
