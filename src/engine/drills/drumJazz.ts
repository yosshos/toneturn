// Jazz deepening (DRUMS_NICHE_PLAN §6.1, P2): d-jazz levels 9–12 on the song engine (drumSong.ts buildSong).
//   9  brushes ballad — the taps scored (timing, swing, the feathered kick); the sweep is shown, never scored
//      (a sweep is a continuous noise to a microphone and many e-kits send no brush data — unverified, so unscored);
//  10  comping over a form — a 12-bar blues or an AABA standard's form (chords only), the band walking, comping that
//      answers the form (busier into the bridge), a crash or set-up at each section start;
//  11  set-ups and ensemble hits — big-band figures on the chart with a triplet set-up before each;
//  12  broken time and the 2 → 4 switch — a 2-feel in the A sections, 4 in the bridge, trading 8s, up-tempo.
// Our own patterns and charts (generic changes, chords only). Pure and deterministic.

import type { Drill, DrillSpec, DrumGoal } from './types';
import { finish, levelOfKind, rep, bar, rnd, type DH, type Lanes } from './drums';
import { buildSong, type SongSection } from './drumSong';

const t = (en: string, he: string) => ({ en, he });
const RIDE = 'x..x.xx..x.x';
const RIDE_Q = 'x..x..x..x..';
const FOOT24 = '...x.....x..';
const FEATHER = 'g..g..g..g..';
const SWING = { lo: 0.58, hi: 0.72 };
const SWING_FAST = { lo: 0.52, hi: 0.7 };
const BLUES_F = ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'D7', 'Gm7', 'C7', 'F7', 'C7'];
const AABA = { A: ['Bbmaj7', 'Gm7', 'Cm7', 'F7', 'Dm7', 'G7', 'Cm7', 'F7'], B: ['Am7', 'D7', 'Gm7', 'C7', 'Cm7', 'F7', 'Bbmaj7', 'F7'] };

/** The skip notes of the ride (or the brush taps) swung. */
const swingIt = (d: Drill, fast = false): Drill => {
  const notes = d.notes.map((n) => ((n.voice === 'ride' || (n.voice === 'snare' && d.drum?.swing8 === undefined && n.hand === 'R')) && Math.abs((n.beat % 1) - 2 / 3) < 1e-6 ? { ...n, swing: true } : n));
  return { ...d, notes, goal: { ...d.goal, drum: { ...(d.goal.drum ?? {}), swing: fast ? SWING_FAST : SWING } } };
};

/** Seeded comping on triplet partials: `n` strokes a bar (1–3), more when `busy`. */
function comp(seed: string, bars: number, busy = false): string[] {
  const r = rnd(seed);
  return Array.from({ length: bars }, () => {
    const steps = Array(12).fill('.');
    const n = 1 + Math.floor(r() * 2) + (busy ? 1 : 0);
    for (let k = 0; k < n; k++)
      for (let tries = 0; tries < 8; tries++) {
        const at = Math.floor(r() * 4) * 3 + (r() < 0.6 ? 2 : 0);
        if (steps[at] === 'x') continue;
        steps[at] = 'x';
        break;
      }
    return steps.join('');
  });
}

export function generateJazzMore(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const seed = `${s.kind}:${op}`;
  switch (lv) {
    case 9: {
      // Brushes: the right-hand taps (the ride pattern on the snare, or quarters), the foot on 2 and 4, a feathered kick.
      const taps = op === 1 ? RIDE_Q : RIDE;
      const l: Lanes = op === 2 ? { s: taps, p: FOOT24, k: FEATHER } : { s: taps, p: FOOT24 };
      const hits: DH[] = rep(8, (k) => bar(l, 3, k * 4, { sHand: () => 'R' }));
      const nm = [t('the ride pattern in taps', 'תבנית הרייד בנקישות'), t('quarter taps', 'נקישות ברבעים'), t('with a feathered kick', 'עם קיק מרוכך')][op];
      const goal: DrumGoal = op === 2 ? { ghost: 0.8 } : {};
      const d = finish(s, hits, { title: t(`Brushes ballad · ${nm.en} (the sweep is yours, not scored)`, `בלדה במברשות · ${nm.he} (הסוויפ שלכם, לא נמדד)`), bpm: 60, bars: 8, mic: false, goal, band: { style: 'ballad', bass: true }, chart: Array.from({ length: 8 }, (_, i) => AABA.A[i % 8]) });
      return taps === RIDE ? swingIt(d) : d;
    }
    case 10: {
      // Comping over a form: the blues (two choruses, busier in the second) or AABA (busier into the bridge).
      if (op === 1) {
        const secs: SongSection[] = [
          { name: 'A', kind: 'head', bars: 8, sub: 3, laneFn: (b) => ({ r: RIDE, p: FOOT24, s: comp(`${seed}:A`, 8)[b] }), chart: AABA.A, band: 'swing' },
          { name: 'B', kind: 'bridge', bars: 8, sub: 3, laneFn: (b) => ({ r: RIDE, p: FOOT24, s: comp(`${seed}:B`, 8, true)[b] }), chart: AABA.B, band: 'swing', fillBefore: 'trip' },
          { name: 'Ending', kind: 'outro', bars: 1, chart: ['Bbmaj7'], end: true, fillBefore: 'trip' },
        ];
        return swingIt(buildSong(s, secs, { title: t('Comping over AABA (busier into the bridge)', 'קומפינג על AABA (עמוס יותר לקראת הגשר)'), bpm: 120, style: 'swing', seed, order: [0, 0, 1, 0, 2], roadmap: 'written', signs: ['A 8', 'A 8', 'B 8', 'A 8'] }));
      }
      const secs: SongSection[] = [
        { name: 'Blues', kind: 'head', bars: 12, sub: 3, laneFn: (b) => ({ r: RIDE, p: FOOT24, s: comp(`${seed}:1`, 12)[b] }), chart: BLUES_F, band: 'swing' },
        { name: 'Blues', kind: 'head', bars: 12, sub: 3, laneFn: (b) => ({ r: RIDE, p: FOOT24, s: comp(`${seed}:2`, 12, true)[b], ...(op === 2 ? { k: comp(`${seed}:k`, 12)[b].replace(/x/g, 'g') } : {}) }), chart: BLUES_F, band: 'swing', fillBefore: 'trip' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['F7'], end: true, fillBefore: 'trip' },
      ];
      const d = buildSong(s, secs, { title: t(`Comping over the blues · ${op === 2 ? 'snare and kick' : 'snare'}`, `קומפינג על בלוז · ${op === 2 ? 'סנר וקיק' : 'סנר'}`), bpm: 120, style: 'swing', seed, roadmap: 'written', signs: ['‖: Blues 12 :‖ ×2', 'Ending'] });
      return swingIt(d);
    }
    case 11: {
      // Set-ups and ensemble hits: time, then the figures (crash + kick) with a triplet set-up before each, time again.
      const HITS = [
        [0, 1 + 2 / 3, 3],
        [0, 2 + 2 / 3, 4 + 2 / 3],
        [0, 1, 3 + 2 / 3, 5],
      ][op % 3];
      const time: Lanes = { r: RIDE, p: FOOT24 };
      const secs: SongSection[] = [
        { name: 'A', kind: 'head', bars: 4, lanes: time, sub: 3, chart: AABA.A.slice(0, 4), band: 'swing' },
        { name: 'Hits', kind: 'interlude', bars: 2, chart: AABA.A.slice(4, 6), band: 'tacet', hits: HITS, tripSetup: true, fillBefore: 'trip' },
        { name: 'A', kind: 'head', bars: 4, lanes: time, sub: 3, chart: AABA.A.slice(0, 4), band: 'swing', fillBefore: 'trip' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['Bbmaj7'], end: true, fillBefore: 'trip' },
      ];
      return swingIt(buildSong(s, secs, { title: t(`Set-ups and ensemble hits · ${op + 1}`, `הכנות ומכות להקה · ${op + 1}`), bpm: 140, style: 'swing', seed }));
    }
    default: {
      // Broken time: a 2-feel in the A sections (ride, foot, a light kick on 1 and 3), 4 in the bridge, trading 8s.
      const two: Lanes = { r: op === 2 ? RIDE_Q : RIDE, p: FOOT24, k: 'g.....g.....' };
      const four: Lanes = { r: RIDE, p: FOOT24, k: FEATHER };
      const secs: SongSection[] = [
        { name: 'A', kind: 'head', bars: 8, lanes: two, sub: 3, chart: AABA.A, band: 'swing' },
        { name: 'B', kind: 'bridge', bars: 8, lanes: four, sub: 3, chart: AABA.B, band: 'swing', fillBefore: 'trip' },
        // Trading 8s: the band lays out and the drums play anything — only the landing on the next 1 is measured.
        { name: 'Solo', kind: 'solo', bars: 8, chart: AABA.A, band: 'tacet', bassRest: true },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['Bbmaj7'], end: true },
      ];
      const d = buildSong(s, secs, { title: t(`2 → 4 and trading 8s · ${['2-feel, light kick', 'with a feathered 4', 'ride quarters in 2'][op % 3]}`, `2 ← 4 וחילופי 8 · ${['תחושת 2, קיק קל', 'עם 4 מרוכך', 'רייד ברבעים ב-2'][op % 3]}`), bpm: 240, style: 'swing', seed, order: [0, 1, 0, 2, 3] });
      return swingIt(d, true);
    }
  }
}
