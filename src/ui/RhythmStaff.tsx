// One-line rhythm notation rendered with VexFlow (MIT), loaded lazily so the main bundle stays small.
// Spec G.9: established notation library, readable at phone width, high contrast, text alternative.

import { useEffect, useRef, useState } from 'react';
import { CELLS, type CellId, type Rhythm } from '../engine/rhythm';

type VF = typeof import('vexflow/bravura');
let vfPromise: Promise<VF> | null = null;
const loadVF = () => (vfPromise ??= import('vexflow/bravura'));

/** VexFlow durations for each cell (notes on the middle line; rests as such). */
const CELL_NOTES: Record<CellId, { d: string; dot?: boolean; rest?: boolean }[]> = {
  q: [{ d: 'q' }],
  qr: [{ d: 'q', rest: true }],
  h: [{ d: 'h' }],
  w: [{ d: 'w' }],
  ee: [{ d: '8' }, { d: '8' }],
  dqe: [{ d: 'q', dot: true }, { d: '8' }],
};

export function RhythmStaff({ rhythm, label, height = 96, compact = false }: { rhythm: Rhythm; label: string; height?: number; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const key = rhythm.cells.join('.');

  useEffect(() => {
    let cancelled = false;
    void loadVF()
      .then((VF) => {
        const el = ref.current;
        if (cancelled || !el) return;
        el.innerHTML = '';
        // Split cells into bars of four beats.
        const bars: CellId[][] = [[]];
        let beats = 0;
        for (const c of rhythm.cells) {
          if (beats === 4) {
            bars.push([]);
            beats = 0;
          }
          bars[bars.length - 1].push(c);
          beats += CELLS[c].beats;
        }
        const firstExtra = compact ? 30 : 70;
        const barW = compact ? 150 : 190;
        const width = firstExtra + barW * bars.length + 10;
        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(width, height);
        const ctx = renderer.getContext();
        let x = 5;
        bars.forEach((bar, bi) => {
          const w = barW + (bi === 0 ? firstExtra : 0);
          const stave = new VF.Stave(x, compact ? -10 : 0, w);
          if (bi === 0) {
            if (!compact) stave.addClef('percussion');
            stave.addTimeSignature('4/4');
          }
          stave.setContext(ctx).draw();
          const notes = bar.flatMap((c) =>
            CELL_NOTES[c].map((n) => {
              const sn = new VF.StaveNote({ keys: ['b/4'], duration: `${n.d}${n.rest ? 'r' : ''}${n.dot ? 'd' : ''}` });
              if (n.dot) VF.Dot.buildAndAttach([sn], { all: true });
              return sn;
            }),
          );
          const beams = VF.Beam.generateBeams(notes.filter((n) => !n.isRest()));
          VF.Formatter.FormatAndDraw(ctx, stave, notes);
          beams.forEach((b) => b.setContext(ctx).draw());
          x += w;
        });
        const svg = el.querySelector('svg');
        if (svg) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          svg.setAttribute('aria-hidden', 'true');
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [key, rhythm.cells, height, compact]);

  return (
    <div className={`rhythm-staff ${compact ? 'compact' : ''}`} role="img" aria-label={label}>
      <div ref={ref} />
      {failed && <p className="staff-fallback">{label}</p>}
    </div>
  );
}
