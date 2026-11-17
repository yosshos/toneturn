// A guitar take in free time (the rubato stage of an Encore phrase or a technique item, GUITAR-AUDIT B5). The plain
// free-time grader (rubato.ts analyzeFree) compares pitches only: by microphone a strum reads as one pitch (a chord
// never passes), an unpitched onset counts as a wrong note, and a bend's glide is a run of extra notes — and nothing of
// the guitar analysis runs. Here the take is first lined up with the written onsets in order (a weighted LCS), the
// drill is re-timed to the player's own onsets (no tempo: every written onset sits where it was played), and the
// guitar analysis runs on that: strums clustered and checked for completeness, an unpitched onset is never a right
// pitch, bends / vibrato / legato judged on their notes. Timing is not judged. Pure.

import { expectedGroups } from './rubato';
import { analyzeGuitarTake, UNPITCHED, type GFrame, type GuitarFactor, type GuitarTakeMetrics } from './guitarAnalyze';
import type { Drill, ExpNote, NoteResult, PlayedNote, Verdict } from './types';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
/** Onsets closer than this are one strum (the timed take's strum window). */
const STRUM_MS = 90;
/** The free-time bpm of the re-timed drill: one beat = one second, so beats are the played seconds. */
const FREE_BPM = 60;
/** Only these guitar lines judge a free-time take (gaps between chords are free time's business). */
const FREE_FACTORS: GuitarFactor['id'][] = ['unclear', 'chord', 'recognize', 'bend', 'vibrato', 'legato', 'mute'];
const RANK: Record<Verdict, number> = { clean: 0, almost: 1, not: 2 };

/** Played onsets clustered into strums (in time order): onset, members. */
function clusters(played: PlayedNote[]): { at: number; ps: PlayedNote[] }[] {
  const out: { at: number; ps: PlayedNote[] }[] = [];
  for (const p of [...played].sort((a, b) => a.on - b.on)) {
    const last = out[out.length - 1];
    if (last && p.on - last.at <= STRUM_MS) last.ps.push(p);
    else out.push({ at: p.on, ps: [p] });
  }
  return out;
}

/** The pitch range a written note glides through (bend / pre-bend / vibrato), or null. */
function glideOf(n: ExpNote): [number, number] | null {
  const t = n.technique;
  if (t !== 'bend' && t !== 'prebend' && t !== 'vibrato') return null;
  const k = Math.max(1, Math.ceil((n.bendCents ?? 100) / 100));
  const fret = t === 'prebend' ? n.pitch - k : n.pitch;
  return [fret, fret + k];
}

/**
 * How well a played strum stands for a written onset: its pitched members that fit (same pitch, or the same pitch class
 * within two octaves — a tracker's octave slip), each written note once; an unpitched strum is a placeholder (0.5).
 */
function fit(want: ExpNote[], ps: PlayedNote[]): number {
  const pitched = ps.filter((p) => p.pitch !== UNPITCHED);
  if (!pitched.length) return 0.5;
  const left = [...want];
  let s = 0;
  for (const p of pitched) {
    const k = left.findIndex((n) => n.pitch === p.pitch);
    const j = k >= 0 ? k : left.findIndex((n) => mod12(n.pitch) === mod12(p.pitch) && Math.abs(n.pitch - p.pitch) <= 24);
    if (j >= 0) {
      s += 1;
      left.splice(j, 1);
    }
  }
  return s;
}

/**
 * Grade a guitar take with no click. `frames` = the microphone's (empty for MIDI), `pitchTrace` = a MIDI guitar's bend
 * trace. The result reads like analyzeFree's (no timing, bpm 0), with the guitar measures under `guitar`.
 */
export function analyzeGuitarFree(drill: Drill, played: PlayedNote[], frames: GFrame[] = [], o: { pitchTrace?: GFrame[] } = {}): GuitarTakeMetrics {
  const E = expectedGroups(drill).map((g) => ({ beat: g.beat, notes: g.idx.map((i) => drill.notes[i]), idx: g.idx }));
  const P = clusters(played);
  const n = E.length;
  const m = P.length;
  // Weighted LCS in order: each written onset takes at most one played strum.
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const f = fit(E[i - 1].notes, P[j - 1].ps);
      score[i][j] = Math.max(score[i - 1][j], score[i][j - 1], f > 0 ? score[i - 1][j - 1] + f : 0);
    }
  const take: (number | null)[] = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    const f = fit(E[i - 1].notes, P[j - 1].ps);
    if (f > 0 && score[i][j] === score[i - 1][j - 1] + f) {
      take[i - 1] = j - 1;
      i--;
      j--;
    } else if (score[i][j] === score[i - 1][j]) i--;
    else j--;
  }
  // Glides: a strum left over between a bend / vibrato note and the next written onset, all inside the glide's range,
  // is the bend sounding (a pitch tracker's legato onsets), not an extra note.
  const glide = new Set<number>();
  take.forEach((j, i) => {
    if (j === null) return;
    const r = E[i].notes.map(glideOf).find(Boolean);
    if (!r) return;
    const nextJ = take.slice(i + 1).find((x) => x !== null) ?? m;
    for (let k = j + 1; k < nextJ; k++) if (P[k].ps.every((p) => p.pitch === UNPITCHED || (p.pitch >= r[0] && p.pitch <= r[1]))) glide.add(k);
  });
  const kept = played.filter((p) => !P.some((c, k) => glide.has(k) && c.ps.includes(p)));
  // The written onsets re-timed to the played ones; one not played sits between its neighbours (it is simply missed).
  const known = take.map((j) => (j === null ? null : P[j].at));
  const at = known.map((t, i) => {
    if (t !== null) return t;
    const a = known.slice(0, i).reverse().findIndex((x) => x !== null);
    const b = known.slice(i + 1).findIndex((x) => x !== null);
    const ta = a >= 0 ? known[i - 1 - a]! : null;
    const tb = b >= 0 ? known[i + 1 + b]! : null;
    if (ta !== null && tb !== null) return ta + ((tb - ta) * (a + 1)) / (a + b + 2);
    if (ta !== null) return ta + 600 * (a + 1);
    if (tb !== null) return Math.max(0, tb - 600 * (b + 1));
    return 600 * i;
  });
  // Keep the order strictly increasing (a missed onset between two very close ones).
  for (let i = 1; i < at.length; i++) if (at[i] <= at[i - 1]) at[i] = at[i - 1] + 1;
  const sec = (ms: number) => ms / 1000;
  const map = new Map<ExpNote, ExpNote>();
  const notes: ExpNote[] = [];
  E.forEach((g, i) => {
    const next = i + 1 < at.length ? at[i + 1] : at[i] + 800;
    for (const x of g.notes) {
      const w: ExpNote = { ...x, beat: sec(at[i]), dur: Math.max(0.05, sec(next - at[i])) };
      map.set(w, x);
      notes.push(w);
    }
  });
  const end = Math.max(1, ...notes.map((x) => x.beat + x.dur));
  // A plain re-timed drill: no swing, meters, tempo map, band, rules or evenness — only the notes and their guitar marks.
  const warped: Drill = {
    ...drill,
    notes,
    beats: Math.ceil(end),
    meter: 4,
    spec: { ...drill.spec, swing: false },
    goal: { evenness: false, hands: false },
    swingRatio: undefined,
    pulse: undefined,
    groups: undefined,
    meters: undefined,
    tempoMap: undefined,
    phrase: undefined,
    listen: undefined,
    band: undefined,
    drums: undefined,
    freeAbove: undefined,
    freeFrom: undefined,
  };
  const g = analyzeGuitarTake(warped, FREE_BPM, kept, undefined, frames, o);
  const perNote: NoteResult[] = g.perNote.map((r) => ({ ...r, exp: map.get(r.exp) ?? r.exp, dev: null }));
  const total = perNote.length;
  const okN = perNote.filter((r) => r.ok).length;
  const accuracy = total ? okN / total : 1;
  const wrong = g.wrong;
  const missing = total - okN;
  // analyzeFree's rule (every note in place, few wrong), then the guitar lines that make sense untimed.
  let verdict: Verdict = accuracy >= 0.95 && wrong <= Math.max(1, Math.round(total * 0.05)) ? 'clean' : accuracy >= 0.8 ? 'almost' : 'not';
  let why =
    verdict === 'clean'
      ? { en: 'Every note in place — time comes next.', he: 'כל הצלילים במקום — עכשיו מוסיפים זמן.' }
      : missing >= wrong
        ? { en: `${missing} notes missed — slowly, note by note.`, he: `${missing} צלילים חסרים — לאט, צליל אחרי צליל.` }
        : { en: `${wrong} wrong notes — take your time, look ahead.`, he: `${wrong} צלילים שגויים — בלי למהר, להסתכל קדימה.` };
  const fs = (g.guitar.factors ?? []).filter((f) => FREE_FACTORS.includes(f.id));
  for (const f of fs)
    if (RANK[f.verdict] > RANK[verdict]) {
      verdict = f.verdict;
      why = { en: f.en, he: f.he };
    }
  // The misses are the guitar's (onsets not heard clearly, a string that didn't sound): say that, not "notes missed".
  const explained = g.guitar.unclear + (fs.some((f) => f.id === 'chord') ? (g.guitar.chordMiss?.uncredited.length ?? 0) : 0);
  const line = fs.find((f) => f.id === 'chord') ?? fs.find((f) => f.id === 'unclear');
  if (verdict !== 'clean' && line && explained >= missing && wrong === 0) why = { en: line.en, he: line.he };
  return {
    ...g,
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
    hesitations: 0,
    glitches: [],
    perNote,
    extras: undefined,
    verdict,
    why,
    guitar: { ...g.guitar, changeGapMs: null, changesPerMin: null },
  };
}

/**
 * Where a guitar player is in a free-time take (the staff's now-cue waits for them): a strum that fits the written onset
 * — any of its pitches, or an unpitched strum on a chord — moves on, so a chord heard as one pitch is not a wall.
 */
export function guitarFreeProgress(drill: Drill, played: PlayedNote[]): number {
  const E = expectedGroups(drill).map((g) => g.idx.map((i) => drill.notes[i]));
  const beats = expectedGroups(drill).map((g) => g.beat);
  let gi = 0;
  for (const c of clusters(played)) {
    if (gi >= E.length) break;
    const pitched = c.ps.filter((p) => p.pitch !== UNPITCHED);
    if (pitched.length ? fit(E[gi], pitched) > 0 : E[gi].length > 1) gi++;
  }
  return gi >= E.length ? drill.beats : beats[gi];
}
