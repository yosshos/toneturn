// Strum Changes (guitar): the chord changes on the bar; strum the new chord on its first beat. Engine:
// src/engine/strumChanges.ts (the strum recogniser is chordFinder.judgeStrum); the screen is the beginner shell.

import { strumJudge, strumLap } from '../engine/strumChanges';
import type { GameScreenProps } from './gameProps';
import { BeginnerShell, noteNameIn, type BeginnerCfg } from './BeginnerShell';
import { ChordBoard } from './RootCatcher';

const CFG: BeginnerCfg = {
  game: 'strumchange',
  title: { en: 'Strum Changes', he: 'החלפות בפריטה' },
  blurb: {
    en: 'The chord changes on the bar. Strum the new chord on beat 1 — change during beat 4. Pairs first, then songs, barre and 7th chords.',
    he: 'האקורד מתחלף בכל תיבה. פורטים את האקורד החדש בפעמה 1 — מחליפים כבר בפעמה 4. קודם זוגות, אחר כך שירים, ברה וספטאקורדים.',
  },
  inputs: ['mic', 'midi'],
  capture: 'strums',
  keyInst: 'guitar',
  // a strum's onset is less sharp than a key press
  slack: 1.25,
  lapOf: (seed, level, lap, run) => strumLap(seed, level, lap, run),
  judge: () => strumJudge,
  board: ({ lap, match, now, lang, settings }) => <ChordBoard lap={lap} marks={match?.marks} now={now} lang={lang} boxes leftHanded={settings?.leftHanded} />,
  why: ({ lap, m, o, lang, settings }) => {
    const i = o.firstMiss;
    if (i < 0) return null;
    const tg = lap.targets[i];
    const sym = tg.label;
    const tones = (tg.tones ?? []).map((p) => noteNameIn(48 + p, lap.key, settings, lang)).join(' ');
    if (m.marks[i] === 'wrong') return { line: lang === 'he' ? `זה לא נשמע כמו ${sym}` : `That did not sound like ${sym}`, why: lang === 'he' ? `${sym}: ${tones}. כל המיתרים צריכים לצלצל.` : `${sym}: ${tones}. Every string should ring.` };
    return { line: lang === 'he' ? `${sym} לא נפרט בפעמה 1` : `No ${sym} on beat 1`, why: lang === 'he' ? 'מרימים את היד כבר בפעמה 4, כך שהאקורד החדש מוכן ב־1.' : 'Lift the hand during beat 4, so the new chord is ready on 1.' };
  },
};

export const StrumChanges = (p: GameScreenProps) => <BeginnerShell cfg={CFG} {...p} />;
