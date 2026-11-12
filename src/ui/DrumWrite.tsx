// The drummer's ear, after the take (d-ear dictation / style): write the bar on a step grid (one row per drum, one cell
// per 8th or 16th), or pick the style's name. Graded right away; the grade joins the measured take (withDrumWrite) and
// can only lower its verdict. One screen: the grid is at most 3 rows × 16 cells.

import { useState } from 'react';
import type { Drill, DrumVoice } from '../engine/drills/types';
import { gradeGrid, type DrumWriteGrade } from '../engine/drills/drumEar';

type Lang = 'he' | 'en';
const ROW: Partial<Record<DrumVoice, { en: string; he: string }>> = { hihat: { en: 'Hi-hat', he: 'היי־האט' }, snare: { en: 'Snare', he: 'סנר' }, kick: { en: 'Kick', he: 'קיק' } };

export function DrumWrite({ drill, lang, onDone }: { drill: Drill; lang: Lang; onDone: (g: DrumWriteGrade) => void }) {
  const w = drill.drumWrite!;
  const he = lang === 'he';
  const [got, setGot] = useState<boolean[][]>(() => (w.kind === 'grid' ? w.lanes.map((l) => l.steps.map(() => false)) : []));
  const [grade, setGrade] = useState<DrumWriteGrade | null>(null);
  if (w.kind === 'pick')
    return (
      <section className="ear-card write-card" data-write={grade ? 'graded' : 'open'}>
        <p className="ear-ask">{he ? 'איזה סגנון זה היה?' : 'Which style was it?'}</p>
        <div className="drum-pick">
          {w.options.map((o, i) => (
            <button key={i} className={`btn ${grade ? (i === w.answer ? 'pick-ok' : i === grade.picked ? 'pick-bad' : '') : ''}`} disabled={!!grade} onClick={() => setGrade({ ok: i === w.answer ? 1 : 0, total: 1, picked: i })} data-pick={i}>
              {o[lang]}
            </button>
          ))}
        </div>
        {grade && (
          <div className="drill-actions">
            <button className="btn primary" onClick={() => onDone(grade)} data-write-done="1">
              {he ? 'לתוצאה' : 'See the result'}
            </button>
          </div>
        )}
      </section>
    );
  const per = w.sub;
  const toggle = (li: number, k: number) => !grade && setGot(got.map((row, i) => (i === li ? row.map((x, j) => (j === k ? !x : x)) : row)));
  return (
    <section className="ear-card write-card" data-write={grade ? 'graded' : 'open'}>
      <p className="ear-ask">{he ? 'כתבו את התיבה: הקישו על המשבצות שבהן יש מכה' : 'Write the bar: tap the cells with a stroke'}</p>
      <div className="drum-grid" dir="ltr" style={{ ['--cells' as string]: w.lanes[0].steps.length }}>
        <span className="dg-name" />
        {w.lanes[0].steps.map((_, k) => (
          <span key={k} className="dg-count">
            {k % per === 0 ? k / per + 1 : per === 2 ? '&' : ['', 'e', '&', 'a'][k % per]}
          </span>
        ))}
        {w.lanes.map((l, li) => (
          <div key={l.voice} className="dg-row" style={{ display: 'contents' }}>
            <span className="dg-name">{ROW[l.voice]?.[lang] ?? l.voice}</span>
            {l.steps.map((_, k) => {
              const c = grade?.cells?.[li][k];
              return <button key={k} className={`dg-cell ${got[li][k] ? 'on' : ''} ${k % per === 0 ? 'beat' : ''} ${c === true ? 'ok' : c === false ? 'bad' : ''}`} aria-label={`${l.voice} ${k + 1}`} aria-pressed={got[li][k]} onClick={() => toggle(li, k)} data-cell={`${li}:${k}`} />;
            })}
          </div>
        ))}
      </div>
      <div className="drill-actions">
        {!grade ? (
          <button className="btn primary" disabled={!got.some((r) => r.some(Boolean))} onClick={() => setGrade(gradeGrid(w.lanes, got))} data-write-check="1">
            {he ? 'בדיקה' : 'Check'}
          </button>
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
