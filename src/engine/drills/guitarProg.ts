// The prog / fusion guitar family `g-prog` (GUITAR_DEEPENING §4.3, the prog add-on), built on the shared prog engine
// (docs/research/PROG_ENGINE.md): odd-meter riffs (pulse 8 + groups), an odd-meter riff echo by ear, mixed meters bar
// by bar with the band (a road map, so a lost bar is named), polyrhythmic accent cycles over 4/4 (group accents),
// metric modulation (a tempo map, the new tempo's ratio checked), modes in riffs, fusion lines, and unisons with the
// band's bass in an odd meter. All material is generated and seeded per key and option (nothing to memorise).
//
// Pure and deterministic. guitar.ts helpers are used only inside functions (guitar.ts ↔ guitarProg.ts load order).

import type { Drill, DrillSpec, FamilyId } from './types';
import type { SpecTemplate } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import { finish, mod, NAMES, rng, t, windowScale, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef, type T2 } from './guitar';
import { barBeats, groupStartsOf, MODULATIONS, parseMeter, planBars, withBarPlan, type MeterSpec } from './timeline';
import { applyForm, expandForm, type FormSection } from './roadmap';

const PENTA_MINOR = [0, 3, 5, 7, 10];
/** Exotic and modal scales for the riff level (L6), local to this family. */
export const PROG_MODES: { ints: number[]; en: string; he: string }[] = [
  { ints: [0, 2, 4, 6, 7, 9, 11], en: 'Lydian', he: 'לידי' },
  { ints: [0, 1, 3, 5, 7, 8, 10], en: 'Phrygian', he: 'פריגי' },
  { ints: [0, 1, 4, 5, 7, 8, 10], en: 'Phrygian dominant (Hijaz)', he: 'פריגי דומיננטי (חיג׳אז)' },
  { ints: [0, 2, 3, 5, 7, 8, 11], en: 'harmonic minor', he: 'מינור הרמוני' },
  { ints: [0, 2, 3, 6, 7, 8, 11], en: 'Hungarian minor', he: 'מינור הונגרי' },
  { ints: [0, 1, 4, 5, 7, 8, 11], en: 'double harmonic', he: 'הרמוני כפול' },
];
const DIM_HW = [0, 1, 3, 4, 6, 7, 9, 10];
const WHOLE = [0, 2, 4, 6, 8, 10];

/** Odd meters of the riff levels: meter text and the drum groove (grooves.ts) for it. */
const ODD: { meter: string; groove: string }[] = [
  { meter: '7/8 2+2+3', groove: 'seven-8' }, // 0
  { meter: '5/4 3+2', groove: 'five-4' }, // 1
  { meter: '7/8 3+2+2', groove: 'seven-8-322' }, // 2
  { meter: '9/8 2+2+2+3', groove: 'nine-8' }, // 3
  { meter: '11/8 3+3+3+2', groove: 'eleven-8' }, // 4
  { meter: '9/8 3+3+3', groove: 'nine-8-333' }, // 5 (alternates with 3 in the changing-groupings item)
  { meter: '13/8 3+3+3+2+2', groove: 'thirteen-8' }, // 6
];
const sigOf = (m: string): string => m.split(' ')[0];
const grpOf = (m: string): string => m.split(' ')[1] ?? '';

/** The riff's hand position: the root's fret on the low E string (0–11) and the box above it. */
function pos(tu: Tuning, key: number): number {
  return mod(key - tu.open[tu.open.length - 1], 12);
}

/** A power chord with its root on string 6 at fret f (root, 5th, octave). */
const power6 = (f: number): GN[] => [
  { s: 6, f, acc: true },
  { s: 5, f: f + 2, acc: true },
  { s: 4, f: f + 2, acc: true },
];

/** Fret on string 6 of a pitch-class step above the root, kept in 0–12. */
const fretUp = (r6: number, iv: number): number => (r6 + iv <= 12 ? r6 + iv : r6 + iv - 12);

/**
 * One riff bar (pulse 8, one drill beat = an eighth): a power chord on the bar's 1, a low accented note on every other
 * group start, box notes (minor pentatonic in position, strings 6–4) in between.
 */
function riffBar(tu: Tuning, key: number, start: number, beats: number, groups: number[], rnd: () => number, chordIv: number, singleOnly = false): Ev[] {
  const r6 = pos(tu, key);
  const box = windowScale(tu, key, PENTA_MINOR, r6, r6 + 3, [6, 5, 4]);
  const lows = box.filter((x) => x.s >= 5);
  const evs: Ev[] = [];
  let i = Math.floor(rnd() * box.length);
  for (let b = 0; b < beats; b++) {
    const at = start + b;
    if (b === 0) {
      evs.push({ beat: at, dur: 1, notes: singleOnly ? [{ s: 6, f: fretUp(r6, chordIv), acc: true }] : power6(fretUp(r6, chordIv)) });
    } else if (groups.some((g) => Math.abs(g - b) < 1e-9)) {
      const x = lows[Math.floor(rnd() * lows.length)];
      evs.push({ beat: at, dur: 1, notes: [{ ...x, acc: true }] });
    } else {
      i = Math.max(0, Math.min(box.length - 1, i + [-2, -1, 1, 2][Math.floor(rnd() * 4)]));
      evs.push({ beat: at, dur: 1, notes: [{ ...box[i] }] });
    }
  }
  return evs;
}

const CHORD_IVS = [0, 3, 5, 7, 10];
const pickIv = (rnd: () => number, bar: number): number => (bar === 0 ? 0 : CHORD_IVS[Math.floor(rnd() * CHORD_IVS.length)]);

const tt = (en: string, he: string, key: number): T2 => t(`${en} · ${NAMES[key]}`, `${he} · ${NAMES[key]}`);

/** Build a g-prog drill. */
export function generateGuitarProg(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`g-prog:${s.kind}:${key}:${op}`);
  switch (s.kind) {
    case 'odd-riff': {
      // L1 / L2: 4 bars of an odd-meter riff on an eighth pulse, the drums in the meter. Option 7 = changing groupings
      // (9/8 as 2+2+2+3, then 3+3+3, bar by bar).
      const meters = op === 7 ? [ODD[3].meter, ODD[5].meter, ODD[3].meter, ODD[5].meter] : Array.from({ length: 4 }, () => ODD[op].meter);
      const bars = planBars(meters.map(parseMeter), 8);
      const evs = bars.flatMap((b, k) => riffBar(tu, key, b.start, b.beats, b.groups, rnd, pickIv(rnd, k)));
      const m0 = meters[0];
      const title = op === 7 ? tt('Changing groupings: 9/8 as 2+2+2+3 and 3+3+3', 'חלוקות מתחלפות: 9/8 כ-2+2+2+3 ו-3+3+3', key) : tt(`${sigOf(m0)} riff (${grpOf(m0)})`, `ריף ב-${sigOf(m0)} (${grpOf(m0)})`, key);
      const d0 = finish(s, tu, evs, { title, bpm: 180, evenness: false });
      const d = withBarPlan({ ...d0, pulse: 8 as const, beats: bars.reduce((a, b) => a + b.beats, 0) }, meters);
      const groove = op === 7 ? ODD[3].groove : ODD[op].groove;
      return { ...d, drums: { groove, ...(op === 7 ? { sections: [0, 1, 2, 3].map((bar) => ({ bar, groove: bar % 2 ? ODD[5].groove : ODD[3].groove })) } : {}) } };
    }
    case 'odd-echo': {
      // L2: call and response in an odd meter — the app plays a 2-bar riff, the player echoes it in the next 2 bars.
      // Two rounds; single low notes (strings 6–5), the first note given (the root). Onsets in the call bars are ignored.
      const m = parseMeter(op === 1 ? ODD[3].meter : ODD[0].meter);
      const len = barBeats(m, 8);
      const gs = groupStartsOf(m, 8);
      const r6 = pos(tu, key);
      const box = windowScale(tu, key, PENTA_MINOR, r6, r6 + 3, [6, 5]);
      const evs: Ev[] = [];
      const listen: NonNullable<Drill['listen']>['notes'] = [];
      const windows: [number, number][] = [];
      for (let r = 0; r < 2; r++) {
        const b0 = r * 4 * len;
        let i = 0;
        for (let b = 0; b < 2 * len - 1; b++) {
          const inBar = b % len;
          // Group starts always sound; inside a group about half the eighths do (the riff's rhythm).
          if (b > 0 && !gs.includes(inBar) && rnd() < 0.45) continue;
          if (b > 0) i = Math.max(0, Math.min(box.length - 1, i + [-2, -1, 1, 2, 3][Math.floor(rnd() * 5)]));
          const x = box[i];
          const midi = noteAt(tu, x.s, x.f);
          listen.push({ beat: b0 + b, dur: 0.9, midi: [midi], inst: 'piano' });
          if (gs.includes(inBar)) listen.push({ beat: b0 + b, dur: 0.2, midi: [42], perc: inBar === 0 ? 'kick' : 'hat' });
          evs.push({ beat: b0 + 2 * len + b, dur: 1, notes: [{ ...x }] });
        }
        // The window ends an eighth before the answer: the take drops onsets up to 120 ms after a window (a ringing speaker).
        windows.push([b0, b0 + 2 * len - 1]);
      }
      const title = tt(`Odd-meter riff echo by ear (${meterText(m)})`, `הד ריף במשקל אי-זוגי בשמיעה (${meterText(m)})`, key);
      const d0 = finish(s, tu, evs, { title, bpm: 180, evenness: false });
      const d = withBarPlan({ ...d0, pulse: 8 as const, beats: 8 * len }, [[m, 8]]);
      return { ...d, show: 'none', listen: { notes: listen, windows, ask: t(`Hear a two-bar riff in ${meterText(m)} — play it back in the next two bars`, `שמעו ריף של שתי תיבות ב-${meterText(m)} — נגנו אותו בחזרה בשתי התיבות הבאות`) } };
    }
    case 'mixed': {
      // L3: mixed meters bar by bar with the band (a road map: a lost bar is named, every section's 1 checked).
      const PLANS: { m: string; groove: string }[][] = [
        [{ m: '4/4', groove: 'rock-8' }, { m: '7/8 2+2+3', groove: 'seven-8' }],
        [{ m: '4/4', groove: 'rock-8' }, { m: '7/8 2+2+3', groove: 'seven-8' }, { m: '4/4', groove: 'rock-8' }, { m: '5/8 3+2', groove: 'five-8' }],
        [{ m: '7/8 3+2+2', groove: 'seven-8-322' }, { m: '9/8 2+2+2+3', groove: 'nine-8' }, { m: '4/4', groove: 'rock-8' }, { m: '7/8 2+2+3', groove: 'seven-8' }],
      ];
      const plan = PLANS[op % PLANS.length];
      const roots = plan.map((_, k) => pickIv(rnd, k));
      const chordName = (iv: number) => `${NAMES[mod(key + iv, 12)]}5`;
      const sections: FormSection[] = plan.map((p, k) => ({ name: String.fromCharCode(65 + k), kind: k === 0 ? 'verse' : 'interlude', bars: 2, meter: p.m, chart: [chordName(roots[k])], groove: p.groove, band: 'rock' }));
      // Two bars a section (a one-bar section's tempo is too noisy to judge drift).
      const form = { sections, order: op === 0 ? [0, 1, 0, 1] : [...sections.keys()] };
      const spans = expandForm(form, 8);
      const evs: Ev[] = [];
      for (const sp of spans)
        for (let b = 0; b < sp.bars; b++) {
          const len = barBeats(sp.meter, 8);
          evs.push(...riffBar(tu, key, sp.startBeat + b * len, len, groupStartsOf(sp.meter, 8), rnd, roots[sp.section]));
        }
      const text = plan.map((p) => sigOf(p.m)).join(' → ');
      const title = tt(`Mixed meters with the band: ${text}`, `משקלים מתחלפים עם הלהקה: ${text}`, key);
      // ⚙ drift 6 %: a 2-bar section's tempo with 8 ms human jitter reads ±4–5 % (calibrate with real takes).
      const d0 = finish(s, tu, evs, { title, bpm: 180, evenness: false, goal: { prog: { form: { lost: 0, landMs: 40, drift: 0.06 } } } });
      return applyForm({ ...d0, pulse: 8 as const, band: { style: 'rock' } }, form);
    }
    case 'poly': {
      // L4: 16ths in 4/4 with an accent every 3 (option 0) or every 5 (option 1) sixteenths, across the bar lines,
      // until the cycle comes back to beat 1. The accents are the bar's groups (unit 16): goal.prog.groupAccent.
      const cycle = op === 1 ? 5 : 3;
      const nBars = op === 1 ? 5 : 6;
      const r6 = pos(tu, key);
      const box = windowScale(tu, key, PENTA_MINOR, r6, r6 + 3, [5, 4, 3]);
      // Accents on the low root, its 5th (string 5) and the octave (string 4), all in the box.
      const low = [{ s: 6, f: r6 }, { s: 5, f: r6 + 2 }, { s: 4, f: r6 + 2 }];
      const meters: MeterSpec[] = [];
      const evs: Ev[] = [];
      let k = 0;
      for (let bar = 0; bar < nBars; bar++) {
        const starts = [0];
        for (let i = 0; i < 16; i++) if ((bar * 16 + i) % cycle === 0 && i > 0) starts.push(i);
        const groups = starts.map((x, j) => (starts[j + 1] ?? 16) - x);
        meters.push({ num: 4, den: 4, groups, unit: 16 });
        for (let i = 0; i < 16; i++) {
          const c = (bar * 16 + i) % cycle;
          const accent = c === 0 || i === 0;
          const x = accent ? low[k++ % low.length] : box[(c - 1 + Math.floor((bar * 16 + i) / cycle)) % box.length];
          evs.push({ beat: bar * 4 + i / 4, dur: 0.25, notes: [{ ...x, ...(accent ? { acc: true } : {}) }] });
        }
      }
      const title = op === 1 ? tt('Five over four: accent every 5 sixteenths', 'חמש על ארבע: הדגשה כל 5 שש-עשריות', key) : tt('Three over four: accent every 3 sixteenths', 'שלוש על ארבע: הדגשה כל 3 שש-עשריות', key);
      const d0 = finish(s, tu, evs, { title, bpm: 70, evenness: false, goal: { prog: { groupAccent: 0.3 } } });
      return withBarPlan({ ...d0, beats: nBars * 4 }, meters);
    }
    case 'modulate': {
      // L5: metric modulation. Two bars before, two after; the pulse in ms carries over the change, the beat moves:
      // option 0 dotted 8ths → the new quarter (× 4/3), 1 triplet quarters → the new quarter (× 3/2), 2 the old quarter
      // → the new triplet quarter (× 2/3). Checked: the new tempo's ratio (±2 %) and the landing on the new 1.
      const [stepA, stepB, ratio] = op === 1 ? [2 / 3, 1, MODULATIONS.tripletQuarterToQuarter] : op === 2 ? [1, 2 / 3, MODULATIONS.quarterToTripletQuarter] : [0.75, 1, MODULATIONS.dottedEighthToQuarter];
      const r6 = pos(tu, key);
      const box = windowScale(tu, key, PENTA_MINOR, r6, r6 + 3, [6, 5, 4, 3]);
      const beatsList: { b: number; d: number }[] = [];
      for (let b = 0; b < 8 - 1e-9; b += stepA) beatsList.push({ b, d: stepA });
      for (let b = 8; b < 16 - 1e-9; b += stepB) beatsList.push({ b, d: stepB });
      let i = 0;
      const evs: Ev[] = beatsList.map(({ b, d }, n) => {
        if (n > 0) i = Math.max(0, Math.min(box.length - 1, i + [-1, 1, 1, 2, -2][Math.floor(rnd() * 5)]));
        const onOne = Math.abs(b - 8) < 1e-6 || Math.abs(b) < 1e-6;
        return { beat: b, dur: d, notes: [{ ...(onOne ? box[0] : box[i]), ...(onOne ? { acc: true } : {}) }] };
      });
      const nm = op === 1 ? ['Triplet quarter becomes the new quarter', 'רבע טריולה הופך לרבע החדש'] : op === 2 ? ['The quarter becomes the new triplet quarter', 'הרבע הופך לרבע הטריולה החדש'] : ['Dotted 8th becomes the new quarter', 'שמינית מנוקדת הופכת לרבע החדש'];
      // ⚙ tolerance 3 % (the engine default is 2 %): 8 ms jitter moves the median IOI ratio up to ~2.8 %.
      const d0 = finish(s, tu, evs, { title: tt(`Metric modulation: ${nm[0]}`, `מודולציה מטרית: ${nm[1]}`, key), bpm: 80, evenness: false, goal: { prog: { tempoRatio: { tol: 0.03, landMs: 30 } } } });
      return withBarPlan({ ...d0, beats: 16 }, [['4/4', 4]], [{ bar: 2, ratio }]);
    }
    case 'mode-riff': {
      // L6: a pedal riff in a mode, in position: the low root every other 8th, the scale up then down on strings 5–3.
      const md = PROG_MODES[op % PROG_MODES.length];
      const r6 = pos(tu, key);
      const lo = r6;
      const set = windowScale(tu, key, md.ints, lo, lo + 4, [5, 4, 3]);
      const up = set.slice(0, Math.min(8, set.length));
      const walk = [...up, ...up.slice(0, -1).reverse()];
      while (walk.length < 16) walk.push(...walk.slice(1, 1 + 16 - walk.length));
      const evs: Ev[] = [];
      for (let k = 0; k < 16; k++) {
        evs.push({ beat: k, dur: 0.5, notes: [{ s: 6, f: r6, acc: k % 2 === 0 }] });
        evs.push({ beat: k + 0.5, dur: 0.5, notes: [{ ...walk[k] }] });
      }
      const d = finish(s, tu, evs, { title: tt(`Pedal riff in ${md.en}`, `ריף על צליל עוגב ב${md.he}`, key), bpm: 80, evenness: false });
      return { ...d, drums: { groove: 'rock-8' } };
    }
    case 'fusion': {
      // L7: fusion vocabulary in 16ths. 0 pentatonic side-slip (in, a half step out, back in); 1 half-whole diminished
      // in 4-note groups; 2 whole-tone in a 1-3-2-4 sequence; 3 wide-interval legato (2 notes a string, skipping strings).
      const r6 = pos(tu, key);
      const lo = r6 < 2 ? r6 + 12 : r6;
      let gns: GN[] = [];
      let title: T2;
      if (op === 0) {
        const box = windowScale(tu, key, PENTA_MINOR, lo, lo + 3, [4, 3, 2, 1]).slice(0, 8);
        const slip = box.map((x) => ({ ...x, f: x.f + 1 }));
        gns = [...box, ...slip, ...[...slip].reverse(), ...[...box].reverse()];
        title = tt('Pentatonic side-slip: in, a half step out, back in', 'החלקה פנטטונית: בפנים, חצי טון בחוץ, וחזרה', key);
      } else if (op === 1 || op === 2) {
        const set = windowScale(tu, key, op === 1 ? DIM_HW : WHOLE, lo, lo + 4, [5, 4, 3, 2]);
        const order = op === 1 ? [0, 1, 2, 3] : [0, 2, 1, 3];
        const groups = Math.min(8, set.length - 3);
        for (let g = 0; g < groups; g++) gns.push(...order.map((o) => ({ ...set[g + o] })));
        const back = [...gns].reverse();
        gns = [...gns, ...back].slice(0, 32);
        title = op === 1 ? tt('Half-whole diminished in groups of 4', 'מוקטן חצי-שלם בקבוצות של 4', key) : tt('Whole-tone sequence 1-3-2-4', 'רצף טונים שלמים 1-3-2-4', key);
      } else {
        const strs = [6, 4, 5, 3, 4, 2, 3, 1];
        const box = windowScale(tu, key, PENTA_MINOR, lo, lo + 3);
        const per = (st: number) => box.filter((x) => x.s === st).slice(0, 2);
        const upN = strs.flatMap((st) => per(st).map((x, j) => ({ ...x, ...(j === 1 ? { tech: 'hammer' as const } : {}) })));
        const downN = [...strs].reverse().flatMap((st) => [...per(st)].reverse().map((x, j) => ({ ...x, ...(j === 1 ? { tech: 'pull' as const } : {}) })));
        gns = [...upN, ...downN];
        title = tt('Wide-interval legato: string skips, two notes a string', 'לגאטו במרווחים רחבים: דילוגים, שני צלילים בכל מיתר', key);
      }
      const evs: Ev[] = gns.map((g, i) => ({ beat: i / 4, dur: 0.25, notes: [{ ...g, stroke: i % 2 ? 'U' : 'D' }] }));
      evs[evs.length - 1].dur = 1;
      return finish(s, tu, evs, { title, bpm: 60, evenness: false });
    }
    case 'unison': {
      // L8: an odd-meter riff with the band's bass in unison an octave below: lock to the bass (mean and SD of the
      // offsets). Single low notes, 4 bars (a 2-bar riff twice).
      const o = [ODD[0], ODD[4], ODD[1], ODD[6]][op % 4];
      const m = parseMeter(o.meter);
      const len = barBeats(m, 8);
      const gs = groupStartsOf(m, 8);
      const r6 = pos(tu, key);
      const box = windowScale(tu, key, PENTA_MINOR, r6, r6 + 3, [6, 5]);
      const riff: Ev[] = [];
      let i = 0;
      for (let b = 0; b < 2 * len; b++) {
        if (b > 0 && !gs.includes(b % len) && rnd() < 0.3) continue;
        if (b > 0) i = Math.max(0, Math.min(box.length - 1, i + [-2, -1, 1, 2][Math.floor(rnd() * 4)]));
        riff.push({ beat: b, dur: 1, notes: [{ ...(gs.includes(b % len) && b % len === 0 ? box[0] : box[i]), ...(gs.includes(b % len) ? { acc: true } : {}) }] });
      }
      const evs = [...riff, ...riff.map((e) => ({ ...e, beat: e.beat + 2 * len, notes: e.notes.map((g) => ({ ...g })) }))];
      const d0 = finish(s, tu, evs, { title: tt(`Unison with the bass in ${meterText(m)}`, `אוניסון עם הבס ב-${meterText(m)}`, key), bpm: 200, evenness: false, goal: { prog: { unison: { mean: 12, sd: 18 } } } });
      const d = withBarPlan({ ...d0, pulse: 8 as const, beats: 4 * len }, [[m, 4]]);
      return { ...d, drums: { groove: o.groove }, unison: { inst: 'bass', transpose: -12, vel: 0.8 } };
    }
  }
  throw new Error(`Unknown g-prog kind ${s.kind}`);
}

function meterText(m: MeterSpec): string {
  return m.groups && m.groups.length > 1 ? `${m.num}/${m.den} (${m.groups.join('+')})` : `${m.num}/${m.den}`;
}

/** The g-prog family: 8 levels (GUITAR_DEEPENING §4.3), the prog / fusion add-on. */
export function guitarProgFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-prog';
  const P = (kind: string, tempo: number, o: Partial<SpecTemplate> = {}): SpecTemplate => ({ family: fam, kind, hands: 'R', instrument: 'guitar', tempo, ...o });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], keys: number[], tempo: [number, number], sub: string, grade: number): GuitarLevelDef => ({
    id: `g-prog-${level}`,
    level,
    title: t(en, he),
    specs: specs.map((x) => ({ ...x, tempo: x.tempo ?? tempo[0] })),
    keys,
    tempo,
    sub,
    grade,
  });
  const EADG = [4, 9, 2, 7];
  return {
    id: fam,
    title: t('Prog and fusion', 'פרוג ופיוז׳ן'),
    style: 'jazz',
    genres: ['rock', 'metal', 'jazz'],
    instruments: ['guitar'],
    addOn: 'prog',
    levels: [
      L(1, 'Odd-meter riffs: 7/8 and 5/4', 'ריפים במשקלים אי-זוגיים: 7/8 ו-5/4', [0, 1, 2].map((o) => P('odd-riff', 180, { option: o })), EADG, [180, 260], '♪ 8ths', 5),
      L(2, '9/8 and 11/8, changing groupings; riff echo by ear', '9/8 ו-11/8, חלוקות מתחלפות; הד ריף בשמיעה', [P('odd-riff', 180, { option: 3 }), P('odd-riff', 180, { option: 4 }), P('odd-riff', 180, { option: 7 }), P('odd-echo', 180, { option: 0 }), P('odd-echo', 180, { option: 1 })], EADG, [180, 260], '♪ 8ths', 6),
      L(3, 'Mixed meters bar by bar, with the band', 'משקלים מתחלפים מתיבה לתיבה, עם הלהקה', [0, 1, 2].map((o) => P('mixed', 180, { option: o })), EADG, [180, 260], '♪ 8ths', 7),
      L(4, 'Polyrhythm in riffs: 3 and 5 over 4', 'פולי-ריתמוס בריפים: 3 ו-5 על 4', [0, 1].map((o) => P('poly', 70, { option: o })), [9, 4, 2, 7], [70, 110], '16ths', 7),
      L(5, 'Metric modulation', 'מודולציה מטרית', [0, 1, 2].map((o) => P('modulate', 80, { option: o })), [9, 4, 2, 7], [80, 110], '♩ → the new ♩', 8),
      L(6, 'Modes in riffs: Lydian, Phrygian, Hijaz, harmonic and Hungarian minor, double harmonic', 'מודוסים בריפים: לידי, פריגי, חיג׳אז, מינור הרמוני והונגרי, הרמוני כפול', [0, 1, 2, 3, 4, 5].map((o) => P('mode-riff', 80, { option: o })), [4, 9, 2, 7, 11], [80, 130], '8ths', 6),
      L(7, 'Fusion lines: side-slips, diminished and whole-tone, wide-interval legato', 'קווי פיוז׳ן: החלקות, מוקטן וטונים שלמים, לגאטו במרווחים רחבים', [0, 1, 2, 3].map((o) => P('fusion', 60, { option: o })), [9, 4, 7, 2, 0], [60, 100], '16ths', 8),
      L(8, 'Unisons with the band in odd meters', 'אוניסונים עם הלהקה במשקלים אי-זוגיים', [0, 1, 2, 3].map((o) => P('unison', 200, { option: o })), EADG, [200, 280], '♪ 8ths', 9),
    ],
  };
}
