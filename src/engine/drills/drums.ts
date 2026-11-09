// Drums course v1 (docs/research/DRUMS_CURRICULUM.md §4.2, §4.3): the families F1 strokes & dynamics, F2 singles /
// doubles / rolls, F3 paradiddles, F4 time & subdivision, F5 rock & pop grooves, F9 fills & landing, F14 reading —
// each level with its start → target tempo and several VARIANTS (stickings, groove variations, fills) in place of the
// twelve keys, so the five-star level rule (3 items at the target = done) works as for every instrument.
// Pure and deterministic. A drum note's pitch is its voice's GM note (drumKit.VOICE_NOTE); `hand` is the sticking.

import type { Drill, DrillSpec, DrumGoal, DrumVoice, ExpNote, FamilyId, DrumFamilyId } from './types';
import type { SpecTemplate } from './generate';
import type { GuitarFamilyDef, GuitarLevelDef, T2, TechProbe } from './guitar';
import { VOICE_NOTE, limbOf } from '../drumKit';

const t = (en: string, he: string): T2 => ({ en, he });
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

/** A drum level: the bass-style level (tempo range, subdivision) plus whether one surface (mic on a pad) can play it. */
export interface DrumLevelDef extends GuitarLevelDef {
  /** Every item of the level is single-surface: offered in microphone (practice pad) mode. */
  mic: boolean;
}
export interface DrumFamilyDef extends GuitarFamilyDef {
  levels: DrumLevelDef[];
}

/** One hit while building a drill. */
interface DH {
  b: number;
  v: DrumVoice;
  h?: 'R' | 'L';
  acc?: boolean;
  ghost?: boolean;
  dyn?: 'p' | 'mf' | 'f';
  dbl?: 1 | 2;
  d?: number;
}

/** Sticking string → hands ("RLRR LRLL"). */
const hands = (s: string): ('R' | 'L')[] => [...s.replace(/[^RL]/g, '')] as ('R' | 'L')[];
const flip = (s: string): string => s.replace(/[RL]/g, (c) => (c === 'R' ? 'L' : 'R'));

/** A snare line: `n` strokes `step` beats apart from `from`, the sticking cycled. */
function line(sticking: string, n: number, step: number, from = 0, extra: (i: number) => Partial<DH> = () => ({})): DH[] {
  const hs = hands(sticking);
  return Array.from({ length: n }, (_, i) => ({ b: from + i * step, v: 'snare' as DrumVoice, h: hs[i % hs.length], d: step, ...extra(i) }));
}

/** Groove lanes, one character per step: x hit, X accent, g ghost, o open hat (hat lane), . rest. */
type Lanes = Partial<Record<'h' | 'r' | 's' | 'k' | 'c' | 'p' | 't1' | 't2' | 't3', string>>;
const LANE_VOICE: Record<keyof Lanes, DrumVoice> = { h: 'hihat', r: 'ride', s: 'snare', k: 'kick', c: 'crash', p: 'hhPedal', t1: 'tom1', t2: 'tom2', t3: 'tom3' };
/** One bar of a groove from `b0`; `sub` steps per beat; `hatHands` = sticking for the hat lane (default all R). */
function bar(l: Lanes, sub: number, b0: number, o: { hatHands?: string; from?: number; to?: number; sHand?: (i: number, c: string) => 'R' | 'L' } = {}): DH[] {
  const out: DH[] = [];
  const hh = o.hatHands ? hands(o.hatHands) : null;
  for (const [lane, pat] of Object.entries(l) as [keyof Lanes, string][]) {
    [...pat].forEach((c, i) => {
      if (c === '.') return;
      const b = i / sub;
      if ((o.from !== undefined && b < o.from - 1e-9) || (o.to !== undefined && b >= o.to - 1e-9)) return;
      const voice: DrumVoice = lane === 'h' && c === 'o' ? 'hhOpen' : LANE_VOICE[lane];
      // Two hands on the hat (hatHands): the snare takes that step's hand, so the alternation never breaks (RLRL|R on 2).
      const h: 'R' | 'L' = (lane === 's' || lane === 'h') && hh ? hh[i % hh.length] : lane === 's' ? (o.sHand ? o.sHand(i, c) : 'L') : 'R';
      // Written length: to the lane's next hit (a kick on 1 and 3 is a quarter, not an 8th), at most a beat.
      const nx = [...pat].findIndex((x, j) => j > i && x !== '.');
      const d = Math.min(1, ((nx < 0 ? pat.length : nx) - i) / sub);
      out.push({ b: b0 + b, v: voice, h, acc: c === 'X' || undefined, ghost: c === 'g' || undefined, d });
    });
  }
  return out;
}
const rep = (n: number, f: (i: number) => DH[]): DH[] => Array.from({ length: n }, (_, i) => f(i)).flat();

interface Fin {
  title: T2;
  bpm: number;
  bars: number;
  goal?: DrumGoal;
  mic: boolean;
  click?: Drill['click'];
  gap?: [number, number];
  show?: Drill['show'];
  /** Extra beats after the last bar (the landing hit on the next 1). */
  tail?: number;
  drums?: Drill['drums'];
}
/** Verdict tier from the level (§4.1): L1–3 beginner, L4–7 intermediate, L8+ advanced. */
const tierOf = (level: number): 1 | 2 | 3 => (level <= 3 ? 1 : level <= 7 ? 2 : 3);
const levelOfKind = (kind: string): number => Number(kind.split(':')[0]) || 1;

/** Stable id of a drum item: family, kind, variant. */
export const drumItemId = (s: DrillSpec): string => `${s.family}:${s.kind}:${s.option ?? 0}`;

function finish(spec: DrillSpec, hits: DH[], o: Fin): Drill {
  const notes: ExpNote[] = hits
    .map((x): ExpNote => {
      const n: ExpNote = { pitch: VOICE_NOTE[x.v], beat: r6(x.b), dur: r6(x.d ?? 0.5), hand: x.h ?? 'R', voice: x.v, limb: limbOf(x.v, x.h ?? 'R') };
      if (x.acc) n.accent = true;
      if (x.ghost) n.ghost = true;
      if (x.dyn) n.dyn = x.dyn;
      if (x.dbl) n.dbl = x.dbl;
      return n;
    })
    .sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const meter = 4;
  return {
    spec: { ...spec, instrument: 'drums', key: 0 },
    itemId: drumItemId(spec),
    title: o.title,
    notes,
    beats: o.bars * meter + (o.tail ?? 0),
    meter,
    keySig: 'C',
    goal: { evenness: true, hands: false, ...(o.goal ? { drum: o.goal } : {}) },
    startBpm: Math.round(spec.tempo ?? o.bpm),
    ...(o.click ? { click: o.click } : {}),
    ...(o.gap ? { gap: o.gap } : {}),
    ...(o.show ? { show: o.show } : {}),
    ...(o.drums ? { drums: o.drums } : {}),
    drum: { tier: tierOf(levelOfKind(spec.kind)), mic: o.mic },
  };
}

// ───────────────────────────── F1 strokes & dynamics ─────────────────────────────

function genStrokes(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  switch (lv) {
    case 1: {
      const st = op === 0 ? 'R' : op === 1 ? 'L' : 'RRRRRRRRLLLLLLLL';
      const nm = [t('right hand', 'יד ימין'), t('left hand', 'יד שמאל'), t('right, then left', 'ימין ואז שמאל')][op];
      return finish(s, line(st, 16, 1), { title: t(`Even quarters · ${nm.en}`, `רבעים שווים · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.15 } });
    }
    case 2: {
      const st = op === 1 ? 'LR' : 'RL';
      const nm = [t('lead right', 'מובילים בימין'), t('lead left', 'מובילים בשמאל'), t('over a groove', 'מעל גרוב')][op];
      return finish(s, line(st, 32, 0.5), { title: t(`Even 8ths, one dynamic · ${nm.en}`, `שמיניות שוות בעוצמה אחת · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.15, balance: 0.1 }, ...(op === 2 ? { drums: { groove: 'motown' } } : {}) });
    }
    case 3: {
      const plans: ('p' | 'mf' | 'f')[][] = [
        ['p', 'mf', 'f', 'mf'],
        ['f', 'mf', 'p', 'mf'],
        ['mf', 'p', 'f', 'p'],
      ];
      const plan = plans[op];
      return finish(s, line('RL', 32, 0.5, 0, (i) => ({ dyn: plan[Math.floor(i / 8)] })), { title: t(`Three dynamics on cue · ${plan.join(' → ')}`, `שלוש עוצמות לפי הסימן · ${plan.join(' → ')}`), bpm: 70, bars: 4, mic: true, goal: { levels: 0.85 } });
    }
    case 4: {
      const st = op === 1 ? 'LRLR' : 'RLRL';
      const every = op === 2 ? 8 : 4;
      const nm = [t('accent every beat', 'הדגשה בכל פעמה'), t('lead left', 'מובילים בשמאל'), t('accents on 1 and 3', 'הדגשות על 1 ו-3')][op];
      return finish(s, line(st, 64, 0.25, 0, (i) => (i % every === 0 ? { acc: true } : {})), { title: t(`Accent and taps (down–tap–up) · ${nm.en}`, `הדגשה ונקישות (למטה–נקישה–למעלה) · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { accentGap: 0.35, tapCv: 0.15, accentPos: 0.85 } });
    }
    default: {
      // L5 moving accent: on e, &, a, or moving one place every bar.
      const pos = (i: number) => (op === 3 ? Math.floor(i / 16) % 4 : op + 1);
      const nm = [t('on "e"', 'על "e"'), t('on "&"', 'על "&"'), t('on "a"', 'על "a"'), t('moving each bar', 'זזה כל תיבה')][op];
      return finish(s, line('RL', 64, 0.25, 0, (i) => (i % 4 === pos(i) ? { acc: true } : {})), { title: t(`Moving accent · ${nm.en}`, `הדגשה נודדת · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { accentPos: 0.95, accentGap: 0.3 } });
    }
  }
}

// ───────────────────────────── F2 singles, doubles, rolls ─────────────────────────────

function genRolls(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const lead = op === 1 ? 'L' : 'R';
  switch (lv) {
    case 1: {
      if (op === 2) {
        const hits = [...line('RL', 8, 0.5, 0), ...line('RL', 4, 1, 4), ...line('RL', 8, 0.5, 8), ...line('RL', 4, 1, 12)];
        return finish(s, hits, { title: t('Single strokes · 8ths and quarters', 'מכות בודדות · שמיניות ורבעים'), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.2 } });
      }
      return finish(s, line(lead === 'R' ? 'RL' : 'LR', 32, 0.5), { title: t(`Single strokes in 8ths · lead ${lead}`, `מכות בודדות בשמיניות · מובילים ב${lead === 'R' ? 'ימין' : 'שמאל'}`), bpm: 60, bars: 4, mic: true, goal: { velCv: 0.2 } });
    }
    case 2: {
      if (op === 2) {
        const hits = rep(8, (k) => line('RL', 4, 0.25, k * 2).concat(line('R', 1, 1, k * 2 + 1)));
        return finish(s, hits, { title: t('Single strokes · 16th bursts', 'מכות בודדות · התפרצויות בשש-עשריות'), bpm: 70, bars: 4, mic: true });
      }
      if (op === 3) return finish(s, line('RL', 64, 0.25), { title: t('Single strokes in 16ths · over a groove', 'מכות בודדות בשש-עשריות · מעל גרוב'), bpm: 70, bars: 4, mic: true, drums: { groove: 'rock-8' } });
      return finish(s, line(lead === 'R' ? 'RL' : 'LR', 64, 0.25), { title: t(`Single strokes in 16ths · lead ${lead}`, `מכות בודדות בשש-עשריות · מובילים ב${lead === 'R' ? 'ימין' : 'שמאל'}`), bpm: 70, bars: 4, mic: true });
    }
    case 3:
    case 4: {
      const step = lv === 3 ? 0.5 : 0.25;
      const n = lv === 3 ? 32 : 64;
      const st = op === 1 ? 'LLRR' : 'RRLL';
      const name = lv === 3 ? t('Double strokes in 8ths', 'מכות כפולות בשמיניות') : t('Double strokes in 16ths', 'מכות כפולות בשש-עשריות');
      if (lv === 4 && op === 2) {
        const hits = rep(4, (k) => line('RRLL', 8, 0.25, k * 4, (i) => ({ dbl: (i % 2 ? 2 : 1) as 1 | 2 })));
        return finish(s, hits, { title: t(`${name.en} · two beats on, rest`, `${name.he} · שתי פעמות ומנוחה`), bpm: 70, bars: 4, mic: true, goal: { ratio: 0.8 } });
      }
      const acc = lv === 3 && op === 2;
      const nm = acc ? t('accent the first of each pair', 'הדגשה על הראשונה בכל זוג') : t(st, st);
      return finish(s, line(st, n, step, 0, (i) => ({ dbl: (i % 2 ? 2 : 1) as 1 | 2, ...(acc && i % 2 === 0 ? { acc: true } : {}) })), { title: t(`${name.en} · ${nm.en}`, `${name.he} · ${nm.he}`), bpm: lv === 3 ? 60 : 70, bars: 4, mic: true, goal: acc ? { accentPos: 0.85 } : { ratio: 0.8 } });
    }
    case 5: {
      // Single-stroke four / seven: even strokes into an accent.
      if (op === 1) {
        const hits = rep(8, (k) => line(k % 2 ? 'LRLRLR' : 'RLRLRL', 6, 1 / 6, k * 2).concat(line(k % 2 ? 'L' : 'R', 1, 1, k * 2 + 1, () => ({ acc: true }))));
        return finish(s, hits, { title: t('Single-stroke seven', 'שבע מכות בודדות'), bpm: 70, bars: 4, mic: true, goal: { accentPos: 0.85 } });
      }
      if (op === 2) {
        const hits = rep(8, (k) => line(k % 2 ? 'LRL' : 'RLR', 3, 0.25, k * 2 + 0.25).concat(line(k % 2 ? 'R' : 'L', 1, 1, k * 2 + 1, () => ({ acc: true }))));
        return finish(s, hits, { title: t('Single-stroke four in 16ths', 'ארבע מכות בודדות בשש-עשריות'), bpm: 70, bars: 4, mic: true, goal: { accentPos: 0.85 } });
      }
      const hits = rep(16, (k) => line(k % 2 ? 'LRL' : 'RLR', 3, 1 / 6, k).concat(line(k % 2 ? 'R' : 'L', 1, 0.5, k + 0.5, () => ({ acc: true }))));
      return finish(s, hits, { title: t('Single-stroke four (16th triplets)', 'ארבע מכות בודדות (טריולות שש-עשריות)'), bpm: 70, bars: 4, mic: true, goal: { accentPos: 0.85 } });
    }
    default: {
      // L6 open rolls: 5, 7, 9 strokes — doubles in 16ths into an accented release, alternating the lead.
      const strokes = [5, 7, 9][op];
      const span = op === 2 ? 4 : 2;
      const hits = rep(16 / span, (k) => {
        // 5 and 9 alternate the lead (RRLLR LLRRL); the 7 releases on the other hand, so each group restarts on R.
        const st = k % 2 && strokes !== 7 ? 'LLRR' : 'RRLL';
        const doubles = line(st, strokes - 1, 0.25, k * span, (i) => ({ dbl: (i % 2 ? 2 : 1) as 1 | 2 }));
        // PAS: the release is the hand after the last double (5: RRLL R, 7: RRLLRR L, 9: RRLLRRLL R).
        const last = doubles[doubles.length - 1].h;
        const relAt = (strokes - 1) * 0.25;
        const rel = line(last === 'R' ? 'L' : 'R', 1, Math.min(1, span - relAt), k * span + relAt, () => ({ acc: true }));
        return [...doubles, ...rel];
      });
      return finish(s, hits, { title: t(`${strokes}-stroke roll (open)`, `גלגול של ${strokes} מכות (פתוח)`), bpm: 70, bars: 4, mic: true, goal: { ratio: 0.8 } });
    }
  }
}

// ───────────────────────────── F3 paradiddles ─────────────────────────────

function genDiddles(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const PARA = 'RLRRLRLL';
  switch (lv) {
    case 1: {
      if (op === 2) {
        const hits = [...line(PARA, 16, 0.5), ...line(PARA, 32, 0.25, 8)];
        return finish(s, hits, { title: t('Single paradiddle · 8ths, then 16ths', 'פאראדידל · שמיניות, ואז שש-עשריות'), bpm: 60, bars: 4, mic: true });
      }
      const st = op === 1 ? flip(PARA) : PARA;
      return finish(s, line(st, 64, 0.25), { title: t(`Single paradiddle · ${st.slice(0, 4)} ${st.slice(4)}`, `פאראדידל · ${st.slice(0, 4)} ${st.slice(4)}`), bpm: 60, bars: 4, mic: true });
    }
    case 2: {
      const st = op === 1 ? flip(PARA) : PARA;
      const at = op === 2 ? 2 : 0;
      const nm = op === 2 ? t('accent on the double', 'הדגשה על הכפולה') : t(`accent first · ${st.slice(0, 4)}`, `הדגשה על הראשונה · ${st.slice(0, 4)}`);
      return finish(s, line(st, 64, 0.25, 0, (i) => (i % 4 === at ? { acc: true } : {})), { title: t(`Paradiddle with accents · ${nm.en}`, `פאראדידל עם הדגשות · ${nm.he}`), bpm: 70, bars: 4, mic: true, goal: { accentPos: 0.85, accentGap: 0.3 } });
    }
    case 3: {
      const st = ['RLLRLRRL', 'RRLRLLRL', 'LRRLRLLR'][op];
      const nm = [t('inverted', 'הפוך'), t('reverse', 'מהסוף'), t('inverted, lead left', 'הפוך, מובילים בשמאל')][op];
      return finish(s, line(st, 64, 0.25), { title: t(`Paradiddle · ${nm.en} · ${st.slice(0, 4)} ${st.slice(4)}`, `פאראדידל · ${nm.he} · ${st.slice(0, 4)} ${st.slice(4)}`), bpm: 60, bars: 4, mic: true });
    }
    default: {
      // L4 double paradiddle / paradiddle-diddle in 8th triplets, accent on each group's first note.
      const st = ['RLRLRRLRLRLL', 'RLRRLL', 'LRLLRR'][op];
      const g = 6;
      const nm = [t('Double paradiddle', 'פאראדידל כפול'), t('Paradiddle-diddle', 'פאראדידל-דידל'), t('Paradiddle-diddle, lead left', 'פאראדידל-דידל, מובילים בשמאל')][op];
      return finish(s, line(st, 48, 1 / 3, 0, (i) => (i % g === 0 ? { acc: true } : {})), { title: t(`${nm.en} (triplets)`, `${nm.he} (טריולות)`), bpm: 60, bars: 4, mic: true, goal: { accentPos: 0.8 } });
    }
  }
}

// ───────────────────────────── F4 time & subdivision ─────────────────────────────

function genTime(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const accOne = (every: number) => (i: number) => (i % every === 0 ? { acc: true } : {});
  const three = (bars: number, step8: boolean): [DH[], T2][] => [
    [line('RL', bars * 8, 0.5), t('8ths', 'שמיניות')],
    [line('R', bars * 4, 1), t('quarters', 'רבעים')],
    [line('RL', bars * 8, 0.5, 0, step8 ? accOne(8) : accOne(2)), step8 ? t('8ths, accent on 1', 'שמיניות, הדגשה על 1') : t('8ths, accent on the beat', 'שמיניות, הדגשה על הפעמה')],
  ];
  switch (lv) {
    case 1: {
      const st = ['R', 'L', 'RL'][op];
      const nm = [t('right hand', 'יד ימין'), t('left hand', 'יד שמאל'), t('alternating', 'לסירוגין')][op];
      return finish(s, line(st, 16, 1), { title: t(`Quarters with the click · ${nm.en}`, `רבעים עם הקליק · ${nm.he}`), bpm: 60, bars: 4, mic: true });
    }
    case 2: {
      // Subdivision ladder: 4 beats each of quarters, 8ths, triplets, 16ths (or back down, or 2 beats each twice).
      const steps = [1, 0.5, 1 / 3, 0.25];
      const order = op === 1 ? [...steps].reverse() : steps;
      const per = op === 2 ? 2 : 4;
      const hits: DH[] = [];
      let b = 0;
      for (let rnd = 0; rnd < (op === 2 ? 2 : 1); rnd++)
        for (const st of order) {
          const n = Math.round(per / st);
          hits.push(...line('RL', n, st, b));
          b += per;
        }
      const nm = [t('up', 'עולה'), t('down', 'יורד'), t('up, two beats each', 'עולה, שתי פעמות לכל אחת')][op];
      return finish(s, hits, { title: t(`Subdivision ladder ♩ ♫ 3 ♬ · ${nm.en}`, `סולם חלוקות ♩ ♫ 3 ♬ · ${nm.he}`), bpm: 60, bars: 4, mic: true });
    }
    case 3: {
      const [hits, nm] = three(4, false)[op];
      return finish(s, op === 2 ? line('RL', 32, 0.5, 0, (i) => (i % 4 === 2 ? { acc: true } : {})) : hits, { title: t(`Click on 2 and 4 only · ${op === 2 ? '8ths, accent 2 & 4' : nm.en}`, `קליק רק על 2 ו-4 · ${op === 2 ? 'שמיניות, הדגשה על 2 ו-4' : nm.he}`), bpm: 70, bars: 4, mic: true, click: '24' });
    }
    case 4:
    case 5: {
      const gap: [number, number] = lv === 4 ? [2, 2] : [1, 3];
      const [hits, nm] = three(8, true)[op];
      return finish(s, hits, { title: t(`Gap click ${gap[0]} on / ${gap[1]} off · ${nm.en}`, `קליק עם חורים: ${gap[0]} עם / ${gap[1]} בלי · ${nm.he}`), bpm: 70, bars: 8, mic: true, click: 'gap', gap, goal: { gapMs: 20 } });
    }
    default: {
      const [hits, nm] = three(4, false)[op];
      return finish(s, hits, { title: t(`Click on the "&" only · ${nm.en}`, `קליק רק על ה"וְ" · ${nm.he}`), bpm: 70, bars: 4, mic: true, click: 'and' });
    }
  }
}

// ───────────────────────────── F5 rock & pop grooves ─────────────────────────────

const ROCK: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' };
const KICKS8 = ['x...xx..', 'x..xx...', 'xx..x...', 'x...x..x'];
/** A groove bar, `bars` times; bar 0 may start with a crash instead of the hat. */
function grooveBars(l: Lanes, sub: number, bars: number, o: { hatHands?: string; crashFirst?: boolean } = {}): DH[] {
  const out = rep(bars, (k) => bar(l, sub, k * 4, { hatHands: o.hatHands }));
  if (o.crashFirst) {
    const i = out.findIndex((h) => h.b === 0 && (h.v === 'hihat' || h.v === 'ride'));
    if (i >= 0) out[i] = { ...out[i], v: 'crash' };
  }
  return out;
}

function genRock(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (hits: DH[], en: string, he: string, bpm: number, goal: DrumGoal = {}, tail = 0) => finish(s, hits, { title: t(en, he), bpm, bars: 8, mic: false, goal, tail, drums: undefined });
  switch (lv) {
    case 1: {
      if (op === 1) return fin(grooveBars({ r: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' }, 2, 8), 'Basic rock beat · ride 8ths', 'קצב רוק בסיסי · רייד בשמיניות', 70);
      return fin(grooveBars(ROCK, 2, 8, { crashFirst: op === 2 }), op === 2 ? 'Basic rock beat · crash on the first 1' : 'Basic rock beat · hat 8ths, snare 2 & 4, kick 1 & 3', op === 2 ? 'קצב רוק בסיסי · קראש על ה-1 הראשון' : 'קצב רוק בסיסי · היי־האט בשמיניות, סנר 2 ו-4, קיק 1 ו-3', 70);
    }
    case 2:
      return fin(grooveBars({ ...ROCK, k: KICKS8[op] }, 2, 8), `Kick variations · ${['"&" of 3', '"&" of 2', '"&" of 1', '"&" of 4'][op]}`, `וריאציות קיק · ${['ה"וְ" של 3', 'ה"וְ" של 2', 'ה"וְ" של 1', 'ה"וְ" של 4'][op]}`, 80);
    case 3: {
      if (op === 0) return fin(grooveBars({ h: 'x.x.x.x.', s: '..x...x.', k: 'x...x...' }, 2, 8), 'Hi-hat quarters', 'היי־האט ברבעים', 80);
      if (op === 1) return fin(grooveBars({ r: 'xxxxxxxx', s: '..x...x.', k: 'x..xx...' }, 2, 8), 'Ride 8ths', 'רייד בשמיניות', 80);
      return fin(grooveBars({ h: 'xxxxxxxo', s: '..x...x.', k: 'x...x...' }, 2, 8), 'Open hi-hat on the "&" of 4', 'היי־האט פתוח על ה"וְ" של 4', 80, { hat: true });
    }
    case 4: {
      const k = ['x.......x.......', 'x.....x.x.......', 'x.......x.x.....'][op];
      return fin(grooveBars({ h: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', k }, 4, 8), `16th hi-hat, one hand · kick ${['1 & 3', '1, "&" of 2, 3', '1, 3, "&" of 3'][op]}`, `היי־האט בשש-עשריות ביד אחת · קיק ${['1 ו-3', '1, "וְ" של 2, 3', '1, 3, "וְ" של 3'][op]}`, 70);
    }
    case 5: {
      // Two hands on the hat (R L R L); on 2 and 4 the right hand (its turn in the alternation) moves to the snare.
      const k = ['x.......x.......', 'x.....x.x.......', 'x..x....x.x.....'][op];
      return fin(grooveBars({ h: 'xxxx.xxxxxxx.xxx', s: '....x.......x...', k }, 4, 8, { hatHands: 'RLRLRLRLRLRLRLRL' }), `16th hi-hat, two hands · variation ${op + 1}`, `היי־האט בשש-עשריות בשתי ידיים · וריאציה ${op + 1}`, 80);
    }
    case 6: {
      if (op === 0) return fin(grooveBars({ h: 'xxxxxxxx', s: '....x...', k: 'x.....x.' }, 2, 8), 'Half-time feel', 'תחושת חצי זמן', 80);
      if (op === 1) return fin(grooveBars({ h: 'xxxxxxxx', s: '.x.x.x.x', k: 'x.x.x.x.' }, 2, 8), 'Double-time feel', 'תחושת זמן כפול', 80);
      return fin(grooveBars({ h: 'xoxoxoxo', s: '..x...x.', k: 'x.x.x.x.' }, 2, 8), 'Four on the floor (disco, open hat on "&")', 'ארבע על הרצפה (דיסקו, היי־האט פתוח על ה"וְ")', 80, { hat: true });
    }
    case 7: {
      const k = ['x.....x.x.......', 'x..x..x...x.....', 'x.....x...x..x..'][op];
      return fin(grooveBars({ h: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', k }, 4, 8), `Pop with a 16th kick · variation ${op + 1}`, `פופ עם קיק בשש-עשריות · וריאציה ${op + 1}`, 85);
    }
    default: {
      // L8: groove + a one-bar fill every 4th bar, crash + kick on the next 1.
      const hits = phraseWithFills(ROCK, 2, (b0) => FILL_BAR[op](b0));
      return fin(hits, `Groove + fill every 4th bar · ${FILL_NAME[op].en}`, `גרוב + מעבר כל תיבה רביעית · ${FILL_NAME[op].he}`, 80, { landing: { beats: [16, 32], ms: 20 } }, 1);
    }
  }
}

/** Two 4-bar phrases: three groove bars, then a bar with the groove until the fill and the fill; crash + kick on each next 1. */
function phraseWithFills(l: Lanes, sub: number, fill: (b0: number) => DH[], fillFrom = 0): DH[] {
  const out: DH[] = [];
  for (let ph = 0; ph < 2; ph++) {
    const p0 = ph * 16;
    for (let k = 0; k < 3; k++) {
      // The first beat after a fill is the landing (added below): the groove's hat and kick there make way for it.
      const b = bar(l, sub, p0 + k * 4);
      out.push(...(ph > 0 && k === 0 ? b.filter((h) => !(h.b === p0 && (h.v === 'hihat' || h.v === 'hhOpen' || h.v === 'ride' || h.v === 'kick'))) : b));
    }
    const f0 = p0 + 12;
    if (fillFrom > 0) out.push(...bar(l, sub, f0, { to: fillFrom }));
    out.push(...fill(f0));
    // The landing: crash + kick together on the next 1.
    const land = p0 + 16;
    out.push({ b: land, v: 'crash', h: 'R', d: 1 }, { b: land, v: 'kick', h: 'R', d: 1 });
  }
  return out;
}

const tomLine = (vs: DrumVoice[], step: number, from: number, sticking = 'RL'): DH[] => {
  const hs = hands(sticking);
  return vs.map((v, i) => ({ b: from + i * step, v, h: hs[i % hs.length], d: step }));
};
const S4 = (v: DrumVoice): DrumVoice[] => [v, v, v, v];
const FILL_BAR: ((b0: number) => DH[])[] = [
  (b0) => tomLine([...S4('snare'), ...S4('snare'), ...S4('snare'), ...S4('snare')], 0.25, b0),
  (b0) => tomLine([...S4('snare'), ...S4('snare'), ...S4('tom1'), ...S4('tom3')], 0.25, b0),
  (b0) => tomLine([...S4('tom1'), ...S4('tom1'), ...S4('tom2'), ...S4('tom3')], 0.25, b0),
];
const FILL_NAME = [t('snare 16ths', 'שש-עשריות על הסנר'), t('snare into the toms', 'מהסנר אל הטומים'), t('toms, high to floor', 'טומים, מגבוה לרצפה')];

// ───────────────────────────── F9 fills & landing ─────────────────────────────

function genFills(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (fill: (b0: number) => DH[], fillFrom: number, en: string, he: string, bpm: number) =>
    finish(s, phraseWithFills(ROCK, 2, fill, fillFrom), { title: t(en, he), bpm, bars: 8, tail: 1, mic: false, goal: { landing: { beats: [16, 32], ms: 20 } } });
  switch (lv) {
    case 1: {
      const vs: DrumVoice[][] = [
        ['snare', 'snare'],
        ['tom1', 'tom2'],
        ['snare', 'tom3'],
      ];
      return fin((b0) => tomLine(vs[op], 0.5, b0 + 3), 3, `One-beat fill → crash + kick on 1 · ${['snare 8ths', 'high to mid tom', 'snare to floor tom'][op]}`, `מעבר של פעמה → קראש + קיק על 1 · ${['שמיניות על הסנר', 'מטום גבוה לאמצעי', 'מהסנר לטום רצפה'][op]}`, 70);
    }
    case 2: {
      const vs: DrumVoice[][] = [
        [...S4('snare'), 'tom1', 'tom1', 'tom2', 'tom2'],
        [...S4('snare'), 'tom1', 'tom1', 'tom3', 'tom3'],
        [...S4('snare'), ...S4('snare')],
      ];
      return fin((b0) => tomLine(vs[op], 0.25, b0 + 2), 2, `Two-beat 16th fill · ${['snare to the toms', 'snare, high tom, floor tom', 'snare only'][op]}`, `מעבר של שתי פעמות בשש-עשריות · ${['מהסנר אל הטומים', 'סנר, טום גבוה, טום רצפה', 'רק סנר'][op]}`, 70);
    }
    case 3: {
      const vs: DrumVoice[][] = [
        [...S4('snare'), ...S4('tom1'), ...S4('tom2'), ...S4('tom3')],
        ['snare', 'snare', 'tom1', 'tom1', 'snare', 'snare', 'tom2', 'tom2', 'snare', 'snare', 'tom3', 'tom3', ...S4('tom3')],
        [...S4('tom1'), ...S4('tom1'), ...S4('tom2'), ...S4('tom3')],
      ];
      return fin((b0) => tomLine(vs[op], 0.25, b0), 0, `One-bar fill around the kit · ${['snare, then down the toms', 'snare between the toms', 'toms, high to floor'][op]}`, `מעבר של תיבה סביב המערכת · ${['סנר, ואז במורד הטומים', 'סנר בין הטומים', 'טומים, מגבוה לרצפה'][op]}`, 70);
    }
    case 4: {
      const T3 = 1 / 3;
      const fills = [
        (b0: number) => tomLine(['snare', 'snare', 'snare'], T3, b0 + 3),
        (b0: number) => tomLine(['snare', 'snare', 'snare', 'tom3', 'tom3', 'tom3'], T3, b0 + 2),
        (b0: number) => tomLine(['snare', 'snare', 'snare', 'tom1', 'tom1', 'tom1', 'tom2', 'tom2', 'tom2', 'tom3', 'tom3', 'tom3'], T3, b0),
      ];
      return fin(fills[op], [3, 2, 0][op], `Triplet fill · ${['one beat', 'two beats', 'a whole bar'][op]}`, `מעבר בטריולות · ${['פעמה אחת', 'שתי פעמות', 'תיבה שלמה'][op]}`, 70);
    }
    default: {
      // L5: fills starting off the beat, on the "&" of 3.
      const vs: DrumVoice[][] = [
        ['snare', 'snare', 'snare', 'snare', 'snare', 'snare'],
        ['tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3'],
        ['snare', 'tom1', 'snare', 'tom2', 'snare', 'tom3'],
      ];
      return fin((b0) => tomLine(vs[op], 0.25, b0 + 2.5), 2.5, `Fill from the "&" of 3 · ${['snare', 'toms', 'snare and toms'][op]}`, `מעבר מה"וְ" של 3 · ${['סנר', 'טומים', 'סנר וטומים'][op]}`, 80);
    }
  }
}

// ───────────────────────────── F14 reading ─────────────────────────────

/** Deterministic random (per item) for the reading lines. */
function rnd(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let x = h;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
/** Beat cells (onsets inside one beat, as fractions) for each reading level. */
const CELLS: Record<number, number[][]> = {
  1: [[0], [0, 0.5], [0.5], [], [0], [0, 0.5]],
  // L2 dotted quarters and syncopation (a quarter on the "&"): two-beat cells (onsets in beats from the cell start).
  2: [[0, 1.5], [0, 1], [0, 0.5, 1.5], [0.5, 1], [0, 1, 1.5]],
  3: [[0, 0.25, 0.5, 0.75], [0, 0.5, 0.75], [0, 0.25, 0.5], [0, 0.75], [0.25, 0.5, 0.75], [0, 0.5]],
  4: [[0, 1 / 3, 2 / 3], [0, 0.5], [0], [0, 1 / 3, 2 / 3], [0, 0.25, 0.5, 0.75]],
};
/** Kit grooves to read (L5): hat / snare / kick lanes in 8ths, two bars each. */
const READ_KIT: Lanes[][] = [
  [{ h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' }, { h: 'xxxxxxxx', s: '..x...x.', k: 'x..xx...' }],
  [{ h: 'x.x.x.x.', s: '..x...x.', k: 'x...x.x.' }, { h: 'xxxxxxxo', s: '..x...x.', k: 'x...x...' }],
  [{ r: 'xxxxxxxx', s: '..x...x.', k: 'x..x.x..' }, { r: 'xxxxxxxx', s: '..x..xx.', k: 'x...x...' }],
  [{ h: 'xxxxxxxx', s: '..x..x.x', k: 'xx..x...' }, { h: 'xxxxxxxx', s: '..x...x.', k: 'x..x..x.' }],
];

function genRead(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  if (lv === 5) {
    const g = READ_KIT[op];
    const hits = rep(4, (k) => bar(g[k % 2], 2, k * 4));
    const open = g.some((x) => x.h?.includes('o'));
    return finish(s, hits, { title: t(`Read a kit groove · ${op + 1}`, `קריאת גרוב למערכת · ${op + 1}`), bpm: 80, bars: 4, mic: false, show: 'staff', goal: open ? { hat: true } : {} });
  }
  const r = rnd(`${s.kind}:${op}`);
  const cells = CELLS[lv];
  const span = lv === 2 ? 2 : 1;
  const hits: DH[] = [];
  for (let b = 0; b < 16; b += span) {
    const c = cells[Math.floor(r() * cells.length)];
    // The first beat of each bar always has a note (easier to read), the last bar ends on 1 of the next if empty.
    const cell = c.length || b % 4 ? c : [0];
    // Sticking by grid position (hand to hand): 8th levels R on the beat, L on the "&"; 16th levels R on 1 and "&", L
    // on "e" and "a"; triplets alternate inside the beat.
    const grid = lv <= 2 ? 2 : 4;
    cell.forEach((x, j) => {
      const g = (x % 1) * grid;
      const h: 'R' | 'L' = Math.abs(g - Math.round(g)) < 1e-6 ? (Math.round(g) % 2 ? 'L' : 'R') : j % 2 ? 'L' : 'R';
      hits.push({ b: b + x, v: 'snare', h, d: 0.25 });
    });
  }
  // Durations: up to the next onset (the staff draws dotted values and rests from these).
  hits.sort((a, b) => a.b - b.b);
  // Written lengths: to the next onset, never past the end of the note's beat (an 8th on the "&" then an 8th rest,
  // not a quarter across the beat) — except L2, whose items are dotted quarters and syncopated quarters on the "&".
  hits.forEach((h, i) => {
    const gap = (hits[i + 1]?.b ?? 16) - h.b;
    const toBeat = Math.ceil(h.b + 1e-6) - h.b;
    h.d = lv === 2 ? (gap >= 1.5 && Number.isInteger(h.b) ? 1.5 : Math.min(1, gap)) : Math.min(gap, toBeat);
  });
  if (lv === 4) {
    // Markings: accents on some beats, ghost notes on some offbeats (velocity bands from the calibration).
    hits.forEach((h, i) => {
      if (Number.isInteger(h.b) && r() < 0.4) h.acc = true;
      else if (!Number.isInteger(h.b) && r() < 0.3 && i % 3 === 1) h.ghost = true;
    });
  }
  const nm = [t('quarters, 8ths and rests', 'רבעים, שמיניות והפסקות'), t('dotted quarters, syncopation', 'רבעים מנוקדים וסינקופות'), t('16th groupings', 'קבוצות של שש-עשריות'), t('triplets, accents, ghost notes', 'טריולות, הדגשות ותווי רפאים')][lv - 1];
  const goal: DrumGoal = lv === 4 ? { accentPos: 0.8, ghost: 0.75 } : {};
  return finish(s, hits, { title: t(`Snare reading · ${nm.en} · ${op + 1}`, `קריאה על הסנר · ${nm.he} · ${op + 1}`), bpm: lv >= 3 ? 60 : 70, bars: 4, mic: true, show: 'staff', goal });
}

// ───────────────────────────── v2 families (DRUMS_AUDIT N1): F6, F7, F10, F12, F13 ─────────────────────────────

/** `bars` bars of one groove bar. */
const gb = (l: Lanes, sub: number, bars: number, o: Parameters<typeof bar>[3] = {}): DH[] => rep(bars, (k) => bar(l, sub, k * 4, o));
/** Hand to hand on the 16th grid: R on the beat and "&", L on "e" and "a". */
const grid16 = (i: number): 'R' | 'L' => (i % 2 ? 'L' : 'R');
const BB = '....x.......x...';

// F6 — funk & ghost notes (16th grid). L1 snare alone (practice pad OK), then hat, a syncopated kick, the 16th hat.
function genFunk(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (hits: DH[], en: string, he: string, bpm: number, goal: DrumGoal, mic = false) => finish(s, hits, { title: t(en, he), bpm, bars: mic ? 4 : 8, mic, goal });
  switch (lv) {
    case 1: {
      const sn = ['.g.gXg.g.g.gXg.g', '...gX..g...gX..g', '.gggX....gggX...'][op];
      const nm = [t('ghosts on "e" and "a"', 'רפאים על "e" ועל "a"'), t('ghosts on "a"', 'רפאים על "a"'), t('ghosts into 2 and 4', 'רפאים לקראת 2 ו-4')][op];
      return fin(gb({ s: sn }, 4, 4, { sHand: grid16 }), `Snare ghosts, accents on 2 and 4 · ${nm.en}`, `תווי רפאים בסנר, הדגשות על 2 ו-4 · ${nm.he}`, 60, { ghost: 0.85, accentPos: 0.85 }, true);
    }
    case 2: {
      const sn = ['...gX......gX...', '....Xg......Xg..', '...gXg.....gXg..'][op];
      const nm = [t('ghost before the backbeat', 'רפאים לפני הביט האחורי'), t('ghost after the backbeat', 'רפאים אחרי הביט האחורי'), t('ghosts around the backbeat', 'רפאים סביב הביט האחורי')][op];
      return fin(gb({ h: 'x.x.x.x.x.x.x.x.', s: sn, k: 'x.......x.......' }, 4, 8), `Ghost notes with hi-hat 8ths · ${nm.en}`, `תווי רפאים עם היי־האט בשמיניות · ${nm.he}`, 70, { ghost: 0.85 });
    }
    case 3: {
      const k = ['x.....x...x.....', 'x..x..x...x..x..', 'x.....xx..x.....'][op];
      return fin(gb({ h: 'x.x.x.x.x.x.x.x.', s: '...gX......gX..g', k }, 4, 8), `Ghost notes and a syncopated kick · variation ${op + 1}`, `תווי רפאים וקיק מסונכפ · וריאציה ${op + 1}`, 70, { ghost: 0.85 });
    }
    default: {
      const sn = ['....X..g.g..X...', '...gX......gX.g.', '..g.X..g..g.X...'][op];
      return fin(gb({ h: 'xxxxxxxxxxxxxxxx', s: sn, k: 'x.....x...x.....' }, 4, 8), `16th hi-hat funk with ghosts · variation ${op + 1}`, `פאנק עם היי־האט בשש-עשריות ורפאים · וריאציה ${op + 1}`, 70, { ghost: 0.85 });
    }
  }
}

// F7 — shuffle & triplet feels (8th-triplet grid: 12 steps a bar).
function genShuffle(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (hits: DH[], en: string, he: string, bpm: number, goal: DrumGoal = {}) => finish(s, hits, { title: t(en, he), bpm, bars: 8, mic: false, goal });
  const SN = '...x.....x..';
  switch (lv) {
    case 1: {
      const l: Lanes = op === 1 ? { r: 'xxxxxxxxxxxx', s: SN, k: 'x.....x.....' } : { h: 'xxxxxxxxxxxx', s: SN, k: op === 2 ? 'x.....x....x' : 'x.....x.....' };
      const nm = [t('hi-hat', 'היי־האט'), t('ride', 'רייד'), t('kick on the last triplet of 4', 'קיק על הטריולה האחרונה של 4')][op];
      return fin(gb(l, 3, 8), `Triplets, snare on 2 and 4 · ${nm.en}`, `טריולות, סנר על 2 ו-4 · ${nm.he}`, 60);
    }
    case 2: {
      const l: Lanes = op === 1 ? { r: 'x.xx.xx.xx.x', s: SN, k: 'x.....x.....' } : { h: 'x.xx.xx.xx.x', s: SN, k: op === 2 ? 'x....xx.....' : 'x.....x.....' };
      const nm = [t('hi-hat', 'היי־האט'), t('ride', 'רייד'), t('kick pickup into 3', 'קיק מוביל ל-3')][op];
      return fin(gb(l, 3, 8), `Shuffle · ${nm.en}`, `שאפל · ${nm.he}`, 80);
    }
    case 3: {
      const k = ['x.....x.....', 'x....xx.....', 'x.x...x.x...'][op];
      return fin(gb({ r: 'xxxxxxxxxxxx', s: SN, k }, 3, 8), `Slow blues, 12/8 feel · variation ${op + 1}`, `בלוז איטי בתחושת 12/8 · וריאציה ${op + 1}`, 50);
    }
    default: {
      // Double (Texas) shuffle: both hands shuffle — the right on the hat / ride, the left on the snare, 2 and 4 accented.
      const top: Lanes = op === 1 ? { r: 'x.xx.xx.xx.x' } : { h: 'x.xx.xx.xx.x' };
      const k = op === 2 ? 'x.....x.....' : 'x..x..x..x..';
      return fin(gb({ ...top, s: 'g.gX.gg.gX.g', k }, 3, 8), `Double shuffle · ${[t('hi-hat', 'היי־האט'), t('ride', 'רייד'), t('kick on 1 and 3', 'קיק על 1 ו-3')][op].en}`, `שאפל כפול · ${[t('hi-hat', 'היי־האט'), t('ride', 'רייד'), t('kick on 1 and 3', 'קיק על 1 ו-3')][op].he}`, 100, { ghost: 0.8 });
    }
  }
}

// F10 — independence: an ostinato over the kick in unison, then generated kick / snare lines to read (Reed-style idea).
/** A generated two-bar line on one lane: per beat one of the cells (onsets in a beat, 16th grid), bar starts on 1. */
function genLine(seed: string, cells: number[][], sub: number): string {
  const r = rnd(seed);
  const steps = Array(8 * sub).fill('.');
  for (let b = 0; b < 8; b++) {
    const c = cells[Math.floor(r() * cells.length)];
    const cell = b % 4 === 0 && !c.includes(0) ? [0, ...c] : c;
    for (const x of cell) steps[Math.round((b + x) * sub)] = 'x';
  }
  return steps.join('');
}
function genIndep(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const two = (l: Lanes, sub: number): DH[] => {
    // A two-bar line: split each lane in halves and alternate them for four bars.
    const half = (x: string, k: number) => x.slice(k * 4 * sub, (k + 1) * 4 * sub);
    return rep(4, (k) => bar(Object.fromEntries(Object.entries(l).map(([n, x]) => [n, x!.length > 4 * sub ? half(x!, k % 2) : x])) as Lanes, sub, k * 4));
  };
  switch (lv) {
    case 1: {
      const l: Lanes = [{ h: 'xxxxxxxx', k: 'xxxxxxxx' }, { h: 'xxxxxxxx', k: 'x.x.x.x.' }, { h: 'x.x.x.x.', k: 'xxxxxxxx' }][op];
      const nm = [t('hat and kick 8ths', 'היי־האט וקיק בשמיניות'), t('hat 8ths, kick quarters', 'היי־האט בשמיניות, קיק ברבעים'), t('hat quarters, kick 8ths', 'היי־האט ברבעים, קיק בשמיניות')][op];
      return finish(s, gb(l, 2, 4), { title: t(`Hands and feet together · ${nm.en}`, `ידיים ורגליים יחד · ${nm.he}`), bpm: 60, bars: 4, mic: false });
    }
    case 2: {
      const k = genLine(`indep2:${op}`, [[0], [0.5], [0, 0.5], [], [0]], 2);
      return finish(s, two({ h: 'x'.repeat(16), k }, 2), { title: t(`Hi-hat 8ths, read the kick (8ths) · ${op + 1}`, `היי־האט בשמיניות, לקרוא את הקיק (שמיניות) · ${op + 1}`), bpm: 60, bars: 4, mic: false, show: 'staff' });
    }
    case 3: {
      const k = genLine(`indep3:${op}`, [[0], [0, 0.75], [0, 0.5], [0.25], [0.5, 0.75], [0.75], []], 4);
      return finish(s, two({ h: 'x.'.repeat(16), k }, 4), { title: t(`Hi-hat 8ths, read the kick (16ths) · ${op + 1}`, `היי־האט בשמיניות, לקרוא את הקיק (שש-עשריות) · ${op + 1}`), bpm: 60, bars: 4, mic: false, show: 'staff' });
    }
    default: {
      const sn = genLine(`indep4:${op}`, [[0.5], [0], [0.25, 0.5], [0.75], [0, 0.75], [0.5, 0.75], []], 4);
      return finish(s, two({ h: 'x.'.repeat(16), s: sn, k: 'x.......x.......'.repeat(2) }, 4), { title: t(`Hi-hat and kick, read the snare · ${op + 1}`, `היי־האט וקיק, לקרוא את הסנר · ${op + 1}`), bpm: 60, bars: 4, mic: false, show: 'staff' });
    }
  }
}

// F12 — Middle-Eastern & Israeli (16th grid): dum → kick (or floor tom), tak → snare (right hand), ka → snare ghost (left).
// Traditional patterns, in 8ths: maqsum D T . T D . T . · baladi D D . T D . T . · sa'idi D T . D D . T . · malfuf (2/4) D . . T . . T .
const ME: Record<'maqsum' | 'baladi' | 'saidi' | 'malfuf', { k: string; s: string; ka: string; en: string; he: string }> = {
  maqsum: { k: 'x.......x.......', s: '..x...x.....x...', ka: '..x.g.x...g.x.g.', en: 'Maqsum', he: 'מקסום' },
  baladi: { k: 'x.x.....x.......', s: '......x.....x...', ka: '....g.x...g.x.g.', en: 'Baladi', he: 'בלדי' },
  saidi: { k: 'x.....x.x.......', s: '..x.........x...', ka: '..x.g.....g.x.g.', en: "Sa'idi", he: 'סעידי' },
  malfuf: { k: 'x.......x.......', s: '...x..x....x..x.', ka: '...x..x....x..x.', en: 'Malfuf', he: 'מלפוף' },
};
const takKa = (_i: number, c: string): 'R' | 'L' => (c === 'g' ? 'L' : 'R');
function genMideast(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (hits: DH[], en: string, he: string, bpm: number, goal: DrumGoal = {}) => finish(s, hits, { title: t(en, he), bpm, bars: 8, mic: false, goal });
  switch (lv) {
    case 1: {
      const r = [ME.malfuf, ME.maqsum, ME.maqsum][op];
      const l: Lanes = op === 2 ? { t3: r.k, s: r.s } : { k: r.k, s: r.s };
      return fin(gb(l, 4, 8, { sHand: takKa }), `${r.en}: dum and tak${op === 2 ? ' · dum on the floor tom' : ''}`, `${r.he}: דום ותק${op === 2 ? ' · הדום על טום הרצפה' : ''}`, 80);
    }
    case 2: {
      if (op === 2) {
        const hits = rep(8, (k) => bar({ k: (k % 2 ? ME.baladi : ME.maqsum).k, s: (k % 2 ? ME.baladi : ME.maqsum).s }, 4, k * 4, { sHand: takKa }));
        return fin(hits, 'Maqsum and baladi, bar by bar', 'מקסום ובלדי, תיבה אחרי תיבה', 80);
      }
      const r = [ME.baladi, ME.saidi][op];
      return fin(gb({ k: r.k, s: r.s }, 4, 8, { sHand: takKa }), `${r.en}: dum and tak`, `${r.he}: דום ותק`, 80);
    }
    case 3: {
      const r = [ME.maqsum, ME.baladi, ME.saidi][op];
      return fin(gb({ k: r.k, s: r.ka }, 4, 8, { sHand: takKa }), `${r.en} with ka (soft left hand)`, `${r.he} עם קה (יד שמאל רכה)`, 80, { ghost: 0.8 });
    }
    default: {
      // The Mizrahi pop kit groove: the rhythm split on the kit — kick dums, snare taks, the hi-hat in 16ths.
      const r = [ME.maqsum, ME.baladi, ME.saidi][op];
      return fin(gb({ h: 'xxxxxxxxxxxxxxxx', k: r.k, s: r.s }, 4, 8), `Mizrahi pop groove on the kit · ${r.en}`, `גרוב פופ מזרחי על המערכת · ${r.he}`, 90);
    }
  }
}

// F13 — feet: the hi-hat foot (GM 44 "pedal") and the kick foot.
function genFeet(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const fin = (hits: DH[], en: string, he: string, bpm: number) => finish(s, hits, { title: t(en, he), bpm, bars: 8, mic: false });
  switch (lv) {
    case 1: {
      const l: Lanes = [{ r: 'x.x.x.x.', p: '..x...x.' }, { s: 'x.x.x.x.', p: '..x...x.' }, { r: 'xxxxxxxx', p: '..x...x.' }][op];
      const nm = [t('ride quarters', 'רייד ברבעים'), t('snare quarters', 'סנר ברבעים'), t('ride 8ths', 'רייד בשמיניות')][op];
      return fin(gb(l, 2, 8, { sHand: (i) => (i % 4 ? 'L' : 'R') }), `Hi-hat foot on 2 and 4 · ${nm.en}`, `רגל היי־האט על 2 ו-4 · ${nm.he}`, 70);
    }
    case 2: {
      const l: Lanes = [{ r: 'xxxxxxxx', s: '..x...x.', k: 'x...x...', p: 'x.x.x.x.' }, { r: 'xxxxxxxx', s: '..x...x.', k: 'x...x...', p: '.x.x.x.x' }, { r: 'xxxxxxxx', s: '..x...x.', k: 'x..xx...', p: '..x...x.' }][op];
      const nm = [t('foot quarters', 'רגל ברבעים'), t('foot on the "&"', 'רגל על ה"וְ"'), t('foot on 2 and 4, kick variation', 'רגל על 2 ו-4, וריאציית קיק')][op];
      return fin(gb(l, 2, 8), `Groove with the hi-hat foot · ${nm.en}`, `גרוב עם רגל ההיי־האט · ${nm.he}`, 80);
    }
    default: {
      const l: Lanes = [{ h: 'x...x...x...x...', s: BB, k: 'x.x.x.x.x.x.x.x.' }, { r: 'x...x...x...x...', s: BB, k: 'x.x.x.x.x.x.x.x.' }, { h: 'x.x.x.x.x.x.x.x.', s: BB, k: 'x.x.x.x.x.x.xxx.' }][op];
      const nm = [t('hi-hat quarters', 'היי־האט ברבעים'), t('ride quarters', 'רייד ברבעים'), t('hi-hat 8ths, a 16th pair at the end', 'היי־האט בשמיניות, זוג שש-עשריות בסוף')][op];
      return fin(gb(l, 4, 8), `Kick 8ths under a groove · ${nm.en}`, `קיק בשמיניות מתחת לגרוב · ${nm.he}`, 60);
    }
  }
}

// ───────────────────────────── dispatch + catalogue ─────────────────────────────

export const isDrumFamily = (f: string): boolean => f.startsWith('d-');

/** Build a drum drill (any 'd-' family). */
export function generateDrums(spec: DrillSpec): Drill {
  const s: DrillSpec = { ...spec, key: 0, instrument: 'drums' };
  switch (s.family as DrumFamilyId) {
    case 'd-strokes':
      return genStrokes(s);
    case 'd-rolls':
      return genRolls(s);
    case 'd-diddles':
      return genDiddles(s);
    case 'd-time':
      return genTime(s);
    case 'd-rock':
      return genRock(s);
    case 'd-fills':
      return genFills(s);
    case 'd-read':
      return genRead(s);
    case 'd-funk':
      return genFunk(s);
    case 'd-shuffle':
      return genShuffle(s);
    case 'd-indep':
      return genIndep(s);
    case 'd-mideast':
      return genMideast(s);
    case 'd-feet':
      return genFeet(s);
    default:
      throw new Error(`Not a drum family: ${s.family}`);
  }
}

/** The v1 families (DRUMS_CURRICULUM §4.3): F1 L1–5, F2 L1–6, F3 L1–4, F4 L1–6, F5 L1–8, F9 L1–5, F14 L1–5. */
export function drumFamilies(): DrumFamilyDef[] {
  const sp =
    (family: DrumFamilyId) =>
    (kind: string, option: number): SpecTemplate => ({ family, kind, option, hands: 'RL', instrument: 'drums' });
  const L = (fam: DrumFamilyId, level: number, en: string, he: string, name: string, variants: number, tempo: [number, number], sub: string, mic: boolean): DrumLevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: t(en, he),
    specs: Array.from({ length: variants }, (_, o) => ({ ...sp(fam)(`${level}:${name}`, o), tempo: tempo[0] })),
    keys: [0],
    tempo,
    sub,
    mic,
  });
  const fam = (id: DrumFamilyId, en: string, he: string, levels: DrumLevelDef[]): DrumFamilyDef => ({ id, title: t(en, he), style: 'classical', genres: ['all'], instruments: ['drums'], levels });
  return [
    fam('d-strokes', 'Strokes & dynamics', 'מכות ודינמיקה', [
      L('d-strokes', 1, 'Even quarters, one hand at a time', 'רבעים שווים, יד אחת בכל פעם', 'quarters', 3, [60, 90], '1/4', true),
      L('d-strokes', 2, 'Even 8ths, one dynamic', 'שמיניות שוות בעוצמה אחת', 'eighths', 3, [60, 100], '1/8', true),
      L('d-strokes', 3, 'Three dynamics on cue (p, mf, f)', 'שלוש עוצמות לפי הסימן (p, mf, f)', 'levels', 3, [70, 70], '1/8', true),
      L('d-strokes', 4, 'Accent and taps', 'הדגשה ונקישות', 'accent', 3, [60, 100], '1/16', true),
      L('d-strokes', 5, 'Moving accent', 'הדגשה נודדת', 'moving', 4, [60, 90], '1/16', true),
    ]),
    fam('d-rolls', 'Singles, doubles, rolls', 'בודדות, כפולות, גלגולים', [
      L('d-rolls', 1, 'Single strokes in 8ths', 'מכות בודדות בשמיניות', 'singles8', 3, [60, 100], '1/8', true),
      L('d-rolls', 2, 'Single strokes in 16ths', 'מכות בודדות בשש-עשריות', 'singles16', 4, [70, 110], '1/16', true),
      L('d-rolls', 3, 'Double strokes in 8ths (RRLL)', 'מכות כפולות בשמיניות (RRLL)', 'doubles8', 3, [60, 90], '1/8', true),
      L('d-rolls', 4, 'Double strokes in 16ths', 'מכות כפולות בשש-עשריות', 'doubles16', 3, [70, 110], '1/16', true),
      L('d-rolls', 5, 'Single-stroke four and seven', 'ארבע ושבע מכות בודדות', 'stroke4', 3, [70, 110], '1/16T', true),
      L('d-rolls', 6, '5-, 7- and 9-stroke rolls (open)', 'גלגולים של 5, 7 ו-9 מכות (פתוחים)', 'roll', 3, [70, 100], '1/16', true),
    ]),
    fam('d-diddles', 'Paradiddles', 'פאראדידלים', [
      L('d-diddles', 1, 'Single paradiddle', 'פאראדידל', 'para', 3, [60, 100], '1/16', true),
      L('d-diddles', 2, 'Paradiddle with accents', 'פאראדידל עם הדגשות', 'para-acc', 3, [70, 110], '1/16', true),
      L('d-diddles', 3, 'Inverted and reverse paradiddles', 'פאראדידל הפוך ומהסוף', 'inverted', 3, [60, 100], '1/16', true),
      L('d-diddles', 4, 'Double paradiddle, paradiddle-diddle', 'פאראדידל כפול, פאראדידל-דידל', 'double', 3, [60, 100], '1/8T', true),
    ]),
    fam('d-time', 'Time & subdivision', 'זמן וחלוקה', [
      L('d-time', 1, 'Quarters with the click', 'רבעים עם הקליק', 'pulse', 3, [60, 120], '1/4', true),
      L('d-time', 2, 'Subdivision ladder', 'סולם חלוקות', 'ladder', 3, [60, 90], 'mixed', true),
      L('d-time', 3, 'Click on 2 and 4 only', 'קליק רק על 2 ו-4', 'on24', 3, [70, 110], '1/8', true),
      L('d-time', 4, 'Gap click: 2 bars on, 2 off', 'קליק עם חורים: 2 תיבות עם, 2 בלי', 'gap22', 3, [70, 100], '1/8', true),
      L('d-time', 5, 'Gap click: 1 bar on, 3 off', 'קליק עם חורים: תיבה עם, 3 בלי', 'gap13', 3, [70, 100], '1/8', true),
      L('d-time', 6, 'Click on the "&" only', 'קליק רק על ה"וְ"', 'offclick', 3, [70, 110], '1/8', true),
    ]),
    fam('d-rock', 'Rock & pop grooves', 'גרובים של רוק ופופ', [
      L('d-rock', 1, 'Basic rock beat', 'קצב רוק בסיסי', 'rock', 3, [70, 110], '1/8', false),
      L('d-rock', 2, 'Kick variations', 'וריאציות קיק', 'kick', 4, [80, 110], '1/8', false),
      L('d-rock', 3, 'Hat quarters, ride, open hat', 'היי־האט ברבעים, רייד, היי־האט פתוח', 'hats', 3, [80, 120], '1/8', false),
      L('d-rock', 4, '16th hi-hat, one hand', 'היי־האט בשש-עשריות ביד אחת', 'hat16', 3, [70, 100], '1/16', false),
      L('d-rock', 5, '16th hi-hat, two hands', 'היי־האט בשש-עשריות בשתי ידיים', 'hat16x2', 3, [80, 110], '1/16', false),
      L('d-rock', 6, 'Half-time, double-time, four on the floor', 'חצי זמן, זמן כפול, ארבע על הרצפה', 'feel', 3, [80, 130], '1/8', false),
      L('d-rock', 7, 'Pop with a 16th kick', 'פופ עם קיק בשש-עשריות', 'pop16', 3, [85, 110], '1/16', false),
      L('d-rock', 8, 'Groove + fill every 4th bar', 'גרוב + מעבר כל תיבה רביעית', 'fill', 3, [80, 120], 'mixed', false),
    ]),
    fam('d-fills', 'Fills & landing', 'מעברים ונחיתה', [
      L('d-fills', 1, 'One-beat fill, land on 1', 'מעבר של פעמה, נחיתה על 1', 'fill1', 3, [70, 110], '1/8', false),
      L('d-fills', 2, 'Two-beat 16th fill', 'מעבר של שתי פעמות בשש-עשריות', 'fill2', 3, [70, 110], '1/16', false),
      L('d-fills', 3, 'One-bar fill around the kit', 'מעבר של תיבה סביב המערכת', 'fill4', 3, [70, 110], '1/16', false),
      L('d-fills', 4, 'Triplet fills', 'מעברים בטריולות', 'fill3', 3, [70, 110], '1/8T', false),
      L('d-fills', 5, 'Fills from the "&" of 3', 'מעברים מה"וְ" של 3', 'offbeat', 3, [80, 110], '1/16', false),
    ]),
    fam('d-read', 'Reading', 'קריאת תווים', [
      L('d-read', 1, 'Snare: quarters, 8ths, rests', 'סנר: רבעים, שמיניות, הפסקות', 'read', 4, [70, 90], '1/8', true),
      L('d-read', 2, 'Snare: dotted quarters, syncopation', 'סנר: רבעים מנוקדים, סינקופות', 'read', 4, [70, 90], '1/8', true),
      L('d-read', 3, 'Snare: 16th groupings', 'סנר: קבוצות של שש-עשריות', 'read', 4, [60, 80], '1/16', true),
      L('d-read', 4, 'Snare: triplets, accents, ghost notes', 'סנר: טריולות, הדגשות ותווי רפאים', 'read', 4, [60, 80], 'mixed', true),
      L('d-read', 5, 'Kit notation: read a groove', 'תווים למערכת: לקרוא גרוב', 'kit', 4, [80, 80], '1/8', false),
    ]),
    // v2 families (DRUMS_AUDIT N1): F6 L1–4, F7 L1–4, F10 L1–4, F12 (own order: dum/tak, baladi/sa'idi, ka, the kit groove), F13 L1–3.
    fam('d-funk', 'Funk & ghost notes', 'פאנק ותווי רפאים', [
      L('d-funk', 1, 'Snare ghosts, accents on 2 and 4', 'רפאים בסנר, הדגשות על 2 ו-4', 'ghosts', 3, [60, 90], '1/16', true),
      L('d-funk', 2, 'Ghost notes with hi-hat 8ths', 'רפאים עם היי־האט בשמיניות', 'hat', 3, [70, 95], '1/16', false),
      L('d-funk', 3, 'Add a syncopated kick', 'מוסיפים קיק מסונכפ', 'kick', 3, [70, 95], '1/16', false),
      L('d-funk', 4, '16th hi-hat funk with ghosts', 'פאנק עם היי־האט בשש-עשריות', 'hat16', 3, [70, 100], '1/16', false),
    ]),
    fam('d-shuffle', 'Shuffle & triplet feels', 'שאפל ותחושת טריולות', [
      L('d-shuffle', 1, 'Triplets on the hat, snare 2 and 4', 'טריולות בהיי־האט, סנר על 2 ו-4', 'triplets', 3, [60, 90], '1/8T', false),
      L('d-shuffle', 2, 'Shuffle', 'שאפל', 'shuffle', 3, [80, 120], '1/8T', false),
      L('d-shuffle', 3, 'Slow blues, 12/8 feel', 'בלוז איטי בתחושת 12/8', 'blues', 3, [50, 66], '1/8T', false),
      L('d-shuffle', 4, 'Double shuffle', 'שאפל כפול', 'double', 3, [100, 140], '1/8T', false),
    ]),
    fam('d-indep', 'Independence', 'עצמאות גפיים', [
      L('d-indep', 1, 'Hands and feet together', 'ידיים ורגליים יחד', 'unison', 3, [60, 100], '1/8', false),
      L('d-indep', 2, 'Read the kick in 8ths', 'לקרוא את הקיק בשמיניות', 'kick8', 4, [60, 100], '1/8', false),
      L('d-indep', 3, 'Read the kick in 16ths', 'לקרוא את הקיק בשש-עשריות', 'kick16', 4, [60, 90], '1/16', false),
      L('d-indep', 4, 'Read the snare over hat and kick', 'לקרוא את הסנר מעל היי־האט וקיק', 'snare', 4, [60, 100], '1/16', false),
    ]),
    fam('d-mideast', 'Middle-Eastern & Mizrahi', 'מקצבים מזרחיים', [
      L('d-mideast', 1, 'Malfuf and maqsum: dum and tak', 'מלפוף ומקסום: דום ותק', 'maqsum', 3, [80, 110], '1/16', false),
      L('d-mideast', 2, "Baladi and sa'idi", 'בלדי וסעידי', 'baladi', 3, [80, 110], '1/16', false),
      L('d-mideast', 3, 'With ka: the soft left hand', 'עם קה: יד שמאל רכה', 'ka', 3, [80, 110], '1/16', false),
      L('d-mideast', 4, 'Mizrahi pop groove on the kit', 'גרוב פופ מזרחי על המערכת', 'kit', 3, [90, 115], '1/16', false),
    ]),
    fam('d-feet', 'Feet', 'רגליים', [
      L('d-feet', 1, 'Hi-hat foot on 2 and 4', 'רגל היי־האט על 2 ו-4', 'chick', 3, [70, 110], '1/4', false),
      L('d-feet', 2, 'Groove with the hi-hat foot', 'גרוב עם רגל ההיי־האט', 'groove', 3, [80, 110], '1/8', false),
      L('d-feet', 3, 'Kick 8ths under a groove', 'קיק בשמיניות מתחת לגרוב', 'kick8', 3, [60, 110], '1/8', false),
    ]),
  ];
}

/** Families shown in microphone (practice pad) mode: only levels whose items are single-surface (§3.8). */
export function micLevels(fams: DrumFamilyDef[]): DrumFamilyDef[] {
  return fams.map((f) => ({ ...f, levels: f.levels.filter((l) => l.mic) })).filter((f) => f.levels.length > 0);
}

// ───────────────────────────── placement probe (§5) ─────────────────────────────

export type DrumSlot = 'pulse' | 'hands' | 'doubles' | 'diddle' | 'dynamics' | 'groove' | 'fill' | 'read';
export type DrumProbe = TechProbe & { slot: DrumSlot; mode?: 'once'; mic: boolean; tempo: number };
const P = (slot: DrumSlot, family: DrumFamilyId, kind: string, option: number, tempo: number, title: T2, mic: boolean, once = true): DrumProbe => ({
  slot,
  family: family as FamilyId,
  spec: { family, kind, option, key: 0, hands: 'RL', instrument: 'drums', tempo },
  title,
  instruments: [],
  mic,
  tempo,
  ...(once ? { mode: 'once' as const } : {}),
});
/** The adaptive probe (~2.5 min): steps 1–5, 7, 8 of §5 (6 and 9 are v2 families). Mic mode runs the snare steps. */
export const DRUM_PROBES: DrumProbe[] = [
  P('pulse', 'd-time', '4:gap22', 1, 80, t('Pulse: quarters through a gap in the click', 'דופק: רבעים דרך חור בקליק'), true),
  P('hands', 'd-rolls', '2:singles16', 0, 70, t('Hands: single strokes, faster each time', 'ידיים: מכות בודדות, מהר יותר בכל פעם'), true, false),
  P('doubles', 'd-rolls', '4:doubles16', 0, 80, t('Doubles (RRLL)', 'כפולות (RRLL)'), true),
  P('diddle', 'd-diddles', '1:para', 0, 80, t('Paradiddle', 'פאראדידל'), true),
  P('dynamics', 'd-strokes', '4:accent', 0, 80, t('Dynamics: accents and taps', 'דינמיקה: הדגשות ונקישות'), true),
  P('groove', 'd-rock', '1:rock', 0, 95, t('Basic groove', 'גרוב בסיסי'), false),
  P('fill', 'd-fills', '3:fill4', 0, 80, t('Fill and land on 1', 'מעבר ונחיתה על 1'), false),
  P('read', 'd-read', '5:kit', 0, 80, t('Read a kit groove', 'לקרוא גרוב למערכת'), false),
];
/** The probes for this setup: mic mode runs the single-surface ones, reading on the snare. */
export function drumProbes(mic: boolean): DrumProbe[] {
  if (!mic) return DRUM_PROBES;
  return [...DRUM_PROBES.filter((p) => p.mic), P('read', 'd-read', '1:read', 0, 70, t('Read a snare line', 'לקרוא שורה לסנר'), true)];
}

/** What a probe take measured (only measured values — no self-report). */
export interface DrumProbeResult {
  verdict: 'clean' | 'almost' | 'not';
  /** Best clean tempo of a staircase probe (hands). */
  best?: number;
  /** Per-limb timing SD worst (ms). */
  sd?: number | null;
  /** The reading probe was the kit groove (MIDI), not the snare line. */
  kit?: boolean;
}

/**
 * Start levels per family from the probe (§5): each step decides its family; a failed easy step skips the harder ones
 * (the UI does that by not running them — a missing result places at level 1). Families without a probe start where
 * the closest probe says, one level lower.
 */
export function placeDrums(r: Partial<Record<DrumSlot, DrumProbeResult>>, families: { id: FamilyId; levels: number }[]): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  const cap = (id: FamilyId, v: number) => {
    const f = families.find((x) => x.id === id);
    if (f) out[id] = Math.max(1, Math.min(f.levels, Math.round(v)));
  };
  const v = (s: DrumSlot) => r[s]?.verdict;
  // F4: L1 / L4 / L6 (the gap held: L4; held tight: L6).
  cap('d-time', v('pulse') === 'clean' ? ((r.pulse?.sd ?? 99) <= 11 ? 6 : 4) : v('pulse') === 'almost' ? 2 : 1);
  // F2: singles 16ths up to ≥ 110 = L3 (singles done); ≥ 90 = L2; doubles clean at 80 → L5.
  const best = r.hands?.best ?? 0;
  let f2 = best >= 110 ? 3 : best >= 90 ? 2 : 1;
  if (f2 >= 3 && v('doubles') === 'clean') f2 = 5;
  else if (f2 >= 3 && v('doubles') === 'almost') f2 = 4;
  cap('d-rolls', f2);
  // F3: paradiddle clean at 80 → L2; almost → L1.
  cap('d-diddles', v('diddle') === 'clean' ? (v('doubles') === 'clean' ? 3 : 2) : 1);
  // F1: accents clean → L5, almost → L4, else L1–2 from the hands.
  cap('d-strokes', v('dynamics') === 'clean' ? 5 : v('dynamics') === 'almost' ? 4 : best >= 90 ? 2 : 1);
  // F5: the basic groove at 95 clean → L3, almost → L2.
  cap('d-rock', v('groove') === 'clean' ? 3 : v('groove') === 'almost' ? 2 : 1);
  // F9: a one-bar fill landed clean → L4, almost → L2.
  cap('d-fills', v('fill') === 'clean' ? 4 : v('fill') === 'almost' ? 2 : 1);
  // F14: kit reading clean → L5; snare reading clean → L3; almost → L2.
  cap('d-read', v('read') === 'clean' ? (r.read?.kit ? 5 : 3) : v('read') === 'almost' ? 2 : 1);
  // v2 families (no probe step yet): level 1; independence one level on from a clean basic groove.
  cap('d-indep', v('groove') === 'clean' ? 2 : 1);
  for (const f of families) if (out[f.id] === undefined && String(f.id).startsWith('d-')) cap(f.id, 1);
  return out;
}
