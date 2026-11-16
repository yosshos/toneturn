// Chord-melody, deeper (AUDIT-DEPTH-3 #4 and C1 on the guitar): g-cmel 7 6-dim blocks in drop 2, 8 drop 2 under every
// melody note (eight bars), 9 the solo-guitar chorus with walking-bass fills. Every served head, all 12 keys.
import { describe, expect, it } from 'vitest';
import { guitarCatalog, generateGuitar } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { decodeHead } from '../src/engine/drills/headDrills';
import { chordAt, headIn, notesIn, sixDimUnder } from '../src/engine/heads';
import { familyLevelCount } from '../src/engine/badges';
import { isDrop2 } from '../src/engine/drills/voiceLead';
import type { DrillSpec } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;
const fam = () => guitarCatalog().find((f) => f.id === 'g-cmel')!;
const lv = (n: number) => fam().levels.find((l) => l.id === `g-cmel-${n}`)!;
const groups = (d: ReturnType<typeof generateGuitar>) => {
  const m = new Map<number, typeof d.notes>();
  for (const n of d.notes) m.set(Math.round(n.beat * 1e4), [...(m.get(Math.round(n.beat * 1e4)) ?? []), n]);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, ns]) => ns);
};

describe('g-cmel 7–9', () => {
  it('levels, grades 9–10, titles and badges', () => {
    expect(fam().levels).toHaveLength(9);
    expect([lv(7).specs[0].kind, lv(8).specs[0].kind, lv(9).specs[0].kind]).toEqual(['cm-six', 'cm-every', 'cm-solo']);
    expect(familyLevelCount('g-cmel')).toBeGreaterThanOrEqual(9);
  });
  it('6-dim blocks: every 4-note block is drop 2 with the melody on top, a 6th chord or its dim (12 keys)', () => {
    for (const s of lv(7).specs)
      for (let k = 0; k < 12; k++) {
        const d = generateGuitar({ ...s, key: k } as DrillSpec);
        const { head, phrase } = decodeHead(s.option);
        const hi = headIn(head, k, 'guitar');
        let blocks = 0;
        for (const g of groups(d)) {
          if (g.length < 4) continue;
          blocks++;
          const ps = g.map((n) => n.pitch).sort((a, b) => a - b);
          expect(isDrop2(ps)).toBe(true);
          const top = ps[3];
          const mel = hi.notes.find((n) => Math.abs(n.beat - phrase * 16 - g[0].beat) < 1e-6)!;
          expect(top).toBe(mel.pitch);
          const u = sixDimUnder(mel.pitch, chordAt(hi.chords, mel.beat))!;
          const iv = u.q === 'dim7' ? [0, 3, 6, 9] : u.q === 'm6' ? [0, 3, 7, 9] : [0, 4, 7, 9];
          expect(new Set(ps.map(pc))).toEqual(new Set(iv.map((i) => pc(u.root + i))));
        }
        expect(blocks, `${head.id} ${k}`).toBeGreaterThan(3);
      }
  });
  it('drop 2 under every note: eight bars, a block under (nearly) every melody note of an 8th or longer', () => {
    for (const d of levelDrills(lv(8), 'fifths-up')) {
      const { head, phrase } = decodeHead(d.spec.option);
      const hi = headIn(head, d.spec.key, 'guitar');
      const mel = notesIn(hi, phrase * 4, phrase * 4 + 8).filter((n) => n.dur >= 0.5);
      const blocks = groups(d).filter((g) => g.length >= 4).length;
      expect(d.beats).toBeGreaterThanOrEqual(32);
      expect(blocks, d.title.en).toBeGreaterThanOrEqual(Math.floor(mel.length * 0.6));
    }
  });
  it('solo guitar: the whole chorus; a long note leaves room for walking-bass notes, the last a half step under the next root', () => {
    for (const d of levelDrills(lv(9), 'fifths-up').slice(0, 24)) {
      const { head } = decodeHead(d.spec.option);
      const hi = headIn(head, d.spec.key, 'guitar');
      expect(d.beats).toBeGreaterThanOrEqual(hi.bars.length * 4);
      const singles = d.notes.filter((n) => !hi.notes.some((m) => Math.abs(m.beat - n.beat) < 1e-6) && n.pitch < 55);
      expect(singles.length, d.title.en).toBeGreaterThan(0);
      for (const b of singles.filter((n) => n.chordTone === false || (n as { ct?: boolean }).ct === false)) {
        const next = chordAt(hi.chords, Math.ceil(b.beat + 1e-6));
        expect(pc(b.pitch + 1)).toBe(pc(next.root));
      }
    }
  });
});
