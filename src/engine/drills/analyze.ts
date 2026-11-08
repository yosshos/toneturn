// Technique drills: one take → metrics + verdict (spec AI §6, research §5.2). Pure.
// Thresholds are the research's starting numbers (⚙, not yet calibrated with the owner's playing).

import type { Drill, DrillCalibration, DynamicsGoal, ExpNote, Hand, NoteResult, PlayedNote, TakeMetrics, Verdict } from './types';
import { vlDistance } from './generate';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const EPS = 1e-6;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}
const r1 = (x: number): number => Math.round(x * 10) / 10;

// ───────────────────────────── tempo bands ─────────────────────────────

/** Median written inter-onset interval (beats) of the busiest hand. */
export function notesPerBeat(drill: Drill): number {
  const by: Record<Hand, number[]> = { R: [], L: [] };
  for (const n of drill.notes) by[n.hand].push(n.beat);
  const hand = by.R.length >= by.L.length ? by.R : by.L;
  const onsets = [...new Set(hand.map((b) => Math.round(b * 1e4) / 1e4))].sort((a, b) => a - b);
  const iois = onsets.slice(1).map((b, i) => b - onsets[i]);
  const m = median(iois);
  return m > 0 ? 1 / m : 1;
}
/** Notes per second of a drill at a tempo. */
export function npsOf(drill: Drill, bpm: number): number {
  return (bpm / 60) * notesPerBeat(drill);
}
/** Tempo band T1–T7 (spec §4): 2.7 / 3.5 / 4.5 / 5.5 / 6.5 / 8 notes/s borders. */
export function tempoBand(nps: number): number {
  const borders = [2.7, 3.5, 4.5, 5.5, 6.5, 8];
  let b = 1;
  for (const x of borders) if (nps >= x) b++;
  return b;
}
export function bandOfBpm(drill: Drill, bpm: number): number {
  return tempoBand(npsOf(drill, bpm));
}

/** Level thresholds per band group (spec §6): T1–T2 / T3–T4 / T5+. */
export function thresholds(band: number): {
  cv: number;
  sd: number;
  hands: number;
  vsd: number;
} {
  if (band <= 2) return { cv: 0.05, sd: 30, hands: 30, vsd: 12 };
  if (band <= 4) return { cv: 0.04, sd: 25, hands: 25, vsd: 10 };
  return { cv: 0.03, sd: 20, hands: 20, vsd: 8 };
}

// ───────────────────────────── velocity bands ─────────────────────────────

type Level = 'pp' | 'p' | 'mf' | 'f' | 'ff';
/** Uncalibrated defaults around the notation-software velocities (pp 33 … ff 112). */
const DEFAULT_BANDS: Record<Level, [number, number]> = {
  pp: [18, 46],
  p: [34, 64],
  mf: [64, 96],
  f: [84, 112],
  ff: [100, 127],
};
/** Calibrated bands as shares of the player's [velMin, velMax] (research §5.3, widened ±5 %). */
const PCT_BANDS: Record<Level, [number, number]> = {
  pp: [0.03, 0.25],
  p: [0.15, 0.4],
  mf: [0.45, 0.7],
  f: [0.6, 0.85],
  ff: [0.75, 0.97],
};

export function velocityBand(level: Level, cal?: DrillCalibration): [number, number] {
  if (!cal || !(cal.velMax > cal.velMin)) return DEFAULT_BANDS[level];
  const [a, b] = PCT_BANDS[level];
  const span = cal.velMax - cal.velMin;
  return [Math.round(cal.velMin + a * span), Math.round(cal.velMin + b * span)];
}
const levelOf = (d?: DynamicsGoal): Level | null => (d && d.startsWith('even-') ? (d.slice(5) as Level) : null);

// ───────────────────────────── timing ─────────────────────────────

/** Expected onset of a beat in ms (swung 8ths land at 2/3 of the beat). */
export function expTimeMs(drill: Drill, beat: number, bpm: number): number {
  const beatMs = 60000 / bpm;
  if (drill.spec.swing) {
    const f = beat - Math.floor(beat);
    if (Math.abs(f - 0.5) < EPS) return (Math.floor(beat) + 2 / 3) * beatMs;
  }
  return beat * beatMs;
}

// ───────────────────────────── alignment ─────────────────────────────

interface Align {
  /** Played index per expected note. */
  match: (number | null)[];
  /** Set-mode chords: is this expected note satisfied? */
  ok: boolean[];
  wrong: number;
  /** Played notes inside the take window. */
  valid: number[];
}

function align(drill: Drill, bpm: number, played: PlayedNote[]): Align {
  const exp = drill.notes;
  const beatMs = 60000 / bpm;
  const T = exp.map((n) => expTimeMs(drill, n.beat, bpm));
  const valid = played.map((_, j) => j).filter((j) => played[j].on >= -beatMs && played[j].on <= (drill.beats + 1) * beatMs);
  const match: (number | null)[] = exp.map(() => null);
  const ok: boolean[] = exp.map(() => false);
  const used = new Set<number>();
  let wrong = 0;

  // 1) Chord-set mode (voicings, cadences): any voicing of the allowed pitch classes.
  const sets = new Map((drill.goal.chordSets ?? []).map((c) => [c.chordId, c]));
  const groups = new Map<number, number[]>();
  exp.forEach((n, i) => {
    if (n.chordId !== undefined && sets.has(n.chordId)) {
      const g = groups.get(n.chordId) ?? [];
      g.push(i);
      groups.set(n.chordId, g);
    }
  });
  const chordList = [...groups.entries()].map(([id, idx]) => ({ id, idx, t: T[idx[0]] })).sort((a, b) => a.t - b.t);
  chordList.forEach((c, ci) => {
    const prevT = ci > 0 ? chordList[ci - 1].t : -Infinity;
    const nextT = ci < chordList.length - 1 ? chordList[ci + 1].t : Infinity;
    const w = Math.min(beatMs / 2, (c.t - prevT) / 2, (nextT - c.t) / 2);
    const set = sets.get(c.id)!;
    const allowed = new Set(set.allowed);
    const required = new Set(set.required);
    const members = valid.filter((j) => !used.has(j) && Math.abs(played[j].on - c.t) <= w);
    const pcs = new Set(members.map((j) => mod12(played[j].pitch)));
    let bad = 0;
    for (const j of members) {
      used.add(j);
      if (!allowed.has(mod12(played[j].pitch))) bad++;
    }
    wrong += bad;
    const correct = bad === 0 && [...required].every((p) => pcs.has(p));
    const taken = new Set<number>();
    for (const i of c.idx) {
      const e = exp[i];
      let j = members.find((m) => !taken.has(m) && played[m].pitch === e.pitch);
      if (j === undefined) j = members.find((m) => !taken.has(m) && mod12(played[m].pitch) === mod12(e.pitch));
      if (j !== undefined) {
        taken.add(j);
        match[i] = j;
      }
      ok[i] = correct && (match[i] !== null || !required.has(mod12(e.pitch)));
    }
  });

  // 2) Pitch mode: global greedy by |deviation| within ±½ beat.
  const pairs: [number, number, number][] = [];
  exp.forEach((e, i) => {
    if (e.chordId !== undefined && sets.has(e.chordId)) return;
    for (const j of valid)
      if (!used.has(j) && played[j].pitch === e.pitch && Math.abs(played[j].on - T[i]) <= beatMs / 2 + EPS) pairs.push([Math.abs(played[j].on - T[i]), i, j]);
  });
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const takenJ = new Set<number>();
  for (const [, i, j] of pairs) {
    if (match[i] !== null || takenJ.has(j)) continue;
    match[i] = j;
    ok[i] = true;
    takenJ.add(j);
  }
  // A unison shared by both hands (contrary motion start) is one key press.
  exp.forEach((e, i) => {
    if (match[i] !== null || (e.chordId !== undefined && sets.has(e.chordId))) return;
    const twin = exp.findIndex((o, k) => k !== i && match[k] !== null && o.pitch === e.pitch && Math.abs(o.beat - e.beat) < EPS);
    if (twin >= 0) {
      match[i] = match[twin];
      ok[i] = true;
    }
  });
  for (const j of valid) if (!used.has(j) && !takenJ.has(j)) wrong++;
  return { match, ok, wrong, valid };
}

// ───────────────────────────── per-hand onset series ─────────────────────────────

interface Onset {
  beat: number;
  t: number;
  on: number | null;
  idx: number[];
}
function onsetsOf(drill: Drill, bpm: number, hand: Hand, match: (number | null)[], played: PlayedNote[]): Onset[] {
  const map = new Map<number, Onset>();
  drill.notes.forEach((n, i) => {
    if (n.hand !== hand) return;
    const key = Math.round(n.beat * 1e4);
    let o = map.get(key);
    if (!o) {
      o = { beat: n.beat, t: expTimeMs(drill, n.beat, bpm), on: null, idx: [] };
      map.set(key, o);
    }
    o.idx.push(i);
    const j = match[i];
    if (j !== null) o.on = o.on === null ? played[j].on : Math.min(o.on, played[j].on);
  });
  return [...map.values()].sort((a, b) => a.beat - b.beat);
}

// ───────────────────────────── the analysis ─────────────────────────────

interface Factor {
  sev: number;
  en: string;
  he: string;
}

/** Measure one take against a drill and give the verdict with the worst factor. */
export function analyzeTake(drill: Drill, bpm: number, played0: PlayedNote[], cal?: DrillCalibration): TakeMetrics {
  // Improv mode: the right hand above the split plays freely and is checked elsewhere (against the chord-scales).
  const played = drill.freeAbove !== undefined ? played0.filter((p) => p.pitch < drill.freeAbove!) : played0;
  const exp = drill.notes;
  const goal = drill.goal;
  const beatMs = 60000 / bpm;
  const { match, ok, wrong } = align(drill, bpm, played);
  const T = exp.map((n) => expTimeMs(drill, n.beat, bpm));
  const nExp = exp.length;
  const okCount = ok.filter(Boolean).length;
  const accuracy = nExp ? okCount / nExp : 1;
  const missing = nExp - okCount;
  const dev = exp.map((_, i) => (match[i] !== null ? played[match[i]!].on - T[i] : null));
  const devs = dev.filter((d): d is number => d !== null);
  const timingMean = devs.length ? mean(devs) : null;
  const timingSD = devs.length >= 3 ? sd(devs) : null;

  // Evenness: IOI ratio (played ÷ written) per hand, CV of the ratios.
  const ioiRatio: (number | undefined)[] = exp.map(() => undefined);
  const glitches: number[] = [];
  let hesitations = 0;
  const cv: Record<Hand, number | null> = { R: null, L: null };
  const series: Record<Hand, Onset[]> = {
    R: onsetsOf(drill, bpm, 'R', match, played),
    L: onsetsOf(drill, bpm, 'L', match, played),
  };
  for (const h of ['R', 'L'] as Hand[]) {
    const os = series[h];
    const rs: { r: number; o: Onset; prev: Onset }[] = [];
    for (let k = 1; k < os.length; k++) {
      const a = os[k - 1];
      const b = os[k];
      if (a.on === null || b.on === null || b.t - a.t <= 0) continue;
      rs.push({ r: (b.on - a.on) / (b.t - a.t), o: b, prev: a });
    }
    if (rs.length < 2) continue;
    const med = median(rs.map((x) => x.r));
    const fingered = os.some((o) => o.idx.some((i) => exp[i].finger !== undefined));
    for (const x of rs) {
      const rel = med > 0 ? x.r / med : 1;
      for (const i of x.o.idx) ioiRatio[i] = rel;
      if (rel > 1.5) hesitations++;
      if (goal.evenness && rel > 1.15) {
        const thumb = !fingered || x.o.idx.some((i) => exp[i].finger === 1) || x.prev.idx.some((i) => exp[i].finger === 1);
        if (thumb) glitches.push(x.o.idx[0]);
      }
    }
    if (goal.evenness) {
      const vals = rs.map((x) => x.r);
      cv[h] = sd(vals) / mean(vals);
    }
  }

  // Hands together: Δ = RH − LH at shared onsets.
  let handsMean: number | null = null;
  let handsAbs: number | null = null;
  {
    const lmap = new Map(series.L.map((o) => [Math.round(o.beat * 1e4), o]));
    const ds: number[] = [];
    for (const o of series.R) {
      const l = lmap.get(Math.round(o.beat * 1e4));
      if (l && o.on !== null && l.on !== null) ds.push(o.on - l.on);
    }
    if (ds.length) {
      handsMean = mean(ds);
      handsAbs = mean(ds.map(Math.abs));
    }
  }

  // Chord spread within one hand.
  let chordSpread: number | null = null;
  {
    const g = new Map<string, number[]>();
    exp.forEach((n, i) => {
      if (n.chordId === undefined || match[i] === null) return;
      const k = `${n.chordId}:${n.hand}`;
      const a = g.get(k) ?? [];
      a.push(played[match[i]!].on);
      g.set(k, a);
    });
    for (const ons of g.values()) if (ons.length >= 2) chordSpread = Math.max(chordSpread ?? 0, Math.max(...ons) - Math.min(...ons));
  }

  // Velocities (each played note once).
  const seen = new Set<number>();
  const vel: { v: number; accent: boolean; i: number }[] = [];
  exp.forEach((n, i) => {
    const j = match[i];
    if (j === null || seen.has(j)) return;
    seen.add(j);
    vel.push({ v: played[j].vel, accent: !!n.accent, i });
  });
  const velMean = vel.length ? mean(vel.map((x) => x.v)) : null;
  const plain = vel.filter((x) => !x.accent).map((x) => x.v);
  const shaped = goal.dynamics === 'cresc' || goal.dynamics === 'voicing';
  const velSD = plain.length >= 3 && !shaped ? sd(plain) : null;
  const lvl = levelOf(goal.dynamics);
  let bandHit: number | null = null;
  if (lvl && vel.length) {
    const [lo, hi] = velocityBand(lvl, cal);
    bandHit = vel.filter((x) => x.v >= lo && x.v <= hi).length / vel.length;
  }
  let slope: number | null = null;
  let r2: number | null = null;
  let crescRange = 0;
  if (goal.dynamics === 'cresc') {
    const hand: Hand = exp.some((n) => n.hand === 'R') ? 'R' : 'L';
    const os = series[hand];
    let peak = 0;
    os.forEach((o, k) => {
      if (exp[o.idx[0]].pitch > exp[os[peak].idx[0]].pitch) peak = k;
    });
    const pts: [number, number][] = [];
    os.forEach((o, k) => {
      const j = match[o.idx[0]];
      if (j !== null) pts.push([k <= peak ? k : 2 * peak - k, played[j].vel]);
    });
    if (pts.length >= 3) {
      const mx = mean(pts.map((p) => p[0]));
      const my = mean(pts.map((p) => p[1]));
      const sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
      const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
      const syy = pts.reduce((a, p) => a + (p[1] - my) ** 2, 0);
      slope = sxx > 0 ? sxy / sxx : 0;
      r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
      const xs = pts.map((p) => p[0]);
      crescRange = slope * (Math.max(...xs) - Math.min(...xs));
    }
  }
  let accentGap: number | null = null;
  {
    const a = vel.filter((x) => x.accent).map((x) => x.v);
    if (a.length && plain.length) accentGap = mean(a) - mean(plain);
  }

  // Articulation: key overlap (legato) and duration ratio (staccato / portato).
  let kot: number | null = null;
  let kdr: number | null = null;
  if (goal.articulation) {
    const kots: number[] = [];
    const kdrs: number[] = [];
    for (const h of ['R', 'L'] as Hand[]) {
      const os = series[h].filter((o) => o.idx.length === 1);
      for (let k = 1; k < os.length; k++) {
        const ja = match[os[k - 1].idx[0]];
        const jb = match[os[k].idx[0]];
        if (ja === null || jb === null) continue;
        const a = played[ja];
        const b = played[jb];
        if (a.off === null || b.on <= a.on) continue;
        kots.push(a.off - b.on);
        kdrs.push((a.off - a.on) / (b.on - a.on));
      }
    }
    if (kots.length) {
      kot = median(kots);
      kdr = median(kdrs);
    }
  }

  // Chord tones on the beats (harmony of a bar = the chord-tone pitch classes written in that bar).
  let chordToneOnBeats: number | null = null;
  let ctMiss = 0;
  if (goal.chordTonesOnBeats) {
    const meter = drill.meter || 4;
    const barSet = new Map<number, Set<number>>();
    for (const n of exp)
      if (n.chordTone) {
        const b = Math.floor(n.beat / meter + EPS);
        const s = barSet.get(b) ?? new Set<number>();
        s.add(mod12(n.pitch));
        barSet.set(b, s);
      }
    const req = new Map<string, ExpNote>();
    for (const n of exp) if (n.chordTone && Math.abs(n.beat - Math.round(n.beat)) < EPS) req.set(`${Math.round(n.beat)}:${n.hand}`, n);
    let hit = 0;
    for (const n of req.values()) {
      const tt = expTimeMs(drill, n.beat, bpm);
      const cands = played.filter((p) => Math.abs(p.on - tt) <= beatMs / 4);
      if (!cands.length) continue;
      const best = cands.reduce((a, b) => (Math.abs(b.pitch - n.pitch) < Math.abs(a.pitch - n.pitch) ? b : a));
      if (barSet.get(Math.floor(n.beat / meter + EPS))?.has(mod12(best.pitch))) hit++;
    }
    if (req.size) {
      chordToneOnBeats = hit / req.size;
      ctMiss = req.size - hit;
    }
  }

  // Voice leading between successive chords (the hand that carries the voicing).
  let voiceLeading: number | null = null;
  let expVL = 0;
  if (goal.chordSets?.length) {
    const cnt: Record<Hand, number> = { R: 0, L: 0 };
    for (const n of exp) if (n.chordId !== undefined) cnt[n.hand]++;
    const vh: Hand = cnt.R >= cnt.L ? 'R' : 'L';
    const ids = [...new Set(exp.filter((n) => n.chordId !== undefined).map((n) => n.chordId!))];
    const byId = ids.map((id) => exp.map((n, i) => ({ n, i })).filter((x) => x.n.chordId === id && x.n.hand === vh));
    const playedV = byId.map((g) => g.filter((x) => match[x.i] !== null).map((x) => played[match[x.i]!].pitch));
    const expV = byId.map((g) => g.map((x) => x.n.pitch));
    const d: number[] = [];
    const de: number[] = [];
    for (let k = 1; k < byId.length; k++) {
      de.push(vlDistance(expV[k - 1], expV[k]));
      if (playedV[k - 1].length && playedV[k].length) d.push(vlDistance(playedV[k - 1], playedV[k]));
    }
    if (d.length) voiceLeading = mean(d);
    if (de.length) expVL = mean(de);
  }

  // Tempo band and thresholds.
  const nps = npsOf(drill, bpm);
  const th = thresholds(tempoBand(nps));

  // Factors (severity > 1 = misses the goal; ≤ 1.5 = almost).
  const F: Factor[] = [];
  const pct = (x: number) => r1(x * 100);
  if (wrong > 0 || missing > 0) {
    const sev = 1 + ((wrong + missing) / Math.max(1, nExp)) * 20;
    F.push({
      sev,
      en: `${wrong} wrong, ${missing} missing`,
      he: `${wrong} שגויים, ${missing} חסרים`,
    });
  }
  if (goal.evenness) {
    if (cv.R !== null)
      F.push({
        sev: cv.R / th.cv,
        en: `RH uneven (${pct(cv.R)} %)`,
        he: `יד ימין לא אחידה (${pct(cv.R)}%)`,
      });
    if (cv.L !== null)
      F.push({
        sev: cv.L / th.cv,
        en: `LH uneven (${pct(cv.L)} %)`,
        he: `יד שמאל לא אחידה (${pct(cv.L)}%)`,
      });
    if (glitches.length >= 2)
      F.push({
        sev: 1.2,
        en: `Bumps at thumb crossings (${glitches.length})`,
        he: `קפיצות במעברי אגודל (${glitches.length})`,
      });
  }
  if (timingSD !== null)
    F.push({
      sev: timingSD / th.sd,
      en: `Timing unsteady (SD ${Math.round(timingSD)} ms)`,
      he: `תזמון לא יציב (סטיית תקן ${Math.round(timingSD)} ms)`,
    });
  if (goal.hands && handsAbs !== null) {
    const lead = (handsMean ?? 0) > 0 ? 'LH' : 'RH';
    const leadHe = (handsMean ?? 0) > 0 ? 'יד שמאל' : 'יד ימין';
    F.push({
      sev: handsAbs / th.hands,
      en: `Hands not together (${Math.round(handsAbs)} ms, ${lead} first)`,
      he: `הידיים לא יחד (${Math.round(handsAbs)} ms, ${leadHe} מקדימה)`,
    });
  }
  if (chordSpread !== null)
    F.push({
      sev: chordSpread / 25,
      en: `Chord notes not together (${Math.round(chordSpread)} ms)`,
      he: `צלילי האקורד לא יחד (${Math.round(chordSpread)} ms)`,
    });
  if (lvl) {
    if (velSD !== null)
      F.push({
        sev: velSD / th.vsd,
        en: `Uneven dynamics (velocity SD ${r1(velSD)})`,
        he: `עוצמה לא אחידה (סטיית תקן ${r1(velSD)})`,
      });
    if (bandHit !== null)
      F.push({
        sev: (1 - bandHit) / 0.15,
        en: `Off the ${lvl} level (${pct(bandHit)} % in band)`,
        he: `לא ברמת ${lvl} (${pct(bandHit)}% בטווח)`,
      });
  }
  if (goal.dynamics === 'cresc' && r2 !== null) {
    F.push({
      sev: Math.max((1 - r2) / 0.2, 40 / Math.max(1, crescRange)),
      en: `Crescendo not smooth (R² ${r1(r2 * 10) / 10}, range ${Math.round(crescRange)})`,
      he: `הקרשנדו לא חלק (R² ${r1(r2 * 10) / 10}, טווח ${Math.round(crescRange)})`,
    });
  }
  if (accentGap !== null) {
    const voicing = goal.dynamics === 'voicing';
    const need = voicing ? 10 : 15;
    const sev = accentGap <= 0 ? 3 : need / accentGap;
    F.push(
      voicing
        ? {
            sev,
            en: `Top voice not singing (+${Math.round(accentGap)})`,
            he: `הקול העליון לא בולט (+${Math.round(accentGap)})`,
          }
        : {
            sev,
            en: `Accents too weak (+${Math.round(accentGap)})`,
            he: `ההטעמות חלשות מדי (+${Math.round(accentGap)})`,
          },
    );
  }
  if (goal.articulation === 'legato' && kot !== null) {
    if (kot < 0)
      F.push({
        sev: -kot / 10,
        en: `Not legato (gaps ${Math.round(-kot)} ms)`,
        he: `לא לגאטו (רווחים של ${Math.round(-kot)} ms)`,
      });
    else
      F.push({
        sev: kot / 60,
        en: `Legato smudged (overlap ${Math.round(kot)} ms)`,
        he: `לגאטו מרוח (חפיפה ${Math.round(kot)} ms)`,
      });
  }
  if (goal.articulation === 'staccato' && kdr !== null)
    F.push({
      sev: kdr / 0.5,
      en: `Staccato too long (${pct(kdr)} % of the gap)`,
      he: `סטקטו ארוך מדי (${pct(kdr)}%)`,
    });
  if (goal.articulation === 'portato' && kdr !== null) {
    const off = kdr < 0.6 ? 0.6 - kdr : kdr > 0.8 ? kdr - 0.8 : 0;
    F.push({
      sev: off === 0 ? 0.5 : 1 + off / 0.1,
      en: `Portato length off (${pct(kdr)} %)`,
      he: `אורך הפורטטו לא מדויק (${pct(kdr)}%)`,
    });
  }
  if (chordToneOnBeats !== null)
    F.push({
      sev: chordToneOnBeats >= 1 ? 0 : 1 + (1 - chordToneOnBeats) * 4,
      en: `Chord tones missed on ${ctMiss} beat${ctMiss === 1 ? '' : 's'}`,
      he: `צלילי אקורד חסרים ב-${ctMiss} פעמות`,
    });
  if (voiceLeading !== null) {
    const lim = Math.max(1.5, expVL + 0.5);
    F.push({
      sev: voiceLeading / lim,
      en: `Voice leading jumpy (${r1(voiceLeading)} semitones per voice)`,
      he: `הובלת קולות קופצנית (${r1(voiceLeading)} חצאי טון לקול)`,
    });
  }
  if (hesitations > 0)
    F.push({
      sev: hesitations === 1 ? 1.4 : 2,
      en: `${hesitations} hesitation${hesitations === 1 ? '' : 's'}`,
      he: `${hesitations} היסוסים`,
    });

  // Barry Harris lines are judged by the goal (chord tones on the beats), so small line changes are allowed.
  const harris = drill.spec.family === 'harris' && goal.chordTonesOnBeats && chordToneOnBeats === 1;
  const accClean = harris ? accuracy >= 0.9 && wrong <= Math.ceil(0.1 * nExp) : accuracy >= 1 - EPS && wrong === 0;
  const accAlmost = accuracy >= (harris ? 0.85 : 0.95) && wrong <= Math.max(1, Math.round((harris ? 0.15 : 0.05) * nExp));
  const others = F.filter((f) => !(harris && f.en.includes('wrong,')));
  const worst = others.reduce<Factor | null>((a, b) => (!a || b.sev > a.sev ? b : a), null);
  let verdict: Verdict;
  if (accClean && others.every((f) => f.sev <= 1) && hesitations === 0) verdict = 'clean';
  else if (accAlmost && others.every((f) => f.sev <= 1.5)) verdict = 'almost';
  else verdict = 'not';
  let why: { en: string; he: string };
  if (verdict === 'clean')
    why = {
      en: `Clean at ♩ = ${Math.round(bpm)}`,
      he: `נקי ב-♩ = ${Math.round(bpm)}`,
    };
  else if (worst && worst.sev > 1) why = { en: worst.en, he: worst.he };
  else if (!accClean)
    why = {
      en: `${wrong} wrong, ${missing} missing`,
      he: `${wrong} שגויים, ${missing} חסרים`,
    };
  else why = { en: 'Almost — one more', he: 'כמעט — עוד אחד' };

  const perNote: NoteResult[] = exp.map((e, i) => {
    const r: NoteResult = {
      exp: e,
      played: match[i] !== null ? played[match[i]!] : null,
      dev: dev[i],
      ok: ok[i],
    };
    if (ioiRatio[i] !== undefined) r.ioiRatio = ioiRatio[i];
    return r;
  });

  return {
    bpm,
    nps,
    accuracy,
    wrong,
    missing,
    timingMean,
    timingSD,
    cvR: cv.R,
    cvL: cv.L,
    handsMean,
    handsAbs,
    chordSpread,
    velSD,
    velMean,
    bandHit,
    slope,
    r2,
    accentGap,
    kot,
    kdr,
    hesitations,
    glitches,
    chordToneOnBeats,
    voiceLeading,
    perNote,
    verdict,
    why,
  };
}
