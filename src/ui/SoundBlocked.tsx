// 0.110.2 (owner 2026-11-21): when the browser keeps the sound closed, nothing may wait for it in silence. A small bar
// says so; one tap opens the sound (0.110.3: or opens a fresh audio channel on the default output). It goes away by
// itself once the sound runs; if even that fails it says what to check.
import { useEffect, useState } from 'react';
import { piano } from './services';

export function SoundBlocked({ lang }: { lang: 'he' | 'en' }) {
  const [on, setOn] = useState(piano.blocked);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => piano.onBlocked((b) => (setOn(b), b || setFailed(null))), []);
  if (!on) return null;
  const he = lang === 'he';
  const fix = () => {
    setBusy(true);
    void piano
      .repair()
      .then((st) => setFailed(st === 'running' ? null : st))
      .catch((e) => setFailed(String(e)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="sound-blocked" role="alert" data-sound-blocked={failed ? 'failed' : '1'}>
      <span>
        {failed
          ? he
            ? `הצליל עדיין לא עובד (${failed}). בדקו ב־Windows שיש התקן פלט פעיל, או סגרו ופתחו את האפליקציה.`
            : `Sound still off (${failed}). Check Windows has an active output device, or close and reopen the app.`
          : he
            ? 'הדפדפן לא מפעיל צליל.'
            : 'The browser has not started the sound.'}
      </span>
      <button type="button" className="btn primary small" disabled={busy} onClick={fix} data-sound-open="1">
        {busy ? (he ? 'מפעיל…' : 'Starting…') : failed ? (he ? 'לנסות שוב' : 'Try again') : he ? 'להפעיל צליל' : 'Turn sound on'}
      </button>
    </div>
  );
}
