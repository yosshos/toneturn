// Enclosure Target (AUDIT-GAMES §4.2 #3): a chord tone is the target — approach it with the named enclosure and land it
// on the beat (pp rubato: the shape first). Eight takes, three lives, MIDI or the microphone, the shared take shell.
// Engine: src/engine/enclosure.ts.

import { DEG_NAME, ENC_BPM, ENC_FREE, encItem, gradeEnc, leadName, type EncItem, type EncMark } from '../engine/enclosure';
import { letterOf, onLetter } from '../engine/commonTone';
import { LINE_RANGE, pc } from '../engine/newGamesKit';
import { takeSeed, type TakeSave } from '../engine/instGames';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { TakeShell, type TakeCtx, type TakeGameCfg, type TakeOutcome, type TakePhase } from './TakeShell';
import { BeatDots, Sym, WhyLine, bandEvents, defaultInput, instOf } from './NewGameBits';
import { chordEvents, freeTake, timedTake } from './ngTake';
import { IsoMix } from './Iso';

type Lang = 'he' | 'en';
const COUNT_IN = 4;
const itemOf = (s: TakeSave, i: number) => encItem(takeSeed(s, i), s.level, i);
const bpmOf = (s: TakeSave) => ENC_BPM[s.level] || 88;
const STEPS = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

/** The target's name on the chord's letters (E, the 3rd of Cmaj7). */
const targetName = (it: EncItem, k: number): string => {
  const t = it.targets[k];
  const c = it.chords[t.chord];
  return onLetter(t.pc, letterOf(c.sym) + STEPS[pc(t.pc - c.root)]) ?? '';
};
/** The whole figure, spelled ("F E♭ E"): the lead-ins as written around the target, then the target. */
const figureNames = (it: EncItem, k: number): string => {
  const t = it.targets[k];
  const T = 60 + t.pc;
  const flat = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  return [...t.semis.map((s) => flat[pc(T + s)]), targetName(it, k)].join(' ');
};

async function hear(c: { item: EncItem; save: TakeSave; signal: AbortSignal; settings: TakeCtx<EncItem>['settings'] }) {
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  const it = c.item;
  const [lo] = LINE_RANGE[instOf(c.settings)];
  // The band (or the chord) with the model figure: the lead-in 8ths, the target on its beat.
  const bpm = it.time === 'free' ? 84 : bpmOf(c.save);
  const beat = 60 / bpm;
  const ev = it.time === 'free' ? chordEvents(it.chords[0], 3) : bandEvents(it.chords, bpm, 0.05);
  for (const t of it.targets) {
    const T = lo + pc(t.pc - lo);
    t.semis.forEach((s, k) => ev.push({ midi: T + s, start: 0.05 + (t.beat - (t.semis.length - k) * 0.5) * beat, duration: beat * 0.45, velocity: 0.62 }));
    ev.push({ midi: T, start: 0.05 + t.beat * beat, duration: beat * 1.6, velocity: 0.7 });
  }
  await piano.play(ev, (it.beats + 1) * beat + 0.3, c.signal);
}

async function take(c: TakeCtx<EncItem>): Promise<TakeOutcome | 'mic-error' | null> {
  const it = c.item;
  const L = c.lang === 'he';
  const bass = instOf(c.settings) === 'bass';
  const played =
    it.time === 'free'
      ? await freeTake({ signal: c.signal, input: c.input, settings: c.settings, bass, setPhase: c.setPhase, chord: it.chords[0], need: it.targets[0].semis.length + 1, ...ENC_FREE })
      : await timedTake({ signal: c.signal, input: c.input, settings: c.settings, bass, setPhase: c.setPhase, chords: it.chords, bpm: bpmOf(c.save), countIn: COUNT_IN, setCell: c.setCell });
  if (played === null || played === 'mic-error') return played;
  const g = gradeEnc(it, played, it.time === 'free' ? 0 : bpmOf(c.save));
  const m = g.marks;
  const shape = Math.round((100 * m.reduce((a, x) => a + x.shape, 0)) / m.length);
  const parts = [`${L ? 'מטרה' : 'target'} ${m.filter((x) => x.found).length}/${m.length}`, `${L ? 'כיתור' : 'shape'} ${shape}%`];
  const off = m.find((x) => x.offMs !== null && Math.abs(x.offMs) > 40);
  if (off && off.offMs !== null) parts.push(`${Math.abs(off.offMs)} ms ${off.offMs > 0 ? (L ? 'מאחר' : 'late') : L ? 'מקדים' : 'early'}`);
  return { score: g.score, line: parts.join(' · '), marks: m.map(markOf) };
}
const markOf = (m: EncMark): string => (!m.found ? 'miss' : m.shape < 1 ? 'shape' : m.timing !== null && m.timing < 1 ? 'late' : 'hit');

const TXB = {
  target: { en: 'Target', he: 'מטרה' },
  of: { en: 'of', he: 'של' },
  rubato: { en: 'Rubato: shape first', he: 'רובאטו: קודם הצורה' },
  why: { en: 'Play:', he: 'לנגן:' },
};
function EncBoard({ item, phase, outcome, cell, lang }: { item: EncItem; save: TakeSave; phase: TakePhase; outcome: TakeOutcome | null; cell: number; lang: Lang }) {
  const timed = item.time === 'strict';
  return (
    <div className="inst-board enc-board">
      <div className="enc-targets">
        {item.targets.map((t, k) => (
          <div key={k} className={`enc-target ${phase === 'review' && outcome?.marks?.[k] ? outcome.marks[k] : ''}`} data-enc-target={k}>
            <span className="enc-note">
              <Sym text={targetName(item, k)} />
            </span>
            <span className="enc-what">
              <span>
                {DEG_NAME[t.deg][lang]} {TXB.of[lang]} <Sym text={item.chords[t.chord].sym} />
              </span>
              <small>
                <IsoMix text={leadName(t.lead)[lang]} />
              </small>
            </span>
          </div>
        ))}
      </div>
      {timed ? (
        <>
          <div className="c5-chart" dir="ltr">
            {item.chords.map((c, i) => (
              <span key={i} className="c5-bar" style={{ flexGrow: c.beats }}>
                {c.sym}
              </span>
            ))}
          </div>
          <BeatDots countIn={COUNT_IN} beats={item.beats} now={phase === 'play' ? cell : -1} targets={item.targets.map((t) => t.beat)} />
        </>
      ) : (
        phase !== 'review' && <p className="g2-dim c5-mode">{TXB.rubato[lang]}</p>
      )}
      {phase === 'review' && outcome && outcome.score < 70 && <WhyLine lang={lang} ok={false} line={`${outcome.score}%`} why={`${TXB.why[lang]} ${item.targets.map((_, k) => figureNames(item, k)).join(' | ')}`} />}
    </div>
  );
}

const ENC: TakeGameCfg<EncItem> = {
  game: 'enclosure',
  className: 'enclosure ng',
  tx: {
    title: { en: 'Enclosure Target', he: 'מטרת הכיתור' },
    blurb: { en: 'A chord tone is the target. Approach it with the named enclosure and land it on the marked beat. Eight targets, three lives.', he: 'צליל של האקורד הוא המטרה. מתקרבים אליו בכיתור שנקרא ונוחתים עליו בפעמה המסומנת. שמונה מטרות, שלושה חיים.' },
    unit: { en: 'Target', he: 'מטרה' },
    play: { en: 'Play it', he: 'לנגן' },
    playing: { en: 'Land the target on the beat', he: 'נוחתים על המטרה בפעמה' },
  },
  inputs: ['mic', 'midi'],
  defaultInput: () => 'mic',
  item: itemOf,
  hear: (c) => hear(c),
  take,
  board: (p) => <EncBoard {...p} />,
  keyOf: (it, settings) => ({ key: it.key, inst: instOf(settings) }),
  card: true,
};

export const EnclosureTarget = (p: GameScreenProps) => <TakeShell cfg={{ ...ENC, defaultInput: () => defaultInput(p.settings) }} {...p} />;
