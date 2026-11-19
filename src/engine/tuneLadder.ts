// Comp a standard: one gated ladder per tune (docs/AUDIT-DEPTH-3.md C4). The steps are the head drills the tune
// families already have (headDrills.ts, measured like every take); this module only orders them per instrument, gates
// each step on a clean take of the step before it (on that tune), and reports one tune's progress. Pure.
//   keys    roots → guide tones → shells → rootless → drop 2 → 6-dim blocks under the melody → melody + comp → the
//           rootless comp in all 12 keys
//   guitar  roots → shells → rootless drop 2 → drop 2 → chord-melody on the changes → shells in all 12 keys
//   bass    roots → two-feel → walking → walking with approaches → walking in all 12 keys

import type { DrillSpec, FamilyId, ItemState } from './drills/types';

type T2 = { en: string; he: string };
export type LadderInst = 'piano' | 'guitar' | 'bass';
export interface TuneStep {
  family: FamilyId;
  kind: string;
  name: T2;
  /** Every key clean (the last step). */
  keys12?: boolean;
}
const S = (family: FamilyId, kind: string, en: string, he: string, keys12 = false): TuneStep => ({ family, kind, name: { en, he }, ...(keys12 ? { keys12 } : {}) });

export const TUNE_LADDERS: Record<LadderInst, TuneStep[]> = {
  piano: [
    S('k-tune', 'tn-root', 'Roots', 'שורשים'),
    S('k-tune', 'tn-guide', 'Guide tones', 'צלילים מנחים'),
    S('k-tune', 'tn-shell', 'Shells', 'שלדים'),
    S('k-tune', 'tn-rootless', 'Rootless A / B', 'בלי שורש A / B'),
    S('k-tune', 'tn-drop2', 'Drop 2', 'דרופ 2'),
    S('k-harm', 'hm-sixdim', '6-dim blocks under the melody', 'בלוקים שש-מוקטן מתחת למנגינה'),
    S('k-tune', 'tn-melcomp', 'Melody and comp', 'מנגינה וליווי'),
    S('k-tune', 'tn-rootless', 'Rootless in all 12 keys', 'בלי שורש בכל 12 הסולמות', true),
  ],
  guitar: [
    S('g-tune', 'tn-root', 'Roots', 'שורשים'),
    S('g-tune', 'tn-shell', 'Shells', 'שלדים'),
    S('g-tune', 'tn-rootless', 'Rootless drop 2', 'דרופ 2 בלי שורש'),
    S('g-tune', 'tn-drop2', 'Drop 2', 'דרופ 2'),
    S('g-tune', 'tn-melcomp', 'Chord-melody on the changes', 'אקורד-מלודיה על המהלך'),
    S('g-tune', 'tn-shell', 'Shells in all 12 keys', 'שלדים בכל 12 הסולמות', true),
  ],
  bass: [
    S('b-tune', 'tn-root', 'Roots', 'שורשים'),
    S('b-tune', 'tn-two', 'Two-feel', 'בשתיים'),
    S('b-tune', 'tn-walk', 'Walking', 'ווקינג'),
    S('b-tune', 'tn-appr', 'Walking with approaches', 'ווקינג עם צלילי גישה'),
    S('b-tune', 'tn-walk', 'Walking in all 12 keys', 'ווקינג בכל 12 הסולמות', true),
  ],
};
export const ladderInstOf = (family: FamilyId): LadderInst | null => (family === 'k-tune' ? 'piano' : family === 'g-tune' ? 'guitar' : family === 'b-tune' ? 'bass' : null);

/** The drill spec of a step for a head (HEADS index) in a key. */
export function stepSpec(step: TuneStep, inst: LadderInst, headIdx: number, key: number): DrillSpec {
  const walk = inst === 'bass' && (step.kind === 'tn-walk' || step.kind === 'tn-appr');
  return {
    family: step.family,
    kind: step.kind,
    key,
    hands: inst === 'piano' ? 'RL' : 'R',
    option: headIdx * 16,
    ...(inst === 'piano' ? {} : { instrument: inst }),
    ...(walk ? { perBeat: 1 } : {}),
    tempo: walk ? 80 : 60,
  } as DrillSpec;
}

/** The keys (0–11) a step has a clean take in, for a head: from the saved item states (family, kind, option). */
export function cleanKeysOf(items: Record<string, ItemState> | ItemState[], step: TuneStep, headIdx: number): Set<number> {
  const list = Array.isArray(items) ? items : Object.values(items);
  const keys = new Set<number>();
  const op = `op${headIdx * 16}`;
  for (const s of list) {
    if (s.family !== step.family || !(s.cleanBpm > 0)) continue;
    const p = s.itemId.split(':');
    if (p[1] !== step.kind || !p.includes(op)) continue;
    keys.add(((Number(p[2]) % 12) + 12) % 12);
  }
  return keys;
}

export interface StepStatus {
  step: TuneStep;
  done: boolean;
  /** Open to play: the first step, or the one after a done step. */
  open: boolean;
  keys: number;
}
/** One tune's ladder: each step done (a clean take; the 12-key step: all twelve), open, or locked. */
export function tuneLadderStatus(items: Record<string, ItemState> | ItemState[], inst: LadderInst, headIdx: number): StepStatus[] {
  const out: StepStatus[] = [];
  for (const step of TUNE_LADDERS[inst]) {
    const keys = cleanKeysOf(items, step, headIdx).size;
    const done = step.keys12 ? keys >= 12 : keys > 0;
    const open = out.length === 0 || out[out.length - 1].done;
    out.push({ step, done, open, keys });
  }
  return out;
}
/** Steps done of a tune's ladder (the progress line). */
export const ladderDone = (st: StepStatus[]): number => st.filter((x) => x.done).length;
