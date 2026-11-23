// Share after a clean tempo (owner 2026-11-22): a lick from the library or one of my phrases passed clean at a tempo
// offers a small share action. It makes the studio share card (studio/shareCard.tsx) naming the lick, the key and the
// tempo (♩N), and sends it through the device's share sheet with the link back into the app (engine/shareLinks.ts).

import { useState } from 'react';
import type { Drill } from '../engine/drills/types';
import { appHome, inviteTail, shareOut } from '../engine/shareLinks';
import { studioShareCardSvg, svgToPng } from './studio/shareCard';
import { Icon } from './icons';

type Lang = 'he' | 'en';

export interface LickShareInfo {
  /** The lick's (or phrase's) name in the player's language. */
  title: string;
  /** The key it was played in, e.g. "E♭" or "Cm". */
  key: string;
  bpm: number;
  /** The drill that was played (its notes go on the card's staff). */
  drill: Pick<Drill, 'notes' | 'beats' | 'meter'>;
  /** The player's name on the card. */
  by?: string;
  level?: number;
  /** Phase 8: a technique exercise played clean at its target tempo shares the same card ("Exercise at tempo"). */
  what?: 'lick' | 'exercise';
}

/** The share text: the lick, the key and the tempo, then the invitation (the link follows). */
export function lickShareText(i: Pick<LickShareInfo, 'title' | 'key' | 'bpm'>, lang: Lang): string {
  const line = lang === 'he' ? `ניגנתי נקי את "${i.title}" ב־${i.key}, ♩${i.bpm}` : `Played "${i.title}" clean in ${i.key} at ♩${i.bpm}`;
  return `${line}\n\n${inviteTail(lang)}`;
}

/** The share card (an SVG string) for a lick passed clean at a tempo. */
export function lickShareCard(i: LickShareInfo, lang: Lang): string {
  const he = lang === 'he';
  const by = i.by?.trim() || (he ? 'נגן/ית' : 'A player');
  const notes = i.drill.notes.filter((n) => n.hand !== 'L').map((n) => ({ pitch: n.pitch, beat: n.beat }));
  return studioShareCardSvg({
    title: i.title,
    by,
    bpm: i.bpm,
    keys: 1,
    level: i.level ?? 1,
    notes,
    beats: i.drill.beats,
    meter: i.drill.meter,
    lang,
    words: {
      kind: i.what === 'exercise' ? (he ? 'תרגיל בטמפו היעד' : 'Exercise at target tempo') : he ? 'ליק בטמפו' : 'Lick at tempo',
      who: he ? `${by} ניגן/ה נקי` : `${by} played it clean`,
      tempo: `${i.key} · ♩${i.bpm}`,
      foot: i.level ? (he ? `רמה ${i.level}` : `Level ${i.level}`) : '',
      cta: he ? 'לנסות גם' : 'Try it too',
    },
  });
}

/** The small share action shown under a clean take's result. */
export function LickShareButton({ lang, info, compact = false }: { lang: Lang; info: LickShareInfo; /** An icon button for a full actions row. */ compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'shared'>('idle');
  const he = lang === 'he';
  const share = async () => {
    setState('busy');
    let file: File | undefined;
    try {
      const png = await svgToPng(lickShareCard(info, lang));
      if (png) file = new File([png], 'lick.png', { type: 'image/png' });
    } catch {
      /* text and link only */
    }
    const r = await shareOut(lickShareText(info, lang), appHome(), file ? [file] : undefined);
    setState(r === 'copied' ? 'copied' : r === 'shared' ? 'shared' : 'idle');
  };
  const label = state === 'copied' ? (he ? 'הקישור הועתק' : 'Link copied') : he ? `לשתף · ♩${info.bpm}` : `Share · ♩${info.bpm}`;
  if (compact)
    return (
      <button type="button" className="btn ghost lk-share compact" disabled={state === 'busy'} onClick={() => void share()} aria-label={label} title={label} data-lick-share={info.bpm} data-lick-share-key={info.key}>
        <Icon k="share" size={16} />
      </button>
    );
  return (
    <button type="button" className="btn small ghost lk-share" disabled={state === 'busy'} onClick={() => void share()} data-lick-share={info.bpm} data-lick-share-key={info.key}>
      <Icon k="share" size={14} />
      {label}
    </button>
  );
}
