import { describe, expect, it } from 'vitest';
import { comparePhrase, gradeDegrees, heardOfPlayed, phraseBeats, phraseDegrees, phraseEvents, phraseFor, phraseStars, TX_LEVELS, type HeardNote, type Phrase } from '../src/engine/transcribe';
import { lickProblems, LICKS } from '../src/engine/licks';

/** The phrase played back as heard notes at a tempo, optionally swung, shifted, or an octave off. */
const perform = (p: Phrase, bpm = p.bpm, o: { t0?: number; octave?: number; swing?: boolean } = {}): HeardNote[] =>
  p.notes.map((n) => {
    const f = n.beat - Math.floor(n.beat);
    const b = o.swing && Math.abs(f - 0.5) < 1e-6 ? Math.floor(n.beat) + 0.5 : n.beat;
    const s = (o.t0 ?? 0.3) + (b * 60) / bpm;
    return { midi: n.midi + 12 * (o.octave ?? 0), start: s, end: s + (n.dur * 60) / bpm * 0.9 };
  });

describe('phrases by level', () => {
  it('every level generates deterministic phrases of the right size', () => {
    for (const { level } of TX_LEVELS)
      for (let seed = 1; seed <= 12; seed++) {
        const p = phraseFor(level, seed);
        expect(p).toEqual(phraseFor(level, seed));
        expect(p.level).toBe(level);
        expect(p.notes.length, `${level}/${seed}`).toBeGreaterThanOrEqual(level === 1 ? 2 : 3);
        if (level === 1) expect(p.notes).toHaveLength(2);
        if (level === 2) expect(p.notes).toHaveLength(3);
        if (level === 8) expect(phraseBeats(p)).toBeGreaterThanOrEqual(8);
        for (let i = 1; i < p.notes.length; i++) expect(p.notes[i].beat).toBeGreaterThanOrEqual(p.notes[i - 1].beat + p.notes[i - 1].dur - 1e-3);
      }
  });
  it('levels 4 is public domain, 5–8 jazz over chords; lick-based phrases are valid licks', () => {
    expect(phraseFor(4, 3).source).toBe('public-domain');
    for (let s = 1; s < 10; s++) {
      const p = phraseFor(7, s);
      expect(p.source).toBe('lick');
      expect(p.chords).not.toBeNull();
    }
    for (const l of LICKS) expect(lickProblems(l)).toEqual([]);
  });
  it('degrees are named from the key', () => {
    const p: Phrase = { ...phraseFor(1, 1), key: 2, notes: [{ midi: 62, beat: 0, dur: 1 }, { midi: 66, beat: 1, dur: 1 }, { midi: 72, beat: 2, dur: 1 }] };
    expect(phraseDegrees(p)).toEqual(['1', '3', '♭7']);
    expect(gradeDegrees(p, [0, 4, 11])).toEqual({ marks: [true, true, false], ok: 2, total: 3 });
  });
});

describe('note-by-note comparison', () => {
  const p = phraseFor(6, 4);
  it('an exact take is clean', () => {
    const r = comparePhrase(p, perform(p));
    expect(r.verdict).toBe('clean');
    expect(r.first).toBeNull();
    expect(r.score).toBe(1);
  });
  it('a steady take at another tempo, sung an octave down, is still right (own pulse, octave folded)', () => {
    const r = comparePhrase(p, perform(p, p.bpm * 0.8, { octave: -1 }));
    expect(r.verdict).toBe('clean');
    expect(r.octave).toBe(-1);
    expect(r.tempo).toBeCloseTo(0.8, 1);
  });
  it('a wrong note is named: which note, how far, which way', () => {
    const h = perform(p);
    h[2] = { ...h[2], midi: h[2].midi + 1 };
    const r = comparePhrase(p, h);
    expect(r.notes[2].verdict).toBe('pitch');
    expect(r.first).toEqual({ i: 2, what: 'pitch' });
    expect(r.why.en).toMatch(/Note 3: 1 half step too high/);
    expect(r.verdict).not.toBe('clean');
  });
  it('a missing note and an extra note are found by the alignment', () => {
    const h = perform(p);
    h.splice(3, 1);
    const r = comparePhrase(p, h);
    expect(r.notes[3].verdict).toBe('missing');
    expect(r.notes.filter((x) => x.verdict === 'ok').length).toBe(p.notes.length - 1);
    const h2 = perform(p);
    h2.splice(2, 0, { midi: 40, start: h2[2].start - 0.05, end: null });
    const r2 = comparePhrase(p, h2);
    expect(r2.extra).toBe(1);
    expect(r2.notes.every((x) => x.verdict === 'ok')).toBe(true);
  });
  it('a note out of time is late / early', () => {
    const h = perform(p);
    const beat = 60 / p.bpm;
    h[4] = { ...h[4], start: h[4].start + beat * 0.5 };
    const r = comparePhrase(p, h);
    expect(r.notes[4].verdict).toBe('late');
    expect(r.why.en).toMatch(/Note 5 came late/);
  });
  it('nothing heard is not clean, every note missing', () => {
    const r = comparePhrase(p, []);
    expect(r.verdict).toBe('not');
    expect(r.notes.every((x) => x.verdict === 'missing')).toBe(true);
  });
  it('played notes from the drills engine convert to seconds', () => {
    expect(heardOfPlayed([{ pitch: 60, on: 500, off: 900 }])).toEqual([{ midi: 60, start: 0.5, end: 0.9 }]);
  });
});

describe('results', () => {
  const p = phraseFor(3, 2);
  const clean = comparePhrase(p, perform(p));
  it('stars: played clean + written right = 3', () => {
    expect(phraseStars(clean, { ok: p.notes.length, total: p.notes.length })).toBe(3);
    expect(phraseStars(clean, { ok: 0, total: p.notes.length })).toBe(2);
    expect(phraseStars(null, null)).toBe(0);
  });
  it('a rated transcription event; a revealed answer is worth less', () => {
    const [e] = phraseEvents(p, clean, { ok: 4, total: 4 }, 'x', 's', 0, false);
    expect(e.skill).toBe('dictation');
    expect(e.tags?.[0].sub).toBe('dictation/transcribe');
    const [r] = phraseEvents(p, clean, { ok: 4, total: 4 }, 'x', 's', 0, true);
    expect(r.score!).toBeLessThan(e.score!);
    expect(phraseEvents(p, null, null, 'x', 's', 0, false)).toEqual([]);
  });
});
