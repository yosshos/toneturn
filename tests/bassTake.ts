// Synthetic bass takes and the list of the BASS_NICHE_PLAN levels (shared by bassNiche.test.ts).
import { families } from '../src/engine/drills/plan';
import { expTimeMs } from '../src/engine/drills/analyze';
import { hasTimeline, timeMapOf } from '../src/engine/drills/timeline';
import type { Drill, PlayedNote } from '../src/engine/drills/types';
import type { LevelDef } from '../src/engine/drills/generate';
import { noise } from './pianoTake';

export const NEW_FAMS = ['b-swing', 'b-barry', 'b-jform', 'b-latin', 'b-odd', 'b-prog', 'b-poly'];
const levelsOf = (fam: string) => families('bass').find((f) => f.id === fam)!.levels;
export const NEW_LEVELS = (): LevelDef[] => [...NEW_FAMS.flatMap(levelsOf), ...levelsOf('b-impro').filter((l) => l.level >= 7), ...levelsOf('b-ear').filter((l) => l.level >= 10)];

/**
 * A synthetic bass take on MIDI: every written note on time with `sd` ms of jitter (+ `offset` ms), released just
 * before the next note (long quarters), accents and group starts louder.
 */
export function bassTake(d: Drill, bpm: number, sd: number, seed = 7, offset = 0): PlayedNote[] {
  const g = noise(seed);
  const ms = (b: number) => expTimeMs(d, b, bpm);
  const tm = hasTimeline(d) ? timeMapOf(d, bpm) : null;
  const ns = [...d.notes].sort((a, b) => a.beat - b.beat);
  return ns.map((n, i) => {
    const on = ms(n.beat) + g() * sd + offset;
    const nb = ns.slice(i + 1).find((x) => x.beat > n.beat + 1e-6)?.beat;
    const end = nb !== undefined ? Math.min(ms(nb), ms(n.beat + n.dur) + 40) : ms(n.beat + n.dur);
    const groupStart = !!d.goal.prog?.groupAccent && !!tm && Math.abs(tm.position(n.beat).inGroup) < 1e-6;
    return { pitch: n.pitch, on, off: on + (end - ms(n.beat)) * 0.95, vel: Math.round(78 + (n.accent || groupStart ? 26 : 0) + g() * 3) };
  });
}
