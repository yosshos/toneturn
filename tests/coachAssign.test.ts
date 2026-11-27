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

function cellOf(root: number, rung = 'scales-3'): MatrixCell {
  for (let t = 0; t <= 9; t++) {
    const c = keyMatrix(catalog(), t, {}, { instrument: 'piano', groups: ['major'] }).find((x) => x.rung === rung && x.root === root);
    if (c) return c;
  }
  throw new Error('no cell');
}

interface Row { stage: string | null; bpm: number; verdict: string; line: string; target: number; item: string; click: string }

type Bg = { exact?: boolean; jazz?: boolean; missOn?: string };

/** A player clean up to `limit`, "almost" a little above it, missing far above. */
function session(root: number, items: Record<string, ItemState>, limit: number, takes = 30, forms: string[] = [], bg: Bg = {}): Row[] {
  const cell = cellOf(root);
  const fam = planFamily([cell, ...forms.map((r) => cellOf(root, r))].map((c) => ({ cell: c, why: 'strengthen' as const })), cell.level.title);
  let now = Date.parse('2026-11-27T20:00:00');
  let c = coachStart(fam, items, 'fifths-up', now, { minutes: 60, noProbe: true, ...(forms.length ? { walk: true, resumeAt: 0 } : {}), ...(bg.exact ? { exact: true } : {}), ...(bg.jazz ? { jazz: true } : {}) });
  const rows: Row[] = [];
  for (let n = 0; n < takes; n++) {
    const t = coachTake(fam, c, items, 'fifths-up', () => true);
    const d = t.drill;
    const th = thresholds(bandOfBpm(d, t.bpm));
    const verdict = t.stage ? 'clean' : bg.missOn && t.thin === bg.missOn ? 'not' : t.bpm > limit * 1.08 ? 'not' : t.bpm > limit ? 'almost' : 'clean';
    const m = { verdict, bpm: t.bpm, nps: 0, accuracy: verdict === 'clean' ? 1 : 0.9, wrong: verdict === 'not' ? 2 : 0, missing: 0, timingMean: 0, timingSD: t.stage === 'free' ? null : (verdict === 'clean' ? 0.6 : 1.2) * th.sd, hesitations: 0, handsAbs: null } as unknown as TakeMetrics;
    const st0 = items[d.itemId] ?? newItem(d);
    items[d.itemId] = t.stage ? withStageTake(st0, t.stage, m) : applyTake(st0, m, t.bpm, new Date(now).toISOString(), DEFAULT_DRILL_SETTINGS, { targetBpm: itemTargetBpm(d) }).state;
    now += 25_000;
    const nx = coachAfter(fam, c, t, m, items, 'fifths-up', now, () => true);
    rows.push({ stage: t.stage, bpm: t.bpm, verdict, line: nx.line.he, target: itemTargetBpm(d), item: d.itemId, click: t.thin ?? 'all' });
    if (t.thin) expect(d.click).toBe(t.thin);
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
        // the same tempo only with a thinner click (owner 2026-11-27: a different take)
        if (rows[i].stage === null && rows[i].verdict === 'clean' && rows[i + 1].stage === null && rows[i + 1].click === rows[i].click) expect(rows[i + 1].bpm, `take ${i + 2}`).not.toBe(rows[i].bpm);
  });

  it('goes on past the target, and says so', () => {
    const target = first[0].target;
    expect(Math.max(...first.map((r) => r.bpm))).toBeGreaterThan(target);
    expect(first.some((r) => r.line.includes('עברת את היעד'))).toBe(true);
  });

  it('after a limit: back a little and up again, with a word why', () => {
    expect(first.some((r) => r.line.includes('השיא שלך עד עכשיו'))).toBe(true);
  });

  it('the next key of a pattern played clean: one free take, no quarters, and a tempo near the other key', () => {
    expect(second.some((r) => r.stage === 'quarters')).toBe(false);
    expect(second.filter((r) => r.stage === 'free').length).toBeLessThanOrEqual(1);
    const firstTempo = second.find((r) => r.stage === null)!;
    expect(firstTempo.bpm).toBeGreaterThanOrEqual(70);
  });

  it('with forms (owner 2026-11-27, boring): after the target the session moves on to other forms of the scale', () => {
    const rows = session(5, {}, 200, 60, ['scales-4', 'scales-11', 'scales-8']);
    const ids = [...new Set(rows.map((r) => r.item))];
    if (process.env.SHOW) console.log(rows.map((r) => `${r.item} ${r.stage ?? ''} ${r.bpm} | ${r.line.slice(0, 70)}`).join(String.fromCharCode(10)));
    expect(ids.length).toBeGreaterThan(1);
    expect(rows.some((r) => r.line.includes('שלב חדש'))).toBe(true);
  });
});

// Owner 2026-11-27: the click is not always on every beat — it thins as the time holds (option A: everyone).
describe('the click thins in the coach (owner 2026-11-27)', () => {
  it('every beat → 1 & 3 → 2 & 4 → 1 → a bar on, a bar off; each thinning keeps the tempo once and says so', () => {
    const rows = session(0, {}, 200, 50);
    if (process.env.SHOW) console.log(rows.map((r) => `${r.stage ?? ''} ${r.bpm} ${r.click} | ${r.line.slice(0, 80)}`).join(String.fromCharCode(10)));
    const order = [...new Set(rows.map((r) => r.click))];
    expect(order).toEqual(['all', '13', '24', 'one', 'gap']);
    expect(rows.some((r) => r.line.includes('אותו טמפו, עכשיו הקליק רק על 1 ו־3'))).toBe(true);
    const i = rows.findIndex((r) => r.click === '13');
    expect(rows[i].bpm).toBe(rows[i - 1].bpm);
  });
  it('jazz as the main style: 2 & 4 right after the full click', () => {
    const order = [...new Set(session(0, {}, 200, 30, [], { jazz: true }).map((r) => r.click))];
    expect(order.slice(0, 3)).toEqual(['all', '24', '13']);
  });
  it("a teacher's 'exactly this exercise' keeps the click on every beat", () => {
    expect(session(0, {}, 200, 40, [], { exact: true }).every((r) => r.click === 'all')).toBe(true);
  });
  it('a miss with a thinner click: one level back, with a word', () => {
    const rows = session(0, {}, 200, 40, [], { missOn: '24' });
    const i = rows.findIndex((r) => r.click === '24');
    expect(i).toBeGreaterThan(0);
    expect(rows[i].line).toContain('חוזרים: הקליק רק על 1 ו־3');
    expect(rows[i + 1].click).toBe('13');
  });
});

describe('the 1 & 3 click', () => {
  it('sounds on beats 1 and 3 after the count-in', async () => {
    const { legacyClickHeard } = await import('../src/engine/drills/timeline');
    const d = { meter: 4, click: '13' as const };
    expect([4, 5, 6, 7].map((i) => legacyClickHeard(d, i))).toEqual([true, false, true, false]);
    expect([0, 1, 2, 3].every((i) => legacyClickHeard(d, i))).toBe(true);
  });
});

// Owner 2026-11-27: the same exercise at another tempo is not named again
describe('the coach line names the exercise only when it changes', () => {
  it('a climb on the same item says only the tempo', () => {
    const rows = session(0, {}, 200, 12);
    const climb = rows.filter((r, i) => i > 0 && r.stage === null && rows[i - 1].stage === null && rows[i - 1].item === r.item && r.line.includes('מהר יותר'));
    expect(climb.length).toBeGreaterThan(0);
    for (const r of climb) expect(r.line).toMatch(/אותו תרגיל, ♩\d+/);
  });
});
