// Song chords on bass and keys (2026-11-12): a chord-choice question (song-strum) answered on the instrument — a bass
// plays the chord's root (microphone, the bass pitch settings; or MIDI), a keyboard plays the chord on MIDI. The answer
// buttons stay as the fallback (a keyboard without MIDI answers by tapping). The microphone is open only while asked.

import { useEffect, useRef, useState } from 'react';
import type { ChoiceQuestion } from '../engine/lesson';
import { bassRootOf, choiceByChord, choiceByRoot } from '../engine/chordAnswer';
import { bassPitchOpts } from '../engine/yin';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { midi } from '../speech/midi';

type Lang = 'he' | 'en';
const T = {
  bassIn: { en: 'Play the root on my bass', he: 'לנגן את היסוד על הבס שלי' },
  stop: { en: 'Stop listening', he: 'להפסיק להקשיב' },
  bassListening: { en: 'Listening — pluck the chord’s root once and let it ring', he: 'מקשיבים — פרטו את יסוד האקורד פעם אחת ותנו לו לצלצל' },
  midiChord: { en: 'Or play the chord on your MIDI keyboard', he: 'או נגנו את האקורד במקלדת ה־MIDI' },
  midiRoot: { en: 'Or play the root on MIDI', he: 'או נגנו את היסוד ב־MIDI' },
  again: { en: 'Not clear — play it again', he: 'לא ברור — נגנו שוב' },
  mic: { en: 'The microphone is not available.', he: 'המיקרופון לא זמין.' },
};
/** Notes that start within this window count as one chord (ms). */
const CHORD_MS = 320;

export function ChordPlayChoice({ q, lang, disabled, bass, useMidi, lowB, onAnswer }: { q: ChoiceQuestion; lang: Lang; disabled: boolean; /** Bass course: the root answers. */ bass: boolean; useMidi: boolean; lowB?: boolean; onAnswer: (choice: string) => void }) {
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState<'again' | 'mic' | null>(null);
  const choices = q.choices.filter((c) => q.strum?.[c]);
  const opts = q.strum ?? {};
  const answer = useRef(onAnswer);
  answer.current = onAnswer;
  useEffect(() => {
    setOn(false);
    setMsg(null);
  }, [q.id]);
  useEffect(() => {
    if (disabled) setOn(false);
  }, [disabled]);

  // MIDI: notes that start together are one chord (a bass answers with its lowest note).
  useEffect(() => {
    if (!useMidi || disabled || choices.length < 2) return;
    let held: number[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = midi.onNote((m, isOn) => {
      if (!isOn) return;
      held.push(m);
      if (timer) return;
      timer = setTimeout(() => {
        const notes = held;
        held = [];
        timer = null;
        const c = bass ? choiceByRoot(Math.min(...notes), choices, opts) : choiceByChord(notes, choices, opts);
        if (c) {
          setMsg(null);
          answer.current(c);
        } else setMsg('again');
      }, CHORD_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [useMidi, disabled, q.id, bass]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bass by microphone: one plucked note, its pitch class among the choices' roots.
  useEffect(() => {
    if (!on || disabled || !bass) return;
    const ctl = new AbortController();
    void (async () => {
      const cap = new BrowserPitchCapture();
      while (!ctl.signal.aborted) {
        const res = await cap.sing({ signal: ctl.signal, maxMs: 6000, silenceMs: 6000, ...bassPitchOpts(lowB) });
        if (ctl.signal.aborted || res.kind === 'aborted') return;
        if (res.kind === 'error') return setMsg('mic');
        if (res.kind === 'silence') continue;
        const p = bassRootOf(res.frames);
        const c = p === null ? null : choiceByRoot(p, choices, opts);
        if (!c) {
          setMsg('again');
          continue;
        }
        setMsg(null);
        setOn(false);
        answer.current(c);
        return;
      }
    })();
    return () => ctl.abort();
  }, [on, disabled, bass, q.id, lowB]); // eslint-disable-line react-hooks/exhaustive-deps

  if (choices.length < 2) return null;
  return (
    <div className="place-play place-strum" data-chord-play={bass ? 'bass' : 'keys'}>
      {bass && (
        <button type="button" className={`btn small ${on ? 'primary' : ''}`} aria-pressed={on} disabled={disabled} onClick={() => (setMsg(null), setOn((x) => !x))}>
          {on ? T.stop[lang] : T.bassIn[lang]}
        </button>
      )}
      {(on || useMidi || msg) && (
        <small className="field-hint" role="status">
          {msg === 'again' ? T.again[lang] : msg === 'mic' ? T.mic[lang] : on ? T.bassListening[lang] : bass ? T.midiRoot[lang] : T.midiChord[lang]}
        </small>
      )}
    </div>
  );
}
