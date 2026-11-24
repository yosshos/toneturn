// Encore (SPEC-PHRASE-STUDIO): detection, segmentation, quantisation, transposition, plan, map, ranks, migration and
// connections. The difficulty model has its own file (encoreDifficulty.test.ts).
import { describe, expect, it } from 'vitest';
import type { RawNote } from '../src/engine/encore/takeSource';
import { catchTake, detectGrid, detectKeyChords, detectMeter, detectSwing, dotsOf, type BeatNote } from '../src/engine/encore/detect';
import { boundaries, candidates, clampSpan, isScaleRun, snapHandle, MAX_BARS } from '../src/engine/encore/segment';
import { quantise, splitHands, wrongNoteFix, isGhost } from '../src/engine/encore/quantise';
import {
  daysPractised, defaultPlan, keyOrder, keyStage, keyStartBpm, makePhrase, phraseDrill, phraseItemId, phraseMap, phrasePitches, phraseRank, phraseRungs, pianoKeyCost, promotion, shiftTo, tonic4, handsOf, finalHand, nextKey, phraseChart, autoName,
} from '../src/engine/encore/phrase';
import { asPhrase, chartChords, chordsFor, draftFrom, library, lickToPhrase, patternToPhrase, qualityOf, type TrimState } from '../src/engine/encore/library';
import { duePhrases, phraseEvent, phraseTake, phrasesDueCount, phrasesOf } from '../src/engine/encore/connect';
import { encoreTakeHash, parseEncoreHash, putMemoryTake, getEncoreTakeSync } from '../src/engine/encore/takeSource';
import { LICKS, lickFromPhrase, type Lick } from '../src/engine/licks';
import { PRESETS, presetDrill } from '../src/engine/drills/custom';
import { newItem } from '../src/engine/drills/ladder';
import type { ItemState } from '../src/engine/drills/types';
import { foldRatings } from '../src/engine/rating';
import { keyMastery, instrumentKeys } from '../src/engine/analysis/keyMastery';
import { suggestWorkout } from '../src/engine/workout2';
import { BEBOP, BEBOP2, CDE } from './encoreFixtures';

const mod = (n: number) => ((n % 12) + 12) % 12;

/** A played line at a tempo: [midi, beat, dur] → MIDI notes in ms, with optional swing and human jitter. */
function play(line: [number, number, number][], bpm: number, o: { swing?: number; jitter?: number; t0?: number; vel?: (i: number) => number } = {}): RawNote[] {
  const P = 60000 / bpm;
  return line.map(([m, b, d], i) => {
    const f = b - Math.floor(b);
    const sb = o.swing && Math.abs(f - 0.5) < 1e-6 ? Math.floor(b) + o.swing : b;
    const j = o.jitter ? ((i * 37) % 11) - 5 : 0;
    const on = (o.t0 ?? 300) + sb * P + j;
    return { pitch: m, on, off: on + d * P * 0.9, vel: o.vel ? o.vel(i) : 80 };
  });
}
/** Eighth notes of a bebop-ish line in F over 4 bars (beats from 0). */
const F_LINE: [number, number, number][] = (() => {
  const semis = [12, 9, 10, 7, 5, 4, 5, 7, 10, 9, 8, 7, 6, 7, 10, 14, 12, 8, 9, 0, 4, 7, 9, 12, 11, 12, 9, 5];
  return semis.map((s, i) => [65 + s - 12 + 12, i * 0.5, 0.5] as [number, number, number]).concat([[69, 14, 2]]);
})();

describe('detection (§14.1, §14.3)', () => {
  it('finds the tempo of a steady line, and its beat 0', () => {
    for (const bpm of [96, 132, 160]) {
      const ns = play(F_LINE, bpm, { jitter: 1 });
      const g = detectGrid(ns);
      const ratio = g.bpm / bpm;
      // the beat, or its double / half (an octave error is offered as the second choice)
      expect([0.5, 1, 2].some((r) => Math.abs(ratio - r) < 0.04), `${bpm} → ${g.bpm}`).toBe(true);
      if (Math.abs(ratio - 1) > 0.04) expect(g.alt).not.toBeNull();
    }
  });
  it('confidence: a steady take is surer than a rubato one; dots map 0..1 to 1..3', () => {
    const steady = detectGrid(play(F_LINE, 120));
    const rubato = detectGrid(F_LINE.map(([m, b], i) => ({ pitch: m, on: 300 + b * 500 * (1 + 0.35 * Math.sin(i * 1.7)) + ((i * 53) % 90), off: null, vel: 80 })));
    expect(steady.conf).toBeGreaterThan(rubato.conf);
    expect(dotsOf(0.1)).toBe(1);
    expect(dotsOf(0.45)).toBe(2);
    expect(dotsOf(0.8)).toBe(3);
  });
  it('detects swing from long-short eighths, straight otherwise', () => {
    const g = { bpm: 140, t0: 300 };
    expect(detectSwing(play(F_LINE, 140, { swing: 0.64 }), g).swing).toBeGreaterThan(0.58);
    expect(detectSwing(play(F_LINE, 140), g).swing).toBe(0.5);
  });
  it('meter: accents every 3 beats read as 3/4, every 4 as 4/4', () => {
    const waltz: [number, number, number][] = Array.from({ length: 24 }, (_, i) => [i % 3 === 0 ? 53 : 65 + (i % 5), i, i % 3 === 0 ? 1 : 0.9]);
    const ns3 = play(waltz, 120, { vel: (i) => (i % 3 === 0 ? 120 : 50) });
    expect(detectMeter(ns3, { bpm: 120, t0: 300 }).meter).toBe(3);
    const four: [number, number, number][] = Array.from({ length: 24 }, (_, i) => [65 + (i % 4), i, 1]);
    const ns4 = play(four, 120, { vel: (i) => (i % 4 === 0 ? 120 : 50) });
    expect(detectMeter(ns4, { bpm: 120, t0: 300 }).meter).toBe(4);
  });
  it('key: a ii–V–I line in F reads as F major with the chords; a minor line offers the relative as second', () => {
    // Gm7 | C7 | Fmaj7 | Fmaj7: chord tones on the beats
    const ii = [67, 70, 74, 77, 74, 70, 67, 65];
    const v = [64, 67, 70, 72, 70, 67, 64, 60];
    const i1 = [65, 69, 72, 76, 72, 69, 65, 64];
    const notes: BeatNote[] = [...ii, ...v, ...i1].map((m, k) => ({ midi: m, beat: k * 0.5, dur: 0.5 })).concat([{ midi: 65, beat: 12, dur: 4 }]);
    const r = detectKeyChords(notes, 4);
    expect(r.best.tonic).toBe(5);
    expect(r.best.minor).toBe(false);
    expect(r.chords.length).toBeGreaterThan(0);
    expect(r.ctx).toBe('major-251');
    expect(r.second.tonic === r.best.tonic && r.second.minor === r.best.minor).toBe(false);
    expect(r.best.p + r.second.p).toBeCloseTo(1, 5);
  });
  it('catchTake: a known tempo (click / band) skips detection', () => {
    const c = catchTake(play(F_LINE, 150, { t0: 0 }), { bpm: 150, t0: 0, meter: 4 });
    expect(c.grid.bpm).toBe(150);
    expect(c.grid.conf).toBe(1);
    expect(c.bars).toBeGreaterThanOrEqual(4);
  });
});

describe('segmentation and trim (§5.2, §14.4)', () => {
  const two: BeatNote[] = [
    ...[0, 0.5, 1, 1.5, 2, 2.5, 3].map((b, i) => ({ midi: 65 + [0, 2, 4, 5, 7, 4, 2][i], beat: b, dur: 0.5 })),
    { midi: 64, beat: 3.5, dur: 2.5 },
    // a bar and a half of rest, then a second phrase
    ...[8, 8.5, 9, 9.5, 10, 10.5, 11].map((b, i) => ({ midi: 72 - [0, 3, 5, 7, 8, 10, 12][i], beat: b, dur: 0.5 })),
    { midi: 60, beat: 11.5, dur: 3 },
  ];
  it('a rest is a strong boundary at the bar line', () => {
    const b = boundaries(two, 4);
    expect(b.find((x) => x.beat === 8)?.strength).toBeGreaterThanOrEqual(0.8);
  });
  it('candidates: whole-bar spans ≤ 8 bars, not overlapping, best first', () => {
    const c = candidates(two, 4);
    expect(c.length).toBeGreaterThan(0);
    for (const x of c) {
      expect(x.from % 4).toBe(0);
      expect(x.to % 4).toBe(0);
      expect(x.bars).toBeLessThanOrEqual(MAX_BARS);
    }
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) expect(c[i].to <= c[j].from || c[j].to <= c[i].from).toBe(true);
  });
  it('a plain scale run is not worth keeping first', () => {
    expect(isScaleRun([60, 62, 64, 65].map((m, i) => ({ midi: m, beat: i, dur: 1 })))).toBe(true);
    expect(isScaleRun([60, 64, 62, 67].map((m, i) => ({ midi: m, beat: i, dur: 1 })))).toBe(false);
  });
  it('handles snap to bars, to beats when held, to the 8th with Shift; a magnet pulls to a boundary', () => {
    expect(snapHandle(5.3, 'bar', 4)).toBe(4);
    expect(snapHandle(5.3, 'beat', 4)).toBe(5);
    expect(snapHandle(5.3, 'eighth', 4)).toBe(5.5);
    expect(snapHandle(5.4, 'beat', 4, [5.5])).toBe(5.5);
  });
  it('the span is capped at 8 bars (16 for a teacher)', () => {
    const c = clampSpan(0, 48, 4);
    expect(c.capped).toBe(true);
    expect(c.to - c.from).toBe(32);
    expect(clampSpan(0, 60, 4, 16).to).toBe(60);
  });
});

describe('quantisation and clean-up (§5.4–5.6, §14.5–14.6)', () => {
  it('grid: onsets to 16ths, a triplet beat stays triplets, chords merge', () => {
    const q = quantise(
      [
        { midi: 60, beat: 0.03, dur: 0.4 },
        { midi: 64, beat: 0.04, dur: 0.4 },
        { midi: 62, beat: 0.52, dur: 0.4 },
        { midi: 65, beat: 1.02, dur: 0.3 },
        { midi: 67, beat: 1.35, dur: 0.3 },
        { midi: 69, beat: 1.66, dur: 0.3 },
      ],
      'grid',
    );
    expect(q.map((n) => n.beat)).toEqual([0, 0, 0.5, 1, 1 + 1 / 3, 1 + 2 / 3].map((x) => expect.closeTo(x, 3)));
  });
  it('swing-aware: a swung 8th becomes the written 8th; "as played" keeps the onsets', () => {
    const sw = [{ midi: 60, beat: 0, dur: 0.6 }, { midi: 62, beat: 0.65, dur: 0.3 }];
    expect(quantise(sw, 'swing', 0.65)[1].beat).toBe(0.5);
    expect(quantise(sw, 'played')[1].beat).toBe(0.65);
  });
  it('durations never run into the next onset; a short gap is legato', () => {
    const q = quantise([{ midi: 60, beat: 0, dur: 1.4 }, { midi: 62, beat: 1, dur: 0.9 }], 'grid');
    expect(q[0].dur).toBe(1);
  });
  it('hands: a wide two-register phrase splits at the widest gap; a one-hand phrase does not', () => {
    const wide: BeatNote[] = [{ midi: 41, beat: 0, dur: 1 }, { midi: 48, beat: 0, dur: 1 }, { midi: 72, beat: 0, dur: 0.5 }, { midi: 74, beat: 0.5, dur: 0.5 }, { midi: 76, beat: 1, dur: 1 }];
    const s = splitHands(wide);
    expect(s.lh.map((n) => n.midi)).toEqual([41, 48]);
    expect(s.rh.length).toBe(3);
    expect(splitHands([{ midi: 64, beat: 0, dur: 1 }, { midi: 72, beat: 1, dur: 1 }]).lh.length).toBe(0);
    expect(splitHands(wide, -1).lh.length).toBe(0);
  });
  it('the wrong-note fix snaps to the nearest chord tone (or key note without chords)', () => {
    // over C7 (root 0, '7'): D♭ (1) → C (0)
    expect(wrongNoteFix(1, [0, '7'])).toBe(0);
    // no chord, C major: F♯ (6) → F (5)
    expect(wrongNoteFix(6, null)).toBe(5);
  });
  it('ghost notes: very soft or very short', () => {
    expect(isGhost(20, 200)).toBe(true);
    expect(isGhost(80, 30)).toBe(true);
    expect(isGhost(80, 200)).toBe(false);
  });
});

describe('the phrase: transposition, drill, plan (§7)', () => {
  it('moves by the shortest interval and keeps the right hand around C4–C6', () => {
    expect(shiftTo(0, 7)).toBe(-5);
    expect(shiftTo(0, 5)).toBe(5);
    expect(shiftTo(5, 11)).toBe(-6);
    const l = BEBOP();
    for (let k = 0; k < 12; k++) {
      const p = phrasePitches(l, k);
      const c = p.rh.reduce((a, b) => a + b, 0) / p.rh.length;
      expect(c, `key ${k}`).toBeGreaterThanOrEqual(57);
      expect(c).toBeLessThanOrEqual(86);
      // same intervals in every key (transposed, not re-shaped)
      const iv = p.rh.slice(1).map((x, i) => x - p.rh[i]);
      expect(iv).toEqual(l.notes.slice(1).map((n, i) => n[0] - l.notes[i][0]));
    }
  });
  it('two hands move together (the distance between the hands is kept)', () => {
    const l = BEBOP2();
    for (const k of [0, 6, 11]) {
      const p = phrasePitches(l, k);
      expect(p.rh[0] - p.lh[0]).toBe(l.notes[0][0] - (l.lh![0][0] - 12));
    }
  });
  it('a phrase in a key is an ordinary drill with its item id (hand suffix for two hands)', () => {
    const l = BEBOP();
    const d = phraseDrill(l, 8, 'R');
    expect(d.itemId).toBe('lick:enc-bebop:piano:8');
    expect(d.notes.length).toBe(l.notes.length);
    expect(d.spec.swing).toBe(true);
    expect(d.chart?.length).toBe(4);
    const d2 = phraseDrill(BEBOP2(), 3, 'RL');
    expect(d2.itemId).toBe('lick:enc-bebop2:piano:3:RL');
    expect(d2.notes.some((n) => n.hand === 'L')).toBe(true);
    expect(phraseItemId(BEBOP2(), 'piano', 3, 'L')).toBe('lick:enc-bebop2:piano:3:L');
    expect(handsOf(BEBOP2())).toEqual(['R', 'L', 'RL']);
    expect(finalHand(BEBOP2())).toBe('RL');
  });
  it('default plan: target 125 % of the tempo played (on the ladder), start ≤ 60 % / played − 15 %, ≥ ♩40', () => {
    const l = BEBOP(160);
    const p = defaultPlan(l, 160);
    expect(p.goalBpm).toBeGreaterThanOrEqual(192);
    expect(p.goalBpm).toBeLessThanOrEqual(208);
    expect(p.startBpm).toBeLessThanOrEqual(Math.round(p.goalBpm * 0.6));
    expect(defaultPlan(l, 40).startBpm).toBeGreaterThanOrEqual(40);
    expect(p.keys).toBe('all');
    expect(p.order).toBe('easiest');
    expect(defaultPlan(BEBOP2(), 144).hands).toBe('R-then-RL');
  });
  it('the rungs run from start to target', () => {
    const r = phraseRungs({ startBpm: 96, goalBpm: 200 });
    expect(r[0]).toBe(96);
    expect(r[r.length - 1]).toBe(200);
    expect([...r].sort((a, b) => a - b)).toEqual(r);
  });
  it('easiest first: the home key first, then by piano cost; all 12 keys exactly once', () => {
    const l = { ...BEBOP(), homeKey: 5 };
    const o = keyOrder(l);
    expect(o[0]).toBe(5);
    expect(new Set(o).size).toBe(12);
    const fourths = keyOrder({ ...l, plan: { ...l.plan!, order: 'fourths' } });
    expect(fourths.slice(0, 3)).toEqual([5, 10, 3]);
    const sub = keyOrder({ ...l, plan: { ...l.plan!, keys: [5, 0, 7] } });
    expect(sub.sort()).toEqual([0, 5, 7]);
    // a white-key scale fragment costs nothing in C, more in F♯
    expect(pianoKeyCost([60, 62, 64, 65, 67])).toBeLessThan(pianoKeyCost([66, 68, 70, 71, 73]));
  });
  it('the chart follows the meter; a phrase without chords has none (a drone)', () => {
    expect(phraseChart(BEBOP(), 5)[0]).toBe('Gm7');
    expect(phraseChart(CDE(), 0)).toEqual([]);
  });
  it('auto name: context and source date, Latin kept for the bdi', () => {
    const n = autoName('major-251', 5, false, 'improv', new Date(2026, 10, 14));
    expect(n.he).toBe('ii–V ב־F · מהאלתור של 14.11');
    expect(n.en).toContain('ii–V in F');
  });
});

/** An item at a key passed at the target (3 clean takes on 2 days) or only started. */
function itemAt(l: Lick, key: number, kind: 'passed' | 'free' | 'clean', hand = finalHand(l)): ItemState {
  const d = phraseDrill(l, key, hand);
  const st = newItem(d);
  const goal = l.plan!.goalBpm;
  if (kind === 'free') return { ...st, rubato: { free: 1, quarters: 0 }, takes: 1, last: '2026-11-10T10:00:00.000Z' };
  if (kind === 'clean') return { ...st, cleanBpm: Math.round(goal * 0.7), takes: 3, last: '2026-11-10T10:00:00.000Z', history: [{ at: '2026-11-10T10:00:00.000Z', bpm: Math.round(goal * 0.7), cv: 0 }] };
  const log = [{ at: '2026-11-10T10:00:00.000Z', bpm: goal }, { at: '2026-11-10T11:00:00.000Z', bpm: goal }, { at: '2026-11-11T10:00:00.000Z', bpm: goal }];
  return { ...st, cleanBpm: goal, passLog: log, takes: 5, last: '2026-11-11T10:00:00.000Z', history: log.map((x) => ({ ...x, cv: 0 })), ewma: { ...st.ewma, acc: 0.97 } };
}
const itemsFor = (l: Lick, keys: number[], kind: 'passed' | 'free' | 'clean' = 'passed') => Object.fromEntries(keys.map((k) => [phraseDrill(l, k, finalHand(l)).itemId, itemAt(l, k, kind)]));

describe('the map, carry-over and ranks (§7.2, §8.4)', () => {
  const l = BEBOP();
  const order = keyOrder(l);
  it('ranks: sketch → pp → p → mp → mf → f (yours: all 12)', () => {
    expect(phraseRank(l, {})).toBe(0);
    expect(phraseRank(l, itemsFor(l, [order[0]], 'free'))).toBe(1);
    expect(phraseRank(l, itemsFor(l, [order[0]]))).toBe(2);
    expect(phraseRank(l, itemsFor(l, order.slice(0, 3)))).toBe(3);
    expect(phraseRank(l, itemsFor(l, order.slice(0, 6)))).toBe(4);
    expect(phraseRank(l, itemsFor(l, order.slice(0, 11)))).toBe(4);
    expect(phraseRank(l, itemsFor(l, order))).toBe(5);
  });
  it('a chosen subset never reaches f', () => {
    const sub = { ...l, plan: { ...l.plan!, keys: order.slice(0, 4) } };
    expect(phraseRank(sub, itemsFor(sub, order.slice(0, 4)))).toBeLessThan(5);
  });
  it('ff: yours + used twice over the band + a review passed ≥ 7 days later', () => {
    const items = itemsFor(l, order);
    expect(phraseRank(l, items, { used: { [l.id]: 2 }, review: { [l.id]: { box: 3, due: '2026-12-01', last: '2026-11-20T10:00:00.000Z', reps: 2 } } })).toBe(6);
    expect(phraseRank(l, items, { used: { [l.id]: 1 } })).toBe(5);
  });
  it('promotion: the bar runs only to the next rank and is never full below the top', () => {
    for (let n = 0; n <= 11; n++) {
      const p = promotion(l, itemsFor(l, order.slice(0, n)));
      expect(p.value).toBeLessThan(1);
    }
    const at4 = promotion(l, itemsFor(l, order.slice(0, 4)));
    expect(at4.rank).toBe(3);
    expect(at4.need).toBe(2);
  });
  it('the map: a column per key in plan order; passed keys carry the fermata dot; one current cell', () => {
    const m = phraseMap(l, itemsFor(l, order.slice(0, 2)));
    expect(m.keys).toEqual(order);
    expect(m.cells[0][m.rows.length - 1]).toBe('passed');
    expect(m.cells[1][m.rows.length - 1]).toBe('passed');
    expect(m.current?.key).toBe(order[2]);
    expect(m.cells.flat().filter((c) => c === 'current').length).toBe(1);
  });
  it('carry-over: the first key starts at the plan start; later keys at 80 % of the best clean tempo', () => {
    const items = itemsFor(l, [order[0]]);
    expect(keyStartBpm(l, items, order[0])).toBe(l.plan!.startBpm);
    expect(keyStartBpm(l, items, order[1])).toBe(Math.round(l.plan!.goalBpm * 0.8));
  });
  it('rubato first: the first key twice in free time; a later key once, then straight to tempo', () => {
    expect(keyStage(l, {}, order[0])).toBe('free');
    const one = { [phraseDrill(l, order[0], 'R').itemId]: { ...itemAt(l, order[0], 'free'), rubato: { free: 2, quarters: 0 } } };
    expect(keyStage(l, one, order[0], 'piano', 'R', true)).toBe('quarters');
    expect(keyStage(l, one, order[0], 'piano', 'R', false)).toBe(null);
    expect(keyStage(l, {}, order[1])).toBe('free');
    expect(keyStage(l, itemsFor(l, [order[1]], 'free'), order[1])).toBe(null);
  });
  it('next key: the first not passed (a started one first); days practised count distinct days', () => {
    const items = { ...itemsFor(l, [order[0]]), ...itemsFor(l, [order[4]], 'clean') };
    expect(nextKey(l, items)).toBe(order[4]);
    expect(daysPractised(l, items)).toBeGreaterThanOrEqual(2);
  });
});

describe('migration and the library (§4.4, §13.4)', () => {
  it('old own licks read as phrases with their ids (no progress lost)', () => {
    const old = lickFromPhrase('tx-1', { en: 'x', he: 'x' }, 0, [{ midi: 60, beat: 0, dur: 1 }, { midi: 64, beat: 1, dur: 1 }, { midi: 67, beat: 2, dur: 2 }], null);
    const p = asPhrase(old);
    expect(p.id).toBe('tx-1');
    expect(p.plan?.order).toBe('fourths');
    expect(phraseItemId(p, 'piano', 5)).toBe('lick:tx-1:piano:5');
  });
  it('lickFromPhrase takes the detected context instead of forcing major ii–V', () => {
    expect(lickFromPhrase('a', { en: 'a', he: 'a' }, 0, [{ midi: 60, beat: 0, dur: 1 }], null, 'free').ctx).toBe('free');
    expect(lickFromPhrase('a', { en: 'a', he: 'a' }, 0, [{ midi: 60, beat: 0, dur: 1 }], null).ctx).toBe('major-251');
  });
  it('custom drills show as patterns beside phrases; "make it a phrase" keeps the pattern', () => {
    const c = presetDrill(PRESETS[0], 'c1', '2026-11-01T00:00:00.000Z');
    const ph = BEBOP();
    const lib = library({ own: [ph] }, [c], {});
    expect(lib.find((x) => x.kind === 'pattern')?.id).toBe('c1');
    expect(lib.find((x) => x.kind === 'phrase')?.id).toBe(ph.id);
    const made = patternToPhrase(c, 'enc-made');
    expect(made?.source).toEqual({ kind: 'pattern', drillId: 'c1' });
    expect(made!.notes.length).toBeGreaterThan(2);
  });
  it('a built-in lick added to my phrases keeps its notes and chords', () => {
    const l = lickToPhrase(LICKS[0], 'enc-l');
    expect(l.chords).toEqual(LICKS[0].chords);
    expect(l.notes.map((n) => n[0] - l.notes[0][0])).toEqual(LICKS[0].notes.map((n) => n[0] - LICKS[0].notes[0][0]));
    expect(l.source).toEqual({ kind: 'lick', lickId: LICKS[0].id });
  });
  it('chart chords: qualities, relative to the key, repeated over choruses and cut to the span', () => {
    expect(qualityOf([0, 3, 7, 10])).toBe('m7');
    expect(qualityOf([0, 4, 7, 10])).toBe('7');
    expect(qualityOf([0, 4, 7, 11])).toBe('maj7');
    const ch = chartChords('Gm7 | C7 | Fmaj7 | Fmaj7', 5, 4, 32);
    expect(ch[0]).toEqual([2, 'm7', 4]);
    expect(ch.length).toBe(8);
    expect(chordsFor(ch, 4, 12, 4)).toEqual([[7, '7', 4], [0, 'maj7', 4]]);
  });
  it('a take + a span → a phrase (trim, quantise, hands, name)', () => {
    const notes = play(F_LINE, 120, { t0: 0 });
    const take = { id: 'mem:t', at: '2026-11-14T10:00:00.000Z', kind: 'improv' as const, instrument: 'piano' as const, title: 'x', source: 'midi' as const, notes, bpm: 120, t0: 0, meter: 4 };
    const s: TrimState = { takeId: 'mem:t', from: 4, to: 12, view: 'roll', key: 5, minor: false, chordsOn: false, quant: 'grid', split: null, name: '', bpm: 120, meter: 4, swing: 0.5, edits: { 8: 'x' }, t0: 0 };
    const d = draftFrom(take, s, [], 'free', 'enc-x');
    expect(d.rh.every((n) => n.beat >= 0 && n.beat < 8)).toBe(true);
    expect(d.rh.length).toBe(F_LINE.filter(([, b]) => b >= 4 && b < 12).length - 1);
    expect(d.name.he).toContain('14.11');
    const l = makePhrase(d);
    expect(l.homeKey).toBe(5);
    expect(l.notes[0][0]).toBe(d.rh[0].midi - tonic4(5));
  });
});

describe('connections (§9, §10.5–10.7)', () => {
  const l = BEBOP();
  const order = keyOrder(l);
  it('a take at tempo earns XP from the phrase, a tagged rating event at half weight, and books today\'s XP', () => {
    const k = order[0];
    const id = phraseDrill(l, k).itemId;
    const before = {};
    const after = { [id]: { ...newItem(phraseDrill(l, k)), cleanBpm: 150, takes: 1 } };
    const o = phraseTake({ l, key: k, stage: 'tempo', m: { verdict: 'clean', accuracy: 0.98 }, bpm: l.plan!.goalBpm, before, after, book: { own: [l] }, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 0 });
    expect(o.xp).toBeGreaterThan(1);
    expect(o.events.length).toBe(1);
    const e = o.events[0];
    expect(e.tags!.reduce((a, t) => a + t.w, 0)).toBeCloseTo(0.5, 5);
    expect(e.tags!.some((t) => t.sub === 'instrument/piano-tech')).toBe(true);
    expect(e.difficulty).toBeGreaterThan(1100);
    expect(o.book.phraseXp?.by[l.id]).toBe(o.xp);
    // the rating engine takes it (no crash, the course sub moves)
    const r = foldRatings(o.events);
    expect(r['instrument/piano-tech']).toBeDefined();
  });
  it('a non-home key tags transposing; free-time takes emit no rating event', () => {
    const e = phraseEvent(l, order[3], 1200, { verdict: 'clean', accuracy: 1 }, '2026-11-16T10:00:00.000Z', 's', 1);
    expect(e.tags!.some((t) => t.skill === 'transpose')).toBe(true);
    const o = phraseTake({ l, key: order[0], stage: 'free', m: { verdict: 'clean', accuracy: 1 }, bpm: 0, before: {}, after: {}, book: {}, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 2 });
    expect(o.events).toEqual([]);
  });
  it('the daily cap stops the XP of one phrase; a completion bonus is paid in full', () => {
    const k = order[0];
    const o = phraseTake({ l, key: k, stage: 'tempo', m: { verdict: 'clean', accuracy: 1 }, bpm: l.plan!.goalBpm, before: {}, after: {}, book: { phraseXp: { day: '2026-11-16', by: { [l.id]: 999 } } }, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 3 });
    expect(o.xp).toBe(0);
    const eleven = itemsFor(l, order.slice(0, 11));
    const all = itemsFor(l, order);
    const last = order[11];
    const y = phraseTake({ l, key: last, stage: 'tempo', m: { verdict: 'clean', accuracy: 1 }, bpm: l.plan!.goalBpm, before: eleven, after: all, book: { phraseXp: { day: '2026-11-16', by: { [l.id]: 999 } } }, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 4 });
    expect(y.yours).toBe(true);
    expect(y.completion).toBeGreaterThan(0);
    expect(y.xp).toBe(y.completion);
    expect(y.rankAfter).toBe(5);
  });
  it('at mp the phrase joins the spaced review; Today and the workout pick it when due', () => {
    const items3 = itemsFor(l, order.slice(0, 3));
    const two = itemsFor(l, order.slice(0, 2));
    const o = phraseTake({ l, key: order[2], stage: 'tempo', m: { verdict: 'clean', accuracy: 1 }, bpm: l.plan!.goalBpm, before: two, after: items3, book: { own: [l] }, now: '2026-11-16T10:00:00.000Z', sessionId: 's', index: 5 });
    expect(o.book.review?.[l.id]).toBeDefined();
    expect(o.book.mine).toBeUndefined();
    const later = '2026-11-20T10:00:00.000Z';
    expect(phrasesDueCount(o.book, later)).toBe(1);
    const d = duePhrases(o.book, items3, 'today', later);
    expect(d[0].l.id).toBe(l.id);
    expect(d[0].why).toBe('review');
    // (SPEC-PRACTICE-SESSION §3.3: a review add-on joins while the length has room for another block)
    const w = suggestWorkout({ total: 60, goal: 'general' as never, priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view: { units: [] } as never, phrasesDue: 1, licksDue: 0, opened: 3 });
    expect(w.some((b) => b.target.kind === 'game' && b.target.game === 'encore')).toBe(true);
  });
  it('a phrase in progress (not due) is offered to Today too; "yours" phrases are not', () => {
    const items = itemsFor(l, order.slice(0, 1), 'clean');
    expect(duePhrases({ own: [l] }, items, 'today', '2026-11-16T10:00:00.000Z')[0]?.why).toBe('progress');
    expect(duePhrases({ own: [l] }, itemsFor(l, order), 'today', '2026-11-16T10:00:00.000Z').length).toBe(0);
    expect(phrasesOf({ own: [l, LICKS[0]] }).map((x) => x.id)).toEqual([l.id]);
  });
  it('key mastery sees phrase keys (piano)', () => {
    const items = itemsFor(l, order.slice(0, 4));
    const sk = keyMastery(items);
    expect(sk.find((s) => s.skill === 'licks:phrase:piano')).toBeDefined();
    expect(instrumentKeys(items).find((i) => i.instrument === 'piano')).toBeDefined();
  });
});

describe('the take adapter and the route (§12.2)', () => {
  it('in-memory takes resolve by id; the route carries take / from / to', () => {
    const id = putMemoryTake({ kind: 'improv', instrument: 'piano', title: 'x', source: 'midi', notes: [{ pitch: 60, on: 0, off: 100, vel: 80 }] });
    expect(getEncoreTakeSync(id)?.notes.length).toBe(1);
    const h = encoreTakeHash(id, { from: 4, to: 12 });
    const r = parseEncoreHash(h);
    expect(r.view).toBe('new');
    expect(r.take).toBe(id);
    expect(r.from).toBe(4);
    expect(r.to).toBe(12);
    expect(parseEncoreHash('#/encore/run/enc-a~5~R')).toEqual({ view: 'run', id: 'enc-a~5~R' });
    expect(parseEncoreHash('#/encore').view).toBe('home');
  });
});

describe('the adapter over My recordings (part A)', () => {
  it('a RecTake reads as an EncoreTake: notes unpacked, t0 seconds → ms, graded kinds flagged', async () => {
    const { packNotes } = await import('../src/storage/recordings');
    const { encoreTakeOf } = await import('../src/engine/encore/takeSource');
    const rec = { id: 'r1', sessionId: 's', at: '2026-11-16T10:00:00.000Z', durationMs: 2000, course: null, instrument: 'piano' as const, kind: 'drill' as const, title: 'x', sung: false, source: 'midi' as const, notes: packNotes([{ pitch: 60, on: 0, off: 400, vel: 80 }, { pitch: 64, on: 500, off: 900, vel: 90 }]), bpm: 120, meter: 4, t0: 0.25, chart: 'C | F' };
    const t = encoreTakeOf(rec);
    expect(t.notes).toEqual([{ pitch: 60, on: 0, off: 400, vel: 80 }, { pitch: 64, on: 500, off: 900, vel: 90 }]);
    expect(t.t0).toBe(250);
    expect(t.bpm).toBe(120);
    expect(t.graded).toBe(true);
    expect(t.chart).toBe('C | F');
  });
});

describe('enharmonics and 12 keys', () => {
  it('every key builds a drill; keys are pitch classes (D♭ = C♯)', () => {
    const l = BEBOP();
    for (let k = 0; k < 12; k++) expect(phraseDrill(l, k).spec.key).toBe(k);
    expect(phraseDrill(l, 13).spec.key).toBe(1);
    expect(mod(-11)).toBe(1);
  });
});
