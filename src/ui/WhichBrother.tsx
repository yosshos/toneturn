// Which Brother? (AUDIT-GAMES §4.2 #7): Barry Harris's family of dominants. By ear at pp–mp (which brother resolved,
// which one the dim move gave birth to), on the keys at mf–ff (MIDI; the on-screen keys are practice). Engine:
// src/engine/whichBrother.ts. The chord is judged once the keys settle (300 ms after the last key, three notes or more).
import { IsoMix } from './Iso';
import { useEffect, useRef, useState } from 'react';
import {
  BROTHER_NAME,
  BROTHER_ROMAN,
  brotherCase,
  brotherRoot,
  brotherVoicing,
  brotherWhy,
  dimMoveVoicings,
  domName,
  isPlayLevel,
  judgeBrother,
  tonicName,
  tonicVoicing,
  type Brother,
  type BrotherCase,
} from '../engine/whichBrother';
import type { NoteEvent } from '../engine/lesson';
import { midi as midiInput } from '../speech/midi';
import type { GameScreenProps } from './gameProps';
import { CaseShell, type BoardCtx, type CaseGameCfg } from './CaseShell';
import { KeysPad } from './Instrument';
import { piano } from './services';

const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const TX = {
  into: { en: 'Into', he: 'אל' },
  again: { en: 'Hear it again', he: 'לשמוע שוב' },
  listening: { en: 'Listening…', he: 'מקשיבים…' },
  which: { en: 'Which brother resolved?', he: 'איזה אח נפתר?' },
  born: { en: 'Which brother was born?', he: 'איזה אח נולד?' },
  playHalf: { en: 'Play the brother that lands a half step into', he: 'נגנו את האח שנוחת חצי טון אל' },
  playNamed: { en: 'Play its brother:', he: 'נגנו את האח:' },
  playBack: { en: 'Play the brother you hear', he: 'נגנו את האח שאתם שומעים' },
  of: { en: 'Brother of', he: 'אח של' },
  check: { en: 'Check', he: 'לבדוק' },
  clear: { en: 'Clear', he: 'לנקות' },
  waiting: { en: 'Root in the bass, then 3 and 7', he: 'שורש בבס, ואז 3 ו־7' },
  bass: { en: 'The root goes in the bass.', he: 'השורש צריך להיות בבס.' },
  missing: { en: 'A dominant needs its root, 3rd and ♭7.', he: 'דומיננטה צריכה שורש, טרצה ו־♭7.' },
  extra: { en: 'A note outside the chord and its tensions.', he: 'צליל מחוץ לאקורד ולטנשנים שלו.' },
};

const ev = (notes: number[], start: number, dur: number, vel = 0.5): NoteEvent[] => notes.map((m, i) => ({ midi: m, start, duration: dur, velocity: i === 0 ? vel + 0.08 : vel }));
function soundOf(c: BrotherCase): { events: NoteEvent[]; length: number } {
  const t = tonicVoicing(c.tonic);
  if (c.level === 3) {
    const [d, born] = dimMoveVoicings(c.tonic, c.answer);
    return { events: [...ev(d, 0, 1.1), ...ev(born, 1.25, 1.1), ...ev(t, 2.5, 1.5, 0.45)], length: 4.1 };
  }
  const dom: Brother = c.level === 6 ? c.answer : c.level >= 4 ? c.of : c.answer;
  return { events: [...ev(brotherVoicing(c.tonic, dom), 0, 1.2), ...ev(t, 1.35, 1.6, 0.45)], length: 3.1 };
}

function Board({ run, idx, input, lang, done, answer }: BoardCtx<'whichbrother'>) {
  const c = brotherCase(run.seed, idx, run.level);
  const [pick, setPick] = useState<Brother | null>(null);
  const [held, setHeld] = useState<number[]>([]);
  const [shown, setShown] = useState<number[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const heldRef = useRef(new Set<number>());
  const ac = useRef<AbortController | null>(null);
  const timer = useRef<number | null>(null);
  const answered = useRef(false);
  const play = isPlayLevel(c.level);
  const why = brotherWhy(c);

  const hear = () => {
    ac.current?.abort();
    const x = new AbortController();
    ac.current = x;
    setPlaying(true);
    const s = soundOf(c);
    void piano
      .unlock()
      .then(() => piano.play(s.events, s.length, x.signal))
      .catch(() => {})
      .then(() => ac.current === x && setPlaying(false));
  };
  useEffect(() => {
    hear();
    return () => {
      ac.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const judgePlayed = (notes: number[]) => {
    if (answered.current || done) return;
    answered.current = true;
    ac.current?.abort();
    const j = judgeBrother(c.tonic, c.answer, notes);
    const right = brotherVoicing(c.tonic, c.answer);
    if (!j.ok) {
      setShown(right);
      void piano.play(ev(right, 0, 1.1), 1.3, new AbortController().signal).catch(() => {});
    }
    const whyLine = j.why === 'bass' ? TX.bass : j.why === 'missing' ? TX.missing : j.why === 'extra' ? TX.extra : why;
    answer({ got: j.ok ? 1 : 0, of: 1, was: domName(brotherRoot(c.tonic, c.answer)), why: { en: `${whyLine.en} ${why.en}`, he: `${whyLine.he} ${why.he}` }, key: c.tonic });
  };

  // MIDI: judge the held keys once they settle
  useEffect(() => {
    if (!play || input !== 'midi' || done) return;
    let alive = true;
    void midiInput.enable().catch(() => {});
    const unsub = midiInput.onNote((note, on) => {
      if (!alive || answered.current) return;
      if (on) heldRef.current.add(note);
      else heldRef.current.delete(note);
      setHeld([...heldRef.current].sort((a, b) => a - b));
      if (timer.current) clearTimeout(timer.current);
      if (!on) return;
      timer.current = window.setTimeout(() => {
        const notes = [...heldRef.current];
        if (notes.length >= 3) judgePlayed(notes);
      }, 300);
    });
    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, input, done]);

  const choose = (b: Brother) => {
    if (done || answered.current) return;
    answered.current = true;
    ac.current?.abort();
    setPick(b);
    answer({ got: b === c.answer ? 1 : 0, of: 1, was: domName(brotherRoot(c.tonic, c.answer)), why });
  };
  const tap = (m: number) => {
    if (done) return;
    const s = heldRef.current;
    if (s.has(m)) s.delete(m);
    else s.add(m);
    setHeld([...s].sort((a, b) => a - b));
    void piano.play([{ midi: m, start: 0, duration: 0.4, velocity: 0.5 }], 0.5, new AbortController().signal).catch(() => {});
  };

  const into = `${TX.into[lang]} `;
  const tonic = tonicName(c.tonic);
  const v7 = domName(brotherRoot(c.tonic, 0));
  const ask =
    c.level <= 2 ? TX.which[lang] : c.level === 3 ? TX.born[lang] : c.level === 4 ? `${TX.playHalf[lang]} ${tonic}` : c.level === 5 ? `${TX.playNamed[lang]} ${BROTHER_NAME[c.ask ?? 6][lang]}` : TX.playBack[lang];
  const marks = shown ? shown.map((m) => ({ m, tone: 'answer' })) : held.map((m) => ({ m, tone: done ? 'wrong' : 'mine' }));

  return (
    <>
      <div className="ng-row">
        <span className="ng-chip">
          {c.level === 4 || c.level === 5 ? (
            <>
              {TX.of[lang]} <bdi dir="ltr">{v7}</bdi> → <bdi dir="ltr">{tonic}</bdi>
            </>
          ) : (
            <>
              {into}
              <bdi dir="ltr">{tonic}</bdi>
            </>
          )}
        </span>
        <button type="button" className={`btn ghost ng-replay ${playing ? 'on' : ''}`} onClick={hear} disabled={done} data-wb-hear>
          {playing ? TX.listening[lang] : TX.again[lang]}
        </button>
      </div>
      <p className="ng-ask">
        <IsoMix text={ask} />
      </p>
      {!play ? (
        <div className={`ng-grid ${c.options.length === 2 ? 'n2' : ''}`} role="radiogroup" aria-label={ask}>
          {c.options.map((b) => {
            const cls = done ? (b === c.answer ? 'ok' : b === pick ? 'bad' : '') : '';
            return (
              <button key={b} type="button" role="radio" aria-checked={pick === b} className={`btn ng-two ${cls}`} disabled={done} onClick={() => choose(b)} data-wb-pick={b}>
                <b dir="ltr">{domName(brotherRoot(c.tonic, b))}</b>
                <small dir="ltr">{BROTHER_ROMAN[b]}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <p className="adv-line ng-held" dir="ltr">
            {held.length ? held.map((m) => NAMES[m % 12]).join(' ') : <span dir="auto">{TX.waiting[lang]}</span>}
          </p>
          <KeysPad lo={36} hi={71} marks={marks} onTap={input === 'touch' && !done ? tap : undefined} label={ask} />
          {input === 'touch' && !done && (
            <div className="g2-row">
              <button className="btn ghost" onClick={() => (heldRef.current.clear(), setHeld([]))}>
                {TX.clear[lang]}
              </button>
              <button className="btn primary" disabled={held.length < 3} onClick={() => judgePlayed([...heldRef.current])} data-wb-check>
                {TX.check[lang]}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

const CFG: CaseGameCfg<'whichbrother'> = {
  game: 'whichbrother',
  className: 'wb',
  title: { en: 'Which Brother?', he: 'איזה אח?' },
  blurb: { en: 'G7, B♭7, D♭7, E7: four brothers, one dim, one home. Hear which one resolves, then play it. Three lives.', he: 'G7, B♭7, D♭7, E7: ארבעה אחים, מוקטן אחד, בית אחד. שומעים מי נפתר, ואז מנגנים אותו. שלושה חיים.' },
  inputFor: (level) => (isPlayLevel(level) ? 'keys' : 'choice'),
  touchNote: { en: 'Screen keys are practice: they do not clear a level.', he: 'מקשי המסך הם תרגול: הם לא עוברים שלב.' },
  board: (c) => <Board {...c} />,
  keyInst: 'piano',
};

export const WhichBrother = (p: GameScreenProps) => <CaseShell cfg={CFG} {...p} />;
