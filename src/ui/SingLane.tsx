// The live singing view (docs/research/VOICE-FEEDBACK-UI.md §4): the pitch lane, the note readout, the zone meter
// and the steadiness bars. Time runs left → right in both languages; lemon only marks "now"; teal = dead centre (the
// stamp), hatched teal = off centre but inside the pass band (passes), tangerine ▲ / purple ▼ = outside the band
// (every colour has a shape or position twin). The pass band is the grader's own (zonePass = passCents).
// The lane draws from a SingFeed in one requestAnimationFrame loop; the read-outs sample it at ≤ 10 Hz.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chipLook, octaveFold, zonePasses, zoneState } from '../engine/pitchDisplay';
import { bestStretch, centreLine, liveVibrato, readCents, sliceSteadiness, vibratoOff, vibratoWave, type LiveVibrato, type NoteDetail, type VibratoGoal } from '../engine/vocalLive';
import type { MelodyNote } from '../engine/vocal';
import type { Settings } from '../storage/progress';
import { noteLabel } from './Vocal';
import { targetAt, type LaneTarget, type SingFeed } from './singFeed';
import { SING_TX } from '../content/singLaneText';
import '../singlane.css';
import { Icon } from './icons';

const G = 30; // gutter (note ruler)
const PAD = 8;

/** Re-render at `hz` while `on` (the read-outs: never once per frame). */
export function useTick(hz: number, on: boolean): number {
  const [n, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => set((x) => x + 1), 1000 / hz);
    return () => window.clearInterval(id);
  }, [hz, on]);
  return n;
}

/** "B♭4" → ["B♭", "4"]: the octave is drawn small. */
export function splitOctave(label: string): [string, string] {
  const m = /^(.*?)(-?\d+)$/.exec(label);
  return m ? [m[1], m[2]] : [label, ''];
}

/** SVG text has no isolates: left-to-right marks keep "מי♭4" in name, accidental, octave order. */
export const ltrLabel = (label: string) => '‎' + label.replace(/([♭♯𝄪𝄫]|\d+$)/gu, '‎$1');

/** A note name, LTR-isolated, accidentals in the music font, octave as a small digit. */
export function NoteName({ label, className }: { label: string; className?: string }) {
  const [name, oct] = splitOctave(label);
  const parts = name.split(/([♭♯𝄪𝄫])/).filter(Boolean);
  return (
    <bdi className={className} dir="ltr">
      {/* each part isolated, so a Hebrew syllable, its accidental and the octave keep their LTR order */}
      {parts.map((p, i) => (/[♭♯𝄪𝄫]/.test(p) ? <span key={i} className="acc">{p}</span> : <bdi key={i}>{p}</bdi>))}
      {oct && <sub>{oct}</sub>}
    </bdi>
  );
}

/** The tilted note head (the v2 motif) as an SVG group centred on 0,0. */
function Head({ r = 6, className }: { r?: number; className?: string }) {
  return <ellipse className={className} rx={r} ry={r * 0.72} transform="rotate(-22)" />;
}

export type LaneMode = 'hold' | 'melody' | 'song';

interface Run {
  ti: number;
  kind: 'in' | 'close';
  t0: number;
  t1: number;
}

export interface SingLaneProps {
  feed: SingFeed;
  targets: LaneTarget[];
  mode: LaneMode;
  /** Item length (s): the hold window. */
  seconds: number;
  /** The dead-centre tier (± cents): the stamp / bonus look only. */
  tol: number;
  /** The pass band (± cents), the grader's own (zonePass); a note inside it never shows as failing. */
  pass?: number;
  /** Drawing live (rAF) or frozen (the review: the whole take fits). */
  live: boolean;
  /** Blind / hidden task: only these target indexes are drawn until the review. */
  shownIdx?: number[] | null;
  settings: Settings;
  label: string;
  /** Beat (s) for the grid and the count-in ticks of timed takes. */
  beat?: number;
  countIn?: number;
  compact?: boolean;
  children?: ReactNode;
  /** Review: the graded notes (per-note chips) and the tap-a-note selection. */
  notes?: (MelodyNote | null)[] | null;
  selected?: number | null;
  onSelect?: (i: number | null) => void;
  /** Review playback: the take time under the playhead (s), or null when not playing. */
  playClock?: (() => number | null) | null;
  /** Blind take (later takes, fading support): blocks only as outlines while singing; the fill shows in review. */
  blind?: boolean;
  /** A take of 90 % or more: the review ends on a final barline with a fermata. */
  fermata?: boolean;
  /** Reduced motion: the lane pages instead of scrolling. */
  calm?: boolean;
}

export function SingLane({ feed, targets, mode, seconds, tol, pass = 50, live, shownIdx, settings, label, beat, countIn = 0, compact, notes, selected, onSelect, playClock, blind, fermata, calm }: SingLaneProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 320, h: 170 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) > 0.5 || Math.abs(s.h - r.height) > 0.5 ? { w: r.width, h: r.height } : s));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = size;
  const midis = targets.map((x) => x.midi);
  const range = settings.voiceRange;
  const [lo, hi] = useMemo(() => {
    // Live: the targets ± 3 semitones (≥ 7); the review zooms in on the take (± 1.5, ≥ 5).
    const padS = live ? 3 : 1.5;
    const minS = live ? 7 : 5;
    let a = Math.floor(Math.min(...midis) - padS);
    let b = Math.ceil(Math.max(...midis) + padS);
    if (b - a < minS) {
      const add = minS - (b - a);
      a -= Math.floor(add / 2);
      b += Math.ceil(add / 2);
    }
    return [a, b];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midis.join(), live]);
  const sh = (h - 2 * PAD) / (hi - lo);
  const y = (m: number) => PAD + (hi - m) * sh;
  const timed = targets.some((x) => x.start !== undefined);
  const laneW = Math.max(40, w - G);
  // Seconds → px, and the review's fitted window.
  const reviewFit = useMemo(() => {
    if (live) return null;
    const vs = feed.pts.filter((p) => p.m !== null);
    const starts = targets.filter((x) => x.start !== undefined).map((x) => x.start!);
    const ends = targets.filter((x) => x.start !== undefined).map((x) => x.start! + (x.dur ?? 0.5));
    const a = Math.min(starts.length ? Math.min(...starts) : Infinity, vs.length ? vs[0].t : Infinity);
    const b = Math.max(ends.length ? Math.max(...ends) : -Infinity, vs.length ? vs[vs.length - 1].t : -Infinity);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return { t0: 0, span: Math.max(2, seconds + 1) };
    // room on the right for the final barline and fermata of a strong take
    return { t0: a - 0.25, span: (b - a + 0.5) * (fermata ? 1.1 : 1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, feed.version, targets, fermata]);
  const span = reviewFit ? reviewFit.span : mode === 'hold' && !timed ? Math.max(3, seconds + 1.5) : 4;
  const pps = laneW / span;
  const shown = (i: number) => !shownIdx || shownIdx.includes(i);
  const endRoom = fermata && !live ? 22 : 0;

  // ---- dynamic layer (refs, rAF)
  const grp = useRef<SVGGElement>(null);
  const fillIn = useRef<SVGPathElement>(null);
  const fillClose = useRef<SVGPathElement>(null);
  const trInk = useRef<SVGPathElement>(null);
  const trUp = useRef<SVGPathElement>(null);
  const trDown = useRef<SVGPathElement>(null);
  const head = useRef<SVGGElement>(null);
  const tag = useRef<SVGTextElement>(null);
  const nowLine = useRef<SVGGElement>(null);
  const edgeUp = useRef<SVGGElement>(null);
  const edgeDown = useRef<SVGGElement>(null);
  const edgeUpT = useRef<SVGTextElement>(null);
  const edgeDownT = useRef<SVGTextElement>(null);
  const curStrip = useRef<SVGRectElement>(null);
  const centre = useRef<SVGPathElement>(null);
  const playhead = useRef<SVGGElement>(null);
  const ticks = useRef<SVGGElement>(null);
  const runs = useRef<{ n: number; list: Run[]; epoch: number }>({ n: 0, list: [], epoch: -1 });
  const t0Hold = useRef<{ epoch: number; t0: number } | null>(null);
  const stamps = useRef<{ epoch: number; done: Set<number> }>({ epoch: -1, done: new Set() });

  useEffect(() => {
    const centreM = (Math.min(...midis) + Math.max(...midis)) / 2;
    const draw = () => {
      const now = reviewFit ? reviewFit.t0 + reviewFit.span : feed.now();
      // The content transform: x(t) = tx + t · pps.
      let tx: number;
      if (reviewFit) tx = G - reviewFit.t0 * pps;
      else if ((timed || mode !== 'hold') && calm) {
        // Reduced motion: no scroll; the lane turns a page when the now-line nears its end.
        const page = span * 0.7;
        const t0 = Math.floor((now + 0.3) / page) * page - 0.3;
        tx = G - t0 * pps;
      } else if (timed || mode !== 'hold') tx = G + 0.3 * laneW - now * pps;
      else {
        // Holds: the lane stands still and the now-line travels (scrolls only past the window's end).
        let t0 = feed.onset !== null ? feed.onset - 0.4 : now - 0.4;
        if (t0Hold.current && t0Hold.current.epoch === feed.epoch && feed.onset !== null) t0 = t0Hold.current.t0;
        if (now - t0 > span * 0.92) t0 = now - span * 0.92;
        if (feed.onset !== null) t0Hold.current = { epoch: feed.epoch, t0 };
        tx = G - t0 * pps;
      }
      const nowX = reviewFit ? -100 : tx + now * pps;
      grp.current?.setAttribute('transform', `translate(${tx.toFixed(2)} 0)`);
      nowLine.current?.setAttribute('transform', `translate(${nowX.toFixed(2)} 0)`);
      // Fill runs (incremental).
      const pts = feed.pts;
      const R = runs.current;
      if (pts.length < R.n || R.epoch !== feed.epoch) {
        R.n = 0;
        R.list = [];
        R.epoch = feed.epoch;
      }
      for (; R.n < pts.length; R.n++) {
        const p = pts[R.n];
        if (p.m === null) continue;
        const tg = targetAt(targets, p.t, p.m);
        if (!tg) continue;
        const ti = targets.indexOf(tg);
        if (!shown(ti) && live) continue;
        if (tg.start !== undefined && (p.t < tg.start || p.t > tg.start + (tg.dur ?? 0.5))) continue;
        const c = (p.m + octaveFold(p.m, tg.midi) - tg.midi) * 100;
        const kind = Math.abs(c) <= tol ? 'in' : Math.abs(c) <= Math.max(pass, tol) ? 'close' : null;
        if (!kind) continue;
        const last = R.list[R.list.length - 1];
        if (last && last.ti === ti && last.kind === kind && p.t - last.t1 <= 0.09) last.t1 = p.t;
        else R.list.push({ ti, kind, t0: last && last.ti === ti && p.t - last.t1 <= 0.09 ? last.t1 : p.t - 0.02, t1: p.t });
      }
      // A note that ends mostly in the zone gets a stamp: its outline thickens for a moment, a small tick at its end.
      if (live && timed && box.current) {
        const st = stamps.current.epoch === feed.epoch ? stamps.current : (stamps.current = { epoch: feed.epoch, done: new Set<number>() });
        if (st.done.size === 0) box.current.querySelectorAll('.stamp, .sl-mark.on').forEach((el) => el.classList.remove('stamp', 'on'));
        targets.forEach((tg, i) => {
          if (tg.start === undefined || st.done.has(i) || now < tg.start + (tg.dur ?? 0.5)) return;
          st.done.add(i);
          const cover = R.list.filter((r) => r.ti === i && r.kind === 'in').reduce((a, r) => a + (r.t1 - Math.max(r.t0, tg.start!)), 0) / (tg.dur ?? 0.5);
          if (cover < 0.7) return;
          box.current!.querySelector(`[data-o="${i}"]`)?.classList.add('stamp');
          box.current!.querySelector(`[data-mk="${i}"]`)?.classList.add('on');
        });
      }
      const rect = (r: Run) => {
        const tg = targets[r.ti];
        const top = y(tg.midi + 0.5) + 1.5;
        const bot = y(tg.midi - 0.5) - 1.5;
        const x0 = tg.start !== undefined ? Math.max(r.t0, tg.start) * pps : r.t0 * pps;
        const x1 = r.t1 * pps;
        return `M${x0.toFixed(1)} ${top.toFixed(1)}H${x1.toFixed(1)}V${bot.toFixed(1)}H${x0.toFixed(1)}Z`;
      };
      fillIn.current?.setAttribute('d', R.list.filter((r) => r.kind === 'in').map(rect).join(''));
      fillClose.current?.setAttribute('d', R.list.filter((r) => r.kind === 'close').map(rect).join(''));
      // The trail: ink in the zone (or between notes), tangerine above, purple below; breaks on silence and off-lane.
      const from = reviewFit ? -Infinity : (G - tx) / pps - 0.5;
      const paths = { ink: [] as string[], up: [] as string[], down: [] as string[] };
      let pen: keyof typeof paths | null = null;
      let lastXY = '';
      let cur: { m: number; fold: number; t: number } | null = null;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.t < from) continue;
        if (p.m === null) {
          pen = null;
          cur = null;
          continue;
        }
        const tg = targetAt(targets, p.t, p.m);
        const ref = tg ? tg.midi : centreM;
        const fold = octaveFold(p.m, ref);
        const m = p.m + fold;
        cur = { m, fold, t: p.t };
        if (m > hi - 0.1 || m < lo + 0.1) {
          pen = null;
          continue;
        }
        const inBlock = tg && (tg.start === undefined || (p.t >= tg.start - 0.05 && p.t <= tg.start + (tg.dur ?? 0.5)));
        const c = tg ? (m - tg.midi) * 100 : 0;
        const col: keyof typeof paths = !inBlock || Math.abs(c) <= Math.max(pass, tol) || Math.abs(c) > 150 ? 'ink' : c > 0 ? 'up' : 'down';
        const xy = `${(p.t * pps).toFixed(1)} ${y(m).toFixed(1)}`;
        if (pen === col) paths[col].push(`L${xy}`);
        else {
          if (pen && lastXY) paths[pen].push(`L${xy}`);
          paths[col].push(`M${pen ? lastXY : xy}L${xy}`);
          pen = col;
        }
        lastXY = xy;
      }
      trInk.current?.setAttribute('d', paths.ink.join(''));
      trUp.current?.setAttribute('d', paths.up.join(''));
      trDown.current?.setAttribute('d', paths.down.join(''));
      // The head on the now-line, the octave tag, the edge chevrons.
      const fresh = !reviewFit && cur && now - cur.t < 0.2;
      const onLane = fresh && cur!.m <= hi - 0.1 && cur!.m >= lo + 0.1;
      if (head.current) {
        head.current.style.display = onLane ? '' : 'none';
        if (onLane) head.current.setAttribute('transform', `translate(${nowX.toFixed(1)} ${y(cur!.m).toFixed(1)})`);
      }
      if (tag.current) tag.current.textContent = onLane && cur!.fold ? (cur!.fold < 0 ? '8va' : '8vb') : '';
      const above = fresh && cur!.m > hi - 0.1;
      const below = fresh && cur!.m < lo + 0.1;
      if (edgeUp.current) {
        edgeUp.current.style.display = above ? '' : 'none';
        if (above) {
          edgeUp.current.setAttribute('transform', `translate(${nowX.toFixed(1)} 0)`);
          edgeUpT.current!.textContent = `+${Math.round(cur!.m - (lo + hi) / 2)}`;
        }
      }
      if (edgeDown.current) {
        edgeDown.current.style.display = below ? '' : 'none';
        if (below) {
          edgeDown.current.setAttribute('transform', `translate(${nowX.toFixed(1)} 0)`);
          edgeDownT.current!.textContent = `−${Math.round((lo + hi) / 2 - cur!.m)}`;
        }
      }
      // The current block's lemon top strip (now).
      if (curStrip.current) {
        const tg = live ? targetAt(targets, now, cur?.m ?? null) : null;
        const ti = tg ? targets.indexOf(tg) : -1;
        const on = tg && shown(ti) && (tg.start === undefined ? feed.onset !== null : now >= tg.start - 0.05 && now <= tg.start + (tg.dur ?? 0.5));
        curStrip.current.style.display = on ? '' : 'none';
        if (on && tg) {
          const x0 = tg.start !== undefined ? tx + tg.start * pps : G;
          const x1 = tg.start !== undefined ? tx + (tg.start + (tg.dur ?? 0.5)) * pps - 2 : w;
          curStrip.current.setAttribute('x', (x0 + 3).toFixed(1));
          curStrip.current.setAttribute('width', Math.max(0, x1 - x0 - 6).toFixed(1));
          curStrip.current.setAttribute('y', (y(tg.midi + 0.5) + 1.25).toFixed(1));
        }
      }
      // Count-in ticks fill lemon as the clock passes them.
      if (ticks.current) ticks.current.querySelectorAll('rect').forEach((r) => r.classList.toggle('on', now >= Number(r.dataset.t)));
      // Review: the vibrato centre (dashed) through the curve, and the playback playhead.
      if (centre.current) {
        if (reviewFit && mode !== 'song') {
          const cl = centreLine(pts.map((p) => ({ t: p.t, m: p.m === null ? null : p.m + octaveFold(p.m, (targetAt(targets, p.t, p.m) ?? { midi: centreM }).midi) })));
          let d = '';
          let down = false;
          for (const q of cl) {
            if (q.m === null || q.m > hi - 0.1 || q.m < lo + 0.1) {
              down = false;
              continue;
            }
            d += `${down ? 'L' : 'M'}${(q.t * pps).toFixed(1)} ${y(q.m).toFixed(1)}`;
            down = true;
          }
          centre.current.setAttribute('d', d);
        } else centre.current.setAttribute('d', '');
      }
      if (playhead.current) {
        const at = playClock ? playClock() : null;
        playhead.current.style.display = at === null ? 'none' : '';
        if (at !== null) playhead.current.setAttribute('transform', `translate(${(tx + at * pps).toFixed(1)} 0)`);
      }
    };
    draw();
    if (!live && !playClock) return;
    let id = 0;
    const loop = () => {
      draw();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, w, h, pps, lo, hi, targets, tol, pass, reviewFit, timed, mode, span, shownIdx?.join(), playClock]);

  // ---- static layer
  const rows: number[] = [];
  for (let m = lo; m <= hi; m++) rows.push(m);
  const named = new Set(midis.map((m) => Math.round(m)));
  // Ruler names never collide: top-down, a name is skipped when it would sit within 11 px of the last one.
  const labelled = new Set<number>();
  {
    let lastY = -Infinity;
    for (let m = hi; m >= lo; m--) {
      if (!named.has(m) && ((m % 12) + 12) % 12 !== 0) continue;
      if (y(m) - lastY < 11) continue;
      labelled.add(m);
      lastY = y(m);
    }
  }
  const zone = (m: number) => ({ y: y(m + tol / 100), h: Math.max(2, y(m - tol / 100) - y(m + tol / 100)) });
  const lastEnd = timed ? Math.max(...targets.map((x) => (x.start ?? 0) + (x.dur ?? 0.5))) : 0;
  const beats: number[] = [];
  if (beat && timed) for (let tb = 0; tb <= lastEnd + 1e-6; tb += beat) beats.push(tb);
  return (
    <figure className={`sing-lane${compact ? ' compact' : ''}${live ? ' is-live' : ' is-review'}${blind ? ' blind' : ''}`} aria-label={label} ref={box} dir="ltr">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <defs>
          <pattern id="sl-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" className="sl-hatch-bg" />
            <rect width="2.5" height="6" className="sl-hatch-ink" />
          </pattern>
          <clipPath id="sl-clip">
            <rect x={G} y="0" width={laneW} height={h} />
          </clipPath>
        </defs>
        {/* semitone rows */}
        {rows.map((m) => (
          <line key={m} x1={G} x2={w} y1={y(m - 0.5)} y2={y(m - 0.5)} className={`sl-row${((m % 12) + 12) % 12 === 0 ? ' c' : ''}`} />
        ))}
        {/* untimed targets: bands across the lane */}
        {targets.map((tg, i) =>
          tg.start === undefined && shown(i) ? (
            <g key={`b${i}`}>
              <rect x={G + 3} width={laneW - 6 - endRoom} y={y(tg.midi + 0.5) + 1} height={sh - 2} rx="6" className={`sl-block${tg.golden ? ' golden' : ''}`} />
              <rect x={G + 4} width={laneW - 8 - endRoom} {...zone(tg.midi)} className="sl-zone" />
            </g>
          ) : null,
        )}
        <g clipPath="url(#sl-clip)">
          <g ref={grp}>
            {beats.map((tb, k) => (
              <line key={`g${k}`} x1={tb * pps} x2={tb * pps} y1={0} y2={h} className="sl-beat" />
            ))}
            {targets.map((tg, i) =>
              tg.start !== undefined && shown(i) ? (
                <g key={`t${i}`}>
                  <rect x={tg.start * pps + 1} width={Math.max(4, (tg.dur ?? 0.5) * pps - 3)} y={y(tg.midi + 0.5) + 1} height={sh - 2} rx="6" className={`sl-block${tg.golden ? ' golden' : ''}`} />
                  <rect x={tg.start * pps + 2} width={Math.max(2, (tg.dur ?? 0.5) * pps - 5)} {...zone(tg.midi)} className="sl-zone" />
                </g>
              ) : null,
            )}
            <path ref={fillClose} className="sl-fill close" />
            <path ref={fillIn} className="sl-fill in" />
            {targets.map((tg, i) =>
              tg.start !== undefined && shown(i) ? (
                <g key={`o${i}`}>
                  <rect x={tg.start * pps + 1} width={Math.max(4, (tg.dur ?? 0.5) * pps - 3)} y={y(tg.midi + 0.5) + 1} height={sh - 2} rx="6" className={`sl-outline${selected === i ? ' sel' : ''}`} data-o={i} />
                  {live && (
                    <text data-mk={i} x={(tg.start + (tg.dur ?? 0.5)) * pps - 5} y={y(tg.midi + 0.5) - 3} textAnchor="end" className="sl-mark">
                      ✓
                    </text>
                  )}
                  {/* a money note: 2.5 px ink + 2 px gap + 1 px ink (a double outline, not gold) */}
                  {tg.golden && <rect x={tg.start * pps - 2.5} width={Math.max(4, (tg.dur ?? 0.5) * pps + 4)} y={y(tg.midi + 0.5) - 2.5} height={sh + 5} rx="8.5" className="sl-outline-2" />}
                </g>
              ) : null,
            )}
            {live && beat && countIn > 0 && (
              <g ref={ticks}>
                {Array.from({ length: countIn }, (_, k) => (
                  <rect key={k} data-t={-(countIn - k) * beat} x={-(countIn - k) * beat * pps - 5} y={PAD} width="10" height="10" rx="2" className="sl-tick" />
                ))}
              </g>
            )}
            <path ref={trInk} className="sl-trail" />
            <path ref={trUp} className="sl-trail up" />
            <path ref={trDown} className="sl-trail down" />
            <path ref={centre} className="sl-centre" />
            {!live &&
              notes &&
              targets.map((tg, i) => {
                const n = notes[i];
                if (tg.start === undefined || !n) return null;
                const cx = (tg.start + (tg.dur ?? 0.5) / 2) * pps;
                // dead centre = a tick (the stamp look); off centre the number, coloured pass (teal) or fail (▲ / ▼ side)
                const lk = chipLook(n.cents, tol, pass);
                const st = n.octave ? 'oct' : n.cents === null ? 'miss' : lk.tier === 'centre' ? 'in' : lk.tier === 'pass' ? 'ok' : n.cents > 0 ? 'sharp' : 'flat';
                const txt = st === 'oct' ? '8va' : st === 'miss' ? '–' : st === 'in' ? '✓' : lk.text!;
                const top = y(tg.midi + 0.5);
                const cy = top - 9 < 2 ? y(tg.midi - 0.5) + 9 : top - 9;
                const wChip = Math.max(20, txt.length * 6.5 + 8);
                return (
                  <g key={`c${i}`} className={`sl-chip ${st}`} transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`}>
                    <rect x={-wChip / 2} y="-7.5" width={wChip} height="15" rx="7.5" />
                    <text y="3.8" textAnchor="middle">{txt}</text>
                  </g>
                );
              })}
          </g>
        </g>
        {/* untimed blocks' outlines over their fill */}
        {targets.map((tg, i) => (tg.start === undefined && shown(i) ? <rect key={`uo${i}`} x={G + 3} width={laneW - 6 - endRoom} y={y(tg.midi + 0.5) + 1} height={sh - 2} rx="6" className={`sl-outline${tg.golden ? ' golden' : ''}`} /> : null))}
        <rect ref={curStrip} height="4" rx="2" className="sl-now-strip" style={{ display: 'none' }} />
        {/* gutter: the note ruler and the comfortable range */}
        <rect x="0" y="0" width={G - 2} height={h} className="sl-gutter" />
        {range && (
          <rect x={G - 7} width="4" y={y(Math.min(hi, range.high) + 0.5)} height={Math.max(0, y(Math.max(lo, range.low) - 0.5) - y(Math.min(hi, range.high) + 0.5))} className="sl-range" />
        )}
        {rows.map((m) =>
          labelled.has(m) ? (
            <text key={`n${m}`} x={G - 10} y={y(m) + 3.5} className={`sl-name${named.has(m) ? ' tg' : ''}`} textAnchor="end">
              {ltrLabel(noteLabel(m, settings))}
            </text>
          ) : (
            <line key={`k${m}`} x1={G - 12} x2={G - 9} y1={y(m)} y2={y(m)} className="sl-tickmark" />
          ),
        )}
        {!live && onSelect && timed && (
          <g className="sl-hits">
            {targets.map((tg, i) =>
              tg.start !== undefined ? (
                <rect
                  key={`h${i}`}
                  x={(reviewFit ? G - reviewFit.t0 * pps : 0) + tg.start * pps}
                  width={Math.max(10, (tg.dur ?? 0.5) * pps)}
                  y="0"
                  height={h}
                  className="sl-hit"
                  onClick={() => onSelect(selected === i ? null : i)}
                />
              ) : null,
            )}
          </g>
        )}
        {!live && fermata && (
          <g className="sl-final" transform={`translate(${w - 12} 0)`}>
            <line x1="-5" x2="-5" y1={h * 0.3} y2={h - 6} className="thin" />
            <line x1="0" x2="0" y1={h * 0.3} y2={h - 6} className="thick" />
            <text x="-3" y={h * 0.3 - 2} textAnchor="middle" className="fermata">
              𝄐
            </text>
          </g>
        )}
        {!live && (
          <g ref={playhead} className="sl-now sl-playhead" style={{ display: 'none' }}>
            <line x1="0" x2="0" y1="0" y2={h} className="edge" />
            <line x1="0" x2="0" y1="0" y2={h} className="core" />
          </g>
        )}
        {live && (
          <>
            <g ref={nowLine} className="sl-now">
              <line x1="0" x2="0" y1="0" y2={h} className="edge" />
              <line x1="0" x2="0" y1="0" y2={h} className="core" />
            </g>
            <g ref={head} className="sl-head" style={{ display: 'none' }}>
              <Head r={compact ? 5 : 7} />
              <text ref={tag} x="8" y="-8" className="sl-tag" />
            </g>
            <g ref={edgeUp} className="sl-edge" style={{ display: 'none' }}>
              <path d="M-7 13 L0 4 L7 13 Z" />
              <text ref={edgeUpT} x="10" y="14" />
            </g>
            <g ref={edgeDown} className="sl-edge" style={{ display: 'none' }}>
              <path d={`M-7 ${h - 13} L0 ${h - 4} L7 ${h - 13} Z`} />
              <text ref={edgeDownT} x="10" y={h - 6} />
            </g>
          </>
        )}
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------ note readout + cents chip (§4.4)

export function SingReadout({ feed, targets, tol, pass = 50, settings, live, lang, hideTarget }: { feed: SingFeed; targets: LaneTarget[]; tol: number; pass?: number; settings: Settings; live: boolean; lang: 'he' | 'en'; hideTarget?: boolean }) {
  useTick(8, live);
  const p = live ? feed.last() : null;
  const fresh = p && feed.now() - p.t < 0.25;
  const tg = targetAt(targets, feed.now(), p?.m ?? null);
  const sung = live ? feed.shown : null;
  const raw = fresh && tg ? (p!.m! + octaveFold(p!.m!, tg.midi) - tg.midi) * 100 : null;
  const cents = tg && raw !== null ? readCents(feed.track(tg.midi, feed.now() - 1.2), raw) : raw;
  const st = zoneState(cents, tol, pass);
  const sameNote = sung !== null && tg && Math.round(tg.midi) === sung;
  // Screen readers hear discrete events only: the note and whether it is in tune, at most once a second.
  const said = useRef<{ at: number; text: string }>({ at: 0, text: '' });
  if (live && sung !== null) {
    const text = `${noteLabel(sung, settings)}${st === 'in' ? `, ${SING_TX.centre[lang]}` : zonePasses(st) ? `, ${SING_TX.inZone[lang]}` : ''}`;
    const wall = typeof performance !== 'undefined' ? performance.now() : 0;
    if (text !== said.current.text && wall - said.current.at >= 1000) said.current = { at: wall, text };
  }
  return (
    <>
    <span className="sr-only" aria-live="polite">{live ? said.current.text : ''}</span>
    <div className="sing-readout" aria-hidden="true">
      <div className={`sr-note${sung === null ? ' silent' : ''}`}>{sung === null ? '–' : <NoteName label={noteLabel(sung, settings)} />}</div>
      {tg && !sameNote && !hideTarget && (
        <div className="sr-target">
          <Icon k="fwd" /> <NoteName label={noteLabel(Math.round(tg.midi), settings)} />
        </div>
      )}
      <CentsChip cents={cents} tol={tol} pass={pass} lang={lang} />
    </div>
    </>
  );
}

/** The cents chip: a tick at dead centre; off centre the number, teal when it passes, ▲ / ▼ colours when it fails. */
export function CentsChip({ cents, tol, pass, lang }: { cents: number | null; tol: number; pass: number; lang: 'he' | 'en' }) {
  const lk = chipLook(cents, tol, pass);
  if (lk.tier === 'none' || cents === null) return <span className="cents-chip idle" />;
  if (lk.tier === 'centre')
    return (
      <span className="cents-chip in" data-tier="centre" title={SING_TX.centre[lang]}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <ellipse cx="9" cy="15" rx="5" ry="3.6" transform="rotate(-22 9 15)" className="nh" />
          <path d="M11 13 L15 17 L22 6" className="ck" />
        </svg>
      </span>
    );
  const sharp = lk.side > 0;
  return (
    <span className={`cents-chip ${lk.tier === 'pass' ? 'ok' : sharp ? 'sharp' : 'flat'}`} dir="ltr" data-tier={lk.tier} title={lk.tier === 'pass' ? SING_TX.inZone[lang] : undefined}>
      <span className="mk">{sharp ? '▲' : '▼'}</span>
      {lk.text}
      <small>¢</small>
    </span>
  );
}

// ------------------------------------------------------------------ zone meter (§4.5)

/** Non-linear: ±50 ¢ fills the middle 70 %, ±50–150 ¢ the outer 30 % (wild misses never leave the bar). */
export const meterPos = (c: number) => {
  const a = Math.abs(c);
  const d = a <= 50 ? (a / 50) * 35 : 35 + Math.min(1, (a - 50) / 100) * 15;
  return 50 + Math.sign(c) * d;
};

/** The zone meter: the pass band (`pass`, default = `tol`: the voice games' own window) with the dead centre inside it. */
export function ZoneMeter({ cents, tol, pass = tol }: { cents: number | null; tol: number; pass?: number }) {
  const band = Math.max(pass, tol);
  const st = zoneState(cents, tol, band);
  // the side tint only when the note fails (outside the band); inside the band it passes, so no warning colour
  const side = st === 'sharp' ? 'sharp' : st === 'flat' ? 'flat' : '';
  return (
    <div className={`zone-meter ${st === 'in' ? 'in' : zonePasses(st) ? 'ok' : ''}${band > tol ? ' banded' : ''} ${side}`} dir="ltr" aria-hidden="true">
      <span className="zm-g flat-g">♭</span>
      <span className="zm-track">
        <span className="zm-tint" />
        <span className="zm-zone" style={{ left: `${meterPos(-band)}%`, width: `${meterPos(band) - meterPos(-band)}%` }} />
        {band > tol && <span className="zm-centre" style={{ left: `${meterPos(-tol)}%`, width: `${meterPos(tol) - meterPos(-tol)}%` }} />}
        <span className="zm-mid" />
        {cents !== null && (
          <span className="zm-needle" style={{ left: `${meterPos(cents)}%` }}>
            <svg viewBox="-9 -9 18 18" width="18" height="18">
              <Head r={6.5} />
            </svg>
          </span>
        )}
      </span>
      <span className="zm-g sharp-g">♯</span>
    </div>
  );
}

// ------------------------------------------------------------------ steadiness bars (§4.7)

export function SustainBars({ levels, cur, seconds, sung, best, lang }: { levels: number[]; cur: number; seconds: number; sung: number; best?: number; lang: 'he' | 'en' }) {
  return (
    <div className="sustain-bars" aria-hidden="true">
      <span className="sb-bars">
        {levels.map((l, k) => (
          <span key={k} className={`sb l${l}${k === cur ? ' now' : ''}`} />
        ))}
      </span>
      <small className="sb-label" dir="ltr">
        {/* review: the longest steady stretch; live: time so far */}
        {best !== undefined ? `${SING_TX.best[lang]} ${best.toFixed(1)} s` : `${Math.min(sung, seconds).toFixed(1)} / ${seconds} s`}
      </small>
    </div>
  );
}

/** The live meter row: the zone meter (and, for holds, the steadiness bars) sampled at 10 Hz. */
export function SingMeters({ feed, targets, tol, pass = 50, seconds, live, bars, meter, lang, vib, cue, frozenVib }: { feed: SingFeed; targets: LaneTarget[]; tol: number; pass?: number; seconds: number; live: boolean; bars: boolean; meter: boolean; lang: 'he' | 'en'; vib?: VibratoGoal | false | null; cue?: string | null; frozenVib?: (LiveVibrato & { note?: string }) | null }) {
  const tick = useTick(8, live);
  const p = live ? feed.last() : null;
  const now = feed.now();
  const fresh = p && now - p.t < 0.25;
  const tg = targetAt(targets, now, p?.m ?? null);
  const raw = fresh && tg ? (p!.m! + octaveFold(p!.m!, tg.midi) - tg.midi) * 100 : null;
  const cents = tg && raw !== null ? readCents(feed.track(tg.midi, now - 1.2), raw) : raw;
  // The vibrato chip updates at 4 Hz (every second tick of the 8 Hz meters).
  const vibRef = useRef<LiveVibrato>({ state: 'none', rate: 0, extent: 0 });
  if (vib !== false && vib !== undefined && live && tg && tick % 2 === 0) vibRef.current = liveVibrato(feed.track(tg.midi, now - 1.2), 0.9);
  let barsEl: ReactNode = null;
  if (bars && tg) {
    const slice = Math.max(0.25, seconds / 40);
    const n = Math.max(4, Math.round(seconds / slice));
    const on = feed.onset;
    const levels = on === null ? new Array(n).fill(0) : sliceSteadiness(feed.track(tg.midi), on, n, slice);
    const sung = on === null ? 0 : (live ? now : (feed.pts[feed.pts.length - 1]?.t ?? on)) - on;
    const cur = live && on !== null ? Math.min(n - 1, Math.floor(sung / slice)) : -1;
    barsEl = <SustainBars levels={levels} cur={cur} seconds={seconds} sung={Math.max(0, sung)} best={live ? undefined : bestStretch(levels, slice)} lang={lang} />;
  }
  const chip = vib === false || vib === undefined ? null : <VibratoChip v={live ? vibRef.current : frozenVib ?? { state: 'none', rate: 0, extent: 0 }} goal={vib} cue={cue ?? null} lang={lang} note={live ? undefined : frozenVib?.note} />;
  return (
    <div className="sing-meters">
      {meter && <ZoneMeter cents={cents} tol={tol} pass={pass} />}
      {chip ? (
        <div className="sm-row">
          {barsEl ?? <span className="sm-fill" />}
          {chip}
        </div>
      ) : (
        barsEl
      )}
    </div>
  );
}

// ------------------------------------------------------------------ the vibrato chip (§4.6)

/** A 1 s box drawing the measured vibrato (cycles = rate, height = width), the goal as a dashed ghost behind it. */
export function VibratoChip({ v, goal, cue, lang, note }: { v: LiveVibrato; goal: VibratoGoal | null; cue: string | null; lang: 'he' | 'en'; note?: string }) {
  const W = 84;
  const H = 26;
  const ghost = goal ? vibratoWave((goal.rate[0] + goal.rate[1]) / 2, (goal.extent[0] + goal.extent[1]) / 2, W, H) : null;
  const on = v.state === 'vibrato' || v.state === 'unsteady';
  const off = on && goal ? vibratoOff(v, goal) : null;
  const inBand = !!off && off.rate === 0 && off.extent === 0;
  const wave = on ? vibratoWave(v.rate, v.extent, W, H, v.state === 'unsteady') : `M0 ${H / 2}H${W}`;
  const mk = (x: -1 | 0 | 1) => (x > 0 ? '▲' : x < 0 ? '▼' : '');
  return (
    <span key={cue ?? ''} className={`vib-chip ${v.state}${inBand ? ' in' : ''}${cue ? ' flash' : ''}`} aria-hidden="true" data-vib={v.state}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {ghost && <path d={ghost} className="vc-ghost" />}
        <path d={wave} className="vc-wave" />
      </svg>
      <small dir="ltr">
        {on ? (
          <>
            <span className={off?.rate ? (off.rate > 0 ? 'hi' : 'lo') : ''}>
              {mk(off?.rate ?? 0)}
              {v.rate.toFixed(1)} Hz
            </span>{' '}
            <span className={off?.extent ? (off.extent > 0 ? 'hi' : 'lo') : ''}>
              {mk(off?.extent ?? 0)}±{v.extent}¢
            </span>
          </>
        ) : v.state === 'straight' ? (
          SING_TX.straight[lang]
        ) : (
          '–'
        )}
      </small>
      {note && <small className="vc-note">{note}</small>}
    </span>
  );
}

// ------------------------------------------------------------------ the review's tap-a-note detail (§4.13)

export function NoteDetailRow({ label, d, golden, tol, pass = 50, lang, onClose }: { label: string; d: NoteDetail; golden: boolean; tol: number; pass?: number; lang: 'he' | 'en'; onClose: () => void }) {
  const items: [string, string][] = [];
  if (d.settleMs !== null) items.push([SING_TX.settle[lang], `${d.settleMs} ms`]);
  if (d.overshoot > 10) items.push(['↗', `${d.overshoot} ¢`]);
  if (d.onsetMs !== null && Math.abs(d.onsetMs) > 60) items.push([d.onsetMs > 0 ? SING_TX.late[lang] : SING_TX.early[lang], `${Math.abs(d.onsetMs)} ms`]);
  if (golden && d.wobble !== null) items.push([SING_TX.steady[lang], `±${d.wobble} ¢`]);
  if (golden && d.vibrato) items.push([SING_TX[d.vibrato.state === 'vibrato' ? 'vibrato' : d.vibrato.state === 'unsteady' ? 'unsteady' : 'straight'][lang], d.vibrato.state === 'straight' ? '' : `${d.vibrato.rate.toFixed(1)} Hz ±${d.vibrato.extent} ¢`]);
  return (
    <div className="note-detail" role="group" aria-label={label}>
      <NoteName label={label} className="nd-name" />
      {d.octave ? <span className="cents-chip flat">8va</span> : d.cents === null ? <span className="nd-miss">{SING_TX.missed[lang]}</span> : <CentsChip cents={d.cents} tol={tol} pass={pass} lang={lang} />}
      <span className="nd-items">
        {items.map(([k, v]) => (
          <span key={k}>
            {k} <b dir="ltr">{v}</b>
          </span>
        ))}
      </span>
      <button className="icon-btn nd-close" onClick={onClose} aria-label="×">
        ×
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ songs: the small note chip and the phrase strip (§4.14)

/** Songs: the sung note as a small chip in the lane's corner (no hero, no meter: the block fill does the job). */
export function LaneNote({ feed, live, settings }: { feed: SingFeed; live: boolean; settings: Settings }) {
  useTick(8, live);
  if (!live || feed.shown === null) return null;
  return (
    <span className="lane-note" aria-hidden="true">
      <NoteName label={noteLabel(feed.shown, settings)} />
    </span>
  );
}

/**
 * The phrase strip above the lane: one segment per phrase, the current one underlined lemon (now); after the take
 * each fills by its score (teal = met, hatched = close, outline = weak). Words, when a song has them, read in their
 * own direction here, never on the LTR timeline.
 */
export function PhraseStrip({ phrases, feed, live, scores, need, label }: { phrases: { i: number; start: number; end: number; words?: string }[]; feed: SingFeed; live: boolean; scores?: number[] | null; need: number; label: (n: number) => string }) {
  useTick(6, live);
  const now = live ? feed.now() : -Infinity;
  const total = phrases.reduce((a, p) => a + Math.max(0.1, p.end - p.start), 0);
  return (
    <ol className="phrase-strip" aria-hidden={live ? 'true' : undefined}>
      {phrases.map((p, k) => {
        const sc = scores?.[k];
        const cls = sc === undefined || sc === null ? '' : sc >= need ? ' good' : sc >= need - 0.2 ? ' fair' : ' weak';
        const on = now >= p.start - 0.1 && now < p.end;
        return (
          <li key={p.i} className={`ps${cls}${on ? ' now' : ''}`} style={{ flexGrow: Math.max(0.1, p.end - p.start) / total }}>
            <span>{p.words ?? (sc !== undefined && sc !== null ? String(p.i + 1) : label(p.i + 1))}</span>
            {sc !== undefined && sc !== null && <b dir="ltr">{Math.round(sc * 100)}%</b>}
          </li>
        );
      })}
    </ol>
  );
}
