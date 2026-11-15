// Velocity bars (COURSE-FEEDBACK-UI §4.1, slice 5): a thin row under the score — one bar a note, as tall as it was
// played (four steps, pp to f), a hollow ink outline where the item asks for a level, a thick ink top on an accent.
// Ink and purple only (no traffic-light colours); LTR like the music; hidden from screen readers (the review's "Why?"
// has the loudness chart and its words).

import type { VelBar } from '../engine/drills/velBars';

const H = 18;
const STEP = 4;

export function VelocityBars({ bars }: { bars: VelBar[] }) {
  if (!bars.length) return null;
  const W = 288;
  const slot = W / bars.length;
  const bw = Math.max(2, Math.min(10, slot - 2));
  return (
    <svg className="vel-bars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ direction: 'ltr' }} aria-hidden="true" data-vel-bars={bars.length} data-vel-played={bars.filter((b) => b.step !== null).length}>
      <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} className="vb-base" />
      {bars.map((b, i) => {
        const x = i * slot + (slot - bw) / 2;
        return (
          <g key={i} data-vel-step={b.step ?? undefined} data-vel-target={b.target ?? undefined}>
            {b.target !== null && <rect x={x} y={H - 1 - b.target * STEP} width={bw} height={b.target * STEP} rx={1} className="vb-target" />}
            {b.step !== null && <rect x={x} y={H - 1 - b.step * STEP} width={bw} height={b.step * STEP} rx={1} className={`vb-bar ${b.target !== null && b.step !== b.target ? 'off' : ''}`} />}
            {b.accent && <rect x={x - 0.5} y={H - 1 - (b.step ?? b.target ?? 4) * STEP - 1} width={bw + 1} height={2.2} className="vb-acc" />}
          </g>
        );
      })}
    </svg>
  );
}
