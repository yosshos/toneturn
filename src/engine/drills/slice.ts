// Loop the spot (COURSE-FEEDBACK-UI §4.1, slice 3): a few bars of a drill as a drill of their own — the notes, chart,
// drums and band re-based to beat 0, so the take engine plays and measures just those bars (count-in = one bar, as
// always). Pure. Loop takes are practice: the slice has its own item id and never moves the item's ladder.

import type { Drill } from './types';
import { barBeats, baseMeter, timeMapOf } from './timeline';

/** The bars of a drill (index, first drill beat, length in drill beats), from its time map. */
export function drillBars(drill: Drill): { index: number; start: number; beats: number }[] {
  const tm = timeMapOf(drill, 60);
  const out = tm.bars.filter((b) => b.start < drill.beats - 1e-9).map((b) => ({ index: b.index, start: b.start, beats: b.beats }));
  return out.length ? out : [{ index: 0, start: 0, beats: drill.beats }];
}

/** The bar a drill beat falls in (0-based; past the end: the last bar). */
export function barOfBeat(drill: Drill, beat: number): number {
  const bars = drillBars(drill);
  for (let i = bars.length - 1; i >= 0; i--) if (beat >= bars[i].start - 1e-6) return i;
  return 0;
}

const inRange = (b: number, a: number, z: number) => b >= a - 1e-6 && b < z - 1e-6;

/** The loop take's tempo: 10 % under the take's, never under ♩30. */
export const loopBpm = (bpm: number): number => Math.max(30, Math.round(bpm * 0.9));
/** Clean loop passes before "Whole item" (COURSE-FEEDBACK-UI §4.1). */
export const LOOP_PASSES = 2;

/**
 * Bars `fromBar`…`toBar` (0-based, inclusive) of a drill as a drill: notes, chart, drum fills / sections, band rests /
 * sections, ear windows and the meter / tempo changes re-based to beat 0. The road map, writing steps and prep time
 * are dropped (they belong to the whole item).
 */
export function sliceDrill(drill: Drill, fromBar: number, toBar: number): Drill {
  const bars = drillBars(drill);
  const a = Math.max(0, Math.min(bars.length - 1, Math.min(fromBar, toBar)));
  const z = Math.max(a, Math.min(bars.length - 1, Math.max(fromBar, toBar)));
  const start = bars[a].start;
  const end = bars[z].start + bars[z].beats;
  const nBars = z - a + 1;
  const rebar = (b: number) => b - a;
  // Meters: the one in force at the first bar becomes bar 0; later changes inside the slice move with it.
  const meters = drill.meters?.length
    ? (() => {
        const before = [...drill.meters].filter((c) => c.bar <= a).sort((x, y) => x.bar - y.bar);
        const first = before.length ? before[before.length - 1].meter : baseMeter(drill);
        return [{ bar: 0, meter: first }, ...drill.meters.filter((c) => c.bar > a && c.bar <= z).map((c) => ({ bar: rebar(c.bar), meter: c.meter }))];
      })()
    : undefined;
  const tempoMap = drill.tempoMap?.filter((c) => c.bar > a && c.bar <= z).map((c) => ({ bar: rebar(c.bar), ratio: c.ratio }));
  const firstMeter = meters ? meters[0].meter : null;
  const meter = firstMeter ? barBeats(firstMeter, drill.pulse) : drill.meter;
  const sectionAt = <T extends { bar: number }>(xs: T[] | undefined): T[] | undefined => {
    if (!xs?.length) return xs;
    const sorted = [...xs].sort((x, y) => x.bar - y.bar);
    const live = sorted.filter((s) => s.bar <= a).pop();
    return [...(live ? [{ ...live, bar: 0 }] : []), ...sorted.filter((s) => s.bar > a && s.bar <= z).map((s) => ({ ...s, bar: rebar(s.bar) }))];
  };
  const out: Drill = {
    ...drill,
    itemId: `${drill.itemId}~loop${a}-${z}`,
    notes: drill.notes.filter((n) => inRange(n.beat, start, end)).map((n) => ({ ...n, beat: n.beat - start, dur: Math.min(n.dur, end - n.beat) })),
    beats: end - start,
    meter: meter || drill.meter,
    ...(drill.chart ? { chart: drill.chart.slice(a, z + 1) } : {}),
    ...(drill.drums ? { drums: { ...drill.drums, fills: drill.drums.fills?.filter((f) => f >= a && f <= z).map(rebar), sections: sectionAt(drill.drums.sections) } } : {}),
    ...(drill.band
      ? {
          band: {
            ...drill.band,
            rests: drill.band.rests?.filter(([x, y]) => y > start && x < end).map(([x, y]) => [Math.max(0, x - start), Math.min(end, y) - start] as [number, number]),
            sections: sectionAt(drill.band.sections),
          },
        }
      : {}),
    ...(drill.listen
      ? {
          listen: {
            ...drill.listen,
            notes: drill.listen.notes.filter((n) => inRange(n.beat, start, end)).map((n) => ({ ...n, beat: n.beat - start })),
            windows: drill.listen.windows.filter(([x, y]) => y > start && x < end).map(([x, y]) => [Math.max(0, x - start), Math.min(end, y) - start] as [number, number]),
          },
        }
      : {}),
    ...(drill.freeFrom !== undefined ? { freeFrom: Math.max(0, drill.freeFrom - start) } : {}),
    meters,
    tempoMap: tempoMap?.length ? tempoMap : undefined,
    form: undefined,
    write: undefined,
    drumWrite: undefined,
    prep: undefined,
    phrase: drill.phrase ? { ...drill.phrase, at: Math.max(0, drill.phrase.at - start) } : undefined,
    paged: drill.paged && nBars > 4 ? true : undefined,
  };
  if (!out.meters) delete out.meters;
  if (!out.tempoMap) delete out.tempoMap;
  for (const k of ['form', 'write', 'drumWrite', 'prep', 'phrase', 'paged'] as const) if (out[k] === undefined) delete out[k];
  return out;
}
