// d-prog level 11 (docs/AUDIT-CONTENT-THEORY.md §ז.2 R-1, R-5; §ד.3 — the kit had 3:2, 4:3 and 5:4 per beat, but 7:4
// lived only in a game): cross-rhythms over the whole bar and the hemiola, played between the limbs on the e-kit.
//   0 5:4  ride: 5 even strokes a 4/4 bar, kick on the beat       2 5:3  ride: 5 a 3/4 bar, kick on the beat
//   1 7:4  ride: 7 even strokes a 4/4 bar, kick on the beat       3 hemiola: 3/4, kick on the beat, the snare in
//                                                                    big twos across each pair of bars
// The limb ratio is measured (DrumGoal.poly) like level 5; the hemiola checks its landings. Pure and deterministic.

import type { Drill, DrillSpec, DrumVoice } from './types';
import { finish, type DH } from './drums';
import { withBarPlan } from './timeline';

const t = (en: string, he: string) => ({ en, he });

/** The cross-rhythm options over the bar: n even strokes against `over` beats. */
export const DRUM_CROSS = [
  { n: 5, over: 4 },
  { n: 7, over: 4 },
  { n: 5, over: 3 },
] as const;

/** n even strokes per bar of `over` beats, for `bars` bars (beats from 0). */
export const crossOnsets = (n: number, over: number, bars: number): number[] => Array.from({ length: n * bars }, (_, i) => Math.floor(i / n) * over + ((i % n) * over) / n);

export function genDrumCross(s: DrillSpec): Drill {
  const op = (s.option ?? 0) % 4;
  if (op < 3) {
    const C = DRUM_CROSS[op];
    const bars = 4;
    const hits: DH[] = [
      ...crossOnsets(C.n, C.over, bars).map((b, i): DH => ({ b, v: 'ride', h: 'R', d: C.over / C.n, ...(i % C.n === 0 ? { acc: true } : {}) })),
      ...Array.from({ length: C.over * bars }, (_, i): DH => ({ b: i, v: 'kick', h: 'R', d: 1 })),
    ];
    const d = finish(s, hits, { title: t(`Over the bar · ${C.n}:${C.over} — ride ${C.n} a bar, kick on the beat`, `על פני התיבה · ${C.n}:${C.over} — ${C.n} ברייד בתיבה, קיק על הפעמה`), bpm: 50, bars, meter: C.over, mic: false, goal: { poly: { a: ['ride'], b: ['kick'], tol: 0.05 } } });
    return C.over === 3 ? withBarPlan(d, [['3/4', bars]]) : d;
  }
  // The hemiola: 8 bars of 3/4 — kick on every beat, hi-hat 8ths, the snare on 1, 3 and 2 of each bar pair.
  const hits: DH[] = [];
  for (let b = 0; b < 24; b++) hits.push({ b, v: 'kick', h: 'R', d: 1 });
  for (let e = 0; e < 48; e++) hits.push({ b: e / 2, v: 'hihat', h: 'R', d: 0.5 });
  const big: number[] = [];
  for (let pair = 0; pair < 4; pair++) for (let k = 0; k < 3; k++) big.push(pair * 6 + k * 2);
  for (const b of big) hits.push({ b, v: 'snare' as DrumVoice, h: 'L', d: 2, acc: true });
  const d = finish(s, hits, { title: t('Hemiola · 3/4 in big twos: snare across the bar line', 'המיולה · 3/4 בשתיים גדולות: סנר מעבר לקו התיבה'), bpm: 90, bars: 8, meter: 3, mic: false, goal: { landing: { beats: [6, 12, 18], ms: 35 } } });
  return withBarPlan(d, [['3/4', 8]]);
}
