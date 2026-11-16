// Transposition that stays playable on guitar, bass and voice (SPEC-PHRASE-STUDIO §7.4, §13.7) and the measures the
// physical-cost terms read (§10.3). Pure, on pitch arrays only (phrase.ts maps a phrase to pitches and calls this).
//
// Guitar / bass: per key the phrase is placed on the neck. With "same position in every key" the home key's fingering
// is moved as a whole (same strings, every fret + the transposition): a movable shape, so the fingers do the same thing
// in every key. When the moved shape does not fit the neck (below the nut, above the top fret, or an open string the
// home key did not use), a shortest path over the (string, fret) choices of each note finds the closest playable
// fingering: a cost for each fret shift beyond the hand's span, string skips, high frets, open strings the home key did
// not use, and a shape term that prefers the home key's strings and relative frets.
//
// Voice: the octave with the fewest semitones outside the singer's saved range; a key whose best octave still leaves a
// note outside is "out of range" for that singer (excluded from "yours", §7.4).

export interface Placed {
  /** 1 = the highest-sounding string. */
  string: number;
  /** 0 = open. */
  fret: number;
}
export interface Range {
  low: number;
  high: number;
}

/** The hand's span in frets beyond the index finger: 3 (four frets, one finger each), 5 with a stretch. */
export const SPAN = 3;
export const SPAN_STRETCH = 5;

export interface NeckOpts {
  /** Open-string pitches, string 1 (highest) first (fretboard.ts TUNINGS). */
  open: number[];
  maxFret: number;
  /** Open strings may be used (the home key always may; other keys only when the home key used them). */
  allowOpen: boolean;
  /** The home key's placement: keep its shape (strings, relative frets). */
  home?: { pitches: number[]; placed: Placed[] } | null;
  /** "per-key": ignore the home shape and choose the best fingering for this key on its own. */
  perKey?: boolean;
}
export interface NeckResult {
  placed: Placed[];
  /** The index-finger fret of the position most notes sit in (0 = open position). */
  pos: number;
  /** 'same': the home shape moved exactly; 'near': a fingering close to it; 'own': chosen for this key alone. */
  shape: 'same' | 'near' | 'own';
}

/** The home shape moved by the transposition (same strings), or null when it leaves the neck. */
export function movedShape(pitches: number[], o: NeckOpts): Placed[] | null {
  const h = o.home;
  if (!h || h.pitches.length !== pitches.length || !pitches.length) return null;
  const delta = pitches[0] - h.pitches[0];
  const out: Placed[] = [];
  for (let i = 0; i < pitches.length; i++) {
    if (pitches[i] - h.pitches[i] !== delta) return null;
    const f = h.placed[i].fret + delta;
    if (f < 0 || f > o.maxFret) return null;
    if (f === 0 && h.placed[i].fret !== 0 && !o.allowOpen) return null;
    out.push({ string: h.placed[i].string, fret: f });
  }
  // the moved shape must still sit under one hand (the home key's own span, or the normal span when it had open strings)
  const fr = out.filter((p) => p.fret > 0).map((p) => p.fret);
  const homeFr = h.placed.filter((p) => p.fret > 0).map((p) => p.fret);
  const homeExt = homeFr.length ? Math.max(...homeFr) - Math.min(...homeFr) : 0;
  if (fr.length && Math.max(...fr) - Math.min(...fr) > Math.max(SPAN, homeExt)) return null;
  return out;
}

/** Shortest path over each note's (string, fret) choices (see the header). */
export function neckPath(pitches: number[], o: NeckOpts): Placed[] {
  if (!pitches.length) return [];
  const h = !o.perKey && o.home && o.home.pitches.length === pitches.length ? o.home : null;
  const delta = h ? pitches[0] - h.pitches[0] : 0;
  const cands = pitches.map((p) => {
    const all: Placed[] = [];
    for (let s = 0; s < o.open.length; s++) {
      const f = p - o.open[s];
      if (f >= 0 && f <= o.maxFret) all.push({ string: s + 1, fret: f });
    }
    const ok = all.filter((c) => c.fret > 0 || o.allowOpen);
    const use = ok.length ? ok : all;
    // a pitch the neck cannot reach (below the lowest string): the nearest fret on the lowest string
    return use.length ? use : [{ string: o.open.length, fret: Math.max(0, Math.min(o.maxFret, p - o.open[o.open.length - 1])) }];
  });
  const unary = (c: Placed, i: number) => {
    let x = Math.max(0, c.fret - 12) * 0.25 + c.fret * 0.01;
    if (c.fret === 0) x += o.allowOpen ? -0.05 : 3;
    if (h) {
      const hp = h.placed[i];
      if (c.string !== hp.string) x += 0.6;
      x += 0.15 * Math.abs(c.fret - (hp.fret + delta));
    }
    return x;
  };
  const pair = (a: Placed, b: Placed) => {
    let x = 0;
    if (a.fret > 0 && b.fret > 0) {
      const d = Math.abs(b.fret - a.fret);
      x += d <= SPAN ? 0.05 * d : 1 + 0.4 * (d - SPAN);
    } else x += 0.05;
    const ds = Math.abs(b.string - a.string);
    if (ds >= 2) x += 0.5 * (ds - 1);
    return x;
  };
  // Viterbi
  let cost = cands[0].map((c) => unary(c, 0));
  const back: number[][] = [cands[0].map(() => -1)];
  for (let i = 1; i < cands.length; i++) {
    const nc: number[] = [];
    const nb: number[] = [];
    for (const c of cands[i]) {
      let best = Infinity;
      let arg = 0;
      cands[i - 1].forEach((p, j) => {
        const v = cost[j] + pair(p, c);
        if (v < best - 1e-12) {
          best = v;
          arg = j;
        }
      });
      nc.push(best + unary(c, i));
      nb.push(arg);
    }
    cost = nc;
    back.push(nb);
  }
  let k = cost.indexOf(Math.min(...cost));
  const out: Placed[] = new Array(cands.length);
  for (let i = cands.length - 1; i >= 0; i--) {
    out[i] = cands[i][k];
    k = back[i][k];
  }
  return out;
}

/** Place a line on the neck for one key (see the header). */
export function neckPlace(pitches: number[], o: NeckOpts): NeckResult {
  const moved = o.perKey ? null : movedShape(pitches, o);
  const placed = moved ?? neckPath(pitches, o);
  return { placed, pos: positionOf(placed), shape: moved ? 'same' : o.home && !o.perKey ? 'near' : 'own' };
}

/** The index-finger fret of the segment (between shifts) that holds the most notes; 0 for an open-position line. */
export function positionOf(placed: Placed[]): number {
  const segs = segments(placed);
  if (!segs.length) return 0;
  const big = segs.reduce((a, b) => (b.n > a.n ? b : a));
  return big.lo;
}

interface Seg {
  lo: number;
  hi: number;
  n: number;
}
/** Consecutive fretted notes that fit one hand (extent ≤ the stretch span); a note that does not starts a new segment. */
function segments(placed: Placed[]): Seg[] {
  const out: Seg[] = [];
  let cur: Seg | null = null;
  for (const p of placed) {
    if (p.fret === 0) continue;
    if (cur && Math.max(cur.hi, p.fret) - Math.min(cur.lo, p.fret) <= SPAN_STRETCH) {
      cur.lo = Math.min(cur.lo, p.fret);
      cur.hi = Math.max(cur.hi, p.fret);
      cur.n++;
    } else {
      cur = { lo: p.fret, hi: p.fret, n: 1 };
      out.push(cur);
    }
  }
  return out;
}

export interface NeckStats {
  n: number;
  /** Position shifts (a note outside the hand's reach) and their total size in frets. */
  shifts: number;
  shiftFrets: number;
  /** Non-adjacent strings in succession. */
  skips: number;
  /** Frets reached beyond the 4-fret span (summed over the segments). */
  stretch: number;
  /** Share of fretted notes above the 12th fret. */
  high: number;
  /** Share of fretted notes in frets 1–3 (wide frets: costs a little on the bass). */
  low: number;
  open: number;
  pos: number;
}
export function neckStats(placed: Placed[]): NeckStats {
  const segs = segments(placed);
  let shiftFrets = 0;
  for (let i = 1; i < segs.length; i++) shiftFrets += Math.abs((segs[i].lo + segs[i].hi) / 2 - (segs[i - 1].lo + segs[i - 1].hi) / 2);
  let skips = 0;
  for (let i = 1; i < placed.length; i++) if (Math.abs(placed[i].string - placed[i - 1].string) >= 2) skips++;
  const fretted = placed.filter((p) => p.fret > 0);
  const nf = Math.max(1, fretted.length);
  return {
    n: placed.length,
    shifts: Math.max(0, segs.length - 1),
    shiftFrets: Math.round(shiftFrets * 10) / 10,
    skips,
    stretch: segs.reduce((a, s) => a + Math.max(0, s.hi - s.lo - SPAN), 0),
    high: fretted.filter((p) => p.fret > 12).length / nf,
    low: fretted.filter((p) => p.fret <= 3).length / nf,
    open: placed.length - fretted.length,
    pos: positionOf(placed),
  };
}

// ───────────────────────────── voice ─────────────────────────────

/** The octave shift (a multiple of 12) with the fewest semitones outside the range, then nearest the range's middle. */
export function voiceOctave(pitches: number[], r: Range): { shift: number; out: number; outSemis: number; fits: boolean } {
  if (!pitches.length) return { shift: 0, out: 0, outSemis: 0, fits: true };
  const mid = (r.low + r.high) / 2;
  const cen = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  let best = { shift: 0, out: 0, outSemis: Infinity, d: Infinity };
  for (let o = -4; o <= 4; o++) {
    const ps = pitches.map((p) => p + 12 * o);
    const outSemis = ps.reduce((a, p) => a + Math.max(0, r.low - p) + Math.max(0, p - r.high), 0);
    const out = ps.filter((p) => p < r.low || p > r.high).length;
    const d = Math.abs(cen + 12 * o - mid);
    if (outSemis < best.outSemis - 1e-9 || (Math.abs(outSemis - best.outSemis) < 1e-9 && d < best.d)) best = { shift: 12 * o, out, outSemis, d };
  }
  return { shift: best.shift, out: best.out, outSemis: best.outSemis, fits: best.out === 0 };
}

export interface VoiceStats {
  /** Mean distance from the middle of the range, as a share of half the range (0 centre … 1 the edges). */
  tess: number;
  /** Share of sung time in the top quarter of the range. */
  top: number;
  maxLeap: number;
  /** Leaps (> a major 3rd) per second at the tempo. */
  leapsPerSec: number;
  /** The longest stretch without a rest (≥ half a beat), in seconds at the tempo. */
  breath: number;
  /** Crossings of the register break (when the range carries one). */
  breaks: number;
  out: number;
}
/** Voice measures of a sung line (sounding pitches, beats) in the singer's range at a tempo. */
export function voiceStats(notes: { midi: number; beat: number; dur: number }[], r: Range & { brk?: number }, bpm: number): VoiceStats {
  const ns = [...notes].sort((a, b) => a.beat - b.beat);
  if (!ns.length) return { tess: 0, top: 0, maxLeap: 0, leapsPerSec: 0, breath: 0, breaks: 0, out: 0 };
  const mid = (r.low + r.high) / 2;
  const half = Math.max(1, (r.high - r.low) / 2);
  const tot = ns.reduce((a, n) => a + n.dur, 0) || 1;
  const tess = ns.reduce((a, n) => a + (Math.min(1.5, Math.abs(n.midi - mid) / half) * n.dur), 0) / tot;
  const q = r.high - (r.high - r.low) / 4;
  const top = ns.filter((n) => n.midi > q).reduce((a, n) => a + n.dur, 0) / tot;
  let maxLeap = 0;
  let leaps = 0;
  let breaks = 0;
  for (let i = 1; i < ns.length; i++) {
    const d = Math.abs(ns[i].midi - ns[i - 1].midi);
    maxLeap = Math.max(maxLeap, d);
    if (d > 4) leaps++;
    if (r.brk !== undefined && (ns[i].midi - r.brk) * (ns[i - 1].midi - r.brk) < 0) breaks++;
  }
  const beatS = 60 / Math.max(20, bpm);
  const span = (ns[ns.length - 1].beat + ns[ns.length - 1].dur - ns[0].beat) * beatS;
  let run = 0;
  let longest = ns[0].dur;
  let start = ns[0].beat;
  for (let i = 1; i < ns.length; i++) {
    const gap = ns[i].beat - (ns[i - 1].beat + ns[i - 1].dur);
    if (gap >= 0.5) start = ns[i].beat;
    run = ns[i].beat + ns[i].dur - start;
    longest = Math.max(longest, run);
  }
  return {
    tess: Math.round(tess * 1000) / 1000,
    top: Math.round(top * 1000) / 1000,
    maxLeap,
    leapsPerSec: span > 0 ? leaps / span : 0,
    breath: Math.round(longest * beatS * 100) / 100,
    breaks,
    out: ns.filter((n) => n.midi < r.low || n.midi > r.high).length,
  };
}

// ───────────────────────────── context (the course's instrument settings) ─────────────────────────────

/**
 * The singer's range and the instruments' tunings, as the open course has them. Encore's screens set this once per
 * render (settings.voiceRange, the bass tuning); the pure engine reads it where a call has no explicit range. The
 * default range is the vocal engine's conservative one (marked "estimated" on the badge until measured).
 */
export interface InstrumentCtx {
  range: Range | null;
  guitarTuning: string;
  bassTuning: string;
}
const DEFAULT_CTX: InstrumentCtx = { range: null, guitarTuning: 'standard', bassTuning: 'bass' };
let ctx: InstrumentCtx = { ...DEFAULT_CTX };
export function setInstrumentCtx(p: Partial<InstrumentCtx>): void {
  ctx = { ...ctx, ...p };
}
export const instrumentCtx = (): InstrumentCtx => ctx;
export const resetInstrumentCtx = () => void (ctx = { ...DEFAULT_CTX });
/** The singer's range for Encore: saved, else the vocal engine's default (G3–G4), widened to at least an octave. */
export function singerRange(r: Range | null | undefined = ctx.range): Range & { estimated: boolean } {
  if (r && r.high - r.low >= 7) return { low: r.low, high: r.high, estimated: false };
  return { low: 55, high: 67, estimated: true };
}
