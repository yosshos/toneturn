// The error map (COURSE-FEEDBACK-UI §4.1, slice 3): one cell per bar, filled by the worst mark in the bar. A tap picks
// the bar to loop (tap a second bar for a range). LTR like the music; 44 px tap targets on an 18 px strip.

import type { Drill, TakeMetrics } from '../engine/drills/types';
import { markOf, worstMark, type NoteMark } from '../engine/noteMarks';
import { barOfBeat, drillBars } from '../engine/drills/slice';
import { tempoBand, thresholds } from '../engine/drills/analyze';

type Lang = 'en' | 'he';

/** Per bar: the worst mark of its notes (undefined: no notes in the bar). */
export function barMarks(drill: Drill, m: TakeMetrics): NoteMark[] {
  const n = drillBars(drill).length;
  const win = m.drum?.windowMs ?? thresholds(tempoBand(m.nps)).sd * 2;
  const per: NoteMark[][] = Array.from({ length: n }, () => []);
  for (const r of m.perNote) per[Math.min(n - 1, barOfBeat(drill, r.exp.beat))]?.push(markOf(r, win));
  return per.map((xs) => worstMark(xs));
}

/** The bar to loop by default: the first bar with the worst mark (null when every bar is right). */
export function worstBar(marks: NoteMark[]): number | null {
  for (const w of ['missed', 'wrong', 'late', 'early'] as const) {
    const i = marks.indexOf(w);
    if (i >= 0) return i;
  }
  return null;
}

export function ErrorMap({ marks, sel, onPick, lang }: { marks: NoteMark[]; sel: [number, number] | null; onPick: (bar: number) => void; lang: Lang }) {
  if (marks.length < 2) return null;
  return (
    <ol className="error-map" dir="ltr" aria-label={lang === 'he' ? 'מפת טעויות לפי תיבה' : 'mistakes by bar'} data-error-map={marks.length} style={{ ['--n' as string]: Math.min(marks.length, 16) }}>
      {marks.map((mk, i) => {
        const on = sel !== null && i >= sel[0] && i <= sel[1];
        return (
          <li key={i}>
            <button className={`em-cell ${mk ?? 'empty'} ${on ? 'sel' : ''}`} onClick={() => onPick(i)} aria-pressed={on} aria-label={`${lang === 'he' ? 'תיבה' : 'Bar'} ${i + 1}${mk && mk !== 'ok' ? ` · ${mk}` : ''}`} data-bar={i} data-bar-mark={mk ?? ''}>
              <i aria-hidden="true" />
              <small>{i + 1}</small>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
