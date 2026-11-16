// AUDIT-7 #4 (docs/research/AUDIT-7-GAPS.md §1): the keys' sight-reading stopped at 1400 (k-read 10, the G7–G8 quick
// study). k-read 11–15 carry it through ABRSM grades 7–8 and the RSL quick study (1450–1800), with the same generator
// rule as k-read 1–10 — every item new from its seed (family, kind, key, hands, variant), nothing to learn by heart:
//
//   11 four voices: a chorale texture, soprano and alto in the right hand, tenor and bass in the left
//   12 written-out ornaments in a Baroque-style line: mordents, turns, a cadential trill — over a walking bass
//   13 changing metres: 4/4, 3/4 and 2/4 bars mixed (the bar plan of timeline.ts)
//   14 a lead sheet with band hits: the tune in the right hand, the left hand's shells on the written hits
//   15 a quick study: eight bars in any key, accidentals, a moving bass, double notes, with the 30-second look
//
// All 12 keys (the first three listed), rubato first, then the tempo ladder (rubato.ts), as every piano item. Pure.

import type { Drill, DrillGoal, DrillSpec, ExpNote } from './types';
import { itemIdOf } from './generate';
import { readMelody, seeded, type ReadRecipe } from './keysFirst';
import { withBarPlan } from './timeline';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const NAMES_MIN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const HARM = [0, 2, 3, 5, 7, 8, 11];
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
/** Right-hand tonic around middle C (C4–F♯4, else G3–B3), as k-read 1–10. */
const rhTonic = (key: number): number => (mod(key, 12) <= 6 ? 60 + mod(key, 12) : 48 + mod(key, 12));
const deg = (tonic: number, k: number, ints = MAJ): number => tonic + 12 * Math.floor(k / 7) + ints[mod(k, 7)];

/** k-read kinds made here (levels 11–15). */
export const READ2_KINDS = new Set(['kr-four', 'kr-orn', 'kr-meter', 'kr-lead', 'kr-quick2']);

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, ns: { p: number; hand: 'R' | 'L' }[]): void {
    const id = ns.length > 1 ? ++this.cid : undefined;
    for (const n of ns) this.list.push({ pitch: n.p, beat: r6(beat), dur: r6(dur), hand: n.hand, ...(id !== undefined ? { chordId: id } : {}) });
  }
}
function done(s: DrillSpec, n: Notes, title: T2, goal: Partial<DrillGoal>, extra: Partial<Drill> = {}): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return {
    spec: { ...s, hands: 'RL' },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter: 4,
    keySig: SIG[mod(s.key + (s.minor ? 3 : 0), 12)],
    goal: { evenness: false, hands: true, ...goal },
    startBpm: s.tempo ?? 60,
    ...extra,
  };
}
const keyName = (s: DrillSpec) => (s.minor ? `${NAMES_MIN[mod(s.key, 12)]}m` : NAMES[mod(s.key, 12)]);
const title = (en: string, he: string, s: DrillSpec): T2 => t(`Sight-reading: ${en} · ${keyName(s)} · ${(s.option ?? 0) + 1}`, `קריאה מהדף: ${he} · ${keyName(s)} · ${(s.option ?? 0) + 1}`);
/** The bar's harmony from its melody degrees: I, IV or V, whichever holds the most melody notes. */
const harmonyOf = (ds: number[]): number => {
  const score = (root: number) => ds.filter((d) => [0, 2, 4].map((x) => mod(root + x, 7)).includes(mod(d, 7))).length;
  return [0, 4, 3].reduce((best, c) => (score(c) > score(best) ? c : best), 0);
};
/** The highest pitch of a pitch-class set strictly below `below` (and not below `floor`). */
const below = (pcs: number[], under: number, floor: number): number => {
  for (let p = under - 1; p >= floor; p--) if (pcs.includes(mod(p, 12))) return p;
  return floor;
};

// ───────────────────────────── 11: four voices ─────────────────────────────

/** Chorale progressions (degrees, two a bar; the last two the cadence V–I). */
const CHORALE: number[][] = [
  [0, 3, 4, 0, 5, 1, 4, 0],
  [0, 5, 3, 4, 0, 3, 4, 0],
  [0, 4, 5, 2, 3, 0, 4, 0],
  [0, 1, 4, 5, 3, 1, 4, 0],
];

function genFour(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const r = seeded(itemIdOf(s));
  const ints = s.minor ? HARM : MAJ;
  const prog = CHORALE[(s.option ?? 0) % CHORALE.length];
  const n = new Notes();
  const T = rhTonic(key);
  let sop = deg(T, pick(r, [2, 4, 7]), ints);
  if (sop < 64) sop += 12;
  let bass = 0;
  prog.forEach((d, i) => {
    const pcs = [0, 2, 4].map((x) => mod(key + ints[mod(d + x, 7)], 12));
    // soprano: the chord tone nearest the last one (a step or a 3rd), inside E4–G5
    let best = -1;
    for (let p = 64; p <= 79; p++) if (pcs.includes(mod(p, 12)) && p !== sop && (best < 0 || Math.abs(p - sop) < Math.abs(best - sop))) best = p;
    // the close: the tonic on top, nearest the last soprano
    if (i === prog.length - 1) {
      best = -1;
      for (let p = 64; p <= 79; p++) if (mod(p, 12) === key && (best < 0 || Math.abs(p - sop) < Math.abs(best - sop))) best = p;
    }
    sop = best;
    // bass: the root (now and then the 3rd: a first inversion, never at the cadence), nearest the last bass in E2–A3
    const inv1 = i > 0 && i < prog.length - 2 && r() < 0.3;
    const root = inv1 ? pcs[1] : pcs[0];
    let b = -1;
    for (let p = 40; p <= 57; p++) if (mod(p, 12) === root && (b < 0 || Math.abs(p - (bass || 48)) < Math.abs(b - (bass || 48)))) b = p;
    bass = b;
    const alto = below(pcs, sop, 55);
    // tenor: the chord tone the upper voices lack (else the next one down), above the bass
    const missing = pcs.find((pc) => pc !== mod(sop, 12) && pc !== mod(alto, 12));
    let tenor = missing !== undefined ? below([missing], alto, bass + 3) : below(pcs, alto, bass + 3);
    if (tenor <= bass) tenor = below(pcs, alto, bass + 1);
    const at = i * 2;
    const last = i === prog.length - 1;
    // some halves split: the soprano moves to a passing note on beat 2 of the half (quarters)
    const split = !last && r() < 0.4;
    if (split) {
      // a passing note: the scale step below the soprano (above it when that would meet the alto)
      const scale = ints.map((x) => mod(key + x, 12));
      const step = (dir: number) => {
        let q = sop + dir;
        while (!scale.includes(mod(q, 12))) q += dir;
        return q;
      };
      const pass = step(-1) > alto ? step(-1) : step(1);
      n.add(at, 1, [{ p: sop, hand: 'R' }, { p: alto, hand: 'R' }]);
      n.add(at + 1, 1, [{ p: pass, hand: 'R' }, { p: alto, hand: 'R' }]);
    } else n.add(at, 2, [{ p: sop, hand: 'R' }, { p: alto, hand: 'R' }]);
    n.add(at, 2, [{ p: tenor, hand: 'L' }, { p: bass, hand: 'L' }]);
  });
  return done(s, n, title('four voices', 'ארבעה קולות', s), {});
}

// ───────────────────────────── 12: ornaments ─────────────────────────────

const ORN_RC: ReadRecipe = { range: [0, 9], moves: [-2, -1, -1, 1, 1, 2], durs: [0.5, 1, 1, 1, 2], bars: 4 };

function genOrn(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const r = seeded(itemIdOf(s));
  const ints = s.minor ? HARM : MAJ;
  const meter = (s.option ?? 0) % 2 ? 3 : 4;
  const T = rhTonic(key);
  const mel = readMelody(r, ORN_RC, meter);
  const n = new Notes();
  const used: string[] = [];
  // the last note of a beat or longer before the close takes a cadential trill (upper note first, a turn into the
  // tonic); with none, the first such note takes a mordent, so every item has its ornament
  let pen = -1;
  for (let i = mel.length - 2; i > 0 && pen < 0; i--) if (mel[i].dur >= 1 && Number.isInteger(mel[i].beat)) pen = i;
  const forced = pen < 0 ? mel.findIndex((x, i) => i < mel.length - 1 && x.dur >= 1 && Number.isInteger(x.beat)) : -1;
  mel.forEach((x, i) => {
    const p = deg(T, x.d, ints);
    const up = deg(T, x.d + 1, ints);
    const lo = deg(T, x.d - 1, ints);
    if (i === pen) {
      const k = Math.round(x.dur / 0.25);
      for (let j = 0; j < k - 2; j++) n.add(x.beat + j * 0.25, 0.25, [{ p: j % 2 ? p : up, hand: 'R' }]);
      n.add(x.beat + (k - 2) * 0.25, 0.25, [{ p: lo, hand: 'R' }]);
      n.add(x.beat + (k - 1) * 0.25, 0.25, [{ p, hand: 'R' }]);
      used.push('trill');
    } else if (i === forced || (i > 0 && i < pen && x.dur >= 1 && Number.isInteger(x.beat) && r() < 0.45)) {
      if (i === forced || r() < 0.5) {
        // a mordent: main – upper – main (written in 16ths)
        n.add(x.beat, 0.25, [{ p, hand: 'R' }]);
        n.add(x.beat + 0.25, 0.25, [{ p: up, hand: 'R' }]);
        n.add(x.beat + 0.5, x.dur - 0.5, [{ p, hand: 'R' }]);
        used.push('mordent');
      } else {
        // a turn: upper – main – lower – main
        n.add(x.beat, 0.25, [{ p: up, hand: 'R' }]);
        n.add(x.beat + 0.25, 0.25, [{ p, hand: 'R' }]);
        n.add(x.beat + 0.5, 0.25, [{ p: lo, hand: 'R' }]);
        n.add(x.beat + 0.75, x.dur - 0.75, [{ p, hand: 'R' }]);
        used.push('turn');
      }
    } else n.add(x.beat, x.dur, [{ p, hand: 'R' }]);
  });
  // a walking bass in quarters: root, 3rd, 5th of the bar's harmony, the tonic at the end
  const L = T - 12;
  for (let bar = 0; bar < ORN_RC.bars; bar++) {
    const ds = mel.filter((x) => x.beat >= bar * meter && x.beat < (bar + 1) * meter).map((x) => x.d);
    const last = bar === ORN_RC.bars - 1;
    const c = last ? 0 : harmonyOf(ds);
    const root = c === 3 ? -4 : c === 4 ? -3 : 0;
    const fig = last ? [0] : meter === 3 ? [root, root + 2, root + 4] : [root, root + 2, root + 4, root + 2];
    fig.forEach((x, q) => n.add(bar * meter + q, last ? meter : 1, [{ p: deg(L, x, ints), hand: 'L' }]));
  }
  const kinds = [...new Set(used)];
  const en = `written-out ornaments (${kinds.join(', ')})${meter === 3 ? ' in 3/4' : ''}`;
  const HE: Record<string, string> = { trill: 'טריל', mordent: 'מורדנט', turn: 'גרופטו' };
  const he = `קישוטים כתובים (${kinds.map((k) => HE[k]).join(', ')})${meter === 3 ? ' ב־3/4' : ''}`;
  return done(s, n, title(en, he, s), {}, meter === 3 ? { meter: 3 } : {});
}

// ───────────────────────────── 13: changing metres ─────────────────────────────

/** Bar plans (each ends in 4/4 so the close has room). */
const METER_PLANS: string[][] = [
  ['4/4', '3/4', '4/4', '2/4', '3/4', '4/4'],
  ['3/4', '3/4', '2/4', '4/4', '3/4', '4/4'],
  ['4/4', '2/4', '3/4', '3/4', '2/4', '4/4'],
  ['2/4', '3/4', '4/4', '3/4', '2/4', '4/4'],
];

function genMeter(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const r = seeded(itemIdOf(s));
  const ints = s.minor ? HARM : MAJ;
  const plan = METER_PLANS[(s.option ?? 0) % METER_PLANS.length];
  const lens = plan.map((m) => Number(m.split('/')[0]));
  const T = rhTonic(key);
  const n = new Notes();
  let d = pick(r, [0, 2, 4]);
  let at = 0;
  lens.forEach((len, bi) => {
    const last = bi === lens.length - 1;
    const b0 = at;
    const ds: number[] = [];
    let b = 0;
    while (b < len - 1e-9) {
      if (last && b >= len - 2) {
        n.add(b0 + b, len - b, [{ p: deg(T, 0, ints), hand: 'R' }]);
        ds.push(0);
        break;
      }
      const room = len - b;
      const opts = [0.5, 1, 1, 1.5, 2].filter((x) => x <= room + 1e-9 && (Number.isInteger(b) || x === 0.5));
      const dur = pick(r, opts.length ? opts : [room]);
      n.add(b0 + b, dur, [{ p: deg(T, d, ints), hand: 'R' }]);
      ds.push(d);
      b += dur;
      let nd = d + pick(r, [-2, -1, -1, 1, 1, 2]);
      if (nd < -1 || nd > 8) nd = d + (nd < -1 ? 1 : -1);
      d = nd;
    }
    // the left hand: the bar's harmony root held through the bar (the bar's length shows the metre)
    const c = last ? 0 : harmonyOf(ds);
    n.add(b0, len, [{ p: deg(T - 12, c === 3 ? -4 : c === 4 ? -3 : 0, ints), hand: 'L' }]);
    at += len;
  });
  const drill = done(s, n, title(`changing metres (${plan.join(' · ')})`, `משקלים מתחלפים (⁦${plan.join(' · ')}⁩)`, s), {});
  return withBarPlan({ ...drill, meter: lens[0] }, plan);
}

// ───────────────────────────── 14: a lead sheet with hits ─────────────────────────────

/** Lead-sheet progressions with 7ths: [degree, quality] per bar. */
const LEAD_PROGS: [number, 'maj7' | 'm7' | '7'][][] = [
  [[0, 'maj7'], [5, 'm7'], [1, 'm7'], [4, '7'], [2, 'm7'], [5, '7'], [1, 'm7'], [4, '7']],
  [[1, 'm7'], [4, '7'], [0, 'maj7'], [3, 'maj7'], [1, 'm7'], [4, '7'], [0, 'maj7'], [0, 'maj7']],
  [[0, 'maj7'], [3, 'maj7'], [2, 'm7'], [5, '7'], [1, 'm7'], [4, '7'], [0, 'maj7'], [4, '7']],
];
const QI = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10] } as const;
const QN = { maj7: 'maj7', m7: 'm7', '7': '7' } as const;
/** Hit rhythms of the band (beats inside the bar), our own figures. */
const HITS: number[][] = [[0], [0, 2.5], [1.5], [0, 3.5], [2], [0, 1.5]];

function genLead(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const r = seeded(itemIdOf(s));
  const prog = LEAD_PROGS[(s.option ?? 0) % LEAD_PROGS.length];
  const n = new Notes();
  let prev = 72;
  const chart: string[] = [];
  prog.forEach(([d, q], bar) => {
    const b0 = bar * 4;
    const root = mod(key + MAJ[d], 12);
    chart.push(`${NAMES[root]}${QN[q]}`);
    const pcs = QI[q].map((x) => mod(root + x, 12));
    // LH shells: root + 7th (or root + 3rd), in the hits' rhythm
    const lo = 38 + mod(root - 38, 12); // D2–C♯3: the shell's top (≤ B3) stays under the tune (D4 up)
    const shell = [lo, lo + (bar % 2 ? QI[q][1] : QI[q][3])];
    const hits = bar === prog.length - 1 ? [0] : pick(r, HITS);
    hits.forEach((h, k) => n.add(b0 + h, Math.min((hits[k + 1] ?? 4) - h, 2), shell.map((p) => ({ p, hand: 'L' as const }))));
    // RH tune: a chord tone on 1 near the last note, then steps / chord tones, inside D4–G5
    const scale = MAJ.map((x) => mod(key + x, 12));
    // the chord tone nearest the target that is not the note just played (the tune moves)
    const nearTone = (target: number, avoid = -1) => {
      let best = -1;
      for (let p = 62; p <= 79; p++) if (p !== avoid && pcs.includes(mod(p, 12)) && (best < 0 || Math.abs(p - target) < Math.abs(best - target))) best = p;
      return best;
    };
    const cells = bar === prog.length - 1 ? [[4]] : [[1, 1, 1, 1], [1.5, 0.5, 2], [0.5, 0.5, 1, 2], [2, 1, 1], [1, 0.5, 0.5, 1, 1]];
    const cell = pick(r, cells);
    let b = 0;
    let p = nearTone(prev + pick(r, [-3, -1, 1, 3]), prev);
    cell.forEach((len, i) => {
      if (i > 0) {
        if (Number.isInteger(b)) p = nearTone(p + pick(r, [-4, -2, 2, 4]), p);
        else {
          let qn = p + pick(r, [-1, 1]);
          while (!scale.includes(mod(qn, 12))) qn += qn > p ? 1 : -1;
          p = Math.max(62, Math.min(79, qn));
        }
      }
      n.add(b0 + b, len, [{ p, hand: 'R' }]);
      b += len;
    });
    prev = p;
  });
  return done(s, n, title('a lead sheet with band hits', 'דף אקורדים עם מכות להקה', s), {}, { chart });
}

// ───────────────────────────── 15: the quick study ─────────────────────────────

const QUICK2: ReadRecipe = { range: [0, 11], moves: [-3, -2, -1, -1, 1, 1, 2, 3, 4], durs: [0.5, 0.5, 1, 1, 1.5, 2], acc: true, rests: true, lh: 'bass', rhThirds: true, bars: 8, prep: 30 };

function genQuick2(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const r = seeded(itemIdOf(s));
  const ints = s.minor ? HARM : MAJ;
  const T = rhTonic(key);
  const mel = readMelody(r, QUICK2, 4);
  const n = new Notes();
  for (const x of mel) {
    const ns: { p: number; hand: 'R' | 'L' }[] = [{ p: deg(T, x.d, ints) + (x.acc ?? 0), hand: 'R' }];
    // double notes on the strong beats of the second half
    // (the right hand stays above the tonic so the hands never meet on one key)
    if (x.beat >= 16 && x.beat % 2 === 0 && x.beat < 28 && x.d >= 2) ns.push({ p: deg(T, x.d - 2, ints), hand: 'R' });
    n.add(x.beat, x.dur, ns);
  }
  const L = T - 12;
  for (let bar = 0; bar < QUICK2.bars; bar++) {
    const ds = mel.filter((x) => x.beat >= bar * 4 && x.beat < bar * 4 + 4).map((x) => x.d);
    const last = bar === QUICK2.bars - 1;
    const c = last ? 0 : harmonyOf(ds);
    const root = c === 3 ? -4 : c === 4 ? -3 : 0;
    // the bass moves in 8ths in bars 3–4 and 7 (root–5th–3rd–5th), in quarters elsewhere
    const eighths = !last && (bar === 2 || bar === 3 || bar === 6);
    const fig = last ? [0] : eighths ? [root, root + 4, root + 2, root + 4, root, root + 4, root + 2, root + 4] : [root, root + 4, root + 2, root + 4];
    const step = last ? 4 : eighths ? 0.5 : 1;
    fig.forEach((x, q) => n.add(bar * 4 + q * step, step, [{ p: deg(L, x, ints), hand: 'L' }]));
  }
  return done(s, n, title(s.minor ? 'quick study in a minor key, 8 bars' : 'quick study, 8 bars', s.minor ? 'לימוד מהיר בסולם מינורי, 8 תיבות' : 'לימוד מהיר, 8 תיבות', s), {}, { prep: 30, paged: true });
}

/** Build a k-read item of levels 11–15. */
export function genRead2(s: DrillSpec): Drill {
  switch (s.kind) {
    case 'kr-four':
      return genFour(s);
    case 'kr-orn':
      return genOrn(s);
    case 'kr-meter':
      return genMeter(s);
    case 'kr-lead':
      return genLead(s);
    case 'kr-quick2':
      return genQuick2(s);
  }
  throw new Error(`Unknown k-read kind ${s.kind}`);
}
