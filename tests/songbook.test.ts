import { describe, expect, it } from 'vitest';
import { chordName, parseToken, SONGBOOK, songChords, songNotes, songPhrases, songRange } from '../src/content/songbook';

describe('songbook (public-domain songs as exercises)', () => {
  it('parses tokens', () => {
    expect(parseToken('5')).toEqual({ semi: 7, degree: 5, beats: 1 });
    expect(parseToken("1'h")).toEqual({ semi: 12, degree: 1, beats: 2 });
    expect(parseToken('5,e.')).toEqual({ semi: -5, degree: 5, beats: 0.75 });
    expect(parseToken('7#,e', true)).toEqual({ semi: -1, degree: 7, beats: 0.5 });
    expect(parseToken('rq.')).toEqual({ semi: null, degree: null, beats: 1.5 });
    expect(() => parseToken('8')).toThrow();
  });
  it('every song: every bar fills the meter, chords cover every bar, a singable range', () => {
    for (const s of SONGBOOK) {
      const notes = songNotes(s);
      const bars = s.melody.split('|').length;
      expect(s.chords.split('|').length, `${s.id} chord bars`).toBe(bars);
      expect(songChords(s).length).toBeGreaterThanOrEqual(bars);
      const [lo, hi] = songRange(s);
      expect(hi - lo, `${s.id} range`).toBeLessThanOrEqual(19);
      expect(notes.filter((n) => n.semi !== null).length).toBeGreaterThan(5);
      for (const p of s.phrases) expect(p).toBeLessThan(bars);
      expect(songPhrases(s).every((ph) => ph.some((n) => n.semi !== null))).toBe(true);
    }
  });
  it('unique ids and titles in both languages', () => {
    expect(new Set(SONGBOOK.map((s) => s.id)).size).toBe(SONGBOOK.length);
    for (const s of SONGBOOK) expect(s.title.en && s.title.he && s.credit).toBeTruthy();
  });
  it('chord names', () => {
    const g = SONGBOOK.find((s) => s.id === 'greensleeves')!;
    const cs = songChords(g);
    expect(chordName(cs[0], g.key)).toBe('Am');
    expect(chordName(cs[1], g.key)).toBe('C');
    expect(chordName(cs.find((c) => c.label === 'V')!, g.key)).toBe('E');
    const j = SONGBOOK.find((s) => s.id === 'jingle')!;
    expect(chordName(songChords(j).find((c) => c.label === 'II7')!, j.key)).toBe('D7');
  });
  it('known openings stay right', () => {
    const twinkle = songNotes(SONGBOOK[0]).slice(0, 7).map((n) => n.semi);
    expect(twinkle).toEqual([0, 0, 7, 7, 9, 9, 7]);
    const hb = songNotes(SONGBOOK.find((s) => s.id === 'happy-birthday')!).filter((n) => n.semi !== null).slice(0, 6).map((n) => n.semi);
    expect(hb).toEqual([-5, -5, -3, -5, 0, -1]);
  });
});
