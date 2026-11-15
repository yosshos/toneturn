// Elevator (AUDIT-GAMES §4.2 #10; BARRY-HARRIS-METHOD F1.2 / E21 / E22): Thomas Echols's floors on the 6th-diminished
// scales. A floor is asked (from a unison, one floor up, under a melody note, or a borrowing); build the voicing on the
// keys — tap them, or play them on a MIDI keyboard (the chord counts once the keys settle) — and hear it. Engine:
// src/engine/elevator.ts.
import { useEffect, useRef, useState } from 'react';
import { elevatorCase, FLOOR_NAME, FREE_MIDDLE, judgeElevator, noteName, padRange, scaleTitle, type ElevatorCase } from '../engine/elevator';
import { IsoMix } from './Iso';
import { midi as midiInput } from '../speech/midi';
import type { GameScreenProps } from './gameProps';
import { CaseShell, type BoardCtx, type CaseGameCfg } from './CaseShell';
import { KeysPad } from './Instrument';
import { piano } from './services';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const TX = {
  floor: { en: 'Floor', he: 'קומה' },
  from: { en: 'from ', he: 'מ־' },
  under: { en: 'under ', he: 'מתחת ל־' },
  upFrom: { en: 'Take it up one floor', he: 'עולים קומה אחת' },
  borrow: (n: number): Bi => ({ en: `Borrow: the top ${n === 1 ? 'voice' : `${n} voices`} one step up`, he: n === 1 ? 'שאילה: הקול העליון צעד אחד למעלה' : `שאילה: ${n} הקולות העליונים צעד אחד למעלה` }),
  hear: { en: 'Hear', he: 'לשמוע' },
  check: { en: 'Check', he: 'לבדוק' },
  clear: { en: 'Clear', he: 'לנקות' },
  waiting: { en: 'Build it on the keys', he: 'בונים על הקלידים' },
  outer: { en: 'The outer voices step out together: the top up the scale, the bottom down, one step a floor.', he: 'הקולות החיצוניים זזים יחד: העליון עולה בסולם, התחתון יורד, צעד לכל קומה.' },
  inner: { en: 'The middle comes from the same chord as the outer voices (both on the 6, or both on the dim).', he: 'האמצע בא מאותו אקורד של הקולות החיצוניים (שניהם על ה־6, או שניהם על הדים).' },
  count: { en: 'This floor has a set number of voices.', he: 'לקומה הזאת יש מספר קולות קבוע.' },
  borrowWhy: { en: 'Borrowing moves only the named voices, each to the next scale note — into the other chord.', he: 'בשאילה זזים רק הקולות שנקראו, כל אחד לצליל הבא בסולם — אל האקורד השני.' },
};

const askOf = (c: ElevatorCase, lang: Lang): string => {
  const fl = `${TX.floor[lang]} ${c.floor} (${FLOOR_NAME[c.floor][lang]})`;
  if (c.kind === 'borrow') return TX.borrow(c.borrow ?? 1)[lang];
  if (c.kind === 'next') return `${TX.upFrom[lang]}: ${fl}`;
  if (c.kind === 'melody') return `${fl} ${TX.under[lang]}${noteName(c.shown[0])}`;
  return `${fl} ${TX.from[lang]}${noteName(c.shown[0])}`;
};

const chord = (notes: number[], start = 0, dur = 1.1) => notes.map((m) => ({ midi: m, start, duration: dur, velocity: 0.5 }));

function Board({ run, idx, input, lang, done, answer }: BoardCtx<'elevator'>) {
  const c = elevatorCase(run.seed, idx, run.level);
  const [held, setHeld] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const heldRef = useRef(new Set<number>());
  const timer = useRef<number | null>(null);
  const answered = useRef(false);
  const [lo, hi] = padRange(c);

  const sound = (notes: number[]) => void piano.unlock().then(() => piano.play(chord(notes), 1.3, new AbortController().signal)).catch(() => {});
  useEffect(() => {
    sound(c.shown);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const judge = (notes: number[]) => {
    if (answered.current || done) return;
    answered.current = true;
    const j = judgeElevator(c, notes);
    setVerdict(j.ok);
    // hear the right voicing (the reveal shows it)
    window.setTimeout(() => sound(c.answer), 150);
    const why = c.kind === 'borrow' ? TX.borrowWhy : j.why === 'outer' ? TX.outer : j.why === 'count' ? TX.count : TX.inner;
    answer({ got: j.ok ? 1 : 0, of: 1, was: c.answer.map((m) => NAMES[m % 12]).join(' '), why, key: c.t % 12 });
  };

  useEffect(() => {
    if (input !== 'midi' || done) return;
    let alive = true;
    void midiInput.enable().catch(() => {});
    const want = c.kind !== 'borrow' && FREE_MIDDLE.has(c.floor) ? 2 : c.answer.length;
    const unsub = midiInput.onNote((note, on) => {
      if (!alive || answered.current) return;
      if (on) heldRef.current.add(note);
      else heldRef.current.delete(note);
      setHeld([...heldRef.current].sort((a, b) => a - b));
      if (timer.current) clearTimeout(timer.current);
      if (!on) return;
      timer.current = window.setTimeout(() => {
        const notes = [...heldRef.current];
        if (notes.length >= Math.min(want, c.answer.length)) judge(notes);
      }, 350);
    });
    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, done]);

  const tap = (m: number) => {
    if (done) return;
    const s = heldRef.current;
    if (s.has(m)) s.delete(m);
    else s.add(m);
    setHeld([...s].sort((a, b) => a - b));
    void piano.play([{ midi: m, start: 0, duration: 0.4, velocity: 0.5 }], 0.5, new AbortController().signal).catch(() => {});
  };

  const given = new Set(c.shown);
  const marks = done
    ? [...c.answer.map((m) => ({ m, tone: verdict ? 'ok' : 'answer' })), ...held.filter((m) => !c.answer.includes(m)).map((m) => ({ m, tone: 'wrong' }))]
    : [...[...given].filter((m) => !held.includes(m)).map((m) => ({ m, tone: 'given' })), ...held.map((m) => ({ m, tone: 'mine' }))];

  return (
    <>
      <div className="ng-row">
        <span className="ng-chip">
          <bdi dir="ltr">{scaleTitle(c)}</bdi>
        </span>
        <button type="button" className="btn ghost ng-replay" onClick={() => sound(done ? c.answer : c.shown)} data-el-hear>
          {TX.hear[lang]}
        </button>
      </div>
      <div className="el-floors" dir="ltr" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
          <span key={f} className={f === c.floor ? 'on' : c.kind === 'next' && f === c.floor - 1 ? 'from' : ''}>
            {f}
          </span>
        ))}
      </div>
      <p className="ng-ask">
        <IsoMix text={askOf(c, lang)} />
      </p>
      <p className="adv-line ng-held" dir="ltr">
        {held.length ? held.map((m) => NAMES[m % 12]).join(' ') : <span dir="auto">{TX.waiting[lang]}</span>}
      </p>
      <KeysPad lo={lo} hi={hi} marks={marks} onTap={input === 'touch' && !done ? tap : undefined} label={askOf(c, lang)} />
      {input === 'touch' && !done && (
        <div className="g2-row">
          <button className="btn ghost" onClick={() => (heldRef.current.clear(), setHeld([]))}>
            {TX.clear[lang]}
          </button>
          <button className="btn primary" disabled={!held.length} onClick={() => judge([...heldRef.current])} data-el-check>
            {TX.check[lang]}
          </button>
        </div>
      )}
    </>
  );
}

const CFG: CaseGameCfg<'elevator'> = {
  game: 'elevator',
  className: 'el',
  title: { en: 'Elevator', he: 'המעלית' },
  blurb: { en: 'Echols’s Elevator on the 6-dim scale: from a unison the top voice steps up, the bottom down, the middle from the same chord. Build the floor. Three lives.', he: 'המעלית של אקולס בסולם 6־דים: מיוניסון הקול העליון עולה, התחתון יורד, והאמצע מאותו אקורד. בונים את הקומה. שלושה חיים.' },
  inputFor: () => 'keys',
  board: (c) => <Board {...c} />,
  base: 12,
  keyInst: 'piano',
};

export const Elevator = (p: GameScreenProps) => <CaseShell cfg={CFG} {...p} />;
