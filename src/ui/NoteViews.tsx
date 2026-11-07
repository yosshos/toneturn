// Note views (spec addendum M): keyboard, staff notation and guitar tab showing the same notes.
// During a question they show only an aid (key map / target / lookup) when one is on; after the answer
// they show what sounded. Rhythm exercises do not use these views.

import { useEffect, useRef, useState } from 'react';
import type { NoteView } from '../engine/aids';
import { aidFor, contentNotes, guitarPosition, guitarPositions, spellMidi } from '../engine/aids';
import type { Question } from '../engine/lesson';
import type { PitchClass } from '../engine/pitch';
import { Keyboard } from './bits';
import { ChordBox, Neck } from './Instrument';
import { TUNINGS } from '../engine/fretboard';

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
const vfKey = (m: number, k: PitchClass | null) => {
  const s = spellMidi(m, k);
  return `${s.letter.toLowerCase()}${s.acc === -1 ? 'b' : s.acc === 1 ? '#' : ''}/${s.octave}`;
};

function useSvg(draw: (VF: VF, el: HTMLDivElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void loadVF()
      .then((VF) => {
        const el = ref.current;
        if (cancelled || !el) return;
        el.innerHTML = '';
        draw(VF, el);
        const svg = el.querySelector('svg');
        if (svg) {
          const w = svg.getAttribute('width');
          const h = svg.getAttribute('height');
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          svg.setAttribute('aria-hidden', 'true');
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, failed };
}

/** Per-note result colours on the staff (after an answer / a take). */
import type { NoteMark } from '../engine/noteMarks';
export type { NoteMark };
const MARK_COLOR: Record<Exclude<NoteMark, undefined>, string> = { ok: '#1f8f67', timing: '#b8861b', wrong: '#d43c2c', missed: '#d43c2c' };
/** Symbols under marked notes so the result is never colour-only. */
const MARK_SYM: Record<Exclude<NoteMark, undefined>, string> = { ok: '', timing: '~', wrong: '✕', missed: '○' };

export function NoteStaff({ notes, chord, keyPc, labels, clef = 'treble', durs, marks }: { notes: number[]; chord: boolean; keyPc: PitchClass | null; labels?: string[]; clef?: 'treble' | 'bass' | 'alto' | 'tenor'; durs?: number[]; marks?: NoteMark[] }) {
  const { ref, failed } = useSvg(
    (VF, el) => {
      const n = chord ? 1 : notes.length;
      const width = Math.max(220, 90 + n * 44);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 120);
      const ctx = renderer.getContext();
      const stave = new VF.Stave(4, 10, width - 8);
      stave.addClef(clef).addKeySignature(keySpec(keyPc));
      stave.setContext(ctx).draw();
      const sn = chord
        ? [new VF.StaveNote({ keys: notes.map((m) => vfKey(m, keyPc)), duration: 'w', clef })]
        : notes.map((m, i) => {
            const b = durs?.[i] ?? 1;
            const s = new VF.StaveNote({ keys: [vfKey(m, keyPc)], duration: b >= 4 ? 'w' : b >= 2 ? 'h' : b >= 1 ? 'q' : '8', clef });
            if (b === 1.5 || b === 3) VF.Dot.buildAndAttach([s], { all: true });
            const mk = marks?.[i];
            const lab = mk && MARK_SYM[mk] ? MARK_SYM[mk] : labels?.[i];
            if (lab) s.addModifier(new VF.Annotation(lab).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
            if (mk) s.setStyle({ fillStyle: MARK_COLOR[mk], strokeStyle: MARK_COLOR[mk] });
            return s;
          });
      const voice = new VF.Voice({ num_beats: chord ? 4 : durs ? Math.ceil(durs.reduce((a, b) => a + b, 0)) : notes.length, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(sn);
      VF.Accidental.applyAccidentals([voice], keySpec(keyPc));
      new VF.Formatter().joinVoices([voice]).format([voice], width - 90);
      voice.draw(ctx, stave);
      if (durs) VF.Beam.generateBeams(sn).forEach((bm) => bm.setContext(ctx).draw());
    },
    [notes.join(','), chord, keySpec(keyPc), (labels ?? []).join(','), clef, (durs ?? []).join(','), (marks ?? []).join(',')],
  );
  return (
    <div className="note-staff" role="img" aria-label={notes.map((m, i) => `${vfKey(m, keyPc)}${marks?.[i] ? ` ${marks[i]}` : ''}`).join(' ')}>
      <div ref={ref} />
      {failed && <p className="staff-fallback">{notes.map((m) => vfKey(m, keyPc)).join(' ')}</p>}
    </div>
  );
}

/** One line of tablature with given string/fret positions (drills): chords stack, a mark above (h p / b ~ PM X …), result colours. */
export function TabLine({ cols, marks, strings = 6 }: { cols: { pos: { str: number; fret: number | 'x' }[]; dur: number; top?: string; bottom?: string }[]; marks?: NoteMark[]; strings?: number }) {
  const { ref, failed } = useSvg(
    (VF, el) => {
      const width = Math.max(220, 60 + cols.length * 40);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, strings === 4 ? 120 : 140);
      const ctx = renderer.getContext();
      const stave = new VF.TabStave(4, 0, width - 8, { num_lines: strings });
      stave.addTabGlyph();
      stave.setContext(ctx).draw();
      const tn = cols.map((c, i) => {
        const b = c.dur;
        const n = new VF.TabNote({ positions: c.pos, duration: b >= 4 ? 'w' : b >= 2 ? 'h' : b >= 1 ? 'q' : b >= 0.5 ? '8' : '16' });
        if (c.top) n.addModifier(new VF.Annotation(c.top).setVerticalJustification(VF.Annotation.VerticalJustify.TOP), 0);
        const mk = marks?.[i];
        const lab = mk && MARK_SYM[mk] ? MARK_SYM[mk] : c.bottom;
        if (lab) n.addModifier(new VF.Annotation(lab).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
        if (mk) n.setStyle({ fillStyle: MARK_COLOR[mk], strokeStyle: MARK_COLOR[mk] });
        return n;
      });
      const voice = new VF.Voice({ num_beats: Math.max(1, Math.ceil(cols.reduce((a, c) => a + c.dur, 0))), beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(tn);
      new VF.Formatter().joinVoices([voice]).format([voice], width - 60);
      voice.draw(ctx, stave);
    },
    [JSON.stringify(cols), (marks ?? []).join(','), strings],
  );
  return (
    <div className="guitar-tab" role="img" aria-label={cols.map((c, i) => c.pos.map((p) => `${p.str}/${p.fret}`).join('+') + (marks?.[i] ? ` ${marks[i]}` : '')).join(' ')}>
      <div ref={ref} />
      {failed && <p className="staff-fallback">TAB</p>}
    </div>
  );
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
