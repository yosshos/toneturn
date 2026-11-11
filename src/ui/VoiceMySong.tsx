// "My song" (VOICE_CURRICULUM F13 L8): open your own recording — it stays on this device — and the melody is taken
// out of it; then the timed session sings along with the recording and scores every phrase against that melody.
// SPEC-MY-SONG: the recordings and their analysis are kept on the device ("My songs", shared with every course), so a
// song is analysed once and picked from the list after that.

import { useState } from 'react';
import { SIMULATED } from './services';
import { mySongPlan } from '../engine/voiceMySong';
import type { SongPlan } from '../engine/voiceSongs';
import type { VoiceRange } from '../engine/vocal';
import { VT } from '../content/voiceCourseText';
import { MySongLibrary } from './MySong';
import type { StoredSong } from '../storage/mySongs';

type Lang = 'he' | 'en';
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);
/** The take is at most 75 s long: the plan keeps the phrases that start before it ends. */
const SUNG_MAX = 74;

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

export function MySongPick({ lang, range, onReady }: { lang: Lang; range: VoiceRange; onReady: (plan: SongPlan, buffer: AudioBuffer, songId?: string) => void }) {
  const L = (b: { en: string; he: string }) => b[lang];
  const [state, setState] = useState<'pick' | 'none'>('pick');
  const [found, setFound] = useState<{ plan: SongPlan; buffer: AudioBuffer; n: number; p: number; id: string } | null>(null);

  const opened = (song: StoredSong, buffer: AudioBuffer) => {
    const m0 = song.analysis?.melody ?? null;
    const notes = m0 ? m0.notes.filter((n) => n.start < SUNG_MAX) : [];
    if (!m0 || notes.length < 6) {
      setFound(null);
      setState('none');
      return;
    }
    const phrases = new Set(notes.map((n) => n.phrase)).size;
    // Phrase numbers stay dense after the cut (they are counted from 0).
    const m = { notes, phrases: Math.max(...notes.map((n) => n.phrase)) + 1 };
    setFound({ plan: mySongPlan(m, range), buffer, n: notes.length, p: phrases, id: song.id });
    setState('pick');
  };

  return (
    <section className="set-card vt-mine" data-my-song={found ? 'found' : state}>
      <h2>{L(VT.mineTitle)}</h2>
      <p className="field-hint">{L(VT.mineHint)}</p>
      {state === 'none' && <p className="take-remark">{L(VT.mineNone)}</p>}
      {found ? (
        <>
          <p className="take-remark">{fill(L(VT.mineFound), { n: found.n, p: found.p })}</p>
          <button className="btn ghost" onClick={() => setFound(null)}>
            {L(VT.mineOther)}
          </button>
          <button className="btn mega" onClick={() => onReady(found.plan, found.buffer, found.id)}>
            {L(VT.next)} <span className="flip-rtl">→</span>
          </button>
        </>
      ) : (
        <MySongLibrary lang={lang} course="voice" onOpen={opened} demo={SIMULATED ? demoBuffer : undefined} />
      )}
    </section>
  );
}
