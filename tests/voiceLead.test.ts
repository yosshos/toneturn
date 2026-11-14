import { describe, expect, it } from 'vitest';
import { bestMove, candidates, classify, fitOnSet, gradeVoicings, isDrop2, isDrop3, motion, optimalPath, stepLine, type VLChord, type VLGoal } from '../src/engine/drills/voiceLead';
import { analyzeVoiceLeadTake, voicingsOfTake } from '../src/engine/drills/voiceLeadAnalyze';
import { analyzeTake, micUnmeasurable } from '../src/engine/drills/analyze';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { catalog, generate } from '../src/engine/drills/generate';
import { generateGuitar, guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

// Voice leading as a performed skill (AUDIT-CONTENT-THEORY §ה.2): the grader accepts any voicing of the right type
// that moves at most `tol` semitones more than the smallest possible move.

const C = { root: 0, q: 'M' as const };
const F = { root: 5, q: 'M' as const };
const G = { root: 7, q: 'M' as const };
const Am = { root: 9, q: 'm' as const };
const triads = (chords: VLChord[] = [C, F, G, C]): VLGoal => ({ chords, at: chords.map((_, i) => i * 4), type: 'triad', tol: 1, lo: 55, hi: 79, first: [60, 64, 67] });

describe('voice-leading shapes', () => {
  it('recognises drop 2 and drop 3 (and not close position)', () => {
    // Cmaj7 close C E G B; drop 2 = G down an octave; drop 3 = E down.
    expect(isDrop2([55, 60, 64, 71])).toBe(true);
    expect(isDrop3([52, 60, 67, 71])).toBe(true);
    expect(isDrop2([60, 64, 67, 71])).toBe(false);
    expect(isDrop3([55, 60, 64, 71])).toBe(false);
    // Every inversion of a drop 2 (Dm7): A–D–F–C? (D F A C close, 2nd from top A dropped → A D F C)
    expect(isDrop2([57, 62, 65, 72])).toBe(true);
    expect(classify([55, 60, 64, 71], { root: 0, q: 'maj7' }, { type: 'drop2' }).ok).toBe(true);
    expect(classify([60, 64, 67, 71], { root: 0, q: 'maj7' }, { type: 'drop2' }).kind).toBe('type');
  });

  it('accepts every inversion of a close triad, rejects open and wrong notes', () => {
    for (const v of [[60, 64, 67], [64, 67, 72], [67, 72, 76]]) expect(classify(v, C, { type: 'triad' }).ok).toBe(true);
    expect(classify([60, 67, 76], C, { type: 'triad' }).kind).toBe('type');
    expect(classify([60, 63, 67], C, { type: 'triad' })).toMatchObject({ kind: 'wrong', wrongPcs: [3] });
    expect(classify([60, 67], C, { type: 'triad' })).toMatchObject({ kind: 'missing', missingPcs: [4] });
  });

  it('enharmonic spelling does not matter: pitches are MIDI numbers (G♯ = A♭)', () => {
    // A♭ major: A♭ C E♭ = G♯ B♯ D♯.
    expect(classify([56, 60, 63], { root: 8, q: 'M' }, { type: 'triad' }).ok).toBe(true);
  });

  it('a bass under the voicing must be the root; it is not a measured voice', () => {
    const r = classify([48, 64, 67, 72], C, { type: 'triad', bass: true });
    expect(r.ok).toBe(true);
    expect(r.voices).toEqual([64, 67, 72]);
    expect(classify([52, 64, 67, 72], C, { type: 'triad', bass: true }).kind).toBe('bass');
  });

  it('guide tones: the 3rd and the 7th only', () => {
    const Dm7 = { root: 2, q: 'm7' as const };
    expect(classify([65, 72], Dm7, { type: 'guide' }).ok).toBe(true);
    expect(classify([60, 65], Dm7, { type: 'guide' }).ok).toBe(true);
    expect(classify([62, 65], Dm7, { type: 'guide' }).kind).toBe('wrong');
  });

  it('spread: LH 1–7, RH 3–5–9 (or 3–13–9 on a dominant)', () => {
    const Dm7 = { root: 2, q: 'm7' as const };
    // D2 C3 | F3 A3 E4
    expect(classify([38, 48, 53, 57, 64], Dm7, { type: 'spread' }).ok).toBe(true);
    const G7 = { root: 7, q: '7' as const };
    // G2 F3 | B3 E4 A4 (3, 13, 9)
    expect(classify([43, 53, 59, 64, 69], G7, { type: 'spread' }).ok).toBe(true);
    expect(classify([43, 53, 59, 62, 69], G7, { type: 'spread' }).ok).toBe(true);
    expect(classify([43, 50, 59, 64, 69], G7, { type: 'spread' }).ok).toBe(false);
  });
});

describe('the smallest motion', () => {
  it('pairs voices low → high and sums the semitones', () => {
    expect(motion([60, 64, 67], [60, 65, 69])).toEqual({ total: 3, moves: [0, 1, 2] });
  });

  it('C → F from root position: C stays, E→F, G→A (3 semitones)', () => {
    const g = triads();
    const b = bestMove([60, 64, 67], F, g);
    expect(b.best).toBe(3);
    expect(b.via).toContainEqual([60, 65, 69]);
  });

  it('the optimal path I–IV–V–I keeps common tones and moves by step', () => {
    const path = optimalPath(triads());
    expect(path[0]).toEqual([60, 64, 67]);
    expect(path[1]).toEqual([60, 65, 69]);
    // F (C F A) → G: B D G (C→B, F→D? no — the nearest: B D G = 59 62 67 → 1+3+2 = 6) or D G B (62 67 71: 2+2+2 = 6)
    expect(motion(path[1], path[2]).total).toBe(6);
    expect(motion(path[2], path[3]).total).toBeLessThanOrEqual(4);
  });

  it('ii–V–I guide tones move 1 then 1 (the 7th falls to the 3rd)', () => {
    const g: VLGoal = { chords: [{ root: 2, q: 'm7' }, { root: 7, q: '7' }, { root: 0, q: 'maj7' }], at: [0, 4, 8], type: 'guide', tol: 1, lo: 52, hi: 76, first: [65, 72], sevenToThree: true };
    const path = optimalPath(g);
    expect(path).toEqual([[65, 72], [65, 71], [64, 71]]);
  });

  it('guitar: drop-2 candidates fit the string set, one note a string', () => {
    const g = { type: 'drop2' as const, lo: 40, hi: 88, strings: [[4, 3, 2, 1]], tuning: 'standard' };
    const cs = candidates({ root: 2, q: 'm7' }, g);
    expect(cs.length).toBeGreaterThan(2);
    for (const v of cs) expect(fitOnSet(v, [4, 3, 2, 1])).not.toBeNull();
    // An open triad doesn't fit strings 3-2-1 in one hand.
    expect(fitOnSet([57, 71, 79], [3, 2, 1])).toBeNull();
  });
});

describe('grading the chosen voicings', () => {
  it('accepts the smallest moves and a move one semitone more (tol 1)', () => {
    const g = triads();
    const best = gradeVoicings([[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]], g);
    expect(best.every((s) => s.verdict === 'clean')).toBe(true);
  });

  it('rejects block chords jumping in root position, names the voice that jumped', () => {
    const g = triads();
    const steps = gradeVoicings([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], g);
    expect(steps[1].verdict).toBe('not');
    expect(steps[1].excess).toBeGreaterThan(3);
    const line = stepLine(steps[1], g)!;
    expect(line.en).toMatch(/^F: (keep C, step the rest|.*voice jumped)/);
    expect(line.he).toMatch(/^F: /);
  });

  it('a small extra motion (2 over the best) is "almost"', () => {
    const g = triads([C, Am]);
    // C (C E G) → Am: best keeps C, E and moves G→A (2). Playing A C E an octave around: (57 60 64) → 3+4+3 = 10 → not.
    // (60 64 69) = best. (64 69 72) → 4+5+5 = 14 → not. Two over: none in triads — use tol 0 to see "almost".
    const steps = gradeVoicings([[60, 64, 67], [60, 64, 69]], { ...g, tol: 0 });
    expect(steps[1].verdict).toBe('clean');
    const s2 = gradeVoicings([[64, 67, 72], [64, 69, 72]], { ...g, first: [64, 67, 72], tol: 0 });
    expect(s2[1].verdict).toBe('clean');
  });

  it('the first voicing must be the written one (an octave away is fine)', () => {
    const g = triads();
    expect(gradeVoicings([[72, 76, 79]], g)[0].verdict).toBe('clean');
    expect(gradeVoicings([[64, 67, 72]], g)[0]).toMatchObject({ firstOff: true, verdict: 'almost' });
  });

  it('ii–V: a 7th that doesn\'t step down to the 3rd is flagged', () => {
    const g: VLGoal = { chords: [{ root: 2, q: 'm7' }, { root: 7, q: '7' }], at: [0, 4], type: 'close', tol: 12, lo: 53, hi: 79, sevenToThree: true };
    // Dm7 D F A C → G7 D F G B: C falls to B (ok).
    expect(gradeVoicings([[62, 65, 69, 72], [62, 65, 67, 71]], g)[1].sevenThree).toBe(true);
    // → G7 B D F G (C jumps up to D, B comes from A): flagged.
    const s = gradeVoicings([[62, 65, 69, 72], [59, 62, 65, 67]], g)[1];
    expect(s.sevenThree).toBe(false);
  });
});

// ───────────────────────────── takes ─────────────────────────────

const take = (chords: number[][], bpm: number, per = 4, opts: { hold?: number[] } = {}): PlayedNote[] => {
  const beat = 60000 / bpm;
  const out: PlayedNote[] = [];
  const heldOn = new Map<number, PlayedNote>();
  chords.forEach((v, k) => {
    const on = k * per * beat;
    for (const p of v) {
      const h = heldOn.get(p);
      if (h && h.off === null && opts.hold?.includes(p)) continue; // still down from before: never re-struck
      if (h && h.off === null) h.off = on - 20;
      const n: PlayedNote = { pitch: p, on: on + 3, off: null, vel: 70 };
      out.push(n);
      heldOn.set(p, n);
    }
    for (const [p, n] of heldOn) if (!v.includes(p) && n.off === null) n.off = on - 20;
  });
  for (const n of out) if (n.off === null) n.off = chords.length * per * beat;
  return out;
};

describe('voice-leading takes', () => {
  const drill = generate({ family: 'k-vl', kind: 'vl-triads', key: 0, hands: 'R', option: 0, tempo: 60 });

  it('the drill: chord symbols, the first voicing written, the model is the optimal path', () => {
    expect(drill.goal.vl?.type).toBe('triad');
    expect(drill.chart).toEqual(['C', 'F', 'G', 'C']);
    expect(drill.goal.vl?.first).toEqual([60, 64, 67]);
  });

  it('a held common tone (no new note-on) still counts in the next voicing', () => {
    const path = optimalPath(drill.goal.vl!);
    const played = take(path, 60, 4, { hold: [60, 67] });
    // C is held into F (never re-struck).
    expect(played.filter((p) => p.pitch === 60).length).toBeLessThan(path.filter((v) => v.includes(60)).length);
    const { voicings } = voicingsOfTake(drill, 60, played);
    expect(voicings[1]).toEqual(path[1]);
    const m = analyzeTake(drill, 60, played);
    expect(m.verdict).toBe('clean');
    expect(m.vl?.total).toBe(m.vl?.best);
  });

  it('block chords in root position pass the chord check but fail the motion', () => {
    const m = analyzeTake(drill, 60, take([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], 60));
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/voice jumped|keep/);
  });

  it('any right voicing is accepted (another inversion of the same smooth path)', () => {
    // The same progression an octave up from the written start (an octave away is fine).
    const path = optimalPath(drill.goal.vl!).map((v) => v.map((p) => p + 12));
    expect(analyzeTake(drill, 60, take(path, 60)).verdict).toBe('clean');
  });

  it('rubato: each voicing when ready, no timing', () => {
    const path = optimalPath(drill.goal.vl!);
    const played: PlayedNote[] = [];
    let t = 500;
    for (const v of path) {
      for (const p of v) played.push({ pitch: p, on: t + Math.random() * 30, off: t + 900, vel: 70 });
      t += 1800 + Math.random() * 2500;
    }
    const m = analyzeTake(drill, 60, played, undefined, { rubato: true });
    expect(m.verdict).toBe('clean');
    expect(m.timingSD).toBeNull();
    expect(m.why.en).toBe('Smooth voice leading');
  });

  it('a late chord in a timed take is a timing fault, not a voicing fault', () => {
    const path = optimalPath(drill.goal.vl!);
    const played = take(path, 60).map((p) => (p.on > 7000 && p.on < 9000 ? { ...p, on: p.on + 400 } : p));
    const m = analyzeVoiceLeadTake(drill, 60, played);
    expect(m.vl!.steps.every((s) => s.cls.ok)).toBe(true);
    expect(m.verdict).not.toBe('clean');
  });

  it('by microphone the piano can\'t tell the voicing: not measured', () => {
    expect(micUnmeasurable(drill)).toContain('voicing');
    const m = analyzeTake(drill, 60, take(optimalPath(drill.goal.vl!), 60), undefined, { mic: true });
    expect(m.verdict).toBe('not');
    expect(m.unmeasured).toContain('voicing');
  });
});

describe('every voice-leading item', () => {
  const pianoLevels = catalog().find((f) => f.id === 'k-vl')!.levels;
  const guitarLevels = guitarCatalog().find((f) => f.id === 'g-vl')!.levels;

  it('8 piano levels, 3 guitar levels; every item generates and its own model path is clean', () => {
    expect(pianoLevels).toHaveLength(8);
    expect(guitarLevels).toHaveLength(3);
    for (const lv of [...pianoLevels, ...guitarLevels]) {
      const ds: Drill[] = levelDrills(lv, 'fifths-up');
      expect(ds.length).toBeGreaterThan(0);
      for (const d of ds) {
        const g = d.goal.vl!;
        const path = optimalPath(g);
        expect(path).toHaveLength(g.chords.length);
        // The written notes (bass included) are the optimal path and grade clean.
        const byChord = g.at.map((b) => d.notes.filter((n) => Math.abs(n.beat - b) < 1e-6).map((n) => n.pitch));
        const steps = gradeVoicings(byChord, g);
        expect(steps.every((s) => s.verdict === 'clean'), `${d.itemId}`).toBe(true);
        const m = d.spec.family === 'g-vl' ? analyzeGuitarTake(d, d.startBpm, take(byChord, d.startBpm, g.at[1] - g.at[0])) : analyzeTake(d, d.startBpm, take(byChord, d.startBpm, g.at[1] - g.at[0]));
        expect(m.verdict, `${d.itemId}: ${m.why.en}`).toBe('clean');
        // Symbols fit a phone row: at most 8 chords.
        expect(g.chords.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('melody items keep the melody on top of every model voicing', () => {
    for (const d of levelDrills(pianoLevels[7], 'fifths-up')) {
      const g = d.goal.vl!;
      optimalPath(g).forEach((v, k) => expect(Math.max(...v)).toBe(g.chords[k].melody));
    }
  });

  it('guitar by microphone: the model path is judged like any chord drill (no voicing grade)', () => {
    const d = generateGuitar({ family: 'g-vl', kind: 'gvl-drop2', key: 0, hands: 'R', option: 0, instrument: 'guitar', tempo: 60 });
    expect(d.show).toBe('chart');
    expect(micUnmeasurable(d)).not.toContain('voicing');
    const m = analyzeGuitarTake(d, 60, [], undefined, [{ t: 0, hz: null, rms: 0 }]);
    expect(m.vl).toBeUndefined();
  });
});
