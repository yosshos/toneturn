import { describe, expect, it } from 'vitest';
import { coachAfter, coachStage, coachStart, coachTake, KEYS_TO_PROMOTE, MISSES_TO_PARK, rubatoDoneByCoach, SESSION_MIN, type CoachState } from '../src/engine/drills/coach';
import { familyById } from '../src/engine/drills/plan';
import { newItem } from '../src/engine/drills/ladder';
import { rubatoStage, withStageTake } from '../src/engine/drills/rubato';
import type { ItemState, TakeMetrics } from '../src/engine/drills/types';

const fam = familyById('scales')!;
const order = 'fifths-up' as const;
const m = (clean: boolean): TakeMetrics => ({ verdict: clean ? 'clean' : 'retry', wrong: clean ? 0 : 1, missing: 0, hesitations: 0, accuracy: clean ? 1 : 0.9, bpm: 60 }) as unknown as TakeMetrics;

/** Play one take the way the screen does: save the item state (stage take or tempo take), then ask the coach. */
function play(c: CoachState, items: Record<string, ItemState>, clean: boolean, now = 0) {
  const t = coachTake(fam, c, items, order);
  const s0 = items[t.drill.itemId] ?? newItem(t.drill);
  let s: ItemState;
  if (t.stage) {
    s = withStageTake(s0, t.stage, m(clean));
    // The screen's shortcut (coachStage says the item is past rubato after one clean free take of a further key).
    if (t.stage === 'free' && clean && rubatoStage(s, t.drill) && !coachStage(t.level, t.spec, t.drill, { ...items, [t.drill.itemId]: s }, order)) s = rubatoDoneByCoach(s, t.drill);
  } else s = clean ? { ...s0, cleanBpm: Math.max(s0.cleanBpm, t.bpm), takes: s0.takes + 1 } : { ...s0, takes: s0.takes + 1 };
  const items2 = { ...items, [t.drill.itemId]: s };
  return { t, items: items2, nx: coachAfter(fam, c, t, m(clean), items2, order, now) };
}

describe('practice coach (scales)', () => {
  it('a new player starts at level 1, right hand, free time, and hears it first', () => {
    const c = coachStart(fam, {}, order, 0);
    expect(c.step).toBe(0);
    expect(c.side).toBeNull();
    const t = coachTake(fam, c, {}, order);
    expect(t.stage).toBe('free');
    expect(t.demo).toBe(true);
    expect(t.drill.spec.hands).toBe('R');
  });

  it('climbs: RH → LH in a key, the next key, then a new step once two keys are clean — no click needed', () => {
    let c = coachStart(fam, {}, order, 0);
    let items: Record<string, ItemState> = {};
    const seen: string[] = [];
    let promotedAt = -1;
    for (let k = 0; k < 40 && c.step === 0; k++) {
      const r = play(c, items, true);
      seen.push(`${r.t.drill.spec.key}:${r.t.drill.spec.hands}:${r.t.stage ?? 'tempo'}`);
      items = r.items;
      c = r.nx.state;
      expect(r.nx.end).toBe(false);
      if (c.step === 1) promotedAt = k;
    }
    expect(c.step).toBe(1);
    expect(c.demo).toBe(true);
    // The first key goes through free → quarters → tempo for each hand; the second key is quicker (one free take).
    const firstKey = seen.filter((x) => x.startsWith('0:'));
    expect(firstKey[0]).toBe('0:R:free');
    expect(firstKey).toContain('0:L:tempo');
    const second = seen.filter((x) => x.startsWith('7:'));
    expect(second.filter((x) => x.endsWith(':free')).length).toBeLessThanOrEqual(2);
    expect(promotedAt).toBeLessThan(20);
    expect(KEYS_TO_PROMOTE).toBe(2);
  });

  it('a miss: again, then slower, then parked as a weak spot and on to the next key; the spot comes back', () => {
    // Skip the rubato: a player past it (items played at tempo before).
    let c = coachStart(fam, {}, order, 0);
    let items: Record<string, ItemState> = {};
    const t0 = coachTake(fam, c, items, order);
    items[t0.drill.itemId] = { ...newItem(t0.drill), rubato: { free: 2, quarters: 1 } };
    const r1 = play(c, items, false);
    expect(r1.nx.line.en).toMatch(/again/);
    const r2 = play(r1.nx.state, r1.items, false);
    expect(r2.nx.line.en).toMatch(/Slower/);
    expect(coachTake(fam, r2.nx.state, r2.items, order).bpm).toBeLessThan(t0.bpm);
    const r3 = play(r2.nx.state, r2.items, false);
    expect(MISSES_TO_PARK).toBe(3);
    c = r3.nx.state;
    expect(c.weak).toHaveLength(1);
    expect(c.keys[c.keyIdx]).not.toBe(t0.drill.spec.key);
    items = r3.items;
    let back = false;
    for (let k = 0; k < 12 && !back; k++) {
      const r = play(c, items, true);
      items = r.items;
      c = r.nx.state;
      if (c.side?.kind === 'review') back = true;
    }
    expect(back).toBe(true);
  });

  it('a player solid on level 1 warms up on it, then starts level 2', () => {
    // Play level 1 clean in two keys (both hands).
    let c = coachStart(fam, {}, order, 0);
    let it: Record<string, ItemState> = {};
    for (let k = 0; k < 40 && c.step === 0; k++) {
      const r = play(c, it, true);
      it = r.items;
      c = r.nx.state;
    }
    const again = coachStart(fam, it, order, 0);
    expect(again.step).toBe(1);
    expect(again.side?.kind).toBe('warmup');
    expect(coachTake(fam, again, it, order).kind).toBe('warmup');
  });

  it('wraps up when the session time is over, with a summary', () => {
    const c = coachStart(fam, {}, order, 0);
    const r = play(c, {}, true, SESSION_MIN * 60_000 + 1);
    expect(r.nx.end).toBe(true);
    expect(r.nx.line.he).toMatch(/זה הסשן/);
  });
});
