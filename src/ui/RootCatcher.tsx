// Root Catcher (bass): the chords change bar by bar; play each chord's root on its first beat. Engine:
// src/engine/rootCatcher.ts; the screen is the beginner shell (BeginnerShell.tsx).

import { KEY_SHOW, type BLap, type BMark, type BTarget } from '../engine/beginnerRun';
import { shapesFor } from '../engine/chordFinder';
import type { ChordQuality } from '../engine/chordRecognize';
import type { Diagram } from '../engine/lesson';
import { ChordPair } from './Instrument';
import { ROOT_LEVELS, rootBand, rootJudge, rootLap } from '../engine/rootCatcher';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { BeginnerShell, noteNameIn, type BeginnerCfg } from './BeginnerShell';
import { Sym } from './NewGameBits';

const CFG: BeginnerCfg = {
  game: 'rootcatch',
  title: { en: 'Root Catcher', he: 'תופס השורשים' },
  blurb: {
    en: 'The chords change on the bar. Play each chord’s root on beat 1, any octave. Later only the numerals are shown.',
    he: 'האקורדים מתחלפים בכל תיבה. מנגנים את השורש של כל אקורד בפעמה 1, בכל אוקטבה. בהמשך מוצגות רק הספרות הרומיות.',
  },
  inputs: ['mic', 'midi'],
  capture: 'notes',
  bass: true,
  keyInst: 'bass',
  lapOf: (seed, level, lap, run) => rootLap(seed, level, lap, run),
  judge: rootJudge,
  band: (lap, t0) => {
    const beat = 60 / lap.bpm;
    const ev: NoteEvent[] = [];
    lap.targets.forEach((t, i) => {
      const len = ((lap.targets[i + 1]?.beat ?? lap.beats) - t.beat) * beat;
      for (const m of rootBand(t)) ev.push({ midi: m, start: t0 + t.beat * beat, duration: Math.min(len, 2 * beat) * 0.8, velocity: 0.26, inst: 'piano' });
    });
    return ev;
  },
  board: ({ lap, match, now, lang }) => <ChordBoard lap={lap} marks={match?.marks} now={now} lang={lang} numerals={!!ROOT_LEVELS[lap.level]?.numerals} minor={!!ROOT_LEVELS[lap.level]?.minor} />,
  why: ({ lap, m, o, lang, settings }) => {
    const i = o.firstMiss;
    if (i < 0) return null;
    const tg = lap.targets[i];
    const keyMajor = ROOT_LEVELS[lap.level]?.minor ? ((lap.key ?? 0) + 3) % 12 : lap.key;
    const root = noteNameIn(48 + tg.pcs![0], keyMajor, settings, lang);
    const sym = tg.label;
    const why = lang === 'he' ? `השורש של ${sym} הוא ${root}${tg.num ? ` (${tg.num})` : ''}.` : `The root of ${sym} is ${root}${tg.num ? ` (${tg.num})` : ''}.`;
    const g = m.got[i]?.midi;
    if (m.marks[i] === 'wrong' && g !== undefined) {
      const got = noteNameIn(g, keyMajor, settings, lang);
      return { line: lang === 'he' ? `${got} על ${sym}` : `${got} on ${sym}`, why };
    }
    return { line: lang === 'he' ? `אין שורש על ${sym} בפעמה 1` : `No root on ${sym} on beat 1`, why };
  },
};

/** The chord now (big), the next one, and the lap's strip of changes with their marks. */
export function ChordBoard({ lap, marks, now, lang, numerals = false, minor = false, boxes = false, leftHanded }: { lap: BLap; marks?: (BMark | undefined)[]; now: number; lang: 'he' | 'en'; numerals?: boolean; minor?: boolean; /** Strum Changes (GUITAR-AUDIT §2.4): the shapes of the chord now and the next one. */ boxes?: boolean; leftHanded?: boolean }) {
  const cur = lap.targets[Math.max(0, now)];
  const next = lap.targets[Math.max(0, now) + 1];
  const boxOf = (t: BTarget | undefined): Diagram | null => {
    if (!boxes || !t?.chord) return null;
    const sh = shapesFor(t.chord.root, t.chord.quality as ChordQuality)[0];
    return sh ? { kind: 'box', instrument: 'guitar', ...sh.box } : null;
  };
  const show = (i: number) => (numerals ? (lap.targets[i].num ?? '') : lap.targets[i].label);
  return (
    <div className="bg-chords">
      {lap.key !== null && (
        <p className="bg-chips">
          <span className="ng-chip">
            {lang === 'he' ? 'סולם ' : 'Key of '}
            <Sym text={`${KEY_SHOW[lap.key]}${minor ? 'm' : ''}`} />
          </span>
        </p>
      )}
      <div className={`gtr-now ${now >= 0 && marks?.[now] === 'hit' ? 'hit' : ''}`} data-bg-now>
        <Sym text={show(lap.targets.indexOf(cur))} className="gtr-cur" />
        {next && (
          <span className="gtr-next">
            <Sym text={lang === 'he' ? `${show(lap.targets.indexOf(next))} ←` : `→ ${show(lap.targets.indexOf(next))}`} />
          </span>
        )}
      </div>
      {boxes && <ChordPair now={boxOf(cur)} next={next && next.label !== cur?.label ? boxOf(next) : null} lang={lang} leftHanded={leftHanded} />}
      <div className={`gtr-strip bg-strip n${lap.targets.length}`} dir="ltr">
        {lap.targets.map((_, i) => (
          <span key={i} className={`gtr-cell ${marks?.[i] === 'hit' ? 'hit' : ''} ${marks?.[i] === 'wrong' || marks?.[i] === 'miss' ? 'miss' : ''} ${i === now ? 'now' : ''}`}>
            {show(i)}
          </span>
        ))}
      </div>
    </div>
  );
}

export const RootCatcher = (p: GameScreenProps) => <BeginnerShell cfg={CFG} {...p} />;
