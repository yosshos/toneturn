import { TypedText } from './TypedText';
import { useTalk } from './TalkToggle';
import { DOMAIN_COLOR, Glyph } from './Glyph';
import { answerFormat, pcToMidi, type AnswerFormat } from '../engine/answerFormat';
import { Toni, type ToniState } from './Toni';
import { Icon } from './icons';
import { buzz } from './Arcade';
import { recordGroove } from '../storage/analysis';
import { recordConfusion } from '../storage/confusion';
import { langOf } from './Trends';
import { lessonSections, placementPlanOf } from '../engine/placement';
import { TalkToggle } from './TalkToggle';
import { PlacementMeter } from './PlacementMeter';
import { NoteStaff } from './NoteViews';
import { PitchTrace } from './Vocal';
import { reportPuzzle } from '../cloud/compete';
import { fitLessonToRange, fitQuestions } from '../engine/voiceFit';
import { keyboardIsHint, noHints, withAids } from '../engine/aids';
import { LessonAside } from './Asides';
import { TOPIC_GEN } from '../engine/topics';
import type { Ratings } from '../engine/rating';
import { NoteViews, seqMarks } from './NoteViews';
import { refresherFor } from '../content/refresher';
import { useRefresher } from './MiniLesson';
import type { MiniLesson } from '../content/miniTypes';
import { DiagramView, PlaceSurfaceView } from './Instrument';
import { itemNeedsHeadphones } from '../engine/fx';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { answerFromMidi, INTERVAL_SEMITONES, makeLesson, pcFromKey, questionSkill, type IntervalName, type IntroCard, type SkillId, type LessonDef, type LessonId, type Question } from '../engine/lesson';
import type { SessionState } from '../engine/session';
import { displayNote, type Naming, type PitchClass } from '../engine/pitch';
import { midi } from '../speech/midi';
import type { InputMode } from '../engine/session';
import { LessonController, type LessonView } from '../game/controller';
import { answerWord, askTemplate, choiceLabel, hintText, keysGiveAway, LESSON_META, questionBadge } from '../game/content';
import type { Strings } from '../i18n/strings';
import { gemsOf, localDay, namingFor, provisionalDays, ratingsOf, resultFromSession, type Progress, type Settings } from '../storage/progress';
import { StreakCelebration } from './Streak';
import type { StreakState } from '../engine/streak';
import { overallHistory, peakOf, ratingChange, type RatingChange } from '../engine/rating';
import { isTimed } from '../engine/scoring';
import { learnPace, loadPace } from '../storage/pace';
import { paceBand, paceTarget } from '../engine/fluency';
import { Burst, Keyboard, MicIcon, ModeSwitch, Note, PermissionPanel, withNote } from './bits';
import { noteViewsOf } from './noteViewPref';
import { Recap } from './Recap';
import { RhythmStaff } from './RhythmStaff';
import { buildPalette, CELLS, describe as describeRhythm, meterOf, onsetBeats, rhythmFromKey, rhythmKey, sameRhythm, totalBeats, type CellId, type Rhythm } from '../engine/rhythm';
import { makeAdapters, piano, SIMULATED, store } from './services';

interface Props {
  /** The brief before a topic exercise (owner, 2026-11-07): short name, what it's about, what you'll do, a refresher, Play. */
  brief?: { kicker: string; title: string; about: string };
  /** From the brief: take this topic off my path / keep a ✓ step on it. */
  onHideTopic?: () => void;
  onKeepStep?: () => void;
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
  /** Continue a saved session (its lesson is used as saved, already fitted). */
  resume?: Pick<SessionState, 'records' | 'index' | 'xp'>;
  /** After each answered question (saving progress). */
  onStep?: (s: SessionState) => void;
  /** When the session completes (clears saved progress). */
  onDone?: () => void;
  nextLabel?: string;
  /** Current skill ratings (for automatic aids). */
  ratings?: Ratings;
  /** The player's first name, for personal feedback. */
  playerName?: string | null;
  /** First-try results per skill, oldest first (the answer ladder, 0.61). */
  recent?: Partial<Record<string, boolean[]>>;
  /** Change a setting from inside the lesson (headphones confirmation, spec AE R2). */
  onSettings?: (p: Partial<Settings>) => void;
}

const targetMidiOf = (q: Question) => (q.kind === 'degree' || q.kind === 'sing' || q.kind === 'note-name' ? q.targetMidi : q.kind === 'sing-seq' || q.kind === 'sing-run' ? q.midis[0] : 60);

export function LessonScreen({ t, lessonId, settings, autoStart, onMode, onExit, onAgain, onNext, onProgress, lessonDef, adapt, resume, onStep, onDone, nextLabel, ratings, playerName, onSettings, brief, onHideTopic, onKeepStep, recent }: Props) {
  const [phones, setPhones] = useState(!!settings.headphones);
  const ctrlRef = useRef<LessonController | null>(null);
  const [change, setChange] = useState<{ change: RatingChange; peakBefore: number | null } | null>(null);
  const [xpTotals, setXpTotals] = useState<{ before: number; after: number } | null>(null);
  const [streakMoment, setStreakMoment] = useState<{ before: number; after: StreakState; gems: number } | null>(null);
  const sessionId = useMemo(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, []);
  if (!ctrlRef.current) {
    // Aids (spec M.3): marked per question from the player's current ratings; aided items count as easier.
    // Sung questions sit inside the player's range (spec P.0): moved by octaves, or left out when they cannot fit.
    const lesson = resume && lessonDef ? lessonDef : fitLessonToRange(withAids(lessonDef ?? makeLesson(lessonId), settings.aids ?? 'auto', ratings ?? {}), settings.voiceRange);
    let c: LessonController | null = null;
    const adapters = makeAdapters(
      () => c?.getView().question.answer ?? 1,
      () => (c ? targetMidiOf(c.getView().question) : 60),
      () => {
        const q = c?.getView().question;
        return q && (q.kind === 'sing-seq' || q.kind === 'sing-run') ? q.midis : null;
      },
      // Simulator: say the right answer in the question's own words (letters, English).
      () => {
        const q = c?.getView().question;
        return q ? answerWord(q, q.answer, 'en') : null;
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
        // Pace goals count unless the player turned timed scoring off (the first-week grace is for the rating only).
        pace: { profile: loadPace(), on: settings.timedScoring !== false },
        inputNaming: namingFor(settings.naming, settings.inputLang),
        latencyMs: settings.tapLatencyMs,
        micLatencyMs: settings.micLatencyMs,
        playerName: playerName ?? null,
        rhythmByVoice: settings.rhythmByVoice ?? false,
      },
      settings.mode,
      {
        onModeChange: onMode,
        // The confusion map (0.50): every wrong choice answer → which answer was mixed up with which, per topic.
        onEvent: (e) => {
          if (import.meta.env.DEV) console.debug('[toneturn]', e.type, e.detail ?? '');
          if (e.type !== 'graded') return;
          const d = e.detail as { answer: unknown; result: { kind: string }; question?: Question; readHits?: (number | null)[] };
          // The groove fingerprint (0.50): every tapped rhythm → its offsets per onset.
          if (d.question?.kind === 'rhythm-read' && d.readHits?.length && !d.question.tempoGoal) {
            const rq = d.question;
            void recordGroove(onsetBeats(rq.rhythm), d.readHits, rq.bpm, rq.rhythm.beatsPerBar);
          }
          if (d.result.kind === 'correct' || !d.question) return;
          recordConfusion(d.question, d.answer);
        },
        resume,
        onStep,
        onComplete: (s) => {
          onDone?.();
          void (async () => {
            // Rating card (spec L.3): compare ratings before and after this session.
            const before = await store.loadProgress();
            const result = resultFromSession(s, sessionId, new Date());
            learnPace(s.lesson.questions, s.records);
            const after = await store.recordCompletion(result);
            if (result.puzzle && !before.puzzles?.[result.puzzle.week]) {
              const ms = result.items?.[0]?.timeMs ?? null;
              void reportPuzzle(result.puzzle.week, result.puzzle.band, result.puzzle.medal === 'gold' || result.puzzle.medal === 'silver' ? result.puzzle.medal : 'none', ms).catch(() => {});
            }
            setChange({ change: ratingChange(ratingsOf(before), ratingsOf(after)), peakBefore: peakOf(overallHistory(before.ratingEvents ?? [])) });
            setXpTotals({ before: before.xp, after: after.xp });
            // Streak screen (spec N.2): the first qualifying session of the day.
            const purchases = settings.purchases ?? [];
            // A day counted early (five answers in) is still celebrated by its first finished session.
            const today = localDay(new Date());
            const early = provisionalDays.has(today);
            if (early) provisionalDays.delete(today);
            const g0 = gemsOf(early ? { ...before, stats: before.stats ? { ...before.stats, days: before.stats.days.filter((d) => d !== today) } : before.stats } : before, purchases);
            const g1 = gemsOf(after, purchases);
            if (g1.streak.practicedToday && !g0.streak.practicedToday) setStreakMoment({ before: g0.streak.count, after: g1.streak, gems: g1.earned - g0.earned });
            onProgress(after);
          })();
        },
        adapt: adapt
          ? (st) => {
              const qs = adapt(st);
              return qs && settings.voiceRange ? fitQuestions(qs, settings.voiceRange) : qs;
            }
          : undefined,
      },
    );
    ctrlRef.current = c;
  }
  const ctrl = ctrlRef.current;
  const v = useSyncExternalStore(ctrl.subscribe, ctrl.getView);
  const openRefresher = useRefresher();

  useEffect(() => {
    ctrl.updateSettings({ inputLang: settings.inputLang, outputLang: settings.outputLang, naming: namingFor(settings.naming, settings.outputLang) });
  }, [ctrl, settings.inputLang, settings.outputLang, settings.naming]);

  useEffect(() => {
    if (autoStart && !(brief && !resume)) void ctrl.start();
    return () => ctrl.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl, autoStart]);

  // MIDI keyboard: a key press answers degree / note-name questions (singing tasks use MidiPitchCapture).
  useEffect(() => {
    if (!settings.midiInput && !settings.computerKeys) return;
    return midi.onNote((m, on) => {
      const view = ctrl.getView();
      if (!on || view.stage !== 'question' || view.phase !== 'listening') return;
      const a = answerFromMidi(view.question, m);
      if (a !== null) ctrl.answer(a);
    });
  }, [ctrl, settings.midiInput, settings.computerKeys]);

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

  // Keyboard shortcuts (SPEC-DESKTOP §5): 1–9 answer, Space repeat, Enter continue, C compare, H hint, S skip, Esc pause.
  // Never while typing in a field, and Space / Enter stay the beat in rhythm reading (above).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName))) return;
      const view = ctrl.getView();
      if (view.stage !== 'question') return;
      const q = view.question;
      const k = e.key.toLowerCase();
      if (/^[1-9]$/.test(e.key) && view.phase === 'listening' && 'choices' in q && q.choices.length && !(q.kind === 'rhythm-dict' && q.mode === 'build')) {
        const c = q.choices[Number(e.key) - 1];
        if (c !== undefined) ctrl.answer(c);
      } else if (e.key === 'Enter' && view.awaitNext) ctrl.next();
      else if (e.code === 'Space' && q.kind !== 'rhythm-read') ctrl.repeat();
      else if (k === 'c' && view.awaitNext) ctrl.compareNow();
      else if (k === 'h') ctrl.useHint();
      else if (k === 's') ctrl.skip();
      else if (e.key === 'Escape') ctrl.pause();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctrl]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const lesson = v.session.lesson;
  // The answer ladder (0.61): names → names with a staff hint → pick the staff, per skill.
  const ladderQ = v.question;
  const ladderOn = ladderQ.kind === 'interval' || (ladderQ.kind === 'note-name' && ladderQ.direction === 'heard-pitch→name');
  const fmtLog = useRef<Record<number, AnswerFormat>>({});
  if (ladderOn && fmtLog.current[v.index] === undefined) {
    const skill = questionSkill(ladderQ);
    const prev = Object.keys(fmtLog.current)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => fmtLog.current[k]);
    fmtLog.current[v.index] = answerFormat({ recent: recent?.[skill] ?? [], reading: recent?.notes, seed: `${v.session.lesson.id}:${v.index}:${ladderQ.id}`, prev, isNew: !!(lesson as { intro?: unknown[] }).intro?.length && v.index < 2 });
  }
  const fmt: AnswerFormat = ladderOn ? fmtLog.current[v.index] : 'names';
  const staffOf = (c: unknown): { notes: number[]; chord: boolean; keyPc: PitchClass | null } | null => {
    if (ladderQ.kind === 'interval') return { notes: [ladderQ.lowMidi, ladderQ.lowMidi + INTERVAL_SEMITONES[c as IntervalName]], chord: ladderQ.mode === 'harmonic', keyPc: null };
    if (ladderQ.kind === 'note-name') {
      const pc = pcFromKey(String(c));
      return pc ? { notes: [pcToMidi(pc.letter, pc.acc)], chord: false, keyPc: ladderQ.key } : null;
    }
    return null;
  };
  const meta = LESSON_META[lesson.id];
  const q = v.question;
  const bb = displayNote({ letter: 'B', acc: -1 }, nm, lang);

  if (v.stage === 'complete') {
    return (
      <>
        <Recap t={t} view={v} settings={settings} onReplay={(i) => ctrl.replayQuestion(i)} onCompare={(i) => ctrl.compareQuestion(i)} onAgain={onAgain} onHome={onExit} onNext={onNext} nextLabel={nextLabel} rating={change} xpTotals={xpTotals} playerName={playerName ?? null} />
        {streakMoment && (
          <StreakCelebration t={t} before={streakMoment.before} after={streakMoment.after} gemsGained={streakMoment.gems} today={localDay(new Date())} onDone={() => setStreakMoment(null)} />
        )}
      </>
    );
  }

  const paused = v.phase === 'paused';
  const isSing = q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run';
  const isSeq = q.kind === 'degree-seq' || q.kind === 'name-seq';
  const isRead = q.kind === 'rhythm-read';
  const isPlace = q.kind === 'place';
  const showButtons = v.stage === 'question' && !paused && !v.error && !isSing && !isSeq && !isRead && !isPlace && (v.mode === 'buttons' || v.needsListenTap);
  // Place questions (spec AE §3.3): the surface is the answer pad; after the answer it shows yours and the right notes.
  const placeRec = isPlace ? v.session.records[v.index] : null;
  const placeLast = placeRec?.attempts.length ? String(placeRec.attempts[placeRec.attempts.length - 1].answer) : null;
  // "Play", not "Sing": the player's instrument, or a line the question asks to play back on an instrument (guitar course).
  const playing = (!!settings.instrument && !['voice'].includes(settings.instrument)) || (q.kind === 'sing-seq' && !!q.play);
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
  // Lit keys would show the answer for listening questions: light them only once the question is answered.
  const answered = !!v.feedback && ['correct', 'correct-retry', 'reveal', 'skipped'].includes(v.feedback.kind);
  const keysLive = answered || !keysGiveAway(q);
  // Rhythm exercises have no note views; for everything else keysGiveAway() keeps the answer hidden.
  // Degree ↔ name questions: an unasked-for keyboard lets the player count to the answer — it waits for Hint (0.50.2).
  const keysAreHint = !answered && !q.aid && keyboardIsHint(q);
  const canHint = keysAreHint && !noHints(v.session.lesson.id);
  const hideKeyboard = q.kind === 'rhythm-read' || q.kind === 'rhythm-dict' || keysAreHint || (q.kind === 'choice' && !!q.chart);
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
  const isStaircase = v.session.lesson.id === 'placement' && v.session.lesson.version >= 3;
  // The concept refresher: the mini-lesson behind this question (never inside the level test — it would measure the lesson).
  const refresher = lesson.id === 'placement' ? null : refresherFor(q, lessonId);
  const placementSkill = isStaircase ? (/^p:([a-z-]+):/.exec(q.id)?.[1] as SkillId | undefined) : undefined;

  return (
    <main className={`lesson stage-${v.stage} phase-${v.phase} kind-${q.kind} ${isStaircase ? 'with-meter' : ''}`}>
      <InARow records={v.session.records} lang={lang} />
      {isStaircase && <PlacementMeter s={v.session} t={t} />}
      <header className="lesson-top">
        <button className="icon-btn" onClick={() => (paused ? onExit() : ctrl.pause())} aria-label={paused ? t.exit : t.pause}>
          {paused ? '✕' : '❚❚'}
        </button>
        <Rounds v={v} t={t} />
        <TalkToggle lang={lang} />
        <ModeSwitch mode={v.mode} onChange={(m) => ctrl.setMode(m)} t={t} />
      </header>
      {lesson.id === 'placement' && <TopicStrip v={v} t={t} />}

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
      ) : v.stage === 'starting' && brief ? (
        <ExerciseBrief brief={brief} lang={lang} how={howText(lesson.questions[0]?.kind, lang)} refresher={lesson.questions[0] ? refresherFor(lesson.questions[0], lesson.id) : null} onRefresher={openRefresher} onPlay={() => void ctrl.start()} voice={v.mode === 'voice'} onHide={onHideTopic} onKeep={onKeepStep} />
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
              // sight-singing (a written line): the degrees would give the answer away — shown only with the result
              q.show && !v.feedback ? null : <SeqTargets degrees={q.degrees} notes={v.feedback?.seqNotes} />
            ) : q.kind === 'sing-run' ? (
              <>
                <RunTargets offsets={q.run.offsets} notes={v.feedback?.seqNotes} caption={v.caption} />
                {v.feedback?.seqNotes && v.runFrames && v.runFrames.length > 0 && <PitchTrace frames={v.runFrames} targets={q.midis} seconds={q.midis.length / q.run.nps + 0.5} label={t.runTrace} />}
              </>
            ) : q.kind === 'rhythm-read' ? (
              <ReadPrompt q={q} v={v} lang={lang} onTap={(ms) => ctrl.tapBeat(ms)} onRelease={(ms) => ctrl.tapRelease(ms)} t={t} onLane={(ms, lane) => ctrl.tapBeat(ms, lane)} />
            ) : (
              q.kind === 'choice' && (q.text || q.show || q.diagram || q.chart) ? (
                <div className="choice-show">
                  {q.chart && (
                    <figure className="chart-page" dir="ltr" aria-label={q.chart.title} data-chart-page="1">
                      <figcaption>{q.chart.title}</figcaption>
                      <ol className="cp-bars">
                        {q.chart.bars.map((b, i) => (
                          <li key={i}>
                            <small>{i + 1}</small>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ol>
                    </figure>
                  )}
                  {q.text && <p className="choice-text" dir={/[֐-׿]/.test(q.text[lang]) ? 'rtl' : 'ltr'}>{q.text[lang]}</p>}
                  {q.show && <NoteStaff notes={q.show.midis} chord={!!q.show.chord} keyPc={q.show.key ?? null} clef={q.show.clef ?? 'treble'} />}
                  {q.diagram && <DiagramView d={q.diagram} settings={settings} />}
                </div>
              ) : q.kind === 'place' ? (
                <div className="choice-show place-given">
                  {q.text && <p className="choice-text">{q.text[lang]}</p>}
                  {q.given && q.given.midis.length > 0 && (q.surface !== 'staff' || q.given.midis.some((m) => !q.target.includes(m))) && (
                    <NoteStaff notes={q.given.midis} chord={!!q.given.chord} keyPc={q.given.key ?? null} clef={q.given.clef ?? 'treble'} durs={q.given.durs} />
                  )}
                  {(!q.given || !q.given.midis.length) && !q.text && q.stimulus.length > 0 && <Orb v={v} label="♪ ?" />}
                </div>
              ) : (
              <Orb v={v} label={q.kind === 'rhythm-dict' ? '♩ ?' : orbLabel} />
              )
            )}
            <Burst on={celebrate} />
          </div>
          {!hideKeyboard && !isPlace && <NoteViews q={q} views={noteViewsOf(settings)} answered={answered} keysLive={keysLive} leftHanded={settings.leftHanded} marks={answered ? seqMarks(q, v.feedback?.answer) : undefined} />}
          {isPlace && q.kind === 'place' && v.stage === 'question' && !paused && !v.error && (
            <PlaceSurfaceView key={`${v.index}-${answered ? 'r' : 'q'}-${placeRec?.attempts.length ?? 0}`} q={q} settings={settings} lang={lang} disabled={!awaiting || answered} result={answered ? (placeLast ?? '') : null} onSubmit={(a) => ctrl.answer(a)} />
          )}
          {q.aid && !answered && <p className="aid-chip">{t.aidOn}</p>}
          {canHint && (
            <button className="btn ghost small hint-btn" onClick={() => ctrl.useHint()} data-hint="1">
              {lang === 'he' ? 'רמז: להציג מקלדת' : 'Hint: show the keyboard'}
            </button>
          )}
          {!phones && itemNeedsHeadphones(q) && (
            <div className="phones-card" role="alert">
              <p><Icon k="phones" /> {lang === 'en' ? 'Needs headphones (low notes, left / right)' : 'צריך אוזניות (צלילים נמוכים, שמאל / ימין)'}</p>
              <div className="phones-actions">
                <button
                  className="btn primary small"
                  onClick={() => {
                    setPhones(true);
                    onSettings?.({ headphones: true });
                    ctrl.repeat();
                  }}
                >
                  {lang === 'en' ? 'I’m wearing headphones' : 'אני עם אוזניות'}
                </button>
              </div>
            </div>
          )}
          <h1 className="ask">{withNote(askTemplate(q, lang, nm), target, keyName)}</h1>
          <PaceBar v={v} t={t} />
          <Listening v={v} t={t} hint={hintText(q, lang, v.mode === 'voice' && !v.needsListenTap)} />
          <FeedbackBanner v={v} t={t} lang={lang} settings={settings} />
          {v.awaitNext && (
            <div className="fb-actions" data-await-next="1">
              {v.canCompare && (
                <button className="btn ghost" onClick={() => ctrl.compareNow()} data-compare-now="1">
                  {lang === 'he' ? '⇄ השוואה: שלכם מול הנכון' : '⇄ Compare: yours vs the right one'}
                </button>
              )}
              <button className="btn primary" onClick={() => ctrl.next()} data-continue="1" autoFocus>
                {lang === 'he' ? 'המשך' : 'Continue'}
              </button>
            </div>
          )}
          {showButtons && q.kind === 'rhythm-dict' && q.mode === 'build' && (
            <RhythmBuilder key={`${v.index}-${v.session.turn}`} q={q} lang={lang} t={t} disabled={!awaiting} onSubmit={(a) => ctrl.answer(a)} />
          )}
          {showButtons && !(q.kind === 'rhythm-dict' && q.mode === 'build') && (
            <div className={`answers n-${q.choices.length} fmt-${fmt}`}>
              {q.choices.map((c) => {
                const lb = choiceLabel(q, c, lang, nm);
                return (
                  <button
                    key={String(c)}
                    className={`answer tone-${lb.tone} ${q.kind === 'rhythm-dict' ? 'rhythm-opt' : ''} ${markOf(v, c)}`}
                    disabled={!awaiting}
                    onClick={() => ctrl.answer(c)}
                    data-answer={String(c)}
                  >
                    {q.kind === 'rhythm-dict' ? (
                      <RhythmStaff rhythm={rhythmFromKey(String(c), q.rhythm.bars)} label={lb.small} compact height={80} />
                    ) : fmt === 'staff' && staffOf(c) ? (
                      <span className="answer-staff" dir="ltr">
                        <NoteStaff {...staffOf(c)!} />
                      </span>
                    ) : (
                      <b>{lb.big}</b>
                    )}
                    {fmt !== 'staff' && <small>{lb.small}</small>}
                    {fmt === 'hint' && staffOf(c) && (
                      <span className="answer-hint" dir="ltr" aria-hidden="true">
                        <NoteStaff {...staffOf(c)!} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {showKeypad && q.kind === 'name-seq' && (
            <NameKeypad key={`${v.index}-${v.session.turn}`} t={t} length={q.degrees.length} keys={q.choices.map(String)} lang={lang} nm={nm} disabled={!awaiting} onSubmit={(a) => ctrl.answer(a)} />
          )}
          {showKeypad && q.kind === 'degree-seq' && <SeqKeypad key={`${v.index}-${v.session.turn}`} t={t} length={q.degrees.length} disabled={!awaiting} onSubmit={(a) => ctrl.answer(a)} />}
          {showRecord && (
            <button className="btn record" disabled={!awaiting} onClick={() => ctrl.record()}>
              <MicIcon /> {playing ? t.playNow : t.singNow}
            </button>
          )}
          {v.needsListenTap && v.mode === 'voice' && !isSing && (
            <button className="btn primary" onClick={() => ctrl.listenNow()}>
              <MicIcon /> {t.listenAgain}
            </button>
          )}
          <Caption text={v.caption} />
          <div className="controls">
            <button className="btn small ctl-btn" onClick={() => ctrl.repeat()}>
              <CtlIcon k="repeat" /> {t.repeat}
            </button>
            <button className="btn small ctl-btn" onClick={() => ctrl.skip()}>
              <CtlIcon k="skip" /> {t.skip}
            </button>
            {refresher && openRefresher && (
              <button
                className="btn small ctl-btn refresh-concept"
                data-refresh={refresher.id}
                onClick={() => {
                  ctrl.pause();
                  openRefresher(refresher, () => void ctrl.resume());
                }}
              >
                <CtlIcon k="learn" /> {lang === 'en' ? 'Refresh' : 'רענון'}
              </button>
            )}
            {isStaircase && placementSkill && (
              <button
                className="btn small ctl-btn skip-section"
                onClick={() => {
                  ctrl.updateLesson({ placementSkipped: [...(v.session.lesson.placementSkipped ?? []), placementSkill] });
                  ctrl.skip();
                }}
              >
                <CtlIcon k="skip" /> {t.skipSection}
              </button>
            )}
          </div>
        </section>
      )}
      {v.stage === 'question' && (
        <LessonAside
          lang={lang}
          index={v.index}
          total={v.total}
          answered={v.session.records.filter((r) => r.attempts.length > 0).length}
          firstTry={v.session.records.filter((r) => r.outcome === 'correct').length}
          title={'topic' in q && typeof q.topic === 'string' && TOPIC_GEN[q.topic] ? TOPIC_GEN[q.topic].title[lang] : lang === 'he' ? 'תרגיל' : 'Exercise'}
        />
      )}
    </main>
  );
}

function IntroCardView({ card, state, t, lang, nm }: { card: IntroCard; state: string; t: Strings; lang: 'he' | 'en'; nm: Naming }) {
  switch (card.kind) {
    case 'explain':
      return (
        <div className={`intro-card wide ${state}`}>
          <span className="intro-key">{card.topic === 'melodic-minor' ? '♭3 · 6 · 7' : card.topic === 'swing-lick' ? '♪ ♪' : '♪'}</span>
          <span className="step-row" dir="ltr">
            {card.steps.map((d, i) => (
              <span key={i} className={`step-coin d${d.replace(/\D/g, '')}`}>
                {d}
              </span>
            ))}
          </span>
        </div>
      );
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
          <span className="intro-coin big-glyph">
            <Glyph kind="chords" color={card.quality === 'maj' ? DOMAIN_COLOR.play : DOMAIN_COLOR.harmony} size={56} />
          </span>
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
    case 'seventh':
      return (
        <div className={`intro-card ${state}`}>
          <span className="intro-key">{choiceLabel({ kind: 'seventh' } as Question, card.quality, lang).small}</span>
          <span className="intro-coin big-glyph">{{ maj7: 'Δ7', '7': '7', m7: 'ii–V–I', m7b5: 'ø7' }[card.quality]}</span>
          <span className="intro-deg">{card.quality === 'm7' ? 'm7 → 7 → Δ7' : ''}</span>
        </div>
      );
    case 'song':
      return (
        <div className={`intro-card wide ${state}`}>
          <span className="intro-key">♪</span>
          <span className="step-row">
            {[1, 1, 5, 5, 6, 6, 5].map((d, i) => (
              <span key={i} className={`step-coin d${d}`}>
                {d}
              </span>
            ))}
          </span>
        </div>
      );
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

/** Find my level: which topics are done, which one is now, which remain. */
function TopicStrip({ v, t }: { v: LessonView; t: Strings }) {
  // One scrolling row (one-screen fit, 0.41): keep the current skill in view.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = stripRef.current;
    const now = box?.querySelector<HTMLElement>('.ts.now');
    if (box && now) box.scrollLeft += now.getBoundingClientRect().left - box.getBoundingClientRect().left - (box.clientWidth - now.offsetWidth) / 2;
  });
  const qs = v.session.lesson.questions;
  const lesson = v.session.lesson;
  // Find my level 2.0: every skill it will measure, done / now / left by the current skill.
  if (lesson.id === 'placement' && lesson.version >= 3) {
    const order = lessonSections(lesson);
    const skipped = lesson.placementSkipped ?? [];
    const cur = /^p:([a-z-]+):/.exec(qs[v.index]?.id ?? '')?.[1] as SkillId | undefined;
    const ci = cur ? order.indexOf(cur) : -1;
    const done = v.stage === 'complete' ? order.length : ci;
    const plan = placementPlanOf(v.session);
    return (
      <div className="topic-strip" ref={stripRef} aria-label={`${t.topicsLeft}: ${order.length - Math.max(0, done)}`}>
        <ol>
          {order.map((k, i) => {
            const sp = plan.skills.find((p) => p.skill === k);
            // Placement 3.0: a skill inferred from its area's answers is not asked ("≈ from your … answers").
            const st = sp?.role === 'derived' ? 'derived' : skipped.includes(k) && i <= Math.max(ci, done - 1) ? 'skipped' : k === cur && v.stage !== 'complete' ? 'now' : sp?.done && (sp.asked > 0 || v.stage === 'complete') ? 'done' : 'left';
            return (
              <li key={k} className={`ts ${st}`} data-skill={k} title={st === 'derived' ? (langOf(t) === 'he' ? 'משוער מהתשובות בתחום' : 'estimated from your answers in this area') : undefined}>
                {st === 'done' ? '✓ ' : st === 'skipped' ? '⏭ ' : st === 'derived' ? '≈ ' : ''}
                {t.skillNames[k]}
                {st === 'skipped' && <span className="sr-only"> · {t.skippedSection}</span>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  const order: SkillId[] = [];
  qs.forEach((q) => {
    const k = questionSkill(q);
    if (!order.includes(k)) order.push(k);
  });
  const cur = qs[v.index] ? questionSkill(qs[v.index]) : null;
  const state = (k: SkillId) => {
    const idx = qs.map((q, i) => (questionSkill(q) === k ? i : -1)).filter((i) => i >= 0);
    if (idx.every((i) => v.session.records[i].outcome !== 'pending')) return 'done';
    return k === cur && v.stage === 'question' ? 'now' : 'left';
  };
  const left = order.filter((k) => state(k) !== 'done').length;
  return (
    <div className="topic-strip" aria-label={`${t.topicsLeft}: ${left}`}>
      <ol>
        {order.map((k) => (
          <li key={k} className={`ts ${state(k)}`} data-skill={k}>
            {state(k) === 'done' ? '✓ ' : ''}
            {t.skillNames[k]}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Rounds({ v, t }: { v: LessonView; t: Strings }) {
  // One question (the weekly puzzle): no progress bar at all — a lone pill only looked like a stray white bar.
  if (v.session.records.length <= 1) return <span className="rounds-spacer" aria-hidden="true" />;
  // Long sessions (Find my level's staircase): a counter instead of one pill per question.
  if (v.session.records.length > 12)
    return (
      <p className="rounds-count" dir="ltr" aria-label={`${t.round} ${v.index + 1}`}>
        #{v.index + 1}
      </p>
    );
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
  // 0.61 (SPEC-REDESIGN): Toni listens while it sounds and reacts to the answer; the orb is a tilted note head.
  const toni: ToniState = fb === 'correct' || fb === 'correct-retry' ? 'correct' : fb === 'reveal' ? 'wrong' : fb === 'retry' ? 'close' : active ? 'listen' : 'idle';
  return (
    <div className="orb-row">
      <Toni state={toni} size={84} />
      <div className={`orb ${active ? 'sounding' : ''} ${fb ?? ''}`}>
        <span dir="ltr">{label}</span>
      </div>
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

/** After an answer the buttons show it (0.50.2): yours red when wrong, the right one green once it is revealed or got. */
function markOf(v: LessonView, c: unknown): string {
  const f = v.feedback;
  if (!f) return '';
  const same = (a: unknown) => a !== undefined && String(a) === String(c);
  if ((f.kind === 'correct' || f.kind === 'correct-retry' || f.kind === 'reveal') && same(f.answer)) return 'is-right';
  if ((f.kind === 'retry' || f.kind === 'reveal') && same(f.given)) return 'is-wrong';
  return '';
}

function FeedbackBanner({ v, t, lang, settings }: { v: LessonView; t: Strings; lang: 'he' | 'en'; settings: Settings }) {
  const f = v.feedback;
  const fk = f?.kind;
  // 0.61 (owner 2026-11-09): one line of feedback; on a wrong answer the detail opens from "Why?".
  const [why, setWhy] = useState(false);
  useEffect(() => setWhy(false), [v.index, fk]);
  useEffect(() => {
    if (fk === 'correct' || fk === 'correct-retry') buzz('good');
    else if (fk === 'retry' || fk === 'reveal') buzz('bad');
  }, [fk, v.index]);
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
  const bad = f.kind === 'retry' || f.kind === 'reveal';
  const detail = (
    <>
      {f.coach && <span className="coach-line">{f.coach}</span>}
      {f.sung && f.sung.cents !== null && (
        <small dir="ltr">
          {f.sung.cents > 0 ? '+' : ''}
          {f.sung.cents}¢
        </small>
      )}
      {(f.kind === 'correct' || f.kind === 'correct-retry' || f.kind === 'reveal' || f.kind === 'retry') && <AnswerChips f={f} t={t} goalMs={goalFor(v)} />}
      {f.readHits && <ReadStrip hits={f.readHits} extra={f.readExtra ?? 0} t={t} />}
      {v.heard && (f.kind === 'unclear' || f.kind === 'ambiguous' || f.kind === 'retry') && !f.sung && (
        <small>
          {t.heard}: “{v.heard}”
        </small>
      )}
    </>
  );
  const hasDetail = !!(f.coach || f.readHits || (f.sung && f.sung.cents !== null) || v.heard || f.timeMs != null);
  return (
    <div className={`feedback ${f.kind} ${bad ? 'is-bad' : ''}`} aria-live="assertive">
      {(f.kind === 'correct' || f.kind === 'correct-retry') && (f.xp ?? 0) > 0 && (
        <span className="xp-fly" dir="ltr" aria-hidden="true" key={`xp${v.index}`}>
          +{f.xp} XP
        </span>
      )}
      <div className="fb-line">
        <b>{text}</b>
        {bad && hasDetail && (
          <button className="why-btn" aria-expanded={why} onClick={() => setWhy((w) => !w)} data-why="1">
            {lang === 'he' ? 'למה?' : 'Why?'}
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
              <path d={why ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
            </svg>
          </button>
        )}
      </div>
      {(!bad || why) && <div className={`fb-detail ${bad ? 'open' : ''}`}>{detail}</div>}
    </div>
  );
}

/** "N in a row" (0.64, owner): after 3, 5, 10, 15 … right first-try answers in a row, Toni pops up for a moment. */
function InARow({ records, lang }: { records: { outcome: string; attempts: unknown[] }[]; lang: 'he' | 'en' }) {
  let run = 0;
  for (const r of records) {
    if (!r.attempts.length) continue;
    run = r.outcome === 'correct' ? run + 1 : 0;
  }
  const [shown, setShown] = useState<number | null>(null);
  const seen = useRef(0);
  useEffect(() => {
    if (run > seen.current && (run === 3 || run === 5 || (run >= 10 && run % 5 === 0))) {
      setShown(run);
      const id = setTimeout(() => setShown(null), 1800);
      seen.current = run;
      return () => clearTimeout(id);
    }
    if (run < seen.current) seen.current = run;
  }, [run]);
  if (shown === null) return null;
  const he = lang === 'he';
  const line = shown >= 10 ? (he ? 'לא עוצרים!' : 'Unstoppable!') : shown >= 5 ? (he ? 'כל הכבוד!' : 'Great job!') : he ? 'יפה מאוד!' : 'Nice!';
  return (
    <div className="in-a-row" role="status" aria-live="polite" data-in-a-row={shown}>
      <Toni state="streak" size={64} />
      <span>
        <b dir="ltr">{he ? `${shown} ברצף` : `${shown} in a row`}</b>
        <small>{line}</small>
      </span>
    </div>
  );
}

function Caption({ text }: { text: string | null }) {
  // 0.64 (owner): in reading mode (the default) the line types itself out with a soft pop per word.
  const [talk] = useTalk();
  return (
    <p className="caption" aria-live="polite">
      {text && !SIMULATED ? <TypedText key={text} text={text} sound={!talk || !/[a-z]/i.test(text)} msPerWord={talk && /[a-z]/i.test(text) ? 220 : 90} /> : (text ?? ' ')}
    </p>
  );
}

/** Build an ordered degree answer by tapping 1–7, then submit. */
/** Note names in the key, tapped in order (matrix #2 / #6 sequences). */
function NameKeypad({ t, length, keys, lang, nm, disabled, onSubmit }: { t: Strings; length: number; keys: string[]; lang: 'he' | 'en'; nm: Naming; disabled: boolean; onSubmit: (a: string) => void }) {
  const [seq, setSeq] = useState<string[]>([]);
  const show = (k: string) => {
    const p = pcFromKey(k);
    return p ? displayNote(p, nm, lang) : k;
  };
  return (
    <div className="seq-pad">
      <div className="seq-slots" dir="ltr" aria-live="polite">
        {Array.from({ length }).map((_, i) => (
          <span key={i} className={`slot ${seq[i] ? 'filled' : ''}`}>
            {seq[i] ? show(seq[i]) : ''}
          </span>
        ))}
      </div>
      <div className="seq-keys" dir="ltr">
        {keys.map((k) => (
          <button key={k} className="seq-key" disabled={disabled || seq.length >= length} onClick={() => setSeq((s) => [...s, k])} data-note={k}>
            {show(k)}
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
            onSubmit(seq.join('.'));
            setSeq([]);
          }}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}

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
/** The pace goal (ms) for the current question in the current input mode, or null when pace doesn't count. */
function goalFor(v: LessonView): number | null {
  const p = v.session.pace;
  if (!p?.on) return null;
  const q = v.question;
  if (q.kind === 'rhythm-read') return null;
  const sing = q.kind === 'sing' || q.kind === 'sing-seq' || q.kind === 'sing-run';
  const m = sing ? 'sing' : v.mode === 'voice' && !v.needsListenTap ? 'voice' : 'buttons';
  return paceTarget(q, m, p.profile);
}

/** A bar that drains over your pace goal while the answer is open (first try only): time you can see. */
function PaceBar({ v, t }: { v: LessonView; t: Strings }) {
  const goal = goalFor(v);
  const rec = v.session.records[v.index];
  if (goal === null || !rec || rec.attempts.length > 0 || rec.outcome !== 'pending') return <div className="pace-bar idle" aria-hidden="true" />;
  const live = v.phase === 'listening';
  return (
    <div className={`pace-bar ${live ? 'live' : 'idle'}`} title={`${t.paceGoal}: ${(goal / 1000).toFixed(1)}s`} data-goal={goal} aria-hidden="true">
      <i key={`${v.index}-${v.session.turn}-${live}`} style={{ ['--goal' as string]: `${goal}ms` }} />
      <span dir="ltr"><Icon k="bolt" /> {(goal / 1000).toFixed(1)}s</span>
    </div>
  );
}

function AnswerChips({ f, t, goalMs }: { f: NonNullable<LessonView['feedback']>; t: Strings; goalMs: number | null }) {
  const band = goalMs !== null && (f.attempt ?? 1) === 1 ? paceBand(f.timeMs, goalMs) : null;
  const fast = band === 'fast';
  return (
    <div className="answer-chips" dir="ltr">
      {f.accuracy !== undefined && f.accuracy > 0 && f.accuracy < 1 && <span className="chip-mini">{Math.round(f.accuracy * 100)}%</span>}
      {f.timeMs != null && (
        <span className={`chip-mini pace-${band ?? 'none'} ${fast ? 'good' : ''}`} title={fast ? t.paceFast : t.responseTime} data-pace={band ?? ''}>
          {fast ? <Icon k="bolt" /> : <Icon k="clock" />} {(f.timeMs / 1000).toFixed(1)}s{goalMs !== null && !fast && band && <small> / {(goalMs / 1000).toFixed(1)}s</small>}
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
function ReadPrompt({ q, v, lang, onTap, onRelease, t, onLane }: { q: Extract<Question, { kind: 'rhythm-read' }>; v: LessonView; lang: 'he' | 'en'; onTap: (ms: number) => void; onRelease?: (ms: number) => void; t: Strings; onLane?: (ms: number, lane: number) => void }) {
  const names = describeRhythm(q.rhythm, 'names', lang);
  if (q.lanes && onLane) {
    // Several pads (drum kit lanes, two hands): one row per lane, written above its pad (spec AE).
    return (
      <div className="read-prompt lanes" data-bpm={q.bpm} data-start={v.readStartPerf ?? undefined}>
        {/* q.prompt is the question line itself (askTemplate) — not repeated here (one-screen fit). */}
        {q.lanes.map((ln, i) => (
          <div key={i} className="lane-row">
            <span className="lane-name">{ln.name[lang]}</span>
            {q.show === 'notation' ? <RhythmStaff rhythm={ln.rhythm} label={describeRhythm(ln.rhythm, 'names', lang)} compact height={70} /> : <span className="read-words">{describeRhythm(ln.rhythm, 'names', lang)}</span>}
          </div>
        ))}
        <div className={`beat-light ${v.beat?.accent ? 'accent' : ''}`} key={v.beat?.n ?? -1} aria-hidden="true" />
        <div className="lane-pads" dir="ltr">
          {q.lanes.map((ln, i) => (
            <button
              key={i}
              className={`tap-pad lane-pad ${v.phase === 'listening' ? 'live' : ''}`}
              data-lane={i}
              onPointerDown={(e) => {
                e.preventDefault();
                onLane(e.timeStamp, i);
              }}
            >
              {ln.name[lang]}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (q.tempoGoal) {
    return (
      <div className="read-prompt tempo-goal" data-start={v.readStartPerf ?? undefined}>
        {/* q.prompt is the question line itself (askTemplate) — not repeated here (one-screen fit). */}
        <p className="tempo-target" dir="ltr">♩ = {q.tempoGoal.bpm}</p>
        <div className={`beat-light ${v.beat?.accent ? 'accent' : ''}`} key={v.beat?.n ?? -1} aria-hidden="true" />
        <TapPad live={v.phase === 'listening'} count={v.readTaps ?? 0} label={t.tapHere} hint={t.tapPadHint} beat={v.beat?.n ?? -1} accent={!!v.beat?.accent} onTap={onTap} onRelease={onRelease} />
      </div>
    );
  }
  return (
    <div className="read-prompt" data-onsets={onsetBeats(q.rhythm).join(',')} data-bpm={q.bpm} data-start={v.readStartPerf ?? undefined}>
      {q.show === 'notation' ? (
        <RhythmStaff rhythm={q.shown ?? q.rhythm} label={q.shown ? describeRhythm(q.shown, 'names', lang) : names} />
      ) : (
        <p className="read-words" dir="auto">
          {names}
        </p>
      )}
      <div className={`beat-light ${v.beat?.accent ? 'accent' : ''}`} key={v.beat?.n ?? -1} aria-hidden="true" />
      <TapPad live={v.phase === 'listening'} count={v.readTaps ?? 0} label={t.tapHere} hint={t.tapPadHint} beat={v.beat?.n ?? -1} accent={!!v.beat?.accent} onTap={onTap} onRelease={onRelease} />
    </div>
  );
}

/** Per-onset result after performing a rhythm: on time / early / late / missed. */
function ReadStrip({ hits, extra, t }: { hits: (number | null)[]; extra: number; t: Strings }) {
  return (
    <div className="read-strip" dir="ltr">
      {hits.map((h, i) => (
        // 0.61: each onset is a note head on its own beat line, shifted left when early and right when late.
        <span key={i} className={`rs ${h === null ? 'miss' : Math.abs(h) <= 40 ? 'good' : 'ok'}`} title={h === null ? t.missed : `${h > 0 ? '+' : ''}${h} ms`} style={{ ['--off' as string]: h === null ? 0 : Math.max(-1, Math.min(1, h / 120)) }}>
          <i className="rs-line" aria-hidden="true" />
          {h === null ? <i className="rs-rest" aria-hidden="true">𝄽</i> : <i className="rs-head" aria-hidden="true" />}
          <small dir="ltr">{h === null ? '' : Math.abs(h) <= 40 ? '' : `${h > 0 ? '+' : ''}${h}`}</small>
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

/**
 * The big tap pad for rhythmic input (product owner): full width, tall, a ripple on every tap and a glow
 * on every metronome beat. Pointer and Space both count; hold for long notes.
 */
export function TapPad({ live, count, label, hint, beat, accent, onTap, onRelease }: { live: boolean; count: number; label: string; hint?: string; beat: number; accent: boolean; onTap: (ms: number) => void; onRelease?: (ms: number) => void }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  return (
    <button
      className={`tap-pad big ${live ? 'live' : ''}`}
      data-tap-pad="1"
      onPointerDown={(e) => {
        e.preventDefault();
        onTap(e.timeStamp);
        const r = e.currentTarget.getBoundingClientRect();
        const id = e.timeStamp;
        setRipples((xs) => [...xs.slice(-4), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
        setTimeout(() => setRipples((xs) => xs.filter((p) => p.id !== id)), 600);
      }}
      onPointerUp={(e) => onRelease?.(e.timeStamp)}
      aria-label={label}
    >
      <span className={`tap-beat ${accent ? 'accent' : ''}`} key={beat} aria-hidden="true" />
      {ripples.map((p) => (
        <span key={p.id} className="tap-ripple" style={{ left: p.x, top: p.y }} aria-hidden="true" />
      ))}
      <span className="tap-label">{label}</span>
      {hint && <small className="tap-hint">{hint}</small>}
      <small className="tap-count" dir="ltr">{count ? count : ''}</small>
    </button>
  );
}

/** What you'll do, from the first question's kind (a few words). */
function howText(kind: string | undefined, lang: 'en' | 'he'): string {
  const he = lang === 'he';
  const k = kind ?? '';
  if (k.startsWith('sing')) return he ? 'מקשיבים — ושרים בחזרה.' : 'Listen, then sing it back.';
  if (k === 'play' || k.startsWith('play')) return he ? 'מנגנים על הכלי שלכם.' : 'Play it on your instrument.';
  if (k.includes('rhythm') || k.includes('tap') || k.includes('click')) return he ? 'מקשיבים — ומקישים את הקצב.' : 'Listen, then tap the rhythm.';
  if (k.includes('read') || k.includes('staff') || k.includes('write') || k.includes('spell')) return he ? 'קוראים ועונים.' : 'Read, then answer.';
  return he ? 'מקשיבים — ובוחרים את התשובה.' : 'Listen, then choose the answer.';
}

/** The brief before a topic exercise: never starts playing on its own. */
function ExerciseBrief({ brief, lang, how, refresher, onRefresher, onPlay, voice, onHide, onKeep }: { brief: { kicker: string; title: string; about: string }; lang: 'en' | 'he'; how: string; refresher: MiniLesson | null; onRefresher: ((l: MiniLesson, after: () => void) => void) | null; onPlay: () => void; voice: boolean; onHide?: () => void; onKeep?: () => void }) {
  const he = lang === 'he';
  const [kept, setKept] = useState(false);
  return (
    <section className="ex-brief" data-brief="1">
      <small className="ex-kicker">{brief.kicker}</small>
      <h1 className="ex-title">{brief.title}</h1>
      <p className="ex-about">{brief.about}</p>
      <p className="ex-how">{how}</p>
      <div className="ex-actions">
        {refresher && onRefresher && (
          <button className="btn ghost ex-learn" onClick={() => onRefresher(refresher, () => undefined)} data-brief-learn="1">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8v13c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z" />
              <path d="M12 6.3v13" />
            </svg>
            {he ? 'רענון קצר' : 'Quick refresher'}
          </button>
        )}
        <button className="ex-play" onClick={onPlay} aria-label={he ? 'התחלה' : 'Start'} data-brief-play="1">
          {voice ? <MicIcon /> : (
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      {(onHide || onKeep) && (
        <div className="ex-links">
          {onKeep && (
            <button className="link" disabled={kept} onClick={() => (onKeep(), setKept(true))}>
              {kept ? (he ? 'נשאר במסלול ✓' : 'Kept on my path ✓') : he ? 'להשאיר במסלול' : 'Keep it on my path'}
            </button>
          )}
          {onHide && (
            <button className="link" onClick={onHide} data-brief-hide="1">
              {he ? 'להסתיר את הנושא הזה' : 'Hide this topic'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Line icons for the exercise's bottom controls (one style for all of them). */
function CtlIcon({ k }: { k: 'repeat' | 'skip' | 'learn' }) {
  return (
    <svg className="ctl-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {k === 'repeat' ? (
        <>
          <path d="M4 12a8 8 0 1 0 2.4-5.7" />
          <path d="M4 4v4.5h4.5" />
        </>
      ) : k === 'skip' ? (
        <path d="M5 6l7 6-7 6M13 6l7 6-7 6" />
      ) : (
        <>
          <path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8v13c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z" />
          <path d="M12 6.3v13" />
        </>
      )}
    </svg>
  );
}
