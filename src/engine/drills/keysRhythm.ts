// Rhythm & meter on the keys: the `k-rhythm` family (docs/AUDIT-CONTENT-THEORY.md §ז.2 R-1, R-2, R-5; §ד.3 — the keys
// path had only 3:2 and 4:3, inside the classical "advanced" family). One continuous ladder from subdivision to
// cross-rhythm, for either emphasis:
//
//   1 hands in time: 8ths, triplets, 16ths over the beat        5 displacement: the figure moved by an 8th / a quarter
//   2 3:2 and 4:3 between the hands (per beat)                  6 5:4, 5:3 and 7:4 between the hands (over the bar)
//   3 hemiola: the waltz bass with the right hand in twos;      7 metric modulation: the pivot value becomes the new
//     3+3+2 over 4/4                                              beat (the tempo map; the click follows)
//   4 odd meters: 5/4 (3+2), 7/8 (2+2+3, 3+2+2)
//
// Our own exercises, seeded per key and option; every take is measured (MIDI / mic) like every piano drill. Rhythm
// drills keep the click: the ladder starts slow. Pure and deterministic.

import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { MODULATIONS, withBarPlan } from './timeline';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJ = [0, 2, 4, 5, 7, 9, 11];

/** RH tonic between G3 and F♯4; LH an octave and a half lower. */
const rh = (key: number): number => (mod(key, 12) <= 6 ? 60 + mod(key, 12) : 48 + mod(key, 12));
const deg = (tonic: number, k: number): number => tonic + 12 * Math.floor(k / 7) + MAJ[mod(k, 7)];

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, hand: 'R' | 'L', pitches: number[], accent = false): void {
    const id = pitches.length > 1 ? ++this.cid : undefined;
    for (const p of pitches) this.list.push({ pitch: p, beat: r6(beat), dur: r6(dur), hand, ...(id !== undefined ? { chordId: id } : {}), ...(accent ? { accent: true } : {}) });
  }
}

function done(s: DrillSpec, n: Notes, title: T2, startBpm: number, goal: Partial<DrillGoal> = {}, meter = 4): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return {
    spec: { ...s },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter,
    keySig: SIG[mod(s.key, 12)],
    goal: { evenness: true, hands: true, ...goal },
    startBpm: s.tempo ?? startBpm,
  };
}
const tk = (en: string, he: string, key: number): T2 => t(`${en} · ${NAMES[mod(key, 12)]}`, `${he} · ${NAMES[mod(key, 12)]}`);

/** The tonic triad broken upward in the RH (1 3 5 8 3 5 …). */
const triadTone = (tonic: number, i: number): number => deg(tonic, [0, 2, 4, 7, 2, 4][i % 6]);

export function genKeysRhythm(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const T = rh(key);
  const B = T - 12;
  const n = new Notes();
  switch (s.kind) {
    case 'kr-sub': {
      // LH quarters (root, 5th), RH the triad broken in 2 / 3 / 4 notes a beat; four bars and the closing chord.
      const per = [2, 3, 4][op % 3];
      for (let b = 0; b < 16; b++) {
        n.add(b, 1, 'L', [b % 2 ? B + 7 : B], b % 4 === 0);
        for (let i = 0; i < per; i++) n.add(b + i / per, 1 / per, 'R', [triadTone(T, b * per + i)], i === 0 && b % 4 === 0);
      }
      n.add(16, 2, 'L', [B]);
      n.add(16, 2, 'R', [T, deg(T, 2), deg(T, 4)]);
      const nm = [t('8ths', 'שמיניות'), t('triplets', 'טריולות'), t('16ths', 'שש-עשריות')][op % 3];
      return done(s, n, tk(`Hands in time: LH beats, RH ${nm.en}`, `ידיים בזמן: שמאל על הפעמה, ימין ${nm.he}`, key), [72, 60, 52][op % 3]);
    }
    case 'kr-poly': {
      // Per beat: 3:2 (RH triplets over LH 8ths) or 4:3 (RH 16ths over LH triplets).
      const [r, l] = op % 2 ? [4, 3] : [3, 2];
      for (let b = 0; b < 8; b++) {
        for (let i = 0; i < r; i++) n.add(b + i / r, 1 / r, 'R', [triadTone(T, b * r + i)], i === 0);
        for (let i = 0; i < l; i++) n.add(b + i / l, 1 / l, 'L', [i % 2 ? B + 7 : B], i === 0);
      }
      n.add(8, 2, 'R', [T]);
      n.add(8, 2, 'L', [B]);
      return done(s, n, tk(`${r} against ${l} between the hands`, `${r} נגד ${l} בין הידיים`, key), 48);
    }
    case 'kr-hemi': {
      if (op % 2 === 0) {
        // 3/4: LH waltz (bass, chord, chord); RH half-note chords across two bars — 1, 3, 2 (the hemiola), 8 bars.
        const I = [T, deg(T, 2), deg(T, 4)];
        const V = [deg(T, -1), deg(T, 1), deg(T, 4)];
        for (let bar = 0; bar < 8; bar++) {
          const b0 = bar * 3;
          const dom = bar % 4 >= 2;
          // Bass, then the chord above it — under the RH's register (the hands never share a key).
          n.add(b0, 1, 'L', [dom ? B - 5 : B], true);
          n.add(b0 + 1, 1, 'L', dom ? [B - 1, B + 2] : [B + 4, B + 7]);
          n.add(b0 + 2, 1, 'L', dom ? [B - 1, B + 2] : [B + 4, B + 7]);
        }
        for (let pair = 0; pair < 4; pair++) for (let k = 0; k < 3; k++) n.add(pair * 6 + k * 2, 2, 'R', pair % 2 ? V : I, k === 0);
        n.add(24, 3, 'L', [B]);
        n.add(24, 3, 'R', I);
        return withBarPlan(done(s, n, tk('Hemiola: waltz bass, the right hand in twos', 'המיולה: בס ואלס, יד ימין בשתיים', key), 88, {}, 3), [['3/4', 9]]);
      }
      // 3+3+2 over 4/4: LH quarters, RH chord stabs on 1, the "and" of 2, 4 | the "and" of 1, 3, 4.
      const I = [T, deg(T, 2), deg(T, 4)];
      const IV = [deg(T, 0), deg(T, 3), deg(T, 5)];
      const HITS = [0, 1.5, 3, 4.5, 6, 7];
      for (let rep = 0; rep < 2; rep++) {
        const c = rep ? IV : I;
        for (let b = 0; b < 8; b++) n.add(rep * 8 + b, 1, 'L', [rep ? B + 5 : B], b % 4 === 0);
        HITS.forEach((h, k) => n.add(rep * 8 + h, k === 5 ? 1 : k === 2 ? 1.5 : HITS[k + 1] - h, 'R', c, true));
      }
      n.add(16, 2, 'L', [B]);
      n.add(16, 2, 'R', I);
      return done(s, n, tk('3+3+2 over 4/4: the right hand across the bar line', '3+3+2 מעל 4/4: יד ימין מעבר לקו התיבה', key), 80);
    }
    case 'kr-odd': {
      if (op % 3 === 0) {
        // 5/4 as 3+2: the LH on the group starts (1 and 4), RH chord stabs on 2, 3 and 5 (a vamp in the Take Five shape).
        const i7 = [deg(T, 2), deg(T, 4), deg(T, 6)];
        for (let bar = 0; bar < 4; bar++) {
          const b0 = bar * 5;
          n.add(b0, 1, 'L', [B], true);
          n.add(b0 + 3, 1, 'L', [B + 7], true);
          for (const x of [1, 2, 4]) n.add(b0 + x, x === 2 ? 1 : 0.5, 'R', i7);
        }
        n.add(20, 2, 'L', [B]);
        n.add(20, 2, 'R', i7);
        return withBarPlan(done(s, n, tk('5/4 as 3+2: bass on the groups, chords between', '5/4 כ-3+2: בס על הקבוצות, אקורדים ביניהן', key), 100, {}, 5), [['5/4 3+2', 5]]);
      }
      // 7/8 (pulse 8, one drill beat = an eighth): the LH on each group start, RH chords on the other eighths.
      const groups = op % 3 === 1 ? [2, 2, 3] : [3, 2, 2];
      const starts = groups.map((_, i) => groups.slice(0, i).reduce((x, y) => x + y, 0));
      const tri = [T, deg(T, 2), deg(T, 4)];
      for (let bar = 0; bar < 4; bar++) {
        const b0 = bar * 7;
        for (let e = 0; e < 7; e++) {
          if (starts.includes(e)) n.add(b0 + e, 1, 'L', [e === 0 ? B : B + 7], true);
          else n.add(b0 + e, 1, 'R', tri);
        }
      }
      n.add(28, 2, 'L', [B]);
      n.add(28, 2, 'R', tri);
      const g = groups.join('+');
      const d = done(s, n, tk(`7/8 as ${g}: bass on the groups, chords between`, `7/8 כ-${g}: בס על הקבוצות, אקורדים ביניהן`, key), 160, {}, 7);
      return withBarPlan({ ...d, pulse: 8 as const }, [[`7/8 ${g}`, 5]]);
    }
    case 'kr-displace': {
      // A one-bar RH figure (stabs on 1, the "and" of 2, 4), twice in place, then moved later by an 8th (op 0) or a
      // quarter (op 1); the LH keeps the quarters, so the shift is heard against the beat.
      const shift = op % 2 ? 1 : 0.5;
      const FIG = [0, 1.5, 3];
      const c = [deg(T, 2), deg(T, 4), deg(T, 7)];
      for (let b = 0; b < 16; b++) n.add(b, 1, 'L', [b % 2 ? B + 7 : B], b % 4 === 0);
      for (let bar = 0; bar < 4; bar++) for (const f of FIG) n.add(bar * 4 + f + (bar >= 2 ? shift : 0), 0.5, 'R', c, true);
      n.add(16, 2, 'L', [B]);
      n.add(16, 2, 'R', [T, deg(T, 2), deg(T, 4)]);
      const nm = op % 2 ? t('a quarter', 'ברבע') : t('an 8th', 'בשמינית');
      return done(s, n, tk(`Displacement: the figure moved by ${nm.en}`, `הזזה: הדמות זזה ${nm.he}`, key), 76);
    }
    case 'kr-cross': {
      // Over the whole bar: the LH on the beat, the RH n even notes per bar (5:4, 5:3 in 3/4, 7:4); 3 bars + the chord.
      const C = [
        { r: 5, over: 4 },
        { r: 5, over: 3 },
        { r: 7, over: 4 },
      ][op % 3];
      for (let bar = 0; bar < 3; bar++) {
        const b0 = bar * C.over;
        for (let k = 0; k < C.over; k++) n.add(b0 + k, 1, 'L', [k % 2 ? B + 7 : B], k === 0);
        for (let i = 0; i < C.r; i++) n.add(b0 + (i * C.over) / C.r, C.over / C.r, 'R', [triadTone(T, bar * C.r + i)], i === 0);
      }
      n.add(3 * C.over, 2, 'L', [B]);
      n.add(3 * C.over, 2, 'R', [T]);
      const d = done(s, n, tk(`${C.r} against ${C.over} over the bar`, `${C.r} נגד ${C.over} על פני התיבה`, key), 44, {}, C.over);
      return C.over === 3 ? withBarPlan(d, [['3/4', 4]]) : d;
    }
    case 'kr-mod': {
      // Metric modulation: two bars, then the pivot value becomes the new quarter (the tempo map; the click follows).
      // 0 triplet quarter → quarter (× 3/2), 1 dotted 8th → quarter (× 4/3), 2 quarter → triplet quarter (× 2/3).
      const [a, b, ratio] = op % 3 === 1 ? [0.75, 1, MODULATIONS.dottedEighthToQuarter] : op % 3 === 2 ? [1, 2 / 3, MODULATIONS.quarterToTripletQuarter] : [2 / 3, 1, MODULATIONS.tripletQuarterToQuarter];
      let i = 0;
      for (let x = 0; x < 8 - 1e-9; x += a) n.add(x, a, 'R', [deg(T, [0, 1, 2, 3, 4, 3, 2, 1][i++ % 8])], Math.abs(x) < 1e-9);
      for (let x = 8; x < 16 - 1e-9; x += b) n.add(x, b, 'R', [deg(T, [4, 5, 4, 3, 2, 3, 2, 1][i++ % 8])], Math.abs(x - 8) < 1e-9);
      for (const bar of [0, 1, 2, 3]) n.add(bar * 4, 4, 'L', [bar % 2 ? B + 7 : B]);
      n.add(16, 2, 'R', [T]);
      n.add(16, 2, 'L', [B]);
      const nm = op % 3 === 1 ? t('the dotted 8th becomes the new beat', 'השמינית המנוקדת הופכת לפעמה החדשה') : op % 3 === 2 ? t('the beat becomes the new triplet quarter', 'הפעמה הופכת לרבע הטריולה החדש') : t('the triplet quarter becomes the new beat', 'רבע הטריולה הופך לפעמה החדשה');
      const d = done(s, n, tk(`Metric modulation: ${nm.en}`, `מודולציה מטרית: ${nm.he}`, key), 72, { prog: { tempoRatio: { tol: 0.03, landMs: 40 } } });
      return withBarPlan(d, [['4/4', 5]], [{ bar: 2, ratio }]);
    }
  }
  throw new Error(`Unknown k-rhythm kind ${s.kind}`);
}

/** The k-rhythm family (both emphases): 7 levels, start → target tempo (♩; 7/8 counts eighths) per item. */
export function keysRhythmFamily(): FamilyDef {
  const fam: FamilyId = 'k-rhythm';
  const K = (kind: string, option: number, tempo: number): SpecTemplate => ({ family: fam, kind, hands: 'RL', option, tempo });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: number[], tempo: [number, number]): LevelDef => ({ id: `k-rhythm-${level}`, level, title: t(en, he), specs, keys, tempo });
  return {
    id: fam,
    title: t('Rhythm & meter', 'קצב ומשקל'),
    style: 'both',
    levels: [
      L(1, 'Hands in time: 8ths, triplets, 16ths over the beat', 'ידיים בזמן: שמיניות, טריולות ושש-עשריות מעל הפעמה', [K('kr-sub', 0, 66), K('kr-sub', 1, 56), K('kr-sub', 2, 50)], [0, 7, 5], [50, 90]),
      L(2, '3 against 2 and 4 against 3', '3 נגד 2 ו-4 נגד 3', [K('kr-poly', 0, 44), K('kr-poly', 1, 40)], [0, 7, 5], [40, 72]),
      L(3, 'Hemiola: the waltz in twos, 3+3+2 over 4/4', 'המיולה: ואלס בשתיים, 3+3+2 מעל 4/4', [K('kr-hemi', 0, 80), K('kr-hemi', 1, 66)], [0, 7, 5, 2], [66, 120]),
      L(4, 'Odd meters: 5/4 (3+2) and 7/8', 'משקלים אי-זוגיים: 5/4 (3+2) ו-7/8', [K('kr-odd', 0, 90), K('kr-odd', 1, 150), K('kr-odd', 2, 150)], [2, 7, 0, 9], [90, 160]),
      L(5, 'Displacement: the figure moves by an 8th, by a quarter', 'הזזה: הדמות זזה בשמינית, ברבע', [K('kr-displace', 0, 70), K('kr-displace', 1, 70)], [0, 5, 7, 10], [70, 116]),
      L(6, '5:4, 5:3 and 7:4 between the hands', '5:4, 5:3 ו-7:4 בין הידיים', [K('kr-cross', 0, 40), K('kr-cross', 1, 44), K('kr-cross', 2, 40)], [0, 7, 5], [40, 72]),
      L(7, 'Metric modulation', 'מודולציה מטרית', [K('kr-mod', 0, 66), K('kr-mod', 1, 66), K('kr-mod', 2, 80)], [0, 5, 7, 2], [66, 100]),
    ],
  };
}
