// BH-G (docs/AUDIT-CONTENT-THEORY.md §ז.2): the pivot — Barry Harris's pivot arpeggio (owner 2026-11-14: some notes of
// an arpeggio moved an octave, same order, new contour). The theory note for note, the topic, the keys drills (harris
// 19–24), the guitar levels (g-harris 8–10), the bass levels (b-barry 7–8), the lesson and the path wiring.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { TOPIC_GEN, asChoice, genTopic } from '../src/engine/topicKit';
import { ARP_QUALITIES, ARP_QUALITY, BEBOP_MAJOR, dropOf, mirrorArp, pivotArp, pivotEnclosureLine, scalePivotLine, straightArp, topTone } from '../src/engine/pivotArp';
import { iiViLine } from '../src/engine/topicsPivotArp';
import { catalog, generate } from '../src/engine/drills/generate';
import { generateGuitar, guitarCatalog } from '../src/engine/drills/guitar';
import { hasRubato } from '../src/engine/drills/rubato';
import { courseInput } from '../src/engine/courses';
import { eligible, stepCatalogue, STEP_PREREQ, type PathInput } from '../src/engine/path';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { refresherFor } from '../src/content/refresher';
import { noteAt, TUNINGS } from '../src/engine/fretboard';
const STD = TUNINGS[0];

const pc = (m: number) => ((m % 12) + 12) % 12;

describe('the pivot', () => {
  it('Cmaj7 = C5 E4 G4 B4; Cm7 = C5 E♭4 G4 B♭4; every quality, any root', () => {
    expect(pivotArp(60, 'maj7')).toEqual([72, 64, 67, 71]);
    expect(pivotArp(60, 'm7')).toEqual([72, 63, 67, 70]);
    expect(pivotArp(60, '7')).toEqual([72, 64, 67, 70]);
    expect(pivotArp(60, 'm7b5')).toEqual([72, 63, 66, 70]);
    expect(pivotArp(60, '6')).toEqual([72, 64, 67, 69]);
    expect(pivotArp(60, 'dim7')).toEqual([72, 63, 66, 69]);
    expect(pivotArp(55, 'maj7')).toEqual([67, 59, 62, 66]); // Gmaj7 = G B D F♯
    expect(straightArp(60, 'maj7')).toEqual([60, 64, 67, 71]);
  });
  it('the drop is a minor 6th over a major 3rd, a major 6th over a minor 3rd; then it climbs, all below the top', () => {
    for (let r = 48; r < 60; r++)
      for (const q of ARP_QUALITIES) {
        const l = pivotArp(r, q);
        expect(dropOf(l), `${r}${q}`).toBe(ARP_QUALITY[q][1] === 4 ? 8 : 9);
        expect(l[1] < l[2] && l[2] < l[3] && l[3] < l[0]).toBe(true);
        expect(new Set(l.map(pc))).toEqual(new Set(ARP_QUALITY[q].map((x) => pc(r + x))));
      }
  });
  it('rotations: the 3rd on top drops to the 5th and climbs 5-7-1; the mirror falls from a leap', () => {
    expect(pivotArp(60, 'maj7', 1)).toEqual([76, 67, 71, 72]);
    expect(pivotArp(60, 'maj7', 2)).toEqual([79, 71, 72, 76]);
    expect(pivotArp(60, 'maj7', 3)).toEqual([83, 72, 76, 79]);
    for (let r = 0; r < 4; r++) expect(topTone(pivotArp(60, 'm7', r), 0, 'm7')).toBe(r);
    expect(mirrorArp(60, 'maj7')).toEqual([60, 71, 67, 64]);
  });
});

describe('topic bh-pivot-arp', () => {
  it('L1 answers: the pivot starts on the root on top and drops; the straight arpeggio climbs from it', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 40; s++) {
      const q = asChoice(TOPIC_GEN['bh-pivot-arp'].gen(s * 31, 1, 'x'));
      seen.add(q.answer);
      const st = q.stimulus[0] as { midis: number[] };
      if (q.answer === 'top') expect(st.midis[0]).toBeGreaterThan(st.midis[1]);
      else expect(st.midis[0]).toBeLessThan(st.midis[1]);
    }
    expect(seen.size).toBe(2);
  });
  it('L2: the top note is the chord tone named; L3: the line is the chord named', () => {
    for (let s = 1; s <= 60; s++) {
      const q2 = asChoice(TOPIC_GEN['bh-pivot-arp'].gen(s * 17, 2, 'x'));
      const line = (q2.stimulus[2] as { midis: number[] }).midis;
      const chord = (q2.stimulus[0] as { midis: number[] }).midis;
      const root = pc(chord[0]);
      const rot = +q2.answer.slice(1);
      expect(pc(line[0] - root)).toBe([0, chord[1] - chord[0], chord[2] - chord[0], chord[3] - chord[0]][rot] % 12);
      const q3 = asChoice(TOPIC_GEN['bh-pivot-arp'].gen(s * 17, 3, 'x'));
      const l3 = (q3.stimulus[0] as { midis: number[] }).midis;
      const iv = [l3[1], l3[2], l3[3]].map((m) => pc(m - l3[0]));
      expect(iv).toEqual(ARP_QUALITY[q3.answer as 'maj7'].slice(1));
    }
  });
  it('L4: exactly one bar starts from the top, over the chord answered', () => {
    for (let key = 0; key < 12; key++)
      for (let at = 0; at < 3; at++)
        for (const minor of [false, true]) {
          const l = iiViLine(key, at, minor);
          l.midis.forEach((b, i) => {
            expect(pc(b[0])).toBe(pc(key + [2, 7, 0][i]));
            expect(b[0] > b[1], `${key} ${at} ${i}`).toBe(i === at);
          });
        }
    const seen = new Set<string>();
    for (let s = 1; s <= 40; s++) seen.add(asChoice(TOPIC_GEN['bh-pivot-arp'].gen(s * 7, 4, 'x')).answer);
    expect(seen.size).toBe(3);
  });
});

describe('scale plus pivot, pivot plus enclosure', () => {
  it('scale plus pivot in C6: C B A A♭ | G A C E | G F E D | C, chord tones on the beats', () => {
    expect(scalePivotLine(72, '6', 2).line.map((n) => n.p)).toEqual([72, 71, 69, 68, 67, 57, 60, 64, 67, 65, 64, 62, 60]);
    for (let k = 0; k < 12; k++)
      for (const q of ['6', '7'] as const)
        for (const at of [1, 2, 3]) {
          const l = scalePivotLine(67 + ((k - 67 + 120) % 12), q, at).line;
          const ct = (q === '6' ? [0, 4, 7, 9] : [0, 4, 7, 10]).map((x) => pc(k + x));
          for (const n of l) if (Number.isInteger(n.beat)) expect(ct, `${k}${q} at ${at} beat ${n.beat}`).toContain(pc(n.p));
          // the pivot: on beat `at`, a drop of more than a 5th, then the climb
          const piv = l.filter((n) => n.beat >= at && n.beat < at + 2);
          expect(piv[0].p - piv[1].p).toBeGreaterThan(7);
          expect(piv[1].p < piv[2].p && piv[2].p < piv[3].p).toBe(true);
        }
  });
  it('pivot plus enclosure: chord tones on the beats, bebop-scale notes and half steps between, pivots and enclosures alternate', () => {
    expect(pivotEnclosureLine(0, 0, 64).map((n) => n.p)).toEqual([72, 83, 81, 78, 79, 65, 64, 59, 60, 71, 69, 66, 67, 77, 76, 71, 72]);
    for (let k = 0; k < 12; k++)
      for (const from of [0, 2] as const) {
        const l = pivotEnclosureLine(k, from, 64);
        const ct = [0, 4, 7, 9].map((x) => pc(k + x));
        l.forEach((n, i) => {
          if (i % 2 === 0) expect(ct).toContain(pc(n.p));
          else {
            expect(ct).not.toContain(pc(n.p));
            const next = l[i + 1].p;
            if (Math.floor(i / 2) % 2 === 0) {
              // pivot: the bebop-scale note below the chord tone, an octave away; the next chord tone a step from it
              expect(BEBOP_MAJOR.map((x) => pc(k + x))).toContain(pc(n.p));
              expect(Math.abs(n.p - l[i - 1].p)).toBeGreaterThan(7);
              expect(Math.abs(next - n.p)).toBeLessThanOrEqual(2);
            } else expect(next - n.p).toBe(1); // enclosure: the half step below the target
          }
        });
      }
  });
});

describe('keys: harris 19–24, guitar: g-harris 8–10, bass: b-barry 7–8', () => {
  const CAT = catalog();
  const lv = (id: string) => CAT.flatMap((f) => f.levels).find((l) => l.id === id)!;
  it('harris 19: the C maj7 pivot is C E G B with the root on top, then down to the root', () => {
    const d = generate({ ...lv('harris-19').specs[0], key: 0 });
    const ps = d.notes.filter((n) => n.hand === 'R').sort((a, b) => a.beat - b.beat).map((n) => n.pitch);
    expect(ps).toEqual([72, 64, 67, 71, 72, 71, 67, 64, 60]);
  });
  it('every item generates in every key, chord tones on the beats, and gets the free-time stage first', () => {
    for (const id of ['harris-19', 'harris-20', 'harris-21', 'harris-22', 'harris-23', 'harris-24'])
      for (const sp of lv(id).specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key });
          expect(d.notes.length, `${id} ${key}`).toBeGreaterThan(8);
          expect(hasRubato(d), id).toBe(true);
          const ps = d.notes.map((n) => n.pitch);
          expect(Math.min(...ps)).toBeGreaterThanOrEqual(48);
          expect(Math.max(...ps)).toBeLessThanOrEqual(88);
        }
  });
  it('harris 20: each chord tone in turn on top (rotations)', () => {
    const d = generate({ ...lv('harris-21').specs[0], key: 0 });
    const ps = d.notes.sort((a, b) => a.beat - b.beat).map((n) => n.pitch);
    expect(ps.slice(0, 16)).toEqual([...pivotArp(48, 'maj7', 0), ...pivotArp(48, 'maj7', 1), ...pivotArp(48, 'maj7', 2), ...pivotArp(48, 'maj7', 3)]);
  });
  it('harris 22: each chord of the ii–V–I starts with its pivot on its downbeat', () => {
    for (const sp of lv('harris-22').specs)
      for (let key = 0; key < 12; key++) {
        const d = generate({ ...sp, key });
        for (const [i, deg] of [2, 7, 0].entries()) {
          const bar = d.notes.filter((n) => n.beat >= i * 4 && n.beat < i * 4 + 2).sort((a, b) => a.beat - b.beat);
          expect(pc(bar[0].pitch)).toBe(pc(key + deg));
          expect(bar[0].pitch - bar[1].pitch).toBeGreaterThanOrEqual(8);
        }
      }
  });
  it('g-harris 8: the pivot on strings 4-3-2 and 3-2-1, in every key', () => {
    const f = guitarCatalog().find((x) => x.id === 'g-harris')!;
    const l8 = f.levels.find((l) => l.id === 'g-harris-8')!;
    const tu = STD;
    l8.specs.forEach((sp, o) => {
      for (let key = 0; key < 12; key++) {
        const d = generateGuitar({ ...sp, key });
        expect(d.notes.length, `op ${o} key ${key}`).toBeGreaterThanOrEqual(10);
        if (o < 3) {
          const first = d.notes.filter((n) => n.beat < 2).sort((a, b) => a.beat - b.beat);
          expect(first.map((n) => n.string)).toEqual([2, 4, 3, 2]);
          const ms = first.map((n) => noteAt(tu, n.string!, n.fret!));
          expect(ms.map((m) => pc(m - ms[0]))).toEqual([0, ...[[0, 4, 7, 11], [0, 3, 7, 10], [0, 4, 7, 10]][o].slice(1)]);
          expect(ms[0] - ms[1]).toBe(o === 1 ? 9 : 8);
        }
      }
    });
  });
  it('g-harris 9–10 and b-barry 7–8 generate in every key with rubato first; bass in the bass register', () => {
    const g = guitarCatalog().find((x) => x.id === 'g-harris')!;
    for (const id of ['g-harris-9', 'g-harris-10'])
      for (const sp of g.levels.find((l) => l.id === id)!.specs)
        for (let key = 0; key < 12; key++) {
          const d = generateGuitar({ ...sp, key });
          expect(d.notes.length).toBeGreaterThanOrEqual(13);
          expect(d.notes.every((n) => n.string !== undefined && n.fret! >= 0 && n.fret! <= 17), `${id} ${key}`).toBe(true);
          expect(hasRubato(d), id).toBe(true);
        }
    const b = guitarCatalog().find((x) => x.id === 'b-barry')!;
    for (const id of ['b-barry-7', 'b-barry-8'])
      for (const sp of b.levels.find((l) => l.id === id)!.specs)
        for (let key = 0; key < 12; key++) {
          const d = generateGuitar({ ...sp, key });
          expect(d.notes.length).toBeGreaterThanOrEqual(9);
          expect(hasRubato(d), id).toBe(true);
          const ps = d.notes.map((n) => n.pitch);
          expect(Math.min(...ps), `${id} ${key}`).toBeGreaterThanOrEqual(28);
          expect(Math.max(...ps), `${id} ${key}`).toBeLessThanOrEqual(60);
        }
    const d = generateGuitar({ ...b.levels.find((l) => l.id === 'b-barry-7')!.specs[0], key: 0 });
    expect(d.notes.sort((a, c) => a.beat - c.beat).slice(0, 4).map((n) => n.pitch)).toEqual(pivotArp(36, 'maj7'));
  });
  it('every new level runs through all 12 keys', () => {
    const keys = (k: unknown) => (k === 'major' || k === 'minor' ? 12 : new Set((k as number[]).map(pc)).size);
    for (const id of ['harris-19', 'harris-20', 'harris-21', 'harris-22', 'harris-23', 'harris-24']) expect(keys(lv(id).keys), id).toBe(12);
    const gl = guitarCatalog().flatMap((f) => f.levels);
    for (const id of ['g-harris-8', 'g-harris-9', 'g-harris-10', 'b-barry-7', 'b-barry-8']) expect(keys(gl.find((l) => l.id === id)!.keys), id).toBe(12);
  });
});

describe('wiring', () => {
  const base: PathInput = {
    track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [],
    packs: ['jazz', 'maqam', 'absolute', 'production', 'post-tonal'], plays: [], minutes: 10, ratings: {}, events: [],
    facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-14T10:00:00Z'),
  };
  it('the topic is on the ear path (jazz pack) before the scale line with a pivot; the keys levels sit at ~1450', () => {
    const cat = stepCatalogue();
    expect(cat.filter((s) => s.topic === 'bh-pivot-arp' && eligible(s, courseInput(base, 'ear'))).length).toBe(5);
    const d = (id: string) => cat.find((s) => s.id === id)!.difficulty;
    expect(d('topic:bh-pivot-arp:1')).toBeLessThan(d('topic:bh-pivot:1'));
    expect(STEP_PREREQ['topic:bh-pivot:1']).toContain('topic:bh-pivot-arp:1');
    expect(d('tech:harris-19')).toBeGreaterThan(1400);
    expect(d('tech:harris-19')).toBeLessThan(1500);
    expect(d('tech:harris-22')).toBeGreaterThan(d('tech:harris-19'));
    expect(d('tech:g-harris-8')).toBeGreaterThan(1400);
    expect(d('tech:g-harris-8')).toBeLessThan(1500);
  });
  it('the topic, the keys and the guitar levels open with the lesson; the lesson has demos for every quality', () => {
    const id = UNIT_LESSON['topic:bh-pivot-arp'];
    expect(MINI_LESSONS[id]).toBeDefined();
    for (let l = 1; l <= TOPIC_GEN['bh-pivot-arp'].levels.length; l++) expect(refresherFor(genTopic('bh-pivot-arp', 7, l, 'r'))?.id).toBe(id);
    for (const t of ['harris-19', 'harris-20', 'harris-21', 'harris-22', 'harris-23', 'harris-24', 'g-harris-8', 'g-harris-9', 'g-harris-10', 'b-barry-7', 'b-barry-8']) expect(UNIT_LESSON[`tech:${t}`]).toBe(id);
    const all = [...MINI_LESSONS[id].steps, ...(MINI_LESSONS[id].more ?? [])];
    const lines = all.flatMap((s) => s.play ?? []).filter((x) => x.kind === 'notes').map((x) => (x as { midis: number[] }).midis.join());
    for (const q of ARP_QUALITIES) expect(lines, q).toContain(pivotArp(60, q).join());
    expect(lines).toContain(scalePivotLine(72, '6', 2).line.map((n) => n.p).join());
    expect(lines).toContain(pivotEnclosureLine(0, 0, 64).map((n) => n.p).join());
    expect(MINI_LESSONS[id].title.en).toMatch(/pivot/);
    expect(JSON.stringify(MINI_LESSONS[id])).not.toMatch(/second pivot|from the top:/i);
  });
  it('the scale line with a pivot keeps its id and comes right after the pivot lesson', () => {
    const ids = Object.keys(MINI_LESSONS);
    expect(ids.indexOf('bh-pivot')).toBe(ids.indexOf('bh-pivot-arp') + 1);
    expect(MINI_LESSONS['bh-pivot'].title.en).toBe('Barry Harris: scale line with a pivot');
  });
});
