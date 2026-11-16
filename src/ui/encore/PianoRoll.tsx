// The piano roll of a take (SPEC-PHRASE-STUDIO §5.1–5.2): notes as rounded bars (velocity as opacity), bar lines and
// beat ticks, bar numbers, chord symbols above, the lilac selection band with two drag handles (44 px hit areas),
// suggested boundaries as ink ticks, candidate phrases, a playhead. Musical time runs left → right in every language.

import { useRef } from 'react';

export interface RollNote {
  midi: number;
  beat: number;
  dur: number;
  vel?: number;
  hand?: 'R' | 'L';
  mark?: 'wrong' | 'ghost' | 'sel' | null;
}

export function PianoRoll({
  notes,
  from,
  to,
  meter = 4,
  sel,
  onSel,
  onHandle,
  ticks = [],
  cands = [],
  chords,
  playhead,
  height = 180,
  barNums = true,
  onNote,
  picked,
  label,
  magnet = null,
  magnetLabel = 'suggested edge',
}: {
  notes: RollNote[];
  /** Visible span (beats). */
  from: number;
  to: number;
  meter?: number;
  sel?: [number, number] | null;
  /** A handle was dragged: the raw beat under the pointer, and whether the pointer was held still (beat snap). */
  onHandle?: (which: 'from' | 'to', beat: number, held: boolean, shift: boolean) => void;
  onSel?: (beat: number) => void;
  ticks?: number[];
  cands?: [number, number][];
  /** Chord symbol per bar index (from beat 0). */
  chords?: string[];
  playhead?: number | null;
  height?: number;
  barNums?: boolean;
  onNote?: (i: number) => void;
  picked?: number | null;
  label?: string;
  /** A handle the magnet pulled onto a suggested boundary (beat): a small badge above it. */
  magnet?: number | null;
  magnetLabel?: string;
}) {
  const W = 340;
  const H = height;
  const top = chords?.length ? 16 : 4;
  const bottom = barNums ? 12 : 4;
  const ps = notes.map((n) => n.midi);
  const lo = Math.min(...ps, 60) - 2;
  const hi = Math.max(...ps, 72) + 2;
  const span = Math.max(1, to - from);
  const x = (b: number) => ((b - from) / span) * W;
  const rowH = (H - top - bottom) / Math.max(1, hi - lo);
  const y = (m: number) => top + (hi - m) * rowH;
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ which: 'from' | 'to'; still: number; lastX: number; timer: number | null; held: boolean } | null>(null);
  const beatAt = (clientX: number) => {
    const r = svg.current!.getBoundingClientRect();
    return from + ((clientX - r.left) / r.width) * span;
  };
  const down = (which: 'from' | 'to') => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const d = { which, still: Date.now(), lastX: e.clientX, timer: null as number | null, held: false };
    d.timer = window.setTimeout(() => {
      if (drag.current === d) d.held = true;
    }, 300);
    drag.current = d;
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !onHandle) return;
    if (Math.abs(e.clientX - d.lastX) > 3) {
      d.lastX = e.clientX;
      if (d.timer) window.clearTimeout(d.timer);
      const keep = d.held;
      d.timer = window.setTimeout(() => {
        if (drag.current === d) d.held = true;
      }, 300);
      d.held = keep;
    }
    onHandle(d.which, beatAt(e.clientX), d.held, e.shiftKey);
  };
  const up = () => {
    if (drag.current?.timer) window.clearTimeout(drag.current.timer);
    drag.current = null;
  };
  const bars: number[] = [];
  for (let b = Math.ceil(from / meter) * meter; b <= to + 1e-6; b += meter) bars.push(b);
  const beats: number[] = [];
  for (let b = Math.ceil(from); b <= to; b++) if (b % meter) beats.push(b);
  return (
    <svg
      ref={svg}
      className="enc-roll"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label ?? 'piano roll'}
      style={{ direction: 'ltr' }}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={(e) => onSel?.(beatAt(e.clientX))}
      data-roll-notes={notes.length}
    >
      <rect x={0} y={top} width={W} height={H - top - bottom} className="er-bg" rx={6} />
      {beats.map((b) => (
        <line key={`b${b}`} x1={x(b)} x2={x(b)} y1={top} y2={H - bottom} className="er-beat" />
      ))}
      {bars.map((b) => (
        <line key={`B${b}`} x1={x(b)} x2={x(b)} y1={top} y2={H - bottom} className="er-bar" />
      ))}
      {cands.map(([a, b], i) => (
        <rect key={`c${i}`} x={x(a)} y={top} width={Math.max(2, x(b) - x(a))} height={H - top - bottom} className="er-cand" data-cand={`${a}-${b}`} />
      ))}
      {sel && <rect x={x(sel[0])} y={top} width={Math.max(2, x(sel[1]) - x(sel[0]))} height={H - top - bottom} className="er-sel" data-sel={`${sel[0]}-${sel[1]}`} />}
      {notes.map((n, i) => (
        <rect
          key={i}
          x={x(n.beat)}
          y={y(n.midi) - Math.max(2.5, rowH * 0.45)}
          width={Math.max(3, x(n.beat + n.dur) - x(n.beat) - 1)}
          height={Math.max(5, rowH * 0.9)}
          rx={2.5}
          className={`er-note ${n.hand === 'L' ? 'lh' : ''} ${n.mark ?? ''} ${picked === i ? 'picked' : ''}`}
          style={{ opacity: n.mark === 'ghost' ? 0.35 : 0.55 + 0.45 * Math.min(1, (n.vel ?? 90) / 110) }}
          onClick={
            onNote
              ? (e) => {
                  e.stopPropagation();
                  onNote(i);
                }
              : undefined
          }
          data-note={i}
        />
      ))}
      {ticks.map((t, i) => (
        <path key={`t${i}`} d={`M${x(t)} ${H - bottom} l-3 5 h6 z`} className="er-tick" />
      ))}
      {chords?.map((c, i) =>
        i * meter >= from - 1e-6 && i * meter < to ? (
          <text key={`ch${i}`} x={x(i * meter) + 2} y={11} className="er-chord">
            {c}
          </text>
        ) : null,
      )}
      {barNums &&
        bars.slice(0, -1).map((b) => (
          <text key={`n${b}`} x={x(b) + 2} y={H - 2} className="er-num">
            {Math.round(b / meter) + 1}
          </text>
        ))}
      {playhead !== null && playhead !== undefined && playhead >= from && playhead <= to && <line x1={x(playhead)} x2={x(playhead)} y1={top - 2} y2={H - bottom} className="er-play" />}
      {magnet !== null && magnet >= from - 1e-6 && magnet <= to + 1e-6 && (
        <g className="er-magnet" data-magnet={magnet} aria-label={magnetLabel}>
          {(() => {
            const w = magnetLabel.length * 5.8 + 14;
            const mx = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x(magnet)));
            return (
              <>
                <rect x={mx - w / 2} y={top + 3} width={w} height={16} rx={8} className="er-magnet-b" />
                <text x={mx} y={top + 14.5} textAnchor="middle" className="er-magnet-t">
                  {magnetLabel}
                </text>
              </>
            );
          })()}
        </g>
      )}
      {sel && onHandle && (
        <>
          {(['from', 'to'] as const).map((w) => {
            const hx = x(w === 'from' ? sel[0] : sel[1]);
            return (
              <g key={w} className="er-handle" onPointerDown={down(w)} data-handle={w} role="slider" aria-label={w === 'from' ? 'start' : 'end'} aria-valuenow={w === 'from' ? sel[0] : sel[1]}>
                <rect x={hx - 22} y={top} width={44} height={H - top - bottom} className="er-hit" />
                <line x1={hx} x2={hx} y1={top} y2={H - bottom} className="er-hline" />
                <rect x={hx - 6} y={(H - top - bottom) / 2 + top - 14} width={12} height={28} rx={5} className="er-grip" />
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}
