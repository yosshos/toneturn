import { describe, expect, it } from 'vitest';
import { SONGBOOK, songNotes } from '../src/content/songbook';
import { semiToDeg, songDrill } from '../src/engine/drills/songDrills';
import { customProblems } from '../src/engine/drills/custom';
import { songCustom } from '../src/engine/drills/songDrills';

describe('song drills (songbook → instrument practice)', () => {
  it('semitones → creator degrees', () => {
    expect(semiToDeg(0)).toEqual({ deg: 1 });
    expect(semiToDeg(12)).toEqual({ deg: 8 });
    expect(semiToDeg(-5)).toEqual({ deg: -2 }); // G below C = degree 5 an octave down → 5 − 7
    expect(semiToDeg(6)).toEqual({ deg: 4, alt: 1 }); // F♯
    expect(semiToDeg(-1, true)).toEqual({ deg: 0, alt: 1 }); // G♯ under A minor
  });
  it('every song × part × instrument builds a valid, playable drill', () => {
    for (const s of SONGBOOK) {
      for (const part of ['melody', 'chords', 'both'] as const) {
        const c = songCustom(s, part, 'piano');
        expect(customProblems(c), `${s.id} ${part}`).toEqual([]);
        const d = songDrill(s, part, 'piano');
        expect(d.notes.length, `${s.id} ${part} notes`).toBeGreaterThan(5);
      }
      for (const inst of ['guitar', 'bass'] as const) {
        const m = songDrill(s, 'melody', inst);
        expect(m.notes.every((n) => n.string !== undefined && n.fret !== undefined), `${s.id} ${inst} tab`).toBe(true);
      }
      const g = songDrill(s, 'chords', 'guitar');
      expect(g.notes.length, `${s.id} guitar chords`).toBeGreaterThan(8);
    }
  });
  it('the melody keeps the song: pitches follow the songbook', () => {
    const tw = SONGBOOK.find((s) => s.id === 'twinkle')!;
    const d = songDrill(tw, 'melody', 'piano');
    const first = d.notes.slice(0, 7).map((n) => n.pitch - d.notes[0].pitch);
    expect(first).toEqual(songNotes(tw).slice(0, 7).map((n) => n.semi));
  });
});
