// Embellish a melody (docs/AUDIT-DEPTH-3.md C2): the head's melody notes stay on their beats and pitches; the time
// before a target, or the open beats of a long note, gets a standard bebop device. Pure.
//
//   approach  every melody note on a bar's downbeat is approached chromatically from below (an 8th before it, taken
//             from the note before, or from a rest);
//   enclose   every downbeat target is enclosed: the scale step above, then the half step below (two 8ths before it);
//   pivot     a long melody note (2 beats or more) keeps its first beat(s), then its last beats outline the bar's
//             chord as a pivot arpeggio: the root on top, then the 3rd, 5th and 7th below it, climbing
//             (docs/BARRY-HARRIS-THEORY.md §7, owner-confirmed: "Cmaj7 as C on top, then E G B below, climbing");
//   free      any mix: the written model mixes the three, and the take is graded on the targets only — the spans before
//             them (and the open beats of long notes) are free windows.
// Targets are the melody notes on a bar's downbeat with room before them; a note with no room is left as written.

import type { ChartChordEv } from './charts';
import { chordAt, chordKind, type HNote } from './heads';

const pc = (n: number): number => ((n % 12) + 12) % 12;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

export type EmbKind = 'approach' | 'enclose' | 'pivot' | 'free';
export interface EmbNote {
  pitch: number;
  beat: number;
  dur: number;
  /** melody: a note of the head (a target when it sits on a downbeat); the others the embellishment. */
  role: 'melody' | 'approach' | 'enclose' | 'pivot';
  target?: boolean;
}
export interface Embellished {
  notes: EmbNote[];
  /** Spans (beats) the embellishment fills: the free windows of the free kind. */
  spans: [number, number][];
}

/** The four tones of a chart chord above its root (root, 3rd, 5th, 7th / 6th). */
export function fourTones(c: Pick<ChartChordEv, 'iv'>): number[] {
  const has = (x: number) => c.iv.some((i) => pc(i) === x);
  const k = chordKind(c.iv);
  if (k === 'dim') return [0, 3, 6, 9];
  if (k === 'half') return [0, 3, 6, 10];
  const third = k === 'min' || k === 'mmaj' ? 3 : 4;
  const fifth = has(8) && !has(7) ? 8 : 7;
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : third === 3 ? 10 : 9;
  return [0, third, fifth, seventh];
}

/** The pivot arpeggio of a chord near a pitch: the root on top (the root nearest `near`), then 3rd, 5th, 7th below it, climbing. */
export function pivotOf(c: Pick<ChartChordEv, 'root' | 'iv'>, near: number): number[] {
  // the root nearest the held note (within a tritone), kept on a guitar's top string (E6 at most)
  let top = near + pc(c.root - near);
  if (top - near > 6) top -= 12;
  if (top > 84) top -= 12;
  const [, t3, t5, t7] = fourTones(c);
  return [top, top - 12 + t3, top - 12 + t5, top - 12 + t7];
}

const onDownbeat = (n: HNote): boolean => Math.abs(n.beat / 4 - Math.round(n.beat / 4)) < 1e-6;

/**
 * Embellish the melody notes of bars [b0, b1) (beats absolute; `scale`: the key's pitch classes, for the step above an
 * enclosed target). `mixFor(i)` picks the device of target i in the free kind (approach, enclose, approach, … and a
 * pivot on each long note).
 */
export function embellish(notes: HNote[], chords: ChartChordEv[], kind: EmbKind, scale: number[]): Embellished {
  const out: EmbNote[] = notes.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, role: 'melody' as const }));
  const spans: [number, number][] = [];
  const add: EmbNote[] = [];
  let ti = 0;
  out.forEach((n, i) => {
    if (!onDownbeat(n) || i === 0) return;
    const prev = out[i - 1];
    const gap = n.beat - (prev.beat + prev.dur);
    // room before the target: the note before can give up time (keeping half a beat) or a rest sits there
    const room = gap > 1e-6 ? gap + Math.max(0, prev.dur - 0.5) : Math.max(0, prev.dur - 0.5);
    const device = kind === 'free' ? (ti % 2 === 0 ? 'approach' : 'enclose') : kind;
    if (device !== 'approach' && device !== 'enclose') return;
    const need = device === 'approach' ? 0.5 : 1;
    if (room < need - 1e-6) return;
    ti++;
    n.target = true;
    const start = r6(n.beat - need);
    if (prev.beat + prev.dur > start + 1e-6) prev.dur = r6(start - prev.beat);
    if (device === 'approach') add.push({ pitch: n.pitch - 1, beat: start, dur: 0.5, role: 'approach' });
    else {
      const up = scale.includes(pc(n.pitch + 1)) ? n.pitch + 1 : n.pitch + 2;
      add.push({ pitch: up, beat: start, dur: 0.5, role: 'enclose' }, { pitch: n.pitch - 1, beat: r6(start + 0.5), dur: 0.5, role: 'enclose' });
    }
    spans.push([start, n.beat]);
  });
  if (kind === 'pivot' || kind === 'free') {
    for (const n of out) {
      if (n.dur < 2 - 1e-6 || n.role !== 'melody') continue;
      const c = chordAt(chords, n.beat);
      // 3 beats or more: the note keeps all but two beats, four 8ths of pivot follow; 2 to 3 beats: the note keeps
      // half a beat, then as much of the pivot as fits in 8ths (three: the root on top, the 3rd and 5th below)
      const keep = n.dur >= 3 - 1e-6 ? r6(n.dur - 2) : 0.5;
      const at = r6(n.beat + keep);
      const count = Math.min(4, Math.floor((n.dur - keep) / 0.5 + 1e-6));
      // the pivot's top lands near the held note (a chord tone below it when the note is not the root)
      const piv = pivotOf(c, n.pitch).slice(0, count);
      n.dur = keep;
      n.target = true;
      piv.forEach((p, k) => add.push({ pitch: p, beat: r6(at + k * 0.5), dur: 0.5, role: 'pivot' }));
      spans.push([at, r6(at + count * 0.5)]);
    }
  }
  const notesOut = [...out, ...add].sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return { notes: notesOut, spans: spans.sort((a, b) => a[0] - b[0]) };
}

/** The key's scale (pitch classes): major, or natural + harmonic minor (the raised 7th) on a minor tonic. */
export const keyScale = (tonic: number, minor = false): number[] => (minor ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11]).map((x) => pc(tonic + x));
