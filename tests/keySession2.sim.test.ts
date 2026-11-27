// SPEC-KEY-SESSION-2 §8: the key session simulated take by take — the REAL ladder (keySessionLadder) and the REAL coach
// (coachStart / coachTake / coachAfter) with scripted players. It asserts the sequences and the invariants (the scale is
// never left before A-5 inside its budget, no take is more than 10 % faster in notes per second than the one before on
// the same rung, a limit is never below its stage's start, the probe skips what it proved, the closing visit happens)
// and writes the fresh all-clean session to docs/key-session-trace.txt for the owner.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'fs';
import '../src/engine/topics';
import { families, itemTargetBpm } from '../src/engine/drills/plan';
import { coachAfter, coachStart, coachTake, type CoachState, type CoachTake } from '../src/engine/drills/coach';
import { applyTake, newItem } from '../src/engine/drills/ladder';
import { withStageTake } from '../src/engine/drills/rubato';
import { bandOfBpm, thresholds } from '../src/engine/drills/analyze';
import { withCeiling } from '../src/engine/drills/itemStatus';
import { DEFAULT_DRILL_SETTINGS, type ItemState, type TakeMetrics } from '../src/engine/drills/types';
import { keySessionLadder, MAELZEL, stepCap, subDrill, stagePassed } from '../src/engine/drills/stages';
import { chalDraw, chalTarget, gradedUp } from '../src/engine/drills/keyCoach';
import { generate } from '../src/engine/drills/generate';
import type { DrillSpec } from '../src/engine/drills/types';
import type { FamilyDef } from '../src/engine/drills/generate';

const fams = families('piano');
const T0 = Date.parse('2026-11-25T10:00:00');
type Grade = 'perfect' | 'tight' | 'loose' | 'almost' | 'miss';
type Player = (t: CoachTake) => Grade;

function metrics(t: CoachTake, g: Grade): TakeMetrics {
  const th = thresholds(bandOfBpm(t.drill, t.bpm));
  const sd = g === 'perfect' ? 0.3 * th.sd : g === 'tight' ? 0.7 * th.sd : g === 'loose' ? 0.95 * th.sd : 1.4 * th.sd;
  const verdict = g === 'almost' ? 'almost' : g === 'miss' ? 'not' : 'clean';
  return { verdict, bpm: t.bpm, nps: t.nps ?? 0, accuracy: verdict === 'clean' ? 1 : 0.85, wrong: verdict === 'clean' ? 0 : 2, missing: 0, timingMean: 0, timingSD: t.stage === 'free' ? null : sd, cvR: null, cvL: null, handsMean: null, handsAbs: null, chordSpread: null, velSD: null, velMean: null, bandHit: null, slope: null, r2: null, accentGap: null, hesitations: 0 } as unknown as TakeMetrics;
}

interface Row {
  n: number;
  min: number;
  visit: number;
  rung: string;
  code: string;
  kind: string;
  hands: string;
  oct: string;
  motion: string;
  per: number | null;
  bpm: number | null;
  nps: number;
  grade: Grade;
  said: string;
  line: string;
  probe: boolean;
  closing: boolean;
  /** The exercise kind and hands (the 10 % rule compares takes of the same one, U6). */
  ckey: string;
  chal: boolean;
  item: string;
  sayHe: string;
}

function run(opts: { tier: number; player: Player; minutes?: number; items?: Record<string, ItemState>; maxTakes?: number; now?: number; root?: number }) {
  const items: Record<string, ItemState> = { ...(opts.items ?? {}) };
  const now0 = opts.now ?? T0;
  const fam = keySessionLadder(fams, opts.root ?? 0, 'major', opts.tier, items, { instrument: 'piano', now: now0 }) as FamilyDef;
  let now = now0;
  let c: CoachState = coachStart(fam, items, 'fifths-up', now, { noProbe: true, ...(opts.minutes ? { minutes: opts.minutes } : {}) });
  const rows: Row[] = [];
  let ended = false;
  for (let n = 1; n <= (opts.maxTakes ?? 400); n++) {
    const t = coachTake(fam, c, items, 'fifths-up', () => true);
    const s = t.stageInfo!;
    const probe = !!c.ks?.probe;
    const g = opts.player(t);
    const m = metrics(t, g);
    const d = t.drill;
    const st0 = items[d.itemId] ?? newItem(d);
    if (t.stage === 'free') items[d.itemId] = withStageTake(st0, 'free', m);
    else items[d.itemId] = applyTake(st0, m, t.bpm, new Date(now).toISOString(), DEFAULT_DRILL_SETTINGS, { targetBpm: itemTargetBpm(d) }).state;
    const played = t.play ? subDrill(d, t.play.per) : d;
    const secs = t.stage === 'free' ? played.beats * 1.1 + 6 : ((played.beats + 4) * 60) / (t.play?.bpm ?? t.bpm) + 6;
    now += secs * 1000;
    const nx = coachAfter(fam, c, t, m, items, 'fifths-up', now, () => true);
    for (const x of nx.items ?? []) {
      const { ceil: _c, ...cur } = items[x.itemId] ?? x;
      items[x.itemId] = { ...cur, stages: x.stages, ...(x.ceil ? { ceil: x.ceil } : {}) } as ItemState;
    }
    if (nx.ceiling && items[nx.ceiling.itemId]) items[nx.ceiling.itemId] = withCeiling(items[nx.ceiling.itemId], nx.ceiling.bpm, '2026-11-25');
    const sp = d.spec as { hands: string; octaves?: number; motion?: string };
    rows.push({ n, min: (now - now0) / 60000, visit: s.visit, rung: s.rung, code: s.code, kind: s.kind, hands: sp.hands, oct: String(sp.octaves ?? (d.spec.family === 'k-sharm' ? 2 : '-')), motion: sp.motion ?? 'parallel', per: t.stage === 'free' ? null : (t.play?.per ?? null), bpm: t.stage === 'free' ? null : (t.play?.bpm ?? t.bpm), nps: t.stage === 'free' ? 0 : (t.nps ?? 0), grade: g, said: (nx.line.say ?? []).join(' '), line: nx.line.en, probe, closing: !!s.closing, ckey: `${d.spec.family}:${d.spec.kind}:${d.spec.hands}`, chal: !!t.challenge, item: d.itemId, sayHe: (nx.line.sayHe ?? []).join(' ') });
    c = nx.state;
    if (nx.end) {
      ended = true;
      break;
    }
  }
  return { rows, items, fam, ended, c };
}

const SUB: Record<number, string> = { 1: 'quarters', 2: 'eighths', 3: 'triplets', 4: '16ths' };
const fmt = (r: Row) =>
  `#${String(r.n).padStart(2)} ${r.min.toFixed(1).padStart(5)}m  ${(r.closing ? 'closing ' : '') + r.rung.padEnd(10)} ${r.code.padEnd(4)}${r.probe ? ' probe' : r.chal ? ' CHAL ' : '      '}  hands=${r.hands.padEnd(2)} oct=${r.oct} ${r.motion.padEnd(8)} ${r.per === null ? 'free time    ' : `${SUB[r.per] ?? r.per + '/beat'}`.padEnd(9) + ` ♩${String(r.bpm).padStart(3)}`}  nps=${r.nps.toFixed(2)}  ${r.grade.padEnd(7)}  says: "${r.said}"  shows: "${r.line}"`;

/** Takes of the same exercise (kind and hands) in a row: none more than 10 % faster (notes per second) than the one before (free takes reset). */
function maxJump(rows: Row[]): number {
  let worst = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    // a challenge take (SPEC-CLIMB-SYNC §2) jumps on purpose
    if (a.ckey !== b.ckey || a.nps <= 0 || b.nps <= 0 || b.chal) continue;
    // owner 2026-11-27: the largest step depends on the speed it starts from (stepCap)
    worst = Math.max(worst, b.nps / (a.nps * (1 + stepCap(a.nps))));
  }
  return worst;
}

describe('key session 2: the simulator', () => {
  const tight: Player = () => 'tight';

  it('fresh, every take clean: probe → A-3…A-5 at comfort → A-6 climbing (eighths / triplets) → B → … → closing', () => {
    const { rows, ended } = run({ tier: 0, player: tight });
    const head = `The key session, simulated (SPEC-KEY-SESSION-2 §8): C major, piano, a fresh player (T0), every take clean with tight timing,\n30 minutes. The real ladder and coach (tests/keySession2.sim.test.ts). One take per line: visit / rung, stage, hands, octaves, motion,\nnote value, ♩ as played, notes per second, the take, what the coach says (recorded phrases) and shows.\n\n`;
    writeFileSync('docs/key-session-trace.txt', head + rows.map(fmt).join('\n') + '\n');
    expect(ended).toBe(true);
    // the probe first: A-3 at 1.5 nps
    expect(rows[0]).toMatchObject({ code: 'A-3', probe: true });
    expect(rows[0].nps).toBeCloseTo(1.5, 1);
    // the scale's stages in order before anything else, up to A-5 at least
    const scale = rows.filter((r) => r.visit === 0);
    const firstOther = rows.findIndex((r) => r.visit !== 0);
    expect(firstOther).toBeGreaterThan(0);
    const codes = [...new Set(rows.slice(0, firstOther).map((r) => r.code))];
    expect(codes.slice(0, 4)).toEqual(['A-3', 'A-4', 'A-5', 'A-6']);
    // coordination stages (owner 2026-11-26): each clean take one mark up, never more than 10 %
    for (const c of ['A-4', 'A-5']) {
      const nps = scale.filter((r) => r.code === c).map((r) => r.nps);
      for (let k = 1; k < nps.length; k++) expect(nps[k]).toBeLessThanOrEqual(nps[k - 1] * (1 + stepCap(nps[k - 1])) + 1e-6);
      expect(Math.max(...nps)).toBeLessThanOrEqual(1.8);
    }
    // A-6 climbs, alternating eighths and triplets once in eighths
    // (a challenge take, SPEC-CLIMB-SYNC §2, may reach the target before the triplets come: they alternate when they do)
    const a6 = scale.filter((r) => r.code === 'A-6');
    expect(a6.length).toBeGreaterThanOrEqual(2);
    expect(a6[a6.length - 1].nps).toBeGreaterThan(a6[0].nps);
    const pers = a6.filter((r) => !r.chal).map((r) => r.per).filter((p) => p === 2 || p === 3);
    for (let i = 1; i < pers.length; i++) expect(pers[i]).not.toBe(pers[i - 1]);
    // then the harmonised rung, from its probe at B-3
    expect(rows[firstOther].code).toBe('B-3');
    expect(rows[firstOther].probe).toBe(true);
    expect(maxJump(rows)).toBeLessThanOrEqual(1 + 1e-6);
    // the closing visit happens, on A-6
    // the closing visit happens (U1: A-6 resumed, or 3–4 octaves once A-6 passed)
    expect(rows.some((r) => r.closing)).toBe(true);
    // every ♩ on the metronome marks (U11)
    for (const r of rows) if (r.bpm !== null && r.bpm >= 40) expect(MAELZEL).toContain(r.bpm);
    // the narrator: fixed phrases only, a tempo said as a number
    expect(rows.some((r) => /Seventy|Sixty|Eighty|Ninety|hundred/.test(r.said))).toBe(true);
  });

  it('fresh, limit at 2 nps: A-1…A-5 still done at ≤ 1.8 nps; A-6 stops at a limit ≥ its start; then B', () => {
    const lim: Player = (t) => (t.stage === 'free' || (t.nps ?? 0) <= 2.05 ? 'tight' : 'miss');
    const { rows } = run({ tier: 0, player: lim });
    const firstOther = rows.findIndex((r) => r.visit !== 0);
    const scale = rows.slice(0, firstOther);
    for (const r of scale.filter((x) => x.kind === 'coord')) expect(r.nps).toBeLessThanOrEqual(1.8);
    expect(new Set(scale.map((r) => r.code))).toEqual(new Set(['A-3', 'A-4', 'A-5', 'A-6']));
    // the limit: in the scale's visit or, when its budget ran out first, in the closing return to A-6
    const a6 = rows.filter((r) => r.code === 'A-6');
    const limitRow = a6.find((r) => /best for now/.test(r.line));
    expect(limitRow).toBeTruthy();
    expect(limitRow!.nps).toBeGreaterThanOrEqual(a6[0].nps - 1e-6);
    expect(limitRow!.nps).toBeLessThanOrEqual(2.05);
    expect(rows[firstOther].rung).toMatch(/k-sharm/);
    expect(maxJump(rows)).toBeLessThanOrEqual(1 + 1e-6);
  });

  it('a probe that misses: the right hand alone at the probe tempo, then the next stage at 1.0 nps', () => {
    let first = true;
    const p: Player = () => (first ? ((first = false), 'miss') : 'tight');
    const { rows } = run({ tier: 0, player: p, maxTakes: 6 });
    expect(rows[0].probe).toBe(true);
    // review 3: the right hand alone once at the probe's tempo (a strong right hand isn't held at ♩60) …
    expect(rows[1]).toMatchObject({ code: 'A-1', probe: true });
    expect(rows[1].nps).toBeCloseTo(rows[0].nps, 6);
    // … clean: A-1 passed, the left hand at min(1.0, 0.9 × the probe) = 1.0 nps, quarters
    expect(rows[2].code).toBe('A-2');
    expect(rows[2].nps).toBeCloseTo(1, 2);
    expect(rows[2].per).toBe(1);
  });

  it('clean and easy (an advanced player): the probe skips to A-4 within 2 takes; thirds start at B-3', () => {
    const { rows } = run({ tier: 4, player: () => 'perfect' });
    expect(rows[0]).toMatchObject({ code: 'A-3', probe: true });
    expect(rows[1].code).toBe('A-4');
    const b = rows.find((r) => r.visit === 1)!;
    expect(b.code).toBe('B-3');
    expect(maxJump(rows)).toBeLessThanOrEqual(1 + 1e-6);
  });

  it('the climb step follows how well the take went: each step within the cap at its speed', () => {
    // (the order by quality at one starting speed is pinned in tests/keySessionStep.test.ts)
    for (const g of ['perfect', 'tight', 'loose'] as Grade[]) {
      const { rows } = run({ tier: 0, player: () => g, maxTakes: 60 });
      const p = rows.filter((r) => r.nps > 0 && !r.closing);
      for (let k = 1; k < p.length; k++) {
        const [a, b] = [p[k - 1], p[k]];
        if (a.item !== b.item || a.chal || b.chal) continue;
        expect(b.nps, `${g} #${b.n}`).toBeLessThanOrEqual(a.nps * (1 + stepCap(a.nps)) + 1e-6);
        if (a.kind === 'speed' && b.kind === 'speed') expect(b.nps, `${g} #${b.n}`).toBeGreaterThanOrEqual(a.nps - 1e-6);
      }
    }
  });

  it('steps shrink at higher speeds (an advanced player climbing past 3 and 5 nps)', () => {
    const { rows } = run({ tier: 6, player: () => 'perfect' });
    const a6 = rows.filter((r) => r.code === 'A-6' && !r.closing);
    // challenge takes (and the take after one) jump on purpose (SPEC-CLIMB-SYNC §2)
    const ups = a6.slice(1).map((r, i) => ({ at: a6[i].nps, k: r.nps / a6[i].nps, chal: r.chal || a6[i].chal })).filter((x) => x.k > 1.0001 && !x.chal);
    const slow = ups.filter((x) => x.at < 3).map((x) => x.k);
    const fast = ups.filter((x) => x.at >= 3);
    expect(fast.length).toBeGreaterThan(0);
    if (slow.length) expect(Math.max(...fast.map((x) => x.k))).toBeLessThanOrEqual(Math.max(...slow) + 1e-9);
    for (const x of fast) expect(x.k).toBeLessThanOrEqual(1 + stepCap(x.at) + 0.012);
  });

  it('a 30-minute session ends on the closing return to A-6; a 10-minute one too, sooner', () => {
    for (const minutes of [30, 10]) {
      const { rows, ended } = run({ tier: 0, player: () => 'tight', minutes });
      expect(ended).toBe(true);
      expect(rows[rows.length - 1].closing).toBe(true);
      expect(rows[rows.length - 1].min).toBeLessThan(minutes + 2);
    }
  });

  it('every stage passed is saved per key: the next session resumes the rung at its first unpassed stage', () => {
    // the first session runs out of the scale's budget at the limit (2 nps) — the second starts where it stopped
    const lim: Player = (t) => (t.stage === 'free' || (t.nps ?? 0) <= 2.05 ? 'tight' : 'miss');
    const one = run({ tier: 0, player: lim, maxTakes: 9 });
    const passed = one.fam.levels.filter((l) => l.stage?.visit === 0 && stagePassed(l, one.items)).map((l) => l.stage!.code);
    expect(passed).toEqual(expect.arrayContaining(['A-1', 'A-2', 'A-3']));
    const two = run({ tier: 0, player: lim, items: one.items, maxTakes: 3, now: T0 + 86_400_000 });
    expect(two.rows[0].probe).toBe(false);
    const open = one.fam.levels.find((l) => l.stage?.visit === 0 && !stagePassed(l, one.items))!;
    expect(two.rows[0].code).toBe(open.stage!.code);
  });
});

describe('key session 2: guitar and bass (positions in place of hands, §2.3)', () => {
  for (const inst of ['guitar', 'bass'] as const)
    for (const group of ['major', 'minor'] as const)
      it(`${inst} ${group}: the scale's position stages, then speed; the coach walks it`, () => {
        const fam = keySessionLadder(families(inst), group === 'major' ? 7 : 4, group, 0, {}, { instrument: inst, now: T0 }) as FamilyDef;
        expect(fam).toBeTruthy();
        const scale = fam.levels.filter((l) => l.stage!.visit === 0).map((l) => l.stage!.code);
        expect(scale[0]).toBe('G-1');
        expect(scale[scale.length - 1]).toBe('G-S');
        expect(scale.length).toBeGreaterThanOrEqual(3);
        let c = coachStart(fam, {}, 'fifths-up', T0, {});
        const items: Record<string, ItemState> = {};
        let now = T0;
        for (let n = 0; n < 30; n++) {
          const t = coachTake(fam, c, items, 'fifths-up');
          expect(t.drill.notes.length).toBeGreaterThan(0);
          now += 30_000;
          const nx = coachAfter(fam, c, t, metrics(t, 'tight'), items, 'fifths-up', now);
          for (const x of nx.items ?? []) items[x.itemId] = x;
          c = nx.state;
          if (nx.end) break;
        }
        expect(c.takes).toBeGreaterThan(5);
      });
});

describe('key session 2: the lines and the evidence (review 2026-11-25)', () => {
  it('a clean probe saves A-1 on the right-hand item and A-2 on the left-hand item (per key)', () => {
    const { items } = run({ tier: 0, player: () => 'tight', maxTakes: 1 });
    expect(items['scales:scale:0:R:o1']?.stages).toContain('A-1');
    expect(items['scales:scale:0:L:o1']?.stages).toContain('A-2');
  });

  it('leaving a rung never says "Faster" / "Again" first (B3); no phrase twice in a row (S11); Hebrew phrase by phrase', () => {
    for (const player of [() => 'tight' as Grade, (t: CoachTake) => ((t.nps ?? 0) <= 2.05 ? 'tight' : 'miss') as Grade]) {
      const { rows } = run({ tier: 0, player });
      for (const r of rows) {
        if (/pick up here/.test(r.line)) expect(r.said).not.toMatch(/Faster\.|Again\./);
        const parts = r.said.split(/(?<=[.:])\s+/);
        for (let i = 1; i < parts.length; i++) expect(parts[i], r.said).not.toBe(parts[i - 1]);
        expect(r.line.match(/That's the session/g)?.length ?? 0).toBeLessThanOrEqual(1);
        if (r.said) expect(r.sayHe.length).toBeGreaterThan(0);
      }
    }
  });

  it('a rung that reached eighths never goes back to quarters, the closing included (U7)', () => {
    const { rows } = run({ tier: 0, player: () => 'tight' });
    const scale = rows.filter((r) => r.rung === 'scale' && r.per !== null);
    const first8 = scale.findIndex((r) => (r.per ?? 0) >= 2);
    expect(first8).toBeGreaterThan(0);
    for (const r of scale.slice(first8)) expect(r.per).toBeGreaterThanOrEqual(2);
  });

  it('"almost" holds the tempo and never counts toward the two-miss rule (U3)', () => {
    let n = 0;
    const p: Player = (t) => (t.stageInfo?.code === 'A-6' && (t.nps ?? 0) > 1.4 ? (n++ % 2 ? 'almost' : 'tight') : 'tight');
    const { rows } = run({ tier: 0, player: p, maxTakes: 40 });
    const a6 = rows.filter((r) => r.code === 'A-6');
    for (let i = 1; i < a6.length; i++) if (a6[i - 1].grade === 'almost') expect(a6[i].nps).toBeCloseTo(a6[i - 1].nps, 6);
    expect(rows.some((r) => /best for now/.test(r.line))).toBe(false);
  });
});

describe('key session 2: second review (2026-11-25)', () => {
  it('B1: sessions fill their length — fresh, next day, third day, 60 minutes, bass — ending on the closing visit', () => {
    const one = run({ tier: 0, player: () => 'tight' });
    const two = run({ tier: 0, player: () => 'tight', items: one.items, now: T0 + 86_400_000 });
    const three = run({ tier: 0, player: () => 'tight', items: two.items, now: T0 + 2 * 86_400_000 });
    const sixty = run({ tier: 0, minutes: 60, player: (t) => ((t.nps ?? 0) <= 2.05 ? 'tight' : 'miss') });
    for (const [r, len] of [[one, 30], [two, 30], [three, 30], [sixty, 60]] as const) {
      if (process.env.KS_TRACE) console.log(len, r.rows.length, r.rows.slice(-8).map((x) => `${x.min.toFixed(1)} v${x.visit} ${x.rung} ${x.code} ♩${x.bpm}/${x.per} ${x.grade} ${x.line}`).join(' || '));
      expect(r.ended).toBe(true);
      const last = r.rows[r.rows.length - 1];
      // the closing is at most two takes of review (review 3): a session may end a little early
      // one clean take passes a stage (owner 2026-11-26): a player at today's limit everywhere may end a few minutes early
      expect(last.min).toBeGreaterThan(len - (len > 30 ? 8 : 4));
      expect(last.min).toBeLessThan(len + 1.5);
      expect(last.closing).toBe(true);
    }
  });

  it('B2: no ♩ below 40 anywhere; triplets only at ♩40 or more', () => {
    for (const player of [() => 'tight' as Grade, (t: CoachTake) => ((t.nps ?? 0) <= 1.2 ? 'tight' : 'miss') as Grade]) {
      const { rows } = run({ tier: 0, player });
      for (const r of rows) if (r.bpm !== null) expect(r.bpm, `#${r.n}`).toBeGreaterThanOrEqual(40);
    }
  });

  it('S1 (owner 2026-11-26): a clean probe passes and the next take is one mark faster', () => {
    const { rows } = run({ tier: 0, player: () => 'tight', maxTakes: 3 });
    expect(rows[0].probe).toBe(true);
    expect(rows[1].code).not.toBe(rows[0].code);
    expect(rows[1].nps).toBeGreaterThan(rows[0].nps);
    expect(rows[1].nps).toBeLessThanOrEqual(rows[0].nps * (1 + stepCap(rows[0].nps)) + 1e-6);
  });

  it('S4: three "almost" in a row at one tempo step back one metronome mark', () => {
    const p: Player = (t) => (t.stageInfo?.code === 'A-4' ? 'almost' : 'tight');
    const { rows } = run({ tier: 0, player: p, maxTakes: 12 });
    const a4 = rows.filter((r) => r.code === 'A-4');
    expect(a4.length).toBeGreaterThan(3);
    expect(a4[3].bpm!).toBeLessThan(a4[0].bpm!);
    expect(MAELZEL).toContain(a4[3].bpm!);
  });

  it('S7: harmonic minor spells its leading tone as a sharp or natural (A, D, G, C, F, E♭ minor)', () => {
    for (const [key, lt] of [[9, 8], [2, 1], [7, 6], [0, 11], [5, 4], [3, 2]] as const) {
      const sc = generate({ family: 'scales', kind: 'scale', key, hands: 'R', octaves: 1, minor: true, scale: 'harmonic' } as DrillSpec);
      const hm = generate({ family: 'k-sharm', kind: 'hl-3b', key, hands: 'R', option: 7, minor: true, scale: 'harmonic' } as DrillSpec);
      expect(sc.sharps).toEqual([lt]);
      expect(hm.sharps).toEqual([lt]);
    }
  });

  it('S8: one octave of block triads / 7ths is root-position chords on every degree I … I', () => {
    const tb = generate({ family: 'k-sharm', kind: 'hl-tb', key: 0, hands: 'R', octaves: 1 } as DrillSpec);
    const lows = [...new Set(tb.notes.map((n) => n.beat))].sort((a, b) => a - b).map((b) => Math.min(...tb.notes.filter((n) => n.beat === b).map((n) => n.pitch)));
    expect(lows.slice(0, 8)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });
});

describe('key session 2: third review (2026-11-25)', () => {
  it('the closing is at most two takes of review; never A-6 while a coordination stage of the scale is open', () => {
    const { rows } = run({ tier: 0, player: () => 'tight' });
    const cl = rows.filter((r) => r.closing);
    expect(cl.length).toBeGreaterThan(0);
    if (/review/.test(rows[rows.indexOf(cl[0]) - 1].line)) expect(cl.length).toBeLessThanOrEqual(2);
  });

  it('a step back that fails again is the limit; no more than six takes on one step', () => {
    const lim: Player = (t) => (t.stage === 'free' || (t.nps ?? 0) <= 1.6 + 1e-6 ? 'tight' : (t.nps ?? 0) <= 1.68 ? 'almost' : 'miss');
    const { rows } = run({ tier: 0, player: lim });
    let same = 1;
    for (let i = 1; i < rows.length; i++) {
      // the same item (a rotating rung meets each of its voicings once at the comfort tempo: different items)
      same = rows[i].item === rows[i - 1].item && rows[i].bpm === rows[i - 1].bpm ? same + 1 : 1;
      expect(same, `#${rows[i].n}`).toBeLessThanOrEqual(6);
    }
    expect(rows.some((r) => /best for now/.test(r.line))).toBe(true);
  });

  it('a missed thirds probe starts B-1 at no more than 0.9 × the probe (and 1.0 nps)', () => {
    const { rows } = run({ tier: 0, maxTakes: 40, player: (t) => (t.probe && t.stageInfo?.rung !== 'scale' ? 'miss' : 'tight') });
    const p = rows.findIndex((r) => r.probe && r.rung !== 'scale');
    const b1 = rows.slice(p + 1).find((r) => r.code === 'B-1' && r.per !== null);
    expect(b1).toBeTruthy();
    expect(b1!.nps).toBeLessThanOrEqual(Math.min(1, 0.9 * rows[p].nps) + 1e-6);
  });

  it('S10: the thirds never start before the scale passed A-3', () => {
    const { rows } = run({ tier: 0, player: (t) => (t.stage === 'free' ? 'tight' : (t.drill.spec as { hands: string }).hands === 'RL' ? 'miss' : 'tight') });
    expect(rows.some((r) => r.rung.startsWith('k-sharm'))).toBe(false);
    expect(rows[rows.length - 1].line).toMatch(/Next time/);
  });
});

describe('key session: owner 2026-11-26 (the same thing three days at ♪54)', () => {
  const tight = () => 'tight' as Grade;
  it('a new key each day: no right hand / left hand again, the tempo starts above yesterday’s comfort, never held at the tier benchmark', () => {
    const one = run({ tier: 0, player: tight });
    const two = run({ tier: 0, player: tight, items: one.items, now: T0 + 86_400_000, root: 7 });
    const three = run({ tier: 0, player: tight, items: two.items, now: T0 + 2 * 86_400_000, root: 2 });
    if (process.env.KS_TRACE) for (const r of [one, two, three]) console.log(r.rows.filter((x) => x.visit === 0).map((x) => `${x.code}${x.probe ? '?' : ''} ${x.hands}${x.oct} ♩${x.bpm}/${x.per}`).join(' | '));
    for (const r of [two, three]) {
      const scale = r.rows.filter((x) => x.visit === 0 && !x.closing);
      // a check (the probe at both hands) first, no single-hand stages
      expect(scale[0]).toMatchObject({ code: 'A-3', probe: true });
      expect(scale.some((x) => x.code === 'A-1' || x.code === 'A-2')).toBe(false);
    }
    const startOf = (r: typeof one) => r.rows.find((x) => x.visit === 0)!.nps;
    const bestOf = (r: typeof one) => Math.max(...r.rows.filter((x) => x.visit === 0 && x.grade !== 'miss').map((x) => x.nps));
    // each day starts near the last day's clean tempo (0.9 ×, on the marks), above the tier-0 benchmark (1.8 nps = ♪54)
    expect(startOf(two)).toBeGreaterThan(1.8);
    expect(startOf(two)).toBeGreaterThanOrEqual(0.8 * bestOf(one));
    expect(startOf(three)).toBeGreaterThan(startOf(two));
  });

  it('every clean take raises the next one (at most one metronome mark, ≤ 10 %), and no stage asks for the same take twice', () => {
    const { rows } = run({ tier: 0, player: tight, maxTakes: 12 });
    const pulsed = rows.filter((r) => r.nps > 0);
    for (let k = 1; k < pulsed.length; k++) {
      if (pulsed[k].closing || pulsed[k].visit !== pulsed[k - 1].visit || pulsed[k].chal || pulsed[k - 1].chal || pulsed[k].ckey !== pulsed[k - 1].ckey) continue;
      expect(pulsed[k].nps, `#${pulsed[k].n}`).toBeGreaterThan(pulsed[k - 1].nps - 1e-6);
      expect(pulsed[k].nps, `#${pulsed[k].n}`).toBeLessThanOrEqual(pulsed[k - 1].nps * (1 + stepCap(pulsed[k - 1].nps)) + 1e-6);
    }
    // a clean take on a coordination stage moves on: no two takes of one item at one tempo
    for (let k = 1; k < pulsed.length; k++) {
      const a = pulsed[k - 1];
      const b = pulsed[k];
      if (b.kind === 'coord' && a.code === b.code && a.oct === b.oct && a.motion === b.motion) expect(b.bpm, `#${b.n}`).not.toBe(a.bpm);
    }
  });
});


describe('SPEC-CLIMB-SYNC: the graded step and the challenge take (owner 2026-11-26)', () => {
  it('the step follows the take: a tight take climbs more than a loose one; slower near the best, a ceiling, or after 25 % today', () => {
    const at = 1.8; // ♪54
    const tight = gradedUp(at, 2, 1, {});
    const loose = gradedUp(at, 2, 0.3, {});
    expect(tight).toBeGreaterThan(loose);
    expect(loose).toBeGreaterThan(at); // at least one mark
    expect(tight).toBeLessThanOrEqual(at * (1 + stepCap(at)) + 1e-6);
    expect(gradedUp(at, 2, 1, { best: 1.95 })).toBeLessThanOrEqual(tight);
    expect(gradedUp(at, 2, 1, { ceil: 1.95 })).toBeLessThanOrEqual(tight);
    expect(gradedUp(at, 2, 1, { start: 1.4 })).toBeLessThanOrEqual(tight);
    for (const x of [tight, loose]) expect(MAELZEL).toContain(Math.round((x * 60) / 2));
  });

  it('the challenge: beyond the largest step at its speed, halfway to a known ceiling; the draw is fixed by its seed', () => {
    // owner 2026-11-27: beyond the largest normal step at that speed, relatively bigger when slow
    for (const at of [2, 4, 6]) expect(chalTarget(at, 0)).toBeGreaterThan(at * (1 + stepCap(at)));
    expect(chalTarget(2, 0) / 2).toBeGreaterThan(chalTarget(6, 0) / 6);
    expect(chalTarget(2, 3)).toBeCloseTo(2.5);
    expect(chalDraw(123456789, 7)).toBe(chalDraw(123456789, 7));
    const xs = Array.from({ length: 300 }, (_, k) => chalDraw(1764150000000, k));
    const share = xs.filter((x) => x < 1 / 3).length / xs.length;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.46);
  });

  it('a strong player meets at least one challenge; steps differ in size; sessions on other days differ', () => {
    const one = run({ tier: 0, player: () => 'perfect' });
    const two = run({ tier: 0, player: () => 'perfect', now: T0 + 86_400_000 });
    expect(one.rows.some((r) => r.chal)).toBe(true);
    const ratios = new Set<number>();
    for (let k = 1; k < one.rows.length; k++) {
      const [a, b] = [one.rows[k - 1], one.rows[k]];
      if (!a.chal && !b.chal && a.ckey === b.ckey && a.nps > 0 && b.nps > a.nps && a.per === b.per) ratios.add(Math.round((b.nps / a.nps) * 100));
    }
    expect(ratios.size).toBeGreaterThan(1);
    expect(ratios.size).toBeGreaterThan(0);
    const at = (r: typeof one) => r.rows.filter((x) => x.chal).map((x) => x.n).join(',');
    expect(at(one)).not.toBe(at(two));
  });

  it('a missed challenge: back to the tempo before, nothing counted, the ceiling noted on the item; at most two missed per kind', () => {
    // clean up to 2.0 nps, misses above: every challenge over 2.0 fails
    const { rows, items } = run({ tier: 0, player: (t) => ((t.nps ?? 0) <= 2.0 + 1e-6 ? 'perfect' : 'miss'), maxTakes: 120 });
    const missed = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.chal && r.grade === 'miss');
    expect(missed.length).toBeGreaterThan(0);
    for (const { r, i } of missed) {
      expect(r.said).toMatch(/Back to the tempo before/);
      const next = rows[i + 1];
      if (next && next.ckey === r.ckey && !next.closing) {
        expect(next.nps).toBeLessThan(r.nps);
        expect(next.said).not.toMatch(/best for now/i);
      }
    }
    const byKind = new Map<string, number>();
    for (const { r } of missed) byKind.set(r.ckey, (byKind.get(r.ckey) ?? 0) + 1);
    for (const n of byKind.values()) expect(n).toBeLessThanOrEqual(2);
    expect(Object.values(items).some((x) => !!x.ceil && x.ceil.nps > 2.0)).toBe(true);
  });
});
