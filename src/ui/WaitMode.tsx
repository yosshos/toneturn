// Wait mode (0.49): no tempo — the cursor waits on each chord / note until the player has pressed all of it (MIDI),
// then moves on. Wrong notes are counted and coloured; for beginners and for learning a new passage by heart.

import { useEffect, useMemo, useRef, useState } from 'react';
import { notesIn, type Piece } from '../engine/piece/score';
import type { NoteMark } from '../engine/noteMarks';
import { midi } from '../speech/midi';

export interface WaitGroup {
  /** Beat from the start of the range. */
  at: number;
  midis: number[];
  /** Piece.notes indexes. */
  refs: number[];
}

/** Onset groups of a bar range (both hands together; a chord = notes starting together). */
export function waitGroups(p: Piece, from: number, to: number): WaitGroup[] {
  const t0 = p.bars[from]?.start ?? 0;
  const rel = notesIn(p, from, to);
  const abs = p.notes.map((n, i) => ({ n, i })).filter(({ n }) => n.bar >= from && n.bar <= to);
  const map = new Map<number, WaitGroup>();
  rel.forEach((n, k) => {
    const key = Math.round(n.start * 48);
    const g = map.get(key) ?? { at: n.start, midis: [], refs: [] };
    g.midis.push(n.midi);
    g.refs.push(abs[k].i);
    map.set(key, g);
  });
  void t0;
  return [...map.values()].sort((a, b) => a.at - b.at);
}

export function WaitMode({ piece, from, to, lang, onCursor, onMarks, onDone }: { piece: Piece; from: number; to: number; lang: 'en' | 'he'; onCursor: (beat: number | null) => void; onMarks: (m: Map<number, NoteMark>) => void; onDone: (acc: number) => void }) {
  const groups = useMemo(() => waitGroups(piece, from, to), [piece, from, to]);
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(0);
  const iRef = useRef(0);
  const down = useRef(new Set<number>());
  const marks = useRef(new Map<number, NoteMark>());
  const misses = useRef(0);
  const hasMidi = midi.devices.length > 0;
  useEffect(() => {
    onCursor(groups[0]?.at ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);
  useEffect(() => {
    const off = midi.onNote((m, on) => {
      const g = groups[iRef.current];
      if (!g) return;
      if (!on) {
        down.current.delete(m);
        return;
      }
      if (!g.midis.includes(m)) {
        misses.current++;
        setWrong((w) => w + 1);
        g.refs.forEach((r) => marks.current.set(r, 'wrong'));
        onMarks(new Map(marks.current));
        return;
      }
      down.current.add(m);
      if (g.midis.every((x) => down.current.has(x))) {
        g.refs.forEach((r) => !marks.current.has(r) && marks.current.set(r, 'ok'));
        onMarks(new Map(marks.current));
        down.current = new Set();
        const n = iRef.current + 1;
        iRef.current = n;
        setI(n);
        if (n >= groups.length) {
          onCursor(null);
          const total = groups.length;
          onDone(Math.max(0, (total - Math.min(total, misses.current)) / total));
        } else onCursor(groups[n].at);
      }
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);
  const he = lang === 'he';
  return (
    <div className="wait-mode" data-wait-mode="1">
      {!hasMidi ? (
        <p className="field-hint">{he ? 'מצב המתנה עובד עם מקלדת MIDI. חברו מקלדת (הגדרות ← MIDI).' : 'Wait mode works with a MIDI keyboard. Connect one (Settings → MIDI).'}</p>
      ) : (
        <p className="pc-coach" aria-live="polite">
          {i < groups.length ? (he ? `נגנו את מה שמסומן — ${i + 1} מתוך ${groups.length}` : `Play what is marked — ${i + 1} of ${groups.length}`) : he ? 'סיימתם את הקטע.' : 'Passage done.'}
          {wrong > 0 && <small dir="ltr"> · ✕ {wrong}</small>}
        </p>
      )}
    </div>
  );
}
