// The voice course's level test (owner 2026-11-13: "check the voice level test too and fix it the same way"): like the
// playing tests (docs/SPEC-LEVEL-TEST.md) — sections of the course's own families, real levels in rising difficulty,
// one take per step, a clean step jumps ahead, a miss brackets the level and the section moves on. The result is where
// each family starts on the voice path (the levels before it are ✓ by test). Pure.

import { advance, recordTake, startState, type StrandState, type Verdict } from './drills/levelTest';
import { itemFits, type VocalItem, type VocalKind, type VoiceRange } from './vocal';
import { VOICE_FAMILIES, vocalLevelByRef } from './voiceFamilies';

type Bi = { en: string; he: string };

/** The sections, in test order: in tune, in time, a song, the ear, reading, scales, agility. */
// STAGE C (AUDIT-6 §3.5): the altered arpeggios and the advanced runs test the top of the ladder.
// AUDIT-7: the blues head and scat calls (the singer's jazz entry) and pop style are sections too (their scat items skip).
// 0.97 leftovers: improvising (v-impro) is a section — each of its levels is one measured take over a short chart.
// Owner 2026-11-19 ("the level test must check everything the course covers"): every axis of the voice radar has a
// measured section — Breath (v-breath: a held note, then breath phrases), Shape (v-dyn: crescendo, messa di voce,
// terraced dynamics, accents) and Jazz (v-standards: a standard with the band, graded in one take like a song).
export const VOICE_TEST_FAMILIES = ['v-pitch', 'v-breath', 'v-time', 'v-songs', 'v-ear', 'v-dyn', 'v-sight', 'v-scale', 'v-agility', 'v-arp2', 'v-runs', 'v-jazz1', 'v-impro', 'v-standards', 'v-pop'] as const;

/** Kinds a single take can't measure here (several takes, free shapes, not measured, or set up by hand). */
const SKIP: VocalKind[] = ['range', 'vibrato-register', 'scat'];
/**
 * Scat items one take does judge (voiceGrade.gradeScat): v-impro's call and response (each answer graded against the
 * call's chords and pulse), its chord tones on beat 1, and the pentatonic inside its scale (share in the scale, chord
 * tones on the strong beats, the ending, the pulse) — eight bars, graded once, like a song take. Jazz scat elsewhere
 * (guide tones over a whole form, trading fours) stays out of the test.
 */
const ONE_TAKE_SCAT: Record<string, NonNullable<VocalItem['scat']>['mode'][]> = { 'v-impro': ['trade', 'landing', 'scale', 'motif'] };

export interface VoiceRung {
  level: number;
  /** 1-based place of the level in its family. */
  pos: number;
  item: VocalItem;
  pass: number;
}

export interface VoiceStrand {
  family: string;
  title: Bi;
  /** How many levels the family has (a start never goes past it). */
  size: number;
  rungs: VoiceRung[];
}

const usable = (it: VocalItem, family = '') =>
  (!SKIP.includes(it.kind) || (it.kind === 'scat' && !!it.scat && (ONE_TAKE_SCAT[family] ?? []).includes(it.scat.mode))) &&
  !(it.song && (it.song.mine || it.song.recital || it.song.rubato || it.song.freeUntil !== undefined || it.song.read));

/** At most six steps per section, spread over the family's levels (first and last included). */
export const VOICE_RUNGS = 6;

export function voiceStrands(range: VoiceRange): VoiceStrand[] {
  const out: VoiceStrand[] = [];
  for (const id of VOICE_TEST_FAMILIES) {
    const f = VOICE_FAMILIES.find((x) => x.id === id);
    if (!f) continue;
    const all: VoiceRung[] = [];
    f.refs.forEach((ref, i) => {
      const lv = vocalLevelByRef(ref);
      const item = lv?.items.find((it) => usable(it, id) && itemFits(it, range));
      if (lv && item) all.push({ level: ref, pos: i + 1, item, pass: lv.pass });
    });
    if (all.length < 2) continue;
    const rungs = all.length <= VOICE_RUNGS ? all : Array.from({ length: VOICE_RUNGS }, (_, k) => all[Math.round((k * (all.length - 1)) / (VOICE_RUNGS - 1))]);
    out.push({ family: id, title: f.title, size: f.refs.length, rungs });
  }
  return out;
}

/** A take against its level's pass mark: clean, "almost" (within 15 points: one more take), or not yet. */
export function verdictOf(score: number, pass: number): Verdict {
  return score >= pass ? 'clean' : score >= pass - 0.15 ? 'almost' : 'not';
}

/** One take of the current step; the state moves to its next step (at = −1: the section is done). */
export function voiceTake(s: StrandState, strand: VoiceStrand, score: number, pass: number): StrandState {
  return advance(recordTake(s, verdictOf(score, pass)), strand.rungs.length);
}

export const voiceStartState = (strand: VoiceStrand): StrandState => startState(strand.rungs.length);

/**
 * Where the family starts after its section: after the hardest clean level, or at an "almost" edge level itself.
 * Null when nothing was proved (the family starts at its first level).
 */
export function voiceStrandStart(strand: VoiceStrand, s: StrandState): number | null {
  let start = 1;
  if (s.lo >= 0) start = strand.rungs[s.lo].pos + 1;
  if (s.edge !== null && s.edge > s.lo) start = Math.max(start, strand.rungs[s.edge].pos);
  start = Math.min(start, strand.size);
  return start > 1 ? start : null;
}

/** A vocal level's rating: the mean of its items' ratings (undefined when they carry none). */
const levelRating = (ref: number): number | undefined => {
  const ds = (vocalLevelByRef(ref)?.items ?? []).map((x) => x.difficulty).filter((x): x is number => typeof x === 'number');
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : undefined;
};
/** Which sections prove which first steps: held / slid / echoed notes, the rhythm sung back, the first song. */
const FIRST_PROOF: Record<'pitch' | 'time' | 'song', string[]> = {
  pitch: ['v-pitch', 'v-breath', 'v-dyn', 'v-ear', 'v-scale', 'v-sight', 'v-agility', 'v-arp2', 'v-runs'],
  time: ['v-time', 'v-jazz1'],
  song: ['v-songs', 'v-jazz1', 'v-pop', 'v-standards'],
};
const proofOf = (ref: number): keyof typeof FIRST_PROOF => {
  const ks = (vocalLevelByRef(ref)?.items ?? []).map((x) => x.kind);
  return ks.includes('song') ? 'song' : ks.includes('time') ? 'time' : 'pitch';
};

/**
 * The first steps (v-first, not a section of its own) after the test: a level is ✓ when a passed step of a section that
 * proves it is at least as hard — any passed pitch step proves holding, sliding and echoing a note (v-first 1–4, 6), a
 * passed time step the rhythm sung back (5), a passed song step the four-bar song (7). Starts are 1-based places in
 * the families (the test's own, before savedVoiceStart); the result may pass the family's end (every first step ✓).
 * Null when nothing is proved.
 */
export function firstStepsStart(starts: Record<string, number>): number | null {
  const top: Record<keyof typeof FIRST_PROOF, number> = { pitch: -Infinity, time: -Infinity, song: -Infinity };
  for (const [k, fams] of Object.entries(FIRST_PROOF) as [keyof typeof FIRST_PROOF, string[]][])
    for (const fid of fams) {
      const f = VOICE_FAMILIES.find((x) => x.id === fid);
      const start = starts[fid] ?? 1;
      if (!f) continue;
      f.refs.slice(0, Math.max(0, start - 1)).forEach((ref) => (top[k] = Math.max(top[k], levelRating(ref) ?? -Infinity)));
    }
  const first = VOICE_FAMILIES.find((x) => x.id === 'v-first');
  if (!first) return null;
  let n = 0;
  for (const ref of first.refs) {
    const r = levelRating(ref);
    if (r === undefined || top[proofOf(ref)] < r) break;
    n++;
  }
  return n > 0 ? n + 1 : null;
}

/** The test's starts with the first steps it proved (a higher start already saved for v-first stays). */
export function withFirstSteps(starts: Record<string, number>): Record<string, number> {
  const s = firstStepsStart(starts);
  return s && s > (starts['v-first'] ?? 1) ? { ...starts, 'v-first': s } : starts;
}

/** The start as saved (drillStart): families with levels put in front later count those on reading (voiceStartNow). */
export function savedVoiceStart(family: string, start: number): number {
  const before = VOICE_FAMILIES.find((f) => f.id === family)?.before ?? 0;
  return Math.max(1, start - before);
}

/**
 * Families a section proves without a section of their own (owner 2026-11-19: every family is measured or placed by a
 * step that asks the same): harmony singing's held parts against a chord (v-harmony 1–3) are the ear section's own
 * harmony-hold steps. A level is ✓ when every item is of that kind and a passed step of it is at least as hard.
 */
const RELATED: { family: string; from: string; kind: VocalKind }[] = [{ family: 'v-harmony', from: 'v-ear', kind: 'harmony-hold' }];

/** The test's starts with the related families they prove (a higher start already there stays). */
export function withRelatedStarts(starts: Record<string, number>): Record<string, number> {
  const out = { ...starts };
  for (const rel of RELATED) {
    const src = VOICE_FAMILIES.find((x) => x.id === rel.from);
    const dst = VOICE_FAMILIES.find((x) => x.id === rel.family);
    if (!src || !dst) continue;
    let top = -Infinity;
    for (const ref of src.refs.slice(0, Math.max(0, (starts[rel.from] ?? 1) - 1)))
      if ((vocalLevelByRef(ref)?.items ?? []).some((x) => x.kind === rel.kind)) top = Math.max(top, levelRating(ref) ?? -Infinity);
    let n = 0;
    for (const ref of dst.refs) {
      const items = vocalLevelByRef(ref)?.items ?? [];
      const r = levelRating(ref);
      if (!items.length || items.some((x) => x.kind !== rel.kind) || r === undefined || r > top) break;
      n++;
    }
    if (n > 0 && n + 1 > (out[rel.family] ?? 1)) out[rel.family] = n + 1;
  }
  return out;
}
