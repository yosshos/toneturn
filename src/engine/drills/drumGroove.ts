// AUDIT-7 #12 (docs/research/AUDIT-7-GAPS.md §4): the RSL Drums Improvisation & Interpretation task at grades 4–5 —
// take a written groove, develop it, play a short solo break and come back to the groove. One level, d-fills 9:
//
//   bars 1–4    the written groove (three of our own grooves: rock 8ths, pop 16ths, a half-time feel)
//   bars 5–8    develop it: the kick on 1 and the backbeat on 2 and 4 stay written (and are graded as written); the rest
//               is the player's own variation, counted as an improvised zone (goal.impro)
//   bars 9–10   a two-bar solo break, the band stops (an improvised zone)
//   bar 11, 1   the return: crash + kick on the downbeat (goal.landing)
//   bars 11–14  the written groove again — graded note for note, so drifting after the solo shows
//
// Measured by the existing drum grading only (drumAnalyze: per-limb timing on every written hit, the landing window,
// a minimum of own hits inside each improvised zone). Pure. drums.ts helpers are used only inside functions (drums.ts
// imports this module, as it does drumTop.ts).

import type { Drill, DrillSpec } from './types';
import { bar, finish, rep, type DH, type Lanes } from './drums';
import { drumBand } from './drumStyles';

const t = (en: string, he: string) => ({ en, he });

/** Our own grooves (8 steps a bar = 8ths, 16 = 16ths). */
export const GROOVE_DEV: { lanes: Lanes; sub: number; en: string; he: string }[] = [
  { lanes: { h: 'xxxxxxxx', s: '..x...x.', k: 'x...xx..' }, sub: 2, en: 'rock 8ths', he: 'רוק בשמיניות' },
  { lanes: { h: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', k: 'x.....x.x.......' }, sub: 4, en: 'pop 16ths', he: 'פופ בשש-עשריות' },
  { lanes: { h: 'x.x.x.x.x.x.x.x.', s: '........x.......', k: 'x.....x...x.....' }, sub: 4, en: 'half-time feel', he: 'תחושת חצי זמן' },
];
/** The anchors kept in the development bars: the groove's kick on 1 and its snare hits. */
const anchors = (l: Lanes, sub: number): Lanes => {
  const steps = 4 * sub;
  return { k: 'x' + '.'.repeat(steps - 1), s: l.s ?? '.'.repeat(steps) };
};

/** The bar plan (exported for the tests): groove, develop, solo, groove. */
export const DEV_PLAN = { groove: 4, develop: 4, solo: 2, back: 4 } as const;
/** Own hits a zone must hold: three a bar over the shortest zone (the solo break, two bars). */
export const DEV_MIN_PER_BAR = 3;

export function genGrooveDev(s: DrillSpec): Drill {
  const op = (s.option ?? 0) % GROOVE_DEV.length;
  const g = GROOVE_DEV[op];
  const { groove, develop, solo, back } = DEV_PLAN;
  const devFrom = groove * 4;
  const soloFrom = devFrom + develop * 4;
  const backFrom = soloFrom + solo * 4;
  const total = groove + develop + solo + back;
  const hits: DH[] = [
    ...rep(groove, (k) => bar(g.lanes, g.sub, k * 4)),
    ...rep(develop, (k) => bar(anchors(g.lanes, g.sub), g.sub, devFrom + k * 4)),
    // The return: crash + kick together on the downbeat after the break, then the groove as written.
    { b: backFrom, v: 'crash', h: 'R', d: 1 },
    ...rep(back, (k) => bar(g.lanes, g.sub, backFrom + k * 4).filter((h) => !(k === 0 && h.b === backFrom && h.v === 'hihat'))),
  ];
  const zones: [number, number][] = [
    [devFrom, soloFrom],
    [soloFrom, backFrom],
  ];
  const d = finish(s, hits, {
    title: t(`Develop the groove, solo, come back · ${g.en}`, `לפתח את הגרוב, סולו, לחזור · ${g.he}`),
    bpm: 84,
    bars: total,
    mic: false,
    goal: { landing: { beats: [backFrom], ms: 25 }, impro: { zones, min: DEV_MIN_PER_BAR * solo } },
    ...drumBand('rock', total, undefined, [[soloFrom, backFrom]]),
  });
  // A grade 4–5 task: graded with the intermediate tier (finish would read level 9 as advanced).
  return { ...d, drum: { ...d.drum!, tier: 2 } };
}
