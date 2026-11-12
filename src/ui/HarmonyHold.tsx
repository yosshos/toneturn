// Harmony Hold (0.76, GAMES_TIERS_PLAN §3 voice): four chords, a bar each; sing the named tone of each chord while the
// chords move. The piano never plays the sung tone. Graded by the microphone (pitch class, cents). Five takes a run.
// The engine is src/engine/harmonyHold.ts. The strip and the needle are physical (left = first / flat) in both languages.

import '../advgames.css';
import '../voicegames.css';
import { useEffect, useRef, useState } from 'react';
import { addHoldTake, centsToPc, gradeHold, holdBpm, holdEvents, holdOver, holdResult, holdTakeAt, inRange, isHoldSave, newHoldSave, HOLD_TAKES, TONE_NAMES, type HoldSave, type HoldTake } from '../engine/harmonyHold';
import { MIC_PITCH_LAG_MS } from '../engine/highway';
import { DEFAULT_RANGE } from '../engine/vocal';
import { startTier, tierAllowed, tierDef, type DynName } from '../engine/gameTiers';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { GameScreenProps } from './gameProps';
import { G2Head, prefersCalm } from './Flight';
import { TierChips } from './TierChips';
import { piano } from './services';

type Lang = 'he' | 'en';
const TX = {
  title: { en: 'Harmony Hold', he: 'להחזיק הרמוניה' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'Four chords, a bar each. Sing the named tone of each chord while the chords move — the piano leaves that note to you. Headphones help. Five takes.', he: 'ארבעה אקורדים, תיבה לכל אחד. שרים את הצליל שנקרא בכל אקורד בזמן שהאקורדים זזים — הפסנתר משאיר את הצליל הזה לכם. אוזניות עוזרות. חמישה טייקים.' },
  start: { en: 'Start', he: 'להתחיל' },
  cont: { en: 'Continue', he: 'להמשיך' },
  newRun: { en: 'New run', he: 'ריצה חדשה' },
  take: { en: 'Take', he: 'טייק' },
  avg: { en: 'Average', he: 'ממוצע' },
  window: { en: 'Window', he: 'חלון' },
  first: { en: 'First note', he: 'הצליל הראשון' },
  sing: { en: 'Sing', he: 'לשיר' },
  opening: { en: 'Opening the microphone…', he: 'פותחים את המיקרופון…' },
  countIn: { en: 'Count-in — the first chord comes on 1', he: 'ספירה — האקורד הראשון על 1' },
  singing: { en: 'Sing the lit tone', he: 'שרים את הצליל המסומן' },
  micErr: { en: 'The microphone did not open. Allow it for this site and try again.', he: 'המיקרופון לא נפתח. אשרו גישה לאתר ונסו שוב.' },
  next: { en: 'Next take', he: 'לטייק הבא' },
  finish: { en: 'See results', he: 'לתוצאות' },
  over: { en: 'Results', he: 'תוצאות' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  playAgain: { en: 'Play again', he: 'לשחק שוב' },
  best: { en: 'Best', he: 'שיא' },
  flat: { en: 'flat', he: 'נמוך' },
  sharp: { en: 'sharp', he: 'גבוה' },
  notHeard: { en: 'not heard', he: 'לא נשמע' },
};
const tx = (b: { en: string; he: string }, l: Lang) => b[l];
const paramsOf = (t: DynName) => {
  const d = tierDef('harmonyhold', t);
  return { level: Number(d?.levels?.[0] ?? 1), cents: Number(d?.params?.cents ?? 50) };
};
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/** A live cents needle: ±150 ¢ across, the tier's window shaded. */
export function CentsNeedle({ cents, win, lang }: { cents: number | null; win: number; lang: Lang }) {
  const x = (c: number) => 50 + (Math.max(-150, Math.min(150, c)) / 150) * 50;
  return (
    <div>
      <div className="vg-needle" dir="ltr" aria-hidden="true">
        <span className="vg-win" style={{ left: `${x(-win)}%`, width: `${x(win) - x(-win)}%` }} />
        <span className="vg-mid" />
        {cents !== null && <span className="vg-dot" style={{ left: `${x(cents)}%` }} />}
      </div>
      <div className="vg-needle-labels" dir="ltr">
        <span>{lang === 'he' ? 'נמוך' : 'flat'}</span>
        <span dir="ltr">{cents === null ? '–' : `${cents > 0 ? '+' : ''}${cents} ¢`}</span>
        <span>{lang === 'he' ? 'גבוה' : 'sharp'}</span>
      </div>
    </div>
  );
}

type Phase = 'setup' | 'ready' | 'open' | 'count' | 'sing' | 'review' | 'over' | 'mic-error';

export function HarmonyHold({ lang, settings, saved, onSave, onExit, onResult, best, tier: tierInfo }: GameScreenProps) {
  const calm = prefersCalm(settings);
  const resumable = isHoldSave(saved) ? saved : null;
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const [tier, setTier] = useState<DynName>(() => (resumable?.tier && tierInfo && tierAllowed(tierInfo, resumable.tier) ? resumable.tier : tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<Phase>('setup');
  const [run, setRun] = useState<HoldSave | null>(null);
  const [cur, setCur] = useState(-1);
  const [live, setLive] = useState<number | null>(null);
  const [grade, setGrade] = useState<ReturnType<typeof gradeHold> | null>(null);
  const [final, setFinal] = useState<ReturnType<typeof holdResult> | null>(null);
  const acRef = useRef<AbortController | null>(null);

  const stop = () => {
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => stop, []);

  const take: HoldTake | null = run ? holdTakeAt(run, phase === 'review' ? run.takes.length - 1 : run.takes.length) : null;

  const begin = (resume: boolean) => {
    stop();
    const p = paramsOf(tier);
    const r = resume && resumable ? resumable : newHoldSave((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, p.level, p.cents, tierInfo ? tier : undefined);
    setRun(r);
    setGrade(null);
    setFinal(null);
    onSave(r);
    setPhase('ready');
  };

  const firstNote = async () => {
    if (!take) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
      await piano.play([{ midi: inRange(take.chords[0].pc, range.low, range.high), start: 0, duration: 1.1, velocity: 0.7 }], 1.3, ac.signal);
    } catch {
      /* stopped */
    }
  };

  const sing = async () => {
    if (!run || !take) return;
    stop();
    const ac = new AbortController();
    acRef.current = ac;
    setGrade(null);
    setLive(null);
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const bpm = holdBpm(run.level);
    const beat = 60 / bpm;
    const barMs = 4 * beat * 1000;
    const lat = settings.micLatencyMs ?? MIC_PITCH_LAG_MS;
    const per: number[][] = take.chords.map(() => []);
    let origin = Infinity;
    setPhase('open');
    const ok = await new Promise<boolean>((resolve) => {
      void new BrowserPitchCapture()
        .sing({
          signal: ac.signal,
          maxMs: 60_000,
          silenceMs: 60_000,
          endSilenceMs: 1e9,
          hopMs: 25,
          onCapturing: () => resolve(true),
          onFrame: (f) => {
            const now = performance.now() - lat;
            const k = Math.floor((now - origin) / barMs);
            if (!f.hz || f.confidence < 0.8 || f.rms < 0.01) {
              if (k >= 0 && k < take.chords.length) setLive(null);
              return;
            }
            if (k < 0 || k >= take.chords.length) return;
            const c = centsToPc(midiOf(f.hz), take.chords[k].pc);
            setLive(c);
            // the first third of a beat after the change is the singer moving
            if (now - origin - k * barMs > beat * 330) per[k].push(c);
          },
        })
        .then((res) => {
          if (res.kind === 'error') resolve(false);
        });
    });
    if (ac.signal.aborted) return;
    if (!ok) {
      stop();
      setPhase('mic-error');
      return;
    }
    setPhase('count');
    const countIn = 4 * beat;
    const end = countIn + 4 * take.chords.length * beat;
    const clicks = Array.from({ length: 4 }, (_, i) => ({ t: i * beat, accent: i === 0, count: true }));
    // `play` schedules 60 ms ahead, `playTimeline` 120 ms (as Riff Echo lines them up)
    void piano.play(holdEvents(take, bpm, countIn + 0.06), end + 0.4, ac.signal).catch(() => {});
    const id = window.setInterval(() => {
      const k = Math.floor((performance.now() - origin) / barMs);
      if (k >= 0) setPhase('sing');
      setCur(k >= 0 && k < take.chords.length ? k : -1);
    }, 60);
    try {
      await piano.playTimeline({ clicks, wood: [], responseAt: countIn, responseEnd: end + 0.1 }, ac.signal, undefined, (perf) => {
        origin = perf;
      });
    } catch {
      clearInterval(id);
      return;
    }
    clearInterval(id);
    setCur(-1);
    if (acRef.current !== ac) return;
    stop();
    const g = gradeHold(per, run.cents);
    setGrade(g);
    const next = addHoldTake(run, g.score);
    setRun(next);
    if (holdOver(next)) {
      onSave(null);
      const res = holdResult(next);
      setFinal(res);
      onResult(res);
    } else onSave(next);
    setPhase('review');
  };

  const back = () => {
    stop();
    onExit();
  };
  const avg = run && run.takes.length ? Math.round(run.takes.reduce((a, b) => a + b, 0) / run.takes.length) : null;
  const n = run ? Math.min(HOLD_TAKES, run.takes.length + (phase === 'review' || phase === 'over' ? 0 : 1)) : 0;

  return (
    <main className={`panel-screen g2 vgame ${calm ? 'g2-calm' : ''}`} data-game="harmonyhold" data-phase={phase}>
      <G2Head title={tx(TX.title, lang)} backLabel={tx(TX.back, lang)} onBack={back}>
        {run && phase !== 'setup' && (
          <span className="g2-hud-mini" dir="ltr">
            {n}/{HOLD_TAKES}
          </span>
        )}
      </G2Head>

      {phase === 'setup' && (
        <section className="g2-card">
          <p>{tx(TX.blurb, lang)}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="harmonyhold" />}
          {!!best && (
            <p className="g2-best">
              {tx(TX.best, lang)}: <b dir="ltr">{best}</b>
            </p>
          )}
          {resumable ? (
            <div className="g2-col">
              <button className="btn primary mega" onClick={() => begin(true)}>
                {tx(TX.cont, lang)} · {tx(TX.take, lang)} {resumable.takes.length + 1}
              </button>
              <button className="btn ghost" onClick={() => begin(false)}>
                {tx(TX.newRun, lang)}
              </button>
            </div>
          ) : (
            <button className="btn primary mega" onClick={() => begin(false)} data-hold-start>
              {tx(TX.start, lang)}
            </button>
          )}
        </section>
      )}

      {phase === 'mic-error' && (
        <section className="g2-card">
          <p>{tx(TX.micErr, lang)}</p>
          <button className="btn primary" onClick={() => setPhase('ready')}>
            {tx(TX.back, lang)}
          </button>
        </section>
      )}

      {run && take && phase !== 'setup' && phase !== 'over' && phase !== 'mic-error' && (
        <>
          <div className="adv-hud">
            <span>
              <small>{tx(TX.take, lang)}</small>
              <b dir="ltr">
                {n}/{HOLD_TAKES}
              </b>
            </span>
            <span>
              <small>{tx(TX.window, lang)}</small>
              <b dir="ltr">±{run.cents} ¢</b>
            </span>
            <span>
              <small>{tx(TX.avg, lang)}</small>
              <b dir="ltr">{avg === null ? '–' : `${avg}%`}</b>
            </span>
          </div>
          <div className="vg-strip" dir="ltr">
            {take.chords.map((c, i) => {
              const sc = phase === 'review' && grade ? grade.scores[i] : null;
              return (
                <div key={i} className={`vg-chord ${i === cur ? 'now' : ''} ${sc === null ? '' : sc >= 0.85 ? 'ok' : 'bad'}`}>
                  <b>{c.symbol}</b>
                  <small>{tx(TONE_NAMES[c.tone], lang)}</small>
                  {sc !== null && <span className="vg-pts">{grade!.errs[i] === null ? tx(TX.notHeard, lang) : `${grade!.errs[i]} ¢`}</span>}
                </div>
              );
            })}
          </div>
          <CentsNeedle cents={phase === 'sing' ? live : null} win={run.cents} lang={lang} />
          <p className={`adv-line ${phase === 'review' && grade ? (grade.score >= 85 ? 'ok' : 'bad') : ''}`} aria-live="polite">
            {phase === 'open' ? tx(TX.opening, lang) : phase === 'count' ? tx(TX.countIn, lang) : phase === 'sing' ? tx(TX.singing, lang) : phase === 'review' && grade ? `${tx(TX.take, lang)} ${grade.score}%` : ''}
          </p>
          <div className="g2-col">
            {phase === 'ready' && (
              <>
                <button className="btn" onClick={() => void firstNote()} data-hold-first>
                  {tx(TX.first, lang)}
                </button>
                <button className="btn primary mega" onClick={() => void sing()} data-hold-sing>
                  {tx(TX.sing, lang)}
                </button>
              </>
            )}
            {phase === 'review' && (
              <button className="btn primary mega" onClick={() => (final ? setPhase('over') : (setGrade(null), setPhase('ready')))}>
                {final ? tx(TX.finish, lang) : tx(TX.next, lang)}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'over' && final && (
        <section className="g2-card" aria-live="polite">
          <h2>{tx(TX.over, lang)}</h2>
          <p className="riff-final">
            <span>{tx(TX.accuracy, lang)}</span> <b dir="ltr">{final.detail.accuracy}%</b>
          </p>
          <p className="g2-dim" dir="ltr">
            {run?.takes.map((x) => `${x}%`).join(' · ')}
          </p>
          <div className="g2-row">
            <button className="btn primary" onClick={() => begin(false)}>
              {tx(TX.playAgain, lang)}
            </button>
            <button className="btn ghost" onClick={back}>
              {tx(TX.back, lang)}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
