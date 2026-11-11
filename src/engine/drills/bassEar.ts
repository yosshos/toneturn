// The bass-ear family F15 `b-ear` (BASS_CURRICULUM §5 F15, BASS_AUDIT B11): call and response inside one take. The
// band plays (the `listen` part of the drill), then the player answers ON THE BASS in the bars after it — so every
// answer is measured by what is played (mic / MIDI pitch and timing), never by a tap on the screen. Onsets inside the
// band's bars are ignored by the take (a speaker's sound is never taken for the answer). The expected notes stay
// hidden until the result. Audio comes from the band engine (band.ts walking lines, comping voicings) and the
// recorded bass; all material is generated, nothing copied.
//
// Pure and deterministic. Imports bass.ts helpers only inside functions (bass.ts ↔ guitar.ts load order).

import type { Drill, DrillSpec, TakeMetrics } from './types';
import type { Tuning } from '../fretboard';
import { rng, mod } from './guitar';
import { alt, chartOf, drillOf, fold, PROGS, QI, rootOf, spell, textOf, type BN, type Prog, type Q } from './bass';
import { MODULATIONS, withBarPlan } from './timeline';
import { barryLine } from '../barry';
type T2l = { en: string; he: string };

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
  quality: tt('Hear a chord over its root — then play its arpeggio: root, 3rd, 5th, 7th', 'שמעו אקורד מעל היסוד שלו — ואז נגנו את הארפג׳יו שלו: יסוד, טרצה, קווינטה, ספטימה'),
  slash: tt('Hear the chords — play the BASS note of each (not always the root)', 'שמעו את האקורדים — נגנו את צליל הבס של כל אחד (לא תמיד היסוד)'),
  quality2: tt('Hear a chord over its root — then play its four notes: root, 3rd or 4th, 5th, 6th or 7th', 'שמעו אקורד מעל היסוד שלו — ואז נגנו את ארבעת הצלילים שלו: יסוד, טרצה או קוורטה, קווינטה, סקסטה או ספטימה'),
  quality3: tt('Hear a colourful dominant or major chord — play root, 3rd, 7th and its colour note', 'שמעו אקורד דומיננטי או מז׳ורי צבעוני — נגנו יסוד, טרצה, ספטימה ואת צליל הצבע שלו'),
  motion: tt('Hear a cadence — then play its bass line, one note a bar', 'שמעו קדנצה — ואז נגנו את קו הבס שלה, צליל אחד בתיבה'),
  secdom: tt('Hear the chords — then play the bass note of each, one a bar', 'שמעו את האקורדים — ואז נגנו את צליל הבס של כל אחד, אחד בתיבה'),
  where: tt('The band plays part of the form — go on with the next section’s roots', 'הלהקה מנגנת חלק מהצורה — המשיכו עם היסודות של הקטע הבא'),
  dropin: tt('The band starts somewhere in the blues — play the next four roots', 'הלהקה מתחילה איפשהו בבלוז — נגנו את ארבעת היסודות הבאים'),
  bridge: tt('Hear a whole chorus — then play the bridge’s roots', 'שמעו סבב שלם — ואז נגנו את היסודות של הגשר'),
  'riff-ear': tt('Hear a two-bar riff — play it back', 'שמעו ריף של שתי תיבות — נגנו אותו בחזרה'),
  'groups-ear': tt('Hear the groove’s accents — play a root on each group start', 'שמעו את ההדגשות של הגרוב — נגנו יסוד בתחילת כל קבוצה'),
  'mod-ear': tt('Hear the beat change — play quarters on the new beat', 'שמעו את הפעמה משתנה — נגנו רבעים בפעמה החדשה'),
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
      // Bagrut transcription: after playing it back, write the line (tap it on the neck), graded note for note.
      const d = finishEar(s, tu, line, notes, windows, 'transcribe', { en: 'Transcribe two bars of walking bass', he: 'תמלול שתי תיבות של ווקינג בס' }, chartOf(key, prog));
      return { ...d, write: { pitches: line.map((x) => x.p) } };
    }
    case 'quality': {
      // RSL ear tests Gr 6–8 (chord quality): the band plays a chord over its root (a bar), then the player answers with
      // its arpeggio R–3–5–7 in quarters — the quality decides the 3rd, 5th and 7th, so the answer is measured by pitch.
      // Four rounds; op 0: maj7 / m7 / 7; op 1: with m7♭5 and dim7.
      const pool: Q[] = op === 1 ? ['maj7', 'm7', '7', 'm7b5', 'dim7'] : ['maj7', 'm7', '7'];
      const degs = [0, 5, 7, 9, 2];
      let last: Q | null = null;
      for (let r = 0; r < 4; r++) {
        const b0 = r * 8;
        let q = pool[Math.floor(rnd() * pool.length)];
        if (q === last) q = pool[(pool.indexOf(q) + 1) % pool.length];
        last = q;
        const d = degs[Math.floor(rnd() * degs.length)];
        const R = rootOf(tu, key + d);
        notes.push({ beat: b0, dur: 3.8, midi: voicing(key + d, q), inst: 'piano' }, { beat: b0, dur: 3.8, midi: [R], inst: 'bass' });
        band(b0, b0 + 4);
        QI[q].forEach((x, k) => line.push({ b: b0 + 4 + k, d: 1, p: R + x, ct: true }));
      }
      return finishEar(s, tu, line, notes, windows, 'quality', op === 1 ? { en: 'Chord quality by ear: 7ths, half-diminished, diminished', he: 'סוג האקורד בשמיעה: ספטאקורדים, חצי-מוקטן ומוקטן' } : { en: 'Chord quality by ear: maj7, m7, 7', he: 'סוג האקורד בשמיעה: maj7, m7, 7' });
    }
    // ───── BASS_NICHE_PLAN E1–E4 (levels 10–19): wider qualities, harmonic motion, form, longer play-back ─────
    case 'quality2':
    case 'quality3': {
      // E1: the band plays a chord over its root; the answer is four notes on the bass that only that quality has.
      // quality2: m6, maj6, 7sus4, m(maj7) (its arpeggio); quality3: 7♭9, 7♯9, maj7♯11, 7alt (root, 3rd, 7th, colour).
      const POOL: [string, number[]][] =
        s.kind === 'quality2'
          ? [['m6', [0, 3, 7, 9]], ['6', [0, 4, 7, 9]], ['7sus4', [0, 5, 7, 10]], ['m(maj7)', [0, 3, 7, 11]]]
          : [['7♭9', [0, 4, 10, 13]], ['7♯9', [0, 4, 10, 15]], ['maj7♯11', [0, 4, 11, 18]], ['7alt', [0, 4, 10, 20]]];
      const degs = [0, 5, 7, 2, 9];
      let last = -1;
      for (let r = 0; r < 4; r++) {
        const b0 = r * 8;
        let qi = Math.floor(rnd() * POOL.length);
        if (qi === last) qi = (qi + 1) % POOL.length;
        last = qi;
        const iv = POOL[qi][1];
        const d = degs[Math.floor(rnd() * degs.length)];
        const R = rootOf(tu, key + d);
        const piano = iv.map((x) => 48 + mod(key + d, 12) + x).map((m) => (m > 74 ? m - 12 : m)).sort((a, b) => a - b);
        notes.push({ beat: b0, dur: 3.8, midi: piano, inst: 'piano' }, { beat: b0, dur: 3.8, midi: [R], inst: 'bass' });
        band(b0, b0 + 4);
        iv.forEach((x, k) => line.push({ b: b0 + 4 + k, d: 1, p: R + x, ct: true }));
      }
      return finishEar(s, tu, line, notes, windows, s.kind, s.kind === 'quality2' ? { en: 'Chord quality by ear: 6ths, sus, minor-major', he: 'סוג האקורד בשמיעה: סקסטות, sus, מינור-מז׳ור' } : { en: 'Chord quality by ear: altered dominants and ♯11', he: 'סוג האקורד בשמיעה: דומיננטות אלטרד ו־♯11' });
    }
    case 'motion':
    case 'secdom': {
      // E2: the band plays a cadence (no bass); play the bass line it implies, one note a bar.
      // motion: ii–V–I vs the backdoor iv–♭VII–I vs the tritone sub ii–♭II7–I; secdom: secondary dominants and passing
      // diminished chords (bass notes, slash chords included).
      const POOL: { ch: [number, string, number[]][]; en: string; he: string }[] =
        s.kind === 'motion'
          ? [
              { ch: [[2, 'm7', [0, 3, 7, 10]], [7, '7', [0, 4, 7, 10]], [0, 'maj7', [0, 4, 7, 11]]], en: 'ii–V–I', he: 'ii–V–I' },
              { ch: [[5, 'm7', [0, 3, 7, 10]], [10, '7', [0, 4, 7, 10]], [0, 'maj7', [0, 4, 7, 11]]], en: 'backdoor', he: 'דלת אחורית' },
              { ch: [[2, 'm7', [0, 3, 7, 10]], [1, '7', [0, 4, 7, 10]], [0, 'maj7', [0, 4, 7, 11]]], en: 'tritone sub', he: 'תחליף טריטון' },
            ]
          : [
              { ch: [[0, 'maj7', [0, 4, 7, 11]], [9, '7', [0, 4, 7, 10]], [2, 'm7', [0, 3, 7, 10]], [7, '7', [0, 4, 7, 10]]], en: 'I–VI7–ii–V', he: 'I–VI7–ii–V' },
              { ch: [[0, 'maj7', [0, 4, 7, 11]], [1, 'dim7', [0, 3, 6, 9]], [2, 'm7', [0, 3, 7, 10]], [7, '7', [0, 4, 7, 10]]], en: 'I–♯I°–ii–V', he: 'I–♯I°–ii–V' },
              { ch: [[5, 'maj7', [0, 4, 7, 11]], [6, 'dim7', [0, 3, 6, 9]], [0, '/5', [7, 12, 16, 19]], [7, '7', [0, 4, 7, 10]]], en: 'IV–♯IV°–I/5–V', he: 'IV–♯IV°–I/5–V' },
              { ch: [[0, 'maj7', [0, 4, 7, 11]], [2, '7', [0, 4, 7, 10]], [7, '7', [0, 4, 7, 10]], [0, 'maj7', [0, 4, 7, 11]]], en: 'I–II7–V–I', he: 'I–II7–V–I' },
            ];
      const chart: string[] = [];
      for (let r = 0; r < (s.kind === 'motion' ? 3 : 2); r++) {
        const pick = POOL[(Math.floor(rnd() * POOL.length) + r) % POOL.length];
        const n = pick.ch.length;
        const b0 = r * n * 8;
        pick.ch.forEach(([d, , iv], i) => {
          const bassPc = iv[0] === 7 ? key + 7 : key + d;
          const piano = iv.map((x) => 48 + mod(key + d, 12) + (x % 12)).map((m) => (m > 71 ? m - 12 : m)).sort((a, b) => a - b);
          notes.push({ beat: b0 + i * 4, dur: 3.8, midi: piano, inst: 'piano' }, { beat: b0 + i * 4, dur: 0.2, midi: [42], perc: 'hat' }, { beat: b0 + i * 4 + 2, dur: 0.2, midi: [42], perc: 'hat' });
          line.push({ b: b0 + n * 4 + i * 4, d: 4, p: rootOf(tu, bassPc), ct: true });
        });
        band(b0, b0 + n * 4);
        chart.push(...pick.ch.map(([d, q]) => (q === '/5' ? `${spell(key + d, key)}/${spell(key + 7, key)}` : `${spell(key + d, key)}${q === 'dim7' ? '°7' : q}`)));
      }
      return finishEar(s, tu, line, notes, windows, s.kind, s.kind === 'motion' ? { en: 'Cadences by ear: ii–V, backdoor, tritone sub', he: 'קדנצות בשמיעה: ii–V, דלת אחורית, תחליף טריטון' } : { en: 'Secondary dominants and passing diminished by ear', he: 'דומיננטות משניות ומוקטן עובר בשמיעה' });
    }
    case 'where':
    case 'dropin':
    case 'bridge': {
      // E3: where am I in the form? The band walks and comps part of a form; the player goes on with the next section's
      // roots (in half notes: on each downbeat and on 3). where: blues bars 1–8 → play 9–12 (op 0) / A A of a 4-bar AABA → play B;
      // dropin: the band starts at a random bar of the blues for 4 bars → play the next 4; bridge: a whole 16-bar AABA →
      // play the bridge.
      const blues: Prog = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((d): [number, Q] => [d, '7']);
      const A: Prog = [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']];
      const B: Prog = [[4, '7'], [9, '7'], [2, '7'], [7, '7']];
      const play = (prog: Prog, b0: number, seed: string) => {
        const text = textOf(key, prog);
        const p = parseChart(text);
        for (const h of comping(p, 4, prog.length * 4, 'swing', hashOf(`${seed}:c`))) notes.push({ beat: b0 + h.beat, dur: h.len, midi: h.notes, inst: 'piano' });
        for (const w of walkingBass(p, 4, prog.length * 4, hashOf(seed)).filter((x) => !x.ghost && Number.isInteger(x.beat))) notes.push({ beat: b0 + w.beat, dur: 0.9, midi: [lowPlay(w.midi)], inst: 'bass' });
        band(b0, b0 + prog.length * 4);
      };
      const answer = (prog: Prog, b0: number) => prog.forEach((c, i) => line.push({ b: b0 + i * 4, d: 2, p: rootOf(tu, key + c[0]), ct: true }, { b: b0 + i * 4 + 2, d: 2, p: rootOf(tu, key + c[0]), ct: true }));
      let chart: Prog;
      if (s.kind === 'where') {
        const heard = op % 2 ? [...A, ...A] : blues.slice(0, 8);
        const next = op % 2 ? B : blues.slice(8);
        play(heard, 0, `b-ear:where:${key}:${op}`);
        answer(next, heard.length * 4);
        chart = [...heard, ...next];
      } else if (s.kind === 'dropin') {
        chart = [];
        for (let r = 0; r < 2; r++) {
          const k = (Math.floor(rnd() * 3) * 4 + r * 4) % 12;
          const heard = [0, 1, 2, 3].map((i) => blues[(k + i) % 12]);
          const next = [4, 5, 6, 7].map((i) => blues[(k + i) % 12]);
          play(heard, r * 32, `b-ear:drop:${key}:${op}:${r}`);
          answer(next, r * 32 + 16);
          chart.push(...heard, ...next);
        }
      } else {
        const form = [...A, ...A, ...B, ...A];
        play(form, 0, `b-ear:bridge:${key}:${op}`);
        answer(B, 64);
        chart = [...form, ...B];
      }
      const NM: Record<string, T2l> = {
        where: op % 2 ? tt('Where am I? Play the bridge after A A', 'איפה אני? לנגן את הגשר אחרי A A') : tt('Where am I? Play the last 4 bars of the blues', 'איפה אני? לנגן את 4 התיבות האחרונות של הבלוז'),
        dropin: tt('Drop in: the band starts anywhere — go on', 'כניסה באמצע: הלהקה מתחילה איפשהו — להמשיך'),
        bridge: tt('Hear a chorus, then play the bridge', 'לשמוע סבב, ואז לנגן את הגשר'),
      };
      return finishEar(s, tu, line, notes, windows, s.kind, NM[s.kind], chartOf(key, chart));
    }
    case 'transcribe-long': {
      // E4: longer play-back. op 0: 4 bars of walking (and write it); op 1: 8 bars; op 2: a 2-bar bebop phrase in 8ths.
      if (op === 2) {
        // A Barry Harris line down the dominant (V7, from a chord tone the seed picks), resolving to the tonic's 3rd.
        const prog: Prog = [[7, '7'], [0, 'maj7']];
        const V = rootOf(tu, key + 7);
        const deg = [1, 3, 5, 7][Math.floor(rnd() * 4)];
        const run = barryLine(deg, 'one').slice(0, 15);
        const ARP = [0, 4, 7, 10];
        while (run.length < 15) run.push(ARP[(run.length + 1) % 4] + (run.length > 12 ? 12 : 0));
        const T3 = V + run[run.length - 1] + 9 - 12 * Math.round((V + run[run.length - 1] + 9 - (rootOf(tu, key) + 16)) / 12);
        const ivs = [...run.map((x) => V + x), T3];
        ivs.forEach((m, i) => {
          notes.push({ beat: i / 2, dur: 0.45, midi: [m], inst: 'bass' });
          line.push({ b: 8 + i / 2, d: 0.5, p: m });
        });
        for (const h of comping(parseChart(textOf(key, prog)), 4, 8, 'swing', hashOf(`b-ear:bop:${key}`))) notes.push({ beat: h.beat, dur: h.len, midi: h.notes, inst: 'piano' });
        band(0, 8);
        return finishEar(s, tu, line, notes, windows, 'transcribe', { en: 'Play back a 2-bar bebop phrase', he: 'לנגן בחזרה משפט ביבופ של 2 תיבות' }, chartOf(key, prog));
      }
      const bars = op === 1 ? 8 : 4;
      const prog: Prog = (op === 1 ? [...PROGS.jazz, ...PROGS.iivi] : PROGS.iivi).slice(0, bars);
      const text = textOf(key, prog);
      const p = parseChart(text);
      const walk = walkingBass(p, 4, bars * 4, hashOf(`b-ear:trl:${key}:${op}`)).filter((x) => !x.ghost && Number.isInteger(x.beat));
      for (const h of comping(p, 4, bars * 4, 'swing', hashOf(`b-ear:trlc:${key}:${op}`))) notes.push({ beat: h.beat, dur: h.len, midi: h.notes, inst: 'piano' });
      for (const w of walk) {
        const m = lowPlay(w.midi);
        notes.push({ beat: w.beat, dur: 0.9, midi: [m], inst: 'bass' });
        line.push({ b: bars * 4 + w.beat, d: 1, p: m });
      }
      band(0, bars * 4);
      const d = finishEar(s, tu, line, notes, windows, 'transcribe', bars === 4 ? { en: 'Play back 4 bars of walking', he: 'לנגן בחזרה 4 תיבות של ווקינג' } : { en: 'Play back 8 bars of walking', he: 'לנגן בחזרה 8 תיבות של ווקינג' }, chartOf(key, prog));
      return bars === 4 ? { ...d, write: { pitches: line.map((x) => x.p) } } : d;
    }
    case 'riff-ear': {
      // E4 (odd meters / Latin): hear a 2-bar riff and play it back — op 0 a 7/8 riff (2+2+3), op 1 a tumbao.
      const R = rootOf(tu, key);
      if (op === 0) {
        const RIFFS = [[0, 0, 12, 0, 10, 0, 7], [0, 12, 0, 10, 0, 7, 5], [0, 0, 7, 0, 10, 12, 10], [0, 3, 0, 5, 0, 7, 10]];
        const RIFF = RIFFS[Math.floor(rnd() * RIFFS.length)];
        for (let r = 0; r < 2; r++)
          for (let bar = 0; bar < 2; bar++)
            RIFF.forEach((x, i) => {
              const at = r * 28 + bar * 7 + i;
              const m = R + x + (bar === 1 && i === 2 ? -2 : 0);
              notes.push({ beat: at, dur: 0.9, midi: [m], inst: 'bass' });
              line.push({ b: at + 14, d: 1, p: m });
            });
        for (let r = 0; r < 2; r++) band(r * 28, r * 28 + 14);
        const d0 = drillOf(s, tu, alt(line), { en: 'Play back a 7/8 riff', he: 'לנגן בחזרה ריף ב־7/8', meter: 7, pulse: 8, show: 'none', evenness: false, listen: { notes, windows, ask: ASK['riff-ear'] } });
        return withBarPlan(d0, Array.from({ length: 8 }, () => '7/8 2+2+3'));
      }
      const prog: [number, Q][] = [[0, 'm'], [7, '7']];
      for (let r = 0; r < 2; r++)
        prog.forEach((c, bar) => {
          const rr = rootOf(tu, key + c[0]);
          const nx = rootOf(tu, key + prog[(bar + 1) % 2][0]);
          const b0 = r * 16 + bar * 4;
          for (const [b, p] of [[1.5, rr + 7 > 50 ? rr - 5 : rr + 7], [3, nx]] as [number, number][]) {
            notes.push({ beat: b0 + b, dur: b === 3 ? 2.3 : 1.4, midi: [p], inst: 'bass' });
            line.push({ b: b0 + 8 + b, d: b === 3 ? (bar === 1 ? 1 : 2.5) : 1.5, p });
          }
        });
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < 8; k++) notes.push({ beat: r * 16 + k, dur: 0.2, midi: [42], perc: 'hat' });
        band(r * 16, r * 16 + 8);
      }
      return finishEar(s, tu, line, notes, windows, 'riff-ear', { en: 'Play back a tumbao', he: 'לנגן בחזרה טומבאו' });
    }
    case 'groups-ear': {
      // E5 (meter by ear): the drums play two bars of an odd-meter groove (kick on 1, snare on the other group starts,
      // hats on every 8th); then a root on each group start for two bars. Two rounds, each grouping drawn by the seed:
      // op 0 7/8 (2+2+3, 3+2+2, 2+3+2), op 1 9/8 (2+2+2+3, 3+3+3). The click is off and the count-in ungrouped.
      const num = op % 2 ? 9 : 7;
      const GS = num === 7 ? [[2, 2, 3], [3, 2, 2], [2, 3, 2]] : [[2, 2, 2, 3], [3, 3, 3]];
      const R = rootOf(tu, key);
      const flat = `${num}/8 ${Array.from({ length: num }, () => 1).join('+')}`;
      const plan: string[] = [];
      let last = -1;
      for (let r = 0; r < 2; r++) {
        let gi = Math.floor(rnd() * GS.length);
        if (gi === last) gi = (gi + 1) % GS.length;
        last = gi;
        const g = GS[gi];
        const starts = g.map((_, i) => g.slice(0, i).reduce((a, b) => a + b, 0));
        const b0 = r * 4 * num;
        for (let bar = 0; bar < 2; bar++)
          for (let i = 0; i < num; i++) {
            const at = b0 + bar * num + i;
            notes.push({ beat: at, dur: 0.2, midi: [42], perc: 'hat' });
            if (i === 0) notes.push({ beat: at, dur: 0.3, midi: [36], perc: 'kick' });
            else if (starts.includes(i)) notes.push({ beat: at, dur: 0.3, midi: [38], perc: 'snare' });
          }
        band(b0, b0 + 2 * num);
        for (let bar = 2; bar < 4; bar++) starts.forEach((st, i) => line.push({ b: b0 + bar * num + st, d: g[i], p: R, acc: i === 0 }));
        plan.push(flat, flat, `${num}/8 ${g.join('+')}`, `${num}/8 ${g.join('+')}`);
      }
      const d0 = drillOf(s, tu, alt(line), { en: num === 7 ? 'Hear the grouping of a 7/8 groove' : 'Hear the grouping of a 9/8 groove', he: num === 7 ? 'לשמוע את החלוקה של גרוב ב־7/8' : 'לשמוע את החלוקה של גרוב ב־9/8', meter: num, pulse: 8, show: 'none', evenness: false, click: 'gap', listen: { notes, windows, ask: ASK['groups-ear'] } });
      return { ...withBarPlan(d0, plan), gap: [0, 1] };
    }
    case 'mod-ear': {
      // E5: two bars of quarters (kick and hats), a bar of the pivot rhythm (accented: triplet quarters, op 0, or
      // dotted 8ths, op 1); from the next bar that note value is the beat — play two bars of roots on it, alone.
      const trip = op % 2 === 0;
      const ratio = trip ? MODULATIONS.tripletQuarterToQuarter : MODULATIONS.dottedEighthToQuarter;
      const R = rootOf(tu, key);
      for (let b = 0; b < 8; b++) notes.push({ beat: b, dur: 0.2, midi: [42], perc: 'hat' }, ...(b % 4 === 0 ? [{ beat: b, dur: 0.3, midi: [36], perc: 'kick' as const }] : []));
      const piv = trip ? [0, 2 / 3, 4 / 3, 2, 8 / 3, 10 / 3] : [0, 0.75, 1.5, 2.25, 3, 3.75];
      for (const x of piv) notes.push({ beat: 8 + x, dur: 0.2, midi: [37], perc: 'rim', vel: 0.7 }, { beat: 8 + x, dur: 0.3, midi: [R + 12], inst: 'bass' });
      band(0, 12);
      for (let b = 0; b < 8; b++) line.push({ b: 12 + b, d: 1, p: b % 4 === 0 ? R : trip ? (b % 2 ? R + 7 : R + 12) : b % 2 ? R + 10 : R + 7, acc: b % 4 === 0 });
      const d0 = drillOf(s, tu, alt(line), { en: trip ? 'Metric modulation by ear: the triplet quarter becomes the beat' : 'Metric modulation by ear: the dotted 8th becomes the beat', he: trip ? 'מודולציה מטרית בשמיעה: רבע הטריולה נעשה הפעמה' : 'מודולציה מטרית בשמיעה: השמינית המנוקדת נעשית הפעמה', show: 'none', evenness: false, click: 'gap', listen: { notes, windows, ask: ASK['mod-ear'] } });
      return { ...withBarPlan(d0, [['4/4', 5]], [{ bar: 3, ratio }]), gap: [0, 1] };
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
      const chart = pr.map(([d, q, b]) => (mod(b - d, 12) === 0 ? `${spell(key + d, key)}${q === 'm' ? 'm' : ''}` : `${spell(key + d, key)}${q === 'm' ? 'm' : ''}/${spell(key + b, key)}`));
      return finishEar(s, tu, line, notes, windows, 'slash', { en: 'Slash bass by ear', he: 'בס סלאש בשמיעה' }, chart);
    }
  }
  throw new Error(`Unknown b-ear kind ${s.kind}`);
}

/** A written transcription graded note for note: the same sounding pitch in the same slot (any string / fret). */
export interface WrittenGrade {
  ok: number;
  total: number;
  marks: boolean[];
}
export function gradeWritten(want: number[], got: number[]): WrittenGrade {
  const marks = want.map((p, i) => got[i] === p);
  return { ok: marks.filter(Boolean).length, total: want.length, marks };
}

/**
 * The take's verdict with the written part (ear L7): the played answer AND the written one must be right. A wrong
 * written note keeps a clean take from counting (it becomes "almost", with the slot named); it never raises a verdict.
 */
export function withWritten(m: TakeMetrics, g: WrittenGrade): TakeMetrics {
  const written = { ok: g.ok, total: g.total };
  if (g.ok === g.total) return { ...m, written };
  const first = g.marks.findIndex((x) => !x);
  const why = { en: `Written: ${g.ok}/${g.total} notes right — note ${first + 1} is off.`, he: `בכתב: ${g.ok}/${g.total} תווים נכונים — תו ${first + 1} לא נכון.` };
  return { ...m, written, verdict: m.verdict === 'clean' ? 'almost' : m.verdict, why: m.verdict === 'clean' ? why : { en: `${m.why.en} ${why.en}`, he: `${m.why.he} ${why.he}` } };
}

function finishEar(s: DrillSpec, tu: Tuning, line: BN[], notes: LN[], windows: [number, number][], ask: string, name: { en: string; he: string }, chart?: string[]): Drill {
  return drillOf(s, tu, alt(line), { ...name, chart: chart?.length ? chart : undefined, show: 'none', evenness: false, listen: { notes, windows, ask: ASK[ask] } });
}
