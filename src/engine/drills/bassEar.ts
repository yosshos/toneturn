// The bass-ear family F15 `b-ear` (BASS_CURRICULUM §5 F15, BASS_AUDIT B11): call and response inside one take. The
// band plays (the `listen` part of the drill), then the player answers ON THE BASS in the bars after it — so every
// answer is measured by what is played (mic / MIDI pitch and timing), never by a tap on the screen. Onsets inside the
// band's bars are ignored by the take (a speaker's sound is never taken for the answer). The expected notes stay
// hidden until the result. Audio comes from the band engine (band.ts walking lines, comping voicings) and the
// recorded bass; all material is generated, nothing copied.
//
// Pure and deterministic. Imports bass.ts helpers only inside functions (bass.ts ↔ guitar.ts load order).

import type { Drill, DrillSpec } from './types';
import type { Tuning } from '../fretboard';
import { rng, mod, NAMES } from './guitar';
import { alt, chartOf, drillOf, fold, QI, rootOf, textOf, type BN, type Prog, type Q } from './bass';

/** EN / HE pair (local: bass.ts helpers can't run at module load). */
const tt = (en: string, he: string) => ({ en, he });
import { parseChart } from '../charts';
import { comping, walkingBass, hashOf } from '../band';

type Listen = NonNullable<Drill['listen']>;
type LN = Listen['notes'][number];

/** A close-position triad / 7th chord in the piano's middle register (C3 … C5). */
function voicing(rootPc: number, q: Q): number[] {
  const r = 48 + mod(rootPc, 12);
  return QI[q].map((x) => r + x).map((m) => (m > 67 ? m - 12 : m)).sort((a, b) => a - b);
}

/** Ask texts per level kind. */
const ASK: Record<string, { en: string; he: string }> = {
  hilo0: tt('Listen to two notes, then play the HIGHER one', 'הקשיבו לשני צלילים, ונגנו את הגבוה מביניהם'),
  hilo1: tt('Listen to two notes, then play the LOWER one', 'הקשיבו לשני צלילים, ונגנו את הנמוך מביניהם'),
  tonic: tt('The band plays four bars — then play the home note (the tonic)', 'הלהקה מנגנת ארבע תיבות — ואז נגנו את צליל הבית (הטוניקה)'),
  roots: tt('Hear the chords — then play their roots, two per bar', 'שמעו את האקורדים — ואז נגנו את היסודות, שניים בתיבה'),
  rhythm: tt('Hear a two-bar rhythm — echo it on the open E', 'שמעו מקצב של שתי תיבות — החזירו אותו על מיתר E פתוח'),
  melodic: tt('Hear a two-bar line — play it back', 'שמעו קו של שתי תיבות — נגנו אותו בחזרה'),
  transcribe: tt('Hear two bars of walking bass — play them back', 'שמעו שתי תיבות של ווקינג בס — נגנו אותן בחזרה'),
  slash: tt('Hear the chords — play the BASS note of each (not always the root)', 'שמעו את האקורדים — נגנו את צליל הבס של כל אחד (לא תמיד היסוד)'),
};

/** Build a b-ear drill. */
export function generateBassEar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`b-ear:${s.kind}:${key}:${op}`);
  const notes: LN[] = [];
  const windows: [number, number][] = [];
  const line: BN[] = [];
  const band = (b0: number, b1: number) => windows.push([b0, b1]);
  const lowPlay = (m: number) => fold(tu, m);
  switch (s.kind) {
    case 'hilo': {
      // Four rounds: two low notes (bar A), the answer as a whole note (bar B).
      for (let r = 0; r < 4; r++) {
        const b0 = r * 8;
        const a = 28 + Math.floor(rnd() * 14);
        let b = a + (rnd() < 0.5 ? -1 : 1) * (3 + Math.floor(rnd() * 8));
        if (b < 28 || b > 45) b = a + (b < 28 ? 5 : -5);
        notes.push({ beat: b0, dur: 1.8, midi: [a], inst: 'bass' }, { beat: b0 + 2, dur: 1.8, midi: [b], inst: 'bass' });
        band(b0, b0 + 4);
        const want = op === 1 ? Math.min(a, b) : Math.max(a, b);
        line.push({ b: b0 + 4, d: 4, p: lowPlay(want) });
      }
      return finishEar(s, tu, line, notes, windows, op === 1 ? 'hilo1' : 'hilo0', { en: op === 1 ? 'Lower of two low notes' : 'Higher of two low notes', he: op === 1 ? 'הנמוך מבין שני צלילים נמוכים' : 'הגבוה מבין שני צלילים נמוכים' });
    }
    case 'tonic': {
      // Two rounds: I–IV–V–I in the key, then i–iv–V–i in its relative minor. Answer: the tonic, two whole notes.
      const rounds: { k: number; prog: Prog }[] = [
        { k: key, prog: [[0, 'M'], [5, 'M'], [7, '7'], [0, 'M']] },
        { k: mod(key + 9, 12), prog: [[0, 'm'], [5, 'm'], [7, '7'], [0, 'm']] },
      ];
      rounds.forEach(({ k, prog }, r) => {
        const b0 = r * 24;
        prog.forEach((c, bar) => {
          notes.push({ beat: b0 + bar * 4, dur: 3.8, midi: voicing(k + c[0], c[1]), inst: 'piano' });
          notes.push({ beat: b0 + bar * 4, dur: 1.9, midi: [rootOf(tu, k + c[0])], inst: 'bass' }, { beat: b0 + bar * 4 + 2, dur: 1.9, midi: [rootOf(tu, k + c[0]) + 7], inst: 'bass' });
        });
        band(b0, b0 + 16);
        line.push({ b: b0 + 16, d: 4, p: rootOf(tu, k) }, { b: b0 + 20, d: 4, p: rootOf(tu, k) });
      });
      return finishEar(s, tu, line, notes, windows, 'tonic', { en: 'Find the tonic on your bass', he: 'למצוא את הטוניקה על הבס' });
    }
    case 'roots': {
      // RSL harmonic recall: 4 bars of chords (no bass), then the roots on the repeat, in half notes. op 0: I, IV, V;
      // op 1: with ii, iii, vi and V7 — voiced by the band engine's comping (rootless voicings: hear the bass yourself).
      const pool: [number, Q][] = op === 1 ? [[0, 'maj7'], [2, 'm7'], [4, 'm7'], [5, 'maj7'], [7, '7'], [9, 'm7']] : [[0, 'M'], [5, 'M'], [7, 'M']];
      const prog: Prog = [[0, op === 1 ? 'maj7' : 'M']];
      while (prog.length < 4) {
        const c = pool[Math.floor(rnd() * pool.length)];
        if (c[0] !== prog[prog.length - 1][0]) prog.push(c);
      }
      if (op === 1) {
        const text = textOf(key, prog);
        const hits = comping(parseChart(text), 4, 16, 'ballad', hashOf(`b-ear:roots:${key}:${op}`));
        for (const h of hits) notes.push({ beat: h.beat, dur: h.len, midi: h.notes, inst: 'piano' });
      } else prog.forEach((c, bar) => notes.push({ beat: bar * 4, dur: 3.8, midi: voicing(key + c[0], c[1]), inst: 'piano' }));
      for (let bar = 0; bar < 4; bar++) notes.push({ beat: bar * 4, dur: 0.2, midi: [42], perc: 'hat' }, { beat: bar * 4 + 2, dur: 0.2, midi: [42], perc: 'hat' });
      band(0, 16);
      prog.forEach((c, bar) => line.push({ b: 16 + bar * 4, d: 2, p: rootOf(tu, key + c[0]), ct: true }, { b: 18 + bar * 4, d: 2, p: rootOf(tu, key + c[0]), ct: true }));
      return finishEar(s, tu, line, notes, windows, 'roots', op === 1 ? { en: 'Root finder: ii, iii, vi and V7', he: 'מוצא היסודות: ii, iii, vi ו-V7' } : { en: 'Root finder: I, IV, V', he: 'מוצא היסודות: I, IV, V' }, chartOf(key, prog));
    }
    case 'rhythm': {
      // RSL rhythmic recall: two bars on the low E (with hats), echoed on the open E string. Two rounds.
      const CARDS = ['x.x.x...', 'x..xx.x.', 'x.xxx...', '..x.x.x.', 'x...x.xx', 'xx.x..x.'];
      const E = 28;
      for (let r = 0; r < 2; r++) {
        const b0 = r * 16;
        const bars = [CARDS[Math.floor(rnd() * CARDS.length)], CARDS[Math.floor(rnd() * CARDS.length)]];
        bars.forEach((card, k) => {
          [...card].forEach((ch, i) => {
            const at = k * 4 + i / 2;
            notes.push({ beat: b0 + at, dur: 0.2, midi: [42], perc: 'hat' });
            if (ch === 'x') {
              notes.push({ beat: b0 + at, dur: 0.45, midi: [E], inst: 'bass' });
              line.push({ b: b0 + 8 + at, d: 0.5, p: E });
            }
          });
        });
        band(b0, b0 + 8);
      }
      return finishEar(s, tu, line, notes, windows, 'rhythm', { en: 'Rhythm recall on the E string', he: 'זיכרון מקצב על מיתר E' });
    }
    case 'melodic': {
      // RSL / Trinity playback: a 2-bar minor-pentatonic line from the root, echoed. Two rounds.
      const pent = [0, 3, 5, 7, 10, 12];
      for (let r = 0; r < 2; r++) {
        const b0 = r * 16;
        const R = rootOf(tu, key);
        let i = 0;
        const rhythm = [0, 1, 1.5, 2, 3, 4, 5, 6];
        rhythm.forEach((at, k) => {
          const p = R + pent[i];
          const d = (rhythm[k + 1] ?? 8) - at;
          notes.push({ beat: b0 + at, dur: d * 0.9, midi: [p], inst: 'bass' });
          line.push({ b: b0 + 8 + at, d, p });
          i = Math.max(0, Math.min(pent.length - 1, i + [-1, 1, 1, 2, -2][Math.floor(rnd() * 5)]));
        });
        band(b0, b0 + 8);
      }
      return finishEar(s, tu, line, notes, windows, 'melodic', { en: 'Melodic recall: play it back', he: 'זיכרון מלודי: לנגן בחזרה' });
    }
    case 'transcribe': {
      // Bagrut transcription, short: two bars of the band's walking line over ii–V (with comping), then play them back.
      const prog: Prog = op === 1 ? [[0, 'maj7'], [9, '7']] : [[2, 'm7'], [7, '7']];
      const text = textOf(key, prog);
      const p = parseChart(text);
      const walk = walkingBass(p, 4, 8, hashOf(`b-ear:tr:${key}:${op}`)).filter((x) => !x.ghost && Number.isInteger(x.beat));
      for (const h of comping(p, 4, 8, 'swing', hashOf(`b-ear:trc:${key}:${op}`))) notes.push({ beat: h.beat, dur: h.len, midi: h.notes, inst: 'piano' });
      for (const w of walk) {
        const m = lowPlay(w.midi);
        notes.push({ beat: w.beat, dur: 0.9, midi: [m], inst: 'bass' });
        line.push({ b: 8 + w.beat, d: 1, p: m });
      }
      band(0, 8);
      return finishEar(s, tu, line, notes, windows, 'transcribe', { en: 'Transcribe two bars of walking bass', he: 'תמלול שתי תיבות של ווקינג בס' }, chartOf(key, prog));
    }
    case 'slash': {
      // Inversions and slash bass by ear: piano chords over their bass notes (C – G/B – Am – C/G …), then play the bass line.
      const PROGS_SL: [number, Q, number][][] = [
        [[0, 'M', 0], [7, 'M', 11], [9, 'm', 9], [0, 'M', 7], [5, 'M', 5], [0, 'M', 4], [2, 'm', 2], [7, 'M', 7]],
        [[0, 'M', 0], [0, 'M', 4], [5, 'M', 5], [7, 'M', 2], [9, 'm', 0], [5, 'M', 9], [7, 'M', 7], [0, 'M', 0]],
      ];
      const pr = PROGS_SL[op % 2];
      pr.forEach(([d, q, b], i) => {
        notes.push({ beat: i * 2, dur: 1.9, midi: voicing(key + d, q), inst: 'piano' }, { beat: i * 2, dur: 1.9, midi: [rootOf(tu, key + b)], inst: 'bass' });
        line.push({ b: 16 + i * 2, d: 2, p: rootOf(tu, key + b), ct: true });
      });
      band(0, 16);
      const chart = pr.map(([d, q, b]) => (mod(b - d, 12) === 0 ? `${NAMES[mod(key + d, 12)]}${q === 'm' ? 'm' : ''}` : `${NAMES[mod(key + d, 12)]}${q === 'm' ? 'm' : ''}/${NAMES[mod(key + b, 12)]}`));
      return finishEar(s, tu, line, notes, windows, 'slash', { en: 'Slash bass by ear', he: 'בס סלאש בשמיעה' }, chart);
    }
  }
  throw new Error(`Unknown b-ear kind ${s.kind}`);
}

function finishEar(s: DrillSpec, tu: Tuning, line: BN[], notes: LN[], windows: [number, number][], ask: string, name: { en: string; he: string }, chart?: string[]): Drill {
  return drillOf(s, tu, alt(line), { ...name, chart: chart?.length ? chart : undefined, show: 'none', evenness: false, listen: { notes, windows, ask: ASK[ask] } });
}
