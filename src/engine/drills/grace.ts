// Grace notes in a take (notation 0.99, ExpNote.graces). A grace note is not one of the drill's graded notes: it is
// small, takes none of the bar's time, and is played just before (acciaccatura) or on (appoggiatura) the main note's
// beat. Before the take is matched note for note, the played graces are taken out of the played list — so they are
// never counted wrong or extra — and the main note's onset is taken from whichever of the grace and the main note lands
// nearer the beat, so the grace's own timing (an appoggiatura on the beat delays the main note) never moves the main
// note's grade. A grace left out is reported (TakeMetrics.graces): a soft mark unless the drill's goal is strict. Pure.

import type { Drill, PlayedNote } from './types';

export interface GraceAbsorb {
  /** The played notes without the graces (indexes change), main notes re-timed where the grace sat nearer the beat. */
  played: PlayedNote[];
  graces: { ok: number; total: number; missed: number[] };
}

/**
 * Take the played grace notes out of a timed take. `T(beat)` = the beat's expected onset (ms, the take's own time map).
 * For each written note with graces (in time order), each grace is the nearest unused played note of its pitch inside
 * [beat − before, beat + after] (graces in order, each after the last), unless another written note of that pitch lies
 * nearer — then it is that note, not a grace.
 */
export function absorbGraces(drill: Pick<Drill, 'notes'>, beatMs: number, played: PlayedNote[], T: (beat: number) => number): GraceAbsorb {
  const exp = drill.notes;
  const withG = exp.map((e, i) => ({ e, i })).filter(({ e }) => e.graces?.length);
  if (!withG.length) return { played, graces: { ok: 0, total: 0, missed: [] } };
  const used = new Set<number>();
  const retime = new Map<number, number>();
  const missed: number[] = [];
  let ok = 0;
  let total = 0;
  const order = played.map((_, j) => j).sort((a, b) => played[a].on - played[b].on);
  for (const { e, i } of withG.sort((a, b) => a.e.beat - b.e.beat)) {
    const t = T(e.beat);
    const gs = e.graces!;
    total += gs.length;
    const before = Math.min(beatMs * 0.5, 400) + 120 * (gs.length - 1);
    const after = Math.min(beatMs * 0.5, 300);
    /** Another written (non-grace) note of this pitch nearer to the onset: the played note is that one. */
    const nearerOther = (pitch: number, on: number) => exp.some((o, k) => k !== i && o.pitch === pitch && Math.abs(T(o.beat) - on) < Math.abs(t - on) - 1e-6);
    let last = -Infinity;
    let first: number | null = null;
    let all = true;
    for (const g of gs) {
      const j = order.find((k) => !used.has(k) && played[k].pitch === g.pitch && played[k].on > last && played[k].on >= t - before && played[k].on <= t + after && !nearerOther(g.pitch, played[k].on));
      if (j === undefined) {
        all = false;
        continue;
      }
      used.add(j);
      last = played[j].on;
      first ??= played[j].on;
      ok++;
    }
    if (!all) missed.push(i);
    if (first === null) continue;
    // the main note: the first unused press of its pitch from the grace on, within the time an appoggiatura may take
    const g0 = first;
    const span = Math.max(after, e.dur * beatMs * 0.75);
    const m = order.find((k) => !used.has(k) && played[k].pitch === e.pitch && played[k].on >= g0 - 1e-6 && played[k].on <= g0 + span);
    if (m !== undefined && Math.abs(g0 - t) < Math.abs(played[m].on - t)) retime.set(m, g0);
  }
  return {
    played: played.map((p, j) => (retime.has(j) ? { ...p, on: retime.get(j)! } : p)).filter((_, j) => !used.has(j)),
    graces: { ok, total, missed },
  };
}

/**
 * Free time (rubato.ts, no clock): after the written notes are matched in order, a leftover played note is a grace when
 * it has a grace's pitch and comes just before that grace's main note as played (after the note before it). Returns the
 * leftover indexes taken as graces and the soft count.
 */
export function freeGraces(drill: Pick<Drill, 'notes'>, played: PlayedNote[], hitOf: (expIndex: number) => number | null, unused: Set<number>): { taken: Set<number>; graces: { ok: number; total: number; missed: number[] } } {
  const taken = new Set<number>();
  const missed: number[] = [];
  let ok = 0;
  let total = 0;
  drill.notes.forEach((e, i) => {
    if (!e.graces?.length) return;
    total += e.graces.length;
    const h = hitOf(i);
    if (h === null) {
      missed.push(i);
      return;
    }
    const at = played[h].on;
    // the previous written onset as played (the grace sits between it and the main note), at most 1.5 s back
    let prev = at - 1500;
    drill.notes.forEach((o, k) => {
      const hk = hitOf(k);
      if (hk !== null && o.beat < e.beat - 1e-6 && played[hk].on < at && played[hk].on > prev) prev = played[hk].on;
    });
    let all = true;
    let last = prev - 1e-6;
    for (const g of e.graces) {
      const j = [...unused].filter((k) => !taken.has(k) && played[k].pitch === g.pitch && played[k].on > last && played[k].on <= at + 120).sort((a, b) => played[a].on - played[b].on)[0];
      if (j === undefined) {
        all = false;
        continue;
      }
      taken.add(j);
      last = played[j].on;
      ok++;
    }
    if (!all) missed.push(i);
  });
  return { taken, graces: { ok, total, missed } };
}
