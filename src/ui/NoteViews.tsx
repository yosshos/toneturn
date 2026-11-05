// Note views (spec addendum M): keyboard, staff notation and guitar tab showing the same notes.
// During a question they show only an aid (key map / target / lookup) when one is on; after the answer
// they show what sounded. Rhythm exercises do not use these views.

import { useEffect, useRef, useState } from 'react';
import type { NoteView } from '../engine/aids';
import { aidFor, contentNotes, guitarPosition, guitarPositions, spellMidi } from '../engine/aids';
import type { Question } from '../engine/lesson';
import type { PitchClass } from '../engine/pitch';
import { Keyboard } from './bits';

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

export function NoteStaff({ notes, chord, keyPc, labels, clef = 'treble' }: { notes: number[]; chord: boolean; keyPc: PitchClass | null; labels?: string[]; clef?: 'treble' | 'bass' | 'alto' }) {
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
            const s = new VF.StaveNote({ keys: [vfKey(m, keyPc)], duration: 'q', clef });
            if (labels?.[i]) s.addModifier(new VF.Annotation(labels[i]).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM), 0);
            return s;
          });
      const voice = new VF.Voice({ num_beats: chord ? 4 : notes.length, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(sn);
      VF.Accidental.applyAccidentals([voice], keySpec(keyPc));
      new VF.Formatter().joinVoices([voice]).format([voice], width - 90);
      voice.draw(ctx, stave);
    },
    [notes.join(','), chord, keySpec(keyPc), (labels ?? []).join(','), clef],
  );
  return (
    <div className="note-staff" role="img" aria-label={notes.map((m) => vfKey(m, keyPc)).join(' ')}>
      <div ref={ref} />
      {failed && <p className="staff-fallback">{notes.map((m) => vfKey(m, keyPc)).join(' ')}</p>}
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
export function NoteViews({ q, views, answered, keysLive }: { q: Question; views: NoteView[]; answered: boolean; keysLive: boolean }) {
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
      {shown && views.includes('staff') && <NoteStaff notes={shown.notes} chord={shown.chord} keyPc={key} labels={labels} />}
      {shown && views.includes('tab') && <GuitarTab notes={shown.notes} chord={shown.chord} />}
    </div>
  );
}
