// "I use a different fingering" (owner 2026-11-17): one small text action on the drill review, a sheet to mark the item
// and (optionally) enter the player's own numbers — tap a note to move its finger on (Encore's pattern). And the
// keyboard strip's small next-key finger number (studio look): the fingering is a recommendation, so it is drawn small.

import { useState } from 'react';
import type { Drill } from '../engine/drills/types';
import { cycleFinger, hasFingering, isOwn, nextFingers, resetOwn, setOwn, type OwnFingerings } from '../engine/drills/ownFingering';
import { rt } from '../i18n/restText';
import { Icon } from './icons';
import { midiName } from './Instrument';

type Lang = 'he' | 'en';

/** The review's small text action ("Other fingering?" / "My fingering") and its sheet. Nothing for an item without fingering. */
export function OwnFingeringLink({ lang, drill, own, onChange }: { lang: Lang; drill: Drill; own: OwnFingerings | undefined; onChange: (o: OwnFingerings) => void }) {
  const [open, setOpen] = useState(false);
  if (!hasFingering(drill)) return null;
  const on = isOwn(own, drill.itemId);
  return (
    <>
      <button type="button" className={`link own-fing-link ${on ? 'on' : ''}`} onClick={() => setOpen(true)} aria-haspopup="dialog" data-own-fing={on ? 'on' : 'off'}>
        {rt(on ? 'ownFingOn' : 'ownFing', lang)}
      </button>
      {open && <OwnFingeringSheet lang={lang} drill={drill} own={own} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}

export function OwnFingeringSheet({ lang, drill, own, onChange, onClose }: { lang: Lang; drill: Drill; own: OwnFingerings | undefined; onChange: (o: OwnFingerings) => void; onClose: () => void }) {
  const on = isOwn(own, drill.itemId);
  const mine = own?.[drill.itemId] ?? [];
  const hands = (['R', 'L'] as const).map((h) => ({ h, idx: drill.notes.map((_, i) => i).filter((i) => drill.notes[i].hand === h && drill.notes[i].finger) })).filter((x) => x.idx.length);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet own-fing-sheet" role="dialog" aria-modal="true" aria-label={rt('ownTitle', lang)} onClick={(e) => e.stopPropagation()} data-own-fing-sheet={drill.itemId}>
        <header className="tr-sheet-head">
          <h2>{rt('ownTitle', lang)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={rt('done', lang)}>
            <Icon k="close" />
          </button>
        </header>
        <label className="toggle-row own-fing-on">
          <span className="grow">{rt('ownUse', lang)}</span>
          <input type="checkbox" checked={on} onChange={(e) => onChange(setOwn(own, drill.itemId, e.target.checked))} data-own-fing-toggle={on ? 'on' : 'off'} />
        </label>
        {on && (
          <>
            <p className="field-hint own-fing-hint">
              {rt('ownHint', lang)} {rt('ownNone', lang)}
            </p>
            {hands.map(({ h, idx }) => (
              <section key={h} className="own-fing-hand" aria-label={rt(h === 'R' ? 'rh' : 'lh', lang)}>
                {hands.length > 1 && <small className="own-fing-h">{rt(h === 'R' ? 'rh' : 'lh', lang)}</small>}
                <div className="own-fing-grid" dir="ltr">
                  {idx.map((i) => {
                    const n = drill.notes[i];
                    const f = mine[i] || n.finger;
                    return (
                      <button key={i} type="button" className={`own-fing-cell ${mine[i] ? 'mine' : ''}`} onClick={() => onChange(cycleFinger(own, drill, i))} aria-label={`${midiName(n.pitch)} · ${f}${mine[i] ? ` · ${rt('mine', lang)}` : ''}`} data-own-note={i} data-finger={f}>
                        <small>{midiName(n.pitch)}</small>
                        <b>{f}</b>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            <button type="button" className="link own-fing-reset" disabled={!mine.some(Boolean)} onClick={() => onChange(resetOwn(own, drill.itemId))} data-own-fing-reset="1">
              {rt('ownReset', lang)}
            </button>
          </>
        )}
        <button className="btn primary own-fing-done" onClick={onClose} data-own-fing-done="1">
          {rt('done', lang)}
        </button>
      </div>
    </div>
  );
}

const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

/**
 * A slim keyboard under the score while a fingered piano item is played (studio look): the next key(s) marked, with
 * the finger as a small number. The range covers the item's notes (whole white keys at both ends).
 */
export function FingerKeys({ drill, beat, lang }: { drill: Drill; beat: number; lang: Lang }) {
  const ps = drill.notes.map((n) => n.pitch);
  let lo = Math.min(...ps);
  let hi = Math.max(...ps);
  if (isBlack(lo)) lo -= 1;
  if (isBlack(hi)) hi += 1;
  // at least an octave and a half, centred
  while (hi - lo < 17) {
    hi += isBlack(hi + 1) ? 2 : 1;
    if (hi - lo < 17) lo -= isBlack(lo - 1) ? 2 : 1;
  }
  const next = nextFingers(drill, beat);
  const fing = new Map(next.map((x) => [x.pitch, x.finger] as const));
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  const label = next.map((x) => `${midiName(x.pitch)} ${rt('nextFinger', lang, { n: x.finger })}`).join(', ');
  const fn = (m: number) =>
    fing.has(m) ? (
      <span className="key-finger" aria-hidden="true">
        {fing.get(m)}
      </span>
    ) : null;
  return (
    <div className="keyboard finger-keys" dir="ltr" role="img" aria-label={label} data-next-fingers={next.map((x) => `${x.pitch}:${x.finger}`).join(' ')}>
      {whites.map((m, i) => (
        <div key={m} className={`wk ${fing.has(m) ? 'next' : ''}`} style={{ left: `${i * W}%`, width: `${W}%` }}>
          {fn(m)}
        </div>
      ))}
      {whites.map((m, i) =>
        m + 1 <= hi && isBlack(m + 1) ? (
          <div key={m + 1} className={`bk ${fing.has(m + 1) ? 'next' : ''}`} style={{ left: `${(i + 1) * W - W * 0.32}%`, width: `${W * 0.64}%` }}>
            {fn(m + 1)}
          </div>
        ) : null,
      )}
    </div>
  );
}
