// Percussion-staff engraving rules (DRUMS_AUDIT D-R1), pure so they can be tested: beams inside a beat (a primary
// beam over the 8ths-and-shorter, a second beam only between 16ths, a stub for a lone 16th as in dotted-8th + 16th),
// flags for a lone short note, tuplet numbers (3 over 8th or 16th triplets, 6 over sextuplets), dots (dotted 8th,
// dotted quarter) and rests for a one-voice line on the 16th grid (quarter, 8th, 16th rests where nothing sounds).

const EPS = 1e-4;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;
const onGrid = (x: number, step: number) => near(x / step, Math.round(x / step));

/** One stem (an onset of one voice group) as the engraver sees it. */
export interface StemIn {
  beat: number;
  dur: number;
}

export interface BeatBeams {
  /** Indices (into the input) of the beamed / flagged notes of this beat, in time order. */
  idx: number[];
  /** A lone short note: its flag count (1 = 8th, 2 = 16th). */
  flag?: 1 | 2;
  /** Second-beam segments between members (positions in idx). */
  second: [number, number][];
  /** Second-beam stubs: member position and direction. */
  stubs: { at: number; dir: 1 | -1 }[];
  /** Tuplet number over members from..to (positions in idx). */
  tuplet?: { n: 3 | 6; from: number; to: number };
}

const is16 = (d: number) => d <= 0.26;

/** The beams of each beat (stems of one direction). Quarter-or-longer notes are never beamed. */
export function beamBeats(stems: StemIn[]): BeatBeams[] {
  const byBeat = new Map<number, number[]>();
  stems.forEach((s, i) => {
    if (s.dur >= 0.99) return;
    const bt = Math.floor(s.beat + EPS);
    byBeat.set(bt, [...(byBeat.get(bt) ?? []), i]);
  });
  const out: BeatBeams[] = [];
  for (const [bt, idx0] of [...byBeat].sort((a, b) => a[0] - b[0])) {
    const idx = [...idx0].sort((a, b) => stems[a].beat - stems[b].beat);
    const offs = idx.map((i) => stems[i].beat - bt);
    // Tuplets: offsets off the 16th grid. Sixths on both halves → 6; only one half → 3 over that half; thirds → 3.
    let tuplet: BeatBeams['tuplet'];
    const odd = offs.map((o) => onGrid(o, 1 / 6) && !onGrid(o, 1 / 3) && !onGrid(o, 0.25));
    const third = offs.map((o) => !onGrid(o, 0.25) && onGrid(o, 1 / 3));
    if (odd.some(Boolean)) {
      const lo = offs.some((o, k) => odd[k] && o < 0.5);
      const hi = offs.some((o, k) => odd[k] && o > 0.5);
      const pos = offs.map((_, k) => k).filter((k) => (lo && hi) || (lo ? offs[k] < 0.5 - EPS : offs[k] >= 0.5 - EPS));
      if (pos.length) tuplet = { n: lo && hi ? 6 : 3, from: pos[0], to: pos[pos.length - 1] };
    } else if (third.some(Boolean)) tuplet = { n: 3, from: 0, to: idx.length - 1 };
    if (idx.length === 1) {
      out.push({ idx, flag: is16(stems[idx[0]].dur) ? 2 : 1, second: [], stubs: [], ...(tuplet ? { tuplet } : {}) });
      continue;
    }
    const sh = idx.map((i) => is16(stems[i].dur));
    const second: [number, number][] = [];
    const stubs: { at: number; dir: 1 | -1 }[] = [];
    for (let k = 0; k < idx.length; k++) {
      if (!sh[k]) continue;
      if (k + 1 < idx.length && sh[k + 1]) second.push([k, k + 1]);
      if (!(k > 0 && sh[k - 1]) && !(k + 1 < idx.length && sh[k + 1])) stubs.push({ at: k, dir: k === 0 ? 1 : -1 });
    }
    out.push({ idx, second, stubs, ...(tuplet ? { tuplet } : {}) });
  }
  return out;
}

/** A dot after the head: dotted 8th, dotted quarter, dotted half. */
export const dotted = (dur: number): boolean => near(dur, 0.75) || near(dur, 1.5) || near(dur, 3);

export type RestKind = 'q' | '8' | '16';
/**
 * Rests of a one-voice line over beats [from, to): what no note covers (onset to onset + written length), on the 16th
 * grid — a whole empty beat is a quarter rest; inside a beat an 8th rest on the beat or its "&", else a 16th. Beats
 * holding tuplets get a rest only when empty.
 */
export function restsOf(notes: StemIn[], from: number, to: number): { beat: number; kind: RestKind }[] {
  const out: { beat: number; kind: RestKind }[] = [];
  const covered = (x: number) => notes.some((n) => n.beat <= x + EPS && n.beat + n.dur > x + EPS);
  for (let bt = from; bt < to - EPS; bt++) {
    const inBeat = notes.filter((n) => n.beat >= bt - EPS && n.beat < bt + 1 - EPS);
    const free = [0, 0.25, 0.5, 0.75].map((o) => !covered(bt + o));
    if (free.every(Boolean)) {
      out.push({ beat: bt, kind: 'q' });
      continue;
    }
    if (inBeat.some((n) => !onGrid(n.beat - bt, 0.25))) continue;
    for (let k = 0; k < 4; ) {
      if (!free[k]) {
        k++;
        continue;
      }
      if (k % 2 === 0 && free[k + 1]) {
        out.push({ beat: bt + k / 4, kind: '8' });
        k += 2;
      } else {
        out.push({ beat: bt + k / 4, kind: '16' });
        k++;
      }
    }
  }
  return out;
}
