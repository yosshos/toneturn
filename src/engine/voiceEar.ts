// The ear items of the voice course (VOICE_CURRICULUM P3: F10 L1 echo, L3 intervals from a given note, L5 audiation;
// F13 L1 one phrase of a simple song): what the app plays before the take, and which notes the screen may show before
// the result. They are graded by the melody grader (each note's pitch, from the microphone), like the other melodies.

import type { NoteEvent } from './lesson';
import type { VocalItem } from './vocal';
import { SONGBOOK } from '../content/songbook';
import { EAR_INSTR } from '../content/voiceCourseText';

type Lang = 'he' | 'en';

/**
 * What the app plays before an ear item: the echo with its own rhythm, only the given note (intervals), or the two
 * bars before the bar to sing (audiation: that bar is never played). Null for any other item.
 */
export function earReference(item: VocalItem, targets: number[]): { events: NoteEvent[]; length: number } | null {
  const e = item.ear;
  if (!e || !targets.length) return null;
  if (e.mode === 'interval') return { events: [{ midi: targets[0], start: 0, duration: 1.3, velocity: 0.72 }], length: 1.6 };
  const base = targets[0] - (item.steps?.[0] ?? 0);
  const notes = e.mode === 'audiate' ? (e.lead ?? []).map((x) => base + x) : targets;
  const secs = e.mode === 'audiate' ? (e.leadSecs ?? notes.map(() => 0.6)) : (item.noteSecs ?? notes.map(() => 0.55));
  let at = 0;
  const events = notes.map((midi, i) => {
    const d = secs[i] ?? 0.55;
    const ev: NoteEvent = { midi, start: at, duration: d * 0.92, velocity: 0.7 };
    at += d;
    return ev;
  });
  return { events, length: at + 0.35 };
}

/** The notes an ear item may show before its result: the given / first note — none for audiation (the bar is the task). */
export function earShown(item: VocalItem, targets: number[]): number[] {
  if (!item.ear) return targets;
  return item.ear.mode === 'audiate' ? [] : targets.slice(0, 1);
}

/** The first note an extra listen replays (audiation: the first played note, never a note of the bar to sing). */
export function earReplayNote(item: VocalItem, targets: number[]): number {
  if (item.ear?.mode === 'audiate' && item.ear.lead?.length) return targets[0] - (item.steps?.[0] ?? 0) + item.ear.lead[0];
  return targets[0];
}

/** The one-line instruction of an ear item; `ivName` names the interval's size (the app's interval names). */
export function earInstruction(item: VocalItem, lang: Lang, ivName: (semis: number) => string): string {
  const e = item.ear!;
  if (e.mode === 'interval') {
    const semis = (item.steps?.[1] ?? 0) - (item.steps?.[0] ?? 0);
    return EAR_INSTR[semis >= 0 ? 'intervalUp' : 'intervalDown'][lang].replace('{iv}', ivName(Math.abs(semis)));
  }
  if (e.mode === 'audiate') return EAR_INSTR.audiate[lang];
  if (e.song) {
    const s = SONGBOOK.find((x) => x.id === e.song);
    return EAR_INSTR.song[lang].replace('{song}', s ? s.title[lang] : e.song);
  }
  return EAR_INSTR.echo[lang];
}
