// Celebration overlay for newly earned badges and rank promotions (docs/SPEC-STATS.md §9).
// The medal drops in with a flip, a shine sweeps across, a soft burst in the tier colour, then name + description.
// Up to 3 badges one after another (then "+N more"); each auto-advances after ~4 s. "Nice!" / tap anywhere → next,
// Esc → close all. Focus moves to the button and returns afterwards; the text is announced via aria-live.
// Reduced motion (html[data-motion='reduced'] or prefers-reduced-motion): a plain fade, no particles.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BADGE_CAT_NAME, type Badge } from '../engine/badges';
import { AREA_NAME, rankLabel, tierOfDiv, TIER_NAME, type RankArea, type RankChange, type RankTier } from '../engine/ranks';
import { BadgeArt, tierGlow } from './BadgeArt';
import { RankCrest } from './Badges';
import '../badges.css';

type Lang = 'he' | 'en';
export const UNLOCK_MS = 4000;
export const UNLOCK_MAX = 3;

const TX = {
  newBadge: { en: 'New badge!', he: 'תג חדש!' },
  rankUp: { en: 'Rank up!', he: 'עלית דרגה!' },
  newRank: { en: 'New rank!', he: 'דרגה חדשה!' },
  hold: { en: 'Hold it for 7 days and it is yours for good.', he: 'החזיקו בה 7 ימים והיא שלכם לתמיד.' },
  nice: { en: 'Nice!', he: 'יופי!' },
  more: { en: '+{n} more in Badges', he: 'ועוד {n} בתגים' },
  close: { en: 'Close', he: 'סגירה' },
};

/** Deterministic burst: 14 particles around the medal. */
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2 ? 0.18 : 0);
  const d = i % 3 === 0 ? 150 : i % 3 === 1 ? 118 : 96;
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), s: i % 3 === 0 ? 9 : 6, delay: (i % 4) * 40 };
});

function useOverlayFocus(onEsc: () => void) {
  const btn = useRef<HTMLButtonElement>(null);
  const esc = useRef(onEsc);
  esc.current = onEsc;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    btn.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        esc.current();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);
  return btn;
}

/** Shared stage: backdrop, medal slot with glow + particles, texts, button, auto-advance bar. */
function Stage({ k, tier, kicker, medal, title, sub, note, counter, lang, onNext, onClose }: { k: string | number; tier: RankTier | undefined; kicker: string; medal: ReactNode; title: string; sub: string; note?: string; counter?: string; lang: Lang; onNext: () => void; onClose: () => void }) {
  const btn = useOverlayFocus(onClose);
  useEffect(() => {
    const t = window.setTimeout(onNext, UNLOCK_MS);
    return () => window.clearTimeout(t);
  }, [k, onNext]);
  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
  }, [k, btn]);
  const style = { '--bu-c': tierGlow(tier), '--bu-ms': `${UNLOCK_MS}ms` } as CSSProperties;
  return (
    <div className="bu-overlay" role="dialog" aria-modal="true" aria-labelledby="bu-title" dir={lang === 'he' ? 'rtl' : 'ltr'} style={style} onClick={onNext}>
      <p className="bu-sr" aria-live="assertive" aria-atomic="true">{`${kicker} ${title}. ${sub}`}</p>
      <div className="bu-card" key={k}>
        <p className="bu-kicker">
          {kicker}
          {counter && <bdi dir="ltr" className="bu-count">{counter}</bdi>}
        </p>
        <div className="bu-medal-wrap" aria-hidden="true">
          <span className="bu-glow" />
          {PARTICLES.map((p, i) => (
            <span key={i} className="bu-p" style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--s': `${p.s}px`, '--d': `${p.delay}ms` } as CSSProperties} />
          ))}
          <div className="bu-medal">{medal}</div>
        </div>
        <h2 className="bu-title" id="bu-title">
          {title}
        </h2>
        <p className="bu-sub">{sub}</p>
        {note && <p className="bu-note">{note}</p>}
        <button
          ref={btn}
          type="button"
          className="bu-btn"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          {TX.nice[lang]}
        </button>
        <span className="bu-timer" aria-hidden="true">
          <span />
        </span>
      </div>
    </div>
  );
}

/** Full-screen celebration for newly earned badges: up to 3 one after another, then "+N more". */
export function BadgeUnlock({ badges, lang, onDone }: { badges: Badge[]; lang: Lang; onDone: () => void }) {
  // Best first: the highest tier leads.
  const order: RankTier[] = ['master', 'diamond', 'platinum', 'gold', 'silver', 'bronze'];
  const [list] = useState(() => [...badges].sort((a, b) => order.indexOf(a.tone ?? 'gold') - order.indexOf(b.tone ?? 'gold')));
  const shown = list.slice(0, UNLOCK_MAX);
  const rest = list.length - shown.length;
  const [i, setI] = useState(0);
  const done = useRef(false);
  const close = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);
  const next = useCallback(() => setI((x) => x + 1), []);
  useEffect(() => {
    if (i >= shown.length) close();
  }, [i, shown.length, close]);
  const b = shown[i];
  if (!b) return null;
  const last = i === shown.length - 1;
  return (
    <Stage
      k={b.id}
      tier={b.tone}
      lang={lang}
      kicker={TX.newBadge[lang]}
      counter={shown.length > 1 ? `${i + 1}/${shown.length}` : undefined}
      medal={<BadgeArt badge={b} earned size={168} lang={lang} />}
      title={b.name[lang]}
      sub={b.desc[lang]}
      note={last && rest > 0 ? TX.more[lang].replace('{n}', String(rest)) : `${BADGE_CAT_NAME[b.cat][lang]}${b.tone ? ` · ${TIER_NAME[b.tone][lang]}` : ''}`}
      onNext={next}
      onClose={close}
    />
  );
}

/** Rank promotion: the crest + "Gold II in Rhythm & time". Pass a RankChange or { area, to }. */
export function RankUpUnlock({ change, lang, onDone }: { change: Pick<RankChange, 'area' | 'to'> & Partial<Pick<RankChange, 'kind'>>; lang: Lang; onDone: () => void }) {
  const done = useRef(false);
  const close = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);
  const area: RankArea = change.area;
  const label = rankLabel(change.to, lang);
  const title = lang === 'he' ? `${label} ב${AREA_NAME[area].he}` : `${label} in ${AREA_NAME[area].en}`;
  return (
    <Stage
      k={`${area}-${change.to}`}
      tier={tierOfDiv(change.to)}
      lang={lang}
      kicker={change.kind === 'new' ? TX.newRank[lang] : TX.rankUp[lang]}
      medal={<RankCrest div={change.to} size={168} lang={lang} />}
      title={title}
      sub={TX.hold[lang]}
      onNext={close}
      onClose={close}
    />
  );
}
