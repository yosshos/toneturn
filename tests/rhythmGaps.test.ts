// Rhythm gaps R-1…R-5 (docs/AUDIT-CONTENT-THEORY.md §ז.2): cross-rhythm cells, poly-tap 5:4 / 5:3 / 7:4, metric-tap,
// hemiola-tap, the keys' k-rhythm and the guitar's g-meter families, d-prog 11, bass b-time 11–12, the voice's meter
// levels, and their quick lessons.
import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { TOPIC_TAGS } from '../src/engine/taxonomy';
import { CELLS, onsetBeats, readTimeline, totalBeats, type Rhythm } from '../src/engine/rhythm';
import { applyClicks, gradeLanes } from '../src/engine/clicks';
import { CROSS, METRIC, metricRatio } from '../src/engine/topicsRhythmGaps';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { crossOnsets } from '../src/engine/drills/drumCross';
import { MODULATIONS } from '../src/engine/drills/timeline';
import { groupStarts, threeOverTwo, TIME_LEVELS, VOICE_FAMILIES } from '../src/engine/voiceFamilies';
import { LESSONS, UNITS } from '../src/content/mini/rhythmGaps';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { stepCatalogue } from '../src/engine/path';
import { drillEvents } from '../src/engine/drills/events';
import type { RhythmReadQuestion } from '../src/engine/lesson';

const close = (a: number[], b: number[]) => {
  expect(a.length).toBe(b.length);
  a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 5)); // drill beats are rounded to 1e-6
};

describe('cross-rhythm cells', () => {
  it('5:4, 5:3 and 7:4 put exactly n even onsets over the bar', () => {
    close(onsetBeats({ beatsPerBar: 4, bars: 1, cells: ['q5'] }), [0, 0.8, 1.6, 2.4, 3.2]);
    close(onsetBeats({ beatsPerBar: 3, bars: 1, cells: ['q5in3'], meter: '3/4' }), [0, 0.6, 1.2, 1.8, 2.4]);
    close(onsetBeats({ beatsPerBar: 4, bars: 1, cells: ['q7'] }), [0, 4 / 7, 8 / 7, 12 / 7, 16 / 7, 20 / 7, 24 / 7]);
    // Two bars: the second bar starts exactly on its 1.
    close(onsetBeats({ beatsPerBar: 4, bars: 2, cells: ['q5', 'q5'] }).slice(4, 7), [3.2, 4, 4.8]);
    for (const c of ['q5', 'q5in3', 'q7'] as const) expect(CELLS[c].cross).toBeTruthy();
  });
});

describe('poly-tap 5–7 (over the bar)', () => {
  const T = TOPIC_GEN['poly-tap'];
  it('runs 2:1 → 3:2 → 4:3 → swap → 5:4 → 5:3 → 7:4', () => {
    expect(T.levels.length).toBe(7);
    CROSS.forEach((c, i) => {
      const q = T.gen(11 + i, 5 + i, 'x') as RhythmReadQuestion;
      expect(q.kind).toBe('rhythm-read');
      const [beat, cross] = q.lanes!;
      const bars = totalBeats(beat.rhythm) / c.over;
      expect(totalBeats(cross.rhythm)).toBe(totalBeats(beat.rhythm));
      close(onsetBeats(beat.rhythm), Array.from({ length: c.over * bars }, (_, k) => k));
      close(onsetBeats(cross.rhythm), Array.from({ length: c.n * bars }, (_, k) => Math.floor(k / c.n) * c.over + ((k % c.n) * c.over) / c.n));
      expect(q.clicks).toEqual({ kind: 'beats' });
    });
  });
  it('perfect taps pass every lane; the fast hand bunched onto the beats fails', () => {
    const q = T.gen(3, 5, 'x') as RhythmReadQuestion;
    const ms = 60000 / q.bpm;
    const perfect = q.lanes!.flatMap((l, lane) => onsetBeats(l.rhythm).map((b) => ({ ms: b * ms, lane })));
    expect(gradeLanes(q.lanes!, q.bpm, perfect, q.level).pass).toBe(true);
    // 5 against 4 played as 4 against 4 plus an extra: the right hand lands on the beats.
    const bunched = [...onsetBeats(q.lanes![0].rhythm).map((b) => ({ ms: b * ms, lane: 0 })), ...onsetBeats(q.lanes![0].rhythm).map((b) => ({ ms: b * ms, lane: 1 }))];
    expect(gradeLanes(q.lanes!, q.bpm, bunched, q.level).pass).toBe(false);
  });
});

describe('metric-tap', () => {
  const T = TOPIC_GEN['metric-tap'];
  it('the click moves to the new pulse at the pivot: × 3/2, × 3/2, × 2/3, × 4/3', () => {
    expect(T.levels.length).toBe(METRIC.length);
    const want = [MODULATIONS.tripletQuarterToQuarter, MODULATIONS.tripletEighthToEighth, MODULATIONS.quarterToTripletQuarter, MODULATIONS.dottedEighthToQuarter];
    for (let level = 1; level <= 4; level++) {
      const q = T.gen(7, level, 'x') as RhythmReadQuestion;
      expect(metricRatio(level)).toBeCloseTo(want[level - 1], 9);
      const tl = readTimeline(q.rhythm, q.bpm);
      const clicks = applyClicks(tl.clicks, q.clicks!, 4, 4).slice(4).map((c) => c.t);
      const t0 = tl.responseAt;
      const before = clicks.filter((t) => t < t0 + (8 * 60) / q.bpm - 1e-6);
      const after = clicks.filter((t) => t >= t0 + (8 * 60) / q.bpm - 1e-6);
      const gap = (xs: number[]) => xs[1] - xs[0];
      expect(gap(before) / gap(after)).toBeCloseTo(metricRatio(level), 6);
      // Every new click lands on a tapped onset (the hands carry the new beat).
      const on = onsetBeats(q.rhythm).map((b) => t0 + (b * 60) / q.bpm);
      for (const c of after) expect(on.some((o) => Math.abs(o - c) < 1e-6), `L${level} click ${c}`).toBe(true);
      expect(totalBeats(q.rhythm)).toBe(16);
    }
  });
  it('is tagged with timing as the rated skill', () => {
    const t = TOPIC_TAGS['metric-tap'];
    expect((typeof t === 'function' ? t(1) : t)[0].sub).toBe('timing/poly');
  });
});

describe('hemiola-tap', () => {
  const T = TOPIC_GEN['hemiola-tap'];
  it('groupings fill their bars; the hemiola falls on 1, 3 and 2 across two bars of 3/4', () => {
    for (let level = 1; level <= 4; level++) {
      const q = T.gen(5, level, 'x') as RhythmReadQuestion;
      const per = q.rhythm.meter === '3/4' ? 3 : 4;
      for (const r of [q.rhythm, ...(q.lanes ?? []).map((l) => l.rhythm)] as Rhythm[]) expect(totalBeats(r) % per).toBe(0);
    }
    const one = T.gen(1, 1, 'x') as RhythmReadQuestion;
    close(onsetBeats(one.rhythm).slice(6), [6, 8, 10, 12]);
    const four = T.gen(1, 4, 'x') as RhythmReadQuestion;
    // 3+3+3+3+2+2 eighths = 16 = two bars of 4/4.
    close(onsetBeats(four.lanes![1].rhythm).slice(0, 6), [0, 1.5, 3, 4.5, 6, 7]);
  });
});

describe('k-rhythm (keys) and g-meter (guitar)', () => {
  const KR = catalog().find((f) => f.id === 'k-rhythm')!;
  const GM = guitarCatalog().find((f) => f.id === 'g-meter')!;
  it('every item generates with notes, both families have a step glyph, a path step and a skill tag', () => {
    expect(KR.levels.length).toBe(7);
    expect(GM.levels.length).toBe(6);
    expect(KR.style).toBe('both');
    expect((GM as { addOn?: string }).addOn).toBeUndefined();
    for (const lv of [...KR.levels, ...GM.levels])
      for (const d of levelDrills(lv, 'fifths-up')) {
        expect(d.notes.length, d.itemId).toBeGreaterThan(4);
        for (const n of d.notes) expect(n.beat + n.dur, d.itemId).toBeLessThanOrEqual(d.beats + 1e-6);
        expect(drillEvents(d, { verdict: 'clean', accuracy: 1 } as never, '2026-11-14T10:00:00Z', 's', 0).length).toBeGreaterThan(0);
      }
    expect(FAMILY_GLYPH['k-rhythm']).toBeTruthy();
    expect(FAMILY_GLYPH['g-meter']).toBeTruthy();
    const steps = stepCatalogue();
    expect(steps.some((s) => s.id === 'tech:k-rhythm-1')).toBe(true);
    expect(steps.some((s) => s.id === 'tech:g-meter-6')).toBe(true);
  });
  it('5:4 between the hands: the RH spreads exactly 5 even notes over each bar against 4 LH beats', () => {
    const d = generate({ family: 'k-rhythm', kind: 'kr-cross', key: 0, hands: 'RL', option: 0 });
    const rh = d.notes.filter((n) => n.hand === 'R' && n.beat < 12).map((n) => n.beat);
    close(rh, Array.from({ length: 15 }, (_, k) => Math.floor(k / 5) * 4 + (k % 5) * 0.8));
    const lh = d.notes.filter((n) => n.hand === 'L' && n.beat < 12).map((n) => n.beat);
    close(lh, Array.from({ length: 12 }, (_, k) => k));
  });
  it('odd meters: 7/8 groups sum to the bar, 5/4 is 3+2', () => {
    const seven = generate({ family: 'k-rhythm', kind: 'kr-odd', key: 0, hands: 'RL', option: 1 });
    expect(seven.pulse).toBe(8);
    expect(seven.groups!.reduce((a, b) => a + b, 0)).toBe(7);
    const five = generate({ family: 'k-rhythm', kind: 'kr-odd', key: 0, hands: 'RL', option: 0 });
    expect(five.meter).toBe(5);
    expect(five.meters![0].meter.groups).toEqual([3, 2]);
  });
  it('metric modulation: the tempo map carries the written ratio', () => {
    const want = [MODULATIONS.tripletQuarterToQuarter, MODULATIONS.dottedEighthToQuarter, MODULATIONS.quarterToTripletQuarter];
    want.forEach((r, op) => {
      const d = generate({ family: 'k-rhythm', kind: 'kr-mod', key: 0, hands: 'RL', option: op });
      expect(d.tempoMap).toEqual([{ bar: 2, ratio: r }]);
    });
  });
  it('displacement: the figure keeps its shape, moved by an 8th / a quarter', () => {
    for (const [op, shift] of [[0, 0.5], [1, 1]] as const) {
      const d = generate({ family: 'k-rhythm', kind: 'kr-displace', key: 0, hands: 'RL', option: op });
      const starts = [...new Set(d.notes.filter((n) => n.hand === 'R' && n.dur === 0.5).map((n) => n.beat))];
      close(starts, [0, 1.5, 3, 4, 5.5, 7, 8 + shift, 9.5 + shift, 11 + shift, 12 + shift, 13.5 + shift, 15 + shift]);
    }
  });
  it('the guitar\'s 7:4 over the bar is exact', () => {
    const d = generate({ family: 'g-meter', kind: 'gm-cross', key: 4, hands: 'R', option: 1, instrument: 'guitar' });
    close(d.notes.filter((n) => n.beat < 12).map((n) => n.beat), Array.from({ length: 21 }, (_, k) => Math.floor(k / 7) * 4 + ((k % 7) * 4) / 7));
  });
});

describe('drums d-prog 11 and bass b-time 11–12', () => {
  it('crossOnsets: n even strokes per bar', () => {
    close(crossOnsets(5, 4, 2), [0, 0.8, 1.6, 2.4, 3.2, 4, 4.8, 5.6, 6.4, 7.2]);
    close(crossOnsets(5, 3, 1), [0, 0.6, 1.2, 1.8, 2.4]);
  });
  it('the four options generate: three measured limb ratios and the hemiola with its landings', () => {
    const ds = [0, 1, 2, 3].map((o) => generate({ family: 'd-prog', kind: '11:cross', key: 0, hands: 'RL', option: o }));
    expect(ds.slice(0, 3).every((d) => !!d.goal.drum?.poly)).toBe(true);
    expect(ds[2].meter).toBe(3);
    expect(ds[3].goal.drum?.landing?.beats).toEqual([6, 12, 18]);
    const snare = ds[3].notes.filter((n) => n.voice === 'snare').map((n) => n.beat);
    close(snare, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
  });
  it('bass b-time 11–12 generate on a 4-string bass (both tracks)', () => {
    const fam = guitarCatalog().find((f) => f.id === 'b-time')!;
    for (const id of ['b-time-11', 'b-time-12']) {
      const lv = fam.levels.find((l) => l.id === id)!;
      for (const d of levelDrills(lv, 'fifths-up')) expect(d.notes.length, d.itemId).toBeGreaterThan(4);
    }
    const d = generate({ family: 'b-time', kind: 'gm-cross', key: 4, hands: 'R', option: 0, instrument: 'bass' });
    expect(d.notes.every((n) => (n.string ?? 1) <= 4)).toBe(true);
  });
});

describe('voice: meter and cross-rhythm, sung', () => {
  it('groupings and 3 against 2', () => {
    expect(groupStarts([2, 2, 3], 2)).toEqual([0, 2, 4, 7, 9, 11]);
    expect(groupStarts([3, 2], 1)).toEqual([0, 3]);
    close(threeOverTwo(4), [0, 2 / 3, 4 / 3, 2, 8 / 3, 10 / 3]);
  });
  it('v-time 1108–1113: every item says what to sing and its targets sit inside the bars', () => {
    const fam = VOICE_FAMILIES.find((f) => f.id === 'v-time')!;
    for (const n of [1108, 1109, 1110, 1111, 1112, 1113]) {
      expect(fam.refs).toContain(n);
      const lv = TIME_LEVELS.find((l) => l.level === n)!;
      for (const it of lv.items) {
        const ts = it.time!;
        expect(ts.say?.he).toBeTruthy();
        expect(Math.max(...ts.hits)).toBeLessThan(ts.bars * ts.meter);
        for (const c of ts.clickOn ?? []) expect(c).toBeLessThan(ts.meter);
      }
    }
  });
});

describe('quick lessons', () => {
  it('every unit resolves to a lesson; no emoji in the lesson symbols', () => {
    for (const [unit, id] of Object.entries(UNITS)) {
      expect(UNIT_LESSON[unit], unit).toBe(id);
      expect(MINI_LESSONS[id], id).toBeTruthy();
    }
    for (const l of LESSONS) expect(/\p{Extended_Pictographic}/u.test(l.emoji)).toBe(false);
    expect(TOPIC_GLYPH['metric-tap']).toBeTruthy();
    expect(TOPIC_GLYPH['hemiola-tap']).toBeTruthy();
  });
});
