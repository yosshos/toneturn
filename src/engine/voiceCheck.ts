// The voice check's state (src/ui/VoiceCheck.tsx): level, note, "got it", the silence hint. Pure, tested.

import { DisplaySmoother, NoteNamer } from './pitchDisplay';
import type { SungFrame } from './sing';

/** Loudness → 0..1 (−50 dBFS … −10 dBFS). */
export const levelOf = (rms: number) => Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-5, rms)) + 50) / 40));

/** The voice-check state machine (pure, tested): feed frames, read the row. */
export class VoiceCheckState {
  level = 0;
  note: number | null = null;
  got = false;
  private voicedSince: number | null = null;
  private lastSound = 0;
  private start: number | null = null;
  private sm = new DisplaySmoother();
  private namer = new NoteNamer();
  push(f: SungFrame) {
    if (this.start === null) this.start = f.t;
    // peak-hold with a fall, so the bars read calmly
    this.level = Math.max(levelOf(f.rms), this.level - 0.06);
    const p = this.sm.push(f);
    this.note = this.namer.push(p.t, p.m);
    const voiced = !!f.hz && f.confidence >= 0.8;
    if (voiced || levelOf(f.rms) > 0.25) this.lastSound = f.t;
    if (voiced) {
      if (this.voicedSince === null) this.voicedSince = f.t;
      if (f.t - this.voicedSince >= 0.3) this.got = true;
    } else this.voicedSince = null;
  }
  /** Silent for ≥ 4 s since the check began (or since the last sound) and never heard: show the hint. */
  hint(now: number): boolean {
    if (this.got || this.start === null) return false;
    return now - Math.max(this.start, this.lastSound) >= 4;
  }
}

