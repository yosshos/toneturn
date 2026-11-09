// Ear L7 (bagrut transcription): after playing the line back, the player writes it — taps each note on the bass neck
// (tab-style entry: string + fret), one per slot — and it is graded note for note (the same sounding pitch, any
// string). The written grade joins the measured take (withWritten): a wrong written note keeps the take from counting.

import { useState } from 'react';
import type { Drill } from '../engine/drills/types';
import { gradeWritten, type WrittenGrade } from '../engine/drills/bassEar';
import { noteAt, tuningById } from '../engine/fretboard';
import { Neck, midiName, type NeckDot } from './Instrument';

type Lang = 'he' | 'en';

export function TranscribeWrite({ drill, lang, onDone }: { drill: Drill; lang: Lang; onDone: (g: WrittenGrade) => void }) {
  const want = drill.write?.pitches ?? [];
  const tu = tuningById(drill.spec.tuning ?? 'bass');
  const [got, setGot] = useState<{ s: number; f: number; p: number }[]>([]);
  const [grade, setGrade] = useState<WrittenGrade | null>(null);
  const he = lang === 'he';
  const full = got.length >= want.length;
  const tap = (s: number, f: number) => {
    if (grade || full) return;
    setGot([...got, { s, f, p: noteAt(tu, s, f) }]);
  };
  const last = got[got.length - 1];
  const dots: NeckDot[] = last && !grade ? [{ str: last.s, fret: last.f, tone: 'mine' }] : [];
  return (
    <section className="ear-card write-card" data-write={grade ? 'graded' : 'open'}>
      <p className="ear-ask">{he ? `עכשיו כתבו את הקו: הקישו על הצוואר ${want.length} תווים, לפי הסדר` : `Now write the line: tap its ${want.length} notes on the neck, in order`}</p>
      <ol className="ear-bars write-slots" dir="ltr">
        {want.map((p, i) => {
          const g = got[i];
          const cls = grade ? (grade.marks[i] ? 'w-ok' : 'w-bad') : i === got.length ? 'now' : 'you';
          return (
            <li key={i} className={cls} data-slot={i}>
              {g ? `${midiName(g.p)} · ${g.s}/${g.f}` : '—'}
              {grade && !grade.marks[i] && <small className="write-answer"> → {midiName(p)}</small>}
            </li>
          );
        })}
      </ol>
      {!grade && <Neck tuning={tu} lo={0} hi={12} dots={dots} onTap={tap} label={he ? 'צוואר הבס: הקישו על מיתר וסריג' : 'Bass neck: tap a string and fret'} />}
      <div className="drill-actions">
        {!grade ? (
          <>
            <button className="btn ghost" disabled={!got.length} onClick={() => setGot(got.slice(0, -1))}>
              {he ? 'ביטול' : 'Undo'}
            </button>
            <button className="btn primary" disabled={!full} onClick={() => setGrade(gradeWritten(want, got.map((x) => x.p)))} data-write-check="1">
              {he ? 'בדיקה' : 'Check'}
            </button>
          </>
        ) : (
          <>
            <p className="field-hint" data-written={`${grade.ok}/${grade.total}`}>
              {he ? `בכתב: ${grade.ok}/${grade.total} נכונים` : `Written: ${grade.ok}/${grade.total} right`}
            </p>
            <button className="btn primary" onClick={() => onDone(grade)} data-write-done="1">
              {he ? 'לתוצאה' : 'See the result'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
