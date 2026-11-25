// Hands-free between takes (owner 2026-11-21, made app-wide 2026-11-25: "practice IS continuous"): after a take one short
// line (spoken / shown), then the next take follows by itself — again, slower, faster, or the next item — with no button.
// A small Pause holds it; any other button of the review (Again, Slower, Loop, Share …) takes over. A new kind of task
// still opens with its brief (taskBrief.ts: the count-in waits for Ready). Used by the Licks tile and Encore; the
// technique screen has its own copy inside its run (Drills.tsx).
import { useEffect, useRef, useState } from 'react';
import type { TakeMetrics } from '../engine/drills/types';
import { missLine } from '../engine/drills/coach';
import { tts } from './services';
import { Icon } from './icons';

type Lang = 'he' | 'en';
type T2 = { en: string; he: string };

/** How long the line stays on the result (at least), before the next take counts in. */
export const HF_REVIEW_MS = 1800;
/** Automated runs (e2e) look at the review at length: hands-free there only with ?handsfree in the address. */
export const HF_OFF = typeof navigator !== 'undefined' && navigator.webdriver && !new URLSearchParams(typeof location !== 'undefined' ? location.search : '').has('handsfree');

export type HfStep = 'raise' | 'next' | 'again' | 'slower';

/**
 * What follows a take in a list run: clean → faster when the ladder climbs, else the next item; a miss → again, then
 * slower, then the next item ("we'll come back to it"). `miss` counts the misses in a row on the item (the caller's ref).
 */
export function hfStep(m: TakeMetrics, o: { raise: number | null; miss: { current: number }; next?: T2 | null; stay?: boolean }): { line: T2; clean: boolean; step: HfStep } {
  const nextTx: T2 = o.next ? { he: ` עכשיו: ${o.next.he}.`, en: ` Now: ${o.next.en}.` } : { he: '', en: '' };
  if (m.verdict === 'clean') {
    o.miss.current = 0;
    if (o.raise !== null) return { line: { he: `נקי. מהר יותר: ♩${o.raise}.`, en: `Clean. Faster: ♩${o.raise}.` }, clean: true, step: 'raise' };
    if (o.stay) return { line: { he: 'נקי. עוד פעם.', en: 'Clean. Once more.' }, clean: true, step: 'again' };
    return { line: { he: `נקי.${nextTx.he}`, en: `Clean.${nextTx.en}` }, clean: true, step: 'next' };
  }
  const n = ++o.miss.current;
  const ml = missLine(m);
  if (n === 1) return { line: { he: `${ml.he} — שוב.`, en: `${ml.en} — again.` }, clean: false, step: 'again' };
  if (n === 2 || o.stay) return { line: { he: `${ml.he}. לאט יותר.`, en: `${ml.en}. Slower.` }, clean: false, step: 'slower' };
  o.miss.current = 0;
  return { line: { he: `נחזור לזה אחר כך.${nextTx.he}`, en: `We'll come back to this.${nextTx.en}` }, clean: false, step: 'next' };
}

/** The hands-free bar and its timer: schedule a line and what follows it; Pause holds it; any other review button takes over. */
export function useHandsFree(lang: Lang) {
  const [hf, setHf] = useState<{ line: T2; clean: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);
  const speech = useRef<AbortController | null>(null);
  const action = useRef<(() => void) | null>(null);
  const miss = useRef(0);
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    speech.current?.abort();
    action.current = null;
    setHf(null);
    setPaused(false);
  };
  useEffect(() => () => (timer.current && window.clearTimeout(timer.current), speech.current?.abort()), []);
  const schedule = (line: T2, clean: boolean, act: () => void) => {
    action.current = act;
    setHf({ line, clean });
    setPaused(false);
    speech.current?.abort();
    const sp = new AbortController();
    speech.current = sp;
    const t0 = performance.now();
    void tts
      .speak(line[lang], lang, sp.signal)
      .catch(() => {})
      .then(() => {
        if (sp.signal.aborted) return;
        timer.current = window.setTimeout(() => {
          timer.current = null;
          const a = action.current;
          action.current = null;
          setHf(null);
          a?.();
        }, Math.max(0, HF_REVIEW_MS - (performance.now() - t0)) + 300);
      });
  };
  const he = lang === 'he';
  const bar = hf ? (
    <div className={`coach-bar ${hf.clean ? 'ok' : 'miss'}`} data-hf-bar="1">
      <p className="coach-line" aria-live="polite">
        {hf.line[lang]}
      </p>
      <span className="coach-btns">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            if (paused) {
              setPaused(false);
              const a = action.current;
              action.current = null;
              setHf(null);
              a?.();
            } else {
              setPaused(true);
              if (timer.current) window.clearTimeout(timer.current);
              timer.current = null;
              speech.current?.abort();
            }
          }}
          aria-label={paused ? (he ? 'להמשיך' : 'Resume') : he ? 'השהיה' : 'Pause'}
          data-hf-pause={paused ? 'paused' : 'running'}
        >
          <Icon k={paused ? 'play' : 'pause'} size={18} />
        </button>
      </span>
    </div>
  ) : null;
  /** A button of the review pressed (not the bar's): the player takes over, the timer stops. */
  const takeOver = (e: React.MouseEvent) => {
    const b = (e.target as HTMLElement).closest('button');
    if (hf && b && !b.closest('[data-hf-bar]')) stop();
  };
  return { hf, paused, bar, schedule, stop, takeOver, miss };
}
