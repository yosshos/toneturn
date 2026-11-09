// League badge (spec Y.3): a small staff that fills with chord notes from middle C — one note per league,
// Root → 13. The newest note glows in the league colour; the 13
// league wears an aurora frame.

import { LADDER, TOP_TIER, tierOf } from '../engine/league';

/** Diatonic step above middle C for each chord note (C E G B♭ D F♯ A are all on lines / ledger lines). */
const POS = [0, 2, 4, 6, 8, 10, 12];

/** League tile colours (0.61, design canvas "League symbols"): one v2 colour per league, purple + lemon for 13. */
const TILE = ['#EDE6F7', '#12C9B4', '#3AB8FF', '#A78BFA', '#FFD43B', '#FF5FA2', '#6D28D9'];

export function LeagueBadge({ tier, size = 72, ghostNext = false, title, arrive = false, falling = [] }: { tier: number; size?: number; ghostNext?: boolean; title?: string; /** Promotion (spec Y.5): the newest note drops onto its line. */ arrive?: boolean; /** Relegation: these higher notes fall off the staff. */ falling?: number[] }) {
  // 0.61 (SPEC-REDESIGN): an ink-outlined tile with a white staff window; the chord reads like real notation (one
  // stem, accidentals), the newest note is lemon, the league's symbol sits in a chip; the full 13 wears a fermata.
  const T = tierOf(tier);
  const ink = '#1E1033';
  const top = tier === TOP_TIER;
  const half = 5;
  const base = 80; // E4 line
  const y = (st: number) => base - st * half;
  const step = (p: number) => p - 2; // POS is steps above middle C; the staff counts from E4
  const x = 66;
  const notes = LADDER.slice(0, tier);
  const next = ghostNext && tier < TOP_TIER ? LADDER[tier] : null;
  const hi = step(POS[tier - 1]);
  return (
    <svg className={`league-badge tier-${tier}`} width={size} height={size * 1.22} viewBox="0 0 120 146" role="img" aria-label={title ?? T.symbol}>
      <rect x="2" y="10" width="112" height="128" rx="24" fill={ink} />
      <rect x="7" y="5" width="110" height="128" rx="24" fill={TILE[tier - 1]} stroke={ink} strokeWidth="3" />
      <rect x="20" y="16" width="84" height="88" rx="14" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
      {[0, 2, 4, 6, 8].map((st) => (
        <path key={st} d={`M28 ${y(st)}H96`} stroke={ink} strokeWidth="1.4" opacity=".55" />
      ))}
      <path d={`M${x - 11} ${y(-2)}H${x + 11}`} stroke={ink} strokeWidth="1.6" />
      {(tier >= 7 || next?.tier === 7) && <path d={`M${x - 11} ${y(10)}H${x + 11}`} stroke={ink} strokeWidth="1.6" />}
      {tier >= 2 && <path d={`M${x + 6.3} ${y(-2) - 1}V${y(hi) - 24}`} stroke={ink} strokeWidth="2.2" />}
      {next && <ellipse cx={x} cy={y(step(POS[next.tier - 1]))} rx="7" ry="5" transform={`rotate(-20 ${x} ${y(step(POS[next.tier - 1]))})`} fill="none" stroke={ink} strokeOpacity="0.45" strokeDasharray="3 3" strokeWidth="2" />}
      {notes.map((n, i) => {
        const newest = i === tier - 1;
        const cy = y(step(POS[i]));
        return (
          <g key={n.tier} className={`${newest ? 'lb-new' : ''} ${newest && arrive ? 'lb-arrive' : ''}`}>
            {n.acc && (
              <text x={x - 16} y={cy + 5} textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" fill={ink}>
                {n.acc}
              </text>
            )}
            <ellipse cx={x} cy={cy} rx="7" ry="5" transform={`rotate(-20 ${x} ${cy})`} fill={newest ? '#FFD43B' : ink} stroke={ink} strokeWidth={newest ? 2 : 0} />
          </g>
        );
      })}
      {falling.map((ft, k) => {
        const F = tierOf(ft);
        const cy = y(step(POS[ft - 1]));
        return (
          <g key={`f${ft}`} className="lb-fall" style={{ animationDelay: `${0.7 + k * 0.25}s` }}>
            {F.acc && (
              <text x={x - 16} y={cy + 5} textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" fill={ink}>
                {F.acc}
              </text>
            )}
            <ellipse cx={x} cy={cy} rx="7" ry="5" transform={`rotate(-20 ${x} ${cy})`} fill="#FF5FA2" stroke={ink} strokeWidth="2" />
          </g>
        );
      })}
      {top && (
        <>
          <path d={`M${x - 14} ${y(10) - 14} A14 12 0 0 1 ${x + 14} ${y(10) - 14}`} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx={x} cy={y(10) - 18} r="2.4" fill={ink} />
        </>
      )}
      <rect x="34" y="112" width="56" height="28" rx="10" fill={top ? '#FFD43B' : '#FFFFFF'} stroke={ink} strokeWidth="2.5" />
      <text x="62" y="132" textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize="18" fill={ink} direction="ltr">
        {T.symbol}
      </text>
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
