// Text that types itself out word by word with a soft pop (0.64, owner): the reading mode of narrated screens.
// Reduced motion: the whole text at once, no sound. Calls onDone when the last word is in.

import { useEffect, useRef, useState } from 'react';
import { wordPop } from '../audio/pop';

export function TypedText({ text, onDone, msPerWord = 120, sound = true, className = '' }: { text: string; onDone?: () => void; msPerWord?: number; sound?: boolean; className?: string }) {
  const words = text.split(/(\s+)/);
  const count = words.filter((w) => w.trim()).length;
  const reduced = typeof document !== 'undefined' && (document.documentElement.dataset.motion === 'reduced' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));
  const [shown, setShown] = useState(reduced ? count : 0);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    setShown(reduced ? count : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  useEffect(() => {
    if (shown >= count) {
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    // A comma or a full stop gets a breath, like speech.
    const prev = words.filter((w) => w.trim())[shown - 1] ?? '';
    const pause = /[.!?:]$/.test(prev) ? 380 : /[,;—]$/.test(prev) ? 200 : 0;
    const id = setTimeout(() => {
      if (sound) wordPop();
      setShown((n) => n + 1);
    }, msPerWord + pause);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, count]);
  let k = 0;
  return (
    <span className={`typed ${className}`} aria-label={text}>
      {words.map((w, i) => {
        if (!w.trim()) return <span key={i} aria-hidden="true">{w}</span>;
        const n = k++;
        return (
          <span key={i} aria-hidden="true" className={n < shown ? 'tw in' : 'tw'}>
            {w}
          </span>
        );
      })}
    </span>
  );
}
