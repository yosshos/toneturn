// The answer ladder (0.61, design canvas "From names to the staff", owner 2026-11-09). The same question can be
// answered by name, by name with a small staff hint, or by picking the right staff. The step depends on the skill,
// not on an overall level: staves open once the names are solid (80 % of the last 20), then mix in — about one
// question in three, half later on — never three times in a row in the same form; new material always starts on names.
export type AnswerFormat = 'names' | 'hint' | 'staff';

const rate = (xs: boolean[], n = 20) => {
  const last = xs.slice(-n);
  return last.length ? last.filter(Boolean).length / last.length : 0;
};
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

export function answerFormat(o: { recent: boolean[]; reading?: boolean[]; seed: string; prev?: AnswerFormat[]; isNew?: boolean }): AnswerFormat {
  if (o.isNew || o.recent.length < 10) return 'names';
  const acc = rate(o.recent);
  if (acc < 0.6) return 'names';
  const readingOk = !o.reading || o.reading.length < 10 || rate(o.reading) >= 0.6;
  if (acc < 0.8 || o.recent.length < 20 || !readingOk) return 'hint';
  const share = acc >= 0.9 && o.recent.length >= 40 ? 0.5 : 0.34;
  let f: AnswerFormat = hash(o.seed) < share ? 'staff' : 'hint';
  const p = o.prev ?? [];
  if (p.length >= 2 && p[p.length - 1] === f && p[p.length - 2] === f) f = f === 'staff' ? 'hint' : 'staff';
  return f;
}

/** A pitch class as a MIDI note in the staff's comfortable range (C4–B4). */
export function pcToMidi(letter: string, acc: number): number {
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return 60 + (base[letter] ?? 0) + acc;
}
