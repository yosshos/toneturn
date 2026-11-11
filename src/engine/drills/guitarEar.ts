// The guitarist's ear `g-ear` (GUITAR_DEEPENING §3): call and response inside one take, every answer played ON THE
// GUITAR. The app's band / guitar plays the call (`listen`; in the guitar course the 'piano' voice is the guitar
// sound), the player answers in the bars after it. Onsets inside the call windows are dropped by the take, the answer
// matches by pitch (octave errors fold, any position) and rhythm by the normal tiers, and the written answer stays
// hidden until the result (show 'none'). Calls are generated and seeded per key and option — never memorisable.
// It mirrors the bass ear (bassEar.ts) with the guitar's register (E2–E5) and the RSL guitar ear-test formats.
//
// Pure and deterministic. Imports guitar.ts helpers only inside functions (guitar.ts ↔ guitarEar.ts load order).

import type { Drill, DrillSpec } from './types';
import type { PercKind } from '../lesson';
import type { Tuning } from '../fretboard';
import { finish, mod, place, rng, NAMES, type Ev, type GN } from './guitar';
/** EN / HE pair (local: guitar.ts helpers can't run at module load). */
const t = (en: string, he: string) => ({ en, he });
import { noteAt } from '../fretboard';
import { parseChart } from '../charts';
import { comping, hashOf } from '../band';

type Listen = NonNullable<Drill['listen']>;
type LN = Listen['notes'][number];

/** Chord qualities as intervals (local: bass.ts's table can't be read at module load). */
const QI: Record<string, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '5': [0, 7] };
const SYM: Record<string, string> = { M: '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7b5', dim7: 'dim7', '5': '5' };
const SIG_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A close-position voicing in the middle register (C3 … C5), its notes rotated so the bass is hidden (`inv`). */
function voicing(rootPc: number, q: string, inv = 0): number[] {
  const r = 48 + mod(rootPc, 12);
  const ns = QI[q].map((x) => r + x).map((m) => (m > 67 ? m - 12 : m));
  const sorted = ns.sort((a, b) => a - b);
  for (let i = 0; i < inv % sorted.length; i++) sorted.push(sorted.shift()! + 12);
  return sorted.map((m) => (m > 72 ? m - 12 : m)).sort((a, b) => a - b);
}

/** The guitar's lowest note of a pitch class on strings 6 / 5 (E2 … D♯3): roots and tonics. */
const lowRoot = (pc: number): number => 40 + mod(pc - 40, 12);

const ASK: Record<string, { en: string; he: string }> = {
  tonic: t('The band plays four bars — then play the home note (the tonic), twice', 'הלהקה מנגנת ארבע תיבות — ואז נגנו את צליל הבית (הטוניקה), פעמיים'),
  mel1: t('Hear one bar (it starts on the root) — play it back', 'שמעו תיבה אחת (היא מתחילה ביסוד) — נגנו אותה בחזרה'),
  mel2: t('Hear two bars over the drums — play them back', 'שמעו שתי תיבות מעל התופים — נגנו אותן בחזרה'),
  rhythm: t('Hear two bars of strumming — echo the rhythm on muted strings', 'שמעו שתי תיבות של פריטה — החזירו את המקצב על מיתרים מושתקים'),
  riff: t('Hear a riff on the low strings — play it back (power chords count by their root)', 'שמעו ריף על המיתרים הנמוכים — נגנו אותו בחזרה (אקורד פאוור נספר לפי היסוד)'),
  roots: t('Hear four bars of chords — then play their roots on strings 6 and 5, two per bar', 'שמעו ארבע תיבות של אקורדים — ואז נגנו את היסודות על מיתרים 6 ו-5, שניים בתיבה'),
  quality: t('Hear a chord over its root — then play its arpeggio from that root', 'שמעו אקורד מעל היסוד שלו — ואז נגנו את הארפג׳יו שלו מאותו יסוד'),
  key: t('Hear a groove in an unknown key — play the tonic, then pentatonic box 1 up and down', 'שמעו גרוב בסולם לא ידוע — נגנו את הטוניקה, ואז תיבה 1 של הפנטטוני למעלה ולמטה'),
  transcribe: t('Hear two bars of a line — play them back note for note', 'שמעו שתי תיבות של קו — נגנו אותן בחזרה תו אחר תו'),
};

/** The answer note on the neck: the lowest comfortable spot (frets 0–12 on strings 6 → 1). */
function at(tu: Tuning, pitch: number, low = false): { s: number; f: number } {
  const strs = low ? [6, 5, 4] : [6, 5, 4, 3, 2, 1];
  return place(tu, pitch, strs, 0, 12) ?? place(tu, pitch, [6, 5, 4, 3, 2, 1], 0, 17)!;
}

/** Build a g-ear drill. */
export function generateGuitarEar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`g-ear:${s.kind}:${key}:${op}`);
  const pick = <T>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
  const call: LN[] = [];
  const windows: [number, number][] = [];
  const evs: Ev[] = [];
  // The call fills its bars but the last beat: the window ends a beat before the answer, because the take drops onsets
  // up to 120 ms after a window's end (a ringing speaker) — the answer's first note must never sit there.
  const band = (b0: number, b1: number) => windows.push([b0, b1 - 1]);
  const hat = (beat: number) => call.push({ beat, dur: 0.2, midi: [42], perc: 'hat' as PercKind });
  const kick = (beat: number) => call.push({ beat, dur: 0.2, midi: [36], perc: 'kick' as PercKind });
  const answer = (beat: number, dur: number, pitches: number[], extra: Partial<GN> = {}, low = false) => {
    const ns: GN[] = [];
    for (const p of pitches) {
      const x = at(tu, p, low);
      if (ns.some((n) => n.s === x.s)) continue;
      ns.push({ ...x, stroke: 'D', ...extra });
    }
    evs.push({ beat, dur, notes: ns });
  };
  let chart: string[] | undefined;
  let name: { en: string; he: string };
  let ask: string;
  let bpm = 75;
  switch (s.kind) {
    case 'tonic': {
      // L1: I–IV–V–I in the key, then i–iv–V–i in its relative minor; the answer is the tonic twice (whole notes).
      const rounds: { k: number; prog: [number, string][] }[] = [
        { k: key, prog: [[0, 'M'], [5, 'M'], [7, '7'], [0, 'M']] },
        { k: mod(key + 9, 12), prog: [[0, 'm'], [5, 'm'], [7, '7'], [0, 'm']] },
      ];
      rounds.forEach(({ k, prog }, r) => {
        const b0 = r * 24;
        prog.forEach(([d, q], bar) => {
          call.push({ beat: b0 + bar * 4, dur: bar === 3 ? 2.8 : 3.8, midi: voicing(k + d, q, Math.floor(rnd() * 3)), inst: 'piano' });
          call.push({ beat: b0 + bar * 4, dur: 1.9, midi: [lowRoot(k + d) - 12], inst: 'bass' });
        });
        band(b0, b0 + 16);
        answer(b0 + 16, 4, [lowRoot(k)], {}, true);
        answer(b0 + 20, 4, [lowRoot(k) + 12]);
      });
      name = t('Find the tonic on your guitar', 'למצוא את הטוניקה על הגיטרה');
      ask = 'tonic';
      bpm = 70;
      break;
    }
    case 'melodic1':
    case 'melodic2': {
      // L2: one bar of 3–4 notes from the minor pentatonic, the first note the root (given). L3: two bars, major or
      // minor pentatonic, the first note the root or the 5th, over hats and kick. Three rounds each.
      const two = s.kind === 'melodic2';
      const minor = !two || op % 2 === 0;
      const pent = minor ? [0, 3, 5, 7, 10, 12, 15] : [0, 2, 4, 7, 9, 12, 14];
      const R = lowRoot(key) + 12; // E3 … D♯4: the middle of the neck
      const bars = two ? 2 : 1;
      const rhythms1 = [[0, 1, 2], [0, 1, 1.5, 2], [0, 0.5, 1, 2], [0, 1, 2, 2.5], [0, 1.5, 2]];
      const rhythms2 = [[0, 1, 1.5, 2, 3, 4, 5, 6], [0, 1, 2, 2.5, 3, 4, 6], [0, 0.5, 1, 2, 4, 5, 5.5, 6], [0, 1, 2, 3, 4, 4.5, 5, 6]];
      const len = bars * 4;
      for (let r = 0; r < 3; r++) {
        const b0 = r * len * 2;
        const rh = pick(two ? rhythms2 : rhythms1);
        let i = two && rnd() < 0.5 ? 3 : 0; // the 5th (index 3 in both pentatonics) or the root
        rh.forEach((x, k) => {
          const p = R + pent[i];
          const d = (rh[k + 1] ?? len) - x;
          call.push({ beat: b0 + x, dur: Math.min(d * 0.9, len - 1 - x), midi: [p], inst: 'piano' });
          answer(b0 + len + x, d, [p]);
          i = Math.max(0, Math.min(pent.length - 1, i + pick([-2, -1, -1, 1, 1, 2])));
        });
        if (two) for (let q = 0; q < len - 1; q++) (q % 2 === 0 ? kick : hat)(b0 + q);
        band(b0, b0 + len);
      }
      name = two ? t(`Melodic recall, two bars (${minor ? 'minor' : 'major'} pentatonic)`, `זיכרון מלודי, שתי תיבות (פנטטוני ${minor ? 'מינורי' : 'מז׳ורי'})`) : t('Melodic recall, one bar (minor pentatonic, from the root)', 'זיכרון מלודי, תיבה אחת (פנטטוני מינורי, מהיסוד)');
      ask = two ? 'mel2' : 'mel1';
      bpm = two ? 80 : 75;
      break;
    }
    case 'rhythm': {
      // L4: two bars of strummed rhythm (8ths, 16ths, ties) on a chord, echoed on muted strings. Two rounds.
      const CARDS = ['x.x.x.x.', 'x..x..x.', 'x.xx.x.x', '..x..x.x', 'x...xx.x', 'xx.x.xx.', 'x.x..xx.', 'x..xx...'];
      // The second bar's last beat is the breath before the answer.
      const LAST = ['x.x.x...', 'x..xx...', 'x.xxx...', '..x.x...', 'xx.x.x..', 'x...xx..'];
      const SIX = ['x.xx', 'xx.x', 'x..x', '.xxx'];
      const v = voicing(key, 'M', 1);
      for (let r = 0; r < 2; r++) {
        const b0 = r * 16;
        for (let bar = 0; bar < 2; bar++) {
          const card = pick(bar === 1 ? LAST : CARDS);
          const slots: number[] = [];
          [...card].forEach((ch, i) => ch === 'x' && slots.push(bar * 4 + i / 2));
          // One beat of 16ths per bar from option 1 on (and from the second round).
          if (op === 1 || r === 1) {
            const beat = 1 + Math.floor(rnd() * (bar === 1 ? 2 : 3));
            const six = pick(SIX);
            for (let i = slots.length - 1; i >= 0; i--) if (slots[i] >= bar * 4 + beat && slots[i] < bar * 4 + beat + 1) slots.splice(i, 1);
            [...six].forEach((ch, i) => ch === 'x' && slots.push(bar * 4 + beat + i / 4));
          }
          slots.sort((a, b) => a - b);
          for (const x of slots) {
            call.push({ beat: b0 + x, dur: 0.22, midi: v, inst: 'piano' });
            // The answer: a muted strum (dead notes on strings 4-3-2; the pitch is never graded).
            evs.push({ beat: b0 + 8 + x, dur: 0.25, notes: [4, 3, 2].map((sn) => ({ s: sn, f: 5, tech: 'dead' as const, stroke: 'D' as const })) });
          }
          for (let q = 0; q < (bar === 1 ? 3 : 4); q++) hat(b0 + bar * 4 + q);
        }
        band(b0, b0 + 8);
      }
      name = t('Rhythm recall: echo the strumming on muted strings', 'זיכרון מקצב: להחזיר את הפריטה על מיתרים מושתקים');
      ask = 'rhythm';
      bpm = 80;
      break;
    }
    case 'riff': {
      // L5: a 1–2 bar riff on strings 6–5 — single notes from the minor pentatonic plus power chords on the root,
      // ♭III, IV, V, ♭VII. A power chord's answer is its root and 5th struck together.
      const R = lowRoot(key);
      const pent = [0, 3, 5, 7, 10, 12];
      const bars = op === 1 ? 2 : 1;
      const len = bars * 4;
      for (let r = 0; r < 2; r++) {
        const b0 = r * len * 2;
        let x = 0;
        while (x < len - 1.01) {
          const d = pick([0.5, 0.5, 1, 1, 1.5]);
          const dd = Math.min(d, len - 1 - x);
          if (rnd() < 0.35) {
            const deg = pick([0, 3, 5, 7, 10]);
            const p = R + deg;
            call.push({ beat: b0 + x, dur: dd * 0.85, midi: [p, p + 7], inst: 'piano' });
            const root = at(tu, p, true);
            const fifth = { s: root.s - 1, f: root.f + 2 };
            evs.push({ beat: b0 + len + x, dur: dd, notes: [{ ...root, stroke: 'D' }, ...(fifth.s >= 1 && noteAt(tu, fifth.s, fifth.f) === p + 7 ? [{ ...fifth, stroke: 'D' as const }] : [])] });
          } else {
            const p = R + pick(pent);
            call.push({ beat: b0 + x, dur: dd * 0.85, midi: [p], inst: 'piano' });
            answer(b0 + len + x, dd, [p], {}, true);
          }
          x += dd;
        }
        for (let q = 0; q < len - 1; q++) (q % 2 === 0 ? kick : hat)(b0 + q);
        band(b0, b0 + len);
      }
      name = t(`Riff recall: ${bars === 2 ? 'two bars' : 'one bar'} on the low strings`, `זיכרון ריף: ${bars === 2 ? 'שתי תיבות' : 'תיבה אחת'} על המיתרים הנמוכים`);
      ask = 'riff';
      bpm = 80;
      break;
    }
    case 'roots': {
      // L6 (op 0): I, IV, V, vi. L7 (op 1): with ii, iii, V7 and ♭VII. Chords in inversions (the bass is yours to
      // hear), hats on the beats; then the roots on strings 6 / 5 in half notes.
      const pool: [number, string][] = op === 1 ? [[2, 'm7'], [4, 'm7'], [7, '7'], [10, 'M'], [5, 'maj7'], [9, 'm7']] : [[5, 'M'], [7, 'M'], [9, 'm']];
      const prog: [number, string][] = [[0, op === 1 ? 'maj7' : 'M']];
      while (prog.length < 4) {
        const c = pick(pool);
        if (c[0] !== prog[prog.length - 1][0]) prog.push(c);
      }
      if (op === 1) {
        const text = prog.map(([d, q]) => `${SIG_NAMES[mod(key + d, 12)]}${SYM[q]}`).join(' | ');
        for (const h of comping(parseChart(text), 4, 16, 'ballad', hashOf(`g-ear:roots:${key}:${op}`))) if (h.beat < 14.75) call.push({ beat: Math.max(0, h.beat), dur: Math.min(h.len, 15 - Math.max(0, h.beat)), midi: h.notes, inst: 'piano' });
      } else prog.forEach(([d, q], bar) => call.push({ beat: bar * 4, dur: bar === 3 ? 2.8 : 3.8, midi: voicing(key + d, q, 1 + Math.floor(rnd() * 2)), inst: 'piano' }));
      for (let q = 0; q < 15; q++) hat(q);
      band(0, 16);
      prog.forEach(([d], bar) => {
        answer(16 + bar * 4, 2, [lowRoot(key + d)], { ct: true }, true);
        answer(18 + bar * 4, 2, [lowRoot(key + d)], { ct: true }, true);
      });
      chart = prog.map(([d, q]) => `${NAMES[mod(key + d, 12)]}${SYM[q]}`);
      name = op === 1 ? t('Root finder: ii, iii, V7 and ♭VII', 'מוצא היסודות: ii, iii, V7 ו-♭VII') : t('Root finder: I, IV, V and vi', 'מוצא היסודות: I, IV, V ו-vi');
      ask = 'roots';
      bpm = 80;
      break;
    }
    case 'quality': {
      // L8: one chord over its root (maj, min, 7, maj7, m7, m7♭5, °7), then its arpeggio from the given root.
      const pool = op === 1 ? ['maj7', 'm7', '7', 'm7b5', 'dim7'] : ['M', 'm', '7', 'maj7', 'm7'];
      const degs = [0, 5, 7, 9, 2, 4];
      let last = '';
      for (let r = 0; r < 4; r++) {
        const b0 = r * 8;
        let q = pick(pool);
        if (q === last) q = pool[(pool.indexOf(q) + 1) % pool.length];
        last = q;
        const R = lowRoot(key + pick(degs));
        call.push({ beat: b0, dur: 2.8, midi: voicing(R, q), inst: 'piano' }, { beat: b0, dur: 2.8, midi: [R - 12], inst: 'bass' });
        band(b0, b0 + 4);
        const ivs = QI[q];
        ivs.forEach((x, k2) => answer(b0 + 4 + k2, k2 === ivs.length - 1 ? 4 - k2 : 1, [R + x], { ct: true }));
      }
      name = op === 1 ? t('Chord quality by ear: 7ths, half-diminished, diminished', 'סוג האקורד בשמיעה: ספטאקורדים, חצי-מוקטן ומוקטן') : t('Chord quality by ear: triads and 7ths', 'סוג האקורד בשמיעה: משולשים וספטאקורדים');
      ask = 'quality';
      bpm = 60;
      break;
    }
    case 'key': {
      // L9: a 4-bar groove in a key not shown (op 0 major, op 1 minor); the answer is the tonic (a whole note), then
      // pentatonic box 1 of that key up and down in 8ths.
      const minor = op === 1;
      const prog: [number, string][] = minor ? [[0, 'm7'], [5, 'm7'], [10, 'M'], [7, '7']] : [[0, 'M'], [9, 'm'], [5, 'M'], [7, '7']];
      const rot = Math.floor(rnd() * 4);
      const pr = [...prog.slice(rot), ...prog.slice(0, rot)];
      pr.forEach(([d, q], bar) => {
        const last = bar === 3;
        call.push({ beat: bar * 4, dur: 1.8, midi: voicing(key + d, q, 1), inst: 'piano' }, { beat: bar * 4 + 2, dur: last ? 0.9 : 1.8, midi: voicing(key + d, q, 2), inst: 'piano' });
        call.push({ beat: bar * 4, dur: 1.9, midi: [lowRoot(key + d) - 12], inst: 'bass' }, { beat: bar * 4 + 2.5, dur: last ? 0.45 : 1.4, midi: [lowRoot(key + d) - 5], inst: 'bass' });
        for (let q2 = 0; q2 < (last ? 3 : 4); q2++) (q2 % 2 === 0 ? kick : hat)(bar * 4 + q2);
      });
      band(0, 16);
      const T = lowRoot(key);
      answer(16, 4, [T], { ct: true }, true);
      // Box 1 (the root on string 6): the minor pentatonic from the tonic, or the major pentatonic from it.
      const ints = minor ? [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24] : [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      const tf = mod(T - 40, 12) || 12;
      const box = ints.map((x) => place(tu, T + x, [6, 5, 4, 3, 2, 1], Math.max(0, tf - 1), tf + 4) ?? at(tu, T + x));
      const line = [...box, ...box.slice(0, -1).reverse()];
      line.forEach((x, k2) => evs.push({ beat: 20 + k2 * 0.5, dur: k2 === line.length - 1 ? 1 : 0.5, notes: [{ ...x, stroke: k2 % 2 === 0 ? 'D' : 'U' }] }));
      name = minor ? t('Find the key (minor), then play its pentatonic', 'למצוא את הסולם (מינורי), ואז לנגן את הפנטטוני שלו') : t('Find the key (major), then play its pentatonic', 'למצוא את הסולם (מז׳ורי), ואז לנגן את הפנטטוני שלו');
      ask = 'key';
      bpm = 70;
      break;
    }
    case 'transcribe': {
      // L10: two bars of 8ths — blues lines from the minor blues scale (op 0), then lines with chromatic passing and
      // approach notes into chord tones (op 1) — played back note for note.
      const R = lowRoot(key) + 12;
      const blues = [0, 3, 5, 6, 7, 10, 12, 15];
      const line: number[] = [];
      if (op === 0) {
        let i = pick([0, 2, 4, 6]);
        for (let k2 = 0; k2 < 13; k2++) {
          line.push(R + blues[i]);
          i = Math.max(0, Math.min(blues.length - 1, i + pick([-1, -1, 1, 1, -2, 2])));
        }
        line.push(R);
      } else {
        // Chord tones of I7 and IV7 on the beats, a chromatic approach or a passing note on each "and".
        const ct1 = [0, 4, 7, 10, 12, 16];
        const ct2 = [5, 9, 12, 15, 17];
        let prev = R + 7;
        for (let beat = 0; beat < 7; beat++) {
          const cts = beat < 4 ? ct1 : ct2;
          const target = R + cts.reduce((a, b) => (Math.abs(R + b - prev) < Math.abs(R + a - prev) && R + b !== prev ? b : a), cts[(beat * 3) % cts.length]);
          const nextCts = beat + 1 < 4 ? ct1 : ct2;
          const nxt = R + nextCts[(beat * 5 + 2) % nextCts.length];
          line.push(target);
          line.push(beat === 6 ? target : nxt + (nxt > target ? -1 : 1));
          prev = nxt;
        }
      }
      line.forEach((p, k2) => {
        call.push({ beat: k2 * 0.5, dur: 0.45, midi: [p], inst: 'piano' });
        answer(8 + k2 * 0.5, k2 === line.length - 1 ? 1 : 0.5, [p], { stroke: k2 % 2 === 0 ? 'D' : 'U' });
      });
      for (let q = 0; q < 7; q++) hat(q);
      band(0, 8);
      name = op === 1 ? t('Transcribe a line: chromatic passing and approach notes', 'תמלול קו: צלילים כרומטיים עוברים וצלילי גישה') : t('Transcribe a line: the blues scale', 'תמלול קו: סולם הבלוז');
      ask = 'transcribe';
      bpm = 70;
      break;
    }
    default:
      throw new Error(`Unknown g-ear kind ${s.kind}`);
  }
  const d = finish(s, tu, evs, { title: t(`${name.en} · ${NAMES[key]}`, `${name.he} · ${NAMES[key]}`), bpm, evenness: false });
  // Every call note sits inside a window; the drill runs to the end of the last answer.
  return { ...d, show: 'none', ...(chart ? { chart } : {}), listen: { notes: call.sort((a, b) => a.beat - b.beat), windows, ask: ASK[ask] } };
}
