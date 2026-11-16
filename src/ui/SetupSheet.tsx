// "More" for a game setup (AUDIT-GAMES fix #4, one screen at 320×720): the options a player rarely changes (players,
// topics, tempo ladder, swing, tolerance…) sit behind one small chip that opens a sheet, so the setup keeps the tier
// row and the Start button on one phone screen. The chip says how many options hide behind it, or a short summary.

import '../setupsheet.css';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './icons';

type Lang = 'en' | 'he';

const TX = {
  en: { more: 'More', done: 'Done', close: 'Close' },
  he: { more: 'עוד', done: 'סיום', close: 'סגירה' },
};

export function SetupSheet({
  lang,
  label,
  summary,
  title,
  children,
  id,
}: {
  lang: Lang;
  /** Chip text (defaults to "More"). */
  label?: string;
  /** Short summary after the label, e.g. "1 player" or "12". */
  summary?: ReactNode;
  /** Sheet heading (defaults to the label). */
  title?: string;
  children: ReactNode;
  /** data-setup-sheet value (tests). */
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const tx = TX[lang];
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open]);
  const name = label ?? tx.more;
  return (
    <>
      <button type="button" className="setup-more-chip" data-setup-more={id} aria-label={name} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <span className="sm-label">{name}</span>
        {summary !== undefined && summary !== '' && <span className="sm-sum">{summary}</span>}
        <span className="sm-dots" aria-hidden="true">
          <Icon k="more" />
        </span>
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet setup-sheet" role="dialog" aria-modal="true" aria-label={title ?? name} onClick={(e) => e.stopPropagation()} data-setup-sheet={id}>
            <div className="menu-head">
              <h2>{title ?? name}</h2>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={tx.close}>
                <Icon k="close" />
              </button>
            </div>
            <div className="setup-sheet-body">{children}</div>
            <button type="button" className="btn primary" data-setup-done onClick={() => setOpen(false)}>
              {tx.done}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
