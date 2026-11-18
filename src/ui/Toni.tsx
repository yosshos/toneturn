// Toni, the eighth-note mascot (0.61, SPEC-REDESIGN), drawn in the Paper language (src/ui/ToniPaper.tsx, motion in
// src/toni.css), with five extra moods (proud, focused, encouraging, celebrating, curious).
// Partner builds may swap the mascot set (src/partner: a neutral "your teacher here" frame per state); the frame shows an
// extra mood as its nearest base state.
import { ACTIVE_PARTNER } from '../partner';
import { TeacherFrame } from '../partner/TeacherFrame';
import { ToniPaper, toBase, type ToniMood } from './ToniPaper';

export type ToniState = 'idle' | 'listen' | 'think' | 'hint' | 'correct' | 'streak' | 'wrong' | 'close' | 'wow' | 'sleepy' | 'draw' | 'bye';
export type { ToniMood };

/** Toni in a given state. `size` is the box in CSS px; the drawing keeps room around it for hops and spins. */
export function Toni({ state = 'idle', size = 120, label }: { state?: ToniMood; size?: number; label?: string }) {
  if (ACTIVE_PARTNER?.mascot === 'teacher-frame') return <TeacherFrame state={toBase(state)} size={size} label={label} />;
  return <ToniPaper state={state} size={size} label={label} />;
}
