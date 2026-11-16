// One tune, step by step (docs/AUDIT-DEPTH-3.md C4): on the tune families' page (k-tune, g-tune, b-tune). Pick a head;
// its ladder lists the steps (roots → guide tones → shells → rootless → drop 2 → 6-dim blocks → melody and comp → all
// 12 keys on the keys; the guitar and bass ladders in engine/tuneLadder.ts). A step opens once the one before it has a
// clean take on this tune; every step is an ordinary measured drill. One phone screen.

import { useMemo, useState } from 'react';
import type { Drill, FamilyId, ItemState } from '../engine/drills/types';
import { generate } from '../engine/drills/generate';
import { HEADS } from '../content/heads';
import { SERVED } from '../engine/drills/headDrills';
import { ladderDone, ladderInstOf, stepSpec, tuneLadderStatus } from '../engine/tuneLadder';
import '../reharm.css';

type Lang = 'en' | 'he';
const store = (k: string, v?: string): string | null => {
  try {
    if (v !== undefined) localStorage.setItem(k, v);
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
/** All twelve keys from the head's own, round the cycle of 4ths. */
const keysFrom = (k: number): number[] => Array.from({ length: 12 }, (_, i) => (((k + 5 * i) % 12) + 12) % 12);

export function TuneLadder({ family, lang, items, onRun }: { family: FamilyId; lang: Lang; items: Record<string, ItemState>; onRun: (q: Drill[]) => void }) {
  const inst = ladderInstOf(family);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState<number>(() => {
    const v = Number(store('tune-ladder:head'));
    return SERVED.includes(v) ? v : SERVED[0];
  });
  const status = useMemo(() => (inst ? tuneLadderStatus(items, inst, idx) : []), [items, inst, idx]);
  if (!inst) return null;
  const L = (en: string, he: string) => (lang === 'he' ? he : en);
  const done = ladderDone(status);
  if (!open)
    return (
      <button className="btn ghost family-lesson" onClick={() => setOpen(true)} data-tune-ladder="open">
        {L('One tune, step by step', 'שיר אחד, צעד אחר צעד')}
      </button>
    );
  const run = (i: number) => {
    const st = status[i];
    const home = HEADS[idx].home.key;
    const keys = st.step.keys12 ? keysFrom(home) : [home];
    onRun(keys.map((k) => generate(stepSpec(st.step, inst, idx, k))));
  };
  return (
    <section className="rh-studio tl-panel" data-tune-ladder="panel">
      <div className="rh-top">
        <select
          aria-label={L('Head', 'שיר')}
          value={idx}
          onChange={(e) => {
            const v = Number(e.target.value);
            store('tune-ladder:head', String(v));
            setIdx(v);
          }}
        >
          {SERVED.map((i) => (
            <option key={i} value={i}>
              {HEADS[i].title[lang]}
            </option>
          ))}
        </select>
        <button className="icon-btn" aria-label={L('Close', 'סגירה')} onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      <p className="tl-progress" data-tl-done={done}>
        <span className="tl-bar" aria-hidden="true">
          <span style={{ inlineSize: `${(done / status.length) * 100}%` }} />
        </span>
        <small>
          {done} / {status.length}
        </small>
      </p>
      <ol className="tl-steps">
        {status.map((st, i) => {
          const state = st.done ? 'done' : st.open ? 'open' : 'locked';
          return (
            <li key={i}>
              <button className={`tl-step ${state}`} disabled={!st.open && !st.done} onClick={() => run(i)} data-tl-step={i} data-tl-state={state}>
                <span className="tl-mark" aria-hidden="true">
                  {st.done ? '✓' : st.open ? i + 1 : ''}
                </span>
                <span className="tl-name">{st.step.name[lang]}</span>
                {st.step.keys12 && (
                  <small className="tl-keys" dir="ltr">
                    {st.keys}/12
                  </small>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
