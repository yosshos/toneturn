// Voice-leading drills: one take → the voicing the player chose at each chord → grade (voiceLead.ts) + timing. Pure.
//
// MIDI keys give note-on AND note-off, so a common tone HELD from the chord before still sounds in the next voicing
// (it is never re-struck). The voicing at a chord = the keys struck for it + the keys still down from before past the
// middle of the chord. Timed take: a voicing per bar / half bar on the click (struck within a window of its beat).
// Rubato take (opts.rubato): each voicing when ready — the struck notes are grouped by onset (150 ms) in order; no timing.

import type { Drill, NoteResult, PlayedNote, TakeMetrics, Verdict } from './types';
import { expTimeMs, npsOf, tempoBand, thresholds } from './analyze';
import { gradeVoicings, stepLine, type VLGoal, type VLStep } from './voiceLead';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

/** What a voice-leading take reports (TakeMetrics.vl): per chord, the voicing played and its grade. */
export interface VLReport {
  steps: VLStep[];
  /** The voicing heard at each chord (all keys down, low → high). */
  voicings: number[][];
  /** Played total motion and the smallest possible (summed per change, from what was really played). */
  total: number;
  best: number;
  rubato: boolean;
}

interface Cluster {
  /** First / last onset (ms). */
  t0: number;
  t1: number;
  notes: PlayedNote[];
}

/** The release time of a played note: its note-off, else the next strike of the same key, else still down. */
function releaseOf(p: PlayedNote, all: PlayedNote[]): number {
  if (p.off !== null) return p.off;
  const again = all.filter((q) => q !== p && q.pitch === p.pitch && q.on > p.on).map((q) => q.on);
  return again.length ? Math.min(...again) : Infinity;
}

/** The voicing at each chord of a take (and the onset clusters behind them; extra notes outside every chord). */
export function voicingsOfTake(drill: Drill, bpm: number, played: PlayedNote[], rubato = false): { voicings: number[][]; clusters: (Cluster | null)[]; extra: number } {
  const g = drill.goal.vl!;
  const n = g.chords.length;
  const beatMs = 60000 / bpm;
  const ps = played.slice().sort((a, b) => a.on - b.on);
  const clusters: (Cluster | null)[] = Array.from({ length: n }, () => null);
  let extra = 0;
  if (rubato) {
    const groups: Cluster[] = [];
    for (const p of ps) {
      const last = groups[groups.length - 1];
      if (last && p.on - last.t0 <= 150) {
        last.notes.push(p);
        last.t1 = p.on;
      } else groups.push({ t0: p.on, t1: p.on, notes: [p] });
    }
    groups.forEach((gr, i) => {
      if (i < n) clusters[i] = gr;
      else extra += gr.notes.length;
    });
  } else {
    const T = g.at.map((b) => expTimeMs(drill, b, bpm));
    for (const p of ps) {
      let k = -1;
      let bd = Infinity;
      T.forEach((t, i) => {
        const gapPrev = i > 0 ? t - T[i - 1] : Infinity;
        const gapNext = i < n - 1 ? T[i + 1] - t : Infinity;
        const w = Math.min(beatMs, gapPrev / 2, gapNext / 2);
        const d = Math.abs(p.on - t);
        if (d <= w && d < bd) {
          bd = d;
          k = i;
        }
      });
      if (k < 0) {
        extra++;
        continue;
      }
      const c = clusters[k];
      if (c) {
        c.notes.push(p);
        c.t0 = Math.min(c.t0, p.on);
        c.t1 = Math.max(c.t1, p.on);
      } else clusters[k] = { t0: p.on, t1: p.on, notes: [p] };
    }
  }
  const tOf = (k: number): number => clusters[k]?.t0 ?? (rubato ? NaN : expTimeMs(drill, g.at[k], bpm));
  const voicings = clusters.map((c, k) => {
    const t = tOf(k);
    if (!Number.isFinite(t)) return [];
    // The middle of this chord: halfway to the next chord's onset (the last chord: half a bar / 600 ms on).
    let next = NaN;
    for (let j = k + 1; j < n && !Number.isFinite(next); j++) next = tOf(j);
    const mid = Number.isFinite(next) ? (t + next) / 2 : t + Math.max(600, (rubato ? 1200 : beatMs * 2) / 2);
    const struck = c ? c.notes : [];
    // Guitar: every chord is strummed again (the take's note-offs are not kept), so only the struck notes count.
    const held = g.strings ? [] : ps.filter((p) => !struck.includes(p) && p.on < t - 30 && releaseOf(p, ps) > mid);
    return [...new Set([...struck, ...held].map((p) => p.pitch))].sort((a, b) => a - b);
  });
  return { voicings, clusters, extra };
}

interface Factor {
  sev: number;
  en: string;
  he: string;
}

/**
 * One voice-leading take. `rubato`: untimed (each voicing when ready) — only the voicings are judged. The chord you
 * chose is right when it fits the type; the change is right when it moves at most `tol` semitones more than the
 * smallest move from your previous voicing.
 */
export function analyzeVoiceLeadTake(drill: Drill, bpm: number, played: PlayedNote[], opts: { rubato?: boolean } = {}): TakeMetrics {
  const g = drill.goal.vl as VLGoal;
  const rubato = !!opts.rubato;
  const n = g.chords.length;
  const { voicings, clusters, extra } = voicingsOfTake(drill, bpm, played, rubato);
  const steps = gradeVoicings(voicings, g);
  const okChords = steps.filter((s) => s.cls.ok).length;
  const wrongNotes = steps.reduce((a, s) => a + (s.cls.kind === 'wrong' ? voicings[s.i].filter((p) => s.cls.wrongPcs.includes(mod12(p))).length : 0), 0) + extra;
  const missingChords = steps.filter((s) => s.cls.kind === 'empty').length;
  const accuracy = n ? okChords / n : 1;

  // Timing (timed takes): a chord's onset = its first struck note.
  const T = g.at.map((b) => expTimeMs(drill, b, bpm));
  const devs: (number | null)[] = clusters.map((c, k) => (c && !rubato ? c.t0 - T[k] : null));
  const dv = devs.filter((d): d is number => d !== null);
  const nps = npsOf(drill, bpm);
  const th = thresholds(tempoBand(nps));
  const timingMean = dv.length ? mean(dv) : null;
  const timingSD = !rubato && dv.length >= 3 ? sd(dv) * Math.sqrt(dv.length / (dv.length - 1)) : null;
  const worst = !rubato && dv.length >= 3 ? Math.max(...dv.map((x) => Math.abs(x - mean(dv)))) : null;
  const spreads = clusters.filter((c): c is Cluster => !!c && c.notes.length > 1).map((c) => c.t1 - c.t0);
  const chordSpread = !rubato && spreads.length ? Math.max(...spreads) : null;
  let hesitations = 0;
  if (!rubato) {
    const on = clusters.map((c, k) => (c ? { t: c.t0, w: T[k] } : null)).filter((x): x is { t: number; w: number } => !!x);
    const rs = on.slice(1).map((x, k) => (x.t - on[k].t) / Math.max(1, x.w - on[k].w));
    if (rs.length >= 2) {
      const med = rs.slice().sort((a, b) => a - b)[Math.floor(rs.length / 2)];
      hesitations = rs.filter((r) => med > 0 && r / med > 1.5).length;
    }
  }

  const F: Factor[] = [];
  const bad = steps.filter((s) => !s.cls.ok);
  if (bad.length || extra) {
    const line = bad.length ? stepLine(bad[0], g)! : { en: `${extra} extra note${extra === 1 ? '' : 's'}`, he: `${extra} צלילים מיותרים` };
    F.push({ sev: 1 + ((bad.length + extra / 4) / Math.max(1, n)) * 20, ...line });
  }
  // The worst change (motion, a dropped common tone, 7 → 3), then a start off the written voicing.
  const lead = steps.filter((s) => s.cls.ok && s.verdict !== 'clean').sort((a, b) => (a.verdict === 'not' ? 0 : 1) - (b.verdict === 'not' ? 0 : 1) || (b.excess ?? 0) - (a.excess ?? 0))[0];
  if (lead) {
    const line = stepLine(lead, g);
    if (line) F.push({ sev: lead.verdict === 'not' ? 2.2 : 1.3, ...line });
  }
  if (timingSD !== null)
    F.push({ sev: timingSD / th.sd, en: `Timing unsteady (SD ${Math.round(timingSD)} ms)`, he: `תזמון לא יציב (סטיית תקן ${Math.round(timingSD)} ms)` });
  if (worst !== null && worst > 2.5 * th.sd) F.push({ sev: worst / (2.5 * th.sd), en: `One chord far off the beat (${Math.round(worst)} ms)`, he: `אקורד אחד רחוק מהפעמה (${Math.round(worst)} ms)` });
  // Two hands and held tones: a chord's struck notes together within 40 ms.
  if (chordSpread !== null) F.push({ sev: chordSpread / 40, en: `Chord notes not together (${Math.round(chordSpread)} ms)`, he: `צלילי האקורד לא יחד (${Math.round(chordSpread)} ms)` });
  if (hesitations > 0) F.push({ sev: hesitations === 1 ? 1.4 : 2, en: `${hesitations} hesitation${hesitations === 1 ? '' : 's'}`, he: `${hesitations} היסוסים` });

  const worstF = F.reduce<Factor | null>((a, b) => (!a || b.sev > a.sev ? b : a), null);
  let verdict: Verdict;
  if (bad.length === 0 && !extra && F.every((f) => f.sev <= 1) && hesitations === 0) verdict = 'clean';
  else if (accuracy >= 0.85 && extra <= 1 && F.every((f) => f.sev <= 1.5)) verdict = 'almost';
  else verdict = 'not';
  const why =
    verdict === 'clean'
      ? rubato
        ? { en: 'Smooth voice leading', he: 'הובלת קולות חלקה' }
        : { en: `Clean at ♩ = ${Math.round(bpm)}`, he: `נקי ב-♩ = ${Math.round(bpm)}` }
      : worstF && worstF.sev > 1
        ? { en: worstF.en, he: worstF.he }
        : { en: 'Almost — one more', he: 'כמעט — עוד אחד' };

  // Per written note: right when its chord was right; the played note of that pitch class nearest to it.
  const chordOf = new Map<number, number>();
  g.at.forEach((b, k) => chordOf.set(Math.round(b * 1e4), k));
  const perNote: NoteResult[] = drill.notes.map((e) => {
    const k = chordOf.get(Math.round(e.beat * 1e4)) ?? -1;
    const v = k >= 0 ? voicings[k] : [];
    const same = v.filter((p) => mod12(p) === mod12(e.pitch)).sort((a, b) => Math.abs(a - e.pitch) - Math.abs(b - e.pitch))[0];
    const src = same !== undefined ? played.find((p) => p.pitch === same && (clusters[k]?.notes.includes(p) ?? false)) ?? played.find((p) => p.pitch === same) ?? null : null;
    return { exp: e, played: src, dev: k >= 0 ? devs[k] : null, ok: k >= 0 && steps[k].cls.ok && steps[k].verdict !== 'not' };
  });
  const motions = steps.filter((s) => s.motion !== null);
  const report: VLReport = { steps, voicings, total: motions.reduce((a, s) => a + s.motion!, 0), best: motions.reduce((a, s) => a + s.best!, 0), rubato };
  const vels = played.map((p) => p.vel);
  return {
    bpm,
    nps,
    accuracy,
    wrong: wrongNotes,
    missing: missingChords,
    timingMean,
    timingSD,
    cvR: null,
    cvL: null,
    handsMean: null,
    handsAbs: null,
    chordSpread,
    velSD: null,
    velMean: vels.length ? mean(vels) : null,
    bandHit: null,
    slope: null,
    r2: null,
    accentGap: null,
    kot: null,
    kdr: null,
    hesitations,
    glitches: [],
    chordToneOnBeats: null,
    voiceLeading: motions.length ? report.total / motions.length / Math.max(1, steps[0]?.cls.voices.length ?? 1) : null,
    perNote,
    verdict,
    why,
    vl: report,
  };
}
