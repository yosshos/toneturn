// Studio-look element art (approved 2026-11-17, scratchpad elements/build.py): the league tiles (each league adds a chord
// tone, drawn as stacked Paper layers in its own colour), the rank shields (Bronze → Master, pips for III / II / I, a
// star for Master), and the final-barline art of the lesson end. Paper language: flat sheets with a darker edge layer
// under them, no outlines. Pure drawing — callers keep every number they compute.

import type { ReactNode } from 'react';
import type { RankTier } from '../../engine/ranks';

const INK = '#1e1033';

/** A Paper sheet: the edge layer offset down by `dy`, then the face. */
function Sheet({ children, fill, edge, dy = 3.2 }: { children: (fill: string) => ReactNode; fill: string; edge: string; dy?: number }) {
  return (
    <>
      <g transform={`translate(0 ${dy})`}>{children(edge)}</g>
      {children(fill)}
    </>
  );
}

// ---------------------------------------------------------------- league tiles

/** Tile colours per league (Root … 13): [face, edge]. The 13 is the dark one with lemon heads. */
export const LEAGUE_TILE: [string, string][] = [
  ['#c9b8f5', '#8a6fd6'],
  ['#9fd8f7', '#3a8fc2'],
  ['#8fe6d6', '#159a88'],
  ['#ffd27a', '#c98a00'],
  ['#ffb08a', '#d0602c'],
  ['#f7a3c4', '#c2366f'],
  ['#2b0d5e', '#12052e'],
];
const RASPBERRY = '#e23a5a';
const RASPBERRY_E = '#9c1d3a';

const headAt = (k: number) => ({ cx: 38 + (k % 2) * 9, cy: 66 - k * 6 });

function Head({ k, fill, edge, className }: { k: number; fill: string; edge: string; className?: string }) {
  const { cx, cy } = headAt(k);
  return (
    <g className={className}>
      <ellipse cx={cx} cy={cy + 1.4} rx="6.2" ry="4.6" transform={`rotate(-20 ${cx} ${cy + 1.4})`} fill={edge} />
      <ellipse cx={cx} cy={cy} rx="6.2" ry="4.6" transform={`rotate(-20 ${cx} ${cy})`} fill={fill} />
    </g>
  );
}

/**
 * A league tile: the chord so far (one head per league up to `tier`, 1-based) on a small staff, on a Paper tile in the
 * league's colour. `ghostNext` dashes the next tone; `falling` (relegation) draws the lost tones in raspberry, falling;
 * `arrive` drops the newest tone in. `cur` rings the tile (the ladder's current league).
 */
export function LeagueTile({ tier, size = 84, title, ghostNext = false, arrive = false, falling = [], cur = false }: { tier: number; size?: number; title?: string; ghostNext?: boolean; arrive?: boolean; falling?: number[]; cur?: boolean }) {
  const i = Math.max(1, Math.min(7, tier)) - 1;
  const [body, edge] = LEAGUE_TILE[i];
  const dark = i === 6;
  const line = dark ? '#ffffff55' : '#1e103333';
  const headFill = dark ? '#ffd43b' : INK;
  const headEdge = dark ? '#c98a00' : '#00000033';
  return (
    <svg className={`league-badge league-tile tier-${tier}`} width={size} height={size} viewBox="0 0 84 84" role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <Sheet fill={body} edge={edge} dy={3.4}>
        {(f) => <rect x="6" y="6" width="72" height="72" rx="19" fill={f} />}
      </Sheet>
      <path d="M14 30H70M14 38H70M14 46H70M14 54H70M14 62H70" stroke={line} strokeWidth="1.4" />
      {ghostNext && tier < 7 && (() => {
        const { cx, cy } = headAt(i + 1);
        return <ellipse cx={cx} cy={cy} rx="6.2" ry="4.6" transform={`rotate(-20 ${cx} ${cy})`} fill="none" stroke={dark ? '#ffffffaa' : INK} strokeOpacity="0.5" strokeDasharray="2.6 2.4" strokeWidth="1.6" />;
      })()}
      {Array.from({ length: i + 1 }, (_, k) => (
        <Head key={k} k={k} fill={headFill} edge={headEdge} className={k === i ? `lb-new${arrive ? ' lb-arrive' : ''}` : undefined} />
      ))}
      {falling.map((ft, n) => (
        <g key={`f${ft}`} className="lb-fall" style={{ animationDelay: `${0.7 + n * 0.25}s` }}>
          <Head k={ft - 1} fill={RASPBERRY} edge={RASPBERRY_E} />
        </g>
      ))}
      {cur && <rect x="2" y="2" width="80" height="80" rx="22" fill="none" stroke="#ffd43b" strokeWidth="4" />}
    </svg>
  );
}

// ---------------------------------------------------------------- rank shields

/** Shield tones per tier: [face, edge, light]. */
export const RANK_TONE: Record<RankTier, [string, string, string]> = {
  bronze: ['#e3a26f', '#9c5a2b', '#f6cfab'],
  silver: ['#cfd6e2', '#7c879a', '#eef2f7'],
  gold: ['#ffd43b', '#c98a00', '#fff1b0'],
  platinum: ['#9fe3dc', '#2f9c90', '#dcf7f3'],
  diamond: ['#b5c8ff', '#4f67d1', '#e3eaff'],
  master: ['#b794ff', '#5b2fc4', '#e7dcff'],
};
const SHIELD = 'M38 6 L64 18 L64 44 C64 58 52 68 38 74 C24 68 12 58 12 44 L12 18 Z';

/**
 * A rank shield: a Paper shield in the tier's metal with a note head in the middle; `pips` dots for the division (III = 3,
 * II = 2, I = 1), a star for Master. `tier` null: an unranked grey shield with a "?".
 */
export function RankShield({ tier, pips = 0, size = 76, label, rays = false }: { tier: RankTier | null; pips?: number; size?: number; label?: string; rays?: boolean }) {
  const [body, edge, light] = tier ? RANK_TONE[tier] : ['#ece6f5', '#cdc3dd', '#f6f2fb'];
  const h = Math.round((size * 80) / 76);
  return (
    <svg className={`rank-crest rank-shield ${tier ? `rc-${tier}` : 'rc-none'}`} width={size} height={h} viewBox={rays ? '-24 -22 124 124' : '0 0 76 80'} role="img" aria-label={label}>
      {label && <title>{label}</title>}
      {rays && (
        <g className="rs-rays" fill={light} opacity="0.85">
          {Array.from({ length: 12 }, (_, k) => (
            <path key={k} d="M38 40 L34 -18 L42 -18 Z" transform={`rotate(${k * 30} 38 40)`} />
          ))}
        </g>
      )}
      <Sheet fill={body} edge={edge} dy={4}>
        {(f) => <path d={SHIELD} fill={f} />}
      </Sheet>
      <path d="M38 12 L58 21 L58 30 C46 26 30 26 18 30 L18 21 Z" fill={light} opacity=".8" />
      {tier ? (
        <>
          <ellipse cx="35" cy="39.6" rx="9" ry="6.6" transform="rotate(-20 35 39.6)" fill="#00000022" />
          <ellipse cx="35" cy="38" rx="9" ry="6.6" transform="rotate(-20 35 38)" fill={edge} />
          <rect x="41.5" y="18" width="4.4" height="21" rx="2.2" fill={edge} />
          {tier !== 'master' &&
            Array.from({ length: pips }, (_, k) => {
              const cx = 38 + (k - (pips - 1) / 2) * 11;
              return (
                <g key={k}>
                  <circle cx={cx} cy="57.2" r="3.6" fill="#00000022" />
                  <circle cx={cx} cy="56" r="3.6" fill={edge} />
                </g>
              );
            })}
          {tier === 'master' && (
            <Sheet fill="#ffd43b" edge="#c98a00" dy={1.4}>
              {(f) => <path d="M38 47 l3 6 6.5 1 -4.7 4.6 1.1 6.4 -5.9 -3 -5.9 3 1.1 -6.4 -4.7 -4.6 6.5 -1z" fill={f} />}
            </Sheet>
          )}
        </>
      ) : (
        <text x="38" y="50" textAnchor="middle" fontSize="24" fontWeight="700" fill={edge}>
          ?
        </text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- new best tempo

/** The new-best-tempo hero: a big ♩number, the previous best under it. Numbers come from the caller. */
export function TempoBest({ bpm, prev, prevLabel }: { bpm: number; prev?: number | null; prevLabel: string }) {
  return (
    <div className="cel-tempo" data-tempo-best={bpm}>
      <span className="tbig">
        <bdi dir="ltr">♩{bpm}</bdi>
      </span>
      {prev ? (
        <span className="tprev">
          {prevLabel} <bdi dir="ltr">♩{prev}</bdi>
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- lesson end

/** The lesson's final barline with a fermata (purple), ink bars, no outlines. */
export function FinalBarline({ size = 80 }: { size?: number }) {
  return (
    <svg className="cel-barline" width={size * (80 / 120)} height={size} viewBox="0 0 80 120" aria-hidden="true">
      <path d="M22 24 a18 18 0 0 1 36 0" fill="none" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
      <circle cx="40" cy="22" r="4.5" fill="#7c3aed" />
      <rect x="30" y="34" width="6" height="80" rx="2" fill="currentColor" />
      <rect x="42" y="34" width="14" height="80" rx="3" fill="currentColor" />
    </svg>
  );
}
