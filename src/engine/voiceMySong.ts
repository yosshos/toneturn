// "My song" (VOICE_CURRICULUM F13 L8): the singer's own recording, opened on the device (it never leaves it — legal
// per docs MUSIC_SOURCES_LEGAL: own audio). Its sung melody is taken out offline (YIN on a decimated copy), split into
// phrases at the breaths, and turned into a song plan, so the singer is scored against it phrase by phrase with the
// same grader as the band songs. Pure apart from the async yield in `framesFromSamples`.
//
// Honest limits: a melody comes out cleanly only when the voice is the loudest pitched sound (a cappella, voice and
// one instrument); a full band mix gives gaps or wrong notes, and the screen says so.

import type { SungFrame } from './sing';
import { downsample, yin } from './yin';
import { segmentNotes } from './memory';
import type { PlanNote, PlanPhrase, SongPlan } from './voiceSongs';
import type { VoiceSong } from '../content/voiceSongs';
import type { VoiceRange } from './vocal';

/** Pitch frames of a recording (mono samples), every 20 ms, on a 4× decimated copy so a phone stays responsive. */
export async function framesFromSamples(samples: Float32Array, sampleRate: number, o: { maxSec?: number; yieldEvery?: number; onProgress?: (p: number) => void } = {}): Promise<SungFrame[]> {
  const maxSec = o.maxSec ?? 75;
  const factor = sampleRate >= 32000 ? 4 : sampleRate >= 16000 ? 2 : 1;
  const x = downsample(samples.subarray(0, Math.min(samples.length, Math.floor(maxSec * sampleRate))), factor);
  const sr = sampleRate / factor;
  let peak = 0;
  for (let i = 0; i < x.length; i += 4) peak = Math.max(peak, Math.abs(x[i]));
  const gain = peak > 0 ? 0.9 / peak : 1;
  const win = Math.round(sr * 0.046);
  const hop = Math.round(sr * 0.02);
  const out: SungFrame[] = [];
  const buf = new Float32Array(win);
  const every = o.yieldEvery ?? 150;
  for (let s = 0, k = 0; s + win <= x.length; s += hop, k++) {
    for (let i = 0; i < win; i++) buf[i] = x[s + i] * gain;
    const p = yin(buf, sr, { minHz: 75, maxHz: 1000, minRms: 0.02, downsample: 1 });
    out.push({ t: (s + win / 2) / sr, hz: p.hz, confidence: p.confidence, rms: p.rms });
    if (k % every === every - 1) {
      o.onProgress?.(s / x.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  o.onProgress?.(1);
  return out;
}

export interface MyMelody {
  notes: { midi: number; start: number; dur: number; phrase: number }[];
  phrases: number;
}

/**
 * The sung melody of a recording: notes of 0.12 s or more, snapped to the semitone grid of the recording's own
 * tuning (a take 20 ¢ sharp stays 20 ¢ sharp, so singing with it is in tune), split into phrases at gaps of 0.45 s
 * or more (or 0.2 s once a phrase has 12 notes). Null when fewer than six notes come out.
 */
export function melodyFromFrames(frames: SungFrame[]): MyMelody | null {
  const segs = segmentNotes(frames, { minSec: 0.12 });
  if (segs.length < 6) return null;
  const fracs = segs.map((s) => s.midi - Math.round(s.midi)).sort((a, b) => a - b);
  const off = fracs[fracs.length >> 1];
  const notes: MyMelody['notes'] = [];
  let phrase = 0;
  let inPhrase = 0;
  segs.forEach((s, i) => {
    if (i > 0) {
      const gap = s.start - segs[i - 1].end;
      if (gap >= 0.45 || (inPhrase >= 12 && gap >= 0.2)) {
        phrase++;
        inPhrase = 0;
      }
    }
    notes.push({ midi: Math.round(s.midi - off) + off, start: s.start, dur: Math.max(0.12, s.end - s.start), phrase });
    inPhrase++;
  });
  return { notes, phrases: phrase + 1 };
}

const MINE: VoiceSong = {
  id: 'mine',
  title: { en: 'My song', he: 'השיר שלי' },
  credit: { en: 'Your recording', he: 'ההקלטה שלכם' },
  tier: 'own',
  meter: 1,
  melody: '',
  chart: '',
  phrases: [],
  level: 3,
  style: 'pop',
  bpm: 100,
};

/**
 * The extracted melody as a song plan the band-song grader understands: one "bar" per phrase (no clock of bars — the
 * recording is the clock), notes moved by octaves to the middle of the singer's range (pitch is graded octave-folded).
 */
export function mySongPlan(m: MyMelody, range: VoiceRange): SongPlan {
  const ms = m.notes.map((n) => n.midi).sort((a, b) => a - b);
  const mid = ms[ms.length >> 1];
  const shift = Math.round(((range.low + range.high) / 2 - mid) / 12) * 12;
  const notes: PlanNote[] = m.notes.map((n, i) => ({ midi: n.midi + shift, start: n.start, dur: n.dur, phrase: n.phrase, bar: n.phrase, fresh: i === 0 || n.phrase !== m.notes[i - 1].phrase || n.start - (m.notes[i - 1].start + m.notes[i - 1].dur) > 0.1 }));
  const phrases: PlanPhrase[] = Array.from({ length: m.phrases }, (_, i) => {
    const idx = notes.map((n, k) => (n.phrase === i ? k : -1)).filter((k) => k >= 0);
    const a = notes[idx[0]];
    const b = notes[idx[idx.length - 1]];
    return { i, fromBar: i, toBar: i, start: a.start, end: b.start + b.dur, notes: idx };
  });
  return { song: MINE, tonic: Math.round(notes[0].midi), bpm: 100, beat: 0.6, meter: 1, bars: m.phrases, notes, phrases, chartBars: [] };
}
