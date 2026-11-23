// Drums `d-latin` L8–10 (DRUMS_NICHE_PLAN §6.2, owner 2026-11-11): mambo, songo and Mozambique on the kit.
//
// These are our own transcriptions of the standard, widely taught kit patterns:
//   * mambo: the mambo (campana) bell on the ride's bell over the son clave as a cross-stick, the kick on the bass's
//     tumbao ("&" of 2 and 4), the hi-hat foot on 2 and 4;
//   * songo (rebuilt 2026-11-22, STYLE-AFROCUBAN F4): the verified description (Wikipedia *Songo music*) — the right
//     hand on the four main beats (bell, or closed hi-hat), the left hand on the offbeats (snare rim, then snare); a
//     generic part, not Changuito's exact one. The kick on the "&" of 2 and on 4 (the tumbao) stays unverified [?];
//   * Mozambique: after the Steve Gadd / Pacheco kit pattern — the Mozambique bell in the right hand, the left hand
//     filling the gaps on the snare (linear hands), kick on 1 and 3, the hi-hat foot on 2 and 4.
// A teacher has NOT checked them yet: every item carries `drum.teacherCheck` and the level `needsTeacherCheck`, and the
// take's page says "pattern not yet teacher-checked" until the owner's teacher confirms (then drop the flags).
// Pure and deterministic. drums.ts helpers are used only inside functions (drums.ts imports drumStyles → this file).

import type { Drill, DrillSpec } from './types';
import { bar, finish, levelOfKind, rep, type DH, type Lanes } from './drums';
import { drumBand } from './drumStyles';

const t = (en: string, he: string) => ({ en, he });

/** Two-bar patterns on the 8th grid (16 steps). */
export const SON23 = '..x.x...x..x..x.';
export const SON32 = 'x..x..x...x.x...';
/** The mambo bell, 2-3: the clave's 2-side bar, then its 3-side bar. 3-2 is the same two bars swapped. */
export const MAMBO23 = 'x.x.xx.x' + 'x.xx.xx.';
export const MAMBO32 = 'x.xx.xx.' + 'x.x.xx.x';
/** The bass's tumbao on the kick ("&" of 2 and 4) and the hi-hat foot on 2 and 4, per two bars of 8ths. */
const TUMBAO = '...x..x....x..x.';
const FOOT24_8 = '..x...x...x...x.';

/** One bar on the 16th grid (16 steps). Songo: the right hand on the four beats, the left hand on the offbeats (F4). */
export const SONGO_BELL = 'x...x...x...x...';
export const SONGO_SN = '..x...x...x...x.';
export const SONGO_K = '......x.....x...';
export const MOZ_BELL = 'x.x.x.xx.xx.x.x.';
export const MOZ_SN = '.g.g.g..g..X.g.g';
const MOZ_K = 'x.......x.......';
const FOOT24_16 = '....x.......x...';

/** Levels 8–10 of `d-latin` that wait for a teacher's check (the catalogue marks them `needsTeacherCheck`). */
export const LATIN_TEACHER_CHECK = new Set(['d-latin-8', 'd-latin-9', 'd-latin-10']);

const two = (l: Lanes, bars: number): DH[] => rep(bars / 2, (k) => bar(l, 2, k * 8));
const one = (l: Lanes, bars: number): DH[] => rep(bars, (k) => bar(l, 4, k * 4));

/** d-latin L8 mambo, L9 songo, L10 Mozambique. */
export function generateLatinMore(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (hits: DH[], en: string, he: string, bpm: number): Drill => {
    const d = finish(s, hits, { title: t(en, he), bpm, bars: 8, mic: false, ...drumBand('latin', 8) });
    return { ...d, drum: { ...d.drum!, teacherCheck: true } };
  };
  if (lv === 8) {
    const l: Lanes = op === 2 ? { r: MAMBO32, rm: SON32, k: TUMBAO, p: FOOT24_8 } : op === 1 ? { r: MAMBO23, rm: SON23, k: TUMBAO, p: FOOT24_8 } : { r: MAMBO23, rm: SON23 };
    const nm = [t('2-3, bell and clave', '2-3, פעמון וקלאבה'), t('2-3 with the kick tumbao and the foot', '2-3 עם טומבאו בקיק והרגל'), t('3-2, all four limbs', '3-2, כל ארבע הגפיים')][op];
    return fin(two(l, 8), `Mambo bell · ${nm.en}`, `פעמון מאמבו · ${nm.he}`, 100);
  }
  if (lv === 9) {
    // Right hand on the beats; the left hand's offbeats on the snare rim (op 0) or the snare (op 1, and op 2 under a
    // closed hi-hat); the kick on the tumbao.
    const l: Lanes = op === 2 ? { h: SONGO_BELL, s: SONGO_SN, k: SONGO_K } : op === 1 ? { r: SONGO_BELL, s: SONGO_SN, k: SONGO_K } : { r: SONGO_BELL, rm: SONGO_SN, k: SONGO_K };
    const nm = [t('bell on the beats, rim on the offbeats', 'פעמון על הפעמות, רים על האוף־ביט'), t('the offbeats on the snare', 'האוף־ביט בסנר'), t('the beats on the hi-hat', 'הפעמות בהיי־האט')][op];
    return fin(one(l, 8), `Songo · ${nm.en}`, `סונגו · ${nm.he}`, 90);
  }
  const l: Lanes = op === 2 ? { h: MOZ_BELL, s: MOZ_SN, k: MOZ_K } : op === 1 ? { r: MOZ_BELL, s: MOZ_SN, k: MOZ_K, p: FOOT24_16 } : { r: MOZ_BELL, k: MOZ_K, p: FOOT24_16 };
  const nm = [t('the bell over the feet', 'הפעמון מעל הרגליים'), t('the left hand fills the gaps', 'יד שמאל ממלאת את הרווחים'), t('the bell on the hi-hat', 'הפעמון בהיי־האט')][op];
  return fin(one(l, 8), `Mozambique · ${nm.en}`, `מוזמביק · ${nm.he}`, 90);
}
