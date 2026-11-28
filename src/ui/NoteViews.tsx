// Note views (spec addendum M): keyboard, staff notation and guitar tab showing the same notes.
// During a question they show only an aid (key map / target / lookup) when one is on; after the answer
// they show what sounded. Rhythm exercises do not use these views.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NoteView } from '../engine/aids';
import { aidFor, contentNotes, guitarPosition, guitarPositions, spellIn } from '../engine/aids';
import type { Question } from '../engine/lesson';
import type { PitchClass } from '../engine/pitch';
import { Keyboard } from './bits';
import { ChordBox, Neck } from './Instrument';
import { TUNINGS } from '../engine/fretboard';
import { TAB_RHYTHM_MAX_COLS, tabRhythm, type TabRhythm } from '../engine/tabRhythm';

/** Strings for a chord, one note per string (clashes move to the next lower string). */
function chordPositions(notes: number[]): { str: number; fret: number }[] {
  const opens = [64, 59, 55, 50, 45, 40];
  const pos = notes.map((m) => guitarPosition(m));
  const used = new Set<number>();
  return pos.map((p, i) => {
    let s = p.str;
    while (used.has(s) && s < 6) s++;
    used.add(s);
    let m = notes[i];
    while (m < opens[s - 1]) m += 12;
    return { str: s, fret: Math.max(0, m - opens[s - 1]) };
  });
}

/** The guitar view picks the right picture (spec AE §3.1): chord box, neck for one or two notes, tab for a line. */
export function GuitarView({ notes, chord, leftHanded }: { notes: number[]; chord: boolean; leftHanded?: boolean }) {
  const tuning = TUNINGS[0];
  if (chord && notes.length >= 3) {
    const pos = chordPositions(notes);
    const fretted = pos.filter((p) => p.fret > 0).map((p) => p.fret);
    const base = fretted.length && Math.max(...fretted) > 4 ? Math.min(...fretted) : 1;
    const strs = pos.map((p) => p.str);
    return (
      <div className="guitar-box">
        <ChordBox
          tuning={tuning}
          leftHanded={leftHanded}
          d={{ kind: 'box', dots: pos.filter((p) => p.fret > 0), open: pos.filter((p) => p.fret === 0).map((p) => p.str), muted: [1, 2, 3, 4, 5, 6].filter((s) => !strs.includes(s)), baseFret: base, frets: Math.max(4, (fretted.length ? Math.max(...fretted) : 0) - base + 1) }}
        />
      </div>
    );
  }
  if (notes.length <= 2) {
    const pos = chord ? chordPositions(notes) : guitarPositions(notes);
    const hi = Math.max(5, ...pos.map((p) => p.fret + 1));
    const lo = Math.max(0, Math.min(...pos.map((p) => p.fret)) - (hi > 12 ? 2 : 99));
    return <Neck tuning={tuning} lo={Math.min(lo, hi - 5)} hi={Math.min(hi, 15)} dots={pos.map((p) => ({ ...p, tone: 'given' as const }))} leftHanded={leftHanded} />;
  }
  return <GuitarTab notes={notes} chord={chord} />;
}

type VF = typeof import('vexflow/bravura');
let vfPromise: Promise<VF> | null = null;
const loadVF = () => (vfPromise ??= import('vexflow/bravura'));

const keySpec = (k: PitchClass | null) => (k ? `${k.letter}${k.acc === -1 ? 'b' : k.acc === 1 ? '#' : ''}` : 'C');
const vfKey = (m: number, k: PitchClass | null, sharps?: readonly number[]) => {
  const s = spellIn(m, k, sharps);
  return `${s.letter.toLowerCase()}${s.acc === -1 ? 'b' : s.acc === 1 ? '#' : ''}/${s.octave}`;
};
/** A note written by its own name ("F♭", "B𝄫", "E♯": a mode spelled one letter per degree), the octave from the pitch. */
const VF_ACC: Record<string, [string, number]> = { '': ['', 0], '♭': ['b', -1], '♯': ['#', 1], '𝄫': ['bb', -2], '𝄪': ['##', 2] };
const NATURAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const vfSpelled = (m: number, name: string | undefined, k: PitchClass | null, sharps?: readonly number[]) => {
  const acc = name ? VF_ACC[name.slice(1)] : undefined;
  if (!name || !acc || NATURAL_PC[name[0]] === undefined || ((NATURAL_PC[name[0]] + acc[1]) % 12 + 12) % 12 !== ((m % 12) + 12) % 12) return vfKey(m, k, sharps);
  return `${name[0].toLowerCase()}${acc[0]}/${Math.round((m - acc[1] - NATURAL_PC[name[0]]) / 12) - 1}`;
};

function useSvg(draw: (VF: VF, el: HTMLDivElement) => void | number[], deps: unknown[], fit = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  /** Each drawn note's centre as a share of the width (for the now-cue overlay; no redraw while it moves). */
  const [xs, setXs] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    void loadVF()
      .then((VF) => {
        const el = ref.current;
        if (cancelled || !el) return;
        el.innerHTML = '';
        const got = draw(VF, el);
        setXs(got ?? []);
        const svg = el.querySelector('svg');
        if (svg) {
          const w = svg.getAttribute('width');
          const h = svg.getAttribute('height');
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          // VexFlow's resize() also writes an inline pixel size (style="width: 750px; height: 120px"): it beat the
          // 100 % width, so a long staff overflowed its card and showed as an empty box (COURSE-FEEDBACK-UI S4).
          svg.style.removeProperty('width');
          svg.style.removeProperty('height');
          svg.setAttribute('aria-hidden', 'true');
          // `fit` (hands together on a phone): the box is cropped to the drawn music, top and bottom, so the empty band
          // kept for ledger lines doesn't shrink the heads when the staff is scaled to the screen's height.
          if (fit && typeof svg.getBBox === 'function') {
            try {
              const bb = svg.getBBox();
              const H = Number(h) || 120;
              const y0 = Math.max(0, Math.floor(Math.min(bb.y, 40) - 4));
              const y1 = Math.min(H, Math.ceil(bb.y + bb.height + 6));
              if (bb.height > 0 && y1 - y0 < H) svg.setAttribute('viewBox', `0 ${y0} ${w} ${y1 - y0}`);
            } catch {
              /* not laid out (hidden): keep the full box */
            }
          }
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, failed, xs };
}

export { glidePos, nowX };
function NowColumn({ xs, now }: { xs: number[]; now?: number }) {
  const x = now === undefined ? null : nowX(xs, now);
  return x === null ? null : <Playhead x={x} />;
}
/**
 * Place an overlay (the playhead, the tab's now band) at a share `x` of the drawn staff: through the SVG's own matrix
 * (shareToPx), so it sits on the drawn heads even when a CSS height cap letterboxes the music inside the SVG's box
 * (owner 2026-11-28). Not against the wrapper either: the staff is often narrower than its row (owner 2026-11-13).
 */
function placeOnSvg(el: HTMLElement, x: number): void {
  const wrap = el.parentElement;
  const svg = wrap?.querySelector('svg');
  if (!wrap || !svg) return;
  const a = wrap.getBoundingClientRect();
  const b = svg.getBoundingClientRect();
  if (!(a.width > 0 && b.width > 0)) return;
  const m = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
  const v = svg.viewBox?.baseVal;
  if (m && v && v.width > 0) el.style.left = `${shareToPx(x, { vb: v, ctm: m }, a.left)}px`;
  else el.style.left = `${b.left - a.left + x * b.width}px`;
}
/** The playhead at a share `x` of the drawn staff (placed on the drawn music: placeOnSvg). */
export function Playhead({ x }: { x: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current) placeOnSvg(ref.current, x);
  });
  return <span ref={ref} className="staff-now" style={{ left: `${x * 100}%` }} aria-hidden="true" />;
}
/** GUITAR-AUDIT T3: a light band behind the tab column that is due (placed against the SVG's box, like the playhead). */
function TabNow({ xs, now }: { xs: number[]; now?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const k = now === undefined || !(now >= 0) || xs.length < 2 ? -1 : Math.min(Math.floor(now + 1e-6), xs.length - 2);
  const x = k >= 0 ? xs[k] : null;
  useLayoutEffect(() => {
    if (ref.current && x !== null) placeOnSvg(ref.current, x);
  });
  return x === null ? null : <span ref={ref} className="tab-col-now" style={{ left: `${x * 100}%` }} aria-hidden="true" />;
}
/** A drawn item's notehead centre (rests and tab numbers: the middle of the glyph). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const headX = (x: any): number => {
  // Drawn already: the head's own glyph box in the SVG (2026-11-22: VexFlow's head bounds put the playhead ~6 px right
  // of a half note's head after an accidental — the cursor looked as if it ran past the last note).
  try {
    const g = x.noteHeads?.[0]?.getSVGElement?.() as SVGGraphicsElement | undefined;
    const b = g && typeof g.getBBox === 'function' ? g.getBBox() : null;
    if (b && b.width > 0) return b.x + b.width / 2;
  } catch {
    /* not in the document */
  }
  try {
    if (typeof x.getNoteHeadBeginX === 'function' && typeof x.getNoteHeadEndX === 'function') return (x.getNoteHeadBeginX() + x.getNoteHeadEndX()) / 2;
  } catch {
    /* not formatted */
  }
  return x.getAbsoluteX() + (typeof x.getWidth === 'function' ? x.getWidth() / 2 : 6);
};

/** Per-note result colours on the staff (after an answer / a take). */
import type { NoteMark } from '../engine/noteMarks';
import { glidePos, nowX, shareToPx } from '../engine/playhead';
export type { NoteMark };
import { drawCue, drawExtras, drawMarks, drawTouch, type MarkSpot } from './markLayer';
import type { TouchMark } from '../engine/drills/types';
import { graceGroup, markVoice2, onsetColumns, signAfterGrace } from './vfGrace';
import type { Grace } from '../engine/drills/types';
/** Marks while a take runs (slice 5): one per drawn item (undefined = not settled yet), with the offset for the tick. */
export interface LiveMarks {
  marks: NoteMark[];
  devs: (number | null)[];
}
/** A drawn head (or tab digit): its centre and half-width in the SVG's units. */
type MarkGeo = { x: number; y: number; hw: number; text?: string };
/** Draw the live marks over the engraved music (their own layer), again after every redraw of the music. */
function useLiveLayer(ref: React.RefObject<HTMLDivElement | null>, geo: React.RefObject<MarkGeo[][]>, live: LiveMarks | undefined, win: number, xs: number[], kind: 'staff' | 'tab', layer: 'mk-live' | 'mk-prior' = 'mk-live') {
  const key = live ? live.marks.map((m, i) => (m ? `${m}${Math.round(live.devs[i] ?? 0)}` : '')).join(',') : '';
  useEffect(() => {
    const svg = ref.current?.querySelector('svg') ?? null;
    if (!svg) return;
    const spots: MarkSpot[] = [];
    live?.marks.forEach((mk, i) => {
      if (!mk) return;
      for (const g of geo.current?.[i] ?? []) spots.push({ mark: mk, x: g.x, y: g.y, hw: g.hw, dev: live.devs[i] ?? null, win, ...(g.text !== undefined ? { text: g.text } : {}) });
    });
    drawMarks(svg, spots, kind, layer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, xs, win]);
}
/** The count-in cue on one item (its first head / digit), again after every redraw of the music. */
function useCueLayer(ref: React.RefObject<HTMLDivElement | null>, geo: React.RefObject<MarkGeo[][]>, cue: number | undefined, xs: number[], kind: 'staff' | 'tab') {
  useEffect(() => {
    const svg = ref.current?.querySelector('svg') ?? null;
    if (!svg) return;
    const g = cue !== undefined && cue >= 0 ? geo.current?.[cue]?.[0] : undefined;
    drawCue(svg, g ?? null, kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue, xs]);
}
/** Extras (played notes not in the score): a small ✕ at y (SVG units) over each fractional item index, again after every redraw. */
function useExtraLayer(ref: React.RefObject<HTMLDivElement | null>, extras: number[] | undefined, xs: number[], y: number) {
  const key = (extras ?? []).map((f) => f.toFixed(2)).join(',');
  useEffect(() => {
    const svg = ref.current?.querySelector('svg') ?? null;
    if (!svg) return;
    const w = svg.viewBox?.baseVal?.width || 0;
    const at = (f: number) => {
      const k = Math.max(0, Math.min(xs.length - 1, Math.floor(f)));
      const t = f - k;
      const a = xs[k] ?? 0;
      // the next position that starts later (items starting together share an x)
      let m = k + 1;
      while (m < xs.length - 1 && Math.abs((xs[m] ?? a) - a) < 1e-4) m++;
      const b = xs[m] ?? a;
      return (a + (b - a) * t) * w;
    };
    drawExtras(svg, xs.length && w ? (extras ?? []).map(at) : [], y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, xs]);
}
/** A ghost head's key: the note really played, spelled in the staff's key. */

export function NoteStaff({ spells, touch, notes, chord, keyPc, labels, clef = 'treble', durs, marks, rests, meter, timeSig, sig, bars, ties, tieIn = false, tieIns, extra, orns, graces, vox, sharps, now, devs, win = 40, ghosts, spacing = 44, minWidth, ahead = false, live, cue, prior, fit = false, extras }: { /** The written name per item where the drill spells it itself (ExpNote.spell). */ spells?: (string | undefined)[]; /** MEASUREMENT-AUDIT: a touch mark per item (drawn small under / beside the head after a take). */ touch?: (TouchMark | undefined)[]; /** Played notes not in the score: where (a fractional item index, 2.5 = halfway from item 2 to 3) — a small ✕ above the staff. */ extras?: number[]; /** Crop the box to the drawn music top and bottom (hands together on a phone: bigger heads in the same height). */ fit?: boolean; /** Grace notes drawn small before an item's head (per item; never graded notes of their own). */ graces?: (Grace[] | undefined)[]; /** Two voices on the staff (per item): 2 = the lower voice (stems down, its own rests), else voice 1 (stems up). Items are in time order; each voice must fill the line. */ vox?: (1 | 2 | undefined)[]; /** Tie-ins per item (two voices: a held note of either voice tied in from the line before). */ tieIns?: boolean[]; /** Pitch classes the score writes as sharps (a piece: G♯ in A minor), not flats. */ sharps?: readonly number[]; /** A tie into the first item from the line before (drawn from the staff's start). */ tieIn?: boolean; /** More heads on an item (a chord: the other notes of the same hand at the same time). */ extra?: (number[] | undefined)[]; /** An ornament sign over an item (a VexFlow ornament code: ornaments.ts VF_ORNAMENT). */ orns?: (string | undefined)[]; /** Slice 5: marks while the take runs, per item (an overlay; the music is not redrawn). */ live?: LiveMarks; /** The count-in: this item's head pulses once (index into notes). */ cue?: number; /** The last take's ticks, faded, under this take's marks (per item). */ prior?: LiveMarks; /** px per note before scaling (phones: tighter, so heads come out bigger). */ spacing?: number; /** At least this drawn width (a grand staff's two lines drawn alike, so they line up). */ minWidth?: number; /** Look-ahead: a line not being played, drawn faded. */ ahead?: boolean; /** ms off the click per item (− early, + late): the length of the timing tick. */ devs?: (number | null | undefined)[]; /** The timing window (ms) the ticks are measured against. */ win?: number; /** The note really played under a wrong-pitch mark (a ghost head there). */ ghosts?: (number | null | undefined)[]; /** The due note (index into notes, −1 none): a now-cue column behind it. */ now?: number; notes: number[]; chord: boolean; keyPc: PitchClass | null; labels?: string[]; clef?: 'treble' | 'bass' | 'alto' | 'tenor'; durs?: number[]; marks?: NoteMark[]; /** Rests: true where the item is a rest of durs[i] (its note value is ignored). */ rests?: boolean[]; /** Beats per bar: draws bar lines between bars (with durs). */ meter?: number; /** Show the time signature (first line of a passage). */ timeSig?: boolean; /** The time signature text when it is not meter/4 (eighth-note meters: '7/8'). */ sig?: string; /** Mixed meters (prog timeline): the line's bars in quarter notes; a bar with `sig` writes its new time signature after the bar line. Overrides `meter` for the bar lines. */ bars?: { len: number; sig?: string }[]; /** Ties: true where a note is tied to the next one (lead sheets). */ ties?: boolean[] }) {
  const geo = useRef<MarkGeo[][]>([]);
  const { ref, failed, xs } = useSvg(
    (VF, el) => {
      // Two voices (0.99): voice 1 stems up, voice 2 stems down, each with its rests above / below the middle line.
      const two = !chord && !!vox?.some((v) => v === 2);
      const vOf = (i: number): 1 | 2 => (two && vox?.[i] === 2 ? 2 : 1);
      // the width follows the columns: two voices share a column where they start together
      const n = chord ? 1 : two && durs ? onsetColumns(durs, notes.map((_, i) => vOf(i))) : notes.length;
      const width = Math.max(220, 90 + n * spacing, minWidth ?? 0);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 120);
      const ctx = renderer.getContext();
      const stave = new VF.Stave(4, 10, width - 8);
      stave.addClef(clef).addKeySignature(keySpec(keyPc));
      if (timeSig && meter && durs) stave.addTimeSignature(sig ?? `${meter}/4`);
      // Ledger lines as strong as the notes (VexFlow's default #444 at 1.4 px read faint once the staff is scaled down,
      // e.g. Note Rush's C4 above the bass staff).
      stave.setDefaultLedgerLineStyle({ strokeStyle: '#1f1f24', lineWidth: 2.2 });
      stave.setContext(ctx).draw();
      // Two voices (0.99): voice 1 stems up, voice 2 stems down, each with its rests above / below the middle line.
      const restKey = (i: number) => (!two ? (clef === 'bass' ? 'd/3' : clef === 'tenor' ? 'a/3' : 'b/4') : vOf(i) === 1 ? (clef === 'bass' ? 'f/3' : clef === 'tenor' ? 'c/4' : 'd/5') : clef === 'bass' ? 'f/2' : clef === 'tenor' ? 'e/3' : 'f/4');
      const sn = chord
        ? [new VF.StaveNote({ keys: notes.map((m) => vfKey(m, keyPc, sharps)), duration: 'w', clef })]
        : notes.map((m, i) => {
            const b = durs?.[i] ?? 1;
            const rest = !!rests?.[i];
            const heads = rest ? [restKey(i)] : spells?.[i] && !extra?.[i]?.length ? [vfSpelled(m, spells[i], keyPc, sharps)] : [m, ...(extra?.[i] ?? [])].sort((x, y) => x - y).map((x) => vfKey(x, keyPc, sharps));
            const s = new VF.StaveNote({ keys: heads, duration: (b >= 4 ? 'w' : b >= 2 ? 'h' : b >= 1 ? 'q' : b >= 0.5 ? '8' : b >= 0.25 ? '16' : '32') + (rest ? 'r' : ''), clef, ...(two ? { stem_direction: vOf(i) === 2 ? -1 : 1 } : {}) });
            if (vOf(i) === 2) markVoice2(s);
            // grace notes, small, before the head (0.99)
            const gr = graces?.[i];
            if (gr?.length && !rest) s.addModifier(graceGroup(VF, gr, (x) => vfKey(x, keyPc, sharps), clef, keySpec(keyPc), vOf(i) === 2), 0);
            if (b === 1.5 || b === 3 || b === 0.75 || b === 0.375) VF.Dot.buildAndAttach([s], { all: true });
            // an ornament sign over the head (the realisation is in the drill's notes, graded)
            const o = orns?.[i];
            if (o && !rest) s.addModifier(new VF.Ornament(o), 0);
            // a given label (what was played, a finger, ms off the click) under the note; the mark itself is drawn over it
            const lab = labels?.[i];
            if (lab) s.addModifier(new VF.Annotation(lab).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
            return s;
          });
      // Items per voice (one voice: all of them, as before).
      const groupsV: number[][] = two ? [sn.map((_, i) => i).filter((i) => vOf(i) === 1), sn.map((_, i) => i).filter((i) => vOf(i) === 2)] : [sn.map((_, i) => i)];
      // Mixed meters: bar ends at the cumulative bar lengths, a new time signature after the bar line where it changes.
      const ends = bars ? bars.map((_, k) => bars.slice(0, k + 1).reduce((a, b) => a + b.len, 0)) : null;
      const voices = groupsV.map((idxs) => {
        const total = chord ? 4 : durs ? Math.ceil(idxs.reduce((a, i) => a + (durs[i] ?? 1), 0)) : idxs.length;
        const voice = new VF.Voice({ num_beats: Math.max(1, total), beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
        // Bar lines between bars (engraving, 0.52): after a note that completes a bar, unless it is the last one (each
        // voice gets its own, at the same places, so the voices stay aligned bar by bar).
        const ticks: InstanceType<typeof VF.StaveNote | typeof VF.BarNote>[] = [];
        let acc = 0;
        idxs.forEach((i, k) => {
          const x = sn[i];
          ticks.push(x);
          if (chord || !durs || (!meter && !ends)) return;
          acc += durs[i] ?? 1;
          if (k >= idxs.length - 1) return;
          if (ends) {
            const e = ends.findIndex((v) => Math.abs(v - acc) < 1e-6);
            if (e >= 0) {
              ticks.push(new VF.BarNote());
              const next = bars![e + 1];
              if (next?.sig) ticks.push(new VF.TimeSigNote(next.sig) as unknown as InstanceType<typeof VF.BarNote>);
            }
          } else if (meter && Math.abs(acc / meter - Math.round(acc / meter)) < 1e-6) ticks.push(new VF.BarNote());
        });
        voice.addTickables(ticks);
        return voice;
      });
      VF.Accidental.applyAccidentals(voices, keySpec(keyPc));
      // a main head after a grace of its letter with another alteration shows its own sign (A♮ after a grace A♭)
      graces?.forEach((g, i) => g?.length && sn[i] && !rests?.[i] && signAfterGrace(VF, sn[i], g, (x) => vfKey(x, keyPc, sharps)));
      // Beams must exist before the notes are drawn: a beamed note then has no flag (an eighth with a flag AND a beam is
      // not notation). Beams group by the beat — rests stay in the list (0.99), so a figure after an eighth rest is still
      // grouped on its beats (dropping them shifted every group; the Prelude in C beamed across the beat); two voices beam
      // apart, each keeping its stem direction.
      const beams = durs ? groupsV.flatMap((idxs, v) => VF.Beam.generateBeams(idxs.map((i) => sn[i]), { groups: [new VF.Fraction(1, 4)], ...(two ? { stem_direction: v === 0 ? 1 : -1, maintain_stem_directions: true } : {}) })) : [];
      new VF.Formatter().joinVoices(voices).format(voices, width - (timeSig ? 110 : 90));
      voices.forEach((v) => v.draw(ctx, stave));
      beams.forEach((bm) => bm.setContext(ctx).draw());
      /** The next item of the same voice (a tie goes to it). */
      const nextOf = (i: number): number | undefined => groupsV.find((g) => g.includes(i))?.find((j) => j > i);
      const tieIdx = (i: number) => Array.from({ length: 1 + (extra?.[i]?.length ?? 0) }, (_, k) => k);
      if (!chord && ties)
        ties.forEach((t, i) => {
          if (!t) return;
          const j = nextOf(i);
          (j !== undefined ? new VF.StaveTie({ first_note: sn[i], last_note: sn[j], first_indices: tieIdx(i), last_indices: tieIdx(j) }) : new VF.StaveTie({ first_note: sn[i], first_indices: tieIdx(i), last_indices: tieIdx(i) })).setContext(ctx).draw();
        });
      if (!chord && tieIn && sn[0] && !rests?.[0]) new VF.StaveTie({ last_note: sn[0], first_indices: tieIdx(0), last_indices: tieIdx(0) }).setContext(ctx).draw();
      if (!chord && tieIns) tieIns.forEach((t, i) => t && !(i === 0 && tieIn) && sn[i] && !rests?.[i] && new VF.StaveTie({ last_note: sn[i], first_indices: tieIdx(i), last_indices: tieIdx(i) }).setContext(ctx).draw());
      // Each head's place, for the live marks drawn over it while the take runs.
      geo.current = chord
        ? []
        : sn.map((x, i) => {
            if (rests?.[i]) return [];
            try {
              return [{ x: (x.getNoteHeadEndX() + x.getNoteHeadBeginX()) / 2, y: x.getYs()[0], hw: Math.max(4, (x.getNoteHeadEndX() - x.getNoteHeadBeginX()) / 2) }];
            } catch {
              return [];
            }
          });
      // COURSE-FEEDBACK-UI §4.1: the result marks over the heads (pitch on the head, timing as a tick beside it).
      if (!chord && marks?.some(Boolean)) {
        const spots: MarkSpot[] = [];
        sn.forEach((x, i) => {
          const mk = marks[i];
          if (!mk || rests?.[i]) return;
          let hw = 5.6;
          let cx = headX(x);
          try {
            hw = Math.max(4, (x.getNoteHeadEndX() - x.getNoteHeadBeginX()) / 2);
            cx = (x.getNoteHeadEndX() + x.getNoteHeadBeginX()) / 2;
          } catch {
            /* not formatted */
          }
          const y = x.getYs()[0];
          const g = ghosts?.[i];
          let ghostY: number | undefined;
          if (mk === 'wrong' && g !== null && g !== undefined) {
            try {
              const gn = new VF.StaveNote({ keys: [vfKey(g, keyPc, sharps)], duration: 'q', clef });
              gn.setStave(stave);
              ghostY = gn.getYs()[0];
            } catch {
              /* unknown key */
            }
          }
          spots.push({ mark: mk, x: cx, y, hw, dev: devs?.[i] ?? null, win, ghostY });
        });
        drawMarks(el.querySelector('svg'), spots, 'staff');
      }
      if (!chord && touch?.some(Boolean)) {
        const ts: { x: number; y: number; hw: number; mark: TouchMark }[] = [];
        sn.forEach((x, i) => {
          const tm = touch[i];
          if (!tm || rests?.[i]) return;
          try {
            ts.push({ x: (x.getNoteHeadEndX() + x.getNoteHeadBeginX()) / 2, y: x.getYs()[0], hw: Math.max(4, (x.getNoteHeadEndX() - x.getNoteHeadBeginX()) / 2), mark: tm });
          } catch {
            /* not formatted */
          }
        });
        drawTouch(el.querySelector('svg'), ts);
      }
      return [...sn.map((x) => headX(x) / width), stave.getNoteEndX() / width];
    },
    [notes.join(','), chord, spacing, keySpec(keyPc), (labels ?? []).join(','), clef, (durs ?? []).join(','), (marks ?? []).join(','), (touch ?? []).join(','), (devs ?? []).join(','), (ghosts ?? []).join(','), win, sig, (bars ?? []).map((b) => `${b.len}${b.sig ?? ''}`).join(','), (ties ?? []).join(','), tieIn, (sharps ?? []).join(','), (extra ?? []).map((x) => (x ?? []).join('+')).join(','), (orns ?? []).join(','), (graces ?? []).map((g) => (g ?? []).map((x) => `${x.pitch}${x.slash ? '/' : ''}`).join('+')).join(','), (vox ?? []).join(','), (tieIns ?? []).join(','), fit, (spells ?? []).join(',')],
    fit,
  );
  useLiveLayer(ref, geo, live, win, xs, 'staff');
  useLiveLayer(ref, geo, prior, win, xs, 'staff', 'mk-prior');
  useCueLayer(ref, geo, cue, xs, 'staff');
  useExtraLayer(ref, extras, xs, 43);
  return (
    <div className={`note-staff ${ahead ? 'ahead' : ''}`} role="img" aria-label={notes.map((m, i) => `${vfKey(m, keyPc, sharps)}${marks?.[i] ? ` ${marks[i]}` : ''}`).join(' ')}>
      <div className="svg-wrap">
        <div ref={ref} />
        <NowColumn xs={xs} now={now} />
      </div>
      {failed && <p className="staff-fallback">{notes.map((m) => vfKey(m, keyPc, sharps)).join(' ')}</p>}
    </div>
  );
}

/**
 * PIANO_AUDIT P3: a grand staff (treble over bass, braced) with one chord — the notes from middle C up in the treble
 * staff (right hand), the rest in the bass staff (left hand). Compact: two staves in about the height of one and a half.
 */
export function GrandStaff({ notes, keyPc }: { notes: number[]; keyPc: PitchClass | null }) {
  const rh = notes.filter((m) => m >= 60).sort((a, b) => a - b);
  const lh = notes.filter((m) => m < 60).sort((a, b) => a - b);
  const { ref, failed } = useSvg(
    (VF, el) => {
      const width = 200;
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 176);
      const ctx = renderer.getContext();
      const top = new VF.Stave(18, 0, width - 24);
      const bot = new VF.Stave(18, 76, width - 24);
      top.addClef('treble').addKeySignature(keySpec(keyPc));
      bot.addClef('bass').addKeySignature(keySpec(keyPc));
      for (const st of [top, bot]) st.setDefaultLedgerLineStyle({ strokeStyle: '#1f1f24', lineWidth: 2.2 });
      top.setContext(ctx).draw();
      bot.setContext(ctx).draw();
      new VF.StaveConnector(top, bot).setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw();
      new VF.StaveConnector(top, bot).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
      const one = (ms: number[], clef: 'treble' | 'bass') => new VF.StaveNote({ keys: ms.length ? ms.map((m) => vfKey(m, keyPc)) : [clef === 'bass' ? 'd/3' : 'b/4'], duration: ms.length ? 'w' : 'wr', clef });
      const vt = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables([one(rh, 'treble')]);
      const vb = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables([one(lh, 'bass')]);
      VF.Accidental.applyAccidentals([vt], keySpec(keyPc));
      VF.Accidental.applyAccidentals([vb], keySpec(keyPc));
      new VF.Formatter().joinVoices([vt]).joinVoices([vb]).format([vt, vb], width - 100);
      vt.draw(ctx, top);
      vb.draw(ctx, bot);
    },
    [notes.join(','), keySpec(keyPc)],
  );
  return (
    <div className="note-staff grand-staff" role="img" aria-label={`${rh.map((m) => vfKey(m, keyPc)).join(' ')} / ${lh.map((m) => vfKey(m, keyPc)).join(' ')}`}>
      <div ref={ref} />
      {failed && <p className="staff-fallback">{rh.map((m) => vfKey(m, keyPc)).join(' ')} / {lh.map((m) => vfKey(m, keyPc)).join(' ')}</p>}
    </div>
  );
}

/** One line of tablature with given string/fret positions (drills): chords stack, a mark above (h p / b ~ PM X …), result colours. */
export function TabLine({ cols, marks, strings = 6, bars, at, now, win = 40, spacing = 40, ahead = false, live, cue, prior, extras, bottomLabel, rhythm }: { /** GUITAR-AUDIT T2: each column's start and length (quarter notes from the line's start) — stems and beams under the tab; `group` = the beaming unit (1, or 1.5 in 6/8). */ rhythm?: { at: number[]; dur: number[]; group?: number }; /** GUITAR-AUDIT T1: the row under the tab is labelled once (e.g. "finger" / "אצבע"); its digits never sit on a string line. */ bottomLabel?: string; /** Played notes not in the tab: fractional column indices — a small ✕ above the top string. */ extras?: number[]; /** Slice 5: marks while the take runs, per column (an overlay). */ live?: LiveMarks; /** The count-in: this column's digit pulses once. */ cue?: number; /** The last take's ticks, faded (per column). */ prior?: LiveMarks; /** px per column before scaling. */ spacing?: number; /** Look-ahead: a line not being played, drawn faded. */ ahead?: boolean; /** The timing window (ms) the ticks are measured against. */ win?: number; /** The due column (−1 none): a now-cue column behind it. */ now?: number; cols: { pos: { str: number; fret: number | 'x' }[]; dur: number; top?: string; bottom?: string; /** ms off the click (− early, + late). */ dev?: number | null; /** Bass: the kick lands on this column. */ kick?: boolean }[]; marks?: NoteMark[]; strings?: number; /** Mixed meters: the line's bars (quarter notes) — a bar line at each bar's end, its time signature written where it changes. */ bars?: { len: number; sig?: string }[]; /** With `bars`: each column's start in quarter notes from the line's start. */ at?: number[] }) {
  const geo = useRef<MarkGeo[][]>([]);
  const { ref, failed, xs } = useSvg(
    (VF, el) => {
      const width = Math.max(220, 60 + cols.length * spacing);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      // T2: rhythm under the tab, unless the line is too dense for it (a phone line of many 16ths) or carries kick bars.
      const rh = rhythm && rhythm.at.length === cols.length && cols.length <= TAB_RHYTHM_MAX_COLS && !cols.some((c) => c.kick) ? tabRhythm(rhythm.at, rhythm.dur, rhythm.group ?? 1) : null;
      const hasRow = cols.some((c) => c.bottom);
      // the finger row moves under the stems; a triplet's "3" needs a little more room
      const extraH = (rh && hasRow ? 16 : 0) + (rh?.triplets.length ? 8 : 0);
      // COURSE-FEEDBACK-UI §4.3: less empty band above the strings (two lines of room for technique marks).
      renderer.resize(width, (strings === 4 ? 96 : 122) + extraH);
      const ctx = renderer.getContext();
      const stave = new VF.TabStave(4, 0, width - 8, { num_lines: strings, space_above_staff_ln: 2 });
      stave.addTabGlyph();
      stave.setContext(ctx).draw();
      // Mixed meters: which bar each column starts, so a bar line goes before the first column of every later bar and
      // the new signature rides on that column (above the technique mark).
      const ends = bars && at ? bars.map((_, k) => bars.slice(0, k + 1).reduce((a, b) => a + b.len, 0)) : null;
      const barOf = (i: number) => (ends && at ? Math.max(0, ends.findIndex((e) => at[i] < e - 1e-6)) : 0);
      const tn = cols.map((c, i) => {
        const b = c.dur;
        const n = new VF.TabNote({ positions: c.pos, duration: b >= 4 ? 'w' : b >= 2 ? 'h' : b >= 1 ? 'q' : b >= 0.5 ? '8' : '16' });
        const firstOfBar = !!ends && (i === 0 || barOf(i) !== barOf(i - 1));
        const sig = firstOfBar ? bars![barOf(i)]?.sig : undefined;
        if (sig || c.top) n.addModifier(new VF.Annotation([sig, c.top].filter(Boolean).join(' ')).setVerticalJustification(VF.Annotation.VerticalJustify.TOP), 0);
        return n;
      });
      const voice = new VF.Voice({ num_beats: Math.max(1, Math.ceil(cols.reduce((a, c) => a + c.dur, 0))), beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
      if (ends) {
        const ticks: InstanceType<typeof VF.TabNote | typeof VF.BarNote>[] = [];
        tn.forEach((n, i) => {
          if (i > 0 && barOf(i) !== barOf(i - 1)) ticks.push(new VF.BarNote());
          ticks.push(n);
        });
        voice.addTickables(ticks);
      } else voice.addTickables(tn);
      new VF.Formatter().joinVoices([voice]).format([voice], width - 60);
      voice.draw(ctx, stave);
      // GUITAR-AUDIT T1: fingers / strokes in their own row below the stave — small, purple, labelled once at its start —
      // never on a string line, where a beginner reads them as frets.
      const svgF = el.querySelector('svg');
      if (svgF && rh) drawTabRhythm(svgF, rh, tn.map(headX), stave.getYForLine(strings - 1) + 7);
      if (svgF && cols.some((c) => c.bottom)) {
        // a 4-string tab's TAB glyph (and the kick bars) reach below its last line: the row sits under them (and under the stems)
        const yb = stave.getYForLine(strings - 1) + (strings === 4 ? 27 : 17) + (rh ? 16 : 0);
        const add = (x: number, txt: string, cls: string, anchor = 'middle') => {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('x', String(x));
          t.setAttribute('y', String(yb));
          t.setAttribute('class', cls);
          t.setAttribute('text-anchor', anchor);
          t.textContent = txt;
          svgF.appendChild(t);
        };
        if (bottomLabel) add(strings === 4 ? 30 : 6, bottomLabel, 'tab-row-label', 'start');
        tn.forEach((x, i) => cols[i].bottom && add(headX(x), cols[i].bottom!, 'tab-row-digit'));
      }
      // Bass "lock with the kick": a short ink bar under each column the kick lands on.
      const svgK = el.querySelector('svg');
      if (svgK && cols.some((c) => c.kick)) {
        const yb = stave.getYForLine(strings - 1) + 14;
        tn.forEach((x, i) => {
          if (!cols[i].kick) return;
          const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const cx = headX(x);
          r.setAttribute('x', String(cx - 6));
          r.setAttribute('y', String(yb));
          r.setAttribute('width', '12');
          r.setAttribute('height', '4');
          r.setAttribute('rx', '1.5');
          r.setAttribute('class', 'tab-kick');
          svgK.appendChild(r);
        });
      }
      geo.current = tn.map((x, i) =>
        cols[i].pos.map((p) => {
          const text = String(p.fret === 'x' ? 'X' : p.fret);
          return { x: headX(x), y: stave.getYForLine(p.str - 1), hw: 3.4 * text.length + 3, text };
        }),
      );
      // COURSE-FEEDBACK-UI §4.1: each marked digit on a chip (teal right, pink wrong, dashed missed) + the timing tick.
      if (marks?.some(Boolean)) {
        const spots: MarkSpot[] = [];
        tn.forEach((x, i) => {
          const mk = marks[i];
          if (!mk) return;
          const cx = headX(x);
          for (const p of cols[i].pos) {
            const text = String(p.fret === 'x' ? 'X' : p.fret);
            spots.push({ mark: mk, x: cx, y: stave.getYForLine(p.str - 1), hw: 3.4 * text.length + 3, dev: cols[i].dev ?? null, win, text });
          }
        });
        drawMarks(el.querySelector('svg'), spots, 'tab');
      }
      return [...tn.map((x) => headX(x) / width), stave.getNoteEndX() / width];
    },
    [JSON.stringify(cols), (marks ?? []).join(','), win, spacing, strings, JSON.stringify(bars ?? null), (at ?? []).join(','), bottomLabel ?? '', JSON.stringify(rhythm ?? null)],
  );
  useLiveLayer(ref, geo, live, win, xs, 'tab');
  useLiveLayer(ref, geo, prior, win, xs, 'tab', 'mk-prior');
  useCueLayer(ref, geo, cue, xs, 'tab');
  useExtraLayer(ref, extras, xs, 12);
  return (
    <div className={`guitar-tab ${ahead ? 'ahead' : ''}`} dir="ltr" data-rhythm={rhythm ? (rhythm.at.length <= TAB_RHYTHM_MAX_COLS && !cols.some((c) => c.kick) ? 'stems' : 'dense') : undefined} data-kicks={cols.filter((c) => c.kick).length || undefined} role="img" aria-label={cols.map((c, i) => c.pos.map((p) => `${p.str}/${p.fret}`).join('+') + (marks?.[i] ? ` ${marks[i]}` : '')).join(' ')}>
      <div className="svg-wrap">
        {/* T3: the cue sits BEHIND the digits — a soft band on the column that is due, the thin glide line under it */}
        <TabNow xs={xs} now={now} />
        <NowColumn xs={xs} now={now} />
        <div ref={ref} />
      </div>
      {failed && <p className="staff-fallback">TAB</p>}
    </div>
  );
}

/**
 * T2: the rhythm under a tab line — stems from just below the lowest string (`y0`), beams at their foot, a flag on a lone
 * 8th / 16th, a dot beside a dotted value, "3" under a triplet group. Small and ink-grey, so the digits stay the focus.
 */
function drawTabRhythm(svg: SVGSVGElement, r: TabRhythm, xs: number[], y0: number) {
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'tab-rhythm');
  const L = 14;
  const foot = y0 + L;
  const el = (tag: string, a: Record<string, string | number>) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
    g.appendChild(e);
    return e;
  };
  const beamed = new Set<number>();
  for (const b of r.beams) if (b.level === 1) for (let i = b.from; i <= b.to; i++) beamed.add(i);
  r.marks.forEach((m, i) => {
    const x = xs[i];
    if (m.kind === 0) return;
    // a half note: a short stem (the lower half), the classic tab-rhythm sign
    el('line', { x1: x, x2: x, y1: m.kind === 1 ? y0 + L / 2 : y0, y2: foot, class: 'tab-stem' });
    if (m.dotted) el('circle', { cx: x + 3.6, cy: foot - 2.5, r: 1.3, class: 'tab-dot' });
    if (m.kind >= 3 && !beamed.has(i)) {
      // a lone 8th / 16th: a flag (two for a 16th)
      for (let f = 0; f < m.kind - 2; f++) el('path', { d: `M${x} ${foot - f * 4} q 4.5 -2.5 5.5 -7`, class: 'tab-flag' });
    }
  });
  for (const b of r.beams) {
    const y = b.level === 1 ? foot - 2.4 : foot - 6.4;
    if (b.from === b.to) {
      // a 16th beside 8ths: a short stub toward its neighbour
      const x = xs[b.from];
      const dir = b.from > 0 && beamed.has(b.from - 1) ? -1 : 1;
      el('rect', { x: dir > 0 ? x : x - 6, y, width: 6, height: 2.4, class: 'tab-beam' });
    } else el('rect', { x: xs[b.from], y, width: xs[b.to] - xs[b.from], height: 2.4, class: 'tab-beam' });
  }
  for (const [a, b] of r.triplets) {
    const t = el('text', { x: (xs[a] + xs[b]) / 2, y: foot + 9, class: 'tab-trip', 'text-anchor': 'middle' });
    t.textContent = '3';
  }
  svg.appendChild(g);
}

export function GuitarTab({ notes, chord }: { notes: number[]; chord: boolean }) {
  const { ref, failed } = useSvg(
    (VF, el) => {
      const n = chord ? 1 : notes.length;
      const width = Math.max(220, 70 + n * 44);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 130);
      const ctx = renderer.getContext();
      const stave = new VF.TabStave(4, 0, width - 8);
      stave.addTabGlyph();
      stave.setContext(ctx).draw();
      const pos = chord ? notes.map((m) => guitarPosition(m)) : guitarPositions(notes);
      // A chord needs one note per string: move clashes to the next lower string.
      if (chord) {
        const used = new Set<number>();
        const opens = [64, 59, 55, 50, 45, 40];
        pos.forEach((p, i) => {
          let s = p.str;
          while (used.has(s) && s < 6) s++;
          used.add(s);
          pos[i] = { str: s, fret: Math.max(0, notes[i] - opens[s - 1]) };
        });
      }
      const tn = chord ? [new VF.TabNote({ positions: pos, duration: 'w' })] : pos.map((p) => new VF.TabNote({ positions: [p], duration: 'q' }));
      const voice = new VF.Voice({ num_beats: chord ? 4 : notes.length, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(tn);
      new VF.Formatter().joinVoices([voice]).format([voice], width - 70);
      voice.draw(ctx, stave);
    },
    [notes.join(','), chord],
  );
  return (
    <div className="guitar-tab" role="img" aria-label={notes.map((m) => { const p = guitarPosition(m); return `${p.str}/${p.fret}`; }).join(' ')}>
      <div ref={ref} />
      {failed && <p className="staff-fallback">TAB</p>}
    </div>
  );
}

/**
 * The views under a question. `keysLive` = the sounding notes may light the keyboard (answered, or the
 * sound is only context). Staff and tab show the aid while answering, the content afterwards.
 */
/** Note-by-note marks for a sequence answer (degrees / names): which notes of the melody were right. */
export function seqMarks(q: Question, answer: unknown): NoteMark[] | undefined {
  if ((q.kind !== 'degree-seq' && q.kind !== 'name-seq') || answer === undefined || answer === null) return undefined;
  const sep = q.kind === 'degree-seq' ? '-' : '.';
  const want = String(q.answer).split(sep);
  const got = String(answer).split(sep);
  return want.map((w, i) => (got[i] === undefined || got[i] === '' ? 'missed' : got[i] === w ? 'ok' : 'wrong'));
}

export function NoteViews({ q, views, answered, keysLive, leftHanded, marks }: { q: Question; views: NoteView[]; answered: boolean; keysLive: boolean; leftHanded?: boolean; marks?: NoteMark[] }) {
  const aid = q.aid ? aidFor(q) : null;
  const content = answered ? contentNotes(q) : null;
  const shown = content ?? (aid ? { notes: aid.notes, chord: false } : null);
  const key = 'key' in q ? (q.key as PitchClass) : null;
  const labels = !content && aid?.kind === 'lookup' ? aid.labels : undefined;
  return (
    <div className="note-views">
      {views.includes('keyboard') && (
        <Keyboard
          live={keysLive}
          mark={keysLive && q.kind === 'degree' && q.direction !== 'name→degree' ? q.targetMidi : undefined}
          aid={!answered && aid ? { notes: aid.notes, labels: aid.labels, tonic: aid.kind !== 'target' ? aid.notes[0] : undefined } : undefined}
        />
      )}
      {shown && views.includes('staff') && <NoteStaff notes={shown.notes} chord={shown.chord} keyPc={key} labels={labels} marks={content && marks?.length === shown.notes.length ? marks : undefined} />}
      {shown && views.includes('tab') && <GuitarView notes={shown.notes} chord={shown.chord} leftHanded={leftHanded} />}
    </div>
  );
}
