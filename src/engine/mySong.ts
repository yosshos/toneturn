// "My song" in every course (SPEC-MY-SONG): the player's own recording, opened on the device and kept there. One
// analysis serves every course — the beat grid (beatTrack.ts), the sung / lead melody (voiceMySong.ts) and a bass line —
// each with a confidence, so a screen measures only what was taken out reliably and says so. Pure apart from the
// async yields of the analysis.
//
//   keys / guitar: play along — timing against the beat, the pitch of the melody where it came out cleanly;
//   bass: the same against the bass line; drums: timing against the beat;
//   ear / jazz: transcribe a phrase of the melody and play or sing it back (transcribe.ts comparePhrase);
//   voice: sing the melody (level 1308, voiceMySong.ts) — stored here so it is not analysed again.

import type { CourseId } from './courses';
import type { SungFrame } from './sing';
import type { RatingEvent } from './rating';
import { beatGrid, BEAT_CONFIDENT, type BeatGrid } from './beatTrack';
import { framesFromSamples, melodyFromFrames, type MyMelody } from './voiceMySong';
import { downsample, yin } from './yin';
import { segmentNotes } from './memory';
import { phraseDifficulty, phraseStars, type Phrase, type PhraseResult } from './transcribe';

type T2 = { en: string; he: string };

/** Bump when the analysis changes: stored songs are analysed again on open. */
export const ANALYSIS_VERSION = 2;
// v2: the beat grid may say 3/4 (meter, downbeat); its sections are then four bars of three from the downbeat.
/** Longest stretch analysed (s); the file itself is kept whole. */
export const ANALYSE_MAX_SEC = 240;
/** Line confidence needed to measure pitch against it. */
export const LINE_CONFIDENT = 0.5;

export interface LineNote {
  midi: number;
  start: number;
  dur: number;
}
export interface SongLine {
  notes: LineNote[];
  /** 0..1: the share of the sounding time the line's notes cover. */
  confidence: number;
}
export interface Section {
  start: number;
  end: number;
}
export interface SongAnalysis {
  v: number;
  duration: number;
  analysedSec: number;
  beats: BeatGrid | null;
  melody: MyMelody | null;
  melodyConf: number;
  bass: SongLine | null;
  sections: Section[];
}

/** Mono mix of decoded channels. */
export function mixDown(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const n = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(n);
  for (const c of channels) for (let i = 0; i < n; i++) out[i] += c[i] / channels.length;
  return out;
}

/** The share of the sounding frames (rms over a floor) covered by notes. */
export function coverage(frames: SungFrame[], notes: { start: number; dur: number }[], floor = 0.02): number {
  let loud = 0;
  let covered = 0;
  let k = 0;
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  for (const f of frames) {
    if (f.rms < floor) continue;
    loud++;
    while (k < sorted.length && sorted[k].start + sorted[k].dur < f.t) k++;
    if (k < sorted.length && sorted[k].start <= f.t + 0.02) covered++;
  }
  return loud ? Math.round((covered / loud) * 100) / 100 : 0;
}

/** Pitch frames of the low register (38–300 Hz) on a low-passed, decimated copy: the bass line. */
export async function bassFrames(samples: Float32Array, sampleRate: number, o: { maxSec?: number; onProgress?: (p: number) => void } = {}): Promise<SungFrame[]> {
  const maxSec = o.maxSec ?? ANALYSE_MAX_SEC;
  const x0 = samples.subarray(0, Math.min(samples.length, Math.floor(maxSec * sampleRate)));
  // Two one-pole low-passes at ~250 Hz, then decimate to ~5.5 kHz.
  const a = Math.exp((-2 * Math.PI * 250) / sampleRate);
  const lp = new Float32Array(x0.length);
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x0.length; i++) {
    y1 = (1 - a) * x0[i] + a * y1;
    y2 = (1 - a) * y1 + a * y2;
    lp[i] = y2;
  }
  const factor = Math.max(1, Math.round(sampleRate / 5512));
  const x = downsample(lp, factor);
  const sr = sampleRate / factor;
  let peak = 0;
  for (let i = 0; i < x.length; i += 2) peak = Math.max(peak, Math.abs(x[i]));
  const gain = peak > 0 ? 0.9 / peak : 1;
  const win = Math.round(sr * 0.09);
  const hop = Math.round(sr * 0.02);
  const buf = new Float32Array(win);
  const out: SungFrame[] = [];
  for (let s = 0, k = 0; s + win <= x.length; s += hop, k++) {
    for (let i = 0; i < win; i++) buf[i] = x[s + i] * gain;
    const p = yin(buf, sr, { minHz: 38, maxHz: 300, minRms: 0.03, downsample: 1 });
    out.push({ t: (s + win / 2) / sr, hz: p.hz, confidence: p.confidence, rms: p.rms });
    if (k % 300 === 299) {
      o.onProgress?.(s / x.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  o.onProgress?.(1);
  return out;
}

/** Bass notes from low frames (segmented an octave up, where the note splitter works, then moved back). */
export function bassLine(frames: SungFrame[]): SongLine | null {
  const up = frames.map((f) => (f.hz ? { ...f, hz: f.hz * 2 } : f));
  const segs = segmentNotes(up, { minSec: 0.1, minConfidence: 0.75 });
  if (segs.length < 6) return null;
  // A held note broken up by drum hits is one note: the same pitch again within 0.3 s joins the one before (repeated
  // notes merge too — fewer targets, never a wrong one).
  const notes: LineNote[] = [];
  for (const s of segs) {
    const n = { midi: Math.round(s.midi - 12), start: s.start, dur: Math.max(0.1, s.end - s.start) };
    const p = notes[notes.length - 1];
    if (p && p.midi === n.midi && n.start - (p.start + p.dur) < 0.3) p.dur = n.start + n.dur - p.start;
    else notes.push(n);
  }
  if (notes.length < 4) return null;
  return { notes, confidence: coverage(frames, notes, 0.03) };
}

/** Beats per bar of the recording: 3 when the beat grid heard a clear 3/4, else 4 (assumed). */
export const meterOfSong = (beats: BeatGrid | null | undefined): 3 | 4 => (beats?.meter === 3 ? 3 : 4);

/** Four bars of 3/4 (eight above 150 BPM) from the downbeat; the beats before it join the first section. */
function waltzSections(beats: BeatGrid): Section[] {
  const out: Section[] = [];
  const per = beats.bpm >= 150 ? 24 : 12;
  const b = beats.beats;
  const d = Math.max(0, Math.min(2, beats.downbeat ?? 0));
  for (let i = d; i + 1 < b.length; i += per) out.push({ start: b[i], end: b[Math.min(b.length - 1, i + per)] });
  if (out.length && d > 0) out[0].start = b[0];
  const tail = (b.length - 1 - d) % per;
  if (out.length > 1 && tail !== 0 && tail < per / 2) {
    const last = out.pop()!;
    out[out.length - 1].end = last.end;
  }
  return out;
}

/** Practice sections: four bars of the beat grid (eight above 150 BPM; bars of three in 3/4), else the melody's phrases joined to ≥ 6 s, else 12 s. */
export function sectionsOf(duration: number, beats: BeatGrid | null, melody: MyMelody | null): Section[] {
  const out: Section[] = [];
  if (beats && beats.confidence >= BEAT_CONFIDENT && beats.beats.length >= 8 && beats.meter === 3) {
    const w = waltzSections(beats);
    if (w.length) return w;
  }
  if (beats && beats.confidence >= BEAT_CONFIDENT && beats.beats.length >= 8) {
    const per = beats.bpm >= 150 ? 32 : 16;
    const b = beats.beats;
    for (let i = 0; i + 1 < b.length; i += per) {
      const j = Math.min(b.length - 1, i + per);
      out.push({ start: b[i], end: b[j] });
    }
    // A short last section joins the one before.
    if (out.length > 1 && (b.length - 1) % per !== 0 && (b.length - 1) % per < per / 2) {
      const last = out.pop()!;
      out[out.length - 1].end = last.end;
    }
    return out;
  }
  if (melody && melody.notes.length) {
    let cur: Section | null = null;
    for (let p = 0; p < melody.phrases; p++) {
      const ns = melody.notes.filter((n) => n.phrase === p);
      if (!ns.length) continue;
      const s = Math.max(0, ns[0].start - 0.3);
      const e = ns[ns.length - 1].start + ns[ns.length - 1].dur + 0.3;
      if (cur && cur.end - cur.start < 6) cur.end = e;
      else {
        if (cur) out.push(cur);
        cur = { start: s, end: e };
      }
    }
    if (cur) out.push(cur);
    if (out.length) return out;
  }
  for (let s = 0; s < duration - 1; s += 12) out.push({ start: s, end: Math.min(duration, s + 12) });
  return out;
}

/** The whole analysis of a recording (mono samples). */
export async function analyseRecording(samples: Float32Array, sampleRate: number, o: { onProgress?: (p: number) => void; maxSec?: number } = {}): Promise<SongAnalysis> {
  const maxSec = o.maxSec ?? ANALYSE_MAX_SEC;
  const duration = samples.length / sampleRate;
  const analysedSec = Math.min(duration, maxSec);
  const prog = (a: number, b: number) => (p: number) => o.onProgress?.(a + (b - a) * p);
  const beats = await beatGrid(samples, sampleRate, { maxSec, onProgress: prog(0, 0.2) });
  const frames = await framesFromSamples(samples, sampleRate, { maxSec, onProgress: prog(0.2, 0.75) });
  const melody = melodyFromFrames(frames);
  const melodyConf = melody ? coverage(frames, melody.notes) : 0;
  const bass = bassLine(await bassFrames(samples, sampleRate, { maxSec, onProgress: prog(0.75, 1) }));
  return { v: ANALYSIS_VERSION, duration, analysedSec, beats, melody, melodyConf, bass, sections: sectionsOf(analysedSec, beats, melody) };
}

// ───────────────────────────── what each course measures ─────────────────────────────

export interface MeasurePlan {
  timing: boolean;
  pitch: 'melody' | 'bass' | null;
  /** Ear / jazz: phrases to transcribe. */
  transcribe: boolean;
  /** Nothing can be measured: listen and loop only (never counted). */
  none: boolean;
  why: T2;
}

export const beatsOk = (a: SongAnalysis) => !!a.beats && a.beats.confidence >= BEAT_CONFIDENT;
export const melodyOk = (a: SongAnalysis) => !!a.melody && a.melodyConf >= LINE_CONFIDENT;
export const bassOk = (a: SongAnalysis) => !!a.bass && a.bass.confidence >= LINE_CONFIDENT;

/** What a course can honestly measure on this recording, and the sentence that says so on screen. */
export function measurePlan(a: SongAnalysis, course: CourseId): MeasurePlan {
  const b = beatsOk(a);
  if (course === 'ear' || course === 'jazz' || course === 'voice') {
    const t = melodyOk(a) || (!!a.melody && a.melody.notes.length >= 6);
    return t
      ? { timing: false, pitch: 'melody', transcribe: true, none: false, why: melodyOk(a) ? { en: 'Phrases of the melody, compared note by note.', he: 'משפטים מהמנגינה, בהשוואה צליל אחר צליל.' } : { en: 'The melody came out only in part: some notes may be missing or wrong.', he: 'המנגינה יצאה רק בחלקה: ייתכן שחסרים צלילים או שיש שגויים.' } }
      : { timing: false, pitch: null, transcribe: false, none: true, why: { en: 'No clear melody in this recording: listen and loop only — not measured.', he: 'אין מנגינה ברורה בהקלטה: רק להאזין ולחזור — בלי מדידה.' } };
  }
  const pitch = course === 'drums' ? null : course === 'bass' ? (bassOk(a) ? 'bass' : null) : melodyOk(a) ? 'melody' : null;
  if (b && pitch)
    return { timing: true, pitch, transcribe: false, none: false, why: pitch === 'bass' ? { en: 'Measured: your timing against the beat, and the notes of the bass line.', he: 'נמדד: התזמון שלכם מול הפעמה, והצלילים של קו הבס.' } : { en: 'Measured: your timing against the beat, and the notes of the melody.', he: 'נמדד: התזמון שלכם מול הפעמה, והצלילים של המנגינה.' } };
  if (b)
    return {
      timing: true,
      pitch: null,
      transcribe: false,
      none: false,
      why: course === 'drums' ? { en: 'Measured: your timing against the beat of the recording.', he: 'נמדד: התזמון שלכם מול הפעמה של ההקלטה.' } : course === 'bass' ? { en: 'Timing only: the bass line could not be taken out reliably, so notes are not checked.', he: 'רק תזמון: קו הבס לא חולץ באמינות, ולכן הצלילים לא נבדקים.' } : { en: 'Timing only: the melody could not be taken out reliably, so notes are not checked.', he: 'רק תזמון: המנגינה לא חולצה באמינות, ולכן הצלילים לא נבדקים.' },
    };
  if (pitch) return { timing: false, pitch, transcribe: false, none: false, why: { en: 'No steady beat found: only the notes are measured, each near its place.', he: 'לא נמצאה פעמה יציבה: נמדדים רק הצלילים, כל אחד קרוב למקומו.' } };
  return { timing: false, pitch: null, transcribe: false, none: true, why: { en: 'No steady beat and no clear line: listen and loop only — not measured.', he: 'אין פעמה יציבה ואין קו ברור: רק להאזין ולחזור — בלי מדידה.' } };
}

// ───────────────────────────── slowing down (pitch kept) ─────────────────────────────

/**
 * Time-stretch without changing pitch (WSOLA): 40 ms Hann frames overlap-added at half a frame, each taken from up to
 * 10 ms around its nominal place where it best continues the previous one. `speed` < 1 slows down.
 */
export function timeStretch(x: Float32Array, sampleRate: number, speed: number): Float32Array {
  if (speed >= 0.999 || x.length < 64) return x;
  const N = Math.max(64, Math.round(sampleRate * 0.04) & ~1);
  const Hs = N / 2;
  const Ha = Hs * speed;
  const tol = Math.round(sampleRate * 0.01);
  const outLen = Math.ceil(x.length / speed);
  const out = new Float32Array(outLen + N);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const at = (i: number) => (i >= 0 && i < x.length ? x[i] : 0);
  let prev = 0;
  for (let k = 0; k * Hs < outLen; k++) {
    const nominal = Math.round(k * Ha);
    let pos = nominal;
    if (k > 0) {
      const nat = prev + Hs;
      let best = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const p = nominal + d;
        if (p < 0 || p + N > x.length) continue;
        let s = 0;
        for (let i = 0; i < Hs; i += 4) s += at(nat + i) * x[p + i];
        if (s > best) {
          best = s;
          pos = p;
        }
      }
    }
    const o = k * Hs;
    for (let i = 0; i < N; i++) out[o + i] += at(pos + i) * win[i];
    prev = pos;
  }
  return out.subarray(0, outLen);
}

// ───────────────────────────── a take ─────────────────────────────

/** Onsets of a take from loudness rises (6 dB over the last 60 ms, above a floor, 90 ms apart) and pitch changes. */
export function takeOnsets(frames: SungFrame[], o: { rise?: number; floorDb?: number } = {}): number[] {
  const rise = o.rise ?? 6;
  const floor = o.floorDb ?? -42;
  const db = frames.map((f) => 20 * Math.log10(f.rms + 1e-6));
  const out: number[] = [];
  let last = -Infinity;
  for (let i = 1; i < frames.length; i++) {
    let mn = Infinity;
    for (let k = Math.max(0, i - 3); k < i; k++) mn = Math.min(mn, db[k]);
    if (db[i] > floor && db[i] - mn >= rise && frames[i].t - last >= 0.09) {
      out.push(frames[i].t);
      last = frames[i].t;
    }
  }
  // Legato: a new pitch with no loudness rise.
  for (const n of segmentNotes(frames, { minSec: 0.08 })) if (!out.some((t) => Math.abs(t - n.start) < 0.07)) out.push(n.start);
  return out.sort((a, b) => a - b);
}

export interface PlayAlongTarget {
  /** The measured stretch (song seconds). */
  start: number;
  end: number;
  /** Playback speed (1 = as recorded). */
  speed: number;
  /** Beats of the song (seconds), or null when timing is not measured. */
  beats: number[] | null;
  /** The line whose notes are checked, or null. */
  notes: LineNote[] | null;
}
export interface PlayAlongGrade {
  score: number;
  timing: number | null;
  pitch: number | null;
  /** Median offset from the grid (ms of real time, + = behind), when timing was measured. */
  offsetMs: number | null;
  onsets: number;
  verdict: 'clean' | 'almost' | 'not';
  /** Not counted: why (too few notes heard). */
  unclear: T2 | null;
  why: T2;
}

const med = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : 0;
};
const pcDist = (a: number, b: number) => Math.abs(((((a - b) % 12) + 18) % 12) - 6);

/**
 * Grade a play-along take. Onsets and notes are in song seconds. Timing: each onset against the nearest beat or
 * eighth (±75 ms of real time, a quarter of an eighth when faster), after removing the take's own constant offset up
 * to ±60 ms (an output delay the app cannot know); an offset beyond that is a real rush or drag. Pitch: each line note
 * is found when a heard note starts within 180 ms of real time of it with the same pitch class (any octave).
 */
export function gradePlayAlong(t: PlayAlongTarget, heard: { onsets: number[]; notes: { midi: number; start: number }[] }): PlayAlongGrade {
  const sp = Math.max(0.25, t.speed);
  const inWin = (x: number) => x >= t.start - 0.12 && x <= t.end + 0.12;
  const onsets = heard.onsets.filter(inWin);
  const notes = heard.notes.filter((n) => inWin(n.start));
  const grid: number[] = [];
  let beatSec = 0.5;
  if (t.beats) {
    const bs = t.beats.filter((b) => b >= t.start - 1 && b <= t.end + 1);
    for (let i = 0; i < bs.length; i++) {
      grid.push(bs[i]);
      if (i + 1 < bs.length) grid.push((bs[i] + bs[i + 1]) / 2);
    }
    if (bs.length > 1) beatSec = (bs[bs.length - 1] - bs[0]) / (bs.length - 1);
  }
  const beatsIn = t.beats ? t.beats.filter((b) => b >= t.start && b <= t.end).length : 0;
  const need = Math.max(3, Math.floor(beatsIn * 0.25));
  const targets = t.notes ? t.notes.filter((n) => n.start >= t.start && n.start <= t.end) : [];
  const base = { score: 0, timing: null, pitch: null, offsetMs: null, onsets: onsets.length, verdict: 'not' as const, why: { en: '', he: '' } };
  if (onsets.length < (t.beats ? need : 3)) return { ...base, unclear: { en: 'Too few notes heard to measure — play the whole section, close to the microphone.', he: 'נשמעו מעט מדי צלילים כדי למדוד — נגנו את כל הקטע, קרוב למיקרופון.' } };
  let timing: number | null = null;
  let offsetMs: number | null = null;
  let shift = 0;
  if (grid.length) {
    const errs = onsets.map((x) => {
      let best = Infinity;
      for (const g of grid) if (Math.abs(x - g) < Math.abs(best)) best = x - g;
      return best;
    });
    const m = med(errs);
    const allowed = 0.06 * sp;
    shift = Math.max(-allowed, Math.min(allowed, m));
    const eighthReal = beatSec / 2 / sp;
    const tol = Math.min(0.075, eighthReal / 4) * sp;
    timing = errs.filter((e) => Math.abs(e - shift) <= tol).length / errs.length;
    offsetMs = Math.round((m / sp) * 1000);
  }
  let pitch: number | null = null;
  if (targets.length >= 2) {
    const used = new Set<number>();
    let found = 0;
    for (const n of targets) {
      const k = notes.findIndex((h, j) => !used.has(j) && Math.abs(h.start - shift - n.start) <= 0.18 * sp && pcDist(h.midi, n.midi) <= 0.5);
      if (k >= 0) {
        used.add(k);
        found++;
      }
    }
    pitch = found / targets.length;
  }
  const score = Math.round((timing !== null && pitch !== null ? 0.4 * timing + 0.6 * pitch : (timing ?? pitch ?? 0)) * 1000) / 1000;
  const verdict = score >= 0.85 ? 'clean' : score >= 0.6 ? 'almost' : 'not';
  const why: T2 =
    offsetMs !== null && Math.abs(offsetMs) > 60
      ? offsetMs > 0
        ? { en: `You sit about ${offsetMs} ms behind the beat.`, he: `אתם בערך ${offsetMs} מ״ש אחרי הפעמה.` }
        : { en: `You sit about ${-offsetMs} ms ahead of the beat.`, he: `אתם בערך ${-offsetMs} מ״ש לפני הפעמה.` }
      : pitch !== null && pitch < 0.7
        ? { en: 'Many notes of the line were not heard or were other notes.', he: 'הרבה צלילים של הקו לא נשמעו או היו צלילים אחרים.' }
        : timing !== null && timing < 0.7
          ? { en: 'Your notes wander off the beat — try a slower speed.', he: 'הצלילים שלכם בורחים מהפעמה — נסו מהירות איטית יותר.' }
          : verdict === 'clean'
            ? { en: 'Locked in with the recording.', he: 'נעולים עם ההקלטה.' }
            : { en: 'Close — once more.', he: 'קרוב — עוד פעם.' };
  return { score, timing, pitch, offsetMs, onsets: onsets.length, verdict, unclear: null, why };
}

// ───────────────────────────── transcribing a phrase (ear / jazz) ─────────────────────────────

export interface MyPhrase {
  i: number;
  start: number;
  end: number;
  notes: LineNote[];
}

/** The melody's phrases, long ones cut into pieces of at most `max` notes (at least 3 each). */
export function transcribePhrases(m: MyMelody | null, max = 8): MyPhrase[] {
  if (!m) return [];
  const out: MyPhrase[] = [];
  for (let p = 0; p < m.phrases; p++) {
    const ns = m.notes.filter((n) => n.phrase === p).map((n) => ({ midi: n.midi, start: n.start, dur: n.dur }));
    const parts = Math.ceil(ns.length / max);
    for (let k = 0; k < parts; k++) {
      const chunk = ns.slice(Math.round((k * ns.length) / parts), Math.round(((k + 1) * ns.length) / parts));
      if (chunk.length < 3) continue;
      const last = chunk[chunk.length - 1];
      out.push({ i: out.length, start: chunk[0].start, end: last.start + last.dur, notes: chunk });
    }
  }
  return out;
}

const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
/** The key (tonic pitch class) of a melody: duration-weighted pitch classes against the major-key profile. */
export function melodyKey(notes: LineNote[]): number {
  const h = Array(12).fill(0);
  for (const n of notes) h[((Math.round(n.midi) % 12) + 12) % 12] += n.dur;
  let best = 0;
  let bestV = -Infinity;
  for (let k = 0; k < 12; k++) {
    let v = 0;
    for (let i = 0; i < 12; i++) v += h[(k + i) % 12] * MAJOR[i];
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  }
  return best;
}

/** A phrase of the recording as a transcription phrase: beats on a quarter-beat grid at the song's tempo. */
export function phraseOfMine(p: MyPhrase, key: number, bpm0: number | null, id: string): Phrase {
  let bpm = bpm0 && bpm0 > 0 ? bpm0 : 60;
  while (bpm > 160) bpm /= 2;
  while (bpm < 50) bpm *= 2;
  bpm = Math.round(bpm);
  const beat = 60 / bpm;
  const q = (s: number) => Math.round((s / beat) * 4) / 4;
  let last = -1;
  const notes = p.notes.map((n) => {
    let b = q(n.start - p.start);
    if (b <= last) b = last + 0.25;
    last = b;
    return { midi: Math.round(n.midi), beat: b, dur: Math.max(0.25, q(n.dur)) };
  });
  const level = Math.max(1, Math.min(8, Math.round(notes.length / 1.5) - 1));
  return { id, level, key: ((key % 12) + 12) % 12, minor: false, notes, chords: null, swing: false, bpm, source: 'own', title: { en: 'My song', he: 'השיר שלי' } };
}

// ───────────────────────────── the session → the rest of the app ─────────────────────────────

export interface TakeLog {
  section: number;
  score: number;
  timing: number | null;
  pitch: number | null;
  verdict: 'clean' | 'almost' | 'not';
  speed: number;
  /** Ear / jazz: a transcribed phrase's stars (0–3) and its rated events. */
  stars?: number;
  events?: RatingEvent[];
}

export const takeXp = (t: Pick<TakeLog, 'verdict' | 'stars'>) => (t.stars !== undefined ? [1, 3, 5, 8][Math.max(0, Math.min(3, t.stars))] : t.verdict === 'clean' ? 4 : t.verdict === 'almost' ? 2 : 1);

/** Difficulty of playing in time with a recording: the tempo heard (speed included). */
export const timingDifficulty = (bpm: number, speed: number) => Math.round(Math.max(800, Math.min(1500, 820 + (bpm * speed - 60) * 4)));

type ResultItem = { id: string; skill: RatingEvent['skill']; difficulty: number; correct: boolean; tag: string; score?: number; tags?: RatingEvent['tags'] };

/**
 * One session's result: XP (capped at 40), takes and clean takes (the streak, daily goal and league see it), and the
 * rated items — per section its best take: timing (skill timing), notes (skill instrument), transcriptions (dictation).
 */
export function sessionResult(course: CourseId, takes: TakeLog[], sessionId: string, bpm: number | null): { xp: number; total: number; firstTry: number; items: ResultItem[]; score: number } {
  const counted = takes.filter((t) => t.score >= 0);
  const xp = Math.min(40, counted.reduce((a, t) => a + takeXp(t), 0));
  const best = new Map<number, TakeLog>();
  for (const t of counted) if (!best.has(t.section) || best.get(t.section)!.score < t.score) best.set(t.section, t);
  const items: ResultItem[] = [];
  for (const [s, t] of best) {
    if (t.events?.length) {
      for (const e of t.events) items.push({ id: e.id, skill: e.skill, difficulty: e.difficulty, correct: e.correct, tag: `mysong:${course}:tx`, score: e.score, ...(e.tags ? { tags: e.tags } : {}) });
      continue;
    }
    if (t.timing !== null) items.push({ id: `${sessionId}:s${s}:time`, skill: 'timing', difficulty: timingDifficulty(bpm ?? 90, t.speed), correct: t.timing >= 0.85, tag: `mysong:${course}:timing`, score: Math.round(t.timing * 1000) / 1000 });
    if (t.pitch !== null) items.push({ id: `${sessionId}:s${s}:notes`, skill: 'instrument', difficulty: Math.round(900 + 200 * t.speed), correct: t.pitch >= 0.85, tag: `mysong:${course}:notes`, score: Math.round(t.pitch * 1000) / 1000 });
  }
  const score = best.size ? [...best.values()].reduce((a, t) => a + t.score, 0) / best.size : 0;
  return { xp, total: counted.length, firstTry: counted.filter((t) => t.verdict === 'clean').length, items, score: Math.round(score * 1000) / 1000 };
}

/**
 * A transcribed phrase's log entry (comparePhrase result → stars and the dictation event). With `written` (the
 * degrees step, transcribe.ts gradeDegrees) the stars are the coach's (3 = played back clean and written right) and the
 * score weighs the writing like the coach: 0.6 playback + 0.4 written.
 */
export function phraseTake(section: number, phrase: Phrase, r: PhraseResult, speed: number, at: string, sessionId: string, written?: { ok: number; total: number }): TakeLog {
  const w = written && written.total > 0 ? written.ok / written.total : null;
  const stars = written ? phraseStars(r, written) : r.verdict === 'clean' ? 3 : r.score >= 0.85 ? 2 : r.score >= 0.7 ? 1 : 0;
  const slow = speed < 1 ? 0.85 : 1;
  const score = Math.round(Math.max(0, Math.min(1, (w === null ? r.score : 0.6 * r.score + 0.4 * w) * slow)) * 1000) / 1000;
  return {
    section,
    score,
    timing: r.rhythmAcc,
    pitch: r.pitchAcc,
    verdict: r.verdict,
    speed,
    stars,
    events: [{ id: `g:mysong:${sessionId}:${section}`, skill: 'dictation', difficulty: phraseDifficulty(phrase), correct: score >= 0.85, score, tags: [{ skill: 'dictation', sub: 'dictation/transcribe', w: 0.6 }, { skill: 'sequences', sub: 'sequences/melody', w: 0.4 }], at }],
  };
}

// ───────────────────────────── a demo recording (simulator, tests) ─────────────────────────────

/** A short synthetic song: a kick on every beat, eighth hats, a sine melody (one note a beat) and a quiet bass. */
export function demoSong(sampleRate = 22050, bpm = 100, bars = 8): Float32Array {
  const beat = 60 / bpm;
  const x = new Float32Array(Math.round((bars * 4 * beat + 1) * sampleRate));
  const tune = [72, 74, 76, 77, 79, 77, 76, -1, 76, 77, 79, 81, 79, 77, 76, -1];
  const roots = [48, 53, 55, 48];
  let seed = 5;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const add = (t: number, len: number, f: (i: number) => number) => {
    const s = Math.round(t * sampleRate);
    for (let i = 0; i < len && s + i < x.length; i++) x[s + i] += f(i);
  };
  const sine = (midi: number) => (2 * Math.PI * 440 * 2 ** ((midi - 69) / 12)) / sampleRate;
  for (let k = 0; k < bars * 4; k++) {
    const t = 0.5 + k * beat;
    add(t, Math.round(0.15 * sampleRate), (i) => 0.5 * Math.exp(-i / (0.03 * sampleRate)) * Math.sin(2 * Math.PI * (50 + 70 * Math.exp(-i / 300)) * (i / sampleRate)));
    for (const h of [0, beat / 2]) add(t + h, Math.round(0.03 * sampleRate), (i) => 0.08 * Math.exp(-i / (0.006 * sampleRate)) * rnd());
    const m = tune[k % tune.length];
    const w = sine(m);
    if (m > 0) add(t + 0.01, Math.round(beat * 0.8 * sampleRate), (i) => 0.3 * Math.min(1, i / 80) * Math.min(1, (beat * 0.8 * sampleRate - i) / 200) * Math.sin(w * i));
    if (k % 4 === 0) {
      const wb = sine(roots[(k / 4) % roots.length] - 12);
      add(t, Math.round(beat * 3.8 * sampleRate), (i) => 0.12 * Math.min(1, i / 80) * Math.exp(-i / (2 * sampleRate)) * Math.sin(wb * i));
    }
  }
  return x;
}
