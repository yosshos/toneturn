// GUITAR_DEEPENING §4.1 (Batch C, 2026-11-11): 20 more core guitar levels — connecting CAGED positions, 3nps across
// the neck, interval sequences; rock riffs, neo-soul embellishments, Mizrahi maqsum strums; bends in phrases, hybrid
// lead phrases, pinch harmonics and oblique bends; 7th-chord sweeps and fusion picking; legato with shifts and tapped
// sequences; rhythm-chart hits, two-position reading, lead sheets; 7th arpeggios in all CAGED shapes, extended
// arpeggios and upper-structure triads; chord-scale lines over standards' changes and a displaced motif.
// Every line is generated here (seeded where random), nothing copied; standards give chord symbols only (legal).
//
// Pure and deterministic. guitar.ts imports this file: guitar.ts helpers are only called inside functions.

import type { Drill, DrillSpec, FamilyId, LevelExamTag } from './types';
import type { SpecTemplate } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import {
  finish,
  t,
  mod,
  NAMES,
  SIG,
  SCALES,
  MAJOR,
  windowScale,
  lowFret,
  lowFret1,
  upDown,
  seqEv,
  chordShape,
  top3Triads,
  powerShape,
  cagedWindow,
  rng,
  guitarItemId,
  IMPRO_FORMS,
  MAX_FRET,
  type Ev,
  type GN,
  type T2,
  type Q,
  type GuitarLevelDef,
  type GuitarTechnique,
  type Stroke,
} from './guitar';
import { STANDARD_CHANGES } from '../standards';
import { parseChart } from '../charts';

/** The new kinds per family (the dispatcher sends these here). */
export const CORE2_KINDS: Record<string, string[]> = {
  'g-scales': ['caged-connect', '3nps-neck', 'interval-seq'],
  'g-rhythm': ['rock-riff', 'neo-soul', 'mizrahi'],
  'g-lead': ['bend-phrase', 'hybrid-lead', 'pinch', 'oblique'],
  'g-picking': ['sweep7', 'fusion-pick'],
  'g-legato': ['legato-shift', 'tap8'],
  'g-reading': ['chart-hits', 'two-pos', 'lead-sheet'],
  'g-arps': ['caged7', 'ext-arp', 'ust'],
  'g-impro': ['chord-scale', 'motif'],
};
const OWN = new Set(Object.entries(CORE2_KINDS).flatMap(([f, ks]) => ks.map((k) => `${f}:${k}`)));

type P = { s: number; f: number };
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];
const SEV: { ints: number[]; name: string }[] = [
  { ints: [0, 4, 7, 11], name: 'maj7' },
  { ints: [0, 4, 7, 10], name: '7' },
  { ints: [0, 3, 7, 10], name: 'm7' },
  { ints: [0, 3, 6, 10], name: 'm7♭5' },
];
const pitchOf = (tu: Tuning, p: P): number => noteAt(tu, p.s, p.f);

/** A place for a pitch whose fret is nearest `center` (frets 0 … MAX_FRET), on the given strings. */
function near(tu: Tuning, pitch: number, center: number, strings = [6, 5, 4, 3, 2, 1]): P | null {
  let best: P | null = null;
  for (const s of strings) {
    if (s > tu.open.length) continue;
    const f = pitch - tu.open[s - 1];
    if (f < 0 || f > MAX_FRET) continue;
    if (!best || Math.abs(f - center) < Math.abs(best.f - center)) best = { s, f };
  }
  return best;
}
/** Bring a pitch into [lo, hi] by octaves. */
const inRange = (p: number, lo: number, hi: number): number => {
  let x = p;
  while (x < lo) x += 12;
  while (x > hi) x -= 12;
  return x;
};

/** An ascending run placed in one fret window, walking toward the thinner strings; null when it doesn't fit. */
function placeAsc(tu: Tuning, pitches: number[], lo: number, hi: number, fromStr: number): P[] | null {
  const out: P[] = [];
  let str = fromStr;
  for (const m of pitches) {
    let got: P | null = null;
    for (let s = str; s >= 1; s--) {
      const f = m - tu.open[s - 1];
      if (f >= Math.max(0, lo) && f <= hi && f <= MAX_FRET) {
        got = { s, f };
        break;
      }
    }
    if (!got) return null;
    out.push(got);
    str = got.s;
  }
  return out;
}

/** Mark a fretting-hand shift on one string (≥ 3 frets) as a slide. */
function markSlides(gs: GN[]): GN[] {
  return gs.map((g, i) => (i > 0 && gs[i - 1].s === g.s && Math.abs(gs[i - 1].f - g.f) >= 3 && !g.tech ? { ...g, tech: 'slide' as GuitarTechnique } : g));
}

const kname = (key: number, minor = false): string => NAMES[mod(key, 12)] + (minor ? 'm' : '');
const T = (en: string, he: string, key: number, minor = false): T2 => t(`${en} · ${kname(key, minor)}`, `${he} · ${kname(key, minor)}`);

// ───────────────────────────── scales ─────────────────────────────

/** Two octaves of the major scale in 4-note chunks, each chunk in a window shifted up on the beat (CAGED connected). */
function cagedConnect(tu: Tuning, key: number, op: number): P[] {
  const str = op === 0 ? 6 : 5;
  const R = noteAt(tu, str, lowFret(tu, key, str));
  const ps = Array.from({ length: 16 }, (_, k) => R + 12 * Math.floor(k / 7) + MAJOR[k % 7]);
  const out: P[] = [];
  let lo = Math.max(0, lowFret(tu, key, str) - 1);
  let curStr = str;
  for (let c = 0; c < 4; c++) {
    const chunk = ps.slice(c * 4, c * 4 + 4);
    const tries = c === 0 ? [lo, lo + 1] : [lo + 2, lo + 3, lo + 1, lo + 4, lo + 5, lo, lo - 1];
    let done: P[] | null = null;
    for (const l of tries) {
      done = placeAsc(tu, chunk, l, l + 4, curStr);
      if (done) {
        lo = l;
        break;
      }
    }
    if (!done) done = chunk.map((m) => near(tu, m, lo + 2)!);
    out.push(...done);
    curStr = done[done.length - 1].s;
  }
  return out;
}

/** Three notes per string across the neck (one string takes four: a slide shift). */
function threeNpsNeck(tu: Tuning, key: number, deg: number): P[] {
  const counts = [3, 3, 3, 4, 3, 3];
  const start = noteAt(tu, 6, lowFret(tu, key + MAJOR[deg], 6));
  const n = counts.reduce((a, b) => a + b, 0);
  const pcs = MAJOR.map((i) => mod(key + i, 12));
  const ms: number[] = [start];
  let p = start;
  while (ms.length < n) {
    p++;
    if (pcs.includes(mod(p, 12))) ms.push(p);
  }
  const out: P[] = [];
  let i = 0;
  counts.forEach((c, k) => {
    const s = 6 - k;
    for (let j = 0; j < c; j++, i++) out.push({ s, f: ms[i] - tu.open[s - 1] });
  });
  return out;
}

function genScales2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  switch (s.kind) {
    case 'caged-connect': {
      const up = cagedConnect(tu, key, op === 2 ? 1 : op);
      const line = op === 2 ? [...up].reverse() : upDown(up);
      const gs = markSlides(line.map((x) => ({ ...x, stroke: 'D' as Stroke })));
      const nm = op === 0 ? t('from the root on 6', 'מהיסוד במיתר 6') : op === 1 ? t('from the root on 5', 'מהיסוד במיתר 5') : t('descending from the top', 'יורד מלמעלה');
      return finish(s, tu, seqEv(gs, 0.5), { title: T(`Connecting positions: two octaves across three shapes, ${nm.en}`, `חיבור מצבים: שתי אוקטבות דרך שלוש צורות, ${nm.he}`, key), bpm: 70, evenness: true });
    }
    case '3nps-neck': {
      const up = threeNpsNeck(tu, key, op);
      const gs = markSlides(upDown(up).map((x, i) => ({ ...x, stroke: (i % 2 === 0 ? 'D' : 'U') as Stroke })));
      const from = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'][op];
      const fromHe = ['היסוד', 'הדרגה 2', 'הדרגה 3', 'הדרגה 4', 'הדרגה 5', 'הדרגה 6', 'הדרגה 7'][op];
      return finish(s, tu, seqEv(gs, 1 / 3), { title: T(`3 notes per string across the neck, slide shift, from the ${from}`, `3 צלילים במיתר לאורך הצוואר, מעבר בהחלקה, מ${fromHe}`, key), bpm: 60, evenness: true });
    }
    case 'interval-seq': {
      const [lo, hi] = cagedWindow(tu, key, s.position ?? 0);
      const W = windowScale(tu, key, MAJOR, lo, hi);
      const gs: GN[] = [];
      if (op === 3) {
        // 1-3-2-4 groups up, 4-2-3-1 down.
        for (let i = 0; i + 3 < W.length; i++) gs.push(W[i], W[i + 2], W[i + 1], W[i + 3]);
        for (let i = W.length - 1; i - 3 >= 0; i--) gs.push(W[i], W[i - 2], W[i - 1], W[i - 3]);
      } else {
        const gap = [2, 3, 5][op];
        for (let i = 0; i + gap < W.length; i++) gs.push(W[i], W[i + gap]);
        for (let i = W.length - 1; i - gap >= 0; i--) gs.push(W[i], W[i - gap]);
      }
      const nm = [t('3rds', 'טרצות'), t('4ths', 'קוורטות'), t('6ths', 'סקסטות'), t('1-3-2-4 groups', 'קבוצות 1-3-2-4')][op];
      return finish(s, tu, seqEv(gs.map((x, i) => ({ ...x, stroke: (i % 2 === 0 ? 'D' : 'U') as Stroke })), 0.5), { title: T(`Interval sequence in position: ${nm.en}, shape ${['E', 'D', 'C', 'A', 'G'][(s.position ?? 0) % 5]}`, `רצף מרווחים במצב: ${nm.he}, צורה ${['E', 'D', 'C', 'A', 'G'][(s.position ?? 0) % 5]}`, key), bpm: 80, evenness: true });
    }
  }
  throw new Error(`Unknown scales kind ${s.kind}`);
}

// ───────────────────────────── rhythm ─────────────────────────────

const RIFFS = ['P..mm.P.n.N.P.x.P..mm.P.N.n.x.P.', 'P.x.Pn.nP.x.n.N.P.x.Pn.nPPx.N.n.', 'm.m.P..m.mP.n.N.m.m.P..mn.N.P...'];

function genRhythm2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const evs: Ev[] = [];
  switch (s.kind) {
    case 'rock-riff': {
      // Power chords, palm-muted roots, single pentatonic notes and dead strums, 16th syncopation (2 bars, twice).
      const pw = powerShape(tu, key);
      const rs = pw[0].s;
      const rf = pw[0].f;
      const pent = windowScale(tu, key, SCALES.pentaMinor, rf, rf + 3, [rs, rs - 1]);
      const pat = RIFFS[op % RIFFS.length];
      const hits = [...pat].map((c, i) => [i, c] as [number, string]).filter(([, c]) => c !== '.');
      for (let rep = 0; rep < 2; rep++)
        hits.forEach(([i, c], k) => {
          const nxt = k + 1 < hits.length ? hits[k + 1][0] : pat.length;
          const beat = rep * 8 + i / 4;
          const dur = (nxt - i) / 4;
          let notes: GN[];
          if (c === 'P') notes = pw.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke }));
          else if (c === 'x') notes = pw.map((x) => ({ ...x, tech: 'dead' as GuitarTechnique, stroke: 'D' as Stroke }));
          else if (c === 'm') notes = [{ s: rs, f: rf, tech: 'mute', stroke: 'D' }];
          else notes = [{ ...pent[c === 'n' ? 1 : 2], stroke: 'D' }];
          evs.push({ beat, dur, notes });
        });
      return finish(s, tu, evs, { title: T(`Rock riff ${op + 1}: power chords, single notes, muting between hits`, `ריף רוק ${op + 1}: אקורדי פאוור, צלילים בודדים, השתקה בין המכות`, key), bpm: 80, evenness: true });
    }
    case 'neo-soul': {
      // Upper-structure triads (3-5-7) on strings 3-2-1 with double stops and a hammered grace note, 16ths.
      const progs: [number, Q][][] = [
        [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']],
        [[2, 'm7'], [7, '7'], [0, 'maj7'], [4, 'm7']],
      ];
      const prog = progs[op % 2];
      let nearF = 5;
      prog.forEach(([d, q], bar) => {
        const r = key + d;
        const pcs = q === 'maj7' ? [r + 4, r + 7, r + 11] : q === 'm7' ? [r + 3, r + 7, r + 10] : [r + 4, r + 7, r + 10];
        const v = top3Triads(tu, pcs, nearF);
        nearF = v[0].f;
        const b = bar * 4;
        const top = v[2];
        const grace = { s: 1, f: top.f - 2 >= 1 ? top.f - 2 : top.f - 1 };
        evs.push({ beat: b, dur: 0.75, notes: v.map((x) => ({ ...x, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) });
        evs.push({ beat: b + 0.75, dur: 0.75, notes: [{ ...v[1], stroke: 'D' }, { ...v[2], stroke: 'D' }] });
        if (grace.f >= 1) {
          evs.push({ beat: b + 1.5, dur: 0.25, notes: [{ ...grace, stroke: 'D' }] });
          evs.push({ beat: b + 1.75, dur: 0.75, notes: [{ ...top, tech: 'hammer' }] });
        } else evs.push({ beat: b + 1.5, dur: 1, notes: [{ ...top, stroke: 'D' }] });
        evs.push({ beat: b + 2.5, dur: 0.5, notes: v.map((x) => ({ ...x, tech: 'strum-up' as GuitarTechnique, stroke: 'U' as Stroke })) });
        evs.push({ beat: b + 3, dur: 0.5, notes: [{ ...v[1], stroke: 'D' }] });
        evs.push({ beat: b + 3.5, dur: 0.5, notes: [{ ...v[0], stroke: 'U' }] });
      });
      const name = prog.map(([d, q]) => NAMES[mod(key + d, 12)] + q).join(' ');
      return finish(s, tu, evs, { title: t(`Neo-soul: upper triads, double stops and hammered grace notes · ${name}`, `ניאו-סול: משולשים עליונים, צלילים כפולים וקישוטי הקשה · ${name}`), bpm: 70, evenness: true, keySig: SIG[key] });
    }
    case 'mizrahi': {
      // Maqsum (D T – T D – T –) strummed over Hijaz chords I – ♭II – iv, then a Hijaz fill in 16ths. Twice.
      const chords: [number, Q][] = [[0, 'M'], [1, 'M'], [5, 'm']];
      const maqsum: [number, 'D' | 'T', number][] = [[0, 'D', 0.5], [0.5, 'T', 1], [1.5, 'T', 0.5], [2, 'D', 1], [3, 'T', 1]];
      const lo = Math.max(0, lowFret1(tu, key, 6) - 1);
      const W = windowScale(tu, key, PHRYG_DOM, lo, lo + 4);
      const R0 = noteAt(tu, 6, lowFret1(tu, key, 6));
      const iTop = W.findIndex((x) => pitchOf(tu, x) === R0 + 12);
      const iRoot = W.findIndex((x) => pitchOf(tu, x) === R0);
      for (let rep = 0; rep < 2; rep++) {
        chords.forEach(([d, q], bar) => {
          const sh = chordShape(key + d, q, op === 0);
          const b = rep * 16 + bar * 4;
          for (const [at, k, dur] of maqsum)
            evs.push({ beat: b + at, dur, notes: k === 'D' ? sh.dots.map((x) => ({ s: x.s, f: x.f, finger: x.finger, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) : sh.dots.filter((x) => x.s <= 3).map((x) => ({ s: x.s, f: x.f, finger: x.finger, tech: 'strum-up' as GuitarTechnique, stroke: 'U' as Stroke })) });
        });
        const b = rep * 16 + 12;
        const fill = W.slice(iRoot, iTop + 1).reverse();
        fill.forEach((x, k) => evs.push({ beat: b + k * 0.25, dur: k === fill.length - 1 ? 4 - k * 0.25 : 0.25, notes: [{ ...x, stroke: k % 2 === 0 ? 'D' : 'U' }] }));
      }
      return finish(s, tu, evs, { title: T(`Mizrahi: maqsum strum and a Hijaz fill${op === 0 ? '' : ' (barre chords)'}`, `מזרחית: פריטת מקסום ומילוי חיג׳אז${op === 0 ? '' : ' (אקורדי ברה)'}`, key), bpm: 80, evenness: true, keySig: SIG[mod(key + 5, 12)] });
    }
  }
  throw new Error(`Unknown rhythm kind ${s.kind}`);
}

// ───────────────────────────── lead ─────────────────────────────

function genLead2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const r = lowFret1(tu, key, 6);
  const box = windowScale(tu, key, SCALES.pentaMinor, r, r + 3);
  const evs: Ev[] = [];
  let beat = 0;
  const push = (dur: number, ...notes: GN[]) => {
    evs.push({ beat, dur, notes });
    beat += dur;
  };
  const posOf = (f: number) => Math.max(1, f - 2);
  switch (s.kind) {
    case 'bend-phrase': {
      // Four 2-bar phrases: two box notes, a bend to pitch, its release, a step down, a held note with vibrato.
      const cents = op === 1 ? 100 : 200;
      const st = cents / 100;
      const targets = box.filter((x) => x.s <= 3 && x.f - st >= Math.max(1, r - 1));
      const lands = box.filter((x) => x.s <= 2);
      for (let k = 0; k < 4; k++) {
        const tg = targets[(k + op) % targets.length];
        const i = box.indexOf(tg);
        const src = { s: tg.s, f: tg.f - st };
        push(0.5, { ...box[Math.max(0, i - 2)], stroke: 'D' });
        push(0.5, { ...box[Math.max(0, i - 1)], stroke: 'U' });
        // Whole step: bend and release; half step: bend and hold (a half-step release can't be told from the bend).
        if (cents === 200) {
          push(1, { ...src, tech: 'bend', bend: cents, finger: 3, pos: posOf(src.f), stroke: 'D' });
          push(1, { ...src, tech: 'release', bend: cents, finger: 3, pos: posOf(src.f) });
        } else push(2, { ...src, tech: 'bend', bend: cents, finger: 3, pos: posOf(src.f), stroke: 'D' });
        push(1, { ...box[Math.max(0, i - 1)], stroke: 'D' });
        push(4, { ...lands[(k * 3 + op) % lands.length], tech: 'vibrato', bend: 40, stroke: 'D' });
      }
      return finish(s, tu, evs, { title: T(`Bends in phrases: ${op === 1 ? 'half-step bend and hold' : 'whole-step bend and release'}, vibrato on the landing`, `כיפופים במשפטים: ${op === 1 ? 'כיפוף חצי טון והחזקה' : 'כיפוף טון ושחרור'}, ויברטו על הנחיתה`, key, true), bpm: 60, evenness: false });
    }
    case 'hybrid-lead': {
      // A generated 4-bar phrase: slides, hammer-ons, pull-offs and bends inside the box; each bar ends on a held vibrato.
      const rnd = rng(guitarItemId(s));
      const byStr = (st: number) => box.filter((x) => x.s === st);
      const strs = [1, 2, 3, 4].filter((st) => byStr(st).length >= 2);
      const targets = box.filter((x) => x.s <= 3 && x.f - 2 >= Math.max(1, r - 1));
      for (let bar = 0; bar < 4; bar++) {
        for (let m = 0; m < 3; m++) {
          const kind = Math.floor(rnd() * 4);
          const st = strs[Math.floor(rnd() * strs.length)];
          const [a, b] = byStr(st);
          if (kind === 0) {
            push(0.5, { ...a, stroke: 'D' });
            push(0.5, { ...b, tech: 'slide' });
          } else if (kind === 1) {
            push(0.5, { ...a, stroke: 'D' });
            push(0.5, { ...b, tech: 'hammer' });
          } else if (kind === 2) {
            push(0.5, { ...b, stroke: 'D' });
            push(0.5, { ...a, tech: 'pull' });
          } else {
            const tg = targets[Math.floor(rnd() * targets.length)];
            push(1, { s: tg.s, f: tg.f - 2, tech: 'bend', bend: 200, finger: 3, pos: posOf(tg.f - 2), stroke: 'D' });
          }
        }
        const land = box.filter((x) => x.s <= 3 && mod(pitchOf(tu, x) - key, 12) === 0);
        push(1, { ...(land[bar % Math.max(1, land.length)] ?? box[box.length - 1]), tech: 'vibrato', bend: 40, stroke: 'D' });
      }
      return finish(s, tu, evs, { title: T(`Hybrid lead phrase ${op + 1}: slides, legato and bends`, `משפט סולו משולב ${op + 1}: החלקות, לגאטו וכיפופים`, key, true), bpm: 70, evenness: false });
    }
    case 'pinch': {
      // Pinch harmonics: the fretted note with the thumb edge — the harmonic sounds an octave (+12), an octave and a
      // 5th (+19) or two octaves (+24) above. Technique 'harmonic' (no pinch value exists); pitches set to the sounding one.
      const add = [12, 19, 24][op % 3];
      // Each harmonic on its own strings (5-4, 4-3, 5-3): the higher harmonics sit where the pinch speaks best.
      const set = [[4, 5], [3, 4], [3, 5]][op % 3];
      const ns = box.filter((x) => set.includes(x.s));
      for (const x of upDown(ns)) push(1, { ...x, tech: 'harmonic', stroke: 'D' });
      const d = finish(s, tu, evs, { title: T(`Pinch harmonics (+${add === 12 ? 'octave' : add === 19 ? 'octave and 5th' : 'two octaves'})`, `הרמוניקים צבוטים (+${add === 12 ? 'אוקטבה' : add === 19 ? 'אוקטבה וקווינטה' : 'שתי אוקטבות'})`, key, true), bpm: 60, evenness: false });
      return { ...d, notes: d.notes.map((n) => ({ ...n, pitch: noteAt(tu, n.string!, n.fret!) + add })) };
    }
    case 'oblique': {
      // Oblique ("steel") bends: hold a note and bend the string below it a whole step, both sounding.
      const hiStr = op === 1 ? 1 : 2;
      const gap = tu.open[hiStr - 1] - tu.open[hiStr];
      const helds = box.filter((x) => x.s === hiStr && x.f + gap - 5 >= 1);
      const round = [...helds, ...helds.slice().reverse()];
      for (const h of [...round, ...round]) {
        const src = { s: hiStr + 1, f: h.f + gap - 5 };
        const pos = Math.max(1, Math.min(h.f, src.f));
        push(2, { ...h, pos, finger: h.f >= src.f ? 2 : 1, stroke: 'D' }, { ...src, pos, finger: src.f > h.f ? 3 : 1, tech: 'bend', bend: 200, stroke: 'D' });
        beat += 1;
      }
      return finish(s, tu, evs, { title: T(`Oblique bends: hold string ${hiStr}, bend string ${hiStr + 1}`, `כיפופים אלכסוניים: להחזיק את מיתר ${hiStr}, לכופף את מיתר ${hiStr + 1}`, key, true), bpm: 60, evenness: false });
    }
  }
  throw new Error(`Unknown lead kind ${s.kind}`);
}

// ───────────────────────────── picking / legato ─────────────────────────────

/** One chord tone per string from the root on string 5, rising, inside a window by the root. */
function sweepShape(tu: Tuning, root: number, ints: number[]): P[] {
  const rf = lowFret1(tu, root, 5);
  const pcs = ints.map((i) => mod(root + i, 12));
  const out: P[] = [{ s: 5, f: rf }];
  let prev = noteAt(tu, 5, rf);
  for (let st = 4; st >= 1; st--) {
    let got: P | null = null;
    for (let f = Math.max(0, rf - 1); f <= rf + 5 && !got; f++) {
      const m = noteAt(tu, st, f);
      if (m > prev && pcs.includes(mod(m, 12))) got = { s: st, f };
    }
    if (!got) break;
    out.push(got);
    prev = pitchOf(tu, got);
  }
  return out;
}

function genPicking2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const gs: GN[] = [];
  switch (s.kind) {
    case 'sweep7': {
      // 5-string sweeps of 7th chords through ii–V–I–vi (op 1: with a tap above the top note and a pull back).
      const prog: [number, number][] = [[2, 2], [7, 1], [0, 0], [9, 2]];
      for (const [d, q] of prog) {
        const root = mod(key + d, 12);
        const sh = sweepShape(tu, root, SEV[q].ints);
        const up = sh.map((x) => ({ ...x, stroke: 'D' as Stroke }));
        const down = sh.slice(0, -1).reverse().map((x) => ({ ...x, stroke: 'U' as Stroke }));
        const top = sh[sh.length - 1];
        const tapF = top.f + 12 <= MAX_FRET ? top.f + 12 : top.f + 5;
        gs.push(...up);
        if (op === 1) gs.push({ s: top.s, f: tapF, tech: 'tap' }, { ...top, tech: 'pull' });
        gs.push(...down);
      }
      return finish(s, tu, seqEv(gs, 1 / 4), { title: T(`Sweep picking 7th chords ii–V–I–vi${op === 1 ? ' with a tap' : ''}`, `סוויפ על ספטאקורדים ii–V–I–vi${op === 1 ? ' עם טאפ' : ''}`, key), bpm: 40, evenness: true });
    }
    case 'fusion-pick': {
      // Wide intervals: the pentatonic box with string skips (6-4-2, 5-3-1), or interleaved skipped pairs (hybrid).
      const r = lowFret1(tu, key, 6);
      const W = windowScale(tu, key, SCALES.pentaMinor, r, r + 3);
      const on = (st: number) => W.filter((x) => x.s === st);
      if (op === 2) {
        for (const [a, b] of [[6, 4], [5, 3], [4, 2], [3, 1]]) {
          const A = on(a);
          const B = on(b);
          gs.push({ ...A[0], stroke: 'D' }, { ...B[0], stroke: 'm' }, { ...A[1], stroke: 'D' }, { ...B[1], stroke: 'm' });
        }
      } else {
        const order = op === 0 ? [6, 4, 2, 5, 3, 1] : [5, 3, 1, 6, 4, 2];
        const up = order.flatMap((st) => on(st));
        gs.push(...upDown(up).map((x, i) => ({ ...x, stroke: (i % 2 === 0 ? 'D' : 'U') as Stroke })));
      }
      const nm = [t('string skips 6-4-2 / 5-3-1', 'דילוגים 6-4-2 / 5-3-1'), t('string skips 5-3-1 / 6-4-2', 'דילוגים 5-3-1 / 6-4-2'), t('skipped pairs, pick + middle finger', 'זוגות בדילוג, מפרט + אצבע אמצעית')][op % 3];
      return finish(s, tu, seqEv(gs, 1 / 4), { title: T(`Fusion picking: wide intervals, ${nm.en}`, `פריטת פיוז׳ן: מרווחים רחבים, ${nm.he}`, key, true), bpm: 60, evenness: true });
    }
  }
  throw new Error(`Unknown picking kind ${s.kind}`);
}

function genLegato2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  switch (s.kind) {
    case 'legato-shift': {
      // 3 notes per string across the neck, legato: pick the first note on each string, hammer up / pull down, slide the shift.
      const up = threeNpsNeck(tu, key, op);
      const tag = (xs: P[], dir: 'up' | 'down'): GN[] =>
        xs.map((x, i) => {
          const prev = xs[i - 1];
          if (!prev || prev.s !== x.s) return { ...x, stroke: 'D' };
          if (Math.abs(prev.f - x.f) >= 3) return { ...x, tech: 'slide' };
          return { ...x, tech: dir === 'up' ? 'hammer' : 'pull' };
        });
      const down = up.slice(0, -1).reverse();
      const gs = [...tag(up, 'up'), ...tag([up[up.length - 1], ...down], 'down').slice(1)];
      const from = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'][op];
      const fromHe = ['היסוד', 'הדרגה 2', 'הדרגה 3', 'הדרגה 4', 'הדרגה 5', 'הדרגה 6', 'הדרגה 7'][op];
      return finish(s, tu, seqEv(gs, 1 / 3), { title: T(`Legato with position shifts (3 per string), from the ${from}`, `לגאטו עם מעברי מצב (3 במיתר), מ${fromHe}`, key), bpm: 60, evenness: true });
    }
    case 'tap8': {
      // Tapped sequences on strings 1 and 2 through four chords: tap, pull to the fretted note, hammer, tap again.
      const progs: [number, boolean][][] = [
        [[0, true], [8, false], [10, false], [0, true]],
        [[0, false], [9, true], [5, false], [7, false]],
      ];
      const gs: GN[] = [];
      for (const [d, minor] of progs[op % 2]) {
        const root = mod(key + d, 12);
        const third = minor ? 3 : 4;
        const r1 = lowFret(tu, root, 1);
        const t1 = r1 + 12 <= MAX_FRET ? r1 + 12 : r1 + 7;
        gs.push({ s: 1, f: r1 + 7, tech: 'tap' }, { s: 1, f: r1, tech: 'pull', finger: 1 }, { s: 1, f: r1 + third, tech: 'hammer', finger: 4 }, { s: 1, f: t1, tech: 'tap' });
        // String 2: the root (or the 5th) near the same position, its octave tapped.
        const r2 = lowFret(tu, root, 2);
        const f5 = lowFret(tu, root + 7, 2);
        const f2 = Math.abs(r2 - r1) <= 4 ? r2 : f5;
        const isRoot = f2 === r2;
        const t2 = f2 + 12 <= MAX_FRET ? f2 + 12 : isRoot ? f2 + 7 : f2 + 5;
        // Hammer to the 3rd above the root, or from the 5th up a whole step (the 6th / 13th colour).
        const h2 = isRoot ? f2 + third : f2 + 2;
        gs.push({ s: 2, f: t2, tech: 'tap' }, { s: 2, f: f2, tech: 'pull', finger: 1 }, { s: 2, f: h2, tech: 'hammer', finger: 3 }, { s: 2, f: t2, tech: 'tap' });
      }
      return finish(s, tu, seqEv(gs, 1 / 4), { title: T(`Tapped sequences on two strings${op === 0 ? ' (i–VI–VII–i)' : ' (I–vi–IV–V)'}`, `רצפי טאפינג על שני מיתרים${op === 0 ? ' (i–VI–VII–i)' : ' (I–vi–IV–V)'}`, key, op === 0), bpm: 60, evenness: true });
    }
  }
  throw new Error(`Unknown legato kind ${s.kind}`);
}

// ───────────────────────────── reading ─────────────────────────────

const PAT_HITS = ['q.q.q.q.', 'q.qH..q.', 'q..H..q.', 'H...q.q.', 'q.q..H..', 'q.q.q..H'];

function genReading2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(guitarItemId(s));
  const evs: Ev[] = [];
  switch (s.kind) {
    case 'chart-hits': {
      // A rhythm chart: slashes (quarter strums) with written hits on the "and" (accented), 4 chords twice.
      const progs: [number, Q][][] = [
        [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']],
        [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']],
        [[9, 'm'], [5, 'M'], [0, 'M'], [7, 'M']],
      ];
      const prog = progs[op % progs.length];
      const chart: string[] = [];
      for (let bar = 0; bar < 8; bar++) {
        const [d, q] = prog[bar % 4];
        const sh = chordShape(key + d, q);
        chart.push(sh.name);
        const pat = bar === 0 ? PAT_HITS[0] : PAT_HITS[1 + Math.floor(rnd() * (PAT_HITS.length - 1))];
        const on = [...pat].map((c, i) => [i, c] as [number, string]).filter(([, c]) => c !== '.');
        on.forEach(([i, c], k) => {
          const nxt = k + 1 < on.length ? on[k + 1][0] : 8;
          evs.push({ beat: bar * 4 + i / 2, dur: (nxt - i) / 2, notes: sh.dots.map((x) => ({ s: x.s, f: x.f, finger: x.finger, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke, acc: c === 'H' })) });
        });
      }
      const d = finish(s, tu, evs, { title: T(`Rhythm chart: play time, catch the hits (${op + 1})`, `קריאת צ׳ארט קצבי: לשמור על הזמן, לתפוס את המכות (${op + 1})`, key), bpm: 70, evenness: false, keySig: SIG[key] });
      return { ...d, chart };
    }
    case 'two-pos': {
      // Reading in two positions: 8 beats in the lower one, a shift, 8 beats in the higher one (ledger lines above).
      const pairs = [[2, 7], [5, 9], [7, 12]];
      const [p1, p2] = pairs[op % pairs.length];
      let beat = 0;
      let prevP = -1;
      for (const [P, from] of [[p1, 0], [p2, 8]] as [number, number][]) {
        const set = windowScale(tu, key, MAJOR, P, P + 3);
        let i = from === 0 ? set.findIndex((x) => mod(pitchOf(tu, x) - key, 12) === 0) : set.findIndex((x) => pitchOf(tu, x) >= prevP);
        if (i < 0) i = from === 0 ? 0 : Math.max(0, set.length - 6);
        if (from > 0) i = Math.max(i, set.length - 8);
        while (beat < from + 8) {
          const x = set[i];
          const dur = Math.min([0.5, 0.5, 1, 1, 2][Math.floor(rnd() * 5)], from + 8 - beat);
          evs.push({ beat, dur, notes: [{ ...x, pos: P, stroke: 'D' }] });
          prevP = pitchOf(tu, x);
          beat += dur;
          i = Math.max(0, Math.min(set.length - 1, i + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)]));
        }
      }
      const rom = (n: number) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n];
      return finish(s, tu, evs, { title: T(`Reading in two positions: ${rom(p1)} → ${rom(p2)}, a shift and ledger lines`, `קריאה בשני מצבים: ${rom(p1)} ← ${rom(p2)}, מעבר וקווי עזר`, key), bpm: 70, evenness: false });
    }
    case 'lead-sheet': {
      // A lead sheet of our own: a 4-bar melody (chord tone on each 1) over chord symbols, then comp the symbols.
      const progs: [number, Q][][] = [
        [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']],
        [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']],
        [[0, 'M'], [5, 'M'], [9, 'm'], [7, 'M']],
      ];
      const prog = progs[op % progs.length];
      const P = 5;
      const set = windowScale(tu, key, MAJOR, P - 1, P + 3);
      const ints = (q: Q): number[] => (q === 'maj7' ? [0, 4, 7, 11] : q === 'm7' ? [0, 3, 7, 10] : q === '7' ? [0, 4, 7, 10] : q === 'm' ? [0, 3, 7] : [0, 4, 7]);
      let i = Math.floor(set.length / 2);
      const chart: string[] = [];
      prog.forEach(([d, q], bar) => {
        const pcs = ints(q).map((x) => mod(key + d + x, 12));
        const cands = set.map((x, k) => [k, pitchOf(tu, x)] as [number, number]).filter(([, m]) => pcs.includes(mod(m, 12)));
        const cur = pitchOf(tu, set[i]);
        i = cands.reduce((a, b) => (Math.abs(b[1] - cur) < Math.abs(a[1] - cur) ? b : a))[0];
        let beat = bar * 4;
        evs.push({ beat, dur: 1, notes: [{ ...set[i], ct: true, stroke: 'D' }] });
        beat += 1;
        while (beat < bar * 4 + 4) {
          const dur = Math.min(rnd() < 0.5 ? 0.5 : 1, bar * 4 + 4 - beat);
          i = Math.max(0, Math.min(set.length - 1, i + (rnd() < 0.5 ? -1 : 1)));
          evs.push({ beat, dur, notes: [{ ...set[i], stroke: 'D' }] });
          beat += dur;
        }
        chart.push(NAMES[mod(key + d, 12)] + (q === 'M' ? '' : q));
      });
      prog.forEach(([d, q], bar) => {
        const sh = chordShape(key + d, q);
        for (const at of [0, 2]) evs.push({ beat: 16 + bar * 4 + at, dur: 2, notes: sh.dots.map((x) => ({ s: x.s, f: x.f, finger: x.finger, tech: 'strum-down' as GuitarTechnique, stroke: 'D' as Stroke })) });
      });
      const d = finish(s, tu, evs, { title: T(`Lead sheet: play the melody, then comp the chords (${op + 1})`, `דף תווים: לנגן את המנגינה, ואז ללוות באקורדים (${op + 1})`, key), bpm: 70, evenness: false, goal: { chordTonesOnBeats: true } });
      return { ...d, chart: [...chart, ...chart] };
    }
  }
  throw new Error(`Unknown reading kind ${s.kind}`);
}

// ───────────────────────────── arpeggios ─────────────────────────────

/** Place a line of pitches near a centre fret, never leaving the window around it when there is a choice. */
function placeLine(tu: Tuning, ms: number[], center: number, strings?: number[]): P[] {
  return ms.map((m) => near(tu, m, center, strings) ?? near(tu, m, center)!);
}

function genArps2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  switch (s.kind) {
    case 'caged7': {
      const k = SEV[op % 4];
      const [lo, hi] = cagedWindow(tu, key, s.position ?? 0);
      const notes = windowScale(tu, key, k.ints, Math.max(0, lo - 1), hi);
      const gs = upDown(notes).map((x, i) => ({ ...x, stroke: (i % 2 === 0 ? 'D' : 'U') as Stroke }));
      const shape = ['E', 'D', 'C', 'A', 'G'][(s.position ?? 0) % 5];
      return finish(s, tu, seqEv(gs, 0.5), { title: t(`${NAMES[key]}${k.name} arpeggio in the ${shape} shape`, `ארפג׳יו ${NAMES[key]}${k.name} בצורת ${shape}`), bpm: 70, evenness: true });
    }
    case 'ext-arp': {
      const KINDS = [
        { ints: [0, 4, 7, 10, 14], name: '9' },
        { ints: [0, 4, 7, 11, 14], name: 'maj9' },
        { ints: [0, 3, 7, 10, 14], name: 'm9' },
        { ints: [0, 4, 10, 14, 21], name: '13' },
      ];
      const k = KINDS[op % 4];
      const rs = s.position === 5 ? 5 : 6;
      const rf = lowFret1(tu, key, rs);
      const R = noteAt(tu, rs, rf);
      const ms = [...k.ints.map((i) => R + i), R + 12 + k.ints[1] + (k.name === '13' ? 12 : 0)].filter((m, i, a) => i === 0 || m > a[i - 1]);
      const ps = placeLine(tu, ms, rf + 1, [rs, rs - 1, rs - 2, rs - 3, rs - 4, rs - 5].filter((x) => x >= 1));
      const gs = upDown(ps).map((x, i) => ({ ...x, stroke: (i % 2 === 0 ? 'D' : 'U') as Stroke }));
      return finish(s, tu, seqEv(gs, 0.5), { title: t(`${NAMES[key]}${k.name} arpeggio, root on ${rs}`, `ארפג׳יו ${NAMES[key]}${k.name}, יסוד על ${rs}`), bpm: 70, evenness: true });
    }
    case 'ust': {
      // Upper-structure triads over a dominant: the root, then the triad of II (9-♯11-13), ♭VI (♭13-R-♯9) or VI (13-♭9-3).
      const UST = [
        { d: 2, en: 'II (9, ♯11, 13)', he: 'II (9, ♯11, 13)' },
        { d: 8, en: '♭VI (♭13, R, ♯9)', he: '♭VI (♭13, יסוד, ♯9)' },
        { d: 9, en: 'VI (13, ♭9, 3)', he: 'VI (13, ♭9, 3)' },
      ];
      const u = UST[op % 3];
      const rf = lowFret1(tu, key, 6);
      const R = noteAt(tu, 6, rf);
      const tr = [0, 4, 7].map((i) => mod(key + u.d + i, 12));
      const ms: number[] = [];
      for (let m = R + 12; ms.length < 6; m++) if (tr.includes(mod(m, 12))) ms.push(m);
      const ps = placeLine(tu, ms, rf + 1, [4, 3, 2, 1]);
      const gs: GN[] = [{ s: 6, f: rf, stroke: 'D' }, ...upDown(ps).map((x, i) => ({ ...x, stroke: (i % 2 === 0 ? 'D' : 'U') as Stroke }))];
      return finish(s, tu, seqEv(gs, 0.5), { title: t(`Upper structure ${u.en} over ${NAMES[key]}7`, `מבנה עליון ${u.he} מעל ${NAMES[key]}7`), bpm: 70, evenness: true });
    }
  }
  throw new Error(`Unknown arps kind ${s.kind}`);
}

// ───────────────────────────── improvising ─────────────────────────────

/** Standards for chord-scale lines (chords only): ids in standards.ts. */
export const CORE2_STANDARDS = ['autumn', 'fly', 'tune-up', 'blue-bossa', 'satin', 'stella'];

/** The chord scale of a chord (intervals from its root), from its intervals. */
function chordScale(iv: number[]): number[] {
  const has = (x: number) => iv.some((i) => mod(i, 12) === x);
  if (has(3) && has(6) && has(9) && !has(10)) return [0, 2, 3, 5, 6, 8, 9, 11];
  if (has(3) && has(6)) return [0, 1, 3, 5, 6, 8, 10];
  if (has(3) && has(11)) return [0, 2, 3, 5, 7, 9, 11];
  if (has(3)) return [0, 2, 3, 5, 7, 9, 10];
  if (has(4) && has(1)) return [0, 1, 3, 4, 6, 7, 9, 10];
  if (has(4) && has(10)) return [0, 2, 4, 5, 7, 9, 10];
  return [0, 2, 4, 5, 7, 9, 11];
}

function genImpro2(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const evs: Ev[] = [];
  const LO = 52;
  const HI = 76;
  const C = 7;
  switch (s.kind) {
    case 'chord-scale': {
      // Over the first 8 bars of a standard's changes (moved by `key`): every chord starts on its nearest chord tone, then
      // walks its chord scale in 8ths, turning at the range edges.
      const std = STANDARD_CHANGES.find((x) => x.id === CORE2_STANDARDS[op % CORE2_STANDARDS.length]) ?? STANDARD_CHANGES[0];
      const ch = parseChart(std.text).chords.filter((c) => c.bar < 8);
      let prev = 64;
      let dir = 1;
      for (const c of ch) {
        const root = mod(c.root + key, 12);
        const tones = [0, ...c.iv].map((i) => mod(root + i, 12));
        const sc = chordScale(c.iv).map((i) => mod(root + i, 12));
        // Nearest chord tone in range.
        let best = -1;
        for (let m = LO; m <= HI; m++) if (tones.slice(0, 4).includes(mod(m, 12)) && (best < 0 || Math.abs(m - prev) < Math.abs(best - prev))) best = m;
        let m = best;
        const beat0 = c.bar * 4 + c.at;
        const n = Math.round(c.beats * 2);
        for (let k = 0; k < n; k++) {
          if (k > 0) {
            let x = m + dir;
            while (!sc.includes(mod(x, 12))) x += dir;
            if (x > HI || x < LO) {
              dir = -dir;
              x = m + dir;
              while (!sc.includes(mod(x, 12))) x += dir;
            }
            m = x;
          }
          evs.push({ beat: beat0 + k * 0.5, dur: 0.5, notes: [{ ...near(tu, m, C)!, ...(k === 0 ? { ct: true } : {}), stroke: k % 2 === 0 ? 'D' : 'U' }] });
        }
        prev = m;
      }
      return finish(s, tu, evs, { title: t(`Chord-scale lines over ${std.name} (first 8 bars), a chord tone on every change${key ? ` · +${key}` : ''}`, `קווי סולם-אקורד על ${std.name} (8 התיבות הראשונות), צליל אקורד בכל החלפה${key ? ` · +${key}` : ''}`), bpm: 80, evenness: false, goal: { chordTonesOnBeats: true }, keySig: 'C' });
    }
    case 'motif': {
      // A 2-beat motif (3rd – 4th – 5th – 3rd of each chord) moved through the form, displaced by a beat (op odd: an 8th) each bar.
      const forms = [0, 2, 3];
      const form = IMPRO_FORMS[forms[Math.floor(op / 2) % forms.length]];
      const step = op % 2 === 0 ? 1 : 0.5;
      const offs = step === 1 ? [0, 1, 2] : [0, 0.5, 1, 1.5, 2];
      let prev = 64;
      form.bars.forEach(([d, ints], bar) => {
        const root = mod(key + d, 12);
        const third = ints[1];
        const shape = [third, ints[2] - 2, ints[2], third];
        const base = inRange(root + third, Math.max(LO, prev - 6), Math.max(LO, prev - 6) + 11) - third;
        const at = bar * 4 + offs[bar % offs.length];
        shape.forEach((iv, k) => {
          const m = inRange(base + iv, LO, HI);
          evs.push({ beat: at + k * 0.5, dur: 0.5, notes: [{ ...near(tu, m, C)!, ...(k !== 1 ? { ct: true } : {}), stroke: k % 2 === 0 ? 'D' : 'U' }] });
        });
        prev = base + third;
      });
      return finish(s, tu, evs, { title: t(`Motif and displacement (${step === 1 ? 'a beat' : 'an 8th'} each bar): ${form.en} · ${NAMES[key]}`, `מוטיב והזזה (${step === 1 ? 'פעמה' : 'שמינית'} בכל תיבה): ${form.he} · ${NAMES[key]}`), bpm: 80, evenness: false, goal: { chordTonesOnBeats: true } });
    }
  }
  throw new Error(`Unknown impro kind ${s.kind}`);
}

// ───────────────────────────── dispatch + catalogue ─────────────────────────────

/** Build a drill of a Batch C kind; null for kinds this file doesn't own. */
export function generateCore2(s: DrillSpec, tu: Tuning): Drill | null {
  if (!OWN.has(`${s.family}:${s.kind}`)) return null;
  switch (s.family) {
    case 'g-scales':
      return genScales2(s, tu);
    case 'g-rhythm':
      return genRhythm2(s, tu);
    case 'g-lead':
      return genLead2(s, tu);
    case 'g-picking':
      return genPicking2(s, tu);
    case 'g-legato':
      return genLegato2(s, tu);
    case 'g-reading':
      return genReading2(s, tu);
    case 'g-arps':
      return genArps2(s, tu);
    case 'g-impro':
      return genImpro2(s, tu);
  }
  return null;
}

const GKEYS_MAJOR = [7, 2, 9, 4, 0, 5, 10, 3, 11, 8, 1, 6];
const GKEYS_MINOR = [9, 4, 2, 7, 11, 0, 5, 6, 1, 8, 10, 3];
const BLUES_KEYS = [9, 4, 7, 2, 0, 5, 10];
const CYC6 = [0, 5, 10, 3, 8, 1];

/** The Batch C levels per family (numbered after the existing levels). */
export function core2Levels(): Partial<Record<FamilyId, GuitarLevelDef[]>> {
  const exam = (g: number): LevelExamTag[] | undefined => (g <= 8 ? [{ board: 'RSL', grade: String(g) }] : undefined);
  const L = (fam: FamilyId, level: number, en: string, he: string, specs: SpecTemplate[], keys: GuitarLevelDef['keys'], tempo: [number, number], sub: string, grade: number, extra: Partial<GuitarLevelDef> = {}): GuitarLevelDef => {
    const ex = exam(grade);
    return {
      id: `${fam}-${level}`,
      level,
      title: t(en, he),
      specs: specs.map((x) => ({ ...x, tempo: x.tempo ?? tempo[0] })),
      keys,
      tempo,
      sub,
      grade,
      ...(ex ? { exam: ex } : {}),
      ...extra,
    };
  };
  const sp =
    (family: FamilyId) =>
    (kind: string, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family, kind, hands: 'R', instrument: 'guitar', ...o });
  const S = sp('g-scales');
  const R = sp('g-rhythm');
  const E = sp('g-lead');
  const P = sp('g-picking');
  const LG = sp('g-legato');
  const RD = sp('g-reading');
  const A = sp('g-arps');
  const I = sp('g-impro');
  return {
    'g-scales': [
      L('g-scales', 8, 'Connecting CAGED positions: one scale across three shapes', 'חיבור מצבי CAGED: סולם אחד דרך שלוש צורות', [0, 1, 2].map((o) => S('caged-connect', { option: o })), 'major', [70, 100], '8ths', 5),
      L('g-scales', 9, '3 notes per string across the whole neck, with a slide shift', '3 צלילים במיתר לאורך כל הצוואר, עם מעבר בהחלקה', [0, 4, 5].map((o) => S('3nps-neck', { option: o, perBeat: 3, stretch: true })), 'major', [60, 100], 'triplets', 7),
      L('g-scales', 10, 'Interval sequences in position: 3rds, 4ths, 6ths, 1-3-2-4 groups', 'רצפי מרווחים במצב: טרצות, קוורטות, סקסטות, קבוצות 1-3-2-4', [0, 3].flatMap((p) => [0, 1, 2, 3].map((o) => S('interval-seq', { option: o, position: p }))), 'major', [80, 120], '8ths', 8),
    ],
    'g-rhythm': [
      L('g-rhythm', 8, 'Rock riffs: power chords and single notes, muting between hits', 'ריפים של רוק: אקורדי פאוור וצלילים בודדים, השתקה בין המכות', [0, 1, 2].map((o) => R('rock-riff', { option: o })), [4, 9, 7, 2, 0, 5], [80, 110], '16ths', 4, { genres: ['rock', 'metal', 'blues', 'pop'] }),
      L('g-rhythm', 9, 'Neo-soul: upper triads, double stops and grace notes', 'ניאו-סול: משולשים עליונים, צלילים כפולים וקישוטים', [0, 1].map((o) => R('neo-soul', { option: o })), [7, 0, 2, 9, 4, 5], [70, 95], '16ths', 6, { genres: ['funk', 'pop'] }),
      L('g-rhythm', 10, 'Mizrahi: maqsum strum and Hijaz fills', 'מזרחית: פריטת מקסום ומילויי חיג׳אז', [0, 1].map((o) => R('mizrahi', { option: o })), [4, 9, 2, 7], [80, 110], '8ths / 16ths', 5, { genres: ['pop', 'latin'] }),
    ],
    'g-lead': [
      L('g-lead', 8, 'Bends in phrases: bend, release, vibrato on the target', 'כיפופים במשפטים: כיפוף, שחרור, ויברטו על המטרה', [0, 1].map((o) => E('bend-phrase', { option: o })), GKEYS_MINOR.slice(0, 6), [60, 90], '8ths', 6),
      L('g-lead', 9, 'Hybrid lead: slides, legato and bends in a 4-bar phrase', 'סולו משולב: החלקות, לגאטו וכיפופים במשפט של 4 תיבות', [0, 1, 2].map((o) => E('hybrid-lead', { option: o })), GKEYS_MINOR.slice(0, 6), [70, 100], '8ths', 7),
      L('g-lead', 10, 'Pinch harmonics and oblique bends', 'הרמוניקים צבוטים וכיפופים אלכסוניים', [...[0, 1, 2].map((o) => E('pinch', { option: o, tempo: 60, target: 60 })), E('oblique', { option: 0 }), E('oblique', { option: 1 })], GKEYS_MINOR.slice(0, 6), [60, 80], 'quarters', 8),
    ],
    'g-picking': [
      L('g-picking', 8, 'Sweep picking 7th chords, with a tap', 'סוויפ על ספטאקורדים, עם טאפ', [0, 1].map((o) => P('sweep7', { option: o, perBeat: 4 })), GKEYS_MAJOR, [40, 80], '16ths', 9, { addOn: 'prog' }),
      L('g-picking', 9, 'Fusion picking: wide intervals and string skips', 'פריטת פיוז׳ן: מרווחים רחבים ודילוגי מיתרים', [0, 1, 2].map((o) => P('fusion-pick', { option: o, perBeat: 4 })), GKEYS_MINOR, [60, 100], '16ths', 9, { addOn: 'prog' }),
    ],
    'g-legato': [
      L('g-legato', 7, 'Legato with position shifts', 'לגאטו עם מעברי מצב', [0, 4].map((o) => LG('legato-shift', { option: o, perBeat: 3, stretch: true })), GKEYS_MAJOR, [60, 100], 'triplets', 8),
      L('g-legato', 8, 'Tapped sequences on two strings', 'רצפי טאפינג על שני מיתרים', [0, 1].map((o) => LG('tap8', { option: o, perBeat: 4 })), [9, 4, 2, 7], [60, 100], '16ths', 9, { addOn: 'prog' }),
    ],
    'g-reading': [
      L('g-reading', 6, 'Rhythm charts: play time, catch the hits', 'צ׳ארטים קצביים: לשמור על הזמן, לתפוס את המכות', [0, 1, 2].map((o) => RD('chart-hits', { option: o })), [7, 0, 2, 9, 4], [70, 100], 'quarters / 8ths', 5),
      L('g-reading', 7, 'Reading in two positions, ledger lines above the staff', 'קריאה בשני מצבים, קווי עזר מעל החמשה', [0, 1, 2].map((o) => RD('two-pos', { option: o, perBeat: 2 })), [0, 7, 2, 5, 9, 10], [70, 90], '8ths', 6),
      L('g-reading', 8, 'Lead sheets: the melody, then comp the chords', 'דפי תווים: המנגינה, ואז ליווי באקורדים', [0, 1, 2].map((o) => RD('lead-sheet', { option: o })), [0, 7, 5, 2], [70, 90], 'quarters / 8ths', 7),
    ],
    'g-arps': [
      L('g-arps', 6, '7th arpeggios in all five CAGED shapes', 'ארפג׳יו ספטאקורד בכל חמש צורות CAGED', [0, 1, 2, 3, 4].flatMap((p) => [0, 1, 2, 3].map((o) => A('caged7', { option: o, position: p }))), [0, 5, 7, 2, 9, 4], [70, 100], '8ths', 6),
      L('g-arps', 7, '9th and 13th arpeggios; upper-structure triads', 'ארפג׳יו נונה ו-13; משולשי מבנה עליון', [...[0, 1, 2, 3].flatMap((o) => [A('ext-arp', { option: o, position: 6 }), A('ext-arp', { option: o, position: 5 })]), ...[0, 1, 2].map((o) => A('ust', { option: o }))], CYC6, [70, 110], '8ths', 8),
    ],
    'g-impro': [
      L('g-impro', 5, "Chord-scale lines through a standard's changes", 'קווי סולם-אקורד על ההרמוניה של סטנדרט', CORE2_STANDARDS.map((_, o) => I('chord-scale', { option: o, swing: true })), [0, 5, 7], [80, 110], 'swing 8ths', 7, { addOn: 'jazz' }),
      L('g-impro', 6, 'Motif and rhythmic displacement through the form', 'מוטיב והזזה קצבית לאורך הצורה', [0, 1, 2, 3, 4, 5].map((o) => I('motif', { option: o, swing: true })), BLUES_KEYS, [80, 110], 'swing 8ths', 8, { addOn: 'jazz' }),
    ],
  };
}
