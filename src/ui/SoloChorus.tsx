// Write a solo chorus (docs/AUDIT-DEPTH-3.md C6): the bar grid of the form, one vocabulary cell or lick per bar, the
// rule check under it, Save. The chorus level then plays the saved chorus graded note for note (soloChorus.ts).
// Compact for a 320 × 720 phone: the grid, the cell chips of the chosen bar, one check line, two buttons.
import { useEffect, useMemo, useState } from 'react';
import { CHORUS_FORMS, assembleChorus, barsOf, cellName, cellShort, cellsFor, chorusChecks, defaultPlan, planOf, savePlan, type CellId } from '../engine/soloChorus';
import { chartOf } from '../engine/bebopVocab';

type Lang = 'en' | 'he';
type Inst = 'piano' | 'guitar' | 'bass';
const REG: Record<Inst, [number, number]> = { piano: [60, 84], guitar: [52, 79], bass: [36, 60] };
const TX = {
  en: { title: 'Your chorus', bar: 'Bar', close: 'Close', save: 'Save', reset: 'Suggested', downbeats: 'Chord tone on beat 1', approaches: 'Changes reached by a step', saved: 'Saved' },
  he: { title: 'הכורוס שלכם', bar: 'תיבה', close: 'סגירה', save: 'שמירה', reset: 'מוצע', downbeats: 'צליל אקורד בפעמה 1', approaches: 'החלפות שמגיעים אליהן בצעד', saved: 'נשמר' },
};

export function SoloChorusEditor({ lang, inst, form, keyPc, onClose }: { lang: Lang; inst: Inst; form: number; keyPc: number; onClose: (saved: boolean) => void }) {
  const tx = TX[lang];
  const bars = useMemo(() => barsOf(form, keyPc), [form, keyPc]);
  const names = useMemo(() => chartOf(bars.flat(), keyPc), [bars, keyPc]);
  const [plan, setPlan] = useState<CellId[]>(() => planOf(inst, form));
  const [sel, setSel] = useState(0);
  const notes = useMemo(() => assembleChorus(bars, plan, ...REG[inst]), [bars, plan, inst]);
  const ck = useMemo(() => chorusChecks(bars, notes), [bars, notes]);
  const okN = (xs: { ok: boolean }[]) => `${xs.filter((x) => x.ok).length}/${xs.length}`;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose(false));
    addEventListener('keydown', k, true);
    return () => removeEventListener('keydown', k, true);
  }, [onClose]);
  const badBar = new Set(ck.downbeats.filter((x) => !x.ok).map((x) => x.bar));
  return (
    <div className="sheet-backdrop" onClick={() => onClose(false)}>
      <div className="sheet chorus-ed" role="dialog" aria-modal="true" aria-label={tx.title} onClick={(e) => e.stopPropagation()} data-chorus-editor={form}>
        <div className="menu-head">
          <h2>
            {tx.title} <small>{CHORUS_FORMS[form % CHORUS_FORMS.length].name[lang]}</small>
          </h2>
          <button className="icon-btn" onClick={() => onClose(false)} aria-label={tx.close}>
            ✕
          </button>
        </div>
        <div className="chorus-grid" dir="ltr" role="radiogroup" aria-label={tx.bar}>
          {bars.map((_, i) => (
            <button key={i} type="button" role="radio" aria-checked={sel === i} className={`chorus-bar ${sel === i ? 'on' : ''} ${badBar.has(i) ? 'warn' : ''}`} onClick={() => setSel(i)} data-chorus-bar={i}>
              <small>{names[i]}</small>
              <b>{cellShort(plan[i] ?? 'arp')[lang]}</b>
            </button>
          ))}
        </div>
        <p className="chorus-sel">
          {tx.bar} {sel + 1} · {names[sel]}
        </p>
        <div className="chorus-cells">
          {cellsFor(bars[sel]).map((c) => (
            <button key={c} type="button" className={`chip ${plan[sel] === c ? 'on' : ''}`} onClick={() => setPlan(plan.map((x, i) => (i === sel ? c : x)))} data-chorus-cell={c}>
              {cellName(c)[lang]}
            </button>
          ))}
        </div>
        <p className="chorus-check" data-chorus-check={ck.downbeats.filter((x) => !x.ok).length}>
          {tx.downbeats} <b dir="ltr">{okN(ck.downbeats)}</b> · {tx.approaches} <b dir="ltr">{okN(ck.approaches)}</b>
        </p>
        <div className="chorus-actions">
          <button className="btn small ghost" onClick={() => setPlan(defaultPlan(form))} data-chorus-reset="1">
            {tx.reset}
          </button>
          <button
            className="btn small primary"
            onClick={() => {
              savePlan(inst, form, plan);
              onClose(true);
            }}
            data-chorus-save="1"
          >
            {tx.save}
          </button>
        </div>
      </div>
    </div>
  );
}
