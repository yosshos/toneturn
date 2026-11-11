// The drummer's ear `d-ear` (DRUMS_CURRICULUM §6 rank 10, DRUMS 0.66): call and response inside one take, like the bass
// ear. The app plays a rhythm, a groove or a fill on its own drum sounds (the `listen` part, hidden notes, the take's
// "Listen" bars), then the player answers ON THE KIT (or the pad) in the "You" bars — measured like every drum take.
// Kinds: echo a snare rhythm (8ths, 16ths), echo a groove, echo a groove + fill and land on 1, spot the changed bar and
// play it, name a style by ear (continue it, then pick its name), and dictation (play it back, then write it on a step
// grid). The written / picked part can only lower the take's verdict. All material is generated per item.
//
// Pure and deterministic. drums.ts helpers are used only inside functions (drums.ts imports this module).

import type { Drill, DrillSpec, DrumVoice, TakeMetrics } from './types';
import type { PercKind } from '../lesson';
import { VOICE_NOTE } from '../drumKit';
import { bar, finish, levelOfKind, rnd, type DH, type Lanes } from './drums';

const t = (en: string, he: string) => ({ en, he });
type LN = NonNullable<Drill['listen']>['notes'][number];

const PERC: Record<DrumVoice, PercKind> = { kick: 'kick', snare: 'snare', rim: 'rim', hihat: 'hat', hhOpen: 'hat-open', hhPedal: 'hat-foot', ride: 'ride', crash: 'crash', tom1: 'tom-hi', tom2: 'tom-hi', tom3: 'tom-lo' };
/** The app's drum sounds for a call: accents louder, ghosts soft. */
export const callOf = (hits: DH[]): LN[] =>
  hits.map((h) => ({ beat: h.b, dur: Math.min(h.d ?? 0.5, 0.5), midi: [VOICE_NOTE[h.v]], perc: h.ghost && h.v === 'snare' ? 'snare-soft' : PERC[h.v], vel: h.acc ? 0.8 : h.ghost ? 0.25 : h.v === 'hihat' || h.v === 'ride' ? 0.4 : 0.6 }));
const shift = (hits: DH[], b0: number): DH[] => hits.map((h) => ({ ...h, b: h.b + b0 }));

/** A one-bar snare rhythm from beat cells (8th or 16th grid), hand to hand by grid place; beat 1 always sounds. */
function snareBar(r: () => number, cells: number[][], grid: 2 | 4, acc = false): DH[] {
  const out: DH[] = [];
  for (let b = 0; b < 4; b++) {
    let c = cells[Math.floor(r() * cells.length)];
    if (b === 0 && !c.includes(0)) c = [0, ...c];
    c.forEach((x, j) => {
      const next = c[j + 1] ?? 1;
      const g = Math.round(x * grid);
      out.push({ b: b + x, v: 'snare', h: g % 2 ? 'L' : 'R', d: Math.min(next - x, 1 - x), ...(acc && x === 0 && r() < 0.5 ? { acc: true } : {}) });
    });
  }
  return out;
}
const CELLS8 = [[0], [0, 0.5], [0.5], [0, 0.5], [0]];
const CELLS16 = [[0, 0.25, 0.5, 0.75], [0, 0.5], [0, 0.75], [0, 0.25, 0.5], [0, 0.5, 0.75], [0.5], [0, 0.25]];

/** A generated one-bar groove: hat 8ths, the backbeat (sometimes an extra snare), a kick figure. */
const KICKS = ['x...x...', 'x..xx...', 'x...xx..', 'xx..x...', 'x...x..x', 'x..x..x.', 'x.x.x...', 'x..x.x..'];
function grooveLanes(r: () => number): Lanes {
  const s = r() < 0.3 ? '..x..xx.' : '..x...x.';
  return { h: 'xxxxxxxx', s, k: KICKS[Math.floor(r() * KICKS.length)] };
}
const groove = (l: Lanes, b0: number): DH[] => bar(l, 2, b0);
/** A one-bar fill: the groove to beat 2 (or 3), then 16ths or 8ths around the kit. */
function fillBar(l: Lanes, b0: number, kind: number): DH[] {
  const from = kind === 0 ? 3 : 2;
  const vs: DrumVoice[] = kind === 0 ? ['snare', 'snare', 'snare', 'snare'] : kind === 1 ? ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3', 'tom3'] : ['snare', 'snare', 'tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3'];
  return [...bar(l, 2, b0, { to: from }), ...vs.map((v, i) => ({ b: b0 + from + i * 0.25, v, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: 0.25 }))];
}

/** Styles to name by ear (one bar, or two for the bossa clave). */
const STYLES: { id: string; name: { en: string; he: string }; sub: number; bars: 1 | 2; l: Lanes }[] = [
  { id: 'rock', name: t('Rock', 'רוק'), sub: 2, bars: 1, l: { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' } },
  { id: 'shuffle', name: t('Shuffle', 'שאפל'), sub: 3, bars: 1, l: { h: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' } },
  { id: 'funk', name: t('Funk', 'פאנק'), sub: 4, bars: 1, l: { h: 'xxxxxxxxxxxxxxxx', s: '....X..g.g..X...', k: 'x.....x...x.....' } },
  { id: 'bossa', name: t('Bossa nova', 'בוסה נובה'), sub: 2, bars: 2, l: { h: 'x'.repeat(16), rm: 'x..x..x...x..x..', k: 'x..xx..xx..xx..x' } },
  { id: 'maqsum', name: t('Maqsum (Mizrahi)', 'מקסום (מזרחי)'), sub: 4, bars: 1, l: { h: 'xxxxxxxxxxxxxxxx', k: 'x.......x.......', s: '..x...x.....x...' } },
  { id: 'swing', name: t('Jazz swing', 'סווינג ג׳אז'), sub: 3, bars: 1, l: { r: 'x..x.xx..x.x', p: '...x.....x..' } },
];
const styleBars = (st: (typeof STYLES)[number], bars: number, b0: number): DH[] => {
  const out: DH[] = [];
  for (let k = 0; k < bars; k += st.bars) out.push(...bar(st.l, st.sub, b0 + k * 4, { sHand: (_i, c) => (c === 'g' ? 'L' : 'L') }));
  return out;
};

/** A one-bar groove with one change (for "spot the changed bar"). */
const CHANGES: { name: { en: string; he: string }; f: (l: Lanes) => Lanes }[] = [
  { name: t('a kick on the "&" of 3', 'קיק על ה"וְ" של 3'), f: (l) => ({ ...l, k: l.k!.slice(0, 5) + 'x' + l.k!.slice(6) }) },
  { name: t('a snare on the "&" of 4', 'סנר על ה"וְ" של 4'), f: (l) => ({ ...l, s: l.s!.slice(0, 7) + 'x' }) },
  { name: t('an open hat on the "&" of 4', 'היי־האט פתוח על ה"וְ" של 4'), f: (l) => ({ ...l, h: l.h!.slice(0, 7) + 'o' }) },
  { name: t('the kick on 3 moved to the "&"', 'הקיק של 3 זז ל"וְ"'), f: (l) => ({ ...l, k: l.k!.slice(0, 4) + '.x' + l.k!.slice(6) }) },
];

const ASK = {
  echo: t('Listen to one bar, then play it back', 'הקשיבו לתיבה אחת, ואז נגנו אותה בחזרה'),
  echo2: t('Listen to the groove, then play it back', 'הקשיבו לגרוב, ואז נגנו אותו בחזרה'),
  fill: t('Listen: a groove bar and a fill. Play both, land on 1', 'הקשיבו: תיבת גרוב ומעבר. נגנו את שתיהן, נחיתה על 1'),
  spot: t('Three bars the same, the 4th changes. Play the 4th, twice', 'שלוש תיבות זהות, הרביעית משתנה. נגנו את הרביעית, פעמיים'),
  style: t('Name the style in your head, keep it going. Then pick it', 'זהו את הסגנון בראש, והמשיכו אותו. אחר כך בחרו אותו'),
  write: t('Listen twice, play it twice, then write it', 'הקשיבו פעמיים, נגנו פעמיים, ואז כתבו'),
};

function ear(s: DrillSpec, answer: DH[], calls: DH[], windows: [number, number][], ask: { en: string; he: string }, title: { en: string; he: string }, bars: number, bpm: number, mic: boolean, extra: Partial<Parameters<typeof finish>[2]> = {}): Drill {
  return finish(s, answer, { title, bpm, bars, mic, show: 'none', listen: { notes: callOf(calls), windows, ask }, ...extra });
}

/** The step grid of one bar of hits, per voice in the order given. */
function gridOf(hits: DH[], voices: DrumVoice[], sub: number): { voice: DrumVoice; steps: boolean[] }[] {
  return voices.map((v) => {
    const steps = Array(4 * sub).fill(false);
    for (const h of hits) if ((h.v === v || (v === 'hihat' && h.v === 'hhOpen')) && h.b < 4 - 1e-6) steps[Math.round(h.b * sub)] = true;
    return { voice: v, steps };
  });
}

export function generateDrumEar(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const r = rnd(`d-ear:${s.kind}:${op}`);
  switch (lv) {
    case 1:
    case 2: {
      // Echo a snare rhythm: four rounds of one bar to hear, one bar to play.
      const calls: DH[] = [];
      const ans: DH[] = [];
      const win: [number, number][] = [];
      for (let k = 0; k < 4; k++) {
        const one = lv === 1 ? snareBar(r, CELLS8, 2) : snareBar(r, CELLS16, 4, true);
        calls.push(...shift(one, k * 8));
        ans.push(...shift(one, k * 8 + 4));
        win.push([k * 8, k * 8 + 4]);
      }
      const nm = lv === 1 ? t('8ths', 'שמיניות') : t('16ths', 'שש-עשריות');
      return ear(s, ans, calls, win, ASK.echo, t(`Echo a snare rhythm · ${nm.en} · ${op + 1}`, `הד למקצב סנר · ${nm.he} · ${op + 1}`), 8, lv === 1 ? 70 : 60, true);
    }
    case 3: {
      // Snare dictation: hear one bar twice, play it twice, write it on the 16th grid.
      const one = snareBar(r, op === 0 ? CELLS8 : CELLS16, op === 0 ? 2 : 4);
      const calls = [...one, ...shift(one, 4)];
      const ans = [...shift(one, 8), ...shift(one, 12)];
      return ear(s, ans, calls, [[0, 8]], ASK.write, t(`Snare dictation · ${op + 1}`, `הכתבה בסנר · ${op + 1}`), 4, 60, true, { drumWrite: { kind: 'grid', sub: 4, beats: 4, lanes: gridOf(one, ['snare'], 4) } });
    }
    case 4: {
      // Echo a groove: two rounds, each a new groove heard twice, then played twice.
      const calls: DH[] = [];
      const ans: DH[] = [];
      const win: [number, number][] = [];
      for (let k = 0; k < 2; k++) {
        const l = grooveLanes(r);
        calls.push(...groove(l, k * 16), ...groove(l, k * 16 + 4));
        ans.push(...groove(l, k * 16 + 8), ...groove(l, k * 16 + 12));
        win.push([k * 16, k * 16 + 8]);
      }
      return ear(s, ans, calls, win, ASK.echo2, t(`Echo a groove · ${op + 1}`, `הד לגרוב · ${op + 1}`), 8, 70, false);
    }
    case 5: {
      // Echo a groove + fill and land: hear a groove bar and a fill bar, play both, crash + kick on the next 1.
      const calls: DH[] = [];
      const ans: DH[] = [];
      const win: [number, number][] = [];
      for (let k = 0; k < 2; k++) {
        const l = grooveLanes(r);
        const kind = (op + k) % 3;
        const two = [...groove(l, 0), ...fillBar(l, 4, kind)];
        calls.push(...shift(two, k * 16));
        // The landing on the next round's 1 replaces the groove's first hat / kick of the call there (it is the answer).
        ans.push(...shift(two, k * 16 + 8), { b: k * 16 + 16, v: 'crash', h: 'R', d: 1 }, { b: k * 16 + 16, v: 'kick', h: 'R', d: 1 });
        win.push([k * 16, k * 16 + 8]);
      }
      return ear(s, ans, calls, win, ASK.fill, t(`Echo a groove and fill · ${op + 1}`, `הד לגרוב ומעבר · ${op + 1}`), 8, 70, false, { tail: 1, goal: { landing: { beats: [16, 32], ms: 25 } } });
    }
    case 6: {
      // Spot the changed bar: A A A B, then play B twice. Two rounds, two different changes.
      const calls: DH[] = [];
      const ans: DH[] = [];
      const win: [number, number][] = [];
      const names: string[] = [];
      for (let k = 0; k < 2; k++) {
        const a: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: k ? 'x...x...' : 'x..xx...' };
        const ch = CHANGES[(op + k * 2) % CHANGES.length];
        const b = ch.f(a);
        const b0 = k * 24;
        calls.push(...groove(a, b0), ...groove(a, b0 + 4), ...groove(a, b0 + 8), ...groove(b, b0 + 12));
        ans.push(...groove(b, b0 + 16), ...groove(b, b0 + 20));
        win.push([b0, b0 + 16]);
        names.push(ch.name.en);
      }
      return ear(s, ans, calls, win, ASK.spot, t(`Spot the change · ${op + 1}`, `לזהות את השינוי · ${op + 1}`), 12, 80, false, { goal: { hat: ans.some((h) => h.v === 'hhOpen') } });
    }
    case 7: {
      // Style by ear: two bars of a style to hear (nothing named), four bars to keep it going, then pick its name.
      const st = STYLES[op];
      const others = STYLES.filter((x) => x !== st);
      // Three other styles and the answer, in a seeded order (Fisher–Yates).
      const shuffle = <T,>(xs: T[]): T[] => {
        const out = [...xs];
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      };
      const opts = shuffle([st, ...shuffle(others).slice(0, 3)]);
      const calls = styleBars(st, 2, 0);
      const ans = styleBars(st, 4, 8);
      return ear(s, ans, calls, [[0, 8]], ASK.style, t(`Style by ear · ${op + 1}`, `סגנון בשמיעה · ${op + 1}`), 6, 80, false, { drumWrite: { kind: 'pick', options: opts.map((o) => o.name), answer: opts.indexOf(st) } });
    }
    default: {
      // Kit dictation: hear one bar twice, play it twice, then write hi-hat, snare and kick on the grid (8ths; the last
      // item 16ths for the kick).
      const sixteen = op === 3;
      const l = grooveLanes(r);
      const ll: Lanes = sixteen ? { h: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', k: ['x.....x.x.......', 'x..x..x...x.....', 'x.....x...x..x..'][Math.floor(r() * 3)] } : l;
      const sub = sixteen ? 4 : 2;
      const one = bar(ll, sub, 0);
      const calls = [...one, ...shift(one, 4)];
      const ans = [...shift(one, 8), ...shift(one, 12)];
      return ear(s, ans, calls, [[0, 8]], ASK.write, t(`Groove dictation · ${op + 1}`, `הכתבת גרוב · ${op + 1}`), 4, 70, false, { drumWrite: { kind: 'grid', sub, beats: 4, lanes: gridOf(one, ['hihat', 'snare', 'kick'], sub) } });
    }
  }
}

/** A written grid / a picked name, graded (the same shape as the bass transcription grade). */
export interface DrumWriteGrade {
  ok: number;
  total: number;
  /** Grid: per lane and step, right / wrong / empty-right (null). Pick: the chosen option. */
  cells?: (boolean | null)[][];
  picked?: number;
}
/** Grade a step grid: each written note right, each missing or extra one wrong. */
export function gradeGrid(want: { steps: boolean[] }[], got: boolean[][]): DrumWriteGrade {
  let ok = 0;
  let total = 0;
  const cells = want.map((l, i) =>
    l.steps.map((w, k) => {
      const g = !!got[i]?.[k];
      if (w || g) total++;
      if (w && g) ok++;
      return w || g ? w === g : null;
    }),
  );
  return { ok, total, cells };
}
/**
 * The take's verdict with the written / picked part: the played answer AND the written one must be right. A wrong grid
 * cell or a wrong name keeps a clean take from counting (it becomes "almost"); it never raises a verdict.
 */
export function withDrumWrite(m: TakeMetrics, g: DrumWriteGrade, drill: Drill): TakeMetrics {
  const written = { ok: g.ok, total: g.total };
  if (g.ok === g.total) return { ...m, written };
  const w = drill.drumWrite;
  const why = w?.kind === 'pick' ? { en: `It was ${w.options[w.answer].en}.`, he: `זה היה ${w.options[w.answer].he}.` } : { en: `Written: ${g.ok}/${g.total} right.`, he: `בכתב: ${g.ok}/${g.total} נכונים.` };
  return { ...m, written, verdict: m.verdict === 'clean' ? 'almost' : m.verdict, why: m.verdict === 'clean' ? why : { en: `${m.why.en} ${why.en}`, he: `${m.why.he} ${why.he}` } };
}
