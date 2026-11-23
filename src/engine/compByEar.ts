// Comping by ear (docs/SPEC-EAR-AND-READING.md §3.3, "a standard that is chords only"): the band plays the progression
// once with the lead sheet hidden, then the player comps the next chorus. The spec does not define a grade, so this is
// only a simple, conservative "chords on time" rate (verification pass 2026-11-23): of the chart's chords, the share
// on which the player struck a voicing of that chord on time. Pure.

/** A chart chord (ruleCards.spansOfChart): root pitch class, its intervals, start beat and length. */
export interface CompSpan {
  root: number;
  iv: number[];
  at: number;
  beats: number;
}

const mod = (n: number) => ((n % 12) + 12) % 12;
/** Notes struck within this many beats of each other are one chord. */
const TOGETHER = 0.15;
/** A chord is on time when its onset is within this many beats of an eighth note. */
const ON_GRID = 0.15;
/** A chord may be pushed (anticipated) by an eighth before the change. */
const PUSH = 0.5;

/** The voicings of a take: notes grouped by onset (beats from the chorus's first beat). */
export function compChords(notes: { beat: number; midi: number }[]): { beat: number; pcs: number[] }[] {
  const s = [...notes].sort((a, b) => a.beat - b.beat);
  const out: { beat: number; pcs: number[] }[] = [];
  for (const n of s) {
    const last = out[out.length - 1];
    if (last && n.beat - last.beat <= TOGETHER) {
      if (!last.pcs.includes(mod(n.midi))) last.pcs.push(mod(n.midi));
    } else out.push({ beat: n.beat, pcs: [mod(n.midi)] });
  }
  return out;
}

/**
 * The notes a voicing of the chord may hold besides its own tones (above the root): the usual tensions of its family —
 * a dominant any tension but the major 7th and the 4th; a major chord the 9th, ♯11 and 13th; a minor chord the 9th,
 * 11th and 13th; a half-diminished / diminished chord the 9th, 11th and ♭13th.
 */
function tensions(iv: number[]): number[] {
  const has = (x: number) => iv.some((i) => mod(i) === x);
  if (has(4) && has(10)) return [1, 2, 3, 6, 8, 9];
  if (has(4)) return [2, 6, 9];
  if (has(3) && has(6)) return [2, 5, 8];
  if (has(3)) return [2, 5, 9];
  return [2];
}

/**
 * Is this voicing the chord? At least two different chord tones (the chart's own intervals, extensions included), one
 * of them the 3rd or the 7th (the 6th on a 6 chord), and every other note a usual tension of the chord.
 */
export function isVoicingOf(pcs: number[], span: CompSpan): boolean {
  const ct = new Set(span.iv.map((x) => mod(span.root + x)));
  if (pcs.filter((p) => ct.has(p)).length < 2) return false;
  const guide = span.iv.map(mod).filter((x) => x === 3 || x === 4 || x === 10 || x === 11 || (x === 9 && !span.iv.some((y) => mod(y) === 10 || mod(y) === 11)));
  if (!guide.some((x) => pcs.includes(mod(span.root + x)))) return false;
  const ok = new Set([...ct, ...tensions(span.iv).map((x) => mod(span.root + x))]);
  return pcs.every((p) => ok.has(p));
}

/**
 * "Chords on time": of the chart's chords, the share on which a voicing of that chord was struck on time — its onset
 * on an eighth note, from an eighth before the change (a push) to the end of the chord's first bar.
 */
export function compOnTime(notes: { beat: number; midi: number }[], spans: CompSpan[], meter = 4): { ok: number; total: number; rate: number; hits: boolean[] } {
  const chords = compChords(notes).filter((c) => Math.abs(c.beat * 2 - Math.round(c.beat * 2)) / 2 <= ON_GRID);
  const hits = spans.map((sp) => chords.some((c) => c.beat >= sp.at - PUSH - 1e-6 && c.beat < sp.at + Math.min(sp.beats, meter) - 1e-6 && isVoicingOf(c.pcs, sp)));
  const ok = hits.filter(Boolean).length;
  return { ok, total: spans.length, rate: spans.length ? ok / spans.length : 0, hits };
}
