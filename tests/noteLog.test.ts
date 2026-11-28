// SPEC-FINGERING F1 (owner 2026-11-28): the per-note log of a MIDI keys take (trace v3) — compact parallel arrays, the
// crossing class from the expected fingering at the right note, MIDI keys takes only, never a not-comparable take.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import type { Drill, DrillSpec, NoteResult, TakeMetrics } from '../src/engine/drills/types';
import { NOTE_LOG_MAX, takeTrace, type TakeTrace } from '../src/engine/drills/tendency';
import { unsent } from '../src/cloud/calibUpload';
import { trimNoteLogs } from '../src/storage/takeTraces';

const scale = (key: number, octaves = 2) => generate({ family: 'scales', kind: 'scale', key, hands: 'RL', octaves } as DrillSpec) as Drill;
const MPB = 300;

/** A synthetic take: every note on the grid + `dev(i)`, released at 90 % of its written length; `miss` notes unplayed. */
function take(d: Drill, o: { dev?: (i: number) => number; miss?: number[]; wrong?: number } = {}): TakeMetrics {
  const perNote: NoteResult[] = d.notes.map((n, i) => {
    if (o.miss?.includes(i)) return { exp: n, played: null, dev: null, ok: false } as NoteResult;
    const dev = (o.dev?.(i) ?? 0) + ((i * 7) % 5) - 2;
    const on = n.beat * MPB + dev;
    const pitch = o.wrong === i ? n.pitch + 1 : n.pitch;
    return { exp: n, played: { pitch, on, off: on + MPB * n.dur * 0.9, vel: 60 + (i % 9) }, dev, ok: o.wrong !== i } as NoteResult;
  });
  return { verdict: 'clean', perNote } as unknown as TakeMetrics;
}
const at = '2026-11-28T10:00:00Z';
const tr = (d: Drill, m: TakeMetrics, extra: Partial<Parameters<typeof takeTrace>[2]> = {}) => takeTrace(d, m, { at, src: 'midi', kind: 'normal', ...extra })!;

describe('the per-note log (trace v3)', () => {
  const d = scale(0);
  const t = tr(d, take(d));

  it('is version 3, one entry per written note of a hand, in parallel arrays', () => {
    expect(t.v).toBe(3);
    const nl = t.nl!;
    const n = d.notes.filter((x) => x.hand === 'R' || x.hand === 'L').length;
    expect(nl.h.length).toBe(n);
    for (const k of ['b', 'e', 'p', 'd', 'v', 'o'] as const) expect(nl[k].length).toBe(n);
    expect(nl.x.length).toBe(n);
    expect(nl.f.length).toBe(n);
    expect(nl.e[0]).toBe(d.notes[0].pitch);
    expect(nl.b[1]).toBe(Math.round(d.notes[1].beat * 12));
    expect(nl.p.every((x) => x === 0)).toBe(true);
    expect(nl.v.every((x) => x >= 60 && x <= 68)).toBe(true);
  });

  it('stays within about 2 KB for a two-octave hands-together scale', () => {
    const size = JSON.stringify(t.nl).length;
    expect(size).toBeGreaterThan(500);
    expect(size).toBeLessThan(2048);
  });

  it('caps a long take at NOTE_LOG_MAX notes (~2.3 KB at most)', () => {
    const big = scale(0, 4);
    const nl = tr(big, take(big)).nl!;
    expect(big.notes.length).toBeGreaterThan(NOTE_LOG_MAX);
    expect(nl.h.length).toBe(NOTE_LOG_MAX);
    expect(JSON.stringify(nl).length).toBeLessThan(2400);
  });

  it('marks the suggested thumb-under at the right note (C major RH: F after 3) and the residual is take-relative', () => {
    const nl = t.nl!;
    const firstU = [...nl.x].findIndex((c, i) => c === 'u' && nl.h[i] === 'R');
    expect(firstU).toBeGreaterThan(0);
    expect(nl.e[firstU] % 12).toBe(5); // F
    expect(d.notes[firstU].finger).toBe(1);
    expect(nl.f[firstU]).toBe('1');
    // a crossing over the thumb in the left hand going up (3 over 1)
    expect([...nl.x].some((c, i) => c === 'o' && nl.h[i] === 'L')).toBe(true);
    // a late crossing shows at that index only, against the take's lead
    const late = tr(d, take(d, { dev: (i) => (i === firstU ? 40 : 0) })).nl!;
    expect(late.d[firstU]! - late.d[firstU - 1]!).toBeGreaterThan(30);
    expect(late.d.reduce<number>((a, x) => a + (x ?? 0), 0) / late.d.length).toBeCloseTo(0, 0);
  });

  it("follows the player's own numbers, and names no crossing when own fingering has no numbers", () => {
    const own = d.notes.map((n) => n.finger ?? 0);
    // move the right hand's first thumb-under one note later (E 3, F 4, G 1): a different crossing point
    const rIdx = d.notes.map((n, i) => (n.hand === 'R' ? i : -1)).filter((i) => i >= 0);
    const firstU = [...t.nl!.x].findIndex((c, i) => c === 'u' && t.nl!.h[i] === 'R');
    const k = rIdx.indexOf(firstU);
    own[rIdx[k - 1]] = 3;
    own[firstU] = 4;
    own[rIdx[k + 1]] = 1;
    const mine = tr(d, take(d), { ownFingering: true, ownFingers: own }).nl!;
    expect(mine.x[firstU]).not.toBe('u');
    expect(mine.x[rIdx[k + 1]]).toBe('u');
    expect(mine.f[firstU]).toBe('4');
    const none = tr(d, take(d), { ownFingering: true }).nl!;
    expect(/[uo]/.test(none.x)).toBe(false);
    expect(/^0+$/.test(none.f)).toBe(true);
  });

  it('logs a missed note as null / 0, a wrong key as its offset, and the release against the next note', () => {
    const m = tr(d, take(d, { miss: [5], wrong: 9 })).nl!;
    expect(m.p[5]).toBeNull();
    expect(m.d[5]).toBeNull();
    expect(m.v[5]).toBe(0);
    expect(m.p[9]).toBe(1);
    // released at 90 % of an eighth: a gap of about 30 ms before the next note of the hand
    const i = 12;
    expect(m.o[i]).not.toBeNull();
    expect(m.o[i]!).toBeLessThan(0);
    expect(m.o[i]!).toBeGreaterThan(-60);
  });

  it('only on MIDI keys takes: never a microphone, guitar / bass or not-comparable take', () => {
    expect(tr(d, take(d), { src: 'mic' }).nl).toBeUndefined();
    expect(tr(d, take(d), { piano: false }).nl).toBeUndefined();
    const nc = tr(d, take(d), { nc: true });
    expect(nc.nl).toBeUndefined();
    // and the calibration upload leaves a not-comparable take out, as before
    const ok = tr(d, take(d));
    expect(unsent([nc, { ...ok, at: '2026-11-28T10:01:00Z' }], '').map((x) => x.at)).toEqual(['2026-11-28T10:01:00Z']);
  });

  it('keeps the per-note log only on the newest traces on the device', () => {
    const list: TakeTrace[] = Array.from({ length: 6 }, (_, k) => ({ ...t, at: `2026-11-28T10:0${k}:00Z` }));
    const out = trimNoteLogs(list, 2);
    expect(out.map((x) => !!x.nl)).toEqual([false, false, false, false, true, true]);
    expect(out[0].R).toEqual(t.R);
    expect(trimNoteLogs(list, 10)).toBe(list);
  });
});
