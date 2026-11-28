// The three-notes-and-two-intervals art ("True or false?" / Bluff). 0.61 (SPEC-REDESIGN): two note heads on a staff,
// and the middle note rides the arc between them, then settles on top; the two intervals sit on the arc's halves.
// Paper language (icon redraw): every head and chip is a flat sheet with its darker edge 3 units below, no outlines.

import { mix } from './paper/kit';

const INK = '#1e1033';
const EDGE = 3.2;
/** A sheet's edge: the face colour mixed 30 % toward ink. */
const edge = (c: string) => mix(c, INK, 0.3);

function reduced(): boolean {
  try {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function Head({ x, y, fill, label }: { x: number; y: number; fill: string; label: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y + EDGE} rx={26} ry={19} transform={`rotate(-20 ${x} ${y + EDGE})`} fill={edge(fill)} />
      <ellipse cx={x} cy={y} rx={26} ry={19} transform={`rotate(-20 ${x} ${y})`} fill={fill} />
      <text x={x} y={y + 7} textAnchor="middle" className={`trio-label ${label.length > 3 ? 'small' : ''}`} direction="ltr">
        {label}
      </text>
    </g>
  );
}

export function TrioArt({
  n,
  left,
  mid,
  right,
  intervalLeft,
  intervalRight,
  className = '',
}: {
  /** Changes on every new trio (restarts the ride). */
  n: number;
  left: string;
  mid: string;
  right: string;
  intervalLeft: string;
  intervalRight: string;
  className?: string;
}) {
  const arc = 'M80 128 Q180 6 280 128';
  const still = reduced();
  return (
    <svg className={`hero-art trio-v2 ${className}`} viewBox="0 0 360 220" role="img" aria-label={`${left} → ${mid}: ${intervalLeft} · ${mid} → ${right}: ${intervalRight}`}>
      <g className="trio-staff" fill={INK} opacity={0.3}>
        {[120, 136, 152, 168, 184].map((y) => (
          <rect key={y} x={12} y={y - 1} width={336} height={2} rx={1} />
        ))}
        <rect x={13} y={112} width={2.4} height={80} rx={1} />
        <rect x={344.6} y={112} width={2.4} height={80} rx={1} />
      </g>
      <path d={arc} fill="none" stroke="#a78bfa" strokeWidth={3.4} strokeDasharray="2 9" strokeLinecap="round" className="arc" />
      <g key={`h${n}`} className="trio-heads">
        <Head x={80} y={152} fill="#12C9B4" label={left} />
        <Head x={280} y={136} fill="#A78BFA" label={right} />
      </g>
      <g key={`b${n}`} className="trio-badges">
        <g transform="translate(112 72)">
          <rect x={-34} y={-16 + EDGE} width={68} height={30} rx={15} fill="#b9a3e8" />
          <rect x={-34} y={-16} width={68} height={30} rx={15} fill="#f3ecff" />
          <text y={6} textAnchor="middle" className="deg-badge" direction="ltr">
            {intervalLeft}
          </text>
        </g>
        <g transform="translate(248 72)">
          <rect x={-34} y={-16 + EDGE} width={68} height={30} rx={15} fill="#b9a3e8" />
          <rect x={-34} y={-16} width={68} height={30} rx={15} fill="#f3ecff" />
          <text y={6} textAnchor="middle" className="deg-badge" direction="ltr">
            {intervalRight}
          </text>
        </g>
      </g>
      <g key={`m${n}`} className="trio-rider" transform={still ? 'translate(180 67)' : undefined}>
        {!still && <animateMotion dur="0.45s" path="M80 128 Q130 67 180 67" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.3 0 0.2 1" />}
        <ellipse cx={0} cy={EDGE} rx={30} ry={22} transform={`rotate(-20 0 ${EDGE})`} fill={edge('#ff8a3d')} />
        <ellipse cx={0} cy={0} rx={30} ry={22} transform="rotate(-20)" fill="#ff8a3d" />
        <text x={0} y={8} textAnchor="middle" className={`trio-label ${mid.length > 3 ? 'small' : ''}`} direction="ltr">
          {mid}
        </text>
      </g>
    </svg>
  );
}
