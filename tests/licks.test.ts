import { describe, expect, it } from 'vitest';
import { bookAfterTake, chordAt, CONTEXTS, dueLicks, LICK_KEYS, lickBeats, lickChart, lickDrill, lickEvents, lickFromPhrase, lickGrid, lickItemId, lickPitches, lickProblems, LICK_Q, LICKS, lickStars, lickTempos, nextLickKey, parseLine, placeOnNeck, reviewAfter, reviewKey, reviewStart, windowOf, lickCard } from '../src/engine/licks';
import { findLick, useItChart, useItPassed, qualityOfIntervals, type ImpNote } from '../src/engine/lickDetect';
import { parseChart, parseChord } from '../src/engine/charts';
import { analyzeTake } from '../src/engine/drills/analyze';
import { tuningById } from '../src/engine/fretboard';
import type { ItemState, PlayedNote, TakeMetrics } from '../src/engine/drills/types';

const mod = (n: number) => ((n % 12) + 12) % 12;

describe('lick library', () => {
  it('has licks in every context and levels 1–4+, unique ids', () => {
    for (const c of CONTEXTS) expect(LICKS.some((l) => l.ctx === c.id), c.id).toBe(true);
    expect(new Set(LICKS.map((l) => l.id)).size).toBe(LICKS.length);
    expect(LICKS.length).toBeGreaterThanOrEqual(24);
  });
  it('every lick is valid over its chords (scale tones, resolving chromatics, chord tones on the beats)', () => {
    for (const l of LICKS) expect(lickProblems(l), l.id).toEqual([]);
  });
  it('the validator catches a wrong note', () => {
    const bad = { ...LICKS[0], notes: parseLine('2q 6q 9q 12q | 11q 7q 5q 2q | 4w') };
    expect(lickProblems(bad).length).toBeGreaterThan(0);
    const badEnd = { ...LICKS[0], notes: parseLine('2q 5q 9q 12q | 11q 7q 5q 2q | 5w') };
    expect(lickProblems(badEnd).join()).toMatch(/last note/);
  });
  it('the line language counts beats', () => {
    const ns = parseLine('0 2q rq 4h 7t 9t 11t 12d');
    expect(ns.map((n) => n[0])).toEqual([0, 2, 4, 7, 9, 11, 12]);
    [0, 0.5, 2.5, 4.5, 4.8333, 5.1667, 5.5].forEach((b, i) => expect(ns[i][1]).toBeCloseTo(b, 3));
    expect(ns[6][2]).toBe(1.5);
  });
  it('notes fit inside the chords and the chart names parse', () => {
    for (const l of LICKS) {
      expect(lickBeats(l)).toBeLessThanOrEqual(l.chords.reduce((a, c) => a + c[2], 0) + 1e-6);
      for (const k of [0, 3, 6, 10]) {
        const p = parseChart(lickChart(l, k).join(' | '));
        expect(p.errors, `${l.id} ${k}`).toEqual([]);
        expect(p.bars).toBe(Math.ceil(lickBeats(l) / 4 - 1e-6));
      }
    }
  });
  it('chord symbols mean the qualities the lick was written over', () => {
    for (const [q, d] of Object.entries(LICK_Q)) {
      const c = parseChord(`G${d.sym}`)!;
      expect(c, q).not.toBeNull();
      for (const ct of d.ct) expect(c.iv.map(mod), `${q} ${ct}`).toContain(ct);
    }
  });
});

describe('transposing', () => {
  it('every key keeps the intervals and the chord relations', () => {
    for (const l of LICKS)
      for (const k of LICK_KEYS) {
        const ps = lickPitches(l, k);
        const c0 = lickPitches(l, 0);
        const d = ps[0] - c0[0];
        expect(mod(d)).toBe(k);
        ps.forEach((p, i) => expect(p - c0[i]).toBe(d));
      }
  });
  it('register fits the instrument (guitar, bass, voice range)', () => {
    for (const inst of ['piano', 'guitar', 'bass'] as const) {
      const [lo, hi] = windowOf(inst);
      for (const l of LICKS)
        for (const k of LICK_KEYS) {
          const ps = lickPitches(l, k, inst);
          // Wide licks may stick out a little; the middle sits inside.
          expect((Math.min(...ps) + Math.max(...ps)) / 2, `${inst} ${l.id} ${k}`).toBeGreaterThanOrEqual(lo);
          expect((Math.min(...ps) + Math.max(...ps)) / 2).toBeLessThanOrEqual(hi);
        }
    }
    const ps = lickPitches(LICKS[0], 7, 'voice', { low: 48, high: 64 });
    expect(Math.min(...ps)).toBeGreaterThanOrEqual(45);
    expect(Math.max(...ps)).toBeLessThanOrEqual(67);
  });
  it('the neck placement plays the right pitches in one position', () => {
    const tu = tuningById('standard');
    for (const l of LICKS.slice(0, 10)) {
      const ps = lickPitches(l, 5, 'guitar');
      const pl = placeOnNeck(ps, tu.open);
      pl.forEach((x, i) => expect(tu.open[x.string - 1] + x.fret).toBe(ps[i]));
    }
  });
  it('a lick drill per key and instrument: item ids, chart, chord tones, start tempo', () => {
    const l = LICKS.find((x) => x.id === 'maj-arp')!;
    const d = lickDrill(l, 3, 'guitar');
    expect(d.itemId).toBe(lickItemId(l, 'guitar', 3));
    expect(d.spec.family).toBe('licks');
    expect(d.chart).toEqual(['Fm7', 'Bb7', 'Ebmaj7']);
    expect(d.notes.every((n) => n.string && n.fret !== undefined)).toBe(true);
    expect(d.notes.filter((n) => n.chordTone).length).toBe(d.notes.length);
    expect(d.startBpm).toBe(lickTempos(l)[0]);
    expect(lickDrill(l, 3, 'voice').itemId).toContain(':voice:');
  });
  it('a clean, in-time take of the drill passes the drills analysis', () => {
    const l = LICKS.find((x) => x.id === 'maj-bebop')!;
    const d = lickDrill(l, 10, 'piano');
    const bpm = 100;
    const played: PlayedNote[] = d.notes.map((n) => {
      const f = n.beat - Math.floor(n.beat);
      const b = Math.abs(f - 0.5) < 1e-6 ? Math.floor(n.beat) + 2 / 3 : n.beat;
      return { pitch: n.pitch, on: (b * 60000) / bpm, off: ((b + n.dur * 0.9) * 60000) / bpm, vel: 80 };
    });
    expect(analyzeTake(d, bpm, played).verdict).toBe('clean');
  });
});

const item = (id: string, bpms: number[], days = 2): ItemState => ({
  itemId: id, family: 'licks', key: 0, hands: 'R', cleanBpm: Math.max(0, ...bpms), goalBpm: 80, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: bpms.length, last: '',
  history: [], passLog: bpms.map((bpm, i) => ({ at: `2026-11-0${1 + (i % days)}T10:00:00Z`, bpm })),
});

describe('grid, stars, next key', () => {
  const l = LICKS.find((x) => x.id === 'dom-bebop')!;
  const t = lickTempos(l);
  it('four rising tempos', () => {
    expect(t).toHaveLength(4);
    expect(t[3]).toBeGreaterThan(t[0]);
  });
  it('rungs and the five-star scale come only from measured clean takes', () => {
    const items: Record<string, ItemState> = {};
    expect(lickStars(l, 'piano', items)).toBe(0);
    for (const k of [0, 5, 10]) items[lickItemId(l, 'piano', k)] = item(lickItemId(l, 'piano', k), [t[0]]);
    expect(lickStars(l, 'piano', items)).toBe(1);
    expect(lickGrid(l, 'piano', items)[0].rung).toBe(1);
    items[lickItemId(l, 'piano', 0)] = item('x', [t[3], t[3], t[3]]);
    expect(lickStars(l, 'piano', items)).toBe(2);
    expect(lickGrid(l, 'piano', items)[0]).toMatchObject({ rung: 4, passed: true });
    expect(nextLickKey(l, 'piano', items)).toBe(5);
    for (const k of [5, 10]) items[lickItemId(l, 'piano', k)] = item('x', [t[3], t[3], t[3]]);
    expect(lickStars(l, 'piano', items)).toBe(3);
    for (const k of LICK_KEYS) items[lickItemId(l, 'piano', k)] = item('x', [t[3], t[3], t[3]]);
    expect(lickStars(l, 'piano', items)).toBe(5);
    // One day only: never a pass.
    expect(lickStars(l, 'guitar', Object.fromEntries(LICK_KEYS.map((k) => [lickItemId(l, 'guitar', k), item('x', [t[3], t[3], t[3]], 1)])))).toBe(1);
  });
  it('rated events: vocabulary first, the instrument or voice second', () => {
    const m = { verdict: 'clean', accuracy: 1 } as TakeMetrics;
    const [e] = lickEvents(l, 'guitar', m, t[3], '2026-11-11T00:00:00Z', 's', 0);
    expect(e.skill).toBe('improv');
    expect(e.tags?.[0].sub).toBe('improv/vocab');
    expect(e.tags?.[1].sub).toBe('instrument/guitar-tech');
    expect(lickEvents(l, 'voice', m, t[0], 'x', 's', 1)[0].tags?.[1].skill).toBe('singing');
    expect(lickEvents(l, 'piano', m, t[3], 'x', 's', 1)[0].difficulty).toBeGreaterThan(lickEvents(l, 'piano', m, t[0], 'x', 's', 1)[0].difficulty);
  });
});

describe('spaced review', () => {
  it('FSRS: a pass waits longer each time, a miss comes back tomorrow, due by day', () => {
    const now = new Date('2026-11-11T10:00:00');
    const r0 = reviewStart(now);
    expect(r0).toMatchObject({ box: 1, due: '2026-11-12' });
    const r1 = reviewAfter(r0, true, new Date('2026-11-12T10:00:00'));
    expect(r1.due > '2026-11-14').toBe(true);
    expect(r1.s!).toBeGreaterThan(r0.s!);
    const r2 = reviewAfter(r1, false, new Date('2026-11-15T10:00:00'));
    expect(r2).toMatchObject({ box: 1, due: '2026-11-16', lapses: 1 });
    expect(r2.s!).toBeLessThan(r1.s!);
    expect(dueLicks({ a: { ...r1, due: '2026-11-14' }, b: r0, c: r2 }, new Date('2026-11-15T12:00:00'))).toEqual(['b', 'a']);
    expect(dueLicks({ a: r1 }, new Date('2026-11-13T12:00:00'))).toEqual([]);
  });
  it('an old Leitner review migrates without losing its place (box interval → stability)', () => {
    const old = { box: 4, due: '2026-11-25', last: '2026-11-11T10:00:00' };
    expect(lickCard(old).s).toBe(14);
    const r = reviewAfter(old, true, new Date('2026-11-25T10:00:00'));
    expect(r.s!).toBeGreaterThan(14);
    expect(r.due > '2026-12-09').toBe(true);
  });
  it('a lick that becomes known joins my licks and the review once', () => {
    const b1 = bookAfterTake(undefined, 'dom-bebop', true, null, new Date('2026-11-11T10:00:00'));
    expect(b1.mine).toEqual(['dom-bebop']);
    expect(b1.review?.['dom-bebop'].box).toBe(1);
    const b2 = bookAfterTake(b1, 'dom-bebop', true, null);
    expect(b2.review?.['dom-bebop']).toEqual(b1.review?.['dom-bebop']);
    expect(bookAfterTake(b2, 'dom-bebop', true, { pass: true }, new Date('2026-11-12T10:00:00')).review?.['dom-bebop'].box).toBeGreaterThanOrEqual(2);
  });
  it('the review key varies and never repeats the last key', () => {
    const l = LICKS[3];
    const k = reviewKey(l, '2026-11-11');
    expect(LICK_KEYS).toContain(k);
    expect(reviewKey(l, '2026-11-11', k)).not.toBe(k);
  });
  it('a transcribed phrase becomes an own lick that is valid to drill', () => {
    const own = lickFromPhrase('own-1', { en: 'Mine', he: 'שלי' }, 7, [{ midi: 71, beat: 0, dur: 0.5 }, { midi: 74, beat: 0.5, dur: 0.5 }, { midi: 67, beat: 1, dur: 1 }], [[0, 'maj7', 4]]);
    expect(own.notes.map((n) => n[0])).toEqual([4, 7, 0]);
    expect(lickDrill(own, 2).notes.map((n) => n.pitch % 12)).toEqual([6, 9, 2]);
  });
});

describe('use it: finding the lick in an improvisation', () => {
  const l = LICKS.find((x) => x.id === 'maj-arp')!;
  const { spans, text, beats } = useItChart(l, 0);
  const chordOf = (b: number) => spans.find((s) => b >= s.at && b < s.at + s.beats)!;
  /** The lick played at a key / beat offset into an improvisation of noodling around it. */
  const play = (key: number, at: number, octave = 0): ImpNote[] => lickPitches(l, key).map((p, i) => ({ midi: p + 12 * octave, beat: at + l.notes[i][1] }));
  const noodle = (from: number, to: number): ImpNote[] => Array.from({ length: Math.round((to - from) * 2) }, (_, i) => ({ beat: from + i / 2, midi: 62 + ((i * 5) % 9) }));

  it('the challenge chart cycles the lick through four keys a whole step apart', () => {
    expect(parseChart(text).errors).toEqual([]);
    expect(beats).toBe(48);
    expect(chordOf(12)).toMatchObject({ root: 0, q: 'm7' });
    expect(chordOf(0)).toMatchObject({ root: 2, q: 'm7' });
    expect(chordOf(16)).toMatchObject({ root: 5, q: '7' });
  });
  it('finds the exact lick transposed, over the right chords', () => {
    const imp = [...play(0, 0), ...noodle(12, 24), ...play(8, 24), ...noodle(36, 48)];
    const hits = findLick(l, imp, spans);
    const good = hits.filter((h) => h.overChord);
    expect(good.map((h) => [h.beat, h.transpose, h.kind])).toEqual([[0, 0, 'exact'], [24, 8, 'exact']]);
    expect(useItPassed(hits).ok).toBe(true);
  });
  it('the same lick over the wrong chord does not count', () => {
    // C-key lick played while the band is in B♭ (bars 4–6).
    const hits = findLick(l, [...noodle(0, 12), ...play(0, 12)], spans);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => !h.overChord)).toBe(true);
    expect(useItPassed(hits).ok).toBe(false);
  });
  it('an octave up or one wrong note still counts; its rhythm and contour count as its shape', () => {
    const up = play(10, 12, 1);
    expect(findLick(l, up, spans)[0]).toMatchObject({ kind: 'exact', overChord: true });
    const slip = play(10, 12).map((n, i) => (i === 3 ? { ...n, midi: n.midi + 1 } : n));
    expect(findLick(l, slip, spans)[0]).toMatchObject({ kind: 'exact', overChord: true });
    const shape = play(10, 12).map((n, i) => ({ ...n, midi: n.midi + (i % 2 && i < 8 ? (n.midi > 60 ? 1 : -1) * 0 + (i === 1 ? 1 : i === 5 ? -1 : 0) : 0) }));
    const h = findLick(l, shape, spans);
    expect(h.length).toBeGreaterThan(0);
  });
  it('random noodling finds nothing', () => {
    expect(findLick(l, noodle(0, 48), spans).filter((h) => h.overChord && h.kind === 'exact')).toEqual([]);
  });
  it('chart qualities map back to lick families', () => {
    expect(qualityOfIntervals(parseChord('Dm7')!.iv)).toBe('m7');
    expect(qualityOfIntervals(parseChord('G7')!.iv)).toBe('7');
    expect(qualityOfIntervals(parseChord('Cmaj7')!.iv)).toBe('maj7');
    expect(qualityOfIntervals(parseChord('Bm7b5')!.iv)).toBe('hd7');
    expect(qualityOfIntervals(parseChord('G7alt')!.iv)).toBe('alt');
  });
  it('chordAt follows the chord lengths', () => {
    expect(chordAt(l.chords, 0)).toBe(0);
    expect(chordAt(l.chords, 4)).toBe(1);
    expect(chordAt(l.chords, 99)).toBe(2);
  });
});
