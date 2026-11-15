// The result marks drawn over a VexFlow staff / tab (COURSE-FEEDBACK-UI §4.1): two signals per note, always in the same
// places. The head carries pitch — teal with an ink outline (right), pink with an ink ✕ and a ghost head at the note
// really played (wrong), a dashed hollow outline (missed). A tick beside it carries timing — tangerine on the left
// (early), purple on the right (late), longer the further off. Drawn as plain SVG over the engraved music (no redraw).

import { tickLen, type NoteMark } from '../engine/noteMarks';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number>, cls?: string): SVGElement => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (cls) e.setAttribute('class', cls);
  return e;
};

/** One marked item: its head (or tab digit) centre and half-width, in the SVG's own units. */
export interface MarkSpot {
  mark: Exclude<NoteMark, undefined>;
  x: number;
  y: number;
  /** Half the head width (staff) or of the digit box (tab). */
  hw: number;
  /** ms off the click (− early, + late) and the timing window, for the tick's length. */
  dev?: number | null;
  win?: number;
  /** Staff: the y of the note really played (wrong pitch) — a ghost head there. */
  ghostY?: number;
  /** Tab: the digit to redraw on its chip. */
  text?: string;
}

/**
 * The layer of marks over an SVG (replaces an older layer of the same name). `layer`: 'mk-layer' for the review's
 * marks, 'mk-live' for the marks drawn while the take runs (slice 5) — a separate layer, so the engraved music is never
 * redrawn per note.
 */
export function drawMarks(svg: SVGSVGElement | null, spots: MarkSpot[], kind: 'staff' | 'tab', layer: 'mk-layer' | 'mk-live' = 'mk-layer'): void {
  if (!svg) return;
  svg.querySelector(`g.${layer}`)?.remove();
  if (!spots.length) return;
  const g = el('g', { 'data-marks': spots.length }, layer);
  for (const s of spots) {
    const one = el('g', { 'data-mark': s.mark }, `mk ${s.mark}`);
    const rx = s.hw;
    const ry = kind === 'staff' ? s.hw * 0.74 : 6.2;
    if (kind === 'staff') {
      if (s.mark === 'wrong' && s.ghostY !== undefined && Math.abs(s.ghostY - s.y) > 1) one.appendChild(el('ellipse', { cx: s.x + rx * 2.1, cy: s.ghostY, rx: rx * 0.85, ry: ry * 0.85, transform: `rotate(-20 ${s.x + rx * 2.1} ${s.ghostY})` }, 'mk-ghost'));
      one.appendChild(el('ellipse', { cx: s.x, cy: s.y, rx, ry, transform: `rotate(-20 ${s.x} ${s.y})` }, 'mk-head'));
    } else {
      const w = Math.max(rx * 2, 13);
      one.appendChild(el('rect', { x: s.x - w / 2, y: s.y - ry, width: w, height: ry * 2, rx: 3.5 }, 'mk-head'));
      if (s.text !== undefined) {
        const t = el('text', { x: s.x, y: s.y + 3.6, 'text-anchor': 'middle' }, 'mk-digit');
        t.textContent = s.text;
        one.appendChild(t);
      }
    }
    if (s.mark === 'wrong') {
      const d = Math.min(rx, ry) * 0.9;
      const cx = kind === 'tab' ? s.x + Math.max(rx, 6.5) + 3 : s.x;
      const cy = kind === 'tab' ? s.y - ry : s.y;
      one.appendChild(el('path', { d: `M${cx - d} ${cy - d}L${cx + d} ${cy + d}M${cx + d} ${cy - d}L${cx - d} ${cy + d}` }, 'mk-x'));
    }
    if (s.mark === 'early' || s.mark === 'late') {
      const len = tickLen(s.dev ?? 0, s.win ?? 40);
      const edge = (kind === 'tab' ? Math.max(rx, 6.5) : rx) + 2;
      const x = s.mark === 'early' ? s.x - edge - len : s.x + edge;
      one.appendChild(el('rect', { x, y: s.y - 1.75, width: len, height: 3.5, rx: 1.2 }, `mk-tick ${s.mark}`));
    }
    g.appendChild(one);
  }
  svg.appendChild(g);
}
