// By ear and from the page, outside the ear families (docs/SPEC-EAR-AND-READING.md §3.1, §3.3):
// - a melody as a drill from the page (an imported lead sheet's tune);
// - any melody drill by ear: a phrase at a time — the phrase is heard (the call), then played back in the bars after
//   it; the notation stays hidden until the result (the phrases-by-ear mechanism: `listen` + `phrase`, show 'none');
// - hear and continue: the coach plays the first two segments of a pattern along the scale, the player continues it
//   by ear to the end (the opening segments are the call; the rest is graded).
// A take of a hidden-notation drill with a call is recorded as an ear take (drills/channel.ts defaultChannel).
// Pure; no music is composed here — the notes are the piece's own or the pattern's own.

import type { Drill, DrillSpec, ExpNote } from './drills/types';
import { itemIdOf } from './drills/generate';

type T2 = { en: string; he: string };
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

/** An imported tune (b = beat, d = length in beats, m = MIDI) as a melody drill from the page, over its chart's bars. */
export function melodyDrillOf(o: { id: string; title: T2; melody: { b: number; d: number; m: number }[]; chart?: string[]; bpm?: number; meter?: number }): Drill | null {
  const ns = [...o.melody].sort((a, b) => a.b - b.b);
  if (ns.length < 2) return null;
  const meter = o.meter ?? 4;
  const t0 = Math.floor(ns[0].b / meter) * meter;
  const spec: DrillSpec = { family: 'custom', kind: `mel-${o.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24)}`, key: 0, hands: 'R' } as DrillSpec;
  const notes: ExpNote[] = ns.map((n) => ({ pitch: n.m, beat: r6(n.b - t0), dur: r6(Math.max(0.25, n.d)), hand: 'R' }));
  const beats = Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur)) / meter) * meter;
  const firstBar = Math.floor(t0 / meter);
  const chart = o.chart?.length ? o.chart.slice(firstBar, firstBar + beats / meter) : undefined;
  return {
    spec,
    itemId: itemIdOf(spec),
    title: { en: `${o.title.en} · melody`, he: `${o.title.he} · מנגינה` },
    notes,
    beats,
    meter,
    keySig: 'C',
    goal: { evenness: false, hands: false },
    startBpm: Math.max(50, Math.min(100, Math.round((o.bpm ?? 90) * 0.7))),
    ...(chart?.length ? { chart } : {}),
  };
}

const EAR_ASK: T2 = { en: 'Hear the phrase — then play it back', he: 'שמעו את המשפט — ואז נגנו אותו בחזרה' };

/**
 * A melody drill by ear, a phrase at a time (SPEC-EAR-AND-READING §3.3): phrases of `bars` bars (cut at the bar lines;
 * empty ones skipped); each is a drill of its own — the count-in, the phrase heard, then played back in the same
 * number of bars after it, the notation hidden until the result. Its own item ids (…:ear:<i>).
 */
export function melodyByEar(d: Drill, bars = 2): Drill[] {
  const meter = d.meter ?? 4;
  const len = bars * meter;
  const out: Drill[] = [];
  for (let from = 0, i = 0; from < d.beats - 1e-6; from += len, i++) {
    const ph = d.notes.filter((n) => n.beat >= from - 1e-6 && n.beat < from + len - 1e-6);
    if (ph.length < 2) continue;
    const at = len;
    const listen = { notes: ph.map((n) => ({ beat: r6(n.beat - from), dur: r6(Math.min(n.dur, at - 0.5 - (n.beat - from))), midi: [n.pitch], inst: 'piano' as const, vel: 0.8 })), windows: [[0, at - 1]] as [number, number][], ask: EAR_ASK };
    const spec = { ...d.spec, kind: `${d.spec.kind}~ear${i}` } as DrillSpec;
    const chart = d.chart ? d.chart.slice(from / meter, from / meter + bars) : undefined;
    out.push({
      ...d,
      spec,
      itemId: itemIdOf(spec),
      title: { en: `${d.title.en} · by ear, phrase ${i + 1}`, he: `${d.title.he} · בשמיעה, משפט ${i + 1}` },
      notes: ph.map((n) => ({ ...n, beat: r6(at + n.beat - from) })),
      beats: at + len,
      ...(chart?.length ? { chart: [...chart, ...chart] } : {}),
      show: 'none',
      listen,
      phrase: { at, level: 1 },
    });
  }
  return out;
}

/**
 * The segment of a pattern along the scale (its period in notes): the smallest p (2–6) for which the right hand's up /
 * down steps repeat every p notes over the first three segments — 3rds 2, triads 3, 7th chords 4. Null without one.
 */
export function patternPeriod(d: Pick<Drill, 'notes'>): number | null {
  const rh = d.notes.filter((n) => n.hand !== 'L').sort((a, b) => a.beat - b.beat);
  const dir = rh.slice(1).map((n, i) => Math.sign(n.pitch - rh[i].pitch));
  for (let p = 2; p <= 6; p++) {
    if (dir.length < 3 * p) break;
    let ok = true;
    for (let i = 0; i + p < 3 * p - 1 && ok; i++) if (dir[i] !== dir[i + p]) ok = false;
    if (ok) return p;
  }
  return null;
}

const HC_ASK: T2 = { en: 'Hear how it starts — then continue the pattern to the end', he: 'שמעו איך זה מתחיל — והמשיכו את התבנית עד הסוף' };

/**
 * Hear and continue (SPEC-EAR-AND-READING §3.1): the first two segments of the pattern are the coach's (heard, not
 * graded); the player continues from the third segment to the end by ear, the notation hidden until the result. The
 * drill unchanged when it has no clear pattern.
 */
export function hearAndContinue(d: Drill): Drill {
  const p = patternPeriod(d);
  const rh = d.notes.filter((n) => n.hand !== 'L').sort((a, b) => a.beat - b.beat);
  if (!p || rh.length < 3 * p) return d;
  const cut = rh[2 * p].beat;
  const call = d.notes.filter((n) => n.beat < cut - 1e-6);
  return {
    ...d,
    title: { en: `By ear, continue: ${d.title.en}`, he: `בשמיעה, להמשיך: ${d.title.he}` },
    notes: d.notes.filter((n) => n.beat >= cut - 1e-6),
    show: 'none',
    listen: { notes: call.map((n) => ({ beat: n.beat, dur: n.dur, midi: [n.pitch], inst: 'piano' as const, vel: 0.8 })), windows: [[0, Math.max(0.5, cut - 0.25)]], ask: HC_ASK },
  };
}
