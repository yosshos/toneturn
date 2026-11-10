// Surface variation (playtesting, 0.36): an item that sounds exactly the same every day is answered from memory,
// not by ear. What a relative question tests (a chord colour, a rhythm, a polyrhythm, an interval) survives a
// transposition and a small tempo change, so each item gets both — fixed by its seed, so a replay is identical.
// Items tied to absolute pitch or tempo (note names, keys, notation on screen, "which BPM") are left alone.

import type { ChoiceQuestion, Question, Stimulus } from './lesson';

// (own PRNG: importing lesson.ts here would close an import cycle through the topic files)
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Topics whose answers depend on the actual pitch or tempo heard. */
const ABSOLUTE_TOPIC = /abs|register|range|sight|transpos|tempo|bpm|bh-keys|key-|keys|perfect-pitch|tuning-ref/;
/** A choice label that names a pitch ("B♭", "F#m7", "C major") or a tempo. */
const PITCH_NAME = /(^|[\s(/])[A-G](?:[♭♯b#])?(?=$|[\s)m7/+°ø-]|maj|min|dim|aug|sus)/;
/** In the question text: a pitch only with an accidental, a chord suffix or "major/minor" ("A rhythm" is not the note A). */
const PITCH_IN_TEXT = /(^|[\s(])[A-G](?:[♭♯b#]|m7|m\(|maj|min|dim|7|\/[A-G]| major| minor| flat| sharp)/;
/** Absolute tempo (faster/slower than the other sound is relative and survives a tempo change). */
const TEMPO_WORD = /bpm|tempo|טמפו/i;

const LO = 33;
const HI = 100;

function names(q: ChoiceQuestion): string[] {
  return Object.values(q.names ?? {}).flatMap((n) => [n.en, n.he]);
}

function allStims(q: ChoiceQuestion): Stimulus[][] {
  return [q.stimulus, ...Object.values(q.choiceStim ?? {})];
}

function pitches(s: Stimulus): number[] {
  switch (s.kind) {
    case 'note':
      return [s.midi];
    case 'notes':
    case 'chord':
    case 'melody':
      return s.midis;
    case 'resolve':
      return [s.fromMidi, s.toMidi];
    case 'events':
      return s.events.filter((e) => !e.perc).map((e) => e.midi);
    default:
      return [];
  }
}

function shift(s: Stimulus, k: number, f: number): Stimulus {
  switch (s.kind) {
    case 'note':
      return { ...s, midi: s.midi + k };
    case 'notes':
      return { ...s, midis: s.midis.map((m) => m + k), each: s.each / f };
    case 'chord':
      return { ...s, midis: s.midis.map((m) => m + k) };
    case 'resolve':
      return { ...s, fromMidi: s.fromMidi + k, toMidi: s.toMidi + k };
    case 'melody':
      return { ...s, midis: s.midis.map((m) => m + k), bpm: s.bpm * f };
    case 'rhythm':
      return { ...s, bpm: Math.round(s.bpm * f) };
    case 'events':
      return { ...s, events: s.events.map((e) => ({ ...e, midi: e.perc ? e.midi : e.midi + k, start: e.start / f, duration: e.perc ? e.duration : e.duration / f })), length: s.length / f };
    case 'rest':
      return { ...s, duration: s.duration / f };
    default:
      return s;
  }
}

/** The same question with a transposition and tempo drawn from its seed (or unchanged when that would change the answer). */
export function surfaceVary<Q extends Question>(q: Q, topic: string, seed: number): Q {
  if (q.kind !== 'choice' || q.show || ABSOLUTE_TOPIC.test(topic)) return q;
  const stims = allStims(q).flat();
  // Key-based stimuli (cadence, phrase, jazz) carry a named key; leave them as written.
  if (stims.some((s) => s.kind === 'cadence' || s.kind === 'phrase' || s.kind === 'jazz')) return q;
  const label = names(q).join(' ');
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  let k = PITCH_NAME.test(label) || PITCH_IN_TEXT.test(q.ask?.en ?? '') ? 0 : Math.floor(rnd() * 10) - 4; // −4 … +5 semitones
  const f = TEMPO_WORD.test(label) || TEMPO_WORD.test(q.ask?.en ?? '') ? 1 : 0.88 + rnd() * 0.24; // ±12 %
  const ps = stims.flatMap(pitches);
  if (ps.length) {
    const lo = Math.min(...ps);
    const hi = Math.max(...ps);
    if (lo + k < LO || hi + k > HI) k = 0;
  }
  if (k === 0 && f === 1) return q;
  const move = (xs: Stimulus[]) => xs.map((s) => shift(s, k, f));
  return {
    ...q,
    stimulus: move(q.stimulus),
    ...(q.choiceStim ? { choiceStim: Object.fromEntries(Object.entries(q.choiceStim).map(([a, xs]) => [a, move(xs)])) } : {}),
  };
}
