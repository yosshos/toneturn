// One note, many chords — the player's own choice (k-ctone "harmonize the note eight ways", HARMONY-REHARM §2). Pure.
//
// The player chooses every chord. A chord counts when (a) the held pitch is its top note, (b) the notes played make a
// chord that can carry the held note (commonTone.identifyChord + holdsNote: a chord tone or an available tension, never
// an avoid note — the same table as holdsMelody), and (c) it was not played before (root + quality). The inner voices
// should move smoothly: on average at most `tol` semitones a voice from the chord before (voiceLead.ts tolerance idea);
// a jumpier change makes the take "almost". Timed takes: one chord a bar on the click; rubato: each chord when ready.

import type { Drill, NoteResult, PlayedNote, TakeMetrics, Verdict } from './types';
import { expTimeMs, npsOf, tempoBand, thresholds } from './analyze';
import { CT_Q, holdsNote, identifyChord, mod12, rootName } from '../commonTone';

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

export type HeldKind = 'ok' | 'empty' | 'top' | 'held' | 'unknown' | 'clash' | 'repeat';
export interface HeldStep {
  kind: HeldKind;
  /** The chord heard (root pc + quality), when one was. */
  chord: { root: number; q: keyof typeof CT_Q } | null;
  voicing: number[];
  /** Average inner-voice motion from the chord before (semitones a voice), null for the first. */
  motion: number | null;
}

/**
 * Grade a sequence of played voicings (low → high pitches each) against the held pitch. `loose` (the guitar: a strum's
 * octaves and voice order can't be told apart by the microphone): the held note need only sound in the chord, and the
 * inner-voice motion is not judged.
 */
export function gradeHeldChoices(voicings: number[][], held: number, loose = false): HeldStep[] {
  const seen = new Set<string>();
  let prevInner: number[] | null = null;
  return voicings.map((v0) => {
    const v = [...new Set(v0)].sort((a, b) => a - b);
    if (!v.length) return { kind: 'empty', chord: null, voicing: v, motion: null };
    if (loose ? !v.some((p) => mod12(p) === mod12(held)) : mod12(v[v.length - 1]) !== mod12(held)) return { kind: loose ? 'held' : 'top', chord: null, voicing: v, motion: null };
    const chord = identifyChord(v);
    if (!chord) {
      // The chord under the held note, when the held note itself is what spoils it (C E G B under F: an avoid note).
      const under = identifyChord(v.slice(0, -1));
      if (under && !holdsNote(under.root, under.q, held)) return { kind: 'clash', chord: under, voicing: v, motion: null };
      return { kind: 'unknown', chord: null, voicing: v, motion: null };
    }
    if (!holdsNote(chord.root, chord.q, held)) return { kind: 'clash', chord, voicing: v, motion: null };
    const id = `${chord.root}:${CT_Q[chord.q].ints.map((x) => mod12(x)).sort((a, b) => a - b).join('.')}`;
    if (seen.has(id)) return { kind: 'repeat', chord, voicing: v, motion: null };
    seen.add(id);
    // Inner voices: without the top (held) and, with 4+ notes, without the bass.
    const inner = v.length >= 4 ? v.slice(1, -1) : v.slice(0, -1);
    let motion: number | null = null;
    if (prevInner && inner.length && !loose) {
      const p = prevInner;
      motion = inner.reduce((s, x) => s + Math.min(...p.map((y) => Math.abs(x - y))), 0) / inner.length;
    }
    prevInner = inner;
    return { kind: 'ok', chord, voicing: v, motion };
  });
}

const KIND_LINE: Record<Exclude<HeldKind, 'ok'>, (n: number, held: string, s: HeldStep) => { en: string; he: string }> = {
  empty: (n) => ({ en: `Chord ${n}: not played`, he: `אקורד ${n}: לא נוגן` }),
  top: (n, held) => ({ en: `Chord ${n}: keep ${held} on top`, he: `אקורד ${n}: ${held} צריך להישאר למעלה` }),
  held: (n, held) => ({ en: `Chord ${n}: ${held} is missing — keep it in every chord`, he: `אקורד ${n}: ${held} חסר — הוא נשאר בכל אקורד` }),
  unknown: (n) => ({ en: `Chord ${n}: not a chord the app knows (3 notes or more)`, he: `אקורד ${n}: לא אקורד מוכר (3 צלילים לפחות)` }),
  clash: (n, held, s) => ({ en: `Chord ${n}: ${held} clashes with ${rootName(s.chord!.root)}${CT_Q[s.chord!.q].sym}`, he: `אקורד ${n}: ${held} מתנגש עם ${rootName(s.chord!.root)}${CT_Q[s.chord!.q].sym}` }),
  repeat: (n) => ({ en: `Chord ${n}: already used — no repeats`, he: `אקורד ${n}: כבר נוגן — בלי חזרות` }),
};

/** The voicing of each chord slot: struck notes grouped by onset (and keys still held down from before). */
function voicingsOf(drill: Drill, bpm: number, played: PlayedNote[], rubato: boolean): { voicings: number[][]; onsets: (number | null)[]; extra: number } {
  const g = drill.goal.ct!;
  const ps = played.slice().sort((a, b) => a.on - b.on);
  const groups: { t: number; t1: number; notes: PlayedNote[] }[] = [];
  for (const p of ps) {
    const last = groups[groups.length - 1];
    if (last && p.on - last.t <= 150) {
      last.notes.push(p);
      last.t1 = p.on;
    } else groups.push({ t: p.on, t1: p.on, notes: [p] });
  }
  const n = g.count;
  const slots: ({ t: number; notes: PlayedNote[] } | null)[] = Array.from({ length: n }, () => null);
  let extra = 0;
  if (rubato) groups.forEach((gr, i) => (i < n ? (slots[i] = gr) : (extra += gr.notes.length)));
  else {
    const T = g.at.map((b) => expTimeMs(drill, b, bpm));
    const win = (60000 / bpm) * 1.5;
    for (const gr of groups) {
      let k = -1;
      let best = Infinity;
      T.forEach((x, i) => {
        const d = Math.abs(gr.t - x);
        if (d < best && d <= win && !slots[i]) (best = d), (k = i);
      });
      if (k >= 0) slots[k] = gr;
      else extra += gr.notes.length;
    }
  }
  const voicings = slots.map((sl) => {
    if (!sl) return [];
    const held = g.loose ? [] : ps.filter((p) => !sl.notes.includes(p) && p.on < sl.t - 30 && (p.off === null || p.off > sl.t + 100));
    return [...new Set([...sl.notes, ...held].map((p) => p.pitch))].sort((a, b) => a - b);
  });
  return { voicings, onsets: slots.map((sl) => (sl ? sl.t : null)), extra };
}

/** One take of the free held-note item. */
export function analyzeHeldChoiceTake(drill: Drill, bpm: number, played: PlayedNote[], opts: { rubato?: boolean } = {}): TakeMetrics {
  const g = drill.goal.ct!;
  const rubato = !!opts.rubato;
  const { voicings, onsets, extra } = voicingsOf(drill, bpm, played, rubato);
  const steps = gradeHeldChoices(voicings, g.held, !!g.loose);
  const okN = steps.filter((s) => s.kind === 'ok').length;
  const accuracy = g.count ? okN / g.count : 1;
  const heldName = rootName(g.held);
  const T = g.at.map((b) => expTimeMs(drill, b, bpm));
  const devs = onsets.map((o, k) => (o !== null && !rubato ? o - T[k] : null));
  const dv = devs.filter((d): d is number => d !== null);
  const nps = npsOf(drill, bpm);
  const th = thresholds(tempoBand(nps));
  const timingSD = !rubato && dv.length >= 3 ? sd(dv) : null;
  const jumpy = steps.filter((s) => s.kind === 'ok' && s.motion !== null && s.motion > g.tol);
  const bad = steps.findIndex((s) => s.kind !== 'ok');
  let verdict: Verdict;
  if (bad < 0 && !jumpy.length && extra === 0 && (timingSD === null || timingSD <= th.sd)) verdict = 'clean';
  else if (accuracy >= 0.75 && extra <= 2) verdict = 'almost';
  else verdict = 'not';
  const why =
    bad >= 0
      ? KIND_LINE[steps[bad].kind as Exclude<HeldKind, 'ok'>](bad + 1, heldName, steps[bad])
      : jumpy.length
        ? { en: `Chord ${steps.indexOf(jumpy[0]) + 1}: the inner voices jump — move them by step`, he: `אקורד ${steps.indexOf(jumpy[0]) + 1}: הקולות הפנימיים קופצים — הזיזו אותם בצעדים` }
        : verdict === 'clean'
          ? { en: `Eight chords, ${heldName} on top`, he: `שמונה אקורדים, ${heldName} למעלה` }
          : { en: 'Almost — one more', he: 'כמעט — עוד אחד' };
  const slotOf = new Map<number, number>();
  g.at.forEach((b, k) => slotOf.set(Math.round(b * 1e4), k));
  const perNote: NoteResult[] = drill.notes.map((e) => {
    const k = slotOf.get(Math.round(e.beat * 1e4)) ?? -1;
    return { exp: e, played: null, dev: k >= 0 ? devs[k] : null, ok: k >= 0 && steps[k].kind === 'ok' };
  });
  const motions = steps.filter((s) => s.motion !== null).map((s) => s.motion!);
  const vels = played.map((p) => p.vel);
  return {
    bpm,
    nps,
    accuracy,
    wrong: extra,
    missing: steps.filter((s) => s.kind === 'empty').length,
    timingMean: dv.length ? mean(dv) : null,
    timingSD,
    cvR: null,
    cvL: null,
    handsMean: null,
    handsAbs: null,
    chordSpread: null,
    velSD: null,
    velMean: vels.length ? mean(vels) : null,
    bandHit: null,
    slope: null,
    r2: null,
    accentGap: null,
    kot: null,
    kdr: null,
    hesitations: 0,
    glitches: [],
    chordToneOnBeats: null,
    voiceLeading: motions.length ? mean(motions) : null,
    perNote,
    verdict,
    why,
  };
}
