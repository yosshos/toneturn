// Precise singing feedback (spec W): how and where a sung note was off — "a bit flat", "you went sharp at
// the end", "you slid up into the note", "a bit unsteady". Pure and self-contained (no imports from the
// lesson engine), so any grader can use it.

export interface Frame {
  t: number;
  hz: number | null;
  confidence: number;
}

export type Remark =
  | 'spot'
  | 'touch-flat'
  | 'touch-sharp'
  | 'bit-flat'
  | 'bit-sharp'
  | 'quite-flat'
  | 'quite-sharp'
  | 'end-flat'
  | 'end-sharp'
  | 'scoop-up'
  | 'scoop-down'
  | 'unsteady';

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Signed cents of confident frames against a target (octave-folded), with times. */
function cents(frames: Frame[], targetMidi: number): { t: number; c: number }[] {
  const th = 440 * Math.pow(2, (targetMidi - 69) / 12);
  return frames
    .filter((f) => f.hz && f.confidence >= 0.8)
    .map((f) => {
      const c = 1200 * Math.log2(f.hz! / th);
      return { t: f.t, c: ((((c + 600) % 1200) + 1200) % 1200) - 600 };
    });
}

/** Offset category: spot on < 10 ¢ · a touch 10–25 · a bit 25–50 · quite > 50. */
export function offsetRemark(c: number): Remark {
  const a = Math.abs(c);
  if (a < 10) return 'spot';
  const side = c < 0 ? 'flat' : 'sharp';
  return `${a < 25 ? 'touch' : a < 50 ? 'bit' : 'quite'}-${side}` as Remark;
}

/** Remarks for one sung note, most important first (at most two). Empty when there is too little voice. */
export function remarksFor(frames: Frame[], targetMidi: number): Remark[] {
  const pts = cents(frames, targetMidi);
  if (pts.length < 10) return [];
  const t0 = pts[0].t;
  const settled = pts.filter((p) => p.t - t0 >= 0.12);
  const body = settled.length >= 6 ? settled : pts;
  const offset = mean(body.map((p) => p.c));
  const head = mean(pts.filter((p) => p.t - t0 < 0.07).map((p) => p.c));
  const third = Math.max(2, Math.floor(body.length / 3));
  const endDrift = mean(body.slice(-third).map((p) => p.c)) - mean(body.slice(0, third).map((p) => p.c));
  // Wobble: spread around a 0.4 s moving average.
  const res = body.map((p) => {
    const w = body.filter((q) => Math.abs(q.t - p.t) <= 0.2).map((q) => q.c);
    return p.c - mean(w);
  });
  const wobble = Math.sqrt(mean(res.map((r) => r * r)));
  const out: { r: Remark; w: number }[] = [];
  const off = offsetRemark(offset);
  if (off !== 'spot') out.push({ r: off, w: Math.abs(offset) });
  if (Math.abs(endDrift) >= 15) out.push({ r: endDrift < 0 ? 'end-flat' : 'end-sharp', w: Math.abs(endDrift) * 0.9 });
  if (Math.abs(head - offset) >= 40) out.push({ r: head < offset ? 'scoop-up' : 'scoop-down', w: Math.abs(head - offset) * 0.5 });
  if (wobble >= 20) out.push({ r: 'unsteady', w: wobble * 0.8 });
  if (!out.length) return ['spot'];
  return out
    .sort((a, b) => b.w - a.w)
    .slice(0, 2)
    .map((x) => x.r);
}

/** Per-note remarks of a sung melody: the notes with something to say, worst first (at most two). */
export function melodyRemarks(notes: { index: number; frames: Frame[]; target: number }[]): { index: number; remarks: Remark[] }[] {
  return notes
    .map((n) => ({ index: n.index, remarks: remarksFor(n.frames, n.target) }))
    .filter((n) => n.remarks.length && n.remarks[0] !== 'spot' && !n.remarks[0].startsWith('touch'))
    .slice(0, 2);
}
