import { describe, expect, it } from 'vitest';
import { DisplaySmoother, NoteNamer, octaveFold, smoothTrack, zoneState, ZONE_LOOK, chipCents } from '../src/engine/pitchDisplay';
import { centsTrack, synthHold, synthMelody } from '../src/engine/vocal';
import { midiToHz } from '../src/engine/pitch';
import { bestStretch, liveVibrato, sliceSteadiness, steadyLevel, zoneTolerance } from '../src/engine/vocalLive';
import type { SungFrame } from '../src/engine/sing';
import { VoiceCheckState, levelOf } from '../src/engine/voiceCheck';

const f = (t: number, midi: number | null, confidence = 0.95): SungFrame => ({ t, hz: midi === null ? null : midiToHz(midi), confidence: midi === null ? 0 : confidence, rms: 0.08 });

describe('display smoothing', () => {
  it('follows a leap within two frames (no lag)', () => {
    const frames = synthMelody([60, 64, 57], 0.5);
    const pts = smoothTrack(frames);
    // the first frame of the second note
    const k = frames.findIndex((x) => x.hz && Math.abs(x.hz - midiToHz(64)) < 1);
    expect(Math.abs(pts[k + 2].m! - 64)).toBeLessThan(0.25);
    const k2 = frames.findIndex((x) => x.hz && Math.abs(x.hz - midiToHz(57)) < 1);
    expect(Math.abs(pts[k2 + 2].m! - 57)).toBeLessThan(0.25);
  });

  it('keeps a 5.6 Hz ±40 ¢ vibrato within 15 % of its width', () => {
    const frames = synthHold(62, { seconds: 4, vibRate: 5.6, vibExtent: 40 });
    const pts = smoothTrack(frames).filter((p) => p.t > 1 && p.m !== null);
    const cs = pts.map((p) => (p.m! - 62) * 100);
    const half = (Math.max(...cs) - Math.min(...cs)) / 2;
    expect(half).toBeGreaterThan(40 * 0.85);
    expect(half).toBeLessThan(40 * 1.15);
  });

  it('steadies a jittery held note', () => {
    const frames = synthHold(62, { seconds: 3, jitter: 12, seed: 7 });
    const raw = frames.filter((x) => x.hz).map((x) => 1200 * Math.log2(x.hz! / midiToHz(62)));
    const sm = smoothTrack(frames).filter((p) => p.m !== null && p.t > 0.8).map((p) => (p.m! - 62) * 100);
    const sd = (xs: number[]) => Math.sqrt(xs.reduce((a, x) => a + x * x, 0) / xs.length);
    expect(sd(sm)).toBeLessThan(sd(raw) * 0.6);
  });

  it('rejects single-frame octave and fifth glitches, accepts a real octave leap', () => {
    const fr: SungFrame[] = [];
    for (let i = 0; i < 20; i++) fr.push(f(i * 0.02, 60));
    fr.push(f(20 * 0.02, 48)); // sub-octave glitch
    fr.push(f(21 * 0.02, 67, 0.85)); // weak fifth glitch
    for (let i = 22; i < 30; i++) fr.push(f(i * 0.02, 60));
    const s = new DisplaySmoother();
    const pts = fr.map((x) => s.push(x));
    for (const p of pts) expect(Math.abs(p.m! - 60)).toBeLessThan(0.3);
    // a held jump to the upper octave wins after 3 frames
    const s2 = new DisplaySmoother();
    const leap: SungFrame[] = [];
    for (let i = 0; i < 10; i++) leap.push(f(i * 0.02, 60));
    for (let i = 10; i < 25; i++) leap.push(f(i * 0.02, 72));
    const out = leap.map((x) => s2.push(x));
    expect(Math.abs(out[out.length - 1].m! - 72)).toBeLessThan(0.2);
  });

  it('bridges a weak frame inside a note but breaks on silence', () => {
    const fr: SungFrame[] = [];
    for (let i = 0; i < 10; i++) fr.push(f(i * 0.02, 60));
    fr.push(f(0.2, null)); // one consonant frame
    for (let i = 11; i < 20; i++) fr.push(f(i * 0.02, 60));
    for (let i = 20; i < 30; i++) fr.push(f(i * 0.02, null)); // 200 ms of silence
    const pts = smoothTrack(fr);
    expect(pts[10].m).not.toBeNull();
    expect(pts[10].bridged).toBe(true);
    expect(pts[29].m).toBeNull();
  });
});

describe('note-name hysteresis', () => {
  it('does not flicker on the ±50 ¢ border and changes after a held new note', () => {
    const n = new NoteNamer();
    let shown: number | null = null;
    // settle on A4
    for (let i = 0; i < 10; i++) shown = n.push(i * 0.02, 69.05);
    expect(shown).toBe(69);
    // wobble across the border (69.45 ↔ 69.55): stays A4 (within 60 ¢)
    for (let i = 10; i < 40; i++) shown = n.push(i * 0.02, i % 2 ? 69.55 : 69.45);
    expect(shown).toBe(69);
    // a short blip to B♭4 (40 ms) is ignored
    shown = n.push(0.82, 70);
    shown = n.push(0.84, 70);
    shown = n.push(0.86, 69);
    expect(shown).toBe(69);
    // held B♭4 for 100 ms switches
    for (let i = 0; i < 6; i++) shown = n.push(0.9 + i * 0.02, 70);
    expect(shown).toBe(70);
    // silence → null after 150 ms
    for (let i = 0; i < 10; i++) shown = n.push(1.1 + i * 0.02, null);
    expect(shown).toBeNull();
  });
});

describe('colour states', () => {
  it('maps cents to in / close / out with a shape twin for every colour', () => {
    expect(zoneState(0, 20)).toBe('in');
    expect(zoneState(-20, 20)).toBe('in');
    expect(zoneState(30, 20)).toBe('close-sharp');
    expect(zoneState(-45, 20)).toBe('close-flat');
    expect(zoneState(80, 20)).toBe('sharp');
    expect(zoneState(-120, 35)).toBe('flat');
    expect(zoneState(null, 20)).toBe('none');
    for (const k of ['in', 'close-sharp', 'close-flat', 'sharp', 'flat'] as const) expect(ZONE_LOOK[k].mark).not.toBe('');
    expect(ZONE_LOOK.sharp.color).toBe('tangerine');
    expect(ZONE_LOOK.flat.color).toBe('purple');
    expect(chipCents(12)).toBe(10);
    expect(chipCents(-8)).toBe(-10);
    expect(octaveFold(48.2, 60)).toBe(12);
  });

  it('zone tolerance by level', () => {
    expect(zoneTolerance({ kind: 'hold', difficulty: 900 })).toBe(35);
    expect(zoneTolerance({ kind: 'hold', difficulty: 1400 })).toBe(20);
    expect(zoneTolerance({ kind: 'hold', difficulty: 1900 })).toBe(10);
    expect(zoneTolerance({ kind: 'fine-tune', difficulty: 900 })).toBe(10);
  });
});

describe('steadiness bars', () => {
  it('a healthy vibrato reads steady; a wobbly straight tone does not', () => {
    const vib = centsTrack(synthHold(62, { seconds: 4, vibRate: 5.6, vibExtent: 32 }), 62);
    const lv = sliceSteadiness(vib, 0.8, 10);
    expect(Math.min(...lv)).toBeGreaterThanOrEqual(3);
    const wob = centsTrack(synthHold(62, { seconds: 4, jitter: 45, seed: 3 }), 62);
    const lw = sliceSteadiness(wob, 0.8, 10);
    expect(Math.max(...lw)).toBeLessThanOrEqual(2);
    const clean = centsTrack(synthHold(62, { seconds: 4, jitter: 2 }), 62);
    expect(bestStretch(sliceSteadiness(clean, 0.5, 12))).toBeGreaterThanOrEqual(2.5);
  });

  it('levels and silence', () => {
    expect(steadyLevel(5)).toBe(4);
    expect(steadyLevel(10)).toBe(3);
    expect(steadyLevel(18)).toBe(2);
    expect(steadyLevel(30)).toBe(1);
    expect(steadyLevel(NaN)).toBe(0);
    expect(sliceSteadiness([], 0, 3)).toEqual([0, 0, 0]);
  });
});

describe('live vibrato (chip parameters)', () => {
  it('reads rate and width from a 0.9 s window', () => {
    const tr = centsTrack(synthHold(62, { seconds: 3, vibRate: 5.6, vibExtent: 40 }), 62);
    const v = liveVibrato(tr);
    expect(v.state).toBe('vibrato');
    expect(v.rate).toBeGreaterThan(5.1);
    expect(v.rate).toBeLessThan(6.1);
    expect(v.extent).toBeGreaterThanOrEqual(30);
    expect(v.extent).toBeLessThanOrEqual(45);
    expect(v.extent % 5).toBe(0);
  });
  it('a straight tone reads straight; too little sound reads none', () => {
    expect(liveVibrato(centsTrack(synthHold(62, { seconds: 2, jitter: 2 }), 62)).state).toBe('straight');
    expect(liveVibrato(centsTrack(synthHold(62, { seconds: 0.3 }), 62)).state).toBe('none');
  });
});

describe('voice check', () => {
  it('says "got it" after 0.3 s of clear voice and hints after 4 s of silence', () => {
    const a = new VoiceCheckState();
    for (let i = 0; i < 30; i++) a.push({ t: i * 0.03, hz: null, confidence: 0, rms: 0.001 });
    expect(a.got).toBe(false);
    for (let i = 30; i < 50; i++) a.push({ t: i * 0.03, hz: midiToHz(57), confidence: 0.95, rms: 0.08 });
    expect(a.got).toBe(true);
    expect(a.note).toBe(57);
    expect(a.level).toBeGreaterThan(0.5);
    const b = new VoiceCheckState();
    for (let i = 0; i < 100; i++) b.push({ t: i * 0.05, hz: null, confidence: 0, rms: 0.001 });
    expect(b.hint(3)).toBe(false);
    expect(b.hint(4.95)).toBe(true);
    expect(levelOf(0.00001)).toBe(0);
    expect(levelOf(1)).toBe(1);
  });
});
