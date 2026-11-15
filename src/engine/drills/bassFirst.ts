// AUDIT-6 Stage B (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md §3.5 priority 1, BB-1): the bass had no way in — four
// families opened at once at 700. The `b-first` family, measured like every bass level:
//
//   1 holding the bass and the strap: steady quarters on an open string · 2 tuning: every open string within ±15 cents ·
//   3 plucking alternation (i–m) in 8ths · 4 open strings in time, crossing strings · 5 root notes on the E and A
//   strings under a chord chart (all 12 keys) · 6 a first 2-note riff, root and 5th (all 12 keys, our own) ·
//   7 reading bass TAB (TAB only, generated) · 8 reading rhythm from the staff (generated)
//
// Reading items are generated from a seed (the item's own id), so there is nothing to learn by heart. Pitches are
// MIDI as the bass tuning writes them; strings 1 (G) … 4 (E), moved onto a 5- or 6-string by the Drills page. Pure.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { SpecTemplate } from './generate';
import type { Tuning } from '../fretboard';
import { finish, lowFret, mod, NAMES, t, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef } from './guitar';
import { all12 } from './keys12';
import { seeded } from './keysFirst';
import { readRhythm } from './guitarFirst';

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** Strings E (4), A (3), D (2), G (1) as `s` on any bass tuning: counted from the lowest string of the four. */
const E = 4;
/** The first notes on the E and A strings, low to high (TAB reading): E F G A B C. */
export const BASS_FIRST_POSITION: [number, number][] = [[4, 0], [4, 1], [4, 3], [3, 0], [3, 2], [3, 3]];
/** I–IV–V–I twice (chord degrees). */
const ROOTS_PROG = [0, 3, 4, 0, 0, 3, 4, 0];

/** The root of a chord on the E or the A string, as low on the neck as it goes (frets 0–7 on E, 0–4 on A). */
export function rootPlace(tu: Tuning, pc: number): GN {
  const fe = lowFret(tu, pc, E);
  const fa = lowFret(tu, pc, E - 1);
  return fe <= 4 || fa > 4 ? { s: E, f: fe } : { s: E - 1, f: fa };
}

function genBassFirst(s: DrillSpec, tu: Tuning): Drill {
  const op = s.option ?? 0;
  const key = mod(s.key, 12);
  // Written for the 4-string tuning (1 = G … 4 = E); other basses get the same pitches (Drills: withBassTuning).
  const str = (x: number) => x;
  const evs: Ev[] = [];
  const alt = (i: number): GN['stroke'] => (i % 2 ? 'm' : 'i');
  switch (s.kind) {
    case 'bf-hold': {
      // Holding the bass, strap at the height you sit: steady quarters, i–m rest strokes on one open string.
      const sn = op === 1 ? 3 : 4;
      for (let i = 0; i < 16; i++) evs.push({ beat: i, dur: 1, notes: [{ s: str(sn), f: 0, stroke: alt(i) }] });
      evs.push({ beat: 16, dur: 2, notes: [{ s: str(sn), f: 0, stroke: 'i' }] });
      const nm = op === 1 ? t('the A string', 'מיתר לה') : t('the E string', 'מיתר מי');
      return finish(s, tu, evs, { title: t(`Holding the bass: steady quarters on ${nm.en}`, `אחיזת הבס: רבעים יציבים על ${nm.he}`), bpm: 60, evenness: true, keySig: 'C', goal: { bass: { loudSd: 4 } } });
    }
    case 'bf-tune': {
      const order = op === 1 ? [1, 2, 3, 4] : [4, 3, 2, 1];
      order.forEach((sn, i) => evs.push({ beat: i * 2, dur: 2, notes: [{ s: str(sn), f: 0, stroke: 'i' }] }));
      const nm = op === 1 ? t('high to low', 'מהגבוה לנמוך') : t('low to high', 'מהנמוך לגבוה');
      return finish(s, tu, evs, { title: t(`Tuning check: every open string in tune, ${nm.en}`, `בדיקת כיוון: כל מיתר פתוח מכוון, ${nm.he}`), bpm: 60, evenness: false, keySig: 'C', goal: { bass: { cents: 15 } } });
    }
    case 'bf-alt': {
      // i–m alternation in 8ths on one string: odd and even notes alike in time and loudness.
      const sn = [4, 3, 2][op % 3];
      for (let i = 0; i < 32; i++) evs.push({ beat: i / 2, dur: 0.5, notes: [{ s: str(sn), f: 0, stroke: alt(i) }] });
      evs.push({ beat: 16, dur: 2, notes: [{ s: str(sn), f: 0, stroke: 'i' }] });
      const nm = [t('the E string', 'מיתר מי'), t('the A string', 'מיתר לה'), t('the D string', 'מיתר רה')][op % 3];
      return finish(s, tu, evs, { title: t(`Plucking alternation, i–m 8ths on ${nm.en}`, `החלפת אצבעות, שמיניות i–m על ${nm.he}`), bpm: 60, evenness: true, keySig: 'C', goal: { bass: { asym: { ms: 14, db: 3 } } } });
    }
    case 'bf-open': {
      const PATS = [
        [4, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 4, 3, 3],
        [4, 4, 3, 3, 2, 2, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3],
        [4, 2, 3, 1, 4, 2, 3, 1, 1, 3, 2, 4, 1, 3, 2, 4],
      ];
      PATS[op % 3].forEach((sn, i) => evs.push({ beat: i, dur: 1, notes: [{ s: str(sn), f: 0, stroke: alt(i) }] }));
      evs.push({ beat: 16, dur: 2, notes: [{ s: str(4), f: 0, stroke: 'i' }] });
      const nm = [t('across and back', 'הלוך ושוב'), t('two on each string', 'שניים על כל מיתר'), t('skipping a string', 'בדילוג על מיתר')][op % 3];
      return finish(s, tu, evs, { title: t(`Open strings in time: ${nm.en}`, `מיתרים פתוחים בזמן: ${nm.he}`), bpm: 60, evenness: true, keySig: 'C', goal: { bass: { crossing: 30 } } });
    }
    case 'bf-roots': {
      // The chart's roots on the E and A strings: halves (op 0) or quarters (op 1), I–IV–V–I twice.
      const per = op === 1 ? 1 : 2;
      ROOTS_PROG.forEach((d, bar) => {
        const g = rootPlace(tu, mod(key + MAJ[d], 12));
        for (let k = 0; k < 4 / per; k++) evs.push({ beat: bar * 4 + k * per, dur: per, notes: [{ ...g, stroke: alt(k) }] });
      });
      evs.push({ beat: 32, dur: 4, notes: [{ ...rootPlace(tu, key), stroke: 'i' }] });
      const d = finish(s, tu, evs, { title: t(`Roots on the E and A strings: I–IV–V–I in ${per === 1 ? 'quarters' : 'halves'} · ${NAMES[key]}`, `יסודות על מיתרי מי ולה: I–IV–V–I ב${per === 1 ? 'רבעים' : 'חצאים'} · ${NAMES[key]}`), bpm: 60, evenness: true, keySig: SIG[key] });
      return { ...d, chart: [...ROOTS_PROG.map((x) => `${NAMES[mod(key + MAJ[x], 12)]}`), NAMES[key]] };
    }
    case 'bf-riff': {
      // A first 2-note riff (our own): the root on the E string and its 5th on the A string, two bars twice.
      const f = lowFret(tu, key, str(4));
      const R: GN = { s: str(4), f };
      const F5: GN = { s: str(3), f: f + 2 };
      const BARS: [number, number, GN][][] = [
        [[0, 1.5, R], [1.5, 0.5, R], [2, 1, F5], [3, 1, R], [4, 1.5, R], [5.5, 0.5, R], [6, 0.5, F5], [6.5, 0.5, F5], [7, 1, R]],
        [[0, 0.5, R], [0.5, 0.5, R], [1, 1, F5], [2, 0.5, R], [2.5, 0.5, R], [3, 1, F5], [4, 0.5, R], [4.5, 0.5, R], [5, 0.5, F5], [5.5, 0.5, R], [6, 1, F5], [7, 1, R]],
      ];
      for (let rep = 0; rep < 2; rep++) BARS[op % 2].forEach(([b, len, g], i) => evs.push({ beat: rep * 8 + b, dur: len, notes: [{ ...g, stroke: alt(i), ...(b % 4 === 0 ? { acc: true } : {}) }] }));
      evs.push({ beat: 16, dur: 2, notes: [{ ...R, stroke: 'i' }] });
      return finish(s, tu, evs, { title: t(`A first riff: root and 5th, ${op % 2 ? 'in 8ths' : 'with a push'} · ${NAMES[key]}`, `ריף ראשון: יסוד וקווינטה, ${op % 2 ? 'בשמיניות' : 'עם דחיפה'} · ${NAMES[key]}`), bpm: 72, evenness: true, keySig: SIG[mod(key + 3, 12)] });
    }
    case 'bf-tab': {
      const r = seeded(`b-first:tab:${op}`);
      let i = pick(r, [0, 2, 3]);
      for (const x of readRhythm(r, 4)) {
        const [sn, fret] = BASS_FIRST_POSITION[x.beat >= 14 ? 0 : i];
        evs.push({ beat: x.beat, dur: x.dur, notes: [{ s: str(sn), f: fret, stroke: 'i', ...(fret ? { finger: fret === 3 ? 4 : fret, pos: 1 } : {}) }] });
        const mv = pick(r, [-2, -1, -1, 1, 1, 2]);
        i = Math.max(0, Math.min(5, i + mv === i ? i + 1 : i + mv));
      }
      const d = finish(s, tu, evs, { title: t(`Reading bass TAB: E and A strings · ${op + 1}`, `קריאת טאבים לבס: מיתרי מי ולה · ${op + 1}`), bpm: 60, evenness: false, keySig: 'C' });
      return { ...d, show: 'tab' };
    }
    case 'bf-rhythm': {
      const r = seeded(`b-first:rhythm:${op}`);
      const sn = op % 2 ? 3 : 4;
      readRhythm(r, 4).forEach((x, i) => evs.push({ beat: x.beat, dur: x.dur, notes: [{ s: str(sn), f: 0, stroke: alt(i) }] }));
      const d = finish(s, tu, evs, { title: t(`Reading rhythm on an open string · ${op + 1}`, `קריאת קצב על מיתר פתוח · ${op + 1}`), bpm: 60, evenness: false, keySig: 'C' });
      return { ...d, show: 'staff' };
    }
  }
  throw new Error(`Unknown b-first kind ${s.kind}`);
}

export const generateBassFirst = genBassFirst;

/** Root and riff keys: E, A, G, D, C, F first, then all 12 (the owner's rule). */
export const BASS_FIRST_KEYS = all12([4, 9, 7, 2, 0, 5]);

export function bassFirstFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'b-first';
  const P = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'bass', ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: number[], tempo: [number, number], sub: string): GuitarLevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys, tempo, sub });
  return {
    id: fam,
    title: t('First steps on bass', 'צעדים ראשונים בבס'),
    style: 'classical',
    genres: ['all'],
    instruments: ['bass'],
    levels: [
      L(1, 'Holding the bass and the strap', 'אחיזת הבס והרצועה', [P('bf-hold'), P('bf-hold', { option: 1 })], [0], [60, 80], 'quarters'),
      L(2, 'Tuning check: every open string in tune', 'בדיקת כיוון: כל מיתר פתוח מכוון', [P('bf-tune'), P('bf-tune', { option: 1 })], [0], [60, 60], 'in tune ±15 cents'),
      L(3, 'Plucking alternation: i and m', 'החלפת אצבעות בפריטה: i ו־m', [0, 1, 2].map((o) => P('bf-alt', { option: o, perBeat: 2 })), [0], [60, 90], '8ths'),
      L(4, 'Open strings in time', 'מיתרים פתוחים בזמן', [0, 1, 2].map((o) => P('bf-open', { option: o })), [0], [60, 100], 'quarters'),
      L(5, 'Root notes on the E and A strings', 'יסודות על מיתרי מי ולה', [P('bf-roots'), P('bf-roots', { option: 1 })], BASS_FIRST_KEYS, [60, 96], 'halves → quarters'),
      L(6, 'A first riff: root and 5th', 'ריף ראשון: יסוד וקווינטה', [P('bf-riff'), P('bf-riff', { option: 1 })], BASS_FIRST_KEYS, [70, 100], '8ths'),
      L(7, 'Reading bass TAB', 'קריאת טאבים לבס', [0, 1, 2, 3].map((o) => P('bf-tab', { option: o })), [0], [60, 92], 'quarters / 8ths'),
      L(8, 'Reading rhythm from the staff', 'קריאת קצב מהחמשה', [0, 1, 2, 3].map((o) => P('bf-rhythm', { option: o })), [0], [60, 96], 'quarters / 8ths / rests'),
    ],
  };
}
