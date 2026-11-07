// Mini-lesson player (spec X): narrated steps with examples and visuals, skip to practice, and a
// celebration when every step was heard — the topic then joins "Topics I learned".

import { TalkToggle } from './TalkToggle';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { clearSlot, loadSlot, saveSlot } from '../storage/resume';
import type { MiniLesson } from '../content/miniTypes';
import { GLOSSARY, termsIn, type Term } from '../content/glossary';
import type { Stimulus } from '../engine/lesson';
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

/** Opens a mini-lesson as a refresher over an exercise; `after` runs when it closes (provided by App). */
export const RefresherContext = createContext<((lesson: MiniLesson, after: () => void) => void) | null>(null);
export const useRefresher = () => useContext(RefresherContext);

type Phase = 'playing' | 'paused' | 'done';

export function MiniLessonPlayer({ t, settings, lesson, name, onFinish }: { t: Strings; settings: Settings; lesson: MiniLesson; name: string | null; onFinish: (heardAll: boolean) => void }) {
  const lang = settings.uiLang;
  // Left half-way, a quick lesson continues from its step next time (playtesting, 0.35.3).
  const slotKey = `mini:${lesson.id}`;
  const [saved] = useState(() => loadSlot<{ i: number; heard: number[] }>(slotKey));
  const [i, setI] = useState(() => Math.min(saved?.data.i ?? 0, lesson.steps.length - 1));
  const [phase, setPhase] = useState<Phase>('playing');
  const [celebrate, setCelebrate] = useState(false);
  const [term, setTerm] = useState<Term | null>(null);
  const heard = useRef(new Set<number>(saved?.data.heard ?? []));
  useEffect(() => {
    if (phase === 'done') clearSlot(slotKey);
    else if (i > 0) saveSlot(slotKey, { title: lesson.title[lang], route: 'home', done: i, total: lesson.steps.length, data: { i, heard: [...heard.current] } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase]);
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
    setTerm(null);
    setI(Math.max(0, Math.min(lesson.steps.length - 1, to)));
    setPhase('playing');
  };
  const heardAll = heard.current.size === lesson.steps.length;
  const words = termsIn(personal(step.say[lang], name), lang);
  const explain = (w: Term) => {
    ctl.current?.abort();
    setPhase('paused');
    setTerm(w);
    void playSound(w.play);
  };

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
          <button className="btn mega" data-mini-go="1" onClick={() => (clearSlot(slotKey), onFinish(true))}>
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
          <TalkToggle lang={lang} />
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
          {words.length > 0 && <TermChips words={words} lang={lang} active={term} onPick={explain} label={t.termsWhat} />}
          {term && <TermCard term={term} lang={lang} onReplay={() => void playSound(term.play)} onClose={() => setTerm(null)} closeLabel={t.termClose} />}
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
        <button className="btn ghost mini-skip" data-mini-skip="1" onClick={() => (ctl.current?.abort(), clearSlot(slotKey), onFinish(false))}>
          {phase === 'done' ? t.miniPractise : t.miniSkip} →
        </button>
      </div>
    </div>
  );
}

const playSound = async (stim: Stimulus[]) => {
  try {
    await piano.unlock();
    const r = renderStimulus(stim);
    await piano.play(r.events, r.length, new AbortController().signal);
  } catch {
    /* no audio */
  }
};

/** Music words in the current sentence, as small "what's that?" chips (spec AC). */
export function TermChips({ words, lang, active, onPick, label }: { words: Term[]; lang: 'en' | 'he'; active: Term | null; onPick: (w: Term) => void; label: string }) {
  return (
    <div className="term-chips" aria-label={label}>
      <span className="term-q" aria-hidden="true">
        ?
      </span>
      {words.map((w) => (
        <button key={w.id} className={`term-chip ${active?.id === w.id ? 'on' : ''}`} data-term={w.id} onClick={() => onPick(w)}>
          {w.label[lang]}
        </button>
      ))}
    </div>
  );
}

export function TermCard({ term, lang, onReplay, onClose, closeLabel }: { term: Term; lang: 'en' | 'he'; onReplay: () => void; onClose?: () => void; closeLabel: string }) {
  return (
    <div className="term-card" data-term-card={term.id} role="note">
      <b>{term.label[lang]}</b>
      <p>{term.explain[lang]}</p>
      <div className="term-card-actions">
        <button className="btn ghost small" onClick={onReplay}>
          🔊
        </button>
        {onClose && (
          <button className="btn ghost small" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/** Every glossary word, for "Topics I learned". */
export function GlossaryList({ lang, title, hint }: { lang: 'en' | 'he'; title: string; hint: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="set-card glossary" data-glossary="1">
      <h2>📖 {title}</h2>
      <p className="field-hint">{hint}</p>
      <div className="term-chips wrap">
        {GLOSSARY.map((w) => (
          <button
            key={w.id}
            className={`term-chip ${open === w.id ? 'on' : ''}`}
            data-term={w.id}
            onClick={() => {
              setOpen(open === w.id ? null : w.id);
              if (open !== w.id) void playSound(w.play);
            }}
          >
            {w.label[lang]}
          </button>
        ))}
      </div>
      {open && <TermCard term={GLOSSARY.find((w) => w.id === open)!} lang={lang} onReplay={() => void playSound(GLOSSARY.find((w) => w.id === open)!.play)} closeLabel="" />}
    </section>
  );
}
