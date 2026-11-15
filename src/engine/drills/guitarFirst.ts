// AUDIT-6 Stage B (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md §2.5 priorities 2, 3 and 5): the guitar's way in and a
// riff at every grade, as measured levels.
//
//   g-first  grade 0 (RSL Debut): 1 tuning check (every open string within ±15 cents) · 2 holding the guitar and the
//            pick (down strokes, then down-up) · 3 open strings in time · 4 first notes on strings 1–3 · 5 the first
//            two-chord changes (Em–Am, then G–D) · 6 quarter-note strumming · 7 reading TAB (TAB only, generated) ·
//            8 reading rhythm (muted strums from the staff, generated)
//   g-riff   one original riff per grade, grades 1–5 (RSL group C): single notes in 8ths · palm-muted 2-note power
//            chords · 3-note power chords with 16ths · hammer-ons, pull-offs and string skipping · a 16th pedal point
//
// Every riff and melody here is our own; the reading items are generated from a seed (the item's own id), so there is
// nothing to learn by heart. The riffs are key-relative and run in all 12 keys (E, A, G, D, C, F first) from the root on
// the low E string. A new item is played in free time first, then on the tempo ladder (rubato.ts). Pure.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { SpecTemplate } from './generate';
import type { Tuning } from '../fretboard';
import { chordShape, finish, lowFret, mod, NAMES, strumNotes, t, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type T2 } from './guitar';
import { all12 } from './keys12';
import { seeded } from './keysFirst';

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const tk = (en: string, he: string, key: number): T2 => t(`${en} · ${NAMES[mod(key, 12)]}`, `${he} · ${NAMES[mod(key, 12)]}`);

/** Strings 6 → 1, low to high. */
const LOW_TO_HIGH = [6, 5, 4, 3, 2, 1];
/** First notes on strings 1–3 (Hal Leonard Book 1's order, our own tunes): [string, fret, beats]. */
export const FIRST_NOTE_TUNES: { en: string; he: string; notes: [number, number, number][] }[] = [
  { en: 'string 1: E, F, G', he: 'מיתר 1: מי, פה, סול', notes: [[1, 0, 1], [1, 1, 1], [1, 3, 1], [1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 3, 2], [1, 3, 1], [1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 4]] },
  { en: 'string 2: B, C, D', he: 'מיתר 2: סי, דו, רה', notes: [[2, 0, 1], [2, 1, 1], [2, 3, 2], [2, 1, 1], [2, 0, 1], [2, 1, 2], [2, 0, 1], [2, 1, 1], [2, 3, 1], [2, 1, 1], [2, 0, 4]] },
  { en: 'strings 3 and 2: G, A, B, C', he: 'מיתרים 3 ו־2: סול, לה, סי, דו', notes: [[3, 0, 1], [3, 2, 1], [2, 0, 2], [2, 1, 1], [2, 0, 1], [3, 2, 2], [3, 0, 1], [3, 2, 1], [2, 0, 1], [2, 1, 1], [2, 0, 2], [3, 0, 2]] },
  { en: 'strings 1–3: G up to G and back', he: 'מיתרים 1–3: מסול עד סול ובחזרה', notes: [[3, 0, 1], [3, 2, 1], [2, 0, 1], [2, 1, 1], [2, 3, 1], [1, 0, 1], [1, 1, 1], [1, 3, 1], [1, 1, 1], [1, 0, 1], [2, 3, 1], [2, 1, 1], [2, 0, 1], [3, 2, 1], [3, 0, 2]] },
];
/** The first-position notes on strings 1–3, low to high (TAB reading): G A B C D E F G. */
export const FIRST_POSITION: [number, number][] = [[3, 0], [3, 2], [2, 0], [2, 1], [2, 3], [1, 0], [1, 1], [1, 3]];
/** Two-chord changes: Em–Am, then G–D (root, quality). */
const CHANGES: [[number, 'M' | 'm'], [number, 'M' | 'm']][] = [
  [[4, 'm'], [9, 'm']],
  [[7, 'M'], [2, 'M']],
];
/** Strumming charts, a chord a bar (root, quality). */
const STRUM_CHARTS: [number, 'M' | 'm'][][] = [
  [[4, 'm'], [9, 'm'], [4, 'm'], [9, 'm'], [4, 'm'], [9, 'm'], [4, 'm'], [4, 'm']],
  [[7, 'M'], [2, 'M'], [7, 'M'], [2, 'M'], [7, 'M'], [2, 'M'], [7, 'M'], [7, 'M']],
  [[4, 'm'], [7, 'M'], [2, 'M'], [9, 'm'], [4, 'm'], [7, 'M'], [2, 'M'], [4, 'm']],
];
const chordName = ([r, q]: [number, 'M' | 'm']): string => `${NAMES[r]}${q === 'm' ? 'm' : ''}`;

/** A generated rhythm (beats of onsets, lengths) for `bars` bars of 4/4: quarters, 8th pairs, quarter rests, halves. */
export function readRhythm(r: () => number, bars: number): { beat: number; dur: number }[] {
  const out: { beat: number; dur: number }[] = [];
  for (let bar = 0; bar < bars; bar++) {
    let b = 0;
    while (b < 4) {
      const last = bar === bars - 1;
      if (last && b === 2) {
        out.push({ beat: bar * 4 + 2, dur: 2 });
        break;
      }
      const c = pick(r, b === 0 ? ['q', 'ee', 'h'] : b === 3 ? ['q', 'ee', 'r'] : ['q', 'ee', 'r', 'h']);
      if (c === 'h' && b <= 2) {
        out.push({ beat: bar * 4 + b, dur: 2 });
        b += 2;
      } else if (c === 'ee') {
        out.push({ beat: bar * 4 + b, dur: 0.5 }, { beat: bar * 4 + b + 0.5, dur: 0.5 });
        b += 1;
      } else if (c === 'r') b += 1;
      else {
        out.push({ beat: bar * 4 + b, dur: 1 });
        b += 1;
      }
    }
  }
  return out;
}

function genFirst(s: DrillSpec, tu: Tuning): Drill {
  const op = s.option ?? 0;
  const evs: Ev[] = [];
  const open = (str: number, stroke: GN['stroke'] = 'D'): GN => ({ s: str, f: 0, stroke });
  switch (s.kind) {
    case 'gf-tune': {
      // Each open string, a half note at a time: the microphone checks every one is within ±15 cents.
      const order = op === 1 ? [...LOW_TO_HIGH].reverse() : LOW_TO_HIGH;
      order.forEach((str, i) => evs.push({ beat: i * 2, dur: 2, notes: [open(str)] }));
      const nm = op === 1 ? t('high to low', 'מהגבוה לנמוך') : t('low to high', 'מהנמוך לגבוה');
      return finish(s, tu, evs, { title: t(`Tuning check: every open string in tune, ${nm.en}`, `בדיקת כיוון: כל מיתר פתוח מכוון, ${nm.he}`), bpm: 60, evenness: false, keySig: 'C', goal: { bass: { cents: 15 } } });
    }
    case 'gf-hold': {
      // Holding the guitar and the pick: down strokes in quarters on one open string, then down-up 8ths.
      if (op === 2) {
        for (let i = 0; i < 16; i++) evs.push({ beat: i / 2, dur: 0.5, notes: [open(3, i % 2 ? 'U' : 'D')] });
        evs.push({ beat: 8, dur: 2, notes: [open(3)] });
      } else {
        const str = op === 1 ? 5 : 6;
        for (let i = 0; i < 16; i++) evs.push({ beat: i, dur: 1, notes: [open(str)] });
        evs.push({ beat: 16, dur: 2, notes: [open(str)] });
      }
      const nm = [t('down strokes on the low E', 'מכות למטה על מי הנמוך'), t('down strokes on the A string', 'מכות למטה על מיתר לה'), t('down-up 8ths on the G string', 'שמיניות למטה-למעלה על מיתר סול')][op % 3];
      return finish(s, tu, evs, { title: t(`Holding the guitar and the pick: ${nm.en}`, `אחיזת הגיטרה והמפרט: ${nm.he}`), bpm: 60, evenness: true, keySig: 'C' });
    }
    case 'gf-open': {
      const PATS = [
        [6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
        [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 2, 2, 3, 3],
        [6, 4, 5, 3, 4, 2, 3, 1, 1, 3, 2, 4, 3, 5, 4, 6],
      ];
      const pat = PATS[op % 3];
      pat.forEach((str, i) => evs.push({ beat: i, dur: 1, notes: [open(str)] }));
      evs.push({ beat: 16, dur: 2, notes: [open(6)] });
      const nm = [t('across and back', 'הלוך ושוב'), t('two on each string', 'שניים על כל מיתר'), t('skipping a string', 'בדילוג על מיתר')][op % 3];
      return finish(s, tu, evs, { title: t(`Open strings in time: ${nm.en}`, `מיתרים פתוחים בזמן: ${nm.he}`), bpm: 60, evenness: true, keySig: 'C' });
    }
    case 'gf-notes': {
      const tune = FIRST_NOTE_TUNES[op % FIRST_NOTE_TUNES.length];
      let b = 0;
      for (const [str, fret, len] of tune.notes) {
        evs.push({ beat: b, dur: len, notes: [{ s: str, f: fret, ...(fret ? { finger: fret, pos: 1 } : {}), stroke: 'D' }] });
        b += len;
      }
      return finish(s, tu, evs, { title: t(`First notes on ${tune.en}`, `צלילים ראשונים על ${tune.he}`), bpm: 60, evenness: false, keySig: 'C' });
    }
    case 'gf-change': {
      // One strum a bar (op 0, 2) or two (op 1, 3), eight bars, then the first chord again.
      const [a, b] = CHANGES[op >= 2 ? 1 : 0];
      const per = op % 2 ? 2 : 4;
      const sa = chordShape(a[0], a[1]);
      const sb = chordShape(b[0], b[1]);
      for (let bar = 0; bar < 8; bar++) for (let k = 0; k < 4 / per; k++) evs.push({ beat: bar * 4 + k * per, dur: per, notes: strumNotes(bar % 2 ? sb : sa, 'strum-down', 'D') });
      evs.push({ beat: 32, dur: 4, notes: strumNotes(sa, 'strum-down', 'D') });
      const dens = per === 2 ? t('2 strums a bar', '2 פריטות בתיבה') : t('1 strum a bar', 'פריטה אחת בתיבה');
      const d = finish(s, tu, evs, { title: t(`First chord change ${sa.name} – ${sb.name} · ${dens.en}`, `החלפת אקורדים ראשונה ${sa.name} – ${sb.name} · ${dens.he}`), bpm: 60, evenness: true, keySig: 'C' });
      return { ...d, chart: [...Array.from({ length: 8 }, (_, bar) => chordName(bar % 2 ? b : a)), chordName(a)] };
    }
    case 'gf-strum': {
      // Four down-strums a bar, a chord a bar.
      const chart = STRUM_CHARTS[op % STRUM_CHARTS.length];
      chart.forEach((c, bar) => {
        const sh = chordShape(c[0], c[1]);
        for (let k = 0; k < 4; k++) evs.push({ beat: bar * 4 + k, dur: 1, notes: strumNotes(sh, 'strum-down', 'D') });
      });
      evs.push({ beat: 32, dur: 4, notes: strumNotes(chordShape(chart[0][0], chart[0][1]), 'strum-down', 'D') });
      const d = finish(s, tu, evs, { title: t(`Quarter-note strumming: ${chart.slice(0, 4).map(chordName).join(' – ')}`, `פריטה ברבעים: ${chart.slice(0, 4).map(chordName).join(' – ')}`), bpm: 60, evenness: true, keySig: 'C' });
      return { ...d, chart: [...chart.map(chordName), chordName(chart[0])] };
    }
    case 'gf-tab': {
      // A generated line in first position, shown as TAB only: steps and skips, quarters, 8ths and halves.
      const r = seeded(`g-first:tab:${op}`);
      let i = pick(r, [0, 2, 3, 5]);
      for (const x of readRhythm(r, 4)) {
        const last = x.beat >= 14;
        const [str, fret] = FIRST_POSITION[last ? 0 : i];
        evs.push({ beat: x.beat, dur: x.dur, notes: [{ s: str, f: fret, stroke: 'D', ...(fret ? { finger: fret, pos: 1 } : {}) }] });
        const mv = pick(r, [-2, -1, -1, 1, 1, 2]);
        i = Math.max(0, Math.min(7, i + mv === i ? i + 1 : i + mv));
      }
      const d = finish(s, tu, evs, { title: t(`Reading TAB: first position · ${op + 1}`, `קריאת טאבים: מצב ראשון · ${op + 1}`), bpm: 60, evenness: false, keySig: 'C' });
      return { ...d, show: 'tab' };
    }
    case 'gf-rhythm': {
      // Rhythm reading (RSL Debut): a generated rhythm from the staff, strummed on muted strings (the pitch is never graded).
      const r = seeded(`g-first:rhythm:${op}`);
      for (const x of readRhythm(r, 4)) evs.push({ beat: x.beat, dur: x.dur, notes: [4, 3, 2].map((sn) => ({ s: sn, f: 5, tech: 'dead' as const, stroke: 'D' as const })) });
      const d = finish(s, tu, evs, { title: t(`Reading rhythm: muted strums · ${op + 1}`, `קריאת קצב: פריטות מושתקות · ${op + 1}`), bpm: 60, evenness: false, keySig: 'C' });
      return { ...d, show: 'staff' };
    }
  }
  throw new Error(`Unknown g-first kind ${s.kind}`);
}

// ───────────────────────────── riffs, one per grade ─────────────────────────────

/** A riff note: string, fret above the root's fret on the low E string, technique. */
type RN = [number, number, ('mute' | 'hammer' | 'pull')?];
/** A riff: two bars of [beat, beats, notes, accent?], played twice, then the root. Our own riffs. */
export const RIFFS: Record<number, { en: string; he: string; bars: [number, number, RN[], boolean?][] }[]> = {
  1: [
    { en: 'single notes in 8ths', he: 'צלילים בודדים בשמיניות', bars: [[0, 0.5, [[6, 0]]], [0.5, 0.5, [[6, 0]]], [1, 0.5, [[6, 3]]], [1.5, 0.5, [[6, 0]]], [2, 0.5, [[5, 0]]], [2.5, 0.5, [[5, 2]]], [3, 1, [[6, 3]]], [4, 0.5, [[6, 0]]], [4.5, 0.5, [[6, 0]]], [5, 0.5, [[6, 3]]], [5.5, 0.5, [[5, 0]]], [6, 1, [[5, 2]]], [7, 1, [[6, 0]]]] },
    { en: 'a call and its answer', he: 'שאלה ותשובה', bars: [[0, 1, [[5, 2]]], [1, 0.5, [[5, 0]]], [1.5, 0.5, [[6, 3]]], [2, 1, [[6, 0]]], [3, 0.5, [[6, 3]]], [3.5, 0.5, [[5, 0]]], [4, 1, [[5, 2]]], [5, 0.5, [[4, 0]]], [5.5, 0.5, [[5, 2]]], [6, 0.5, [[5, 0]]], [6.5, 0.5, [[6, 3]]], [7, 1, [[6, 0]]]] },
  ],
  2: [
    { en: 'palm-muted power chords', he: 'אקורדי פאוור מושתקים', bars: [[0, 0.5, P2(0, true)], [0.5, 0.5, P2(0, true)], [1, 0.5, P2(0, true)], [1.5, 0.5, P2(0, true)], [2, 1, P2(3), true], [3, 1, P2(5), true], [4, 0.5, P2(0, true)], [4.5, 0.5, P2(0, true)], [5, 0.5, P2(0, true)], [5.5, 0.5, P2(0, true)], [6, 0.5, P2(5)], [6.5, 0.5, P2(3)], [7, 1, P2(0), true]] },
    { en: 'pushed power chords', he: 'אקורדי פאוור דחופים', bars: [[0, 1.5, P2(0), true], [1.5, 0.5, P2(0, true)], [2, 0.5, P2(3)], [2.5, 1, P2(5), true], [3.5, 0.5, P2(3)], [4, 1.5, P2(0), true], [5.5, 0.5, P2(0, true)], [6, 1, P2(7), true], [7, 1, P2(5)]] },
  ],
  3: [
    { en: '3-note power chords with 16ths', he: 'אקורדי פאוור של 3 צלילים עם שש־עשריות', bars: [[0, 0.25, P3(0, true)], [0.25, 0.25, P3(0, true)], [0.5, 0.5, P3(0, true)], [1, 0.25, P3(0, true)], [1.25, 0.25, P3(0, true)], [1.5, 0.5, P3(0, true)], [2, 1, P3(3), true], [3, 0.5, P3(5), true], [3.5, 0.5, P3(3)], [4, 0.25, P3(0, true)], [4.25, 0.25, P3(0, true)], [4.5, 0.5, P3(0, true)], [5, 0.25, P3(0, true)], [5.25, 0.25, P3(0, true)], [5.5, 0.5, P3(0, true)], [6, 0.75, P3(7), true], [6.75, 0.75, P3(5), true], [7.5, 0.5, P3(3)]] },
    { en: 'syncopated 3-note power chords', he: 'אקורדי פאוור של 3 צלילים בסינקופה', bars: [[0, 0.75, P3(0), true], [0.75, 0.75, P3(0), true], [1.5, 0.5, P3(3)], [2, 0.5, P3(5)], [2.5, 0.5, P3(3)], [3, 1, P3(0, true)], [4, 0.75, P3(0), true], [4.75, 0.75, P3(0), true], [5.5, 0.5, P3(5)], [6, 0.5, P3(7)], [6.5, 0.5, P3(5)], [7, 1, P3(3), true]] },
  ],
  4: [
    { en: 'hammer-ons, pull-offs and a string skip', he: 'הקשות, משיכות ודילוג מיתר', bars: [[0, 0.5, [[6, 0]]], [0.5, 0.25, [[5, 0]]], [0.75, 0.25, [[5, 2, 'hammer']]], [1, 0.5, [[4, 0]]], [1.5, 0.5, [[4, 2]]], [2, 0.5, [[6, 3]]], [2.5, 0.5, [[4, 0]]], [3, 0.25, [[4, 2]]], [3.25, 0.25, [[4, 0, 'pull']]], [3.5, 0.5, [[5, 2]]], [4, 0.5, [[6, 0]]], [4.5, 0.25, [[6, 3]]], [4.75, 0.25, [[6, 0, 'pull']]], [5, 0.5, [[4, 0]]], [5.5, 0.5, [[5, 2]]], [6, 0.25, [[5, 0]]], [6.25, 0.25, [[5, 2, 'hammer']]], [6.5, 0.5, [[5, 0]]], [7, 1, [[6, 0]]]] },
    { en: 'a blues line with slurs', he: 'קו בלוז עם לגאטו', bars: [[0, 0.25, [[5, 0]]], [0.25, 0.25, [[5, 2, 'hammer']]], [0.5, 0.5, [[4, 0]]], [1, 0.5, [[6, 3]]], [1.5, 0.5, [[4, 2]]], [2, 0.25, [[4, 2]]], [2.25, 0.25, [[4, 0, 'pull']]], [2.5, 0.5, [[5, 2]]], [3, 1, [[6, 0]]], [4, 0.25, [[6, 0]]], [4.25, 0.25, [[6, 3, 'hammer']]], [4.5, 0.5, [[5, 0]]], [5, 0.5, [[3, 0]]], [5.5, 0.5, [[4, 2]]], [6, 0.25, [[4, 2]]], [6.25, 0.25, [[4, 0, 'pull']]], [6.5, 0.5, [[5, 2]]], [7, 1, [[6, 0]]]] },
  ],
  5: [
    { en: 'a 16th-note pedal point', he: 'צליל עוגב בשש־עשריות', bars: pedal([[5, 2], [5, 0], [4, 0], [5, 2], [4, 2], [4, 0], [5, 2], [5, 0]]) },
    { en: 'a pedal point climbing the box', he: 'צליל עוגב שעולה בתיבה', bars: pedal([[5, 0], [5, 2], [4, 0], [4, 2], [4, 0], [5, 2], [5, 0], [6, 3]]) },
  ],
};
function P2(o: number, mute = false): RN[] {
  return [[6, o, mute ? 'mute' : undefined], [5, o + 2, mute ? 'mute' : undefined]];
}
function P3(o: number, mute = false): RN[] {
  return [[6, o, mute ? 'mute' : undefined], [5, o + 2, mute ? 'mute' : undefined], [4, o + 2, mute ? 'mute' : undefined]];
}
/** The root on the low string between the notes of a line, in 16ths: R m R m, one line note per 8th. */
function pedal(line: [number, number][]): [number, number, RN[], boolean?][] {
  const out: [number, number, RN[], boolean?][] = [];
  line.forEach(([str, f], i) => {
    out.push([i * 0.5, 0.25, [[6, 0, 'mute']], i % 2 === 0], [i * 0.5 + 0.25, 0.25, [[str, f]]]);
  });
  // The second bar: the same line, the last beat a held root.
  line.slice(0, 6).forEach(([str, f], i) => out.push([4 + i * 0.5, 0.25, [[6, 0, 'mute']], i % 2 === 0], [4 + i * 0.5 + 0.25, 0.25, [[str, f]]]));
  out.push([7, 1, [[6, 0]], true]);
  return out;
}

function genRiff(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const grade = Number(s.kind.split('-')[1]) || 1;
  const riff = RIFFS[grade][(s.option ?? 0) % RIFFS[grade].length];
  const f = lowFret(tu, key, 6);
  const evs: Ev[] = [];
  for (let rep = 0; rep < 2; rep++)
    for (const [beat, dur, ns, acc] of riff.bars)
      evs.push({ beat: rep * 8 + beat, dur, notes: ns.map(([str, off, tech]) => ({ s: str, f: f + off, stroke: 'D' as const, ...(tech ? { tech } : {}), ...(acc ? { acc: true } : {}) })) });
  evs.push({ beat: 16, dur: 2, notes: [{ s: 6, f, stroke: 'D' }] });
  return finish(s, tu, evs, { title: tk(`Grade ${grade} riff: ${riff.en}`, `ריף לכיתה ${grade}: ${riff.he}`, key), bpm: 72, evenness: true, keySig: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][mod(key + 3, 12)] });
}

/** Build a g-first or g-riff item. */
export function generateGuitarFirst(s: DrillSpec, tu: Tuning): Drill {
  return s.family === 'g-riff' ? genRiff(s, tu) : genFirst(s, tu);
}

// ───────────────────────────── the families ─────────────────────────────

/** Riff keys: the guitar's friendly keys first, then all 12 (the owner's rule). */
export const RIFF_KEYS = all12([4, 9, 7, 2, 0, 5]);

export function guitarFirstFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-first';
  const P = (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'guitar', ...o });
  // Grade 0 (RSL Debut); reading TAB and rhythm at tempo are grade 1 (they sit after the grade-1 chord and strum levels).
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string): GuitarLevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: [0], tempo, sub, grade: level >= 7 ? 1 : 0 });
  return {
    id: fam,
    title: t('First steps on guitar', 'צעדים ראשונים בגיטרה'),
    style: 'classical',
    genres: ['all'],
    instruments: ['guitar'],
    levels: [
      L(1, 'Tuning check: every open string in tune', 'בדיקת כיוון: כל מיתר פתוח מכוון', [P('gf-tune'), P('gf-tune', { option: 1 })], [60, 60], 'in tune ±15 cents'),
      L(2, 'Holding the guitar and the pick', 'אחיזת הגיטרה והמפרט', [0, 1, 2].map((o) => P('gf-hold', { option: o })), [60, 90], 'quarters → 8ths'),
      L(3, 'Open strings in time', 'מיתרים פתוחים בזמן', [0, 1, 2].map((o) => P('gf-open', { option: o })), [60, 100], 'quarters'),
      L(4, 'First notes on strings 1–3', 'צלילים ראשונים על מיתרים 1–3', [0, 1, 2, 3].map((o) => P('gf-notes', { option: o })), [60, 96], 'quarters / halves'),
      L(5, 'First chord changes: Em–Am, then G–D', 'החלפות אקורדים ראשונות: Em–Am, ואז G–D', [0, 1, 2, 3].map((o) => P('gf-change', { option: o })), [60, 90], '1 → 2 strums a bar'),
      L(6, 'Quarter-note strumming', 'פריטה ברבעים', [0, 1, 2].map((o) => P('gf-strum', { option: o })), [60, 100], 'quarters'),
      L(7, 'Reading TAB', 'קריאת טאבים', [0, 1, 2, 3].map((o) => P('gf-tab', { option: o })), [60, 96], 'quarters / 8ths'),
      L(8, 'Reading rhythm on muted strings', 'קריאת קצב על מיתרים מושתקים', [0, 1, 2, 3].map((o) => P('gf-rhythm', { option: o })), [60, 96], 'quarters / 8ths / rests'),
    ],
  };
}

export function guitarRiffFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-riff';
  const P = (grade: number, option: number): SpecTemplate => ({ family: fam, kind: `riff-${grade}`, hands: 'R', instrument: 'guitar', option });
  const L = (grade: number, en: string, he: string, tempo: [number, number], sub: string): GuitarLevelDef => ({ id: `${fam}-${grade}`, level: grade, title: t(en, he), specs: [0, 1].map((o) => ({ ...P(grade, o), tempo: tempo[0] })), keys: RIFF_KEYS, tempo, sub, grade });
  return {
    id: fam,
    title: t('Riffs by grade', 'ריפים לפי כיתה'),
    style: 'classical',
    genres: ['rock', 'blues', 'metal', 'pop', 'funk'],
    instruments: ['guitar'],
    levels: [
      L(1, 'Grade 1 riffs: single notes in 8ths', 'ריפים לכיתה 1: צלילים בודדים בשמיניות', [70, 100], '8ths'),
      L(2, 'Grade 2 riffs: palm-muted power chords', 'ריפים לכיתה 2: אקורדי פאוור מושתקים', [70, 110], '8ths'),
      L(3, 'Grade 3 riffs: 3-note power chords and 16ths', 'ריפים לכיתה 3: אקורדי פאוור של 3 צלילים ושש־עשריות', [60, 96], '16ths'),
      L(4, 'Grade 4 riffs: slurs and string skips', 'ריפים לכיתה 4: לגאטו ודילוגי מיתר', [60, 92], '16ths'),
      L(5, 'Grade 5 riffs: a 16th pedal point', 'ריפים לכיתה 5: צליל עוגב בשש־עשריות', [56, 84], '16ths'),
    ],
  };
}
