// 0.110.2 (owner 2026-11-21): when the browser keeps the sound closed, nothing may wait for it in silence. A small bar
// says so; one tap opens the sound (a tap is what browsers require). It goes away by itself once the sound runs.
import { useEffect, useState } from 'react';
import { piano } from './services';

export function SoundBlocked({ lang }: { lang: 'he' | 'en' }) {
  const [on, setOn] = useState(piano.blocked);
  useEffect(() => piano.onBlocked(setOn), []);
  if (!on) return null;
  const he = lang === 'he';
  return (
    <div className="sound-blocked" role="alert" data-sound-blocked="1">
      <span>{he ? 'הדפדפן לא מפעיל צליל.' : 'The browser has not started the sound.'}</span>
      <button type="button" className="btn primary small" onClick={() => void piano.unlock().catch(() => {})} data-sound-open="1">
        {he ? 'להפעיל צליל' : 'Turn sound on'}
      </button>
    </div>
  );
}
