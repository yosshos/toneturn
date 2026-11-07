// Tuner (spec AE §7): note / cents maths, presets and string choice. Pure.

export interface TunerPreset {
  id: string;
  name: { en: string; he: string };
  /** Open strings, lowest first (sounding MIDI). Empty = chromatic. */
  strings: number[];
}

export const TUNER_PRESETS: TunerPreset[] = [
  { id: 'chromatic', name: { en: 'Chromatic', he: 'כרומטי' }, strings: [] },
  { id: 'guitar', name: { en: 'Guitar · standard', he: 'גיטרה · סטנדרטי' }, strings: [40, 45, 50, 55, 59, 64] },
  { id: 'drop-d', name: { en: 'Guitar · drop D', he: 'גיטרה · Drop D' }, strings: [38, 45, 50, 55, 59, 64] },
  { id: 'dadgad', name: { en: 'Guitar · DADGAD', he: 'גיטרה · DADGAD' }, strings: [38, 45, 50, 55, 57, 62] },
  { id: 'open-g', name: { en: 'Guitar · open G', he: 'גיטרה · Open G' }, strings: [38, 43, 50, 55, 59, 62] },
  { id: 'half-down', name: { en: 'Guitar · ½ step down', he: 'גיטרה · חצי טון למטה' }, strings: [39, 44, 49, 54, 58, 63] },
  { id: 'bass', name: { en: 'Bass · EADG', he: 'בס · EADG' }, strings: [28, 33, 38, 43] },
  { id: 'ukulele', name: { en: 'Ukulele · GCEA', he: 'יוקלילי · GCEA' }, strings: [67, 60, 64, 69] },
  { id: 'violin', name: { en: 'Violin · GDAE', he: 'כינור · GDAE' }, strings: [55, 62, 69, 76] },
];

export const presetById = (id: string | undefined) => TUNER_PRESETS.find((p) => p.id === id) ?? TUNER_PRESETS[0];

/** Fractional MIDI of a frequency at a given A4. */
export const hzToMidiA = (hz: number, a4 = 440) => 69 + 12 * Math.log2(hz / a4);
export const midiToHzA = (m: number, a4 = 440) => a4 * 2 ** ((m - 69) / 12);

/** The target and the deviation in cents: nearest semitone (chromatic) or nearest string of the preset. */
export function tunerReading(hz: number, a4: number, preset: TunerPreset, lockedString?: number | null): { target: number; cents: number; string: number | null } {
  const m = hzToMidiA(hz, a4);
  if (!preset.strings.length) {
    const target = Math.round(m);
    return { target, cents: Math.round((m - target) * 100), string: null };
  }
  let idx = lockedString ?? 0;
  if (lockedString === null || lockedString === undefined) {
    let best = Infinity;
    preset.strings.forEach((s, i) => {
      const d = Math.abs(m - s);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
  }
  const target = preset.strings[idx];
  return { target, cents: Math.max(-999, Math.min(999, Math.round((m - target) * 100))), string: idx };
}

/** Smooth a stream of readings: median of the last k (YIN jitter), and a lock after `stableMs` within ±3 ¢. */
export class TunerSmoother {
  private xs: { m: number; t: number }[] = [];
  constructor(
    private k = 5,
    private stableMs = 300,
  ) {}
  push(m: number, t: number): { m: number; stable: boolean } {
    this.xs.push({ m, t });
    if (this.xs.length > 30) this.xs.shift();
    const last = this.xs.slice(-this.k).map((x) => x.m).sort((a, b) => a - b);
    const med = last[Math.floor(last.length / 2)];
    const recent = this.xs.filter((x) => t - x.t <= this.stableMs);
    const stable = recent.length >= 3 && recent.every((x) => Math.abs(x.m - med) * 100 <= 3) && t - recent[0].t >= this.stableMs * 0.8;
    return { m: med, stable };
  }
  reset() {
    this.xs = [];
  }
}

/** In tune: within ±5 cents. */
export const inTune = (cents: number) => Math.abs(cents) <= 5;
