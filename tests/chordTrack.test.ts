// My song: chords and key from the player's own recording (offline chroma → beat-synchronous chord HMM, confidence
// per segment), measured against on keys / guitar where confident. Synthetic audio only.
import { describe, expect, it } from 'vitest';
import { analyseChords, chordAt, chordCoverage, chordName, CHORD_CONFIDENT, detectKey, gradeChordsAlong, synthChords, type ChordTrack, type TrackQuality } from '../src/engine/chordTrack';
import { beatGrid } from '../src/engine/beatTrack';
import { analyseRecording, ANALYSIS_VERSION, gradePlayAlong, measurePlan, phraseOfMine, sectionChordsOk, songKeyOf } from '../src/engine/mySong';
import { phraseDegrees } from '../src/engine/transcribe';

const SR = 22050;
type P = [number, TrackQuality, number][];
async function track(prog: P, bpm: number, o: Parameters<typeof synthChords>[3] = {}, useBeats = true) {
  const x = synthChords(prog, bpm, SR, o);
  const g = useBeats ? await beatGrid(x, SR) : null;
  const beats = g && g.confidence >= 0.5 ? g.beats : null;
  const melody = (o.melody ?? []).filter((m) => m > 0).map((m) => ({ midi: m, dur: 60 / bpm }));
  return { t: await analyseChords(x, SR, beats, null, melody), beat: 60 / bpm, beats };
}
/** The chord at the middle of each written chord. */
function heardAt(t: ChordTrack, prog: P, beat: number) {
  let b = 0;
  return prog.map(([, , n]) => {
    const mid = 0.5 + (b + n / 2) * beat;
    b += n;
    return chordAt(t, mid, true);
  });
}

describe('chord extraction from a recording', () => {
  it('I–vi–IV–V in C at 100: every chord found, confident; the key is C major', async () => {
    const prog: P = [[0, 'M', 4], [9, 'm', 4], [5, 'M', 4], [7, 'M', 4], [0, 'M', 4], [9, 'm', 4], [5, 'M', 4], [7, 'M', 4]];
    const { t, beat, beats } = await track(prog, 100);
    expect(beats).not.toBeNull();
    const got = heardAt(t, prog, beat);
    got.forEach((s, i) => {
      expect(s, `chord ${i}`).not.toBeNull();
      expect(s!.root, `chord ${i} ${chordName(s!)}`).toBe(prog[i][0]);
      expect(s!.q === 'm' || s!.q === 'm7', `chord ${i} ${chordName(s!)}`).toBe(prog[i][1] === 'm');
      expect(s!.conf, `chord ${i}`).toBeGreaterThanOrEqual(CHORD_CONFIDENT);
    });
    expect(t.coverage).toBeGreaterThan(0.7);
    expect(t.key).toMatchObject({ tonic: 0, minor: false });
  });
  it('a minor song (i–iv–V7–i in A minor, melody in A minor): the key is A minor, not C major', async () => {
    const prog: P = [[9, 'm', 4], [2, 'm', 4], [4, '7', 4], [9, 'm', 4], [9, 'm', 4], [2, 'm', 4], [4, '7', 4], [9, 'm', 4]];
    const melody = [69, 72, 76, 72, 74, 77, 74, 72, 71, 68, 71, 74, 72, 71, 69, 0];
    const { t, beat } = await track(prog, 96, { melody });
    expect(t.key).toMatchObject({ tonic: 9, minor: true });
    const got = heardAt(t, prog, beat);
    expect(got.filter((s, i) => s && s.root === prog[i][0]).length).toBeGreaterThanOrEqual(7);
  });
  it('7th chords: ii7–V7–Imaj7 roots and the dominant found', async () => {
    const prog: P = [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 8], [2, 'm7', 4], [7, '7', 4], [0, 'maj7', 8]];
    const { t, beat } = await track(prog, 110);
    const got = heardAt(t, prog, beat);
    got.forEach((s, i) => expect(s?.root, `chord ${i}`).toBe(prog[i][0]));
    expect(got.some((s) => s?.q === '7')).toBe(true);
  });
  it('no steady beat (half-second slots) still finds the chords', async () => {
    const prog: P = [[0, 'M', 6], [5, 'M', 6], [7, 'M', 6], [0, 'M', 6]];
    const { t, beat } = await track(prog, 80, {}, false);
    const got = heardAt(t, prog, beat);
    got.forEach((s, i) => expect(s?.root, `chord ${i}`).toBe(prog[i][0]));
  });
  it('noise is never confident (nothing measured, the screen says so)', async () => {
    const x = new Float32Array(SR * 8);
    let seed = 3;
    for (let i = 0; i < x.length; i++) x[i] = (((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1) * 0.2;
    const t = await analyseChords(x, SR, null, null, []);
    expect(t.coverage).toBeLessThan(0.15);
    expect(chordCoverage(t, 0, 8)).toBeLessThan(0.15);
  });
  it('the key from chords alone: the tonic chord that opens and closes tips relative keys', () => {
    // C major and A minor share their notes: equal weights, the chords decide
    const w = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
    const seg = (root: number, q: TrackQuality, start: number) => ({ start, end: start + 2, root, q, conf: 0.9 });
    expect(detectKey(w, [seg(9, 'm', 0), seg(2, 'm', 2), seg(4, '7', 4), seg(9, 'm', 6)])).toMatchObject({ tonic: 9, minor: true });
    expect(detectKey(w, [seg(0, 'M', 0), seg(5, 'M', 2), seg(7, 'M', 4), seg(0, 'M', 6)])).toMatchObject({ tonic: 0, minor: false });
  });
});

describe('measuring keys / guitar against the chords', () => {
  const T: ChordTrack = {
    segs: [
      { start: 0, end: 2, root: 0, q: 'M', conf: 0.9 },
      { start: 2, end: 4, root: 7, q: '7', conf: 0.9 },
      { start: 4, end: 6, root: 5, q: 'M', conf: 0.2 },
    ],
    key: { tonic: 0, minor: false, conf: 0.5 },
    coverage: 0.66,
  };
  const chroma = (pcs: number[]) => Array.from({ length: 12 }, (_, i) => (pcs.includes(i) ? 1 : 0.05));
  const strums = (at: number[], pcsAt: (t: number) => number[]) => ({ onsets: at, frames: at.flatMap((t) => [0.06, 0.12, 0.2].map((d) => ({ t: t + d, chroma: chroma(pcsAt(t)) }))) });
  it('strummed chords that match → fit 1; the wrong chord → 0; onsets under an unclear chord are skipped', () => {
    const on = [0.1, 0.6, 1.1, 1.6, 2.1, 2.6, 3.1, 3.6, 4.1, 4.6];
    const right = gradeChordsAlong(T, strums(on, (t) => (t < 2 ? [0, 4, 7] : t < 4 ? [7, 11, 2, 5] : [1, 6])));
    expect(right.fit).toBe(1);
    expect(right.skipped).toBe(2);
    const wrong = gradeChordsAlong(T, strums(on, () => [2, 6, 9]));
    expect(wrong.fit).toBe(0);
  });
  it('single notes by microphone: a chord tone on the onset fits, another note does not', () => {
    const on = [0.1, 0.6, 1.1, 2.1, 2.6, 3.1];
    const good = gradeChordsAlong(T, { onsets: on, notes: [60, 64, 67, 67, 71, 65].map((m, i) => ({ midi: m, start: on[i] })) });
    expect(good.fit).toBe(1);
    const bad = gradeChordsAlong(T, { onsets: on, notes: [61, 63, 66, 61, 63, 66].map((m, i) => ({ midi: m, start: on[i] })) });
    expect(bad.fit).toBe(0);
  });
  it('fewer than three measurable onsets → not measured (null)', () => {
    expect(gradeChordsAlong(T, { onsets: [4.2, 4.6, 0.3], notes: [{ midi: 60, start: 0.3 }] }).fit).toBeNull();
  });
});

describe('My song v3: the chords and the key feed the screens', () => {
  it('a recording with clear chords: keys / guitar are measured against the chords, drums as before; minor named from its tonic', async () => {
    const prog: P = [[9, 'm', 4], [2, 'm', 4], [4, '7', 4], [9, 'm', 4], [9, 'm', 4], [2, 'm', 4], [4, '7', 4], [9, 'm', 4]];
    const x = synthChords(prog, 96, SR, { melody: [69, 72, 76, 72, 74, 77, 74, 72, 71, 68, 71, 74, 72, 71, 69, 0] });
    const a = await analyseRecording(x, SR);
    expect(a.v).toBe(ANALYSIS_VERSION);
    expect(a.chords!.coverage).toBeGreaterThan(0.5);
    expect(a.key).toMatchObject({ tonic: 9, minor: true });
    expect(measurePlan(a, 'keys').pitch).toBe('chords');
    expect(measurePlan(a, 'guitar').pitch).toBe('chords');
    expect(measurePlan(a, 'drums').pitch).toBeNull();
    expect(measurePlan(a, 'guitar').why.en).toMatch(/chords/);
    expect(sectionChordsOk(a, a.sections[0])).toBe(true);
    const k = songKeyOf(a);
    expect(k).toEqual({ tonic: 9, minor: true });
    const ph = phraseOfMine({ i: 0, start: 0, end: 2, notes: [{ midi: 69, start: 0, dur: 0.5 }, { midi: 72, start: 0.6, dur: 0.5 }, { midi: 76, start: 1.2, dur: 0.5 }] }, k.tonic, 96, 'x', k.minor);
    expect(ph.minor).toBe(true);
    expect(phraseDegrees(ph)).toEqual(['1', '♭3', '5']);
  });
  it('no chords in the analysis (older v2, or unclear): keys fall back to the melody', () => {
    const a = { v: 2, duration: 10, analysedSec: 10, beats: { bpm: 100, beats: [1, 2, 3], confidence: 0.9, periodicity: 0.6 }, melody: { notes: [], phrases: 0 }, melodyConf: 0.9, bass: null, sections: [{ start: 0, end: 10 }] };
    expect(measurePlan(a as never, 'keys').pitch).toBe('melody');
    expect(measurePlan({ ...a, chords: { segs: [], key: null, coverage: 0.1 } } as never, 'guitar').pitch).toBe('melody');
  });
  it('a play-along take graded against the chords: right strums score, wrong ones do not', () => {
    const T: ChordTrack = { segs: [{ start: 0, end: 4, root: 0, q: 'M', conf: 0.9 }, { start: 4, end: 8, root: 7, q: 'M', conf: 0.9 }], key: null, coverage: 1 };
    const beats = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const chroma = (pcs: number[]) => Array.from({ length: 12 }, (_, i) => (pcs.includes(i) ? 1 : 0.05));
    const frames = (pcsAt: (t: number) => number[]) => beats.flatMap((b) => [0.06, 0.14].map((d) => ({ t: b + d, chroma: chroma(pcsAt(b)) })));
    const on = beats.slice(0, 8);
    const right = gradePlayAlong({ start: 0, end: 8, speed: 1, beats, notes: null, chords: T }, { onsets: on, notes: [], frames: frames((t) => (t < 4 ? [0, 4, 7] : [7, 11, 2])) });
    expect(right.pitch).toBe(1);
    expect(right.verdict).toBe('clean');
    const wrong = gradePlayAlong({ start: 0, end: 8, speed: 1, beats, notes: null, chords: T }, { onsets: on, notes: [], frames: frames(() => [1, 5, 8]) });
    expect(wrong.pitch).toBe(0);
    expect(wrong.why.en).toMatch(/chords/);
  });
});
