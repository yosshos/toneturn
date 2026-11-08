import { describe, expect, it } from 'vitest';
import { keysForChords, songChordNames, songFit } from '../src/engine/songChords';
import { SONGBOOK } from '../src/content/songbook';

describe('songbook by the chords you know', () => {
  const tw = { chords: 'I | IV I | V7 I', minor: false, key: 0 };
  it('names a song’s chords in a key', () => {
    expect(songChordNames(tw, 0).sort()).toEqual(['C', 'F', 'G7']);
    expect(songChordNames(tw, 7).sort()).toEqual(['C', 'D7', 'G']);
    expect(songChordNames({ chords: 'i | iv | V7 | i', minor: true }, 9).sort()).toEqual(['Am', 'Dm', 'E7']);
  });
  it('finds the key where every chord is known (G7 counts when G is known)', () => {
    const fit = songFit(tw, new Set(['G', 'C', 'D']));
    expect(fit.kind).toBe('playable');
    expect(fit.key).toBe(7);
    const one = songFit(tw, new Set(['C', 'G']));
    expect(one.kind).toBe('one-new');
    expect(one.missing).toHaveLength(1);
  });
  it('every song in the book parses into chord names', () => {
    for (const s of SONGBOOK) {
      const names = songChordNames(s, s.key);
      expect(names.length, s.id).toBeGreaterThan(0);
      expect(keysForChords(s, new Set()).length).toBe(12);
    }
  });
});
