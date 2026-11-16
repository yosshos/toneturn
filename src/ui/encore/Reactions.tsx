// Reactions on a shared phrase (owner 2026-11-16): "הדרן!" (its icon is the Encore glyph) and three musicians'
// compliments — גרוב, צליל, רעיון. One tap each, at most once per phrase; the counts go back to the sharer only.
// Words, no emoji, no public numbers. Rules: src/engine/encore/gifts.ts.

import { useEffect, useState } from 'react';
import { setReaction, type SharedPhrase } from '../../cloud/challenges';
import { REACTION_KINDS, REACTION_NAME, canReact, toggleReaction, totalReactions, type ReactionCounts, type ReactionKind } from '../../engine/encore/gifts';
import { EncoreGlyph, type Lang } from './bits';

const L = (lang: Lang, en: string, he: string) => (lang === 'he' ? he : en);

/** A viewer's four toggles. The sharer sees ReactionCountsLine instead. */
export function ReactionBar({ lang, p }: { lang: Lang; p: Pick<SharedPhrase, 'id' | 'mine' | 'myReactions'> }) {
  const [mine, setMine] = useState<ReactionKind[]>(p.myReactions);
  useEffect(() => setMine(p.myReactions), [p.id, p.myReactions]);
  if (!canReact(p)) return null;
  const tap = (k: ReactionKind) => {
    const before = mine;
    const next = toggleReaction(mine, k);
    setMine(next);
    void setReaction(p.id, k, next.includes(k)).catch(() => setMine(before));
  };
  return (
    <div className="chl-react row wrap" role="group" aria-label={L(lang, 'Reactions', 'תגובות')} data-chl-reactions={mine.join(',')}>
      {REACTION_KINDS.map((k) => {
        const on = mine.includes(k);
        const n = REACTION_NAME[k];
        return (
          <button key={k} type="button" className={`ch chl-react-b ${k === 'encore' ? 'enc' : ''} ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => tap(k)} title={n.hint[lang]} data-react={k} data-react-on={on ? '1' : '0'}>
            {k === 'encore' && <EncoreGlyph size={12} />}
            {n[lang]}
          </button>
        );
      })}
    </div>
  );
}

/** The sharer's own counts, per kind (only ever rendered for the sharer). */
export function ReactionCountsLine({ lang, counts }: { lang: Lang; counts: ReactionCounts | undefined }) {
  if (!counts) return null;
  const total = totalReactions(counts);
  return (
    <small className="t3 chl-react-counts" data-chl-reaction-counts={REACTION_KINDS.map((k) => `${k}:${counts[k]}`).join(',')}>
      {total === 0
        ? L(lang, 'No reactions yet', 'עוד אין תגובות')
        : REACTION_KINDS.filter((k) => counts[k] > 0).map((k, i) => (
            <span key={k} className="chl-react-n">
              {i > 0 && ' · '}
              {REACTION_NAME[k][lang]} <bdi dir="ltr">{counts[k]}</bdi>
            </span>
          ))}
    </small>
  );
}
