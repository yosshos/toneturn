// 0.75: the last `todo` rows of the game tiers (GAMES_TIERS_PLAN) — ff / f content in every game.
import { describe, expect, it } from 'vitest';
import { GAME_TIERS, clearsRun, tierDef } from '../src/engine/gameTiers';
import { genTopic } from '../src/engine/topicKit';
import { cellMidis, JAZZ_TENSIONS } from '../src/engine/topicsTopTiers';
import { fretAnswers, fretTarget, ladderOf, rushItem, rushNoReplay } from '../src/engine/rush';
import { tuningById } from '../src/engine/fretboard';
import { groupStarts, melodyGame, meterPattern, padForMidi, PAD_SETS, rhythmTimeline } from '../src/engine/memory';
import { JAZZ_PUZZLE_LEVEL, nextLevel, puzzleAt } from '../src/engine/melodyPuzzle';
import { droneless, ensureGates, isCheckpoint, levelAt, makeCourse } from '../src/engine/flight';
import { AMOUNTS, answer, amountShareOf, bandsOf, makeRounds as peakRounds, newSave, THIRD_BANDS } from '../src/engine/peakHunter';
import { makeRounds as tuneRounds } from '../src/engine/tuneUp';
import { dayInterval, twoNoteEntry } from '../src/engine/pitchMemory';
import { accentsOf, GROOVE_FF_PARTS, grooveTierPlan, grooveTierScore, hiddenSwing, matchTapsAt, pocketPartScore, swingPartScore, tempoChangePlan, tempoChangeScore } from '../src/engine/grooveTier';
import { openingSlice } from '../src/engine/nameTune';

describe('no tier is left as todo', () => {
  it('every tier table row is built', () => {
    for (const spec of Object.values(GAME_TIERS)) for (const [t, d] of Object.entries(spec.tiers)) expect(d.todo, `${spec.game} ${t}`).toBeUndefined();
  });
});

describe('Interval Sprint ff: cells and jazz names', () => {
  it('cells: 8 different options, the answer among them, notes in range', () => {
    for (let s = 0; s < 80; s++) {
      const q = genTopic('interval-cells', s, 1, 'x');
      if (q.kind !== 'choice') throw new Error('choice');
      expect(q.choices.length).toBe(8);
      expect(new Set(q.choices).size).toBe(8);
      expect(q.choices).toContain(q.answer);
      for (const m of cellMidis(q.answer, 60)) {
        expect(m).toBeGreaterThanOrEqual(55);
        expect(m).toBeLessThanOrEqual(84);
      }
      const [a, b] = q.answer.split(',').map(Number);
      expect(b).not.toBe(-a);
    }
  });
  it('jazz names: root then a compound tension, 8 options', () => {
    const q = genTopic('interval-cells', 3, 2, 'x');
    if (q.kind !== 'choice') throw new Error('choice');
    expect(q.choices.sort()).toEqual([...JAZZ_TENSIONS].sort());
    const st = q.stimulus[0];
    if (st.kind !== 'notes') throw new Error('notes');
    expect(st.midis[1] - st.midis[0]).toBeGreaterThan(12);
  });
  it('the ff ladder holds them, and they sound once (no replay)', () => {
    const def = tierDef('rush-interval', 'ff')!;
    expect(def.rungs!.some((r) => r.topic === 'interval-cells')).toBe(true);
    const lad = ladderOf({ mode: 'interval', rungs: def.rungs });
    const it2 = rushItem({ mode: 'interval', seed: 4, startLevel: 1, rungs: def.rungs }, 0, lad.length);
    expect(rushNoReplay(it2)).toBe(true);
    expect(rushNoReplay(rushItem({ mode: 'interval', seed: 4, startLevel: 1 }, 0, 1))).toBe(false);
  });
});

describe('Fretboard ff: chord tones on a string', () => {
  it('levels 6–7 name a chord degree on one string, always reachable', () => {
    for (const tn of ['standard', 'bass', 'drop-d'])
      for (let lv = 6; lv <= 7; lv++)
        for (let s = 0; s < 60; s++) {
          const tuning = tuningById(tn);
          const t = fretTarget(s * 7919, lv, tuning);
          expect(t.strings.length).toBe(1);
          expect(fretAnswers(t, tuning).length).toBeGreaterThan(0);
          expect(t.name.en).toMatch(/of /);
          expect(t.name.he.length).toBeGreaterThan(3);
        }
  });
  it('the ff tier climbs to them', () => {
    expect(tierDef('rush-fretboard', 'ff')!.rungs!.map((r) => r.level)).toEqual([6, 7, 8, 9]);
  });
});

describe('Echo ff and Beat Echo f / ff', () => {
  it('ff Echo shows no pads; Beat Echo f / ff carry a meter', () => {
    expect(tierDef('melody', 'ff')?.params?.noPads).toBe(true);
    expect(tierDef('rhythm', 'f')?.params?.meter).toBe('triplet');
    expect(tierDef('rhythm', 'ff')?.params?.meter).toBe('odd');
  });
  it('odd meters: 8th pulse, every group start sounds, one 16th displacement from 6 pulses', () => {
    for (let s = 0; s < 40; s++) {
      const p = meterPattern(s, 9, 110, 'odd');
      expect(p.bpm).toBe(220);
      expect(p.groups!.reduce((a, b) => a + b, 0)).toBe(9);
      for (const g of groupStarts(p)) expect(p.onsets).toContain(g);
      expect(p.onsets.filter((o) => o % 1 === 0.5).length).toBeLessThanOrEqual(1);
      expect(p.meter).toMatch(/^[57]\/8/);
    }
    expect([...Array(40).keys()].some((s) => meterPattern(s, 9, 110, 'odd').onsets.some((o) => o % 1 === 0.5))).toBe(true);
  });
  it('3/4 with triplets, and a grouped count-in', () => {
    const p = meterPattern(3, 6, 100, 'triplet');
    expect(p.groups).toEqual([3, 3]);
    const tl = rhythmTimeline(p);
    const b = 60 / p.bpm;
    // count-in of two 3/4 bars, accents on 1 and 4
    expect(tl.clicks.slice(0, 6).map((c) => c.accent)).toEqual([true, false, false, true, false, false]);
    expect(tl.responseAt).toBeCloseTo((6 + 6 + 6) * b);
    expect([...Array(30).keys()].some((s) => meterPattern(s, 6, 100, 'triplet').onsets.some((o) => Math.abs((o % 1) - 1 / 3) < 1e-9))).toBe(true);
  });
});

describe('Echo MIDI input (0.76)', () => {
  it('a MIDI key maps to its pad in any octave; a note off the pads is wrong (null)', () => {
    const g = melodyGame(7, [...PAD_SETS.full]);
    g.pads.forEach((p, i) => {
      expect(padForMidi(g, p.midi)).toBe(i);
      expect(padForMidi(g, p.midi + 12)).toBe(i);
      expect(padForMidi(g, p.midi - 24)).toBe(i);
    });
    const tonic = g.pads[0].midi;
    expect(padForMidi(g, tonic + 1)).toBeNull(); // ♭2 is not a pad of the major scale
    const c = melodyGame(7, [...PAD_SETS.chroma]);
    for (let k = 0; k < 12; k++) expect(padForMidi(c, c.pads[0].midi + k)).not.toBeNull();
  });
});

describe('Melody Puzzle ff: jazz lines', () => {
  it('level 9: eight notes inside the octave, tiles for every note', () => {
    for (let s = 0; s < 40; s++) {
      const p = puzzleAt(JAZZ_PUZZLE_LEVEL, s);
      expect(p.answer.length).toBe(8);
      for (const x of p.answer) expect(x >= 0 && x <= 12).toBe(true);
      expect(p.tiles.filter((t) => !t.decoy).length).toBe(8);
      // a chromatic note (bebop) in every line
      expect(p.answer.some((x) => [1, 3, 6, 8, 10].includes(x))).toBe(true);
    }
  });
  it('the ff tier climbs from 8 into 9; free runs stop at 8', () => {
    expect(tierDef('melodypuzzle', 'ff')?.levels).toEqual([8, 9]);
    expect(nextLevel(8, 2, 9).level).toBe(9);
    expect(nextLevel(8, 2).level).toBe(8);
  });
});

describe('Flight ff', () => {
  it('level 4: no drone, 25 ¢ gates on jazz degrees, stays at 4', () => {
    const c = makeCourse(5, 4, { low: 55, high: 72 });
    ensureGates(c, 40);
    expect(droneless(4)).toBe(true);
    expect(levelAt(4, 100)).toBe(4);
    expect(levelAt(1, 100)).toBe(3);
    for (const g of c.gates) {
      expect(g.half).toBe(0.25);
      expect([0, 2, 4, 6, 7, 9, 10]).toContain(g.semis);
    }
    expect(isCheckpoint({ v: 1, seed: 1, startLevel: 4, next: 0, passed: 0, lives: 3, x: 0, range: { low: 55, high: 72 } })).toBe(true);
  });
});

describe('Peak Hunter ff', () => {
  it('third-octave neighbours on the loop, the amount asked', () => {
    expect(bandsOf(4)).toBe(THIRD_BANDS);
    const rs = peakRounds(9, 4);
    for (const r of rs) {
      expect(r.source).toBe('loop');
      expect(AMOUNTS as readonly number[]).toContain(r.gain);
    }
    let s = newSave(9, 4);
    const right = answer(s, rs, rs[0].freq, rs[0].gain);
    expect(right.result.points).toBe(100);
    s = right.save;
    const wrongAmt = answer(s, rs, rs[1].freq, rs[1].gain === 3 ? 9 : 3);
    expect(wrongAmt.result.points).toBe(60);
    expect(amountShareOf(wrongAmt.save.answers)).toBe(0.5);
    expect(clearsRun('peakhunter', 'ff', 900, { meanOctaves: 0.05, amount: 0.5 })).toBe(false);
    expect(clearsRun('peakhunter', 'ff', 900, { meanOctaves: 0.05, amount: 0.8 })).toBe(true);
  });
});

describe('Tune-up ff: against a chord', () => {
  it('the chord holds the string an octave up, never the unison', () => {
    const p = tierDef('tuneup', 'ff')!.params!;
    for (const r of tuneRounds(3, 8, 'guitar', { lo: Number(p.lo), hi: Number(p.hi) }, !!p.chord)) {
      expect(r.kind).toBe('chord');
      expect(r.chord).toContain(r.toneMidi + 12);
      expect(r.chord).not.toContain(r.toneMidi);
      expect(Math.abs(r.detune)).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('Pitch Memory ff: two notes', () => {
  it('both errors kept; the day window reads the larger', () => {
    const iv = dayInterval('2026-11-11');
    expect(iv.semis).toBeGreaterThan(2);
    const e = twoNoteEntry('2026-11-11', 9, 6, iv.semis, -20);
    expect(e.cents).toBe(-20);
    expect(e.second).toEqual({ note: (9 + iv.semis) % 12, cents: -20, semis: iv.semis, first: 6 });
    expect(clearsRun('pitchmemory', 'ff', 80, e)).toBe(false);
    expect(clearsRun('pitchmemory', 'ff', 90, twoNoteEntry('2026-11-11', 9, 6, iv.semis, -12))).toBe(true);
  });
});

describe('Truth or Bluff ff: 5 s per statement', () => {
  it('the tier carries the clock', () => {
    expect(tierDef('truefalse', 'ff')?.params?.perMs).toBe(5000);
  });
});

describe('Groove ff parts', () => {
  it('7/8 fade: 7 pulses, accents 2+2+3, scored like the fade', () => {
    const plan = grooveTierPlan('ff', 'odd');
    expect(plan.beatsPerBar).toBe(7);
    expect(accentsOf(plan)).toEqual([0, 2, 4]);
    const offs = plan.plan.flatMap(() => Array(7).fill(5));
    expect(grooveTierScore(plan, offs, 60000 / plan.bpm).accuracy).toBeGreaterThan(85);
    expect(grooveTierPlan('ff', 'slow').bpm).toBe(60);
  });
  it('lay back against the band: 30 ms behind it', () => {
    const good = [...Array(4).fill(0), ...Array(28).fill(30)];
    expect(pocketPartScore(good).accuracy).toBe(100);
    const onTop = [...Array(4).fill(0), ...Array(28).fill(0)];
    expect(pocketPartScore(onTop).accuracy).toBe(0);
  });
  it('swing match: close = full marks, 12 % off = none', () => {
    const h = hiddenSwing(12345);
    expect(h).toBeGreaterThanOrEqual(0.55);
    expect(h).toBeLessThanOrEqual(0.72);
    expect(swingPartScore(0.66, 0.67)).toBe(100);
    expect(swingPartScore(0.66, 0.54)).toBe(0);
    expect(swingPartScore(0.66, null)).toBe(0);
  });
});

describe('Groove ff: a tempo change to hold (0.76)', () => {
  it('two old bars, one new click bar, four silent, one back — at the new tempo', () => {
    expect(GROOVE_FF_PARTS).toContain('tempo');
    const tp = tempoChangePlan();
    expect(tp.newBpm).toBe(120);
    expect(tp.beats).toHaveLength(8 + 4 * 6);
    expect(tp.beats.filter((b) => !b.on)).toHaveLength(16);
    // the new beat is ¾ of the old one
    expect(tp.beats[9].ms - tp.beats[8].ms).toBeCloseTo(500, 5);
    expect(tp.beats[1].ms - tp.beats[0].ms).toBeCloseTo(666.67, 1);
  });
  it('taps at the new tempo score high; staying at the old tempo fails', () => {
    const tp = tempoChangePlan();
    const t0 = 1000;
    const good = tp.beats.map((b, i) => t0 + b.ms + (i % 3) * 6 - 6);
    expect(tempoChangeScore(tp, matchTapsAt(good, t0, tp.beats.map((b) => b.ms))).accuracy).toBeGreaterThan(85);
    // kept the old tempo through the change
    const old = Array.from({ length: 23 }, (_, i) => t0 + i * (60000 / tp.oldBpm));
    expect(tempoChangeScore(tp, matchTapsAt(old, t0, tp.beats.map((b) => b.ms))).accuracy).toBeLessThan(60);
  });
});

describe('Name That Tune f: mid-phrase', () => {
  it('starts 1–3 notes in, keeps n notes, same for the same salt', () => {
    const s = { id: 'x', title: { en: 'x', he: 'x' }, source: '', degrees: [1, 2, 3, 4, 5, 6, 7, 8], beats: [1, 1, 1, 1, 1, 1, 1, 1] };
    const a = openingSlice(s, 4, true, 5);
    expect(a.degrees.length).toBe(4);
    expect(a.degrees[0]).toBeGreaterThan(1);
    expect(a.degrees[0]).toBeLessThanOrEqual(4);
    expect(openingSlice(s, 4, true, 5)).toEqual(a);
    expect(openingSlice(s, 4).degrees).toEqual([1, 2, 3, 4]);
    expect(openingSlice(s, 0).degrees.length).toBe(8);
  });
});
