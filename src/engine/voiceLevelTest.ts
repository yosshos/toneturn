// The voice course's level test (owner 2026-11-13: "check the voice level test too and fix it the same way"): like the
// playing tests (docs/SPEC-LEVEL-TEST.md) — sections of the course's own families, real levels in rising difficulty,
// one take per step, a clean step jumps ahead, a miss brackets the level and the section moves on. The result is where
// each family starts on the voice path (the levels before it are ✓ by test). Pure.

import { advance, recordTake, startState, type StrandState, type Verdict } from './drills/levelTest';
import { itemFits, type VocalItem, type VocalKind, type VoiceRange } from './vocal';
import { VOICE_FAMILIES, vocalLevelByRef } from './voiceFamilies';

type Bi = { en: string; he: string };

/** The sections, in test order: in tune, in time, a song, the ear, reading, scales, agility. */
export const VOICE_TEST_FAMILIES = ['v-pitch', 'v-time', 'v-songs', 'v-ear', 'v-sight', 'v-scale', 'v-agility'] as const;

/** Kinds a single take can't measure here (several takes, free shapes, not measured, or set up by hand). */
const SKIP: VocalKind[] = ['range', 'vibrato-register', 'scat'];

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

const usable = (it: VocalItem) => !SKIP.includes(it.kind) && !(it.song && (it.song.mine || it.song.recital || it.song.rubato || it.song.freeUntil !== undefined || it.song.read));

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
      const item = lv?.items.find((it) => usable(it) && itemFits(it, range));
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

/** The start as saved (drillStart): families with levels put in front later count those on reading (voiceStartNow). */
export function savedVoiceStart(family: string, start: number): number {
  const before = VOICE_FAMILIES.find((f) => f.id === family)?.before ?? 0;
  return Math.max(1, start - before);
}
