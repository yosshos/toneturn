// Sing It Back (voice): the piano plays a short phrase in one bar, you sing it back in the next on the same beats.
// Engine: src/engine/singBack.ts; the screen is the beginner shell (BeginnerShell.tsx).

import { DEFAULT_RANGE } from '../engine/vocal';
import { SING_PHRASES, singJudge, singLap } from '../engine/singBack';
import type { BLap, BMark } from '../engine/beginnerRun';
import type { NoteEvent } from '../engine/lesson';
import type { Settings } from '../storage/progress';
import type { GameScreenProps } from './gameProps';
import { BeginnerShell, noteNameIn, type BeginnerCfg } from './BeginnerShell';
import { Sym } from './NewGameBits';

const CFG: BeginnerCfg = {
  game: 'singback',
  title: { en: 'Sing It Back', he: 'שרים בחזרה' },
  blurb: {
    en: 'The piano plays a short phrase in one bar; sing it back in the next bar, on the same beats. Any octave counts.',
    he: 'הפסנתר מנגן משפט קצר בתיבה אחת; שרים אותו בחזרה בתיבה הבאה, על אותן פעמות. כל אוקטבה נחשבת.',
  },
  inputs: ['mic'],
  capture: 'notes',
  // sung notes start softer than played ones: wider windows
  slack: 1.4,
  lapOf: (seed, level, lap, run, settings) => singLap(seed, level, lap, run, settings.voiceRange ?? DEFAULT_RANGE),
  judge: () => singJudge,
  band: (lap, t0) => {
    const beat = 60 / lap.bpm;
    return (lap.calls ?? []).map<NoteEvent>((c) => ({ midi: c.midi, start: t0 + c.beat * beat, duration: c.beats * beat * 0.85, velocity: 0.6, inst: 'piano' }));
  },
  board: ({ lap, match, beat, now, lang, settings }) => <PhraseBoard lap={lap} marks={match?.marks} beat={beat} now={now} lang={lang} settings={settings} />,
  why: ({ lap, m, o, lang, settings }) => {
    const i = o.firstMiss;
    if (i < 0) return null;
    const tg = lap.targets[i];
    const want = noteNameIn(tg.midi!, lap.key, settings, lang);
    const phrase = lap.targets.filter((t) => Math.floor(t.beat / 8) === Math.floor(tg.beat / 8)).map((t) => noteNameIn(t.midi!, lap.key, settings, lang)).join(' ');
    const why = lang === 'he' ? `המשפט היה: ${phrase}.` : `The phrase was: ${phrase}.`;
    const g = m.got[i]?.midi;
    if (m.marks[i] === 'wrong' && g !== undefined) return { line: lang === 'he' ? `${noteNameIn(g, lap.key, settings, lang)} במקום ${want}` : `${noteNameIn(g, lap.key, settings, lang)} instead of ${want}`, why };
    return { line: lang === 'he' ? `${want} לא נשמע בזמן` : `${want} was not heard on time`, why: lang === 'he' ? `${why} מתחילים כל צליל יחד עם הקליק.` : `${why} Start each note with its click.` };
  },
};

function PhraseBoard({ lap, marks, beat, now, lang, settings }: { lap: BLap; marks?: (BMark | undefined)[]; beat: number; now: number; lang: 'he' | 'en'; settings: Settings }) {
  // the phrase on screen: the one the clock is in (the first before the lap starts)
  const ph = beat >= 0 ? Math.min(SING_PHRASES - 1, Math.floor(beat / 8)) : now >= 0 ? Math.floor(lap.targets[now].beat / 8) : 0;
  const listening = beat >= 0 && beat - ph * 8 < 4;
  const idx = lap.targets.map((t, i) => ({ t, i })).filter(({ t }) => Math.floor(t.beat / 8) === ph);
  return (
    <div className="bg-phrase">
      <p className={`bg-cue ${listening ? 'listen' : beat >= 0 ? 'sing' : ''}`} data-bg-cue>
        {beat < 0 ? (lang === 'he' ? `משפט ${ph + 1} מתוך ${SING_PHRASES}` : `Phrase ${ph + 1} of ${SING_PHRASES}`) : listening ? (lang === 'he' ? 'מקשיבים' : 'Listen') : lang === 'he' ? 'שרים' : 'Sing'}
      </p>
      <div className="bg-notes">
        {idx.map(({ t, i }) => (
          <span key={i} className={`bg-note ${marks?.[i] === 'hit' ? 'hit' : ''} ${marks?.[i] === 'wrong' || marks?.[i] === 'miss' ? 'miss' : ''} ${i === now && !listening ? 'now' : ''}`}>
            <Sym text={noteNameIn(t.midi!, lap.key, settings, lang)} />
          </span>
        ))}
      </div>
    </div>
  );
}

export const SingBack = (p: GameScreenProps) => <BeginnerShell cfg={CFG} {...p} />;
