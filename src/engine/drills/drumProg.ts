// Prog / fusion on the kit: the `d-prog` family (docs/research/DRUMS_NICHE_PLAN.md §5, 10 levels), on the shared prog
// engine (PROG_ENGINE.md: meter per bar, tempo map, road map) plus the drum rules it left open — linear coincidence,
// the limb ratio of a polyrhythm, quintuplet / sextuplet subdivisions.
//
//   1 odd-meter rock grooves (7/8, 5/4, the backbeat placed by group)   6 metric modulation (tempo map, the click follows)
//   2 9/8, 11/8, 13/8 and changing groupings (accented hi-hat)          7 linear grooves and fills (no two limbs together)
//   3 groupings of 3 and 5 over 4/4, across the bar line                8 displaced grooves (by a 16th, an 8th, the cymbal)
//   4 polymeter (a 7-, 3- or 5-cycle over 4/4, the band in unison)      9 quintuplets, sextuplets, the six-stroke roll fill
//   5 polyrhythm between limbs (3:2, 4:3, 5:4)                         10 a prog song (7/8 riff, 4/4 chorus, a modulated bridge)
//
// Our own exercises; every take measured on the kit (MIDI). Pure and deterministic.

import type { Drill, DrillSpec, DrumGoal, DrumVoice } from './types';
import { MODULATIONS, withBarPlan } from './timeline';
import { bar, finish, levelOfKind, rep, type DH, type Lanes } from './drums';
import { buildSong, type SongSection } from './drumSong';
import { genDrumCross } from './drumCross'; // AUDIT-CONTENT-THEORY R-1/R-5: level 11

const t = (en: string, he: string) => ({ en, he });
type T2 = { en: string; he: string };

/** One odd-meter groove: lanes in eighths (pulse 8), its groups. */
interface OddGroove {
  sig: string;
  groups: number[];
  l: Lanes;
  name: T2;
}
/** Hi-hat eighths with an accent on each group start. */
const accHat = (groups: number[]): string => groups.map((g) => 'X' + 'x'.repeat(g - 1)).join('');

const ODD1: OddGroove[] = [
  { sig: '7/8', groups: [2, 2, 3], l: { h: 'xxxxxxx', k: 'x...x..', s: '..x...x' }, name: t('7/8 (2+2+3)', '7/8 (2+2+3)') },
  { sig: '5/4', groups: [6, 4], l: { h: 'xxxxxxxxxx', k: 'x.....x...', s: '....x...x.' }, name: t('5/4 (3+2)', '5/4 (3+2)') },
  { sig: '7/8', groups: [3, 2, 2], l: { h: 'xxxxxxx', k: 'x....x.', s: '...x..x' }, name: t('7/8 (3+2+2)', '7/8 (3+2+2)') },
];
const ODD2: OddGroove[] = [
  { sig: '9/8', groups: [2, 2, 2, 3], l: { h: accHat([2, 2, 2, 3]), k: 'x...x....', s: '..x...x..' }, name: t('9/8 (2+2+2+3)', '9/8 (2+2+2+3)') },
  { sig: '11/8', groups: [3, 3, 3, 2], l: { h: accHat([3, 3, 3, 2]), k: 'x.....x....', s: '...x.....x.' }, name: t('11/8 (3+3+3+2)', '11/8 (3+3+3+2)') },
  { sig: '13/8', groups: [3, 3, 3, 2, 2], l: { h: accHat([3, 3, 3, 2, 2]), k: 'x.....x....x.', s: '...x.....x..x' }, name: t('13/8 (3+3+3+2+2)', '13/8 (3+3+3+2+2)') },
];

/** Notes of `bars` bars of an eighth-pulse groove, lengths inside their group. */
function oddBars(g: OddGroove, bars: number, from = 0): DH[] {
  const m = g.groups.reduce((a, b) => a + b, 0);
  const out = rep(bars, (k) => bar(g.l, 1, from + k * m, { maxD: 3 }));
  return out.map((h) => {
    const pos = (h.b - from) % m;
    let end = 0;
    for (const x of g.groups) {
      end += x;
      if (end > pos + 1e-9) break;
    }
    return { ...h, d: Math.min(h.d ?? 1, end - pos) };
  });
}

/** Evenly spaced strokes: n per beat for `beats` beats. */
const tuplets = (v: DrumVoice, n: number, beats: number, from: number, hand: (i: number) => 'R' | 'L' = () => 'R', extra: (i: number) => Partial<DH> = () => ({})): DH[] =>
  Array.from({ length: n * beats }, (_, i) => ({ b: from + i / n, v, h: hand(i), d: 1 / n, ...extra(i) }));

/** Linear patterns on the 16th grid, one limb a step: R = hi-hat (right hand), L = snare (left), K = kick, T/F = toms. */
function linearBar(pat: string, b0: number, acc: Set<number> = new Set()): DH[] {
  const V: Record<string, DrumVoice> = { R: 'hihat', L: 'snare', K: 'kick', T: 'tom1', M: 'tom2', F: 'tom3', S: 'snare' };
  return [...pat].flatMap((c, i): DH[] => (c === '.' ? [] : [{ b: b0 + i / 4, v: V[c], h: c === 'L' || c === 'M' ? 'L' : 'R', d: 0.25, ...(acc.has(i) || c === 'S' ? { acc: true } : {}) }]));
}

export function generateProg(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  switch (lv) {
    case 1: {
      const g = ODD1[op % ODD1.length];
      const m = g.groups.reduce((a, b) => a + b, 0);
      return finish(s, oddBars(g, 8), { title: t(`Odd-meter rock · ${g.name.en}`, `רוק במשקל מוזר · ${g.name.he}`), bpm: 180, bars: 8, meter: m, pulse: 8, groups: g.groups, mic: false });
    }
    case 2: {
      if (op === 3) {
        // 8/8 with the grouping changing bar by bar: 3+3+2, then 2+3+3 (the written signature says which).
        const A: OddGroove = { sig: '8/8', groups: [3, 3, 2], l: { h: accHat([3, 3, 2]), k: 'x.....x.', s: '...x...x' }, name: t('3+3+2', '3+3+2') };
        const B: OddGroove = { sig: '8/8', groups: [2, 3, 3], l: { h: accHat([2, 3, 3]), k: 'x.x.....', s: '.....x..' }, name: t('2+3+3', '2+3+3') };
        const hits = rep(8, (k) => oddBars(k % 2 ? B : A, 1, k * 8));
        const d = finish(s, hits, { title: t('Changing groupings · 3+3+2 ↔ 2+3+3', 'קבוצות מתחלפות · 3+3+2 ↔ 2+3+3'), bpm: 180, bars: 8, meter: 8, pulse: 8, groups: [3, 3, 2], mic: false, goal: { accentPos: 0.85, accentVoices: ['hihat'] } });
        return withBarPlan(d, Array.from({ length: 8 }, (_, k) => (k % 2 ? '8/8 2+3+3' : '8/8 3+3+2')));
      }
      const g = ODD2[op % ODD2.length];
      const m = g.groups.reduce((a, b) => a + b, 0);
      return finish(s, oddBars(g, 8), { title: t(`Long odd meters · ${g.name.en}`, `משקלים מוזרים ארוכים · ${g.name.he}`), bpm: 180, bars: 8, meter: m, pulse: 8, groups: g.groups, mic: false, goal: { accentPos: 0.85, accentVoices: ['hihat'] } });
    }
    case 3: {
      // Groupings over 4/4: accented 16th groups on the hi-hat (and the kick) across the bar line.
      const plans: { groups: number[]; bars: number; name: T2 }[] = [
        { groups: [3, 3, 3, 3, 4], bars: 1, name: t('3+3+3+3+4, every bar', '3+3+3+3+4, בכל תיבה') },
        { groups: [5, 5, 6], bars: 1, name: t('5+5+6, every bar', '5+5+6, בכל תיבה') },
        { groups: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2], bars: 2, name: t('groups of 3 over two bars (3 × 10 + 2)', 'קבוצות של 3 על פני שתי תיבות (3 × 10 + 2)') },
      ];
      const p = plans[op % plans.length];
      const hits: DH[] = [];
      for (let k = 0; k < 4; k += p.bars) {
        // One plan spans `bars` bars; the accents run through the bar line.
        let at = 0;
        const starts = new Set<number>();
        for (const g of p.groups) {
          starts.add(at);
          at += g;
        }
        for (let i = 0; i < 16 * p.bars; i++) {
          const b = k * 4 + i / 4;
          const acc = starts.has(i);
          hits.push({ b, v: 'hihat', h: i % 2 ? 'L' : 'R', d: 0.25, ...(acc ? { acc: true } : {}) });
          if (acc) hits.push({ b, v: 'kick', h: 'R', d: 0.25 });
          if (i % 16 === 4 || i % 16 === 12) hits.push({ b, v: 'snare', h: 'L', d: 0.25 });
        }
      }
      return finish(s, hits, { title: t(`Groupings over 4/4 · ${p.name.en}`, `קבוצות מעל 4/4 · ${p.name.he}`), bpm: 60, bars: 4, mic: false, goal: { accentPos: 0.85, accentVoices: ['hihat'] } });
    }
    case 4: {
      // Polymeter: a kick / snare cycle of 7, 3 or 5 (eighths or quarters) over the cymbal in 4/4, the band's bass in
      // unison with the cycle; the cycle comes back to the bar line after N bars.
      const cyc = [
        { len: 3.5, k: [0, 1.5], s: [2.5], bars: 7, name: t('a 7/8 cycle over 4/4 (meets after 7 bars)', 'מחזור של 7/8 מעל 4/4 (נפגשים אחרי 7 תיבות)') },
        { len: 3, k: [0], s: [2], bars: 6, name: t('a 3/4 cycle over 4/4 (meets after 3 bars)', 'מחזור של 3/4 מעל 4/4 (נפגשים אחרי 3 תיבות)') },
        { len: 2.5, k: [0], s: [1.5], bars: 5, name: t('a 5/8 cycle over 4/4 (meets after 5 bars)', 'מחזור של 5/8 מעל 4/4 (נפגשים אחרי 5 תיבות)') },
      ][op % 3];
      const total = cyc.bars * 4;
      const hits: DH[] = rep(total * 2, (i) => [{ b: i / 2, v: 'ride' as DrumVoice, h: 'R' as const, d: 0.5 }]);
      for (let c = 0; c * cyc.len < total - 1e-9; c++) {
        for (const k of cyc.k) if (c * cyc.len + k < total - 1e-9) hits.push({ b: c * cyc.len + k, v: 'kick', h: 'R', d: 0.5 });
        for (const x of cyc.s) if (c * cyc.len + x < total - 1e-9) hits.push({ b: c * cyc.len + x, v: 'snare', h: 'L', d: 0.5 });
      }
      const line = hits.filter((h) => h.v === 'kick').map((h) => ({ beat: h.b, dur: 0.5, midi: 40 }));
      const d = finish(s, hits, { title: t(`Polymeter · ${cyc.name.en}`, `פולימטר · ${cyc.name.he}`), bpm: 80, bars: cyc.bars, mic: false, band: { style: 'hold' }, chart: Array.from({ length: cyc.bars }, () => 'Em') });
      return { ...d, unison: { inst: 'bass', line, vel: 0.75 } };
    }
    case 5: {
      // Polyrhythm between limbs, per beat: 3:2 (ride triplets over kick 8ths), 4:3 (ride 16ths over kick triplets),
      // 5:4 (ride quintuplets over snare 16ths). The ratio of the two lanes' played tempi is measured.
      const P = [
        { a: 'ride', na: 3, b: 'kick', nb: 2, name: t('3:2 — ride triplets, kick 8ths', '3:2 — טריולות ברייד, שמיניות בקיק') },
        { a: 'ride', na: 4, b: 'kick', nb: 3, name: t('4:3 — ride 16ths, kick triplets', '4:3 — שש-עשריות ברייד, טריולות בקיק') },
        { a: 'ride', na: 5, b: 'snare', nb: 4, name: t('5:4 — ride quintuplets, snare 16ths', '5:4 — חמישיות ברייד, שש-עשריות בסנר') },
      ][op % 3];
      const hits = [...tuplets(P.a as DrumVoice, P.na, 16, 0), ...tuplets(P.b as DrumVoice, P.nb, 16, 0, () => (P.b === 'snare' ? 'L' : 'R'))];
      const goal: DrumGoal = { poly: { a: [P.a as DrumVoice], b: [P.b as DrumVoice], tol: 0.04 } };
      return finish(s, hits, { title: t(`Polyrhythm · ${P.name.en}`, `פולירית׳ם · ${P.name.he}`), bpm: 60, bars: 4, mic: false, goal });
    }
    case 6: {
      // Metric modulation on cue: four bars, then the pivot value becomes the new beat (the click follows the tempo map).
      const M = [
        {
          ratio: MODULATIONS.tripletEighthToEighth,
          a: { h: 'xxxxxxxxxxxx', s: '...x.....x..', k: 'x.....x.....' } as Lanes,
          sa: 3,
          b: { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' } as Lanes,
          sb: 2,
          name: t('the triplet 8th becomes the new 8th (× 3/2)', 'שמינית הטריולה הופכת לשמינית החדשה (× 3/2)'),
        },
        {
          ratio: MODULATIONS.dottedEighthToQuarter,
          a: { h: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', k: 'x..x..x..x..x...' } as Lanes,
          sa: 4,
          b: { h: 'x.x.x.x.', s: '..x...x.', k: 'x...x...' } as Lanes,
          sb: 2,
          name: t('the dotted 8th becomes the new beat (× 4/3)', 'השמינית המנוקדת הופכת לפעמה החדשה (× 4/3)'),
        },
        {
          ratio: 1 / MODULATIONS.tripletEighthToEighth,
          a: { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' } as Lanes,
          sa: 2,
          b: { h: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' } as Lanes,
          sb: 3,
          name: t('the 8th becomes the new triplet 8th (× 2/3)', 'השמינית הופכת לשמינית טריולה חדשה (× 2/3)'),
        },
      ][op % 3];
      const hits = [...rep(4, (k) => bar(M.a, M.sa, k * 4)), ...rep(4, (k) => bar(M.b, M.sb, 16 + k * 4))];
      // The new 1: crash + kick.
      const land = hits.filter((h) => !(Math.abs(h.b - 16) < 1e-6 && (h.v === 'hihat' || h.v === 'kick')));
      land.push({ b: 16, v: 'crash', h: 'R', d: 1 }, { b: 16, v: 'kick', h: 'R', d: 1 });
      const d = finish(s, land, { title: t(`Metric modulation · ${M.name.en}`, `מודולציה מטרית · ${M.name.he}`), bpm: 80, bars: 8, mic: false, goal: { landing: { beats: [16], ms: 30 }, modulation: { tol: 0.02 } } });
      return withBarPlan(d, [['4/4', 8]], [{ bar: 4, ratio: M.ratio }]);
    }
    case 7: {
      // Linear grooves and fills: no two limbs together (R hat, L snare, K kick; accents = the backbeat).
      const P = [
        { pat: ['KRLKRLKRSRLKRLKR', 'KRLKRLKRSRLKRLRL'], name: t('R L K groups', 'קבוצות R L K') },
        { pat: ['RLRLKRLRLKRLRLKK', 'RLRLKRLRLKRLRLKK'], name: t('R L R L K groups', 'קבוצות R L R L K') },
        { pat: ['KRLKRLKRSRLKRLKR', 'TLLKMLLKFLLKFLLK'], name: t('groove, then an R L L K fill around the toms', 'גרוב, ואז מעבר R L L K סביב הטומים') },
      ][op % 3];
      const hits: DH[] = [];
      for (let k = 0; k < 4; k++) hits.push(...linearBar(pat(P.pat, k), k * 4, new Set([8])));
      return finish(s, hits, { title: t(`Linear grooves · ${P.name.en}`, `גרובים ליניאריים · ${P.name.he}`), bpm: 70, bars: 4, mic: false, goal: { linear: { ms: 15, max: 0 } } });
    }
    case 8: {
      const P: { l: Lanes; name: T2 }[] = [
        { l: { h: 'x.x.x.x.x.x.x.x.', s: '.....x.......x..', k: 'x.......x.......' }, name: t('the backbeat a 16th late', 'הביט האחורי שש-עשרית מאוחר') },
        { l: { h: 'x.x.x.x.x.x.x.x.', s: '......x.......x.', k: 'x.......x.......' }, name: t('the backbeat an 8th late', 'הביט האחורי שמינית מאוחר') },
        { l: { h: '.x.x.x.x.x.x.x.x', s: '....x.......x...', k: 'x.......x.......' }, name: t('the cymbal displaced by a 16th', 'המצילה מוזזת בשש-עשרית') },
      ];
      const p = P[op % 3];
      return finish(s, rep(8, (k) => bar(p.l, 4, k * 4)), { title: t(`Displaced groove · ${p.name.en}`, `גרוב מוזז · ${p.name.he}`), bpm: 80, bars: 8, mic: false });
    }
    case 9: {
      const alt = (i: number): 'R' | 'L' => (i % 2 ? 'L' : 'R');
      if (op === 0) {
        // Quintuplets and 16ths, a beat each, on the snare.
        const hits = rep(8, (k) => (k % 2 ? tuplets('snare', 4, 1, k, alt) : tuplets('snare', 5, 1, k, alt, (i) => (i === 0 ? { acc: true } : {}))));
        return finish(s, hits, { title: t('Quintuplets against 16ths', 'חמישיות מול שש-עשריות'), bpm: 60, bars: 2, mic: false });
      }
      if (op === 1) {
        // Sextuplets accented in threes (1 and 4 of each six).
        const hits = tuplets('snare', 6, 8, 0, alt, (i) => (i % 3 === 0 ? { acc: true } : {}));
        return finish(s, hits, { title: t('Sextuplets, accents in threes', 'שישיות, הדגשות בשלשות'), bpm: 60, bars: 2, mic: false, goal: { accentPos: 0.8 } });
      }
      // A groove bar, then the gospel six-stroke roll (R ll rr L) in sextuplets around the kit, landing on 1.
      const g: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' };
      const six = (b0: number): DH[] => {
        const st: ('R' | 'L')[] = ['R', 'L', 'L', 'R', 'R', 'L'];
        const vs: DrumVoice[] = ['snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3'];
        return Array.from({ length: 12 }, (_, i) => ({ b: b0 + i / 6, v: vs[i % 6], h: st[i % 6], d: 1 / 6, ...(i % 6 === 0 || i % 6 === 5 ? { acc: true } : {}) }));
      };
      const hits = [...bar(g, 2, 0), ...bar(g, 2, 4, { to: 2 }), ...six(6), { b: 8, v: 'crash' as DrumVoice, h: 'R' as const, d: 1 }, { b: 8, v: 'kick' as DrumVoice, h: 'R' as const, d: 1 }, ...bar(g, 2, 8, { from: 0.5 }), ...bar(g, 2, 12, { to: 2 }), ...six(14), { b: 16, v: 'crash' as DrumVoice, h: 'R' as const, d: 1 }, { b: 16, v: 'kick' as DrumVoice, h: 'R' as const, d: 1 }];
      return finish(s, hits, { title: t('Six-stroke roll fills (sextuplets), land on 1', 'מעברי גלגול שש מכות (שישיות), נחיתה על 1'), bpm: 60, bars: 4, tail: 1, mic: false, goal: { landing: { beats: [8, 16], ms: 25 } } });
    }
    case 11:
      return genDrumCross(s);
    default: {
      // The prog song: a 7/8 riff with the band in unison, a 4/4 chorus, a metric-modulated bridge (the dotted 8th
      // becomes the new beat), the riff again at the first tempo, the ending.
      const riff = op === 1 ? '7/8 3+2+2' : op === 2 ? '5/8 3+2' : '7/8 2+2+3';
      const RL: Lanes = op === 1 ? { h: 'xxxxxxx', k: 'x....x.', s: '...x..x' } : op === 2 ? { h: 'xxxxx', k: 'x..x.', s: '..x.x' } : { h: 'xxxxxxx', k: 'x...x..', s: '..x...x' };
      const secs: SongSection[] = [
        { name: 'Riff', kind: 'intro', bars: 4, lanes: RL, sub: 1, meter: riff, chart: ['E5'] },
        { name: 'Chorus', kind: 'chorus', bars: 4, lanes: { r: 'xxxxxxxx', s: '..x...x.', k: 'x..xx...' }, sub: 1, meter: '4/4', chart: ['A', 'G', 'D', 'E'], fillBefore: 'beat' },
        { name: 'Bridge', kind: 'bridge', bars: 4, lanes: { h: 'xxxxxxxx', s: '....x...', k: 'x.....x.' }, sub: 1, meter: '4/4', chart: ['C', 'D'], fillBefore: 'beat', tempo: MODULATIONS.dottedEighthToQuarter },
        { name: 'Riff', kind: 'outro', bars: 2, lanes: RL, sub: 1, meter: riff, chart: ['E5'], fillBefore: 'beat', tempo: 1 / MODULATIONS.dottedEighthToQuarter },
        { name: 'Ending', kind: 'outro', bars: 1, meter: '4/4', chart: ['E5'], end: true, fillBefore: 'beat' },
      ];
      const d = buildSong(s, secs, { title: t(`Prog song · ${riff.split(' ')[0]} riff, 4/4 chorus, modulated bridge`, `שיר פרוג · ריף ${riff.split(' ')[0]}, פזמון 4/4, גשר במודולציה`), bpm: 200, pulse: 8, style: 'rock', bass: false, seed: `${s.kind}:${op}`, tempoRatio: true });
      // The band doubles the riff's kick in the riff sections (bass, an E pedal).
      const riffSpans = d.layout.spans.filter((x) => x.name === 'Riff');
      const line = d.notes.filter((n) => n.voice === 'kick' && riffSpans.some((x) => n.beat >= x.startBeat - 1e-9 && n.beat < x.startBeat + x.beats - 1e-9)).map((n) => ({ beat: n.beat, dur: 1, midi: 40 }));
      return { ...d, unison: { inst: 'bass', line, vel: 0.75 } };
    }
  }
}

const pat = (xs: string[], k: number) => xs[k % xs.length];
