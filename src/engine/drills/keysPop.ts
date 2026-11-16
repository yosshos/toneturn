// AUDIT-7 #10 (docs/research/AUDIT-7-GAPS.md §1): the keys' pop on-ramp and pedalling were one level each
// (accomp-7 "Pop left-hand patterns"; control-10 "direct and legato pedal"). Two measured ladders:
//
//   k-pop    pop / rock accompaniment from a lead sheet (chord symbols over the staff), common progressions, all 12 keys:
//            1 block chords in the 3+3+2 pop rhythm · 2 broken patterns (LH root–5th–octave, RH broken triads) ·
//            3 the pop ballad (LH broken 8ths, RH chords with the push on the "and" of 4) · 4 rock (driving 8th-note
//            chords over LH octaves) · 5 reggae (the off-beat "skank", the bass on 1 and 3) · 6 a lead sheet: the tune in
//            the right hand over a left-hand pattern
//   k-pedal  pedal levels 2–4 after control-10: 1 legato pedal through broken chords · 2 syncopated pedal where the harmony
//            changes inside the bar and on the "and" of 4 · 3 half-pedal over a held bass (MIDI CC64: a partial lift at
//            each change; an on/off pedal is graded as legato pedal and the result says so — pedal.ts)
//
// Every progression, rhythm and tune is our own (the progressions are the common pop ones: I–V–vi–IV, vi–IV–I–V,
// I–vi–IV–V, I–IV–vi–V). Generated from the item's seed, all 12 keys (C, G and F first). Like every piano item a new one
// is played in free time first, then on the tempo ladder (rubato.ts). Pure and deterministic.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { all12 } from './keys12';
import { seeded } from './keysFirst';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJ = [0, 2, 4, 5, 7, 9, 11];

/** The common pop progressions (scale degrees 0–6; ii, iii, vi minor). */
export const POP_PROGS: { name: string; degs: number[] }[] = [
  { name: 'I–V–vi–IV', degs: [0, 4, 5, 3] },
  { name: 'vi–IV–I–V', degs: [5, 3, 0, 4] },
  { name: 'I–vi–IV–V', degs: [0, 5, 3, 4] },
  { name: 'I–IV–vi–V', degs: [0, 3, 5, 4] },
];
const minorDeg = (d: number) => d === 1 || d === 2 || d === 5;
/** Chord symbol of a degree in a key. */
export const chordSym = (key: number, d: number): string => `${NAMES[mod(key + MAJ[mod(d, 7)], 12)]}${minorDeg(mod(d, 7)) ? 'm' : ''}`;
const triadPcs = (key: number, d: number): number[] => [0, 2, 4].map((x) => mod(key + MAJ[mod(d + x, 7)], 12));
/** The root of a degree in the left hand's register (E2–D♯3). */
const lhRoot = (key: number, d: number): number => 40 + mod(key + MAJ[mod(d, 7)] - 40, 12);

/** Close triads inside [lo, hi], each as near as possible to the one before (smooth block chords). */
export function voiceTriads(key: number, degs: number[], lo = 64, hi = 83): number[][] {
  const out: number[][] = [];
  let prev: number[] | null = null;
  for (const d of degs) {
    const pcs = triadPcs(key, d);
    const cands: number[][] = [];
    for (let inv = 0; inv < 3; inv++)
      for (let oct = 36; oct <= 84; oct += 12) {
        const ord = [...pcs.slice(inv), ...pcs.slice(0, inv)];
        const v: number[] = [];
        let last = oct - 1;
        for (const pc of ord) {
          let p = oct + mod(pc - oct, 12);
          while (p <= last) p += 12;
          v.push(p);
          last = p;
        }
        if (v[0] >= lo && v[2] <= hi) cands.push(v);
      }
    const cost = (v: number[]) => (prev ? v.reduce((a, p, i) => a + Math.abs(p - prev![i]), 0) : Math.abs(v[0] - (lo + 4)));
    cands.sort((a, b) => cost(a) - cost(b) || a[0] - b[0]);
    prev = cands[0];
    out.push(prev);
  }
  return out;
}

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, ns: { p: number; hand: 'R' | 'L' }[], o: { accent?: boolean } = {}): void {
    const id = ns.length > 1 ? ++this.cid : undefined;
    for (const n of ns) this.list.push({ pitch: n.p, beat: r6(beat), dur: r6(dur), hand: n.hand, ...(id !== undefined ? { chordId: id } : {}), ...(o.accent ? { accent: true } : {}) });
  }
}
const R = (ps: number[]) => ps.map((p) => ({ p, hand: 'R' as const }));
const Lh = (ps: number[]) => ps.map((p) => ({ p, hand: 'L' as const }));

function done(s: DrillSpec, n: Notes, title: T2, startBpm: number, goal: Partial<DrillGoal>, extra: Partial<Drill> = {}): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return {
    spec: { ...s, hands: 'RL' },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter: 4,
    keySig: SIG[mod(s.key, 12)],
    goal: { evenness: false, hands: true, ...goal },
    startBpm: s.tempo ?? startBpm,
    ...extra,
  };
}
const kt = (en: string, he: string, s: DrillSpec, prog: string): T2 => t(`${en} · ${prog} · ${NAMES[mod(s.key, 12)]}`, `${he} · ⁦${prog}⁩ · ${NAMES[mod(s.key, 12)]}`);

// ───────────────────────────── k-pop ─────────────────────────────

/** Eight bars of a progression (twice through) and the closing tonic bar; the chart above the staff. */
const BARS = 8;

function genPop(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const pg = POP_PROGS[op % POP_PROGS.length];
  const degs = Array.from({ length: BARS }, (_, b) => pg.degs[b % 4]);
  const vs = voiceTriads(key, degs);
  const n = new Notes();
  const chart = [...degs.map((d) => chordSym(key, d)), chordSym(key, 0)];
  const endV = voiceTriads(key, [...degs, 0]).at(-1)!;
  const end = () => n.add(BARS * 4, 4, [...R(endV), ...Lh([lhRoot(key, 0)])]);
  switch (s.kind) {
    case 'kp-block': {
      // RH triads in 3+3+2 (1, the "and" of 2, 4), the LH root held through the bar.
      degs.forEach((d, b) => {
        const b0 = b * 4;
        n.add(b0, 4, Lh([lhRoot(key, d)]));
        n.add(b0, 1.5, R(vs[b]), { accent: true });
        n.add(b0 + 1.5, 1.5, R(vs[b]));
        n.add(b0 + 3, 1, R(vs[b]));
      });
      end();
      return done(s, n, kt('Block chords: the 3+3+2 pop rhythm', 'אקורדים חסומים: מקצב הפופ 3+3+2', s, pg.name), 72, { evenness: true }, { chart });
    }
    case 'kp-broken': {
      // LH root–5th–octave–5th in 8ths; RH the triad held (op even) or broken upward (op odd, 1–3–5–3 in quarters).
      const brokenR = Math.floor(op / POP_PROGS.length) % 2 === 1 || s.hands === 'R';
      degs.forEach((d, b) => {
        const b0 = b * 4;
        const r = lhRoot(key, d);
        [r, r + 7, r + 12, r + 7, r, r + 7, r + 12, r + 7].forEach((p, i) => n.add(b0 + i / 2, 0.5, Lh([p])));
        if (brokenR) [0, 1, 2, 1].forEach((i, k) => n.add(b0 + k, 1, R([vs[b][i]])));
        else n.add(b0, 4, R(vs[b]));
      });
      end();
      return done(s, n, kt(brokenR ? 'Broken patterns: both hands broken' : 'Broken patterns: LH root–5th–octave', brokenR ? 'תבניות שבורות: שתי הידיים שבורות' : 'תבניות שבורות: יסוד–קווינטה–אוקטבה ביד שמאל', s, pg.name), 72, { evenness: true }, { chart });
    }
    case 'kp-ballad': {
      // LH broken 8ths (root, 5th, octave, 5th), RH the chord on 3 and the next chord pushed onto the "and" of 4 (written
      // as a short chord: nothing is held over the bar line); the first bar opens on 1.
      degs.forEach((d, b) => {
        const b0 = b * 4;
        const r = lhRoot(key, d);
        [r, r + 7, r + 12, r + 7, r, r + 7, r + 12, r + 7].forEach((p, i) => n.add(b0 + i / 2, 0.5, Lh([p])));
        if (b === 0) n.add(b0, 2, R(vs[b]));
        n.add(b0 + 2, 1.5, R(vs[b]));
        n.add(b0 + 3.5, 0.5, R(b + 1 < BARS ? vs[b + 1] : endV), { accent: true });
      });
      end();
      return done(s, n, kt('Pop ballad: broken left hand, the push on the "and" of 4', 'בלדת פופ: יד שמאל שבורה, הדחיפה על ה"וְ" של 4', s, pg.name), 66, { evenness: false }, { chart });
    }
    case 'kp-rock': {
      // RH 8th-note triads, accents on 2 and 4; LH root octaves in 8ths (op < 4) or in quarters.
      const quarters = op >= POP_PROGS.length;
      degs.forEach((d, b) => {
        const b0 = b * 4;
        const r = lhRoot(key, d);
        for (let i = 0; i < 8; i++) n.add(b0 + i / 2, 0.5, R(vs[b]), { accent: i === 2 || i === 6 });
        for (let i = 0; i < (quarters ? 4 : 8); i++) n.add(b0 + (quarters ? i : i / 2), quarters ? 1 : 0.5, Lh([r - 12, r]));
      });
      end();
      return done(s, n, kt(`Rock: 8th-note chords over LH octaves${quarters ? ' in quarters' : ''}`, `רוק: אקורדים בשמיניות מעל אוקטבות ביד שמאל${quarters ? ' ברבעים' : ''}`, s, pg.name), 96, { evenness: true }, { chart });
    }
    case 'kp-reggae': {
      // The skank: short RH chords on every "and" (op < 4) or on 2 and 4 (op ≥ 4, the one-drop feel); LH root on 1, its
      // 5th on the "and" of 2, the root again on 3.
      const oneDrop = op >= POP_PROGS.length;
      degs.forEach((d, b) => {
        const b0 = b * 4;
        const r = lhRoot(key, d);
        n.add(b0, 1, Lh([r]));
        n.add(b0 + 1.5, 0.5, Lh([r + 7]));
        n.add(b0 + 2, 1, Lh([r]));
        const at = oneDrop ? [1, 3] : [0.5, 1.5, 2.5, 3.5];
        for (const x of at) n.add(b0 + x, 0.5, R(vs[b]), { accent: oneDrop });
      });
      end();
      return done(s, n, kt(oneDrop ? 'Reggae: the skank on 2 and 4' : 'Reggae: the skank on every "and"', oneDrop ? 'רגאיי: הסקאנק על 2 ו־4' : 'רגאיי: הסקאנק על כל "וְ"', s, pg.name), 76, { evenness: true }, { chart });
    }
    case 'kp-lead': {
      // A lead sheet: a tune of our own (chord tones on the beats, steps between) in the RH; the LH plays root–5th halves.
      const rnd = seeded(`${itemIdOf(s)}:lead`);
      let prev = vs[0][2];
      degs.forEach((d, b) => {
        const b0 = b * 4;
        const r = lhRoot(key, d);
        n.add(b0, 2, Lh([r]));
        n.add(b0 + 2, 2, Lh([r + 7]));
        const tones = triadPcs(key, d);
        // beat 1: the chord tone nearest the last note; then a rhythm cell of quarters / 8ths moving by step or to a chord tone
        const near = (target: number) => {
          let best = 0;
          for (let p = 64; p <= 81; p++) if (tones.includes(mod(p, 12)) && (best === 0 || Math.abs(p - target) < Math.abs(best - target))) best = p;
          return best;
        };
        const scaleStep = (p: number, dir: number) => {
          let q = p + dir;
          while (!MAJ.includes(mod(q - key, 12))) q += dir;
          return Math.max(62, Math.min(83, q));
        };
        const cells = [[1, 1, 1, 1], [1, 0.5, 0.5, 2], [2, 1, 1], [1.5, 0.5, 2], [1, 1, 2]];
        const cell = b === BARS - 1 ? [4] : cells[Math.floor(rnd() * cells.length)];
        let at = 0;
        let p = near(prev + (rnd() < 0.5 ? -2 : 2));
        cell.forEach((len, i) => {
          if (i > 0) p = Number.isInteger(at) && at % 2 === 0 ? near(p + (rnd() < 0.5 ? -3 : 3)) : scaleStep(p, rnd() < 0.5 ? -1 : 1);
          n.add(b0 + at, len, R([p]));
          at += len;
        });
        prev = p;
      });
      n.add(BARS * 4, 4, [...R([vs[0][2] >= 64 ? vs[0][2] : vs[0][2] + 12]), ...Lh([lhRoot(key, 0)])]);
      return done(s, n, kt('A lead sheet: the tune over a left-hand pattern', 'דף אקורדים: המנגינה מעל תבנית ביד שמאל', s, pg.name), 72, { evenness: false }, { chart });
    }
  }
  throw new Error(`Unknown k-pop kind ${s.kind}`);
}

// ───────────────────────────── k-pedal ─────────────────────────────

/** Progressions for the pedal levels (degrees; 7 = V7 written as V). */
const PEDAL_PROGS = [
  [0, 5, 1, 4, 0, 3, 4, 0],
  [0, 3, 4, 0, 5, 1, 4, 0],
  [5, 3, 0, 4, 5, 3, 4, 0],
];

function genPedal2(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const prog = PEDAL_PROGS[op % PEDAL_PROGS.length];
  const n = new Notes();
  const changes: number[] = [];
  const chartBars: string[] = [];
  switch (s.kind) {
    case 'kped-legato': {
      // LH root on 1, RH broken triad in 8ths (up and back); the pedal changes with each bar, legato (up-down after).
      const vs = voiceTriads(key, prog, 60, 79);
      prog.forEach((d, b) => {
        const b0 = b * 4;
        changes.push(b0);
        chartBars.push(chordSym(key, d));
        const last = b === prog.length - 1;
        n.add(b0, 4, Lh([lhRoot(key, d)]));
        if (last) n.add(b0 + 0.5, 3.5, R(vs[b]));
        else [0, 1, 2, 1, 0, 1, 2, 1].forEach((i, k) => n.add(b0 + k / 2, 0.5, R([vs[b][i] + (k >= 4 && i === 2 ? 12 : 0)])));
      });
      return done(s, n, t(`Legato pedal through broken chords · ${NAMES[key]}`, `פדל לגאטו דרך אקורדים שבורים · ${NAMES[key]}`), 60, { evenness: true, hands: false, pedal: { style: 'legato', changes } }, { chart: chartBars });
    }
    case 'kped-synco': {
      // The harmony changes on 1 and 3 in some bars, on the "and" of 4 (the next chord anticipated) in others: the pedal
      // follows the harmony, not the bar line. RH the chord's top note, then two notes of it; LH the root on each chord.
      const segs: { at: number; len: number; d: number }[] = [];
      let carried = false;
      prog.forEach((d, b) => {
        const b0 = b * 4;
        const last = b === prog.length - 1;
        if (b % 4 === 1) {
          segs.push({ at: b0, len: 2, d }, { at: b0 + 2, len: 2, d: mod(d + 5, 7) });
          changes.push(b0, b0 + 2);
        } else if (b % 4 === 3 && !last) {
          segs.push({ at: b0, len: 3.5, d }, { at: b0 + 3.5, len: 0.5, d: prog[b + 1] });
          if (!carried) changes.push(b0);
          changes.push(b0 + 3.5);
          carried = true;
          return;
        } else {
          segs.push({ at: b0, len: 4, d });
          if (!carried) changes.push(b0);
        }
        carried = false;
      });
      const vs = voiceTriads(key, segs.map((x) => x.d), 64, 83);
      segs.forEach((c, i) => {
        n.add(c.at, c.len, Lh([lhRoot(key, c.d)]));
        if (c.len >= 2) {
          n.add(c.at, 1, R([vs[i][2]]));
          n.add(c.at + 1, c.len - 1, R([vs[i][1], vs[i][2]]));
        } else n.add(c.at, c.len, R(vs[i]));
      });
      const chart = Array.from({ length: prog.length }, (_, b) =>
        segs
          .filter((c) => c.at >= b * 4 && c.at < b * 4 + 4)
          .map((c) => chordSym(key, c.d))
          .filter((x, k, a) => k === 0 || a[k - 1] !== x)
          .join(' '),
      );
      return done(s, n, t(`Syncopated pedal: change with the harmony, not the bar line · ${NAMES[key]}`, `פדל מסונכפ: מחליפים עם ההרמוניה, לא עם קו התיבה · ${NAMES[key]}`), 60, { evenness: false, hands: false, pedal: { style: 'legato', changes } }, { chart });
    }
    case 'kped-half': {
      // A tonic (op 0, 2) or dominant (op 1) pedal point: the LH octave struck on each bar's 1; RH chords change twice a
      // bar above it. A full change would cut the low note: half-change (a partial lift) so the bass rings on.
      const bassDeg = op % 3 === 1 ? 4 : 0;
      const bass = lhRoot(key, bassDeg) - 12;
      const upper = op % 3 === 1 ? [3, 4, 1, 4, 3, 4, 1, 4] : op % 3 === 2 ? [0, 5, 3, 4, 0, 3, 4, 0] : [0, 3, 4, 3, 0, 5, 3, 0];
      const vs = voiceTriads(key, upper, 64, 83);
      const bn = NAMES[mod(key + MAJ[bassDeg], 12)];
      for (let b = 0; b < upper.length / 2; b++) n.add(b * 4, 4, Lh([bass, bass + 12]));
      upper.forEach((_, i) => {
        changes.push(i * 2);
        n.add(i * 2, 2, R(vs[i]));
      });
      const chart = Array.from({ length: upper.length / 2 }, (_, b) => `${chordSym(key, upper[2 * b])}/${bn} ${chordSym(key, upper[2 * b + 1])}/${bn}`);
      return done(s, n, t(`Half-pedal over a held bass · ${NAMES[key]}`, `חצי פדל מעל בס מוחזק · ${NAMES[key]}`), 56, { evenness: false, hands: false, pedal: { style: 'half', changes } }, { chart });
    }
  }
  throw new Error(`Unknown k-pedal kind ${s.kind}`);
}

/** Build a k-pop or k-pedal item. */
export function genKeysPop(s: DrillSpec): Drill {
  return s.family === 'k-pedal' ? genPedal2(s) : genPop(s);
}

// ───────────────────────────── the families ─────────────────────────────

/** C, G and F first, then all 12. */
const KEYS = all12([0, 7, 5]);

export function keysPopFamily(): FamilyDef {
  const fam: FamilyId = 'k-pop';
  const sp = (kind: string, option: number): SpecTemplate => ({ family: fam, kind, hands: 'RL', option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo });
  return {
    id: fam,
    title: t('Pop accompaniment', 'ליווי פופ'),
    style: 'both',
    levels: [
      L(1, 'Block chords in the pop rhythm', 'אקורדים חסומים במקצב פופ', [0, 1, 2].map((o) => sp('kp-block', o)), [60, 100]),
      L(2, 'Broken patterns', 'תבניות שבורות', [sp('kp-broken', 0), sp('kp-broken', 4 + 1), sp('kp-broken', 2)], [60, 100]),
      L(3, 'The pop ballad', 'בלדת פופ', [0, 1, 3].map((o) => sp('kp-ballad', o)), [56, 84]),
      L(4, 'Rock accompaniment', 'ליווי רוק', [sp('kp-rock', 0), sp('kp-rock', 2), sp('kp-rock', 4 + 1)], [80, 132]),
      L(5, 'Reggae accompaniment', 'ליווי רגאיי', [sp('kp-reggae', 0), sp('kp-reggae', 4 + 1), sp('kp-reggae', 3)], [66, 96]),
      L(6, 'A lead sheet: tune and accompaniment', 'דף אקורדים: מנגינה וליווי', [0, 1, 2].map((o) => sp('kp-lead', o)), [60, 100]),
    ],
  };
}

export function keysPedalFamily(): FamilyDef {
  const fam: FamilyId = 'k-pedal';
  const sp = (kind: string, option: number): SpecTemplate => ({ family: fam, kind, hands: 'RL', option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo });
  return {
    id: fam,
    title: t('Pedalling', 'פדל'),
    style: 'both',
    levels: [
      L(1, 'Legato pedal through broken chords', 'פדל לגאטו דרך אקורדים שבורים', [0, 1, 2].map((o) => sp('kped-legato', o)), [56, 84]),
      L(2, 'Syncopated pedal: change with the harmony', 'פדל מסונכפ: מחליפים עם ההרמוניה', [0, 1, 2].map((o) => sp('kped-synco', o)), [56, 84]),
      L(3, 'Half-pedal over a held bass', 'חצי פדל מעל בס מוחזק', [0, 1, 2].map((o) => sp('kped-half', o)), [50, 72]),
    ],
  };
}
