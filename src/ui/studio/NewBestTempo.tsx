// The new-best-tempo moment (studio look): a tempo-ladder step cleared above the player's previous best on a drill or an
// Encore phrase. The TempoBest hero (big ♩number, the previous best), a share action where the device can share, and
// one tap anywhere continues — it never blocks the take flow underneath.

import { rt } from '../../i18n/restText';
import { TempoBest } from './StudioArt';
import { appHome, inviteTail, shareOut } from '../../engine/shareLinks';

/** A new best: a clean take whose tempo beats the item's previous best clean tempo (the badge counter's rule). */
export function newBestOf(prevBest: number, nextBest: number, clean: boolean): { bpm: number; prev: number } | null {
  return clean && prevBest > 0 && nextBest > prevBest ? { bpm: Math.round(nextBest), prev: Math.round(prevBest) } : null;
}

export function NewBestTempo({ lang, bpm, prev, title, onClose }: { lang: 'he' | 'en'; bpm: number; prev: number; title: string; onClose: () => void }) {
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <div className="tb-overlay" role="dialog" aria-label={rt('newBest', lang)} onClick={onClose} data-new-best={bpm}>
      <div className="tb-card">
        <p className="tb-kicker">{rt('newBest', lang)}</p>
        <TempoBest bpm={bpm} prev={prev} prevLabel={rt('prevBest', lang)} />
        {canShare && (
          <button
            type="button"
            className="btn primary tb-share"
            onClick={(e) => {
              e.stopPropagation();
              void shareOut(`${rt('shareText', lang, { t: title, n: bpm })}

${inviteTail(lang)}`, appHome());
              onClose();
            }}
            data-new-best-share="1"
          >
            {rt('share', lang)}
          </button>
        )}
        <button type="button" className="link tb-go" onClick={onClose} autoFocus data-new-best-go="1">
          {rt('tapOn', lang)}
        </button>
      </div>
    </div>
  );
}
