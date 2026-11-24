import { describe, expect, it } from 'vitest';
import { needsBrief, sectionMode, taskBriefOf, taskKindOf, taskModeOf } from '../src/engine/drills/taskBrief';
import { strandsFor } from '../src/engine/drills/levelTest';
import { families } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import type { Drill } from '../src/engine/drills/types';

// Owner 2026-11-24: a short explanation before every new kind of task — the count-in waits for Ready; repeats flow.
const lv = (id: string) => families('piano').flatMap((f) => f.levels).find((l) => l.id === id)!;
const drillOf = (id: string, spec = 0, key = 0): Drill => generate({ ...lv(id).specs[spec], key });

describe('task brief: when it is needed', () => {
  it('the first task of a run opens with a brief', () => {
    const d = drillOf('scales-1');
    expect(needsBrief(null, taskKindOf(d))).toBe(true);
  });
  it('the same kind in another key, or again, needs no brief (hands-free repeats)', () => {
    const a = taskKindOf(drillOf('scales-1', 0, 0), { level: 'scales-1' });
    const b = taskKindOf(drillOf('scales-1', 0, 7), { level: 'scales-1' });
    expect(a).toBe(b);
    expect(needsBrief(a, b)).toBe(false);
  });
  it('another hand is another kind', () => {
    const specs = lv('scales-1').specs;
    const hands = specs.map((s) => s.hands);
    const i = hands.findIndex((h) => h !== hands[0]);
    expect(i).toBeGreaterThan(0);
    const a = taskKindOf(drillOf('scales-1', 0), { level: 'scales-1' });
    const b = taskKindOf(drillOf('scales-1', i), { level: 'scales-1' });
    expect(a).not.toBe(b);
    expect(needsBrief(a, b)).toBe(true);
  });
  it('another family, level or section is another kind', () => {
    const scale = drillOf('scales-1');
    const arp = drillOf('arpeggios-3');
    expect(needsBrief(taskKindOf(scale), taskKindOf(arp))).toBe(true);
    expect(needsBrief(taskKindOf(scale, { level: 'scales-1' }), taskKindOf(scale, { level: 'scales-3' }))).toBe(true);
    expect(needsBrief(taskKindOf(scale, { section: 'hands' }), taskKindOf(scale, { section: 'touch' }))).toBe(true);
  });
  it('a kind already briefed in this run flows again without one', () => {
    const a = taskKindOf(drillOf('scales-1'));
    const b = taskKindOf(drillOf('arpeggios-3'));
    expect(needsBrief(b, a, new Set([a, b]))).toBe(false);
    expect(needsBrief(b, a, new Set([b]))).toBe(true);
  });
  it('reading vs playing the same item is another kind (the mode)', () => {
    const d = drillOf('scales-1');
    expect(taskKindOf(d, { mode: 'read' })).not.toBe(taskKindOf(d));
    expect(needsBrief(taskKindOf(d), taskKindOf(d, { mode: 'ear' }))).toBe(true);
  });
  it('the tempo and free time are not part of the kind (the line says them)', () => {
    const d = drillOf('scales-1');
    expect(taskKindOf(d, { bpm: 60, free: true })).toBe(taskKindOf(d, { bpm: 90 }));
  });
});

describe('task brief: what it says', () => {
  it('two short lines in Hebrew and English: what, then hands and tempo', () => {
    const d = drillOf('scales-1');
    const b = taskBriefOf(d, { bpm: 72 });
    expect(b.what.he).toMatch(/^לנגן: /);
    expect(b.what.en).toMatch(/^Play: /);
    expect(b.how.en).toContain('♩ 72');
    expect(b.how.he).toContain('♩ 72');
    expect(b.how.en).toMatch(/hand/);
    expect(b.how.he).toMatch(/יד/);
    for (const t of [b.what.en, b.what.he, b.how.en, b.how.he]) expect(t.length).toBeLessThan(110);
    expect(b.hideMaterial).toBe(false);
  });
  it('free time says no click instead of a tempo', () => {
    const b = taskBriefOf(drillOf('scales-1'), { free: true });
    expect(b.how.en).toMatch(/no click/);
    expect(b.how.en).not.toMatch(/♩/);
  });
  it('a reading item still gets its brief: what is tested, seen once', () => {
    const d = drillOf('scales-1');
    const b = taskBriefOf(d, { mode: 'read' });
    expect(b.mode).toBe('read');
    expect(b.what.en).toMatch(/Sight-read/);
    expect(b.what.he).toMatch(/קריאה מהדף/);
    expect(b.how.en).toMatch(/see it once/);
    // the material shows as the reading test already shows it; a cold read hides it until Ready
    expect(b.hideMaterial).toBe(false);
    expect(taskBriefOf(d, { mode: 'read', cold: true }).hideMaterial).toBe(true);
    // never hidden outside reading
    expect(taskBriefOf(d, { cold: true }).hideMaterial).toBe(false);
  });
  it('an ear item says listen, then play it back', () => {
    const b = taskBriefOf(drillOf('scales-1'), { mode: 'ear' });
    expect(b.what.en).toMatch(/listen/);
    expect(b.what.he).toMatch(/מקשיבים/);
  });
});

describe('task brief in the level test', () => {
  it('the reading and ear sections take their mode; the rest from the drill', () => {
    expect(sectionMode('reading')).toBe('read');
    expect(sectionMode('ear')).toBe('ear');
    expect(sectionMode('hands')).toBeUndefined();
  });
  it('every section of the piano test opens with a brief before its first step', () => {
    const strands = strandsFor('piano', 'both').filter((s) => s.rungs.length);
    let last: string | null = null;
    const seen = new Set<string>();
    for (const st of strands) {
      const r = st.rungs[0];
      const l = lv(r.level);
      if (!l) continue;
      const d = generate({ ...l.specs[r.spec ?? 0], key: r.key });
      const kind = taskKindOf(d, { section: st.id, level: r.level, mode: sectionMode(st.id) });
      expect(needsBrief(last, kind, seen), `${st.id} ${r.level}`).toBe(true);
      seen.add(kind);
      last = kind;
    }
  });
  it('an ear family is ear by default, a reading family read', () => {
    const ear = families('piano').flatMap((f) => f.levels).find((l) => l.id.startsWith('k-ear-'));
    if (ear) expect(taskModeOf(generate({ ...ear.specs[0], key: 0 }))).toBe('ear');
  });
});
