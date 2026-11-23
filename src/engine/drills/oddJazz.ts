// The Mediterranean touch inside jazz (docs/SPEC-JAZZ-NEIGHBOURS.md §6): odd meters as jazz uses them — 7/8 as 2+2+3
// and 9/8 as 2+2+2+3, with a bar of 3+3+3 closing a four-bar 9/8 cycle — comped over a ii–V–I on the piano. No StyleId
// of its own: the levels are tagged jazz (the touch lives inside jazz; the hijaz colour is already a rotation option on
// V7 → minor). Written from docs/research/STYLE-MEDITERRANEAN-TOUCH.md:
//   - the groupings: 7/8 = 2+2+3 [V] (most sources agree); 9/8 = 2+2+2+3, and 3+3+3 as the 4th bar of the cycle [V]
//     (Wikipedia, as a grouping; no piece is named or reproduced);
//   - 7/8 and 9/8 felt in straight 8ths; comping marks the group starts; the harmonic rhythm follows the groups (a
//     change on a group boundary) [C] (standard odd-meter pedagogy, §1.1, §1.3 steps 5–7);
//   - the practice order: shells on every group start, then only the first and last group, then the next bar's 1
//     anticipated by an 8th [C] (§1.3 step 5).
// The harmony is the app's own generic ii–V–I; shells are 3 and 7 in the right hand over the root in the left. All 12
// keys, free time first, then the tempo ladder (♪ = the beat), the count-in grouped. Pure and deterministic.

import type { Drill, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { itemIdOf } from './generate';
import { all12 } from './keys12';
import { guideTones, voiceLead } from '../band';
import { withBarPlan } from './timeline';
import { noteNameIn } from '../stdKey';
import type { ChartChordEv } from '../charts';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m = 12): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
/** A pitch class named for the drill's key (♯ in the sharp keys, ♭ in the flat ones). */
const nameIn = (p: number, key: number): string => noteNameIn(p, { key: ((key % 12) + 12) % 12 });
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEYS = all12([0, 5, 7]);

/** ii–V–I–I: [root above the key, intervals, suffix]. */
const PROG: [number, number[], string][] = [[2, [0, 3, 7, 10], 'm7'], [7, [0, 4, 7, 10], '7'], [0, [0, 4, 7, 11], 'maj7'], [0, [0, 4, 7, 11], 'maj7']];
const evOf = (key: number, [r, iv, suf]: [number, number[], string]): ChartChordEv => ({ root: mod(key + r), iv, bass: mod(key + r), sym: nameIn(mod(key + r), key) + suf, beats: 1, bar: 0, at: 0 });

function genOdd(s: DrillSpec): Drill {
  const key = mod(s.key);
  const op = s.option ?? 0;
  const nine = s.kind === 'od-cycle' || op === 1;
  const G7 = [2, 2, 3];
  const G9 = [2, 2, 2, 3];
  const G333 = [3, 3, 3];
  const bars = 8;
  // the groups of each bar: the cycle closes every 4th bar with 3+3+3
  const groupsOf = (bar: number): number[] => (s.kind === 'od-cycle' ? (bar % 4 === 3 ? G333 : G9) : nine ? G9 : G7);
  const notes: ExpNote[] = [];
  let cid = 0;
  const add = (beat: number, dur: number, ps: number[], hand: 'R' | 'L') => {
    const id = ps.length > 1 ? ++cid : undefined;
    for (const p of ps) notes.push({ pitch: p, beat: r6(beat), dur: r6(dur), hand, ...(id ? { chordId: id } : {}) });
  };
  const chart: string[] = [];
  let prev: number[] | null = null;
  const voice = (c: ChartChordEv) => {
    const v = voiceLead(guideTones(c), prev);
    prev = v;
    return v;
  };
  const lh = (c: ChartChordEv) => 40 + mod(c.root - 40);
  let at = 0;
  for (let bar = 0; bar < bars; bar++) {
    const gs = groupsOf(bar);
    const len = gs.reduce((a, b) => a + b, 0);
    const starts = gs.map((_, i) => gs.slice(0, i).reduce((a, b) => a + b, 0));
    const c = evOf(key, PROG[bar % 4]);
    if (s.kind === 'od-split') {
      // two chords a bar on a group boundary: ii on the first groups, V on the rest (the I bars: the tonic held)
      const cut = 4; // after 2+2 in both meters
      const tonic = bar % 2 === 1;
      const a = tonic ? evOf(key, PROG[2]) : evOf(key, PROG[0]);
      const b = tonic ? a : evOf(key, PROG[1]);
      add(at, cut, voice(a), 'R');
      add(at, cut, [lh(a)], 'L');
      add(at + cut, len - cut, voice(b), 'R');
      if (b !== a) add(at + cut, len - cut, [lh(b)], 'L');
      chart.push(b !== a ? `${a.sym} ${b.sym}` : a.sym);
    } else {
      const v = voice(c);
      add(at, starts[1] ?? len, [lh(c)], 'L');
      if (gs.length > 1) add(at + (starts[1] ?? len), len - (starts[1] ?? len), [lh(c) + 7 > 52 ? lh(c) - 5 : lh(c) + 7], 'L');
      if (s.kind === 'od-shell') starts.forEach((st, i) => add(at + st, gs[i], v, 'R'));
      else if (s.kind === 'od-ends') {
        add(at, gs[0], v, 'R');
        add(at + starts[starts.length - 1], gs[gs.length - 1], v, 'R');
      } else {
        // od-ant: the first and the last group, the next bar's chord an 8th before its 1 (the last 8th of the bar) —
        // so after the first bar the 1 is not struck again
        const last = starts[starts.length - 1];
        if (bar === 0) add(at, gs[0], v, 'R');
        add(at + last, len - 1 - last, v, 'R');
        add(at + len - 1, 1, voice(bar < bars - 1 ? evOf(key, PROG[(bar + 1) % 4]) : evOf(key, PROG[2])), 'R');
      }
      chart.push(c.sym);
    }
    at += len;
  }
  // the closing tonic, one group
  const tonic = evOf(key, PROG[2]);
  if (s.kind !== 'od-ant') add(at, 3, voice(tonic), 'R');
  add(at, 3, [lh(tonic)], 'L');
  chart.push(tonic.sym);
  const out = notes;
  out.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const meterTxt = s.kind === 'od-cycle' ? '9/8 2+2+2+3 · 3+3+3' : nine ? '9/8 2+2+2+3' : '7/8 2+2+3';
  const T: Record<string, [string, string]> = {
    'od-shell': [`${meterTxt}: shells on every group`, `${meterTxt}: שלדים על כל קבוצה`],
    'od-ends': [`${meterTxt}: the first and the last group`, `${meterTxt}: הקבוצה הראשונה והאחרונה`],
    'od-ant': [`${meterTxt}: the next chord an 8th early`, `${meterTxt}: האקורד הבא שמינית מוקדם`],
    'od-split': [`${meterTxt}: the change on a group boundary`, `${meterTxt}: החילוף על גבול של קבוצה`],
    'od-cycle': ['9/8: three bars of 2+2+2+3, one of 3+3+3', '9/8: שלוש תיבות 2+2+2+3, אחת 3+3+3'],
  };
  const [en, he] = T[s.kind];
  const d: Drill = {
    spec: { ...s, hands: 'RL' },
    itemId: itemIdOf(s),
    title: t(`${en} · ${nameIn(key, key)}`, `${he} · ${nameIn(key, key)}`),
    notes: out,
    beats: r6(Math.max(...out.map((x) => x.beat + x.dur))),
    meter: nine || s.kind === 'od-cycle' ? 9 : 7,
    keySig: SIG[key],
    // hands together graded only where the hands meet often enough to measure it (the anticipated comp meets the bass
    // on the 1 of the first bar only)
    goal: { evenness: false, hands: s.kind !== 'od-ant' },
    startBpm: s.tempo ?? 150,
    chart,
    pulse: 8,
  };
  const plan: [string, number][] = s.kind === 'od-cycle' ? [['9/8 2+2+2+3', 3], ['9/8 3+3+3', 1], ['9/8 2+2+2+3', 3], ['9/8 3+3+3', 1], ['3/8', 1]] : [[nine ? '9/8 2+2+2+3' : '7/8 2+2+3', bars], ['3/8', 1]];
  return withBarPlan(d, plan);
}

/** The piano entry (generate.ts): k-odd. */
export function genOddJazz(s: DrillSpec): Drill {
  return genOdd(s);
}

export function keysOddFamily(): FamilyDef {
  const fam: FamilyId = 'k-odd';
  const sp = (kind: string, option = 0): SpecTemplate => ({ family: fam, kind, hands: 'RL', option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number]): LevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: KEYS, tempo, style: 'jazz' });
  return {
    id: fam,
    title: t('Odd meters in jazz: 7/8 and 9/8', 'משקלים אי־זוגיים בג׳אז: 7/8 ו־9/8'),
    style: 'both',
    styleId: 'jazz',
    levels: [
      L(1, '7/8 (2+2+3): shells on every group', '7/8 (2+2+3): שלדים על כל קבוצה', [sp('od-shell', 0)], [120, 220]),
      L(2, '7/8: the first and the last group', '7/8: הקבוצה הראשונה והאחרונה', [sp('od-ends', 0)], [130, 230]),
      L(3, '9/8 (2+2+2+3): shells on every group', '9/8 (2+2+2+3): שלדים על כל קבוצה', [sp('od-shell', 1)], [130, 240]),
      L(4, '9/8: the first and the last group', '9/8: הקבוצה הראשונה והאחרונה', [sp('od-ends', 1)], [140, 250]),
      L(5, 'The change on a group boundary, 7/8 and 9/8', 'החילוף על גבול של קבוצה, 7/8 ו־9/8', [sp('od-split', 0), sp('od-split', 1)], [140, 240]),
      L(6, 'The next chord an 8th early, 7/8 and 9/8', 'האקורד הבא שמינית מוקדם, 7/8 ו־9/8', [sp('od-ant', 0), sp('od-ant', 1)], [150, 250]),
      L(7, 'The 9/8 cycle: 2+2+2+3 three times, then 3+3+3', 'מחזור ה־9/8: 2+2+2+3 שלוש פעמים, ואז 3+3+3', [sp('od-cycle', 0)], [150, 260]),
    ],
  };
}

export const ODD_LEVEL_DIFF: Record<string, number> = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`k-odd-${i + 1}`, 1150 + 60 * i]));
