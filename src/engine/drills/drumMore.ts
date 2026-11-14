// The rest of the drums curriculum (docs/research/DRUMS_NICHE_PLAN.md §6.3, P2 / P3): the 34 levels of
// DRUMS_CURRICULUM.md §4.2 that were neither built nor absorbed by d-song / d-prog / d-read 6–10.
//
//   d-strokes 6–8   accented triplets · crescendo / decrescendo (a measured velocity line) · ghost / accent duel
//   d-rolls 7–10    triplet ↔ 16th switch · speed ladder · endurance · double-stroke roll 16ths → 32nds
//   d-diddles 10    the paradiddle on the kit
//   d-time 7–9      slow time ♩50 · the pocket (behind / on / ahead) · the click on 1 only, then every other bar
//   d-rock 9        punk 8ths endurance
//   d-funk 5–8      open-hat barks · the ghost-note shuffle · boom-bap with the lazy snare · go-go and second line
//   d-shuffle 5–8   the swing-ratio dial · reggae one-drop · steppers and rockers · the half-time shuffle
//   d-fills 6–8     flam / accent fills into an anticipated crash · the fill length called · an improvised fill
//   d-indep 5–8     ostinato with the reading limb swapped · 3-way jazz · 4-way (samba / baião feet) · clave over a groove
//   d-feet 4–8      kick doubles · the foot splash · double pedal · double bass 16ths (endurance) · triplets and gallops
//   d-read 11       an exam-style unseen (8 bars, 30 s to study) — F14 L6 (a kit groove + fill) is d-read 10
//
// Mambo, songo and Mozambique stay unbuilt until a teacher checks the patterns (plan §6.2). Our own material,
// generated per item (seeded); patterns are common practice (grooves, rudiments), never anyone's exercises. Pure.

import type { Drill, DrillSpec, DrumGoal, DrumVoice } from './types';
import { bar, finish, gb, levelOfKind, line, rep, rnd, type DH, type Lanes } from './drums';
import { drumBand } from './drumStyles';

const t = (en: string, he: string) => ({ en, he });
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const alt = (i: number): 'R' | 'L' => (i % 2 ? 'L' : 'R');
const T3 = 1 / 3;

/** The new levels per family: the first level number handled here (drums.ts dispatches these before its own). */
export const MORE_FROM: Record<string, number> = { 'd-strokes': 6, 'd-rolls': 7, 'd-diddles': 10, 'd-time': 7, 'd-rock': 9, 'd-funk': 5, 'd-shuffle': 5, 'd-fills': 6, 'd-indep': 5, 'd-feet': 4, 'd-read': 11 };

/** A drum drill of the P2 levels, or null when the family / level is not one of them. */
export function generateMore(s: DrillSpec): Drill | null {
  const from = MORE_FROM[s.family];
  const lv = levelOfKind(s.kind);
  if (from === undefined || lv < from) return null;
  switch (s.family) {
    case 'd-strokes':
      return strokes(s, lv);
    case 'd-rolls':
      return rolls(s, lv);
    case 'd-diddles':
      return diddleKit(s);
    case 'd-time':
      return time(s, lv);
    case 'd-rock':
      return punk(s);
    case 'd-funk':
      return funk(s, lv);
    case 'd-shuffle':
      return shuffle(s, lv);
    case 'd-fills':
      return fills(s, lv);
    case 'd-indep':
      return indep(s, lv);
    case 'd-feet':
      return feet(s, lv);
    case 'd-read':
      return exam(s);
    default:
      return null;
  }
}

/** Lanes from 16-step strings marked per 16th, on the swung-16th grid (6 steps a beat): 1 e & a → steps 0, 2, 3, 5. */
const swung16 = (l: Lanes): Lanes =>
  Object.fromEntries(Object.entries(l).map(([k, x]) => [k, (x!.match(/.{4}/g) ?? []).map((q) => `${q[0]}.${q[1]}${q[2]}.${q[3]}`).join('')])) as Lanes;

// ───────────────────────────── F1 strokes & dynamics 6–8 ─────────────────────────────

function strokes(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  switch (lv) {
    case 6: {
      // Accented triplets (Moeller-style down–tap–up): 8th triplets, the first of each group of three accented.
      const st = ['RLRLRL', 'R', 'L'][op];
      const nm = [t('alternating, the accent changes hands', 'לסירוגין, ההדגשה עוברת בין הידיים'), t('right hand alone', 'יד ימין לבד'), t('left hand alone', 'יד שמאל לבד')][op];
      return finish(s, line(st, 48, T3, 0, (i) => (i % 3 === 0 ? { acc: true } : {})), { title: t(`Accented triplets · ${nm.en}`, `טריולות עם הדגשה · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { accentPos: 0.9, accentGap: 0.35, tapCv: 0.15 } });
    }
    case 7: {
      // Crescendo / decrescendo on 16ths: the velocity line is measured (smooth: R² ≥ 0.8; wide: ≥ half the range).
      const plans: { from: number; to: number; dir: 1 | -1 }[][] = [
        [{ from: 0, to: 8, dir: 1 }, { from: 8, to: 16, dir: -1 }],
        [{ from: 0, to: 8, dir: -1 }, { from: 8, to: 16, dir: 1 }],
        [{ from: 0, to: 4, dir: 1 }, { from: 4, to: 8, dir: -1 }, { from: 8, to: 12, dir: 1 }, { from: 12, to: 16, dir: -1 }],
      ];
      const zones = plans[op];
      // The dynamic each zone starts from is written under its first note (p before a crescendo, f before a decrescendo).
      const hits = line('RL', 64, 0.25, 0, (i) => {
        const z = zones.find((x) => Math.abs(x.from - i / 4) < 1e-9);
        return z ? { dyn: z.dir > 0 ? ('p' as const) : ('f' as const) } : {};
      });
      const nm = [t('2 bars up, 2 bars down', '2 תיבות עולה, 2 תיבות יורדת'), t('2 bars down, 2 bars up', '2 תיבות יורדת, 2 תיבות עולה'), t('one bar each way', 'תיבה לכל כיוון')][op];
      return finish(s, hits, { title: t(`Crescendo and decrescendo · ${nm.en}`, `קרשנדו ודקרשנדו · ${nm.he}`), bpm: 70, bars: 4, mic: true, goal: { swell: { zones, r2: 0.8, range: 0.5 } } });
    }
    default: {
      // Ghost / accent duel: accents at f, every other stroke a ghost (pp) — two bands as far apart as possible.
      const pat = ['XgggXgggXgggXggg', 'XggXggXggXggXgXg', 'XggXggXgXggXggXg'][op];
      const nm = [t('accent on the beat', 'הדגשה על הפעמה'), t('3 + 3 + 3 + 3 + 2 + 2', '3 + 3 + 3 + 3 + 2 + 2'), t('3 + 3 + 2, twice', '3 + 3 + 2, פעמיים')][op];
      const hits = line('RL', 64, 0.25, 0, (i) => (pat[i % 16] === 'X' ? { acc: true } : { ghost: true }));
      return finish(s, hits, { title: t(`Ghosts against accents · ${nm.en}`, `רפאים מול הדגשות · ${nm.he}`), bpm: 70, bars: 4, mic: true, goal: { ghost: 0.9, accentPos: 0.9 } });
    }
  }
}

// ───────────────────────────── F2 singles, doubles, rolls 7–10 ─────────────────────────────

function rolls(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  switch (lv) {
    case 7: {
      // Triplets ↔ 16ths, switching at every bar line (or every two beats): the switch itself is measured as timing.
      const per = op === 2 ? 2 : 4;
      const hits: DH[] = [];
      for (let b = 0; b < 16; b += per) {
        const tri = ((b / per) % 2 === 0) === (op !== 1);
        hits.push(...line('RL', tri ? per * 3 : per * 4, tri ? T3 : 0.25, b, (i) => (i === 0 ? { acc: true } : {})));
      }
      const nm = [t('triplets first, a bar each', 'טריולות קודם, תיבה לכל אחת'), t('16ths first, a bar each', 'שש-עשריות קודם, תיבה לכל אחת'), t('every two beats', 'כל שתי פעמות')][op];
      return finish(s, hits, { title: t(`Triplets and 16ths, switching · ${nm.en}`, `טריולות ושש-עשריות לסירוגין · ${nm.he}`), bpm: 70, bars: 4, mic: true, goal: { velCv: 0.25 } });
    }
    case 8: {
      // Speed ladder: singles in 16ths, the tempo up one step with each clean take — the best clean tempo is the record.
      const nm = [t('lead right', 'מובילים בימין'), t('lead left', 'מובילים בשמאל'), t('accent on the beat', 'הדגשה על הפעמה')][op];
      const hits = line(op === 1 ? 'LR' : 'RL', 64, 0.25, 0, (i) => (op === 2 && i % 4 === 0 ? { acc: true } : {}));
      return finish(s, hits, { title: t(`Speed ladder: singles in 16ths · ${nm.en}`, `סולם מהירות: בודדות בשש-עשריות · ${nm.he}`), bpm: 100, bars: 4, mic: true, goal: op === 2 ? { accentPos: 0.85 } : {} });
    }
    case 9: {
      // Endurance: 16th singles for about two minutes; the timing must hold to the end and the tempo must not drift.
      const nm = [t('lead right', 'מובילים בימין'), t('lead left', 'מובילים בשמאל'), t('accent on the beat', 'הדגשה על הפעמה')][op];
      const hits = line(op === 1 ? 'LR' : 'RL', 48 * 16, 0.25, 0, (i) => (op === 2 && i % 4 === 0 ? { acc: true } : {}));
      return finish(s, hits, { title: t(`Endurance: about 2 minutes of 16ths · ${nm.en}`, `סיבולת: כ-2 דקות של שש-עשריות · ${nm.he}`), bpm: 90, bars: 48, mic: true, goal: { endure: { rise: 0.3, drift: 0.02 } } });
    }
    default: {
      // The double-stroke roll from 16ths to 32nds (RRLL): the second stroke as strong as the first.
      const dbl = (i: number) => ({ dbl: (i % 2 ? 2 : 1) as 1 | 2 });
      const hits: DH[] = [];
      if (op === 2) hits.push(...line('RRLL', 128, 0.125, 0, dbl));
      else
        for (let b = 0; b < 4; b++) {
          const fast = op === 0 ? b >= 2 : b % 2 === 1;
          hits.push(...line('RRLL', fast ? 32 : 16, fast ? 0.125 : 0.25, b * 4, dbl));
        }
      const nm = [t('two bars of 16ths, two of 32nds', 'שתי תיבות שש-עשריות, שתיים של שלושים-ושתיים'), t('a bar each', 'תיבה לכל אחת'), t('32nds throughout', 'שלושים-ושתיים לכל האורך')][op];
      return finish(s, hits, { title: t(`Double-stroke roll, 16ths to 32nds · ${nm.en}`, `גלגול כפולות, משש-עשריות לשלושים-ושתיים · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: { ratio: 0.8 } });
    }
  }
}

// ───────────────────────────── F3 L10 rudiment to kit ─────────────────────────────

function diddleKit(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  // The paradiddle split on the kit: the right hand on the hi-hat (or ride), the left on the snare, the kick on the beats.
  const st = op === 2 ? 'RLRLRRLRLRLL' : 'RLRRLRLL';
  const top: DrumVoice = op === 1 ? 'ride' : 'hihat';
  const step = op === 2 ? T3 : 0.25;
  const n = op === 2 ? 48 : 64;
  const hits: DH[] = line(st, n, step).map((h, i) => ({ ...h, v: h.h === 'R' ? top : 'snare', ...(i % (op === 2 ? 6 : 8) === 0 ? { acc: true } : {}) }));
  const kickEvery = op === 1 ? 1 : 2;
  for (let b = 0; b < 16; b += kickEvery) hits.push({ b, v: 'kick', h: 'R', d: kickEvery });
  const nm = [t('hi-hat and snare, kick on 1 and 3', 'היי־האט וסנר, קיק על 1 ו-3'), t('ride and snare, kick on every beat', 'רייד וסנר, קיק על כל פעמה'), t('double paradiddle in triplets', 'פאראדידל כפול בטריולות')][op];
  return finish(s, hits, { title: t(`The paradiddle on the kit · ${nm.en}`, `הפאראדידל על המערכת · ${nm.he}`), bpm: 70, bars: 4, mic: false, goal: { accentPos: 0.8, accentVoices: [top] } });
}

// ───────────────────────────── F4 time 7–9 ─────────────────────────────

function time(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  switch (lv) {
    case 7: {
      // Slow time at ♩50: the hardest tempo to keep even.
      const nm = [t('8ths', 'שמיניות'), t('quarters', 'רבעים'), t('8ths, click on 2 and 4 only', 'שמיניות, קליק רק על 2 ו-4')][op];
      const hits = op === 1 ? line('R', 16, 1) : line('RL', 32, 0.5);
      return finish(s, hits, { title: t(`Slow time, ♩ 50 · ${nm.en}`, `זמן איטי, ♩ 50 · ${nm.he}`), bpm: 50, bars: 4, mic: true, ...(op === 2 ? { click: '24' as const } : {}) });
    }
    case 8: {
      // The pocket: 8ths 10 ms behind the click, 10 ms ahead, or two bars each of behind / on / ahead.
      const zones = op === 2 ? [{ from: 0, to: 8, ms: 10 }, { from: 8, to: 16, ms: 0 }, { from: 16, to: 24, ms: -10 }] : undefined;
      const goal: DrumGoal = { pocket: zones ? { zones, tol: 8, share: 0.7 } : { ms: op === 0 ? 10 : -10, tol: 8, share: 0.7 } };
      const nm = [t('10 ms behind', '10 מ״ש מאחור'), t('10 ms ahead', '10 מ״ש מלפנים'), t('behind, on, ahead — two bars each', 'מאחור, בדיוק, מלפנים — שתי תיבות לכל אחד')][op];
      return finish(s, line('RL', 48, 0.5), { title: t(`The pocket · ${nm.en}`, `הכיס · ${nm.he}`), bpm: 90, bars: 6, mic: true, goal });
    }
    default: {
      // The click on beat 1 only — then on the 1 of every other bar (the silent bars measured as in the gap click).
      const hits = op === 2 ? line('RL', 64, 0.5, 0, (i) => (i % 2 === 0 ? { acc: true } : {})) : line('RL', 128, 0.25);
      const nm = [t('16ths, click on every 1', 'שש-עשריות, קליק על כל 1'), t('16ths, click on every other 1', 'שש-עשריות, קליק על כל 1 שני'), t('8ths, click on every other 1', 'שמיניות, קליק על כל 1 שני')][op];
      return finish(s, hits, { title: t(`The click on 1 only · ${nm.en}`, `קליק רק על 1 · ${nm.he}`), bpm: 80, bars: 8, mic: true, click: 'one', ...(op > 0 ? { gap: [1, 1] as [number, number], goal: { gapMs: 20 } } : {}) });
    }
  }
}

// ───────────────────────────── F5 L9 punk endurance ─────────────────────────────

function punk(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  // Fast 8ths for about two minutes: the hat or ride in 8ths, or the "skank" beat (kick on the beat, snare between).
  const l: Lanes = [{ h: 'xxxxxxxx', s: '..x...x.', k: 'x...xx..' }, { r: 'xxxxxxxx', s: '..x...x.', k: 'x.x.x.x.' }, { h: 'xxxxxxxx', s: '.x.x.x.x', k: 'x.x.x.x.' }][op];
  const nm = [t('hi-hat 8ths', 'היי־האט בשמיניות'), t('ride 8ths, kick on every beat', 'רייד בשמיניות, קיק על כל פעמה'), t('the skank beat', 'קצב סקאנק')][op];
  return finish(s, gb(l, 2, 80), { title: t(`Punk: fast 8ths for about 2 minutes · ${nm.en}`, `פאנק: שמיניות מהירות כ-2 דקות · ${nm.he}`), bpm: 150, bars: 80, mic: false, goal: { endure: { rise: 0.3, drift: 0.02 } }, ...drumBand('rock', 80) });
}

// ───────────────────────────── F6 funk 5–8 (F6 L6–9; L5 linear funk is d-prog 7) ─────────────────────────────

function funk(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  switch (lv) {
    case 5: {
      // Open-hat barks on the "a": the hat opens on the last 16th of the beat and closes on the next beat.
      const l: Lanes = [
        { h: 'x.x.x.xox.x.x.xo', s: '....X.......X...', k: 'x.....x...x.....' },
        { h: 'xxxoxxxxxxxoxxxx', s: '....X.......X...', k: 'x.....xx..x.....' },
        { h: 'x.x.x.x.x.x.x.xo', s: '...gX..g...gX...', k: 'x.....x.x.......' },
      ][op];
      const nm = [t('barks on the "a" of 2 and 4', 'פתיחות על ה-"a" של 2 ו-4'), t('16th hat, barks on the "a" of 1 and 3', 'היי־האט בשש-עשריות, פתיחות על ה-"a" של 1 ו-3'), t('one bark, with ghost notes', 'פתיחה אחת, עם תווי רפאים')][op];
      return finish(s, gb(l, 4, 8), { title: t(`Open-hat barks · ${nm.en}`, `פתיחות היי־האט · ${nm.he}`), bpm: 80, bars: 8, mic: false, goal: op === 2 ? { hat: true, ghost: 0.8 } : { hat: true }, ...drumBand('funk', 8) });
    }
    case 6: {
      // The ghost-note shuffle: the shuffle on the hat, ghost notes on the middle triplet partials, the backbeat on 2 & 4.
      // (The half-time shuffle is d-shuffle 8.)
      const top: Lanes = op === 2 ? { r: 'x.xx.xx.xx.x' } : { h: 'x.xx.xx.xx.x' };
      const k = op === 1 ? 'x....xx.....' : 'x.....x.....';
      const nm = [t('hi-hat', 'היי־האט'), t('kick pickup into 3', 'קיק מוביל ל-3'), t('ride', 'רייד')][op];
      return finish(s, gb({ ...top, s: '.g.X.g.g.X.g', k }, 3, 8), { title: t(`Shuffle with ghost notes · ${nm.en}`, `שאפל עם תווי רפאים · ${nm.he}`), bpm: 70, bars: 8, mic: false, goal: { ghost: 0.8 }, ...drumBand('shuffle', 8) });
    }
    case 7: {
      // Boom-bap: the snare laid back 15 ms behind the grid while the hat and kick stay on it (the pocket of the snare).
      const k = ['x.....x.x.......', 'x..x......x..x..', 'x.......x.x...x.'][op];
      return finish(s, gb({ h: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', k }, 4, 8), { title: t(`Boom-bap: the lazy snare, 15 ms behind · variation ${op + 1}`, `בום־בפ: סנר עצלן, 15 מ״ש מאחור · וריאציה ${op + 1}`), bpm: 85, bars: 8, mic: false, goal: { pocket: { voices: ['snare'], ms: 15, tol: 8, share: 0.7 } }, ...drumBand('funk', 8) });
    }
    default: {
      // Go-go and the second line: swung 16ths (written as sextuplets: 1, e, &, a → steps 0, 2, 3, 5 of 6).
      const l: Lanes = [
        { h: 'x.xxx.xxx.xxx.xx', s: '.g..X..g.g..X..g', k: 'x..x......x.....' },
        { h: 'x.x.x.x.x.x.x.x.', s: 'X.gXg.X.g.gXg.X.', k: 'x.....x.x.......' },
        { r: 'x.xxx.xxx.xxx.xx', s: '.g..X..g.g..X..g', k: 'x..x......x.....' },
      ][op];
      const nm = [t('go-go', 'גו־גו'), t('second line', 'סקנד ליין'), t('go-go on the ride', 'גו־גו ברייד')][op];
      return finish(s, gb(swung16(l), 6, 8), { title: t(`Swung 16ths · ${nm.en}`, `שש-עשריות בסווינג · ${nm.he}`), bpm: 90, bars: 8, mic: false, goal: { ghost: 0.75 }, ...drumBand('funk', 8) });
    }
  }
}

// ───────────────────────────── F7 shuffle 5–8 ─────────────────────────────

function shuffle(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  switch (lv) {
    case 5: {
      // The swing-ratio dial: the ride's skip note at 55 %, 62 % or 67 % of the beat (written straight under "Swing").
      const target = [0.55, 0.62, 0.67][op];
      const hits: DH[] = rep(8, (k) => [
        ...[0, 1, 2, 3].flatMap((q): DH[] => [{ b: k * 4 + q, v: 'ride', h: 'R', d: 2 / 3 }, { b: k * 4 + q + 2 / 3, v: 'ride', h: 'R', d: 1 / 3, swing: true }]),
        { b: k * 4 + 1, v: 'snare', h: 'L', d: 1 },
        { b: k * 4 + 3, v: 'snare', h: 'L', d: 1 },
        { b: k * 4, v: 'kick', h: 'R', d: 2 },
        { b: k * 4 + 2, v: 'kick', h: 'R', d: 2 },
      ]);
      const nm = [t('55 %, almost straight', '55%, כמעט ישר'), t('62 %, light swing', '62%, סווינג קל'), t('67 %, the triplet', '67%, הטריולה')][op];
      const d = finish(s, hits, { title: t(`Swing ratio · ${nm.en}`, `יחס הסווינג · ${nm.he}`), bpm: 100, bars: 8, mic: false, goal: { swing: { lo: target - 0.03, hi: target + 0.03 } } });
      return { ...d, drum: { ...d.drum!, swing8: true } };
    }
    case 6: {
      // Reggae one-drop: nothing on 1 — the kick and the cross-stick together on 3, the hat in a triplet feel.
      const l: Lanes = [{ h: 'x.xx.xx.xx.x', rm: '......x.....', k: '......x.....' }, { h: 'x.xx.xx.xx.x', rm: '...x..x..x..', k: '......x.....' }, { h: 'x.xx.xx.xx.o', rm: '......x.....', k: '......x.....' }][op];
      const nm = [t('kick and cross-stick on 3', 'קיק וקרוס־סטיק על 3'), t('cross-stick on 2, 3 and 4', 'קרוס־סטיק על 2, 3 ו-4'), t('open hat at the end of the bar', 'היי־האט פתוח בסוף התיבה')][op];
      return finish(s, gb(l, 3, 8), { title: t(`Reggae one-drop · ${nm.en}`, `רגאיי וואן־דרופ · ${nm.he}`), bpm: 70, bars: 8, mic: false, goal: op === 2 ? { hat: true } : {}, ...drumBand('reggae', 8, ['Am', 'Am', 'Dm', 'Em']) });
    }
    case 7: {
      // Steppers (the kick on every beat) and rockers (the kick on 1 and 3), the cross-stick on 3.
      const l: Lanes = [{ h: 'x.x.x.x.', rm: '....x...', k: 'x.x.x.x.' }, { h: 'x.xx.xx.xx.x', rm: '......x.....', k: 'x..x..x..x..' }, { h: '.x.x.x.x', rm: '....x...', k: 'x...x...' }][op];
      const sub = op === 1 ? 3 : 2;
      const nm = [t('steppers', 'סטפרס'), t('steppers, hat in a triplet feel', 'סטפרס, היי־האט בתחושת טריולה'), t('rockers, the hat on the "&"', 'רוקרס, היי־האט על ה"וְ"')][op];
      return finish(s, gb(l, sub, 8), { title: t(`Reggae · ${nm.en}`, `רגאיי · ${nm.he}`), bpm: 70, bars: 8, mic: false, ...drumBand('reggae', 8, ['Am', 'Am', 'Dm', 'Em']) });
    }
    default: {
      // The half-time shuffle (our own pattern on the common idea): the backbeat on 3, ghost notes on the middle partials.
      const k = ['x.........x.', 'x....x......', 'x.x.......x.'][op];
      return finish(s, gb({ h: 'x.xx.xx.xx.x', s: '.g..g.Xg..g.', k }, 3, 8), { title: t(`Half-time shuffle · variation ${op + 1}`, `שאפל בחצי זמן · וריאציה ${op + 1}`), bpm: 70, bars: 8, mic: false, goal: { ghost: 0.8 }, ...drumBand('shuffle', 8) });
    }
  }
}

// ───────────────────────────── F9 fills 6–8 (F9 L7–9; L6 hand–foot combinations is d-prog 7) ─────────────────────────────

const ROCK: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' };
const tomRun = (vs: DrumVoice[], step: number, from: number): DH[] => vs.map((v, i) => ({ b: from + i * step, v, h: alt(i), d: step }));
/** Groove bars; the bar starting at `noOne` loses its hat / kick on the 1 (a landing or an anticipation took it). */
const grooveBar = (b0: number, cut?: { from?: number; to?: number }): DH[] => bar(ROCK, 2, b0, cut ?? {});

function fills(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  const r = rnd(`d-fills:${s.kind}:${op}`);
  switch (lv) {
    case 6: {
      // Flam / accent fills into an anticipation: the crash + kick on the "&" of 4, then nothing on the next 1. A crash
      // choke (aftertouch on most e-kits) is measured when the kit sends it.
      const hits: DH[] = [];
      const lands: number[] = [];
      for (let ph = 0; ph < 2; ph++) {
        const p0 = ph * 16;
        for (let k = 0; k < 3; k++) {
          const g = grooveBar(p0 + k * 4);
          hits.push(...(ph > 0 && k === 0 ? g.filter((h) => h.b > p0 + 1e-6 || h.v === 'snare') : g));
        }
        hits.push(...grooveBar(p0 + 12, { to: 2 }));
        const f0 = p0 + 14;
        if (op === 0) hits.push(...[0, 0.25, 0.5, 0.75, 1, 1.25].map((x, i) => ({ b: f0 + x, v: 'snare' as DrumVoice, h: alt(i), d: 0.25, ...(i % 2 === 0 ? { grace: 1 as const, acc: true } : {}) })));
        else if (op === 1) hits.push(...tomRun(['tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3'], 0.25, f0).map((h, i) => (i % 2 === 0 ? { ...h, acc: true } : h)));
        else hits.push(...[0, 0.5, 1].map((x, i) => ({ b: f0 + x, v: (['snare', 'tom1', 'tom3'] as DrumVoice[])[i], h: alt(i), d: 0.5, grace: 1 as const })));
        const land = p0 + 15.5;
        lands.push(land);
        hits.push({ b: land, v: 'crash', h: 'R', d: 0.5 }, { b: land, v: 'kick', h: 'R', d: 0.5 });
      }
      const nm = [t('flams on the snare', 'פלאמים על הסנר'), t('accents down the toms', 'הדגשות במורד הטומים'), t('flams around the kit', 'פלאמים סביב המערכת')][op];
      // The choke (drumChoke.ts): each crash grabbed by the next 1 — measured only on a kit that sends chokes.
      const goal: DrumGoal = { landing: { beats: lands, ms: 20 }, choke: { beats: lands, by: 0.5 }, ...(op === 1 ? { accentPos: 0.85, accentVoices: ['tom1', 'tom2', 'tom3'] as DrumVoice[] } : { flam: 0.85 }) };
      return finish(s, hits, { title: t(`Fill into the "&" of 4 · ${nm.en}`, `מעבר אל ה"וְ" של 4 · ${nm.he}`), bpm: 80, bars: 8, tail: 1, mic: false, goal });
    }
    case 7: {
      // The fill length called: four phrases, each ending in a fill of 1, 2 or 4 beats (seeded) — read it, land on 1.
      const FILLS: Record<number, DrumVoice[]> = {
        1: ['snare', 'snare', 'tom1', 'tom3'],
        2: ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3', 'tom3'],
        4: ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom1', 'tom1', 'tom2', 'tom2', 'tom2', 'tom2', 'tom3', 'tom3', 'tom3', 'tom3'],
      };
      const lens = [1, 2, 4];
      const seq = [0, 1, 2, 3].map(() => pick(r, lens));
      if (new Set(seq).size === 1) seq[2] = lens[(lens.indexOf(seq[0]) + 1) % 3];
      const hits: DH[] = [];
      const lands: number[] = [];
      seq.forEach((len, ph) => {
        const p0 = ph * 16;
        for (let k = 0; k < 3; k++) {
          const g = grooveBar(p0 + k * 4);
          hits.push(...(ph > 0 && k === 0 ? g.filter((h) => !(h.b === p0 && (h.v === 'hihat' || h.v === 'kick'))) : g));
        }
        if (len < 4) hits.push(...grooveBar(p0 + 12, { to: 4 - len }));
        hits.push(...tomRun(FILLS[len], 0.25, p0 + 16 - len));
        lands.push(p0 + 16);
        hits.push({ b: p0 + 16, v: 'crash', h: 'R', d: 1 }, { b: p0 + 16, v: 'kick', h: 'R', d: 1 });
      });
      return finish(s, hits, { title: t(`Read the fill length: ${seq.join(', ')} beats`, `לקרוא את אורך המעבר: ${seq.join(', ')} פעמות`), bpm: 80, bars: 16, tail: 1, mic: false, goal: { landing: { beats: lands, ms: 20 } } });
    }
    default: {
      // An improvised fill: the empty beats are yours (any drums, at least 3 hits); scored on the landing only — ±25 ms
      // after a two-beat fill is a rush of under about 2 %.
      const len = [2, 4, 2][op];
      const hits: DH[] = [];
      const zones: [number, number][] = [];
      for (let ph = 0; ph < 2; ph++) {
        const p0 = ph * 16;
        for (let k = 0; k < 3; k++) {
          const g = op === 2 ? bar({ r: 'xxxxxxxx', s: '..x...x.', k: 'x..xx...' }, 2, p0 + k * 4) : grooveBar(p0 + k * 4);
          hits.push(...(ph > 0 && k === 0 ? g.filter((h) => !(h.b === p0 && h.v !== 'snare')) : g));
        }
        if (len < 4) hits.push(...grooveBar(p0 + 12, { to: 4 - len }));
        zones.push([p0 + 16 - len, p0 + 16]);
        hits.push({ b: p0 + 16, v: 'crash', h: 'R', d: 1 }, { b: p0 + 16, v: 'kick', h: 'R', d: 1 });
      }
      const nm = [t('two beats', 'שתי פעמות'), t('a whole bar', 'תיבה שלמה'), t('two beats, from the ride', 'שתי פעמות, מהרייד')][op];
      return finish(s, hits, { title: t(`Your own fill · ${nm.en}`, `מעבר משלכם · ${nm.he}`), bpm: 90, bars: 8, tail: 1, mic: false, goal: { landing: { beats: [16, 32], ms: 25 }, impro: { zones, min: 3 } } });
    }
  }
}

// ───────────────────────────── F10 independence 5–8 (F10 L5–7, L9; L8 polyrhythm is d-prog 5) ─────────────────────────────

/** A seeded reading line on one lane: `bars` bars of `sub` steps a beat, a note on each bar's 1. */
function readLine(r: () => number, bars: number, sub: number, cells: number[][]): string {
  const steps = Array(bars * 4 * sub).fill('.');
  for (let b = 0; b < bars * 4; b++) {
    const c = pick(r, cells);
    const cell = b % 4 === 0 && !c.includes(0) ? [0, ...c] : c;
    for (const x of cell) steps[Math.round((b + x) * sub)] = 'x';
  }
  return steps.join('');
}
const C16 = [[0], [0, 0.75], [0, 0.5], [0.25], [0.5, 0.75], [0.75], [], [0, 0.25]];

function indep(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  const r = rnd(`d-indep:${s.kind}:${op}`);
  const split = (x: string, k: number, n: number) => x.slice(k * n, (k + 1) * n);
  switch (lv) {
    case 5: {
      // An ostinato in the hands and a reading limb, then the same line moved to the other limb.
      const ln = readLine(r, 2, 4, C16);
      let hits: DH[];
      // Two hands on the 16th hat; on 2 and 4 the right hand (its turn) moves to the snare.
      if (op === 0) hits = rep(4, (k) => bar({ h: 'xxxx.xxxxxxx.xxx', s: '....x.......x...', k: split(ln, k % 2, 16) }, 4, k * 4, { hatHands: 'RLRLRLRLRLRLRLRL' }));
      else if (op === 1) hits = rep(4, (k) => bar({ h: 'x.x.x.x.x.x.x.x.', k: 'x.......x.......', s: split(ln, k % 2, 16) }, 4, k * 4));
      else hits = rep(4, (k) => bar(k < 2 ? { r: 'x...x...x...x...', k: split(ln, k % 2, 16) } : { r: 'x...x...x...x...', s: split(ln, k % 2, 16) }, 4, k * 4));
      const nm = [t('hands keep the 16th groove, the kick reads', 'הידיים שומרות על הגרוב, הקיק קורא'), t('hat and kick keep time, the snare reads', 'היי־האט וקיק שומרים, הסנר קורא'), t('the same line: kick, then snare', 'אותה שורה: קיק, ואז סנר')][op];
      return finish(s, hits, { title: t(`Ostinato and a reading limb · ${nm.en}`, `אוסטינטו וגפה קוראת · ${nm.he}`), bpm: 60, bars: 4, mic: false, show: 'staff' });
    }
    case 6: {
      // Three-way jazz: the ride pattern (swung) and the hi-hat foot on 2 and 4 stay; the snare reads triplet partials.
      const cells = [[0], [2 / 3], [], [0, 2 / 3], [1 / 3], [], [2 / 3]];
      const sn = readLine(r, 2, 3, cells);
      const hits = rep(4, (k) => bar({ r: 'x..x.xx..x.x', p: '...x.....x..', s: split(sn, k % 2, 12) }, 3, k * 4)).map((h) => (h.v === 'ride' && Math.abs((h.b % 1) - 2 / 3) < 1e-6 ? { ...h, swing: true } : h));
      return finish(s, hits, { title: t(`Three-way jazz: ride, foot, the snare reads · ${op + 1}`, `ג׳אז בשלוש גפיים: רייד, רגל, הסנר קורא · ${op + 1}`), bpm: 90, bars: 4, mic: false, show: 'staff', goal: { swing: { lo: 0.58, hi: 0.72 } } });
    }
    case 7: {
      // Four-way: the feet keep a Brazilian ostinato (samba or baião), the hands read a 16th line on the snare.
      const feet: Lanes = op === 1 ? { k: 'x..x....x..x....', p: '....x.......x...' } : { k: 'x..xx..xx..xx..x', p: '..x...x...x...x.' };
      const sn = readLine(r, 2, 4, C16);
      // Both hands on the snare (hand to hand on the grid); with the ride (op 2) the left hand reads alone.
      const hits = rep(4, (k) => bar({ ...feet, s: split(sn, k % 2, 16), ...(op === 2 ? { r: 'x.x.x.x.x.x.x.x.' } : {}) }, 4, k * 4, op === 2 ? {} : { sHand: alt }));
      const nm = [t('samba feet', 'רגלי סמבה'), t('baião feet', 'רגלי באיון'), t('samba feet and the ride', 'רגלי סמבה ורייד')][op];
      return finish(s, hits, { title: t(`Four-way: ${nm.en}, the snare reads`, `ארבע גפיים: ${nm.he}, הסנר קורא`), bpm: 70, bars: 4, mic: false, show: 'staff' });
    }
    default: {
      // Clave over a groove: the left hand plays the clave as a cross-stick, the right the bell / hat, the kick the tumbao.
      const CL = { son32: 'x..x..x...x.x...', son23: '..x.x...x..x..x.', rumba32: 'x..x...x..x.x...' };
      const TUMBAO = '...x..x....x..x.';
      const l: Lanes = [{ h: 'x'.repeat(16), rm: CL.son32, k: TUMBAO }, { h: 'x'.repeat(16), rm: CL.son23, k: TUMBAO }, { r: 'x.x.x.x.x.x.x.x.', rm: CL.rumba32, k: TUMBAO }][op];
      // Two-bar patterns written bar by bar (a written length never crosses the bar line).
      const half = (k: number): Lanes => Object.fromEntries(Object.entries(l).map(([n, x]) => [n, split(x!, k, 8)])) as Lanes;
      const hits = rep(8, (k) => bar(half(k % 2), 2, k * 4));
      const nm = [t('son 3-2', 'סון 3-2'), t('son 2-3', 'סון 2-3'), t('rumba 3-2, the bell on the ride', 'רומבה 3-2, הפעמון ברייד')][op];
      return finish(s, hits, { title: t(`Clave over the groove · ${nm.en}`, `קלאבה מעל הגרוב · ${nm.he}`), bpm: 80, bars: 8, mic: false, ...drumBand('latin', 8) });
    }
  }
}

// ───────────────────────────── F13 feet 4–8 ─────────────────────────────

/** Mark consecutive kicks a 16th apart as doubles (first, second) for the second-stroke ratio. */
function kickPairs(hits: DH[]): DH[] {
  const ks = hits.filter((h) => h.v === 'kick').sort((a, b) => a.b - b.b);
  for (let i = 0; i + 1 < ks.length; i++)
    if (Math.abs(ks[i + 1].b - ks[i].b - 0.25) < 1e-6 && !ks[i].dbl) {
      ks[i].dbl = 1;
      ks[i + 1].dbl = 2;
      i++;
    }
  return hits;
}
/** The kicks of a double-pedal part alternate feet (R L R L): shown as the sticking, measured as odd / even. */
const feetRL = (hits: DH[]): DH[] => {
  let i = 0;
  return [...hits].sort((a, b) => a.b - b.b).map((h) => (h.v === 'kick' ? { ...h, h: alt(i++) } : h));
};
const ALT: DrumGoal['alt'] = { voices: ['kick'], vel: 0.1, cv: 0.12 };

function feet(s: DrillSpec, lv: number): Drill {
  const op = s.option ?? 0;
  const BB = '....x.......x...';
  switch (lv) {
    case 4: {
      // Kick doubles: two 16ths with one foot (heel–toe or slide) — the second as strong as the first.
      const k = ['xx......xx......', 'x..xx.....xx....', 'xx....xx..xx....'][op];
      return finish(s, kickPairs(gb({ h: 'x.x.x.x.x.x.x.x.', s: BB, k }, 4, 8)), { title: t(`Kick doubles · variation ${op + 1}`, `כפולות בקיק · וריאציה ${op + 1}`), bpm: 60, bars: 8, mic: false, goal: { ratio: 0.8 } });
    }
    case 5: {
      // The foot splash: the hi-hat pedal on the "&" under the ride. Timing as always; splash against chick by the kit's
      // splash note or the pedal's CC4 (drumSplash.ts) — 80 % of the pedal notes must ring open.
      const p = ['...x...x', '.x.x.x.x', '.......x'][op];
      return finish(s, gb({ r: 'x.x.x.x.', s: '..x...x.', k: 'x...x...', p }, 2, 8), { title: t(`Foot splash on the "&" · ${[t('of 2 and 4', 'של 2 ו-4'), t('every "&"', 'כל "וְ"'), t('of 4', 'של 4')][op].en}`, `ספלאש ברגל על ה"וְ" · ${[t('of 2 and 4', 'של 2 ו-4'), t('every "&"', 'כל "וְ"'), t('of 4', 'של 4')][op].he}`), bpm: 80, bars: 8, mic: false, goal: { splash: { share: 0.8 } } });
    }
    case 6: {
      // Double pedal: alternating 16ths (R L R L). One pad can't tell the feet apart — evenness and the odd / even balance
      // show a weak foot.
      const k = ['xxxx....xxxx....', '....xxxx....xxxx', 'xxxxxxxx........'][op];
      return finish(s, feetRL(gb({ h: 'x.x.x.x.x.x.x.x.', s: BB, k }, 4, 8)), { title: t(`Double pedal: alternating 16ths · ${[t('on 1 and 3', 'על 1 ו-3'), t('on 2 and 4', 'על 2 ו-4'), t('half a bar', 'חצי תיבה')][op].en}`, `דאבל פדל: שש-עשריות לסירוגין · ${[t('on 1 and 3', 'על 1 ו-3'), t('on 2 and 4', 'על 2 ו-4'), t('half a bar', 'חצי תיבה')][op].he}`), bpm: 80, bars: 8, mic: false, goal: { alt: ALT } });
    }
    case 7: {
      // Double bass 16ths under a rock groove, about a minute: even feet, held to the end.
      const top: Lanes = [{ h: 'x.x.x.x.x.x.x.x.' }, { r: 'x...x...x...x...' }, { c: 'x...x...x...x...' }][op];
      return finish(s, feetRL(gb({ ...top, s: BB, k: 'x'.repeat(16) }, 4, 32)), { title: t(`Double bass 16ths, about a minute · ${[t('hi-hat 8ths', 'היי־האט בשמיניות'), t('ride quarters', 'רייד ברבעים'), t('crash quarters', 'קראש ברבעים')][op].en}`, `דאבל בס בשש-עשריות, כדקה · ${[t('hi-hat 8ths', 'היי־האט בשמיניות'), t('ride quarters', 'רייד ברבעים'), t('crash quarters', 'קראש ברבעים')][op].he}`), bpm: 100, bars: 32, mic: false, goal: { alt: ALT, endure: { rise: 0.3, drift: 0.02 } } });
    }
    default: {
      // Triplets and gallops with both feet: 8th triplets, then the gallop (8th + two 16ths, or two 16ths + 8th).
      if (op === 0) return finish(s, feetRL(gb({ h: 'x..x..x..x..', s: '...x.....x..', k: 'x'.repeat(12) }, 3, 8)), { title: t('Double bass in triplets', 'דאבל בס בטריולות'), bpm: 100, bars: 8, mic: false, goal: { alt: ALT } });
      const k = op === 1 ? 'x.xxx.xxx.xxx.xx' : 'xxx.xxx.xxx.xxx.';
      return finish(s, feetRL(gb({ h: 'x.x.x.x.x.x.x.x.', s: BB, k }, 4, 8)), { title: t(`The gallop · ${op === 1 ? '8th + two 16ths' : 'two 16ths + 8th'}`, `הגאלופ · ${op === 1 ? 'שמינית + שתי שש-עשריות' : 'שתי שש-עשריות + שמינית'}`), bpm: 100, bars: 8, mic: false, goal: { alt: ALT } });
    }
  }
}

// ───────────────────────────── F14 L9 exam-style unseen ─────────────────────────────

function exam(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const r = rnd(`d-read:exam:${op}`);
  // 8 bars at sight, our own material in the shape of a graded-exam unseen: a groove with a 16th kick, the second half
  // louder (a dynamic marked), a one-beat fill closing bar 4, a two-beat fill into the final 1; 30 s to study.
  const K = ['x.....x.x.......', 'x..x....x.x.....', 'x.......x..x....', 'x.....x...x..x..'];
  const hits: DH[] = [];
  for (let b = 0; b < 8; b++) {
    const b0 = b * 4;
    const l: Lanes = { s: r() < 0.3 ? '....x..x....x...' : '....x.......x...', k: pick(r, K) };
    // Odd items move to the ride for the louder half.
    const top: Lanes = b >= 4 && op % 2 ? { r: 'x.x.x.x.x.x.x.x.' } : { h: 'x.x.x.x.x.x.x.x.' };
    if (b === 3) {
      hits.push(...bar({ ...top, s: l.s, k: l.k }, 4, b0, { to: 3 }), ...tomRun(['snare', 'snare', 'tom1', 'tom3'], 0.25, b0 + 3));
    } else if (b === 7) {
      hits.push(...bar({ ...top, s: l.s, k: l.k }, 4, b0, { to: 2 }), ...tomRun(pick(r, [['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3', 'tom3'], ['tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3', 'snare', 'snare']]) as DrumVoice[], 0.25, b0 + 2));
    } else {
      const g = bar({ ...top, s: l.s, k: l.k }, 4, b0);
      // After the bar-4 fill: crash + kick on the 1 of bar 5.
      hits.push(...(b === 4 ? g.filter((h) => !(h.b === b0 && h.v !== 'snare')) : g));
    }
  }
  hits.push({ b: 16, v: 'crash', h: 'R', d: 1 }, { b: 16, v: 'kick', h: 'R', d: 1 }, { b: 32, v: 'crash', h: 'R', d: 1 }, { b: 32, v: 'kick', h: 'R', d: 1 });
  // The second half marked f, the first mf (shown under the first note of each half).
  const marked = hits.map((h) => (h.b === 0 && h.v === 'kick' ? { ...h, dyn: 'mf' as const } : h.b === 16 && h.v === 'kick' ? { ...h, dyn: 'f' as const } : h));
  const d = finish(s, marked, { title: t(`Unseen: 8 bars, exam style · ${op + 1}`, `קריאה מהדף: 8 תיבות בסגנון בחינה · ${op + 1}`), bpm: 70, bars: 8, tail: 1, mic: false, show: 'staff', goal: { landing: { beats: [16, 32], ms: 25 } } });
  return { ...d, prep: 30 };
}
