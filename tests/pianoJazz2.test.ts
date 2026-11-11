// PIANO_JAZZ P2 (2026-11-11): Barry Harris chromatic lines (harris 16–18), whole forms with a road map (k-bebop 9–10,
// k-sixdim 10), upper structures over a pedal (k-reharm 8), stride with an RH melody (accomp 18) — every line obeys its
// rules, the forms carry their road map (applyForm / analyzeForm), and steady takes pass while sloppy ones never do.
import { describe, expect, it } from 'vitest';
import { catalog, generate, H16_ROOTS, H18_FORMS, MATRIX, PIANO_FORMS, formBars, sixLinePair } from '../src/engine/drills/generate';
import { analyzeTake, npsOf, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { levelDrills, targetBpmOf } from '../src/engine/drills/plan';
import { withProg } from '../src/engine/drills/progAnalyze';
import { expandForm } from '../src/engine/drills/roadmap';
import type { Drill, PlayedNote } from '../src/engine/drills/types';
import { humanTake, steadySd } from './pianoTake';

const CAT = catalog();
const pc = (m: number) => ((m % 12) + 12) % 12;
const lvl = (id: string) => CAT.flatMap((f) => f.levels).find((l) => l.id === id)!;
const NEW_LEVELS = ['harris-16', 'harris-17', 'harris-18', 'k-bebop-9', 'k-bebop-10', 'k-sixdim-10', 'k-reharm-8', 'accomp-18'];
const R = (d: Drill) => d.notes.filter((n) => n.hand === (d.spec.hands === 'L' ? 'L' : 'R')).sort((a, b) => a.beat - b.beat);
const isBeat = (b: number) => Math.abs(b - Math.round(b)) < 1e-6;

describe('PIANO_JAZZ P2 content', () => {
  it('the new levels exist and every item generates in all 12 keys inside the keyboard, hands apart', () => {
    for (const id of NEW_LEVELS) {
      const lv = lvl(id);
      expect(lv, id).toBeDefined();
      for (const sp of lv.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key });
          expect(d.notes.length, d.itemId).toBeGreaterThan(8);
          expect(d.notes.every((n) => n.pitch >= 21 && n.pitch <= 108 && Number.isFinite(n.beat) && n.dur > 0), d.itemId).toBe(true);
          for (const a of d.notes) for (const b of d.notes) if (a.hand === 'L' && b.hand === 'R' && Math.abs(a.beat - b.beat) < 1e-6) expect(a.pitch < b.pitch, `${d.itemId} b${a.beat}`).toBe(true);
          expect(d.title.he).not.toMatch(/undefined/);
        }
    }
  });

  it('h16 the family of dominants as lines: chord tones of each bar on the beats, the step rules inside, a half step into each chord', () => {
    for (const o of [0, 1])
      for (let key = 0; key < 12; key++) {
        const d = generate({ family: 'harris', kind: 'h16-chains', key, hands: 'R', option: o, swing: true });
        const r = R(d);
        const chordOf = (beat: number) => {
          const bar = Math.floor(beat / 4 + 1e-6);
          return bar < 4 ? [0, 4, 7, 10].map((x) => pc(x + key + H16_ROOTS[o][bar])) : [0, 4, 7, 9].map((x) => pc(x + key));
        };
        for (const n of r.filter((x) => isBeat(x.beat))) expect(chordOf(n.beat), `${d.itemId} b${n.beat}`).toContain(pc(n.pitch));
        for (let bar = 0; bar < 4; bar++) {
          const appr = r.find((n) => Math.abs(n.beat - (bar * 4 + 3.5)) < 1e-6)!;
          const land = r.find((n) => Math.abs(n.beat - (bar + 1) * 4) < 1e-6)!;
          expect(Math.abs(appr.pitch - land.pitch), `${d.itemId} bar ${bar + 1}`).toBe(1);
        }
        // Inside a bar every 8th moves by a step (a half or a whole step); only the approach note may leap (up an octave or
        // so when the line has fallen low), and never beyond a 10th.
        for (let i = 1; i < r.length; i++) {
          const gap = Math.abs(r[i].pitch - r[i - 1].pitch);
          const approach = Math.abs((r[i].beat % 4) - 3.5) < 1e-6;
          if (r[i].beat < 16 && !approach && !isBeat(r[i].beat / 4)) expect(gap, `${d.itemId} ${i}`).toBeLessThanOrEqual(2);
          expect(gap, `${d.itemId} ${i}`).toBeLessThanOrEqual(16);
        }
        expect(r.every((n) => n.pitch >= 55 && n.pitch <= 86), d.itemId).toBe(true);
      }
  });

  it('h17 the chromatic scale with the rules: every half step, a chord tone on every beat, the beat split by the gap', () => {
    const cts = [[0, 4, 7, 10], [0, 4, 7, 9], [0, 3, 7, 9]];
    for (const o of [0, 1, 2])
      for (let key = 0; key < 12; key++) {
        const d = generate({ family: 'harris', kind: 'h17-chromatic', key, hands: 'R', option: o, perBeat: 3 });
        const r = R(d);
        for (let i = 1; i < r.length; i++) expect(r[i - 1].pitch - r[i].pitch, `${d.itemId} ${i}`).toBe(1);
        expect(r[0].pitch - r[r.length - 1].pitch).toBe(24);
        for (const n of r.filter((x) => isBeat(x.beat))) expect(cts[o].map((x) => pc(x + key))).toContain(pc(n.pitch));
        for (const n of r.filter((x) => !isBeat(x.beat))) expect(cts[o].map((x) => pc(x + key))).not.toContain(pc(n.pitch));
        // A beat holds 2, 3 or 4 notes.
        const per = new Map<number, number>();
        for (const n of r.slice(0, -1)) per.set(Math.floor(n.beat + 1e-6), (per.get(Math.floor(n.beat + 1e-6)) ?? 0) + 1);
        expect([...per.values()].every((k) => k >= 2 && k <= 4)).toBe(true);
      }
    // C7: C B | B♭ A A♭ | G G♭ F | E E♭ D D♭ | C.
    const c7 = R(generate({ family: 'harris', kind: 'h17-chromatic', key: 0, hands: 'R', option: 0, perBeat: 3 }));
    expect(c7.slice(0, 13).map((n) => pc(n.pitch))).toEqual([0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(c7.slice(0, 13).map((n) => Math.round(n.beat * 12))).toEqual([0, 6, 12, 16, 20, 24, 28, 32, 36, 39, 42, 45, 48]);
    // In the bass: the same line an octave under the RH register.
    const lh = generate({ family: 'harris', kind: 'h17-chromatic', key: 0, hands: 'L', perBeat: 3 });
    expect(lh.notes.every((n) => n.hand === 'L' && n.pitch <= 60)).toBe(true);
  });

  it('h18 the sixth on the fifth: the 6th chord on the beats, its diminished between, stepping through the scale', () => {
    expect(new Set(sixLinePair(7, '7').home)).toEqual(new Set([2, 5, 9, 11])); // G7 = Dm6
    expect(new Set(sixLinePair(2, 'm7').home)).toEqual(new Set([5, 9, 0, 2])); // Dm7 = F6
    expect(new Set(sixLinePair(2, 'hd7').home)).toEqual(new Set([5, 8, 0, 2])); // Dø = Fm6
    expect(new Set(sixLinePair(7, '7b9').home)).toEqual(new Set([8, 11, 2, 5])); // G7♭9 = A♭°7
    for (const o of [0, 1, 2])
      for (let key = 0; key < 12; key++) {
        const d = generate({ family: 'harris', kind: 'h18-sixfive', key, hands: 'R', option: o, swing: true });
        const r = R(d);
        for (const n of r) {
          const bar = Math.floor(n.beat / 4 + 1e-6);
          const [dd, q] = H18_FORMS[o][bar];
          const p = sixLinePair(pc(key + dd), q);
          expect(isBeat(n.beat) ? p.home : p.dim, `${d.itemId} b${n.beat}`).toContain(pc(n.pitch));
        }
        // A scale step inside a bar; into the next chord the nearest tone of its 6th chord (within a major 3rd).
        for (let i = 1; i < r.length; i++) expect(Math.abs(r[i].pitch - r[i - 1].pitch), `${d.itemId} ${i}`).toBeLessThanOrEqual(isBeat(r[i].beat / 4) ? 4 : 2);
      }
  });

  it('whole forms carry their road map: AABA rhythm changes is 32 bars (A1 A2 B A2), the bridge III7–VI7–II7–V7, the minor blues', () => {
    expect(formBars(PIANO_FORMS['rhythm-aaba'])).toHaveLength(32);
    expect(PIANO_FORMS['rhythm-bridge'].sections[0].bars.map((b) => b[0][0])).toEqual([4, 4, 9, 9, 2, 2, 7, 7]);
    expect(MATRIX).toHaveLength(12);
    for (const [kind, ops] of [['bb-form', [0, 1, 2]], ['bb-matrix', [0, 1]]] as const)
      for (const option of ops) {
        const d = generate({ family: 'k-bebop', kind, key: 3, hands: 'R', option, swing: true });
        expect(d.form, d.itemId).toBeDefined();
        const spans = expandForm(d.form!);
        expect(d.beats).toBe(spans.reduce((a, s) => a + s.beats, 0));
        expect(d.chart).toHaveLength(d.beats / 4);
        expect(d.goal.prog?.form?.lost).toBe(0);
        // A chord tone of the bar's chart on every beat.
        for (const n of d.notes.filter((x) => isBeat(x.beat))) expect(n.chordTone, `${d.itemId} b${n.beat}`).toBe(true);
      }
    const aaba = generate({ family: 'k-bebop', kind: 'bb-form', key: 10, hands: 'R', option: 0, swing: true });
    expect(expandForm(aaba.form!).map((s) => s.name)).toEqual(['A1', 'A2', 'B', 'A2']);
    expect(aaba.chart![16]).toBe('D7');
    for (const option of [0, 1, 2]) {
      const d = generate({ family: 'k-sixdim', kind: 'sd-forms', key: 0, hands: 'RL', option });
      expect(d.form).toBeDefined();
      expect(d.chart).toHaveLength(d.beats / 4);
    }
  });

  it('a bar lost in the form is "not" (the road map catches it), a steady take of the form is clean', () => {
    const lv = lvl('k-bebop-9');
    const d = generate({ ...lv.specs[1], key: 0 });
    const bpm = 100;
    const take = humanTake(d, bpm, steadySd(d, bpm), 3);
    expect(withProg(analyzeTake(d, bpm, take), d, bpm, take).verdict).toBe('clean');
    // Skip bar 3: everything after it comes a bar early.
    const barMs = (4 * 60000) / bpm;
    const lost: PlayedNote[] = take.filter((p) => p.on < 2 * barMs - 50 || p.on >= 3 * barMs - 50).map((p) => (p.on >= 3 * barMs - 50 ? { ...p, on: p.on - barMs, off: p.off !== null ? p.off - barMs : null } : p));
    const m = withProg(analyzeTake(d, bpm, lost), d, bpm, lost);
    expect(m.verdict).toBe('not');
    expect(m.prog?.form?.lost.length).toBeGreaterThan(0);
  });

  it('upper structures over a pedal: the pedal held a bar, RH triads of the mode, lydian ♯11 and sus colours', () => {
    const lyd = generate({ family: 'k-reharm', kind: 'rh-pedal', key: 0, hands: 'RL', option: 0 });
    const lh = lyd.notes.filter((n) => n.hand === 'L');
    expect(new Set(lh.map((n) => pc(n.pitch)))).toEqual(new Set([0, 7]));
    expect(lh.every((n) => n.dur >= 4 - 1e-6)).toBe(true);
    const rhPcs = new Set(lyd.notes.filter((n) => n.hand === 'R').map((n) => pc(n.pitch)));
    expect(rhPcs.has(6)).toBe(true); // F♯: the lydian ♯11
    expect([...rhPcs].every((p) => [0, 2, 4, 6, 7, 9, 11].includes(p))).toBe(true);
    const sus = generate({ family: 'k-reharm', kind: 'rh-pedal', key: 2, hands: 'RL', option: 1 });
    const firstHalf = sus.notes.filter((n) => n.hand === 'R' && n.beat < 8).map((n) => pc(n.pitch));
    expect(firstHalf.every((p) => [2, 4, 7, 9, 11, 0].includes(p))).toBe(true); // D mixolydian sus, no F♯ (no 3rd)
    expect(new Set(sus.notes.filter((n) => n.hand === 'L' && n.beat >= 8).map((n) => pc(n.pitch)))).toEqual(new Set([5, 0]));
  });

  it('stride with an RH melody: a guide tone (3rd or 7th) on 1 and 3 of every bar over the stride LH', () => {
    for (const option of [0, 1, 2]) {
      const d = generate({ family: 'accomp', kind: 'stride-melody', key: 0, hands: 'RL', option, swing: true });
      const rh = d.notes.filter((n) => n.hand === 'R');
      expect(rh.length).toBe(d.beats / 2);
      expect(rh.every((n) => n.beat % 2 === 0 && n.pitch >= 65 && n.pitch <= 79)).toBe(true);
      for (let i = 1; i < rh.length; i++) expect(Math.abs(rh[i].pitch - rh[i - 1].pitch), `${d.itemId} ${i}`).toBeLessThanOrEqual(7);
      expect(d.notes.some((n) => n.hand === 'L')).toBe(true);
      expect(d.freeAbove).toBeUndefined();
    }
    // accomp 17's target is stride tempo (PIANO_AUDIT P2).
    const l17 = lvl('accomp-17');
    expect(targetBpmOf(l17, levelDrills(l17, 'fifths-up')[0])).toBeGreaterThanOrEqual(140);
  });
});

describe('PIANO_JAZZ P2 sweep (synthetic human takes)', () => {
  it('steady takes are clean at each level target tempo, in every key of the level; sloppy ones (2 × the SD limit) never', () => {
    const bad: string[] = [];
    let n = 0;
    for (const id of NEW_LEVELS) {
      const lv = lvl(id);
      for (const sp of lv.specs) {
        const keys = Array.isArray(lv.keys) ? lv.keys : [0, 5, 7];
        for (const key of keys) {
          const d = generate({ ...sp, key });
          n++;
          const bpm = targetBpmOf(lv, d);
          for (const seed of [1, 2]) {
            const take = humanTake(d, bpm, steadySd(d, bpm), seed);
            const m = withProg(analyzeTake(d, bpm, take), d, bpm, take);
            if (m.verdict !== 'clean') bad.push(`steady ${id} ${d.itemId}@${bpm} s${seed}: ${m.why.en}`);
          }
          const sd = 2 * thresholds(tempoBand(npsOf(d, bpm))).sd;
          const take = humanTake(d, bpm, sd, 5);
          if (withProg(analyzeTake(d, bpm, take), d, bpm, take).verdict === 'clean') bad.push(`sloppy ${id} ${d.itemId}@${bpm}`);
        }
      }
    }
    expect(n).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  }, 300_000);
});
