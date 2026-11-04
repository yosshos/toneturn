import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { bflatTwoHomes } from '../engine/lesson';
import { displayNote } from '../engine/pitch';
import type { InputMode } from '../engine/session';
import { LessonController, type LessonView } from '../game/controller';
import type { Strings } from '../i18n/strings';
import { namingFor, resultFromSession, type Progress, type Settings } from '../storage/progress';
import { Keyboard, MicIcon, ModeSwitch, Note, PermissionPanel, withNote } from './bits';
import { Recap } from './Recap';
import { makeAdapters, piano, store } from './services';

interface Props {
  t: Strings;
  settings: Settings;
  autoStart: boolean;
  onMode: (m: InputMode) => void;
  onExit: () => void;
  onAgain: () => void;
  onProgress: (p: Progress) => void;
}

export function LessonScreen({ t, settings, autoStart, onMode, onExit, onAgain, onProgress }: Props) {
  const ctrlRef = useRef<LessonController | null>(null);
  const sessionId = useMemo(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, []);
  if (!ctrlRef.current) {
    const lesson = bflatTwoHomes();
    let c: LessonController | null = null;
    const adapters = makeAdapters(() => c?.getView().question.answer ?? 1);
    c = new LessonController(
      lesson,
      adapters,
      { inputLang: settings.inputLang, outputLang: settings.outputLang, naming: namingFor(settings.naming, settings.outputLang) },
      settings.mode,
      {
        onModeChange: onMode,
        onComplete: (s) => {
          void store.recordCompletion(resultFromSession(s, sessionId, new Date())).then(onProgress);
        },
        onEvent: (e) => {
          if (import.meta.env.DEV) console.debug('[toneturn]', e.type, e.detail ?? '');
        },
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

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, settings.uiLang);
  const keyName = (k = v.question.key) => (
    <>
      <Note>{displayNote(k, nm, lang)}</Note> {t.major}
    </>
  );

  if (v.stage === 'complete') {
    return <Recap t={t} view={v} settings={settings} onReplay={(i) => ctrl.replayQuestion(i)} onAgain={onAgain} onHome={onExit} />;
  }

  const paused = v.phase === 'paused';
  const showButtons = v.stage === 'question' && !paused && !v.error && (v.mode === 'buttons' || v.needsListenTap);
  const awaiting = v.phase === 'listening';

  return (
    <main className={`lesson stage-${v.stage} phase-${v.phase}`}>
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
          <button className="btn mega" onClick={() => void ctrl.start()}>
            {v.mode === 'voice' && <MicIcon />} {t.startLesson}
          </button>
        </section>
      ) : v.stage === 'intro' ? (
        <section className="stage intro">
          <h1 className="stage-title">{t.introTitle}</h1>
          <div className="intro-cards">
            {ctrl.getView().session.lesson.intro.map((step, i) => (
              <div key={step.id} className={`intro-card ${i === v.introStep ? 'active' : i < v.introStep ? 'past' : ''} deg-${step.degree}`}>
                <span className="intro-key">{keyName(step.key)}</span>
                <span className="intro-coin" dir="ltr">{displayNote(v.question.target, nm, lang)}</span>
                <span className="intro-deg">
                  <b>{step.degree}</b> {t.degreeLabel[step.degree]}
                </span>
              </div>
            ))}
          </div>
          <Keyboard mark={v.question.targetMidi} />
          <Caption text={v.caption} />
          <button className="btn ghost small" onClick={() => ctrl.skipIntro()}>
            {t.introSkip}
          </button>
        </section>
      ) : (
        <section className="stage question">
          <div className="key-badge">
            <span className="house-dot" aria-hidden="true" /> {keyName()}
          </div>
          <Orb v={v} label={displayNote(v.question.target, nm, lang)} />
          <Keyboard mark={v.question.targetMidi} />
          <h1 className="ask">{withNote(t.whichDegree, displayNote(v.question.target, nm, lang))}</h1>
          <Listening v={v} t={t} />
          <FeedbackBanner v={v} t={t} />
          {showButtons && (
            <div className="answers">
              {v.question.choices.map((d) => (
                <button key={d} className={`answer deg-${d}`} disabled={!awaiting} onClick={() => ctrl.answer(d)}>
                  <b>{d}</b>
                  <small>{t.degreeLabel[d]}</small>
                </button>
              ))}
            </div>
          )}
          {v.needsListenTap && v.mode === 'voice' && (
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
  const target = v.question.targetMidi;
  useEffect(() => {
    return piano.onNotes((a) => setActive(a.includes(target) && a.length === 1));
  }, [target]);
  const fb = v.feedback?.kind;
  return (
    <div className={`orb ${active ? 'sounding' : ''} ${fb ?? ''}`} dir="ltr">
      <span>{label}</span>
    </div>
  );
}

function Listening({ v, t }: { v: LessonView; t: Strings }) {
  if (v.mode !== 'voice' || v.needsListenTap) return <p className="hint">{v.mode === 'buttons' ? t.tapOneOrFive : ''}</p>;
  const state = v.mic;
  const label =
    state === 'capturing' || state === 'speech' ? t.listening : state === 'opening' ? t.waitingMic : v.phase === 'playback' ? t.playing : '';
  return (
    <div className={`listen mic-${state}`} aria-live="polite">
      <span className="listen-ring" aria-hidden="true">
        <MicIcon />
      </span>
      <span className="listen-text">
        <b>{label || ' '}</b>
        <small>{v.interim ? `“${v.interim}”` : t.sayOneOrFive}</small>
      </span>
    </div>
  );
}

function FeedbackBanner({ v, t }: { v: LessonView; t: Strings }) {
  const f = v.feedback;
  if (!f) return <div className="feedback empty" aria-live="polite" />;
  const text =
    f.kind === 'correct' || f.kind === 'correct-retry'
      ? `${t.correct} ${f.answer}`
      : f.kind === 'retry'
        ? t.notQuite
        : f.kind === 'reveal'
          ? `${t.revealed}: ${f.answer}`
          : f.kind === 'skipped'
            ? t.skipped
            : f.kind === 'silence'
              ? t.silence
              : t.unclear;
  return (
    <div className={`feedback ${f.kind}`} aria-live="assertive">
      <b>{text}</b>
      {v.heard && (f.kind === 'unclear' || f.kind === 'ambiguous' || f.kind === 'retry') && (
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
