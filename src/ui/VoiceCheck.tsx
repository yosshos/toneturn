// "Can the app hear me?" for the voice screens (owner 2026-11-15): before a take, one ~44 px row with a hard-edged
// level meter and the detected note; "Got it" once a clear voice is heard; after ~4 s of silence a hint (mic
// permission, input device, volume). During a take, a small non-blocking "We don't hear you" banner when nothing
// arrives for ~3 s after the first expected note.
// In the simulator a synthetic voice answers; under automation (navigator.webdriver) without it the mic stays shut.

import { useEffect, useRef, useState } from 'react';
import { VoiceCheckState } from '../engine/voiceCheck';
import type { SungFrame } from '../engine/sing';
import { midiToHz } from '../engine/pitch';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Settings } from '../storage/progress';
import { SIMULATED } from './services';
import { noteLabel } from './Vocal';
import { NoteName, useTick } from './SingLane';
import type { SingFeed } from './singFeed';

const AUTOMATED = typeof navigator !== 'undefined' && !!navigator.webdriver;

export const VC_TX = {
  test: { en: 'Make a sound', he: 'השמיעו צליל' },
  got: { en: 'Got it', he: 'שומעים אתכם' },
  hint: { en: 'No sound yet: allow the mic, check the input device and volume.', he: 'לא נשמע עדיין: אשרו מיקרופון, בדקו התקן קלט ועוצמה.' },
  denied: { en: 'The mic is blocked: allow it in the browser settings.', he: 'המיקרופון חסום: אשרו אותו בהגדרות הדפדפן.' },
  noVoice: { en: "We don't hear you", he: 'לא שומעים אתכם' },
};

export function VoiceCheck({ settings, lang, active }: { settings: Settings; lang: 'he' | 'en'; active: boolean }) {
  const st = useRef(new VoiceCheckState());
  const lastT = useRef(0);
  const [err, setErr] = useState<string | null>(null);
  const [shut, setShut] = useState(false);
  useTick(8, active);
  useEffect(() => {
    if (!active) return;
    st.current = new VoiceCheckState();
    setErr(null);
    const c = new AbortController();
    const push = (f: SungFrame) => {
      st.current.push(f);
      lastT.current = f.t;
    };
    if (SIMULATED) {
      // A synthetic singer answers after a moment (screenshots, e2e).
      const zero = performance.now();
      const id = window.setInterval(() => {
        const t = (performance.now() - zero) / 1000;
        const on = t > 0.6;
        push({ t, hz: on ? midiToHz(57 + 0.08 * Math.sin(t * 30)) : null, confidence: on ? 0.95 : 0, rms: on ? 0.06 + 0.02 * Math.sin(t * 7) : 0.002 });
      }, 30);
      return () => window.clearInterval(id);
    }
    if (AUTOMATED) {
      setShut(true);
      return;
    }
    // The ticking clock keeps the silence hint honest even when no frame arrives.
    const zero = performance.now();
    const clock = window.setInterval(() => {
      const t = (performance.now() - zero) / 1000;
      if (t - lastT.current > 0.25) push({ t, hz: null, confidence: 0, rms: 0 });
    }, 250);
    void new BrowserPitchCapture()
      .sing({ signal: c.signal, maxMs: 600_000, silenceMs: 600_000, hopMs: 30, onFrame: push })
      .then((r) => {
        if (r.kind === 'error') setErr(VC_TX.denied[lang]);
      });
    return () => {
      c.abort();
      window.clearInterval(clock);
    };
  }, [active, lang]);
  if (!active || shut) return null;
  const s = st.current;
  const bars = 10;
  const lit = Math.round(s.level * bars);
  const hint = err ?? (s.hint(lastT.current) ? VC_TX.hint[lang] : null);
  return (
    <div className={`voice-check${s.got ? ' got' : ''}`} data-voice-check={s.got ? 'got' : 'wait'}>
      <span className="vc-bars" aria-hidden="true" dir="ltr">
        {Array.from({ length: bars }, (_, k) => (
          <span key={k} className={k < lit ? (k === lit - 1 ? 'on now' : 'on') : ''} />
        ))}
      </span>
      <span className="vc-note" aria-hidden="true">
        {s.note === null ? '–' : <NoteName label={noteLabel(s.note, settings)} />}
      </span>
      <span className="vc-msg" role="status">
        {hint ? <small className="vc-hint">{hint}</small> : s.got ? <b>{VC_TX.got[lang]}</b> : <small>{VC_TX.test[lang]}</small>}
      </span>
    </div>
  );
}

/** During a take: nothing heard for 3 s after the first expected note → a small banner over the lane. */
export function NoVoiceBanner({ feed, live, from, lang }: { feed: SingFeed; live: boolean; from: number; lang: 'he' | 'en' }) {
  useTick(4, live);
  if (!live) return null;
  const now = feed.now();
  if (now < from + 3) return null;
  let lastVoiced = -Infinity;
  for (let i = feed.pts.length - 1; i >= 0; i--)
    if (feed.pts[i].m !== null) {
      lastVoiced = feed.pts[i].t;
      break;
    }
  if (now - Math.max(from, lastVoiced) < 3) return null;
  return (
    <div className="no-voice" role="status">
      {VC_TX.noVoice[lang]}
    </div>
  );
}
