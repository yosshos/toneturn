// Phrase organisation and note choice of an improvised line: a practice-quality signal, after Jeremy Siskind's MTNA
// 2024 evaluation framework (docs/research/SISKIND-SOLO-PIANO.md A10 "MTNA 2024 evaluation framework", C5 #7).
//
//  Phrasing — real phrases with beginnings and endings, a variety of rhythmic units, varied beginnings and endings,
//  relation to the form. His scale: (Monotonous) – Organized – Varied – (Random); the two ends are unacceptable.
//  Note choice — matching the chords, tension and resolution, a stylistic amount of chromaticism. His scale:
//  bland – appropriate yet colourful – arbitrary.
//
// The measures and thresholds below are this app's reading of the rubric (verify against the MTNA session): the
// rubric names the qualities, not numbers. The fixes in the tips are his (A10): listen proactively, phrase patterns
// (play one / rest one), phrases with pickups, sing the improvisations; for note choice, arpeggios, arpeggios with
// chromatic neighbours, arpeggios filled in with scales.
//
// playRestCheck: "Play one, rest one" and "play two, rest two" ("Satin Doll", M5vF89o6Ul0; A3) — bars of playing
// alternating with bars of rest. Pure.

import { phrasesOf } from './improvPhrasing';
import { MODE_STEPS } from './modes';
import { autoScale } from './ruleCards';

type T2 = { en: string; he: string };
export type PhraseBand = 'monotonous' | 'organized' | 'varied' | 'random';
export type NoteBand = 'bland' | 'colourful' | 'arbitrary';

export interface PhraseOrgReport {
  band: PhraseBand;
  /** Note choice against the chords (null: no chords to judge against). */
  noteBand: NoteBand | null;
  phrases: number;
  /** Share of the take with nothing sounding (0–1). */
  restShare: number;
  /** Distinct phrase start positions in the bar ÷ phrases (0 with fewer than two phrases). */
  startVariety: number;
  /** Distinct phrase lengths (to the beat) ÷ phrases (0 with fewer than two phrases). */
  lengthVariety: number;
  /** Share of phrases that start near a 2-bar boundary of the form (a pickup up to a beat early counts). */
  formFit: number;
  /** 0–1: monotonous 0.3, organized 0.75, varied 1, random 0.2 (lowered by an arbitrary note choice). */
  score: number;
  tip: T2;
}

export interface PNoteIn {
  beat: number;
  dur: number;
  midi: number;
}
export interface PSpan {
  at: number;
  beats: number;
  root: number;
  iv: number[];
}

const pc = (n: number): number => ((n % 12) + 12) % 12;
/** A rest of a beat or more ends a phrase. */
const PHRASE_GAP = 1;

export const PHRASE_BAND_NAME: Record<PhraseBand, T2> = {
  monotonous: { en: 'monotonous', he: 'מונוטוני' },
  organized: { en: 'organized', he: 'מאורגן' },
  varied: { en: 'varied', he: 'מגוון' },
  random: { en: 'random', he: 'אקראי' },
};
export const NOTE_BAND_NAME: Record<NoteBand, T2> = {
  bland: { en: 'bland', he: 'תפל' },
  colourful: { en: 'colourful', he: 'צבעוני' },
  arbitrary: { en: 'arbitrary', he: 'שרירותי' },
};

const TIPS: Record<string, T2> = {
  monotonous: { en: 'Leave space: play one bar, rest one, and sing the next idea first.', he: 'להשאיר מקום: תיבה מנגנים, תיבה נחים, ולשיר את הרעיון הבא קודם.' },
  random: { en: 'Fewer, longer phrases: hear the idea first, start it with a pickup, land it on the form.', he: 'פחות משפטים וארוכים יותר: לשמוע את הרעיון קודם, להתחיל באנקרוזה, לנחות על הצורה.' },
  organized: { en: 'Good phrases. Vary where they start and how long they run.', he: 'משפטים טובים. לגוון איפה הם מתחילים וכמה הם נמשכים.' },
  varied: { en: 'Organized and varied phrasing.', he: 'משפטים מאורגנים ומגוונים.' },
  bland: { en: 'Add colour: chromatic neighbours around the arpeggio.', he: 'להוסיף צבע: שכנים כרומטיים סביב הארפג׳.' },
  arbitrary: { en: 'Aim at chord tones: arpeggios first, then fill them in with the scale.', he: 'לכוון לצלילי אקורד: קודם ארפג׳ים, ואז למלא אותם בסולם.' },
};

const distinct = (xs: number[]): number => new Set(xs).size;

/** Note choice against the chart (null without chords or with too few notes). */
export function noteChoice(notes: PNoteIn[], spans: PSpan[]): NoteBand | null {
  if (!spans.length || notes.length < 4) return null;
  const ns = [...notes].sort((a, b) => a.beat - b.beat);
  const spanAt = (b: number): PSpan => spans.reduce((cur, s) => (s.at <= b + 1e-6 ? s : cur), spans[0]);
  const kind = (n: PNoteIn): 'ct' | 'scale' | 'out' => {
    const s = spanAt(n.beat);
    const rel = pc(n.midi - s.root);
    const cts = new Set([0, ...s.iv.filter((x) => x < 12).map(pc)]);
    if (cts.has(rel)) return 'ct';
    const sc = new Set([...MODE_STEPS[autoScale(s.iv)].map(pc), ...s.iv.map(pc)]);
    return sc.has(rel) ? 'scale' : 'out';
  };
  let ct = 0;
  let out = 0;
  let outUnresolved = 0;
  ns.forEach((n, i) => {
    const k = kind(n);
    if (k === 'ct') ct++;
    if (k !== 'out') return;
    out++;
    const nx = ns[i + 1];
    // a chromatic note resolves by a half or whole step into the next note, which is not itself out of the chord
    const resolved = !!nx && Math.abs(nx.midi - n.midi) <= 2 && nx.midi !== n.midi && kind(nx) !== 'out';
    if (!resolved) outUnresolved++;
  });
  const N = ns.length;
  if (outUnresolved / N > 0.2 || out / N > 0.4) return 'arbitrary';
  if (ct / N >= 0.9) return 'bland';
  return 'colourful';
}

/** The phrase-organisation report of an improvised line (beats from the take's start). */
export function phraseOrg(notes: PNoteIn[], o: { totalBeats: number; meter: number; spans?: PSpan[] }): PhraseOrgReport {
  const meter = o.meter || 4;
  const total = Math.max(meter, o.totalBeats);
  const noteBand = o.spans ? noteChoice(notes, o.spans) : null;
  const ps = phrasesOf(notes.map((n) => ({ beat: n.beat, dur: n.dur, midi: n.midi })), PHRASE_GAP);
  const n = ps.length;
  const sounding = ps.reduce((a, p) => a + Math.min(p.end, total) - Math.max(0, p.start), 0);
  const restShare = Math.max(0, Math.min(1, 1 - sounding / total));
  const starts = ps.map((p) => Math.round(((p.start % meter) + meter) % meter * 2) / 2 % meter);
  const lengths = ps.map((p) => Math.max(1, Math.round(p.end - p.start)));
  const startVariety = n >= 2 ? distinct(starts) / n : 0;
  const lengthVariety = n >= 2 ? distinct(lengths) / n : 0;
  // relation to the form: a phrase starting within a beat before / a bar after a 2-bar boundary
  const unit = 2 * meter;
  const fits = ps.filter((p) => {
    const k = Math.round(p.start / unit) * unit;
    const d = p.start - k;
    return d >= -1 - 1e-6 && d <= meter + 1e-6;
  }).length;
  const formFit = n ? fits / n : 0;
  // rhythmic units inside the phrases (inter-onset intervals to the 16th)
  const units = distinct(ps.flatMap((p) => p.notes.slice(1).map((x, i) => Math.round((x.beat - p.notes[i].beat) * 4) / 4)).filter((x) => x > 0));
  const fragShare = n ? ps.filter((p) => p.notes.length < 3).length / n : 0;

  let band: PhraseBand;
  if (notes.length < 3) band = 'monotonous';
  else if (n >= 3 && (fragShare >= 0.5 || formFit < 0.34)) band = 'random';
  else if (n <= 1 || restShare < 0.12 || (n >= 3 && distinct(starts) === 1 && distinct(lengths) === 1 && units <= 1)) band = 'monotonous';
  else if (n >= 2 && distinct(starts) >= 2 && distinct(lengths) >= 2 && units >= 2) band = 'varied';
  else band = 'organized';

  const base = { monotonous: 0.3, organized: 0.75, varied: 1, random: 0.2 }[band];
  const score = Math.round((noteBand === 'arbitrary' ? base * 0.7 : base) * 100) / 100;
  const tip = band === 'monotonous' || band === 'random' ? TIPS[band] : noteBand && noteBand !== 'colourful' ? TIPS[noteBand] : TIPS[band];
  return { band, noteBand, phrases: n, restShare: Math.round(restShare * 100) / 100, startVariety: Math.round(startVariety * 100) / 100, lengthVariety: Math.round(lengthVariety * 100) / 100, formFit: Math.round(formFit * 100) / 100, score, tip };
}

/**
 * Play one / rest one (play = rest = 1), play two / rest two (2, 2): `play` bars with at least one onset, then `rest`
 * bars with none. A held note's tail in a rest bar is fine; so is a pickup in the last eighth of a rest bar going into
 * a play bar (onsets up to 0.15 beat early count for the next bar). Counts bars.
 */
export function playRestCheck(notes: PNoteIn[], o: { play: number; rest: number; meter: number; totalBeats: number }): { ok: number; total: number } {
  const m = o.meter || 4;
  const bars = Math.max(1, Math.ceil(o.totalBeats / m - 1e-6));
  const cycle = Math.max(1, o.play + o.rest);
  const isPlay = (b: number) => b % cycle < o.play;
  const onsets: number[][] = Array.from({ length: bars }, () => []);
  for (const n of notes) {
    const b = Math.floor((n.beat + 0.15) / m);
    if (b >= 0 && b < bars) onsets[b].push(n.beat - b * m);
  }
  let ok = 0;
  for (let b = 0; b < bars; b++) {
    if (isPlay(b)) {
      if (onsets[b].length > 0) ok++;
      continue;
    }
    const pickupOk = b + 1 < bars && isPlay(b + 1);
    if (onsets[b].every((x) => pickupOk && x >= m - 0.5 - 1e-6)) ok++;
  }
  return { ok, total: bars };
}

/** The profile's line on the last improvised takes: the most common band (null under 3 takes). */
export function phrasingSummary(bands: PhraseBand[]): T2 | null {
  if (bands.length < 3) return null;
  const order: PhraseBand[] = ['varied', 'organized', 'monotonous', 'random'];
  const top = order.reduce((a, b) => (bands.filter((x) => x === b).length > bands.filter((x) => x === a).length ? b : a));
  const n = bands.length;
  return { en: `Improvised phrasing: mostly ${PHRASE_BAND_NAME[top].en} (${n} takes)`, he: `משפטים באלתור: בעיקר ${PHRASE_BAND_NAME[top].he} (${n} ניסיונות)` };
}
