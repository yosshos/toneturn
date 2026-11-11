import { describe, expect, it } from 'vitest';
import { analyseRecording, bassFrames, bassLine, demoSong, gradePlayAlong, measurePlan, melodyKey, mixDown, phraseOfMine, phraseTake, sectionsOf, sessionResult, takeOnsets, timeStretch, transcribePhrases, type SongAnalysis, type TakeLog } from '../src/engine/mySong';
import { comparePhrase } from '../src/engine/transcribe';
import { yin } from '../src/engine/yin';
import type { SungFrame } from '../src/engine/sing';

const SR = 22050;
const sine = (hz: number, sec: number, amp = 0.4) => Float32Array.from({ length: Math.round(sec * SR) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

describe('My song: analysis (SPEC-MY-SONG §3)', () => {
  it('the demo song: beat, melody and sections; confident enough to measure keys, bass and drums', async () => {
    const a = await analyseRecording(demoSong(SR, 100, 8), SR);
    expect(a.beats).not.toBeNull();
    expect(Math.abs(a.beats!.bpm - 100)).toBeLessThan(2.5);
    expect(a.melody).not.toBeNull();
    // The tune's pitch classes come out (C D E F G A).
    const pcs = new Set(a.melody!.notes.map((n) => ((Math.round(n.midi) % 12) + 12) % 12));
    for (const p of pcs) expect([0, 2, 4, 5, 7, 9]).toContain(p);
    expect(a.sections.length).toBeGreaterThanOrEqual(1);
    expect(measurePlan(a, 'drums').timing).toBe(true);
    expect(measurePlan(a, 'keys').none).toBe(false);
    expect(measurePlan(a, 'ear').transcribe).toBe(true);
  }, 30000);

  it('a bass line of low sines comes out note for note', async () => {
    const line = [40, 43, 45, 47, 45, 43, 40, 38];
    const parts = line.map((m) => sine(hz(m), 0.5, 0.5));
    const x = new Float32Array(parts.length * parts[0].length + SR);
    parts.forEach((p, k) => x.set(p, k * p.length + SR / 2));
    const b = bassLine(await bassFrames(x, SR));
    expect(b).not.toBeNull();
    expect(b!.notes.map((n) => n.midi)).toEqual(line);
    expect(b!.confidence).toBeGreaterThan(0.6);
  });

  it('mixDown averages channels', () => {
    expect(Array.from(mixDown([Float32Array.of(1, 0), Float32Array.of(0, 1)]))).toEqual([0.5, 0.5]);
  });

  it('sections: four bars of the beat, or phrases joined, or 12 s', () => {
    const beats = { bpm: 120, beats: Array.from({ length: 40 }, (_, i) => i * 0.5), confidence: 0.9, periodicity: 0.8 };
    const s = sectionsOf(20, beats, null);
    expect(s[0]).toEqual({ start: 0, end: 8 });
    expect(s.length).toBe(2); // 39 intervals: 16 + 23 (the short tail joins)
    expect(sectionsOf(30, null, null).length).toBe(3);
    const mel = { notes: [0, 1, 2, 8, 9, 10].map((t, i) => ({ midi: 60, start: t, dur: 0.5, phrase: i < 3 ? 0 : 1 })), phrases: 2 };
    expect(sectionsOf(12, null, mel).length).toBe(1);
  });

  it('measurePlan is honest: timing only when the line is unclear; nothing without a beat or a line', () => {
    const base: SongAnalysis = { v: 1, duration: 30, analysedSec: 30, beats: { bpm: 100, beats: [0, 0.6, 1.2], confidence: 0.8, periodicity: 0.6 }, melody: null, melodyConf: 0, bass: null, sections: [] };
    const k = measurePlan(base, 'keys');
    expect(k.timing && k.pitch === null && !k.none).toBe(true);
    expect(k.why.en).toMatch(/Timing only/);
    expect(measurePlan({ ...base, beats: null }, 'drums').none).toBe(true);
    expect(measurePlan({ ...base, bass: { notes: [], confidence: 0.8 } }, 'bass').pitch).toBe('bass');
    expect(measurePlan(base, 'jazz').none).toBe(true);
  });
});

describe('My song: slowing down keeps the pitch', () => {
  it('75 % speed: 4/3 as long, same pitch', () => {
    const x = sine(440, 2);
    const y = timeStretch(x, SR, 0.75);
    expect(Math.abs(y.length - x.length / 0.75)).toBeLessThan(SR * 0.05);
    const p = yin(y.subarray(SR, SR + 2048), SR);
    expect(Math.abs((p.hz ?? 0) - 440)).toBeLessThan(3);
    expect(timeStretch(x, SR, 1)).toBe(x);
  });
});

/** Frames of a played take: notes at the given song times (speed 1), quiet between. */
function playedFrames(notes: { midi: number; t: number }[], end: number): SungFrame[] {
  const out: SungFrame[] = [];
  for (let t = 0; t < end; t += 0.02) {
    const n = notes.find((x) => t >= x.t && t < x.t + 0.25);
    out.push(n ? { t, hz: hz(n.midi), confidence: 0.95, rms: 0.2 } : { t, hz: null, confidence: 0, rms: 0.001 });
  }
  return out;
}

describe('My song: grading a play-along take', () => {
  const beats = Array.from({ length: 20 }, (_, i) => 1 + i * 0.6);
  const line = beats.slice(0, 12).map((b, i) => ({ midi: [60, 62, 64, 65][i % 4], start: b, dur: 0.5 }));

  it('on the beat with the right notes: clean (a constant 30 ms delay is forgiven)', () => {
    const fr = playedFrames(line.map((n) => ({ midi: n.midi + 12, t: n.start + 0.03 })), 10);
    const ons = takeOnsets(fr);
    expect(ons.length).toBeGreaterThanOrEqual(11);
    const g = gradePlayAlong({ start: 1, end: 8, speed: 1, beats, notes: line }, { onsets: ons, notes: line.map((n) => ({ midi: n.midi + 12, start: n.start + 0.03 })) });
    expect(g.unclear).toBeNull();
    expect(g.timing).toBeGreaterThan(0.9);
    expect(g.pitch).toBeGreaterThan(0.9);
    expect(g.verdict).toBe('clean');
  });

  it('random timing scores low; a steady 120 ms drag is named', () => {
    // Half-way between the beat and the eighth, alternately early and late.
    const rnd = [0.15, -0.15, 0.14, -0.16, 0.15, -0.14, 0.16, -0.15, 0.15, -0.15];
    const g = gradePlayAlong({ start: 1, end: 8, speed: 1, beats, notes: null }, { onsets: beats.slice(0, 10).map((b, i) => b + rnd[i]), notes: [] });
    expect(g.timing).toBeLessThan(0.3);
    const late = gradePlayAlong({ start: 1, end: 8, speed: 1, beats, notes: null }, { onsets: beats.slice(0, 10).map((b) => b + 0.12), notes: [] });
    expect(late.offsetMs).toBe(120);
    expect(late.why.en).toMatch(/behind/);
  });

  it('wrong notes lower the pitch share; too few notes is not counted', () => {
    const g = gradePlayAlong({ start: 1, end: 8, speed: 1, beats, notes: line }, { onsets: line.map((n) => n.start), notes: line.map((n) => ({ midi: n.midi + 1, start: n.start })) });
    expect(g.pitch).toBe(0);
    const few = gradePlayAlong({ start: 1, end: 8, speed: 1, beats, notes: null }, { onsets: [1, 1.6], notes: [] });
    expect(few.unclear).not.toBeNull();
  });

  it('slowed down: tolerances follow real time', () => {
    // At 50 % one song-time second is two real seconds: ±10 ms of song time is ±20 ms heard — inside; ±40 ms is ±80 ms — out.
    const at = (d: number) => gradePlayAlong({ start: 1, end: 8, speed: 0.5, beats, notes: null }, { onsets: beats.slice(0, 10).map((b, i) => b + d * (i % 2 ? 1 : -1)), notes: [] });
    expect(at(0.01).timing).toBe(1);
    expect(at(0.04).timing).toBeLessThan(0.6);
  });
});

describe('My song: transcribing (ear / jazz)', () => {
  const mel = { notes: [60, 62, 64, 65, 67, 69, 71, 72, 74, 72, 71].map((m, i) => ({ midi: m, start: 1 + i * 0.5, dur: 0.4, phrase: 0 })), phrases: 1 };

  it('phrases of at most 8 notes; the key; quarter-beat grid', () => {
    const ps = transcribePhrases(mel);
    expect(ps.length).toBe(2);
    expect(ps.every((p) => p.notes.length >= 3 && p.notes.length <= 8)).toBe(true);
    expect(melodyKey(mel.notes)).toBe(0);
    const ph = phraseOfMine(ps[0], 0, 120, 'x');
    expect(ph.notes.map((n) => n.beat)).toEqual(ph.notes.map((_, i) => i));
    expect(ph.source).toBe('own');
  });

  it("played back right → clean, compared with the coach's comparison; the result feeds dictation", () => {
    const ph = phraseOfMine(transcribePhrases(mel)[0], 0, 120, 'x');
    const r = comparePhrase(ph, ph.notes.map((n) => ({ midi: n.midi, start: 2 + n.beat * 0.5, end: null })), ph.bpm);
    expect(r.verdict).toBe('clean');
    const t = phraseTake(0, ph, r, 1, '2026-11-11T10:00:00Z', 'sess');
    expect(t.stars).toBe(3);
    expect(t.events?.[0].skill).toBe('dictation');
  });
});

describe('My song: the session result', () => {
  it('XP capped, best take per section rated, clean takes counted', () => {
    const takes: TakeLog[] = [
      { section: 0, score: 0.5, timing: 0.5, pitch: null, verdict: 'not', speed: 0.75 },
      { section: 0, score: 0.9, timing: 0.9, pitch: null, verdict: 'clean', speed: 1 },
      { section: 1, score: 0.7, timing: 0.8, pitch: 0.65, verdict: 'almost', speed: 1 },
    ];
    const r = sessionResult('keys', takes, 'sess', 100);
    expect(r.xp).toBe(1 + 4 + 2);
    expect(r.total).toBe(3);
    expect(r.firstTry).toBe(1);
    expect(r.items.filter((i) => i.skill === 'timing').length).toBe(2);
    expect(r.items.find((i) => i.skill === 'instrument')?.score).toBe(0.65);
    expect(r.score).toBeCloseTo(0.8, 5);
    const many = Array.from({ length: 30 }, (_, i): TakeLog => ({ section: i, score: 1, timing: 1, pitch: null, verdict: 'clean', speed: 1 }));
    expect(sessionResult('drums', many, 's', 100).xp).toBe(40);
  });
});
