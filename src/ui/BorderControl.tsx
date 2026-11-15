// Border Control (AUDIT-GAMES §4.2 #6): home ii–V–I, then a key move. Two stamps: how it crossed (the means) and where
// it landed (the new key); at ff, a tune's 2nd and 3rd key centres. Engine: src/engine/borderControl.ts.
import { IsoMix } from './Iso';
import { useEffect, useRef, useState } from 'react';
import { borderBpm, borderCase, keyStampName, MEANS_NAME, MEANS_WHY, stampBorder, type BorderCase } from '../engine/borderControl';
import { KEY_NAMES_HE, KEY_NAMES } from '../engine/keyMoves';
import { playKChords } from '../engine/topicsKeyMoves';
import { renderStimulus } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { CaseShell, type BoardCtx, type CaseGameCfg } from './CaseShell';
import { piano } from './services';

const TX = {
  home: { en: 'Home', he: 'הבית' },
  first: { en: '1st', he: 'ראשון' },
  again: { en: 'Hear it again', he: 'לשמוע שוב' },
  listening: { en: 'Listening…', he: 'מקשיבים…' },
  how: { en: 'How did it cross?', he: 'איך עבר?' },
  where: { en: 'Where to?', he: 'לאן?' },
  second: { en: '2nd centre', he: 'מרכז שני' },
  third: { en: '3rd centre', he: 'מרכז שלישי' },
};

function play(c: BorderCase, signal: AbortSignal) {
  const beatSec = 60 / borderBpm(c.level);
  const r = renderStimulus(playKChords(c.chords, beatSec));
  return piano.unlock().then(() => piano.play(r.events, r.length, signal));
}

function Board({ run, idx, lang, done, answer }: BoardCtx<'bordercontrol'>) {
  const c = borderCase(run.seed, idx, run.level);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const hear = () => {
    ac.current?.abort();
    const x = new AbortController();
    ac.current = x;
    setPlaying(true);
    void play(c, x.signal)
      .catch(() => {})
      .then(() => ac.current === x && setPlaying(false));
  };
  useEffect(() => {
    hear();
    return () => ac.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (a === null || b === null || done) return;
    ac.current?.abort();
    setPlaying(false);
    const s = stampBorder(c, a, b);
    const was = [c.first.kind === 'means' ? MEANS_NAME[c.first.answer][lang] : keyStampName(c.first.answer)[lang], keyStampName(c.second.answer)[lang]].join(' · ');
    const why = c.first.kind === 'means' && !s.firstOk ? MEANS_WHY[c.first.answer] : undefined;
    answer({ got: s.got, of: 2, was: s.got < 2 ? was : undefined, why });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b]);

  const homeName = lang === 'he' ? `${KEY_NAMES_HE[c.home]} מז׳ור` : `${KEY_NAMES[c.home]} major`;
  const cls = (picked: string | null, id: string, right: string) => (done ? (id === right ? 'ok' : id === picked ? 'bad' : '') : picked === id ? 'on' : '');
  const firstRight = c.first.kind === 'means' ? c.first.answer : c.first.answer.id;
  return (
    <>
      <div className="ng-row">
        <span className="ng-chip">
          {c.level === 6 ? TX.first[lang] : TX.home[lang]}: <IsoMix text={homeName} />
        </span>
        <button type="button" className={`btn ghost ng-replay ${playing ? 'on' : ''}`} onClick={hear} disabled={done} data-bc-hear>
          {playing ? TX.listening[lang] : TX.again[lang]}
        </button>
      </div>
      <p className="ng-ask">{c.level === 6 ? TX.second[lang] : TX.how[lang]}</p>
      <div className={`ng-grid ${c.first.options.length > 4 ? 'n5' : ''}`} role="radiogroup" aria-label={c.level === 6 ? TX.second[lang] : TX.how[lang]}>
        {c.first.kind === 'means'
          ? c.first.options.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={a === m} className={`btn ${cls(a, m, firstRight)}`} disabled={done} onClick={() => setA(m)} data-bc-first={m}>
                <IsoMix text={MEANS_NAME[m][lang]} />
              </button>
            ))
          : c.first.options.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={a === k.id} className={`btn ${cls(a, k.id, firstRight)}`} disabled={done} onClick={() => setA(k.id)} data-bc-first={k.id}>
                <IsoMix text={keyStampName(k)[lang]} />
              </button>
            ))}
      </div>
      <p className="ng-ask">{c.level === 6 ? TX.third[lang] : TX.where[lang]}</p>
      <div className="ng-grid" role="radiogroup" aria-label={c.level === 6 ? TX.third[lang] : TX.where[lang]}>
        {c.second.options.map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={b === k.id} className={`btn ${cls(b, k.id, c.second.answer.id)}`} disabled={done} onClick={() => setB(k.id)} data-bc-second={k.id}>
            <IsoMix text={keyStampName(k)[lang]} />
          </button>
        ))}
      </div>
    </>
  );
}

const CFG: CaseGameCfg<'bordercontrol'> = {
  game: 'bordercontrol',
  className: 'bc',
  title: { en: 'Border Control', he: 'ביקורת גבולות' },
  blurb: { en: 'Home, then a new key. Stamp how it crossed and where it landed. Three lives.', he: 'הבית, ואז סולם חדש. חותמים איך עבר ולאן הגיע. שלושה חיים.' },
  inputFor: () => 'choice',
  board: (c) => <Board {...c} />,
  base: 12,
  // the stamps are the run's right / wrong (two a case): XP, ratings and the 80 % rule read them
  result: (r) => ({ right: r.parts.right, wrong: r.parts.total - r.parts.right, cases: r.i, casesRight: r.right }),
};

export const BorderControl = (p: GameScreenProps) => <CaseShell cfg={CFG} {...p} />;
