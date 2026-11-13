// Transcription coach (docs/SPEC-LICKS-TRANSCRIPTION.md): 1 hear the phrase (loop, slow down — the pitch stays, the
// band under it optional), 2 play or sing it back — compared note by note, pitch and rhythm, with where it went wrong,
// 3 write it as degrees, 4 play it in 12 keys (and keep it as your own lick). Every step is measured.

import { useEffect, useMemo, useRef, useState } from 'react';
import '../licks.css';
import type { Settings } from '../storage/progress';
import type { Drill, ItemState, PlayedNote } from '../engine/drills/types';
import type { RatingEvent } from '../engine/rating';
import type { NoteEvent } from '../engine/lesson';
import { piano } from './services';
import { DrillTake } from './DrillTake';
import { NoteStaff, type NoteMark } from './NoteViews';
import { chartBacking, parseChart } from '../engine/charts';
import { keyName } from '../engine/drills/generate';
import { LICK_KEYS, lickChart, lickDrill, lickFromPhrase, type LickBook } from '../engine/licks';
import { comparePhrase, DEGREE_NAMES, gradeDegrees, heardOfPlayed, phraseBeats, phraseDegrees, phraseEvents, phraseFor, phraseStars, phraseXp, TX_LEVELS, type Phrase, type PhraseResult } from '../engine/transcribe';
import { calOf, LickRun, lickInstrumentOf, Stars, type TakeFn } from './LickTrainer';

type Lang = 'he' | 'en';
const TX = {
  en: {
    title: 'Transcribe', steps: ['Hear', 'Play back', 'Write', '12 keys'], play: 'Play', loop: 'Loop', stop: 'Stop', band: 'Band', speed: 'Speed',
    hearHow: 'Listen until you can sing it in your head. Slow it down if you need — the pitch stays.', backHow: 'Count-in, then play it back from memory.', backVoice: 'Count-in, then sing it back.',
    reveal: 'Show the notes', revealed: 'Shown — this phrase counts less.', write: 'Write it as degrees of the key, in order.', check: 'Check', undo: 'Undo', next: 'Next', newPhrase: 'New phrase',
    keysHow: 'Now play it in every key — the drills measure each one.', keep: 'Keep it in my licks', kept: 'In my licks', level: 'Level', again: 'Again', key: 'Key',
    pitch: 'Pitch', rhythm: 'Rhythm', octave: 'You played it an octave away — that is fine.', done: 'Phrase done', toWrite: 'Write it', to12: 'Play in 12 keys',
  },
  he: {
    title: 'תמלול', steps: ['להקשיב', 'לנגן בחזרה', 'לכתוב', '12 סולמות'], play: 'לנגן', loop: 'בלולאה', stop: 'עצירה', band: 'להקה', speed: 'מהירות',
    hearHow: 'הקשיבו עד שתוכלו לשיר אותו בראש. האטו אם צריך — הגובה נשאר.', backHow: 'ספירה, ואז נגנו אותו בחזרה מהזיכרון.', backVoice: 'ספירה, ואז שירו אותו בחזרה.',
    reveal: 'להציג את התווים', revealed: 'הוצג — המשפט הזה נחשב פחות.', write: 'כתבו אותו בדרגות של הסולם, לפי הסדר.', check: 'בדיקה', undo: 'ביטול', next: 'הבא', newPhrase: 'משפט חדש',
    keysHow: 'עכשיו נגנו אותו בכל הסולמות — התרגילים מודדים כל אחד.', keep: 'לשמור בליקים שלי', kept: 'בליקים שלי', level: 'שלב', again: 'שוב', key: 'סולם',
    pitch: 'גובה', rhythm: 'קצב', octave: 'ניגנתם אוקטבה אחרת — זה בסדר.', done: 'המשפט הושלם', toWrite: 'לכתוב', to12: 'לנגן ב-12 סולמות',
  },
};

const levelItem = (lv: number) => `tx:L${lv}`;
/** Stars of a level: one per phrase transcribed with 3 stars (played back clean and written right), up to 5; 3 opens the next level. */
export const txLevelStars = (items: Record<string, ItemState>, lv: number) => Math.min(5, items[levelItem(lv)]?.passLog?.length ?? 0);

export interface TranscribeProps {
  lang: Lang;
  settings: Settings;
  items: Record<string, ItemState>;
  onSettings: (p: Partial<Settings>) => void;
  /** 12-key takes (lick items). */
  onTake: TakeFn;
  /** One phrase finished: the level's item state, its rated event, XP. */
  onPhrase: (state: ItemState, evs: RatingEvent[], xp: number, stars: number) => void;
  onBack: () => void;
  pathLevel?: number;
  onPathDone?: (stars: number) => void;
}

export function TranscribeCoachScreen({ lang, settings, items, onSettings, onTake, onPhrase, onBack, pathLevel, onPathDone }: TranscribeProps) {
  const tx = TX[lang];
  const [live, setLive] = useState<Record<string, ItemState>>({});
  const itemsNow = { ...items, ...live };
  const [level, setLevel] = useState<number | null>(pathLevel ?? null);
  const leave = () => {
    if (onPathDone && pathLevel) return onPathDone(Math.min(3, txLevelStars(itemsNow, pathLevel)));
    onBack();
  };
  const head = (title: string, back: () => void) => (
    <header className="screen-head">
      <button className="icon-btn" onClick={back} aria-label="Back">
        <span className="flip-rtl">‹</span>
      </button>
      <h1>{title}</h1>
    </header>
  );
  if (level !== null)
    return (
      <main className="panel-screen lk-screen tx-screen" data-transcribe="phrase" data-tx-level={level}>
        {head(`${tx.title} · ${TX_LEVELS[level - 1].name[lang]}`, () => (pathLevel ? leave() : setLevel(null)))}
        <PhraseCoach
          key={level}
          lang={lang}
          settings={settings}
          level={level}
          items={itemsNow}
          onSettings={onSettings}
          onTake={onTake}
          onPhrase={(st, evs, xp, stars) => {
            setLive((x) => ({ ...x, [st.itemId]: st }));
            onPhrase(st, evs, xp, stars);
          }}
        />
      </main>
    );
  const open = (lv: number) => lv === 1 || txLevelStars(itemsNow, lv - 1) >= 3 || (itemsNow[levelItem(lv)]?.takes ?? 0) > 0;
  return (
    <main className="panel-screen lk-screen tx-screen" data-transcribe="levels">
      {head(tx.title, leave)}
      <ul className="lk-list">
        {TX_LEVELS.map((l) => (
          <li key={l.level}>
            <button className="lk-card" disabled={!open(l.level)} onClick={() => setLevel(l.level)} data-tx-open={l.level}>
              <span className="lk-card-top">
                <b>
                  {l.level}. {l.name[lang]}
                </b>
                <Stars n={txLevelStars(itemsNow, l.level)} />
              </span>
              <span className="lk-card-sub">
                <small>{l.notes[lang]}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

const SPEEDS = [0.5, 0.75, 1];

function PhraseCoach({ lang, settings, level, items, onSettings, onTake, onPhrase }: { lang: Lang; settings: Settings; level: number; items: Record<string, ItemState>; onSettings: (p: Partial<Settings>) => void; onTake: TakeFn; onPhrase: TranscribeProps['onPhrase'] }) {
  const tx = TX[lang];
  const inst = lickInstrumentOf(settings);
  const [seed, setSeed] = useState(() => ((Date.now() >>> 10) ^ ((items[levelItem(level)]?.takes ?? 0) * 977)) % 100000);
  const phrase0 = useMemo(() => phraseFor(level, seed), [level, seed]);
  const own = useMemo(() => lickFromPhrase(`tx-${phrase0.id}`, phrase0.title, phrase0.key, phrase0.notes, phrase0.chords), [phrase0]);
  // The phrase on the player's instrument (its register): the drill plays and measures it; the comparison uses its notes.
  const drill: Drill = useMemo(() => ({ ...lickDrill(own, phrase0.key, inst, { range: settings.voiceRange ?? null }), show: 'none' as const, chart: phrase0.chords ? lickChart(own, phrase0.key) : undefined }), [own, phrase0, inst, settings.voiceRange]);
  const phrase: Phrase = useMemo(() => ({ ...phrase0, notes: drill.notes.map((n) => ({ midi: n.pitch, beat: n.beat, dur: n.dur })) }), [phrase0, drill]);
  const [step, setStep] = useState(0);
  const [speed, setSpeed] = useState(level >= 6 ? 0.75 : 1);
  const [band, setBand] = useState(!!phrase.chords);
  const [looping, setLooping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [play, setPlay] = useState<PhraseResult | null>(null);
  const [take, setTake] = useState(0);
  const [againTake, setAgainTake] = useState(false);
  const [written, setWritten] = useState<number[]>([]);
  const [grade, setGrade] = useState<ReturnType<typeof gradeDegrees> | null>(null);
  const [saved, setSaved] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const loopRef = useRef(false);
  useEffect(() => () => ctl.current?.abort(), []);
  const bpm = Math.round(phrase.bpm * speed);
  const beatS = 60 / bpm;
  const events = (): { ev: NoteEvent[]; len: number } => {
    const total = Math.ceil(phraseBeats(phrase) / 4 - 1e-6) * 4;
    const sw = (b: number) => (phrase.swing && Math.abs(b - Math.floor(b) - 0.5) < 1e-6 ? Math.floor(b) + 2 / 3 : b);
    const ev: NoteEvent[] = phrase.notes.map((n) => ({ midi: n.midi, start: sw(n.beat) * beatS, duration: Math.max(0.12, n.dur * beatS * 0.92), velocity: 0.78, ...(inst === 'bass' ? { inst: 'bass' as const } : {}) }));
    if (band && phrase.chords && drill.chart) {
      const b = chartBacking(parseChart(drill.chart.join(' | ')), 'swing', bpm, 1, 4, { countIn: false });
      ev.push(...b.events.map((e) => ({ ...e, velocity: e.velocity * 0.7 })));
    }
    return { ev, len: total * beatS + 0.3 };
  };
  const listen = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setPlaying(true);
    await piano.unlock();
    do {
      const { ev, len } = events();
      await piano.play(ev, len, c.signal).catch(() => {});
    } while (loopRef.current && !c.signal.aborted);
    setPlaying(false);
  };
  const stop = () => {
    loopRef.current = false;
    setLooping(false);
    ctl.current?.abort();
    setPlaying(false);
  };
  const finish = (res: PhraseResult | null, g: { ok: number; total: number } | null) => {
    const stars = phraseStars(res, g);
    const at = new Date().toISOString();
    const id = levelItem(level);
    const prev = items[id] ?? { itemId: id, family: 'transcribe' as const, key: phrase.key, hands: 'R' as const, cleanBpm: 0, goalBpm: phrase.bpm, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 0 }, takes: 0, last: '', history: [], passLog: [] };
    const clean = res?.verdict === 'clean' && !revealed;
    const st: ItemState = {
      ...prev,
      takes: prev.takes + 1,
      last: at,
      cleanBpm: clean ? Math.max(prev.cleanBpm, bpm) : prev.cleanBpm,
      streak: stars === 3 ? prev.streak + 1 : 0,
      ewma: { ...prev.ewma, acc: Math.round((0.7 * prev.ewma.acc + 0.3 * (res?.score ?? 0)) * 1000) / 1000 },
      history: [...prev.history, { at, bpm, cv: 0 }].slice(-30),
      passLog: stars === 3 && !revealed ? [...(prev.passLog ?? []), { at, bpm }].slice(-30) : prev.passLog,
    };
    onPhrase(st, phraseEvents(phrase, res, g, at, Date.now().toString(36), 0, revealed), phraseXp(revealed ? Math.min(1, stars) : stars), stars);
  };
  const next = () => {
    stop();
    setSeed((s) => s + 1);
    setStep(0);
    setPlay(null);
    setWritten([]);
    setGrade(null);
    setRevealed(false);
    setSaved(false);
    setAgainTake(false);
    setTake((t) => t + 1);
  };
  const marks: NoteMark[] | undefined = play ? play.notes.map((n) => (n.verdict === 'ok' ? 'ok' : n.verdict === 'missing' ? 'missed' : n.verdict === 'pitch' ? 'wrong' : 'timing')) : undefined;
  const clef = inst === 'bass' || Math.max(...phrase.notes.map((n) => n.midi)) < 58 ? 'bass' : 'treble';
  const showNotes = revealed || !!play || !!grade;
  const book: LickBook = settings.lickBook ?? {};
  return (
    <section className="tx-coach" data-tx-step={step}>
      <ol className="tx-steps" aria-label="steps">
        {tx.steps.map((s, i) => (
          <li key={s} className={i === step ? 'now' : i < step ? 'past' : ''}>
            <button className="link" onClick={() => (i <= step || (i === 2 && play) ? (stop(), setStep(i)) : undefined)} disabled={i > step && !(i === 2 && play)}>
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>
      <p className="lk-meta" dir="auto">
        {phrase.source === 'public-domain' ? phrase.title[lang] + ' · ' : ''}
        {tx.key}: {keyName(phrase.key, phrase.minor)}
        {phrase.minor ? 'm' : ''}
        {drill.chart ? ` · ${drill.chart.join(' | ')}` : ''}
      </p>
      {showNotes ? (
        <div className="tx-staff">
          <NoteStaff notes={phrase.notes.map((n) => n.midi)} chord={false} keyPc={null} durs={phrase.notes.map((n) => n.dur)} marks={step === 1 ? marks : undefined} labels={phraseDegrees(phrase)} clef={clef} meter={4} />
        </div>
      ) : (
        <div className="tx-hidden" aria-hidden="true">
          {phrase.notes.map((_, i) => (
            <i key={i} />
          ))}
        </div>
      )}
      {step === 0 && (
        <>
          <p className="field-hint">{tx.hearHow}</p>
          <div className="chips" role="radiogroup" aria-label={tx.speed}>
            {SPEEDS.map((s) => (
              <button key={s} role="radio" aria-checked={speed === s} className={`chip ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)} disabled={playing} data-tx-speed={s}>
                {Math.round(s * 100)}%
              </button>
            ))}
            {phrase.chords && (
              <button className={`chip ${band ? 'on' : ''}`} aria-pressed={band} onClick={() => setBand(!band)} disabled={playing} data-tx-band={band ? 'on' : 'off'}>
                {tx.band}
              </button>
            )}
            <button
              className={`chip ${looping ? 'on' : ''}`}
              aria-pressed={looping}
              onClick={() => {
                loopRef.current = !looping;
                setLooping(!looping);
              }}
              data-tx-loop={looping ? 'on' : 'off'}
            >
              {tx.loop}
            </button>
          </div>
          <div className="drill-actions">
            {playing ? (
              <button className="btn" onClick={stop}>
                {tx.stop}
              </button>
            ) : (
              <button className="btn" onClick={() => void listen()} data-tx-listen="1">
                {tx.play} · <span dir="ltr">♩ {bpm}</span>
              </button>
            )}
            <button className="btn primary" onClick={() => (stop(), setStep(1))} data-tx-ready="1">
              {tx.steps[1]}
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <>
          {!play && <p className="field-hint">{inst === 'voice' ? tx.backVoice : tx.backHow}</p>}
          {!play && (
            <DrillTake
              key={`${phrase.id}:${take}`}
              autoStart={againTake}
              drill={drill}
              bpm={bpm}
              lang={lang}
              cal={calOf(settings)}
              drumsOk={settings.headphones}
              onDone={(_m, played: PlayedNote[]) => setPlay(comparePhrase(phrase, heardOfPlayed(played), bpm))}
            />
          )}
          {play && (
            <div className={`tx-result v-${play.verdict}`} data-tx-verdict={play.verdict} data-tx-first={play.first ? play.first.i : -1}>
              <p className="tx-why">
                <b>{play.verdict === 'clean' ? '✓' : '✕'}</b> {play.why[lang]}
              </p>
              <p className="tx-bars" dir="ltr">
                <span>
                  {tx.pitch} {Math.round(play.pitchAcc * 100)}%
                </span>
                <span>
                  {tx.rhythm} {Math.round(play.rhythmAcc * 100)}%
                </span>
              </p>
              {play.octave !== 0 && <small className="field-hint">{tx.octave}</small>}
              <div className="drill-actions">
                <button className="btn ghost" onClick={() => (setPlay(null), setAgainTake(true), setTake((t) => t + 1))}>
                  {tx.again}
                </button>
                <button className="btn ghost" onClick={() => (setPlay(null), setStep(0))}>
                  {tx.steps[0]}
                </button>
                <button className="btn primary" onClick={() => setStep(2)} data-tx-to-write="1">
                  {tx.toWrite}
                </button>
              </div>
            </div>
          )}
          {!revealed && !play && (
            <button className="link" onClick={() => setRevealed(true)} data-tx-reveal="1">
              {tx.reveal}
            </button>
          )}
          {revealed && <small className="field-hint">{tx.revealed}</small>}
        </>
      )}
      {step === 2 && (
        <>
          <p className="field-hint">{tx.write}</p>
          <ol className="tx-written" dir="ltr" data-tx-written={written.length}>
            {phrase.notes.map((n, i) => (
              <li key={i} className={grade ? (grade.marks[i] ? 'ok' : 'bad') : i === written.length ? 'now' : ''}>
                {written[i] !== undefined ? DEGREE_NAMES[written[i]] : '·'}
                {grade && !grade.marks[i] && <small> {DEGREE_NAMES[((n.midi - phrase.key) % 12 + 12) % 12]}</small>}
              </li>
            ))}
          </ol>
          {!grade && (
            <div className="tx-pad" dir="ltr">
              {DEGREE_NAMES.map((d, i) => (
                <button key={d} className="tx-deg" onClick={() => written.length < phrase.notes.length && setWritten([...written, i])} data-tx-deg={i}>
                  {d}
                </button>
              ))}
            </div>
          )}
          <div className="drill-actions">
            {!grade ? (
              <>
                <button className="btn ghost" disabled={!written.length} onClick={() => setWritten(written.slice(0, -1))}>
                  {tx.undo}
                </button>
                <button
                  className="btn primary"
                  disabled={written.length < phrase.notes.length}
                  onClick={() => {
                    const g = gradeDegrees(phrase, written);
                    setGrade(g);
                    finish(play, g);
                  }}
                  data-tx-check="1"
                >
                  {tx.check}
                </button>
              </>
            ) : (
              <>
                <span className="tx-score" data-tx-written-ok={`${grade.ok}/${grade.total}`}>
                  {grade.ok}/{grade.total} · <Stars n={phraseStars(play, grade)} of={3} />
                </span>
                <button className="btn ghost" onClick={next} data-tx-next="1">
                  {tx.newPhrase}
                </button>
                <button className="btn primary" onClick={() => setStep(3)} data-tx-to-keys="1">
                  {tx.to12}
                </button>
              </>
            )}
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <p className="field-hint">{tx.keysHow}</p>
          <button
            className="btn ghost"
            disabled={saved}
            onClick={() => {
              setSaved(true);
              onSettings({ lickBook: { ...book, own: [...(book.own ?? []).filter((l) => l.id !== own.id), own].slice(-60), mine: [...new Set([...(book.mine ?? []), own.id])] } });
            }}
            data-tx-keep={saved ? 'kept' : 'keep'}
          >
            {saved ? tx.kept : tx.keep}
          </button>
          <LickRun
            lang={lang}
            settings={settings}
            l={() => own}
            inst={inst}
            sub="transcribe"
            queue={[...LICK_KEYS.slice(LICK_KEYS.indexOf(phrase.key)), ...LICK_KEYS.slice(0, LICK_KEYS.indexOf(phrase.key))].map((k) => lickDrill(own, k, inst, { range: settings.voiceRange ?? null }))}
            items={items}
            onTake={onTake}
            onEnd={next}
          />
        </>
      )}
    </section>
  );
}
