// Jazz in context (AUDIT-DEPTH-3 #5, #6): k-ctx, g-ctx, b-ctx — every level in all 12 keys, the brothers by
// docs/BARRY-HARRIS-THEORY.md §2, chord tones on the beats where flagged, titles en + he.
import { describe, expect, it } from 'vitest';
import { BROTHERS, CTX_KEYS, brotherArp, bassCtxFamily, ctxItem, genBassCtx, genGuitarCtx, genKeysCtx, guitarCtxFamily, keysCtxFamily, pentFor, rootless7b9, sharedDim, walkLine } from '../src/engine/drills/ctxDrills';
import { tuningById } from '../src/engine/fretboard';
import type { DrillSpec } from '../src/engine/drills/types';
import type { SpecTemplate } from '../src/engine/drills/generate';
import { LESSONS, UNITS } from '../src/content/mini/jazzContext';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const HE = /[֐-׿]/;
// Minimal level / family builders with the guitar.ts / bass.ts shapes (the real ones are wired in the catalogues).
const LT = (fam: string, level: number, en: string, he: string, specs: SpecTemplate[], keys: unknown, tempo: [number, number], sub: string, grade: number) => ({ id: `${fam}-${level}`, level, title: { en, he }, specs, keys, tempo, sub, grade }) as never;
const fam = (id: string, en: string, he: string, ...rest: unknown[]) => ({ id, title: { en, he }, levels: rest[rest.length - 1] }) as never;
const keysFam = keysCtxFamily();
const gFam = guitarCtxFamily(LT, fam) as unknown as { id: string; levels: { id: string; title: { en: string; he: string }; specs: SpecTemplate[]; keys: number[] }[] };
const bFam = bassCtxFamily(LT as never, fam) as unknown as typeof gFam;
const spec = (x: SpecTemplate, key: number): DrillSpec => ({ ...x, key }) as DrillSpec;

describe('jazz in context: the brothers (BARRY-HARRIS-THEORY §2)', () => {
  it('the brothers of the V are V7, ♭VII7, ♭II7, III7 — in C: G7, B♭7, D♭7, E7', () => {
    expect(BROTHERS).toEqual([7, 10, 1, 4]);
    for (const k of CTX_KEYS) {
      const roots = BROTHERS.map((b) => mod12(k + b));
      expect(roots).toEqual([mod12(k + 7), mod12(k + 10), mod12(k + 1), mod12(k + 4)]);
    }
  });
  it('all four share one 7♭9 rootless chord: the V7♭9 without its root (in C: B D F A♭)', () => {
    expect(sharedDim(0).slice().sort((a, b) => a - b)).toEqual([2, 5, 8, 11]);
    for (const k of CTX_KEYS) {
      const dim = sharedDim(k).slice().sort((a, b) => a - b);
      for (const b of BROTHERS) expect(rootless7b9(k + b).slice().sort((a, x) => a - x)).toEqual(dim);
      expect(rootless7b9(k + 7).slice().sort((a, x) => a - x)).toEqual(dim);
    }
  });
  it('the arpeggio is the brother 1 3 5 ♭7 ♭9, then a half step into a tone of I on beat 4', () => {
    for (const k of CTX_KEYS)
      for (let b = 0; b < 4; b++) {
        const ln = brotherArp(k, b, 60, 84);
        const r = mod12(k + BROTHERS[b]);
        expect(ln.slice(0, 5).map((n) => mod12(n.p - r))).toEqual([0, 4, 7, 10, 1]);
        const last = ln[ln.length - 1];
        const before = ln[ln.length - 2];
        expect(last.beat).toBe(4);
        expect(Math.abs(last.p - before.p)).toBe(1);
        expect([0, 4, 7, 9].map((x) => mod12(k + x))).toContain(mod12(last.p));
        expect(sharedDim(k)).toContain(mod12(before.p));
      }
  });
  it('the comping items put the brother in the V bar; the dim item voices every brother as the shared dim', () => {
    for (const k of CTX_KEYS) {
      for (let b = 0; b < 4; b++) expect(ctxItem('cx-bro-comp', k, b).chords[1].r).toBe(mod12(k + BROTHERS[b]));
      const d = genKeysCtx(spec({ family: 'k-ctx', kind: 'cx-bro-comp', hands: 'L', option: 4 }, k));
      const dim = sharedDim(k).slice().sort((a, b) => a - b);
      const sets = d.goal.chordSets!;
      // chords 2–5 are the four brothers as 7♭9: each voiced as the same four pitch classes
      for (const cs of sets.slice(1, 5)) expect(cs.required).toEqual(dim);
    }
  });
  it('walking through a brother: the root on each chord, a half step into the next root', () => {
    for (let op = 0; op < 8; op++)
      for (const k of CTX_KEYS) {
        const it0 = ctxItem('cx-walk', k, op);
        const ln = walkLine(it0.chords, 28, 52);
        let at = 0;
        it0.chords.forEach((c, i) => {
          const n = ln.find((x) => Math.abs(x.beat - at) < 1e-9)!;
          expect(mod12(n.p)).toBe(c.r);
          if (i > 0) {
            const before = ln.find((x) => Math.abs(x.beat - (at - 1)) < 1e-9)!;
            expect(Math.abs(before.p - n.p)).toBe(1);
          }
          at += c.beats;
        });
        expect(ln.every((n) => n.p >= 26 && n.p <= 52)).toBe(true);
      }
  });
});

describe('jazz in context: every level in all 12 keys', () => {
  const check = (d: ReturnType<typeof genKeysCtx>, k: number, id: string) => {
    expect(d.notes.length, id).toBeGreaterThan(0);
    expect(d.title.en.length > 0 && HE.test(d.title.he), id).toBe(true);
    expect(d.chart?.length, id).toBeGreaterThan(0);
    expect(d.itemId, id).toContain(`:${k}:`);
    expect(d.notes.every((n) => Number.isFinite(n.pitch) && n.dur > 0), id).toBe(true);
  };
  it('keys k-ctx: 13 levels, all 12 keys, every item', () => {
    expect(keysFam.levels.length).toBe(13);
    for (const lv of keysFam.levels) {
      expect(lv.keys).toEqual(CTX_KEYS);
      expect(HE.test(lv.title.he), lv.id).toBe(true);
      for (const x of lv.specs) for (const k of CTX_KEYS) check(genKeysCtx(spec(x, k)), k, `${lv.id}:${x.kind}:${x.option}:${k}`);
    }
  });
  it('guitar g-ctx: 11 levels, grades 6–8, all 12 keys on the neck', () => {
    const tu = tuningById('standard');
    expect(gFam.levels.length).toBe(11);
    for (const lv of gFam.levels) {
      expect((lv as unknown as { grade: number }).grade).toBeGreaterThanOrEqual(6);
      for (const x of lv.specs)
        for (const k of CTX_KEYS) {
          const d = genGuitarCtx(spec(x, k), tu);
          check(d, k, `${lv.id}:${x.kind}:${x.option}:${k}`);
          expect(d.notes.every((n) => n.string !== undefined && n.fret !== undefined && n.fret >= 0 && n.fret <= 17)).toBe(true);
        }
    }
  });
  it('bass b-ctx: 7 levels, all 12 keys', () => {
    const tu = tuningById('bass');
    expect(bFam.levels.length).toBe(7);
    for (const lv of bFam.levels)
      for (const x of lv.specs)
        for (const k of CTX_KEYS) {
          const d = genBassCtx(spec(x, k), tu);
          expect(d.notes.length).toBeGreaterThan(0);
          expect(d.notes.every((n) => n.pitch >= 28 && n.pitch <= 67)).toBe(true);
        }
  });
  it('line chord tones on the beats are tones of the chord there', () => {
    for (const kind of ['cx-bro-line', 'cx-bro-forms', 'cx-backdoor', 'cx-tune', 'cx-intro'])
      for (const k of CTX_KEYS) {
        const op = kind === 'cx-backdoor' ? 2 : kind === 'cx-intro' ? 1 : 0;
        const d = genKeysCtx(spec({ family: 'k-ctx', kind, hands: 'R', option: op, swing: true }, k));
        const it0 = ctxItem(kind, k, op);
        const chordAt = (b: number) => {
          let at = 0;
          for (const c of it0.chords) {
            if (b < at + c.beats - 1e-9) return c;
            at += c.beats;
          }
          return it0.chords[it0.chords.length - 1];
        };
        for (const n of d.notes)
          if (n.chordTone && Math.abs(n.beat - Math.round(n.beat)) < 1e-9) {
            const c = chordAt(n.beat);
            // the guide tone landing may anticipate the next chord by a beat (bebopLine); accept this or the next chord
            const next = chordAt(n.beat + 1);
            const ok = [c, next].some((ch) => {
              const ivs = { maj7: [0, 4, 7, 11], '6': [0, 4, 7, 9], m7: [0, 3, 7, 10], m6: [0, 3, 7, 9], '7': [0, 4, 7, 10], '7b9': [0, 4, 7, 10, 1], alt: [0, 4, 10, 1, 3, 8], hd7: [0, 3, 6, 10], dim7: [0, 3, 6, 9] }[ch.q];
              return ivs.map((x) => mod12(ch.r + x)).includes(mod12(n.pitch));
            });
            expect(ok, `${kind}:${k}:${n.beat}`).toBe(true);
          }
      }
  });
  it('pentatonics: maj7 on the 5th, m7 on the 5th, 7 on the 2nd, alt and m7♭5 on ♭3', () => {
    expect(pentFor({ r: 0, q: 'maj7', beats: 4 })).toEqual([7, 9, 11, 2, 4]);
    expect(pentFor({ r: 2, q: 'm7', beats: 4 })).toEqual([9, 0, 2, 4, 7]);
    expect(pentFor({ r: 7, q: '7', beats: 4 })).toEqual([9, 11, 1, 4, 6]);
    expect(pentFor({ r: 7, q: 'alt', beats: 4 })).toEqual([10, 1, 3, 5, 8]);
  });
  it('the Coltrane sub over ii–V–I in C: Dm7 E♭7 A♭maj7 B7 Emaj7 G7 Cmaj7', () => {
    expect(ctxItem('cx-trane', 0, 0).chords.map((c) => `${c.r}${c.q}`)).toEqual(['2m7', '37', '8maj7', '117', '4maj7', '77', '0maj7']);
  });
  it('ballad comping is slow and two-handed', () => {
    const lv = keysFam.levels[12];
    expect(lv.tempo![1]).toBeLessThanOrEqual(72);
    const d = genKeysCtx(spec(lv.specs[0], 5));
    expect(new Set(d.notes.map((n) => n.hand)).size).toBe(2);
  });
});

describe('jazz in context: lessons and the ear level', () => {
  it('one lesson per topic, en + he, every unit points at a lesson', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(6);
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const l of LESSONS) {
      expect(HE.test(l.title.he) && HE.test(l.takeaway.he), l.id).toBe(true);
      for (const st of l.steps) expect(HE.test(st.say.he), l.id).toBe(true);
    }
    for (const v of Object.values(UNITS)) expect(ids.has(v), v).toBe(true);
  });
  it('bh-brothers level 4: which brother replaced the V', () => {
    const g = TOPIC_GEN['bh-brothers'];
    expect(g.levels.length).toBe(4);
    expect(g.levels[3].en).toMatch(/brother/i);
    for (let seed = 1; seed < 30; seed++) {
      const q = g.gen(seed, 4, `t${seed}`) as { choices: string[]; answer: string; names: Record<string, { he: string }> };
      expect(q.choices).toEqual(['v', 'bvii', 'bii', 'iii']);
      expect(q.choices).toContain(q.answer);
      expect(HE.test(q.names.bvii.he)).toBe(true);
    }
  });
});
