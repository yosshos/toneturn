// The Licks tile's header (owner 2026-11-22): back, "Licks", and three small segmented tabs — Library, Mine (what
// Encore was) and Challenges. Each section's home renders it in place of its own header; a tab replaces the address
// (#/licks, #/licks/mine, #/licks/challenges), so Back leaves the tile instead of walking through the tabs.

import { useEffect, useState, type ReactNode } from 'react';
import '../licks.css';
import type { LickBook } from '../engine/licks';
import { dueLicks } from '../engine/licks';
import { phrasesDueCount } from '../engine/encore/connect';
import { LICKS_SECTIONS, licksHash, licksSectionOf, type LicksSection } from './licksHub';
import { Icon } from './icons';

const NAME: Record<LicksSection, { en: string; he: string }> = {
  library: { en: 'Library', he: 'הספרייה' },
  mine: { en: 'Mine', he: 'שלי' },
  challenges: { en: 'Challenges', he: 'אתגרים' },
  // the graded transcription coach became the steps for the ear (BUILD-PLAN §0.2, owner 2026-11-22)
  transcribe: { en: 'Ear steps', he: 'צעדים לאוזן' },
};

/** Due today per section: the library's lick reviews, my phrases' keys due. */
export function licksDue(book: LickBook | undefined, now: Date = new Date()): Record<LicksSection, number> {
  const mine = phrasesDueCount(book, now.toISOString());
  return { library: Math.max(0, dueLicks(book?.review, now).length - mine), mine, challenges: 0, transcribe: 0 };
}

export function LicksHead({ lang, section, onBack, book, extra, spark }: { lang: 'he' | 'en'; section: LicksSection; onBack: () => void; book?: LickBook; extra?: ReactNode; /** The place's sparkline beside the title. */ spark?: ReactNode }) {
  const he = lang === 'he';
  const due = licksDue(book);
  return (
    <>
      <header className="screen-head lk-hub-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>{he ? 'ליקים' : 'Licks'}</h1>
        {spark}
        {extra}
      </header>
      <div className="lk-seg" role="tablist" aria-label={he ? 'ליקים' : 'Licks'} data-licks-tabs={section}>
        {LICKS_SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === section}
            className={s === section ? 'on' : ''}
            onClick={() => s !== section && location.replace(`#${licksHash(s)}`)}
            data-licks-tab={s}
          >
            {NAME[s][lang]}
            {due[s] > 0 && (
              <span className="lk-seg-n" aria-label={he ? `${due[s]} לחזרה` : `${due[s]} due`}>
                <bdi dir="ltr">{due[s]}</bdi>
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/** The Licks route: renders the section the address names, following tab changes. */
export function LicksRoute({ children }: { children: (s: LicksSection) => ReactNode }) {
  const [section, setSection] = useState<LicksSection>(() => licksSectionOf(location.hash));
  useEffect(() => {
    const on = () => setSection(licksSectionOf(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return <>{children(section)}</>;
}
