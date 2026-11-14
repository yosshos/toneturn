// Rubato first (owner 2026-11-14; docs/AUDIT-CONTENT-THEORY.md §ה.3): a new technique item — scales too — is first
// played in free time, graded on the notes only (right notes, in order, the right hand); then once in quarter notes on a
// slow click (about one note a second); only then the item's own tempo and the tempo ladder. Free-time and quarter takes
// are measured but never count toward stars or the level (only measured tempo does). Pure.

import { notesPerBeat } from './analyze';
import { isDrumDrill } from './events';
import type { Drill, ItemState, NoteResult, PlayedNote, TakeMetrics } from './types';
import { analyzeVoiceLeadTake } from './voiceLeadAnalyze';

/** Clean free-time takes before the item moves into time. */
export const RUBATO_CLEAN = 2;
/** Clean quarter-note takes before the item's own tempo. */
export const QUARTERS_CLEAN = 1;
/** The quarter-note stage's tempo (♩): one note a second. */
export const QUARTERS_BPM = 60;
/** A timed take this inaccurate offers a free-time take again. */
export const BACK_TO_RUBATO = 0.6;
/** Played notes within this many ms of each other are one chord (a slower split chord is joined by the alignment). */
const CLUSTER_MS = 60;

export type RubatoStage = 'free' | 'quarters';
export interface RubatoState {
  free: number;
  quarters: number;
  /** The player chose to go straight to tempo. */
  skipped?: boolean;
}

/** Items that have a free-time stage: played notes with a pitch to find (not drums, ear call-and-response, writing, improv, untimed note finding, singing). */
export function hasRubato(drill: Drill): boolean {
  // Time and groove drills (a band behind the take, a form to follow, a click on 2 & 4 / off-beats / fading) are about
  // the time itself: they stay timed.
  const timeDrill = !!drill.drums || !!drill.form || (drill.click !== undefined && drill.click !== 'all') || !!drill.tempoMap?.length;
  return !drill.untimed && !timeDrill && !isDrumDrill(drill) && !drill.listen && !drill.write && !drill.drumWrite && drill.freeAbove === undefined && !drill.sung && drill.notes.length > 0;
}

/** A quarter-note version makes sense: faster than quarters, one plain meter, no tempo map / swing / eighth pulse. */
export function hasQuarters(drill: Drill): boolean {
  return notesPerBeat(drill) > 1.2 && !drill.tempoMap?.length && !drill.meters?.length && !drill.spec.swing && drill.pulse !== 8 && !drill.groups?.length && !drill.drums && !drill.form;
}

/** The stage a take of this item is in (null = its own tempo, the ladder as before). */
export function rubatoStage(st: ItemState | undefined, drill: Drill): RubatoStage | null {
  if (!hasRubato(drill)) return null;
  const r = st?.rubato;
  if (r?.skipped) return null;
  // Items played before 0.88 (takes at tempo already) keep their ladder.
  if (!r && st && st.takes > 0) return null;
  if ((r?.free ?? 0) < RUBATO_CLEAN) return 'free';
  if (hasQuarters(drill) && (r?.quarters ?? 0) < QUARTERS_CLEAN) return 'quarters';
  return null;
}

/** The state after one stage take (a clean take moves the stage on). */
export function withStageTake(st: ItemState, stage: RubatoStage, m: TakeMetrics): ItemState {
  const r: RubatoState = { free: st.rubato?.free ?? 0, quarters: st.rubato?.quarters ?? 0 };
  if (m.verdict === 'clean') r[stage]++;
  return { ...st, rubato: r, last: new Date().toISOString() };
}

export const skipRubato = (st: ItemState): ItemState => ({ ...st, rubato: { free: st.rubato?.free ?? 0, quarters: st.rubato?.quarters ?? 0, skipped: true } });

/** The same notes, one per beat: every onset stretched by the drill's notes-per-beat (so eighths become quarters). */
export function quartersDrill(drill: Drill): Drill {
  const k = notesPerBeat(drill);
  if (k <= 1) return drill;
  return {
    ...drill,
    notes: drill.notes.map((n) => ({ ...n, beat: n.beat * k, dur: n.dur * k })),
    beats: Math.ceil(drill.beats * k),
    spec: { ...drill.spec, perBeat: 1 },
  };
}

// ───────────────────────────── grading a free-time take ─────────────────────────────

/** The written onsets in order: each a set of pitches sounding together (a chord, octaves, hands together). */
export function expectedGroups(drill: Drill): { beat: number; idx: number[] }[] {
  const by = new Map<number, number[]>();
  drill.notes.forEach((n, i) => {
    const k = Math.round(n.beat * 1e4);
    by.set(k, [...(by.get(k) ?? []), i]);
  });
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([k, idx]) => ({ beat: k / 1e4, idx }));
}

/** The played notes in order, clustered into onsets (notes struck together). */
export function playedGroups(played: PlayedNote[]): number[][] {
  const ps = [...played].sort((a, b) => a.on - b.on);
  const out: { at: number; idx: number[] }[] = [];
  ps.forEach((p) => {
    const i = played.indexOf(p);
    const last = out[out.length - 1];
    if (last && p.on - last.at <= CLUSTER_MS) last.idx.push(i);
    else out.push({ at: p.on, idx: [i] });
  });
  return out.map((g) => g.idx);
}

/**
 * Free-time grading: align the written onsets with the played ones in order (a weighted LCS — an onset scores the notes
 * it shares), so a wrong note, a skipped note or a restart costs only itself. Timing is not judged at all.
 */
export function analyzeFree(drill: Drill, played: PlayedNote[]): TakeMetrics {
  // Voice leading: any good voicing counts, not the written one — its own grader, each voicing when ready.
  if (drill.goal.vl) return analyzeVoiceLeadTake(drill, drill.startBpm, played, { rubato: true });
  const E = expectedGroups(drill);
  const P = playedGroups(played);
  const n = E.length;
  const m = P.length;
  // score[i][j]: best matched notes using E[0..i) and P[0..j). A written chord may take one played onset or two in a
  // row (hands a little apart, a rolled chord).
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const share = (i: number, js: number[]) => {
    const want = E[i].idx.map((k) => drill.notes[k].pitch);
    const got = new Set(js.flatMap((j) => P[j].map((k) => played[k].pitch)));
    return want.filter((p) => got.has(p)).length;
  };
  const multi = (i: number) => E[i].idx.length > 1;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const s1 = share(i - 1, [j - 1]);
      let best = Math.max(score[i - 1][j], score[i][j - 1], s1 ? score[i - 1][j - 1] + s1 : 0);
      if (j >= 2 && multi(i - 1)) {
        const s2 = share(i - 1, [j - 2, j - 1]);
        if (s2 > s1) best = Math.max(best, score[i - 1][j - 2] + s2);
      }
      score[i][j] = best;
    }
  // Walk back: which played onsets each written onset took.
  const take: (number[] | null)[] = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    const s1 = share(i - 1, [j - 1]);
    const s2 = j >= 2 && multi(i - 1) ? share(i - 1, [j - 2, j - 1]) : 0;
    if (s2 > s1 && score[i][j] === score[i - 1][j - 2] + s2) {
      take[i - 1] = [j - 2, j - 1];
      i--;
      j -= 2;
    } else if (s1 && score[i][j] === score[i - 1][j - 1] + s1) {
      take[i - 1] = [j - 1];
      i--;
      j--;
    } else if (score[i][j] === score[i - 1][j]) i--;
    else j--;
  }
  const usedPlayed = new Set<number>();
  const perNote: NoteResult[] = drill.notes.map((exp) => ({ exp, played: null, dev: null, ok: false }));
  E.forEach((g, i) => {
    const js = take[i];
    if (js === null) return;
    for (const k of g.idx) {
      const hit = js.flatMap((j) => P[j]).find((q) => played[q].pitch === drill.notes[k].pitch && !usedPlayed.has(q));
      if (hit === undefined) continue;
      usedPlayed.add(hit);
      perNote[k] = { exp: drill.notes[k], played: played[hit], dev: null, ok: true };
    }
  });
  const total = drill.notes.length;
  const okN = perNote.filter((x) => x.ok).length;
  const accuracy = total ? okN / total : 1;
  const wrong = played.length - usedPlayed.size;
  const missing = total - okN;
  const clean = accuracy >= 0.95 && wrong <= Math.max(1, Math.round(total * 0.05));
  const verdict: TakeMetrics['verdict'] = clean ? 'clean' : accuracy >= 0.8 ? 'almost' : 'not';
  const why =
    verdict === 'clean'
      ? { en: 'Every note in place — time comes next.', he: 'כל הצלילים במקום — עכשיו מוסיפים זמן.' }
      : missing >= wrong
        ? { en: `${missing} notes missed — slowly, note by note.`, he: `${missing} צלילים חסרים — לאט, צליל אחרי צליל.` }
        : { en: `${wrong} wrong notes — take your time, look ahead.`, he: `${wrong} צלילים שגויים — בלי למהר, להסתכל קדימה.` };
  return {
    bpm: 0,
    nps: 0,
    accuracy,
    wrong,
    missing,
    timingMean: null,
    timingSD: null,
    cvR: null,
    cvL: null,
    handsMean: null,
    handsAbs: null,
    chordSpread: null,
    velSD: null,
    velMean: null,
    bandHit: null,
    slope: null,
    r2: null,
    accentGap: null,
    kot: null,
    kdr: null,
    hesitations: 0,
    glitches: [],
    chordToneOnBeats: null,
    voiceLeading: null,
    perNote,
    verdict,
    why,
  };
}

/**
 * Where the player is in a free-time take, for the staff's now-cue (it waits for the player): the beat of the first
 * written onset not yet fully played, matching the played pitches greedily in order.
 */
export function freeProgress(drill: Drill, played: PlayedNote[]): number {
  const E = expectedGroups(drill);
  // Voice leading: the player's own voicings — one played onset per chord.
  if (drill.goal.vl) {
    const n = playedGroups(played).length;
    return n >= E.length ? drill.beats : (E[n]?.beat ?? drill.beats);
  }
  let gi = 0;
  let need = new Set(E[0]?.idx.map((k) => drill.notes[k].pitch) ?? []);
  for (const p of [...played].sort((a, b) => a.on - b.on)) {
    if (gi >= E.length) break;
    if (need.has(p.pitch)) need.delete(p.pitch);
    if (!need.size) {
      gi++;
      need = new Set(E[gi]?.idx.map((k) => drill.notes[k].pitch) ?? []);
    }
  }
  return gi >= E.length ? drill.beats : E[gi].beat;
}
