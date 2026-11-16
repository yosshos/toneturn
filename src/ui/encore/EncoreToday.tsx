// The Encore card on Today (SPEC-PHRASE-STUDIO §9): a phrase with a review due or a key in progress —
// "ii–V in F · D♭ at ♩168 · 3 min". Nothing when there is none.

import type { ItemState } from '../../engine/drills/types';
import type { LickBook } from '../../engine/licks';
import { duePhrases } from '../../engine/encore/connect';
import { phraseRank } from '../../engine/encore/phrase';
import { Bi, Dyn, EncoreGlyph, KeyB, T, Tempo, type Lang } from './bits';

export function EncoreTodayCard({ lang, book, items, onOpen }: { lang: Lang; book: LickBook | undefined; items: Record<string, ItemState>; onOpen: (hash: string) => void }) {
  const he = lang === 'he';
  const d = duePhrases(book, items, 'today', undefined, 'piano', 1)[0];
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
      <Dyn rank={phraseRank(d.l, items, book)} />
    </button>
  );
}
