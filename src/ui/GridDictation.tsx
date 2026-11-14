// Grid progression dictation (progGrid.ts): every bar is a slot; tap a slot, then pick its root, quality and bass /
// colour on compact chip rows. After a wrong answer the right parts stay locked and the wrong slots open for one fix-it
// pass (the controller replays only those bars). Fits a 320×720 phone with no vertical scroll; the grid and the chips
// read left to right in both languages (chord symbols are LTR).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GridQuestion } from '../engine/lesson';
import { renderStimulus } from '../engine/lesson';
import { GQ_LABEL, GX_LABEL, gradeGrid, gridKey, gridSlotsStimulus, gridStimulus, parseGrid, suffixOf, type GQ, type GridCell, type GridMark, type GX } from '../engine/progGrid';
import { piano } from './services';
import '../grid.css';

type Part = { root?: number; q?: GQ; x?: GX };

const TX = {
  en: { all: 'All', bar: 'Bar', slow: 'Slow', check: 'Check', fix: 'Fix the marked bars', root: 'Root', quality: 'Quality', bass: 'Bass', colour: 'Colour' },
  he: { all: 'הכול', bar: 'תיבה', slow: 'לאט', check: 'בדיקה', fix: 'תקנו את התיבות המסומנות', root: 'יסוד', quality: 'סוג', bass: 'בס', colour: 'צבע' },
};

/**
 * `first`: the first try's answer while the fix-it pass is open (its right slots are locked). `result`: the last answer
 * once the item is resolved (marks and the right chords shown).
 */
export function GridDictation({ q, lang, disabled, first, result, onSubmit }: { q: GridQuestion; lang: 'en' | 'he'; disabled: boolean; first: string | null; result: string | null; onSubmit: (answer: string) => void }) {
  const tx = TX[lang];
  const asked = q.extras.length > 0;
  const n = q.slots.length;
  const firstGrade = useMemo(() => (first ? gradeGrid(q, first) : null), [q, first]);
  const resultGrade = useMemo(() => (result !== null ? gradeGrid(q, result) : null), [q, result]);
  const start = result ?? first;
  const [cells, setCells] = useState<Part[]>(() => (start ? parseGrid(start, n).map((c) => (c ? { ...c } : {})) : Array.from({ length: n }, () => ({}))));
  const locked = (i: number) => !!firstGrade?.marks[i]?.ok;
  const [cur, setCur] = useState(() => (firstGrade ? Math.max(0, firstGrade.marks.findIndex((m) => !m.ok)) : 0));
  const [slow, setSlow] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const done = (c: Part) => c.root !== undefined && c.q !== undefined && (!asked || c.x !== undefined);
  const complete = cells.every(done);
  const answerOf = (cs: Part[]) => gridKey(cs.map((c): GridCell | null => (done(c) ? { root: c.root!, q: c.q!, x: asked ? c.x! : 'none' } : null)));
  const editable = !disabled && result === null;

  const play = async (idx: number[] | null) => {
    ctl.current?.abort();
    const a = new AbortController();
    ctl.current = a;
    await piano.unlock();
    const tempo = slow ? 0.75 : 1;
    const r = renderStimulus(idx ? gridSlotsStimulus(q, idx, tempo) : gridStimulus(q, tempo));
    await piano.play(r.events, r.length, a.signal).catch(() => {});
  };

  const set = (patch: Part, last: boolean) => {
    if (!editable || locked(cur)) return;
    const next = cells.map((c, i) => (i === cur ? { ...c, ...patch } : c));
    setCells(next);
    if (last && done(next[cur])) {
      // On to the next open slot (wrapping), skipping locked ones.
      for (let k = 1; k <= n; k++) {
        const j = (cur + k) % n;
        if (!locked(j) && (!done(next[j]) || firstGrade)) {
          setCur(j);
          break;
        }
      }
    }
  };

  // Marks on every slot once resolved; in the fix-it pass only the locked (right) slots are marked.
  const marks: (GridMark | null)[] = resultGrade ? resultGrade.marks : firstGrade ? firstGrade.marks.map((m) => (m.ok ? m : null)) : [];
  const sel = cells[cur] ?? {};
  const cols = n > 12 ? 6 : 4;
  const sectionOf = (i: number) => q.sections?.find((s) => i === s.from);
  const third = q.extras.some((x) => x.startsWith('/')) ? tx.bass : tx.colour;

  const cellView = (c: Part, i: number) => {
    const m = marks[i];
    const want = q.slots[i];
    const slash = c.x !== undefined && c.x.startsWith('/');
    const rootTxt = c.root !== undefined ? q.spell[c.root] : '·';
    // A major triad has no suffix: its chip letter shows only while the slot is open.
    const qTxt = c.q !== undefined ? suffixOf(c.q, 'none') : c.root !== undefined ? '·' : '';
    const xTxt = c.x !== undefined && c.x !== 'none' ? (slash ? c.x : GX_LABEL[c.x]) : '';
    const partCls = (ok: boolean | undefined) => (m ? (ok ? ' ok' : ' bad') : '');
    // In the fix-it pass, a wrong slot shows what was wrong in the first try until it is changed.
    const fm = !resultGrade && firstGrade && !firstGrade.marks[i].ok ? firstGrade.marks[i] : null;
    const firstCell = fm && first ? parseGrid(first, n)[i] : null;
    const same = (a: unknown, b: unknown) => a !== undefined && a === b;
    const fixCls = (part: 'root' | 'q' | 'x') => (fm && firstCell && same(c[part], firstCell[part]) ? (fm[part === 'q' ? 'quality' : part === 'x' ? 'extra' : 'root'] ? ' ok' : ' bad') : '');
    return (
      <button
        key={i}
        type="button"
        className={`gd-cell${i === cur && editable ? ' cur' : ''}${locked(i) ? ' locked' : ''}${m ? (m.ok ? ' right' : ' wrong') : fm ? ' fix' : ''}`}
        onClick={() => setCur(i)}
        data-gd-cell={i}
        aria-label={`${i + 1}`}
      >
        {sectionOf(i) && <i className="gd-sec">{sectionOf(i)!.label}</i>}
        <small className="gd-n">{i + 1}{want.beats !== 4 ? <span className="gd-beats">{want.beats === 2 ? '½' : want.beats === 8 ? '×2' : ''}</span> : null}</small>
        <span className="gd-sym">
          <b className={`gd-p${partCls(m?.root)}${fixCls('root')}`}>{rootTxt}</b>
          <b className={`gd-p${partCls(m?.quality)}${fixCls('q')}`}>{qTxt}</b>
          {asked && <b className={`gd-p${partCls(m?.extra)}${fixCls('x')}`}>{xTxt}</b>}
        </span>
        {m && !m.ok && <span className="gd-want">{want.sym}</span>}
      </button>
    );
  };

  return (
    <div className="grid-dictation" data-grid-dictation={q.level}>
      <div className="gd-tools">
        <button type="button" className="btn small ghost" onClick={() => void play(null)} data-gd-play="all">
          ▶ {tx.all}
        </button>
        <button type="button" className="btn small ghost" onClick={() => void play([cur])} data-gd-play="bar">
          ▶ {tx.bar} <span dir="ltr">{cur + 1}</span>
        </button>
        <button type="button" className={`btn small ghost${slow ? ' on' : ''}`} aria-pressed={slow} onClick={() => setSlow((s) => !s)} data-gd-slow="1">
          {tx.slow}
        </button>
      </div>
      <div className={`gd-grid cols-${cols}`} dir="ltr">
        {cells.map(cellView)}
      </div>
      {result === null && (
        <div className={`gd-pad${editable && !locked(cur) ? '' : ' off'}`} dir="ltr" aria-label={`${tx.root} · ${tx.quality}${asked ? ` · ${third}` : ''}`}>
          <div className="gd-row roots">
            {q.spell.map((name, pc) => (
              <button key={pc} type="button" className={`gd-chip${sel.root === pc ? ' on' : ''}`} disabled={!editable || locked(cur)} onClick={() => set({ root: pc }, false)} data-gd-root={pc}>
                {name}
              </button>
            ))}
          </div>
          <div className="gd-row quals">
            {q.qualities.map((x) => (
              <button key={x} type="button" className={`gd-chip${sel.q === x ? ' on' : ''}`} disabled={!editable || locked(cur)} onClick={() => set({ q: x }, !asked)} data-gd-q={x}>
                {GQ_LABEL[x]}
              </button>
            ))}
          </div>
          {asked && (
            <div className="gd-row extras">
              {q.extras.map((x) => (
                <button key={x} type="button" className={`gd-chip${sel.x === x ? ' on' : ''}`} disabled={!editable || locked(cur)} onClick={() => set({ x }, true)} data-gd-x={x}>
                  {GX_LABEL[x]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {result === null && (
        <button type="button" className="btn primary gd-check" disabled={!editable || !complete} onClick={() => onSubmit(answerOf(cells))} data-gd-check="1">
          {firstGrade ? tx.fix : tx.check}
        </button>
      )}
    </div>
  );
}
