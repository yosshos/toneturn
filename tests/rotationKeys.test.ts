// The SPEC-RBI-ROTATION second audit (2026-11-23): local key centres, minor tunes' tonic, written tensions filter the
// menus, Lydian dominant only on a non-resolving V, the next-scale chip in "from memory", the "same notes" note once,
// a 3/4 chart in 3/4. Each defect reproduced first, then fixed.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseChart, parseChord } from '../src/engine/charts';
import { spansOfChart } from '../src/engine/ruleCards';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { classifyNotes, harmonyOf, menuFor, MENUS, type HarmonySpan } from '../src/engine/rotation';
import { buildRotationSheet, keyOfChart, rotationMeter, tonicOfChart } from '../src/engine/rotationSheet';
import { markSameNoteSeen, rotationCharts, sameNoteSeen } from '../src/ui/ScaleRotation';

const std = (id: string) => STANDARD_CHANGES.find((s) => s.id === id)!.text;
const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const harm = (text: string) => {
  const p = parseChart(text);
  return harmonyOf(spansOfChart(p, 4, p.bars), tonicOfChart(p));
};
/** The harmony span starting a bar (and, with a beat, inside it). */
const at = (h: HarmonySpan[], bar: number, beat = 0) => h.find((x) => x.at === bar * 4 + beat)!;
const span = (sym: string, root = 7): HarmonySpan => ({ at: 0, beats: 4, root, iv: parseChord(`C${sym}`)!.iv, q: 'dom', fn: 'V-maj' });

describe('1. local key centres: a chord’s function is relative to the key area it sits in', () => {
  it('All the Things You Are: Cm7 in bar 9 is vi of E♭ (Aeolian), Fm7 vi of A♭, D♭maj7 and A♭maj7 IV, D♭m7 the minor iv, Cm7 iii', () => {
    const h = harm(std('attya'));
    expect(at(h, 8).fn).toBe('vi');
    expect(at(h, 8).key).toEqual({ tonic: 3, minor: false });
    expect(MENUS[at(h, 8).fn][0].mode).toBe('aeolian');
    expect(at(h, 0).fn).toBe('vi');
    expect(at(h, 0).key).toEqual({ tonic: 8, minor: false });
    expect(at(h, 4).fn).toBe('IV');
    expect(at(h, 12).fn).toBe('IV');
    expect(at(h, 12).key?.tonic).toBe(3);
    expect(at(h, 6).fn).toBe('I');
    expect(at(h, 6).key?.tonic).toBe(0);
    expect(at(h, 22).fn).toBe('I');
    expect(at(h, 22).key?.tonic).toBe(4);
    expect(at(h, 29).fn).toBe('iv7');
    expect(at(h, 30).fn).toBe('iii');
  });
  it('ii–V–I in different keys: F♯m7 is ii of E (Dorian), never iii of the last key', () => {
    const h = harm(std('two-five-keys'));
    expect(at(h, 16).fn).toBe('ii');
    expect(at(h, 16).key?.tonic).toBe(4);
    expect(at(h, 18).fn).toBe('I');
    for (const x of h) if (x.q === 'm7') expect(x.fn, `${x.at}`).toBe('ii');
  });
  it('Autumn Leaves: E♭maj7 is IV in B♭ (Lydian), not a I (Ionian)', () => {
    const h = harm(std('autumn'));
    expect(at(h, 3).fn).toBe('IV');
    expect(at(h, 3).key).toEqual({ tonic: 10, minor: false });
    expect(MENUS.IV[0].mode).toBe('lydian');
    expect(at(h, 6).fn).toBe('i');
    expect(at(h, 6).key).toEqual({ tonic: 7, minor: true });
  });
  it('Fly Me to the Moon: Am7 in the vi / i area, Dm7 is ii (Dorian), not vi (Aeolian)', () => {
    const h = harm(std('fly'));
    expect(['vi', 'i7']).toContain(at(h, 0).fn);
    expect(at(h, 1).fn).toBe('ii');
    expect(at(h, 1).key).toEqual({ tonic: 0, minor: false });
    expect(at(h, 3).fn).toBe('I');
    expect(at(h, 4).fn).toBe('IV');
  });
  it('a minor tune: Blue Bossa’s Cm7 is the tonic (Dorian), Fm7 the minor iv, the bridge a ii–V–I in D♭', () => {
    const h = harm(std('blue-bossa'));
    expect(at(h, 0).fn).toBe('i7');
    expect(at(h, 2).fn).toBe('iv7');
    expect(at(h, 8).fn).toBe('ii');
    expect(at(h, 10).fn).toBe('I');
    expect(at(h, 10).key?.tonic).toBe(1);
  });
});

describe('2. the tonic of a minor tune ending on a turnaround', () => {
  it('Blue Bossa, Solar, minor bossa in A are minor; Lady Bird is in C; the others keep their key', () => {
    const k = (id: string) => keyOfChart(parseChart(std(id)));
    expect(k('blue-bossa')).toEqual({ tonic: 0, minor: true });
    expect(k('solar')).toEqual({ tonic: 0, minor: true });
    expect(k('minor-bossa')).toEqual({ tonic: 9, minor: true });
    expect(k('ladybird')).toEqual({ tonic: 0, minor: false });
    expect(k('attya').tonic).toBe(8);
    expect(k('autumn')).toEqual({ tonic: 7, minor: true });
    expect(k('tune-up').tonic).toBe(2);
    expect(k('misty').tonic).toBe(3);
    expect(k('minor-blues')).toEqual({ tonic: 0, minor: true });
    expect(k('blues-f').tonic).toBe(5);
    expect(k('so-what').tonic).toBe(2);
    expect(k('modal-a').tonic).toBe(9);
    expect(buildRotationSheet(std('blue-bossa'), { tier: 1 })!.tonic).toBe(0);
    expect(buildRotationSheet(std('blue-bossa'), { tier: 1 })!.minor).toBe(true);
  });
});

describe('3. written tensions filter the menus', () => {
  const modes = (sym: string, fn: HarmonySpan['fn'], tier: number) => menuFor({ ...span(sym), fn }, tier);
  it('7alt → altered only, at every tier and on V→major and V→minor', () => {
    for (const t of [1, 2, 3, 4]) for (const fn of ['V-maj', 'V-min'] as const) expect(modes('7alt', fn, t)).toEqual(['altered']);
  });
  it('7♭9 → scales with ♭9 (half-whole, Phrygian dominant, altered), never a natural 9', () => {
    for (const t of [1, 2, 3, 4])
      for (const fn of ['V-maj', 'V-min'] as const) {
        const m = modes('7b9', fn, t);
        expect(m.length).toBeGreaterThan(0);
        for (const x of m) expect(['diminished', 'phrygian-dominant', 'altered']).toContain(x);
      }
    expect(modes('7b9', 'V-min', 1)).toEqual(['phrygian-dominant']);
  });
  it('7♯11 → Lydian dominant; 7♭13 → Mixolydian ♭13 / altered (HM5 on V→minor); 7♯9 → altered / half-whole; 7♯5 → altered; 9 and 13 keep the natural 9', () => {
    for (const t of [1, 2, 3]) for (const fn of ['V-free', 'V-maj', 'V-sec'] as const) expect(modes('7#11', fn, t)).toEqual(['lydian-dominant']);
    expect(modes('7b13', 'V-maj', 3)).toEqual(['altered']);
    expect(modes('7b13', 'V-min', 3).sort()).toEqual(['altered', 'mixolydian-b6', 'phrygian-dominant']);
    for (const x of modes('7#9', 'V-maj', 4)) expect(['altered', 'diminished']).toContain(x);
    expect(modes('7#5', 'V-min', 3)).toEqual(['altered']);
    for (const x of modes('13', 'V-maj', 3)) expect(['mixolydian', 'bebop-dominant']).toContain(x);
    expect(modes('9', 'V-min', 3)).toEqual(['mixolydian-b6']);
  });
  it('the sheet never sets a scale that contradicts the written tension', () => {
    for (const tier of [1, 2, 3])
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const sh = buildRotationSheet('Dm7 | G7b9 | Cmaj7 | A7#9 | Dm7 | D7#11 | Dm7 G7alt | Cm6', { tier, seed })!;
        for (const c of sh.cells.filter((c) => !c.sub)) {
          if (c.sym === 'G7♭9' || c.sym === 'G7b9') expect(['diminished', 'phrygian-dominant', 'altered']).toContain(c.mode);
          if (c.sym === 'A7♯9' || c.sym === 'A7#9') expect(['diminished', 'altered']).toContain(c.mode);
          if (c.sym === 'D7♯11' || c.sym === 'D7#11') expect(c.mode).toBe('lydian-dominant');
          if (c.sym === 'G7alt') expect(c.mode).toBe('altered');
        }
      }
  });
  it('a note that contradicts the written tension is never a tension (A over G7♭9, even on a Mixolydian plan)', () => {
    const s = { ...span('7b9'), fn: 'V-maj' as const };
    const cls = classifyNotes([{ beat: 1, dur: 1, midi: 69 }, { beat: 2, dur: 1, midi: 68 }], [{ span: s, mode: 'mixolydian' }]);
    expect(cls[0]).not.toBe('tension');
    expect(cls[0]).not.toBe('colour');
    expect(cls[1]).toBe('ct');
  });
});

describe('4. Lydian dominant only on a non-resolving V (and the subs), never on V→major', () => {
  it('the V→major menu has no Lydian dominant at any tier; the non-resolving, secondary and sub menus do', () => {
    expect(MENUS['V-maj'].map((e) => e.mode)).not.toContain('lydian-dominant');
    expect(MENUS['V-free'].map((e) => e.mode)).toContain('lydian-dominant');
    expect(MENUS['V-sub'].map((e) => e.mode)).toContain('lydian-dominant');
    expect(MENUS['V-sec'].map((e) => e.mode)).toContain('lydian-dominant');
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const sh = buildRotationSheet('Dm7 | G7 | Cmaj7 | Cmaj7', { tier: 3, seed, choruses: 4 })!;
      for (const c of sh.cells.filter((c) => c.fn === 'V-maj')) expect(c.mode).not.toBe('lydian-dominant');
    }
  });
});

describe('5. from memory: the next-scale chip stays while playing; only the sheet hides', () => {
  it('the chip is not hidden by the memory switch', () => {
    const ui = src('ui/ScaleRotation.tsx');
    expect(ui).not.toMatch(/chip && !\(memory && running\)/);
    expect(ui).toMatch(/hidden=\{memory && running\}/);
  });
});

describe('6. the "same notes as G altered" note: only the first time the sub comes up (per device)', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('remembered in localStorage; a storage that throws never breaks it', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
    expect(sameNoteSeen()).toBe(false);
    markSameNoteSeen();
    expect(sameNoteSeen()).toBe(true);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(sameNoteSeen()).toBe(false);
    expect(() => markSameNoteSeen()).not.toThrow();
    expect(src('ui/ScaleRotation.tsx')).toMatch(/sameSeen/);
  });
});

describe('7. a 3/4 chart is laid out in 3/4', () => {
  it('a waltz chart builds a 3-beat sheet; the screen passes the meter', () => {
    expect(rotationMeter('waltz')).toBe(3);
    expect(rotationMeter('swing')).toBe(4);
    const sh = buildRotationSheet(std('blues-waltz'), { tier: 2, meter: rotationMeter('waltz') })!;
    expect(sh.meter).toBe(3);
    expect(sh.bars).toBe(12);
    expect(sh.cells.find((c) => c.bar === 10 && c.sym === 'D7')!.at % 3).toBe(1.5);
    for (const c of sh.cells) expect(c.bar).toBe(Math.floor((c.at % (12 * 3)) / 3 + 1e-6));
    const ui = src('ui/ScaleRotation.tsx');
    expect(ui).toMatch(/meter: rotationMeter\(chart\.style\)/);
    expect(ui).toMatch(/parseChart\(chart\.text, sheet\.meter\)/);
    expect(rotationCharts('en', 0).some((x) => x.c.id === 'std:blues-waltz')).toBe(true);
  });
});
