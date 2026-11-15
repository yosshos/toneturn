// Technique drills: one take → metrics + verdict (spec AI §6, research §5.2). Pure.
// Thresholds are the research's starting numbers (⚙, not yet calibrated with the owner's playing).

import type { Drill, DrillCalibration, DynamicsGoal, ExpNote, Hand, NoteResult, PlayedNote, TakeMetrics, Verdict } from './types';
import { vlDistance } from './generate';
import { hasTimeline, timeMapOf, timelineMs } from './timeline';
import { analyzeVoiceLeadTake } from './voiceLeadAnalyze';
import { analyzeHeldChoiceTake } from './ctFreeAnalyze';
import { analyzeFreeCompTake } from './freeCompAnalyze';
import { analyzePhraseTake } from './phraseGrade';
import { RULE_NAME, ruleCheck } from '../improvRules';
import { RULE_CARDS, TARGET_CARDS, cardKept, changeLandings, targetPcs, type CNote } from '../ruleCards';
import { phraseOrg, playRestCheck, PHRASE_BAND_NAME, type PhraseOrgReport } from '../phraseOrg';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
/** Borrowing feedback: the voices of a 4-note chord, top to bottom. */
const VOICE_EN = ['Soprano', 'Alto', 'Tenor', 'Bass'];
const VOICE_HE = ['הסופרן', 'האלט', 'הטנור', 'הבס'];
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
  // The prog timeline (meters per bar, a tempo map): the beat's place on the drill's own time map.
  if (hasTimeline(drill)) return timelineMs(drill, beat, bpm);
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
  const valid = played.map((_, j) => j).filter((j) => played[j].on >= -beatMs && played[j].on <= (hasTimeline(drill) ? expTimeMs(drill, drill.beats + 1, bpm) : (drill.beats + 1) * beatMs));
  const match: (number | null)[] = exp.map(() => null);
  const ok: boolean[] = exp.map(() => false);
  const used = new Set<number>();
  let wrong = 0;

  // 0) PIANO_JAZZ landings in free bars (trading fours): any of the chord's tones, any octave, within a quarter beat —
  // the nearest such note in time; a note there of another pitch class is matched but wrong.
  exp.forEach((e, i) => {
    if (!e.land) return;
    const near = valid.filter((j) => !used.has(j) && Math.abs(played[j].on - T[i]) <= beatMs / 4).sort((a, b) => Math.abs(played[a].on - T[i]) - Math.abs(played[b].on - T[i]));
    const good = near.filter((j) => e.land!.includes(mod12(played[j].pitch)));
    const j = good[0] ?? near[0];
    if (j === undefined) return;
    used.add(j);
    match[i] = j;
    ok[i] = good.length > 0;
  });

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
      // Any octave (PIANO_AUDIT A5): the same pitch class nearest in pitch, so an LH bass an octave up isn't paired with
      // the RH's note of that name (which scrambled the voice-leading measure).
      if (j === undefined)
        j = members
          .filter((m) => !taken.has(m) && mod12(played[m].pitch) === mod12(e.pitch))
          .sort((a, b) => Math.abs(played[a].pitch - e.pitch) - Math.abs(played[b].pitch - e.pitch))[0];
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
    if ((e.chordId !== undefined && sets.has(e.chordId)) || e.land) return;
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
    if (match[i] !== null || (e.chordId !== undefined && sets.has(e.chordId)) || e.land) return;
    const twin = exp.findIndex((o, k) => k !== i && match[k] !== null && o.pitch === e.pitch && Math.abs(o.beat - e.beat) < EPS);
    if (twin >= 0) {
      match[i] = match[twin];
      ok[i] = true;
    }
  });
  // Free bars: the player's own notes are judged by freeStats, never "wrong".
  for (const j of valid) if (!used.has(j) && !takenJ.has(j) && !inFreeBars(drill, bpm, played[j].on)) wrong++;
  return { match, ok, wrong, valid };
}

/** PIANO_JAZZ: is a played onset (ms) inside the player's free bars (from a quarter beat before each window)? */
function inFreeBars(drill: Drill, bpm: number, on: number): boolean {
  const fr = drill.goal.free;
  if (!fr) return false;
  const q = 15000 / bpm;
  return fr.windows.some(([a, b]) => on >= expTimeMs(drill, a, bpm) - q && on < expTimeMs(drill, b, bpm) - q);
}

/**
 * PIANO_JAZZ: the free bars of a trade. A note counts as inside when its pitch class is in the chord's scale at its
 * beat (or the half beat after: an anticipation), or when it moves by a half step to the next note that is. Bars
 * with fewer than `minPerBar` notes a bar (laying out instead of trading) are counted too.
 */
export function freeStats(drill: Drill, bpm: number, played: PlayedNote[]): { n: number; out: number; thinBars: number } | null {
  const fr = drill.goal.free;
  if (!fr) return null;
  const beatMs = 60000 / bpm;
  const ns = played.filter((p) => inFreeBars(drill, bpm, p.on)).sort((a, b) => a.on - b.on);
  const pcsAt = (beat: number): number[] => fr.scale.find((x) => beat >= x.from - 1e-6 && beat < x.to - 1e-6)?.pcs ?? [];
  const inside = (p: PlayedNote) => {
    const b = hasTimeline(drill) ? timeMapOf(drill, bpm).beatAt(p.on) : p.on / beatMs;
    return pcsAt(b).includes(mod12(p.pitch)) || pcsAt(b + 0.5).includes(mod12(p.pitch));
  };
  let out = 0;
  ns.forEach((p, k) => {
    if (inside(p)) return;
    const nx = ns[k + 1];
    if (nx && nx.on - p.on <= beatMs * 1.05 && Math.abs(nx.pitch - p.pitch) === 1 && inside(nx)) return;
    out++;
  });
  let thinBars = 0;
  const meter = drill.meter || 4;
  for (const [a, b] of fr.windows) {
    const lo = expTimeMs(drill, a, bpm) - beatMs / 4;
    const hi = expTimeMs(drill, b, bpm) - beatMs / 4;
    const cnt = ns.filter((p) => p.on >= lo && p.on < hi).length;
    const bars = (b - a) / meter;
    if (cnt < fr.minPerBar * bars) thinBars += Math.ceil((fr.minPerBar * bars - cnt) / fr.minPerBar);
  }
  return { n: ns.length, out, thinBars };
}

/**
 * AUDIT-DEPTH-3 C5: the improvised notes of a take — at or above `drill.freeAbove` (LH comps, RH improvises), else
 * inside the free bars — as rule-card notes: beats on the drill's time map, swung 8ths straightened (2/3 → 1/2).
 */
export function improvNotes(drill: Drill, bpm: number, played0: PlayedNote[]): CNote[] {
  const beatMs = 60000 / bpm;
  const ns = drill.freeAbove !== undefined ? played0.filter((p) => p.pitch >= drill.freeAbove!) : drill.goal.free ? played0.filter((p) => inFreeBars(drill, bpm, p.on)) : played0;
  const map = hasTimeline(drill) ? timeMapOf(drill, bpm) : null;
  const beatOf = (ms: number) => {
    const b = map ? map.beatAt(ms) : ms / beatMs;
    if (!drill.spec.swing) return b;
    const f = b - Math.floor(b);
    return Math.floor(b) + (f <= 2 / 3 ? f * 0.75 : 0.5 + (f - 2 / 3) * 1.5);
  };
  return ns
    .map((p) => {
      const beat = beatOf(p.on);
      const end = p.off !== null && p.off > p.on ? beatOf(p.off) : beat + 0.45;
      return { beat, dur: Math.max(0.05, end - beat), midi: p.pitch, ...(p.vel !== undefined && p.vel !== 64 ? { vel: p.vel } : {}) };
    })
    .sort((a, b) => a.beat - b.beat);
}

/** AUDIT-DEPTH-3 C5: every rule card of an improvised take (goal.improv). Cards the input can't measure (total 0) are left out. */
export function improvChecks(drill: Drill, bpm: number, played0: PlayedNote[]): NonNullable<TakeMetrics['improv']> {
  const g = drill.goal.improv;
  if (!g) return [];
  const notes = improvNotes(drill, bpm, played0);
  const ctx = { notes, spans: g.spans, meter: drill.meter || 4, bpm, opt: { ...(g.licks?.length ? { lickIds: g.licks } : {}), ...(drill.freeAbove !== undefined ? { split: drill.freeAbove } : {}) } };
  const out: NonNullable<TakeMetrics['improv']> = [];
  for (const card of g.cards) {
    const c = ruleCheck(card, ctx);
    if (c.total === 0) {
      // A card that needs what this input can't give (velocity, the string, a melody) is not judged; any other card
      // with nothing to judge (no notes, no device played) is broken.
      if (RULE_CARDS[card]?.needs && notes.length) continue;
      out.push({ card, ok: 0, total: 1, pass: false });
      continue;
    }
    const pass = RULE_CARDS[card] ? cardKept(card, c) : c.ok / c.total >= 0.8 - 1e-9;
    // Slice 8: where the card broke, by bar (the chart's corner tabs).
    const bars = c.miss?.length ? [...new Set(c.miss.map((b) => Math.floor(b / ctx.meter + 1e-6)))].sort((a, b) => a - b) : undefined;
    out.push({ card, ok: c.ok, total: c.total, pass, ...(bars ? { bars } : {}) });
  }
  return out;
}

/** Slice 8: the note landed on at each chord change, for the target cards of an improvised take (empty without one). */
export function improvLandings(drill: Drill, bpm: number, played0: PlayedNote[]): NonNullable<TakeMetrics['landings']> {
  const g = drill.goal.improv;
  const want = g?.cards.map((c) => TARGET_CARDS[c]).find(Boolean);
  if (!g || !want) return [];
  const meter = drill.meter || 4;
  const ctx = { notes: improvNotes(drill, bpm, played0), spans: g.spans, meter, bpm };
  return changeLandings(ctx).map((l) => {
    const target = targetPcs(l.span, want);
    const landed = l.landed ? l.landed.midi : null;
    return { bar: Math.floor(l.at / meter + 1e-6), target, landed, hit: landed !== null && target.includes(((landed % 12) + 12) % 12) };
  });
}

/** Is this take improvised (rule cards, free bars, a free right hand, or a phrasing rule)? */
export const isImprovised = (drill: Drill): boolean => !!(drill.goal.improv || drill.goal.free || drill.goal.phrase || drill.goal.playRest || drill.freeAbove !== undefined);

/**
 * Siskind / MTNA rubric (phraseOrg.ts): the phrasing report of an improvised take (null for written takes). With free
 * bars, the windows are joined end to end (the band's bars between them are not the player's rests).
 */
export function improvPhrasing(drill: Drill, bpm: number, played0: PlayedNote[]): { report: PhraseOrgReport; playRest?: { ok: number; total: number } } | null {
  if (!isImprovised(drill)) return null;
  const meter = drill.meter || 4;
  let notes = improvNotes(drill, bpm, played0).map((n) => ({ beat: n.beat, dur: n.dur, midi: n.midi }));
  let totalBeats = drill.beats;
  let spans = drill.goal.improv?.spans;
  const wins = drill.freeAbove === undefined && drill.goal.free ? drill.goal.free.windows : null;
  if (wins?.length) {
    const ws = [...wins].sort((a, b) => a[0] - b[0]);
    let off = 0;
    const mapped: typeof notes = [];
    const ms: NonNullable<typeof spans> = [];
    for (const [a, b] of ws) {
      for (const n of notes) if (n.beat >= a - 0.25 && n.beat < b) mapped.push({ ...n, beat: Math.max(0, n.beat - a + off) });
      for (const sp of spans ?? []) {
        const lo = Math.max(sp.at, a);
        const hi = Math.min(sp.at + sp.beats, b);
        if (hi > lo) ms.push({ ...sp, at: lo - a + off, beats: hi - lo });
      }
      off += b - a;
    }
    notes = mapped;
    if (spans) spans = ms;
    totalBeats = off;
  }
  const report = phraseOrg(notes, { totalBeats, meter, ...(spans ? { spans } : {}) });
  const pr = drill.goal.playRest;
  return { report, ...(pr ? { playRest: playRestCheck(notes, { play: pr.play, rest: pr.rest, meter, totalBeats }) } : {}) };
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

/**
 * Bass timing thresholds (BASS_CURRICULUM §4, BASS_AUDIT A7): mic SD ≤ 28 ms and CV ≤ .06 at every tempo (a 25 ms
 * frame clock can't do better at fast 16ths); MIDI the tempo-band thresholds, but never stricter than SD 20 / CV .06.
 */
export function bassThresholds(band: number, mic: boolean): { cv: number; sd: number } {
  if (mic) return { cv: 0.06, sd: 28 };
  const th = thresholds(band);
  return { cv: Math.max(0.06, th.cv), sd: Math.max(20, th.sd) };
}

/**
 * The smallest IOI spread (ms, SD of the inter-onset intervals) the evenness rule asks for (PIANO_AUDIT A1). A CV
 * alone asked 3 % of a 16th at T5+ — 5 ms at ♩ = 88, below the ~6 ms just-noticeable timing shift (Friberg & Sundberg
 * 1995) and far below what professional pianists play (Jabusch et al. 2004) — so no human take could pass a fast level.
 * The limit is now max(CV × IOI, this floor). By microphone the 25 ms frame clock alone gives ~10 ms of IOI spread.
 */
export const IOI_FLOOR_MS = { midi: 12, mic: 25 } as const;

/**
 * VOICE_CURRICULUM P2: a sung onset is only good to about ±25–40 ms on a phone (the attack of a consonant, the
 * settling of a pitch after a legato move), and a sung eighth line is often legato — so a sung take (licks on the
 * voice) keeps the pitch rule but gets the voice's timing limits: onset SD ≤ 40 ms (worst onset 2.5 × that) and a
 * hesitation only when an interval is 1.8 × its share (an instrument: 1.5).
 */
export const VOICE_TIMING = { sd: 40, hesitation: 1.8 } as const;

/** What a microphone can't measure on a piano drill: loudness (dynamics, accents, voicing, balance), key release (articulation) and the pedal. */
export function micUnmeasurable(drill: Pick<Drill, 'goal' | 'notes'> & { spec?: Drill['spec'] }): ('dynamics' | 'articulation' | 'pedal' | 'voicing')[] {
  const out: ('dynamics' | 'articulation' | 'pedal' | 'voicing')[] = [];
  // Voice leading on the piano: the microphone hears the chord, not which voicing (octave, inversion) was chosen.
  if (drill.goal.vl && !drill.goal.vl.strings && drill.spec?.instrument !== 'guitar') out.push('voicing');
  // One note, many chords (your own chords): which voicing was played needs MIDI too.
  if (drill.goal.ct) out.push('voicing');
  if (drill.goal.dynamics || drill.notes.some((n) => n.accent)) out.push('dynamics');
  if (drill.goal.articulation || drill.goal.handArt) out.push('articulation');
  if (drill.goal.pedal) out.push('pedal');
  return out;
}

/**
 * Measure one take against a drill and give the verdict with the worst factor. `opts.thresholds` overrides the
 * tempo-band CV / SD limits (bass, A7). `opts.mic`: the piano was heard by the microphone (no velocity, no key
 * release): looser timing limits, and a drill whose goal needs MIDI never passes (only measured practice counts).
 */
export function analyzeTake(drill: Drill, bpm: number, played0: PlayedNote[], cal?: DrillCalibration, opts: { thresholds?: { cv: number; sd: number }; mic?: boolean; voice?: boolean; /** Untimed take: notes only (voice leading: each voicing when ready). */ rubato?: boolean } = {}): TakeMetrics {
  // Voice leading (k-vl / g-vl): the voicing chosen at each chord, graded by type + smallest motion (voiceLeadAnalyze.ts).
  // By microphone the piano can't tell which voicing was played: the take is not measured (below, like loudness goals).
  if (drill.goal.vl && !opts.mic) return analyzeVoiceLeadTake(drill, bpm, played0, { rubato: opts.rubato });
  // One note, many chords — the player's own chords under the held note (ctFreeAnalyze.ts).
  if (drill.goal.ct && !opts.mic) return analyzeHeldChoiceTake(drill, bpm, played0, { rubato: opts.rubato });
  // Phrases by ear (phraseDrills.ts): note by note with the transcription coach's comparer, partial credit.
  if (drill.phrase) return analyzePhraseTake(drill, bpm, played0);
  // Free comping by rule (Siskind, soloPiano.ts): the player's own rhythm, graded by density / variety / repeats /
  // anticipations — the written notes are only a model.
  if (drill.goal.freeComp) return analyzeFreeCompTake(drill, bpm, played0);
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
  // PIANO_AUDIT A4: the SD over the onsets (a chord's notes are one onset, at their mean), not over the notes — four
  // notes of one chord counted as four samples made 3 chords look like 12 and halved a sloppy take's SD.
  const onsetDev = new Map<string, number[]>();
  exp.forEach((n, i) => {
    if (dev[i] === null) return;
    const k = `${n.hand}:${Math.round(n.beat * 1e4)}`;
    onsetDev.set(k, [...(onsetDev.get(k) ?? []), dev[i]!]);
  });
  const onsetDevs = [...onsetDev.values()].map(mean);
  // Sample SD (n − 1): a drill of 3–5 chords has only that many onsets.
  const timingSD = onsetDevs.length >= 3 ? sd(onsetDevs) * Math.sqrt(onsetDevs.length / (onsetDevs.length - 1)) : null;
  // The onset farthest from the take's own mean (a late chord in a short drill is heard, whatever the SD says).
  const worstOnset = onsetDevs.length >= 3 ? Math.max(...onsetDevs.map((x) => Math.abs(x - mean(onsetDevs)))) : null;

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
      if (rel > (opts.voice ? VOICE_TIMING.hesitation : 1.5)) hesitations++;
      if (goal.evenness && rel > 1.15) {
        const thumb = !fingered || x.o.idx.some((i) => exp[i].finger === 1) || x.prev.idx.some((i) => exp[i].finger === 1);
        if (thumb) glitches.push(x.o.idx[0]);
      }
    }
    if (goal.evenness) {
      // The spread of the IOI errors in ms against the mean IOI (PIANO_AUDIT A1). For even notes this is the IOI CV;
      // in dotted / mixed rhythms a short note's error no longer weighs 3× (the old ratio CV failed a steady dotted take).
      const dts = rs.map((x) => x.o.t - x.prev.t);
      const errs = rs.map((x, k) => x.r * dts[k] - med * dts[k]);
      cv[h] = sd(errs) / (med * mean(dts));
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

  // Hand independence (k-indep): held notes kept down; a different touch per hand.
  let holdShort = 0;
  let holdN = 0;
  if (goal.holds && !opts.mic) {
    exp.forEach((n, i) => {
      const j = match[i];
      if (!n.hold || j === null || played[j].off === null) return;
      holdN++;
      const need = goal.holds! * n.dur * beatMs;
      if (played[j].off! - played[j].on < need) holdShort++;
    });
  }
  const handArt: { hand: Hand; art: 'legato' | 'staccato' | 'portato'; kot: number | null; kdr: number | null }[] = [];
  if (goal.handArt) {
    for (const h of ['R', 'L'] as Hand[]) {
      const art = goal.handArt[h];
      if (!art) continue;
      const os = series[h].filter((o) => o.idx.length === 1);
      const kots: number[] = [];
      const kdrs: number[] = [];
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
      handArt.push({ hand: h, art, kot: kots.length ? median(kots) : null, kdr: kdrs.length ? median(kdrs) : null });
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
  const th = { ...thresholds(tempoBand(nps)), ...(opts.thresholds ?? {}) };
  // By microphone (no thresholds of its own): the frame clock's limits, as the bass by mic (A7).
  if (opts.mic && !opts.thresholds) {
    th.sd = Math.max(th.sd, 28);
    th.hands = Math.max(th.hands, 35);
  }
  if (opts.voice) th.sd = Math.max(th.sd, VOICE_TIMING.sd);
  // A1: the evenness limit never asks for less IOI spread than the floor (ms) at the take's written IOI. (Callers with
  // their own limits — the bass, A7 — keep them.)
  const ioiMs = 1000 / Math.max(0.1, nps);
  if (!opts.thresholds) th.cv = Math.max(th.cv, IOI_FLOOR_MS[opts.mic ? 'mic' : 'midi'] / ioiMs);

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
  if (worstOnset !== null && worstOnset > 2.5 * th.sd)
    F.push({
      sev: worstOnset / (2.5 * th.sd),
      en: `One note far off the beat (${Math.round(worstOnset)} ms)`,
      he: `צליל אחד רחוק מהפעמה (${Math.round(worstOnset)} ms)`,
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
        en: `Off the ${lvl} level (${pct(bandHit)}% in band)`,
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
      en: `Staccato too long (${pct(kdr)}% of the gap)`,
      he: `סטקטו ארוך מדי (${pct(kdr)}%)`,
    });
  if (goal.articulation === 'portato' && kdr !== null) {
    const off = kdr < 0.6 ? 0.6 - kdr : kdr > 0.8 ? kdr - 0.8 : 0;
    F.push({
      sev: off === 0 ? 0.5 : 1 + off / 0.1,
      en: `Portato length off (${pct(kdr)}%)`,
      he: `אורך הפורטטו לא מדויק (${pct(kdr)}%)`,
    });
  }
  if (holdN > 0 && holdShort > 0) {
    // Borrowing: name the voice that let go (oblique motion — the other voices hold).
    const v = exp.find((n, i) => n.hold && n.vox !== undefined && match[i] !== null && played[match[i]!].off !== null && played[match[i]!].off! - played[match[i]!].on < goal.holds! * n.dur * beatMs)?.vox;
    F.push({
      sev: 1 + (holdShort / holdN) * 4,
      en: v !== undefined ? `${VOICE_EN[v]} didn't hold (${holdShort} of ${holdN} held notes let go early)` : `Held notes let go early (${holdShort} of ${holdN})`,
      he: v !== undefined ? `${VOICE_HE[v]} לא החזיק (${holdShort} מתוך ${holdN} צלילים מוחזקים שוחררו מוקדם)` : `צלילים מוחזקים שוחררו מוקדם (${holdShort} מתוך ${holdN})`,
    });
  }
  // Borrowing: a borrowed or returning note missed — name the voice.
  {
    const miss = exp.findIndex((n, i) => n.vox !== undefined && n.chordId === undefined && !ok[i]);
    if (miss >= 0) {
      const n = exp[miss];
      F.push({
        sev: 2,
        en: n.ret ? `${VOICE_EN[n.vox!]} didn't return` : `${VOICE_EN[n.vox!]} didn't move to the borrowed note`,
        he: n.ret ? `${VOICE_HE[n.vox!]} לא חזר` : `${VOICE_HE[n.vox!]} לא עבר לצליל המושאל`,
      });
    }
  }
  for (const ha of handArt) {
    const hn = ha.hand === 'R' ? 'RH' : 'LH';
    const hh = ha.hand === 'R' ? 'יד ימין' : 'יד שמאל';
    if (ha.art === 'legato' && ha.kot !== null && ha.kot < 0) F.push({ sev: -ha.kot / 10, en: `${hn} not legato (gaps ${Math.round(-ha.kot)} ms)`, he: `${hh} לא לגאטו (רווחים של ${Math.round(-ha.kot)} ms)` });
    if (ha.art === 'staccato' && ha.kdr !== null) F.push({ sev: ha.kdr / 0.5, en: `${hn} staccato too long (${pct(ha.kdr)}%)`, he: `${hh}: סטקטו ארוך מדי (${pct(ha.kdr)}%)` });
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
  // PIANO_JAZZ: the free bars of a trade — inside the changes, and really played.
  const fs = freeStats(drill, bpm, played);
  if (fs) {
    if (fs.thinBars > 0)
      F.push({
        sev: 1 + fs.thinBars,
        en: `Too few notes in your bars (${fs.thinBars} bar${fs.thinBars === 1 ? '' : 's'} nearly empty)`,
        he: `מעט מדי צלילים בתיבות שלכם (${fs.thinBars} תיבות כמעט ריקות)`,
      });
    if (fs.n >= 4 && fs.out > 0)
      F.push({
        sev: fs.out / fs.n / 0.15,
        en: `Notes outside the chords (${pct(fs.out / fs.n)}% of your line)`,
        he: `צלילים מחוץ לאקורדים (${pct(fs.out / fs.n)}% מהקו שלכם)`,
      });
  }
  // AUDIT-DEPTH-3 C5: the improvised notes kept the rule cards (each broken card is a factor, worse the further off).
  const improv = improvChecks(drill, bpm, played0);
  for (const c of improv) {
    if (c.pass) continue;
    const need = RULE_CARDS[c.card]?.pass ?? 0.8;
    const share = c.total ? c.ok / c.total : 0;
    const nm = (RULE_NAME as Record<string, { en: string; he: string }>)[c.card] ?? { en: c.card, he: c.card };
    F.push({
      sev: 1.2 + Math.max(0, need - share) * 6,
      en: `Rule broken: ${nm.en} (${c.ok}/${c.total})`,
      he: `כלל לא נשמר: ${nm.he} (${c.ok}/${c.total})`,
    });
  }
  // Siskind / MTNA rubric (phraseOrg.ts): the phrasing of every improvised take is reported; goal.phrase and
  // goal.playRest turn it into a pass rule.
  const po = improvPhrasing(drill, bpm, played0);
  if (po && goal.phrase && !goal.phrase.pass.includes(po.report.band))
    F.push({
      sev: 1.4,
      en: `Phrasing ${PHRASE_BAND_NAME[po.report.band].en}: ${po.report.tip.en}`,
      he: `משפטים: ${PHRASE_BAND_NAME[po.report.band].he}. ${po.report.tip.he}`,
    });
  if (po?.playRest) {
    const sh = po.playRest.total ? po.playRest.ok / po.playRest.total : 0;
    if (sh < 0.85)
      F.push({
        sev: sh < 0.6 ? 2 : 1.4,
        en: `Play / rest pattern kept in ${po.playRest.ok} of ${po.playRest.total} bars`,
        he: `תבנית הנגינה והמנוחה נשמרה ב־${po.playRest.ok} מתוך ${po.playRest.total} תיבות`,
      });
  }
  // Siskind's registers (soloPiano.ts, [PSJP-A]): a written note missed but its pitch class played an octave or two
  // away, near its beat — the voicing was played in the wrong register ("muddy" below C3, "thin" above G4).
  if (goal.register) {
    let low = 0;
    let high = 0;
    exp.forEach((e, i) => {
      if (ok[i]) return;
      const near = played.find((p) => p.pitch !== e.pitch && mod12(p.pitch) === mod12(e.pitch) && Math.abs(p.on - T[i]) <= beatMs / 2);
      if (!near) return;
      if (near.pitch < e.pitch) low++;
      else high++;
    });
    if (low + high > 0)
      F.push({
        sev: 1.3,
        en: low >= high ? `Too low (${low} notes): muddy — keep the 3rd and 7th between C3 and G4` : `Too high (${high} notes): thin — keep the 3rd and 7th between C3 and G4`,
        he: low >= high ? `נמוך מדי (${low} צלילים): עכור — טרצה וספטימה בין C3 ל־G4` : `גבוה מדי (${high} צלילים): דק — טרצה וספטימה בין C3 ל־G4`,
      });
  }
  if (hesitations > 0)
    F.push({
      sev: hesitations === 1 ? 1.4 : 2,
      en: `${hesitations} hesitation${hesitations === 1 ? '' : 's'}`,
      he: `${hesitations} היסוסים`,
    });

  // A2: by microphone every note sounds at velocity 64 with no release, so a loudness / articulation / pedal goal would
  // pass on the notes alone (an "even p" take "in band" at 64). Such a take is not measured and never passes.
  const unmeasured = opts.mic ? micUnmeasurable(drill) : [];
  if (unmeasured.length)
    F.push({
      sev: 999,
      en: `Needs a MIDI keyboard: the microphone can't measure ${unmeasured.map((x) => ({ dynamics: 'loudness', articulation: 'key release', pedal: 'the pedal', voicing: 'which voicing you chose' })[x]).join(' or ')}`,
      he: `צריך מקלדת MIDI: המיקרופון לא מודד ${unmeasured.map((x) => ({ dynamics: 'עוצמה', articulation: 'שחרור קלידים', pedal: 'פדל', voicing: 'איזה קול בחרתם' })[x]).join(' או ')}`,
    });

  // Barry Harris lines are judged by the goal (chord tones on the beats), so small line changes are allowed.
  const harris = (drill.spec.family === 'harris' || drill.spec.family === 'k-bebop') && goal.chordTonesOnBeats && chordToneOnBeats === 1;
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

  // An octave-shifted keyboard (small MIDI keyboards start an octave low or high): most expected notes have a played
  // note at their time, an exact number of octaves away — say so, instead of "everything wrong".
  const octaveShift = (() => {
    if (accuracy > 0.5 || nExp < 3) return undefined;
    const counts = new Map<number, number>();
    exp.forEach((e, i) => {
      if (ok[i]) return;
      const near = played.filter((p) => Math.abs(p.on - T[i]) <= Math.max(120, beatMs * 0.45));
      const d = near.map((p) => p.pitch - e.pitch).find((x) => x !== 0 && x % 12 === 0 && Math.abs(x) <= 24);
      if (d !== undefined) counts.set(d, (counts.get(d) ?? 0) + 1);
    });
    const best = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
    return best && best[1] >= Math.max(3, nExp * 0.5) ? best[0] : undefined;
  })();
  if (octaveShift !== undefined) {
    const n = Math.abs(octaveShift) / 12;
    why =
      octaveShift < 0
        ? { en: `You played ${n === 1 ? "an octave" : n + " octaves"} lower than written — your keyboard may be shifted. Fix it below or in Settings → MIDI.`, he: `ניגנתם ${n === 1 ? "אוקטבה" : n + " אוקטבות"} נמוך מהכתוב — כנראה שהמקלדת מוזזת. אפשר לתקן כאן למטה או בהגדרות ← MIDI.` }
        : { en: `You played ${n === 1 ? "an octave" : n + " octaves"} higher than written — your keyboard may be shifted. Fix it below or in Settings → MIDI.`, he: `ניגנתם ${n === 1 ? "אוקטבה" : n + " אוקטבות"} גבוה מהכתוב — כנראה שהמקלדת מוזזת. אפשר לתקן כאן למטה או בהגדרות ← MIDI.` };
  }

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
    ...(octaveShift !== undefined ? { octaveShift } : {}),
    ...(unmeasured.length ? { unmeasured } : {}),
    ...(drill.goal.improv ? { improv } : {}),
    ...(drill.goal.improv ? (() => { const l = improvLandings(drill, bpm, played0); return l.length ? { landings: l } : {}; })() : {}),
    ...(po ? { phraseOrg: po.report } : {}),
    ...(po?.playRest ? { playRest: po.playRest } : {}),
  };
}
