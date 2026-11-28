// Piano tendency P1 calibrated on the owner's labelled sessions (2026-11-27/28): C, E♭ and D played normally; G with a
// deliberate rush on the way down; B♭ with a deliberate hesitation on the top note. The top-note hesitation flag must
// name B♭ only; no rush flag comes from `dir`; the descent's IOI slope is recorded (v2) without a flag; timing against the
// click is compared within the session only.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import type { Drill, DrillSpec, NoteResult, TakeMetrics } from '../src/engine/drills/types';
import { descentRelative, HESITATION_LINE, sessionRelativeLead, sessionTendency, takeTrace, topHesitation, topNoteStats, type TakeTrace } from '../src/engine/drills/tendency';

/** The sessions' aggregates over their MIDI takes (top-note class mean ms and the takes with a top measure, per hand;
 *  the share of those takes above 20 ms) — the numbers of the calibration table. */
const SESSIONS = [
  { key: 'C', pc: 0, R: { n: 17, mean: 0.4, share: 0 }, L: { n: 16, mean: 13.1, share: 0.38 } },
  { key: 'E♭', pc: 3, R: { n: 16, mean: 1.0, share: 0 }, L: { n: 12, mean: 2.3, share: 0.08 } },
  { key: 'D', pc: 2, R: { n: 23, mean: 14.8, share: 0.17 }, L: { n: 19, mean: 9.0, share: 0.11 } },
  { key: 'G', pc: 7, R: { n: 16, mean: 12.6, share: 0.19 }, L: { n: 16, mean: 9.6, share: 0.19 } },
  { key: 'B♭', pc: 10, R: { n: 21, mean: 31.9, share: 0.76 }, L: { n: 25, mean: 26.5, share: 0.56 } },
];

/** n top-note values with the given mean and share above 20 ms. */
function values(n: number, mean: number, share: number): number[] {
  const k = Math.round(share * n);
  if (!k) return Array.from({ length: n }, () => mean);
  let above = 25;
  let below = (n * mean - above * k) / (n - k);
  if (below > 20 || n === k) {
    below = 10;
    above = (n * mean - below * (n - k)) / k;
  }
  return Array.from({ length: n }, (_, i) => (i < k ? above : below));
}

const hand = (top: number | undefined) => ({ n: 28, sd: 9, cls: top === undefined ? {} : { top: [top, 1] as [number, number] }, dir: 0 });

/** One session's traces: as many takes as the larger hand's count, each hand's top measure while it lasts. */
function sessionTraces(s: (typeof SESSIONS)[number]): TakeTrace[] {
  const r = values(s.R.n, s.R.mean, s.R.share);
  const l = values(s.L.n, s.L.mean, s.L.share);
  return Array.from({ length: Math.max(r.length, l.length) }, (_, i) => ({
    v: 2,
    id: `scales:scale:${s.pc}:RL:o2`,
    fam: 'scales',
    at: `2026-11-27T10:${String(i).padStart(2, '0')}:00Z`,
    bpm: 66,
    ioi: 227,
    src: 'midi',
    kind: 'normal',
    verdict: 'clean',
    lead: -20,
    drift: null,
    R: hand(r[i]),
    L: hand(l[i]),
  })) as TakeTrace[];
}

describe('top-note hesitation (calibrated on the five labelled sessions)', () => {
  it('the generated sessions reproduce the calibration table', () => {
    for (const s of SESSIONS) {
      const st = topNoteStats(sessionTraces(s));
      for (const h of ['R', 'L'] as const) {
        const x = st.find((y) => y.hand === h)!;
        expect(x.takes).toBe(s[h].n);
        expect(x.mean).toBeCloseTo(s[h].mean, 0);
        expect(Math.abs(x.share - s[h].share)).toBeLessThan(0.04);
      }
    }
  });

  it('only B♭ is flagged (both hands), the normal and the rush sessions are not', () => {
    const flagged = SESSIONS.filter((s) => topHesitation(sessionTraces(s)) !== null).map((s) => s.key);
    expect(flagged).toEqual(['B♭']);
    const bb = topHesitation(sessionTraces(SESSIONS[4]))!;
    expect(bb.cell).toBe('hes:top');
    expect(bb.line).toEqual(HESITATION_LINE);
    // and it is the session's coach line
    expect(sessionTendency(sessionTraces(SESSIONS[4])).top?.cell).toBe('hes:top');
    for (const s of SESSIONS.slice(0, 4)) expect(sessionTendency(sessionTraces(s)).top?.cell ?? 'none').not.toMatch(/^hes|:top$/);
  });

  it('per hand: one hand over the rule names that hand', () => {
    const ts = sessionTraces({ ...SESSIONS[4], L: { n: 25, mean: 9, share: 0.1 } });
    expect(topHesitation(ts)?.cell).toBe('hes:R:top');
  });

  it('needs ≥ 8 MIDI takes of the cell; mic, not-comparable and other cells never count', () => {
    const bb = sessionTraces(SESSIONS[4]);
    expect(topHesitation(bb.slice(0, 7))).toBeNull();
    expect(topHesitation(bb.slice(0, 7).concat(bb.slice(7).map((t) => ({ ...t, src: 'mic' as const }))))).toBeNull();
    expect(topHesitation(bb.slice(0, 7).concat(bb.slice(7).map((t) => ({ ...t, nc: true }))))).toBeNull();
    expect(topHesitation(bb.slice(0, 7).concat(bb.slice(7, 14).map((t) => ({ ...t, id: 'scales:scale:3:RL:o2' }))))).toBeNull();
  });

  it('the share is strict: 55 % exactly is not enough', () => {
    const ts = sessionTraces({ key: 'x', pc: 5, R: { n: 20, mean: 30, share: 0.55 }, L: { n: 20, mean: 5, share: 0 } });
    expect(topHesitation(ts)).toBeNull();
  });
});

// ── v2: the descent's IOI slope ──
const scale = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'RL', octaves: 2 } as DrillSpec) as Drill;

/** A take with the descending runs' intervals shrinking by `rush` ms per note (a rush) and a top-note delay. */
function take(o: { rush?: number; top?: number; mpb?: number }): TakeMetrics {
  const mpb = o.mpb ?? 300;
  const byHand: Record<string, Drill['notes']> = {};
  for (const n of scale.notes) (byHand[n.hand] ??= []).push(n);
  const perNote: NoteResult[] = [];
  for (const ns of Object.values(byHand)) {
    const topPitch = Math.max(...ns.map((n) => n.pitch));
    let shift = 0;
    let k = 0;
    ns.forEach((n, i) => {
      const down = i > 0 && n.pitch < ns[i - 1].pitch;
      if (down) {
        k += 1;
        shift -= (o.rush ?? 0) * k; // each interval shorter than the last
      } else k = 0;
      const dev = shift + (n.pitch === topPitch ? (o.top ?? 0) : 0);
      const on = n.beat * mpb + dev;
      perNote.push({ exp: n, played: { pitch: n.pitch, on, off: on + 100, vel: 70 }, dev, ok: true } as NoteResult);
    });
  }
  return { verdict: 'clean', perNote } as unknown as TakeMetrics;
}
const tr = (m: TakeMetrics) => takeTrace(scale, m, { at: '2026-11-28T08:00:00Z', src: 'midi', kind: 'normal' })!;

describe('v2 trace: the descent slope (recorded, never flagged)', () => {
  it('the trace carries the descent (version 2 and later; 3 adds the per-note log) and an even take has a flat descent', () => {
    const t = tr(take({}));
    expect(t.v).toBe(3);
    expect(t.R?.desc).toBeDefined();
    expect(Math.abs(t.R!.desc![0])).toBeLessThan(0.5);
  });
  it('a gradual shortening on the way down is a negative slope; a top-note delay alone is not a rush', () => {
    const rush = tr(take({ rush: 2 }));
    expect(rush.R!.desc![0]).toBeLessThan(-1);
    const hes = tr(take({ top: 40 }));
    expect(Math.abs(hes.R!.desc![0])).toBeLessThan(0.5);
  });
  it('relative to the session\'s own median interval; no tendency line comes from it', () => {
    const ts = [tr(take({ rush: 2 })), tr(take({ rush: 2, mpb: 300 })), tr(take({}))];
    const rel = descentRelative(ts);
    expect(rel[0].R!).toBeLessThan(0);
    expect(rel[0].R!).toBeCloseTo((ts[0].R!.desc![0] / ts[0].ioi) * 100, 0);
    const many = Array.from({ length: 12 }, () => tr(take({ rush: 2 })));
    expect(sessionTendency(many).top?.cell ?? 'none').not.toMatch(/desc/);
  });
});

describe('session-relative timing (the lead moves by session, not by key)', () => {
  it('each take against the session median, never absolute', () => {
    const t = (lead: number | null) => ({ lead }) as TakeTrace;
    expect(sessionRelativeLead([t(-40), t(-47), t(-44), t(null)])).toEqual([4, -3, 0, null]);
    // two sessions with very different absolute leads read the same relative pattern
    expect(sessionRelativeLead([t(-4), t(-11), t(-8)])).toEqual(sessionRelativeLead([t(-40), t(-47), t(-44)]));
  });
});
