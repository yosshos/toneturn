// Encore v2 (SPEC-PHRASE-STUDIO §7.5): "LH plays the shell voicings" under a one-hand piano phrase. Standard shells only:
// root–3rd–7th (1-3-7) or root–7th–3rd (1-7-3, the 3rd an octave up), held for each chord of the phrase's chart. The
// two voicings alternate by voice leading: each chord takes the one whose upper notes move least from the chord before.
// Chords without a 7th (the 6 and m6 qualities) get root and 3rd only — no other note is added.
//
// The shells become the phrase's left hand (Lick.lh, flagged lhShells), so the plan, the hands rows, transposition,
// the difficulty model and the measured take treat it as any two-hand phrase. Turning them off removes that hand.

import type { Lick, LickChord, LickNote } from '../licks';

const mod = (n: number, m = 12) => ((n % m) + m) % m;

/** Semitones of the 3rd and the 7th above the root per chord quality (LICK_Q's qualities); null 7th = no 7th. */
export const SHELL_TONES: Record<string, { third: number; seventh: number | null }> = {
  maj7: { third: 4, seventh: 11 },
  m7: { third: 3, seventh: 10 },
  '7': { third: 4, seventh: 10 },
  '7b9': { third: 4, seventh: 10 },
  alt: { third: 4, seventh: 10 },
  blues7: { third: 4, seventh: 10 },
  hd7: { third: 3, seventh: 10 },
  dim7: { third: 3, seventh: 9 },
  '6': { third: 4, seventh: null },
  m6: { third: 3, seventh: null },
};

/** The root's MIDI pitch: E2 (40) … E♭3 (51) — low enough for a bass note, high enough to stay clear. */
export const shellRoot = (pc: number): number => 40 + mod(pc - 4);

export type ShellVoicing = '1-3-7' | '1-7-3';
export interface Shell {
  beat: number;
  dur: number;
  pitches: number[];
  voicing: ShellVoicing | '1-3';
}

/** The shells for a chart in a key (tonic pitch class): one held shell per chord, voicings chosen by voice leading. */
export function shellsFor(chords: readonly LickChord[], tonic: number): Shell[] {
  const out: Shell[] = [];
  let beat = 0;
  let prevUpper: number[] | null = null;
  for (const [rel, q, len] of chords) {
    const t = SHELL_TONES[q] ?? SHELL_TONES['7'];
    const root = shellRoot(tonic + rel);
    if (t.seventh === null) {
      out.push({ beat, dur: len, pitches: [root, root + t.third], voicing: '1-3' });
      prevUpper = [root + t.third];
    } else {
      const a = [root + t.third, root + t.seventh]; // 1-3-7
      const b = [root + t.seventh, root + t.third + 12]; // 1-7-3
      const move = (u: number[]) => (prevUpper ? Math.abs(u[0] - prevUpper[0]) + Math.abs(u[u.length - 1] - prevUpper[prevUpper.length - 1]) : 0);
      // the first chord: the voicing that keeps the top nearest G3 (55), the middle of the left hand's comfortable zone
      const score = (u: number[]) => (prevUpper ? move(u) : Math.abs(u[u.length - 1] - 55)) + Math.max(0, u[u.length - 1] - 64) * 2;
      const pick = score(b) < score(a) ? b : a;
      out.push({ beat, dur: len, pitches: [root, ...pick], voicing: pick === a ? '1-3-7' : '1-7-3' });
      prevUpper = pick;
    }
    beat += len;
  }
  return out;
}

/** The shells as a phrase's left hand: semitones from the home tonic an octave below (Lick.lh's reference). */
export function shellLh(l: Pick<Lick, 'chords' | 'homeKey'>): LickNote[] {
  const home = mod(l.homeKey ?? 0);
  const ref = 60 + home - (home > 5 ? 12 : 0) - 12; // tonic4(home) − 12
  return shellsFor(l.chords, home).flatMap((s) => s.pitches.map((p) => [p - ref, s.beat, s.dur] as LickNote));
}

/** Whether "LH shells" can be offered: a piano phrase in one hand (or already with shells) over a chart. */
export const canShell = (l: Lick): boolean => (l.instrument ?? 'piano') === 'piano' && l.chords.length > 0 && (!!l.lhShells || !l.lh?.length) && l.notes.length > 0;

/** The phrase with the shells as its left hand, or without them again (the right hand's progress is kept). */
export function withShells(l: Lick, on: boolean): Lick {
  if (on) {
    if (!canShell(l)) return l;
    const lh = shellLh(l);
    return { ...l, lh, lhShells: true, lhMarks: undefined, plan: l.plan ? { ...l.plan, hands: l.plan.locked?.includes('hands') ? l.plan.hands : 'R-then-RL' } : l.plan };
  }
  if (!l.lhShells) return l;
  const { lh: _lh, lhShells: _s, lhMarks: _m, ...rest } = l;
  void _lh;
  void _s;
  void _m;
  return { ...rest, plan: rest.plan ? { ...rest.plan, hands: 'R' } : rest.plan };
}
