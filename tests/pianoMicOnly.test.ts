import { describe, expect, it } from 'vitest';
import { pianoMicHiddenLevels, shownFamilies, levelDrills } from '../src/engine/drills/plan';
import { ladderHiddenFor } from '../src/engine/ladderFacts';
import { micUnmeasurable } from '../src/engine/drills/analyze';

describe('piano: microphone only (0.67, owner)', () => {
  it('hides exactly the levels with an item the microphone cannot measure', () => {
    const hidden = pianoMicHiddenLevels();
    expect(hidden.length).toBeGreaterThan(0);
    const all = shownFamilies({ emphasis: 'both', instrument: 'piano' });
    const mic = shownFamilies({ emphasis: 'both', instrument: 'piano', pianoMicOnly: true });
    const ids = (fs: typeof all) => fs.flatMap((f) => f.levels.map((l) => l.id));
    expect(ids(mic).length).toBe(ids(all).length - ids(all).filter((id) => hidden.includes(id)).length);
    for (const f of mic) for (const l of f.levels) for (const d of levelDrills(l, 'fifths-up')) expect(micUnmeasurable(d)).toEqual([]);
  });
  it('the keys path leaves them out only when the setting is on', () => {
    expect(ladderHiddenFor('keys')).toEqual([]);
    expect(ladderHiddenFor('keys', undefined, undefined, true)).toEqual(pianoMicHiddenLevels());
  });
});
