// Tendencies (docs/SPEC-PRACTICE-INTELLIGENCE.he.md §2, P1 "it notices"): what a take leans to, beyond its verdict.
// Two baselines (§2.1): position tendencies against the take's own tempo line (a constant lead or latency never moves
// them); the global lead and the speeding up against the click (latency already subtracted before analysis).
// Note classes from the score only (§2.2): the SUGGESTED fingering's thumb-under going out and 3/4-over coming back (a
// suggestion, never known — owner 2026-11-17; off when the player uses their own fingering), the top / bottom turn (after a
// run of ≥ 4 notes in one direction), the octave / chunk boundary (the tonic inside a run: where scale timing is least
// stable — van Vugt 2012; a crossing that lands on the tonic counts as neither), leaps of a 5th or more; everything else
// is "plain". Direction is measured on intervals. Swung items get neither (their off-beats sit on the player's ratio).
// One compact record per take (TakeTrace, ~250 B) is kept in shadow mode (storage/takeTraces.ts); a session's records
// are pooled for its end line (§4.3) only when a tendency is consistent across ≥ 10 takes (§2.3). Pure.

import type { Drill, NoteResult, TakeMetrics } from './types';
import { afterCrossing } from './touch';

export type Cls = 'xu' | 'xo' | 'top' | 'bot' | 'oct' | 'leap';
export const CLASSES: readonly Cls[] = ['xu', 'xo', 'top', 'bot', 'oct', 'leap'];

/** §5.3: the kind of a take — what it may change (the rest of the app reads these rules; P1 uses `tendencies`). */
export type TakeKind = 'normal' | 'retention' | 'challenge' | 'slow' | 'form' | 'remedy' | 'review' | 'probe' | 'free';
export const TAKE_KIND: Record<TakeKind, { history: boolean; staircase: boolean; passes: boolean; tendencies: boolean }> = {
  normal: { history: true, staircase: true, passes: true, tendencies: true },
  retention: { history: true, staircase: true, passes: false, tendencies: false },
  challenge: { history: true, staircase: false, passes: true, tendencies: false },
  slow: { history: false, staircase: false, passes: false, tendencies: false },
  form: { history: false, staircase: false, passes: false, tendencies: false },
  remedy: { history: false, staircase: false, passes: false, tendencies: false },
  review: { history: true, staircase: false, passes: false, tendencies: true },
  probe: { history: true, staircase: false, passes: true, tendencies: false },
  free: { history: false, staircase: false, passes: false, tendencies: false },
};

export interface HandTrace {
  /** Matched single notes in the hand's line. */
  n: number;
  /** Random timing: SD of the residuals from the take's own tempo line, plain notes (ms). */
  sd: number;
  /** Per class: [mean residual minus plain notes of the same direction (ms, + = late), notes]. */
  cls: Partial<Record<Cls, [number, number]>>;
  /** Descending minus ascending played/written interval ratio of plain notes (%): negative = faster going down. */
  dir: number | null;
  /** Speeding up between runs of the same direction (%, + = the later run faster); absent on a single pass. */
  drift?: number;
  /** Plain notes' mean residual by pitch class (ms; review round 7): a note that is consistently off has no name, and
   *  it would bias every class it sits next to — the pooling then names no class for that hand. */
  pc?: Record<number, number>;
}
export interface TakeTrace {
  v: 1;
  id: string;
  fam: string;
  at: string;
  /** The played tempo (beats per minute of the analysed drill's beat) and the written interval between notes of the
   *  busiest hand at it (ms). */
  bpm: number;
  ioi: number;
  src: 'midi' | 'mic';
  /** Not a piano take (guitar / bass over MIDI or mic): recorded for calibration, never pooled (§2.5). */
  other?: boolean;
  kind: TakeKind;
  verdict: 'clean' | 'almost' | 'not';
  /** Mean onset vs the click (ms, + = late), after the input's latency. */
  lead: number | null;
  /** Speeding up between runs of the same direction (%, + = faster later; the mean of the hands'). */
  drift: number | null;
  /** A swung item: no direction or class measures (§7 measures swing). */
  swing?: boolean;
  /** The click was thinned on this take (coach.ts, owner 2026-11-27): the timing noise is not the full click's. */
  click?: string;
  R?: HandTrace;
  L?: HandTrace;
  /** Right minus left at shared onsets (ms, + = right later), going up / going down. */
  sync?: { up: number | null; down: number | null };
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
/** Least squares y = a + b x, trimmed once at 3 × the median absolute residual. */
function fit(xs: number[], ys: number[]): { a: number; b: number; res: number[] } {
  const one = (ix: number[]) => {
    const X = ix.map((i) => xs[i]);
    const Y = ix.map((i) => ys[i]);
    const mx = mean(X);
    const my = mean(Y);
    const sxx = X.reduce((s, x) => s + (x - mx) ** 2, 0);
    const b = sxx > 0 ? X.reduce((s, x, k) => s + (x - mx) * (Y[k] - my), 0) / sxx : 0;
    return { a: my - b * mx, b };
  };
  const all = xs.map((_, i) => i);
  let f = one(all);
  const res0 = xs.map((x, i) => ys[i] - (f.a + f.b * x));
  const mad = median(res0.map((r) => Math.abs(r))) || 1;
  const keep = all.filter((i) => Math.abs(res0[i]) <= 3 * mad * 1.4826 + 1e-9);
  if (keep.length >= 4 && keep.length < all.length) f = one(keep);
  return { ...f, res: xs.map((x, i) => ys[i] - (f.a + f.b * x)) };
}

type Pt = { r: NoteResult; beat: number; pitch: number; dev: number; on: number };

/** P1 measures these items only (review round 4: a list, not a pattern): plain scales and arpeggios. */
const CLASSED_FAMILIES = new Set(['scales', 'arpeggios', 'control']);
const classedKind = (kind: string | undefined) => kind === 'scale' || /^arp-/.test(kind ?? '');

/** A swung item: its off-beats sit on the player's own ratio (§7), so no straight-grid direction or class measures. */
export const isSwing = (drill: Drill): boolean => !!drill.spec.swing || drill.swingRatio !== undefined || !!drill.goal?.bass?.swing || drill.notes.some((n) => n.swing);

/** One take's trace, or null when there is too little to say (fewer than 8 matched notes, free time, no timing). */
export function takeTrace(drill: Drill, m: TakeMetrics, o: { at: string; src: 'midi' | 'mic'; kind: TakeKind; /** a piano take (guitar / bass are recorded, never pooled in P1) */ piano?: boolean; /** the player uses their own fingering on this item: the suggested crossings say nothing (owner 2026-11-17) */ ownFingering?: boolean }): TakeTrace | null {
  if (drill.untimed || o.kind === 'free') return null;
  const per = m.perNote ?? [];
  // the written single notes of each hand (no other written note of the same hand at the same beat), in score order:
  // classes come from the score; the played notes are attached afterwards (a missed note never shifts a class)
  const solo = (r: NoteResult) => !per.some((x) => x !== r && x.exp.hand === r.exp.hand && Math.abs(x.exp.beat - r.exp.beat) < 1e-4);
  const lines: Record<'R' | 'L', NoteResult[]> = { R: [], L: [] };
  for (const r of per) if ((r.exp.hand === 'R' || r.exp.hand === 'L') && solo(r)) lines[r.exp.hand].push(r);
  for (const h of ['R', 'L'] as const) lines[h].sort((a, b) => a.exp.beat - b.exp.beat);
  const ok = (r: NoteResult) => !!r.played && r.dev !== null && Number.isFinite(r.dev) && Math.abs(r.dev) < 400 && r.ok;
  const pts = (h: 'R' | 'L'): Pt[] => lines[h].filter(ok).map((r) => ({ r, beat: r.exp.beat, pitch: r.exp.pitch, dev: r.dev as number, on: r.played!.on }));
  const P = { R: pts('R'), L: pts('L') };
  const all = [...P.R, ...P.L];
  if (all.length < 8) return null;
  // the played ms per beat, from the data itself (robust to the note value the take was played at)
  const rates: number[] = [];
  for (const h of ['R', 'L'] as const)
    for (let i = 1; i < P[h].length; i++) {
      const db = P[h][i].beat - P[h][i - 1].beat;
      if (db > 1e-4) rates.push((P[h][i].on - P[h][i - 1].on) / db);
    }
  if (rates.length < 4) return null;
  const msPerBeat = median(rates);
  if (!(msPerBeat > 20 && msPerBeat < 5000)) return null;
  const busy = P.R.length >= P.L.length ? P.R : P.L;
  const steps = busy.slice(1).map((p, i) => p.beat - busy[i].beat).filter((d) => d > 1e-4);
  const ioi = r1((steps.length ? median(steps) : 0.5) * msPerBeat);
  // the global baseline: the click (the mean lead)
  const lead = r1(mean(all.map((p) => p.dev)));
  const tonic = (((drill.tonic?.key ?? drill.spec.key) % 12) + 12) % 12; // fallback for an empty line
  const swing = isSwing(drill);
  // P1 measures straight, even scales and arpeggios only (review round 3): a dotted / grouped / accent-shift item has its
  // own rhythm on purpose, a chromatic scale has no thumb-under pattern, swing is §7's
  const variant = drill.spec.variant ?? 'even';
  // …and only when every hand's written notes are evenly spaced (a groove or a written rhythm has its own timing)
  const even = (['R', 'L'] as const).every((h) => {
    const st = lines[h].slice(1).map((r, i) => r.exp.beat - lines[h][i].exp.beat).filter((d) => d > 1e-4);
    return !st.length || st.every((d) => Math.abs(d - st[0]) < 1e-3);
  });
  const classed = !swing && even && variant === 'even' && drill.spec.scale !== 'chromatic' && CLASSED_FAMILIES.has(drill.spec.family) && classedKind(drill.spec.kind);
  /** The first two notes (the count-in settling) and the last five (a phrase's ending, a ritardando) are edges (§2.2). */
  const EDGE_START = 2;
  const notesPerBeat = steps.length ? 1 / median(steps) : 2;
  const EDGE_END = Math.max(5, Math.round(2 * notesPerBeat));
  const hand = (h: 'R' | 'L'): HandTrace | undefined => {
    const line = lines[h];
    const played = P[h];
    if (played.length < 6) return undefined;
    const N = line.length;
    const pitch = (i: number) => line[i].exp.pitch;
    const runBefore = (i: number, d: number) => {
      let k = 0;
      for (let j = i; j > 0 && Math.sign(pitch(j) - pitch(j - 1)) === d; j--) k++;
      return k;
    };
    // the figure's boundary (§2.2): where the pattern repeats — the pitch class the hand's line starts on (the tonic of a
    // scale; the bass note of an inversion; the root of an arpeggio on another degree)
    const boundary = N ? (((pitch(0) % 12) + 12) % 12) : tonic;
    // the classes of the written line; 'skip' = an edge. A suggested crossing ON the boundary is the boundary (a place
    // in the figure — the suggested thumb starts each repeat of an arpeggio; no claim about fingers: owner 2026-11-17)
    const cls: (Cls | 'skip' | null)[] = line.map((r, i) => {
      if (i < EDGE_START || i >= N - EDGE_END) return 'skip';
      if (!classed) return null;
      const p = pitch(i);
      const prev = line[i - 1].exp;
      const next = line[i + 1].exp;
      if (p > prev.pitch && p > next.pitch && runBefore(i, 1) >= 3) return 'top';
      if (p < prev.pitch && p < next.pitch && runBefore(i, -1) >= 3) return 'bot';
      // the crossing points come from the SUGGESTED fingering (owner 2026-11-17: a suggestion, never known): none when the
      // player marked their own fingering for this item
      const cross = !o.ownFingering && afterCrossing(prev, r.exp);
      const onBoundary = (((p % 12) + 12) % 12) === boundary;
      if (onBoundary) return 'oct';
      if (cross) return r.exp.finger === 1 ? 'xu' : 'xo';
      if (Math.abs(p - prev.pitch) >= 7) return 'leap';
      return null;
    });
    const ok_ = line.map((r) => ok(r));
    const dev = (i: number) => line[i].dev as number;
    const beat = (i: number) => line[i].exp.beat;
    // monotone runs of the written line (turn notes end one run and start the next)
    const runOf: number[] = new Array(N).fill(-1);
    const runs: { d: number; idx: number[] }[] = [];
    for (let i = 1; i < N; i++) {
      const d = Math.sign(pitch(i) - pitch(i - 1));
      if (!d) continue;
      if (!runs.length || runs[runs.length - 1].d !== d) runs.push({ d, idx: [i - 1] });
      runs[runs.length - 1].idx.push(i);
      runOf[i] = runs.length - 1;
    }
    // each run's own tempo line through its PLAIN played notes (a trend across the take never leaks into a class)
    // a run with only two plain notes (a short arpeggio) is referenced by their mean instead of a line
    const lineOf = runs.map((r) => {
      const pts = r.idx.filter((i) => cls[i] === null && ok_[i]);
      if (pts.length >= 3) return fit(pts.map(beat), pts.map(dev));
      if (pts.length === 2) return { a: mean(pts.map(dev)), b: 0, res: [] as number[] };
      return null;
    });
    const predict = (run: number, i: number) => {
      const l = lineOf[run];
      return l ? l.a + l.b * beat(i) : null;
    };
    const place = (i: number) => {
      const f = beat(i) - Math.floor(beat(i) + 1e-6);
      return Math.round(f * 12) % 12;
    };
    /** Note i predicted from the nearest ≤ 8 plain played notes of its run (review round 5): one level per place in the
     *  beat and one shared slope (a lilt is a level, a tempo trend is the slope); ≥ 2 references at i's own place. */
    /** Least squares over notes js: one level per place in the beat and one shared slope (dev = c_place + b·(beat − b0)).
     *  The levels by place and the slope, or null when it can't be solved. */
    const solve = (js: number[], b0: number): { level: Map<number, number>; b: number } | null => {
      const places = [...new Set(js.map(place))];
      const P = places.length;
      const K = P + 1;
      if (js.length < K + 1) return null;
      const A: number[][] = Array.from({ length: K }, () => new Array(K + 1).fill(0));
      for (const j of js) {
        const row = new Array(K).fill(0);
        row[places.indexOf(place(j))] = 1;
        row[P] = beat(j) - b0;
        for (let r = 0; r < K; r++) {
          for (let c = 0; c < K; c++) A[r][c] += row[r] * row[c];
          A[r][K] += row[r] * dev(j);
        }
      }
      for (let c = 0; c < K; c++) {
        let q = c;
        for (let r = c + 1; r < K; r++) if (Math.abs(A[r][c]) > Math.abs(A[q][c])) q = r;
        if (Math.abs(A[q][c]) < 1e-9) return null;
        [A[c], A[q]] = [A[q], A[c]];
        for (let r = 0; r < K; r++) if (r !== c) {
          const f = A[r][c] / A[c][c];
          for (let k = c; k <= K; k++) A[r][k] -= f * A[c][k];
        }
      }
      return { level: new Map(places.map((pl, k) => [pl, A[k][K] / A[k][k]])), b: A[P][K] / A[P][P] };
    };
    /** Note i predicted from up to 6 nearest plain played notes of its run ON ONE SIDE of it (`side` −1 before, +1 after;
     *  0 both), with ≥ 2 at i's own place in the beat. */
    const sidePredict = (run: number, i: number, side: -1 | 0 | 1): number | null => {
      const near = runs[run].idx.filter((j) => j !== i && cls[j] === null && ok_[j] && (side === 0 || Math.sign(j - i) === side)).sort((a, b) => Math.abs(a - i) - Math.abs(b - i)).slice(0, side === 0 ? 8 : 6);
      if (near.filter((j) => place(j) === place(i)).length < 2) return null;
      const f = solve(near, beat(i));
      return f ? (f.level.get(place(i)) ?? null) : null;
    };
    // residuals of plain notes against their run's line: the hand's random timing
    const plainRes: number[] = [];
    for (let i = 0; i < N; i++) if (cls[i] === null && ok_[i] && runOf[i] >= 0) {
      const pr = predict(runOf[i], i);
      if (pr !== null) plainRes.push(dev(i) - pr);
    }
    const out: HandTrace = { n: played.length, sd: r1(sd(plainRes)), cls: {}, dir: null };
    if (classed)
      for (const c of CLASSES) {
        const diffs: number[] = [];
        for (let i = 0; i < N; i++) {
          if (cls[i] !== c || !ok_[i]) continue;
          // a class note against a LOCAL line through the nearest plain notes of its run at the same place in the beat
          // (review round 4: a whole-run line misses a tempo curve; a long-short lilt is a place-in-the-beat effect) —
          // a turn note against both sides, extended to it
          const own = runOf[i];
          const turn = (c === 'top' || c === 'bot') && own >= 0 && own + 1 < runs.length && runs[own + 1].idx[0] === i;
          // the evidence from each side separately (a turn: the run before and the run after; else before and after it
          // in its run): both sides must lean the same way — a real effect shows on both, a biased neighbour on one
          const pBefore = own >= 0 ? sidePredict(own, i, turn ? 0 : -1) : null;
          const pAfter = turn ? sidePredict(own + 1, i, 0) : own >= 0 ? sidePredict(own, i, 1) : null;
          const sides = [pBefore, pAfter].filter((x): x is number => x !== null).map((pr) => dev(i) - pr);
          if (sides.length === 2 && Math.sign(sides[0]) !== Math.sign(sides[1])) continue;
          if (sides.length) diffs.push(mean(sides));
        }
        if (diffs.length) out.cls[c] = [r1(mean(diffs)), diffs.length];
      }
    // plain notes' residual by pitch class, against both sides of their run (review round 7)
    if (classed) {
      const byPc: Record<number, number[]> = {};
      for (let j = 0; j < N; j++) {
        if (cls[j] !== null || !ok_[j] || runOf[j] < 0) continue;
        const pr = sidePredict(runOf[j], j, 0);
        if (pr === null) continue;
        (byPc[((pitch(j) % 12) + 12) % 12] ??= []).push(dev(j) - pr);
      }
      if (Object.keys(byPc).length) out.pc = Object.fromEntries(Object.entries(byPc).map(([k, v]) => [k, r1(mean(v))]));
    }
    // direction (scales / arpeggios, straight, parallel motion): each run's tempo from its slope over its plain notes,
    // with one level per place in the beat (review round 6: interval medians let one late note swing the result); the
    // down runs' tempo against the up runs'. In a single pass this also carries a tempo change across the take — the
    // words say only what is measured ("the way down comes out faster than the way up")
    const contrary = drill.spec.motion === 'contrary';
    if (classed && !contrary) {
      const ups: number[] = [];
      const downs: number[] = [];
      for (const r of runs) {
        const js = r.idx.filter((j) => cls[j] === null && ok_[j]);
        if (js.length < 4) continue;
        const f = solve(js, beat(js[0]));
        if (f) (r.d > 0 ? ups : downs).push(f.b);
      }
      if (ups.length && downs.length) out.dir = r1(((mean(downs) - mean(ups)) / msPerBeat) * 100);
    }
    // speeding up (§2.1): only between runs of the SAME direction (the first ascent against a later one)
    if (classed) {
      const ratiosOf = (r: { idx: number[] }) => {
        const xs: number[] = [];
        for (let k = 1; k < r.idx.length; k++) {
          const a = r.idx[k - 1];
          const b = r.idx[k];
          if (cls[a] === 'skip' || cls[b] === 'skip' || !ok_[a] || !ok_[b]) continue;
          const written = (beat(b) - beat(a)) * msPerBeat;
          if (written <= 1e-3) continue;
          const ratio = 1 + (dev(b) - dev(a)) / written;
          if (ratio > 0.3 && ratio < 3) xs.push(ratio);
        }
        return xs;
      };
      const changes: number[] = [];
      for (const d of [1, -1]) {
        const rs = runs.filter((r) => r.d === d).map(ratiosOf).filter((xs) => xs.length >= 4);
        if (rs.length >= 2) changes.push((median(rs[0]) - median(rs[rs.length - 1])) * 100);
      }
      if (changes.length) out.drift = r1(mean(changes));
    }
    return out;
  };
  const R = hand('R');
  const L = hand('L');
  const drifts = [R?.drift, L?.drift].filter((x): x is number => x !== undefined);
  const drift = drifts.length ? r1(mean(drifts)) : null;
  // hands together: right minus left at shared written onsets, by the right hand's direction
  let sync: TakeTrace['sync'];
  const left = new Map(P.L.map((p) => [p.beat.toFixed(3), p]));
  const ups: number[] = [];
  const downs: number[] = [];
  const rLine = lines.R;
  const rIdx = new Map(rLine.map((r, i) => [r, i]));
  P.R.forEach((p) => {
    const q = left.get(p.beat.toFixed(3));
    const i = rIdx.get(p.r);
    if (!classed || !q || i === undefined || i < EDGE_START || i >= rLine.length - EDGE_END || drill.spec.motion === 'contrary') return;
    const d = rLine[i].exp.pitch - rLine[i - 1].exp.pitch;
    if (!d) return;
    (d > 0 ? ups : downs).push(p.dev - q.dev);
  });
  if (ups.length >= 3 || downs.length >= 3) sync = { up: ups.length >= 3 ? r1(mean(ups)) : null, down: downs.length >= 3 ? r1(mean(downs)) : null };
  return {
    v: 1,
    id: drill.itemId,
    fam: drill.spec.family,
    at: o.at,
    bpm: Math.round(60000 / msPerBeat),
    ioi,
    src: o.src,
    ...(o.piano === false ? { other: true } : {}),
    kind: o.kind,
    verdict: m.verdict,
    lead,
    drift,
    ...(swing ? { swing: true } : {}),
    ...(drill.click && drill.click !== 'all' ? { click: drill.click } : {}),
    ...(R ? { R } : {}),
    ...(L ? { L } : {}),
    ...(sync ? { sync } : {}),
  };
}

// ───────────────────────────── pooling (§2.3) ─────────────────────────────

type T2 = { en: string; he: string };
export interface Tendency {
  cell: string;
  mean: number;
  takes: number;
  t: number;
  line: T2;
}

/** The audible threshold for a timing contrast (§2.3): max(12 ms, 5 % of the interval; 7 % below 4 notes a second). */
export const msThreshold = (ioi: number) => Math.max(ioi < 150 ? 15 : 12, (ioi > 250 ? 0.07 : 0.05) * ioi);
/** A tempo-ratio contrast (speeding up, faster one way): 3 %. */
export const PCT_THRESHOLD = 3;
/** Takes needed before a session's tendency is named; the share of them leaning the same way. */
export const POOL_MIN = 10;
export const CONSISTENT = 0.7;
/** A turn note's natural lengthening (§2.2, ~10 ms): not a tendency. */
export const TURN_ALLOW = 10;

/** The words for a tendency (external focus: the sound and the pulse; a place in the scale, never a finger). Fixed
 *  sentences only (each is translated whole). */
function phrase(cell: string, m: number, both: boolean): T2 {
  const [kind, h, c] = cell.split(':') as [string, string | undefined, string | undefined];
  if (kind === 'drift') return m > 0 ? { en: 'Speeding up a little through the take.', he: 'קצת מאיץ לאורך הביצוע.' } : { en: 'Slowing down a little through the take.', he: 'קצת מאט לאורך הביצוע.' };
  if (kind === 'dir') {
    const down = m < 0;
    if (!both) return down ? { en: 'The way down comes out a little faster than the way up.', he: 'הירידה יוצאת קצת מהירה יותר מהעלייה.' } : { en: 'The way up comes out a little faster than the way down.', he: 'העלייה יוצאת קצת מהירה יותר מהירידה.' };
    if (h === 'R') return down ? { en: 'In the right hand the way down comes out a little faster than the way up.', he: 'ביד ימין הירידה יוצאת קצת מהירה יותר מהעלייה.' } : { en: 'In the right hand the way up comes out a little faster than the way down.', he: 'ביד ימין העלייה יוצאת קצת מהירה יותר מהירידה.' };
    return down ? { en: 'In the left hand the way down comes out a little faster than the way up.', he: 'ביד שמאל הירידה יוצאת קצת מהירה יותר מהעלייה.' } : { en: 'In the left hand the way up comes out a little faster than the way down.', he: 'ביד שמאל העלייה יוצאת קצת מהירה יותר מהירידה.' };
  }
  if (kind === 'sync') {
    const up = h === 'up';
    if (m > 0) return up ? { en: 'The right hand is a little behind going up.', he: 'יד ימין קצת מאחור בעלייה.' } : { en: 'The right hand is a little behind going down.', he: 'יד ימין קצת מאחור בירידה.' };
    return up ? { en: 'The left hand is a little behind going up.', he: 'יד שמאל קצת מאחור בעלייה.' } : { en: 'The left hand is a little behind going down.', he: 'יד שמאל קצת מאחור בירידה.' };
  }
  const late = m > 0;
  const W: Record<string, T2> = {
    top: late ? { en: 'The top note comes late.', he: 'הצליל העליון מאחר.' } : { en: 'The top note comes early.', he: 'הצליל העליון מקדים.' },
    bot: late ? { en: 'The bottom note comes late.', he: 'הצליל התחתון מאחר.' } : { en: 'The bottom note comes early.', he: 'הצליל התחתון מקדים.' },
    oct: late ? { en: 'A little late at the octave change.', he: 'קצת מאחר במעבר האוקטבה.' } : { en: 'A little early at the octave change.', he: 'קצת מקדים במעבר האוקטבה.' },
    // the fingering is a suggestion (owner 2026-11-17): the place is named by the suggested fingering, never as a fact
    xu: late ? { en: 'A little late where the suggested fingering passes the thumb under.', he: 'קצת מאחר בנקודה שבה האצבוע המוצע מעביר אגודל.' } : { en: 'A little early where the suggested fingering passes the thumb under.', he: 'קצת מקדים בנקודה שבה האצבוע המוצע מעביר אגודל.' },
    xo: late ? { en: 'A little late where the suggested fingering crosses back over the thumb.', he: 'קצת מאחר בנקודה שבה האצבוע המוצע חוזר מעל האגודל.' } : { en: 'A little early where the suggested fingering crosses back over the thumb.', he: 'קצת מקדים בנקודה שבה האצבוע המוצע חוזר מעל האגודל.' },
    leap: late ? { en: 'Landings after a leap come late.', he: 'הנחיתה אחרי קפיצה מאחרת.' } : { en: 'Landings after a leap come early.', he: 'הנחיתה אחרי קפיצה מקדימה.' },
  };
  return W[c ?? ''] ?? NOTHING;
}

/** The line when nothing is consistent over enough takes. */
export const NOTHING: T2 = { en: 'Nothing consistent today: steady playing.', he: 'שום דבר עקבי היום: נגינה יציבה.' };

/** Takes whose tendencies count (§2.3): an eligible kind, clean or almost, wired MIDI (§2.5). */
export const eligible = (t: TakeTrace) => TAKE_KIND[t.kind].tendencies && t.verdict !== 'not' && t.src === 'midi' && !t.other;

/**
 * The strongest tendency over a session's takes (§2.3, §4.3), or null: ≥ POOL_MIN eligible takes, the cell present in
 * ≥ 6 of them, leaning the same way in ≥ 70 %, its mean beyond the audible threshold and ≥ 2.5 standard errors.
 * `enough` says whether there were enough takes to judge at all (else neither a tendency nor "nothing consistent").
 */
export function sessionTendency(traces: TakeTrace[]): { enough: boolean; top: Tendency | null } {
  // only takes that measured something count (review round 3): ten cadence or lick takes say nothing about timing
  const measured = (t: TakeTrace) => t.drift !== null || !!t.sync || (['R', 'L'] as const).some((h) => !!t[h] && (t[h]!.dir !== null || Object.keys(t[h]!.cls).length > 0));
  const ts = traces.filter((t) => eligible(t) && measured(t));
  if (ts.length < POOL_MIN) return { enough: false, top: null };
  const ioi = median(ts.map((t) => t.ioi));
  const cells = new Map<string, number[]>();
  const occs = new Map<string, number[]>();
  const add = (k: string, v: number | null | undefined) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return;
    (cells.get(k) ?? cells.set(k, []).get(k)!).push(v);
  };
  for (const t of ts) {
    add('drift', t.drift);
    for (const h of ['R', 'L'] as const) {
      const x = t[h];
      if (!x) continue;
      add(`dir:${h}`, x.dir);
      for (const c of CLASSES) {
        add(`cls:${h}:${c}`, x.cls[c]?.[0]);
        if (x.cls[c]) (occs.get(`cls:${h}:${c}`) ?? occs.set(`cls:${h}:${c}`, []).get(`cls:${h}:${c}`)!).push(x.cls[c]![1]);
      }
    }
    for (const h of ['R', 'L'] as const) for (const [k, v] of Object.entries(t[h]?.pc ?? {})) add(`pc:${h}:${k}`, v);
    add('sync:up', t.sync?.up);
    add('sync:down', t.sync?.down);
  }
  const both = ts.some((t) => t.R) && ts.some((t) => t.L);
  const occ = new Map([...occs].map(([k, v]) => [k, median(v)]));
  let top: Tendency | null = null;
  let best = 0;
  // a plain note consistently off in a hand (it has no name): no class line for that hand (review round 7)
  const pcOff = new Set<string>();
  for (const [cell, xs] of cells) {
    if (!cell.startsWith('pc:') || xs.length < POOL_MIN) continue;
    const m0 = mean(xs);
    const s0 = sd(xs);
    const t0 = s0 > 0 ? m0 / (s0 / Math.sqrt(xs.length)) : 0;
    if (Math.abs(m0) >= 0.5 * msThreshold(ioi) && Math.abs(t0) >= 3) pcOff.add(cell.split(':')[1]);
  }
  for (const [cell, xs] of cells) {
    if (xs.length < POOL_MIN || cell.startsWith('pc:')) continue;
    if (cell.startsWith('cls:') && pcOff.has(cell.split(':')[1])) continue;
    const m = mean(xs);
    const s = sd(xs);
    const t = s > 0 ? m / (s / Math.sqrt(xs.length)) : 0;
    const same = xs.filter((x) => Math.sign(x) === Math.sign(m)).length / xs.length;
    const theta = cell === 'drift' || cell.startsWith('dir:') ? PCT_THRESHOLD : cell.startsWith('sync:') ? Math.max(15, 0.04 * ioi) : msThreshold(ioi);
    // ~17 cells are looked at together (review: |t| ≥ 3 for all of them); a class met once or twice a take (a turn, the
    // octave change) is noisier per take: |t| ≥ 3.5
    const few = (occ.get(cell) ?? 9) < 2.5;
    // a turn note may lengthen naturally by ~10 ms (§2.2): tested beyond that allowance
    const turn = /:(top|bot)$/.test(cell);
    const mm = turn ? Math.sign(m) * Math.max(0, Math.abs(m) - TURN_ALLOW) : m;
    const tt = turn && s > 0 ? mm / (s / Math.sqrt(xs.length)) : t;
    if (same < CONSISTENT || Math.abs(mm) < theta || Math.abs(tt) < (few ? 3.5 : 3)) continue;
    const score = (Math.abs(mm) / theta) * Math.min(1, Math.abs(tt) / 3);
    if (score > best) {
      best = score;
      top = { cell, mean: r1(m), takes: xs.length, t: r1(t), line: phrase(cell, m, both) };
    }
  }
  // the same hand behind both ways: one line without a direction (review round 4)
  if (top && top.cell.startsWith('sync:')) {
    const other = cells.get(top.cell === 'sync:up' ? 'sync:down' : 'sync:up');
    if (other && other.length >= POOL_MIN && Math.sign(mean(other)) === Math.sign(top.mean) && Math.abs(mean(other)) >= 0.5 * Math.abs(top.mean))
      top = { ...top, cell: 'sync', line: top.mean > 0 ? { en: 'The right hand is a little behind the left.', he: 'יד ימין קצת מאחרת אחרי יד שמאל.' } : { en: 'The left hand is a little behind the right.', he: 'יד שמאל קצת מאחרת אחרי יד ימין.' } };
  }
  return { enough: [...cells.values()].some((xs) => xs.length >= POOL_MIN), top };
}
