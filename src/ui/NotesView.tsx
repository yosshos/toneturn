// Notes shown the way the player chose (Settings → Show notes as): keyboard, staff, guitar tab or any mix.

import type { NoteView } from '../engine/aids';
import type { PitchClass } from '../engine/pitch';
import type { Settings } from '../storage/progress';
import { Keyboard } from './bits';
import { GuitarTab, NoteStaff } from './NoteViews';

export function NotesView({ midis, keyPc, settings, chord = false }: { midis: number[]; keyPc: PitchClass | null; settings: Settings; chord?: boolean }) {
  const views: NoteView[] = settings.noteViews ?? ['keyboard', 'staff'];
  if (!midis.length) return <div className="notes-view empty" aria-hidden="true" />;
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  // A keyboard window around the notes (C to C), at least two octaves.
  const low = Math.max(36, 12 * Math.floor((lo - 2) / 12));
  const high = Math.max(low + 24, 12 * Math.ceil((hi + 2) / 12));
  return (
    <div className="notes-view">
      {views.includes('keyboard') && <Keyboard low={low} high={high} live={false} aid={{ notes: midis }} />}
      {views.includes('staff') && <NoteStaff notes={midis} chord={chord} keyPc={keyPc} />}
      {views.includes('tab') && <GuitarTab notes={midis} chord={chord} />}
    </div>
  );
}
