// The shared prog / band engine (docs/research/PROG_ENGINE.md): meter per bar, tempo map, click plan, band timeline
// (polymeter, unison, sections), the road map, and the new analysis rules. Plus: old drills are untouched.
import { describe, expect, it } from 'vitest';
import { barBeats, beamGroupAt, buildTimeMap, clickPlan, defaultGroups, groupStartsOf, hasTimeline, legacyClickHeard, metricRatio, MODULATIONS, parseMeter, staffLines, timeMapOf, withBarPlan } from '../src/engine/drills/timeline';
import { bandBars, drillBandHits, drillDrumHits, realignBeat, unisonLine } from '../src/engine/drills/bandTimeline';
import { applyForm, analyzeForm, expandForm, type FormPlan } from '../src/engine/drills/roadmap';
import { groupAccent, notePositions, tempoChecks, unisonLock, withProg } from '../src/engine/drills/progAnalyze';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { chorusDrift, doubleStopMatch, longShare, ridePlacement, ruleCheck, swingWalk, type RuleChart } from '../src/engine/drills/bassAnalyze';
import { drumHits } from '../src/engine/drills/bass';
import { bandHits } from '../src/engine/drills/bassBand';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { drumFamilies } from '../src/engine/drills/drums';
import { levelDrills } from '../src/engine/drills/plan';
import { defaultAccents, GROOVES, grooveSteps } from '../src/engine/grooves';
import type { Drill, ExpNote, PlayedNote } from '../src/engine/drills/types';
import type { GFrame } from '../src/engine/drills/guitarAnalyze';

const mk = (notes: ExpNote[], o: Partial<Drill> = {}): Drill => ({
  spec: { family: 'b-time', kind: 'prog-test', key: 0, hands: 'R', instrument: 'bass' },
  itemId: 'prog:test',
  title: { en: 't', he: 't' },
  notes,
  beats: o.beats ?? Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur))),
  meter: 4,
  keySig: 'C',
  goal: { evenness: false, hands: false },
  startBpm: 100,
  ...o,
});
const N = (beat: number, pitch = 36, dur = 1): ExpNote => ({ beat, pitch, dur, hand: 'R' });
/** A perfect take of a drill at a tempo (optionally with an offset function per note). */
const perfect = (d: Drill, bpm: number, off: (n: ExpNote, i: number) => number = () => 0): PlayedNote[] =>
  d.notes.map((n, i) => {
    const on = expTimeMs(d, n.beat, bpm) + off(n, i);
    return { pitch: n.pitch, on, off: on + 200, vel: 80 };
  });

describe('meters', () => {
  it('parses meters and groupings', () => {
    expect(parseMeter('7/8')).toEqual({ num: 7, den: 8 });
    expect(parseMeter('7/8 3+2+2')).toEqual({ num: 7, den: 8, groups: [3, 2, 2] });
    expect(parseMeter('4/4 3+3+2/8')).toEqual({ num: 4, den: 4, groups: [3, 3, 2], unit: 8 });
    expect(defaultGroups(7, 8)).toEqual([2, 2, 3]);
    expect(defaultGroups(9, 8)).toEqual([3, 3, 3]);
    expect(defaultGroups(11, 8)).toEqual([3, 3, 3, 2]);
    expect(defaultGroups(4, 4)).toBeUndefined();
  });
  it('bar lengths and group starts in drill beats', () => {
    expect(barBeats(parseMeter('7/8'), 8)).toBe(7);
    expect(barBeats(parseMeter('4/4'), 8)).toBe(8);
    expect(barBeats(parseMeter('3/4'))).toBe(3);
    expect(groupStartsOf(parseMeter('7/8 2+2+3'), 8)).toEqual([0, 2, 4]);
    expect(groupStartsOf(parseMeter('9/8 2+2+2+3'), 8)).toEqual([0, 2, 4, 6]);
    // 4/4 grouped 3+3+2 in eighths, quarter-beat drill: group starts at 0, 1.5, 3.
    expect(groupStartsOf(parseMeter('4/4 3+3+2/8'))).toEqual([0, 1.5, 3]);
    expect(groupStartsOf(parseMeter('3/4'))).toEqual([0, 1, 2]);
  });
  it('a mixed-meter time map: 7/8 – 4/4 – 7/8 on an eighth pulse', () => {
    const tm = buildTimeMap({ beats: 22, bpm: 240, pulse: 8, base: parseMeter('7/8'), meters: [{ bar: 1, meter: parseMeter('4/4') }, { bar: 2, meter: parseMeter('7/8') }] });
    expect(tm.bars.map((b) => b.start)).toEqual([0, 7, 15]);
    expect(tm.bars.map((b) => b.sigChange)).toEqual([true, true, true]);
    expect(tm.msAt(7)).toBeCloseTo(7 * 250);
    expect(tm.beatAt(tm.msAt(16.5))).toBeCloseTo(16.5);
    expect(tm.position(11)).toEqual({ bar: 1, inBar: 4, group: 2, inGroup: 0 });
    expect(tm.position(12)).toEqual({ bar: 1, inBar: 5, group: 2, inGroup: 1 });
    expect(tm.position(19)).toMatchObject({ bar: 2, inBar: 4, group: 2, inGroup: 0 });
  });
  it('withBarPlan sets meters, the first bar as `meter`, and rejects bars off the grid', () => {
    const d = withBarPlan(mk([N(0)], { pulse: 8, beats: 30 }), [['7/8', 2], ['4/4', 2]]);
    expect(d.meter).toBe(7);
    expect(d.groups).toEqual([2, 2, 3]);
    expect(d.meters).toEqual([{ bar: 0, meter: { num: 7, den: 8 } }, { bar: 2, meter: { num: 4, den: 4 } }]);
    expect(() => withBarPlan(mk([N(0)]), ['7/8'])).toThrow(/pulse 8/);
    expect(() => withBarPlan(mk([N(0)], { pulse: 8 }), ['7/8 3+3'])).toThrow(/groups/);
  });
});

describe('the click plan', () => {
  it('old drills: the same clicks as the old DrillTake rule, for every drum and bass / guitar level drill', () => {
    const drills: Drill[] = [
      ...drumFamilies().flatMap((f) => f.levels.flatMap((lv) => levelDrills(lv, 'fifths-up').slice(0, 2))),
      // g-prog (GUITAR_DEEPENING §4.3) is built on the timeline on purpose: not an old drill.
      ...guitarCatalog().filter((f) => f.id !== 'g-prog').flatMap((f) => f.levels.flatMap((lv) => levelDrills(lv, 'fifths-up').slice(0, 1))),
    ];
    expect(drills.length).toBeGreaterThan(200);
    for (const d of drills) {
      expect(hasTimeline(d), d.itemId).toBe(false);
      for (const drums of [false, true]) {
        const bpm = 97;
        const beatS = 60 / bpm;
        const p = clickPlan(d, bpm, { drums });
        const old = Array.from({ length: d.meter + Math.ceil(d.beats) + 1 }, (_, i) => ({ t: i * beatS, accent: i % d.meter === 0, silent: !legacyClickHeard(d, i) || (drums && i >= d.meter) }));
        expect(p.clicks, d.itemId).toEqual(old);
        expect(p.responseAt).toBeCloseTo(d.meter * beatS);
        expect(p.responseEnd).toBeCloseTo((d.meter + d.beats + 1) * beatS);
        expect(p.at(3)).toBeCloseTo((d.meter + 3) * beatS);
      }
    }
  });
  it('7/8 (2+2+3): count-in and clicks on the group starts, the 1 accented', () => {
    const d = withBarPlan(mk([N(0)], { pulse: 8, beats: 14 }), [['7/8 2+2+3', 2]]);
    const p = clickPlan(d, 210);
    expect(p.countIn).toBe(7);
    const heard = p.clicks.filter((c) => !c.silent).map((c) => Math.round(c.t * 210 / 60) - 7);
    expect(heard).toEqual([-7, -5, -3, 0, 2, 4, 7, 9, 11, 14]);
    expect(p.clicks.filter((c) => c.accent).map((c) => Math.round(c.t * 210 / 60) - 7)).toEqual([-7, 0, 7, 14]);
    expect(p.clicks.slice(0, 7).every((c) => c.count)).toBe(true);
  });
  it('the click follows a tempo map (metric modulation) and a meter change', () => {
    const d = withBarPlan(mk([N(0)], { beats: 8 }), [['4/4', 2]], [{ bar: 1, ratio: 1.5 }]);
    const p = clickPlan(d, 120);
    const t = p.clicks.map((c) => c.t);
    expect(t[4]).toBeCloseTo(2); // count-in: 4 beats at 120
    expect(t[9] - t[8]).toBeCloseTo(1 / 3); // bar 2 at 180
    expect(t[5] - t[4]).toBeCloseTo(0.5);
    expect(MODULATIONS.tripletQuarterToQuarter).toBeCloseTo(1.5);
    expect(MODULATIONS.dottedEighthToQuarter).toBeCloseTo(4 / 3);
    expect(metricRatio(1, 1.5)).toBeCloseTo(1.5);
  });
  it("click modes per bar on a timeline ('one')", () => {
    const d = { ...withBarPlan(mk([N(0)], { pulse: 8, beats: 15 }), ['7/8', '4/4']), click: 'one' as const };
    const p = clickPlan(d, 200);
    const heard = p.clicks.filter((c) => !c.silent && !c.count).map((c) => Math.round((c.t * 200) / 60) - 7);
    expect(heard).toEqual([0, 7, 15]);
  });
});

describe('a 7/8 take analysed on the timeline', () => {
  // 2 bars of 7/8 (2+2+3) then 1 bar of 4/4 on an eighth pulse: a note on every group start.
  const plan = ['7/8 2+2+3', '7/8 2+2+3', '4/4'];
  const notes = [0, 2, 4, 7, 9, 11, 14, 16, 18, 20].map((b, i) => N(b, 36 + (i % 3) * 2, 1));
  const d = withBarPlan(mk(notes, { pulse: 8, beats: 22 }), plan);
  it('a clean take is clean; positions name the bar and group', () => {
    const m = analyzeTake(d, 220, perfect(d, 220));
    expect(m.verdict).toBe('clean');
    const pos = notePositions(d, 220, m);
    expect(pos.map((p) => [p.bar, p.group])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
    // 4/4 on an eighth pulse: the groups are its quarters.
    expect(groupStartsOf(parseMeter('4/4'), 8)).toEqual([0, 2, 4, 6]);
    expect(withProg(m, d, 220, perfect(d, 220)).verdict).toBe('clean');
  });
  it('playing it as if every bar were 4/4 (8 eighths) fails', () => {
    // The player counts 8 eighths in the 7/8 bars: everything after bar 1 lands an eighth late, then two.
    const wrong = d.notes.map((n) => {
      const bar = timeMapOf(d, 220).barAt(n.beat).index;
      const on = expTimeMs(d, n.beat, 220) + Math.min(bar, 2) * (60000 / 220);
      return { pitch: n.pitch, on, off: on + 200, vel: 80 };
    });
    expect(analyzeTake(d, 220, wrong).verdict).not.toBe('clean');
  });
  it('group accents measured from loudness', () => {
    const loud = perfect(d, 220).map((p, i) => ({ ...p, vel: [0, 3, 6].includes(i) ? 110 : 60 }));
    const m = analyzeTake(d, 220, loud);
    // Every note here is a group start except none: give the off notes a home by adding in-group notes.
    expect(groupAccent(d, 220, m)).toBeNull();
    const d2 = withBarPlan(mk([0, 1, 2, 3, 4, 5, 6].map((b) => N(b)), { pulse: 8, beats: 7, goal: { evenness: false, hands: false, prog: { groupAccent: 0.3 } } }), ['7/8 2+2+3']);
    const acc = perfect(d2, 220).map((p, i) => ({ ...p, vel: [0, 2, 4].includes(i) ? 110 : 60 }));
    const m2 = analyzeTake(d2, 220, acc);
    expect(groupAccent(d2, 220, m2)).toBeCloseTo(1);
    const flat = perfect(d2, 220).map((p, i) => ({ ...p, vel: 80 + (i % 2) }));
    expect(withProg(analyzeTake(d2, 220, flat), d2, 220, flat).verdict).toBe('not');
  });
});

describe('metric modulation take', () => {
  // 2 bars of quarters at 120, then the triplet quarter becomes the new quarter: 2 bars at 180.
  const notes = Array.from({ length: 16 }, (_, i) => N(i, 36 + (i % 4), 1));
  const d = withBarPlan(mk(notes, { beats: 16, goal: { evenness: true, hands: false, prog: { tempoRatio: { tol: 0.02, landMs: 30 } } } }), [['4/4', 4]], [{ bar: 2, ratio: MODULATIONS.tripletQuarterToQuarter }]);
  it('expected times follow the tempo map', () => {
    expect(expTimeMs(d, 8, 120)).toBeCloseTo(4000);
    expect(expTimeMs(d, 9, 120)).toBeCloseTo(4000 + 1000 / 3);
  });
  it('a good take passes the tempo-ratio check', () => {
    const played = perfect(d, 120, (_, i) => (i % 2 ? 1 : -1));
    const m = withProg(analyzeTake(d, 120, played), d, 120, played);
    expect(m.prog?.tempo?.[0].got).toBeCloseTo(1.5, 1);
    expect(Math.abs(m.prog!.tempo![0].err!)).toBeLessThan(0.02);
    expect(m.verdict).toBe('clean');
  });
  it('a take that keeps the old tempo fails, with the reason', () => {
    const played = d.notes.map((n) => ({ pitch: n.pitch, on: n.beat * 500, off: n.beat * 500 + 300, vel: 80 }));
    const m = withProg(analyzeTake(d, 120, played), d, 120, played);
    expect(m.verdict).toBe('not');
  });
  it('a take that lands 4 % fast fails the ±2 % rule (tempo check alone)', () => {
    const tm = timeMapOf(d, 120);
    const played = d.notes.map((n) => {
      const on = n.beat < 8 ? tm.msAt(n.beat) : tm.msAt(8) + (n.beat - 8) * (1000 / 3) / 1.04;
      return { pitch: n.pitch, on, off: on + 200, vel: 80 };
    });
    const base = analyzeTake(d, 120, played);
    const t = tempoChecks(d, 120, base)[0];
    expect(t.err!).toBeGreaterThan(0.03);
    expect(withProg({ ...base, verdict: 'clean' }, d, 120, played).verdict).not.toBe('clean');
  });
});

describe('the band on the timeline', () => {
  it('old drills: drumHits and drillDrumHits agree, bandHits unchanged', () => {
    const drills = guitarCatalog()
      .filter((f) => f.id.startsWith('b-'))
      .flatMap((f) => f.levels.flatMap((lv) => levelDrills(lv, 'fifths-up').slice(0, 1)))
      .filter((d) => d.drums || d.band);
    expect(drills.length).toBeGreaterThan(10);
    for (const d of drills) {
      if (d.drums) expect(drillDrumHits(d), d.itemId).toEqual(drumHits(d.drums, d.beats, d.meter, d.pulse));
      expect(drillBandHits(d), d.itemId).toEqual(bandHits(d));
    }
  });
  it('polymeter: a 7/8 riff over a 4/4 band realigns every 56 eighths', () => {
    const riff = Array.from({ length: 8 }, (_, bar) => [0, 2, 4].map((g) => N(bar * 7 + g, 40, 1))).flat();
    const d: Drill = { ...withBarPlan(mk(riff, { pulse: 8, beats: 56 }), [['7/8 2+2+3', 8]]), bandMeter: parseMeter('4/4'), drums: { groove: 'rock-8' }, band: { style: 'rock' }, chart: ['Em', 'G', 'A', 'Em', 'Em', 'G', 'A', 'Em'] };
    expect(bandBars(d).map((b) => b.start)).toEqual([0, 8, 16, 24, 32, 40, 48]);
    expect(realignBeat(d)).toBe(56 > d.beats - 1e-9 ? null : 56);
    const longer = { ...d, beats: 70, notes: [...riff, N(56, 40), N(63, 40)] };
    expect(realignBeat(longer)).toBe(56);
    // rock-8 kick 'x...x...' in eighths: 1 and 3 of each 4/4 bar = every 4 eighths, on the band's own bars.
    const kicks = drillDrumHits(d).filter((h) => h.d === 'k').map((h) => h.beat);
    expect(kicks).toEqual([0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]);
    // The comping changes chord on the band's bar lines (chart bars = band bars).
    const hits = drillBandHits(d);
    expect(hits.some((h) => Math.abs(h.beat - 8) < 1e-6)).toBe(true);
    expect(hits.every((h) => h.beat < 56)).toBe(true);
  });
  it('a unison part doubles the written riff (octave below) and the lock is measured', () => {
    const riff = [0, 1, 2, 3, 4, 5, 6].map((b, i) => N(b, 52 + i, 1));
    const d = withBarPlan(mk(riff, { pulse: 8, beats: 7, unison: { inst: 'guitar', transpose: 12 }, goal: { evenness: false, hands: false, prog: { unison: { mean: 12, sd: 18 } } } }), ['7/8']);
    const u = unisonLine(d);
    expect(u.map((x) => x.midi)).toEqual(riff.map((n) => n.pitch + 12));
    expect(u.every((x) => x.inst === 'guitar')).toBe(true);
    const tight = perfect(d, 200, (_, i) => (i % 2 ? 5 : -4));
    expect(Math.abs(unisonLock(d, 200, tight)!.mean)).toBeLessThan(5);
    expect(withProg(analyzeTake(d, 200, tight), d, 200, tight).verdict).toBe('clean');
    const behind = perfect(d, 200, () => 30);
    const m = withProg(analyzeTake(d, 200, behind), d, 200, behind);
    expect(m.prog?.unison?.mean).toBeCloseTo(30);
    expect(m.verdict).not.toBe('clean');
  });
  it('mixed meters: the drums play each bar its own length; 7/8 bars comp on group starts', () => {
    const d: Drill = { ...withBarPlan(mk([N(0)], { pulse: 8, beats: 15 }), ['7/8', '4/4']), drums: { groove: 'seven-8', sections: [{ bar: 1, groove: 'rock-8' }] }, band: { style: 'rock' }, chart: ['Em', 'C'] };
    const hits = drillDrumHits(d);
    expect(hits.filter((h) => h.d === 'h').map((h) => h.beat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const comp = drillBandHits(d).filter((h) => h.beat < 7).map((h) => h.beat);
    expect(comp).toEqual([0, 2, 4]);
  });
});

describe('the road map', () => {
  const PLAN: FormPlan = {
    sections: [
      { name: 'Verse', kind: 'verse', bars: 4, chart: ['C'], groove: 'rock-8', band: 'pop' },
      { name: 'Chorus', kind: 'chorus', bars: 4, chart: ['F'], groove: 'rock-8', band: 'rock', fillBefore: true },
      { name: 'Stop', kind: 'tag', bars: 1, chart: ['G'], groove: 'stop', band: 'stop' },
    ],
  };
  const formDrill = (): Drill => {
    const base = applyForm(mk([N(0)], { goal: { evenness: false, hands: false, prog: { form: { lost: 0, landMs: 30, drift: 0.02 } } } }), PLAN);
    // The bass part: roots in quarters (C in the verse, F in the chorus, G hit in the tag).
    const notes: ExpNote[] = [];
    for (let b = 0; b < 16; b++) notes.push(N(b, 36, 1));
    for (let b = 16; b < 32; b++) notes.push(N(b, 41, 1));
    notes.push(N(32, 43, 1));
    return { ...base, notes };
  };
  it('expands the form and puts it on the drill', () => {
    const spans = expandForm({ ...PLAN, order: [0, 1, 0, 1, 2] });
    expect(spans.map((s) => [s.name, s.pass, s.startBar])).toEqual([
      ['Verse', 0, 0],
      ['Chorus', 0, 4],
      ['Verse', 1, 8],
      ['Chorus', 1, 12],
      ['Stop', 0, 16],
    ]);
    const d = formDrill();
    expect(d.beats).toBe(36);
    expect(d.chart).toEqual(['C', 'C', 'C', 'C', 'F', 'F', 'F', 'F', 'G']);
    expect(d.drums?.fills).toEqual([3]);
    expect(d.band?.sections?.map((s) => s.style)).toEqual(['pop', 'rock', 'stop']);
    // Stop-time: the drums play kick + crash on the 1 only, the band one short hit.
    const tag = drillDrumHits(d).filter((h) => h.beat >= 32);
    expect(tag).toEqual([
      { beat: 32, d: 'k' },
      { beat: 32, d: 'crash' },
    ]);
    expect(drillBandHits(d).filter((h) => h.beat >= 32).map((h) => [h.beat, h.len])).toEqual([[32, 0.4]]);
  });
  it('a clean take: no lost bars, every section landed, no drift', () => {
    const d = formDrill();
    const r = analyzeForm(d, 100, perfect(d, 100));
    expect(r.lost).toEqual([]);
    expect(r.landings).toEqual({ ok: 2, of: 2 });
    expect(r.drift).toBeLessThan(0.005);
    expect(r.sections.map((s) => s.hit)).toEqual([1, 1, 1]);
    expect(withProg(analyzeTake(d, 100, perfect(d, 100)), d, 100, perfect(d, 100)).verdict).toBe('clean');
  });
  it('a lost bar (one verse bar too many) is found at the chorus', () => {
    const d = formDrill();
    const beatMs = 600;
    // The player plays 5 bars of verse, then the chorus and the tag a bar late.
    const played: PlayedNote[] = [];
    for (let b = 0; b < 20; b++) played.push({ pitch: 36, on: b * beatMs, off: null, vel: 80 });
    for (let b = 20; b < 36; b++) played.push({ pitch: 41, on: b * beatMs, off: null, vel: 80 });
    const r = analyzeForm(d, 100, played);
    expect(r.lost).toEqual([{ bar: 4, shift: 1, section: 'Chorus' }]);
    const m = withProg(analyzeTake(d, 100, played), d, 100, played);
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/Lost 1 bar/);
  });
  it('rushing the chorus shows as tempo drift in that section', () => {
    const d = formDrill();
    const tm = timeMapOf(d, 100);
    const played = d.notes.map((n) => {
      const on = n.beat < 16 ? tm.msAt(n.beat) : tm.msAt(16) + (n.beat - 16) * 600 / 1.05;
      return { pitch: n.pitch, on, off: null, vel: 80 };
    });
    const r = analyzeForm(d, 100, played);
    expect(r.sections[1].tempo!).toBeGreaterThan(1.03);
    expect(r.drift!).toBeGreaterThan(0.03);
  });
});

describe('bass analysis rules', () => {
  const C7: RuleChart = { chord: 'C7', root: 0, tones: [0, 4, 7, 10], beats: 4 };
  const F7: RuleChart = { chord: 'F7', root: 5, tones: [0, 4, 7, 10], beats: 4 };
  it('downbeatCt: a chord tone on every downbeat, passing notes between', () => {
    // 8ths over C7 | F7: downbeats (every beat) C E G B♭ | F A C E♭, chromatic passing notes on the "ands".
    const good = [48, 51, 52, 54, 55, 57, 58, 52, 53, 56, 57, 59, 60, 62, 63, 65].map((p, i) => ({ pitch: p, beat: i / 2 }));
    const r = ruleCheck('downbeatCt', [C7, F7], good, 4, 4, { every: 1 });
    expect(r.downbeat).toBe(1);
    expect(r.validShare).toBe(1);
    // Put a passing note on a downbeat (beat 1 of bar 2: F♯ over F7).
    const bad = good.map((n, i) => (i === 8 ? { ...n, pitch: 54 } : n));
    const r2 = ruleCheck('downbeatCt', [C7, F7], bad, 4, 4, { every: 1 });
    expect(r2.downbeat).toBeCloseTo(7 / 8);
    expect(r2.valid[8]).toBe(false);
    // A quarter walk judged on 1 and 3 only (every 2): the 2nd beat may be a non-chord tone.
    const walk = [48, 50, 52, 54, 53, 51, 57, 59].map((p, i) => ({ pitch: p, beat: i }));
    expect(ruleCheck('downbeatCt', [C7, F7], walk, 4, 4, { every: 2 }).downbeat).toBe(1);
  });
  it('target with anticipation: the next root an 8th early', () => {
    const ch = [
      { chord: 'Cm', root: 0, tones: [0, 3, 7], beats: 4, land: [0] },
      { chord: 'F7', root: 5, tones: [0, 4, 7, 10], beats: 4, land: [0] },
      { chord: 'Cm', root: 0, tones: [0, 3, 7], beats: 4, land: [0] },
    ];
    // Tumbao-like: "2&" and 4, the root of the next chord on the "and" of 4 (3.5).
    const ok = [
      { pitch: 36, beat: 0 },
      { pitch: 43, beat: 1.5 },
      { pitch: 36, beat: 3 },
      { pitch: 41, beat: 3.5 },
      { pitch: 48, beat: 5.5 },
      { pitch: 41, beat: 7 },
      { pitch: 36, beat: 7.5 },
      { pitch: 43, beat: 9.5 },
    ];
    const r = ruleCheck('target', ch, ok, 4, 4, { anticipate: 0.5 });
    expect(r.anticipated).toBe(1);
    expect(r.beat1Ct).toBe(1);
    // Landing on the downbeat instead (no anticipation): the changes are missed.
    const late = ok.map((n) => (n.beat === 3.5 ? { ...n, pitch: 39, beat: 3.5 } : n.beat === 7.5 ? { ...n, pitch: 46 } : n));
    const r2 = ruleCheck('target', ch, late, 4, 4, { anticipate: 0.5 });
    expect(r2.anticipated).toBe(0);
    // Without the flag the old behaviour is unchanged.
    expect(ruleCheck('target', ch, ok, 4, 4).anticipated).toBeUndefined();
  });
  it('walking swing: long quarters, placement vs the ride, drift over choruses', () => {
    expect(longShare([500, 450, 300, null], 500)).toBeCloseTo(2 / 3);
    const ride = Array.from({ length: 16 }, (_, i) => i * 500);
    expect(ridePlacement(ride.map((t) => t - 15), ride)!.mean).toBeCloseTo(-15);
    const pts = Array.from({ length: 48 }, (_, i) => ({ beat: i, on: i < 24 ? i * 500 : 24 * 500 + (i - 24) * 510 }));
    const dr = chorusDrift(pts, 24)!;
    expect(dr.drift).toBeCloseTo(0.02, 2);
    const sw = swingWalk(pts.map((p) => ({ ...p, len: 470, beatMs: 500 })), ride, 24);
    expect(sw.long).toBe(1);
    expect(sw.drift?.beatMs.length).toBe(2);
  });
  it('double-stops matched by chroma', () => {
    const chroma = (pcs: number[]) => Array.from({ length: 12 }, (_, i) => (pcs.includes(i) ? 1 : 0.05));
    const frames: GFrame[] = Array.from({ length: 100 }, (_, k) => ({ t: k * 10, hz: 100, conf: 1, rms: 0.2, chroma: k < 50 ? chroma([0, 4]) : chroma([7]) }));
    const r = doubleStopMatch(frames, [
      { pcs: [0, 4], on: 0, until: 490 },
      { pcs: [7, 11], on: 500, until: 990 },
    ])!;
    expect(r.per.map((p) => p.ok)).toEqual([true, false]);
    expect(r.per[1].missing).toEqual([11]);
    expect(r.share).toBe(0.5);
    expect(doubleStopMatch([{ t: 0, hz: 1, conf: 1, rms: 1 }], [])).toBeNull();
  });
});

describe('groove bank and notation', () => {
  it('odd-meter grooves: groups fill the bar, every rotation is there', () => {
    for (const id of ['five-8', 'seven-8', 'seven-8-322', 'seven-8-232', 'nine-8', 'nine-8-333', 'eleven-8', 'eleven-8-22322', 'thirteen-8', 'fifteen-8']) {
      const g = GROOVES.find((x) => x.id === id)!;
      expect(g, id).toBeTruthy();
      expect(g.groups!.reduce((a, b) => a + b, 0), id).toBe(grooveSteps(g));
      // The kick on the 1, the snare / kick on each group start.
      let at = 0;
      for (const n of g.groups!) {
        expect(g.k[at] === 'x' || g.s[at] === 'x', `${id} group at ${at}`).toBe(true);
        at += n;
      }
    }
    expect(defaultAccents(7, 8, [3, 2, 2])).toEqual([2, 1, 1, 2, 1, 2, 1]);
    expect(defaultAccents(11, 8)).toEqual([2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1]);
    expect(defaultAccents(7, 8)).toEqual([2, 1, 1, 1, 2, 1, 1]);
  });
  it('a 7/8 groove under a drill fits the bar', () => {
    const d: Drill = { ...withBarPlan(mk([N(0)], { pulse: 8, beats: 14 }), [['7/8 3+2+2', 2]]), drums: { groove: 'seven-8-322' } };
    expect(drillDrumHits(d).filter((h) => h.d !== 'h').map((h) => `${h.beat}${h.d}`)).toEqual(['0k', '3s', '5s', '7k', '10s', '12s']);
  });
  it('staff lines: bar lengths, the time signature where it changes, beam groups', () => {
    const d = withBarPlan(mk([N(0)], { pulse: 8, beats: 29 }), ['7/8 2+2+3', '7/8 2+2+3', '4/4', '7/8 3+2+2']);
    const lines = staffLines(d, 8);
    expect(lines.flatMap((l) => l.bars.map((b) => [b.from, b.len, b.sig ?? '']))).toEqual([
      [0, 3.5, '7/8'],
      [3.5, 3.5, ''],
      [7, 4, '4/4'],
      [11, 3.5, '7/8'],
    ]);
    expect(lines[0].bars[0].groups).toEqual([0, 1, 2]);
    expect(beamGroupAt(d, 2.5)).toBe(2);
    expect(beamGroupAt(d, 12.5)).toBe(12.5);
  });
});
