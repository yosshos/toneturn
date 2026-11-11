// "Your song" (DRUMS_NICHE_PLAN §2.3 d-song L8): the player types a chord-only chart — one section a line, "= 96" for
// the tempo — and drums its form while the band plays the chords. Chord progressions are not protected, so any real
// song's changes may be typed (no recording is used). The text stays on this device (a convenience, not progress).
import { useState } from 'react';
import type { Drill } from '../engine/drills/types';
import { generate } from '../engine/drills/generate';
import { DEMO_SONGS, ownSongKind, parseTypedSong, sectionName } from '../engine/drills/drumSong';

type Lang = 'he' | 'en';
const KEY = 'toneturn.drumSong';
const load = (): string => {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
};
const save = (s: string) => {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* private mode: the text just isn't kept */
  }
};

export function DrumSongCard({ lang, onRun }: { lang: Lang; onRun: (q: Drill[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(load);
  const parsed = parseTypedSong(text);
  const he = lang === 'he';
  if (!open)
    return (
      <button className="pc-entry drum-song-entry" onClick={() => setOpen(true)} data-drum-song="open">
        <b>{he ? 'השיר שלכם' : 'Your song'}</b>
        <small>{he ? 'הקלידו את האקורדים של שיר — והלהקה תנגן אותו בזמן שאתם מתופפים את הצורה' : 'Type a song’s chords — the band plays them while you drum the form'}</small>
      </button>
    );
  const bars = parsed?.sections.reduce((a, s) => a + s.bars, 0) ?? 0;
  return (
    <section className="card drum-song" data-drum-song="edit">
      <label className="field-label" htmlFor="drum-song-text">
        {he ? 'שורה לכל קטע: "בית 8: Am F C G", ובסוף "= 96" לטמפו' : 'One section a line: "Verse 8: Am F C G", then "= 96" for the tempo'}
      </label>
      <textarea
        id="drum-song-text"
        dir="ltr"
        rows={5}
        value={text}
        placeholder={DEMO_SONGS[0]}
        onChange={(e) => {
          setText(e.target.value);
          save(e.target.value);
        }}
      />
      <p className="field-hint" data-drum-song-parse={parsed ? 'ok' : 'none'}>
        {parsed
          ? `${parsed.sections.map((s) => `${sectionName(s.name, lang)} ${s.bars}`).join(' · ')} · ${bars} ${he ? 'תיבות' : 'bars'}${parsed.bpm ? ` · ♩ ${parsed.bpm}` : ''}`
          : he
            ? 'לדוגמה: בית 8: Am F C G · פזמון 8: F G C Am · = 92'
            : 'For example: Verse 8: Am F C G · Chorus 8: F G C Am · = 92'}
      </p>
      <div className="row">
        <button className="btn ghost" onClick={() => (setText(DEMO_SONGS[0]), save(DEMO_SONGS[0]))}>
          {he ? 'דוגמה' : 'Example'}
        </button>
        <button
          className="btn primary"
          disabled={!parsed}
          data-drum-song-play="1"
          onClick={() => onRun([generate({ family: 'd-song', kind: ownSongKind(text), option: 0, key: 0, hands: 'RL', instrument: 'drums' })])}
        >
          {he ? 'לנגן' : 'Play'}
        </button>
      </div>
    </section>
  );
}
