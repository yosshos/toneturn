// League badge (spec Y.3): a small staff that fills with chord notes from middle C — one note per league,
// Root → 13. The newest note glows in the league colour; the 13
// league wears an aurora frame.

import { LADDER, TOP_TIER, tierOf } from '../engine/league';

/** Diatonic step above middle C for each chord note (C E G B♭ D F♯ A are all on lines / ledger lines). */
const POS = [0, 2, 4, 6, 8, 10, 12];

export function LeagueBadge({ tier, size = 72, ghostNext = false, title, arrive = false, falling = [] }: { tier: number; size?: number; ghostNext?: boolean; title?: string; /** Promotion (spec Y.5): the newest note drops onto its line. */ arrive?: boolean; /** Relegation: these higher notes fall off the staff. */ falling?: number[] }) {
  const T = tierOf(tier);
  const W = 64;
  const H = 76;
  const half = 4; // half a staff space
  const base = 62; // y of middle C
  const y = (pos: number) => base - pos * half;
  const x = 36;
  const notes = LADDER.slice(0, tier);
  const next = ghostNext && tier < TOP_TIER ? LADDER[tier] : null;
  const gid = `lg-${tier}-${size}`;
  return (
    <svg className={`league-badge tier-${tier}`} width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? T.symbol}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={T.color} />
          <stop offset="1" stopColor={T.color2} />
        </linearGradient>
        <radialGradient id={`${gid}-glow`}>
          <stop offset="0" stopColor={T.color} stopOpacity="0.9" />
          <stop offset="1" stopColor={T.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1.5" y="1.5" width={W - 3} height={H - 3} rx="14" fill="var(--card, #2b1a4a)" />
      <rect className={tier === TOP_TIER ? 'lb-frame aurora' : 'lb-frame'} x="1.5" y="1.5" width={W - 3} height={H - 3} rx="14" fill="none" stroke={`url(#${gid})`} strokeWidth="3" />
      {/* the staff: E G B D F */}
      {[2, 4, 6, 8, 10].map((p) => (
        <line key={p} x1="9" x2={W - 9} y1={y(p)} y2={y(p)} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      ))}
      {/* ledger lines: middle C below, A above (13) */}
      <line x1={x - 8} x2={x + 8} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      {(tier >= 7 || next?.tier === 7) && <line x1={x - 8} x2={x + 8} y1={y(12)} y2={y(12)} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />}
      {next && <ellipse cx={x} cy={y(POS[next.tier - 1])} rx="4.6" ry="3.4" transform={`rotate(-20 ${x} ${y(POS[next.tier - 1])})`} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="2 2" />}
      {notes.map((n, i) => {
        const newest = i === tier - 1;
        const fillC = newest ? T.color : 'currentColor';
        const cy = y(POS[i]);
        return (
          <g key={n.tier} className={`${newest ? 'lb-new' : ''} ${newest && arrive ? 'lb-arrive' : ''}`}>
            {newest && <circle cx={x} cy={cy} r="9" fill={`url(#${gid}-glow)`} />}
            {n.acc && (
              <text x={x - 12} y={cy + 3.5} fontSize="9" fill={fillC} textAnchor="middle">
                {n.acc}
              </text>
            )}
            <ellipse cx={x} cy={cy} rx="4.6" ry="3.4" transform={`rotate(-20 ${x} ${cy})`} fill={fillC} />
          </g>
        );
      })}
      {falling.map((ft, k) => {
        const F = tierOf(ft);
        const cy = y(POS[ft - 1]);
        return (
          <g key={`f${ft}`} className="lb-fall" style={{ animationDelay: `${0.7 + k * 0.25}s` }}>
            {F.acc && (
              <text x={x - 12} y={cy + 3.5} fontSize="9" fill={F.color} textAnchor="middle">
                {F.acc}
              </text>
            )}
            <ellipse cx={x} cy={cy} rx="4.6" ry="3.4" transform={`rotate(-20 ${x} ${cy})`} fill={F.color} />
          </g>
        );
      })}
    </svg>
  );
}

/** All seven leagues in a row: reached ones filled, the current one highlighted, the rest dimmed. */
export function LeagueLadder({ tier, names }: { tier: number; names: string[] }) {
  return (
    <ol className="league-ladder" aria-label="leagues">
      {LADDER.map((L) => (
        <li key={L.tier} className={L.tier === tier ? 'now' : L.tier < tier ? 'past' : 'ahead'} style={{ ['--tier-color' as string]: L.color }}>
          <LeagueBadge tier={L.tier} size={34} title={names[L.tier - 1]} />
          <small>{names[L.tier - 1]}</small>
        </li>
      ))}
    </ol>
  );
}
