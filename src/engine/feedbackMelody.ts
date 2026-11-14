// Precise feedback for a sung melody (spec W): align the sung notes with the targets in order and say,
// per note, how it was off (the notes worth mentioning, at most two) — a note in the wrong octave first.

import { itemOctave, melodyRemarks, octaveOffset, type Remark } from './feedback';
import { segmentNotes } from './memory';
import type { SungFrame } from './sing';

export function sungMelodyRemarks(frames: SungFrame[], targets: number[]): { index: number; remarks: Remark[] }[] {
  const segs = segmentNotes(frames);
  const fold = (c: number) => ((((c + 600) % 1200) + 1200) % 1200) - 600;
  const notes: { index: number; frames: SungFrame[]; target: number; off: number }[] = [];
  let j = 0;
  targets.forEach((target, index) => {
    for (let k = j; k < Math.min(segs.length, j + 3); k++) {
      if (Math.abs(fold((segs[k].midi - target) * 100)) <= 150) {
        const s = segs[k];
        notes.push({ index, target, off: octaveOffset(s.midi, target), frames: frames.filter((f) => f.t >= s.start && f.t <= s.end) });
        j = k + 1;
        return;
      }
    }
  });
  // The item may sit in any octave; a note away from the item's octave is "octave off".
  const shift = itemOctave(notes.map((n) => n.off));
  return melodyRemarks(notes.map((n) => ({ ...n, octave: n.off !== shift })));
}
