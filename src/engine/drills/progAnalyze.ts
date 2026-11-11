// Prog measures on top of any take analysis (docs/research/PROG_ENGINE.md §2–§5): where each played note sits in its
// bar (mixed meters), the tempo-ratio check of a metric modulation, the lock to the band's unison line, the accent
// on group starts and the road-map report. `withProg` adds them to a TakeMetrics and can only lower its verdict; a
// drill without a timeline, a unison part, a form or goal.prog comes back unchanged. Pure.

import type { Drill, PlayedNote, TakeMetrics, Verdict } from './types';
import { hasTimeline, timeMapOf } from './timeline';
import { unisonLine } from './bandTimeline';
import { analyzeForm, type FormReport } from './roadmap';

export interface NotePosition {
  /** Index into drill.notes. */
  i: number;
  bar: number;
  /** Beat inside the bar (drill beats), the group it belongs to and the beat inside that group. */
  inBar: number;
  group: number;
  inGroup: number;
  /** Timing offset (ms, + = late) or null when not played. */
  dev: number | null;
}

export interface TempoCheck {
  /** Bar of the change and the written ratio. */
  bar: number;
  want: number;
  /** Played ratio (tempo after ÷ tempo before) and its error as a share (played ÷ want − 1). Null when not measurable. */
  got: number | null;
  err: number | null;
  /** |offset| of the note on the new 1 (ms), null = nothing played there. */
  land: number | null;
}

export interface ProgMetrics {
  positions?: NotePosition[];
  tempo?: TempoCheck[];
  /** Against the band's unison line: mean / SD offset (ms, + = behind the band) and how many notes paired. */
  unison?: { mean: number; sd: number; n: number } | null;
  /** Group-start notes' mean velocity minus the others', as a share of the velocity range (null without loudness). */
  groupAccent?: number | null;
  form?: FormReport;
}

/** Where every expected note sits on the timeline (bar, beat in bar, group) with its measured offset. */
export function notePositions(drill: Drill, bpm: number, m: Pick<TakeMetrics, 'perNote'>): NotePosition[] {
  const tm = timeMapOf(drill, bpm);
  return drill.notes.map((n, i) => {
    const p = tm.position(n.beat);
    return { i, ...p, dev: m.perNote[i]?.dev ?? null };
  });
}

const med = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/**
 * Metric modulation: for each tempo change, the played tempo just before (up to 2 bars) and just after (up to 2 bars),
 * each the median of written ÷ played IOI ratios of consecutive played notes (so rhythm doesn't matter), and the
 * played ratio against the written one. `played` per expected note (perNote order).
 */
export function tempoChecks(drill: Drill, bpm: number, m: Pick<TakeMetrics, 'perNote'>): TempoCheck[] {
  if (!drill.tempoMap?.length) return [];
  const tm = timeMapOf(drill, bpm);
  const pts = drill.notes.map((n, i) => ({ beat: n.beat, on: m.perNote[i]?.played?.on ?? null, dev: m.perNote[i]?.dev ?? null })).filter((x) => x.on !== null).sort((a, b) => a.beat - b.beat) as { beat: number; on: number; dev: number | null }[];
  // Played beat length (ms per drill beat) over [from, to) beats.
  const beatLen = (from: number, to: number): number | null => {
    const w = pts.filter((p) => p.beat >= from - 1e-9 && p.beat < to - 1e-9);
    const rs: number[] = [];
    for (let k = 1; k < w.length; k++) {
      const db = w[k].beat - w[k - 1].beat;
      if (db > 1e-6) rs.push((w[k].on - w[k - 1].on) / db);
    }
    return rs.length >= 2 ? med(rs) : null;
  };
  return [...drill.tempoMap]
    .sort((a, b) => a.bar - b.bar)
    .map((c) => {
      const bar = tm.bars[c.bar];
      if (!bar) return { bar: c.bar, want: c.ratio, got: null, err: null, land: null };
      const before = tm.bars.slice(Math.max(0, c.bar - 2), c.bar);
      const after = tm.bars.slice(c.bar, c.bar + 2);
      const a = before.length ? beatLen(before[0].start, bar.start) : null;
      const b = after.length ? beatLen(bar.start, after[after.length - 1].start + after[after.length - 1].beats) : null;
      const got = a && b ? a / b : null;
      const one = pts.find((p) => Math.abs(p.beat - bar.start) < 1e-6);
      return { bar: c.bar, want: c.ratio, got, err: got === null ? null : got / c.ratio - 1, land: one && one.dev !== null ? Math.abs(one.dev) : null };
    });
}

/** Lock to the band's unison line: each played onset paired with the nearest unison note within a quarter of its beat. */
export function unisonLock(drill: Drill, bpm: number, played: Pick<PlayedNote, 'on'>[]): { mean: number; sd: number; n: number } | null {
  const line = unisonLine(drill);
  if (!line.length) return null;
  const tm = timeMapOf(drill, bpm);
  const T = line.map((u) => tm.msAt(u.beat));
  const offs: number[] = [];
  const used = new Set<number>();
  for (const p of [...played].sort((a, b) => a.on - b.on)) {
    let best = -1;
    let bd = Infinity;
    T.forEach((t, k) => {
      const d = Math.abs(p.on - t);
      const lim = (0.25 * 60000) / tm.bpmAt(line[k].beat);
      if (!used.has(k) && d <= lim && d < bd) {
        bd = d;
        best = k;
      }
    });
    if (best >= 0) {
      used.add(best);
      offs.push(p.on - T[best]);
    }
  }
  if (offs.length < 3) return null;
  const mean = offs.reduce((a, b) => a + b, 0) / offs.length;
  return { mean, sd: Math.sqrt(offs.reduce((a, b) => a + (b - mean) ** 2, 0) / offs.length), n: offs.length };
}

/** Accent on group starts: mean velocity of group-start notes minus the others, as a share of the take's velocity range. */
export function groupAccent(drill: Drill, bpm: number, m: Pick<TakeMetrics, 'perNote'>): number | null {
  const tm = timeMapOf(drill, bpm);
  const on: number[] = [];
  const off: number[] = [];
  drill.notes.forEach((n, i) => {
    const p = m.perNote[i]?.played;
    if (!p) return;
    const pos = tm.position(n.beat);
    (Math.abs(pos.inGroup) < 1e-6 ? on : off).push(p.vel);
  });
  const all = [...on, ...off];
  if (on.length < 2 || off.length < 2 || new Set(all).size < 2) return null;
  const range = Math.max(...all) - Math.min(...all);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return range > 0 ? (avg(on) - avg(off)) / range : null;
}

const RANK: Record<Verdict, number> = { clean: 0, almost: 1, not: 2 };
/** `cause`: the root cause (a lost bar makes every later note wrong): its line is the "Why?" whatever the base said. */
type Factor = { verdict: Verdict; en: string; he: string; cause?: boolean };

/** Does a drill need the prog measures? */
export const needsProg = (drill: Drill): boolean => hasTimeline(drill) || !!drill.unison || !!drill.form || !!drill.goal.prog;

/**
 * Add the prog measures to a take's metrics and lower the verdict where goal.prog asks (each factor can only make it
 * worse; the worst factor's line becomes the "Why?" line when it lowers the verdict). Unchanged for other drills.
 */
export function withProg<M extends TakeMetrics>(m: M, drill: Drill, bpm: number, played: Pick<PlayedNote, 'pitch' | 'on' | 'vel'>[]): M {
  if (!needsProg(drill)) return m;
  const g = drill.goal.prog ?? {};
  const prog: ProgMetrics = {};
  const factors: Factor[] = [];
  if (hasTimeline(drill)) prog.positions = notePositions(drill, bpm, m);
  if (drill.tempoMap?.length) {
    prog.tempo = tempoChecks(drill, bpm, m);
    if (g.tempoRatio)
      for (const t of prog.tempo) {
        if (t.err === null) factors.push({ verdict: 'almost', en: `The tempo change at bar ${t.bar + 1} could not be measured — keep playing through it`, he: `שינוי הטמפו בתיבה ${t.bar + 1} לא נמדד — להמשיך לנגן דרכו` });
        else if (Math.abs(t.err) > g.tempoRatio.tol)
          factors.push({ verdict: Math.abs(t.err) > 2 * g.tempoRatio.tol ? 'not' : 'almost', en: `New tempo at bar ${t.bar + 1} ${Math.round(Math.abs(t.err) * 1000) / 10}% ${t.err > 0 ? 'too fast' : 'too slow'} (±${Math.round(g.tempoRatio.tol * 100)}%)`, he: `הטמפו החדש בתיבה ${t.bar + 1} ${t.err > 0 ? 'מהיר' : 'איטי'} מדי ב-${Math.round(Math.abs(t.err) * 1000) / 10}% (±${Math.round(g.tempoRatio.tol * 100)}%)` });
        if (g.tempoRatio.landMs && t.land !== null && t.land > g.tempoRatio.landMs)
          factors.push({ verdict: t.land > 2 * g.tempoRatio.landMs ? 'not' : 'almost', en: `The new 1 at bar ${t.bar + 1} off by ${Math.round(t.land)} ms`, he: `ה-1 החדש בתיבה ${t.bar + 1} זז ב-${Math.round(t.land)} ms` });
      }
  }
  if (drill.unison) {
    prog.unison = unisonLock(drill, bpm, played);
    const u = g.unison;
    if (u && prog.unison && (Math.abs(prog.unison.mean) > u.mean || prog.unison.sd > u.sd)) {
      const meanBad = Math.abs(prog.unison.mean) > u.mean;
      factors.push({
        verdict: (meanBad ? Math.abs(prog.unison.mean) > 2 * u.mean : prog.unison.sd > 2 * u.sd) ? 'not' : 'almost',
        en: meanBad ? `${Math.round(Math.abs(prog.unison.mean))} ms ${prog.unison.mean > 0 ? 'behind' : 'ahead of'} the band's line (±${u.mean})` : `Unison not tight: ±${Math.round(prog.unison.sd)} ms against the band (${u.sd} allowed)`,
        he: meanBad ? `${Math.round(Math.abs(prog.unison.mean))} ms ${prog.unison.mean > 0 ? 'אחרי' : 'לפני'} הקו של הלהקה (±${u.mean})` : `האוניסון לא צמוד: ±${Math.round(prog.unison.sd)} ms מול הלהקה (מותר ${u.sd})`,
      });
    }
  }
  if (g.groupAccent !== undefined) {
    prog.groupAccent = groupAccent(drill, bpm, m);
    if (prog.groupAccent !== null && prog.groupAccent < g.groupAccent)
      factors.push({ verdict: prog.groupAccent < g.groupAccent / 2 ? 'not' : 'almost', en: `Accent the group starts more (${Math.round(prog.groupAccent * 100)}% louder, ${Math.round(g.groupAccent * 100)}% needed)`, he: `להדגיש יותר את תחילת הקבוצות (${Math.round(prog.groupAccent * 100)}% חזק יותר, צריך ${Math.round(g.groupAccent * 100)}%)` });
  }
  if (drill.form) {
    const f = g.form ?? {};
    prog.form = analyzeForm(drill, bpm, played, { landingMs: f.landMs });
    const lostN = prog.form.lost.reduce((a, l) => a + Math.abs(l.shift), 0);
    if (lostN > (f.lost ?? 0)) {
      const l = prog.form.lost[0];
      factors.push({ verdict: 'not', cause: true, en: `Lost ${lostN} bar${lostN === 1 ? '' : 's'} in the form — first in ${l.section || `bar ${l.bar + 1}`} (${l.shift > 0 ? 'a bar too many' : 'a bar skipped'})`, he: `${lostN} תיבות אבדו בצורה — הראשונה ב${l.section || `תיבה ${l.bar + 1}`} (${l.shift > 0 ? 'תיבה מיותרת' : 'תיבה שדולגה'})` });
    }
    if (f.landMs && prog.form.landings.of && prog.form.landings.ok < prog.form.landings.of) {
      const miss = prog.form.landings.of - prog.form.landings.ok;
      factors.push({ verdict: miss > prog.form.landings.of / 2 ? 'not' : 'almost', en: `Landed ${prog.form.landings.ok} of ${prog.form.landings.of} section starts (±${f.landMs} ms)`, he: `נחיתה על ${prog.form.landings.ok} מתוך ${prog.form.landings.of} פתיחות קטעים (±${f.landMs} ms)` });
    }
    if (f.drift && prog.form.drift !== null && prog.form.drift > f.drift) {
      const worst = prog.form.sections.filter((s) => s.tempo !== null).sort((a, b) => Math.abs(b.tempo! - 1) - Math.abs(a.tempo! - 1))[0];
      factors.push({ verdict: prog.form.drift > 2 * f.drift ? 'not' : 'almost', en: `${worst.tempo! > 1 ? 'Rushed' : 'Dragged'} ${Math.round(prog.form.drift * 1000) / 10}% in the ${worst.name} (${Math.round(f.drift * 100)}% allowed)`, he: `${worst.tempo! > 1 ? 'האצה' : 'האטה'} של ${Math.round(prog.form.drift * 1000) / 10}% ב${worst.name} (מותר ${Math.round(f.drift * 100)}%)` });
    }
  }
  const out: M = { ...m, prog };
  const worst = factors.sort((a, b) => RANK[b.verdict] - RANK[a.verdict] || Number(!!b.cause) - Number(!!a.cause))[0];
  if (worst && (RANK[worst.verdict] > RANK[m.verdict] || (worst.cause && RANK[worst.verdict] >= RANK[m.verdict]))) {
    out.verdict = RANK[worst.verdict] > RANK[m.verdict] ? worst.verdict : m.verdict;
    out.why = { en: worst.en, he: worst.he };
  }
  return out;
}
