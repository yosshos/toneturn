// Encore v1 leftovers (SPEC-PHRASE-STUDIO §5, §7, §8): the wider window of "as played" phrases, the pickup bar, the
// de-duplicated take copies, the magnet's flag, and the friends' activity line for "the phrase is yours".
import { describe, expect, it } from 'vitest';
import { analyzeTake } from '../src/engine/drills/analyze';
import type { PlayedNote } from '../src/engine/drills/types';
import { clickPlan, staffLines } from '../src/engine/drills/timeline';
import { AS_PLAYED_TOLERANCE, barOfBeat, detectPickup, makePhrase, phraseBars, phraseBeats, phraseChart, phraseDrill, withPickup, type PhraseDraft } from '../src/engine/encore/phrase';
import { dedupeTakes, putMemoryTake, sameTake, twinOffset, type EncoreTake } from '../src/engine/encore/takeSource';
import { snapHandle, snapHandleInfo } from '../src/engine/encore/segment';
import { activityText } from '../src/engine/socialRound';
import { phrase } from './encoreFixtures';

/** The drill's notes played at a tempo, each onset `jit(i)` ms off. */
function playDrill(d: ReturnType<typeof phraseDrill>, bpm: number, jit: (i: number) => number): PlayedNote[] {
  const P = 60000 / bpm;
  return d.notes.map((n, i) => ({ pitch: n.pitch, on: n.beat * P + jit(i), off: (n.beat + n.dur) * P * 0.95 + jit(i), vel: 80 }));
}

describe('"as played" phrases: a wider grading window (§5.5)', () => {
  const line = '0 2 4 5 7 9 11 12 | 11 9 7 5 4 2 0h';
  const grid = phrase('enc-grid', line);
  const asPlayed = phrase('enc-asp', line, { asPlayed: true });
  it('the drill carries the tolerance only when the phrase was kept as played', () => {
    expect(phraseDrill(asPlayed, 0).goal.timingTolerance).toBe(AS_PLAYED_TOLERANCE);
    expect(phraseDrill(grid, 0).goal.timingTolerance).toBeUndefined();
  });
  it('a take loose enough to miss the grid window is clean in the wider one', () => {
    const bpm = 100;
    const dg = phraseDrill(grid, 0);
    const da = phraseDrill(asPlayed, 0);
    // a human wobble (−d, +d, 0, …): the smallest d at which the grid phrase stops being clean
    let found = 0;
    for (let d = 4; d <= 90; d += 2) {
      const jit = (i: number) => [-d, d, 0, d * 0.6, -d * 0.6][i % 5];
      const g = analyzeTake(dg, bpm, playDrill(dg, bpm, jit));
      if (g.verdict !== 'clean') {
        found = d;
        const a = analyzeTake(da, bpm, playDrill(da, bpm, jit));
        expect(a.accuracy).toBe(1);
        expect(a.verdict).toBe('clean');
        break;
      }
    }
    expect(found).toBeGreaterThan(0);
  });
  it('wrong notes still fail an "as played" take (only the timing widens)', () => {
    const d = phraseDrill(asPlayed, 0);
    const played = playDrill(d, 100, () => 0).map((p, i) => (i === 3 ? { ...p, pitch: p.pitch + 1 } : p));
    expect(analyzeTake(d, 100, played).verdict).not.toBe('clean');
  });
});

describe('pickup bar (anacrusis, §5.2)', () => {
  const draft = (beats: number[], meter: 3 | 4 = 4, chords: PhraseDraft['chords'] = []): PhraseDraft => ({
    id: 'enc-pk',
    name: { en: 'pk', he: 'pk' },
    rh: beats.map((b, i) => ({ midi: 60 + (i % 5) * 2, beat: b, dur: 0.5 })),
    lh: [],
    key: 0,
    minor: false,
    chords,
    ctx: 'free',
    meter,
    swing: 0.5,
    instrument: 'piano',
    playedBpm: 120,
  });
  it('detects a lead-in in the second half of the first bar that runs into the next bar', () => {
    expect(detectPickup(draft([3, 3.5, 4, 5, 6]).rh, 4)).toBe(1); // on 4
    expect(detectPickup(draft([3.5, 4, 5, 6]).rh, 4)).toBe(1); // the "and" of 4: a one-beat bar with an eighth rest
    expect(detectPickup(draft([2, 2.5, 3, 3.5, 4, 5]).rh, 4)).toBe(2); // on 3
    expect(detectPickup(draft([2, 3, 4]).rh, 3)).toBe(1); // 3/4, on 3
  });
  it('no pickup: a downbeat start, an early-bar rest, or a phrase that ends in its first bar', () => {
    expect(detectPickup(draft([0, 1, 2, 3, 4]).rh, 4)).toBe(0);
    expect(detectPickup(draft([1, 2, 3, 4]).rh, 4)).toBe(0);
    expect(detectPickup(draft([2, 2.5, 3, 3.5]).rh, 4)).toBe(0);
    expect(detectPickup(draft([3.95, 4.5, 5]).rh, 4)).toBe(0); // a hair early on the downbeat is not a pickup
  });
  it('the draft moves back so beat 0 starts a short first bar; chords lose the empty beats', () => {
    const d = withPickup(draft([3, 3.5, 4, 5, 6, 7], 4, [[0, 'maj7', 4], [7, '7', 4]]));
    expect(d.pickup).toBe(1);
    expect(d.rh.map((n) => n.beat)).toEqual([0, 0.5, 1, 2, 3, 4]);
    expect(d.chords).toEqual([[0, 'maj7', 1], [7, '7', 4]]);
    expect(withPickup(draft([0, 1, 2, 3])).pickup).toBe(0);
  });
  it('the phrase notates it: a short first bar written in the meter, the downbeat after it, a full count-in', () => {
    const l = makePhrase(withPickup(draft([3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11], 4, [[0, 'maj7', 4], [7, '7', 4], [0, 'maj7', 4]])));
    expect(l.pickup).toBe(1);
    expect(phraseBeats(l)).toBe(1 + 8);
    expect(phraseBars(l)).toBe(3);
    expect(barOfBeat(l, 0.5)).toBe(0);
    expect(barOfBeat(l, 1)).toBe(1);
    expect(barOfBeat(l, 5)).toBe(2);
    expect(phraseChart(l, 0)).toEqual(['Cmaj7', 'G7', 'Cmaj7']);
    const d = phraseDrill(l, 0, 'R');
    expect(d.meter).toBe(4);
    const lines = staffLines(d, 8);
    const bars = lines.flatMap((x) => x.bars);
    expect(bars[0].len).toBe(1);
    expect(bars[0].sig).toBe('4/4');
    expect(bars[1].sig).toBeUndefined();
    expect(bars[1].len).toBe(4);
    // the count-in: a full bar and three beats, so "1 2 3 4 | 1 2 3" and the pickup comes on 4
    const cp = clickPlan(d, 120);
    expect(cp.countIn).toBe(7);
    expect(cp.clicks.filter((c) => c.count && c.accent).length).toBe(2);
    expect(cp.at(0)).toBeCloseTo(7 * 0.5, 6);
  });
  it('a phrase without a pickup is unchanged (no bar plan)', () => {
    const l = makePhrase(withPickup(draft([0, 1, 2, 3, 4, 5])));
    const d = phraseDrill(l, 0, 'R');
    expect(d.meters).toBeUndefined();
    expect(clickPlan(d, 120).countIn).toBe(4);
  });
});

describe('a kept take is stored once (§6.1)', () => {
  const notes = [60, 62, 64, 65, 67].map((p, i) => ({ pitch: p, on: 100 + i * 250, off: 300 + i * 250, vel: 80 }));
  const take = (id: string, at: string, shift = 0, ns = notes): EncoreTake => ({ id, at, kind: 'improv', instrument: 'piano', title: 't', source: 'midi', notes: ns.map((n) => ({ ...n, on: n.on + shift, off: (n.off ?? 0) + shift })) });
  it('the review copy and the stored take are the same take (same notes, a re-based clock, Keep pressed later)', () => {
    const mem = take('mem:a', '2026-11-16T10:05:00.000Z');
    const rec = take('take_1', '2026-11-16T10:00:00.000Z', -100);
    expect(sameTake(mem, rec)).toBe(true);
    expect(twinOffset(mem, rec)).toBe(100);
    expect(sameTake(mem, take('take_2', '2026-11-16T12:00:00.000Z'))).toBe(false); // hours apart
    expect(sameTake(mem, take('take_3', '2026-11-16T10:01:00.000Z', 0, notes.map((n, i) => (i === 2 ? { ...n, pitch: 63 } : n))))).toBe(false);
  });
  it('the shelf lists it once, preferring the stored take', () => {
    const list = dedupeTakes([take('mem:a', '2026-11-16T10:05:00.000Z'), take('take_1', '2026-11-16T10:00:00.000Z', -100), take('take_9', '2026-11-16T09:00:00.000Z', 0, notes.slice(0, 4))]);
    expect(list.map((t) => t.id)).toEqual(['take_1', 'take_9']);
    expect(dedupeTakes([take('mem:x', '2026-11-16T10:00:00.000Z'), take('mem:x', '2026-11-16T10:00:00.000Z')]).length).toBe(1);
  });
  it('Keep pressed twice on one take gives one copy', () => {
    const t = { kind: 'drill' as const, instrument: 'piano' as const, title: 'x', source: 'midi' as const, notes: notes.map((n) => ({ ...n, pitch: n.pitch + 7 })) };
    const a = putMemoryTake(t);
    const b = putMemoryTake(t);
    expect(b).toBe(a);
    expect(putMemoryTake({ ...t, notes: t.notes.slice(1) })).not.toBe(a);
  });
});

describe('the magnet flags a suggested boundary (§5.2)', () => {
  it('reports when a boundary pulled the handle, and snapHandle is unchanged', () => {
    expect(snapHandleInfo(5.3, 'beat', 4, [5.5])).toEqual({ beat: 5.5, magnet: true });
    expect(snapHandleInfo(5.2, 'beat', 4, [7])).toEqual({ beat: 5, magnet: false });
    expect(snapHandleInfo(5.4, 'bar', 4, [5.5])).toEqual({ beat: 4, magnet: false });
    expect(snapHandle(5.3, 'beat', 4, [5.5])).toBe(5.5);
  });
});

describe('friends\' activity: "the phrase is yours" (§8.5)', () => {
  it('one line in both languages, grade and tempo only', () => {
    expect(activityText('phrase', { grade: 6, bpm: 180 }, 'en')).toBe('mastered a phrase of their own in all 12 keys (grade 6 · ♩180)');
    expect(activityText('phrase', { grade: 6, bpm: 180 }, 'he')).toContain('12');
    expect(activityText('phrase', {}, 'en')).toBe('mastered a phrase of their own in all 12 keys');
  });
});
