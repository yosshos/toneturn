// Rhythm items sound like drums (playtesting 0.50): an item about time — tempo, meter, downbeat, swing, syncopation,
// rhythm memory, building or fixing a rhythm — used to play its pattern on the piano. Here every pitched note of such an
// item becomes a drum hit: a snare at the note's loudness, with a kick under the accented ones (so beat 1 and the
// downbeat stay audible), and a quiet hum under long notes so a half note still sounds longer than a quarter + rest.
// Items where the pitches are the point (a melody moved in time, comping chords) keep their notes.
import type { NoteEvent, Stimulus } from './lesson';
import type { TopicItem } from './topicKit';

export const DRUM_TOPICS = new Set(['tempo', 'meter-feel', 'downbeat', 'swing-ratio', 'rhythm-memory', 'syncopation', 'rhythm-build', 'rhythm-errors', 'eastern-rhythm', 'polyrhythm']);

/** Pitched notes → drum hits (percussion and processed sounds are kept as they are). */
export function drumEvents(events: NoteEvent[]): NoteEvent[] {
  const pitched = events.filter((e) => !e.perc && !e.fx && e.inst !== 'hum');
  if (!pitched.length) return events;
  const vs = pitched.map((e) => e.velocity);
  const max = Math.max(...vs);
  const min = Math.min(...vs);
  const accents = max - min > 0.1;
  const out: NoteEvent[] = [];
  // chords and simultaneous notes are one hit
  const seen = new Set<string>();
  for (const e of events) {
    if (e.perc || e.fx || e.inst === 'hum') {
      out.push(e);
      continue;
    }
    const k = e.start.toFixed(3);
    if (seen.has(k)) continue;
    seen.add(k);
    const v = Math.max(...pitched.filter((p) => p.start.toFixed(3) === k).map((p) => p.velocity));
    const rel = max > 0 ? v / max : 1;
    out.push({ midi: 38, start: e.start, duration: 0.05, velocity: Math.min(1, 0.45 + 0.5 * rel), perc: 'snare' });
    if (accents && v >= max - 0.02) out.push({ midi: 36, start: e.start, duration: 0.05, velocity: 0.9, perc: 'kick' });
    if (e.duration >= 0.45) out.push({ midi: 64, start: e.start, duration: e.duration * 0.92, velocity: 0.3, inst: 'hum' });
  }
  return out;
}

function drumStim(s: Stimulus): Stimulus {
  return s.kind === 'events' ? { ...s, events: drumEvents(s.events) } : s;
}

/** The item with its sounds (and each choice's sounds) on drums, when its topic is about time. */
export function drumVoice<T extends TopicItem>(q: T, topic: string): T {
  if (!DRUM_TOPICS.has(topic)) return q;
  const x = q as T & { stimulus?: Stimulus[]; choiceStim?: Record<string, Stimulus[]> };
  return {
    ...x,
    ...(x.stimulus ? { stimulus: x.stimulus.map(drumStim) } : {}),
    ...(x.choiceStim ? { choiceStim: Object.fromEntries(Object.entries(x.choiceStim).map(([k, v]) => [k, v.map(drumStim)])) } : {}),
  };
}
