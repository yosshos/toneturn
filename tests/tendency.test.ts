// SPEC-PRACTICE-INTELLIGENCE §2, §9 (P1): the take's tendencies against synthetic takes — a clean player gets no line,
// injected effects are found, a constant latency never moves the position tendencies.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import type { Drill, DrillSpec, NoteResult, TakeMetrics } from '../src/engine/drills/types';
import { sessionTendency, takeTrace, type TakeTrace } from '../src/engine/drills/tendency';
import { emptyModel, addTake, findings } from '../src/engine/analysis/model';

const scaleIn = (key: number, extra: Partial<DrillSpec> = {}) => generate({ family: 'scales', kind: 'scale', key, hands: 'RL', octaves: 2, ...extra } as DrillSpec) as Drill;
const drill = scaleIn(0);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

/** A synthetic take: per-note offset = bias + effect(note) + per-take random + note noise (ms). */
function take(seed: number, o: { msPerBeat?: number; noise?: number; bias?: number; effect?: (n: Drill['notes'][number], i: number, down: boolean) => number; d?: Drill } = {}): TakeMetrics {
  const dr = o.d ?? drill;
  const r = rng(seed);
  const mpb = o.msPerBeat ?? 300;
  const takeRand = gauss(r) * 4;
  const prevByHand: Record<string, number> = {};
  const perNote: NoteResult[] = dr.notes.map((n, i) => {
    const prev = prevByHand[n.hand];
    prevByHand[n.hand] = n.pitch;
    const down = prev !== undefined && n.pitch < prev;
    const dev = (o.bias ?? 0) + takeRand + (o.effect?.(n, i, down) ?? 0) + gauss(r) * (o.noise ?? 8);
    const on = n.beat * mpb + dev;
    return { exp: n, played: { pitch: n.pitch, on, off: on + mpb * n.dur * 0.9, vel: Math.round(70 + gauss(r) * 4) }, dev, ok: true } as NoteResult;
  });
  return { verdict: 'clean', perNote } as unknown as TakeMetrics;
}
const trace = (m: TakeMetrics, d: Drill = drill) => takeTrace(d, m, { at: '2026-11-27T10:00:00Z', src: 'midi', kind: 'normal' })!;

describe('takeTrace', () => {
  it('builds a compact record with both hands, classes and direction', () => {
    const t = trace(take(1));
    expect(t.R && t.L).toBeTruthy();
    expect(t.ioi).toBeGreaterThan(100);
    expect(Object.keys(t.R!.cls).length).toBeGreaterThan(1);
    expect(JSON.stringify(t).length).toBeLessThan(700);
  });

  it('a constant latency / lead of 40 ms moves only the global lead, never the position tendencies', () => {
    const a = trace(take(7));
    const b = trace(take(7, { bias: 40 }));
    expect(b.lead! - a.lead!).toBeCloseTo(40, 0);
    for (const h of ['R', 'L'] as const) {
      for (const c of Object.keys(a[h]!.cls) as import('../src/engine/drills/tendency').Cls[]) expect(b[h]!.cls[c]![0]).toBeCloseTo(a[h]!.cls[c]![0], 0);
      expect(b[h]!.dir ?? 0).toBeCloseTo(a[h]!.dir ?? 0, 0);
    }
    expect(b.drift ?? 0).toBeCloseTo(a.drift ?? 0, 0);
  });

  it('a late top note is found in its class', () => {
    const t = trace(take(3, { noise: 3, effect: (n) => (drill.notes.filter((x) => x.hand === n.hand).reduce((m, x) => Math.max(m, x.pitch), 0) === n.pitch ? 30 : 0) }));
    expect(t.R!.cls.top?.[0] ?? 0).toBeGreaterThan(15);
  });
});

describe('sessionTendency (§2.3)', () => {
  it('a clean player at amateur noise (15 ms per note), over 6 keys: "nothing consistent" in ≥ 95 % of 240 sessions', () => {
    let alarms = 0;
    const keys = [0, 2, 4, 7, 9, 10];
    for (let s = 0; s < 240; s++) {
      const d = scaleIn(keys[s % keys.length]);
      const ts: TakeTrace[] = Array.from({ length: 12 }, (_, k) => trace(take(s * 100 + k, { d, noise: 15 }), d));
      const r = sessionTendency(ts);
      expect(r.enough).toBe(true);
      if (r.top) alarms++;
    }
    expect(alarms / 240).toBeLessThan(0.05);
  });

  it('a swung scale played exactly on its swing: no "rushing" line (review B1)', () => {
    const d = scaleIn(0, { swing: true } as Partial<DrillSpec>);
    const mpb = 300;
    const ts: TakeTrace[] = [];
    for (let k = 0; k < 12; k++) {
      const m = take(300 + k, { d, noise: 8, msPerBeat: mpb });
      // the swung grid: off-beat eighths at 2/3 of the beat; dev stays against that grid
      for (const r of m.perNote) {
        const frac = r.exp.beat - Math.floor(r.exp.beat);
        if (Math.abs(frac - 0.5) < 1e-6) r.played!.on += mpb / 6;
      }
      const t = takeTrace(d, m, { at: '2026-11-27T10:00:00Z', src: 'midi', kind: 'normal' });
      if (t) ts.push(t);
    }
    const r = sessionTendency(ts);
    expect(r.top?.cell ?? 'none').not.toMatch(/^dir:|^cls:/);
    expect(ts.every((t) => t.swing)).toBe(true);
  });

  it('rushing on the way down is named', () => {
    // descending notes come progressively earlier: each step 6 % short (an interval effect)
    const ts: TakeTrace[] = [];
    for (let k = 0; k < 12; k++) {
      const m = take(500 + k, { noise: 5 });
      // shorten descending intervals: shift each descending note earlier by a growing amount within its run
      let shift = 0;
      const prev: Record<string, number> = {};
      for (const r of m.perNote) {
        const p = prev[r.exp.hand];
        prev[r.exp.hand] = r.exp.pitch;
        if (p !== undefined && r.exp.pitch < p) shift -= 18;
        else shift = 0;
        r.dev! += shift;
        r.played!.on += shift;
      }
      ts.push(trace(m));
    }
    const r = sessionTendency(ts);
    expect(r.top?.cell).toMatch(/^dir:/);
    expect(r.top?.line.en).toMatch(/way down/);
    expect(r.top?.line.he).toMatch(/הירידה יוצאת קצת מהירה/);
  });

  it('§9 acceptance (calibrated to the false-alarm guard): a 25 ms late thumb-under is named in ≥ 80 % of 50 sessions of 12 takes', () => {
    let found = 0;
    for (let k = 0; k < 50; k++) {
      const ts: TakeTrace[] = [];
      for (let j = 0; j < 12; j++) {
        const m = take(7000 + k * 50 + j, {
          effect: (n, i) => {
            const prev = drill.notes.slice(0, i).reverse().find((x) => x.hand === n.hand);
            const up = prev ? n.pitch > prev.pitch : true;
            const out = n.hand === 'R' ? up : !up;
            return prev && n.finger === 1 && (prev.finger === 3 || prev.finger === 4) && out ? 25 : 0;
          },
        });
        ts.push(trace(m));
      }
      const r = sessionTendency(ts);
      if (r.top && /:xu$/.test(r.top.cell)) found++;
    }
    expect(found / 50).toBeGreaterThanOrEqual(0.8);
  });

  it('review round 2: a late first note (+50 ms after the count-in) and a lengthened ending are not tendencies', () => {
    let alarms = 0;
    for (let k = 0; k < 120; k++) {
      const d = scaleIn([0, 2, 7][k % 3], k % 2 ? { hands: 'R' } as Partial<DrillSpec> : {});
      const ts: TakeTrace[] = [];
      for (let j = 0; j < 12; j++) {
        const m = take(20000 + k * 50 + j, { d, noise: 15 });
        const byHand: Record<string, NoteResult[]> = {};
        for (const r of m.perNote) (byHand[r.exp.hand] ??= []).push(r);
        for (const rs of Object.values(byHand)) {
          rs.sort((a, b) => a.exp.beat - b.exp.beat);
          const bump = (r: NoteResult, ms: number) => ((r.dev! += ms), (r.played!.on += ms));
          bump(rs[0], 50);
          const n = rs.length;
          bump(rs[n - 1], 50);
          bump(rs[n - 2], 25);
          bump(rs[n - 3], 10);
        }
        ts.push(trace(m, d));
      }
      if (sessionTendency(ts).top) alarms++;
    }
    expect(alarms / 120).toBeLessThan(0.05);
  });

  it('two hands at 20–25 ms noise: false alarms stay under 5 % (review round 2)', () => {
    let alarms = 0;
    for (let k = 0; k < 200; k++) {
      const d = scaleIn(k % 12);
      const ts = Array.from({ length: 12 }, (_, j) => trace(take(40000 + k * 50 + j, { d, noise: k % 2 ? 20 : 25 }), d));
      if (sessionTendency(ts).top) alarms++;
    }
    expect(alarms / 200).toBeLessThan(0.05);
  });

  it('review round 3: a dotted / grouped scale is not read as position tendencies', () => {
    for (const variant of ['dotted', 'groups3', 'accent-shift'] as const) {
      const d = scaleIn(0, { variant } as Partial<DrillSpec>);
      const t = trace(take(77, { d }), d);
      expect(Object.keys(t.R?.cls ?? {})).toHaveLength(0);
      expect(t.R?.dir ?? null).toBeNull();
    }
  });

  it('review round 3: a ritardando over the last two beats (five eighths) is not a tendency', () => {
    let alarms = 0;
    let hes = 0;
    for (let k = 0; k < 120; k++) {
      const d = scaleIn([0, 5, 9][k % 3]);
      const ts: TakeTrace[] = [];
      for (let j = 0; j < 12; j++) {
        const m = take(60000 + k * 50 + j, { d, noise: 20 });
        const byHand: Record<string, NoteResult[]> = {};
        for (const r of m.perNote) (byHand[r.exp.hand] ??= []).push(r);
        for (const rs of Object.values(byHand)) {
          rs.sort((a, b) => a.exp.beat - b.exp.beat);
          // each of the last five notes later by a growing amount (a slowing ending, ~2 beats)
          for (let q = 0; q < 5; q++) {
            const r = rs[rs.length - 5 + q];
            const ms = (q + 1) * (q + 2) * 2.5;
            r.dev! += ms;
            r.played!.on += ms;
          }
        }
        ts.push(trace(m, d));
      }
      const top = sessionTendency(ts).top;
      // the calibrated top-note hesitation (thresholds from the owner's sessions at 8-12 ms random timing) is counted
      // apart: the ritardando never touches the top note; at this player's 20 ms noise (twice the calibration's) it may
      // fire by chance
      if (top && top.cell.startsWith('hes')) hes++;
      else if (top) alarms++;
    }
    expect(alarms / 120).toBeLessThan(0.05);
    expect(hes).toBeLessThanOrEqual(2);
  });

  it('review round 3: rushing on the way down is never named a late top note', () => {
    let wrong = 0;
    for (let k = 0; k < 60; k++) {
      const ts: TakeTrace[] = [];
      for (let j = 0; j < 12; j++) {
        const m = take(80000 + k * 50 + j, { noise: 8 });
        let shift = 0;
        const prev: Record<string, number> = {};
        for (const r of m.perNote) {
          const pp = prev[r.exp.hand];
          prev[r.exp.hand] = r.exp.pitch;
          if (pp !== undefined && r.exp.pitch < pp) shift -= 12;
          else shift = 0;
          r.dev! += shift;
          r.played!.on += shift;
        }
        ts.push(trace(m));
      }
      const top = sessionTendency(ts).top;
      if (top && /:top$/.test(top.cell)) wrong++;
    }
    expect(wrong).toBe(0);
  });

  it('review round 3: takes that measured nothing never count — no "steady playing" from cadences', () => {
    const scale = Array.from({ length: 6 }, (_, k) => trace(take(90000 + k)));
    const blank = (t: TakeTrace): TakeTrace => ({ ...t, drift: null, sync: undefined, R: t.R && { ...t.R, cls: {}, dir: null }, L: t.L && { ...t.L, cls: {}, dir: null } });
    const ts = [...scale, ...scale.slice(0, 4).map(blank), ...scale.slice(0, 4).map(blank)];
    expect(sessionTendency(ts).enough).toBe(false);
  });

  // (two-octave triad arpeggios hold too few reference notes for a position measure — §15; three octaves and up do)
  const arpIn = (key: number, extra: Partial<DrillSpec>) => generate({ family: 'arpeggios', kind: 'arp-triad', key, hands: 'R', octaves: 3, ...extra } as DrillSpec) as Drill;
  const ARPS: Partial<DrillSpec>[] = [{}, { option: 1 }, { option: 2 }, { hands: 'L', option: 1 }, { hands: 'RL' }, { kind: 'arp-dom7' }, { kind: 'arp-m7' }];

  it('arpeggios (root, inversions, left hand, 7ths): the figure boundary is measured in every one', () => {
    for (const sp of ARPS) {
      const d = arpIn(0, sp);
      const t = trace(take(5, { d, noise: 3 }), d);
      const h = sp.hands === 'L' ? t.L : t.R;
      expect(h?.cls.oct ?? h?.cls.top, JSON.stringify(sp)).toBeTruthy();
    }
  });

  it('arpeggios: a clean player at 20 ms noise — false alarms under 5 %', () => {
    let alarms = 0;
    for (let k = 0; k < 210; k++) {
      const d = arpIn(k % 12, ARPS[k % ARPS.length]);
      const ts = Array.from({ length: 12 }, (_, j) => trace(take(120000 + k * 50 + j, { d, noise: 20 }), d));
      if (sessionTendency(ts).top) alarms++;
    }
    expect(alarms / 210).toBeLessThan(0.05);
  });

  it('arpeggios: a late start of each figure (+30 ms) is named as that place (the octave change, or the top note when the figure starts there), never as a finger', () => {
    let named = 0;
    for (let k = 0; k < 40; k++) {
      const d = arpIn(k % 12, { option: k % 3 });
      const first = d.notes.find((n) => n.hand === 'R')!.pitch % 12;
      const ts = Array.from({ length: 12 }, (_, j) => trace(take(130000 + k * 50 + j, { d, noise: 12, effect: (n) => (((n.pitch % 12) + 12) % 12 === first ? 30 : 0) }), d));
      const top = sessionTendency(ts).top;
      if (top && /:(oct|top|bot)$/.test(top.cell)) named++;
      if (top) expect(top.line.en).not.toMatch(/thumb|finger/i);
    }
    expect(named / 40).toBeGreaterThanOrEqual(0.7);
  });

  it('review round 4: a slight long-short lilt (off-beats 15 ms late) is not read as a position', () => {
    let alarms = 0;
    for (let k = 0; k < 120; k++) {
      const d = k % 2 ? scaleIn(k % 12) : arpIn(k % 12, {});
      const ts = Array.from({ length: 12 }, (_, j) => trace(take(140000 + k * 50 + j, { d, noise: 15, effect: (n) => (Math.abs(n.beat - Math.floor(n.beat) - 0.5) < 1e-6 ? 15 : 0) }), d));
      const top = sessionTendency(ts).top;
      if (top && top.cell.startsWith('cls:')) alarms++;
    }
    expect(alarms / 120).toBeLessThan(0.05);
  });

  it('review round 4: slowing 8 % across a 4-octave scale is never named a late top note', () => {
    let wrong = 0;
    for (let k = 0; k < 60; k++) {
      const d = scaleIn(k % 12, { octaves: 4 } as Partial<DrillSpec>);
      const span = Math.max(...d.notes.map((n) => n.beat));
      // a slowing tempo: the offset grows with the square of the time (8 % slower by the end)
      const ts = Array.from({ length: 12 }, (_, j) => trace(take(150000 + k * 50 + j, { d, noise: 20, effect: (n) => 0.04 * 300 * (n.beat * n.beat) / span }), d));
      const top = sessionTendency(ts).top;
      if (top && /:(top|bot)$/.test(top.cell)) wrong++;
    }
    expect(wrong / 60).toBeLessThan(0.05);
  });

  it('review round 4: a constant hand offset both ways reads without a direction', () => {
    const ts = Array.from({ length: 12 }, (_, j) => trace(take(160000 + j, { noise: 8, effect: (n) => (n.hand === 'R' ? 25 : 0) })));
    const top = sessionTendency(ts).top;
    expect(top?.cell).toBe('sync');
    expect(top?.line.en).toBe('The right hand is a little behind the left.');
  });

  it('review round 7: one consistently late scale note is never named as another place (≤ 5 %)', () => {
    let wrong = 0;
    for (let k = 0; k < 120; k++) {
      const d = scaleIn(k % 12);
      const pc = (((d.tonic?.key ?? k % 12) + [2, 4, 5, 9, 11][k % 5]) % 12 + 12) % 12;
      const ts = Array.from({ length: 12 }, (_, j) => trace(take(170000 + k * 50 + j, { d, noise: 15, effect: (n) => ((((n.pitch % 12) + 12) % 12) === pc ? 25 : 0) }), d));
      const top = sessionTendency(ts).top;
      if (top && top.cell.startsWith('cls:')) wrong++;
    }
    expect(wrong / 120).toBeLessThanOrEqual(0.05);
  });

  it('too few takes: no line at all', () => {
    expect(sessionTendency([trace(take(1)), trace(take(2))]).enough).toBe(false);
  });

  it('only eligible takes count: mic takes, challenges, cold opens and misses are left out', () => {
    const base = Array.from({ length: 12 }, (_, k) => trace(take(900 + k)));
    expect(sessionTendency(base.map((t) => ({ ...t, src: 'mic' as const }))).enough).toBe(false);
    expect(sessionTendency(base.map((t) => ({ ...t, kind: 'challenge' as const }))).enough).toBe(false);
    expect(sessionTendency(base.map((t) => ({ ...t, kind: 'retention' as const }))).enough).toBe(false);
    expect(sessionTendency(base.map((t) => ({ ...t, verdict: 'not' as const }))).enough).toBe(false);
  });
});

describe('the model counts takes, not notes (confidence fix)', () => {
  it('the take count is a window: it never grows past 60 takes (review rounds 2–3)', () => {
    let mdl = emptyModel();
    for (let k = 0; k < 120; k++) mdl = addTake(mdl, drill, take(k + 40), 80, '2026-11-27T10:00:00Z');
    expect(mdl.stats['h:R'].tk).toBe(60);
  });

  it('one long take with a soft note is not a finding; the same over many takes is', () => {
    const soft = (m: TakeMetrics) => {
      for (const r of m.perNote) if (r.exp.pitch % 12 === 4 && r.played) r.played.vel -= 25;
      return m;
    };
    let one = emptyModel();
    // one take repeated in a single fold would be many notes but one take: simulate with 1 take of the long scale
    one = addTake(one, drill, soft(take(1)), 80, '2026-11-27T10:00:00Z');
    expect(findings(one, 3).some((f) => f.kind === 'soft-note')).toBe(false);
    let many = emptyModel();
    for (let k = 0; k < 20; k++) many = addTake(many, drill, soft(take(k + 10)), 80, '2026-11-27T10:00:00Z');
    expect(findings(many, 3).some((f) => f.kind === 'soft-note')).toBe(true);
  });
});
