// SPEC-KEY-SESSION §1C (the owner's approach licks) and §1b (more in the key): k-keylick and k-keyx.
import { describe, expect, it } from 'vitest';
import { catalog, generate, rhBase } from '../src/engine/drills/generate';
import { H_SCALES } from '../src/engine/drills/harmLadder';
import { lickRun, LICKS, SHAPES, spellNeighbour, type Dir, type Lick, type Shape } from '../src/engine/drills/keyLicks';
import { keyFacet } from '../src/engine/drills/keyFacet';
import { TWELVE_KEY_FAMILIES } from '../src/engine/drills/keys12';
import { COURSE_SECTIONS } from '../src/engine/courseSections';
import type { DrillSpec } from '../src/engine/drills/types';

const MAJ = H_SCALES[0];
const HM = H_SCALES[7];
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = (name: string): number => (((PC[name[0]] + (name.includes('𝄪') ? 2 : name.includes('𝄫') ? -2 : name.includes('♯') ? 1 : name.includes('♭') ? -1 : 0)) % 12) + 12) % 12;
/** One segment as written names: "B – C E G". */
const seg = (key: number, sc: typeof MAJ, lick: Lick, shape: Shape, dir: Dir, i: number): string => {
  const g = lickRun(key, sc, lick, shape, dir, rhBase(key))[i];
  return `${g.lick.map((x) => x.name).join(' ')} – ${g.shape.map((x) => x.name).join(' ')}`;
};
const pitches = (key: number, sc: typeof MAJ, lick: Lick, shape: Shape, dir: Dir, i: number): number[] => {
  const g = lickRun(key, sc, lick, shape, dir, rhBase(key))[i];
  return [...g.lick, ...g.shape].map((x) => x.p);
};

describe('the approach licks: the owner’s C major triad examples, note for note', () => {
  it('going up: lick 1, lick 2 both orders, lick 3 (target = the lowest note)', () => {
    expect(seg(0, MAJ, '1', 't', 'up', 0)).toBe('B – C E G');
    expect(seg(0, MAJ, '1', 't', 'up', 1)).toBe('C♯ – D F A');
    expect(pitches(0, MAJ, '1', 't', 'up', 0)).toEqual([59, 60, 64, 67]);
    expect(pitches(0, MAJ, '1', 't', 'up', 1)).toEqual([61, 62, 65, 69]);
    expect(seg(0, MAJ, '2ba', 't', 'up', 0)).toBe('B D – C E G');
    expect(seg(0, MAJ, '2ab', 't', 'up', 0)).toBe('D B – C E G');
    expect(seg(0, MAJ, '2ba', 't', 'up', 1)).toBe('C♯ E – D F A');
    expect(seg(0, MAJ, '2ab', 't', 'up', 1)).toBe('E C♯ – D F A');
    expect(pitches(0, MAJ, '2ba', 't', 'up', 0)).toEqual([59, 62, 60, 64, 67]);
    expect(seg(0, MAJ, '3', 't', 'up', 0)).toBe('B D D♭ B – C E G');
    expect(seg(0, MAJ, '3', 't', 'up', 1)).toBe('C♯ E E♭ C♯ – D F A');
    expect(pitches(0, MAJ, '3', 't', 'up', 0)).toEqual([59, 62, 61, 59, 60, 64, 67]);
    expect(pitches(0, MAJ, '3', 't', 'up', 1)).toEqual([61, 64, 63, 61, 62, 65, 69]);
  });
  it('going down from the C triad: target = the top note, the shape played down (B° next)', () => {
    // The owner wrote G♭ for lick 1's note under G and F♯ in licks 2 and 3: the same key; it is spelled F♯ (the letter under G).
    expect(pitches(0, MAJ, '1', 't', 'down', 0)).toEqual([78, 79, 76, 72]);
    expect(seg(0, MAJ, '1', 't', 'down', 0)).toBe('F♯ – G E C');
    expect(seg(0, MAJ, '1', 't', 'down', 1)).toBe('E – F D B');
    expect(pitches(0, MAJ, '1', 't', 'down', 1)).toEqual([76, 77, 74, 71]);
    expect(seg(0, MAJ, '2ba', 't', 'down', 0)).toBe('F♯ A – G E C');
    expect(seg(0, MAJ, '2ab', 't', 'down', 0)).toBe('A F♯ – G E C');
    expect(seg(0, MAJ, '2ba', 't', 'down', 1)).toBe('E G – F D B');
    expect(seg(0, MAJ, '2ab', 't', 'down', 1)).toBe('G E – F D B');
    expect(seg(0, MAJ, '3', 't', 'down', 0)).toBe('F♯ A A♭ F♯ – G E C');
    expect(seg(0, MAJ, '3', 't', 'down', 1)).toBe('E G G♭ E – F D B');
    expect(pitches(0, MAJ, '3', 't', 'down', 0)).toEqual([78, 81, 80, 78, 79, 76, 72]);
  });
  it('the whole run: degrees 1→8 up, 8→1 down, on 3rds, triads and 7ths', () => {
    const up = lickRun(0, MAJ, '1', '7', 'up', 60);
    expect(up.map((g) => g.shape[0].name).join(' ')).toBe('C D E F G A B C');
    expect(up.map((g) => g.shape.map((x) => x.name).join('')).slice(0, 2)).toEqual(['CEGB', 'DFAC']);
    const down = lickRun(0, MAJ, '1', '7', 'down', 60);
    expect(down.map((g) => g.shape[g.shape.length - 1].name).join(' ')).toBe('C B A G F E D C');
    expect(down[0].shape.map((x) => x.name).join('')).toBe('BGEC');
    expect(down[0].lick.map((x) => x.name)).toEqual(['A♯']);
    const thirds = lickRun(0, MAJ, '2ba', '3', 'down', 60);
    expect(thirds[0].lick.map((x) => x.name).join(' ') + ' – ' + thirds[0].shape.map((x) => x.name).join(' ')).toBe('D♯ F – E C');
    expect(lickRun(0, MAJ, '1', '3', 'up', 60)[0].shape.map((x) => x.name)).toEqual(['C', 'E']);
  });
  it('lick 3 on a target a half step under its scale step (owner 2026-11-22): above, the step below, chromatic below → target', () => {
    const e = lickRun(0, MAJ, '3', 't', 'up', 60)[2];
    expect(e.lick.map((x) => x.name).join(' ') + ' – ' + e.shape.map((x) => x.name).join(' ')).toBe('F D E♭ – E G B');
    expect(e.lick.map((x) => x.p)).toEqual([65, 62, 63]);
    const b = lickRun(0, MAJ, '3', 't', 'up', 60)[6];
    expect(b.lick.map((x) => x.name).join(' ') + ' – ' + b.shape.map((x) => x.name).join(' ')).toBe('C A B♭ – B D F');
    expect(b.lick.map((x) => x.p)).toEqual([72, 69, 70]);
  });
});

describe('the licks in E♭ major and A harmonic minor', () => {
  it('E♭ major: L1 up, L2 up, L3 up, L1 down', () => {
    expect(seg(3, MAJ, '1', 't', 'up', 0)).toBe('D – E♭ G B♭');
    expect(pitches(3, MAJ, '1', 't', 'up', 0)).toEqual([62, 63, 67, 70]);
    expect(seg(3, MAJ, '1', 't', 'up', 1)).toBe('E – F A♭ C');
    expect(seg(3, MAJ, '2ba', 't', 'up', 0)).toBe('D F – E♭ G B♭');
    expect(seg(3, MAJ, '2ab', 't', 'up', 0)).toBe('F D – E♭ G B♭');
    expect(seg(3, MAJ, '3', 't', 'up', 0)).toBe('D F F♭ D – E♭ G B♭');
    expect(pitches(3, MAJ, '3', 't', 'up', 0)).toEqual([62, 65, 64, 62, 63, 67, 70]);
    expect(seg(3, MAJ, '1', 't', 'down', 0)).toBe('A – B♭ G E♭');
    expect(pitches(3, MAJ, '1', 't', 'down', 0)).toEqual([81, 82, 79, 75]);
  });
  it('A harmonic minor: L1 up, L2 up, L3 up, L1 down (G♯°, the scale’s own triad)', () => {
    expect(seg(9, HM, '1', 't', 'up', 0)).toBe('G♯ – A C E');
    expect(pitches(9, HM, '1', 't', 'up', 0)).toEqual([56, 57, 60, 64]);
    expect(seg(9, HM, '1', 't', 'up', 1)).toBe('A♯ – B D F');
    expect(seg(9, HM, '2ba', 't', 'up', 0)).toBe('G♯ B – A C E');
    expect(seg(9, HM, '3', 't', 'up', 0)).toBe('G♯ B B♭ G♯ – A C E');
    expect(pitches(9, HM, '3', 't', 'up', 0)).toEqual([56, 59, 58, 56, 57, 60, 64]);
    expect(seg(9, HM, '1', 't', 'down', 0)).toBe('D♯ – E C A');
    expect(seg(9, HM, '1', 't', 'down', 1)).toBe('C♯ – D B G♯');
    expect(pitches(9, HM, '1', 't', 'down', 1)).toEqual([73, 74, 71, 68]);
    // the leading note: under G♯ is G (F𝄪 is not written); over F the step is G♯ (an augmented 2nd), the chromatic G♭ (the letter over F, as the owner spells G♭ over F in C)
    expect(seg(9, HM, '1', 't', 'up', 6)).toBe('G – G♯ B D');
    expect(seg(9, HM, '3', 't', 'up', 5)).toBe('E G♯ G♭ E – F A C');
  });
  it('spelling helper', () => {
    expect(spellNeighbour('C', -1, -1)).toBe('B');
    expect(spellNeighbour('D', -1, -1)).toBe('C♯');
    expect(spellNeighbour('C', 1, 1)).toBe('D♭');
    expect(spellNeighbour('G♯', -1, -1)).toBe('G');
    expect(spellNeighbour('A♭', 1, 1)).toBe('A');
  });
});

describe('k-keylick: the family, all 12 keys', () => {
  const fam = catalog().find((f) => f.id === 'k-keylick')!;
  it('levels (owner 2026-11-22): lick 1, 2, 3 into scale degrees, 3rds, triads, 7ths — up and down, each hand — then hands together', () => {
    // 1–15 kept; 16–20 appended in phase 7 (the Aeolian from the 6th degree, the modes from the root, melodic minor)
    expect(fam.levels.map((l) => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => `k-keylick-${i + 1}`));
    expect(fam.levels[0].specs.map((s) => `${s.kind}/${s.hands}`)).toEqual(['kl-1-1-up/R', 'kl-1-1-down/R', 'kl-1-1-up/L', 'kl-1-1-down/L', 'kl-1-1-up/R', 'kl-1-1-down/R', 'kl-1-1-up/L', 'kl-1-1-down/L']);
    expect(fam.levels[1].specs[0].kind).toBe('kl-1-3-up');
    expect(fam.levels[2].specs[0].kind).toBe('kl-1-t-up');
    expect(fam.levels[3].specs[0].kind).toBe('kl-1-7-up');
    expect(fam.levels[4].specs.map((s) => s.kind)).toContain('kl-2ab-1-down');
    expect(fam.levels[11].specs[0].kind).toBe('kl-3-7-up');
    expect(fam.levels.slice(12, 15).every((l) => l.specs.every((s) => s.hands === 'RL'))).toBe(true);
    expect(fam.levels.slice(15).map((l) => [...new Set(l.specs.map((s) => s.option))].join(','))).toEqual(['5', '5', '5', '1,2,3,4,6', '8']);
    for (const l of fam.levels) {
      expect(l.keys).toBe('major');
      for (const s of l.specs) expect(s.option === 7 ? s.minor : !s.minor, s.kind).toBe(true);
    }
    expect(TWELVE_KEY_FAMILIES).toContain('k-keylick');
    expect(COURSE_SECTIONS.keys!.find((s) => s.id === 'technique')!.families).toEqual(expect.arrayContaining(['k-keylick', 'k-keyx']));
  });
  it('every item in every key: every scale note in the scale, every lick note where the rules put it', () => {
    for (let key = 0; key < 12; key++)
      for (const option of [0, 7])
        for (const lick of LICKS)
          for (const shape of SHAPES)
            for (const dir of ['up', 'down'] as Dir[]) {
              const sc = H_SCALES[option];
              const run = lickRun(key, sc, lick, shape, dir, rhBase(key));
              expect(run).toHaveLength(8);
              const scale = sc.ints.map((x) => (x + key) % 12);
              for (const g of run) {
                for (const x of [...g.lick, ...g.shape]) expect(pcOf(x.name), `${key} ${x.name} ${x.p}`).toBe(x.p % 12);
                for (const x of g.shape) expect(scale).toContain(x.p % 12);
                const target = g.shape[0];
                // lick 3 turns over when the scale step above is a half step: above, the step below, chromatic below → target
                const turned = lick === '3' && g.lick.length === 3;
                if (turned) {
                  expect(g.lick[0].p).toBe(target.p + 1);
                  expect(g.lick[2].p).toBe(target.p - 1);
                  expect(pcOf(g.lick[2].name)).toBe((target.p + 11) % 12);
                  continue;
                }
                expect(g.lick[lick === '2ab' ? 1 : 0].p).toBe(target.p - 1);
                if (lick !== '1') expect(g.lick[lick === '2ab' ? 0 : 1].name[0]).toBe(String.fromCharCode(((target.name.charCodeAt(0) - 65 + 1) % 7) + 65));
                const letters = new Set(g.shape.map((x) => x.name[0]));
                expect(letters.size).toBe(g.shape.length);
              }
              const d = generate({ family: 'k-keylick', kind: `kl-${lick}-${shape}-${dir}`, key, hands: 'R', option, ...(option ? { minor: true } : {}) });
              expect(d.notes.length).toBe(run.reduce((n, g) => n + g.lick.length + g.shape.length, 0));
              expect(d.notes.every((n) => n.spell)).toBe(true);
              expect(d.title.he).toMatch(/ליק/);
            }
  });
  it('the scale degrees, and the LH alone: lick 1 into each degree; the LH an octave lower', () => {
    expect(seg(0, MAJ, '1', '1', 'up', 0)).toBe('B – C');
    expect(seg(0, MAJ, '2ba', '1', 'up', 1)).toBe('C♯ E – D');
    const r = generate({ family: 'k-keylick', kind: 'kl-1-1-up', key: 0, hands: 'R', option: 0 });
    const l = generate({ family: 'k-keylick', kind: 'kl-1-1-up', key: 0, hands: 'L', option: 0 });
    expect(l.notes.every((n) => n.hand === 'L')).toBe(true);
    expect(l.notes.map((n) => n.pitch + 12)).toEqual(r.notes.map((n) => n.pitch));
  });
  it('hands together in octaves: the LH an octave under every RH note', () => {
    const d = generate({ family: 'k-keylick', kind: 'kl-2ba-7-down', key: 2, hands: 'RL', option: 0 });
    const R = d.notes.filter((n) => n.hand === 'R');
    const L = d.notes.filter((n) => n.hand === 'L');
    expect(L.map((n) => n.pitch + 12)).toEqual(R.map((n) => n.pitch));
    expect(L.map((n) => n.beat)).toEqual(R.map((n) => n.beat));
  });
});

describe('k-keyx: more in the key', () => {
  const fam = catalog().find((f) => f.id === 'k-keyx')!;
  it('7 levels; every item generates in all 12 keys', () => {
    expect(fam.levels).toHaveLength(7);
    for (const l of fam.levels)
      for (const s of l.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...s, key } as DrillSpec);
          expect(d.notes.length, `${s.kind} ${key}`).toBeGreaterThan(8);
          expect(d.spec.family).toBe('k-keyx');
          expect(d.itemId.startsWith('k-keyx:')).toBe(true);
        }
  });
  it('broken octaves, leaps, canon', () => {
    const b = generate({ family: 'k-keyx', kind: 'kx-boct', key: 0, hands: 'R', option: 0 });
    expect(b.notes.slice(0, 4).map((n) => n.pitch)).toEqual([60, 72, 62, 74]);
    const lp = generate({ family: 'k-keyx', kind: 'kx-leap', key: 0, hands: 'R', option: 0 });
    expect(lp.notes.slice(0, 4).map((n) => n.pitch)).toEqual([60, 74, 64, 77]);
    const c = generate({ family: 'k-keyx', kind: 'kx-canon', key: 0, hands: 'RL', option: 0 });
    const R = c.notes.filter((n) => n.hand === 'R');
    const L = c.notes.filter((n) => n.hand === 'L');
    expect(L.map((n) => n.beat)).toEqual(R.map((n) => n.beat + 1));
    expect(L.map((n) => n.pitch + 12)).toEqual(R.map((n) => n.pitch));
    const m = generate({ family: 'k-keyx', kind: 'kx-boct', key: 9, hands: 'R', option: 7, minor: true });
    expect(m.notes.some((n) => n.pitch % 12 === 8 && n.spell === 'G♯')).toBe(true);
  });
  it('the waltz and stride bass leaps run in the key (not only in C)', () => {
    const w = generate({ family: 'k-keyx', kind: 'kx-waltz', key: 4, hands: 'L', option: 0 });
    expect(w.notes[0].pitch % 12).toBe(4);
    expect(w.meter).toBe(3);
    const st = generate({ family: 'k-keyx', kind: 'kx-stride', key: 11, hands: 'L', option: 0 });
    expect(st.notes[0].pitch % 12).toBe(11);
  });
});

describe('facets: filed on the key page', () => {
  it('k-keylick on the Harmony row, major / minor by the scale', () => {
    const maj = keyFacet(generate({ family: 'k-keylick', kind: 'kl-1-t-up', key: 3, hands: 'R', option: 0 }))!;
    expect(maj).toMatchObject({ scope: 'keyed', root: 3, group: 'major', role: 'harmony' });
    const min = keyFacet(generate({ family: 'k-keylick', kind: 'kl-3-7-down', key: 9, hands: 'R', option: 7, minor: true }))!;
    expect(min).toMatchObject({ scope: 'keyed', root: 9, group: 'minor', role: 'harmony' });
  });
  it('k-keyx: patterns in the key, the bass leaps on the comping row', () => {
    expect(keyFacet(generate({ family: 'k-keyx', kind: 'kx-canon', key: 7, hands: 'RL', option: 0 }))).toMatchObject({ scope: 'keyed', root: 7, group: 'major', role: 'pattern' });
    expect(keyFacet(generate({ family: 'k-keyx', kind: 'kx-waltz', key: 7, hands: 'L', option: 0 }))).toMatchObject({ scope: 'keyed', root: 7, role: 'comping' });
    expect(keyFacet(generate({ family: 'k-keyx', kind: 'kx-ost', key: 2, hands: 'RL', option: 7, minor: true }))).toMatchObject({ group: 'minor' });
  });
});
