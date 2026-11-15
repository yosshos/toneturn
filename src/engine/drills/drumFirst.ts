// AUDIT-6 Stage B (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md §4.5 priorities 2, 4 and 6; DB-1, DB-3, DB-9, DB-10):
// the drums' first steps were mini-lessons only. The measured `d-first` family:
//
//   1 grip: even quarters, one hand at a time · 2 rebound: full strokes hand to hand, even and balanced ·
//   3 single strokes in quarters and 8ths · 4 counting "1 e & a": quarters, 8ths, 16ths, the beat accented ·
//   5 a basic rock beat (quarter-note hi-hat first) · 6 the 8th-note paradiddle (RSL Debut, ♩70) ·
//   7 snare reading in 2/4, 3/4 and 6/8 (generated) · 8 the buzz (multiple-bounce) roll: every stroke buzzes
//
// Reading items are generated from a seed per variant, so there is nothing to learn by heart. Graded by drumAnalyze
// like every drum level (per-limb timing, hit rate, velocity rules; the buzz by its bounces, goal.buzz). Pure.

import type { Drill, DrillSpec, DrumFamilyId } from './types';
import type { SpecTemplate } from './generate';
import { bar, finish, levelOfKind, line, rep, rnd, type DH, type DrumFamilyDef, type DrumLevelDef } from './drums';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

/** Reading variants: 0–1 in 2/4, 2–3 in 3/4, 4–5 in 6/8. */
export const READ_METERS = [2, 2, 3, 3, 6, 6] as const;

/** Generated snare reading in 2/4 (8 bars), 3/4 (6 bars) or 6/8 (4 bars, in 8ths): the last bar one long note. */
export function snareReading(r: () => number, meter: 2 | 3 | 6): DH[] {
  const hits: DH[] = [];
  if (meter === 6) {
    // Beats of three 8ths: three 8ths, quarter + 8th, 8th + quarter, a dotted quarter.
    const GROUPS = [[0, 1, 2], [0, 2], [0, 1], [0]];
    for (let g = 0; g < 6; g++) for (const x of pick(r, GROUPS)) hits.push({ b: g * 3 + x, v: 'snare' });
    hits.push({ b: 18, v: 'snare' });
    hits.forEach((h, i) => (h.d = i === hits.length - 1 ? 6 : Math.min((hits[i + 1]?.b ?? 24) - h.b, 3 - (h.b % 3))));
  } else {
    const bars = meter === 2 ? 8 : 6;
    // Beat cells: a quarter, two 8ths, a quarter rest (never on a bar's 1).
    for (let b = 0; b < (bars - 1) * meter; b++) {
      const c = pick(r, b % meter === 0 ? [[0], [0, 0.5], [0]] : [[0], [0, 0.5], [], [0]]);
      for (const x of c) hits.push({ b: b + x, v: 'snare' });
    }
    hits.push({ b: (bars - 1) * meter, v: 'snare' });
    hits.forEach((h, i) => (h.d = i === hits.length - 1 ? meter : Math.min((hits[i + 1]?.b ?? bars * meter) - h.b, Math.ceil(h.b + 1e-6) - h.b || 1)));
  }
  // Hand to hand: R on the beat (or the 8th group's start), the other hand in between.
  let last: 'R' | 'L' = 'L';
  for (const h of hits) {
    const onBeat = meter === 6 ? h.b % 3 === 0 : Number.isInteger(h.b);
    h.h = onBeat ? 'R' : last === 'R' ? 'L' : 'R';
    last = h.h;
  }
  return hits;
}

/** Build a d-first item: the beginner's verdict tier on every level (the level number would make 4–8 stricter). */
export function generateDrumFirst(s: DrillSpec): Drill {
  const d = genDrumFirst(s);
  return { ...d, drum: { ...d.drum!, tier: 1 } };
}

function genDrumFirst(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  switch (levelOfKind(s.kind)) {
    case 1: {
      const st = op === 2 ? 'RRRRLLLL' : op === 1 ? 'L' : 'R';
      const nm = [t('right hand', 'יד ימין'), t('left hand', 'יד שמאל'), t('a bar each hand', 'תיבה לכל יד')][op % 3];
      return finish(s, line(st, 16, 1), { title: t(`Grip: even quarters, low and relaxed · ${nm.en}`, `אחיזה: רבעים שווים, נמוך ורפוי · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.15 } });
    }
    case 2: {
      // Full strokes: the stick falls from the same height and rebounds to it — even loudness, both hands alike.
      const st = op === 2 ? 'RRRRLLLL' : op === 1 ? 'LR' : 'RL';
      const nm = [t('hand to hand', 'יד ליד'), t('lead left', 'מובילים בשמאל'), t('four each hand', 'ארבע בכל יד')][op % 3];
      return finish(s, line(st, 16, 1), { title: t(`Rebound: full strokes · ${nm.en}`, `ריבאונד: מכות מלאות · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.15, balance: 0.12 } });
    }
    case 3: {
      const st = op === 1 ? 'LR' : 'RL';
      const hits = op === 2 ? [...line(st, 8, 0.5, 0), ...line(st, 4, 1, 4), ...line(st, 8, 0.5, 8), ...line(st, 4, 1, 12)] : [...line(st, 4, 1, 0), ...line(st, 8, 0.5, 4), ...line(st, 4, 1, 8), ...line(st, 8, 0.5, 12)];
      const nm = [t('lead right', 'מובילים בימין'), t('lead left', 'מובילים בשמאל'), t('8ths first', 'קודם שמיניות')][op % 3];
      return finish(s, hits, { title: t(`Single strokes: quarters, then 8ths · ${nm.en}`, `מכות בודדות: רבעים, ואז שמיניות · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.2 } });
    }
    case 4: {
      // Counting out loud: "1 2 3 4", "1 & 2 &", "1 e & a 2 e & a", then 8ths again — the beat accented.
      const st = op === 1 ? 'LR' : 'RL';
      const acc = (per: number) => (i: number) => (i % per === 0 ? { acc: true } : {});
      const hits = op === 2 ? [...line(st, 16, 0.25, 0, acc(4)), ...line(st, 8, 0.5, 4, acc(2)), ...line(st, 4, 1, 8, acc(1)), ...line(st, 8, 0.5, 12, acc(2))] : [...line(st, 4, 1, 0, acc(1)), ...line(st, 8, 0.5, 4, acc(2)), ...line(st, 16, 0.25, 8, acc(4)), ...line(st, 8, 0.5, 12, acc(2))];
      const nm = [t('lead right', 'מובילים בימין'), t('lead left', 'מובילים בשמאל'), t('16ths first', 'קודם שש־עשריות')][op % 3];
      return finish(s, hits, { title: t(`Counting 1 e & a: quarters, 8ths, 16ths · ${nm.en}`, `לספור 1 e & a: רבעים, שמיניות, שש־עשריות · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.25 } });
    }
    case 5: {
      // The basic rock beat: hi-hat in quarters (then 8ths), kick on 1 and 3, snare on 2 and 4.
      const L = [
        { h: 'x.x.x.x.', s: '..x...x.', k: 'x...x...' },
        { h: 'x.x.x.x.', s: '..x...x.', k: 'x...xx..' },
        { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' },
      ][op % 3];
      const nm = [t('quarter-note hi-hat', 'היי־האט ברבעים'), t('a kick on the "&" of 3', 'קיק על ה"וְ" של 3'), t('8th-note hi-hat', 'היי־האט בשמיניות')][op % 3];
      return finish(s, rep(4, (k) => bar(L, 2, k * 4)), { title: t(`A basic rock beat · ${nm.en}`, `קצב רוק בסיסי · ${nm.he}`), bpm: 70, bars: 4, mic: false });
    }
    case 6: {
      // The paradiddle in 8ths (RSL Debut): RLRR LRLL, the first of each group accented.
      const st = op === 2 ? 'LRLLRLRR' : 'RLRRLRLL';
      const accents = op !== 1;
      const hits = line(st, 32, 0.5, 0, (i) => (accents && i % 4 === 0 ? { acc: true } : {}));
      const nm = [t('accents on each group', 'הדגשה בכל קבוצה'), t('even, no accents', 'שווה, בלי הדגשות'), t('lead left, accented', 'מובילים בשמאל, עם הדגשות')][op % 3];
      return finish(s, hits, { title: t(`The paradiddle in 8ths · ${nm.en}`, `פאראדידל בשמיניות · ${nm.he}`), bpm: 50, bars: 4, mic: true, goal: accents ? { accentPos: 0.8, accentGap: 0.25 } : { velCv: 0.2 } });
    }
    case 7: {
      const meter = READ_METERS[op % READ_METERS.length];
      const r = rnd(`d-first:read:${op}`);
      const hits = snareReading(r, meter);
      const sig = meter === 6 ? '6/8' : `${meter}/4`;
      const nm = t(`Snare reading in ${sig} · ${(op % 2) + 1}`, `קריאה על הסנר ב־${sig} · ${(op % 2) + 1}`);
      if (meter === 6) return finish(s, hits, { title: nm, bpm: 120, bars: 4, meter: 6, pulse: 8, groups: [3, 3], mic: true, show: 'staff' });
      return finish(s, hits, { title: nm, bpm: 70, bars: meter === 2 ? 8 : 6, meter, mic: true, show: 'staff' });
    }
    case 8: {
      // The buzz roll: each stroke presses into the head and buzzes (at least three bounces), hand to hand.
      const plan: { st: string; n: number; step: number; en: string; he: string }[] = [
        { st: 'RL', n: 16, step: 1, en: 'quarter-note buzzes', he: 'באזים ברבעים' },
        { st: 'RL', n: 32, step: 0.5, en: '8th-note buzzes, a closed roll', he: 'באזים בשמיניות, גלגול סגור' },
        { st: 'LR', n: 16, step: 1, en: 'quarter-note buzzes, lead left', he: 'באזים ברבעים, מובילים בשמאל' },
      ];
      const p = plan[op % plan.length];
      return finish(s, line(p.st, p.n, p.step), { title: t(`The buzz roll · ${p.en}`, `גלגול באז · ${p.he}`), bpm: 60, bars: 4, mic: false, goal: { buzz: { min: 3, share: 0.8 } } });
    }
  }
  throw new Error(`Unknown d-first kind ${s.kind}`);
}

/** The drums' first steps: eight measured levels, ~700–880 on the path. */
export function drumFirstFamily(): DrumFamilyDef {
  const fam: DrumFamilyId = 'd-first';
  const L = (level: number, en: string, he: string, name: string, variants: number, tempo: [number, number], sub: string, mic: boolean): DrumLevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: t(en, he),
    specs: Array.from({ length: variants }, (_, o): SpecTemplate => ({ family: fam, kind: `${level}:${name}`, option: o, hands: 'RL', instrument: 'drums', tempo: tempo[0] })),
    keys: [0],
    tempo,
    sub,
    mic,
  });
  const read = L(7, 'Snare reading in 2/4, 3/4 and 6/8', 'קריאה על הסנר ב־2/4, 3/4 ו־6/8', 'read', 6, [60, 90], '1/8', true);
  return {
    id: fam,
    title: t('First steps on drums', 'צעדים ראשונים בתופים'),
    style: 'classical',
    genres: ['all'],
    instruments: ['drums'],
    levels: [
      L(1, 'Grip: even strokes, one hand', 'אחיזה: מכות שוות, יד אחת', 'grip', 3, [60, 80], '1/4', true),
      L(2, 'Rebound: full strokes', 'ריבאונד: מכות מלאות', 'rebound', 3, [60, 90], '1/4', true),
      L(3, 'Single strokes in quarters and 8ths', 'מכות בודדות ברבעים ובשמיניות', 'singles', 3, [60, 100], '1/8', true),
      L(4, 'Counting 1 e & a', 'לספור 1 e & a', 'count', 3, [60, 80], '1/16', true),
      L(5, 'A basic rock beat', 'קצב רוק בסיסי', 'rock', 3, [70, 100], '1/8', false),
      L(6, 'The 8th-note paradiddle', 'פאראדידל בשמיניות', 'para8', 3, [50, 70], '1/8', true),
      // 6/8 variants count 8ths (♩ range [60, 90] × 2): their own start, the same climb (plan.targetBpmOf, pulse 8).
      { ...read, specs: read.specs.map((x) => (READ_METERS[(x.option ?? 0) % 6] === 6 ? { ...x, tempo: 120 } : x)) },
      L(8, 'The buzz roll', 'גלגול באז', 'buzz', 3, [60, 80], '1/8', false),
    ],
  };
}
