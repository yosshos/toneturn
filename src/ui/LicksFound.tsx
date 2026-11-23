// The debrief of the licks found in an improvisation (SPEC-LICKS-IN-IMPROV §4): "You used 3 licks: maj-enclose (in
// B♭), 'Tuesday's phrase' (in E♭, new key), lick 2 before the 3rd of D7" — each one replayed from the take (its own
// notes, played back at the take's tempo). Shared by Charts and Improvise (the scale rotation, Phrase, Trade).

import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { piano } from './services';
import { kName } from './encore/bits';
import { isMinorLick, type Lick } from '../engine/licks';
import type { LickUse } from '../engine/vocab';
import '../licks.css';

type Lang = 'en' | 'he';

/** A take's uses with what the debrief needs: the take's notes in beats (for the replay) and its tempo. */
export interface FoundUses {
  uses: (LickUse & { beat: number; fresh: boolean })[];
  xp: number;
  notes: { beat: number; midi: number; dur?: number }[];
  bpm: number;
}

/** The chord tone an approach cell targeted, by its interval above the root. */
const DEG: Record<number, { en: string; he: string }> = {
  0: { en: 'the root', he: 'השורש' },
  3: { en: 'the 3rd', he: 'הטרצה' },
  4: { en: 'the 3rd', he: 'הטרצה' },
  6: { en: 'the ♭5', he: 'ה־♭5' },
  7: { en: 'the 5th', he: 'הקווינטה' },
  9: { en: 'the 6th', he: 'הסקסטה' },
  10: { en: 'the 7th', he: 'הספטימה' },
  11: { en: 'the 7th', he: 'הספטימה' },
};
const prettyChord = (s: string): string => s.replace(/^([A-G])b/, '$1♭').replace('m7b5', 'm7♭5').replace('7b9', '7♭9');

/** The notes of one use, from the take (its first note to its last, a little slack around them). */
export function useNotes(f: Pick<FoundUses, 'notes'>, u: Pick<LickUse, 'beat' | 'end'>): { beat: number; midi: number; dur?: number }[] {
  const from = (u.beat ?? 0) - 0.05;
  const to = (u.end ?? (u.beat ?? 0) + 4) + 0.05;
  return f.notes.filter((n) => n.beat >= from && n.beat <= to);
}

export function LicksFound({ found, pool, lang, meter = 4 }: { found: FoundUses; pool: Lick[]; lang: Lang; meter?: number }) {
  const [playing, setPlaying] = useState<number | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const he = lang === 'he';
  const beatS = 60 / Math.max(30, found.bpm);
  const replay = async (k: number) => {
    ctl.current?.abort();
    if (playing === k) return setPlaying(null);
    const ns = useNotes(found, found.uses[k]);
    if (!ns.length) return;
    const c = new AbortController();
    ctl.current = c;
    setPlaying(k);
    await piano.unlock();
    const t0 = ns[0].beat;
    const events = ns.map((n) => ({ midi: n.midi, start: (n.beat - t0) * beatS, duration: Math.max(0.08, (n.dur ?? 0.45) * beatS), velocity: 0.75 }));
    const len = Math.max(...events.map((e) => e.start + e.duration)) + 0.2;
    await piano.play(events, len, c.signal).catch(() => {});
    if (!c.signal.aborted) setPlaying(null);
  };
  const lickOf = (id: string) => pool.find((l) => l.id === id);
  return (
    <div className="take-card ch-licks-found" aria-live="polite" data-licks-found={found.uses.length} data-licks-xp={found.xp}>
      <div className="take-score">
        {he ? `ליקים שלכם בסולו: ${found.uses.length}` : `Licks of yours in the solo: ${found.uses.length}`}
        {found.xp > 0 && <small dir="ltr"> · +{found.xp} XP</small>}
      </div>
      <ul className="perf-report">
        {found.uses.slice(0, 6).map((u, k) => {
          const l = lickOf(u.id);
          const name = l?.name[lang] ?? u.id;
          return (
            <li key={k} data-lick-use={u.id} className="lf-row">
              <button type="button" className="icon-btn small" onClick={() => void replay(k)} aria-label={he ? `להשמיע מהסולו: ${name}` : `Replay from the take: ${name}`} aria-pressed={playing === k} data-lick-replay={k}>
                <Icon k={playing === k ? 'stop' : 'play'} size={14} />
              </button>
              <span>
                {name}
                {l?.cell && u.deg !== undefined && u.chord ? (
                  <>
                    {' '}
                    {he ? 'לפני' : 'before'} {(DEG[u.deg] ?? DEG[0])[lang]} {he ? 'של' : 'of'} <bdi dir="ltr">{prettyChord(u.chord)}</bdi>
                  </>
                ) : (
                  <>
                    {' '}
                    · <bdi dir="ltr">{kName(u.key, !!l && isMinorLick(l))}</bdi>
                  </>
                )}
                {u.fresh && !l?.cell && <small> · {he ? 'סולם חדש' : 'new key'}</small>}
                {u.kind === 'varied' && <small> · {he ? 'בשינוי' : 'varied'}</small>}
                {u.viaSub && <small> · {he ? 'מעל תחליף הטריטון' : 'over the tritone sub'}</small>}
                <small>
                  {' '}
                  · {he ? 'תיבה' : 'bar'} <bdi dir="ltr">{Math.floor(u.beat / meter) + 1}</bdi>
                </small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
