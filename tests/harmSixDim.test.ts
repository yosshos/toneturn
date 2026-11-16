// Harmonise a melody in 6-dim blocks, drop 2, borrowing, a line into blocks, triads (AUDIT-DEPTH-3 C1, #1, #3): the
// Barry Harris conversions of docs/BARRY-HARRIS-THEORY.md §3/§5 (owner-confirmed), in all 12 keys, on every served head.
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { levelDrills } from '../src/engine/drills/plan';
import { parseChart } from '../src/engine/charts';
import { builtStyles, headIn, notesIn, sixDimUnder, sixthOf, spellFrom } from '../src/engine/heads';
import { decodeHead, harmPlan, SERVED, WRITTEN_STYLES } from '../src/engine/drills/headDrills';
import { classify, gradeVoicings } from '../src/engine/drills/voiceLead';
import { HEADS } from '../src/content/heads';
import { KEYS_LEVEL_DIFF } from '../src/engine/path';
import { familyLevelCount } from '../src/engine/badges';
import type { DrillSpec } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;
const ch = (sym: string) => parseChart(sym).chords[0];
const fam = () => catalog().find((f) => f.id === 'k-harm')!;
const lv = (n: number) => fam().levels.find((l) => l.id === `k-harm-${n}`)!;

describe('the 6-dim conversions (BARRY-HARRIS-THEORY §3, §5)', () => {
  it('Dm7 = F6, Dø = Fm6, G7 → Dm6, Cmaj7 → C6, Cm6 stays, in all 12 keys', () => {
    for (let k = 0; k < 12; k++) {
      const n = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][k];
      expect(sixthOf(ch(`${n}m7`))).toEqual({ root: pc(k + 3), q: '6' });
      expect(sixthOf(ch(`${n}m7b5`))).toEqual({ root: pc(k + 3), q: 'm6' });
      expect(sixthOf(ch(`${n}7`))).toEqual({ root: pc(k + 7), q: 'm6' });
      expect(sixthOf(ch(`${n}maj7`))).toEqual({ root: k, q: '6' });
      expect(sixthOf(ch(`${n}6`))).toEqual({ root: k, q: '6' });
      expect(sixthOf(ch(`${n}m6`))).toEqual({ root: k, q: 'm6' });
    }
  });
  it('a 6th-chord tone gets the 6th chord, a dim tone the dim a half step under its root, others nothing', () => {
    // Dm7 in C: F6 (F A C D), E°7 (E G B♭ D♭); the bass stays D
    const d = ch('Dm7');
    for (const m of [65, 69, 72, 74]) expect(sixDimUnder(m, d)).toMatchObject({ root: 5, q: '6', bassPc: 2, name: 'F6' });
    for (const m of [64, 67, 70, 73]) expect(sixDimUnder(m, d)).toMatchObject({ root: 4, q: 'dim7', bassPc: 2, name: 'E°7' });
    for (const m of [66, 68, 71]) expect(sixDimUnder(m, d)).toBeNull();
    // G7: Dm6 (D F A B) and C♯°7 (C♯ E G B♭), the bass G
    const g = ch('G7');
    expect(sixDimUnder(71, g)).toMatchObject({ root: 2, q: 'm6', bassPc: 7, name: 'Dm6' });
    expect(sixDimUnder(67, g)).toMatchObject({ root: 1, q: 'dim7', name: 'C♯°7' });
    // B♭7 → Fm6 / E°7; E♭maj7 → E♭6 / D°7 (spelled from the chart's letters)
    expect(sixDimUnder(68, ch('Bb7'))).toMatchObject({ name: 'Fm6' });
    expect(sixDimUnder(62, ch('Ebmaj7'))).toMatchObject({ name: 'D°7' });
    expect(spellFrom('F#m7', 2, 3)).toBe('A');
  });
});

describe('k-harm 9–13: the new styles on every served head', () => {
  const NEW = [
    [9, 'sixdim'],
    [10, 'sixdrop2'],
    [11, 'borrow'],
    [12, 'peaks'],
    [13, 'triad'],
  ] as const;
  it('levels, ratings (triads first at 1250, then the 6-dim ladder 1450 → 1680) and a title per level', () => {
    expect(builtStyles().map((s) => s.id).slice(4)).toEqual(['shared', 'sixdim', 'sixdrop2', 'borrow', 'peaks', 'triad']);
    for (const [n, id] of NEW) {
      expect(lv(n), id).toBeDefined();
      expect(lv(n).specs.every((s) => s.kind === `hm-${id}`)).toBe(true);
      expect(lv(n).keys).toHaveLength(12);
    }
    expect(KEYS_LEVEL_DIFF['k-harm-13']).toBe(1250);
    expect([9, 10, 11, 12].map((n) => KEYS_LEVEL_DIFF[`k-harm-${n}`])).toEqual([1450, 1520, 1600, 1680]);
    expect(familyLevelCount('k-harm')).toBeGreaterThanOrEqual(13);
  });
  it('voice-led styles: the clean path passes the grader, the melody on top, every note of the block in the style (12 keys)', () => {
    for (const [, id] of NEW.filter(([, x]) => !WRITTEN_STYLES.includes(x)))
      for (const i of SERVED)
        for (let k = 0; k < 12; k++) {
          const s = { family: 'k-harm', kind: `hm-${id}`, key: k, hands: 'RL', option: i * 16 } as DrillSpec;
          const { goal, path } = harmPlan(s);
          path.forEach((v, j) => expect(Math.max(...v), `${HEADS[i].id} ${k} ${id}`).toBe(goal.chords[j].melody));
          const steps = gradeVoicings(path.map((v, j) => [36 + pc((goal.chords[j].bassPc ?? goal.chords[j].root) - 36), ...v]), goal);
          expect(steps.every((x) => x.cls.ok), `${HEADS[i].id} ${k} ${id}`).toBe(true);
          if (id === 'sixdim' || id === 'sixdrop2') for (const c of goal.chords) expect(['6', 'm6', 'dim7']).toContain(c.q);
        }
  });
  it('borrowing: the melody holds while one inner voice goes a half step into the dim and back (oblique motion)', () => {
    for (const d of levelDrills(lv(11), 'fifths-up')) {
      const singles = d.notes.filter((n) => n.chordId === undefined && n.hand === 'R');
      const { head, phrase } = decodeHead(d.spec.option);
      const mel = notesIn(headIn(head, d.spec.key, 'piano'), phrase * 4, phrase * 4 + 4).map((n) => `${n.pitch}@${(n.beat - phrase * 16).toFixed(3)}`);
      const borrowed = singles.filter((n) => !mel.includes(`${n.pitch}@${n.beat.toFixed(3)}`));
      expect(borrowed.length, d.title.en).toBeGreaterThan(0);
      for (const b of borrowed) {
        // a block voice sounding just before, a half step away; the melody above it still held
        const block = d.notes.filter((n) => n.chordId !== undefined && n.beat < b.beat && n.beat + n.dur >= b.beat - 1e-6);
        const top = block.reduce((a, n) => (n.pitch > a.pitch ? n : a));
        expect(top.beat + top.dur).toBeGreaterThan(b.beat);
      }
      expect(d.goal.vl).toBeUndefined();
      expect(d.goal.chordSets!.length).toBeGreaterThan(1);
    }
  });
  it('a line into blocks: one block a bar at its peak, every other melody note a single note', () => {
    for (const d of levelDrills(lv(12), 'fifths-up')) {
      const { head, phrase } = decodeHead(d.spec.option);
      const mel = notesIn(headIn(head, d.spec.key, 'piano'), phrase * 4, phrase * 4 + 4);
      const blocks = [...new Set(d.notes.filter((n) => n.chordId !== undefined).map((n) => n.chordId))];
      expect(blocks.length).toBeLessThanOrEqual(4);
      expect(blocks.length).toBeGreaterThan(0);
      const rh = d.notes.filter((n) => n.hand === 'R');
      for (const m of mel) expect(rh.some((n) => n.pitch === m.pitch && Math.abs(n.beat - (m.beat - phrase * 16)) < 1e-6)).toBe(true);
    }
  });
  it('every item of the new levels generates in all 12 keys and starts in free time', async () => {
    const { hasRubato } = await import('../src/engine/drills/rubato');
    for (const [n] of NEW)
      for (const s of lv(n).specs)
        for (let k = 0; k < 12; k++) {
          const d = generate({ ...s, key: k } as DrillSpec);
          expect(d.notes.length).toBeGreaterThan(3);
          if (k === 0) expect(hasRubato(d)).toBe(true);
        }
  });
  it('classify: a block with the bass on the chart root is right; a bass on the 6th chord’s root is named', () => {
    const c = sixDimUnder(72, ch('Dm7'))!;
    expect(classify([50, 65, 69, 72], c, { type: 'triad', bass: true })).toMatchObject({ ok: true });
    expect(classify([53, 65, 69, 72], c, { type: 'triad', bass: true }).kind).toBe('bass');
  });
});

describe('melody-fit 4–5: the ear twins of the 6-dim blocks', () => {
  it('level 4: the answer matches the block played (6th chord or dim), 200 seeds; level 5: three textures', async () => {
    await import('../src/engine/topics');
    const { TOPIC_GEN } = await import('../src/engine/topicKit');
    const T = TOPIC_GEN['melody-fit'];
    expect(T.levels).toHaveLength(5);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const q = T.gen(seed, 4, 'x') as unknown as { answer: string; choices: string[]; difficulty: number; stimulus: { events: { midi: number; start: number }[] }[] };
      seen.add(q.answer);
      expect(q.choices).toEqual(['six', 'dim']);
      // the last block: its four notes form a 6 / m6 chord (six) or a dim7 (dim)
      const ev = q.stimulus[0].events;
      const lastT = Math.max(...ev.map((e) => e.start));
      const pcs = [...new Set(ev.filter((e) => e.start === lastT).map((e) => e.midi % 12))].sort((a, b) => a - b);
      const isDim = pcs.length === 4 && pcs.every((p, i) => (pcs[(i + 1) % 4] - p + 12) % 12 === 3);
      expect(isDim, `seed ${seed}`).toBe(q.answer === 'dim');
    }
    expect([...seen].sort()).toEqual(['dim', 'six']);
    const tex = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const q = T.gen(seed, 5, 'x') as unknown as { answer: string; difficulty: number };
      tex.add(q.answer);
      expect(q.difficulty).toBe(1550);
    }
    expect(tex.size).toBe(3);
  });
});
