// Harmony-aware grading of instrument takes (owner 2026-11-14): a progression played back is judged per chord — is the
// root motion right, is the quality / colour right, is the bass (inversion / slash) right — with partial credit and a
// one-line verdict ("roots ✓ · colours 5/8 · bass 7/8"). Evidence per chord comes from what was played: MIDI notes (or
// the piano microphone's score-informed notes), the guitar's chroma frames (any voicing, a strum), or the bass's
// notes (root / line). It is added to a take's metrics (withHarmony) and can only lower the verdict. Pure.

import { expTimeMs } from './analyze';
import type { Drill, PlayedNote, TakeMetrics } from './types';
import { bassPcOf, chordPcs, colourPcs, GQ_IV, type GChord } from '../progGrid';

const mod12 = (n: number) => ((Math.round(n) % 12) + 12) % 12;

/** One chord of the answer (drill beats). */
export interface HarmonyChord {
  beat: number;
  dur: number;
  sym: string;
  root: number;
  /** Every pitch class that belongs (tones + colours). */
  pcs: number[];
  /** What tells its quality and colour (3rd, 7th / 6th, tensions): all must sound. */
  colour: number[];
  /** The 3rd and 7th (a rootless voicing implies the root by them). */
  guide: number[];
  /** The expected bass pitch class (root, or the slash bass). */
  bass: number;
}
/** The plan on a drill: the chords and what is graded ('chords': root, colour, bass; 'bass': the bass line only). */
export interface HarmonyPlan {
  chords: HarmonyChord[];
  mode: 'chords' | 'bass';
  /** The lowest note must be the bass (piano with the root in the left hand; off for guitar voicings and inversions). */
  bassCounts?: boolean;
}
/** What was heard during one chord. */
export interface HarmonyEvidence {
  pcs: number[];
  /** Lowest pitch class heard (null = not measured). */
  bass: number | null;
  /** Chroma evidence: one stray pitch class is tolerated (overtones, a ringing string). */
  fuzzy?: boolean;
}
export interface HarmonyChordResult {
  sym: string;
  root: boolean;
  colour: boolean | null;
  bass: boolean | null;
}
export interface HarmonyReport {
  chords: HarmonyChordResult[];
  roots: { ok: number; of: number };
  colours: { ok: number; of: number } | null;
  bass: { ok: number; of: number } | null;
  /** Partial credit 0..1: root 0.5, colour 0.3, bass 0.2 per chord (the parts graded). */
  score: number;
  line: { en: string; he: string };
}

/** The plan's chord for a chord of a progression placed at `beat`. */
export function harmonyChord(c: Pick<GChord, 'root' | 'q' | 'x' | 'sym'>, beat: number, dur: number): HarmonyChord {
  const iv = GQ_IV[c.q];
  const guide = [iv[1], iv[3] ?? iv[2]].map((i) => mod12(c.root + i));
  return { beat, dur, sym: c.sym, root: mod12(c.root), pcs: chordPcs(c), colour: colourPcs(c), guide, bass: bassPcOf(c) };
}

/** Grade evidence against the plan. */
export function gradeHarmony(plan: HarmonyPlan, ev: (HarmonyEvidence | null)[]): HarmonyReport {
  const chords: HarmonyChordResult[] = plan.chords.map((c, i) => {
    const e = ev[i];
    const heard = new Set((e?.pcs ?? []).map(mod12));
    if (plan.mode === 'bass') {
      const ok = !!e && e.bass !== null && e.bass === c.bass;
      return { sym: c.sym, root: ok, colour: null, bass: null };
    }
    if (!e || !heard.size) return { sym: c.sym, root: false, colour: false, bass: plan.bassCounts ? false : null };
    const lowWrong = plan.bassCounts && e.bass !== null && e.bass !== c.bass && e.bass !== c.root;
    const root = !lowWrong && (heard.has(c.root) || c.guide.every((p) => heard.has(p)));
    const allowed = new Set([...c.pcs, c.root, mod12(c.root + 7), c.bass]);
    const foreign = [...heard].filter((p) => !allowed.has(p)).length;
    const colour = c.colour.every((p) => heard.has(p)) && foreign <= (e.fuzzy ? 1 : 0);
    const bass = plan.bassCounts ? e.bass !== null && e.bass === c.bass : null;
    return { sym: c.sym, root, colour, bass };
  });
  const n = chords.length;
  const count = (f: (r: HarmonyChordResult) => boolean | null) => ({ ok: chords.filter((r) => f(r) === true).length, of: n });
  const roots = count((r) => r.root);
  const colours = plan.mode === 'chords' ? count((r) => r.colour) : null;
  const bass = plan.mode === 'chords' && plan.bassCounts ? count((r) => r.bass) : null;
  const w = 0.5 + (colours ? 0.3 : 0) + (bass ? 0.2 : 0);
  const score = n ? chords.reduce((a, r) => a + ((r.root ? 0.5 : 0) + (r.colour ? 0.3 : 0) + (r.bass ? 0.2 : 0)) / w, 0) / n : 0;
  const part = (x: { ok: number; of: number }) => (x.ok === x.of ? '✓' : `${x.ok}/${x.of}`);
  const en = [`roots ${part(roots)}`, ...(colours ? [`colours ${part(colours)}`] : []), ...(bass ? [`bass ${part(bass)}`] : [])].join(' · ');
  const he = [`שורשים ${part(roots)}`, ...(colours ? [`צבעים ${part(colours)}`] : []), ...(bass ? [`בס ${part(bass)}`] : [])].join(' · ');
  return { chords, roots, colours, bass, score, line: { en, he } };
}

/** The window of a chord in take ms: from a little before its beat to a little before the next. */
function windowMs(drill: Drill, c: HarmonyChord, bpm: number): [number, number] {
  return [expTimeMs(drill, c.beat, bpm) - 160, expTimeMs(drill, c.beat + c.dur, bpm) - 90];
}

/** Evidence from played notes (MIDI, or score-informed microphone notes; bass notes for the bass). */
export function evidenceFromNotes(drill: Drill, plan: HarmonyPlan, bpm: number, played: Pick<PlayedNote, 'pitch' | 'on'>[]): (HarmonyEvidence | null)[] {
  return plan.chords.map((c) => {
    const [a, b] = windowMs(drill, c, bpm);
    const ns = played.filter((p) => p.on >= a && p.on < b);
    if (!ns.length) return null;
    // The bass: the lowest note struck near the chord's start (the bass line: its first note).
    const early = ns.filter((p) => p.on < a + 160 + 0.45 * (b - a));
    const low = (plan.mode === 'bass' ? [ns.slice().sort((x, y) => x.on - y.on)[0]] : early.length ? early : ns).reduce((x, y) => (y.pitch < x.pitch ? y : x));
    return { pcs: [...new Set(ns.map((p) => mod12(p.pitch)))], bass: mod12(low.pitch) };
  });
}

/** A microphone frame with chroma (guitar / piano by mic). */
export interface ChromaFrame {
  t: number;
  rms: number;
  chroma?: number[];
  hz?: number | null;
  conf?: number;
}
/** Evidence from chroma frames: the pitch classes strong in the chord's window, the lowest steady pitch as the bass. */
export function evidenceFromChroma(drill: Drill, plan: HarmonyPlan, bpm: number, frames: ChromaFrame[]): (HarmonyEvidence | null)[] {
  return plan.chords.map((c) => {
    const [a0, b] = windowMs(drill, c, bpm);
    const a = a0 + 220;
    const win = frames.filter((f) => f.chroma && f.t >= a && f.t <= Math.max(a + 200, b) && f.rms > 0.01);
    if (win.length < 3) return null;
    const mean = Array.from({ length: 12 }, (_, k) => win.reduce((s, f) => s + (f.chroma![k] ?? 0), 0) / win.length);
    const top = Math.max(...mean);
    if (top <= 0) return null;
    const pcs = mean.flatMap((v, k) => (v >= 0.45 * top ? [k] : []));
    const lows = win.filter((f) => f.hz && (f.conf ?? 1) >= 0.5 && f.hz >= 38 && f.hz <= 330).map((f) => Math.round(12 * Math.log2(f.hz! / 440) + 69));
    return { pcs, bass: lows.length >= 2 ? mod12(Math.min(...lows)) : null, fuzzy: true };
  });
}

/**
 * Add the harmony report to a take (drills with a `harmony` plan): per-chord root / colour / bass, partial credit and
 * the one-line verdict. A wrong part keeps the take from counting as clean; most roots wrong is "not".
 */
export function withHarmony<M extends TakeMetrics>(m: M, drill: Drill, bpm: number, played: Pick<PlayedNote, 'pitch' | 'on'>[], frames: ChromaFrame[] = []): M {
  const plan = drill.harmony;
  if (!plan?.chords.length) return m;
  // Guitar takes pass their chroma frames (a strum's notes can't be told apart one by one); others pass notes only.
  const chroma = plan.mode === 'chords' && frames.some((f) => f.chroma);
  const ev = chroma ? evidenceFromChroma(drill, plan, bpm, frames) : evidenceFromNotes(drill, plan, bpm, played);
  const r = gradeHarmony(plan, ev);
  const out: M = { ...m, harmony: r };
  if (r.score < 1 && out.verdict === 'clean') out.verdict = 'almost';
  if (r.roots.ok < r.roots.of / 2) out.verdict = 'not';
  out.why = m.verdict === 'clean' || r.score < 1 ? r.line : { en: `${r.line.en} — ${m.why.en}`, he: `${r.line.he} — ${m.why.he}` };
  return out;
}
