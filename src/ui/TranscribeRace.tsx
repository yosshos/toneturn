// Transcription Race (0.70, GAMES_TIERS_PLAN §4): hear a phrase, write it on the keys (tap or MIDI), submit. Five
// phrases; note-by-note accuracy × a time bonus. Engine: src/engine/transcribeRace.ts.
import '../advgames.css';
import '../transcribe.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderStimulus, type Stimulus } from '../engine/lesson';
import {
  isTranscribeSave,
  KEY_HI,
  KEY_LO,
  newTranscribe,
  phraseAt,
  phraseStim,
  PHRASES,
  runAccuracy,
  runDone,
  runRhythm,
  runScore,
  submitPhrase,
  transcribeResult,
  type Phrase,
  type TranscribeSave,
} from '../engine/transcribeRace';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import { midi as midiInput } from '../speech/midi';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { KeysPad } from './Instrument';
import { NoteStaff } from './NoteViews';
import { TierChips } from './TierChips';
import { piano } from './services';

const TX = {
  en: {
    title: 'Transcription Race',
    back: 'Back',
    blurb: 'A short phrase plays after two clicks. Write it note by note on the keys (or your MIDI keyboard), then submit.',
    rules: 'Five phrases. Points for each note in place and in time (any steady tempo); speed adds a bonus, replays cost some.',
    start: 'Play',
    cont: (n: number) => `Continue · phrase ${n}`,
    newGame: 'New game',
    best: 'Best',
    phrase: 'Phrase',
    score: 'Score',
    level: 'Level',
    replay: 'Replay',
    undo: 'Undo',
    submit: 'Submit',
    next: 'Next phrase',
    finish: 'See results',
    notes: (a: number, n: number) => `${a} / ${n} notes`,
    write: 'Tap the notes in order, in rhythm',
    got: (ok: number, n: number, p: number) => `${ok} of ${n} notes · +${p}`,
    rhythm: (ok: number, n: number) => `rhythm ${ok}/${n}`,
    rhythmLabel: 'Rhythm',
    answer: 'The phrase',
    keys: 'Keys',
    over: 'Five phrases',
    accuracy: 'Accuracy',
    newBest: 'New personal best',
    again: 'Play again',
  },
  he: {
    title: 'מרוץ התמלול',
    back: 'חזרה',
    blurb: 'משפט קצר מתנגן אחרי שני קליקים. כתבו אותו צליל אחר צליל על הקלידים (או במקלדת MIDI) ושלחו.',
    rules: 'חמישה משפטים. נקודות על כל צליל במקומו ובזמן (בכל טמפו יציב); מהירות מוסיפה בונוס, השמעה חוזרת עולה מעט.',
    start: 'לנגן',
    cont: (n: number) => `להמשיך · משפט ${n}`,
    newGame: 'משחק חדש',
    best: 'שיא',
    phrase: 'משפט',
    score: 'ניקוד',
    level: 'רמה',
    replay: 'שוב',
    undo: 'ביטול',
    submit: 'לשלוח',
    next: 'למשפט הבא',
    finish: 'לתוצאות',
    notes: (a: number, n: number) => `${a} / ${n} צלילים`,
    write: 'הקישו את הצלילים לפי הסדר, בקצב',
    got: (ok: number, n: number, p: number) => `${ok} מתוך ${n} צלילים · +${p}`,
    rhythm: (ok: number, n: number) => `קצב ${ok}/${n}`,
    rhythmLabel: 'קצב',
    answer: 'המשפט',
    keys: 'קלידים',
    over: 'חמישה משפטים',
    accuracy: 'דיוק',
    newBest: 'שיא אישי חדש',
    again: 'לשחק שוב',
  },
};

type Phase = 'setup' | 'write' | 'reveal' | 'over';

export function TranscribeRace({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const tx = TX[lang];
  const calm = prefersCalm(settings);
  const resumable = isTranscribeSave(saved) ? saved : null;
  const [phase, setPhase] = useState<Phase>('setup');
  const [tier, setTier] = useState<DynName>(() => (resumable && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'mp'));
  const [run, setRun] = useState<TranscribeSave | null>(null);
  // each entry with its onset (ms, latency-corrected for its input) — the rhythm grade reads them
  const [entries, setEntries] = useState<{ m: number; t: number }[]>([]);
  const entered = entries.map((e) => e.m);
  const setEntered = (f: (e: { m: number; t: number }[]) => { m: number; t: number }[]) => setEntries(f);
  const [last, setLast] = useState<{ ok: number; points: number; phrase: Phrase; rOk: number | null; rN: number } | null>(null);
  const [record, setRecord] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const shownAt = useRef(0);
  const replays = useRef(0);
  const phaseRef = useRef<Phase>('setup');
  phaseRef.current = phase;

  const phrase = run && !runDone(run) ? phraseAt(run.seed, run.results.length, run.level, run.notes) : null;

  const stop = () => {
    ac.current?.abort();
    ac.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);

  const sound = useCallback(async (stim: Stimulus[], track = true) => {
    ac.current?.abort();
    const a = new AbortController();
    ac.current = a;
    if (track) setPlaying(true);
    try {
      await piano.unlock();
      const r = renderStimulus(stim);
      await piano.play(r.events, r.length, a.signal);
    } catch {
      /* stopped */
    }
    if (ac.current === a) {
      ac.current = null;
      setPlaying(false);
    }
  }, []);

  const playPhrase = (r: TranscribeSave) => {
    const p = phraseAt(r.seed, r.results.length, r.level, r.notes);
    void sound([phraseStim(p, r.bpm)]);
  };

  const add = useCallback((m: number, t: number) => {
    if (phaseRef.current !== 'write') return;
    setEntries((e) => (e.length >= 12 ? e : [...e, { m, t }]));
  }, []);
  const tapKey = (m: number) => {
    add(m, performance.now() - (settings.tapLatencyMs ?? 0));
    void sound([{ kind: 'note', midi: m, duration: 0.45 }], false);
  };

  // MIDI keyboard: every note-on in the keys' range is written (the keyboard sounds by itself).
  useEffect(() => {
    if (phase !== 'write') return;
    let unsub: (() => void) | null = null;
    let live = true;
    void midiInput
      .enable()
      .then(() => {
        if (live) unsub = midiInput.onNote((note, on, at) => on && note >= KEY_LO - 12 && note <= KEY_HI + 12 && add(note, (at || performance.now()) - (settings.midiLatencyMs ?? 0)));
      })
      .catch(() => {});
    return () => {
      live = false;
      unsub?.();
    };
  }, [phase, add, settings.midiLatencyMs]);

  const startPhrase = (r: TranscribeSave) => {
    setEntries([]);
    setLast(null);
    replays.current = 0;
    shownAt.current = performance.now();
    setPhase('write');
    playPhrase(r);
  };
  const begin = (resume: boolean) => {
    const def = tierDef('transcribe', tier);
    const r = resume && resumable ? resumable : newTranscribe((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, tier, Number(def?.params?.notes ?? 5), Number(def?.params?.bpm ?? 90));
    setRun(r);
    setRecord(false);
    onSave(r);
    startPhrase(r);
  };

  const replay = () => {
    if (!run) return;
    replays.current++;
    playPhrase(run);
  };
  const submit = () => {
    if (!run || phase !== 'write') return;
    stop();
    const r = submitPhrase(run, entered, performance.now() - shownAt.current, replays.current, entries.map((e) => e.t));
    setRun(r.save);
    const rMarks = r.rhythm ? r.rhythm.marks.filter((x) => x !== null) : [];
    setLast({ ok: r.phrase.midis.filter((m, k) => entered[k] === m).length, points: r.points, phrase: r.phrase, rOk: r.rhythm ? rMarks.filter(Boolean).length : null, rN: rMarks.length });
    if (!runDone(r.save)) onSave(r.save);
    setPhase('reveal');
  };
  const next = () => {
    if (!run) return;
    if (runDone(run)) {
      onSave(null);
      const res = transcribeResult(run);
      setRecord(res.score > 0 && res.score > (best ?? 0));
      onResult(res);
      setPhase('over');
      return;
    }
    startPhrase(run);
  };
  const back = () => {
    stop();
    onExit();
  };

  // Keyboard shortcuts: Space replays, Backspace undoes, Enter submits / goes on.
  useEffect(() => {
    if (phase !== 'write' && phase !== 'reveal') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (phase === 'write' && e.code === 'Space') {
        e.preventDefault();
        replay();
      } else if (phase === 'write' && e.code === 'Backspace') {
        e.preventDefault();
        setEntered((x) => x.slice(0, -1));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (phase === 'write') submit();
        else next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase === 'setup') {
    return (
      <main className={`panel-screen g2 tr ${calm ? 'g2-calm' : ''}`} data-game="transcribe" data-phase="setup">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card">
          <p>{tx.blurb}</p>
          <p className="g2-dim">{tx.rules}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="transcribe" />}
          {!!best && (
            <p className="g2-best">
              {tx.best}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx.cont(resumable.results.length + 1)}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx.newGame}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)}>
              {tx.start}
            </button>
          )}
        </section>
      </main>
    );
  }

  if (phase === 'over' && run) {
    return (
      <main className={`panel-screen g2 tr ${calm ? 'g2-calm' : ''}`} data-game="transcribe" data-phase="over">
        <G2Head title={tx.title} backLabel={tx.back} onBack={back} />
        <section className="g2-card" aria-live="polite">
          <h2>{tx.over}</h2>
          <div className="adv-hud">
            <span>
              <small>{tx.score}</small>
              <b dir="ltr">{runScore(run)}</b>
            </span>
            <span>
              <small>{tx.accuracy}</small>
              <b dir="ltr">{runAccuracy(run)}%</b>
            </span>
            {runRhythm(run) !== null && (
              <span>
                <small>{tx.rhythmLabel}</small>
                <b dir="ltr">{runRhythm(run)}%</b>
              </span>
            )}
            <span>
              <small>{tx.best}</small>
              <b dir="ltr">{Math.max(best ?? 0, runScore(run))}</b>
            </span>
          </div>
          {record && <p className="adv-line ok">{tx.newBest}</p>}
          <div className="g2-row">
            <button className="btn primary" onClick={() => begin(false)}>
              {tx.again}
            </button>
            <button className="btn ghost" onClick={back}>
              {tx.back}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!run) return null;
  const target = last?.phrase ?? phrase;
  if (!target) return null;
  const n = target.midis.length;
  const done = phase === 'reveal';
  const idx = run.results.length - (done ? 1 : 0);
  const staffNotes = done ? target.midis : entered;

  return (
    <main className={`panel-screen g2 tr tr-play ${calm ? 'g2-calm' : ''}`} data-game="transcribe" data-phase={phase}>
      <G2Head title={tx.title} backLabel={tx.back} onBack={back}>
        <span className="g2-hud-mini" dir="ltr">
          {idx + 1}/{PHRASES}
        </span>
      </G2Head>
      <div className="adv-hud">
        <span>
          <small>{tx.phrase}</small>
          <b dir="ltr">
            {idx + 1}/{PHRASES}
          </b>
        </span>
        <span>
          <small>{tx.score}</small>
          <b dir="ltr">{runScore(run)}</b>
        </span>
        <span>
          <small>{tx.level}</small>
          <i className="dyn">{run.tier}</i>
        </span>
      </div>

      <div className="tr-staff" dir="ltr" aria-label={done ? tx.answer : tx.write}>
        {staffNotes.length ? <NoteStaff notes={staffNotes} chord={false} keyPc={null} /> : <p className="g2-dim tr-empty">{tx.write}</p>}
      </div>
      <p className={`adv-line ${done ? (last && last.ok === n && (last.rOk === null || last.rOk === last.rN) ? 'ok' : 'bad') : ''}`} aria-live="polite">
        {done && last ? `${tx.got(last.ok, n, last.points)}${last.rOk !== null && last.rN > 1 ? ` · ${tx.rhythm(last.rOk, last.rN)}` : ''}` : tx.notes(entered.length, n)}
      </p>

      {done ? (
        <button className="btn primary mega" onClick={next} data-tr-next>
          {runDone(run) ? tx.finish : tx.next}
        </button>
      ) : (
        <div className="tr-tools">
          <button type="button" className={`btn ${playing ? 'on' : ''}`} onClick={replay} data-tr-replay>
            {tx.replay}
          </button>
          <button type="button" className="btn" onClick={() => setEntered((e) => e.slice(0, -1))} disabled={!entered.length}>
            {tx.undo}
          </button>
          <button type="button" className="btn primary" onClick={submit} disabled={!entered.length} data-tr-submit>
            {tx.submit}
          </button>
        </div>
      )}

      <KeysPad lo={KEY_LO} hi={KEY_HI} marks={done ? target.midis.map((m, k) => ({ m, tone: entered[k] === m ? 'ok' : 'answer' })) : entered.length ? [{ m: entered[entered.length - 1], tone: 'mine' }] : []} onTap={done ? undefined : tapKey} label={tx.keys} />
    </main>
  );
}
