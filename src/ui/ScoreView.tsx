// Score view (0.49, PLAN §2.1): a piece as real notation — grand staff, bar lines, key and time signatures, systems
// that wrap to the screen, ties, rests — with a moving cursor and a highlighted bar, colour marks per note after a take,
// and a callback for tapping a bar. Drawn with VexFlow (already in the app); the layout comes from engine/piece/layout.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Piece } from '../engine/piece/score';
import { layoutPiece, VF_DUR, type LayoutBar, type LayoutEv } from '../engine/piece/layout';
import { spellMidi } from '../engine/aids';
import type { PitchClass } from '../engine/pitch';
import type { NoteMark } from '../engine/noteMarks';
import { headX } from './NoteViews';

type VF = typeof import('vexflow/bravura');
let vfPromise: Promise<VF> | null = null;
const loadVF = () => (vfPromise ??= import('vexflow/bravura'));

const FIFTHS_KEY = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const keyPcOf = (fifths: number): PitchClass => {
  const k = FIFTHS_KEY[Math.max(0, Math.min(14, fifths + 7))];
  return { letter: k[0] as PitchClass['letter'], acc: (k[1] === 'b' ? -1 : k[1] === '#' ? 1 : 0) as PitchClass['acc'] };
};
const MARK: Record<Exclude<NoteMark, undefined>, string> = { ok: '#1f8f67', timing: '#b8861b', wrong: '#d43c2c', missed: '#d43c2c' };

export interface ScoreGeometry {
  /** Per bar: x (0..1 of the width) and y top / bottom (px in the rendered SVG coordinate space) of its system. */
  bars: { x0: number; x1: number; y0: number; y1: number; sys: number; /** Notehead centres by onset (quarter beats in the bar, 0..1 of the width): the cursor glides between them. */ anchors?: { at: number; x: number }[] }[];
  width: number;
  height: number;
}

export function ScoreView({
  piece,
  from = 0,
  to,
  cursorBeat,
  activeBar,
  rangeFrom,
  rangeTo,
  marks,
  onBar,
  barsPerLine,
}: {
  piece: Piece;
  /** Bars shown (default all). */
  from?: number;
  to?: number;
  /** Cursor position in quarter beats from the start of bar `from` (null = no cursor). */
  cursorBeat?: number | null;
  /** The bar to highlight (piece bar index). */
  activeBar?: number | null;
  /** A practised range to tint. */
  rangeFrom?: number;
  rangeTo?: number;
  /** Colour per Piece.notes index after a take. */
  marks?: Map<number, NoteMark>;
  onBar?: (bar: number) => void;
  barsPerLine?: number;
}) {
  const layout = useMemo(() => layoutPiece(piece), [piece]);
  const last = Math.min(layout.length - 1, to ?? layout.length - 1);
  const bars = layout.slice(from, last + 1);
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<ScoreGeometry | null>(null);
  const [failed, setFailed] = useState(false);
  const perLine = barsPerLine ?? (typeof window !== 'undefined' && window.innerWidth < 560 ? 2 : 4);
  const markKey = marks ? [...marks.entries()].map(([k, v]) => `${k}${v}`).join(',') : '';

  useEffect(() => {
    let cancelled = false;
    void loadVF()
      .then((VF) => {
        const el = ref.current;
        if (cancelled || !el) return;
        el.innerHTML = '';
        setGeo(drawScore(VF, el, piece, bars, perLine, marks));
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece, from, last, perLine, markKey]);

  // cursor position (percent of the drawn width / height)
  const cur = (() => {
    if (!geo || cursorBeat === null || cursorBeat === undefined) return null;
    let b = cursorBeat;
    for (let i = 0; i < bars.length; i++) {
      if (b < bars[i].beats || i === bars.length - 1) {
        const g = geo.bars[i];
        // 0.85 (owner: the cursor sat off the notes): notes are not spaced by time, so the cursor runs from notehead to
        // notehead, each stretch in its note's own time — not at one speed across the bar.
        const an = [...(g.anchors?.length ? g.anchors : [{ at: 0, x: g.x0 }]), { at: bars[i].beats, x: g.x1 }];
        let left = g.x0;
        for (let k = 0; k < an.length - 1; k++) {
          if (b >= an[k].at - 1e-6 || k === 0) {
            const span = an[k + 1].at - an[k].at;
            left = an[k].x + (an[k + 1].x - an[k].x) * (span > 1e-6 ? Math.max(0, Math.min(1, (b - an[k].at) / span)) : 0);
          }
        }
        return { left: left * 100, top: (g.y0 / geo.height) * 100, h: ((g.y1 - g.y0) / geo.height) * 100, sys: g.sys };
      }
      b -= bars[i].beats;
    }
    return null;
  })();
  // keep the cursor's system in view
  const sysRef = useRef(-1);
  useEffect(() => {
    if (!cur || !wrap.current || cur.sys === sysRef.current) return;
    sysRef.current = cur.sys;
    const box = wrap.current;
    const y = (cur.top / 100) * box.scrollHeight;
    box.scrollTo({ top: Math.max(0, y - 8), behavior: 'smooth' });
  }, [cur]);

  return (
    <div className="score-view" ref={wrap} data-score="1">
      <div className="score-inner">
        <div ref={ref} />
        {geo &&
          bars.map((b, i) => {
            const g = geo.bars[i];
            const pi = from + i;
            const inRange = rangeFrom !== undefined && rangeTo !== undefined && pi >= rangeFrom && pi <= rangeTo;
            return (
              <button
                key={pi}
                className={`score-bar ${activeBar === pi ? 'now' : ''} ${inRange ? 'range' : ''}`}
                style={{ left: `${g.x0 * 100}%`, width: `${(g.x1 - g.x0) * 100}%`, top: `${(g.y0 / geo.height) * 100}%`, height: `${((g.y1 - g.y0) / geo.height) * 100}%` }}
                onClick={() => onBar?.(pi)}
                aria-label={`bar ${b.number}`}
                data-score-bar={pi}
                tabIndex={onBar ? 0 : -1}
              />
            );
          })}
        {cur && <span className="score-cursor" style={{ left: `${cur.left}%`, top: `${cur.top}%`, height: `${cur.h}%` }} aria-hidden="true" />}
      </div>
      {failed && <p className="staff-fallback">{piece.title}</p>}
    </div>
  );
}

function drawScore(VF: VF, el: HTMLDivElement, piece: Piece, bars: LayoutBar[], perLine: number, marks?: Map<number, NoteMark>): ScoreGeometry {
  const keyPc = keyPcOf(piece.fifths);
  const keySpec = FIFTHS_KEY[Math.max(0, Math.min(14, piece.fifths + 7))];
  const hasL = bars.some((b) => b.hands.L.some((e) => e.midis.length));
  const W = 900;
  const sysH = hasL ? 230 : 130;
  const lines = Math.ceil(bars.length / perLine);
  const H = lines * sysH + 20;
  const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
  renderer.resize(W, H);
  const ctx = renderer.getContext();
  const geo: ScoreGeometry = { bars: [], width: W, height: H };
  const vfKey = (m: number) => {
    const s = spellMidi(m, keyPc);
    return `${s.letter.toLowerCase()}${s.acc === -1 ? 'b' : s.acc === 1 ? '#' : ''}/${s.octave}`;
  };
  const ties: { a: InstanceType<VF['StaveNote']>; b: InstanceType<VF['StaveNote']> | null }[] = [];
  let pendingTie: Record<'R' | 'L', InstanceType<VF['StaveNote']> | null> = { R: null, L: null };
  for (let li = 0; li < lines; li++) {
    const row = bars.slice(li * perLine, li * perLine + perLine);
    const y = 10 + li * sysH;
    const firstExtra = 70; // clef + key + time on the first bar of a system
    const avail = W - 20 - firstExtra;
    const totalBeats = row.reduce((a, b) => a + b.beats, 0);
    let x = 10;
    row.forEach((b, k) => {
      const w = (avail * b.beats) / totalBeats + (k === 0 ? firstExtra : 0);
      const top = new VF.Stave(x, y, w);
      const bot = hasL ? new VF.Stave(x, y + 100, w) : null;
      if (k === 0) {
        top.addClef('treble').addKeySignature(keySpec);
        bot?.addClef('bass').addKeySignature(keySpec);
        const prev = bars[li * perLine - 1];
        if (!prev || prev.sig.join() !== b.sig.join() || li === 0) {
          top.addTimeSignature(`${b.sig[0]}/${b.sig[1]}`);
          bot?.addTimeSignature(`${b.sig[0]}/${b.sig[1]}`);
        }
      }
      top.setContext(ctx).draw();
      bot?.setContext(ctx).draw();
      if (k === 0 && bot) {
        new VF.StaveConnector(top, bot).setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw();
        new VF.StaveConnector(top, bot).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
      }
      if (bot) new VF.StaveConnector(top, bot).setType(VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
      const voices: InstanceType<VF['Voice']>[] = [];
      const make = (evs: LayoutEv[], clef: 'treble' | 'bass', hand: 'R' | 'L') => {
        const notes = evs.map((e) => {
          const vd = VF_DUR[e.dur] ?? { d: 'q', dots: 0 };
          const rest = !e.midis.length;
          const sn = new VF.StaveNote({ keys: rest ? [clef === 'bass' ? 'd/3' : 'b/4'] : e.midis.map(vfKey), duration: `${vd.d}${rest ? 'r' : ''}`, clef });
          if (vd.dots) VF.Dot.buildAndAttach([sn], { all: true });
          if (!rest) {
            const mk = e.refs.map((r) => marks?.get(r)).find(Boolean);
            if (mk) sn.setStyle({ fillStyle: MARK[mk], strokeStyle: MARK[mk] });
            if (pendingTie[hand] && e.cont) ties.push({ a: pendingTie[hand]!, b: sn });
            pendingTie[hand] = e.tie ? sn : null;
          }
          return sn;
        });
        const v = new VF.Voice({ num_beats: Math.max(1, Math.round(b.beats * 4)), beat_value: 16 }).setMode(VF.Voice.Mode.SOFT);
        v.addTickables(notes);
        VF.Accidental.applyAccidentals([v], keySpec);
        return { v, notes };
      };
      const t = make(b.hands.R, 'treble', 'R');
      voices.push(t.v);
      const bv = bot ? make(b.hands.L, 'bass', 'L') : null;
      if (bv) voices.push(bv.v);
      const fmt = new VF.Formatter();
      fmt.joinVoices([t.v]);
      if (bv) fmt.joinVoices([bv.v]);
      fmt.format(voices, Math.max(40, w - (k === 0 ? firstExtra + 20 : 24)));
      t.v.draw(ctx, top);
      VF.Beam.generateBeams(t.notes.filter((n) => !n.isRest())).forEach((bm) => bm.setContext(ctx).draw());
      if (bv && bot) {
        bv.v.draw(ctx, bot);
        VF.Beam.generateBeams(bv.notes.filter((n) => !n.isRest())).forEach((bm) => bm.setContext(ctx).draw());
      }
      const noteX0 = top.getNoteStartX();
      const byAt = new Map<number, number>();
      const put = (evs: LayoutEv[], ns: InstanceType<VF['StaveNote']>[]) => evs.forEach((e, j) => ns[j] && !byAt.has(e.at) && byAt.set(e.at, headX(ns[j]) / W));
      put(b.hands.R, t.notes);
      if (bv) put(b.hands.L, bv.notes);
      const anchors = [...byAt.entries()].map(([at, xx]) => ({ at, x: xx })).sort((p, q) => p.at - q.at);
      geo.bars.push({ x0: noteX0 / W, x1: (x + w) / W, y0: y, y1: y + (bot ? 200 : 100), sys: li, anchors });
      x += w;
    });
  }
  for (const tie of ties) {
    try {
      new VF.StaveTie({ first_note: tie.a, last_note: tie.b, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
    } catch {
      /* a tie across systems can fail to draw — skip it */
    }
  }
  pendingTie = { R: null, L: null };
  const svg = el.querySelector('svg');
  if (svg) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.removeAttribute('height');
    svg.removeAttribute('style'); // VexFlow sets a fixed pixel size; let the viewBox scale it
    svg.setAttribute('aria-hidden', 'true');
  }
  return geo;
}
