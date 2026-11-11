// Drums content 0.66 (DRUMS_CURRICULUM §4.2 F8, F11): jazz — the ride pattern with its swing measured, the hi-hat foot
// on 2 and 4, the feathered kick, generated comping lines, the jazz waltz, the up-tempo 2-feel, trading 4s — and Latin
// / Brazilian — bossa nova, samba, son and rumba clave, cascara with the clave, the cha-cha-chá bell, the 6/8 bembé bell
// and baião. Plus the band under the grooves (a bass line on the kick and the comping, behind the headphones gate).
//
// Patterns are the traditional public ones (clave, cascara, bembé bell, bossa clave), written as our own exercises.
// Pure and deterministic. drums.ts helpers are used only inside functions (drums.ts imports this module).

import type { Drill, DrillSpec, DrumGoal } from './types';
import type { BandStyle } from '../band';
import { bar, capToGroups, finish, gb, levelOfKind, rep, rnd, type DH, type Lanes } from './drums';
import { generateJazzMore } from './drumJazz';
import { generateLatinMore } from './drumLatin2';

const t = (en: string, he: string) => ({ en, he });

// ───────────────────────────── the band under a groove ─────────────────────────────

/** Four-bar progressions per style (repeated over the take). */
const CHARTS: Record<string, string[]> = {
  rock: ['A', 'D', 'E', 'A'],
  funk: ['E7', 'E7', 'A7', 'E7'],
  shuffle: ['A7', 'D7', 'A7', 'E7'],
  swing: ['Dm7', 'G7', 'Cmaj7', 'A7'],
  waltz: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
  bossa: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
  latin: ['Am', 'D7', 'Am', 'E7'],
};
/**
 * The band for a groove drill: the comping in `style` and a bass line (roots on the groove's kick; a walking line in
 * swing). Heard only with headphones / a line-in / an e-kit (the existing gate); it never changes what is measured.
 */
export function drumBand(style: BandStyle, bars: number, chart = CHARTS[style] ?? CHARTS.rock, rests?: [number, number][]): Pick<Drill, 'band' | 'chart'> {
  return { band: { style, bass: true, ...(rests ? { rests } : {}) }, chart: Array.from({ length: bars }, (_, i) => chart[i % chart.length]) };
}

/** Mark the ride's skip notes (the last triplet of a beat) as swung. */
const swung = (hits: DH[]): DH[] => hits.map((h) => (h.v === 'ride' && Math.abs((h.b % 1) - 2 / 3) < 1e-6 ? { ...h, swing: true } : h));
/** Swing ratio ranges: medium tempos 58–72 %, up-tempo flatter (52–70 %). */
const SWING = { lo: 0.58, hi: 0.72 };
const SWING_FAST = { lo: 0.52, hi: 0.7 };

// ───────────────────────────── F8 jazz ─────────────────────────────

/** The ride pattern on the 8th-triplet grid (12 steps a bar): 1, 2, the skip note of 2, 3, 4, the skip note of 4. */
const RIDE = 'x..x.xx..x.x';
const RIDE_Q = 'x..x..x..x..';
const FOOT24 = '...x.....x..';
const FEATHER = 'g..g..g..g..';

/** Generated comping: per bar one or two strokes on triplet partials (the beat or its last triplet), seeded per item. */
function compLine(seed: string, bars: number, avoid?: string[]): string[] {
  const r = rnd(seed);
  const out: string[] = [];
  for (let b = 0; b < bars; b++) {
    const steps = Array(12).fill('.');
    const n = 1 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 8; tries++) {
        const at = Math.floor(r() * 4) * 3 + (r() < 0.6 ? 2 : 0);
        if (steps[at] === 'x' || avoid?.[b]?.[at] === 'x') continue;
        steps[at] = 'x';
        break;
      }
    }
    out.push(steps.join(''));
  }
  return out;
}
const perBar = (bars: number, f: (b: number) => Lanes, sub: number, meter = 4): DH[] => rep(bars, (b) => bar(f(b), sub, b * meter));

export function generateJazz(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  // DRUMS_NICHE_PLAN §6.1 (P2): brushes, comping over a form, set-ups and hits, the 2 → 4 switch (drumJazz.ts).
  if (lv >= 9) return generateJazzMore(s);
  const fin = (hits: DH[], en: string, he: string, bpm: number, o: { goal?: DrumGoal; meter?: number; fast?: boolean; band?: Pick<Drill, 'band' | 'chart'>; tail?: number } = {}) => {
    const hs = swung(hits);
    const swingGoal = hs.some((h) => h.swing) ? { swing: o.fast ? SWING_FAST : SWING } : {};
    const meter = o.meter ?? 4;
    return finish(s, hs, { title: t(en, he), bpm, bars: 8, meter, mic: false, tail: o.tail, goal: { ...swingGoal, ...(o.goal ?? {}) }, ...(o.band ?? drumBand(meter === 3 ? 'waltz' : 'swing', 8)) });
  };
  switch (lv) {
    case 1: {
      if (op === 1) return fin(perBar(8, (b) => ({ r: b % 4 < 2 ? RIDE_Q : RIDE }), 3), 'Ride: two bars quarters, two bars the pattern', 'רייד: שתי תיבות רבעים, שתיים התבנית', 100);
      const hits = gb({ r: RIDE }, 3, 8);
      if (op === 2) for (const h of hits) if (Math.abs((h.b % 2) - 1) < 1e-6) h.acc = true;
      return fin(hits, op === 2 ? 'Ride pattern, 2 and 4 leaning' : 'Ride pattern: spang, spang-a-lang', op === 2 ? 'תבנית הרייד, דגש על 2 ו-4' : 'תבנית הרייד: ספאנג, ספאנג-א-לאנג', 100);
    }
    case 2: {
      const l: Lanes = op === 1 ? { r: RIDE, p: FOOT24, rm: '.........x..' } : { r: RIDE, p: FOOT24 };
      if (op === 2) return fin(perBar(8, (b) => ({ r: b % 4 < 2 ? RIDE_Q : RIDE, p: FOOT24 }), 3), 'Ride and hi-hat foot · quarters, then the pattern', 'רייד ורגל היי־האט · רבעים, ואז התבנית', 100);
      return fin(gb(l, 3, 8), `Ride and hi-hat foot on 2 and 4${op === 1 ? ' · cross-stick on 4' : ''}`, `רייד ורגל היי־האט על 2 ו-4${op === 1 ? ' · קרוס־סטיק על 4' : ''}`, 100);
    }
    case 3: {
      // Feathered kick: quarters at pp, felt more than heard (the ghost band of the kick pad).
      const l: Lanes = op === 1 ? { r: RIDE, p: FOOT24, k: FEATHER, rm: '.........x..' } : op === 2 ? { r: RIDE_Q, p: FOOT24, k: FEATHER } : { r: RIDE, p: FOOT24, k: FEATHER };
      const nm = [t('ride, foot, feathered kick', 'רייד, רגל, קיק מרוכך'), t('with cross-stick on 4', 'עם קרוס־סטיק על 4'), t('ride quarters', 'רייד ברבעים')][op];
      return fin(gb(l, 3, 8), `Feathered kick · ${nm.en}`, `קיק מרוכך (פת׳רינג) · ${nm.he}`, 100, { goal: { ghost: 0.85 } });
    }
    case 4:
    case 5: {
      // Comping: generated snare (L4) or snare + kick (L5) lines on triplet partials over ride + foot; each item its own.
      const sn = compLine(`jazz${lv}:s:${op}`, 8);
      const kk = lv === 5 ? compLine(`jazz${lv}:k:${op}`, 8, sn) : null;
      const hits = perBar(8, (b) => ({ r: RIDE, p: FOOT24, s: sn[b], ...(kk ? { k: kk[b] } : {}) }), 3);
      return fin(hits, lv === 4 ? `Comping on the snare · ${op + 1}` : `Comping, snare and kick · ${op + 1}`, lv === 4 ? `קומפינג בסנר · ${op + 1}` : `קומפינג, סנר וקיק · ${op + 1}`, 110);
    }
    case 6: {
      // Jazz waltz (3/4): ride 1, 2, the skip of 2, 3; the hi-hat foot on 2 (or 2 and 3); a soft kick on 1.
      const p = op === 1 ? '...x..x..' : '...x.....';
      const l: Lanes = op === 2 ? { r: 'x..x.xx..', p, k: 'g........', rm: '......x..' } : { r: 'x..x.xx..', p, k: 'g........' };
      const nm = [t('foot on 2', 'רגל על 2'), t('foot on 2 and 3', 'רגל על 2 ו-3'), t('cross-stick on 3', 'קרוס־סטיק על 3')][op];
      return fin(perBar(8, () => l, 3, 3), `Jazz waltz · ${nm.en}`, `ואלס ג׳אז · ${nm.he}`, 120, { meter: 3 });
    }
    case 7: {
      // Up-tempo, a broken 2-feel: the ride flattens out, the foot on 2 and 4, a light kick on 1 and 3.
      const k = 'g.....g.....';
      const l: Lanes = op === 1 ? { r: RIDE, p: FOOT24, k, s: '.....x......' } : op === 2 ? { r: RIDE_Q, p: FOOT24, k } : { r: RIDE, p: FOOT24, k };
      const nm = [t('ride and foot', 'רייד ורגל'), t('a snare push on the skip of 2', 'דחיפת סנר על הדילוג של 2'), t('ride quarters', 'רייד ברבעים')][op];
      return fin(gb(l, 3, 8), `Up-tempo 2-feel · ${nm.en}`, `טמפו מהיר בתחושת 2 · ${nm.he}`, 180, { fast: true });
    }
    default: {
      // Trading 4s: four bars of time, four bars solo (anything — only the landing is measured), crash + kick on the 1.
      const time: Lanes = op === 1 ? { r: RIDE, p: FOOT24, k: FEATHER } : op === 2 ? { r: RIDE, p: FOOT24, s: '.....x.....x' } : { r: RIDE, p: FOOT24 };
      const hits: DH[] = [];
      for (let ph = 0; ph < 2; ph++) {
        const p0 = ph * 32;
        for (let k = 0; k < 4; k++) hits.push(...bar(time, 3, p0 + k * 4).filter((h) => !(ph > 0 && k === 0 && h.b === p0)));
        hits.push({ b: p0 + 32, v: 'crash', h: 'R', d: 1 }, { b: p0 + 32, v: 'kick', h: 'R', d: 1 });
      }
      // 16 bars: the band lays out in the solo bars (8–15 of each 8 bars: beats 16–32 and 48–64).
      const band = drumBand('swing', 16, CHARTS.swing, [
        [16, 32],
        [48, 64],
      ]);
      const nm = [t('ride and foot', 'רייד ורגל'), t('with a feathered kick', 'עם קיק מרוכך'), t('with comping', 'עם קומפינג')][op];
      return finish(s, swung(hits), { title: t(`Trading 4s · ${nm.en}`, `חילופי 4 · ${nm.he}`), bpm: 120, bars: 16, tail: 1, mic: false, goal: { swing: SWING, landing: { beats: [32, 64], ms: 25 }, ...(op === 1 ? { ghost: 0.85 } : {}) }, ...band });
    }
  }
}

// ───────────────────────────── F11 Latin & Brazilian ─────────────────────────────

/** Two-bar patterns on the 8th grid (16 steps): son clave, rumba clave, bossa-nova clave, cascara (2-3). */
const CLAVE = {
  son32: 'x..x..x...x.x...',
  son23: '..x.x...x..x..x.',
  rumba32: 'x..x...x..x.x...',
  bossa32: 'x..x..x...x..x..',
  bossa23: '..x..x..x..x..x.',
};
const CASCARA23 = 'x.x.xx.xx.xx.x.x';
const CASCARA32 = 'x.xx.x.xx.x.xx.x';
/** Kick tumbao (the bass's "&" of 2 and 4) and the bossa kick (1, "&" of 2, 3, "&" of 4) per two bars. */
const TUMBAO = '...x..x....x..x.';
const BOSSA_K = 'x..xx..xx..xx..x';
/** Two-bar lanes repeated over `bars` bars (`sub` steps a beat). */
const two = (l: Lanes, sub: number, bars: number): DH[] => rep(bars / 2, (k) => bar(l, sub, k * 8));

export function generateLatin(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  // DRUMS_NICHE_PLAN §6.2 (owner 2026-11-11): mambo, songo, Mozambique — awaiting a teacher's check (drumLatin2.ts).
  if (lv >= 8) return generateLatinMore(s);
  const fin = (hits: DH[], en: string, he: string, bpm: number, style: BandStyle | null = 'latin', goal: DrumGoal = {}) => finish(s, hits, { title: t(en, he), bpm, bars: 8, mic: false, goal, ...(style ? drumBand(style, 8) : {}) });
  switch (lv) {
    case 1: {
      // Bossa nova: 8ths on the hat (or ride), the bossa clave as a cross-stick, the kick on 1, "&" of 2, 3, "&" of 4.
      const top: Lanes = op === 2 ? { r: 'x'.repeat(16) } : { h: 'x'.repeat(16) };
      const cl = op === 1 ? CLAVE.bossa23 : CLAVE.bossa32;
      const nm = [t('3-2, hi-hat', '3-2, היי־האט'), t('2-3, hi-hat', '2-3, היי־האט'), t('3-2, ride', '3-2, רייד')][op];
      return fin(two({ ...top, rm: cl, k: BOSSA_K }, 2, 8), `Bossa nova · ${nm.en}`, `בוסה נובה · ${nm.he}`, 110, 'bossa');
    }
    case 2: {
      // Samba (feel in 2): the kick on each beat and the "a" before it, the hi-hat foot on the "&"s; then the hands.
      const k = 'x..xx..xx..xx..x';
      const p = '..x...x...x...x.';
      if (op === 0) return fin(gb({ k, p }, 4, 8), 'Samba feet: kick and hi-hat foot', 'רגלי סמבה: קיק ורגל היי־האט', 80);
      if (op === 1) return fin(gb({ k, p, s: 'xxxXxxxXxxxXxxxX' }, 4, 8, { sHand: (i) => (i % 2 ? 'L' : 'R') }), 'Samba · snare 16ths, accent on the "a"', 'סמבה · סנר בשש-עשריות, הדגשה על ה-"a"', 80);
      return fin(gb({ k, p, r: 'x.x.x.x.x.x.x.x.' }, 4, 8), 'Samba · ride 8ths over the feet', 'סמבה · רייד בשמיניות מעל הרגליים', 80);
    }
    case 3: {
      // Son clave 3-2 and 2-3, and the rumba clave, as a cross-stick under ride quarters.
      const cl = [CLAVE.son32, CLAVE.son23, CLAVE.rumba32][op];
      const nm = [t('son 3-2', 'סון 3-2'), t('son 2-3', 'סון 2-3'), t('rumba 3-2', 'רומבה 3-2')][op];
      return fin(two({ r: 'x.x.x.x.x.x.x.x.', rm: cl }, 2, 8), `Clave on the cross-stick · ${nm.en}`, `קלאבה בקרוס־סטיק · ${nm.he}`, 90);
    }
    case 4: {
      // Cascara (the timbale-shell pattern, here on the ride) with the clave in the left hand; then the kick tumbao.
      const l: Lanes = op === 1 ? { r: CASCARA32, rm: CLAVE.son32 } : op === 2 ? { r: CASCARA23, rm: CLAVE.son23, k: TUMBAO } : { r: CASCARA23, rm: CLAVE.son23 };
      const nm = [t('2-3', '2-3'), t('3-2', '3-2'), t('2-3 with the kick tumbao', '2-3 עם טומבאו בקיק')][op];
      return fin(two(l, 2, 8), `Cascara and clave · ${nm.en}`, `קסקרה וקלאבה · ${nm.he}`, 90);
    }
    case 5: {
      // The cha-cha-chá bell: quarter notes on the bell (the ride's bell), over the clave and the kick tumbao.
      const l: Lanes = op === 1 ? { r: 'x.x.x.x.x.x.x.x.', rm: CLAVE.son23 } : op === 2 ? { r: 'x.x.x.x.x.x.x.x.', rm: CLAVE.son32, k: TUMBAO } : { r: 'x.x.x.x.x.x.x.x.', rm: CLAVE.son32 };
      const nm = [t('clave 3-2', 'קלאבה 3-2'), t('clave 2-3', 'קלאבה 2-3'), t('3-2 with the kick tumbao', '3-2 עם טומבאו בקיק')][op];
      return fin(two(l, 2, 8), `Cha-cha-chá bell · ${nm.en}`, `פעמון צ׳ה-צ׳ה-צ׳ה · ${nm.he}`, 100);
    }
    case 6: {
      // Afro-Cuban 6/8: the bembé bell (x.x.xx.x.x.x over two bars of 6/8, ♪ = eighths), kick on the dotted quarters.
      const bell = 'x.x.xx.x.x.x';
      const l: Lanes = op === 2 ? { h: bell, k: 'x..x..x..x..' } : op === 1 ? { r: bell, k: 'x..x..x..x..', p: '...x.....x..' } : { r: bell, k: 'x..x..x..x..' };
      const hits = capToGroups(rep(4, (k) => bar(l, 1, k * 12, { maxD: 3 })), 6, [3, 3]);
      const nm = [t('bell on the ride', 'פעמון ברייד'), t('with the hi-hat foot', 'עם רגל ההיי־האט'), t('bell on the hi-hat', 'פעמון בהיי־האט')][op];
      return finish(s, hits, { title: t(`6/8 bembé · ${nm.en}`, `במבה 6/8 · ${nm.he}`), bpm: 240, bars: 8, meter: 6, pulse: 8, groups: [3, 3], mic: false });
    }
    default: {
      // Baião: the zabumba's dotted 8th + 16th on the kick, cross-stick on 2 and 4 (the "&" of the 2/4 bar), the
      // triangle on the hat.
      const k = 'x..x....x..x....';
      const l: Lanes = op === 1 ? { h: 'x.x.x.x.x.x.x.x.', k, rm: '....x.......x...', p: '..x...x...x...x.' } : op === 2 ? { h: 'x'.repeat(16), k, rm: '....x.......x...' } : { h: 'x.x.x.x.x.x.x.x.', k, rm: '....x.......x...' };
      const nm = [t('hi-hat 8ths', 'היי־האט בשמיניות'), t('with the hi-hat foot', 'עם רגל ההיי־האט'), t('hi-hat 16ths', 'היי־האט בשש-עשריות')][op];
      return fin(gb(l, 4, 8), `Baião · ${nm.en}`, `באיון · ${nm.he}`, 90);
    }
  }
}
