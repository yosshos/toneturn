// "My song" (VOICE_CURRICULUM F13 L8): open your own recording — it stays on this device — and the melody is taken
// out of it; then the timed session sings along with the recording and scores every phrase against that melody.

import { useState } from 'react';
import { SIMULATED } from './services';
import { framesFromSamples, melodyFromFrames, mySongPlan } from '../engine/voiceMySong';
import type { SongPlan } from '../engine/voiceSongs';
import type { VoiceRange } from '../engine/vocal';
import { VT } from '../content/voiceCourseText';

type Lang = 'he' | 'en';
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

/** A short synthetic "recording" for the simulator (screenshots, e2e): a sung phrase twice, as samples. */
function demoBuffer(): AudioBuffer {
  const sr = 22050;
  const notes = [60, 62, 64, 65, 67, 65, 64, 62, -1, 64, 65, 67, 69, 67, 65, 64, 60];
  const ctx = new OfflineAudioContext(1, Math.round(sr * notes.length * 0.45), sr);
  const buf = ctx.createBuffer(1, Math.round(sr * notes.length * 0.45), sr);
  const d = buf.getChannelData(0);
  notes.forEach((m, k) => {
    if (m < 0) return;
    const f = 440 * 2 ** ((m - 69) / 12);
    for (let i = 0; i < sr * 0.4; i++) d[Math.round(k * 0.45 * sr) + i] = 0.4 * Math.sin((2 * Math.PI * f * i) / sr);
  });
  return buf;
}

export function MySongPick({ lang, range, onReady }: { lang: Lang; range: VoiceRange; onReady: (plan: SongPlan, buffer: AudioBuffer) => void }) {
  const L = (b: { en: string; he: string }) => b[lang];
  const [state, setState] = useState<'pick' | 'working' | 'none'>('pick');
  const [pct, setPct] = useState(0);
  const [found, setFound] = useState<{ plan: SongPlan; buffer: AudioBuffer; n: number; p: number } | null>(null);

  const analyse = async (buffer: AudioBuffer) => {
    setState('working');
    setPct(0);
    const frames = await framesFromSamples(buffer.getChannelData(0), buffer.sampleRate, { onProgress: (p) => setPct(Math.round(p * 100)) });
    const m = melodyFromFrames(frames);
    if (!m) {
      setState('none');
      return;
    }
    setFound({ plan: mySongPlan(m, range), buffer, n: m.notes.length, p: m.phrases });
    setState('pick');
  };
  const open = async (f: File | undefined) => {
    if (!f) return;
    try {
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(await f.arrayBuffer());
      void ctx.close();
      await analyse(buffer);
    } catch {
      setState('none');
    }
  };

  return (
    <section className="set-card vt-mine" data-my-song={state}>
      <h2>{L(VT.mineTitle)}</h2>
      <p className="field-hint">{L(VT.mineHint)}</p>
      {state === 'working' && (
        <p className="vocal-cue" aria-live="polite">
          {L(VT.mineWorking)} <span dir="ltr">{pct}%</span>
        </p>
      )}
      {state === 'none' && <p className="take-remark">{L(VT.mineNone)}</p>}
      {found && state === 'pick' && <p className="take-remark">{fill(L(VT.mineFound), { n: found.n, p: found.p })}</p>}
      {state !== 'working' && (
        <label className="btn ghost">
          {found ? L(VT.mineOther) : L(VT.minePick)}
          <input type="file" accept="audio/*" className="sr-only" onChange={(e) => void open(e.target.files?.[0])} />
        </label>
      )}
      {SIMULATED && !found && state !== 'working' && (
        <button className="btn ghost" data-my-song-demo="1" onClick={() => void analyse(demoBuffer())}>
          {lang === 'he' ? 'הקלטת הדגמה' : 'Demo recording'}
        </button>
      )}
      {found && state === 'pick' && (
        <button className="btn mega" onClick={() => onReady(found.plan, found.buffer)}>
          {L(VT.next)} <span className="flip-rtl">→</span>
        </button>
      )}
    </section>
  );
}
