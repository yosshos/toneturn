// HARRIS_2 + HARMONY_3 (docs/AUDIT-CONTENT-THEORY.md §ז.2): the theory behind Barry Harris unit 2 and the harmony and
// ear units H-1…H-8, checked note for note, and the generators, drills, lessons and path wiring built on it.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { TOPIC_GEN, asChoice, genTopic } from '../src/engine/topicKit';
import { BH, dimClass, dimPcs, isDim, M6_BASS, PASSING, partnerClass, ROLE, SCALES_6DIM, sixPcs, touches } from '../src/engine/topicsHarris2';
import { FUNCTIONS, MODE_IV, VAMPS, VAMPS7, mirror, negTriad, walkLine, DICT } from '../src/engine/topicsHarmony3';
import { floridErrors } from '../src/engine/topicsWritten';
import { catalog, generate } from '../src/engine/drills/generate';
import { generateGuitar, guitarCatalog } from '../src/engine/drills/guitar';
import { courseInput } from '../src/engine/courses';
import { eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { refresherFor } from '../src/content/refresher';

const pc = (m: number) => ((m % 12) + 12) % 12;
const set = (xs: number[]) => [...new Set(xs.map(pc))].sort((a, b) => a - b);
const NEW_TOPICS = ['bh-three-dim', 'bh-dim-roles', 'bh-m6-bass', 'function-ear', 'modal-cadence', 'borrowed-ext', 'jazz-dictation', 'planing', 'form-ear', 'negative-harmony'];

describe('§ג.3: three diminished collections and one 6th chord', () => {
  it('a 6th chord touches two collections; the third (the partner, on the 7th degree) shares no note with it', () => {
    for (let k = 0; k < 12; k++) {
      expect(touches(k, false).filter((n) => n === 2).length, `${k}6`).toBe(2);
      expect(touches(k, true).sort()).toEqual([0, 1, 3]);
      for (const minor of [false, true]) {
        expect(touches(k, minor)[partnerClass(k)]).toBe(0);
        expect(dimPcs(k + 11).some((p) => sixPcs(k, minor).includes(p))).toBe(false);
      }
    }
  });
  it('6th chord + partner = the 6th-diminished scale (major and minor); the partner = V7♭9 without its root', () => {
    for (let k = 0; k < 12; k++) {
      expect(set([...sixPcs(k, false), ...dimPcs(k + 11)])).toEqual(set(SCALES_6DIM.six.iv.map((x) => x + k)));
      expect(set([...sixPcs(k, true), ...dimPcs(k + 11)])).toEqual(set(SCALES_6DIM.msix.iv.map((x) => x + k)));
      expect(set(dimPcs(k + 11))).toEqual(set([4, 7, 10, 13].map((x) => x + k + 7)));
    }
  });
  it('Xm6 = the diminished on X with one note raised (the root a 4th above it); no other collection gives it', () => {
    for (let k = 0; k < 12; k++) {
      const m6 = set(sixPcs(k, true));
      const from = [0, 1, 2].filter((c) => dimPcs(c).some((_, i) => set(dimPcs(c).map((p, j) => (j === i ? p + 1 : p))).join() === m6.join()));
      expect(from).toEqual([dimClass(k)]);
      expect(pc(k + 6 + 1 + 5)).toBe(k); // the raised note G♭ → G, a 4th below the root
    }
  });
  it('two collections together are the half-whole scale, not the 6th-diminished scale', () => {
    expect(set([...dimPcs(0), ...dimPcs(1)])).toEqual(set(SCALES_6DIM.octa.iv));
    expect(set(SCALES_6DIM.octa.iv)).not.toEqual(set(SCALES_6DIM.six.iv));
  });
  it('bh-three-dim answers: the partner (L1), the root collection (L2), the scale (L3)', () => {
    for (let s = 1; s <= 60; s++) {
      const q1 = asChoice(TOPIC_GEN['bh-three-dim'].gen(s * 31, 1, 'x'));
      const name = q1.text!.en.split(' ')[0];
      const key = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].indexOf(name.replace(/m?6$/, ''));
      expect(q1.answer).toBe(`d${partnerClass(key)}`);
      expect(q1.choices.sort()).toEqual(['d0', 'd1', 'd2']);
      const q2 = asChoice(TOPIC_GEN['bh-three-dim'].gen(s * 31, 2, 'x'));
      const n2 = q2.text!.en.split(' → ')[1].replace('m6', '');
      expect(q2.answer).toBe(`d${dimClass(['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].indexOf(n2))}`);
      const q3 = asChoice(TOPIC_GEN['bh-three-dim'].gen(s * 31, 3, 'x'));
      expect(q3.answer).toBe(q3.ask.en.includes('m6') ? 'msix' : 'six');
    }
  });
});

describe('the diminished in the progression (BH-B, BH-C)', () => {
  it('the passing chords are diminished, between half-step bass moves in their direction', () => {
    for (const p of PASSING) {
      const i = p.ch.findIndex((k) => isDim(BH[k]));
      const [a, d, b] = [BH[p.ch[i - 1]].bass, BH[p.ch[i]].bass, BH[p.ch[i + 1]].bass];
      const dir = p.dir === 'up' ? 1 : -1;
      expect(pc(d - a), p.ch.join()).toBe(pc(dir));
      expect(pc(b - d), p.ch.join()).toBe(pc(dir));
    }
  });
  it('♯ii°7 and ♭III°7 are the same notes; I°7 over the root = ♯IV°7; auxiliary keeps root and 6th, dominant = vii°7 → I', () => {
    expect(set(BH.sii.pcs)).toEqual(set(BH.bIII.pcs));
    expect(set(BH.Idim.pcs)).toEqual(set(BH.sIV.pcs));
    for (const r of ROLE) {
      const i = r.ch.findIndex((k) => isDim(BH[k]));
      const before = BH[r.ch[i - 1]];
      const dim = BH[r.ch[i]];
      const after = BH[r.ch[i + 1]];
      if (r.role === 'aux') {
        expect(before.bass).toBe(dim.bass);
        expect(after).toEqual(before);
        expect(before.pcs.filter((p) => dim.pcs.map(pc).includes(pc(p))).length).toBe(2);
      }
      if (r.role === 'dom') {
        expect(dim).toBe(BH.vii);
        expect(pc(after.bass - dim.bass)).toBe(1);
        expect(Math.abs(pc(dim.bass - before.bass) - 12 * (pc(dim.bass - before.bass) > 6 ? 1 : 0))).toBeGreaterThan(1);
      }
      if (r.role === 'passing') expect(Math.abs(dim.bass - before.bass)).toBe(1);
    }
  });
  it('bh-dim-roles L1: the answer is the one diminished chord', () => {
    for (let s = 1; s <= 40; s++) {
      const q = asChoice(TOPIC_GEN['bh-dim-roles'].gen(s * 17, 1, 'x'));
      expect(['p2', 'p3', 'p4']).toContain(q.answer);
    }
  });
});

describe('one minor 6th, three basses (BH-E)', () => {
  it('Cm6 over A = Am7♭5, over F = F9; the generator names follow', () => {
    for (let k = 0; k < 12; k++) {
      const m6 = sixPcs(k, true);
      expect(set([k + 9, ...m6])).toEqual(set([0, 3, 6, 10].map((x) => x + k + 9)));
      expect(set([k + 5, ...m6])).toEqual(set([0, 4, 7, 10, 14].map((x) => x + k + 5)));
    }
    expect(M6_BASS.map((b) => b.off)).toEqual([0, 9, 5]);
    for (let s = 1; s <= 80; s++) {
      const q = asChoice(TOPIC_GEN['bh-m6-bass'].gen(s * 13, 2, 'x'));
      const r = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].indexOf(q.text!.en.match(/^[A-G][♭♯]?/)![0]);
      const a = Number(q.answer.slice(1));
      if (q.ask.en.includes('9 without')) expect(set(sixPcs(a, true))).toEqual(set([4, 7, 10, 14].map((x) => x + r)));
      else if (q.ask.en.includes('m7♭5 has')) expect(set(sixPcs(a, true))).toEqual(set([0, 3, 6, 10].map((x) => x + r)));
      else if (q.ask.en.includes('which m7♭5')) expect(set([0, 3, 6, 10].map((x) => x + a))).toEqual(set(sixPcs(r, true)));
      else expect(set([4, 7, 10, 14].map((x) => x + a))).toEqual(set(sixPcs(r, true)));
    }
  });
});

describe('harmony and ear (H-1…H-8)', () => {
  it('functions: I vi / i ♭VI tonic, IV ii / iv ii° pre-dominant, V vii° dominant; iii never asked', () => {
    expect(FUNCTIONS.filter((f) => f.fn === 'T').map((f) => f.rn)).toEqual(['I', 'vi', 'i', '♭VI']);
    expect(FUNCTIONS.some((f) => f.rn === 'iii')).toBe(false);
  });
  it('every vamp fits its own mode and no other mode offered with it', () => {
    for (const pool of [VAMPS, VAMPS7])
      for (const [m, v] of Object.entries(pool)) {
        const notes = set(v.ch.flatMap((c) => [...c.pcs, c.bass]));
        expect(notes.every((p) => MODE_IV[m].includes(p)), m).toBe(true);
        for (const o of Object.keys(pool)) if (o !== m) expect(notes.every((p) => MODE_IV[o].includes(p)), `${m} fits ${o}`).toBe(false);
      }
  });
  it('negative harmony: the axis swaps C–G, E–E♭; V → iv, IV → v, I → i, ii → ♭VII, vi → ♭III, iii → ♭VI; G7 → Fm6', () => {
    expect([0, 7, 4, 3, 2, 5, 11, 8].map((p) => mirror(0, p))).toEqual([7, 0, 3, 4, 5, 2, 8, 11]);
    const n = (deg: number, minor: boolean) => negTriad(0, deg, minor);
    expect(n(7, false)).toEqual({ root: 5, minor: true });
    expect(n(5, false)).toEqual({ root: 7, minor: true });
    expect(n(0, false)).toEqual({ root: 0, minor: true });
    expect(n(2, true)).toEqual({ root: 10, minor: false });
    expect(n(9, true)).toEqual({ root: 3, minor: false });
    expect(n(4, true)).toEqual({ root: 8, minor: false });
    expect(set([7, 11, 2, 5].map((p) => mirror(0, p)))).toEqual(set([5, 8, 0, 2]));
    // the mirrored triad's notes really are the reflection
    for (let k = 0; k < 12; k++)
      for (const [deg, minor] of [[0, false], [2, true], [4, true], [5, false], [7, false], [9, true]] as [number, boolean][]) {
        const tri = (minor ? [0, 3, 7] : [0, 4, 7]).map((x) => x + k + deg);
        const r = negTriad(k, deg, minor);
        expect(set(tri.map((p) => mirror(k, p)))).toEqual(set((r.minor ? [0, 3, 7] : [0, 4, 7]).map((x) => x + r.root)));
      }
  });
  it('walking bass: roots on beat 1, a half step into each next root, spelling matches the pitch', () => {
    for (let k = 0; k < 12; k++)
      for (const pats of [['arp', 'scale'], ['down', 'arp'], ['scale', 'down']] as [string, string][])
        for (const app of [['below', 'above'], ['above', 'below']] as ['below' | 'above', 'below' | 'above'][]) {
          const w = walkLine(k, pats, app);
          expect(w.midis).toHaveLength(9);
          expect([pc(w.midis[0]), pc(w.midis[4]), pc(w.midis[8])]).toEqual([pc(k + 2), pc(k + 7), pc(k)]);
          expect(Math.abs(w.midis[3] - w.midis[4])).toBe(1);
          expect(Math.abs(w.midis[7] - w.midis[8])).toBe(1);
          w.sp.forEach((s, i) => expect(pc([0, 2, 4, 5, 7, 9, 11][s.l] + s.a)).toBe(pc(w.midis[i])));
          for (let i = 1; i < 9; i++) expect(Math.abs(w.midis[i] - w.midis[i - 1])).toBeLessThanOrEqual(12);
        }
  });
  it('tritone substitutes (dictation L2) fall a half step into their target', () => {
    for (const line of DICT[1])
      line.forEach(([d, q], i) => {
        if (q !== 'dom7' || i === line.length - 1) return;
        expect(pc(line[i + 1][0] - d)).toBe(11);
      });
  });
  it('third / fifth species faults: a passing dissonance is fine; a leap into one, a dissonant downbeat and parallel 5ths are not', () => {
    const cf = [48, 50, 48];
    const ok = [[{ p: 55, d: 1 }, { p: 57, d: 1 }, { p: 59, d: 1 }, { p: 60, d: 1 }], [{ p: 65, d: 1 }, { p: 64, d: 1 }, { p: 62, d: 1 }, { p: 59, d: 1 }]];
    expect([...floridErrors(cf, ok, 60)]).toEqual([]);
    const leap = [[{ p: 55, d: 1 }, { p: 62, d: 1 }, { p: 60, d: 1 }, { p: 60, d: 1 }], ok[1]];
    expect(floridErrors(cf, leap, 60).has('diss-weak')).toBe(true);
    expect(floridErrors(cf, [[{ p: 53, d: 2 }, { p: 55, d: 2 }], ok[1]], 60).has('diss-down')).toBe(true);
    expect(floridErrors(cf, [[{ p: 55, d: 2 }, { p: 59, d: 2 }], [{ p: 57, d: 2 }, { p: 59, d: 2 }]], 60).has('par')).toBe(true);
    // a half-note neighbour is not allowed (only a passing half); a quarter neighbour is
    expect(floridErrors([48, 48], [[{ p: 55, d: 2 }, { p: 53, d: 2 }]], 55).has('diss-weak')).toBe(true);
    expect(floridErrors([48, 48], [[{ p: 55, d: 1 }, { p: 53, d: 1 }, { p: 55, d: 2 }]], 55).size).toBe(0);
  });
  it('counterpoint 4–5 generate in every seed, with every answer showing up', () => {
    for (const l of [4, 5]) {
      const seen = new Set<string>();
      for (let s = 1; s <= 60; s++) seen.add(asChoice(TOPIC_GEN.counterpoint.gen(s * 101, l, 'x')).answer);
      expect([...seen].sort()).toEqual(['diss-down', 'diss-weak', 'none', 'par']);
    }
  });
});

describe('drills (k-sixdim 11–13, k-reharm 9–10, g-harris 7)', () => {
  const CAT = catalog();
  const lv = (id: string) => CAT.flatMap((f) => f.levels).find((l) => l.id === id)!;
  it('the auxiliary: root and 6th written held, never struck again inside the bar; the 3rd and 5th dip a half step', () => {
    for (const sp of lv('k-sixdim-11').specs)
      for (let key = 0; key < 12; key++) {
        const d = generate({ ...sp, key });
        const end = Math.max(...d.notes.map((n) => n.beat));
        const held = d.notes.filter((n) => n.dur === 4 && n.hand === 'R' && n.beat < end - 4);
        expect(held.length).toBeGreaterThanOrEqual(4);
        for (const h of held) {
          expect([0, 9]).toContain(pc(h.pitch - (sp.option === 1 && h.beat === 4 ? key + 5 : key)));
          const inside = d.notes.filter((n) => n.beat > h.beat && n.beat < h.beat + 4 && pc(n.pitch) === pc(h.pitch));
          expect(inside).toEqual([]);
        }
        const sets = d.goal.chordSets!;
        // the moving pair: never allowed to re-strike the held pitch classes
        expect(sets.some((c) => c.required.length === 2)).toBe(true);
      }
  });
  it('chords move to chords: every voice moves at most a whole step; the 6th chords alternate with the scale diminished', () => {
    for (const sp of lv('k-sixdim-12').specs)
      for (let key = 0; key < 12; key += 5) {
        const d = generate({ ...sp, key });
        const ids = [...new Set(d.notes.filter((n) => n.chordId !== undefined).map((n) => n.chordId!))];
        const rh = ids.map((id) => d.notes.filter((n) => n.chordId === id && n.hand === 'R').map((n) => n.pitch).sort((a, b) => a - b));
        // inside each position's group (6, °7 above, 6, °7 below) — between groups the hand moves to the next position
        for (let i = 1; i < 16; i++) if (i % 4 !== 0) rh[i].forEach((p, j) => expect(Math.abs(p - rh[i - 1][j]), `${d.itemId} ${i}`).toBeLessThanOrEqual(2));
        rh.forEach((c, i) => {
          if (i % 2 === 1 && i < 16) expect(set(c)).toEqual(set(dimPcs(key + 11)));
          else expect(set(c)).toEqual(set(sixPcs(key, !!sp.minor)));
        });
      }
  });
  it('one minor 6th over three basses, then the 6th chord a 4th above the 9 chord', () => {
    for (let key = 0; key < 12; key++) {
      const d = generate({ ...lv('k-sixdim-13').specs[0], key });
      const lh = d.notes.filter((n) => n.hand === 'L').map((n) => pc(n.pitch));
      expect(lh).toEqual([key, key + 9, key + 5, key + 10].map(pc));
    }
  });
  it('borrowed comping and planing generate in every key; planing keeps one exact shape', () => {
    for (const id of ['k-reharm-9', 'k-reharm-10'])
      for (const sp of lv(id).specs)
        for (let key = 0; key < 12; key++) expect(generate({ ...sp, key }).notes.length).toBeGreaterThan(8);
    const d = generate({ ...lv('k-reharm-10').specs[1], key: 0 });
    const ids = [...new Set(d.notes.map((n) => n.chordId!))];
    const shapes = ids.map((id) => {
      const rh = d.notes.filter((n) => n.chordId === id && n.hand === 'R').map((n) => n.pitch).sort((a, b) => a - b);
      return rh.map((p) => p - rh[0]).join();
    });
    expect(new Set(shapes).size).toBe(1);
  });
  it('g-harris 7: drop-2 on 6-5-4-3 (major, minor) and 5-4-3-2 (minor), every key', () => {
    const f = guitarCatalog().find((x) => x.id === 'g-harris')!;
    const l7 = f.levels.find((l) => l.id === 'g-harris-7')!;
    l7.specs.forEach((sp, o) => {
      for (let key = 0; key < 12; key++) {
        const d = generateGuitar({ ...sp, key });
        const strs = new Set(d.notes.map((n) => n.string));
        expect([...strs].sort(), `op ${o} key ${key}`).toEqual(o === 2 ? [2, 3, 4, 5] : [3, 4, 5, 6]);
      }
    });
  });
});

describe('wiring', () => {
  const base: PathInput = {
    track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [],
    packs: ['jazz', 'maqam', 'absolute', 'production', 'post-tonal'], plays: [], minutes: 10, ratings: {}, events: [],
    facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-14T10:00:00Z'),
  };
  it('the Barry Harris and jazz topics are on the jazz path after what they build on; the harmony topics on the ear path', () => {
    const cat = stepCatalogue();
    const on = (c: 'ear' | 'jazz', t: string) => cat.filter((s) => s.topic === t && eligible(s, courseInput(base, c)));
    for (const t of ['bh-three-dim', 'bh-dim-roles', 'bh-m6-bass', 'jazz-dictation', 'planing']) expect(on('jazz', t).length, t).toBeGreaterThan(0);
    for (const t of ['function-ear', 'modal-cadence', 'borrowed-ext', 'form-ear', 'negative-harmony']) expect(on('ear', t).length, t).toBeGreaterThan(0);
    const d = (t: string, l = 1) => cat.find((s) => s.id === `topic:${t}:${l}`)!.difficulty;
    expect(d('bh-three-dim')).toBeGreaterThan(d('bh-scale'));
    expect(d('bh-dim-roles')).toBeGreaterThan(d('bh-three-dim'));
    expect(d('bh-m6-bass')).toBeGreaterThan(d('bh-family', 2));
    expect(d('function-ear', 3)).toBeGreaterThan(d('function-ear', 2));
    expect(d('jazz-dictation')).toBeGreaterThan(d('jazz-changes', 2));
  });
  it('every new topic and level opens with its own lesson, and every lesson exists', () => {
    for (const t of NEW_TOPICS) {
      expect(MINI_LESSONS[UNIT_LESSON[`topic:${t}`]], t).toBeDefined();
      for (let l = 1; l <= TOPIC_GEN[t].levels.length; l++) expect(refresherFor(genTopic(t, 7, l, 'r'))?.id).toBe(UNIT_LESSON[`topic:${t}`]);
    }
    for (const id of ['k-sixdim-5', 'k-sixdim-11', 'k-sixdim-12', 'k-sixdim-13', 'k-reharm-9', 'k-reharm-10', 'g-harris-7']) expect(MINI_LESSONS[UNIT_LESSON[`tech:${id}`]], id).toBeDefined();
  });
});
