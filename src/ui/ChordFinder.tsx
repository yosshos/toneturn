// Chord finder (GUITAR_DEEPENING §6.3, P2): a Tools screen for the guitar course.
//   Play → name: strum any chord; the open-set recognizer names it (root, quality, slash bass) with how sure it is,
//   says which notes did not ring, and keeps the last strums as a progression (one-strum blips smoothed out).
//   Name → shapes: pick a root and a quality; every playable shape on the neck, each one playable.
// The microphone is open only while listening; nothing is recorded.

import '../chordfinder.css';
import { useMemo, useState } from 'react';
import { chordSymbol, chordWords, findChord, noteNameBi, OPEN_QUALITIES, qualityName, shapesFor, smoothNames, type OpenResult } from '../engine/chordFinder';
import type { ChordQuality } from '../engine/chordRecognize';
import { TUNINGS } from '../engine/fretboard';
import type { Settings } from '../storage/progress';
import { ChordBox } from './Instrument';
import { piano } from './services';
import { useStrums } from './strumListen';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Chord finder', he: 'מאתר אקורדים' },
  back: { en: 'Back', he: 'חזרה' },
  listenTab: { en: 'Strum → name', he: 'פורטים → שם' },
  shapesTab: { en: 'Name → shapes', he: 'שם → צורות' },
  start: { en: 'Listen', he: 'להקשיב' },
  stop: { en: 'Stop', he: 'עצירה' },
  idle: { en: 'Strum a chord, clean tone, and let it ring', he: 'פרטו אקורד, צליל נקי, ותנו לו להדהד' },
  listening: { en: 'Listening…', he: 'מקשיבים…' },
  unsure: { en: 'Not sure. Maybe', he: 'לא בטוח. אולי' },
  or: { en: 'or', he: 'או' },
  sure: { en: 'How sure', he: 'כמה בטוח' },
  notRinging: { en: 'Not ringing', he: 'לא מצלצל' },
  history: { en: 'Your strums', he: 'מה שפרטתם' },
  shapesOf: { en: 'Shapes', he: 'צורות' },
  root: { en: 'Root', he: 'יסוד' },
  quality: { en: 'Quality', he: 'סוג' },
  play: { en: 'Play', he: 'לנגן' },
  mic: { en: 'The microphone is not available. Allow it for this site and try again.', he: 'המיקרופון לא זמין. אפשרו אותו לאתר ונסו שוב.' },
  none: { en: 'No shape in standard tuning', he: 'אין צורה בכיוון סטנדרטי' },
  note: { en: 'Standard tuning. Distortion and a band from the speaker make chords hard to name.', he: 'כיוון סטנדרטי. דיסטורשן ולהקה מהרמקול מקשים לזהות אקורדים.' },
};
const STD = TUNINGS[0];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SYM: Record<ChordQuality, string> = { M: 'maj', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', dim7: '°7', sus2: 'sus2', sus4: 'sus4', '5': '5', '9': '9', add9: 'add9' };

export function ChordFinder({ lang, settings, onBack }: { lang: Lang; settings: Settings; onBack: () => void }) {
  const tx = (k: keyof typeof TX) => TX[k][lang];
  const [tab, setTab] = useState<'listen' | 'shapes'>('listen');
  const [on, setOn] = useState(false);
  const [res, setRes] = useState<OpenResult | null>(null);
  const [hist, setHist] = useState<(string | null)[]>([]);
  const [mic, setMic] = useState(false);
  const [root, setRoot] = useState(9);
  const [quality, setQuality] = useState<ChordQuality>('m7');

  useStrums(
    on && tab === 'listen',
    (frames) => {
      const r = findChord(frames);
      if (r.status === 'silent') return;
      setRes(r);
      setHist((h) => [...h, r.status === 'ok' ? r.best!.symbol : null].slice(-8));
    },
    () => (setMic(true), setOn(false)),
  );

  const shapes = useMemo(() => shapesFor(root, quality, STD), [root, quality]);
  const sound = (midis: number[]) => {
    const ev = midis.map((m, i) => ({ midi: m, start: i * 0.04, duration: 1.6, velocity: 0.7 }));
    void piano.unlock().then(() => piano.play(ev, 2, new AbortController().signal)).catch(() => {});
  };
  const openShapes = (sym: string) => {
    const m = /^([A-G][♯♭]?)(.*?)(\/.*)?$/.exec(sym);
    if (!m) return;
    const r = NAMES.indexOf(m[1]);
    const q = (Object.keys(SYM) as ChordQuality[]).find((k) => (k === 'M' ? m[2] === '' : SYM[k] === m[2]));
    if (r < 0 || !q) return;
    setRoot(r);
    setQuality(q);
    setTab('shapes');
    setOn(false);
  };
  const best = res?.status === 'ok' ? res.best! : null;
  const sure = best ? Math.max(0.15, Math.min(1, best.confidence / 0.25)) : 0;
  const smoothed = smoothNames(hist);

  return (
    <main className="cf-screen" data-tool="chordfinder">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx('back')}>
          <span className="flip-rtl">‹</span>
        </button>
        <h1>{tx('title')}</h1>
      </header>
      <div className="seg cf-tabs" role="tablist">
        {(['listen', 'shapes'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => (setTab(k), k === 'shapes' && setOn(false))}>
            {tx(k === 'listen' ? 'listenTab' : 'shapesTab')}
          </button>
        ))}
      </div>

      {tab === 'listen' ? (
        <section className="cf-listen" aria-live="polite">
          <div className={`cf-card ${best ? 'named' : ''}`}>
            {best ? (
              <>
                <b className="cf-sym" dir="ltr">
                  {best.symbol}
                </b>
                <span className="cf-words">{chordWords(best)[lang]}</span>
                <span className="cf-sure" aria-label={`${tx('sure')}: ${Math.round(sure * 100)}%`}>
                  <small>{tx('sure')}</small>
                  <span className="cf-bar">
                    <i style={{ width: `${Math.round(sure * 100)}%` }} />
                  </span>
                </span>
                {res!.missing.length > 0 && (
                  <small className="cf-missing">
                    {tx('notRinging')}: <span dir="ltr">{res!.missing.map((p) => noteNameBi(p).en).join(' · ')}</span>
                  </small>
                )}
              </>
            ) : res?.status === 'unsure' ? (
              <>
                <b className="cf-sym dim" dir="ltr">
                  ?
                </b>
                <span className="cf-words">
                  {tx('unsure')}{' '}
                  <span dir="ltr">
                    {res.near
                      .slice(0, 2)
                      .map((n) => n.symbol)
                      .join(` ${tx('or')} `)}
                  </span>
                </span>
              </>
            ) : (
              <span className="cf-words">{mic ? tx('mic') : on ? tx('listening') : tx('idle')}</span>
            )}
          </div>
          <button type="button" className={`btn ${on ? '' : 'primary'} cf-go`} aria-pressed={on} onClick={() => (setMic(false), setOn((v) => !v))}>
            {on && <span className="cf-dot" aria-hidden="true" />}
            {on ? tx('stop') : tx('start')}
          </button>
          {smoothed.length > 0 && (
            <div className="cf-hist">
              <small>{tx('history')}</small>
              <div className="cf-chips" dir="ltr">
                {smoothed.map((s, i) =>
                  s ? (
                    <button key={i} type="button" className="chip" onClick={() => openShapes(s)} title={tx('shapesOf')}>
                      {s}
                    </button>
                  ) : (
                    <span key={i} className="chip dim" aria-hidden="true">
                      ?
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
          <p className="field-hint cf-note">{tx('note')}</p>
        </section>
      ) : (
        <section className="cf-shapes">
          <div className="cf-pick" role="radiogroup" aria-label={tx('root')} dir="ltr">
            {NAMES.map((n, i) => (
              <button key={n} type="button" role="radio" aria-checked={root === i} className={`chip ${root === i ? 'on' : ''}`} onClick={() => setRoot(i)}>
                {n}
              </button>
            ))}
          </div>
          <div className="cf-pick q" role="radiogroup" aria-label={tx('quality')} dir="ltr">
            {OPEN_QUALITIES.map((q) => (
              <button key={q} type="button" role="radio" aria-checked={quality === q} className={`chip ${quality === q ? 'on' : ''}`} onClick={() => setQuality(q)} title={qualityName(q)[lang]}>
                {SYM[q]}
              </button>
            ))}
          </div>
          <p className="cf-title">
            <b dir="ltr">{chordSymbol({ root, quality })}</b> <span>{chordWords({ root, quality })[lang]}</span>
          </p>
          {shapes.length ? (
            <div className="cf-grid" dir="ltr">
              {shapes.map((s, i) => {
                const fr = s.box.dots.map((d) => d.fret);
                const span = fr.length ? Math.max(...fr) - s.box.baseFret + 1 : 1;
                return (
                  <button key={i} type="button" className="cf-shape" onClick={() => sound(s.midis)} aria-label={`${tx('play')}: ${s.name[lang]}`}>
                    <ChordBox d={{ kind: 'box', instrument: 'guitar', ...s.box, frets: Math.max(4, span) }} tuning={STD} leftHanded={settings.leftHanded} />
                    <small dir={lang === 'he' ? 'rtl' : 'ltr'}>{s.name[lang]}</small>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="field-hint">{tx('none')}</p>
          )}
        </section>
      )}
    </main>
  );
}
