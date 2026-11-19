// AUDIT-7 #15 (docs/research/AUDIT-7-GAPS.md §3): the bass had no riff ladder (RSL group C asks for riffs at every grade)
// and no teaching ladder for the broken feels (two-feel, half-time, broken feel, ballad) before the standards at 1610+.
//
//   b-riff  riff idioms by grade, all ORIGINAL (no song riffs): 1 root–octave 8ths · 2 a minor-pentatonic riff with a push ·
//           3 chromatic approach notes into each chord · 4 a 16th-note funk riff with the octave · 5 a 3+3+2 riff in 8ths
//   b-feel  1 two-feel (halves, root and 5th) · 2 half-time (the space on 3 with the snare) · 3 broken feel (jazz: notes
//           off the beat, an approach on the "and" of 4) · 4 the ballad in 2 (long notes, approaches) · 5 stop-time (the
//           band hits each 1 for two bars), then back in two
//
// Each item plays over a progression (the chart above the notes), measured on the bass's own pitch and timing (bass.ts
// drillOf and the bass grader), all 12 keys. Riffs are learned in free time first, then on the tempo ladder; the feels
// are time drills with the drums under them (headphones / line-in / e-kit), timed from the start like every groove drill.
// Pure. bass.ts helpers are used only inside functions.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { SpecTemplate } from './generate';
import type { Tuning } from '../fretboard';
import { alt, chartOf, drillOf, endOn, lowest, overProg, PROGS, type BN, type Prog, type Q } from './bass';
import { all12 } from './keys12';
import type { GuitarFamilyDef, GuitarLevelDef } from './guitar';

const t = (en: string, he: string) => ({ en, he });
/** An approach note below the lowest string comes from above instead (a half step over the target). */
const inRange = (tu: Tuning, p: number): number => (p < lowest(tu) ? p + 2 : p);
type Fig = [number, number, number, boolean?][]; // [beat, length, interval above the root, accent]

/** Riff figures per grade (two each): one bar, intervals above the chord's root; `next` is the next chord's root. */
/** `groove`: the style the riff is written in (its title's feel; the riff itself plays without drums). */
type RiffDef = { en: string; he: string; prog: Prog; minor?: boolean; groove: string; fig: (next: number) => Fig };
// Built on first use: bass.ts (PROGS) and this module import each other, so nothing of bass.ts is read at load time.
let RIFF_CACHE: Record<number, RiffDef[]> | null = null;
const riffs = (): Record<number, RiffDef[]> => (RIFF_CACHE ??= {
  1: [
    { en: 'root and octave in 8ths', he: 'שורש ואוקטבה בשמיניות', prog: PROGS.p1451, groove: 'rock-8', fig: () => [[0, 0.5, 0, true], [0.5, 0.5, 0], [1, 0.5, 12], [1.5, 0.5, 0], [2, 0.5, 0, true], [2.5, 0.5, 0], [3, 0.5, 12], [3.5, 0.5, 7]] },
    { en: 'root, 5th and octave in 8ths', he: 'שורש, קווינטה ואוקטבה בשמיניות', prog: PROGS.rock, groove: 'rock-8', fig: () => [[0, 0.5, 0, true], [0.5, 0.5, 0], [1, 0.5, 7], [1.5, 0.5, 0], [2, 0.5, 12, true], [2.5, 0.5, 7], [3, 0.5, 0], [3.5, 0.5, 7]] },
  ],
  2: [
    { en: 'a minor-pentatonic riff with a push', he: 'ריף פנטטוני מינורי עם דחיפה', prog: [[0, 'm7'], [0, 'm7'], [5, 'm7'], [0, 'm7']], minor: true, groove: 'rock-8b', fig: () => [[0, 1, 0, true], [1, 0.5, 3], [1.5, 0.5, 5], [2, 1, 7], [3, 0.5, 5], [3.5, 0.5, 3, true]] },
    { en: 'a minor-pentatonic riff with rests', he: 'ריף פנטטוני מינורי עם הפסקות', prog: [[0, 'm7'], [5, 'm7'], [0, 'm7'], [7, 'm7']], minor: true, groove: 'rock-8', fig: () => [[0, 0.5, 0, true], [0.5, 0.5, 0], [1.5, 0.5, 3], [2, 0.5, 5], [2.5, 0.5, 7, true], [3.5, 0.5, 10]] },
  ],
  3: [
    { en: 'chromatic approach into each chord', he: 'גישה כרומטית אל כל אקורד', prog: PROGS.pop, groove: 'motown', fig: (n) => [[0, 1.5, 0, true], [1.5, 0.5, 0], [2, 0.5, 7], [2.5, 0.5, 12], [3, 0.5, 7], [3.5, 0.5, n - 1]] },
    { en: 'scale steps up to the next chord', he: 'צעדי סולם אל האקורד הבא', prog: PROGS.p145, groove: 'motown', fig: (n) => [[0, 1, 0, true], [1, 0.5, 0], [1.5, 0.5, 4], [2, 1, 7], [3, 0.5, n > 2 ? n - 2 : n + 10], [3.5, 0.5, n > 1 ? n - 1 : n + 11]] },
  ],
  4: [
    { en: 'a 16th-note funk riff with the octave', he: 'ריף פאנק בשש־עשריות עם האוקטבה', prog: [[0, '7'], [0, '7'], [5, '7'], [0, '7']], groove: 'funk-1', fig: () => [[0, 0.25, 0, true], [0.25, 0.25, 0], [0.75, 0.25, 12], [1.5, 0.25, 0], [1.75, 0.25, 10], [2, 0.5, 12, true], [2.75, 0.25, 7], [3, 0.25, 0], [3.5, 0.5, 10]] },
    { en: 'a 16th-note riff with a pickup into 1', he: 'ריף בשש־עשריות עם עלייה אל 1', prog: [[0, 'm7'], [0, 'm7'], [10, '7'], [5, '7']], groove: 'funk-2', fig: () => [[0, 0.5, 0, true], [0.75, 0.25, 0], [1, 0.25, 10], [1.25, 0.25, 12], [1.5, 0.5, 7], [2.5, 0.25, 0], [2.75, 0.25, 3], [3, 0.25, 5], [3.25, 0.25, 6], [3.5, 0.5, 7, true]] },
  ],
  5: [
    { en: 'a 3+3+2 riff in 8ths', he: 'ריף 3+3+2 בשמיניות', prog: [[0, 'm7'], [0, 'm7'], [8, 'M'], [10, 'M']], minor: true, groove: 'rock-16', fig: () => [[0, 0.5, 0, true], [0.5, 0.5, 12], [1, 0.5, 10], [1.5, 0.5, 0, true], [2, 0.5, 12], [2.5, 0.5, 7], [3, 0.5, 0, true], [3.5, 0.5, 3]] },
    { en: 'a 3+3+2 riff with a pedal and a fill', he: 'ריף 3+3+2 עם צליל עוגב ומעבר', prog: [[0, 'm7'], [5, 'm7'], [0, 'm7'], [7, '7']], minor: true, groove: 'rock-16', fig: () => [[0, 0.5, 0, true], [0.5, 0.25, 0], [0.75, 0.25, 7], [1, 0.5, 0], [1.5, 0.5, 0, true], [2, 0.25, 0], [2.25, 0.25, 10], [2.5, 0.5, 0], [3, 0.25, 3, true], [3.25, 0.25, 5], [3.5, 0.25, 6], [3.75, 0.25, 7]] },
  ],
});

/** A one-bar figure over a progression twice through, landing on the tonic. */
function figLine(tu: Tuning, key: number, prog: Prog, fig: (next: number) => Fig): BN[] {
  const full = [...prog, ...prog];
  const line = overProg(tu, key, full, (R, _c, _bar, next) => fig(next - R).map(([b, d, iv, acc]) => ({ b, d, p: inRange(tu, R + iv), ct: iv % 12 === 0 || iv % 12 === 7, ...(acc ? { acc: true } : {}) })));
  line.push(endOn(tu, key, full.length * 4, 2));
  return line;
}

function genRiff(s: DrillSpec, tu: Tuning): Drill {
  const grade = Number(s.kind.split('-')[1]) || 1;
  const rs = riffs()[grade];
  const r = rs[(s.option ?? 0) % rs.length];
  const key = ((s.key % 12) + 12) % 12;
  const line = figLine(tu, key, r.prog, r.fig);
  const sp = r.minor ? { ...s, minor: true } : s;
  // A riff is notes to learn first (as g-riff): free time, then the tempo ladder — no drums under it (a drum groove
  // would make it a time drill, rubato.ts). The feels below are about the time itself and keep their drums.
  return drillOf(sp, tu, alt(line), { en: `Grade ${grade} riff: ${r.en}`, he: `ריף לכיתה ${grade}: ${r.he}`, chart: chartOf(key, [...r.prog, ...r.prog]), evenness: false });
}

// ───────────────────────────── b-feel ─────────────────────────────

type FeelDef = { en: string; he: string; prog: Prog; groove: string; fig: (next: number, q: Q, bar: number) => Fig; stop?: number[] };
let FEEL_CACHE: Record<string, FeelDef[]> | null = null;
const JAZZ2: Prog = [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7'], [4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']];
const BALLAD: Prog = [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7'], [5, 'maj7'], [10, '7'], [2, 'm7'], [7, '7']];
const feels = (): Record<string, FeelDef[]> => (FEEL_CACHE ??= {
  two: [
    { en: 'two-feel: root and 5th in halves', he: 'תחושה של שתיים: שורש וקווינטה בחצאים', prog: JAZZ2, groove: 'swing', fig: () => [[0, 2, 0, true], [2, 2, 7]] },
    { en: 'two-feel with an approach on 4', he: 'תחושה של שתיים עם גישה על 4', prog: JAZZ2, groove: 'swing', fig: (n) => [[0, 2, 0, true], [2, 1, 7], [3, 1, n - 1]] },
  ],
  half: [
    { en: 'half-time: space on 3 for the snare', he: 'חצי זמן: מקום על 3 לסנר', prog: PROGS.rock, groove: 'half-time', fig: () => [[0, 1.5, 0, true], [1.5, 0.5, 0], [3, 0.5, 7], [3.5, 0.5, 10]] },
    { en: 'half-time with a pickup into 1', he: 'חצי זמן עם עלייה אל 1', prog: PROGS.pop, groove: 'half-time', fig: (n) => [[0, 2, 0, true], [2.5, 0.5, 12], [3, 0.5, 7], [3.5, 0.5, n - 1]] },
  ],
  broken: [
    { en: 'broken feel: off the beat, approach on the "and" of 4', he: 'תחושה שבורה: מחוץ לפעמה, גישה על ה"וְ" של 4', prog: JAZZ2, groove: 'swing', fig: (n) => [[0, 1.5, 0, true], [1.5, 1, 7], [2.5, 1, 12], [3.5, 0.5, n - 1]] },
    { en: 'broken feel: the 3rd and a skip', he: 'תחושה שבורה: הטרצה ודילוג', prog: JAZZ2, groove: 'swing', fig: (n, q) => [[0, 1, 0, true], [1.5, 0.5, q === 'm7' ? 3 : 4], [2, 1.5, 7], [3.5, 0.5, n + 1]] },
  ],
  ballad: [
    { en: 'the ballad in 2: long notes', he: 'הבלדה בשתיים: צלילים ארוכים', prog: BALLAD, groove: 'ballad-brush', fig: () => [[0, 2, 0, true], [2, 2, 7]] },
    { en: 'the ballad in 2 with approaches', he: 'הבלדה בשתיים עם גישות', prog: BALLAD, groove: 'ballad-brush', fig: (n) => [[0, 2, 0, true], [2, 1.5, 7], [3.5, 0.5, n - 1]] },
  ],
  // Stop-time: the band hits each 1 together for two bars (the bass on the root, short), then the two-feel returns.
  stop: [
    { en: 'stop-time, then back in two', he: 'סטופ־טיים, ואז חזרה לשתיים', prog: JAZZ2, groove: 'swing', stop: [0, 1, 4, 5], fig: (n, _q, bar) => (bar % 4 < 2 ? [[0, 0.5, 0, true]] : [[0, 2, 0, true], [2, 1, 7], [3, 1, n - 1]]) },
    { en: 'stop-time on the 1 and the "and" of 2, then back in two', he: 'סטופ־טיים על 1 ועל ה"וְ" של 2, ואז חזרה לשתיים', prog: JAZZ2, groove: 'swing', stop: [0, 1, 4, 5], fig: (n, _q, bar) => (bar % 4 < 2 ? [[0, 0.5, 0, true], [1.5, 0.5, 0]] : [[0, 2, 0, true], [2, 1.5, 7], [3.5, 0.5, n - 1]]) },
  ],
});
const FEEL_LEVEL = ['two', 'half', 'broken', 'ballad', 'stop'];

function genFeel(s: DrillSpec, tu: Tuning): Drill {
  const which = s.kind.replace(/^feel-/, '');
  const fs = feels()[which];
  const f = fs[(s.option ?? 0) % fs.length];
  const key = ((s.key % 12) + 12) % 12;
  const line = overProg(tu, key, f.prog, (R, c, bar, next) => f.fig(next - R, c[1], bar).map(([b, d, iv, acc]) => ({ b, d, p: inRange(tu, R + iv), ct: iv % 12 === 0 || iv % 12 === 7, ...(acc ? { acc: true } : {}) })));
  line.push(endOn(tu, key, f.prog.length * 4, 2));
  const d = drillOf(s, tu, alt(line), { en: f.en, he: f.he, chart: chartOf(key, f.prog), drums: { groove: f.groove }, evenness: false });
  // Stop-time: the band plays one short hit on each 1 in those bars (band road map, 'stop').
  if (f.stop && d.band) {
    const style = d.band.style;
    const sections: NonNullable<NonNullable<Drill['band']>['sections']> = [];
    f.stop.forEach((b) => {
      if (!f.stop!.includes(b - 1)) sections.push({ bar: b, style: 'stop' });
      if (!f.stop!.includes(b + 1)) sections.push({ bar: b + 1, style });
    });
    d.band = { ...d.band, sections };
  }
  return d;
}

/** Build a b-riff or b-feel item. */
export function generateBassRiffFeel(s: DrillSpec, tu: Tuning): Drill {
  return s.family === 'b-feel' ? genFeel(s, tu) : genRiff(s, tu);
}

// ───────────────────────────── the families ─────────────────────────────

/** Bass keys: E, A, D, G, C, F first, then all 12 (the owner's rule). */
export const BASS_RIFF_KEYS = all12([4, 9, 2, 7, 0, 5]);

export function bassRiffFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'b-riff';
  const P = (grade: number, option: number): SpecTemplate => ({ family: fam, kind: `riff-${grade}`, hands: 'R', instrument: 'bass', option });
  const L = (grade: number, en: string, he: string, tempo: [number, number], sub: string): GuitarLevelDef => ({ id: `${fam}-${grade}`, level: grade, title: t(en, he), specs: [0, 1].map((o) => ({ ...P(grade, o), tempo: tempo[0] })), keys: BASS_RIFF_KEYS, tempo, sub, exam: [{ board: 'RSL', grade: String(grade) }] });
  return {
    id: fam,
    title: t('Bass riffs by grade', 'ריפים לבס לפי כיתה'),
    style: 'classical',
    genres: ['all'],
    instruments: ['bass'],
    levels: [
      L(1, 'Grade 1 riffs: root, 5th and octave in 8ths', 'ריפים לכיתה 1: שורש, קווינטה ואוקטבה בשמיניות', [70, 110], '8ths'),
      L(2, 'Grade 2 riffs: minor pentatonic with a push', 'ריפים לכיתה 2: פנטטוני מינורי עם דחיפה', [70, 110], '8ths'),
      L(3, 'Grade 3 riffs: approach notes into the chord', 'ריפים לכיתה 3: צלילי גישה אל האקורד', [70, 112], '8ths'),
      L(4, 'Grade 4 riffs: 16th-note funk', 'ריפים לכיתה 4: פאנק בשש־עשריות', [60, 96], '16ths'),
      L(5, 'Grade 5 riffs: 3+3+2 groupings', 'ריפים לכיתה 5: קבוצות 3+3+2', [70, 112], '8ths / 16ths'),
    ],
  };
}

export function bassFeelFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'b-feel';
  const P = (level: number, option: number): SpecTemplate => ({ family: fam, kind: `feel-${FEEL_LEVEL[level - 1]}`, hands: 'R', instrument: 'bass', option });
  const L = (level: number, en: string, he: string, tempo: [number, number], sub: string): GuitarLevelDef => ({ id: `${fam}-${level}`, level, title: t(en, he), specs: [0, 1].map((o) => ({ ...P(level, o), tempo: tempo[0] })), keys: BASS_RIFF_KEYS, tempo, sub });
  return {
    id: fam,
    title: t('Feels: two, half-time, broken, ballad, stop-time', 'תחושות: שתיים, חצי זמן, שבורה, בלדה, סטופ־טיים'),
    style: 'classical',
    genres: ['all'],
    instruments: ['bass'],
    levels: [
      L(1, 'Two-feel', 'תחושה של שתיים', [90, 160], 'halves'),
      L(2, 'Half-time feel', 'תחושת חצי זמן', [70, 120], '8ths'),
      L(3, 'Broken feel', 'תחושה שבורה', [100, 160], 'off-beat 8ths'),
      L(4, 'The ballad in 2', 'הבלדה בשתיים', [56, 80], 'halves / approaches'),
      L(5, 'Stop-time, then back in two', 'סטופ־טיים, ואז חזרה לשתיים', [100, 160], 'hits on 1 → halves'),
    ],
  };
}
