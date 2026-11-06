// Priority scheduler (spec AD §5): which sub-skill to practise next, and with which exercise.
//
//   priority(sub) = importance(skill, track) × (1 + intakeBoost(domain)) × gap(sub) × freshness(sub) × ready(sub)
//   gap           = clamp((target − R)/200 + (0.85 − ewma), 0.2, 2)
//   freshness     = 1 + min(1, days since last practised / 7)   (1 for never practised)
//   ready         = 0 until the sub-skill's prerequisites are met
//
// The exercise is the topic level that trains the sub-skill most (its tag weight) at the player's level
// (the hardest level not above R + 50). Pure: a function of ratings, sub-skill stats, the track and the day.

import type { SkillId } from './lesson';
import { priorityBoost, type Track } from './intake';
import { domainOf, START_RATING, type DomainId, type Ratings } from './rating';
import { SUB_SKILLS, TOPIC_TAGS, type SubStat, type Tag } from './taxonomy';
import { TOPIC_GEN } from './topics';

/** How much each skill matters per track (spec AD §5.4). Voice skills follow the intake (see `voiceWeight`). */
export const IMPORTANCE: Record<Track, Partial<Record<SkillId, number>>> = {
  explorer: { pitch: 1, timing: 1, degrees: 0.6, intervals: 0.6, chords: 0.6, cadences: 0.3, 'rhythm-dictation': 0.5, 'rhythm-reading': 0.5, meter: 0.6, tempo: 0.6, sequences: 0.8, rhythm: 0.8, form: 0.3, notes: 0.3, sight: 0.3, theory: 0.1, transpose: 0.2, improv: 0.4, expression: 1, modes: 0.1, absolute: 0 },
  hobby: { pitch: 0.8, timing: 0.8, degrees: 1, intervals: 1, chords: 1, cadences: 0.8, 'rhythm-dictation': 0.9, 'rhythm-reading': 0.9, meter: 0.7, tempo: 0.7, sequences: 0.8, rhythm: 0.8, form: 0.5, notes: 0.7, sight: 0.7, theory: 0.4, transpose: 0.6, improv: 0.8, expression: 0.8, modes: 0.4, absolute: 0 },
  student: { pitch: 0.5, timing: 0.5, degrees: 1, intervals: 1, chords: 1, cadences: 1, 'rhythm-dictation': 1, 'rhythm-reading': 1, meter: 0.8, tempo: 0.8, sequences: 0.8, rhythm: 0.8, form: 0.8, notes: 1, sight: 1, theory: 1, transpose: 0.9, improv: 0.6, expression: 0.6, modes: 0.7, absolute: 0 },
  pro: { pitch: 0.3, timing: 0.3, degrees: 1, intervals: 1, chords: 1, cadences: 1, 'rhythm-dictation': 1, 'rhythm-reading': 1, meter: 0.8, tempo: 0.8, sequences: 0.7, rhythm: 0.7, form: 0.9, notes: 1, sight: 1, theory: 0.9, transpose: 1, improv: 0.9, expression: 0.5, modes: 0.8, absolute: 0 },
};
/** The level a track aims for (middle of its target band). */
export const TARGET: Record<Track, number> = { explorer: 1000, hobby: 1200, student: 1400, pro: 1600 };
const VOICE_SKILLS: SkillId[] = ['singing', 'technique', 'agility'];

/** A sub-skill cannot be scheduled before these are on their way (n ≥ 3 and ≥ 60 %, or the skill ≥ 1100). */
export const SUB_PREREQ: Record<string, string[]> = {
  'transpose/pitch': ['degrees/diatonic'],
  'transpose/written': ['theory/spelling'],
  'transpose/chords': ['cadences/progression'],
  'transpose/melodic': ['sequences/melody'],
  'transpose/displacement': ['rhythm-reading/read'],
  'transpose/rhythmic': ['rhythm-dictation/dictate'],
  'cadences/modulation': ['cadences/cadence'],
  'cadences/harmonize': ['chords/quality'],
  'cadences/nct': ['cadences/cadence'],
  'meter/compound': ['meter/count'],
  'meter/hemiola': ['meter/count'],
  'meter/odd': ['meter/count'],
  'intervals/compound': ['intervals/melodic'],
  'degrees/chromatic': ['degrees/diatonic'],
  'chords/extension': ['chords/seventh'],
  'theory/voice-leading': ['theory/harmony'],
  'rhythm-dictation/poly': ['rhythm-dictation/dictate'],
  'pitch/fine': ['pitch/higher-lower'],
};

export interface SchedulerInput {
  ratings: Ratings;
  subs: Record<string, SubStat>;
  track?: Track | null;
  priorities?: DomainId[] | null;
  voice: boolean;
  now: Date;
}

export interface SubPriority {
  sub: string;
  skill: SkillId;
  score: number;
  /** Why: 'new' (never practised), 'weak' (behind), 'review' (not practised lately). */
  why: 'new' | 'weak' | 'review';
}

const DAY = 86_400_000;
const met = (sub: string, inp: SchedulerInput) => {
  const st = inp.subs[sub];
  const k = sub.split('/')[0] as SkillId;
  return (st && st.n >= 3 && st.ewma >= 0.6) || (inp.ratings[k]?.r ?? 0) >= 1100;
};

export function subPriorities(inp: SchedulerInput): SubPriority[] {
  const track = inp.track ?? 'hobby';
  const out: SubPriority[] = [];
  for (const s of SUB_SKILLS) {
    if (s.skill === 'absolute') continue;
    if (!inp.voice && VOICE_SKILLS.includes(s.skill)) continue;
    if (!exerciseFor(s.id, inp.ratings) && !VOICE_SKILLS.includes(s.skill)) continue; // nothing to practise it with here
    const imp = IMPORTANCE[track][s.skill] ?? (VOICE_SKILLS.includes(s.skill) ? 0.6 : 0.5);
    if (imp <= 0) continue;
    if ((SUB_PREREQ[s.id] ?? []).some((p) => !met(p, inp))) continue;
    const r = inp.ratings[s.skill]?.n ? inp.ratings[s.skill]!.r : START_RATING;
    const st = inp.subs[s.id];
    const ewma = st ? st.ewma : 0.6;
    const gap = Math.max(0.2, Math.min(2, (TARGET[track] - r) / 200 + (0.85 - ewma)));
    const days = st ? (inp.now.getTime() - new Date(st.last).getTime()) / DAY : 0;
    const fresh = st ? 1 + Math.min(1, Math.max(0, days) / 7) : 1;
    const score = imp * (1 + priorityBoost(inp.priorities, domainOf(s.skill)) / 400) * gap * fresh;
    out.push({ sub: s.id, skill: s.skill, score, why: !st ? 'new' : days >= 5 ? 'review' : 'weak' });
  }
  return out.sort((a, b) => b.score - a.score || a.sub.localeCompare(b.sub));
}

// ---------------------------------------------------------------- the exercise for a sub-skill

const LEVEL_D = new Map<string, number>();
/** A topic level's difficulty (its generator is pure; cached). */
function levelDifficulty(topic: string, level: number): number {
  const key = `${topic}:${level}`;
  if (!LEVEL_D.has(key)) LEVEL_D.set(key, TOPIC_GEN[topic].gen(1, level, 'd').difficulty);
  return LEVEL_D.get(key)!;
}
const tagsAt = (topic: string, level: number): Tag[] => {
  const t = TOPIC_TAGS[topic];
  return t ? (typeof t === 'function' ? t(level) : t) : [];
};

/** The topic level that trains `sub` the most, at the player's level (null: no topic trains it). */
export function exerciseFor(sub: string, ratings: Ratings): { topic: string; level: number; w: number } | null {
  const skill = sub.split('/')[0] as SkillId;
  const r = ratings[skill]?.n ? ratings[skill]!.r : START_RATING - 100;
  let best: { topic: string; level: number; w: number; d: number } | null = null;
  for (const [topic, T] of Object.entries(TOPIC_GEN)) {
    if (topic.startsWith('bh-') || topic === 'chromatic-added') continue; // Barry Harris: its own track
    for (let level = 1; level <= T.levels.length; level++) {
      const w = tagsAt(topic, level).find((t) => t.sub === sub)?.w ?? 0;
      if (w < 0.5) continue;
      const d = levelDifficulty(topic, level);
      const fits = d <= r + 50;
      if (!best) best = { topic, level, w, d };
      else {
        const bestFits = best.d <= r + 50;
        // Prefer: the strongest training weight, then a level that fits, then the hardest fitting / easiest overall.
        const better = w > best.w + 0.05 || (Math.abs(w - best.w) <= 0.05 && ((fits && !bestFits) || (fits && bestFits && d > best.d) || (!fits && !bestFits && d < best.d)));
        if (better) best = { topic, level, w, d };
      }
    }
  }
  return best ? { topic: best.topic, level: best.level, w: best.w } : null;
}
