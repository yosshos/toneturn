// One-line rhythm notation rendered with VexFlow (MIT), loaded lazily so the main bundle stays small.
// Spec G.9: established notation library, readable at phone width, high contrast, text alternative.

import { useEffect, useRef, useState } from 'react';
import { barBeats, CELLS, meterOf, type CellId, type Rhythm } from '../engine/rhythm';
import { glidePos, headX, nowX, Playhead } from './NoteViews';

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
  ssss: [{ d: '16' }, { d: '16' }, { d: '16' }, { d: '16' }],
  es: [{ d: '8' }, { d: '16' }, { d: '16' }],
  se: [{ d: '16' }, { d: '16' }, { d: '8' }],
  syn: [{ d: '8' }, { d: 'q' }, { d: '8' }],
  ere: [{ d: '8', rest: true }, { d: '8' }],
  trip: [{ d: '8' }, { d: '8' }, { d: '8' }],
  dh: [{ d: 'h', dot: true }],
  dq: [{ d: 'q', dot: true }],
  qe: [{ d: 'q' }, { d: '8' }],
  eq: [{ d: '8' }, { d: 'q' }],
  eee: [{ d: '8' }, { d: '8' }, { d: '8' }],
  dqr: [{ d: 'q', rest: true, dot: true }],
  qtrip: [{ d: 'q' }, { d: 'q' }, { d: 'q' }],
};

const beamable = (d: string) => d === '8' || d === '16';
const RAW: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };

/** Every drawn note's (and rest's) start, in beats from the rhythm's start — the order the staff draws them. */
export function rhythmNoteStarts(rhythm: Rhythm): number[] {
  const out: number[] = [];
  let at = 0;
  for (const c of rhythm.cells) {
    const ns = CELL_NOTES[c];
    const raws = ns.map((n) => RAW[n.d] * (n.dot ? 1.5 : 1));
    const sum = raws.reduce((a, b) => a + b, 0);
    let acc = 0;
    raws.forEach((r) => {
      out.push(at + (acc / sum) * CELLS[c].beats);
      acc += r;
    });
    at += CELLS[c].beats;
  }
  return out;
}

/** The due note of a running read (index into rhythmNoteStarts, −1 before / none), from the response start. */
export function useRhythmNow(rhythm: Rhythm, bpm: number, startPerf: number | null | undefined, live: boolean): number {
  const [now, setNow] = useState(-1);
  useEffect(() => {
    if (!live || !startPerf) {
      setNow(-1);
      return;
    }
    // Swung eighths sound on the triplet's last third (they are written straight): the line follows the sound.
    const starts = rhythmNoteStarts(rhythm).map((x) => (rhythm.swing && Math.abs((x % 1) - 0.5) < 1e-6 ? x + 1 / 6 : x));
    const total = rhythm.cells.reduce((a, c) => a + CELLS[c].beats, 0);
    const id = window.setInterval(() => {
      const b = ((performance.now() - startPerf) / 1000) * (bpm / 60);
      // Fractional: the playhead glides through each note in its own time (glidePos).
      setNow(b < total + 0.25 ? glidePos(starts, total, b) : -1);
    }, 30);
    return () => window.clearInterval(id);
  }, [rhythm, bpm, startPerf, live]);
  return now;
}

export function RhythmStaff({ rhythm, label, height = 96, compact = false, bare = false, now = -1 }: { rhythm: Rhythm; label: string; height?: number; compact?: boolean; bare?: boolean; /** The due note of a running read (−1 none): a now-cue column behind it. */ now?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [xs, setXs] = useState<number[]>([]);
  const meter = meterOf(rhythm);
  const key = `${meter}|${rhythm.swing ? 'sw' : ''}|${rhythm.cells.join('.')}`;

  useEffect(() => {
    let cancelled = false;
    void loadVF()
      .then((VF) => {
        const el = ref.current;
        if (cancelled || !el) return;
        el.innerHTML = '';
        const per = barBeats(meter);
        // Split cells into bars.
        const bars: CellId[][] = [[]];
        let beats = 0;
        for (const c of rhythm.cells) {
          if (beats >= per - 1e-9) {
            bars.push([]);
            beats = 0;
          }
          bars[bars.length - 1].push(c);
          beats += CELLS[c].beats;
        }
        const firstExtra = bare ? 0 : compact ? 30 : 70;
        const barW = bare ? 40 + 22 * rhythm.cells.reduce((n, c) => n + CELL_NOTES[c].length, 0) : (compact ? 150 : 190) + (rhythm.cells.some((c) => c === 'ssss' || c === 'es' || c === 'se') ? 50 : 0);
        const width = firstExtra + barW * bars.length + 10;
        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(width, height);
        const ctx = renderer.getContext();
        let x = 5;
        const drawn: InstanceType<VF['StaveNote']>[] = [];
        let endX = 0;
        bars.forEach((bar, bi) => {
          const w = barW + (bi === 0 ? firstExtra : 0);
          const stave = new VF.Stave(x, compact ? -10 : 0, w);
          if (bare) stave.setBegBarType(VF.Barline.type.NONE).setEndBarType(VF.Barline.type.NONE);
          else if (bi === 0) {
            if (!compact) stave.addClef('percussion');
            stave.addTimeSignature(meter);
          }
          stave.setContext(ctx).draw();
          const notes: InstanceType<VF['StaveNote']>[] = [];
          const beams: InstanceType<VF['Beam']>[] = [];
          const tuplets: InstanceType<VF['Tuplet']>[] = [];
          for (const c of bar) {
            const cellNotes = CELL_NOTES[c].map((n) => {
              const sn = new VF.StaveNote({ keys: ['b/4'], duration: `${n.d}${n.rest ? 'r' : ''}${n.dot ? 'd' : ''}` });
              if (n.dot) VF.Dot.buildAndAttach([sn], { all: true });
              return sn;
            });
            notes.push(...cellNotes);
            if (CELLS[c].tuplet) tuplets.push(new VF.Tuplet(cellNotes, { num_notes: 3, notes_occupied: 2, ratioed: false }));
            // Beam consecutive eighths / sixteenths inside the cell.
            let run: InstanceType<VF['StaveNote']>[] = [];
            const flush = () => {
              if (run.length >= 2) beams.push(new VF.Beam(run));
              run = [];
            };
            CELL_NOTES[c].forEach((n, i) => {
              if (!n.rest && beamable(n.d)) run.push(cellNotes[i]);
              else flush();
            });
            flush();
          }
          VF.Formatter.FormatAndDraw(ctx, stave, notes);
          endX = stave.getNoteEndX();
          drawn.push(...notes);
          beams.forEach((b) => b.setContext(ctx).draw());
          tuplets.forEach((t) => t.setContext(ctx).draw());
          x += w;
        });
        setXs([...drawn.map((n) => headX(n) / width), endX / width]);
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
  }, [key, rhythm.cells, height, compact, meter, bare]);

  return (
    <div className={`rhythm-staff ${compact ? 'compact' : ''} ${bare ? 'bare' : ''}`} role="img" aria-label={label}>
      {rhythm.swing && !bare && <span className="swing-mark">Swing ♫ = ♩♪³</span>}
      <div className="svg-wrap">
        <div ref={ref} />
        {nowX(xs, now) !== null && <Playhead x={nowX(xs, now)!} />}
      </div>
      {failed && <p className="staff-fallback">{label}</p>}
    </div>
  );
}

/** A rhythm staff whose due note lights as a take runs (one per drum lane: each lane has its own rhythm). */
export function LiveRhythmStaff({ bpm, startPerf, live, ...rest }: Omit<Parameters<typeof RhythmStaff>[0], 'now'> & { bpm: number; startPerf: number | null | undefined; live: boolean }) {
  const now = useRhythmNow(rest.rhythm, bpm, startPerf, live);
  return <RhythmStaff {...rest} now={now} />;
}
