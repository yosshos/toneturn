// The Encore card on Today (SPEC-PHRASE-STUDIO §9): a phrase with a review due or a key in progress —
// "ii–V in F · D♭ at ♩168 · 3 min". Nothing when there is none.

import type { ItemState } from '../../engine/drills/types';
import type { LickBook, LickInstrument } from '../../engine/licks';
import type { Settings } from '../../storage/progress';
import { setInstrumentCtx } from '../../engine/encore/placement';
import { duePhrases } from '../../engine/encore/connect';
import { phraseRank } from '../../engine/encore/phrase';
import { Bi, Dyn, EncoreGlyph, KeyB, T, Tempo, type Lang } from './bits';

/** The course's instrument for Encore (as LickTrainer's lickInstrumentOf: keys → piano; Jazz → the player's own). */
export function encoreInstOf(s: Pick<Settings, 'activeCourse' | 'instrument'>): LickInstrument {
  const c = s.activeCourse;
  if (c === 'guitar' || c === 'bass' || c === 'voice') return c;
  if (c === 'keys') return 'piano';
  return s.instrument === 'guitar' ? 'guitar' : s.instrument === 'bass' ? 'bass' : s.instrument === 'voice' ? 'voice' : 'piano';
}

export function EncoreTodayCard({ lang, book, items, onOpen, inst = 'piano', range }: { lang: Lang; book: LickBook | undefined; items: Record<string, ItemState>; onOpen: (hash: string) => void; /** v2: the course's instrument (its own 12-key map). */ inst?: LickInstrument; /** The singer's range (voice). */ range?: { low: number; high: number } | null }) {
  const he = lang === 'he';
  if (inst === 'voice') setInstrumentCtx({ range: range ?? null });
  const d = duePhrases(book, items, 'today', undefined, inst, 1)[0];
  if (!d) return null;
  return (
    <button type="button" className="tc-card tc-encore" onClick={() => onOpen(`/encore/run/${d.l.id}~${d.key}`)} data-today-encore={d.l.id} data-today-encore-why={d.why}>
      <EncoreGlyph size={16} />
      <span className="grow" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <small>{he ? 'הדרן' : 'Encore'}</small>
        <b>
          <Bi text={T(d.l.name, lang)} />
        </b>
        <small className="tc-hint">
          <KeyB k={d.key} minor={!!d.l.minor} /> {he ? 'ב־' : 'at '}
          <Tempo bpm={d.bpm} /> · <bdi dir="ltr">{d.minutes}</bdi> {he ? 'דק׳' : 'min'}
        </small>
      </span>
      <Dyn rank={phraseRank(d.l, items, book, inst)} />
    </button>
  );
}
