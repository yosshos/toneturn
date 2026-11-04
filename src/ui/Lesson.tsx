import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { makeLesson, type IntroCard, type LessonDef, type LessonId, type Question } from '../engine/lesson';
import type { SessionState } from '../engine/session';
import { displayNote, type Naming } from '../engine/pitch';
import type { InputMode } from '../engine/session';
import { LessonController, type LessonView } from '../game/controller';
import { askTemplate, choiceLabel, hintText, LESSON_META, questionBadge } from '../game/content';
import type { Strings } from '../i18n/strings';
import { namingFor, resultFromSession, type Progress, type Settings } from '../storage/progress';
import { isTimed } from '../engine/scoring';
import { Burst, Keyboard, MicIcon, ModeSwitch, Note, PermissionPanel, withNote } from './bits';
import { Recap } from './Recap';
import { RhythmStaff } from './RhythmStaff';
import { buildPalette, CELLS, describe as describeRhythm, meterOf, onsetBeats, rhythmFromKey, rhythmKey, sameRhythm, totalBeats, type CellId, type Rhythm } from '../engine/rhythm';
import { makeAdapters, piano, store } from './services';

interface Props {
  t: Strings;
  lessonId: LessonId;
  settings: Settings;
  autoStart: boolean;
  onMode: (m: InputMode) => void;
  onExit: () => void;
  onAgain: () => void;
  onNext: (() => void) | null;
  onProgress: (p: Progress) => void;
  /** Generated session (placement / review / puzzle) instead of a path lesson. */
  lessonDef?: LessonDef;
  adapt?: (s: SessionState) => Question[] | null;
  nextLabel?: string;
}

const targetMidiOf = (q: Question) => (q.kind === 'degree' || q.kind === 'sing' || q.kind === 'note-name' ? q.targetMidi : q.kind === 'sing-seq' || q.kind === 'sing-run' ? q.midis[0] : 60);

export function LessonScreen({ t, lessonId, settings, autoStart, onMode, onExit, onAgain, onNext, onProgress, lessonDef, adapt, nextLabel }: Props) {
  const ctrlRef = useRef<LessonController | null>(null);
  const sessionId = useMemo(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, []);
  if (!ctrlRef.current) {
    const lesson = lessonDef ?? makeLesson(lessonId);
    let c: LessonController | null = null;
    const adapters = makeAdapters(
      () => c?.getView().question.answer ?? 1,
      () => (c ? targetMidiOf(c.getView().question) : 60),
      () => {
        const q = c?.getView().question;
        return q && (q.kind === 'sing-seq' || q.kind === 'sing-run') ? q.midis : null;
      },
    );
    c = new LessonController(
      lesson,
      adapters,
      {
        inputLang: settings.inputLang,
        outputLang: settings.outputLang,
        naming: namingFor(settings.naming, settings.outputLang),
        timed: isTimed(settings.timedScoring, settings.firstUseAt, new Date()),
        inputNaming: namingFor(settings.naming, settings.inputLang),
        latencyMs: settings.tapLatencyMs,
      },
      settings.mode,
      {
        onModeChange: onMode,
        onComplete: (s) => {
          void store.recordCompletion(resultFromSession(s, sessionId, new Date())).then(onProgress);
        },
        onEvent: (e) => {
          if (import.meta.env.DEV) console.debug('[toneturn]', e.type, e.detail ?? '');
        },
        adapt,
      },
    );
    ctrlRef.current = c;
  }
  const ctrl = ctrlRef.current;
  const v = useSyncExternalStore(ctrl.subscribe, ctrl.getView);

  useEffect(() => {
    ctrl.updateSettings({ inputLang: settings.inputLang, outputLang: settings.outputLang, naming: namingFor(settings.naming, settings.outputLang) });
  }, [ctrl, settings.inputLang, settings.outputLang, settings.naming]);

  useEffect(() => {
    if (autoStart) void ctrl.start();
    return () => ctrl.dispose();
  }, [ctrl, autoStart]);

  // Space / Enter tap the beat while a rhythm is being performed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.code !== 'Space' && e.code !== 'Enter')) return;
      if (ctrl.getView().question.kind !== 'rhythm-read' || ctrl.getView().stage !== 'question') return;
      e.preventDefault();
      ctrl.tapBeat(e.timeStamp);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctrl]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const lesson = v.session.lesson;
  const meta = LESSON_META[lesson.id];
  const q = v.question;
  const bb = displayNote({ letter: 'B', acc: -1 }, nm, lang);

  if (v.stage === 'complete') {
    return <Recap t={t} view={v} settings={settings} onReplay={(i) => ctrl.replayQuestion(i)} onAgain={onAgain} onHome={onExit} onNext={onNext} nextLabel={nextLabel} />;
  }

  const paused = v.phase === 'paused';
  const isSing = q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run';
  const isSeq = q.kind === 'degree-seq';
  const isRead = q.kind === 'rhythm-read';
  const showButtons = v.stage === 'question' && !paused && !v.error && !isSing && !isSeq && !isRead && (v.mode === 'buttons' || v.needsListenTap);
  const showKeypad = v.stage === 'question' && !paused && !v.error && isSeq && (v.mode === 'buttons' || v.needsListenTap);
  const showRecord = v.stage === 'question' && !paused && !v.error && isSing && (v.mode === 'buttons' || v.needsListenTap);
  const awaiting = v.phase === 'listening';
  const badge = questionBadge(q, lang, nm);
  // Note shown on screen only when it is *given* (never when it is the answer).
  const target =
    (q.kind === 'degree' && q.direction === 'name→degree') || (q.kind === 'sing' && q.promptBy === 'name') || (q.kind === 'degree' && q.direction !== 'name→degree')
      ? displayNote(q.target, nm, lang)
      : '';
  const keyName = 'key' in q && q.key ? displayNote(q.key, nm, lang) : '';
  const hideKeyboard = (q.kind === 'note-name' && q.direction === 'heard-pitch→name') || (q.kind === 'sing' && q.promptBy === 'echo') || q.kind === 'rhythm-read' || q.kind === 'rhythm-dict';
  const orbLabel =
    q.kind === 'degree'
      ? target
      : q.kind === 'quality'
        ? '♪♪♪'
        : q.kind === 'degree-seq'
          ? `${q.degrees.length}♪`
          : q.kind === 'interval'
            ? '♪ ↔ ♪'
            : q.kind === 'inversion'
              ? '𝄢 ?'
              : q.kind === 'note-name'
                ? q.direction === 'heard-pitch→name'
                  ? '♪ ?'
                  : String(q.degree)
                : '♪ ?';
  const celebrate = v.feedback?.kind === 'correct';

  return (
    <main className={`lesson stage-${v.stage} phase-${v.phase} kind-${q.kind}`}>
      <header className="lesson-top">
        <button className="icon-btn" onClick={() => (paused ? onExit() : ctrl.pause())} aria-label={paused ? t.exit : t.pause}>
          {paused ? '✕' : '❚❚'}
        </button>
        <Rounds v={v} t={t} />
        <ModeSwitch mode={v.mode} onChange={(m) => ctrl.setMode(m)} t={t} />
      </header>

      {v.error ? (
        <PermissionPanel
          error={v.error}
          t={t}
          lang={lang}
          onRetry={() => void ctrl.retryAccess()}
          onButtons={() => {
            ctrl.setMode('buttons');
            if (v.stage === 'starting') void ctrl.start();
          }}
        />
      ) : paused ? (
        <section className="paused-card">
          <h2>{t.paused}</h2>
          <p>{t.pausedHint}</p>
          <button className="btn mega" onClick={() => void ctrl.resume()}>
            {t.resume}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t.exit}
          </button>
        </section>
      ) : v.stage === 'starting' ? (
        <section className="paused-card">
          <h2>{withNote(meta.title[lang], bb)}</h2>
          <button className="btn mega" onClick={() => void ctrl.start()}>
            {v.mode === 'voice' && <MicIcon />} {t.startLesson}
          </button>
        </section>
      ) : v.stage === 'intro' ? (
        <section className="stage intro">
          <p className="eyebrow">{withNote(meta.title[lang], bb)}</p>
          <h1 className="stage-title">{t.introTitle}</h1>
          <div className={`intro-cards n-${lesson.intro.length}`}>
            {lesson.intro.map((step, i) => (
              <IntroCardView
                key={step.id}
                card={step.card}
                state={i === v.introStep ? 'active' : i < v.introStep ? 'past' : ''}
                t={t}
                lang={lang}
                nm={nm}
              />
            ))}
          </div>
          <Keyboard />
          <Caption text={v.caption} />
          <button className="btn ghost small" onClick={() => ctrl.skipIntro()}>
            {t.introSkip}
          </button>
        </section>
      ) : (
        <section className="stage question">
          <div className="key-badge">
            {badge.key ? (
              <>
                <span className="house-dot" aria-hidden="true" /> <Note>{displayNote(badge.key, nm, lang)}</Note> {badge.text}
              </>
            ) : (
              <>
                <span className="chord-dot" aria-hidden="true" /> {badge.text}
              </>
            )}
          </div>
          <div className="hero-slot">
            {q.kind === 'sing' ? (
              <Tuner v={v} />
            ) : q.kind === 'sing-seq' ? (
              <SeqTargets degrees={q.degrees} notes={v.feedback?.seqNotes} />
            ) : q.kind === 'sing-run' ? (
              <RunTargets offsets={q.run.offsets} notes={v.feedback?.seqNotes} caption={v.caption} />
            ) : q.kind === 'rhythm-read' ? (
              <ReadPrompt q={q} v={v} lang={lang} onTap={(ms) => ctrl.tapBeat(ms)} t={t} />
            ) : (
              <Orb v={v} label={q.kind === 'rhythm-dict' ? '♩ ?' : orbLabel} />
            )}
            <Burst on={celebrate} />
          </div>
          {!hideKeyboard && <Keyboard mark={q.kind === 'degree' && q.direction !== 'name→degree' ? q.targetMidi : undefined} />}
          <h1 className="ask">{withNote(askTemplate(q, lang), target, keyName)}</h1>
          <Listening v={v} t={t} hint={hintText(q, lang, v.mode === 'voice' && !v.needsListenTap)} />
          <FeedbackBanner v={v} t={t} lang={lang} settings={settings} />
          {showButtons && q.kind === 'rhythm-dict' && q.mode === 'build' && (
            <RhythmBuilder key={`${v.index}-${v.session.turn}`} q={q} lang={lang} t={t} disabled={!awaiting} onSubmit={(a) => ctrl.answer(a)} />
          )}
          {showButtons && !(q.kind === 'rhythm-dict' && q.mode === 'build') && (
            <div className={`answers n-${q.choices.length}`}>
              {q.choices.map((c) => {
                const lb = choiceLabel(q, c, lang, nm);
                return (
                  <button
                    key={String(c)}
                    className={`answer tone-${lb.tone} ${q.kind === 'rhythm-dict' ? 'rhythm-opt' : ''}`}
                    disabled={!awaiting}
                    onClick={() => ctrl.answer(c)}
                    data-answer={String(c)}
                  >
                    {q.kind === 'rhythm-dict' ? (
                      <RhythmStaff rhythm={rhythmFromKey(String(c), q.rhythm.bars)} label={lb.small} compact height={80} />
                    ) : (
                      <b>{lb.big}</b>
                    )}
                    <small>{lb.small}</small>
                  </button>
                );
              })}
            </div>
          )}
          {showKeypad && q.kind === 'degree-seq' && <SeqKeypad key={`${v.index}-${v.session.turn}`} t={t} length={q.degrees.length} disabled={!awaiting} onSubmit={(a) => ctrl.answer(a)} />}
          {showRecord && (
            <button className="btn record" disabled={!awaiting} onClick={() => ctrl.record()}>
              <MicIcon /> {t.singNow}
            </button>
          )}
          {v.needsListenTap && v.mode === 'voice' && !isSing && (
            <button className="btn primary" onClick={() => ctrl.listenNow()}>
              <MicIcon /> {t.listenAgain}
            </button>
          )}
          <Caption text={v.caption} />
          <div className="controls">
            <button className="btn small" onClick={() => ctrl.repeat()}>
              ↻ {t.repeat}
            </button>
            <button className="btn small" onClick={() => ctrl.skip()}>
              {t.skip} ⇥
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function IntroCardView({ card, state, t, lang, nm }: { card: IntroCard; state: string; t: Strings; lang: 'he' | 'en'; nm: Naming }) {
  switch (card.kind) {
    case 'key-degree':
      return (
        <div className={`intro-card ${state} deg-${card.degree}`}>
          <span className="intro-key">
            <Note>{displayNote(card.key, nm, lang)}</Note> {t.major}
          </span>
          <span className="intro-coin">
            <Note>{displayNote(card.note, nm, lang)}</Note>
          </span>
          <span className="intro-deg">
            <b>{card.degree}</b> {t.degreeLabel[card.degree]}
          </span>
        </div>
      );
    case 'degrees':
      return (
        <div className={`intro-card wide ${state}`}>
          <span className="intro-key">
            <Note>{displayNote(card.key, nm, lang)}</Note> {t.major}
          </span>
          <span className="step-row">
            {card.degrees.map((d) => (
              <span key={d} className={`step-coin d${d}`}>
                {d}
              </span>
            ))}
          </span>
        </div>
      );
    case 'quality':
      return (
        <div className={`intro-card ${state} q-${card.quality}`}>
          <span className="intro-key">{card.quality === 'maj' ? t.majorWord : t.minorWord}</span>
          <span className="intro-coin big-glyph">{card.quality === 'maj' ? '☀' : '☾'}</span>
          <span className="intro-deg">{card.quality === 'maj' ? t.brightWord : t.darkWord}</span>
        </div>
      );
    case 'cadence':
      return (
        <div className={`intro-card ${state} c-${card.ending}`}>
          <span className="intro-key" dir="ltr">
            {card.ending === 'resolved' ? 'V → I' : '… → V'}
          </span>
          <span className="intro-coin big-glyph">{card.ending === 'resolved' ? '⌂' : '?'}</span>
          <span className="intro-deg">{card.ending === 'resolved' ? t.resolvedWord : t.openWord}</span>
        </div>
      );
    case 'interval':
      return (
        <div className={`intro-card ${state} iv-${card.name}`}>
          <span className="intro-key">{{ M3: t.ivThird, P5: t.ivFifth, P8: t.ivOctave }[card.name]}</span>
          <span className="intro-coin big-glyph">{{ M3: '3', P5: '5', P8: '8' }[card.name]}</span>
          <span className="intro-deg">♪ → ♪</span>
        </div>
      );
    case 'inversion': {
      const root = displayNote(card.root, nm, lang);
      const label = card.bass === 'root' ? root : `${root}/${displayNote({ letter: (['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const)[('CDEFGAB'.indexOf(card.root.letter) + (card.bass === 'third' ? 2 : 4)) % 7], acc: 0 }, nm, lang)}`;
      return (
        <div className={`intro-card ${state}`}>
          <span className="intro-key">{{ root: t.bassRoot, third: t.bassThird, fifth: t.bassFifth }[card.bass]}</span>
          <span className="intro-coin big-glyph">
            <Note>{label}</Note>
          </span>
          <span className="intro-deg">{t.bassWord}</span>
        </div>
      );
    }
    case 'rhythm':
      return (
        <div className={`intro-card wide ${state}`}>
          <RhythmStaff rhythm={rhythmFromKey(card.rhythm)} label={describeRhythm(rhythmFromKey(card.rhythm), 'names', lang)} />
          <span className="intro-deg" dir="auto">
            {describeRhythm(rhythmFromKey(card.rhythm), 'syllables', lang)}
          </span>
        </div>
      );
    case 'sing':
      return (
        <div className={`intro-card wide ${state}`}>
          <span className="intro-key">
            <Note>{displayNote(card.key, nm, lang)}</Note> {t.major}
          </span>
          <span className="step-row" dir="ltr">
            <span className="step-coin d1">1</span>
            <span className="arrow" aria-hidden="true">
              ⟶
            </span>
            <span className="step-coin d5">5</span>
          </span>
        </div>
      );
  }
}

function Rounds({ v, t }: { v: LessonView; t: Strings }) {
  return (
    <ol className="rounds" aria-label={`${t.round} ${v.index + 1} ${t.of} ${v.total}`}>
      {v.session.records.map((r, i) => (
        <li
          key={i}
          className={`pill ${r.outcome} ${i === v.index && v.stage === 'question' ? 'current' : ''}`}
          aria-label={`${t.round} ${i + 1}: ${r.outcome}`}
        />
      ))}
    </ol>
  );
}

function Orb({ v, label }: { v: LessonView; label: string }) {
  const [active, setActive] = useState(false);
  const q = v.question;
  const target = q.kind === 'degree' ? q.targetMidi : -1;
  useEffect(() => piano.onNotes((a) => setActive(target >= 0 ? a.includes(target) && a.length === 1 : a.length > 0)), [target]);
  const fb = v.feedback?.kind;
  return (
    <div className={`orb ${active ? 'sounding' : ''} ${fb ?? ''}`}>
      <span dir="ltr">{label}</span>
    </div>
  );
}

/** Live singing tuner: needle shows cents from the target (octave-folded), green zone = ±35 cents. */
function Tuner({ v }: { v: LessonView }) {
  const live = v.singLive;
  const sung = v.feedback?.sung;
  const cents = live?.cents ?? sung?.cents ?? null;
  const clamped = cents === null ? 0 : Math.max(-100, Math.min(100, cents));
  const angle = (clamped / 100) * 60;
  const inTune = cents !== null && Math.abs(cents) <= 35;
  const q = v.question;
  return (
    <div
      className={`tuner ${v.mic !== 'off' ? 'live' : ''} ${inTune ? 'in-tune' : ''}`}
      role="img"
      aria-label={cents === null ? 'tuner' : `${Math.round(cents)} cents`}
    >
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <path d="M20 110 A80 80 0 0 1 180 110" className="arc-bg" />
        <path d={arc(-21, 21)} className="arc-good" />
        {[-100, -50, 0, 50, 100].map((c) => {
          const a = ((c / 100) * 60 - 90) * (Math.PI / 180);
          return (
            <line key={c} x1={100 + 66 * Math.cos(a)} y1={110 + 66 * Math.sin(a)} x2={100 + 94 * Math.cos(a)} y2={110 + 94 * Math.sin(a)} className="tick" />
          );
        })}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 110px' }} className={`needle ${cents === null ? 'idle' : ''}`}>
          <line x1="100" y1="110" x2="100" y2="36" />
          <circle cx="100" cy="110" r="9" />
        </g>
      </svg>
      <div className="tuner-target">
        <span className="tuner-deg">{q.kind === 'sing' ? q.degree : ''}</span>
        <span className="tuner-cents" dir="ltr">
          {cents === null ? '—' : `${cents > 0 ? '+' : ''}${Math.round(cents)}¢`}
        </span>
      </div>
    </div>
  );
}

function arc(fromDeg: number, toDeg: number) {
  const p = (d: number) => {
    const a = (d - 90) * (Math.PI / 180);
    return `${100 + 80 * Math.cos(a)} ${110 + 80 * Math.sin(a)}`;
  };
  return `M${p(fromDeg)} A80 80 0 0 1 ${p(toDeg)}`;
}

function Listening({ v, t, hint }: { v: LessonView; t: Strings; hint: string }) {
  if (v.mode !== 'voice' || v.needsListenTap) return <p className="hint">{hint}</p>;
  const state = v.mic;
  const label =
    state === 'capturing' || state === 'speech'
      ? v.question.kind === 'sing'
        ? t.singing
        : t.listening
      : state === 'opening'
        ? t.waitingMic
        : v.phase === 'playback'
          ? t.playing
          : '';
  return (
    <div className={`listen mic-${state}`} aria-live="polite">
      <span className="listen-ring" aria-hidden="true">
        <MicIcon />
      </span>
      <span className="listen-text">
        <b>{label || ' '}</b>
        <small>{v.interim ? `“${v.interim}”` : hint}</small>
      </span>
    </div>
  );
}

function FeedbackBanner({ v, t, lang, settings }: { v: LessonView; t: Strings; lang: 'he' | 'en'; settings: Settings }) {
  const f = v.feedback;
  if (!f) return <div className="feedback empty" aria-live="polite" />;
  const q = v.question;
  const nmFb = namingFor(settings.naming, lang);
  const ans = f.answer !== undefined && q.kind !== 'sing' && q.kind !== 'sing-seq' && q.kind !== 'sing-run' ? choiceLabel(q, f.answer, lang, nmFb) : null;
  const ansText =
    q.kind === 'degree-seq' && f.answer !== undefined
      ? String(f.answer).split('-').join(' ')
      : ans
        ? typeof f.answer === 'number'
          ? String(f.answer)
          : ans.small || ans.big
        : '';
  const sungText = !f.sung
    ? ''
    : { accurate: t.singAccurate, sharp: t.singSharp, flat: t.singFlat, wrong: t.singWrong, unclear: t.unclear }[f.sung.status];
  let text: string;
  switch (f.kind) {
    case 'correct':
    case 'correct-retry':
      text = f.sung ? sungText : `${t.correct} ${ansText}`;
      break;
    case 'retry':
      text = f.sung ? sungText : t.notQuite;
      break;
    case 'reveal':
      text = q.kind === 'sing' ? t.listenToTarget : `${t.revealed}: ${ansText}`;
      break;
    case 'skipped':
      text = t.skipped;
      break;
    case 'silence':
      text = t.silence;
      break;
    default:
      text = t.unclear;
  }
  return (
    <div className={`feedback ${f.kind}`} aria-live="assertive">
      <b>{text}</b>
      {f.sung && f.sung.cents !== null && (
        <small dir="ltr">
          {f.sung.cents > 0 ? '+' : ''}
          {f.sung.cents}¢
        </small>
      )}
      {(f.kind === 'correct' || f.kind === 'correct-retry' || f.kind === 'reveal' || f.kind === 'retry') && <AnswerChips f={f} t={t} />}
      {f.readHits && <ReadStrip hits={f.readHits} extra={f.readExtra ?? 0} t={t} />}
      {v.heard && (f.kind === 'unclear' || f.kind === 'ambiguous' || f.kind === 'retry') && !f.sung && (
        <small>
          {t.heard}: “{v.heard}”
        </small>
      )}
    </div>
  );
}

function Caption({ text }: { text: string | null }) {
  return (
    <p className="caption" aria-live="polite">
      {text ?? ' '}
    </p>
  );
}

/** Build an ordered degree answer by tapping 1–7, then submit. */
function SeqKeypad({ t, length, disabled, onSubmit }: { t: Strings; length: number; disabled: boolean; onSubmit: (a: string) => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  return (
    <div className="seq-pad">
      <div className="seq-slots" dir="ltr" aria-live="polite">
        {Array.from({ length }).map((_, i) => (
          <span key={i} className={`slot ${seq[i] ? 'filled' : ''}`}>
            {seq[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="seq-keys" dir="ltr">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button key={d} className="seq-key" disabled={disabled || seq.length >= length} onClick={() => setSeq((s) => [...s, d])} data-degree={d}>
            {d}
          </button>
        ))}
      </div>
      <div className="row center">
        <button className="btn small" disabled={!seq.length} onClick={() => setSeq((s) => s.slice(0, -1))}>
          ⌫ {t.backspace}
        </button>
        <button
          className="btn primary"
          disabled={disabled || seq.length !== length}
          onClick={() => {
            onSubmit(seq.join('-'));
            setSeq([]);
          }}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}

/** Accuracy / time / attempts / XP chips after an answer (spec J.7). */
function AnswerChips({ f, t }: { f: NonNullable<LessonView['feedback']>; t: Strings }) {
  const fast = f.timeMs != null && f.timeMs <= 2000;
  return (
    <div className="answer-chips" dir="ltr">
      {f.accuracy !== undefined && f.accuracy > 0 && f.accuracy < 1 && <span className="chip-mini">{Math.round(f.accuracy * 100)}%</span>}
      {f.timeMs != null && (
        <span className={`chip-mini ${fast ? 'good' : ''}`} title={t.responseTime}>
          ⏱ {(f.timeMs / 1000).toFixed(1)}s
        </span>
      )}
      {(f.attempt ?? 1) > 1 && <span className="chip-mini">×{f.attempt}</span>}
      {(f.kind === 'correct' || f.kind === 'correct-retry' || f.kind === 'reveal') && (f.xp ?? 0) > 0 && <span className="chip-mini xp">+{f.xp} XP</span>}
    </div>
  );
}

/** Degrees to sing, then a per-note result strip (spec H #3). */
/** A run as a contour of dots (height = pitch); after an attempt each dot shows its status (spec K.3). */
function RunTargets({ offsets, notes, caption }: { offsets: number[]; notes?: string[]; caption?: string | null }) {
  const lo = Math.min(...offsets);
  const hi = Math.max(...offsets);
  const mark: Record<string, string> = { ok: '✓', sharp: '↑', flat: '↓', smeared: '~', wrong: '✗', missed: '·' };
  return (
    <div className="run-targets">
      <ol className="run-contour" dir="ltr" aria-label="run contour">
        {offsets.map((o, i) => (
          <li key={i} className={`run-dot ${notes?.[i] ?? ''}`} style={{ ['--h' as string]: hi === lo ? 0.5 : (o - lo) / (hi - lo) }}>
            {notes && <small>{mark[notes[i]] ?? '·'}</small>}
          </li>
        ))}
      </ol>
      {notes && caption && (
        <p className="run-summary" dir="auto">
          {caption}
        </p>
      )}
    </div>
  );
}

/** Build-a-bar dictation (spec G.6): tap rhythm blocks into the bar(s), then Done. */
function RhythmBuilder({ q, lang, t, disabled, onSubmit }: { q: Extract<Question, { kind: 'rhythm-dict' }>; lang: 'he' | 'en'; t: Strings; disabled: boolean; onSubmit: (a: string) => void }) {
  const [cells, setCells] = useState<CellId[]>([]);
  const meter = meterOf(q.rhythm);
  const need = totalBeats(q.rhythm);
  const built: Rhythm = { ...q.rhythm, cells };
  const have = totalBeats(built);
  const palette = buildPalette(q.level, meter);
  const full = Math.abs(have - need) < 1e-9;
  return (
    <div className="rhythm-builder">
      <div className="builder-bar" data-beats={have} data-need={need}>
        {cells.length ? <RhythmStaff rhythm={{ ...built, bars: Math.max(1, Math.ceil(have / built.beatsPerBar - 1e-9)) }} label={describeRhythm(built, 'names', lang)} compact height={80} /> : <p className="field-hint">{t.buildHint}</p>}
        <span className="builder-count" dir="ltr">
          {Math.round(have * 2) / 2}/{need}
        </span>
      </div>
      <div className="builder-palette">
        {palette.map((c) => (
          <button
            key={c}
            className="btn small block-btn"
            data-cell={c}
            disabled={disabled || have + CELLS[c].beats > need + 1e-9}
            onClick={() => setCells((xs) => [...xs, c])}
            aria-label={describeRhythm({ ...q.rhythm, cells: [c], bars: 1 }, 'names', lang).replace(/^[^:]*: /, '')}
          >
            <RhythmStaff rhythm={{ ...q.rhythm, cells: [c], bars: 1 }} label="" compact bare height={70} />
          </button>
        ))}
      </div>
      <div className="controls">
        <button className="btn small" disabled={!cells.length} onClick={() => setCells((xs) => xs.slice(0, -1))}>
          ⌫ {t.undo}
        </button>
        <button
          className="btn primary"
          disabled={disabled || !full}
          onClick={() => onSubmit(sameRhythm(built, q.rhythm) ? q.answer : rhythmKey(built))}
        >
          {t.done}
        </button>
      </div>
    </div>
  );
}

function SeqTargets({ degrees, notes }: { degrees: number[]; notes?: string[] }) {
  return (
    <ol className="seq-targets" dir="ltr" aria-label="degrees to sing">
      {degrees.map((d, i) => (
        <li key={i} className={`seq-target ${notes?.[i] ?? ''}`}>
          <b>{d}</b>
          {notes && <small>{notes[i] === 'ok' ? '✓' : notes[i] === 'wrong' ? '✗' : '·'}</small>}
        </li>
      ))}
    </ol>
  );
}

/** What to perform (notation or words), the metronome light and a big tap pad. */
function ReadPrompt({ q, v, lang, onTap, t }: { q: Extract<Question, { kind: 'rhythm-read' }>; v: LessonView; lang: 'he' | 'en'; onTap: (ms: number) => void; t: Strings }) {
  const names = describeRhythm(q.rhythm, 'names', lang);
  return (
    <div className="read-prompt" data-onsets={onsetBeats(q.rhythm).join(',')} data-bpm={q.bpm} data-start={v.readStartPerf ?? undefined}>
      {q.show === 'notation' ? (
        <RhythmStaff rhythm={q.rhythm} label={names} />
      ) : (
        <p className="read-words" dir="auto">
          {names}
        </p>
      )}
      <div className={`beat-light ${v.beat?.accent ? 'accent' : ''}`} key={v.beat?.n ?? -1} aria-hidden="true" />
      <button
        className={`tap-pad ${v.phase === 'listening' ? 'live' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          onTap(e.timeStamp);
        }}
        aria-label={t.tapHere}
      >
        {t.tapHere} <small dir="ltr">{v.readTaps ? `· ${v.readTaps}` : ''}</small>
      </button>
    </div>
  );
}

/** Per-onset result after performing a rhythm: on time / early / late / missed. */
function ReadStrip({ hits, extra, t }: { hits: (number | null)[]; extra: number; t: Strings }) {
  return (
    <div className="read-strip" dir="ltr">
      {hits.map((h, i) => (
        <span key={i} className={`rs ${h === null ? 'miss' : Math.abs(h) <= 40 ? 'good' : 'ok'}`} title={h === null ? t.missed : `${h > 0 ? '+' : ''}${h} ms`}>
          {h === null ? '·' : Math.abs(h) <= 40 ? '✓' : h < 0 ? '←' : '→'}
        </span>
      ))}
      {extra > 0 && (
        <span className="rs extra">
          +{extra} {t.extraTaps}
        </span>
      )}
    </div>
  );
}
