// Where the sound comes out (0.52): a MIDI keyboard or interface with a headphone jack (iRig Keys I/O, Focusrite…)
// often becomes the system's default output when plugged in, and the app's sound then goes there. Like a DAW, the
// app lets the player choose the output device, and play a test chord on it.
import { useEffect, useState } from 'react';
import { piano } from './services';

type Dev = { id: string; label: string };

export function AudioOutputPicker({ lang, value, onChange }: { lang: 'en' | 'he'; value: string | null; onChange: (id: string | null) => void }) {
  const he = lang === 'he';
  const [devs, setDevs] = useState<Dev[]>([]);
  const [named, setNamed] = useState(true);
  const load = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const outs = all.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
      setNamed(outs.every((d) => !!d.label));
      setDevs(outs.map((d, i) => ({ id: d.deviceId, label: d.label || `${he ? 'התקן' : 'Device'} ${i + 1}` })));
    } catch {
      setDevs([]);
    }
  };
  useEffect(() => {
    void load();
    const on = () => void load();
    navigator.mediaDevices?.addEventListener?.('devicechange', on);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!piano.canChooseOutput || typeof navigator === 'undefined' || !navigator.mediaDevices) return null;
  /** Device names need the microphone permission once (the browser hides them otherwise). */
  const askNames = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((tr) => tr.stop());
    } catch {
      /* declined: numbered devices still work */
    }
    void load();
  };
  const test = async () => {
    await piano.unlock();
    const ctl = new AbortController();
    void piano.play([60, 64, 67, 72].map((m, i) => ({ midi: m, start: i * 0.12, duration: 1.2, velocity: 0.7 })), 1.8, ctl.signal).catch(() => {});
  };
  return (
    <div className="audio-out" data-audio-out="1">
      <label className="field-row">
        <span>{he ? 'יציאת שמע' : 'Sound output'}</span>
        <select
          value={value ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            onChange(id);
            void piano.setOutputDevice(id).then(test);
          }}
          data-audio-out-select="1"
        >
          <option value="">{he ? 'ברירת המחדל של המערכת' : 'System default'}</option>
          {devs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <div className="audio-out-row">
        <button className="btn ghost small" onClick={() => void test()} data-audio-test="1">
          {he ? 'בדיקת צליל' : 'Test sound'}
        </button>
        {!named && (
          <button className="btn ghost small" onClick={() => void askNames()}>
            {he ? 'להציג שמות התקנים' : 'Show device names'}
          </button>
        )}
      </div>
      <p className="field-hint">
        {he
          ? 'לא שומעים? מקלדת או כרטיס קול עם יציאת אוזניות (למשל iRig Keys I/O) הופכים לפעמים ליציאת ברירת המחדל — בחרו כאן את הרמקולים.'
          : 'No sound? A keyboard or interface with a headphone jack (e.g. iRig Keys I/O) sometimes becomes the default output — choose your speakers here.'}
      </p>
    </div>
  );
}
