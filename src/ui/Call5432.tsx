// 5-4-3-2 Call (AUDIT-GAMES §4.2 #2): a number and a chord are called — play that Barry Harris phrase. Rubato first
// (pp–mf), then with the band (f: start in the called bar, ff: every note on its 8th). Six takes, three lives (a take
// under 70 % costs one), MIDI or the microphone, the shared take shell. Engine: src/engine/call5432.ts.

import { CALL_BPM, CALL_FREE, callItem, callPcs, gradeCall, type CallItem } from '../engine/call5432';
import { PHRASE_5432, phrase5432 } from '../engine/harrisLines';
import { realize } from '../engine/progGrid';
import { letterOf, onLetter } from '../engine/commonTone';
import { LINE_RANGE, pc } from '../engine/newGamesKit';
import { takeSeed, type TakeSave } from '../engine/instGames';
import type { GameScreenProps } from './gameProps';
import { piano } from './services';
import { TakeShell, type TakeCtx, type TakeGameCfg, type TakeOutcome, type TakePhase } from './TakeShell';
import { BeatDots, Sym, WhyLine, bandEvents, defaultInput, instOf } from './NewGameBits';
import { chordEvents, freeTake, timedTake } from './ngTake';

type Lang = 'he' | 'en';
const COUNT_IN = 4;
/** The letter steps of a phrase note above the chord root (semitones mod 12 → letters: E♭ on E, C♯ on C). */
const STEPS = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

/** The phrase spelled on the chord's letters ("(G) F D E♭ E"). */
export function phraseNames(it: Pick<CallItem, 'q' | 'n' | 'root' | 'sym'>): string {
  const l = letterOf(it.sym);
  const names = PHRASE_5432[it.q][it.n].map((x) => onLetter(pc(it.root + x.s), l + STEPS[pc(x.s)]) ?? '');
  return it.n === 4 ? `(${names[0]}) ${names.slice(1).join(' ')}` : names.join(' ');
}
const itemOf = (s: TakeSave, i: number) => callItem(takeSeed(s, i), s.level, i);
const bpmOf = (s: TakeSave) => CALL_BPM[s.level] || 92;
const chordsOf = (it: CallItem) => {
  const k = it.key;
  return [realize(k, { deg: '2', q: 'm7', x: 'none', beats: 4 }), realize(k, { deg: '5', q: '7', x: 'none', beats: 4 }), realize(k, { deg: '1', q: 'maj7', x: 'none', beats: 8 })];
};

async function hear(c: { item: CallItem; save: TakeSave; signal: AbortSignal; settings: TakeCtx<CallItem>['settings'] }) {
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  const it = c.item;
  const [lo] = LINE_RANGE[instOf(c.settings)];
  const root = lo + pc(it.root - lo);
  // The learning tiers hear the phrase over its chord; above, the chord (and, timed, the band) only.
  const model = c.save.level <= 2 ? callNotes(it, root) : [];
  if (it.time === 'free') {
    const ev = [...chordEvents({ root: it.root, q: it.q === 'dom' ? '7' : it.q === 'maj' ? 'maj7' : 'm6', x: 'none' }, 2.4), ...model.map((n) => ({ midi: n.p, start: 0.3 + n.beat * 0.45, duration: n.dur * 0.45, velocity: 0.62 }))];
    await piano.play(ev, 2.8, c.signal);
    return;
  }
  const bpm = bpmOf(c.save);
  await piano.play(bandEvents(chordsOf(it), bpm, 0.05), (16 * 60) / bpm + 0.3, c.signal);
}
const callNotes = (it: CallItem, root: number) => phrase5432(root, it.q, it.n, 0, 4);

async function take(c: TakeCtx<CallItem>): Promise<TakeOutcome | 'mic-error' | null> {
  const it = c.item;
  const L = c.lang === 'he';
  const bass = instOf(c.settings) === 'bass';
  let played;
  if (it.time === 'free') {
    const { pcs } = callPcs(it);
    played = await freeTake({ signal: c.signal, input: c.input, settings: c.settings, bass, setPhase: c.setPhase, chord: { root: it.root, q: it.q === 'dom' ? '7' : it.q === 'maj' ? 'maj7' : 'm6', x: 'none' }, need: pcs.length - (it.n === 4 ? 1 : 0), ...CALL_FREE });
  } else played = await timedTake({ signal: c.signal, input: c.input, settings: c.settings, bass, setPhase: c.setPhase, chords: chordsOf(it), bpm: bpmOf(c.save), countIn: COUNT_IN, setCell: c.setCell });
  if (played === null || played === 'mic-error') return played;
  const g = gradeCall(it, played, it.time === 'free' ? 0 : bpmOf(c.save));
  const parts = [`${L ? 'צלילים' : 'notes'} ${g.matched}/${g.of}`];
  if (g.timing !== null) parts.push(`${L ? 'זמן' : 'time'} ${Math.round(g.timing * 100)}%`);
  return { score: g.score, line: parts.join(' · '), marks: g.marks };
}

const TXB = {
  call: { en: 'Phrase', he: 'משפט' },
  on: { en: 'on', he: 'על' },
  bar: { en: 'Bar', he: 'תיבה' },
  rubato: { en: 'Rubato: your own pace', he: 'רובאטו: בקצב שלכם' },
  timed: { en: 'With the band, after the count-in', he: 'עם הלהקה, אחרי הספירה' },
  why: { en: 'The phrase:', he: 'המשפט:' },
};
function CallBoard({ item, save, phase, outcome, cell, lang }: { item: CallItem; save: TakeSave; phase: TakePhase; outcome: TakeOutcome | null; cell: number; lang: Lang }) {
  const timed = item.time !== 'free';
  const names = phraseNames(item);
  return (
    <div className="inst-board c5-board">
      <div className="c5-call" data-c5-call={item.n}>
        <span className="c5-num" dir="ltr">
          {item.n}
        </span>
        <span className="c5-on">
          <small>{TXB.on[lang]}</small> <Sym text={item.sym} className="c5-sym" />
        </span>
      </div>
      {save.level === 1 && phase !== 'review' && (
        <p className="c5-notes">
          <Sym text={names} />
        </p>
      )}
      {timed && item.chart && (
        <>
          <div className="c5-chart" dir="ltr">
            {item.chart.map((s, i) => (
              <span key={i} className={`c5-bar ${i === item.bar ? 'called' : ''}`}>
                {s}
              </span>
            ))}
          </div>
          <BeatDots countIn={COUNT_IN} beats={16} now={phase === 'play' ? cell : -1} targets={[item.bar! * 4]} />
        </>
      )}
      {!timed && phase !== 'review' && <p className="g2-dim c5-mode">{TXB.rubato[lang]}</p>}
      {phase === 'review' && outcome && (
        <div className="c5-marks" dir="ltr">
          {(outcome.marks ?? []).map((m, i) => (
            <i key={i} className={m} />
          ))}
        </div>
      )}
      {phase === 'review' && outcome && outcome.score < 70 && <WhyLine lang={lang} ok={false} line={`${outcome.score}%`} why={`${TXB.why[lang]} ${names}`} />}
    </div>
  );
}

const CALL: TakeGameCfg<CallItem> = {
  game: 'call5432',
  className: 'call5432 ng',
  tx: {
    title: { en: '5-4-3-2 Call', he: 'קריאת 5-4-3-2' },
    blurb: { en: 'A number and a chord are called: play that Barry Harris 5-4-3-2 phrase on the chord. Rubato first, then with the band. Six calls, three lives.', he: 'נקראים מספר ואקורד: מנגנים את משפט ה־5-4-3-2 של בארי האריס על האקורד. קודם רובאטו, אחר כך עם הלהקה. שש קריאות, שלושה חיים.' },
    unit: { en: 'Call', he: 'קריאה' },
    play: { en: 'Play it', he: 'לנגן' },
    playing: { en: 'Play the phrase', he: 'מנגנים את המשפט' },
  },
  inputs: ['mic', 'midi'],
  defaultInput: () => 'mic',
  item: itemOf,
  hear: (c) => hear(c),
  take,
  board: (p) => <CallBoard {...p} />,
  keyOf: (it, settings) => ({ key: it.key, inst: instOf(settings) }),
  card: true,
};

export const Call5432 = (p: GameScreenProps) => <TakeShell cfg={{ ...CALL, defaultInput: () => defaultInput(p.settings) }} {...p} />;
