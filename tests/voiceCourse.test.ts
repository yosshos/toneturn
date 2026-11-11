// The voice course (docs/research/VOICE_CURRICULUM.md): placement, families, measured rules.
import { describe, expect, it } from 'vitest';
import { stepCatalogue } from '../src/engine/path';

const vocal = () => stepCatalogue().filter((s) => s.kind === 'vocal');
const step = (ref: string) => vocal().find((s) => s.ladder!.ref === ref)!;

describe('voice path placement (VOICE_CURRICULUM §8, VOICE_LATER)', () => {
  it('Barry Harris L1, harmony L1 and modes L1 no longer sit next to "hold a note" L1', () => {
    const hold = step('1').difficulty;
    expect(step('301').difficulty).toBeGreaterThanOrEqual(hold + 6 * 70);
    expect(step('201').difficulty).toBeGreaterThan(hold);
    expect(step('101').difficulty).toBeGreaterThan(hold);
  });
});
