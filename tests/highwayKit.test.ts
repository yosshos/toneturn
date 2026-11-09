import { describe, expect, it } from 'vitest';
import { backingTrack, highwaySong, judgeInput, KIT_LANE_NOTE, KIT_LANES, KIT_MAX_LEVEL, kitLaneOf, newRun, songId } from '../src/engine/highway';

describe('Rhythm Highway kit lanes (drums course)', () => {
  it('five lanes (hat, snare, kick, tom, cymbal); every level and song generates hits on them', () => {
    for (let level = 1; level <= KIT_MAX_LEVEL; level++)
      for (let song = 1; song <= 3; song++) {
        const s = highwaySong({ mode: 'kit', level: level as 1, song, bpm: 90 });
        expect(s.laneMidis).toEqual(KIT_LANES.map((l) => KIT_LANE_NOTE[l]));
        expect(s.notes.length).toBeGreaterThan(20);
        expect(s.notes.every((n) => n.midi === s.laneMidis[n.lane])).toBe(true);
        expect(new Set(s.notes.map((n) => n.lane)).has(2)).toBe(true); // kicks
        if (level >= 2) expect(s.notes.some((n) => n.lane === 3)).toBe(true); // fills on the toms
      }
    expect(songId({ mode: 'kit', level: 2, song: 1 })).toBe('k-R2-1');
  });
  it('a hit counts only on its own lane; another drum at that moment is the wrong drum', () => {
    const s = highwaySong({ mode: 'kit', level: 1, song: 1, bpm: 90 });
    const kick = s.notes.find((n) => n.lane === 2)!;
    const ok = judgeInput(s, newRun(s), kick.ms + 5, 0, KIT_LANE_NOTE.kick);
    expect(ok.note).toBe(kick.i);
    const snareAtKick = s.notes.find((n) => n.lane === 1)!;
    const wrong = judgeInput(s, newRun(s), snareAtKick.ms, 0, KIT_LANE_NOTE.cymbal);
    expect(wrong.wrongPitch).toBe(true);
    expect(wrong.run.combo).toBe(0);
  });
  it('voices map to lanes; the band brings only the bass in kit mode', () => {
    expect(['hihat', 'hhOpen', 'snare', 'rim', 'kick', 'tom2', 'crash', 'ride', 'hhPedal', null].map(kitLaneOf)).toEqual([0, 0, 1, 1, 2, 3, 4, 4, null, null]);
    const s = highwaySong({ mode: 'kit', level: 2, song: 1, bpm: 90 });
    const bt = backingTrack(s, 0, { drums: false });
    expect(bt.kit).toHaveLength(0);
    expect(bt.extras.some((e) => e.perc === 'hat')).toBe(false);
    expect(bt.extras.length).toBeGreaterThan(0);
  });
});
