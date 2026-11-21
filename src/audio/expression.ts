// Musical expression for what the app plays (owner 2026-11-21: "not everything at the same velocity, the same touch —
// mind the feeling and the articulation"). A pure pass over note events: phrases breathe (a swell to the high point,
// a taper at the end), the metre leans (beats 1 and 3 straight; the upbeats in swing), chords voice their top note and
// sit under the melody, a ballad rolls its chords and plays legato, swing quarters are short and a line's last upbeat
// pops; the bass leans on 1; the ride lets its skip notes fall back. Small seeded variation keeps two notes from ever
// being identical. Timing is untouched unless asked (a drill's model stays exactly on the grid).

import type { NoteEvent } from '../engine/lesson';

export type Feel = 'straight' | 'swing' | 'ballad';

export interface ExpressOpts {
  bpm: number;
  feel?: Feel;
  /** Human timing spread (ms, ±); 0 = on the grid (drill models). */
  timingMs?: number;
  /** Same input → same result. */
  seed?: number;
  /** How much shaping (0 none … 1 full; drills ~0.6, performances 1). */
  amount?: number;
}

const clamp = (v: number, lo = 0.12, hi = 1) => Math.max(lo, Math.min(hi, v));
/** A small seeded random (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shape note events with expression; returns new events (the input is not changed). */
export function express(events: NoteEvent[], o: ExpressOpts): NoteEvent[] {
  const feel = o.feel ?? 'straight';
  const amt = o.amount ?? 1;
  const spb = 60 / Math.max(30, o.bpm);
  const rnd = rng(o.seed ?? 7);
  const jit = (x: number) => (rnd() * 2 - 1) * x;
  const out = events.map((e) => ({ ...e }));
  const pitched = out.filter((e) => !e.perc && !e.fx);
  const bass = pitched.filter((e) => e.inst === 'bass');
  const keys = pitched.filter((e) => e.inst !== 'bass');

  // Chords: notes that start together (≤ 25 ms); the rest is the line.
  const byStart = new Map<number, NoteEvent[]>();
  for (const e of keys) {
    const k = Math.round(e.start / 0.025);
    const g = byStart.get(k) ?? byStart.get(k - 1) ?? byStart.get(k + 1);
    if (g) g.push(e);
    else byStart.set(k, [e]);
  }
  const chords: NoteEvent[][] = [];
  const line: NoteEvent[] = [];
  for (const g of byStart.values()) {
    if (g.length >= 3) chords.push(g);
    else if (g.length === 2) {
      // two at once: the higher is the line (a melody over a bass note), the lower a light support
      g.sort((a, b) => a.midi - b.midi);
      line.push(g[1]);
      g[0].velocity *= 1 - 0.12 * amt;
    } else line.push(g[0]);
  }
  line.sort((a, b) => a.start - b.start);

  // The line, phrase by phrase: a swell to its high point, a taper at its end.
  const phrases: NoteEvent[][] = [];
  for (const e of line) {
    const cur = phrases[phrases.length - 1];
    const prev = cur?.[cur.length - 1];
    if (!prev || e.start - (prev.start + prev.duration) > Math.max(0.6 * spb, 0.35) || e.start - prev.start > 2.2 * spb) phrases.push([e]);
    else cur.push(e);
  }
  for (const ph of phrases) {
    const lo = Math.min(...ph.map((e) => e.midi));
    const hi = Math.max(...ph.map((e) => e.midi));
    const peak = ph.reduce((best, e, i) => (e.midi > ph[best].midi ? i : best), 0);
    ph.forEach((e, i) => {
      const toPeak = ph.length > 1 ? 1 - Math.abs(i - peak) / Math.max(peak, ph.length - 1 - peak, 1) : 1;
      const contour = hi > lo ? (e.midi - lo) / (hi - lo) : 0.5;
      let v = e.velocity * (0.86 + 0.16 * toPeak + 0.08 * contour);
      // the metre: where the note falls in its beat
      const pos = e.start / spb;
      const frac = pos - Math.floor(pos);
      const beatInBar = Math.floor(pos + 1e-6) % 4;
      const onBeat = frac < 0.08 || frac > 0.92;
      if (feel === 'swing') {
        if (!onBeat && frac > 0.55) v *= 1.06; // the swung upbeat leans
        else if (onBeat) v *= 0.96;
      } else if (onBeat) v *= beatInBar === 0 ? 1.07 : beatInBar === 2 ? 1.03 : 0.99;
      else v *= 0.94;
      // the end of the phrase lets go
      if (i === ph.length - 1 && ph.length > 2) v *= 0.93;
      e.velocity = e.velocity + (v - e.velocity) * amt;
      // articulation
      const next = ph[i + 1];
      if (feel === 'ballad' && next) e.duration = Math.max(e.duration, (next.start - e.start) * 1.04); // legato
      if (feel === 'swing') {
        const len = e.duration / spb;
        if (len >= 0.85 && len <= 1.15) e.duration *= 1 - 0.3 * amt; // the short swing quarter ("dah")
        if (!onBeat && frac > 0.55 && (!next || next.start - (e.start + e.duration) > 0.4 * spb)) {
          e.duration *= 1 - 0.35 * amt; // the last upbeat of a line pops
          e.velocity *= 1 + 0.06 * amt;
        }
      }
    });
  }

  // Chords: under the line, the top voice sings, a ballad rolls them (bottom up).
  for (const g of chords) {
    g.sort((a, b) => a.midi - b.midi);
    g.forEach((e, i) => {
      const top = i === g.length - 1;
      e.velocity *= 1 - amt * (top ? 0.04 : 0.14);
      if (feel === 'ballad') e.start += i * 0.014 * amt;
    });
  }
  // The bass leans on the bar's downbeat; the rest even.
  for (const e of bass) {
    const pos = e.start / spb;
    const onOne = Math.abs(pos - Math.round(pos)) < 0.08 && Math.round(pos) % 4 === 0;
    e.velocity *= 1 + amt * (onOne ? 0.06 : -0.02);
  }
  // Drums: the ride's skip notes fall back, its 2 and 4 speak.
  for (const e of out) {
    if (!e.perc) continue;
    if (e.perc === 'ride') {
      const pos = e.start / spb;
      const frac = pos - Math.floor(pos);
      const beat = Math.floor(pos + 1e-6) % 4;
      if (frac > 0.4) e.velocity *= 1 - 0.25 * amt;
      else if (beat === 1 || beat === 3) e.velocity *= 1 + 0.08 * amt;
    }
  }
  // A little life in every note: velocity and (when asked) timing never quite repeat.
  for (const e of out) {
    if (e.fx) continue;
    e.velocity = clamp(e.velocity * (1 + jit(0.05 * amt)));
    if (o.timingMs) e.start = Math.max(0, e.start + jit(o.timingMs / 1000));
  }
  return out;
}
