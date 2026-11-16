// Audio for background / lock-screen playback (SPEC-PHRASE-STUDIO §6.5). iOS suspends the Web Audio graph when an
// installed PWA goes to the background, so playlists play through a plain media element; MIDI takes are therefore
// rendered to audio first (OfflineAudioContext with the app's instruments, PianoEngine.renderOffline), A–B spans are
// "bounced" to their own short clip (played with loop = true: no JavaScript timers, which are throttled in the
// background), and every rendered file is volume-normalised so a quiet sung take and a loud piano take sit together.
// Files are 16-bit mono WAV at 22.05 kHz (≈ 2.6 MB a minute) — the one format every browser plays and writes without
// a real-time encoder; they are cached with the take and counted in the audio budget (recExtras.ts).

import type { NoteEvent } from '../engine/lesson';
import { getRender, putRender, renderKey } from '../storage/recExtras';

export const RENDER_RATE = 22050;
/** Target loudness of rendered / bounced audio (RMS ≈ −20 dBFS), peaks kept under −0.5 dBFS. */
export const TARGET_RMS = 0.1;
export const PEAK_MAX = 0.94;
/** A clip's ends fade over this long, so the loop seam does not click. */
export const SEAM_S = 0.008;

/** The gain that brings samples to TARGET_RMS without the peak passing PEAK_MAX (1 for silence). Pure. */
export function normGain(x: Float32Array): number {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    sum += v * v;
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
  }
  if (peak < 1e-5) return 1;
  const rms = Math.sqrt(sum / x.length);
  return Math.min(TARGET_RMS / Math.max(1e-6, rms), PEAK_MAX / peak, 8);
}
/** Fade both ends in place (the loop seam). Pure on the array. */
export function fadeEnds(x: Float32Array, rate: number, s = SEAM_S): Float32Array {
  const n = Math.min(Math.floor(x.length / 2), Math.round(s * rate));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    x[i] *= g;
    x[x.length - 1 - i] *= g;
  }
  return x;
}
/** Mono mix of a buffer's channels. */
export function monoOf(chs: Float32Array[]): Float32Array {
  if (chs.length === 1) return new Float32Array(chs[0]);
  const out = new Float32Array(chs[0].length);
  for (const c of chs) for (let i = 0; i < out.length; i++) out[i] += c[i] / chs.length;
  return out;
}
/** 16-bit mono PCM WAV. */
export function wavBlob(pcm: Float32Array, rate: number): Blob {
  const b = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(b);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([b], { type: 'audio/wav' });
}
/** Bytes of a rendered file of this length (for "12 MB of room" before rendering). */
export const renderedBytes = (seconds: number, rate = RENDER_RATE) => 44 + Math.ceil(seconds * rate) * 2;

/** Anything that renders note events offline (PianoEngine). */
export interface OfflineRenderer {
  renderOffline(events: NoteEvent[], seconds: number, o?: { rate?: number; channels?: 1 | 2 }): Promise<AudioBuffer | null>;
}

const chans = (b: AudioBuffer) => Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));

/** Events → a normalised WAV (null when the browser cannot render). */
export async function renderEventsWav(engine: OfflineRenderer, events: NoteEvent[], seconds: number, normalize = true): Promise<Blob | null> {
  const buf = await engine.renderOffline(events, seconds, { rate: RENDER_RATE });
  if (!buf) return null;
  const x = monoOf(chans(buf));
  const g = normalize ? normGain(x) : 1;
  if (g !== 1) for (let i = 0; i < x.length; i++) x[i] *= g;
  return wavBlob(x, buf.sampleRate);
}

/** Decode an audio file and cut [a, b) seconds out of it as a normalised, seam-faded WAV clip. */
export async function bounceAudio(blob: Blob, a: number, b: number, normalize = true): Promise<Blob | null> {
  const G = globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };
  const Ctx = G.OfflineAudioContext ?? G.webkitOfflineAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx(1, 2, RENDER_RATE);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const sr = buf.sampleRate;
    const i0 = Math.max(0, Math.floor(a * sr));
    const i1 = Math.min(buf.length, Math.ceil(b * sr));
    if (i1 - i0 < sr * 0.1) return null;
    const x = monoOf(chans(buf).map((c) => c.subarray(i0, i1)));
    const g = normalize ? normGain(x) : 1;
    if (g !== 1) for (let i = 0; i < x.length; i++) x[i] *= g;
    // down to the render rate (nearest sample is enough for listening practice; keeps the file small)
    const k = sr / RENDER_RATE;
    const y = k > 1.01 ? Float32Array.from({ length: Math.floor(x.length / k) }, (_, i) => x[Math.floor(i * k)]) : x;
    return wavBlob(fadeEnds(y, k > 1.01 ? RENDER_RATE : sr), k > 1.01 ? RENDER_RATE : sr);
  } catch {
    return null;
  }
}

/** A take's playable file for the media element: cached when kept, rendered / bounced on demand. */
export async function backgroundSource(o: {
  takeId: string;
  /** 'audio' takes: the kept recording */
  audio?: () => Promise<Blob | null>;
  /** MIDI takes: their events (seconds) and length */
  events?: () => NoteEvent[];
  seconds: number;
  mix: string;
  span?: [number, number] | null;
  engine: OfflineRenderer;
}): Promise<{ blob: Blob; cached: boolean; clip: boolean } | null> {
  const span = o.span && o.span[1] - o.span[0] >= 0.2 ? o.span : null;
  if (o.audio && !span) {
    const b = await o.audio();
    return b ? { blob: b, cached: true, clip: false } : null;
  }
  const key = renderKey(o.takeId, o.mix, span);
  const have = await getRender(key);
  if (have) return { blob: have, cached: true, clip: !!span };
  let blob: Blob | null = null;
  if (o.audio && span) {
    const src = await o.audio();
    blob = src ? await bounceAudio(src, span[0], span[1]) : null;
  } else if (o.events) {
    const all = o.events();
    const from = span ? span[0] : 0;
    const to = span ? span[1] : o.seconds;
    const evs = all.filter((e) => e.start >= from - 0.001 && e.start < to).map((e) => ({ ...e, start: e.start - from, duration: Math.min(e.duration, to - e.start) }));
    const len = to - from;
    blob = await renderEventsWav(o.engine, evs, len + (span ? 0 : 0.6));
    if (blob && span) {
      // trim the render's tail to exactly the span and fade the seam, so the loop is gapless
      const re = await bounceAudio(blob, 0, len);
      if (re) blob = re;
    }
  }
  if (!blob) return null;
  const kept = await putRender(key, o.takeId, blob, span ? span[1] - span[0] : o.seconds);
  return { blob, cached: kept, clip: !!span };
}
