import { describe, expect, it } from 'vitest';
import { genRead2, READ2_KINDS } from '../src/engine/drills/keysRead2';
import { spellIn } from '../src/engine/aids';
import type { DrillSpec, FamilyId } from '../src/engine/drills/types';
import type { PitchClass } from '../src/engine/pitch';

// As the run screen reads the key from the key signature (DrillTake.tsx keyName).
const keyOf = (sig: string): PitchClass | null => (sig === 'C' ? null : ({ letter: sig[0], acc: sig.includes('b') ? -1 : sig.includes('#') ? 1 : 0 } as unknown as PitchClass));

// Generated sight-reading in a minor key writes the raised 7th as a sharp (G♯ in A minor), never as a flat (A♭).
describe('k-read minor keys spell the raised 7th as a sharp', () => {
  for (const kind of READ2_KINDS)
    it(kind, () => {
      for (let key = 0; key < 12; key++) {
        const spec = { family: 'k-read' as FamilyId, kind, key, minor: true, hands: 'RL', option: 0 } as DrillSpec;
        const d = genRead2(spec);
        const lt = (key + 11) % 12;
        expect(d.sharps).toContain(lt);
        for (const n of d.notes.filter((x) => ((x.pitch % 12) + 12) % 12 === lt)) {
          const s = spellIn(n.pitch, keyOf(d.keySig ?? 'C'), d.sharps);
          expect(s.acc, `${kind} key ${key}: pitch ${n.pitch}`).not.toBe(-1);
        }
      }
    });
});
