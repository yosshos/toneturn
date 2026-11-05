// Mini-lesson player (spec X): narrated steps with examples and visuals, skip to practice, and a
// celebration when every step was heard — the topic then joins "Topics I learned".

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { MiniLesson } from '../content/miniTypes';
import { renderStimulus } from '../engine/lesson';
import { pc } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { NotesView } from './NotesView';
import { piano, SIMULATED, tts } from './services';

/** `{name}` → the player's first name, or nothing ("Hey {name}!" → "Hey!"). */
export const personal = (text: string, name: string | null) => text.replace(/\s*\{name\}/g, name ? ` ${name}` : '').replace(/\s+([!?.,])/g, '$1');

/** Opens a unit's mini-lesson first when it has not been learned yet (provided by App). */
export const MiniGateContext = createContext<(unit: string | null, start: () => void) => void>((_, start) => start());
export const useMiniGate = () => useContext(MiniGateContext);

type Phase = 'playing' | 'paused' | 'done';

export function MiniLessonPlayer({ t, settings, lesson, name, onFinish }: { t: Strings; settings: Settings; lesson: MiniLesson; name: string | null; onFinish: (heardAll: boolean) => void }) {
  const lang = settings.uiLang;
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [celebrate, setCelebrate] = useState(false);
  const heard = useRef(new Set<number>());
  const ctl = useRef<AbortController | null>(null);
  const step = lesson.steps[i];

  const playExample = async (signal: AbortSignal) => {
    if (!step.play?.length) return;
    const r = renderStimulus(step.play);
    await piano.play(r.events, r.length, signal);
  };

  // Run the current step: speak (+ example), then advance.
  useEffect(() => {
    if (phase !== 'playing') return;
    const c = new AbortController();
    ctl.current = c;
    void (async () => {
      try {
        await piano.unlock();
        if (step.playFirst) await playExample(c.signal);
        const text = personal(step.say[lang], name);
        if (SIMULATED) await new Promise((r) => setTimeout(r, 250));
        else await tts.speak(text, lang, c.signal);
        if (!step.playFirst) await playExample(c.signal);
        if (c.signal.aborted) return;
        heard.current.add(i);
        await new Promise((r) => setTimeout(r, SIMULATED ? 50 : 450));
        if (c.signal.aborted) return;
        if (i < lesson.steps.length - 1) setI(i + 1);
        else {
          setPhase('done');
          if (heard.current.size === lesson.steps.length) setCelebrate(true);
        }
      } catch {
        /* aborted */
      }
    })();
    return () => {
      c.abort();
      tts.cancel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase]);

  useEffect(() => () => ctl.current?.abort(), []);

  const jump = (to: number) => {
    ctl.current?.abort();
    setI(Math.max(0, Math.min(lesson.steps.length - 1, to)));
    setPhase('playing');
  };
  const heardAll = heard.current.size === lesson.steps.length;

  if (celebrate)
    return (
      <div className="mini-overlay" role="dialog" aria-modal="true" aria-label={lesson.title[lang]}>
        <div className="mini-celebrate" data-mini-learned={lesson.id}>
          <div className="mini-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, k) => (
              <span key={k} style={{ ['--k' as string]: k }} />
            ))}
          </div>
          <div className="mini-card-flip">
            <span className="mini-big-emoji">{lesson.emoji}</span>
          </div>
          <h2>{t.miniLearnedTitle}</h2>
          <p className="mini-learned-name">
            📚 {lesson.title[lang]}
          </p>
          <p className="mini-takeaway">{lesson.takeaway[lang]}</p>
          <button className="btn mega" data-mini-go="1" onClick={() => onFinish(true)}>
            {t.miniPractise} →
          </button>
        </div>
      </div>
    );

  return (
    <div className="mini-overlay" role="dialog" aria-modal="true" aria-label={lesson.title[lang]}>
      <div className="mini-player" data-mini={lesson.id}>
        <header className="mini-head">
          <span className="mini-emoji" aria-hidden="true">
            {lesson.emoji}
          </span>
          <div>
            <small>{t.miniKicker}</small>
            <h2>{lesson.title[lang]}</h2>
          </div>
        </header>
        <div className="mini-progress" aria-hidden="true">
          {lesson.steps.map((_, k) => (
            <span key={k} className={k < i || heard.current.has(k) ? 'done' : k === i ? 'now' : ''} />
          ))}
        </div>
        <div className="mini-stage" key={i}>
          {step.show?.text && (
            <p className="mini-text" dir="ltr">
              {step.show.text[lang]}
            </p>
          )}
          {step.show?.notes && step.show.notes.length > 0 && (
            <NotesView midis={step.show.notes} keyPc={step.show.key ? pc(step.show.key) : null} settings={settings} chord={step.show.chord} durs={step.show.durs} clef={step.show.clef} />
          )}
          <p className="mini-caption" aria-live="polite">
            {personal(step.say[lang], name)}
          </p>
        </div>
        <div className="mini-controls">
          <button className="icon-btn" aria-label={t.miniBack} disabled={i === 0} onClick={() => jump(i - 1)}>
            <span className="flip-rtl">⏮</span>
          </button>
          {phase === 'playing' ? (
            <button className="icon-btn big" aria-label={t.miniPause} onClick={() => (ctl.current?.abort(), setPhase('paused'))}>
              ⏸
            </button>
          ) : (
            <button className="icon-btn big" aria-label={t.miniPlay} onClick={() => jump(phase === 'done' ? 0 : i)}>
              {phase === 'done' ? '↻' : '▶'}
            </button>
          )}
          {step.play?.length ? (
            <button className="icon-btn" aria-label={t.miniReplay} onClick={() => void piano.unlock().then(() => playExample(new AbortController().signal)).catch(() => {})}>
              🔁
            </button>
          ) : (
            <span className="icon-btn ghost" aria-hidden="true" />
          )}
          <button className="icon-btn" aria-label={t.miniNext} disabled={i >= lesson.steps.length - 1} onClick={() => jump(i + 1)}>
            <span className="flip-rtl">⏭</span>
          </button>
        </div>
        {phase === 'done' && !heardAll && <p className="field-hint">{t.miniHearAll}</p>}
        <button className="btn ghost mini-skip" data-mini-skip="1" onClick={() => (ctl.current?.abort(), onFinish(false))}>
          {phase === 'done' ? t.miniPractise : t.miniSkip} →
        </button>
      </div>
    </div>
  );
}
