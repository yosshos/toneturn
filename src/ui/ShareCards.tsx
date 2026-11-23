// The progress share card (docs/SPEC-PROGRESS-CHARTS.md §5; BUILD-PLAN-2026-11 phase 8): optional, from the "Over
// time" tab — this week's four numbers with their change against last week, and one fact sentence when the data has
// one. No ranking against others (comparison stays in the leagues). The mature language: a flat dark card, the logo,
// plain type, no emoji, no mascot, no gradient. An SVG string → PNG → the device's share sheet with the link back.

import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Tile } from '../engine/progressSeries';
import { appHome, inviteTail, shareOut } from '../engine/shareLinks';
import { svgToPng } from './studio/shareCard';
import { Logo } from './brand/Logo';
import { Icon } from './icons';

type Lang = 'he' | 'en';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const TILE_WORD: Record<Tile['id'], { en: string; he: string }> = {
  minutes: { en: 'Minutes', he: 'דקות' },
  closed: { en: 'Items closed', he: 'פריטים נסגרו' },
  days: { en: 'Practice days', he: 'ימי אימון' },
  tempo: { en: 'Of target tempo', he: 'מטמפו היעד' },
};

export const PROGRESS_CARD = { w: 540, h: 675 } as const;

/** The card: the brand, "This week", four tiles (number + ▲/▼ against last week), one sentence. */
export function progressCardSvg(tiles: Tile[], line: string | null, lang: Lang): string {
  const { w: W, h: H } = PROGRESS_CARD;
  const he = lang === 'he';
  const dir = he ? 'rtl' : 'ltr';
  const font = 'font-family="Rubik, Arial, sans-serif"';
  const edge = he ? W - 40 : 40;
  const logoSvg = renderToStaticMarkup(<Logo size={56} variant="paper" />);
  const i = logoSvg.indexOf('<svg');
  const j = logoSvg.lastIndexOf('</svg>');
  const logo = i >= 0 && j >= 0 ? logoSvg.slice(i, j + 6).replace(/^<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/^<svg([^>]*?)\sheight="[^"]*"/, '<svg$1').replace(/^<svg/, `<svg x="${he ? W - 96 : 40}" y="36" width="56" height="56"`) : '';
  const bx = he ? W - 110 : 110;
  const tile = (t: Tile, k: number) => {
    const col = k % 2;
    const row = Math.floor(k / 2);
    const tw = (W - 80 - 16) / 2;
    const x = 40 + (he ? 1 - col : col) * (tw + 16);
    const y = 170 + row * 150;
    const d = t.now - t.prev;
    const tx = he ? x + tw - 22 : x + 22;
    const val = t.id === 'tempo' ? `${t.now}%` : String(t.now);
    const delta = d === 0 ? '=' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}`;
    return [
      `<rect x="${x}" y="${y}" width="${tw}" height="132" rx="18" fill="#251a4a"/>`,
      `<text x="${tx}" y="${y + 38}" text-anchor="start" ${font} font-size="19" fill="#cbbcf2" direction="${dir}">${esc(TILE_WORD[t.id][lang])}</text>`,
      `<text x="${tx}" y="${y + 88}" text-anchor="start" ${font} font-size="44" font-weight="700" fill="#ffffff" direction="ltr">${esc(val)}</text>`,
      `<text x="${tx}" y="${y + 116}" text-anchor="start" ${font} font-size="17" fill="#cbbcf2" direction="ltr">${esc(delta)}</text>`,
    ].join('');
  };
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<rect width="${W}" height="${H}" rx="36" fill="#160f33"/>`,
    logo,
    `<text x="${bx}" y="64" text-anchor="start" ${font} font-size="24" font-weight="700" fill="#ffffff" direction="${dir}">${esc(he ? 'החוש ה־7' : 'The 7th Sense')}</text>`,
    `<text x="${bx}" y="90" text-anchor="start" ${font} font-size="17" fill="#cbbcf2" direction="${dir}">${esc(he ? 'השבוע, מול השבוע שעבר' : 'This week, against last week')}</text>`,
    ...tiles.slice(0, 4).map(tile),
    line ? `<text x="${edge}" y="${H - 70}" text-anchor="start" ${font} font-size="19" fill="#ffffff" direction="${dir}">${esc(clip(line, 44))}</text>` : '',
    `<text x="${edge}" y="${H - 38}" text-anchor="start" ${font} font-size="15" fill="#a99fd0" direction="${dir}">${esc(he ? 'בלי דירוג מול אחרים' : 'No ranking against others')}</text>`,
    `</svg>`,
  ].join('');
}

/** The share text: the week in numbers, then the invitation (the link follows). */
export function progressShareText(tiles: Tile[], lang: Lang): string {
  const t = Object.fromEntries(tiles.map((x) => [x.id, x.now])) as Record<Tile['id'], number>;
  const line = lang === 'he' ? `השבוע: ${t.minutes ?? 0} דקות אימון, ${t.closed ?? 0} פריטים נסגרו, ${t.days ?? 0} ימי אימון` : `This week: ${t.minutes ?? 0} minutes of practice, ${t.closed ?? 0} items closed, ${t.days ?? 0} practice days`;
  return `${line}\n\n${inviteTail(lang)}`;
}

/** A small icon-and-word button (app chrome stays small and clean). */
export function ProgressShareButton({ lang, tiles, line }: { lang: Lang; tiles: Tile[]; line: string | null }) {
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'shared'>('idle');
  const he = lang === 'he';
  if (!tiles.some((t) => t.now > 0)) return null;
  const share = async () => {
    setState('busy');
    let file: File | undefined;
    try {
      const png = await svgToPng(progressCardSvg(tiles, line, lang));
      if (png) file = new File([png], 'week.png', { type: 'image/png' });
    } catch {
      /* text and link only */
    }
    const r = await shareOut(progressShareText(tiles, lang), appHome(), file ? [file] : undefined);
    setState(r === 'copied' ? 'copied' : r === 'shared' ? 'shared' : 'idle');
  };
  return (
    <button type="button" className="btn small ghost" disabled={state === 'busy'} onClick={() => void share()} data-progress-share={state}>
      <Icon k="share" size={14} />
      {state === 'copied' ? (he ? 'הקישור הועתק' : 'Link copied') : he ? 'לשתף את השבוע' : 'Share the week'}
    </button>
  );
}
