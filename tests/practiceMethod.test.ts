import { describe, expect, it } from 'vitest';
import { LIMITS, preset, total } from '../src/engine/workout2';
import {
  canComplete, completeStep, CONCEPT_TUNE_LEVELS, conceptOf, DEFAULT_TUNE_LEVELS, listenCard, loadLickFlows, loadMemo, memoProgress, MEMO_STEPS, moveTune, newLickFlow, newMemo, saveLickFlows, saveMemo, slotLabelOf, stepCards, toggleMemoStep, tuneSlotLevels, tunesIn, withKeyStars, type KV, type SlotItem,
} from '../src/engine/practiceMethod';
import { RULE_NAME } from '../src/engine/improvRules';

const fakeKV = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('four-slot session (Siskind, A11 / C6)', () => {
  it('the preset: technique → transposition → tunes → recordings, summing to the total', () => {
    for (const T of [5, 10, 12, 20, 30, 60]) {
      const bs = preset('four-slot', T, []);
      expect(bs.map((b) => b.target.kind)).toEqual(['area', 'strengthen', 'game', 'practice']);
      expect(bs[0].target).toEqual({ kind: 'area', area: 'instrument' });
      expect(bs[2].id.startsWith('tunes-')).toBe(true);
      expect(bs[3].id.startsWith('listen-')).toBe(true);
      expect(total(bs)).toBe(Math.max(T, 4 * LIMITS.minBlock));
      expect(bs.every((b) => b.minutes >= LIMITS.minBlock)).toBe(true);
    }
    expect(slotLabelOf('tunes-1')?.en).toBe('Tunes');
    expect(slotLabelOf('listen-1')?.he).toBeTruthy();
    expect(slotLabelOf('area-1')).toBeNull();
  });
  it('maps an item to its concept', () => {
    expect(conceptOf('voicings', 'chart~lv:x~shell~whole~comp')).toBe('shells');
    expect(conceptOf('voicings', 'chart~lv:x~rootless~charleston~comp')).toBe('comping');
    expect(conceptOf('accomp', 'chart~lv:x~stride-tenth~whole~comp')).toBe('stride');
    expect(conceptOf('accomp', 'walking')).toBe('walking');
    expect(conceptOf('jazz', 'guide-tones')).toBe('guide');
    expect(conceptOf('k-harrisline', 'hl-chrom')).toBe('lines');
    expect(conceptOf('k-tune', 'tn-shell')).toBeNull();
    expect(conceptOf('k-ear', 'x')).toBeNull();
  });
  it('slot 2 feeds slot 3: the newest mastered item names the tune levels', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const it = (id: string, family: string, last: string, clean: number, target?: number): SlotItem => ({ itemId: id, family, last, cleanBpm: clean, targetBpm: target, takes: 3 });
    const items = {
      a: it('accomp:walking:0:L', 'accomp', '2026-11-15T10:00:00Z', 60, 100),
      b: it('voicings:chart~lv:x~shell~whole~comp:0:L', 'voicings', '2026-11-14T10:00:00Z', 100, 100),
      c: it('scales:scale:0:R', 'scales', '2026-11-15T11:00:00Z', 90, 80),
    };
    const r = tuneSlotLevels(items, now);
    expect(r.concept).toBe('shells');
    expect(r.levels.slice(0, 3)).toEqual(CONCEPT_TUNE_LEVELS.shells);
    expect(r.levels.slice(-2)).toEqual(DEFAULT_TUNE_LEVELS);
    // nothing mastered: the newest played
    expect(tuneSlotLevels({ a: items.a }, now).concept).toBe('walking');
    // too old or nothing: the defaults
    expect(tuneSlotLevels({ b: items.b }, new Date('2027-01-01')).levels).toEqual(DEFAULT_TUNE_LEVELS);
    expect(tuneSlotLevels({}, now).concept).toBeNull();
    expect(listenCard('stride').prompts).toHaveLength(3);
    expect(listenCard(null).who.en).toMatch(/tune/);
  });
});

describe('7-step lick flow', () => {
  it('advances one step at a time; the concept is needed from step 3', () => {
    let f = newLickFlow();
    expect(canComplete(f, 2)).toBe(false);
    f = completeStep(f, 1, '2026-11-15');
    expect(f.step).toBe(2);
    expect(withKeyStars(f, 2, 3, 'd').step).toBe(2);
    f = withKeyStars(f, 3, 3, '2026-11-15');
    expect(f.step).toBe(3);
    expect(completeStep(f, 3, 'd')).toBe(f);
    f = completeStep(f, 3, 'd', 'rhythm');
    expect(f).toMatchObject({ step: 4, concept: 'rhythm' });
    expect(stepCards(4, f.concept)).toEqual(['same-rhythm']);
    expect(stepCards(6, 'harmony')).toContain('use-lick');
    expect(stepCards(7, 'contour')).toContain('space');
    expect(stepCards(3, 'rhythm')).toEqual([]);
    for (const id of [...stepCards(6, 'rhythm'), ...stepCards(7, 'contour'), ...stepCards(4, 'harmony')]) expect((RULE_NAME as Record<string, unknown>)[id], id).toBeTruthy();
    for (const n of [4, 5, 6, 7] as const) f = completeStep(f, n, 'd');
    expect(f.step).toBe(8);
  });
  it('persists through storage', () => {
    const kv = fakeKV();
    const f = completeStep(newLickFlow(), 1, '2026-11-15');
    saveLickFlows({ l1: f }, kv);
    expect(loadLickFlows(kv)).toEqual({ l1: f });
    kv.setItem('tt.lickFlow.v1', '{broken');
    expect(loadLickFlows(kv)).toEqual({});
    expect(loadLickFlows(null)).toEqual({});
  });
});

describe('memorising a tune', () => {
  it('ticks steps, moves lists, persists', () => {
    let s = moveTune(newMemo(), 'autumn', 'next');
    expect(tunesIn(s, 'next')).toEqual(['autumn']);
    s = toggleMemoStep(s, 'autumn', 'chunk', 'd');
    expect(s.lists.autumn).toBe('learning');
    expect(memoProgress(s, 'autumn')).toEqual({ done: 1, next: 'transpose' });
    s = toggleMemoStep(s, 'autumn', 'chunk', 'd');
    expect(memoProgress(s, 'autumn').done).toBe(0);
    for (const x of MEMO_STEPS) s = toggleMemoStep(s, 'autumn', x.id, 'd');
    expect(s.lists.autumn).toBe('know');
    expect(memoProgress(s, 'autumn').next).toBeNull();
    expect(MEMO_STEPS.find((x) => x.id === 'write')?.topic).toBe('harmonic-dictation');
    const kv = fakeKV();
    saveMemo(s, kv);
    expect(loadMemo(kv)).toEqual(s);
  });
});
