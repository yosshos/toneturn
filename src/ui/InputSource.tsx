// SPEC-INPUT-SOURCE R2 / R3 on screen: the live input status (a small chip above Play, the Settings summary) and the
// expected-MIDI line (a keyboard this device has had is not there: reconnect, or the microphone for this session).
import { useEffect, useState } from 'react';
import { midi } from '../speech/midi';
import { chooseMicThisSession, inputSource, inputStatusText, type InputDecision, type ItemInput } from '../speech/inputSource';
import { UNNAMED_MIDI } from '../storage/deviceProfiles';
import type { Drill } from '../engine/drills/types';
import { Icon } from './icons';

/** The decision for an item, live: it follows keyboards plugged in and out. */
export function useInputDecision(item?: ItemInput | Pick<Drill, 'sung' | 'spec'>, o: { kitMic?: boolean } = {}): InputDecision {
  const [, setTick] = useState(0);
  useEffect(() => midi.onState(() => setTick((x) => x + 1)), []);
  return inputSource(item, o);
}

/** R1: the permission prompt only from a tap — "connect a keyboard" / "reconnect" (no reload needed for a hot-plug). */
export function connectKeyboard(): Promise<unknown> {
  return midi.supported ? midi.enable().catch(() => []) : Promise.resolve([]);
}

/** R2: the small chip above Play: which input this take listens to, live (a MIDI take's strip names its keyboard
 *  itself — "MIDI: <device>" — so the takes show the chip for the microphone: why it is the mic). */
export function InputSourceChip({ d, lang }: { d: InputDecision; lang: 'he' | 'en' }) {
  const he = lang === 'he';
  // a keys take on the mic in a browser that has MIDI but was never granted it: one small link asks (a tap = the prompt)
  const offerConnect = d.src === 'mic' && d.reason === 'no-keyboard' && !midi.enabled;
  return (
    <p className={`input-src-chip src-${d.src}`} role="status" aria-live="polite" data-input-src={d.src} data-input-reason={d.reason}>
      {d.src === 'mic' ? <Icon k="mic" size={14} /> : <span className="isc-dot" aria-hidden="true" />}
      <bdi>{inputStatusText(d, lang)}</bdi>
      {offerConnect && (
        <button type="button" className="link isc-connect" onClick={() => void connectKeyboard()} data-input-connect="1">
          {he ? 'חיבור מקלדת' : 'Connect a keyboard'}
        </button>
      )}
    </p>
  );
}

/**
 * R3 / R4: the keyboard this device expects is not there (before a take) or went away (during one). The take does not
 * start; two small actions: reconnect (re-runs the MIDI enable) and the microphone for this session.
 */
export function MidiGuardLine({ lang, expected, lost, onMic }: { lang: 'he' | 'en'; expected: readonly string[]; lost?: boolean; onMic: () => void }) {
  const he = lang === 'he';
  const name = expected.filter((n) => n !== UNNAMED_MIDI).slice(-1)[0];
  const [trying, setTrying] = useState(false);
  const what = name ? <bdi dir="ltr">{name}</bdi> : he ? 'המקלדת' : 'your keyboard';
  return (
    <div className="midi-guard" role="alert" data-midi-missing="1" data-midi-lost={lost ? '1' : undefined}>
      <p>
        {lost
          ? he
            ? <>החיבור ל{name ? <>־{what}</> : 'מקלדת'} נותק באמצע, אז הניסיון לא נספר.</>
            : <>{name ? what : 'Your keyboard'} disconnected mid-take, so this take did not count.</>
          : he
            ? <>{name ? what : 'המקלדת'} לא מחוברת. התרגיל מחכה למקלדת.</>
            : <>{name ? what : 'Your keyboard'} is not connected. The take waits for it.</>}
      </p>
      <span className="midi-guard-actions">
        <button
          type="button"
          className="btn small"
          disabled={trying}
          onClick={() => {
            setTrying(true);
            void connectKeyboard().finally(() => setTrying(false));
          }}
          data-midi-reconnect="1"
        >
          {he ? 'חיבור מחדש' : 'Reconnect'}
        </button>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => {
            chooseMicThisSession();
            onMic();
          }}
          data-midi-missing-mic="1"
        >
          {he ? 'מיקרופון לסשן הזה' : 'Use the mic this session'}
        </button>
      </span>
    </div>
  );
}
