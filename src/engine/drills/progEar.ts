// Progressions by ear on the instrument (owner 2026-11-14): the k-ear / g-ear / b-ear playback levels from ii–V–I
// shells to an AABA bridge. The band plays a progression, the player plays it back in the bars after it; the take is
// graded per chord by harmonyGrade.ts (root motion, colour, bass). Progressions come from the same generators as the
// ear course's grid dictation (progGrid.ts), realised in the drill's key and spelled for it. Pure and deterministic.

import { bassMidi, GQ_IV, realize, voiceChords, type DChord, type GChord, type GridVoicing, type GX } from '../progGrid';
import { gridProgression } from '../progGrid';
import { harmonyChord, type HarmonyPlan } from './harmonyGrade';

type Rnd = () => number;
const pickOf = <T,>(rnd: Rnd, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const C = (deg: string, q: DChord['q'], beats = 4, x: GX = 'none'): DChord => ({ deg, q, x, beats });

/** The instrument progression kinds (k-ear 'prog-*', g-ear 'prog-*'). */
export type ProgEarKind = 'iivi' | 'rootless' | 'secinv' | 'subs' | 'altered' | 'blues' | 'bridge' | 'intro' | 'ending';

// Intros and endings by ear on the instrument (AUDIT-DEPTH-3 #12 follow-up, 2026-11-16): the guitar comps back and the
// bass walks back the intro or ending it heard — the same progressions as the bandstand family (gigDrills.ts TURN_INTRO,
// BLUES_LAST4, TAG3, B6B2_MAJ, B6B2_DOM, DAMERON, WALKDOWN, the Basie ii–V–I; tests check they match). Written here as
// degrees: this module cannot import gigDrills.ts (it loads before the drill catalogues).
const twice = (ds: DChord[]): DChord[] => [...ds, ...ds];
export const EAR_INTROS: { id: string; ch: DChord[]; name: { en: string; he: string } }[] = [
  { id: 'turn', ch: [...twice([C('3', 'm7', 2), C('6', '7', 2), C('2', 'm7', 2), C('5', '7', 2)]), C('1', 'maj7')], name: { en: 'Intro: the iii–VI7–ii–V7 vamp', he: 'פתיחה: ואמפ iii–VI7–ii–V7' } },
  { id: 'last4', ch: [C('2', 'm7'), C('5', '7'), C('1', '7', 2), C('6', '7', 2), C('2', 'm7', 2), C('5', '7', 2), C('1', '7')], name: { en: 'Intro: a blues’s last four bars', he: 'פתיחה: ארבע התיבות האחרונות של בלוז' } },
];
export const EAR_ENDINGS: { id: string; ch: DChord[]; name: { en: string; he: string } }[] = [
  { id: 'basie', ch: [C('2', 'm7'), C('5', '7'), C('1', '6', 8)], name: { en: 'Ending: ii–V–I, the Basie ending', he: 'סיום: ii–V–I, סיום בייסי' } },
  { id: 'tag', ch: [...twice([C('3', 'm7', 2), C('6', '7', 2), C('2', 'm7', 2), C('5', '7', 2)]), C('3', 'm7', 2), C('6', '7', 2), C('2', 'm7', 2), C('5', '7', 2), C('1', 'maj7')], name: { en: 'Ending: the tag ×3', he: 'סיום: התג ×3' } },
  { id: 'b6b2maj', ch: [C('2', 'm7'), C('5', '7'), C('b6', 'maj7', 2), C('b2', 'maj7', 2), C('1', 'maj7')], name: { en: 'Ending: ♭VImaj7–♭IImaj7–Imaj7', he: 'סיום: ♭VImaj7–♭IImaj7–Imaj7' } },
  { id: 'b6b2', ch: [C('2', 'm7'), C('5', '7'), C('b6', '7', 2), C('b2', '7', 2), C('1', 'maj7')], name: { en: 'Ending: ♭VI7–♭II7–Imaj7', he: 'סיום: ♭VI7–♭II7–Imaj7' } },
  { id: 'dameron', ch: [...twice([C('1', 'maj7', 2), C('b3', 'maj7', 2), C('b6', 'maj7', 2), C('b2', 'maj7', 2)]), C('1', 'maj7')], name: { en: 'Ending: the Dameron turnaround', he: 'סיום: הטרנאראונד של דיימרון' } },
  { id: 'walkdown', ch: [C('3', 'm7'), C('b3', 'dim7'), C('2', 'm7'), C('5', '7'), C('1', 'maj7')], name: { en: 'Ending: the diminished walk-down', he: 'סיום: ירידת המוקטן' } },
];
/** The intro (op 0) or ending (op 1) an ear item picks. */
export const earFormPick = (kind: 'intro' | 'ending', rnd: Rnd) => pickOf(rnd, kind === 'intro' ? EAR_INTROS : EAR_ENDINGS);

/** The chords of a kind (op picks major / minor, or the blues variant). */
export function progEarChords(kind: ProgEarKind, op: number, rnd: Rnd): DChord[] {
  switch (kind) {
    case 'iivi':
    case 'rootless':
      // Major ii–V–I (op 0), minor ii–V–i (op 1): one bar each, the I held two bars.
      return op === 1 ? [C('2', 'm7b5'), C('5', '7', 4, 'b9'), C('1', 'm6', 8)] : [C('2', 'm7', 4, kind === 'rootless' ? '9' : 'none'), C('5', '7', 4, kind === 'rootless' ? '13' : 'none'), C('1', 'maj7', 8, kind === 'rootless' ? '9' : 'none')];
    case 'secinv': {
      // Eight bars with secondary dominants, some chords in inversion (the bass by step).
      const base = gridProgression(3, rnd).chords;
      let made = 0;
      return base.map((c, i) => {
        if (i === 0 || i === base.length - 1 || made >= 2 || rnd() < 0.55) return c;
        made++;
        return { ...c, x: (c.q === '7' ? pickOf(rnd, ['/3', '/7']) : '/3') as GX };
      });
    }
    case 'subs':
      return gridProgression(5, rnd).chords;
    case 'altered': {
      // Two ii–V–Is: the V altered (♭9, ♯9, ♭13, alt) or an upper structure (13, ♯11); the ii and I with their 9ths.
      const V = (): GX => pickOf(rnd, ['b9', '#9', 'b13', 'alt', '13', '#11'] as GX[]);
      return op === 1 ? [C('2', 'm7b5', 4, '11'), C('5', '7', 4, pickOf(rnd, ['b9', 'alt', 'b13'] as GX[])), C('1', 'm6', 4), C('2', 'm7', 4, '9'), C('5', '7', 4, V()), C('1', 'maj7', 4, '9')] : [C('2', 'm7', 4, '9'), C('5', '7', 4, V()), C('1', 'maj7', 4, '9'), C('b2', '7', 4, '#11'), C('1', 'maj7', 4, '13')];
    }
    case 'blues': {
      const col = (): GX => pickOf(rnd, ['none', '9', '13'] as GX[]);
      return op === 1
        ? [C('1', '7', 4, col()), C('4', '7', 4, col()), C('1', '7', 4, col()), C('5', 'm7', 2), C('1', '7', 2), C('4', '7', 4, col()), C('#4', 'dim7'), C('1', '7', 4, col()), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7', 4, col()), C('1', '7', 2), C('6', '7', 2, 'b9'), C('2', 'm7', 2), C('5', '7', 2)]
        : [C('1', '7', 4, col()), C('4', '7', 4, col()), C('1', '7', 8, col()), C('4', '7', 8, col()), C('1', '7', 4, col()), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7', 4, col()), C('1', '7', 4, col()), C('5', '7', 4, col())];
    }
    case 'intro':
    case 'ending':
      return earFormPick(kind, rnd).ch;
    case 'bridge': {
      // The bridge of an AABA (the A is heard first, then the bridge; the bridge is played back).
      const p = gridProgression(8, rnd);
      const b = p.sections?.find((s) => s.label === 'B');
      return b ? p.chords.slice(b.from, b.to) : p.chords;
    }
  }
}
/** The A section heard before a bridge (k-ear 'prog-bridge'): Imaj7 vi7 ii7 V7 iii7 VI7 ii7 V7. */
export const A_SECTION: DChord[] = [C('1', 'maj7'), C('6', 'm7'), C('2', 'm7'), C('5', '7'), C('3', 'm7'), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7')];

/** The voicing style of a kind on the keys. */
export const KEYS_STYLE: Record<ProgEarKind, GridVoicing> = { iivi: 'shell', rootless: 'rootless', secinv: 'close', subs: 'shell', altered: 'rootless', blues: 'rootless', bridge: 'rootless', intro: 'rootless', ending: 'rootless' };

/** Realise chords at beats from `b0` (each chord's beat and length). */
export function placeChords(key: number, ds: DChord[], b0 = 0): { c: GChord; beat: number }[] {
  let b = b0;
  return ds.map((d) => {
    const c = realize(key, d);
    const at = b;
    b += d.beats;
    return { c, beat: at };
  });
}
/** Total beats of a list of chords. */
export const beatsOf = (ds: DChord[]) => ds.reduce((a, d) => a + d.beats, 0);

/** The call's notes: voicings held, the bass on 1 (and the 5th on 3 of long chords), as drill `listen` notes. */
export function callNotes(placed: { c: GChord; beat: number }[], style: GridVoicing): { beat: number; dur: number; midi: number[]; inst?: 'bass' | 'piano' }[] {
  const vs = voiceChords(placed.map((p) => p.c), style);
  const out: { beat: number; dur: number; midi: number[]; inst?: 'bass' | 'piano' }[] = [];
  placed.forEach(({ c, beat }, i) => {
    out.push({ beat, dur: c.beats * 0.92, midi: vs[i].upper, inst: 'piano' });
    out.push({ beat, dur: Math.min(c.beats, 2) * 0.95, midi: [vs[i].bass], inst: 'bass' });
    if (c.beats >= 4 && !c.x.startsWith('/')) out.push({ beat: beat + 2, dur: 1.9, midi: [bassMidi(c.root + GQ_IV[c.q][2])], inst: 'bass' });
  });
  return out;
}

/** The harmony plan of the answer chords. */
export function harmonyPlan(placed: { c: GChord; beat: number }[], mode: HarmonyPlan['mode'], bassCounts: boolean): HarmonyPlan {
  return { chords: placed.map(({ c, beat }) => harmonyChord(c, beat, c.beats)), mode, bassCounts };
}

/** Level names (EN / HE) of the kinds. */
export const PROG_EAR_NAME: Record<ProgEarKind, { en: string; he: string }[]> = {
  iivi: [{ en: 'ii–V–I as shells', he: 'ii–V–I בשלדים' }, { en: 'Minor ii–V–i as shells', he: 'ii–V–i מינורי בשלדים' }],
  rootless: [{ en: 'ii–V–I, rootless A / B voicings', he: 'ii–V–I, וויסינגים בלי שורש A / B' }, { en: 'Minor ii–V–i, rootless', he: 'ii–V–i מינורי, בלי שורש' }],
  secinv: [{ en: 'Eight bars: secondary dominants and inversions', he: 'שמונה תיבות: דומיננטות משניות והיפוכים' }],
  subs: [{ en: 'Tritone subs and the backdoor', he: 'תחליפי טריטון והדלת האחורית' }],
  altered: [{ en: 'Altered dominants and upper structures', he: 'דומיננטות אלטרד ומבנים עליונים' }, { en: 'Altered dominants in minor', he: 'דומיננטות אלטרד במינור' }],
  blues: [{ en: 'A 12-bar jazz blues', he: 'בלוז ג׳אז של 12 תיבות' }, { en: 'A 12-bar jazz blues with ♯IV°7', he: 'בלוז ג׳אז של 12 תיבות עם ♯IV°7' }],
  bridge: [{ en: 'An AABA bridge', he: 'הגשר של שיר בצורת 32 תיבות' }],
  intro: [{ en: 'Intros by ear', he: 'פתיחות בשמיעה' }],
  ending: [{ en: 'Endings by ear', he: 'סיומים בשמיעה' }],
};
