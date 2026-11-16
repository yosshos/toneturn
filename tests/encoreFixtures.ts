// Shared phrases for the Encore tests (SPEC-PHRASE-STUDIO §10.5 worked examples).
import { parseLine, type Lick, type LickChord } from '../src/engine/licks';
import { defaultPlan } from '../src/engine/encore/phrase';

const II_V_I_4: LickChord[] = [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 8]];

export function phrase(id: string, line: string, o: Partial<Lick> = {}, played = 120): Lick {
  const l: Lick = { id, v: 3, ctx: 'free', level: 3, name: { en: id, he: id }, chords: [], notes: parseLine(line), meter: 4, swing: 0.5, straight: true, homeKey: 0, own: true, createdAt: '2026-11-01T10:00:00.000Z', ...o };
  return { ...l, plan: { ...defaultPlan(l, played), ...(o.plan ?? {}) } };
}

/** C–D–E in quarters (the owner's example of material worth little). */
export const CDE = (bpm = 100) => phrase('enc-cde', '0q 2q 4q', {}, bpm);
/** C–D–E as 16ths. */
export const CDE16 = (bpm = 150) => phrase('enc-cde16', '0s 2s 4s rs rq rh', {}, bpm);
/** A 4-bar right-hand bebop line over ii–V–I: enclosures, a pivot, chromatic passing tones. */
export const BEBOP_LINE = '7 4 5 2 0 -1 0 2 | 5 4 3 2 1 2 5 9 | 7 3 4q 11 9 7 4 | 2 6 7q 11h'; // eighths
export const BEBOP = (bpm = 160) => phrase('enc-bebop', BEBOP_LINE, { chords: II_V_I_4, ctx: 'major-251', swing: 0.62, straight: false }, bpm);
/** The same line with an independent left hand (shells on 1 and the "and" of 2). */
export const BEBOP2 = (bpm = 144) =>
  phrase(
    'enc-bebop2',
    BEBOP_LINE,
    {
      chords: II_V_I_4,
      ctx: 'major-251',
      swing: 0.62,
      straight: false,
      lh: [
        [5, 0, 1], [12, 0, 1], [5, 2.5, 1], [12, 2.5, 1],
        [5, 4, 1], [11, 4, 1], [5, 6.5, 1], [11, 6.5, 1],
        [4, 8, 1], [11, 8, 1], [4, 10.5, 1], [11, 10.5, 1],
        [4, 12, 1], [11, 12, 1], [7, 14.5, 1.5],
      ],
    },
    bpm,
  );
