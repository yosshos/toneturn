// AUDIT-SCALES §3 (owner 2026-11-14): hand independence on the piano, `k-indep` — exercises in the style of Isidor
// Philipp's "Exercises for Independence of the Fingers" (public domain), written fresh here, not copied: held notes with
// other fingers moving, two voices in one hand, a left-hand ostinato under a right-hand melody, different rhythms in
// each hand, legato against staccato, one hand loud and one soft. All in the five-finger position of each of the 12
// keys. Graded like every piano drill (notes, timing, evenness); held notes by their length, a touch per hand by key
// release, the loud hand by velocity — those three need a MIDI keyboard. Pure and deterministic.
//
// Minor (2026-11-23, SPEC-KEY-SESSION §D2: a minor key of the week gets them too): `minor: true` plays the same
// exercise in the harmonic minor of the key — the key ladder's minor rows (the k-sharm table's option 7). The
// five-finger position is degrees 1–5, the same in natural and harmonic minor; the raised 7th only sounds in the V
// chord of "one hand loud" (E–G♯–B in A minor). Notes are spelled one letter per degree on the minor key signature.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { H_SCALES, hSig, hTonic } from './harmLadder';
import { spellScale } from '../keyTheory';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** The key ladder's minor: harmonic minor (H_SCALES option 7; read at call time — generate ↔ harmLadder import cycle). */
const harm = () => H_SCALES[7];
const rhTonic = (key: number): number => (mod(key, 12) <= 6 ? 60 + mod(key, 12) : 48 + mod(key, 12));
/** Five-finger position: degree 0–4 → finger (RH 1–5, LH 5–1). */
const fingerOf = (hand: 'R' | 'L', d: number): number => (hand === 'R' ? d + 1 : 5 - d);

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, hand: 'R' | 'L', ps: number[], extra: Partial<ExpNote> = {}): void {
    const id = ps.length > 1 ? ++this.cid : undefined;
    for (const p of ps) this.list.push({ pitch: p, beat: r6(beat), dur: r6(dur), hand, ...(id !== undefined ? { chordId: id } : {}), ...extra });
  }
}
function done(s: DrillSpec, n: Notes, title: T2, startBpm: number, goal: Partial<DrillGoal>): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  // minor: every note spelled on its degree's letter (G♯ in A minor, not A♭)
  if (s.minor) {
    const key = mod(s.key, 12);
    const names = spellScale(hTonic(key, harm()), harm().ints);
    for (const x of notes) {
      const k = harm().ints.indexOf(mod(x.pitch - key, 12));
      if (k >= 0) x.spell = names[k];
    }
  }
  return {
    spec: { ...s },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter: 4,
    keySig: s.minor ? hSig(mod(s.key, 12), harm()) : SIG[mod(s.key, 12)],
    goal: { evenness: true, hands: false, ...goal },
    startBpm: s.tempo ?? startBpm,
  };
}
const tk = (en: string, he: string, s: DrillSpec): T2 => {
  const h = s.hands === 'R' ? t(' · RH', ' · יד ימין') : s.hands === 'L' ? t(' · LH', ' · יד שמאל') : t('', '');
  const k = s.minor ? t(`${hTonic(mod(s.key, 12), harm())} harmonic minor`, `${hTonic(mod(s.key, 12), harm())} מינור הרמוני`) : t(NAMES[mod(s.key, 12)], NAMES[mod(s.key, 12)]);
  return t(`${en} · ${k.en}${h.en}`, `${he} · ${k.he}${h.he}`);
};

/** Held notes (option): the held degrees and the moving figure (degrees, 8ths) — four bars, two figures a bar. */
const HOLDS: { held: number[]; moving: number[]; en: string; he: string }[] = [
  { held: [0, 2], moving: [1, 3, 4, 3, 1, 3, 4, 3], en: 'hold 1 and 3, fingers 2-4-5 move', he: 'מחזיקים 1 ו־3, אצבעות 2-4-5 נעות' },
  { held: [1, 3], moving: [0, 2, 4, 2, 0, 4, 2, 4], en: 'hold 2 and 4, fingers 1-3-5 move', he: 'מחזיקים 2 ו־4, אצבעות 1-3-5 נעות' },
  { held: [0, 1, 2], moving: [3, 4, 3, 4, 3, 4, 3, 4], en: 'hold 1-2-3, fingers 4 and 5 trill', he: 'מחזיקים 1-2-3, אצבעות 4 ו־5 בטריל' },
  { held: [3, 4], moving: [0, 1, 2, 1, 0, 2, 1, 2], en: 'hold 4 and 5, fingers 1-2-3 move', he: 'מחזיקים 4 ו־5, אצבעות 1-2-3 נעות' },
];
/** Our right-hand melody (degrees, quarter-note beats; 2 = a half note), four bars. */
const MELODY: [number, number][] = [[0, 1], [2, 1], [4, 1], [3, 1], [2, 2], [1, 1], [2, 1], [4, 1], [5, 1], [4, 1], [2, 1], [3, 2], [1, 1], [0, 1]];

export function genIndep(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const ints = s.minor ? harm().ints : H_SCALES[0].ints;
  const deg = (tonic: number, k: number): number => tonic + 12 * Math.floor(k / 7) + ints[mod(k, 7)];
  const R = rhTonic(key);
  const Lt = R - 12;
  const n = new Notes();
  const o = s.option ?? 0;
  const tonicOf = (h: 'R' | 'L') => (h === 'R' ? R : Lt);
  switch (s.kind) {
    case 'ind-hold': {
      const P = HOLDS[Math.min(HOLDS.length - 1, o)];
      const h = s.hands === 'L' ? 'L' : 'R';
      for (let bar = 0; bar < 4; bar++) {
        const b0 = bar * 4;
        for (const d of P.held) n.add(b0, 4, h, [deg(tonicOf(h), d)], { finger: fingerOf(h, d), hold: true });
        P.moving.forEach((d, i) => n.add(b0 + i * 0.5, 0.5, h, [deg(tonicOf(h), d)], { finger: fingerOf(h, d) }));
      }
      n.add(16, 1, h, [tonicOf(h)], { finger: fingerOf(h, 0) });
      return done(s, n, tk(`Held notes: ${P.en}`, `צלילים מוחזקים: ${P.he}`, s), 60, { holds: 0.8, evenness: true });
    }
    case 'ind-voices': {
      // Two voices in one hand: option 0 — the upper voice in half notes (4-5) held over a moving lower voice (1-2-3 in
      // 8ths); option 1 — the lower voice held (1-2) under a moving upper voice (3-4-5).
      const h = s.hands === 'L' ? 'L' : 'R';
      const T = tonicOf(h);
      const upperHeld = o === 0;
      for (let half = 0; half < 8; half++) {
        const b0 = half * 2;
        const held = upperHeld ? [4, 3][half % 2] : [0, 1][half % 2];
        const moving = upperHeld ? [0, 1, 2, 1] : [2, 3, 4, 3];
        n.add(b0, 2, h, [deg(T, held)], { finger: fingerOf(h, held), hold: true });
        moving.forEach((d, i) => n.add(b0 + i * 0.5, 0.5, h, [deg(T, d)], { finger: fingerOf(h, d) }));
      }
      n.add(16, 1, h, [T], { finger: fingerOf(h, 0) });
      const nm = upperHeld ? t('upper voice held in half notes, lower voice moves', 'הקול העליון מוחזק בחצאים, התחתון נע') : t('lower voice held, upper voice moves', 'הקול התחתון מוחזק, העליון נע');
      return done(s, n, tk(`Two voices in one hand: ${nm.en}`, `שני קולות ביד אחת: ${nm.he}`, s), 60, { holds: 0.8 });
    }
    case 'ind-ostinato': {
      // LH ostinato under the RH melody: 0 = 1-5-8-5 in 8ths; 1 = a 3-note figure (1-5-10) in 8ths across the 4/4 bar;
      // 2 = a syncopated bass (dotted quarter, 8th, half) under the melody.
      const figs = [[0, 4, 7, 4], [0, 4, 9], [0, 4, 7]];
      const fig = figs[Math.min(2, o)];
      const L0 = Lt - 12;
      if (o === 2) {
        for (let bar = 0; bar < 4; bar++) {
          n.add(bar * 4, 1.5, 'L', [deg(L0, 0)], { finger: 5 });
          n.add(bar * 4 + 1.5, 0.5, 'L', [deg(L0, 4)], { finger: 1 });
          n.add(bar * 4 + 2, 2, 'L', [deg(L0, 7)], { finger: 1 });
        }
      } else for (let i = 0; i < 32; i++) n.add(i * 0.5, 0.5, 'L', [deg(L0, fig[i % fig.length])], { finger: [5, 2, 1, 2][i % fig.length] ?? 1 });
      let b = 0;
      for (const [d, len] of MELODY) {
        n.add(b, len, 'R', [deg(R, d)]);
        b += len;
      }
      n.add(16, 2, 'R', [R]);
      n.add(16, 2, 'L', [L0]);
      const nm = [t('LH 1-5-8-5 ostinato', 'אוסטינטו 1-5-8-5 ביד שמאל'), t('LH 3-note ostinato across the bar', 'אוסטינטו של 3 צלילים ביד שמאל, נגד התיבה'), t('LH syncopated bass', 'בס מסונקופ ביד שמאל')][Math.min(2, o)];
      return done(s, n, tk(`${nm.en} under a RH melody`, `${nm.he} מתחת למנגינה ביד ימין`, s), 60, { evenness: false });
    }
    case 'ind-poly': {
      // Different rhythms per hand on scale lines: 0 = RH 3 : LH 2, 1 = RH 2 : LH 3, 2 = RH 4 : LH 3, 3 = RH 3 : LH 4.
      const [r, l] = ([[3, 2], [2, 3], [4, 3], [3, 4]] as const)[Math.min(3, o)];
      const line = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let b = 0; b < 4; b++) {
        for (let i = 0; i < r; i++) {
          const d = line[(b * r + i) % 8];
          n.add(b + i / r, 1 / r, 'R', [deg(R, d)], { finger: fingerOf('R', d) });
        }
        for (let i = 0; i < l; i++) {
          const d = line[(b * l + i) % 8];
          n.add(b + i / l, 1 / l, 'L', [deg(Lt - 12, d)], { finger: fingerOf('L', d) });
        }
      }
      n.add(4, 1, 'R', [R], { finger: 1 });
      n.add(4, 1, 'L', [Lt - 12], { finger: 5 });
      return done(s, n, tk(`${r} against ${l}: RH ${r}, LH ${l} to the beat`, `${r} נגד ${l}: יד ימין ${r}, יד שמאל ${l} לפעמה`, s), 50, { evenness: true, hands: false });
    }
    case 'ind-touch': {
      // Legato against staccato: 0 = RH legato, LH staccato; 1 = the other way round. Both hands in 8ths, contrary.
      const legR = o === 0;
      const line = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let i = 0; i < 32; i++) {
        const d = line[i % 8];
        n.add(i * 0.5, legR ? 0.5 : 0.2, 'R', [deg(R, d)], { finger: fingerOf('R', d) });
        n.add(i * 0.5, legR ? 0.2 : 0.5, 'L', [deg(Lt, 4 - d)], { finger: fingerOf('L', 4 - d) });
      }
      n.add(16, 1, 'R', [R], { finger: 1 });
      n.add(16, 1, 'L', [deg(Lt, 4)], { finger: 1 });
      const nm = legR ? t('RH legato, LH staccato', 'יד ימין לגאטו, יד שמאל סטקטו') : t('LH legato, RH staccato', 'יד שמאל לגאטו, יד ימין סטקטו');
      return done(s, n, tk(`Touch per hand: ${nm.en}`, `מגע לכל יד: ${nm.he}`, s), 60, { handArt: legR ? { R: 'legato', L: 'staccato' } : { R: 'staccato', L: 'legato' } });
    }
    case 'ind-dyn': {
      // One hand loud, one soft: 0 = the RH melody sings over soft LH chords; 1 = the LH melody under soft RH chords.
      const loudR = o === 0;
      let b = 0;
      for (const [d, len] of MELODY) {
        if (loudR) n.add(b, len, 'R', [deg(R, d)], { accent: true });
        else n.add(b, len, 'L', [deg(Lt - 12, d)], { accent: true });
        b += len;
      }
      for (let bar = 0; bar < 4; bar++) {
        const roots = [0, 3, 4, 0][bar];
        const ch = [0, 2, 4].map((x) => deg(loudR ? Lt - 12 : R, roots + x));
        for (const beat of [0, 1, 2, 3]) n.add(bar * 4 + beat, 1, loudR ? 'L' : 'R', ch);
      }
      n.add(16, 2, loudR ? 'R' : 'L', [loudR ? R : Lt - 12], { accent: true });
      const nm = loudR ? t('RH melody loud, LH chords soft', 'מנגינה חזקה ביד ימין, אקורדים רכים ביד שמאל') : t('LH melody loud, RH chords soft', 'מנגינה חזקה ביד שמאל, אקורדים רכים ביד ימין');
      return done(s, n, tk(`Dynamics per hand: ${nm.en}`, `עוצמה לכל יד: ${nm.he}`, s), 60, { evenness: false, dynamics: 'voicing' });
    }
    case 'ind-all': {
      // Everything at once: 0 = a legato RH melody over a staccato LH ostinato; 1 = the RH holds a note while
      // its other fingers move, over LH triplets.
      if (o === 0) {
        let b = 0;
        // two bars (the run screen stays on one phone screen)
        for (const [d, len] of MELODY.slice(0, 7)) {
          n.add(b, len, 'R', [deg(R, d)]);
          b += len;
        }
        const fig = [0, 4, 7, 4];
        for (let i = 0; i < 16; i++) n.add(i * 0.5, 0.2, 'L', [deg(Lt - 12, fig[i % 4])], { finger: [5, 2, 1, 2][i % 4] });
        return done(s, n, tk('Two touches', 'שני מגעים', s), 56, { evenness: false, handArt: { R: 'legato', L: 'staccato' } });
      }
      for (let bar = 0; bar < 4; bar++) {
        n.add(bar * 4, 4, 'R', [R], { finger: 1, hold: true });
        [2, 3, 4, 3, 2, 3, 4, 3].forEach((d, i) => n.add(bar * 4 + i * 0.5, 0.5, 'R', [deg(R, d)], { finger: fingerOf('R', d) }));
        for (let i = 0; i < 12; i++) n.add(bar * 4 + i / 3, 1 / 3, 'L', [deg(Lt - 12, [0, 2, 4][i % 3])], { finger: [5, 3, 1][i % 3] });
      }
      n.add(16, 1, 'R', [R], { finger: 1 });
      n.add(16, 1, 'L', [Lt - 12], { finger: 5 });
      return done(s, n, tk('Held thumb, 8ths over triplets', 'אגודל מוחזק, שמיניות מעל טריולות', s), 50, { holds: 0.8 });
    }
  }
  throw new Error(`Unknown hand-independence drill: ${s.kind}`);
}

/** Path difficulty per level (path.ts KEYS_LEVEL_DIFF). */
// 9–12: the minor forms of 1, 3, 6, 7 (the key ladder's D2 in a minor row), each just above its major level.
export const K_INDEP_DIFF: Record<string, number> = Object.fromEntries([1000, 1060, 1120, 1180, 1240, 1290, 1330, 1400, 1030, 1150, 1310, 1350].map((d, i) => [`k-indep-${i + 1}`, d]));

export function indepFamily(): FamilyDef {
  const levels: LevelDef[] = [];
  const LV = (en: string, he: string, specs: SpecTemplate[], tempo: [number, number], diff: number) => {
    const level = levels.length + 1;
    const id = `k-indep-${level}`;
    void diff;
    levels.push({ id, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: 'major', tempo });
  };
  const sp = (kind: string, hands: SpecTemplate['hands'], option = 0, minor = false): SpecTemplate => ({ family: 'k-indep' as FamilyId, kind, hands, option, ...(minor ? { minor: true } : {}) });
  const mi = (kind: string, hands: SpecTemplate['hands'], option = 0): SpecTemplate => sp(kind, hands, option, true);
  LV('Held notes: hold two fingers, the others move', 'צלילים מוחזקים: שתי אצבעות מוחזקות, האחרות נעות', [sp('ind-hold', 'R', 0), sp('ind-hold', 'L', 0), sp('ind-hold', 'R', 1), sp('ind-hold', 'L', 1)], [50, 96], 1000);
  LV('Held notes: hold a chord while the weak fingers move', 'צלילים מוחזקים: אקורד מוחזק והאצבעות החלשות נעות', [sp('ind-hold', 'R', 2), sp('ind-hold', 'L', 2), sp('ind-hold', 'R', 3), sp('ind-hold', 'L', 3)], [50, 96], 1060);
  LV('Two voices in one hand', 'שני קולות ביד אחת', [sp('ind-voices', 'R', 0), sp('ind-voices', 'L', 0), sp('ind-voices', 'R', 1), sp('ind-voices', 'L', 1)], [50, 92], 1120);
  LV('Left-hand ostinato under a right-hand melody', 'אוסטינטו ביד שמאל מתחת למנגינה ביד ימין', [0, 1, 2].map((o) => sp('ind-ostinato', 'RL', o)), [56, 100], 1180);
  LV('Different rhythms per hand: 3 against 2, 4 against 3', 'מקצב שונה לכל יד: 3 נגד 2, 4 נגד 3', [0, 1, 2, 3].map((o) => sp('ind-poly', 'RL', o)), [44, 80], 1240);
  LV('Legato in one hand, staccato in the other', 'לגאטו ביד אחת, סטקטו בשנייה', [sp('ind-touch', 'RL', 0), sp('ind-touch', 'RL', 1)], [56, 100], 1290);
  LV('One hand loud, the other soft', 'יד אחת חזקה, השנייה רכה', [sp('ind-dyn', 'RL', 0), sp('ind-dyn', 'RL', 1)], [56, 96], 1330);
  LV('All at once: a touch per hand, a held note over triplets', 'הכול יחד: מגע לכל יד, צליל מוחזק מעל טריולות', [sp('ind-all', 'RL', 0), sp('ind-all', 'RL', 1)], [50, 90], 1400);
  // 2026-11-23 (SPEC-KEY-SESSION §D2 in a minor row): the harmonic-minor forms of 1, 3, 6 and 7 — appended, so the
  // levels above keep their ids and their items.
  LV('Harmonic minor: held notes, two fingers held', 'מינור הרמוני: צלילים מוחזקים, שתי אצבעות מוחזקות', [mi('ind-hold', 'R', 0), mi('ind-hold', 'L', 0), mi('ind-hold', 'R', 1), mi('ind-hold', 'L', 1)], [50, 96], 1030);
  LV('Harmonic minor: two voices in one hand', 'מינור הרמוני: שני קולות ביד אחת', [mi('ind-voices', 'R', 0), mi('ind-voices', 'L', 0), mi('ind-voices', 'R', 1), mi('ind-voices', 'L', 1)], [50, 92], 1150);
  LV('Harmonic minor: legato in one hand, staccato in the other', 'מינור הרמוני: לגאטו ביד אחת, סטקטו בשנייה', [mi('ind-touch', 'RL', 0), mi('ind-touch', 'RL', 1)], [56, 100], 1310);
  LV('Harmonic minor: one hand loud, the other soft', 'מינור הרמוני: יד אחת חזקה, השנייה רכה', [mi('ind-dyn', 'RL', 0), mi('ind-dyn', 'RL', 1)], [56, 96], 1350);
  return { id: 'k-indep', title: t('Hand independence', 'עצמאות הידיים'), style: 'classical', levels };
}
