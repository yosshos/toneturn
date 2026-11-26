// The task brief on screen (owner 2026-11-24, src/engine/drills/taskBrief.ts): when the task kind changes, a short card
// (what to do · hands, tempo, meter) sits above the take and its count-in waits for Ready (a tap, a key, or a note on
// MIDI, armed late enough for a slow reader). During the take the same instruction stays as one compact line — it never
// lives only in a typed narrator line that vanishes.
import { useState } from 'react';
import { needsBrief, type TaskBrief } from '../engine/drills/taskBrief';

type Lang = 'en' | 'he';

/** What a take receives: the brief, and whether it is open (a new kind: wait for Ready) or only the compact line. */
export interface BriefProp {
  brief: TaskBrief;
  open: boolean;
  /** The player pressed Ready (the take starts): the kind counts as briefed. */
  onReady?: () => void;
}

/** A note or key counts as Ready only after this long on an open brief (a slow reader; the last note of a take). */
export const BRIEF_ARM_MS = 2500;

/** The open brief: two short lines and when the count-in starts. */
export function BriefCard({ brief, lang, free = false, auto }: { brief: TaskBrief; lang: Lang; free?: boolean; /** Owner 2026-11-26: seconds until the count-in starts by itself (a flowing run). */ auto?: number }) {
  return (
    <div className="task-brief" data-task-brief={brief.mode} role="note">
      <p className="tb-what">{brief.what[lang]}</p>
      <p className="tb-how">
        <bdi>{brief.how[lang]}</bdi>
      </p>
      <p className="tb-when">
        {auto
          ? lang === 'he'
            ? `הספירה מתחילה מעצמה בעוד ${auto} — או "מוכנים" / צליל`
            : `The count-in starts by itself in ${auto} — or Ready / a note`
          : free
          ? lang === 'he'
            ? 'מתחילים כשמוכנים — או נגנו צליל / הקישו על מקש'
            : 'Start when ready — or play a note / press a key'
          : lang === 'he'
            ? 'הספירה מתחילה רק אחרי "מוכנים" — או צליל / מקש'
            : 'The count-in starts only on Ready — or a note / key'}
      </p>
    </div>
  );
}

/** The instruction during the take (and before Play when no brief is open): one compact line. */
export function BriefLine({ brief, lang }: { brief: TaskBrief; lang: Lang }) {
  return (
    <p className="task-brief-line" data-task-brief-line={brief.mode}>
      <b>{brief.what[lang]}</b> · <bdi>{brief.how[lang]}</bdi>
    </p>
  );
}

/**
 * The run's brief gate: which task kind the player last played or was briefed on, and the kinds briefed in this run.
 * `prop(brief)` says whether the take's brief is open; Ready marks the kind seen.
 */
export function useBriefGate(initial: string | null = null): { prop: (b: TaskBrief) => BriefProp; seen: (kind: string) => void; last: string | null } {
  const [st, setSt] = useState<{ last: string | null; seen: Set<string> }>(() => ({ last: initial, seen: new Set(initial ? [initial] : []) }));
  const seen = (kind: string) => setSt((s) => (s.last === kind && s.seen.has(kind) ? s : { last: kind, seen: new Set(s.seen).add(kind) }));
  return {
    last: st.last,
    seen,
    prop: (b) => {
      const open = needsBrief(st.last, b.kind, st.seen);
      return { brief: b, open, onReady: () => seen(b.kind) };
    },
  };
}
