// AUDIT-CONTENT-THEORY §ה.2 / §ד.3 / §ב.3 / §ב.4: voice leading by ear (vl-ear), bass 5:3 (b-time 13), the g-meter
// probe in the level test, and guitar levels in grade order on the path.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { TOPIC_GEN, asChoice, genTopic } from '../src/engine/topicKit';
import { drop2, heldCount, rootPositionVoicings, smoothVoicings, totalMotion, triadPcs, twoFiveOne, scaleStep } from '../src/engine/topicsVoiceLeadEar';
import { isDrop2 } from '../src/engine/drills/voiceLead';
import { courseInput } from '../src/engine/courses';
import { eligible, ladderOrder, stepCatalogue, type PathInput, type PathStep } from '../src/engine/path';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { refresherFor } from '../src/content/refresher';
import { hasShortName } from '../src/engine/pathNames';
import { TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { TOPIC_GROUPS } from '../src/engine/topicGroups';
import { BADGES } from '../src/engine/badges';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { generate } from '../src/engine/drills/generate';
import { levelDrills } from '../src/engine/drills/plan';
import { guitarStrands } from '../src/engine/drills/levelTest';
import { guitarProbesFor, placeGuitar } from '../src/engine/drills/guitarProbes';
import type { Stimulus } from '../src/engine/lesson';

const chords = (st: Stimulus[]) => st.filter((s): s is Extract<Stimulus, { kind: 'chord' }> => s.kind === 'chord').map((s) => s.midis);
const pc = (m: number) => ((m % 12) + 12) % 12;

describe('vl-ear: voice leading by ear', () => {
  it('four levels, each item well formed, the answer varies', () => {
    expect(TOPIC_GEN['vl-ear'].levels).toHaveLength(4);
    for (let l = 1; l <= 4; l++) {
      const answers = new Set<string>();
      for (let s = 1; s <= 80; s++) {
        const q = asChoice(TOPIC_GEN['vl-ear'].gen(s * 7919, l, 'x'));
        expect(q.choices).toContain(q.answer);
        expect(q.stimulus.length).toBeGreaterThan(0);
        answers.add(q.answer);
      }
      expect(answers.size, `L${l}`).toBe(TOPIC_GEN['vl-ear'].gen(1, l, 'x').kind === 'choice' ? asChoice(TOPIC_GEN['vl-ear'].gen(1, l, 'x')).choices.length : 0);
    }
  });

  it('L1: exactly the named voice moves, by a scale step, and the voices never cross', () => {
    const order = ['b', 't', 'a', 's'];
    for (let s = 1; s <= 120; s++) {
      const q = asChoice(TOPIC_GEN['vl-ear'].gen(s * 31, 1, 'x'));
      const [a, b] = chords(q.stimulus);
      expect(a).toHaveLength(4);
      const diff = a.map((m, i) => b[i] - m);
      const moved = diff.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
      expect(moved).toEqual([order.indexOf(q.answer)]);
      expect(Math.abs(diff[moved[0]])).toBeLessThanOrEqual(2);
      for (const v of [a, b]) for (let i = 1; i < 4; i++) expect(v[i]).toBeGreaterThan(v[i - 1]);
      // every choice's sound moves its own voice
      for (const k of q.choices) {
        const [x, y] = chords(q.choiceStim![k]);
        expect(x.map((m, i) => (y[i] !== m ? i : -1)).filter((i) => i >= 0)).toEqual([order.indexOf(k)]);
      }
    }
    expect(scaleStep(64, 0, 1)).toBe(65);
    expect(scaleStep(60, 0, -1)).toBe(59);
    expect(scaleStep(61, 2, 1)).toBe(62);
  });

  it('L2: the answer is the count of upper notes held; the bass always moves; all of 0–3 occur', () => {
    const seen = new Set<number>();
    for (let s = 1; s <= 200; s++) {
      const q = asChoice(TOPIC_GEN['vl-ear'].gen(s * 13, 2, 'x'));
      const [a, b] = chords(q.stimulus);
      expect(b[0]).not.toBe(a[0]);
      const n = heldCount(a.slice(1), b.slice(1));
      expect(q.answer).toBe(`h${n}`);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
    // the music: a 3rd keeps two, a 5th one, a step none (nearest voicing)
    const up = [60, 64, 67];
    expect(heldCount(up, [60, 64, 69])).toBe(2);
    expect(triadPcs(0, 5)).toEqual([9, 0, 4]);
  });

  it('L3: smooth moves little and keeps the 7th → 3rd; jumpy leaps (root position)', () => {
    for (let key = 0; key < 12; key++)
      for (const minor of [false, true]) {
        const p = twoFiveOne(key, minor);
        const sm = smoothVoicings(p.pcs);
        const jp = rootPositionVoicings(p.pcs);
        const mv = (vs: number[][]) => totalMotion(vs[0], vs[1]) + totalMotion(vs[1], vs[2]);
        expect(mv(sm), `${key} ${minor}`).toBeLessThanOrEqual(8);
        expect(mv(jp), `${key} ${minor}`).toBeGreaterThan(mv(sm) + 6);
        sm.forEach((v, i) => expect(v.map(pc).sort()).toEqual([...p.pcs[i]].sort()));
        jp.forEach((v, i) => expect(pc(v[0])).toBe(p.pcs[i][0]));
        // the ii's 7th falls a half step to the V's 3rd
        expect(sm[1]).toContain(sm[0].find((m) => pc(m) === pc(key))! - 1);
      }
  });

  it('L4: drop 2 is a real drop-2 voicing of the same notes with the same top; the bass stays under it', () => {
    for (let s = 1; s <= 60; s++) {
      const q = asChoice(TOPIC_GEN['vl-ear'].gen(s * 17, 4, 'x'));
      const close = chords(q.choiceStim!.close);
      const dr = chords(q.choiceStim!.drop2);
      close.forEach((c, i) => {
        const up = c.slice(1);
        const d = dr[i].slice(1);
        expect(up[3] - up[0]).toBeLessThanOrEqual(11);
        expect(isDrop2(d)).toBe(true);
        expect(d[3]).toBe(up[3]);
        expect(d.map(pc).sort()).toEqual(up.map(pc).sort());
        expect(dr[i][0]).toBeLessThan(d[0]);
      });
    }
    expect(drop2([60, 64, 67, 71])).toEqual([55, 60, 64, 71]);
  });

  it('wiring: ear path at rising difficulty, group, symbol, short name, lesson, badge', () => {
    const base: PathInput = {
      track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [],
      packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-14T10:00:00Z'),
    };
    const on = stepCatalogue().filter((s) => s.topic === 'vl-ear' && eligible(s, courseInput(base, 'ear')));
    expect(on.map((s) => s.level)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < on.length; i++) expect(on[i].difficulty).toBeGreaterThan(on[i - 1].difficulty);
    expect(stepCatalogue().filter((s) => s.topic === 'vl-ear' && eligible(s, courseInput(base, 'jazz')))).toHaveLength(0);
    expect(TOPIC_GROUPS.some((g) => g.topics.includes('vl-ear'))).toBe(true);
    expect(GLYPHS[TOPIC_GLYPH['vl-ear']]).toBeDefined();
    expect(hasShortName('vl-ear')).toBe(true);
    expect(MINI_LESSONS[UNIT_LESSON['topic:vl-ear']]?.id).toBe('vl-ear');
    for (let l = 1; l <= 4; l++) expect(refresherFor(genTopic('vl-ear', 7, l, 'r'))?.id).toBe('vl-ear');
    expect(BADGES.some((b) => b.id === 'sub:chords/voice-leading')).toBe(true);
  });
});

describe('bass b-time 13: 5 against 3', () => {
  it('five even notes over each 3/4 bar, the waltz in the drums, on a 4-string bass', () => {
    const fam = guitarCatalog().find((f) => f.id === 'b-time')!;
    const lv = fam.levels.find((l) => l.id === 'b-time-13')!;
    expect(lv.level).toBe(13);
    for (const d of levelDrills(lv, 'fifths-up')) {
      expect(d.meter).toBe(3);
      expect(d.drums?.groove).toBe('waltz');
      const on = d.notes.filter((n) => n.beat < 12).map((n) => n.beat);
      expect(on).toHaveLength(20);
      on.forEach((b, k) => expect(b).toBeCloseTo(Math.floor(k / 5) * 3 + (k % 5) * 0.6, 6));
      expect(d.notes.every((n) => (n.string ?? 1) <= 4)).toBe(true);
    }
    // the 5:4 / 7:4 options are unchanged
    const d54 = generate({ family: 'b-time', kind: 'gm-cross', key: 4, hands: 'R', option: 0, instrument: 'bass' });
    expect(d54.notes.filter((n) => n.beat < 4)).toHaveLength(5);
    expect(d54.meter).not.toBe(3);
  });
});

describe('g-meter in the guitar level test and the placement probe', () => {
  it('the rhythm section has a g-meter step and places g-meter, rising', () => {
    const rh = guitarStrands().find((s) => s.id === 'rhythm')!;
    expect(rh.rungs.some((r) => r.level.startsWith('g-meter-'))).toBe(true);
    const meter = rh.rungs.map((r) => r.places['g-meter'] ?? 0);
    for (let i = 1; i < meter.length; i++) expect(meter[i]).toBeGreaterThanOrEqual(meter[i - 1]);
    expect(Math.max(...meter)).toBeGreaterThan(2);
  });
  it('the probe has a g-meter step after clean 8ths', () => {
    const p = guitarProbesFor([]).find((x) => x.family === 'g-meter')!;
    expect(p.after).toBe('g-rhythm');
    expect(generate(p.spec).notes.length).toBeGreaterThan(0);
    const fams = guitarCatalog().map((f) => ({ id: f.id, levels: f.levels.length }));
    expect(placeGuitar({ 'g-rhythm': 90, 'g-meter': 80 }, fams)['g-meter']).toBe(3);
    expect(placeGuitar({ 'g-meter': 80 }, fams)['g-meter']).toBe(1);
  });
});

describe('guitar levels follow their grade on the path (§ב.3)', () => {
  it('within every guitar family, the path order never goes down a grade; ids are unchanged', () => {
    const cat = stepCatalogue().filter((s) => s.ladder?.instrument === 'guitar');
    const byFam = new Map<string, PathStep[]>();
    for (const s of cat) byFam.set(s.ladder!.family, [...(byFam.get(s.ladder!.family) ?? []), s]);
    const grade = new Map(guitarCatalog().flatMap((f) => f.levels.map((l) => [l.id, (l as { grade?: number }).grade ?? 0] as const)));
    for (const [f, xs] of byFam) {
      const ord = xs.slice().sort(ladderOrder);
      for (let i = 1; i < ord.length; i++) expect(grade.get(ord[i].ladder!.ref)!, `${f}: ${ord[i].id}`).toBeGreaterThanOrEqual(grade.get(ord[i - 1].ladder!.ref)!);
      for (const s of xs) expect(s.id).toBe(`tech:${s.ladder!.ref}`);
    }
    // the audit's examples: picking 4 (grade 5) before picking 3 (grade 6); arps 6 before 5; prog 6 before 5
    const at = (f: string, id: string) => byFam.get(f)!.slice().sort(ladderOrder).findIndex((s) => s.id === `tech:${id}`);
    expect(at('g-picking', 'g-picking-4')).toBeLessThan(at('g-picking', 'g-picking-3'));
    expect(at('g-arps', 'g-arps-6')).toBeLessThan(at('g-arps', 'g-arps-5'));
    expect(at('g-prog', 'g-prog-6')).toBeLessThan(at('g-prog', 'g-prog-5'));
    expect(at('g-jazz', 'g-jazz-13')).toBeLessThan(at('g-jazz', 'g-jazz-10'));
  });
  it('other instruments keep their level order', () => {
    const cat = stepCatalogue().filter((s) => s.ladder && s.ladder.instrument !== 'guitar');
    const byFam = new Map<string, PathStep[]>();
    for (const s of cat) byFam.set(s.ladder!.family, [...(byFam.get(s.ladder!.family) ?? []), s]);
    for (const [f, xs] of byFam) {
      const ord = xs.slice().sort(ladderOrder).map((s) => s.ladder!.level);
      expect(ord, f).toEqual(ord.slice().sort((a, b) => a - b));
    }
  });
});
