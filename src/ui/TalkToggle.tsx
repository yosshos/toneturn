// 🔊 / 📖 — the narrator speaks, or the player reads. One switch for the whole app (speech/talk.ts).

import { useEffect, useState } from 'react';
import { onTalk, setTalk, talkOn } from '../speech/talk';
import { paceFor, type KokoroStatus } from '../speech/kokoro/decide';
import { narrator, recordings, tts } from './services';
import { Icon } from './icons';

/** The Kokoro voice's status (Settings: downloading x% / ready / unavailable). */
export function useNarratorStatus(): KokoroStatus {
  const [s, setS] = useState(narrator.state);
  useEffect(() => narrator.onStatus(setS), []);
  return s;
}

/**
 * Is this line spoken (true) or read with a pop per word (false)? And the typing pace: while the voice speaks a
 * line, the text types at the voice's speed (its length is known once the line is made).
 */
export function useNarration(lang: 'he' | 'en', text: string | null, variant?: string): { speaking: boolean; msPerWord: number | undefined } {
  const [talk] = useTalk();
  useNarratorStatus();
  const [, setLoaded] = useState(recordings.loaded);
  useEffect(() => recordings.onChange(() => setLoaded(recordings.loaded)), []);
  const [pace, setPace] = useState<{ text: string; ms: number } | null>(null);
  useEffect(() => {
    const on = (l: { text: string; ms: number }) => setPace({ text: l.text, ms: paceFor(l.text, l.ms) });
    const a = narrator.onLine(on);
    const b = recordings.onLine(on);
    return () => {
      a();
      b();
    };
  }, []);
  const speaking = talk && !!text && (tts.decided(text) ?? tts.speaksLine(text, lang, variant));
  return { speaking, msPerWord: speaking && text && pace?.text === text ? pace.ms : undefined };
}

export function useTalk(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(talkOn);
  useEffect(() => onTalk(setOn), []);
  return [
    on,
    (v: boolean) => {
      if (!v) tts.cancel();
      setTalk(v);
    },
  ];
}

export function TalkToggle({ lang }: { lang: 'he' | 'en' }) {
  const [on, set] = useTalk();
  // 0.64 (owner): Hebrew has no narration (typed text with a pop), so there is nothing to switch.
  if ((lang as string) === 'he') return null;
  const label = on ? (lang === 'he' ? 'הקריינית מדברת — לעבור לקריאה' : 'Narrator on — switch to reading') : lang === 'he' ? 'מצב קריאה — להפעיל את הקריינית' : 'Reading mode — turn the narrator on';
  return (
    <button type="button" className={`talk-toggle ${on ? 'on' : 'off'}`} aria-pressed={on} aria-label={label} title={label} data-talk={on ? 'on' : 'off'} onClick={() => set(!on)}>
      <Icon k={on ? 'speaker' : 'book'} size={18} />
      <span>{on ? (lang === 'he' ? 'קול' : 'Voice') : lang === 'he' ? 'קריאה' : 'Read'}</span>
    </button>
  );
}
