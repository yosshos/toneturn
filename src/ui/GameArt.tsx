// Intro drawings for games that had none (0.61, SPEC-REDESIGN): Tune-up and the two Echo games.
// Flat brand art: ink outlines, one palette, Toni where he belongs. No images.
import { Toni } from './Toni';

const INK = '#1E1033';

function Staff({ w = 300 }: { w?: number }) {
  return (
    <g stroke={INK} strokeWidth={1.6} opacity={0.35}>
      {[40, 52, 64, 76, 88].map((y) => (
        <path key={y} d={`M10 ${y}H${w - 10}`} />
      ))}
    </g>
  );
}

const head = (x: number, y: number, fill: string, key?: string | number) => <ellipse key={key} cx={x} cy={y} rx={11} ry={8} transform={`rotate(-20 ${x} ${y})`} fill={fill} stroke={INK} strokeWidth={3} />;

/** Tune-up: a wobbly note slides onto the target line; the target is the dashed lemon line. */
export function TuneUpArt() {
  return (
    <div className="game-art" aria-hidden="true">
      <svg viewBox="0 0 300 120">
        <Staff />
        <path d="M20 64H280" stroke="#FFD43B" strokeWidth={6} strokeDasharray="10 8" strokeLinecap="round" />
        <path d="M40 92 C70 92 80 40 110 44 S150 80 180 66 S220 62 236 64" fill="none" stroke={INK} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
        {head(40, 92, '#FF5FA2')}
        {head(110, 44, '#FF8A3D')}
        <g className="ga-settle">{head(246, 64, '#12C9B4')}</g>
        <path d="M262 46l6 -10M270 54l10 -4" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Echo: Toni hears a phrase (left) and plays it back (right) — the same heads, a beat later. */
export function EchoArt({ kind }: { kind: 'melody' | 'rhythm' }) {
  const ys = kind === 'melody' ? [76, 58, 64, 46] : [64, 64, 64, 64];
  const fill = kind === 'melody' ? '#3AB8FF' : '#FF5FA2';
  return (
    <div className="game-art echo-art" aria-hidden="true">
      <svg viewBox="0 0 300 120">
        <Staff />
        <path d="M150 34V94" stroke={INK} strokeWidth={3} />
        {ys.map((y, i) => head(24 + i * 30, y, '#FFFFFF', `a${i}`))}
        {ys.map((y, i) => head(176 + i * 30, y, fill, `b${i}`))}
        <g fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.6}>
          <path d="M134 50a16 16 0 0 1 0 28" />
          <path d="M142 42a26 26 0 0 1 0 44" />
        </g>
      </svg>
      <span className="ga-toni">
        <Toni state="listen" size={62} />
      </span>
    </div>
  );
}
