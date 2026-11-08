// Improvising under rules (owner 2026-11-08): measurable improvisation. A chart (chords per bar) + a scale for each bar
// (automatic from the chord, or set by the player / teacher) + up to three rules — one for the notes, one for the
// intervals, one for the rhythm. Every played note is checked against them; the result is a compliance score per rule
// and a bar-by-bar map of where the rules were broken. Research basis: note-limiting, chord-tones-only, guide tones on
// strong beats, thirds-only, continuous eighths, triplets / quarters only (teachers' constraint drills). Pure.

import { MODE_STEPS, type ModeId } from './modes';
import type { ParsedChart } from './charts';
import { chordAtBeat } from './charts';

export type NoteRule = 'scale' | 'chord-tones' | 'guide-beats' | 'target-3' | 'three-notes';
export type IntervalRule = 'steps' | 'thirds' | 'no-repeats';
export type RhythmRule = 'eighths' | 'triplets' | 'quarters' | 'sixteenths' | 'space';
export interface RuleSet {
  note: NoteRule | null;
  interval: IntervalRule | null;
  rhythm: RhythmRule | null;
}

export const NOTE_RULES: NoteRule[] = ['scale', 'chord-tones', 'guide-beats', 'target-3', 'three-notes'];
export const INTERVAL_RULES: IntervalRule[] = ['steps', 'thirds', 'no-repeats'];
export const RHYTHM_RULES: RhythmRule[] = ['eighths', 'triplets', 'quarters', 'sixteenths', 'space'];

type Bi = { en: string; he: string };
export const RULE_NAME: Record<NoteRule | IntervalRule | RhythmRule, Bi & { how: Bi }> = {
  scale: { en: 'Stay in the scale', he: 'להישאר בסולם', how: { en: 'Only notes of each bar’s scale.', he: 'רק צלילים מהסולם של כל תיבה.' } },
  'chord-tones': { en: 'Chord tones only', he: 'רק צלילי אקורד', how: { en: 'Only 1, 3, 5, 7 of the chord you are on — arpeggios.', he: 'רק 1, 3, 5, 7 של האקורד הנוכחי — ארפג׳יו.' } },
  'guide-beats': { en: '3rd or 7th on 1 and 3', he: 'טרצה או ספטימה על 1 ו־3', how: { en: 'Free between the beats, but a guide tone (3rd / 7th) on beats 1 and 3.', he: 'חופשי בין הפעמות, אבל צליל מנחה (טרצה / ספטימה) על פעמות 1 ו־3.' } },
  'target-3': { en: 'Land on the 3rd', he: 'לנחות על הטרצה', how: { en: 'Start every new chord on its 3rd.', he: 'להתחיל כל אקורד חדש על הטרצה שלו.' } },
  'three-notes': { en: 'Three notes only', he: 'רק שלושה צלילים', how: { en: 'Pick any three pitch names and use only them for the whole chorus.', he: 'בחרו שלושה צלילים והשתמשו רק בהם לאורך כל הסבב.' } },
  steps: { en: 'Steps only', he: 'רק צעדים', how: { en: 'Every move is a half or whole step.', he: 'כל מעבר הוא חצי טון או טון.' } },
  thirds: { en: 'Thirds only', he: 'רק טרצות', how: { en: 'Every move is a minor or major third (up or down).', he: 'כל מעבר הוא טרצה קטנה או גדולה (למעלה או למטה).' } },
  'no-repeats': { en: 'No repeated notes', he: 'בלי לחזור על צליל', how: { en: 'Never play the same note twice in a row.', he: 'לא לנגן אותו צליל פעמיים ברצף.' } },
  eighths: { en: 'Continuous eighths', he: 'שמיניות רצופות', how: { en: 'An unbroken line of eighth notes (swung is fine) through the changes.', he: 'קו רצוף של שמיניות (גם בסווינג) לאורך כל המהלך.' } },
  triplets: { en: 'Triplets only', he: 'רק טריולות', how: { en: 'Every note on an eighth-note triplet.', he: 'כל צליל על טריולה של שמיניות.' } },
  quarters: { en: 'Quarter notes only', he: 'רק רבעים', how: { en: 'One note on each beat — choose them well.', he: 'צליל אחד בכל פעמה — בחרו אותם היטב.' } },
  sixteenths: { en: 'Sixteenths', he: 'שש־עשריות', how: { en: 'Runs of sixteenth notes.', he: 'ריצות של שש־עשריות.' } },
  space: { en: 'Two bars on, two off', he: 'שתי תיבות כן, שתיים לא', how: { en: 'Play two bars, rest two bars — question and answer with yourself.', he: 'מנגנים שתי תיבות, שותקים שתיים — שאלה ותשובה עם עצמכם.' } },
};

/** Scales a bar can be set to (chord-scale theory + blues / pentatonics). */
export const BAR_SCALES: ModeId[] = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'melodic-minor', 'lydian-dominant', 'altered', 'diminished', 'whole-tone', 'harmonic-minor', 'phrygian-dominant', 'bebop-dominant', 'major-pentatonic', 'minor-pentatonic', 'blues'];

/** The usual chord-scale for a chord (by its intervals) — the default when nobody set one. */
export function autoScale(iv: number[]): ModeId {
  const has = (x: number) => iv.includes(x);
  if (has(3) && has(6) && has(9)) return 'diminished';
  if (has(3) && has(6)) return 'locrian';
  if (has(3) && has(11)) return 'melodic-minor';
  if (has(3)) return 'dorian';
  if (has(11) && has(18)) return 'lydian';
  if (has(4) && has(8) && has(10)) return 'whole-tone';
  if (has(5) && has(10) && has(13)) return 'phrygian';
  if (has(4) && has(10) && (has(13) || has(15) || has(20))) return 'altered';
  if (has(4) && has(10) && has(18)) return 'lydian-dominant';
  if (has(4) && has(10)) return 'mixolydian';
  if (has(5) && has(10)) return 'mixolydian';
  if (has(4) && has(8)) return 'whole-tone';
  return 'ionian';
}

export interface PlayedNote {
  /** Seconds from the chart's first beat. */
  start: number;
  end: number;
  midi: number;
}

export interface RuleCheck {
  rule: NoteRule | IntervalRule | RhythmRule;
  ok: number;
  total: number;
}
export interface RulesReport {
  notes: number;
  checks: RuleCheck[];
  /** Per bar (of the performance): notes and rule breaks. */
  bars: { notes: number; breaks: number }[];
  /** 0..1: the mean compliance of the active rules (0 with fewer than 4 notes). */
  score: number;
}

const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;

/**
 * Check a take against the rules. `scales[bar]` overrides the automatic chord-scale of that chart bar.
 * Beat positions are in quarter beats; swing is tolerated (an "&" anywhere from 1/2 to 2/3 of the beat).
 */
export function checkRules(played: PlayedNote[], chart: ParsedChart, meter: number, bpm: number, rules: RuleSet, scales: Record<number, ModeId> = {}, totalBars?: number): RulesReport {
  const beatS = 60 / bpm;
  const notes = played.filter((n) => n.end - n.start > 0.04).sort((a, b) => a.start - b.start);
  const nBars = totalBars ?? Math.max(1, Math.ceil((notes.length ? notes[notes.length - 1].end : 0) / beatS / meter));
  const bars = Array.from({ length: nBars }, () => ({ notes: 0, breaks: 0 }));
  const checks: RuleCheck[] = [];
  const add = (rule: RuleCheck['rule']) => {
    const c = { rule, ok: 0, total: 0 };
    checks.push(c);
    return c;
  };
  const barOf = (t: number) => Math.max(0, Math.min(nBars - 1, Math.floor(t / beatS / meter + 1e-6)));
  const beatOf = (t: number) => t / beatS;
  const mark = (c: RuleCheck, t: number, ok: boolean) => {
    c.total++;
    if (ok) c.ok++;
    else bars[barOf(t)].breaks++;
  };
  for (const n of notes) bars[barOf(n.start)].notes++;
  const chordAt = (t: number) => chordAtBeat(chart, meter, Math.floor(beatOf(t) + 0.15));
  const chartBar = (t: number) => Math.floor(Math.floor(beatOf(t) + 0.15) / meter) % Math.max(1, chart.bars);

  // ---- notes
  if (rules.note) {
    const c = add(rules.note);
    if (rules.note === 'three-notes') {
      const counts = new Map<number, number>();
      for (const n of notes) counts.set(pc(n.midi), (counts.get(pc(n.midi)) ?? 0) + 1);
      const keep = new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p));
      for (const n of notes) mark(c, n.start, keep.has(pc(n.midi)));
    } else {
      let prevChord: ReturnType<typeof chordAt> = null;
      for (const n of notes) {
        const ch = chordAt(n.start);
        if (!ch) continue;
        const rel = (pc(n.midi) - ch.root + 12) % 12;
        const tones = ch.iv.map((x) => x % 12);
        const b = beatOf(n.start);
        const onStrong = Math.abs(b - Math.round(b)) < 0.2 && Math.round(b) % 2 === 0;
        if (rules.note === 'scale') {
          const mode = scales[chartBar(n.start)] ?? autoScale(ch.iv);
          mark(c, n.start, MODE_STEPS[mode].map((x) => x % 12).includes(rel));
        } else if (rules.note === 'chord-tones') mark(c, n.start, tones.includes(rel));
        else if (rules.note === 'guide-beats') {
          if (onStrong) mark(c, n.start, rel === ch.iv[1] % 12 || rel === (ch.iv[3] ?? ch.iv[2]) % 12);
        } else if (rules.note === 'target-3') {
          if (ch !== prevChord) mark(c, n.start, rel === ch.iv[1] % 12);
        }
        prevChord = ch;
      }
    }
  }

  // ---- intervals
  if (rules.interval) {
    const c = add(rules.interval);
    for (let i = 1; i < notes.length; i++) {
      // a rest longer than a beat starts a new phrase: no interval to judge
      if (notes[i].start - notes[i - 1].end > beatS) continue;
      const d = Math.abs(Math.round(notes[i].midi) - Math.round(notes[i - 1].midi));
      const ok = rules.interval === 'steps' ? d === 1 || d === 2 : rules.interval === 'thirds' ? d === 3 || d === 4 : d !== 0;
      mark(c, notes[i].start, ok);
    }
  }

  // ---- rhythm
  if (rules.rhythm) {
    const c = add(rules.rhythm);
    if (rules.rhythm === 'space') {
      for (const n of notes) {
        const bar = Math.floor(beatOf(n.start) / meter + 1e-6);
        mark(c, n.start, bar % 4 < 2);
      }
    } else {
      const grid = rules.rhythm === 'quarters' ? [0] : rules.rhythm === 'eighths' ? [0, 0.5, 2 / 3] : rules.rhythm === 'triplets' ? [0, 1 / 3, 2 / 3] : [0, 0.25, 0.5, 0.75];
      const tol = rules.rhythm === 'sixteenths' ? 0.08 : 0.11;
      for (const n of notes) {
        const b = beatOf(n.start);
        const f = b - Math.floor(b);
        const onGrid = grid.some((g) => Math.abs(f - g) < tol) || f > 1 - tol;
        mark(c, n.start, onGrid);
      }
      // continuous eighths: also no holes — every beat of the take has two onsets
      if (rules.rhythm === 'eighths' && notes.length) {
        const first = Math.floor(beatOf(notes[0].start));
        const last = Math.floor(beatOf(notes[notes.length - 1].start));
        for (let b = first; b <= last; b++) {
          const n = notes.filter((x) => Math.floor(beatOf(x.start) + 0.1) === b).length;
          mark(c, b * beatS, n >= 2);
        }
      }
    }
  }

  const active = checks.filter((c) => c.total > 0);
  const score = notes.length < 4 || !active.length ? 0 : Math.round((active.reduce((a, c) => a + c.ok / c.total, 0) / active.length) * 1000) / 1000;
  return { notes: notes.length, checks, bars, score };
}
