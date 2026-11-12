// Chord and cadence builder (guitar roadmap "Next"; Tools of the keys and guitar courses).
//   Chord: pick a root and a quality, or tap notes on the keys / the neck → name it, hear it, see it on both instruments.
//   Cadence: a key and a cadence → hear it, see the voicings (smallest moves; the nearest guitar shapes), then play it:
//   each chord measured by MIDI (keys held) or the microphone (the strum recognizer). A finished run counts like a
//   game (ratings, XP, path evidence) through onResult. One phone screen; the microphone is open only while playing.

import '../chordfinder.css';
import '../chordbuilder.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILD_QUALITIES, buildChord, CADENCES, cadenceRunDetail, checkHeld, voiceCadence, type CadenceId } from '../engine/chordBuilder';
import { chordSymbol, chordWords, identifyChord, judgeStrum, noteNameBi, qualityName, shapesFor } from '../engine/chordFinder';
import type { ChordQuality } from '../engine/chordRecognize';
import { noteAt, TUNINGS } from '../engine/fretboard';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { ChordBox, KeysPad, Neck } from './Instrument';
import { piano } from './services';
import { useStrums } from './strumListen';

type Lang = 'he' | 'en';
const STD = TUNINGS[0];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SYM: Record<ChordQuality, string> = { M: 'maj', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', dim7: '°7', sus2: 'sus2', sus4: 'sus4', '5': '5', '9': '9', add9: 'add9' };
const TX = {
  title: { en: 'Chord & cadence builder', he: 'בונה אקורדים וקדנצות' },
  back: { en: 'Back', he: 'חזרה' },
  chordTab: { en: 'Chord', he: 'אקורד' },
  cadenceTab: { en: 'Cadence', he: 'קדנצה' },
  pick: { en: 'Pick', he: 'לבחור' },
  tap: { en: 'Tap notes', he: 'להקיש תווים' },
  clear: { en: 'Clear', he: 'לנקות' },
  hear: { en: 'Hear it', he: 'לשמוע' },
  play: { en: 'Play it', he: 'לנגן' },
  stop: { en: 'Stop', he: 'עצירה' },
  tapHint: { en: 'Tap three or more notes', he: 'הקישו שלושה תווים או יותר' },
  unknown: { en: 'No chord name for these notes', he: 'אין שם אקורד לתווים האלה' },
  noShape: { en: 'No shape in standard tuning', he: 'אין צורה בכיוון סטנדרטי' },
  major: { en: 'Major', he: 'מז׳ור' },
  minor: { en: 'Minor', he: 'מינור' },
  key: { en: 'Key', he: 'סולם' },
  yourTurn: { en: 'Play', he: 'נגנו' },
  heard: { en: 'Heard', he: 'נשמע' },
  missing: { en: 'missing', he: 'חסר' },
  extra: { en: 'extra', he: 'מיותר' },
  done: { en: 'right at the first try', he: 'נכון בניסיון הראשון' },
  howMidi: { en: 'Measured by MIDI: hold the chord, any voicing.', he: 'נמדד ב-MIDI: מחזיקים את האקורד, בכל וויסינג.' },
  howMic: { en: 'Measured by the microphone: one clean strum or block chord per chord.', he: 'נמדד במיקרופון: פריטה נקייה אחת או אקורד אחד לכל אקורד.' },
  mic: { en: 'The microphone is not available. Allow it for this site and try again.', he: 'המיקרופון לא זמין. אפשרו אותו לאתר ונסו שוב.' },
};

function playEvents(ev: { midi: number; start: number; duration: number; velocity: number; inst?: 'bass' | 'piano' }[], len: number) {
  void piano.unlock().then(() => piano.play(ev, len, new AbortController().signal)).catch(() => {});
}

export function ChordBuilder({ lang, settings, course, onBack, onResult }: { lang: Lang; settings: Settings; course: 'keys' | 'guitar'; onBack: () => void; onResult: (r: { score: number; detail: Record<string, unknown> }) => void }) {
  const tx = (k: keyof typeof TX) => TX[k][lang];
  const [tab, setTab] = useState<'chord' | 'cadence'>('chord');
  return (
    <main className="cf-screen cb-screen" data-tool="chordbuilder">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx('back')}>
          <span className="flip-rtl">‹</span>
        </button>
        <h1>{tx('title')}</h1>
      </header>
      <div className="seg cf-tabs" role="tablist">
        {(['chord', 'cadence'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-cb-tab={k}>
            {tx(k === 'chord' ? 'chordTab' : 'cadenceTab')}
          </button>
        ))}
      </div>
      {tab === 'chord' ? <ChordPane lang={lang} settings={settings} course={course} /> : <CadencePane lang={lang} settings={settings} course={course} onResult={onResult} />}
    </main>
  );
}

// ───────────────────────────── chord ─────────────────────────────

function ChordPane({ lang, settings, course }: { lang: Lang; settings: Settings; course: 'keys' | 'guitar' }) {
  const tx = (k: keyof typeof TX) => TX[k][lang];
  const [mode, setMode] = useState<'pick' | 'tap'>('pick');
  const [root, setRoot] = useState(0);
  const [quality, setQuality] = useState<ChordQuality>('maj7');
  const [tapped, setTapped] = useState<number[]>([]);
  // On the neck: one fret per string (string → fret), as a guitarist would hold it.
  const [neck, setNeck] = useState<Record<number, number>>({});
  const picked = useMemo(() => buildChord(root, quality), [root, quality]);
  const tapOnNeck = mode === 'tap' && course === 'guitar';
  const neckNotes = Object.entries(neck).map(([str, f]) => noteAt(STD, Number(str), f));
  const notes = mode === 'pick' ? picked : [...(tapOnNeck ? neckNotes : tapped)].sort((a, b) => a - b);
  const named = mode === 'pick' ? { root, quality } : notes.length >= 2 ? identifyChord(notes, BUILD_QUALITIES) : null;
  const shapes = named ? shapesFor(named.root, named.quality) : [];
  const shape = shapes[0] ?? null;
  const toggle = (m: number) => setTapped((xs) => (xs.includes(m) ? xs.filter((x) => x !== m) : [...xs, m]));
  const hear = () => notes.length && playEvents(notes.map((m, i) => ({ midi: m, start: i * 0.05, duration: 1.6, velocity: 0.7 })), 2);
  const keyMarks = notes.map((m) => ({ m, tone: named && m % 12 === named.root % 12 ? 'given' : 'mine' }));
  const tapNeck = (str: number, f: number) =>
    setNeck((n) => {
      const out = { ...n };
      if (out[str] === f) delete out[str];
      else out[str] = f;
      return out;
    });
  return (
    <section className="cb-pane" aria-live="polite">
      <div className="seg small cb-mode" role="radiogroup">
        {(['pick', 'tap'] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={mode === k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)} data-cb-mode={k}>
            {tx(k)}
          </button>
        ))}
      </div>
      {mode === 'pick' ? (
        <>
          <div className="cf-pick" role="radiogroup" aria-label={lang === 'he' ? 'יסוד' : 'Root'} dir="ltr">
            {NAMES.map((n, i) => (
              <button key={n} type="button" role="radio" aria-checked={root === i} className={`chip ${root === i ? 'on' : ''}`} onClick={() => setRoot(i)}>
                {n}
              </button>
            ))}
          </div>
          <div className="cf-pick q cb-q" role="radiogroup" aria-label={lang === 'he' ? 'סוג' : 'Quality'} dir="ltr">
            {BUILD_QUALITIES.map((q) => (
              <button key={q} type="button" role="radio" aria-checked={quality === q} className={`chip ${quality === q ? 'on' : ''}`} onClick={() => setQuality(q)} title={qualityName(q)[lang]}>
                {SYM[q]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="cb-taprow">
          <small className="field-hint">{tx('tapHint')}</small>
          <button type="button" className="link" onClick={() => (setTapped([]), setNeck({}))} disabled={!tapped.length && !Object.keys(neck).length}>
            {tx('clear')}
          </button>
        </div>
      )}
      <div className="cb-name" data-cb-chord={named ? chordSymbol(named) : ''}>
        {named ? (
          <>
            <b dir="ltr">{chordSymbol(named)}</b>
            <span>{chordWords(named)[lang]}</span>
            <small dir="ltr">{notes.map((m) => noteNameBi(m).en).join(' · ')}</small>
          </>
        ) : (
          <span className="cb-dim">{notes.length >= 2 ? tx('unknown') : tx('tapHint')}</span>
        )}
      </div>
      {tapOnNeck ? (
        <Neck tuning={STD} lo={0} hi={7} leftHanded={settings.leftHanded} onTap={tapNeck} dots={Object.entries(neck).map(([str, fret]) => ({ str: Number(str), fret, label: NAMES[noteAt(STD, Number(str), fret) % 12], tone: 'mine' as const }))} label={lang === 'he' ? 'צוואר הגיטרה' : 'Guitar neck'} />
      ) : (
        <KeysPad lo={48} hi={76} marks={keyMarks} onTap={mode === 'tap' ? toggle : undefined} label={lang === 'he' ? 'קלידים' : 'Keys'} />
      )}
      <div className="cb-both">
        {tapOnNeck ? (
          <KeysPad lo={48} hi={76} marks={keyMarks} label={lang === 'he' ? 'קלידים' : 'Keys'} />
        ) : shape ? (
          <div className="cb-box" dir="ltr">
            <ChordBox d={{ kind: 'box', instrument: 'guitar', ...shape.box, frets: Math.max(4, Math.max(0, ...shape.box.dots.map((d) => d.fret)) - shape.box.baseFret + 1) }} tuning={STD} leftHanded={settings.leftHanded} />
            <small>{shape.name[lang]}</small>
          </div>
        ) : (
          named && <small className="field-hint">{tx('noShape')}</small>
        )}
        <button type="button" className="btn primary cb-hear" onClick={hear} disabled={!notes.length} data-cb-hear="1">
          {tx('hear')}
        </button>
      </div>
    </section>
  );
}

// ───────────────────────────── cadence ─────────────────────────────

function CadencePane({ lang, settings, course, onResult }: { lang: Lang; settings: Settings; course: 'keys' | 'guitar'; onResult: (r: { score: number; detail: Record<string, unknown> }) => void }) {
  const tx = (k: keyof typeof TX) => TX[k][lang];
  const [tonic, setTonic] = useState(0);
  const [minor, setMinor] = useState(false);
  const [id, setId] = useState<CadenceId>('two-five-one');
  const chords = useMemo(() => voiceCadence(id, tonic, minor), [id, tonic, minor]);
  const def = CADENCES.find((c) => c.id === id)!;
  // The run: which chord is asked, the first-try results, the last feedback line.
  const [run, setRun] = useState<{ i: number; first: (boolean | null)[]; line: string } | null>(null);
  const [mic, setMic] = useState(false);
  const useMidi = midi.devices.length > 0;
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => setRun(null), [id, tonic, minor]);

  const hear = () => {
    const ev = chords.flatMap((c, k) => [{ midi: c.bass, start: k * 1.3, duration: 1.2, velocity: 0.75, inst: 'bass' as const }, ...c.upper.map((m) => ({ midi: m, start: k * 1.3, duration: 1.2, velocity: 0.62 }))]);
    playEvents(ev, chords.length * 1.3 + 0.5);
  };
  const finish = (first: boolean[]) => onResult(cadenceRunDetail(first, useMidi ? 'midi' : 'mic', id, tonic, minor));
  /** One attempt at the asked chord: right → next; wrong → the first try is lost, try again. */
  const attempt = (ok: boolean, line: string) => {
    const r = runRef.current;
    if (!r || r.i >= chords.length) return;
    const first = [...r.first];
    if (first[r.i] === null) first[r.i] = ok;
    if (!ok) return setRun({ ...r, first, line });
    const i = r.i + 1;
    setRun({ i, first, line: '' });
    if (i >= chords.length) finish(first.map((x) => !!x));
  };
  // MIDI: the keys held, judged when they change (wrong only once three keys are down and settled).
  useEffect(() => {
    if (!run || run.i >= chords.length || !useMidi) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const held = new Set<number>();
    const off = midi.onNote((m, on) => {
      if (on) held.add(m);
      else held.delete(m);
      const r = runRef.current;
      if (!r || r.i >= chords.length) return;
      const c = chords[r.i].chord;
      const h = checkHeld([...held], c);
      if (timer) clearTimeout(timer);
      if (h.ok) return attempt(true, '');
      if (held.size >= 3)
        timer = setTimeout(() => {
          const parts = [h.missing.length ? `${tx('missing')} ${h.missing.map((p) => NAMES[p]).join(' ')}` : '', h.extra.length ? `${tx('extra')} ${h.extra.map((p) => NAMES[p]).join(' ')}` : ''].filter(Boolean);
          attempt(false, parts.join(' · '));
        }, 450);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.i, chords, useMidi]);
  // Microphone: each strum (or block chord) judged against the asked chord.
  useStrums(
    !!run && run.i < chords.length && !useMidi,
    (frames) => {
      const r = runRef.current;
      if (!r || r.i >= chords.length) return;
      const v = judgeStrum(frames, chords[r.i].chord);
      if (v.verdict === 'again') return;
      attempt(v.verdict === 'right', v.verdict === 'wrong' ? `${tx('heard')} ${v.heard ?? '?'}` : '');
    },
    () => (setMic(true), setRun(null)),
  );

  const playing = !!run && run.i < chords.length;
  const doneN = run && run.i >= chords.length ? run.first.filter(Boolean).length : null;
  return (
    <section className="cb-pane">
      <div className="cf-pick cb-keys" role="radiogroup" aria-label={tx('key')} dir="ltr">
        {NAMES.map((n, i) => (
          <button key={n} type="button" role="radio" aria-checked={tonic === i} className={`chip ${tonic === i ? 'on' : ''}`} onClick={() => setTonic(i)} disabled={playing}>
            {n}
          </button>
        ))}
      </div>
      <div className="seg small cb-mode" role="radiogroup" aria-label={tx('key')}>
        {[false, true].map((mi) => (
          <button key={String(mi)} type="button" role="radio" aria-checked={minor === mi} className={minor === mi ? 'on' : ''} onClick={() => setMinor(mi)} disabled={playing}>
            {tx(mi ? 'minor' : 'major')}
          </button>
        ))}
      </div>
      <div className="cb-cads" role="radiogroup" aria-label={tx('cadenceTab')}>
        {CADENCES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={id === c.id} className={`chip ${id === c.id ? 'on' : ''}`} onClick={() => setId(c.id)} disabled={playing} data-cadence={c.id}>
            {c.name[lang]}
          </button>
        ))}
      </div>
      <p className="cb-roman">
        <b dir="ltr">{def.roman[minor ? 'minor' : 'major']}</b>
        <small>{def.what[lang]}</small>
      </p>
      <div className="cb-row" dir="ltr" data-cb-chords={chords.map((c) => c.symbol).join(' ')}>
        {chords.map((c, k) => {
          const st = !run ? '' : k < run.i ? (run.first[k] ? 'ok' : 'late') : k === run.i ? 'now' : '';
          return (
            <div key={k} className={`cb-card ${st}`} data-cb-state={st || 'idle'}>
              <b>{c.symbol}</b>
              {course === 'guitar' && c.shape ? (
                <ChordBox d={{ kind: 'box', instrument: 'guitar', ...c.shape.box, frets: Math.max(4, Math.max(0, ...c.shape.box.dots.map((d) => d.fret)) - c.shape.box.baseFret + 1) }} tuning={STD} leftHanded={settings.leftHanded} />
              ) : (
                <KeysPad lo={53} hi={76} marks={c.upper.map((m) => ({ m, tone: 'mine' }))} />
              )}
              <small>
                {course === 'guitar' ? (
                  <KeysMini upper={c.upper} />
                ) : (
                  <>
                    {lang === 'he' ? 'בס' : 'bass'} {NAMES[c.bass % 12]}
                  </>
                )}
              </small>
            </div>
          );
        })}
      </div>
      <p className="cb-status" aria-live="polite" data-cb-done={doneN ?? ''}>
        {mic ? tx('mic') : doneN !== null ? `${doneN}/${chords.length} ${tx('done')}` : playing ? `${tx('yourTurn')} ${chords[run!.i].symbol}${run!.line ? ` · ${run!.line}` : ''}` : useMidi ? tx('howMidi') : tx('howMic')}
      </p>
      <div className="cb-actions">
        <button type="button" className="btn ghost" onClick={hear} disabled={playing}>
          {tx('hear')}
        </button>
        <button type="button" className={`btn ${playing ? '' : 'primary'}`} onClick={() => (setMic(false), setRun(playing ? null : { i: 0, first: chords.map(() => null), line: '' }))} data-cb-play={playing ? 'on' : 'off'}>
          {playing ? tx('stop') : tx('play')}
        </button>
      </div>
    </section>
  );
}

/** The voicing's notes in letters (the guitar card shows the shape; the keys voicing in text). */
function KeysMini({ upper }: { upper: number[] }) {
  return <span dir="ltr">{upper.map((m) => NAMES[m % 12]).join(' ')}</span>;
}
