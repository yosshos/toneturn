// The "record the whole session" switch (SPEC-PHRASE-STUDIO §6.1, owner decision §20.11): in My recordings and on an
// exercise's gate page (Lesson.tsx ExerciseBrief). One continuous file on this device (storage/sessionRec.ts).

import { useEffect, useState } from 'react';
import '../recordings2.css';
import { sessionRecOn, sessionRecSupported, startSessionRec, stopSessionRec, subscribeSessionRec } from '../storage/sessionRec';
import { piano } from './services';

type Lang = 'en' | 'he';
const SX = {
  sessionRec: { en: 'Record the whole session', he: 'להקליט את כל האימון' },
  sessionRecOn: { en: 'Recording the session', he: 'מקליט את האימון' },
  sessionRecHint: { en: 'One continuous file alongside the takes: what the app plays and your microphone while it listens. Stays on this device.', he: 'קובץ אחד רציף לצד הניסיונות: מה שהאפליקציה מנגנת והמיקרופון כשהוא מקשיב. נשאר במכשיר.' },
};

export function SessionRecToggle({ lang, className = '' }: { lang: Lang; className?: string }) {
  const [on, setOn] = useState(sessionRecOn());
  const [busy, setBusy] = useState(false);
  useEffect(() => subscribeSessionRec(() => setOn(sessionRecOn())), []);
  if (!sessionRecSupported()) return null;
  const flip = async () => {
    setBusy(true);
    try {
      if (on) await stopSessionRec();
      else {
        await piano.unlock().catch(() => {});
        await startSessionRec(() => piano.voiceOut());
      }
    } finally {
      setBusy(false);
      setOn(sessionRecOn());
    }
  };
  return (
    <label className={`rec-sesstog ${on ? 'on' : ''} ${className}`} title={SX.sessionRecHint[lang]} data-rec-session-toggle={on ? 'on' : 'off'}>
      <span className="enc-recdot-s" aria-hidden="true" />
      <span className="grow">{on ? SX.sessionRecOn[lang] : SX.sessionRec[lang]}</span>
      <input type="checkbox" className="rec-tog" checked={on} disabled={busy} onChange={() => void flip()} aria-label={SX.sessionRec[lang]} />
    </label>
  );
}
