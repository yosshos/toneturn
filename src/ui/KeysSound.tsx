// Owner 2026-11-20 (Kawai ES920 over MIDI, laptop sound over Bluetooth): a digital piano has its own speakers, and the
// app's echo of the keys arrives late — the "play my keys through the app" switch must be one tap away, not buried in
// Settings → MIDI. A small icon in the top bar while a MIDI keyboard is connected, and one question the first time a
// keyboard connects ("does it make its own sound?").
import { useEffect, useState } from 'react';
import { midi } from '../speech/midi';
import { Icon } from './icons';

/** The names of the connected MIDI inputs, live. */
export function useMidiDevices(enabled: boolean): string[] {
  const [names, setNames] = useState<string[]>(() => (enabled ? [...midi.devices] : []));
  useEffect(() => {
    if (!enabled) return setNames([]);
    setNames([...midi.devices]);
    return midi.onState(() => setNames([...midi.devices]));
  }, [enabled]);
  return names;
}

/** Digital pianos and keyboards with built-in speakers (a name match only pre-selects the answer; the player decides). */
export const HAS_SPEAKERS = /\b(ES\d{3}|CA\d{2,3}|CN\d{2}|KDP|ES-?\d|FP-?\d{1,2}|HP\d{3}|RP\d{3}|LX\d{3}|F701|GO:PIANO|P-?\d{2,3}|YDP|CLP|CVP|ARIUS|DGX|PSR|PX-?S?\d|AP-\d|CDP|PRIVIA|CELVIANO|B2|LP-?\d{3}|XE20|C1 AIR|DIGITAL PIANO|CLAVINOVA)\b/i;

export interface KeysSoundProp {
  on: boolean;
  toggle: () => void;
  lang: 'he' | 'en';
}

/** The top-bar switch: shown only while a MIDI keyboard is connected. */
export function KeysSoundButton({ on, toggle, lang }: KeysSoundProp) {
  const devices = useMidiDevices(true);
  if (!devices.length) return null;
  const label = lang === 'he' ? (on ? 'צליל הקלידים באפליקציה: פועל. הקשה מכבה' : 'צליל הקלידים באפליקציה: כבוי. הקשה מפעילה') : on ? 'App sound for your keys: on. Tap to turn off' : 'App sound for your keys: off. Tap to turn on';
  return (
    <button type="button" className={`icon-btn hdr-action keys-sound-btn ${on ? 'on' : 'off'}`} onClick={toggle} aria-label={label} title={label} aria-pressed={on} data-keys-sound={on ? 'on' : 'off'}>
      <Icon k={on ? 'speaker' : 'mute'} size={19} />
    </button>
  );
}

/** The one question when a keyboard first connects. */
export function KeysSoundAsk({ device, lang, onAnswer }: { device: string; lang: 'he' | 'en'; onAnswer: (appSound: boolean) => void }) {
  const he = lang === 'he';
  const own = HAS_SPEAKERS.test(device);
  return (
    <div className="sheet-backdrop" onClick={() => onAnswer(!own)}>
      <div className="sheet keys-sound-sheet" role="dialog" aria-modal="true" aria-labelledby="keys-sound-title" onClick={(e) => e.stopPropagation()} data-keys-sound-ask>
        <h2 id="keys-sound-title">{he ? 'המקלדת משמיעה צליל בעצמה?' : 'Does your keyboard make its own sound?'}</h2>
        <p>
          <bdi dir="ltr">{device}</bdi>
        </p>
        <p className="muted">{he ? 'לפסנתר דיגיטלי יש רמקולים, וצליל הקלידים מהאפליקציה מגיע באיחור קטן. אפשר לשנות בכל רגע מהכפתור למעלה.' : 'A digital piano has speakers, and the app’s sound for your keys comes a little late. Change it any time with the button at the top.'}</p>
        <div className="keys-sound-choices">
          <button className={`btn ${own ? 'primary' : ''}`} onClick={() => onAnswer(false)} data-keys-sound-answer="own">
            {he ? 'כן, רק הצליל של המקלדת' : 'Yes, only my keyboard’s sound'}
          </button>
          <button className={`btn ${own ? '' : 'primary'}`} onClick={() => onAnswer(true)} data-keys-sound-answer="app">
            {he ? 'לא, לנגן דרך האפליקציה' : 'No, play through the app'}
          </button>
        </div>
      </div>
    </div>
  );
}
