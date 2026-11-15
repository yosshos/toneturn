// HARMONY-REHARM (docs/HARMONY-REHARM.md): the pure engine (commonTone.ts) against the reference tables, the borrowed
// devices of reharm.ts validated against melodies, and the ear topics.
import { describe, expect, it } from 'vitest';
import {
  CT_Q, LADDER, MEDIANT_MOVES, chordsHolding, commonTones, coltraneRoots, counterLineNames, degreeIn, doublyChromatic, hexatonicCycle, holdsNote, identifyChord, ladderChords,
  mediantsOf, octatonicCycle, octatonicRoots, plrBetween, spellHeld, triadName, BORROWED, MINOR_PLAGAL, DEVICE_FAMILY, type CtQ,
} from '../src/engine/commonTone';
import { applyPlan, autoPlan, deviceBars, barsOf, DEVICES, DEVICES_BORROWED, DEVICES_FUNCTIONAL, parsePlan, planCode } from '../src/engine/reharm';
import { TOPIC_GEN } from '../src/engine/topics';
import { RH_SETS, SERVED } from '../src/engine/drills/headDrills';
import { HEADS } from '../src/content/heads';
import { headIn } from '../src/engine/heads';
import { stepCatalogue } from '../src/engine/path';

const C = { key: 0 };
const F = 5;

describe('one note, many chords: the degree of a held note', () => {
  it('held F over every ladder chord, spelled (research C.1 / HARMONY-REHARM §2)', () => {
    const tri = ladderChords(F, 'triads').map((c) => `${c.sym}:${c.degree}`);
    expect(tri).toEqual(['F:1', 'Fm:1', 'Dm:♭3', 'D♭:3', 'B♭:5', 'B♭m:5']);
    const sev = ladderChords(F, 'sevenths').map((c) => `${c.sym}:${c.degree}`);
    expect(sev).toEqual(['Fmaj7:1', 'Dm7:♭3', 'D♭maj7:3', 'B♭maj7:5', 'G7:♭7', 'G♭maj7:maj7', 'Gm7:♭7']);
    const ten = ladderChords(F, 'tensions').map((c) => `${c.sym}:${c.degree}:${c.held}`);
    expect(ten).toEqual(['E♭9:9:F', 'C7sus4:11:F', 'A♭13:13:F', 'E7♭9:♭9:F', 'B7♯11:♯11:E♯', 'A7♭13:♭13:F', 'D7♯9:♯9:E♯']);
  });
  it('the ♯5 forces E♯ too; the C examples of the research spell B♯ and C', () => {
    expect(spellHeld(9, 'maj7#5', F)!.held).toBe('E♯'); // Amaj7♯5: E♯ is the ♯5
    expect(spellHeld(9, '7#9', 0)!.held).toBe('B♯'); // A7♯9 over a held C
    expect(spellHeld(6, '7#11', 0)!.sym).toBe('G♭7♯11'); // G♭7♯11, the ♯11 is C
    expect(spellHeld(6, '7#11', 0)!.held).toBe('C');
  });
  it('held C over each chord: the degree comes from the quality (♭3 vs ♯9, ♭5 vs ♯11, ♯5 vs ♭13)', () => {
    const at = (root: number, q: CtQ) => degreeIn(0 - root, q)?.label;
    expect(at(0, 'maj7')).toBe('1');
    expect(at(9, 'm7')).toBe('♭3');
    expect(at(8, 'maj7')).toBe('3');
    expect(at(5, 'M')).toBe('5');
    expect(at(2, '7')).toBe('♭7');
    expect(at(1, 'maj7')).toBe('maj7');
    expect(at(10, '9')).toBe('9');
    expect(at(7, '7sus4')).toBe('11');
    expect(at(3, '13')).toBe('13');
    expect(at(11, '7b9')).toBe('♭9');
    expect(at(6, '7#11')).toBe('♯11');
    expect(at(6, 'm7b5')).toBe('♭5');
    expect(at(4, '7b13')).toBe('♭13');
    expect(at(4, 'maj7#5')).toBe('♯5');
    expect(at(9, '7#9')).toBe('♯9');
    expect(at(4, 'maj7')).toBeUndefined(); // C is not a tone of Emaj7
  });
  it('chordsHolding finds every chord with the note as a given degree', () => {
    expect(chordsHolding(F, ['M', 'maj7'], '3').map((c) => c.sym).sort()).toEqual(['D♭', 'D♭maj7']);
    expect(chordsHolding(F, ['7', 'm7', 'm7b5'], '♭7').map((c) => c.sym).sort()).toEqual(['G7', 'Gm7', 'Gm7♭5']);
  });
  it('holdsNote follows the melody table: F over Cmaj7 (the 11th) and Gmaj7 (a ♭7 over major) clash', () => {
    expect(holdsNote(0, 'maj7', F)).toBe(false);
    expect(holdsNote(7, 'maj7', F)).toBe(false);
    expect(holdsNote(9, 'm7', F)).toBe(false); // the ♭13 over a minor 7th
    expect(holdsNote(3, 'maj7', F)).toBe(true); // the 9th of E♭maj7
    expect(holdsNote(4, '7', F)).toBe(true); // the ♭9 of E7
  });
  it('identifyChord names played chords (a maj9 is a maj7, F A C D over F is F6)', () => {
    expect(identifyChord([53, 64, 67, 69, 72, 77])).toEqual({ root: 5, q: 'maj7' });
    expect(identifyChord([53, 57, 60, 62])).toEqual({ root: 5, q: '6' });
    expect(identifyChord([50, 53, 57, 60])).toEqual({ root: 2, q: 'm7' });
    expect(identifyChord([55, 59, 62, 65])).toEqual({ root: 7, q: '7' });
    expect(identifyChord([60, 61])).toBeNull();
  });
  it('every quality symbol is written without emoji and with real accidentals', () => {
    for (const q of Object.keys(CT_Q) as CtQ[]) expect(CT_Q[q].sym).not.toMatch(/[#b](?!$)|\p{Extended_Pictographic}/u);
  });
});

describe('chromatic mediants and third relations (HARMONY-REHARM §3)', () => {
  const Cmaj = { root: 0, minor: false };
  it('the four mediants of C and their common tones', () => {
    const ms = mediantsOf(Cmaj);
    expect(ms.map((t) => triadName(t))).toEqual(['E', 'A♭', 'A', 'E♭']);
    expect(ms.map((t) => commonTones(Cmaj, t))).toEqual([[4], [0], [4], [7]]);
    expect(MEDIANT_MOVES.map((m) => m.d)).toEqual([4, 8, 9, 3]);
  });
  it('doubly chromatic: C ↔ A♭m and C ↔ E♭m share no tone', () => {
    const dc = doublyChromatic(Cmaj);
    expect(dc.map((t) => triadName(t))).toEqual(['A♭m', 'E♭m']);
    for (const t of dc) expect(commonTones(Cmaj, t)).toEqual([]);
  });
  it('in every key, a mediant keeps exactly one tone and a doubly chromatic one none', () => {
    for (let k = 0; k < 12; k++)
      for (const minor of [false, true]) {
        const t = { root: k, minor };
        for (const m of mediantsOf(t)) expect(commonTones(t, m).length, `${k} ${minor}`).toBe(1);
        for (const m of doublyChromatic(t)) expect(commonTones(t, m).length).toBe(0);
      }
  });
  it('Coltrane: C – A♭ – E, roots of an augmented triad', () => {
    expect(coltraneRoots(0)).toEqual([0, 8, 4]);
  });
  it('the hexatonic cycle C – Cm – A♭ – A♭m – E – Em; the octatonic cycle and its minor-third roots', () => {
    expect(hexatonicCycle(0).map((t) => triadName(t))).toEqual(['C', 'Cm', 'A♭', 'A♭m', 'E', 'Em']);
    const hexNotes = new Set(hexatonicCycle(0).flatMap((t) => [t.root, t.root + (t.minor ? 3 : 4), t.root + 7].map((p) => p % 12)));
    expect([...hexNotes].sort((a, b) => a - b)).toEqual([0, 3, 4, 7, 8, 11]);
    expect(octatonicCycle(0).map((t) => triadName(t))).toEqual(['C', 'Am', 'A', 'F♯m', 'F♯', 'E♭m', 'E♭', 'Cm']);
    expect(octatonicRoots(0)).toEqual([0, 9, 6, 3]); // the Barry Harris family of dominants' minor-third cycle
  });
  it('P, L and R are found between neighbours of the cycles', () => {
    expect(plrBetween(Cmaj, { root: 0, minor: true })).toBe('P');
    expect(plrBetween(Cmaj, { root: 9, minor: true })).toBe('R');
    expect(plrBetween(Cmaj, { root: 4, minor: true })).toBe('L');
    expect(plrBetween(Cmaj, { root: 4, minor: false })).toBeNull();
  });
});

describe('modal interchange, the counter-line, functional vs colour', () => {
  it('the borrowed-chord table matches HARMONY-REHARM §4', () => {
    expect(BORROWED.map((b) => b.rn)).toEqual(['iv', 'ivm6', 'ivm7', 'iiø7', '♭IIImaj7', '♭VImaj7', '♭VII7', 'v m7', '♭IImaj7']);
    expect(MINOR_PLAGAL.every((id) => BORROWED.some((b) => b.id === id))).toBe(true);
  });
  it('the counter-line under a held C', () => {
    expect(counterLineNames(0)).toEqual(['C', 'Cmaj7/B', 'C7/B♭', 'Am7', 'A♭maj7', 'G7sus4']);
  });
  it('functional and colour devices', () => {
    expect(DEVICE_FAMILY.filter((d) => d.fam === 'functional').map((d) => d.id)).toEqual(['secondary', 'tritone', 'iiV', 'backdoor', 'pdim']);
    expect(DEVICE_FAMILY.filter((d) => d.fam === 'colour').length).toBe(6);
  });
});

describe('borrowed devices in the reharm engine, validated against the melody', () => {
  it('the device list: functional first, then the borrowed ones; plan codes round-trip', () => {
    expect(DEVICES_FUNCTIONAL).toEqual(['tritone', 'iiV', 'backdoor', 'pdim', 'cliche', 'coltrane']);
    expect(DEVICES_BORROWED).toEqual(['minorIV', 'bVI', 'bVII', 'iiHalfDim', 'minorPlagal']);
    expect(DEVICES).toEqual([...DEVICES_FUNCTIONAL, ...DEVICES_BORROWED]);
    const p = { 1: 'minorIV', 3: 'bVI', 5: 'bVII', 7: 'iiHalfDim', 9: 'minorPlagal' } as const;
    expect(parsePlan(planCode(p))).toEqual(p);
  });
  it('minor iv: a IV bar becomes iv m6; a melody note it cannot carry (A over Fm6) is a conflict', () => {
    const text = 'Cmaj7 | Fmaj7 | G7 | Cmaj7';
    expect(deviceBars(barsOf(text), 1, 'minorIV', C)).toEqual([['Fm6']]);
    expect(applyPlan(text, { 1: 'minorIV' }, C, [{ pitch: 72, beat: 4, dur: 4 }]).conflicts).toEqual([]); // C = the 5th
    expect(applyPlan(text, { 1: 'minorIV' }, C, [{ pitch: 69, beat: 4, dur: 4 }]).conflicts.length).toBe(1); // A over Fm6
    expect(deviceBars(barsOf(text), 0, 'minorIV', C)).toBeNull(); // not on I
  });
  it('♭VI: the second bar of a held tonic becomes ♭VImaj7 (E♭ = its 5th is fine, E is not)', () => {
    const text = 'Cmaj7 | Cmaj7 | Dm7 G7 | Cmaj7';
    expect(deviceBars(barsOf(text), 1, 'bVI', C)).toEqual([['Abmaj7']]);
    expect(deviceBars(barsOf(text), 0, 'bVI', C)).toBeNull();
    expect(applyPlan(text, { 1: 'bVI' }, C, [{ pitch: 67, beat: 4, dur: 4 }]).conflicts).toEqual([]); // G = maj7 of A♭
    expect(applyPlan(text, { 1: 'bVI' }, C, [{ pitch: 64, beat: 4, dur: 4 }]).conflicts.length).toBe(1); // E over A♭maj7
  });
  it('♭VII7: a V7 bar into I becomes B♭7; A (its major 7th) in the melody clashes, D does not', () => {
    const text = 'Cmaj7 | G7 | Cmaj7 | %';
    expect(deviceBars(barsOf(text), 1, 'bVII', C)).toEqual([['Bb7']]);
    expect(applyPlan(text, { 1: 'bVII' }, C, [{ pitch: 62, beat: 4, dur: 4 }]).conflicts).toEqual([]);
    expect(applyPlan(text, { 1: 'bVII' }, C, [{ pitch: 69, beat: 4, dur: 4 }]).conflicts.length).toBe(1);
  });
  it('iiø7: the ii before its V becomes m7♭5; A (the natural 9 against A♭) is checked', () => {
    const text = 'Cmaj7 | Dm7 G7 | Cmaj7 | %';
    expect(deviceBars(barsOf(text), 1, 'iiHalfDim', C)).toEqual([['Dm7b5', 'G7']]);
    expect(applyPlan(text, { 1: 'iiHalfDim' }, C, [{ pitch: 65, beat: 4, dur: 2 }]).conflicts).toEqual([]); // F = ♭3
    expect(applyPlan(text, { 1: 'iiHalfDim' }, C, [{ pitch: 69, beat: 4, dur: 2 }]).conflicts.length).toBe(1); // A = the natural 5th
  });
  it('minor plagal: the V bar into I becomes ivm6, straight home', () => {
    const text = 'Cmaj7 | Dm7 G7 | Cmaj7 | %';
    expect(deviceBars(barsOf(text), 1, 'minorPlagal', C)).toEqual([['Fm6']]);
    expect(applyPlan(text, { 1: 'minorPlagal' }, C, [{ pitch: 65, beat: 4, dur: 2 }]).conflicts).toEqual([]);
    expect(applyPlan(text, { 1: 'minorPlagal' }, C, [{ pitch: 71, beat: 4, dur: 2 }]).conflicts.length).toBe(1); // B over Fm6
  });
  it('borrowed devices do not apply in a minor key', () => {
    const m = { key: 9, minor: true };
    for (const d of DEVICES_BORROWED) expect(deviceBars(barsOf('Am7 | Dm7 | E7 | Am7'), 2, d, m)).toBeNull();
  });
  it('the borrowed preset on the heads never clashes with a melody and changes some head', () => {
    let changed = 0;
    for (const i of SERVED)
      for (const key of [HEADS[i].home.key, 6]) {
        const hi = headIn(HEADS[i], key);
        const r = applyPlan(hi.text, autoPlan(hi.text, hi.tonic, RH_SETS['tn-rh4'], hi.notes), hi.tonic, hi.notes);
        expect(r.conflicts, `${HEADS[i].id} ${key}`).toEqual([]);
        changed += r.changed.length;
      }
    expect(changed).toBeGreaterThan(0);
  });
});

describe('the ear topics', () => {
  const NEW = ['ct-degree', 'mediants', 'pedal-ear', 'approach-chord', 'counter-line', 'modern-color', 'func-color', 'modal-mix'];
  it('every new topic has at least three levels, en + he, and builds in many seeds', () => {
    for (const t of NEW) {
      const T = TOPIC_GEN[t];
      expect(T, t).toBeDefined();
      expect(T.levels.length, t).toBeGreaterThanOrEqual(3);
      for (let lv = 1; lv <= T.levels.length; lv++)
        for (let seed = 1; seed <= 40; seed++) {
          const q = T.gen(seed, lv, 'x') as { kind: string; choices: string[]; answer: string; names: Record<string, { en: string; he: string }>; difficulty: number; ask: { en: string; he: string } };
          expect(q.kind).toBe('choice');
          expect(q.choices, `${t} ${lv} ${seed}`).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          for (const c of q.choices) {
            expect(q.names[c], `${t} ${lv} ${c}`).toBeDefined();
            expect(q.names[c].en.length).toBeGreaterThan(0);
          }
          // no two choices with the same written name (no enharmonic or duplicate decoys)
          expect(new Set(q.choices.map((c) => q.names[c].en)).size, `${t} ${lv} ${seed}`).toBe(q.choices.length);
          expect(/[֐-׿]/.test(q.ask.he)).toBe(true);
          expect(q.difficulty).toBeGreaterThanOrEqual(1050);
          expect(q.difficulty).toBeLessThanOrEqual(1800);
        }
    }
  });
  it('the extended topics: planing 4, reharm-spot 5; modal-mix its own topic (borrowed-ext keeps 3)', () => {
    expect(TOPIC_GEN['borrowed-ext'].levels.length).toBe(3);
    expect(TOPIC_GEN['modal-mix'].levels.length).toBe(5);
    expect(TOPIC_GEN['planing'].levels.length).toBe(4);
    expect(TOPIC_GEN['reharm-spot'].levels.length).toBe(5);
    for (const [t, from, to] of [['planing', 4, 4], ['reharm-spot', 5, 5]] as const)
      for (let lv = from; lv <= to; lv++)
        for (let seed = 1; seed <= 20; seed++) {
          const q = TOPIC_GEN[t].gen(seed, lv, 'x') as { choices: string[]; answer: string; level: number };
          expect(q.choices).toContain(q.answer);
          expect(q.level).toBe(lv);
        }
  });
  it('"F is the 3rd: which chord?" — the answer holds the note as that degree', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const q = TOPIC_GEN['ct-degree'].gen(seed, 2, 'x') as { text: { en: string }; answer: string };
      const [note, deg] = q.text.en.split(' = ');
      const held = { F: 5, C: 0 }[note as 'F' | 'C'];
      const pool = [...LADDER.triads, ...LADDER.sevenths];
      const c = pool.map(([iv, qq]) => spellHeld(held - iv, qq, held)!).find((x) => x.sym === q.answer)!;
      expect(c.degree).toBe(deg);
    }
  });
  it('the topics are on the jazz path', () => {
    const steps = stepCatalogue();
    for (const t of NEW) expect(steps.some((s) => s.topic === t && s.pack === 'jazz'), t).toBe(true);
  });
});
