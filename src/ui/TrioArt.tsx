// The three-notes-and-two-intervals art (home screen, "True or false?").

export function TrioArt({
  n,
  left,
  mid,
  right,
  intervalLeft,
  intervalRight,
  className = '',
}: {
  /** Changes on every new trio (restarts the swap animations). */
  n: number;
  left: string;
  mid: string;
  right: string;
  intervalLeft: string;
  intervalRight: string;
  className?: string;
}) {
  const L = left;
  const M = mid;
  const R = right;
  const trio = { intervalLeft, intervalRight };
  return (
    <svg className={`hero-art ${className}`} viewBox="0 0 360 220" role="img" aria-label={`${L} → ${M}: ${trio.intervalLeft} · ${M} → ${R}: ${trio.intervalRight}`}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#FFC94D" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFC94D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#FF8A4D" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="90" r="120" fill="url(#glow)" />
      <g className="sparkles">
        <circle cx="40" cy="40" r="2.5" fill="#FFF6EA" />
        <circle cx="320" cy="30" r="2" fill="#FFF6EA" />
        <circle cx="300" cy="70" r="1.6" fill="#FFC94D" />
        <circle cx="70" cy="80" r="1.6" fill="#A98BFF" />
      </g>
      <g className="house left swap-house" key={`l${n}`}>
        <path d="M40 120l40-34 40 34v50H40z" fill="#4BE3B5" />
        <rect x="68" y="138" width="24" height="32" rx="4" fill="#1E1236" />
        <text x="80" y="112" textAnchor="middle" className={`house-label ${L.length > 3 ? 'small' : ''}`} direction="ltr">
          {L}
        </text>
      </g>
      <g className="house right swap-house" key={`r${n}`} style={{ animationDelay: '90ms' }}>
        <path d="M240 120l40-34 40 34v50h-80z" fill="#A98BFF" />
        <rect x="268" y="138" width="24" height="32" rx="4" fill="#1E1236" />
        <text x="280" y="112" textAnchor="middle" className={`house-label ${R.length > 3 ? 'small' : ''}`} direction="ltr">
          {R}
        </text>
      </g>
      <path d="M95 84Q180 10 265 84" fill="none" stroke="#FFC94D" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" className="arc" />
      <g className="float-coin">
        <g className="swap-coin" key={`c${n}`}>
          <circle cx="180" cy="62" r="30" fill="url(#coin)" stroke="#2A1747" strokeWidth="4" />
          <text x="180" y="73" textAnchor="middle" className={`coin-label ${M.length > 3 ? 'small' : ''}`} direction="ltr">
            {M}
          </text>
        </g>
        <g className="swap-badges" key={`b${n}`}>
          <text x="128" y="54" textAnchor="middle" className="deg-badge" direction="ltr">
            {trio.intervalLeft}
          </text>
          <text x="232" y="54" textAnchor="middle" className="deg-badge" direction="ltr">
            {trio.intervalRight}
          </text>
        </g>
      </g>
      <g transform="translate(0 176)">
        {Array.from({ length: 15 }).map((_, i) => (
          <rect key={i} x={i * 24} y="0" width="23" height="44" rx="3" fill="#FFF6EA" />
        ))}
        {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14].map((i) => (
          <rect key={`b${i}`} x={i * 24 + 16} y="0" width="14" height="26" rx="2" fill="#1E1236" />
        ))}
      </g>
    </svg>
  );
}
