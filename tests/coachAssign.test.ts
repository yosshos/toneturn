// Owner 2026-11-27 (calibration homework): a teacher's timed key assignment (one rung, one key, 10 minutes) jumped from
// ♩60 in quarters to ♩66 in eighths, then repeated ♩83 for minutes with no word why, and the next key started again at
// ♩60 in quarters. The old coach (coach.ts) simulated take by take on the real ladder.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { catalog } from '../src/engine/drills/generate';
import { keyMatrix } from '../src/engine/drills/keyMatrix';
import { planFamily } from '../src/engine/drills/todayPlan';
import { coachAfter, coachStart, coachTake } from '../src/engine/drills/coach';
import { applyTake, newItem } from '../src/engine/drills/ladder';
import { withStageTake } from '../src/engine/drills/rubato';
import { itemTargetBpm } from '../src/engine/drills/plan';
import { DEFAULT_DRILL_SETTINGS, type ItemState, type TakeMetrics } from '../src/engine/drills/types';
import { bandOfBpm, thresholds } from '../src/engine/drills/analyze';
import type { MatrixCell } from '../src/engine/drills/keyMatrix';

function cellOf(root: number): MatrixCell {
  for (let t = 0; t <= 9; t++) {
    const c = keyMatrix(catalog(), t, {}, { instrument: 'piano', groups: ['major'] }).find((x) => x.rung === 'scales-3' && x.root === root);
    if (c) return c;
  }
  throw new Error('no cell');
}

interface Row { stage: string | null; bpm: number; verdict: string; line: string; target: number }

/** A player clean up to `limit`, "almost" a little above it, missing far above. */
function session(root: number, items: Record<string, ItemState>, limit: number, takes = 30): Row[] {
  const cell = cellOf(root);
  const fam = planFamily([{ cell, why: 'strengthen' }], cell.level.title);
  let now = Date.parse('2026-11-27T20:00:00');
  let c = coachStart(fam, items, 'fifths-up', now, { minutes: 60, noProbe: true });
  const rows: Row[] = [];
  for (let n = 0; n < takes; n++) {
    const t = coachTake(fam, c, items, 'fifths-up', () => true);
    const d = t.drill;
    const th = thresholds(bandOfBpm(d, t.bpm));
    const verdict = t.stage ? 'clean' : t.bpm > limit * 1.08 ? 'not' : t.bpm > limit ? 'almost' : 'clean';
    const m = { verdict, bpm: t.bpm, nps: 0, accuracy: verdict === 'clean' ? 1 : 0.9, wrong: verdict === 'not' ? 2 : 0, missing: 0, timingMean: 0, timingSD: t.stage === 'free' ? null : (verdict === 'clean' ? 0.6 : 1.2) * th.sd, hesitations: 0, handsAbs: null } as unknown as TakeMetrics;
    const st0 = items[d.itemId] ?? newItem(d);
    items[d.itemId] = t.stage ? withStageTake(st0, t.stage, m) : applyTake(st0, m, t.bpm, new Date(now).toISOString(), DEFAULT_DRILL_SETTINGS, { targetBpm: itemTargetBpm(d) }).state;
    now += 25_000;
    const nx = coachAfter(fam, c, t, m, items, 'fifths-up', now, () => true);
    rows.push({ stage: t.stage, bpm: t.bpm, verdict, line: nx.line.he, target: itemTargetBpm(d) });
    c = nx.state;
    if (nx.end) break;
  }
  return rows;
}

describe('a timed one-key assignment on the old coach (owner 2026-11-27)', () => {
  const items: Record<string, ItemState> = {};
  const first = session(10, items, 96);
  const second = session(3, items, 96);

  it('the first tempo take after the quarters stays at ♩60', () => {
    const q = first.findIndex((r) => r.stage === 'quarters');
    expect(q).toBeGreaterThanOrEqual(0);
    const nextTempo = first.slice(q + 1).find((r) => r.stage === null)!;
    expect(nextTempo.bpm).toBeLessThanOrEqual(60);
  });

  it('a clean tempo take is never followed by the same tempo', () => {
    for (const rows of [first, second])
      for (let i = 0; i + 1 < rows.length; i++)
        if (rows[i].stage === null && rows[i].verdict === 'clean' && rows[i + 1].stage === null) expect(rows[i + 1].bpm, `take ${i + 2}`).not.toBe(rows[i].bpm);
  });

  it('goes on past the target, and says so', () => {
    const target = first[0].target;
    expect(Math.max(...first.map((r) => r.bpm))).toBeGreaterThan(target);
    expect(first.some((r) => r.line.includes('עברת את היעד'))).toBe(true);
  });

  it('after a limit: back a little and up again, with a word why', () => {
    expect(first.some((r) => r.line.includes('הגבול שלך היום'))).toBe(true);
  });

  it('the next key of a pattern played clean: one free take, no quarters, and a tempo near the other key', () => {
    expect(second.some((r) => r.stage === 'quarters')).toBe(false);
    expect(second.filter((r) => r.stage === 'free').length).toBeLessThanOrEqual(1);
    const firstTempo = second.find((r) => r.stage === null)!;
    expect(firstTempo.bpm).toBeGreaterThanOrEqual(70);
  });
});
