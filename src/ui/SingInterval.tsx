// Sing the Interval Sprint (0.76, GAMES_TIERS_PLAN §2.4 voice variant): a note sounds and an interval is named — sing
// the other note. One microphone capture for the whole 90 s run; a steady pitch in the window is right, a steady wrong
// pitch or 6 s of nothing is wrong (−3 s). The engine is src/engine/singInterval.ts.

import '../advgames.css';
import '../voicegames.css';
import { useEffect, useRef, useState } from 'react';
import { isSiSave, newSi, siAnswer, siCents, siCurrent, siResult, siTick, SiJudge, SI_RUN_MS, SI_TIMEOUT_MS, type SiItem, type SiState } from '../engine/singInterval';
import { DEFAULT_RANGE } from '../engine/vocal';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { CentsNeedle } from './HarmonyHold';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Sing the Interval Sprint', he: 'ספרינט מרווחים בשירה' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'A note sounds and an interval is named: sing the other note and hold it steady. A wrong note or a long silence costs 3 seconds. 90 seconds.', he: 'נשמע צליל ונקרא מרווח: שרים את הצליל השני ומחזיקים אותו יציב. צליל שגוי או שתיקה ארוכה עולים 3 שניות. 90 שניות.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  sing: { en: 'Sing', he: 'שירו' },
  time: { en: 'Time', he: 'זמן' },
  right: { en: 'Right', he: 'נכונות' },
  wrong: { en: 'Missed', he: 'שגויות' },
  listen: { en: 'Listen…', he: 'מקשיבים…' },
  yourTurn: { en: 'Sing it and hold', he: 'שרים ומחזיקים' },
  ok: { en: 'Right', he: 'נכון' },
  bad: { en: 'Not this time', he: 'לא הפעם' },
  replay: { en: 'Hear the note again', he: 'לשמוע שוב את הצליל' },
  opening: { en: 'Opening the microphone…', he: 'פותחים את המיקרופון…' },
  micErr: { en: 'The microphone did not open. Allow it for this site and try again.', he: 'המיקרופון לא נפתח. אשרו גישה לאתר ונסו שוב.' },
  over: { en: 'Results', he: 'תוצאות' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const paramsOf = (t: DynName) => {
  const d = tierDef('singinterval', t);
  return { level: Number(d?.levels?.[0] ?? 1), cents: Number(d?.params?.cents ?? 50) };
};
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

type Phase = 'setup' | 'open' | 'play' | 'over' | 'mic-error';
interface View {
  st: SiState;
  item: SiItem;
  listening: boolean;
  fb: 'ok' | 'bad' | null;
  live: number | null;
}

export function SingInterval({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isSiSave(saved) ? saved : null;
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [view, setView] = useState<View | null>(null);
  const [final, setFinal] = useState<SiState | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const g = useRef<{ st: SiState; item: SiItem; judge: SiJudge | null; since: number; fb: 'ok' | 'bad' | null; live: number | null; refAc: AbortController | null } | null>(null);

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
    g.current?.refAc?.abort();
  };
  useEffect(() => stop, []);

  const show = () => {
    const x = g.current;
    if (x) setView({ st: x.st, item: x.item, listening: !!x.judge, fb: x.fb, live: x.live });
  };

  const sound = (it: SiItem) => {
    const x = g.current;
    if (!x) return;
    x.refAc?.abort();
    const ac = new AbortController();
    x.refAc = ac;
    x.judge = null;
    show();
    void piano
      .play([{ midi: it.ref, start: 0, duration: 0.75, velocity: 0.72 }], 0.85, ac.signal)
      .catch(() => {})
      .then(() => {
        const y = g.current;
        if (!y || ac.signal.aborted || y.item !== it || y.st.over) return;
        // listen once the note has stopped (the piano must not answer for the singer)
        window.setTimeout(() => {
          const z = g.current;
          if (!z || ac.signal.aborted || z.item !== it || z.st.over) return;
          z.judge = new SiJudge(it, z.st.cents);
          z.since = performance.now();
          show();
        }, 150);
      });
  };

  const finish = (st: SiState) => {
    stop();
    onSave(null);
    setFinal(st);
    setPhase('over');
    onResult(siResult(st));
  };

  const verdict = (right: boolean) => {
    const x = g.current;
    if (!x || x.st.over) return;
    x.judge = null;
    x.st = siAnswer(x.st, right);
    x.fb = right ? 'ok' : 'bad';
    x.live = null;
    show();
    if (x.st.over) return finish(x.st);
    onSave(x.st);
    window.setTimeout(() => {
      const y = g.current;
      if (!y || y.st.over || !acRef.current) return;
      y.fb = null;
      y.item = siCurrent(y.st);
      sound(y.item);
    }, 700);
  };

  const begin = async (resume: boolean) => {
    stop();
    const p = paramsOf(tier);
    const st = resume && resumable ? resumable : newSi((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, p.level, p.cents, range.low, range.high, tierInfo ? tier : undefined);
    const ac = new AbortController();
    acRef.current = ac;
    g.current = { st, item: siCurrent(st), judge: null, since: 0, fb: null, live: null, refAc: null };
    setFinal(null);
    onSave(st);
    setPhase('open');
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const ok = await new Promise<boolean>((resolve) => {
      void new BrowserPitchCapture()
        .sing({
          signal: ac.signal,
          maxMs: SI_RUN_MS + 120_000,
          silenceMs: SI_RUN_MS + 120_000,
          endSilenceMs: 1e9,
          hopMs: 25,
          onCapturing: () => resolve(true),
          onFrame: (f) => {
            const x = g.current;
            if (!x || !x.judge) return;
            const m = f.hz && f.confidence >= 0.8 && f.rms >= 0.01 ? midiOf(f.hz) : null;
            x.live = m === null ? null : siCents(m, x.item);
            const v = x.judge.feed(performance.now(), m);
            if (v) verdict(v === 'right');
          },
        })
        .then((r) => {
          if (r.kind === 'error') resolve(false);
        });
    });
    if (ac.signal.aborted) return;
    if (!ok) {
      stop();
      setPhase('mic-error');
      return;
    }
    setPhase('play');
    sound(g.current.item);
    let last = performance.now();
    const id = window.setInterval(() => {
      const x = g.current;
      if (!x || ac.signal.aborted) return clearInterval(id);
      const now = performance.now();
      x.st = siTick(x.st, now - last);
      last = now;
      if (x.st.over) {
        clearInterval(id);
        return finish(x.st);
      }
      if (x.judge && now - x.since > SI_TIMEOUT_MS) return verdict(false);
      show();
    }, 100);
    ac.signal.addEventListener('abort', () => clearInterval(id), { once: true });
  };

  const back = () => {
    stop();
    if (g.current && !g.current.st.over) onSave(g.current.st);
    onExit();
  };

  const st = view?.st;
  return (
    <main className={`panel-screen g2 vgame ${calm ? 'g2-calm' : ''}`} data-game="singinterval" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {st && phase === 'play' && (
          <span className="g2-hud-mini" dir="ltr">
            {Math.ceil(st.timeLeftMs / 1000)}s
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="singinterval" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => void begin(true)}>
                {tx(TX.cont, lang)} · <span dir="ltr">{Math.ceil(resumable.timeLeftMs / 1000)}s</span>
              </button>
              <button className="btn ghost" onClick={() => void begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => void begin(false)} data-si-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {phase === 'open' && (
        <section className="g2-card">
          <p className="adv-line">{tx(TX.opening, lang)}</p>
        </section>
      )}

      {phase === 'mic-error' && (
        <section className="g2-card">
          <p>{tx(TX.micErr, lang)}</p>
          <button className="btn primary" onClick={() => setPhase('setup')}>
            {tx(TX.back, lang)}
          </button>
        </section>
      )}

      {phase === 'play' && view && st && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.time, lang)}</small>
              <b dir="ltr">{Math.ceil(st.timeLeftMs / 1000)}s</b>
            </span>
            <span>
              <small>{tx(TX.right, lang)}</small>
              <b dir="ltr">{st.right}</b>
            </span>
            <span>
              <small>{tx(TX.wrong, lang)}</small>
              <b dir="ltr">{st.wrong}</b>
            </span>
          </div>
          <div className="vg-clock" aria-hidden="true">
            <i style={{ width: `${(100 * st.timeLeftMs) / SI_RUN_MS}%` }} />
          </div>
          <p className="vg-sub">{tx(TX.sing, lang)}</p>
          <p className="vg-ask" aria-live="polite">
            {tx(view.item.ask, lang)}
          </p>
          <CentsNeedle cents={view.listening ? view.live : null} win={st.cents} lang={lang} />
          <p className={`adv-line ${view.fb ?? ''}`} aria-live="polite">
            {view.fb === 'ok' ? tx(TX.ok, lang) : view.fb === 'bad' ? tx(TX.bad, lang) : view.listening ? tx(TX.yourTurn, lang) : tx(TX.listen, lang)}
          </p>
          <div className="g2-col">
            <button className="btn" disabled={!view.listening} onClick={() => g.current && sound(g.current.item)}>
              {tx(TX.replay, lang)}
            </button>
          </div>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p>
            {tx(TX.right, lang)}: <b dir="ltr">{final.right}</b> · {tx(TX.wrong, lang)}: <b dir="ltr">{final.wrong}</b>
          </p>
          <div className="g2-row">
            <button className="btn primary" onClick={() => void begin(false)}>
              {tx(TX.playAgain, lang)}
            </button>
            <button className="btn ghost" onClick={() => (stop(), onExit())}>
              {tx(TX.back, lang)}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
