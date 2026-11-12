// Song chords, strummed (GUITAR_DEEPENING): a choice question whose choices are chords ("which chord is under this
// bar?") can be answered on the guitar — the recognizer listens for one strum and names it among the choices only
// (closed set). The answer buttons stay as the fallback. The microphone is open only while "Strum it" is on.

import { useEffect, useState } from 'react';
import type { ChoiceQuestion } from '../engine/lesson';
import { strumAmong } from '../engine/chordFinder';
import { useStrums } from './strumListen';

type Lang = 'he' | 'en';
const T = {
  strumIn: { en: 'Strum it on my guitar', he: 'לפרוט על הגיטרה שלי' },
  stop: { en: 'Stop listening', he: 'להפסיק להקשיב' },
  listening: { en: 'Listening — strum the chord once, every string ringing', he: 'מקשיבים — פרטו את האקורד פעם אחת, כל המיתרים מצלצלים' },
  again: { en: 'Not clear — strum it again, a clean tone', he: 'לא ברור — פרטו שוב, צליל נקי' },
  mic: { en: 'The microphone is not available.', he: 'המיקרופון לא זמין.' },
};

/** "Strum it on my guitar" for a chord-choice question; `onAnswer` gets the choice heard (right or wrong). */
export function StrumChoice({ q, lang, disabled, onAnswer }: { q: ChoiceQuestion; lang: Lang; disabled: boolean; onAnswer: (choice: string) => void }) {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState<'again' | 'mic' | null>(null);
  useEffect(() => {
    if (disabled) setOn(false);
  }, [disabled]);
  useEffect(() => {
    setOn(false);
    setMsg(null);
  }, [q.id]);
  const choices = q.choices.filter((c) => q.strum?.[c]);
  useStrums(
    on && !disabled && choices.length > 1,
    (frames) => {
      const v = strumAmong(
        frames,
        choices.map((c) => q.strum![c]),
      );
      if (v.verdict === 'again' || v.index === undefined) return setMsg('again');
      setMsg(null);
      setOn(false);
      onAnswer(choices[v.index]);
    },
    () => setMsg('mic'),
  );
  if (choices.length < 2) return null;
  return (
    <div className="place-play place-strum" data-strum-choice={on ? 'on' : 'off'}>
      <button type="button" className={`btn small ${on ? 'primary' : ''}`} aria-pressed={on} disabled={disabled} onClick={() => (setMsg(null), setOn((x) => !x))}>
        {on ? T.stop[lang] : T.strumIn[lang]}
      </button>
      {on && (
        <small className="field-hint" role="status">
          {msg === 'again' ? T.again[lang] : msg === 'mic' ? T.mic[lang] : T.listening[lang]}
        </small>
      )}
    </div>
  );
}
