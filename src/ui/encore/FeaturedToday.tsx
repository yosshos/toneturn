// Encore challenges on Today (SPEC-PHRASE-STUDIO §12 / §17 "Today"): one shared phrase, small and dismissible — a
// friend's newest phrase I have not taken, else the phrase of the week. Opens its challenge page. Nothing without the
// challenges flag, an account, or a phrase to show; a hidden phrase stays hidden on this device.

import { useEffect, useState } from 'react';
import { CHALLENGES_ON, gallery, type Gallery, type SharedPhrase } from '../../cloud/challenges';
import { shareCodeOf } from '../../engine/encore/community';
import type { LickBook } from '../../engine/licks';
import { EX } from '../../i18n/encoreText';
import { Icon } from '../icons';
import { Bi, EncoreGlyph, Tempo, type Lang } from './bits';

const HIDDEN_KEY = 'tt.featuredHidden';
const readHidden = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const writeHidden = (ids: string[]) => {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    /* private mode: hidden for this visit only */
  }
};

/** The phrase to show (pure): a friend's first, else the week's; never mine, one I took, or one I hid. */
export function pickTodayPhrase(g: Pick<Gallery, 'featured' | 'friends'>, taken: ReadonlySet<string>, hidden: ReadonlySet<string>): { p: SharedPhrase; why: 'friend' | 'week' } | null {
  const ok = (p: SharedPhrase | null): p is SharedPhrase => !!p && !p.mine && p.status === 'live' && !taken.has(p.code) && !hidden.has(p.id);
  const f = g.friends.find(ok);
  if (f) return { p: f, why: 'friend' };
  return ok(g.featured) ? { p: g.featured, why: 'week' } : null;
}

// one gallery read per few minutes, shared by every Today render
let cache: { at: number; g: Gallery } | null = null;
const CACHE_MS = 5 * 60_000;

export function FeaturedPhraseCard({ lang, book }: { lang: Lang; book: LickBook | undefined }) {
  const [g, setG] = useState<Gallery | null>(() => (cache && Date.now() - cache.at < CACHE_MS ? cache.g : null));
  const [hidden, setHidden] = useState<string[]>(readHidden);
  useEffect(() => {
    if (!CHALLENGES_ON() || g) return;
    let on = true;
    gallery({})
      .then((x) => {
        cache = { at: Date.now(), g: x };
        if (on) setG(x);
      })
      .catch(() => {
        /* signed out or offline: no card */
      });
    return () => {
      on = false;
    };
  }, [g]);
  if (!CHALLENGES_ON() || !g) return null;
  const taken = new Set((book?.own ?? []).map(shareCodeOf).filter((c): c is string => !!c));
  const pick = pickTodayPhrase(g, taken, new Set(hidden));
  if (!pick) return null;
  const { p, why } = pick;
  const hide = () => {
    const next = [...hidden, p.id];
    writeHidden(next);
    setHidden(next);
  };
  return (
    <section className="tc-card tc-featured" data-today-featured={p.code} data-today-featured-why={why}>
      <button type="button" className="tc-featured-open" onClick={() => (location.hash = `/challenges/p/${p.code}`)}>
        <EncoreGlyph size={16} />
        <span className="grow tc-featured-text">
          <small>{why === 'friend' ? EX.fromFriend[lang] : EX.featured[lang]}</small>
          <b>
            <Bi text={p.title} />
          </b>
          <small className="tc-hint">
            {EX.featuredBy[lang]} <Bi text={p.ownerName} /> · <Tempo bpm={p.goalBpm} />
          </small>
        </span>
      </button>
      <button type="button" className="icon-btn tc-featured-hide" onClick={hide} aria-label={EX.dismiss[lang]} title={EX.dismiss[lang]} data-today-featured-hide="1">
        <Icon k="close" size={14} />
      </button>
    </section>
  );
}
